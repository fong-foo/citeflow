# TASK_ADMIN_DASHBOARD.md — 管理后台：用户管理 + 数据看板

> 药老出品 · 2026-05-25
> 目标: /admin 页面，管理员邮箱鉴权，用户列表+改tier+数据统计
> 预计工时: 4h

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 后端 Admin API（stats + users + 改tier） | api.py, auth_db.py | 1.5h |
| 2 | 前端 /admin 页面（双Tab + 表格 + 图表） | app/(app)/admin/page.tsx | 2.5h |

**完成标准**: 用管理员邮箱登录 → 访问 /admin → 看到数据看板 + 用户列表 → 能改用户tier

---

## 管理员鉴权方案

JWT 中已有 `email` 字段。admin API 检查 `email == os.environ.get("ADMIN_EMAIL", "")`。不匹配 → 403。

环境变量 `ADMIN_EMAIL` 在 Railway 中设置为你（游景峰）的个人邮箱。

---

## 任务1: 后端 Admin API

### 需要改的文件
- `/Users/fogn/Desktop/CiteFlow/api.py` — 新增 3 个 API 端点
- `/Users/fogn/Desktop/CiteFlow/auth_db.py` — 新增 2 个查询函数

### API 端点设计

```python
# ─── Admin API ────────────────────────────────────────

from auth import get_current_user
import os

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """检查当前用户是否为管理员。非管理员 → 403。"""
    if user["email"] != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="无权访问")
    return user

class UpdateTierRequest(BaseModel):
    tier: str  # "free" | "probe" | "full"

@app.get("/api/admin/stats")
async def admin_stats(user: dict = Depends(require_admin)):
    """数据看板统计。"""
    from auth_db import get_db
    conn = get_db()
    
    # 总用户数
    total = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    
    # tier 分布
    free_count = conn.execute("SELECT COUNT(*) FROM users WHERE tier='free'").fetchone()[0]
    probe_count = conn.execute("SELECT COUNT(*) FROM users WHERE tier='probe'").fetchone()[0]
    full_count = conn.execute("SELECT COUNT(*) FROM users WHERE tier='full'").fetchone()[0]
    
    # 跑过体检 vs 没跑过
    scanned = conn.execute("SELECT COUNT(*) FROM users WHERE has_light_scan=1").fetchone()[0]
    not_scanned = total - scanned
    
    # 最近7天新增
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    recent = conn.execute(
        "SELECT COUNT(*) FROM users WHERE created_at >= ?", (seven_days_ago,)
    ).fetchone()[0]
    
    # 每日注册趋势（最近14天）
    daily_stats = []
    for i in range(13, -1, -1):
        day = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        count = conn.execute(
            "SELECT COUNT(*) FROM users WHERE date(created_at) = ?", (day,)
        ).fetchone()[0]
        daily_stats.append({"date": day, "count": count})
    
    return {
        "total_users": total,
        "tier_distribution": {
            "free": free_count,
            "probe": probe_count,
            "full": full_count,
        },
        "scan_stats": {
            "scanned": scanned,
            "not_scanned": not_scanned,
        },
        "recent_7d": recent,
        "daily_registrations": daily_stats,
    }


@app.get("/api/admin/users")
async def admin_users(
    search: str = "",
    user: dict = Depends(require_admin),
):
    """用户列表（支持邮箱搜索）。"""
    from auth_db import get_db
    conn = get_db()
    
    if search:
        rows = conn.execute(
            "SELECT id, email, tier, has_light_scan, created_at FROM users WHERE email LIKE ? ORDER BY created_at DESC LIMIT 100",
            (f"%{search}%",)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT id, email, tier, has_light_scan, created_at FROM users ORDER BY created_at DESC LIMIT 100"
        ).fetchall()
    
    users = []
    for row in rows:
        users.append({
            "id": row["id"],
            "email": row["email"],
            "tier": row["tier"],
            "has_light_scan": bool(row["has_light_scan"]),
            "created_at": row["created_at"],
        })
    
    return {"users": users, "total": len(users)}


@app.patch("/api/admin/users/{email}/tier")
async def admin_update_tier(
    email: str,
    body: UpdateTierRequest,
    user: dict = Depends(require_admin),
):
    """修改用户 tier。"""
    valid_tiers = ["free", "probe", "full"]
    if body.tier not in valid_tiers:
        raise HTTPException(status_code=400, detail=f"无效tier，可选: {valid_tiers}")
    
    from auth_db import update_user_tier
    ok = update_user_tier(email, body.tier)
    if not ok:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return {"ok": True, "email": email, "tier": body.tier}
```

