# TASK_CRAWLER_UPGRADE.md — 爬虫升级 + AI降级 + 用户兜底

> 药老出品 · 2026-05-18
> 目标: 解决跨境域名爬取失败率高、SPA网站空壳、Bot UA被拦等问题，提升品牌画像准确度
> 预计工时: 6-8小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 换真实浏览器 UA + Accept-Language | brand_profiler.py | 0.5h |
| 2 | 接入 Playwright 渲染 SPA | brand_profiler.py | 3h |
| 3 | AI 引擎降级（爬取失败时） | brand_profiler.py | 1.5h |
| 4 | 前端域名验证 + 失败提示 | ScanChat 组件 | 2h |
| 5 | 验证测试 | 手动测试 | 1h |

**完成标准**: 用户输入域名后，能获取到准确的品牌画像（行业/市场/核心产品），即使域名无法访问也有降级方案

---

## 背景

### 当前问题

**爬虫现状：**
```
用户输入域名
    ↓
/api/profile 调用 brand_profiler.py
    ↓
httpx 爬官网 HTML → BeautifulSoup 提取文本 → DeepSeek LLM 推断
    ↓
生成品牌画像（行业/市场/核心产品/一句话描述）
```

**问题：**
1. **Bot UA 被拦**：`CiteFlow/1.0` 被 Cloudflare/CDN 直接拦截
2. **SPA 空壳**：React/Vue 网站 HTML 是空壳，`<body>` 只有 `<div id="root">`
3. **只爬 8 页**：14 个硬编码路径，不读 sitemap，不递归
4. **无反爬措施**：没 cookie、没重试、没代理、没 CF challenge 处理
5. **文本提取粗糙**：`get_text()` 全拼成字符串，丢失表格/列表/标题层级

**为什么有时推断正确？**
- 不是因为爬得好，而是因为 **DeepSeek LLM 推断能力强**
- 即使爬虫只拿到碎片化的 HTML 文本，LLM 也能从中抓住关键信号
- 瓶颈在喂给它的数据质量，不在 LLM 能力

---

## 任务1: 换真实浏览器 UA + Accept-Language

### 需要改的文件
`langgraph_app/tools/brand_profiler.py`

### 实现要求

1. **修改 User-Agent**（约第 86 行、第 105 行）

```python
# 旧
headers={"User-Agent": "Mozilla/5.0 (compatible; CiteFlow/1.0)"}

# 新
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
}
```

2. **修改 _probe_paths 函数**（约第 80 行）

```python
async def _check(path: str) -> tuple[str, bool]:
    try:
        resp = await client.head(
            f"https://{domain}{path}",
            timeout=5,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
        )
        # 200=明确存在, 403/451=拒绝但路径可能存在, 405=拒绝HEAD
        return path, resp.status_code in (200, 403, 405, 451)
    except Exception:
        return path, False
```

3. **修改 _fetch_raw_html 函数**（约第 98 行）

```python
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
```

### 验证方法

**测试1: 正常域名**
```bash
curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" https://ugreen.com
```
应该返回 200

**测试2: Cloudflare 保护的域名**
```bash
curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: CiteFlow/1.0" https://some-cf-site.com
curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" https://some-cf-site.com
```
后者应该成功率更高

---

## 任务2: 接入 Playwright 渲染 SPA

### 需要改的文件
`langgraph_app/tools/brand_profiler.py`

### 实现要求

1. **安装 Playwright**

```bash
pip install playwright
playwright install chromium
```

2. **新增 Playwright 渲染函数**（放在文件顶部的工具函数区域）

