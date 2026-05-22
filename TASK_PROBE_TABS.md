# TASK_PROBE_TABS.md — Probe页面增加3-Tab结构

> 药老出品 · 2026-05-18
> 目标: 用户开通Probe后点击Probe页面，看到3个Tab（简报室/侦察室/侦察报告），而不是只有简报室
> 预计工时: 2-3小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 修改 renderProbeTabs 支持动态 Tab labels | page.tsx | 1h |
| 2 | briefing 阶段也显示3个Tab | page.tsx | 1h |
| 3 | 验证3个阶段的Tab状态 | 手动测试 | 0.5h |

**完成标准**: 用户点击Probe页面，任何阶段都能看到3个Tab，labels根据阶段动态变化

---

## 背景

### 问题
当前 Probe 页面：
- briefing 阶段：只有 ProbeBriefing 组件，**没有 Tab**
- scanning/report 阶段：有 Tab，但 labels 固定为"简报回顾"/"侦察中"/"侦察报告"

用户期望：
- briefing 阶段：也要有3个 Tab，Tab 1 显示"简报室"（不是"简报回顾"）
- scanning 阶段：Tab 1 变成"简报回顾"，Tab 2 显示"侦察中"
- report 阶段：Tab 1 "简报回顾"，Tab 2 "侦察回顾"，Tab 3 "侦察报告"

### Tab labels 动态变化逻辑

```tsx
const tabLabelsMap = {
  briefing: [
    { id: 0, label: "简报室", sub: "BRIEFING" },
    { id: 1, label: "侦察室", sub: "SCANNING" },
    { id: 2, label: "侦察报告", sub: "REPORT" },
  ],
  scanning: [
    { id: 0, label: "简报回顾", sub: "BRIEFING" },
    { id: 1, label: "侦察中", sub: "SCANNING" },
    { id: 2, label: "侦察报告", sub: "REPORT" },
  ],
  report: [
    { id: 0, label: "简报回顾", sub: "BRIEFING" },
    { id: 1, label: "侦察回顾", sub: "SCANNING" },
    { id: 2, label: "侦察报告", sub: "REPORT" },
  ],
};
```

### Tab 可点击状态

| 阶段 | Tab 1 | Tab 2 | Tab 3 |
|------|-------|-------|-------|
| briefing | ✅ 选中 | ❌ 灰色 | ❌ 灰色 |
| scanning | ✅ 可点 | ✅ 选中 | ❌ 灰色 |
| report | ✅ 可点 | ✅ 可点 | ✅ 选中 |

### Tab 内容

| 阶段 | Tab 1 内容 | Tab 2 内容 | Tab 3 内容 |
|------|-----------|-----------|-----------|
| briefing | ProbeBriefing 组件 | 占位符（"完成简报后解锁"） | 占位符（"完成侦察后解锁"） |
| scanning | 简报回顾（只读） | ScanProbeLoading | 占位符（"侦察完成后解锁"） |
| report | 简报回顾（只读） | 简报回顾（只读） | ScanReport |

---

## 任务1: 修改 renderProbeTabs 支持动态 Tab labels

### 需要改的文件
`frontend/app/(app)/scan/page.tsx`

### 实现要求

1. **修改 renderProbeTabs 函数签名**，接收 probePhase 参数

```tsx
// 旧
function renderProbeTabs(isScanning: boolean) {

// 新
function renderProbeTabs(probePhase: "briefing" | "scanning" | "report") {
```

2. **在函数内部根据 probePhase 动态生成 Tab labels**

