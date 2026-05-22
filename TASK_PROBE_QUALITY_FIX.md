# TASK_PROBE_QUALITY_FIX.md — Probe 数据质量改进

> 药老出品 · 2026-05-05
> 来源：Pela Case 真实数据测试审计
> 核心问题：数据链路通了，但分析深度有误导风险
> 更新：2026-05-06 补充4个新问题，标记2个已解决项

---

## 问题概览

| # | 问题 | 严重度 | 状态 | 改什么 |
|---|------|--------|------|--------|
| 1 | 引用率虚高（100%因为查询词含品牌名） | 高 | 待修 | query_expander.py + state.py |
| 2 | reference_source严重偏向官网（70%） | 中 | 待修 | citation_analyzer.py + state.py |
| 3 | source_authority数据缺失 | 中 | ✅ 已解决 | 报告中有值（5来源，权威分都有） |
| 4 | 查询词重叠严重（6个查询本质相同） | 中 | 待修 | query_expander.py |
| 5 | company_score/ai_narrative未确认 | 低 | ✅ 已解决 | 报告中都有值（综合63分） |
| 6 | 竞品对比数据计算Bug（9胜6负显示为7胜8负） | 高 | 待修 | competitor_analysis.py |
| 7 | Analyst缺乏数据质量自检（不质疑100%引用率） | 中 | 待修 | Analyst prompt |
| 8 | 来源数据模块间不一致（market_mirror vs source_authority） | 中 | 待修 | 数据对齐逻辑 |
| 9 | company_score评分依据依赖虚高引用率 | 中 | 待修 | company_scorer.py |

---

## 问题1：引用率虚高

### 现状

30个查询里至少15个直接包含"Pela"：
```
"are Pela cases actually compostable"        ← 含Pela
"Pela case review after 6 months"            ← 含Pela
"Pela case vs OtterBox eco friendly"         ← 含Pela
"is Pela case a scam"                        ← 含Pela
"Pela case drop test results"                ← 含Pela
```

结果：30/30查询都提到Pela，引用率100%。

### 问题

- "AI被问到Pela时提到Pela" ≠ "AI推荐环保手机壳时主动提到Pela"
- 100%引用率没有业务意义，客户想知道的是后者
- 当前的引用率测试是"送分题"，不是"真正的考试"

### 需要改的文件

`langgraph_app/tools/query_expander.py` + `langgraph_app/state.py`

### 改法

把30个查询词分成3类，每类10个：

**A类：行业通用查询（不含品牌名）— 10个**
这是真正有意义的引用率测试。
```
"best eco-friendly phone cases 2025"
"compostable phone case review"
"sustainable phone accessories brands"
"biodegradable phone case for iPhone"
"eco friendly phone case that actually works"
"best non plastic phone case"
"phone case made from plants"
"zero waste phone case brands"
"environmentally friendly phone protection"
"green phone case recommendations"
```
→ 这些查询测的是：AI在不知道品牌的情况下，会不会主动推荐Pela

**B类：品牌直接查询 — 10个**
```
"Pela case review"
"Pela case compostable"
"Pela case drop test"
"Pela case warranty"
"is Pela case worth it"
"Pela case customer service"
"Pela case smell"
"Pela case discount code"
"Pela case vs Casetify"
"Pela case vs Tech21"
```
→ 这些查询测的是：AI被问到品牌时的认知准确性

**C类：竞品主导查询 — 10个**
```
"Casetify eco friendly phone case"
"Nimble phone case review"
"Tech21 sustainable case"
"OtterBox eco line"
"best phone case brands 2025"
"phone case market leaders"
"top rated phone cases"
"phone case brand comparison"
"premium phone case brands"
"phone case recommendations"
```
→ 这些查询测的是：AI推荐竞品时，Pela有没有被提到

### 引用率计算方式也要改

当前：mentioned_count / total_queries
改为：按类别分别计算

```python
a_queries = queries[:10]   # 行业通用
b_queries = queries[10:20]  # 品牌直接
c_queries = queries[20:30]  # 竞品主导

a_rate = mentioned_in_a / 10  # 行业引用率（最有意义）
b_rate = mentioned_in_b / 10  # 品牌认知率
c_rate = mentioned_in_c / 10  # 竞品场景提及率
```

在ProbeOutput中输出：
```python
class CitationMetrics(BaseModel):
    rate: float                    # 总引用率
    industry_rate: float           # A类：行业引用率（最有意义）
    brand_rate: float              # B类：品牌认知率
    competitor_scenario_rate: float # C类：竞品场景提及率
    total_queries: int
    mentioned_count: int
    details: list[CitationDetail]
```

