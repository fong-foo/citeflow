# TASK_DASHBOARD_PROBE_MODULES.md — 仪表盘新增3个Probe模块

> 药老出品 · 2026-05-18
> 目标: 仪表盘展示Probe完整版的核心数据，回答"为什么评分低"和"竞品哪里赢我"
> 预计工时: 3-4小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 新增 CompetitorDimensionComparison 组件 | scan-dashboard.tsx | 1.5h |
| 2 | 新增 BrandDiagnosis 组件 | scan-dashboard.tsx | 1h |
| 3 | 新增 SourceAuthoritySection 组件 | scan-dashboard.tsx | 1h |
| 4 | 在仪表盘中插入3个组件 | scan-dashboard.tsx | 0.5h |

**完成标准**: Probe用户在仪表盘能看到竞品维度对比、品牌优势劣势、引用来源分析

---

## 背景

### 用户痛点
```
用户看到：综合评分 62/100
用户想问：为什么这么低？竞品哪里赢我？我的优势劣势是什么？
```

### 数据来源（Probe完整版已有，不需要改后端）
```python
# ProbeOutput 结构
{
  "competitor_analysis": [  # 竞品分析
    {
      "query": "best eco phone case",
      "winner": "Pela Case",
      "reason": "环保材料更突出",
      "dimension_scores": [  # ← 维度对比数据
        {
          "dimension": "环保可持续",
          "rankings": [
            {"brand": "Pela Case", "rank": 1, "score": 85},
            {"brand": "你的品牌", "rank": 2, "score": 60}
          ],
          "importance": "high"
        }
      ],
      "dimension_win_count": {"Pela Case": 3, "你的品牌": 1}  # ← 各品牌胜出次数
    }
  ],
  "company_evaluation": {  # 公司评估
    "overall": "中等偏下，在环保领域有潜力但知名度不足",
    "strengths": ["产品设计独特", "价格有竞争力"],
    "weaknesses": ["品牌知名度低", "AI搜索可见度差"],
    "positioning": "性价比环保手机壳"
  },
  "source_authority": {  # 来源权威度
    "top_sources": [
      {"domain": "reddit.com", "source_type": "论坛", "authority_score": 75, "mention_count": 3},
      {"domain": "amazon.com", "source_type": "电商平台", "authority_score": 80, "mention_count": 2}
    ],
    "total_sources": 8,
    "source_diversity": 0.65
  }
}
```

### Light vs Full 区别
| 维度 | Light（免费） | Full（付费） |
|------|--------------|-------------|
| competitor_analysis | ❌ 无 | ✅ 有 |
| company_evaluation | ❌ 无 | ✅ 有 |
| source_authority | ❌ 无 | ✅ 有 |

---

## 任务1: 新增 CompetitorDimensionComparison 组件

### 问题
用户知道竞品赢了，但不知道在哪些维度赢的。当前仪表盘只有竞品提及次数，没有维度级对比。

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 实现要求

1. **在 scan-dashboard.tsx 中新增组件（约在 LockedSection 组件后面）**

