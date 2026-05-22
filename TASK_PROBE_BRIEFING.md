# TASK_PROBE_BRIEFING.md — 简报室 + 等待页

> 药老出品 · 2026-05-16
> 目标: Probe侦察兵的用户交互流程：简报室（收集8字段）→ 等待页（360秒模拟数据流）
> 预计工时: 6-8小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 简报室组件（5步流程） | 新建 components/scan-briefing.tsx | 3h |
| 2 | 等待页组件（模拟数据流） | 新建 components/scan-probe-loading.tsx | 2h |
| 3 | scan/page.tsx 接线 | 修改 app/(app)/scan/page.tsx | 1h |
| 4 | 后端接收confirmed_queries | 修改 langgraph_app/nodes/probe_node.py | 1h |

**完成标准**: 用户从Dashboard点"Probe 侦察兵"→ 进入简报室5步 → 启动扫描 → 等待页360秒 → 进入Probe报告页

---

## 前置知识：设计系统（Dark Luxe风格）

### 色彩规范
```css
--bg-primary: #0A0A0F;
--bg-surface: rgba(255,255,255,0.015);
--bg-elevated: rgba(255,255,255,0.025);
--border: rgba(255,255,255,0.04);
--border-accent: rgba(56,189,248,0.14);
--text-primary: #EDEDF5;
--text-secondary: #9A9AB0;
--text-muted: #5E5E78;
--accent: #38BDF8;
--accent-subtle: rgba(56,189,248,0.10);
--success: #22C55E;
--error: #EF4444;
--warning: #F59E0B;
```

### 字体规范
- 正文：Inter, system-ui, sans-serif, 14px
- 数字/数据：JetBrains Mono, monospace
- 标签：10px, mono, tracking-0.15em, uppercase, muted色

### 禁止模式（Anti-AI-Slop）
- NO purple/indigo accent
- NO gradient text on H1
- NO rounded-2xl
- NO glowing orb backgrounds
- NO "Transform your business" copy

---

## 任务1: 简报室组件（scan-briefing.tsx）

### 问题

Probe侦察兵需要收集8个字段信息，比初步体检的4个字段多一倍。需要一个专业的"出征简报室"交互流程，让用户分5步填写，每步不压人。

### 需要新建的文件

`frontend/components/scan-briefing.tsx`

### Props

```typescript
interface Props {
  onComplete: (data: BriefingData) => void;
  onBack: () => void;
  initialData?: Partial<BriefingData>;  // 从初步体检带入的预填数据
}

interface BriefingData {
  domain: string;
  brandName: string;
  industry: string;
  targetMarket: string;
  coreProduct: string;
  competitors: string[];
  targetPositioning: string;
  seedQueries: string[];
}
```

### 5步流程设计

```
Step 1: 身份确认 (Who are you)
  - domain（预填，不可编辑）
  - brandName（预填，不可编辑）
  - 显示"已从初步体检带入"绿色标记

Step 2: 战场情报 (Where do you fight)
  - industry（预填，可编辑）
  - targetMarket（预填，可编辑）
  - coreProduct（用户输入，placeholder: "你的核心产品是什么？如：充电宝、数据线"）
  - targetPositioning（用户输入，placeholder: "用一句话描述你希望AI怎么定位你的品牌"）

Step 3: 敌军情报 (Who are you up against)
  - competitors（从初步体检的competitor_mentions自动带入，用户可删除/添加）
  - 显示"初步体检发现这些品牌经常与你一起出现"
  - 每个竞品标签可删除（×按钮）
  - 底部输入框可添加新竞品

Step 4: 侦察方向 (What should I investigate)
  - seedQueries（自动生成，用户可编辑）
  - 分三组展示：
    - A类查询（10个）：行业通用，标注"用于引擎对比，建议保持AI生成"
    - B类查询（10个）：品牌直接，可编辑
    - C类查询（10个）：竞品对比，可编辑
  - 每个查询词标签可删除
  - 底部输入框可添加

Step 5: 简报确认 (Review & launch)
  - 所有8个字段一览
  - 扫描配置：A类10个 + B类10个 + C类10个，3引擎
  - 预计耗时：3-5分钟
  - "启动侦察"按钮
```

