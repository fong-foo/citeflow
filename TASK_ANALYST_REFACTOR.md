# TASK_ANALYST_REFACTOR.md — Analyst 重构（方案 Y v2）

> 药老设计，海老执行。2026-05-09
> 前置条件：Probe 数据质量已验证通过

---

## 一、目标

把 Analyst 从"898行单文件 + 3500 token prompt + LLM 自觉执行规则"重构为：
- 代码判断规则触发 → LLM 只做深度分析
- Prompt 从 ~3500 token 降到 ~1200 token
- 文件从 1×898行拆成 4×150行

## 二、架构（方案 Y）

```
probe_output
    ↓
build_context(probe_output) → ctx dict（纯数据 + 维度聚合结果，不做判断）
    ↓
detect_rules(ctx) → triggered_rules dict（代码判断触发条件）
    ↓
build_briefing(ctx, triggered_rules) → user_message str（诊断briefing格式）
    ↓
LLM（SYSTEM_PROMPT + user_message[触发规则 + 关键异常 + 详细数据]）
    ↓
AnalystOutput
```

关键设计决策：
- 规则详情放在 user message 开头，不放 system prompt（system 保持稳定，user 包含动态内容）
- 规则分两类：条件触发规则（代码判断）+ 分析框架（按需注入）
- 辅助规则（5/7/11）不进 detect_rules，作为分析框架在 ANALYSIS_GUIDE 里，触发相关规则时注入

## 三、文件结构

```
langgraph_app/
  nodes/
    analyst_node.py          ← 主流程（~120行，从898行缩减）
  tools/
    analyst_context.py       ← build_context（~200行，新增维度聚合输出）
    analyst_rules.py         ← 新文件（~180行）：detect_rules + 9个条件触发规则
    analyst_prompt.py        ← 新文件（~200行）：SYSTEM_PROMPT + ANALYSIS_GUIDE + Few-Shot
    analyst_briefing.py      ← 新文件（~250行）：build_briefing（从_build_user_message重构）
```

---

## 四、Task 0: analyst_context.py（增强 build_context）

### 改动

build_context 输出新增 `dimension_aggregation` 字段，供 detect_rules 和 build_briefing 直接使用，避免重复计算。

在 build_context 末尾新增：

```python
# ── 维度聚合结果（供规则6和briefing使用）────────────
competitor_summary = {...}  # 已有代码
dimension_aggregation = _aggregate_dimensions(
    dimension_matrix=competitor_summary.get("dimension_matrix", []),
    brand_name=brand_name,
    dimension_data_quality=competitor_summary.get("dimension_data_quality", {})
)
ctx["dimension_aggregation"] = dimension_aggregation
```

新增函数：

