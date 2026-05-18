# probe_node.py — Probe 数据采集管道编排
# 3 条并行流：品牌流 || (搜索流: query→fc_search→[mm+gap||cite→rate]→scorer→narrative) || 竞品流
# 对外仍是单个 probe_node，内部用 asyncio 编排并行
#
# 并行架构：
#   Level 1: brand_profiler || (query_expander → fc_search) || competitor_pipeline
#   Level 2: (market_mirror → gap_analysis) || (citation_analyzer → citation_rate)
#   Level 3: company_scorer → ai_narrative
#   Level 4: 汇聚所有结果 → 输出

import asyncio
import hashlib
import json
import os
import threading
import time
from urllib.parse import urlparse
from langgraph_app.base_node import CircuitBreaker, NodeLogger
from langgraph_app.config import ENABLE_MULTI_ENGINE
from langgraph_app.tools.brand_profiler import profile as brand_profile
from langgraph_app.tools.intro_composer import compose as fallback_compose
from langgraph_app.tools.query_expander import expand, _extract_generic_product
from langgraph_app.tools.competitor_query_gen import generate as gen_comp_queries, search_and_answer
from langgraph_app.tools.citation_analyzer import analyze, extract_competitor_citations
from langgraph_app.tools.fc_search import search as fc_search, generate_a_queries, _get_engine_config
from langgraph_app.tools.market_mirror import reflect as mirror
from langgraph_app.tools.gap_analysis import analyze as gap_analyze
from langgraph_app.tools.company_scorer import score as company_scorer
from langgraph_app.tools.ai_narrative import generate as ai_narrative_gen
from langgraph_app.tools.source_authority import analyze as source_authority_analyze
from langgraph_app.state import (
    BrandProfile, CompanyEvaluation, DimensionScore, CompanyScore,
    AINarrative, MarketPerception, GapReport,
    CitationDetail, CitationMetrics,
    CompetitorResult, EngineResult, ProbeMeta, ProbeOutput,
    SourceItem, SourceAuthorityReport,
)

logger = NodeLogger("Probe")
breaker = CircuitBreaker(max_failures=5)

BATCH_SIZE = 5
BATCH_DELAY = 0.0

# ── Wall-clock 超时 ──────────────────────────────────────
TIMEOUT_BRAND = 60       # 品牌流：60秒（国际站延迟高，给足够余量）
TIMEOUT_SEARCH_P1 = 360  # 搜索流Phase1：360秒（30个fc_search，5并发 × 6批 + 2个LLM并行）
TIMEOUT_MM_GAP = 60      # 市场镜像+差距分析：60秒
TIMEOUT_CITE = 90        # 引用率分析：90秒（30个分析）
TIMEOUT_SCORER = 30      # 评分+话术：30秒
TIMEOUT_COMPETITOR = 60  # 竞品流：60秒
TIMEOUT_MULTI_ENGINE = 210  # 多引擎流：210秒（10查询×3引擎，串行搜索合成≈20s/引擎）

# ── 磁盘幂等缓存 ──────────────────────────────────────────
CACHE_DIR = ".checkpoint_cache"
_cache_lock = threading.Lock()
_task_id = None


def _ensure_cache_dir():
    os.makedirs(CACHE_DIR, exist_ok=True)


def _cache_path(task_id: str) -> str:
    return os.path.join(CACHE_DIR, f"{task_id}.json")


def _make_key(module: str, *args) -> str:
    raw = f"{module}:{':'.join(str(a) for a in args)}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def _cache_get(task_id: str, key: str):
    path = _cache_path(task_id)
    if not os.path.exists(path):
        return None
    with _cache_lock:
        try:
            with open(path, "r") as f:
                cache = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return None
    return cache.get(key)


def _cache_set(task_id: str, key: str, value):
    path = _cache_path(task_id)
    _ensure_cache_dir()
    with _cache_lock:
        cache = {}
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    cache = json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                cache = {}
        cache[key] = value
        tmp = path + ".tmp"
        with open(tmp, "w") as f:
            json.dump(cache, f, ensure_ascii=False)
        os.replace(tmp, path)


def _cache_clear(task_id: str):
    path = _cache_path(task_id)
    for p in (path, path + ".tmp"):
        try:
            os.remove(p)
        except FileNotFoundError:
            pass


def _get_task_id(state: dict) -> str:
    ui = state.get("user_input", {})
    tid = ui.get("task_id")
    if tid:
        return str(tid)
    domain = ui.get("domain", "unknown")
    ts = str(int(time.time()))
    return f"{domain}_{ts}"


def _is_error_result(r) -> bool:
    """检查 search_result 是否为错误项（含原始 Exception、checkpoint 恢复后的 _error dict、以及 fc_search 返回的 error dict）。"""
    if isinstance(r, Exception):
        return True
    if isinstance(r, dict) and (r.get("_error") or r.get("error")):
        return True
    if r is None:
        return True
    return False


# ═══════════════════════════════════════════════════════════════
# 入口
# ═══════════════════════════════════════════════════════════════

def probe_node(state: dict) -> dict:
    """Probe 管道入口。同步封装，内部异步编排 3 条并行流。"""
    return _run_async(_probe_core(state))