### 每步的布局

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Step 2/5 · 战场情报                                │
│                                                     │
│  你的品牌在哪个战场竞争？                            │
│  侦察兵需要了解你的行业和目标市场，才能精准扫描。    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 行业                        [已从体检带入]  │    │
│  │ ┌─────────────────────────────────────────┐ │    │
│  │ │ 消费电子 → 手机配件                    │ │    │
│  │ └─────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 目标市场                                    │    │
│  │ ┌─────────────────────────────────────────┐ │    │
│  │ │ 北美、欧洲                              │ │    │
│  │ └─────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 核心产品 *                      [必填]      │    │
│  │ ┌─────────────────────────────────────────┐ │    │
│  │ │ 你的核心产品是什么？如：充电宝、数据线  │ │    │
│  │ └─────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│        [上一步]                    [下一步 →]        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 关键交互

1. **预填数据标记**：从初步体检带入的字段，右侧显示绿色"已从体检带入"标签
2. **必填验证**：Step 2的coreProduct为必填，未填时"下一步"按钮disabled
3. **键盘支持**：Enter跳到下一步，Escape返回上一步
4. **步骤指示器**：顶部显示 ①②③④⑤ 进度条
5. **竞品标签**：Step 3的竞品用标签形式展示，每个可删除
6. **查询词分组**：Step 4的查询词分A/B/C三组，用不同颜色区分

### Step 4 查询词的数据来源

从后端API获取：`POST /api/expand-queries`

```typescript
// 前端调用
const res = await fetch(`${API_BASE}/api/expand-queries`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    domain: data.domain,
    brand_name: data.brandName,
    industry: data.industry,
    core_product: data.coreProduct,
    competitors: data.competitors,
  }),
});
const { queries } = await res.json();
// queries: { a: string[], b: string[], c: string[] }
```

如果后端还没有这个接口，先用mock数据：

```typescript
const MOCK_QUERIES = {
  a: [
    "best eco friendly phone case",
    "sustainable phone case brands",
    "biodegradable phone case review",
    "top phone case brands 2026",
    "phone case buying guide",
    "eco friendly tech accessories",
    "sustainable phone accessories",
    "phone case vs alternative",
    "where to buy phone case",
    "phone case pros and cons",
  ],
  b: [
    "UGREEN review",
    "UGREEN quality",
    "is UGREEN worth it",
    "UGREEN recommended",
    "UGREEN where to buy",
    "UGREEN price",
    "UGREEN customer experience",
    "UGREEN vs Anker",
    "UGREEN vs Baseus",
    "UGREEN products",
  ],
  c: [
    "UGREEN vs Anker",
    "UGREEN vs Baseus",
    "Anker review",
    "Baseus review",
    "Anker vs Baseus",
    "best phone case brands",
    "Casetify review",
    "Pela review",
    "UGREEN alternative",
    "Anker alternative",
  ],
};
```

### 验证方法

- 测试1: 从Dashboard进入简报室 → Step 1预填domain和brandName
- 测试2: Step 2未填coreProduct → "下一步"按钮disabled
- 测试3: Step 3删除一个竞品 → 该竞品标签消失
- 测试4: Step 4添加一个B类查询 → 该查询出现在列表中
- 测试5: Step 5点击"启动侦察" → 触发onComplete回调，传入完整BriefingData

---

## 任务2: 等待页组件（scan-probe-loading.tsx）

### 问题

Probe扫描需要3-5分钟，需要一个富视觉的等待页面，让用户感受到侦察兵在工作。当前scan-loading.tsx是为Light模式设计的（30-50秒），不适合Probe。

### 需要新建的文件

`frontend/components/scan-probe-loading.tsx`

### Props

```typescript
interface Props {
  elapsed: number;  // 秒
  domain: string;
  brandName: string;
  briefingData: BriefingData;  // 从简报室传入
}
```

### 布局（单屏，左右分栏，不滚动）

