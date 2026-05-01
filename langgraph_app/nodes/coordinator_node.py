# coordinator_node.py — 车间主任（第1层：身份）
# 纯规则引擎，不依赖 LLM
# 读 5 个执行 Agent 的结果，比对一致性，写 coordinator_report

# ─── 第 1 层：身份 ─────────────────────────────────────
NODE_NAME = "coordinator"
NODE_ROLE = "车间主任 — 读取所有执行结果，比对一致性，裁决冲突"
NODE_MODE = "mock"  # mock / rule_engine


# ─── 第 2 层：系统提示词（不适用，纯规则引擎）────────────
SYSTEM_PROMPT = ""


# ─── 第 3 层：上下文构建 ────────────────────────────────
def build_context(state: dict) -> str:
    return ""


# ─── 第 4 层：工具注册（无工具）──────────────────────────
TOOLS = {}


# ─── 第 5 层：ReAct 循环（不适用）───────────────────────
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
    "consistency_score": 95.0,
    "conflicts": [],
    "actions_taken": [
        "Verified entity consistency across wikidata and schema",
        "Checked content distribution status",
        "Reviewed community engagement metrics",
        "Cross-validated outreach platform submissions",
    ],
    "recommendation": "pass",
    "status": "success",
    "error": None,
}


# ─── 主函数（规则引擎模式）─────────────────────────────
def coordinator_node(state: dict) -> dict:
    logger = NodeLogger(NODE_NAME)
    logger.log("Executing coordinator node")

    if NODE_MODE == "mock":
        logger.log("Mock mode — returning fixed output (no conflicts)")
        return {"coordinator_report": MOCK_OUTPUT}

    # Phase 2+: 真实规则引擎模式
    # 读取 5 个执行 Agent 的结果
    entity = state.get("entity_result", {})
    architect = state.get("architect_result", {})
    outreach = state.get("outreach_result", {})
    content = state.get("content_result", {})
    community = state.get("community_result", {})

    # 比对一致性
    conflicts = []
    actions_taken = []

    # 检查所有执行节点是否成功
    for name, result in [("entity", entity), ("architect", architect),
                         ("outreach", outreach), ("content", content),
                         ("community", community)]:
        if result.get("status") != "success":
            conflicts.append({
                "field": f"{name}_status",
                "values": {name: result.get("status", "unknown")},
                "resolution": "retry",
            })
        else:
            actions_taken.append(f"Verified {name} output consistency")

    # 计算一致性分数
    consistency_score = max(0, 100 - len(conflicts) * 20)
    recommendation = "pass" if consistency_score >= 80 else "retry"

    result = {
        "coordinator_report": {
            "consistency_score": consistency_score,
            "conflicts": conflicts,
            "actions_taken": actions_taken,
            "recommendation": recommendation,
            "status": "success",
            "error": None,
        }
    }

    # 如果需要 retry，递增 retry_count 写回 state
    if recommendation == "retry":
        result["retry_count"] = state.get("retry_count", 0) + 1

    return result