async def _probe_core(state: dict) -> dict:
    global _task_id
    ui = state["user_input"]
    mode = ui.get("mode", "full")  # "light" | "full"，默认 full 向后兼容
    start_time = time.time()
    errors = state.get("errors", {})
    ck = state.get("checkpoint", {})
    _task_id = _get_task_id(state)

    def _done(key):
        return ck.get(key, {}).get("status") == "done"

    def _save(key, data):
        ck[key] = {"status": "done", "data": data}

    # ── Level 1: 三条流并行启动（检查点跳过已完成）────
    brand_task = None
    if not _done("probe_brand"):
        brand_task = asyncio.create_task(_stream_brand(ui))

    # light 模式：快速推断产品类别（只抓首页title，≈1s），避免退化到 "consumer products"
    effective_industry = ui.get("industry", "")
    if mode == "light" and not effective_industry:
        hint = await _quick_industry_hint(ui.get("domain", ""))
        if hint:
            effective_industry = hint
            logger.log(f"[LIGHT] 快速行业推断: {hint}")

    # query_expander 先跑（快，2-3s），即使后续搜索超时也能保留查询词
    # expand() 返回 list[dict]: {"query": str, "category": "industry"|"brand"|"competitor"}
    if not _done("probe_search_p1"):
        try:
            expanded_queries = await expand(
                seeds=ui["seed_queries"],
                industry=effective_industry,
                brand_name=ui["brand_name"],
                competitors=ui.get("competitors", []),
            )
        except Exception as e:
            logger.log(f"query_expander failed: {e}", "error")
            expanded_queries = []
    else:
        expanded_queries = ck["probe_search_p1"]["data"]["queries"]

    # 提取查询字符串给 fc_search，保留分类信息给 _stream_cite
    expanded_query_strs = [q["query"] if isinstance(q, dict) else q for q in expanded_queries]
    query_categories = {q["query"]: q.get("category", "industry") for q in expanded_queries if isinstance(q, dict)}

    # light 模式：只保留 A 类查询（industry），最多 10 个
    if mode == "light":
        a_class_queries = [q for q in expanded_queries
                           if isinstance(q, dict) and q.get("category") == "industry"]
        expanded_queries = a_class_queries[:10]
        expanded_query_strs = [q["query"] for q in expanded_queries]
        bc_query_strs = expanded_query_strs  # light 模式 A 类直接跑搜索流
    else:
        # 主搜索流：多引擎启用时只跑 B/C 类，A 类留给多引擎流（避免 GPT 重复调用）
        if ENABLE_MULTI_ENGINE:
            bc_query_strs = [q["query"] for q in expanded_queries if isinstance(q, dict) and q.get("category") != "industry"]
            if not bc_query_strs:  # 兜底：无 B/C 类查询时跑全部
                bc_query_strs = expanded_query_strs
        else:
            bc_query_strs = expanded_query_strs

    search_task = None if _done("probe_search_p1") else asyncio.create_task(
        _stream_search_phase1(ui, bc_query_strs))

    # light 模式跳过完整竞品流（用 Haiku 从搜索结果提取替代，见汇总阶段）
    comp_task = None
    if mode == "full" and not _done("probe_competitor"):
        comp_task = asyncio.create_task(_stream_competitor(ui))

    # 提取 A 类查询词（DeepSeek 统一生成，三引擎共用同一套词）
    a_class_query_strs = [q["query"] for q in expanded_queries
                          if isinstance(q, dict) and q.get("category") == "industry"]

    # Level 1: 多引擎并行流（light 模式跳过，仅 full 模式运行）
    multi_engine_task = None
    if mode == "full" and ENABLE_MULTI_ENGINE and not _done("probe_multi_engine"):
        multi_engine_task = asyncio.create_task(
            _stream_multi_engine_search(ui, a_class_query_strs, query_categories))

    # 等待品牌流
    if brand_task:
        try:
            bp, brand_error = await asyncio.wait_for(brand_task, timeout=TIMEOUT_BRAND)
        except asyncio.TimeoutError:
            bp, brand_error = _brand_timeout_fallback(ui)
            errors["probe_brand_timeout"] = f"超时 ({TIMEOUT_BRAND}s)"
            logger.log("[brand流] → 超时，使用降级方案", "warn")
        else:
            if brand_error:
                errors["probe_brand"] = brand_error
            else:
                _save("probe_brand", bp.model_dump())
            logger.log(f"[brand流] → {bp.one_liner[:60] if bp else 'fallback'}")
    else:
        bp = BrandProfile(**ck["probe_brand"]["data"])
        brand_error = None
        logger.log("[brand流] → 从检查点恢复")

    # inferred_* 优先级：bp推断结果 → 用户输入 → 默认值
    if bp:
        effective_industry = bp.inferred_industry or ui.get("industry", "") or "未指定行业"
        effective_target_market = bp.inferred_target_market or ui.get("target_market", "") or "未指定"
        effective_core_product = bp.inferred_core_product or ui.get("core_product", "") or "未指定"
    else:
        effective_industry = ui.get("industry", "") or "未指定行业"
        effective_target_market = ui.get("target_market", "") or "未指定"
        effective_core_product = ui.get("core_product", "") or "未指定"

    # 等待搜索流 Phase 1
    search_timed_out = False
    if search_task:
        try:
            sr_data = await asyncio.wait_for(search_task, timeout=TIMEOUT_SEARCH_P1)
        except asyncio.TimeoutError:
            search_timed_out = True
            errors["probe_search_p1_timeout"] = f"超时 ({TIMEOUT_SEARCH_P1}s)"
            logger.log("[搜索流P1] → 超时，跳过 Level 2+3", "warn")
        else:
            queries = sr_data["queries"]
            classified_queries = expanded_queries  # list[dict] with "query" + "category"
            search_results = sr_data["search_results"]
            search_tokens = sr_data["search_tokens"]
            search_statuses = sr_data["search_statuses"]
            all_ddg_snippets = sr_data["all_ddg_snippets"]
            if sr_data.get("circuit_open"):
                errors["probe_circuit_breaker"] = "opened after 5 consecutive API failures"
            else:
                # 在 _save 之前先存 classified_queries（用于分类引用率计算）
                classified_queries_for_ck = expanded_queries  # list[dict] with "query" + "category"
                _save("probe_search_p1", {
                    "queries": queries,
                    "classified_queries": classified_queries_for_ck,
                    "search_results": [
                        {"_error": str(r)} if isinstance(r, Exception) else r
                        for r in search_results
                    ],
                    "search_tokens": search_tokens,
                    "search_statuses": search_statuses,
                    "all_ddg_snippets": all_ddg_snippets,
                    "ok": sr_data["ok"], "skipped": sr_data["skipped"], "failed": sr_data["failed"],
                })
            logger.log(f"[搜索流P1] → {sr_data['ok']} ok / {sr_data['skipped']} skipped / "
                       f"{sr_data['failed']} failed | {search_tokens} tokens")
    else:
        sd = ck["probe_search_p1"]["data"]
        queries = sd["queries"]
        # 兼容旧检查点（无 classified_queries 字段）
        classified_queries = sd.get("classified_queries", [
            {"query": q, "category": "brand" if ui["brand_name"].lower() in q.lower() else "industry"}
            for q in queries
        ])
        search_results = [r for r in sd["search_results"] if not _is_error_result(r)]
        search_tokens = sd["search_tokens"]
        search_statuses = sd["search_statuses"]
        all_ddg_snippets = sd["all_ddg_snippets"]
        logger.log("[搜索流P1] → 从检查点恢复")

    if search_timed_out:
        # 跳过 Level 2 + Level 3，所有变量用默认值（但查询词保留）
        queries = expanded_query_strs
        classified_queries = expanded_queries
        search_results = []
        search_tokens = 0
        search_statuses = {}
        all_ddg_snippets = []

    circuit_open = breaker.is_open()

    # ── Level 2: 搜索流 Phase 2 — light 模式跳过 mm_gap ──
    if mode == "light":
        # light 模式：跳过 market_mirror + gap_analysis，使用空默认值
        market_perception = MarketPerception(
            perceived_identity="", perceived_strengths=[], perceived_weaknesses=[],
            perceived_positioning="", perceived_products=[], perceived_market="",
            perception_sources=[],
        )
        gap_report = GapReport(
            alignment_score=0, aligned=[], misaligned=[], blind_spots=[],
            opportunities=[], one_line_summary="",
        )
        company_evaluation = CompanyEvaluation(overall="", strengths=[], weaknesses=[], positioning="")
        mp = {}
        gr = {}
        mm_gap_error = None
        mm_gap_task = None

        if search_timed_out:
            cite_details = []
            citation_metrics = CitationMetrics(rate=0.0, total_queries=0, mentioned_count=0, details=[],
                                               industry_count=0, brand_count=0, competitor_count=0,
                                               recommendation_rate=0.0, recommended_count=0, top_rate=0.0, top_count=0)
            source_authority = None
            cite_error = None
            cite_rate = 0.0
            cite_task = None
        else:
            cite_task = None if _done("probe_cite") else asyncio.create_task(
                _stream_cite(queries, classified_queries, search_results, ui, mode="light"))

        # light 模式 cite wait（需在此处 await，不在 full 模式的 else 分支内）
        if cite_task:
            try:
                cite_details, citation_metrics, source_authority, cite_error = await asyncio.wait_for(
                    cite_task, timeout=TIMEOUT_CITE)
            except asyncio.TimeoutError:
                cite_details, citation_metrics, source_authority, cite_error = _cite_timeout_defaults(queries, classified_queries)
                errors["probe_cite_timeout"] = f"超时 ({TIMEOUT_CITE}s)"
                logger.log("[LIGHT P2-cite] → 超时", "warn")
            else:
                if cite_error:
                    errors["probe_cite"] = cite_error
                else:
                    _save("probe_cite", {
                        "cite_details": [d.model_dump() for d in cite_details],
                        "citation_metrics": citation_metrics.model_dump(),
                        "source_authority": source_authority.model_dump() if source_authority else None,
                    })
                cite_rate = citation_metrics.rate
                logger.log(f"[LIGHT P2-cite] → {citation_metrics.mentioned_count}/{citation_metrics.total_queries} mentioned ({cite_rate:.1f}%)")
        elif _done("probe_cite"):
            cd = ck["probe_cite"]["data"]
            cite_details = [CitationDetail(**d) for d in cd["cite_details"]]
            citation_metrics = CitationMetrics(**cd["citation_metrics"])
            source_authority = SourceAuthorityReport(**cd["source_authority"]) if cd["source_authority"] else None
            cite_error = None
            cite_rate = citation_metrics.rate
            logger.log("[LIGHT P2-cite] → 从检查点恢复")
    elif search_timed_out:
        # full 模式搜索超时
        market_perception = MarketPerception(
            perceived_identity="", perceived_strengths=[], perceived_weaknesses=[],
            perceived_positioning="", perceived_products=[], perceived_market="",
            perception_sources=[],
        )
        gap_report = GapReport(
            alignment_score=0, aligned=[], misaligned=[], blind_spots=[],
            opportunities=[], one_line_summary="",
        )
        company_evaluation = CompanyEvaluation(overall="", strengths=[], weaknesses=[], positioning="")
        mp = {}
        gr = {}
        mm_gap_error = None
        mm_gap_task = None

        cite_details = []
        citation_metrics = CitationMetrics(rate=0.0, total_queries=0, mentioned_count=0, details=[],
                                           industry_count=0, brand_count=0, competitor_count=0,
                                           recommendation_rate=0.0, recommended_count=0, top_rate=0.0, top_count=0)
        source_authority = None
        cite_error = None
        cite_rate = 0.0
        cite_task = None
    else:
        # full 模式：市场镜像 + 差距分析 + 引用率分析
        target_pos = ui.get("target_positioning", "")
        mm_gap_task = None if _done("probe_mm_gap") else asyncio.create_task(
            _stream_mm_gap(ui, search_results, all_ddg_snippets, bp, target_pos))
        cite_task = None if _done("probe_cite") else asyncio.create_task(
            _stream_cite(queries, classified_queries, search_results, ui, mode="full"))

        # 等 market_mirror + gap_analysis
        if mm_gap_task:
            try:
                mp, market_perception, gr, gap_report, company_evaluation, mm_gap_error = await asyncio.wait_for(
                    mm_gap_task, timeout=TIMEOUT_MM_GAP)
            except asyncio.TimeoutError:
                mp, market_perception, gr, gap_report, company_evaluation, mm_gap_error = _mm_gap_timeout_defaults()
                errors["probe_mm_gap_timeout"] = f"超时 ({TIMEOUT_MM_GAP}s)"
                logger.log("[搜索流P2-mm_gap] → 超时", "warn")
            else:
                if mm_gap_error:
                    errors["probe_mm_gap"] = mm_gap_error
                else:
                    _save("probe_mm_gap", {
                        "mp_dict": mp, "gr_dict": gr,
                        "company_evaluation": company_evaluation.model_dump(),
                    })
                logger.log(f"[搜索流P2-mm_gap] → alignment={gap_report.alignment_score}/100")
        else:
            md = ck["probe_mm_gap"]["data"]
            mp = md["mp_dict"]
            gr = md["gr_dict"]
            market_perception = MarketPerception(
                perceived_identity=mp.get("perceived_identity", ""),
                perceived_strengths=mp.get("perceived_strengths", []),
                perceived_weaknesses=mp.get("perceived_weaknesses", []),
                perceived_positioning=mp.get("perceived_positioning", ""),
                perceived_products=mp.get("perceived_products", []),
                perceived_market=mp.get("perceived_market", ""),
                perception_sources=mp.get("perception_sources", []),
            )
            gap_report = GapReport(
                alignment_score=gr.get("alignment_score", 0),
                aligned=gr.get("aligned", []),
                misaligned=gr.get("misaligned", []),
                blind_spots=gr.get("blind_spots", []),
                opportunities=gr.get("opportunities", []),
                one_line_summary=gr.get("one_line_summary", ""),
            )
            company_evaluation = CompanyEvaluation(**md["company_evaluation"])
            mm_gap_error = None
            logger.log("[搜索流P2-mm_gap] → 从检查点恢复")

        # 等 citation_analyzer + rate + source_authority
        if cite_task:
            try:
                cite_details, citation_metrics, source_authority, cite_error = await asyncio.wait_for(
                    cite_task, timeout=TIMEOUT_CITE)
            except asyncio.TimeoutError:
                cite_details, citation_metrics, source_authority, cite_error = _cite_timeout_defaults(queries, classified_queries)
                errors["probe_cite_timeout"] = f"超时 ({TIMEOUT_CITE}s)"
                logger.log("[搜索流P2-cite] → 超时", "warn")
            else:
                if cite_error:
                    errors["probe_cite"] = cite_error
                else:
                    _save("probe_cite", {
                        "cite_details": [d.model_dump() for d in cite_details],
                        "citation_metrics": citation_metrics.model_dump(),
                        "source_authority": source_authority.model_dump() if source_authority else None,
                    })
                cite_rate = citation_metrics.rate
                logger.log(f"[搜索流P2-cite] → {citation_metrics.mentioned_count}/{citation_metrics.total_queries} mentioned ({cite_rate:.1f}%) "
                           f"| recommended={citation_metrics.recommendation_rate:.1f}% top={citation_metrics.top_rate:.1f}% "
                           f"A:{citation_metrics.industry_rate:.1f}% B:{citation_metrics.brand_rate:.1f}% C:{citation_metrics.competitor_scenario_rate:.1f}% | "
                           f"official={citation_metrics.official_site_ratio:.2f} | "
                           f"sa={source_authority.total_sources if source_authority else 0} sources")
        elif _done("probe_cite"):
            cd = ck["probe_cite"]["data"]
            cite_details = [CitationDetail(**d) for d in cd["cite_details"]]
            citation_metrics = CitationMetrics(**cd["citation_metrics"])
            source_authority = SourceAuthorityReport(**cd["source_authority"]) if cd["source_authority"] else None
            cite_error = None
            cite_rate = citation_metrics.rate
            logger.log("[搜索流P2-cite] → 从检查点恢复")
        # else: cite_task is None because search_timed_out → use defaults set above

    # ── Level 3: scorer → narrative（light 模式跳过 ai_narrative）──
    if mode == "light":
        cs = None
        an = None
        score_error = None
        narrative_error = None
        if not _done("probe_scorer_light"):
            try:
                cs, _, score_error, _ = await asyncio.wait_for(
                    _stream_scorer_light(bp, mp, gr, citation_metrics, ui, effective_industry),
                    timeout=TIMEOUT_SCORER)
            except asyncio.TimeoutError:
                cs = None
                score_error = f"超时 ({TIMEOUT_SCORER}s)"
                errors["probe_scorer_timeout"] = score_error
                logger.log("[LIGHT P3] → 超时", "warn")
            else:
                if not score_error:
                    _save("probe_scorer_light", {
                        "cs": cs.model_dump() if cs else None,
                    })
                logger.log(f"[LIGHT P3] → score={cs.overall if cs else 'N/A'}/100")
        elif _done("probe_scorer_light"):
            sd = ck["probe_scorer_light"]["data"]
            cs = CompanyScore(**sd["cs"]) if sd["cs"] else None
            logger.log("[LIGHT P3] → 从检查点恢复")
    elif search_timed_out:
        cs = None
        an = None
        score_error = None
        narrative_error = None
    elif not _done("probe_scorer_narrative"):
        try:
            cs, an, score_error, narrative_error = await asyncio.wait_for(
                _stream_scorer_narrative(bp, mp, gr, citation_metrics, ui, effective_industry),
                timeout=TIMEOUT_SCORER)
        except asyncio.TimeoutError:
            cs, an = None, None
            score_error = f"超时 ({TIMEOUT_SCORER}s)"
            errors["probe_scorer_timeout"] = score_error
            logger.log("[搜索流P3] → 超时", "warn")
        else:
            if score_error:
                errors["probe_scorer"] = score_error
            if narrative_error:
                errors["probe_narrative"] = narrative_error
            if not score_error and not narrative_error:
                _save("probe_scorer_narrative", {
                    "cs": cs.model_dump() if cs else None,
                    "an": an.model_dump() if an else None,
                })
            logger.log(f"[搜索流P3] → score={cs.overall if cs else 'N/A'}/100 | "
                       f"narrative={len(an.keywords) if an else 0} keywords")
    else:
        sd = ck["probe_scorer_narrative"]["data"]
        cs = CompanyScore(**sd["cs"]) if sd["cs"] else None
        an = AINarrative(**sd["an"]) if sd["an"] else None
        score_error = None
        narrative_error = None
        logger.log("[搜索流P3] → 从检查点恢复")

    # ── Level 4: 等竞品流（full 模式）────────────────────
    if mode == "full":
        if comp_task:
            try:
                comp_result = await asyncio.wait_for(comp_task, timeout=TIMEOUT_COMPETITOR)
            except asyncio.TimeoutError:
                comp_results = []
                comp_tokens = 0
                comp_statuses = {}
                errors["probe_competitor_timeout"] = f"超时 ({TIMEOUT_COMPETITOR}s)"
                logger.log("[竞品流] → 超时", "warn")
            else:
                comp_results = comp_result["comp_results"]
                comp_tokens = comp_result["comp_tokens"]
                comp_statuses = comp_result["comp_statuses"]
                comp_search_results = comp_result.get("comp_search_results", [])
                if comp_result.get("error"):
                    errors["probe_competitor"] = comp_result["error"]
                else:
                    _save("probe_competitor", {
                        "comp_results": [r.model_dump() for r in comp_results],
                        "comp_tokens": comp_tokens,
                        "comp_statuses": comp_statuses,
                    })
                logger.log(f"[竞品流] → {len(comp_results)} comparisons | "
                           f"{sum(len(sr) for sr in comp_search_results)} search results | "
                           f"{comp_tokens} tokens")
        elif _done("probe_competitor"):
            cd = ck["probe_competitor"]["data"]
            comp_results = [CompetitorResult(**r) for r in cd["comp_results"]]
            comp_tokens = cd["comp_tokens"]
            comp_statuses = cd["comp_statuses"]
            logger.log("[竞品流] → 从检查点恢复")
        else:
            comp_results = []
            comp_tokens = 0
            comp_statuses = {}
    else:
        # light 模式：跳过完整竞品流，comp_results 始终为空
        comp_results = []
        comp_tokens = 0
        comp_statuses = {}

    # ── Level 4: 等多引擎流（full 模式）───────────────────
    if mode == "full":
        if multi_engine_task:
            try:
                engine_results = await asyncio.wait_for(multi_engine_task, timeout=TIMEOUT_MULTI_ENGINE)
            except asyncio.TimeoutError:
                engine_results = {}
                errors["probe_multi_engine_timeout"] = f"超时 ({TIMEOUT_MULTI_ENGINE}s)"
                logger.log("[多引擎流] → 超时", "warn")
            except Exception as e:
                engine_results = {}
                errors["probe_multi_engine"] = str(e)
                logger.log(f"[多引擎流] → 异常: {e}", "error")
            else:
                if engine_results:
                    _save("probe_multi_engine", {"engine_results": {
                        k: v.model_dump() for k, v in engine_results.items()
                    }})
                logger.log(f"[多引擎流] → {len(engine_results)} engines: "
                           f"{', '.join(f'{k}={v.citation_rate:.0f}%' for k, v in engine_results.items())}")
        elif _done("probe_multi_engine"):
            md = ck["probe_multi_engine"]["data"]["engine_results"]
            engine_results = {k: EngineResult(**v) for k, v in md.items()}
            logger.log("[多引擎流] → 从检查点恢复")
        else:
            engine_results = {}
    else:
        engine_results = {}

    # ── 合并 A 类引用数据（full 模式多引擎流产出）到 citation_metrics ──
    if mode == "full" and ENABLE_MULTI_ENGINE and engine_results:
        gpt_engine = engine_results.get("gpt")
        if gpt_engine:
            a_count = sum(1 for cat in query_categories.values() if cat == "industry")
            a_mentioned = round(a_count * gpt_engine.citation_rate / 100)
            citation_metrics.industry_rate = gpt_engine.citation_rate
            citation_metrics.industry_count = a_count
            citation_metrics.industry_mentioned = a_mentioned
            total_all = citation_metrics.total_queries + a_count
            mentioned_all = citation_metrics.mentioned_count + a_mentioned
            citation_metrics.rate = citation_metrics.industry_rate  # A类引用率
            citation_metrics.total_queries = total_all
            citation_metrics.mentioned_count = mentioned_all

            # 合并 industry 引用明细到 details
            raw_data = gpt_engine.raw_data or {}
            engine_citations = raw_data.get("citations", [])
            industry_details = []
            for c in engine_citations:
                cd = CitationDetail(
                    query=c.get("query", ""),
                    mentioned=c.get("is_mentioned", False),
                    position=c.get("position", "none"),
                    mention_context=c.get("mention_context", ""),
                    reference_source=c.get("reference_source", ""),
                    query_category="industry",
                )
                industry_details.append(cd)
            if industry_details:
                citation_metrics.details = list(citation_metrics.details) + industry_details

    # ── 汇总 ─────────────────────────────────────────────
    elapsed_ms = int((time.time() - start_time) * 1000)
    total_tokens = search_tokens + comp_tokens
    cost_guardrail_hit = total_tokens > 150000

    all_statuses = {**search_statuses}
    if ui.get("competitors"):
        all_statuses.update(comp_statuses)

    meta = ProbeMeta(
        total_tokens=total_tokens,
        total_cost=round(total_tokens / 1000 * 0.002, 4),
        total_duration_ms=elapsed_ms,
        query_statuses=all_statuses,
    )

    # light 模式不要求 an（ai_narrative 跳过），忽略 an is None 的 partial 判断
    if mode == "light":
        partial = (circuit_open or cost_guardrail_hit or cs is None
                   or bool(brand_error) or bool(cite_error))
    else:
        partial = (circuit_open or cost_guardrail_hit or cs is None or an is None
                   or bool(brand_error) or bool(mm_gap_error) or bool(cite_error))

    # 计算错误原因和数据完整度（优先级：熔断 > 预算超支 > 搜索超时）
    probe_error = None
    data_completeness = "complete"
    if circuit_open:
        probe_error = "Circuit breaker triggered"
        data_completeness = "circuit_open"
    elif cost_guardrail_hit:
        probe_error = "Token budget exceeded (150K)"
        data_completeness = "cost_guardrail"
    elif search_timed_out:
        probe_error = f"Search pipeline timed out ({TIMEOUT_SEARCH_P1}s), Level 2+3 skipped"
        data_completeness = "search_timeout"

    probe_output = ProbeOutput(
        company_evaluation=company_evaluation if mode == "full" else None,
        market_perception=market_perception if mode == "full" else None,
        gap_report=gap_report if mode == "full" else None,
        citation_metrics=citation_metrics,
        competitor_analysis=comp_results if mode == "full" else [],
        engines_queried=["chatgpt"] if mode == "light" else ["chatgpt", "deepseek"],
        query_terms=expanded_query_strs,
        meta=meta,
        status="partial" if partial else "success",
        error=probe_error,
        data_completeness=data_completeness,
        brand_profile=bp,
        company_score=cs,
        ai_narrative=an if mode == "full" else None,
        source_authority=source_authority if mode == "full" else None,
        engine_results=engine_results if mode == "full" else {},
    )

    if cost_guardrail_hit:
        errors["probe_cost_guardrail"] = f"token budget exceeded: {total_tokens} > 150000"

    logger.log(f"[{mode.upper()}] Done in {elapsed_ms}ms | cite_rate={cite_rate:.1f}% | "
               f"score={cs.overall if cs else 'N/A'}/100 | tokens={total_tokens}")

    # 成功后清理磁盘缓存（失败/partial 时保留，供下次重试用）
    if not partial and _task_id:
        _cache_clear(_task_id)

    # 用 Haiku 从搜索结果提取竞品提及（约 ¥0.03），light/full 均执行
    competitor_mentions = []
    if not search_timed_out:
        competitor_mentions = await _extract_competitor_mentions(
            search_results, ui.get("brand_name", ""), ui.get("domain", ""))

    return {
        **state,
        "probe_output": probe_output.model_dump(),
        "probe_meta": meta.model_dump(),
        "errors": errors,
        "checkpoint": ck,
        "_competitor_mentions": competitor_mentions,
    }


