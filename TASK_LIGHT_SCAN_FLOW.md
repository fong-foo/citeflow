# TASK_LIGHT_SCAN_FLOW.md — 初步体检流程衔接修复

> 药老出品 · 2026-05-16
> 目标: 修复初步体检流程，扫描完成后在"报告生成"子步骤显示完整报告
> 预计工时: 2-3小时

---

## 用户旅程

```
1. 注册 → 来到初步体检页面
2. 初步体检页面：
   - 子步骤1：收集信息（对话模式/快速表单）
   - 子步骤2：扫描仓（Light等待页）
   - 子步骤3：报告生成（Light报告页）← 完整报告在这里
3. 仪表盘：同时有初步体检数据，用户自行点击去看
```

---

## 问题

### 问题1：扫描完成后直接跳仪表盘，跳过了"报告生成"子步骤

当前代码（page.tsx line 293-298）：
```typescript
function handleScanFinish(result: any) {
  // ...
  setStep("dashboard");  // ← 直接跳仪表盘
}
```

期望：扫描完成后显示"报告生成"子步骤（Light报告页）

### 问题2：侧边栏子步骤没有联动

当前侧边栏的子步骤（收集信息/扫描仓/报告生成）只是装饰，没有根据当前step高亮或显示✓

期望：当前子步骤高亮，完成后显示✓

---

## 需要修改的文件

| 文件 | 改动 |
|------|------|
| `app/(app)/scan/page.tsx` | 修改handleScanFinish，扫描完成后显示报告页 |
| `components/scan-sidebar.tsx` | 子步骤根据当前step联动 |

---

## 任务1: 修改handleScanFinish

### 问题

扫描完成后直接跳仪表盘，跳过了"报告生成"子步骤。

### 实现要求

```typescript
// page.tsx

// 修改handleScanFinish
function handleScanFinish(result: any) {
  localStorage.removeItem(userKey("cf_pending_scan"));
  setPendingScan(null);
  setData(result);
  setScanMode(result.mode || scanMode);
  setStep("result");  // ← 改为显示报告页，不是dashboard
  setLastScanTime(formatTime(Date.now()));
  
  // 保存扫描结果
  const report = {
    data: result,
    mode: scanMode,
    domain: scanDomain,
    brandName: scanBrandName,
    timestamp: Date.now(),
  };
  try { localStorage.setItem(userKey(STORAGE_KEY_BASE), JSON.stringify(report)); } catch {}
  
  // 存入报告历史
  // ... 保留现有逻辑
}

// 报告页的"查看仪表盘"按钮
function handleViewDashboard() {
  setStep("dashboard");
}

// 仪表盘的"查看报告"按钮
function handleViewReport() {
  setStep("result");
}
```

### 侧边栏子步骤联动

```typescript
// page.tsx

// 根据当前step决定子步骤状态
const currentSubStep = step === "input" ? "collect"
  : step === "scanning" ? "scanning"
  : step === "result" ? "report"
  : step === "dashboard" ? "report"  // 仪表盘时，报告步骤已完成
  : "collect";

// 传递给侧边栏
<ScanSidebar
  currentStep={step}
  currentSubStep={currentSubStep}
  // ... 其他props
/>
```

---

## 任务2: 侧边栏子步骤联动

### 问题

子步骤（收集信息/扫描仓/报告生成）没有根据当前step高亮或显示✓。

### 实现要求

```typescript
// scan-sidebar.tsx

// 子步骤状态判断
function getSubStepStatus(subStepId: string): StepStatus {
  // 收集信息
  if (subStepId === "collect") {
    if (currentStep === "input") return "current";
    return "completed";  // 输入完成后一直是completed
  }
  
  // 扫描仓
  if (subStepId === "scanning") {
    if (currentStep === "scanning") return "current";
    if (currentStep === "result" || currentStep === "dashboard") return "completed";
    return "locked";
  }
  
  // 报告生成
  if (subStepId === "report") {
    if (currentStep === "result") return "current";
    if (currentStep === "dashboard") return "completed";
    return "locked";
  }
  
  return "locked";
}

// 子步骤渲染
{parentStep.children.map(child => {
  const status = getSubStepStatus(child.id);
  return (
    <div key={child.id}>
      {/* 状态指示器 */}
      <span style={{
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: status === "completed" ? "#22C55E"
          : status === "current" ? "#38BDF8"
          : "#484860",
        boxShadow: status === "current" ? "0 0 4px rgba(56,189,248,0.5)" : "none",
      }} />
      
      {/* 标签 */}
      <span style={{
        color: status === "completed" ? "#A8A8B8"
          : status === "current" ? "#D4D4E0"
          : "#484860",
      }}>
        {child.label}
      </span>
    </div>
  );
})}
```

