# TASK_ANALYST_PHASE2.md — Analyst 第二轮改进：行业基准 + 竞品情报 + 规则6适配

> 药老出品 · 2026-05-07（v2 — 修复海老反馈的4个问题）
> 目标: Analyst 能告诉用户"你在行业中的位置"、"竞品具体做了什么"、"哪个维度最该追"
> 预计工时: 7h

---

## 任务概览

| # | 任务 | 文件 | 预计 | 依赖 |
|---|------|------|------|------|
| 1 | 规则 6 适配维度打分矩阵 | state.py + analyst_node.py | 1.5h | 无 |
| 2 | 行业基准对比 | config.py + analyst_context.py + analyst_node.py + brand_profiler.py | 2.5h | 无 |
| 3 | 竞品引用详情 | citation_analyzer.py + state.py + analyst_context.py + analyst_node.py | 3h | 无 |

**完成标准**: 跑 test_real_brand.py 后，Analyst 输出包含行业基准对比、竞品引用详情、维度级竞品差距分析。

---

## 任务1: 规则 6 适配维度打分矩阵

### 问题

规则 6 还在用旧的二元胜负逻辑（"输在哪"），但 Probe 已经输出了维度打分矩阵（dimension_scores）。需要升级规则 6，用维度分数替代二元胜负，做更细粒度的分析。

### 需要改的文件
1. `langgraph_app/state.py` — CompetitorGap 加 winning_dimensions 字段
2. `langgraph_app/nodes/analyst_node.py` — 更新规则 6 + 输出格式

### 实现要求

#### 1.1 state.py — CompetitorGap 加字段

```python
class CompetitorGap(BaseModel):
    losing_dimensions: list[str] = []
    winning_dimensions: list[str] = []  # 新增：优势维度
    root_cause: str = ""
    counter_strategy: str = ""
```

#### 1.2 更新 SYSTEM_PROMPT 中的规则 6

替换现有规则 6 为：

```
### 规则 6: 竞品分析（维度级）

不再只看"输在哪"，而是分析维度打分矩阵：

步骤 1: 计算维度差距
  对每个维度：
    user_score = 用户在该维度的分数
    competitor_best = 竞品在该维度的最高分
    gap = user_score - competitor_best

步骤 2: 找出关键维度
  - 差距 > 20 分 → 重大劣势（需要行动）
  - 差距 10-20 分 → 中等劣势（可以追赶）
  - 差距 < 10 分 → 小幅劣势（可以忽略或微调）
  - 差距 < 0 → 优势（不需要行动，但要保持）

步骤 3: 制定策略
  策略 A — 追赶策略（适合差距 10-20 分）:
    - 分析竞品在该维度做了什么
    - 创建比竞品更好的内容
    - 预期：3-6 个月追赶

  策略 B — 差异化策略（适合差距 > 20 分）:
    - 不在竞品最强的维度硬拼
    - 找到竞品弱但用户强的维度，加倍投入
    - 预期：建立差异化优势

  策略 C — 保持优势（适合差距 < 0）:
    - 继续保持当前策略
    - 定期监控竞品动向

步骤 4: 输出
  competitor_gap: {
    "losing_dimensions": ["维度1: 差距 X 分", "维度2: 差距 Y 分"],
    "winning_dimensions": ["维度3: 领先 Z 分"],
    "root_cause": "竞品在维度1的优势来自...",
    "counter_strategy": "建议采用差异化策略：在维度3加倍投入..."
  }
```

#### 1.3 更新 _build_user_message 的竞品对比展示

在维度打分矩阵展示后，加一行差距分析提示：

```python
# 在维度打分矩阵展示后加
if comp.get("dimension_matrix"):
    parts.append("")
    parts.append("请根据维度打分矩阵，分析每个维度的差距，找出关键劣势维度和优势维度。")
```

#### 1.4 更新输出格式中的 competitor_gap

在 SYSTEM_PROMPT 的输出格式中，更新 competitor_gap 结构：

```json
"competitor_gap": {
  "losing_dimensions": ["维度1: 差距 X 分", "维度2: 差距 Y 分"],
  "winning_dimensions": ["维度3: 领先 Z 分"],
  "root_cause": "根因分析",
  "counter_strategy": "应对策略（区分追赶/差异化/保持）"
}
```