```python
def _aggregate_dimensions(dimension_matrix: list, brand_name: str, dimension_data_quality: dict) -> dict:
    """聚合维度打分矩阵：每个维度的品牌平均分 + gap。

    Args:
        dimension_matrix: 从 competitor_summary["dimension_matrix"] 获取
        brand_name: 从 build_context 的 brand_name 变量传入
        dimension_data_quality: 从 competitor_summary["dimension_data_quality"] 获取

    Returns:
        {
            "dimensions": [
                {
                    "name": "耐用性",
                    "brand_scores": {"YesWelder": 55, "lincolnelectric.com": 80},
                    "brand_avg": 55,
                    "competitor_avg": 80,
                    "gap": -25,
                    "severity": "重大劣势"  # gap > 20 → 重大, 10-20 → 中等, < 10 → 势均力敌
                },
                ...
            ],
            "losing_dimensions": [...],   # gap < -20
            "winning_dimensions": [...],  # gap > 20
            "data_quality": {"total": 30, "null_count": 12, "null_ratio": 40}
        }
    """
    # 参数已由调用方传入，无需再从 comp 提取

    # 按维度聚合
    dim_map = {}
    for dm in dim_matrix:
        dim_name = dm.get("dimension", "")
        if dim_name not in dim_map:
            dim_map[dim_name] = {}
        for r in dm.get("rankings", []):
            brand = r.get("brand", "")
            score = r.get("score")
            if score is None:
                continue
            if brand not in dim_map[dim_name]:
                dim_map[dim_name][brand] = []
            dim_map[dim_name][brand].append(score)

    dimensions = []
    losing = []
    winning = []

    for dim_name, brands in dim_map.items():
        brand_avg = {b: round(sum(s)/len(s)) for b, s in brands.items()}

        # 找用户品牌和竞品平均
        user_score = None
        comp_scores = []
        for b, s in brand_avg.items():
            # 通过 brand_name 匹配（外部传入）
            # 规范化精确匹配：提取域名主干或品牌名小写
            b_normalized = b.lower().strip()
            brand_normalized = brand_name.lower().strip()
            # 精确匹配：品牌名完全相等，或 b 以 brand_name 开头（如 "YesWelder" 匹配 "YesWelder welders"）
            if brand_name and (b_normalized == brand_normalized or b_normalized.startswith(brand_normalized + " ") or b_normalized.startswith(brand_normalized + ".")):
                user_score = s
            else:
                comp_scores.append(s)

        comp_avg = round(sum(comp_scores) / len(comp_scores)) if comp_scores else None
        gap = (user_score - comp_avg) if (user_score is not None and comp_avg is not None) else None

        if gap is not None:
            if gap > 20:
                severity = "重大优势"
                winning.append({"dimension": dim_name, "brand_score": user_score, "competitor_avg_score": comp_avg, "gap": gap})
            elif gap < -20:
                severity = "重大劣势"
                losing.append({"dimension": dim_name, "brand_score": user_score, "competitor_avg_score": comp_avg, "gap": gap})
            elif gap > 10:
                severity = "中等优势"
            elif gap < -10:
                severity = "中等劣势"
            else:
                severity = "势均力敌"
        else:
            severity = "数据不足"

        dimensions.append({
            "name": dim_name,
            "brand_scores": brand_avg,
            "brand_avg": user_score,
            "competitor_avg": comp_avg,
            "gap": gap,
            "severity": severity,
        })

    return {
        "dimensions": dimensions,
        "losing_dimensions": losing,
        "winning_dimensions": winning,
        "data_quality": dimension_data_quality,
    }
```

注意：`_aggregate_dimensions` 需要 brand_name 参数。从 build_context 传入：
```python
dimension_aggregation = _aggregate_dimensions(
    dimension_matrix=competitor_summary.get("dimension_matrix", []),
    brand_name=brand_name,
    dimension_data_quality=competitor_summary.get("dimension_data_quality", {})
)
```

### 同时删除

`_build_user_message` 里的行业位置判断（line 729-740），改为只给原始值 + P50：
```python
# 删除：
if value >= bm.get("p75", 999):
    position = "领先（前25%）"
...
# 改为：
parts.append(f"{name} | {value} | {p50}")
```

`_build_user_message` 整体搬到 analyst_briefing.py（Task 2），analyst_context.py 里删除它。

---

## 五、Task 1: analyst_rules.py（规则引擎代码化）

### 职责
把**条件触发规则**（1/2/3/4/6/10/12/13/14）的触发条件写成 Python 函数。

**分析框架规则**（5/7/11）不进 detect_rules，放在 ANALYSIS_GUIDE 里作为通用指导。

### 输入/输出
```python
def detect_rules(ctx: dict) -> dict:
    """
    Returns:
        {
            "triggered": [
                {"rule_id": 1, "name": "定位偏差", "severity": "critical",
                 "evidence": "对齐度45 < 60 且 引用率85% > 80%",
                 "data": {...}},
                ...
            ],
            "severity": "critical",  # 最高严重程度
            "key_anomalies": [
                "引用率85%但推荐率仅23%——AI提你但不推荐你",
                ...
            ]
        }
    """
```

### 9个条件触发规则

