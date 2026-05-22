# TASK_ANALYST_IDLE_PHASE.md — 军师阅卷加"等待确认"阶段

> 药老出品 · 2026-05-19
> 目标: 军师阅卷不再自动开始，先展示Probe数据摘要，用户点"开始诊断"后才启动
> 预计工时: 1小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 加idle阶段 + Probe摘要 + 开始按钮 | scan-analyst-briefing.tsx | 0.8h |
| 2 | 确认page.tsx无联动改动 | scan/page.tsx | 0.1h |

**完成标准**: 进入军师阅卷 → 看到Probe数据摘要 → 点"开始诊断" → 才播放日志+调API

---

## 任务1: 加idle阶段

### 需要改的文件
`frontend/components/scan-analyst-briefing.tsx`

### 问题

当前军师阅卷页面一进入就开始播放日志动画，然后自动调API。用户没有选择权，不知道发生了什么就开始诊断了。

### 实现要求

#### 1.1 phase加idle状态

当前代码（约line 232）：
```tsx
const [phase, setPhase] = useState<"log" | "api" | "done">("log");
```

改为：
```tsx
const [phase, setPhase] = useState<"idle" | "log" | "api" | "done">("idle");
```

#### 1.2 idle阶段不触发日志播放

当前日志播放useEffect（约line 225）：
```tsx
useEffect(() => {
  if (visibleLines >= logLines.length) return;
  const timer = setTimeout(() => setVisibleLines(v => v + 1), LINE_INTERVAL);
  return () => clearTimeout(timer);
}, [visibleLines, LINE_INTERVAL, logLines.length]);
```

改为：只在log阶段才播放
```tsx
useEffect(() => {
  if (phase !== "log") return;  // 新增：idle阶段不播放
  if (visibleLines >= logLines.length) return;
  const timer = setTimeout(() => setVisibleLines(v => v + 1), LINE_INTERVAL);
  return () => clearTimeout(timer);
}, [phase, visibleLines, LINE_INTERVAL, logLines.length]);
```

#### 1.3 idle阶段不触发API调用

当前API调用useEffect（约line 274）：
```tsx
useEffect(() => {
  if (phase !== "api") return;
  if (apiStatus !== "idle") return;
  // ...
}, [phase, apiStatus, probeOutput, onComplete, onScanningChange]);
```

这个已经正确（只在api阶段触发），不需要改。

#### 1.4 idle阶段渲染Probe摘要

在组件的return中，加idle阶段的渲染：

```tsx
// ── Main layout ──
return (
  <div className="flex flex-1 gap-0 min-h-0">
    {/* idle阶段：居中展示Probe摘要 + 开始按钮 */}
    {phase === "idle" && (
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-lg w-full px-6">
          {/* Probe数据摘要 */}
          <div
            className="p-6 mb-6"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(56,189,248,0.5)" }}>
              PROBE 数据摘要
            </p>

            <div className="mb-4">
              <p className="text-sm font-medium" style={{ color: "#EDEDF5" }}>{brandName}</p>
              <p className="text-xs" style={{ color: "#6A6A82" }}>{industry}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <p className="text-lg font-mono font-semibold" style={{ color: "#38BDF8" }}>{industryRateVal}%</p>
                <p className="text-[10px]" style={{ color: "#6A6A82" }}>A类引用率</p>
              </div>
              <div className="text-center p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <p className="text-lg font-mono font-semibold" style={{ color: "#38BDF8" }}>{brandRate}%</p>
                <p className="text-[10px]" style={{ color: "#6A6A82" }}>B类引用率</p>
              </div>
              <div className="text-center p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <p className="text-lg font-mono font-semibold" style={{ color: "#38BDF8" }}>{recommendationRate}%</p>
                <p className="text-[10px]" style={{ color: "#6A6A82" }}>推荐率</p>
              </div>
            </div>

            <div className="flex gap-4 text-xs" style={{ color: "#6A6A82" }}>
              <span>竞品：{competitorCount}家</span>
              <span>引擎：3个</span>
              <span>来源：{sourceCount}个</span>
            </div>
          </div>

          {/* 即将诊断 */}
          <div
            className="p-6 mb-6"
            style={{
              background: "rgba(255,255,255,0.01)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(56,189,248,0.4)" }}>
              即将诊断
            </p>
            <ul className="space-y-2 text-xs" style={{ color: "#9A9AB0" }}>
              <li>· 检测 9 条规则（品牌隐形、引用源质量、竞品劣势...）</li>
              <li>· 分析竞品差距（维度级对比）</li>
              <li>· 对比三大引擎（ChatGPT / Gemini / Claude）</li>
              <li>· 生成三层诊断链（现象→原因→影响）</li>
            </ul>
            <p className="text-[10px] mt-3" style={{ color: "#5E5E78" }}>
              预计耗时：约 1 分钟
            </p>
          </div>

          {/* 开始诊断按钮 */}
          <button
            onClick={() => setPhase("log")}
            className="w-full py-3 text-sm font-semibold tracking-wide transition-all duration-300"
            style={{
              background: "rgba(56,189,248,0.14)",
              border: "1px solid rgba(56,189,248,0.25)",
              color: "#7DD3FC",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(56,189,248,0.22)";
              e.currentTarget.style.borderColor = "rgba(56,189,248,0.40)";
              e.currentTarget.style.boxShadow = "0 0 32px rgba(56,189,248,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(56,189,248,0.14)";
              e.currentTarget.style.borderColor = "rgba(56,189,248,0.25)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            开始诊断 →
          </button>
        </div>
      </div>
    )}

    {/* log/api阶段：左右分栏（原有布局） */}
    {phase !== "idle" && (
      <>
        {/* Left: Terminal log */}
        <div ... >
          {/* 原有日志区 */}
        </div>

        {/* Right: Progress + Rules */}
        <div ... >
          {/* 原有进度+规则区 */}
        </div>
      </>
    )}
  </div>
);
```

