# TASK_LOGIN_CONNECT.md — 前端登录表单接后端API

> 药老出品 · 2026-05-13
> 目标: /login 页面从 alert 占位改为真正调用后端认证API
> 预计工时: 20min

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 登录表单接API | app/login/page.tsx | 15min |
| 2 | Navbar 登录状态 | components/navbar.tsx | 5min |

**完成标准**: 注册 → 自动登录 → token存localStorage → 跳转 /scan → Navbar显示用户名

---

## 任务1: 登录表单接API

### 需要改的文件
`app/login/page.tsx`

### 实现要求

#### 1.1 新增状态

在现有 useState 基础上，新增：

```typescript
const [loading, setLoading] = useState(false);       // 提交中
const [apiError, setApiError] = useState("");          // 后端返回的错误
```

#### 1.2 API配置

在文件顶部定义 API 地址：

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
```

#### 1.3 替换 handleSubmit 函数

把当前的 `alert(...)` 替换为真正的 API 调用：

```typescript
async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  setTouched({ email: true, password: true, confirmPassword: true });
  setApiError("");
  if (!validate()) return;

  setLoading(true);
  try {
    const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // 后端返回的错误（如"该邮箱已注册"、"密码错误"）
      setApiError(data.detail || "请求失败，请重试");
      return;
    }

    // 成功：存 token + 用户信息
    localStorage.setItem("cf_token", data.token);
    localStorage.setItem("cf_user", JSON.stringify(data.user));

    // 跳转到 /scan
    window.location.href = "/scan";
  } catch (err) {
    setApiError("网络错误，请检查后端是否启动");
  } finally {
    setLoading(false);
  }
}
```

#### 1.4 API错误显示

在表单顶部（Tab下方）显示后端错误：

```tsx
{/* API Error */}
{apiError && (
  <div
    className="mb-4 px-4 py-2.5 text-xs rounded-sm"
    style={{
      background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.20)",
      color: "#EF4444",
    }}
  >
    {apiError}
  </div>
)}
```

#### 1.5 Loading状态

提交按钮在loading时禁用+显示loading文字：

```tsx
<button
  type="submit"
  disabled={loading}
  className="w-full h-11 text-sm font-medium rounded-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
  style={{
    background: "rgba(56,189,248,0.12)",
    border: "1px solid rgba(56,189,248,0.20)",
    color: "#EDEDF5",
  }}
  onMouseEnter={(e) => {
    if (!loading) {
      e.currentTarget.style.background = "rgba(56,189,248,0.20)";
      e.currentTarget.style.borderColor = "rgba(56,189,248,0.35)";
    }
  }}
  onMouseLeave={(e) => {
    if (!loading) {
      e.currentTarget.style.background = "rgba(56,189,248,0.12)";
      e.currentTarget.style.borderColor = "rgba(56,189,248,0.20)";
    }
  }}
>
  {loading
    ? (tab === "login" ? "登录中..." : "注册中...")
    : (tab === "login" ? "登录" : "注册")
  }
</button>
```

#### 1.6 注册成功后自动登录

当前逻辑：注册 → 跳转 /scan（后端register已返回token，所以注册=自动登录）
不需要额外处理，register和login返回格式一样。

#### 1.7 Google登录按钮（保持占位）

Google登录暂时保持 alert，后续再接。

---

## 任务2: Navbar 登录状态

### 需要改的文件
`components/navbar.tsx`

### 实现要求

Navbar 右侧根据登录状态显示不同内容：

  未登录：显示 "登录" 链接（指向 /login）
  已登录：显示用户邮箱（或"我的账户"）+ "退出" 按钮

#### 2.1 读取登录状态

在 Navbar 组件中：

```typescript
const [user, setUser] = useState<{ id: number; email: string } | null>(null);

useEffect(() => {
  const stored = localStorage.getItem("cf_user");
  if (stored) {
    try {
      setUser(JSON.parse(stored));
    } catch {}
  }
}, []);
```

#### 2.3 退出功能

```typescript
function handleLogout() {
  localStorage.removeItem("cf_token");
  localStorage.removeItem("cf_user");
  setUser(null);
  window.location.href = "/";
}
```

#### 2.4 "登录"链接条件渲染

把当前的"登录"链接改为条件渲染：

```tsx
{user ? (
  <div className="flex items-center gap-3">
    <span className="text-[12px] text-[#6E6E88]">{user.email}</span>
    <button
      onClick={handleLogout}
      className="text-[13px] font-mono font-bold text-[#6E6E88] hover:text-[#C8C8D8] transition-colors duration-300"
    >
      退出
    </button>
  </div>
) : (
  <a
    href="/login"
    className="text-[13px] font-mono font-bold text-[#6E6E88] hover:text-[#C8C8D8] transition-colors duration-300"
  >
    登录
  </a>
)}
```

#### 2.5 "免费测试"按钮条件渲染

当前"免费测试"按钮始终指向 `#hero`。改为根据登录状态切换：

