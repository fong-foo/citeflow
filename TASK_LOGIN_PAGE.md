# TASK_LOGIN_PAGE.md — 登录/注册页面前端

> 药老出品 · 2026-05-13
> 目标: 新建 /login 页面，登录/注册表单，暗色主题
> 预计工时: 30min

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 新建登录页面 | app/login/page.tsx | 25min |
| 2 | Navbar 适配 | components/navbar.tsx | 5min |

**完成标准**: 点击 Navbar"登录"→ 跳转 /login → 看到登录/注册表单

---

## 设计规范

### 布局

```
┌─────────────────────────────────────────────────────┐
│  [Navbar — 与首页共用，不改]                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│              CiteFlow Logo（小号）                   │
│                                                     │
│       ┌───────────────────────────────────┐         │
│       │                                   │         │
│       │   ┌──────────┬──────────┐        │         │
│       │   │   登录    │   注册    │  ← Tab │         │
│       │   └──────────┴──────────┘        │         │
│       │                                   │         │
│       │   邮箱地址                         │         │
│       │   ┌───────────────────────────┐  │         │
│       │   │                           │  │         │
│       │   └───────────────────────────┘  │         │
│       │                                   │         │
│       │   密码                             │         │
│       │   ┌───────────────────────────┐  │         │
│       │   │                           │  │         │
│       │   └───────────────────────────┘  │         │
│       │                                   │         │
│       │   [登录]  ← 渐变按钮              │         │
│       │                                   │         │
│       │   ─────── 或 ───────              │         │
│       │                                   │         │
│       │   [Google 图标] Google 登录       │         │
│       │                                   │         │
│       │   忘记密码？  ← 文字链接           │         │
│       │                                   │         │
│       └───────────────────────────────────┘         │
│                                                     │
│       ← 返回首页                                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 色彩（与 Landing Page 一致）

```
页面背景:     #020617
卡片背景:     rgba(255,255,255,0.02)
卡片边框:     rgba(255,255,255,0.04)
输入框背景:   rgba(255,255,255,0.03)
输入框边框:   rgba(255,255,255,0.06)
输入框聚焦:   rgba(56,189,248,0.3)
主文字:       #EDEDF5
次文字:       #6E6E88
强调色:       #38BDF8
Tab激活:      #C8C8D8 + 底部蓝色线条
Tab未激活:    #5E5E78
按钮渐变:     rgba(56,189,248,0.12) → rgba(56,189,248,0.20)
```

### 字体

```
标题:         DM Sans (font-sans)
输入框:       DM Sans
数字/代码:    JetBrains Mono (font-mono)
```

### 间距

```
卡片最大宽度:   400px
卡片内边距:     32px (p-8)
输入框高度:     44px
输入框间距:     20px (space-y-5)
按钮高度:       44px
Tab高度:        40px
```

---

## 任务1: 新建登录页面

### 需要新建的文件
`app/login/page.tsx`

### 实现要求

#### 页面结构

1. 全屏居中（flex items-center justify-center, min-h-screen）
2. 顶部留出 Navbar 高度（pt-20 或 pt-24）
3. CiteFlow Logo 小号显示（可点击回首页）
4. 登录卡片（400px宽，暗色背景，圆角）
5. 底部"返回首页"链接

#### Tab 切换

两个 Tab：登录 / 注册
- 点击切换表单内容
- 激活态：文字 #C8C8D8 + 底部 2px 蓝色线条 (#38BDF8)
- 未激活态：文字 #5E5E78 + 无线条
- 用 useState 控制当前 Tab

#### 登录 Tab 内容

```
邮箱地址
[输入框 — placeholder="your@email.com"]

密码
[输入框 — type="password" placeholder="输入密码"]

[登录]  ← 全宽渐变按钮

———— 或 ————

[Google图标] Google 登录  ← 全宽描边按钮

忘记密码？  ← 文字链接，右对齐
```

#### 注册 Tab 内容

```
邮箱地址
[输入框 — placeholder="your@email.com"]

密码
[输入框 — type="password" placeholder="至少8位"]

确认密码
[输入框 — type="password" placeholder="再次输入密码"]

[注册]  ← 全宽渐变按钮

———— 或 ————

[Google图标] Google 登录  ← 全宽描边按钮

