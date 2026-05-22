# TASK_DOCTOR_NODE.md — Doctor 医师节点：从 Analyst 拆出处方，独立生成高质量处方

> 药老出品 · 2026-05-13
> 目标: 新建 Doctor 节点，独立生成页面级可执行处方
> 预计工时: 2-3h

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 新建 DoctorOutput 模型 | state.py | 15min |
| 2 | 新建处方知识注入 | knowledge_loader.py | 30min |
| 3 | 新建 Doctor prompt | doctor_prompt.py | 30min |
| 4 | 新建 Doctor 节点 | doctor_node.py | 30min |
| 5 | 新建 API 端点 | api.py | 15min |
| 6 | Analyst 传递 triggered_rules | analyst_node.py | 10min |
| 7 | 从 Analyst 剥离 actions | analyst_prompt.py | 15min |

**完成标准**: Doctor 节点独立运行，输入 Analyst 诊断结果 → 输出高质量处方 JSON

---

## 任务1: 新建 DoctorOutput 模型

### 需要改的文件
`langgraph_app/state.py`

### 实现要求

在 `AnalystOutput` 类之后，新增以下 Pydantic 模型：

```python
class PrescriptionItem(BaseModel):
    priority: str                           # P0 | P1 | P2
    category: str                           # 技术优化 | 内容优化 | 权威建设 | 社区运营
    target_page: str                        # 精确到页面，如 "/products 页面每个产品卡片下方"
    action: str                             # 一句话概括
    what_to_add: list[str]                  # 具体要添加的内容模板（可直接复制使用）
    evidence: str                           # 知识来源（论文X，Section Y）
    expected_impact: str                    # 量化预期（"A类引用率从10%提升至18-22%"）
    timeline: str                           # 预计时间（"1-2周"）
    how_to_verify: str                      # 复查时怎么验证效果
    difficulty: str = "中"                  # 低 | 中 | 高


class DoctorOutput(BaseModel):
    prescription: list[PrescriptionItem] = []
    summary: str = ""                       # 一段话总结整体策略（给用户"大图"）
    knowledge_sources: list[str] = []       # 引用的论文列表
    status: str = "success"
    error: Optional[str] = None
```

同时在 `State(TypedDict)` 中新增：

```python
    doctor_output: dict
```

放在 `analyst_output` 之后。

---

## 任务2: 新建处方知识注入

### 需要改的文件
`langgraph_app/tools/knowledge_loader.py`

### 实现要求

新增一个函数 `get_prescription_knowledge()`，不改现有的 `get_knowledge_for_rules()`。

#### 2.1 新增 PRESCRIPTION_KNOWLEDGE_MAP

```python
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
```

#### 2.2 规则到处方类型的映射

```python
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
```

#### 2.3 新增函数

```python
def get_prescription_knowledge(triggered_rules: list[dict], max_tokens: int = 800) -> str:
    """根据诊断中触发的规则，注入处方相关知识。

    与 get_knowledge_for_rules() 的区别：
    - get_knowledge_for_rules: 按诊断框架匹配（给 Analyst 用）
    - get_prescription_knowledge: 按处方类型匹配（给 Doctor 用）
    """
```

逻辑：
1. 遍历 triggered_rules，通过 RULE_TO_PRESCRIPTION_TYPE 获取需要的处方类型
2. 去重合并所有处方类型
3. 从 PRESCRIPTION_KNOWLEDGE_MAP 获取需要的知识节 key
4. 始终注入 "5.2 处方模板"（作为格式参考）
5. 调用已有的 `_match_sections()` 和 `_extract_key_lines()` 组装输出
6. 控制 max_tokens

---

## 任务3: 新建 Doctor prompt

### 需要新建的文件
`langgraph_app/tools/doctor_prompt.py`

### 实现要求

```python
# doctor_prompt.py — Doctor 医师 Prompt 模板
```

#### SYSTEM_PROMPT

