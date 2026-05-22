# citation_analyzer.py — 引用分析器
# 三种模式：企业评价 / 引用分析 / 竞品对比分析
# 全部调 DeepSeek，输出结构化 JSON

import json
import re
from langgraph_app.config import DEEPSEEK_CONFIG
from langgraph_app.tools.engines.chatgpt_api import call_api


def analyze(analysis_type: str, text: str, brand_name: str,
            domain: str = "", competitors: list[str] | None = None,
            search_results: list[dict] | None = None) -> dict:
    """分析文本中的品牌引用情况。

    Args:
        analysis_type: "evaluation" | "citation" | "comparison"
        text: 待分析的文本
        brand_name: 品牌名称
        domain: 品牌域名（citation 模式需要）
        competitors: 竞品列表（comparison 模式需要）
        search_results: 原始搜索结果（comparison 模式用于品牌检测和证据验证）

    Returns:
        根据 analysis_type 返回不同结构的 dict
    """
    if analysis_type == "evaluation":
        return _analyze_evaluation(text, brand_name)
    elif analysis_type == "citation":
        return _analyze_citation(text, brand_name, domain, competitors or [])
    elif analysis_type == "comparison":
        return _analyze_comparison(text, brand_name, competitors or [], search_results or [])
    else:
        return {"error": f"Unknown analysis_type: {analysis_type}"}


def _analyze_evaluation(text: str, brand_name: str) -> dict:
    prompt = (
        f"你是一名商业分析师。基于以下公司描述，评估 {brand_name}。\n\n"
        f"公司描述:\n{text}\n\n"
        '返回 JSON（所有值用中文）:\n'
        '{\n'
        '  "overall": "1-2句总体评价（中文）",\n'
        '  "strengths": ["优势1", "优势2", "优势3"],\n'
        '  "weaknesses": ["劣势1", "劣势2", "劣势3"],\n'
        '  "positioning": "市场定位描述（中文）"\n'
        '}\n'
        '只返回 JSON，不要其他文字。'
    )
    return _call_and_parse(prompt, {
        "overall": "",
        "strengths": [],
        "weaknesses": [],
        "positioning": "",
    })


def _analyze_citation(text: str, brand_name: str, domain: str,
                     competitors: list[str] | None = None) -> dict:
    comp_list = [c for c in (competitors or []) if c]
    comp_section = ""
    if comp_list:
        comp_names = ", ".join(comp_list)
        comp_section = (
            f"同时检查以下竞品是否在文本中被提及：{comp_names}\n"
        )

    prompt = (
        f"分析以下 AI 生成的搜索回答中是否提到了 {brand_name}（{domain}）。\n"
        f"{comp_section}\n"
        f"待分析文本:\n{text}\n\n"
        '返回 JSON（所有值用中文）:\n'
        '{\n'
        '  "is_mentioned": true/false,\n'
        '  "mention_context": "AI 关于该品牌说了什么，未提及时为空字符串",\n'
        '  "reference_source": "AI 引用的来源 URL（如 https://techcrunch.com/...、https://reddit.com/...）或空字符串",\n'
        '  "position": "top" | "middle" | "bottom" | "mention" | "none"'
    )

    if comp_list:
        prompt += (
            ',\n'
            '  "competitor_mentions": {\n'
        )
        for i, c in enumerate(comp_list):
            comma = "," if i < len(comp_list) - 1 else ""
            prompt += (
                f'    "{c}": {{"is_mentioned": true/false, "position": "top"|"middle"|"bottom"|"mention"|"none"}}{comma}\n'
            )
        prompt += '  }\n'

    prompt += (
        '}\n\n'
        'position 规则:\n'
        '- "top": 品牌是列表中的第1推荐\n'
        '- "middle": 品牌是列表中第2或第3\n'
        '- "bottom": 品牌是列表中第4及以后\n'
        '- "mention": 品牌被提及但不在排名列表中\n'
        '- "none": 品牌未被提及\n\n'
        '只返回 JSON，不要其他文字。'
    )

    default = {
        "is_mentioned": False,
        "mention_context": "",
        "reference_source": "",
        "position": "none",
        "competitor_mentions": {},
    }
    return _call_and_parse(prompt, default)


