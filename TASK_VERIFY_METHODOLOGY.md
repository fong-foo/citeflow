# TASK_VERIFY_METHODOLOGY.md — 验证方法论改动是否生效

> 药老出品 · 2026-05-22
> 目标: 跑完整管线，验证 CITE 框架、证据成熟度、8维度评分的实际输出
> 预计工时: 1h

---

## 背景

今天改了 4 个文件的方法论注入，全部未验证：

- `doctor_prompt.py` — +CITE 审计框架 + 证据成熟度 A/B/C/D/E
- `knowledge_loader.py` — +CITE 维度映射 + Trust 触发时注入证据成熟度上下文
- `analyst_prompt.py` — +8 维度内容质量评分
- `scan-doctor-briefing.tsx` — API 传参修复（user_input + analyst_output + probe_output）

---

## 任务：跑一次完整管线，逐项检查输出

### Step 1: 给测试脚本加 Doctor 步骤

文件：`test_flowerknows.py`

在 Analyst 步骤之后，加上 Doctor 步骤：

```python
# ── Step 3: Doctor ────────────────────────────────────
print("\n[3/3] 运行 Doctor（医师）...")
from langgraph_app.nodes.doctor_node import doctor_node

doctor_start = time.time()
try:
    state = doctor_node(state)
except Exception as e:
    print(f"\n!!! Doctor 崩溃: {e}")
    import traceback
    traceback.print_exc()
    return
doctor_elapsed = time.time() - doctor_start

doctor_output = state.get("doctor_output", {})
prescription = doctor_output.get("prescription", [])
summary = doctor_output.get("summary", "")
knowledge_sources = doctor_output.get("knowledge_sources", [])

print(f"\nDoctor 耗时: {doctor_elapsed:.1f}秒")
print(f"处方条数: {len(prescription)}")
print(f"引用论文: {len(knowledge_sources)}")
print(f"策略总结: {summary[:200]}...")

# 验证关键字段
print("\n=== CITE 维度验证 ===")
cite_found = 0
for i, item in enumerate(prescription):
    evidence = item.get("evidence", "")
    has_cite = "CITE" in evidence
    if has_cite:
        cite_found += 1
        print(f"  ✓ 处方{i+1} evidence 包含 CITE: {evidence[:100]}...")
    else:
        print(f"  ✗ 处方{i+1} evidence 缺少 CITE: {evidence[:100]}...")

print(f"\nCITE 覆盖率: {cite_found}/{len(prescription)}")

# 检查证据成熟度
if any("Trust" in item.get("evidence", "") or "权威" in item.get("category", "") for item in prescription):
    print("\n=== 证据成熟度验证 ===")
    for i, item in enumerate(prescription):
        if "权威建设" in item.get("category", ""):
            evidence = item.get("evidence", "")
            has_maturity = any(level in evidence for level in ["A 级", "B 级", "C 级", "D 级", "E 级", "目标：将", "证据等级"])
            if has_maturity:
                print(f"  ✓ 权威处方{i+1} 包含证据成熟度: {evidence[:120]}...")
            else:
                print(f"  ✗ 权威处方{i+1} 缺少证据成熟度标注")

# 保存 Doctor 输出
with open("test_doctor_output.json", "w", encoding="utf-8") as f:
    json.dump(doctor_output, f, ensure_ascii=False, indent=2)
print(f"\n完整 Doctor 输出已保存: test_doctor_output.json")

# 总结
print(f"\n总耗时: Probe={probe_elapsed:.1f}s + Analyst={analyst_elapsed:.1f}s + Doctor={doctor_elapsed:.1f}s = {probe_elapsed+analyst_elapsed+doctor_elapsed:.1f}s")
```

### Step 2: 运行测试

```bash
cd /Users/fogn/Desktop/CiteFlow
source .venv/bin/activate
python test_flowerknows.py
```

### Step 3: 检查输出文件

运行完成后，检查 3 个 JSON 文件：

**Probe 输出（`test_flowerknows_probe_output.json`）**：
- [ ] status 不是 "error"
- [ ] citation_metrics 有 industry_rate 和 brand_rate
- [ ] brand_profile 有 brand_name 和 inferred_industry

**Analyst 输出（`test_flowerknows_analyst_output.json`）**：
- [ ] status 是 "success"
- [ ] diagnosis.core_problem 非空
- [ ] one_line_verdict 非空
- [ ] engine_comparison.per_engine 包含所有引擎
- [ ] competitor_gap.root_cause 非空（不是"数据不足"）

**Doctor 输出（`test_doctor_output.json`）**：
- [ ] status 是 "success"
- [ ] prescription 长度 ≥ 5 条
- [ ] **每条 prescription 的 evidence 字段包含 "CITE·"**
- [ ] 至少 1 条 Trust（权威建设）处方的 evidence 字段包含证据等级语言
- [ ] summary 非空
- [ ] knowledge_sources 长度 > 0

### Step 4: 前端验证

如果后端测试通过，还要验证前端：

1. `http://localhost:3000/scan` → 用测试账号登录
2. 输入 flowerknows.co → 跑一次完整扫描（Probe → Analyst → Doctor）
3. 进入 Doctor step → 确认看到处方工作室（不是旧的 ScanPrescriptionSteps）
4. 检查 4 个 Zone：
   - Zone 1: 策略总览卡（有 summary 文字 + 方法论标签）
   - Zone 2: 执行概览（进度条 + "0/N 已完成" + P0/P1/P2 统计）
   - Zone 3: P0/P1/P2 分组处方清单
   - Zone 4: 双 CTA 按钮
5. 浏览器 console 检查无红色报错

---

## 不需要改的文件

- `doctor_prompt.py` — 已改，不改
- `knowledge_loader.py` — 已改，不改
- `analyst_prompt.py` — 已改，不改

---

## CHECKLIST 自检

**Step 1-3 后端测试：**
- [ ] test_flowerknows.py 成功添加 Doctor 步骤
- [ ] 脚本成功运行，无崩溃
- [ ] Probe 输出正常
- [ ] Analyst 输出正常
- [ ] Doctor 输出正常
- [ ] CITE 维度在 evidence 字段中出现
- [ ] 证据成熟度在权威处方中出现

**Step 4 前端测试：**
- [ ] 处方工作室正常渲染（4 个 Zone 全部可见）
- [ ] 方法论标签显示
- [ ] 处方列表可展开/折叠
- [ ] 执行勾选功能正常
- [ ] 浏览器 console 无错误

---

## 交付格式

```
后端测试结果:
- Probe: success/fail — N秒
- Analyst: success/fail — N秒
- Doctor: success/fail — N秒
- CITE 覆盖率: X/Y 条
- 证据成熟度: 出现/未出现
- 参见: test_doctor_output.json

前端测试结果:
- 处方工作室: 4个Zone全部渲染/部分缺失
- console 错误: 无/N个
- 截图: (可选)
```
