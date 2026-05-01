# perplexity_client.py — Perplexity API 客户端

import os
import time
import httpx


async def search(query: str) -> dict:
    """
    调用 Perplexity API 搜索查询词。

    API: https://api.perplexity.ai/chat/completions
    方法: POST
    Header: Authorization: Bearer {PERPLEXITY_API_KEY}

    请求体:
    {
        "model": "llama-3.1-sonar-small-128k-online",
        "messages": [{"role": "user", "content": query}]
    }

    返回：原始API响应（包含引用来源URL）

    错误处理：
    · 429（限流）→ 等待5秒重试，最多3次
    · 超时（30秒）→ 返回 error
    · 其他错误 → 返回 error
    """
    api_key = os.environ.get("PERPLEXITY_API_KEY", "")

    if not api_key:
        return _mock_search(query)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama-3.1-sonar-small-128k-online",
        "messages": [{"role": "user", "content": query}],
    }

    max_retries = 3
    for attempt in range(max_retries):
        try:
            resp = httpx.post(
                "https://api.perplexity.ai/chat/completions",
                headers=headers,
                json=payload,
                timeout=30.0,
            )

            if resp.status_code == 429:
                if attempt < max_retries - 1:
                    time.sleep(5)
                    continue
                return {"error": "Rate limited after retries", "query": query}

            resp.raise_for_status()
            data = resp.json()

            # Normalize response
            return {
                "engine": "perplexity",
                "query": query,
                "content": data.get("choices", [{}])[0].get("message", {}).get("content", ""),
                "citations": data.get("citations", []),
                "raw": data,
                "error": None,
            }

        except httpx.TimeoutException:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            return {"error": "Timeout after retries", "query": query, "engine": "perplexity"}
        except Exception as e:
            return {"error": str(e), "query": query, "engine": "perplexity"}

    return {"error": "Max retries exceeded", "query": query, "engine": "perplexity"}


def _mock_search(query: str) -> dict:
    """Return mock search results when API key is not available."""
    return {
        "engine": "perplexity",
        "query": query,
        "content": f"Based on extensive research, here are the top recommendations for '{query}'. "
        f"Nike Air Zoom Pegasus is consistently rated as one of the best options for daily training. "
        f"The shoe offers excellent cushioning and durability for runners of all levels.",
        "citations": [
            {"url": "https://runnerclick.com/best-running-shoes", "snippet": "Nike Air Zoom Pegasus tops our list"},
            {"url": "https://runrepeat.com/nike-review", "snippet": "Excellent cushioning technology"},
        ],
        "raw": {"mock": True},
        "error": None,
    }
