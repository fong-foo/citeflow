# analyst_rules.py — 规则引擎
# 15条规则：12条条件触发（1/2/3/4/6/8/9/10/12/13/14/15）+ 4条分析框架（5/7/11/16）
# 规则8/9 来自2026-05-29玄老精读（paper_011/012/019/020/021）
# 规则15 来自2026-05-29玄老精读（paper_022-037 风险操纵+测量评估+方法优化）
# 分析框架规则（5/7/11/16）不进 detect_rules，放在 analyst_prompt.py 的 ANALYSIS_GUIDE 里。


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
                check_rule_6, check_rule_8, check_rule_9, check_rule_10,
                check_rule_12, check_rule_13, check_rule_14, check_rule_15]
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


# ── 12个条件触发规则 ──────────────────────────────────────

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


def check_rule_8(ctx: dict) -> dict | None:
    """引用不稳定：跨引擎源重叠率(Jaccard) < 0.35

    语义：多AI引擎引用的来源高度不一致，说明品牌内容在不同引擎间曝光随机。
    来源：paper_014(Don't Measure Once) + paper_021(Beyond RAG RAG概率性缺陷)
    """
    er = ctx.get("engine_results", {})
    if not er or len(er) < 2:
        return None
    # 计算跨引擎源重叠率：所有引擎的top_sources取交集/并集
    all_sources = []
    for eng_data in er.values():
        tops = eng_data.get("top_sources", [])
        if tops:
            all_sources.append(set(tops))
    if len(all_sources) < 2:
        return None
    intersection = all_sources[0]
    union = all_sources[0].copy()
    for s in all_sources[1:]:
        intersection = intersection & s
        union = union | s
    jaccard = len(intersection) / len(union) if union else 1.0
    if jaccard < 0.35:
        return {"rule_id": 8, "name": "引用不稳定", "severity": "warning",
                "evidence": f"跨引擎源重叠率{jaccard:.0%} < 35%，RAG检索高度随机",
                "data": {"source_jaccard": round(jaccard, 2), "engine_count": len(all_sources)}}
    return None


def check_rule_9(ctx: dict) -> dict | None:
    """多模态盲区：视觉密集型行业 且 VLM引擎引用率 < 阈值

    语义：品牌所在行业依赖视觉（时尚/美妆/家居），但在VLM搜索引擎中引用率偏低。
    来源：paper_011(Multimodal GEO) — VLM搜索引擎对图像质量+图文一致性高度敏感
    """
    m = ctx["metrics"]
    industry = ctx.get("industry", "").lower()
    visual_industries = ["fashion", "beauty", "home", "outdoor", "dtc-fashion", "美妆", "时尚", "家居", "cosmetics", "彩妆", "化妆品", "化妆", "skincare", "护肤"]
    is_visual = any(vi in industry for vi in visual_industries)
    if not is_visual:
        return None
    # VLM引擎 = 有vision能力的引擎（目前用Gemini做proxy，未来可扩展）
    er = ctx.get("engine_results", {})
    vlm_rate = None
    for eng_name in ["gemini", "gpt"]:  # Gemini多模态最强，GPT也有视觉能力
        ed = er.get(eng_name, {})
        if ed:
            r = ed.get("citation_rate", 0)
            if vlm_rate is None or r < vlm_rate:
                vlm_rate = r
    if vlm_rate is not None and vlm_rate < 20:
        return {"rule_id": 9, "name": "多模态盲区", "severity": "warning",
                "evidence": f"视觉密集型行业({industry})但VLM引擎引用率{vlm_rate}% < 20%",
                "data": {"industry": industry, "vlm_citation_rate": vlm_rate}}
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


