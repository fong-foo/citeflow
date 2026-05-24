# TASK_MEMORY.md — 扫描结果持久化修复

> 药老出品 · 2026-05-23
> 目标: 登录用户跑完流程后，数据不丢失
> 预计工时: 2h

---

## 任务概览

| 任务 | 文件 | 内容 | 优先级 |
|------|------|------|--------|
| 1 | `page.tsx` | 服务端恢复时补设 doctorPhase | **P0** |
| 2 | `page.tsx` | localStorage 恢复时补设 doctorPhase | **P0** |
| 3 | `page.tsx` | 服务端恢复时同步写 localStorage（兜底） | P1 |
| 4 | `page.tsx` | 清理退出登录时的残留状态 | P1 |

---

## 任务 1: 服务端恢复补设 Doctor 阶段

### 问题
`loadFromServer()` 从 `/api/scans` 和 `/api/scan/{id}/result` 恢复了全部数据（包括处方），但忘了设 `doctorPhase`。Doctor 始终显示"briefing"状态。

### 需要改的文件
`/Users/fogn/Desktop/CiteFlow/frontend/app/(app)/scan/page.tsx`

### 实现要求
在 `loadFromServer()` 函数的第 210 行（`setAnalystPhase("report")` 之后）增加：

```typescript
// 位置：约第 210 行，setAnalystPhase 那行之后
if (result?.prescription && result.prescription.length > 0) {
  setDoctorPhase("report");
}
```

### 验证方法
1. 注册账号 → 跑完整 Probe 扫描（等 Doctor 处方生成完）
2. 关闭浏览器标签页
3. 重新打开 → 登录
4. 预期：自动进入 dashboard，点侧边栏 Doctor 按钮 → 直接看到处方报告，不是 briefing

---

## 任务 2: localStorage 恢复补设 Doctor 阶段

### 问题
从 localStorage fallback 恢复时同样没设 doctorPhase。

### 需要改的文件
同上文件，`tryRestore()` 函数内部

### 实现要求
在 `tryRestore()` 中，约第 239 行（`setAnalystPhase("report")` 之后）增加：

```typescript
// 位置：紧跟在 setAnalystPhase 那行之后
if (parsed.data?.prescription && parsed.data.prescription.length > 0) {
  setDoctorPhase("report");
}
```

### 验证方法
1. 跑完完整扫描（不登录也行，但任务 3 要求登录）
2. 刷新页面（不要退出登录）
3. 预期：数据恢复，点 Doctor 直接看到处方

---

## 任务 3: 服务端恢复后同步写 localStorage

### 问题
`loadFromServer()` 只设了内存状态，没写 localStorage。如果后续网络断了或后端挂了，localStorage 作为离线兜底是空的。

### 需要改的文件
同上文件，`loadFromServer()` 函数末尾

### 实现要求
在 `loadFromServer()` return true 之前，增加：

```typescript
// 同步写 localStorage 作为离线兜底
const saveMode = latest.mode;
try {
  localStorage.setItem(
    userKey(scanResultKey(saveMode)),
    JSON.stringify({
      data: result,
      mode: latest.mode,
      domain: latest.domain,
      brandName: latest.brand_name,
      timestamp: Date.now(),
    })
  );
} catch {}
```

### 验证方法
1. 跑完扫描 → 关闭浏览器 → 重新打开 → 登录
2. 打开 DevTools → Application → Local Storage
3. 检查 `cf_scan_result_full_<user_id>` 有数据

---

## 任务 4: 登出时保留报告历史

### 问题
`clearUserData()` 在 `storage.ts` 第 54 行清掉了 `cf_token` 和 `cf_user`，导致 `userKey()` 失忆——即使 localStorage 里还有 `cf_scan_result_full_<uid>`，`getUserId()` 返回空，永远匹配不到。

### 不需要改
当前设计是：登出后 `cf_user` 被删 → `getUserId()` 返回空 → 所有 `userKey()` 变成不带后缀的 key → 找不到数据。

**这个不改。** 游景峰说了必须有账号才能用。登出后看不到之前数据是正确的行为——重新登录后会从服务端恢复。

---

## 不需要改的文件

- `api.py` — 后端已有 `scan_results` 表和完整写入逻辑，无需改动
- `auth_db.py` — 数据库 schema 无需改动
- `storage.ts` — `clearUserData()` 行为正确，无需改动
- 所有 Doctor/Analyst/Probe 组件 — 不改

---

## CHECKLIST 自检

- [ ] 任务 1: `loadFromServer()` 加了 `setDoctorPhase("report")`
- [ ] 任务 2: `tryRestore()` 加了 `setDoctorPhase("report")`
- [ ] 任务 3: `loadFromServer()` 加了 localStorage 同步写入
- [ ] 代码风格与现有完全一致（inline style, 同缩进, 无 console.log）
- [ ] 没有改动任何组件文件
- [ ] 没有改动后端代码
- [ ] `npm run build` 通过

---

## 注意事项

1. **不要改 `clearUserData()`** — 登出清数据是正确的
2. **不要加"匿名用户"逻辑** — 产品决策：必须注册
3. **不要动 Doctor 组件** — 问题在恢复逻辑，不在组件
4. **`setDoctorPhase` 是 page.tsx 的 state setter**，不需要 import
5. **判断 doctorData 存在用 `result?.prescription?.length > 0`**，不加 `hasDoctorData` 变量（那个是组件 render 时算的，恢复时用原始数据判断更安全）
