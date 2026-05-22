# TASK_DASHBOARD_NAV.md — 仪表盘侧边导航栏重构

> 药老出品 · 2026-05-19
> 目标: 把仪表盘侧边导航从扁平列表改为分组折叠，Analyst/Doctor作为独立产品突出显示
> 预计工时: 2-3小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | DASH_NAV 数据结构改为分组 | scan-dashboard.tsx | 0.5h |
| 2 | 侧边导航UI改为分组折叠样式 | scan-dashboard.tsx | 1.5h |
| 3 | Analyst/Doctor section加id + 导航支持 | scan-dashboard.tsx | 0.5h |
| 4 | 修复SECTION编号重复 | scan-dashboard.tsx | 0.1h |

**完成标准**: 侧边导航分3组折叠 + Analyst/Doctor独立显示 + 点击滚动 + IntersectionObserver高亮（仅已解锁模块）

---

## 现状

当前 `DASH_NAV` 是扁平数组（10项），侧边导航逐条渲染，没有分组。

```tsx
// 当前结构（扁平）
const DASH_NAV = [
  { id: "dash-score", label: "综合评分", num: "01" },
  { id: "dash-citation", label: "引用率分析", num: "02" },
  // ... 共10项
];
```

当前侧边导航位置：`left: 160, width: 96`
当前内容区：`paddingLeft: 120`（与sidebar右边缘有24px间距）

Analyst和Doctor section没有 `id` 属性，无法被导航滚动到。

---

## 任务1: DASH_NAV 数据结构改为分组

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 实现要求

删除旧的 `DASH_NAV` 数组，替换为分组结构。

**注意分组命名**：第三组叫"数据洞察"，不是"诊断执行"——因为里面的竞品维度对比、品牌诊断、体检进度全部是 Probe 层产出，跟 Analyst 诊断师无关。

```tsx
// 新结构（分组）
const DASH_NAV_GROUPS = [
  {
    id: "overview",
    label: "品牌概览",
    items: [
      { id: "dash-score", label: "综合评分" },
      { id: "dash-citation", label: "引用率分析" },
      { id: "dash-competitors", label: "竞品对比" },
    ],
  },
  {
    id: "ai-cognition",
    label: "AI认知",
    items: [
      { id: "dash-perception", label: "AI认知画像" },
      { id: "dash-engines", label: "引擎对比" },
      { id: "dash-gap", label: "认知差距" },
      { id: "dash-sources", label: "引用来源分析" },
    ],
  },
  {
    id: "data-insight",
    label: "数据洞察",
    items: [
      { id: "dash-comp-dimension", label: "竞品维度对比" },
      { id: "dash-diagnosis", label: "品牌诊断" },
      { id: "dash-progress", label: "体检进度" },
    ],
  },
];

// 独立产品（不在分组内）
const DASH_PRODUCTS = [
  { id: "dash-analyst", label: "Analyst 诊断师", icon: "📊" },
  { id: "dash-doctor", label: "Doctor 处方", icon: "💊" },
];
```

---

## 任务2: 侧边导航UI改为分组折叠样式

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 实现要求

#### 2.1 宽度与间距

侧边导航宽度从 96px 调整为 116px。
内容区 paddingLeft 从 120 调整为 140（sidebar 116 + 24px间距）。

```tsx
// 侧边导航（约第1140行）
<nav
  className="fixed top-0 h-screen flex flex-col justify-between shrink-0 z-20"
  style={{ left: 160, width: 116, ... }}
>

// 内容区（约第1198行）
<div ref={dashContentRef} className="..." style={{ ..., paddingLeft: 140 }}>
```

#### 2.2 分组折叠逻辑

每个分组默认展开，点击组标题可折叠/展开。

```tsx
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
  new Set(DASH_NAV_GROUPS.map((g) => g.id))
);

const toggleGroup = (groupId: string) => {
  setExpandedGroups((prev) => {
    const next = new Set(prev);
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    return next;
  });
};
```

#### 2.3 IntersectionObserver 改造

**关键**：Observer 只监听已解锁模块。锁定模块（Analyst/Doctor未解锁时）不监听，避免高亮用户用不了的东西。