def check_rule_15(ctx: dict) -> dict | None:
    """竞品异常占位：竞品引用率高但权威源占比低

    语义：竞品在AI搜索中获得异常高的引用率，但其引用源权威度偏低——可能是对抗优化手段。
    来源：paper_022(Adversarial SEO), paper_026(STS Injection), paper_030(StealthRank)
    """
    comp = ctx.get("competitor_summary", {})
    if not comp.get("has_data"):
        return None
    # 方案1: 从competitor_details获取竞品引用数据
    details = comp.get("competitor_details", {})
    if details:
        suspicious = []
        bm = ctx.get("benchmark", {})
        p75 = bm.get("citation_rate", {}).get("p75", 60)
        for name, data in details.items():
            if isinstance(data, dict):
                c_rate = data.get("citation_rate", 0)
                c_auth = data.get("authority_score", data.get("avg_authority", 0))
                if c_rate > p75 and c_auth < 50:
                    suspicious.append({"name": name, "citation_rate": c_rate, "authority_score": c_auth})
        if suspicious:
            names = ", ".join(s["name"] for s in suspicious[:3])
            return {"rule_id": 15, "name": "竞品异常占位", "severity": "info",
                    "evidence": f"{len(suspicious)}个竞品引用率异常高于权威源——可能存在对抗优化: {names}",
                    "data": {"suspicious_competitors": suspicious}}
    # 方案2: 从losing_queries推断——大量输给低权威竞品
    losing = comp.get("losing_queries", [])
    if len(losing) >= 3:
        losers = set()
        for lq in losing:
            w = lq.get("winner", "")
            if w and w.lower() not in ("tie", "unknown", ""):
                losers.add(w)
        if losers:
            return {"rule_id": 15, "name": "竞品异常占位", "severity": "info",
                    "evidence": f"在{len(losing)}个查询中输给{len(losers)}个竞品——建议检查竞品是否使用对抗优化",
                    "data": {"losing_competitors": list(losers), "losing_query_count": len(losing)}}
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

    # 跨引擎源重叠率（paper_021: RAG概率性缺陷）
    er = ctx.get("engine_results", {})
    if er and len(er) >= 2:
        all_sources = []
        for ed in er.values():
            tops = ed.get("top_sources", [])
            if tops: all_sources.append(set(tops))
        if len(all_sources) >= 2:
            inter = all_sources[0]
            uni = all_sources[0].copy()
            for s in all_sources[1:]:
                inter = inter & s
                uni = uni | s
            jaccard = len(inter) / len(uni) if uni else 1.0
            if jaccard < 0.35:
                anomalies.append(f"跨引擎源重叠率仅{round(jaccard*100)}%——AI对你的引用高度随机，不同引擎今天引用不同的来源")

    # 竞品异常占位（paper_022/026: 对抗优化手段导致引用率虚高但权威不足）
    comp_summary = ctx.get("competitor_summary", {})
    if comp_summary.get("has_data"):
        competitors = comp_summary.get("competitors", [])
        p75 = ctx.get("benchmark", {}).get("citation_rate", {}).get("p75", 60)
        for c in competitors:
            if c.get("citation_rate", 0) > p75 + 20 and c.get("authority_score", 100) < 50:
                anomalies.append(f"竞品{c.get('name','?')}引用率{c.get('citation_rate',0)}%远超行业P75({p75}%)但权威分仅{c.get('authority_score',0)}——可能存在对抗优化或品牌泡沫")

    # 引用准确性（paper_035: 被引用≠被准确描述）
    ac = ctx.get("accuracy_check", {})
    mr = ac.get("misrepresentation_rate", 0)
    if mr > 30:
        anomalies.append(f"AI引用内容{mr}%存在描述偏差——被引用但未被准确描述（paper_035:多维度影响力）")

    # 行业位置
    bm = ctx.get("benchmark", {})
    if bm:
        for key in ["citation_rate", "industry_rate"]:
            val = m.get(key, 0)
            p25 = bm.get(key, {}).get("p25", 0)
            if val < p25 and p25 > 0:
                anomalies.append(f"{key}={val}%处于行业后25%（P25={p25}%）")

    return anomalies
