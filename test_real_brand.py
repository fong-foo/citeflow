# test_real_brand.py — 真实品牌数据测试
# 测试品牌：YesWelder（焊接设备品牌）
# 运行方式：cd ~/Desktop/CiteFlow && source .venv/bin/activate && python test_real_brand.py

import asyncio
import json
import time
import sys
import os

# 确保项目路径在 sys.path 中
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from langgraph_app.nodes.probe_node import probe_node
from langgraph_app.nodes.analyst_node import analyst_node
from langgraph_app.tools.analyst_context import build_context
from validate_report import validate_probe_output, validate_analyst_output


# ─── 测试输入 ──────────────────────────────────────────────
USER_INPUT = {
    "domain": "yeswelder.com",
    "brand_name": "YesWelder",
    "industry": "焊接设备",
    "target_market": "美国、加拿大、英国、澳洲、欧洲",
    "core_product": "多工艺焊机（MIG/TIG/Stick/Plasma）、焊接面罩、焊接配件",
    "target_positioning": "预算友好的专业焊接设备品牌，让业余爱好者和小企业也能用上高质量焊接设备",
    "seed_queries": [
        "best budget welder",
        "welding equipment for beginners",
        "affordable MIG welder",
        "TIG welder under 500",
        "welding helmet auto darkening",
    ],
    "competitors": [
        "lincolnelectric.com",
        "millerwelds.com",
        "esab.com",
    ],
}


def format_section(title: str, content: str) -> str:
    """格式化输出段落"""
    sep = "=" * 60
    return f"\n{sep}\n  {title}\n{sep}\n{content}\n"


def format_metrics(probe_output: dict) -> str:
    """格式化 Probe 关键指标"""
    bp = probe_output.get("brand_profile") or {}
    cs = probe_output.get("company_score") or {}
    gr = probe_output.get("gap_report") or {}
    cm = probe_output.get("citation_metrics") or {}
    sa = probe_output.get("source_authority") or {}
    meta = probe_output.get("meta") or {}
    comp = probe_output.get("competitor_analysis") or []

    lines = [
        f"状态: {probe_output.get('status', 'unknown')}",
        f"错误: {probe_output.get('error') or '无'}",
        "",
        "--- 品牌画像 ---",
        f"  一句话: {bp.get('one_liner', 'N/A')}",
        f"  价值主张: {', '.join(bp.get('value_props', [])[:3])}",
        f"  推断行业: {bp.get('inferred_industry', 'N/A')}",
        f"  推断市场: {bp.get('inferred_target_market', 'N/A')}",
        f"  推断产品: {bp.get('inferred_core_product', 'N/A')}",
        "",
        "--- 量化评分 ---",
        f"  综合分: {cs.get('overall', 'N/A')}/100",
    ]
    for d in cs.get("dimensions", []):
        lines.append(f"  {d['name']}: {d['score']}/100 (权重{d.get('weight', '?')})")

    lines.extend([
        "",
        "--- 差距分析 ---",
        f"  对齐度(官网vs AI): {gr.get('alignment_score', 'N/A')}/100",
        f"  概述: {gr.get('one_line_summary', 'N/A')}",
    ])
    if gr.get("has_target_gap"):
        lines.extend([
            f"  对齐度(期望vs AI): {gr.get('target_alignment_score', 'N/A')}/100",
            f"  期望差距: {gr.get('target_gap_summary', 'N/A')}",
        ])
    lines.extend([
        "",
        "--- 引用率 ---",
        f"  提及率(旧引用率): {cm.get('rate', 'N/A')}%",
        f"  推荐率(NEW): {cm.get('recommendation_rate', 'N/A')}% ({cm.get('recommended_count', 0)}/{cm.get('total_queries', 0)} 被推荐)",
        f"  Top1率(NEW): {cm.get('top_rate', 'N/A')}% ({cm.get('top_count', 0)}次排第一)",
        f"  A(行业)={cm.get('industry_rate', 0)}% | B(品牌)={cm.get('brand_rate', 0)}% | C(竞品)={cm.get('competitor_scenario_rate', 0)}%",
        f"  提及: {cm.get('mentioned_count', 0)}/{cm.get('total_queries', 0)}",
        f"  官网引用占比: {cm.get('official_site_ratio', 0):.2f}",
        "",
        "--- 来源权威性 ---",
        f"  总来源数: {sa.get('total_sources', 'N/A')}",
        f"  多样性: {sa.get('source_diversity', 'N/A')}",
    ])
    for s in (sa.get("top_sources") or [])[:5]:
        lines.append(f"  {s.get('domain', '')}: 权威分{s.get('authority_score', 0)}, 提及{s.get('mention_count', 0)}次")

    lines.extend([
        "",
        "--- 竞品对比 ---",
        f"  总对比: {len(comp)} 次",
    ])
    wins = sum(1 for c in comp if c.get("winner", "").lower() == USER_INPUT["brand_name"].lower())
    losses = sum(1 for c in comp if c.get("winner", "").lower() not in (USER_INPUT["brand_name"].lower(), "tie", "unknown", ""))
    lines.append(f"  胜: {wins} | 负: {losses}")
    for c in comp[:3]:
        lines.append(f"  [{c.get('query', '')}] → 胜者: {c.get('winner', 'N/A')}")
    # 维度打分矩阵
    for c in comp[:2]:
        dim_scores = c.get("dimension_scores", [])
        if dim_scores:
            lines.append(f"  查询「{c['query']}」维度评分:")
            for ds in dim_scores[:5]:
                rankings_str = " | ".join(f"{r['brand']}({r['score']})" for r in ds.get("rankings", []))
                lines.append(f"    {ds['dimension']}: {rankings_str}")
    # 竞品引用详情 (NEW)
    comp_details = cm.get("competitor_citation_detail", {})
    if comp_details:
        lines.append("")
        lines.append("--- 竞品引用详情 (NEW) ---")
        for domain, detail in comp_details.items():
            lines.append(f"  {domain}: 提及{detail.get('mention_count', 0)}次, 平均权威分{detail.get('avg_authority', 0)}, 来源: {', '.join(detail.get('top_sources', [])[:3])}")
    else:
        lines.append("")
        lines.append("--- 竞品引用详情 (NEW) ---")
        lines.append("  (无竞品引用数据)")

    lines.extend([
        "",
        "--- 元数据 ---",
        f"  Token: {meta.get('total_tokens', 'N/A')}",
        f"  耗时: {meta.get('total_duration_ms', 'N/A')}ms",
        f"  预估成本: ${meta.get('total_cost', 'N/A')}",
    ])

    return "\n".join(lines)


