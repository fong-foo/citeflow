# TASK_SPLIT_HEALTH_CARD.md — 拆分品牌健康卡为3个独立section

> 药老出品 · 2026-05-18
> 目标: 免费用户仪表盘从1个大卡片变成3个独立section，视觉上更"满"、信息层次更清晰
> 预计工时: 2-3小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 拆分品牌健康卡为3个独立section | scan-dashboard.tsx | 2h |
| 2 | 调整动画延迟和布局 | scan-dashboard.tsx | 0.5h |
| 3 | 验证 Light 和 Full 模式 | 手动测试 | 0.5h |

**完成标准**: 免费用户仪表盘显示3个独立section（综合评分卡、引用率分析、竞品对比），视觉上更丰富

---

## 背景

### 问题
当前品牌健康卡把所有内容塞在一个 section 里：
- 4个 MetricCard（综合评分、行业引用率、推荐率、Top率）
- AI 眼中的你（brand_profile）
- 一句话诊断（verdict，仅付费用户）
- 证据溯源（EvidenceSection）
- 查看报告按钮

免费用户看到的仪表盘只有这一个大卡片 + 竞品对比图 + 几个锁定模块，显得"空"。

### 解决方案
拆成3个独立 section：

```
┌─────────────────────────────────────────────┐
│  ① 综合评分卡（Hero）                        │
│  ┌─────────────────────────────────┐        │
│  │         62 / 100                │        │
│  └─────────────────────────────────┘        │
│  AI 眼中的你：...                             │
│  行业：xxx  市场：xxx  核心产品：xxx           │
│  [tag1] [tag2] [tag3]                        │
├─────────────────────────────────────────────┤
│  ② 引用率分析                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │ 25% │ │ 12% │ │ 8%  │                   │
│  │引用率│ │推荐率│ │Top率│                   │
│  └─────┘ └─────┘ └─────┘                   │
│  [为什么引用率这么低？查看证据 ▼]             │
│  [查看免费报告 →]                             │
├─────────────────────────────────────────────┤
│  ③ 竞品对比折线图（已有，不动）               │
├─────────────────────────────────────────────┤
│  ④ AI认知画像（锁定/解锁）                    │
├─────────────────────────────────────────────┤
│  ...                                         │
└─────────────────────────────────────────────┘
```

---

## 任务1: 拆分品牌健康卡为3个独立section

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 实现要求

**目标结构：3个独立 section**

#### Section ①: 综合评分卡（Hero）

```tsx
{/* ═══════════════════════════════════════════
    SECTION 1 — 综合评分卡 (Hero)
    ═══════════════════════════════════════════ */}
<motion.section
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
  className="px-7 py-7 flex-shrink-0"
  style={{
    background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
    border: "1px solid rgba(255,255,255,0.06)",
  }}
>
  <SectionLabel>综合评分</SectionLabel>

  {/* 只保留综合评分这1个 MetricCard，居中显示 */}
  <div className="flex justify-center mb-6">
    <div className="w-48">
      <MetricCard label="综合评分" value={score} suffix="/100" highlight delay={0.05} />
    </div>
  </div>

  {/* AI 眼中的你 */}
  {profile && (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.45 }}
      className="mb-5 p-5"
      style={{
        background: "linear-gradient(135deg, rgba(56,189,248,0.03) 0%, rgba(56,189,248,0.005) 100%)",
        border: "1px solid rgba(56,189,248,0.08)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "#38BDF8", boxShadow: "0 0 6px rgba(56,189,248,0.4)" }}
        />
        <p className="text-[10px] font-mono tracking-[0.15em] uppercase" style={{ color: "rgba(56,189,248,0.45)" }}>
          AI 眼中的你
        </p>
      </div>

      {/* one_liner */}
      {profile.one_liner && (
        <p className="text-sm leading-relaxed mb-3" style={{ color: "#C8C8D8" }}>
          {profile.one_liner}
        </p>
      )}

      {/* meta row: industry + market + core_product */}
      <div className="flex flex-wrap gap-4 mb-3">
        {profile.inferred_industry && (
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#9A9AB0" }}>
            <span style={{ color: "rgba(56,189,248,0.35)" }}>行业</span>
            {profile.inferred_industry}
          </span>
        )}
        {profile.inferred_target_market && (
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#9A9AB0" }}>
            <span style={{ color: "rgba(56,189,248,0.35)" }}>市场</span>
            {profile.inferred_target_market}
          </span>
        )}
        {profile.inferred_core_product && (
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#9A9AB0" }}>
            <span style={{ color: "rgba(56,189,248,0.35)" }}>核心产品</span>
            {profile.inferred_core_product}
          </span>
        )}
      </div>

      {/* value_props */}
      {profile.value_props && profile.value_props.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.value_props.map((vp: string, i: number) => (
            <span
              key={i}
              className="px-2 py-0.5 text-[10px] tracking-wide"
              style={{
                background: "rgba(56,189,248,0.05)",
                border: "1px solid rgba(56,189,248,0.08)",
                color: "#7DD3FC",
              }}
            >
              {vp}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )}
  {profileLoading && (
    <div className="mb-5 p-4 flex items-center gap-2" style={{ color: "rgba(255,255,255,0.10)" }}>
      <span className="w-3 h-3 border rounded-full animate-spin" style={{ borderColor: "rgba(56,189,248,0.12)", borderTopColor: "#38BDF8" }} />
      <span className="text-[10px] font-mono tracking-wider">正在获取品牌画像…</span>
    </div>
  )}

  {/* 一句话诊断（仅付费用户） */}
  {!isFree && verdict && (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, duration: 0.4 }}
      className="p-4"
      style={{
        background: "linear-gradient(135deg, rgba(56,189,248,0.04) 0%, rgba(56,189,248,0.01) 100%)",
        borderLeft: "2px solid rgba(56,189,248,0.25)",
      }}
    >
      <p className="text-[10px] font-mono tracking-widest uppercase mb-1.5" style={{ color: "rgba(56,189,248,0.4)" }}>
        一句话诊断
      </p>
      <p className="text-sm leading-relaxed" style={{ color: "#C8C8D8" }}>{verdict}</p>
    </motion.div>
  )}
</motion.section>
```

