# TASK_ANALYST_REPORT.md — Analyst 诊断报告 4-Tab 前端页面

> 药老出品 · 2026-05-19
> 目标: 新建诊断报告页面，4个Tab展示Analyst诊断结果
> 预计工时: 3h

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 后端API补全缺失字段 | api.py | 15min |
| 2 | 新建 scan-analyst-report.tsx | 新文件 | 2.5h |
| 3 | page.tsx 集成 + demo页更新 | scan/page.tsx, dev/analyst-demo/page.tsx | 15min |

**完成标准**: 军师阅卷完成后点击"查看诊断报告"→ 进入4-Tab诊断报告页面，数据从AnalystOutput读取

---

## 页面结构

```
┌─ 左栏 (flex-1, scroll) ──────────────────────┐
│                                                │
│  ← 返回军师阅卷                                │
│                                                │
│  [Tab1 诊断报告] [Tab2 竞品战场] [Tab3 引擎情报] [Tab4 AI认知]
│  ┌──────────────────────────────────────────┐  │
│  │                                          │  │
│  │          当前Tab内容                      │  │
│  │          (独立滚动区域)                   │  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│           [查看处方 →]   (底部CTA)              │
└────────────────────────────────────────────────┘
```

**Tab切换规则**:
- 点击Tab按钮 → 切换到对应内容
- 当前激活Tab：蓝色下划线 + 亮色文字
- 非激活Tab：灰色文字，hover变亮
- 内容区有 `min-height: 400px` + `overflow-y: auto`

---

## 任务1: 后端API补全

### 需要改的文件
`~/Desktop/CiteFlow/api.py` (line 295-306)

### 当前代码 (line 295-306)
```python
        return {
            "status": analyst_output.get("status", "success"),
            "diagnosis": analyst_output.get("diagnosis"),
            "three_layer_chain": analyst_output.get("three_layer_chain"),
            "actions": analyst_output.get("actions", []),
            "competitor_gap": analyst_output.get("competitor_gap"),
            "one_line_verdict": analyst_output.get("one_line_verdict", ""),
            "engine_comparison": analyst_output.get("engine_comparison"),
            "engine_insights": analyst_output.get("engine_insights", []),
            "content_templates": analyst_output.get("content_templates"),
            "error": analyst_output.get("error"),
        }
```

### 改为
```python
        return {
            "status": analyst_output.get("status", "success"),
            "diagnosis": analyst_output.get("diagnosis"),
            "three_layer_chain": analyst_output.get("three_layer_chain"),
            "actions": analyst_output.get("actions", []),
            "competitor_gap": analyst_output.get("competitor_gap"),
            "one_line_verdict": analyst_output.get("one_line_verdict", ""),
            "engine_comparison": analyst_output.get("engine_comparison"),
            "engine_insights": analyst_output.get("engine_insights", []),
            "engine_recommendations": analyst_output.get("engine_recommendations", []),
            "b_class_perception": analyst_output.get("b_class_perception"),
            "c_class_matrix": analyst_output.get("c_class_matrix"),
            "content_templates": analyst_output.get("content_templates"),
            "error": analyst_output.get("error"),
        }
```

### 验证方法
- 重启后端，调一次 /api/analyst，确认响应里包含 b_class_perception 和 c_class_matrix 字段

---

## 任务2: 新建 scan-analyst-report.tsx

### 需要建的文件
`~/Desktop/CiteFlow/frontend/components/scan-analyst-report.tsx`

### 组件接口

```tsx
interface ScanAnalystReportProps {
  data: any;                        // 合并后的数据：probe + analyst output
  onBackToBriefing: () => void;     // 返回军师阅卷
  onViewDoctor: () => void;         // 跳转处方
}
```

### 数据提取（从 data prop 解构，所有字段加 `||` 兜底）

```tsx
// Tab 1: 诊断报告
const oneLineVerdict = data?.one_line_verdict || "";
const diagnosis = data?.diagnosis || {};
const threeLayerChain = data?.three_layer_chain || {};
const severity = diagnosis?.severity || "healthy";  // "critical" | "warning" | "healthy"

// Tab 2: 竞品战场
const competitorGap = data?.competitor_gap || {};
const losingDims = competitorGap?.losing_dimensions || [];
const winningDims = competitorGap?.winning_dimensions || [];
const rootCause = competitorGap?.root_cause || "";
const counterStrategy = competitorGap?.counter_strategy || "";
const cClassMatrix = data?.c_class_matrix || {};

// Tab 3: 引擎情报
const engineComparison = data?.engine_comparison || {};
const engineInsights = data?.engine_insights || [];
const engineRecommendations = data?.engine_recommendations || [];

// Tab 4: AI 认知
const bClassPerception = data?.b_class_perception || {};
const gapReport = data?.probe?.gap_report || data?.gap_report || {};
```

