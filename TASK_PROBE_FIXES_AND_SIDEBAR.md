# TASK_PROBE_FIXES_AND_SIDEBAR.md — Bug修复 + 侧边栏接线

> 药老出品 · 2026-05-16
> 目标: 修复升级流程审查发现的bug + 侧边栏Probe/Analyst/Doctor按钮接线
> 预计工时: 2-3小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | Bug: Landing Page"立即升级"跳转逻辑 | app/(marketing)/page.tsx | 0.5h |
| 2 | Bug: 侧边栏方案徽章升级后不刷新 | components/scan-sidebar.tsx | 0.5h |
| 3 | Bug: 删除demo模式 | scan/page.tsx + scan-result.tsx | 0.5h |
| 4 | 侧边栏Probe/Analyst/Doctor按钮接线 | components/scan-sidebar.tsx + scan/page.tsx | 1h |

**完成标准**: 所有bug修复 + 侧边栏按钮可点击（Light模式触发升级弹窗，Full模式跳转报告页）

---

## 任务1: Bug修复 — Landing Page"立即升级"跳转逻辑

### 问题

Landing Page的"立即升级"按钮跳转到/login，但用户登录后不知道要在哪里升级。需要：
1. 跳转到/scan?upgrade=1
2. scan/page.tsx读取URL参数，自动弹出UpgradeModal

### 需要修改的文件

1. `frontend/app/(marketing)/page.tsx`
2. `frontend/app/(app)/scan/page.tsx`

### 实现要求

**1. 修改Landing Page跳转逻辑**

```tsx
// app/(marketing)/page.tsx
// 找到定价按钮的onClick处理

onClick={() => {
  if (plan.cta === "联系销售") {
    window.location.href = "mailto:sales@citeflow.com";
  } else if (plan.cta === "立即升级") {
    // 检查是否已登录
    const token = localStorage.getItem("cf_token");
    if (token) {
      // 已登录 → 直接跳scan页并触发升级弹窗
      window.location.href = "/scan?upgrade=1";
    } else {
      // 未登录 → 跳登录页，登录后跳scan?upgrade=1
      window.location.href = "/login?redirect=/scan?upgrade=1";
    }
  } else {
    window.location.href = "/login";
  }
}}
```

**2. scan/page.tsx读取upgrade参数**

```tsx
// 在ScanPage组件中
const searchParams = useSearchParams();
const isDemo = searchParams.get("demo") === "1";
const shouldUpgrade = searchParams.get("upgrade") === "1";

// 在useEffect中，初始化完成后检查
useEffect(() => {
  // ... 现有的初始化逻辑 ...
  
  // 检查是否需要弹出升级弹窗
  if (shouldUpgrade && initialized) {
    setShowUpgradeModal(true);
    // 清除URL参数，避免刷新后再次弹出
    window.history.replaceState({}, "", "/scan");
  }
}, [initialized, shouldUpgrade]);
```

### 验证方法

- 测试1: 未登录点"立即升级" → 跳/login?redirect=/scan?upgrade=1
- 测试2: 已登录点"立即升级" → 跳/scan?upgrade=1 → UpgradeModal弹出
- 测试3: 升级完成后刷新页面 → UpgradeModal不再弹出

---

## 任务2: Bug修复 — 侧边栏方案徽章升级后不刷新

### 问题

scan-sidebar.tsx在useEffect([], [])里读getPlan()，只在组件挂载时读一次。用户升级后localStorage变了，但sidebar的plan state没更新，徽章还是显示"免费版"。

### 需要修改的文件

`frontend/components/scan-sidebar.tsx`

### 实现要求

**方案：监听storage事件**

```tsx
// 在useEffect中添加storage事件监听
useEffect(() => {
  // 初始读取
  setPlan(getPlan());
  
  // 监听storage变化（跨标签页也会触发）
  function handleStorageChange(e: StorageEvent) {
    if (e.key === "cf_plan") {
      setPlan(getPlan());
    }
  }
  
  window.addEventListener("storage", handleStorageChange);
  return () => window.removeEventListener("storage", handleStorageChange);
}, []);
```

**但这个方案有个问题**：同页面内的localStorage变化不会触发storage事件（storage事件只在其他标签页触发）。

**更好的方案：在page.tsx的handleUpgraded中强制刷新sidebar**

```tsx
// scan/page.tsx
function handleUpgraded() {
  setShowUpgradeModal(false);
  setPlan(getPlan()); // 更新plan状态
  
  // 触发重新扫描
  const params = lastScanParamsRef.current;
  if (params) {
    handleScan(params.domain, params.brandName, params.industry, params.targetMarket);
  }
}
```

