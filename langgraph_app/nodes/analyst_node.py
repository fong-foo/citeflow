# analyst_node.py — 军师 Agent（第1层：身份）
# 12 层 harness 骨架，Phase 1 mock 模式

# ─── 第 1 层：身份 ─────────────────────────────────────
NODE_NAME = "analyst"
NODE_ROLE = "军师 — 诊断引用数据，计算 Wilson Score，识别问题"
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
    "wilson_scores": {
        "overall": 23.0,
        "by_engine": {
            "perplexity": 25.0,
            "chatgpt": 22.0,
            "gemini": 21.0,
        },
        "by_query": {
            "best running shoes": 24.0,
        },
        "rank": 7,
    },
    "issues": [
        {
            "type": "low_citation_rate",
            "severity": "high",
            "description": "Citation rate of 23% is below industry benchmark of 40%",
            "affected_queries": ["best running shoes"],
        },
        {
            "type": "competitor_gap",
            "severity": "medium",
            "description": "Adidas has higher citation rate on gemini engine",
            "affected_queries": ["best running shoes"],
        },
        {
            "type": "sentiment_imbalance",
            "severity": "low",
            "description": "All citations are positive — lack of authentic variety",
            "affected_queries": [],
        },
    ],
    "recommendations": [
        "Increase structured data coverage on product pages",
        "Target gemini engine with schema.org optimizations",
        "Build community presence on Reddit and Quora",
    ],
    "competitor_comparison": {
        "adidas.com": {"wilson_score": 31.0, "rank": 4},
    },
    "status": "success",
    "error": None,
}


# ─── 主函数 ────────────────────────────────────────────
def analyst_node(state: dict) -> dict:
    logger = NodeLogger(NODE_NAME)
    logger.log("Executing analyst node")

    if NODE_MODE == "mock":
        logger.log("Mock mode — returning fixed output")
        return {"analyst_output": MOCK_OUTPUT}

    # Phase 2: react mode
    return {"analyst_output": react_loop(state)}
