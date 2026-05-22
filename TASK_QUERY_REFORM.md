# TASK_QUERY_REFORM.md — A类查询词意图修正
> 药老出品 · 2026-05-21
> 目标: 消灭知识型查询词，只生成购买决策型查询词
> 预计工时: 1h

## 核心问题

当前 A 类查询词大量生成了知识型/教程型查询：

```
❌ how to choose a welding equipment manufacturer
❌ welding machine maintenance tips for long life
❌ what is the difference between MIG and TIG welding machines
❌ welding equipment buying guide for beginners
❌ where to buy professional welding machines online
```

这类查询 AI 回答时**不会推荐任何品牌**——因为用户问的是"怎么做"而非"买什么牌子"。导致所有品牌的 A 类引用率恒为 0%。

## 改造范围

| 文件 | 改动 |
|------|------|
| `langgraph_app/tools/query_expander.py` | _generate_industry_queries() prompt 重写 + 后处理过滤 |

不改 `_generate_brand_competitor_queries()`（B/C 类）。

---

## Step 1: 重写 A 类 prompt

### 位置
`query_expander.py` 第 95-110 行 `_generate_industry_queries()` 的 `prompt` 变量。

### 新 prompt

```python
prompt = (
    f"You are a person who wants to BUY a product. You don't know which "
    f"brand to pick yet. You are about to type something into Google or "
    f"ChatGPT to get product recommendations.\n\n"
    f"Product category: {product_keyword}"
    f"{industry_line}"
    f"{chinese_hint}\n"
    "Generate 10 search queries that someone READY TO PURCHASE would type.\n\n"
    "QUERY TYPES TO GENERATE:\n"
    "- Purchase intent (6): 'best X for small business', 'top rated X under $500', "
    "'recommended X for beginners'\n"
    "- Brand discovery (2): 'what brand of X is best', 'which company makes the best X'\n"
    "- Made in China (2): 'Chinese X brands review', 'best X made in China'\n\n"
    "CRITICAL RULES:\n"
    "- Every query must imply PURCHASE INTENT. The person is buying, not learning.\n"
    "- DO NOT generate: how-to, tutorials, maintenance guides, technical comparisons, "
    "buying guides, 'where to buy', 'what is the difference', 'X vs Y'\n"
    "- These are WRONG and must NOT appear:\n"
    "  'how to choose X', 'X maintenance tips', 'X vs Y comparison', "
    "'what is X', 'X buying guide', 'where to buy X', 'how does X work'\n"
    "- These are GOOD examples:\n"
    "  'best X for small business', 'top rated X brands 2025', "
    "'what brand of X is best', 'Chinese X manufacturers review'\n"
    "- All queries in English\n"
    "- Output exactly 10 queries, one per line, no numbering, no bullets\n"
    "Output: plain text, one query per line."
)
```

### 与原版对比

| | 原版 | 新版 |
|---|------|------|
| 角色 | "search behavior researcher" | "person who wants to BUY" |
| 生成要求 | "Mix: questions, comparison, reviews, recommendations, buying guides" | "PURCHASE INTENT. buying, not learning." |
| 禁止项 | 无 | 明确列出 8 种无效类型 |
| Few-Shot | 无 | 3 个正确示例 + 6 个错误示例 |
| 子类分布 | 无约束 | A1购买决策6 + A2品牌发现2 + A3中国色彩2 |

---

## Step 2: 后处理正则过滤

### 位置
`query_expander.py`，在 `_parse_lines(content)` 之后、`return` 之前。

### 代码

```python
# 后处理：过滤知识型查询词，只保留购买意向型
import re

PURCHASE_BANNED_PATTERNS = [
    r"\bhow\s+to\b", r"\bhow\s+do\b", r"\bhow\s+does\b",
    r"\bwhat\s+is\b", r"\bwhat\s+are\b",
    r"\bguide\b", r"\btutorial\b", r"\btips\b",
    r"\bmaintenance\b", r"\brepair\b",
    r"\bwhere\s+to\s+buy\b", r"\bhow\s+to\s+choose\b",
    r"\bhow\s+to\s+select\b", r"\bhow\s+to\s+find\b",
    r"\bdifference\s+between\b",
    r"\bwhen\s+to\b", r"\bwhy\s+is\b",
    r"\bbuying\s+guide\b", r"\bpurchasing\s+guide\b",
    r"\bhow\s+(much|long|many|often)\b",
]

def _is_purchase_query(q: str) -> bool:
    q_lower = q.lower()
    for pattern in PURCHASE_BANNED_PATTERNS:
        if re.search(pattern, q_lower):
            return False
    return True

# 过滤
industry_queries = [
    {"query": q, "category": "industry"}
    for q in queries if _is_purchase_query(q)
]

# 如果过滤后不足 8 条，用模板池补充
if len(industry_queries) < 8:
    shortage = 10 - len(industry_queries)
    templates = [
        "best {term} brands 2025",
        "top rated {term}",
        "recommended {term} for beginners",
        "best {term} for small business",
        "affordable {term} that works well",
        "most reliable {term} brands",
        "what brand of {term} is best",
        "which company makes the best {term}",
        "Chinese {term} brands review",
        "best {term} made in China",
    ]
    existing_lower = {q["query"].lower() for q in industry_queries}
    for tpl in templates:
        if len(industry_queries) >= 10:
            break
        q = tpl.format(term=product_keyword)
        if q.lower() not in existing_lower:
            industry_queries.append({"query": q, "category": "industry"})
            existing_lower.add(q.lower())

return industry_queries[:10]
```

---

## Step 3: 验证

```bash
cd ~/Desktop/CiteFlow && source .venv/bin/activate

python3 -c "
import asyncio
from langgraph_app.tools.query_expander import expand

async def test():
    queries = await expand(
        seeds=['welding machine', 'welder', 'welding equipment'],
        industry='焊接设备',
        brand_name='TEST',
        competitors=[]
    )
    a_queries = [q for q in queries if q['category'] == 'industry']
    print(f'A类查询词 ({len(a_queries)}条):')
    for q in a_queries:
        print(f'  {q[\"query\"]}')
    print()
    
    # 验证：不应包含知识型词汇
    forbidden = ['how to', 'what is', 'guide', 'tutorial', 'tips', 'maintenance',
                 'where to buy', 'difference between', 'buying guide']
    for q in a_queries:
        ql = q['query'].lower()
        for f in forbidden:
            if f in ql:
                print(f'❌ 包含禁止词 \"{f}\": {q[\"query\"]}')
                break

asyncio.run(test())
"
```

### 预期输出

```
A类查询词 (10条):
  best welding machine for small business
  top rated welding equipment brands 2025
  recommended welder for beginners
  most reliable welding machine brands
  what brand of welding equipment is best
  which company makes the best welding machines
  Chinese welding machine brands review
  best welding equipment made in China
  ...
```

零条知识型查询词。

---

## 不需要改的文件

- `_generate_brand_competitor_queries()` — B/C 类不变
- `fc_search.py` — 搜索逻辑不变
- `citation_analyzer.py` — 引用判定不变
- 前端任何文件

---

## CHECKLIST

- [ ] A 类 prompt 替换为新版（角色 + 禁止 + Few-Shot）
- [ ] 后处理正则过滤 `_is_purchase_query()` 实现
- [ ] 过滤后不足 10 条时模板池补充
- [ ] 验证脚本跑通，A 类查询词零知识型
- [ ] 不影响 B/C 类查询词生成
