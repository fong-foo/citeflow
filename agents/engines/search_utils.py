# search_utils.py — 搜索工具共享模块
# competitor_query_gen.py 和 fc_search.py 都引用这个模块

import asyncio
from agents.engines.serper_search import search as serper_search
from agents.engines.chatgpt_api import call_api


async def search_serper(query: str, num_results: int = 5) -> list[dict]:
    """Serper Google 搜索"""
    try:
        results = await asyncio.to_thread(serper_search, query, num_results)
        return results if isinstance(results, list) else []
    except Exception:
        return []


async def synthesize_answer(
    query: str,
    search_results: list[dict],
    config: dict,
) -> str:
    """基于搜索结果合成答案（不是凭空回答）"""
    results_text = ""
    for i, result in enumerate(search_results[:5], 1):
        title = result.get("title", "")
        snippet = result.get("snippet", "")
        url = result.get("url", "")
        results_text += f"{i}. {title}\n   {snippet}\n   来源: {url}\n\n"

    if not results_text:
        return "搜索结果为空，无法回答"

    prompt = (
        f"基于以下搜索结果，回答用户的问题。"
        f"只使用搜索结果中的信息，不要添加自己的知识。"
        f"如果搜索结果中没有相关信息，说明'搜索结果中没有相关信息'。\n\n"
        f"=== 问题 ===\n{query}\n\n"
        f"=== 搜索结果 ===\n{results_text}\n\n"
        f"=== 回答要求 ===\n"
        f"1. 只使用搜索结果中的信息\n"
        f"2. 不要编造数据（如价格、保修年限、技术参数）\n"
        f"3. 如果搜索结果中没有具体数据，说明'搜索结果中未提及'\n"
        f"4. 引用来源 URL\n\n"
        f"回答:"
    )

    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=config,
            temperature=0.1,
        )
        return resp["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"合成答案失败: {e}"
