# test_flowerknows.py — Flower Knows（花知晓）真实品牌测试
# 运行方式：cd ~/Desktop/CiteFlow && source .venv/bin/activate && python test_flowerknows.py

import asyncio
import json
import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from langgraph_app.nodes.probe_node import probe_node
from langgraph_app.nodes.analyst_node import analyst_node
from langgraph_app.nodes.doctor_node import doctor_node
from langgraph_app.tools.analyst_context import build_context
from validate_report import validate_probe_output, validate_analyst_output


USER_INPUT = {
    "domain": "flowerknows.co",
    "brand_name": "Flower Knows",
    "industry": "彩妆（Color Cosmetics）",
    "target_market": "全球市场（美国、欧洲、日本、东南亚）",
    "core_product": "眼影盘、唇釉、唇膏、高光、腮红、粉底",
    "target_positioning": "平价奢华童话彩妆，二次元美学，目标Z世代女性",
    "seed_queries": [
        "best affordable eyeshadow palette",
        "cute fairy tale makeup brands",
        "anime style cosmetics",
        "best lip gloss for young women",
        "affordable luxury makeup brands 2025",
    ],
    "competitors": [
        "colourpop.com",
        "romand.us",
        "canmake.com",
    ],
}


def format_section(title: str, content: str) -> str:
    sep = "=" * 60
    return f"\n{sep}\n  {title}\n{sep}\n{content}\n"