def _tokenize(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    return text.split()


def _calculate_coverage(source_quote: str, original_text: str) -> float:
    if not source_quote:
        return 0.0
    source_tokens = set(_tokenize(source_quote))
    original_tokens = set(_tokenize(original_text))
    if not source_tokens:
        return 0.0
    matched = source_tokens & original_tokens
    return len(matched) / len(source_tokens)


def _min_quote_length(quote: str) -> int:
    """根据语言判断最小 quote 长度。中文 15 字符，英文 30 字符。"""
    chinese_chars = sum(1 for c in quote if '一' <= c <= '鿿')
    if chinese_chars > len(quote) * 0.3:
        return 15
    return 30


def _has_comparison_evidence(quote: str) -> bool:
    """检查 quote 中是否有比较性表述。支持中英文。"""
    quote_lower = quote.lower()
    en_keywords = [
        "better", "worse", "superior", "inferior", "outperform", "underperform",
        "best", "worst", "leading", "lagging", "exceeds", "falls short",
        "more reliable", "less reliable", "higher quality", "lower quality",
        "surpasses", "dominates", "overwhelms",
    ]
    zh_keywords = [
        "更好", "更差", "更优", "更弱", "优于", "不如", "领先", "落后",
        "碾压", "远超", "秒杀", "吊打", "超过", "胜过", "强于", "弱于",
        "好10倍", "好十倍", "差很多", "好很多", "排名第一", "排第一", "垫底",
        "完胜", "完败", "大胜", "惨败",
    ]
    return any(kw in quote_lower for kw in en_keywords + zh_keywords)


def _nullify_ranking(ranking: dict, reason: str):
    ranking["score"] = None
    ranking["verified"] = "unverified"
    ranking["summary"] = reason


def _sync_win_count(dimension_scores: list, win_count: dict):
    """重新计算 win_count：只统计有 score 的维度。全部 None 的维度不参与。"""
    for brand in win_count:
        win_count[brand] = 0

    for dim in dimension_scores:
        rankings = dim.get("rankings", [])
        has_any_score = any(r.get("score") is not None for r in rankings)
        if not has_any_score:
            continue

        scored_rankings = [r for r in rankings if r.get("score") is not None]
        if scored_rankings:
            winner = max(scored_rankings, key=lambda r: r["score"])
            winner_brand = winner.get("brand", "")
            if winner_brand in win_count:
                win_count[winner_brand] += 1


def _validate_dimension_scores(dimension_scores: list, search_results_text: str,
                                dimension_win_count: dict = None) -> list:
    """验证维度打分的证据充分性。四层检查 + 覆盖率验证 + win_count 同步。

    检查1: quote 为空 → nullify
    检查2: quote 在搜索结果中不存在（覆盖率 < 30%）→ nullify
    检查3: quote 长度不足 → nullify
    检查4: 极端分数(85+/15-)无比较表述 → nullify
    通过后: 覆盖率 > 60% → verified, 30-60% → partial, < 30% → unverified（仅标记，不 nullify）
    """
    validated_scores = []

    for dim in dimension_scores:
        validated_rankings = []
        for ranking in dim.get("rankings", []):
            quote = ranking.get("source_quote", "")
            score = ranking.get("score")

            # 检查1: quote 为空
            if not quote.strip():
                _nullify_ranking(ranking, "无来源引用，无法验证")
                validated_rankings.append(ranking)
                continue

            # 检查2: quote 在搜索结果中是否存在
            coverage = _calculate_coverage(quote, search_results_text)
            if coverage < 0.3:
                _nullify_ranking(ranking, "来源引用无法在搜索结果中验证")
                validated_rankings.append(ranking)
                continue

            # 检查3: quote 长度是否足够
            min_len = _min_quote_length(quote)
            if len(quote.strip()) < min_len:
                _nullify_ranking(ranking, "来源引用过短，证据不足以下判断")
                validated_rankings.append(ranking)
                continue

            # 检查4: 极端分数需要更强证据
            if score is not None and (score >= 85 or score <= 15):
                if not _has_comparison_evidence(quote):
                    _nullify_ranking(ranking, "来源引用无明确比较表述，极端分数证据不足")
                    validated_rankings.append(ranking)
                    continue

            # 通过所有检查：常规覆盖率标记
            if coverage > 0.6:
                ranking["verified"] = "verified"
            elif coverage > 0.3:
                ranking["verified"] = "partial"
            else:
                ranking["verified"] = "unverified"

            validated_rankings.append(ranking)

        dim["rankings"] = validated_rankings
        validated_scores.append(dim)

    # 同步更新 dimension_win_count（排除全 null 维度）
    if dimension_win_count is not None:
        _sync_win_count(validated_scores, dimension_win_count)

    return validated_scores


def _analyze_comparison(text: str, brand_name: str, competitors: list[str],
                         search_results: list[dict] | None = None) -> dict:
    """分析 AI 回答中的品牌对比，输出维度级排序矩阵（而非二元胜负）。
    一次 LLM 调用：提取回答中讨论的维度 → 每维度下排品牌名次 → 综合胜者。
    """
    # 品牌提及检测（第1层防御）
    if search_results:
        brand_presence = _extract_mentioned_brands(search_results, brand_name, competitors)
    else:
        brand_presence = {"mentioned": [], "not_mentioned": [brand_name] + competitors}
    mentioned_brands = brand_presence["mentioned"]
    not_mentioned_brands = brand_presence["not_mentioned"]

    # 拼接搜索结果为大字符串（用于证据验证）
    search_results_text = ""
    if search_results:
        for sr in search_results:
            search_results_text += " " + sr.get("title", "") + " " + sr.get("snippet", "")

    comp_text = ", ".join(competitors)

    brand_hint = ""
    if not_mentioned_brands:
        brand_hint = (
            f"**关键规则：没有数据 = null，不是 0 也不是 100**\n\n"
            f"以下品牌在搜索结果中被明确提到: {', '.join(mentioned_brands) if mentioned_brands else '无'}\n"
            f"以下品牌在搜索结果中未被提到: {', '.join(not_mentioned_brands)}\n\n"
            f"- 只对\"被提到\"的品牌打分\n"
            f"- 未被提到的品牌返回 score=null, source_quote=\"\", summary=\"搜索结果未提及该品牌\"\n"
            f"- 只有模糊描述（如\"还不错\"）时返回 score=null，不要推导极端分数\n\n"
        )

    prompt = (
        f"You are a product analyst. Analyze this AI-generated comparison text "
        f"and rank the mentioned brands on each dimension discussed.\n\n"
        f"{brand_hint}"
        f"=== CRITICAL RULES ===\n"
        f"1. ONLY use information that appears in the text below. Do NOT add your own knowledge.\n"
        f"2. If the text does not mention a specific technical parameter (e.g., duty cycle, warranty years, price), "
        f"set summary to 'Data not available in text' and source_quote to '' — do NOT guess or use your training data.\n"
        f"3. For each ranking, provide the EXACT sentence from the text as source_quote that supports your ranking. "
        f"Do NOT paraphrase or rewrite the source_quote — copy it verbatim from the text.\n"
        f"4. If you cannot find a supporting quote in the text, set source_quote to empty string.\n"
        f"5. Do NOT fabricate numbers, percentages, or specifications. Only cite what the text explicitly states.\n\n"
        f"=== TEXT TO ANALYZE ===\n{text}\n\n"
        f"=== BRANDS TO RANK ===\n"
        f"Focus brand: {brand_name}\n"
        f"Competitors: {comp_text}\n\n"
        "=== TASK ===\n"
        "1. Identify which comparison dimensions are discussed in this text "
        "(e.g. durability, eco-friendliness, price, protection, design, logistics, etc.).\n"
        "2. For EACH dimension, rank all mentioned brands from best (1st) to worst.\n"
        "3. Provide a brief evidence summary for each brand's ranking in each dimension.\n"
        "4. Assign a continuous score (0-100) for each brand on each dimension based "
        "on the TEXT's evaluation, NOT just rank position. Use the scoring standards below.\n"
        "5. Determine an overall winner based on the text's main recommendation.\n\n"
        "=== CONTINUOUS SCORING STANDARDS (MANDATORY) ===\n"
        "90-100: Overwhelming advantage — text explicitly praises this brand as the clear leader\n"
        "70-89:  Clear lead — text shows this brand is noticeably better than others\n"
        "50-69:  Roughly equal — brands are neck-and-neck, minor differences only\n"
        "30-49:  Slightly behind — text suggests this brand is a bit weaker\n"
        "10-29:  Clearly behind — text explicitly says this brand is worse\n"
        "0-9:    Last resort — ONLY when text explicitly says the brand is terrible or doesn't exist\n\n"
        "CRITICAL RULES:\n"
        "- DO NOT assign 0 or 100 unless the text provides overwhelming evidence. "
        "When in doubt, use middle-range scores (40-70).\n"
        "- If two brands are described as similar with minor differences, score them within 10-15 points of each other, NOT 0 vs 100.\n"
        "- For 2-brand comparisons where both are mentioned as valid options, typical scores are 55-75 vs 45-65, NOT 100 vs 0.\n"
        "- A brand mentioned briefly but not criticized should get 40-55, not 0.\n"
        "- The score should reflect HOW MUCH better/worse the text says a brand is, not just its rank order.\n\n"
        "=== SCORING RULES ===\n"
        "- Only score brands that are DISCUSSED in this text. Don't guess.\n"
        "- If a brand isn't mentioned for a dimension, exclude it from that dimension's ranking.\n"
        "- If the text is ambiguous about ranking, assign similar scores (within 5-10 points).\n"
        "- Base scoring on what the TEXT says, not your own knowledge.\n"
        "- Rank order is still important: rank brands first, then assign scores that respect the rank order "
        "but use the full 0-100 range proportionally to the magnitude of difference described.\n\n"
        "Return ONLY this JSON, no other text:\n"
        '{\n'
        '  "winner": "Brand name or \'tie\'",\n'
        '  "reason": "1-2 sentence overall reasoning",\n'
        '  "competitor_refs": ["what text says about competitor 1", ...],\n'
        '  "dimension_scores": [\n'
        '    {\n'
        '      "dimension": "dimension name",\n'
        '      "importance": "high|medium|low",\n'
        '      "rankings": [\n'
        '        {"brand": "BrandA", "rank": 1, "score": 75, "summary": "what text says about this brand on this dimension", "source_quote": "exact sentence from text"},\n'
        '        {"brand": "BrandB", "rank": 2, "score": 55, "summary": "...", "source_quote": "..."}\n'
        '      ]\n'
        '    }\n'
        '  ],\n'
        '  "dimension_win_count": {"BrandA": 3, "BrandB": 1}\n'
        '}\n'
        'IMPORTANT: dimension_win_count = number of dimensions each brand ranks 1st in.'
    )

    fallback = {
        "winner": "unknown",
        "reason": "analysis failed",
        "competitor_refs": [],
        "dimension_scores": [],
        "dimension_win_count": {},
    }
    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=DEEPSEEK_CONFIG,
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        content = resp["choices"][0]["message"].get("content", "").strip()
    except Exception:
        return fallback

    # 尝试直接解析
    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        result = None

    # 正则回退
    if result is None:
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group())
            except json.JSONDecodeError:
                return fallback
        else:
            return fallback

    result.setdefault("dimension_scores", [])
    result.setdefault("dimension_win_count", {})
    # 后处理验证：检查数据来源（用原始搜索结果，不是 LLM 合成文本）
    result["dimension_scores"] = _validate_dimension_scores(
        result.get("dimension_scores", []),
        search_results_text,
        dimension_win_count=result.get("dimension_win_count", {})
    )
    # 强制修正 0/100 二元分值为连续分值
    result["dimension_scores"] = _enforce_continuous_scores(
        result["dimension_scores"]
    )
    return result


