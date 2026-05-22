# TASK_TEST_YESWELDER.md — 测试 YesWelder 品牌

> 药老出品 · 2026-05-07
> 目标: 跑 test_real_brand.py 测试 YesWelder 品牌，验证 Probe + Analyst 全流程
> 预计工时: 10min

---

## 测试品牌信息

```python
TEST_BRAND = {
    "domain": "yeswelder.com",
    "brand_name": "YesWelder",
    "industry": "焊接设备",
    "target_market": "美国、加拿大、英国、澳洲、欧洲",
    "core_product": "多工艺焊机（MIG/TIG/Stick/Plasma）、焊接面罩、焊接配件",
    "target_positioning": "预算友好的专业焊接设备品牌，让业余爱好者和小企业也能用上高质量焊接设备",
    "seed_queries": [
        "best budget welder",
        "welding equipment for beginners",
        "affordable MIG welder",
        "TIG welder under 500",
        "welding helmet auto darkening",
    ],
    "competitors": [
        "lincolnelectric.com",
        "millerwelds.com",
        "esab.com",
    ],
}
```

---

## 测试步骤

1. 确认 test_real_brand.py 存在且可运行
2. 用上述品牌信息跑测试
3. 检查输出：
   - Probe 是否完整跑完（brand_profiler → query_expander → fc_search → citation_analyzer → citation_metrics → source_authority → company_scorer → competitor_analysis）
   - Analyst 是否输出 three_layer_chain + 行业基准 + 竞品引用详情
   - 数据一致性：三分类引用率之和是否合理？维度打分矩阵是否完整？

---

## 预期输出

```
Probe 输出:
- brand_profile: YesWelder 品牌画像
- citation_metrics: 引用率（总/三分类/推荐率）
- source_authority: 引用源权威性
- company_score: 评分（5维度）
- competitor_analysis: 竞品对比（维度打分矩阵）

Analyst 输出:
- three_layer_chain: 三层推理链
- diagnosis: 核心问题 + 严重程度
- actions: 行动建议（带优先级）
- competitor_gap: 竞品差距分析（含 winning_dimensions）
- one_line_verdict: CEO 一句话总结
```

---

## 验证清单

- [ ] Probe 完整跑完，无报错
- [ ] Analyst 输出 three_layer_chain，三个字段非空
- [ ] 行业基准对比显示（焊接设备应映射到 _default，显示"行业基准数据不足"）
- [ ] 竞品引用详情显示（lincolnelectric.com、millerwelds.com、esab.com）
- [ ] 维度打分矩阵显示
- [ ] 数据一致性检查通过

---

## 注意事项

1. YesWelder 是小众品牌，AI 可能不太了解，引用率可能较低
2. 行业是"焊接设备"，可能映射到 _default（行业基准数据不足）
3. 竞品是传统高端品牌（Lincoln、Miller、ESAB），竞品对比可能差距较大
4. 如果测试失败，记录错误信息，方便定位问题