### 验证方法
- 读 state.py，确认 CompetitorGap 有 winning_dimensions 字段
- 读 analyst_node.py，确认规则 6 包含维度差距计算逻辑
- 确认输出格式包含 winning_dimensions
- 确认 _build_user_message 有差距分析提示

---

## 任务2: 行业基准对比

### 问题

用户不知道"引用率 60% 在 B2B SaaS 行业算什么水平"。当前只给绝对值，没有相对参照。

### 需要改的文件
1. `langgraph_app/config.py` — 新增行业基准数据
2. `langgraph_app/tools/analyst_context.py` — 传基准给 Analyst
3. `langgraph_app/nodes/analyst_node.py` — 新增规则 11（行业基准对比）
4. `langgraph_app/tools/brand_profiler.py` — 新增行业映射函数

### 实现要求

#### 2.0 行业映射（解决粒度粗问题）

在 brand_profiler.py 中新增行业映射函数，把细粒度行业映射回三大类：

```python
# 行业映射：细粒度行业 → 三大类
INDUSTRY_CATEGORY_MAP = {
    # B2B SaaS
    "SaaS": "B2B SaaS",
    "软件即服务": "B2B SaaS",
    "企业软件": "B2B SaaS",
    "开发者工具": "B2B SaaS",
    "项目管理": "B2B SaaS",
    "协作工具": "B2B SaaS",
    "CRM": "B2B SaaS",
    "ERP": "B2B SaaS",
    # 跨境支付
    "跨境支付": "跨境支付",
    "支付": "跨境支付",
    "金融科技": "跨境支付",
    "金融基础设施": "跨境支付",
    "支付网关": "跨境支付",
    # DTC 品牌
    "DTC": "DTC品牌",
    "消费品": "DTC品牌",
    "环保消费品牌": "DTC品牌",
    "时尚": "DTC品牌",
    "美妆": "DTC品牌",
    "家居": "DTC品牌",
    "电子产品": "DTC品牌",
}

def map_industry_category(industry: str) -> str:
    """把细粒度行业映射回三大类。找不到则返回 '_default'。"""
    # 精确匹配
    if industry in INDUSTRY_CATEGORY_MAP:
        return INDUSTRY_CATEGORY_MAP[industry]
    # 模糊匹配
    for key, category in INDUSTRY_CATEGORY_MAP.items():
        if key in industry or industry in key:
            return category
    return "_default"
```

在 build_context 中调用：

```python
from langgraph_app.tools.brand_profiler import map_industry_category

industry = cs.get("industry", "未指定行业")
industry_category = map_industry_category(industry)
benchmark = INDUSTRY_BENCHMARKS.get(industry_category, INDUSTRY_BENCHMARKS["_default"])
```

#### 2.1 config.py — 新增行业基准

```python
# 行业基准数据（先用竞品分析结果估算，后续从数据飞轮更新）
# 注意：这些是估算值，在诊断中说明"基于有限数据估算，仅供参考"
# 分位数：P25=落后, P50=中位, P75=领先
INDUSTRY_BENCHMARKS = {
    "B2B SaaS": {
        "citation_rate": {"p25": 30, "p50": 45, "p75": 70},
        "industry_rate": {"p25": 15, "p50": 30, "p75": 50},
        "alignment_score": {"p25": 50, "p50": 65, "p75": 80},
        "overall_score": {"p25": 45, "p50": 60, "p75": 75},
        "recommendation_rate": {"p25": 10, "p50": 25, "p75": 45},
    },
    "跨境支付": {
        "citation_rate": {"p25": 25, "p50": 40, "p75": 65},
        "industry_rate": {"p25": 10, "p50": 25, "p75": 45},
        "alignment_score": {"p25": 45, "p50": 60, "p75": 75},
        "overall_score": {"p25": 40, "p50": 55, "p75": 70},
        "recommendation_rate": {"p25": 8, "p50": 20, "p75": 40},
    },
    "DTC品牌": {
        "citation_rate": {"p25": 35, "p50": 50, "p75": 75},
        "industry_rate": {"p25": 20, "p50": 35, "p75": 55},
        "alignment_score": {"p25": 55, "p50": 70, "p75": 85},
        "overall_score": {"p25": 50, "p50": 65, "p75": 80},
        "recommendation_rate": {"p25": 15, "p50": 30, "p75": 50},
    },
    # 默认基准（行业未知时使用）
    "_default": {
        "citation_rate": {"p25": 30, "p50": 45, "p75": 70},
        "industry_rate": {"p25": 15, "p50": 30, "p75": 50},
        "alignment_score": {"p25": 50, "p50": 65, "p75": 80},
        "overall_score": {"p25": 45, "p50": 60, "p75": 75},
        "recommendation_rate": {"p25": 10, "p50": 25, "p75": 45},
    },
}
```

