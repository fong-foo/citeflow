# TASK_BRAND_PROFILER_INPUT.md — brand_profiler 输入端改造（Phase A）

> 药老出品 · 2026-05-06
> 来源：测试报告审计发现的逻辑问题
> 核心问题：brand_profiler 的输入端不应该依赖用户手动填写
> Phase A：增强爬取 + 提取新字段 + 加用户期望定位，但保留用户输入兜底

---

## 问题背景

当前 brand_profiler 的输入是用户手动填写的 5 个字段：
- domain（域名）
- brand_name（品牌名）
- industry（行业）
- target_market（目标市场）
- core_product（核心产品）

这有三个问题：

1. **用户可能填错** — 比如 Pela Case，用户填"行业：DTC品牌"，但 AI 可能认为它是"环保配件品牌"
2. **用户可能填不全** — 核心产品描述可能遗漏关键信息
3. **逻辑矛盾** — brand_profile 应该是"品牌自述"，但用户填的不是"品牌自述"，是"用户认为的品牌"

正确的逻辑应该是：
- brand_profiler 从官网爬取信息 → 得到"品牌在官网上的官方陈述"
- gap_report 对齐的是"品牌自述" vs "AI认知"
- 差距就是：品牌想让 AI 看到什么 vs AI 实际看到了什么

---

## Phase A 改动方案（本回合）

### 1. 用户输入精简 + 新增字段

**之前：**
```python
USER_INPUT = {
    "domain": "pelacase.com",
    "brand_name": "Pela Case",
    "industry": "DTC品牌",
    "target_market": "北美",
    "core_product": "可堆肥手机壳...",
    "seed_queries": [...],
    "competitors": [...],
}
```

**Phase A：**
```python
USER_INPUT = {
    "domain": "pelacase.com",
    "brand_name": "Pela Case",
    "industry": "DTC品牌",           # 保留，爬取失败时兜底
    "target_market": "北美",          # 保留，爬取失败时兜底
    "core_product": "可堆肥手机壳...", # 保留，爬取失败时兜底
    "target_positioning": "DTC环保品牌，想让AI把我们定位为DTC模式而非传统配件品牌",  # 新增：品牌想让AI看到什么
    "seed_queries": [...],
    "competitors": [...],
}
```

**说明：**
- industry / target_market / core_product 保留，爬取失败时继续兜底
- 新增 target_positioning：用户填"品牌想让AI看到什么"
- target_positioning 用于 gap_report 的第二个对齐维度：品牌期望 vs AI认知

### 2. brand_profiler.py 改动

**a) 增强爬取逻辑：**
- 爬取 4 个页面：首页 + /about + /products + /our-story
- 每个页面抓取文本量从 1500 字符增加到 3000 字符
- 爬取失败时继续用用户输入兜底（不改行为）

**b) 改造 LLM prompt：**
- 保留用户输入的 industry / target_market / core_product 作为参考
- 加一句："从官网内容中推断以下信息：行业、目标市场、核心产品"
- prompt 里传 target_positioning 字段："品牌期望定位：{target_positioning}"

**c) 输出格式扩展：**
```python
class BrandProfile(BaseModel):
    # 现有字段不变
    brand_name: str
    one_liner: str
    value_props: list[str]
    differentiators: list[str]
    target_personas: list[str]
    tone_keywords: list[str]
    full_description: str
    
    # 新增字段（Phase A）
    inferred_industry: str = ""           # 从官网推断的行业
    inferred_target_market: str = ""      # 从官网推断的目标市场
    inferred_core_product: str = ""       # 从官网推断的核心产品
    target_positioning: str = ""          # 品牌想让AI看到什么（用户填）
```

### 3. gap_report 逻辑调整

**当前 gap_report 对齐的是：**
- 左边：品牌自述（从用户输入）
- 右边：AI认知（从搜索结果分析）

**Phase A 改为两个对齐维度：**

维度1：品牌自述 vs AI认知
- 左边：官网爬取的品牌自述（inferred_* 字段）
- 右边：AI认知（从搜索结果分析）
- 差距：官网说了什么 vs AI看到了什么

维度2：品牌期望 vs AI认知
- 左边：用户填的 target_positioning
- 右边：AI认知（从搜索结果分析）
- 差距：品牌想说什么 vs AI看到了什么

