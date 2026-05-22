# TASK: CiteFlow 前端地基搭建

> 日期：2026-05-11
> 目标：搭建前端地基，准备好接收模块

---

## 地基 = 三样东西

1. **Next.js 脚手架** — 项目的骨架，路由/构建/开发服务器
2. **暗色主题配置** — 颜色/字体/圆角/发光，落地成 Tailwind 配置
3. **空白画布** — 一个全屏深色页面，准备好接收模块

---

## 执行步骤

### 1. Next.js 脚手架

```bash
cd /Users/fogn/Desktop/CiteFlow
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd frontend
npx shadcn@latest init
npx shadcn@latest add button input card
npm install framer-motion lucide-react
```

### 2. 暗色主题配置

**tailwind.config.ts**：
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
        background: "#0A0A0F",
        foreground: "#EDEDEF",
        card: "#131318",
        "card-foreground": "#EDEDEF",
        border: "#222228",
        muted: "#8B8B90",
        "text-muted": "#5B5B60",
        accent: "#3B82F6",
        "accent-glow": "#60A5FA",
        "accent-dim": "#1E3A5F",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

**app/globals.css**：
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 10% 4%;
    --foreground: 240 5% 93%;
    --card: 240 10% 7%;
    --card-foreground: 240 5% 93%;
    --border: 240 6% 15%;
    --muted: 240 3% 55%;
    --muted-foreground: 240 3% 37%;
    --accent: 217 91% 60%;
    --accent-foreground: 210 40% 98%;
  }
}

body {
  @apply bg-background text-foreground;
}

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #0A0A0F;
}
::-webkit-scrollbar-thumb {
  background: #222228;
  border-radius: 3px;
}
```

### 3. 空白画布

**app/page.tsx**：
```typescript
export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* 空白画布，准备好接收模块 */}
    </main>
  );
}
```

---

## 验收标准

- [ ] `npm run dev` 能跑起来
- [ ] 访问 http://localhost:3000 看到全屏深色页面
- [ ] 背景色 #0A0A0F
- [ ] 无报错

---

## 完成后

地基搭好后，开始添加模块：
1. 导航栏
2. Hero区
3. Logo墙
4. ...