```python
import asyncio
from typing import Optional

# 尝试导入 Playwright，如果不可用则降级到 httpx
try:
    from playwright.async_api import async_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False


async def _fetch_with_playwright(domain: str, path: str, timeout: int = 30) -> Optional[str]:
    """用 Playwright 渲染页面（解决 SPA 空壳问题）。"""
    if not HAS_PLAYWRIGHT:
        return None
    
    url = f"https://{domain}{path}"
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                locale="en-US",
            )
            page = await context.new_page()
            
            # 设置超时
            page.set_default_timeout(timeout * 1000)
            
            # 访问页面
            response = await page.goto(url, wait_until="networkidle", timeout=timeout * 1000)
            
            if not response or response.status >= 400:
                await browser.close()
                return None
            
            # 等待页面渲染完成
            await page.wait_for_load_state("networkidle")
            
            # 获取渲染后的 HTML
            html = await page.content()
            
            await browser.close()
            return html
            
    except Exception as e:
        logger.log(f"[Playwright] 渲染失败 {url}: {e}", "warn")
        return None
```

3. **修改 _crawl_website 函数**，增加 Playwright 降级逻辑

```python
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

        # ── 第三步：检查首页是否为空壳（SPA 检测）──
        homepage_html = html_map.get("")
        is_spa = False
        if homepage_html:
            # 检测 SPA 空壳：body 内容太少，或者有 React/Vue 标识
            from bs4 import BeautifulSoup as BS
            soup = BS(homepage_html, "html.parser")
            body = soup.find("body")
            body_text = body.get_text(strip=True) if body else ""
            
            # SPA 检测条件：
            # 1. body 文本少于 100 字符
            # 2. 有 React/Vue 标识（div#root, div#app, div#__next）
            spa_indicators = ['id="root"', 'id="app"', 'id="__next"', 'id="__nuxt"']
            is_spa = (
                len(body_text) < 100 or
                any(indicator in homepage_html for indicator in spa_indicators)
            )
            
            if is_spa:
                logger.log(f"[SPA检测] {domain} 是 SPA 网站，尝试 Playwright 渲染", "warn")
                
                # 用 Playwright 重新渲染首页
                rendered_html = await _fetch_with_playwright(domain, "")
                if rendered_html:
                    html_map[""] = rendered_html
                    logger.log(f"[SPA渲染] 首页渲染成功，长度 {len(rendered_html)}")
                else:
                    logger.log("[SPA渲染] Playwright 渲染失败，使用原始 HTML", "warn")

        # ── 第四步：从首页 HTML 发现链接 → 补拉新页面 ──
        homepage_html = html_map.get("")
        if homepage_html:
            discovered = _discover_links(homepage_html, domain)
            new_paths = [p for p in discovered if p not in html_map][:MAX_PAGES - len(html_map)]
            if new_paths:
                # 如果是 SPA，用 Playwright 渲染子页面
                if is_spa and HAS_PLAYWRIGHT:
                    extra_results = await asyncio.gather(
                        *[_fetch_with_playwright(domain, p) for p in new_paths]
                    )
                else:
                    extra_results = await asyncio.gather(
                        *[_fetch_raw_html(client, domain, p) for p in new_paths]
                    )
                for path, html in zip(new_paths, extra_results):
                    if html:
                        html_map[path] = html

    # ── 第五步：筛选有价值的页面 ──
    valid_pages = {path: html for path, html in html_map.items() if _is_content_page(html)}

    # ── 第六步：从原始 HTML 提取文本 + 结构化数据 ──
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
        "is_spa": is_spa,
    }
    return (combined_text if combined_text else None), pages_ok, total_chars, crawl_status
```

### 验证方法

**测试1: SPA 网站**
```bash
python3 -c "
import asyncio
from langgraph_app.tools.brand_profiler import _crawl_website

async def test():
    domain = 'some-react-site.com'  # 替换为真实 SPA 网站
    result = await _crawl_website(domain)
    page_text, pages_ok, total_chars, crawl_status = result
    print(f'Crawl status: {crawl_status}')
    print(f'Is SPA: {crawl_status.get(\"is_spa\")}')
    print(f'Total chars: {total_chars}')

asyncio.run(test())
```