### 验证方法
```bash
# 1. 登录获取 token
TOKEN=$(curl -s -X POST https://api.citeflow.cn/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"你的管理员邮箱","password":"你的密码"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. 数据看板
curl -s https://api.citeflow.cn/api/admin/stats \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 3. 用户列表
curl -s "https://api.citeflow.cn/api/admin/users?search=test" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 4. 改 tier
curl -s -X PATCH https://api.citeflow.cn/api/admin/users/test@citeflow.com/tier \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tier":"probe"}'

# 5. 非管理员被拒绝
curl -s https://api.citeflow.cn/api/admin/stats \
  -H "Authorization: Bearer $TOKEN_NONADMIN"  # 应返回 403
```

---

## 任务2: 前端 /admin 页面

### 需要改的文件
- 新建 `frontend/app/(app)/admin/page.tsx` — 管理后台页面

### 路由
Next.js App Router 自动路由：`/admin` 自动映射到 `app/(app)/admin/page.tsx`

### 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  Admin · CiteFlow                         admin@xxx.com │
├─────────────────────────────────────────────────────────┤
│  [数据看板]  [用户管理]                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐     │
│  │ 总用户   │ │ 免费用户 │ │ Probe   │ │ Full用户  │     │
│  │   128    │ │   98    │ │   22    │ │    8     │     │
│  └─────────┘ └─────────┘ └─────────┘ └──────────┘     │
│                                                         │
│  ┌───────────────┐ ┌───────────────┐                   │
│  │  已体检  89   │ │  未体检  39   │                   │
│  └───────────────┘ └───────────────┘                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 最近14天注册趋势（柱状图 or 折线）                │   │
│  │  ██▌                                            │   │
│  │  ████▌  ███                                     │   │
│  │  ██████▌████▌ ██▌ ████▌                        │   │
│  │  ...                                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  最近7天新增: 34                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

用户管理 Tab：

```
┌─────────────────────────────────────────────────────────┐
│  [🔍 搜索邮箱...]                                        │
├─────────────────────────────────────────────────────────┤
│  邮箱              注册时间        Tier    体检    操作   │
│  test@citeflow.com  2026-05-20    free    ✓      [改]   │
│  user1@qq.com      2026-05-22    probe   ✗      [改]   │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘

点击 [改] → 下拉选 free/probe/full → 确认 → API 调用 → 刷新列表
```

### 实现要求

**1. 数据获取**

