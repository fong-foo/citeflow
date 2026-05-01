# dag.py — CiteFlow DAG 拓扑定义
# START → Probe → Analyst → Commander → [5 executor agents] → Coordinator → END
# Coordinator 判 FAIL 时打回 Commander（最多 2 次）

from langgraph.graph import StateGraph, START, END
from langgraph_app.state import State
from langgraph_app.nodes.probe_node import probe_node
from langgraph_app.nodes.analyst_node import analyst_node
from langgraph_app.nodes.commander_node import commander_node
from langgraph_app.nodes.entity_node import entity_node
from langgraph_app.nodes.architect_node import architect_node
from langgraph_app.nodes.outreach_node import outreach_node
from langgraph_app.nodes.content_node import content_node
from langgraph_app.nodes.community_node import community_node
from langgraph_app.nodes.coordinator_node import coordinator_node


def _after_coordinator(state: dict) -> str:
    """条件路由：Coordinator 判 FAIL 时打回 Commander，最多 2 次。"""
    report = state.get("coordinator_report", {})
    if report.get("recommendation") == "pass":
        return "end"
    if state.get("retry_count", 0) >= 2:
        return "end"  # 超过 2 次直接结束（报警逻辑后续加）
    return "retry"


def build_graph():
    graph = StateGraph(State)

    # 注册 9 个节点
    graph.add_node("probe", probe_node)
    graph.add_node("analyst", analyst_node)
    graph.add_node("commander", commander_node)
    graph.add_node("entity", entity_node)
    graph.add_node("architect", architect_node)
    graph.add_node("outreach", outreach_node)
    graph.add_node("content", content_node)
    graph.add_node("community", community_node)
    graph.add_node("coordinator", coordinator_node)

    # 指挥链：串行
    graph.add_edge(START, "probe")
    graph.add_edge("probe", "analyst")
    graph.add_edge("analyst", "commander")

    # Commander → 5 个执行 Agent：并行
    graph.add_edge("commander", "entity")
    graph.add_edge("commander", "architect")
    graph.add_edge("commander", "outreach")
    graph.add_edge("commander", "content")
    graph.add_edge("commander", "community")

    # 5 个执行 Agent → Coordinator：汇聚
    graph.add_edge("entity", "coordinator")
    graph.add_edge("architect", "coordinator")
    graph.add_edge("outreach", "coordinator")
    graph.add_edge("content", "coordinator")
    graph.add_edge("community", "coordinator")

    # Coordinator → 条件路由：pass → END，retry → Commander
    graph.add_conditional_edges(
        "coordinator",
        _after_coordinator,
        {"end": END, "retry": "commander"},
    )

    return graph.compile()
