# TASK_PROBE_LIGHT_MODE.md — Probe 轻量模式（免费钩子）

> 药老出品 · 2026-05-14
> 目标: Probe 支持 light/full 两种模式，light 模式只跑3个核心模块，成本控制在 ¥2-5
> 预计工时: 1.5h

---

## 背景

产品分三阶段收费：
- 阶段一 ¥50：单次 Probe（light 模式，免费钩子）
- 阶段二 ¥300：Probe + Analyst + Doctor 全链路（full 模式）
- 阶段三 ¥600/月：全链路 + 月度监控

**当前任务**：先让 Probe 支持 light/full 两种模式。前端权限控制后续再做。

## 设计决策

### light 模式输出（3个焦虑模块）

| # | 模块 | 给用户看 | 锁住 |
|---|------|----------|------|
| 1 | company_score | 总评分 /100 | 各维度明细 |
| 2 | citation_metrics | A类引用率 + 推荐率 + TOP1率 | B/C类细分、引用源分布、查询详情 |
| 3 | 竞品提及摘要 | 搜索结果中出现的品牌排名（只给名字+提及次数） | 维度级评分、胜出原因、详细对比 |

**注意**：竞品提及摘要是从 A 类查询的搜索结果中直接提取品牌名字和出现频次，不需要跑完整竞品流（零额外 LLM 成本）。不是 competitor_analysis 模块的完整输出。

### light 模式跳过的模块

- ❌ market_perception（AI眼中的你）
- ❌ gap_report（自述vs认知差距）
- ❌ source_authority（引用源权威分析）
- ❌ ai_narrative（AI理想叙事）
- ❌ engine_results（多引擎对比）
- ❌ company_evaluation（综合评估）

### light 模式搜索限制

- 只跑 A 类查询（行业通用），不跑 B/C 类
- A 类查询数量限制：最多 10 个（full 模式通常 20-30 个）
- 不跑多引擎（只用 GPT，不用 Gemini/Haiku/DeepSeek）
- 竞品流：跑精简版（1-2 个竞品查询，只给排名不给维度详情）

### 成本预估

| 项目 | full 模式 | light 模式 |
|------|-----------|------------|
| GPT 调用 | 60-120 次 | 15-25 次 |
| Serper 搜索 | 65-130 次 | 15-30 次 |
| 预估成本 | ¥5-15 | ¥2-5 |

---

## 任务清单

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | probe_node 支持 mode 参数 | probe_node.py | 30min |
| 2 | company_scorer 兼容缺失数据 | company_scorer.py | 15min |
| 3 | api.py 支持 light/full | api.py | 15min |
| 4 | 测试验证 | 测试脚本 | 15min |

**完成标准**: `POST /api/scan {"mode": "light", ...}` 返回3个核心模块数据，跳过6个模块，耗时 < 60秒。

---

## 任务1: probe_node 支持 mode 参数

### 问题
当前 probe_node 跑全部10个模块，没有 mode 区分。需要加一个 mode 参数，light 模式跳过6个模块。

### 需要改的文件
`langgraph_app/nodes/probe_node.py`

### 实现要求

#### 1.1 入口函数加 mode 参数

```python
def probe_node(state: dict) -> dict:
    """Probe 管道入口。同步封装，内部异步编排。"""
    return _run_async(_probe_core(state))


async def _probe_core(state: dict) -> dict:
    global _task_id
    ui = state["user_input"]
    mode = ui.get("mode", "full")  # 新增：读取 mode，默认 full
    # ... 后续根据 mode 决定跳过哪些模块
```

#### 1.2 light 模式跳过 Level 2 的 market_mirror + gap_analysis

在 `_probe_core` 中，当 `mode == "light"` 时：

