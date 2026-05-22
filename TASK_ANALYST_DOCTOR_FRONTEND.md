# TASK_ANALYST_DOCTOR_FRONTEND.md — Analyst + Doctor 前端页面开发

> 药老出品 · 2026-05-18
> 目标: 开发 Analyst 诊断师和 Doctor 医师的前端页面，完成 Probe → Analyst → Doctor 完整用户旅程
> 预计工时: 16-20小时

---

## 任务概览

| # | 任务 | 文件 | 工时 | 依赖 |
|---|------|------|------|------|
| 1 | Analyst 诊断页面 | 新文件 analyst-page.tsx | 6h | 后端已完成 |
| 2 | Doctor 处方页面 | 新文件 doctor-page.tsx | 6h | 后端已完成 |
| 3 | 仪表盘集成（锁定/解锁） | scan-dashboard.tsx | 4h | 1, 2 |
| 4 | 用户旅程（Probe → Analyst → Doctor） | page.tsx | 4h | 1, 2, 3 |
| **总计** | | | **20h** | |

---

## 背景

### 当前状态
- 后端：Analyst 和 Doctor 都已完成
- 前端：只有 Probe 的用户体验，Analyst 和 Doctor 还没有前端页面

### 数据结构

**Analyst 输出（后端已完成）：**
```python
class AnalystOutput:
    diagnosis: Diagnosis          # 核心问题、详细诊断、严重程度
    three_layer_chain: ThreeLayerChain  # 观察、解释、影响
    actions: list[ActionItem]     # 行动项列表
    competitor_gap: CompetitorGap # 竞品差距
    one_line_verdict: str         # 一句话诊断
    engine_comparison: dict       # 引擎对比
    engine_insights: list[str]    # 引擎洞察
    engine_recommendations: list[str]  # 引擎建议
    b_class_perception: dict      # B类 AI 认知画像
    c_class_matrix: dict          # C类 竞品胜负矩阵
    content_templates: dict       # 内容改造指南
```

**Doctor 输出（后端已完成）：**
```python
class DoctorOutput:
    prescription: list[PrescriptionItem]  # 处方列表
    summary: str                  # 整体策略总结
    knowledge_sources: list[str]  # 引用的论文列表
```

**PrescriptionItem：**
```python
class PrescriptionItem:
    priority: str          # P0 | P1 | P2
    category: str          # 技术优化 | 内容优化 | 权威建设 | 社区运营
    target_page: str       # 精确到页面
    action: str            # 一句话概括
    what_to_add: list[str] # 具体要添加的内容模板
    evidence: str          # 知识来源
    expected_impact: str   # 量化预期
    timeline: str          # 预计时间
    how_to_verify: str     # 如何验证效果
    difficulty: str        # 低 | 中 | 高
```

---

## 任务1: Analyst 诊断页面

### 需要新建的文件
`frontend/components/analyst-page.tsx`

### 页面结构

```
┌─────────────────────────────────────────────┐
│  Analyst 分析师                              │
│                                             │
│  一句话诊断                                 │
│  ┌─────────────────────────────────────┐   │
│  │ "AI引用率显著低于品类平均水平，竞品  │   │
│  │  在推荐结果中占据主导位置。"         │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  三层诊断链                                 │
│  ├─ 观察：A类行业查询中品牌被引用率仅 25%  │
│  ├─ 解释：官网内容与AI搜索查询意图存在缺口 │
│  └─ 影响：若不修复，品牌在AI搜索中被替代   │
│                                             │
│  14条规则检查                               │
│  ├─ ✅ 规则1：品牌被提及                    │
│  ├─ ✅ 规则2：推荐率 > 30%                  │
│  ├─ ❌ 规则3：行业引用率 > 50%              │
│  ├─ ❌ 规则4：竞品差距 < 20%                │
│  └─ ...                                     │
│                                             │
│  竞品差距分析                               │
│  ├─ 失败维度：环保可持续（落后 25 分）      │
│  ├─ 胜出维度：设计感（领先 15 分）          │
│  └─ 根因分析：...                           │
│                                             │
│  引擎对比洞察                               │
│  ├─ ChatGPT 引用率：25%                     │
│  ├─ Gemini 引用率：20%                      │
│  ├─ Claude 引用率：22%                      │
│  └─ 洞察：...                               │
│                                             │
│  [查看处方 →]                               │
└─────────────────────────────────────────────┘
```