已有账号？去登录  ← 文字链接
```

#### 按钮样式

主按钮（登录/注册）：
```
全宽 (w-full)
高度 44px
背景: rgba(56,189,248,0.12)
边框: 1px solid rgba(56,189,248,0.20)
文字: #EDEDF5, 14px, font-medium
hover: 背景 rgba(56,189,248,0.20), 边框 rgba(56,189,248,0.35)
圆角: rounded-sm (2px)
```

Google 按钮：
```
全宽 (w-full)
高度 44px
背景: transparent
边框: 1px solid rgba(255,255,255,0.06)
文字: #9A9AB0, 14px
hover: 背景 rgba(255,255,255,0.03)
Google图标: 用 SVG inline（G字母，4色：蓝红黄绿）
```

#### 输入框样式

```
宽度: w-full
高度: h-11 (44px)
背景: rgba(255,255,255,0.03)
边框: 1px solid rgba(255,255,255,0.06)
聚焦: border-color rgba(56,189,248,0.30), outline-none
文字: text-[#EDEDF5], text-sm
placeholder: text-[#5E5E78]
内边距: px-4
圆角: rounded-sm (2px)
```

#### 交互行为

1. Tab 切换：useState("login" | "register")
2. 输入框：useState 管理 email / password / confirmPassword
3. 登录按钮点击：暂时不做后端调用，只做前端验证
   - 邮箱格式验证（包含@和.）
   - 密码长度 >= 8
   - 验证失败：输入框变红边框 + 下方红色提示文字
   - 验证成功：弹 alert("登录功能开发中，敬请期待")
4. 注册按钮点击：同上验证 + 密码一致性检查
5. Google 登录按钮：弹 alert("Google登录开发中，敬请期待")
6. 忘记密码：弹 alert("密码重置功能开发中")
7. "返回首页"链接：跳转 /

#### 动画

- 卡片入场：framer-motion，opacity 0→1, y 20→0, duration 0.5s
- Tab 切换：内容区域 fade transition
- 按钮 hover：300ms transition
- 输入框聚焦：border-color 300ms transition

---

## 任务2: Navbar 适配

### 需要改的文件
`components/navbar.tsx`

### 实现要求

当前 Navbar 的"免费测试"按钮指向 `#hero`（行136）。
改为指向 `/scan`：

```tsx
// 行136: href="#hero" → href="/scan"
href="/scan"
```

同时在 /login 页面中，Navbar 应该隐藏导航链接（因为登录页不需要"产品宗旨""定价"等锚点）。

方案：在 /login 页面中不显示 Navbar 的 nav links 部分。
但 Navbar 是全局 layout.tsx 引入的，所有页面共享。

最简方案：不改 Navbar，/login 页面正常显示 Navbar。
用户从登录页可以点"首页"回去，也可以点"产品宗旨"等跳到首页对应section。
这是合理的——不需要特殊处理。

所以任务2只改一行：免费测试 href 从 #hero 改为 /scan。

---

## 验证方法

1. 启动前端：`cd ~/Desktop/CiteFlow/frontend && npm run dev`
2. 访问 http://localhost:3000/login
3. 看到居中的登录卡片，Tab切换正常
4. 登录Tab：邮箱+密码输入框 + 登录按钮 + Google登录 + 忘记密码
5. 注册Tab：邮箱+密码+确认密码输入框 + 注册按钮 + Google登录 + 已有账号
6. 空表单点登录 → 红色提示"请输入邮箱"
7. 输入错误格式邮箱 → 红色提示"邮箱格式不正确"
8. 输入正确信息点登录 → alert "登录功能开发中"
9. 点Google登录 → alert "Google登录开发中"
10. 点"返回首页" → 跳转 /
11. 点 Navbar"免费测试" → 跳转 /scan（暂时404，后续做）

---

## CHECKLIST 自检

**任务1 — login/page.tsx:**
- [ ] 页面存在且不报错
- [ ] 居中布局，暗色主题
- [ ] Tab 切换（登录/注册）
- [ ] 登录Tab：邮箱+密码+登录按钮+Google+忘记密码
- [ ] 注册Tab：邮箱+密码+确认密码+注册按钮+Google+已有账号
- [ ] 输入框样式与设计规范一致
- [ ] 主按钮渐变样式
- [ ] Google按钮描边样式
- [ ] 前端验证（空值/格式/长度）
- [ ] 验证失败有红色提示
- [ ] framer-motion 入场动画
- [ ] "返回首页"链接可用

**任务2 — navbar.tsx:**
- [ ] "免费测试" href 改为 /scan

---

## 交付格式

```
自检结果: X/12 login + X/1 navbar = XX/13
失败项: (无 / 列出)
```

---

## 注意事项

1. 只做前端UI，不接后端API
2. 不新增 npm 依赖（framer-motion 已有）
3. 不改 layout.tsx（Navbar 全局共用）
4. 不改 globals.css（用 Tailwind inline style）
5. Google SVG 图标用 inline 4色 G 字母
6. 输入框用 `<input>` 原生标签，不用第三方组件库
