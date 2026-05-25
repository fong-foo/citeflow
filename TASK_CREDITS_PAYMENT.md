# TASK_CREDITS_PAYMENT.md — Credits 付费系统 + ¥368/¥68 价格改版

> 药老出品 · 2026-05-25
> 目标：Light 扫描限一次，¥368 买 2 次完整体检，¥68 单次 Probe，全栈落地
> 预计工时：6h

---

## 核心设计

```
免费用户：
  Light 扫描 → 限 1 次（has_light_scan 已存在）
  Light 跑完后 → 报告底部显示两个付费按钮

¥368 完整体检套餐：
  含 2 次完整体检（Probe → Analyst → Doctor 全套）
  Doctor 完成后才扣 1 次 scan_credits
  次数用完 → 显示付费引导

¥68 单次 Probe：
  只跑 Probe（不含 Analyst/Doctor）
  Probe 完成后扣 1 次 probe_credits
```

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 数据库加 credits 字段 | auth_db.py | 0.5h |
| 2 | 注册/登录/me 返回 credits | auth_db.py, api.py | 0.5h |
| 3 | Lemon Squeezy 双产品 + webhook 加 credits | api.py, .env.example | 1.5h |
| 4 | 前端 credits 状态管理 + 扣减 API | page.tsx, api.py | 1h |
| 5 | 前端 Light 限一次 + 付费引导 | page.tsx, scan-result.tsx | 1h |
| 6 | Landing page 价格更新 | landing.html | 0.5h |
| 7 | 升级弹窗改为双选项 | upgrade-modal.tsx | 1h |

---

## 任务1: 数据库加 credits 字段

### 需要改的文件
`/Users/fogn/Desktop/CiteFlow/auth_db.py`

### 实现要求

在 `_init_conn()` 的 migrate 区域（`has_light_scan` 迁移之后）添加：

```python
# Migrate: add scan_credits column
try:
    _conn.execute("ALTER TABLE users ADD COLUMN scan_credits INTEGER NOT NULL DEFAULT 0")
except sqlite3.OperationalError:
    pass
# Migrate: add probe_credits column
try:
    _conn.execute("ALTER TABLE users ADD COLUMN probe_credits INTEGER NOT NULL DEFAULT 0")
except sqlite3.OperationalError:
    pass
```

新增 3 个函数：

```python
def get_credits(email: str) -> dict:
    """返回用户 credits 信息。"""
    conn = get_db()
    with _conn_lock:
        row = conn.execute(
            "SELECT scan_credits, probe_credits, has_light_scan FROM users WHERE email = ?",
            (email,)
        ).fetchone()
        if row:
            return {
                "scan_credits": row["scan_credits"],
                "probe_credits": row["probe_credits"],
                "has_light_scan": bool(row["has_light_scan"]),
            }
        return {"scan_credits": 0, "probe_credits": 0, "has_light_scan": False}


def add_scan_credits(email: str, count: int) -> bool:
    """增加完整体检次数。"""
    conn = get_db()
    with _conn_lock:
        conn.execute(
            "UPDATE users SET scan_credits = scan_credits + ? WHERE email = ?",
            (count, email)
        )
        conn.commit()
        return conn.total_changes > 0


def add_probe_credits(email: str, count: int) -> bool:
    """增加单次 Probe 次数。"""
    conn = get_db()
    with _conn_lock:
        conn.execute(
            "UPDATE users SET probe_credits = probe_credits + ? WHERE email = ?",
            (count, email)
        )
        conn.commit()
        return conn.total_changes > 0


def use_scan_credit(email: str) -> tuple[bool, int]:
    """消耗 1 次完整体检。返回 (是否成功, 剩余次数)。"""
    conn = get_db()
    with _conn_lock:
        conn.execute(
            "UPDATE users SET scan_credits = scan_credits - 1 WHERE email = ? AND scan_credits > 0",
            (email,)
        )
        conn.commit()
        # 查询剩余
        row = conn.execute("SELECT scan_credits FROM users WHERE email = ?", (email,)).fetchone()
        remaining = row["scan_credits"] if row else 0
        return (remaining >= 0, remaining)


def use_probe_credit(email: str) -> tuple[bool, int]:
    """消耗 1 次单次 Probe。返回 (是否成功, 剩余次数)。"""
    conn = get_db()
    with _conn_lock:
        conn.execute(
            "UPDATE users SET probe_credits = probe_credits - 1 WHERE email = ? AND probe_credits > 0",
            (email,)
        )
        conn.commit()
        row = conn.execute("SELECT probe_credits FROM users WHERE email = ?", (email,)).fetchone()
        remaining = row["probe_credits"] if row else 0
        return (remaining >= 0, remaining)


def get_user_full(email: str) -> dict | None:
    """获取完整用户信息（含 credits）。替代部分 get_user_by_email 调用。"""
    conn = get_db()
    with _conn_lock:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if row:
            return {
                "id": row["id"],
                "email": row["email"],
                "password_hash": row["password_hash"],
                "tier": row["tier"],
                "scan_credits": row["scan_credits"],
                "probe_credits": row["probe_credits"],
                "has_light_scan": bool(row["has_light_scan"]),
                "created_at": row["created_at"],
            }
        return None
```

