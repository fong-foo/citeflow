# competitor_analyzer.py — 竞品对比分析工具
# 统计品牌和竞品在每个查询词下的引用率


def compare_competitor(citations: list[dict], competitors: list[str]) -> dict:
    """
    统计品牌和竞品在每个查询词下的引用率。

    输出：
    {
        "brand": {"domain": "nike.com", "total_citations": 47, "by_query": {...}},
        "competitors": [
            {"domain": "adidas.com", "total_citations": 31, "by_query": {...}},
            ...
        ]
    }
    """
    # Count brand citations by query
    brand_by_query = {}
    brand_total = 0

    comp_stats = {}
    for comp in competitors:
        comp_domain = comp.lower().replace("www.", "")
        comp_stats[comp_domain] = {"total_citations": 0, "by_query": {}}

    for cite in citations:
        source_url = cite.get("source_url", "").lower()
        engine = cite.get("ai_engine", "unknown")
        # Use query from citation context, or "general" if not available
        query_key = cite.get("query", "general")

        # Check if this is a brand citation (we count all non-competitor as brand)
        is_competitor = False
        for comp_domain in competitors:
            comp_clean = comp_domain.lower().replace("www.", "")
            comp_base = comp_clean.split(".")[0]
            if comp_clean in source_url or comp_base in source_url:
                comp_stats[comp_clean]["total_citations"] += 1
                if query_key not in comp_stats[comp_clean]["by_query"]:
                    comp_stats[comp_clean]["by_query"][query_key] = 0
                comp_stats[comp_clean]["by_query"][query_key] += 1
                is_competitor = True
                break

        if not is_competitor:
            brand_total += 1
            if query_key not in brand_by_query:
                brand_by_query[query_key] = 0
            brand_by_query[query_key] += 1

    result = {
        "brand": {
            "total_citations": brand_total,
            "by_query": brand_by_query,
        },
        "competitors": [
            {
                "domain": domain,
                "total_citations": stats["total_citations"],
                "by_query": stats["by_query"],
            }
            for domain, stats in comp_stats.items()
        ],
    }

    return result
