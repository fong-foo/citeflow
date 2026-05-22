# TASK_P0_FIXES.md — P0 修复合集
> 药老出品 · 2026-05-21
> 目标: 修复 4 个 P0 级别的功能异常
> 预计工时: 4h

## 任务概览

| # | 任务 | 文件 | 严重度 |
|---|------|------|--------|
| 1 | 扫描结果持久化（SQLite） | api.py | 数据丢失 |
| 2 | 侧边栏无数据时给提示 | scan/page.tsx | 用户困惑 |
| 3 | 扫描中侧边栏不中断流程 | scan/page.tsx + scan-sidebar.tsx | 流程断裂 |
| 4 | Light 模式不渲染 Full 专属 Section | scan-probe-report.tsx | 误导数据 |

---

## P0-1: 扫描结果持久化

### 问题
ScanTaskStore 用 dict 内存存储，服务重启后所有扫描结果丢失。

### 修复方案
在 SQLite 中新增 scan_results 表，扫描完成时写入，页面加载时从 API 读取。

### Step 1: 数据库迁移

在 api.py 顶部（import sqlite3 之后，app 定义之后）添加：

```python
def _init_scan_db():
    conn = sqlite3.connect("citeflow.db")
    conn.execute(
        "CREATE TABLE IF NOT EXISTS scan_results ("
        "id TEXT PRIMARY KEY, "
        "user_id INTEGER NOT NULL, "
        "domain TEXT NOT NULL, "
        "brand_name TEXT NOT NULL, "
        "mode TEXT NOT NULL DEFAULT 'light', "
        "result_json TEXT NOT NULL, "
        "created_at TEXT NOT NULL DEFAULT (datetime('now')), "
        "FOREIGN KEY (user_id) REFERENCES users(id)"
        ")"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_scan_results_user "
        "ON scan_results(user_id, created_at DESC)"
    )
    conn.commit()
    conn.close()

_init_scan_db()
```

### Step 2: 扫描完成时写入

在 _run_scan_task() 中，update(scan_id, status="done", result=result) 之后追加：

```python
try:
    conn = sqlite3.connect("citeflow.db")
    conn.execute(
        "INSERT INTO scan_results (id, user_id, domain, brand_name, mode, result_json) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (scan_id, current_user["user_id"],
         state["user_input"]["domain"],
         state["user_input"].get("brand_name", ""),
         mode,
         json.dumps(result, ensure_ascii=False))
    )
    conn.commit()
    conn.close()
except Exception as e:
    logger.warning(f"scan_results write failed: {e}")
```

### Step 3: API 端点

新增两个端点：

```python
@app.get("/api/scans")
async def get_scans(current_user: dict = Depends(get_current_user)):
    """返回当前用户的扫描历史列表（最近20条）"""
    conn = sqlite3.connect("citeflow.db")
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT id, domain, brand_name, mode, created_at "
        "FROM scan_results WHERE user_id = ? "
        "ORDER BY created_at DESC LIMIT 20",
        (current_user["user_id"],)
    ).fetchall()
    conn.close()
    return {"scans": [dict(r) for r in rows]}


@app.get("/api/scan/{scan_id}/result")
async def get_scan_result(scan_id: str):
    """返回某次扫描的完整结果 JSON"""
    conn = sqlite3.connect("citeflow.db")
    row = conn.execute(
        "SELECT result_json FROM scan_results WHERE id = ?",
        (scan_id,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="scan not found")
    return json.loads(row[0])
```

### Step 4: 前端加载历史

修改 scan/page.tsx 的初始化 useEffect。

在原有 localStorage 恢复逻辑之前，追加从服务端加载：

```typescript
useEffect(() => {
  async function loadFromServer() {
    try {
      const token = localStorage.getItem("cf_token");
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/scans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.scans || data.scans.length === 0) return;

      const latest = data.scans[0];
      const detailRes = await fetch(
        `${API_BASE}/api/scan/${latest.id}/result`
      );
      if (!detailRes.ok) return;
      const result = await detailRes.json();

      setData(result);
      setScanDomain(latest.domain);
      setScanBrandName(latest.brand_name);
      setScanMode(latest.mode as ScanMode);
      setStep("dashboard");
      setInputPhase("report");
      if (latest.mode === "full") {
        setProbePhase("report");
        setScanTabIndex(2);
      }
      setLastScanTime(formatTime(new Date(latest.created_at).getTime()));
      return; // 跳过 localStorage fallback
    } catch {}
  }

  loadFromServer();
  // ... 原有 localStorage 恢复保留作为 fallback
}, []);
```

