# brand_profiler.py — 结构化品牌画像生成
# 从官网爬取内容 → LLM 生成 BrandProfile + 推断行业/市场/产品
# 输入：user_input（含 target_positioning）+ 官网爬取 → 输出：BrandProfile dict

import asyncio
import json
import re
from langgraph_app.config import DEEPSEEK_CONFIG
from langgraph_app.tools.engines.chatgpt_api import call_api
from langgraph_app.tools.intro_composer import compose as fallback_compose

# 爬取配置
CRAWL_TIMEOUT = 15       # 单页爬取超时（秒），给国际站点足够余量
CRAWL_TEXT_LIMIT = 8000  # 每页最大字符数（SaaS 首页通常 5k-10k 字符）
MAX_PAGES = 8            # 最多爬取页数

# 优先级路径池（按可能性排序）
PATH_POOL = [
    # 高优先级：大部分站都有
    "",           # 首页
    "/about",
    "/about-us",
    "/company",
    # 中优先级：产品/服务页
    "/products",
    "/solutions",
    "/services",
    "/platform",
    # 低优先级：补充信息
    "/pricing",
    "/customers",
    "/case-studies",
    "/blog",
]

# ─── 行业映射：细粒度行业 → 三大类 ──────────────────────────
INDUSTRY_CATEGORY_MAP = {
    # B2B SaaS
    "SaaS": "B2B SaaS",
    "软件即服务": "B2B SaaS",
    "企业软件": "B2B SaaS",
    "开发者工具": "B2B SaaS",
    "项目管理": "B2B SaaS",
    "协作工具": "B2B SaaS",
    "CRM": "B2B SaaS",
    "ERP": "B2B SaaS",
    # 跨境支付
    "跨境支付": "跨境支付",
    "支付": "跨境支付",
    "金融科技": "跨境支付",
    "金融基础设施": "跨境支付",
    "支付网关": "跨境支付",
    # DTC 品牌
    "DTC": "DTC品牌",
    "消费品": "DTC品牌",
    "环保消费品牌": "DTC品牌",
    "时尚": "DTC品牌",
    "美妆": "DTC品牌",
    "家居": "DTC品牌",
    "电子产品": "DTC品牌",
}


def map_industry_category(industry: str) -> str:
    """把细粒度行业映射回三大类。找不到则返回 '_default'。"""
    if not industry:
        return "_default"
    if industry in INDUSTRY_CATEGORY_MAP:
        return INDUSTRY_CATEGORY_MAP[industry]
    for key, category in INDUSTRY_CATEGORY_MAP.items():
        if key in industry or industry in key:
            return category
    return "_default"


# ─── 爬虫核心 ───────────────────────────────────────────────

async def _probe_paths(domain: str, client) -> list[str]:
    """HEAD 探测哪些路径存在。403/405 = 服务器拒绝 HEAD 但路径可能存在，保留。"""
    async def _check(path: str) -> tuple[str, bool]:
        try:
            resp = await client.head(
                f"https://{domain}{path}",
                timeout=5,
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
                },
            )
            # 200=明确存在, 403/405=拒绝HEAD但路径可能存在(CDN反爬)
            return path, resp.status_code in (200, 403, 405)
        except Exception:
            return path, False

    results = await asyncio.gather(*[_check(p) for p in PATH_POOL])
    valid = [path for path, ok in results if ok]
    return valid[:MAX_PAGES]


async def _fetch_raw_html(client, domain: str, path: str) -> str | None:
    """拉取原始 HTML（用于链接发现、结构化数据提取）。"""
    try:
        resp = await client.get(
            f"https://{domain}{path}",
            timeout=CRAWL_TIMEOUT,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Cache-Control": "max-age=0",
            },
        )
        return resp.text
    except Exception:
        return None


