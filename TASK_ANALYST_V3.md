# TASK_ANALYST_V3.md — Analyst 诊断报告完整重写
> 药老出品 · 2026-05-21
> 目标: 覆盖全部 13 个字段，6 个模块，零缩水
> 预计工时: 8h

## 核心问题

当前 Analyst 前端只展示了 8/13 个后端字段。LLM prompt 产出了丰富的高质量数据，前端压扁了 40%。
丢失的 5 个字段：`engine_comparison` / `engine_insights` / `engine_recommendations` / `b_class_perception` / `diagnosis.core_problem` + `problem_detail`

## 任务概览

| # | 任务 | 文件 |
|---|------|------|
| 1 | 重写主组件（6个Module） | scan-analyst-report.tsx |
| 2 | 新建 M2 引擎情报组件 | 内嵌或独立 |
| 3 | 新建 M3 AI认知组件 | 内嵌或独立 |
| 4 | 验证 13 字段全覆盖 | 浏览器测试 |

---

## 新设计：6 模块

```
┌─────────────────────────────────────────────────┐
│  M1 · 诊断摘要                    [严重] 标签   │
│                                                  │
│  one_line_verdict 一大段文字                     │
│                                                  │
│  核心问题: core_problem                          │
│  详情: problem_detail (2-3句)                    │
│                                                  │
│  诊断依据: 三层链 ▸ 点击跳 M4                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  M2 · 多引擎情报                                 │
│                                                  │
│  ┌──────────┬──────────┬──────────┐            │
│  │ ChatGPT  │ Gemini   │ Claude   │            │
│  │ 引用 12% │ 引用 8%  │ 引用 5%  │            │
│  │ 推荐 4%  │ 推荐 2%  │ 推荐 1%  │            │
│  │ top: G2  │ top: Tr. │ top: Red │            │
│  └──────────┴──────────┴──────────┘            │
│                                                  │
│  最佳: ChatGPT · 最差: Claude · 差异: 7%        │
│  一致性: high                                    │
│                                                  │
│  洞察:                                           │
│  · engine_insights[0]                            │
│  · engine_insights[1]                            │
│  · engine_insights[2]                            │
│                                                  │
│  建议:                                           │
│  · engine_recommendations[0]                     │
│  · engine_recommendations[1]                     │
│  · engine_recommendations[2]                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  M3 · AI 眼中的你                                │
│                                                  │
│  AI 认为你是: {ai_identity}                      │
│  你自称是:   {brand_self_identity}               │
│  差距:       {gap_description}                   │
│                                                  │
│  AI 看到的优势:                                   │
│  [ai_strengths[0]] [ai_strengths[1]] ...         │
│  AI 看到的劣势:                                   │
│  [ai_weaknesses[0]] [ai_weaknesses[1]] ...       │
│  AI 不知道的:                                     │
│  [blind_spots[0]] [blind_spots[1]] ...           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  M4 · 三层诊断链                                 │
│                                                  │
│  ① 数据层: observation                           │
│       →                                          │
│  ② 解释层: explanation                           │
│       →                                          │
│  ③ 影响层: implication                           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  M5 · 竞品分析           3胜 · 4负 · 1平        │
│                                                  │
│  赢在: [winning_dim1] [winning_dim2] ...         │
│  输在: [losing_dim1] [losing_dim2] ...           │
│  根因: root_cause                                │
│  对策: counter_strategy                          │
│                                                  │
│  关键洞察: key_insight                           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  M6 · 行动指南                                   │
│                                                  │
│  ┌──────────────────────────────────┐           │
│  │ P0 · action[0].action            │ [复制]    │
│  │     理由: action[0].rationale     │           │
│  │     步骤: action[0].action_steps  │           │
│  ├──────────────────────────────────┤           │
│  │ P1 · action[1].action            │ [复制]    │
│  │ ...                              │           │
│  ├──────────────────────────────────┤           │
│  │ P2 · action[2].action            │ [复制]    │
│  └──────────────────────────────────┘           │
│                                                  │
│  SEO 文案模板（来自 content_templates）:         │
│  page_title                        [复制]       │
│  meta_description                  [复制]       │
│  about_us_opening                  [复制]       │
│  ...                                             │
│                                                  │
│  强调关键词: [kw1] [kw2] [kw3]                   │
│  避免关键词: [kw1] [kw2]                         │
│  优先行动: key_content_action                    │
│                                                  │
│  [查看完整处方 → Doctor]                          │
└─────────────────────────────────────────────────┘
```

