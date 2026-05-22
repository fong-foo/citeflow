# TASK_DASHBOARD_TIERS.md — 仪表盘按付费等级解锁

> 药老出品 · 2026-05-16
> 目标: 仪表盘按付费等级解锁内容，添加Probe产出的内容
> 预计工时: 3-4小时

---

## 设计原则

1. **仪表盘是公用的**，不是Probe单独的
2. **按付费等级解锁**，免费用户能看到所有内容，只是上锁
3. **Analyst和Doctor需要占位**，只是锁住
4. **Probe产出的内容**在免费版是锁定的，Probe版解锁

---

## 三种付费等级的仪表盘

### 免费版仪表盘（tier = "free"）

```
1. 品牌健康卡（显示）
   - 综合评分
   - 行业引用率
   - 推荐率
   - Top率
   - 品牌画像
   - 竞品TOP3

2. 竞品对比折线图（显示）

3. AI认知画像（锁定）← Probe产出
   - 显示模糊的mock数据
   - 升级解锁按钮

4. 引擎对比（锁定）← Probe产出
   - 显示模糊的mock数据
   - 升级解锁按钮

5. 认知差距（锁定）← Probe产出
   - 显示模糊的mock数据
   - 升级解锁按钮

6. 诊断摘要（锁定）← Analyst产出
   - 显示模糊的mock数据
   - 升级解锁按钮

7. 处方执行步骤（锁定）← Doctor产出
   - 显示模糊的mock数据
   - 升级解锁按钮

8. 体检进度
   - 初步体检 ✓
   - Probe 侦察兵 —
   - Analyst 诊断师 —
   - Doctor 处方 —

9. 付费能力预告
   - Probe 免费版 ✅
   - Probe 完整版 🔒
   - Analyst 🔒
   - Doctor 🔒
   - 升级解锁 Probe 侦察兵 · ¥50/次
```

### Probe版仪表盘（tier = "probe"）

```
1. 品牌健康卡（显示）
   - 综合评分
   - 行业引用率
   - 品牌引用率（新增）
   - 推荐率
   - Top率
   - 品牌画像
   - 竞品TOP3
   - 一句话诊断（新增）

2. 竞品对比折线图（显示，Full版5个指标）

3. AI认知画像（显示）← 解锁
   - AI认为你是谁
   - AI认为你的优势/劣势
   - AI理想描述

4. 引擎对比（显示）← 解锁
   - ChatGPT/Gemini/Claude引用率
   - 引擎一致性分析

5. 认知差距（显示）← 解锁
   - 对齐度分数
   - 偏差项/盲点

6. 诊断摘要（锁定）← Analyst产出
   - 显示模糊的mock数据
   - 升级解锁 Analyst 按钮

7. 处方执行步骤（锁定）← Doctor产出
   - 显示模糊的mock数据
   - 升级解锁 Doctor 按钮

8. 体检进度
   - 初步体检 ✓
   - Probe 侦察兵 ✓
   - Analyst 诊断师 —
   - Doctor 处方 —

9. 已解锁能力
   - Probe 免费版 ✅
   - Probe 完整版 ✅
   - Analyst 🔒（即将上线）
   - Doctor 🔒（即将上线）
   - 升级解锁全套诊断 · ¥299/月
```

### Full版仪表盘（tier = "full"）

```
所有内容都显示（未来开发）
```

---

## 需要修改的文件

| 文件 | 改动 |
|------|------|
| `components/scan-dashboard.tsx` | 添加AI认知画像、引擎对比、认知差距section |

---

## 任务1: 添加AI认知画像section

### 数据来源

```typescript
// 从data.probe中获取
const aiNarrative = probe?.ai_narrative;
const marketPerception = probe?.market_perception;
```

### 实现要求

