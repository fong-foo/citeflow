# source_authority.py — 引用源权威性评分
# 三维度评分 + 域名类型推断（三层策略：硬编码映射表 → 缓存 → LLM）
# 输入: citation_details → 输出: SourceAuthorityReport

import json
import math
import os
from urllib.parse import urlparse

from agents.config import DEEPSEEK_CONFIG
from agents.engines.chatgpt_api import call_api

POSITION_SCORES = {
    "top": 1.0,
    "middle": 0.7,
    "bottom": 0.4,
    "mention": 0.2,
    "none": 0.0,
}

TYPE_SCORES = {
    "官方文档": 100,
    "权威媒体": 90,
    "行业媒体": 80,
    "百科": 75,
    "评测平台": 70,
    "博客": 60,
    "论坛": 40,
    "社交媒体": 30,
    "品牌官网": 30,  # 品牌自引，权威分低于第三方评价
    "其他": 50,
}

DOMAIN_TYPE_MAP = {
    # 权威媒体
    "forbes.com": "权威媒体", "techcrunch.com": "权威媒体",
    "bloomberg.com": "权威媒体", "reuters.com": "权威媒体",
    "wsj.com": "权威媒体", "nytimes.com": "权威媒体",
    "wired.com": "权威媒体", "theverge.com": "权威媒体",
    # 行业媒体
    "fintechtimes.com": "行业媒体", "paymentssource.com": "行业媒体",
    "saastr.com": "行业媒体", "techinasia.com": "行业媒体",
    # 百科
    "wikipedia.org": "百科", "investopedia.com": "百科",
    "britannica.com": "百科",
    # 评测平台
    "g2.com": "评测平台", "capterra.com": "评测平台",
    "trustpilot.com": "评测平台", "getapp.com": "评测平台",
    # 博客
    "medium.com": "博客", "substack.com": "博客",
    "dev.to": "博客", "hashnode.dev": "博客",
    # 论坛
    "reddit.com": "论坛", "quora.com": "论坛",
    "stackoverflow.com": "论坛", "stackexchange.com": "论坛",
    # 社交媒体
    "twitter.com": "社交媒体", "x.com": "社交媒体",
    "linkedin.com": "社交媒体", "facebook.com": "社交媒体",
    "instagram.com": "社交媒体",
}

CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "config", "domain_type_cache.json")


def _load_cache() -> dict:
    """加载域名类型缓存。"""
    try:
        with open(CACHE_PATH, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_cache(cache: dict):
    """保存域名类型缓存。"""
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, "w") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def _is_known_type(domain: str) -> bool:
    """判断域名是否能被硬编码映射表或前缀规则解析（不需要 LLM）。"""
    domain_lower = domain.lower()
    for pattern in DOMAIN_TYPE_MAP:
        if domain_lower == pattern or domain_lower.endswith("." + pattern):
            return True
    if domain_lower.startswith(("docs.", "developer.", "help.", "support.", "learn.")):
        return True
    return False


def analyze(citation_details: list[dict], brand_domain: str = "") -> dict:
    """从 citation_details 聚合引用源，计算权威分。

    Args:
        citation_details: 引用明细列表
        brand_domain: 品牌官网域名（用于识别品牌自引，降低权威分）
    """
    source_map = {}

    for detail in citation_details:
        if not detail.get("mentioned"):
            continue
        ref = detail.get("reference_source", "")
        if not ref:
            continue

        domain = extract_domain(ref)
        if not domain:
            continue

        if domain not in source_map:
            source_map[domain] = {"count": 0, "positions": [], "queries": []}
        source_map[domain]["count"] += 1
        source_map[domain]["positions"].append(detail.get("position", "none"))
        source_map[domain]["queries"].append(detail.get("query", ""))

    if not source_map:
        return {"top_sources": [], "total_sources": 0, "source_diversity": 0.0}

    # 收集需要 LLM 推断的未知域名
    cache = _load_cache()

    # 品牌官网域名：直接标记为"品牌官网"，不走 LLM
    brand_domain_clean = extract_domain(brand_domain) if brand_domain else ""
    if brand_domain_clean:
        cache[brand_domain_clean] = "品牌官网"
        # 同时标记 www 子域名变体
        if brand_domain_clean.startswith("www."):
            cache[brand_domain_clean[4:]] = "品牌官网"
        else:
            cache[f"www.{brand_domain_clean}"] = "品牌官网"
        _save_cache(cache)  # 持久化，确保 infer_source_type 也能读到

    unknown_domains = []
    for domain in source_map:
        if not _is_known_type(domain) and domain not in cache:
            unknown_domains.append(domain)

    if unknown_domains:
        inferred = _batch_llm_infer(unknown_domains)
        cache.update(inferred)
        _save_cache(cache)

    max_count = max(s["count"] for s in source_map.values())
    sources = []

    for domain, data in source_map.items():
        source_type = infer_source_type(domain, _cache=cache)

        freq_score = min(data["count"] / max_count * 100, 100) if max_count > 0 else 0

        pos_scores = [POSITION_SCORES.get(p, 0) for p in data["positions"]]
        avg_pos = sum(pos_scores) / len(pos_scores) if pos_scores else 0
        pos_score = avg_pos * 100

        type_score = TYPE_SCORES.get(source_type, 50)

        authority = round(freq_score * 0.4 + pos_score * 0.3 + type_score * 0.3)

        sources.append({
            "domain": domain,
            "source_type": source_type,
            "mention_count": data["count"],
            "avg_position": round(avg_pos, 2),
            "authority_score": authority,
            "queries": data["queries"],
        })

    sources.sort(key=lambda x: x["authority_score"], reverse=True)
    diversity = _calc_diversity([s["mention_count"] for s in sources])

    return {
        "top_sources": sources[:10],
        "total_sources": len(sources),
        "source_diversity": diversity,
    }


