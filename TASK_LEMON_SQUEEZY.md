# TASK_LEMON_SQUEEZY.md — Lemon Squeezy 支付接入

> 药老出品 · 2026-05-24
> 目标: 用户点击升级 → Lemon Squeezy 付款 → 自动升级 tier
> 预计工时: 3h（前后端）

---

## 任务概览

| # | 任务 | 文件 | 类型 |
|---|------|------|------|
| 1 | Lemon Squeezy 环境变量 | .env / .env.example / .env.prod.example | 配置 |
| 2 | 后端支付接口 `/api/pay/checkout` | api.py | 新增 |
| 3 | 后端 Webhook `/api/webhook/lemon-squeezy` | api.py | 新增 |
| 4 | 前端 checkout 按钮替换 upgrade 逻辑 | upgrade-modal.tsx + page.tsx | 修改 |
| 5 | 支付成功回调页 | frontend/app/(app)/pay/success/page.tsx | 新增 |

---

## Lemon Squeezy 集成原理

```
用户点击升级
  → 前端 POST /api/pay/checkout (带 JWT token)
  → 后端调 Lemon Squeezy API 创建 checkout
  → 返回 checkout URL
  → 前端 redirect 到 Lemon Squeezy 付款页
  → 用户付完 → Lemon Squeezy 重定向回我们的成功页
  → 同时 Lemon Squeezy 发 webhook 到 /api/webhook/lemon-squeezy
  → 后端验证签名 → 升级用户 tier → 返回 200
```

**不需要处理支付安全** — Lemon Squeezy 处理信用卡/支付宝/微信/税务。

---

## 任务 1: 环境变量

### 需要改的文件
- `/Users/fogn/Desktop/CiteFlow/.env.example`
- `/Users/fogn/Desktop/CiteFlow/.env`（本地）
- `/Users/fogn/Desktop/CiteFlow/.env.prod.example`

### 实现要求

在 .env.example 末尾添加：

```env
# Lemon Squeezy 支付
LEMON_SQUEEZY_API_KEY=your_api_key_here
LEMON_SQUEEZY_STORE_ID=your_store_id
LEMON_SQUEEZY_VARIANT_ID=your_variant_id  # ¥100 专业版
LEMON_SQUEEZY_WEBHOOK_SECRET=your_webhook_secret
```

本地 .env 先填空值，生产环境 Railway 设真实值。

**注册 Lemon Squeezy 后获取这些值：**
1. API Key: Settings → API → Generate
2. Store ID: Settings → Store → ID
3. Variant ID: Products → 创建产品 "CiteFlow 专业版 ¥100" → Variants → ID
4. Webhook Secret: Settings → Webhooks → 创建 webhook（URL 填 `https://api.citeflow.cn/api/webhook/lemon-squeezy`，事件选 `order_created`）→ 生成 Secret

---

## 任务 2: 后端支付接口 `POST /api/pay/checkout`

### 需要改的文件
- `/Users/fogn/Desktop/CiteFlow/api.py`

### 实现要求

```python
# 在 api.py 顶部添加 import
import httpx  # pip install httpx 或已安装

# 新增端点
@app.post("/api/pay/checkout")
async def create_checkout(request: Request):
    """创建 Lemon Squeezy checkout。前端 POST 后 redirect 到返回的 URL。"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=401)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload["user_id"]
    except Exception:
        raise HTTPException(status_code=401)

    variant_id = os.environ.get("LEMON_SQUEEZY_VARIANT_ID", "")
    api_key = os.environ.get("LEMON_SQUEEZY_API_KEY", "")
    store_id = os.environ.get("LEMON_SQUEEZY_STORE_ID", "")

    if not variant_id or not api_key or not store_id:
        raise HTTPException(status_code=500, detail="Lemon Squeezy 未配置")

    success_url = os.environ.get("FRONTEND_URL", "http://localhost:3000") + "/pay/success"

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
                            "custom": {"user_id": user_id}
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
            logger.error(f"Lemon Squeezy checkout failed: {resp.status_code} {resp.text}")
            raise HTTPException(status_code=502, detail="支付服务暂不可用")

        data = resp.json()
        checkout_url = data["data"]["attributes"]["url"]
        return {"url": checkout_url}
```

### 验证方法
```bash
# 本地测试（需先设 LE env vars）
curl -X POST http://localhost:8000/api/pay/checkout \
  -H "Authorization: Bearer $(你的JWT_TOKEN)" \
  | python3 -m json.tool
# 应返回 {"url": "https://store.lemonsqueezy.com/checkout/..."}
```

---

## 任务 3: 后端 Webhook `POST /api/webhook/lemon-squeezy`

### 需要改的文件
- `/Users/fogn/Desktop/CiteFlow/api.py`

### 实现要求