# ═══════════════════════════════════════════════════════════════
# 三条并行流
# ═══════════════════════════════════════════════════════════════

async def _stream_brand(ui: dict) -> tuple:
    """品牌流：brand_profiler。完全独立，不依赖其他流。
    Returns: (BrandProfile | None, error_str | None)
    """
    bp_data = {}
    try:
        bp_data = await brand_profile(ui)
    except Exception as e:
        logger.log(f"brand_profiler failed ({e}), fallback to intro_composer", "warn")
        bp_data = _brand_fallback(ui)

    # 记录官网爬取状态
    crawl_info = bp_data.get("_crawl_status", {})
    if crawl_info:
        if crawl_info.get("success"):
            logger.log(f"[brand流] 官网爬取成功: {crawl_info['pages_ok']}/4页, {crawl_info['total_chars']}字符")
        else:
            logger.log(f"[brand流] 官网爬取失败，使用用户输入兜底", "warn")

    try:
        bp = BrandProfile(**{k: v for k, v in bp_data.items() if not k.startswith("_")})
        # 如果 LLM 返回空的 inferred_*，用用户输入兜底
        if not bp.inferred_industry:
            bp.inferred_industry = ui.get("industry", "")
        if not bp.inferred_target_market:
            bp.inferred_target_market = ui.get("target_market", "")
        if not bp.inferred_core_product:
            bp.inferred_core_product = ui.get("core_product", "")
        return bp, None
    except Exception as e:
        # 极端情况：fallback 后仍然无法构造 BrandProfile
        bp = BrandProfile(
            brand_name=ui.get("brand_name", ""),
            one_liner="",
            value_props=[], differentiators=[], target_personas=[],
            tone_keywords=[], full_description="",
            inferred_industry=ui.get("industry", ""),
            inferred_target_market=ui.get("target_market", ""),
            inferred_core_product=ui.get("core_product", ""),
        )
        return bp, str(e)