```python
# Level 2: 搜索流 Phase 2
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

    if search_timed_out:
        # light + 搜索超时：cite 也跳过，所有指标归零
        cite_details = []
        citation_metrics = CitationMetrics(rate=0.0, total_queries=0, mentioned_count=0, details=[],
                                           industry_count=0, brand_count=0, competitor_count=0,
                                           recommendation_rate=0.0, recommended_count=0, top_rate=0.0, top_count=0)
        source_authority = None
        cite_error = None
        cite_rate = 0.0
        cite_task = None
    else:
        # citation 仍然要跑，传 mode="light" 跳过 source_authority 和 competitor_citation
        cite_task = None if _done("probe_cite") else asyncio.create_task(
            _stream_cite(queries, classified_queries, search_results, ui, mode="light"))
else:
    # full 模式：现有逻辑不变
    ...
```

#### 1.3 light 模式跳过 Level 3 的 ai_narrative

当 `mode == "light"` 时：

```python
if mode == "light":
    # company_scorer 仍然要跑（依赖降级后的 market_perception 和 gap_report）
    # 但 ai_narrative 跳过
    if not _done("probe_scorer_narrative"):
        try:
            cs, _, score_error, _ = await asyncio.wait_for(
                _stream_scorer_narrative_light(bp, mp, gr, citation_metrics, ui, effective_industry),
                timeout=TIMEOUT_SCORER)
        except asyncio.TimeoutError:
            cs = None
            score_error = f"超时 ({TIMEOUT_SCORER}s)"
    an = None  # light 模式不跑 ai_narrative
    narrative_error = None
```

新增 `_stream_scorer_narrative_light` 函数（只跑 scorer，不跑 narrative）：

```python
async def _stream_scorer_light(bp, mp, gr, citation_metrics, ui, effective_industry):
    """light 模式：只跑 company_scorer，不跑 ai_narrative。"""
    cs = None
    score_error = None
    try:
        cs_result = company_scorer(
            brand_profile=bp.model_dump() if bp else {},
            market_perception=mp,
            citation_rate=citation_metrics.rate,
            gap_report=gr,
            industry=effective_industry,
            recommendation_rate=citation_metrics.recommendation_rate,
        )
        cs = CompanyScore(**cs_result)
    except Exception as e:
        score_error = f"company_scorer 失败: {e}"
    return cs, None, score_error, None
```

light 模式调用处（checkpoint key 用 "probe_scorer_light"）：

```python
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
        else:
            if not score_error:
                _save("probe_scorer_light", {
                    "cs": cs.model_dump() if cs else None,
                })
    elif _done("probe_scorer_light"):
        sd = ck["probe_scorer_light"]["data"]
        cs = CompanyScore(**sd["cs"]) if sd["cs"] else None
```

#### 1.4 light 模式跳过完整竞品流，改用搜索结果提取

当 `mode == "light"` 时，不启动完整竞品流（省 LLM 成本），改为从 A 类查询的搜索结果中提取竞品品牌名字。

**不启动完整竞品流**：

```python
# Level 1: 竞品流
if mode == "light":
    comp_task = None  # light 模式跳过完整竞品流
else:
    comp_task = None if _done("probe_competitor") else asyncio.create_task(_stream_competitor(ui))
```

**等竞品流的代码也需要跳过**：

```python
# Level 4: 等竞品流
if mode == "light":
    comp_results = []
    comp_tokens = 0
    comp_statuses = {}
elif comp_task:
    # ... 现有逻辑
```

**从搜索结果中提取竞品摘要**（在 cite 流完成后执行）：

新增函数 `_extract_competitor_mentions`，用 Haiku 从 GPT 回复中提取品牌名字和出现频次：

