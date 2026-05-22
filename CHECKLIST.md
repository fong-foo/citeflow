# CHECKLIST.md — 海老交付前自检清单

> 每次完成任务后，在提交前逐项自检。每一项 PASS 才能说"完成了"。
> 发现 FAIL → 自己修 → 重检 → 直到全部 PASS。

---

## 一、代码质量自检 (8项)

### 1. 数据模型
- [ ] 所有新增/修改的输出字段在 state.py 有对应的 Pydantic Model
- [ ] Model 的 Optional 字段有默认值，不会因缺少数据而崩溃
- [ ] 嵌套 Model（如 ProbeOutput 包含 BrandProfile）的解析链完整

### 2. 错误处理
- [ ] 每个 LLM 调用/API 调用都有 try-except
- [ ] 失败时返回带 status="error" + error 消息的结构化输出（不是裸异常）
- [ ] Probe 各模块独立容错：一个模块失败不阻塞其他模块
- [ ] 有 fallback 逻辑的模块（如 brand_profiler → intro_composer），fallback 路径已验证

### 3. 超时与预算
- [ ] 外部 API 调用有 timeout（不能无限等待）
- [ ] Token 预算检查存在且生效（当前硬限 150K）
- [ ] 批量调用有并发控制（Semaphore，当前 BATCH_SIZE=3）

### 4. 并发安全
- [ ] asyncio 代码中没有混用同步阻塞调用
- [ ] 共享状态（如 CircuitBreaker）在并发环境下安全
- [ ] create_task 的结果都被 await（没有泄漏的 task）

### 5. LLM 提示词
- [ ] System Prompt 要求输出 JSON 且指定了 response_format={"type": "json_object"}
- [ ] Prompt 中有"只返回JSON，不要其他文字"的约束
- [ ] Few-Shot 示例的输出格式和实际要求的格式一致
- [ ] Prompt 长度合理（没有把整个 ProbeOutput 原文塞进去）

### 6. 输出验证
- [ ] LLM 返回的 JSON 用 json.loads 解析（不是 eval）
- [ ] 解析后的 dict 用 Pydantic Model 验证（不是直接取字段）
- [ ] 验证失败时有明确的错误信息（包含原始返回内容的前200字符）

### 7. 日志
- [ ] 关键节点有 NodeLogger 输出（开始/结束/错误）
- [ ] 日志包含可定位的信息（模块名、token数、耗时、关键指标值）
- [ ] 没有把敏感信息（API Key）打到日志里

### 8. 可测试性
- [ ] 模块可以独立调用（不依赖全局状态或上一个节点的副作用）
- [ ] 有对应的 test_*.py 文件或调用示例
- [ ] test 文件可以独立运行（python test_xxx.py）

---

## 二、Probe 管道自检 (6项)

### 并行架构
- [ ] 三条流（品牌/搜索/竞品）确实并行执行（不是串行等待）
- [ ] Level 依赖关系正确：L2 等 L1 完成，L3 等 L2 完成
- [ ] 竞品流缺失 competitors 时优雅跳过（不报错）

### 数据完整性
- [ ] ProbeOutput 的 14 个字段都有值（或明确标记为 None）
- [ ] citation_metrics.details 的条数和 query_terms 的条数一致
- [ ] source_authority.top_sources 的数据和 citation_analyzer 的输出能对上

### 搜索管道
- [ ] query_expander 输出正好 30 个查询词（或指定数量）
- [ ] fc_search 对每个查询词都返回了结果（成功/跳过/失败三种状态）
- [ ] ChatGPT 调用带了 web_search 工具（中转站模式）

---

## 三、Analyst 自检 (5项)

### 上下文构建
- [ ] build_context 的输出和 SYSTEM_PROMPT 中的字段名完全对应
- [ ] _build_user_message 的输出格式和 Few-Shot 示例的输入格式一致
- [ ] 数据表格的列名和 SYSTEM_PROMPT 中"数据扫描"步骤对应

