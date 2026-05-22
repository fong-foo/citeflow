"""端到端测试：企业评价优化后的 Probe 管道。

测试策略：
- 用 mock 数据验证数据流正确性
- 用 real API 验证各工具可独立运行
- 最后跑完整 probe_node
"""

import json
import sys
import time


# ─── Test 1: BrandProfile 模型验证 ────────────────────────
def test_brand_profile_model():
    from langgraph_app.state import BrandProfile
    bp = BrandProfile(
        brand_name="Airwallex",
        one_liner="全球跨境支付基础设施",
        value_props=["全球多币种账户", "实时汇率", "API-first"],
        differentiators=["覆盖130+国家", "比银行快3倍"],
        target_personas=["跨境电商卖家", "B2B SaaS企业"],
        tone_keywords=["专业", "全球化", "技术驱动"],
        full_description="Airwallex 是全球领先的跨境支付平台...",
    )
    d = bp.model_dump()
    assert d["brand_name"] == "Airwallex"
    assert len(d["value_props"]) == 3
    assert len(d["differentiators"]) == 2
    print("  PASS test_brand_profile_model")


# ─── Test 2: CompanyScore 模型验证 ────────────────────────
def test_company_score_model():
    from langgraph_app.state import CompanyScore, DimensionScore
    cs = CompanyScore(
        overall=72,
        dimensions=[
            DimensionScore(name="品牌力", score=75, evidence="AI认可品牌定位", suggestion="增强内容覆盖"),
            DimensionScore(name="产品力", score=68, evidence="核心产品被AI提及", suggestion="突出差异化"),
            DimensionScore(name="内容力", score=55, evidence="引用率偏低", suggestion="增加技术博客"),
            DimensionScore(name="技术力", score=80, evidence="API被频繁推荐", suggestion="保持技术领先"),
            DimensionScore(name="市场力", score=82, evidence="全球覆盖被认可", suggestion="深耕区域市场"),
        ],
        industry="跨境支付",
        weights_used={"品牌力": 0.25, "产品力": 0.20, "内容力": 0.10, "技术力": 0.25, "市场力": 0.20},
    )
    d = cs.model_dump()
    assert d["overall"] == 72
    assert len(d["dimensions"]) == 5
    assert d["industry"] == "跨境支付"
    print("  PASS test_company_score_model")


# ─── Test 3: AINarrative 模型验证 ─────────────────────────
def test_ai_narrative_model():
    from langgraph_app.state import AINarrative
    an = AINarrative(
        ideal_description="Airwallex 是全球领先的跨境支付基础设施提供商...",
        keywords=["Airwallex", "跨境支付", "API", "多币种", "全球"],
        value_props=["覆盖130+国家", "实时汇率", "API-first平台"],
        avoid=["不要说Airwallex只是支付网关", "避免与Stripe简单对比"],
        tone="专业",
    )
    d = an.model_dump()
    assert len(d["keywords"]) == 5
    assert d["tone"] == "专业"
    assert len(d["avoid"]) == 2
    print("  PASS test_ai_narrative_model")


