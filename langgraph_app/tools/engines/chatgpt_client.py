# chatgpt_client.py — ChatGPT API 客户端

import os
import time
import httpx


async def search(query: str) -> dict:
    """
    调用 ChatGPT API 搜索查询词。

    API: https://api.openai.com/v1/chat/completions
    方法: POST
    Header: Authorization: Bearer {OPENAI_API_KEY}

    请求体:
    {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "搜索并返回引用来源URL"},
            {"role": "user", "content": query}
        ]
    }

    返回：原始API响应

    注意：ChatGPT不一定返回引用来源URL，需要从文本中提取
    错误处理：同Perplexity
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")

    if not api_key:
        return _mock_search(query)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a research assistant. When answering queries, "
                    "cite your sources by including URLs in your response. "
                    "Format: [source](url) after each claim."
                ),
            },
            {"role": "user", "content": query},
        ],
        "temperature": 0.3,
    }

    max_retries = 3
    for attempt in range(max_retries):
        try:
            resp = httpx.post(
                "https://api.openai.com/v1/chat/completions",
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

            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            # Normalize response
            return {
                "engine": "chatgpt",
                "query": query,
                "content": content,
                "citations": [],  # ChatGPT doesn't have structured citations
                "raw": data,
                "error": None,
            }

        except httpx.TimeoutException:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            return {"error": "Timeout after retries", "query": query, "engine": "chatgpt"}
        except Exception as e:
            return {"error": str(e), "query": query, "engine": "chatgpt"}

    return {"error": "Max retries exceeded", "query": query, "engine": "chatgpt"}


def _mock_search(query: str) -> dict:
    """Return mock search results when API key is not available."""
    return {
        "engine": "chatgpt",
        "query": query,
        "content": (
            f"For '{query}', I recommend looking at several top options. "
            f"Nike running shoes are known for their comfort and innovation. "
            f"According to [Runner's World](https://runnersworld.com/best-shoes), "
            f"Nike Air Zoom Pegasus is a top pick. "
            f"Also check [Running Warehouse](https://runningwarehouse.com) for more options."
        ),
        "citations": [],
        "raw": {"mock": True},
        "error": None,
    }