### prompt改动

query_expander的prompt需要改，明确要求：
```
生成30个查询词，分3类：
- 10个行业通用查询（绝对不能包含品牌名）
- 10个品牌直接查询（必须包含品牌名）
- 10个竞品主导查询（以竞品名为主，不包含品牌名）
每类内部不要重复。
```

---

## 问题2：reference_source偏向官网

### 现状

30条引用中，pelacase.com占~70%。
AI主要从官网了解品牌，第三方来源很少。

### 问题

- 引用源多样性低
- 品牌认知高度依赖官网（官网说啥AI就信啥）
- 健康的品牌引用应该来自第三方

### 需要改的文件

`langgraph_app/tools/citation_analyzer.py` + `langgraph_app/state.py`

### 改法

在CitationMetrics中增加引用源分布统计：
```python
class CitationMetrics(BaseModel):
    ...
    source_distribution: dict[str, float]  # {"pelacase.com": 0.70, "reddit.com": 0.13, ...}
    official_site_ratio: float             # 官网引用占比（越低越好）
    third_party_ratio: float               # 第三方引用占比（越高越好）
```

在Analyst的SYSTEM_PROMPT中加一条规则：
```
### 规则 10: 引用源健康度
如果 official_site_ratio > 0.5，说明品牌认知高度依赖官网，AI缺乏第三方背书。
这不是好事——官网说"我是最好的"没有说服力，第三方说"它确实好"才有说服力。
诊断中标注"引用源不健康"，建议增加第三方曝光。
```

---

## 问题3：source_authority数据缺失

### 状态：✅ 已解决

测试报告确认有值：
- 总来源数：5
- 多样性指数：0.617
- pelacase.com: 权威分68, 21次提及, 占比70%
- reddit.com: 权威分38, 4次提及, 占比13%
- lucismorsels.com: 权威分49, 2次提及, 占比7%
- trustpilot.com: 权威分43, 2次提及, 占比7%
- junglehugger.com: 权威分23, 1次提及, 占比3%

---

## 问题4：查询词重叠严重

### 现状

30个查询词里有6个本质相同：
```
"best eco-friendly phone cases"
"what is the most eco friendly phone case"
"best phone case that doesn't harm the environment"
"eco friendly phone case that actually works"
"best sustainable phone case brands 2025"
"best non plastic phone case 2025"
```

### 问题

- 重复查询浪费API调用（6个查询只增加1个有效数据点）
- 不增加引用率分析的信息量
- 30个查询的实际信息量可能只有15-20个

### 需要改的文件

`langgraph_app/tools/query_expander.py`

### 改法

在query_expander的prompt中加去重要求：
```
生成的30个查询词必须互相不重复。
"不重复"的定义：两个查询的核心意图不同。
例如：
- "best eco-friendly phone cases" 和 "most eco friendly phone case" 是重复的
- "best eco-friendly phone cases" 和 "eco friendly phone case review" 不是重复的
```

或者后处理：用简单的相似度检测（如Jaccard相似度>0.7的视为重复）自动去重+补充。

---

## 问题5：确认company_score和ai_narrative

### 状态：✅ 已解决

测试报告确认都有值：
- company_score: 综合63分
  - 品牌力75 (w:0.35)
  - 产品力68 (w:0.15)
  - 内容力55 (w:0.25)
  - 技术力60 (w:0.05)
  - 市场力50 (w:0.20)
- ai_narrative: 理想描述+期望关键词+不希望AI说的 都有值

---

## 问题6（新增）：竞品对比数据计算Bug

### 现状

报告汇总显示：7胜 8负 0平
实际逐行统计：9胜 6负 0平

### 问题

HTML报告中：
- 汇总区域 `<div class="sc"><div class="n">7</div><div class="l">胜</div></div>` 显示7
- 汇总区域 `<div class="sc"><div class="n">8</div><div class="l">负</div></div>` 显示8
- 但表格中逐行数class="win"有9个，class="lose"有6个

### 需要改的文件

`langgraph_app/tools/competitor_analysis.py` 或报告生成逻辑

### 改法

1. 检查competitor_analysis.py的输出数据，确认原始数据是否正确
2. 检查报告生成代码的计数逻辑，是否有遗漏或重复计算
3. 如果是原始数据问题，修复competitor_analysis.py的评分逻辑
4. 如果是报告渲染问题，修复HTML生成代码的计数