def _enforce_continuous_scores(dimension_scores: list) -> list:
    """防止 LLM 忽略 prompt 指令继续打 0/100 二元分值。
    0 → 15, 100 → 85。只在边界值触发，中间值保留。跳过 None。
    """
    for dim in dimension_scores:
        for r in dim.get("rankings", []):
            score = r.get("score")
            if score is None:
                continue
            if score == 0:
                r["score"] = 15
            elif score == 100:
                r["score"] = 85
    return dimension_scores


def _split_domain_words(domain_part: str) -> str:
    """尝试将域名第一部分拆分为单词。

    lincolnelectric → lincoln electric
    millerwelds → miller welds
    yeswelder → yeswelder（无法拆分，保留原样）
    """
    known_words = [
        "lincoln", "electric", "miller", "welds", "welder", "welding",
        "esab", "hobart", "yeswelder", "arccaptain", "forney",
        "thermal", "dynamics", "hypertherm", "fronius", "kemppi",
        "panasonic", "hitachi", "bosch", "makita", "dewalt",
        "samsung", "apple", "google", "amazon", "microsoft",
    ]
    result = domain_part.lower()
    # 如果完整域名已在词表中，不拆分
    if result in known_words:
        return result
    for word in sorted(known_words, key=len, reverse=True):
        if word in result and word != result:
            result = result.replace(word, f" {word}")
    return result.strip()


