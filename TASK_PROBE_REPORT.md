# TASK_PROBE_REPORT.md — Probe侦察兵报告页

> 药老出品 · 2026-05-16 · 海老修订 2026-05-17
> 目标: Probe侦察兵的完整报告页面，展示10大数据模块
> 预计工时: 6-8小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 主组件（6 section + 侧导航 + CTA） | 新建 components/scan-probe-report.tsx | 4h |
| 2 | 接线到 scan/page.tsx Tab 2 | 修改 app/(app)/scan/page.tsx | 0.5h |
| 3 | 自检 + 调优 | — | 1.5h |

**完成标准**: 从侦察中(Tab 1)跳转到侦察报告(Tab 2) → 6个section完整展示 → 侧导航可跳转 → CTA触发升级弹窗

---

## 设计系统（与 probe-loading 统一）

### 色彩规范
```css
--bg-primary: #08080D;
--bg-card: #0D0D15;
--bg-surface: rgba(255,255,255,0.02);
--bg-elevated: rgba(255,255,255,0.04);
--border: rgba(255,255,255,0.06);
--border-accent: rgba(56,189,248,0.14);
--text-primary: #EDEDF5;
--text-secondary: #9A9AB0;
--text-muted: #5E5E78;
--accent: #38BDF8;
--accent-subtle: rgba(56,189,248,0.10);
--success: #22C55E;
--error: #EF4444;
--warning: #F59E0B;
```

### 字体规范
- 正文：DM Sans, system-ui, sans-serif, 14px
- 数字/数据：JetBrains Mono, monospace
- 标签：10px, mono, tracking-0.15em, uppercase, muted色
- 评分大数字：JetBrains Mono, 48px, font-light

---

## 布局：左导航 + 右内容

```
┌──┬──────────────────────────────────────────────────────────┐
│导│  SECTION 1 — 综合评分                                     │
│航│  ┌────────────────────────────────────────────────────┐  │
│栏│  │              62/100              ████████░░░░░░░░  │  │
│  │  │  5维度卡片 品牌力75 产品力68 内容力55 技术力60    │  │
│  └──┤                                                      │  │
│ 1  │  SECTION 2 — AI认知画像                               │  │
│ 综 │  ┌──────────────────┐ ┌──────────────────┐          │  │
│ 合 │  │ AI怎么描述你     │ │ AI理想描述       │          │  │
│ 评 │  │ "..."            │ │ "..."            │          │  │
│ 分 │  └──────────────────┘ └──────────────────┘          │  │
│  │  │  优势标签  劣势标签  关键词云  定位                 │  │
│ 2  │                                                      │  │
│ A  │  SECTION 3 — 认知差距                                 │  │
│ I  │  对齐度70 对齐项/偏差项/盲点/机会                     │  │
│ 认 │                                                      │  │
│ 知 │  SECTION 4 — 引擎对比                                  │  │
│  │  │  ChatGPT  │  Gemini   │  Claude    │               │  │
│ 3  │  │  引用率   │  引用率   │  引用率    │               │  │
│ 认 │  │  A/B/C分类引用率                                  │  │
│ 知 │                                                      │  │
│ 差 │  SECTION 5 — 竞品战场                                  │  │
│ 距 │  场景对比表（可展开维度）                              │  │
│  │                                                      │  │
│ 4  │  SECTION 6 — 数据溯源                                  │  │
│ 引 │  来源权威度表 + 引用明细表                             │  │
│ 擎 │                                                      │  │
│  │  ┌────────────────────────────────────────────────────┐  │
│ 5  │  │ CTA：解锁诊断报告 + 处方    [升级解锁]           │  │
│ 竞 │  └────────────────────────────────────────────────────┘  │
│ 品 │                                                      │  │
│  │                                                      │  │
│ 6  │                                                      │  │
│ 溯 │                                                      │  │
│ 源 │                                                      │  │
└──┴──────────────────────────────────────────────────────────┘
```

### 侧导航
- 固定在左侧，宽度 ~56px（收起）/ ~160px（展开）
- 每项：图标 + 短标签 + 当前section高亮
- 点击滚动到对应 section（scrollIntoView + smooth）
- 当前可见 section 自动高亮（IntersectionObserver）

---

## 组件结构（单文件）

