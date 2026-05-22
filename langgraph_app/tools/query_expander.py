# query_expander.py — 查询词扩展
# 3 个种子词 → 30 个真实用户会搜的英文查询词（调 DeepSeek）
# 行业通用查询独立 LLM 调用（不传品牌名），品牌+竞品查询另一调用
# 两个 LLM 调用并行执行
# 三分类 + Jaccard 去重 + 模板池补充

import asyncio
import re
from langgraph_app.config import DEEPSEEK_CONFIG
from langgraph_app.tools.engines.chatgpt_api import call_api

INDUSTRY_TEMPLATES = [
    "best {term} brands 2025",
    "{term} market leaders",
    "top rated {term}",
    "{term} comparison guide",
    "best {term} for beginners",
    "{term} reviews and ratings",
    "affordable {term} options",
    "premium {term} brands",
    "{term} buying guide",
    "{term} recommendations",
    "best {term} companies",
    "{term} expert picks",
    "{term} what to look for",
    "most innovative {term}",
    "{term} pros and cons",
]

JACCARD_THRESHOLD = 0.35
TARGET_PER_CATEGORY = 10

# 品牌名/产品名的修饰词（从种子词中剥离，保留通用产品名）
ADJECTIVE_STRIP = {
    "eco-friendly", "eco friendly", "sustainable", "compostable",
    "biodegradable", "biodegradable", "plant-based", "plant based",
    "environmental friendly", "environmentally friendly", "green",
    "recyclable", "recycled", "organic", "non-toxic", "non toxic",
    "zero waste", "zerowaste", "plastic-free", "plastic free",
    "best", "top", "affordable", "premium", "cheap", "luxury",
}


async def expand(seeds: list[str], industry: str, brand_name: str,
                  competitors: list[str] | None = None) -> list[dict]:
    """将种子查询词扩展为 30 个英文查询词，分 3 类，去重。

    行业通用查询在独立 LLM 调用中生成，不传品牌名，避免污染。
    两个 LLM 调用并行执行。
    """
    competitors = competitors or []
    comp_names = _extract_competitor_names(competitors)

    # 从种子词中提取通用产品关键词（优先用 industry 的英文部分）
    product_keyword = _extract_generic_product(seeds, brand_name, industry=industry)

    # ── 1. 两个 LLM 调用并行 ──────────────────────
    loop = asyncio.get_running_loop()
    industry_task = loop.run_in_executor(
        None, _generate_industry_queries, product_keyword, industry)
    brand_comp_task = loop.run_in_executor(
        None, _generate_brand_competitor_queries, brand_name, comp_names, seeds, industry)

    industry_queries, brand_comp_queries = await asyncio.gather(
        industry_task, brand_comp_task)

    # ── 2. 合并 + 去重 ─────────────────────────────
    all_queries = industry_queries + brand_comp_queries
    deduped = _jaccard_dedup(all_queries)

    # ── 3. 按类别回填，确保各 10 条 ────────────────
    result = _rebalance(deduped, product_keyword, brand_name, comp_names)
    return result[:30]


# ═══════════════════════════════════════════════════════════════
# LLM 调用 A：行业通用（完全不知道品牌存在）
# ═══════════════════════════════════════════════════════════════

PURCHASE_BANNED_PATTERNS = [
    r"\bhow\s+to\b", r"\bhow\s+do\b", r"\bhow\s+does\b",
    r"\bwhat\s+is\b", r"\bwhat\s+are\b",
    r"\bguide\b", r"\btutorial\b", r"\btips\b",
    r"\bmaintenance\b", r"\brepair\b",
    r"\bwhere\s+to\s+buy\b", r"\bhow\s+to\s+choose\b",
    r"\bhow\s+to\s+select\b", r"\bhow\s+to\s+find\b",
    r"\bdifference\s+between\b",
    r"\bwhen\s+to\b", r"\bwhy\s+is\b",
    r"\bbuying\s+guide\b", r"\bpurchasing\s+guide\b",
    r"\bhow\s+(much|long|many|often)\b",
]