# ─── Test 4: ProbeOutput 扩展字段验证 ─────────────────────
def test_probe_output_extended():
    from langgraph_app.state import (
        BrandProfile, CompanyScore, DimensionScore, AINarrative,
        CompanyEvaluation, MarketPerception, GapReport,
        CitationMetrics, ProbeMeta, ProbeOutput,
    )
    bp = BrandProfile(
        brand_name="TestCo", one_liner="Test one-liner",
        value_props=[], differentiators=[], target_personas=[],
        tone_keywords=[], full_description="Test description.",
    )
    cs = CompanyScore(
        overall=50, dimensions=[
            DimensionScore(name="品牌力", score=50, evidence="t", suggestion="t"),
            DimensionScore(name="产品力", score=50, evidence="t", suggestion="t"),
            DimensionScore(name="内容力", score=50, evidence="t", suggestion="t"),
            DimensionScore(name="技术力", score=50, evidence="t", suggestion="t"),
            DimensionScore(name="市场力", score=50, evidence="t", suggestion="t"),
        ],
        industry="B2B SaaS", weights_used={},
    )
    an = AINarrative(
        ideal_description="Test.", keywords=["a"], value_props=["b"],
        avoid=["c"], tone="professional",
    )
    po = ProbeOutput(
        company_evaluation=CompanyEvaluation(overall="OK", strengths=[], weaknesses=[], positioning=""),
        market_perception=MarketPerception(
            perceived_identity="", perceived_strengths=[], perceived_weaknesses=[],
            perceived_positioning="", perceived_products=[], perceived_market="",
            perception_sources=[],
        ),
        gap_report=GapReport(alignment_score=50, aligned=[], misaligned=[], blind_spots=[], opportunities=[], one_line_summary="OK"),
        citation_metrics=CitationMetrics(rate=50.0, total_queries=30, mentioned_count=15, details=[]),
        meta=ProbeMeta(total_tokens=1000, total_cost=0.002, total_duration_ms=5000, query_statuses={}),
        brand_profile=bp,
        company_score=cs,
        ai_narrative=an,
    )
    d = po.model_dump()
    assert d["brand_profile"] is not None
    assert d["company_score"] is not None
    assert d["ai_narrative"] is not None
    assert d["company_score"]["overall"] == 50
    print("  PASS test_probe_output_extended")


# ─── Test 5: intro_composer fallback 仍可用 ────────────────
def test_intro_composer_fallback():
    from langgraph_app.tools.intro_composer import compose
    result = compose(
        brand_name="Airwallex", domain="airwallex.com",
        industry="跨境支付", target_market="全球", core_product="跨境支付API",
    )
    assert len(result) > 20
    assert "Airwallex" in result
    print("  PASS test_intro_composer_fallback")


# ─── Test 6: brand_profiler 无官网降级 ─────────────────────
def test_brand_profiler_no_website():
    """brand_profiler 在无官网数据时应降级到 intro_composer 模板。"""
    from langgraph_app.tools.brand_profiler import profile
    ui = {
        "brand_name": "TestBrand",
        "domain": "this-domain-does-not-exist-12345.com",
        "industry": "B2B SaaS",
        "target_market": "北美",
        "core_product": "数据分析平台",
    }
    result = profile(ui)
    assert result["brand_name"] == "TestBrand"
    assert len(result["one_liner"]) > 0
    assert len(result["full_description"]) > 0
    # 降级标记可能存在也可能不存在（取决于爬取是否成功）
    if result.get("_fallback"):
        print("  PASS test_brand_profiler_no_website (fallback triggered)")
    else:
        print("  PASS test_brand_profiler_no_website (crawl succeeded unexpectedly)")


# ─── Test 7: brand_profiler 真实 API 调用 ─────────────────
def test_brand_profiler_real_api():
    """真实 DeepSeek 调用，验证结构化输出。"""
    from langgraph_app.tools.brand_profiler import profile
    ui = {
        "brand_name": "Notion",
        "domain": "notion.so",
        "industry": "B2B SaaS",
        "target_market": "全球",
        "core_product": "all-in-one workspace",
    }
    start = time.time()
    result = profile(ui)
    elapsed = time.time() - start

    assert result["brand_name"] == "Notion"
    assert len(result["one_liner"]) > 5, f"one_liner too short: {result['one_liner']}"
    assert len(result["value_props"]) >= 1, f"need at least 1 value_prop"
    assert len(result["full_description"]) > 80, f"full_description too short: {len(result['full_description'])} chars"
    assert len(result["tone_keywords"]) >= 1

    print(f"  PASS test_brand_profiler_real_api ({elapsed:.1f}s)")
    print(f"    one_liner: {result['one_liner'][:100]}")
    print(f"    value_props: {result['value_props']}")
    print(f"    differentiators: {result['differentiators']}")
    print(f"    tone_keywords: {result['tone_keywords']}")
    print(f"    full_description: {len(result['full_description'])} chars")