```python
def check_rule_1(ctx: dict) -> dict | None:
    """定位偏差：对齐度 < 60 且 行业引用率 > 80%

    语义：AI在行业查询中频繁提到你（industry_rate高），但对你的理解与品牌自述不一致（alignment低）。
    注意：不能用总引用率（citation_rate），因为B类查询（直接搜品牌名）AI必然提及，会虚高。
    """
    m = ctx["metrics"]
    if m["alignment_score"] < 60 and m["industry_rate"] > 80:
        return {"rule_id": 1, "name": "定位偏差", "severity": "critical",
                "evidence": f"对齐度{m['alignment_score']} < 60 且行业引用率{m['industry_rate']}% > 80%",
                "data": {"alignment_score": m["alignment_score"], "industry_rate": m["industry_rate"]}}
    return None

def check_rule_2(ctx: dict) -> dict | None:
    """品牌隐形：引用率 < 30%"""
    m = ctx["metrics"]
    if m["citation_rate"] < 30:
        return {"rule_id": 2, "name": "品牌隐形", "severity": "critical",
                "evidence": f"引用率{m['citation_rate']}% < 30%",
                "data": {"citation_rate": m["citation_rate"]}}
    return None

def check_rule_3(ctx: dict) -> dict | None:
    """引用源质量差：引用率 > 60% 且 高权威源占比 < 30%"""
    m = ctx["metrics"]
    sources = ctx["source_breakdown"]
    top = sources.get("top_sources", [])
    if not top:
        return None
    total = sum(s.get("mention_count", 0) for s in top)
    if total == 0:
        return None
    high_auth = sum(s.get("mention_count", 0) for s in top if s.get("authority_score", 0) >= 70)
    ratio = high_auth / total
    if m["citation_rate"] > 60 and ratio < 0.3:
        return {"rule_id": 3, "name": "引用源质量差", "severity": "warning",
                "evidence": f"引用率{m['citation_rate']}%但高权威源占比{ratio:.0%}",
                "data": {"high_auth_ratio": round(ratio, 2)}}
    return None

def check_rule_4(ctx: dict) -> dict | None:
    """引用源单一：source_diversity < 0.5"""
    m = ctx["metrics"]
    if m.get("source_diversity", 1.0) < 0.5:
        return {"rule_id": 4, "name": "引用源单一", "severity": "warning",
                "evidence": f"来源多样性{m['source_diversity']}",
                "data": {"source_diversity": m["source_diversity"]}}
    return None

def check_rule_6(ctx: dict) -> dict | None:
    """竞品维度劣势：存在 gap < -20 的维度"""
    agg = ctx.get("dimension_aggregation", {})
    losing = agg.get("losing_dimensions", [])
    winning = agg.get("winning_dimensions", [])
    if losing:
        return {"rule_id": 6, "name": "竞品维度劣势", "severity": "warning",
                "evidence": f"{len(losing)}个维度存在重大劣势",
                "data": {"losing_dimensions": losing, "winning_dimensions": winning}}
    return None

def check_rule_10(ctx: dict) -> dict | None:
    """行业影响力弱：A类引用率远低于B类"""
    m = ctx["metrics"]
    if m.get("brand_rate", 0) > 50 and m.get("industry_rate", 0) < 20:
        return {"rule_id": 10, "name": "行业影响力弱", "severity": "warning",
                "evidence": f"B类{m['brand_rate']}%但A类{m['industry_rate']}%",
                "data": {"industry_rate": m["industry_rate"], "brand_rate": m["brand_rate"]}}
    return None

def check_rule_12(ctx: dict) -> dict | None:
    """引擎差异异常：最大引用率差异 > 20%"""
    er = ctx.get("engine_results", {})
    if not er or len(er) < 2:
        return None
    rates = [(eng, data.get("citation_rate", 0)) for eng, data in er.items()]
    diff = max(r[1] for r in rates) - min(r[1] for r in rates)
    if diff > 20:
        best = max(rates, key=lambda x: x[1])
        worst = min(rates, key=lambda x: x[1])
        return {"rule_id": 12, "name": "引擎差异异常", "severity": "warning",
                "evidence": f"引用率差异{diff}个百分点",
                "data": {"max_diff": diff, "best": best[0], "worst": worst[0]}}
    return None

def check_rule_13(ctx: dict) -> dict | None:
    """B类AI认知偏差：B类查询 >= 3 条"""
    m = ctx["metrics"]
    pvs = ctx.get("perception_vs_self", {})
    brand_count = m.get("brand_count", 0)
    if brand_count >= 3 and pvs.get("ai_think_you_are"):
        return {"rule_id": 13, "name": "AI认知偏差", "severity": "info",
                "evidence": f"{brand_count}条B类查询数据",
                "data": {}}
    return None

def check_rule_14(ctx: dict) -> dict | None:
    """C类竞品胜负矩阵：C类查询 >= 3 条"""
    m = ctx["metrics"]
    comp = ctx.get("competitor_summary", {})
    competitor_count = m.get("competitor_count", 0)
    if competitor_count >= 3 and comp.get("has_data"):
        return {"rule_id": 14, "name": "竞品胜负矩阵", "severity": "info",
                "evidence": f"{competitor_count}条C类查询数据",
                "data": {}}
    return None
```

