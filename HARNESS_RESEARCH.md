# CiteFlow Harness 工程深度研究报告

> 药老研究 · 2026-05-01
> 基于全网搜索 + arXiv论文 + 行业框架 + CiteFlow项目对比

---

## 研究来源

1. arXiv 论文搜索：agent harness reliability（61篇）、LLM agent validation testing（364篇）
2. GEO论文（Princeton, KDD 2024）：Generative Engine Optimization
3. 行业框架：LangChain、LlamaIndex、Instructor、NeMo Guardrails
4. 可观测性工具：LangSmith、Weights & Biases、AgentOps、Helicone
5. 测试工具：Promptfoo、DeepEval、Ragas
6. 专家观点：Rand Fishkin、Andy Crestodina、Kevin Indig

---

## 一、Harness 工程的核心定义

Harness = 为 LLM Agent 构建可靠的运行框架

类比：
- Agent = 赛车手（LLM）
- Harness = 赛车（框架/约束/保障）
- 没有赛车的赛车手 = 裸奔的 LLM

Harness 的 8 大职责：
1. 身份定义 — 告诉 Agent "你是谁"
2. 提示词管理 — 告诉 Agent "怎么说话"
3. 上下文注入 — 告诉 Agent "知道什么"
4. 工具提供 — 告诉 Agent "能用什么"
5. 执行控制 — 告诉 Agent "怎么干活"
6. 输出验证 — 检查 Agent "干得对不对"
7. 错误处理 — 处理 Agent "干砸了怎么办"
8. 可观测性 — 记录 Agent "干了什么"

---

## 二、行业主流 Harness 设计模式

### 模式 1：分层架构（Layered Architecture）

**代表框架：** LangChain, LlamaIndex, Haystack

**标准 8 层设计：**
```
Layer 1: 身份层（Identity）— 角色定义、系统提示词
Layer 2: 上下文层（Context）— 信息注入、记忆管理
Layer 3: 工具层（Tools）— 外部能力、API 调用
Layer 4: 执行层（Execution）— ReAct 循环、推理链
Layer 5: 验证层（Validation）— 输出检查、格式约束
Layer 6: 容错层（Resilience）— 重试、熔断、降级
Layer 7: 可观测层（Observability）— 日志、追踪、指标
Layer 8: 安全层（Safety）— 权限、注入防护、审计
```

**CiteFlow 12 层对比：**
- ✅ 我们有 12 层，比行业标准更细
- ✅ 我们拆分了：重试/熔断/可观测/成本/测试
- ⚠️ 但安全层和审计层是空壳

---

### 模式 2：Guardrails（护栏模式）

**代表框架：** NVIDIA NeMo Guardrails, Guardrails AI

**三层护栏：**
```
输入护栏：
  · Prompt Injection 检测
  · 输入格式验证
  · 敏感词过滤

输出护栏：
  · 输出格式约束（Pydantic/JSON Schema）
  · 幻觉检测
  · 事实性验证
  · 安全性检查

流程护栏：
  · 动作白名单
  · 权限控制
  · 审计日志
```

**CiteFlow 对比：**
- ✅ 我们有 Pydantic 输出约束
- ✅ 我们有 validate_output 函数
- ❌ 我们没有输入护栏（Prompt Injection 防护）
- ❌ 我们没有幻觉检测
- ❌ 我们没有事实性验证

---

### 模式 3：Structured Output（结构化输出）

**代表框架：** Instructor, Outlines, LMQL

**核心思路：**
```
强制输出格式：
  · JSON Schema 约束
  · Pydantic Model 验证
  · 正则表达式约束
  · 语法约束（grammar-based）

关键工具：Instructor
  · 用 Pydantic 定义输出
  · 自动验证输出格式
  · 格式错误时自动重试
  · 支持 OpenAI/Anthropic/Google
```

**CiteFlow 对比：**
- ✅ 我们用 Pydantic Model 定义输出
- ✅ 我们有 validate_output 检查
- ⚠️ 但我们没有用 Instructor（自动重试）
- ⚠️ 我们的验证是手动的，不是自动的

**建议：引入 Instructor 库，自动处理输出验证+重试**

---

### 模式 4：Observability（可观测性）

**代表工具：** LangSmith, Weights & Biases, AgentOps, Helicone

