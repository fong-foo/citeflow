# 任务计划：Analyst 重构（方案 Y v2）

## 目标
把 Analyst 从 898行单文件 + 3500 token prompt + LLM 自觉执行规则 重构为 4文件 + ~1200 token prompt + 代码判断规则触发。

## 当前阶段
阶段 6 — 端到端验证（mock通过，待真实品牌测试）

## 各阶段

### 阶段 1：需求与发现
- [x] 审查 TASK_ANALYST_REFACTOR.md
- [x] 逐函数追踪数据流，验证计划与实际代码一致性
- [x] 发现并修复 3 个关键 Bug（dq未定义、test key不匹配、注释不一致）
- [x] 确认设计层面 5 个问题可在执行中处理
- **状态：** complete

### 阶段 2：Task 0+1+2 并行实现
- [x] Task 0: analyst_context.py — 新增 `_aggregate_dimensions`，+94行
- [x] Task 1: analyst_rules.py — 新文件（187行），9个规则函数 + `_detect_anomalies` + `detect_rules`
- [x] Task 2: analyst_prompt.py — 新文件（128行），SYSTEM_PROMPT + FEW_SHOT + ANALYSIS_GUIDE + `build_rule_section`
- **状态：** complete

### 阶段 3：Task 5 单元测试
- [x] 创建 test_analyst_rules.py（24个测试用例）
- [x] 逐条规则验证触发/不触发
- [x] 集成测试 detect_rules 全流程
- [x] 24/24 passed
- **状态：** complete

### 阶段 4：Task 3 analyst_briefing.py
- [x] 从 `_build_user_message` 重构为 `build_briefing`（298行）
- [x] 使用 dimension_aggregation 替代手动聚合（保留回退逻辑）
- [x] 行业基准格式改为 P25/P50/P75（移除位置判断）
- [x] 竞品对比使用预计算 gap + severity
- **状态：** complete

### 阶段 5：Task 4 analyst_node.py 主流程重构
- [x] 898行 → 113行
- [x] 新流程：build_context → detect_rules → build_briefing → LLM
- [x] SYSTEM_PROMPT 改为从 analyst_prompt import
- [x] 保留重试逻辑和 _empty_output
- **状态：** complete

### 阶段 6：端到端验证
- [x] `python test_analyst_rules.py` 全部通过（24/24）
- [x] Mock probe_output 管道验证通过（6规则触发，briefing 2448 chars）
- [ ] `python test_real_brand.py` Analyst 不崩溃
- [ ] severity 一致性检查
- [ ] three_layer_chain 三字段非空
- [ ] rationale 不是数据复述（人工抽检）
- [ ] SYSTEM_PROMPT + FEW_SHOT token < 1200
- **状态：** in_progress

## 关键问题
1. Few-Shot 只有 Stripe(B2B) 示例，DTC/工业品牌可能被误导 — 边做边观察，必要时加第二个示例
2. user message 无 token 预算机制 — 观察实际输出长度，超出时加截断
3. `_aggregate_dimensions` 丢失 importance 加权 — 可后续优化

## 已做决策
| 决策 | 理由 |
|------|------|
| 规则详情放 user message 不放 system prompt | system 保持稳定，user 包含动态内容 |
| 分析框架规则(5/7/11)不进 detect_rules | 它们是通用指导，不是条件触发 |
| 执行顺序 0+1+2 并行 → 5 → 3 → 4 | Task 0/1/2 互不依赖，3依赖0，4依赖全部 |

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| _aggregate_dimensions 接收 comp(list) 但内部调 .get() | 1 | 改为显式传参 dimension_matrix + brand_name + dimension_data_quality |
| check_rule_1 用 citation_rate 总引用率 | 1 | 改为 industry_rate 行业引用率，附注释说明原因 |
| brand_name 子串匹配可能误判 | 1 | 改为规范化精确匹配 + startswith |

## 备注
- 文件位置：`langgraph_app/tools/` 下新增 3 个文件，修改 1 个；`langgraph_app/nodes/` 下修改 1 个
- 总工作量：~800行新代码 + ~500行删除
- 验证标准见 TASK_ANALYST_REFACTOR.md 第十一节