```tsx
function CompetitorDimensionComparison({
  competitorAnalysis,
  brandName,
}: {
  competitorAnalysis: any[];
  brandName: string;
}) {
  if (!competitorAnalysis || competitorAnalysis.length === 0) {
    return null;
  }

  // 聚合所有查询的维度数据
  const dimensionMap: Record<string, { brandScores: Record<string, number[]>; importance: string }> = {};

  competitorAnalysis.forEach((ca: any) => {
    if (!ca.dimension_scores) return;
    ca.dimension_scores.forEach((ds: any) => {
      if (!dimensionMap[ds.dimension]) {
        dimensionMap[ds.dimension] = { brandScores: {}, importance: ds.importance || "medium" };
      }
      ds.rankings?.forEach((r: any) => {
        if (!dimensionMap[ds.dimension].brandScores[r.brand]) {
          dimensionMap[ds.dimension].brandScores[r.brand] = [];
        }
        if (r.score != null) {
          dimensionMap[ds.dimension].brandScores[r.brand].push(r.score);
        }
      });
    });
  });

  const dimensions = Object.keys(dimensionMap);
  if (dimensions.length === 0) return null;

  // 获取所有品牌（去重）
  const allBrands = new Set<string>();
  dimensions.forEach((dim) => {
    Object.keys(dimensionMap[dim].brandScores).forEach((b) => allBrands.add(b));
  });
  const brands = Array.from(allBrands).slice(0, 4); // 最多显示4个品牌

  // 计算每个维度每个品牌的平均分
  const avgScores: Record<string, Record<string, number>> = {};
  dimensions.forEach((dim) => {
    avgScores[dim] = {};
    brands.forEach((brand) => {
      const scores = dimensionMap[dim].brandScores[brand] || [];
      avgScores[dim][brand] = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    });
  });

  // 找出每个维度的胜者
  const winners: Record<string, string> = {};
  dimensions.forEach((dim) => {
    let maxScore = 0;
    let winner = "";
    brands.forEach((brand) => {
      if (avgScores[dim][brand] > maxScore) {
        maxScore = avgScores[dim][brand];
        winner = brand;
      }
    });
    winners[dim] = winner;
  });

  // 统计各品牌胜出次数
  const winCount: Record<string, number> = {};
  brands.forEach((b) => (winCount[b] = 0));
  Object.values(winners).forEach((w) => {
    if (winCount[w] !== undefined) winCount[w]++;
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.32 }}
      className="px-7 py-7 flex-shrink-0"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <SectionLabel>竞品维度对比</SectionLabel>

      {/* 表格 */}
      <div className="rounded-sm overflow-hidden mb-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
        {/* 表头 */}
        <div
          className="grid gap-2 px-4 py-2 text-[10px] font-mono tracking-wider uppercase"
          style={{
            gridTemplateColumns: `1fr ${brands.map(() => "60px").join(" ")}`,
            color: "rgba(255,255,255,0.3)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span>维度</span>
          {brands.map((b, i) => (
            <span key={i} className="text-center">{b === brandName ? "你" : b.slice(0, 8)}</span>
          ))}
        </div>

        {/* 数据行 */}
        {dimensions.slice(0, 6).map((dim, i) => {
          const isHigh = dimensionMap[dim].importance === "high";
          return (
            <div
              key={i}
              className="grid gap-2 px-4 py-2 text-xs"
              style={{
                gridTemplateColumns: `1fr ${brands.map(() => "60px").join(" ")}`,
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                borderBottom: i < dimensions.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
              }}
            >
              <span className="flex items-center gap-1.5" style={{ color: isHigh ? "#F59E0B" : "#9A9AB0" }}>
                {isHigh && <span className="w-1 h-1 rounded-full" style={{ background: "#F59E0B" }} />}
                {dim}
              </span>
              {brands.map((brand, j) => {
                const score = avgScores[dim][brand];
                const isWinner = winners[dim] === brand;
                const isBrand = brand === brandName;
                return (
                  <span
                    key={j}
                    className="text-center font-mono"
                    style={{
                      color: isWinner ? "#22C55E" : isBrand ? "#38BDF8" : "#9A9AB0",
                      fontWeight: isWinner ? 600 : 400,
                    }}
                  >
                    {score || "—"}
                    {isWinner && " ✓"}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 胜出统计 */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.14)" }}>
          胜出统计
        </span>
        {brands.map((brand, i) => (
          <span key={i} className="text-xs" style={{ color: brand === brandName ? "#38BDF8" : "#9A9AB0" }}>
            {brand === brandName ? "你" : brand}: <span className="font-mono">{winCount[brand]}</span> 次
          </span>
        ))}
      </div>
    </motion.section>
  );
}
```

### 验证方法

**测试1: Probe 模式**
1. localStorage 改 tier=probe
2. 跑一次 Full 扫描
3. 进入仪表盘
4. 应该看到"竞品维度对比"表格，显示各维度的评分和胜者

