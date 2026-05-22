# 发现与决策

## 需求
- Analyst 重构：代码判断规则触发 → LLM 只做深度分析
- Prompt 从 ~3500 token 降到 ~1200 token
- 文件从 1×898行拆成 4×150行

## 研究发现

### 数据流追踪（2026-05-09）
- `probe_output.competitor_analysis` → list[CompetitorResult]，每个包含 `dimension_scores: list[DimensionComparison]`
- `build_context` 将 `dimension_scores` 展平为 `competitor_summary.dimension_matrix`（带 query 上下文）
- `_aggregate_dimensions` 从 `dimension_matrix` 读取，按维度名分组聚合
- `_build_user_message` 当前在 analyst_node.py:681-880，搬至 analyst_briefing.py

### 数据流验证结果
- `ctx["metrics"]` 包含所有规则检测所需字段 ✓
- `ctx["source_breakdown"]` 包含 top_sources + official_site_ratio ✓
- `ctx["dimension_aggregation"]` 需新增，由 `_aggregate_dimensions` 生成 ✓
- `ctx["engine_results"]`、`ctx["benchmark"]`、`ctx["perception_vs_self"]` 均存在 ✓

### brand_name 匹配
- LLM 填充的 `brand` 字段是自由文本（"YesWelder" / "yeswelder.com" / "YesWelder welders"）
- 采用规范化精确匹配：`b_normalized == brand_normalized` 或 `startswith(brand_normalized + " ")` 或 `startswith(brand_normalized + ".")`

## 技术决策
| 决策 | 理由 |
|------|------|
| 规则详情放 user message | system 保持稳定，user 包含动态内容 |
| 分析框架(5/7/11)不进 detect_rules | 它们是通用指导，按需注入 ANALYSIS_GUIDE |
| _aggregate_dimensions 在 build_context 中调用 | 供 detect_rules 和 build_briefing 共用，避免重复计算 |
| startswith 匹配品牌名 | 覆盖 "YesWelder" → "YesWelder welders"、"YesWelder.com" 等变体 |

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| _aggregate_dimensions 收 comp(list) 但调 .get() | 改为显式 kwarg: dimension_matrix, brand_name, dimension_data_quality |
| check_rule_1 用总引用率虚高 | 改为 industry_rate，语义是"AI在行业查询中频繁提到你但理解错了" |
| test ctx 用 citation_rate 但 rule_1 读 industry_rate | 测试 ctx 改为 industry_rate |

## 待观察的设计问题
- 严重程度标签 "势均力敌" vs SYSTEM_PROMPT 规则6 "小幅劣势" — 不一致但暂不阻塞
- 单 Few-Shot (Stripe B2B) 行业偏差 — DTC 品牌测试时观察
- user message 无 token 预算 — 实际运行时监控长度
- _aggregate_dimensions 用等权平均丢失 importance — 可后续加权

## 资源
- 任务文件: `TASK_ANALYST_REFACTOR.md`
- 当前 Analyst: `langgraph_app/nodes/analyst_node.py` (898行)
- 上下文构建: `langgraph_app/tools/analyst_context.py` (220行)
- 状态定义: `langgraph_app/state.py`
- 测试文件: `test_real_brand.py`
- 验证脚本: `validate_report.py`

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*
