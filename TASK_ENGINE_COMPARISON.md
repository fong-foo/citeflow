# TASK_ENGINE_COMPARISON.md — 引擎差异分析（v4）

> 药老出品 · 2026-05-07（v4 — 修复海老5个问题 + 采纳查询词分配建议）
> 目标: 三引擎搜索后，分析 GPT/Gemini/Claude Haiku 的引用差异，给出针对性建议
> 模型: GPT-4o / Gemini 3.1 Flash Lite Preview / Claude Haiku 4.5（均已验证FC兼容）
> 预计工时: 6h

---

## 问题描述

**当前状态：**
- 只有 GPT 一个引擎搜索
- 无法知道不同 AI 引擎对品牌的引用差异
- 无法针对性优化不同引擎

**目标状态：**
- 三引擎搜索（GPT + Gemini + Claude Haiku）
- 分析引擎间的引用差异
- 给出针对性优化建议
- 已确认模型: openai/gpt-4o, gemini-3.1-flash-lite-preview, anthropic/claude-haiku-4.5（全部支持FC）

---

## 查询词分配方案（采纳海老建议）

**同一份查询词，三个引擎都跑：**

```
10个A类查询词（行业通用）
├── GPT: 跑这10个查询词
├── Gemini: 跑这10个查询词
└── Haiku: 跑这10个查询词

多出20次合成调用（Gemini×10 + Haiku×10），但结论站得住
```

**为什么只看A类：**
- A类（行业通用）：测引用率（industry_rate）— 真正有价值
- B类（品牌直接）：引用率必然100%，不可比
- C类（竞品主导）：引用率可能虚高，不可比

---

## 海老5个问题与解决方案

### 问题1：fc_search.search() 签名变更不兼容

**解决方案：不改现有 search()，新增 search_multi_engine()**

```python
# 保留现有函数（兼容）
def search(query: str, brand_name: str, brand_domain: str) -> dict:
    """单查询搜索（现有）"""
    ...

# 新增多引擎函数
async def search_multi_engine(queries: list[str], engines: list[str]) -> dict[str, list[dict]]:
    """多引擎搜索（新增）"""
    ...
```

- 现有调用点不用改
- 新功能用新函数

### 问题2：多引擎结果怎么喂给下游模块？

**解决方案：多引擎结果单独处理，不影响现有流**

```
现有流（不变）：
fc_search.search() ×30 → market_mirror → gap_analysis → citation_analyzer → ...

新增流（并行）：
search_multi_engine(10个A类查询) → 每个引擎的答案 → citation_analyzer → engine_results
```

- market_mirror、gap_analysis 等模块继续用现有流的答案
- 多引擎结果只用于 engine_results，不影响现有模块

### 问题3："替代现有流"还是"新增并行流"

**解决方案：新增并行流，不是替代**

```
probe_node 里：
1. 现有流（不变）：fc_search.search() ×30 → 下游模块
2. 新增流（并行）：search_multi_engine(10个A类查询) → engine_results
```

- 现有代码不用改
- 新增一个条件分支

### 问题4：_is_a_class_query 太脆弱

**解决方案：用 query_expander 的 query_category 字段**

```python
# 不用硬编码品牌名，直接用 query_expander 输出的分类
def _is_a_class_query(query: str, query_categories: dict) -> bool:
    """判断是否是A类查询"""
    return query_categories.get(query) == "industry"
```

- 复用现有分类，不重复造轮子
- 不硬编码品牌名

### 问题5：成本分析数字不正确

**正确成本分析：**

```
现有流（不变）：
- GPT: 30 × 2 = 60 次
- DeepSeek: 45 次
- 合计: 105 次

新增流：
- Serper搜索: 10 次（10个A类查询）
- Gemini合成: 10 次
- Haiku合成: 10 次
- DeepSeek citation_analyzer: 20 次（Gemini+Haiku 各10个）
- 新增: 50 次

总成本: 105 + 50 = 155 次
```

