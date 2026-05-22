# test_litfad.py — Litfad 跨行业测试输入
# 测试目的：验证 Probe + Analyst 在家居家具 DTC 品牌的表现
# 运行方式：cd ~/Desktop/CiteFlow && source .venv/bin/activate && python test_litfad.py

import asyncio
import json
import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from langgraph_app.nodes.probe_node import probe_node
from langgraph_app.nodes.analyst_node import analyst_node
from langgraph_app.tools.analyst_context import build_context
from validate_report import validate_probe_output, validate_analyst_output


# ─── 测试输入（8个字段）──────────────────────────────────────
USER_INPUT = {
    "domain": "litfad.com",
    "brand_name": "Litfad",
    "industry": "家居家具",
    "target_market": "北美、欧洲",
    "core_product": "北欧风格家具（桌椅/柜子/床）、灯具（吊灯/壁灯）、家居装饰",
    "target_positioning": "高性价比北欧风格家具，一站式在线家居购物",
    "seed_queries": [
        "affordable Scandinavian furniture online",
        "modern lighting fixtures",
        "budget furniture store",
        "Nordic style home decor",
        "office desk and chair set",
    ],
    "competitors": [
        "wayfair.com",
        "overcast.com",
        "castlery.com",
    ],
}


async def run_test():
    print(f"=== Litfad 跨行业测试 ===")
    print(f"品牌: {USER_INPUT['brand_name']}")
    print(f"域名: {USER_INPUT['domain']}")
    print(f"行业: {USER_INPUT['industry']}")
    print()

    # ── Phase 1: Probe ──
    print("--- Phase 1: Probe ---")
    state = {"user_input": USER_INPUT}
    start = time.time()

    try:
        result = probe_node(state)
        probe_time = time.time() - start
        probe_output = result.get("probe_output", {})
        print(f"Probe 完成: {probe_time:.1f}s")

        # 保存 probe 输出供检查
        with open("test_litfad_probe_output.json", "w") as f:
            json.dump(probe_output, f, ensure_ascii=False, indent=2)
        print("Probe 输出已保存到 test_litfad_probe_output.json")

        # 验证
        issues = validate_probe_output(probe_output)
        if issues:
            print(f"验证问题: {len(issues)} 个")
            for issue in issues:
                print(f"  - {issue}")
        else:
            print("验证通过 ✓")

        # 关键指标
        bp = probe_output.get("brand_profile", {})
        cm = probe_output.get("citation_metrics", {})
        print(f"\nBrand Profile:")
        print(f"  one_liner: {bp.get('one_liner', 'N/A')}")
        print(f"  inferred_industry: {bp.get('inferred_industry', 'N/A')}")
        print(f"  inferred_target_market: {bp.get('inferred_target_market', 'N/A')}")
        print(f"\nCitation Metrics:")
        print(f"  mention_rate: {cm.get('mention_rate', 0):.1%}")
        print(f"  recommendation_rate: {cm.get('recommendation_rate', 0):.1%}")
        print(f"  industry_rate: {cm.get('industry_rate', 0):.1%}")

    except Exception as e:
        print(f"Probe 失败: {e}")
        import traceback
        traceback.print_exc()
        return

    # ── Phase 2: Analyst ──
    print("\n--- Phase 2: Analyst ---")
    start = time.time()

    try:
        ctx = build_context(probe_output)
        analyst_state = {
            "user_input": USER_INPUT,
            "probe_output": probe_output,
            "analyst_context": ctx,
        }
        analyst_result = analyst_node(analyst_state)
        analyst_time = time.time() - start
        analyst_output = analyst_result.get("analyst_output", {})
        print(f"Analyst 完成: {analyst_time:.1f}s")

        # 验证
        a_issues = validate_analyst_output(analyst_output)
        if a_issues:
            print(f"验证问题: {len(a_issues)} 个")
            for issue in a_issues:
                print(f"  - {issue}")
        else:
            print("验证通过 ✓")

        # 关键指标
        print(f"\nAnalyst 输出:")
        print(f"  one_line_verdict: {analyst_output.get('one_line_verdict', 'N/A')}")
        print(f"  diagnosis: {analyst_output.get('diagnosis', {}).get('core_problem', 'N/A')}")
        print(f"  actions count: {len(analyst_output.get('actions', []))}")
        print(f"  b_class_perception: {json.dumps(analyst_output.get('b_class_perception', {}), ensure_ascii=False, indent=2)}")
        print(f"  c_class_matrix: {json.dumps(analyst_output.get('c_class_matrix', {}), ensure_ascii=False, indent=2)}")

    except Exception as e:
        print(f"Analyst 失败: {e}")
        import traceback
        traceback.print_exc()
        return

    # ── 汇总 ──
    total_time = probe_time + analyst_time
    print(f"\n=== 测试完成 ===")
    print(f"总耗时: {total_time:.1f}s (Probe {probe_time:.1f}s + Analyst {analyst_time:.1f}s)")


if __name__ == "__main__":
    asyncio.run(run_test())