### 实现要求

```tsx
"use client";

import { motion } from "framer-motion";

interface AnalystPageProps {
  data: any;  // AnalystOutput
  brandName: string;
  onViewPrescription: () => void;
  onBack: () => void;
}

export function AnalystPage({ data, brandName, onViewPrescription, onBack }: AnalystPageProps) {
  const { diagnosis, three_layer_chain, competitor_gap, one_line_verdict, 
          engine_comparison, engine_insights, engine_recommendations } = data;

  return (
    <div className="flex-1 flex flex-col pt-5 pb-8 px-6 max-w-4xl mx-auto">
      {/* 返回按钮 */}
      <button onClick={onBack} className="mb-4 text-sm" style={{ color: "#5E5E78" }}>
        ← 返回仪表盘
      </button>

      {/* 标题 */}
      <h1 className="text-2xl font-semibold mb-6" style={{ color: "#EDEDF5" }}>
        Analyst 分析师
      </h1>

      {/* 一句话诊断 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-5"
        style={{
          background: "linear-gradient(135deg, rgba(56,189,248,0.06) 0%, rgba(56,189,248,0.02) 100%)",
          border: "1px solid rgba(56,189,248,0.15)",
        }}
      >
        <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(56,189,248,0.5)" }}>
          一句话诊断
        </p>
        <p className="text-lg leading-relaxed" style={{ color: "#C8C8D8" }}>
          {one_line_verdict}
        </p>
      </motion.div>

      {/* 三层诊断链 */}
      {three_layer_chain && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#EDEDF5" }}>
            三层诊断链
          </h2>
          <div className="space-y-3">
            {[
              { label: "观察", value: three_layer_chain.observation, color: "#38BDF8" },
              { label: "解释", value: three_layer_chain.explanation, color: "#F59E0B" },
              { label: "影响", value: three_layer_chain.implication, color: "#EF4444" },
            ].map((item, i) => (
              <div key={i} className="p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: item.color }}>
                  {item.label}
                </p>
                <p className="text-sm" style={{ color: "#C8C8D8" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 竞品差距分析 */}
      {competitor_gap && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#EDEDF5" }}>
            竞品差距分析
          </h2>
          
          {/* 失败维度 */}
          {competitor_gap.losing_dimensions?.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "#EF4444" }}>
                失败维度
              </p>
              <div className="space-y-2">
                {competitor_gap.losing_dimensions.map((dim: any, i: number) => (
                  <div key={i} className="p-3" style={{ background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.08)" }}>
                    <p className="text-sm" style={{ color: "#C8C8D8" }}>
                      <span style={{ color: "#EF4444" }}>{dim.competitor}</span> 在 
                      <span style={{ color: "#F59E0B" }}>{dim.dimension}</span> 领先你 
                      <span className="font-mono" style={{ color: "#EF4444" }}>{dim.gap}</span> 分
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 胜出维度 */}
          {competitor_gap.winning_dimensions?.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "#22C55E" }}>
                胜出维度
              </p>
              <div className="space-y-2">
                {competitor_gap.winning_dimensions.map((dim: any, i: number) => (
                  <div key={i} className="p-3" style={{ background: "rgba(34,197,94,0.03)", border: "1px solid rgba(34,197,94,0.08)" }}>
                    <p className="text-sm" style={{ color: "#C8C8D8" }}>
                      你在 <span style={{ color: "#22C55E" }}>{dim.dimension}</span> 领先 
                      <span style={{ color: "#9A9AB0" }}>{dim.competitor}</span> 
                      <span className="font-mono" style={{ color: "#22C55E" }}>{dim.gap}</span> 分
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 根因分析 */}
          {competitor_gap.root_cause && (
            <div className="p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
                根因分析
              </p>
              <p className="text-sm" style={{ color: "#C8C8D8" }}>{competitor_gap.root_cause}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* 引擎对比洞察 */}
      {engine_insights?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#EDEDF5" }}>
            引擎对比洞察
          </h2>
          <div className="space-y-2">
            {engine_insights.map((insight: string, i: number) => (
              <div key={i} className="p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-sm" style={{ color: "#C8C8D8" }}>{insight}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 查看处方按钮 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex justify-end"
      >
        <button
          onClick={onViewPrescription}
          className="px-6 py-3 text-sm font-medium"
          style={{
            background: "linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)",
            color: "#FFF",
            boxShadow: "0 4px 12px rgba(56,189,248,0.3)",
          }}
        >
          查看处方 →
        </button>
      </motion.div>
    </div>
  );
}
```