维度2更有业务价值——客户最想知道的是"我想让AI怎么看我，AI实际怎么看我"。

**GapReport 输出格式扩展：**
```python
class GapReport(BaseModel):
    # 现有字段不变
    alignment_score: int
    aligned: list[str]
    misaligned: list[str]
    blind_spots: list[str]
    opportunities: list[str]
    one_line_summary: str
    
    # 新增字段（Phase A）
    target_alignment_score: int = 0       # 品牌期望 vs AI认知 的对齐度
    target_aligned: list[str] = []        # 品牌期望中AI已认知的部分
    target_misaligned: list[str] = []     # 品牌期望中AI未认知的部分
    target_gap_summary: str = ""          # 品牌期望 vs AI认知 的差距总结
```

### 4. probe_node.py 改动

- 调用 brand_profiler 时，传 target_positioning 字段
- 传给 gap_analysis 时，也传 target_positioning 字段

### 5. gap_analysis.py 改动

- 输入增加 target_positioning 字段
- prompt 增加："品牌期望定位：{target_positioning}"
- 输出增加 target_alignment_score / target_aligned / target_misaligned / target_gap_summary

---

## 需要改的文件

| 文件 | 改什么 |
|------|--------|
| brand_profiler.py | 增强爬取（4页面、更大文本量）+ prompt 改造 + 输出加 3 个 inferred_* 字段 |
| state.py | BrandProfile 加 inferred_industry / inferred_target_market / inferred_core_product / target_positioning |
| state.py | GapReport 加 target_alignment_score / target_aligned / target_misaligned / target_gap_summary |
| gap_analysis.py | 输入增加 target_positioning + prompt 改造 + 输出增加新字段 |
| probe_node.py | 传 target_positioning 给 brand_profiler 和 gap_analysis |
| test_real_brand.py | 更新 USER_INPUT，加 target_positioning 字段 |

---

## 注意事项

1. **爬取失败的降级方案**：Phase A 保留用户输入兜底。爬取失败时继续用用户填的 industry / target_market / core_product。不改行为。

2. **target_positioning 是可选的**：用户可以不填。如果不填，gap_report 只输出维度1（品牌自述 vs AI认知），不输出维度2。

3. **inferred_* 字段优先级**：爬取成功时用 inferred_* 字段，爬取失败时用用户输入的字段。下游模块（query_expander 等）先用 inferred_*，没有的话回退到用户输入。

4. **gap_report 两个维度的区别**：
   - 维度1：官网说了什么 vs AI看到了什么（信息传递是否有效）
   - 维度2：品牌想说什么 vs AI看到了什么（品牌期望是否实现）
   - 维度2更有业务价值，但需要用户填 target_positioning

5. **Phase B 验证后再做**：
   - 跑几个品牌验证 inferred_* 字段质量
   - 确认爬取成功率 > 80%
   - 确认 target_positioning 字段质量
   - 然后再去掉用户输入的 industry / target_market / core_product

---

## 自检清单

- [ ] 用户输入加 target_positioning 字段（可选）
- [ ] brand_profiler.py 增强爬取逻辑（4页面、更大文本量）
- [ ] brand_profiler.py prompt 改造（加 target_positioning、加"从官网推断"）
- [ ] BrandProfile 加 3 个 inferred_* 字段 + target_positioning 字段
- [ ] gap_analysis.py 输入增加 target_positioning + prompt 改造
- [ ] GapReport 加 target_alignment_score / target_aligned / target_misaligned / target_gap_summary
- [ ] probe_node.py 传 target_positioning 给 brand_profiler 和 gap_analysis
- [ ] test_real_brand.py 更新 USER_INPUT
- [ ] 爬取失败时的降级方案（保留用户输入兜底）
- [ ] 重跑 test_real_brand.py 验证 brand_profile 质量 + gap_report 两个维度

---

## 交付格式

```
自检结果: X/10
失败项: (无 / 列出)
测试结果: 
  brand_profile: inferred_industry=??? | inferred_target_market=???
  gap_report: alignment_score=???/100 | target_alignment_score=???/100
  target_positioning: 有/无
```