```
┌─────────────────────────────────────────────────────────────┐
│  PROBE 侦察兵 · 执行中                          02:34.1     │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│   左栏：品牌情报卡       │   右栏：实时数据流               │
│   (45%宽度)              │   (55%宽度)                      │
│                          │                                  │
│   ┌──────────────────┐   │   00:12 品牌画像提取完成         │
│   │ UGREEN           │   │   00:18 识别到核心产品线 4 条    │
│   │ ugreen.com       │   │   00:25 竞品识别：Casetify...   │
│   │                  │   │   00:32 ChatGPT · A1/10         │
│   │ 核心产品         │   │   00:38 品牌被提及 ✓ 第3位      │
│   │ 充电宝、数据线   │   │   00:45 Gemini · A1/10          │
│   │                  │   │   00:52 品牌未提及 ✗             │
│   │ 目标市场         │   │   ...                            │
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

### 顶部标题栏（高度40px）

```typescript
<div className="flex items-center justify-between px-6 h-10"
  style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
  <span className="text-[11px] font-mono tracking-[0.15em] uppercase" style={{ color: "#5E5E78" }}>
    PROBE 侦察兵 · 执行中
  </span>
  <span className="font-mono text-2xl font-semibold tracking-tight"
    style={{ color: "#38BDF8", textShadow: "0 0 20px rgba(56,189,248,0.15)" }}>
    {formatElapsed(elapsed)}
  </span>
</div>
```

### 左栏：品牌情报卡

**卡片1：品牌信息**

```typescript
<div className="p-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
  <p className="text-sm font-medium mb-3" style={{ color: "#EDEDF5" }}>{briefingData.brandName}</p>
  <p className="text-[11px] font-mono mb-4" style={{ color: "#5E5E78" }}>{briefingData.domain}</p>
  
  <div className="space-y-3">
    <div>
      <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(255,255,255,0.14)" }}>核心产品</p>
      <p className="text-xs" style={{ color: "#9A9AB0" }}>{briefingData.coreProduct}</p>
    </div>
    <div>
      <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(255,255,255,0.14)" }}>目标市场</p>
      <p className="text-xs" style={{ color: "#9A9AB0" }}>{briefingData.targetMarket}</p>
    </div>
    <div>
      <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(255,255,255,0.14)" }}>竞品</p>
      <p className="text-xs" style={{ color: "#9A9AB0" }}>{briefingData.competitors.join(" · ")}</p>
    </div>
    <div>
      <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(255,255,255,0.14)" }}>目标定位</p>
      <p className="text-xs" style={{ color: "#9A9AB0" }}>{briefingData.targetPositioning}</p>
    </div>
  </div>
</div>
```

**卡片2：扫描配置**

```typescript
<div className="p-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
  <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: "rgba(255,255,255,0.14)" }}>扫描配置</p>
  
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: "#9A9AB0" }}>A类查询 · 行业通用</span>
      <span className="text-xs font-mono" style={{ color: "#5E5E78" }}>10个</span>
    </div>
    <p className="text-[10px] pl-2" style={{ color: "rgba(255,255,255,0.08)" }}>→ 测试AI是否认识你的品类</p>
    
    <div className="flex items-center justify-between mt-2">
      <span className="text-xs" style={{ color: "#9A9AB0" }}>B类查询 · 品牌直接</span>
      <span className="text-xs font-mono" style={{ color: "#5E5E78" }}>10个</span>
    </div>
    <p className="text-[10px] pl-2" style={{ color: "rgba(255,255,255,0.08)" }}>→ 测试AI怎么描述你的品牌</p>
    
    <div className="flex items-center justify-between mt-2">
      <span className="text-xs" style={{ color: "#9A9AB0" }}>C类查询 · 竞品对比</span>
      <span className="text-xs font-mono" style={{ color: "#5E5E78" }}>10个</span>
    </div>
    <p className="text-[10px] pl-2" style={{ color: "rgba(255,255,255,0.08)" }}>→ 测试AI推荐你还是推荐竞品</p>
  </div>
  
  <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.08)" }}>
      引擎：ChatGPT · Gemini · Claude
    </p>
    <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.08)" }}>
      预计耗时：3-5分钟
    </p>
  </div>