async def _stream_search_phase1(ui: dict, expanded_queries: list[str]) -> dict:
    """搜索流 Phase 1: fc_search ×30（query_expander 已在调用方执行）。
    独立跑，不依赖品牌流或竞品流。
    """
    result = {
        "queries": expanded_queries, "search_results": [], "search_tokens": 0,
        "search_statuses": {}, "all_ddg_snippets": [],
        "ok": 0, "skipped": 0, "failed": 0, "circuit_open": False,
    }

    queries = expanded_queries

    # fc_search (async batch, 5 concurrency)
    search_results = await _batch_fc_search(
        queries=queries,
        brand_name=ui["brand_name"],
        brand_domain=ui["domain"],
    )
    result["search_results"] = search_results

    search_tokens = 0
    search_statuses = {}
    all_ddg_snippets = []

    for i, r in enumerate(search_results):
        q = queries[i] if i < len(queries) else "unknown"
        if _is_error_result(r):
            search_statuses[q] = "failed"
        elif isinstance(r, dict) and r.get("no_search"):
            search_statuses[q] = "skipped"
        else:
            search_statuses[q] = "success"
            if isinstance(r, dict):
                search_tokens += r.get("tokens", 0)
                all_ddg_snippets.extend(r.get("raw_citations", []))

    ok = sum(1 for v in search_statuses.values() if v == "success")
    skipped = sum(1 for v in search_statuses.values() if v == "skipped")
    failed = len(search_results) - ok - skipped

    result.update({
        "search_tokens": search_tokens,
        "search_statuses": search_statuses,
        "all_ddg_snippets": all_ddg_snippets,
        "ok": ok, "skipped": skipped, "failed": failed,
        "circuit_open": breaker.is_open(),
    })
    return result