def format_diagnosis(analyst_output: dict) -> str:
    """格式化 Analyst 诊断"""
    diag = analyst_output.get("diagnosis") or {}
    actions = analyst_output.get("actions") or []
    cg = analyst_output.get("competitor_gap") or {}
    tlc = analyst_output.get("three_layer_chain") or {}

    lines = [
        f"状态: {analyst_output.get('status', 'unknown')}",
        f"错误: {analyst_output.get('error') or '无'}",
        "",
        "--- 三层推理链 (NEW) ---",
    ]
    if tlc:
        lines.append(f"  观察: {tlc.get('observation', 'N/A')[:200]}...")
        lines.append(f"  解释: {tlc.get('explanation', 'N/A')[:200]}...")
        lines.append(f"  含义: {tlc.get('implication', 'N/A')[:200]}...")
        # 验证三字段非空
        obs_ok = bool(tlc.get('observation', '').strip())
        exp_ok = bool(tlc.get('explanation', '').strip())
        imp_ok = bool(tlc.get('implication', '').strip())
        lines.append(f"  三字段完整性: 观察={'✅' if obs_ok else '❌'} 解释={'✅' if exp_ok else '❌'} 含义={'✅' if imp_ok else '❌'}")
    else:
        lines.append("  ❌ three_layer_chain 为空！")

    lines.extend([
        "",
        "--- 诊断 ---",
        f"  核心问题: {diag.get('core_problem', 'N/A')}",
        f"  严重程度: {diag.get('severity', 'N/A')}",
        f"  详情: {diag.get('problem_detail', 'N/A')[:300]}...",
        "",
        "--- 行动建议 ---",
    ])
    for i, a in enumerate(actions, 1):
        lines.extend([
            f"  [{i}] {a.get('priority', '?')} | {a.get('action', 'N/A')}",
            f"      理由: {a.get('rationale', 'N/A')[:100]}...",
            f"      预期: {a.get('expected_impact', 'N/A')}",
            f"      周期: {a.get('estimated_time', 'N/A')} | 成本: {a.get('estimated_cost', 'N/A')}",
        ])

    if cg.get("losing_dimensions") or cg.get("winning_dimensions"):
        lines.extend([
            "",
            "--- 竞品差距 ---",
        ])
        if cg.get("losing_dimensions"):
            losing = cg.get('losing_dimensions', [])
            losing_str = ', '.join(
                (d.get('dimension', str(d)) if isinstance(d, dict) else str(d))
                for d in losing
            )
            lines.append(f"  输在: {losing_str}")
        if cg.get("winning_dimensions"):
            winning = cg.get('winning_dimensions', [])
            winning_str = ', '.join(
                (d.get('dimension', str(d)) if isinstance(d, dict) else str(d))
                for d in winning
            )
            lines.append(f"  赢在(NEW): {winning_str}")
        lines.extend([
            f"  根因: {cg.get('root_cause', 'N/A')}",
            f"  对策: {cg.get('counter_strategy', 'N/A')}",
        ])

    lines.extend([
        "",
        "--- 一句话总结 ---",
        f"  {analyst_output.get('one_line_verdict', 'N/A')}",
    ])

    return "\n".join(lines)