```python
SYSTEM_PROMPT = """你是 CiteFlow 的 Doctor 医师。你的唯一职责是：根据诊断结果，开出页面级、可执行的优化处方。

你不是分析师。诊断已经做完了，你不需要分析原因、不需要复述数据。
你只做一件事：告诉用户"改哪里、改什么、怎么改"。

## 核心原则

1. 每条处方必须精确到：改哪个页面、加什么内容、用什么格式
2. 每条处方必须引用知识库中的研究证据（论文X，Section Y）
3. 每条处方必须量化：当前值 → 预期值 + 预计时间
4. 每条处方必须告诉用户"复查时怎么验证效果"
5. 按优先级排列：P0（立即做）→ P1（本月做）→ P2（下季度做）
6. P0不超过3条，P1不超过3条，P2不超过2条，总计不超过8条

## 处方质量标准

好的处方：
  ✓ "/products 页面每个产品卡片下方添加 FAQ 折叠面板（Schema: FAQPage），内容: Q: 'How does X compare to Y?' A: ..."
  ✓ "/about 页面首段从'X工具'改为'X平台'，添加数值事实（'100,000+ users'）"
  ✓ "复查时检查规则2是否仍触发，A类引用率是否>15%"

坏的处方：
  ✗ "优化网站内容" — 太模糊，不知道改哪里
  ✗ "提升品牌知名度" — 不是处方，是愿望
  ✗ "参考竞品做法" — 没有具体内容

## 处方类型（每条处方必须归类）

- 技术优化：Schema标记、爬虫配置、页面性能（执行者：开发者）
- 内容优化：官网文案、FAQ、对比页面、博客（执行者：内容团队）
- 权威建设：G2/Capterra评价、媒体评测、行业报告（执行者：市场/PR）
- 社区运营：Reddit、Quora、行业论坛（执行者：社区经理）

## 输出格式

只返回JSON，格式见下方示例。不要输出任何分析、解释、开场白。"""
```

#### FEW_SHOT

用下面这个完整示例（YesWelder案例），直接复制到 doctor_prompt.py：