#### Section ②: 引用率分析

```tsx
{/* ═══════════════════════════════════════════
    SECTION 1.5 — 引用率分析
    ═══════════════════════════════════════════ */}
<motion.section
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.15 }}
  className="px-7 py-7 flex-shrink-0"
  style={{
    background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
    border: "1px solid rgba(255,255,255,0.06)",
  }}
>
  <SectionLabel>引用率分析</SectionLabel>

  {/* 3个引用率 MetricCard */}
  <div className="grid grid-cols-3 gap-3 mb-5">
    <MetricCard label="行业引用率" value={industryRate} suffix="%" delay={0.05} />
    <MetricCard label="推荐率" value={recommendationRate} suffix="%" delay={0.1} />
    <MetricCard label="Top率" value={topRate} suffix="%" delay={0.15} />
  </div>

  {/* 证据溯源 */}
  <EvidenceSection
    citationMetrics={probe?.citation_metrics}
    brandName={brandName}
  />

  {/* CTA — view full report */}
  <motion.div
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.25, duration: 0.4 }}
    className="flex justify-end mt-5"
  >
    <motion.button
      onClick={onViewReport}
      className="group relative inline-flex items-center gap-2.5 px-6 py-3 text-sm font-medium tracking-wide"
      style={{
        color: "#C8C8D8",
        background: "rgba(56,189,248,0.05)",
        border: "1px solid rgba(56,189,248,0.14)",
      }}
      whileHover={{
        background: "rgba(56,189,248,0.14)",
        borderColor: "rgba(56,189,248,0.35)",
        boxShadow: "0 0 32px rgba(56,189,248,0.10)",
        scale: 1.02,
      }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.span
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        style={{
          border: "1px solid rgba(56,189,248,0.2)",
          animation: "pulseRing 2s ease-in-out infinite",
        }}
      />
      {isFree ? "查看免费报告" : "查看详细报告"}
      <motion.span
        animate={{ x: [0, 4, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ color: "#38BDF8" }}
      >
        →
      </motion.span>
    </motion.button>
  </motion.div>
</motion.section>
```

#### Section ③: 竞品对比折线图（不动）

保持现有代码不变。

---

### 具体改动步骤

1. **找到当前品牌健康卡代码**（约第895-1062行）

2. **拆成两段**：
   - 第一段：综合评分 + AI眼中的你 + 一句话诊断
   - 第二段：引用率（3个MetricCard）+ 证据溯源 + CTA按钮

3. **删除原有的4个 MetricCard 的 grid**（约第910-915行）
   ```tsx
   // 删除这段
   <div className="grid grid-cols-4 gap-3 mb-7">
     <MetricCard label="综合评分" value={score} suffix="/100" highlight delay={0.05} />
     <MetricCard label="行业引用率" value={industryRate} suffix="%" delay={0.1} />
     <MetricCard label="推荐率" value={recommendationRate} suffix="%" delay={0.16} />
     <MetricCard label="Top率" value={topRate} suffix="%" delay={0.19} />
   </div>
   ```

