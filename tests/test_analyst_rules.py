# test_analyst_rules.py — Analyst 规则引擎单元测试
# 运行：python test_analyst_rules.py

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langgraph_app.tools.analyst_rules import (
    check_rule_1, check_rule_2, check_rule_3, check_rule_4,
    check_rule_6, check_rule_10, check_rule_12, check_rule_13, check_rule_14,
    detect_rules, _detect_anomalies,
)


def test_rule_1_triggered():
    ctx = {"metrics": {"alignment_score": 45, "industry_rate": 85}}
    assert check_rule_1(ctx) is not None


def test_rule_1_not_triggered():
    ctx = {"metrics": {"alignment_score": 70, "industry_rate": 85}}
    assert check_rule_1(ctx) is None


def test_rule_1_not_triggered_low_rate():
    """对齐度低但行业引用率也低 → 不触发（是品牌隐形而非定位偏差）"""
    ctx = {"metrics": {"alignment_score": 45, "industry_rate": 50}}
    assert check_rule_1(ctx) is None


def test_rule_2_triggered():
    ctx = {"metrics": {"citation_rate": 15}}
    assert check_rule_2(ctx) is not None


def test_rule_2_not_triggered():
    ctx = {"metrics": {"citation_rate": 50}}
    assert check_rule_2(ctx) is None


def test_rule_3_triggered():
    ctx = {
        "metrics": {"citation_rate": 75},
        "source_breakdown": {
            "top_sources": [
                {"domain": "reddit.com", "authority_score": 40, "mention_count": 10},
                {"domain": "g2.com", "authority_score": 85, "mention_count": 2},
            ]
        }
    }
    result = check_rule_3(ctx)
    assert result is not None


def test_rule_3_not_triggered():
    """高权威源占比高 → 不触发"""
    ctx = {
        "metrics": {"citation_rate": 75},
        "source_breakdown": {
            "top_sources": [
                {"domain": "g2.com", "authority_score": 85, "mention_count": 10},
                {"domain": "reddit.com", "authority_score": 40, "mention_count": 2},
            ]
        }
    }
    assert check_rule_3(ctx) is None


def test_rule_3_empty_sources():
    """无引用源 → 不触发"""
    ctx = {
        "metrics": {"citation_rate": 75},
        "source_breakdown": {"top_sources": []}
    }
    assert check_rule_3(ctx) is None


def test_rule_4_triggered():
    ctx = {"metrics": {"citation_rate": 0, "source_diversity": 0.3}}
    assert check_rule_4(ctx) is not None


def test_rule_4_not_triggered():
    ctx = {"metrics": {"citation_rate": 0, "source_diversity": 0.8}}
    assert check_rule_4(ctx) is None


def test_rule_6_triggered():
    ctx = {"dimension_aggregation": {
        "losing_dimensions": [{"dimension": "耐用性", "gap": -25}],
        "winning_dimensions": []
    }}
    result = check_rule_6(ctx)
    assert result is not None
    assert result["rule_id"] == 6


def test_rule_6_not_triggered():
    ctx = {"dimension_aggregation": {
        "losing_dimensions": [],
        "winning_dimensions": [{"dimension": "价格", "gap": 30}]
    }}
    assert check_rule_6(ctx) is None


def test_rule_10_triggered():
    ctx = {"metrics": {"brand_rate": 80, "industry_rate": 10}}
    assert check_rule_10(ctx) is not None


def test_rule_10_not_triggered():
    ctx = {"metrics": {"brand_rate": 30, "industry_rate": 10}}
    assert check_rule_10(ctx) is None


def test_rule_12_not_enough_engines():
    ctx = {"engine_results": {"gpt": {"citation_rate": 80}}}
    assert check_rule_12(ctx) is None


def test_rule_12_triggered():
    ctx = {"engine_results": {
        "gpt": {"citation_rate": 85},
        "haiku": {"citation_rate": 40},
    }}
    result = check_rule_12(ctx)
    assert result is not None
    assert result["data"]["max_diff"] == 45