def format_metrics(probe_output: dict) -> str:
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
        f"  提及率: {cm.get('rate', 'N/A')}%",
        f"  推荐率: {cm.get('recommendation_rate', 'N/A')}% ({cm.get('recommended_count', 0)}/{cm.get('total_queries', 0)} 被推荐)",
        f"  Top1率: {cm.get('top_rate', 'N/A')}% ({cm.get('top_count', 0)}次排第一)",
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
    for c in comp[:5]:
        lines.append(f"  [{c.get('query', '')}] → 胜者: {c.get('winner', 'N/A')}")
    # 维度打分矩阵
    for c in comp[:2]:
        dim_scores = c.get("dimension_scores", [])
        if dim_scores:
            lines.append(f"  查询「{c['query']}」维度评分:")
            for ds in dim_scores[:8]:
                rankings_str = " | ".join(f"{r['brand']}({r['score']})" for r in ds.get("rankings", []))
                lines.append(f"    {ds['dimension']}: {rankings_str}")

    # 竞品引用详情
    comp_details = cm.get("competitor_citation_detail", {})
    if comp_details:
        lines.append("")
        lines.append("--- 竞品引用详情 ---")
        for domain, detail in comp_details.items():
            lines.append(f"  {domain}: 提及{detail.get('mention_count', 0)}次, 平均权威分{detail.get('avg_authority', 0)}, 来源: {', '.join(detail.get('top_sources', [])[:3])}")
    else:
        lines.append("")
        lines.append("--- 竞品引用详情 ---")
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
    diag = analyst_output.get("diagnosis") or {}
    actions = analyst_output.get("actions") or []
    cg = analyst_output.get("competitor_gap") or {}
    tlc = analyst_output.get("three_layer_chain") or {}

    lines = [
        f"状态: {analyst_output.get('status', 'unknown')}",
        f"错误: {analyst_output.get('error') or '无'}",
        "",
        "--- 三层推理链 ---",
    ]
    if tlc:
        lines.append(f"  观察: {tlc.get('observation', 'N/A')[:300]}...")
        lines.append(f"  解释: {tlc.get('explanation', 'N/A')[:300]}...")
        lines.append(f"  含义: {tlc.get('implication', 'N/A')[:300]}...")
        obs_ok = bool(tlc.get('observation', '').strip())
        exp_ok = bool(tlc.get('explanation', '').strip())
        imp_ok = bool(tlc.get('implication', '').strip())
        lines.append(f"  三字段完整性: 观察={'✅' if obs_ok else '❌'} 解释={'✅' if exp_ok else '❌'} 含义={'✅' if imp_ok else '❌'}")
    else:
        lines.append("  ❌ three_layer_chain 为空！")

    # B类感知
    bcp = analyst_output.get("b_class_perception") or {}
    if bcp:
        lines.extend([
            "",
            "--- B类 AI认知画像 ---",
            f"  {json.dumps(bcp, ensure_ascii=False)[:500]}",
        ])

    # C类矩阵
    ccm = analyst_output.get("c_class_matrix") or {}
    if ccm:
        lines.extend([
            "",
            "--- C类 竞品胜负矩阵 ---",
            f"  {json.dumps(ccm, ensure_ascii=False)[:500]}",
        ])

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
            f"      理由: {a.get('rationale', 'N/A')[:120]}...",
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
            lines.append(f"  赢在: {winning_str}")
        lines.extend([
            f"  根因: {cg.get('root_cause', 'N/A')}",
            f"  对策: {cg.get('counter_strategy', 'N/A')}",
        ])

    # 引擎对比
    ec = analyst_output.get("engine_comparison") or {}
    if ec:
        lines.extend([
            "",
            "--- 引擎对比 ---",
            f"  {json.dumps(ec, ensure_ascii=False)[:400]}",
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
    print("  品牌: Flower Knows（花知晓）| flowerknows.co")
    print("  行业: 彩妆 | 定位: 平价奢华童话彩妆")
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
    print("\n[1/3] 运行 Probe（侦察兵）...")
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
    with open("test_flowerknows_probe_output.json", "w", encoding="utf-8") as f:
        json.dump(probe_output, f, ensure_ascii=False, indent=2)
    print(f"完整 Probe 输出已保存: test_flowerknows_probe_output.json")

    # ── Step 2: Analyst ────────────────────────────────────
    print("\n[2/3] 运行 Analyst（军师）...")
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
    with open("test_flowerknows_analyst_output.json", "w", encoding="utf-8") as f:
        json.dump(analyst_output, f, ensure_ascii=False, indent=2)
    print(f"完整 Analyst 输出已保存: test_flowerknows_analyst_output.json")

    # ── Step 3: Doctor ────────────────────────────────────
    print("\n[3/3] 运行 Doctor（医师）...")
    doctor_start = time.time()
    try:
        state = doctor_node(state)
    except Exception as e:
        print(f"\n!!! Doctor 崩溃: {e}")
        import traceback
        traceback.print_exc()
        return
    doctor_elapsed = time.time() - doctor_start

    doctor_output = state.get("doctor_output", {})
    prescription = doctor_output.get("prescription", [])
    summary = doctor_output.get("summary", "")
    knowledge_sources = doctor_output.get("knowledge_sources", [])

    print(f"\nDoctor 耗时: {doctor_elapsed:.1f}秒")
    print(f"处方条数: {len(prescription)}")
    print(f"引用论文: {len(knowledge_sources)}")
    print(f"策略总结: {summary[:200] if summary else '(空)'}...")

    # 验证关键字段
    print("\n=== CITE 维度验证 ===")
    cite_found = 0
    for i, item in enumerate(prescription):
        evidence = item.get("evidence", "")
        has_cite = "CITE" in evidence
        if has_cite:
            cite_found += 1
            print(f"  ✓ 处方{i+1} evidence 包含 CITE: {evidence[:100]}...")
        else:
            print(f"  ✗ 处方{i+1} evidence 缺少 CITE: {evidence[:100]}...")

    print(f"\nCITE 覆盖率: {cite_found}/{len(prescription)}")

    # 检查证据成熟度
    trust_items = [item for item in prescription if "权威" in item.get("category", "")]
    if trust_items:
        print("\n=== 证据成熟度验证 ===")
        for i, item in enumerate(prescription):
            if "权威" in item.get("category", ""):
                evidence = item.get("evidence", "")
                maturity_levels = ["A 级", "B 级", "C 级", "D 级", "E 级", "目标：将", "证据等级"]
                has_maturity = any(level in evidence for level in maturity_levels)
                idx = prescription.index(item) + 1
                if has_maturity:
                    print(f"  ✓ 权威处方{idx} 包含证据成熟度: {evidence[:120]}...")
                else:
                    print(f"  ✗ 权威处方{idx} 缺少证据成熟度标注")
    else:
        print("\n=== 证据成熟度验证 ===")
        print("  (无权威类处方，跳过)")

    # 保存 Doctor 输出
    with open("test_doctor_output.json", "w", encoding="utf-8") as f:
        json.dump(doctor_output, f, ensure_ascii=False, indent=2)
    print(f"\n完整 Doctor 输出已保存: test_doctor_output.json")

    # ── 总结 ───────────────────────────────────────────────
    total_elapsed = probe_elapsed + analyst_elapsed + doctor_elapsed
    total_tokens = (probe_output.get("meta") or {}).get("total_tokens", 0)

    print(format_section("测试总结", "\n".join([
        f"  品牌: Flower Knows（花知晓）| flowerknows.co",
        f"  Probe 状态: {probe_output.get('status', 'unknown')}",
        f"  Analyst 状态: {analyst_output.get('status', 'unknown')}",
        f"  Doctor 处方: {len(prescription)}条, CITE覆盖{cite_found}/{len(prescription)}",
        f"  总耗时: Probe={probe_elapsed:.1f}s + Analyst={analyst_elapsed:.1f}s + Doctor={doctor_elapsed:.1f}s = {total_elapsed:.1f}s",
        f"  总 Token: {total_tokens}",
        f"  错误数: {len(errors)}",
        "",
        "  输出文件:",
        "    test_flowerknows_probe_output.json   — Probe 完整数据",
        "    test_flowerknows_analyst_output.json — Analyst 完整诊断",
        "    test_doctor_output.json              — Doctor 处方报告",
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
