# knowledge_loader.py — 动态知识注入
# 解析 GEO_ENGINE_KNOWLEDGE_BASE.md → 根据触发规则提取相关知识 → 注入 Analyst prompt
# 用户更新 Markdown 后无需改代码，下次运行自动生效

import os
import re

_KB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                        "GEO_ENGINE_KNOWLEDGE_BASE.md")

_KB_CACHE: dict[str, str] | None = None
_KB_MTIME: float = 0


def _load_knowledge_base(force: bool = False) -> dict[str, str]:
    """解析知识库 Markdown，按 ### 标题拆分为 {section_name: content}。

    缓存机制：文件未修改时复用上次解析结果。
    返回的 key 已清理（去掉 ✅❌ 等标记和多余空格）。
    """
    global _KB_CACHE, _KB_MTIME

    mtime = os.path.getmtime(_KB_PATH)
    if not force and _KB_CACHE is not None and mtime == _KB_MTIME:
        return _KB_CACHE

    with open(_KB_PATH, "r", encoding="utf-8") as f:
        text = f.read()

    sections: dict[str, str] = {}
    current_key = "_preamble"
    current_lines: list[str] = []

    for line in text.split("\n"):
        if line.startswith("### "):
            # 保存上一节
            if current_lines:
                sections[_clean_key(current_key)] = "\n".join(current_lines).strip()
            current_key = line[4:].strip()
            current_lines = [line]
        else:
            current_lines.append(line)

    # 最后一节
    if current_lines and current_key:
        sections[_clean_key(current_key)] = "\n".join(current_lines).strip()

    _KB_CACHE = sections
    _KB_MTIME = mtime
    return sections


def _clean_key(key: str) -> str:
    """清理标题中的标记符号，保留核心信息。"""
    return re.sub(r"[✅⬜]", "", key).strip()


# ── 规则 → 知识节映射 ──────────────────────────────────────
# key: 规则编号
# value: 知识节标题的子串列表（contains 匹配，顺序无关）
RULE_KNOWLEDGE_MAP: dict[int, list[str]] = {
    1: [  # 定位偏差：对齐度<60且行业引用率>80%
        "论文1：GEO奠基论文",
        "论文3：引用吸收框架",
        "4.1 内容优化策略",
        "5.2 处方模板",
    ],
    2: [  # 品牌隐形：引用率<30%
        "论文1：GEO奠基论文",
        "论文2：AI如何颠覆搜索",
        "4.1 内容优化策略",
        "4.2 技术优化策略",
        "5.1 诊断维度",
    ],
    3: [  # 引用源质量差：高权威源占比<30%
        "论文17：合规信号和权威乘数",
        "论文3：引用吸收框架",
        "4.3 品牌建设策略",
    ],
    4: [  # 引用源单一：source_diversity<0.5
        "论文5：创业公司产品可见性",
        "4.3 品牌建设策略",
    ],
    6: [  # 竞品维度劣势：gap<-20
        "论文1：GEO奠基论文",
        "论文6：结构特征工程",
        "5.3 处方示例",
    ],
    10: [  # 行业影响力弱：B>50%且A<20%
        "论文6：结构特征工程",
        "论文3：引用吸收框架",
        "论文1：GEO奠基论文",
        "4.1 内容优化策略",
        "5.2 处方模板",
    ],
    12: [  # 引擎差异异常：最大差异>20%
        "3.1 ChatGPT",
        "3.2 Gemini",
        "3.3 Perplexity",
        "3.4 Claude",
    ],
    13: [  # AI认知偏差：B类≥3条
        "论文3：引用吸收框架",
        "论文4：文化编码",
        "论文1：GEO奠基论文",
    ],
    14: [  # C类竞品胜负矩阵：C类≥3条
        "论文6：结构特征工程",
        "论文1：GEO奠基论文",
        "5.3 处方示例",
    ],
}

# 通用注入：不管什么规则都注入（引擎对比基础信息）
_BASELINE_KEYS = [
    "论文3：引用吸收框架",
    "论文1：GEO奠基论文",
]


