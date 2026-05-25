# TASK_CREDITS_FIX.md — 侧边栏 credits 判断 + light-scan-done 补漏

> 药老出品 · 2026-05-25
> 目标：侧边栏用 credits 判断锁定状态，付费用户能进 Analyst/Doctor
> 预计工时：1h

---

## 问题

TASK_CREDITS_PAYMENT 里 webhook 只加 `scan_credits`/`probe_credits`，不再改 `tier`。但侧边栏仍用 `tier === "free"` 判断锁定——付费用户 tier 仍是 "free"，侧边栏把所有付费功能锁了。

---

## 任务1: 侧边栏改为 credits 判断

### 需要改的文件
- `frontend/components/scan-sidebar.tsx`
- `frontend/app/(app)/scan/page.tsx`

### 1a. scan-sidebar.tsx

**Props 接口加字段**（约第 103 行）：

```typescript
interface SidebarProps {
  // ...现有字段...
  scanCredits: number;   // 新增
  probeCredits: number;  // 新增
  // ...其余不变...
}
```

**getButtonStatus 函数**（约第 196-217 行），把 `tier === "free"` 改为 credits 判断：

```typescript
// 改前：
if (stepId === "probe") {
  if (tier === "free") return "locked";
  ...
}
if (stepId === "analyst") {
  if (tier === "free") return "locked";
  ...
}
if (stepId === "doctor") {
  if (tier === "free") return "locked";
  ...
}

// 改后：
const hasFullAccess = scanCredits > 0 || probeCredits > 0 || tier !== "free";

if (stepId === "probe") {
  if (!hasFullAccess) return "locked";
  ...
}
if (stepId === "analyst") {
  if (scanCredits === 0) return "locked";  // Analyst 只能用完整套餐
  ...
}
if (stepId === "doctor") {
  if (scanCredits === 0) return "locked";  // Doctor 只能用完整套餐
  ...
}
```

**点击回调**（约第 236-244 行），同样改判断：

```typescript
// 改前：
if (tier === "free") { onUpgradeClick("analyst"); return; }
if (tier !== "full") { onUpgradeClick("analyst"); return; }

// 改后：
if (scanCredits === 0) { onUpgradeClick("analyst"); return; }
// doctor 同理
if (scanCredits === 0) { onUpgradeClick("doctor"); return; }
```

### 1b. page.tsx

找到 sidebar 渲染处（约第 1260 行），传新 props：

```typescript
<ScanSidebar
  // ...现有 props...
  scanCredits={scanCredits}
  probeCredits={probeCredits}
/>
```

### 验证方法
1. 登录 → localStorage 设 `cf_user.tier = "free"`, scanCredits=2
2. 侧边栏 Analyst/Doctor 应显示"可用"而非"锁定"
3. 点 Analyst → 应进 briefing，不弹升级弹窗
4. scanCredits=0 时 → Analyst/Doctor 应锁，Probe 也锁（probeCredits=0 时）

---

## 任务2: 补 /api/auth/light-scan-done 端点

### 需要改的文件
`/Users/fogn/Desktop/CiteFlow/api.py`

### 实现要求

在 `/api/auth/upgrade` 附近加：

```python
@app.post("/api/auth/light-scan-done")
async def mark_light_scan_done(user: dict = Depends(get_current_user)):
    """标记用户已完成 Light 扫描。"""
    from auth_db import set_has_light_scan
    email = user["email"]
    set_has_light_scan(email)
    return {"ok": True}
```

### 验证方法
```bash
curl -X POST http://localhost:8000/api/auth/light-scan-done \
  -H "Authorization: Bearer <token>"
# 应返回 {"ok": true}
```

---

## 不需要改的文件
- `auth_db.py` — 不变
- `upgrade-modal.tsx` — 不变
- `landing.html` — 不变

---

## CHECKLIST 自检

**任务1:**
- [ ] 侧边栏 Props 含 scanCredits/probeCredits
- [ ] probe 按钮：tier!==free 或 credits>0 → 不锁
- [ ] analyst 按钮：scanCredits>0 → 不锁
- [ ] doctor 按钮：scanCredits>0 → 不锁
- [ ] 点击回调用 scanCredits 判断而非 tier
- [ ] page.tsx 传 scanCredits/probeCredits 给 sidebar

**任务2:**
- [ ] POST /api/auth/light-scan-done 存在
- [ ] 需要 JWT 认证
- [ ] 调 set_has_light_scan

---

## 交付格式

```
自检结果: X/6 任务1 + X/3 任务2 = XX/9
失败项: (无 / 列出)
```
