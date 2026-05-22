# TASK_PROBE_BRANCH.md — Probe支路串联

> 药老出品 · 2026-05-16
> 目标: 串联Probe支路：付费→简报室→Full扫描→Probe报告→仪表盘同步解锁
> 预计工时: 3-4小时

---

## 流程

```
转折点（tier: free → probe）
    ↓
简报室（预填Light数据）
    ↓
Full扫描（3-5分钟）
    ↓
Probe侦察兵页面展示完整报告
    ↓
同时仪表盘同步解锁相关内容
```

---

## 需要修改的文件

| 文件 | 改动 |
|------|------|
| `app/(app)/scan/page.tsx` | 升级后跳简报室、Full扫描后显示Probe报告 |
| `components/probe-briefing.tsx` | 接收预填数据 |

---

## 任务1: 升级后跳简报室

### 问题

当前handleUpgradeConfirm升级后没有自动跳简报室。

### 实现要求

```typescript
// page.tsx

function handleUpgradeConfirm() {
  setShowUpgrade(false);

  if (upgradeFeature === "probe") {
    setUserTier("probe");
    setTier("probe");

    // 准备简报室预填数据
    const probe = data?.probe || {};
    setBriefingDefaults({
      domain: scanDomain,
      brandName: scanBrandName,
      industry: probe.brand_profile?.inferred_industry || "",
      targetMarket: probe.brand_profile?.inferred_target_market || "",
      coreProduct: probe.brand_profile?.inferred_core_product || "",
      competitorMentions: probe.competitor_mentions || [],
    });

    // 直接跳简报室
    setStep("briefing");

  } else if (upgradeFeature === "analyst" || upgradeFeature === "doctor") {
    setUserTier("full");
    setTier("full");
    if (data) {
      setStep("report");
    }
  }
}
```

---

## 任务2: 简报室预填Light数据

### 问题

简报室需要预填Light扫描结果，用户只需要补充target_positioning和确认查询词。

### 实现要求

```typescript
// page.tsx - 简报室渲染

{step === "briefing" && briefingDefaults && (
  <ProbeBriefing
    defaults={briefingDefaults}
    onConfirm={handleBriefingConfirm}
    onBack={() => setStep("dashboard")}
  />
)}
```

```typescript
// probe-briefing.tsx

interface Props {
  defaults: {
    domain: string;
    brandName: string;
    industry: string;
    targetMarket: string;
    coreProduct: string;
    competitorMentions: Array<{ brand: string; mention_count: number }>;
  };
  onConfirm: (input: ProbeFullInput) => void;
  onBack: () => void;
}

export function ProbeBriefing({ defaults, onConfirm, onBack }: Props) {
  // 预填表单
  const [domain] = useState(defaults.domain);
  const [brandName] = useState(defaults.brandName);
  const [industry, setIndustry] = useState(defaults.industry);
  const [targetMarket, setTargetMarket] = useState(defaults.targetMarket);
  const [coreProduct, setCoreProduct] = useState(defaults.coreProduct);
  const [targetPositioning, setTargetPositioning] = useState("");
  const [competitors, setCompetitors] = useState(
    defaults.competitorMentions.map(c => c.brand)
  );

  // 渲染5步表单
  // Step 1: 身份确认（domain, brandName - 只读）
  // Step 2: 战场情报（industry, targetMarket, coreProduct, targetPositioning）
  // Step 3: 敌军情报（competitors - 可编辑）
  // Step 4: 侦察方向（查询词 - 自动生成，可编辑）
  // Step 5: 简报确认

  function handleConfirm() {
    onConfirm({
      domain,
      brand_name: brandName,
      industry,
      target_market: targetMarket,
      core_product: coreProduct,
      target_positioning: targetPositioning,
      competitors,
      seed_queries: [],  // 自动生成
    });
  }

  return (
    <div>
      {/* 5步表单 */}
      {/* ... */}
    </div>
  );
}
```

---

## 任务3: Full扫描完成后显示Probe报告

### 问题

Full扫描完成后，需要在Probe侦察兵页面显示完整报告。

### 实现要求

```typescript
// page.tsx - handleScanFinish

function handleScanFinish(result: any) {
  localStorage.removeItem(userKey("cf_pending_scan"));
  setPendingScan(null);
  setData(result);
  setScanMode(result.mode || scanMode);
  setLastScanTime(formatTime(Date.now()));

  // 保存扫描结果
  const report = {
    data: result,
    mode: result.mode || scanMode,
    domain: scanDomain,
    brandName: scanBrandName,
    timestamp: Date.now(),
  };
  try { localStorage.setItem(userKey(STORAGE_KEY_BASE), JSON.stringify(report)); } catch {}

  // 根据模式决定显示什么
  if (result.mode === "full") {
    // Full模式：显示Probe报告
    setStep("report");
  } else {
    // Light模式：显示Light报告
    setStep("report");
  }
}
```

---

## 任务4: Probe报告页返回仪表盘

### 问题

Probe报告页需要有"返回仪表盘"按钮，点击后仪表盘显示更新后的数据。

### 实现要求

