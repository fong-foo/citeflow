# TASK_SCAN_REFACTOR.md — /scan页面架构重构（v3）

> 药老出品 · 2026-05-16
> 目标: 简化状态机，统一UI管道，分离tier和mode
> 预计工时: 6-8小时

---

## 问题

当前/scan页面有10种step状态、两套平行UI分支、mode和userTier混用，接线全乱。

---

## 解决方案：6种状态 + 统一管道

### 新状态机

```
┌───────┐   用户输入完成   ┌──────────┐   确认参数   ┌───────────┐
│ input │ ──────────────→ │ briefing │ ──────────→ │ scanning  │
│       │                 │          │             │           │
│对话模式│                 │ 简报室   │             │ 3-Tab面板 │
│快速表单│                 │(probe用户)│             │           │
│恢复扫描│                 │          │             │           │
└───────┘                 └──────────┘             └───────────┘
                                                          │
                                                          │ 扫描完成
                                                          ↓
┌──────────┐   点击报告   ┌─────────────┐               ┌─────────────┐
│  report  │ ←─────────── │  dashboard  │ ←─────────────┘
│          │              │             │
│ 报告详情  │              │   仪表盘    │
│(统一UI)  │              │ (统一UI)    │
│+侧导航   │              │             │
└──────────┘              └─────────────┘
                                │
                                │ 出错时
                                ↓
                          ┌─────────┐
                          │  error  │
                          │ (重试)  │
                          └─────────┘
```

### 类型定义

```typescript
// 状态机（6种）
type Step = "input" | "briefing" | "scanning" | "dashboard" | "report" | "error";

// 账号权限（3种，对齐后端JWT）
type Tier = "free" | "probe" | "full";

// 扫描参数（2种）
type ScanMode = "light" | "full";
```

### 核心原则

1. **所有用户走同一条UI管道**，不按tier分叉
2. **tier决定"用户能看什么"**，不决定UI结构
3. **mode决定"后端跑什么"**，不影响UI布局
4. **6种状态**，清晰简单

---

## 需要修改的文件

| 文件 | 改动 |
|------|------|
| `app/(app)/scan/page.tsx` | 重写状态机，简化step逻辑 |
| `components/scan-sidebar.tsx` | 分离回调体系，按tier判断按钮状态 |
| `components/scan-dashboard.tsx` | 统一UI，按tier显示锁定内容，保留mode参数 |
| `components/scan-probe-report.tsx` | 修改，增加Section 7/8和tier gating，重命名为ScanReport |
| `components/locked-section.tsx` | 新建，锁定覆盖层组件（inline styles） |
| `lib/storage.ts` | 统一从cf_user.tier读，补充缺失函数 |

---

## 任务1: 简化page.tsx状态机

### 问题

当前有10种step状态，需要简化为6种。

### 实现要求

```typescript
// 新的Step类型
type Step = "input" | "briefing" | "scanning" | "dashboard" | "report" | "error";

// 状态变量
const [step, setStep] = useState<Step>("input");
const [tier, setTier] = useState<Tier>("free");
const [tierLoaded, setTierLoaded] = useState(false);  // 新增：tier是否已从API确认
const [scanMode, setScanMode] = useState<ScanMode>("light");
const [data, setData] = useState<any>(null);
const [elapsed, setElapsed] = useState(0);
const [errorMsg, setErrorMsg] = useState("");
const [showUpgrade, setShowUpgrade] = useState(false);
const [upgradeFeature, setUpgradeFeature] = useState<"probe" | "analyst" | "doctor">("probe");
const [briefingDefaults, setBriefingDefaults] = useState<any>(null);
const [briefingData, setBriefingData] = useState<any>(null);
```

### 状态转换逻辑

