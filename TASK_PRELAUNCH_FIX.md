# TASK_PRELAUNCH_FIX.md — 上线前紧急修复

> 药老出品 · 2026-05-22
> 目标: 修 3 个上线阻塞问题，让产品能部署
> 预计工时: 1h

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | Landing Page 恢复 | `frontend/app/(marketing)/layout.tsx` `page.tsx` | 5min |
| 2 | 仪表盘数据不显示 | `frontend/components/scan-dashboard.tsx` | 5min |
| 3 | Framer Motion 动画告警 | `scan-sidebar.tsx` `scan-chat.tsx` | 15min |

**完成标准**: 
- Landing Page 刷新仍然正常显示（不再依赖 .next 缓存）
- 仪表盘综合评分、引用率等数字从 0 变成真实数据
- 浏览器 console 不再刷屏 "transparent is not an animatable value"

---

## 任务1: Landing Page 恢复

### 问题
`(marketing)/page.tsx` 和 `(marketing)/layout.tsx` 被改成了 `.bak` 后缀。当前 landing page 靠 `.next` 编译缓存活着——一旦清缓存或重新编译，首页会 404。

### 需要改的文件
```
frontend/app/(marketing)/layout.tsx.bak → 去掉 .bak
frontend/app/(marketing)/page.tsx.bak   → 去掉 .bak
```

### 实现要求
两个文件内容不需要改，只去掉 `.bak` 后缀：

```bash
cd frontend/app/\(marketing\)
mv layout.tsx.bak layout.tsx
mv page.tsx.bak page.tsx
```

### 验证方法
1. `rm -rf frontend/.next` 
2. `cd frontend && npm run dev`
3. 浏览器打开 http://localhost:3000 → 应该看到完整的 landing page
4. 确认 Hero 区域有 "AI 搜索时代 你的品牌被引用了吗？" 标题

---

## 任务2: 仪表盘数据映射修复

### 问题
仪表盘显示综合评分 0/100、引用率 0%，但 `/api/probe` 返回的数据里这些值都有（如 `company_score.overall: 61`）。根因：dashboard 读 `data.probe`，但 API 返回的是平铺结构（没有 `probe` 包裹层）。

### 需要改的文件
```
frontend/components/scan-dashboard.tsx
```

### 实现要求
**只改一行。** 第 752 行：

```typescript
// 改前（数据读不到，probe 是空对象 {}）：
const probe = data?.probe || {};

// 改后（有 probe 包裹层用包裹层，没有就用 data 本身）：
const probe = data?.probe || data || {};
```

这会修复所有 19 处 `probe?.xxx` 的数据读取（company_score、citation_metrics、competitor_mentions 等全部生效）。

### 验证方法
1. 登录 → 跑一次 Light 扫描（或确保 localStorage 有 `cf_scan_result_*` 数据）
2. 打开仪表盘 → 综合评分应该显示真实数字（如 61/100），不再是 0/100
3. 引用率分析应该显示真实百分比，不再是 0%

---

## 任务3: Framer Motion 动画告警修复

### 问题
浏览器 console 刷屏 34 条 warning：
```
You are trying to animate background from "rgba(0,0,0,0)..." to "transparent".
"transparent" is not an animatable value.
```
根因：Framer Motion 的 `whileHover` / `onMouseEnter` / `onMouseLeave` 里用了 CSS 字符串 `"transparent"`，FM 无法对它做动画插值。

### 需要改的文件
```
frontend/components/scan-sidebar.tsx
frontend/components/scan-chat.tsx
```

### 实现要求
把 Framer Motion 动画相关的 `"transparent"` 替换为 `"rgba(56,189,248,0)"`。**只改 onMouseEnter/onMouseLeave 里的 background 值，不要改 CSS gradient 里的 transparent（gradient 不经过 FM 动画）。**

**scan-sidebar.tsx 要改的位置：**

```typescript
// Line 726: onMouseEnter 的 background
// 改前: style={{ background: "transparent" }}
// 改后: style={{ background: "rgba(56,189,248,0)" }}

// Line 728: onMouseLeave 的 background  
// 改前: e.currentTarget.style.background = "transparent";
// 改后: e.currentTarget.style.background = "rgba(56,189,248,0)";
```

**scan-chat.tsx 要改的位置：**

```typescript
// Line 550: onMouseEnter
// 改前: style={{ background: "transparent", ... }}
// 改后: style={{ background: "rgba(56,189,248,0)", ... }}

// Line 552: onMouseLeave
// 改前: e.currentTarget.style.background = "transparent";
// 改后: e.currentTarget.style.background = "rgba(56,189,248,0)";

// Line 641: onMouseEnter
// 改前: style={{ background: "transparent", ... }}
// 改后: style={{ background: "rgba(56,189,248,0)", ... }}

// Line 643: onMouseLeave
// 改前: e.currentTarget.style.background = "transparent";
// 改后: e.currentTarget.style.background = "rgba(56,189,248,0)";
```

**不要改的（这些是 CSS gradient / fill，不是 FM 动画目标）：**
- `linear-gradient(... transparent ...)` — 不改
- `radial-gradient(... transparent ...)` — 不改
- `fill="transparent"` (SVG) — 不改

### 验证方法
1. 打开浏览器 console
2. 登录进入 /scan 页面
3. 鼠标 hover 侧边栏各项 → console 不再出现 "transparent is not an animatable value" warning
4. 鼠标在聊天界面 hover 按钮 → 同上

---

## 不需要改的文件（明确列出）
- `scan-dashboard.tsx` — 除了第 752 行，其他都不动
- `scan-probe-report.tsx` — 有很多 transparent 但是 gradient 里的，不需要改
- `distant-earth.tsx` — 纯 CSS gradient，不涉及 FM 动画
- `scan-result.tsx` — 同上
- `upgrade-modal.tsx` — 同上
- `page.tsx` — 不改

---

## CHECKLIST 自检

**任务1 Landing Page:**
- [ ] `.bak` 后缀已去除
- [ ] 删除 `.next` 后重新 `npm run dev` 首页正常显示
- [ ] `git status` 确认两个文件已恢复为 `.tsx`

**任务2 仪表盘:**
- [ ] scan-dashboard.tsx 第 752 行已改为 `data?.probe || data || {}`
- [ ] 综合评分不再显示 0/100
- [ ] 引用率不再显示 0%

**任务3 告警:**
- [ ] scan-sidebar.tsx 的 onMouseEnter/onMouseLeave 里 background 不再用 "transparent"
- [ ] scan-chat.tsx 的 onMouseEnter/onMouseLeave 里 background 不再用 "transparent"
- [ ] 浏览器 console FM warning 消失（或大幅减少）
- [ ] gradient 和 SVG fill 里的 transparent 没有被误改

---

## 交付格式

```
自检结果: X/3 任务1 + X/4 任务2 + X/4 任务3 = XX/11
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项
1. 任务2只改一行，不要动 dashboard 其他逻辑
2. 任务3只改 onMouseEnter/onMouseLeave 里的 background，gradient 和 SVG 不动
3. 改完后跑 `git diff` 确认改动范围符合预期
