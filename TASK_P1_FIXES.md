# TASK_P1_FIXES.md — P1 修复 + 快修合集
> 药老出品 · 2026-05-21
> 目标: 3个P1 + 1个P2快修
> 预计工时: 3h

## 任务概览

| # | 任务 | 文件 | 类型 |
|---|------|------|------|
| 1 | 扫描中取消机制 | scan/page.tsx + api.py | P1-5 |
| 2 | 模块间"下一步"引导 | scan-probe-report.tsx + scan-analyst-report.tsx | P1-7/P2-10 |
| 3 | Light/Full 入口统一 | scan/page.tsx + scan-result.tsx | P1-8 |
| 4 | 首页数字改文案 | landing page | P2-11 |

---

## P1-5: 扫描中取消机制

### 问题
用户发起扫描后无法中止，只能等超时或关页面。

### 修复方案
前端 AbortController + 后端取消标记。

### Step 1: 后端取消端点

api.py 新增：

```python
@app.post("/api/scan/{scan_id}/cancel")
async def cancel_scan(scan_id: str):
    task = scan_tasks.get(scan_id)
    if not task:
        raise HTTPException(status_code=404, detail="scan not found")
    if task["status"] == "running":
        scan_tasks.update(scan_id, status="cancelled", progress="扫描已取消")
    return {"status": "cancelled"}
```

### Step 2: 后端扫描循环中检查取消

在 _run_scan_task() 的每个阶段（probe 调用后、analyst 调用前、doctor 调用前）插入检查：

```python
# 每个 Agent 调用前
if scan_tasks.get(scan_id, {}).get("status") == "cancelled":
    scan_tasks.update(scan_id, progress="扫描已被用户取消")
    return
```

### Step 3: 前端 AbortController

scan/page.tsx:

```typescript
// 新增 ref
const abortRef = useRef<AbortController | null>(null);

// startScan() 中创建
const controller = new AbortController();
abortRef.current = controller;

// fetch 调用加上 signal
await fetch(`${API_BASE}/api/scan`, {
    method: "POST",
    signal: controller.signal,
    ...
});
```

### Step 4: 取消按钮

scan-loading 组件中加"取消扫描"按钮：

```tsx
<button
    onClick={() => {
        if (abortRef.current) abortRef.current.abort();
        // 同时调后端 cancel 端点
        fetch(`${API_BASE}/api/scan/${scanId}/cancel`, { method: "POST" });
    }}
    className="px-4 py-1.5 text-xs rounded-lg"
    style={{ color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
>
    取消扫描
</button>
```

### 验证
- 扫描中点击"取消扫描"→ 扫描停止
- 后端状态变为 cancelled
- 页面回到 input form

---

## P1-7 / P2-10: 模块间"下一步"引导

### 问题
Probe 报告看完没有"看诊断"引导，Analyst 看完没有"看处方"引导。用户旅程断裂。

### 修复
在每个报告页底部加 CTA 按钮。

### Step 1: Probe 报告 → Analyst

`scan-probe-report.tsx`，在 Section6 之后、SectionCTA 之前：

```tsx
{mode === "full" && tier !== "free" && hasAnalystData && (
    <div className="text-center py-6">
        <button
            onClick={onViewAnalyst}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold
                       transition-all hover:brightness-110"
            style={{
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.25)",
                color: "#3B82F6",
            }}
        >
            查看诊断报告 → Analyst
        </button>
    </div>
)}
```

Props 新增 `onViewAnalyst?: () => void`。

### Step 2: Analyst 报告 → Doctor

`scan-analyst-report.tsx`，在所有模块渲染完后：

```tsx
<div className="text-center py-6">
    <button
        onClick={onViewDoctor}
        className="px-6 py-2.5 rounded-lg text-sm font-semibold
                   transition-all hover:brightness-110"
        style={{
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.25)",
            color: "#22C55E",
        }}
    >
        获取执行处方 → Doctor
    </button>
</div>
```

Props 中已有 `onViewDoctor`，不新增。

### Step 3: scan/page.tsx 传递回调

在渲染 ScanReport 处传入 `onViewAnalyst`：

```tsx
<ScanReport
    ...
    onViewAnalyst={() => {
        setAnalystPhase("briefing");
        setStep("analyst");
    }}
/>
```

### 验证
- Full scan 完成后，Probe 报告底部出现"查看诊断报告 →"
- 点击进入 Analyst briefing
- Analyst 报告底部出现"获取执行处方 →"
- 点击进入 Doctor briefing

---

## P1-8: Light/Full 入口统一

### 问题
Light 扫描走聊天对话流，Full 扫描走 briefing 表单，两套入口割裂。