### 关键异常检测

```python
def _detect_anomalies(ctx: dict) -> list[str]:
    """扫描数据，标记关键异常。LLM 针对这些异常做三层洞察。"""
    anomalies = []
    m = ctx["metrics"]
    s = ctx["source_breakdown"]

    # 引用率 vs 推荐率
    if m["citation_rate"] > 50 and m["recommendation_rate"] < 30:
        anomalies.append(f"引用率{m['citation_rate']}%但推荐率仅{m['recommendation_rate']}%——AI提你但不推荐你")

    # 官网引用占比
    official = s.get("official_site_ratio", 0)
    if official > 0.6:
        anomalies.append(f"官网引用占比{round(official*100)}%，第三方权威源几乎为零")

    # A类 vs B类
    if m.get("brand_rate", 0) > 50 and m.get("industry_rate", 0) < 20:
        anomalies.append(f"B类{m['brand_rate']}%但A类仅{m['industry_rate']}%——缺乏行业影响力")

    # 维度数据质量
    dq = ctx.get("competitor_summary", {}).get("dimension_data_quality", {})
    if dq.get("null_ratio", 0) > 30:
        anomalies.append(f"维度打分{dq['null_ratio']}%证据不足，数据可信度低")

    # 行业位置
    bm = ctx.get("benchmark", {})
    if bm:
        for key in ["citation_rate", "industry_rate"]:
            val = m.get(key, 0)
            p25 = bm.get(key, {}).get("p25", 0)
            if val < p25 and p25 > 0:
                anomalies.append(f"{key}={val}%处于行业后25%（P25={p25}%）")

    return anomalies
```

### detect_rules 主函数

```python
def detect_rules(ctx: dict) -> dict:
    checkers = [check_rule_1, check_rule_2, check_rule_3, check_rule_4,
                check_rule_6, check_rule_10, check_rule_12, check_rule_13, check_rule_14]
    triggered = [r for r in (c(ctx) for c in checkers) if r is not None]
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    triggered.sort(key=lambda r: severity_order.get(r.get("severity", "info"), 9))
    overall = "healthy"
    for r in triggered:
        if r["severity"] == "critical":
            overall = "critical"
            break
        if r["severity"] == "warning":
            overall = "warning"
    return {"triggered": triggered, "severity": overall, "key_anomalies": _detect_anomalies(ctx)}
```

---

## 六、Task 2: analyst_prompt.py（Prompt 拆分 + Few-Shot）

### 结构