### 验证方法
```bash
python3 -c "
from auth_db import get_credits, add_scan_credits, use_scan_credit
from auth_db import create_user, get_db
# 测试
add_scan_credits('test@citeflow.com', 2)
print(get_credits('test@citeflow.com'))  # scan_credits 应为 2
ok, rem = use_scan_credit('test@citeflow.com')
print(f'used={ok}, remaining={rem}')  # used=True, remaining=1
"
```

---

## 任务2: 注册/登录/me 返回 credits

### 需要改的文件
`/Users/fogn/Desktop/CiteFlow/api.py`

### 实现要求

修改 `/api/auth/me` 端点，返回 credits：

当前 me 端点约在 api.py 末尾。找到 `@app.get("/api/auth/me")`，把返回内容加上 credits：

```python
@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    from auth_db import get_user_full
    full = get_user_full(user["email"])
    if not full:
        raise HTTPException(status_code=404, detail="用户不存在")
    return {
        "id": full["id"],
        "email": full["email"],
        "tier": full["tier"],
        "scan_credits": full["scan_credits"],
        "probe_credits": full["probe_credits"],
        "has_light_scan": full["has_light_scan"],
        "created_at": full["created_at"],
    }
```

修改 `/api/auth/login` 返回，在现有 response 中加 credits：

找到 login 端点，在返回 `access_token` 的同时加 credits 字段。在生成 token 之后、return 之前：

```python
from auth_db import get_credits
credits = get_credits(email)
# 在 return dict 中加：
# "scan_credits": credits["scan_credits"],
# "probe_credits": credits["probe_credits"],
# "has_light_scan": credits["has_light_scan"],
```

同样修改 `/api/auth/register` 返回，新用户注册返回 credits=0。

### 验证方法
```bash
# 登录后检查返回
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@citeflow.com","password":"test1234"}' \
  | python3 -m json.tool | grep -E "scan_credits|probe_credits"
# 应返回 "scan_credits": xx, "probe_credits": xx
```

---

## 任务3: Lemon Squeezy 双产品 + webhook 加 credits

### 核心变化
- **旧**：一个产品(VARIANT_ID) → webhook 改 tier 为 full
- **新**：两个产品 → webhook 按产品加 credits，不再改 tier

### 需要改的文件
- `api.py` — checkout + webhook 重写
- `.env.example` — 加两个 VARIANT_ID

### 3a. 环境变量

```env
# Lemon Squeezy 支付
LEMON_SQUEEZY_API_KEY=***
LEMON_SQUEEZY_STORE_ID=your_store_id
LEMON_SQUEEZY_VARIANT_ID_FULL=***   # ¥368 完整体检（2次）
LEMON_SQUEEZY_VARIANT_ID_PROBE=***  # ¥68 单次Probe
LEMON_SQUEEZY_WEBHOOK_SECRET=your_w...cret
```

### 3b. POST /api/pay/checkout 支持多产品