def _is_purchase_query(q: str) -> bool:
    q_lower = q.lower()
    for pattern in PURCHASE_BANNED_PATTERNS:
        if re.search(pattern, q_lower):
            return False
    return True


def _generate_industry_queries(product_keyword: str, industry: str = "") -> list[dict]:
    """生成 10 条购买决策型 A 类查询词。零知识型/教程型查询。
    不传品牌名、不传种子词、不传竞品。
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
        f"You are a person who wants to BUY a product. You don't know which "
        f"brand to pick yet. You are about to type something into Google or "
        f"ChatGPT to get product recommendations.\n\n"
        f"Product category: {product_keyword}"
        f"{industry_line}"
        f"{chinese_hint}\n"
        "Generate 10 search queries that someone READY TO PURCHASE would type.\n\n"
        "QUERY TYPES TO GENERATE:\n"
        "- Purchase intent (6): 'best X for small business', 'top rated X under $500', "
        "'recommended X for beginners'\n"
        "- Brand discovery (2): 'what brand of X is best', 'which company makes the best X'\n"
        "- Made in China (2): 'Chinese X brands review', 'best X made in China'\n\n"
        "CRITICAL RULES:\n"
        "- Every query must imply PURCHASE INTENT. The person is buying, not learning.\n"
        "- DO NOT generate: how-to, tutorials, maintenance guides, technical comparisons, "
        "buying guides, 'where to buy', 'what is the difference', 'X vs Y'\n"
        "- These are WRONG and must NOT appear:\n"
        "  'how to choose X', 'X maintenance tips', 'X vs Y comparison', "
        "'what is X', 'X buying guide', 'where to buy X', 'how does X work'\n"
        "- These are GOOD examples:\n"
        "  'best X for small business', 'top rated X brands 2025', "
        "'what brand of X is best', 'Chinese X manufacturers review'\n"
        "- All queries in English\n"
        "- Output exactly 10 queries, one per line, no numbering, no bullets\n"
        "Output: plain text, one query per line."
    )

    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=DEEPSEEK_CONFIG,
            temperature=0.8,
        )
        content = resp["choices"][0]["message"].get("content", "")
    except Exception:
        return []

    queries = _parse_lines(content)

    # ── 后处理：正则过滤知识型查询词 ──
    industry_queries = [
        {"query": q, "category": "industry"}
        for q in queries if _is_purchase_query(q)
    ]

    # 过滤后不足 8 条，用模板池补充
    if len(industry_queries) < 8:
        templates = [
            "best {term} brands 2025",
            "top rated {term}",
            "recommended {term} for beginners",
            "best {term} for small business",
            "affordable {term} that works well",
            "most reliable {term} brands",
            "what brand of {term} is best",
            "which company makes the best {term}",
            "Chinese {term} brands review",
            "best {term} made in China",
        ]
        existing_lower = {q["query"].lower() for q in industry_queries}
        for tpl in templates:
            if len(industry_queries) >= 10:
                break
            q = tpl.format(term=product_keyword)
            if q.lower() not in existing_lower:
                industry_queries.append({"query": q, "category": "industry"})
                existing_lower.add(q.lower())

    return industry_queries[:10]


# ═══════════════════════════════════════════════════════════════
# LLM 调用 B：品牌直接 + 竞品场景
# ═══════════════════════════════════════════════════════════════

def _generate_brand_competitor_queries(brand_name: str, comp_names: list[str],
                                       seeds: list[str], industry: str) -> list[dict]:
    """生成品牌直接查询 + 竞品场景查询。传品牌和竞品信息。"""
    seeds_text = "\n".join(f"- {s}" for s in seeds)
    comp_hint = ""
    if comp_names:
        comp_hint = (
            f"Competitors: {', '.join(comp_names)} "
            f"(use ONLY these for competitor queries)\n"
        )

    has_chinese = any('一' <= c <= '鿿' for c in industry)
    chinese_hint = ""
    if has_chinese:
        chinese_hint = (
            "\nIMPORTANT: The industry above is in Chinese. "
            "Understand its meaning and generate relevant English search queries.\n"
        )

    prompt = (
        f"You are a search behavior expert. Generate real search queries about a brand "
        f"and its competitors.\n\n"
        f"Brand: {brand_name}\n"
        f"Industry: {industry}"
        f"{chinese_hint}\n"
        f"Seed queries:\n{seeds_text}\n"
        f"{comp_hint}\n"
        "Generate two categories of queries:\n\n"
        "1. Brand-specific (10 queries): Users searching for THIS brand\n"
        f"   - MUST include the brand name \"{brand_name}\"\n"
        "   - Mix: reviews, comparisons, pricing, where to buy, quality, customer service\n\n"
        "2. Competitor scenarios (10 queries): Users comparing or researching competitors\n"
        f"   - Use competitor names from the list above\n"
        "   - These are scenarios where users mention competitors\n\n"
        "- All queries in English, sound like real users\n"
        "- Return exactly 20 queries, one per line, no numbering, no bullets\n"
        "- Output in order: first 10 brand-specific, then 10 competitor\n"
        "Output: plain text, one query per line."
    )

    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=DEEPSEEK_CONFIG,
            temperature=0.7,
        )
        content = resp["choices"][0]["message"].get("content", "")
    except Exception:
        return []

    queries = _parse_lines(content)
    result = []
    brand_lower = brand_name.lower()

    for q in queries:
        ql = q.lower()
        has_brand = _brand_matches(brand_lower, ql)
        has_comp = any(_brand_matches(c.lower(), ql) for c in comp_names)
        # 同时含品牌+竞品 → competitor（比较场景）
        if has_comp:
            result.append({"query": q, "category": "competitor"})
        elif has_brand:
            result.append({"query": q, "category": "brand"})
        # 既不含品牌也不含竞品 → 丢弃，不污染 industry 池
    return result


# ═══════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════

def _extract_generic_product(seeds: list[str], brand_name: str,
                            industry: str = "", core_product: str = "") -> str:
    """从种子词提取通用产品关键词。

    优先级：industry英文部分 > core_product英文部分 > 种子词提取
    例如 "彩妆（Color Cosmetics）" → "color cosmetics"
    """
    # 1. 优先从 industry 提取英文（括号内英文）
    if industry:
        eng = _extract_english_from_parens(industry)
        if eng:
            return eng
        # 全英文 industry → 检查质量，避免将品牌名或长句当产品关键词
        if all(c.isascii() or c.isspace() for c in industry):
            cleaned = industry.lower().strip()
            words = cleaned.split()
            # 守卫1：超过5个词的句子不是产品关键词，取前3个有意义的词
            if len(words) > 5:
                noise = {"discover", "shop", "welcome", "find", "browse", "explore", "get", "buy",
                         "the", "at", "in", "on", "and", "or", "for", "with", "your", "our", "new"}
                meaningful = [w for w in words if w not in noise and len(w) > 2]
                return " ".join(meaningful[:3]) if meaningful else " ".join(words[:3])
            # 守卫2：包含品牌名 → 不可直接当产品关键词，走种子词提取
            brand_lower = brand_name.lower()
            if brand_lower and brand_lower in cleaned:
                pass  # fall through to seed-based extraction
            else:
                return cleaned
        # 纯中文 industry → 直接传给 LLM，不 fallback 到 "consumer products"
        if not all(c.isascii() or c.isspace() for c in industry):
            return industry

    # 2. 从 core_product 提取英文
    if core_product:
        eng = _extract_english_from_parens(core_product)
        if eng:
            return eng
        if all(c.isascii() or c.isspace() for c in core_product):
            return core_product.lower().strip()
        return core_product

    # 3. 从种子词中提取（原有逻辑）
    all_text = " ".join(seeds).lower()
    brand_lower = brand_name.lower()
    all_text = all_text.replace(brand_lower, "")

    # 已知产品词模式（扩展了美妆/时尚类别）
    product_patterns = [
        "eyeshadow", "lipstick", "lip gloss", "lip tint", "lip oil",
        "blush", "foundation", "highlighter", "mascara", "eyeliner",
        "makeup", "cosmetics", "skincare", "concealer", "bronzer",
        "phone case", "phone cases", "charger", "cable", "accessory",
        "wallet", "screen protector", "airpods case", "watch band",
        "laptop", "tablet", "headphones", "earbuds", "keyboard",
    ]
    for pattern in product_patterns:
        if pattern in all_text:
            return pattern

    # 退而求其次：取有意义英文单词中频次最高的核心名词
    words = all_text.split()
    # 扩展停用词和修饰词列表
    noise_words = {
        "best", "most", "what", "where", "when", "that", "this",
        "with", "from", "than", "worth", "review", "reviews",
        "cute", "fairy", "tale", "anime", "style", "young", "women",
        "brands", "brand", "2025", "2024", "2026", "for", "and",
        "luxury", "affordable", "premium", "cheap", "top",
    }
    meaningful = [w for w in words if w.isascii() and len(w) > 3 and w not in noise_words]
    if meaningful:
        return " ".join(meaningful[-3:])  # 取最后3个词增加覆盖率
    return "consumer products"


def _extract_english_from_parens(text: str) -> str:
    """从文本的括号中提取英文部分。
    "彩妆（Color Cosmetics）" → "color cosmetics"
    "眼影盘、唇釉（eyeshadow, lip gloss）" → "eyeshadow, lip gloss"
    """
    match = re.search(r'[（(]([a-zA-Z][^）)]*)[）)]', text)
    if match:
        return match.group(1).strip().lower()
    return ""


def _extract_competitor_names(competitors: list[str]) -> list[str]:
    """从域名列表提取品牌名。'casetify.com' → 'Casetify'"""
    names = []
    for c in competitors:
        c = c.strip().lower()
        for prefix in ["https://", "http://", "www."]:
            if c.startswith(prefix):
                c = c[len(prefix):]
        brand = c.split(".")[0]
        if brand and len(brand) > 2:
            names.append(brand)
    return names


def _parse_lines(content: str) -> list[str]:
    """解析 LLM 返回的纯文本，每行一条查询。"""
    queries = []
    for line in content.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        line = line.lstrip("0123456789.-) ").strip()
        if line and len(line) > 3:
            queries.append(line)
    return queries


def _brand_matches(name: str, text: str) -> bool:
    """检查品牌名是否匹配查询文本。"""
    if name in text:
        return True
    stopwords = {"a", "an", "the", "of", "in", "on", "at", "to", "for", "and", "or", "is", "are"}
    words = [w for w in name.split() if w not in stopwords and len(w) > 2]
    if not words:
        return False
    return words[0] in text


def _jaccard_similarity(a: str, b: str) -> float:
    """计算两个查询词的 Jaccard 相似度（基于单词集合）。"""
    set_a = set(a.lower().split())
    set_b = set(b.lower().split())
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)


def _jaccard_dedup(classified: list[dict]) -> list[dict]:
    """Jaccard 去重。"""
    result = []
    for item in classified:
        is_dup = False
        for kept in result:
            if _jaccard_similarity(item["query"], kept["query"]) > JACCARD_THRESHOLD:
                is_dup = True
                break
        if not is_dup:
            result.append(item)
    return result


def _rebalance(classified: list[dict], product_keyword: str,
               brand_name: str, comp_names: list[str]) -> list[dict]:
    """确保每类有 10 条。不足的从模板池补充行业查询。"""
    result = list(classified)

    # 统计各类数量
    counts = {"industry": 0, "brand": 0, "competitor": 0}
    for item in result:
        counts[item["category"]] += 1

    # 行业通用类不足，从模板池补充
    industry_short = TARGET_PER_CATEGORY - counts["industry"]
    if industry_short > 0:
        used_queries = {item["query"].lower() for item in result}
        templates = [t.format(term=product_keyword) for t in INDUSTRY_TEMPLATES]
        for tq in templates:
            if industry_short <= 0:
                break
            ql = tq.lower()
            if ql in used_queries:
                continue
            is_dup = any(
                _jaccard_similarity(tq, kq) > JACCARD_THRESHOLD
                for kq in used_queries
            )
            if not is_dup:
                result.append({"query": tq, "category": "industry"})
                used_queries.add(ql)
                industry_short -= 1

    return result