```python
# analyst_prompt.py

# ── 固定 SYSTEM_PROMPT（~800 token）────────────────────
SYSTEM_PROMPT = """你是 CiteFlow 的 AI 引用分析师（军师）。基于数据推理，不编造数据。

## 核心方法论：三层洞察法

对每一项数据异常，必须走三层:
  第一层 — 观察（数据是什么）
  第二层 — 解释（为什么是这个数据）
  第三层 — 含义（这对品牌意味着什么，不修的后果）

## 分析流程

1. 读 user message 中的「已触发规则」和「关键异常」
2. 对每个关键异常，走三层洞察
3. 基于触发的规则，生成行动建议
4. 输出前自检：core_problem 是否点出根因？rationale 是洞察还是数据复述？

## 输出格式
{见下方 Few-Shot}

## 输出要求
- actions 至少2条，最多5条
- action_steps 至少3步，精确到平台名称
- rationale 必须是洞察，不能复述数据
- 所有字段值用中文
- 只返回 JSON"""


# ── Few-Shot（~250 token，简化的输出示例）────────────────
FEW_SHOT = """
## 输出示例（仅供参考格式，不要模仿具体内容）

输入概要: 品牌=Stripe | 引用率=85% | 对齐度=45 | Reddit占40%引用 | G2缺失

正确输出:
{
  "three_layer_chain": {
    "observation": "引用率85%但40%来自Reddit（权威分40），G2/Capterra完全缺失",
    "explanation": "开发者社区推高了引用率，但AI从论坛而非权威评测了解你",
    "implication": "AI知道你好用但不确定你值不值得企业信任。如果竞品在G2积累更多评价，推荐口径会倾斜"
  },
  "diagnosis": {
    "core_problem": "AI把你当'API工具'而非'金融基础设施'——技术文档多但缺企业级背书",
    "problem_detail": "引用率85%但来源质量低。Reddit占40%说明开发者在讨论你，但G2缺失说明企业用户没有公开评价。AI的推荐建立在'社区热度'而非'权威背书'上。",
    "severity": "warning"
  },
  "actions": [
    {
      "priority": "P0",
      "action": "在G2建立评测页面，目标积累20+条评价",
      "rationale": "Reddit占40%引用但权威分仅40。G2权威分70+，能让AI从'开发者讨论'升级为'企业推荐'",
      "expected_impact": "高权威源占比从~20%提升至40%+",
      "target_metric": "高权威源占比",
      "current_value": "~20%",
      "expected_value": "40%+",
      "action_steps": ["注册G2企业账号", "获取50个客户名单", "发送邀请邮件", "前10条评价提供$25激励"],
      "estimated_time": "1-2个月",
      "estimated_cost": "$"
    }
  ],
  "competitor_gap": {"losing_dimensions": [], "winning_dimensions": [], "root_cause": "", "counter_strategy": ""},
  "one_line_verdict": "少写技术文档多发客户案例，去G2让企业用户替你说话",
  "engine_comparison": {"best_engine": "无数据", "worst_engine": "无数据", "citation_rate_diff": 0, "recommendation_rate_diff": 0, "consistency": "low", "per_engine": {}},
  "engine_insights": ["数据不足"],
  "engine_recommendations": ["启用多引擎搜索"],
  "b_class_perception": {"ai_identity": "", "brand_self_identity": "", "gap_description": "", "ai_strengths": [], "ai_weaknesses": [], "blind_spots": []},
  "c_class_matrix": {"total_comparisons": 0, "wins": 0, "losses": 0, "ties": 0, "winning_dimensions": [], "losing_dimensions": [], "key_insight": "无数据"}
}"""


# ── 分析框架（按需注入到 user message）────────────────
ANALYSIS_GUIDE = {
    # 条件触发规则的分析框架
    1: {"name": "定位偏差", "framework": "从官网内容/来源偏见/竞品占位找根因", "action_template": "修复关键词对齐(P0) → 权威源覆盖(P1) → 竞品反制(P2)"},
    2: {"name": "品牌隐形", "framework": "从品牌太新/内容不够/品类不匹配找根因", "action_template": "确保被索引(P0) → 建立评测平台(P0) → 发布行业内容(P1)"},
    3: {"name": "引用源质量差", "framework": "检查高权威平台是否有品牌页面", "action_template": "注册G2/Capterra(P0) → 积累评价(P1) → 修复差评(P2)"},
    4: {"name": "引用源单一", "framework": "识别主来源，在其他平台建内容", "action_template": "识别主来源 → 多平台建内容(P1)"},
    6: {"name": "竞品维度劣势", "framework": "差距>20用差异化，10-20用追赶", "action_template": "分析竞品优势 → 追赶或差异化(P1)"},
    10: {"name": "行业影响力弱", "framework": "A类引用率低说明AI不会主动推荐", "action_template": "发布行业深度内容(P0) → 行业媒体存在(P1)"},
    12: {"name": "引擎差异异常", "framework": "分析最友好/最不友好的引擎", "action_template": "针对最差引擎优化(P1)"},
    13: {"name": "AI认知偏差", "framework": "对比market_perception和brand_profile", "action_template": "修复关键词对齐(P0) → 补充盲点(P1)"},
    14: {"name": "竞品胜负矩阵", "framework": "聚合维度打分，计算差距", "action_template": "保持领先 → 追赶落后(P1)"},

    # 分析框架规则（不独立触发，作为通用指导注入）
    "framework_priority": {"name": "评分优先级", "content": "优先修: 容易修+影响大的维度。内容力=容易，品牌力=中等，技术力=难，产品力=最难"},
    "framework_severity": {"name": "严重程度判定", "content": "critical: 引用率<30% 或 对齐度<60 或 综合分<40。warning: 引用率30-60% 或 来源质量/多样性问题。healthy: 引用率>80% 且 对齐度>80% 且 综合分>70"},
    "framework_benchmark": {"name": "行业基准对比", "content": "对比P25/P50/P75。>P75=领先，P50-P75=中上，P25-P50=中下，<P25=落后。注意：基准是估算值"},
}
```