```tsx
useEffect(() => {
  if (!dashContentRef.current) return;
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length > 0) {
        setDashActiveSection(visible[0].target.id);
      }
    },
    { rootMargin: "-15% 0px -65% 0px", threshold: 0 }
  );

  // 监听分组内的item（全部监听，这些始终可见）
  DASH_NAV_GROUPS.forEach((group) => {
    group.items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
  });

  // 只监听已解锁的 Analyst/Doctor
  if (isAnalystUnlocked) {
    const el = document.getElementById("dash-analyst");
    if (el) observer.observe(el);
  }
  if (isDoctorUnlocked) {
    const el = document.getElementById("dash-doctor");
    if (el) observer.observe(el);
  }

  return () => observer.disconnect();
}, [probe, data, isAnalystUnlocked, isDoctorUnlocked]);
```

#### 2.4 导航栏 Analyst/Doctor 点击逻辑

导航栏点击 Analyst/Doctor 的行为应与内容区 LockedSection 的点击行为一致：

- **未解锁**：调用 `handleLockedModuleClick("diagnosis")` 或 `handleLockedModuleClick("prescription")` → 弹预览弹窗
- **已解锁**：调用 `dashScrollTo` → 滚动到对应section

```tsx
function handleProductNavClick(productId: string) {
  if (productId === "dash-analyst") {
    if (!isAnalystUnlocked) {
      handleLockedModuleClick("diagnosis");
    } else {
      dashScrollTo("dash-analyst");
    }
  } else if (productId === "dash-doctor") {
    if (!isDoctorUnlocked) {
      handleLockedModuleClick("prescription");
    } else {
      dashScrollTo("dash-doctor");
    }
  }
}
```

#### 2.5 侧边导航渲染结构

```
┌───────────────────────────┐
│ ▾ 品牌概览                 │  ← 分组标题，点击折叠
│   综合评分                  │  ← 当前高亮（右侧蓝条）
│   引用率分析                │
│   竞品对比                  │
│                           │
│ ▾ AI认知                   │
│   AI认知画像                │
│   引擎对比                  │
│   认知差距                  │
│   引用来源分析              │
│                           │
│ ▾ 数据洞察                 │
│   竞品维度对比              │
│   品牌诊断                  │
│   体检进度                  │
│                           │
│ ───────────────────────── │  ← 分隔线
│                           │
│ 📊 Analyst 诊断师          │  ← 独立产品，未解锁显示🔒
│ 💊 Doctor 处方             │  ← 独立产品，未解锁显示🔒
│                           │
└───────────────────────────┘
```

**注意**：导航栏内不显示编号（01/02/03等），只显示标签文字。

#### 2.6 样式规范

**分组标题**：
```tsx
<button
  onClick={() => toggleGroup(group.id)}
  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono tracking-wider"
  style={{ color: "#5E5E78" }}
>
  <span>{group.label}</span>
  <motion.span
    animate={{ rotate: expandedGroups.has(group.id) ? 0 : -90 }}
    transition={{ duration: 0.2 }}
    style={{ fontSize: 10, color: "#4A4A60" }}
  >
    ▾
  </motion.span>
</button>
```

**分组内item**：保持现有的 item 样式（标签 + 右侧活跃指示条），但去掉 `num` 字段。

**Analyst/Doctor 独立产品样式**：
```tsx
<button
  onClick={() => handleProductNavClick(item.id)}
  className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-all group relative"
>
  {/* 图标 */}
  <span className="text-sm shrink-0">{item.icon}</span>

  {/* 标签 */}
  <span
    className="text-xs tracking-wide transition-all"
    style={{
      color: isActive ? "#E8E8F0" : "#8A8AA0",
      fontWeight: isActive ? 500 : 400,
    }}
  >
    {item.label}
  </span>

  {/* 锁定图标（未解锁时） */}
  {!isUnlocked && (
    <span className="ml-auto text-[10px]" style={{ color: "#4A4A60" }}>🔒</span>
  )}

  {/* 活跃指示条 */}
  {isActive && (
    <motion.div
      className="absolute right-0 w-0.5 rounded-l-full"
      style={{ height: 28, background: "#38BDF8", boxShadow: "0 0 8px rgba(56,189,248,0.4)" }}
      layoutId="active-dash-bar"
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    />
  )}
</button>
```

**分隔线**：在数据洞察组和独立产品之间
```tsx
<div className="mx-3 my-2 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
```

---

## 任务3: Analyst/Doctor section加id + 导航支持

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 实现要求

