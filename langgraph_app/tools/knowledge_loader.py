# knowledge_loader.py — RAG 向量检索版
# Doctor/Analyst 知识注入从 ChromaDB 向量检索，替代旧的子串匹配方式

import os
import re

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))


def _get_collection():
    """延迟加载 ChromaDB collection（避免启动时阻塞）。"""
    import chromadb
    db_dir = os.path.join(_PROJECT_ROOT, "chroma_db")
    client = chromadb.PersistentClient(path=db_dir)
    from langgraph_app.tools.embedding import OfoxEmbeddingFunction
    ef = OfoxEmbeddingFunction()
    return client.get_collection("citeflow_knowledge", embedding_function=ef)


def _build_query_text(triggered_rules: list[dict]) -> str:
    """根据触发的规则构建查询文本（用于向量检索）。"""
    if not triggered_rules:
        return ""

    parts = []
    for r in triggered_rules:
        rule_id = r.get("rule_id", 0)
        # 字段名对齐 detect_rules() 返回值: name, evidence（非 rule_name, detail）
        rule_name = r.get("name", "")
        evidence = r.get("evidence", "")

        dim_text = RULE_TO_CITE_DIMENSION.get(rule_id, f"规则{rule_id} {rule_name}")
        parts.append(dim_text)
        if evidence:
            parts.append(evidence[:200])

    return " ".join(parts[:3])


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

    results = collection.query(
        query_texts=[query],
        n_results=8,
    )

    if not results["ids"] or not results["ids"][0]:
        return ""

    parts = ["\n=== CiteFlow 知识库（RAG 向量检索） ===\n"]

    # CITE 维度上下文
    dims = set()
    for r in triggered_rules[:3]:
        rule_id = r.get("rule_id", 0)
        dim = RULE_TO_CITE_DIMENSION.get(rule_id, "")
        if dim:
            dims.add(f"  - 规则{rule_id} → CITE·{dim}")

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

        title = meta.get("title", chunk_id)
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
    return get_prescription_knowledge(triggered_rules, max_tokens)


def _fallback_prescription(triggered_rules: list[dict], max_tokens: int = 800) -> str:
    """ChromaDB 不可用时的 fallback。简单拼规则维度描述。"""
    dims = set()
    for r in triggered_rules[:5]:
        rule_id = r.get("rule_id", 0)
        dim = RULE_TO_CITE_DIMENSION.get(rule_id, "")
        if dim:
            dims.add(f"CITE·{dim}")

    if not dims:
        return ""
    return "=== CITE 维度上下文 ===\n" + "\n".join(f"  - {d}" for d in sorted(dims))


# ── 保留的旧常量（数据源 + fallback 参考）──────────────

RULE_KNOWLEDGE_MAP: dict[int, list[str]] = {
    1: [
        "论文1：GEO奠基论文",
        "论文3：引用吸收框架",
        "4.1 内容优化策略",
        "5.2 处方模板",
    ],
    2: [
        "论文1：GEO奠基论文",
        "论文2：AI如何颠覆搜索",
        "4.1 内容优化策略",
        "4.2 技术优化策略",
        "5.1 诊断维度",
    ],
    3: [
        "论文17：合规信号和权威乘数",
        "论文3：引用吸收框架",
        "4.3 品牌建设策略",
    ],
    4: [
        "论文5：创业公司产品可见性",
        "4.3 品牌建设策略",
    ],
    6: [
        "论文1：GEO奠基论文",
        "论文6：结构特征工程",
        "5.3 处方示例",
    ],
    10: [
        "论文6：结构特征工程",
        "论文3：引用吸收框架",
        "论文1：GEO奠基论文",
        "4.1 内容优化策略",
        "5.2 处方模板",
    ],
    12: [
        "3.1 ChatGPT",
        "3.2 Gemini",
        "3.3 Perplexity",
        "3.4 Claude",
    ],
    13: [
        "论文3：引用吸收框架",
        "论文4：文化编码",
        "论文1：GEO奠基论文",
    ],
    14: [
        "论文6：结构特征工程",
        "论文1：GEO奠基论文",
        "5.3 处方示例",
    ],
    8: [
        "论文14：不要测量一次",
        "论文21：超越检索——置信度衰减",
    ],
    9: [
        "论文11：多模态GEO",
        "论文13：Pinterest GEO",
    ],
    15: [
        "论文22：对抗SEO",
        "论文26：操纵LLM提升产品可见性",
        "论文30：隐蔽排名操纵",
        "论文31：LLM搜索引擎韧性",
    ],
}

PRESCRIPTION_KNOWLEDGE_MAP: dict[str, list[str]] = {
    "技术优化": [
        "论文2",
        "论文6",
        "4.2 技术优化策略",
    ],
    "内容优化": [
        "论文1",
        "论文3",
        "论文6",
        "4.1 内容优化策略",
        "5.3 处方示例",
    ],
    "权威建设": [
        "论文17",
        "论文3",
        "4.3 品牌建设策略",
    ],
    "社区运营": [
        "论文5",
        "论文4",
        "4.3 品牌建设策略",
    ],
    "风险防御": [
        "论文22",
        "论文26",
        "论文30",
        "论文31",
        "4.3 品牌建设策略",
    ],
}

