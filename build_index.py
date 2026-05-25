# build_index.py — 扫描 knowledge/ → 分块 → embed → 入库 ChromaDB
# 用法: python3 build_index.py          # 增量 upsert
#       python3 build_index.py --rebuild # 清空重建
#       python3 build_index.py --query "xxx" # 测试查询

import json
import os
import re
import sys
import chromadb
import httpx
from typing import Optional

# 确保项目根在 sys.path
sys.path.insert(0, os.path.dirname(__file__))
from langgraph_app.tools.embedding import OfoxEmbeddingFunction

KB_DIR = os.path.join(os.path.dirname(__file__), "knowledge")
DB_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")


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
            continue

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

    # 获取或创建 collection（get_collection 必须传 embedding_function，否则维度不匹配）
    try:
        collection = client.get_collection("citeflow_knowledge", embedding_function=ef)
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
                try:
                    chunks = chunk_paper(os.path.join(papers_dir, fname))
                    all_chunks.extend(chunks)
                    print(f"  papers/{fname}: {len(chunks)} chunks")
                except Exception as e:
                    print(f"  papers/{fname}: SKIPPED ({e})")

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

    if all_chunks:
        collection.upsert(
            ids=[c["id"] for c in all_chunks],
            documents=[c["text"] for c in all_chunks],
            metadatas=[c["metadata"] for c in all_chunks],
        )

    print(f"完成！{collection.count()} chunks 已入库")


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
