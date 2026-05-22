# TASK_CITATION_METRICS_V2.md --- 四指标口径重构
> 药老出品 · 2026-05-21
> 目标: CitationMetrics 新增 mention_rate / a_recommendation_rate / c_recommendation_rate
> 预计工时: 1h

## 任务概览

| # | 任务 | 文件 | 类型 |
|---|------|------|------|
| 1 | CitationMetrics 加 3 个新字段 | state.py | Model |
| 2 | _stream_cite 加分类推荐率计算 | probe_node.py | 聚合逻辑 |
| 3 | 提及率不再被覆盖，独立保存 | probe_node.py | Bugfix |
| 4 | 验证 | 跑一次 Light 扫描 | 测试 |

## 新口径定义

```
A类（行业通用）："best silk pillowcase 2025"       ← 用户不知道品牌
B类（品牌直接）："lilysilk review"                   ← 用户指名道姓
C类（竞品场景）："blissy vs fishers finery silk"    ← 用户提了竞品

mention_rate（提及率） = (A+B+C 中 is_mentioned=true) / (A+B+C 总数) * 100
cite_rate（引用率）   = A 类中 is_mentioned=true / A 类总数 * 100     ← 已有，即 industry_rate
a_recommendation_rate = A 类中 position in {top,middle,bottom} / A 类总数 * 100
c_recommendation_rate = C 类中 position in {top,middle,bottom} / C 类总数 * 100
                         B 类不参与推荐率计算（永远是 mention，无信息量）
```

---

## 任务 1: state.py --- CitationMetrics 加字段

### 需要改的文件
`/Users/fogn/Desktop/CiteFlow/langgraph_app/state.py`

### 在 CitationMetrics 类中新增 3 个字段

在 `rate: float` (line 75) 之后、`details` (line 78) 之前插入：

```python
    # 提及率（全部查询，A+B+C）
    mention_rate: float = 0.0              # 品牌在AI回答中被提及的比例
```

在 `recommendation_rate` (line 91) 之后插入：

```python
    # 推荐率按类别拆分
    a_recommendation_rate: float = 0.0     # A类查询中的推荐率（top/middle/bottom）
    c_recommendation_rate: float = 0.0     # C类查询中的推荐率（竞品对比中AI选谁）
```

完成后 CitationMetrics 中关于 rate 的字段应为：

```
rate                    — 旧兼容（= industry_rate）
mention_rate            — NEW：全局提及率 (A+B+C)
industry_rate           — A类提及率（=引用率 cite_rate）
brand_rate              — B类提及率
competitor_scenario_rate — C类提及率
recommendation_rate     — 旧兼容（全局推荐率）
a_recommendation_rate   — NEW：A类推荐率
c_recommendation_rate   — NEW：C类推荐率
top_rate                — TOP1率
```

---

## 任务 2: probe_node.py --- 聚合逻辑

### 需要改的文件
`/Users/fogn/Desktop/CiteFlow/langgraph_app/nodes/probe_node.py`

### 步骤 A：保存全局提及率（不再被覆盖）

当前代码 line 1038-1040 计算了全局提及率，但 line 1072 被覆盖为 industry_rate。

**在 line 1040 之后加一行**：

```python
mention_rate = cite_rate  # 全局提及率，在 cite_rate 被覆盖前保存
```

line 1072 的覆盖保持不变（引用率 = A 类）：

```python
cite_rate = industry_rate  # 保持不变
```

### 步骤 B：按类别计算推荐率

在 line 1066（`cat_mentioned[cat] += 1`）之后，line 1068（`industry_rate = ...`）之前，新增：

```python
    # 按类别统计推荐率
    cat_recommended = {"industry": 0, "brand": 0, "competitor": 0}
    for d in cite_details:
        cat = d.query_category
        if d.position in recommended_positions:
            cat_recommended[cat] += 1

    a_recommendation_rate = (cat_recommended["industry"] / cat_counts["industry"] * 100) if cat_counts["industry"] > 0 else 0.0
    c_recommendation_rate = (cat_recommended["competitor"] / cat_counts["competitor"] * 100) if cat_counts["competitor"] > 0 else 0.0
    # B类不计算推荐率
```

### 步骤 C：更新 CitationMetrics 构造

在 `citation_metrics = CitationMetrics(...)` 中新增参数：

```python
        mention_rate=round(mention_rate, 1),          # NEW
        # ... 原有字段不变 ...
        a_recommendation_rate=round(a_recommendation_rate, 1),    # NEW
        c_recommendation_rate=round(c_recommendation_rate, 1),    # NEW
```

---

## 任务 3: _stream_cite_global 同步修改

probe_node.py line ~1443 处有 `_stream_cite_global` 函数（多引擎模式），也需同步修改。

搜索第二处 `recommended_positions = {"top", "middle", "bottom"}`，用同样逻辑加 `cat_recommended` 统计和 `a_recommendation_rate`/`c_recommendation_rate`。

---

## 任务 4: 验证

```bash
cd ~/Desktop/CiteFlow && source .venv/bin/activate
python3 -c "
import asyncio, json
from langgraph_app.nodes.probe_node import probe_node
from langgraph_app.state import ProbeState

async def test():
    state = ProbeState(user_input={
        'domain': 'lilysilk.com',
        'brand_name': 'Lilysilk',
        'seed_queries': ['silk pillowcase', 'silk pajamas', 'silk bedding'],
        'competitors': ['blissy.com'],
        'mode': 'light'
    })
    result = await probe_node(state)
    cm = result.get('citation_metrics')
    print(json.dumps({
        'mention_rate': cm.mention_rate,
        'cite_rate': cm.rate,
        'industry_rate': cm.industry_rate,
        'recommendation_rate': cm.recommendation_rate,
        'a_recommendation_rate': cm.a_recommendation_rate,
        'c_recommendation_rate': cm.c_recommendation_rate,
        'total_queries': cm.total_queries,
        'by_category': {
            'A': {'total': cm.industry_count, 'mentioned': cm.industry_mentioned},
            'B': {'total': cm.brand_count, 'mentioned': cm.brand_mentioned},
            'C': {'total': cm.competitor_count, 'mentioned': cm.competitor_mentioned},
        }
    }, indent=2, ensure_ascii=False))

asyncio.run(test())
"
```

### 预期输出

```
mention_rate: ~44%       ← A+B+C 提及率
cite_rate: 0.0           ← A类引用率（Lilysilk 全灭）
a_recommendation_rate: 0.0  ← A类推荐率为0
c_recommendation_rate: 0.0 或 >0  ← 取决于C类中是否在排名列表
recommendation_rate: 0.0  ← 旧字段，保持向后兼容
```

---

## 不需要改的文件

- `citation_analyzer.py` — position 定义不变
- `api.py` — 返回结构不变（新字段在 CitationMetrics 里自动带出）
- 前端组件 — 本 TASK 只改后端数据层

## CHECKLIST 自检

- [ ] state.py CitationMetrics 新增 3 个字段
- [ ] probe_node.py line 1040 后保存 mention_rate
- [ ] probe_node.py line 1066 后新增 cat_recommended 统计
- [ ] probe_node.py CitationMetrics() 构造传入了新字段
- [ ] _stream_cite_global 同步修改
- [ ] 验证脚本跑通，mention_rate 和 cite_rate 不相等
- [ ] 无 SyntaxError / ImportError

## 注意事项

- **不要动 line 1072 cite_rate = industry_rate** — 引用率=A类逻辑不变
- **不要动 citation_analyzer.py** — position 判据不改
- **B 类不参与推荐率计算**
- **旧字段 recommendation_rate/rate 保留不动** — 向后兼容