---

## 任务概览

| # | 任务 | 文件 | 预计 | 依赖 |
|---|------|------|------|------|
| 0 | 验证 API 兼容性 | - | 30min | 无 |
| 1 | 提取共享模块 | engines/search_utils.py | 1h | 无 |
| 2 | state.py 新增引擎相关模型 | state.py | 30min | 无 |
| 3 | fc_search 新增 search_multi_engine | fc_search.py | 1.5h | 任务0,1 |
| 4 | probe_node.py 新增多引擎流 | probe_node.py | 1h | 任务3 |
| 5 | analyst_context.py 传引擎数据 | analyst_context.py | 30min | 任务4 |
| 6 | analyst_node.py 新增规则 12 | analyst_node.py | 1h | 任务5 |
| 7 | 测试验证 | - | 30min | 任务6 |

**完成标准**: 跑三引擎搜索后，Analyst 输出引擎差异分析（A类引用率差异、引用源差异、针对性建议）。

---

## 数据流设计

```
probe_node 主流程：

1. 现有流（不变）：
   fc_search.search() ×30 → market_mirror → gap_analysis → citation_analyzer → ...

2. 新增流（并行）：
   # 选择10个A类查询词
   a_class_queries = [q for q in queries if query_categories[q] == "industry"][:10]
   
   # 三引擎搜索
   engine_answers = await search_multi_engine(a_class_queries, ["gpt", "gemini", "haiku"])
   
   # 每个引擎单独做 citation_analyzer
   engine_results = {}
   for engine, answers in engine_answers.items():
       citations = [citation_analyzer.analyze(...) for answer in answers]
       engine_results[engine] = EngineResult(
           engine=engine,
           citation_rate=_calc_citation_rate(citations),
           ...
       )
   
   # 输出到 ProbeOutput.engine_results
```

---

## 任务0: 验证 API 兼容性

### 需要验证的内容

1. **model name 是否存在**
   - ✅ 已确认: gemini-3.1-flash-lite-preview 和 anthropic/claude-haiku-4.5 均可正常调用
   - 如果不存在，找正确的 model name

2. **response_format 是否支持**
   - 测试 Gemini 是否支持 response_format={"type": "json_object"}
   - 如果不支持，用正则提取 JSON

3. **API key 是否正确**
   - 验证 OPENAI_API_KEY 是否能调用 Gemini/Haiku
   - 如果不能，需要单独的 API key

### 验证方法
- 调一次 API，检查返回结果
- 记录正确的 model name 和配置

---

## 任务1: 提取共享模块

### 需要创建的文件
`langgraph_app/tools/engines/search_utils.py`

### 实现要求

```python
# search_utils.py — 搜索工具共享模块
# competitor_query_gen.py 和 fc_search.py 都引用这个模块

import asyncio
from langgraph_app.tools.engines.serper_search import search as serper_search
from langgraph_app.tools.engines.chatgpt_api import call_api


async def search_serper(query: str, num_results: int = 5) -> list[dict]:
    """Serper Google 搜索
    
    Args:
        query: 查询词
        num_results: 返回结果数量
    
    Returns:
        [{"title": str, "url": str, "snippet": str}, ...]
    """
    try:
        results = await asyncio.to_thread(serper_search, query, num_results)
        return results if isinstance(results, list) else []
    except Exception:
        return []


async def synthesize_answer(
    query: str, 
    search_results: list[dict], 
    config: dict,
) -> str:
    """基于搜索结果合成答案（不是凭空回答）
    
    Args:
        query: 查询词
        search_results: 搜索结果
        config: 引擎配置（GPT/Gemini/Haiku）
    
    Returns:
        合成的答案
    """
    # 构建搜索结果文本
    results_text = ""
    for i, result in enumerate(search_results[:5], 1):
        title = result.get("title", "")
        snippet = result.get("snippet", "")
        url = result.get("url", "")
        results_text += f"{i}. {title}\n   {snippet}\n   来源: {url}\n\n"
    
    if not results_text:
        return "搜索结果为空，无法回答"
    
    prompt = (
        f"基于以下搜索结果，回答用户的问题。"
        f"只使用搜索结果中的信息，不要添加自己的知识。"
        f"如果搜索结果中没有相关信息，说明'搜索结果中没有相关信息'。\n\n"
        f"=== 问题 ===\n{query}\n\n"
        f"=== 搜索结果 ===\n{results_text}\n\n"
        f"=== 回答要求 ===\n"
        f"1. 只使用搜索结果中的信息\n"
        f"2. 不要编造数据（如价格、保修年限、技术参数）\n"
        f"3. 如果搜索结果中没有具体数据，说明'搜索结果中未提及'\n"
        f"4. 引用来源 URL\n\n"
        f"回答:"
    )
    
    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=config,
            temperature=0.1,
        )
        return resp["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"合成答案失败: {e}"
```