</div>
```

### 右栏：实时数据流

```typescript
// 模拟消息数据结构
interface MockMessage {
  time: number;      // 秒
  text: string;
  type: "info" | "success" | "error";
}

// 消息列表（360秒完整脚本）
const MOCK_MESSAGES: MockMessage[] = [
  // 阶段1：品牌扫描（0-20秒）
  { time: 3, text: "开始扫描品牌官网...", type: "info" },
  { time: 6, text: "抓取官网结构化数据 · 识别到 12 个页面", type: "info" },
  { time: 10, text: "提取品牌实体：品牌名、产品线、价值主张", type: "info" },
  { time: 14, text: "品牌画像完成 · 识别到核心产品线 4 条", type: "success" },
  { time: 17, text: "行业定位：消费电子 → 手机配件 → 环保手机壳", type: "info" },
  { time: 20, text: "品牌扫描阶段完成 ✓", type: "success" },

  // 阶段2：查询生成（20-35秒）
  { time: 22, text: "DeepSeek 查询词生成引擎启动...", type: "info" },
  { time: 25, text: "A类查询完成 · 10个行业通用词", type: "success" },
  { time: 28, text: "B类查询完成 · 10个品牌直接词", type: "success" },
  { time: 30, text: "C类查询完成 · 10个竞品对比词", type: "success" },
  { time: 35, text: "查询词生成完成 ✓ · 共30个查询词", type: "success" },

  // 阶段3：ChatGPT引擎搜索（35-150秒）
  { time: 38, text: "ChatGPT引擎启动 · 开始搜索...", type: "info" },
  { time: 42, text: "ChatGPT · A1/10 · \"best eco friendly phone case\"", type: "info" },
  { time: 46, text: "ChatGPT · 品牌被提及 ✓ · 位置：第3位", type: "success" },
  { time: 50, text: "ChatGPT · A2/10 · \"top sustainable phone case brands\"", type: "info" },
  { time: 54, text: "ChatGPT · 品牌未提及 ✗", type: "error" },
  { time: 58, text: "ChatGPT · A3/10 · \"biodegradable phone case review\"", type: "info" },
  { time: 62, text: "ChatGPT · 品牌被提及 ✓ · 位置：第5位", type: "success" },
  { time: 70, text: "ChatGPT · A5/10 · \"eco friendly tech accessories\"", type: "info" },
  { time: 74, text: "ChatGPT · 品牌被提及 ✓ · 位置：第2位", type: "success" },
  { time: 78, text: "ChatGPT · A类查询完成 · 引用率 40%", type: "info" },
  { time: 82, text: "ChatGPT · 开始搜索B类查询...", type: "info" },
  { time: 86, text: "ChatGPT · B1/10 · \"UGREEN review\"", type: "info" },
  { time: 90, text: "ChatGPT · 品牌被提及 ✓ · 推荐位置：顶部", type: "success" },
  { time: 94, text: "ChatGPT · B2/10 · \"UGREEN quality\"", type: "info" },
  { time: 98, text: "ChatGPT · 品牌被提及 ✓ · 推荐位置：中部", type: "success" },
  { time: 102, text: "ChatGPT · B3/10 · \"is UGREEN worth it\"", type: "info" },
  { time: 106, text: "ChatGPT · 品牌被提及 ✓ · 推荐位置：顶部", type: "success" },
  { time: 110, text: "ChatGPT · B类查询完成 · 引用率 80%", type: "success" },
  { time: 114, text: "ChatGPT · 开始搜索C类查询...", type: "info" },
  { time: 118, text: "ChatGPT · C1/10 · \"UGREEN vs Anker\"", type: "info" },
  { time: 122, text: "ChatGPT · 品牌被提及 ✓ · 竞品Anker也被提及", type: "info" },
  { time: 126, text: "ChatGPT · C3/10 · \"best phone case brands\"", type: "info" },
  { time: 130, text: "ChatGPT · 品牌未提及 ✗ · 竞品Casetify被提及", type: "error" },
  { time: 134, text: "ChatGPT · C类查询完成 · 引用率 60%", type: "info" },
  { time: 138, text: "ChatGPT引擎搜索完成 ✓ · 总引用率 55%", type: "success" },
  { time: 142, text: "ChatGPT · 推荐率 35% · 头部引用率 15%", type: "info" },

  // 阶段3：Gemini引擎搜索（150-250秒）
  { time: 146, text: "Gemini引擎启动 · 开始搜索...", type: "info" },
  { time: 150, text: "Gemini · A1/10 · \"best eco friendly phone case\"", type: "info" },
  { time: 154, text: "Gemini · 品牌未提及 ✗", type: "error" },
  { time: 158, text: "Gemini · A2/10 · \"top sustainable phone case brands\"", type: "info" },
  { time: 162, text: "Gemini · 品牌被提及 ✓ · 位置：第7位", type: "success" },
  { time: 166, text: "Gemini · A类查询完成 · 引用率 20%", type: "info" },
  { time: 170, text: "Gemini · 开始搜索B类查询...", type: "info" },
  { time: 174, text: "Gemini · B1/10 · \"UGREEN review\"", type: "info" },
  { time: 178, text: "Gemini · 品牌被提及 ✓ · 推荐位置：中部", type: "success" },
  { time: 182, text: "Gemini · B类查询完成 · 引用率 70%", type: "success" },
  { time: 186, text: "Gemini · 开始搜索C类查询...", type: "info" },
  { time: 190, text: "Gemini · C1/10 · \"UGREEN vs Anker\"", type: "info" },
  { time: 194, text: "Gemini · 品牌被提及 ✓ · 竞品Anker也被提及", type: "info" },
  { time: 198, text: "Gemini · C类查询完成 · 引用率 50%", type: "info" },
  { time: 205, text: "Gemini引擎搜索完成 ✓ · 总引用率 42%", type: "success" },
  { time: 208, text: "Gemini · 推荐率 28% · 头部引用率 10%", type: "info" },

  // 阶段3：Claude引擎搜索（250-320秒）
  { time: 212, text: "Claude引擎启动 · 开始搜索...", type: "info" },
  { time: 216, text: "Claude · A1/10 · \"best eco friendly phone case\"", type: "info" },
  { time: 220, text: "Claude · 品牌被提及 ✓ · 位置：第4位", type: "success" },
  { time: 224, text: "Claude · A2/10 · \"top sustainable phone case brands\"", type: "info" },
  { time: 228, text: "Claude · 品牌未提及 ✗", type: "error" },
  { time: 232, text: "Claude · A类查询完成 · 引用率 30%", type: "info" },
  { time: 236, text: "Claude · 开始搜索B类查询...", type: "info" },
  { time: 240, text: "Claude · B1/10 · \"UGREEN review\"", type: "info" },
  { time: 244, text: "Claude · 品牌被提及 ✓ · 推荐位置：顶部", type: "success" },
  { time: 248, text: "Claude · B类查询完成 · 引用率 75%", type: "success" },
  { time: 252, text: "Claude · 开始搜索C类查询...", type: "info" },
  { time: 256, text: "Claude · C1/10 · \"UGREEN vs Anker\"", type: "info" },
  { time: 260, text: "Claude · 品牌被提及 ✓ · 竞品Anker也被提及", type: "info" },
  { time: 264, text: "Claude · C类查询完成 · 引用率 55%", type: "info" },
  { time: 270, text: "Claude引擎搜索完成 ✓ · 总引用率 48%", type: "success" },
  { time: 273, text: "Claude · 推荐率 32% · 头部引用率 12%", type: "info" },

  // 阶段4：竞品分析（320-340秒）
  { time: 280, text: "三引擎搜索完成 · 开始竞品分析...", type: "info" },
  { time: 285, text: "竞品识别：Casetify、Pela、Wildflower、Burga", type: "info" },
  { time: 290, text: "场景1/9 · \"best eco friendly phone case\" · 对比中...", type: "info" },
  { time: 295, text: "场景1完成 · 你的品牌排名第3 · Casetify排名第1", type: "info" },
  { time: 300, text: "场景5/9 · \"sustainable phone accessories\" · 对比中...", type: "info" },
  { time: 305, text: "场景5完成 · 你的品牌排名第2 · Pela排名第1", type: "success" },
  { time: 310, text: "9个场景逐维度对比完成 ✓", type: "success" },

  // 阶段5：报告生成（340-360秒）
  { time: 315, text: "综合评分计算中...", type: "info" },
  { time: 320, text: "A类引用率：30% · B类引用率：75% · C类引用率：55%", type: "info" },
  { time: 325, text: "Gap分析：品牌自述 vs AI认知差距...", type: "info" },
  { time: 330, text: "AI认知画像生成中...", type: "info" },
  { time: 335, text: "引用来源权威度分析...", type: "info" },
  { time: 340, text: "报告生成完成 ✓", type: "success" },
  { time: 345, text: "综合评分：67/100 · 行业引用率：30%", type: "info" },
  { time: 350, text: "侦察任务完成 · 正在生成侦察报告...", type: "success" },
];
```

### 数据流容器的渲染逻辑

```typescript
// 根据elapsed过滤要显示的消息
const visibleMessages = MOCK_MESSAGES.filter(m => m.time <= elapsed);

