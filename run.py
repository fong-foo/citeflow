#!/usr/bin/env python3
# run.py — CiteFlow 一键运行
# 用法:
#   python run.py input.json                    # 从 JSON 文件读取输入
#   python run.py input.json --skip-analyst     # 只跑 Probe
#   python run.py input.json --output my_brand  # 自定义输出文件名前缀
#
# JSON 文件格式（8 个字段）:
# {
#   "domain": "flowerknows.co",
#   "brand_name": "Flower Knows",
#   "industry": "彩妆（Color Cosmetics）",
#   "target_market": "全球市场",
#   "core_product": "眼影盘、唇釉、唇膏",
#   "target_positioning": "平价奢华童话彩妆",
#   "seed_queries": ["best eyeshadow palette", ...],
#   "competitors": ["colourpop.com", "romand.us"]
# }

import argparse
import json
import sys
import time
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from langgraph_app.nodes.probe_node import probe_node
from langgraph_app.nodes.analyst_node import analyst_node
from langgraph_app.tools.data_store import init_db, save_run
from validate_report import validate_probe_output, validate_analyst_output


def load_input(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    required = ["domain", "brand_name", "industry", "target_market",
                "core_product", "target_positioning", "seed_queries"]
    missing = [k for k in required if k not in data]
    if missing:
        print(f"❌ JSON 缺少必填字段: {', '.join(missing)}")
        sys.exit(1)

    data.setdefault("competitors", [])
    return data


def run_probe(ui: dict) -> dict:
    state = {
        "user_input": ui,
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
    state = probe_node(state)
    return state


def run_analyst(state: dict) -> dict:
    return analyst_node(state)


def main():
    parser = argparse.ArgumentParser(description="CiteFlow — AI 引用率检测与诊断")
    parser.add_argument("input", help="输入 JSON 文件路径")
    parser.add_argument("--output", "-o", default=None,
                        help="输出文件名前缀（默认使用 brand_name）")
    parser.add_argument("--skip-analyst", action="store_true",
                        help="只跑 Probe，跳过 Analyst")
    args = parser.parse_args()

    ui = load_input(args.input)
    brand_name = ui["brand_name"]
    prefix = args.output or brand_name.lower().replace(" ", "_").replace("（", "").replace("）", "")

    # 初始化数据库
    init_db()

    print(f"\n{'='*60}")
    print(f"  CiteFlow: {brand_name} ({ui['domain']})")
    print(f"  行业: {ui['industry']}  |  市场: {ui['target_market']}")
    print(f"  竞品: {len(ui['competitors'])} 个")
    print(f"  时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")

    # ── Probe ──
    print(f"\n[1/{'2' if not args.skip_analyst else '1'}] Probe 运行中...")
    t0 = time.time()
    state = run_probe(ui)
    probe_elapsed = time.time() - t0

    probe = state.get("probe_output", {})
    errors = state.get("errors", {})

    # 关键指标摘要
    bp = probe.get("brand_profile") or {}
    cm = probe.get("citation_metrics") or {}
    cs = probe.get("company_score") or {}
    gr = probe.get("gap_report") or {}
    meta = probe.get("meta") or {}

    print(f"\n{'─'*60}")
    print(f"  Probe 完成 ({probe_elapsed:.0f}s)")
    print(f"{'─'*60}")
    print(f"  品牌画像:  {'✅' if bp.get('value_props') else '⚠️ fallback'}  "
          f"{bp.get('one_liner', 'N/A')[:60]}")
    print(f"  对齐度:    {gr.get('alignment_score', 'N/A')}/100")
    print(f"  引用率:    {cm.get('rate', 0)}%  "
          f"(A={cm.get('industry_rate', 0):.0f}% B={cm.get('brand_rate', 0):.0f}% C={cm.get('competitor_scenario_rate', 0):.0f}%)")
    print(f"  推荐率:    {cm.get('recommendation_rate', 0)}%  "
          f"({cm.get('recommended_count', 0)}/{cm.get('total_queries', 0)})")
    print(f"  综合评分:  {cs.get('overall', 'N/A')}/100")
    print(f"  Token:     {meta.get('total_tokens', 0)}  |  "
          f"预估成本: ${meta.get('total_cost', 0)}")
    if errors:
        print(f"  错误:      {len(errors)} 个 — {list(errors.keys())}")

    # 保存 Probe
    probe_path = f"{prefix}_probe.json"
    with open(probe_path, "w", encoding="utf-8") as f:
        json.dump(probe, f, ensure_ascii=False, indent=2)
    print(f"\n  保存: {probe_path}")

    if args.skip_analyst:
        # 仅 Probe 模式：保存部分数据
        run_id = save_run(
            brand_name=brand_name, domain=ui["domain"],
            industry=ui.get("industry", ""), target_market=ui.get("target_market", ""),
            core_product=ui.get("core_product", ""),
            probe_output=probe, analyst_output=None,
            probe_duration_ms=int(probe_elapsed * 1000),
            status="partial" if errors else "success",
        )
        print(f"  数据库: run_id={run_id}")
        _print_validation(probe, None, prefix)
        return

    # ── Analyst ──
    print(f"\n[2/2] Analyst 运行中...")
    t0 = time.time()
    state = run_analyst(state)
    analyst_elapsed = time.time() - t0

    analyst = state.get("analyst_output", {})

    diag = analyst.get("diagnosis") or {}
    actions = analyst.get("actions") or []
    bcp = analyst.get("b_class_perception") or {}
    ct = analyst.get("content_templates")

    print(f"\n{'─'*60}")
    print(f"  Analyst 完成 ({analyst_elapsed:.0f}s)")
    print(f"{'─'*60}")
    print(f"  核心问题:  {diag.get('core_problem', 'N/A')[:80]}")
    print(f"  严重程度:  {diag.get('severity', 'N/A')}")
    print(f"  一句话:    {analyst.get('one_line_verdict', 'N/A')[:80]}")
    print(f"  行动建议:  {len(actions)} 条 ({', '.join(a.get('priority', '?') for a in actions)})")
    print(f"  内容模板:  {'✅' if ct else '❌ 无（brand_profile fallback 导致）'}")
    print(f"  B类画像:   {'✅' if bcp.get('ai_identity') else '❌'}")

    # 保存 Analyst
    analyst_path = f"{prefix}_analyst.json"
    with open(analyst_path, "w", encoding="utf-8") as f:
        json.dump(analyst, f, ensure_ascii=False, indent=2)
    print(f"\n  保存: {analyst_path}")

    # 存入数据库
    run_id = save_run(
        brand_name=brand_name, domain=ui["domain"],
        industry=ui.get("industry", ""), target_market=ui.get("target_market", ""),
        core_product=ui.get("core_product", ""),
        probe_output=probe, analyst_output=analyst,
        probe_duration_ms=int(probe_elapsed * 1000),
        analyst_duration_ms=int(analyst_elapsed * 1000),
        status="success" if not errors else "partial",
    )
    print(f"  数据库: run_id={run_id}")

    # 验证
    _print_validation(probe, analyst, prefix)


def _print_validation(probe: dict, analyst: dict | None, prefix: str):
    probe_checks, cm = validate_probe_output(probe)
    all_checks = list(probe_checks)
    if analyst:
        all_checks += validate_analyst_output(analyst, cm)

    passed = sum(1 for c in all_checks if c["status"] == "PASS")
    failed = [c for c in all_checks if c["status"] == "FAIL"]

    print(f"\n{'─'*60}")
    print(f"  验证: {passed}/{len(all_checks)} 通过" + (" ✅" if not failed else " ❌"))
    for c in failed:
        print(f"    ❌ {c['check']}: {c.get('detail', '')}")
    print(f"{'─'*60}")

    print(f"\n  输出文件: {prefix}_probe.json" +
          (f", {prefix}_analyst.json" if analyst else ""))
    print(f"  Done.\n")


if __name__ == "__main__":
    main()