### 验证方法
- 读 search_utils.py，确认 search_serper 和 synthesize_answer 函数存在
- 确认 competitor_query_gen.py 和 fc_search.py 引用这个模块

---

## 任务2: state.py 新增引擎相关模型

### 需要改的文件
`langgraph_app/state.py`

### 实现要求

```python
class EngineResult(BaseModel):
    """单个引擎的搜索结果"""
    engine: str  # "gpt" | "gemini" | "haiku"
    queries: list[str] = []  # 该引擎跑的查询词
    citation_rate: float = 0.0  # A类查询的引用率
    recommendation_rate: float = 0.0  # A类查询的推荐率
    sources: dict = {}  # {domain: count}
    competitor_analysis: list = []
    raw_data: dict = {}  # 原始数据，方便验证


class ProbeOutput(BaseModel):
    ...
    # 新增：三引擎结果
    engine_results: dict[str, EngineResult] = {}  # {"gpt": EngineResult, ...}
```

### 验证方法
- 读 state.py，确认 EngineResult 模型存在
- 确认 ProbeOutput 包含 engine_results 字段

---

## 任务3: fc_search 新增 search_multi_engine

### 需要改的文件
`langgraph_app/tools/fc_search.py`

### 实现要求

#### 3.1 新增引擎配置

```python
# config.py 新增
GEMINI_CONFIG = {
    "base_url": "https://api.ofox.ai/v1/chat/completions",
    "model": "gemini-3.1-flash-lite-preview",  # 已确认可用
    "api_key": os.environ.get("OPENAI_API_KEY", ""),  # 已验证可调用
    "timeout": 120,
    "max_retries": 3,
}

CLAUDE_HAIKU_CONFIG = {
    "base_url": "https://api.ofox.ai/v1/chat/completions",
    "model": "anthropic/claude-haiku-4.5",  # 已确认可用
    "api_key": os.environ.get("OPENAI_API_KEY", ""),  # 已验证可调用
    "timeout": 120,
    "max_retries": 3,
}

ENABLE_MULTI_ENGINE = True  # 是否启用多引擎
```

#### 3.2 新增 search_multi_engine 函数