```typescript
// scan-dashboard.tsx

{/* SECTION 3 — AI认知画像 */}
{!isFree && hasFullData && aiNarrative ? (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.2 }}
    className="px-7 py-7 flex-shrink-0"
    style={{
      background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <SectionLabel>AI认知画像</SectionLabel>
    
    {/* AI怎么描述你 */}
    {marketPerception?.perceived_identity && (
      <div className="mb-4">
        <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.14)" }}>
          AI怎么描述你
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "#9A9AB0" }}>
          {marketPerception.perceived_identity}
        </p>
      </div>
    )}
    
    {/* AI理想描述 */}
    {aiNarrative.ideal_description && (
      <div className="mb-4">
        <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.14)" }}>
          AI理想描述
        </p>
        <p className="text-sm leading-relaxed italic" style={{ color: "#9A9AB0" }}>
          "{aiNarrative.ideal_description}"
        </p>
      </div>
    )}
    
    {/* 关键词 */}
    {aiNarrative.keywords && aiNarrative.keywords.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {aiNarrative.keywords.map((k: string, i: number) => (
          <span
            key={i}
            className="px-2 py-0.5 text-[10px] font-mono"
            style={{
              background: "rgba(56,189,248,0.05)",
              border: "1px solid rgba(56,189,248,0.08)",
              color: "#7DD3FC",
            }}
          >
            {k}
          </span>
        ))}
      </div>
    )}
  </motion.section>
) : (
  <LockedSection
    title="AI认知画像"
    description="AI怎么描述你的品牌、理想描述、关键词"
    lockPrice={isFree ? "¥50/次" : undefined}
    onUpgrade={onUpgrade}
  />
)}
```

---

## 任务2: 添加引擎对比section

### 数据来源

```typescript
// 从data.probe中获取
const engineResults = probe?.engine_results;
```

### 实现要求

```typescript
// scan-dashboard.tsx

{/* SECTION 4 — 引擎对比 */}
{!isFree && hasFullData && engineResults ? (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.25 }}
    className="px-7 py-7 flex-shrink-0"
    style={{
      background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <SectionLabel>引擎对比 · 交叉验证</SectionLabel>
    
    <div className="grid grid-cols-3 gap-4">
      {["gpt", "gemini", "haiku"].map((engine) => {
        const er = engineResults[engine];
        if (!er) return null;
        
        return (
          <div
            key={engine}
            className="p-4"
            style={{
              background: "rgba(255,255,255,0.015)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: "rgba(255,255,255,0.14)" }}>
              {engine === "gpt" ? "ChatGPT" : engine === "gemini" ? "Gemini" : "Claude"}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "#9A9AB0" }}>引用率</span>
                <span className="text-xs font-mono" style={{ color: "#EDEDF5" }}>
                  {(er.citation_rate || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "#9A9AB0" }}>推荐率</span>
                <span className="text-xs font-mono" style={{ color: "#EDEDF5" }}>
                  {(er.recommendation_rate || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </motion.section>
) : (
  <LockedSection
    title="引擎对比"
    description="ChatGPT/Gemini/Claude三引擎交叉验证"
    lockPrice={isFree ? "¥50/次" : undefined}
    onUpgrade={onUpgrade}
  />
)}
```

---

## 任务3: 添加认知差距section

### 数据来源

```typescript
// 从data.probe中获取
const gapReport = probe?.gap_report;
```

### 实现要求

