# TASK_CITATION_ANALYZER_HALLUCINATION_FIX.md — 修复 citation_analyzer 幻觉问题

> 药老出品 · 2026-05-07（v2 — 修复海老4个疑问）
> 目标: 从根源解决 citation_analyzer 编造数据的问题
> 预计工时: 2.5h

---

## 问题描述

**现象**: 维度打分矩阵中的技术参数有幻觉。例如：
- 报告说 "YesWelder duty cycle: 20-30%"，实际是 60%
- 报告说 "Miller duty cycle: 40-60%"，实际是 40%

**根因**: LLM 在分析搜索结果时，混淆了两个角色：
1. 从搜索结果中提取信息（正确）
2. 用自己的知识补充缺失信息（导致幻觉）

**问题链**:
```
搜索结果没有技术参数 → LLM 用自己的知识补充 → 编造了错误数据 → 幻觉
```

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 改进 _analyze_comparison prompt | citation_analyzer.py | 1h |
| 2 | 后处理验证：检查数据来源 | citation_analyzer.py | 30min |
| 3 | 定义 RankingItem 模型 | state.py | 15min |
| 4 | 验证 + 测试 | - | 30min |

**完成标准**: 维度打分矩阵中的所有数据都能追溯到搜索结果，无法追溯的标记为 "unverified"。

---

## 任务1: 改进 _analyze_comparison prompt

### 问题

当前 prompt 没有明确要求"只从搜索结果中提取"，LLM 会用自己的知识补充缺失信息。

### 需要改的文件
`langgraph_app/tools/citation_analyzer.py`

### 实现要求

在 _analyze_comparison 的 prompt 中，添加以下约束：

```python
prompt = (
    f"You are a product analyst. Analyze this AI-generated comparison text "
    f"and rank the mentioned brands on each dimension discussed.\n\n"
    f"=== CRITICAL RULES ===\n"
    f"1. ONLY use information that appears in the text below. Do NOT add your own knowledge.\n"
    f"2. If the text does not mention a specific technical parameter (e.g., duty cycle, warranty years, price), "
    f"mark it as 'Data not available in text' - do NOT guess or use your training data.\n"
    f"3. For each ranking, provide the EXACT quote from the text that supports your ranking.\n"
    f"4. If you cannot find a supporting quote in the text, set source_quote to empty string and "
    f"set summary to 'Data not available in text'.\n"
    f"5. Do NOT fabricate numbers, percentages, or specifications. Only cite what the text explicitly states.\n\n"
    f"=== TEXT TO ANALYZE ===\n{text}\n\n"
    f"=== BRANDS TO RANK ===\n"
    f"Focus brand: {brand_name}\n"
    f"Competitors: {comp_text}\n\n"
    # ... 其余 prompt 保持不变
)
```

在输出格式中，为每个 ranking 添加 source_quote 字段：

```python
'  "dimension_scores": [\n'
'    {\n'
'      "dimension": "dimension name",\n'
'      "importance": "high|medium|low",\n'
'      "rankings": [\n'
'        {"brand": "BrandA", "rank": 1, "score": 100, "summary": "what text says about this brand on this dimension", "source_quote": "exact sentence from text"},\n'
'        {"brand": "BrandB", "rank": 2, "score": 67, "summary": "...", "source_quote": "..."}\n'
'      ]\n'
'    }\n'
'  ],\n'
```

### 验证方法
- 读 citation_analyzer.py，确认 prompt 包含 "ONLY use information that appears in the text"
- 确认 prompt 包含 "do NOT guess or use your training data"
- 确认 prompt 包含 "Do NOT fabricate numbers, percentages, or specifications"
- 确认输出格式包含 source_quote 字段

---

## 任务2: 后处理验证：检查数据来源

### 问题

即使 prompt 约束了 LLM，仍可能有幻觉。需要后处理验证。

### 需要改的文件
`langgraph_app/tools/citation_analyzer.py`

### 实现要求

在 _analyze_comparison 函数返回结果前，添加后处理验证：

```python
def _validate_dimension_scores(dimension_scores: list, original_text: str) -> list:
    """验证维度打分矩阵中的数据是否来自原始文本。
    
    验证逻辑：
    1. 如果 source_quote 在原文中（模糊匹配）→ verified
    2. 如果 source_quote 不在原文中，但 summary 的核心内容在原文中 → partial
    3. 否则 → unverified
    
    模糊匹配策略：
    - 将 source_quote 和原文都转为小写
    - 去除标点符号
    - 计算 source_quote 的 token 在原文中的覆盖率
    - 覆盖率 > 60% → verified
    - 覆盖率 30-60% → partial
    - 覆盖率 < 30% → unverified
    """
    import re
    
    def _tokenize(text: str) -> list[str]:
        """分词：小写 + 去标点 + 按空格分"""
        text = text.lower()
        text = re.sub(r'[^\w\s]', '', text)
        return text.split()
    
    def _calculate_coverage(source_quote: str, original_text: str) -> float:
        """计算 source_quote 的 token 在原文中的覆盖率"""
        if not source_quote:
            return 0.0
        
        source_tokens = set(_tokenize(source_quote))
        original_tokens = set(_tokenize(original_text))
        
        if not source_tokens:
            return 0.0
        
        matched = source_tokens & original_tokens
        return len(matched) / len(source_tokens)
    
    validated_scores = []
    
    for dim in dimension_scores:
        validated_rankings = []
        for ranking in dim.get("rankings", []):
            source_quote = ranking.get("source_quote", "")
            summary = ranking.get("summary", "")
            
            # 计算 source_quote 在原文中的覆盖率
            coverage = _calculate_coverage(source_quote, original_text)
            
            if coverage > 0.6:
                ranking["verified"] = "verified"
            elif coverage > 0.3:
                ranking["verified"] = "partial"
            else:
                ranking["verified"] = "unverified"
                # 如果 summary 包含数字但无法验证，标记为数据不足
                if re.search(r'\d+', summary):
                    ranking["summary"] = "数据不足，无法从搜索结果中验证"
            
            validated_rankings.append(ranking)
        
        dim["rankings"] = validated_rankings
        validated_scores.append(dim)
    
    return validated_scores
```