---

## 13 字段完整映射

| # | 字段 | 子字段 | 模块 |
|---|------|--------|------|
| 1 | `diagnosis` | core_problem + problem_detail + severity | M1 |
| 2 | `one_line_verdict` | — | M1 |
| 3 | `engine_comparison` | best_engine + worst_engine + citation_rate_diff + recommendation_rate_diff + consistency + per_engine{gpt/gemini/haiku: citation_rate, recommendation_rate, top_sources} | M2 |
| 4 | `engine_insights[]` | 3-5 条洞察文字 | M2 |
| 5 | `engine_recommendations[]` | 3-5 条建议文字 | M2 |
| 6 | `b_class_perception` | ai_identity + brand_self_identity + gap_description + ai_strengths[] + ai_weaknesses[] + blind_spots[] | M3 |
| 7 | `three_layer_chain` | observation + explanation + implication | M4 |
| 8 | `c_class_matrix` | total_comparisons + wins + losses + ties + winning_dimensions[] + losing_dimensions[] + key_insight | M5 |
| 9 | `competitor_gap` | losing_dimensions[] + winning_dimensions[] + root_cause + counter_strategy | M5 |
| 10 | `actions[]` | priority + action + rationale + action_steps[] + expected_impact + estimated_time + estimated_cost + evidence_source | M6 |
| 11 | `content_templates` | page_title + meta_description + about_us_opening + social_bio + keywords_to_emphasize[] + keywords_to_avoid[] + key_content_action | M6 |
| 12 | `probe.company_score` | overall + dimensions[]{name, score, evidence, suggestion} | M1 顶部小卡 |
| 13 | `probe.citation_metrics` | mention_rate + industry_rate + a_recommendation_rate + c_recommendation_rate | M1 顶部小卡 |

---

## 任务 1: 重写 scan-analyst-report.tsx

### 文件
`/Users/fogn/Desktop/CiteFlow/frontend/components/scan-analyst-report.tsx`

### 完全重写，旧版不留。

### Props 接口

```typescript
interface ScanAnalystReportProps {
  data: any;                     // 包含 analyst_output + probe 数据
  onBackToBriefing: () => void;  // 返回 briefing
  onViewDoctor: () => void;      // 跳转 Doctor
}
```

### 数据提取（组件顶部）

```typescript
// ── Analyst 输出 ──
const diagnosis = data?.diagnosis || {};
const oneLineVerdict = data?.one_line_verdict || "";
const threeLayerChain = data?.three_layer_chain || {};
const engineComparison = data?.engine_comparison || {};
const engineInsights: string[] = data?.engine_insights || [];
const engineRecommendations: string[] = data?.engine_recommendations || [];
const bClassPerception = data?.b_class_perception || {};
const cClassMatrix = data?.c_class_matrix || {};
const competitorGap = data?.competitor_gap || {};
const actions: any[] = data?.actions || [];
const contentTemplates = data?.content_templates || {};

// ── Probe 数据 ──
const probe = data?.probe || {};
const companyScore = probe?.company_score;
const cm = probe?.citation_metrics || {};

// ── 判空 ──
const hasDiagnosis = !!diagnosis.core_problem;
const hasEngineData = !!(engineComparison.per_engine && Object.keys(engineComparison.per_engine).length > 0);
const hasBClass = !!(bClassPerception.ai_identity || bClassPerception.gap_description);
const hasThreeLayer = !!(threeLayerChain.observation || threeLayerChain.explanation || threeLayerChain.implication);
const hasCMatrix = !!(cClassMatrix.wins != null || cClassMatrix.total_comparisons != null);
const hasCompetitorGap = !!(competitorGap && ((competitorGap.winning_dimensions?.length > 0) || (competitorGap.losing_dimensions?.length > 0)));
const hasCompetitorData = hasCMatrix || hasCompetitorGap;
const hasActions = actions.length > 0;
const hasContentTemplates = !!(contentTemplates && (contentTemplates.page_title || contentTemplates.meta_description));
const hasActionModule = hasActions || hasContentTemplates;
```