```tsx
function renderProbeTabs(phase: "briefing" | "scanning" | "report") {
  const tabLabelsMap = {
    briefing: [
      { id: 0, label: "简报室", sub: "BRIEFING" },
      { id: 1, label: "侦察室", sub: "SCANNING" },
      { id: 2, label: "侦察报告", sub: "REPORT" },
    ],
    scanning: [
      { id: 0, label: "简报回顾", sub: "BRIEFING" },
      { id: 1, label: "侦察中", sub: "SCANNING" },
      { id: 2, label: "侦察报告", sub: "REPORT" },
    ],
    report: [
      { id: 0, label: "简报回顾", sub: "BRIEFING" },
      { id: 1, label: "侦察回顾", sub: "SCANNING" },
      { id: 2, label: "侦察报告", sub: "REPORT" },
    ],
  };

  const tabs = tabLabelsMap[phase];
  const isScanning = phase === "scanning";

  return (
    <div className="flex-1 flex flex-col pt-5 pb-8">
      {/* Tab bar */}
      <div className="relative shrink-0 mx-8 mb-6">
        {/* ... 保持现有 Tab bar 样式代码 ... */}

        <div className="flex" style={{ ... }}>
          {tabs.map((tab) => {
            const isActive = scanTabIndex === tab.id;
            // scanning 阶段 Tab 2 不可点击；report 阶段全部可点击；briefing 阶段只有 Tab 1 可点
            const clickable = phase === "briefing" ? tab.id === 0
              : phase === "scanning" ? tab.id !== 2
              : true;

            return (
              <button
                key={tab.id}
                onClick={() => { if (clickable) setScanTabIndex(tab.id); }}
                disabled={!clickable}
                // ... 保持现有样式代码 ...
              >
                {/* ... 保持现有内容 ... */}
              </button>
            );
          })}
        </div>

        {/* ... 保持现有底部指示条 ... */}
      </div>

      {/* Tab content */}
      <div className="flex-1 flex flex-col px-6">
        {/* Tab 0 — 简报室/简报回顾 */}
        {scanTabIndex === 0 && (
          phase === "briefing" ? (
            // 显示 ProbeBriefing 组件
            briefingDefaults && (
              <ProbeBriefing
                domain={briefingDefaults.domain}
                brandName={briefingDefaults.brandName}
                industry={briefingDefaults.industry}
                targetMarket={briefingDefaults.targetMarket}
                coreProduct={briefingDefaults.coreProduct}
                competitorMentions={briefingDefaults.competitorMentions}
                onSubmit={handleBriefingConfirm}
                onCancel={() => setStep(data ? "dashboard" : "input")}
              />
            )
          ) : (
            // 显示简报回顾（只读）
            <div className="max-w-2xl mx-auto w-full py-4">
              {/* ... 保持现有简报回顾代码 ... */}
            </div>
          )
        )}

        {/* Tab 1 — 侦察室/侦察中 */}
        {scanTabIndex === 1 && (
          phase === "briefing" ? (
            // 占位符
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl mb-2">🔬</p>
                <p className="text-sm" style={{ color: "#9A9AB0" }}>完成简报后解锁</p>
              </div>
            </div>
          ) : (
            // 显示 ScanProbeLoading 或侦察回顾
            <ScanProbeLoading elapsed={elapsed} domain={scanDomain} brandName={scanBrandName} />
          )
        )}

        {/* Tab 2 — 侦察报告 */}
        {scanTabIndex === 2 && (
          phase === "report" && data ? (
            // 显示 ScanReport
            <ScanReport data={data} brandName={scanBrandName} />
          ) : (
            // 占位符
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl mb-2">📊</p>
                <p className="text-sm" style={{ color: "#9A9AB0" }}>
                  {phase === "briefing" ? "完成侦察后解锁" : "侦察完成后解锁"}
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
```

---

## 任务2: briefing 阶段也显示3个Tab

### 需要改的文件
`frontend/app/(app)/scan/page.tsx`

### 实现要求

1. **修改 step === "probe" 的渲染逻辑**（约第806-826行）

```tsx
{/* ═══ step = "probe" (Probe侦察兵: briefing → scanning → report) ═══ */}
{step === "probe" && (
  <>
    {/* 旧代码：briefing 阶段单独渲染 ProbeBriefing */}
    {/* {probePhase === "briefing" && briefingDefaults && (
      <ProbeBriefing ... />
    )} */}

    {/* 新代码：所有阶段都调用 renderProbeTabs */}
    {renderProbeTabs(probePhase)}
  </>
)}
```

2. **删除旧的单独渲染逻辑**（约第809-820行）

```tsx
// 删除这段
{probePhase === "briefing" && briefingDefaults && (
  <ProbeBriefing
    domain={briefingDefaults.domain}
    brandName={briefingDefaults.brandName}
    industry={briefingDefaults.industry}
    targetMarket={briefingDefaults.targetMarket}
    coreProduct={briefingDefaults.coreProduct}
    competitorMentions={briefingDefaults.competitorMentions}
    onSubmit={handleBriefingConfirm}
    onCancel={() => setStep(data ? "dashboard" : "input")}
  />
)}
```

3. **修改 scanning 和 report 的调用方式**

```tsx
// 旧
{probePhase === "scanning" && renderProbeTabs(true)}
{probePhase === "report" && data && renderProbeTabs(false)}

// 新
{renderProbeTabs(probePhase)}
```

---

## 验证方法

