# TASK_DOCTOR_INDEPENDENT.md — Doctor 处方工作室 Phase 1

> 药老出品 · 2026-05-22
> 目标: Doctor 成为独立的工作台页面，用户在此查看处方、执行追踪、重新生成
> 预计工时: 4h

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 创建处方工作室组件 | `frontend/components/scan-doctor-workshop.tsx`（新建） | 3h |
| 2 | 页面接入工作室 | `frontend/app/(app)/scan/page.tsx` | 0.5h |
| 3 | 视觉验证 + 边界处理 | 浏览器实测 | 0.5h |

**完成标准**: 
- Doctor step 的 "report" 阶段不再是简单的 ScanPrescriptionSteps 平铺
- 用户看到：策略总览卡 → 执行概览（进度+P0警告）→ P0/P1/P2三段处方清单 → CTA按钮
- 每条处方的 7 个字段全部可展开查看（target_page, what_to_add, expected_impact, timeline, how_to_verify, evidence, difficulty）
- 执行勾选持久化到 localStorage，进度条实时响应
- "重新生成处方" 按钮回到 briefing 重新调 /api/doctor
- "重新体检" 按钮触发全流程（暂用 alert 占位）
- 方法论标签区域预留（显示"基于 CiteFlow CITE 四维模型 · N项研究"但不依赖后端，N 从 knowledge_sources.length 计算）

---

## 任务1: 创建 scan-doctor-workshop.tsx

### 问题
当前 Doctor "report" 阶段直接用 `<ScanPrescriptionSteps showHeader={true}>`，这是一个嵌入式的紧凑组件。处方工作室需要完全不同的布局：顶部策略总览 + 执行概览 + P0/P1/P2 三段分组 + 底部 CTA。不能复用现有组件的布局模式，需要新建。

### 需要改的文件
`frontend/components/scan-doctor-workshop.tsx`（新建）

### 不修改的文件（现有组件继续在 dashboard 里用）
- `frontend/components/scan-prescription-steps.tsx` — 仪表盘嵌入式组件，不改
- `frontend/components/scan-doctor-briefing.tsx` — briefing 阶段不变
- `frontend/components/scan-doctor-generating.tsx` — generating 阶段不变

### 组件 Props

```typescript
interface ScanDoctorWorkshopProps {
  /** 处方列表，来自 /api/doctor 返回的 prescription 字段 */
  prescription: PrescriptionItem[];
  /** 整体策略总结，来自 /api/doctor 返回的 summary 字段 */
  summary: string;
  /** 引用论文数量，来自 /api/doctor 返回的 knowledge_sources.length */
  paperCount: number;
  /** 当前品牌域名（用于 localStorage 执行状态 key） */
  domain: string;
  /** 品牌名（显示在页面标题） */
  brandName?: string;
  /** 用户点击"重新生成处方" */
  onRegenerate: () => void;
  /** 用户点击"重新体检" */
  onReexamine: () => void;
}
```

### 实现要求

#### 整体布局