```python
async def _extract_competitor_mentions(search_results: list, brand_name: str, domain: str, top_n: int = 5) -> list[dict]:
    """用 Haiku 从搜索结果中提取被提及的竞品品牌。
    
    理由（见 TASK 评审结论）：
    1. 正则误报率太高（Reddit/YouTube/Amazon 会被当成品牌），免费报告看起来不专业
    2. Haiku 成本 ~¥0.03，相比 Probe ¥2-5 可忽略
    3. 免费报告是付费钩子，第一印象不能脏
    
    Returns: [{"brand": "Casetify", "mention_count": 12}, {"brand": "Pela", "mention_count": 5}]
    """
    from langgraph_app.tools.engines.chatgpt_api import call_api
    from langgraph_app.config import CLAUDE_HAIKU_CONFIG
    
    # 拼接所有搜索结果的 GPT 回复
    combined_text = ""
    for sr in search_results:
        if not sr or isinstance(sr, Exception):
            continue
        answer = sr.get("answer", "")
        if answer:
            combined_text += answer + "\n---\n"
    
    if not combined_text.strip():
        return []
    
    prompt = f"""Extract brand/company names mentioned in the search results below.
Exclude the brand being analyzed: "{brand_name}"
Only extract real company/brand names, NOT: website names (Reddit, YouTube, Google), 
generic terms, or common nouns.
Return a JSON array sorted by mention frequency, max {top_n} items:
[{{"brand": "BrandName", "mention_count": N}}]

Rules:
- Count actual mentions of each brand across all search results
- Merge different spellings of the same brand (e.g. "Casetify" / "CASETiFY")
- Only include brands with >= 2 mentions
- If no competitor brands found, return empty array []

Search results:
{combined_text[:15000]}"""  # 截断避免超 token 限制

    messages = [{"role": "user", "content": prompt}]
    
    try:
        resp = call_api(messages, CLAUDE_HAIKU_CONFIG, temperature=0.1)
        content = resp["choices"][0]["message"]["content"]
        import json
        # 容错：可能包裹在 ```json 中
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
```

在 light 模式汇总阶段调用（注意是 async 函数，需要在 _probe_core 中 await）：

```python
if mode == "light":
    competitor_mentions = await _extract_competitor_mentions(
        search_results, ui.get("brand_name", ""), ui.get("domain", ""))
else:
    competitor_mentions = []
```

#### 1.5 light 模式跳过多引擎流

当 `mode == "light"` 时，不启动多引擎流：

```python
# Level 1: 多引擎流
multi_engine_task = None
if mode == "light":
    pass  # light 模式跳过
elif ENABLE_MULTI_ENGINE and not _done("probe_multi_engine"):
    multi_engine_task = asyncio.create_task(_stream_multi_engine_search(ui, query_categories))
```

#### 1.6 light 模式限制 A 类查询数量

在查询扩展后，light 模式只保留前 10 个 A 类查询：

```python
# 查询扩展后
if mode == "light":
    # 只保留 A 类查询（industry），最多 10 个
    a_class_queries = [q for q in expanded_queries 
                       if isinstance(q, dict) and q.get("category") == "industry"]
    expanded_queries = a_class_queries[:10]
    expanded_query_strs = [q["query"] for q in expanded_queries]
    bc_query_strs = expanded_query_strs  # light 模式直接用 A 类查询跑搜索流
else:
    # 现有逻辑（根据 ENABLE_MULTI_ENGINE 决定 bc_query_strs）
    ...
```

#### 1.7 light 模式搜索流只跑 A 类

在 light 模式下，搜索流只跑 A 类查询（不区分多引擎）：

```python
if mode == "light":
    search_task = None if _done("probe_search_p1") else asyncio.create_task(
        _stream_search_phase1(ui, expanded_query_strs))  # 用全部 A 类查询
```

#### 1.8 light 模式跳过 source_authority + competitor_citation

在 cite 流中，light 模式不跑 source_authority 和 competitor_citation 提取。

修改 `_stream_cite` 函数签名（第769行），加 `mode` 参数：

```python
async def _stream_cite(queries: list[str], classified_queries: list[dict],
                        search_results: list, ui: dict, mode: str = "full") -> tuple:
```

在函数内部，source_authority 部分（第864-868行）改为：

```python
    sa = None
    if mode == "full":
        try:
            sa_data = source_authority_analyze([d.model_dump() for d in cite_details], brand_domain=ui.get("domain", ""))
            sa = SourceAuthorityReport(**sa_data)
        except Exception as e:
            logger.log(f"source_authority failed: {e}", "warn")
```

competitor_citation 提取（第860-861行）也跳过：

```python
    competitor_citation_detail = {}
    if mode == "full":
        competitor_citation_detail = extract_competitor_citations(
            search_results, ui.get("competitors", []), len(cite_details))