#### 2.2 analyst_context.py — 传基准给 Analyst

在 build_context 返回值中加 benchmark 字段：

```python
from langgraph_app.config import INDUSTRY_BENCHMARKS
from langgraph_app.tools.brand_profiler import map_industry_category

def build_context(probe_output):
    ...
    industry = cs.get("industry", "未指定行业")
    industry_category = map_industry_category(industry)
    benchmark = INDUSTRY_BENCHMARKS.get(industry_category, INDUSTRY_BENCHMARKS["_default"])
    
    return {
        "metrics": {...},
        "benchmark": benchmark,  # 新增
        "industry_category": industry_category,  # 新增：映射后的行业类别
        ...
    }
```

#### 2.3 analyst_node.py — 展示基准 + 新增规则 11

在 _build_user_message 的关键指标部分，加基准对比：

```python
# 在关键指标部分加
benchmark = ctx.get("benchmark", {})
industry_category = ctx.get("industry_category", "_default")
if benchmark and industry_category != "_default":
    parts.append("")
    parts.append(f"=== 行业基准（{industry_category}，基于有限数据估算） ===")
    parts.append("指标 | 你的值 | 行业中位数 | 你的位置")
    parts.append("-" * 50)
    
    metrics_to_compare = [
        ("引用率", metrics["citation_rate"], "citation_rate"),
        ("行业引用率", metrics["industry_rate"], "industry_rate"),
        ("对齐度", metrics["alignment_score"], "alignment_score"),
        ("综合评分", metrics["overall_score"], "overall_score"),
        ("推荐率", metrics["recommendation_rate"], "recommendation_rate"),
    ]
    
    for name, value, key in metrics_to_compare:
        bm = benchmark.get(key, {})
        p50 = bm.get("p50", 0)
        if value >= bm.get("p75", 999):
            position = "领先（前25%）"
        elif value >= p50:
            position = "中上（高于中位数）"
        elif value >= bm.get("p25", 0):
            position = "中下（低于中位数）"
        else:
            position = "落后（后25%）"
        parts.append(f"{name} | {value} | {p50} | {position}")
else:
    parts.append("")
    parts.append("⚠️ 行业基准数据不足，无法对比行业位置。")
```

在 SYSTEM_PROMPT 中新增规则 11：

```
### 规则 11: 行业基准对比

对比用户数据和行业基准（P25/P50/P75）：
  - 指标 > P75 → 行业领先，在诊断中说明"你在行业中排名前 25%"
  - 指标 P50-P75 → 中上水平，说明"你高于行业中位数"
  - 指标 P25-P50 → 中下水平，说明"你低于行业中位数，有提升空间"
  - 指标 < P25 → 行业落后，说明"你处于行业后 25%，需要重点关注"

在 problem_detail 中说明用户在行业中的位置，帮助用户理解"我的引用率 60% 是好还是坏"。

注意：行业基准是估算值，基于有限数据。在诊断中说明"基于行业估算数据，仅供参考"。
如果行业基准数据不足（industry_category 为 _default），不要强行对比，只说"行业基准数据不足"。
```

