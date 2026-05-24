# CiteFlow v1.0 上线部署 Checklist

> 药老出品 · 2026-05-23
> 目标：citeflow.cn 可访问，完整流程跑通
> 当前版本：v1.0.0-rc1

---

## 前置确认

- [ ] 交互检查通过（游景峰正在进行）
- [ ] Git tag v1.0.0-rc1 已推送到 GitHub
- [ ] GitHub repo 设为 public（Vercel 需要访问）

---

## 第一步：域名配置

| 项目 | 操作 | 验证 |
|------|------|------|
| citeflow.cn DNS | A 记录 → Vercel IP `76.76.21.21` | `nslookup citeflow.cn` 返回此 IP |
| api.citeflow.cn DNS | CNAME → Railway 分配的域名 | `nslookup api.citeflow.cn` 返回 Railway IP |
| www 重定向 | CNAME `www` → `citeflow.cn` 或 Vercel 侧配置重定向 | `curl -I https://www.citeflow.cn` 返回 301 |

**操作路径**：域名注册商（阿里云/腾讯云/DNSpod）→ DNS 解析设置

---

## 第二步：后端部署（Railway）

### 2.1 创建 Railway 项目

1. 登录 [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. 选择 CiteFlow repo
3. Railway 自动检测 Python 项目

### 2.2 环境变量

在 Railway Dashboard → Variables 中设置：

```
# ─── API 密钥 ───
OFOX_API_KEY=sk-ofox-实际密钥
DEEPSEEK_API_KEY=sk-实际密钥
SERPER_API_KEY=实际密钥

# ─── 认证 ───
SECRET_KEY=生成一个随机字符串（python3 -c "import secrets; print(secrets.token_hex(32))"）

# ─── 生产配置 ───
ENVIRONMENT=production
```

> ⚠️ 当前 `auth.py` 第9行 SECRET_KEY 是硬编码的。上线前需要改为 `os.environ.get("SECRET_KEY", "fallback-for-dev")`。如果不改，所有环境的 JWT 都用同一个密钥——不是 P0 但建议改。

### 2.3 启动命令

Railway 会自动识别，或手动设置：

```
Start Command: cd /app && gunicorn api:app -c gunicorn.conf.py
```

### 2.4 持久化存储

SQLite 数据库 `citeflow.db` 需要持久化：

1. Railway Dashboard → 项目 → Add Volume
2. Mount path: `/app/data`
3. 修改 `auth_db.py` 的 `DB_PATH` 为 `/app/data/citeflow.db`

当前 `DB_PATH` 在 `auth_db.py` 里是相对路径 `citeflow.db`，部署到 Railway 容器后每次重启会丢失。必须先改。

### 2.5 部署后验证

```bash
# 1. 健康检查
curl https://api.citeflow.cn/health

# 2. 注册测试
curl -X POST https://api.citeflow.cn/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@citeflow.cn","password":"Test123456"}'

# 3. 登录测试
curl -X POST https://api.citeflow.cn/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@citeflow.cn","password":"Test123456"}'
```

---

## 第三步：前端部署（Vercel）

### 3.1 创建 Vercel 项目

1. 登录 [vercel.com](https://vercel.com) → Import Project
2. 选择 CiteFlow GitHub repo
3. Framework: Next.js（自动检测）

### 3.2 构建设置

```
Root Directory: frontend
Build Command: cd frontend && npm run build
Output Directory: frontend/.next
```

### 3.3 环境变量

在 Vercel Project Settings → Environment Variables：

```
NEXT_PUBLIC_API_URL=https://api.citeflow.cn
```

> 注意：`NEXT_PUBLIC_` 前缀的变量会编译进前端 JS bundle，浏览器可见。API URL 暴露出来没问题。

### 3.4 域名绑定

Vercel Project Settings → Domains → Add `citeflow.cn`

Vercel 会提示 DNS 配置步骤。确认 DNS 已指向 Vercel 后添加。

### 3.5 部署后验证

```bash
# 1. 首页可访问
curl -I https://citeflow.cn
# 应该返回 200

# 2. 进入体检中心页
curl -I https://citeflow.cn/enter
# 应该返回 200

# 3. 前端 JS 正确连到后端
# 浏览器打开 https://citeflow.cn → F12 Network → 看 API 请求是否指向 api.citeflow.cn
```

---

## 第四步：CORS 收紧（安全加固）

当前 `api.py` 的 CORS 配置是 `allow_origins=["*"]`——所有域名都能调 API。上线后应改为：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://citeflow.cn",
        "https://www.citeflow.cn",
        "http://localhost:3000",  # 保留本地开发
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

> 优先级：P1（上线当天改），不是阻塞项但不宜拖。

---

## 第五步：全链路端到端测试

部署完成后，走一遍完整流程：

| 步骤 | 操作 | 预期结果 |
|------|------|---------|
| 1 | 访问 `https://citeflow.cn` | Landing page 正常显示 |
| 2 | 输入域名 → 立即诊断 | 跳转 `/enter`，显示扫描页面 |
| 3 | 走 Light 扫描 | 完成后显示初步体检报告 |
| 4 | 注册账号 | 注册成功，自动登录 |
| 5 | 走 Probe 扫描 | 完成后显示 Probe 报告 |
| 6 | 进入 Analyst | 显示诊断报告 |
| 7 | 进入 Doctor | 显示处方 |
| 8 | 浏览器 F12 | Console 无红色报错 |

---

## 第六步：监控（上线后）

- Railway Dashboard → 看 CPU/内存/请求量
- Vercel Dashboard → 看部署状态和访问量
- 设置 Railway 的 HTTP 健康检查：`GET /health`

---

## 环境变量汇总

| 变量 | 值 | 位置 |
|------|-----|------|
| `OFOX_API_KEY` | ofox.ai 中转站密钥 | Railway |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | Railway |
| `SERPER_API_KEY` | Serper Google 搜索密钥 | Railway |
| `SECRET_KEY` | JWT 签名密钥（随机生成） | Railway |
| `NEXT_PUBLIC_API_URL` | `https://api.citeflow.cn` | Vercel |

---

## 需要部署前修改的代码

| 文件 | 改动 | 优先级 |
|------|------|--------|
| `auth_db.py` | `DB_PATH` 改为环境变量，默认 `/app/data/citeflow.db` | **P0（阻塞）** |
| `auth.py:9` | `SECRET_KEY` 改为 `os.environ.get("SECRET_KEY", "dev-fallback")` | P1 |
| `api.py:31` | CORS `allow_origins` 从 `["*"]` 改为域名白名单 | P1 |