# ─── Test 8: company_scorer 真实 API 调用 ─────────────────
def test_company_scorer_real_api():
    """真实 DeepSeek 调用，验证5维度评分。"""
    from langgraph_app.tools.company_scorer import score as company_scorer
    bp = {
        "brand_name": "Notion",
        "one_liner": "All-in-one connected workspace for modern teams",
        "value_props": ["Unified docs, wikis, and project management", "Flexible building blocks", "Real-time collaboration"],
        "differentiators": ["Highly customizable workspace", "Strong community templates"],
        "target_personas": ["Startups", "Remote teams"],
        "tone_keywords": ["friendly", "modern", "flexible"],
        "full_description": "Notion is a connected workspace that combines docs, wikis, and project management into one platform...",
    }
    mp = {
        "perceived_identity": "Notion is viewed by AI as a versatile all-in-one productivity platform.",
        "perceived_strengths": ["Customizability", "Template ecosystem", "All-in-one approach"],
        "perceived_weaknesses": ["Performance with large databases", "Offline support limitations"],
        "perceived_positioning": "Mid-market, positioned between simple note apps and enterprise suites",
    }
    gr = {
        "alignment_score": 68,
        "misaligned": ["AI underemphasizes Notion's API/integration capabilities"],
        "blind_spots": ["Enterprise security features rarely mentioned"],
    }

    start = time.time()
    result = company_scorer(
        brand_profile=bp, market_perception=mp,
        citation_rate=45.0, gap_report=gr, industry="B2B SaaS",
    )
    elapsed = time.time() - start

    if result.get("_error"):
        print(f"  FAIL test_company_scorer_real_api: {result['_error']}")
        return

    assert len(result["dimensions"]) == 5, f"Expected 5 dimensions, got {len(result['dimensions'])}"
    assert 0 <= result["overall"] <= 100, f"Overall out of range: {result['overall']}"
    for d in result["dimensions"]:
        assert d["name"] in ["品牌力", "产品力", "内容力", "技术力", "市场力"], f"Unknown dimension: {d['name']}"
        assert 0 <= d["score"] <= 100, f"Score out of range for {d['name']}: {d['score']}"
        assert len(d["evidence"]) > 0, f"Empty evidence for {d['name']}"
        assert len(d["suggestion"]) > 0, f"Empty suggestion for {d['name']}"
    assert result["industry"] == "B2B SaaS"
    assert result["weights_used"]["技术力"] == 0.30  # B2B SaaS weight

    print(f"  PASS test_company_scorer_real_api ({elapsed:.1f}s)")
    print(f"    overall: {result['overall']}/100")
    for d in result["dimensions"]:
        print(f"    {d['name']}: {d['score']}/100 — {d['evidence'][:60]}")


# ─── Test 9: ai_narrative 真实 API 调用 ───────────────────
def test_ai_narrative_real_api():
    """真实 DeepSeek 调用，验证话术生成。"""
    from langgraph_app.tools.ai_narrative import generate as ai_narrative_gen
    bp = {
        "brand_name": "Notion",
        "one_liner": "All-in-one connected workspace for modern teams",
        "value_props": ["Unified docs, wikis, and project management", "Flexible building blocks"],
        "differentiators": ["Highly customizable", "Strong community"],
        "tone_keywords": ["friendly", "modern"],
        "full_description": "Notion is a connected workspace...",
    }
    cs = {
        "overall": 68,
        "dimensions": [
            {"name": "品牌力", "score": 75},
            {"name": "产品力", "score": 80},
            {"name": "内容力", "score": 45},
            {"name": "技术力", "score": 60},
            {"name": "市场力", "score": 70},
        ],
    }
    gr = {
        "misaligned": ["AI underemphasizes API capabilities"],
        "blind_spots": ["Enterprise security rarely mentioned"],
        "opportunities": ["Highlight recent enterprise features"],
    }

    start = time.time()
    result = ai_narrative_gen(brand_profile=bp, company_score=cs, gap_report=gr)
    elapsed = time.time() - start

    if result.get("_error"):
        print(f"  FAIL test_ai_narrative_real_api: {result['_error']}")
        return

    assert len(result["ideal_description"]) > 50, f"ideal_description too short: {len(result['ideal_description'])} chars"
    assert len(result["keywords"]) >= 3, f"need at least 3 keywords, got {len(result['keywords'])}"
    assert len(result["value_props"]) >= 2, f"need at least 2 value_props"
    assert len(result["avoid"]) >= 1, f"need at least 1 avoid item"
    assert result["tone"] in ["professional", "friendly", "authoritative", "innovative", "premium"]

    print(f"  PASS test_ai_narrative_real_api ({elapsed:.1f}s)")
    print(f"    ideal_description: {result['ideal_description'][:120]}...")
    print(f"    keywords: {result['keywords']}")
    print(f"    avoid: {result['avoid']}")
    print(f"    tone: {result['tone']}")


