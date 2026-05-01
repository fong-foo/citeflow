# CiteFlow — 海老作战手册
> Gen5 架构定义完成 · Phase 1 已完成 · 2026-05-01

---

## 项目身份
- **产品**: CiteFlow — 跨境出海 GEO AaaS 平台
- **定位**: 不拼发文量，只拼 AI 引用率（Citation Lift）
- **差异化**: 8-Agent 铁军实现「监测→诊断→优化→归因」全闭环
- **目标客户**: 出海 SaaS/B2B 企业、跨境支付、DTC 品牌独立站

## 当前状态
- **阶段**: Phase 2 Probe 开发完成（2026-05-01）
- **当前任务**: 等待 API Key 配置 → 真实数据测试 → 继续开发其他节点
- **Probe 状态**: 代码完成，6个工具文件，NODE_MODE="react"，API Key 为空时降级 mock
- **已有代码**: 29 个 .py 文件（9 节点 + state.py + dag.py + base_node.py + validator.py + 6个工具文件 + 测试）
- **项目位置**: ~/Desktop/CiteFlow/
- **Python 环境**: 3.11.15 + .venv（langgraph/fastapi/pydantic/httpx 已安装）

---

## 三层架构（舱室 / 接口 / 走廊）

```
走廊层（共享智能）：
  State（黑板）+ Coordinator（车间主任）
  · 车间主任扫黑板 → 比对一致性 → 裁决冲突
  · 纯规则引擎，不依赖 LLM

接口层（协作协议）：
  输入口 Pydantic Model ← 上游输出格式
  输出口 Pydantic Model → 下游输入格式
  Validator（质检员）→ 出厂前检查，合格才写黑板

舱室层（纯自治）：
  Agent + 工具箱 + ReAct 循环（上限10步）+ 保险丝（3次熔断）
  · 不知道其他 Agent 存在，只管自己的活
```

## 9 个节点 = 8 个 Agent + 1 规则引擎

| 节点 | 模式 | 输入 | 输出 | 工具 |
|------|------|------|------|------|
| ① Probe（侦察兵） | ReAct | user_input | ProbeOutput（citations[], engines, queries） | AI引擎API |
| ② Analyst（军师） | ReAct | ProbeOutput | AnalystOutput（wilson_scores[], issues[], recs） | Wilson Score计算器 |
| ③ Commander（统帅） | P&E | AnalystOutput + 权重 | CommanderPlan（tasks[]，含agent/priority/payload） | 行业权重矩阵 |
| ④ Entity（身份特工） | ReAct | CommanderPlan agent=entity | EntityResult（wikidata_changes[]） | Wikidata API |
| ⑤ Architect（结构大师） | ReAct | CommanderPlan agent=architect | ArchitectResult（schema_injections[]） | Schema.org生成器 |
| ⑥ Outreach（寄生者） | ReAct | CommanderPlan agent=outreach | OutreachResult（platform_submissions[]） | G2/Trustpilot |
| ⑦ Content（内容特工） | ReAct | CommanderPlan agent=content | ContentResult（videos/articles/faqs[]） | 内容生成+分发 |
| ⑧ Community（社区特工） | ReAct | CommanderPlan agent=community | CommunityResult（reddit/quora/forum[]） | 社区平台API |
| ⑨ Coordinator（车间主任） | 规则引擎 | 五个Result | CoordinatorReport（consistency_score, conflicts[]） | 无 |

## DAG 拓扑

```
START
  → Probe(user_input) → [Validator] → 写黑板
  → Analyst(probe_output) → [Validator] → 写黑板
  → Commander(analyst_output) → [Validator] → 写黑板
       → dispatch（并行）
         ├→ Entity(tasks) → [Validator] → 写黑板 ──┐
         ├→ Architect(tasks) → [Validator] → 写黑板 ┤
         ├→ Outreach(tasks) → [Validator] → 写黑板 ┤
         ├→ Content(tasks) → [Validator] → 写黑板  ┤
         └→ Community(tasks) → [Validator] → 写黑板 ─┘
              ↓ (五个全跑完 或 超时)
       → [Coordinator]
              ├→ PASS → 写报告 → END
              └→ FAIL(大冲突) → 打回 Commander（≤2次）
                                  → 超过2次 → 报警游景峰
```

## 三层协作机制

1. **数据契约层**: State 是 Pydantic Model，Probe 输出结构 = Analyst 输入结构，协作编码在 Schema 里
2. **语义框架层**: Prompt 告诉 Agent "你在这个链条里的位置"和"你的产出会被谁用"
3. **验证执法层**: Validator 把"下游需要什么"编码成检查规则，Agent 不需要主动协作

## 节点设计五决定

1. **复杂度**: 带工具的节点（50-100行），不选极简也不选带策略
2. **内部状态**: 无状态，每次从头开始，重试成本低
3. **进度报告**: 写中间状态到 State status 字段，Dashboard 实时可见
4. **工具失败**: 核心工具挂→熔断，可选工具挂→降级继续
5. **可测试性**: 纯函数，mock 环境下确定性输出

## 铁律四条

1. Agent 之间不直接对话，只通过 State 读写
2. 每个 Agent 只写自己的 key，不越界
3. 异常不抛给邻居，自己处理，失败写走廊
4. 插新 Agent 不改已有代码——走廊加 key + dag.py 加节点

## Validator vs Coordinator