### 主结构代码

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface ScanAnalystReportProps {
  data: any;
  onBackToBriefing: () => void;
  onViewDoctor: () => void;
}

type TabId = "diagnosis" | "competitor" | "engine" | "perception";

const TABS: { id: TabId; label: string }[] = [
  { id: "diagnosis", label: "诊断报告" },
  { id: "competitor", label: "竞品战场" },
  { id: "engine", label: "引擎情报" },
  { id: "perception", label: "AI 认知" },
];

export function ScanAnalystReport({ data, onBackToBriefing, onViewDoctor }: ScanAnalystReportProps) {
  const [activeTab, setActiveTab] = useState<TabId>("diagnosis");

  // ── 数据提取 ──
  const oneLineVerdict = data?.one_line_verdict || "";
  const diagnosis = data?.diagnosis || {};
  const threeLayerChain = data?.three_layer_chain || {};
  const severity = diagnosis?.severity || "healthy";

  const competitorGap = data?.competitor_gap || {};
  const losingDims: any[] = competitorGap?.losing_dimensions || [];
  const winningDims: any[] = competitorGap?.winning_dimensions || [];
  const rootCause = competitorGap?.root_cause || "";
  const counterStrategy = competitorGap?.counter_strategy || "";
  const cClassMatrix: any = data?.c_class_matrix || {};

  const engineComparison: any = data?.engine_comparison || {};
  const engineInsights: string[] = data?.engine_insights || [];
  const engineRecommendations: string[] = data?.engine_recommendations || [];

  const bClassPerception: any = data?.b_class_perception || {};
  const gapReport: any = data?.probe?.gap_report || data?.gap_report || {};

  // ── 严重度颜色 ──
  const severityColor = severity === "critical" ? "#EF4444" : severity === "warning" ? "#F59E0B" : "#22C55E";
  const severityBg = severity === "critical" ? "rgba(239,68,68,0.08)" : severity === "warning" ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)";
  const severityLabel = severity === "critical" ? "严重" : severity === "warning" ? "警告" : "良好";

  // ── 渲染Tab按钮 ──
  function renderTabBar() {
    return (
      <div className="flex gap-1 mb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-2.5 text-xs font-medium transition-all duration-200"
              style={{
                color: isActive ? "#EDEDEF" : "#5E5E78",
                borderBottom: isActive ? "2px solid #3B82F6" : "2px solid transparent",
                marginBottom: -1,
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "#9A9AB0"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "#5E5E78"; }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }

  // ── Tab 1: 诊断报告 ──
  function renderDiagnosisTab() {
    return (
      <div className="flex flex-col gap-6">
        {/* 一行结论 */}
        <div className="flex items-start gap-3">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 mt-0.5"
            style={{ background: severityBg, color: severityColor, border: `1px solid ${severityColor}20` }}>
            {severityLabel}
          </span>
          <p className="text-lg font-semibold leading-snug" style={{ color: "#EDEDEF" }}>
            {oneLineVerdict || "暂无诊断结论"}
          </p>
        </div>

        {/* 三层诊断链 */}
        <div className="rounded-xl p-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(59,130,246,0.4)" }}>
            三层诊断链
          </p>
          <div className="flex gap-4">
            {/* ① 现象 */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono mb-2" style={{ color: "#5E5E78" }}>① 现象</p>
              <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>
                {threeLayerChain?.observation || "暂无数据"}
              </p>
            </div>
            {/* 箭头 */}
            <span className="text-lg shrink-0 mt-4" style={{ color: "#3A3A48" }}>→</span>
            {/* ② 原因 */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono mb-2" style={{ color: "#5E5E78" }}>② 原因</p>
              <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>
                {threeLayerChain?.explanation || "暂无数据"}
              </p>
            </div>
            {/* 箭头 */}
            <span className="text-lg shrink-0 mt-4" style={{ color: "#3A3A48" }}>→</span>
            {/* ③ 影响 */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono mb-2" style={{ color: "#5E5E78" }}>③ 影响</p>
              <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>
                {threeLayerChain?.implication || "暂无数据"}
              </p>
            </div>
          </div>
        </div>

        {/* 核心诊断 */}
        <div className="rounded-xl p-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(59,130,246,0.4)" }}>
            核心诊断
          </p>
          <p className="text-sm font-semibold mb-2" style={{ color: "#EDEDEF" }}>
            {diagnosis?.core_problem || "暂无"}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "#6A6A82" }}>
            {diagnosis?.problem_detail || ""}
          </p>
        </div>
      </div>
    );
  }

  // ── Tab 2: 竞品战场 ──
  function renderCompetitorTab() {
    const hasData = losingDims.length > 0 || winningDims.length > 0;
    if (!hasData) {
      return <EmptyTab text="暂无竞品对比数据，请先完成 Probe 完整侦察" />;
    }
    return (
      <div className="flex flex-col gap-6">
        {/* 胜负维度 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 领先 */}
          <div className="rounded-xl p-5"
            style={{ background: "rgba(34,197,94,0.03)", border: "1px solid rgba(34,197,94,0.10)" }}>
            <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(34,197,94,0.5)" }}>
              你领先的维度 ({winningDims.length})
            </p>
            {winningDims.length === 0 ? (
              <p className="text-xs" style={{ color: "#5E5E78" }}>暂无领先维度</p>
            ) : (
              <div className="flex flex-col gap-2">
                {winningDims.map((dim: any, i: number) => (
                  <div key={i} className="rounded-lg px-3 py-2"
                    style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.08)" }}>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-medium" style={{ color: "#EDEDEF" }}>{dim?.dimension || dim?.name || ""}</p>
                      <span className="text-[10px] font-mono" style={{ color: "#22C55E" }}>
                        {dim?.gap != null ? `+${dim.gap}%` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* 落后 */}
          <div className="rounded-xl p-5"
            style={{ background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.10)" }}>
            <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(239,68,68,0.5)" }}>
              你落后的维度 ({losingDims.length})
            </p>
            {losingDims.length === 0 ? (
              <p className="text-xs" style={{ color: "#5E5E78" }}>暂无落后维度</p>
            ) : (
              <div className="flex flex-col gap-2">
                {losingDims.map((dim: any, i: number) => (
                  <div key={i} className="rounded-lg px-3 py-2"
                    style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.08)" }}>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-medium" style={{ color: "#EDEDEF" }}>{dim?.dimension || dim?.name || ""}</p>
                      <span className="text-[10px] font-mono" style={{ color: "#EF4444" }}>
                        {dim?.gap != null ? `${dim.gap}%` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 根因 + 策略 */}
        {(rootCause || counterStrategy) && (
          <div className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {rootCause && (
              <>
                <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-2" style={{ color: "rgba(239,68,68,0.5)" }}>
                  根因
                </p>
                <p className="text-xs leading-relaxed mb-4" style={{ color: "#9A9AB0" }}>{rootCause}</p>
              </>
            )}
            {counterStrategy && (
              <>
                <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-2" style={{ color: "rgba(59,130,246,0.5)" }}>
                  对策
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>{counterStrategy}</p>
              </>
            )}
          </div>
        )}

        {/* C类胜负矩阵 */}
        {cClassMatrix?.wins != null && (
          <div className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(59,130,246,0.4)" }}>
              C类查询胜负矩阵
            </p>
            <div className="flex gap-6 mb-3">
              <span style={{ color: "#22C55E" }}>✅ 胜 {cClassMatrix.wins || 0}场</span>
              <span style={{ color: "#EF4444" }}>❌ 负 {cClassMatrix.losses || 0}场</span>
              <span style={{ color: "#F59E0B" }}>🤝 平 {cClassMatrix.ties || 0}场</span>
            </div>
            {/* 维度列表（如有） */}
            {(cClassMatrix?.win_dimensions?.length > 0) && (
              <p className="text-[10px] mt-2" style={{ color: "#5E5E78" }}>
                胜在：{(cClassMatrix.win_dimensions || []).join("、")}
              </p>
            )}
            {(cClassMatrix?.lose_dimensions?.length > 0) && (
              <p className="text-[10px] mt-1" style={{ color: "#5E5E78" }}>
                负在：{(cClassMatrix.lose_dimensions || []).join("、")}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Tab 3: 引擎情报 ──
  function renderEngineTab() {
    const engines = ["gpt", "gemini", "haiku"] as const;
    const engineNames: Record<string, string> = { gpt: "ChatGPT", gemini: "Gemini", haiku: "Claude" };
    const hasEngineData = engines.some(e => engineComparison?.[e]);

    if (!hasEngineData && engineInsights.length === 0) {
      return <EmptyTab text="暂无引擎对比数据，请先完成 Probe 完整侦察" />;
    }

    return (
      <div className="flex flex-col gap-6">
        {/* 三引擎卡片 */}
        {hasEngineData && (
          <div className="grid grid-cols-3 gap-3">
            {engines.map((eng) => {
              const ed = engineComparison?.[eng] || {};
              const rate = ed?.citation_rate ?? null;
              const recRate = ed?.recommendation_rate ?? null;
              return (
                <div key={eng} className="rounded-xl p-4 text-center"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-xs font-medium mb-3" style={{ color: "#EDEDEF" }}>{engineNames[eng]}</p>
                  {rate != null ? (
                    <>
                      <p className="text-2xl font-mono font-bold mb-1" style={{ color: rate >= 20 ? "#22C55E" : rate >= 10 ? "#F59E0B" : "#EF4444" }}>
                        {rate}%
                      </p>
                      <p className="text-[10px]" style={{ color: "#5E5E78" }}>引用率</p>
                      {recRate != null && (
                        <p className="text-xs font-mono mt-1" style={{ color: "#6A6A82" }}>推荐 {recRate}%</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: "#5E5E78" }}>暂无数据</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 洞察 */}
        {engineInsights.length > 0 && (
          <div className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(59,130,246,0.4)" }}>
              引擎洞察
            </p>
            <div className="flex flex-col gap-2">
              {engineInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-1 w-1 h-1 rounded-full shrink-0" style={{ background: "rgba(59,130,246,0.5)" }} />
                  <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 优化建议 */}
        {engineRecommendations.length > 0 && (
          <div className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(34,197,94,0.5)" }}>
              优化方向
            </p>
            <div className="flex flex-col gap-2">
              {engineRecommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-1 w-1 h-1 rounded-full shrink-0" style={{ background: "rgba(34,197,94,0.5)" }} />
                  <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Tab 4: AI 认知 ──
  function renderPerceptionTab() {
    const aiDescription = bClassPerception?.ai_description || bClassPerception?.ai_perception || "";
    const brandSelf = bClassPerception?.brand_self || bClassPerception?.self_description || "";
    const gapDesc = bClassPerception?.gap_description || "";
    const alignmentScore = gapReport?.alignment_score ?? bClassPerception?.alignment_score ?? null;

    if (!aiDescription && !brandSelf) {
      return <EmptyTab text="暂无 AI 认知数据。B类查询词结果不足，无法进行认知对比分析" />;
    }

    return (
      <div className="flex flex-col gap-6">
        {/* 左右对比 */}
        <div className="grid grid-cols-2 gap-4">
          {/* AI 眼中的你 */}
          <div className="rounded-xl p-5"
            style={{ background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.10)" }}>
            <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(59,130,246,0.5)" }}>
              AI 眼中的你
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>
              {aiDescription || "暂无数据"}
            </p>
          </div>
          {/* 你眼中的自己 */}
          <div className="rounded-xl p-5"
            style={{ background: "rgba(34,197,94,0.03)", border: "1px solid rgba(34,197,94,0.10)" }}>
            <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(34,197,94,0.5)" }}>
              你眼中的自己
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>
              {brandSelf || "暂无数据"}
            </p>
          </div>
        </div>

        {/* 差距描述 */}
        {gapDesc && (
          <div className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(239,68,68,0.5)" }}>
              AI 认知差距
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>{gapDesc}</p>
          </div>
        )}

        {/* 对齐度（来自 gap_report） */}
        {alignmentScore != null && (
          <div className="rounded-xl p-4 text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-2" style={{ color: "#6A6A82" }}>
              认知对齐度
            </p>
            <p className="text-xl font-mono font-bold"
              style={{ color: alignmentScore >= 60 ? "#22C55E" : alignmentScore >= 30 ? "#F59E0B" : "#EF4444" }}>
              {alignmentScore}/100
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── 空数据占位 ──
  function EmptyTab({ text }: { text: string }) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
        <p className="text-sm" style={{ color: "#5E5E78" }}>{text}</p>
      </div>
    );
  }

  // ── 按钮样式 ──
  const btnBase = "py-2.5 px-6 text-xs font-semibold tracking-wide transition-all duration-300 rounded-lg";
  const btnPrimary = "bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.22)] text-[#7DD3FC]";
  const btnHover = "hover:bg-[rgba(59,130,246,0.20)] hover:border-[rgba(59,130,246,0.38)]";

  // ── 根据 activeTab 渲染内容 ──
  const tabContent: Record<TabId, JSX.Element> = {
    diagnosis: renderDiagnosisTab(),
    competitor: renderCompetitorTab(),
    engine: renderEngineTab(),
    perception: renderPerceptionTab(),
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden px-4">
      <div className="flex-1 flex flex-col overflow-y-auto py-4" style={{ scrollbarWidth: "none" }}>
        {/* 返回链接 */}
        <button
          onClick={onBackToBriefing}
          className="text-[10px] font-mono tracking-[0.1em] uppercase mb-4 self-start transition-colors duration-200"
          style={{ color: "#4A4A60" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#7DD3FC"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#4A4A60"; }}
        >
          ← 返回军师阅卷
        </button>

        {/* Tab 导航 */}
        {renderTabBar()}

        {/* Tab 内容 */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex-1"
          style={{ minHeight: 400 }}
        >
          {tabContent[activeTab]}
        </motion.div>

        {/* 底部 CTA */}
        <div className="mt-8">
          <button
            onClick={onViewDoctor}
            className={`w-full ${btnBase} ${btnPrimary} ${btnHover}`}
          >
            查看处方 →
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 任务3: page.tsx 集成 + demo页

### 需要改的文件

**文件1**: `~/Desktop/CiteFlow/frontend/app/(app)/scan/page.tsx`

1. 顶部加 import（line 14附近）:
```tsx
import { ScanAnalystReport } from "@/components/scan-analyst-report";
```

2. 替换 line 861-864:
```tsx
// 旧代码:
{phase === "report" && (
  <div className="flex items-center justify-center h-64">
    <p className="text-[#6A6A82]">诊断报告页面待开发</p>
  </div>
)}

// 新代码:
{phase === "report" && (
  <ScanAnalystReport
    data={data}
    onBackToBriefing={() => setAnalystPhase("briefing")}
    onViewDoctor={() => setStep("doctor")}
  />
)}
```

**文件2**: `~/Desktop/CiteFlow/frontend/app/(app)/dev/analyst-demo/page.tsx`

把 MOCK_PROBE 之后的分析结果展示区域也换成 ScanAnalystReport:

```tsx
// 在 analyst-demo/page.tsx 中，state 加 analystData
const [analystData, setAnalystData] = useState<any>(null);

// onComplete 回调中：
onComplete={(analystOutput: any) => {
  setAnalystData(analystOutput);  // 存 analyst 结果
}}

// 渲染 report 时（line 182-186附近）:
{analystData && (
  <ScanAnalystReport
    data={{ ...MOCK_PROBE, ...analystData }}
    onBackToBriefing={() => setAnalystData(null)}
    onViewDoctor={() => {}}
  />
)}
```

---

## CHECKLIST 自检

**任务1 API补全:**
- [ ] /api/analyst 响应包含 engine_recommendations
- [ ] /api/analyst 响应包含 b_class_perception
- [ ] /api/analyst 响应包含 c_class_matrix

**任务2 scan-analyst-report.tsx:**
- [ ] 4个Tab按钮可点击切换，激活Tab蓝色下划线
- [ ] Tab 1 展示 one_line_verdict + severity badge + 三层链 + 核心诊断
- [ ] Tab 2 展示 领先/落后维度 + 根因对策 + C类胜负矩阵
- [ ] Tab 3 展示 三引擎卡片 + 洞察 + 优化方向
- [ ] Tab 4 展示 AI眼中的你 vs 你眼中的自己 + 对齐度
- [ ] 各Tab数据为空时显示 EmptyTab 占位文字，不报错
- [ ] "← 返回军师阅卷" 按钮可点击
- [ ] "查看处方 →" CTA 按钮可点击
- [ ] Tab 切换有 fadeIn + slideUp 动画 (framer-motion)
- [ ] 所有样式用 inline style，不用 Tailwind

**任务3 page.tsx:**
- [ ] 军师阅卷完成后点"查看诊断报告" → 进入诊断报告页面
- [ ] 点"← 返回军师阅卷" → 回到军师阅卷
- [ ] 点"查看处方 →" → 跳转到 doctor step

---

## 交付格式

```
自检结果: X/3 任务1 + X/11 任务2 + X/3 任务3 = XX/17
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改 scan-analyst-briefing.tsx** — 军师阅卷完全不动
2. **不要改 scan-sidebar.tsx** — 侧边栏不动
3. **不要用 Tailwind 类** — 全部 inline style，和现有组件一致
4. **所有数据字段加 `||` 兜底** — 后端可能某个字段为 null/undefined
5. **不要引用 content_templates** — 这个属于 Doctor，Analyst 报告不展示
6. **actions 字段目前为空** — Doctor 才生成处方，Analyst 报告不展示 actions
7. **b_class_perception / c_class_matrix 可能为 null** — 做好空数据处理
8. **engine_comparison 的字段名可能是 engine_results** — 如果用 engine_comparison 取不到数据，fallback 到 data?.probe?.engine_results