### 验证方法
- 读 brand_profiler.py，确认 map_industry_category 函数存在
- 读 config.py，确认 INDUSTRY_BENCHMARKS 包含至少 3 个行业 + _default
- 读 analyst_context.py，确认 benchmark 和 industry_category 字段传给 Analyst
- 读 analyst_node.py，确认：
  - _build_user_message 展示行业基准对比表格
  - SYSTEM_PROMPT 包含规则 11
  - 规则 11 包含四种分位数解读
  - 行业基准数据不足时不强行对比

---

## 任务3: 竞品引用详情

### 问题

当前只知道"输在企业级信任"，但不知道竞品具体做了什么（引用率多少、从哪里被引用、权威分多少）。

**关键约束**：竞品分析走的是 competitor_query_gen.py → deepseek_answer.py，这条路径不经过 citation_analyzer。deepseek_answer 直接调 DeepSeek 做品牌对比，输出的是自然语言结论，不是结构化的引用数据。

### 解决方案

**方案A（推荐）**：改 citation_analyzer.py，在分析搜索结果时同时提取竞品域名的引用信息（复用已有搜索数据，不额外调API）。

数据流：
1. query_expander 生成查询词（三类：行业通用、品牌直接、竞品主导）
2. fc_search 搜索这些查询词
3. citation_analyzer 分析搜索结果，**同时提取品牌和竞品域名的引用信息**
4. 输出中包含竞品的 mention_count、top_sources、avg_authority

### 需要改的文件
1. `langgraph_app/tools/citation_analyzer.py` — 分析时同时提取竞品引用
2. `langgraph_app/nodes/probe_node.py` — 调用 analyze_citations 时传入 competitor_domains
3. `langgraph_app/state.py` — CitationMetrics 加 competitor_citation_detail 字段
4. `langgraph_app/tools/analyst_context.py` — 传竞品详情给 Analyst
5. `langgraph_app/nodes/analyst_node.py` — 更新规则 6 使用竞品详情

### 实现要求

#### 3.1 citation_analyzer.py — 同时提取竞品引用

在分析搜索结果时，除了提取品牌的引用，也提取竞品域名的引用：

```python
def analyze_citations(search_results, brand_domain, competitor_domains=None):
    """
    分析搜索结果，提取品牌和竞品的引用信息。
    
    Args:
        search_results: 搜索结果列表
        brand_domain: 品牌域名
        competitor_domains: 竞品域名列表（可选）
    
    Returns:
        brand_citations: 品牌引用列表
        competitor_citations: 竞品引用详情（如果提供了 competitor_domains）
    """
    competitor_domains = competitor_domains or []
    
    brand_citations = []
    competitor_citations = {domain: [] for domain in competitor_domains}
    
    for result in search_results:
        # 提取品牌引用
        if brand_domain in result.get("url", ""):
            brand_citations.append(...)
        
        # 提取竞品引用
        for domain in competitor_domains:
            if domain in result.get("url", ""):
                competitor_citations[domain].append(...)
    
    return brand_citations, competitor_citations
```

#### 3.2 probe_node.py — 调用时传入竞品域名

在 probe_node.py 调用 analyze_citations 的地方，传入竞品域名：

```python
# 在 probe_node.py 的引用分析部分
competitor_domains = state["user_input"].get("competitors", [])
brand_citations, competitor_citations = analyze_citations(
    search_results, 
    brand_domain, 
    competitor_domains=competitor_domains  # 新增
)
# 把 competitor_citations 存入 citation_metrics
```

#### 3.3 state.py — CitationMetrics 加字段

```python
class CitationMetrics(BaseModel):
    ...
    # 新增：竞品引用详情（从搜索结果中提取，不额外搜索）
    competitor_citation_detail: dict = {}
    # 格式: {
    #   "casetify.com": {
    #     "mention_count": 15,
    #     "top_sources": ["reddit.com", "youtube.com"],
    #     "avg_authority": 45,
    #   },
    #   ...
    # }
```

#### 3.4 analyst_context.py — 传竞品详情给 Analyst

在 competitor_summary 中加 competitor_details：

```python
competitor_summary = {
    ...
    "competitor_details": cm.get("competitor_citation_detail", {}),
}
```

#### 3.5 analyst_node.py — 更新规则 6 使用竞品详情

在规则 6 中加竞品详情分析：

