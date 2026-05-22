# fc_search.py — 联网搜索（Probe 核心工具）
# 一条查询词的完整搜索流程：function calling → DDG 搜索 → GPT 回答

import asyncio
import json
from langgraph_app.config import GPT_CONFIG, GEMINI_CONFIG, CLAUDE_HAIKU_CONFIG
from langgraph_app.tools.engines.chatgpt_api import call_api
from langgraph_app.tools.engines.serper_search import search as serper_search
from langgraph_app.tools.engines.search_utils import search_serper, synthesize_answer

WEB_SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": "Search the web for current information about companies, products, and services",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query to find current information"}
            },
            "required": ["query"],
        },
    },
}


def search(query: str, brand_name: str, brand_domain: str) -> dict:
    """执行一条查询词的联网搜索。

    Returns:
        {
            "answer": str,              # GPT 最终回答
            "searched_queries": [str],   # GPT 实际搜索了什么
            "raw_citations": [dict],     # DDG 返回的原始结果
            "no_search": bool,           # GPT 是否跳过了搜索
            "tokens": int,               # 总 token 用量
            "error": str | None,
        }
    """
    system_prompt = (
        "You are a market research assistant. Search the web to find current, "
        "factual information about companies, products, and services. "
        "Always cite your sources."
    )

    user_prompt = (
        f"Search the web and answer this question: {query}\n\n"
        f"Context: We are researching {brand_name} ({brand_domain}) and its competitive landscape.\n"
        f"Search broadly and report on ALL relevant brands, companies, and products mentioned.\n"
        f"Note whether {brand_name} appears, and also report on any competitors or alternatives found.\n"
        f"Always perform at least one web search — do not answer from training data."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    total_tokens = 0

    try:
        resp = call_api(messages, GPT_CONFIG, tools=[WEB_SEARCH_TOOL])
        total_tokens += _extract_tokens(resp)
    except Exception as e:
        return {
            "answer": "",
            "searched_queries": [],
            "raw_citations": [],
            "no_search": False,
            "tokens": total_tokens,
            "error": f"API 调用失败: {e}",
        }

    choice = resp["choices"][0]
    finish_reason = choice.get("finish_reason", "")
    message = choice["message"]

    # GPT 没有请求搜索（训练数据直接回答）
    if finish_reason == "stop" and not message.get("tool_calls"):
        return {
            "answer": message.get("content", ""),
            "searched_queries": [],
            "raw_citations": [],
            "no_search": True,
            "tokens": total_tokens,
            "error": None,
        }

    # GPT 请求搜索 → 执行
    searched_queries = []
    raw_citations = []

    if message.get("tool_calls"):
        messages.append(message)

        for tc in message["tool_calls"]:
            if tc["function"]["name"] != "web_search":
                continue

            args = json.loads(tc["function"]["arguments"])
            sq = args.get("query", query)
            searched_queries.append(sq)

            serper_results = serper_search(sq)
            raw_citations.extend(serper_results)

            # 格式化搜索结果作为 tool response
            result_text = f"Search results for '{sq}':\n"
            if serper_results:
                for i, r in enumerate(serper_results, 1):
                    result_text += f"{i}. {r['title']}\n   {r['snippet']}\n   URL: {r['url']}\n"
            else:
                result_text += "(no results found)\n"

            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": result_text,
            })

        # 第 2 轮：喂回搜索结果，拿最终文本回答
        payload_tools_removed = [m for m in messages if m["role"] != "system"]
        final_messages = [
            {"role": "system", "content": (
                "You are a market research assistant. Write thorough, plain-text answers "
                "based on the search results provided. Do NOT use function calls, tools, "
                "XML tags, or any structured format. Just write natural paragraphs."
            )},
            {"role": "user", "content": (
                f"Based on the search results above, answer this question: {query}\n\n"
                f"Include ALL brands, companies, and products mentioned in the results, "
                f"even if {brand_name} ({brand_domain}) is not among them. "
                f"Cite specific sources with URLs."
            )},
        ]
        final_messages.extend(payload_tools_removed)

        try:
            resp2 = call_api(final_messages, GPT_CONFIG)
            total_tokens += _extract_tokens(resp2)
            answer = resp2["choices"][0]["message"].get("content", "")
            # 安全网：清理可能残留的 XML tool_use 标签
            answer = _clean_answer(answer)
        except Exception as e:
            return {
                "answer": "",
                "searched_queries": searched_queries,
                "raw_citations": raw_citations,
                "no_search": False,
                "tokens": total_tokens,
                "error": f"第2轮API调用失败: {e}",
            }
    else:
        answer = message.get("content", "")

    return {
        "answer": answer,
        "searched_queries": searched_queries,
        "raw_citations": raw_citations,
        "no_search": False,
        "tokens": total_tokens,
        "error": None,
    }