```typescript
// 用户输入完成 → 进入简报室或开始扫描
function handleInputComplete(input: ScanInput) {
  if (!tierLoaded) return; // 等待tier加载
  
  if (tier === "free") {
    // 免费用户直接Light扫描
    startScan(input, "light");
  } else {
    // 付费用户进入简报室
    setBriefingDefaults(input);
    setStep("briefing");
  }
}

// 简报室确认 → 开始Full扫描
function handleBriefingConfirm(input: ProbeFullInput) {
  setBriefingData(input);
  startScan(input, "full");
}

// 开始扫描
async function startScan(input: ScanInput, mode: ScanMode) {
  setStep("scanning");
  setScanMode(mode);
  setElapsed(0);
  
  // 保存pending scan（用于断点续扫）
  const pending = { ...input, startTime: Date.now() };
  localStorage.setItem(userKey("cf_pending_scan"), JSON.stringify(pending));
  
  // beforeunload保护
  // ... 保留现有逻辑
  
  try {
    const body = mode === "light" ? {
      domain: input.domain,
      brand_name: input.brandName,
      industry: input.industry,
      target_market: input.targetMarket,
      mode: "light",
    } : {
      domain: input.domain,
      brand_name: input.brandName,
      industry: input.industry,
      target_market: input.targetMarket,
      core_product: input.coreProduct,
      target_positioning: input.targetPositioning,
      seed_queries: input.seedQueries,
      competitors: input.competitors,
      mode: "full",
    };
    
    const res = await fetch(`${API_BASE}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    const json = await res.json();
    
    if (json.status === "error") {
      handleError(json.error || "扫描失败");
      return;
    }
    
    handleScanFinish(json);
  } catch {
    handleError("网络错误");
  }
}

// 扫描完成 → 显示仪表盘
function handleScanFinish(result: any) {
  // 清除pending scan
  localStorage.removeItem(userKey("cf_pending_scan"));
  
  setData(result);
  setStep("dashboard");
  
  // 保存扫描结果
  const report = {
    data: result,
    mode: scanMode,
    domain: scanDomain,
    brandName: scanBrandName,
    timestamp: Date.now(),
  };
  localStorage.setItem(userKey("cf_scan_result"), JSON.stringify(report));
  
  // 存入报告历史
  // ... 保留现有逻辑
}

// 点击报告 → 显示报告
function handleViewReport() {
  setStep("report");
}

// 出错 → 显示错误
function handleError(msg: string) {
  localStorage.removeItem(userKey("cf_pending_scan"));
  setErrorMsg(msg);
  setStep("error");
}

// 重试 → 回到输入
function handleRetry() {
  setStep("input");
  setErrorMsg("");
}

// 重新体检 → 回到输入
function handleRescan() {
  setStep("input");
  setData(null);
}
```

### 初始化逻辑

```typescript
useEffect(() => {
  // 读取tier（从cf_user.tier）
  const savedTier = getUserTier();
  setTier(savedTier);
  setTierLoaded(true);
  
  // 读取扫描结果
  const savedResult = localStorage.getItem(userKey("cf_scan_result"));
  if (savedResult) {
    try {
      const parsed = JSON.parse(savedResult);
      if (parsed.data) {
        setData(parsed.data);
        setScanMode(parsed.mode || "light");
        setStep("dashboard");
      }
    } catch {}
  }
  
  // 检查中断的扫描（保留现有逻辑）
  const pendingScan = localStorage.getItem(userKey("cf_pending_scan"));
  if (pendingScan) {
    // 在input状态内显示恢复UI
  }
  
  // localStorage迁移逻辑（保留现有逻辑）
  // ...
  
  setInitialized(true);
}, []);
```

### input状态内的resume逻辑

```typescript
{step === "input" && (
  <>
    {pendingScan ? (
      <ResumeScan
        domain={pendingScan.domain}
        onResume={() => startScan(pendingScan, scanMode)}
        onAbort={() => {
          localStorage.removeItem(userKey("cf_pending_scan"));
          setStep("input");
        }}
      />
    ) : (
      <ScanChat onComplete={handleInputComplete} />
    )}
  </>
)}
```

---

## 任务2: 统一侧边栏（分离回调体系）

### 问题

侧边栏按钮和页面状态是两套体系，不应该混用同一个回调。

### 实现要求

```typescript
// scan-sidebar.tsx
interface ScanSidebarProps {
  currentStep: Step;
  tier: Tier;
  scanMode: ScanMode;
  hasData: boolean;
  domain?: string;
  brandName?: string;
  onInputClick: () => void;
  onProbeClick: () => void;
  onAnalystClick: () => void;
  onDoctorClick: () => void;
  onUpgradeClick: () => void;
}