```
┌─────────────────────────────────────────────────────────┐
│  ← 返回仪表盘          {brandName} 处方工作室            │
│                                                         │
│  ┌─ ZONE 1: 策略总览 ────────────────────────────────┐  │
│  │  🧠 核心策略                                       │  │
│  │  {summary}  ← DoctorOutput.summary，一字不改        │  │
│  │                                                    │  │
│  │  基于 CiteFlow CITE 四维模型 · 融合 {paperCount} 项研究 │  │
│  │  ← 方法论标签 UI 已预留，paperCount 从 prop 来        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ ZONE 2: 执行概览 ────────────────────────────────┐  │
│  │  执行进度  ████████░░░░░░░░░░░░  {done}/{total}    │  │
│  │  ← progress bar 动画                                │  │
│  │  {p0Count}条P0待处理 ⚠️  ·  {p1Count}条P1  ·  {p2Count}条P2  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ ZONE 3: 处方清单 ────────────────────────────────┐  │
│  │  ┌─ P0 · 紧急（{p0Total}条）──────────────────┐   │  │
│  │  │  🔴 {category}                             │   │  │
│  │  │     {action}                               │   │  │
│  │  │     {target_page}                          │   │  │
│  │  │     ▶ 展开 → what_to_add / impact /        │   │  │
│  │  │              timeline / verify / evidence   │   │  │
│  │  │              / difficulty                  │   │  │
│  │  │     ☑ 标记已执行                           │   │  │
│  │  └────────────────────────────────────────┘   │   │  │
│  │  ┌─ P1 · 重要（{p1Total}条）────────────────┐   │   │  │
│  │  │  ...                                     │   │   │  │
│  │  └──────────────────────────────────────────┘   │   │
│  │  ┌─ P2 · 优化（{p2Total}条）────────────────┐   │   │  │
│  │  │  ...                                     │   │   │  │
│  │  └──────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ ZONE 4: CTA ─────────────────────────────────────┐  │
│  │  [🔄 重新体检]        [📋 重新生成处方]            │  │
│  │   Probe→Analyst         只重跑 Doctor              │  │
│  │   →Doctor 全流程        保留现有数据                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### ZONE 1: 策略总览卡片

```typescript
// 卡片容器
<div style={{
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(56,189,248,0.10)",
  padding: "20px 24px",
  marginBottom: 20,
}}>
  {/* 标题行 */}
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
    <span style={{ fontSize: 16 }}>🧠</span>
    <span style={{
      fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      color: "rgba(56,189,248,0.5)",
    }}>核心策略</span>
  </div>
  
  {/* summary 正文 - 直接渲染，不做任何转译 */}
  <p style={{
    fontSize: 13,
    color: "#C8C8D8",
    lineHeight: 1.6,
    margin: 0,
    marginBottom: 16,
  }}>{summary}</p>
  
  {/* 方法论标签 - UI 预留，内容从 prop 计算 */}
  <div style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    background: "rgba(56,189,248,0.06)",
    border: "1px solid rgba(56,189,248,0.12)",
  }}>
    <span style={{ fontSize: 10, color: "rgba(56,189,248,0.6)" }}>
      📚 基于 CiteFlow CITE 四维模型 · 融合 {paperCount} 项研究
    </span>
  </div>
</div>
```

**关键规则**：summary 直接渲染 `{summary}`，不用任何截断、美化、转译。

#### ZONE 2: 执行概览

复用 scan-prescription-steps 的进度条动画模式和统计逻辑，但不复用其组件。

```typescript
// 进度条
const donePercent = total > 0 ? (done.size / total) * 100 : 0;

<div style={{ marginBottom: 24 }}>
  {/* 进度条 */}
  <div style={{
    background: "rgba(255,255,255,0.04)",
    borderRadius: 9999,
    height: 4,
    marginBottom: 10,
  }}>
    <motion.div
      style={{
        background: "#38BDF8",
        borderRadius: 9999,
        height: 4,
      }}
      initial={{ width: 0 }}
      animate={{ width: `${donePercent}%` }}
      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
    />
  </div>
  
  {/* 统计行 */}
  <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12 }}>
    <span style={{ color: "#9A9AB0" }}>
      {done.size}/{total} 已完成
    </span>
    {p0Remaining > 0 && (
      <span style={{ color: "#EF4444" }}>⚠️ {p0Remaining}条P0待处理</span>
    )}
    <span style={{ color: "#5E5E78" }}>
      · {p1Total}条P1 · {p2Total}条P2
    </span>
  </div>
</div>
```

**数据来源**：全部是前端对 `prescription[]` 的纯聚合计算。零水数据。

#### ZONE 3: 处方清单 — P0/P1/P2 三段分组

这是最核心的改造。现有 ScanPrescriptionSteps 是平铺的，这里要按 priority 分成三个可折叠区段。

**分组逻辑**：

```typescript
// 按 priority 分组
const p0Items = prescription.filter(item => item.priority === "P0");
const p1Items = prescription.filter(item => item.priority === "P1");
const p2Items = prescription.filter(item => item.priority === "P2");

