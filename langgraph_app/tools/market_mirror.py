# market_mirror.py — 市场镜像
# 从 GPT 搜索回答 + DDG 摘要中提取 "AI 实际怎么描述这家品牌"
# 方案 A：数据源升级 — 品牌提及 + 竞品对比 + 市场上下文三层数据

from langgraph_app.config import DEEPSEEK_CONFIG
from langgraph_app.tools.engines.chatgpt_api import call_api
import json
import re


def reflect(brand_name: str, domain: str, search_results: list[dict],
            raw_snippets: list[dict] | None = None,
            competitors: list[str] | None = None) -> dict:
    """从搜索结果中提取 AI 对品牌的真实感知。

    Args:
        brand_name: 品牌名称
        domain: 品牌域名
        search_results: fc_search 返回的 dict 列表
        raw_snippets: DDG 搜索的原始 snippet 列表
        competitors: 竞品域名列表（用于提取竞品上下文）

    Returns:
        MarketPerception dict
    """
    brand_texts = []      # 明确提到品牌的内容
    competitor_texts = [] # 提到竞品但未提品牌的内容
    other_texts = []      # 行业相关内容（未提品牌也未提竞品）
    sources = set()

    # 品牌域名归一化，用于过滤官网来源污染
    brand_domain = domain.lower().removeprefix("www.") if domain else ""

    comp_names_lower = set()
    if competitors:
        comp_names_lower = {c.lower() for c in competitors}

    for sr in search_results:
        if not isinstance(sr, dict):
            continue
        answer = sr.get("answer", "")

        # 检查答案来源是否包含品牌官网
        answer_sources = [c.get("url", "") for c in sr.get("raw_citations", [])]
        is_from_brand_site = any(brand_domain in url.lower() for url in answer_sources if brand_domain)

        mentions_brand = _mentions_brand(answer, brand_name)
        mentions_comp = any(
            _mentions_brand(answer, c) for c in comp_names_lower
        ) if comp_names_lower else False

        if mentions_brand:
            # 来自品牌官网的内容归入 other_texts，不作为 AI 感知
            if is_from_brand_site:
                other_texts.append(answer)
            else:
                brand_texts.append(answer)
        elif mentions_comp:
            competitor_texts.append(answer)
        elif len(answer) > 100:
            other_texts.append(answer)

        # 收集 DDG 来源（过滤品牌官网）
        for c in sr.get("raw_citations", []):
            sn = c.get("snippet", "")
            url = c.get("url", "")
            sources.add(url)
            if sn:
                if brand_domain and brand_domain in url.lower():
                    continue  # 跳过品牌官网来源
                if _mentions_brand(sn, brand_name):
                    brand_texts.append(sn)
                elif mentions_comp and any(_mentions_brand(sn, c) for c in comp_names_lower):
                    competitor_texts.append(sn)
                else:
                    other_texts.append(sn)

    # DDG 额外 snippets（过滤品牌官网）
    if raw_snippets:
        for s in raw_snippets:
            sn = s.get("snippet", "")
            url = s.get("url", "")
            sources.add(url)
            if brand_domain and brand_domain in url.lower():
                continue  # 跳过品牌官网来源
            if sn and _mentions_brand(sn, brand_name):
                brand_texts.append(sn)

    if not brand_texts:
        return {
            "perceived_identity": f"No search results mentioned {brand_name}.",
            "perceived_strengths": [],
            "perceived_weaknesses": [],
            "perceived_positioning": "Unknown",
            "perceived_products": [],
            "perceived_market": "Unknown",
            "perception_sources": [],
        }

    # 构建三层上下文
    parts = []

    if brand_texts:
        parts.append("=== What search results say ABOUT " + brand_name + " ===\n"
                     + "\n---\n".join(brand_texts[:12]))

    if competitor_texts:
        parts.append("=== What search results say ABOUT COMPETITORS (for context) ===\n"
                     + "\n---\n".join(competitor_texts[:5]))

    if other_texts:
        parts.append("=== General market context ===\n"
                     + "\n---\n".join(other_texts[:3]))

    merged = "\n\n".join(parts)
    if len(merged) > 18000:
        merged = merged[:18000]

    # 改进版 prompt：允许基于上下文推断，不只做字面提取
    prompt = (
        f"分析以下搜索结果，理解 AI 如何认知 {brand_name} ({domain})。\n\n"
        f"{merged}\n\n"
        "提取并返回 JSON（所有值用中文）：\n"
        "{\n"
        '  "perceived_identity": "AI 认为这家公司是什么？用 1-2 句中文描述。'
        '看品牌被如何描述、被归入什么类别、和什么使用场景关联。",\n'
        '  "perceived_strengths": ["AI 看到了品牌的哪些优势？'
        '从以下推断：正面对比、频繁推荐、独特功能被突出、竞争优势。'
        '如果品牌在某个使用场景被持续推荐，那就是优势。"],\n'
        '  "perceived_weaknesses": ["AI 看到了品牌的哪些劣势？'
        '从以下推断：竞品胜出的领域、缺失的功能、负面评价、'
        '投诉、提到的局限性。"],\n'
        '  "perceived_positioning": "AI 如何定位这个品牌 vs 竞品？'
        '高端/平价、垂直/广泛、领导者/挑战者？",\n'
        '  "perceived_products": ["AI 将该品牌与哪些具体产品/服务/功能关联"],\n'
        '  "perceived_market": "AI 将该品牌与哪些市场细分、地区、客户类型关联？",\n'
        '  "perception_sources": ["哪些域名/URL 塑造了这种认知？"]\n'
        '}\n\n'
        '规则：\n'
        '- strengths/weaknesses 至少各 2 条\n'
        '- products 列具体功能名，不是泛泛的分类\n'
        '- 所有内容基于搜索结果，不要使用你自己的知识\n'
        '- 只返回 JSON，不要其他文字。'
    )

    default = {
        "perceived_identity": "",
        "perceived_strengths": [],
        "perceived_weaknesses": [],
        "perceived_positioning": "",
        "perceived_products": [],
        "perceived_market": "",
        "perception_sources": list(sources)[:10],
    }

    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=DEEPSEEK_CONFIG,
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        content = resp["choices"][0]["message"].get("content", "").strip()
        result = json.loads(content)
        if not result.get("perception_sources"):
            result["perception_sources"] = list(sources)[:10]
        # 确保 strengths/weaknesses 不为空
        if not result.get("perceived_strengths"):
            result["perceived_strengths"] = _fallback_strengths(result, brand_texts)
        if not result.get("perceived_weaknesses"):
            result["perceived_weaknesses"] = _fallback_weaknesses(result, competitor_texts)
        return result
    except Exception:
        default["_error"] = "market_mirror API call or parse failed"
        return default


