# CiteFlow GEO Audit Framework

> 基于 SEO 审计方法论（E-E-A-T 质量标准 + 优先级体系），适配 AI 搜索引擎（ChatGPT/Gemini/Claude）的专属诊断框架。
> 专为中国跨境出海品牌设计。
>
> 来源：改编自 Corey Haines 的 SEO Audit Skill（MIT License），AI 搜索场景重写。

---

## 核心差异：SEO vs GEO

| | 传统 SEO | GEO（AI 搜索） |
|---|---------|---------------|
| 目标 | Google 排名 | AI 引擎引用率 / 推荐率 |
| 爬虫 | Googlebot | LLM 训练数据 + RAG 检索 |
| 关键信号 | Backlinks / PageSpeed / Core Web Vitals | 结构化数据 / 权威源引用 / 内容清晰度 |
| 查询方式 | 关键词匹配 | 自然语言理解 + 语义检索 |
| 结果形式 | 蓝色链接列表 | 段落引用 + 品牌推荐 |

---

## CITE 四维诊断模型

AI 搜索可见度 = 四个维度的乘积：

```
Content    内容力    — AI 需要"素材"来引用你
Identity   身份清晰度 — AI 需要准确理解"你是谁"
Trust      信任信号   — AI 需要第三方背书来推荐你
Engagement 社区存在   — AI 需要看到"活着的品牌"
```

### 方法论溯源

CiteFlow CITE 模型融合了以下方法论基础：

- **E-E-A-T 质量标准**（Google Search Quality Rater Guidelines）→ 适配为 AI 搜索的 Experience/Expertise/Authoritativeness/Trustworthiness
- **5 阶段 AI 引用审计链**（改编自姚金刚 yao-geo-skills 的 page-audit 方法论）→ 发现→检索候选→正文抽取→证据质量→生成引用
- **证据成熟度模型**（改编自姚金刚 yao-geo-skills 的 brand-graph 方法论）→ A/B/C/D/E 五级证据分级
- **8 维度内容评分体系**（改编自姚金刚 yao-geo-skills 的 content-refiner 方法论）→ 语义密度/结构/可引用性/权威/可读性/鲁棒性/新颖性/跨域贡献

---

## AI 引用审计 5 阶段链

不是"爬→分析→输出"的线性流程，而是逐层递进的管道。每一层失败，下游都是空的。

```
阶段1 — 可发现性
  AI 能找到你的页面吗？
  检查：知识图谱、搜索引擎索引、robots.txt、sitemap、多语言 URL 结构

阶段2 — 检索候选
  页面进入 AI 检索池后，能否被选为候选？
  检查：Title 信息量、Meta Description 可引用性、URL 可读性、H1 语义

阶段3 — 正文抽取
  AI 选中页面后，能否成功提取有意义的内容？
  检查：JS 渲染、内容在首屏 HTML、正文不被导航/广告淹没、Schema 存在且正确

阶段4 — 证据质量
  提取的内容是否值得被 AI 引用？
  检查：数值事实、数据引用、结论前置、作者/来源标注、时效性

阶段5 — 生成引用
  AI 决定引用时，引用的是品牌想传达的信息吗？
  检查：品牌名一致性、产品描述准确性、竞品对比是否客观
```

> 改编自：姚金刚 yao-geo-page-audit 方法论。原文链接：https://github.com/yaojingang/yao-geo-skills

---

## 审计优先级

1. **可发现性**（AI 能找到你吗？）
2. **结构化数据**（数据格式对 AI 友好吗？）
3. **内容引用力**（内容值得被 AI 摘取吗？）
4. **身份清晰度**（AI 准确理解你的定位吗？）
5. **信任信号**（第三方替你说话吗？）
6. **社区存在**（品牌在目标市场活跃吗？）

---

## 1. 可发现性（Discoverability）

### 1.1 知识图谱覆盖

**检查项：**
- 品牌是否出现在 Wikidata / Wikipedia？
- Google Knowledge Graph 是否有品牌实体？
- 品牌名称是否在 AI 训练数据中出现？

**常见问题（跨境品牌）：**
- 品牌有中文名但无英文 Knowledge Graph 条目
- Wikidata 条目缺失或信息过时
- 品牌实体与竞品混淆（名称相似）

**GEO 影响：高**
LLM 优先从知识图谱提取品牌信息。没有知识图谱条目 = AI 不认识你。

