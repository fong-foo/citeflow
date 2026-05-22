# TASK_VALIDATION_SCRIPT.md — 数据验证脚本

> 药老出品 · 2026-05-07（v2 — 修复海老5个疑问）
> 目标: 自动验证 Probe + Analyst 输出的数据质量，拦截幻觉和异常
> 预计工时: 2.5h

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 定义验证规则 | validate_report.py | 30min |
| 2 | 实现验证脚本 | validate_report.py | 1.5h |
| 3 | 测试验证脚本 | - | 30min |

**完成标准**: 跑 validate_report.py 能自动检查 Probe + Analyst 输出，输出验证结果。

---

## 任务1: 定义验证规则

### 验证类别

**1. 数据完整性检查（必填字段）**
```
检查项：
- three_layer_chain 三个字段非空
- diagnosis.core_problem 非空
- diagnosis.severity 是 critical/warning/healthy
- actions 至少 2 条
- 每个 action 的 action_steps 至少 3 步
- competitor_gap 字段完整（即使为空也要有 losing_dimensions 等）
```

**2. 数据一致性检查（数值逻辑）**
```
检查项：
- 三分类引用率之和是否合理（industry_rate + brand_rate + competitor_scenario_rate）
- 三分类计数一致性：industry_count + brand_count + competitor_count == total_queries
- 推荐率 <= 提及率（recommendation_rate <= mention_rate）
- 官网引用占比 + 第三方引用占比 = 1（或接近 1）
- 评分维度分数范围 0-100
- 维度打分矩阵的 score 范围 0-100
```

**3. 数据真实性检查（幻觉拦截）**
```
检查项：
- 维度打分矩阵的 verified 字段
  - "unverified" 的 ranking 数量 <= 阈值（如 10%）
  - 包含数字的 summary 在 unverified 时是否被替换为 "数据不足"
- source_quote 非空（对于 verified 的 ranking）
```

**4. 业务逻辑检查（常识判断）**
```
检查项：
- severity 为 critical 时，引用率应该 < 30% 或对齐度 < 60%
- severity 为 healthy 时，引用率应该 > 80% 且对齐度 > 80%
- actions 的优先级应该是 P0/P1/P2
- estimated_cost 应该是 "免费" / "$" / "$$" / "$$$"
- estimated_time 应该包含 "周" 或 "月"
```

**5. 报告结构检查（格式正确）**
```
检查项：
- JSON 格式正确
- 所有必填字段存在
- 字段类型正确（如 score 是 int，rate 是 float）
- list 字段是列表类型
```

---

## 任务2: 实现验证脚本

### 需要创建的文件
`validate_report.py`（放在项目根目录）

### 实现要求

