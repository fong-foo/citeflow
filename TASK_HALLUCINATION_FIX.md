# TASK_HALLUCINATION_FIX.md — 维度打分矩阵幻觉修复（根治方案 v5）

> 药老出品 · 2026-05-08
> 目标: 从根本上消除维度打分矩阵的幻觉数据
> 预计工时: 3-4h

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 0 | 调用链改造：搜索结果传入 _analyze_comparison | probe_node.py + citation_analyzer.py | 50min |
| 1 | 品牌提及检测：_extract_mentioned_brands | citation_analyzer.py | 30min |
| 2 | 验证器：最小证据阈值 + 幻觉分数清空 | citation_analyzer.py | 40min |
| 3 | Prompt：引导 LLM 对无数据品牌返回 null | citation_analyzer.py | 20min |
| 4 | state.py：RankingItem.score 改 Optional | state.py | 10min |
| 5 | Analyst：处理 score=null 的维度数据 | analyst_node.py + analyst_context.py | 30min |
| 6 | 报告展示：score=null 标注"数据不足" | 报告生成脚本 | 30min |
| 7 | 验证 + 自检 | - | 30min |

**完成标准**: 维度打分矩阵中，没有足够证据的分数变成 null，unverified 比例从 57.9% 降到 < 20%。

---

## 背景

```
维度打分矩阵: 57.9% unverified（22/38 条）

根因链:
1. 搜索结果薄 — 小众品牌对比查询，Google 只返回 Reddit/论坛帖子
2. LLM 过度外推 — 从"某用户说 A 比 B 好"→ 判定 A=100, B=0
3. 验证只检不修 — 检测到幻觉但只改 summary，没改 score
4. 数据管道缺口 — 原始搜索结果没传入打分函数，品牌检测无法工作
```

---

## 任务0: 调用链改造 — 原始搜索结果传入 _analyze_comparison

### 问题

当前调用链，原始搜索结果在中途断了。而且函数位置标注有误。

### 实际文件位置（重要！）

```
_analyze_comparison()         → citation_analyzer.py
analyze()                     → citation_analyzer.py
_batch_analyze_comparisons()  → probe_node.py:1181  ← 不是 citation_analyzer.py！
_stream_competitor()          → probe_node.py:885
```

### 当前调用链

```
probe_node._stream_competitor()          [probe_node.py:885]
  ├─ comp_search_results = [...]         ← 原始搜索结果在这里
  └─ _batch_analyze_comparisons(         [probe_node.py:1181]
       comp_queries, parsed_answers, brand_name, competitors)
       ← comp_search_results 没传入！
       └─ analyze("comparison", text=answer, brand_name, competitors)
            [citation_analyzer.py]
            ← 也没有 search_results 参数！
            └─ _analyze_comparison(text, brand_name, competitors)
                 ← text 是 LLM 合成后的回答，不是原始搜索结果
```

### 改动后的调用链

```
probe_node._stream_competitor()          [probe_node.py:885]
  ├─ comp_search_results = [...]
  └─ _batch_analyze_comparisons(         [probe_node.py:1181]
       comp_queries, parsed_answers, brand_name, competitors,
       comp_search_results)              ← 新增参数
       └─ analyze("comparison", text=answer, brand_name, competitors,
            search_results=search_results)  ← 新增参数，走 analyze() 中转
            [citation_analyzer.py]
            └─ _analyze_comparison(text, brand_name, competitors,
                 search_results)         ← 新增参数
```

### 需要改的文件

| 文件 | 函数 | 改动 |
|------|------|------|
| `probe_node.py:1181` | `_batch_analyze_comparisons()` | 加 `comp_search_results` 参数 |
| `probe_node.py:885` | `_stream_competitor()` | 传入 `comp_search_results` |
| `citation_analyzer.py` | `analyze()` | 加 `search_results` 参数，传给 `_analyze_comparison` |
| `citation_analyzer.py` | `_analyze_comparison()` | 加 `search_results` 参数 |

### 实现要求

#### 0a: probe_node._stream_competitor 传入 comp_search_results

```python
# probe_node.py — _stream_competitor() 约 line 957
# 当前:
comp_results = await _batch_analyze_comparisons(
    comp_queries=comp_queries,
    parsed_answers=parsed_answers,
    brand_name=ui["brand_name"],
    competitors=competitors,
)

# 改为:
comp_results = await _batch_analyze_comparisons(
    comp_queries=comp_queries,
    parsed_answers=parsed_answers,
    brand_name=ui["brand_name"],
    competitors=competitors,
    comp_search_results=comp_search_results,  # 新增
)
```