```python
FEW_SHOT = """
## 输出示例（仅供参考格式，不要模仿具体内容）

输入概要:
  品牌=UGREEN | 行业=消费电子充电配件 | 域名=ugreen.com
  触发规则=规则2(品牌隐形,warning) + 规则10(行业影响力弱,warning) + 规则3(引用源质量差,warning)
  诊断=A类引用率10%，竞品Anker 73%，高权威源占比12%

正确输出:
{
  "prescription": [
    {
      "priority": "P0",
      "category": "技术优化",
      "target_page": "/products 及各产品详情页",
      "action": "为每个产品页面添加 FAQPage Schema 结构化数据",
      "what_to_add": [
        "Q: 'How does UGREEN [产品名] compare to Anker [对标产品]?' A: 包含价格对比、充电功率、用户评价数据",
        "Q: 'Is UGREEN compatible with iPhone 16?' A: 引用兼容性测试数据",
        "Q: 'What is the charging speed of [产品名]?' A: 精确数值，如 '100W GaN, charges MacBook Pro in 1.5 hours'"
      ],
      "evidence": "论文6, Section 4.4: 宏观结构贡献44.9%。论文3, Section 4.3: 可提取的数值事实提升引用率",
      "expected_impact": "A类引用率从10%提升至18-22%",
      "timeline": "1-2周",
      "how_to_verify": "复查时检查规则2是否仍触发，A类引用率是否>15%",
      "difficulty": "低"
    },
    {
      "priority": "P0",
      "category": "权威建设",
      "target_page": "外部平台（G2 + Trustpilot）",
      "action": "在G2和Trustpilot建立品牌页面，目标积累20+条真实评价",
      "what_to_add": [
        "注册G2企业账号，完善品牌信息和产品分类",
        "从现有客户中筛选50个活跃用户发送评价邀请",
        "前10条评价提供$10礼品卡激励",
        "在产品官网添加G2评价徽章和Trustpilot评分widget"
      ],
      "evidence": "论文17: Earned Media权威信号。论文3, Section 4.4: 评测平台影响力0.2144",
      "expected_impact": "高权威源占比从12%提升至35%+",
      "timeline": "2-3个月",
      "how_to_verify": "复查时检查规则3是否仍触发，source_authority中高权威源数量",
      "difficulty": "中"
    },
    {
      "priority": "P1",
      "category": "内容优化",
      "target_page": "/blog（新建）及行业媒体投稿",
      "action": "发布3篇充电配件行业深度对比报告",
      "what_to_add": [
        "文章1: 'UGREEN vs Anker: 2026 USB-C Charger Comparison'（含对比表格、充电功率数据、价格）",
        "文章2: 'Best GaN Chargers for MacBook Pro 2026'（含测试数据、使用场景）",
        "文章3: 'USB-C vs Lightning: Complete Charging Guide'（教育内容，建立专业权威）",
        "每篇文章：1500+字、含数据表格、引用行业标准、有明确结论"
      ],
      "evidence": "论文1, Section 4: Statistics Addition和Cite Sources提升15-30%可见性",
      "expected_impact": "A类引用率从18%提升至30%+",
      "timeline": "1-2个月",
      "how_to_verify": "复查时检查规则10是否仍触发，行业查询中品牌是否被提及",
      "difficulty": "中"
    },
    {
      "priority": "P1",
      "category": "内容优化",
      "target_page": "/about 及首页",
      "action": "重写品牌定位，从'充电配件品牌'升级为'智能充电解决方案'",
      "what_to_add": [
        "About页首段：从'UGREEN makes charging accessories'改为'UGREEN provides intelligent charging solutions trusted by millions of users worldwide'",
        "首页Hero：加入数值事实（'50M+ products sold'、'100+ countries'）",
        "添加'As seen in'板块：展示媒体评测和行业认可"
      ],
      "evidence": "论文4, Section 5: Algorithmic Omnipresence战略。论文3, Section 4.5: 语言效应对引用的影响",
      "expected_impact": "B类AI认知从'充电配件品牌'升级为'智能充电方案'",
      "timeline": "2-3周",
      "how_to_verify": "复查时检查B类查询的AI描述是否包含'solution'、'trusted'等关键词",
      "difficulty": "低"
    },
    {
      "priority": "P1",
      "category": "社区运营",
      "target_page": "Reddit r/UsbCHardware + r/MacBookPro",
      "action": "在Reddit技术社区参与充电配件讨论，建立品牌存在感",
      "what_to_add": [
        "在r/UsbCHardware回答充电兼容性问题（每周3-5条）",
        "在r/MacBookPro分享GaN充电器使用体验",
        "参与'best charger'讨论，用数据说话（充电功率、温度测试）",
        "不要硬推品牌，以技术专家身份参与讨论"
      ],
      "evidence": "论文5, Section 3.4: Reddit社区存在预测Perplexity可见性",
      "expected_impact": "Perplexity引用率提升5-10个百分点",
      "timeline": "1-2个月持续",
      "how_to_verify": "复查时检查Perplexity引擎引用率是否提升",
      "difficulty": "低"
    },
    {
      "priority": "P2",
      "category": "社区运营",
      "target_page": "Quora + 行业论坛",
      "action": "在Quora回答充电配件相关问题，建立专业权威",
      "what_to_add": [
        "搜索Quora上'best USB-C charger'、'UGREEN vs Anker'等高流量问题",
        "用专业角度回答，引用产品测试数据（充电功率、温度、兼容性）",
        "在回答中自然引用品牌官网链接",
        "目标：每月回答10-15个相关问题"
      ],
      "evidence": "论文5, Section 3.4: 社区存在和SEO基础预测可见性",
      "expected_impact": "长尾查询引用率提升5-8个百分点",
      "timeline": "2-3个月持续",
      "how_to_verify": "复查时检查长尾查询中品牌是否被提及",
      "difficulty": "低"
    }
  ],
  "summary": "UGREEN产品质量过硬但AI不认识你。核心策略：先让AI能找到你（Schema+爬虫）→ 再让AI信任你（G2评价+行业报告）→ 最后让AI推荐你（内容优化+社区运营）。预计90天内A类引用率从10%提升至30%+。",
  "knowledge_sources": [
    "论文1 (arXiv:2311.09735) — GEO奠基方法论",
    "论文3 (arXiv:2604.25707) — 引用吸收框架",
    "论文4 (arXiv:2601.00869) — 文化编码与品牌存在",
    "论文5 (arXiv:2601.00912) — 创业公司可见性",
    "论文6 (arXiv:2603.29979) — 结构特征工程",
    "论文17 (arXiv:2603.12282) — 合规信号与权威乘数"
  ]
}"""
```