修改 checkout 端点，接收 `product` 参数（"full" | "probe"）：

```python
class CheckoutRequest(BaseModel):
    product: str  # "full" 或 "probe"

@app.post("/api/pay/checkout")
async def create_checkout(body: CheckoutRequest, user: dict = Depends(get_current_user)):
    """创建 Lemon Squeezy checkout。product: 'full'（¥368）或 'probe'（¥68）。"""
    if body.product == "full":
        variant_id = os.environ.get("LEMON_SQUEEZY_VARIANT_ID_FULL", "")
    elif body.product == "probe":
        variant_id = os.environ.get("LEMON_SQUEEZY_VARIANT_ID_PROBE", "")
    else:
        raise HTTPException(status_code=400, detail="无效产品类型")

    api_key = os.environ.get("LEMON_SQUEEZY_API_KEY", "")
    store_id = os.environ.get("LEMON_SQUEEZY_STORE_ID", "")

    if not variant_id or not api_key or not store_id:
        raise HTTPException(status_code=500, detail="支付未配置")

    success_url = os.environ.get("FRONTEND_URL", "https://www.citeflow.cn") + "/pay/success"

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.lemonsqueezy.com/v1/checkouts",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json",
                "Content-Type": "application/vnd.api+json",
            },
            json={
                "data": {
                    "type": "checkouts",
                    "attributes": {
                        "checkout_data": {
                            "custom": {
                                "user_id": str(user["user_id"]),
                                "email": user["email"],
                                "product": body.product,
                            }
                        },
                        "product_options": {
                            "redirect_url": success_url,
                        },
                    },
                    "relationships": {
                        "store": {"data": {"type": "stores", "id": store_id}},
                        "variant": {"data": {"type": "variants", "id": variant_id}},
                    },
                }
            },
            timeout=15,
        )
        if resp.status_code not in (200, 201):
            logger.error(f"Lemon Squeezy checkout failed: {resp.status_code}")
            raise HTTPException(status_code=502, detail="支付暂不可用")
        data = resp.json()
        return {"url": data["data"]["attributes"]["url"]}
```

### 3c. Webhook 改为加 credits（不改 tier）

```python
@app.post("/api/webhook/lemon-squeezy")
async def lemon_squeezy_webhook(request: Request):
    """支付成功 → 按产品类型加 credits。"""
    secret = os.environ.get("LEMON_SQUEEZY_WEBHOOK_SECRET", "")
    raw_body = await request.body()
    signature = request.headers.get("X-Signature", "")

    if secret:
        import hmac, hashlib
        expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=403)

    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400)

    event_name = payload.get("meta", {}).get("event_name", "")
    if event_name != "order_created":
        return {"status": "ignored", "event": event_name}

    custom = (
        payload.get("data", {})
        .get("attributes", {})
        .get("checkout_data", {})
        .get("custom", {})
    )
    email = custom.get("email", "")
    product = custom.get("product", "")

    if not email:
        return {"status": "no_email"}

    from auth_db import add_scan_credits, add_probe_credits

    if product == "full":
        add_scan_credits(email, 2)  # ¥368 = 2 次完整体检
        logger.info(f"Added 2 scan_credits to {email}")
    elif product == "probe":
        add_probe_credits(email, 1)  # ¥68 = 1 次 Probe
        logger.info(f"Added 1 probe_credit to {email}")
    else:
        logger.warning(f"Unknown product: {product}")

    return {"status": "ok", "product": product}
```

### 验证方法
```bash
# 本地测 checkout 创建
curl -X POST http://localhost:8000/api/pay/checkout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"product":"full"}'
# 应返回 {"url": "https://store.lemonsqueezy.com/checkout/..."}
```

---

## 任务4: 前端 credits 管理 + 扣减 API

### 需要改的文件
- `frontend/app/(app)/scan/page.tsx` — credits 状态 + 扣减逻辑
- `api.py` — 新增扣减 API

### 4a. 后端扣减 API