---

## Module 1: 诊断摘要

### 数据源
`one_line_verdict` + `diagnosis.core_problem` + `diagnosis.problem_detail` + `diagnosis.severity`

### 展示

```
┌─ 严重度标签 (critical=红/warning=黄/healthy=绿) ─┐
│                                                    │
│  {one_line_verdict}                                │
│  (字体: 14px, color: #EDEDEF, leading-relaxed)     │
│                                                    │
│  核心问题                                          │
│  {core_problem}                                    │
│  (字体: 12px, color: #9A9AB0, 左侧有蓝色竖线)      │
│                                                    │
│  详情 ▸ 可展开                                    │
│  {problem_detail}                                  │
│  (字体: 11px, color: #5E5E78)                      │
└────────────────────────────────────────────────────┘
```

### 严重度颜色
```
critical → 边框色 rgba(239,68,68,0.15), 背景 rgba(239,68,68,0.04)
warning  → 边框色 rgba(245,158,11,0.15), 背景 rgba(245,158,11,0.04)
healthy  → 边框色 rgba(34,197,94,0.15), 背景 rgba(34,197,94,0.04)
```

### 评分子卡（内嵌或M1底部）

```
综合评分 {overall}/100  |  提及率 {mention_rate}%  |  A类引用率 {industry_rate}%  |  A类推荐率 {a_rec}%  |  C类推荐率 {c_rec}%
```

数字用 `font-mono`，颜色按数值：>=50绿 / >=20黄 / <20红。

---

## Module 2: 多引擎情报

### 数据源
`engine_comparison` (全部) + `engine_insights[]` + `engine_recommendations[]`

### 三引擎卡片

```typescript
const engines = [
  { key: "gpt", label: "ChatGPT" },
  { key: "gemini", label: "Gemini" },
  { key: "haiku", label: "Claude" },
].filter(e => engineComparison.per_engine?.[e.key]);

// 每个引擎卡片:
//   引擎名 (label)
//   引用率 {citation_rate}%  → 进度条
//   推荐率 {recommendation_rate}%  → 进度条
//   主要来源: {top_sources.join(", ")}
```

三列等宽，`grid grid-cols-3 gap-4`。

### 引擎摘要行

```
最佳引擎: {best_engine}  ·  最差引擎: {worst_engine}
引用率差异: {citation_rate_diff}%  ·  推荐率差异: {recommendation_rate_diff}%
一致性: {consistency} (high/medium/low)
```

### 洞察列表

```
{engine_insights.map((text, i) => (
  <li key={i}>💡 {text}</li>
))}
```

### 建议列表

```
{engine_recommendations.map((text, i) => (
  <li key={i}>→ {text}</li>
))}
```

### 边界
如果 `engine_comparison.per_engine` 为空（Light 模式）→ 整个 Module 显示"升级解锁多引擎对比分析"

---

## Module 3: AI 眼中的你

### 数据源
`b_class_perception` 全部 6 个子字段

### 展示

```
┌──────────────────────────────────────────┐
│  AI 认为你是                              │
│  {ai_identity}                            │
│  (字体: 13px, color: #EDEDEF, 加粗)       │
│                                           │
│  你自称是                                  │
│  {brand_self_identity}                    │
│  (字体: 12px, color: #9A9AB0)             │
│                                           │
│  认知差距                                  │
│  {gap_description}                        │
│  (字体: 11px, 背景: 浅蓝底, 左侧蓝色竖线)  │
├──────────────────────────────────────────┤
│  AI 看到的优势                             │
│  [tag] [tag] [tag]  ← ai_strengths        │
│  绿色标签: rgba(34,197,94,0.08)背景       │
│                                           │
│  AI 看到的劣势                             │
│  [tag] [tag] [tag]  ← ai_weaknesses       │
│  红色标签: rgba(239,68,68,0.08)背景       │
│                                           │
│  AI 不知道的                               │
│  [tag] [tag] [tag]  ← blind_spots         │
│  灰色标签: rgba(255,255,255,0.04)背景     │
└──────────────────────────────────────────┘
```