---

## 任务4: 新建 Doctor 节点

### 需要新建的文件
`langgraph_app/nodes/doctor_node.py`

### 实现要求

参照 `analyst_node.py` 的结构，但更简单（不需要 build_context / detect_rules）：

```python
# doctor_node.py — Doctor 医师节点
# 读取 AnalystOutput → 组装处方上下文 → 知识注入 → LLM → 处方报告

import json
from langgraph_app.config import DEEPSEEK_CONFIG
from langgraph_app.tools.engines.chatgpt_api import call_api
from langgraph_app.tools.knowledge_loader import get_prescription_knowledge
from langgraph_app.tools.doctor_prompt import SYSTEM_PROMPT, FEW_SHOT
from langgraph_app.state import DoctorOutput, PrescriptionItem
from langgraph_app.validators.validator import validate_llm_output

NODE_NAME = "doctor"
NODE_ROLE = "医师 — 根据诊断结果生成页面级可执行处方"
MAX_RETRIES = 2


def doctor_node(state: dict) -> dict:
    """Doctor 节点主函数。

    1. 从 state 读取 analyst_output 和 probe_output
    2. 组装处方上下文（品牌信息 + 诊断结果 + 关键数据）
    3. 知识注入（get_prescription_knowledge）
    4. LLM 调用 + 重试 → 写入 state["doctor_output"]
    """
    analyst_output = state.get("analyst_output", {})
    probe_output = state.get("probe_output", {})
    user_input = state.get("user_input", {})

    if not analyst_output or analyst_output.get("status") != "success":
        return {"doctor_output": _empty_output("Analyst 诊断未成功，无法生成处方")}

    # 1. 组装处方上下文
    user_message = _build_prescription_context(analyst_output, probe_output, user_input)

    # 2. 知识注入
    triggered_rules = analyst_output.get("_triggered_rules", [])
    knowledge = get_prescription_knowledge(triggered_rules)
    if knowledge:
        user_message += "\n\n" + knowledge

    # 3. LLM 调用
    system_prompt = SYSTEM_PROMPT + "\n\n" + FEW_SHOT
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = call_api(
                messages=messages,
                config=DEEPSEEK_CONFIG,
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            content = resp["choices"][0]["message"].get("content", "").strip()
        except Exception as e:
            if attempt < MAX_RETRIES:
                continue
            return {"doctor_output": _empty_output(f"LLM 调用失败: {e}")}

        try:
            raw = json.loads(content)
        except json.JSONDecodeError:
            if attempt < MAX_RETRIES:
                messages = _append_retry(messages, content, [f"JSON 解析失败: {content[:200]}"])
                continue
            return {"doctor_output": _empty_output(f"JSON 解析失败: {content[:200]}")}

        result = validate_llm_output(raw, DoctorOutput, "doctor")
        if result["valid"]:
            return {"doctor_output": result["parsed"].model_dump()}
        if attempt < MAX_RETRIES:
            messages = _append_retry(messages, content, result["errors"])
            continue
        return {"doctor_output": _empty_output(
            f"Schema 验证失败: {'; '.join(result['errors'])}"
        )}

    return {"doctor_output": _empty_output("未知错误")}
```

#### `_build_prescription_context()` 函数

从 analyst_output 和 probe_output 中提取 Doctor 需要的信息，组装成 user message：