```python
@app.post("/api/user/deduct")
async def deduct_credit(body: CheckoutRequest, user: dict = Depends(get_current_user)):
    """扫描完成后扣减 credits。product: 'full' 或 'probe'。"""
    from auth_db import use_scan_credit, use_probe_credit

    email = user["email"]
    if body.product == "full":
        ok, remaining = use_scan_credit(email)
    elif body.product == "probe":
        ok, remaining = use_probe_credit(email)
    else:
        raise HTTPException(status_code=400, detail="无效产品类型")

    if not ok:
        raise HTTPException(status_code=400, detail="次数不足")

    return {"ok": True, "remaining": remaining, "product": body.product}
```

### 4b. 前端 page.tsx — 加 credits 状态

在 page.tsx 顶部 state 区域添加（约第 86 行 `upgradeFeature` 之后）：

```typescript
const [scanCredits, setScanCredits] = useState(0);
const [probeCredits, setProbeCredits] = useState(0);
const [hasLightScan, setHasLightScan] = useState(false);
```

从 `/api/auth/me` 或登录响应中加载 credits（在 page.tsx 的 useEffect 初始化中）：

```typescript
// 在现有的 useEffect 中，加载完 user 后调：
async function loadCredits() {
  const token = localStorage.getItem("cf_token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json();
    setScanCredits(d.scan_credits || 0);
    setProbeCredits(d.probe_credits || 0);
    setHasLightScan(d.has_light_scan || false);
  } catch {}
}
```

### 4c. 扣减触发时机

**完整体检（Scan→Doctor 完成）**：在 Doctor 生成完成的回调中扣减。找到 Doctor 完成时设置 `setDoctorPhase("report")` 的地方，在那之后调用扣减。

**单次 Probe**：Probe 完成后扣减。在 `startScan` 的 `onComplete` 回调里，如果 `mode === "full"` 且是单独 Probe（非完整流程），则调用扣减。需要在 `startScan` 完成后判断。

具体实现方式——在接收到 scan 结果、设置 data 的地方（约第 480-540 行），根据 `product` 参数判断是否扣减：

```typescript
// 在 startScan 的成功回调中（pollResult 拿到最终结果后）：
if (product === "probe" && mode === "full") {
  // 单次 Probe 完成 → 扣减 probe_credits
  await deductCredit("probe");
} else if (product === "input" && mode === "light") {
  // Light 扫描完成 → 标记 has_light_scan（已有 set_has_light_scan API）
  await fetch(`${API_BASE}/api/auth/light-scan-done`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}
```

Doctor 完成时的扣减（在 `handleSidebarDoctorClick` 或 Doctor 流程完成回调中）：

```typescript
async function deductCredit(product: "full" | "probe") {
  const token = localStorage.getItem("cf_token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/api/user/deduct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ product }),
    });
    const d = await res.json();
    if (d.ok) {
      if (product === "full") setScanCredits(d.remaining);
      else setProbeCredits(d.remaining);
    }
  } catch {}
}
```

### 4d. Doctor 完成后扣减

在 Doctor 流程中，当 Doctor 生成完成进入 report 阶段时，扣减 scan_credits。找到 Doctor 完成的代码位置（`setDoctorPhase("report")` 或类似），在那之后调：

```typescript
// Doctor 完成，扣 1 次完整体检次数
deductCredit("full");
```

### 验证方法
1. 登录 → console 执行 `localStorage.setItem('cf_user', JSON.stringify({...原值, scan_credits:2}))`
2. 跑完 Doctor → 检查剩余次数应变为 1
3. 刷新页面 → 次数应保持 1

---

## 任务5: Light 限一次 + 付费引导

### 需要改的文件
- `frontend/app/(app)/scan/page.tsx` — 输入提交时检查 has_light_scan
- `frontend/components/scan-result.tsx` — Light 报告底部加付费按钮

### 5a. 输入提交时拦截

在 `handleInputComplete` 函数（约第 384 行）最开头加检查：

