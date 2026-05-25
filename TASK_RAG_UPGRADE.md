# TASK_RAG_UPGRADE.md — 知识库从子串匹配升级到 RAG 向量检索

> 药老出品 · 2026-05-25 · 海老审后修订
> 目标：Doctor/Analyst 知识注入从硬编码子串匹配改为 ChromaDB 向量检索
> 预计工时：4h

---

## 现状 vs 目标

```
现状：
  规则触发 → RULE_KNOWLEDGE_MAP（硬编码）→ 子串匹配知识库标题
  → 读 GEO_ENGINE_KNOWLEDGE_BASE.md（旧文件 806行）
  → _extract_key_lines() 暴力抽行
  → 拼 800 token 注入 prompt

目标：
  规则触发 → 用诊断文本做 embedding
  → ChromaDB 向量检索 top-K 最相关 chunk
  → 注入 Doctor/Analyst prompt
```

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 安装 ChromaDB + 验证 embedding API | requirements.txt, 测试脚本 | 0.5h |
| 2 | 写 build_index.py（分块→embed→入库） | build_index.py（新） | 1.5h |
| 3 | 重写 knowledge_loader.py（向量检索） | knowledge_loader.py | 1.5h |
| 4 | 验证 Doctor 调用链 | doctor_node.py, 测试 | 0.5h |

---

## 任务1: 环境准备

### 需要改的文件
- `/Users/fogn/Desktop/CiteFlow/requirements.txt`

### 实现要求

```bash
pip install chromadb
```

在 requirements.txt 加：
```
chromadb>=0.4.0
```

验证 embedding API 可用：
```python
# verify_embedding.py
import httpx
import os

OFOX_API_KEY = os.environ.get("OFOX_API_KEY")
resp = httpx.post(
    "https://api.ofox.io/v1/embeddings",
    headers={"Authorization": f"Bearer {OFOX_API_KEY}"},
    json={"model": "text-embedding-3-small", "input": ["test"]},
    timeout=15,
)
data = resp.json()
emb = data["data"][0]["embedding"]
print(f"✅ embedding dims: {len(emb)}")  # 应该是 1536
```

### 验证方法
- `python3 build_index.py --dry-run` 只验证不写库

---

## 任务2: build_index.py

### 需要改的文件
- `/Users/fogn/Desktop/CiteFlow/build_index.py`（新建）

### 分块策略

```
每个 chunk = {
    "id": "paper_001_strategy_3",
    "text": "what + why + how + evidence（完整策略描述）",
    "metadata": {
        "source": "papers/paper_001_geo_foundation.json",
        "category": "paper",
        "paper_id": "001",
        "title": "GEO: Generative Engine Optimization",
        "arxiv": "2311.09735",
        "confidence": "high",
        "tags": ["citation", "content_optimization", "citation_absorption"],
    }
}
```

**分块来源**：

| 目录 | 分块方式 | 预计 chunk 数 |
|------|---------|--------------|
| papers/ | 每个 extracted_strategies 条目 = 1 chunk | ~45 |
| industries/ | 按 ## 标题分块 | ~20 |
| platforms/ | 按 ## 标题分块 | ~10 |
| regions/ | 按 ## 标题分块 | ~5 |
| templates/ | 每个模板文件 = 1 chunk | ~7 |
| anti-patterns/ | 每条反模式 = 1 chunk | ~10 |
| 策略总览 | 按 ## 标题分块 | ~5 |

总计约 ~100 个 chunk。

### 代码结构

