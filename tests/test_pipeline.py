# tests/test_pipeline.py — CiteFlow 端到端管线测试

from langgraph_app.dag import build_graph
from langgraph_app.state import UserInput


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

    # 验证每个格子都有数据
    assert result["probe_output"] is not None
    assert result["analyst_output"] is not None
    assert result["commander_plan"] is not None
    assert result["entity_result"] is not None
    assert result["architect_result"] is not None
    assert result["outreach_result"] is not None
    assert result["content_result"] is not None
    assert result["community_result"] is not None
    assert result["coordinator_report"] is not None

    # 验证 Probe 输出（真实实现，mock keys fallback）
    assert result["probe_output"]["status"] == "success"
    assert len(result["probe_output"]["citations"]) > 0
    assert "perplexity" in result["probe_output"]["engines_queried"]
    assert len(result["probe_output"]["query_terms"]) > 0

    # 验证数据合理性（其他节点仍为 mock）
    assert result["analyst_output"]["wilson_scores"]["overall"] == 23.0
    assert len(result["commander_plan"]["tasks"]) == 5
    assert result["coordinator_report"]["recommendation"] == "pass"

    print("✓ 管线端到端测试通过")


if __name__ == "__main__":
    test_pipeline()
