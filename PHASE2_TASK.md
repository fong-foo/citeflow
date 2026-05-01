# PHASE2_TASK.md — Phase 2 任务指令：Probe 真实实现

> 药老写 · 海老执行 · 2026-05-01

---

## 目标

把 Probe 节点从 mock 换成真实实现，接入 Perplexity + ChatGPT 两个 AI 引擎，完成引用快照采集。

## 前置条件

- Phase 1 骨架已完成（19个Python文件，端到端测试通过）
- 架构修补已完成（base_node.py, validators/validator.py, 条件路由）
- Python 环境：~/Desktop/CiteFlow/.venv（langgraph/fastapi/pydantic/httpx 已安装）

## 任务清单

### 任务 1：更新 UserInput 模型

文件：`langgraph_app/state.py`

当前 UserInput 只有 4 个字段，需要改成 7 个：

```python
class UserInput(BaseModel):
    domain: str                    # 品牌官网域名
    brand_name: str                # 品牌名称（新增）
    industry: str                  # 行业：B2B SaaS / 跨境支付 / DTC品牌
    target_market: str             # 目标市场/地区（新增）
    core_product: str              # 核心产品/服务描述（新增）
    seed_queries: list[str]        # 种子查询词（新增，替代 query_terms）
    competitors: list[str] = []    # 主要竞品域名
```

同时更新 test_pipeline.py 中的 UserInput 构造。

### 任务 2：创建工具文件

创建以下目录和文件：

```
tools/
├── __init__.py                          ← 已有
├── query_expander.py                    ← 查询扩展
├── engines/
│   ├── __init__.py
│   ├── perplexity_client.py             ← Perplexity API
│   └── chatgpt_client.py                ← ChatGPT API
├── extractors/
│   ├── __init__.py
│   └── citation_extractor.py            ← 引用提取
├── classifiers/
│   ├── __init__.py
│   └── citation_classifier.py           ← 引用分类（LLM）
└── analyzers/
    ├── __init__.py
    └── competitor_analyzer.py           ← 竞品对比
```

#### 2.1 query_expander.py

```python
def expand_queries(seeds: list[str], industry: str, product: str) -> list[str]:
    """
    用LLM扩展种子查询词，生成20-30个变体。
    
    变体类型：
    · 品类变体：best running shoes → best running shoes for beginners
    · 品牌变体：加品牌名 → Nike running shoes
    · 竞品对比：加竞品 → Nike vs Adidas
    · 问题变体：转问答 → are Nike running shoes good
    · 时间变体：加年份 → best running shoes 2026
    
    返回：扩展后的查询词列表
    """
```

#### 2.2 engines/perplexity_client.py

```python
async def search(query: str) -> dict:
    """
    调用 Perplexity API 搜索查询词。
    
    API: https://api.perplexity.ai/chat/completions
    方法: POST
    Header: Authorization: Bearer {PERPLEXITY_API_KEY}
    
    请求体:
    {
        "model": "llama-3.1-sonar-small-128k-online",
        "messages": [{"role": "user", "content": query}]
    }
    
    返回：原始API响应（包含引用来源URL）
    
    错误处理：
    · 429（限流）→ 等待5秒重试，最多3次
    · 超时（30秒）→ 返回 error
    · 其他错误 → 返回 error
    """
```

#### 2.3 engines/chatgpt_client.py

```python
async def search(query: str) -> dict:
    """
    调用 ChatGPT API 搜索查询词。
    
    API: https://api.openai.com/v1/chat/completions
    方法: POST
    Header: Authorization: Bearer {OPENAI_API_KEY}
    
    请求体:
    {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "搜索并返回引用来源URL"},
            {"role": "user", "content": query}
        ],
        "tools": [{"type": "web_search"}]  # 如果支持
    }
    
    返回：原始API响应
    
    注意：ChatGPT不一定返回引用来源URL，需要从文本中提取
    错误处理：同Perplexity
    """
```

#### 2.4 extractors/citation_extractor.py

```python
def extract_citations(raw_results: list[dict], brand_domain: str, brand_name: str) -> list[dict]:
    """
    从原始返回结果中提取品牌引用。
    
    Perplexity：直接从 citations 字段提取来源URL
    ChatGPT：从返回文本中用正则匹配品牌名/域名
    
    输出：引用列表
    [
        {
            "quote_text": "Nike Air Zoom Pegasus is one of the best running shoes",
            "source_url": "https://runnerclick.com/best-running-shoes",
            "ai_engine": "perplexity",
            "position": 1
        },
        ...
    ]
    """
```

#### 2.5 classifiers/citation_classifier.py

```python
def classify_citation(quote_text: str, core_product: str) -> str:
    """
    用LLM判断引用情感。
    
    分类标准：
    · positive：引用内容与品牌定位一致，评价积极
    · neutral：客观提及，无明显倾向
    · deviation：引用内容与品牌实际定位不匹配
    · negative：引用内容是负面评价
    
    返回：sentiment 字符串
    """
```

#### 2.6 analyzers/competitor_analyzer.py

```python
def compare_competitor(citations: list[dict], competitors: list[str]) -> dict:
    """
    统计品牌和竞品在每个查询词下的引用率。
    
    输出：
    {
        "brand": {"domain": "nike.com", "total_citations": 47, "by_query": {...}},
        "competitors": [
            {"domain": "adidas.com", "total_citations": 31, "by_query": {...}},
            ...
        ]
    }
    """
```

### 任务 3：改造 probe_node.py

修改 `langgraph_app/nodes/probe_node.py`：