```python
# build_index.py
import json
import os
import re
import chromadb
from chromadb.utils import embedding_functions
import httpx
from typing import Optional
from langgraph_app.tools.embedding import OfoxEmbeddingFunction

KB_DIR = os.path.join(os.path.dirname(__file__), "knowledge")
DB_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
OFOX_API_KEY = os.environ.get("OFOX_API_KEY", "")

# ── OfoxEmbeddingFunction 定义在 langgraph_app/tools/embedding.py ──
# 见注意事项第2条


def chunk_paper(filepath: str) -> list[dict]:
    """从一篇论文的 JSON 中提取策略 chunk。"""
    with open(filepath) as f:
        paper = json.load(f)
    
    paper_id = re.search(r'paper_(\d+)', os.path.basename(filepath))
    paper_id = paper_id.group(1) if paper_id else "unknown"
    
    chunks = []
    strategies = paper.get("extracted_strategies", [])
    for i, s in enumerate(strategies):
        text = f"论文: {paper.get('title', '')}\n"
        text += f"策略: {s.get('what', '')}\n"
        text += f"原理: {s.get('why', '')}\n"
        text += f"方法: {s.get('how', '')}\n"
        text += f"预期效果: {s.get('expected_impact', '')}\n"
        text += f"验证方式: {s.get('how_to_verify', '')}\n"
        if s.get('template'):
            text += f"执行模板: {s['template']}\n"
        if s.get('applicable_to'):
            text += f"适用场景: {', '.join(s['applicable_to'])}"
        
        chunks.append({
            "id": f"paper_{paper_id}_s{i}",
            "text": text,
            "metadata": {
                "source": os.path.relpath(filepath, KB_DIR),
                "category": "paper",
                "paper_id": paper_id,
                "title": paper.get("title", ""),
                "arxiv": paper.get("arxiv", ""),
                "confidence": s.get("confidence", "medium"),
                "tags": s.get("applicable_to", []),
            }
        })
    return chunks


def chunk_markdown(filepath: str, category: str) -> list[dict]:
    """按 ## 标题拆分 Markdown 文件。"""
    with open(filepath) as f:
        text = f.read()
    
    chunks = []
    sections = re.split(r'\n(?=## )', text)
    
    basename = os.path.splitext(os.path.basename(filepath))[0]
    
    for i, section in enumerate(sections):
        title_match = re.match(r'## (.+)', section)
        title = title_match.group(1) if title_match else f"{basename}_{i}"
        body = section.strip()
        
        if len(body) < 50:
            continue  # 跳过太短的章节
        
        chunks.append({
            "id": f"{category}_{basename}_{i}",
            "text": body,
            "metadata": {
                "source": os.path.relpath(filepath, KB_DIR),
                "category": category,
                "title": title,
            }
        })
    
    return chunks


def build_index(rebuild: bool = False):
    """主函数：扫描 knowledge/ → 分块 → embed → 入库。"""
    
    ef = OfoxEmbeddingFunction()
    
    if rebuild and os.path.exists(DB_DIR):
        import shutil
        shutil.rmtree(DB_DIR)
    
    client = chromadb.PersistentClient(path=DB_DIR)
    
    # 获取或创建 collection
    try:
        collection = client.get_collection("citeflow_knowledge")
    except Exception:
        collection = client.create_collection(
            "citeflow_knowledge",
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"},
        )
    
    all_chunks = []
    
    # 扫描 papers/
    papers_dir = os.path.join(KB_DIR, "papers")
    if os.path.exists(papers_dir):
        for fname in sorted(os.listdir(papers_dir)):
            if fname.endswith(".json"):
                chunks = chunk_paper(os.path.join(papers_dir, fname))
                all_chunks.extend(chunks)
                print(f"  papers/{fname}: {len(chunks)} chunks")
    
    # 扫描 industries/
    industries_dir = os.path.join(KB_DIR, "industries")
    if os.path.exists(industries_dir):
        for fname in sorted(os.listdir(industries_dir)):
            if fname.endswith(".md"):
                chunks = chunk_markdown(os.path.join(industries_dir, fname), "industry")
                all_chunks.extend(chunks)
                print(f"  industries/{fname}: {len(chunks)} chunks")
    
    # 扫描 platforms/
    platforms_dir = os.path.join(KB_DIR, "platforms")
    if os.path.exists(platforms_dir):
        for fname in sorted(os.listdir(platforms_dir)):
            if fname.endswith(".md"):
                chunks = chunk_markdown(os.path.join(platforms_dir, fname), "platform")
                all_chunks.extend(chunks)
                print(f"  platforms/{fname}: {len(chunks)} chunks")
    
    # 扫描 regions/
    regions_dir = os.path.join(KB_DIR, "regions")
    if os.path.exists(regions_dir):
        for fname in sorted(os.listdir(regions_dir)):
            if fname.endswith(".md"):
                chunks = chunk_markdown(os.path.join(regions_dir, fname), "region")
                all_chunks.extend(chunks)
                print(f"  regions/{fname}: {len(chunks)} chunks")
    
    # 扫描 templates/
    templates_dir = os.path.join(KB_DIR, "templates")
    if os.path.exists(templates_dir):
        for fname in sorted(os.listdir(templates_dir)):
            if fname.endswith(".md"):
                chunks = chunk_markdown(os.path.join(templates_dir, fname), "template")
                all_chunks.extend(chunks)
                print(f"  templates/{fname}: {len(chunks)} chunks")
    
    # 扫描 anti-patterns/
    ap_dir = os.path.join(KB_DIR, "anti-patterns")
    if os.path.exists(ap_dir):
        for fname in sorted(os.listdir(ap_dir)):
            if fname.endswith(".md"):
                chunks = chunk_markdown(os.path.join(ap_dir, fname), "anti-pattern")
                all_chunks.extend(chunks)
                print(f"  anti-patterns/{fname}: {len(chunks)} chunks")
    
    # 策略总览
    for fname in ["STRATEGY_OVERVIEW.md", "geoflow-practices.md", "citeflow-geo-audit-framework.md"]:
        fpath = os.path.join(KB_DIR, fname)
        if os.path.exists(fpath):
            chunks = chunk_markdown(fpath, "strategy")
            all_chunks.extend(chunks)
            print(f"  {fname}: {len(chunks)} chunks")
    
    print(f"\n总计: {len(all_chunks)} chunks，正在 embed...")
    
    # 批量插入（已存在的 id 会被更新）
    if all_chunks:
        # 分批 upsert（ChromaDB 限制每批最多 5461 条，我们的 ~100 条很安全）
        collection.upsert(
            ids=[c["id"] for c in all_chunks],
            documents=[c["text"] for c in all_chunks],
            metadatas=[c["metadata"] for c in all_chunks],
        )
    
    print(f"✅ 完成！{collection.count()} chunks 已入库")


def query_knowledge(query_text: str, top_k: int = 5, category_filter: Optional[str] = None) -> list[dict]:
    """向量检索知识库。可选的 category 过滤（如只查 paper）。"""
    client = chromadb.PersistentClient(path=DB_DIR)
    ef = OfoxEmbeddingFunction()
    collection = client.get_collection("citeflow_knowledge", embedding_function=ef)
    
    where_filter = None
    if category_filter:
        where_filter = {"category": category_filter}
    
    results = collection.query(
        query_texts=[query_text],
        n_results=top_k,
        where=where_filter,
    )
    
    # 格式化返回
    items = []
    if results["ids"] and results["ids"][0]:
        for i in range(len(results["ids"][0])):
            items.append({
                "id": results["ids"][0][i],
                "text": results["documents"][0][i] if results["documents"] else "",
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "distance": results["distances"][0][i] if results["distances"] else 0,
            })
    
    return items


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--rebuild", action="store_true", help="清空重建")
    p.add_argument("--query", type=str, help="测试查询")
    args = p.parse_args()
    
    if args.query:
        results = query_knowledge(args.query, top_k=3)
        print(f"查询: {args.query}")
        for r in results:
            print(f"  [{r['metadata'].get('category', '?')}] {r['metadata'].get('title', r['id'])} (distance={r['distance']:.4f})")
    else:
        build_index(rebuild=args.rebuild)
```