```python
#!/usr/bin/env python3
"""
validate_report.py — CiteFlow 数据验证脚本

用法：
  python validate_report.py <probe_output.json> <analyst_output.json>
  python validate_report.py <report.json>  # 合并的报告

输出：
  - 验证结果（PASS/FAIL）
  - 详细检查项（每项显示 ✅/❌）
  - 失败原因（如果有）
"""

import json
import sys
from typing import Any


def validate_probe_output(probe: dict) -> list[dict]:
    """验证 Probe 输出，返回检查结果列表"""
    checks = []
    
    # 1. 数据完整性检查
    checks.append(_check_field_exists(probe, "citation_metrics", "Probe"))
    checks.append(_check_field_exists(probe, "source_authority", "Probe"))
    checks.append(_check_field_exists(probe, "company_score", "Probe"))
    
    # 2. 数据一致性检查
    cm = probe.get("citation_metrics", {})
    if cm:
        checks.append(_check_citation_rates(cm))
        checks.append(_check_citation_counts(cm))
        checks.append(_check_recommendation_rate(cm))
        checks.append(_check_source_ratios(cm))
    
    # 3. 维度打分矩阵验证
    comp = probe.get("competitor_analysis", [])
    if comp:
        checks.append(_check_dimension_scores(comp))
    
    return checks, cm  # 返回 cm 供后续使用


def validate_analyst_output(analyst: dict, cm: dict = None) -> list[dict]:
    """验证 Analyst 输出，返回检查结果列表
    
    Args:
        analyst: Analyst 输出
        cm: Probe 的 citation_metrics（用于 severity 逻辑检查）
    """
    checks = []
    
    # 1. 数据完整性检查
    checks.append(_check_field_exists(analyst, "three_layer_chain", "Analyst"))
    checks.append(_check_field_exists(analyst, "diagnosis", "Analyst"))
    checks.append(_check_field_exists(analyst, "actions", "Analyst"))
    
    # 2. three_layer_chain 检查
    tlc = analyst.get("three_layer_chain", {})
    if tlc:
        checks.append(_check_three_layer_chain(tlc))
    
    # 3. diagnosis 检查
    diag = analyst.get("diagnosis", {})
    if diag:
        checks.append(_check_diagnosis(diag))
    
    # 4. actions 检查
    actions = analyst.get("actions", [])
    if actions:
        checks.append(_check_actions(actions))
        checks.append(_check_actions_business_logic(actions))
    
    # 5. severity 逻辑检查（需要 cm 数据）
    if diag and cm:
        checks.append(_check_severity_logic(diag, cm))
    
    # 6. 报告结构检查
    checks.append(_check_report_structure(analyst))
    
    return checks


def _check_field_exists(data: dict, field: str, source: str) -> dict:
    """检查字段是否存在"""
    exists = field in data and data[field] is not None
    return {
        "check": f"{source}.{field} 存在",
        "status": "PASS" if exists else "FAIL",
        "detail": "" if exists else f"{source}.{field} 缺失或为 None"
    }


def _check_citation_rates(cm: dict) -> dict:
    """检查三分类引用率一致性"""
    industry = cm.get("industry_rate", 0)
    brand = cm.get("brand_rate", 0)
    competitor = cm.get("competitor_scenario_rate", 0)
    
    # 三分类引用率应该在 0-100 之间
    all_valid = all(0 <= r <= 100 for r in [industry, brand, competitor])
    
    return {
        "check": "三分类引用率范围 0-100",
        "status": "PASS" if all_valid else "FAIL",
        "detail": f"industry={industry}, brand={brand}, competitor={competitor}"
    }


def _check_citation_counts(cm: dict) -> dict:
    """检查三分类计数一致性：industry_count + brand_count + competitor_count == total_queries"""
    industry_count = cm.get("industry_count", 0)
    brand_count = cm.get("brand_count", 0)
    competitor_count = cm.get("competitor_count", 0)
    total_queries = cm.get("total_queries", 0)
    
    sum_counts = industry_count + brand_count + competitor_count
    valid = sum_counts == total_queries
    
    return {
        "check": "三分类计数一致性",
        "status": "PASS" if valid else "FAIL",
        "detail": f"industry_count={industry_count} + brand_count={brand_count} + competitor_count={competitor_count} = {sum_counts}, total_queries={total_queries}"
    }


def _check_recommendation_rate(cm: dict) -> dict:
    """检查推荐率 <= 提及率"""
    rec = cm.get("recommendation_rate", 0)
    mention = cm.get("rate", 0)
    
    valid = rec <= mention
    
    return {
        "check": "推荐率 <= 提及率",
        "status": "PASS" if valid else "FAIL",
        "detail": f"recommendation_rate={rec}, mention_rate={mention}"
    }


def _check_source_ratios(cm: dict) -> dict:
    """检查官网引用占比 + 第三方引用占比 = 1"""
    official = cm.get("official_site_ratio", 0)
    third_party = cm.get("third_party_ratio", 0)
    
    total = official + third_party
    valid = abs(total - 1.0) < 0.01  # 允许 1% 误差
    
    return {
        "check": "官网引用占比 + 第三方引用占比 = 1",
        "status": "PASS" if valid else "FAIL",
        "detail": f"official={official}, third_party={third_party}, total={total}"
    }


def _check_dimension_scores(comp: list) -> dict:
    """检查维度打分矩阵的 verified 状态"""
    total_rankings = 0
    unverified_rankings = 0
    unverified_with_quote = 0
    
    for c in comp:
        for dim in c.get("dimension_scores", []):
            for ranking in dim.get("rankings", []):
                total_rankings += 1
                if ranking.get("verified") == "unverified":
                    unverified_rankings += 1
                    if ranking.get("source_quote"):
                        unverified_with_quote += 1
    
    if total_rankings == 0:
        return {
            "check": "维度打分矩阵 verified 状态",
            "status": "PASS",
            "detail": "无维度打分矩阵"
        }
    
    unverified_rate = unverified_rankings / total_rankings
    valid = unverified_rate <= 0.1  # 允许 10% unverified
    
    return {
        "check": "维度打分矩阵 verified 状态",
        "status": "PASS" if valid else "FAIL",
        "detail": f"total={total_rankings}, unverified={unverified_rankings} ({unverified_rate:.1%})"
    }


def _check_three_layer_chain(tlc: dict) -> dict:
    """检查 three_layer_chain 三个字段非空"""
    obs = tlc.get("observation", "")
    exp = tlc.get("explanation", "")
    imp = tlc.get("implication", "")
    
    all_non_empty = all(len(s.strip()) > 0 for s in [obs, exp, imp])
    
    return {
        "check": "three_layer_chain 三个字段非空",
        "status": "PASS" if all_non_empty else "FAIL",
        "detail": f"observation={len(obs)}字, explanation={len(exp)}字, implication={len(imp)}字"
    }


def _check_diagnosis(diag: dict) -> dict:
    """检查 diagnosis 字段完整"""
    core_problem = diag.get("core_problem", "")
    severity = diag.get("severity", "")
    
    valid_severity = severity in ["critical", "warning", "healthy"]
    valid_problem = len(core_problem.strip()) > 0
    
    return {
        "check": "diagnosis 字段完整",
        "status": "PASS" if valid_severity and valid_problem else "FAIL",
        "detail": f"core_problem={len(core_problem)}字, severity={severity}"
    }


def _check_actions(actions: list) -> dict:
    """检查 actions 至少 2 条，每条有 action_steps"""
    if len(actions) < 2:
        return {
            "check": "actions 至少 2 条",
            "status": "FAIL",
            "detail": f"只有 {len(actions)} 条 actions"
        }
    
    for i, action in enumerate(actions):
        steps = action.get("action_steps", [])
        if len(steps) < 3:
            return {
                "check": "actions 每条有 action_steps",
                "status": "FAIL",
                "detail": f"action[{i}] 只有 {len(steps)} 个 steps"
            }
    
    return {
        "check": "actions 至少 2 条，每条有 action_steps",
        "status": "PASS",
        "detail": f"{len(actions)} 条 actions"
    }


def _check_actions_business_logic(actions: list) -> dict:
    """检查 actions 的业务逻辑：优先级、成本、时间格式"""
    valid_priorities = ["P0", "P1", "P2"]
    valid_costs = ["免费", "$", "$$", "$$$"]
    
    for i, action in enumerate(actions):
        priority = action.get("priority", "")
        cost = action.get("estimated_cost", "")
        time = action.get("estimated_time", "")
        
        if priority not in valid_priorities:
            return {
                "check": "actions 业务逻辑",
                "status": "FAIL",
                "detail": f"action[{i}].priority={priority} 不是 P0/P1/P2"
            }
        
        if cost and cost not in valid_costs:
            return {
                "check": "actions 业务逻辑",
                "status": "FAIL",
                "detail": f"action[{i}].estimated_cost={cost} 不是 免费/$/$$/$$$"
            }
        
        if time and "周" not in time and "月" not in time:
            return {
                "check": "actions 业务逻辑",
                "status": "FAIL",
                "detail": f"action[{i}].estimated_time={time} 不包含 周 或 月"
            }
    
    return {
        "check": "actions 业务逻辑（优先级/成本/时间格式）",
        "status": "PASS",
        "detail": f"{len(actions)} 条 actions 格式正确"
    }


def _check_severity_logic(diag: dict, cm: dict) -> dict:
    """检查 severity 和引用率/对齐度的逻辑一致性
    
    规则：
    - critical: 引用率 < 30% 或 对齐度 < 60%
    - healthy: 引用率 > 80% 且 对齐度 > 80%
    - warning: 其他情况
    """
    severity = diag.get("severity", "")
    citation_rate = cm.get("rate", 0)
    # 对齐度需要从 gap_report 获取，但 cm 里没有
    # 这里只检查引用率，对齐度检查需要在 validate_analyst_output 里单独做
    
    if severity == "critical" and citation_rate >= 30:
        return {
            "check": "severity 和引用率逻辑一致",
            "status": "FAIL",
            "detail": f"severity=critical 但 citation_rate={citation_rate}% (>=30%)"
        }
    
    if severity == "healthy" and citation_rate <= 80:
        return {
            "check": "severity 和引用率逻辑一致",
            "status": "FAIL",
            "detail": f"severity=healthy 但 citation_rate={citation_rate}% (<=80%)"
        }
    
    return {
        "check": "severity 和引用率逻辑一致",
        "status": "PASS",
        "detail": f"severity={severity}, citation_rate={citation_rate}%"
    }


def _check_report_structure(analyst: dict) -> dict:
    """检查报告结构：字段类型正确"""
    # 检查 actions 是列表
    actions = analyst.get("actions", [])
    if not isinstance(actions, list):
        return {
            "check": "报告结构（字段类型）",
            "status": "FAIL",
            "detail": f"actions 不是列表类型: {type(actions)}"
        }
    
    # 检查 diagnosis 是字典
    diagnosis = analyst.get("diagnosis", {})
    if not isinstance(diagnosis, dict):
        return {
            "check": "报告结构（字段类型）",
            "status": "FAIL",
            "detail": f"diagnosis 不是字典类型: {type(diagnosis)}"
        }
    
    # 检查 three_layer_chain 是字典
    tlc = analyst.get("three_layer_chain", {})
    if not isinstance(tlc, dict):
        return {
            "check": "报告结构（字段类型）",
            "status": "FAIL",
            "detail": f"three_layer_chain 不是字典类型: {type(tlc)}"
        }
    
    return {
        "check": "报告结构（字段类型）",
        "status": "PASS",
        "detail": "所有字段类型正确"
    }


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法: python validate_report.py <probe_output.json> [analyst_output.json]")
        sys.exit(1)
    
    probe_file = sys.argv[1]
    analyst_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    # 读取文件
    with open(probe_file, "r") as f:
        probe = json.load(f)
    
    analyst = None
    if analyst_file:
        with open(analyst_file, "r") as f:
            analyst = json.load(f)
    
    # 验证
    all_checks = []
    probe_checks, cm = validate_probe_output(probe)
    all_checks.extend(probe_checks)
    
    if analyst:
        analyst_checks = validate_analyst_output(analyst, cm)
        all_checks.extend(analyst_checks)
    
    # 输出结果
    passed = sum(1 for c in all_checks if c["status"] == "PASS")
    failed = sum(1 for c in all_checks if c["status"] == "FAIL")
    
    print(f"\n{'='*60}")
    print(f"验证结果: {'PASS' if failed == 0 else 'FAIL'} ({passed}/{len(all_checks)})")
    print(f"{'='*60}\n")
    
    for check in all_checks:
        status = "✅" if check["status"] == "PASS" else "❌"
        print(f"{status} {check['check']}")
        if check["detail"]:
            print(f"   {check['detail']}")
    
    print()
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
```

