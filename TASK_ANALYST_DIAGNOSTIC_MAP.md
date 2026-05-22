# TASK_ANALYST_DIAGNOSTIC_MAP.md — Analyst 品牌诊断地图
> 药老出品 · 2026-05-21
> 目标: 把 Analyst 报告从文字 Tab 升级为可视化诊断地图
> 预计工时: 6h

## 任务概览

| # | 任务 | 文件 | 类型 |
|---|------|------|------|
| 1 | 雷达图组件 | components/radar-chart.tsx | 新建 |
| 2 | 诊断地图主页面 | components/scan-analyst-report.tsx | 重写 |
| 3 | 状态机接入 | app/(app)/scan/page.tsx | 小改 |
| 4 | 验证 | 浏览器全流程测试 | 测试 |

## 产品定位

Analyst = **品牌诊断地图**（理解导向），不是一次性报告。

用户心智："我的品牌在 AI 眼里到底是什么样"

与 Doctor 的关系：
- Doctor = 治疗方案（P0/P1/P2 清单）→ 行动
- Analyst = 化验单解读（全景诊断）→ 理解
- Doctor 每条处方底部链接回 Analyst 对应维度

---

## 任务 1: 雷达图组件

### 文件
`/Users/fogn/Desktop/CiteFlow/frontend/components/radar-chart.tsx`

### 接口

```typescript
interface RadarChartProps {
  dimensions: { name: string; score: number; maxScore?: number }[];
  size?: number;
}
```

### 实现要求

1. **纯 SVG，不引入第三方库。**
2. **动态 N 边形**：从 `dimensions[]` 直接取，3个画三角形，6个画六边形。每个维度的 name 和 score 直接渲染。
3. 正 N 边形背景（灰色参考线 20/40/60/80/100）
4. 数据区域用半透明填充 + 描边
5. 每根轴上标注维度名 + 分数（如 "内容力 55"）；边数多时标签挤就缩小字号
6. 动画：mounted 时从 0 缩放到实际值（Framer Motion）
7. Light 模式 dimensions 为空时整个雷达图区域显示"升级解锁完整诊断"

### SVG 布局参考

```
N 边形顶点坐标（半径 r，圆心 cx,cy，角度从 -90° 开始）：

for i in 0..N-1:
  angle = -PI/2 + i * 2*PI/N
  x = cx + r * cos(angle)
  y = cy + r * sin(angle)
```

### 颜色规范

```
参考线: rgba(255,255,255,0.06)
参考标签: #5E5E78, font-size 9px, font-mono
数据填充: rgba(59,130,246,0.12)  ← #3B82F6 at 12% opacity
数据描边: #3B82F6, stroke-width 1.5
维度名: #9A9AB0, font-size 10px
分数: #EDEDEF, font-size 11px, font-mono
```

---

## 任务 2: 诊断地图主页面

### 文件
`/Users/fogn/Desktop/CiteFlow/frontend/components/scan-analyst-report.tsx`

### 当前状态
4-Tab 文字报告（诊断报告/竞品战场/引擎情报/AI认知）→ **全部重写**

### 新设计：单页滚动，四个模块

