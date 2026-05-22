# CODEBASE.md — CiteFlow 代码库地图
> 海老专用。接到任务后先看这个文件，知道去哪找代码。
> 更新：2026-05-13 API 端点上线（Auth/Probe/Analyst/Scan/Doctor）、认证模块（JWT+bcrypt+SQLite）、前端登录页

---

## 项目结构总览

```
~/Desktop/CiteFlow/
├── CLAUDE.md              ← Layer 0: 你的启动指令
├── CONTEXT.md             ← Layer 1: 架构+当前状态（必读）
├── CODEBASE.md            ← Layer 1.5: 你在读的这个文件（代码地图）
├── PROMPTS.md             ← Layer 2: Agent提示词（按需读对应节）
├── CHECKLIST.md           ← Layer 3: 交付前自检清单
├── DESIGN.md              ← 设计文档合集
├── DESIGN_SYSTEM.md       ← ★前端设计系统（色彩/字体/间距/动效，2026-05-11）
├── ANALYST_RULES.md       ← Analyst推理规则（14条）
├── citeflow_report.html   ← ★Probe报告HTML模板（暗色主题+9区块+骨架加载）
│
├── TASK_HALLUCINATION_FIX.md  ← ★幻觉修复任务（四层防御，待执行）
├── TASK_REPORT_RESTRUCTURE.md ← 报告改造任务（A/B/C分开展示，待执行）
├── TASK_MERGE_SEARCH_FLOWS.md ← 搜索流合并（已完成）
│
├── test_yeswelder_probe_output.json   ← YesWelder Probe输出样例
├── test_yeswelder_analyst_output.json ← YesWelder Analyst输出样例
│
├── api.py                 ← ★FastAPI 服务器（Probe/Analyst/Scan/Doctor/认证 七端点）
├── auth.py                ← ★认证工具（JWT + bcrypt密码哈希 + get_current_user依赖）
├── auth_db.py             ← ★用户数据库（SQLite: create_user + get_user_by_email）
├── citeflow.db            ← SQLite 数据库文件（自动生成）
├── frontend/              ← Next.js 16 前端
│   ├── app/page.tsx       ← Landing Page
│   └── app/scan/          ← 产品主页面（体检流程）
│
├── langgraph_app/         ← 核心代码目录
│   ├── state.py           ← 数据模型（所有Pydantic Model定义）
│   ├── dag.py             ← DAG拓扑（节点注册+边+条件路由）
│   ├── base_node.py       ← 公共harness（CircuitBreaker/NodeLogger/TokenTracker）
│   ├── config.py          ← API配置+行业基准数据+多引擎开关
│   ├── render_contract.py ← ★渲染契约（9区块→Model字段映射+必填/可选/fallback，2026-05-11）
│   ├── validators/
│   │   ├── validator.py   ← 通用节点输出验证器
│   │   └── render_validator.py ← ★渲染前数据校验器（2026-05-11）
│   ├── nodes/
│   │   ├── probe_node.py      ← ★最大文件 Probe管道编排（含多引擎流）
│   │   ├── analyst_node.py    ← ★第二大 Analyst诊断（14条规则）
│   │   └── ...                ← 其他节点（当前mock）
│   └── tools/
│       ├── brand_profiler.py    ← 品牌画像（4页并发爬取+inferred_*字段）
│       ├── query_expander.py    ← 种子词→查询词（三分类+Jaccard去重+模板池）
│       ├── fc_search.py         ← 搜索管道（GPT FC+多引擎+generate_a_queries）
│       ├── market_mirror.py     ← 市场镜像
│       ├── gap_analysis.py      ← 差距分析（双维度）
│       ├── citation_analyzer.py ← 引用率分析+维度打分矩阵+竞品引用提取
│       ├── company_scorer.py    ← 量化评分（5维度加权）
│       ├── ai_narrative.py      ← AI推荐话术生成
│       ├── source_authority.py  ← 引用源权威性评分
│       ├── competitor_query_gen.py ← 竞品查询词生成+搜索→合成答案
│       ├── analyst_context.py   ← ★ProbeOutput→LLM上下文瘦身
│       ├── knowledge_loader.py   ← ★知识注入（解析知识库→按规则提取→注入prompt）
│       ├── data_store.py         ← ★数据存储（SQLite宽表+历史查询+行业聚合）
│       └── engines/
│           ├── chatgpt_api.py   ← ChatGPT中转站调用（通用）
│           ├── serper_search.py ← Serper Google搜索
│           ├── search_utils.py  ← 搜索工具共享模块（search_serper+synthesize_answer）
│           └── ddg_search.py    ← DuckDuckGo搜索（已废弃）
```

---

## 关键函数位置速查

| 函数 | 文件 | 行号 |
|------|------|------|
| `_stream_competitor` | probe_node.py | ~885 |
| `_stream_multi_engine_search` | probe_node.py | ~968 |
| `_batch_analyze_comparisons` | probe_node.py | ~1181 |
| `_batch_cite_for_engine` | probe_node.py | ~1034 |
| `_analyze_comparison` | citation_analyzer.py | - |
| `analyze` | citation_analyzer.py | - |
| `_validate_dimension_scores` | citation_analyzer.py | ~83 |
| `_enforce_continuous_scores` | citation_analyzer.py | ~259 |
| `build_context` | analyst_context.py | ~21 |
| `_build_user_message` | analyst_node.py | ~598 |
| `search_multi_engine` | fc_search.py | ~307 |
| `_search_single_engine` | fc_search.py | ~337 |
| `generate_a_queries(product_keyword, config, industry="")` | fc_search.py | ~368 |
| `_fc_search_sync` | fc_search.py | ~185 |
| `map_industry_category` | brand_profiler.py | ~45 |
| `_extract_generic_product` | query_expander.py | ~179 |