注意：`comp_search_results` 在 `_stream_competitor` 中已存在（约 line 951）。

#### 0b: probe_node._batch_analyze_comparisons 加参数

```python
# probe_node.py:1181
async def _batch_analyze_comparisons(
    comp_queries: list[str],
    parsed_answers: list[str],
    brand_name: str,
    competitors: list[str],
    comp_search_results: list[list[dict]] = None,  # 新增
) -> list:
```

内部循环改为：
```python
for i, (query, answer) in enumerate(zip(comp_queries, parsed_answers)):
    sr = comp_search_results[i] if comp_search_results and i < len(comp_search_results) else []
    result = await asyncio.to_thread(
        analyze, "comparison",
        text=answer,
        brand_name=brand_name,
        competitors=competitors,
        search_results=sr,  # 新增：走 analyze() 中转
    )
```

#### 0c: citation_analyzer.analyze() 加参数

```python
# citation_analyzer.py
def analyze(mode: str, text: str, brand_name: str, domain: str = "",
            competitors: list[str] = None, search_results: list[dict] = None) -> dict:
    if mode == "comparison":
        return _analyze_comparison(text, brand_name, competitors or [], search_results)
    elif mode == "citation":
        return _analyze_citation(text, brand_name, domain)
```

#### 0d: citation_analyzer._analyze_comparison() 加参数

```python
# citation_analyzer.py
def _analyze_comparison(
    text: str,
    brand_name: str,
    competitors: list[str],
    search_results: list[dict] = None,  # 新增
) -> dict:
```

### 验证方法
- 在 _batch_analyze_comparisons 中 print(f"search_results count: {len(sr)}") 确认数据传入
- 在 _analyze_comparison 中 print(f"received search_results: {len(search_results or [])}") 确认数据到达
- 跑测试确认不报错

---

## 任务1: 品牌提及检测 — _extract_mentioned_brands

### 问题
1a: 域名匹配漏品牌（lincolnelectric.com → Lincoln Electric）
1b: _analyze_comparison 中需要实际调用这个函数

### 需要改的文件
`langgraph_app/tools/citation_analyzer.py`

### 实现要求

#### 1a: _extract_mentioned_brands 函数

```python
def _extract_mentioned_brands(search_results: list[dict], brand_name: str, competitors: list[str]) -> dict:
    """扫描原始搜索结果，检测哪些品牌在文本中实际出现。

    匹配策略:
    1. 品牌名直接匹配（YesWelder, Lincoln Electric）
    2. 域名匹配（lincolnelectric.com）
    3. 域名第一部分匹配（lincolnelectric）
    4. 域名第一部分拆分匹配（lincoln electric）

    Returns:
        {"mentioned": [...], "not_mentioned": [...]}
    """
    # 边界：空值保护
    if not search_results:
        return {"mentioned": [], "not_mentioned": [brand_name] + competitors}

    all_text = ""
    for sr in search_results:
        all_text += " " + sr.get("title", "") + " " + sr.get("snippet", "")
    all_text_lower = all_text.lower()

    brand_patterns = {}
    brand_patterns[brand_name] = [brand_name.lower()]
    for comp in competitors:
        patterns = [comp.lower()]
        if "." in comp:
            domain_part = comp.lower().split(".")[0]
            patterns.append(domain_part)
            spaced = _split_domain_words(domain_part)
            if spaced != domain_part:
                patterns.append(spaced)
        brand_patterns[comp] = patterns

    mentioned, not_mentioned = [], []
    for brand, patterns in brand_patterns.items():
        if any(p in all_text_lower for p in patterns):
            if brand not in mentioned:
                mentioned.append(brand)
        else:
            if brand not in not_mentioned:
                not_mentioned.append(brand)

    return {"mentioned": mentioned, "not_mentioned": not_mentioned}
```

#### 1b: _split_domain_words 函数

```python
def _split_domain_words(domain_part: str) -> str:
    """尝试将域名第一部分拆分为单词。

    lincolnelectric → lincoln electric
    millerwelds → miller welds
    yeswelder → yeswelder（无法拆分，保留原样）
    """
    known_words = [
        "lincoln", "electric", "miller", "welds", "welder", "welding",
        "esab", "hobart", "yeswelder", "arccaptain", "forney",
        "thermal", "dynamics", "hypertherm", "fronius", "kemppi",
        "panasonic", "hitachi", "bosch", "makita", "dewalt",
        "samsung", "apple", "google", "amazon", "microsoft",
    ]

    result = domain_part.lower()
    for word in sorted(known_words, key=len, reverse=True):
        if word in result and word != result:
            result = result.replace(word, f" {word}")
    return result.strip()
```

