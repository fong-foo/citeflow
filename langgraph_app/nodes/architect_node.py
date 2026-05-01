# architect_node.py — 结构大师 Agent（第1层：身份）
# 12 层 harness 骨架，Phase 1 mock 模式

# ─── 第 1 层：身份 ─────────────────────────────────────
NODE_NAME = "architect"
NODE_ROLE = "结构大师 — 注入 Schema.org 结构化数据，优化可抓取性"
NODE_MODE = "mock"  # mock / react


# ─── 第 2 层：系统提示词（Phase 2 填）─────────────────────
SYSTEM_PROMPT = ""


# ─── 第 3 层：上下文构建 ────────────────────────────────
def build_context(state: dict) -> str:
    return ""


# ─── 第 4 层：工具注册 ─────────────────────────────────
TOOLS = {}


# ─── 第 5 层：ReAct 循环 ──────────────────────────────
def react_loop(state: dict) -> dict:
    return {}


# ─── 第 6 层：（预留）───────────────────────────────────
# (reserved)


# ─── 第 7 层：输出验证 ─────────────────────────────────
def validate_output(output: dict) -> dict:
    return {"valid": True, "errors": []}


# ─── 第 8 层：重试提示词构建 ────────────────────────────
def build_retry_prompt(output: dict, errors: list) -> str:
    return ""


# ─── 第 9/10/11 层：公共 harness（熔断器 / 日志 / Token 追踪）────
from langgraph_app.base_node import CircuitBreaker, NodeLogger, TokenTracker  # noqa: F401


# ─── 第 12 层：Mock 输出 ───────────────────────────────
MOCK_OUTPUT = {
    "schema_injections": [
        {
            "page_url": "https://nike.com/products/pegasus",
            "schema_type": "Product",
            "schema_json": {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Nike Air Zoom Pegasus",
                "brand": {"@type": "Brand", "name": "Nike"},
            },
        },
        {
            "page_url": "https://nike.com/about",
            "schema_type": "Organization",
            "schema_json": {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "Nike, Inc.",
                "url": "https://nike.com",
            },
        },
    ],
    "content_changes": [
        {"page": "/products/pegasus", "change": "added Product schema"},
    ],
    "llms_txt_generated": True,
    "crawlability_report": {"score": 88, "pages_crawled": 5},
    "status": "success",
    "error": None,
}


# ─── 主函数 ────────────────────────────────────────────
def architect_node(state: dict) -> dict:
    logger = NodeLogger(NODE_NAME)
    logger.log("Executing architect node")

    if NODE_MODE == "mock":
        logger.log("Mock mode — returning fixed output")
        return {"architect_result": MOCK_OUTPUT}

    # Phase 5: react mode
    return {"architect_result": react_loop(state)}
