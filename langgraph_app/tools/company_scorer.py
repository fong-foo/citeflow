# company_scorer.py — 企业量化评分
# 5 维度评分：品牌力 / 产品力 / 内容力 / 技术力 / 市场力
# 每项 0-100，行业加权得出综合分

import json
from langgraph_app.config import DEEPSEEK_CONFIG
from langgraph_app.tools.engines.chatgpt_api import call_api


INDUSTRY_WEIGHTS = {
    "B2B SaaS": {"品牌力": 0.15, "产品力": 0.25, "内容力": 0.20, "技术力": 0.30, "市场力": 0.10},
    "跨境支付": {"品牌力": 0.25, "产品力": 0.20, "内容力": 0.10, "技术力": 0.25, "市场力": 0.20},
    "DTC品牌":  {"品牌力": 0.35, "产品力": 0.15, "内容力": 0.25, "技术力": 0.05, "市场力": 0.20},
}
DEFAULT_WEIGHTS = {"品牌力": 0.20, "产品力": 0.20, "内容力": 0.20, "技术力": 0.20, "市场力": 0.20}

DIMENSION_NAMES = ["品牌力", "产品力", "内容力", "技术力", "市场力"]
SCORE_ANCHORS = (
    "0-20:  极弱 — AI almost never mentions the brand or describes it incorrectly\n"
    "21-40: 较弱 — AI mentions the brand but lacks depth or accuracy\n"
    "41-60: 中等 — AI has basic awareness but nothing standout\n"
    "61-80: 较强 — AI describes the brand accurately with positive impression\n"
    "81-100: 极强 — AI treats the brand as an industry benchmark or top recommendation"
)


def score(brand_profile: dict, market_perception: dict,
          citation_rate: float, gap_report: dict, industry: str,
          recommendation_rate: float = 0.0) -> dict:
    """5 维度量化评分。返回 CompanyScore dict。"""
    weights = INDUSTRY_WEIGHTS.get(industry, DEFAULT_WEIGHTS)

    prompt = (
        f"Score this company on 5 dimensions (0-100) based on the data below.\n\n"
        f"=== BRAND PROFILE ===\n"
        f"{json.dumps(brand_profile, ensure_ascii=False)}\n\n"
    )

    # market_perception：空时跳过（light 模式无此模块）
    if market_perception and any(v for v in market_perception.values() if v):
        prompt += (
            f"=== AI MARKET PERCEPTION ===\n"
            f"{json.dumps(market_perception, ensure_ascii=False)}\n\n"
        )
    else:
        prompt += "=== AI MARKET PERCEPTION ===\n暂无数据（免费体检未包含此模块）\n\n"

    prompt += (
        f"=== CITATION DATA ===\n"
        f"引用率: {citation_rate}%（品牌被 AI 提及的频率）\n"
        f"推荐率: {recommendation_rate}%（提及中 AI 真正推荐品牌的比例）\n\n"
    )

    # gap_report：用 misaligned/blind_spots 判空，避免 alignment_score=0 误杀
    if gap_report and (gap_report.get("misaligned") or gap_report.get("blind_spots")):
        prompt += (
            f"=== GAP ANALYSIS ===\n"
            f"对齐度: {gap_report.get('alignment_score', 0)}/100\n"
            f"偏差领域: {', '.join(gap_report.get('misaligned', [])) or '无'}\n"
            f"盲点: {', '.join(gap_report.get('blind_spots', [])) or '无'}\n\n"
        )
    else:
        prompt += "=== GAP ANALYSIS ===\n暂无数据（免费体检未包含此模块）\n\n"

    prompt += ("评分维度:\n"
        "1. 品牌力 — AI 是否认可品牌价值？市场定位是否清晰？\n"
        "2. 产品力 — AI 是否准确描述核心产品？差异化是否突出？\n"
        "3. 内容力 — AI提及品牌时是正面还是负面？高引用率+低推荐率=负面刷屏→低内容力。高引用率+高推荐率=品牌内容被AI积极采纳→高内容力。\n"
        "4. 技术力 — AI 是否认可技术壁垒？（对 B2B SaaS 重要）\n"
        "5. 市场力 — AI 是否提及市场覆盖、客户群体、地区？\n\n"
        "SCORING ANCHORS:\n"
        f"{SCORE_ANCHORS}\n\n"
        "返回 JSON（evidence 和 suggestion 用中文）:\n"
        '{\n'
        '  "dimensions": [\n'
        '    {"name": "品牌力", "score": 75, "evidence": "AI 持续推荐该品牌...", "suggestion": "加强..."},\n'
        '    {"name": "产品力", "score": 68, "evidence": "...", "suggestion": "..."},\n'
        '    {"name": "内容力", "score": 55, "evidence": "...", "suggestion": "..."},\n'
        '    {"name": "技术力", "score": 60, "evidence": "...", "suggestion": "..."},\n'
        '    {"name": "市场力", "score": 50, "evidence": "...", "suggestion": "..."}\n'
        '  ]\n'
        '}\n\n'
        "要求:\n"
        "- evidence: 引用输入数据中的具体信息，不要泛泛而谈\n"
        "- suggestion: 一句可执行的改进建议\n"
        "- 只返回 JSON，不要其他文字。"
    )

    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=DEEPSEEK_CONFIG,
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        content = resp["choices"][0]["message"].get("content", "").strip()
        result = json.loads(content)
    except (json.JSONDecodeError, KeyError, Exception):
        return {
            "overall": 0, "dimensions": [],
            "industry": industry, "weights_used": weights,
            "_error": "company_scorer API call or parse failed",
        }

    dimensions = result.get("dimensions", [])
    if not dimensions:
        return {
            "overall": 0, "dimensions": [],
            "industry": industry, "weights_used": weights,
            "_error": "no dimensions returned",
        }

    overall = sum(
        d.get("score", 0) * weights.get(d.get("name", ""), 0.2)
        for d in dimensions
    )

    return {
        "overall": round(overall),
        "dimensions": dimensions,
        "industry": industry,
        "weights_used": weights,
    }
