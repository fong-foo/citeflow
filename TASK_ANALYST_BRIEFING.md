# TASK_ANALYST_BRIEFING.md — Analyst子模块 + 军师阅卷页面

> 药老出品 · 2026-05-19
> 目标: 创建Analyst子模块结构 + 军师阅卷页面（真实数据展示+等待诊断）
> 预计工时: 3-4小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | Analyst子模块：侧边栏children | scan-sidebar.tsx | 0.3h |
| 2 | Analyst子模块：状态机扩展 | scan/page.tsx | 0.5h |
| 3 | 军师阅卷页面组件 | scan-analyst-briefing.tsx（新建） | 2h |
| 4 | 页面集成：接入page.tsx | scan/page.tsx | 0.5h |
| 5 | beforeunload保护 | scan/page.tsx | 0.2h |

**完成标准**: 点击侧边栏Analyst → 展开子模块 → 进入军师阅卷 → 看到真实Probe数据 → 等待LLM诊断 → 完成后可进入诊断报告

---

## 任务1: 侧边栏Analyst子模块

### 需要改的文件
`frontend/components/scan-sidebar.tsx`

### 实现要求

给Analyst step添加children，和"初步体检"一样的模式：

```tsx
// STEPS数组中的analyst项（约第23行）
{
  id: "analyst",
  label: "Analyst 诊断师",
  sub: "14条规则诊断",
  step: 3,
  children: [
    { id: "briefing", label: "军师阅卷", sub: "数据读取+诊断" },
    { id: "report", label: "诊断报告", sub: "4-Tab诊断结果" },
  ],
},
```

**注意**：children的展开/折叠逻辑已经存在（和初步体检共用），不需要额外实现。

---

## 任务2: 状态机扩展

### 需要改的文件
`frontend/app/(app)/scan/page.tsx`

### 实现要求

#### 2.1 添加AnalystPhase类型

```tsx
// 在 ProbePhase 定义后面加（约第27行）
type AnalystPhase = "briefing" | "report";
```

#### 2.2 添加analystPhase状态

```tsx
// 在 probePhase 状态后面加（约第65行）
const [analystPhase, setAnalystPhase] = useState<AnalystPhase>("briefing");
```

#### 2.3 修改isScanning判断

当前代码（约第92行）：
```tsx
const scanning = (step === "input" && inputPhase === "scanning") ||
                 (step === "probe" && probePhase === "scanning");
```

改为：
```tsx
const scanning = (step === "input" && inputPhase === "scanning") ||
                 (step === "probe" && probePhase === "scanning") ||
                 (step === "analyst" && analystPhase === "briefing");
```

**注意**：军师阅卷期间也算"扫描中"，触发beforeunload保护。

#### 2.4 修改handleSidebarAnalystClick

当前代码（约第502行）：
```tsx
function handleSidebarAnalystClick() {
  if (!data) { setInputPhase("form"); setStep("input"); return; }
  if (tier === "free" || tier === "probe") {
    setUpgradeFeature("analyst");
    setShowUpgrade(true);
    return;
  }
  setStep("analyst");
}
```

改为：
```tsx
function handleSidebarAnalystClick() {
  if (!data) { setInputPhase("form"); setStep("input"); return; }
  if (tier === "free" || tier === "probe") {
    setUpgradeFeature("analyst");
    setShowUpgrade(true);
    return;
  }
  setAnalystPhase("briefing");
  setStep("analyst");
}
```

#### 2.5 添加renderAnalystTabs函数

参照renderProbeTabs的模式，添加renderAnalystTabs：