```typescript
function handleInputComplete(input: ...) {
  if (!tierLoaded) return;

  // 如果已有 Light 扫描且 scanCredits === 0 且 probeCredits === 0
  // → 只显示付费按钮，不跑扫描
  if (hasLightScan && scanCredits === 0 && probeCredits === 0) {
    alert("你的免费体检次数已用完。请升级解锁更多功能。");
    setShowUpgrade(true);
    return;
  }

  setScanDomain(input.domain);
  setScanBrandName(input.brandName || input.domain);

  if (tier === "free" && !hasLightScan) {
    startScan(input, "light", "input");
  } else if (scanCredits > 0) {
    // 有完整体检次数 → 进 briefing
    setBriefingDefaults({...});
    setProbePhase("briefing");
    setStep("probe");
  } else if (probeCredits > 0) {
    // 只有 Probe 次数 → 直接跑 Probe
    setBriefingDefaults({...});
    setProbePhase("briefing");
    setStep("probe");
  } else {
    setShowUpgrade(true);
  }
}
```

### 5b. Light 报告底部付费引导

在 `scan-result.tsx` 的 Light 报告底部，如果用户 `scanCredits === 0 && probeCredits === 0`，显示两个按钮：

```tsx
{/* 付费引导：Light 报告底部 */}
{scanCredits === 0 && probeCredits === 0 && (
  <div style={{
    marginTop: 40, padding: 24, background: "#131318", borderRadius: 12,
    border: "1px solid #222228", textAlign: "center",
  }}>
    <h3 style={{ color: "#EDEDF5", fontSize: 18, marginBottom: 8 }}>
      想深入了解品牌在 AI 眼中的表现？
    </h3>
    <p style={{ color: "#9A9AB0", fontSize: 14, marginBottom: 20 }}>
      免费体检只展示基础数据。升级解锁完整诊断 + 处方。
    </p>
    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
      <button onClick={() => { setUpgradeFeature("probe"); setShowUpgrade(true); }}
        style={{
          padding: "10px 24px", background: "#3B82F6", color: "#fff",
          border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
        ¥368 完整体检两次 →
      </button>
      <button onClick={() => { setUpgradeFeature("probe"); setShowUpgrade(true); }}
        style={{
          padding: "10px 24px", background: "transparent", color: "#9A9AB0",
          border: "1px solid #222228", borderRadius: 8, fontSize: 14, cursor: "pointer",
        }}>
        ¥68 单次侦察兵
      </button>
    </div>
  </div>
)}
```

scan-result.tsx 需要接收新的 props：`scanCredits`, `probeCredits`, `onUpgradeClick`。

### 验证方法
1. 用 has_light_scan=true 的账号登录 → 点"开始体检" → 应弹付费提示
2. Light 报告页底部应有付费引导按钮行
3. 点击 ¥368 按钮 → 弹出升级弹窗

---

## 任务6: Landing page 价格更新

### 需要改的文件
`/Users/fogn/Desktop/CiteFlow/frontend/public/landing.html`

### 修改点

搜索 `¥100` → 替换为 `¥368`。搜索"¥100 解锁完整诊断" → 改为"¥368 完整体检两次"。同时更新 description。

具体修改：

1. **公告栏**（约第 1544 行）：`¥100 解锁完整诊断` → `¥368 完整体检两次 · ¥68 单次侦察兵`

2. **定价卡片**（约第 2049 行）：
```html
<!-- 改前 -->
<div class="pricing-price">¥100</div>
<div class="pricing-period">一次性付费</div>

<!-- 改后 -->
<div class="pricing-price">¥368</div>
<div class="pricing-period">2 次完整体检</div>
```

同时更新 features 列表：
```html
<ul class="pricing-features">
  <li>2 次 Probe + Analyst + Doctor 完整体检</li>
  <li>4 大 AI 引擎交叉对比</li>
  <li>完整引用率明细表</li>
  <li>竞品对标分析</li>
  <li>品牌 AI 认知画像</li>
  <li>可执行的优化处方</li>
</ul>
```

3. **CTA 区域**（约第 2031 行）：`¥100 解锁完整诊断 + 处方` → `¥368 完整体检两次`

4. **删除企业版定价卡片**（待定那栏，约第 2064 行）— 或改成 ¥68 单次 Probe 卡片。

