# TASK_PROBE_LOADING.md — Probe侦察兵等待页

> 药老出品 · 2026-05-16
> 目标: Probe扫描3-5分钟的富视觉等待页，让用户感受到侦察兵在工作
> 预计工时: 3-4小时

---

## 设计理念

Probe跑3-5分钟，用户需要感受到"我的钱花在了精密仪器上"。不是转圈圈，而是看到侦察兵真的在工作——品牌情报卡回顾自己填的信息，实时数据流展示扫描进度。

## 布局（单屏，左右分栏，不滚动）

```
┌─────────────────────────────────────────────────────────────┐
│  PROBE 侦察兵 · 执行中                          02:34.1     │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│   左栏（45%）            │   右栏（55%）                    │
│                          │                                  │
│   ┌──────────────────┐   │   00:12 品牌画像提取完成         │
│   │ 品牌信息卡       │   │   00:18 识别到核心产品线 4 条    │
│   │                  │   │   00:25 竞品识别：Casetify...   │
│   │ UGREEN           │   │   00:32 ChatGPT · A1/10         │
│   │ ugreen.com       │   │   00:38 品牌被提及 ✓ 第3位      │
│   │                  │   │   00:45 Gemini · A1/10          │
│   │ 核心产品         │   │   00:52 品牌未提及 ✗             │
│   │ 充电宝、数据线   │   │   ...                            │
│   │                  │   │                                  │
│   │ 目标市场         │   │   （每3-5秒出现一条新消息）      │
│   │ 北美、欧洲       │   │                                  │
│   │                  │   │                                  │
│   │ 竞品             │   │                                  │
│   │ Anker · Baseus   │   │                                  │
│   │                  │   │                                  │
│   │ 目标定位         │   │                                  │
│   │ 全球领先的...    │   │                                  │
│   └──────────────────┘   │                                  │
│                          │                                  │
│   ┌──────────────────┐   │                                  │
│   │ 扫描配置         │   │                                  │
│   │                  │   │                                  │
│   │ A类查询 · 10个   │   │                                  │
│   │ 行业通用搜索     │   │                                  │
│   │ → 测试AI是否认识 │   │                                  │
│   │   你的品类       │   │                                  │
│   │                  │   │                                  │
│   │ B类查询 · 10个   │   │                                  │
│   │ 品牌直接搜索     │   │                                  │
│   │ → 测试AI怎么描述 │   │                                  │
│   │   你的品牌       │   │                                  │
│   │                  │   │                                  │
│   │ C类查询 · 10个   │   │                                  │
│   │ 竞品对比搜索     │   │                                  │
│   │ → 测试AI推荐你   │   │                                  │
│   │   还是推荐竞品   │   │                                  │
│   │                  │   │                                  │
│   │ 引擎：ChatGPT    │   │                                  │
│   │ Gemini · Claude  │   │                                  │
│   │ 预计耗时：3-5分钟│   │                                  │
│   └──────────────────┘   │                                  │
│                          │                                  │
├──────────────────────────┴──────────────────────────────────┤
│  品牌扫描 ✓ → 查询生成 ✓ → 引擎搜索 ● → 竞品分析 ○ → 报告 ○ │
└─────────────────────────────────────────────────────────────┘
```

---

## 空间预算（768px最小屏幕）

```
顶部标题栏：40px
内容区：728px - 40px - 48px = 640px
底部Pipeline：48px
总计：728px ✓
```

---

## 需要新建的文件

`frontend/components/scan-probe-loading.tsx`

## Props

```typescript
import type { BriefingData } from "./scan-briefing";

interface Props {
  elapsed: number;           // 秒
  domain: string;
  brandName: string;
  briefingData: BriefingData;  // 从简报室传入
}
```

---

## 顶部标题栏（高度40px）