**测试2: 普通网站**
```bash
python3 -c "
import asyncio
from langgraph_app.tools.brand_profiler import _crawl_website

async def test():
    domain = 'ugreen.com'
    result = await _crawl_website(domain)
    page_text, pages_ok, total_chars, crawl_status = result
    print(f'Crawl status: {crawl_status}')
    print(f'Is SPA: {crawl_status.get(\"is_spa\")}')
    print(f'Total chars: {total_chars}')

asyncio.run(test())
```

---

## 任务3: AI 引擎降级（爬取失败时）

### 需要改的文件
`langgraph_app/tools/brand_profiler.py`

### 实现要求

1. **新增 AI 查询函数**（放在文件顶部的工具函数区域）

```python
async def _query_brand_with_ai(domain: str, brand_name: str) -> dict:
    """用 AI 引擎查询品牌信息（爬取失败时的降级方案）。"""
    from langgraph_app.tools.engines.fc_search import call_api
    from langgraph_app.config import GPT_CONFIG
    
    prompt = f"""I need information about the brand "{brand_name}" (website: {domain}).

Please provide:
1. What products/services does this brand offer?
2. What industry/sector does it belong to?
3. What is the target market (geographic and demographic)?
4. What is the brand's positioning or unique value proposition?

Please answer in a structured format:
- Products/Services: [list]
- Industry: [one line]
- Target Market: [one line]
- Positioning: [one line]

If you don't have information about this brand, say "No information available"."""

    try:
        messages = [{"role": "user", "content": prompt}]
        resp = call_api(messages, GPT_CONFIG)
        content = resp["choices"][0]["message"].get("content", "").strip()
        
        # 解析 AI 返回的内容
        result = {
            "source": "ai_query",
            "raw_response": content,
            "inferred_industry": "",
            "inferred_target_market": "",
            "inferred_core_product": "",
            "one_liner": "",
        }
        
        # 简单解析
        lines = content.split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("- Products/Services:") or line.startswith("Products/Services:"):
                result["inferred_core_product"] = line.split(":", 1)[1].strip()
            elif line.startswith("- Industry:") or line.startswith("Industry:"):
                result["inferred_industry"] = line.split(":", 1)[1].strip()
            elif line.startswith("- Target Market:") or line.startswith("Target Market:"):
                result["inferred_target_market"] = line.split(":", 1)[1].strip()
            elif line.startswith("- Positioning:") or line.startswith("Positioning:"):
                result["one_liner"] = line.split(":", 1)[1].strip()
        
        return result
        
    except Exception as e:
        logger.log(f"[AI查询] 失败: {e}", "warn")
        return {"source": "ai_query", "error": str(e)}
```

2. **修改 profile() 函数**，增加 AI 降级逻辑

```python
async def profile(user_input: dict) -> dict:
    """生成结构化品牌画像。支持爬取 → AI查询 → 手动输入三级降级。"""
    domain = user_input.get("domain", "")
    brand_name = user_input.get("brand_name", "")
    
    # 第一级：尝试爬取官网
    page_text, _pages_ok, _chars, crawl_status = await _crawl_website(domain)
    
    # 检查爬取是否成功
    crawl_success = crawl_status.get("success", False) and _chars > 100
    
    if not crawl_success:
        logger.log(f"[降级] 官网爬取失败，尝试 AI 查询", "warn")
        
        # 第二级：用 AI 引擎查询
        ai_result = await _query_brand_with_ai(domain, brand_name)
        
        if ai_result.get("inferred_industry"):
            # AI 查询成功，用 AI 结果补充
            logger.log(f"[降级] AI 查询成功: {ai_result.get('inferred_industry')}")
            
            # 将 AI 结果转换为 prompt 可用的格式
            ai_context = f"""
=== AI QUERY RESULTS (官网爬取失败，使用 AI 查询) ===
Industry: {ai_result.get('inferred_industry', 'N/A')}
Target Market: {ai_result.get('inferred_target_market', 'N/A')}
Core Product: {ai_result.get('inferred_core_product', 'N/A')}
Positioning: {ai_result.get('one_liner', 'N/A')}
"""
            # 用 AI 结果生成品牌画像
            prompt = _build_prompt_with_ai(user_input, ai_context)
        else:
            # AI 查询也失败，用用户输入降级
            logger.log(f"[降级] AI 查询也失败，使用用户输入", "warn")
            prompt = _build_prompt(user_input, None)
    else:
        # 爬取成功，用爬取数据
        prompt = _build_prompt(user_input, page_text)
    
    # 调用 LLM 生成品牌画像
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
        return result
    
    if not result.get("one_liner") or not result.get("full_description"):
        result = _fallback(user_input)
        result["_crawl_status"] = crawl_status
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
    result["_data_source"] = "crawl" if crawl_success else "ai_query"
    return result
```