**修复方向：**
- 创建/完善 Wikidata 条目（Q-number）
- 确保 Wikipedia 页面存在且内容准确（英文优先）
- Schema.org `Organization` 标记 + `sameAs` 指向 Wikidata

### 1.2 品牌官网可爬取性

**检查项：**
- 官网是否被 Serper/Google 索引？
- `robots.txt` 是否误封关键页面？
- SPA 页面是否返回空壳（JS 渲染问题）？
- 多语言版本是否各自可索引？

**常见问题（跨境品牌）：**
- 中文站和英文站用同一个域名的不同路径，但 robots.txt 处理不当
- Shopify/WooCommerce 的默认 robots.txt 未定制
- SPA 框架（React/Vue）没有 SSR，搜索引擎和 AI 爬虫都看不到内容

**GEO 影响：高**
LLM 的 RAG 检索依赖搜索引擎索引。搜不到 = 引用率为零。

**修复方向：**
- 验证 `site:brand.com` 在 Google/Bing 的索引量
- SPA → SSR/SSG 改造，或至少确保关键页面预渲染
- 多语言站点：确保 hreflang 正确，每种语言独立可索引

### 1.3 多语言 / 跨境站点结构

**检查项：**
- hreflang 标签是否正确？（自引用 + 双向 + x-default）
- 每个语言版本是否自 canonical？
- 是否存在跨语言 canonical（如法语页 canonical 到英语页）→ 非规范语言完全被抑制
- 翻译质量：是否全文翻译（不只是 UI chrome），AI 翻译本身不是问题，但机器翻译+低价值内容 = 被判定薄内容
- URL 结构：子目录（`/en/`, `/fr/`）最推荐；URL 参数（`?lang=en`）不推荐

**常见问题（跨境品牌）：**
- 中文站内容丰富，英文站只有产品名称翻译 → 薄内容
- hreflang 缺少自引用条目 → 整个 hreflang 集群被忽略
- 所有语言版本 canonical 到英语 → 非英语页完全不索引
- Shopify 自动翻译插件产生大量低质量英文页面

**GEO 影响：高**
LLM 检索时优先取英文内容。英文站薄 → AI 引用的是你的中文站的机器翻译版，品牌定位全丢。

---

## 2. 结构化数据（Structured Data）

### 2.1 Schema.org 标记

AI 引用率与 Schema 标记正相关（论文：Is Visibility Enough?, Tafesse 2025）。

**必检 Schema 类型：**
- `Organization` — 品牌实体，含 `name`, `url`, `sameAs`, `logo`
- `FAQPage` — FAQ 页面 → AI 直接摘取 Q&A
- `Product` — 产品页 → AI 提取规格、价格、评价
- `Article` / `BlogPosting` — 文章 → AI 引用为权威内容
- `BreadcrumbList` — 面包屑 → AI 理解页面层级
- `LocalBusiness` — 线下门店（如适用）

**检测方法：**
- 浏览器 DevTools：`document.querySelectorAll('script[type="application/ld+json"]')`
- Google Rich Results Test（渲染 JS）
- **不能**用 curl/web_fetch 检测——CMS 插件通常通过 JS 注入 JSON-LD，静态抓取看不到

**常见问题（跨境品牌）：**
- Shopify/WooCommerce 安装了 SEO 插件但 Schema 未配置
- 有 Schema 但字段不完整（缺 `sameAs`, 缺 `logo`）
- FAQPage Schema 内容与页面实际内容不一致
- 品牌官网完全没有 Schema 标记

**GEO 影响：高**
结构化数据 = AI 的"菜单"。没有结构化数据，AI 只能从正文中猜测，品牌信息大概率被误读。

### 2.2 开放图谱（Open Graph）

**检查项：**
- `og:title`, `og:description`, `og:image` 每个页面是否完整？
- `og:image` 是否可访问？（无 404）
- `og:locale` 多语言页面是否分别设置？

**GEO 影响：中**
LLM 可能使用 og:description 作为页面摘要。缺失 → AI 自造摘要。

---

## 3. 内容引用力（Content Citability）

### 3.1 页面标题（Title Tags）

AI 引用品牌时，优先使用 `<title>` 标签中的信息。

**检查项：**
- 每页有唯一的 `<title>`
- 核心关键词在标题前部
- 品牌名放在末尾
- 长度 50-60 字符（英文）
- 不只是品牌名——包含品类/价值主张

**示例：**
- ❌ `UGREEN` 
- ✅ `UGREEN USB-C Hub 7-in-1 — Compact Docking Station for Mac & PC | UGREEN Official`