```tsx
function renderAnalystTabs(phase: "briefing" | "report") {
  const tabLabelsMap = {
    briefing: [
      { id: 0, label: "军师阅卷", sub: "BRIEFING" },
      { id: 1, label: "诊断报告", sub: "REPORT" },
    ],
    report: [
      { id: 0, label: "阅卷回顾", sub: "BRIEFING" },
      { id: 1, label: "诊断报告", sub: "REPORT" },
    ],
  };

  const tabs = tabLabelsMap[phase];
  const analystTabIndex = 0; // 后面会加状态

  return (
    <div className="flex-1 flex flex-col pb-8">
      {/* Tab bar — 和Probe一样的样式，但只有2个tab */}
      <div className="relative shrink-0 ml-8 mr-[112px] mb-6">
        {/* 角落装饰线 — 和Probe一样 */}
        <span className="absolute top-0 left-0 w-4 h-px" style={{ background: "linear-gradient(90deg, rgba(56,189,248,0.25), transparent)" }} />
        <span className="absolute top-0 left-0 w-px h-4" style={{ background: "linear-gradient(180deg, rgba(56,189,248,0.25), transparent)" }} />
        <span className="absolute top-0 right-0 w-4 h-px" style={{ background: "linear-gradient(270deg, rgba(56,189,248,0.25), transparent)" }} />
        <span className="absolute top-0 right-0 w-px h-4" style={{ background: "linear-gradient(180deg, rgba(56,189,248,0.25), transparent)" }} />

        <div
          className="flex"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderBottom: "none",
          }}
        >
          {tabs.map((tab) => {
            const isActive = analystTabIndex === tab.id;
            const clickable = phase === "briefing" ? tab.id === 0 : true;

            return (
              <button
                key={tab.id}
                onClick={() => { if (clickable) {/* 设置analystTabIndex */} }}
                disabled={!clickable}
                className="flex-1 flex flex-col items-center justify-center relative py-4 transition-all duration-500 group"
                style={{ cursor: clickable ? "pointer" : "default" }}
              >
                <span
                  className="text-[9px] font-mono tracking-[0.14em] mb-1 transition-all duration-500"
                  style={{ color: isActive ? "rgba(56,189,248,0.45)" : clickable ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)" }}
                >
                  {tab.sub}
                </span>
                <span
                  className="text-sm font-semibold tracking-wide transition-all duration-500"
                  style={{
                    color: isActive ? "#D0D0E0"
                      : clickable ? "#6A6A82"
                      : "#2A2A3A",
                  }}
                >
                  {tab.label}
                </span>
                {/* 活跃指示条 — 和Probe一样 */}
                <motion.div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-500"
                  style={{
                    width: isActive ? "60%" : "0%",
                    background: isActive ? "linear-gradient(90deg, transparent, #38BDF8, transparent)" : "transparent",
                    boxShadow: isActive ? "0 0 10px rgba(56,189,248,0.5), 0 0 4px rgba(56,189,248,0.3)" : "none",
                    opacity: isActive ? 1 : 0,
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* 底部高亮条 — 和Probe一样，但宽度50%（2个tab） */}
        <div className="relative h-px" style={{ background: "rgba(255,255,255,0.05)" }}>
          <motion.div
            className="absolute h-px transition-all duration-500"
            style={{
              background: "linear-gradient(90deg, transparent, #38BDF8, transparent)",
              boxShadow: "0 0 8px rgba(56,189,248,0.35)",
              width: "50%",
              left: `${analystTabIndex * 50}%`,
            }}
          />
        </div>
      </div>

      {/* Tab内容区 */}
      <div className="flex-1 ml-8 mr-[112px]">
        {phase === "briefing" && <ScanAnalystBriefing ... />}
        {phase === "report" && <div>诊断报告（待开发）</div>}
      </div>
    </div>
  );
}
```

#### 2.6 在主渲染区添加Analyst分支

在 `{step === "probe" && renderProbeTabs(probePhase)}` 后面加：

```tsx
{step === "analyst" && renderAnalystTabs(analystPhase)}
```

#### 2.7 hasAnalystData兼容性

当前定义（约第58行）：
```tsx
const hasAnalystData = !!(data?.diagnosis || data?.one_line_verdict);
```

onComplete回调会展开API返回值到data：
```tsx
setData((prev: any) => ({ ...prev, ...analystOutput }));
```

API返回包含 `diagnosis` 和 `one_line_verdict`，展开后能被hasAnalystData检测到。**不需要改hasAnalystData定义**，但需要确认onComplete展开后data结构正确。

---

## 任务3: 军师阅卷页面组件

### 新建文件
`frontend/components/scan-analyst-briefing.tsx`

### 组件接口

```tsx
interface ScanAnalystBriefingProps {
  probeOutput: any;           // probe_output数据（用于展示真实数据）
  domain: string;
  brandName: string;
  onComplete: (analystOutput: any) => void;  // 诊断完成回调
  onBack: () => void;         // 返回仪表盘
  onScanningChange: (isScanning: boolean) => void;  // 通知父组件扫描状态
}
```

### 实现细节

#### 3.1 数据提取（从probeOutput读取真实数据）

