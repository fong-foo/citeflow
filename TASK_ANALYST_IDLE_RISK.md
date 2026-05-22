# TASK_ANALYST_IDLE_RISK.md — 军师阅卷 idle 风险预警+左右分栏

> 药老出品 · 2026-05-19
> 目标: idle 页面改为左右分栏，右栏展示风险预警卡片，点击"开始诊断"后右栏切换为终端日志
> 预计工时: 1h

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | idle 布局改为左右分栏 | scan-analyst-briefing.tsx | 30min |
| 2 | 右栏 idle 状态渲染风险预警卡片 | scan-analyst-briefing.tsx | 30min |

**完成标准**: idle 页面左右分栏，左为数据摘要+即将诊断，右为风险预警（用真实 rules 数据）；点击"开始诊断"后右栏平滑切换为终端日志+进度+规则

---

## 页面结构对比

```
        idle（新）                           running（不变）
    ┌─────────┐ ┌──────────┐          ┌─────────┐ ┌──────────┐
    │数据摘要  │ │⚠风险预警 │          │数据摘要  │ │终端日志   │
    │         │ │ ·品牌隐形 │  点击    │         │ │进度条     │
    │即将诊断  │ │ ·引擎差异 │ ────→   │         │ │已触发规则 │
    │         │ │ ·AI认知   │          │         │ │           │
    │[开始诊断]│ │          │          │[禁用按钮]│ │           │
    └─────────┘ └──────────┘          └─────────┘ └──────────┘
     左 flex-1   右 w-80               左 flex-1   右 w-80
```

**核心逻辑**: 全部 phase 统一用左右分栏。idle 时右栏渲染风险预警，running/done/error 时右栏渲染终端日志（现有代码不动）。

---

## 任务1: 布局改造

### 需要改的文件
`~/Desktop/CiteFlow/frontend/components/scan-analyst-briefing.tsx`

### 当前代码（line 436-598）

```tsx
// ── Main layout ──
return (
  <div className="flex-1 flex min-h-0 overflow-hidden p-4">
    {phase === "idle" ? (
      /* idle：居中布局 */
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full">
          {renderProbePanel()}
        </div>
      </div>
    ) : (
      /* running / done / error：左右分栏 */
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左栏 */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="max-w-md w-full mx-auto py-4">
            {renderProbePanel()}
          </div>
        </div>
        {/* 右栏：日志 + 进度 + 规则 + 错误 */}
        <div className="w-80 shrink-0 overflow-y-auto flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
          {/* ... existing right panel content ... */}
        </div>
      </div>
    )}
  </div>
);
```

### 改为

```tsx
// ── Main layout ──
return (
  <div className="flex-1 flex min-h-0 overflow-hidden p-4">
    <div className="flex-1 flex gap-4 min-h-0">
      {/* 左栏：Probe 摘要 + 即将诊断 + 按钮 */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <div className="max-w-md w-full mx-auto py-4">
          {renderProbePanel()}
        </div>
      </div>

      {/* 右栏：idle→风险预警 / running→终端日志+进度+规则 */}
      <div className="w-80 shrink-0 overflow-y-auto flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
        {phase === "idle" ? (
          renderRiskPanel()
        ) : (
          <>
            {/* ── 以下全部不动，原样保留 ── */}
            {/* 日志区 */}
            <div className="rounded-xl overflow-hidden shrink-0" style={{ ... }}>
              {/* ... 终端标题栏 + 日志内容 ... */}
            </div>
            {/* 进度条 */}
            <div className="rounded-xl p-4" style={{ ... }}>
              {/* ... */}
            </div>
            {/* 触发规则 */}
            {rules.length > 0 && (
              <div className="rounded-xl p-4 flex-1 overflow-y-auto" style={{ ... }}>
                {/* ... */}
              </div>
            )}
            {/* 错误状态 */}
            {apiStatus === "error" && (
              <div className="rounded-xl p-4 flex items-start gap-3" style={{ ... }}>
                {/* ... */}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  </div>
);
```

**关键**: `{phase === "idle" ? renderRiskPanel() : (<>现有右栏全部内容不变</>)}`