```python
async def search_multi_engine(
    queries: list[str],
    engines: list[str] = ["gpt", "gemini", "haiku"],
) -> dict[str, list[dict]]:
    """多引擎搜索：同一份查询词，三个引擎都跑
    
    Args:
        queries: 查询词列表（10个A类查询）
        engines: 引擎列表
    
    Returns:
        {
            "gpt": [{"query": str, "answer": str, "search_results": list}, ...],
            "gemini": [...],
            "haiku": [...],
        }
    """
    results = {}
    
    # 每个引擎独立搜索 + 合成
    tasks = []
    for engine in engines:
        tasks.append(_search_single_engine(engine, queries))
    
    engine_results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for i, engine in enumerate(engines):
        if isinstance(engine_results[i], Exception):
            results[engine] = []
        else:
            results[engine] = engine_results[i]
    
    return results


async def _search_single_engine(engine: str, queries: list[str]) -> list[dict]:
    """单引擎搜索 + 合成"""
    config = _get_engine_config(engine)
    results = []
    
    semaphore = asyncio.Semaphore(3)  # 每个引擎最多3个并发
    
    async def _search_one(query):
        async with semaphore:
            # 搜索
            search_results = await search_serper(query)
            # 合成
            answer = await synthesize_answer(query, search_results, config)
            return {
                "query": query,
                "answer": answer,
                "search_results": search_results,
                "engine": engine,
            }
    
    tasks = [_search_one(q) for q in queries]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    return [r for r in results if not isinstance(r, Exception)]


def _get_engine_config(engine: str) -> dict:
    """获取引擎配置"""
    if engine == "gpt":
        return GPT_CONFIG
    elif engine == "gemini":
        return GEMINI_CONFIG
    elif engine == "haiku":
        return CLAUDE_HAIKU_CONFIG
    else:
        raise ValueError(f"Unknown engine: {engine}")
```

### 验证方法
- 读 fc_search.py，确认：
  - search_multi_engine 函数存在
  - _search_single_engine 函数存在
  - 引用 search_utils 模块
  - 现有 search() 函数不变

---

## 任务4: probe_node.py 新增多引擎流

### 需要改的文件
`langgraph_app/nodes/probe_node.py`

### 实现要求

#### 4.1 新增多引擎搜索流

```python
async def _stream_multi_engine_search(ui, queries, query_categories):
    """三引擎搜索流（新增，不影响现有流）"""
    
    # 1. 选择A类查询词
    a_class_queries = [q for q in queries if query_categories.get(q) == "industry"][:10]
    
    if not a_class_queries:
        return {}
    
    # 2. 三引擎搜索
    engine_answers = await search_multi_engine(a_class_queries, ["gpt", "gemini", "haiku"])
    
    # 3. 每个引擎单独做 citation_analyzer
    engine_results = {}
    for engine, answers in engine_answers.items():
        # 引用分析
        citations = []
        for answer in answers:
            citation = citation_analyzer.analyze(
                "citation", answer["answer"], 
                ui["brand_name"], ui["domain"]
            )
            citations.append(citation)
        
        # 汇总
        engine_results[engine] = EngineResult(
            engine=engine,
            queries=[a["query"] for a in answers],
            citation_rate=_calc_citation_rate(citations),
            recommendation_rate=_calc_recommendation_rate(citations),
            sources=_calc_sources(citations),
            competitor_analysis=[],
            raw_data={"answers": answers, "citations": citations},
        )
    
    return engine_results
```

#### 4.2 修改 probe_node 主流程（新增条件分支）

```python
async def probe_node(state):
    ...
    # 现有流（不变）
    search_results = await fc_search.search(...)  # 30个查询
    # ... 下游模块 ...
    
    # 新增流（并行）
    if ENABLE_MULTI_ENGINE:
        engine_results = await _stream_multi_engine_search(ui, queries, query_categories)
        result["engine_results"] = engine_results
    ...
```

### 验证方法
- 读 probe_node.py，确认 _stream_multi_engine_search 函数存在
- 确认只用A类查询词
- 确认现有流代码不变
- 确认输出包含 engine_results 字段

---

## 任务5: analyst_context.py 传引擎数据

### 需要改的文件
`langgraph_app/tools/analyst_context.py`

### 实现要求

```python
def build_context(probe_output: dict) -> dict:
    ...
    # 新增：引擎结果
    engine_results = probe_output.get("engine_results", {})
    
    return {
        ...
        "engine_results": {
            engine: {
                "citation_rate": result.get("citation_rate", 0),
                "recommendation_rate": result.get("recommendation_rate", 0),
                "sources": result.get("sources", {}),
                "queries": result.get("queries", []),
            }
            for engine, result in engine_results.items()
        },
    }
```