### inject 函数

规则详情注入到 **user message 开头**，不注入 system prompt：

```python
def build_rule_section(triggered: list[dict]) -> str:
    """构建触发规则 + 分析框架 + 关键异常的文本，插入 user message 开头。"""
    if not triggered:
        return ""

    parts = ["=== 已触发规则 ==="]

    # 注入触发的规则详情
    for r in triggered:
        rule_id = r["rule_id"]
        guide = ANALYSIS_GUIDE.get(rule_id, {})
        parts.append(f"规则{rule_id}: {r['name']}（{r['severity']}）— {r['evidence']}")
        if guide.get("framework"):
            parts.append(f"  分析框架: {guide['framework']}")
        if guide.get("action_template"):
            parts.append(f"  行动模板: {guide['action_template']}")
        parts.append("")

    # 注入相关的分析框架
    frameworks_to_inject = []
    has_competitor = any(r["rule_id"] in (6, 14) for r in triggered)
    has_benchmark = any(r["rule_id"] in (1, 2, 3, 10) for r in triggered)
    if has_competitor:
        frameworks_to_inject.append(("framework_priority", "评分优先级"))
        frameworks_to_inject.append(("framework_severity", "严重程度判定"))
    if has_benchmark:
        frameworks_to_inject.append(("framework_benchmark", "行业基准对比"))

    if frameworks_to_inject:
        parts.append("=== 分析框架 ===")
        for key, label in frameworks_to_inject:
            fw = ANALYSIS_GUIDE.get(key, {})
            parts.append(f"{label}: {fw.get('content', '')}")
        parts.append("")

    return "\n".join(parts)
```

---

## 七、Task 3: analyst_briefing.py（build_briefing 重构）

### 职责
从 analyst_node.py 的 `_build_user_message` 重构，输出"诊断briefing"格式。

### 核心变化

**旧格式**（给原材料，LLM 自己找异常）：
```
引用率: 60% | 行业P50: 45 | 位置: 中上
```

**新格式**（给已标注的异常，LLM 只需解释）：
```
=== 已触发规则 ===
规则3: 引用源质量差 — 高权威源占比18%

=== 关键异常 ===
1. 引用率60%但推荐率仅23%

=== 详细数据 ===
引用率: 60% | P50: 45
```

### 函数签名