```

同步更新调用处（第312行）：

```python
# 原来：
cite_task = None if _done("probe_cite") else asyncio.create_task(
    _stream_cite(queries, classified_queries, search_results, ui))

# 改为：
cite_task = None if _done("probe_cite") else asyncio.create_task(
    _stream_cite(queries, classified_queries, search_results, ui, mode=mode))
```

#### 1.9 汇总阶段处理 light 模式

在 ProbeOutput 构建时，light 模式的跳过字段用 None：

```python
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

# light 模式额外输出竞品提及摘要（不存入 ProbeOutput，直接放在返回 dict 中）
if mode == "light":
    competitor_mentions = _extract_competitor_mentions(search_results, ui.get("brand_name", ""))
else:
    competitor_mentions = []

# 返回 dict 需要加上 _competitor_mentions
return {
    **state,
    "probe_output": probe_output.model_dump(),
    "probe_meta": meta.model_dump(),
    "errors": errors,
    "checkpoint": ck,
    "_competitor_mentions": competitor_mentions,  # 新增
}
```

#### 1.10 日志区分模式

```python
logger.log(f"[{mode.upper()}] Done in {elapsed_ms}ms | cite_rate={cite_rate:.1f}% | "
           f"score={cs.overall if cs else 'N/A'}/100 | tokens={total_tokens}")
```

---

## 任务2: company_scorer 兼容缺失数据

### 问题
`company_scorer.score()` 需要 market_perception 和 gap_report 参数。light 模式下这两个数据为空 dict，需要确保 LLM prompt 不会因此产生垃圾输出。

### 需要改的文件
`langgraph_app/tools/company_scorer.py`

### 实现要求

修改 `score()` 函数的 prompt 构建逻辑，当 market_perception 或 gap_report 为空时，跳过对应段落：

```python
def score(brand_profile: dict, market_perception: dict,
          citation_rate: float, gap_report: dict, industry: str,
          recommendation_rate: float = 0.0) -> dict:
    """5 维度量化评分。返回 CompanyScore dict。"""
    weights = INDUSTRY_WEIGHTS.get(industry, DEFAULT_WEIGHTS)

    prompt = (
        f"Score this company on 5 dimensions (0-100) based on the data below.\n\n"
        f"=== BRAND PROFILE ===\n"
        f"{json.dumps(brand_profile, ensure_ascii=False)}\n\n"
    )

    # market_perception：空时跳过
    if market_perception and any(market_perception.values()):
        prompt += (
            f"=== AI MARKET PERCEPTION ===\n"
            f"{json.dumps(market_perception, ensure_ascii=False)}\n\n"
        )
    else:
        prompt += "=== AI MARKET PERCEPTION ===\n暂无数据（免费体检未包含此模块）\n\n"

    prompt += (
        f"=== CITATION DATA ===\n"
        f"引用率: {citation_rate}%（品牌被 AI 提及的频率）\n"
        f"推荐率: {recommendation_rate}%（提及中 AI 真正推荐品牌的比例）\n\n"
    )

    # gap_report：空时跳过（用 misaligned/blind_spots 是否非空判断，避免 alignment_score=0 误杀）
    if gap_report and (gap_report.get("misaligned") or gap_report.get("blind_spots")):
        prompt += (
            f"=== GAP ANALYSIS ===\n"
            f"对齐度: {gap_report.get('alignment_score', 0)}/100\n"
            f"偏差领域: {', '.join(gap_report.get('misaligned', [])) or '无'}\n"
            f"盲点: {', '.join(gap_report.get('blind_spots', [])) or '无'}\n\n"
        )
    else:
        prompt += "=== GAP ANALYSIS ===\n暂无数据（免费体检未包含此模块）\n\n"

    # ... 后续 prompt 不变