```
┌──────────────────────────────────────────────┐
│  Analyst · 品牌诊断地图     [查看 Doctor →]   │
│                                               │
│  ┌─────────────┐  ┌───────────────────────┐  │
│  │  综合评分     │  │     雷达图             │  │
│  │   59/100     │  │                        │  │
│  │   严重       │  │   品牌力65  产品力70    │  │
│  │              │  │   内容力55  技术力45    │  │
│  │  提及率 44%  │  │   市场力60              │  │
│  │  引用率 0%   │  │                        │  │
│  │  A类推荐 0%  │  │   点击维度展开证据      │  │
│  │  C类推荐 0%  │  │                        │  │
│  └─────────────┘  └───────────────────────┘  │
│                                               │
│  ┌───────────────────────────────────────┐   │
│  │  三层诊断链                             │   │
│  │  ● 数据  ● 解释  ● 影响                │   │
│  │  A类引用率0%  缺乏结构化数据  流量归零  │   │
│  └───────────────────────────────────────┘   │
│                                               │
│  ┌───────────────────────────────────────┐   │
│  │  竞品矩阵  C类查询胜负                  │   │
│  │  维度    Lilysilk  Blissy  Fishers     │   │
│  │  材质      ●        ○        ●         │   │
│  │  价格      ○        ●        ○         │   │
│  └───────────────────────────────────────┘   │
│                                               │
│  ┌───────────────────────────────────────┐   │
│  │  内容改造指南                           │   │
│  │  P0 · FAQ 结构化数据                   │   │
│  │  页面: /products 底部                  │   │
│  │  [复制 JSON-LD 模板]                    │   │
│  │  P1 · 权威媒体评测                     │   │
│  │  [复制邮件模板] → 进入 Doctor 看全部   │   │
│  └───────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### Props 接口（保持与旧版兼容）

```typescript
interface ScanAnalystReportProps {
  data: any;                     // 包含 analyst_output + probe 数据
  onBackToBriefing: () => void;  // 返回 briefing（保留）
  onViewDoctor: () => void;      // 跳转 Doctor（保留）
}
```

### Module 1: 评分 + 指标卡 + 雷达图

**数据源**：
```
综合评分 = data.probe?.company_score?.overall || 0
严重度 = data.diagnosis?.severity  // "critical" | "warning" | "healthy"
四指标 = data.probe?.citation_metrics 里的 mention_rate / industry_rate / a_recommendation_rate / c_recommendation_rate
五维度 = data.probe?.company_score?.dimensions[]  // [{name, score, evidence, suggestion}]
```

**交互**：点击雷达图某个维度 → 展开该维度的 evidence + suggestion 卡片

**颜色**：
```
critical → #EF4444
warning → #F59E0B
healthy → #22C55E
```

### Module 2: 三层诊断链

**数据源**：
```
data.three_layer_chain = { observation, explanation, implication }
```

**展示**：横向三步条，每步一个卡片。
- 数据层（左）：图标 + observation 一句话
- 解释层（中）：图标 + explanation 一句话
- 影响层（右）：图标 + implication 一句话

三步之间用箭头连接。颜色按严重度变化（critical 红色系，warning 黄色系，healthy 绿色系）。

### Module 3: 竞品对比

**数据源**（不改后端，用 LLM 实际返回的结构）：
```
// 优先用 c_class_matrix（Analyst 产出）：
c_class_matrix = {
  total_comparisons, wins, losses, ties,
  winning_dimensions: ["开发者体验", "API文档质量"],   // string[]
  losing_dimensions: ["行业权威背书", "企业信任度"],    // string[]
  key_insight: "品牌在技术维度领先竞品，但..."
}

// 回退到 competitor_gap（Probe 产出，Light 模式可用）：
competitor_gap = { winning_dimensions[], losing_dimensions[], root_cause, counter_strategy }
```

如果 c_class_matrix 为 null，回退到 competitor_gap。

**展示**：胜负条风格（不改数据格式，只做视觉升级）

```
竞品对比 · C类查询
┌─────────────────────────────────────┐
│  3胜  │  4负  │  1平               │
│  ████████████░░░░░░░░░░░░░░░░░░░░  │
│                                     │
│  你赢在：开发者体验、API文档质量     │
│  你输在：行业权威背书、企业信任度    │
│                                     │
│  关键洞察：你需要更强的第三方背书，   │
│  而非更好的产品文档                  │
└─────────────────────────────────────┘
```

赢用蓝色 #3B82F6，输用红色 #EF4444，平用黄色 #F59E0B。

### Module 4: 内容改造建议

**数据源**（不改后端，用 LLM 实际返回的 SEO 文案字典）：
```
// 优先用 content_templates（Analyst 产出）：
content_templates = {
  page_title, meta_description, about_us_opening, social_bio,
  keywords_to_emphasize: ["enterprise-grade", ...],
  keywords_to_avoid: ["cheap", "discount", ...],
  key_content_action: "把About Us首页从..."
}

