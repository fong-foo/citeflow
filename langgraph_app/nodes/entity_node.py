# entity_node.py — 身份特工 Agent（第1层：身份）
# 12 层 harness 骨架，Phase 1 mock 模式

# ─── 第 1 层：身份 ─────────────────────────────────────
NODE_NAME = "entity"
NODE_ROLE = "身份特工 — 维护 Wikidata/知识图谱一致性"
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
    "wikidata_changes": [
        {
            "property": "P127",
            "old_value": "Phil Knight",
            "new_value": "Phil Knight (co-founder)",
        },
        {
            "property": "P452",
            "old_value": "",
            "new_value": "Athletic footwear",
        },
    ],
    "knowledge_graph_status": "updated",
    "consistency_report": {"score": 95, "issues": []},
    "status": "success",
    "error": None,
}


# ─── 主函数 ────────────────────────────────────────────
def entity_node(state: dict) -> dict:
    logger = NodeLogger(NODE_NAME)
    logger.log("Executing entity node")

    if NODE_MODE == "mock":
        logger.log("Mock mode — returning fixed output")
        return {"entity_result": MOCK_OUTPUT}

    # Phase 5: react mode
    return {"entity_result": react_loop(state)}