def _extract_mentioned_brands(search_results: list[dict], brand_name: str,
                                competitors: list[str]) -> dict:
    """扫描原始搜索结果，检测哪些品牌在文本中实际出现。

    匹配策略:
    1. 品牌名直接匹配（YesWelder, Lincoln Electric）
    2. 域名匹配（lincolnelectric.com）
    3. 域名第一部分匹配（lincolnelectric）
    4. 域名第一部分拆分匹配（lincoln electric）

    Returns:
        {"mentioned": [...], "not_mentioned": [...]}
    """
    if not search_results:
        return {"mentioned": [], "not_mentioned": [brand_name] + competitors}

    all_text = ""
    for sr in search_results:
        all_text += " " + sr.get("title", "") + " " + sr.get("snippet", "")
    all_text_lower = all_text.lower()

    brand_patterns = {}
    brand_patterns[brand_name] = [brand_name.lower()]
    for comp in competitors:
        patterns = [comp.lower()]
        if "." in comp:
            domain_part = comp.lower().split(".")[0]
            patterns.append(domain_part)
            spaced = _split_domain_words(domain_part)
            if spaced != domain_part:
                patterns.append(spaced)
        brand_patterns[comp] = patterns

    mentioned, not_mentioned = [], []
    for brand, patterns in brand_patterns.items():
        if any(p in all_text_lower for p in patterns):
            if brand not in mentioned:
                mentioned.append(brand)
        else:
            if brand not in not_mentioned:
                not_mentioned.append(brand)

    return {"mentioned": mentioned, "not_mentioned": not_mentioned}