export function ScanSidebar({
  currentStep,
  tier,
  scanMode,
  hasData,
  domain,
  brandName,
  onInputClick,
  onProbeClick,
  onAnalystClick,
  onDoctorClick,
  onUpgradeClick,
}: ScanSidebarProps) {
  // 按钮状态逻辑
  function getButtonStatus(buttonId: string): StepStatus {
    if (buttonId === "input") {
      return currentStep === "input" ? "current" : "completed";
    }
    
    if (buttonId === "probe") {
      if (tier === "free") return "locked";
      if (hasData && scanMode === "full") return "completed";
      return "available";
    }
    
    if (buttonId === "analyst") {
      if (tier !== "full") return "locked";
      // TODO: 检查是否有analyst数据
      return "available";
    }
    
    if (buttonId === "doctor") {
      if (tier !== "full") return "locked";
      // TODO: 检查是否有doctor数据
      return "available";
    }
    
    return "locked";
  }
  
  // 按钮点击逻辑
  function handleButtonClick(buttonId: string) {
    if (buttonId === "input") {
      onInputClick();
      return;
    }
    
    if (buttonId === "probe") {
      if (tier === "free") {
        onUpgradeClick();
        return;
      }
      onProbeClick();
      return;
    }
    
    if (buttonId === "analyst") {
      if (tier !== "full") {
        onUpgradeClick();
        return;
      }
      onAnalystClick();
      return;
    }
    
    if (buttonId === "doctor") {
      if (tier !== "full") {
        onUpgradeClick();
        return;
      }
      onDoctorClick();
      return;
    }
  }
  
  // 保留子步骤（收集信息/扫描仓/报告生成）
  // 保留 onHomeClick（回仪表盘）
  
  // 渲染...
}
```

### page.tsx调用

```typescript
<ScanSidebar
  currentStep={step}
  tier={tier}
  scanMode={scanMode}
  hasData={!!data}
  domain={scanDomain}
  brandName={scanBrandName}
  onInputClick={() => setStep("input")}
  onHomeClick={() => setStep("dashboard")}
  onProbeClick={() => {
    if (!data) {
      setStep("input");
      return;
    }
    if (scanMode === "light") {
      // 只有Light数据，进简报室做Full扫描
      const probe = data?.probe || {};
      setBriefingDefaults({
        domain: scanDomain,
        brandName: scanBrandName,
        industry: probe.brand_profile?.inferred_industry || "",
        targetMarket: probe.brand_profile?.inferred_target_market || "",
        competitorMentions: probe.competitor_mentions || [],
      });
      setStep("briefing");
      return;
    }
    setStep("report");
  }}
  onAnalystClick={() => {
    if (tier !== "full") {
      setUpgradeFeature("analyst");
      setShowUpgrade(true);
      return;
    }
    // Analyst报告页暂未开发
    alert("Analyst诊断师报告即将上线");
  }}
  onDoctorClick={() => {
    if (tier !== "full") {
      setUpgradeFeature("doctor");
      setShowUpgrade(true);
      return;
    }
    // Doctor处方页暂未开发
    alert("Doctor处方即将上线");
  }}
  onUpgradeClick={() => setShowUpgrade(true)}
/>
```

---

## 任务3: 统一仪表盘（保留现有section）

### 问题

仪表盘需要保留现有section，按tier显示锁定内容。

### 实现要求

```typescript
// scan-dashboard.tsx
interface Props {
  data: any;
  tier: Tier;
  mode: ScanMode;
  domain: string;
  brandName: string;
  lastScanTime: string;
  onViewReport: () => void;
  onUpgrade: () => void;
}

