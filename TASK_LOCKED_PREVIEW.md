# TASK_LOCKED_PREVIEW.md — 锁定模块预览弹窗 + 转化钩子

> 药老出品 · 2026-05-18
> 目标: 锁定模块可点击，弹窗展示模块价值 + 部分真实数据预览 + 升级按钮，提升免费用户到 Probe 的转化率
> 预计工时: 4-6小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 新增 PreviewModal 组件 | preview-modal.tsx | 2h |
| 2 | 修改 LockedSection 支持点击 | scan-dashboard.tsx | 1h |
| 3 | 设计6个模块的预览内容 | scan-dashboard.tsx | 1.5h |
| 4 | 验证弹窗效果 | 手动测试 | 0.5h |

**完成标准**: 免费用户点击锁定模块 → 弹窗展示模块价值 + 部分真实数据 + 升级按钮

---

## 背景

### 问题
当前锁定模块：
- 只是灰色/模糊的 mock 数据
- 用户不知道付费后能看到什么
- 没有"钩子"吸引用户付费
- 用户体验：「没收费就不给你看」

### 解决方案
锁定模块可点击 → 弹窗展示：
1. **功能说明**：这个模块能告诉你什么
2. **部分预览**：展示 1-2 条真实数据（基于 Light 扫描数据）
3. **升级按钮**：价格 + 升级入口

### 转化心理学
| 技巧 | 应用 |
|------|------|
| 损失厌恶 | "你的品牌在 AI 眼中：'一个不知名的品牌...'（升级后可以改善）" |
| 锚定效应 | "原价 ¥299，现价 ¥50" |
| 稀缺性 | "限时优惠，24小时内升级可享 5 折" |

---

## 任务1: 新增 PreviewModal 组件

### 需要新建的文件
`frontend/components/preview-modal.tsx`

### 实现要求

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  module: {
    id: string;
    title: string;
    description: string;
    features: string[];
    previewData?: {
      label: string;
      value: string;
    };
    price: string;
    priceDetail: string;
  };
}

export function PreviewModal({ isOpen, onClose, onUpgrade, module }: PreviewModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
          />

          {/* 弹窗内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="relative w-full max-w-md"
              style={{
                background: "linear-gradient(180deg, #1A1A22 0%, #131318 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              }}
            >
              {/* 顶部装饰线 */}
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.3), transparent)" }}
              />

              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center"
                style={{ color: "#5E5E78" }}
              >
                ✕
              </button>

              {/* 内容 */}
              <div className="p-6">
                {/* 标题 */}
                <h3 className="text-lg font-semibold mb-4" style={{ color: "#EDEDF5" }}>
                  {module.title}
                </h3>

                {/* 功能说明 */}
                <p className="text-sm mb-4" style={{ color: "#9A9AB0" }}>
                  {module.description}
                </p>

                {/* 功能列表 */}
                <div className="mb-5">
                  <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(56,189,248,0.5)" }}>
                    这个模块能告诉你
                  </p>
                  <ul className="space-y-2">
                    {module.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#C8C8D8" }}>
                        <span style={{ color: "#38BDF8" }}>✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 预览数据 */}
                {module.previewData && (
                  <div
                    className="mb-5 p-4"
                    style={{
                      background: "rgba(56,189,248,0.03)",
                      border: "1px solid rgba(56,189,248,0.08)",
                    }}
                  >
                    <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(56,189,248,0.5)" }}>
                      📊 预览（基于你的初步体检数据）
                    </p>
                    <p className="text-xs mb-1" style={{ color: "#9A9AB0" }}>
                      {module.previewData.label}
                    </p>
                    <p className="text-sm" style={{ color: "#C8C8D8" }}>
                      {module.previewData.value}
                    </p>
                    <p className="text-[10px] mt-2" style={{ color: "#5E5E78" }}>
                      ⚠️ 完整数据需要升级后查看
                    </p>
                  </div>
                )}

                {/* 升级按钮 */}
                <div
                  className="p-4 mb-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(56,189,248,0.06) 0%, rgba(56,189,248,0.02) 100%)",
                    border: "1px solid rgba(56,189,248,0.15)",
                  }}
                >
                  <p className="text-lg font-semibold mb-1" style={{ color: "#7DD3FC" }}>
                    升级解锁 {module.price}
                  </p>
                  <p className="text-xs" style={{ color: "#9A9AB0" }}>
                    {module.priceDetail}
                  </p>
                </div>

                {/* 按钮 */}
                <div className="flex gap-3">
                  <button
                    onClick={onUpgrade}
                    className="flex-1 py-3 text-sm font-medium"
                    style={{
                      background: "linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)",
                      color: "#FFF",
                      boxShadow: "0 4px 12px rgba(56,189,248,0.3)",
                    }}
                  >
                    立即升级
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-3 text-sm"
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "#5E5E78",
                    }}
                  >
                    稍后再说
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## 任务2: 修改 LockedSection 支持点击

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 实现要求