**测试2: Light 模式**
1. 跑一次 Light 扫描
2. 进入仪表盘
3. 应该看不到这个模块（因为没有 competitor_analysis 数据）

---

## 任务2: 新增 BrandDiagnosis 组件

### 问题
用户知道评分低，但不知道具体优势劣势是什么。

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 实现要求

1. **在 scan-dashboard.tsx 中新增组件**

```tsx
function BrandDiagnosis({
  companyEvaluation,
}: {
  companyEvaluation: any;
}) {
  if (!companyEvaluation) {
    return null;
  }

  const { overall, strengths, weaknesses, positioning } = companyEvaluation;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.34 }}
      className="px-7 py-7 flex-shrink-0"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <SectionLabel>品牌诊断</SectionLabel>

      {/* 整体评价 */}
      {overall && (
        <div className="mb-5">
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.14)" }}>
            整体评价
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#C8C8D8" }}>
            {overall}
          </p>
        </div>
      )}

      {/* 优势/劣势 */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* 优势 */}
        <div>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "#22C55E" }}>
            ✓ 优势
          </p>
          <div className="space-y-1.5">
            {strengths && strengths.length > 0 ? (
              strengths.map((s: string, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 text-xs"
                  style={{
                    background: "rgba(34,197,94,0.03)",
                    border: "1px solid rgba(34,197,94,0.06)",
                  }}
                >
                  <span style={{ color: "#22C55E" }}>•</span>
                  <span style={{ color: "#C8C8D8" }}>{s}</span>
                </div>
              ))
            ) : (
              <p className="text-xs pl-3" style={{ color: "#5E5E78" }}>暂无数据</p>
            )}
          </div>
        </div>

        {/* 劣势 */}
        <div>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "#EF4444" }}>
            ✗ 劣势
          </p>
          <div className="space-y-1.5">
            {weaknesses && weaknesses.length > 0 ? (
              weaknesses.map((w: string, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 text-xs"
                  style={{
                    background: "rgba(239,68,68,0.03)",
                    border: "1px solid rgba(239,68,68,0.06)",
                  }}
                >
                  <span style={{ color: "#EF4444" }}>•</span>
                  <span style={{ color: "#C8C8D8" }}>{w}</span>
                </div>
              ))
            ) : (
              <p className="text-xs pl-3" style={{ color: "#5E5E78" }}>暂无数据</p>
            )}
          </div>
        </div>
      </div>

      {/* 定位 */}
      {positioning && (
        <div>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.14)" }}>
            品牌定位
          </p>
          <div
            className="px-4 py-3 text-sm"
            style={{
              background: "rgba(56,189,248,0.03)",
              border: "1px solid rgba(56,189,248,0.08)",
              color: "#7DD3FC",
            }}
          >
            {positioning}
          </div>
        </div>
      )}
    </motion.section>
  );
}
```

### 验证方法

**测试1: Probe 模式**
1. localStorage 改 tier=probe
2. 跑一次 Full 扫描
3. 进入仪表盘
4. 应该看到"品牌诊断"模块，显示整体评价、优势、劣势、定位

**测试2: Light 模式**
1. 跑一次 Light 扫描
2. 进入仪表盘
3. 应该看不到这个模块

---

## 任务3: 新增 SourceAuthoritySection 组件

### 问题
用户想知道谁在讨论自己、讨论的多不多。

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 实现要求

1. **在 scan-dashboard.tsx 中新增组件**

