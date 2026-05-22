# TASK_REPORT_RESTRUCTURE.md — 报告改造：按查询类型分开展示

> 药老出品 · 2026-05-08
> 目标: A/B/C 三类查询用不同维度展示，消除无意义的 B/C 引用率
> 预计工时: 3-4h

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 报告改造：A/B/C 分区展示 | report_generator（HTML生成） | 2h |
| 2 | Analyst 新增 B/C 类分析规则 | analyst_node.py + ANALYST_RULES.md | 1h |
| 3 | 验证 + 自检 | - | 1h |

**完成标准**: 报告中 A类展示引用率，B类展示 AI 认知画像，C类展示竞品胜负矩阵。B/C 类不再显示引用率。

---

## 背景：为什么当前报告"非常差劲"

当前报告的"引用率分析"区域：

```
A类 行业通用: 10.0%  ← 有意义
B类 品牌直接: 100.0% ← 完全没意义（搜"YesWelder review"当然会提到 YesWelder）
C类 竞品主导: 100.0% ← 完全没意义（搜"YesWelder vs Lincoln"当然会提到 YesWelder）
```

用户看到 B/C 100% 会觉得"很好啊"，但这两个数字没有任何信息量。
真正有价值的数据（AI 怎么描述你、竞品对比赢了什么输了什么）被埋在其他区域，没有按查询类型组织。

---

## 设计：三类查询的正确展示方式

### A类（行业通用查询）→ 引用率战场
展示内容：
- A类引用率（品牌在行业通用查询中被提及的比例）
- A类推荐率（被推荐的比例）
- A类 Top1 率（排第一的比例）
- 引用源分布（从哪些网站引用的）
- 多引擎对比（GPT/Gemini/Haiku 的差异）

**这是用户最关心的数字**——"用户问行业问题时，AI 会不会提到我？"

### B类（品牌直接查询）→ AI 认知画像
展示内容：
- AI 认知身份（AI 认为你是谁？一句话）
- AI 感知的优势（AI 说你好在哪里）
- AI 感知的劣势（AI 说你差在哪里）
- AI 感知的定位（AI 把你放在什么位置）
- 与品牌自述的偏差（品牌说自己是 X，AI 说你是 Y）

数据来源：MarketPerception（market_mirror 已经采集了这些数据）

**用户关心的是**——"AI 怎么描述我？说对了吗？"

### C类（竞品对比查询）→ 竞品胜负矩阵
展示内容：
- 总对比次数 + 胜/负/平统计
- 赢在哪些维度（如：价格、多工艺能力）
- 输在哪些维度（如：焊接性能、耐用性、焊缝质量）
- 每个维度的差距分数（不是 0/100，是连续分值）
- 竞品在哪些场景被优先推荐

数据来源：CompetitorResult（competitor_analysis 已经采集了 dimension_scores）

**用户关心的是**——"跟竞品比，我赢在哪输在哪？"

---

## 任务1: 报告改造

### 需要改的文件
报告 HTML 生成代码（找到实际生成 `YesWelder_CiteFlow_报告.html` 的脚本）

### 实现要求

#### 1.1 引用率区域改为三栏分区

当前：
```
┌─────────────┬─────────────┬─────────────┐
│ A类 10.0%   │ B类 100.0%  │ C类 100.0%  │
└─────────────┴─────────────┴─────────────┘
```

改为：
```
┌──────────────────────────────────────────────────────────┐
│ A类 · 行业通用查询 — 引用率战场                           │
│                                                          │
│  引用率: 10%  │  推荐率: 10%  │  Top1率: 10%            │
│  引用源: amazon.com, weldguru.com                        │
│  多引擎: GPT 10% │ Gemini 10% │ Haiku 10%              │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ B类 · 品牌直接查询 — AI 认知画像                           │
│                                                          │
│  AI 认知身份: 预算友好的焊接设备品牌，面向 DIY 爱好者     │
│  感知优势: 价格亲民、多工艺、社区活跃                     │
│  感知劣势: 不适合专业任务、质量争议                       │
│  定位偏差: 品牌自述"专业级" vs AI 认知"平价DIY"           │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ C类 · 竞品对比查询 — 胜负矩阵                             │
│                                                          │
│  总对比: 15次  │  胜: 2  │  负: 7  │  平: 6              │
│  赢在: 价格(85) │ 多工艺能力(80)                         │
│  输在: 焊接性能(35) │ 耐用性(40) │ 焊缝质量(30)          │
└──────────────────────────────────────────────────────────┘
```

#### 1.2 B类数据来源

从 `ProbeOutput.market_perception` 取数据：
```python
mp = output.get("market_perception", {})
# 展示:
mp.get("perceived_identity")      # AI 认知身份
mp.get("perceived_strengths")     # 感知优势
mp.get("perceived_weaknesses")    # 感知劣势
mp.get("perceived_positioning")   # 感知定位
```

从 `ProbeOutput.gap_report` 取偏差数据：
```python
gr = output.get("gap_report", {})
# 展示:
gr.get("misaligned")   # 偏差领域
gr.get("blind_spots")  # 盲点
```

#### 1.3 C类数据来源