def _extract_page_text(html: str) -> str:
    """从原始 HTML 提取纯文本（meta + h1 + body，用于喂 LLM）。"""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return ""
    soup = BeautifulSoup(html, "html.parser")
    parts = []
    meta = soup.find("meta", {"name": "description"})
    if meta and meta.get("content"):
        parts.append(meta["content"])
    h1 = soup.find("h1")
    if h1:
        parts.append(h1.get_text(strip=True))
    main = soup.find("main") or soup.find("body")
    if main:
        parts.append(main.get_text(separator=" ", strip=True)[:CRAWL_TEXT_LIMIT])
    return " ".join(parts)


def _discover_links(html: str, domain: str) -> list[str]:
    """从首页 HTML 提取内部链接，筛选内容页路径。"""
    try:
        from bs4 import BeautifulSoup
        from urllib.parse import urlparse
    except ImportError:
        return []
    soup = BeautifulSoup(html, "html.parser")
    paths = []
    skip_patterns = {"/login", "/signup", "/register", "/cart", "/checkout",
                     "/account", "/admin", "/api/", "/cdn-cgi/", "/#",
                     ".pdf", ".zip", ".png", ".jpg", ".svg"}
    # 匹配 domain 本身和 www 子域名
    domain_variants = {domain, f"www.{domain}"}

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("/"):
            path = href
        elif href.startswith("http"):
            parsed = urlparse(href)
            if parsed.netloc not in domain_variants:
                continue
            path = parsed.path
        else:
            continue
        path = path.split("?")[0].split("#")[0]
        if path and not any(skip in path.lower() for skip in skip_patterns):
            paths.append(path)

    seen = set()
    unique = []
    for p in paths:
        if p not in seen:
            seen.add(p)
            unique.append(p)
    return unique[:10]


def _extract_structured(soup) -> dict:
    """提取 JSON-LD、Open Graph、meta 标签。"""
    result = {}

    # JSON-LD (schema.org)
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
            if isinstance(data, list):
                data = data[0] if data else {}
            if data.get("@type"):
                result["schema_type"] = data["@type"]
            if data.get("name"):
                result["schema_name"] = data["name"]
            if data.get("description"):
                result["schema_description"] = data["description"]
            if data.get("foundingDate"):
                result["founding_date"] = data["foundingDate"]
            if data.get("numberOfEmployees"):
                result["employee_count"] = data["numberOfEmployees"]
            if data.get("sameAs"):
                result["social_links"] = data["sameAs"]
            if data.get("address"):
                result["address"] = data["address"]
            if data.get("industry"):
                result["schema_industry"] = data["industry"]
        except (json.JSONDecodeError, TypeError):
            pass

    # Open Graph
    for meta in soup.find_all("meta", property=lambda x: x and x.startswith("og:")):
        key = meta["property"].replace("og:", "og_")
        result[key] = meta.get("content", "")

    # Meta keywords
    kw = soup.find("meta", {"name": "keywords"})
    if kw and kw.get("content"):
        result["keywords"] = kw["content"]

    return result


def _is_content_page(html: str) -> bool:
    """判断是否为有价值的内容页（排除导航页/登录页/空白页）。"""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return False
    soup = BeautifulSoup(html, "html.parser")
    main = soup.find("main") or soup.find("body")
    if not main:
        return False

    text = main.get_text(strip=True)
    if len(text) < 300:
        return False

    # 登录页特征
    login_keywords = {"sign in", "log in", "register", "create account"}
    text_lower = text.lower()
    if sum(1 for kw in login_keywords if kw in text_lower) >= 2:
        return False

    # 导航密度检测：链接文本占比 > 85% = 纯导航页（首页通常 70-85%，保留）
    links = main.find_all("a")
    link_text_len = sum(len(a.get_text(strip=True)) for a in links)
    if len(text) > 0 and link_text_len / len(text) > 0.85:
        return False

    return True


