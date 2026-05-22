# TASK_ANALYST_THREE_LAYER_FIX.md — Analyst 三层推理链补全 + 新数据适配

> 药老出品 · 2026-05-07
> 目标: Analyst 能正确输出 three_layer_chain，并且用上 Probe 新增的三分类引用率和维度打分矩阵
> 预计工时: 1.5h

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | Few-Shot 示例补 three_layer_chain | analyst_node.py | 15min |
| 2 | build_context 适配新数据 | analyst_context.py | 30min |
| 3 | 推理规则加三分类引用率解读 | analyst_node.py | 20min |
| 4 | 验证 + 自检 | - | 15min |

**完成标准**: 跑 test_real_brand.py 后，Analyst 输出包含 three_layer_chain 且三个字段非空；build_context 输出包含三分类引用率和维度打分矩阵。

---

## 任务1: Few-Shot 示例补 three_layer_chain

### 问题

SYSTEM_PROMPT 的输出格式要求 three_layer_chain 必填，但 Stripe 示例的 JSON 里没有这个字段。模型会困惑：示例没有，为什么我要加？

### 需要改的文件
`langgraph_app/nodes/analyst_node.py`

### 实现要求

在 Stripe 示例的 JSON 输出中，`diagnosis` 字段前面加上 `three_layer_chain`：

```json
{
  "three_layer_chain": {
    "observation": "引用率 85% 看起来不错，但 40% 的引用来自 Reddit（论坛，权威分40）和 StackOverflow（论坛，权威分40）。G2/Capterra/Trustpilot 完全缺失。市场力只有 35 分，是所有维度中最低的。",
    "explanation": "开发者社区在积极讨论 Stripe 的技术问题，推高了引用率。但 Reddit 和 StackOverflow 是草根讨论平台，权威分只有 40——AI 从论坛了解 Stripe，而不是从权威评测平台。技术文档（docs.stripe.com）占主导（12次引用）进一步强化了'API 工具'的定位。",
    "implication": "AI 知道 Stripe 很好用，但不确定它值不值得企业信任。用户问'跨境支付哪个好'时，AI 会说'Stripe 是开发者最爱的支付 API'而非'Stripe 是全球领先的金融基础设施'。如果 Adyen 或 PayPal 在 G2 上积累更多企业评价，AI 的推荐口径会向它们倾斜。"
  },
  "diagnosis": {
    ...（现有内容不变）
  },
  ...
}
```

### 验证方法
- 读 analyst_node.py，确认 Stripe 示例 JSON 包含 three_layer_chain
- three_layer_chain 三个字段都非空
- 三个字段分别体现：观察（数据异常）、解释（根因）、含义（不修的后果）

---

## 任务2: build_context 适配 Probe 新增数据

### 问题

Probe 新增了两个重要数据：
1. 三分类引用率（industry_rate / brand_rate / competitor_scenario_rate）
2. 维度打分矩阵（dimension_scores）

但 build_context 没有把这些数据传给 Analyst，导致 Analyst 还在用旧数据做诊断。

### 需要改的文件
`langgraph_app/tools/analyst_context.py`

### 实现要求

#### 2.1 三分类引用率

在 `=== 关键指标 ===` 部分，引用率那行之后，加上三分类引用率：

```
引用率: 93.3%（28/30 提及，7/30 推荐）
  分类引用率: A(行业通用)=20% | B(品牌直接)=100% | C(竞品主导)=33%
  推荐率: 23.3%（7/30）
```

数据来源：
- `citation_metrics.industry_rate`
- `citation_metrics.brand_rate`
- `citation_metrics.competitor_scenario_rate`
- `citation_metrics.recommendation_rate`

#### 2.2 维度打分矩阵

在 `=== 竞品对比 ===` 部分，如果有 dimension_scores 数据，展示维度打分矩阵：

```
=== 竞品对比 ===
总计 15 次对比: 7 胜 3 负

维度打分矩阵:
  环保可持续: Pela Case 90 | Casetify 60 | OtterBox 40
  跌落保护: Pela Case 70 | Casetify 85 | OtterBox 95
  设计美学: Pela Case 85 | Casetify 90 | OtterBox 50
```

