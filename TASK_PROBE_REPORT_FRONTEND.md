# TASK_PROBE_REPORT_FRONTEND.md — Probe报告前端页面

> 药老出品 · 2026-05-11
> 目标: 构建CiteFlow Probe报告的前端展示页面
> 预计工时: 1-2天

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 初始化Next.js项目 | 项目根目录 | 30min |
| 2 | 配置Tailwind + shadcn/ui | 配置文件 | 30min |
| 3 | 设计暗色主题 + 全局样式 | globals.css | 1h |
| 4 | 构建报告页面骨架 | app/report/page.tsx | 2h |
| 5 | 实现10个模块组件 | components/report/* | 4h |
| 6 | 实现右侧导航 | components/navigation/* | 1h |
| 7 | 数据对接 + 动画效果 | 各组件 | 2h |
| 8 | 测试 + 部署 | - | 1h |

**完成标准**: 本地运行 `npm run dev` 能看到完整的Probe报告页面，10个模块全部展示，右侧导航可跳转，暗色主题美观。

---

## 背景

CiteFlow是一个GEO（Generative Engine Optimization）诊断工具。Probe模块产出10个模块的诊断数据，需要一个前端页面展示给用户。

### 当前状态
- Probe后端已完成，能产出JSON格式的诊断数据
- 需要构建前端页面展示这些数据
- 暂时不需要登录/注册/Landing Page，只做报告展示

### 数据来源
```
/Users/fogn/Desktop/CiteFlow/test_flowerknows_probe_output.json
```

### 设计参考
- **Profound** (tryprofound.com): 同赛道GEO工具，暗色主题，企业级
- **Sentry** (sentry.io): 监控工具，暗紫渐变，数据密集
- **Linear** (linear.app): 极简暗色，产品即英雄

---

## 技术栈

```
Next.js 14+ (App Router)
Tailwind CSS v3+
shadcn/ui (组件库)
Framer Motion (动画)
Lucide React (图标)
```

---

## 任务1: 初始化Next.js项目

### 项目位置
```
/Users/fogn/Desktop/CiteFlow/frontend/
```

### 初始化命令
```bash
cd /Users/fogn/Desktop/CiteFlow
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

### 安装依赖
```bash
cd frontend
npx shadcn@latest init
npx shadcn@latest add card badge tabs separator scroll-area tooltip
npm install framer-motion lucide-react
```

---

## 任务2: 配置暗色主题

### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",      // 深蓝黑
        foreground: "#f8fafc",      // 亮白
        card: "#1e293b",            // 卡片背景
        "card-foreground": "#f1f5f9",
        muted: "#94a3b8",           // 次要文字
        accent: "#3b82f6",          // 蓝色强调
        success: "#22c55e",         // 成功/正面
        warning: "#f59e0b",         // 警告
        danger: "#ef4444",          // 危险/负面
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

### globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
  }
}

body {
  @apply bg-background text-foreground;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #0f172a;
}
::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #475569;
}
```

---

## 任务3: 报告页面结构

### app/report/page.tsx
```typescript
"use client";

import { useEffect, useState } from "react";
import { ReportHeader } from "@/components/report/header";
import { BrandProfile } from "@/components/report/brand-profile";
import { CitationMetrics } from "@/components/report/citation-metrics";
import { MarketPerception } from "@/components/report/market-perception";
import { GapAnalysis } from "@/components/report/gap-analysis";
import { CompanyScore } from "@/components/report/company-score";
import { CompetitorMatrix } from "@/components/report/competitor-matrix";
import { AINarrative } from "@/components/report/ai-narrative";
import { SourceAuthority } from "@/components/report/source-authority";
import { EngineComparison } from "@/components/report/engine-comparison";
import { CompanyEvaluation } from "@/components/report/company-evaluation";
import { ReportFooter } from "@/components/report/footer";
import { SideNavigation } from "@/components/navigation/side-nav";

// 模块配置
const MODULES = [
  { id: "brand-profile", label: "品牌画像", icon: "Building2" },
  { id: "citation-metrics", label: "引用率", icon: "BarChart3" },
  { id: "market-perception", label: "市场镜像", icon: "Eye" },
  { id: "gap-analysis", label: "差距分析", icon: "GitCompare" },
  { id: "company-score", label: "量化评分", icon: "Gauge" },
  { id: "competitor-matrix", label: "竞品矩阵", icon: "Swords" },
  { id: "ai-narrative", label: "AI话术", icon: "MessageSquare" },
  { id: "source-authority", label: "引用源", icon: "Link" },
  { id: "engine-comparison", label: "三引擎", icon: "Cpu" },
  { id: "company-evaluation", label: "公司评估", icon: "FileText" },
];

export default function ReportPage() {
  const [data, setData] = useState(null);
  const [activeSection, setActiveSection] = useState("brand-profile");

  useEffect(() => {
    // 加载数据（后续改为API调用）
    fetch("/api/report")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex min-h-screen">
      {/* 主内容区 */}
      <main className="flex-1 pb-20">
        <ReportHeader data={data} />
        <div className="max-w-5xl mx-auto px-6 space-y-8">
          <section id="brand-profile">
            <BrandProfile data={data.brand_profile} />
          </section>
          <section id="citation-metrics">
            <CitationMetrics data={data.citation_metrics} />
          </section>
          <section id="market-perception">
            <MarketPerception data={data.market_perception} />
          </section>
          <section id="gap-analysis">
            <GapAnalysis data={data.gap_report} />
          </section>
          <section id="company-score">
            <CompanyScore data={data.company_score} />
          </section>
          <section id="competitor-matrix">
            <CompetitorMatrix data={data.competitor_analysis} />
          </section>
          <section id="ai-narrative">
            <AINarrative data={data.ai_narrative} />
          </section>
          <section id="source-authority">
            <SourceAuthority data={data.source_authority} />
          </section>
          <section id="engine-comparison">
            <EngineComparison data={data.engine_results} />
          </section>
          <section id="company-evaluation">
            <CompanyEvaluation data={data.company_evaluation} />
          </section>
        </div>
        <ReportFooter data={data.meta} />
      </main>

      {/* 右侧导航 */}
      <SideNavigation
        modules={MODULES}
        activeSection={activeSection}
        onSectionClick={(id) => {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted">加载中...</div>
    </div>
  );
}
```

---

## 任务4: 右侧导航组件

### components/navigation/side-nav.tsx
```typescript
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, BarChart3, Eye, GitCompare, Gauge,
  Swords, MessageSquare, Link, Cpu, FileText
} from "lucide-react";