### 诊断质量
- [ ] 输出的 actions 数量在 2-5 条之间
- [ ] 每个 action 有完整的 8 个字段（priority/action/rationale/expected_impact/target_metric/current_value/expected_value/action_steps）
- [ ] action_steps 至少 3 步，精确到平台名称
- [ ] rationale 是洞察（解释为什么），不是数据复述
- [ ] severity 判定符合规则 7 的条件（critical/warning/healthy）

---

## 四、DAG 与路由自检 (3项)

- [ ] 新增节点在 dag.py 中正确注册（add_node + add_edge）
- [ ] 条件路由逻辑正确（当前：coordinator pass→END, retry→Commander, 最多2次）
- [ ] State TypedDict 包含了所有节点需要读写的字段

---

## 五、API 与配置自检 (3项)

- [ ] config.py 中的 API 端点和模型名正确
- [ ] 环境变量（OPENAI_API_KEY / DEEPSEEK_API_KEY）在调用前检查
- [ ] 中转站兼容性确认：tools 参数类型（function/custom，不是 web_search）

---

## 六、代码库维护自检 (4项)

- [ ] 本次任务是否新增/删除/重命名了 .py 文件？如果是，已更新 CODEBASE.md
- [ ] 本次任务是否改变了数据流（如新增工具、修改调用链）？如果是，已更新 CODEBASE.md 的数据流图
- [ ] 本次任务是否新增/修改了 Pydantic Model？如果是，已更新 CODEBASE.md 的数据模型表
- [ ] 本次任务是否改变了模块状态（如从mock变为真实实现）？如果是，已更新 CODEBASE.md 的状态速查

验证方法：对比 `git diff --name-only` 和 CODEBASE.md，确认新增/删除的文件都已反映。

---

## 交付格式

CHECKLIST 完成后，在回复中附带：

```
自检结果: X/8 代码质量 + X/6 Probe + X/5 Analyst + X/3 DAG + X/3 API + X/4 代码库 = XX/29
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 三、前端自检 (6项)

每次修改 page.tsx 或任何 scan-*.tsx 组件后，必须逐项验证：

### 9. 数据隔离
- [ ] Light 扫描报告（scan-result.tsx）显示的是 Light 数据，不是 Probe 数据
- [ ] 测试：先跑 Light 扫描 → 看报告 → 再跑 Probe → 回到 Light 报告页 → **数据仍是 Light 的**

### 10. 状态机完整性
- [ ] 所有 6 种 step（input/probe/analyst/doctor/dashboard/error）都能正常进入和退出
- [ ] sidebar 按钮在每种 step 下行为正确（locked/available/completed 三态）
- [ ] tier 检查没有被绕过（free 用户不能进 Analyst/Doctor）

### 11. localStorage 持久化
- [ ] 页面刷新后数据不丢失
- [ ] 不同 scanMode（light/full）的数据存在不同 key 下
- [ ] 旧 key 迁移逻辑还在（不能删）
- [ ] beforeunload 保护还在（不能删）

### 12. 组件复用
- [ ] 新组件不与现有组件功能重复
- [ ] 改组件前确认：是"修改现有"还是"新建"
- [ ] 新建组件命名遵循 `scan-[name].tsx` 格式

### 13. 视觉一致性
- [ ] inline style（不是 Tailwind class）
- [ ] 暗色主题色值正确：#0A0A0F / #131318 / 边框 rgba(255,255,255,0.04)
- [ ] Framer Motion 动画，不是 CSS animation/transition

### 14. 浏览器验证
- [ ] console 无红色报错
- [ ] 所有按钮可点击且有响应
- [ ] 锁定模块显示 mock 数据或升级提示（不是空白 div）

---

## ⚠️ 红牌规则

以下情况直接判定为 **交付不合格**，无需继续审查：
- 跳过 CHECKLIST 直接说"做好了"
- LLM 调用没有 try-except（裸异常会崩整个管道）
- 输出没有 Pydantic Model 验证（脏数据会污染下游）
- Probe 某模块失败导致整个管道崩溃（应该部分成功+标记）
- 修改了文件结构但没更新 CODEBASE.md
