"""Analyst 模块测试 — 真实 DeepSeek 调用，验证诊断报告输出。"""
import json
import sys
import os

os.environ.setdefault("DEEPSEEK_API_KEY", "sk-9a5ae063b83144cead80966081e82030")


def test_build_context():
    """验证 build_context 能正确处理真实 ProbeOutput。"""
    from langgraph_app.tools.analyst_context import build_context

    with open(os.path.join(os.path.dirname(__file__), "probe_full_output.json"), "r") as f:
        data = json.load(f)

    ctx = build_context(data["output"])

    # 基础字段
    assert ctx["brand_name"] == "Notion"
    assert ctx["industry"] == "B2B SaaS"
    assert "metrics" in ctx
    assert "source_breakdown" in ctx
    assert "score_dimensions" in ctx
    assert "competitor_summary" in ctx
    assert "gap_summary" in ctx
    assert "perception_vs_self" in ctx
    # 不应包含预计算结论
    assert "triggered_rules" not in ctx, "build_context 不应该预计算规则"
    assert "overall_severity" not in ctx, "build_context 不应该预判严重程度"

    # 指标
    m = ctx["metrics"]
    assert 0 <= m["overall_score"] <= 100
    assert 0 <= m["alignment_score"] <= 100
    assert 0 <= m["citation_rate"] <= 100
    assert 0 <= m["source_diversity"] <= 1
    assert "source_breakdown" in ctx
    assert len(m["industry_weights"]) > 0

    # 评分维度表
    assert len(ctx["score_dimensions"]) == 5
    for d in ctx["score_dimensions"]:
        assert "name" in d
        assert "score" in d
        assert "weight" in d
        assert "difficulty" in d

    # 竞品摘要
    assert "has_data" in ctx["competitor_summary"]
    assert "losing_queries" in ctx["competitor_summary"]

    print(f"  PASS test_build_context")
    print(f"    品牌: {ctx['brand_name']} | 行业: {ctx['industry']}")
    print(f"    综合分: {m['overall_score']} | 对齐度: {m['alignment_score']} | 引用率: {m['citation_rate']}%")
    print(f"    来源多样性: {m['source_diversity']} | 引用源: {len(ctx['source_breakdown']['top_sources'])} 个")
    print(f"    缺失平台: {ctx['source_breakdown']['missing_platforms']}")
    print(f"    AI感知 vs 品牌自述 已包含（不对齐领域: {len(ctx['gap_summary']['misaligned'])} 个）")


def test_analyst_node():
    """验证 analyst_node 能调用 LLM 并输出结构化诊断报告。"""
    from langgraph_app.nodes.analyst_node import analyst_node

    with open(os.path.join(os.path.dirname(__file__), "probe_full_output.json"), "r") as f:
        data = json.load(f)

    state = {"probe_output": data["output"]}
    result = analyst_node(state)

    assert "analyst_output" in result
    ao = result["analyst_output"]

    # 检查状态
    assert ao["status"] == "success", f"Expected success, got {ao.get('status')}: {ao.get('error')}"

    # 诊断
    diag = ao.get("diagnosis", {})
    assert diag, "diagnosis 不应为空"
    assert diag.get("core_problem"), "core_problem 不应为空"
    assert diag.get("problem_detail"), "problem_detail 不应为空"
    assert diag.get("severity") in ("critical", "warning", "healthy")

    # 行动清单
    actions = ao.get("actions", [])
    assert len(actions) >= 2, f"至少 2 条 action，实际 {len(actions)}"
    for a in actions:
        assert a["priority"] in ("P0", "P1", "P2"), f"priority 无效: {a['priority']}"
        assert a["action"], "action 不应为空"
        assert a["rationale"], "rationale 不应为空"
        assert a["expected_impact"], "expected_impact 不应为空"
        assert len(a.get("action_steps", [])) >= 2, f"action_steps 至少2步，实际 {len(a.get('action_steps', []))}"
        assert a.get("estimated_time"), "estimated_time 不应为空"
        assert a.get("estimated_cost") in ("免费", "$", "$$", "$$$"), f"estimated_cost 无效: {a.get('estimated_cost')}"

    # 一句话总结
    assert ao.get("one_line_verdict"), "one_line_verdict 不应为空"

    print(f"  PASS test_analyst_node")
    print(f"    诊断: [{diag['severity']}] {diag['core_problem']}")
    print(f"    详情: {diag['problem_detail'][:100]}...")
    print(f"    行动项: {len(actions)} 条")
    for a in actions:
        print(f"      [{a['priority']}] {a['action'][:60]}...")
        print(f"          步骤: {' → '.join(a.get('action_steps', []))[:100]}")
        print(f"          理由: {a['rationale'][:80]}...")
        print(f"          预期: {a['expected_impact'][:80]}...")
        print(f"          周期: {a.get('estimated_time', '')} | 成本: {a.get('estimated_cost', '')}")
    print(f"    竞品分析: {ao.get('competitor_gap', {})}")
    print(f"    CEO 一句话: {ao['one_line_verdict']}")


def test_analyst_empty_state():
    """空 state 应返回 error。"""
    from langgraph_app.nodes.analyst_node import analyst_node

    result = analyst_node({})
    ao = result["analyst_output"]
    assert ao["status"] == "error"
    assert ao["error"]
    print(f"  PASS test_analyst_empty_state: {ao['error'][:60]}...")


def test_models():
    """验证新 Pydantic 模型可正常构建。"""
    from langgraph_app.state import Diagnosis, ActionItem, CompetitorGap, AnalystOutput

    diag = Diagnosis(
        core_problem="品牌定位偏差",
        problem_detail="AI 将品牌视为初创工具，而非企业级基础设施。",
        severity="warning",
    )
    action = ActionItem(
        priority="P0",
        action="在官网强化企业级定位",
        rationale="AI 从官网抓取品牌信息，当前官网企业级内容不够突出",
        expected_impact="对齐度从 75 → 85",
        target_metric="对齐度",
        current_value="75",
        expected_value="85",
        action_steps=["添加企业客户案例页面", "在首页突出 SOC2/ISO 认证", "增加 SAML SSO 说明文档"],
        estimated_time="1-2周",
        estimated_cost="免费",
    )
    gap = CompetitorGap(
        losing_dimensions=["企业级信任"],
        root_cause="竞品有 10 年积累",
        counter_strategy="强调现代工作方式而非企业级",
    )
    output = AnalystOutput(
        diagnosis=diag,
        actions=[action],
        competitor_gap=gap,
        one_line_verdict="AI 知道你，但把你当小团队工具。",
    )

    d = output.model_dump()
    assert d["diagnosis"]["core_problem"] == "品牌定位偏差"
    assert len(d["actions"]) == 1
    assert d["actions"][0]["priority"] == "P0"
    assert d["competitor_gap"]["losing_dimensions"] == ["企业级信任"]
    print("  PASS test_models")


if __name__ == "__main__":
    print("=" * 60)
    print("Analyst 模块测试")
    print("=" * 60)

    all_pass = True
    for fn in [test_models, test_analyst_empty_state, test_build_context, test_analyst_node]:
        try:
            fn()
        except Exception as e:
            print(f"  FAIL {fn.__name__}: {e}")
            import traceback
            traceback.print_exc()
            all_pass = False

    print("\n" + "=" * 60)
    if all_pass:
        print("全部测试通过 ✅")
    else:
        print("有测试失败 ❌")
    print("=" * 60)
    sys.exit(0 if all_pass else 1)