```tsx
<div
  className="flex items-center justify-between px-6 h-10 shrink-0"
  style={{
    background: "rgba(255,255,255,0.015)",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  }}
>
  <span
    className="text-[11px] font-mono tracking-[0.15em] uppercase"
    style={{ color: "#5E5E78" }}
  >
    PROBE 侦察兵 · 执行中
  </span>
  <span
    className="font-mono text-2xl font-semibold tracking-tight"
    style={{
      color: "#38BDF8",
      textShadow: "0 0 20px rgba(56,189,248,0.15)",
    }}
  >
    {formatElapsed(elapsed)}
  </span>
</div>
```

---

## 左栏：品牌信息卡

```tsx
<div
  className="p-4"
  style={{
    background: "rgba(255,255,255,0.015)",
    border: "1px solid rgba(255,255,255,0.04)",
  }}
>
  <p className="text-sm font-medium mb-1" style={{ color: "#EDEDF5" }}>
    {briefingData.brandName}
  </p>
  <p className="text-[11px] font-mono mb-4" style={{ color: "#5E5E78" }}>
    {briefingData.domain}
  </p>

  <div className="space-y-3">
    <Field label="核心产品" value={briefingData.coreProduct} />
    <Field label="目标市场" value={briefingData.targetMarket} />
    <Field label="竞品" value={briefingData.competitors.join(" · ")} />
    <Field label="目标定位" value={briefingData.targetPositioning} />
  </div>
</div>

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="text-[10px] font-mono tracking-wider uppercase mb-1"
        style={{ color: "rgba(255,255,255,0.14)" }}
      >
        {label}
      </p>
      <p className="text-xs" style={{ color: "#9A9AB0" }}>
        {value || "—"}
      </p>
    </div>
  );
}
```

---

## 左栏：扫描配置卡

```tsx
<div
  className="p-4"
  style={{
    background: "rgba(255,255,255,0.015)",
    border: "1px solid rgba(255,255,255,0.04)",
  }}
>
  <p
    className="text-[10px] font-mono tracking-wider uppercase mb-3"
    style={{ color: "rgba(255,255,255,0.14)" }}
  >
    扫描配置
  </p>

  <div className="space-y-3">
    <QueryType
      label="A类查询"
      count={10}
      desc="行业通用搜索"
      explain="→ 测试AI是否认识你的品类"
    />
    <QueryType
      label="B类查询"
      count={10}
      desc="品牌直接搜索"
      explain="→ 测试AI怎么描述你的品牌"
    />
    <QueryType
      label="C类查询"
      count={10}
      desc="竞品对比搜索"
      explain="→ 测试AI推荐你还是推荐竞品"
    />
  </div>

  <div
    className="mt-4 pt-3"
    style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
  >
    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.08)" }}>
      引擎：ChatGPT · Gemini · Claude
    </p>
    <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.08)" }}>
      预计耗时：3-5分钟
    </p>
  </div>
</div>

function QueryType({
  label,
  count,
  desc,
  explain,
}: {
  label: string;
  count: number;
  desc: string;
  explain: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "#9A9AB0" }}>
          {label} · {desc}
        </span>
        <span className="text-xs font-mono" style={{ color: "#5E5E78" }}>
          {count}个
        </span>
      </div>
      <p className="text-[10px] pl-2 mt-0.5" style={{ color: "rgba(255,255,255,0.08)" }}>
        {explain}
      </p>
    </div>
  );
}
```

---

## 右栏：实时数据流

### 模拟消息脚本（360秒）