def get_knowledge_for_rules(triggered_rules: list[dict], max_tokens: int = 600) -> str:
    """根据触发的规则，从知识库提取相关知识。

    Args:
        triggered_rules: detect_rules() 返回的 triggered 列表
        max_tokens: 注入的知识 token 上限（中文约1.5字/token）

    Returns:
        格式化的知识文本，可直接追加到 user message
    """
    if not triggered_rules:
        return ""

    kb = _load_knowledge_base()

    # 收集需要注入的知识节 key
    needed_keys = set(_BASELINE_KEYS)
    for r in triggered_rules:
        rule_id = r.get("rule_id", 0)
        for key_substr in RULE_KNOWLEDGE_MAP.get(rule_id, []):
            needed_keys.add(key_substr)

    # 匹配知识库中的实际节
    matched = _match_sections(kb, needed_keys)

    if not matched:
        return ""

    # 压缩组装，控制 token
    parts = ["\n=== 引擎知识库（相关研究证据） ===\n"]
    char_budget = max_tokens * 1.5  # 中文约1.5字/token
    used = 0

    for title, content in matched.items():
        # 提取关键行（- 开头的列表项 + 关键发现）
        key_lines = _extract_key_lines(content)
        snippet = f"【{title}】\n{key_lines}\n"
        if used + len(snippet) > char_budget:
            # 已到上限，截断
            remaining = int(char_budget - used)
            if remaining > 50:
                parts.append(snippet[:remaining] + "\n...(已截断)")
            break
        parts.append(snippet)
        used += len(snippet)

    return "".join(parts)


def _match_sections(kb: dict[str, str], needed_keys: set[str]) -> dict[str, str]:
    """在知识库中匹配需要的节。key_substr 包含在节标题中即匹配。"""
    matched: dict[str, str] = {}
    for section_title, content in kb.items():
        for key_substr in needed_keys:
            if key_substr in section_title:
                # 用简短标题作为输出 key
                short_title = key_substr
                matched[short_title] = content
                break
    return matched


def _extract_key_lines(content: str) -> str:
    """从知识节内容中提取关键行：列表项 + 关键发现 + 策略/优化策略行。

    跳过：第一行（重复标题）、行内链接、格式文本。
    """
    lines = content.split("\n")
    result: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # 跳过标题行（重复节名）
        if stripped.startswith("###"):
            continue

        # 保留：列表项、关键发现、策略行、数字统计
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

    return "\n".join(result[:15])  # 每节最多15行，防过长


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


# ── 处方知识映射（Doctor 专用）──────────────────────────
# 按处方类型映射知识库章节
PRESCRIPTION_KNOWLEDGE_MAP: dict[str, list[str]] = {
    "技术优化": [
        "论文2",           # AI爬虫行为
        "论文6",           # 结构特征工程
        "4.2 技术优化策略", # Schema标记、爬虫配置
    ],
    "内容优化": [
        "论文1",           # GEO奠基方法论
        "论文3",           # 引用吸收框架
        "论文6",           # 结构特征工程
        "4.1 内容优化策略",
        "5.3 处方示例",
    ],
    "权威建设": [
        "论文17",          # 合规信号和权威乘数
        "论文3",           # 引用深度
        "4.3 品牌建设策略",
    ],
    "社区运营": [
        "论文5",           # 创业公司可见性
        "论文4",           # 文化编码
        "4.3 品牌建设策略",
    ],
}

# ── CITE 四维模型映射 ──────────────────────────────────
# 处方类型 → CITE 维度 + 诊断重点
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
}

# 规则ID → CITE 维度（用于知识注入时标注维度上下文）
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
}

# 规则ID → 需要的处方类型
RULE_TO_PRESCRIPTION_TYPE: dict[int, list[str]] = {
    1:  ["内容优化", "权威建设"],       # 定位偏差
    2:  ["技术优化", "内容优化", "权威建设"],  # 品牌隐形
    3:  ["权威建设"],                   # 引用源质量差
    4:  ["权威建设", "社区运营"],       # 引用源单一
    6:  ["内容优化", "权威建设"],       # 竞品维度劣势
    10: ["内容优化", "社区运营"],       # 行业影响力弱
    12: ["技术优化", "内容优化"],       # 引擎差异异常
    13: ["内容优化"],                   # AI认知偏差
    14: ["内容优化", "权威建设"],       # 竞品胜负矩阵
}


