# Landing Page 改造提示词（详细版）

> 目标：完全重写 app/page.tsx，删除所有旧内容

---

## 第一步：删除旧内容

**删除 app/page.tsx 中的所有内容，从零开始写。**

---

## 第二步：页面结构

```
Header（固定顶部）
  ↓
主内容区（居中）
  ├── 像素Logo（放大居中）
  ├── 标题（CiteFlow — AI引用率体检）
  ├── 三个产品卡片（体检→诊断→处方）
  ├── 输入框（域名输入 + 免费测试按钮）
  └── 信任标语（30秒出报告 · 无需信用卡）
```

---

## 第三步：具体代码

### app/page.tsx 完整代码

```tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0F] text-[#EDEDEF]">
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0F]/80 backdrop-blur-sm border-b border-[#222228]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold">CiteFlow</div>
          <button className="px-6 py-2 bg-[#3B82F6] text-white rounded-lg text-sm font-medium hover:bg-[#60A5FA] transition">
            免费检测
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="pt-16 flex flex-col items-center justify-center min-h-screen px-6">
        
        {/* 像素Logo */}
        <div className="mb-8">
          <svg viewBox="0 0 8 8" width="120" height="120" style={{imageRendering: 'pixelated'}}>
            <rect x="2" y="1" width="4" height="1" fill="#3b82f6"/>
            <rect x="1" y="2" width="1" height="1" fill="#3b82f6"/>
            <rect x="1" y="3" width="1" height="1" fill="#3b82f6"/>
            <rect x="1" y="4" width="1" height="1" fill="#3b82f6"/>
            <rect x="1" y="5" width="1" height="1" fill="#3b82f6"/>
            <rect x="2" y="6" width="4" height="1" fill="#3b82f6"/>
          </svg>
        </div>

        {/* 标题 */}
        <h1 className="text-4xl font-bold mb-2">CiteFlow</h1>
        <p className="text-xl text-[#8B8B90] mb-12">AI引用率体检</p>

        {/* 三个产品卡片 */}
        <div className="flex items-center gap-6 mb-12">
          
          {/* 体检卡片 */}
          <div className="w-72 p-6 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[#3B82F6]/50 transition">
            <div className="text-2xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold mb-2">体检 · PROBE</h3>
            <p className="text-[#3B82F6] text-sm font-medium mb-3">知道问题在哪</p>
            <p className="text-[#5B5B60] text-xs">30个查询，全面扫描</p>
          </div>

          {/* 箭头 */}
          <div className="text-[#3B82F6] text-2xl">→</div>

          {/* 诊断卡片 */}
          <div className="w-72 p-6 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[#3B82F6]/50 transition">
            <div className="text-2xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2">诊断 · DIAGNOSE</h3>
            <p className="text-[#3B82F6] text-sm font-medium mb-3">知道为什么</p>
            <p className="text-[#5B5B60] text-xs">14条规则，深度分析</p>
          </div>

          {/* 箭头 */}
          <div className="text-[#3B82F6] text-2xl">→</div>

          {/* 处方卡片 */}
          <div className="w-72 p-6 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[#3B82F6]/50 transition">
            <div className="text-2xl mb-3">💊</div>
            <h3 className="text-lg font-semibold mb-2">处方 · PRESCRIBE</h3>
            <p className="text-[#3B82F6] text-sm font-medium mb-3">知道怎么修</p>
            <p className="text-[#5B5B60] text-xs">21篇论文，可信优化</p>
          </div>

        </div>

        {/* 输入框 + 按钮 */}
        <div className="flex items-center gap-3 mb-4">
          <input 
            type="text" 
            placeholder="输入域名：yourbrand.com"
            className="w-96 h-12 px-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#EDEDEF] placeholder-[#5B5B60] focus:outline-none focus:border-[#3B82F6]"
          />
          <button className="h-12 px-8 bg-[#3B82F6] text-white rounded-lg font-medium hover:bg-[#60A5FA] transition">
            免费测试
          </button>
        </div>

        {/* 信任标语 */}
        <p className="text-[#5B5B60] text-sm">30秒出报告 · 无需信用卡</p>

      </div>
    </main>
  );
}
```

---

## 第四步：检查清单

改完后检查：

- [ ] Header固定在顶部，有"CiteFlow"和"免费检测"按钮
- [ ] 像素Logo放大到120x120，居中显示
- [ ] 标题"CiteFlow"和副标题"AI引用率体检"
- [ ] 三个卡片横向排列：体检→诊断→处方
- [ ] 每个卡片有图标、标题、核心价值、细节
- [ ] 箭头连接三个卡片
- [ ] 输入框：placeholder="输入域名：yourbrand.com"
- [ ] "免费测试"按钮（蓝色背景）
- [ ] 信任标语："30秒出报告 · 无需信用卡"
- [ ] 背景色：#0A0A0F
- [ ] 所有文字颜色正确

---

## 第五步：运行测试

```bash
cd /Users/fogn/Desktop/CiteFlow/frontend
npm run dev
```

访问 http://localhost:3000 确认页面显示正确。