async def _crawl_website(domain: str) -> tuple[str | None, int, int, dict]:
    """智能爬取：探测 → 拉HTML → 链接发现 → 补拉 → 提取文本+结构化数据。"""
    if not domain:
        return None, 0, 0, {"success": False, "pages_ok": 0, "total_chars": 0, "structured_data": {}}

    try:
        import httpx
    except ImportError:
        return None, 0, 0, {"success": False, "pages_ok": 0, "total_chars": 0, "structured_data": {}}

    structured = {}

    async with httpx.AsyncClient() as client:
        # ── 第一步：HEAD 探测有效路径 ──
        probe_paths = await _probe_paths(domain, client)

        # ── 第二步：并发拉取原始 HTML（首页必须在第一批）──
        if "" not in probe_paths:
            probe_paths = [""] + probe_paths
        html_map = {}
        first_batch = probe_paths[:MAX_PAGES]
        results = await asyncio.gather(
            *[_fetch_raw_html(client, domain, p) for p in first_batch]
        )
        for path, html in zip(first_batch, results):
            if html:
                html_map[path] = html

        # ── 第三步：从首页 HTML 发现链接 → 补拉新页面 ──
        homepage_html = html_map.get("")
        if homepage_html:
            discovered = _discover_links(homepage_html, domain)
            new_paths = [p for p in discovered if p not in html_map][:MAX_PAGES - len(html_map)]
            if new_paths:
                extra_results = await asyncio.gather(
                    *[_fetch_raw_html(client, domain, p) for p in new_paths]
                )
                for path, html in zip(new_paths, extra_results):
                    if html:
                        html_map[path] = html

    # ── 第四步：筛选有价值的页面 ──
    valid_pages = {path: html for path, html in html_map.items() if _is_content_page(html)}

    # ── 第五步：从原始 HTML 提取文本 + 结构化数据 ──
    try:
        from bs4 import BeautifulSoup as BS
    except ImportError:
        BS = None

    combined_text = ""
    for path, html in valid_pages.items():
        if path == "" and not structured and BS:
            structured = _extract_structured(BS(html, "html.parser"))
        page_text = _extract_page_text(html)
        if page_text:
            combined_text += " " + page_text

    combined_text = combined_text.strip()
    pages_ok = len(valid_pages)
    total_chars = len(combined_text)

    crawl_status = {
        "success": bool(combined_text),
        "pages_ok": pages_ok,
        "total_chars": total_chars,
        "structured_data": structured,
    }
    return (combined_text if combined_text else None), pages_ok, total_chars, crawl_status


# ─── Serper 搜索降级 ───────────────────────────────────────

async def _search_brand_with_serper(domain: str, brand_name: str) -> dict:
    """用 Serper Google 搜索查询品牌公开信息（爬取失败时的降级方案）。
    执行多组搜索 → 编译结果 → 返回结构化上下文。
    """
    from langgraph_app.tools.engines.serper_search import search

    queries = [
        f"{brand_name} brand products services",
        f"{brand_name} company about industry",
        f'"{brand_name}" {domain}',
    ]

    all_snippets = []
    for query in queries:
        results = search(query, num_results=5)
        for r in results:
            all_snippets.append(
                f"Title: {r['title']}\nSnippet: {r['snippet']}\nURL: {r['url']}"
            )

    combined = "\n\n".join(all_snippets)
    return {
        "source": "serper_search",
        "search_text": combined,
        "total_chars": len(combined),
        "success": len(combined) > 100,
    }