1. **修改 LockedSection 组件**，增加 onClick 支持

```tsx
function LockedSection({
  title,
  description,
  lockPrice,
  onUpgrade,
  onClick,  // 新增
  children,
}: {
  title: string;
  description: string;
  lockPrice: string;
  onUpgrade: () => void;
  onClick?: () => void;  // 新增
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="px-7 py-7 flex-shrink-0 cursor-pointer"  // 新增 cursor-pointer
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
        border: "1px solid rgba(245,158,11,0.12)",
      }}
      onClick={onClick}  // 新增
      whileHover={{ borderColor: "rgba(245,158,11,0.25)" }}  // 新增 hover 效果
    >
      <SectionLabel>{title}</SectionLabel>
      <p className="text-xs mb-4" style={{ color: "#5E5E78" }}>{description}</p>

      {/* 锁定覆盖层 */}
      <div className="relative">
        <div className="blur-[3px] select-none">
          {children}
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(10,10,15,0.6)" }}
        >
          <div className="text-center">
            <p className="text-2xl mb-2">🔒</p>
            <p className="text-sm font-medium" style={{ color: "#EDEDF5" }}>{lockPrice}</p>
            <p className="text-xs mt-1" style={{ color: "#5E5E78" }}>点击查看详情</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
```

2. **在 ScanDashboard 组件中增加状态管理**

```tsx
// 在 ScanDashboard 组件顶部
const [previewModule, setPreviewModule] = useState<any>(null);
const [showPreview, setShowPreview] = useState(false);

// 模块预览配置
const modulePreviews = {
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
    previewData: aiNarrative ? {
      label: "AI 怎么描述你",
      value: aiNarrative.ideal_description?.slice(0, 100) + "..." || "暂无数据",
    } : undefined,
    price: "¥50/次",
    priceDetail: "包含：AI认知画像 + 引擎对比 + 认知差距",
  },
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
    previewData: {
      label: "ChatGPT 引用率",
      value: `${industryRate}%`,
    },
    price: "¥50/次",
    priceDetail: "包含：AI认知画像 + 引擎对比 + 认知差距",
  },
  gap_report: {
    id: "gap_report",
    title: "认知差距",
    description: "对比品牌自述与 AI 认知的差距，找到改进方向。",
    features: [
      "品牌自述 vs AI 认知的对齐度",
      "具体差距分析",
      "改进建议",
    ],
    previewData: gapReport ? {
      label: "对齐度",
      value: `${gapReport.alignment_score}/100`,
    } : undefined,
    price: "¥50/次",
    priceDetail: "包含：AI认知画像 + 引擎对比 + 认知差距",
  },
  diagnosis: {
    id: "diagnosis",
    title: "Analyst 诊断报告",
    description: "14条自研规则逐条诊断，定位根因，对比竞品差距。",
    features: [
      "14条规则逐条检查",
      "核心问题定位",
      "竞品差距分析",
      "一句话诊断",
    ],
    previewData: {
      label: "诊断规则",
      value: "14条自研规则覆盖：引用率、推荐率、内容质量、竞品对比...",
    },
    price: "¥299/月",
    priceDetail: "包含：诊断报告 + 处方执行步骤",
  },
  prescription: {
    id: "prescription",
    title: "Doctor 处方",
    description: "根据诊断结果生成 P0/P1/P2 任务清单，精确到页面和操作步骤。",
    features: [
      "P0/P1/P2 任务清单",
      "每条含 target_page / what_to_add / evidence / how_to_verify",
      "4类处方：技术优化 / 内容优化 / 权威建设 / 社区运营",
    ],
    previewData: {
      label: "处方类型",
      value: "技术优化 / 内容优化 / 权威建设 / 社区运营",
    },
    price: "¥299/月",
    priceDetail: "包含：诊断报告 + 处方执行步骤",
  },
};

// 处理锁定模块点击
function handleLockedModuleClick(moduleId: string) {
  const module = modulePreviews[moduleId];
  if (module) {
    setPreviewModule(module);
    setShowPreview(true);
  }
}
```

3. **修改各锁定模块的调用**