```python
import hmac
import hashlib

# 新增端点（放在 /api/pay/checkout 后面）
@app.post("/api/webhook/lemon-squeezy")
async def lemon_squeezy_webhook(request: Request):
    """接收 Lemon Squeezy 支付成功通知，自动升级用户 tier。"""
    secret = os.environ.get("LEMON_SQUEEZY_WEBHOOK_SECRET", "")
    if not secret:
        logger.error("LEMON_SQUEEZY_WEBHOOK_SECRET not set")
        raise HTTPException(status_code=500)

    raw_body = await request.body()
    signature = request.headers.get("X-Signature", "")

    # 验证 HMAC 签名
    if secret:
        expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            logger.warning("Lemon Squeezy webhook: invalid signature")
            raise HTTPException(status_code=403)

    try:
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400)

    event_name = payload.get("meta", {}).get("event_name", "")
    if event_name != "order_created":
        return {"status": "ignored", "event": event_name}

    # 提取 user_id（存在 custom_data 里）
    custom = (
        payload.get("data", {})
        .get("attributes", {})
        .get("checkout_data", {})
        .get("custom", {})
    )
    user_id = custom.get("user_id", "")

    if not user_id:
        logger.warning("Lemon Squeezy webhook: no user_id in custom data")
        return {"status": "no_user_id"}

    # 升级用户 tier 为 full
    db = get_db()
    user = db.execute("SELECT id, email FROM users WHERE id = ?", (user_id,)).fetchone()
    if user:
        db.execute("UPDATE users SET tier = 'full' WHERE id = ?", (user_id,))
        db.commit()

        # 签发新 JWT（含 tier=full）
        new_token = jwt.encode(
            {"user_id": user["id"], "email": user["email"], "tier": "full"},
            SECRET_KEY, algorithm="HS256"
        )
        logger.info(f"User {user_id} upgraded to full via Lemon Squeezy")
        return {"status": "upgraded"}

    logger.warning(f"Lemon Squeezy webhook: user {user_id} not found")
    return {"status": "user_not_found"}
```

### 验证方法
```bash
# 本地测试（需先获得真实的 webhook payload，在 Lemon Squeezy dashboard 里点 "Test webhook"）
# 看后端日志是否打印 "User xxx upgraded to full via Lemon Squeezy"
```

---

## 任务 4: 前端 checkout 流程

### 需要改的文件
- `/Users/fogn/Desktop/CiteFlow/frontend/components/upgrade-modal.tsx`
- `/Users/fogn/Desktop/CiteFlow/frontend/app/(app)/scan/page.tsx`

### 实现要求

**upgrade-modal.tsx 改动：**

```typescript
// handleUpgradeConfirm 改为跳转 checkout
async function handleUpgrade() {
  const token = localStorage.getItem("cf_token");
  if (!token) { alert("请先登录"); return; }

  try {
    const res = await fetch(`${API_BASE}/api/pay/checkout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url; // 跳 Lemon Squeezy 付款页
    } else {
      alert("支付服务暂不可用，请稍后重试");
    }
  } catch {
    alert("网络错误，请稍后重试");
  }
}
```

按钮的 `onClick` 从 `onUpgrade()` 改为 `handleUpgrade()`。

**page.tsx 改动：**

删除 `handleUpgradeConfirm` 函数（不再需要前后端协同升级逻辑），因为升级现在走 webhook。

但保留 `showUpgrade` 状态和弹窗 UI — 只是弹窗的"升级"按钮跳 checkout 而不是调本地 API。

简化后的 handleUpgradeConfirm：

```typescript
async function handleUpgradeConfirm() {
  setShowUpgrade(false);
  const token = localStorage.getItem("cf_token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/api/pay/checkout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  } catch {}
}
```

### 验证方法
1. 登录体检中心 → 点击侧边栏锁定的 Analyst → 弹升级弹窗
2. 点击"升级解锁"按钮 → 应跳转 Lemon Squeezy checkout 页
3. （生产环境）用测试卡 4242... 付完 → 回到 /pay/success

---

## 任务 5: 支付成功回调页

### 需要改的文件
- `frontend/app/(app)/pay/success/page.tsx`（新建）

### 实现要求

简单页面，显示"支付成功，正在升级..."，然后 3 秒后跳转到体检中心。

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaySuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // 清除旧 tier 缓存，让页面重新加载时从 localStorage/JWT 读新 tier
    const timer = setTimeout(() => {
      router.push("/scan");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0F",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16
    }}>
      <div style={{ fontSize: 48 }}>✅</div>
      <h1 style={{ color: "#EDEDF5", fontSize: 24, fontWeight: 600 }}>支付成功</h1>
      <p style={{ color: "#9A9AB0", fontSize: 14 }}>正在升级你的账户，即将跳转...</p>
    </div>
  );
}
```

### 验证方法
- 浏览器访问 `http://localhost:3000/pay/success` → 显示成功页 → 3 秒后跳 /scan

---

## 不需要改的文件

- `auth.py` / `auth_db.py` — tier 升级现在通过 webhook + SQL UPDATE 完成
- `lib/storage.ts` — Tier 类型已是 `free | full`
- 其他前端组件

---

## 部署后配置

1. 在 Railway 设环境变量：LEMON_SQUEEZY_API_KEY / STORE_ID / VARIANT_ID / WEBHOOK_SECRET
2. 在 Lemon Squeezy Dashboard 创建 Webhook：URL = `https://api.citeflow.cn/api/webhook/lemon-squeezy`，事件 = `order_created`
3. 测试一次完整支付流程（用 Lemon Squeezy 测试模式）

---

## CHECKLIST 自检

- [ ] `POST /api/pay/checkout` 返回 checkout URL
- [ ] `POST /api/webhook/lemon-squeezy` 验证 HMAC 签名
- [ ] Webhook 收到 `order_created` 后升级用户 tier 为 full
- [ ] 前端按钮跳 Lemon Squeezy checkout（不是弹 alert）
- [ ] 支付成功页 /pay/success 显示并跳转
- [ ] .env.example 包含所有 LE 环境变量
- [ ] 浏览器 console 无红色报错
