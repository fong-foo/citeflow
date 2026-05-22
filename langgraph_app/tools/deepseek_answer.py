# deepseek_answer.py — DeepSeek 纯文本回答
# 发一个问题，拿一个回答。不做搜索，不调 GPT。

from langgraph_app.config import DEEPSEEK_CONFIG
from langgraph_app.tools.engines.chatgpt_api import call_api


def ask(question: str) -> dict:
    """发一个问题给 DeepSeek，返回 {"answer": str, "tokens": int}。"""
    try:
        resp = call_api(
            messages=[{"role": "user", "content": question}],
            config=DEEPSEEK_CONFIG,
            temperature=0.3,
        )
        return {
            "answer": resp["choices"][0]["message"].get("content", ""),
            "tokens": resp.get("usage", {}).get("total_tokens", 0),
        }
    except Exception as e:
        return {"answer": f"[DeepSeek 调用失败: {e}]", "tokens": 0}
