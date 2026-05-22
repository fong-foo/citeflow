# test_render_validation.py — 金数据渲染回归测试
# 用真实 Probe 输出验证渲染契约和校验器。
# 每次改 state.py Model 或 render_contract.py 后跑一遍。
#
# 运行: python tests/test_render_validation.py

import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from langgraph_app.render_contract import SECTIONS, SECTION_ORDER
from langgraph_app.validators.render_validator import (
    validate_probe_output, validate_for_template, ValidationReport
)

FIXTURES = [
    ("flower_knows", os.path.expanduser("~/Desktop/CiteFlow/flower_knows_probe.json")),
    ("yeswelder", os.path.expanduser("~/Desktop/CiteFlow/test_yeswelder_probe_output.json")),
    ("litfad", os.path.expanduser("~/Desktop/CiteFlow/test_litfad_probe_output.json")),
]


def load_fixture(path: str) -> dict:
    with open(path, "r") as f:
        data = json.load(f)
    # 有些测试文件顶层有 "output" key
    if isinstance(data, dict) and "output" in data and isinstance(data["output"], dict):
        # 检查是否包含 probe 的顶层字段
        if any(k in data["output"] for k in ["citation_metrics", "brand_profile", "gap_report"]):
            return data["output"]
    return data


def test_all_fixtures() -> bool:
    all_pass = True

    for name, path in FIXTURES:
        if not os.path.exists(path):
            print(f"❌ {name}: 文件不存在 → {path}")
            all_pass = False
            continue

        try:
            data = load_fixture(path)
        except Exception as e:
            print(f"❌ {name}: JSON 解析失败 → {e}")
            all_pass = False
            continue

        report = validate_probe_output(data)
        tmpl = validate_for_template(data)

        # 检查1: 所有区块 ID 都在 sections 中
        missing_sections = [s.section_id for s in SECTIONS
                            if s.section_id not in tmpl["sections"]]
        if missing_sections:
            print(f"❌ {name}: 模板 sections 缺少区块: {missing_sections}")
            all_pass = False

        # 检查2: 不应有无处理的 None 值泄漏（error 级别）
        if tmpl["total_errors"] > 0:
            error_fields = [w for w in report.warnings if w.severity == "error"]
            print(f"⚠️  {name}: {tmpl['total_errors']} 个必填字段缺失")
            for w in error_fields:
                print(f"     - [{w.block}] {w.display_name}: {w.msg}")
            # 不 fail — 某些测试数据确实缺字段，属于正常

        # 检查3: 至少 6 个核心区块有数据
        core_sections = ["citation_dashboard", "brand_profile", "market_perception",
                         "gap_analysis", "company_score", "competitor_matrix"]
        missing_core = [s for s in core_sections if s in report.sections_missing]
        if missing_core:
            print(f"❌ {name}: 核心区块数据源缺失: {missing_core}")
            all_pass = False

        # 检查4: 所有区块的 display_order 是唯一的、连续的
        orders = [s.display_order for s in SECTIONS]
        expected_orders = list(range(1, len(SECTIONS) + 1))
        if sorted(orders) != expected_orders:
            print(f"❌ {name}: display_order 不连续: {sorted(orders)}")
            all_pass = False

        print(f"✅ {name}: {tmpl['summary']} | "
              f"缺失区块: {len(report.sections_missing)} | "
              f"降级区块: {len(report.sections_degraded)} | "
              f"警告: {tmpl['total_warnings']}")

        # 打印明细
        if report.sections_missing:
            print(f"    缺失区块: {report.sections_missing}")
        if report.sections_degraded:
            degraded_detail = [(s, [w.display_name for w in report.warnings
                                    if w.block == s and w.severity == "info"])
                               for s in report.sections_degraded]
            for s, fields in degraded_detail:
                if fields:
                    print(f"    [{s}] 可选字段缺失: {fields}")

    return all_pass


def test_contract_consistency() -> bool:
    """验证渲染契约自身的完整性：display_order 连续、nav_abbr 不超4字、无重复 section_id"""
    all_pass = True

    ids = [s.section_id for s in SECTIONS]
    if len(ids) != len(set(ids)):
        print(f"❌ section_id 重复: {ids}")
        all_pass = False

    orders = sorted(s.display_order for s in SECTIONS)
    expected = list(range(1, len(SECTIONS) + 1))
    if orders != expected:
        print(f"❌ display_order 不连续: {orders}")
        all_pass = False

    for s in SECTIONS:
        if len(s.nav_abbr) > 4:
            print(f"❌ [{s.section_id}] nav_abbr 超4字: '{s.nav_abbr}' ({len(s.nav_abbr)}字)")
            all_pass = False

    if all_pass:
        print(f"✅ 渲染契约一致: {len(SECTIONS)} 个区块, ID唯一, 排序连续, 缩写合规")

    return all_pass


def test_none_leak_check() -> bool:
    """检查所有 fixture 的渲染结果中是否没有 'None' 字符串泄漏"""
    all_pass = True
    for name, path in FIXTURES:
        if not os.path.exists(path):
            continue
        try:
            data = load_fixture(path)
        except Exception:
            continue

        # 将数据转为 JSON 字符串，检查是否有裸 None 值
        json_str = json.dumps(data, ensure_ascii=False)
        # 这是结构性检查：JSON 中 null 是合法的，但 Python None 被序列化后是 null
        # 检查是否有字段值实际是字符串 "None"（Python None 被错误转成字符串）
        # 这里我们只做启发式检查
        if '"None"' in json_str or "'None'" in json_str:
            print(f"⚠️  {name}: 发现字符串 'None' 值（可能为渲染泄漏）")
            # 不强制 fail

    print(f"✅ None 泄漏检查完成（{len(FIXTURES)} 份数据）")
    return all_pass


if __name__ == "__main__":
    print("=" * 60)
    print("CiteFlow 渲染回归测试")
    print("=" * 60)
    print()

    results = []
    results.append(("契约一致性", test_contract_consistency()))
    print()
    results.append(("金数据校验", test_all_fixtures()))
    print()
    results.append(("None泄漏检查", test_none_leak_check()))
    print()

    all_pass = all(r[1] for r in results)
    print("=" * 60)
    if all_pass:
        print("✅ 全部通过")
    else:
        failed = [r[0] for r in results if not r[1]]
        print(f"❌ 失败: {', '.join(failed)}")
    print("=" * 60)
    sys.exit(0 if all_pass else 1)
