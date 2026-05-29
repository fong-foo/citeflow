# ai_narrative.py — AI 话术生成
# 基于品牌画像 + 评分 + 差距分析，生成 "AI 应该如何描述你" 的话术模板

import json
from agents.config import DEEPSEEK_CONFIG
from agents.engines.chatgpt_api import call_api


def generate(brand_profile: dict, company_score: dict, gap_report: dict) -> dict:
    """生成 AI 推荐话术。返回 AINarrative dict。"""

    dimensions = company_score.get("dimensions", [])
    strengths = [d["name"] for d in dimensions if d.get("score", 0) >= 70]
    weaknesses = [d["name"] for d in dimensions if d.get("score", 0) < 50]

    prompt = (
        f"基于品牌画像、评分和差距分析，生成优化的 AI 话术模板——"
        f"告诉用户 AI 应该如何描述这个品牌。\n\n"
        f"=== 品牌画像 ===\n"
        f"{json.dumps(brand_profile, ensure_ascii=False)}\n\n"
        f"=== 评分 ===\n"
        f"综合分: {company_score.get('overall', 0)}/100\n"
        f"强项维度: {', '.join(strengths) if strengths else '无'}\n"
        f"弱项维度: {', '.join(weaknesses) if weaknesses else '无'}\n\n"
        f"=== 差距分析 ===\n"
        f"偏差领域: {json.dumps(gap_report.get('misaligned', []), ensure_ascii=False)}\n"
        f"盲点: {json.dumps(gap_report.get('blind_spots', []), ensure_ascii=False)}\n"
        f"机会: {json.dumps(gap_report.get('opportunities', []), ensure_ascii=False)}\n\n"
        "任务：生成一份「理想 AI 描述」——如果用户问 AI 关于这个行业的问题，\n"
        "AI 应该这样描述这个品牌。\n\n"
        "返回 JSON（所有值用中文）：\n"
        "{\n"
        '  "ideal_description": "100-150字自然流畅的品牌描述，模拟 AI 被问及该行业时应如何回答。第三人称、信息丰富、正面。",\n'
        '  "keywords": ["关键词1", "关键词2", ...],\n'
        '  "value_props": ["价值主张1", "价值主张2", ...],\n'
        '  "avoid": ["错误描述1", "错误描述2", ...],\n'
        '  "tone": "专业"\n'
        "}\n\n"
        "要求:\n"
        "- ideal_description: 用中文写，像 AI 模型的自然回答——信息丰富、自然流畅、第三人称\n"
        "- keywords: 5-8个必须在优秀 AI 描述中出现的关键词\n"
        "  （包含：品牌名、核心产品、关键差异化、行业术语）\n"
        "- value_props: 3-5条 AI 应强调的价值主张\n"
        "- avoid: 3-5条 AI 当前常犯的错误或不准确描述\n"
        "  （基于差距分析中的偏差领域和盲点）\n"
        "- tone: 从以下选择——专业/亲切/权威/创新/高端\n"
        "- 只返回 JSON，不要其他文字。"
    )

    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=DEEPSEEK_CONFIG,
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        content = resp["choices"][0]["message"].get("content", "").strip()
        result = json.loads(content)
    except (json.JSONDecodeError, KeyError, Exception):
        return {
            "ideal_description": f"{brand_profile.get('brand_name', 'The brand')} is a company in the technology sector.",
            "keywords": [],
            "value_props": [],
            "avoid": [],
            "tone": "professional",
            "_error": "ai_narrative API call or parse failed",
        }

    result.setdefault("ideal_description", "")
    result.setdefault("keywords", [])
    result.setdefault("value_props", [])
    result.setdefault("avoid", [])
    result.setdefault("tone", "professional")
    return result