def get_prescription_knowledge(triggered_rules: list[dict], max_tokens: int = 800) -> str:
    """根据诊断中触发的规则，注入处方相关知识。

    与 get_knowledge_for_rules() 的区别：
    - get_knowledge_for_rules: 按诊断框架匹配（给 Analyst 用）
    - get_prescription_knowledge: 按处方类型匹配（给 Doctor 用）

    新增（2026-05-22）：注入 CITE 四维模型维度上下文，
    LLM 生成的每条处方 evidence 字段会带上 CITE·{维度} 前缀。
    """
    if not triggered_rules:
        return ""

    kb = _load_knowledge_base()

    # 1. 收集需要的处方类型
    needed_types: set[str] = set()
    for r in triggered_rules:
        rule_id = r.get("rule_id", 0)
        for ptype in RULE_TO_PRESCRIPTION_TYPE.get(rule_id, []):
            needed_types.add(ptype)

    if not needed_types:
        return ""

    # 2. 收集触发的 CITE 维度上下文
    cite_contexts: list[str] = []
    seen_dimensions: set[str] = set()
    for r in triggered_rules:
        rule_id = r.get("rule_id", 0)
        dim = RULE_TO_CITE_DIMENSION.get(rule_id)
        if dim and dim not in seen_dimensions:
            cite_contexts.append(f"  - 规则{rule_id} → CITE·{dim}")
            seen_dimensions.add(dim)

    # 3. 收集各处方类型对应的 CITE 维度
    cite_dimensions: dict[str, dict] = {}
    for ptype in needed_types:
        cite_info = PRESCRIPTION_TYPE_TO_CITE.get(ptype)
        if cite_info:
            cite_dimensions[ptype] = cite_info

    # 4. 从 PRESCRIPTION_KNOWLEDGE_MAP 获取需要的知识节 key
    needed_keys: set[str] = {"5.2 处方模板"}  # 始终注入
    for ptype in needed_types:
        for key_substr in PRESCRIPTION_KNOWLEDGE_MAP.get(ptype, []):
            needed_keys.add(key_substr)

    # 5. 匹配知识库中的实际节
    matched = _match_sections(kb, needed_keys)

    if not matched:
        return ""

    # 6. 组装输出：CITE 维度上下文 + 知识内容
    parts = ["\n=== CiteFlow CITE 四维诊断上下文 ==="]
    parts.append("以下规则被触发，对应 CITE 模型维度：")
    parts.extend(cite_contexts)
    parts.append("")
    parts.append("处方策略维度指南：")
    for ptype, info in cite_dimensions.items():
        parts.append(f"  [{ptype}] -> CITE {info['dimension']} {info['sub_strategy']}")
        parts.append(f"    诊断重点：{info['diagnostic_focus']}")
    parts.append("")

    # 6b. 如果有 Trust 维度，注入证据成熟度模型
    if "权威建设" in needed_types:
        parts.append("=== 证据成熟度模型（Trust 维度专用） ===")
        parts.append("按 A/B/C/D/E 五级评估品牌主张的证据强度：")
        parts.append("  A 官方已证实 - 品牌官网/官方文档可验证 - 最高优先级引用")
        parts.append("  B 第三方佐证 - 权威媒体/评测平台独立验证 - 高优先级")
        parts.append("  C 内部待授权 - 内部数据未公开 - 需脱敏后升级")
        parts.append("  D 需要补证 - 声称但无法验证(行业领先等) - AI 倾向忽略")
        parts.append("  E 禁止使用 - 虚假/过时/违规 - 损害引用率")
        parts.append("处方规则：A级占比<20% -> P0补充官方页。D+E>30% -> P0清理不可验证主张。每条Trust处方标注目标证据等级。")
        parts.append("")

    # 7. 追加知识库内容
    parts.append("=== 处方知识库（优化策略参考） ===")
    char_budget = max_tokens * 1.5
    used = sum(len(p) for p in parts)

    for title, content in matched.items():
        key_lines = _extract_key_lines(content)
        snippet = f"【{title}】\n{key_lines}\n"
        if used + len(snippet) > char_budget:
            remaining = int(char_budget - used)
            if remaining > 50:
                parts.append(snippet[:remaining] + "\n...(已截断)")
            break
        parts.append(snippet)
        used += len(snippet)

    return "\n".join(parts)
