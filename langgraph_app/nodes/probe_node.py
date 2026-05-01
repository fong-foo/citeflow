# probe_node.py — 侦察兵 Agent
# 12 层 harness 骨架，Phase 2 真实实现

# ─── 第 1 层：身份 ─────────────────────────────────────
NODE_NAME = "probe"
NODE_ROLE = "侦察兵 — 采集 AI 引擎引用数据"
NODE_MODE = "react"  # mock / react


# ─── 第 2 层：系统提示词 ─────────────────────────────────
SYSTEM_PROMPT = """你是 CiteFlow 的侦察兵（Probe），负责采集 AI 引擎对品牌的引用快照。

## 你的任务

从 AI 引擎（Perplexity、ChatGPT）中采集用户品牌被引用的情况，输出结构化的引用快照。

## 你有以下工具

1. expand_queries — 扩展查询词
2. search_perplexity — 搜索 Perplexity
3. search_chatgpt — 搜索 ChatGPT
4. extract_citations — 提取引用
5. classify_citation — 分类引用情感
6. compare_competitor — 对比竞品

## 工作流程

Step 1（造子弹）：用 expand_queries 扩展种子查询词
Step 2（打靶子）：用 search_perplexity 和 search_chatgpt 搜索每个查询词
Step 3（数环数）：用 extract_citations 提取引用 → classify_citation 分类情感 → compare_competitor 对比竞品

## 约束

· 每个查询词最多采集10个引用
· 每个引擎最多搜索30个查询词
· 如果某个引擎API调用失败，降级继续搜索其他引擎，不要中断
· 如果所有引擎都失败，返回 status="error" 并说明原因
· 不要编造引用来源，只使用API实际返回的数据"""


# ─── 第 3 层：上下文构建 ────────────────────────────────
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


# ─── 第 4 层：工具注册 ─────────────────────────────────
from langgraph_app.tools.query_expander import expand_queries
from langgraph_app.tools.engines.perplexity_client import search as search_perplexity
from langgraph_app.tools.engines.chatgpt_client import search as search_chatgpt
from langgraph_app.tools.extractors.citation_extractor import extract_citations
from langgraph_app.tools.classifiers.citation_classifier import classify_citation
from langgraph_app.tools.analyzers.competitor_analyzer import compare_competitor

TOOLS = {
    "expand_queries": expand_queries,
    "search_perplexity": search_perplexity,
    "search_chatgpt": search_chatgpt,
    "extract_citations": extract_citations,
    "classify_citation": classify_citation,
    "compare_competitor": compare_competitor,
}


# ─── 第 5 层：ReAct 循环 ──────────────────────────────
import asyncio


def _run_async(coro):
    """Run an async function from sync context."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # We're inside an event loop (e.g., Jupyter, FastAPI)
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)


def react_loop(state: dict) -> dict:
    """Execute the Probe Agent's ReAct loop: expand → search → extract → classify → compare."""
    ui = state["user_input"]
    logger = __import__("langgraph_app.base_node", fromlist=["NodeLogger"]).NodeLogger(NODE_NAME)

    # Step 1: 造子弹 — expand seed queries
    logger.log("Step 1: Expanding queries")
    queries = TOOLS["expand_queries"](
        seeds=ui["seed_queries"],
        industry=ui["industry"],
        product=ui["core_product"],
    )
    logger.log(f"Expanded to {len(queries)} queries")

    # Step 2: 打靶子 — search each engine for each query
    logger.log("Step 2: Searching engines")
    raw_results = []
    for engine_name in ["perplexity", "chatgpt"]:
        for query in queries:
            try:
                result = _run_async(TOOLS[f"search_{engine_name}"](query))
                raw_results.append(result)
            except Exception as e:
                logger.log(f"Engine {engine_name} failed for query '{query}': {e}", "warn")
                continue

    if not raw_results:
        logger.log("All engine searches failed", "error")
        return {
            "citations": [],
            "engines_queried": [],
            "query_terms": queries,
            "raw_serp": {},
            "competitor_comparison": {},
            "status": "error",
            "error": "All engine searches failed",
        }

    # Filter out error results
    successful_results = [r for r in raw_results if not r.get("error")]
    engines_used = list(set(r.get("engine", "unknown") for r in successful_results))
    logger.log(f"Got {len(successful_results)} successful results from {engines_used}")

    if not successful_results:
        return {
            "citations": [],
            "engines_queried": [],
            "query_terms": queries,
            "raw_serp": {},
            "competitor_comparison": {},
            "status": "error",
            "error": "All engine searches returned errors",
        }

    # Step 3: 数环数 — extract, classify, compare
    logger.log("Step 3: Extracting citations")
    citations = TOOLS["extract_citations"](
        raw_results=successful_results,
        brand_domain=ui["domain"],
        brand_name=ui["brand_name"],
    )
    logger.log(f"Extracted {len(citations)} citations")

    # Classify each citation
    classified = []
    for cite in citations:
        sentiment = TOOLS["classify_citation"](
            quote_text=cite["quote_text"],
            core_product=ui["core_product"],
        )
        cite["sentiment"] = sentiment
        classified.append(cite)

    # Compare with competitors
    comparison = TOOLS["compare_competitor"](
        citations=classified,
        competitors=ui["competitors"],
    )

    logger.log(f"Probe complete: {len(classified)} classified citations")

    return {
        "citations": classified,
        "engines_queried": engines_used,
        "query_terms": queries,
        "raw_serp": {"results": successful_results},
        "competitor_comparison": comparison,
        "status": "success",
        "error": None,
    }


# ─── 第 6 层：（预留）───────────────────────────────────
# (reserved)


# ─── 第 7 层：输出验证 ─────────────────────────────────
def validate_output(output: dict) -> dict:
    """Validate probe output structure and content."""
    errors = []
    if not isinstance(output.get("citations"), list):
        errors.append("citations must be a list")
    if not output.get("engines_queried"):
        errors.append("engines_queried is empty")
    if not output.get("query_terms"):
        errors.append("query_terms is empty")
    if output.get("status") not in ("success", "error"):
        errors.append("status must be 'success' or 'error'")
    if output.get("status") == "success" and len(output.get("citations", [])) == 0:
        errors.append("status is success but citations list is empty")
    return {"valid": len(errors) == 0, "errors": errors}


# ─── 第 8 层：重试提示词构建 ────────────────────────────
def build_retry_prompt(output: dict, errors: list) -> str:
    return f"输出验证失败：{errors}。请确保至少搜索了1个查询词并提取了引用。"


# ─── 第 9/10/11 层：公共 harness（熔断器 / 日志 / Token 追踪）────
from langgraph_app.base_node import CircuitBreaker, NodeLogger, TokenTracker  # noqa: F401


# ─── 第 12 层：主函数 ──────────────────────────────────
def probe_node(state: dict) -> dict:
    logger = NodeLogger(NODE_NAME)
    logger.log("Executing probe node (react mode)")

    result = react_loop(state)

    # Validate output
    validation = validate_output(result)
    if not validation["valid"]:
        logger.log(f"Output validation failed: {validation['errors']}", "warn")

    return {"probe_output": result}