数据来源：
- `competitor_analysis[].dimension_scores`
- 每个 DimensionComparison 有 dimension、rankings（brand/rank/score/summary）

注意：dimension_scores 可能为空列表（旧数据或竞品分析失败），需要判空。

### 验证方法
- 跑 test_real_brand.py，打印 build_context 输出
- 确认包含三分类引用率（A/B/C 三行）
- 确认包含维度打分矩阵（如果有竞品数据）
- 确认空数据时不报错（dimension_scores 为空时跳过）

---

## 任务3: 推理规则加三分类引用率解读

### 问题

Probe 新增了三分类引用率（industry_rate / brand_rate / competitor_scenario_rate），但 SYSTEM_PROMPT 的推理规则里没有针对这个指标的解读规则。Analyst 不知道怎么用这个数据。

### 需要改的文件
`langgraph_app/nodes/analyst_node.py`

### 实现要求

在 SYSTEM_PROMPT 的推理规则部分（规则 9 之后），新增规则 10：

```
### 规则 10: 三分类引用率解读

引用率现在区分三种：
  - industry_rate: A类（行业通用查询，不含品牌名）的引用率 — 最有意义的指标
  - brand_rate: B类（品牌直接查询）的引用率 — 测认知准确性
  - competitor_scenario_rate: C类（竞品主导查询）的引用率 — 测竞品场景中的存在感

解读:
  - industry_rate 高 → 品牌在行业中有影响力，AI 会主动推荐
  - industry_rate 低但 brand_rate 高 → 品牌只在被直接搜索时才被提及，缺乏行业影响力
  - competitor_scenario_rate 高 → 品牌在竞品比较中经常被提及，有竞争力
  - 三个都低 → 品牌在 AI 视野中基本不存在

注意: 旧版的总引用率（rate）容易虚高，因为 B 类查询直接含品牌名，AI 必然提及。
industry_rate 才是真正有意义的引用率指标。在诊断中区分"品牌认知率"和"行业影响力"。
```

注意：只加规则 10，不改其他规则编号。
- ANALYST_RULES.md 的规则 10（数据质量警示）已整合到 build_context 的 completeness_note
- ANALYST_RULES.md 的规则 11（预期效果评估）已合并到规则 8（量化预期）
- SYSTEM_PROMPT 和 ANALYST_RULES.md 不需要编号对齐

### 验证方法
- 读 analyst_node.py，确认 SYSTEM_PROMPT 包含规则 10（三分类引用率解读）
- 确认规则 10 包含四种解读场景
- 确认现有规则 1-9 编号不变

---

## CHECKLIST 自检

**任务1 [Few-Shot 示例]:**
- [ ] Stripe 示例 JSON 包含 three_layer_chain 字段
- [ ] three_layer_chain 三个字段都非空
- [ ] observation 体现数据异常（不是罗列数据）
- [ ] explanation 体现根因分析
- [ ] implication 体现不修的后果

**任务2 [build_context]:**
- [ ] 三分类引用率（A/B/C）已添加到关键指标部分
- [ ] 推荐率已添加到关键指标部分
- [ ] 维度打分矩阵已添加到竞品对比部分
- [ ] dimension_scores 为空时不报错
- [ ] 跑 test_real_brand.py 验证输出正确

**任务3 [推理规则]:**
- [ ] 规则 10（三分类引用率解读）已添加到 SYSTEM_PROMPT
- [ ] 规则 10 包含四种解读场景
- [ ] 现有规则 1-9 编号不变

---

## 交付格式

```
自检结果: X/5 任务1 + X/5 任务2 + X/4 任务3 = XX/14
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改 ThreeLayerChain 模型** — state.py 里的定义已经正确，不要动
2. **不要改自检 5 项检查** — analyst_node.py 里的自检逻辑已经正确，不要动
3. **不要改 build_context 的签名** — 输入输出格式保持一致，只是内部增加字段
4. **维度打分矩阵要判空** — dimension_scores 可能为空列表，不能报错
5. **三分类引用率要判零** — 如果 industry_rate 等为 0，可能是旧数据或计算失败，显示 0 即可，不要跳过
