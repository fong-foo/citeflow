# ddg_search.py — DuckDuckGo HTML 版搜索
# 无 API key，不需要认证，解析 HTML 结果页

import re
import httpx

DDG_URL = "https://html.duckduckgo.com/html/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}


def search(query: str, num_results: int = 5) -> list[dict]:
    """执行一次 DuckDuckGo 搜索，返回 [{title, url, snippet}, ...]。
    搜索无结果或失败时返回空列表，不抛异常。最多重试 2 次。
    """
    for attempt in range(3):
        try:
            resp = httpx.get(
                DDG_URL,
                params={"q": query},
                headers=HEADERS,
                timeout=15,
            )
            resp.raise_for_status()
            html = resp.text
            break
        except Exception:
            if attempt == 2:
                return []
            continue
    else:
        return []

    results = []
    # DDG HTML 版的结果结构：result__a (标题+链接) + result__snippet (摘要)
    blocks = re.findall(
        r'<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)</a>.*?'
        r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>',
        html, re.DOTALL,
    )

    for url, title, snippet in blocks[:num_results]:
        title = re.sub(r'<[^>]+>', '', title).strip()
        snippet = re.sub(r'<[^>]+>', '', snippet).strip()
        url = _extract_real_url(url)
        if title and url:
            results.append({"title": title, "url": url, "snippet": snippet})

    return results


def _extract_real_url(url: str) -> str:
    """DuckDuckGo 用 uddg= 参数包装真实 URL，提取它。"""
    if "uddg=" in url:
        match = re.search(r"uddg=([^&]+)", url)
        if match:
            decoded = httpx.URL(match.group(1)).__str__()
            return decoded
    return url
