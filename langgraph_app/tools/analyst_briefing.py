# analyst_briefing.py — 诊断briefing生成
# 从 analyst_node.py 的 _build_user_message 重构，输出"诊断briefing"格式。
# 旧格式：给原材料，LLM自己找异常
# 新格式：给已标注的异常 + 预计算的维度聚合，LLM只需解释

import json
from langgraph_app.tools.analyst_prompt import build_rule_section
from langgraph_app.tools.knowledge_loader import get_knowledge_for_rules
from langgraph_app.tools.data_store import get_last_run


def build_briefing(ctx: dict, rules: dict) -> str:
    """组装诊断briefing格式的 user message。

    结构：
    1. 品牌信息
    2. 已触发规则 + 分析框架（由 build_rule_section 生成）
    3. 关键异常（由 detect_rules 生成）
    4. 关键指标
    5. 行业基准（只给原始值 + P50/P25/P75，不给"中上/领先"判断）
    6. AI认知 vs 品牌自述
    7. 引用源明细
    8. 评分维度
    9. 竞品对比（使用 dimension_aggregation，标注 gap + 严重程度）
    10. 引擎对比
    11. B/C 类分析提示
    """
    metrics = ctx["metrics"]
    sources = ctx["source_breakdown"]
    dims = ctx["score_dimensions"]
    comp = ctx["competitor_summary"]
    gap = ctx["gap_summary"]
    pvs = ctx["perception_vs_self"]

    parts = []

    # 数据完整性提示
    completeness_note = ctx.get("completeness_note", "")
    if completeness_note:
        parts.append(completeness_note)
        parts.append("")

    # 品牌信息
    parts.extend([
        f"品牌: {ctx['brand_name']} | 行业: {ctx['industry']}",
        "",
    ])

    # ── 历史对比（仅当有历史数据时）──
    history_section = _build_history_section(ctx["brand_name"], metrics)
    if history_section:
        parts.append(history_section)
        parts.append("")

    # ── 已触发规则 + 分析框架 ──
    triggered = rules.get("triggered", [])
    rule_section = build_rule_section(triggered)
    if rule_section:
        parts.append(rule_section)
        parts.append("")

    # ── 引擎知识库注入 ──
    knowledge_text = get_knowledge_for_rules(triggered)
    if knowledge_text:
        parts.append(knowledge_text)
        parts.append("")

    # ── 关键异常 ──
    anomalies = rules.get("key_anomalies", [])
    if anomalies:
        parts.append("=== 关键异常 ===")
        for i, a in enumerate(anomalies, 1):
            parts.append(f"{i}. {a}")
        parts.append("")

    # ── 关键指标 ──
    parts.extend([
        "=== 关键指标 ===",
        f"综合评分: {metrics['overall_score']}/100",
        f"对齐度（品牌自述 vs AI认知）: {metrics['alignment_score']}/100",
        f"引用率: {metrics['citation_rate']}%（{metrics['citation_detail']}）",
        f"  分类引用率: A(行业通用)={metrics['industry_rate']}% | B(品牌直接)={metrics['brand_rate']}% | C(竞品主导)={metrics['competitor_scenario_rate']}%",
        f"  查询分布: A类={metrics.get('industry_count', 0)}个 | B类={metrics.get('brand_count', 0)}个 | C类={metrics.get('competitor_count', 0)}个",
        f"  推荐率: {metrics['recommendation_rate']}%（{metrics['recommended_count']} 个查询被真正推荐）",
        f"  官网引用占比: {round(sources['official_site_ratio'] * 100)}%（第三方占比: {round(sources['third_party_ratio'] * 100)}%）",
        f"来源多样性: {metrics['source_diversity']}（共 {metrics['total_sources']} 个来源）",
        f"行业权重: {json.dumps(metrics['industry_weights'], ensure_ascii=False)}",
    ])

    # ── 行业基准（只给原始值 + P50/P25/P75，不给判断）──
    benchmark = ctx.get("benchmark", {})
    industry_category = ctx.get("industry_category", "_default")
    if benchmark and industry_category != "_default":
        parts.extend([
            "",
            f"=== 行业基准（{industry_category}，估算值，仅供参考） ===",
            "指标 | 你的值 | P50 | P25 | P75",
            "-" * 50,
        ])
        metrics_to_compare = [
            ("引用率", metrics["citation_rate"], "citation_rate"),
            ("行业引用率", metrics["industry_rate"], "industry_rate"),
            ("对齐度", metrics["alignment_score"], "alignment_score"),
            ("综合评分", metrics["overall_score"], "overall_score"),
            ("推荐率", metrics["recommendation_rate"], "recommendation_rate"),
        ]
        for name, value, key in metrics_to_compare:
            bm = benchmark.get(key, {})
            p50 = bm.get("p50", 0)
            p25 = bm.get("p25", 0)
            p75 = bm.get("p75", 0)
            parts.append(f"{name} | {value} | P50={p50} | P25={p25} | P75={p75}")
    else:
        parts.append("")
        parts.append("行业基准数据不足，无法对比行业位置。")

    # ── AI认知 vs 品牌自述 ──
    parts.extend([
        "",
        "=== AI 眼中的你 vs 你希望AI眼中的你 ===",
        f"AI认为你是谁: {pvs['ai_think_you_are']}",
        f"AI看到你的优势: {', '.join(pvs['ai_think_your_strengths'][:5])}",
        f"AI看到你的劣势: {', '.join(pvs['ai_think_your_weaknesses'][:5])}",
        f"AI给你的定位: {pvs['ai_positioning']}",
        f"品牌官网自述定位: {pvs.get('brand_self_identity', '')}",
        f"品牌官网自述价值主张: {', '.join(pvs.get('brand_self_value_props', []))}",
        f"品牌官网自述差异化: {', '.join(pvs.get('brand_self_differentiators', []))}",
        f"你希望AI这样说: {pvs['you_want_ai_to_say'][:150]}",
        f"你希望AI用的关键词: {', '.join(pvs['your_desired_keywords'])}",
        f"你不想AI说的: {', '.join(pvs['what_ai_should_avoid_saying'])}",
        "",
        "=== 引用源明细（Top 10） ===",
        "域名 | 类型 | 权威分 | 提及次数(占比)",
        "-" * 55,
    ])
    for s in sources["top_sources"]:
        parts.append(
            f"{s['domain']} | {s['type']} | {s['authority_score']} | "
            f"{s['mention_count']}次({s['percentage']}%)"
        )
    if sources["missing_platforms"]:
        parts.append(f"\n当前缺失的高权威平台: {', '.join(sources['missing_platforms'])}")

    # ── 评分维度 ──
    parts.extend([
        "",
        "=== 评分维度 ===",
        "维度 | 得分 | 权重 | 修改难度 | 依据",
        "-" * 60,
    ])
    for d in dims:
        parts.append(
            f"{d['name']} | {d['score']} | {d['weight']} | "
            f"{d['difficulty']} | {d['evidence'][:50]}"
        )

    # ── 竞品对比（使用 dimension_aggregation）──
    parts.extend(["", "=== 竞品对比 ==="])
    if comp["has_data"]:
        parts.append(
            f"总计 {comp['total_comparisons']} 次对比: "
            f"{comp['wins']} 胜 {comp['losses']} 负"
        )
        if comp["losing_queries"]:
            parts.append("输掉的对比:")
            for lq in comp["losing_queries"]:
                parts.append(
                    f"  - 查询「{lq['query']}」→ 竞品胜出: {lq['winner']}。"
                    f"原因: {lq['reason']}"
                )

        # 维度打分矩阵（使用预计算的 dimension_aggregation）
        agg = ctx.get("dimension_aggregation", {})
        agg_dimensions = agg.get("dimensions", [])
        if agg_dimensions:
            parts.append("")
            parts.append("维度打分矩阵（已聚合，标注gap + 严重程度）:")
            for d in agg_dimensions:
                name = d["name"]
                brand_avg = d.get("brand_avg")
                comp_avg = d.get("competitor_avg")
                gap_val = d.get("gap")
                severity = d.get("severity", "")
                brand_scores = d.get("brand_scores", {})
                scores_str = " | ".join(
                    f"{b} {s}" for b, s in sorted(brand_scores.items(), key=lambda x: -x[1])
                )
                if gap_val is not None:
                    parts.append(
                        f"  {name}: {scores_str} | 品牌均{brand_avg} | "
                        f"竞品均{comp_avg} | gap={gap_val:+d}（{severity}）"
                    )
                else:
                    parts.append(f"  {name}: {scores_str} | 数据不足")
            # 数据质量
            dq = agg.get("data_quality", {})
            if dq.get("null_ratio", 0) > 0:
                parts.append("")
                parts.append(
                    f"数据质量: {dq.get('total_rankings', 0)}条中"
                    f"{dq.get('null_score_count', 0)}条score=null"
                    f"（{dq.get('null_ratio', 0)}%证据不足）"
                )
            parts.append("")
            parts.append(
                "请根据维度打分矩阵，分析每个维度的差距，找出关键劣势维度和优势维度。"
                "注意：score=null 表示数据不足，不要将其视为 0 分。"
            )
            dq = agg.get("data_quality", {})
            null_ratio = dq.get("null_ratio", 0)
            if null_ratio > 50:
                parts.append("")
                parts.append(
                    "⚠️ 维度数据严重不足（score=null 占比超过50%），competitor_gap 必须使用定性模式：\n"
                    "  - gap: null（禁止从查询理由推断具体数字）\n"
                    "  - direction: \"negative\"（品牌劣势）/ \"positive\"（品牌优势）\n"
                    "  - confidence: \"high\"（有≥2个有分数维度支持）/ \"medium\"（有1个有分数维度或查询理由多次提及）/ \"low\"（纯从winner/reason推断）\n"
                    "  - qualitative: 用一句话从查询理由中概括方向性结论（如「输掉的7条查询中多次提到产品质量和退货问题」）\n\n"
                    "禁止行为：\n"
                    "  - 禁止从 winner/reason 文字推断 gap 数值（如看到'被描述为scam'就填 gap=-50）\n"
                    "  - 禁止给所有维度统一填 -50 或 +10 等凑数行为\n"
                    "  - 有分数的维度正常输出 gap 数值；无分数数据的维度用定性模式"
                )
        else:
            # 回退到旧格式
            _append_legacy_dimension_matrix(parts, comp)
    else:
        parts.append("无竞品数据（用户未提供竞品）")

    # ── 偏差与盲点 ──
    parts.extend([
        "",
        "=== 偏差与盲点 ===",
        f"对齐度: {gap['alignment_score']}/100",
        f"概述: {gap['one_line_summary']}",
    ])
    if gap["misaligned"]:
        parts.append(f"偏差领域: {', '.join(gap['misaligned'])}")
    if gap["blind_spots"]:
        parts.append(f"盲点: {', '.join(gap['blind_spots'])}")
    if gap["opportunities"]:
        parts.append(f"机会: {', '.join(gap['opportunities'])}")

    # ── 引擎对比 ──
    engine_results = ctx.get("engine_results", {})
    if engine_results:
        parts.extend([
            "",
            "=== 引擎对比（A类查询 — 行业通用） ===",
            "引擎 | A类引用率 | A类推荐率 | 主要来源",
            "-" * 55,
        ])
        for engine, er in engine_results.items():
            rate = er.get("citation_rate", 0)
            rec = er.get("recommendation_rate", 0)
            esources = er.get("sources", {})
            top_src = ", ".join(
                sorted(esources, key=esources.get, reverse=True)[:3]
            ) if esources else "（来源数据未采集）"
            parts.append(f"{engine} | {rate}% | {rec}% | {top_src}")
        parts.append("")
        parts.append("以上数据已完整提供，请如实填入 engine_comparison.per_engine 字段。")
        parts.append("即使所有引擎引用率为 0%，也必须填入实际数据——0% 本身就是关键洞察（品牌在行业查询中完全隐形）。")
        parts.append("禁止输出'无数据'、'数据不足'、'启用多引擎搜索'等敷衍回答。")
    else:
        parts.extend([
            "",
            "=== 引擎对比 ===",
            "引擎对比数据未采集（多引擎搜索未启用）。此时 engine_comparison.per_engine 可留空。",
        ])

    # ── 内容改造指南提示 ──
    parts.append("")
    parts.append("=== 内容改造指南要求（Layer 6） ===")
    brand_value_props = ctx.get("perception_vs_self", {}).get("brand_self_value_props", [])
    if not brand_value_props:
        parts.append("⚠️ 品牌自述数据严重不足（官网爬取失败，brand_profile 为降级模板）。")
        parts.append("content_templates 所有字段必须填 null。不要基于品牌名或行业名编造内容模板。")
    else:
        parts.append("基于 brand_profile（品牌自述）和 market_perception（AI认知）的差距，生成 content_templates。")
        parts.append("目标：缩小品牌自述与AI认知之间的差距，扭转AI对品牌的理解。")
        parts.append("keywords_to_emphasize：选择能修复AI认知盲点的词（参考 perceived_weaknesses 和 blind_spots 反向设计，同时参考 competitor_gap 选择对抗性差异化关键词）。")
        parts.append("keywords_to_avoid：选择会强化AI负面认知的词（参考 perceived_weaknesses）。")
        parts.append("key_content_action：具体到「改什么→改成什么→在哪改」，不是抽象建议。")

    # ── B/C 类分析提示 ──
    parts.append("")
    parts.append(
        "请根据以上数据进行三层洞察分析，输出诊断报告 JSON。\n\n"
        "特别提醒：\n"
        "- 规则13（B类AI认知偏差分析）：请从「AI 眼中的你 vs 你希望AI眼中的你」区块提取数据\n"
        "- 规则14（C类竞品胜负矩阵分析）：请从「竞品对比」区块的维度打分矩阵聚合数据\n"
        "- score=null 表示数据不足，不要将其视为 0 分\n"
        "- 已触发规则和关键异常已标注在上方，请基于这些异常做三层洞察"
    )

    return "\n".join(parts)


