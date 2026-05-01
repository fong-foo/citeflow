# outreach_node.py — 寄生者 Agent（第1层：身份）
# 12 层 harness 骨架，Phase 1 mock 模式

# ─── 第 1 层：身份 ─────────────────────────────────────
NODE_NAME = "outreach"
NODE_ROLE = "寄生者 — 提交到外部平台，获取评价和媒体曝光"
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
    "platform_submissions": [
        {
            "platform": "G2",
            "url": "https://g2.com/products/nike/reviews",
            "status": "submitted",
        },
        {
            "platform": "Trustpilot",
            "url": "https://trustpilot.com/review/nike.com",
            "status": "pending_review",
        },
    ],
    "reviews_summary": {"total_submissions": 2, "approved": 1, "pending": 1},
    "earned_media": [
        {"source": "TechCrunch", "url": "https://techcrunch.com/nike-feature", "type": "mention"},
    ],
    "status": "success",
    "error": None,
}


# ─── 主函数 ────────────────────────────────────────────
def outreach_node(state: dict) -> dict:
    logger = NodeLogger(NODE_NAME)
    logger.log("Executing outreach node")

    if NODE_MODE == "mock":
        logger.log("Mock mode — returning fixed output")
        return {"outreach_result": MOCK_OUTPUT}

    # Phase 5: react mode
    return {"outreach_result": react_loop(state)}