async def _stream_mm_gap(ui: dict, search_results: list, all_ddg_snippets: list,
                          bp: BrandProfile | None, target_pos: str = "") -> tuple:
    """搜索流 Phase 2 分支 A: market_mirror → gap_analysis。
    需要 search_results + brand_profile.full_description。
    Returns: (mp_dict, MarketPerception, gr_dict, GapReport, CompanyEvaluation, error)
    """
    mp_dict = {}
    gr_dict = {}
    error = None

    try:
        mp_dict = mirror(
            brand_name=ui["brand_name"],
            domain=ui["domain"],
            search_results=[r for r in search_results if isinstance(r, dict) and not _is_error_result(r)],
            raw_snippets=all_ddg_snippets,
            competitors=ui.get("competitors", []),
        )
    except Exception as e:
        logger.log(f"market_mirror failed: {e}", "warn")
        error = f"market_mirror: {e}"
        mp_dict = {
            "perceived_identity": "", "perceived_strengths": [], "perceived_weaknesses": [],
            "perceived_positioning": "", "perceived_products": [], "perceived_market": "",
            "perception_sources": [],
        }

    market_perception = MarketPerception(
        perceived_identity=mp_dict.get("perceived_identity", ""),
        perceived_strengths=mp_dict.get("perceived_strengths", []),
        perceived_weaknesses=mp_dict.get("perceived_weaknesses", []),
        perceived_positioning=mp_dict.get("perceived_positioning", ""),
        perceived_products=mp_dict.get("perceived_products", []),
        perceived_market=mp_dict.get("perceived_market", ""),
        perception_sources=mp_dict.get("perception_sources", []),
    )

    full_desc = bp.full_description if bp else ""
    try:
        gr_dict = gap_analyze(
            self_portrait=full_desc,
            market_perception=mp_dict,
            user_input=ui,
            target_positioning=target_pos,
        )
    except Exception as e:
        logger.log(f"gap_analysis failed: {e}", "warn")
        if not error:
            error = f"gap_analysis: {e}"
        gr_dict = {
            "alignment_score": 0, "aligned": [], "misaligned": [], "blind_spots": [],
            "opportunities": [], "one_line_summary": "",
            "target_alignment_score": 0, "target_aligned": [], "target_misaligned": [],
            "target_gap_summary": "",
            "overall": "", "strengths_list": [], "weaknesses_list": [], "positioning": "",
        }

    gap_report = GapReport(
        alignment_score=gr_dict.get("alignment_score", 0),
        aligned=gr_dict.get("aligned", []),
        misaligned=gr_dict.get("misaligned", []),
        blind_spots=gr_dict.get("blind_spots", []),
        opportunities=gr_dict.get("opportunities", []),
        one_line_summary=gr_dict.get("one_line_summary", ""),
        target_alignment_score=gr_dict.get("target_alignment_score", 0),
        target_aligned=gr_dict.get("target_aligned", []),
        target_misaligned=gr_dict.get("target_misaligned", []),
        target_gap_summary=gr_dict.get("target_gap_summary", ""),
        has_target_gap=bool(target_pos and target_pos.strip()),
    )
    company_evaluation = CompanyEvaluation(
        overall=gr_dict.get("overall", ""),
        strengths=gr_dict.get("strengths_list", []),
        weaknesses=gr_dict.get("weaknesses_list", []),
        positioning=gr_dict.get("positioning", ""),
    )

    return mp_dict, market_perception, gr_dict, gap_report, company_evaluation, error