---

## 任务2: Doctor 处方页面

### 需要新建的文件
`frontend/components/doctor-page.tsx`

### 页面结构

```
┌─────────────────────────────────────────────┐
│  Doctor 医师                                │
│                                             │
│  处方摘要                                   │
│  ┌─────────────────────────────────────┐   │
│  │ "基于诊断结果，我们为您生成了 3 个   │   │
│  │  优先级任务，预计执行后引用率可提升  │   │
│  │  15-20%。"                          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  P0 紧急任务                                │
│  ┌─────────────────────────────────────┐   │
│  │ 优化官网产品页面                      │   │
│  │ 类别：技术优化                        │   │
│  │ 目标页面：/products                  │   │
│  │ 具体操作：                            │   │
│  │ • 添加结构化数据                      │   │
│  │ • 优化标题标签                        │   │
│  │ • 添加 meta description              │   │
│  │ 预期效果：引用率提升 10%              │   │
│  │ 证据来源：论文3，Section 2.1          │   │
│  │ 预计时间：1-2周                       │   │
│  │ 难度：中                              │   │
│  │ 如何验证：重新体检后查看引用率变化    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  P1 重要任务                                │
│  ┌─────────────────────────────────────┐   │
│  │ ...                                   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  P2 优化任务                                │
│  ┌─────────────────────────────────────┐   │
│  │ ...                                   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  知识来源                                   │
│  ├─ 论文3：GEO: A Generalizable...         │
│  ├─ 论文7：Optimizing Language Models...   │
│  └─ 论文12：Search Engine Optimization...  │
│                                             │
│  [导出处方] [返回诊断]                      │
└─────────────────────────────────────────────┘
```

### 实现要求