```typescript
interface MockMessage {
  time: number;      // 秒
  text: string;
  type: "info" | "success" | "error";
}

const MOCK_MESSAGES: MockMessage[] = [
  // ═══════ 阶段1：品牌扫描（0-20秒）═══════
  { time: 3, text: "开始扫描品牌官网...", type: "info" },
  { time: 6, text: "抓取官网结构化数据 · 识别到 12 个页面", type: "info" },
  { time: 10, text: "提取品牌实体：品牌名、产品线、价值主张", type: "info" },
  { time: 14, text: "品牌画像完成 · 识别到核心产品线 4 条", type: "success" },
  { time: 17, text: "行业定位：消费电子 → 手机配件 → 环保手机壳", type: "info" },
  { time: 20, text: "品牌扫描阶段完成 ✓", type: "success" },

  // ═══════ 阶段2：查询生成（20-35秒）═══════
  { time: 22, text: "DeepSeek 查询词生成引擎启动...", type: "info" },
  { time: 25, text: "A类查询完成 · 10个行业通用词", type: "success" },
  { time: 28, text: "B类查询完成 · 10个品牌直接词", type: "success" },
  { time: 30, text: "C类查询完成 · 10个竞品对比词", type: "success" },
  { time: 35, text: "查询词生成完成 ✓ · 共30个查询词", type: "success" },

  // ═══════ 阶段3：ChatGPT引擎搜索（35-150秒）═══════
  { time: 38, text: "ChatGPT引擎启动 · 开始搜索...", type: "info" },
  { time: 42, text: "ChatGPT · A1/10 · \"best eco friendly phone case\"", type: "info" },
  { time: 46, text: "ChatGPT · 品牌被提及 ✓ · 位置：第3位", type: "success" },
  { time: 50, text: "ChatGPT · A2/10 · \"top sustainable phone case brands\"", type: "info" },
  { time: 54, text: "ChatGPT · 品牌未提及 ✗", type: "error" },
  { time: 58, text: "ChatGPT · A3/10 · \"biodegradable phone case review\"", type: "info" },
  { time: 62, text: "ChatGPT · 品牌被提及 ✓ · 位置：第5位", type: "success" },
  { time: 66, text: "ChatGPT · A4/10 · \"phone case buying guide 2026\"", type: "info" },
  { time: 70, text: "ChatGPT · 品牌未提及 ✗", type: "error" },
  { time: 74, text: "ChatGPT · A5/10 · \"eco friendly tech accessories\"", type: "info" },
  { time: 78, text: "ChatGPT · 品牌被提及 ✓ · 位置：第2位", type: "success" },
  { time: 82, text: "ChatGPT · A类查询完成 · 引用率 40%", type: "info" },
  { time: 85, text: "ChatGPT · 开始搜索B类查询...", type: "info" },
  { time: 88, text: "ChatGPT · B1/10 · \"UGREEN review\"", type: "info" },
  { time: 91, text: "ChatGPT · 品牌被提及 ✓ · 推荐位置：顶部", type: "success" },
  { time: 94, text: "ChatGPT · B2/10 · \"UGREEN quality\"", type: "info" },
  { time: 97, text: "ChatGPT · 品牌被提及 ✓ · 推荐位置：中部", type: "success" },
  { time: 100, text: "ChatGPT · B3/10 · \"is UGREEN worth it\"", type: "info" },
  { time: 103, text: "ChatGPT · 品牌被提及 ✓ · 推荐位置：顶部", type: "success" },
  { time: 106, text: "ChatGPT · B类查询完成 · 引用率 80%", type: "success" },
  { time: 109, text: "ChatGPT · 开始搜索C类查询...", type: "info" },
  { time: 112, text: "ChatGPT · C1/10 · \"UGREEN vs Anker\"", type: "info" },
  { time: 115, text: "ChatGPT · 品牌被提及 ✓ · 竞品Anker也被提及", type: "info" },
  { time: 118, text: "ChatGPT · C2/10 · \"UGREEN vs Baseus\"", type: "info" },
  { time: 121, text: "ChatGPT · 品牌被提及 ✓ · 竞品Baseus也被提及", type: "info" },
  { time: 124, text: "ChatGPT · C3/10 · \"best phone case brands\"", type: "info" },
  { time: 127, text: "ChatGPT · 品牌未提及 ✗ · 竞品Casetify被提及", type: "error" },
  { time: 130, text: "ChatGPT · C类查询完成 · 引用率 60%", type: "info" },
  { time: 135, text: "ChatGPT引擎搜索完成 ✓ · 总引用率 55%", type: "success" },
  { time: 138, text: "ChatGPT · 推荐率 35% · 头部引用率 15%", type: "info" },

  // ═══════ 阶段3：Gemini引擎搜索（150-250秒）═══════
  { time: 142, text: "Gemini引擎启动 · 开始搜索...", type: "info" },
  { time: 146, text: "Gemini · A1/10 · \"best eco friendly phone case\"", type: "info" },
  { time: 150, text: "Gemini · 品牌未提及 ✗", type: "error" },
  { time: 154, text: "Gemini · A2/10 · \"top sustainable phone case brands\"", type: "info" },
  { time: 158, text: "Gemini · 品牌被提及 ✓ · 位置：第7位", type: "success" },
  { time: 162, text: "Gemini · A3/10 · \"biodegradable phone case review\"", type: "info" },
  { time: 166, text: "Gemini · 品牌未提及 ✗", type: "error" },
  { time: 170, text: "Gemini · A类查询完成 · 引用率 20%", type: "info" },
  { time: 174, text: "Gemini · 开始搜索B类查询...", type: "info" },
  { time: 178, text: "Gemini · B1/10 · \"UGREEN review\"", type: "info" },
  { time: 182, text: "Gemini · 品牌被提及 ✓ · 推荐位置：中部", type: "success" },
  { time: 186, text: "Gemini · B2/10 · \"UGREEN quality\"", type: "info" },
  { time: 190, text: "Gemini · 品牌被提及 ✓ · 推荐位置：底部", type: "success" },
  { time: 194, text: "Gemini · B类查询完成 · 引用率 70%", type: "success" },
  { time: 198, text: "Gemini · 开始搜索C类查询...", type: "info" },
  { time: 202, text: "Gemini · C1/10 · \"UGREEN vs Anker\"", type: "info" },
  { time: 206, text: "Gemini · 品牌被提及 ✓ · 竞品Anker也被提及", type: "info" },
  { time: 210, text: "Gemini · C2/10 · \"best phone case brands\"", type: "info" },
  { time: 214, text: "Gemini · 品牌未提及 ✗ · 竞品Casetify被提及", type: "error" },
  { time: 218, text: "Gemini · C类查询完成 · 引用率 50%", type: "info" },
  { time: 225, text: "Gemini引擎搜索完成 ✓ · 总引用率 42%", type: "success" },
  { time: 228, text: "Gemini · 推荐率 28% · 头部引用率 10%", type: "info" },

  // ═══════ 阶段3：Claude引擎搜索（250-320秒）═══════
  { time: 232, text: "Claude引擎启动 · 开始搜索...", type: "info" },
  { time: 236, text: "Claude · A1/10 · \"best eco friendly phone case\"", type: "info" },
  { time: 240, text: "Claude · 品牌被提及 ✓ · 位置：第4位", type: "success" },
  { time: 244, text: "Claude · A2/10 · \"top sustainable phone case brands\"", type: "info" },
  { time: 248, text: "Claude · 品牌未提及 ✗", type: "error" },
  { time: 252, text: "Claude · A类查询完成 · 引用率 30%", type: "info" },
  { time: 256, text: "Claude · 开始搜索B类查询...", type: "info" },
  { time: 260, text: "Claude · B1/10 · \"UGREEN review\"", type: "info" },
  { time: 264, text: "Claude · 品牌被提及 ✓ · 推荐位置：顶部", type: "success" },
  { time: 268, text: "Claude · B类查询完成 · 引用率 75%", type: "success" },
  { time: 272, text: "Claude · 开始搜索C类查询...", type: "info" },
  { time: 276, text: "Claude · C1/10 · \"UGREEN vs Anker\"", type: "info" },
  { time: 280, text: "Claude · 品牌被提及 ✓ · 竞品Anker也被提及", type: "info" },
  { time: 284, text: "Claude · C类查询完成 · 引用率 55%", type: "info" },
  { time: 290, text: "Claude引擎搜索完成 ✓ · 总引用率 48%", type: "success" },
  { time: 293, text: "Claude · 推荐率 32% · 头部引用率 12%", type: "info" },

  // ═══════ 阶段4：竞品分析（320-340秒）═══════
  { time: 298, text: "三引擎搜索完成 · 开始竞品分析...", type: "info" },
  { time: 302, text: "竞品识别：Casetify、Pela、Wildflower、Burga", type: "info" },
  { time: 306, text: "场景1/9 · \"best eco friendly phone case\" · 对比中...", type: "info" },
  { time: 310, text: "场景1完成 · 你的品牌排名第3 · Casetify排名第1", type: "info" },
  { time: 314, text: "场景5/9 · \"sustainable phone accessories\" · 对比中...", type: "info" },
  { time: 318, text: "场景5完成 · 你的品牌排名第2 · Pela排名第1", type: "success" },
  { time: 322, text: "9个场景逐维度对比完成 ✓", type: "success" },

  // ═══════ 阶段5：报告生成（340-360秒）═══════
  { time: 326, text: "综合评分计算中...", type: "info" },
  { time: 330, text: "A类引用率：30% · B类引用率：75% · C类引用率：55%", type: "info" },
  { time: 334, text: "Gap分析：品牌自述 vs AI认知差距...", type: "info" },
  { time: 338, text: "AI认知画像生成中...", type: "info" },
  { time: 342, text: "引用来源权威度分析...", type: "info" },
  { time: 346, text: "报告生成完成 ✓", type: "success" },
  { time: 350, text: "综合评分：67/100 · 行业引用率：30%", type: "info" },
  { time: 355, text: "侦察任务完成 · 正在生成侦察报告...", type: "success" },
];
```