export function ScanDashboard({
  data,
  tier,
  mode,
  domain,
  brandName,
  lastScanTime,
  onViewReport,
  onUpgrade,
}: Props) {
  const probe = data?.probe || {};
  const hasFullData = mode === "full" && !!(probe.engine_results || probe.engine_comparison);
  
  return (
    <div>
      {/* Section 1: 品牌健康卡 - 所有tier */}
      <HealthCardSection
        score={probe.company_score}
        metrics={probe.citation_metrics}
        competitors={probe.competitor_mentions}
      />
      
      {/* Section 2: 竞品对比图 - 所有tier */}
      <CompetitorChartSection
        competitors={probe.competitor_mentions}
        metrics={probe.citation_metrics}
      />
      
      {/* Section 3: 诊断摘要 - probe/full显示，free锁定 */}
      {tier !== "free" && hasFullData ? (
        <DiagnosisSummarySection diagnosis={data?.diagnosis} />
      ) : (
        <LockedSection
          title="诊断摘要"
          description="14条规则逐条检查，告诉你根因"
          mockData={LOCKED_DIAGNOSIS}
          onUpgrade={onUpgrade}
        />
      )}
      
      {/* Section 4: 处方步骤 - full显示，free/probe锁定 */}
      {tier === "full" ? (
        <PrescriptionStepsSection prescription={data?.prescription} />
      ) : (
        <LockedSection
          title="处方执行"
          description="P0/P1/P2任务清单，告诉你怎么改"
          mockData={LOCKED_PRESCRIPTION}
          onUpgrade={onUpgrade}
        />
      )}
      
      {/* Section 5: 体检进度 - 所有tier */}
      <ProgressSection mode={mode} lastScanTime={lastScanTime} />
      
      {/* Section 6: 付费能力预告 - free/probe显示 */}
      {tier !== "full" && (
        <UnlockSection tier={tier} onUpgrade={onUpgrade} />
      )}
      
      {/* 查看报告按钮 */}
      <button onClick={onViewReport}>查看完整报告</button>
    </div>
  );
}
```

---

## 任务4: 修改ScanProbeReport为ScanReport

### 问题

不新建scan-report.tsx，修改现有scan-probe-report.tsx。

### 实现要求

```typescript
// 修改 scan-probe-report.tsx
// 1. 重命名为 ScanReport
// 2. 增加 tier 和 mode 参数
// 3. 增加 Section 7（诊断）和 Section 8（处方）
// 4. 增加 tier gating
// 5. 保留 sticky 侧导航

interface Props {
  data: any;
  tier: Tier;
  mode: ScanMode;
  domain: string;
  brandName: string;
  onUpgrade: () => void;
  onBack: () => void;
}

export function ScanReport({
  data,
  tier,
  mode,
  domain,
  brandName,
  onUpgrade,
  onBack,
}: Props) {
  const probe = data?.probe || {};
  const hasFullData = mode === "full" && !!(probe.engine_results || probe.engine_comparison);
  
  // 保留现有 NAV_ITEMS + IntersectionObserver
  const NAV_ITEMS = [
    { id: "overview", label: "综合评分" },
    { id: "perception", label: "AI认知画像" },
    { id: "gap", label: "认知差距" },
    { id: "engines", label: "引擎对比" },
    { id: "competitors", label: "竞品战场" },
    { id: "traceability", label: "数据溯源" },
    { id: "diagnosis", label: "诊断报告" },
    { id: "prescription", label: "处方" },
  ];
  
  return (
    <div className="flex">
      {/* Sticky侧导航 */}
      <ReportNav items={NAV_ITEMS} />
      
      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto py-6 px-7">
        <ReportHeader brandName={brandName} domain={domain} />
        
        {/* Section 1-6: 现有probe sections */}
        <Section1 companyScore={probe.company_score} />
        
        {tier !== "free" && hasFullData ? (
          <Section2 marketPerception={probe.market_perception} aiNarrative={probe.ai_narrative} />
        ) : (
          <LockedSection title="AI认知画像" onUpgrade={onUpgrade} />
        )}
        
        {/* ... Section 3-6 同理 ... */}
        
        {/* Section 7: 诊断报告 - full显示 */}
        {tier === "full" && data?.diagnosis ? (
          <Section7 diagnosis={data.diagnosis} />
        ) : (
          <LockedSection title="诊断报告" onUpgrade={onUpgrade} />
        )}
        
        {/* Section 8: 处方 - full显示 */}
        {tier === "full" && data?.prescription ? (
          <Section8 prescription={data.prescription} />
        ) : (
          <LockedSection title="处方" onUpgrade={onUpgrade} />
        )}
        
        {/* CTA */}
        {tier !== "full" && <UpgradeCTA onUpgrade={onUpgrade} />}
        
        {/* 返回按钮 */}
        <button onClick={onBack}>返回仪表盘</button>
      </div>
    </div>
  );
}
```

---

## 任务5: 新建LockedSection组件

### 实现要求

```typescript
// components/locked-section.tsx
interface Props {
  title: string;
  description?: string;
  mockData?: any;  // 可选：模糊展示的mock数据
  lockPrice?: string;  // 可选：显示价格
  onUpgrade: () => void;
}