### 边界
如果 `b_class_perception` 为空 → 模块不显示

---

## Module 4: 三层诊断链

### 数据源
`three_layer_chain.observation` + `.explanation` + `.implication`

### 保持当前实现
当前海老实现已正确展示三步卡片 + 箭头连接，背景色随严重度变化。
不做改动，保留现有代码。

---

## Module 5: 竞品分析

### 数据源
优先 `c_class_matrix`，回退 `competitor_gap`

### c_class_matrix 展示

```
竞品对比    {wins}胜 · {losses}负 · {ties}平

赢在: {winning_dimensions.map(d => <tag>{d}</tag>)}
输在: {losing_dimensions.map(d => <tag>{d}</tag>)}

关键洞察: {key_insight}
```

### competitor_gap 展示（回退）

```
赢在: {winning_dimensions.map(d => d.dimension)}  (有gap数值则显示)
输在: {losing_dimensions.map(d => d.dimension)}   (有gap/qualitative则显示)

根因: {root_cause}
对策: {counter_strategy}
```

### 保持当前实现
当前海老实现的胜负条 + 维度列表逻辑正确，保留。

---

## Module 6: 行动指南

### 数据源
`actions[]` (全部，不只前3条) + `content_templates` (全部)

### actions 展示

```
{actions.map((a, i) => (
  <div>
    <span className="priority-tag">{a.priority}</span>
    <span className="action-title">{a.action}</span>
    {a.rationale && <p>{a.rationale}</p>}
    {a.action_steps?.length > 0 && (
      <ol>{a.action_steps.map((s, j) => <li key={j}>{s}</li>)}</ol>
    )}
    <div className="meta">
      {a.expected_impact && <span>预期: {a.expected_impact}</span>}
      {a.estimated_time && <span>时间: {a.estimated_time}</span>}
      {a.estimated_cost && <span>成本: {a.estimated_cost}</span>}
      {a.evidence_source && <span>来源: {a.evidence_source}</span>}
    </div>
  </div>
))}
```

### content_templates 展示

```
SEO 文案模板

{[
  {key: "page_title", label: "Page Title"},
  {key: "meta_description", label: "Meta Description"},
  {key: "about_us_opening", label: "About Us 开篇"},
  {key: "social_bio", label: "社媒 Bio"},
].filter(f => contentTemplates[f.key]).map(f => (
  <div>
    <span>{f.label}</span>
    <button onClick={copy}>复制</button>
    <p>{contentTemplates[f.key]}</p>
  </div>
))}

强调关键词: {keywords_to_emphasize.map(kw => <tag>{kw}</tag>)}
避免关键词: {keywords_to_avoid.map(kw => <tag>{kw}</tag>)}
优先行动: {key_content_action}
```

### 注意
如果 `actions[]` 为空（Analyst 不生成 actions，由 Doctor 生成），则 actions 卡片区隐藏，只展示 content_templates。

### 底部 CTA
```
[查看完整处方 → Doctor]
onClick={onViewDoctor}
```

---

## 样式规范

```
背景: #0A0A0F
卡片: #131318, border: 1px solid rgba(255,255,255,0.04), border-radius: 8px
标题: 10px, font-mono, tracking-[0.15em], uppercase, color: rgba(59,130,246,0.4)
正文: 12px, color: #9A9AB0
数字: font-mono, color: #EDEDEF
模块间距: gap-8
进入动画: Framer Motion opacity + y:16 → 0, duration 0.5s, delay 递增 0.1s
```

---

## 边界处理