```tsx
// 从probeOutput提取数据（瞬间完成，不需要动画）
const bp = probeOutput?.brand_profile || {};
const cm = probeOutput?.citation_metrics || {};
const sa = probeOutput?.source_authority || {};
const er = probeOutput?.engine_results || {};
const gr = probeOutput?.gap_report || {};
const competitors = probeOutput?.competitor_mentions || [];
const competitorAnalysis = probeOutput?.competitor_analysis || [];

const brandName = bp.brand_name || "未知品牌";
const industry = bp.inferred_industry || "未指定行业";
const industryRate = cm.industry_rate || 0;
const brandRate = cm.brand_rate || 0;
const recommendationRate = cm.recommendation_rate || 0;
const citationRate = cm.rate || 0;
const gptRate = er.gpt?.citation_rate || 0;
const geminiRate = er.gemini?.citation_rate || 0;
const haikuRate = er.haiku?.citation_rate || 0;
const sourceCount = sa.total_sources || 0;
const alignmentScore = gr.alignment_score || 0;
const competitorCount = competitors.length;        // 竞品品牌数
const compCount = competitorAnalysis.length;       // 竞品对比条数（CompetitorResult列表）
```

**注意**：`competitorCount`（竞品品牌数）和 `compCount`（竞品对比条数）是不同的数据源：
- `competitorCount` = `probeOutput.competitor_mentions.length`（被提及的竞品品牌）
- `compCount` = `probeOutput.competitor_analysis.length`（竞品维度对比条目）

#### 3.2 高权威源占比（与后端口径一致）

**重要**：必须用加权计算（按mention_count），和后端规则3保持一致。

```tsx
const topSources = sa.top_sources || [];
const totalMentions = topSources.reduce((sum: number, s: any) => sum + (s.mention_count || 0), 0);
const highAuthMentions = topSources
  .filter((s: any) => s.authority_score >= 70)
  .reduce((sum: number, s: any) => sum + (s.mention_count || 0), 0);
const highAuthPct = totalMentions > 0 ? Math.round(highAuthMentions / totalMentions * 100) : 0;
```

#### 3.3 规则检测（前端代码检测，9条规则全覆盖）

从probeOutput提取关键指标，前端做规则检测。**必须覆盖后端全部9条规则**：