```python
def build_briefing(ctx: dict, rules: dict) -> str:
    """组装诊断briefing格式的 user message。

    结构：
    1. 品牌信息
    2. 已触发规则 + 分析框架（由 build_rule_section 生成）
    3. 关键异常（由 detect_rules 生成）
    4. 关键指标
    5. 行业基准（只给原始值 + P50，不给"中上/领先"判断）
    6. AI认知 vs 品牌自述
    7. 引用源明细
    8. 评分维度
    9. 竞品对比（使用 dimension_aggregation，标注 gap + 严重程度）
    10. 引擎对比
    11. B/C 类分析提示
    """
```

### 行业基准格式变化

旧：
```
引用率 | 60 | 45 | 中上（高于中位数）
```

新：
```
引用率 | 60 | P50=45 | P25=25 | P75=70
```

LLM 自己判断位置。但 detect_rules 已经把异常位置标记在 key_anomalies 里了。

### 竞品对比格式变化

旧（直接给平均分）：
```
耐用性: YesWelder 55 | Lincoln 80
```

新（使用 dimension_aggregation，标注 gap + 严重程度）：
```
维度打分矩阵:
  耐用性: 品牌55 | 竞品均80 | gap=-25（重大劣势）
  价格: 品牌85 | 竞品均40 | gap=+45（重大优势）
数据质量: 30条中12条score=null（40%证据不足）
```

---

## 八、Task 4: analyst_node.py（主流程重构）

从 898 行缩减到 ~120 行：

```python
# analyst_node.py — 军师 Agent（重构后）
import json
from langgraph_app.config import DEEPSEEK_CONFIG
from langgraph_app.tools.engines.chatgpt_api import call_api
from langgraph_app.tools.analyst_context import build_context
from langgraph_app.tools.analyst_rules import detect_rules
from langgraph_app.tools.analyst_briefing import build_briefing
from langgraph_app.tools.analyst_prompt import SYSTEM_PROMPT, FEW_SHOT
from langgraph_app.state import AnalystOutput, Diagnosis, ActionItem, CompetitorGap, ThreeLayerChain
from langgraph_app.validators.validator import validate_llm_output

NODE_NAME = "analyst"
MAX_RETRIES = 2


def analyst_node(state: dict) -> dict:
    probe_output = state.get("probe_output", {})
    if not probe_output:
        return {"analyst_output": _empty_output("state 中无 probe_output")}

    # 1. 数据提取（不做判断）
    ctx = build_context(probe_output)

    # 2. 规则触发检测（代码判断）
    rules = detect_rules(ctx)

    # 3. 组装诊断briefing
    user_message = build_briefing(ctx, rules)

    # 4. system prompt = 固定部分 + Few-Shot
    system_prompt = SYSTEM_PROMPT + "\n\n" + FEW_SHOT

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    # 5. LLM 调用 + 重试
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = call_api(messages=messages, config=DEEPSEEK_CONFIG,
                           temperature=0.2, response_format={"type": "json_object"})
            content = resp["choices"][0]["message"].get("content", "").strip()
        except Exception as e:
            if attempt < MAX_RETRIES:
                continue
            return {"analyst_output": _empty_output(f"LLM 调用失败: {e}")}

        try:
            raw = json.loads(content)
        except json.JSONDecodeError:
            if attempt < MAX_RETRIES:
                messages = _append_retry(messages, content, [f"JSON 解析失败: {content[:200]}"])
                continue
            return {"analyst_output": _empty_output(f"JSON 解析失败: {content[:200]}")}

        result = validate_llm_output(raw, AnalystOutput, "analyst")
        if result["valid"]:
            return {"analyst_output": result["parsed"].model_dump()}
        if attempt < MAX_RETRIES:
            messages = _append_retry(messages, content, result["errors"])
            continue
        return {"analyst_output": _empty_output(f"Schema 验证失败: {'; '.join(result['errors'])}")}

    return {"analyst_output": _empty_output("未知错误")}


def _append_retry(messages, last_content, errors):
    error_lines = "\n".join(f"  - {e}" for e in errors)
    retry_prompt = f"你上次返回的 JSON 有以下错误：\n{error_lines}\n\n请修正后重新返回完整 JSON。只返回 JSON。"
    return messages + [{"role": "assistant", "content": last_content[:500]},
                       {"role": "user", "content": retry_prompt}]


def _empty_output(error):
    return AnalystOutput(
        three_layer_chain=None,
        diagnosis=Diagnosis(core_problem="诊断失败", problem_detail=error, severity="healthy"),
        actions=[], competitor_gap=None, one_line_verdict="",
        engine_comparison=None, engine_insights=[], engine_recommendations=[],
        b_class_perception=None, c_class_matrix=None,
        status="error", error=error,
    ).model_dump()
```