---

## 任务3: 测试验证脚本

### 测试步骤

1. 用 YesWelder 的 probe_output.json 和 analyst_output.json 跑验证
2. 检查输出：
   - 所有检查项应该 PASS
   - 如果有 FAIL，记录原因
3. 故意制造一个异常数据（如推荐率 > 提及率），验证脚本能拦截

### 预期输出

```
============================================================
验证结果: PASS (18/18)
============================================================

✅ Probe.citation_metrics 存在
✅ Probe.source_authority 存在
✅ Probe.company_score 存在
✅ 三分类引用率范围 0-100
✅ 三分类计数一致性
✅ 推荐率 <= 提及率
✅ 官网引用占比 + 第三方引用占比 = 1
✅ 维度打分矩阵 verified 状态
✅ Analyst.three_layer_chain 存在
✅ Analyst.diagnosis 存在
✅ Analyst.actions 存在
✅ three_layer_chain 三个字段非空
✅ diagnosis 字段完整
✅ actions 至少 2 条，每条有 action_steps
✅ actions 业务逻辑（优先级/成本/时间格式）
✅ severity 和引用率逻辑一致
✅ 报告结构（字段类型）
```

---

## CHECKLIST 自检

**任务1 [验证规则]:**
- [ ] 数据完整性检查定义（5 项）
- [ ] 数据一致性检查定义（5 项，含三分类计数）
- [ ] 数据真实性检查定义（2 项）
- [ ] 业务逻辑检查定义（4 项）
- [ ] 报告结构检查定义（3 项）

