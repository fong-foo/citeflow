# commander_node.py — 统帅 Agent（第1层：身份）
# 12 层 harness 骨架，Phase 1 mock 模式

# ─── 第 1 层：身份 ─────────────────────────────────────
NODE_NAME = "commander"
NODE_ROLE = "统帅 — 根据诊断结果分配优化任务"
NODE_MODE = "mock"  # mock / plan_and_execute


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
    "tasks": [
        {
            "agent": "entity",
            "priority": "high",
            "payload": {"action": "update_wikidata", "domain": "nike.com"},
            "estimated_cost": 0.5,
        },
        {
            "agent": "architect",
            "priority": "high",
            "payload": {"action": "inject_schema", "pages": ["/products/pegasus"]},
            "estimated_cost": 0.3,
        },
        {
            "agent": "outreach",
            "priority": "medium",
            "payload": {"action": "submit_platforms", "platforms": ["g2", "trustpilot"]},
            "estimated_cost": 0.2,
        },
        {
            "agent": "content",
            "priority": "medium",
            "payload": {"action": "create_content", "types": ["video", "article"]},
            "estimated_cost": 1.0,
        },
        {
            "agent": "community",
            "priority": "low",
            "payload": {"action": "engage_community", "platforms": ["reddit", "quora"]},
            "estimated_cost": 0.1,
        },
    ],
    "industry_weights": {
        "structure": 0.35,
        "trust": 0.35,
        "identity": 0.30,
    },
    "optimization_route": "Structure→Trust→Identity",
    "status": "success",
    "error": None,
}


# ─── 主函数 ────────────────────────────────────────────
def commander_node(state: dict) -> dict:
    logger = NodeLogger(NODE_NAME)
    logger.log("Executing commander node")

    if NODE_MODE == "mock":
        logger.log("Mock mode — returning fixed output")
        return {"commander_plan": MOCK_OUTPUT}

    # Phase 4: plan_and_execute mode
    return {"commander_plan": react_loop(state)}
