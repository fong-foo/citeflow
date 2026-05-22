# analyst_rules.py — 规则引擎
# 把条件触发规则（1/2/3/4/6/10/12/13/14）的触发条件写成 Python 函数。
# 分析框架规则（5/7/11）不进 detect_rules，放在 analyst_prompt.py 的 ANALYSIS_GUIDE 里。


def detect_rules(ctx: dict) -> dict:
    """检测所有条件触发规则，返回触发列表 + 最高严重程度 + 关键异常。

    Returns:
        {
            "triggered": [
                {"rule_id": 1, "name": "定位偏差", "severity": "critical",
                 "evidence": "...", "data": {...}},
                ...
            ],
            "severity": "critical",  # 最高严重程度
            "key_anomalies": [...]   # 关键异常列表
        }
    """
    checkers = [check_rule_1, check_rule_2, check_rule_3, check_rule_4,
                check_rule_6, check_rule_10, check_rule_12, check_rule_13, check_rule_14]
    triggered = [r for r in (c(ctx) for c in checkers) if r is not None]
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    triggered.sort(key=lambda r: severity_order.get(r.get("severity", "info"), 9))
    overall = "healthy"
    for r in triggered:
        if r["severity"] == "critical":
            overall = "critical"
            break
        if r["severity"] == "warning":
            overall = "warning"
    return {"triggered": triggered, "severity": overall, "key_anomalies": _detect_anomalies(ctx)}


# ── 9个条件触发规则 ──────────────────────────────────────

def check_rule_1(ctx: dict) -> dict | None:
    """定位偏差：对齐度 < 60 且 行业引用率 > 80%

    语义：AI在行业查询中频繁提到你（industry_rate高），但对你的理解与品牌自述不一致（alignment低）。
    注意：不能用总引用率（citation_rate），因为B类查询（直接搜品牌名）AI必然提及，会虚高。
    """
    m = ctx["metrics"]
    if m["alignment_score"] < 60 and m["industry_rate"] > 80:
        return {"rule_id": 1, "name": "定位偏差", "severity": "critical",
                "evidence": f"对齐度{m['alignment_score']} < 60 且行业引用率{m['industry_rate']}% > 80%",
                "data": {"alignment_score": m["alignment_score"], "industry_rate": m["industry_rate"]}}
    return None


def check_rule_2(ctx: dict) -> dict | None:
    """品牌隐形：引用率 < 30%"""
    m = ctx["metrics"]
    if m["citation_rate"] < 30:
        return {"rule_id": 2, "name": "品牌隐形", "severity": "critical",
                "evidence": f"引用率{m['citation_rate']}% < 30%",
                "data": {"citation_rate": m["citation_rate"]}}
    return None


def check_rule_3(ctx: dict) -> dict | None:
    """引用源质量差：引用率 > 60% 且 高权威源占比 < 30%"""
    m = ctx["metrics"]
    sources = ctx["source_breakdown"]
    top = sources.get("top_sources", [])
    if not top:
        return None
    total = sum(s.get("mention_count", 0) for s in top)
    if total == 0:
        return None
    high_auth = sum(s.get("mention_count", 0) for s in top if s.get("authority_score", 0) >= 70)
    ratio = high_auth / total
    if m["citation_rate"] > 60 and ratio < 0.3:
        return {"rule_id": 3, "name": "引用源质量差", "severity": "warning",
                "evidence": f"引用率{m['citation_rate']}%但高权威源占比{ratio:.0%}",
                "data": {"high_auth_ratio": round(ratio, 2)}}
    return None


def check_rule_4(ctx: dict) -> dict | None:
    """引用源单一：source_diversity < 0.5"""
    m = ctx["metrics"]
    if m.get("source_diversity", 1.0) < 0.5:
        return {"rule_id": 4, "name": "引用源单一", "severity": "warning",
                "evidence": f"来源多样性{m['source_diversity']}",
                "data": {"source_diversity": m["source_diversity"]}}
    return None