### 验证方法
```bash
# 首次构建
python3 build_index.py

# 测试查询
python3 build_index.py --query "品牌在AI搜索中引用率低怎么办"
# 应返回最相关的策略 chunk

python3 build_index.py --query "结构化数据 Schema 优化"
# 应返回论文6和技术模板相关 chunk

# 增量更新（玄老加新论文后）
python3 build_index.py
# 自动 upsert，已有 id 更新，新 id 插入
```

---

## 任务3: 重写 knowledge_loader.py 使用向量检索

### 需要改的文件
- `/Users/fogn/Desktop/CiteFlow/langgraph_app/tools/knowledge_loader.py`

### 核心改动

保持旧的函数签名不变（`get_prescription_knowledge(triggered_rules, max_tokens)` 和 `get_knowledge_for_rules(triggered_rules, max_tokens)`），但内部改为向量检索。

```python
# knowledge_loader.py — RAG 升级版

import os
import sys

# 项目根目录
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

def _get_collection():
    """延迟加载 ChromaDB collection（避免启动时阻塞）。"""
    import chromadb
    db_dir = os.path.join(_PROJECT_ROOT, "chroma_db")
    client = chromadb.PersistentClient(path=db_dir)
    # 必须传 embedding function，否则 ChromaDB 用默认的（向量维度不兼容）
    from langgraph_app.tools.embedding import OfoxEmbeddingFunction
    ef = OfoxEmbeddingFunction()
    return client.get_collection("citeflow_knowledge", embedding_function=ef)


def _build_query_text(triggered_rules: list[dict]) -> str:
    """根据触发的规则构建查询文本（用于向量检索）。"""
    if not triggered_rules:
        return ""
    
    # 复用现有常量，避免重复定义
    from langgraph_app.tools.knowledge_loader import RULE_TO_CITE_DIMENSION
    
    # 收集规则描述 + CITE 维度
    parts = []
    for r in triggered_rules:
        rule_id = r.get("rule_id", 0)
        rule_name = r.get("rule_name", "")
        detail = r.get("detail", "")
        
        dim_text = RULE_TO_CITE_DIMENSION.get(rule_id, f"规则{rule_id} {rule_name}")
        parts.append(dim_text)
        if detail:
            parts.append(detail[:200])  # 截断，防过长
    
    return " ".join(parts[:3])  # 最多用前 3 条规则


def get_prescription_knowledge(triggered_rules: list[dict], max_tokens: int = 800) -> str:
    """用向量检索获取处方相关知识（替代旧的 PRESCRIPTION_KNOWLEDGE_MAP）。"""
    if not triggered_rules:
        return ""
    
    query = _build_query_text(triggered_rules)
    if not query:
        return ""
    
    try:
        collection = _get_collection()
    except Exception as e:
        print(f"[knowledge_loader] ChromaDB not available: {e}")
        return _fallback_prescription(triggered_rules, max_tokens)
    
    # 向量检索 top-8（覆盖多种处方类型）
    results = collection.query(
        query_texts=[query],
        n_results=8,
    )
    
    if not results["ids"] or not results["ids"][0]:
        return ""
    
    # 组装输出（保持旧格式兼容）
    parts = ["\n=== CiteFlow 知识库（RAG 向量检索） ===\n"]
    
    # 添加 CITE 维度上下文（保持旧的格式）
    dims = set()
    for r in triggered_rules[:3]:
        rule_id = r.get("rule_id", 0)
        old_dim = {
            1: "Identity — 定位偏差", 2: "Content — 品牌隐形",
            3: "Trust — 引用源质量差", 4: "Trust + Engagement — 引用源单一",
            6: "Content + Trust — 竞品维度劣势", 10: "Content + Engagement — 行业影响力弱",
            12: "Content — 引擎差异异常", 13: "Identity — AI认知偏差",
            14: "Content + Trust — 竞品胜负矩阵",
        }.get(rule_id, "")
        if old_dim:
            dims.add(f"  - 规则{rule_id} → CITE·{old_dim}")
    
    if dims:
        parts.append("触发维度：")
        parts.extend(sorted(dims))
        parts.append("")
    
    # 压缩注入，控制 token
    char_budget = max_tokens * 1.5
    used = sum(len(p) for p in parts)
    
    for i in range(len(results["ids"][0])):
        chunk_id = results["ids"][0][i]
        doc = results["documents"][0][i] if results["documents"] else ""
        meta = results["metadatas"][0][i] if results["metadatas"] else {}
        
        # 精简格式
        title = meta.get("title", chunk_id)
        # 截取文档前 N 字符
        snippet = doc[:400]
        if len(doc) > 400:
            snippet += "..."
        
        entry = f"\n【{title}】\n{snippet}\n"
        if used + len(entry) > char_budget:
            break
        parts.append(entry)
        used += len(entry)
    
    return "".join(parts)


def get_knowledge_for_rules(triggered_rules: list[dict], max_tokens: int = 600) -> str:
    """给 Analyst 用的知识注入（与 get_prescription_knowledge 类似，但更侧重诊断）。"""
    # Analyst 侧重"为什么"（诊断），Doctor 侧重"怎么做"（处方）
    # 这里用同一套向量检索，但返回更精简
    return get_prescription_knowledge(triggered_rules, max_tokens)


# ── 保留旧的硬编码映射作为 fallback ──────────────
def _fallback_prescription(triggered_rules: list[dict], max_tokens: int = 800) -> str:
    """ChromaDB 不可用时的 fallback。简单拼规则维度描述。"""
    dims = set()
    for r in triggered_rules[:5]:
        rule_id = r.get("rule_id", 0)
        old_dim = {
            1: "Identity — 定位偏差", 2: "Content — 品牌隐形",
            3: "Trust — 引用源质量差", 4: "Trust + Engagement — 引用源单一",
            6: "Content + Trust — 竞品维度劣势", 10: "Content + Engagement — 行业影响力弱",
        }.get(rule_id, "")
        if old_dim:
            dims.add(f"CITE·{old_dim}")
    
    if not dims:
        return ""
    return "=== CITE 维度上下文 ===\n" + "\n".join(f"  - {d}" for d in sorted(dims))
```