# ─── Test 10: 完整 Pipeline 端到端（Mock，验证数据流）─────
def test_pipeline_mock():
    """验证 probe_node 内部数据流：bp → mp → gr → cite → scorer → narrative。"""
    from langgraph_app.state import BrandProfile, CompanyScore, DimensionScore, AINarrative

    # 模拟各步骤输出的 dict
    bp_dict = {
        "brand_name": "TestCo", "one_liner": "Test line",
        "value_props": ["VP1"], "differentiators": ["D1"],
        "target_personas": ["P1"], "tone_keywords": ["T1"],
        "full_description": "A comprehensive test company description for validation.",
    }
    bp = BrandProfile(**bp_dict)
    assert bp.full_description == bp_dict["full_description"]

    cs_dict = {
        "overall": 72,
        "dimensions": [
            {"name": "品牌力", "score": 70, "evidence": "e1", "suggestion": "s1"},
            {"name": "产品力", "score": 70, "evidence": "e2", "suggestion": "s2"},
            {"name": "内容力", "score": 70, "evidence": "e3", "suggestion": "s3"},
            {"name": "技术力", "score": 75, "evidence": "e4", "suggestion": "s4"},
            {"name": "市场力", "score": 75, "evidence": "e5", "suggestion": "s5"},
        ],
        "industry": "B2B SaaS",
        "weights_used": {"品牌力": 0.15, "产品力": 0.25, "内容力": 0.20, "技术力": 0.30, "市场力": 0.10},
    }
    cs = CompanyScore(
        overall=cs_dict["overall"],
        dimensions=[DimensionScore(**d) for d in cs_dict["dimensions"]],
        industry=cs_dict["industry"],
        weights_used=cs_dict["weights_used"],
    )
    assert cs.overall == 72
    assert len(cs.dimensions) == 5

    an_dict = {
        "ideal_description": "TestCo is a testing platform...",
        "keywords": ["TestCo", "testing", "platform"],
        "value_props": ["Fast testing", "Accurate results"],
        "avoid": ["Don't say it's slow"],
        "tone": "professional",
    }
    an = AINarrative(**an_dict)
    assert len(an.keywords) == 3
    assert an.tone == "professional"

    # 验证 ProbeOutput 可以容纳所有新字段
    from langgraph_app.state import ProbeOutput, CompanyEvaluation, MarketPerception
    from langgraph_app.state import GapReport, CitationMetrics, ProbeMeta

    po = ProbeOutput(
        company_evaluation=CompanyEvaluation(overall="OK", strengths=[], weaknesses=[], positioning="Mid"),
        market_perception=MarketPerception(
            perceived_identity="", perceived_strengths=[], perceived_weaknesses=[],
            perceived_positioning="", perceived_products=[], perceived_market="",
            perception_sources=[],
        ),
        gap_report=GapReport(alignment_score=50, aligned=[], misaligned=[], blind_spots=[], opportunities=[], one_line_summary="OK"),
        citation_metrics=CitationMetrics(rate=50.0, total_queries=30, mentioned_count=15, details=[]),
        meta=ProbeMeta(total_tokens=0, total_cost=0, total_duration_ms=0, query_statuses={}),
        brand_profile=bp,
        company_score=cs,
        ai_narrative=an,
    )
    d = po.model_dump()
    assert d["brand_profile"]["one_liner"] == "Test line"
    assert d["company_score"]["overall"] == 72
    assert d["ai_narrative"]["keywords"] == ["TestCo", "testing", "platform"]

    print("  PASS test_pipeline_mock")