#### 1c: 在 _analyze_comparison 开头调用

```python
def _analyze_comparison(text, brand_name, competitors, search_results=None):
    # 品牌提及检测
    if search_results:
        brand_presence = _extract_mentioned_brands(search_results, brand_name, competitors)
    else:
        brand_presence = {"mentioned": [], "not_mentioned": [brand_name] + competitors}

    mentioned_brands = brand_presence["mentioned"]
    not_mentioned_brands = brand_presence["not_mentioned"]

    # 构建 prompt 时注入品牌检测结果
    prompt = _build_comparison_prompt(
        text=text,
        mentioned_brands=mentioned_brands,
        not_mentioned_brands=not_mentioned_brands,
        ...
    )
```

### 验证方法
- 测试 "lincolnelectric.com" → 能匹配到 "Lincoln Electric"
- 测试 search_results=[] → 返回 not_mentioned 包含所有品牌
- 测试 search_results=None → 不报错

---

## 任务2: 验证器 — 最小证据阈值 + 幻觉分数清空

### 问题
LLM 从稀疏数据过度外推极端分数。验证器需要升级。

### 关键注意：_check_coverage 不存在

当前代码的 `_validate_dimension_scores` 使用 `_calculate_coverage(quote, original_text)`，
其中 `original_text` 是拼好的大字符串。

任务文档中写的 `_check_coverage(quote, search_results)` 不存在。

**正确做法**: 把 search_results 的 title+snippet 拼成大字符串，传给现有的 `_calculate_coverage`。

### 需要改的文件
`langgraph_app/tools/citation_analyzer.py`

### 实现要求

```python
def _validate_dimension_scores(dimension_scores, search_results_text: str):
    """验证维度打分的证据充分性。四层检查。

    Args:
        dimension_scores: 维度打分列表
        search_results_text: 搜索结果拼成的大字符串（title + snippet）
    """
    for dim in dimension_scores:
        for ranking in dim.get("rankings", []):
            quote = ranking.get("source_quote", "")
            score = ranking.get("score")

            # 检查1: quote 为空
            if not quote.strip():
                _nullify_ranking(ranking, "无来源引用，无法验证")
                continue

            # 检查2: quote 在文本中是否存在（用现有的 _calculate_coverage）
            coverage = _calculate_coverage(quote, search_results_text)
            if coverage < 0.3:
                _nullify_ranking(ranking, "来源引用无法在搜索结果中验证")
                continue

            # 检查3: quote 长度是否足够
            min_len = _min_quote_length(quote)
            if len(quote.strip()) < min_len:
                _nullify_ranking(ranking, "来源引用过短，证据不足以下判断")
                continue

            # 检查4: 极端分数需要更强证据
            if score is not None and (score >= 85 or score <= 15):
                if not _has_comparison_evidence(quote):
                    _nullify_ranking(ranking, "来源引用无明确比较表述，极端分数证据不足")
                    continue


def _min_quote_length(quote: str) -> int:
    """根据语言判断最小 quote 长度。"""
    chinese_chars = sum(1 for c in quote if '\u4e00' <= c <= '\u9fff')
    if chinese_chars > len(quote) * 0.3:
        return 15
    return 30


def _has_comparison_evidence(quote: str) -> bool:
    """检查 quote 中是否有比较性表述。支持中英文。"""
    quote_lower = quote.lower()
    en_keywords = [
        "better", "worse", "superior", "inferior", "outperform", "underperform",
        "best", "worst", "leading", "lagging", "exceeds", "falls short",
        "more reliable", "less reliable", "higher quality", "lower quality",
        "surpasses", "dominates", "overwhelms",
    ]
    zh_keywords = [
        "更好", "更差", "更优", "更弱", "优于", "不如", "领先", "落后",
        "碾压", "远超", "秒杀", "吊打", "超过", "胜过", "强于", "弱于",
        "好10倍", "好十倍", "差很多", "好很多", "排名第一", "排第一", "垫底",
        "完胜", "完败", "大胜", "惨败",
    ]
    return any(kw in quote_lower for kw in en_keywords + zh_keywords)


def _nullify_ranking(ranking: dict, reason: str):
    ranking["score"] = None
    ranking["verified"] = "unverified"
    ranking["summary"] = reason


def _enforce_continuous_scores(dimension_scores):
    for dim in dimension_scores:
        for r in dim.get("rankings", []):
            score = r.get("score")
            if score is None:
                continue
            if score == 0:
                r["score"] = 15
            elif score == 100:
                r["score"] = 85
```

