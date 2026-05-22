# analyst_context.py — ProbeOutput → LLM 诊断上下文
# 纯数据瘦身 + 格式化。不判断，不预计算规则，不替代 LLM 推理。

from langgraph_app.config import INDUSTRY_BENCHMARKS
from langgraph_app.tools.brand_profiler import map_industry_category

DIFFICULTY_MAP = {
    "品牌力": "中等",
    "产品力": "最难",
    "内容力": "容易",
    "技术力": "难",
    "市场力": "难",
}

HIGH_AUTH_PLATFORMS = {
    "g2.com", "capterra.com", "gartner.com", "forrester.com",
    "trustradius.com", "getapp.com", "trustpilot.com",
}


def build_context(probe_output: dict) -> dict:
    """瘦身 ProbeOutput，输出 LLM 易读的结构化数据。

    不负责：规则触发判断、问题识别、严重程度判定
    只负责：提取关键数字、格式化表格、标记缺失平台
    """
    bp = probe_output.get("brand_profile") or {}
    cs = probe_output.get("company_score") or {}
    gr = probe_output.get("gap_report") or {}
    cm = probe_output.get("citation_metrics") or {}
    sa = probe_output.get("source_authority") or {}
    comp = probe_output.get("competitor_analysis") or {}

    brand_name = bp.get("brand_name", "未知品牌")
    industry = cs.get("industry", "未指定行业")
    weights = cs.get("weights_used", {})

    # 数据完整度检测（读 ProbeOutput.data_completeness 结构字段）
    dc = probe_output.get("data_completeness", "complete")
    completeness_note = ""
    if dc == "search_timeout":
        completeness_note = (
            "⚠️ 搜索数据缺失：搜索管道超时，以下数据未采集到（不代表品牌真实情况）：\n"
            "- 引用率数据（citation_metrics）为空\n"
            "- 市场感知数据（market_perception）为空\n"
            "- 差距分析数据（gap_report）为空\n"
            "- 评分数据（company_score）为空\n"
            "请基于已有数据（brand_profile + competitor_analysis）进行分析，\n"
            "并在诊断中标注「数据不完整，建议重试」。"
        )
    elif dc == "circuit_open":
        completeness_note = (
            "⚠️ 搜索数据缺失：API熔断触发，搜索管道未执行。\n"
            "以下数据未采集：引用率、市场感知、差距分析、评分。\n"
            "请基于已有数据进行分析，并标注「数据不完整」。"
        )
    elif dc == "cost_guardrail":
        completeness_note = (
            "⚠️ 搜索数据可能不完整：Token预算超支（>150K），搜索管道提前终止。\n"
            "请标注「数据可能不完整」并基于已有数据分析。"
        )

    # ── 引用源明细 ────────────────────────────────
    top_sources = sa.get("top_sources", [])
    total_mentions = sum(s.get("mention_count", 0) for s in top_sources)
    sources_formatted = []
    for s in top_sources[:10]:
        mc = s.get("mention_count", 0)
        pct = round(mc / total_mentions * 100) if total_mentions > 0 else 0
        sources_formatted.append({
            "domain": s.get("domain", ""),
            "type": s.get("source_type", "其他"),
            "authority_score": s.get("authority_score", 0),
            "mention_count": mc,
            "percentage": pct,
        })

    # 缺失的高权威平台（只标记，不判断）
    existing_domains = {s.get("domain", "") for s in top_sources}
    missing_platforms = [p for p in HIGH_AUTH_PLATFORMS if not any(p in d for d in existing_domains)]

    # ── 评分维度 ──────────────────────────────────
    dimensions = cs.get("dimensions", [])
    score_dimensions = []
    for d in dimensions:
        dim_name = d.get("name", "")
        score_dimensions.append({
            "name": dim_name,
            "score": d.get("score", 0),
            "weight": weights.get(dim_name, 0.2),
            "difficulty": DIFFICULTY_MAP.get(dim_name, "中等"),
            "evidence": d.get("evidence", ""),
        })

    # ── 竞品摘要 ──────────────────────────────────
    comp_wins = sum(1 for c in comp if c.get("winner", "").lower() == brand_name.lower())
    comp_losses = sum(1 for c in comp if c.get("winner", "").lower() not in (brand_name.lower(), "tie", "unknown", ""))
    comp_losing_queries = [
        {"query": c.get("query", ""), "winner": c.get("winner", ""), "reason": c.get("reason", "")}
        for c in comp if c.get("winner", "").lower() not in (brand_name.lower(), "tie", "unknown", "")
    ]

    # ── 维度打分矩阵 ──────────────────────────────────
    dimension_matrix = []
    null_score_count = 0
    total_ranking_count = 0
    for c in comp:
        query = c.get("query", "")
        for ds in c.get("dimension_scores", []):
            for r in ds.get("rankings", []):
                total_ranking_count += 1
                if r.get("score") is None:
                    null_score_count += 1
            dimension_matrix.append({
                "query": query,
                "dimension": ds.get("dimension", ""),
                "rankings": ds.get("rankings", []),
                "importance": ds.get("importance", ""),
            })

    # 维度数据质量（供规则14判断数据充足度）
    dimension_data_quality = {
        "total_rankings": total_ranking_count,
        "null_score_count": null_score_count,
        "null_ratio": round(null_score_count / total_ranking_count * 100) if total_ranking_count > 0 else 0,
        "note": f"{null_score_count}/{total_ranking_count} 条维度打分数证据不足（score=null）" if null_score_count > 0 else "所有维度打分数据充足",
    }

    competitor_summary = {
        "has_data": len(comp) > 0,
        "total_comparisons": len(comp),
        "wins": comp_wins,
        "losses": comp_losses,
        "losing_queries": comp_losing_queries,
        "dimension_matrix": dimension_matrix,
        "dimension_data_quality": dimension_data_quality,
        "competitor_details": cm.get("competitor_citation_detail", {}),
    }

    # ── 偏差与盲点 ────────────────────────────────
    gap_summary = {
        "alignment_score": gr.get("alignment_score", 0),
        "one_line_summary": gr.get("one_line_summary", ""),
        "misaligned": gr.get("misaligned", []),
        "blind_spots": gr.get("blind_spots", []),
        "opportunities": gr.get("opportunities", []),
    }

    # ── AI 感知 vs 品牌自述 ───────────────────────
    mp = probe_output.get("market_perception") or {}
    an = probe_output.get("ai_narrative") or {}
    # 品牌自述（从官网提取的真实定位）— 供规则13做偏差分析
    brand_self = {
        "one_liner": bp.get("one_liner", ""),
        "value_props": bp.get("value_props", []),
        "differentiators": bp.get("differentiators", []),
    }
    perception_vs_self = {
        "ai_think_you_are": mp.get("perceived_identity", ""),
        "ai_think_your_strengths": mp.get("perceived_strengths", []),
        "ai_think_your_weaknesses": mp.get("perceived_weaknesses", []),
        "ai_positioning": mp.get("perceived_positioning", ""),
        "brand_self_identity": brand_self["one_liner"],
        "brand_self_value_props": brand_self["value_props"],
        "brand_self_differentiators": brand_self["differentiators"],
        "you_want_ai_to_say": an.get("ideal_description", ""),
        "your_desired_keywords": an.get("keywords", []),
        "what_ai_should_avoid_saying": an.get("avoid", []),
    }

    # ── 行业基准映射 ──────────────────────────────────
    industry_category = map_industry_category(industry)
    benchmark = INDUSTRY_BENCHMARKS.get(industry_category, INDUSTRY_BENCHMARKS["_default"])

    # ── 维度聚合结果（供规则6和briefing使用）────────────
    dimension_aggregation = _aggregate_dimensions(
        dimension_matrix=competitor_summary.get("dimension_matrix", []),
        brand_name=brand_name,
        dimension_data_quality=competitor_summary.get("dimension_data_quality", {})
    )

    return {
        "brand_name": brand_name,
        "industry": industry,
        "industry_category": industry_category,
        "benchmark": benchmark,
        "data_completeness": dc,
        "completeness_note": completeness_note,
        "metrics": {
            "overall_score": cs.get("overall", 0),
            "alignment_score": gr.get("alignment_score", 0),
            "citation_rate": cm.get("rate", 0),
            "citation_detail": f"{cm.get('mentioned_count', 0)}/{cm.get('total_queries', 0)} 个查询提及",
            "industry_rate": cm.get("industry_rate", 0),
            "brand_rate": cm.get("brand_rate", 0),
            "competitor_scenario_rate": cm.get("competitor_scenario_rate", 0),
            "industry_count": cm.get("industry_count", 0),
            "brand_count": cm.get("brand_count", 0),
            "competitor_count": cm.get("competitor_count", 0),
            "recommendation_rate": cm.get("recommendation_rate", 0),
            "recommended_count": cm.get("recommended_count", 0),
            "source_diversity": sa.get("source_diversity", 0),
            "total_sources": sa.get("total_sources", 0),
            "industry_weights": weights,
            "engine_gpt_rate": _get_engine_rate(probe_output, "gpt"),
            "engine_gemini_rate": _get_engine_rate(probe_output, "gemini"),
            "engine_haiku_rate": _get_engine_rate(probe_output, "haiku"),
        },
        "source_breakdown": {
            "top_sources": sources_formatted,
            "missing_platforms": missing_platforms,
            "official_site_ratio": cm.get("official_site_ratio", 0),
            "third_party_ratio": cm.get("third_party_ratio", 0),
        },
        "score_dimensions": score_dimensions,
        "competitor_summary": competitor_summary,
        "gap_summary": gap_summary,
        "perception_vs_self": perception_vs_self,
        "engine_results": {
            engine: {
                "citation_rate": result.get("citation_rate", 0),
                "recommendation_rate": result.get("recommendation_rate", 0),
                "sources": result.get("sources", {}),
                "queries": result.get("queries", []),
            }
            for engine, result in probe_output.get("engine_results", {}).items()
        },
        "dimension_aggregation": dimension_aggregation,
    }


