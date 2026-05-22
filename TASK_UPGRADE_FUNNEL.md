# TASK_UPGRADE_FUNNEL.md — 升级弹窗转化漏斗

> 药老出品 · 2026-05-19（v2，修正海老审查问题）
> 目标: 区分Free→Probe和Probe→Full两种升级路径，展示针对性文案
> 预计工时: 1-2小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | UpgradeModal加tier + 三种弹窗内容 + CTA动态价格 | upgrade-modal.tsx | 1h |
| 2 | onUpgrade签名改为(feature) => void | scan-dashboard.tsx | 0.3h |
| 3 | page.tsx接收feature + 传递tier | scan/page.tsx | 0.2h |

**完成标准**:
- Free用户点Probe → 弹窗A（¥50/次）
- Free用户点Analyst/Doctor → 弹窗B（¥299/月，含Probe+Analyst+Doctor）
- Probe用户点Analyst/Doctor → 弹窗C（¥299/月，含Analyst+Doctor）
- 仪表盘锁定模块也按上述逻辑弹正确的弹窗

---

## 转化漏斗逻辑

```
Free用户：
  点击Probe → 弹窗A（¥50/次）
  点击Analyst/Doctor → 弹窗B（¥299/月）
  仪表盘锁定模块（AI认知/引擎/认知差距）→ 弹窗A（¥50/次）
  仪表盘锁定模块（诊断/处方）→ 弹窗B（¥299/月）

Probe用户：
  点击Analyst/Doctor → 弹窗C（¥299/月）
  仪表盘锁定模块（诊断/处方）→ 弹窗C（¥299/月）
```

---

## 任务1: UpgradeModal加tier + 动态价格

### 需要改的文件
`frontend/components/upgrade-modal.tsx`

### 实现要求

#### 1.1 修改Props接口

```tsx
interface Props {
  feature: "probe" | "analyst" | "doctor";
  tier: "free" | "probe" | "full";  // 新增
  onClose: () => void;
  onUpgrade?: () => void;
}
```

#### 1.2 添加判断逻辑和三种弹窗配置

```tsx
function getUpgradeType(tier: string, feature: string): "probe" | "full" {
  if (tier === "free" && feature === "probe") return "probe";
  if (tier === "free" && (feature === "analyst" || feature === "doctor")) return "full";
  if (tier === "probe" && (feature === "analyst" || feature === "doctor")) return "full";
  return "probe";
}

const UPGRADE_CONFIGS = {
  "free-probe": {
    title: "Probe 侦察兵",
    subtitle: "完整版 AI 可见度侦察",
    unlocks: [
      "综合评分、引用率、推荐率、Top率",
      "AI 怎么描述你的品牌（真实输出）",
      "三大引擎（ChatGPT/Gemini/Claude）对你的引用差异",
      "品牌自述 vs AI 认知的差距分析",
      "竞品在哪些维度赢了你",
      "谁在讨论你（来源权威度）",
    ],
    price: "¥50/次",
    priceDetail: "一次性付费，解锁完整扫描",
  },
  "free-full": {
    title: "解锁完整诊断",
    subtitle: "一键获取侦察 + 诊断 + 处方",
    unlocks: [
      "Probe 侦察兵（完整扫描）",
      "Analyst 诊断师（14条规则根因诊断）",
      "Doctor 处方（P0/P1/P2任务清单）",
      "三层分析（现象→原因→影响）",
      "竞品差距5维度对比",
      "页面级操作建议（精确到哪个页面改什么）",
    ],
    price: "¥299/月",
    priceDetail: "含 Probe + Analyst + Doctor",
  },
  "probe-full": {
    title: "解锁深度诊断",
    subtitle: "你已完成 Probe 扫描，现在升级获取诊断 + 处方",
    unlocks: [
      "Analyst 诊断师（14条规则根因诊断）",
      "Doctor 处方（P0/P1/P2任务清单）",
      "三层分析（现象→原因→影响）",
      "竞品差距5维度对比",
      "页面级操作建议（精确到哪个页面改什么）",
      "影响/难度/周期评估",
    ],
    price: "¥299/月",
    priceDetail: "含 Analyst 诊断师 + Doctor 处方",
  },
};
```

#### 1.3 修改组件实现

```tsx
export function UpgradeModal({ feature, tier, onClose, onUpgrade }: Props) {
  const upgradeType = getUpgradeType(tier, feature);
  const configKey = `${tier}-${upgradeType}`;
  const info = UPGRADE_CONFIGS[configKey as keyof typeof UPGRADE_CONFIGS] || UPGRADE_CONFIGS["free-probe"];

  // 渲染逻辑保持不变，用info代替原来的FEATURES[feature]
  // ...
}
```

#### 1.4 CTA按钮动态价格

当前硬编码（line 156-160）：
```tsx
升级解锁 · ¥299/月
含 Probe + Analyst + Doctor
```

改为动态读取info.price和info.priceDetail：
```tsx
<button ... >
  升级解锁 · {info.price}
</button>
<p ... >
  {info.priceDetail}
</p>
```

#### 1.5 删除旧的FEATURES常量

原来的FEATURES常量（probe/analyst/doctor三个配置）不再需要，用UPGRADE_CONFIGS代替。

---

## 任务2: onUpgrade签名改为(feature) => void

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 问题

当前onUpgrade prop签名是`() => void`，不传递feature信息。仪表盘的PreviewModal点击升级时，page.tsx不知道该设置哪个upgradeFeature。