async def _stream_cite(queries: list[str], classified_queries: list[dict],
                        search_results: list, ui: dict, mode: str = "full") -> tuple:
    """搜索流 Phase 2 分支 B: citation_analyzer ×N → citation_rate + 分类统计 + 引用源分布。
    需要 search_results，不依赖品牌流。
    mode="light" 时跳过 source_authority 和 competitor_citation 提取（省成本）。
    Returns: (cite_details, CitationMetrics, source_authority, error)
    """
    error = None
    try:
        cite_details = await _batch_analyze_citations(
            queries=queries,
            search_results=search_results,
            brand_name=ui["brand_name"],
            domain=ui["domain"],
        )
    except Exception as e:
        logger.log(f"citation_analyzer batch failed: {e}", "warn")
        error = str(e)
        cite_details = [
            CitationDetail(query=q, mentioned=False, position="none",
                           mention_context="", reference_source="")
            for q in queries
        ]

    # ── 总体引用率（提及率）+ 推荐率 ──────────────────
    mentioned_count = sum(1 for d in cite_details if d.mentioned)
    cite_rate = (mentioned_count / len(cite_details) * 100) if cite_details else 0.0

    recommended_positions = {"top", "middle", "bottom"}
    recommended_count = sum(1 for d in cite_details if d.position in recommended_positions)
    recommendation_rate = (recommended_count / len(cite_details) * 100) if cite_details else 0.0
    top_count = sum(1 for d in cite_details if d.position == "top")
    top_rate = (top_count / len(cite_details) * 100) if cite_details else 0.0

    # ── 按类别分组计数 ──────────────────────────────────
    # 建立 query → category 映射
    query_category = {}
    for cq in classified_queries:
        q_text = cq["query"] if isinstance(cq, dict) else cq
        query_category[q_text] = cq.get("category", "industry") if isinstance(cq, dict) else "industry"

    # 将分类信息回写到每个 CitationDetail
    for d in cite_details:
        d.query_category = query_category.get(d.query, "industry")

    # 按类别统计
    cat_counts = {"industry": 0, "brand": 0, "competitor": 0}
    cat_mentioned = {"industry": 0, "brand": 0, "competitor": 0}
    for d in cite_details:
        cat = d.query_category
        cat_counts[cat] += 1
        if d.mentioned:
            cat_mentioned[cat] += 1

    industry_rate = (cat_mentioned["industry"] / cat_counts["industry"] * 100) if cat_counts["industry"] > 0 else 0.0
    brand_rate = (cat_mentioned["brand"] / cat_counts["brand"] * 100) if cat_counts["brand"] > 0 else 0.0
    competitor_rate = (cat_mentioned["competitor"] / cat_counts["competitor"] * 100) if cat_counts["competitor"] > 0 else 0.0

    # 引用率一律用 A 类（行业查询词），B/C 类不参与引用率计算
    cite_rate = industry_rate

    # ── 引用源分布 ──────────────────────────────────────
    official_domain = ui.get("domain", "").lower().removeprefix("www.")
    source_counts: dict[str, int] = {}
    for d in cite_details:
        if d.mentioned and d.reference_source:
            domain = _extract_domain(d.reference_source)
            source_counts[domain] = source_counts.get(domain, 0) + 1

    total_refs = sum(source_counts.values())
    source_distribution = {k: round(v / total_refs, 3) for k, v in source_counts.items()} if total_refs > 0 else {}
    official_site_ratio = source_distribution.get(official_domain, 0.0)
    third_party_ratio = round(1.0 - official_site_ratio, 3)

    citation_metrics = CitationMetrics(
        rate=round(cite_rate, 1),
        total_queries=len(cite_details),
        mentioned_count=mentioned_count,
        details=cite_details,
        industry_rate=round(industry_rate, 1),
        brand_rate=round(brand_rate, 1),
        competitor_scenario_rate=round(competitor_rate, 1),
        industry_count=cat_counts["industry"],
        brand_count=cat_counts["brand"],
        competitor_count=cat_counts["competitor"],
        industry_mentioned=cat_mentioned["industry"],
        brand_mentioned=cat_mentioned["brand"],
        competitor_mentioned=cat_mentioned["competitor"],
        recommendation_rate=round(recommendation_rate, 1),
        recommended_count=recommended_count,
        top_rate=round(top_rate, 1),
        top_count=top_count,
        source_distribution=source_distribution,
        official_site_ratio=official_site_ratio,
        third_party_ratio=third_party_ratio,
        competitor_citation_detail=extract_competitor_citations(
            search_results, ui.get("competitors", []), len(cite_details)) if mode == "full" else {},
    )

    sa = None
    if mode == "full":
        try:
            sa_data = source_authority_analyze([d.model_dump() for d in cite_details], brand_domain=ui.get("domain", ""))
            sa = SourceAuthorityReport(**sa_data)
        except Exception as e:
            logger.log(f"source_authority failed: {e}", "warn")

    return cite_details, citation_metrics, sa, error


async def _stream_scorer_narrative(bp: BrandProfile | None, mp_dict: dict,
                                     gr_dict: dict, citation_metrics: CitationMetrics,
                                     ui: dict, effective_industry: str = "") -> tuple:
    """搜索流 Phase 3: company_scorer → ai_narrative。
    依赖 Phase 2 两分支的结果。
    Returns: (CompanyScore | None, AINarrative | None, score_error, narrative_error)
    """
    cs = None
    an = None
    score_error = None
    narrative_error = None
    cite_rate = citation_metrics.rate

    # company_scorer
    try:
        cs_data = company_scorer(
            brand_profile=bp.model_dump() if bp else {},
            market_perception=mp_dict,
            citation_rate=cite_rate,
            gap_report=gr_dict,
            industry=effective_industry or ui.get("industry", ""),
            recommendation_rate=citation_metrics.recommendation_rate,
        )
        if cs_data.get("_error"):
            score_error = cs_data["_error"]
        else:
            cs = CompanyScore(
                overall=cs_data.get("overall", 0),
                dimensions=[DimensionScore(**d) for d in cs_data.get("dimensions", [])],
                industry=cs_data.get("industry", ""),
                weights_used=cs_data.get("weights_used", {}),
            )
    except Exception as e:
        score_error = str(e)

    # ai_narrative
    try:
        an_data = ai_narrative_gen(
            brand_profile=bp.model_dump() if bp else {},
            company_score=cs.model_dump() if cs else {"overall": 0, "dimensions": []},
            gap_report=gr_dict,
        )
        if an_data.get("_error"):
            narrative_error = an_data["_error"]
        else:
            an = AINarrative(**an_data)
    except Exception as e:
        narrative_error = str(e)

    return cs, an, score_error, narrative_error


async def _stream_scorer_light(bp: BrandProfile | None, mp_dict: dict,
                                gr_dict: dict, citation_metrics: CitationMetrics,
                                ui: dict, effective_industry: str = "") -> tuple:
    """light 模式：只跑 company_scorer，不跑 ai_narrative。
    Returns: (CompanyScore | None, None, score_error | None, None)
    """
    cs = None
    score_error = None
    try:
        cs_result = company_scorer(
            brand_profile=bp.model_dump() if bp else {},
            market_perception=mp_dict,
            citation_rate=citation_metrics.rate,
            gap_report=gr_dict,
            industry=effective_industry or ui.get("industry", ""),
            recommendation_rate=citation_metrics.recommendation_rate,
        )
        cs = CompanyScore(**cs_result)
    except Exception as e:
        score_error = f"company_scorer 失败: {e}"
    return cs, None, score_error, None


async def _extract_competitor_mentions(search_results: list, brand_name: str, domain: str, top_n: int = 5) -> list[dict]:
    """用 Haiku 从搜索结果中提取被提及的竞品品牌名。
    约 ¥0.03 成本，比正则可靠得多。失败时降级为空列表。
    Returns: [{"brand": "Casetify", "mention_count": 12}, ...]
    """
    from langgraph_app.tools.engines.chatgpt_api import call_api
    from langgraph_app.config import CLAUDE_HAIKU_CONFIG

    combined_text = ""
    for sr in search_results:
        if not sr or isinstance(sr, Exception):
            continue
        answer = sr.get("answer", "")
        if answer:
            combined_text += answer + "\n---\n"

    if not combined_text.strip():
        return []

    prompt = (
        f'Extract brand/company names mentioned in the search results below.\n'
        f'Exclude the brand being analyzed: "{brand_name}"\n'
        f'Exclude website/platform names: Reddit, YouTube, Google, TikTok, Trustpilot.\n'
        f'Return a JSON array sorted by mention frequency, max {top_n} items:\n'
        f'[{{"brand": "BrandName", "mention_count": N}}]\n\n'
        f'Rules:\n'
        f'- Count actual mentions of each brand across all search results\n'
        f'- Merge different spellings of the same brand (e.g. "Casetify" / "CASETiFY")\n'
        f'- Only include brands with >= 2 mentions\n'
        f'- If no competitor brands found, return empty array []\n\n'
        f'Search results:\n{combined_text[:15000]}'
    )

    messages = [{"role": "user", "content": prompt}]
    try:
        resp = call_api(messages, CLAUDE_HAIKU_CONFIG, temperature=0.1)
        content = resp["choices"][0]["message"]["content"]
        import json
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        result = json.loads(content.strip())
        if isinstance(result, list):
            return [{"brand": r["brand"], "mention_count": r["mention_count"]}
                    for r in result if r.get("brand")]
    except Exception as e:
        logger.log(f"Haiku 竞品提取失败，降级为空: {e}", "warn")
        return []


