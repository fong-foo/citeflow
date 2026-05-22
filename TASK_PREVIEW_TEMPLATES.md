# TASK_PREVIEW_TEMPLATES.md — 锁定模块预览改为写死示例模板

> 药老出品 · 2026-05-18
> 目标: 锁定模块的预览弹窗展示写死的示例模板，让用户知道付费后能看到什么结构
> 预计工时: 2-3小时

---

## 任务概览

| # | 任务 | 文件 | 工时 |
|---|------|------|------|
| 1 | 修改5个模块的预览配置为写死示例 | scan-dashboard.tsx | 1.5h |
| 2 | 修改 PreviewModal 支持模板展示 | preview-modal.tsx | 1h |
| 3 | 验证预览效果 | 手动测试 | 0.5h |

**完成标准**: 免费用户点击锁定模块 → 弹窗展示写死的示例模板 → 用户知道付费后能看到什么

---

## 背景

### 问题
当前预览弹窗展示的是真实数据的部分内容，但：
- 真实数据可能不完整/不准
- 用户看不懂部分数据的含义
- 预览没有起到"让用户知道付费后能看到什么"的作用

### 解决方案
预览改为**写死的示例模板**，展示功能的完整结构，不带真实数据。

---

## 任务1: 修改5个模块的预览配置

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 5个模块的示例模板

**1. AI认知画像**

```tsx
ai_perception: {
  id: "ai_perception",
  title: "AI认知画像",
  description: "了解 AI 搜索引擎如何描述你的品牌，以及你应该被如何描述。",
  features: [
    "AI 怎么描述你的品牌（实际输出）",
    "AI 理想中你应该是什么形象",
    "你的品牌关键词是什么",
    "你的品牌调性是什么",
  ],
  previewTemplate: {
    type: "ai_perception",
    data: {
      aiDescription: "Flower Knows 是一个专注于环保手机壳的品牌，主打可持续生活方式，目标客户是关注环保的年轻消费者。",
      idealDescription: "一个在AI搜索中被频繁引用的环保手机壳品牌，以创新设计和可持续材料著称，被推荐为环保消费者的首选。",
      keywords: ["环保手机壳", "可持续", "生物降解", "创新设计", "年轻消费者"],
      tone: "专业、环保、创新、年轻",
    },
  },
  price: "¥50/次",
  priceDetail: "包含：AI认知画像 + 引擎对比 + 认知差距",
},
```

**2. 引擎对比**

```tsx
engine_comparison: {
  id: "engine_comparison",
  title: "引擎对比 · 交叉验证",
  description: "对比 ChatGPT、Gemini、Claude 三大 AI 引擎对你的引用情况。",
  features: [
    "各引擎的引用率对比",
    "各引擎的推荐率对比",
    "各引擎的来源偏好",
    "引擎差异分析",
  ],
  previewTemplate: {
    type: "engine_comparison",
    data: {
      engines: [
        { name: "ChatGPT", citationRate: 25, recommendationRate: 12, topSources: ["reddit.com", "amazon.com"] },
        { name: "Gemini", citationRate: 20, recommendationRate: 10, topSources: ["trustpilot.com", "youtube.com"] },
        { name: "Claude", citationRate: 22, recommendationRate: 11, topSources: ["reddit.com", "g2.com"] },
      ],
      insight: "ChatGPT 引用率最高，但推荐率偏低；Gemini 偏好评测平台；Claude 来源最均衡。",
    },
  },
  price: "¥50/次",
  priceDetail: "包含：AI认知画像 + 引擎对比 + 认知差距",
},
```

**3. 认知差距**

```tsx
gap_report: {
  id: "gap_report",
  title: "认知差距",
  description: "对比品牌自述与 AI 认知的差距，找到改进方向。",
  features: [
    "品牌自述 vs AI 认知的对齐度",
    "具体差距分析",
    "改进建议",
  ],
  previewTemplate: {
    type: "gap_report",
    data: {
      alignmentScore: 45,
      aligned: ["品牌定位清晰", "核心产品明确"],
      misaligned: ["AI 认为你是'便宜货'，但你想做'高端环保'", "AI 没有提到你的设计优势"],
      blindSpots: ["竞品在社交媒体上的提及率是你的3倍", "AI 搜索中几乎没有你的第三方评测"],
      summary: "品牌自述与 AI 认知存在较大差距，主要在品牌定位和产品优势两个维度。",
    },
  },
  price: "¥50/次",
  priceDetail: "包含：AI认知画像 + 引擎对比 + 认知差距",
},
```