**不要动**: 右栏的日志区、进度条、触发规则、错误状态 —— 全部原样保留在 `else` 分支里。

---

## 任务2: renderRiskPanel 函数

### 位置
在 `renderProbePanel()` 函数后面（第433行后），`// ── Main layout ──` 前面，新增 `renderRiskPanel()` 函数。

### 代码

```tsx
function renderRiskPanel() {
  if (rules.length === 0) {
    return (
      <div className="rounded-xl p-6" style={{
        background: "rgba(255,255,255,0.012)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}>
        <p className="text-xs text-center" style={{ color: "#6A6A82" }}>
          未发现异常，点击"开始诊断"进行深度分析
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{
      background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.008) 100%)",
      border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(239,68,68,0.5)" }}>
        风险预警 ({rules.length})
      </p>

      <div className="flex flex-col gap-2.5">
        {rules.map((rule, i) => {
          const sev = rule.severity;
          const sevColor = sev === "critical" ? "#EF4444" : sev === "warning" ? "#F59E0B" : "#38BDF8";
          const sevBg = sev === "critical" ? "rgba(239,68,68,0.06)" : sev === "warning" ? "rgba(245,158,11,0.06)" : "rgba(56,189,248,0.06)";
          const sevBorder = sev === "critical" ? "rgba(239,68,68,0.15)" : sev === "warning" ? "rgba(245,158,11,0.15)" : "rgba(56,189,248,0.15)";
          const sevLabel = sev === "critical" ? "严重" : sev === "warning" ? "警告" : "提示";

          return (
            <div
              key={i}
              className="rounded-lg overflow-hidden"
              style={{ background: sevBg, border: `1px solid ${sevBorder}` }}
            >
              <div className="flex">
                <div className="w-0.5 shrink-0" style={{ background: sevColor }} />
                <div className="flex-1 px-3 py-2.5 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-mono px-1.5 py-px rounded-full" style={{ background: `${sevColor}20`, color: sevColor }}>
                      {sevLabel}
                    </span>
                    <p className="text-xs font-medium truncate" style={{ color: "#EDEDEF" }}>{rule.name}</p>
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: "#6A6A82" }}>{rule.evidence}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] mt-4 text-center" style={{ color: "#4A4A60" }}>
        Analyst 将深入分析以上风险，生成诊断链
      </p>
    </div>
  );
}
```

### 样式说明
- 和现有的"已触发规则"卡片（line 548-577）样式完全一致，复用同一套色值
- 只是包在不同容器里：idle 用 `renderRiskPanel`，running 用右栏的"已触发规则"卡片
- 底部加一句引导语："Analyst 将深入分析以上风险，生成诊断链"

---

## CHECKLIST 自检

**任务1 布局改造:**
- [ ] idle 状态下不再是居中 max-w-md，而是左右分栏
- [ ] 左栏内容（数据摘要+即将诊断+按钮）不变
- [ ] 右栏 running/done/error 的日志+进度+规则+错误完全不受影响
- [ ] 左右分栏各自独立滚动（overflow-y-auto, scrollbarWidth: none）

**任务2 风险预警:**
- [ ] idle 右栏展示风险预警卡片，数据来自 `detectRules()` 的 `rules` 变量
- [ ] 有规则时：显示标题"风险预警 (N)" + 每条规则一张卡片（左侧色条+severity标签+名称+evidence）
- [ ] 无规则时：显示"未发现异常"占位文字
- [ ] 底部引导语："Analyst 将深入分析以上风险，生成诊断链"
- [ ] 点击"开始诊断"后右栏切换为终端日志，不再显示风险预警

---

## 交付格式

```
自检结果: X/2 任务1 + X/3 任务2 = XX/5
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改动 renderProbePanel 函数** — 左栏内容完全不变
2. **不要改动右栏 existing 的日志/进度/规则/错误代码** — 全部放在 `else` 分支里，原样保留
3. **不要改动 detectRules 函数** — 数据来源不变
4. **不要新增 CSS 变量或依赖** — 全部用 inline style
5. **rules 变量已经存在**（line 189: `const rules = detectRules(probeOutput)`），直接在 renderRiskPanel 里用