```tsx
function detectRules(probeOutput: any) {
  const cm = probeOutput?.citation_metrics || {};
  const sa = probeOutput?.source_authority || {};
  const er = probeOutput?.engine_results || {};
  const gr = probeOutput?.gap_report || {};
  const comp = probeOutput?.competitor_analysis || [];

  const rules = [];

  // 规则1：定位偏差（对齐度<60 且 行业引用率>80%）
  const alignmentScore = gr.alignment_score || 0;
  const industryRate = cm.industry_rate || 0;
  if (alignmentScore < 60 && industryRate > 80) {
    rules.push({
      id: 1, name: "定位偏差", severity: "critical",
      evidence: `对齐度${alignmentScore} < 60 且行业引用率${industryRate}% > 80%`
    });
  }

  // 规则2：品牌隐形（引用率<30%）
  if (cm.rate < 30) {
    rules.push({
      id: 2, name: "品牌隐形", severity: "critical",
      evidence: `引用率${cm.rate}% < 30%`
    });
  }

  // 规则3：引用源质量差（引用率>60%但高权威源<30%）
  const topSources = sa.top_sources || [];
  const totalMentions = topSources.reduce((sum: number, s: any) => sum + (s.mention_count || 0), 0);
  const highAuthMentions = topSources
    .filter((s: any) => s.authority_score >= 70)
    .reduce((sum: number, s: any) => sum + (s.mention_count || 0), 0);
  const highAuthRatio = totalMentions > 0 ? highAuthMentions / totalMentions : 0;
  if (cm.rate > 60 && highAuthRatio < 0.3) {
    rules.push({
      id: 3, name: "引用源质量差", severity: "warning",
      evidence: `引用率${cm.rate}%但高权威源占比${Math.round(highAuthRatio * 100)}%`
    });
  }

  // 规则4：引用源单一（来源多样性<0.5）
  if ((sa.source_diversity ?? 1) < 0.5) {
    rules.push({
      id: 4, name: "引用源单一", severity: "warning",
      evidence: `来源多样性${sa.source_diversity}`
    });
  }

  // 规则6：竞品维度劣势（存在gap<-20的维度）
  // 从competitor_analysis的dimension_scores近似计算
  const dimensionMap: Record<string, { brand: number[]; comp: number[] }> = {};
  for (const c of comp) {
    for (const ds of (c.dimension_scores || [])) {
      const dim = ds.dimension;
      if (!dimensionMap[dim]) dimensionMap[dim] = { brand: [], comp: [] };
      for (const r of (ds.rankings || [])) {
        if (r.score === null || r.score === undefined) continue;
        // 简化：假设第一个brand是用户品牌，其余是竞品
        // 实际应该用brand_name匹配，但这里近似即可
        if (dimensionMap[dim].brand.length === 0) {
          dimensionMap[dim].brand.push(r.score);
        } else {
          dimensionMap[dim].comp.push(r.score);
        }
      }
    }
  }
  const losingDims = Object.entries(dimensionMap)
    .filter(([_, v]) => v.brand.length > 0 && v.comp.length > 0)
    .map(([name, v]) => {
      const brandAvg = v.brand.reduce((a, b) => a + b, 0) / v.brand.length;
      const compAvg = v.comp.reduce((a, b) => a + b, 0) / v.comp.length;
      return { name, gap: brandAvg - compAvg };
    })
    .filter(d => d.gap < -20);

  if (losingDims.length > 0) {
    rules.push({
      id: 6, name: "竞品维度劣势", severity: "warning",
      evidence: `${losingDims.length}个维度存在重大劣势`
    });
  }

  // 规则10：行业影响力弱（B类>50%但A类<20%）
  if (cm.brand_rate > 50 && cm.industry_rate < 20) {
    rules.push({
      id: 10, name: "行业影响力弱", severity: "warning",
      evidence: `B类${cm.brand_rate}%但A类${cm.industry_rate}%`
    });
  }

  // 规则12：引擎差异异常（引擎间引用率差异>20%）
  const rates = [er.gpt?.citation_rate || 0, er.gemini?.citation_rate || 0, er.haiku?.citation_rate || 0];
  const diff = Math.max(...rates) - Math.min(...rates);
  if (rates.filter(r => r > 0).length >= 2 && diff > 20) {
    rules.push({
      id: 12, name: "引擎差异异常", severity: "warning",
      evidence: `引用率差异${diff}个百分点`
    });
  }

  // 规则13：AI认知偏差（B类查询≥3条）
  if (cm.brand_count >= 3) {
    rules.push({
      id: 13, name: "AI认知偏差", severity: "info",
      evidence: `${cm.brand_count}条B类查询数据`
    });
  }

  // 规则14：竞品胜负矩阵（C类查询≥3条）
  if (cm.competitor_count >= 3) {
    rules.push({
      id: 14, name: "竞品胜负矩阵", severity: "info",
      evidence: `${cm.competitor_count}条C类查询数据`
    });
  }

  // 按severity排序：critical > warning > info
  const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  rules.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  return rules;
}
```

**注意**：规则6的维度聚合是近似计算（从competitor_analysis的dimension_scores推导），和后端的精确计算可能有差异。这是可接受的——前端规则检测仅用于"军师阅卷"展示，真正的规则触发以后端为准。

#### 3.4 日志行数据（真实数据）

```tsx
const logLines = [
  { type: "header", text: "> 读取品牌数据..." },
  { type: "success", text: `✓ 品牌：${brandName} | 行业：${industry}` },

  { type: "header", text: "> 读取引用率数据..." },
  { type: "success", text: `✓ A类：${industryRate}% | B类：${brandRate}% | 推荐率：${recommendationRate}%` },

  { type: "header", text: "> 读取竞品数据..." },
  { type: "success", text: `✓ ${competitorCount}家竞品 | ${compCount}条对比` },

  { type: "header", text: "> 读取引擎数据..." },
  { type: "success", text: `✓ GPT: ${gptRate}% | Gemini: ${geminiRate}% | Haiku: ${haikuRate}%` },

  { type: "header", text: "> 读取来源数据..." },
  { type: "success", text: `✓ ${sourceCount}个引用源 | 高权威占比：${highAuthPct}%` },

  { type: "header", text: "> 规则检测中..." },
  { type: "warning", text: `⚡ 触发${rules.length}条规则：` },
  ...rules.map(r => ({
    type: r.severity === "critical" ? "critical" as const : "warning" as const,
    text: `  · ${r.name}（${r.severity}）— ${r.evidence}`
  })),

  { type: "header", text: "> 开始深度诊断..." },
  { type: "thinking", text: "🧠 Analyst 正在推理..." },
];
```