def test_rule_12_not_triggered():
    ctx = {"engine_results": {
        "gpt": {"citation_rate": 70},
        "haiku": {"citation_rate": 65},
    }}
    assert check_rule_12(ctx) is None


def test_rule_13_min_threshold():
    """B类查询 < 3 条不触发"""
    ctx = {"metrics": {"brand_count": 2}, "perception_vs_self": {"ai_think_you_are": "test"}}
    assert check_rule_13(ctx) is None
    # B类查询 >= 3 条触发
    ctx["metrics"]["brand_count"] = 3
    assert check_rule_13(ctx) is not None


def test_rule_13_no_ai_perception():
    """B类查询够但无 AI 感知数据 → 不触发"""
    ctx = {"metrics": {"brand_count": 5}, "perception_vs_self": {"ai_think_you_are": ""}}
    assert check_rule_13(ctx) is None


def test_rule_14_triggered():
    ctx = {
        "metrics": {"competitor_count": 5},
        "competitor_summary": {"has_data": True}
    }
    assert check_rule_14(ctx) is not None


def test_rule_14_not_triggered():
    ctx = {
        "metrics": {"competitor_count": 2},
        "competitor_summary": {"has_data": True}
    }
    assert check_rule_14(ctx) is None


def test_rule_14_no_data():
    """C类查询够但无竞品数据 → 不触发"""
    ctx = {
        "metrics": {"competitor_count": 5},
        "competitor_summary": {"has_data": False}
    }
    assert check_rule_14(ctx) is None


# ── _detect_anomalies 5个分支独立测试 ────────────────────

def test_anomaly_citation_vs_recommendation_triggered():
    """引用率高但推荐率低 → 标记异常"""
    ctx = {
        "metrics": {"citation_rate": 80, "recommendation_rate": 15,
                    "brand_rate": 50, "industry_rate": 50, "overall_score": 60, "total_sources": 5},
        "source_breakdown": {"top_sources": [], "official_site_ratio": 0.3},
        "competitor_summary": {"dimension_data_quality": {"null_ratio": 10}},
        "benchmark": {},
    }
    anomalies = _detect_anomalies(ctx)
    assert any("推荐率仅15%" in a for a in anomalies)


def test_anomaly_citation_vs_recommendation_not_triggered():
    """推荐率正常 → 不标记"""
    ctx = {
        "metrics": {"citation_rate": 80, "recommendation_rate": 50,
                    "brand_rate": 50, "industry_rate": 50, "overall_score": 60, "total_sources": 5},
        "source_breakdown": {"top_sources": [], "official_site_ratio": 0.3},
        "competitor_summary": {"dimension_data_quality": {"null_ratio": 10}},
        "benchmark": {},
    }
    anomalies = _detect_anomalies(ctx)
    assert not any("推荐率仅" in a for a in anomalies)


def test_anomaly_official_source_triggered():
    """官网引用占比 > 60% → 标记异常"""
    ctx = {
        "metrics": {"citation_rate": 40, "recommendation_rate": 40,
                    "brand_rate": 50, "industry_rate": 50, "overall_score": 60, "total_sources": 5},
        "source_breakdown": {"top_sources": [], "official_site_ratio": 0.75},
        "competitor_summary": {"dimension_data_quality": {"null_ratio": 10}},
        "benchmark": {},
    }
    anomalies = _detect_anomalies(ctx)
    assert any("75%" in a for a in anomalies)


def test_anomaly_official_source_not_triggered():
    """官网引用占比低 → 不标记"""
    ctx = {
        "metrics": {"citation_rate": 40, "recommendation_rate": 40,
                    "brand_rate": 50, "industry_rate": 50, "overall_score": 60, "total_sources": 5},
        "source_breakdown": {"top_sources": [], "official_site_ratio": 0.3},
        "competitor_summary": {"dimension_data_quality": {"null_ratio": 10}},
        "benchmark": {},
    }
    anomalies = _detect_anomalies(ctx)
    assert not any("官网引用占比" in a for a in anomalies)