def _aggregate_dimensions(dimension_matrix: list, brand_name: str, dimension_data_quality: dict) -> dict:
    """聚合维度打分矩阵：每个维度的品牌平均分 + gap。

    Args:
        dimension_matrix: 从 competitor_summary["dimension_matrix"] 获取
        brand_name: 从 build_context 的 brand_name 变量传入
        dimension_data_quality: 从 competitor_summary["dimension_data_quality"] 获取

    Returns:
        {
            "dimensions": [...],
            "losing_dimensions": [...],   # gap < -20
            "winning_dimensions": [...],  # gap > 20
            "data_quality": {...}
        }
    """
    dim_map = {}
    for dm in dimension_matrix:
        dim_name = dm.get("dimension", "")
        if dim_name not in dim_map:
            dim_map[dim_name] = {}
        for r in dm.get("rankings", []):
            brand = r.get("brand", "")
            score = r.get("score")
            if score is None:
                continue
            if brand not in dim_map[dim_name]:
                dim_map[dim_name][brand] = []
            dim_map[dim_name][brand].append(score)

    dimensions = []
    losing = []
    winning = []

    for dim_name, brands in dim_map.items():
        brand_avg = {b: round(sum(s) / len(s)) for b, s in brands.items()}

        user_score = None
        comp_scores = []
        for b, s in brand_avg.items():
            b_normalized = b.lower().strip()
            brand_normalized = brand_name.lower().strip()
            is_match = b_normalized == brand_normalized
            if not is_match and len(brand_name) >= 3:
                is_match = (b_normalized.startswith(brand_normalized + " ")
                           or b_normalized.startswith(brand_normalized + "."))
            if brand_name and is_match:
                user_score = s
            else:
                comp_scores.append(s)

        comp_avg = round(sum(comp_scores) / len(comp_scores)) if comp_scores else None
        gap = (user_score - comp_avg) if (user_score is not None and comp_avg is not None) else None

        if gap is not None:
            if gap > 20:
                severity = "重大优势"
                winning.append({"dimension": dim_name, "brand_score": user_score,
                                "competitor_avg_score": comp_avg, "gap": gap})
            elif gap < -20:
                severity = "重大劣势"
                losing.append({"dimension": dim_name, "brand_score": user_score,
                               "competitor_avg_score": comp_avg, "gap": gap})
            elif gap > 10:
                severity = "中等优势"
            elif gap < -10:
                severity = "中等劣势"
            else:
                severity = "势均力敌"
        else:
            severity = "数据不足"

        dimensions.append({
            "name": dim_name,
            "brand_scores": brand_avg,
            "brand_avg": user_score,
            "competitor_avg": comp_avg,
            "gap": gap,
            "severity": severity,
        })

    return {
        "dimensions": dimensions,
        "losing_dimensions": losing,
        "winning_dimensions": winning,
        "data_quality": dimension_data_quality,
    }


def _get_engine_rate(probe_output: dict, engine_name: str) -> float:
    er = probe_output.get("engine_results", {})
    eng = er.get(engine_name, {})
    return eng.get("citation_rate", 0) if isinstance(eng, dict) else 0