```tsx
function SourceAuthoritySection({
  sourceAuthority,
}: {
  sourceAuthority: any;
}) {
  if (!sourceAuthority || !sourceAuthority.top_sources || sourceAuthority.top_sources.length === 0) {
    return null;
  }

  const { top_sources, total_sources, source_diversity } = sourceAuthority;

  // 多样性标签
  const diversityLabel = source_diversity >= 0.7 ? "高" : source_diversity >= 0.4 ? "中等" : "低";
  const diversityColor = source_diversity >= 0.7 ? "#22C55E" : source_diversity >= 0.4 ? "#F59E0B" : "#EF4444";

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.36 }}
      className="px-7 py-7 flex-shrink-0"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <SectionLabel>引用来源分析</SectionLabel>

      {/* 来源表格 */}
      <div className="rounded-sm overflow-hidden mb-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
        {/* 表头 */}
        <div
          className="grid gap-3 px-4 py-2 text-[10px] font-mono tracking-wider uppercase"
          style={{
            gridTemplateColumns: "1fr 80px 60px 60px",
            color: "rgba(255,255,255,0.3)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span>来源</span>
          <span>类型</span>
          <span className="text-center">权威度</span>
          <span className="text-center">提及</span>
        </div>

        {/* 数据行 */}
        {top_sources.slice(0, 8).map((s: any, i: number) => (
          <div
            key={i}
            className="grid gap-3 px-4 py-2 text-xs"
            style={{
              gridTemplateColumns: "1fr 80px 60px 60px",
              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              borderBottom: i < top_sources.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
            }}
          >
            <span className="font-mono" style={{ color: "#38BDF8" }}>{s.domain}</span>
            <span style={{ color: "#9A9AB0" }}>{s.source_type || "—"}</span>
            <span className="text-center font-mono" style={{ color: "#EDEDF5" }}>{s.authority_score ?? "—"}</span>
            <span className="text-center font-mono" style={{ color: "#EDEDF5" }}>{s.mention_count ?? "—"}</span>
          </div>
        ))}
      </div>

      {/* 统计信息 */}
      <div className="flex items-center gap-4">
        <span className="text-xs" style={{ color: "#9A9AB0" }}>
          来源总数：<span className="font-mono" style={{ color: "#EDEDF5" }}>{total_sources ?? "—"}</span>
        </span>
        <span className="text-xs" style={{ color: "#9A9AB0" }}>
          多样性：
          <span className="font-mono" style={{ color: diversityColor }}>
            {source_diversity != null ? (source_diversity * 100).toFixed(0) : "—"}%
          </span>
          <span className="ml-1" style={{ color: "#5E5E78" }}>（{diversityLabel}）</span>
        </span>
      </div>
    </motion.section>
  );
}
```

### 验证方法

**测试1: Probe 模式**
1. localStorage 改 tier=probe
2. 跑一次 Full 扫描
3. 进入仪表盘
4. 应该看到"引用来源分析"模块，显示来源列表、权威度、提及次数

**测试2: Light 模式**
1. 跑一次 Light 扫描
2. 进入仪表盘
3. 应该看不到这个模块

---

## 任务4: 在仪表盘中插入3个组件

### 问题
需要在仪表盘的正确位置插入这3个新模块。

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 实现要求

1. **在认知差距（SECTION 5）之后，诊断摘要（SECTION 6）之前插入**

找到这段代码（约第1028行）：
```tsx
        </motion.section>
      )}

      {/* SECTION 6 — 诊断摘要 */}
```

