# TASK_ANALYST_BRIEFING_LAYOUT.md — 军师阅卷页面排版优化（v2）

> 药老出品 · 2026-05-19（v2，修正海老审查7个问题）
> 目标: 军师阅卷改为单页，idle居中+running左右分栏，各自独立滚动
> 预计工时: 2-3小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 重构ScanAnalystBriefing布局 | scan-analyst-briefing.tsx | 2h |
| 2 | 确认page.tsx无联动改动 | scan/page.tsx | 0.1h |

**完成标准**: idle居中显示摘要+按钮，点击后切换左右分栏（日志+进度+规则），各自独立滚动

---

## 设计决策（明确说明）

1. **单状态变量**：只用phase（"idle" | "log" | "api" | "done"），不加status。error用apiStatus === "error"判断。
2. **onScanningChange时机**：API真正开始时才通知父组件，日志播放期间不通知。
3. **onComplete时机**：API完成后不自动跳转，用户点"查看诊断报告"才触发onComplete。
4. **idle布局**：居中布局，隐藏右栏。点击"开始诊断"后切换左右分栏。

---

## 页面布局

### idle状态（居中，无右栏）

```
┌─────────────────────────────────────────────────┐
│  页面容器（flex-1, min-h-0, overflow-hidden）   │
│                                                 │
│         ┌─────────────────────────┐             │
│         │  PROBE 数据摘要         │             │
│         │  品牌：Flower Knows     │             │
│         │  行业：DTC 消费品牌     │             │
│         │  ┌────┐ ┌────┐ ┌────┐  │             │
│         │  │12% │ │85% │ │18% │  │             │
│         │  └────┘ └────┘ └────┘  │             │
│         │  竞品：4家 | 引擎：3个 │             │
│         └─────────────────────────┘             │
│                                                 │
│         ┌─────────────────────────┐             │
│         │  即将诊断               │             │
│         │  · 检测 9 条规则        │             │
│         │  · 分析竞品差距         │             │
│         │  · 对比三大引擎         │             │
│         │  · 生成三层诊断链       │             │
│         │  预计耗时：约 1 分钟    │             │
│         └─────────────────────────┘             │
│                                                 │
│              [ 开始诊断 → ]                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

### running/done状态（左右分栏）

```
┌─────────────────────────────────────────────────┐
│  页面容器（flex-1, min-h-0, overflow-hidden）   │
│                                                 │
│  ┌─── 左栏 ─────────┐ ┌─── 右栏 ─────────────┐ │
│  │  PROBE 数据摘要   │ │  > 读取品牌数据...    │ │
│  │  品牌：Flower...  │ │  ✓ 品牌：Flower...   │ │
│  │  A类：12%         │ │  ...                  │ │
│  │                   │ │  🧠 Analyst推理...    │ │
│  │  诊断进行中...    │ │                       │ │
│  │                   │ │  诊断进度             │ │
│  │  （或：查看报告→）│ │  [████████░░] 65%    │ │
│  │                   │ │                       │ │
│  │                   │ │  已触发规则           │ │
│  │                   │ │  🔴 品牌隐形          │ │
│  │                   │ │  🟡 引用源单一        │ │
│  └───────────────────┘ └───────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 任务1: 重构ScanAnalystBriefing

### 需要改的文件
`frontend/components/scan-analyst-briefing.tsx`

### 实现要求

#### 1.1 单状态变量（phase 4态）

```tsx
// 删除 status，只用 phase
const [phase, setPhase] = useState<"idle" | "log" | "api" | "done">("idle");
const [apiStatus, setApiStatus] = useState<"idle" | "calling" | "done" | "error">("idle");
const [apiElapsed, setApiElapsed] = useState(0);
const [visibleLines, setVisibleLines] = useState(0);
const [analystResult, setAnalystResult] = useState<any>(null);
```

**不要定义status变量**。所有UI判断基于phase和apiStatus：
```tsx
// 按钮文字
phase === "idle" ? "开始诊断 →"
: phase === "done" ? "查看诊断报告 →"
: phase === "log" || phase === "api" ? "诊断进行中..."
: "重试"  // apiStatus === "error"

// 按钮禁用
(phase === "log" || phase === "api") && apiStatus !== "error"

// 右栏显示
phase !== "idle"
```

#### 1.2 页面容器

```tsx
return (
  <div className="flex-1 flex min-h-0 overflow-hidden p-4">
    {phase === "idle" ? (
      // idle：居中布局
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full">
          {/* Probe摘要 + 即将诊断 + 开始按钮 */}
        </div>
      </div>
    ) : (
      // running/done：左右分栏
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左栏 */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {/* Probe摘要 + 状态按钮 */}
        </div>

        {/* 右栏 */}
        <div className="w-80 shrink-0 overflow-y-auto flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
          {/* 日志 + 进度 + 规则 */}
        </div>
      </div>
    )}
  </div>
);
```