**但sidebar是独立组件，page.tsx的state变化不会影响sidebar的plan state。**

**最终方案：通过props传递plan**

```tsx
// scan/page.tsx
const [plan, setPlan] = useState<Plan>(getPlan());

// 传递给sidebar
<ScanSidebar
  currentStep={currentSidebarStep}
  completedSteps={completedSidebarSteps}
  currentSubStep={currentSubStep}
  domain={scanDomain}
  brandName={scanBrandName}
  plan={plan}  // 新增
  onHomeClick={() => { if (step !== "loading") setStep("dashboard"); }}
  onStepClick={handleSidebarStepClick}
/>

// 升级后更新
function handleUpgraded() {
  setShowUpgradeModal(false);
  setPlan(getPlan()); // 更新plan状态
  // ... 其他逻辑
}
```

```tsx
// scan-sidebar.tsx
interface Props {
  // ... 现有props
  plan?: Plan;  // 新增，可选
}

export function ScanSidebar({ ..., plan: planProp }: Props) {
  const [planState, setPlanState] = useState<string>("free");
  
  // 优先使用外部传入的plan
  const plan = planProp || planState;
  
  // 只在没有外部plan时自己读取
  useEffect(() => {
    if (!planProp) {
      setPlanState(getPlan());
    }
  }, [planProp]);
  
  // ... 其他逻辑
}
```

### 验证方法

- 测试1: 升级后侧边栏徽章立即变为"专业版"
- 测试2: 刷新页面后徽章仍显示"专业版"

---

## 任务3: Bug修复 — 删除demo模式

### 问题

demo模式（/scan?demo=1）跳过登录和仪表盘，直接展示静态报告。这个模式没有实际价值，应该删除。

### 需要修改的文件

1. `frontend/app/(app)/scan/page.tsx`
2. `frontend/components/scan-result.tsx`

### 实现要求

**1. scan/page.tsx — 删除demo相关代码**

```tsx
// 删除：
const isDemo = searchParams.get("demo") === "1";

// 删除useEffect中的demo分支：
if (isDemo) {
  setStep("result");
  setMode("light");
  setScanDomain("ugreen.com");
  setScanBrandName("UGREEN");
  setInitialized(true);
  return;
}
```

**2. scan-result.tsx — 删除DEMO_DATA和hasRealData逻辑**

```tsx
// 删除DEMO_DATA常量（第136-159行）
const DEMO_DATA = { ... };

// 修改ProbeTab，移除hasRealData逻辑
function ProbeTab({ data }: { data: any }) {
  const probe = data?.probe || data || {};
  // 直接使用probe，不再fallback到DEMO_DATA
  const cs = probe?.company_score || {};
  const cm = probe?.citation_metrics || {};
  // ...
}
```

**3. Landing Page — 检查是否有链接到/scan?demo=1**

如果有，删除或改为/login。

### 验证方法

- 测试1: 访问/scan?demo=1 → 跳转到/login（因为没有token）
- 测试2: 已登录访问/scan → 正常显示对话模式或Dashboard
- 测试3: scan-result.tsx中没有DEMO_DATA引用

---

## 任务4: 侧边栏Probe/Analyst/Doctor按钮接线

### 问题

侧边栏的Probe/Analyst/Doctor按钮是死的——点击什么都不发生。需要接线：
- Light模式：点击触发UpgradeModal
- Full模式：点击跳转到对应报告页

### 需要修改的文件

1. `frontend/components/scan-sidebar.tsx`
2. `frontend/app/(app)/scan/page.tsx`

### 实现要求

**1. scan/page.tsx — 扩展Step类型和handleSidebarStepClick**

```tsx
// 扩展Step类型
type Step = "idle" | "loading" | "result" | "error" | "dashboard" | "completed" | "resume" | "briefing" | "probe_loading" | "probe_report";

// 修改handleSidebarStepClick
function handleSidebarStepClick(stepId: string) {
  if (step === "loading") return;
  
  if (stepId === "input") {
    if (data) {
      setStep("completed");
    } else {
      setStep("idle");
    }
    return;
  }
  
  if (stepId === "probe") {
    if (!hasFullAccess()) {
      setShowUpgradeModal(true);
      return;
    }
    if (data && mode === "full") {
      setStep("probe_report");
    }
    return;
  }
  
  if (stepId === "analyst") {
    if (!hasFullAccess()) {
      setShowUpgradeModal(true);
      return;
    }
    // Analyst报告页暂未开发，显示提示
    alert("Analyst诊断师报告即将上线");
    return;
  }
  
  if (stepId === "doctor") {
    if (!hasFullAccess()) {
      setShowUpgradeModal(true);
      return;
    }
    // Doctor处方页暂未开发，显示提示
    alert("Doctor处方即将上线");
    return;
  }
  
  if (stepId === "loop") {
    // 闭环步骤暂未开发
    alert("闭环功能即将上线");
    return;
  }
}
```