在它后面插入：
```tsx
      {/* ═══════════════════════════════════════════
          SECTION 5.1 — 竞品维度对比 (Probe产出)
          ═══════════════════════════════════════════ */}
      {!isFree && hasFullData && competitorAnalysis && competitorAnalysis.length > 0 ? (
        <CompetitorDimensionComparison
          competitorAnalysis={competitorAnalysis}
          brandName={brandName}
        />
      ) : !isFree ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="px-7 py-7 flex-shrink-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}
        >
          <SectionLabel>竞品维度对比</SectionLabel>
          <div className="flex items-center gap-3 py-6">
            <span className="text-2xl">⚔️</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "#9A9AB0" }}>等待竞品数据</p>
              <p className="text-xs mt-0.5" style={{ color: "#5E5E78" }}>运行 Probe 侦察兵后，竞品维度对比将自动生成</p>
            </div>
          </div>
        </motion.section>
      ) : null}

      {/* ═══════════════════════════════════════════
          SECTION 5.2 — 品牌诊断 (Probe产出)
          ═══════════════════════════════════════════ */}
      {!isFree && hasFullData && companyEvaluation ? (
        <BrandDiagnosis companyEvaluation={companyEvaluation} />
      ) : !isFree ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.34 }}
          className="px-7 py-7 flex-shrink-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}
        >
          <SectionLabel>品牌诊断</SectionLabel>
          <div className="flex items-center gap-3 py-6">
            <span className="text-2xl">🩺</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "#9A9AB0" }}>等待诊断数据</p>
              <p className="text-xs mt-0.5" style={{ color: "#5E5E78" }}>运行 Probe 侦察兵后，品牌优势劣势分析将自动生成</p>
            </div>
          </div>
        </motion.section>
      ) : null}

      {/* ═══════════════════════════════════════════
          SECTION 5.3 — 引用来源分析 (Probe产出)
          ═══════════════════════════════════════════ */}
      {!isFree && hasFullData && sourceAuthority ? (
        <SourceAuthoritySection sourceAuthority={sourceAuthority} />
      ) : !isFree ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.36 }}
          className="px-7 py-7 flex-shrink-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}
        >
          <SectionLabel>引用来源分析</SectionLabel>
          <div className="flex items-center gap-3 py-6">
            <span className="text-2xl">🔗</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "#9A9AB0" }}>等待来源数据</p>
              <p className="text-xs mt-0.5" style={{ color: "#5E5E78" }}>运行 Probe 侦察兵后，引用来源分析将自动生成</p>
            </div>
          </div>
        </motion.section>
      ) : null}
```

2. **在组件顶部添加变量解构**

找到这段代码（约第375行）：
```tsx
export function ScanDashboard({ data, tier, mode, domain, brandName, lastScanTime, onViewReport, onUpgrade }: Props) {
  const isFree = tier === "free";
  const isProbe = tier === "probe";
  const isFull = tier === "full";
  const probe = data?.probe || {};
```

在它后面添加：
```tsx
  // ── 新增 Probe 数据 ──
  const competitorAnalysis = probe?.competitor_analysis || [];
  const companyEvaluation = probe?.company_evaluation || null;
  const sourceAuthority = probe?.source_authority || null;
```

### 验证方法

**测试1: Probe 模式完整流程**
1. localStorage 改 tier=probe
2. 跑一次 Full 扫描
3. 进入仪表盘
4. 滚动查看，应该看到：
   - 品牌健康卡
   - 竞品对比折线图
   - AI认知画像
   - 引擎对比
   - 认知差距
   - **竞品维度对比** ← 新增
   - **品牌诊断** ← 新增
   - **引用来源分析** ← 新增
   - 诊断摘要（锁定）
   - 处方执行步骤（锁定）
   - 体检进度
   - 付费能力预告

**测试2: Light 模式**
1. 跑一次 Light 扫描
2. 进入仪表盘
3. 应该看不到这3个新模块（因为 isFree=true）

**测试3: 空数据**
1. 如果 Probe 没有返回 competitor_analysis
2. 竞品维度对比应该显示"等待竞品数据"占位符

---

## state.py 改动汇总

**不需要改后端！** 数据已经有了：
- `competitor_analysis` 在 Full 模式返回
- `company_evaluation` 在 Full 模式返回
- `source_authority` 在 Full 模式返回

---

## CHECKLIST 自检

**任务1 [CompetitorDimensionComparison]:**
- [ ] 组件在 scan-dashboard.tsx 中定义
- [ ] 正确读取 competitorAnalysis.dimension_scores
- [ ] 聚合所有查询的维度数据
- [ ] 计算每个维度每个品牌的平均分
- [ ] 找出每个维度的胜者
- [ ] 显示胜出统计
- [ ] 高重要性维度有黄色标记
- [ ] 空数据时返回 null

