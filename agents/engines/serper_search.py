# serper_search.py — Google 搜索（Serper API）
# 速度快（~1s），免费额度 2500次/月
# Docs: https://serper.dev/

import httpx
from agents.config import SERPER_API_KEY

SERPER_URL = "https://google.serper.dev/search"


def search(query: str, num_results: int = 5) -> list[dict]:
    """执行一次 Google 搜索，返回 [{title, url, snippet}, ...]。
    失败时返回空列表，不抛异常。最多重试 2 次。
    """
    for attempt in range(3):
        try:
            resp = httpx.post(
                SERPER_URL,
                json={"q": query, "num": num_results},
                headers={
                    "X-API-KEY": SERPER_API_KEY,
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            break
        except Exception:
            if attempt == 2:
                return []
            continue
    else:
        return []

    results = []
    for r in data.get("organic", [])[:num_results]:
        results.append({
            "title": r.get("title", ""),
            "url": r.get("link", ""),
            "snippet": r.get("snippet", ""),
        })
    return results