def _append_legacy_dimension_matrix(parts: list, comp: dict):
    """回退：手动聚合维度矩阵（当 dimension_aggregation 为空时）。"""
    if not comp.get("dimension_matrix"):
        return
    parts.append("")
    parts.append("维度打分矩阵（每行一个查询维度，每列一个品牌）:")
    dim_map = {}
    for dm in comp["dimension_matrix"]:
        dim_name = dm["dimension"]
        if dim_name not in dim_map:
            dim_map[dim_name] = []
        dim_map[dim_name].append(dm)
    for dim_name, entries in dim_map.items():
        brand_score_sums = {}
        brand_score_counts = {}
        for e in entries:
            for r in e.get("rankings", []):
                brand = r.get("brand", "")
                score = r.get("score")
                if score is None:
                    continue
                brand_score_sums[brand] = brand_score_sums.get(brand, 0) + score
                brand_score_counts[brand] = brand_score_counts.get(brand, 0) + 1
        if brand_score_sums:
            brand_avg = {
                b: round(brand_score_sums[b] / brand_score_counts[b])
                for b in brand_score_sums
            }
            score_parts = " | ".join(
                f"{b} {s}" for b, s in sorted(brand_avg.items(), key=lambda x: -x[1])
            )
        else:
            score_parts = "数据不足"
        parts.append(f"  {dim_name}: {score_parts}")
    dq = comp.get("dimension_data_quality", {})
    if dq.get("null_score_count", 0) > 0:
        parts.append("")
        parts.append(f"维度数据质量: {dq.get('note', '')}")
    parts.append("")
    parts.append(
        "请根据维度打分矩阵，分析每个维度的差距，找出关键劣势维度和优势维度。"
        "注意：score=null 表示数据不足，不要将其视为 0 分。"
    )