在 _analyze_comparison 返回结果前调用：

```python
result["dimension_scores"] = _validate_dimension_scores(
    result.get("dimension_scores", []), 
    text  # 原始搜索结果文本
)
```

### 验证方法
- 读 citation_analyzer.py，确认 _validate_dimension_scores 函数存在
- 确认函数使用模糊匹配（token 覆盖率）
- 确认 verified 字段值为 "verified" | "partial" | "unverified"
- 确认包含数字的 summary 在 unverified 时被替换为 "数据不足"

---

## 任务3: 定义 RankingItem 模型

### 问题

当前 DimensionComparison.rankings 是 list[dict]，可以随便塞字段。如果以后 validator 变严格，source_quote 和 verified 会被 Pydantic 丢掉。

### 需要改的文件
`langgraph_app/state.py`

### 实现要求

在 state.py 中定义 RankingItem 模型：

```python
class RankingItem(BaseModel):
    brand: str
    rank: int
    score: int
    summary: str
    source_quote: str = ""  # 原文引用
    verified: str = "unverified"  # "verified" | "partial" | "unverified"
```

更新 DimensionComparison 使用 RankingItem：

```python
class DimensionComparison(BaseModel):
    dimension: str
    rankings: list[RankingItem] = []  # 改为 RankingItem 列表
    importance: str = ""
```

### 验证方法
- 读 state.py，确认 RankingItem 模型存在
- 确认 DimensionComparison.rankings 使用 RankingItem
- 确认 RankingItem 包含 source_quote 和 verified 字段

---

## 任务4: 验证 + 测试

### 测试步骤

1. 用 YesWelder 的搜索结果重新跑 citation_analyzer
2. 检查维度打分矩阵中的数据：
   - verified: "verified" → 数据来自搜索结果，可信
   - verified: "partial" → 部分可验证，需要人工确认
   - verified: "unverified" → 数据不足，不可信
3. 验证 "YesWelder duty cycle" 是否被标记为 "unverified"

### 预期结果

```
维度: Duty Cycle
  Miller: 40% at max output (verified: "verified", source_quote: "The Miller Multimatic 220 has a 40% duty cycle")
  YesWelder: 数据不足，无法从搜索结果中验证 (verified: "unverified")
```

---

## CHECKLIST 自检

**任务1 [Prompt 改进]:**
- [ ] prompt 包含 "ONLY use information that appears in the text"
- [ ] prompt 包含 "do NOT guess or use your training data"
- [ ] prompt 包含 "Do NOT fabricate numbers, percentages, or specifications"
- [ ] 输出格式包含 source_quote 字段

**任务2 [后处理验证]:**
- [ ] _validate_dimension_scores 函数存在
- [ ] 函数使用模糊匹配（token 覆盖率）
- [ ] verified 字段值为 "verified" | "partial" | "unverified"
- [ ] 包含数字的 summary 在 unverified 时被替换为 "数据不足"

**任务3 [RankingItem 模型]:**
- [ ] RankingItem 模型定义在 state.py
- [ ] DimensionComparison.rankings 使用 RankingItem
- [ ] RankingItem 包含 source_quote 和 verified 字段

**任务4 [测试]:**
- [ ] 用 YesWelder 搜索结果重新跑 citation_analyzer
- [ ] "YesWelder duty cycle" 被标记为 "unverified"
- [ ] "Miller duty cycle" 被标记为 "verified"

---

## 交付格式

```
自检结果: X/4 任务1 + X/4 任务2 + X/3 任务3 + X/3 任务4 = XX/14
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改 _analyze_citation 和 _analyze_evaluation** — 只改 _analyze_comparison
2. **后处理验证是兜底** — prompt 约束是主要手段，后处理是补充
3. **source_quote 必须是原始文本中的原文** — 不能是 LLM 改写的
4. **verified 字段要传到报告** — 让用户知道哪些数据可信，哪些不可信
5. **不要删除 dimension_scores** — 只是标记 verified 状态，保留数据供参考
6. **模糊匹配阈值需要实测** — 60%/30% 是初始值，可能需要调整