### 实现要求

#### 2.1 修改Props接口

```tsx
// scan-dashboard.tsx 的 Props 接口
interface Props {
  // ... 其他props
  onUpgrade: (feature?: "probe" | "analyst" | "doctor") => void;  // 改签名
}
```

#### 2.2 修改PreviewModal的onUpgrade回调

当前代码（约line 2184）：
```tsx
<PreviewModal
  ...
  onUpgrade={() => {
    setShowPreview(false);
    onUpgrade();  // 不传feature
  }}
/>
```

改为：
```tsx
<PreviewModal
  ...
  onUpgrade={() => {
    setShowPreview(false);
    // 根据previewModule.id映射feature
    const featureMap: Record<string, "probe" | "analyst" | "doctor"> = {
      "ai_perception": "probe",
      "engine_comparison": "probe",
      "gap_report": "probe",
      "diagnosis": "analyst",
      "prescription": "doctor",
    };
    const feature = featureMap[previewModule?.id || ""] || "probe";
    onUpgrade(feature);
  }}
/>
```

#### 2.3 修改底部升级按钮

scan-dashboard.tsx 底部升级按钮（约line 2172）：

```tsx
// 当前
onClick={onUpgrade}

// 改为
onClick={() => onUpgrade(isFree ? "probe" : "analyst")}
```

#### 2.4 修改所有LockedSection的onUpgrade prop

LockedSection有两条升级路径：
- 点击模糊内容区 → PreviewModal → onUpgrade (2.2已覆盖)
- 点击"🔒 升级解锁"按钮 → **直接调用** onUpgrade() → 不经过PreviewModal → 必须传feature

5个LockedSection的onUpgrade都需要包一层feature映射：

```tsx
// ai_perception LockedSection（约line 1615）
// 当前：onUpgrade={onUpgrade}
// 改为：
onUpgrade={() => onUpgrade("probe")}

// engine_comparison LockedSection（约line 1722）
// 改为：
onUpgrade={() => onUpgrade("probe")}

// gap_report LockedSection（约line 1829）
// 改为：
onUpgrade={() => onUpgrade("probe")}

// diagnosis LockedSection（约line 1987）
// 改为：
onUpgrade={() => onUpgrade("analyst")}

// prescription LockedSection（约line 2014）
// 改为：
onUpgrade={() => onUpgrade("doctor")}
```

---

## 任务3: page.tsx接收feature + 传递tier

### 需要改的文件
`frontend/app/(app)/scan/page.tsx`

### 实现要求

#### 3.1 修改onUpgrade回调接收feature

当前代码（搜索`onUpgrade`）：
```tsx
onUpgrade={() => {
  setUpgradeFeature("probe");
  setShowUpgrade(true);
}}
```

改为：
```tsx
onUpgrade={(feature) => {
  setUpgradeFeature(feature || "probe");
  setShowUpgrade(true);
}}
```

#### 3.2 传递tier给UpgradeModal

当前代码（搜索`<UpgradeModal`）：
```tsx
<UpgradeModal
  feature={upgradeFeature}
  onClose={() => setShowUpgrade(false)}
  onUpgrade={handleUpgradeConfirm}
/>
```

改为：
```tsx
<UpgradeModal
  feature={upgradeFeature}
  tier={tier}
  onClose={() => setShowUpgrade(false)}
  onUpgrade={handleUpgradeConfirm}
/>
```

#### 3.3 确认侧边栏的onUpgrade也正确

侧边栏的onUpgradeClick不需要改（它不经过PreviewModal，直接弹UpgradeModal）。但需要确认UpgradeModal能拿到tier。

搜索page.tsx中所有`<UpgradeModal`，确保都有`tier={tier}`。

---

## 不要动的东西

1. **Probe流程** — 不改
2. **Analyst流程** — 不改
3. **侧边栏逻辑** — 不改
4. **PreviewModal组件本身** — 不改（只改它的onUpgrade回调）

---

## CHECKLIST 自检

**任务1 [UpgradeModal]:**
- [ ] Props接口加tier参数
- [ ] getUpgradeType逻辑正确
- [ ] 弹窗A（Free→Probe）内容正确，价格¥50/次
- [ ] 弹窗B（Free→Full）内容正确，价格¥299/月
- [ ] 弹窗C（Probe→Full）内容正确，价格¥299/月
- [ ] CTA按钮动态显示info.price
- [ ] 价格说明动态显示info.priceDetail
- [ ] 删除旧的FEATURES常量

**任务2 [scan-dashboard.tsx]:**
- [ ] onUpgrade签名改为(feature?) => void
- [ ] PreviewModal的onUpgrade根据previewModule.id映射feature
- [ ] 底部升级按钮传正确的feature
- [ ] 5个LockedSection的onUpgrade传正确的feature
- [ ] 所有onUpgrade()调用点都传了feature

**任务3 [page.tsx]:**
- [ ] onUpgrade回调接收feature参数
- [ ] UpgradeModal加tier={tier}
- [ ] 所有UpgradeModal渲染点都有tier

---

## 交付格式

```
自检结果: X/8 任务1 + X/5 任务2 + X/3 任务3 = XX/16
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. 弹窗文案用价值驱动，不用功能驱动
2. 弹窗C的副标题要体现"你已完成Probe扫描"
3. CTA按钮价格必须动态，不能硬编码
4. PreviewModal在scan-dashboard.tsx中，不在page.tsx
5. previewModule是scan-dashboard.tsx的内部state