| 场景 | 行为 |
|------|------|
| `engine_comparison` 为空 | M2 显示"升级解锁多引擎对比分析" |
| `b_class_perception` 为空 | M3 不渲染 |
| `three_layer_chain` 全空 | M4 不渲染 |
| `hasCompetitorData` false | M5 显示"升级解锁竞品对比分析" |
| `!hasActionModule` | M6 不渲染，底部仍显示 Doctor CTA |
| `actions[]` 为空 | M6 只展示 content_templates 部分 |
| `content_templates` 为空 | M6 只展示 actions 部分 |

---

## 验证方法

```bash
cd ~/Desktop/CiteFlow && source .venv/bin/activate

# 1. 确认后端数据存在
python3 -c "
import json
# 跑一次完整扫描后，检查 analyst_output 包含所有字段
# 或用已有数据测试
"

# 2. 浏览器验证
# 访问 http://localhost:3000/scan → 完成 Full 扫描 → 进入 Analyst
# 检查: 6 个模块全部渲染
```

### 浏览器 console 自检

```javascript
(() => {
  const result = {};
  result.hasM1 = !!document.querySelector('[class*="diagnosis"]') || document.body.textContent.includes('核心问题');
  result.hasM2 = document.body.textContent.includes('ChatGPT') && document.body.textContent.includes('Gemini');
  result.hasM3 = document.body.textContent.includes('AI 认为你是') || document.body.textContent.includes('认知差距');
  result.hasM4 = document.body.textContent.includes('数据层') && document.body.textContent.includes('解释层');
  result.hasM5 = document.body.textContent.includes('竞品') && (document.body.textContent.includes('胜') || document.body.textContent.includes('wins'));
  result.hasM6 = document.body.textContent.includes('Doctor') || document.body.textContent.includes('处方');
  result.hasEngineInsights = document.body.textContent.includes('洞察') || document.body.textContent.includes('建议');
  result.hasBClass = document.body.textContent.includes('ai_identity') === false; // 不应出现原始字段名
  result.hasActions = document.body.textContent.includes('P0') || document.body.textContent.includes('P1');
  result.allSixModules = result.hasM1 && result.hasM2 && result.hasM3 && result.hasM4 && result.hasM5 && result.hasM6;
  return JSON.stringify(result, null, 2);
})()
```

预期 `allSixModules: true`。

---

## 不需要改的文件

- `analyst_prompt.py` — Prompt 不变
- `analyst_node.py` — 节点逻辑不变
- `state.py` — AnalystOutput 结构不变
- `api.py` — API 透传不变
- `scan-sidebar.tsx` — 侧边栏不变
- `scan-analyst-briefing.tsx` — Briefing 播报不变

## 决策记录（2026-05-22）

### 决策 1: actions[] → 接受为空，M6 专注 content_templates
**不改 prompt。** Analyst 诊断 / Doctor 处方分离是故意的架构设计。
M6 = content_templates 完整展示 + Doctor 桥接按钮。不展示 actions 卡片。

### 决策 2: 区分"暂无数据"和"升级解锁"
| 场景 | 文案 | CTA |
|------|------|-----|
| Light 模式无多引擎数据 | "当前扫描未包含此数据" | "重新完整扫描 →" |
| 爬取失败无 b_class_perception | "官网内容获取失败" | 无按钮 |
| 无竞品数据 | "暂无竞品数据 · 请添加竞品后重新扫描" | 无按钮 |

---

## 注意事项

- **不要删 radar-chart.tsx** — 保留雷达图组件（M1 评分子卡可能用到）
- **旧版 scan-analyst-report.tsx 可以删除** — 完全重写，不留旧代码
- **actions[] 不再展示** — 架构上由 Doctor 生成，Analyst 不产出
- **b_class_perception 子字段 key 是英文** — ai_identity / brand_self_identity / gap_description / ai_strengths / ai_weaknesses / blind_spots
- **engine_comparison.per_engine 的 key 是小写** — "gpt" / "gemini" / "haiku"，不是 "ChatGPT"
- **每模块判空后再渲染** — 空数据不显示该模块，区分"暂无数据"和"需升级"两种空态
- **Props 新增 mode** — 需要 `mode?: "light" | "full"` 来区分空态原因