```
scan-probe-report.tsx
├── Props: { data, domain, brandName, onUpgradeClick, onBack }
├── NavBar          — 左侧导航（6项 + 顶部品牌名）
├── Section1        — 综合评分（总分 + 5维度）
├── Section2        — AI认知画像（描述 + 优势/劣势 + 理想描述 + 关键词 + 定位）
├── Section3        — 认知差距（对齐度 + 对齐/偏差/盲点/机会 + 公司评估）
├── Section4        — 引擎对比（三引擎卡片 + A/B/C分类引用率）
├── Section5        — 竞品战场（场景对比表 + 维度展开）
├── Section6        — 数据溯源（来源权威度 + 引用明细）
├── CTA             — 升级解锁入口
├── EmptySection    — 数据为空时的兜底组件
└── SectionLabel    — 统一的section标题组件
```

---

## SECTION 1: 综合评分

### 数据来源
`probe.company_score`

### 实现要求
1. **总评分大数字**：JetBrains Mono 48px，颜色根据分数变化
```typescript
function scoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#38BDF8";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}
```
2. **进度条**：4px高，背景 rgba(255,255,255,0.06)，填充色跟随分数
3. **维度卡片**：遍历 `company_score.dimensions`（数量由数据决定，不写死），每个卡片显示维度名+分数+进度条
4. **可展开**：点击维度卡片展开 evidence 和 suggestion
5. **空数据**：如果 `company_score` 为 null/undefined，显示 EmptySection

---

## SECTION 2: AI认知画像

### 数据来源
`probe.market_perception` + `probe.ai_narrative`

### 实现要求
1. AI描述卡片（perceived_identity）
2. 优势/劣势左右分栏，优势绿色标签，劣势红色标签
3. AI理想描述卡片（ai_narrative.ideal_description，带引号样式）
4. 关键词：标签云，蓝色标签
5. AI定位（perceived_positioning）
6. **空数据**：两个数据源都可能为 null，分别判断

---

## SECTION 3: 认知差距

### 数据来源
`probe.gap_report` + `probe.company_evaluation`

### 实现要求
1. 对齐度大数字+进度条+一句话总结（one_line_summary）
2. 对齐项/偏差项左右分栏，绿色/红色标签
3. 盲点/机会左右分栏，黄色/蓝色标签
4. 公司评估卡片（overall + strengths + weaknesses + positioning）
5. **空数据**：gap_report 或 company_evaluation 为 null 时显示 EmptySection

---

## SECTION 4: 引擎对比

### 数据来源
`probe.engine_results` + `probe.citation_metrics`

### 实现要求
1. 引擎卡片：遍历 `engine_results` 的 keys（gpt/gemini/haiku），数量不写死
2. 引擎显示名映射：`{ gpt: "ChatGPT", gemini: "Gemini", haiku: "Claude" }`
3. 每卡片显示：引擎名、引用率、推荐率
4. 可展开查看原文片段（raw_data.answers）
5. A/B/C类引用率：从 citation_metrics 读 industry_rate / brand_rate / competitor_scenario_rate
6. **空数据**：engine_results 为空对象时显示 EmptySection

---

## SECTION 5: 竞品战场

### 数据来源
`probe.competitor_analysis`

