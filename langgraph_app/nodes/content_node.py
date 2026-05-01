# content_node.py — 内容特工 Agent（第1层：身份）
# 12 层 harness 骨架，Phase 1 mock 模式

# ─── 第 1 层：身份 ─────────────────────────────────────
NODE_NAME = "content"
NODE_ROLE = "内容特工 — 创建视频/文章/FAQ 内容并分发"
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
    "videos_created": [
        {
            "type": "video",
            "title": "Nike Air Zoom Pegasus 41 Review — Best Daily Trainer?",
            "url": "https://youtube.com/watch?v=mock123",
            "status": "published",
        },
    ],
    "articles_created": [
        {
            "type": "article",
            "title": "Top 10 Running Shoes for Beginners in 2026",
            "url": "https://nike.com/blog/top-10-running-shoes",
            "status": "published",
        },
    ],
    "faqs_created": [],
    "distribution_status": {
        "youtube": "published",
        "blog": "published",
    },
    "status": "success",
    "error": None,
}


# ─── 主函数 ────────────────────────────────────────────
def content_node(state: dict) -> dict:
    logger = NodeLogger(NODE_NAME)
    logger.log("Executing content node")

    if NODE_MODE == "mock":
        logger.log("Mock mode — returning fixed output")
        return {"content_result": MOCK_OUTPUT}

    # Phase 5: react mode
    return {"content_result": react_loop(state)}