### 渲染逻辑

```tsx
function DataFeed({ elapsed }: { elapsed: number }) {
  const visibleMessages = MOCK_MESSAGES.filter((m) => m.time <= elapsed);
  const recentMessages = visibleMessages.slice(-15); // 只显示最近15条

  return (
    <div
      className="relative flex-1 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.01)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* 顶部渐变遮罩 */}
      <div
        className="absolute top-0 left-0 right-0 h-8 pointer-events-none z-10"
        style={{
          background: "linear-gradient(180deg, #0A0A0F 0%, transparent 100%)",
        }}
      />

      {/* 消息列表 */}
      <div className="p-4 space-y-1.5 overflow-hidden h-full">
        {recentMessages.map((msg, i) => (
          <motion.div
            key={`${msg.time}-${i}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-2"
          >
            <span
              className="text-[10px] font-mono shrink-0 w-10"
              style={{ color: "#5E5E78" }}
            >
              {formatTime(msg.time)}
            </span>
            <span
              className="text-[11px] font-mono leading-tight"
              style={{
                color:
                  msg.type === "success"
                    ? "#22C55E"
                    : msg.type === "error"
                      ? "#EF4444"
                      : "#9A9AB0",
              }}
            >
              {msg.text}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
```

---

## 底部：Progress Pipeline

```tsx
const PHASES = [
  { label: "品牌扫描", threshold: 20 },
  { label: "查询生成", threshold: 35 },
  { label: "引擎搜索", threshold: 280 },
  { label: "竞品分析", threshold: 310 },
  { label: "报告生成", threshold: Infinity },
];