```python
def _build_prescription_context(analyst_output: dict, probe_output: dict, user_input: dict = None) -> str:
    """组装 Doctor 的输入上下文。

    结构：
    === 品牌信息 ===
    === 诊断结果 ===
    === 关键数据 ===
    """
    bp = probe_output.get("brand_profile", {})
    cm = probe_output.get("citation_metrics", {})
    diagnosis = analyst_output.get("diagnosis", {})
    actions = analyst_output.get("actions", [])
    competitor_gap = analyst_output.get("competitor_gap", {})
    triggered = analyst_output.get("_triggered_rules", [])

    parts = []

    # 品牌信息
    parts.append("=== 品牌信息 ===")
    parts.append(f"品牌：{bp.get('brand_name', '未知')}")
    domain = (user_input or {}).get('domain', '') or probe_output.get('domain', '')
    parts.append(f"域名：{domain or '未知'}")
    parts.append(f"行业：{bp.get('inferred_industry', '未知')}")
    parts.append(f"目标市场：{bp.get('inferred_target_market', '未知')}")
    parts.append("")

    # 诊断结果
    parts.append("=== 诊断结果（Analyst 输出）===")
    if diagnosis:
        parts.append(f"核心问题：{diagnosis.get('core_problem', '')}")
        parts.append(f"严重程度：{diagnosis.get('severity', '')}")
        parts.append(f"详细诊断：{diagnosis.get('problem_detail', '')}")
    parts.append("")

    # 触发规则
    if triggered:
        parts.append("触发规则：")
        for r in triggered:
            parts.append(f"  规则{r.get('rule_id')}: {r.get('name')}({r.get('severity')}) — {r.get('evidence', '')}")
        parts.append("")

    # 竞品差距
    if competitor_gap:
        parts.append("竞品差距：")
        parts.append(f"  根因：{competitor_gap.get('root_cause', '')}")
        if competitor_gap.get('losing_dimensions'):
            losing = ", ".join(d.get('dimension', '') for d in competitor_gap['losing_dimensions'][:3])
            parts.append(f"  落后维度：{losing}")
        parts.append("")

    # 关键数据
    parts.append("=== 关键数据 ===")
    parts.append(f"A类引用率：{cm.get('industry_rate', 0):.1f}%")
    parts.append(f"B类引用率：{cm.get('brand_rate', 0):.1f}%")

    sa = probe_output.get("source_authority", {})
    if sa:
        top_sources = sa.get("top_sources", [])
        high_auth = sum(1 for s in top_sources if s.get("authority_score", 0) >= 70)
        total = sa.get("total_sources", len(top_sources) or 1)
        parts.append(f"高权威源占比：{high_auth}/{total} ({high_auth/total*100:.0f}%)")

    return "\n".join(parts)
```

#### `_append_retry()` 和 `_empty_output()` 函数

复制 analyst_node.py 中的同名函数，改类型为 DoctorOutput：

```python
def _append_retry(messages, last_content, errors):
    # 与 analyst_node.py 相同逻辑
    ...

def _empty_output(error: str) -> dict:
    return DoctorOutput(
        prescription=[],
        summary="",
        knowledge_sources=[],
        status="error",
        error=error,
    ).model_dump()
```

---

## 任务5: 新建 API 端点

### 需要改的文件
`api.py`

### 实现要求

新增 `/api/doctor` POST 端点：

```python
class DoctorRequest(BaseModel):
    user_input: dict       # 用户输入（含 domain, brand_name 等）
    analyst_output: dict   # Analyst 的完整输出
    probe_output: dict     # Probe 的完整输出（用于提取品牌信息和关键数据）


@app.post("/api/doctor")
async def run_doctor(req: DoctorRequest):
    """Run Doctor agent with Analyst diagnosis and return prescription."""
    from langgraph_app.nodes.doctor_node import doctor_node

    state = {
        "user_input": req.user_input,
        "analyst_output": req.analyst_output,
        "probe_output": req.probe_output,
    }

    try:
        result = doctor_node(state)
        return result.get("doctor_output", {})
    except Exception as e:
        return {"status": "error", "error": str(e)}
```

---

## 任务6: Analyst 传递 triggered_rules 给 Doctor

### 需要改的文件
`langgraph_app/nodes/analyst_node.py`

### 问题

Doctor 需要知道哪些规则被触发了（用于知识注入），但当前 analyst_node 只返回 `analyst_output`，不包含 triggered_rules。

### 实现要求

在 analyst_node.py 中，把 `detect_rules(ctx)` 的结果存入 state：

```python
def analyst_node(state: dict) -> dict:
    # ... 现有代码 ...
    rules = detect_rules(ctx)          # 已有
    # ... 现有代码 ...

    # 在 return 时，把 triggered_rules 附加到 analyst_output 中
    output = result["parsed"].model_dump()
    output["_triggered_rules"] = rules.get("triggered", [])
    return {"analyst_output": output}
```

这样 Doctor 就能从 `analyst_output["_triggered_rules"]` 获取触发的规则列表。

---

## 任务7: 从 Analyst 剥离 actions（可选，建议做）