### 不删的东西
- `RULE_KNOWLEDGE_MAP`、`PRESCRIPTION_KNOWLEDGE_MAP`、`RULE_TO_PRESCRIPTION_TYPE` — 保留作为 fallback 数据源
- `_extract_key_lines()` — 保留
- `get_paper_citation()` — 保留
- 旧函数签名 — 不变

### 验证方法
```bash
# 1. 确保 build_index 先跑过
cd /Users/fogn/Desktop/CiteFlow && python3 build_index.py

# 2. 测试向量检索
python3 -c "
from langgraph_app.tools.knowledge_loader import get_prescription_knowledge
rules = [
    {'rule_id': 2, 'rule_name': '品牌隐形', 'severity': 'high', 'detail': '行业引用率仅12%'},
    {'rule_id': 3, 'rule_name': '引用源质量差', 'severity': 'medium', 'detail': '高权威源占比18%'},
]
result = get_prescription_knowledge(rules)
print(f'注入长度: {len(result)} chars')
print(result[:500])
"
```

---

## 任务4: 验证 Doctor 调用链

### 需要改的文件
- 无需改代码，只运行测试

### 验证方法

```bash
cd /Users/fogn/Desktop/CiteFlow

# 用测试品牌跑一遍
curl -X POST http://localhost:8000/api/doctor \
  -H "Content-Type: application/json" \
  -d '{
    "brand_name": "TestBrand",
    "diagnosis": {"one_line_verdict": "品牌在AI搜索中引用率偏低"},
    "triggered_rules": [
      {"rule_id": 2, "rule_name": "品牌隐形", "severity": "high"}
    ]
  }' | python3 -m json.tool

# 看日志确认走了 RAG 路径（应打印 CITE 维度上下文，非旧格式）
```