#### 3.5 日志播放速度（匹配API预估时间）

**问题**：15行 × 0.4秒 = 6秒，但API需要30-120秒。日志播完后干等几十秒体验差。

**解决方案**：日志播放速度根据API预估时间动态调整。

```tsx
// API预估时间：60秒
const ESTIMATED_API_TIME = 60;
// 日志播放时间：API预估时间的30%（至少15秒，最多25秒）
const LOG_PLAYBACK_TIME = Math.max(15, Math.min(25, ESTIMATED_API_TIME * 0.3));
// 每行间隔
const LINE_INTERVAL = (LOG_PLAYBACK_TIME * 1000) / logLines.length;

// 逐行显示
const [visibleLines, setVisibleLines] = useState(0);
useEffect(() => {
  if (visibleLines >= logLines.length) return;
  const timer = setTimeout(() => setVisibleLines(v => v + 1), LINE_INTERVAL);
  return () => clearTimeout(timer);
}, [visibleLines]);
```

这样15行日志会播放15-25秒，而不是6秒。日志播完后API等待时间更短，体验更流畅。

#### 3.6 进度条（日志阶段 + API阶段 分开）

```tsx
// 两个阶段的日志
const [phase, setPhase] = useState<"log" | "api" | "done">("log");
const [logProgress, setLogProgress] = useState(0);
const [apiProgress, setApiProgress] = useState(0);
const [apiElapsed, setApiElapsed] = useState(0);

// 日志阶段进度
useEffect(() => {
  setLogProgress(Math.round((visibleLines / logLines.length) * 100));
}, [visibleLines]);

// 日志播完 → 切到API阶段
useEffect(() => {
  if (visibleLines >= logLines.length && phase === "log") {
    setPhase("api");
  }
}, [visibleLines, phase]);

// API阶段计时器
useEffect(() => {
  if (phase !== "api") return;
  const timer = setInterval(() => {
    setApiElapsed(e => e + 1);
  }, 1000);
  return () => clearInterval(timer);
}, [phase]);

// API阶段进度（不超过95%）
useEffect(() => {
  if (phase !== "api") return;
  setApiProgress(Math.min(95, Math.round((apiElapsed / ESTIMATED_API_TIME) * 100)));
}, [apiElapsed, phase]);

// 总进度
const totalProgress = phase === "log" ? logProgress * 0.3  // 日志占30%
  : phase === "api" ? 30 + apiProgress * 0.7               // API占70%
  : 100;

// 预计剩余时间
const remaining = phase === "api" ? Math.max(0, ESTIMATED_API_TIME - apiElapsed) : 0;
```

#### 3.7 API调用（日志播完后自动触发）

```tsx
useEffect(() => {
  if (phase !== "api") return;
  if (apiStatus !== "idle") return;

  const callAnalyst = async () => {
    setApiStatus("calling");
    onScanningChange(true);
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
      onScanningChange(false);
      onComplete(result);
    } catch (e) {
      setApiStatus("error");
      onScanningChange(false);
    }
  };

  callAnalyst();
}, [phase, apiStatus]);
```

#### 3.8 错误处理

```tsx
if (apiStatus === "error") {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 mb-4">诊断失败，请重试</p>
        <button onClick={onBack} className="px-4 py-2 bg-[#38BDF8] text-black rounded">
          返回仪表盘
        </button>
      </div>
    </div>
  );
}
```

### 样式规范

**左栏（终端日志区）**：
```tsx
<div
  ref={logRef}
  className="flex-1 overflow-y-auto p-6 font-mono text-sm"
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
</div>
```

**右栏（进度+规则面板）**：
```tsx
<div
  className="flex flex-col gap-6 p-6"
  style={{
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
  }}
>
  {/* 进度条 */}
  <div>
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
      {phase === "done" ? "诊断完成" : phase === "api" ? `预计剩余：${remaining}秒` : "读取数据中..."}
    </p>
  </div>

  {/* 分隔线 */}
  <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

  {/* 已触发规则 */}
  <div>
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
</div>
```

---

## 任务4: 页面集成

### 需要改的文件
`frontend/app/(app)/scan/page.tsx`

### 实现要求

#### 4.1 导入新组件

```tsx
import { ScanAnalystBriefing } from "@/components/scan-analyst-briefing";
```