- **Validator（质检员）**: 属于舱室，检查单个 Agent 产出，不合格→重试≤3次→熔断
- **Coordinator（车间主任）**: 属于走廊，扫黑板比对所有产出，小冲突自己修，大冲突打回 Commander
- Validator = 出厂质检，Coordinator = 总装质检

---

## 13 个架构缺口

### 致命级（不做就垮）
1. **提示词架构** — 每个节点的 prompt 模板、输出格式约束、重试 prompt 调整、few-shot
2. **上下文工程** — 每个节点塞什么进 prompt、token 预算、数据过滤规则
3. **错误分类** — 什么错误重试、什么错误熔断、重试 prompt 怎么改

### 严重级（不做会出大问题）
4. **Token 成本控制** — 每节点 token 上限、Pro vs Flash 选择、成本报警
5. **持久化策略** — State 哪些存 Supabase、哪些临时、序列化方式
6. **并发控制** — 多用户同时触发、State 隔离、队列管理
7. **API 层设计** — FastAPI endpoint、前端调后端方式、管线启动/取消/重试
8. **实时通信** — WebSocket/SSE、status 推送到 Dashboard、作战日志逐行出现
9. **管线生命周期** — 触发方式、结果存储、管线级重试、用户取消处理

### 重要级（不做影响质量）
10. **可观测性** — 结构化日志、指标采集、告警阈值
11. **测试策略** — 单元测试、集成测试、mock 数据管理、覆盖率要求
12. **安全** — prompt injection 防护、工具权限、API key 管理
13. **人工介入** — 什么情况停下来找人、审批流程、干预后恢复

**全部打完红圈 = 架构无盲区 = 可以写代码**

---

## 行业权重

| 行业 | 结构 | 信任 | 身份 | GEO路线 |
|------|------|------|------|---------|
| B2B SaaS | 0.40 | 0.25 | 0.35 | Identity→Structure→Trust |
| 跨境支付 | 0.25 | 0.45 | 0.30 | Trust→Identity→Structure |
| DTC 品牌 | 0.35 | 0.35 | 0.30 | Structure→Trust→Identity |

## 故障隔离

- 原则1: 错误不传播 — Agent 内部异常不抛给其他舱室
- 原则2: 熔断不停机 — 一个舱熔断，走廊继续跑
- 原则3: 失败可审计 — 走廊上写失败记录，不丢数据

---

## 目录结构

```
langgraph_app/
├── state.py              ← 走廊黑板 Pydantic State Model
├── dag.py                ← DAG 拓扑定义
├── base_node.py          ← 公共 harness（熔断器/日志/Token追踪）
├── nodes/                ← 9 个节点
│   ├── probe_node.py     ← ✅ Phase 2 真实实现（react模式）
│   ├── analyst_node.py   ← mock
│   ├── commander_node.py ← mock
│   ├── entity_node.py    ← mock
│   ├── architect_node.py ← mock
│   ├── outreach_node.py  ← mock
│   ├── content_node.py   ← mock
│   ├── community_node.py ← mock
│   └── coordinator_node.py ← 规则引擎（部分实现）
├── validators/
│   └── validator.py      ← 质检员
└── tools/                ← 各 Agent 工具箱
    ├── query_expander.py     ← 查询扩展（LLM）
    ├── engines/
    │   ├── perplexity_client.py  ← Perplexity API
    │   └── chatgpt_client.py     ← ChatGPT API
    ├── extractors/
    │   └── citation_extractor.py ← 引用提取
    ├── classifiers/
    │   └── citation_classifier.py ← 引用分类（LLM）
    └── analyzers/
        └── competitor_analyzer.py ← 竞品对比
```

## 开发纪律

Phase 1 ✅: 定数据契约 → 搭骨架 → 插 mock → 端到端跑通假数据
Phase 2 ✅: 换 Probe 为真实实现（Perplexity + ChatGPT）
Phase 3 ⬜: 换 Analyst
Phase 4 ⬜: 换 Commander
Phase 5 ⬜: 换 Entity / Architect / Outreach / Content / Community 逐个替换

**在任何 Agent 有真实功能之前，整条管线必须先用 mock 跑通。**

---

## 技术栈
- Agent 编排: LangGraph (Python) — P&E 主控 + ReAct 执行
- 后端: FastAPI + Python 3.11
- 前端: Next.js + React + TypeScript (Vercel)
- 数据: Supabase (PostgreSQL + Auth + Vector + Storage)
- AI 模型: DeepSeek V4 Pro (Agent) + V4 Flash (Validator)

## 三人协作
- **游景峰**: 定方向、做 Go/No-Go 决策
- **药老 (Hermes)**: 架构决策 + Agent 提示词 + CHECKLIST.md 维护。不审查代码。
- **海老 (Claude Code)**: 写代码、修 bug、部署、交付前跑 CHECKLIST.md 自检

流程: 游景峰→药老(架构+提示词)→海老(代码+自检)→游景峰验收

---

## 不在此文件的内容
| 找什么 | 去哪个文件 |
|--------|-----------|
| Agent 提示词 | PROMPTS.md |
| 交付自检清单 | CHECKLIST.md |
| 前端视觉设计 + 全部架构图 | WarLog.html |
| 定价与积分逻辑 | PROMPTS.md (Commander 提示词内) |
| 当前 Bug 清单 | BUGLIST.md |
| 架构缺口跟踪 | WarLog.html → 架构缺口 Tab |

## 大小限制
硬上限 8KB。每次结构变化时更新此文件，主动删除过时内容。
当前: 接近上限，下次更新需精简。