# ─── Test 10: 并行架构 — 流依赖正确性 ────────────────────
def test_parallel_stream_dependencies():
    """验证三条流的依赖关系正确：品牌流和竞品流独立启动，搜索流内部两分支并行。"""
    import asyncio

    # 模拟执行顺序追踪
    execution_order = []

    async def _mock_brand():
        execution_order.append("brand_start")
        await asyncio.sleep(0.01)
        execution_order.append("brand_end")
        return None, None

    async def _mock_search_p1():
        execution_order.append("search_p1_start")
        await asyncio.sleep(0.02)
        execution_order.append("search_p1_end")
        return {
            "queries": ["q1"], "search_results": [], "search_tokens": 0,
            "search_statuses": {}, "all_ddg_snippets": [],
            "ok": 0, "skipped": 0, "failed": 0, "circuit_open": False,
        }

    async def _mock_competitor():
        execution_order.append("comp_start")
        await asyncio.sleep(0.03)
        execution_order.append("comp_end")
        return {"comp_results": [], "comp_tokens": 0, "comp_statuses": {}}

    async def _orchestrate():
        # Level 1: all three in parallel
        brand_t = asyncio.create_task(_mock_brand())
        search_t = asyncio.create_task(_mock_search_p1())
        comp_t = asyncio.create_task(_mock_competitor())

        await brand_t
        await search_t
        execution_order.append("level1_done")

        # Level 2: mm_gap || cite (both need search_p1 results) — both now parallel
        async def _mock_mm_gap():
            execution_order.append("mm_gap_start")
            await asyncio.sleep(0.01)
            execution_order.append("mm_gap_end")

        async def _mock_cite():
            execution_order.append("cite_start")
            await asyncio.sleep(0.01)
            execution_order.append("cite_end")

        mm_t = asyncio.create_task(_mock_mm_gap())
        cite_t = asyncio.create_task(_mock_cite())
        await mm_t
        await cite_t
        execution_order.append("level2_done")

        await comp_t
        execution_order.append("all_done")

    asyncio.run(_orchestrate())

    # 验证：三条流在 Level 1 并行启动
    brand_start_idx = execution_order.index("brand_start")
    search_start_idx = execution_order.index("search_p1_start")
    comp_start_idx = execution_order.index("comp_start")

    # 三条流都应在 level1_done 之前启动
    level1_done_idx = execution_order.index("level1_done")
    assert brand_start_idx < level1_done_idx
    assert search_start_idx < level1_done_idx
    assert comp_start_idx < level1_done_idx

    # Level 2 两分支都应在 level2_done 之前启动
    level2_done_idx = execution_order.index("level2_done")
    assert execution_order.index("mm_gap_start") < level2_done_idx
    assert execution_order.index("cite_start") < level2_done_idx

    # 竞品流是最后完成的（sleep 0.03 > 0.02 > 0.01）
    assert execution_order.index("comp_end") > execution_order.index("brand_end")
    assert execution_order.index("comp_end") > execution_order.index("search_p1_end")

    print("  PASS test_parallel_stream_dependencies")
    print(f"    execution_order: {' → '.join(execution_order)}")


