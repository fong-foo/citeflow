# TASK_SCAN_SIDEBAR.md — 体检中心左侧导航栏

> 药老出品 · 2026-05-14
> 目标: 体检中心页面从顶部导航改为左侧竖栏导航，显示5步流水线进度
> 预计工时: 45min

---

## 背景

当前结构：
```
app/
├── layout.tsx              (根布局：字体 + body)
├── (marketing)/
│   ├── layout.tsx          (Navbar + Starfield)
│   └── page.tsx            (Landing Page)
└── (app)/
    ├── layout.tsx          (AppNavbar 顶部栏 → 要改成侧边栏)
    ├── login/page.tsx
    ├── enter/page.tsx
    └── scan/page.tsx       (体检中心)
```

当前 `(app)/layout.tsx` 用的是顶部 AppNavbar（Logo + 用户邮箱 + 退出按钮）。
需要改为左侧竖栏导航，同时显示5步流水线进度。

## 设计规范

### 侧边栏布局

```
┌──────────┬──────────────────────────────────┐
│          │                                  │
│  Logo    │                                  │
│  CiteFlow│        主内容区                   │
│          │        {children}                │
│ ──────── │                                  │
│          │                                  │
│ ① 初步体检│                                  │
│ ② Probe  │                                  │
│ ③ Analyst│                                  │
│ ④ Doctor │                                  │
│ ⑤ 闭环   │                                  │
│          │                                  │
│          │                                  │
│ ──────── │                                  │
│ 用户邮箱  │                                  │
│ 退出登录  │                                  │
└──────────┴──────────────────────────────────┘
```

### 侧边栏尺寸
- 宽度：240px（固定）
- 背景：rgba(10, 10, 18, 0.95)（比主内容区略亮）
- 右边框：1px solid rgba(255, 255, 255, 0.06)
- 高度：100vh（撑满屏幕）

### Logo 区域（侧边栏顶部）
- 像素图标 + "CiteFlow" 文字（复用现有 SVG）
- 下方一行小字："体检中心"
- 高度约 64px
- 底部有分割线

### 流水线步骤（侧边栏中部）

5个步骤，每个步骤：
- 左侧：步骤编号（圆圈，带数字或状态图标）
- 右侧：步骤名称 + 可选的副标题
- 三种状态：
  - ✅ 已完成：编号圆圈为绿色勾，文字为亮色，可点击
  - 🔵 当前步骤：编号圆圈为蓝色高亮，文字为白色，有左边蓝色竖线指示
  - ⚫ 未到达：编号圆圈为灰色，文字为暗灰色，不可点击

步骤列表：

| # | 名称 | 副标题 | 说明 |
|---|------|--------|------|
| 1 | 初步体检 | 输入域名 | 用户输入品牌域名 |
| 2 | Probe 侦察兵 | AI引用率扫描 | 跑 Probe 检测 |
| 3 | Analyst 诊断师 | 14条规则诊断 | 跑 Analyst 分析 |
| 4 | Doctor 处方 | 生成执行清单 | 跑 Doctor 开处方 |
| 5 | 闭环 | 执行 · 监控 · 复查 | 执行处方 + 月度监控 |

### 用户区域（侧边栏底部）
- 分割线
- 用户邮箱（小字，暗灰色）
- "退出登录"按钮（小字，hover 变红）
- 固定在底部

### 主内容区
- 左侧留出 240px 给侧边栏
- 主内容区宽度：calc(100vw - 240px)
- 背景：#020617（现有暗色背景）
- 内容区有 padding

---

## 任务清单

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 创建 ScanSidebar 组件 | components/scan-sidebar.tsx | 25min |
| 2 | 修改 (app)/layout.tsx | app/(app)/layout.tsx | 10min |
| 3 | scan/page.tsx 传 currentStep | app/(app)/scan/page.tsx | 10min |

**完成标准**: 访问 /scan 看到左侧竖栏导航，5个步骤显示正确状态，主内容区在右侧。

---

## 任务1: 创建 ScanSidebar 组件

### 需要创建的文件
`frontend/components/scan-sidebar.tsx`

### 实现要求

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// 步骤定义
const STEPS = [
  { id: "input", label: "初步体检", sub: "输入域名", step: 1 },
  { id: "probe", label: "Probe 侦察兵", sub: "AI引用率扫描", step: 2 },
  { id: "analyst", label: "Analyst 诊断师", sub: "14条规则诊断", step: 3 },
  { id: "doctor", label: "Doctor 处方", sub: "生成执行清单", step: 4 },
  { id: "loop", label: "闭环", sub: "执行·监控·复查", step: 5 },
];