def extract_domain(url: str) -> str:
    """从 URL 提取主域名。异常返回空串。"""
    try:
        parsed = urlparse(url if "://" in url else f"https://{url}")
        domain = parsed.netloc or parsed.path.split("/")[0]
        if domain.startswith("www."):
            domain = domain[4:]
        return domain.lower()
    except Exception:
        return ""


def infer_source_type(domain: str, _cache: dict | None = None) -> str:
    """根据域名推断内容类型。三层策略：硬编码 → 缓存 → LLM。"""
    domain_lower = domain.lower()

    # Layer 1: 硬编码映射表
    for pattern, source_type in DOMAIN_TYPE_MAP.items():
        if domain_lower == pattern or domain_lower.endswith("." + pattern):
            return source_type

    # 前缀匹配（官方文档子域名）
    if domain_lower.startswith(("docs.", "developer.", "help.", "support.", "learn.")):
        return "官方文档"

    # Layer 2: 查缓存
    cache = _cache if _cache is not None else _load_cache()
    if domain_lower in cache:
        return cache[domain_lower]

    # Layer 3: LLM 推断（单个域名，analyze 流程通常不会走到这里）
    source_type = _llm_infer_type(domain_lower)
    cache[domain_lower] = source_type
    _save_cache(cache)
    return source_type


def _calc_diversity(mention_counts: list[int]) -> float:
    """Shannon 多样性指数，归一化到 0-1。"""
    total = sum(mention_counts)
    if total == 0:
        return 0.0
    proportions = [c / total for c in mention_counts]
    entropy = -sum(p * math.log(p) for p in proportions if p > 0)
    max_entropy = math.log(len(mention_counts)) if len(mention_counts) > 1 else 1
    return round(entropy / max_entropy, 3) if max_entropy > 0 else 0.0


VALID_SOURCE_TYPES = {"官方文档", "权威媒体", "行业媒体", "百科", "评测平台", "博客", "论坛", "社交媒体", "品牌官网", "其他"}


def _llm_infer_type(domain: str) -> str:
    """调 DeepSeek 推断单个域名类型。"""
    prompt = (
        f"以下网站域名属于什么类型？请从以下选项中选一个：官方文档, 权威媒体, 行业媒体, 百科, 评测平台, 博客, 论坛, 社交媒体, 品牌官网, 其他\n\n"
        f"域名: {domain}\n\n"
        f"判断标准：品牌官网 = 品牌自己的 .com/.cn 官网域名（如 nike.com → 品牌官网, litfad.com → 品牌官网）。\n"
        f"第三方评测/媒体/论坛平台 ≠ 品牌官网。\n\n"
        f"示例:\n"
        f"- notion.so → 官方文档\n"
        f"- techcrunch.com → 权威媒体\n"
        f"- medium.com → 博客\n"
        f"- reddit.com → 论坛\n"
        f"- g2.com → 评测平台\n"
        f"- nike.com → 品牌官网\n\n"
        f"只返回类型名称，不要其他文字。"
    )

    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=DEEPSEEK_CONFIG,
            temperature=0.1,
        )
        content = resp["choices"][0]["message"].get("content", "").strip()
        if content in VALID_SOURCE_TYPES:
            return content
        return "其他"
    except Exception:
        return "其他"


def _batch_llm_infer(domains: list[str]) -> dict[str, str]:
    """批量推断多个域名类型，一次 API 调用。"""
    if not domains:
        return {}

    domain_list = "\n".join(f"- {d}" for d in domains)
    prompt = (
        f"以下每个网站域名属于什么类型？\n\n"
        f"域名列表:\n{domain_list}\n\n"
        f"为每个域名从以下选项中选择一个类型：官方文档, 权威媒体, 行业媒体, 百科, 评测平台, 博客, 论坛, 社交媒体, 品牌官网, 其他\n\n"
        f"判断标准：品牌官网 = 品牌自己的 .com/.cn 官网域名（如 nike.com → 品牌官网, litfad.com → 品牌官网）。\n"
        f"第三方评测/媒体/论坛平台 ≠ 品牌官网。\n\n"
        f"示例:\n"
        f"- notion.so → 官方文档\n"
        f"- techcrunch.com → 权威媒体\n"
        f"- medium.com → 博客\n"
        f"- reddit.com → 论坛\n"
        f"- g2.com → 评测平台\n"
        f"- nike.com → 品牌官网\n\n"
        f'返回 JSON 对象，格式: {{"domain1.com": "类型", "domain2.com": "类型", ...}}\n'
        f"只返回 JSON，不要其他文字。"
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
        return {d: result.get(d, "其他") if result.get(d, "") in VALID_SOURCE_TYPES else "其他" for d in domains}
    except Exception:
        return {d: "其他" for d in domains}