#### 3.1 给 Analyst section 加 id

当前代码（约第1832行）：
```tsx
{/* SECTION 6 — 诊断摘要 */}
{isFull && hasDiagnosis ? (
  <ScanDiagnosisSummary ... />
) : (
  <LockedSection ... />
)}
```

改为：
```tsx
{/* Analyst 诊断摘要 */}
<div id="dash-analyst">
  {isFull && hasDiagnosis ? (
    <ScanDiagnosisSummary ... />
  ) : (
    <LockedSection ... />
  )}
</div>
```

#### 3.2 给 Doctor section 加 id

当前代码（约第1861行）：
```tsx
{/* SECTION 4 — 处方执行步骤 */}
{isFull && hasPrescription && prescription.length > 0 ? (
  <ScanPrescriptionSteps ... />
) : (
  <LockedSection ... />
)}
```

改为：
```tsx
{/* Doctor 处方执行 */}
<div id="dash-doctor">
  {isFull && hasPrescription && prescription.length > 0 ? (
    <ScanPrescriptionSteps ... />
  ) : (
    <LockedSection ... />
  )}
</div>
```

#### 3.3 Analyst/Doctor 的解锁状态判断

```tsx
// 判断 Analyst 是否已解锁（有数据）
const isAnalystUnlocked = isFull && hasDiagnosis;

// 判断 Doctor 是否已解锁（有数据）
const isDoctorUnlocked = isFull && hasPrescription;
```

---

## 任务4: 修复SECTION编号重复

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 实现要求

当前有两个 SECTION 6：
- Line 1832: `{/* SECTION 6 — 诊断摘要 */}`
- Line 1966: `{/* SECTION 6 — 付费能力预告 */}`

改为：
```tsx
// Line 1832 → 改为任务3中的新注释
{/* Analyst 诊断摘要 */}

// Line 1861 → 改为任务3中的新注释
{/* Doctor 处方执行 */}

// Line 1966 → 修正编号
{/* SECTION 7 — 付费能力预告 */}
```

---

## 不要动的东西

1. **主侧边栏** (`scan-sidebar.tsx`) — 不改
2. **仪表盘内容区** — 不改（只加 `id` 包裹和修正注释）
3. **`handleLockedModuleClick`** — 保持不变，导航栏点击也复用它
4. **`dashActiveSection` 状态** — 保持不变
5. **`dashScrollTo` 函数** — 保持不变，它已经是通用的

---

## CHECKLIST 自检

**任务1 [数据结构]:**
- [ ] `DASH_NAV` 已删除
- [ ] `DASH_NAV_GROUPS` 定义正确（3组，10项，第三组名"数据洞察"）
- [ ] `DASH_PRODUCTS` 定义正确（2项，含icon）

**任务2 [侧边导航UI]:**
- [ ] sidebar width: 96 → 116
- [ ] content paddingLeft: 120 → 140
- [ ] `expandedGroups` 状态管理正确
- [ ] 分组标题可点击折叠/展开
- [ ] 分组内item无编号，只显示标签
- [ ] Analyst/Doctor有独立样式（图标+锁定）
- [ ] 分隔线正确显示
- [ ] IntersectionObserver只监听已解锁的Analyst/Doctor
- [ ] 导航栏点击未解锁Analyst/Doctor → 弹预览弹窗（不是升级弹窗）

**任务3 [section id]:**
- [ ] Analyst section有 `id="dash-analyst"`
- [ ] Doctor section有 `id="dash-doctor"`

**任务4 [SECTION编号]:**
- [ ] 诊断摘要注释改为 `{/* Analyst 诊断摘要 */}`
- [ ] 处方执行注释改为 `{/* Doctor 处方执行 */}`
- [ ] 付费能力预告注释改为 `{/* SECTION 7 */}`

---

## 交付格式

```
自检结果: X/3 任务1 + X/9 任务2 + X/2 任务3 + X/3 任务4 = XX/17
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. 分组折叠用 `AnimatePresence` + `motion.div` 实现平滑动画
2. 保持现有的右侧活跃指示条（蓝色竖条）样式
3. 导航栏内不显示编号（与ASCII图一致）
4. Observer 的依赖数组包含 `isAnalystUnlocked` 和 `isDoctorUnlocked`，解锁状态变化时重新监听