**2. scan-sidebar.tsx — 修改按钮状态逻辑**

```tsx
// 修改getStepStatus函数
function getStepStatus(stepId: string): StepStatus {
  // 初步体检
  if (stepId === "input") {
    if (completedSteps.includes(stepId)) return "completed";
    if (stepId === currentStep) return "current";
    return "locked";
  }
  
  // Probe/Analyst/Doctor
  if (["probe", "analyst", "doctor"].includes(stepId)) {
    if (!hasFullAccess()) return "locked";  // 未付费：锁定
    if (completedSteps.includes(stepId)) return "completed";
    if (stepId === currentStep) return "current";
    return "available";  // 已付费但未完成：可点击
  }
  
  // 闭环
  if (stepId === "loop") {
    return "locked";  // 暂未开发
  }
  
  return "locked";
}

// 修改按钮的onClick
<button
  onClick={() => {
    if (status === "locked") {
      // 未付费 → 触发升级弹窗
      if (!hasFullAccess()) {
        onUpgradeClick?.();
      }
      return;
    }
    onStepClick?.(stepId);
  }}
  // ...
/>
```

**3. scan/page.tsx — 传递onUpgradeClick给sidebar**

```tsx
<ScanSidebar
  // ... 现有props
  onUpgradeClick={() => setShowUpgradeModal(true)}
/>
```

**4. scan/page.tsx — 渲染Probe报告页**

```tsx
{step === "probe_report" && (
  <ProbeReport
    data={data}
    domain={scanDomain}
    brandName={scanBrandName}
    onUpgradeClick={() => setShowUpgradeModal(true)}
    onBack={() => setStep("dashboard")}
  />
)}
```

### 侧边栏按钮状态总结

| 按钮 | Light模式 | Full模式（未完成） | Full模式（已完成） |
|------|----------|-------------------|-------------------|
| 初步体检 | ✅/🔵 | ✅ | ✅ |
| Probe 侦察兵 | 🔒→弹窗 | 🔵 可点击 | ✅ |
| Analyst 诊断师 | 🔒→弹窗 | 🔵 可点击 | ✅ |
| Doctor 处方 | 🔒→弹窗 | 🔵 可点击 | ✅ |
| 闭环 | 🔒 | 🔒 | 🔒 |

### 验证方法

- 测试1: Light模式点"Probe 侦察兵" → UpgradeModal弹出
- 测试2: Full模式点"Probe 侦察兵" → 进入Probe报告页
- 测试3: Full模式点"Analyst 诊断师" → 显示"即将上线"
- 测试4: 侧边栏徽章在升级后立即更新

---

## CHECKLIST 自检

**任务1 Landing Page跳转:**
- [ ] "立即升级"跳转逻辑正确（已登录→/scan?upgrade=1，未登录→/login?redirect=...）
- [ ] scan/page.tsx读取upgrade参数
- [ ] 升级完成后URL参数清除

**任务2 侧边栏徽章:**
- [ ] 升级后徽章立即变为"专业版"
- [ ] 刷新页面后徽章仍显示"专业版"

**任务3 删除demo:**
- [ ] scan/page.tsx中isDemo相关代码删除
- [ ] scan-result.tsx中DEMO_DATA删除
- [ ] Landing Page没有链接到/scan?demo=1

**任务4 侧边栏接线:**
- [ ] Light模式点Probe → UpgradeModal弹出
- [ ] Full模式点Probe → 进入Probe报告页
- [ ] Analyst/Doctor显示"即将上线"
- [ ] 闭环显示"即将上线"

---

## 交付格式

```
自检结果: X/3 任务1 + X/2 任务2 + X/3 任务3 + X/4 任务4 = XX/12
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. 不要改upgrade-modal.tsx（弹窗保持不变）
2. 不要改scan-dashboard.tsx（Dashboard保持不变）
3. 不要改scan-loading.tsx（Light模式等待页保持不变）
4. Probe报告页的组件在TASK_PROBE_REPORT.md中定义，这里只做接线
5. 引擎文案统一：ChatGPT、Gemini、Claude（不是GPT-4o、Haiku）
