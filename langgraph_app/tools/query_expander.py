# query_expander.py — 查询扩展工具
# 用 LLM 扩展种子查询词，生成 20-30 个变体

import os
import json
import httpx


def expand_queries(seeds: list[str], industry: str, product: str) -> list[str]:
    """
    用 LLM 扩展种子查询词，生成 20-30 个变体。

    变体类型：
    · 品类变体：best running shoes → best running shoes for beginners
    · 品牌变体：加品牌名 → Nike running shoes
    · 竞品对比：加竞品 → Nike vs Adidas
    · 问题变体：转问答 → are Nike running shoes good
    · 时间变体：加年份 → best running shoes 2026

    返回：扩展后的查询词列表
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")

    if not api_key:
        # Mock fallback: generate simple variants from seeds
        return _mock_expand(seeds, industry, product)

    prompt = f"""You are a search query expansion expert. Given seed queries, expand them into 20-30 variants.

Seed queries: {seeds}
Industry: {industry}
Product/Service: {product}

Generate variants in these categories:
1. Category variants: add qualifiers (e.g., "best running shoes" → "best running shoes for beginners")
2. Brand variants: combine with brand keywords
3. Competitor comparison: add "vs" comparisons
4. Question variants: convert to questions (e.g., "are X good")
5. Time variants: add year (e.g., "best running shoes 2026")

Return ONLY a JSON array of strings, no explanation.
Example: ["query1", "query2", ...]"""

    try:
        resp = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
            },
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        # Parse JSON array from response
        queries = json.loads(content)
        if isinstance(queries, list) and len(queries) > 0:
            return queries[:30]  # Cap at 30
    except Exception:
        pass  # Fall through to mock

    return _mock_expand(seeds, industry, product)


def _mock_expand(seeds: list[str], industry: str, product: str) -> list[str]:
    """Generate simple query variants without LLM."""
    expanded = list(seeds)  # Start with original seeds

    suffixes = [
        "for beginners",
        "2026",
        "review",
        "comparison",
        "best",
        "top rated",
        "affordable",
        "premium",
        "professional",
        "vs alternatives",
    ]

    question_prefixes = [
        "what is the best",
        "how to choose",
        "are there good",
        "which is better",
        "what are",
    ]

    for seed in seeds:
        # Category variants
        for suffix in suffixes:
            expanded.append(f"{seed} {suffix}")

        # Question variants
        for prefix in question_prefixes:
            expanded.append(f"{prefix} {seed}")

        # Time variant
        expanded.append(f"{seed} 2026")

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for q in expanded:
        q_lower = q.lower().strip()
        if q_lower not in seen:
            seen.add(q_lower)
            unique.append(q.strip())

    return unique[:30]
