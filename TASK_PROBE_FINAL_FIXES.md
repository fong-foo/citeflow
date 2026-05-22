# TASK_PROBE_FINAL_FIXES.md — Probe 最终修复（3个小修）

> 药老设计，海老执行。2026-05-09
> 前置条件：幻觉修复已通过实测（unverified 0%）

---

## 背景

Probe 幻觉修复已通过实测，但还有 3 个遗留问题：
1. market_perception 来源污染（官网内容混入 AI 感知）
2. dimension_win_count 与 score 不一致
3. test_real_brand.py 的 format_diagnosis 类型错误

三个都是小修，预计 1 小时内完成。

---

## Task 0: market_perception 来源污染

### 问题

market_mirror.py 的 brand_texts 不区分来源域名。yeswelder.com（品牌官网）和 reddit.com 的 snippet 同等对待，都送入 LLM prompt "理解 AI 如何认知品牌"。

LLM 看到官网说 "YesWelder 提供专业级多工艺焊机" 就当作 AI 的独立认知——但那是品牌自己说的。

### 证据

实测 YesWelder 的 perception_sources:
```
['yeswelder.com', 'wholesale.yeswelder.com', 'youtube.com', 'reddit.com', 'facebook.com']
```

前两个是品牌官网，不是"AI 讨论"。

### 修复

文件：`langgraph_app/tools/market_mirror.py`

在 `reflect()` 函数的搜索结果循环中，过滤掉品牌官网来源：

```python
def reflect(brand_name: str, domain: str, search_results: list[dict],
            raw_snippets: list[dict] | None = None,
            competitors: list[str] | None = None) -> dict:
    brand_texts = []
    competitor_texts = []
    other_texts = []
    sources = set()

    # 新增：品牌域名归一化，用于过滤
    brand_domain = domain.lower().removeprefix("www.") if domain else ""

    comp_names_lower = set()
    if competitors:
        comp_names_lower = {c.lower() for c in competitors}

    for sr in search_results:
        if not isinstance(sr, dict):
            continue
        answer = sr.get("answer", "")
        
        # 新增：检查答案的来源是否是品牌官网
        answer_sources = [c.get("url", "") for c in sr.get("raw_citations", [])]
        is_from_brand_site = any(brand_domain in url.lower() for url in answer_sources if brand_domain)
        
        mentions_brand = _mentions_brand(answer, brand_name)
        mentions_comp = any(
            _mentions_brand(answer, c) for c in comp_names_lower
        ) if comp_names_lower else False

        if mentions_brand:
            # 新增：如果来源是品牌官网，归入 other_texts 而非 brand_texts
            if is_from_brand_site:
                other_texts.append(answer)
            else:
                brand_texts.append(answer)
        elif mentions_comp:
            competitor_texts.append(answer)
        elif len(answer) > 100:
            other_texts.append(answer)

        # DDG 来源也需要过滤
        for c in sr.get("raw_citations", []):
            sn = c.get("snippet", "")
            url = c.get("url", "")
            sources.add(url)
            if sn:
                # 新增：跳过品牌官网来源
                if brand_domain and brand_domain in url.lower():
                    continue
                if _mentions_brand(sn, brand_name):
                    brand_texts.append(sn)
                elif mentions_comp and any(_mentions_brand(sn, c) for c in comp_names_lower):
                    competitor_texts.append(sn)
                else:
                    other_texts.append(sn)

    # DDG 额外 snippets 也需要过滤
    if raw_snippets:
        for s in raw_snippets:
            sn = s.get("snippet", "")
            url = s.get("url", "")
            sources.add(url)
            # 新增：跳过品牌官网来源
            if brand_domain and brand_domain in url.lower():
                continue
            if sn and _mentions_brand(sn, brand_name):
                brand_texts.append(sn)
    
    # ... 后续逻辑不变
```

### 验证

修复后重跑 test_real_brand.py，检查：
- perception_sources 不应包含 brand_domain
- perceived_strengths 应来自第三方评价（reddit/youtube/weldguru），不是官网自述
- perceived_products 可以来自官网（产品名是事实），但 strengths/weaknesses 应来自第三方

---

## Task 1: dimension_win_count 一致性

### 问题

citation_analyzer 的 _validate_dimension_scores 会 nullify 无证据的 score，但 dimension_win_count 是 LLM 原始返回的（基于 rank 排序），不会被同步更新。