**三大支柱：**
```
1. Logs（日志）— 结构化日志，可查询
   · JSON 格式
   · 关键字段：timestamp, level, node, action, input, output, tokens, cost

2. Traces（追踪）— 请求链路，可回溯
   · 每次调用生成唯一 trace_id
   · 记录完整调用链：Probe → Analyst → Commander → ...
   · 支持回放和调试

3. Metrics（指标）— 性能数据，可告警
   · Token 消耗（输入/输出/总计）
   · 延迟（首 token 时间/总时间）
   · 成本（每次调用/每日/每月）
   · 错误率（按类型分：超时/限流/格式错误）
   · 质量指标（引用准确率/情感分类准确率）
```

**CiteFlow 对比：**
- ✅ 我们有 NodeLogger（基础日志）
- ✅ 我们有 TokenTracker（token 追踪）
- ❌ 我们没有结构化日志（只有 print）
- ❌ 我们没有请求链路追踪
- ❌ 我们没有性能指标采集
- ❌ 我们没有告警机制

---

### 模式 5：Testing（测试策略）

**代表工具：** Promptfoo, Ragas, DeepEval

**三层测试：**
```
1. 单元测试 — 单个工具/函数的测试
   · 测试工具输入输出
   · 测试边界条件
   · 测试错误处理

2. 集成测试 — 多个组件协作的测试
   · 测试数据流转
   · 测试错误传播
   · 测试降级策略

3. 端到端测试 — 完整管线的测试
   · 测试完整流程
   · 测试输出质量
   · 测试性能指标

LLM 特有测试：
  · Prompt 测试 — 不同提示词的效果对比
  · 输出质量测试 — LLM 输出的准确性/相关性
  · 回归测试 — 确保修改不降低质量
  · A/B 测试 — 对比不同方案的效果

测试数据管理：
  · Golden Dataset — 标准答案数据集
  · Synthetic Data — 自动生成测试数据
  · Human Feedback — 人工标注数据
```

**CiteFlow 对比：**
- ✅ 我们有端到端测试（test_pipeline.py）
- ✅ 我们有 validate_output（输出验证）
- ❌ 我们没有 Prompt 测试
- ❌ 我们没有输出质量测试
- ❌ 我们没有 Golden Dataset
- ❌ 我们没有回归测试

---

### 模式 6：Context Engineering（上下文工程）

**代表概念：** RAG, Memory Management, Context Window Optimization

**核心策略：**
```
上下文管理：
  · 短期记忆 — 当前对话的历史
  · 长期记忆 — 跨对话的知识
  · 工作记忆 — 当前任务的临时数据

上下文优化：
  · Token 预算 — 每个部分分配多少 token
  · 信息过滤 — 只放相关信息
  · 压缩策略 — 长文本如何压缩
  · 缓存策略 — 重复内容如何复用

RAG（检索增强生成）：
  · 向量检索 — 从知识库中检索相关内容
  · 语义搜索 — 基于语义相似度搜索
  · 混合检索 — 关键词+语义结合
```

**CiteFlow 对比：**
- ✅ 我们有 build_context 函数
- ⚠️ 但我们的上下文构建很简单（直接拼接字段）
- ❌ 我们没有 token 预算管理
- ❌ 我们没有信息过滤
- ❌ 我们没有 RAG
- ❌ 我们没有记忆管理

---

### 模式 7：Error Handling（错误处理）

**代表模式：** Retry, Fallback, Circuit Breaker, Bulkhead

**错误分类：**
```
可重试错误：
  · 超时（timeout）
  · 限流（429）
  · 临时故障（500/502/503）

不可重试错误：
  · 格式错误（invalid format）
  · 权限不足（401/403）
  · 资源不存在（404）

降级错误：
  · 服务不可用
  · 用备用方案
```

**重试策略：**
```
指数退避：
  · 第1次重试：等1秒
  · 第2次重试：等2秒
  · 第3次重试：等4秒
  · 最大等待：30秒

最大重试次数：
  · 默认3次
  · 可配置

重试条件：
  · 只重试可重试错误
  · 不可重试错误直接失败
```

**熔断策略：**
```
状态机：
  · 关闭（正常）→ 连续失败N次 → 打开（熔断）
  · 打开（熔断）→ 等待M秒 → 半开（试探）
  · 半开（试探）→ 成功 → 关闭（正常）
  · 半开（试探）→ 失败 → 打开（熔断）

参数：
  · 失败阈值：3次
  · 熔断时间：30秒
  · 半开尝试：1次
```