const ICONS = {
  Building2, BarChart3, Eye, GitCompare, Gauge,
  Swords, MessageSquare, Link, Cpu, FileText,
};

interface Module {
  id: string;
  label: string;
  icon: string;
}

interface SideNavigationProps {
  modules: Module[];
  activeSection: string;
  onSectionClick: (id: string) => void;
}

export function SideNavigation({
  modules,
  activeSection,
  onSectionClick,
}: SideNavigationProps) {
  return (
    <nav className="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden lg:block">
      <div className="bg-card/80 backdrop-blur-sm border border-border rounded-full p-2">
        <div className="flex flex-col gap-1">
          {modules.map((mod) => {
            const Icon = ICONS[mod.icon as keyof typeof ICONS];
            const isActive = activeSection === mod.id;

            return (
              <button
                key={mod.id}
                onClick={() => onSectionClick(mod.id)}
                className="group relative p-2 rounded-full hover:bg-accent/10 transition-colors"
                title={mod.label}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute inset-0 bg-accent/20 rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon
                  className={`w-4 h-4 relative z-10 transition-colors ${
                    isActive
                      ? "text-accent"
                      : "text-muted group-hover:text-foreground"
                  }`}
                />

                {/* Tooltip */}
                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-card border border-border rounded text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {mod.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
```

---

## 任务5: 模块组件示例（品牌画像）

### components/report/brand-profile.tsx
```typescript
"use client";

import { motion } from "framer-motion";
import { Building2, Target, Users, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BrandProfileProps {
  data: {
    brand_name: string;
    one_liner: string;
    value_props: string[];
    differentiators: string[];
    target_personas: string[];
    tone_keywords: string[];
    full_description: string;
    inferred_industry: string;
    inferred_target_market: string;
    inferred_core_product: string;
  };
}

export function BrandProfile({ data }: BrandProfileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Building2 className="w-5 h-5 text-accent" />
            品牌画像
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 一句话定位 */}
          <div className="border-l-2 border-accent pl-4">
            <p className="text-lg text-foreground">{data.one_liner}</p>
          </div>

          {/* 核心信息网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 价值主张 */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted mb-3">
                <Target className="w-4 h-4" />
                价值主张
              </h4>
              <ul className="space-y-2">
                {data.value_props.map((prop, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    {prop}
                  </li>
                ))}
              </ul>
            </div>

            {/* 差异化 */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted mb-3">
                <Sparkles className="w-4 h-4" />
                差异化
              </h4>
              <ul className="space-y-2">
                {data.differentiators.map((diff, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    {diff}
                  </li>
                ))}
              </ul>
            </div>

            {/* 目标客户 */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-medium text-muted mb-3">
                <Users className="w-4 h-4" />
                目标客户
              </h4>
              <ul className="space-y-2">
                {data.target_personas.map((persona, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    {persona}
                  </li>
                ))}
              </ul>
            </div>

            {/* 品牌调性 */}
            <div>
              <h4 className="text-sm font-medium text-muted mb-3">
                品牌调性
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.tone_keywords.map((tone, i) => (
                  <Badge key={i} variant="secondary" className="bg-accent/10 text-accent">
                    {tone}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* 推断信息 */}
          <div className="pt-4 border-t border-border">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted mb-1">行业</p>
                <p className="text-sm text-foreground">{data.inferred_industry}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">目标市场</p>
                <p className="text-sm text-foreground">{data.inferred_target_market}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">核心产品</p>
                <p className="text-sm text-foreground">{data.inferred_core_product}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

---

## 任务6: 数据API路由

### app/api/report/route.ts
```typescript
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // 读取测试数据
    const filePath = path.join(
      process.cwd(),
      "..",
      "test_flowerknows_probe_output.json"
    );
    const fileContents = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(fileContents);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reading report data:", error);
    return NextResponse.json(
      { error: "Failed to load report data" },
      { status: 500 }
    );
  }
}
```

---

## 任务7: 其他9个模块组件

按照任务5的模式，为以下模块创建组件：

1. **CitationMetrics** - 引用率仪表盘
   - A/B/C三类引用率大数字展示
   - 推荐率、Top1率
   - 30条查询明细（可折叠表格）

2. **MarketPerception** - 市场镜像
   - AI认知身份
   - 感知优势/劣势列表
   - 感知产品列表

3. **GapAnalysis** - 差距分析
   - 对齐分进度条
   - 偏差/盲区/机会三列布局

4. **CompanyScore** - 量化评分
   - 综合分大数字
   - 5维度评分条形图

5. **CompetitorMatrix** - 竞品矩阵
   - 胜/负/平统计
   - 赢/输维度列表

6. **AINarrative** - AI推荐话术
   - 理想推荐描述
   - 关键词标签

7. **SourceAuthority** - 引用源权威性
   - Top10来源表格
   - 多样性指数

8. **EngineComparison** - 三引擎对比
   - GPT/Gemini/Haiku引用率对比
   - 最佳/最差引擎标注

9. **CompanyEvaluation** - 公司评估
   - 整体评价
   - 优势/劣势列表

---

## 任务8: 全局组件

### components/report/header.tsx
```typescript
"use client";

import { motion } from "framer-motion";

interface ReportHeaderProps {
  data: {
    brand_profile: {
      brand_name: string;
    };
    citation_metrics: {
      rate: number;
      total_queries: number;
    };
    gap_report: {
      alignment_score: number;
      one_line_summary: string;
    };
    company_score: {
      overall: number;
    };
  };
}

export function ReportHeader({ data }: ReportHeaderProps) {
  const severity = data.citation_metrics.rate < 30 ? "critical" : 
                   data.citation_metrics.rate < 60 ? "warning" : "healthy";
  
  const severityColors = {
    critical: "text-danger",
    warning: "text-warning",
    healthy: "text-success",
  };

  const severityLabels = {
    critical: "严重",
    warning: "警告",
    healthy: "健康",
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* 品牌名 + 一句话诊断 */}
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {data.brand_profile.brand_name}
            <span className="text-muted font-normal text-xl ml-3">— AI引用体检报告</span>
          </h1>
          
          <p className="text-muted mb-6">{data.gap_report.one_line_summary}</p>

          {/* 核心指标 */}
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-foreground">
                {data.citation_metrics.rate}%
              </p>
              <p className="text-sm text-muted">A类引用率</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-foreground">
                {data.company_score.overall}
              </p>
              <p className="text-sm text-muted">综合评分</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${severityColors[severity]}`}>
                {severityLabels[severity]}
              </p>
              <p className="text-sm text-muted">健康状态</p>
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
```

---

## CHECKLIST 自检

**任务1 [初始化]:**
- [ ] Next.js项目创建成功
- [ ] shadcn/ui安装成功
- [ ] Framer Motion安装成功

**任务2 [主题]:**
- [ ] 暗色主题配置正确
- [ ] 自定义颜色生效
- [ ] 自定义滚动条生效

**任务3 [页面结构]:**
- [ ] 报告页面骨架完成
- [ ] 10个模块section正确布局
- [ ] 响应式布局正常

**任务4 [导航]:**
- [ ] 右侧导航显示
- [ ] 点击可跳转
- [ ] 当前模块高亮

**任务5-7 [组件]:**
- [ ] 10个模块组件全部完成
- [ ] 数据正确展示
- [ ] 动画效果正常

**任务8 [数据]:**
- [ ] API路由正常
- [ ] JSON数据读取成功
- [ ] 错误处理正常

---

## 交付格式

```
自检结果: X/8 任务1 + X/3 任务2 + X/3 任务3 + X/3 任务4 + X/10 任务5-7 + X/3 任务8 = XX/30
失败项: (无 / 列出)
运行命令: cd /Users/fogn/Desktop/CiteFlow/frontend && npm run dev
```

---

## 注意事项

1. **先跑通再美化** — 先确保数据正确展示，再优化视觉效果
2. **组件可复用** — 每个模块组件独立，方便后续维护
3. **响应式设计** — 移动端适配（导航隐藏，内容全宽）
4. **性能优化** — 使用动态导入，避免首屏加载过慢
5. **代码规范** — TypeScript严格模式，ESLint通过