#### 4.2 添加analystTabIndex状态

```tsx
const [analystTabIndex, setAnalystTabIndex] = useState(0);
```

#### 4.3 在renderAnalystTabs中接入组件

```tsx
{phase === "briefing" && (
  <ScanAnalystBriefing
    probeOutput={data?.probe_output || data}
    domain={scanDomain}
    brandName={scanBrandName}
    onComplete={(analystOutput) => {
      // 保存analyst数据（展开到data，hasAnalystData能检测到）
      setData((prev: any) => ({ ...prev, ...analystOutput }));
      setAnalystPhase("report");
      setAnalystTabIndex(1);
    }}
    onBack={() => setStep("dashboard")}
    onScanningChange={(isScanning) => {
      // 通过状态提升，让page.tsx知道扫描状态
      // 用于isScanning判断和beforeunload保护
    }}
  />
)}
{phase === "report" && (
  <div className="flex items-center justify-center h-64">
    <p className="text-[#6A6A82]">诊断报告页面待开发</p>
  </div>
)}
```

#### 4.4 onScanningChange实现

需要在page.tsx中添加状态来跟踪analyst扫描状态：

```tsx
const [analystScanning, setAnalystScanning] = useState(false);

// 修改isScanning判断
const scanning = (step === "input" && inputPhase === "scanning") ||
                 (step === "probe" && probePhase === "scanning") ||
                 (step === "analyst" && analystScanning);

// 传递给组件
<ScanAnalystBriefing
  ...
  onScanningChange={setAnalystScanning}
/>
```

---

## 任务5: beforeunload保护

### 需要改的文件
`frontend/app/(app)/scan/page.tsx`

### 实现要求

军师阅卷期间（API调用中）也要触发beforeunload保护。

已在任务4.4中通过analystScanning状态实现。确认以下代码正确：

```tsx
useEffect(() => {
  if (!scanning) return;
  const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, [scanning]);
```

---

## 不要动的东西

1. **Probe流程** — 不改
2. **初步体检流程** — 不改
3. **仪表盘** — 不改
4. **侧边栏其他部分** — 只改Analyst的children
5. **升级弹窗逻辑** — 不改

---

## CHECKLIST 自检

**任务1 [侧边栏]:**
- [ ] Analyst step有children（军师阅卷、诊断报告）
- [ ] 展开/折叠动画正常
- [ ] 子步骤高亮逻辑正确

**任务2 [状态机]:**
- [ ] AnalystPhase类型定义正确
- [ ] analystPhase状态管理正确
- [ ] analystScanning状态管理正确
- [ ] isScanning包含analyst扫描状态
- [ ] handleSidebarAnalystClick设置analystPhase
- [ ] renderAnalystTabs函数实现正确
- [ ] hasAnalystData兼容性确认

**任务3 [军师阅卷组件]:**
- [ ] 真实数据从probeOutput读取
- [ ] competitorCount和compCount使用正确数据源
- [ ] highAuthPct用加权计算（mention_count）
- [ ] 9条规则全覆盖（含规则1和规则6）
- [ ] 日志播放速度匹配API预估时间（15-25秒）
- [ ] 进度条分日志阶段（30%）和API阶段（70%）
- [ ] API调用正确（POST /api/analyst）
- [ ] 错误状态处理正确
- [ ] 光标闪烁效果
- [ ] onScanningChange回调正确

**任务4 [页面集成]:**
- [ ] 组件导入正确
- [ ] onComplete回调展开数据到data
- [ ] onBack回调返回仪表盘
- [ ] analystTabIndex状态管理
- [ ] analystScanning状态传递

**任务5 [beforeunload]:**
- [ ] 军师阅卷期间刷新页面有警告

---

## 交付格式

```
自检结果: X/3 任务1 + X/7 任务2 + X/10 任务3 + X/5 任务4 + X/1 任务5 = XX/26
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. 数据从probeOutput读取，不hardcode
2. 规则检测是前端代码，不调后端
3. 进度条分两阶段：日志（30%）+ API（70%）
4. 日志播放速度动态调整（15-25秒）
5. 日志展示完自动触发API调用
6. 完成后自动切换到report tab
7. 错误时显示错误信息+返回按钮
8. 规则6是近似计算，和后端可能有差异（可接受）
9. 规则1阈值较极端（alignment<60且industry>80%），前端如实复刻后端逻辑，不降低阈值