```python
# 第1层：身份
NODE_NAME = "probe"
NODE_ROLE = "侦察兵 — 采集 AI 引擎引用数据"
NODE_MODE = "react"  # ← 从 mock 改成 react

# 第2层：系统提示词
SYSTEM_PROMPT = """（从 PROMPTS.md §1 复制完整提示词）"""

# 第3层：上下文构建
def build_context(state: dict) -> str:
    ui = state["user_input"]
    return f"""品牌信息：
· 域名：{ui['domain']}
· 名称：{ui['brand_name']}
· 行业：{ui['industry']}
· 目标市场：{ui['target_market']}
· 核心产品：{ui['core_product']}
· 种子查询词：{ui['seed_queries']}
· 竞品：{ui['competitors']}"""

# 第4层：工具注册
from tools.query_expander import expand_queries
from tools.engines.perplexity_client import search as search_perplexity
from tools.engines.chatgpt_client import search as search_chatgpt
from tools.extractors.citation_extractor import extract_citations
from tools.classifiers.citation_classifier import classify_citation
from tools.analyzers.competitor_analyzer import compare_competitor

TOOLS = {
    "expand_queries": expand_queries,
    "search_perplexity": search_perplexity,
    "search_chatgpt": search_chatgpt,
    "extract_citations": extract_citations,
    "classify_citation": classify_citation,
    "compare_competitor": compare_competitor,
}

# 第5层：ReAct循环
def react_loop(state: dict) -> dict:
    ui = state["user_input"]
    
    # Step 1: 造子弹
    queries = TOOLS["expand_queries"](
        seeds=ui["seed_queries"],
        industry=ui["industry"],
        product=ui["core_product"]
    )
    
    # Step 2: 打靶子
    raw_results = []
    for engine_name in ["perplexity", "chatgpt"]:
        for query in queries:
            try:
                result = TOOLS[f"search_{engine_name}"](query)
                raw_results.append(result)
            except Exception as e:
                logger.log(f"Engine {engine_name} failed for query '{query}': {e}", "warn")
                continue
    
    if not raw_results:
        return {"status": "error", "error": "All engine searches failed"}
    
    # Step 3: 数环数
    citations = TOOLS["extract_citations"](
        results=raw_results,
        brand_domain=ui["domain"],
        brand_name=ui["brand_name"]
    )
    
    classified = []
    for cite in citations:
        sentiment = TOOLS["classify_citation"](
            quote_text=cite["quote_text"],
            core_product=ui["core_product"]
        )
        cite["sentiment"] = sentiment
        classified.append(cite)
    
    comparison = TOOLS["compare_competitor"](
        citations=classified,
        competitors=ui["competitors"]
    )
    
    return {
        "citations": classified,
        "engines_queried": ["perplexity", "chatgpt"],
        "query_terms": queries,
        "raw_serp": raw_results,
        "competitor_comparison": comparison,
        "status": "success",
        "error": None
    }

# 第7层：输出验证
def validate_output(output: dict) -> dict:
    errors = []
    if not isinstance(output.get("citations"), list):
        errors.append("citations must be a list")
    if not output.get("engines_queried"):
        errors.append("engines_queried is empty")
    if not output.get("query_terms"):
        errors.append("query_terms is empty")
    if output.get("status") not in ("success", "error"):
        errors.append("status must be 'success' or 'error'")
    return {"valid": len(errors) == 0, "errors": errors}

# 第8层：重试提示词
def build_retry_prompt(output: dict, errors: list) -> str:
    return f"输出验证失败：{errors}。请确保至少搜索了1个查询词并提取了引用。"

# 第12层：删除Mock输出
# 删除 MOCK_OUTPUT，Phase 2 不再需要
```

### 任务 4：更新测试

修改 `tests/test_pipeline.py`：

```python
def test_pipeline():
    graph = build_graph()
    
    initial_state = {
        "user_input": UserInput(
            domain="nike.com",
            brand_name="Nike, Inc.",
            industry="DTC品牌",
            target_market="美国",
            core_product="运动鞋和运动服饰",
            seed_queries=["best running shoes"],
            competitors=["adidas.com", "newbalance.com"]
        ).model_dump(),
        "pipeline_status": {"current_node": "", "step": 0, "message": ""}
    }
    
    result = graph.invoke(initial_state)
    
    # 验证Probe输出
    assert result["probe_output"]["status"] == "success"
    assert len(result["probe_output"]["citations"]) > 0
    assert "perplexity" in result["probe_output"]["engines_queried"]
```

### 任务 5：环境变量

需要设置以下环境变量（或在 .env 文件中）：

```
PERPLEXITY_API_KEY=your_perplexity_api_key
OPENAI_API_KEY=your_openai_api_key
```

如果暂时没有API Key，可以先用mock模式测试流程：
- 在 tools/engines/ 下的文件中，如果 API Key 为空，返回 mock 数据
- 这样可以先验证整个流程，等拿到 API Key 后再测试真实调用

## 交付标准

1. 所有工具文件创建完成
2. probe_node.py 改造完成（NODE_MODE="react"）
3. 测试通过（pytest tests/test_pipeline.py -v）
4. 自检通过（CHECKLIST.md）

## 注意事项

1. **不要改其他节点**：只改 probe_node.py 和 state.py，其他8个节点不动
2. **保持12层结构**：probe_node.py 的12层harness结构不变，只是填内容
3. **API Key处理**：如果API Key为空，返回mock数据，不要报错
4. **错误处理**：单个引擎失败不影响其他引擎，单个查询词失败不影响其他查询词
5. **Token追踪**：用已有的TokenTracker记录token消耗