```

### 验证方法
- 测试1: 传入空 market_perception `{}` 和空 gap_report `{}` → 应该正常返回 CompanyScore
- 测试2: 传入完整数据 → 行为不变（向后兼容）

---

## 任务3: api.py 支持 light/full

### 问题
/api/scan 当前只有一种模式。需要支持 mode 参数，light 模式只跑 Probe，full 模式跑全部。

### 需要改的文件
`api.py`

### 实现要求

#### 3.1 ProbeRequest 加 mode 字段

```python
class ProbeRequest(BaseModel):
    domain: str
    brand_name: str
    industry: str = ""
    target_market: str = ""
    core_product: str = ""
    seed_queries: list[str] = []
    competitors: list[str] = []
    mode: str = "full"  # 新增："light" 或 "full"
```

#### 3.2 /api/scan 根据 mode 分支

```python
@app.post("/api/scan")
async def run_full_scan(
    req: ProbeRequest,
    credentials: HTTPAuthorizationCredentials = Security(HTTPBearer(auto_error=False)),
):
    """体检：light 模式只跑 Probe，full 模式跑 Probe→Analyst→Doctor。"""
    current_user = None
    if credentials:
        try:
            current_user = decode_access_token(credentials.credentials)
        except HTTPException:
            pass

    from langgraph_app.nodes.probe_node import probe_node
    
    state = {
        "user_input": {
            "domain": req.domain,
            "brand_name": req.brand_name,
            "industry": req.industry,
            "target_market": req.target_market,
            "core_product": req.core_product,
            "seed_queries": req.seed_queries,
            "competitors": req.competitors,
            "mode": req.mode,  # 传入 mode
        }
    }

    try:
        probe_start = time.time()
        probe_result = probe_node(state)
        probe_elapsed = time.time() - probe_start
        probe_output = probe_result.get("probe_output", {})

        if probe_output.get("status") == "error":
            return {
                "status": "error",
                "stage": "probe",
                "error": probe_output.get("error"),
                "probe_elapsed": round(probe_elapsed, 1),
            }
        cite_metrics = probe_output.get("citation_metrics", {})
        cs = probe_output.get("company_score", {})
        bp = probe_output.get("brand_profile", {})
        competitor_mentions = probe_result.get("_competitor_mentions", [])  # light 模式竞品摘要

        # ── light 模式：只返回 Probe 数据 ──
        if req.mode == "light":
            return {
                "status": "success",
                "mode": "light",
                "probe": {
                    "brand_profile": bp,
                    "company_score": {
                        "overall": cs.get("overall", 0) if cs else 0,
                    },
                    "citation_metrics": {
                        "rate": cite_metrics.get("rate", 0),
                        "industry_rate": cite_metrics.get("industry_rate", 0),
                        "recommendation_rate": cite_metrics.get("recommendation_rate", 0),
                        "top_rate": cite_metrics.get("top_rate", 0),
                    },
                    "competitor_mentions": competitor_mentions,
                    "elapsed": round(probe_elapsed, 1),
                },
                "total_elapsed": round(probe_elapsed, 1),
            }

        # ── full 模式：跑 Analyst + Doctor ──
        from langgraph_app.nodes.analyst_node import analyst_node
        from langgraph_app.nodes.doctor_node import doctor_node

        analyst_start = time.time()
        analyst_result = analyst_node({"probe_output": probe_output})
        analyst_elapsed = time.time() - analyst_start
        analyst_output = analyst_result.get("analyst_output", {})

        if analyst_output.get("status") != "success":
            return {
                "status": "error",
                "stage": "analyst",
                "error": analyst_output.get("error"),
                "probe_elapsed": round(probe_elapsed, 1),
                "analyst_elapsed": round(analyst_elapsed, 1),
            }

        doctor_start = time.time()
        doctor_result = doctor_node({
            "user_input": state["user_input"],
            "analyst_output": analyst_output,
            "probe_output": probe_output,
        })
        doctor_elapsed = time.time() - doctor_start
        doctor_output = doctor_result.get("doctor_output", {})

        return {
            "status": doctor_output.get("status", "success"),
            "mode": "full",
            "probe": {
                "citation_metrics": {
                    "rate": cite_metrics.get("rate"),
                    "brand_rate": cite_metrics.get("brand_rate"),
                    "industry_rate": cite_metrics.get("industry_rate"),
                    "competitor_scenario_rate": cite_metrics.get("competitor_scenario_rate"),
                    "recommendation_rate": cite_metrics.get("recommendation_rate"),
                },
                "engines_queried": probe_output.get("engines_queried"),
                "query_terms_count": len(probe_output.get("query_terms", [])),
                "elapsed": round(probe_elapsed, 1),
            },
            "diagnosis": analyst_output.get("diagnosis"),
            "three_layer_chain": analyst_output.get("three_layer_chain"),
            "competitor_gap": analyst_output.get("competitor_gap"),
            "one_line_verdict": analyst_output.get("one_line_verdict", ""),
            "engine_comparison": analyst_output.get("engine_comparison"),
            "content_templates": analyst_output.get("content_templates"),
            "prescription": doctor_output.get("prescription", []),
            "prescription_summary": doctor_output.get("summary", ""),
            "knowledge_sources": doctor_output.get("knowledge_sources", []),
            "analyst_elapsed": round(analyst_elapsed, 1),
            "doctor_elapsed": round(doctor_elapsed, 1),
            "total_elapsed": round(probe_elapsed + analyst_elapsed + doctor_elapsed, 1),
            "error": analyst_output.get("error") or doctor_output.get("error"),
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
```

#### 3.3 /api/probe 也加 mode 支持

```python
@app.post("/api/probe")
async def run_probe(req: ProbeRequest):
    """运行 Probe：light 模式只跑3个模块，full 模式跑全部。"""
    from langgraph_app.nodes.probe_node import probe_node

    state = {
        "user_input": {
            "domain": req.domain,
            "brand_name": req.brand_name,
            "industry": req.industry,
            "target_market": req.target_market,
            "core_product": req.core_product,
            "seed_queries": req.seed_queries,
            "competitors": req.competitors,
            "mode": req.mode,  # 传入 mode
        }
    }

    try:
        result = probe_node(state)
        output = result.get("probe_output", {})
        meta = result.get("probe_meta", {})
        cite_metrics = output.get("citation_metrics", {})
        cs = output.get("company_score", {})
        
        # light 模式只返回核心字段
        if req.mode == "light":
            return {
                "status": output.get("status", "success"),
                "mode": "light",
                "company_score": {"overall": cs.get("overall", 0) if cs else 0},
                "citation_metrics": {
                    "rate": cite_metrics.get("rate", 0),
                    "industry_rate": cite_metrics.get("industry_rate", 0),
                    "recommendation_rate": cite_metrics.get("recommendation_rate", 0),
                    "top_rate": cite_metrics.get("top_rate", 0),
                },
                "brand_profile": output.get("brand_profile"),
                "meta": meta,
                "error": output.get("error"),
            }
        
        # full 模式返回全部
        return {
            "status": output.get("status", "success"),
            "mode": "full",
            "company_evaluation": output.get("company_evaluation"),
            "market_perception": output.get("market_perception"),
            "gap_report": output.get("gap_report"),
            "citation_metrics": {
                "rate": cite_metrics.get("rate", 0),
                "total_queries": cite_metrics.get("total_queries", 0),
                "mentioned_count": cite_metrics.get("mentioned_count", 0),
                "brand_rate": cite_metrics.get("brand_rate"),
                "industry_rate": cite_metrics.get("industry_rate"),
                "competitor_scenario_rate": cite_metrics.get("competitor_scenario_rate"),
                "recommendation_rate": cite_metrics.get("recommendation_rate"),
            },
            "citation_details": cite_metrics.get("details", []),
            "competitor_analysis": output.get("competitor_analysis", []),
            "engines_queried": output.get("engines_queried", []),
            "query_terms": output.get("query_terms", []),
            "company_score": cs,
            "brand_profile": output.get("brand_profile"),
            "meta": meta,
            "error": output.get("error"),
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}
```

---

## 任务4: 测试验证

### 测试1: light 模式 Probe

```bash
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "yeswelder.com",
    "brand_name": "YesWelder",
    "industry": "DTC品牌",
    "target_market": "北美",
    "core_product": "焊接设备",
    "seed_queries": ["best welding brand", "top welder manufacturers"],
    "mode": "light"
  }'