3. **新增 _build_prompt_with_ai 函数**

```python
def _build_prompt_with_ai(user_input: dict, ai_context: str) -> str:
    """用 AI 查询结果生成品牌画像的 prompt。"""
    target_pos = user_input.get("target_positioning", "")
    target_pos_section = (
        f"Brand's desired positioning: {target_pos}\n\n"
        if target_pos else ""
    )
    
    return (
        f"Generate a structured brand profile based on the AI query results and user input.\n\n"
        f"=== USER INPUT ===\n"
        f"Brand: {user_input.get('brand_name', 'N/A')}\n"
        f"Domain: {user_input.get('domain', 'N/A')}\n\n"
        f"{target_pos_section}"
        f"{ai_context}\n\n"
        "Return a JSON object with exactly these keys (ALL values in Chinese):\n"
        "{\n"
        '  "one_liner": "一句话品牌定位（中文）",\n'
        '  "value_props": ["核心价值主张1", "核心价值主张2", "核心价值主张3"],\n'
        '  "differentiators": ["关键差异化1", "关键差异化2"],\n'
        '  "target_personas": ["目标客户画像1", "目标客户画像2"],\n'
        '  "tone_keywords": ["品牌调性关键词1", "关键词2", "关键词3"],\n'
        '  "full_description": "200-300字完整品牌描述（中文），自然流畅",\n'
        '  "inferred_industry": "从AI查询推断的行业（中文）",\n'
        '  "inferred_target_market": "从AI查询推断的目标市场（中文）",\n'
        '  "inferred_core_product": "从AI查询推断的核心产品（中文，一句话描述）"\n'
        "}\n\n"
        "Requirements:\n"
        "- one_liner: 简洁有力，抓住本质\n"
        "- value_props: 3个核心价值主张\n"
        "- differentiators: 2个关键差异化\n"
        "- target_personas: 2个目标客户画像\n"
        "- tone_keywords: 3个品牌调性关键词\n"
        "- full_description: 200-300字完整品牌描述\n"
        "- inferred_industry: 从AI查询推断的行业\n"
        "- inferred_target_market: 从AI查询推断的目标市场\n"
        "- inferred_core_product: 从AI查询推断的核心产品\n"
    )
```

### 验证方法

**测试1: 爬取成功**
```bash
python3 -c "
import asyncio
from langgraph_app.tools.brand_profiler import profile

async def test():
    result = await profile({'domain': 'ugreen.com', 'brand_name': 'UGREEN'})
    print(f'Data source: {result.get(\"_data_source\")}')
    print(f'Industry: {result.get(\"inferred_industry\")}')
    print(f'Market: {result.get(\"inferred_target_market\")}')
    print(f'Product: {result.get(\"inferred_core_product\")}')

asyncio.run(test())
```
应该返回 `_data_source: crawl`

**测试2: 爬取失败，AI 查询成功**
```bash
python3 -c "
import asyncio
from langgraph_app.tools.brand_profiler import profile

async def test():
    result = await profile({'domain': 'partheafashion.com', 'brand_name': 'Parthea Fashion'})
    print(f'Data source: {result.get(\"_data_source\")}')
    print(f'Industry: {result.get(\"inferred_industry\")}')
    print(f'Market: {result.get(\"inferred_target_market\")}')
    print(f'Product: {result.get(\"inferred_core_product\")}')

asyncio.run(test())
```
应该返回 `_data_source: ai_query`