def _build_prompt_with_search(user_input: dict, search_text: str) -> str:
    """用 Serper 搜索结果生成品牌画像 prompt（官网爬取失败时使用）。"""
    target_pos = user_input.get("target_positioning", "")
    target_pos_section = (
        f"Brand's desired positioning: {target_pos}\n\n"
        if target_pos else ""
    )

    return (
        f"Generate a structured brand profile based on Google search results and user input.\n\n"
        f"=== USER INPUT (官网爬取失败，使用搜索引擎结果) ===\n"
        f"Brand: {user_input.get('brand_name', 'N/A')}\n"
        f"Industry (reference): {user_input.get('industry', 'N/A')}\n"
        f"Target Market (reference): {user_input.get('target_market', 'N/A')}\n"
        f"Core Product (reference): {user_input.get('core_product', 'N/A')}\n\n"
        f"{target_pos_section}"
        f"=== GOOGLE SEARCH RESULTS ===\n"
        f"{search_text[:12000]}\n\n"
        "Return a JSON object with exactly these keys (ALL values in Chinese):\n"
        "{\n"
        '  "one_liner": "一句话品牌定位（中文）",\n'
        '  "value_props": ["核心价值主张1", "核心价值主张2", "核心价值主张3"],\n'
        '  "differentiators": ["关键差异化1", "关键差异化2"],\n'
        '  "target_personas": ["目标客户画像1", "目标客户画像2"],\n'
        '  "tone_keywords": ["品牌调性关键词1", "关键词2", "关键词3"],\n'
        '  "full_description": "200-300字完整品牌描述（中文），自然流畅",\n'
        '  "inferred_industry": "从搜索结果推断的行业（中文，如：环保消费品牌、B2B SaaS）",\n'
        '  "inferred_target_market": "从搜索结果推断的目标市场（中文，如：北美、全球）",\n'
        '  "inferred_core_product": "从搜索结果推断的核心产品（中文，一句话描述）"\n'
        "}\n\n"
        "Requirements:\n"
        "- one_liner: 简洁有力，抓住本质\n"
        "- value_props: 3-5 条具体的利益陈述，不是功能列表\n"
        "- differentiators: 品牌真正独到的地方\n"
        "- target_personas: 理想客户是谁（角色、公司类型、痛点）\n"
        "- tone_keywords: 品牌调性（如：权威、亲切、高端、技术驱动）\n"
        "- full_description: 全面的品牌描述，适合作为下游分析的输入\n"
        "- IMPORTANT: inferred_industry, inferred_target_market, inferred_core_product 是**必填**字段，不可留空。基于搜索结果做出最佳推断。推断不出来就用用户输入参考值兜底。\n"
        "- Return ONLY the JSON object, no other text."
    )


# ─── 品牌画像生成 ───────────────────────────────────────────

async def profile(user_input: dict) -> dict:
    """生成结构化品牌画像。三级降级：爬取官网 → Serper搜索 → 用户输入兜底。"""
    domain = user_input.get("domain", "")
    brand_name = user_input.get("brand_name", "")

    # 第一级：爬取官网
    page_text, _pages_ok, _chars, crawl_status = await _crawl_website(domain)
    crawl_success = crawl_status.get("success", False) and _chars > 100

    if crawl_success:
        prompt = _build_prompt(user_input, page_text)
        data_source = "crawl"
    else:
        # 第二级：Serper Google 搜索
        search_result = await _search_brand_with_serper(domain, brand_name)
        if search_result["success"]:
            prompt = _build_prompt_with_search(user_input, search_result["search_text"])
            data_source = "serper_search"
        else:
            # 第三级：用户输入兜底
            prompt = _build_prompt(user_input, None)
            data_source = "user_input"

    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=DEEPSEEK_CONFIG,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        content = resp["choices"][0]["message"].get("content", "").strip()
        result = json.loads(content)
    except (json.JSONDecodeError, KeyError, Exception):
        result = _fallback(user_input)
        result["_crawl_status"] = crawl_status
        result["_data_source"] = data_source
        return result

    if not result.get("one_liner") or not result.get("full_description"):
        result = _fallback(user_input)
        result["_crawl_status"] = crawl_status
        result["_data_source"] = data_source
        return result

    result.setdefault("brand_name", brand_name)
    result.setdefault("value_props", [])
    result.setdefault("differentiators", [])
    result.setdefault("target_personas", [])
    result.setdefault("tone_keywords", [])
    if not result.get("inferred_industry"):
        result["inferred_industry"] = user_input.get("industry", "")
    if not result.get("inferred_target_market"):
        result["inferred_target_market"] = user_input.get("target_market", "")
    if not result.get("inferred_core_product"):
        result["inferred_core_product"] = user_input.get("core_product", "")
    result["_crawl_status"] = crawl_status
    result["_data_source"] = data_source
    return result


