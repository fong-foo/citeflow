# TASK_MERGE_SEARCH_FLOWS.md — 合并搜索流，消除 GPT 重复调用

> 药老出品 · 2026-05-08
> 目标: A类查询三引擎并行，B/C类查询GPT单一引擎，GPT不重复调用
> 预计工时: 1-2h

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 主搜索流只跑B/C类查询 | probe_node.py | 30min |
| 2 | 多引擎流跑A类查询（三引擎） | probe_node.py | 20min |
| 3 | 验证+自检 | - | 30min |

**完成标准**: 同一批查询词，GPT只被调用一次（B/C类），Gemini/Haiku只被调用一次（A类），无重复调用。

---

## 背景

当前架构有两条搜索流：
1. **主搜索流 (搜索流P1)**: GPT 跑全部 21-30 条查询（A+B+C），每条 2 轮 FC → ~42 次 GPT 调用
2. **多引擎流**: GPT/Gemini/Haiku 跑 10 条 A 类查询 → GPT +20次, Gemini ~20次, Haiku ~10次

问题：GPT 对 A 类查询搜了两遍，浪费 token 和 API 调用。

## 新架构

```
Level 1 并行启动:
  ├─ brand_profiler (不变)
  ├─ query_expander (不变，产出 A/B/C 分类查询)
  ├─ 主搜索流: 只跑 B/C 类查询 → GPT FC → Level 2 (mm+gap, cite, scorer)
  ├─ 多引擎流: A类查询 → 三引擎并行 FC → 各自 citation_analyzer
  └─ 竞品流 (不变)
```

---

## 任务1: 主搜索流只跑 B/C 类查询

### 问题
`_stream_search_phase1` 当前跑全部查询词（A+B+C），但 A 类查询已经在多引擎流里由三引擎跑了。GPT 重复搜索 A 类浪费资源。

### 需要改的文件
`langgraph_app/nodes/probe_node.py`

### 实现要求

1. 在 `_probe_core` 中，构造 `search_phase1_queries` 时过滤掉 A 类（category=="industry"）查询：

```python
# 在 _probe_core 中，expand 之后、create_task 之前
# 过滤：主搜索流只跑 B/C 类（brand + competitor），A 类留给多引擎流
bc_queries = [q for q in expanded_queries if isinstance(q, dict) and q.get("category") != "industry"]
bc_query_strs = [q["query"] for q in bc_queries]

# 如果没有 B/C 类查询（极端情况），主搜索流仍然跑全部（兜底）
if not bc_query_strs:
    bc_query_strs = expanded_query_strs
    bc_queries = expanded_queries

search_task = None if _done("probe_search_p1") else asyncio.create_task(
    _stream_search_phase1(ui, bc_query_strs))
```

2. **重要**：`query_categories` 和 `expanded_queries` 仍然保留全部查询（包含A类），因为：
   - `_stream_cite` 需要知道所有查询的分类信息来计算分类引用率
   - 多引擎流需要 A 类查询
   - 只有传给 `_stream_search_phase1` 的 queries 列表需要过滤

3. `_stream_cite` 的调用需要调整——它当前接收主搜索流的 search_results，但主搜索流不再包含 A 类查询。需要想清楚 citation_analyzer 的数据来源：
   - **方案A**: `_stream_cite` 仍然跑 B/C 类的 search_results（主搜索流产出的），A 类的 citation 数据从多引擎流的 engine_results 里取
   - **方案B**: `_stream_cite` 合并 B/C 类 search_results + 多引擎流的 A 类 answers，统一分析

   **推荐方案A**：保持 `_stream_cite` 只分析 B/C 类结果，A 类的引用率从 engine_results 里计算。原因：
   - 多引擎流已经对 A 类做了 per-engine citation 分析
   - 不需要重复分析
   - `citation_metrics` 中 A 类相关的字段（industry_rate, industry_count 等）从 engine_results 聚合

4. 汇总时需要合并数据：
```python
# 在 _probe_core 汇总部分
# citation_metrics 中的 A 类数据从 engine_results 聚合
if engine_results:
    # 用 GPT 的 engine_results 作为 A 类引用率的代表
    gpt_engine = engine_results.get("chatgpt") or engine_results.get("gpt")
    if gpt_engine:
        # A 类引用率 = GPT 引擎对 A 类查询的引用率
        a_class_cite_rate = gpt_engine.citation_rate
        # 聚合到 citation_metrics 的 industry_rate 等字段
```

### 验证方法
- 测试1: 运行一次完整 Probe，检查 GPT API 调用日志 → A 类查询不应出现在主搜索流
- 测试2: engine_results 中 GPT/Gemini/Haiku 各自只有 10 条 A 类查询
- 测试3: citation_metrics 中 B/C 类数据正确，A 类数据从 engine_results 聚合

---

## 任务2: 多引擎流保持不变（确认）

### 问题
`_stream_multi_engine_search` 当前已经只跑 A 类查询（category=="industry"），逻辑正确，不需要改。

### 确认事项
- 多引擎流的 `query_categories` 传入的是全部查询的分类信息，从中过滤 A 类——这个逻辑已经在 line 950 了
- 不需要改动

---

## 任务3: GPT 引擎名称统一

### 问题
多引擎流中 GPT 引擎的 key 可能是 "chatgpt" 或 "gpt"（取决于 `search_multi_engine` 的返回），汇总时取值要注意。

### 需要确认
`search_multi_engine` 返回的 dict key 是什么？如果是 "chatgpt"，那 `engine_results.get("chatgpt")` 才对；如果是 "gpt"，用 `engine_results.get("gpt")`。

查看 `fc_search.py` 中 `search_multi_engine` 的实现，确认 key 名称。

---

## state.py 改动汇总

不需要改 state.py。现有字段足够：
- `ProbeOutput.engine_results`: 三引擎数据
- `CitationMetrics`: B/C 类数据从主搜索流，A 类数据从 engine_results 聚合

---

## CHECKLIST 自检

**任务1 [主搜索流过滤A类]:**
- [ ] 主搜索流只传入 B/C 类查询词
- [ ] A 类查询词仍传给多引擎流
- [ ] query_categories 保留全部分类信息
- [ ] citation_metrics 的 A 类字段从 engine_results 聚合
- [ ] 无 GPT 重复调用（日志确认）

**任务3 [引擎名称统一]:**
- [ ] 确认 search_multi_engine 返回的 key 名称
- [ ] 汇总代码用正确的 key 取 GPT 数据

---

## 交付格式

```
自检结果: X/5 任务1 + X/2 任务3 = XX/7
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改 `_stream_multi_engine_search`**——它已经正确只跑 A 类
2. **不要改 `_stream_search_phase1` 函数本身**——它只负责跑传入的 queries，过滤在调用方做
3. **不要改 `_stream_cite` 函数签名**——它接收 search_results 就行，上游过滤自然影响它
4. **向后兼容**：如果 `ENABLE_MULTI_ENGINE=False`，主搜索流应恢复跑全部查询（不过滤A类）
5. **测试时检查 API 调用日志**：确认 GPT 只被调用一次