```
步骤 5: 分析竞品引用详情
  对每个竞品：
    - 竞品从哪里被引用？（top_sources）
    - 竞品的引用源权威分是多少？（avg_authority）
    - 竞品的引用率是多少？（mention_count / total_queries）
  
  对比用户和竞品的引用源差异：
    - 如果竞品从 G2/Capterra 被引用，但用户没有 → 说明竞品在评测平台有布局
    - 如果竞品从 Reddit/论坛被引用，但用户从官网被引用 → 说明竞品有社区影响力
```

在 _build_user_message 的竞品对比部分，展示竞品详情：

```python
if comp.get("competitor_details"):
    parts.append("")
    parts.append("竞品引用详情:")
    for domain, detail in comp["competitor_details"].items():
        sources = ", ".join(detail.get("top_sources", [])[:3])
        parts.append(f"  {domain}: 提及 {detail.get('mention_count', 0)} 次, 来源: {sources}, 平均权威分: {detail.get('avg_authority', 0)}")
```

### 验证方法
- 读 citation_analyzer.py，确认分析时同时提取竞品引用
- 读 state.py，确认 CitationMetrics 有 competitor_citation_detail 字段
- 读 analyst_context.py，确认 competitor_details 传给 Analyst
- 读 analyst_node.py，确认：
  - 规则 6 包含竞品引用详情分析
  - _build_user_message 展示竞品详情

---

## state.py 改动汇总

```python
# CompetitorGap 新增字段
class CompetitorGap(BaseModel):
    ...
    winning_dimensions: list[str] = []  # 新增：优势维度

# CitationMetrics 新增字段
class CitationMetrics(BaseModel):
    ...
    competitor_citation_detail: dict = {}  # 新增：竞品引用详情
```

---

## CHECKLIST 自检

**任务1 [规则 6 适配]:**
- [ ] state.py CompetitorGap 有 winning_dimensions 字段
- [ ] 规则 6 包含维度差距计算逻辑（差距 > 20 / 10-20 / < 10 / < 0）
- [ ] 规则 6 包含三种策略（追赶/差异化/保持）
- [ ] 输出格式包含 winning_dimensions
- [ ] _build_user_message 有差距分析提示

**任务2 [行业基准]:**
- [ ] brand_profiler.py 有 map_industry_category 函数
- [ ] map_industry_category 覆盖三大类（B2B SaaS / 跨境支付 / DTC品牌）
- [ ] config.py 包含 INDUSTRY_BENCHMARKS（3 个行业 + _default）
- [ ] analyst_context.py 传 benchmark 和 industry_category 字段
- [ ] _build_user_message 展示行业基准对比表格
- [ ] SYSTEM_PROMPT 包含规则 11（行业基准对比）
- [ ] 规则 11 包含四种分位数解读
- [ ] 行业基准数据不足时不强行对比

**任务3 [竞品引用详情]:**
- [ ] citation_analyzer.py 分析时同时提取竞品引用
- [ ] probe_node.py 调用 analyze_citations 时传入 competitor_domains
- [ ] state.py CitationMetrics 有 competitor_citation_detail 字段
- [ ] analyst_context.py 传 competitor_details
- [ ] 规则 6 包含竞品引用详情分析
- [ ] _build_user_message 展示竞品详情

---

## 交付格式

```
自检结果: X/5 任务1 + X/8 任务2 + X/6 任务3 = XX/19
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **竞品引用详情不额外搜索** — 从已有搜索结果中提取，不增加 API 调用成本
2. **行业基准是估算值** — 先硬编码，后续从数据飞轮更新，在诊断中说明"基于有限数据估算，仅供参考"
3. **行业映射要覆盖常见行业** — 在 brand_profiler.py 中加映射函数，把细粒度行业映射回三大类
4. **维度差距计算要判空** — dimension_scores 可能为空列表，不能报错
5. **竞品详情要判空** — competitor_citation_detail 可能为空字典，不能报错
6. **不要改 ThreeLayerChain** — state.py 里的定义已经正确，不要动
7. **不要改规则 10** — 三分类引用率解读已经正确，不要动
8. **行业基准数据不足时不强行对比** — 如果 industry_category 为 _default，只说"行业基准数据不足"