进入 /admin 时调用两个 API：
```typescript
const [stats, setStats] = useState(null);
const [users, setUsers] = useState([]);
const [tab, setTab] = useState<'dashboard' | 'users'>('dashboard');
const [search, setSearch] = useState('');

useEffect(() => {
  fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json()).then(setStats);
}, []);

useEffect(() => {
  fetch(`/api/admin/users?search=${search}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json()).then(data => setUsers(data.users));
}, [search]);
```

token 从 localStorage 获取：
```typescript
const getUser = () => {
  try {
    const raw = localStorage.getItem('cf_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const token = getUser()?.access_token;
```

**2. 如果未登录或非管理员（API 返回 403）→ 显示"无权访问"并重定向到 /login**

```typescript
useEffect(() => {
  if (!token) { window.location.href = '/login'; return; }
  fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
    .then(r => {
      if (r.status === 403) { alert('无权访问'); window.location.href = '/'; }
      return r.json();
    })
    .then(setStats);
}, []);
```

**3. 数据看板 Tab**

- 4 张统计卡片（总用户 / 免费 / Probe / Full）
- 2 张卡片（已体检 / 未体检）
- 一个简易柱状图（最近 14 天注册趋势）：纯 CSS div 柱状图，不用第三方图表库
- 最近 7 天新增数字

**4. 用户管理 Tab**

- 搜索框（输入时 debounce 300ms 后调 API）
- 表格：邮箱、注册时间、Tier（带颜色标签）、是否体检（✓/✗）、操作
- 点击"改"按钮 → 弹出小下拉选 free/probe/full → 选完调 PATCH API → 成功后刷新列表

**5. 设计风格**

与现有暗色主题一致：
- 背景 `#0A0A0F`
- 卡片 `#131318`，边框 `#222228`
- 强调色 `#3B82F6`
- 字体 Inter，数字 JetBrains Mono
- 用 inline style，不用 Tailwind class
- Framer Motion 进入动画（opacity + y:16 → 0）

**6. 柱状图实现（纯 CSS）**

```tsx
// 简易柱状图：用 div + inline style
<div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, padding: '16px 0' }}>
  {daily.map((d: any) => {
    const maxCount = Math.max(...daily.map((x: any) => x.count), 1);
    const height = (d.count / maxCount) * 100;
    return (
      <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, color: '#5E5E78' }}>{d.count}</span>
        <div style={{
          width: '100%', maxWidth: 24, height: `${height}%`, minHeight: d.count > 0 ? 4 : 1,
          background: d.count > 0 ? '#3B82F6' : '#222228', borderRadius: '2px 2px 0 0',
        }} />
        <span style={{ fontSize: 9, color: '#5E5E78' }}>{d.date.slice(5)}</span>
      </div>
    );
  })}
</div>
```

### 验证方法
- 访问 `/admin` → 看到两个 Tab
- 数据看板 Tab → 统计卡片显示数据、柱状图渲染
- 切换到用户管理 Tab → 看到用户列表
- 搜索邮箱 → 列表过滤
- 点击"改" → 弹出下拉 → 选 probe → 确认 → tier 变更 → 列表刷新
- 非管理员访问 `/admin` → 弹"无权访问" → 跳回首页

---

## 不需要改的文件
- `frontend/app/(app)/scan/page.tsx` — 不动
- `frontend/components/*` — 不动
- `frontend/app/(marketing)/*` — 不动
- `auth.py` — 不动（JWT 已有 email 字段，直接复用 get_current_user）

---

## CHECKLIST 自检

**任务1 后端:**
- [ ] `GET /api/admin/stats` 返回 total_users, tier_distribution, scan_stats, recent_7d, daily_registrations
- [ ] `GET /api/admin/users` 返回用户列表，支持 ?search= 过滤
- [ ] `PATCH /api/admin/users/{email}/tier` 改 tier，拒绝无效值
- [ ] 非管理员访问 admin API → 403
- [ ] 未登录访问 admin API → 401

**任务2 前端:**
- [ ] `/admin` 页面双 Tab（数据看板 / 用户管理）
- [ ] 未登录 → 跳 /login
- [ ] 非管理员 → 弹"无权访问" → 跳首页
- [ ] 数据看板：统计卡片数据正确、柱状图渲染、7日新增显示
- [ ] 用户管理：表格展示、搜索过滤、改 tier 可操作
- [ ] 暗色主题一致（#0A0A0F, #131318, #222228, #3B82F6）
- [ ] 浏览器 console 无红色报错

---

## 交付格式

```
自检结果: X/6 任务1 + X/7 任务2 = XX/13
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项
1. **ADMIN_EMAIL 必须设为环境变量**，不在代码中硬编码
2. **不改 auth.py** — JWT 已有 email，直接在 api.py 新函数里比对
3. **不引入第三方图表库** — 柱状图用纯 CSS div
4. **不改现有前端组件** — /admin 是完全独立的新页面
5. **数据库密码不返回** — SQL 查询时只 SELECT 需要的字段
6. **前端 token 从 localStorage 的 cf_user 获取**，格式 `{ access_token: "..." }`