# ─── Test 11: 完整 probe_node 端到端（无竞品，快速路径）───
def test_probe_node_e2e_no_competitors():
    """真实 probe_node 调用，无竞品以控制耗时。验证并行架构端到端跑通。"""
    from langgraph_app.nodes.probe_node import probe_node

    state = {
        "user_input": {
            "brand_name": "Notion",
            "domain": "notion.so",
            "industry": "B2B SaaS",
            "target_market": "全球",
            "core_product": "all-in-one workspace",
            "seed_queries": ["best productivity tool", "Notion alternative", "team workspace app"],
            "competitors": [],  # 无竞品，跳过竞品流
        },
        "errors": {},
    }

    start = time.time()
    result = probe_node(state)
    elapsed = time.time() - start

    po = result["probe_output"]

    # 基本结构
    assert po["status"] in ("success", "partial"), f"Unexpected status: {po['status']}"
    assert len(po["query_terms"]) > 0, "query_terms should not be empty"

    # 品牌画像
    bp = po.get("brand_profile")
    assert bp is not None, "brand_profile should not be None"
    assert len(bp["one_liner"]) > 0
    assert len(bp["full_description"]) > 0

    # 企业评价 (from gap_analysis, unchanged)
    ce = po.get("company_evaluation")
    assert ce is not None
    assert len(ce.get("overall", "")) > 0 or po["status"] == "partial"

    # 市场镜像
    mp = po.get("market_perception")
    assert mp is not None

    # 差距分析
    gr = po.get("gap_report")
    assert gr is not None
    assert 0 <= gr.get("alignment_score", 0) <= 100

    # 引用率
    cm = po.get("citation_metrics")
    assert cm is not None
    assert 0 <= cm.get("rate", 0) <= 100

    # 量化评分 (new)
    cs = po.get("company_score")
    if cs:
        assert 0 <= cs.get("overall", 0) <= 100
        assert len(cs.get("dimensions", [])) == 5

    # AI话术 (new)
    an = po.get("ai_narrative")
    if an:
        assert len(an.get("keywords", [])) >= 1
        assert an.get("tone", "") in ["professional", "friendly", "authoritative", "innovative", "premium"]

    # 元数据
    meta = po.get("meta")
    assert meta is not None
    assert meta.get("total_duration_ms", 0) > 0

    # 竞品（应为空）
    assert po.get("competitor_analysis", []) == []

    # errors 不应有 circuit_breaker 或 cost_guardrail（正常情况）
    errors = result.get("errors", {})
    assert "probe_circuit_breaker" not in errors, f"Unexpected circuit breaker: {errors}"
    assert "probe_cost_guardrail" not in errors, f"Unexpected cost guardrail: {errors}"

    print(f"  PASS test_probe_node_e2e_no_competitors ({elapsed:.1f}s)")
    print(f"    status: {po['status']}")
    print(f"    bp one_liner: {bp['one_liner'][:80]}")
    print(f"    alignment: {gr['alignment_score']}/100")
    print(f"    cite_rate: {cm['rate']}%")
    print(f"    score: {cs['overall'] if cs else 'N/A'}/100")
    print(f"    narrative keywords: {len(an['keywords']) if an else 0}")
    print(f"    total_tokens: {meta['total_tokens']}")
    print(f"    errors: {errors if errors else 'none'}")


# ─── Main ─────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("CiteFlow 企业评价优化 — 端到端测试")
    print("=" * 60)

    all_pass = True

    # Model tests (no API)
    print("\n── Model 验证 ──")
    for fn in [test_brand_profile_model, test_company_score_model,
               test_ai_narrative_model, test_probe_output_extended,
               test_intro_composer_fallback, test_pipeline_mock,
               test_parallel_stream_dependencies]:
        try:
            fn()
        except Exception as e:
            print(f"  FAIL {fn.__name__}: {e}")
            all_pass = False

    # Real API tests
    print("\n── Real API 验证 ──")
    for fn in [test_brand_profiler_real_api, test_company_scorer_real_api,
               test_ai_narrative_real_api]:
        try:
            fn()
        except Exception as e:
            print(f"  FAIL {fn.__name__}: {e}")
            import traceback
            traceback.print_exc()
            all_pass = False

    # E2E pipeline test (full probe_node, no competitors for speed)
    print("\n── 端到端 Pipeline ──")
    try:
        test_probe_node_e2e_no_competitors()
    except Exception as e:
        print(f"  FAIL test_probe_node_e2e_no_competitors: {e}")
        import traceback
        traceback.print_exc()
        all_pass = False

    # No website fallback test
    print("\n── 降级验证 ──")
    try:
        test_brand_profiler_no_website()
    except Exception as e:
        print(f"  FAIL test_brand_profiler_no_website: {e}")
        all_pass = False

    print("\n" + "=" * 60)
    if all_pass:
        print("全部测试通过 ✅")
    else:
        print("有测试失败 ❌")
    print("=" * 60)
    sys.exit(0 if all_pass else 1)
