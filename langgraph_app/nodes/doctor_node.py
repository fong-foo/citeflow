# doctor_node.py — Doctor 医师节点
# 读取 AnalystOutput → 组装处方上下文 → 知识注入 → LLM → 处方报告

import json
from langgraph_app.config import DEEPSEEK_CONFIG
from langgraph_app.tools.engines.chatgpt_api import call_api
from langgraph_app.tools.knowledge_loader import get_prescription_knowledge
from langgraph_app.tools.doctor_prompt import SYSTEM_PROMPT, FEW_SHOT
from langgraph_app.state import DoctorOutput, PrescriptionItem
from langgraph_app.validators.validator import validate_llm_output

NODE_NAME = "doctor"
NODE_ROLE = "医师 — 根据诊断结果生成页面级可执行处方"
MAX_RETRIES = 2


def doctor_node(state: dict) -> dict:
    """Doctor 节点主函数。

    1. 从 state 读取 analyst_output 和 probe_output
    2. 组装处方上下文（品牌信息 + 诊断结果 + 关键数据）
    3. 知识注入（get_prescription_knowledge）
    4. LLM 调用 + 重试 → 写入 state["doctor_output"]
    """
    analyst_output = state.get("analyst_output", {})
    probe_output = state.get("probe_output", {})
    user_input = state.get("user_input", {})

    if not analyst_output or analyst_output.get("status") != "success":
        return {"doctor_output": _empty_output("Analyst 诊断未成功，无法生成处方")}

    # 1. 组装处方上下文
    user_message = _build_prescription_context(analyst_output, probe_output, user_input)

    # 2. 知识注入
    triggered_rules = analyst_output.get("_triggered_rules", [])
    knowledge = get_prescription_knowledge(triggered_rules)
    if knowledge:
        user_message += "\n\n" + knowledge

    # 3. LLM 调用
    system_prompt = SYSTEM_PROMPT + "\n\n" + FEW_SHOT
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = call_api(
                messages=messages,
                config=DEEPSEEK_CONFIG,
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            content = resp["choices"][0]["message"].get("content", "").strip()
        except Exception as e:
            if attempt < MAX_RETRIES:
                continue
            return {"doctor_output": _empty_output(f"LLM 调用失败: {e}")}

        try:
            raw = json.loads(content)
        except json.JSONDecodeError:
            if attempt < MAX_RETRIES:
                messages = _append_retry(messages, content, [f"JSON 解析失败: {content[:200]}"])
                continue
            return {"doctor_output": _empty_output(f"JSON 解析失败: {content[:200]}")}

        result = validate_llm_output(raw, DoctorOutput, "doctor")
        if result["valid"]:
            parsed = result["parsed"].model_dump()
            # 内容级验证（不阻塞，质量信号）
            content_warnings = _validate_prescription_content(parsed.get("prescription", []))
            if content_warnings:
                parsed["_content_warnings"] = content_warnings
            return {"doctor_output": parsed}
        if attempt < MAX_RETRIES:
            messages = _append_retry(messages, content, result["errors"])
            continue
        return {"doctor_output": _empty_output(
            f"Schema 验证失败: {'; '.join(result['errors'])}"
        )}

    return {"doctor_output": _empty_output("未知错误")}


def _build_prescription_context(analyst_output: dict, probe_output: dict, user_input: dict = None) -> str:
    """组装 Doctor 的输入上下文。

    结构：
    === 品牌信息 ===
    === 诊断结果 ===
    === 关键数据 ===
    """
    bp = probe_output.get("brand_profile", {})
    cm = probe_output.get("citation_metrics", {})
    diagnosis = analyst_output.get("diagnosis", {})
    competitor_gap = analyst_output.get("competitor_gap", {})
    triggered = analyst_output.get("_triggered_rules", [])

    parts = []

    # 品牌信息
    parts.append("=== 品牌信息 ===")
    parts.append(f"品牌：{bp.get('brand_name', '未知')}")
    domain = (user_input or {}).get('domain', '') or probe_output.get('domain', '')
    parts.append(f"域名：{domain or '未知'}")
    parts.append(f"行业：{bp.get('inferred_industry', '未知')}")
    parts.append(f"目标市场：{bp.get('inferred_target_market', '未知')}")
    parts.append("")

    # 诊断结果
    parts.append("=== 诊断结果（Analyst 输出）===")
    if diagnosis:
        parts.append(f"核心问题：{diagnosis.get('core_problem', '')}")
        parts.append(f"严重程度：{diagnosis.get('severity', '')}")
        parts.append(f"详细诊断：{diagnosis.get('problem_detail', '')}")
    parts.append("")

    # 触发规则
    if triggered:
        parts.append("触发规则：")
        for r in triggered:
            parts.append(f"  规则{r.get('rule_id')}: {r.get('name')}({r.get('severity')}) — {r.get('evidence', '')}")
        parts.append("")

    # 竞品差距
    if competitor_gap:
        parts.append("竞品差距：")
        parts.append(f"  根因：{competitor_gap.get('root_cause', '')}")
        if competitor_gap.get('losing_dimensions'):
            losing = ", ".join(d.get('dimension', '') for d in competitor_gap['losing_dimensions'][:3])
            parts.append(f"  落后维度：{losing}")
        parts.append("")

    # 关键数据（or 0 防 None 值 TypeError）
    parts.append("=== 关键数据 ===")
    ia = cm.get("industry_rate") or 0
    ba = cm.get("brand_rate") or 0
    parts.append(f"A类引用率：{ia:.1f}%")
    parts.append(f"B类引用率：{ba:.1f}%")

    sa = probe_output.get("source_authority", {}) or {}
    if sa:
        top_sources = sa.get("top_sources", []) or []
        high_auth = sum(1 for s in top_sources if (s.get("authority_score") or 0) >= 70)
        total = (sa.get("total_sources") or len(top_sources)) or 1
        parts.append(f"高权威源占比：{high_auth}/{total} ({high_auth/total*100:.0f}%)")

    # ── 引擎对比（供引擎特定处方）──
    ec = analyst_output.get("engine_comparison", {}) or {}
    if ec:
        parts.append("")
        parts.append("=== 引擎对比 ===")
        parts.append(f"最佳引擎: {ec.get('best_engine', '未知')}")
        parts.append(f"最差引擎: {ec.get('worst_engine', '未知')}")
        per_engine = ec.get("per_engine", {}) or {}
        if per_engine:
            parts.append("各引擎数据:")
            for eng, ed in per_engine.items():
                cr = ed.get("citation_rate", 0) if isinstance(ed, dict) else 0
                rr = ed.get("recommendation_rate", 0) if isinstance(ed, dict) else 0
                ts = ed.get("top_sources", []) if isinstance(ed, dict) else []
                parts.append(f"  {eng}: 引用率{cr}% 推荐率{rr}% 来源{ts[:3]}")

    # ── B/C 类分析 ──
    bcp = analyst_output.get("b_class_perception", {}) or {}
    if bcp:
        parts.append("")
        parts.append("=== AI 认知画像（B类） ===")
        parts.append(f"AI认为品牌是: {bcp.get('ai_identity', '')}")
        parts.append(f"品牌自述: {bcp.get('brand_self_identity', '')}")
        parts.append(f"差距描述: {bcp.get('gap_description', '')}")

    ccm = analyst_output.get("c_class_matrix", {}) or {}
    if ccm:
        parts.append("")
        parts.append("=== 竞品胜负矩阵（C类） ===")
        parts.append(f"胜{ccm.get('wins',0)} / 负{ccm.get('losses',0)} / 平{ccm.get('ties',0)}")
        parts.append(f"关键洞察: {ccm.get('key_insight', '')}")

    # ── 引用源明细（供权威建设处方）──
    top_sources_for_rx = sa.get("top_sources", []) or []
    if top_sources_for_rx:
        parts.append("")
        parts.append("=== 引用源明细（Top 5） ===")
        for s in top_sources_for_rx[:5]:
            domain = s.get("domain", "")
            stype = s.get("source_type", "其他")
            ascore = s.get("authority_score", 0)
            parts.append(f"  {domain} | {stype} | 权威分{ascore}")

    # ── 行业基准（供量化处方）──
    industry = bp.get("inferred_industry", "")
    if industry:
        from langgraph_app.config import INDUSTRY_BENCHMARKS
        from langgraph_app.tools.brand_profiler import map_industry_category
        ic = map_industry_category(industry)
        bm = INDUSTRY_BENCHMARKS.get(ic, {})
        if bm:
            parts.append("")
            parts.append(f"=== 行业基准（{ic}，估算值） ===")
            for key, label in [("citation_rate", "引用率"), ("industry_rate", "行业引用率"),
                               ("alignment_score", "对齐度")]:
                bm_data = bm.get(key, {})
                if bm_data:
                    parts.append(f"{label}: P25={bm_data.get('p25','?')}% P50={bm_data.get('p50','?')}% P75={bm_data.get('p75','?')}%")

    return "\n".join(parts)


def _validate_prescription_content(prescription: list[dict]) -> list[str]:
    """内容级验证：Pydantic 过了但内容可能还是烂的。

    检测：空 what_to_add、Few-Shot 污染数字、无效 priority、
          空 expected_impact/how_to_verify、P0 超量、总数超量。
    返回警告列表（不阻塞）。
    """
    warnings = []

    for i, item in enumerate(prescription):
        prefix = f"处方[{i}]"

        # 1. what_to_add 不能是空列表
        if not item.get("what_to_add"):
            warnings.append(f"{prefix}: what_to_add 为空列表")

        # 2. evidence 必须有实质内容
        evidence = item.get("evidence", "")
        if len(evidence) < 10:
            warnings.append(f"{prefix}: evidence 过短（{len(evidence)}字符）")
        # 检测 Few-Shot 污染：这些精确数字只出现在 Few-Shot 示例里
        KNOWN_FEWSHOT_NUMBERS = ["0.2144", "44.9%"]
        for num in KNOWN_FEWSHOT_NUMBERS:
            if num in evidence:
                warnings.append(f"{prefix}: evidence 包含 Few-Shot 污染数字 {num}")

        # 3. priority 必须是 P0/P1/P2
        if item.get("priority") not in ("P0", "P1", "P2"):
            warnings.append(f"{prefix}: 无效的 priority: {item.get('priority')}")

        # 4. expected_impact 不能是空
        if not item.get("expected_impact", "").strip():
            warnings.append(f"{prefix}: expected_impact 为空")

        # 5. how_to_verify 不能是空
        if not item.get("how_to_verify", "").strip():
            warnings.append(f"{prefix}: how_to_verify 为空")

    # 6. P0 数量检查
    p0_count = sum(1 for item in prescription if item.get("priority") == "P0")
    if p0_count > 3:
        warnings.append(f"P0 处方数量 {p0_count} > 3（限制 3 条）")

    # 7. 总数检查
    if len(prescription) > 8:
        warnings.append(f"处方总数 {len(prescription)} > 8（限制 8 条）")

    return warnings


def _append_retry(messages: list[dict], last_content: str, errors: list[str]) -> list[dict]:
    """在消息末尾附加上一次的 assistant 回复 + 修正提示，要求 LLM 重新输出。"""
    error_lines = "\n".join(f"  - {e}" for e in errors)
    retry_prompt = (
        f"你上次返回的 JSON 有以下错误：\n"
        f"{error_lines}\n\n"
        f"请修正后重新返回完整 JSON。只返回 JSON。"
    )
    return messages + [
        {"role": "assistant", "content": last_content[:500]},
        {"role": "user", "content": retry_prompt},
    ]


def _empty_output(error: str) -> dict:
    return DoctorOutput(
        prescription=[],
        summary="",
        knowledge_sources=[],
        status="error",
        error=error,
    ).model_dump()
