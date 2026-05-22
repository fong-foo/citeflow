# TASK_ANALYST_REPORT_VISUAL.md — 诊断报告加视觉辅助（色条+颜色）

> 药老出品 · 2026-05-19
> 目标: 在现有 scan-analyst-report.tsx 基础上，每个 Tab 加细色条和颜色分级，辅助文字理解
> 预计工时: 1.5h

---

## 原则

**文字是主角，色条是配角。不改文字结构，只在现有元素内/后加视觉指示。**

---

## 改动总览

| Tab | 改动 | 类型 |
|-----|------|------|
| Tab1 诊断报告 | 核心诊断下方加"引用率指标"色条区 | 新增section |
| Tab2 竞品战场 | WinLoseCard 内加细条 | 改现有组件 |
| Tab2 竞品战场 | C类胜负矩阵加比例色条 | 新增小元素 |
| Tab3 引擎情报 | 引擎卡片数字下加细色条 | 改现有卡片 |
| Tab4 AI认知 | 对齐度分数下加细进度条 | 改现有元素 |

---

## 任务1: Tab1 — 核心诊断下方加"引用率指标概览"

### 需要改的文件
`~/Desktop/CiteFlow/frontend/components/scan-analyst-report.tsx`

### 位置
在 `renderDiagnosisTab()` 函数中，核心诊断卡片（line 127-138）之后、`</div>` 之前（line 139前），插入一个新 section。

### 数据来源
从 `data?.probe?.citation_metrics` 取数据（probe数据也在 `data` 中）：
```tsx
const cm = data?.probe?.citation_metrics || {};
const indRate = cm?.industry_rate ?? null;   // A类
const bRate = cm?.brand_rate ?? null;        // B类
const recRate = cm?.recommendation_rate ?? null; // 推荐率
```

### 插入代码（在 line 138 的 `</div>` 之前，line 139 `</div>` 之前）

```tsx
        {/* 引用率指标概览 */}
        {(() => {
          const cm = data?.probe?.citation_metrics || {};
          const metrics = [
            { label: "A类引用率", value: cm?.industry_rate ?? null, note: "行业查询中AI提及你的比例" },
            { label: "B类引用率", value: cm?.brand_rate ?? null, note: "品牌名查询中AI提及你的比例" },
            { label: "推荐率", value: cm?.recommendation_rate ?? null, note: "AI主动推荐你的比例" },
          ].filter(m => m.value != null);

          if (metrics.length === 0) return null;

          return (
            <div className="rounded-xl p-5"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(59,130,246,0.4)" }}>
                引用率指标
              </p>
              <div className="flex flex-col gap-3">
                {metrics.map((m, i) => {
                  const val = m.value as number;
                  const barColor = val >= 50 ? "#22C55E" : val >= 20 ? "#F59E0B" : "#EF4444";
                  const barBg = val >= 50 ? "rgba(34,197,94,0.15)" : val >= 20 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: "#9A9AB0" }}>{m.label}</span>
                        <span className="text-xs font-mono font-semibold" style={{ color: barColor }}>{val}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(val, 100)}%`, background: barColor, boxShadow: `0 0 6px ${barColor}40` }} />
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: "#5E5E78" }}>{m.note}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
```

---

## 任务2: Tab2 — WinLoseCard 加细条

### 位置
`WinLoseCard` 组件（line 550-571），在现有的 `{gapStr && (...)}` 下方、`{dim?.brand_score != null && (...)}` 上方，加一根细条。

### 改动后 WinLoseCard（整个替换 line 550-572）

```tsx
function WinLoseCard({ dim, side }: { dim: any; side: "win" | "lose" }) {
  const color = side === "win" ? "#22C55E" : "#EF4444";
  const bg = side === "win" ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)";
  const border = side === "win" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)";
  const gapStr = dim?.gap != null ? (side === "win" ? `+${dim.gap}` : `${dim.gap}`) : "";
  // 条的最大宽度以50%为满格
  const barPct = dim?.gap != null ? Math.min(Math.abs(dim.gap), 50) : 0;
  const barWidth = `${(barPct / 50) * 100}%`;

  return (
    <div className="rounded-lg px-3 py-2" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-xs font-medium" style={{ color: "#EDEDEF" }}>{dim?.dimension || ""}</p>
        {gapStr && (
          <span className="text-[10px] font-mono" style={{ color }}>{gapStr}</span>
        )}
      </div>
      {/* 细条：绿色→向右，红色→向左 */}
      {dim?.gap != null && dim.gap !== 0 && (
        <div className="h-1 rounded-full overflow-hidden mt-1"
          style={{
            background: "rgba(255,255,255,0.05)",
            display: "flex",
            justifyContent: side === "win" ? "flex-start" : "flex-end",
          }}>
          <div className="h-full rounded-full"
            style={{ width: barWidth, background: color, opacity: 0.5 }} />
        </div>
      )}
      {dim?.brand_score != null && dim?.competitor_avg_score != null && (
        <p className="text-[10px] mt-0.5" style={{ color: "#5E5E78" }}>
          我方 {dim.brand_score} vs 竞品均 {dim.competitor_avg_score}
        </p>
      )}
    </div>
  );
}
```

---

## 任务3: Tab2 — C类胜负矩阵加比例色条

### 位置
在 `renderCompetitorTab()` 中，C类胜负矩阵 section（line 227-231），"胜/负/平"数字行下方，加一根三色比例条。

### 改动
在 line 231 `</div>` 之后、line 232 `{/* C类维度明细 */}` 之前，插入：

```tsx
            {/* 三色比例条 */}
            {(() => {
              const w = cClassMatrix.wins ?? 0;
              const l = cClassMatrix.losses ?? 0;
              const t = cClassMatrix.ties ?? 0;
              const total = w + l + t;
              if (total === 0) return null;
              const wp = (w / total) * 100;
              const lp = (l / total) * 100;
              const tp = (t / total) * 100;
              return (
                <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  {wp > 0 && <div style={{ width: `${wp}%`, background: "#22C55E", opacity: 0.6 }} />}
                  {lp > 0 && <div style={{ width: `${lp}%`, background: "#EF4444", opacity: 0.6 }} />}
                  {tp > 0 && <div style={{ width: `${tp}%`, background: "#F59E0B", opacity: 0.6 }} />}
                </div>
              );
            })()}