**任务2 [验证脚本]:**
- [ ] validate_report.py 创建
- [ ] 脚本可运行（python validate_report.py）
- [ ] 输出格式正确（✅/❌ + 详情）
- [ ] 退出码正确（0=PASS, 1=FAIL）
- [ ] cm 参数正确传递给 validate_analyst_output
- [ ] _check_citation_counts 实现（三分类计数一致性）
- [ ] _check_actions_business_logic 实现（优先级/成本/时间格式）
- [ ] _check_report_structure 实现（字段类型校验）

**任务3 [测试]:**
- [ ] 用 YesWelder 数据跑验证
- [ ] 所有检查项 PASS
- [ ] 故意制造异常数据能被拦截

---

## 交付格式

```
自检结果: X/5 任务1 + X/8 任务2 + X/3 任务3 = XX/16
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **验证脚本不修改数据** — 只检查，不修复
2. **退出码用于 CI/CD** — 0=PASS, 1=FAIL，方便集成到测试流程
3. **输出人类可读** — 每项检查显示 ✅/❌ + 详情，方便调试
4. **阈值可配置** — 如 unverified_rate <= 0.1，可以改成参数
5. **不要过度严格** — 允许合理误差（如官网占比 + 第三方占比 = 1 允许 1% 误差）
6. **cm 参数要传递** — validate_analyst_output 需要 cm 做 severity 逻辑检查
7. **文件名统一** — 全部用 validate_report.py