```typescript
// page.tsx - 报告页渲染

{step === "report" && data && (
  <ScanReport
    data={data}
    tier={tier}
    mode={scanMode}
    domain={scanDomain}
    brandName={scanBrandName}
    onUpgrade={() => { setUpgradeFeature("probe"); setShowUpgrade(true); }}
    onBack={() => setStep("dashboard")}
  />
)}
```

---

## 任务5: 仪表盘同步解锁

### 问题

当tier从free变为probe，且mode从light变为full时，仪表盘需要同步解锁更多内容。

### 实现要求

仪表盘已经按tier和mode显示不同内容，只需要确保数据正确传递：

```typescript
// page.tsx - 仪表盘渲染

{step === "dashboard" && (
  <ScanDashboard
    data={data}
    tier={tier}
    mode={scanMode}
    domain={scanDomain}
    brandName={scanBrandName}
    lastScanTime={lastScanTime}
    onViewReport={() => setStep("report")}
    onUpgrade={() => { setUpgradeFeature("probe"); setShowUpgrade(true); }}
  />
)}
```

仪表盘内部逻辑：

```typescript
// scan-dashboard.tsx

export function ScanDashboard({ data, tier, mode, ... }: Props) {
  const probe = data?.probe || {};
  const hasFullData = mode === "full" && !!(probe.engine_results || probe.engine_comparison);

  return (
    <div>
      {/* 综合评分 - 所有tier */}
      <ScoreSection score={probe.company_score} />

      {/* 引用率 - 所有tier */}
      <CitationSection metrics={probe.citation_metrics} />

      {/* 竞品TOP3 - 所有tier */}
      <CompetitorSection mentions={probe.competitor_mentions} />

      {/* AI认知画像 - probe/full显示，free锁定 */}
      {tier !== "free" && hasFullData ? (
        <PerceptionSection perception={probe.market_perception} />
      ) : (
        <LockedSection title="AI认知画像" onUpgrade={onUpgrade} />
      )}

      {/* 引擎对比 - probe/full显示，free锁定 */}
      {tier !== "free" && hasFullData ? (
        <EngineSection engines={probe.engine_results} />
      ) : (
        <LockedSection title="引擎对比" onUpgrade={onUpgrade} />
      )}

      {/* 诊断报告 - full显示，free/probe锁定 */}
      {tier === "full" ? (
        <DiagnosisSection diagnosis={data?.diagnosis} />
      ) : (
        <LockedSection title="诊断报告" onUpgrade={onUpgrade} />
      )}

      {/* 处方 - full显示，free/probe锁定 */}
      {tier === "full" ? (
        <PrescriptionSection prescription={data?.prescription} />
      ) : (
        <LockedSection title="处方" onUpgrade={onUpgrade} />
      )}
    </div>
  );
}
```

---

## 完整流程验证

### 测试1: 免费用户升级到Probe

```
1. 设置tier=free
2. 完成Light扫描 → 显示Light报告
3. 点击侧边栏"首页 仪表盘" → 仪表盘显示Light数据
4. 仪表盘锁定：AI认知画像、引擎对比、诊断报告、处方
5. 点击"升级解锁" → 升级弹窗
6. 点击"升级解锁 · ¥299/月" → 付费成功
7. 自动跳转到简报室
8. 简报室预填Light数据（domain、brandName、industry等）
9. 补充target_positioning → 确认
10. Full扫描（3-5分钟）
11. 显示Probe报告页
12. 点击"返回仪表盘" → 仪表盘显示Full数据
13. 仪表盘解锁：AI认知画像、引擎对比
14. 仪表盘仍然锁定：诊断报告、处方
```

### 测试2: Probe用户再次访问

```
1. 设置tier=probe
2. 访问/scan → 自动读取Full数据
3. 直接显示仪表盘（Full数据）
4. 点击侧边栏"Probe 侦察兵" → 显示Probe报告
```

---

## CHECKLIST 自检

**任务1 升级后跳简报室:**
- [ ] handleUpgradeConfirm中tier变为probe后setStep("briefing")
- [ ] 简报室预填数据正确

**任务2 简报室预填:**
- [ ] domain、brandName只读
- [ ] industry、targetMarket、coreProduct可编辑
- [ ] competitors从competitor_mentions带入
- [ ] target_positioning用户输入

**任务3 Full扫描后显示报告:**
- [ ] handleScanFinish中full模式setStep("report")
- [ ] 显示ScanReport组件

**任务4 报告页返回仪表盘:**
- [ ] onBack按钮setStep("dashboard")
- [ ] 仪表盘读取Full数据

**任务5 仪表盘同步解锁:**
- [ ] tier=probe时解锁AI认知画像、引擎对比
- [ ] tier=probe时仍然锁定诊断报告、处方
- [ ] mode=full时显示Full数据

---

## 交付格式

```
自检结果: X/2 任务1 + X/4 任务2 + X/2 任务3 + X/2 任务4 + X/3 任务5 = XX/13
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. 不改后端API，只改前端
2. 简报室预填数据从Light扫描结果中提取
3. Full扫描完成后显示Probe报告，不是Light报告
4. 仪表盘根据tier和mode自动显示不同内容