def check_rule_6(ctx: dict) -> dict | None:
    """竞品维度劣势：存在 gap < -20 的维度"""
    agg = ctx.get("dimension_aggregation", {})
    losing = agg.get("losing_dimensions", [])
    winning = agg.get("winning_dimensions", [])
    if losing:
        return {"rule_id": 6, "name": "竞品维度劣势", "severity": "warning",
                "evidence": f"{len(losing)}个维度存在重大劣势",
                "data": {"losing_dimensions": losing, "winning_dimensions": winning}}
    return None


def check_rule_10(ctx: dict) -> dict | None:
    """行业影响力弱：A类引用率远低于B类"""
    m = ctx["metrics"]
    if m.get("brand_rate", 0) > 50 and m.get("industry_rate", 0) < 20:
        return {"rule_id": 10, "name": "行业影响力弱", "severity": "warning",
                "evidence": f"B类{m['brand_rate']}%但A类{m['industry_rate']}%",
                "data": {"industry_rate": m["industry_rate"], "brand_rate": m["brand_rate"]}}
    return None


def check_rule_12(ctx: dict) -> dict | None:
    """引擎差异异常：最大引用率差异 > 20%"""
    er = ctx.get("engine_results", {})
    if not er or len(er) < 2:
        return None
    rates = [(eng, data.get("citation_rate", 0)) for eng, data in er.items()]
    diff = max(r[1] for r in rates) - min(r[1] for r in rates)
    if diff > 20:
        best = max(rates, key=lambda x: x[1])
        worst = min(rates, key=lambda x: x[1])
        return {"rule_id": 12, "name": "引擎差异异常", "severity": "warning",
                "evidence": f"引用率差异{diff}个百分点",
                "data": {"max_diff": diff, "best": best[0], "worst": worst[0]}}
    return None


def check_rule_13(ctx: dict) -> dict | None:
    """B类AI认知偏差：B类查询 >= 3 条"""
    m = ctx["metrics"]
    pvs = ctx.get("perception_vs_self", {})
    brand_count = m.get("brand_count", 0)
    if brand_count >= 3 and pvs.get("ai_think_you_are"):
        return {"rule_id": 13, "name": "AI认知偏差", "severity": "info",
                "evidence": f"{brand_count}条B类查询数据",
                "data": {}}
    return None


def check_rule_14(ctx: dict) -> dict | None:
    """C类竞品胜负矩阵：C类查询 >= 3 条"""
    m = ctx["metrics"]
    comp = ctx.get("competitor_summary", {})
    competitor_count = m.get("competitor_count", 0)
    if competitor_count >= 3 and comp.get("has_data"):
        return {"rule_id": 14, "name": "竞品胜负矩阵", "severity": "info",
                "evidence": f"{competitor_count}条C类查询数据",
                "data": {}}
    return None


# ── 关键异常检测 ──────────────────────────────────────────

def _detect_anomalies(ctx: dict) -> list[str]:
    """扫描数据，标记关键异常。LLM 针对这些异常做三层洞察。"""
    anomalies = []
    m = ctx["metrics"]
    s = ctx["source_breakdown"]

    # 引用率 vs 推荐率
    if m["citation_rate"] > 50 and m["recommendation_rate"] < 30:
        anomalies.append(f"引用率{m['citation_rate']}%但推荐率仅{m['recommendation_rate']}%——AI提你但不推荐你")

    # 官网引用占比
    official = s.get("official_site_ratio", 0)
    if official > 0.6:
        anomalies.append(f"官网引用占比{round(official * 100)}%，第三方权威源几乎为零")

    # A类 vs B类
    if m.get("brand_rate", 0) > 50 and m.get("industry_rate", 0) < 20:
        anomalies.append(f"B类{m['brand_rate']}%但A类仅{m['industry_rate']}%——缺乏行业影响力")

    # 维度数据质量
    dq = ctx.get("competitor_summary", {}).get("dimension_data_quality", {})
    if dq.get("null_ratio", 0) > 30:
        anomalies.append(f"维度打分{dq['null_ratio']}%证据不足，数据可信度低")

    # 行业位置
    bm = ctx.get("benchmark", {})
    if bm:
        for key in ["citation_rate", "industry_rate"]:
            val = m.get(key, 0)
            p25 = bm.get(key, {}).get("p25", 0)
            if val < p25 and p25 > 0:
                anomalies.append(f"{key}={val}%处于行业后25%（P25={p25}%）")

    return anomalies