### 验证方法
- 读 analyst_context.py，确认 engine_results 字段传递

---

## 任务6: analyst_node.py 新增规则 12

### 需要改的文件
`langgraph_app/nodes/analyst_node.py`

### 实现要求

#### 6.1 新增规则 12

```python
### 规则 12: 引擎差异分析

对比 GPT、Gemini、Haiku 三个引擎的引用数据：

注意：引擎对比只看A类查询（行业通用）的引用率，三个引擎跑的是同一组查询词。

步骤 1: A类引用率差异
  - 计算三个引擎的A类引用率差异
  - 差异 > 20% → 异常，需要分析原因
  - 差异 < 10% → 一致，数据可信

步骤 2: A类推荐率差异
  - 计算三个引擎的A类推荐率差异
  - 哪个引擎最常推荐品牌？哪个引擎最不推荐？

步骤 3: 引用源差异
  - 对比三个引擎的引用源分布
  - 哪个引擎更依赖官网？哪个引擎更依赖第三方？

步骤 4: 输出洞察
  - 引擎一致性: 三个引擎数据是否一致？
  - 最佳引擎: 哪个引擎对品牌最友好？
  - 最差引擎: 哪个引擎对品牌最不友好？

步骤 5: 输出建议
  - 针对最差引擎的优化建议
  - 针对最佳引擎的保持策略

注意：
- 差异分析必须基于真实数据，不要编造
- 如果数据不足以得出结论，说明"数据不足"
- 洞察必须引用具体数字
- 三个引擎跑的是同一组查询词，差异来自引擎本身，不是查询词差异
```

#### 6.2 新增输出字段

```python
class AnalystOutput(BaseModel):
    ...
    # 新增：引擎差异分析
    engine_comparison: Optional[dict] = None  # 引擎对比数据
    engine_insights: list[str] = []  # 引擎洞察
    engine_recommendations: list[str] = []  # 引擎建议
```

#### 6.3 更新 _build_user_message

```python
def _build_user_message(ctx: dict) -> str:
    ...
    # 新增：引擎差异数据
    engine_results = ctx.get("engine_results", {})
    if engine_results:
        parts.extend([
            "",
            "=== 引擎差异数据（同一组A类查询词） ===",
            "引擎 | A类引用率 | A类推荐率 | 主要来源",
            "-" * 50,
        ])
        for engine, data in engine_results.items():
            sources = ", ".join(list(data.get("sources", {}).keys())[:3])
            parts.append(f"{engine} | {data['citation_rate']}% | {data['recommendation_rate']}% | {sources}")
    ...
```

#### 6.4 更新输出格式

```python
# 输出格式新增
{
    ...
    "engine_comparison": {
        "a_class_citation_rate": {"gpt": 80, "gemini": 70, "haiku": 60, "variance": 20},
        "a_class_recommendation_rate": {"gpt": 30, "gemini": 20, "haiku": 25, "variance": 10},
        "consistency": "high|medium|low",
        "best_engine": "gpt",
        "worst_engine": "gemini"
    },
    "engine_insights": [
        "GPT 对品牌最友好（A类引用率 80%，A类推荐率 30%）",
        "Gemini 最依赖官网（60%），需要增加第三方引用"
    ],
    "engine_recommendations": [
        "针对 Gemini: 增加 G2/Capterra 等第三方评测",
        "针对 Haiku: 增加 YouTube 视频内容",
        "针对 GPT: 保持当前策略"
    ]
}
```

### 验证方法
- 读 analyst_node.py，确认规则 12 存在
- 确认只看A类查询的引用率
- 确认 AnalystOutput 包含 engine_comparison、engine_insights、engine_recommendations

---

## 任务7: 测试验证

### 测试步骤

1. 用 YesWelder 跑三引擎搜索
2. 检查输出：
   - engine_results 是否有三个引擎的数据
   - 每个引擎的A类引用率、A类推荐率是否正确
   - engine_comparison 是否有差异分析
   - engine_insights 和 engine_recommendations 是否有内容