---

## 任务3: 报告页添加"查看仪表盘"按钮

### 问题

报告页需要有"查看仪表盘"按钮，让用户可以切换到仪表盘。

### 实现要求

```typescript
// scan-result.tsx 或报告页组件

interface Props {
  data: any;
  mode: ScanMode;
  brandName: string;
  onViewDashboard: () => void;  // 新增
}

export function ScanResult({ data, mode, brandName, onViewDashboard }: Props) {
  return (
    <div>
      {/* 报告内容 */}
      {/* ... */}
      
      {/* 查看仪表盘按钮 */}
      <button onClick={onViewDashboard}>
        查看仪表盘
      </button>
    </div>
  );
}
```

### page.tsx调用

```typescript
{step === "result" && (
  <ScanResult
    data={data}
    mode={scanMode}
    brandName={scanBrandName}
    onViewDashboard={() => setStep("dashboard")}
  />
)}
```

---

## 任务4: 仪表盘添加"查看报告"按钮

### 问题

仪表盘需要有"查看报告"按钮，让用户可以切换到报告页。

### 实现要求

```typescript
// scan-dashboard.tsx

interface Props {
  // ... 现有props
  onViewReport: () => void;  // 新增
}

export function ScanDashboard({ ..., onViewReport }: Props) {
  return (
    <div>
      {/* 仪表盘内容 */}
      {/* ... */}
      
      {/* 查看报告按钮 */}
      <button onClick={onViewReport}>
        查看完整报告
      </button>
    </div>
  );
}
```

### page.tsx调用

```typescript
{step === "dashboard" && (
  <ScanDashboard
    data={data}
    tier={tier}
    mode={scanMode}
    domain={scanDomain}
    brandName={scanBrandName}
    lastScanTime={lastScanTime}
    onViewReport={() => setStep("result")}
    onUpgrade={() => setShowUpgrade(true)}
  />
)}
```

---

## 完整流程验证

### 测试1: 免费用户完整流程

```
1. 清除localStorage
2. 进入/scan → 对话模式（子步骤"收集信息"高亮）
3. 输入域名 → 开始扫描（子步骤"扫描仓"高亮）
4. 扫描完成 → 显示报告页（子步骤"报告生成"高亮）
5. 点击侧边栏"首页 仪表盘" → 仪表盘（子步骤"报告生成"显示✓）
6. 仪表盘显示Light扫描数据
```

### 测试2: 子步骤联动

```
1. 在对话模式 → "收集信息"高亮，其他灰色
2. 开始扫描 → "扫描仓"高亮，"收集信息"显示✓
3. 扫描完成 → "报告生成"高亮，"收集信息""扫描仓"显示✓
4. 切换到仪表盘 → "报告生成"显示✓
```

### 测试3: 报告页↔仪表盘切换

```
1. 在报告页 → 点击"查看仪表盘" → 切换到仪表盘
2. 在仪表盘 → 点击"查看完整报告" → 切换到报告页
3. 侧边栏子步骤状态正确联动
```

---

## CHECKLIST 自检

**任务1 handleScanFinish:**
- [ ] 扫描完成后setStep("result")，不是"dashboard"
- [ ] 报告页有"查看仪表盘"按钮
- [ ] 仪表盘有"查看报告"按钮

**任务2 侧边栏子步骤:**
- [ ] 子步骤根据当前step高亮
- [ ] 完成的子步骤显示✓
- [ ] 未完成的子步骤灰色

**任务3 报告页:**
- [ ] 添加onViewDashboard prop
- [ ] 点击按钮切换到仪表盘

**任务4 仪表盘:**
- [ ] 添加onViewReport prop
- [ ] 点击按钮切换到报告页

---

## 交付格式

```
自检结果: X/3 任务1 + X/3 任务2 + X/2 任务3 + X/2 任务4 = XX/10
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. 不改后端API，只改前端
2. 保留现有的报告历史保存逻辑
3. 保留现有的断点续扫逻辑
4. 侧边栏子步骤只在"初步体检"父步骤下显示
