#!/bin/bash
set -e
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CiteFlow — Brand AI Search Diagnostic"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install dependencies (skip if already installed)
pip install -q -r requirements.txt 2>/dev/null || true

python3 -c "
import json, sys, os
sys.path.insert(0, '.')

# Load sample probe output
with open('examples/sample_probe_output.json') as f:
    probe = json.load(f)

bp = probe.get('brand_profile', {})
cm = probe.get('citation_metrics', {})

print(f'Brand: {bp.get(\"brand_name\", \"Unknown\")}')
print(f'Industry: {bp.get(\"inferred_industry\", \"Unknown\")}')
print(f'Citation rate: {cm.get(\"rate\", 0)}%')
print(f'  A-class (industry): {cm.get(\"industry_rate\", 0)}%')
print(f'  B-class (brand):    {cm.get(\"brand_rate\", 0)}%')
print(f'  C-class (competitor): {cm.get(\"competitor_scenario_rate\", 0)}%')
print()

# Run Analyst rule detection
from agents.analyst.analyst_context import build_context
from agents.analyst.analyst_rules import detect_rules

ctx = build_context(probe)
result = detect_rules(ctx)
triggered = result.get('triggered', [])

print(f'Rules triggered: {len(triggered)}')
print(f'Severity: {result.get(\"severity\", \"unknown\")}')
print()

for r in triggered:
    print(f'  R{r[\"rule_id\"]}: {r[\"name\"]} ({r[\"severity\"]})')
    print(f'      {r[\"evidence\"]}')

# Key anomalies
anomalies = result.get('key_anomalies', [])
if anomalies:
    print()
    print(f'Key anomalies ({len(anomalies)}):')
    for a in anomalies[:3]:
        print(f'  ! {a}')

print()
print('Demo complete. Run with real API keys:')
print('  OPENAI_API_KEY=sk-xxx DEEPSEEK_API_KEY=sk-xxx python3 api/api_public.py --domain yourbrand.com --brand \"Your Brand\"')
"