4. **在原有 section 结束后，新增"引用率分析" section**

5. **把 EvidenceSection 和 CTA 按钮移到新 section 里**

---

### 验证方法

**测试1: Light 模式**
1. 跑一次 Light 扫描
2. 进入仪表盘
3. 应该看到3个独立section：
   - 综合评分卡（1个大数字 + AI眼中的你）
   - 引用率分析（3个小数字 + 证据溯源 + CTA）
   - 竞品对比折线图

**测试2: Full 模式**
1. localStorage 改 tier=probe
2. 跑一次 Full 扫描
3. 进入仪表盘
4. 应该看到同样的3个section，加上解锁的其他模块

**测试3: 空数据**
1. 如果 profile 为空，"AI眼中的你"应该不显示
2. 如果 citation_metrics 为空，证据溯源应该不显示

---

## state.py 改动汇总

**不需要改后端！** 只是前端布局调整。

---

## CHECKLIST 自检

**任务1 [拆分品牌健康卡]:**
- [ ] 原品牌健康卡拆成"综合评分卡"和"引用率分析"两个独立section
- [ ] 综合评分卡：只有1个 MetricCard（综合评分），居中显示
- [ ] 综合评分卡：包含 AI 眼中的你
- [ ] 综合评分卡：包含一句话诊断（仅付费用户）
- [ ] 引用率分析：有3个 MetricCard（行业引用率、推荐率、Top率）
- [ ] 引用率分析：包含证据溯源
- [ ] 引用率分析：包含 CTA 按钮
- [ ] 竞品对比折线图保持不变

**任务2 [调整动画延迟]:**
- [ ] 综合评分卡：delay=0（第一个section）
- [ ] 引用率分析：delay=0.15（第二个section）
- [ ] 竞品对比折线图：delay=0.2（第三个section）
- [ ] 后续section延迟递增

**任务3 [验证]:**
- [ ] Light 模式显示3个独立section
- [ ] Full 模式显示3个独立section + 其他模块
- [ ] 空数据时相关section不显示

---

## 交付格式

```
自检结果: X/8 任务1 + X/4 任务2 + X/3 任务3 = XX/15
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改 MetricCard 组件** — 它是独立的，不要动
2. **不要改 EvidenceSection 组件** — 它是独立的，不要动
3. **不要改竞品对比折线图** — 保持现有代码
4. **保持现有样式风格** — 用 inline style，不用 Tailwind
5. **SectionLabel 保持一致** — 用现有的 SectionLabel 组件
6. **动画延迟递增** — 每个section间隔0.1-0.15秒

---

## 预期效果（拆分后）

```
┌─────────────────────────────────────────────┐
│  综合评分                                     │
│  ┌─────────────────────────────────┐        │
│  │         62 / 100                │        │
│  └─────────────────────────────────┘        │
│  AI 眼中的你                                 │
│  Flower Knows 是一个主打环保的手机壳品牌...   │
│  行业：消费电子  市场：全球  核心产品：手机壳  │
│  [环保] [可持续] [设计感]                     │
│  一句话诊断（付费用户）                       │
│  AI引用率显著低于品类平均水平                 │
├─────────────────────────────────────────────┤
│  引用率分析                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │ 25% │ │ 12% │ │ 8%  │                   │
│  │引用率│ │推荐率│ │Top率│                   │
│  └─────┘ └─────┘ └─────┘                   │
│  [为什么引用率这么低？查看证据 ▼]             │
│              [查看免费报告 →]                 │
├─────────────────────────────────────────────┤
│  竞品对比折线图                               │
│  （保持不变）                                 │
├─────────────────────────────────────────────┤
│  AI认知画像（锁定）                           │
├─────────────────────────────────────────────┤
│  引擎对比（锁定）                             │
├─────────────────────────────────────────────┤
│  认知差距（锁定）                             │
├─────────────────────────────────────────────┤
│  竞品维度对比（等待数据）                     │
├─────────────────────────────────────────────┤
│  品牌诊断（等待数据）                         │
├─────────────────────────────────────────────┤
│  引用来源分析（等待数据）                     │
├─────────────────────────────────────────────┤
│  诊断摘要（锁定）                             │
├─────────────────────────────────────────────┤
│  处方执行步骤（锁定）                         │
├─────────────────────────────────────────────┤
│  体检进度                                     │
├─────────────────────────────────────────────┤
│  付费能力预告                                 │
└─────────────────────────────────────────────┘
```