- 未登录 → 文字"免费测试" → 跳转 /login
- 已登录 → 文字"开始体检" → 跳转 /scan

把当前的"免费测试" `<a>` 标签改为条件渲染：

```tsx
{user ? (
  <motion.a
    href="/scan"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.55, duration: 0.4 }}
    className="inline-flex items-center gap-2 px-4 py-1.5 text-[13px] font-medium tracking-wide rounded-sm
      transition-all duration-300"
    style={{
      background: "rgba(56,189,248,0.08)",
      border: "1px solid rgba(56,189,248,0.15)",
      color: "#7DD3FC",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "rgba(56,189,248,0.14)";
      e.currentTarget.style.borderColor = "rgba(56,189,248,0.25)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "rgba(56,189,248,0.08)";
      e.currentTarget.style.borderColor = "rgba(56,189,248,0.15)";
    }}
  >
    <span className="relative flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full rounded-full bg-[#38BDF8] opacity-40" style={{ animation: "luminousBreath 2s ease-in-out infinite" }} />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#38BDF8] opacity-70" />
    </span>
    开始体检
  </motion.a>
) : (
  <motion.a
    href="/login"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.55, duration: 0.4 }}
    className="inline-flex items-center gap-2 px-4 py-1.5 text-[13px] font-medium tracking-wide rounded-sm
      transition-all duration-300"
    style={{
      background: "rgba(56,189,248,0.08)",
      border: "1px solid rgba(56,189,248,0.15)",
      color: "#7DD3FC",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "rgba(56,189,248,0.14)";
      e.currentTarget.style.borderColor = "rgba(56,189,248,0.25)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "rgba(56,189,248,0.08)";
      e.currentTarget.style.borderColor = "rgba(56,189,248,0.15)";
    }}
  >
    <span className="relative flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full rounded-full bg-[#38BDF8] opacity-40" style={{ animation: "luminousBreath 2s ease-in-out infinite" }} />
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#38BDF8] opacity-70" />
    </span>
    免费测试
  </motion.a>
)}
```

---

## 验证方法

1. 启动后端：`cd ~/Desktop/CiteFlow && source .venv/bin/activate && uvicorn api:app --reload --port 8000`
2. 启动前端：`cd ~/Desktop/CiteFlow/frontend && npm run dev`
3. 访问 http://localhost:3000/login

**注册测试：**
4. 输入新邮箱 + 密码 → 点注册
5. 按钮显示"注册中..." → 成功后跳转 /scan
6. 检查 localStorage 有 cf_token 和 cf_user

**登录测试：**
7. 退出后回到 /login → 输入刚才的邮箱+密码 → 点登录
8. 按钮显示"登录中..." → 成功后跳转 /scan

**错误测试：**
9. 用已注册邮箱再注册 → 红色提示"该邮箱已注册"
10. 输入错误密码登录 → 红色提示"邮箱或密码错误"
11. 不启动后端直接登录 → 红色提示"网络错误，请检查后端是否启动"

**Navbar测试：**
12. 登录后 Navbar 显示邮箱 + "退出"按钮
13. 点"退出" → localStorage清空 → 跳转首页 → Navbar显示"登录"

---

## CHECKLIST 自检

**任务1 — login/page.tsx:**
- [ ] handleSubmit 调用 /api/auth/register 和 /api/auth/login
- [ ] 成功后 token 存 localStorage (cf_token)
- [ ] 成功后用户信息存 localStorage (cf_user)
- [ ] 成功后跳转 /scan
- [ ] loading 状态（按钮禁用 + "登录中..."/"注册中..."）
- [ ] API 错误显示红色提示
- [ ] 网络错误有友好提示
- [ ] Google 按钮保持 alert 占位

**任务2 — navbar.tsx:**
- [ ] 读取 localStorage cf_user 判断登录状态
- [ ] 未登录显示"登录"链接
- [ ] 已登录显示邮箱 + "退出"按钮
- [ ] 登录链接保持 font-mono font-bold 样式
- [ ] 退出清空 localStorage + 跳转首页
- [ ] "免费测试"按钮：未登录→/login，已登录→/scan+改名"开始体检"
- [ ] "开始体检"/"免费测试"保持原有按钮样式（渐变+呼吸光效）

---

## 交付格式

```
自检结果: X/8 login + X/4 navbar = XX/12
失败项: (无 / 列出)
```

---

## 注意事项

1. API 地址默认 http://localhost:8000，可通过 NEXT_PUBLIC_API_URL 环境变量覆盖
2. 后端 CORS 已配置 allow_origins=["*"]，前端直接跨域调用
3. 不用 axios，用原生 fetch
4. 不新增 npm 依赖
5. token 存 localStorage（第一版简单方案，后续可改 httpOnly cookie）
6. /scan 页面暂时不存在，跳转会404——等下一步做