// 回退到 actions[] 前3条（Probe 产出，但 actions 在 Analyst 里）
```

如果 content_templates 为 null，回退到 actions[]（ActionItem[]）的前 3 条。

**展示**：SEO 文案 key-value 预览 + 一键复制

```
AI 内容改造建议
┌─────────────────────────────────────┐
│  Page Title                         │
│  "Lilysilk: Premium Silk ..."      │  [复制]
│  Meta Description                   │
│  "Discover Lilysilk's ..."         │  [复制]
│  About Us 开篇                      │
│  "Founded in 2010, Lilysilk ..."   │  [复制]
│  ...                                │
│                                     │
│  强调关键词：sustainable silk, ...  │
│  避免关键词：cheap, discount, ...   │
└─────────────────────────────────────┘
```

每条文案右侧有 [复制] 按钮，点击复制到剪贴板 + toast 提示。

底部 CTA：`[查看完整处方 → 进入 Doctor]` 调用 `onViewDoctor()`

### 整体样式

```
背景: #0A0A0F
卡片: #131318, border 1px solid rgba(255,255,255,0.04), border-radius 8px
标题: font-size 14px, font-weight 600, #EDEDEF, font-mono tracking-wider
正文: font-size 12px, #9A9AB0
数字: font-mono, font-size 18px, #EDEDEF
间距: gap-6 between modules
过渡: Framer Motion opacity + y:16 → 0, duration 0.5s
```

### 边界处理

- **Light 模式数据缺失**：
  - 引擎情报/AI认知 → 不显示 Module 3/4，或显示"升级解锁"
  - 竞品矩阵 → 如果有 competitor_mentions 就用简版，否则显示"升级解锁"
  - 内容模板 → 如果 actions[] 为空，显示"升级解锁"
- **加载态**：opacity 动画 fade in
- **空数据**：显示 "暂无诊断数据，请先完成 Probe 扫描"

---

## 任务 3: 状态机接入

### 文件
`/Users/fogn/Desktop/CiteFlow/frontend/app/(app)/scan/page.tsx`

### 改动

当前 `ScanAnalystReport` 在 `analystPhase === "report"` 时渲染。重写后组件接口不变（`data`, `onBackToBriefing`, `onViewDoctor`），**page.tsx 不需要改动**。

仅需确认：`data` 对象中包含了 `three_layer_chain` / `c_class_matrix` / `content_templates` 等字段。如果 API 没有返回这些字段，需检查 `api.py` 的 Analyst 返回结构。

### 需要同步检查的文件
`/Users/fogn/Desktop/CiteFlow/api.py` — 确认 `/api/scan/{scan_id}` 返回中是否包含 analyst_output 的完整字段。

搜索关键词：
```
analyst_output, three_layer_chain, c_class_matrix, content_templates
```

如果 API 未透传这些字段，需补上。

---

## 不需要改的文件

- `scan-analyst-briefing.tsx` — briefing 流程不变
- `probe-briefing.tsx` — Probe briefing 不变
- `scan-sidebar.tsx` — 侧边栏不变
- 后端 `analyst_node.py` — 数据生产不变
- 后端 `state.py` — AnalystOutput 结构不变

---

## CHECKLIST 自检

### 代码质量
- [ ] radar-chart.tsx 纯 SVG，无第三方依赖
- [ ] scan-analyst-report.tsx 无 console.log 残留
- [ ] 无 TypeScript 编译错误
- [ ] 颜色/字体/间距与设计规范一致
- [ ] Framer Motion 动画流畅

### 功能完整性
- [ ] 四个模块全部渲染（评分+雷达/三层链/竞品矩阵/内容模板）
- [ ] 雷达图五个维度正确标注 + 数据区域填充
- [ ] 三层链三步有箭头连接
- [ ] 竞品矩阵 ●/○ 展示赢/输
- [ ] 复制模板按钮可用，点击有 toast 提示
- [ ] "进入 Doctor" CTA 正常跳转
- [ ] Light 模式缺失字段有"升级解锁"占位

### 向后兼容
- [ ] onBackToBriefing / onViewDoctor 回调正常
- [ ] 旧版报告历史仍可查看
- [ ] 浏览器 console 无红色报错

---

## 验证方法

```bash
cd ~/Desktop/CiteFlow/frontend && npm run dev
```

1. 浏览器访问 `http://localhost:3000/scan`
2. 登录 test@citeflow.com / test1234
3. 完成一次 Probe full scan（或加载已有报告历史）
4. 点侧边栏 "Analyst 诊断师"
5. 确认四个模块完整渲染
6. 检查 browser_console 无错误
7. 点"进入 Doctor"确认跳转

### 浏览器 console 自检代码

```javascript
// 在 Analyst 报告页执行
(() => {
  const result = {};
  result.hasRadar = !!document.querySelector('svg circle, svg polygon');
  result.hasScore = document.body.textContent.includes('综合评分');
  result.hasMentionRate = document.body.textContent.includes('提及率');
  result.hasCiteRate = document.body.textContent.includes('引用率');
  result.hasThreeLayer = document.body.textContent.includes('三层诊断');
  result.hasCompetitorMatrix = document.body.textContent.includes('竞品矩阵');
  result.hasContentTemplates = document.body.textContent.includes('内容改造');
  result.hasDoctorCTA = document.body.textContent.includes('Doctor');
  return JSON.stringify(result, null, 2);
})()
```

预期全部 true。

---

## 注意事项

- **不要删 scan-analyst-briefing.tsx** — briefing 播报流程保留
- **不要引入 chart.js / recharts 等重型库** — 雷达图手动 SVG
- **不要改 sidebar 导航结构** — Analyst step 已存在
- **content_templates 字段需先验证 API 是否返回** — 如果 API 没有，先改 api.py 透传
- **c_class_matrix 结构需验证** — 可能与文档描述不同，先读实际 JSON 再写渲染逻辑
- **Light 模式升级提示不要过于焦虑** — "升级解锁完整诊断地图"而非红色警告