3. 验证数据真实性：
   - 引用率差异是计算出来的，不是 LLM 编造的
   - 三个引擎跑的是同一组查询词，差异来自引擎本身

### 预期输出

```
=== 引擎差异数据（同一组A类查询词） ===
引擎 | A类引用率 | A类推荐率 | 主要来源
--------------------------------------------------
gpt | 80% | 30% | reddit.com, yeswelder.com, youtube.com
gemini | 70% | 20% | yeswelder.com, g2.com, reddit.com
haiku | 60% | 25% | youtube.com, reddit.com, yeswelder.com

引擎差异分析:
- 引擎一致性: 中等（A类引用率差异 20%）
- 最佳引擎: GPT（A类引用率 80%，A类推荐率 30%）
- 最差引擎: Haiku（A类引用率 60%，A类推荐率 25%）

洞察:
- GPT 对品牌最友好（A类引用率 80%，A类推荐率 30%）
- Gemini 最依赖官网（60%），需要增加第三方引用
- Haiku 对品牌价格优势最认可

建议:
- 针对 Gemini: 增加 G2/Capterra 等第三方评测
- 针对 Haiku: 增加 YouTube 视频内容
- 针对 GPT: 保持当前策略
```

---

## CHECKLIST 自检

**任务0 [验证 API 兼容性]:**
- [x] model name 已验证（gemini-3.1-flash-lite-preview, anthropic/claude-haiku-4.5）
- [ ] response_format 验证（是否支持 json_object）
- [ ] API key 验证（是否能调用）

**任务1 [提取共享模块]:**
- [ ] search_utils.py 创建
- [ ] search_serper 函数实现
- [ ] synthesize_answer 函数实现
- [ ] competitor_query_gen.py 引用 search_utils
- [ ] fc_search.py 引用 search_utils

**任务2 [state.py]:**
- [ ] EngineResult 模型定义
- [ ] ProbeOutput 包含 engine_results 字段

**任务3 [fc_search.py]:**
- [ ] GEMINI_CONFIG 和 CLAUDE_HAIKU_CONFIG 配置
- [ ] search_multi_engine 函数实现
- [ ] _search_single_engine 函数实现
- [ ] 引用 search_utils 模块
- [ ] 现有 search() 函数不变

**任务4 [probe_node.py]:**
- [ ] _stream_multi_engine_search 函数实现
- [ ] 只用A类查询词
- [ ] 现有流代码不变
- [ ] 输出包含 engine_results 字段

**任务5 [analyst_context.py]:**
- [ ] engine_results 字段传递

**任务6 [analyst_node.py]:**
- [ ] 规则 12 存在
- [ ] 只看A类查询的引用率
- [ ] AnalystOutput 包含 engine_comparison、engine_insights、engine_recommendations
- [ ] _build_user_message 展示引擎差异数据

**任务7 [测试验证]:**
- [ ] 用 YesWelder 跑三引擎搜索
- [ ] engine_results 有三个引擎的数据
- [ ] engine_comparison 有差异分析
- [ ] 数据真实性验证（引用率差异是计算的，不是编造的）

---

## 交付格式

```
自检结果: X/3 任务0 + X/5 任务1 + X/2 任务2 + X/5 任务3 + X/4 任务4 + X/1 任务5 + X/4 任务6 + X/4 任务7 = XX/28
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **同一份查询词，三个引擎都跑** — 不是分配，是各跑各的
2. **只看A类查询** — B类和C类不参与引擎对比
3. **新增并行流** — 不是替代现有流
4. **现有 search() 不变** — 新增 search_multi_engine()
5. **用 query_expander 的分类** — 不硬编码品牌名
6. **成本控制** — 10个A类查询 × 3引擎 = 30次合成 + 20次 citation_analyzer
7. **并发控制** — 每个引擎最多3个并发
8. **原始数据保留** — 存在 raw_data 字段，方便验证
