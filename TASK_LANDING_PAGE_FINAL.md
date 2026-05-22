# Landing Page 首页改造提示词（最终版）

> 目标：改造 app/page.tsx，只保留两层内容

---

## 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│ 导航栏（在 layout.tsx 中，不动）                            │
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

---

## 具体要求

### 1. 删除当前页面的旧内容

**删除 app/page.tsx 中的所有内容，从零开始写。**

### 2. 保留导航栏

**导航栏在 layout.tsx 中，不要动。**

### 3. 第一层：Hero区（好奇心驱动）

```
位置：导航栏下方
内容：
  - 主标题：你的品牌在ChatGPT里被怎么描述？
  - 副标题：你的竞品被AI推荐，你呢？
  - 输入框：placeholder="输入域名：yourbrand.com"
  - 按钮：免费测试
样式：
  - 背景：#0A0A0F（纯黑）
  - 主标题：32px，白色 #EDEDEF，font-bold
  - 副标题：18px，灰色 #8B8B90
  - 输入框：宽度 400px，高度 48px，深色背景，圆角
  - 按钮：高度 48px，蓝色背景 #3B82F6，白色文字
  - 居中对齐
  - padding-top: 120px（留出导航栏空间）
```

### 4. 第二层：三个价值区

```
位置：Hero区下方
内容：三个卡片横向排列
布局：深入挖掘 → 客观诊断 → 权威处方（箭头连接）

卡片1：深入挖掘（左边）
  - 图标：🔍
  - 标题：深入挖掘
  - 核心价值：知道你的品牌在AI眼里什么样
  - 细节：30个查询，覆盖ChatGPT/Gemini/Perplexity/Claude四大引擎，深度扫描

卡片2：客观诊断（中间）
  - 图标：📊
  - 标题：客观诊断
  - 核心价值：不带主观偏见的AI Agent
  - 细节：纯数据驱动，给你最客观的诊断结果

卡片3：权威处方（右边）
  - 图标：💊
  - 标题：权威处方
  - 核心价值：基于学术研究的优化方案
  - 细节：21篇论文支撑，精确到页面级优化建议

卡片样式：
  - 宽度：300px
  - 背景：rgba(255,255,255,0.03)
  - 边框：1px solid rgba(255,255,255,0.08)
  - 圆角：12px
  - 内边距：24px
  - hover效果：边框变蓝 #3B82F6

箭头样式：
  - 颜色：#3B82F6
  - 大小：24px
  - 位置：卡片之间
```

---

## 完整代码

```tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0F] text-[#EDEDEF]">
      
      {/* 第一层：Hero区 */}
      <section className="pt-32 pb-20 px-6">
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
      <section className="py-20 px-6">
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

## 检查清单

改完后检查：

- [ ] 导航栏不动（在layout.tsx中）
- [ ] Hero区有主标题："你的品牌在ChatGPT里被怎么描述？"
- [ ] Hero区有副标题："你的竞品被AI推荐，你呢？"
- [ ] Hero区有输入框：placeholder="输入域名：yourbrand.com"
- [ ] Hero区有按钮："免费测试"
- [ ] 三个价值区有卡片：深入挖掘、客观诊断、权威处方
- [ ] 每个卡片有图标、标题、核心价值、细节
- [ ] 箭头连接三个卡片
- [ ] 背景色：#0A0A0F
- [ ] 所有文字颜色正确
- [ ] 没有其他内容（信任区、CTA区、Footer都不要）

---

## 运行测试

```bash
cd /Users/fogn/Desktop/CiteFlow/frontend
npm run dev
```

访问 http://localhost:3000 确认页面显示正确。
