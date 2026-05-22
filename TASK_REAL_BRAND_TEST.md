# TASK_REAL_BRAND_TEST.md — 真实品牌数据测试

> 药老出品 · 2026-05-05
> 目标：用真实品牌数据跑通 Probe → Analyst 全流程，验证输出质量

---

## 测试品牌

Pela Case（环保手机壳 DTC 品牌）
- domain: pelacase.com
- 营收: ~$30-60M，不大不小
- 选它原因：环保细分赛道，AI可能认知不完整，方便验证诊断质量

## 执行步骤

1. 确认环境就绪：
```bash
cd ~/Desktop/CiteFlow && source .venv/bin/activate
```

2. 确认 API Key 有余额（ChatGPT 中转站 + DeepSeek）

3. 运行测试脚本：
```bash
python test_real_brand.py
```

4. 等待完成（预计 3-6 分钟）

## 预期输出

测试完成后会生成两个文件：
- `test_pela_probe_output.json` — Probe 完整数据
- `test_pela_analyst_output.json` — Analyst 完整诊断

终端会打印关键指标摘要。

## 跑完后报告内容

请在终端输出或回复中包含以下信息：

### Probe 数据质量检查
- [ ] brand_profile 是否有值？one_liner 是否合理？
- [ ] citation_metrics.rate 是多少？（预期：应该有引用率数据）
- [ ] company_score.overall 是多少？5个维度分数分别是？
- [ ] gap_report.alignment_score 是多少？
- [ ] source_authority.top_sources 列出了哪些来源？
- [ ] competitor_analysis 有多少条对比？胜/负比？
- [ ] meta.total_tokens 是多少？meta.total_duration_ms 是多少？

### Analyst 诊断质量检查
- [ ] diagnosis.core_problem 是否有洞察？（不是数据复述）
- [ ] diagnosis.severity 判定是否合理？
- [ ] actions 有几条？每条是否有完整的 8 个字段？
- [ ] action_steps 是否精确到平台名称？（不能是"注册账号"这种泛泛的）
- [ ] rationale 是洞察还是数据复述？
- [ ] one_line_verdict 是否有记忆点？

### 错误检查
- [ ] errors dict 里有什么？
- [ ] 有没有模块超时？
- [ ] 有没有 JSON 解析失败？
- [ ] 有没有 Schema 验证失败触发重试？

## 如果出错了

1. API 超时/429 → 检查中转站余额，可能需要充值
2. JSON 解析失败 → Analyst 重试机制应该自动处理，看是否恢复
3. Probe 崩溃 → 看 traceback，可能是某个工具模块的 bug
4. 数据全空 → 检查 ChatGPT 是否真的调用了 web_search（看 chatgpt_client.py 的日志）

## 交付格式

```
测试结果: Probe X/7 + Analyst X/6 + 错误 X/3 = XX/16
关键发现: (列出最重要的 2-3 个发现)
问题: (列出发现的问题或"无")
```