function Pipeline({ elapsed }: { elapsed: number }) {
  let phaseIdx = PHASES.findIndex((p) => elapsed < p.threshold);
  if (phaseIdx === -1) phaseIdx = PHASES.length - 1;

  return (
    <div
      className="flex items-center justify-between px-6 py-3 shrink-0"
      style={{
        background: "rgba(255,255,255,0.01)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {PHASES.map((phase, i) => {
        const isDone = i < phaseIdx;
        const isActive = i === phaseIdx;

        return (
          <div key={i} className="flex items-center">
            <div className="flex items-center gap-1.5">
              {/* 状态灯 */}
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  background: isDone
                    ? "#22C55E"
                    : isActive
                      ? "#38BDF8"
                      : "#1E1E2A",
                  boxShadow: isDone
                    ? "0 0 3px rgba(34,197,94,0.4)"
                    : isActive
                      ? "0 0 6px rgba(56,189,248,0.5)"
                      : "none",
                  animation: isActive
                    ? "phaseDotActive 1.8s ease-in-out infinite"
                    : "none",
                }}
              />
              {/* 阶段名 */}
              <span
                className="text-[10px] tracking-wide"
                style={{
                  color: isDone
                    ? "#4A7A5A"
                    : isActive
                      ? "#7DD3FC"
                      : "#1A1A28",
                }}
              >
                {phase.label}
              </span>
            </div>

            {/* 连接线 */}
            {i < PHASES.length - 1 && (
              <div
                className="w-6 md:w-10 mx-1.5 h-px"
                style={{
                  background: isDone
                    ? "linear-gradient(90deg, rgba(34,197,94,0.3), rgba(34,197,94,0.05))"
                    : "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## 主组件组装

```tsx
export function ScanProbeLoading({
  elapsed,
  domain,
  brandName,
  briefingData,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col h-full"
    >
      {/* 顶部标题栏 */}
      <TopBar elapsed={elapsed} />

      {/* 内容区：左右分栏 */}
      <div className="flex-1 flex gap-4 p-4 min-h-0">
        {/* 左栏 */}
        <div className="w-[45%] flex flex-col gap-3">
          <BrandCard briefingData={briefingData} />
          <ScanConfigCard />
        </div>

        {/* 右栏 */}
        <div className="w-[55%] flex flex-col">
          <DataFeed elapsed={elapsed} />
        </div>
      </div>

      {/* 底部Pipeline */}
      <Pipeline elapsed={elapsed} />
    </motion.div>
  );
}
```

---

## CSS动画（添加到globals.css）

```css
@keyframes phaseDotActive {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

---

## 验证方法

- 测试1: 进入等待页 → 左栏显示品牌信息和扫描配置
- 测试2: 等待5秒 → 右栏出现第一条消息
- 测试3: 等待30秒 → 右栏显示5-6条消息，底部pipeline显示"查询生成 ✓"
- 测试4: 页面单屏不滚动，768px屏幕下所有内容可见
- 测试5: 引擎文案显示ChatGPT、Gemini、Claude（不是GPT-4o、Haiku）
- 测试6: 数据流消息颜色：成功=绿色，失败=红色，进行中=灰色

---

## CHECKLIST 自检

- [ ] 单屏不滚动，768px屏幕下所有内容可见
- [ ] 左栏品牌信息卡正确显示briefingData
- [ ] 左栏扫描配置卡有查询词作用解释（A/B/C三类）
- [ ] 右栏数据流每3-5秒出现新消息
- [ ] 数据流消息颜色正确（success/error/info）
- [ ] 底部Pipeline根据elapsed更新阶段
- [ ] 引擎文案：ChatGPT、Gemini、Claude
- [ ] 计时器显示正确（mm:ss.s格式）
- [ ] 所有动画使用CSS transform/opacity（不动画top/width/height）

---

## 交付格式

```
自检结果: X/9
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. 不要改scan-loading.tsx（Light模式等待页保持不变）
2. 等待页的模拟数据是硬编码的，不需要后端支持
3. BriefingData类型从scan-briefing.tsx导入（如果还没有，先定义本地接口）
4. 引擎文案统一：ChatGPT、Gemini、Claude（不是GPT-4o、Haiku）
5. 右栏数据流容器高度用flex-1填满，不要写死px