def _build_history_section(brand_name: str, current_metrics: dict) -> str:
    """查询上一次运行数据，构建历史对比区块。

    对比内容：关键指标变化表 + 上次处方摘要。
    如果无历史数据或数据库未初始化，返回空字符串。
    """
    try:
        last = get_last_run(brand_name)
    except Exception:
        return ""

    if not last:
        return ""

    last_time = last.get("created_at", "未知")[:19]
    last_actions = []
    try:
        last_actions = json.loads(last.get("actions_json", "[]"))
    except (json.JSONDecodeError, TypeError):
        pass

    # 指标对比表
    metrics_to_compare = [
        ("引用率", "citation_rate", "%"),
        ("A类引用率（行业通用）", "industry_rate", "%"),
        ("B类引用率（品牌直接）", "brand_rate", "%"),
        ("C类引用率（竞品主导）", "competitor_scenario_rate", "%"),
        ("推荐率", "recommendation_rate", "%"),
        ("对齐度", "alignment_score", "/100"),
        ("综合评分", "overall_score", "/100"),
        ("GPT A类引用率", "engine_gpt_rate", "%"),
        ("Gemini A类引用率", "engine_gemini_rate", "%"),
        ("Haiku A类引用率", "engine_haiku_rate", "%"),
    ]

    lines = [
        f"=== 历史对比（上次运行：{last_time}） ===",
        "指标 | 上次 | 本次 | 变化",
        "-" * 50,
    ]

    has_meaningful_delta = False
    for label, key, unit in metrics_to_compare:
        prev_val = last.get(key, 0) or 0
        curr_val = current_metrics.get(key, 0) or 0
        delta = curr_val - prev_val
        if abs(delta) >= 1:
            has_meaningful_delta = True
            direction = "↑" if delta > 0 else ("↓" if delta < 0 else "→")
            lines.append(f"{label} | {prev_val}{unit} | {curr_val}{unit} | {direction}{abs(delta):.1f}")
        elif prev_val or curr_val:
            lines.append(f"{label} | {prev_val}{unit} | {curr_val}{unit} | →0")

    lines.append("")

    if last_actions:
        lines.append("=== 上次处方（是否已执行？效果如何？） ===")
        for i, a in enumerate(last_actions[:5], 1):
            lines.append(
                f"{i}. [{a.get('priority', '?')}] {a.get('action', 'N/A')} "
                f"→ 目标指标: {a.get('target_metric', 'N/A')} "
                f"({a.get('current_value', 'N/A')} → {a.get('expected_value', 'N/A')})"
            )
        lines.append("")
        lines.append("请分析：1）上次处方是否被有效执行？2）指标变化是否可归因到处方执行？3）本次处方是否需调整优先级？")

    if not has_meaningful_delta and not last_actions:
        return ""

    return "\n".join(lines)