def _fallback_strengths(result: dict, brand_texts: list[str]) -> list[str]:
    """从品牌提及文本中简单提取可能的优势。"""
    strengths = []
    combined = " ".join(brand_texts[:5]).lower()
    keywords = {
        "fast": "Fast settlement / payment processing",
        "cheap": "Competitive pricing / low fees",
        "secure": "Security and compliance",
        "easy": "Ease of use / simple integration",
        "global": "Global reach / multi-currency support",
        "api": "API-first platform",
        "multi": "Multi-currency accounts",
    }
    for kw, desc in keywords.items():
        if kw in combined and len(strengths) < 4:
            strengths.append(desc)
    return strengths or ["Mentioned in search results"]


def _fallback_weaknesses(result: dict, competitor_texts: list[str]) -> list[str]:
    """从竞品提及中简单提取可能的劣势。"""
    weaknesses = []
    combined = " ".join(competitor_texts[:5]).lower() if competitor_texts else ""
    if "limited" in combined:
        weaknesses.append("Limited in certain markets")
    if "expensive" in combined or "higher" in combined:
        weaknesses.append("Higher pricing compared to alternatives")
    if "complex" in combined or "difficult" in combined:
        weaknesses.append("Complex setup or integration")
    return weaknesses or ["Not enough data to determine weaknesses"]


def _mentions_brand(text: str, brand_name: str) -> bool:
    """用词边界匹配检查文本是否提及品牌名，避免子串误判（如 'Pay' 误匹配 'PayPal'）。"""
    return bool(re.search(r'\b' + re.escape(brand_name.lower()) + r'\b', text.lower()))
