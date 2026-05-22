# Layer 6 实现思路 — 内容改造指南

> 药老出品 · 2026-05-09
> 目标: Analyst 输出可直接复制使用的内容模板，告诉用户"官网/meta/About Us 写什么"

---

## 问题

当前 ai_narrative 只输出抽象建议：
```
期望描述："高性价比北欧风格家居"
关键词：北欧风格, 高性价比...
应避免：产品质量低劣...
```

用户拿到后还得自己写内容。产品价值止步于"给建议"，没有到"给方案"。

## 目标

Analyst 输出 5 个具体场景的英文内容模板，用户可直接复制粘贴使用。

---

## 数据来源

Probe 已经产出了所有需要的数据，不需要新增 Probe 模块：

| 数据 | 来源 | 用途 |
|------|------|------|
| 品牌定位 | brand_profile.one_liner | Title/About Us 开头 |
| 价值主张 | brand_profile.value_props | Meta Description 核心卖点 |
| 目标客户 | brand_profile.target_personas | 社交媒体 Bio 调性 |
| AI认知 | market_perception.perceived_identity | 知道当前AI怎么看（用于对比） |
| AI弱项 | market_perception.perceived_weaknesses | 需要避免的词/概念 |
| 引用来源 | citation_metrics.source_distribution | 知道AI从哪获取信息（针对性优化） |
| 竞品差距 | competitor_gap | 差异化卖点提炼 |

## 实现方案

### 改动1: analyst_prompt.py — SYSTEM_PROMPT 加规则

在现有规则之后，加一条 Layer 6 输出规则：

```python
# 在 SYSTEM_PROMPT 的输出格式部分，加以下字段
"""
当 market_perception 和 brand_profile 数据可用时，必须输出 content_templates 字段：

"content_templates": {
  "page_title": "品牌名 — 一句话定位（英文，60字符内）",
  "meta_description": "2-3句话的meta描述（英文，155字符内，包含核心卖点+目标市场+差异化）",
  "about_us_opening": "About Us页面开头段落（英文，3-4句话，讲故事调性）",
  "social_bio": "社交媒体简介（英文，2行内，含emoji）",
  "keywords_to_emphasize": ["应该强调的词1", "词2", "词3", "词4", "词5"],
  "keywords_to_avoid": ["应该避免的词1", "词2", "词3"],
  "key_content_action": "一句话内容改造建议（具体可执行）"
}

要求：
- page_title 和 meta_description 必须是英文（因为目标市场是海外）
- 所有内容必须可直接复制使用，不是抽象建议
- meta_description 必须包含：品牌定位 + 核心产品 + 差异化卖点 + 行动号召
- about_us_opening 调性必须匹配 brand_profile.tone_keywords
- keywords_to_emphasize 选择能扭转AI认知的词（针对 perceived_weaknesses 反向设计）
- keywords_to_avoid 选择会强化负面认知的词
- 如果数据不足，content_templates 所有字段填 null，不要编造
"""
```

### 改动2: analyst_prompt.py — FEW_SHOT 加示例

在 FEW_SHOT 示例中加一个完整的 content_templates 输出：

```python
# 在 FEW_SHOT 的 JSON 示例里加：
"""
"content_templates": {
  "page_title": "YesWelder — Professional Welding Equipment for Every Budget",
  "meta_description": "YesWelder delivers professional-grade MIG, TIG, and stick welders at accessible prices. Trusted by hobbyists and small shops across the US, Canada, and Europe. Free shipping on orders over $99.",
  "about_us_opening": "YesWelder was founded with a simple mission: professional welding equipment shouldn't cost a fortune. We design and manufacture MIG, TIG, stick welders, and plasma cutters that deliver industrial-grade performance at prices accessible to hobbyists, students, and small business owners.",
  "social_bio": "🔧 Professional welding equipment | 💰 Accessible prices\n🚚 Free shipping US/CA/UK/EU | ⭐ Trusted by 50K+ welders",
  "keywords_to_emphasize": ["professional-grade", "reliable", "warranty", "customer support", "community"],
  "keywords_to_avoid": ["cheap", "budget", "beginner-only", "entry-level"],
  "key_content_action": "在官网首页和产品页加'Professional Grade'标签，用'accessible pricing'替代'budget pricing'，展示专业用户使用案例而非仅初学者场景"
}
"""
```

