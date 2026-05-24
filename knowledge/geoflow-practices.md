# GEOFlow 最佳实践提取

> 来源：https://github.com/yaojingang/GEOFlow（Apache 2.0 License）
> 提取日期：2026-05-23
> 提取人：药老（CiteFlow 产品架构师）
> 用途：为 CiteFlow Probe/Analyst/Doctor 模块提供生产级 GEO 实践参考

---

## 1. AI 爬虫检测与流量分类

GEOFlow 的 `AnalyticsLogQueryService` 实现了一套基于 User-Agent 的三层识别机制，用于判断网站流量来源：

### 完整 AI Bot 列表
```
GPTBot, ChatGPT-User, ChatGPT, oai-searchbot           # OpenAI
ClaudeBot, Claude-Web, anthropic-ai                     # Anthropic
PerplexityBot, Perplexity-Chat                          # Perplexity
ccbot, CCBot                                            # Common Crawl（LLM训练数据源）
Google-Extended                                         # Google（Gemini训练数据）
meta-externalagent, meta-externalfetcher                # Meta（LLaMA训练数据）
cohere-ai, cohere-dev                                   # Cohere
Bytespider                                              # ByteDance（豆包训练数据）
```

### 搜索 Bot 列表
```
Googlebot, Googlebot-Image, Googlebot-News              # Google 搜索
Bingbot, bingbot, MSNBot                                # Bing 搜索
Baiduspider                                             # 百度
DuckDuckBot                                              # DuckDuckGo
YandexBot                                                # Yandex
Slurp                                                    # Yahoo
```

### 通用 Bot 匹配模式
```
bot, spider, crawler, scraper, extractor
```

### 三层分类逻辑

```
URL 请求 → 提取 User-Agent
  → 第一层：精确匹配 AI Bot 列表？→ 标记为 AI Bot 流量
  → 第二层：精确匹配搜索 Bot 列表？→ 标记为搜索 Bot 流量  
  → 第三层：模糊匹配通用模式？→ 标记为其他 Bot
  → 否则 → 标记为人类流量
```

### 对 CiteFlow 的应用价值

**Probe 模块增强**：当 Probe 爬取客户网站时，可以同时检查：
- 客户的 robots.txt 是否放行了以上 AI Bot？
- 客户的访问日志中是否有 AI Bot 的抓取记录？→ 判断品牌是否被 AI 搜索引擎收录

**Analyst 报告增强**：在诊断报告中增加"AI 爬虫收录状态"指标：
- ✅ 所有主要 AI Bot 均已放行
- ⚠️ 部分 AI Bot 被 robots.txt 阻止（列出具体 Bot）
- ❌ 无法确认 AI 爬虫抓取状态（需接入网站分析）

---

## 2. llms.txt 标准与 TXT 地图

### 什么是 llms.txt

llms.txt 是放置在网站根目录的文本文件（类似 robots.txt），专门为 LLM/AI 爬虫提供网站内容导航。它告诉 AI："这个网站最重要的页面是什么"。

### GEOFlow 的实现

```txt
# llms.txt — 为 LLM 提供站点导航
# Domain: example.com
# Last Updated: 2026-05-23

## About
A brief description of what this site is about (2-3 sentences).

## Key Pages
- /about — Brand story, mission, and founding team
- /products — Full product catalog with specifications
- /blog — Industry insights and product guides
- /faq — Frequently asked questions about our products

## Product Categories  
- /products/welding-machines — Professional welding equipment
- /products/safety-gear — Personal protective equipment
```

### TXT 地图（TXT Sitemap）
```
https://example.com/page1
https://example.com/page2
https://example.com/page3
```

### GEO 价值

- AI 爬虫可以绕过 JS 渲染、导航结构等障碍直接获取核心页面列表
- 提高关键页面被 AI 训练数据收录的概率
- 控制 AI 对网站的"第一印象"

### 对 CiteFlow 的应用价值

**Doctor 处方**：将 llms.txt 作为"技术优化"类处方的标准项：
- 检查客户网站是否有 llms.txt
- 如果没有 → 生成定制化的 llms.txt 内容
- 配合 robots.txt 放行 AI 爬虫 → 形成完整的技术基础优化包

---

## 3. RAG 混合检索策略

GEOFlow 的知识库检索采用了混合评分方案：

### 评分公式
```
最终得分 = 0.75 × 向量相似度 + 0.25 × 词汇匹配度
```

### 回退机制
- 正常模式：使用 embedding 模型生成向量 → pgvector 执行相似度搜索
- Fallback 模式（无 embedding 模型）：使用哈希向量 + 纯词汇匹配，保证流程不中断

### 知识库索引流程
```
知识库上传 → 自动切片（按段落/语义边界）→ 生成 embedding → 存入 pgvector
  → 查询时：embedding 查询 + 词汇匹配 → 混合排序 → 取 Top-K → 注入 LLM Prompt
```

### 对 CiteFlow 的应用价值

**未来品牌知识库设计参考**：
- CiteFlow 计划建设"品牌档案库"（品牌信息/竞品/优化历史）
- 当 Doctor 生成处方时，需要检索该品牌的历史优化数据
- 混合检索策略可确保：既有语义相关性（向量搜索），又有关键词精确匹配（避免漏掉品牌名等精确匹配）

---

## 4. 分发签名安全机制

GEOFlow 的 Agent/渠道 API 使用 HMAC-SHA256 签名方案进行鉴权：

### 签名方式
```
signing_string = METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + NONCE + "\n" + BODY_SHA256
signature = hex_hmac_sha256(signing_string, secret)
```

请求头携带：`X-Timestamp`, `X-Nonce`, `X-Signature`

服务端验证流程：
1. 检查时间戳是否在允许范围内（防重放攻击）
2. 用同样的方式计算签名
3. 对比客户端签名和服务端签名
4. 一致 → 通过；不一致 → 403

### 对 CiteFlow 的应用价值

**未来 API 设计参考**：
- CiteFlow 开放 API 给客户系统集成时（如企业版对接客户 CMS）
- 品牌档案库的 API 端点鉴权

---

## 许可证兼容性

GEOFlow 使用 **Apache License 2.0**。
- 允许商业使用、修改、分发、私有部署
- 仅需保留版权声明和许可证文本
- 无 Copyleft 条款（与 CiteFlow 的闭源 SaaS 模式完全兼容）
- 本文档仅提取方法论和设计模式，不包含任何 GEOFlow 源代码

---

> 提取完成。具体实现请见：
> - `knowledge/templates/llms-txt-template.md` — llms.txt 生成模板
> - `knowledge/templates/technical-schema-robots.md` — 已更新的 AI Bot UA 列表
> - `knowledge/citeflow-geo-audit-framework.md` — 已增强的 §1.2 可发现性检查
