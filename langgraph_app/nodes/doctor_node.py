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
            return {"doctor_output": result["parsed"].model_dump()}
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

    # 关键数据
    parts.append("=== 关键数据 ===")
    parts.append(f"A类引用率：{cm.get('industry_rate', 0):.1f}%")
    parts.append(f"B类引用率：{cm.get('brand_rate', 0):.1f}%")

    sa = probe_output.get("source_authority", {})
    if sa:
        top_sources = sa.get("top_sources", [])
        high_auth = sum(1 for s in top_sources if s.get("authority_score", 0) >= 70)
        total = sa.get("total_sources") or len(top_sources) or 1
        parts.append(f"高权威源占比：{high_auth}/{total} ({high_auth/total*100:.0f}%)")

    return "\n".join(parts)


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