```tsx
{/* AI认知画像 */}
{isFree ? (
  <LockedSection
    title="AI认知画像"
    description="AI怎么描述你的品牌、理想描述、关键词"
    lockPrice="¥50/次"
    onUpgrade={onUpgrade}
    onClick={() => handleLockedModuleClick("ai_perception")}  // 新增
  >
    {/* ... 保持现有 mock 数据 ... */}
  </LockedSection>
) : /* ... */}

{/* 引擎对比 */}
{isFree ? (
  <LockedSection
    title="引擎对比 · 交叉验证"
    description="ChatGPT、Gemini、Claude 三引擎交叉验证"
    lockPrice="¥50/次"
    onUpgrade={onUpgrade}
    onClick={() => handleLockedModuleClick("engine_comparison")}  // 新增
  >
    {/* ... 保持现有 mock 数据 ... */}
  </LockedSection>
) : /* ... */}

{/* 认知差距 */}
{isFree ? (
  <LockedSection
    title="认知差距"
    description="品牌自述 vs AI认知的差距分析"
    lockPrice="¥50/次"
    onUpgrade={onUpgrade}
    onClick={() => handleLockedModuleClick("gap_report")}  // 新增
  >
    {/* ... 保持现有 mock 数据 ... */}
  </LockedSection>
) : /* ... */}

{/* 诊断摘要 */}
{isFree ? (
  <LockedSection
    title={isProbe ? "升级解锁 Analyst 诊断报告" : "升级解锁完整诊断"}
    description="14条自研规则逐条诊断，定位根因，对比竞品差距"
    lockPrice="¥299/月"
    onUpgrade={onUpgrade}
    onClick={() => handleLockedModuleClick("diagnosis")}  // 新增
  >
    {/* ... 保持现有 mock 数据 ... */}
  </LockedSection>
) : /* ... */}

{/* 处方执行步骤 */}
{isFree ? (
  <LockedSection
    title={isProbe ? "升级解锁 Doctor 处方" : "升级解锁完整处方"}
    description="获取 P0/P1/P2 任务清单，精确到页面和操作步骤"
    lockPrice="¥299/月"
    onUpgrade={onUpgrade}
    onClick={() => handleLockedModuleClick("prescription")}  // 新增
  >
    {/* ... 保持现有 mock 数据 ... */}
  </LockedSection>
) : /* ... */}
```

4. **在 JSX 末尾添加 PreviewModal**

```tsx
{/* 预览弹窗 */}
{previewModule && (
  <PreviewModal
    isOpen={showPreview}
    onClose={() => setShowPreview(false)}
    onUpgrade={() => {
      setShowPreview(false);
      onUpgrade();
    }}
    module={previewModule}
  />
)}
```

---

## 任务3: 设计6个模块的预览内容

### 预览内容配置表

| 模块 | 功能说明 | 预览数据来源 | 预览内容示例 |
|------|---------|-------------|-------------|
| AI认知画像 | AI怎么描述你的品牌 | aiNarrative | "AI理想描述：一个专注于环保手机壳的品牌..." |
| 引擎对比 | 三大引擎引用率对比 | industryRate | "ChatGPT 引用率：25%" |
| 认知差距 | 品牌自述 vs AI认知 | gapReport | "对齐度：45/100" |
| 诊断报告 | 14条规则逐条诊断 | 无（需要 Probe） | "14条规则覆盖：引用率、推荐率..." |
| 处方 | P0/P1/P2任务清单 | 无（需要 Probe） | "处方类型：技术优化/内容优化..." |
| 竞品维度对比 | 竞品在哪些维度赢了你 | competitorAnalysis | "你在环保维度落后竞品" |
| 品牌诊断 | 优势/劣势分析 | companyEvaluation | "优势：设计独特" |
| 引用来源分析 | 谁在讨论你 | sourceAuthority | "8个来源讨论你" |

### 预览数据生成逻辑

```tsx
// 根据 Light 扫描数据生成预览
function getPreviewData(moduleId: string, data: any) {
  const probe = data?.probe || {};
  
  switch (moduleId) {
    case "ai_perception":
      return probe?.ai_narrative?.ideal_description ? {
        label: "AI 理想描述",
        value: probe.ai_narrative.ideal_description.slice(0, 100) + "...",
      } : undefined;
    
    case "engine_comparison":
      return {
        label: "ChatGPT 引用率",
        value: `${probe?.citation_metrics?.industry_rate || 0}%`,
      };
    
    case "gap_report":
      return probe?.gap_report?.alignment_score ? {
        label: "对齐度",
        value: `${probe.gap_report.alignment_score}/100`,
      } : undefined;
    
    case "competitor_dimension":
      return probe?.competitor_analysis?.[0] ? {
        label: "竞品维度",
        value: `${probe.competitor_analysis[0].dimension_scores?.length || 0} 个维度对比`,
      } : undefined;
    
    case "brand_diagnosis":
      return probe?.company_evaluation?.strengths?.[0] ? {
        label: "优势",
        value: probe.company_evaluation.strengths[0],
      } : undefined;
    
    case "source_authority":
      return probe?.source_authority?.total_sources ? {
        label: "来源总数",
        value: `${probe.source_authority.total_sources} 个来源`,
      } : undefined;
    
    default:
      return undefined;
  }
}
```