**GEO 影响：高**
AI 从 title 提取产品名和品类。标题只有品牌名 = AI 不知道你卖什么。

### 3.2 元描述（Meta Description）

**检查项：**
- 每页有唯一描述（不是自动生成）
- 150-160 字符
- 包含品类 + 差异化
- 可被 AI 直接摘取为引用片段

**GEO 影响：中**
AI 引用时经常直接摘取 meta description 作为品牌描述。

### 3.3 标题层级（Heading Structure）

**检查项：**
- 只有一个 H1
- H1 包含核心关键词
- 层级清晰：H1 → H2 → H3，不跳级
- 标题描述内容，不是仅为样式

**GEO 影响：中**
AI 用 heading 结构理解页面内容组织。混乱的 heading → AI 误解内容重点。

### 3.4 内容深度

**检查项：**
- 核心页面是否覆盖用户完整需求的深度？
- 正文是否在首屏可见，而非埋在 JS 加载后？
- 英文内容是否原生撰写（不是机器翻译后未编辑）？
- 是否有原创数据/见解/案例？

**常见问题（跨境品牌）：**
- 产品页只有图片和价格，无英文长文描述
- "About Us" 页面太短（<200 词），AI 无法提取品牌定位
- 中文站有博客，英文站没有 → 英文市场内容荒漠
- 机器翻译的英文不通顺 → AI 引用后用户读不懂

**GEO 影响：高**
内容深度 = 被 AI 引用的理由。浅内容 → AI 略过你。

### 3.5 FAQ 内容

AI 搜索引擎对 FAQ 格式的内容有极强的偏好——FAQ 天然匹配问答式查询。

**检查项：**
- 是否有 FAQ 页面？FAQ 内容是否覆盖目标市场常见问题？
- 每个 FAQ 是否短小精悍、直接回答？
- FAQPage Schema 是否与页面内容一致？

**GEO 影响：高**
FA*Q = AI 最易摘取的内容格式。有 FAQ + Schema = 引用率翻倍。

### 3.6 内容 GEO 评分体系（8 维度）

每条内容的 AI 引用潜力可以从以下 8 个维度评分。这是 Analyst 内容相关规则的底层理论依据。

| 维度 | 检查要点 | 对应 Analyst 规则 |
|------|---------|-----------------|
| **语义密度** | 每段的实体密度、关键词覆盖、避免注水句 | 规则涉及内容质量 |
| **结构规范性** | H1-H3 层级、`<main>`/`<article>` 标签、Schema 完整性 | 规则涉及技术结构 |
| **可引用性** | 独立段落可被摘取、结论前置、FAQ 格式 | 规则涉及引用潜力 |
| **权威信号** | 数据来源标注、作者信息、引用第三方研究 | 规则涉及可信度 |
| **可读性** | 段落长度、句子复杂度、移动端渲染 | 规则涉及用户体验 |
| **鲁棒性** | JS 依赖、内容在首屏 HTML、爬虫可访问 | 规则涉及技术可访问性 |
| **新颖性** | 内容时效、包含最新数据/趋势/标准 | 规则涉及时效性 |
| **跨域贡献** | 内容是否贡献到外部权威源（Wikipedia、行业媒体） | 规则涉及外部影响力 |

> 改编自：姚金刚 yao-geo-content-refiner 的 8 维度 GEO 评分方法论。原文链接：https://github.com/yaojingang/yao-geo-skills

---

## 4. 身份清晰度（Identity Clarity）

### 4.1 品牌定位一致性

**检查项：**
- LLM 在回答"X 品牌是什么"时，给出的描述是否准确？
- 品牌在不同引擎（ChatGPT/Gemini/Claude）中的描述是否一致？
- LLM 是否混淆品牌与竞品？（品牌名相似导致）
- 品牌自述（官网 About 页）vs AI 描述之间的差距有多大？

**检测方法：**
在 ChatGPT/Gemini/Claude 中搜索 "What is {brand_name}?"，收集 AI 的输出。对比官网 About 页面的品牌定位。

**常见问题（跨境品牌）：**
- AI 把品牌归类到错误的行业（如把消费电子品牌归为配件批发商）
- 中文品牌名在英文 AI 搜索中不识别
- AI 描述基于 Amazon listing 而非官网 → 品牌故事全丢
- 品牌定位在 AI 眼中 = "一个卖 XXX 的网站"，没有任何差异化

**GEO 影响：高**
身份清晰度 = AI 推荐你的理由。身份模糊 = AI 不推荐你。