实测数据：
```
查询: "If you had to choose between YesWelder and Miller..."
dimension_win_count: {"YesWelder": 1, "millerwelds.com": 0}
但所有维度的 score 都是 None
```

win_count 说"赢了1个维度"，但那个维度的分数是 None。

### 修复

文件：`langgraph_app/tools/citation_analyzer.py`

在 `_validate_dimension_scores` 末尾（return 之前），加一步重新计算 dimension_win_count：

```python
def _validate_dimension_scores(dimension_scores: list, search_results_text: str,
                                dimension_win_count: dict = None) -> list:
    """验证维度打分的证据充分性。四层检查 + 覆盖率验证 + win_count 同步。"""
    validated_scores = []

    for dim in dimension_scores:
        validated_rankings = []
        for ranking in dim.get("rankings", []):
            # ... 现有的四层检查逻辑不变 ...
            validated_rankings.append(ranking)

        dim["rankings"] = validated_rankings
        validated_scores.append(dim)

    # 新增：同步更新 dimension_win_count
    # 如果某个维度所有品牌的 score 都是 None，从 win_count 中移除该维度的贡献
    if dimension_win_count is not None:
        _sync_win_count(validated_scores, dimension_win_count)

    return validated_scores


def _sync_win_count(dimension_scores: list, win_count: dict):
    """重新计算 win_count：只统计有 score 的维度。"""
    # 重置 win_count
    for brand in win_count:
        win_count[brand] = 0

    # 只统计有至少一个非 None score 的维度
    for dim in dimension_scores:
        rankings = dim.get("rankings", [])
        has_any_score = any(r.get("score") is not None for r in rankings)
        if not has_any_score:
            continue  # 全部 None 的维度不参与 win_count

        # 找该维度的最高分品牌
        scored_rankings = [r for r in rankings if r.get("score") is not None]
        if scored_rankings:
            winner = max(scored_rankings, key=lambda r: r["score"])
            winner_brand = winner.get("brand", "")
            if winner_brand in win_count:
                win_count[winner_brand] += 1
```

### 调用点修改

`_analyze_comparison` 中，把 dimension_win_count 传给 _validate_dimension_scores：

```python
# 当前代码 (line 329-332):
result["dimension_scores"] = _validate_dimension_scores(
    result.get("dimension_scores", []),
    search_results_text
)

# 改为:
result["dimension_scores"] = _validate_dimension_scores(
    result.get("dimension_scores", []),
    search_results_text,
    dimension_win_count=result.get("dimension_win_count", {})
)
```

### 验证

修复后重跑，检查：
- 如果所有维度 score 都是 None → win_count 所有品牌都应该是 0
- 如果某些维度有 score → win_count 只统计这些维度

---

## Task 2: test_real_brand.py format_diagnosis 类型错误

### 问题

line 193 和 195，`cg.get('losing_dimensions', [])` 返回的是 dict 列表，不是 str 列表。

```python
# 当前代码 (line 193):
lines.append(f"  输在: {', '.join(cg.get('losing_dimensions', []))}")
# TypeError: sequence item 0: expected str instance, dict found
```

### 修复

文件：`test_real_brand.py`

```python
# line 193 改为:
losing = cg.get('losing_dimensions', [])
losing_str = ', '.join(
    (d.get('dimension', str(d)) if isinstance(d, dict) else str(d))
    for d in losing
)
lines.append(f"  输在: {losing_str}")

# line 195 改为:
winning = cg.get('winning_dimensions', [])
winning_str = ', '.join(
    (d.get('dimension', str(d)) if isinstance(d, dict) else str(d))
    for d in winning
)
lines.append(f"  赢在(NEW): {winning_str}")
```

### 验证

修复后重跑 test_real_brand.py，确认不再崩溃。

---

## 交付标准

三个 Task 全部完成后，重跑一次完整测试：

```bash
cd ~/Desktop/CiteFlow && source .venv/bin/activate && python test_real_brand.py
```

预期结果：
1. test_real_brand.py 不崩溃
2. perception_sources 不含品牌官网域名
3. dimension_win_count 与 score 一致
4. 幻觉率仍然 0%（不影响之前的修复）

自检结果: X/3
失败项: (列出或"无")