type StepStatus = "completed" | "current" | "locked";

interface ScanSidebarProps {
  currentStep: string;  // 当前步骤 id（如 "probe"）
  completedSteps: string[];  // 已完成的步骤 id 列表（如 ["input", "probe"]）
}

export function ScanSidebar({ currentStep, completedSteps }: ScanSidebarProps) {
  const [email, setEmail] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cf_user");
      if (raw) {
        const user = JSON.parse(raw);
        setEmail(user.email || "");
      }
    } catch {}
  }, []);

  function handleLogout() {
    localStorage.removeItem("cf_token");
    localStorage.removeItem("cf_user");
    localStorage.removeItem("cf_scan_result");
    window.location.href = "/";
  }

  function getStepStatus(stepId: string): StepStatus {
    if (completedSteps.includes(stepId)) return "completed";
    if (stepId === currentStep) return "current";
    return "locked";
  }

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col"
      style={{
        width: 240,
        background: "rgba(10, 10, 18, 0.95)",
        borderRight: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      {/* Logo 区域 */}
      <div className="flex items-center gap-2.5 px-6 h-16 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* 像素图标（复用 navbar.tsx 的 SVG） */}
          <svg viewBox="0 0 8 8" width="20" height="20" style={{ imageRendering: "pixelated" }}>
            <rect x="2" y="1" width="4" height="1" fill="#38BDF8" opacity="0.8" />
            <rect x="1" y="2" width="1" height="1" fill="#38BDF8" opacity="0.8" />
            <rect x="1" y="3" width="1" height="1" fill="#38BDF8" opacity="0.8" />
            <rect x="1" y="4" width="1" height="1" fill="#38BDF8" opacity="0.8" />
            <rect x="1" y="5" width="1" height="1" fill="#38BDF8" opacity="0.8" />
            <rect x="2" y="6" width="4" height="1" fill="#38BDF8" opacity="0.8" />
          </svg>
          <div className="flex flex-col">
            <span className="text-sm font-medium tracking-tight text-[#C8C8D8] group-hover:text-white transition-colors">
              CiteFlow
            </span>
            <span className="text-[10px] text-[#5E5E78]">体检中心</span>
          </div>
        </Link>
      </div>

      {/* 流水线步骤 */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-6">
        {STEPS.map((step) => {
          const status = getStepStatus(step.id);
          const isClickable = status === "completed" || status === "current";

          return (
            <div
              key={step.id}
              className={`
                relative flex items-center gap-3 px-3 py-3 rounded-md transition-all duration-200
                ${status === "current" ? "bg-[rgba(56,189,248,0.06)]" : ""}
                ${isClickable ? "cursor-pointer hover:bg-[rgba(255,255,255,0.03)]" : "cursor-default"}
              `}
            >
              {/* 当前步骤的蓝色左边线 */}
              {status === "current" && (
                <div
                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                  style={{ background: "#38BDF8" }}
                />
              )}

              {/* 步骤编号圆圈 */}
              <div
                className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-medium shrink-0"
                style={{
                  background:
                    status === "completed" ? "rgba(34, 197, 94, 0.15)" :
                    status === "current" ? "rgba(56, 189, 248, 0.15)" :
                    "rgba(255, 255, 255, 0.04)",
                  color:
                    status === "completed" ? "#22C55E" :
                    status === "current" ? "#38BDF8" :
                    "#3E3E50",
                  border:
                    status === "completed" ? "1px solid rgba(34, 197, 94, 0.3)" :
                    status === "current" ? "1px solid rgba(56, 189, 248, 0.3)" :
                    "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                {status === "completed" ? "✓" : step.step}
              </div>

              {/* 步骤名称 + 副标题 */}
              <div className="flex flex-col min-w-0">
                <span
                  className="text-[13px] font-medium truncate"
                  style={{
                    color:
                      status === "completed" ? "#9A9AB0" :
                      status === "current" ? "#F1F5F9" :
                      "#3E3E50",
                  }}
                >
                  {step.label}
                </span>
                <span
                  className="text-[10px] truncate"
                  style={{
                    color:
                      status === "current" ? "#6E6E88" :
                      "rgba(255, 255, 255, 0.15)",
                  }}
                >
                  {step.sub}
                </span>
              </div>
            </div>
          );
        })}
      </nav>

      {/* 用户区域 */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {email && (
          <p className="text-[11px] text-[#5E5E78] truncate mb-2">{email}</p>
        )}
        <button
          onClick={handleLogout}
          className="text-[11px] text-[#5E5E78] hover:text-[#EF4444] transition-colors duration-300"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}
```

---

## 任务2: 修改 (app)/layout.tsx

### 需要改的文件
`frontend/app/(app)/layout.tsx`

### 实现要求

当前代码：
```tsx
import { AppNavbar } from "@/components/app-navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNavbar />
      <main className="pt-14">{children}</main>
    </>
  );
}
```

改为：
```tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  // 侧边栏由 scan/page.tsx 自己渲染（因为只有 scan 需要侧边栏）
  // login 和 enter 页面不需要侧边栏
  return <>{children}</>;
}
```

**注意**：不要在 layout.tsx 里加侧边栏，因为 login 和 enter 页面不需要。侧边栏在 scan/page.tsx 里直接渲染。

---

## 任务3: scan/page.tsx 传 currentStep

### 需要改的文件
`frontend/app/(app)/scan/page.tsx`

### 实现要求

1. 导入 ScanSidebar
2. 在页面最外层用 flex 布局：左侧侧边栏 + 右侧内容
3. 传 currentStep 和 completedSteps 给侧边栏

```tsx
import { ScanSidebar } from "@/components/scan-sidebar";

export default function ScanPage() {
  // ... 现有 state ...

  // 根据 step 推算 currentStep 和 completedSteps
  const stepMap: Record<Step, string> = {
    idle: "input",
    loading: "probe",
    result: "doctor",  // result 阶段默认显示 doctor（最后一步）
    error: "input",    // 出错回到 input
  };
  const currentSidebarStep = stepMap[step] || "input";
  
  // 已完成步骤：result 阶段时全部完成，loading 时 input 完成
  const completedSidebarSteps: string[] = 
    step === "result" ? ["input", "probe", "analyst", "doctor"] :
    step === "loading" ? ["input"] :
    [];

  return (
    <div className="flex min-h-screen">
      {/* 左侧导航栏 */}
      <ScanSidebar 
        currentStep={currentSidebarStep} 
        completedSteps={completedSidebarSteps} 
      />

      {/* 右侧内容区（留出侧边栏宽度） */}
      <main className="flex-1 ml-[240px] flex flex-col items-center px-4 pt-12 pb-12">
        {/* 现有内容不变 */}
        {step === "idle" && <ScanInput onSubmit={handleScan} isLoading={false} />}
        {step === "loading" && <ScanLoading elapsed={elapsed} />}
        {step === "result" && (
          <>
            <ScanResult data={data} mode={mode} />
            <button onClick={handleNewScan} ...>开始新体检</button>
          </>
        )}
        {step === "error" && (...)}
      </main>
    </div>
  );
}
```

---

## CHECKLIST 自检

**任务1 ScanSidebar:**
- [ ] 侧边栏宽度 240px，固定在左侧
- [ ] Logo + CiteFlow + "体检中心" 显示正确
- [ ] 5个步骤全部显示
- [ ] 已完成步骤：绿色勾，亮色文字，可点击样式
- [ ] 当前步骤：蓝色高亮，左边蓝色竖线
- [ ] 未到达步骤：灰色，暗色文字
- [ ] 用户邮箱显示
- [ ] 退出登录按钮功能正常
- [ ] 暗色主题一致

**任务2 layout.tsx:**
- [ ] 不再导入 AppNavbar
- [ ] login 和 enter 页面不受影响

**任务3 scan/page.tsx:**
- [ ] 导入 ScanSidebar
- [ ] flex 布局：左侧侧边栏 + 右侧内容
- [ ] content 区域有 ml-[240px]
- [ ] currentStep 和 completedSteps 正确传递
- [ ] 原有功能不受影响（idle/loading/result/error 四态切换）

---

## 交付格式

```
自检结果: X/9 任务1 + X/2 任务2 + X/5 任务3 = XX/16
失败项: (无 / 列出)
```

---

## 注意事项

1. **不要改 scan-input / scan-loading / scan-result** — 这三个组件还没创建，这次只做导航栏
2. **不要改 AppNavbar.tsx** — 保留文件，只是 layout.tsx 不再导入它
3. **login 和 enter 页面不能受影响** — 它们不需要侧边栏，侧边栏只在 scan/page.tsx 里渲染
4. **复用现有的 SVG 像素图标** — 和 navbar.tsx、app-navbar.tsx 里的图标一致
5. **响应式** — 暂时不考虑移动端，先做桌面版