**CiteFlow 对比：**
- ✅ 我们有 CircuitBreaker（熔断器）
- ✅ 我们有重试提示词（build_retry_prompt）
- ⚠️ 但我们的重试逻辑很简单（没有指数退避）
- ⚠️ 我们的错误分类不够细（只有 success/error）
- ❌ 我们没有降级策略
- ❌ 我们没有备用模型
- ❌ 熔断器没有半开状态

---

## 三、arXiv 论文关键发现

### 论文 1：Schema-Grounded Memory（2026-04-30）
**标题：** From Unstructured Recall to Schema-Grounded Memory

**关键发现：**
- Agent 需要结构化记忆，不是简单的文本存储
- 需要支持：精确事实、当前状态、更新删除、聚合、关系、负查询
- 建议用 Schema 约束记忆格式

**对 CiteFlow 的启示：**
- 我们的 State 是结构化的（Pydantic Model）✅
- 但没有记忆管理（跨会话状态）❌

### 论文 2：Compiling Deterministic Structure into SLM Harnesses（2026-04-19）
**标题：** Compiling Deterministic Structure into SLM Harnesses

**关键发现：**
- 小模型（SLM）需要更强的结构约束
- 用确定性结构（如正则、语法）约束输出
- 减少幻觉，提高可靠性

**对 CiteFlow 的启示：**
- 我们用 DeepSeek（大模型），但输出约束可以更强
- 建议引入 Instructor 或 Outlines

### 论文 3：Operating-Layer Controls for Onchain Agents（2026-04-28）
**标题：** Operating-Layer Controls for Onchain Language-Model Agents

**关键发现：**
- Agent 在真实环境中需要操作层控制
- 需要：权限控制、审计日志、回滚机制
- 建议用分层控制架构

**对 CiteFlow 的启示：**
- 我们需要权限控制（工具白名单）
- 我们需要审计日志
- 我们需要回滚机制（失败时恢复）

---

## 四、行业工具推荐

### 输出验证工具
| 工具 | 用途 | 推荐度 |
|------|------|--------|
| Instructor | Pydantic 自动验证+重试 | ⭐⭐⭐⭐⭐ |
| Outlines | 正则/语法约束生成 | ⭐⭐⭐⭐ |
| LMQL | 查询语言约束 LLM | ⭐⭐⭐ |
| Guardrails AI | 输出格式约束 | ⭐⭐⭐ |

### 可观测性工具
| 工具 | 用途 | 推荐度 |
|------|------|--------|
| LangSmith | LangChain 官方追踪 | ⭐⭐⭐⭐⭐ |
| Weights & Biases | 实验追踪+可视化 | ⭐⭐⭐⭐ |
| AgentOps | Agent 专用监控 | ⭐⭐⭐⭐ |
| Helicone | LLM API 代理+追踪 | ⭐⭐⭐ |
| Langfuse | 开源 LLM 可观测性 | ⭐⭐⭐⭐ |

### 测试工具
| 工具 | 用途 | 推荐度 |
|------|------|--------|
| Promptfoo | Prompt 测试+A/B 测试 | ⭐⭐⭐⭐⭐ |
| DeepEval | 输出质量评估 | ⭐⭐⭐⭐ |
| Ragas | RAG 质量评估 | ⭐⭐⭐⭐ |
| TruLens | LLM 应用评估 | ⭐⭐⭐ |

### 安全工具
| 工具 | 用途 | 推荐度 |
|------|------|--------|
| NeMo Guardrails | NVIDIA 安全护栏 | ⭐⭐⭐⭐⭐ |
| Rebuff | Prompt Injection 检测 | ⭐⭐⭐⭐ |
| LLM Guard | 输入输出安全检查 | ⭐⭐⭐⭐ |

---

## 五、CiteFlow Harness 的 6 大短板

### 短板 1：安全层缺失（P0 严重）
**现状：**
- 没有 Prompt Injection 风险
- 没有输入验证和过滤
- 没有权限控制
- 没有审计日志

**影响：**
- 恶意用户可以通过注入攻击操纵 Agent 行为
- Agent 可能泄露敏感信息
- 无法追踪谁做了什么

**修复方案：**
- 引入 NeMo Guardrails 或 Rebuff
- 添加 Prompt Injection 检测
- 实现权限控制（工具白名单）
- 添加审计日志

**工作量：** 2-3天

---

### 短板 2：可观测性不足（P0 严重）
**现状：**
- 只有 print 日志，没有结构化日志
- 没有请求链路追踪
- 没有性能指标采集
- 没有告警机制