```

这段插入在现有 `</div>` (line 231 结束标签) 和注释 `{/* C类维度明细 */}` 之间。

---

## 任务4: Tab3 — 引擎卡片数字下加细色条

### 位置
引擎卡片（line 283-300），在数字显示部分加一根细条。

### 改动
替换每个引擎卡片的数字部分。当前代码（line 286-296）：

```tsx
                  {rate != null ? (
                    <>
                      <p className="text-2xl font-mono font-bold mb-1"
                        style={{ color: rate >= 20 ? "#22C55E" : rate >= 10 ? "#F59E0B" : "#EF4444" }}>
                        {rate}%
                      </p>
                      <p className="text-[10px]" style={{ color: "#5E5E78" }}>引用率</p>
                      {recRate != null && (
                        <p className="text-xs font-mono mt-1" style={{ color: "#6A6A82" }}>推荐 {recRate}%</p>
                      )}
                    </>
```

改为：

```tsx
                  {rate != null ? (
                    <>
                      <p className="text-2xl font-mono font-bold mb-1"
                        style={{ color: rate >= 20 ? "#22C55E" : rate >= 10 ? "#F59E0B" : "#EF4444" }}>
                        {rate}%
                      </p>
                      {/* 引用率色条 */}
                      <div className="h-1 rounded-full overflow-hidden mb-1 mx-4"
                        style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full"
                          style={{
                            width: `${Math.min(rate, 100)}%`,
                            background: rate >= 20 ? "#22C55E" : rate >= 10 ? "#F59E0B" : "#EF4444",
                            opacity: 0.6,
                          }} />
                      </div>
                      <p className="text-[10px]" style={{ color: "#5E5E78" }}>引用率</p>
                      {recRate != null && (
                        <>
                          {/* 推荐率色条 */}
                          <div className="h-1 rounded-full overflow-hidden mb-0.5 mt-1 mx-4"
                            style={{ background: "rgba(255,255,255,0.05)" }}>
                            <div className="h-full rounded-full"
                              style={{
                                width: `${Math.min(recRate, 100)}%`,
                                background: recRate >= 15 ? "#22C55E" : recRate >= 5 ? "#F59E0B" : "#EF4444",
                                opacity: 0.6,
                              }} />
                          </div>
                          <p className="text-xs font-mono" style={{ color: "#6A6A82" }}>推荐 {recRate}%</p>
                        </>
                      )}
                    </>
```

---

## 任务5: Tab4 — 对齐度分数下加细进度条

### 位置
认知对齐度 section（line 468-480），在分数下方加进度条。

### 改动
替换 line 475-478（当前）：

```tsx
            <p className="text-xl font-mono font-bold"
              style={{ color: alignScore >= 60 ? "#22C55E" : alignScore >= 30 ? "#F59E0B" : "#EF4444" }}>
              {alignScore}/100
            </p>
```

改为：

```tsx
            <p className="text-xl font-mono font-bold mb-2"
              style={{ color: alignScore >= 60 ? "#22C55E" : alignScore >= 30 ? "#F59E0B" : "#EF4444" }}>
              {alignScore}/100
            </p>
            {/* 对齐度进度条 */}
            <div className="h-1.5 rounded-full overflow-hidden mx-8"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-full rounded-full"
                style={{
                  width: `${alignScore}%`,
                  background: alignScore >= 60 ? "#22C55E" : alignScore >= 30 ? "#F59E0B" : "#EF4444",
                  boxShadow: `0 0 8px ${alignScore >= 60 ? "#22C55E" : alignScore >= 30 ? "#F59E0B" : "#EF4444"}40`,
                }} />
            </div>
```

---

## CHECKLIST 自检

**任务1 Tab1 指标色条:**
- [ ] 核心诊断卡片下方出现"引用率指标"section
- [ ] A类/B类/推荐率三条色条，颜色按阈值分级（≥50绿/≥20黄/＜20红）
- [ ] 每条有标签、数值、说明文字、色条
- [ ] data?.probe?.citation_metrics 为空时不显示（不报错）

**任务2 WinLoseCard 细条:**
- [ ] 每个维度卡片内有细色条
- [ ] 绿色条向右对齐（领先），红色条向左对齐（落后）
- [ ] 条宽按 gap 绝对值比例（50%为满格）
- [ ] gap=0 时不显示条

**任务3 C类胜负比例条:**
- [ ] 胜/负/平数字下方有三色比例条
- [ ] 绿(胜)/红(负)/黄(平) 按实际比例分格
- [ ] 总数为0时不显示

**任务4 引擎卡片色条:**
- [ ] 每个引擎卡片数字下方有引用率色条和推荐率色条
- [ ] 颜色按阈值分级
- [ ] 率=null时不显示条

**任务5 对齐度进度条:**
- [ ] 对齐度分数下方有进度条
- [ ] 宽度=分数%，颜色按阈值分级
- [ ] alignScore=null时不显示

**全局:**
- [ ] 不改任何文字内容，只在文字旁加色条
- [ ] 不改布局结构，不改 Tab 导航
- [ ] 不改 onBackToBriefing、onViewDoctor 回调
- [ ] 全部 inline style，不用 Tailwind
- [ ] 不引入新依赖

---

## 交付格式

```
自检结果: X/4 任务1 + X/4 任务2 + X/3 任务3 + X/4 任务4 + X/3 任务5 = XX/18
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改 renderDiagnosisTab / renderCompetitorTab / renderEngineTab / renderPerceptionTab 的整体结构** — 只在指定位置插入/修改
2. **不要改 EmptyTab 组件** — 不动
3. **不要改 renderTabBar** — 不动
4. **不要改"返回军师阅卷"和"查看处方→"按钮** — 不动
5. **色条颜色阈值参考** — Tab1: ≥50绿 ≥20黄 ＜20红 / Tab3引用率: ≥20绿 ≥10黄 / Tab3推荐率: ≥15绿 ≥5黄 / Tab4: ≥60绿 ≥30黄
6. **所有色条用 h-1 或 h-1.5 高度，rounded-full** — 保持一致的细条风格
7. **色条用 opacity: 0.5 或 0.6** — 不要太亮，配角感
8. **数据取不到（null/undefined）时那条色条不渲染** — 不要显示 0% 宽度的空条
