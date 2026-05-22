# Landing Page 完整改造提示词（最终版）

> 目标：改造导航栏 + 首页，完整展示CiteFlow

---

## 一、导航栏（layout.tsx）

### 结构

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Logo]   首页   产品宗旨   产品   定价      登录  [免费测试] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 内容

| 位置 | 内容 | 链接 |
|------|------|------|
| 左侧 | CiteFlow（Logo） | / |
| 菜单 | 首页 | / |
| 菜单 | 产品宗旨 | #mission |
| 菜单 | 产品 | #product |
| 菜单 | 定价 | #pricing |
| 右侧 | 登录 | /login |
| 右侧 | 免费测试（蓝色按钮） | #hero |

### 样式

```
- 固定在顶部（fixed）
- 背景：#0A0A0F/80，backdrop-blur
- 高度：64px
- 边框：底部 1px solid #222228
- Logo：18px，白色，font-bold
- 菜单项：14px，灰色 #8B8B90，hover变白
- 登录：14px，灰色 #8B8B90，hover变白
- 免费测试按钮：蓝色背景 #3B82F6，白色文字，圆角
```

### 代码

```tsx
// components/Navbar.tsx
export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0F]/80 backdrop-blur-sm border-b border-[#222228]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <a href="/" className="text-xl font-bold text-[#EDEDEF]">
          CiteFlow
        </a>

        {/* 菜单项 */}
        <div className="flex items-center gap-8">
          <a href="/" className="text-sm text-[#8B8B90] hover:text-[#EDEDEF] transition">
            首页
          </a>
          <a href="#mission" className="text-sm text-[#8B8B90] hover:text-[#EDEDEF] transition">
            产品宗旨
          </a>
          <a href="#product" className="text-sm text-[#8B8B90] hover:text-[#EDEDEF] transition">
            产品
          </a>
          <a href="#pricing" className="text-sm text-[#8B8B90] hover:text-[#EDEDEF] transition">
            定价
          </a>
        </div>

        {/* 右侧按钮 */}
        <div className="flex items-center gap-4">
          <a href="/login" className="text-sm text-[#8B8B90] hover:text-[#EDEDEF] transition">
            登录
          </a>
          <a href="#hero" className="px-5 py-2 bg-[#3B82F6] text-white text-sm rounded-lg font-medium hover:bg-[#60A5FA] transition">
            免费测试
          </a>
        </div>

      </div>
    </nav>
  );
}
```

---

## 二、首页（page.tsx）

### 结构

```
┌─────────────────────────────────────────────────────────────┐
│ 导航栏（在 layout.tsx 中）                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  第一层：Hero区（好奇心驱动）                               │
│  ─────────────────────────────                              │
│                                                             │
│  你的品牌在ChatGPT里被怎么描述？                            │
│  你的竞品被AI推荐，你呢？                                   │
│                                                             │
│  [输入域名]  [免费测试]                                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  第二层：三个价值区                                         │
│  ────────────────────                                       │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  深入挖掘   │  │  客观诊断   │  │  权威处方   │        │
│  │             │  │             │  │             │        │
│  │  30个查询   │  │  AI Agent   │  │  21篇论文   │        │
│  │  四大引擎   │  │  纯数据驱动 │  │  学术支撑   │        │
│  │  深度扫描   │  │  不带偏见   │  │  精确执行   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 代码

```tsx
// app/page.tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0F] text-[#EDEDEF]">
      
      {/* 第一层：Hero区 */}
      <section id="hero" className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* 主标题 */}
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            你的品牌在ChatGPT里被怎么描述？
          </h1>
          
          {/* 副标题 */}
          <p className="text-xl text-[#8B8B90] mb-12">
            你的竞品被AI推荐，你呢？
          </p>
          
          {/* 输入框 + 按钮 */}
          <div className="flex items-center justify-center gap-3">
            <input 
              type="text" 
              placeholder="输入域名：yourbrand.com"
              className="w-96 h-12 px-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#EDEDEF] placeholder-[#5B5B60] focus:outline-none focus:border-[#3B82F6]"
            />
            <button className="h-12 px-8 bg-[#3B82F6] text-white rounded-lg font-medium hover:bg-[#60A5FA] transition">
              免费测试
            </button>
          </div>
          
        </div>
      </section>

      {/* 第二层：三个价值区 */}
      <section id="product" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          
          <div className="flex items-center justify-center gap-8">
            
            {/* 深入挖掘 */}
            <div className="w-80 p-6 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[#3B82F6]/50 transition">
              <div className="text-3xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-3">深入挖掘</h3>
              <p className="text-[#3B82F6] text-sm font-medium mb-4">知道你的品牌在AI眼里什么样</p>
              <p className="text-[#8B8B90] text-sm leading-relaxed">
                30个查询，覆盖ChatGPT/Gemini/Perplexity/Claude四大引擎，深度扫描你的品牌表现
              </p>
            </div>

            {/* 箭头 */}
            <div className="text-[#3B82F6] text-3xl">→</div>

            {/* 客观诊断 */}
            <div className="w-80 p-6 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[#3B82F6]/50 transition">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-3">客观诊断</h3>
              <p className="text-[#3B82F6] text-sm font-medium mb-4">不带主观偏见的AI Agent</p>
              <p className="text-[#8B8B90] text-sm leading-relaxed">
                纯数据驱动，给你最客观的诊断结果，告诉你为什么不被AI推荐
              </p>
            </div>

            {/* 箭头 */}
            <div className="text-[#3B82F6] text-3xl">→</div>

            {/* 权威处方 */}
            <div className="w-80 p-6 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[#3B82F6]/50 transition">
              <div className="text-3xl mb-4">💊</div>
              <h3 className="text-xl font-semibold mb-3">权威处方</h3>
              <p className="text-[#3B82F6] text-sm font-medium mb-4">基于学术研究的优化方案</p>
              <p className="text-[#8B8B90] text-sm leading-relaxed">
                21篇论文支撑，精确到页面级优化建议，告诉你怎么让AI推荐你
              </p>
            </div>

          </div>
          
        </div>
      </section>

    </main>
  );
}
```

---

## 三、layout.tsx 修改

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "CiteFlow — AI引用率体检",
  description: "诊断你的品牌在AI眼中的样子，告诉你怎么修",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#0A0A0F] text-[#EDEDEF] font-sans">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
```

---

## 四、检查清单

### 导航栏

- [ ] Logo："CiteFlow"，左侧
- [ ] 菜单项：首页、产品宗旨、产品、定价
- [ ] 登录按钮：右侧
- [ ] 免费测试按钮：蓝色背景，右侧
- [ ] 固定在顶部
- [ ] 背景半透明，backdrop-blur

### 首页

- [ ] Hero区有主标题："你的品牌在ChatGPT里被怎么描述？"
- [ ] Hero区有副标题："你的竞品被AI推荐，你呢？"
- [ ] Hero区有输入框：placeholder="输入域名：yourbrand.com"
- [ ] Hero区有按钮："免费测试"
- [ ] 三个价值区有卡片：深入挖掘、客观诊断、权威处方
- [ ] 每个卡片有图标、标题、核心价值、细节
- [ ] 箭头连接三个卡片
- [ ] 背景色：#0A0A0F
- [ ] 所有文字颜色正确
- [ ] 没有其他内容

---

## 五、运行测试

```bash
cd /Users/fogn/Desktop/CiteFlow/frontend
npm run dev
```

访问 http://localhost:3000 确认：
1. 导航栏显示正确
2. Hero区显示正确
3. 三个价值区显示正确
4. 整体视觉效果好
