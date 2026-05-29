# intro_composer.py — 企业介绍短文生成
# 纯模板拼接，不调 API。5 个字段拼成 100-150 字英文介绍。

def compose(brand_name: str, domain: str, industry: str,
            target_market: str, core_product: str) -> str:
    """把 5 个字段拼成一篇英文企业介绍短文。"""
    sentences = []

    if brand_name:
        sentences.append(f"{brand_name} is a company in the {industry} sector.")

    if core_product:
        sentences.append(f"It offers {core_product}.")

    if target_market:
        sentences.append(f"It serves the {target_market} market.")

    if domain:
        sentences.append(f"Its official website is {domain}.")

    if not sentences:
        return "No company information available."

    return " ".join(sentences)