def _extract_tokens(resp: dict) -> int:
    """从 OpenAI 格式响应中提取 token 用量。"""
    usage = resp.get("usage", {})
    return usage.get("total_tokens", 0)


def _clean_answer(text: str) -> str:
    """清理 GPT 回答中可能残留的 XML tool_use 标签。"""
    import re
    # 移除 <tool_use ...> ... </tool_use> 块
    text = re.sub(r'<tool_use[^>]*>.*?</tool_use>', '', text, flags=re.DOTALL)
    # 移除单行的 <tool_use .../> 自闭合标签
    text = re.sub(r'<tool_use[^>]*/>', '', text)
    return text.strip()


# ═══════════════════════════════════════════════════════════════
# 多引擎搜索（引擎差异分析用）
# 每个引擎走独立的 function calling 流程，真正对比引擎搜索行为差异
# ═══════════════════════════════════════════════════════════════

def _fc_search_sync(query: str, config: dict) -> dict:
    """单次 function calling 搜索 + 合成（同步，接受任意 config）。

    流程：LLM 决定搜什么 → Serper 执行搜索 → LLM 合成答案
    与 search() 逻辑相同，但不绑定 GPT_CONFIG，不含品牌上下文。
    """
    system_prompt = (
        "You are a market research assistant. Search the web to find current, "
        "factual information about companies, products, and services. "
        "Always cite your sources."
    )

    user_prompt = f"Search the web and answer this question: {query}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    total_tokens = 0

    try:
        resp = call_api(messages, config, tools=[WEB_SEARCH_TOOL])
        total_tokens += _extract_tokens(resp)
    except Exception as e:
        return {
            "query": query,
            "answer": "",
            "search_results": [],
            "no_search": False,
            "tokens": total_tokens,
            "error": f"API 调用失败: {e}",
        }

    choice = resp["choices"][0]
    finish_reason = choice.get("finish_reason", "")
    message = choice["message"]

    # LLM 没有请求搜索（训练数据直接回答）
    if finish_reason == "stop" and not message.get("tool_calls"):
        return {
            "query": query,
            "answer": message.get("content", ""),
            "search_results": [],
            "no_search": True,
            "tokens": total_tokens,
            "error": None,
        }

    # LLM 请求搜索 → 执行
    searched_queries = []
    all_search_results = []

    if message.get("tool_calls"):
        messages.append(message)

        for tc in message["tool_calls"]:
            if tc["function"]["name"] != "web_search":
                continue

            args = json.loads(tc["function"]["arguments"])
            sq = args.get("query", query)
            searched_queries.append(sq)

            serper_results = serper_search(sq)
            all_search_results.extend(serper_results)

            result_text = f"Search results for '{sq}':\n"
            if serper_results:
                for i, r in enumerate(serper_results, 1):
                    result_text += f"{i}. {r['title']}\n   {r['snippet']}\n   URL: {r['url']}\n"
            else:
                result_text += "(no results found)\n"

            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": result_text,
            })

        # 第 2 轮：喂回搜索结果，拿最终文本回答
        payload_tools_removed = [m for m in messages if m["role"] != "system"]
        final_messages = [
            {"role": "system", "content": (
                "You are a market research assistant. Write thorough, plain-text answers "
                "based on the search results provided. Do NOT use function calls, tools, "
                "XML tags, or any structured format. Just write natural paragraphs."
            )},
            {"role": "user", "content": (
                f"Based on the search results above, answer this question: {query}\n\n"
                "Cite specific sources with URLs."
            )},
        ]
        final_messages.extend(payload_tools_removed)

        try:
            resp2 = call_api(final_messages, config)
            total_tokens += _extract_tokens(resp2)
            answer = resp2["choices"][0]["message"].get("content", "")
            answer = _clean_answer(answer)
        except Exception as e:
            return {
                "query": query,
                "answer": "",
                "search_results": all_search_results,
                "no_search": False,
                "tokens": total_tokens,
                "error": f"第2轮API调用失败: {e}",
            }
    else:
        answer = message.get("content", "")

    return {
        "query": query,
        "answer": answer,
        "search_results": all_search_results,
        "no_search": False,
        "tokens": total_tokens,
        "error": None,
    }


