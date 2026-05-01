# citation_classifier.py — 引用分类工具
# 用 LLM 判断引用情感

import os
import httpx


def classify_citation(quote_text: str, core_product: str) -> str:
    """
    用 LLM 判断引用情感。

    分类标准：
    · positive：引用内容与品牌定位一致，评价积极
    · neutral：客观提及，无明显倾向
    · deviation：引用内容与品牌实际定位不匹配
    · negative：引用内容是负面评价

    返回：sentiment 字符串
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")

    if not api_key:
        return _mock_classify(quote_text, core_product)

    prompt = f"""Classify the sentiment of this brand/product citation.

Citation text: "{quote_text}"
Brand's core product/service: "{core_product}"

Classify as one of:
- positive: citation is positive, aligned with brand positioning
- neutral: objective mention, no clear sentiment
- deviation: citation doesn't match brand's actual positioning (e.g., brand sells running shoes but cited as basketball shoes)
- negative: citation is negative or critical

Return ONLY the classification word, nothing else."""

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
                "temperature": 0.0,
                "max_tokens": 10,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
        result = data["choices"][0]["message"]["content"].strip().lower()

        valid_labels = {"positive", "neutral", "deviation", "negative"}
        if result in valid_labels:
            return result
        # Try to extract from response
        for label in valid_labels:
            if label in result:
                return label
    except Exception:
        pass

    return _mock_classify(quote_text, core_product)


def _mock_classify(quote_text: str, core_product: str) -> str:
    """Simple keyword-based sentiment classification as fallback."""
    text_lower = quote_text.lower()

    negative_words = ["bad", "poor", "terrible", "worst", "awful", "disappointing", "negative", "overpriced"]
    positive_words = ["best", "excellent", "great", "top", "recommended", "outstanding", "amazing", "love"]
    neutral_words = ["available", "offers", "provides", "includes", "option", "consider"]

    neg_count = sum(1 for w in negative_words if w in text_lower)
    pos_count = sum(1 for w in positive_words if w in text_lower)
    neu_count = sum(1 for w in neutral_words if w in text_lower)

    if neg_count > pos_count and neg_count > neu_count:
        return "negative"
    if pos_count > neg_count and pos_count > neu_count:
        return "positive"
    if neu_count > 0:
        return "neutral"
    return "neutral"