**测试1: briefing 阶段**
1. 用 test@citeflow.com 登录
2. localStorage 改 tier=probe
3. 点击侧边栏"Probe 侦察兵"
4. 应该看到3个Tab：**简报室** / 侦察室 / 侦察报告
5. Tab 1 选中，Tab 2/3 灰色不可点
6. Tab 1 内容是 ProbeBriefing 组件

**测试2: scanning 阶段**
1. 完成简报室，点击"开始侦察"
2. 应该看到3个Tab：简报回顾 / **侦察中** / 侦察报告
3. Tab 2 选中，Tab 1 可点，Tab 3 灰色
4. 点击 Tab 1 → 显示简报回顾（只读）
5. 点击 Tab 2 → 回到侦察中

**测试3: report 阶段**
1. 侦察完成
2. 应该看到3个Tab：简报回顾 / 侦察回顾 / **侦察报告**
3. Tab 3 选中，Tab 1/2/3 都可点
4. 点击任意Tab → 显示对应内容

**测试4: 占位符**
1. briefing 阶段，点击 Tab 2 → 显示"完成简报后解锁"
2. briefing 阶段，点击 Tab 3 → 显示"完成侦察后解锁"
3. scanning 阶段，点击 Tab 3 → 显示"侦察完成后解锁"

---

## state.py 改动汇总

**不需要改后端！** 只是前端布局调整。

---

## CHECKLIST 自检

**任务1 [修改 renderProbeTabs]:**
- [ ] 函数签名改为接收 probePhase 参数
- [ ] Tab labels 根据 probePhase 动态变化
- [ ] briefing 阶段：Tab 1 可点，Tab 2/3 灰色
- [ ] scanning 阶段：Tab 1 可点，Tab 2 选中，Tab 3 灰色
- [ ] report 阶段：Tab 1/2/3 都可点
- [ ] Tab 0 内容：briefing 阶段显示 ProbeBriefing，其他阶段显示简报回顾
- [ ] Tab 1 内容：briefing 阶段显示占位符，scanning 阶段显示 ScanProbeLoading
- [ ] Tab 2 内容：report 阶段显示 ScanReport，其他阶段显示占位符

**任务2 [briefing 阶段显示Tab]:**
- [ ] 删除旧的单独渲染 ProbeBriefing 的代码
- [ ] 所有阶段都调用 renderProbeTabs(probePhase)
- [ ] scanning 阶段调用方式从 renderProbeTabs(true) 改为 renderProbeTabs("scanning")
- [ ] report 阶段调用方式从 renderProbeTabs(false) 改为 renderProbeTabs("report")

**任务3 [验证]:**
- [ ] briefing 阶段显示3个Tab，labels为"简报室"/"侦察室"/"侦察报告"
- [ ] scanning 阶段显示3个Tab，labels为"简报回顾"/"侦察中"/"侦察报告"
- [ ] report 阶段显示3个Tab，labels为"简报回顾"/"侦察回顾"/"侦察报告"
- [ ] 占位符正确显示

---

## 交付格式

```
自检结果: X/8 任务1 + X/4 任务2 + X/4 任务3 = XX/16
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改 ProbeBriefing 组件** — 它是独立的，不要动
2. **不要改 ScanProbeLoading 组件** — 它是独立的，不要动
3. **不要改 ScanReport 组件** — 它是独立的，不要动
4. **保持现有 Tab 样式** — 只改 labels 和可点击状态
5. **briefingDefaults 为空时的处理** — 如果 briefingDefaults 为空，Tab 1 显示 loading

---

## 预期效果

### briefing 阶段
```
┌─────────────────────────────────────────────┐
│  [简报室]  [侦察室]  [侦察报告]              │
│  ───────                                    │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  ProbeBriefing 组件                  │   │
│  │  Step 1: 品牌信息确认                │   │
│  │  Step 2: 业务画像                    │   │
│  │  Step 3: 竞品配置                    │   │
│  │  Step 4: 查询词                      │   │
│  │  Step 5: 确认发射                    │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### scanning 阶段
```
┌─────────────────────────────────────────────┐
│  [简报回顾]  [侦察中]  [侦察报告]           │
│              ───────                        │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  ScanProbeLoading 组件               │   │
│  │  扫描进度动画                        │   │
│  │  预计剩余时间：xx秒                  │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### report 阶段
```
┌─────────────────────────────────────────────┐
│  [简报回顾]  [侦察回顾]  [侦察报告]         │
│                        ───────              │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  ScanReport 组件                     │   │
│  │  Section 1: 综合评分                 │   │
│  │  Section 2: AI认知画像               │   │
│  │  Section 3: 引擎对比                 │   │
│  │  ...                                 │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```
