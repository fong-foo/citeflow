# gap_analysis.py — 差距分析
# 对比企业自述 vs 市场镜像，输出认知差距

from langgraph_app.config import DEEPSEEK_CONFIG
from langgraph_app.tools.engines.chatgpt_api import call_api
import json


def analyze(self_portrait: str, market_perception: dict, user_input: dict,
            target_positioning: str = "") -> dict:
    """对比品牌自述 vs AI 市场镜像，输出差距报告（双维度）。

    Args:
        self_portrait: 品牌自述/官网描述
        market_perception: market_mirror 返回的 MarketPerception dict
        user_input: 用户输入（industry/target_market/core_product 用于兜底）
        target_positioning: 品牌想让AI看到什么（用于维度2对齐）

    Returns:
        GapReport + CompanyEvaluation dict（含维度2字段）
    """
    mp = market_perception

    # 维度2区块（用户填了 target_positioning 时才有）
    has_target = bool(target_positioning and target_positioning.strip())
    target_section = ""
    target_output_spec = ""
    if has_target:
        target_section = (
            f"=== BRAND'S DESIRED POSITIONING (what the brand WANTS AI to say) ===\n"
            f"{target_positioning}\n\n"
        )
        target_output_spec = (
            '  "target_alignment_score": 60,\n'
            '  "target_aligned": ["desired positioning that AI already reflects"],\n'
            '  "target_misaligned": ["desired positioning that AI does NOT reflect"],\n'
            '  "target_gap_summary": "Brand wants AI to say X, but AI says Y. The gap is Z.",\n'
        )

    prompt = (
        f"Compare what a company says about itself vs how AI actually perceives it "
        f"based on real search results.\n\n"
        f"=== COMPANY SELF-DESCRIPTION ===\n"
        f"{self_portrait}\n\n"
        f"=== HOW AI PERCEIVES THIS COMPANY ===\n"
        f"Identity: {mp.get('perceived_identity', 'N/A')}\n"
        f"Strengths: {', '.join(mp.get('perceived_strengths', []))}\n"
        f"Weaknesses: {', '.join(mp.get('perceived_weaknesses', []))}\n"
        f"Positioning: {mp.get('perceived_positioning', 'N/A')}\n"
        f"Products: {', '.join(mp.get('perceived_products', []))}\n"
        f"Market: {mp.get('perceived_market', 'N/A')}\n\n"
        f"{target_section}"
        f"=== USER CLAIMS (reference) ===\n"
        f"Industry: {user_input.get('industry', 'N/A')}\n"
        f"Target market: {user_input.get('target_market', 'N/A')}\n"
        f"Core product: {user_input.get('core_product', 'N/A')}\n\n"
        'Return a JSON object with exactly these keys (ALL string values in Chinese):\n'
        '{\n'
        '  "alignment_score": 75,\n'
        '  "aligned": ["area where self-image matches AI perception"],\n'
        '  "misaligned": ["area where AI sees something different"],\n'
        '  "blind_spots": ["thing company emphasizes but AI does not mention"],\n'
        '  "opportunities": ["positive thing AI says that company could amplify"],\n'
        '  "one_line_summary": "AI sees you as X, but you want to be seen as Y. The gap is Z.",\n'
        f'{target_output_spec}'
        '  "overall": "1-2 sentence overall company evaluation",\n'
        '  "strengths_list": ["company strength 1", "company strength 2", "company strength 3"],\n'
        '  "weaknesses_list": ["company weakness 1", "company weakness 2"],\n'
        '  "positioning": "market positioning description"\n'
        '}\n\n'
        'Scoring anchors for alignment_score and target_alignment_score:\n'
        '  0-20:  Completely misaligned (AI describes a different company)\n'
        '  21-40: Mostly misaligned (major contradictions)\n'
        '  41-60: Partially aligned (some matches, some gaps)\n'
        '  61-80: Mostly aligned (minor deviations)\n'
        '  81-100: Highly aligned (AI accurately reflects company positioning)\n\n'
        'IMPORTANT: aligned/misaligned/blind_spots/opportunities must be specific '
        'and actionable. Cite concrete details from both the self-description and the AI perception.\n\n'
        'For overall/strengths_list/weaknesses_list/positioning: synthesize a balanced '
        'company evaluation based on both the self-description and AI perception.\n\n'
        'Return ONLY the JSON object, no other text.'
    )

    default = {
        "alignment_score": 0,
        "aligned": [],
        "misaligned": [],
        "blind_spots": [],
        "opportunities": [],
        "one_line_summary": "Analysis unavailable.",
        "target_alignment_score": 0,
        "target_aligned": [],
        "target_misaligned": [],
        "target_gap_summary": "",
        "overall": "",
        "strengths_list": [],
        "weaknesses_list": [],
        "positioning": "",
    }

    content = ""
    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=DEEPSEEK_CONFIG,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        content = resp["choices"][0]["message"].get("content", "").strip()
        return json.loads(content)
    except json.JSONDecodeError:
        default["_error"] = f"JSON parse failed: {content[:200]}"
        return default
    except Exception as e:
        default["_error"] = f"API call failed: {e}"
        return default