// 只显示最近15条
const recentMessages = visibleMessages.slice(-15);
```

### 底部Progress Pipeline

```typescript
const PHASES = [
  { label: "品牌扫描", threshold: 20 },
  { label: "查询生成", threshold: 35 },
  { label: "引擎搜索", threshold: 280 },
  { label: "竞品分析", threshold: 310 },
  { label: "报告生成", threshold: Infinity },
];

// 根据elapsed计算当前阶段
let phaseIdx = PHASES.findIndex(p => elapsed < p.threshold);
if (phaseIdx === -1) phaseIdx = PHASES.length - 1;
```

### 验证方法

- 测试1: 进入等待页 → 左栏显示品牌信息和扫描配置
- 测试2: 等待5秒 → 右栏出现第一条消息
- 测试3: 等待30秒 → 右栏显示5-6条消息，底部pipeline显示"查询生成 ✓"
- 测试4: 页面单屏不滚动，768px屏幕下所有内容可见

---

## 任务3: scan/page.tsx 接线

### 问题

需要在scan/page.tsx中：
1. 新增step状态："briefing"和"probe_loading"
2. 从Dashboard进入简报室的逻辑
3. 简报室完成后启动扫描的逻辑

### 需要修改的文件

`frontend/app/(app)/scan/page.tsx`

### 实现要求

1. **扩展Step类型**：
```typescript
type Step = "idle" | "loading" | "result" | "error" | "dashboard" | "completed" | "resume" | "briefing" | "probe_loading";
```

2. **新增briefingData状态**：
```typescript
const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
```

3. **从Dashboard进入简报室**：
```typescript
function handleStartProbe() {
  if (!hasFullAccess()) {
    setShowUpgradeModal(true);
    return;
  }
  setStep("briefing");
}
```

4. **简报室完成回调**：
```typescript
function handleBriefingComplete(data: BriefingData) {
  setBriefingData(data);
  setStep("probe_loading");
  // 启动full mode扫描
  handleScan(data.domain, data.brandName, data.industry, data.targetMarket, data);
}
```

5. **修改handleScan接收briefingData**：
```typescript
async function handleScan(
  domain: string,
  brandName: string,
  industry: string,
  targetMarket: string,
  briefing?: BriefingData
) {
  // ... 现有逻辑 ...
  
  body: JSON.stringify({
    domain,
    brand_name: brandName,
    industry,
    target_market: targetMarket,
    core_product: briefing?.coreProduct || "",
    seed_queries: briefing?.seedQueries || [],
    competitors: briefing?.competitors || [],
    target_positioning: briefing?.targetPositioning || "",
    mode: hasFullAccess() ? "full" : "light",
    confirmed_queries: briefing?.confirmedQueries || null,
  }),
}
```

6. **渲染简报室和等待页**：
```typescript
{step === "briefing" && (
  <ScanBriefing
    onComplete={handleBriefingComplete}
    onBack={() => setStep("dashboard")}
    initialData={{
      domain: scanDomain,
      brandName: scanBrandName,
    }}
  />
)}
{step === "probe_loading" && (
  <ScanProbeLoading
    elapsed={elapsed}
    domain={scanDomain}
    brandName={scanBrandName}
    briefingData={briefingData!}
  />
)}
```

### 验证方法

- 测试1: Light模式点"Probe 侦察兵" → 触发UpgradeModal
- 测试2: Full模式点"Probe 侦察兵" → 进入简报室
- 测试3: 简报室完成 → 进入等待页 → API调用mode="full"
- 测试4: API返回 → 进入Dashboard（显示完整数据）

---

## 任务4: 后端接收confirmed_queries

### 问题

前端简报室让用户确认/修改了查询词，后端需要接收这些确认后的查询词，而不是自己重新生成。

### 需要修改的文件

`langgraph_app/nodes/probe_node.py`

### 实现要求

在probe_node的查询词生成阶段，检查ui中是否有confirmed_queries：

```python
# 在query_expander调用之前
confirmed_queries = ui.get("confirmed_queries")
if confirmed_queries:
    # 使用前端传入的确认查询词
    expanded_queries = confirmed_queries
    logger.log(f"[查询词] 使用用户确认的查询词: A={len([q for q in confirmed_queries if q.get('category') == 'industry'])}, B={len([q for q in confirmed_queries if q.get('category') == 'brand'])}, C={len([q for q in confirmed_queries if q.get('category') == 'competitor'])}")