### 调用处改造

在 _analyze_comparison 中，解析完 LLM 输出后调用：

```python
# 拼接搜索结果为大字符串
search_results_text = ""
if search_results:
    for sr in search_results:
        search_results_text += " " + sr.get("title", "") + " " + sr.get("snippet", "")

# 调用验证器（传大字符串，不是 list[dict]）
_validate_dimension_scores(parsed_output["dimension_scores"], search_results_text)
_enforce_continuous_scores(parsed_output["dimension_scores"])
```

### 关于中等分数薄证据

检查4 只拦截极端分数（85+/15-）。中等分数（70）+ 薄证据（"good value"）会通过。
这是设计取舍：0/100 误差 ±50 是主要矛盾，70 误差 ±15 可接受。

---

## 任务3: Prompt 引导 LLM 返回 null

### 需要改的文件
`langgraph_app/tools/citation_analyzer.py`

### 实现要求

在 _analyze_comparison 的 prompt 中加：

```
**关键规则：没有数据 = null，不是 0 也不是 100**

以下品牌在搜索结果中被明确提到: {mentioned_brands}
以下品牌在搜索结果中未被提到: {not_mentioned_brands}

- 只对"被提到"的品牌打分
- 未被提到的品牌返回 score=null, source_quote="", summary="搜索结果未提及该品牌"
- 只有模糊描述（如"还不错"）时返回 score=null，不要推导极端分数
```

---

## 任务4: state.py 模型修改

```python
class RankingItem(BaseModel):
    brand: str
    rank: int
    score: Optional[int] = None
    summary: str
    source_quote: str = ""
    verified: str = "unverified"
```

---

## 任务5: Analyst 处理 score=null

### analyst_context.py

过滤 score=null，统计 dimension_data_quality。

### analyst_node.py

标注数据质量，规则 14 处理数据不足。

---

## 任务6: 报告展示

score=null 显示"数据不足"，不参与差距计算。

---

## 四层防御总结

```
第1层（根因）: 品牌提及检测 + 调用链改造
  → 原始搜索结果传入 _analyze_comparison（probe_node.py 改调用）
  → 未出现的品牌直接返回 null
  → 域名+品牌名双重匹配

第2层（核心）: 最小证据阈值
  → quote 为空/不在文本/过短/极端分数无比较表述 → null
  → 中英文比较词全覆盖
  → 使用现有 _calculate_coverage，传入拼好的大字符串

第3层（辅助）: Prompt 引导
  → 品牌检测结果注入 prompt

第4层（模型）: RankingItem.score = Optional[int]
  → 下游正确处理 null
```

---

## CHECKLIST 自检

**任务0 [调用链]:**
- [ ] probe_node._stream_competitor 传入 comp_search_results
- [ ] probe_node._batch_analyze_comparisons 加 comp_search_results 参数
- [ ] citation_analyzer.analyze() 加 search_results 参数并传递
- [ ] citation_analyzer._analyze_comparison() 加 search_results 参数

**任务1 [品牌检测]:**
- [ ] _extract_mentioned_brands 实现（含空值保护）
- [ ] _split_domain_words 实现
- [ ] 在 _analyze_comparison 开头调用
- [ ] 品牌检测结果注入 prompt

**任务2 [验证器]:**
- [ ] 检查1-4 全部实现
- [ ] 使用 _calculate_coverage（不是 _check_coverage）
- [ ] search_results 拼成大字符串传入
- [ ] _min_quote_length 中英文区分
- [ ] _has_comparison_evidence 中英文关键词
- [ ] _enforce_continuous_scores 跳过 None

**任务3-6:**
- [ ] Prompt 含品牌检测结果
- [ ] state.py Optional[int]
- [ ] Analyst 过滤 + 数据质量
- [ ] 报告展示

---

## 交付格式

```
自检结果: X/4 任务0 + X/4 任务1 + X/6 任务2 + X/1 任务3 + X/1 任务4 + X/3 任务5 + X/2 任务6 = XX/21
失败项: (无 / 列出)
```

---

## 注意事项

1. **_batch_analyze_comparisons 在 probe_node.py，不是 citation_analyzer.py**
2. **走 analyze() 中转，不要绕过它**
3. **_check_coverage 不存在，用现有 _calculate_coverage + 大字符串**
4. **_extract_mentioned_brands 必须在 _analyze_comparison 开头调用**
5. **search_results 为空时返回默认值，不报错**
6. **测试时对比修复前后** — 目标: unverified 57.9% → < 20%