def test_anomaly_brand_vs_industry_triggered():
    """B类高A类低 → 标记缺乏行业影响力"""
    ctx = {
        "metrics": {"citation_rate": 40, "recommendation_rate": 40,
                    "brand_rate": 80, "industry_rate": 10, "overall_score": 60, "total_sources": 5},
        "source_breakdown": {"top_sources": [], "official_site_ratio": 0.3},
        "competitor_summary": {"dimension_data_quality": {"null_ratio": 10}},
        "benchmark": {},
    }
    anomalies = _detect_anomalies(ctx)
    assert any("缺乏行业影响力" in a for a in anomalies)


def test_anomaly_brand_vs_industry_not_triggered():
    """B类和A类都正常 → 不标记"""
    ctx = {
        "metrics": {"citation_rate": 40, "recommendation_rate": 40,
                    "brand_rate": 80, "industry_rate": 70, "overall_score": 60, "total_sources": 5},
        "source_breakdown": {"top_sources": [], "official_site_ratio": 0.3},
        "competitor_summary": {"dimension_data_quality": {"null_ratio": 10}},
        "benchmark": {},
    }
    anomalies = _detect_anomalies(ctx)
    assert not any("缺乏行业影响力" in a for a in anomalies)


def test_anomaly_data_quality_triggered():
    """维度数据 null_ratio > 30% → 标记证据不足"""
    ctx = {
        "metrics": {"citation_rate": 40, "recommendation_rate": 40,
                    "brand_rate": 50, "industry_rate": 50, "overall_score": 60, "total_sources": 5},
        "source_breakdown": {"top_sources": [], "official_site_ratio": 0.3},
        "competitor_summary": {"dimension_data_quality": {"null_ratio": 45}},
        "benchmark": {},
    }
    anomalies = _detect_anomalies(ctx)
    assert any("45%证据不足" in a for a in anomalies)


def test_anomaly_data_quality_not_triggered():
    """null_ratio 低 → 不标记"""
    ctx = {
        "metrics": {"citation_rate": 40, "recommendation_rate": 40,
                    "brand_rate": 50, "industry_rate": 50, "overall_score": 60, "total_sources": 5},
        "source_breakdown": {"top_sources": [], "official_site_ratio": 0.3},
        "competitor_summary": {"dimension_data_quality": {"null_ratio": 10}},
        "benchmark": {},
    }
    anomalies = _detect_anomalies(ctx)
    assert not any("证据不足" in a for a in anomalies)


def test_anomaly_benchmark_below_p25_triggered():
    """指标低于 P25 → 标记行业后25%"""
    ctx = {
        "metrics": {"citation_rate": 15, "recommendation_rate": 40,
                    "brand_rate": 50, "industry_rate": 10, "overall_score": 60, "total_sources": 5},
        "source_breakdown": {"top_sources": [], "official_site_ratio": 0.3},
        "competitor_summary": {"dimension_data_quality": {"null_ratio": 10}},
        "benchmark": {
            "citation_rate": {"p25": 30, "p50": 50, "p75": 70},
            "industry_rate": {"p25": 25, "p50": 50, "p75": 75},
        },
    }
    anomalies = _detect_anomalies(ctx)
    assert any("citation_rate=15%" in a and "后25%" in a for a in anomalies)
    assert any("industry_rate=10%" in a and "后25%" in a for a in anomalies)


def test_anomaly_benchmark_above_p25_not_triggered():
    """指标高于 P25 → 不标记"""
    ctx = {
        "metrics": {"citation_rate": 60, "recommendation_rate": 40,
                    "brand_rate": 50, "industry_rate": 60, "overall_score": 60, "total_sources": 5},
        "source_breakdown": {"top_sources": [], "official_site_ratio": 0.3},
        "competitor_summary": {"dimension_data_quality": {"null_ratio": 10}},
        "benchmark": {
            "citation_rate": {"p25": 30, "p50": 50, "p75": 70},
            "industry_rate": {"p25": 25, "p50": 50, "p75": 75},
        },
    }
    anomalies = _detect_anomalies(ctx)
    assert not any("后25%" in a for a in anomalies)


