# CiteFlow 知识库索引

> 维护：玄老（GEO 知识策展）+ 药老（架构决策）
> 最后更新：2026-05-23

---

## 目录结构

```
knowledge/
├── INDEX.md              ← 你在这里
├── STRATEGY_OVERVIEW.md  ← 策略总览（速查表）
├── geoflow-practices.md  ← GEOFlow 最佳实践提取（AI爬虫检测/llms.txt/RAG）
├── papers/               ← 14篇论文精读笔记（结构化 JSON）
├── templates/            ← 7个可直接复制粘贴的执行模板
├── industries/           ← 5个行业特化策略
├── platforms/            ← 3个平台特化策略
├── regions/              ← 1个地区特化策略
├── anti-patterns/        ← 10条已知反模式
└── evidence/             ← 因果证据链（待收集客户案例）
```

---

## 知识条目清单

### papers/ — 论文精读笔记

| ID | 论文 | arXiv | 策略数 | 置信度 |
|----|------|-------|--------|--------|
| 001 | GEO: Generative Engine Optimization | 2311.09735 | 5 | high |
| 002 | How Generative AI Disrupts Search | 2604.27790 | 4 | high |
| 003 | Citation Selection to Citation Absorption | 2604.25707 | 5 | high |
| 004 | Cultural Encoding in LLMs | 2601.00869 | 3 | high |
| 005 | The Discovery Gap | 2601.00912 | 3 | high |
| 006 | Structural Feature Engineering for GEO | 2603.29979 | 4 | high |
| 007 | AgenticGEO | 2603.20213 | 2 | medium |
| 008 | Beyond SEO: Transformer-Based Approach | 2507.03169 | 1 | medium |
| 009 | What Generative Search Engines Like (AutoGEO) | 2510.11438 | 2 | medium |
| 010 | E-GEO: Testbed for E-Commerce | 2511.20867 | 2 | high |
| 013 | Pinterest GEO (VLM + Agent) | 2602.02961 | 2 | medium |
| 014 | Don't Measure Once | 2604.07585 | 3 | high |
| 016 | Diagnosing Citation Failures | 2603.09296 | 1 | medium |
| 017 | Algorithmic Trust and Compliance | 2603.12282 | 2 | medium |

### templates/ — 执行模板

| file | 用途 | 处方类型 |
|------|------|---------|
| technical-schema-robots.md | Schema标记 + AI爬虫放行（完整UA列表） | 技术优化 |
| llms-txt-template.md | llms.txt + sitemap.txt AI爬虫导航文件 | 技术优化 |
| content-structure-prescription.md | 三层结构 + 可提取证据（页面模板） | 内容优化 |
| authority-building-prescription.md | Earned Media + 媒体评测（执行清单） | 权威建设 |
| community-presence-prescription.md | Reddit + Quora + 论坛（6月路线图） | 社区建设 |
| stats-snippet.md | 数值统计HTML代码片段（复制即用） | 内容优化 |
| three-layer-checklist.md | 三层结构逐项检查清单 | 内容优化 |

### industries/ — 行业策略

| 行业 | 文件 | 核心杠杆 |
|------|------|---------|
| DTC时尚 | dtc-fashion.md | 场景化内容 + 评价摘录 + 视觉→文本翻译 |
| 消费电子 | consumer-electronics.md | 对比表格 + 技术参数 + 评测覆盖 |
| 美妆 | beauty.md | 成分数据 + 文化弥合 + 前后对比 |
| 家居 | home-goods.md | 参数化 + 场景化 + UGC |
| 户外运动 | outdoor-sports.md | 社区存在 + 安全认证 + 参数精确 |

### platforms/ — 平台策略

| 平台 | 文件 | 自由度和限制 |
|------|------|-------------|
| Amazon | amazon.md | 中自由度（Listing + A+可优化，技术层不可控） |
| Shopify DTC | shopify-dtc.md | 全自由度（所有GEO杠杆可用） |
| TikTok Shop | tiktok-shop.md | 低直接可控性（需间接GEO策略） |

### regions/ — 地区策略

| 路线 | 文件 | 核心挑战 |
|------|------|---------|
| 中国→美国 | china-to-us.md | 文化编码差距30.6% + 五步弥合策略 |

### anti-patterns/ — 避坑指南

| 文件 | 反模式数 |
|------|---------|
| known-anti-patterns.md | 10条已证实有害的操作 |

### evidence/ — 因果证据

| 客户 | 文件 | 状态 |
|------|------|------|
| — | 待收集客户案例 | — |

---

## 现有知识资产

- `~/Desktop/CiteFlow/GEO_ENGINE_KNOWLEDGE_BASE.md` — 806行原始摘要（已提取完成）
- `~/Desktop/CiteFlow/langgraph_app/tools/knowledge_loader.py` — 知识注入引擎
- `~/Desktop/CiteFlow/langgraph_app/tools/doctor_prompt.py` — Doctor prompt 模板

---

## 玄老待办

- [x] 从 GEO_ENGINE_KNOWLEDGE_BASE.md 拆出14篇核心论文的精读笔记
- [x] 为4种处方类型创建执行模板（6个模板文件）
- [x] 为跨境常见行业创建策略页（5个行业）
- [x] 为重点平台创建策略页（3个平台）
- [x] 为中国→美国创建地区策略
- [x] 整理已知反模式（10条）
- [ ] 为论文11/12/19/20/21补充精读笔记（当前仅摘要级别）
- [ ] 收集客户案例填入 evidence/
- [ ] 与海老协同更新 knowledge_loader.py 以读取新结构化目录