else:
    # 兜底：后端自己生成
    expanded_queries = await expand(seeds, industry, brand_name, competitors)
    logger.log(f"[查询词] 后端自动生成: {len(expanded_queries)}个")
```

### confirmed_queries格式

```json
[
  {"query": "best eco friendly phone case", "category": "industry"},
  {"query": "UGREEN review", "category": "brand"},
  {"query": "UGREEN vs Anker", "category": "competitor"}
]
```

### 验证方法

- 测试1: 前端传confirmed_queries → 后端使用这些查询词
- 测试2: 前端不传confirmed_queries → 后端自己生成
- 测试3: confirmed_queries格式正确 → 不报错

---

## CHECKLIST 自检

**任务1 简报室:**
- [ ] 5步流程完整（身份确认→战场情报→敌军情报→侦察方向→简报确认）
- [ ] 预填数据从初步体检带入
- [ ] 竞品从competitor_mentions自动带入
- [ ] 查询词分A/B/C三组展示
- [ ] 每步有"下一步"按钮，Enter键支持

**任务2 等待页:**
- [ ] 单屏不滚动，768px屏幕下所有内容可见
- [ ] 左栏品牌信息卡片正确显示
- [ ] 左栏扫描配置卡片有查询词作用解释
- [ ] 右栏数据流每3-5秒出现新消息
- [ ] 底部Pipeline根据elapsed更新阶段
- [ ] 引擎文案：ChatGPT、Gemini、Claude

**任务3 page.tsx接线:**
- [ ] Step类型扩展包含briefing和probe_loading
- [ ] Dashboard的"Probe 侦察兵"按钮触发handleStartProbe
- [ ] Light模式触发UpgradeModal
- [ ] Full模式进入简报室
- [ ] 简报室完成后启动full mode扫描

**任务4 后端:**
- [ ] 检查ui.get("confirmed_queries")
- [ ] 有confirmed_queries时使用前端数据
- [ ] 无confirmed_queries时后端自己生成

---

## 交付格式

```
自检结果: X/5 任务1 + X/4 任务2 + X/4 任务3 + X/3 任务4 = XX/16
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. 不要改scan-loading.tsx（Light模式的等待页保持不变）
2. 不要改scan-dashboard.tsx（Dashboard保持不变）
3. 不要改scan-result.tsx（报告页保持不变）
4. 等待页的模拟数据是硬编码的，不需要后端支持
5. 简报室的查询词API如果还没实现，先用mock数据
6. 引擎文案统一：ChatGPT、Gemini、Claude（不是GPT-4o、Haiku）