def _build_prompt(user_input: dict, page_text: str | None) -> str:
    has_crawl = "（官网爬取成功）" if page_text else "（官网爬取失败，仅用用户输入）"
    crawl_section = page_text[:12000] if page_text else "无官网数据"

    target_pos = user_input.get("target_positioning", "")
    target_pos_section = (
        f"Brand's desired positioning: {target_pos}\n\n"
        if target_pos else ""
    )

    return (
        f"Generate a structured brand profile based on the user input and website content.\n\n"
        f"=== USER INPUT ({has_crawl}) ===\n"
        f"Brand: {user_input.get('brand_name', 'N/A')}\n"
        f"Industry (reference): {user_input.get('industry', 'N/A')}\n"
        f"Target Market (reference): {user_input.get('target_market', 'N/A')}\n"
        f"Core Product (reference): {user_input.get('core_product', 'N/A')}\n\n"
        f"{target_pos_section}"
        f"=== WEBSITE CONTENT ===\n"
        f"{crawl_section}\n\n"
        "Return a JSON object with exactly these keys (ALL values in Chinese):\n"
        "{\n"
        '  "one_liner": "一句话品牌定位（中文）",\n'
        '  "value_props": ["核心价值主张1", "核心价值主张2", "核心价值主张3"],\n'
        '  "differentiators": ["关键差异化1", "关键差异化2"],\n'
        '  "target_personas": ["目标客户画像1", "目标客户画像2"],\n'
        '  "tone_keywords": ["品牌调性关键词1", "关键词2", "关键词3"],\n'
        '  "full_description": "200-300字完整品牌描述（中文），自然流畅",\n'
        '  "inferred_industry": "从官网内容推断的行业（中文，如：环保消费品牌、B2B SaaS）",\n'
        '  "inferred_target_market": "从官网内容推断的目标市场（中文，如：北美、全球）",\n'
        '  "inferred_core_product": "从官网内容推断的核心产品（中文，一句话描述）"\n'
        "}\n\n"
        "Requirements:\n"
        "- one_liner: 简洁有力，抓住本质\n"
        "- value_props: 3-5 条具体的利益陈述，不是功能列表\n"
        "- differentiators: 品牌真正独到的地方\n"
        "- target_personas: 理想客户是谁（角色、公司类型、痛点）\n"
        "- tone_keywords: 品牌调性（如：权威、亲切、高端、技术驱动）\n"
        "- full_description: 全面的品牌描述，适合作为下游分析的输入\n"
        "- 有官网数据时优先采用官网数据\n"
        "- 如果有品牌期望定位，在生成品牌描述时考虑这个方向\n"
        "- IMPORTANT: inferred_industry, inferred_target_market, inferred_core_product 是**必填**字段，不可留空。即使用户输入未提供，也必须基于品牌名、官网内容、one_liner 等做出最佳推断。推断不出来就用用户输入参考值兜底。\n"
        "- Return ONLY the JSON object, no other text."
    )


def _fallback(user_input: dict) -> dict:
    """降级到用户输入 + intro_composer 模板拼接。"""
    full_desc = fallback_compose(
        brand_name=user_input.get("brand_name", ""),
        domain=user_input.get("domain", ""),
        industry=user_input.get("industry", ""),
        target_market=user_input.get("target_market", ""),
        core_product=user_input.get("core_product", ""),
    )
    brand_name = user_input.get("brand_name", "")
    return {
        "brand_name": brand_name,
        "one_liner": f"{brand_name} is a {user_input.get('industry', 'technology')} company.",
        "value_props": [user_input.get("core_product", "")] if user_input.get("core_product") else [],
        "differentiators": [],
        "target_personas": [],
        "tone_keywords": [],
        "full_description": full_desc,
        "inferred_industry": user_input.get("industry", ""),
        "inferred_target_market": user_input.get("target_market", ""),
        "inferred_core_product": user_input.get("core_product", ""),
        "_fallback": True,
    }