### 改动3: state.py — AnalystOutput 加字段

```python
# 在 AnalystOutput 模型中加：
content_templates: Optional[dict] = None  # Layer 6: 内容改造指南
```

### 改动4: analyst_briefing.py — 传入数据

在 briefing 中确保 brand_profile 和 market_perception 数据完整传入。
当前 build_context 已经包含这些数据，不需要额外改动。
只需在 briefing 末尾加一段提示：

```python
"""
=== 内容改造指南要求 ===
基于 brand_profile（品牌自述）和 market_perception（AI认知），生成可直接使用的内容模板。
目标：缩小品牌自述与AI认知之间的差距。
"""
```

---

## 输出示例（Litfad）

```json
{
  "content_templates": {
    "page_title": "Litfad — Affordable Scandinavian Furniture & Lighting",
    "meta_description": "Discover modern Scandinavian furniture at Litfad. Shop desks, chairs, lighting, and home decor with free shipping to the US & Europe. Quality design, honest prices, 60-day easy returns.",
    "about_us_opening": "Litfad brings Scandinavian design philosophy to homes worldwide — clean lines, functional beauty, and honest craftsmanship. Every piece in our collection is designed to make modern living accessible, without compromising on quality or style.",
    "social_bio": "🏠 Scandinavian furniture & lighting | Affordable modern design\n🚚 Free shipping US & EU | ↩️ 60-day returns",
    "keywords_to_emphasize": ["quality materials", "Scandinavian design", "customer satisfaction", "easy returns", "free shipping"],
    "keywords_to_avoid": ["cheap", "budget", "discount", "low-cost"],
    "key_content_action": "把官网所有'cheap'替换成'quality at honest prices'，在首页加真实客户评价区块，产品图用实拍替代CG渲染，加'Quality Guarantee'徽章"
  }
}
```

---

## 前端展示建议

报告中 Layer 6 的展示方式：

```
┌─────────────────────────────────────────────────────────┐
│  层次六：你应该让AI怎么说你？                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [当前AI认知]  "被指控为骗局的低质量家具电商"            │
│       ↓                                                 │
│  [目标AI认知]  "Affordable Scandinavian design..."       │
│                                                         │
│  ────────────────────────────────────────               │
│                                                         │
│  📋 直接可用的内容模板（点击复制）                       │
│                                                         │
│  [Page Title]        Litfad — Affordable Nordic...     │
│  [Meta Description]  Discover modern Scandinavian...    │
│  [About Us]          Litfad brings Scandinavian...      │
│  [Social Bio]        🏠 Scandinavian furniture...       │
│                                                         │
│  ✅ 强调这些词: quality, Scandinavian, easy returns     │
│  ❌ 避免这些词: cheap, budget, discount                │
│                                                         │
│  💡 一句话行动: 把"cheap"全换成"honest prices"          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 验证方法

- 测试1: Litfad — 内容模板应包含"Scandinavian"、"affordable"等词，避免"cheap"
- 测试2: YesWelder — 内容模板应包含"professional-grade"，避免"budget"
- 测试3: 数据不足时 — content_templates 所有字段应为 null，不编造

---

## 注意事项

1. **不要改 Probe** — 所有数据已经存在，只改 Analyst
2. **content_templates 可选** — 数据不足时输出 null，不影响其他层次
3. **英文输出** — 模板内容必须是英文（目标市场是海外用户）
4. **字符限制** — Title 60字符内，Meta 155字符内（SEO标准）
5. **调性匹配** — about_us_opening 必须匹配 brand_profile.tone_keywords