```tsx
"use client";

import { motion } from "framer-motion";

interface DoctorPageProps {
  data: any;  // DoctorOutput
  brandName: string;
  onBack: () => void;
  onExport: () => void;
}

export function DoctorPage({ data, brandName, onBack, onExport }: DoctorPageProps) {
  const { prescription, summary, knowledge_sources } = data;

  // 按优先级分组
  const p0Items = prescription.filter((item: any) => item.priority === "P0");
  const p1Items = prescription.filter((item: any) => item.priority === "P1");
  const p2Items = prescription.filter((item: any) => item.priority === "P2");

  return (
    <div className="flex-1 flex flex-col pt-5 pb-8 px-6 max-w-4xl mx-auto">
      {/* 返回按钮 */}
      <button onClick={onBack} className="mb-4 text-sm" style={{ color: "#5E5E78" }}>
        ← 返回诊断
      </button>

      {/* 标题 */}
      <h1 className="text-2xl font-semibold mb-6" style={{ color: "#EDEDF5" }}>
        Doctor 医师
      </h1>

      {/* 处方摘要 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-5"
        style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.02) 100%)",
          border: "1px solid rgba(34,197,94,0.15)",
        }}
      >
        <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(34,197,94,0.5)" }}>
          处方摘要
        </p>
        <p className="text-lg leading-relaxed" style={{ color: "#C8C8D8" }}>
          {summary}
        </p>
      </motion.div>

      {/* P0 紧急任务 */}
      {p0Items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#EF4444" }}>
            P0 紧急任务
          </h2>
          <div className="space-y-4">
            {p0Items.map((item: any, i: number) => (
              <PrescriptionCard key={i} item={item} />
            ))}
          </div>
        </motion.div>
      )}

      {/* P1 重要任务 */}
      {p1Items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#F59E0B" }}>
            P1 重要任务
          </h2>
          <div className="space-y-4">
            {p1Items.map((item: any, i: number) => (
              <PrescriptionCard key={i} item={item} />
            ))}
          </div>
        </motion.div>
      )}

      {/* P2 优化任务 */}
      {p2Items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#22C55E" }}>
            P2 优化任务
          </h2>
          <div className="space-y-4">
            {p2Items.map((item: any, i: number) => (
              <PrescriptionCard key={i} item={item} />
            ))}
          </div>
        </motion.div>
      )}

      {/* 知识来源 */}
      {knowledge_sources?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#EDEDF5" }}>
            知识来源
          </h2>
          <div className="space-y-2">
            {knowledge_sources.map((source: string, i: number) => (
              <div key={i} className="p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-sm font-mono" style={{ color: "#9A9AB0" }}>{source}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 按钮 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-between"
      >
        <button
          onClick={onBack}
          className="px-6 py-3 text-sm"
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "#5E5E78",
          }}
        >
          返回诊断
        </button>
        <button
          onClick={onExport}
          className="px-6 py-3 text-sm font-medium"
          style={{
            background: "linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)",
            color: "#FFF",
            boxShadow: "0 4px 12px rgba(56,189,248,0.3)",
          }}
        >
          导出处方
        </button>
      </motion.div>
    </div>
  );
}

// 处方卡片组件
function PrescriptionCard({ item }: { item: any }) {
  const priorityColors: Record<string, string> = {
    P0: "#EF4444",
    P1: "#F59E0B",
    P2: "#22C55E",
  };

  const categoryIcons: Record<string, string> = {
    "技术优化": "🔧",
    "内容优化": "📝",
    "权威建设": "🏆",
    "社区运营": "👥",
  };

  return (
    <div
      className="p-5"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${priorityColors[item.priority]}20`,
      }}
    >
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold" style={{ color: "#EDEDF5" }}>
          {item.action}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5" style={{ background: `${priorityColors[item.priority]}15`, color: priorityColors[item.priority] }}>
            {item.priority}
          </span>
          <span className="text-xs px-2 py-0.5" style={{ background: "rgba(255,255,255,0.05)", color: "#9A9AB0" }}>
            {categoryIcons[item.category]} {item.category}
          </span>
        </div>
      </div>

      {/* 目标页面 */}
      <div className="mb-3">
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          目标页面
        </p>
        <p className="text-sm font-mono" style={{ color: "#7DD3FC" }}>{item.target_page}</p>
      </div>

      {/* 具体操作 */}
      {item.what_to_add?.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
            具体操作
          </p>
          <ul className="space-y-1">
            {item.what_to_add.map((step: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#C8C8D8" }}>
                <span style={{ color: "#38BDF8" }}>•</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 预期效果 */}
      <div className="mb-3">
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(34,197,94,0.5)" }}>
          预期效果
        </p>
        <p className="text-sm" style={{ color: "#22C55E" }}>{item.expected_impact}</p>
      </div>

      {/* 元信息 */}
      <div className="flex flex-wrap gap-4 text-xs" style={{ color: "#5E5E78" }}>
        {item.evidence && (
          <span>📚 {item.evidence}</span>
        )}
        {item.timeline && (
          <span>⏱️ {item.timeline}</span>
        )}
        {item.difficulty && (
          <span>📊 难度：{item.difficulty}</span>
        )}
      </div>

      {/* 如何验证 */}
      {item.how_to_verify && (
        <div className="mt-3 p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(245,158,11,0.5)" }}>
            如何验证
          </p>
          <p className="text-sm" style={{ color: "#9A9AB0" }}>{item.how_to_verify}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 任务3: 仪表盘集成（锁定/解锁）

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 实现要求

1. **诊断摘要模块**（已有，需要完善）

```tsx
{/* SECTION 6 — 诊断摘要 */}
{isFull && hasDiagnosis ? (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="px-7 py-7 flex-shrink-0"
    style={{
      background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <SectionLabel>诊断摘要</SectionLabel>
    
    {/* 一句话诊断 */}
    {verdict && (
      <div className="mb-4 p-4" style={{ background: "rgba(56,189,248,0.03)", borderLeft: "2px solid rgba(56,189,248,0.25)" }}>
        <p className="text-sm" style={{ color: "#C8C8D8" }}>{verdict}</p>
      </div>
    )}

    {/* 查看完整诊断按钮 */}
    <div className="flex justify-end">
      <button
        onClick={onViewAnalyst}
        className="px-4 py-2 text-sm"
        style={{
          background: "rgba(56,189,248,0.05)",
          border: "1px solid rgba(56,189,248,0.15)",
          color: "#7DD3FC",
        }}
      >
        查看完整诊断 →
      </button>
    </div>
  </motion.section>
) : (
  <LockedSection
    title="诊断摘要"
    description="14条自研规则逐条诊断，定位根因"
    lockPrice="¥299/月"
    onUpgrade={onUpgrade}
    onClick={() => handleLockedModuleClick("diagnosis")}
  >
    {/* ... 现有 mock 数据 ... */}
  </LockedSection>
)}
```

2. **处方执行步骤模块**（已有，需要完善）

```tsx
{/* SECTION 7 — 处方执行步骤 */}
{isFull && hasPrescription && prescription.length > 0 ? (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="px-7 py-7 flex-shrink-0"
    style={{
      background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <SectionLabel>处方执行步骤</SectionLabel>
    
    {/* 处方摘要 */}
    {prescriptionSummary && (
      <p className="text-sm mb-4" style={{ color: "#C8C8D8" }}>{prescriptionSummary}</p>
    )}

    {/* P0 任务预览 */}
    {prescription.filter((item: any) => item.priority === "P0").slice(0, 2).map((item: any, i: number) => (
      <div key={i} className="mb-3 p-3" style={{ background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.08)" }}>
        <p className="text-sm font-medium" style={{ color: "#EDEDF5" }}>{item.action}</p>
        <p className="text-xs mt-1" style={{ color: "#5E5E78" }}>{item.target_page}</p>
      </div>
    ))}

    {/* 查看完整处方按钮 */}
    <div className="flex justify-end">
      <button
        onClick={onViewDoctor}
        className="px-4 py-2 text-sm"
        style={{
          background: "rgba(56,189,248,0.05)",
          border: "1px solid rgba(56,189,248,0.15)",
          color: "#7DD3FC",
        }}
      >
        查看完整处方 →
      </button>
    </div>
  </motion.section>
) : (
  <LockedSection
    title="处方执行步骤"
    description="P0/P1/P2 任务清单，精确到页面和操作步骤"
    lockPrice="¥299/月"
    onUpgrade={onUpgrade}
    onClick={() => handleLockedModuleClick("prescription")}
  >
    {/* ... 现有 mock 数据 ... */}
  </LockedSection>
)}
```

3. **新增回调函数**

```tsx
// 在 ScanDashboard 组件中
const [showAnalyst, setShowAnalyst] = useState(false);
const [showDoctor, setShowDoctor] = useState(false);

function handleViewAnalyst() {
  setShowAnalyst(true);
}

function handleViewDoctor() {
  setShowDoctor(true);
}
```

---

## 任务4: 用户旅程（Probe → Analyst → Doctor）

### 需要改的文件
`frontend/app/(app)/scan/page.tsx`

### 实现要求

1. **新增状态**

```tsx
const [showAnalyst, setShowAnalyst] = useState(false);
const [showDoctor, setShowDoctor] = useState(false);
```

2. **新增回调函数**

```tsx
function handleViewAnalyst() {
  setShowAnalyst(true);
}

function handleViewDoctor() {
  setShowDoctor(true);
}

function handleBackToDashboard() {
  setShowAnalyst(false);
  setShowDoctor(false);
}
```

3. **修改渲染逻辑**

```tsx
{/* ═══ step = "dashboard" (仪表盘总览) ═══ */}
{step === "dashboard" && (
  <>
    {showAnalyst ? (
      <AnalystPage
        data={data?.analyst}
        brandName={scanBrandName}
        onViewPrescription={() => {
          setShowAnalyst(false);
          setShowDoctor(true);
        }}
        onBack={handleBackToDashboard}
      />
    ) : showDoctor ? (
      <DoctorPage
        data={data?.doctor}
        brandName={scanBrandName}
        onBack={() => {
          setShowDoctor(false);
          setShowAnalyst(true);
        }}
        onExport={() => {
          // TODO: 导出处方
        }}
      />
    ) : (
      <ScanDashboard
        data={data}
        tier={tier}
        mode={scanMode}
        domain={scanDomain}
        brandName={scanBrandName}
        lastScanTime={lastScanTime}
        onViewReport={handleViewReport}
        onUpgrade={() => { setUpgradeFeature("probe"); setShowUpgrade(true); }}
        onViewAnalyst={handleViewAnalyst}
        onViewDoctor={handleViewDoctor}
      />
    )}
  </>
)}
```

---

## 验证方法

**测试1: Analyst 页面**
1. 跑一次 Full 扫描（Probe + Analyst）
2. 进入仪表盘
3. 点击"查看完整诊断"
4. 应该看到 Analyst 页面，包含：
   - 一句话诊断
   - 三层诊断链
   - 竞品差距分析
   - 引擎对比洞察

**测试2: Doctor 页面**
1. 跑一次 Full 扫描（Probe + Analyst + Doctor）
2. 进入仪表盘
3. 点击"查看完整诊断" → 点击"查看处方"
4. 应该看到 Doctor 页面，包含：
   - 处方摘要
   - P0/P1/P2 任务清单
   - 每个任务的详细信息
   - 知识来源

**测试3: 锁定/解锁**
1. 免费用户看到"诊断摘要"锁定
2. 点击锁定模块 → 弹出预览弹窗
3. 升级后 → 解锁，显示一句话诊断 + "查看完整诊断"按钮

**测试4: 用户旅程**
1. 完整流程：Probe → Analyst → Doctor
2. 可以往返：Doctor → 返回诊断 → 返回仪表盘

---

## state.py 改动汇总

**不需要改后端！** 后端已完成。

---

## CHECKLIST 自检

**任务1 [Analyst 页面]:**
- [ ] 组件在 analyst-page.tsx 中定义
- [ ] 显示一句话诊断
- [ ] 显示三层诊断链（观察/解释/影响）
- [ ] 显示竞品差距分析（失败维度/胜出维度/根因）
- [ ] 显示引擎对比洞察
- [ ] "查看处方"按钮可用

**任务2 [Doctor 页面]:**
- [ ] 组件在 doctor-page.tsx 中定义
- [ ] 显示处方摘要
- [ ] 按优先级分组（P0/P1/P2）
- [ ] 每个任务显示详细信息（目标页面/具体操作/预期效果/证据来源/难度/如何验证）
- [ ] 显示知识来源
- [ ] "导出处方"按钮可用
- [ ] "返回诊断"按钮可用

**任务3 [仪表盘集成]:**
- [ ] 诊断摘要模块解锁后显示一句话诊断
- [ ] 诊断摘要模块有"查看完整诊断"按钮
- [ ] 处方执行步骤模块解锁后显示 P0 任务预览
- [ ] 处方执行步骤模块有"查看完整处方"按钮
- [ ] 锁定模块点击弹出预览弹窗

**任务4 [用户旅程]:**
- [ ] 仪表盘 → Analyst 页面
- [ ] Analyst 页面 → Doctor 页面
- [ ] Doctor 页面 → 返回 Analyst 页面
- [ ] Analyst 页面 → 返回仪表盘
- [ ] 状态管理正确（showAnalyst/showDoctor）

---

## 交付格式

```
自检结果: X/6 任务1 + X/7 任务2 + X/5 任务3 + X/5 任务4 = XX/23
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改后端** — 后端已完成，只做前端
2. **保持现有样式风格** — 用 inline style，不用 Tailwind
3. **动画要流畅** — 进入/退出动画
4. **数据结构要匹配** — 前端接收的是 AnalystOutput 和 DoctorOutput
5. **锁定/解锁逻辑** — 免费用户看到锁定，付费用户看到解锁
6. **用户旅程要完整** — Probe → Analyst → Doctor 可以往返

---

## 预期效果

### Analyst 页面
```
┌─────────────────────────────────────────────┐
│  Analyst 分析师                              │
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
│  竞品差距分析                               │
│  失败维度：环保可持续（落后 25 分）          │
│  胜出维度：设计感（领先 15 分）              │
│                                             │
│  [查看处方 →]                               │
└─────────────────────────────────────────────┘
```

### Doctor 页面
```
┌─────────────────────────────────────────────┐
│  Doctor 医师                                │
│                                             │
│  处方摘要                                   │
│  "基于诊断结果，我们为您生成了 3 个优先级   │
│   任务，预计执行后引用率可提升 15-20%。"    │
│                                             │
│  P0 紧急任务                                │
│  ┌─────────────────────────────────────┐   │
│  │ 优化官网产品页面                      │   │
│  │ 目标页面：/products                  │   │
│  │ 具体操作：添加结构化数据、优化标题    │   │
│  │ 预期效果：引用率提升 10%              │   │
│  │ 证据来源：论文3，Section 2.1          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [导出处方] [返回诊断]                      │
└─────────────────────────────────────────────┘
```