### 验证方法
1. Doctor API 返回处方内容非空
2. 日志显示 "CITE 知识库（RAG 向量检索）" 而非旧的 "引擎知识库"
3. 处方中的 evidence 引用来源与向量检索结果一致

---

## 不需要改的文件
- `doctor_node.py` — 调用入口不变（仍调 `get_prescription_knowledge`）
- `analyst_briefing.py` — 同上
- `doctor_prompt.py` — prompt 不变
- `api.py` — API 端点不变

---

## CHECKLIST 自检

**任务1:**
- [ ] chromadb 安装成功
- [ ] embedding API 返回 1536 维向量

**任务2:**
- [ ] `build_index.py` 扫描所有 knowledge/ 子目录
- [ ] paper chunks 正确提取 extracted_strategies
- [ ] Markdown chunks 按 ## 分块
- [ ] ChromaDB 入库成功，collection.count() > 0
- [ ] `build_index.py --query "xxx"` 返回相关结果
- [ ] `--rebuild` 清空重建正常
- [ ] 增量 upsert 不重复插

**任务3:**
- [ ] `get_prescription_knowledge()` 用向量检索
- [ ] `get_knowledge_for_rules()` 正常工作
- [ ] fallback 路径可用（ChromaDB 不可用时）
- [ ] 旧函数签名不变
- [ ] 旧映射保留不删

**任务4:**
- [ ] Doctor API 调用正常
- [ ] 知识注入内容非空

---

## 交付格式

```
自检结果: X/2 任务1 + X/7 任务2 + X/5 任务3 + X/2 任务4 = XX/16
失败项: (无 / 列出)
```

---

## 注意事项

1. **`.gitignore` 加 `chroma_db/`** — 索引数据不提交到 Git，每个环境独立构建
2. **`OfoxEmbeddingFunction` 放独立文件** — 新建 `langgraph_app/tools/embedding.py`，`build_index.py` 和 `knowledge_loader.py` 都从它 import，避免循环依赖
3. **旧 `GEO_ENGINE_KNOWLEDGE_BASE.md`** — 保留不删，但 `knowledge_loader.py` 不再读取它。旧文件仅作文档参考，fallback 路径用到它时输出 warning
4. **首次部署必须运行** `python3 build_index.py`（Railway 启动命令里加，或手动跑一次）
5. **`OFOX_API_KEY` 必须在环境中** — embedding 依赖这个 key
6. **向后兼容** — 不要改 `doctor_node.py` 和 `analyst_briefing.py` 的调用方式
7. **build_index 幂等** — 重复运行安全（upsert 不是 insert）
8. **玄老以后加新论文**：写完 JSON → 跑 `python3 build_index.py` 即可增量入库
9. **paper_004 JSON 已修复** — 之前有两处未转义双引号（"Data Moat" / "Algorithmic Omnipresence"），已修复为 `\"...\"`