```typescript
// scan-dashboard.tsx

{/* SECTION 5 — 认知差距 */}
{!isFree && hasFullData && gapReport ? (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.3 }}
    className="px-7 py-7 flex-shrink-0"
    style={{
      background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <SectionLabel>认知差距</SectionLabel>
    
    {/* 对齐度 */}
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.14)" }}>
          对齐度
        </span>
        <span className="text-lg font-mono font-light" style={{ color: "#38BDF8" }}>
          {gapReport.alignment_score || 0}
          <span className="text-xs ml-1" style={{ color: "#5E5E78" }}>/100</span>
        </span>
      </div>
      <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${gapReport.alignment_score || 0}%`,
            background: (gapReport.alignment_score || 0) >= 60 ? "#22C55E" : (gapReport.alignment_score || 0) >= 40 ? "#F59E0B" : "#EF4444",
          }}
        />
      </div>
    </div>
    
    {/* 一句话总结 */}
    {gapReport.one_line_summary && (
      <p className="text-sm leading-relaxed" style={{ color: "#9A9AB0" }}>
        {gapReport.one_line_summary}
      </p>
    )}
  </motion.section>
) : (
  <LockedSection
    title="认知差距"
    description="品牌自述 vs AI认知的差距分析"
    lockPrice={isFree ? "¥50/次" : undefined}
    onUpgrade={onUpgrade}
  />
)}
```

---

## 任务4: 调整section顺序

### 实现要求

```typescript
// scan-dashboard.tsx - 调整section顺序

return (
  <div>
    {/* SECTION 1 — 品牌健康卡 */}
    <HealthCardSection ... />
    
    {/* SECTION 2 — 竞品对比折线图 */}
    <CompetitorChartSection ... />
    
    {/* SECTION 3 — AI认知画像（Probe产出） */}
    <AIPerceptionSection ... />
    
    {/* SECTION 4 — 引擎对比（Probe产出） */}
    <EngineComparisonSection ... />
    
    {/* SECTION 5 — 认知差距（Probe产出） */}
    <GapReportSection ... />
    
    {/* SECTION 6 — 诊断摘要（Analyst产出） */}
    <DiagnosisSection ... />
    
    {/* SECTION 7 — 处方执行步骤（Doctor产出） */}
    <PrescriptionSection ... />
    
    {/* SECTION 8 — 体检进度 */}
    <ProgressSection ... />
    
    {/* SECTION 9 — 付费能力预告/已解锁能力 */}
    <UnlockSection ... />
  </div>
);
```

---

## 验证方法

### 测试1: 免费版仪表盘

```
1. 设置tier=free
2. 完成Light扫描
3. 查看仪表盘
4. 应该看到：
   - 品牌健康卡（显示）
   - 竞品对比折线图（显示）
   - AI认知画像（锁定）
   - 引擎对比（锁定）
   - 认知差距（锁定）
   - 诊断摘要（锁定）
   - 处方执行步骤（锁定）
   - 体检进度
   - 付费能力预告
```

### 测试2: Probe版仪表盘

```
1. 设置tier=probe
2. 完成Full扫描
3. 查看仪表盘
4. 应该看到：
   - 品牌健康卡（显示）
   - 竞品对比折线图（显示）
   - AI认知画像（显示）
   - 引擎对比（显示）
   - 认知差距（显示）
   - 诊断摘要（锁定）
   - 处方执行步骤（锁定）
   - 体检进度
   - 已解锁能力
```

---

## CHECKLIST 自检

**任务1 AI认知画像:**
- [ ] 免费版显示锁定状态
- [ ] Probe版显示AI描述、理想描述、关键词
- [ ] 升级按钮正确

**任务2 引擎对比:**
- [ ] 免费版显示锁定状态
- [ ] Probe版显示三引擎引用率和推荐率
- [ ] 升级按钮正确

**任务3 认知差距:**
- [ ] 免费版显示锁定状态
- [ ] Probe版显示对齐度和一句话总结
- [ ] 升级按钮正确

**任务4 section顺序:**
- [ ] 品牌健康卡 → 竞品对比 → AI认知画像 → 引擎对比 → 认知差距 → 诊断摘要 → 处方 → 进度 → 预告

---

## 交付格式

```
自检结果: X/3 任务1 + X/3 任务2 + X/3 任务3 + X/4 任务4 = XX/13
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. 不改后端API，只改前端
2. 仪表盘是公用的，按付费等级解锁
3. Analyst和Doctor需要占位，只是锁住
4. Probe产出的内容在免费版是锁定的，Probe版解锁
5. 锁定区域显示模糊的mock数据，不是空白
