# TASK_COMPETITOR_FLOW_SEARCH.md — 竞品流改造：走搜索

> 药老出品 · 2026-05-07（v2 — 修复海老4个疑问）
> 目标: 竞品流从"裸调 DeepSeek"改成"先搜索再合成"，消除上游幻觉
> 预计工时: 3h

---

## 问题描述

**当前架构：**
```
主搜索流: Serper Google 搜索 → ChatGPT 合成答案 → citation_analyzer 提取 ✅ 有真实来源
竞品流:   competitor_query_gen → DeepSeek 直接回答 → citation_analyzer 提取 ❌ 无真实来源
```

**根因：**
- 竞品流没有搜索，DeepSeek 靠训练数据回答
- duty cycle、价格、保修年限都是 DeepSeek 编的
- citation_analyzer 只是忠实地提取了这些错误信息

**目标架构：**
```
竞品流: competitor_query_gen → Serper Google 搜索 → DeepSeek 合成答案 → citation_analyzer 提取 ✅ 有真实来源
```

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | competitor_query_gen 新增 search_and_answer | competitor_query_gen.py | 1.5h |
| 2 | probe_node.py 适配新流程 | probe_node.py | 1h |
| 3 | 测试验证 | - | 30min |

**完成标准**: 竞品流的数据来源基于真实搜索结果，不是 DeepSeek 训练数据。

---

## 任务1: competitor_query_gen 新增 search_and_answer

### 问题

当前 competitor_query_gen 直接调 DeepSeek 回答竞品对比问题，没有搜索。

### 需要改的文件
`langgraph_app/tools/competitor_query_gen.py`

### 实现要求

**职责分离：**
```
generate()          — 只生成查询词（保持不变）
search_and_answer() — 新增：搜索 → 合成答案
```

#### 1.1 导入 Serper 搜索函数

```python
# 注意：实际文件是 serper_search.py，不是 serper_client.py
from langgraph_app.tools.engines.serper_search import search as serper_search
```

#### 1.2 新增 search_and_answer 函数

```python
async def search_and_answer(query: str, semaphore: asyncio.Semaphore = None) -> dict:
    """单次"搜索→合成"原语
    
    Args:
        query: 竞品对比查询词
        semaphore: 并发控制信号量
    
    Returns:
        {"query": str, "answer": str, "search_results": list[dict]}
    """
    if semaphore is None:
        semaphore = asyncio.Semaphore(1)
    
    async with semaphore:
        # 1. 搜索
        search_results = await _search_serper(query)
        
        # 2. 合成答案（基于搜索结果）
        answer = await _synthesize_answer(query, search_results)
        
        return {
            "query": query,
            "answer": answer,
            "search_results": search_results,
        }


async def _search_serper(query: str, num_results: int = 5) -> list[dict]:
    """调 Serper Google 搜索，返回搜索结果列表
    
    注意：serper_search.search() 直接返回 list[dict]，不是 {"organic": [...]}
    """
    try:
        results = serper_search(query, num_results=num_results)
        # serper_search.search() 返回 list[dict]，每个 dict 有 title/url/snippet
        return results if isinstance(results, list) else []
    except Exception as e:
        return []


async def _synthesize_answer(query: str, search_results: list[dict]) -> str:
    """基于搜索结果合成答案（不是凭空回答）"""
    
    # 构建搜索结果文本
    results_text = ""
    for i, result in enumerate(search_results[:5], 1):
        title = result.get("title", "")
        snippet = result.get("snippet", "")
        url = result.get("url", "")  # 注意：serper_search 用 url，不是 link
        results_text += f"{i}. {title}\n   {snippet}\n   来源: {url}\n\n"
    
    if not results_text:
        return "搜索结果为空，无法回答"
    
    prompt = (
        f"基于以下搜索结果，回答用户的问题。"
        f"只使用搜索结果中的信息，不要添加自己的知识。"
        f"如果搜索结果中没有相关信息，说明'搜索结果中没有相关信息'。\n\n"
        f"=== 问题 ===\n{query}\n\n"
        f"=== 搜索结果 ===\n{results_text}\n\n"
        f"=== 回答要求 ===\n"
        f"1. 只使用搜索结果中的信息\n"
        f"2. 不要编造数据（如价格、保修年限、技术参数）\n"
        f"3. 如果搜索结果中没有具体数据，说明'搜索结果中未提及'\n"
        f"4. 引用来源 URL\n\n"
        f"回答:"
    )
    
    try:
        resp = call_api(
            messages=[{"role": "user", "content": prompt}],
            config=DEEPSEEK_CONFIG,
            temperature=0.1,
        )
        return resp["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"合成答案失败: {e}"
```

### 验证方法
- 读 competitor_query_gen.py，确认：
  - generate() 函数保持不变（只生成查询词）
  - 新增 search_and_answer() 函数（搜索 → 合成答案）
  - 导入路径正确（serper_search，不是 serper_client）
  - _search_serper 返回 list[dict]（不是 {"organic": [...]}）