**任务2 [BrandDiagnosis]:**
- [ ] 组件在 scan-dashboard.tsx 中定义
- [ ] 正确读取 companyEvaluation
- [ ] 显示整体评价
- [ ] 显示优势（绿色）
- [ ] 显示劣势（红色）
- [ ] 显示品牌定位
- [ ] 空数据时返回 null

**任务3 [SourceAuthoritySection]:**
- [ ] 组件在 scan-dashboard.tsx 中定义
- [ ] 正确读取 sourceAuthority
- [ ] 显示来源表格（域名、类型、权威度、提及次数）
- [ ] 显示来源总数
- [ ] 显示多样性百分比和标签
- [ ] 空数据时返回 null

**任务4 [插入组件]:**
- [ ] 在认知差距之后、诊断摘要之前
- [ ] 添加变量解构（competitorAnalysis、companyEvaluation、sourceAuthority）
- [ ] Probe 模式显示数据
- [ ] Light 模式不显示
- [ ] 空数据显示占位符

---

## 交付格式

```
自检结果: X/8 任务1 + X/7 任务2 + X/6 任务3 + X/5 任务4 = XX/26
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改后端 API** — 数据已经有了
2. **不要改现有模块** — 品牌健康卡、AI认知画像等保持不变
3. **保持现有样式风格** — 用 inline style，不用 Tailwind
4. **动画延迟递增** — 竞品维度对比 0.32，品牌诊断 0.34，引用来源 0.36
5. **Light 模式不显示** — 这3个模块都是 Probe 产出
6. **空数据占位符** — Probe 模式但数据为空时，显示"等待数据"占位符

---

## 预期效果（Probe 模式仪表盘）

```
┌─────────────────────────────────────────────┐
│  品牌健康卡                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 62  │ │ 25% │ │ 12% │ │ 8%  │           │
│  │评分  │ │引用率│ │推荐率│ │Top率│           │
│  └─────┘ └─────┘ └─────┘ └─────┘           │
│  [为什么评分这么低？查看证据 ▼]               │
├─────────────────────────────────────────────┤
│  竞品对比折线图                               │
├─────────────────────────────────────────────┤
│  AI认知画像                                   │
│  AI怎么描述你：...                            │
│  AI理想描述：...                              │
│  关键词：[tag1] [tag2] [tag3]                │
├─────────────────────────────────────────────┤
│  引擎对比 · 交叉验证                          │
│  ChatGPT: 25%  Gemini: 20%  Claude: 22%     │
├─────────────────────────────────────────────┤
│  认知差距                                     │
│  对齐度：45/100                               │
│  差距分析：...                                │
├─────────────────────────────────────────────┤
│  竞品维度对比                    ← 新增       │
│  维度           你      Pela    Casetify      │
│  环保可持续     60      85 ✓    40            │
│  跌落保护       75      70      80 ✓          │
│  设计美观       85 ✓    60      90            │
│  胜出统计：你 1次，Pela 1次，Casetify 1次     │
├─────────────────────────────────────────────┤
│  品牌诊断                        ← 新增       │
│  整体评价：中等偏下，在环保领域有潜力但知名   │
│           度不足                             │
│  ✓ 优势                        ✗ 劣势        │
│  • 产品设计独特                • 品牌知名度低  │
│  • 价格有竞争力                • AI搜索可见度差│
│  品牌定位：性价比环保手机壳                    │
├─────────────────────────────────────────────┤
│  引用来源分析                    ← 新增       │
│  来源          类型      权威度    提及次数   │
│  reddit.com   论坛       75       3          │
│  amazon.com   电商平台   80       2          │
│  来源总数：8    多样性：65%（中等）            │
├─────────────────────────────────────────────┤
│  [升级解锁 Analyst 诊断报告]                  │
├─────────────────────────────────────────────┤
│  [升级解锁 Doctor 处方]                       │
├─────────────────────────────────────────────┤
│  体检进度                                     │
│  ●──────○──────○──────○                      │
│  初步体检  Probe  Analyst  Doctor             │
├─────────────────────────────────────────────┤
│  付费能力预告                                 │
└─────────────────────────────────────────────┘
```
