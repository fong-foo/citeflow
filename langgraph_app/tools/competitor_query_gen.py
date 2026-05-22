# competitor_query_gen.py — 竞品对比查询生成
# 品牌 + 竞品列表 → 15 个"A vs B 你选谁"对比问题（调 DeepSeek）
# search_and_answer() — 搜索 → 合成答案（消除上游幻觉）

import asyncio
from langgraph_app.config import DEEPSEEK_CONFIG
from langgraph_app.tools.engines.chatgpt_api import call_api
from langgraph_app.tools.engines.search_utils import search_serper, synthesize_answer


def generate(brand_name: str, competitors: list[str], industry: str) -> list[str]:
    """生成 15 个品牌 vs 竞品的对比问题。"""
    comp_text = ", ".join(competitors)
    prompt = (
        f"You are a market researcher. Generate 15 comparison questions that "
        f"real users would ask when comparing products.\n\n"
        f"Brand: {brand_name}\n"
        f"Competitors: {comp_text}\n"
        f"Industry: {industry}\n\n"
        "Generate exactly 15 questions, mixing these 3 types (5 each):\n"
        "1. Pure preference: \"If you had to choose between A and B, which...\"\n"
        "2. Scenario-based: \"For a startup with limited budget, A or B?\"\n"
        "3. Feature-based: \"Which has better security, A or B?\"\n\n"
        "Requirements:\n"
        "- Questions must sound like real users, not formal surveys\n"
        "- Scenario-based must include specific contexts (budget, enterprise, startup, global)\n"
        "- Feature-based must cover a diverse range of dimensions that real buyers "
        "in this industry care about — consider product quality, price, support, "
        "and any industry-specific factors (e.g. sustainability for eco brands, "
        "compliance for fintech, durability for hardware, scalability for SaaS)\n"
        "- All questions in English\n"
        "- Return EXACTLY 15 questions, one per line, no numbering, no bullets\n"
        "Output format: plain text, one question per line, nothing else."
    )

    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=DEEPSEEK_CONFIG,
            temperature=0.8,
        )
        content = resp["choices"][0]["message"].get("content", "")
    except Exception as e:
        return [f"[generate failed: {e}]"]

    questions = []
    for line in content.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        line = line.lstrip("0123456789.-) ").strip()
        if line and len(line) > 10:
            questions.append(line)

    seen = set()
    unique = []
    for q in questions:
        ql = q.lower()
        if ql not in seen:
            seen.add(ql)
            unique.append(q)

    return unique[:15]


# ═══════════════════════════════════════════════════════════════
# 搜索 → 合成答案（消除上游幻觉）
# ═══════════════════════════════════════════════════════════════

async def search_and_answer(query: str, semaphore: asyncio.Semaphore = None) -> dict:
    """单次"搜索→合成"原语

    Args:
        query: 竞品对比查询词
        semaphore: 并发控制信号量

    Returns:
        {"query": str, "answer": str, "search_results": list[dict]}
    """
    if semaphore is None:
        semaphore = asyncio.Semaphore(1)

    async with semaphore:
        search_results = await search_serper(query)
        answer = await synthesize_answer(query, search_results, DEEPSEEK_CONFIG)

        return {
            "query": query,
            "answer": answer,
            "search_results": search_results,
        }