async def search_multi_engine(
    queries: list[str],
    engines: list[str] | None = None,
) -> dict[str, list[dict]]:
    """多引擎搜索：同一份查询词，每个引擎独立走 function calling 流程。

    Args:
        queries: 查询词列表（10个A类查询）
        engines: 引擎列表，默认 ["gpt", "gemini", "haiku"]

    Returns:
        {"gpt": [{"query": str, "answer": str, "search_results": list}, ...], ...}
    """
    if engines is None:
        engines = ["gpt", "gemini", "haiku"]

    tasks = [_search_single_engine(engine, queries) for engine in engines]
    engine_results_list = await asyncio.gather(*tasks, return_exceptions=True)

    results = {}
    for i, engine in enumerate(engines):
        r = engine_results_list[i]
        if isinstance(r, Exception):
            results[engine] = []
        else:
            results[engine] = r

    return results


async def _search_single_engine(engine: str, queries: list[str]) -> list[dict]:
    """单引擎 function calling 搜索（3 并发）。
    FC 失败时自动回退到 Serper+synthesize 模式（兼容不支持 FC 的模型）。
    """
    config = _get_engine_config(engine)
    semaphore = asyncio.Semaphore(3)

    async def _search_one(query):
        async with semaphore:
            result = await asyncio.to_thread(_fc_search_sync, query, config)
            # FC 未触发（模型不支持或选择不调用工具）→ Serper 兜底
            if result.get("no_search"):
                search_results = await search_serper(query)
                answer = await synthesize_answer(query, search_results, config)
                result = {
                    "query": query,
                    "answer": answer,
                    "search_results": search_results,
                    "no_search": False,
                    "tokens": result.get("tokens", 0),
                    "error": None,
                    "fallback": "serper",  # 标记：非 FC，Serper 兜底
                }
            result["engine"] = engine
            return result

    tasks = [_search_one(q) for q in queries]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if not isinstance(r, Exception)]


def generate_a_queries(product_keyword: str, config: dict, industry: str = "") -> list[str]:
    """用指定 LLM 生成 10 条 A 类（行业通用）查询词。

    每个引擎独立调用，生成角度不同，体现真正的引擎差异。
    """
    industry_line = f"\nIndustry: {industry}\n" if industry else ""

    has_chinese = any('一' <= c <= '鿿' for c in product_keyword)
    chinese_hint = ""
    if has_chinese:
        chinese_hint = (
            "\nIMPORTANT: The product category above is in Chinese. "
            "Understand its meaning and generate relevant English search queries. "
            "Do NOT guess or assume unrelated product categories.\n"
        )

    prompt = (
        f"You are a search behavior researcher. Generate search queries that "
        f"everyday users type into Google when shopping for or researching products.\n\n"
        f"Product category: {product_keyword}"
        f"{industry_line}"
        f"{chinese_hint}\n"
        "Generate 10 search queries about this product category. Requirements:\n"
        "- These are REAL queries users search for — not SEO keywords\n"
        "- Mix: questions, comparison, reviews, recommendations, buying guides\n"
        "- Cover diverse intents: quality, price, durability, brands, where to buy\n"
        "- IMPORTANT: Stay within the product category above. Do NOT generate queries about unrelated industries\n"
        "- Do NOT mention any specific brand names at all\n"
        "- All queries in English\n"
        "- Return exactly 10 queries, one per line, no numbering, no bullets\n"
        "Output: plain text, one query per line."
    )

    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=config,
            temperature=0.8,
        )
        content = resp["choices"][0]["message"].get("content", "")
    except Exception:
        return []

    queries = []
    for line in content.strip().split("\n"):
        line = line.strip().lstrip("0123456789.-) ").strip()
        if line and len(line) > 3:
            queries.append(line)
    return queries[:10]


def _get_engine_config(engine: str) -> dict:
    if engine == "gpt":
        return GPT_CONFIG
    elif engine == "gemini":
        return GEMINI_CONFIG
    elif engine == "haiku":
        return CLAUDE_HAIKU_CONFIG
    else:
        raise ValueError(f"Unknown engine: {engine}")