// 每个分组是一个可折叠区段
// P0 默认展开
// P1/P2 默认折叠（如果 P0 都做完则展开 P1）
```

**区段组件结构**（以 P0 为例）：

```typescript
function PrioritySection({ 
  priority, items, done, onToggleDone, defaultExpanded 
}: {
  priority: "P0" | "P1" | "P2";
  items: PrescriptionItem[];
  done: Set<number>;
  onToggleDone: (globalIndex: number) => void;
  defaultExpanded: boolean;
}) {
  const [collapsed, setCollapsed] = useState(!defaultExpanded);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  const config = PRIORITY_CONFIG[priority]; // 复用 scan-prescription-steps 的颜色配置
  const remaining = items.filter((_, i) => !done.has(globalIndexOf(item))).length;
  
  return (
    <div style={{ marginBottom: 16 }}>
      {/* 区段标题栏 — 可点击折叠 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "12px 16px",
          background: config.bg,
          border: `1px solid ${config.border}`,
          borderLeft: `3px solid ${config.leftBorder}`,
          cursor: "pointer",
        }}
      >
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 8px",
          color: config.color,
          background: config.bg,
          border: `1px solid ${config.border}`,
        }}>{config.label}</span>
        <span style={{ color: "#C8C8D8", fontSize: 13, fontWeight: 500 }}>
          {priority === "P0" ? "紧急" : priority === "P1" ? "重要" : "优化"}
        </span>
        <span style={{ color: "#5E5E78", fontSize: 12 }}>
          （{items.length}条{remaining < items.length ? `，${remaining}条未解决` : ""}）
        </span>
        <span style={{ marginLeft: "auto", color: "#5E5E78", fontSize: 10 }}>
          {collapsed ? "▶ 展开" : "▼ 收起"}
        </span>
      </button>
      
      {/* 折叠内容 */}
      {!collapsed && (
        <div style={{ padding: "8px 0" }}>
          {items.map((item, sectionIndex) => {
            // 找到 item 在 prescription 数组中的全局索引
            const globalIndex = prescription.indexOf(item);
            const isDone = done.has(globalIndex);
            const isExpanded = expandedIndex === globalIndex;
            
            return <PrescriptionCard 
              key={globalIndex}
              item={item}
              isDone={isDone}
              isExpanded={isExpanded}
              priority={priority}
              onToggleExpand={() => setExpandedIndex(isExpanded ? null : globalIndex)}
              onToggleDone={() => onToggleDone(globalIndex)}
            />;
          })}
        </div>
      )}
    </div>
  );
}
```

**单张处方卡片（PrescriptionCard）**：

```typescript
// 默认态（折叠）显示 3 行：
//   [☑] [P0] 技术优化 · 添加FAQPage结构化数据
//        /products
//
// 展开态额外显示 7 个字段：
//   ┌──────────────────────────────────┐
//   │ 📋 内容模板                      │
//   │ · {what_to_add[0]}               │
//   │ · {what_to_add[1]}               │
//   │                                  │
//   │ 📊 预期效果                      │
//   │ {expected_impact}                │
//   │                                  │
//   │ ⏱ 预计时间    {timeline}          │
//   │ 🔬 验证方法                      │
//   │ {how_to_verify}                  │
//   │                                  │
//   │ 📚 知识来源    {evidence}         │
//   │ 📊 难度       {difficulty}        │
//   └──────────────────────────────────┘
```

**卡片实现**（参考 scan-prescription-steps 的样式模式，但字段更多）：

```typescript
function PrescriptionCard({ item, isDone, isExpanded, priority, onToggleExpand, onToggleDone }) {
  const priConf = PRIORITY_CONFIG[priority];
  
  return (
    <div>
      {/* 折叠行 */}
      <button
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-checkbox]")) {
            onToggleDone();
          } else {
            onToggleExpand();
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "10px 14px",
          textAlign: "left",
          background: isDone ? "rgba(34,197,94,0.03)" : "rgba(255,255,255,0.012)",
          borderLeft: `2px solid ${priConf.leftBorder}`,
          borderTop: "1px solid rgba(255,255,255,0.04)",
          borderRight: "1px solid rgba(255,255,255,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          cursor: "pointer",
        }}
      >
        {/* Checkbox */}
        <span data-checkbox style={{
          width: 18, height: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: isDone ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
          border: isDone ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}>
          {isDone && <span style={{ color: "#22C55E", fontSize: 11 }}>✓</span>}
        </span>
        
        {/* Priority badge */}
        <span style={{
          fontSize: 10, fontWeight: 600,
          padding: "1px 6px",
          color: priConf.color,
          background: priConf.bg,
          border: `1px solid ${priConf.border}`,
          flexShrink: 0,
        }}>{priConf.label}</span>
        
        {/* 类别 + action + target_page */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 12, margin: 0,
            color: isDone ? "#5E5E78" : "#C8C8D8",
            textDecoration: isDone ? "line-through" : "none",
          }}>
            <span style={{ color: "#5E5E78", fontSize: 11 }}>{item.category}</span>
            <span style={{ color: "rgba(255,255,255,0.08)", margin: "0 6px" }}>·</span>
            {item.action}
          </p>
          {item.target_page && (
            <p style={{
              fontSize: 10, margin: "2px 0 0 0",
              color: "#5E5E78",
              fontFamily: "'JetBrains Mono', monospace",
            }}>{item.target_page}</p>
          )}
        </div>
        
        {/* 展开箭头 */}
        <span style={{ color: "#5E5E78", fontSize: 10, flexShrink: 0 }}>
          {isExpanded ? "▲" : "▼"}
        </span>
      </button>
      
      {/* 展开详情 — 全部 7 个字段 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              padding: "14px 18px",
              background: "rgba(255,255,255,0.008)",
              borderLeft: `2px solid ${priConf.leftBorder}`,
              borderRight: "1px solid rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              {/* 1. 内容模板 what_to_add[] */}
              {item.what_to_add && item.what_to_add.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <Label>📋 内容模板</Label>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {item.what_to_add.map((step, j) => (
                      <li key={j} style={{
                        fontSize: 12, color: "#C8C8D8",
                        padding: "3px 0", paddingLeft: 12,
                        lineHeight: 1.5,
                      }}>
                        <span style={{ color: "#38BDF8", marginRight: 6 }}>·</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* 2. 预期效果 expected_impact */}
              {item.expected_impact && (
                <div style={{ marginBottom: 10 }}>
                  <Label>📊 预期效果</Label>
                  <p style={{ fontSize: 12, color: "#34D399", margin: 0 }}>{item.expected_impact}</p>
                </div>
              )}
              
              {/* 3. 元信息行：timeline + difficulty */}
              <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 11 }}>
                {item.timeline && (
                  <span style={{ color: "#5E5E78" }}>⏱ 预计时间：<span style={{ color: "#9A9AB0" }}>{item.timeline}</span></span>
                )}
                {item.difficulty && (
                  <span style={{ color: "#5E5E78" }}>📊 难度：<span style={{ color: "#9A9AB0" }}>{item.difficulty}</span></span>
                )}
              </div>
              
              {/* 4. 验证方法 how_to_verify */}
              {item.how_to_verify && (
                <div style={{
                  marginBottom: 10,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <Label>🔬 如何验证</Label>
                  <p style={{ fontSize: 12, color: "#9A9AB0", margin: 0, lineHeight: 1.5 }}>
                    {item.how_to_verify}
                  </p>
                </div>
              )}
              
              {/* 5. 知识来源 evidence */}
              {item.evidence && (
                <div style={{ marginBottom: 0 }}>
                  <Label>📚 知识来源</Label>
                  <p style={{ fontSize: 11, color: "#5E5E78", margin: 0 }}>{item.evidence}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 辅助小组件
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "rgba(56,189,248,0.5)",
      margin: "0 0 4px 0",
    }}>{children}</p>
  );
}
```

**关键实现细节**：

1. **globalIndex 映射**：每个 item 在 prescription 数组中的全局索引用于 localStorage key。因为分组后 sectionIndex 不是全局的，需要用 `prescription.indexOf(item)` 找回全局索引。

2. **PRIORITY_CONFIG 复用**：从 scan-prescription-steps.tsx 复制颜色配置，不改原文件：
```typescript
const PRIORITY_CONFIG = {
  P0: { label: "P0", color: "#EF4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.20)", leftBorder: "rgba(239,68,68,0.40)" },
  P1: { label: "P1", color: "#F59E0B", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.20)", leftBorder: "rgba(245,158,11,0.25)" },
  P2: { label: "P2", color: "#9A9AB0", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", leftBorder: "rgba(255,255,255,0.06)" },
};
```

3. **localStorage 执行状态**：保持与 scan-prescription-steps 相同的 key 格式（`cf_prescription_done` + domain），这样用户在 dashboard 和 workshop 的勾选状态互相同步。

4. **空数据处理**：
   - `prescription.length === 0` → 显示"暂无处方数据，请重新生成"
   - `summary === ""` → 策略总览卡片显示"暂无策略总结"
   - `paperCount === 0` → 方法论标签显示"基于 CiteFlow CITE 四维模型"

5. **折叠逻辑**：
   - P0 区段默认展开
   - P1 区段在 P0 所有项都完成时默认展开，否则折叠
   - P2 区段在 P1 所有项都完成时默认展开，否则折叠

#### ZONE 4: CTA 按钮

```typescript
<div style={{
  display: "flex",
  gap: 12,
  justifyContent: "center",
  marginTop: 28,
  paddingTop: 20,
  borderTop: "1px solid rgba(255,255,255,0.04)",
}}>
  {/* 重新体检 — 次要按钮 */}
  <button
    onClick={onReexamine}
    style={{
      padding: "10px 20px",
      fontSize: 13,
      fontWeight: 500,
      color: "#9A9AB0",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      cursor: "pointer",
      transition: "all 0.3s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "rgba(255,255,255,0.08)";
      e.currentTarget.style.color = "#C8C8D8";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
      e.currentTarget.style.color = "#9A9AB0";
    }}
  >
    🔄 重新体检
  </button>
  
  {/* 重新生成处方 — 主要按钮 */}
  <button
    onClick={onRegenerate}
    style={{
      padding: "10px 24px",
      fontSize: 13,
      fontWeight: 500,
      color: "#7DD3FC",
      background: "rgba(56,189,248,0.08)",
      border: "1px solid rgba(56,189,248,0.18)",
      cursor: "pointer",
      transition: "all 0.3s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "rgba(56,189,248,0.18)";
      e.currentTarget.style.color = "#EDEDF5";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "rgba(56,189,248,0.08)";
      e.currentTarget.style.color = "#7DD3FC";
    }}
  >
    📋 重新生成处方
  </button>
</div>
```

**按钮下方小字说明**：
```typescript
<div style={{ display: "flex", gap: 32, justifyContent: "center", marginTop: 10 }}>
  <span style={{ fontSize: 10, color: "#5E5E78" }}>
    重新体检走 Probe → Analyst → Doctor 全流程，约4分钟
  </span>
  <span style={{ fontSize: 10, color: "#5E5E78" }}>
    重新生成处方保留现有数据，只重跑 Doctor，约1分钟
  </span>
</div>
```

### 组件完整文件结构

```
scan-doctor-workshop.tsx:
  ├── PRIORITY_CONFIG (内联常量)
  ├── SectionLabel 小组件
  ├── PrescriptionCard 小组件
  ├── PrioritySection 小组件
  ├── ScanDoctorWorkshop 主组件
  │   ├── 数据聚合：p0Items/p1Items/p2Items + done state
  │   ├── localStorage 读写：loadDoneState / saveDoneState
  │   ├── Zone 1: 策略总览卡片
  │   ├── Zone 2: 执行概览（进度条+统计）
  │   ├── Zone 3: PrioritySection×3
  │   ├── Zone 4: CTA 按钮
  │   └── Framer Motion 进场动画
```

### 验证方法
- **测试1**：在 Doctor report 阶段，确认看到 4 个 Zone（策略总览 → 进度 → 分组处方 → CTA）
- **测试2**：P0 区段默认展开，P1/P2 默认折叠。勾选 P0 全部完成后刷新页面，P1 自动展开
- **测试3**：点击处方卡片展开，确认看到全部 7 个字段（内容模板/预期效果/预计时间/验证方法/知识来源/难度/目标页面）
- **测试4**：勾选处方 → 进度条动画变化 → 刷新页面 → 勾选状态不丢失
- **测试5**：点击"重新生成处方" → 回到 briefing → 生成新处方 → 回到 workshop 显示新数据
- **测试6**：空数组情况 → prescription=[] 时显示"暂无处方数据"
- **测试7**：summary="" 时策略总览显示"暂无策略总结"
- **测试8**：dashboard 中的 ScanPrescriptionSteps 功能不受影响

---

## 任务2: page.tsx 接入工作室

### 需要改的文件
`frontend/app/(app)/scan/page.tsx`

### 实现要求

1. **import 新组件**：
```typescript
import { ScanDoctorWorkshop } from "@/components/scan-doctor-workshop";
```

2. **修改 renderDoctorContent 的 "report" 分支**，把 ScanPrescriptionSteps 替换为 ScanDoctorWorkshop：

```typescript
// 替换前 (line 1035-1044):
{phase === "report" && (
  <div className="max-w-[720px] mx-auto pt-4">
    <ScanPrescriptionSteps
      prescription={data?.prescription || []}
      summary={data?.prescription_summary || ""}
      domain={scanDomain}
      showHeader={true}
      onRegenerate={() => setDoctorPhase("briefing")}
    />
  </div>
)}

// 替换后:
{phase === "report" && (
  <div className="flex-1 ml-8 mr-[112px] overflow-y-auto">
    <div className="max-w-[780px] mx-auto pt-6 pb-8">
      <ScanDoctorWorkshop
        prescription={data?.prescription || []}
        summary={data?.prescription_summary || ""}
        paperCount={data?.knowledge_sources?.length || 0}
        domain={scanDomain}
        brandName={scanBrandName || scanDomain}
        onRegenerate={() => setDoctorPhase("briefing")}
        onReexamine={() => alert("重新体检功能开发中")}
      />
    </div>
  </div>
)}
```

**注意**：Doctor briefing 的 `onComplete` 回调目前只保存 `prescription` 和 `prescription_summary`（line 1019-1023）。需要额外保存 `knowledge_sources`：

```typescript
// 修改 onComplete (line 1018-1028):
onComplete={(doctorOutput: any) => {
  setData((prev: any) => ({
    ...prev,
    prescription: doctorOutput.prescription,
    prescription_summary: doctorOutput.summary,
    knowledge_sources: doctorOutput.knowledge_sources,  // ← 新增
  }));
  setDoctorPhase("generating");
  setTimeout(() => {
    setDoctorPhase("report");
  }, 3000);
}}
```

3. **Doctor 阶段的宽度**：workshop 比原来的窄屏报告需要更宽的空间。`max-w-[780px]` 而不是 `720px`。且需要 `overflow-y-auto` 因为处方列表可能很长。

4. **不要改动**：
   - Doctor briefing 和 generating 阶段保持不变
   - ScanPrescriptionSteps 的 import 保留（dashboard 还在用）
   - `hasDoctorData` 逻辑不变
   - sidebar 回调不变

### 验证方法
- **测试1**：在 Doctor step，确认 workshop 组件渲染（不是原来的 ScanPrescriptionSteps）
- **测试2**：点"重新生成处方" → 回到 briefing → 能正常调 /api/doctor → generating 动画 → 回到 workshop
- **测试3**：侧边栏点 Doctor → 已有数据时直接进入 workshop，无数据时进入 briefing
- **测试4**：从 dashboard 的 ScanPrescriptionSteps 勾选的条目，在 workshop 中同样显示为已勾选（localStorage 同步）
- **测试5**：浏览器 console 无红色报错

---

## 不需要改的文件（明确列出）

| 文件 | 原因 |
|------|------|
| `frontend/components/scan-prescription-steps.tsx` | 仪表盘嵌入式组件，功能不变 |
| `frontend/components/scan-doctor-briefing.tsx` | briefing 阶段不变 |
| `frontend/components/scan-doctor-generating.tsx` | generating 阶段不变 |
| `frontend/components/scan-sidebar.tsx` | 侧边栏回调已有 onDoctorClick |
| `frontend/components/scan-dashboard.tsx` | 仪表盘不涉及本次改动 |
| `frontend/lib/storage.ts` | 执行状态 localStorage key 格式不变 |
| `langgraph_app/` 下所有文件 | Phase 1 纯前端，不碰后端 |
| `api.py` | 不改 /api/doctor |

---

## CHECKLIST 自检

**任务1 scan-doctor-workshop.tsx:**
- [ ] 组件文件创建，export function ScanDoctorWorkshop
- [ ] Zone 1 策略总览：summary 直接渲染 + 方法论标签显示 paperCount
- [ ] Zone 2 执行概览：进度条动画 + done/total + P0/P1/P2 统计
- [ ] Zone 3 P0/P1/P2 三段分组：PrioritySection × 3
- [ ] Zone 3 每个 PrioritySection 可折叠/展开（P0 默认展开，P1/P2 条件展开）
- [ ] Zone 3 每张卡片可展开显示全部 7 个字段（what_to_add/impact/timeline/verify/evidence/difficulty/target_page）
- [ ] Zone 3 勾选功能：toggle done + localStorage 持久化 + 进度条实时响应
- [ ] Zone 4 CTA：两个按钮 + 说明文字
- [ ] PRIORITY_CONFIG 内联（不依赖 scan-prescription-steps）
- [ ] Framer Motion 进场动画（opacity + y:16）
- [ ] 空数据边界：prescription=[] / summary="" / paperCount=0
- [ ] localStorage key 与 ScanPrescriptionSteps 相同（cf_prescription_done + domain）
- [ ] component 文件只 export 一个 ScanDoctorWorkshop，无 default export

**任务2 page.tsx:**
- [ ] import ScanDoctorWorkshop
- [ ] report 分支替换为 ScanDoctorWorkshop（保留旧 import 不删）
- [ ] onComplete 回调追加保存 knowledge_sources
- [ ] max-w-[780px] + overflow-y-auto
- [ ] ScanPrescriptionSteps import 保留（dashboard 在用）
- [ ] 浏览器 console 无红色报错

---

## 交付格式

```
自检结果: X/13 任务1 + X/5 任务2 = XX/18
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改 scan-prescription-steps.tsx**。它是 dashboard 嵌入式组件，有自己的 showHeader/non-header 两种模式。workshop 是独立页面，新建文件。
2. **不要改 Doctor briefing 的内容**。briefing → generating → report 三步流程不变，只替换 report 的内容。
3. **不要改 localStorage key 格式**。与现有 scan-prescription-steps 共用 `cf_prescription_done:{domain}`，确保 dashboard 和 workshop 的勾选状态同步。
4. **不要编造方法论名词**。"CITE 四维模型" 是 UI 预留的固定文案，paperCount 从 prop 传入，其他内容等玄老 + 后端改造后再更新。
5. **所有字段直接渲染，不做转译**。`summary` 写什么就显示什么，`expected_impact` 写"A类引用率从10%提升至18-22%"就显示这个，不加"预计"前缀，不改成"提升12%"。
6. **mobile 暂不适配**，先做桌面端。
7. **不写 Tailwind class**，用 inline style，与现有代码风格一致。
8. **设计规范**：暗色主题 #0A0A0F / 卡片 #131318 / 边框 #222228 / 强调色 #3B82F6。但 workshop 组件运行在 scan 页面已有背景上，卡片用 `rgba(255,255,255,0.02)` 保持透明感。