def main():
    print("\n" + "=" * 60)
    print("  CiteFlow 真实品牌数据测试")
    print("  品牌: YesWelder (yeswelder.com)")
    print("  时间:", time.strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 60)

    state = {
        "user_input": USER_INPUT,
        "probe_output": {},
        "analyst_output": {},
        "commander_plan": {},
        "entity_result": {},
        "architect_result": {},
        "outreach_result": {},
        "content_result": {},
        "community_result": {},
        "coordinator_report": {},
        "pipeline_status": {},
        "probe_meta": {},
        "errors": {},
        "retry_count": 0,
        "checkpoint": {},
    }

    # ── Step 1: Probe ──────────────────────────────────────
    print("\n[1/2] 运行 Probe（侦察兵）...")
    probe_start = time.time()
    try:
        state = probe_node(state)
    except Exception as e:
        print(f"\n!!! Probe 崩溃: {e}")
        import traceback
        traceback.print_exc()
        return
    probe_elapsed = time.time() - probe_start

    probe_output = state.get("probe_output", {})
    errors = state.get("errors", {})

    print(format_section("Probe 输出", format_metrics(probe_output)))

    if errors:
        print(format_section("Probe 错误", json.dumps(errors, ensure_ascii=False, indent=2)))

    print(f"\nProbe 总耗时: {probe_elapsed:.1f}秒")

    # 保存 Probe 完整输出
    with open("test_yeswelder_probe_output.json", "w", encoding="utf-8") as f:
        json.dump(probe_output, f, ensure_ascii=False, indent=2)
    print(f"完整 Probe 输出已保存: test_yeswelder_probe_output.json")

    # ── Step 2: Analyst ────────────────────────────────────
    print("\n[2/2] 运行 Analyst（军师）...")
    analyst_start = time.time()
    try:
        state = analyst_node(state)
    except Exception as e:
        print(f"\n!!! Analyst 崩溃: {e}")
        import traceback
        traceback.print_exc()
        return
    analyst_elapsed = time.time() - analyst_start

    analyst_output = state.get("analyst_output", {})
    print(format_section("Analyst 诊断", format_diagnosis(analyst_output)))
    print(f"\nAnalyst 耗时: {analyst_elapsed:.1f}秒")

    # 保存 Analyst 完整输出
    with open("test_yeswelder_analyst_output.json", "w", encoding="utf-8") as f:
        json.dump(analyst_output, f, ensure_ascii=False, indent=2)
    print(f"完整 Analyst 输出已保存: test_yeswelder_analyst_output.json")

    # ── 总结 ───────────────────────────────────────────────
    total_elapsed = probe_elapsed + analyst_elapsed
    total_tokens = (probe_output.get("meta") or {}).get("total_tokens", 0)

    print(format_section("测试总结", "\n".join([
        f"  品牌: YesWelder (yeswelder.com)",
        f"  Probe 状态: {probe_output.get('status', 'unknown')}",
        f"  Analyst 状态: {analyst_output.get('status', 'unknown')}",
        f"  总耗时: {total_elapsed:.1f}秒",
        f"  总 Token: {total_tokens}",
        f"  错误数: {len(errors)}",
        "",
        "  输出文件:",
        "    test_yeswelder_probe_output.json   — Probe 完整数据",
        "    test_yeswelder_analyst_output.json — Analyst 完整诊断",
    ])))

    # ── 自动验证 ───────────────────────────────────────────
    print(format_section("自动验证", ""))
    probe_checks, cm = validate_probe_output(probe_output)
    analyst_checks = validate_analyst_output(analyst_output, cm)
    all_checks = probe_checks + analyst_checks
    passed = sum(1 for c in all_checks if c["status"] == "PASS")
    failed = sum(1 for c in all_checks if c["status"] == "FAIL")
    print(f"结果: {'PASS' if failed == 0 else 'FAIL'} ({passed}/{len(all_checks)})")
    for check in all_checks:
        status = "✅" if check["status"] == "PASS" else "❌"
        print(f"  {status} {check['check']}")
        if check["detail"]:
            print(f"     {check['detail']}")
    if failed > 0:
        print(f"\n⚠️ {failed} 项检查失败，请检查上述 ❌ 项。")


if __name__ == "__main__":
    main()