---

## 任务4: 验证弹窗效果

### 验证方法

**测试1: 点击锁定模块**
1. 用 test@citeflow.com 登录
2. 跑一次 Light 扫描
3. 进入仪表盘
4. 点击任意锁定模块（如"AI认知画像"）
5. 应该弹出预览弹窗

**测试2: 弹窗内容**
1. 弹窗应该显示：
   - 模块标题
   - 功能说明
   - 功能列表（✓ 标记）
   - 预览数据（基于 Light 扫描）
   - 升级按钮
   - "稍后再说"按钮

**测试3: 升级按钮**
1. 点击"立即升级"
2. 应该关闭弹窗，弹出升级弹窗（UpgradeModal）

**测试4: 关闭按钮**
1. 点击"稍后再说"
2. 应该关闭弹窗，返回仪表盘

**测试5: 点击背景**
1. 点击弹窗背景（遮罩层）
2. 应该关闭弹窗

---

## state.py 改动汇总

**不需要改后端！** 只是前端 UI 改动。

---

## CHECKLIST 自检

**任务1 [PreviewModal 组件]:**
- [ ] 组件在 preview-modal.tsx 中定义
- [ ] 支持 isOpen / onClose / onUpgrade / module props
- [ ] 显示模块标题、功能说明、功能列表
- [ ] 显示预览数据（如果有的话）
- [ ] 显示升级按钮 + 价格
- [ ] 显示"稍后再说"按钮
- [ ] 点击背景关闭弹窗
- [ ] 动画流畅（进入/退出）

**任务2 [LockedSection 支持点击]:**
- [ ] LockedSection 增加 onClick prop
- [ ] 点击时调用 handleLockedModuleClick
- [ ] 显示 cursor:pointer
- [ ] hover 效果（边框颜色变化）

**任务3 [6个模块预览内容]:**
- [ ] AI认知画像预览配置
- [ ] 引擎对比预览配置
- [ ] 认知差距预览配置
- [ ] 诊断报告预览配置
- [ ] 处方预览配置
- [ ] 竞品维度对比预览配置
- [ ] 品牌诊断预览配置
- [ ] 引用来源分析预览配置
- [ ] 预览数据从 Light 扫描数据中提取

**任务4 [验证]:**
- [ ] 点击锁定模块弹出弹窗
- [ ] 弹窗内容正确
- [ ] 升级按钮可用
- [ ] 关闭按钮可用
- [ ] 点击背景关闭

---

## 交付格式

```
自检结果: X/8 任务1 + X/4 任务2 + X/9 任务3 + X/5 任务4 = XX/26
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **预览数据要用真实数据** — 不要用 mock 数据，用 Light 扫描的真实数据
2. **预览数据要截断** — 只展示 1-2 条，不要全部展示
3. **升级按钮要醒目** — 用蓝色渐变，有阴影
4. **"稍后再说"要低调** — 用灰色，不要抢升级按钮的视觉
5. **弹窗不要太大** — max-w-md (448px) 足够
6. **动画要流畅** — 进入/退出动画，不要卡顿

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
│  📊 预览（基于你的初步体检数据）              │
│                                             │
│  AI 理想描述                                  │
│  "一个专注于环保手机壳的品牌，主打可持续生..." │
│                                             │
│  ⚠️ 完整数据需要升级后查看                    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  升级解锁 ¥50/次                     │    │
│  │  包含：AI认知画像 + 引擎对比 + 认知差距│    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │        [ 立即升级 ]                  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [稍后再说]                                   │
└─────────────────────────────────────────────┘
```

### 免费用户点击"诊断报告"

```
┌─────────────────────────────────────────────┐
│  Analyst 诊断报告                             │
│                                             │
│  14条自研规则逐条诊断，定位根因，对比竞品差   │
│  距。                                         │
│                                             │
│  这个模块能告诉你                             │
│  ✓ 14条规则逐条检查                          │
│  ✓ 核心问题定位                              │
│  ✓ 竞品差距分析                              │
│  ✓ 一句话诊断                                │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  📊 预览                                      │
│                                             │
│  诊断规则                                     │
│  14条自研规则覆盖：引用率、推荐率、内容质量、 │
│  竞品对比...                                  │
│                                             │
│  ⚠️ 完整诊断需要升级后查看                    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  升级解锁 ¥299/月                    │    │
│  │  包含：诊断报告 + 处方执行步骤        │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │        [ 立即升级 ]                  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [稍后再说]                                   │
└─────────────────────────────────────────────┘
```