注意：需要用 `API_BASE` 替换硬编码 URL（已在文件顶部定义）。

### Step 5: 报告历史页面也读 API

报告历史页面当前只读 localStorage。同步修改读取逻辑：先从 GET /api/scans 加载，再与 localStorage 合并（去重）。

### 验证

```bash
# 1. 重启后端，确认表创建
sqlite3 citeflow.db ".schema scan_results"

# 2. 跑一次扫描
# 3. 检查数据库
sqlite3 citeflow.db "SELECT id, domain, mode, created_at FROM scan_results;"

# 4. 测试 API
curl http://localhost:8000/api/scans -H "Authorization: Bearer $TOKEN"

# 5. 重启后端 → 刷新前端页面 → 报告应自动恢复
```

---

## P0-2: 侧边栏无数据时给提示

### 问题
Probe/Analyst/Doctor/仪表盘 侧边栏点击后，无数据时全部静默跳回 input form。

### 修复
在 5 个 handler 中，无数据时弹出 alert 提示，不改变 step。

### 文件
`frontend/app/(app)/scan/page.tsx`

### 改动

```typescript
function handleSidebarHomeClick() {
    if (!data) { alert("请先完成一次品牌体检"); return; }
    setStep("dashboard");
}

function handleSidebarProbeClick() {
    if (!data) { alert("请先完成一次品牌体检"); return; }
    // ... 原有逻辑不变
}

function handleSidebarAnalystClick() {
    if (!data) { alert("请先完成一次品牌体检"); return; }
    // ... 原有逻辑不变
}

function handleSidebarDoctorClick() {
    if (!data) { alert("请先完成一次品牌体检"); return; }
    // ... 原有逻辑不变
}
```

不修改 handleSidebarInputClick（无数据时回 input form 是正确的）。

---

## P0-3: 扫描中侧边栏不中断流程

### 问题
扫描进行中点击侧边栏导航导致 UI 回退，后台扫描继续但用户无法恢复。

### 修复
增加 isScanning 状态，扫描中禁用侧边栏所有导航。

### Step 1: 新增状态变量

scan/page.tsx:

```typescript
// 现有 state 附近新增
const [isScanning, setIsScanning] = useState(false);
```

### Step 2: 扫描生命周期中设置和清除

```typescript
// startScan() 开头
setIsScanning(true);
setPendingScan({ domain: scanDomain, brandName: scanBrandName, ... });

// handleScanFinish() 中
setIsScanning(false);

// handleError() 中
setIsScanning(false);

// 超时回调中（在 setTimeout 到达前）
setIsScanning(false);
```

### Step 3: 侧边栏 handler 加保护

在所有 handler 开头（!data 检查之前）加：

```typescript
if (isScanning) {
    alert("扫描进行中，请等待完成");
    return;
}
```

### Step 4: ScanSidebar 接收 disabled prop

scan-sidebar.tsx Props 接口新增：

```typescript
interface Props {
    // ... 原有字段
    disabled?: boolean;
}
```

所有可点击元素的 onClick 中检查：

```typescript
onClick={() => {
    if (disabled) return;
    onXxxClick();
}}
```

disabled 时样式：opacity: 0.3, cursor: not-allowed。

### Step 5: 传入 disabled

scan/page.tsx 渲染 ScanSidebar 处：

```tsx
<ScanSidebar
    ...
    disabled={isScanning}
    ...
/>
```

---

## P0-4: Light 模式不渲染 Full 专属 Section

### 问题
Light 模式 probe report 渲染了 Section2-6（AI认知/引擎对比/竞品/数据溯源），数据为 null 显示误导性信息。

### 修复
Section2-6 包裹在 `mode === "full"` 条件下，Light 模式完全不渲染。

### 文件
`frontend/components/scan-probe-report.tsx`

### 改动位置

主组件 ScanReport 中（约 line 1151 起），将 Section2-6 的渲染逻辑改为：

