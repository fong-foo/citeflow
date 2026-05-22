"""用 flower_knows_probe.json 验证 Analyst 能跑通"""
import json, sys, os, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from langgraph_app.nodes.analyst_node import analyst_node

# 1. 加载已有 Probe 数据
with open("flower_knows_probe.json") as f:
    probe_output = json.load(f)

print(f"✅ 加载 Probe 数据: {len(json.dumps(probe_output))} bytes")
print(f"   引用率: {probe_output.get('citation_metrics',{}).get('rate')}%")
print(f"   查询词数: {len(probe_output.get('query_terms',[]))}")
print(f"   引擎: {probe_output.get('engines_queried')}")
print()

# 2. 喂给 Analyst
print("🔬 运行 Analyst 诊断...")
start = time.time()

state = {"probe_output": probe_output}
result = analyst_node(state)

elapsed = time.time() - start
analyst_output = result.get("analyst_output", {})

# 3. 输出结果
print(f"\n⏱ 耗时: {elapsed:.0f}s")
print(f"状态: {analyst_output.get('status')}")

if analyst_output.get("status") == "success":
    print(f"\n📊 诊断结果:")
    diag = analyst_output.get("diagnosis", {})
    print(f"   总体评分: {diag.get('overall_score')}")
    print(f"   严重程度: {diag.get('severity')}")
    print(f"   一行总结: {diag.get('one_line_summary', 'N/A')[:120]}")

    issues = analyst_output.get("issues", [])
    print(f"   发现问题数: {len(issues)}")
    for issue in issues:
        print(f"     [{issue.get('severity','?')}] {issue.get('title','?')}: {issue.get('description','?')[:80]}")

    actions = analyst_output.get("actions", [])
    print(f"   行动建议数: {len(actions)}")
    for a in actions:
        print(f"     [{a.get('priority','?')}] {a.get('action','?')[:80]}")

    competitor_gaps = analyst_output.get("competitor_gaps", [])
    print(f"   竞品差距分析数: {len(competitor_gaps)}")

    three_layer = analyst_output.get("three_layer_chain")
    if three_layer:
        print(f"\n📐 三层链: {three_layer.get('layer1','')[:60]}...")
else:
    print(f"\n❌ 失败: {analyst_output.get('error', 'unknown')}")

# 4. 保存完整结果
with open("test_analyst_result.json", "w", encoding="utf-8") as f:
    json.dump(analyst_output, f, ensure_ascii=False, indent=2)
print(f"\n💾 完整结果保存到 test_analyst_result.json")