export function LockedSection({ title, description, mockData, lockPrice, onUpgrade }: Props) {
  return (
    <div style={{ position: "relative", marginBottom: 32 }}>
      {/* 内容区域（模糊） */}
      <div style={{ filter: "blur(8px)", opacity: 0.22, pointerEvents: "none" }}>
        {mockData ? (
          <div>{/* 渲染mock数据 */}</div>
        ) : (
          <div style={{ height: 128, background: "rgba(255,255,255,0.02)" }} />
        )}
      </div>
      
      {/* 锁定覆盖层 */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#EDEDF5" }}>
          {title}
        </p>
        {description && (
          <p style={{ fontSize: 12, marginBottom: 16, color: "#9A9AB0" }}>
            {description}
          </p>
        )}
        <button
          onClick={onUpgrade}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 500,
            background: "rgba(56,189,248,0.12)",
            border: "1px solid rgba(56,189,248,0.22)",
            color: "#7DD3FC",
            cursor: "pointer",
          }}
        >
          {lockPrice ? `升级解锁 · ${lockPrice}` : "升级解锁"}
        </button>
      </div>
    </div>
  );
}
```

---

## 任务6: 统一Tier类型

### 实现要求

```typescript
// lib/storage.ts
export type Tier = "free" | "probe" | "full";

export function getUserTier(): Tier {
  try {
    const raw = localStorage.getItem("cf_user");
    if (!raw) return "free";
    const user = JSON.parse(raw);
    const tier = user.tier;
    if (tier === "probe" || tier === "full") return tier;
    return "free";
  } catch {
    return "free";
  }
}

export function setUserTier(tier: Tier): void {
  try {
    const raw = localStorage.getItem("cf_user");
    if (!raw) return;
    const user = JSON.parse(raw);
    user.tier = tier;
    localStorage.setItem("cf_user", JSON.stringify(user));
  } catch {}
}

export function hasProbeAccess(): boolean {
  return getUserTier() !== "free";
}