### 需要改的文件
`langgraph_app/tools/analyst_prompt.py`
`langgraph_app/nodes/analyst_node.py`

### 实现要求

这一步是把处方从 Analyst 中剥离，让 Analyst 只输出诊断。

**注意**：不要删除 AnalystOutput.actions 字段（向后兼容），但：
1. 在 Analyst 的 SYSTEM_PROMPT 中删除 actions 相关的输出要求
2. 在 Few-Shot 中删除 actions 示例
3. 在 SYSTEM_PROMPT 中加一句："行动建议（actions）由 Doctor 医师节点生成，你不需要输出。"

这样 Analyst 的 LLM 注意力100%给诊断，不再分心开处方。

**重要**：analyst_prompt.py 的 `ANALYSIS_GUIDE` 中的 `action_template` 也删除（那是给 Analyst 的处方提示，现在 Doctor 负责）。

---

## 验证方法

1. 启动 FastAPI：`cd ~/Desktop/CiteFlow && source .venv/bin/activate && uvicorn api:app --reload --port 8000`
2. 用已有的 flower_knows_probe.json 作为 probe_output
3. 先调 /api/analyst 拿到 analyst_output
4. 再调 /api/doctor 传入两个输出，验证：
   - 返回 JSON 包含 prescription 数组
   - 每条处方有 priority / category / target_page / action / what_to_add / evidence / expected_impact / timeline / how_to_verify
   - P0 不超过 3 条，总计不超过 8 条
   - summary 是一段话总结
   - knowledge_sources 列出引用的论文

---

## CHECKLIST 自检

**任务1 — state.py:**
- [ ] DoctorOutput 模型存在
- [ ] PrescriptionItem 模型存在（10个字段）
- [ ] State TypedDict 中有 doctor_output

**任务2 — knowledge_loader.py:**
- [ ] PRESCRIPTION_KNOWLEDGE_MAP 存在（4个处方类型）
- [ ] RULE_TO_PRESCRIPTION_TYPE 存在（9条规则映射）
- [ ] get_prescription_knowledge() 函数存在
- [ ] 始终注入 "5.2 处方模板"

**任务3 — doctor_prompt.py:**
- [ ] SYSTEM_PROMPT 存在（~500 token）
- [ ] FEW_SHOT 存在（完整 UGREEN 案例，~5条处方）
- [ ] SYSTEM_PROMPT 中有"处方质量标准"（好/坏对比）
- [ ] SYSTEM_PROMPT 中有"处方类型"定义（4类）

**任务4 — doctor_node.py:**
- [ ] doctor_node() 函数存在
- [ ] _build_prescription_context() 函数存在
- [ ] 输入：analyst_output + probe_output
- [ ] 输出：state["doctor_output"]
- [ ] 重试机制（MAX_RETRIES=2）
- [ ] JSON 解析 + Pydantic 验证

**任务5 — api_test.py:**
- [ ] /api/doctor POST 端点存在
- [ ] DoctorRequest 模型存在
- [ ] 调用 doctor_node 并返回结果

**任务6 — analyst_node.py:**
- [ ] triggered_rules 附加到 analyst_output 中
- [ ] key 为 "_triggered_rules"

**任务7 — analyst 剥离:**
- [ ] Analyst SYSTEM_PROMPT 中删除 actions 输出要求
- [ ] Analyst FEW_SHOT 中删除 actions 示例
- [ ] ANALYSIS_GUIDE 中删除 action_template
- [ ] AnalystOutput.actions 字段保留（向后兼容）

---

## 交付格式

```
自检结果: X/6 state + X/4 knowledge + X/4 prompt + X/6 node + X/3 api + X/2 rules + X/4 analyst = XX/29
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. 不改现有的 get_knowledge_for_rules()，那是 Analyst 用的
2. 不改现有的 analyst_node() 的函数签名，只改 prompt 内容
3. AnalystOutput.actions 字段保留，不删（向后兼容）
4. Doctor 使用 DEEPSEEK_CONFIG（与 Analyst 相同的模型配置）
5. Doctor 的 temperature 设为 0.3（比 Analyst 的 0.2 稍高，鼓励创造性处方）
6. 不新增 npm 依赖
7. validate_llm_output 已存在，直接用