async def _quick_industry_hint(domain: str) -> str:
    """极低成本行业推断：只抓首页 <title> 和 og:description，≈1s。失败返回空字符串。"""
    if not domain:
        return ""
    import re
    try:
        import httpx
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
            resp = await client.get(f"https://{domain}", follow_redirects=True,
                                    headers={
                                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                                        "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
                                    })
            if resp.status_code != 200:
                return ""
            html = resp.text

            # 优先从 og:description 提取（通常比 title 更具描述性）
            og_match = re.search(r'<meta[^>]+property="og:description"[^>]+content="([^"]+)"', html, re.IGNORECASE)
            if not og_match:
                og_match = re.search(r"<meta[^>]+property='og:description'[^>]+content='([^']+)'", html, re.IGNORECASE)
            if og_match:
                desc = og_match.group(1).strip()
                # 取第一句话（通常包含产品类别）
                sent = desc.split(".")[0].split("。")[0].strip()
                if len(sent) > 10:
                    return sent

            # 回退：从 <title> 提取
            match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
            if match:
                title = match.group(1).strip()
                for sep in (" - ", " | ", " — ", " · ", " :: "):
                    if sep in title:
                        first = title.split(sep)[0].strip()
                        # 第一个部分通常是 "BrandName ProductCategory"，取它
                        if len(first) > 3:
                            return first
                if len(title) > 3:
                    return title
    except Exception:
        pass
    return ""


async def _stream_competitor(ui: dict) -> dict:
    """竞品流：query_gen → Serper搜索 → DeepSeek合成 → comparison×15。
    完全独立，不依赖品牌流或搜索流。
    """
    result = {"comp_results": [], "comp_tokens": 0, "comp_statuses": {},
              "comp_search_results": [], "error": None}
    competitors = ui.get("competitors", [])
    if not competitors:
        return result

    # query_gen
    try:
        comp_queries = gen_comp_queries(
            brand_name=ui["brand_name"],
            competitors=competitors,
            industry=ui["industry"],
        )
    except Exception as e:
        result["error"] = f"competitor_query_gen: {e}"
        return result

    # search → synthesize (async batch, uses Serper + DeepSeek)
    comp_results_raw = await _batch_search_and_answer(comp_queries)
    parsed_answers = []
    comp_tokens = 0
    comp_statuses = {}
    comp_search_results = []

    for i, r in enumerate(comp_results_raw):
        q = comp_queries[i] if i < len(comp_queries) else "unknown"
        answer_text = r.get("answer", "")
        search_results = r.get("search_results", [])

        if answer_text.startswith("搜索失败") or answer_text.startswith("合成答案失败"):
            comp_statuses[q] = "failed"
            parsed_answers.append(None)
        elif answer_text == "搜索结果为空，无法回答":
            comp_statuses[q] = "skipped"
            parsed_answers.append(None)
        else:
            comp_statuses[q] = "success"
            parsed_answers.append(answer_text)

        comp_search_results.append(search_results)

    result["comp_tokens"] = comp_tokens
    result["comp_statuses"] = comp_statuses
    result["comp_search_results"] = comp_search_results

    # comparison analysis (async batch)
    comp_results = await _batch_analyze_comparisons(
        comp_queries=comp_queries,
        parsed_answers=parsed_answers,
        brand_name=ui["brand_name"],
        competitors=competitors,
        comp_search_results=comp_search_results,
    )
    result["comp_results"] = comp_results
    return result


async def _stream_multi_engine_search(ui: dict, a_class_queries: list[str],
                                        query_categories: dict) -> dict[str, EngineResult]:
    """三引擎搜索流：三引擎跑同一套 A 类查询词（DeepSeek 统一生成）→ 搜索 → citation 分析。

    引擎差异体现在搜索+合成策略，查询词统一保证横向可比。
    """
    if not a_class_queries:
        return {}

    engines = ["gpt", "gemini", "haiku"]

    async def _engine_flow(engine: str):
        # 1. 使用统一的 A 类查询词（不再独立生成）
        queries = a_class_queries

        # 2. 搜索 + 合成
        from langgraph_app.tools.fc_search import _search_single_engine
        answers = await _search_single_engine(engine, queries)

        # 3. Citation 分析
        citations = await _batch_cite_for_engine(answers, ui)

        mentioned_count = sum(1 for d in citations if d.get("is_mentioned", False))
        cite_rate = (mentioned_count / len(citations) * 100) if citations else 0.0

        recommended_positions = {"top", "middle", "bottom"}
        recommended_count = sum(1 for d in citations if d.get("position", "") in recommended_positions)
        recommendation_rate = (recommended_count / len(citations) * 100) if citations else 0.0

        source_counts: dict[str, int] = {}
        for d in citations:
            if d.get("is_mentioned") and d.get("reference_source"):
                domain = _extract_domain(d["reference_source"])
                source_counts[domain] = source_counts.get(domain, 0) + 1

        er = EngineResult(
            engine=engine,
            queries=queries,
            citation_rate=round(cite_rate, 1),
            recommendation_rate=round(recommendation_rate, 1),
            sources=dict(sorted(source_counts.items(), key=lambda x: -x[1])),
            competitor_analysis=[],
            raw_data={"answers": answers, "citations": citations},
        )
        return engine, er

    tasks = [asyncio.create_task(_engine_flow(e)) for e in engines]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    engine_results = {}
    for r in results:
        if isinstance(r, Exception):
            continue
        if r and r[1] is not None:
            engine_results[r[0]] = r[1]

    return engine_results


async def _batch_cite_for_engine(answers: list[dict], ui: dict) -> list[dict]:
    """批量 citation 分析（多引擎流专用，3 并发）。"""
    sem = asyncio.Semaphore(BATCH_SIZE)
    details = [None] * len(answers)

    async def _analyze_one(idx: int, item: dict):
        async with sem:
            answer_text = item.get("answer", "")
            q = item.get("query", "")
            try:
                detail = await asyncio.to_thread(
                    analyze, "citation",
                    text=answer_text,
                    brand_name=ui["brand_name"],
                    domain=ui["domain"],
                )
                details[idx] = detail
            except Exception:
                details[idx] = {
                    "is_mentioned": False, "position": "none",
                    "mention_context": "", "reference_source": "",
                }

    tasks = [asyncio.create_task(_analyze_one(i, item)) for i, item in enumerate(answers)]
    await asyncio.gather(*tasks)
    return details


async def _batch_search_and_answer(queries: list[str], batch_size: int = 5) -> list[dict]:
    """批量搜索 + 合成答案（并发）。"""
    semaphore = asyncio.Semaphore(batch_size)

    tasks = [search_and_answer(query, semaphore) for query in queries]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    processed = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            processed.append({
                "query": queries[i],
                "answer": f"搜索失败: {result}",
                "search_results": [],
            })
        else:
            processed.append(result)

    return processed


# ═══════════════════════════════════════════════════════════════
# Async batch runners (unchanged logic)
# ═══════════════════════════════════════════════════════════════

async def _batch_fc_search(queries: list[str], brand_name: str, brand_domain: str) -> list:
    """批量 fc_search，Semaphore 控制并发。全部 task 一次创建，随完随补。"""
    sem = asyncio.Semaphore(BATCH_SIZE)
    results = [None] * len(queries)

    async def _search_one(idx: int, q: str):
        async with sem:
            if breaker.is_open():
                return
            # 磁盘幂等缓存检查
            key = _make_key("fc_search", q, brand_name, brand_domain)
            if _task_id:
                cached = _cache_get(_task_id, key)
                if cached is not None:
                    results[idx] = cached
                    return
            try:
                result = await asyncio.to_thread(fc_search, q, brand_name, brand_domain)
                if isinstance(result, dict) and not result.get("error"):
                    breaker.reset()
                    if _task_id:
                        _cache_set(_task_id, key, result)
                elif isinstance(result, dict) and result.get("error"):
                    breaker.record_failure()
                else:
                    breaker.record_failure()
                results[idx] = result
            except Exception as e:
                breaker.record_failure()
                results[idx] = e

    tasks = [asyncio.create_task(_search_one(i, q)) for i, q in enumerate(queries)]
    await asyncio.gather(*tasks)
    return results