export function hasFullAccess(): boolean {
  return getUserTier() === "full";
}
```

---

## 任务7: 升级流程

### 实现要求

```typescript
// page.tsx
function handleUpgradeConfirm() {
  setShowUpgrade(false);
  
  if (upgradeFeature === "probe") {
    setUserTier("probe");
    setTier("probe");
    // 跳简报室
    if (briefingDefaults) {
      setStep("briefing");
    }
  } else if (upgradeFeature === "analyst" || upgradeFeature === "doctor") {
    setUserTier("full");
    setTier("full");
    // 如果已有数据，跳报告页
    if (data) {
      setStep("report");
    }
  }
}
```

---

## 需要保留的现有逻辑

以下逻辑在重构时必须保留，不能丢失：

1. **beforeunload保护** — 扫描中离开页面时弹出确认
2. **localStorage迁移** — 旧版全局键 → 用户隔离键
3. **报告历史自动保存** — 扫描完成后存入cf_reports
4. **断点续扫** — cf_pending_scan的读写和恢复
5. **3-Tab面板** — scanning状态内的子导航
6. **体检进度** — dashboard中的进度条
7. **付费能力预告** — dashboard中的UnlockCard
8. **侧导航** — report中的sticky导航

---

## 验证方法

### 测试1: 免费用户完整流程

```
1. 清除localStorage
2. 进入/scan → 对话模式
3. 输入域名 → Light扫描 → 仪表盘
4. 仪表盘显示：品牌健康卡、竞品对比图、体检进度
5. 仪表盘锁定：诊断摘要、处方（显示mock数据）
6. 点击锁定区域 → 升级弹窗
7. 升级为Probe → 跳简报室
```

### 测试2: Probe用户完整流程

```
1. 设置tier=probe
2. 进入/scan → 对话模式
3. 输入域名 → 简报室 → Full扫描 → 仪表盘
4. 仪表盘显示：所有Probe模块
5. 仪表盘锁定：诊断报告、处方
6. 点击"查看报告" → 报告页（带侧导航）
7. 报告页显示：Section 1-6
8. Section 7-8锁定
```

### 测试3: Full用户完整流程

```
1. 设置tier=full
2. 进入/scan → 对话模式
3. 输入域名 → 简报室 → Full扫描 → 仪表盘
4. 仪表盘显示：所有模块
5. 点击"查看报告" → 报告页
6. 所有section显示
```

### 测试4: 断点续扫

```
1. 开始扫描 → 刷新页面
2. 进入/scan → 显示"检测到中断的扫描"
3. 点击"继续扫描" → 恢复扫描
```

### 测试5: 侧边栏状态

```
1. 免费版：Probe/Analyst/Doctor按钮锁定，点击弹出升级弹窗
2. Probe版：Probe按钮显示✓完成（有Full数据时），Analyst/Doctor锁定
3. Full版：所有按钮可用
```

---

## CHECKLIST 自检

**任务1 状态机:**
- [ ] Step类型只有6种
- [ ] 状态转换逻辑清晰
- [ ] tierLoaded防抖
- [ ] startScan按mode分叉构建request body
- [ ] 保留beforeunload/localStorage迁移/报告历史

**任务2 侧边栏:**
- [ ] 分离回调体系
- [ ] 按钮状态按tier+hasData+scanMode判断
- [ ] completed状态正确显示
- [ ] 保留子步骤和onHomeClick

**任务3 仪表盘:**
- [ ] 保留现有section（品牌健康卡、竞品图、体检进度、付费预告）
- [ ] 按tier显示锁定内容
- [ ] 锁定区域显示mock数据

**任务4 报告页:**
- [ ] 修改ScanProbeReport，不新建
- [ ] 增加Section 7/8
- [ ] 增加tier gating
- [ ] 保留sticky侧导航

**任务5 LockedSection:**
- [ ] 使用inline styles
- [ ] 支持mockData参数
- [ ] 支持lockPrice参数

**任务6 storage.ts:**
- [ ] 统一从cf_user.tier读
- [ ] 补充setUserTier/hasProbeAccess/hasFullAccess

**任务7 升级流程:**
- [ ] 升级后tier更新
- [ ] 升级后跳简报室或报告页

---

## 交付格式

```
自检结果: X/5 任务1 + X/4 任务2 + X/4 任务3 + X/4 任务4 + X/3 任务5 + X/3 任务6 + X/2 任务7 = XX/25
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. 不改后端API，只改前端
2. Tier类型对齐后端JWT：free/probe/full
3. 不新增cf_plan，统一从cf_user.tier读
4. 修改ScanProbeReport，不新建scan-report.tsx
5. 保留所有现有逻辑（beforeunload/迁移/历史/断点续扫）
6. 保留3-Tab面板、体检进度、付费预告、侧导航
7. LockedSection使用inline styles