RULE_TO_PRESCRIPTION_TYPE: dict[int, list[str]] = {
    1:  ["内容优化", "权威建设"],
    2:  ["技术优化", "内容优化", "权威建设"],
    3:  ["权威建设"],
    4:  ["权威建设", "社区运营"],
    6:  ["内容优化", "权威建设"],
    10: ["内容优化", "社区运营"],
    12: ["技术优化", "内容优化"],
    13: ["内容优化"],
    14: ["内容优化", "权威建设"],
    8:  ["技术优化", "内容优化"],
    9:  ["技术优化", "内容优化"],
    15: ["权威建设", "风险防御"],
}

RULE_TO_CITE_DIMENSION: dict[int, str] = {
    1:  "Identity — 定位偏差：AI描述与品牌自述不一致",
    2:  "Content — 品牌隐形：行业引用率严重偏低",
    3:  "Trust — 引用源质量差：缺乏高权威第三方引用",
    4:  "Trust + Engagement — 引用源单一：缺乏多元化背书",
    6:  "Content + Trust — 竞品维度劣势：在关键维度被竞品压制",
    10: "Content + Engagement — 行业影响力弱：品牌名被搜索但内容不被引用",
    12: "Content — 引擎差异异常：不同AI引擎对品牌认知不一致",
    13: "Identity — AI认知偏差：AI对品牌的理解与品牌自述有差距",
    14: "Content + Trust — 竞品胜负矩阵：在对比查询中输给竞品",
    8:  "Content + Trust — 引用不稳定：跨引擎引用来源高度不一致",
    9:  "Content — 多模态盲区：视觉密集型行业在VLM引擎中引用率偏低",
    15: "Trust — 竞品异常占位：竞品可能使用对抗优化手段操纵排名",
}

PRESCRIPTION_TYPE_TO_CITE: dict[str, dict] = {
    "技术优化": {
        "dimension": "Content",
        "sub_strategy": "结构化数据与可发现性",
        "diagnostic_focus": "Schema标记完整性、爬虫可访问性、多语言站点结构。目标：让AI能找到并理解你的数据。",
    },
    "内容优化": {
        "dimension": "Content + Identity",
        "sub_strategy": "内容引用力与品牌定位",
        "diagnostic_focus": "Title/Meta/Heading结构、FAQ内容、深度文章、品牌自述清晰度。目标：AI引用时呈现准确的品牌形象。",
    },
    "权威建设": {
        "dimension": "Trust",
        "sub_strategy": "第三方背书与信任信号",
        "diagnostic_focus": "权威媒体评测、行业报告、G2/Trustpilot评价、Wikipedia引用。目标：让AI有第三方证据推荐你。",
    },
    "社区运营": {
        "dimension": "Engagement",
        "sub_strategy": "社区存在与真实互动",
        "diagnostic_focus": "Reddit/Quora/YouTube讨论、用户生成内容、行业论坛活跃度。目标：证明品牌在目标市场活跃且被真实用户讨论。",
    },
    "风险防御": {
        "dimension": "Trust",
        "sub_strategy": "对抗攻击检测与权威信号强化",
        "diagnostic_focus": "监控竞品异常占位、检测prompt injection/STS注入/嵌入毒化攻击、多引擎交叉验证、强化权威信号。目标：保护品牌不被竞品用对抗手段压制AI排名。",
    },
}


def _extract_key_lines(content: str) -> str:
    """从知识节内容中提取关键行：列表项 + 关键发现 + 策略/优化策略行。"""
    lines = content.split("\n")
    result: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("###"):
            continue

        is_list = stripped.startswith("-") or stripped.startswith("*") or stripped.startswith("1.")
        has_keyword = any(kw in stripped for kw in [
            "关键发现", "提升", "降低", "有效", "无效", "偏好",
            "策略", "贡献", "影响", "格式", "来源", "内容",
            "引用", "可见性", "推荐", "cite", "SEO",
            "Schema", "Reddit", "YouTube", "Earned",
            "优化策略", "特殊行为", "数据来源",
        ])
        has_stat = bool(re.search(r"\d+[\.\d]*%", stripped)) or bool(re.search(r"\d+\.\d+", stripped))

        if is_list or has_keyword or has_stat:
            result.append(stripped)

    return "\n".join(result[:15])


def get_paper_citation(paper_id: int = 0, section: str = "") -> str:
    """根据论文编号和章节返回标准引用格式。"""
    paper_map = {
        1: "arXiv:2311.09735",
        2: "arXiv:2604.27790 (SIGIR 2026)",
        3: "arXiv:2604.25707",
        4: "arXiv:2601.00869",
        5: "arXiv:2601.00912",
        6: "arXiv:2603.29979",
        7: "arXiv:2603.20213",
        16: "arXiv:2603.09296",
        17: "arXiv:2603.12282",
    }
    arxiv = paper_map.get(paper_id, f"论文{paper_id}")
    if section:
        return f"论文{paper_id}（{arxiv}），Section {section}"
    return f"论文{paper_id}（{arxiv}）"