---

## 问题7（新增）：Analyst缺乏数据质量自检

### 现状

Analyst核心诊断说："引用率100%看似完美"
完全没有质疑100%引用率的真实性。

### 问题

- Analyst被喂了虚高数据就直接输出结论
- 没有"数据质量警示"机制
- 客户看到100%引用率+Analyst说"看似完美"，会被严重误导

### 需要改的文件

`langgraph_app/prompts/analyst_prompt.py` 或 Analyst 的 SYSTEM_PROMPT

### 改法

在Analyst prompt中加数据质量自检规则：
```
### 规则 11: 数据质量警示
在输出诊断前，必须检查以下数据质量指标：
1. 引用率是否异常高（>90%）→ 如果是，检查查询词是否含品牌名
2. 官网引用占比是否过高（>50%）→ 如果是，标注"引用源不健康"
3. 来源数量是否过少（<5）→ 如果是，标注"数据样本不足"

如果发现数据质量问题，必须在诊断开头明确说明：
"⚠️ 数据质量警示：[具体问题]，以下分析结论可能不准确，建议先修正数据。"
```

---

## 问题8（新增）：来源数据模块间不一致

### 现状

market_mirror感知来源（8个）：
pelacase.com, trustpilot.com, reddit.com, lucismorsels.com, youtube.com, tiktok.com, agood.com, themodernhippieproject.com

source_authority来源（5个）：
pelacase.com, reddit.com, lucismorsels.com, trustpilot.com, junglehugger.com

### 问题

- youtube.com, tiktok.com, agood.com, themodernhippieproject.com 只出现在market_mirror
- junglehugger.com 只出现在source_authority
- 两个模块的数据来源不一致，客户会困惑

### 可能原因

1. market_mirror和source_authority使用不同的搜索结果集
2. 两个模块的来源过滤/去重逻辑不同
3. 可能是正常的（不同模块关注不同维度），但需要在报告中说明

### 改法

1. 确认两个模块的数据来源是否应该一致
2. 如果应该一致，统一数据源
3. 如果不应该一致（设计如此），在报告中加说明：
   - market_mirror: "AI在回答时引用的来源"
   - source_authority: "品牌被引用的权威来源"

---

## 问题9（新增）：company_score评分依据依赖虚高引用率

### 现状

内容力55分，评分依据：
"引用率100%但AI未采纳买一送一、使命宣言和品牌调性，盲点较多。"

### 问题

- 引用率100%是虚高的（问题1），评分依据就有问题
- 如果引用率按类别分开算，内容力的评分逻辑需要调整
- 修完问题1后，company_scorer的评分公式也要同步改

### 需要改的文件

`langgraph_app/tools/company_scorer.py`

### 改法

1. 评分公式中引用率权重调整：
   - 当前：引用率直接参与评分
   - 改为：使用industry_rate（A类行业通用引用率）作为主要指标

2. 评分依据描述更新：
   - 当前："引用率100%但AI未采纳..."
   - 改为："行业通用查询引用率X%，品牌直接查询引用率Y%，AI未采纳..."

3. 与问题1联动：
   - 问题1修完后，CitationMetrics会新增industry_rate/brand_rate/competitor_scenario_rate
   - company_scorer需要读取这些新字段

---

## 自检清单

- [ ] query_expander生成3类查询（A:行业通用 / B:品牌直接 / C:竞品主导）
- [ ] A类查询不含品牌名
- [ ] CitationMetrics增加industry_rate / brand_rate / competitor_scenario_rate
- [ ] 引用率按类别分别计算和展示
- [ ] CitationMetrics增加source_distribution / official_site_ratio / third_party_ratio
- [ ] Analyst规则10：引用源健康度检测
- [ ] 查询词去重（prompt要求 + 后处理）
- [ ] ~~source_authority数据确认有值~~ ✅ 已解决
- [ ] ~~company_score和ai_narrative确认有值~~ ✅ 已解决
- [ ] 竞品对比计数bug修复（9胜6负 vs 7胜8负）
- [ ] Analyst规则11：数据质量警示
- [ ] market_mirror与source_authority来源对齐/说明
- [ ] company_scorer评分逻辑同步调整（使用分类引用率）
- [ ] 重跑test_real_brand.py验证

---

## 交付格式

```
自检结果: X/14
失败项: (无 / 列出)
测试结果: industry_rate=???% | brand_rate=???% | official_ratio=???% | 竞品胜/负=?/? | Analyst有数据质量警示=是/否
```