```typescript
{/* Section 1: 综合评分 - 所有模式都显示 */}
<Section1 companyScore={probe.company_score} />

{/* Light 模式: 升级 CTA */}
{mode === "light" && (
    <div className="text-center py-8">
        <p className="text-sm leading-relaxed mb-1" style={{ color: T.secondary }}>
            以上为免费体检可见数据
        </p>
        <p className="text-xs leading-relaxed mb-4" style={{ color: T.muted }}>
            升级后解锁：AI认知画像 · 引擎对比 · 竞品分析 · 引用溯源 · 诊断报告 · 处方清单
        </p>
        <button
            onClick={onUpgrade}
            className="px-5 py-2 rounded-lg text-xs font-semibold
                       transition-all hover:brightness-110"
            style={{ background: T.accent, color: "#08080D" }}
        >
            升级解锁完整报告
        </button>
    </div>
)}

{/* Full 模式: 渲染 Section2-6 */}
{mode === "full" && (
    <>
        <SectionDivider />
        {tier !== "free" ? (
            // 付费用户：直接渲染所有 section
            <>
                <Section2 marketPerception={probe.market_perception}
                          aiNarrative={probe.ai_narrative} />
                <SectionDivider />
                <Section3 gapReport={probe.gap_report}
                          companyEvaluation={probe.company_evaluation} />
                <SectionDivider />
                <Section4 engineResults={probe.engine_results} />
                <SectionDivider />
                <Section5 competitorAnalysis={probe.competitor_analysis}
                          brandName={brandName} />
                <SectionDivider />
                <Section6 sourceAuthority={probe.source_authority}
                          citationDetails={probe.citation_metrics?.details} />
            </>
        ) : (
            // Free 用户：LockedSection 包裹（原有逻辑不变）
            <>
                <LockedSection title="AI认知画像"
                    description="了解 AI 如何描述你的品牌"
                    onUpgrade={onUpgrade}>
                    <Section2 ... />
                </LockedSection>
                <SectionDivider />
                <LockedSection title="认知差距"
                    description="品牌自述 vs AI 认知的对齐度分析"
                    onUpgrade={onUpgrade}>
                    <Section3 ... />
                </LockedSection>
                <SectionDivider />
                <LockedSection title="引擎对比"
                    description="三个 AI 引擎独立搜索同一套查询词"
                    onUpgrade={onUpgrade}>
                    <Section4 ... />
                </LockedSection>
                <SectionDivider />
                <LockedSection title="竞品战场"
                    description="逐查询场景的竞品对比分析"
                    onUpgrade={onUpgrade}>
                    <Section5 ... />
                </LockedSection>
                <SectionDivider />
                <LockedSection title="数据溯源"
                    description="引用来源权威度分析与引用明细"
                    onUpgrade={onUpgrade}>
                    <Section6 ... />
                </LockedSection>
            </>
        )}
    </>
)}
```

---

## CHECKLIST 自检

### P0-1 数据持久化
- [ ] scan_results 表自动创建
- [ ] 扫描完成后写入 SQLite
- [ ] GET /api/scans 返回历史列表
- [ ] GET /api/scan/{id}/result 返回完整 JSON
- [ ] 前端初始化时从 API 加载最近扫描
- [ ] 服务重启后刷新页面 → 报告自动恢复
- [ ] 报告历史页面合并 API + localStorage 数据

### P0-2 侧边栏提示
- [ ] 无数据点 Probe → alert "请先完成一次品牌体检"
- [ ] 无数据点 Analyst → 同上
- [ ] 无数据点 Doctor → 同上
- [ ] 无数据点仪表盘 → 同上
- [ ] setStep 不被修改（停留在当前页）

### P0-3 扫描保护
- [ ] isScanning 状态正确跟随扫描生命周期
- [ ] 扫描中侧边栏按钮 disabled + cursor-not-allowed
- [ ] 扫描中点击无反应
- [ ] 扫描完成/错误/超时后恢复正常

### P0-4 Light 模式
- [ ] Light 模式只渲染 Section1 (综合评分)
- [ ] Light 模式底部显示升级 CTA
- [ ] Full 模式所有 Section 正常渲染
- [ ] LockedSection 逻辑对 free 用户不变

---

## 不需要改的文件
- scan-chat.tsx
- scan-analyst-briefing.tsx
- scan-doctor-briefing.tsx
- probe_node.py / scanner.py
- auth.py
