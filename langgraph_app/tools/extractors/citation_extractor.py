# citation_extractor.py — 引用提取工具
# 从原始返回结果中提取品牌引用

import re


def extract_citations(raw_results: list[dict], brand_domain: str, brand_name: str) -> list[dict]:
    """
    从原始返回结果中提取品牌引用。

    Perplexity：直接从 citations 字段提取来源URL
    ChatGPT：从返回文本中用正则匹配品牌名/域名

    输出：引用列表
    [
        {
            "quote_text": "Nike Air Zoom Pegasus is one of the best running shoes",
            "source_url": "https://runnerclick.com/best-running-shoes",
            "ai_engine": "perplexity",
            "position": 1
        },
        ...
    ]
    """
    citations = []
    position = 1

    # Normalize brand identifiers for matching
    brand_domain_clean = brand_domain.lower().replace("www.", "")
    brand_name_lower = brand_name.lower()

    for result in raw_results:
        if result.get("error"):
            continue

        engine = result.get("engine", "unknown")
        content = result.get("content", "")

        # Extract from Perplexity structured citations
        perp_citations = result.get("citations", [])
        if perp_citations:
            for cite in perp_citations:
                url = cite.get("url", "")
                snippet = cite.get("snippet", "")
                # Check if brand is mentioned in the citation
                if _brand_mentioned(snippet, brand_domain_clean, brand_name_lower):
                    citations.append({
                        "quote_text": snippet,
                        "source_url": url,
                        "ai_engine": engine,
                        "position": position,
                    })
                    position += 1

        # Extract URLs and context from content text (works for both engines)
        urls = re.findall(r'https?://[^\s\)\]"\'<>]+', content)
        for url in urls:
            # Get surrounding context (the sentence containing the URL)
            pattern = re.escape(url)
            match = re.search(r'[^.]*' + pattern + r'[^.]*\.?', content)
            if match:
                context = match.group(0).strip()
                # Check if brand is mentioned in context or URL
                if _brand_mentioned(context + " " + url, brand_domain_clean, brand_name_lower):
                    citations.append({
                        "quote_text": context,
                        "source_url": url,
                        "ai_engine": engine,
                        "position": position,
                    })
                    position += 1

        # Also check for brand mentions in the content itself (even without URLs)
        if _brand_mentioned(content, brand_domain_clean, brand_name_lower) and not perp_citations:
            # Extract sentences mentioning the brand
            sentences = re.split(r'[.!?]+', content)
            for sentence in sentences:
                if _brand_mentioned(sentence, brand_domain_clean, brand_name_lower) and len(sentence.strip()) > 10:
                    # Find the best URL to associate
                    found_url = urls[0] if urls else f"https://{brand_domain_clean}"
                    citations.append({
                        "quote_text": sentence.strip(),
                        "source_url": found_url,
                        "ai_engine": engine,
                        "position": position,
                    })
                    position += 1
                    break  # One citation per result for text-only mentions

    # Deduplicate by source_url
    seen_urls = set()
    unique_citations = []
    for cite in citations:
        url = cite["source_url"].rstrip("/")
        if url not in seen_urls:
            seen_urls.add(url)
            unique_citations.append(cite)

    return unique_citations


def _brand_mentioned(text: str, brand_domain: str, brand_name: str) -> bool:
    """Check if the brand is mentioned in the text."""
    text_lower = text.lower()
    # Check domain (without www)
    if brand_domain in text_lower:
        return True
    # Check brand name
    if brand_name and brand_name in text_lower:
        return True
    # Also check domain parts (e.g., "nike" from "nike.com")
    domain_base = brand_domain.split(".")[0]
    if len(domain_base) > 2 and domain_base in text_lower:
        return True
    return False