---

## 数据流：一次完整调用经过哪些文件

```
用户输入(UserInput)
  │
  ▼
probe_node.py ─────────────────────────────────────────────
  ├─ brand_profiler.py     → BrandProfile
  ├─ query_expander.py     → 20-30个查询词（含category标签）
  ├─ 主搜索流 (B/C类查询):
  │   ├─ fc_search.py      → GPT FC搜索 → search_results
  │   ├─ market_mirror.py  → MarketPerception
  │   ├─ gap_analysis.py   → GapReport + CompanyEvaluation
  │   ├─ citation_analyzer.py → CitationMetrics（B/C类引用率）
  │   └─ source_authority.py → SourceAuthorityReport
  ├─ 多引擎流 (A类查询):
  │   ├─ fc_search.generate_a_queries(product_keyword, config, industry) → 每引擎独立10条A类查询
  │   │    └─ product_keyword 优先级: industry英文 > core_product英文 > 种子词提取
  │   ├─ fc_search._search_single_engine → FC搜索+Serper兜底
  │   └─ _batch_cite_for_engine → EngineResult ×3 → industry详情合并到citation_metrics.details
  ├─ 竞品流:
  │   ├─ competitor_query_gen.py → 竞品查询词+搜索+合成
  │   └─ _batch_analyze_comparisons → CompetitorResult ×15
  │        └─ comp_search_results 传入 citation_analyzer.analyze()
  │             └─ _analyze_comparison(search_results=...) 
  │                  ├─ _extract_mentioned_brands() 品牌检测（第1层）
  │                  ├─ Prompt 注入品牌存在信息（第3层）
  │                  └─ _validate_dimension_scores() 四层检查（第2层）
  │                       ├─ 检查1: quote为空 → nullify
  │                       ├─ 检查2: quote不在搜索结果中 → nullify
  │                       ├─ 检查3: quote过短 → nullify
  │                       └─ 检查4: 极端分数无比较表述 → nullify
  │                  └─ _enforce_continuous_scores() 跳过None, 0→15, 100→85（第4层）
  ├─ company_scorer.py     → CompanyScore
  └─ ai_narrative.py       → AINarrative
  │
  ▼ 输出: ProbeOutput（state.py定义）
  │
analyst_node.py ───────────────────────────────────────────
  ├─ analyst_context.py    → build_context() 瘦身ProbeOutput
  ├─ analyst_rules.py      → detect_rules() 9条规则检测
  ├─ knowledge_loader.py   → get_knowledge_for_rules() 动态提取知识
  ├─ data_store.py         → get_last_run() 查询历史数据
  ├─ analyst_briefing.py   → build_briefing() 组装user message（含知识+历史）
  ├─ SYSTEM_PROMPT         → 三层洞察法+推理规则14条+Few-Shot（含evidence_source）
  └─ call_api(DeepSeek)    → AnalystOutput（含evidence_source的处方）
```

---

## 关键数据模型（全在 state.py）

| 模型 | 用途 | 关键字段 |
|------|------|----------|
| ProbeOutput | Probe总输出 | brand_profile, market_perception, gap_report, citation_metrics, competitor_analysis, engine_results, company_score, ai_narrative, source_authority |
| AnalystOutput | Analyst总输出 | three_layer_chain, diagnosis, actions, competitor_gap, one_line_verdict, engine_comparison, b_class_perception, c_class_matrix |
| RankingItem | 维度打分单项 | brand, rank, score(Optional[int]), summary, source_quote, verified |
| EngineResult | 单引擎结果 | engine, queries, citation_rate, recommendation_rate, sources, raw_data |
| CompetitorResult | 竞品对比 | query, winner, reason, dimension_scores, dimension_win_count |
| DoctorOutput | Doctor总输出 | prescription, summary, knowledge_sources |
| PrescriptionItem | 单条处方 | priority, category, action, what_to_add, evidence, difficulty |

---

## 当前状态速查

| 模块 | 状态 | 备注 |
|------|------|------|
| Probe | ✅ 完成 | 9模块+并行架构+多引擎 |
| Analyst | ✅ 完成 | 三层洞察法+14条规则+B/C类分析 |
| 幻觉修复 | ✅ 完成 | 四层防御 + B/C类字段已落地（2026-05-08） |
| 行业查询修复 | ✅ 完成 | A类查询词注入industry + details合并（2026-05-10） |
| 知识注入 | ✅ 完成 | knowledge_loader解析知识库→规则映射→动态注入prompt（2026-05-10） |
| 数据存储 | ✅ 完成 | SQLite存储+历史查询+指标对比（2026-05-10） |
| 报告改造 | ✅ 完成 | citeflow_report.html（暗色主题+9区块+骨架加载，2026-05-11） |
| 渲染契约 | ✅ 完成 | render_contract.py + render_validator.py + 金数据测试 |
| 前端设计系统 | ✅ 完成 | DESIGN_SYSTEM.md |
| Doctor | ✅ 完成 | doctor_node.py + doctor_prompt.py + knowledge注入 |
| 用户认证 | ✅ 完成 | auth.py(JWT+bcrypt) + auth_db.py(SQLite) + 3端点 |
| API 服务器 | ✅ 完成 | api.py 7端点（auth×3 + probe + analyst + scan + doctor） |
| Commander | ⬜ mock | 待真实实现 |
| 5个执行Agent | ⬜ mock | 待替换 |

---

## 大小限制
硬上限 5KB。当前: ~4KB。