如果加 ¥68 卡片：
```html
<div class="pricing-card">
  <div class="pricing-tier">单次侦察兵</div>
  <div class="pricing-price">¥68</div>
  <div class="pricing-period">每次 Probe 侦察</div>
  <ul class="pricing-features">
    <li>1 次 Probe 侦察兵扫描</li>
    <li>4 大 AI 引擎交叉对比</li>
    <li>引用率 + 推荐率明细</li>
    <li>不含诊断和处方</li>
  </ul>
  <a href="/scan" class="pricing-btn">开始侦察 →</a>
</div>
```

### 验证方法
- 浏览器导航到 landing page → 确认无 ¥100 残留
- 确认定价卡片显示 ¥368 和 ¥68

---

## 任务7: 升级弹窗改为双选项

### 需要改的文件
`/Users/fogn/Desktop/CiteFlow/frontend/components/upgrade-modal.tsx`

### 实现要求

升级弹窗显示两个产品选项，用户可以选"¥368 完整体检"或"¥68 单次 Probe"：

```tsx
// upgrade-modal.tsx — 重写
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface UpgradeModalProps {
  show: boolean;
  onClose: () => void;
  feature?: string | "probe" | "analyst" | "doctor";
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export function UpgradeModal({ show, onClose, feature }: UpgradeModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<"full" | "probe" | null>(null);
  const [loading, setLoading] = useState(false);

  const isFull = feature === "analyst" || feature === "doctor";
  const title = isFull ? "解锁完整诊断" : "升级侦察兵";
  const subtitle = isFull
    ? "包含 Analyst 诊断 + Doctor 处方"
    : "4 大 AI 引擎深度侦察";

  async function handleCheckout(product: "full" | "probe") {
    setSelectedProduct(product);
    setLoading(true);
    const token = localStorage.getItem("cf_token");
    if (!token) { alert("请先登录"); setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/api/pay/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("支付暂不可用");
      }
    } catch {
      alert("网络错误");
    }
    setLoading(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            style={{
              background: "#131318", border: "1px solid #222228",
              borderRadius: 16, padding: 32, maxWidth: 480, width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: "#EDEDF5", fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
              {title}
            </h2>
            <p style={{ color: "#9A9AB0", fontSize: 14, marginBottom: 24 }}>
              {subtitle}
            </p>

            {/* 两个产品选项 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* ¥368 完整体检 */}
              <button
                onClick={() => handleCheckout("full")}
                disabled={loading}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "16px 20px", background: "#1A1A22", border: "1px solid #222228",
                  borderRadius: 12, cursor: "pointer", textAlign: "left",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <div>
                  <div style={{ color: "#EDEDF5", fontSize: 16, fontWeight: 600 }}>
                    完整体检套餐
                  </div>
                  <div style={{ color: "#9A9AB0", fontSize: 13, marginTop: 4 }}>
                    Probe → Analyst → Doctor · 2 次
                  </div>
                </div>
                <div style={{ color: "#3B82F6", fontSize: 20, fontWeight: 700 }}>
                  ¥368
                </div>
              </button>

              {/* ¥68 单次 Probe */}
              <button
                onClick={() => handleCheckout("probe")}
                disabled={loading}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "16px 20px", background: "transparent",
                  border: "1px solid #222228", borderRadius: 12, cursor: "pointer",
                  textAlign: "left", opacity: loading ? 0.5 : 1,
                }}
              >
                <div>
                  <div style={{ color: "#EDEDF5", fontSize: 16, fontWeight: 600 }}>
                    单次侦察兵
                  </div>
                  <div style={{ color: "#9A9AB0", fontSize: 13, marginTop: 4 }}>
                    仅 Probe 侦察 · 不含诊断处方
                  </div>
                </div>
                <div style={{ color: "#9A9AB0", fontSize: 20, fontWeight: 700 }}>
                  ¥68
                </div>
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                marginTop: 20, width: "100%", padding: "10px",
                background: "transparent", border: "none",
                color: "#5E5E78", fontSize: 13, cursor: "pointer",
              }}
            >
              以后再说
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 验证方法
1. 登录 → 点侧边栏 Analyst → 弹升级弹窗
2. 弹窗显示两个选项，¥368 和 ¥68
3. 点 ¥368 → POST /api/pay/checkout → 跳 Lemon Squeezy
4. 点 ¥68 → POST /api/pay/checkout → 跳 Lemon Squeezy
5. 点"以后再说" → 关闭弹窗

---

## 不需要改的文件
- `auth.py` — JWT 逻辑不变
- `components/scan-sidebar.tsx` — 侧边栏按钮的 tier 判断逻辑转为 credits 判断（本次暂不改，用 tier 字段兼容，后续迭代再改）
- `components/scan-dashboard.tsx` — 仪表盘不在本次范围
- `lib/storage.ts` — 暂不改

---

## CHECKLIST 自检

**任务1 数据库:**
- [ ] `scan_credits` 和 `probe_credits` 列存在且有默认值 0
- [ ] `get_credits()` 返回正确值
- [ ] `add_scan_credits()` 能增加次数
- [ ] `use_scan_credit()` 扣减成功且返回剩余次数
- [ ] `use_probe_credit()` 同上
- [ ] 对已有用户兼容（ALTER TABLE 不会丢失数据）

**任务2 登录/me:**
- [ ] `/api/auth/me` 返回 scan_credits, probe_credits, has_light_scan
- [ ] `/api/auth/login` 返回 credits 字段
- [ ] `/api/auth/register` 新用户 credits=0

**任务3 Lemon Squeezy:**
- [ ] `/api/pay/checkout` 接受 product="full"→VARIANT_ID_FULL
- [ ] `/api/pay/checkout` 接受 product="probe"→VARIANT_ID_PROBE
- [ ] webhook `order_created` 加 scan_credits (product="full") 或 probe_credits (product="probe")
- [ ] webhook 验证 HMAC 签名
- [ ] .env.example 含 VARIANT_ID_FULL 和 VARIANT_ID_PROBE

**任务4 Credits 管理:**
- [ ] `POST /api/user/deduct` 扣减 scan_credits (product="full")
- [ ] `POST /api/user/deduct` 扣减 probe_credits (product="probe")
- [ ] 前端 page.tsx 加载并显示 credits 状态
- [ ] Doctor 完成后自动扣减 scan_credits
- [ ] Probe 单独完成后自动扣减 probe_credits

**任务5 Light 限一次:**
- [ ] has_light_scan=true 时不能重新跑 Light
- [ ] Light 报告底部显示付费引导按钮

**任务6 Landing page:**
- [ ] ¥100 全部改为 ¥368
- [ ] 定价区域包含 ¥368 和 ¥68 两个卡片
- [ ] 无 ¥100 残留

**任务7 升级弹窗:**
- [ ] 显示两个产品选项
- [ ] ¥368 按钮调 checkout product="full"
- [ ] ¥68 按钮调 checkout product="probe"
- [ ] 关闭按钮正常

---

## 交付格式

```
自检结果: X/6 任务1 + X/5 任务2 + X/6 任务3 + X/5 任务4 + X/3 任务5 + X/3 任务6 + X/5 任务7 = XX/33
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不删旧代码，加新逻辑** — `/api/auth/upgrade` 如果存在先留着不动（兼容），新逻辑走 `/api/user/deduct`
2. **webhook 不改 tier** — 旧版 webhook 改 tier 为 full，新版只加 credits，不改 tier
3. **前端 credits 从 /api/auth/me 获取** — 不写在 JWT 里（JWT 不会随扣减更新）
4. **禁止在 scan-sidebar.tsx 硬编码价格** — 价格只存在于 upgrade-modal 和 landing page
5. **Light 扫描已跑过的判断用 has_light_scan** — 数据库字段已存在，直接用
6. **扣减必须是原子操作** — `UPDATE SET credits = credits - 1 WHERE credits > 0` 防止并发超扣
7. **上线前必做**：在 Railway 设 ADMIN_EMAIL（用于管理后台）、LEMON_SQUEEZY_VARIANT_ID_FULL、LEMON_SQUEEZY_VARIANT_ID_PROBE