---

## 九、Task 5: 单元测试

文件：`test_analyst_rules.py`

```python
def test_rule_1_triggered():
    ctx = {"metrics": {"alignment_score": 45, "industry_rate": 85}}
    assert check_rule_1(ctx) is not None

def test_rule_1_not_triggered():
    ctx = {"metrics": {"alignment_score": 70, "industry_rate": 85}}
    assert check_rule_1(ctx) is None

def test_rule_13_min_threshold():
    # B类查询 < 3 条不触发
    ctx = {"metrics": {"brand_count": 2}, "perception_vs_self": {"ai_think_you_are": "test"}}
    assert check_rule_13(ctx) is None
    # B类查询 >= 3 条触发
    ctx["metrics"]["brand_count"] = 3
    assert check_rule_13(ctx) is not None

def test_rule_6_uses_aggregation():
    ctx = {"dimension_aggregation": {"losing_dimensions": [{"dimension": "耐用性", "gap": -25}]}}
    result = check_rule_6(ctx)
    assert result is not None
    assert result["rule_id"] == 6

def test_detect_rules_integration():
    ctx = {
        "metrics": {"alignment_score": 45, "citation_rate": 85, "recommendation_rate": 20,
                    "source_diversity": 0.8, "industry_rate": 0, "brand_rate": 100,
                    "industry_count": 5, "brand_count": 5, "competitor_count": 5},
        "source_breakdown": {"top_sources": [{"domain": "reddit.com", "authority_score": 40, "mention_count": 10}],
                             "official_site_ratio": 0.7},
        "competitor_summary": {"has_data": False, "dimension_data_quality": {}},
        "dimension_aggregation": {"losing_dimensions": [], "winning_dimensions": []},
        "perception_vs_self": {"ai_think_you_are": "budget brand"},
        "engine_results": {},
        "benchmark": {},
        "brand_name": "Test",
    }
    rules = detect_rules(ctx)
    ids = [r["rule_id"] for r in rules["triggered"]]
    assert 1 in ids
    assert 2 not in ids
    assert rules["severity"] == "critical"
    assert len(rules["key_anomalies"]) > 0
```

---

## 十、执行顺序

```
Task 0: analyst_context.py（维度聚合 + 删除预判断）   ← 先改，被其他依赖
Task 1: analyst_rules.py（9个规则函数 + detect_rules） ← 和 Task 0 并行
Task 2: analyst_prompt.py（SYSTEM_PROMPT + Few-Shot + ANALYSIS_GUIDE） ← 和 0/1 并行
Task 5: test_analyst_rules.py（单元测试）              ← Task 1 完成后
Task 3: analyst_briefing.py（build_briefing 重构）    ← 依赖 Task 0
Task 4: analyst_node.py（主流程改调新接口）            ← 依赖 0+1+2+3
```

建议：0+1+2 并行 → 5 → 3 → 4

总工作量：~800行新代码 + ~500行删除 = ~1天

---

## 十一、验证标准

1. `python test_analyst_rules.py` 全部通过
2. `python test_real_brand.py` Analyst 不崩溃
3. Analyst 输出的 severity 与 detect_rules 的 severity 一致
4. three_layer_chain 三个字段非空
5. actions 的 rationale 不是数据复述（人工检查 2-3 条）
6. SYSTEM_PROMPT + FEW_SHOT token 数 < 1200（用 tiktoken 验证）

自检结果: X/6
失败项: (列出或"无")