### 修复
Light 扫描完成后，在结果页底部加"升级完整扫描"按钮，点击进入 Probe briefing 并预填 Light 已收集的品牌信息。

### Step 1: scan-result.tsx 底部加 CTA

在 Light 结果页（scan-result.tsx 或 scan-dashboard.tsx 的 Light 模式部分）：

```tsx
{mode === "light" && (
    <div className="text-center py-6">
        <p className="text-xs mb-3" style={{ color: T.muted }}>
            当前为快速体检（15条行业查询词）。完整侦察包括30条查询词 +
            品牌画像 + 竞品对比 + 多引擎验证
        </p>
        <button
            onClick={onUpgradeToFull}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold
                       transition-all hover:brightness-110"
            style={{ background: T.accent, color: "#08080D" }}
        >
            升级完整扫描
        </button>
    </div>
)}
```

### Step 2: scan/page.tsx 实现 onUpgradeToFull

```typescript
function handleUpgradeToFull() {
    if (tier === "free") {
        setUpgradeFeature("probe");
        setShowUpgrade(true);
        return;
    }
    // 从 data 中提取已收集的品牌信息，预填 briefing
    const probe = data?.probe || {};
    setBriefingDefaults({
        domain: scanDomain,
        brandName: scanBrandName,
        industry: probe.company_score?.industry
                  || probe.brand_profile?.inferred_industry || "",
        targetMarket: probe.brand_profile?.inferred_target_market || "",
        coreProduct: probe.brand_profile?.inferred_core_product || "",
        competitorMentions: probe.competitor_mentions || [],
    });
    setProbePhase("briefing");
    setStep("probe");
}
```

### Step 3: 数据预填

ProbeBriefing 组件接收 `defaults` prop 时自动填充对应字段。确认 briefing 组件已支持 `domain` / `brandName` / `industry` / `targetMarket` / `coreProduct` 等预填值。

### 验证
- Light 扫描完成后底部出现"升级完整扫描"
- Free 用户点击 → 弹出升级弹窗
- Full 用户点击 → 进入 Probe briefing，行业/市场/产品 已预填
- Briefing 确认后 → Full Probe 扫描启动

---

## P2-11: 首页 "0学术论文支撑" 改文案

### 问题
首页 social proof section 四项全是 0，降低可信度。

### 修复
把数值改成定性描述。

### 文件
landing page（首页组件）

### 改动

找到 4 个 NumberCard 或计数展示：

```tsx
// 当前（推测）:
<NumberCard number={0} label="学术论文支撑" />
<NumberCard number={0} label="AI引擎覆盖" />
<NumberCard number={0} label="分析推理规则" />
<NumberCard number={0} label="大类查询体系" />

// 改为：
<StatCard icon={...} label="方法论" value="基于 GEO 学术研究" />
<StatCard icon={...} label="引擎覆盖" value="ChatGPT / Gemini / Claude" />
<StatCard icon={...} label="诊断规则" value="14条分析规则" />
<StatCard icon={...} label="查询体系" value="A/B/C 三类查询词" />
```

数字展示改为文字标签，去掉计数器的动画效果。

如果组件是 NumberCard 类型，改为 Badge/TextCard 类型。字体用 `font-mono text-xs`，颜色 `#9A9AB0`。

### 验证
- 首页不再显示 0
- 四个卡片改为文字标签
- 响应式不崩

---

## CHECKLIST 自检

### P1-5 取消机制
- [ ] POST /api/scan/{id}/cancel 端点正常
- [ ] 扫描循环中检查取消标记
- [ ] 前端 AbortController 正确创建和销毁
- [ ] "取消扫描"按钮可见且可点击
- [ ] 取消后回到 input form

### P1-7/P2-10 下一步引导
- [ ] Probe 报告底部有"查看诊断 → Analyst"
- [ ] Analyst 报告底部有"获取处方 → Doctor"
- [ ] 点击正确跳转（setStep + setPhase）
- [ ] Free 用户不显示（或被升级弹窗拦截）

### P1-8 入口统一
- [ ] Light 结果页底部有"升级完整扫描"
- [ ] Free 用户点击 → 升级弹窗
- [ ] Full 用户点击 → briefing 页，字段预填
- [ ] 预填字段准确（行业、市场、产品）

### P2-11 首页文案
- [ ] 四个计数数字全部替换为文字标签
- [ ] 移除数字动画
- [ ] 响应式布局不变

---

## 不需要改的文件
- scan-chat.tsx
- scan-sidebar.tsx
- probe_node.py
- analyst_node.py
- doctor_node.py