```

**预期结果**:
- `status`: "success"
- `mode`: "light"
- `probe.company_score.overall`: > 0
- `probe.citation_metrics.industry_rate`: >= 0
- `probe.citation_metrics.recommendation_rate`: >= 0
- `probe.competitor_mentions`: 数组，每项有 `brand` 和 `mention_count`
- 耗时 < 60 秒
- 无 `diagnosis`、`prescription` 字段（light 模式不跑 Analyst/Doctor）

### 测试2: full 模式向后兼容

```bash
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "yeswelder.com",
    "brand_name": "YesWelder",
    "industry": "DTC品牌",
    "target_market": "北美",
    "core_product": "焊接设备",
    "seed_queries": ["best welding brand"],
    "mode": "full"
  }'
```

**预期结果**:
- `mode`: "full"
- 有 `diagnosis`、`prescription` 字段
- 行为与改动前完全一致

### 测试3: 不传 mode 默认 full

```bash
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "yeswelder.com",
    "brand_name": "YesWelder",
    "industry": "DTC品牌",
    "seed_queries": ["best welding brand"]
  }'
```

**预期结果**: 默认 full 模式，行为不变。

### 测试4: company_scorer 空数据兼容

```bash
# 在 Python 中直接调用
from langgraph_app.tools.company_scorer import score
result = score(
    brand_profile={"brand_name": "Test", "one_liner": "Test brand"},
    market_perception={},
    citation_rate=15.0,
    gap_report={},
    industry="DTC品牌",
    recommendation_rate=5.0,
)
print(result)  # 应该返回有效的 CompanyScore dict
```

---

## state.py 改动汇总

无改动。mode 通过 user_input dict 传递，不需要修改 State TypedDict。

---

## CHECKLIST 自检

**任务1 probe_node mode 支持:**
- [ ] `probe_node` 读取 `ui.get("mode", "full")`
- [ ] light 模式跳过 market_mirror + gap_analysis
- [ ] light 模式跳过 ai_narrative
- [ ] light 模式跳过完整竞品流
- [ ] light 模式从搜索结果提取 competitor_mentions（_extract_competitor_mentions，用 Haiku 非 regex）
- [ ] light 模式跳过多引擎流
- [ ] light 模式跳过 source_authority 和 competitor_citation
- [ ] light 模式限制 A 类查询 ≤ 10 个
- [ ] light 模式不跑 B/C 类查询
- [ ] light 模式处理 search_timed_out 场景
- [ ] _stream_cite 调用处传 mode="light"
- [ ] checkpoint key 用 "probe_scorer_light"（不是 "probe_scorer_narrative"）
- [ ] 返回 dict 包含 _competitor_mentions
- [ ] full 模式行为完全不变

**任务2 company_scorer 兼容:**
- [ ] 空 market_perception 不报错
- [ ] 空 gap_report 不报错
- [ ] 完整数据时行为不变

**任务3 api.py:**
- [ ] ProbeRequest 有 mode 字段，默认 "full"
- [ ] /api/scan light 模式只返回 probe 数据
- [ ] /api/scan full 模式返回全部（probe+analyst+doctor）
- [ ] /api/probe 支持 mode
- [ ] 返回 JSON 包含 "mode" 字段

**任务4 测试:**
- [ ] light 模式 Probe 正常返回
- [ ] full 模式向后兼容
- [ ] 不传 mode 默认 full
- [ ] company_scorer 空数据兼容

---

## 交付格式

```
自检结果: X/9 任务1 + X/3 任务2 + X/5 任务3 + X/4 任务4 = XX/21
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改 State TypedDict** — mode 通过 user_input dict 传递
2. **不要改 Analyst/Doctor 节点** — 这次只改 Probe + API
3. **不要改前端** — 前端权限控制是下一步
4. **向后兼容** — 不传 mode 时行为与改动前完全一致
5. **_stream_cite 函数签名变更** — 加 mode 参数，需要同步更新所有调用处
6. **竞品流的"精简版"已做** — light 模式用 Haiku 从搜索结果提取品牌名（非 regex），零完整竞品流成本