def test_detect_rules_integration():
    ctx = {
        "metrics": {"alignment_score": 45, "industry_rate": 85, "citation_rate": 85,
                    "recommendation_rate": 20, "source_diversity": 0.8,
                    "brand_rate": 100, "industry_count": 5, "brand_count": 5,
                    "competitor_count": 5, "overall_score": 62, "total_sources": 10},
        "source_breakdown": {"top_sources": [
            {"domain": "reddit.com", "authority_score": 40, "mention_count": 10}
        ], "official_site_ratio": 0.7},
        "competitor_summary": {"has_data": False, "dimension_data_quality": {}},
        "dimension_aggregation": {"losing_dimensions": [], "winning_dimensions": []},
        "perception_vs_self": {"ai_think_you_are": "budget brand"},
        "engine_results": {},
        "benchmark": {},
        "brand_name": "Test",
    }
    rules = detect_rules(ctx)
    ids = [r["rule_id"] for r in rules["triggered"]]
    assert 1 in ids, f"rule 1 should trigger, got {ids}"
    assert 2 not in ids, "rule 2 should NOT trigger"
    assert rules["severity"] == "critical"
    assert len(rules["key_anomalies"]) > 0


def test_detect_rules_all_healthy():
    """全部指标正常 → 只触发 info 规则（如果数据够）"""
    ctx = {
        "metrics": {"alignment_score": 90, "industry_rate": 90, "citation_rate": 90,
                    "recommendation_rate": 85, "source_diversity": 0.8,
                    "brand_rate": 90, "industry_count": 5, "brand_count": 5,
                    "competitor_count": 5, "overall_score": 85, "total_sources": 20},
        "source_breakdown": {"top_sources": [
            {"domain": "g2.com", "authority_score": 85, "mention_count": 10}
        ], "official_site_ratio": 0.3},
        "competitor_summary": {"has_data": True, "dimension_data_quality": {"null_ratio": 5}},
        "dimension_aggregation": {"losing_dimensions": [], "winning_dimensions": []},
        "perception_vs_self": {"ai_think_you_are": "enterprise platform"},
        "engine_results": {"gpt": {"citation_rate": 90}, "haiku": {"citation_rate": 88}},
        "benchmark": {"citation_rate": {"p25": 30}},
        "brand_name": "Test",
    }
    rules = detect_rules(ctx)
    # healthy: no critical/warning should trigger
    critical_or_warning = [r for r in rules["triggered"] if r["severity"] in ("critical", "warning")]
    assert len(critical_or_warning) == 0, f"unexpected triggers: {critical_or_warning}"
    assert rules["severity"] == "healthy"


if __name__ == "__main__":
    import traceback
    tests = [
        test_rule_1_triggered, test_rule_1_not_triggered, test_rule_1_not_triggered_low_rate,
        test_rule_2_triggered, test_rule_2_not_triggered,
        test_rule_3_triggered, test_rule_3_not_triggered, test_rule_3_empty_sources,
        test_rule_4_triggered, test_rule_4_not_triggered,
        test_rule_6_triggered, test_rule_6_not_triggered,
        test_rule_10_triggered, test_rule_10_not_triggered,
        test_rule_12_not_enough_engines, test_rule_12_triggered, test_rule_12_not_triggered,
        test_rule_13_min_threshold, test_rule_13_no_ai_perception,
        test_rule_14_triggered, test_rule_14_not_triggered, test_rule_14_no_data,
        test_anomaly_citation_vs_recommendation_triggered, test_anomaly_citation_vs_recommendation_not_triggered,
        test_anomaly_official_source_triggered, test_anomaly_official_source_not_triggered,
        test_anomaly_brand_vs_industry_triggered, test_anomaly_brand_vs_industry_not_triggered,
        test_anomaly_data_quality_triggered, test_anomaly_data_quality_not_triggered,
        test_anomaly_benchmark_below_p25_triggered, test_anomaly_benchmark_above_p25_not_triggered,
        test_detect_rules_integration, test_detect_rules_all_healthy,
    ]
    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            print(f"  PASS {test.__name__}")
            passed += 1
        except Exception as e:
            print(f"  FAIL {test.__name__}: {e}")
            traceback.print_exc()
            failed += 1
    print(f"\n{passed}/{len(tests)} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)