**影响：**
- 出问题时无法快速定位原因
- 无法监控系统健康
- 无法优化性能和成本

**修复方案：**
- 引入 LangSmith 或 Langfuse
- 实现结构化日志（JSON 格式）
- 添加关键指标采集（token/延迟/错误率）
- 实现告警机制（错误率超阈值时通知）

**工作量：** 3-5天

---

### 短板 3：上下文工程薄弱（P1 中等）
**现状：**
- 上下文构建很简单（直接拼接字段）
- 没有 token 预算管理
- 没有信息过滤
- 没有 RAG

**影响：**
- token 浪费
- 上下文质量低
- LLM 输出质量不稳定

**修复方案：**
- 实现 token 预算管理
- 添加信息过滤（只放相关内容）
- 引入 RAG（向量检索）
- 实现记忆管理（短期/长期）

**工作量：** 5-7天

---

### 短板 4：测试策略不完整（P1 中等）
**现状：**
- 只有端到端测试
- 没有 Prompt 测试
- 没有输出质量测试
- 没有 Golden Dataset

**影响：**
- 无法保证 LLM 输出质量
- 无法做回归测试
- 无法对比不同方案

**修复方案：**
- 引入 Promptfoo 或 DeepEval
- 构建 Golden Dataset（标准答案）
- 实现回归测试
- 添加 A/B 测试能力

**工作量：** 3-5天

---

### 短板 5：错误处理不够细（P2 轻微）
**现状：**
- 重试逻辑很简单（没有指数退避）
- 错误分类不够细（只有 success/error）
- 没有降级策略

**影响：**
- 错误处理效率低
- 可能浪费 API 调用
- 用户体验差

**修复方案：**
- 细化错误分类（可重试/不可重试/降级）
- 实现指数退避重试
- 添加降级策略（备用模型/缓存结果）
- 完善熔断器（加半开状态）

**工作量：** 2-3天

---

### 短板 6：输出验证不够强（P2 轻微）
**现状：**
- validate_output 是手动的
- 没有使用 Instructor（自动验证+重试）
- 没有幻觉检测

**影响：**
- LLM 输出质量不稳定
- 可能有幻觉
- 需要人工校验

**修复方案：**
- 引入 Instructor 库
- 实现自动验证+重试
- 添加幻觉检测（验证引用来源是否真实存在）

**工作量：** 2-3天

---

## 六、优先级排序和开发计划

```
P0（必须做，Phase 3 之前）：
  1. 安全层 — Prompt Injection 防护、输入验证（2-3天）
  2. 可观测性 — 结构化日志、追踪、指标（3-5天）

P1（应该做，Phase 4 之前）：
  3. 上下文工程 — token 预算、信息过滤、RAG（5-7天）
  4. 测试策略 — Golden Dataset、回归测试（3-5天）

P2（可以做，Phase 5 之前）：
  5. 错误处理 — 细化分类、指数退避、降级策略（2-3天）
  6. 输出验证 — 引入 Instructor、幻觉检测（2-3天）
```

**总工作量：17-26天**

---

## 七、总结

CiteFlow 的 12 层 harness 框架设计是好的，比行业标准更细。但执行层面有 6 大短板：

1. **安全层缺失** — 最严重，必须优先补
2. **可观测性不足** — 生产环境必备
3. **上下文工程薄弱** — 影响 LLM 输出质量
4. **测试策略不完整** — 无法保证质量
5. **错误处理不够细** — 影响稳定性
6. **输出验证不够强** — 可能有幻觉

**建议：Phase 3 之前先补 P0 级别的短板（安全层+可观测性），再继续开发其他节点。**

---

## 八、参考资料

1. GEO: Generative Engine Optimization (arXiv:2311.09735, KDD 2024)
2. From Unstructured Recall to Schema-Grounded Memory (arXiv:2604.27906)
3. Compiling Deterministic Structure into SLM Harnesses (arXiv:2604.17450)
4. Operating-Layer Controls for Onchain Agents (arXiv:2604.26091)
5. LangChain Documentation: https://docs.langchain.com
6. Instructor Documentation: https://python.useinstructor.com
7. NeMo Guardrails: https://github.com/NVIDIA/NeMo-Guardrails
8. LangSmith: https://smith.langchain.com
9. Promptfoo: https://promptfoo.dev
10. DeepEval: https://github.com/confident-ai/deepeval