---

## 任务4: 前端域名验证 + 失败提示

### 需要改的文件
- `frontend/components/scan-chat.tsx`（或当前的对话输入组件）
- `frontend/app/(app)/scan/page.tsx`（如果需要修改流程）

### 实现要求

**目标流程：**

```
用户输入域名 →
  ├─ 调用 /api/validate-domain 验证
  │
  ├─ 可访问 ✅
  │   └─ 显示"✅ 域名验证成功" → 继续收集信息
  │
  └─ 不可访问 ❌
      └─ 显示"⚠️ 域名无法访问" + 两个选项：
          ├─ 选项1: 用 AI 查询（自动，约10秒）
          └─ 选项2: 手动补充信息（表单）
```

**验证失败时的提示文案：**

```
⚠️ 域名无法访问

我们无法访问 partheafashion.com，可能的原因：
• 域名不存在或已过期
• 服务器无响应
• 网站暂时不可用

请选择如何继续：

┌─────────────────────────────────────────────┐
│  [选项1] 用 AI 查询品牌信息                   │
│  我们将用 ChatGPT 查询您的品牌公开信息       │
│  （约需10秒，准确度中等）                     │
│                                             │
│  [选项2] 手动补充信息                         │
│  请填写以下信息：                            │
│  • 品牌名称 *                                │
│  • 品牌简介 *（50字以上）                    │
│  • 其他链接（亚马逊/社交媒体）               │
└─────────────────────────────────────────────┘
```

**前端代码示例：**

```tsx
// 在 ScanChat 组件中
const [domainStatus, setDomainStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
const [domainError, setDomainError] = useState<string>("");
const [showFallbackForm, setShowFallbackForm] = useState(false);
const [fallbackOption, setFallbackOption] = useState<"ai" | "manual" | null>(null);

async function handleDomainSubmit(domain: string) {
  setDomainStatus("validating");
  
  try {
    const res = await fetch(`${API_BASE}/api/validate-domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const data = await res.json();
    
    if (data.accessible) {
      setDomainStatus("valid");
      // 继续收集其他信息
      onNextStep();
    } else {
      setDomainStatus("invalid");
      setDomainError(data.error || "域名无法访问");
      setShowFallbackForm(true);
    }
  } catch {
    setDomainStatus("invalid");
    setDomainError("验证请求失败");
    setShowFallbackForm(true);
  }
}

// 渲染验证状态
{domainStatus === "validating" && (
  <div className="flex items-center gap-2">
    <span className="animate-spin">⏳</span>
    <span>正在验证域名...</span>
  </div>
)}

{domainStatus === "valid" && (
  <div className="text-green-500">✅ 域名验证成功</div>
)}