def _call_and_parse(prompt: str, default: dict) -> dict:
    """调 DeepSeek → 尝试解析 JSON → 失败返回 default。"""
    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=DEEPSEEK_CONFIG,
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        content = resp["choices"][0]["message"].get("content", "").strip()
    except Exception as e:
        default["_error"] = f"API 调用失败: {e}"
        return default

    # 尝试直接解析
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # 尝试用正则提取 JSON 块
    match = re.search(r'\{.*\}', content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    default["_error"] = f"JSON 解析失败，原始返回: {content[:200]}"
    return default


def extract_competitor_citations(search_results: list, competitor_domains: list[str],
                                 total_queries: int = 0) -> dict:
    """从搜索结果中提取竞品的引用详情（URL级匹配，不额外调API）。

    Args:
        search_results: 搜索结果列表，每个元素为 dict，含 url/answer 等字段
        competitor_domains: 竞品域名列表
        total_queries: 总查询数（用于计算引用率）

    Returns:
        {domain: {mention_count, top_sources, avg_authority}}
    """
    if not competitor_domains or not search_results:
        return {}

    competitor_data: dict[str, dict] = {
        domain: {"mentions": [], "source_domains": []}
        for domain in competitor_domains
    }

    for sr in search_results:
        if not isinstance(sr, dict):
            continue
        url = sr.get("url", "")
        for domain in competitor_domains:
            if domain in url:
                competitor_data[domain]["mentions"].append(sr)
                # 提取引用源域名
                ref_source = sr.get("reference_source", "") or url
                source_domain = _extract_domain(ref_source)
                if source_domain:
                    competitor_data[domain]["source_domains"].append(source_domain)

    result = {}
    for domain, data in competitor_data.items():
        mentions = data["mentions"]
        if not mentions:
            continue
        source_domains = data["source_domains"]
        # 计算 top_sources（按频次排序取前5）
        from collections import Counter
        source_counts = Counter(source_domains)
        top_sources = [s for s, _ in source_counts.most_common(5)]

        result[domain] = {
            "mention_count": len(mentions),
            "top_sources": top_sources,
            "avg_authority": _estimate_authority(top_sources),
        }

    return result


def _extract_domain(url: str) -> str:
    """从 URL 提取域名。"""
    if not url:
        return ""
    url = url.strip().lower()
    for prefix in ("https://", "http://", "www."):
        url = url.replace(prefix, "")
    return url.split("/")[0].split("?")[0].split("#")[0]


def _estimate_authority(domains: list[str]) -> int:
    """估算域名平均权威分。基于简单启发式规则，后续可用 source_authority 模块替代。"""
    if not domains:
        return 0
    scores = []
    for d in domains:
        if any(p in d for p in ("g2.com", "capterra.com", "gartner.com", "forrester.com",
                                  "trustradius.com", "techcrunch.com", "forbes.com")):
            scores.append(80)
        elif any(p in d for p in ("trustpilot.com", "getapp.com", "wikipedia.org")):
            scores.append(65)
        elif any(p in d for p in ("medium.com", "dev.to", "producthunt.com")):
            scores.append(50)
        elif any(p in d for p in ("reddit.com", "stackoverflow.com", "quora.com")):
            scores.append(35)
        elif any(p in d for p in ("youtube.com", "twitter.com", "linkedin.com")):
            scores.append(25)
        else:
            scores.append(45)
    return round(sum(scores) / len(scores))