### 4.2 About 页面质量

**检查项：**
- About 页内容是否 > 500 词？
- 是否包含品牌使命、差异化、创始故事？
- 是否有结构化数据（Organization Schema）？
- 是否容易被 AI 摘取为品牌摘要？

**GEO 影响：高**
About 页 = AI 定义"你是谁"的核心信息源。

---

## 5. 信任信号（Trust Signals）

### 5.1 第三方权威引用

AI 推荐品牌时，优先引用第三方权威源的信息，而非品牌自述。

**检查项：**
- 品牌是否被权威科技媒体评测？（TechRadar/CNET/The Verge/Wirecutter）
- 品牌是否被行业媒体/博客深入报道？
- 品牌是否在 Wikipedia 中被引用（作为独立条目或列表项）？
- 品牌是否有用户评价/UGC 可被 AI 摘取？（Trustpilot/G2/Reddit）

**常见问题（跨境品牌）：**
- 产品在 Amazon 有几千条评价，但没有权威科技媒体评测 → Amazon 评价不满足"权威源"标准
- 只在中国科技媒体有报道，英文媒体零覆盖 → 英文 AI 搜不到
- 品牌没有送测计划（outreach 给 YouTuber/媒体）

**GEO 影响：高**
第三方引用 = AI 推荐的"证据"。没有第三方背书 = AI 只能引用你自己的话，公信力为零。

### 5.2 结构化信任标记

**检查项：**
- HTTPS 全站覆盖
- 隐私政策 + 服务条款页面存在且可访问
- 联系信息清晰（不只是联系表单）
- 行业认证/奖项/合规标记是否有结构化标记？（如 `certification` Schema）

**GEO 影响：中**
信任标记 = AI 判断品牌可信度的辅助信号。

### 5.3 证据成熟度模型（Evidence Maturity Model）

品牌主张的证据强度分五级。AI 引用时优先选择 A/B 级证据。

| 等级 | 定义 | 示例 | AI 引用倾向 |
|------|------|------|-----------|
| **A 级 — 官方已证实** | 品牌官网/官方文档中可验证的事实 | 产品规格页、官方新闻稿、财报 | ⭐⭐⭐⭐⭐ 最高优先级 |
| **B 级 — 第三方佐证** | 权威第三方独立验证的事实 | 科技媒体评测、G2 评价、Wikipedia 条目 | ⭐⭐⭐⭐ 高优先级 |
| **C 级 — 内部待授权** | 品牌内部数据但未公开 | 客户案例、内部测试报告、销售数据 | ⭐⭐⭐ 需脱敏后可用 |
| **D 级 — 需要补证** | 声称但无法验证的断言 | "行业领先"、"最畅销"、无数据支撑 | ⭐⭐ AI 倾向忽略 |
| **E 级 — 禁止使用** | 虚假/过时/不可验证的信息 | 过期认证、虚假评价、违规声明 | ❌ 损害引用率 |

**诊断使用**：
- 分析品牌的引用源分布：A 级占比 < 20% → Trust 维度问题
- 分析 D/E 级占比：D+E 占比 > 30% → 品牌信任信号严重缺失
- 处方生成时：优先将 D 级主张升级为 A/B 级（补充官方页面、获取第三方评测）

> 改编自：姚金刚 yao-geo-brand-graph 的证据策略方法论（原文链接：https://github.com/yaojingang/yao-geo-skills）

---

## 6. 社区存在（Engagement）

### 6.1 社交媒体活跃度

**检查项：**
- 品牌在目标市场是否有活跃的社交媒体账号？
- 社交媒体内容是否被搜索引擎索引？
- Reddit/Quora/论坛中是否有关于品牌的讨论？

**GEO 影响：中**
AI 训练数据包含社交媒体和论坛内容。活跃的社区讨论 = 品牌出现在更多 AI 上下文中。

### 6.2 用户生成内容（UGC）

**检查项：**
- 是否有用户评测/开箱视频（YouTube）？
- 是否有社区讨论（Reddit/Discord）？
- 是否有详细的产品对比帖子（"X vs Y"）？

**GEO 影响：中**
UGC = 真实的"经验信号"。AI 在 E-E-A-T 框架下看重真实用户体验。

---

## 跨境品牌特有问题

### 问题 1：中文强 / 英文弱
中文站内容完整，英文站只有产品名称和价格。AI 只能检索到英文内容 → 引用率极低。

**诊断信号**：中文品牌名在 AI 搜索中有结果，英文品牌名无结果。