### 实现要求
1. 场景列表：遍历 competitor_analysis 数组（长度由数据决定）
2. 每行显示：query（截断50字）、winner、reason（截断80字）
3. winner颜色：包含品牌名=绿色(#22C55E)，tie=灰色(#9A9AB0)，其他品牌=红色(#EF4444)
4. 统计获胜场次（winner 包含当前品牌名的次数 / 总场次）
5. 可展开行查看 dimension_scores
6. **空数据**：competitor_analysis 为空数组时显示 EmptySection

---

## SECTION 6: 数据溯源

### 数据来源
`probe.source_authority` + `probe.citation_metrics.details`

### 实现要求
1. 来源权威度表：top_sources 遍历，显示域名、类型、权威度、提及次数
2. 来源多样性：分数+评级（>=0.7高 / >=0.4中 / <0.4低）
3. 引用明细表：citation_metrics.details 遍历（最多20条）
4. 每行：查询词（截断40字）、提及状态✓/✗、位置、来源域名
5. 可展开行查看 mention_context
6. **空数据**：两个数据源都可能为空

---

## CTA区域

固定在内容底部，不随导航滚动消失：

```
侦察报告已生成。你已看到AI怎么描述你的品牌、哪些竞品在抢你的位置。
但你还不知道为什么——以及怎么改。

┌─────────────────────────────────────────────┐
│ 解锁诊断报告 + 处方                          │
│ Analyst 诊断师：14条规则逐条检查，告诉你根因  │
│ Doctor 医师：P0/P1/P2任务清单，告诉你怎么改   │
│ [升级解锁]                                   │
└─────────────────────────────────────────────┘
```

- 定价从常量 `UPGRADE_PRICE` 读取（默认 "¥299/月"），不硬编码在 JSX 里
- 点击触发 `onUpgradeClick`

---

## EmptySection 兜底组件

```tsx
function EmptySection({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="p-6 text-center" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <p className="text-sm" style={{ color: "#5E5E78" }}>{title} — 暂无数据</p>
      <p className="text-xs mt-1" style={{ color: "#3A3A52" }}>{reason}</p>
    </div>
  );
}
```

---

## 公共组件

### SectionLabel
```tsx
function SectionLabel({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <div id={id} className="flex items-center gap-3 mb-5">
      <span className="block w-1 h-3 rounded-full shrink-0"
        style={{ background: "linear-gradient(180deg, #38BDF8 0%, rgba(56,189,248,0.15) 100%)" }} />
      <span className="text-[10px] font-mono tracking-[0.15em] uppercase"
        style={{ color: "rgba(56,189,248,0.50)" }}>
        {children}
      </span>
    </div>
  );
}
```

每个 section 的 SectionLabel 需要 `id` 属性，供侧导航 scrollIntoView 使用。

---

## scan/page.tsx 接线

不新增 step。Tab 2「侦察报告」直接渲染 ScanProbeReport：

```tsx
// Tab 2: 侦察报告
{activeTab === 2 && data?.probe && (
  <ScanProbeReport
    data={data}
    domain={scanDomain}
    brandName={scanBrandName}
    onUpgradeClick={() => setShowUpgradeModal(true)}
    onBack={() => setActiveTab(1)}
  />
)}
```

- Tab 2 在 probing 完成、data 有值时变为可点击
- 如果 data 为空，Tab 2 保持 disabled

---

## 验证方法

1. 从 Dashboard 进入 Probe 报告 → 6个 section + 侧导航全部显示
2. 侧导航点击 → 正确滚动到对应 section
3. 滚动页面 → 侧导航高亮跟随当前可见 section
4. Section 1 评分正确显示，维度卡片数量与数据一致
5. Section 2 AI认知画像有数据，优势/劣势标签正确
6. Section 3 对齐度正确，对齐项/偏差项/盲点/机会有数据
7. Section 4 引擎卡片数量与 engine_results keys 一致
8. Section 5 场景数量与 competitor_analysis 数组长度一致
9. Section 6 来源数量与 top_sources 数组长度一致
10. 数据为空的 section 显示 EmptySection 而非空白
11. CTA 按钮触发 UpgradeModal
12. 返回按钮回到 Tab 1

---

## CHECKLIST 自检

**Section 1 综合评分:**
- [ ] 总评分正确显示
- [ ] 维度卡片数量与数据一致
- [ ] 每个维度可展开 evidence 和 suggestion

**Section 2 AI认知画像:**
- [ ] perceived_identity 有数据或显示 EmptySection
- [ ] 优势/劣势标签正确
- [ ] ai_narrative 关键词显示

**Section 3 认知差距:**
- [ ] 对齐度正确
- [ ] 对齐项/偏差项/盲点/机会有数据
- [ ] company_evaluation 有数据

**Section 4 引擎对比:**
- [ ] 引擎卡片数量正确
- [ ] A/B/C类引用率正确
- [ ] 展开原文功能正常

**Section 5 竞品战场:**
- [ ] 场景数量与数据一致
- [ ] winner 颜色正确
- [ ] 获胜统计正确

**Section 6 数据溯源:**
- [ ] 来源数量与数据一致
- [ ] 引用明细表有数据
- [ ] 展开原文功能正常

**侧导航:**
- [ ] 6 项全部可点击跳转
- [ ] 滚动高亮跟随

**CTA:**
- [ ] 升级按钮触发 UpgradeModal

---

## 交付格式

```
自检结果: X/3 S1 + X/3 S2 + X/3 S3 + X/3 S4 + X/3 S5 + X/3 S6 + X/2 Nav + X/1 CTA = XX/21
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. 不要改 scan-dashboard.tsx（Dashboard 保持不变）
2. 不要改 scan-result.tsx（Light 报告页保持不变）
3. 引擎原始 key: `gpt / gemini / haiku`，显示名映射为 `ChatGPT / Gemini / Claude`
4. 所有数字用 JetBrains Mono 字体
5. 展开/收起动画用 Framer Motion，duration 0.3s
6. 单文件实现，内部用注释分界各 section
7. 背景色 #08080D，与 probe-loading 统一
8. 所有数组/列表长度由数据决定，不写死数字
