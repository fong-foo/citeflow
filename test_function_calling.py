#!/usr/bin/env python3
"""test_function_calling.py — 测试 Gemini/Claude Haiku function calling 兼容性"""

import json, os, sys
from openai import OpenAI

BASE_URL = "https://api.ofox.ai/v1"
API_KEY = os.environ.get("OPENAI_API_KEY", "") or "sk-of-OVfNmVYNgxPuJSZtdyGjCqvMwCJfhNjJNMzZfUknFJQEogbcJdIYMuTyTPJGarSq"

TOOLS = [{
    "type": "function",
    "function": {
        "name": "search_web",
        "description": "搜索网页获取信息",
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "搜索查询词"}},
            "required": ["query"]
        }
    }
}]

MESSAGES = [{"role": "user", "content": "搜索一下 YesWelder 的评价"}]


def test_model(label: str, model_id: str, timeout: int = 30):
    client = OpenAI(base_url=BASE_URL, api_key=API_KEY, timeout=timeout)
    r = {"label": label, "model_id": model_id, "fc": False, "fmt": False, "resp": False, "error": None}

    try:
        resp = client.chat.completions.create(model=model_id, messages=MESSAGES, tools=TOOLS, tool_choice="auto", temperature=0.1)
        msg = resp.choices[0].message
        if msg.tool_calls:
            r["fc"] = True
            tc = msg.tool_calls[0]
            if hasattr(tc, "id") and hasattr(tc, "function") and hasattr(tc.function, "arguments"):
                r["fmt"] = True
            tool_resp = {"role": "tool", "tool_call_id": tc.id, "content": json.dumps({"results": ["test"]})}
            msgs = MESSAGES + [msg.model_dump(), tool_resp]
            try:
                client.chat.completions.create(model=model_id, messages=msgs, temperature=0.1)
                r["resp"] = True
            except Exception as e:
                r["error"] = f"tool response fail: {e}"
        else:
            r["error"] = "no tool_call returned"
    except Exception as e:
        r["error"] = str(e)[:300]
    return r


MODELS = [
    ("gemini-flash-lite", "gemini-3.1-flash-lite-preview"),
    ("claude-haiku-4.5",  "anthropic/claude-haiku-4-5"),
    ("claude-haiku",      "claude-haiku-4-5"),
    ("anthropic/haiku45", "anthropic/claude-haiku-4.5"),
]

print("Function calling 测试: Gemini + Claude Haiku 4.5")
print("=" * 55)
for label, mid in MODELS:
    sys.stdout.write(f"  {label:20s} ({mid:45s}) ... ")
    sys.stdout.flush()
    r = test_model(label, mid, timeout=45)
    if r["fc"] and r["fmt"] and r["resp"]:
        print("✅ 完全兼容")
    elif r["fc"] and r["fmt"]:
        print(f"⚠️ FC OK but resp fail: {r['error']}")
    elif r["fc"]:
        print(f"⚠️ FC OK but fmt wrong: {r['error']}")
    elif r["error"] and "404" in r["error"]:
        print("❌ 模型不存在(404)")
    elif r["error"] and "timeout" in r["error"].lower():
        print("⏱ 超时")
    else:
        print(f"❌ {r['error']}")
print("=" * 55)