#### 1.5 进度条在idle阶段显示0%

当前进度条逻辑：
```tsx
const logProgress = Math.round((visibleLines / logLines.length) * 100);
```

idle阶段visibleLines=0，logProgress=0，totalProgress=0。这是正确的，不需要改。

#### 1.6 规则卡片在idle阶段不显示

规则卡片在右侧面板中，idle阶段整个右侧面板不渲染（因为phase !== "idle"时才渲染左右分栏）。这是正确的，不需要改。

---

## 任务2: 确认page.tsx无联动改动

### 需要改的文件
`frontend/app/(app)/scan/page.tsx`

### 实现要求

确认以下逻辑不需要改：

1. `onComplete`回调 — 不变，还是在API完成后触发
2. `onScanningChange`回调 — 需要确认：idle阶段应该通知父组件"未在扫描"

检查onScanningChange的调用时机：
```tsx
// 当前代码
setApiStatus("calling");
onScanningChange(true);  // API开始时通知

// ...

setApiStatus("done");
onScanningChange(false); // API结束时通知
```

idle阶段不需要通知，因为用户还没开始诊断。当前逻辑已经正确（只在api阶段通知）。

---

## 不要动的东西

1. **日志播放逻辑** — 不改（只是加了phase判断）
2. **API调用逻辑** — 不改
3. **进度条逻辑** — 不改
4. **规则检测逻辑** — 不改
5. **page.tsx** — 不改

---

## CHECKLIST 自检

**任务1 [idle阶段]:**
- [ ] phase类型加"idle"
- [ ] 初始状态为"idle"（不是"log"）
- [ ] idle阶段不播放日志
- [ ] idle阶段不调API
- [ ] idle阶段渲染Probe摘要（品牌、引用率、竞品、引擎、来源）
- [ ] idle阶段渲染"即将诊断"说明
- [ ] idle阶段渲染"开始诊断"按钮
- [ ] 点击按钮后setPhase("log")
- [ ] log/api阶段保持原有左右分栏布局

**任务2 [page.tsx]:**
- [ ] 确认onComplete不需要改
- [ ] 确认onScanningChange不需要改

---

## 交付格式

```
自检结果: X/9 任务1 + X/2 任务2 = XX/11
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. idle阶段是居中布局，不是左右分栏
2. Probe摘要数据从props.probeOutput读取，不hardcode
3. "开始诊断"按钮样式和UpgradeModal的CTA一致
4. idle阶段进度条显示0%，不显示"预计剩余"
5. idle阶段不显示规则卡片（因为还没检测）
