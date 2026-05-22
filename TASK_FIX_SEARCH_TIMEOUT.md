# TASK_FIX_SEARCH_TIMEOUT.md — 修复搜索流超时问题

> 药老出品 · 2026-05-05
> 来源：Pela Case 真实数据测试暴露的问题
> 预计工时：1-2小时

---

## 问题背景

用 Pela Case（pelacase.com）跑真实数据测试，结果：

- brand_profile ✅ 正常
- competitor_analysis ✅ 15条对比，7胜3负5平
- 搜索流全部超时 ❌ query_terms=[]、citation_rate=0、market_perception全空、gap_report全空、company_score=null、ai_narrative=null、source_authority=null

根因：TIMEOUT_SEARCH_P1=120秒不够，30个ChatGPT联网搜索在120秒内跑不完。

---

## 要修的3个点

### 1. 超时时间不够

文件：`langgraph_app/nodes/probe_node.py`

改动：
```python
# 改前
TIMEOUT_SEARCH_P1 = 120

# 改后
TIMEOUT_SEARCH_P1 = 300  # 5分钟，30个ChatGPT联网搜索需要足够时间
```

理由：30个查询 × 每个3-5秒 + 并发开销 = 150-250秒。120秒太紧。

---

### 2. 超时后error字段没有标记原因

文件：`langgraph_app/nodes/probe_node.py`

问题：search_p1超时后，probe_output.status="partial"是正确的，但probe_output.error=null。
下游（Analyst）不知道为什么partial，无法区分"真的没数据"和"超时导致没数据"。

改动：在汇总阶段，检查search_timed_out并写入error：

```python
# 在 partial 判断之后、probe_output 构造之前
probe_error = None
if circuit_open:
    probe_error = "Circuit breaker triggered"
elif cost_guardrail_hit:
    probe_error = "Token budget exceeded (150K)"
elif search_timed_out:
    probe_error = f"Search pipeline timed out ({TIMEOUT_SEARCH_P1}s), Level 2+3 skipped"

probe_output = ProbeOutput(
    ...
    error=probe_error,
    ...
)
```

---

### 3. Analyst拿到残缺数据出了误导性诊断

文件：`langgraph_app/tools/analyst_context.py`

问题：search_p1超时后，build_context拿到的citation_metrics全是0、gap_report全空。
Analyst看到这些数据会误判为"品牌在AI世界里不存在"——
但实际上不是品牌不存在，是数据没采集到。

改动：在build_context中检测数据完整性，给Analyst加提示：

```python
def build_context(probe_output: dict) -> dict:
    # ... 现有代码 ...
    
    # 检测数据完整性
    cm = probe_output.get("citation_metrics") or {}
    gr = probe_output.get("gap_report") or {}
    status = probe_output.get("status", "success")
    
    data_completeness = "complete"
    completeness_note = ""
    
    if status == "partial":
        probe_error = probe_output.get("error", "")
        if "timed out" in (probe_error or "").lower() or "timeout" in (probe_error or "").lower():
            data_completeness = "search_timeout"
            completeness_note = (
                "⚠️ 搜索数据缺失：搜索管道超时，以下数据未采集到（不代表品牌真实情况）：\n"
                "- 引用率数据（citation_metrics）为空\n"
                "- 市场感知数据（market_perception）为空\n"
                "- 差距分析数据（gap_report）为空\n"
                "- 评分数据（company_score）为空\n"
                "请基于已有数据（brand_profile + competitor_analysis）进行分析，\n"
                "并在诊断中标注'数据不完整，建议重试'。"
            )
        elif cm.get("rate", 0) == 0 and cm.get("total_queries", 0) == 0:
            data_completeness = "no_citation_data"
            completeness_note = (
                "⚠️ 引用率数据为空（total_queries=0），可能是搜索管道未执行或失败。\n"
                "请不要将引用率0%解读为品牌不存在，而是标注'数据缺失'。"
            )
    
    return {
        ...现有返回值...,
        "data_completeness": data_completeness,
        "completeness_note": completeness_note,
    }
```

同时，在analyst_node.py的_build_user_message中，在开头插入completeness_note：

```python
def _build_user_message(ctx: dict) -> str:
    parts = []
    
    # 如果有数据完整性提示，放在最前面
    if ctx.get("completeness_note"):
        parts.append(ctx["completeness_note"])
        parts.append("")
    
    # ... 现有的 parts 构建代码 ...
```

---

## 验证方法

修改完成后，重新跑测试：

```bash
cd ~/Desktop/CiteFlow && source .venv/bin/activate
python test_real_brand.py
```

### 预期结果

1. **超时修复后**：search_p1在300秒内完成，citation_metrics有真实数据
2. **如果仍然超时**：probe_output.error应显示"Search pipeline timed out (300s)"
3. **Analyst诊断**：如果数据缺失，诊断应标注"数据不完整"，而不是"品牌不存在"

### 自检清单

- [ ] TIMEOUT_SEARCH_P1 改为 300
- [ ] search_timed_out 时 probe_output.error 有明确标记
- [ ] build_context 检测 partial 状态并生成 completeness_note
- [ ] _build_user_message 在开头插入 completeness_note
- [ ] 重新跑 test_real_brand.py 通过

---

## 交付格式

```
自检结果: X/5
失败项: (无 / 列出)
测试结果: Probe status=??? | citation_rate=??? | Analyst 诊断是否标注数据不完整
```