{domainStatus === "invalid" && showFallbackForm && (
  <div>
    <p className="text-yellow-500">⚠️ 域名无法访问</p>
    <p className="text-sm text-gray-400">{domainError}</p>
    
    {/* 选项1: AI 查询 */}
    <button
      onClick={() => {
        setFallbackOption("ai");
        onFallbackSubmit({ option: "ai", domain });
      }}
      className="w-full mt-4 p-4 text-left"
      style={{ background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.15)" }}
    >
      <p className="text-sm font-medium" style={{ color: "#7DD3FC" }}>用 AI 查询品牌信息</p>
      <p className="text-xs mt-1" style={{ color: "#5E5E78" }}>约需10秒，准确度中等</p>
    </button>
    
    {/* 选项2: 手动补充 */}
    <button
      onClick={() => setFallbackOption("manual")}
      className="w-full mt-2 p-4 text-left"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <p className="text-sm font-medium" style={{ color: "#9A9AB0" }}>手动补充信息</p>
      <p className="text-xs mt-1" style={{ color: "#5E5E78" }}>填写品牌名称和简介</p>
    </button>
    
    {/* 手动补充表单 */}
    {fallbackOption === "manual" && (
      <FallbackInfoForm onSubmit={(data) => onFallbackSubmit({ option: "manual", ...data })} />
    )}
  </div>
)}
```

### 验证方法

**测试1: 正常域名**
1. 输入 `ugreen.com`
2. 应该显示"正在验证域名..."
3. 验证成功，显示"✅ 域名验证成功"
4. 继续收集其他信息

**测试2: 不可访问域名**
1. 输入 `partheafashion.com`
2. 应该显示"正在验证域名..."
3. 验证失败，显示"⚠️ 域名无法访问"
4. 显示两个选项：AI查询 / 手动补充
5. 选择"AI查询" → 自动调用 /api/profile → 显示品牌画像
6. 选择"手动补充" → 显示表单 → 填写后继续

---

## state.py 改动汇总

**不需要改 state.py！** 只是在 crawl_status 中增加 `is_spa` 和 `_data_source` 字段。

---

## CHECKLIST 自检

**任务1 [换真实浏览器 UA]:**
- [ ] User-Agent 改为真实浏览器 UA
- [ ] Accept-Language 改为 en-US,en;q=0.9
- [ ] _probe_paths 函数更新 UA
- [ ] _fetch_raw_html 函数更新 UA
- [ ] 测试正常域名可访问

**任务2 [接入 Playwright]:**
- [ ] 安装 playwright 和 chromium
- [ ] _fetch_with_playwright 函数实现
- [ ] SPA 检测逻辑（body 文本 < 100 字符 或 有 React/Vue 标识）
- [ ] 爬取失败时自动降级到 Playwright
- [ ] 测试 SPA 网站可渲染

**任务3 [AI 引擎降级]:**
- [ ] _query_brand_with_ai 函数实现
- [ ] profile() 函数增加 AI 降级逻辑
- [ ] _build_prompt_with_ai 函数实现
- [ ] _data_source 字段标记数据来源
- [ ] 测试爬取失败时 AI 查询成功

**任务4 [前端域名验证]:**
- [ ] /api/validate-domain 端点实现
- [ ] 前端调用验证域名
- [ ] 验证失败显示两个选项
- [ ] AI 查询选项自动调用 /api/profile
- [ ] 手动补充选项显示表单
- [ ] 表单验证（品牌名+简介50字以上）

**任务5 [验证测试]:**
- [ ] 正常域名：爬取成功，_data_source=crawl
- [ ] SPA 网站：Playwright 渲染成功
- [ ] 不可访问域名：AI 查询成功，_data_source=ai_query
- [ ] AI 也失败：用户手动输入成功

---

## 交付格式

```
自检结果: X/5 任务1 + X/5 任务2 + X/5 任务3 + X/6 任务4 + X/4 任务5 = XX/25
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **Playwright 安装**：需要在服务器上安装 chromium，可能需要管理员权限
2. **超时设置**：Playwright 渲染可能需要 30 秒，要设置合理的超时
3. **成本控制**：AI 查询会消耗 API 额度，只在爬取失败时调用
4. **并发限制**：Playwright 渲染是资源密集型，不要并发太多
5. **降级顺序**：爬取 → AI查询 → 用户手动输入，不要跳过步骤

---

## 预期效果

### 正常域名
```
用户输入 ugreen.com → 爬取成功 → 品牌画像准确
_data_source: crawl
inferred_industry: 消费电子与智能硬件
inferred_target_market: 全球市场
inferred_core_product: 充电器、数据线、扩展坞
```

### SPA 网站
```
用户输入 some-react-site.com → 检测到 SPA → Playwright 渲染 → 品牌画像准确
_data_source: crawl
is_spa: true
```

### 不可访问域名
```
用户输入 partheafashion.com → 爬取失败 → AI 查询成功 → 品牌画像中等准确
_data_source: ai_query
inferred_industry: 女装时尚
inferred_target_market: 北美市场
inferred_core_product: 女装、配饰
```

### AI 也失败
```
用户输入 unknown-brand.com → 爬取失败 → AI 查询失败 → 用户手动输入
_data_source: manual_input
```
