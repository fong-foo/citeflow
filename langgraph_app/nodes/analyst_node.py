# analyst_node.py — 军师 Agent
# 读取 ProbeOutput → build_context → detect_rules → build_briefing → LLM → 诊断报告
# 不调外部工具，不 ReAct 循环

import json
from langgraph_app.config import DEEPSEEK_CONFIG
from langgraph_app.tools.engines.chatgpt_api import call_api
from langgraph_app.tools.analyst_context import build_context
from langgraph_app.tools.analyst_rules import detect_rules
from langgraph_app.tools.analyst_briefing import build_briefing
from langgraph_app.tools.analyst_prompt import SYSTEM_PROMPT, FEW_SHOT
from langgraph_app.state import AnalystOutput, Diagnosis, ActionItem, CompetitorGap, ThreeLayerChain
from langgraph_app.validators.validator import validate_llm_output

NODE_NAME = "analyst"
NODE_ROLE = "军师 — 诊断 AI 引用数据，输出结构化诊断报告"
MAX_RETRIES = 2

# ── Progress callback ──
_progress_callback = None

def set_progress_callback(cb):
    global _progress_callback
    _progress_callback = cb

def _emit_progress(message: str, msg_type: str = "info"):
    if _progress_callback:
        try:
            _progress_callback(message, msg_type)
        except Exception:
            pass


def analyst_node(state: dict) -> dict:
    """Analyst 节点主函数。

    1. build_context — 数据提取（不做判断）
    2. detect_rules — 规则触发检测（代码判断）
    3. build_briefing — 组装诊断briefing
    4. LLM 调用 + 重试 → 写入 state["analyst_output"]
    """
    probe_output = state.get("probe_output", {})
    if not probe_output:
        return {"analyst_output": _empty_output("state 中无 probe_output")}

    # 1. 数据提取（不做判断）
    _emit_progress("开始提取侦察数据...", "info")
    ctx = build_context(probe_output)

    # 2. 规则触发检测（代码判断）
    _emit_progress("正在运行14条诊断规则...", "info")
    rules = detect_rules(ctx)
    triggered_count = len(rules.get("triggered", []))
    _emit_progress(f"规则检测完成 · {triggered_count}条触发", "success")

    # 3. 组装诊断briefing
    _emit_progress("正在组装诊断简报...", "info")
    user_message = build_briefing(ctx, rules)

    # 4. system prompt = 固定部分 + Few-Shot
    system_prompt = SYSTEM_PROMPT + "\n\n" + FEW_SHOT

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    # 5. LLM 调用 + 重试
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = call_api(
                messages=messages,
                config=DEEPSEEK_CONFIG,
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            content = resp["choices"][0]["message"].get("content", "").strip()
        except Exception as e:
            if attempt < MAX_RETRIES:
                continue
            return {"analyst_output": _empty_output(f"LLM 调用失败: {e}")}

        try:
            raw = json.loads(content)
        except json.JSONDecodeError:
            if attempt < MAX_RETRIES:
                messages = _append_retry(messages, content, [f"JSON 解析失败: {content[:200]}"])
                continue
            return {"analyst_output": _empty_output(f"JSON 解析失败: {content[:200]}")}

        result = validate_llm_output(raw, AnalystOutput, "analyst")
        if result["valid"]:
            output = result["parsed"].model_dump()
            output["_triggered_rules"] = rules.get("triggered", [])
            _emit_progress("AI诊断完成 ✓ · 诊断报告已生成", "success")
            return {"analyst_output": output}
        if attempt < MAX_RETRIES:
            messages = _append_retry(messages, content, result["errors"])
            continue
        return {"analyst_output": _empty_output(
            f"Schema 验证失败: {'; '.join(result['errors'])}"
        )}

    return {"analyst_output": _empty_output("未知错误")}


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
    return AnalystOutput(
        three_layer_chain=None,
        diagnosis=Diagnosis(core_problem="诊断失败", problem_detail=error, severity="healthy"),
        actions=[],
        competitor_gap=None,
        one_line_verdict="",
        engine_comparison=None,
        engine_insights=[],
        engine_recommendations=[],
        b_class_perception=None,
        c_class_matrix=None,
        content_templates=None,
        status="error",
        error=error,
    ).model_dump()