从 `ProbeOutput.competitor_analysis` 聚合：
```python
comp = output.get("competitor_analysis", [])
# 统计:
wins = sum(1 for c in comp if c["winner"].lower() == brand_name.lower())
losses = sum(1 for c in comp if c["winner"] not in [brand_name, "tie", "unknown", ""])
ties = len(comp) - wins - losses

# 维度聚合（从 dimension_scores 中提取）:
dim_scores_all = {}  # {dimension: {brand: [scores]}}
for c in comp:
    for ds in c.get("dimension_scores", []):
        dim = ds["dimension"]
        for r in ds.get("rankings", []):
            brand = r["brand"]
            score = r["score"]
            dim_scores_all.setdefault(dim, {}).setdefault(brand, []).append(score)

# 计算每个维度的平均分
dim_avg = {}
for dim, brands in dim_scores_all.items():
    dim_avg[dim] = {b: sum(s)/len(s) for b, s in brands.items()}

# 分出赢/输维度（品牌 vs 竞品平均）
```

#### 1.4 竞品差距分数改为连续值

当前 `CompetitorGap` 输出的是 0/100 二元分数，需要改成基于 dimension_scores 的连续分值。

从 `dimension_scores` 聚合：
- 对每个维度，计算品牌平均分 vs 竞品平均分
- 差距 = 品牌平均分 - 竞品平均分（正数=领先，负数=落后）

#### 1.5 删除无意义的 B/C 引用率展示

在报告中：
- 删除 "B类 品牌直接: 100.0%" 的展示
- 删除 "C类 竞品主导: 100.0%" 的展示
- A类引用率保留，但标注"行业通用查询"使其含义更清晰

---

## 任务2: Analyst 新增 B/C 类分析规则

### 需要改的文件
- `langgraph_app/nodes/analyst_node.py`
- `ANALYST_RULES.md`

### 新增规则

#### 规则 13: B类 AI 认知偏差分析

```
条件: B类查询存在（品牌直接查询）
分析:
  1. 从 market_perception 提取 AI 对品牌的描述
  2. 与 brand_profile.one_liner 对比，找出偏差
  3. 识别 AI 强调的但品牌没强调的点（新增盲点）
  4. 识别品牌强调的但 AI 没提到的点（传播盲点）

输出:
  - b_class_perception: {
      ai_identity: str,           # AI 认为你是谁
      brand_self_identity: str,   # 你说自己是谁
      gap_description: str,       # 偏差描述
      ai_strengths: list[str],    # AI 说你的优势
      ai_weaknesses: list[str],   # AI 说你的劣势
      blind_spots: list[str],     # 品牌强调但 AI 没提的
    }
```

#### 规则 14: C类竞品胜负矩阵分析

```
条件: C类查询存在（竞品对比查询）
分析:
  1. 从 competitor_analysis 聚合胜负统计
  2. 从 dimension_scores 提取各维度的分值差异
  3. 找出关键劣势维度（差距最大的）
  4. 找出关键优势维度（领先最多的）

输出:
  - c_class_matrix: {
      total_comparisons: int,
      wins: int,
      losses: int,
      ties: int,
      winning_dimensions: list[{dimension, brand_score, competitor_avg_score, gap}],
      losing_dimensions: list[{dimension, brand_score, competitor_avg_score, gap}],
      key_insight: str,           # 一句话胜负洞察
    }
```

### AnalystOutput 新增字段

```python
class AnalystOutput(BaseModel):
    # ... 现有字段 ...
    b_class_perception: Optional[dict] = None  # B类 AI 认知画像
    c_class_matrix: Optional[dict] = None       # C类 竞品胜负矩阵
```

---

## state.py 改动汇总

需要新增字段：

```python
class AnalystOutput(BaseModel):
    # ... 现有字段保持不变 ...
    b_class_perception: Optional[dict] = None  # B类分析结果
    c_class_matrix: Optional[dict] = None       # C类分析结果
```

---

## CHECKLIST 自检

**任务1 [报告改造]:**
- [ ] A类区域展示引用率+推荐率+Top1率+多引擎对比
- [ ] B类区域展示 AI 认知画像（从 MarketPerception 取数据）
- [ ] C类区域展示竞品胜负矩阵（从 CompetitorResult 聚合）
- [ ] B/C 类不再显示引用率
- [ ] 竞品差距分数为连续值（非 0/100）
- [ ] HTML 视觉设计清晰，三区域有明确分区

**任务2 [Analyst 规则]:**
- [ ] 规则 13 实现：B类 AI 认知偏差分析
- [ ] 规则 14 实现：C类竞品胜负矩阵分析
- [ ] AnalystOutput 新增 b_class_perception 和 c_class_matrix 字段
- [ ] ANALYST_RULES.md 更新

---

## 交付格式

```
自检结果: X/6 任务1 + X/4 任务2 = XX/10
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要删除 MarketPerception 和 CompetitorResult**——数据采集不变，只改展示
2. **不要改 Probe 数据流**——数据已经采了，问题在展示层
3. **向后兼容**——如果 Analyst 没有 b_class_perception/c_class_matrix（旧数据），报告用 Probe 原始数据兜底
4. **竞品差距分数**：从 dimension_scores 聚合，不要用 CompetitorGap 的 0/100 分
5. **HTML 设计参考**：用卡片式布局，每个类型一个卡片，视觉上一目了然
6. **先确认报告生成脚本**：找到实际生成 `YesWelder_CiteFlow_报告.html` 的代码，可能不在 CiteFlow 目录内