**4. 诊断摘要（Analyst）**

```tsx
diagnosis: {
  id: "diagnosis",
  title: "Analyst 诊断师",
  description: "14条自研规则逐条诊断，定位根因，对比竞品差距。",
  features: [
    "品牌在 AI 搜索中的核心问题",
    "三层诊断链：数据→原因→影响",
    "竞品在哪些维度赢了你",
    "引擎对比洞察",
  ],
  previewTemplate: {
    type: "diagnosis",
    data: {
      verdict: "AI引用率显著低于品类平均水平，竞品在推荐结果中占据主导位置。",
      observation: "A类行业查询中品牌被引用率仅 25%，而竞品 Pela Case 达到 60%。",
      explanation: "官网内容与AI搜索查询意图存在语义缺口，品牌信息未有效触达AI模型。",
      implication: "若不修复，品牌在AI驱动的购买决策中将被竞品持续替代，市场份额逐步流失。",
      losingDimensions: [
        { dimension: "环保可持续", competitor: "Pela Case", gap: 25 },
        { dimension: "品牌知名度", competitor: "Casetify", gap: 15 },
      ],
      winningDimensions: [
        { dimension: "设计感", competitor: "Pela Case", gap: 10 },
        { dimension: "性价比", competitor: "Casetify", gap: 20 },
      ],
    },
  },
  price: "¥299/月",
  priceDetail: "包含：诊断报告 + 处方执行步骤",
},
```

**5. 处方执行步骤（Doctor）**

```tsx
prescription: {
  id: "prescription",
  title: "Doctor 医师",
  description: "根据诊断结果生成 P0/P1/P2 任务清单，精确到页面和操作步骤。",
  features: [
    "P0/P1/P2 优先级任务清单",
    "每个任务精确到页面和操作步骤",
    "预期效果量化",
    "证据来源（论文支撑）",
  ],
  previewTemplate: {
    type: "prescription",
    data: {
      summary: "基于诊断结果，我们为您生成了 3 个优先级任务，预计执行后引用率可提升 15-20%。",
      items: [
        {
          priority: "P0",
          category: "技术优化",
          action: "优化官网产品页面",
          targetPage: "/products",
          whatToAdd: ["添加 Product 结构化数据", "优化 title 标签", "添加 meta description"],
          expectedImpact: "A类引用率从 25% 提升至 35-40%",
          evidence: "论文3，Section 2.1",
          timeline: "1-2周",
          difficulty: "中",
        },
        {
          priority: "P1",
          category: "权威建设",
          action: "增加第三方评测",
          targetPage: "Trustpilot, G2",
          whatToAdd: ["邀请客户写评价", "回复所有评价", "展示评价在官网"],
          expectedImpact: "推荐率从 12% 提升至 18-20%",
          evidence: "论文7，Section 3.2",
          timeline: "2-4周",
          difficulty: "中",
        },
        {
          priority: "P2",
          category: "社区运营",
          action: "Reddit/Quora 品牌提及",
          targetPage: "Reddit, Quora",
          whatToAdd: ["回答相关问题", "分享使用体验", "建立品牌社区"],
          expectedImpact: "来源多样性从 0.6 提升至 0.8",
          evidence: "论文12，Section 4.1",
          timeline: "4-8周",
          difficulty: "高",
        },
      ],
    },
  },
  price: "¥299/月",
  priceDetail: "包含：诊断报告 + 处方执行步骤",
},
```

---

## 任务2: 修改 PreviewModal 支持模板展示

### 需要改的文件
`frontend/components/preview-modal.tsx`

### 实现要求