---

## 任务2: probe_node.py 适配新流程

### 问题

当前 probe_node.py 的竞品流：
```python
comp_queries = gen_comp_queries(brand_name, competitors, industry)  # list[str]
comp_answers = await _batch_deepseek_ask(comp_queries)  # 单独调 DeepSeek
```

需要改成：
```python
comp_queries = gen_comp_queries(brand_name, competitors, industry)  # list[str]（不变）
comp_results = await _batch_search_and_answer(comp_queries)  # 搜索 → 合成
```

### 需要改的文件
`langgraph_app/nodes/probe_node.py`

### 实现要求

#### 2.1 导入新函数

```python
from langgraph_app.tools.competitor_query_gen import generate as gen_comp_queries, search_and_answer
```

#### 2.2 新增 _batch_search_and_answer 函数

```python
async def _batch_search_and_answer(queries: list[str], batch_size: int = 5) -> list[dict]:
    """批量搜索 + 合成答案（并发）"""
    semaphore = asyncio.Semaphore(batch_size)
    
    tasks = [search_and_answer(query, semaphore) for query in queries]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # 处理异常
    processed = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            processed.append({
                "query": queries[i],
                "answer": f"搜索失败: {result}",
                "search_results": [],
            })
        else:
            processed.append(result)
    
    return processed
```

#### 2.3 修改 _stream_competitor 函数

```python
async def _stream_competitor(brand_name, competitors, industry, ...):
    """竞品流：生成查询 → 搜索 → 合成答案"""
    
    # 1. 生成查询词（不变）
    comp_queries = gen_comp_queries(brand_name, competitors, industry)
    
    # 2. 搜索 + 合成答案（改为 search_and_answer）
    comp_results = await _batch_search_and_answer(comp_queries)
    
    # 3. 提取答案（用于后续 citation_analyzer）
    comp_answers = [r["answer"] for r in comp_results]
    
    # 4. 保留搜索结果（用于验证）
    comp_search_results = [r["search_results"] for r in comp_results]
    
    return comp_queries, comp_answers, comp_search_results
```

### 验证方法
- 读 probe_node.py，确认：
  - 导入 search_and_answer 函数
  - _batch_search_and_answer 函数实现（并发模式）
  - _stream_competitor 调用 search_and_answer（不是 _batch_deepseek_ask）
  - 输出包含 search_results 字段

---

## 任务3: 测试验证

### 测试步骤

1. 用 YesWelder 跑竞品流
2. 检查输出：
   - comp_search_results 是否有真实搜索结果
   - comp_answers 是否基于搜索结果（不是凭空编造）
3. 验证 duty cycle、价格、保修年限等数据是否有来源

### 预期结果

```
竞品对比查询: "YesWelder vs Miller duty cycle"
搜索结果:
  1. "YesWelder MP200 duty cycle: 60% at 200A" (yeswelder.com)
  2. "Miller Multimatic 220 duty cycle: 40% at 200A" (millerwelds.com)
  ...

合成答案:
  "根据搜索结果，YesWelder MP200 的占空比为 60% at 200A，
   Miller Multimatic 220 的占空比为 40% at 200A。
   来源: yeswelder.com, millerwelds.com"
```

---

## CHECKLIST 自检

**任务1 [competitor_query_gen]:**
- [ ] generate() 函数保持不变（只生成查询词）
- [ ] 新增 search_and_answer() 函数（搜索 → 合成答案）
- [ ] 导入路径正确（serper_search，不是 serper_client）
- [ ] _search_serper 返回 list[dict]（不是 {"organic": [...]}）
- [ ] _synthesize_answer 基于搜索结果合成（不是凭空回答）

**任务2 [probe_node.py]:**
- [ ] 导入 search_and_answer 函数
- [ ] _batch_search_and_answer 函数实现（并发模式）
- [ ] _stream_competitor 调用 search_and_answer（不是 _batch_deepseek_ask）
- [ ] 输出包含 comp_search_results 字段

**任务3 [测试验证]:**
- [ ] 用 YesWelder 跑竞品流
- [ ] comp_search_results 有真实搜索结果
- [ ] comp_answers 基于搜索结果（不是凭空编造）
- [ ] duty cycle、价格等数据有来源

---

## 交付格式

```
自检结果: X/5 任务1 + X/4 任务2 + X/4 任务3 = XX/13
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **职责分离** — generate() 只生成查询词，search_and_answer() 负责搜索+合成
2. **并发模式** — 复用 probe_node 的 asyncio.Semaphore 模式，不要串行
3. **导入路径** — serper_search.py，不是 serper_client.py
4. **返回格式** — serper_search.search() 返回 list[dict]，不是 {"organic": [...]}
5. **probe_node.py 也要改** — 不只改 competitor_query_gen
6. **保留搜索结果** — 存在 comp_search_results 字段，方便验证