async def _batch_analyze_citations(queries: list[str], search_results: list,
                                    brand_name: str, domain: str) -> list:
    """批量 citation 分析，3 并发 + 批次间隔。"""
    sem = asyncio.Semaphore(BATCH_SIZE)
    details = [None] * len(search_results)

    async def _analyze_one(idx: int, sr, q: str):
        async with sem:
            if not isinstance(sr, dict) or _is_error_result(sr):
                details[idx] = CitationDetail(
                    query=q, mentioned=False, position="none",
                    mention_context="", reference_source="",
                )
                return
            answer_text = sr.get("answer", "")
            key = _make_key("citation_analyzer", q, answer_text[:80], brand_name, domain)
            if _task_id:
                cached = _cache_get(_task_id, key)
                if cached is not None:
                    details[idx] = CitationDetail(**cached)
                    return
            try:
                detail = await asyncio.to_thread(
                    analyze, "citation",
                    text=answer_text,
                    brand_name=brand_name, domain=domain,
                )
                cd = CitationDetail(
                    query=q,
                    mentioned=detail.get("is_mentioned", False),
                    position=detail.get("position", "none"),
                    mention_context=detail.get("mention_context", ""),
                    reference_source=detail.get("reference_source", ""),
                )
                details[idx] = cd
                if _task_id:
                    _cache_set(_task_id, key, cd.model_dump())
            except Exception:
                details[idx] = CitationDetail(
                    query=q, mentioned=False, position="none",
                    mention_context="", reference_source="",
                )

    tasks = []
    for i, sr in enumerate(search_results):
        q = queries[i] if i < len(queries) else "unknown"
        tasks.append(asyncio.create_task(_analyze_one(i, sr, q)))
        if len(tasks) % BATCH_SIZE == 0:
            await asyncio.gather(*tasks[-BATCH_SIZE:])
            await asyncio.sleep(BATCH_DELAY)

    remaining = len(tasks) % BATCH_SIZE
    if remaining:
        await asyncio.gather(*tasks[-remaining:])

    return details


async def _batch_analyze_comparisons(comp_queries: list[str], parsed_answers: list,
                                     brand_name: str, competitors: list[str],
                                     comp_search_results: list[list[dict]] = None) -> list:
    """批量 comparison 分析，3 并发 + 批次间隔。"""
    sem = asyncio.Semaphore(BATCH_SIZE)
    results = []

    async def _analyze_one(idx: int, answer: str | None, q: str):
        async with sem:
            if answer is None:
                return None
            try:
                sr = comp_search_results[idx] if comp_search_results and idx < len(comp_search_results) else []
                cr = await asyncio.to_thread(
                    analyze, "comparison",
                    text=answer, brand_name=brand_name, competitors=competitors,
                    search_results=sr,
                )
                return CompetitorResult(
                    query=q,
                    winner=cr.get("winner", "unknown"),
                    reason=cr.get("reason", ""),
                    competitor_refs=cr.get("competitor_refs", []),
                    dimension_scores=cr.get("dimension_scores", []),
                    dimension_win_count=cr.get("dimension_win_count", {}),
                )
            except Exception:
                return None

    tasks = []
    for i, answer in enumerate(parsed_answers):
        q = comp_queries[i] if i < len(comp_queries) else "unknown"
        tasks.append(asyncio.create_task(_analyze_one(i, answer, q)))
        if len(tasks) % BATCH_SIZE == 0:
            batch = await asyncio.gather(*tasks[-BATCH_SIZE:])
            results.extend(r for r in batch if r is not None)
            await asyncio.sleep(BATCH_DELAY)

    remaining = len(tasks) % BATCH_SIZE
    if remaining:
        batch = await asyncio.gather(*tasks[-remaining:])
        results.extend(r for r in batch if r is not None)

    return results


# ═══════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════

def _brand_timeout_fallback(ui: dict) -> tuple:
    """品牌流超时时返回最简 BrandProfile（不调 API）。"""
    brand_name = ui.get("brand_name", "")
    industry = ui.get("industry", "") or "technology"
    bp = BrandProfile(
        brand_name=brand_name,
        one_liner=f"{brand_name} is a {industry} company.",
        value_props=[],
        differentiators=[],
        target_personas=[],
        tone_keywords=[],
        full_description=f"{brand_name} provides products/services in the {industry} industry.",
        inferred_industry=ui.get("industry", ""),
        inferred_target_market=ui.get("target_market", ""),
        inferred_core_product=ui.get("core_product", ""),
    )
    return bp, None


def _mm_gap_timeout_defaults() -> tuple:
    """mm_gap 超时时返回空默认值。"""
    mp = {
        "perceived_identity": "", "perceived_strengths": [], "perceived_weaknesses": [],
        "perceived_positioning": "", "perceived_products": [], "perceived_market": "",
        "perception_sources": [],
    }
    market_perception = MarketPerception(**mp)
    gr = {
        "alignment_score": 0, "aligned": [], "misaligned": [], "blind_spots": [],
        "opportunities": [], "one_line_summary": "",
        "overall": "", "strengths_list": [], "weaknesses_list": [], "positioning": "",
    }
    gap_report = GapReport(
        alignment_score=0, aligned=[], misaligned=[], blind_spots=[],
        opportunities=[], one_line_summary="",
        target_alignment_score=0, target_aligned=[], target_misaligned=[],
        target_gap_summary="", has_target_gap=False,
    )
    company_evaluation = CompanyEvaluation(overall="", strengths=[], weaknesses=[], positioning="")
    return mp, market_perception, gr, gap_report, company_evaluation, None


def _cite_timeout_defaults(queries: list[str], classified_queries: list[dict] | None = None) -> tuple:
    """cite 超时时返回空默认值。"""
    # 建立 query → category 映射
    query_category = {}
    if classified_queries:
        for cq in classified_queries:
            q_text = cq["query"] if isinstance(cq, dict) else cq
            query_category[q_text] = cq.get("category", "industry") if isinstance(cq, dict) else "industry"

    cite_details = [
        CitationDetail(query=q, mentioned=False, position="none",
                       mention_context="", reference_source="",
                       query_category=query_category.get(q, "industry"))
        for q in queries
    ]
    # 按类别计数（超时情况下都是 0）
    cat_counts = {"industry": 0, "brand": 0, "competitor": 0}
    if classified_queries:
        for cq in classified_queries:
            cat = cq.get("category", "industry") if isinstance(cq, dict) else "industry"
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

    citation_metrics = CitationMetrics(
        rate=0.0, total_queries=len(queries), mentioned_count=0, details=cite_details,
        industry_rate=0.0, brand_rate=0.0, competitor_scenario_rate=0.0,
        industry_count=cat_counts["industry"], brand_count=cat_counts["brand"],
        competitor_count=cat_counts["competitor"],
        industry_mentioned=0, brand_mentioned=0, competitor_mentioned=0,
        recommendation_rate=0.0, recommended_count=0, top_rate=0.0, top_count=0,
        source_distribution={}, official_site_ratio=0.0, third_party_ratio=0.0,
        competitor_citation_detail={},
    )
    return cite_details, citation_metrics, None, None


def _extract_domain(url: str) -> str:
    """从 URL 提取域名，去掉 www. 前缀。"""
    try:
        netloc = urlparse(url).netloc
        return netloc.removeprefix("www.")
    except Exception:
        return url


def _brand_fallback(ui: dict) -> dict:
    """brand_profiler 失败时的降级方案。"""
    return {
        "brand_name": ui.get("brand_name", ""),
        "one_liner": f"{ui.get('brand_name', '')} is a {ui.get('industry', 'technology')} company.",
        "value_props": [ui.get("core_product", "")] if ui.get("core_product") else [],
        "differentiators": [],
        "target_personas": [],
        "tone_keywords": [],
        "full_description": fallback_compose(
            brand_name=ui.get("brand_name", ""),
            domain=ui.get("domain", ""),
            industry=ui.get("industry", ""),
            target_market=ui.get("target_market", ""),
            core_product=ui.get("core_product", ""),
        ),
        "inferred_industry": ui.get("industry", ""),
        "inferred_target_market": ui.get("target_market", ""),
        "inferred_core_product": ui.get("core_product", ""),
        "_fallback": True,
    }


def _run_async(coro):
    """在当前线程的 event loop 或新建 loop 中跑 async 代码。"""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor() as pool:
        future = pool.submit(asyncio.run, coro)
        return future.result()