#### 1.3 左栏内容（Probe摘要 + 按钮）

```tsx
<div className="max-w-md w-full mx-auto py-4">
  {/* PROBE 数据摘要 */}
  <div className="p-6 mb-6" style={{
    background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
    border: "1px solid rgba(255,255,255,0.06)",
  }}>
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
  <div className="p-6 mb-6" style={{
    background: "rgba(255,255,255,0.01)",
    border: "1px solid rgba(255,255,255,0.04)",
  }}>
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

  {/* 按钮 */}
  <button
    onClick={handleButtonClick}
    disabled={(phase === "log" || phase === "api") && apiStatus !== "error"}
    className="w-full py-3 text-sm font-semibold tracking-wide transition-all duration-300"
    style={{
      background: (phase === "log" || phase === "api") && apiStatus !== "error"
        ? "rgba(255,255,255,0.04)" : "rgba(56,189,248,0.14)",
      border: `1px solid ${(phase === "log" || phase === "api") && apiStatus !== "error"
        ? "rgba(255,255,255,0.08)" : "rgba(56,189,248,0.25)"}`,
      color: (phase === "log" || phase === "api") && apiStatus !== "error" ? "#4A4A60" : "#7DD3FC",
      cursor: (phase === "log" || phase === "api") && apiStatus !== "error" ? "not-allowed" : "pointer",
    }}
  >
    {phase === "idle" ? "开始诊断 →"
      : phase === "done" ? "查看诊断报告 →"
      : phase === "log" || phase === "api" ? "诊断进行中..."
      : "重试"}
  </button>
</div>
```

#### 1.4 按钮点击逻辑

```tsx
function handleButtonClick() {
  if (phase === "idle") {
    // 开始诊断
    setPhase("log");
  } else if (phase === "done") {
    // 查看报告
    onComplete(analystResult);
  } else if (apiStatus === "error") {
    // 重试：重置所有状态
    setVisibleLines(0);
    setApiElapsed(0);
    setApiStatus("idle");
    setPhase("log");
  }
}
```

#### 1.5 onScanningChange时机（API开始才通知）

```tsx
// API阶段 → 调API
useEffect(() => {
  if (phase !== "api") return;
  if (apiStatus !== "idle") return;

  const callAnalyst = async () => {
    setApiStatus("calling");
    onScanningChange(true);  // API真正开始时才通知

    try {
      const res = await fetch(`${API_BASE}/api/analyst`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probe_output: probeOutput }),
      });
      const result = await res.json();

      if (result.status === "error") {
        setApiStatus("error");
        onScanningChange(false);
        return;
      }

      setApiStatus("done");
      setPhase("done");
      setAnalystResult(result);
      onScanningChange(false);
    } catch {
      setApiStatus("error");
      onScanningChange(false);
    }
  };

  callAnalyst();
}, [phase, apiStatus]);
```

#### 1.6 日志播放（只在log阶段播放）

```tsx
useEffect(() => {
  if (phase !== "log") return;
  if (visibleLines >= logLines.length) return;
  const timer = setTimeout(() => setVisibleLines(v => v + 1), LINE_INTERVAL);
  return () => clearTimeout(timer);
}, [phase, visibleLines, LINE_INTERVAL, logLines.length]);
```

#### 1.7 log→api过渡

```tsx
useEffect(() => {
  if (phase === "log" && visibleLines >= logLines.length) {
    setPhase("api");
  }
}, [phase, visibleLines, logLines.length]);
```

#### 1.8 进度条计算（补充定义）

```tsx
// 日志进度
const logProgress = phase === "log" ? Math.round((visibleLines / logLines.length) * 100) : 0;

// API进度（不超过95%）
const apiProgress = phase === "api" ? Math.min(95, Math.round((apiElapsed / ESTIMATED_API_TIME) * 100)) : 0;

// 总进度
const totalProgress = phase === "log" ? logProgress * 0.3
  : phase === "api" ? 30 + apiProgress * 0.7
  : phase === "done" ? 100
  : 0;

// 剩余时间
const remaining = phase === "api" ? Math.max(0, ESTIMATED_API_TIME - apiElapsed) : 0;
```

#### 1.9 API计时器（只在api阶段计时）

```tsx
useEffect(() => {
  if (phase !== "api") return;
  const timer = setInterval(() => {
    setApiElapsed(e => e + 1);
  }, 1000);
  return () => clearInterval(timer);
}, [phase]);
```

#### 1.10 右栏内容