修改 PreviewModal 组件，根据 `previewTemplate.type` 渲染不同的示例模板：

```tsx
export function PreviewModal({ isOpen, onClose, onUpgrade, module }: PreviewModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          {/* ... 保持现有代码 ... */}

          {/* 弹窗内容 */}
          <motion.div>
            <div>
              {/* 标题 */}
              <h3>{module.title}</h3>

              {/* 功能说明 */}
              <p>{module.description}</p>

              {/* 功能列表 */}
              <ul>
                {module.features.map((feature, i) => (
                  <li key={i}>✓ {feature}</li>
                ))}
              </ul>

              {/* 示例模板 */}
              {module.previewTemplate && (
                <div>
                  <p>📊 功能预览</p>
                  <PreviewTemplateRenderer template={module.previewTemplate} />
                  <p>⚠️ 以上为示例数据，升级后查看你的真实数据</p>
                </div>
              )}

              {/* 升级按钮 */}
              {/* ... 保持现有代码 ... */}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// 示例模板渲染器
function PreviewTemplateRenderer({ template }: { template: any }) {
  switch (template.type) {
    case "ai_perception":
      return <AIPerceptionTemplate data={template.data} />;
    case "engine_comparison":
      return <EngineComparisonTemplate data={template.data} />;
    case "gap_report":
      return <GapReportTemplate data={template.data} />;
    case "diagnosis":
      return <DiagnosisTemplate data={template.data} />;
    case "prescription":
      return <PrescriptionTemplate data={template.data} />;
    default:
      return null;
  }
}

// AI认知画像模板
function AIPerceptionTemplate({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          AI 怎么描述你
        </p>
        <p className="text-sm" style={{ color: "#C8C8D8" }}>{data.aiDescription}</p>
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          AI 理想描述
        </p>
        <p className="text-sm italic" style={{ color: "#C8C8D8" }}>"{data.idealDescription}"</p>
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          关键词
        </p>
        <div className="flex flex-wrap gap-1.5">
          {data.keywords.map((k: string, i: number) => (
            <span key={i} className="px-2 py-0.5 text-[10px]" style={{ background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.08)", color: "#7DD3FC" }}>
              {k}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// 引擎对比模板
function EngineComparisonTemplate({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {data.engines.map((engine: any, i: number) => (
        <div key={i} className="p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-sm font-medium mb-2" style={{ color: "#EDEDF5" }}>{engine.name}</p>
          <div className="flex gap-4 text-xs" style={{ color: "#9A9AB0" }}>
            <span>引用率：<span className="font-mono" style={{ color: "#38BDF8" }}>{engine.citationRate}%</span></span>
            <span>推荐率：<span className="font-mono" style={{ color: "#22C55E" }}>{engine.recommendationRate}%</span></span>
          </div>
          <p className="text-xs mt-1" style={{ color: "#5E5E78" }}>来源：{engine.topSources.join(", ")}</p>
        </div>
      ))}
      <div className="p-3" style={{ background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.08)" }}>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(245,158,11,0.5)" }}>
          洞察
        </p>
        <p className="text-sm" style={{ color: "#C8C8D8" }}>{data.insight}</p>
      </div>
    </div>
  );
}

// 认知差距模板
function GapReportTemplate({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          对齐度
        </p>
        <p className="text-2xl font-mono" style={{ color: "#F59E0B" }}>{data.alignmentScore}<span className="text-xs" style={{ color: "#5E5E78" }}>/100</span></p>
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(34,197,94,0.5)" }}>
          已对齐
        </p>
        {data.aligned.map((item: string, i: number) => (
          <p key={i} className="text-xs" style={{ color: "#22C55E" }}>✓ {item}</p>
        ))}
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(239,68,68,0.5)" }}>
          未对齐
        </p>
        {data.misaligned.map((item: string, i: number) => (
          <p key={i} className="text-xs" style={{ color: "#EF4444" }}>✗ {item}</p>
        ))}
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(245,158,11,0.5)" }}>
          盲点
        </p>
        {data.blindSpots.map((item: string, i: number) => (
          <p key={i} className="text-xs" style={{ color: "#F59E0B" }}>⚠ {item}</p>
        ))}
      </div>
    </div>
  );
}

// 诊断模板
function DiagnosisTemplate({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          一句话诊断
        </p>
        <p className="text-sm" style={{ color: "#C8C8D8" }}>{data.verdict}</p>
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          三层诊断链
        </p>
        <div className="space-y-1">
          <p className="text-xs" style={{ color: "#38BDF8" }}>观察：{data.observation}</p>
          <p className="text-xs" style={{ color: "#F59E0B" }}>解释：{data.explanation}</p>
          <p className="text-xs" style={{ color: "#EF4444" }}>影响：{data.implication}</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(239,68,68,0.5)" }}>
          失败维度
        </p>
        {data.losingDimensions.map((dim: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: "#EF4444" }}>
            {dim.dimension}（落后 {dim.competitor} {dim.gap} 分）
          </p>
        ))}
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(34,197,94,0.5)" }}>
          胜出维度
        </p>
        {data.winningDimensions.map((dim: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: "#22C55E" }}>
            {dim.dimension}（领先 {dim.competitor} {dim.gap} 分）
          </p>
        ))}
      </div>
    </div>
  );
}

// 处方模板
function PrescriptionTemplate({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(34,197,94,0.5)" }}>
          处方摘要
        </p>
        <p className="text-sm" style={{ color: "#C8C8D8" }}>{data.summary}</p>
      </div>
      {data.items.map((item: any, i: number) => (
        <div key={i} className="p-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${item.priority === "P0" ? "rgba(239,68,68,0.15)" : item.priority === "P1" ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)"}` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: "#EDEDF5" }}>{item.action}</p>
            <span className="text-xs px-2 py-0.5" style={{ background: item.priority === "P0" ? "rgba(239,68,68,0.1)" : item.priority === "P1" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)", color: item.priority === "P0" ? "#EF4444" : item.priority === "P1" ? "#F59E0B" : "#22C55E" }}>
              {item.priority}
            </span>
          </div>
          <p className="text-xs mb-1" style={{ color: "#5E5E78" }}>目标页面：{item.targetPage}</p>
          <p className="text-xs mb-1" style={{ color: "#5E5E78" }}>预期效果：{item.expectedImpact}</p>
          <p className="text-xs" style={{ color: "#5E5E78" }}>证据来源：{item.evidence}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 任务3: 验证预览效果

### 验证方法

**测试1: AI认知画像预览**
1. 用 free 用户登录
2. 进入仪表盘
3. 点击"AI认知画像"锁定模块
4. 弹窗应该展示：
   - 功能说明
   - 功能列表
   - 示例模板（AI描述、理想描述、关键词、调性）
   - "以上为示例数据"提示
   - 升级按钮

**测试2: 引擎对比预览**
1. 点击"引擎对比"锁定模块
2. 弹窗应该展示：
   - 三个引擎的引用率/推荐率示例
   - 来源示例
   - 洞察示例

**测试3: 认知差距预览**
1. 点击"认知差距"锁定模块
2. 弹窗应该展示：
   - 对齐度示例（45/100）
   - 已对齐/未对齐/盲点示例

**测试4: 诊断摘要预览**
1. 点击"诊断摘要"锁定模块
2. 弹窗应该展示：
   - 一句话诊断示例
   - 三层诊断链示例
   - 失败/胜出维度示例

**测试5: 处方执行步骤预览**
1. 点击"处方执行步骤"锁定模块
2. 弹窗应该展示：
   - 处方摘要示例
   - P0/P1/P2 任务示例
   - 每个任务的详细信息示例

---

## state.py 改动汇总

**不需要改后端！** 只是前端 UI 改动。

---

## CHECKLIST 自检

**任务1 [预览配置]:**
- [ ] AI认知画像预览配置改为写死示例
- [ ] 引擎对比预览配置改为写死示例
- [ ] 认知差距预览配置改为写死示例
- [ ] 诊断摘要预览配置改为写死示例
- [ ] 处方执行步骤预览配置改为写死示例

**任务2 [PreviewModal]:**
- [ ] PreviewTemplateRenderer 组件实现
- [ ] AIPerceptionTemplate 组件实现
- [ ] EngineComparisonTemplate 组件实现
- [ ] GapReportTemplate 组件实现
- [ ] DiagnosisTemplate 组件实现
- [ ] PrescriptionTemplate 组件实现
- [ ] "以上为示例数据"提示显示

**任务3 [验证]:**
- [ ] AI认知画像预览正确显示
- [ ] 引擎对比预览正确显示
- [ ] 认知差距预览正确显示
- [ ] 诊断摘要预览正确显示
- [ ] 处方执行步骤预览正确显示

---

## 交付格式

```
自检结果: X/5 任务1 + X/7 任务2 + X/5 任务3 = XX/17
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **示例数据要真实可信** — 不要编造离谱的数据，要用典型的行业数据
2. **示例数据要展示完整结构** — 让用户知道付费后能看到什么字段
3. **"以上为示例数据"提示要醒目** — 用黄色/橙色，让用户知道这不是真实数据
4. **升级按钮要醒目** — 用蓝色渐变，有阴影
5. **保持现有样式风格** — 用 inline style，不用 Tailwind

---

## 预期效果

### 免费用户点击"AI认知画像"

```
┌─────────────────────────────────────────────┐
│  AI认知画像                                   │
│                                             │
│  了解 AI 搜索引擎如何描述你的品牌，以及你应   │
│  该被如何描述。                               │
│                                             │
│  这个模块能告诉你                             │
│  ✓ AI 怎么描述你的品牌（实际输出）            │
│  ✓ AI 理想中你应该是什么形象                  │
│  ✓ 你的品牌关键词是什么                       │
│  ✓ 你的品牌调性是什么                         │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  📊 功能预览                                 │
│                                             │
│  AI 怎么描述你                               │
│  "Flower Knows 是一个专注于环保手机壳的品    │
│   牌，主打可持续生活方式..."                  │
│                                             │
│  AI 理想描述                                 │
│  "一个在AI搜索中被频繁引用的环保手机壳品牌..."│
│                                             │
│  关键词                                      │
│  [环保手机壳] [可持续] [生物降解] [创新设计] │
│                                             │
│  调性                                        │
│  专业、环保、创新、年轻                       │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  ⚠️ 以上为示例数据，升级后查看你的真实数据   │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  升级解锁 ¥50/次                     │    │
│  │  包含：AI认知画像 + 引擎对比 + 认知差距│    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [立即升级]  [稍后再说]                       │
└─────────────────────────────────────────────┘
```

### 免费用户点击"诊断摘要"

```
┌─────────────────────────────────────────────┐
│  Analyst 诊断师                              │
│                                             │
│  14条自研规则逐条诊断，定位根因，对比竞品差   │
│  距。                                         │
│                                             │
│  这个模块能告诉你                             │
│  ✓ 品牌在 AI 搜索中的核心问题                │
│  ✓ 三层诊断链：数据→原因→影响               │
│  ✓ 竞品在哪些维度赢了你                      │
│  ✓ 引擎对比洞察                              │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  📊 功能预览                                 │
│                                             │
│  一句话诊断                                 │
│  "AI引用率显著低于品类平均水平，竞品在推荐   │
│   结果中占据主导位置。"                      │
│                                             │
│  三层诊断链                                 │
│  观察：A类行业查询中品牌被引用率仅 25%      │
│  解释：官网内容与AI搜索查询意图存在缺口     │
│  影响：若不修复，品牌在AI搜索中被替代       │
│                                             │
│  失败维度                                   │
│  • 环保可持续（落后 Pela Case 25 分）       │
│  • 品牌知名度（落后 Casetify 15 分）        │
│                                             │
│  胜出维度                                   │
│  • 设计感（领先 Pela Case 10 分）           │
│  • 性价比（领先 Casetify 20 分）            │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  ⚠️ 以上为示例数据，升级后查看你的真实诊断  │
│                                             │
│  [升级解锁 ¥299/月]                         │
└─────────────────────────────────────────────┘
```