### 问题 2：品牌定位丢失
品牌在国内有完整品牌故事，但在英文互联网上沦为"Amazon 上的一个 listing"。AI 只知道产品，不知道品牌。

**诊断信号**：AI 描述品牌时用词是"a company that sells..."而非品牌使命驱动。

### 问题 3：信任信号空白
没有送测给英文媒体，没有英文 Wikipedia 条目，没有 Trustpilot/Reddit 讨论。

**诊断信号**：AI 引用来源全部是品牌官网，没有任何第三方域名。

### 问题 4：多语言策略错误
hreflang 缺失或错误配置，导致英文页面不索引 / 中文内容被优先显示给英文用户。

**诊断信号**：在英文 AI 引擎中搜索，返回的结果引用了中文页面内容。

### 问题 5：Schema 完全缺失
跨境品牌官网（尤其是 Shopify 建站）的 Schema 标记几乎为零。

**诊断信号**：Rich Results Test 返回"No items detected"。

---

## 输出格式

每个诊断发现使用统一格式：

```
Issue   — 发现的问题
Impact  — GEO 影响（高/中/低）+ 量化预期
Evidence — 如何发现的（工具 + 证据）
Fix     — 修复建议（页面级，可直接执行）
Priority — P0（阻断引用）/ P1（严重影响）/ P2（边际优化）
```

---

## 与 CiteFlow 产品的映射

| 框架维度 | CiteFlow 产品 | 实现方式 |
|---------|-------------|---------|
| 可发现性 | Probe 侦察兵 → 品牌画像 | 爬官网 + AI 推断品牌信息 |
| 结构化数据 | Probe → 技术体检 | 检测 Schema 标记完整性 |
| 内容引用力 | Analyst 分析师 → 诊断 | 14 条规则中的内容相关规则 |
| 身份清晰度 | Analyst → 定位偏差分析 | B 类查询词 AI 描述 vs 品牌自述 |
| 信任信号 | Analyst → 竞品差距 | 对比行业引用率 + 权威源分析 |
| 社区存在 | Doctor 医师 → 处方 | 生成社区运营类处方 |
| 跨境特有问题 | 全链路 | 多语言检测 + hreflang 验证 |
| 处方路线图 | Doctor Phase 3-4（规划中） | 6 项目包 × 30/60/90 天执行计划 |

---

## Doctor 处方路线图结构（Phase 3-4 规划）

当前 Doctor 输出平铺处方清单（P0/P1/P2）。未来升级为以下结构：

### 6 项目包

| 项目包 | 对应 CITE 维度 | 内容 |
|--------|-------------|------|
| 页面技术 | Content | Schema 改造、爬虫配置、页面性能、URL 结构 |
| 内容矩阵 | Content + Identity | 深度文章、FAQ、对比页面、品牌定位页 |
| 标题体系 | Content | Title 优化、Meta 重写、H1-H3 结构调整 |
| 知识库 | Identity | Wikidata 条目、Wikipedia 页面、品牌实体建设 |
| 外部证据 | Trust | 媒体评测、G2/Trustpilot、行业报告、权威引用 |
| 监测闭环 | Engagement | Reddit 社区、复查验证、引用率追踪 |

### 30/60/90 天路线图

```
30 天快赢：可验证的小改动
  → Schema 标记修复、Title/Meta 重写、FAQ 页面创建
  → 验收：A 类引用率提升 5pp+

60 天资产建设：深度内容和外部证据
  → 深度对比文章、G2/Trustpilot 评价积累、媒体送测
  → 验收：高权威源占比 > 30%，竞品差距缩小

90 天闭环优化：监测、复盘、迭代
  → 复查引用率变化、社区存在建设、跨域贡献评估
  → 验收：品牌实体在 AI 搜索中呈现完整 CITE 四维画像
```

### 每条任务包含

```
目标 → 优先级 → 任务清单 → 负责人 → 交付物 → 验收指标 → 依赖 → 预算 → 风险
```

> 改编自：姚金刚 yao-geo-execution-roadmap 的 30/60/90 天执行路线图方法论。原文链接：https://github.com/yaojingang/yao-geo-skills

---

> 版本：2.0.0 | 融合 Corey Haines SEO Audit（MIT）+ 姚金刚 yao-geo-skills 方法论 | AI 搜索场景重写
> 维护：玄老（GEO 知识策展）+ 药老（架构决策）
> 新增（v2.0）：5 阶段审计链、8 维度内容评分、证据成熟度模型、处方路线图结构