```tsx
{/* 右栏 */}
<div className="w-80 shrink-0 overflow-y-auto flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
  {/* 日志区 */}
  <div
    ref={logRef}
    className="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-sm"
    style={{
      background: "#0A0A0F",
      border: "1px solid rgba(255,255,255,0.06)",
      scrollbarWidth: "none",
    }}
  >
    {logLines.slice(0, visibleLines).map((line, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          color: line.type === "success" ? "#4ADE80"
            : line.type === "critical" ? "#EF4444"
            : line.type === "warning" ? "#FBBF24"
            : line.type === "thinking" ? "#38BDF8"
            : "#6A6A82",
          marginBottom: line.type === "header" ? 4 : 2,
        }}
      >
        {line.text}
      </motion.div>
    ))}

    {/* 光标闪烁 */}
    {phase === "api" && apiStatus === "calling" && (
      <span className="inline-block w-2 h-4 bg-[#38BDF8] animate-pulse" />
    )}

    {/* 完成提示 */}
    {phase === "done" && (
      <p className="text-xs mt-2" style={{ color: "#4ADE80" }}>✓ 诊断完成</p>
    )}
  </div>

  {/* 进度条 */}
  <div className="p-4" style={{
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
  }}>
    <p className="text-xs text-[#6A6A82] mb-2 font-mono">诊断进度</p>
    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: "#38BDF8" }}
        animate={{ width: `${totalProgress}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
    <p className="text-xs text-[#6A6A82] mt-1">
      {phase === "done" ? "诊断完成"
        : phase === "api" ? `预计剩余：${remaining}秒`
        : "读取数据中..."}
    </p>
  </div>

  {/* 触发规则 */}
  {rules.length > 0 && (
    <div className="p-4 flex-1 overflow-y-auto" style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      scrollbarWidth: "none",
    }}>
      <p className="text-xs text-[#6A6A82] mb-3 font-mono">已触发规则</p>
      <div className="flex flex-col gap-2">
        {rules.map((rule, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: (logLines.length - rules.length + i) * LINE_INTERVAL / 1000 }}
            className="px-3 py-2 rounded"
            style={{
              background: rule.severity === "critical" ? "rgba(239,68,68,0.08)"
                : rule.severity === "warning" ? "rgba(245,158,11,0.08)"
                : "rgba(56,189,248,0.08)",
              border: `1px solid ${rule.severity === "critical" ? "rgba(239,68,68,0.2)"
                : rule.severity === "warning" ? "rgba(245,158,11,0.2)"
                : "rgba(56,189,248,0.2)"}`,
            }}
          >
            <p className="text-xs font-medium" style={{
              color: rule.severity === "critical" ? "#EF4444"
                : rule.severity === "warning" ? "#F59E0B"
                : "#38BDF8",
            }}>
              {rule.severity === "critical" ? "🔴" : rule.severity === "warning" ? "🟡" : "🔵"} {rule.name}
            </p>
            <p className="text-[10px] text-[#6A6A82] mt-1">{rule.evidence}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )}

  {/* 错误状态 */}
  {apiStatus === "error" && (
    <div className="p-4" style={{
      background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.2)",
    }}>
      <p className="text-xs text-red-400">诊断失败，请点击左侧"重试"按钮</p>
    </div>
  )}
</div>
```

---

## 任务2: 确认page.tsx无联动改动

### 需要改的文件
`frontend/app/(app)/scan/page.tsx`

### 实现要求

确认以下不需要改：

1. `onComplete`回调 — 不变，还是在用户点"查看诊断报告"时触发
2. `onScanningChange`回调 — 不变，API开始时通知true，结束时通知false
3. `onBack`回调 — 不变

---

## 不要动的东西

1. **page.tsx** — 不改
2. **scan-sidebar.tsx** — 不改
3. **规则检测逻辑** — 不改
4. **API调用逻辑** — 不改

---

## CHECKLIST 自检

**任务1 [重构布局]:**
- [ ] 只用phase（4态），不加status
- [ ] idle状态：居中布局，无右栏
- [ ] running/done状态：左右分栏，各自独立滚动
- [ ] 左栏：Probe摘要 + 按钮
- [ ] 右栏：日志 + 进度 + 规则
- [ ] 按钮逻辑：idle→开始，done→查看报告，error→重试
- [ ] onScanningChange在API开始时才通知（不是日志开始时）
- [ ] onComplete在用户点按钮时触发（不是API完成时自动触发）
- [ ] totalProgress和remaining有定义
- [ ] 重试时重置所有状态（visibleLines, apiElapsed, apiStatus）
- [ ] 日志只在log阶段播放
- [ ] API只在log播完后调用

**任务2 [page.tsx]:**
- [ ] 确认onComplete不需要改
- [ ] 确认onScanningChange不需要改

---

## 交付格式

```
自检结果: X/12 任务1 + X/2 任务2 = XX/14
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. 页面容器overflow-hidden（不滚动）
2. 左右栏各自overflow-y-auto（独立滚动）
3. idle时隐藏右栏，居中布局
4. running/done时显示左右分栏
5. 按钮状态：idle→可点击，log/api→禁用，done→可点击，error→可点击
6. onScanningChange只在API开始/结束时通知，日志播放期间不通知
7. onComplete只在用户点按钮时触发，不自动跳转
