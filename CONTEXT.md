# CiteFlow — 海老作战手册

> 更新 · 2026-05-24 下午（Landing page +为什么选择我们+使命；ai-crawlers开源已发布。Next：llms-txt → geo-knowledge → 部署上线）

---

## 项目身份
- **产品**: CiteFlow — 跨境出海 GEO AaaS 平台
- **定位**: 为中国跨境中小企业提供AI搜索可见度诊断系统
- **核心产品**: AI品牌体检（体检→诊断→开处方）
- **差异化**: 给处方不只给分数 / 每个结论有来源 / 专为中国跨境而生
- **目标客户**: 中国跨境出海中小企业（深圳/杭州/广州）

## 产品战略

### 核心决策
**三个独立节点：Probe → Analyst → Doctor，每个节点独立LLM调用。**

```
产品闭环：体检（Probe）→ 诊断（Analyst）→ 处方（Doctor）→ 用户执行 → 复查
```

### 三个产品模块
1. **Probe 侦察兵**（约3分钟）：三大类查询词×4大AI引擎并发扫描
   - 输出：各引擎引用率/推荐率、三分类引用率、AI描述原文、竞品对比
2. **Analyst 分析师**（约2分钟）：14条自研规则逐条检查，纯诊断
   - 输出：diagnosis / competitor_gap / one_line_verdict / engine_comparison
   - 不输出actions（处方由Doctor负责）
3. **Doctor 医师**（即时）：根据诊断结果 + 21篇论文知识库，生成处方
   - 知识注入：get_prescription_knowledge() 按处方类型匹配论文
   - 输出：P0/P1/P2任务清单，每条含 target_page / what_to_add / evidence / how_to_verify
   - 4类处方：技术优化 / 内容优化 / 权威建设 / 社区运营

### 三分类查询体系
- A类 = 引用率战场（行业通用查询）
- B类 = AI认知画像（品牌直接查询）
- C类 = 竞品胜负矩阵（竞品对比查询）

### 查询架构（2026-05-16 确定）
- DeepSeek统一生成30个查询词（A/B/C各10）
- A类 → 3引擎各跑同一套词（苹果对比）
- B/C类 → 只跑ChatGPT

### 三阶付费模型
- 阶梯购买：必须先买诊断才能买处方
- 策略：免费给"结论"，付费给"原因+处方"

### 付费等级（2026-05-16 确定）
```
Tier类型：free / probe / full（对齐后端JWT）

免费版（tier=free）：
  - Light扫描（4字段，30秒，基础数据）
  - 仪表盘显示：品牌健康卡、竞品对比图
  - 锁定：AI认知画像、引擎对比、认知差距、诊断摘要、处方

Probe版（tier=probe）：
  - Full扫描（8字段，3-5分钟，完整数据）
  - 仪表盘解锁：AI认知画像、引擎对比、认知差距
  - 仍锁定：诊断摘要、处方

Full版（tier=full）：
  - 全部解锁（未来开发）
```

## 团队角色（2026-05-20 升级）

| 角色 | 启动命令 | 原型 | 职责 |
|------|---------|------|------|
| **药老** | `yaolao` | Hermes | 产品战略+架构决策+TASK文件+审查+管线管理 |
| **海老** | `hailao` | Claude Code | 读TASK→写代码→自检→交付 |
| **玄老** | `xuanlao` | Hermes(独立profile) | GEO知识策展→维护knowledge/目录→支撑Doctor处方 |
| **风老** | `fenglao` | Hermes(独立profile) | 营销军师→内容策略+圈子渗透+开源推广+分销设计 |

三老 SOUL.md/CLAUDE.md 已升级（2026-05-20）：
- 药老：Product Manager 方法论 + Reality Checker 审查姿态
- 海老：Senior Developer 工匠信条 + Dev↔Self-QA Loop
- 玄老：Agentic Search Optimizer + Cross-Border E-Commerce 融合

## 前端架构（2026-05-16 重构）

### 状态机
```
Step类型：input / probe / dashboard / error

每个产品都是独立的step：
- 初步体检：input（子步骤：收集信息→扫描仓→报告生成）
- Probe侦察兵：probe（子步骤：简报回顾→侦察中→侦察报告）
- Analyst：独立step（未来）
- Doctor：独立step（未来）
- 仪表盘：dashboard（总览，显示所有产品的数据）
```

### 用户旅程
```
免费用户：
  注册 → 初步体检（input）→ 报告生成 → 仪表盘（dashboard）

Probe用户：
  仪表盘 → 升级弹窗 → 付费 → 简报室 → Full扫描 → Probe报告 → 仪表盘同步
```

### 侧边栏回调分离
```
onInputClick → 回到初步体检
onProbeClick → 进入Probe侦察兵
onAnalystClick → Analyst（未开发，弹升级）
onDoctorClick → Doctor（未开发，弹升级）
onUpgradeClick → 升级弹窗
onHomeClick → 回到仪表盘
```

### 仪表盘设计（公用，按tier解锁）
```
1. 品牌健康卡（显示）
2. 竞品对比折线图（显示）
3. AI认知画像（免费锁定/Probe解锁）
4. 引擎对比（免费锁定/Probe解锁）
5. 认知差距（免费锁定/Probe解锁）
6. 诊断摘要（锁定）← Analyst占位
7. 处方执行步骤（锁定）← Doctor占位
8. 体检进度
9. 付费能力预告/已解锁能力
```

### Probe侦察兵页面（3-tab）
```
step = "probe"
├── Tab 1: 简报回顾（briefingData）
├── Tab 2: 侦察中（ScanProbeLoading）
└── Tab 3: 侦察报告（ScanReport）
```

### 关键文件
```
app/(app)/scan/page.tsx — 状态机 + 扫描逻辑
components/scan-sidebar.tsx — 侧边栏
components/scan-dashboard.tsx — 仪表盘
components/scan-result.tsx — Light报告（精密卡尺模版）
components/scan-probe-report.tsx — Probe报告（8个section）
components/scan-probe-loading.tsx — Probe等待页（360秒模拟）
components/probe-briefing.tsx — 简报室（5步8字段）
components/scan-doctor-briefing.tsx — Doctor 简报（调/api/doctor）
components/scan-doctor-generating.tsx — Doctor 生成动画
components/scan-doctor-workshop.tsx — 处方工作室（新建，Phase 1）
components/upgrade-modal.tsx — 升级弹窗
components/locked-section.tsx — 锁定覆盖层
lib/storage.ts — Tier类型 + 辅助函数
```

## 后端状态

### 全部完成
- ✅ Phase 1 骨架搭建
- ✅ Phase 2 Probe 完成（10个模块）
- ✅ Phase 3 Analyst 完成（14条规则，纯诊断，不输出actions）
- ✅ Phase 4 Doctor 节点（独立prompt + 知识注入 + 处方输出）
- ✅ 认证系统（/api/auth/register + /api/auth/login + JWT）
- ✅ API端点：/api/probe, /api/analyst, /api/doctor, /api/scan, /api/auth/*

### 知识库检索（当前：规则映射 → 目标：RAG向量检索）

```
现状：
  knowledge_loader.py 读 GEO_ENGINE_KNOWLEDGE_BASE.md（旧文件26KB）
  → 硬编码 RULE_KNOWLEDGE_MAP（规则ID→章节标题）
  → 子串匹配 → 抽行 → 拼800 token字符串

目标：
  knowledge_loader.py 读 knowledge/ 目录
  → build_index.py 分块→embed→ChromaDB（一次性脚本）
  → Doctor调用时 embed(诊断文本) → 向量检索 top-K → 注入prompt

分块策略：一条策略=一个块（~110块），每块带元数据(category/industries/platforms/regions/confidence)
嵌入模型：ofox.io + text-embedding-3-small（1536维，已验证可用）
向量库：ChromaDB（pip install chromadb，轻量磁盘存储）
```

### 知识库管线（三老分工）

```
玄老：读论文/飞书 → 提取策略 → 写 knowledge/papers/paper_XXX.json
      格式：extracted_strategies 数组，每条含 what/why/how/evidence/applicable_to
海老：build_index.py 读 knowledge/ → 分块 → embed → 入 ChromaDB → 增量更新
药老：定分块粒度 + 元数据Schema + 检索逻辑
系统：Doctor 调用时 get_prescription_knowledge() → 自动向量检索 → 全自动
```

### API端点
| 端点 | 方法 | 功能 | 认证 |
|------|------|------|------|
| /api/profile | POST | 轻量品牌画像（只爬官网） | 无 |
| /api/probe | POST | 跑Probe体检 | 无 |
| /api/analyst | POST | 跑Analyst诊断 | 无 |
| /api/doctor | POST | 跑Doctor处方 | 无 |
| /api/scan | POST | 一键三步（Probe→Analyst→Doctor） | 可选JWT |
| /api/auth/register | POST | 注册 | 无 |
| /api/auth/login | POST | 登录 | 无 |
| /api/auth/me | GET | 当前用户 | 必须JWT |

## 开发路线图

### 已完成
```
✅ 登录页前端（/login）
✅ 后端认证API（SQLite + JWT）
✅ 前端接后端（登录表单调API）
✅ /scan 侧边栏 + 双模式入口 + 扫描仓动画
✅ /scan 报告展示（ScanResult 组件）
✅ Probe light 模式
✅ 状态机重构（6种step）
✅ 侧边栏回调分离
✅ 免费用户旅程（注册→体检→报告→仪表盘）
✅ Probe支路（升级→简报室→Full扫描→Probe报告→仪表盘同步）
```

### 当前任务
```
✅ Analyst 诊断报告4-Tab页面（scan-analyst-report.tsx）
✅ Doctor 处方工作室（scan-doctor-workshop.tsx, briefing→generating→report）
✅ 三老角色定义+SOUL.md升级
✅ GEO知识库目录搭建（knowledge/ 7个子目录）
✅ CiteFlow GEO Audit Framework v2.1（+AI爬虫完整UA列表+llms.txt标准+GEOFlow最佳实践）
✅ 方法论溯源：Corey Haines（MIT）+ 姚金刚 + GEOFlow（Apache 2.0）
✅ GitHub 开源仓库上线
✅ 记忆层修复（page.tsx: doctorPhase恢复+localStorage同步）
✅ 部署checklist（DEPLOYMENT_CHECKLIST.md）
⏳ 部署P0代码改动（auth_db.py DB_PATH + auth.py SECRET_KEY + api.py CORS）
⏳ 域名配置（citeflow.cn → Vercel + api.citeflow.cn → Railway）
⏳ 交互QA（游景峰进行中）
🚀 上线后 → v1.1 品牌档案库
```

### Doctor 处方工作室（最终形态）
Doctor 是用户持续交互的核心界面（不是一次性报告）：
- **方法论体系**：CiteFlow CITE 六大诊断维度（可发现性/结构化数据/内容力/身份力/信任力/社区力），21篇论文归类到6个维度
  - 前端预留方法论标签（"基于 CiteFlow CITE 六大维度 · 融合 N 项研究"）
  - 后端改造待玄老完成知识库 CITE 分类 + Doctor prompt 更新
- 顶部三卡片：A类引用率变化 / 已解决问题 / 处方版本历史（Phase 4）
- CTA：\"重新体检\"+\"基于当前状态重新生成处方\"
- 处方清单：进度条 + P0(红)/P1(黄)/P2(灰)三段分组 + 全字段展开（7字段）
- 处方历史：v1 → v2 → ...（Phase 4）
- Phase 1 今日启动：新建 scan-doctor-workshop.tsx，零水数据设计

### 待开发
```
❌ 品牌档案库（大工程，Word已放桌面）
❌ 闭环功能
❌ 管理后台（/admin）

处方工作室（Doctor 完整形态）：
  Phase 1: Doctor 独立运行 ─ TASK_DOCTOR_INDEPENDENT.md ⏳ 海老待执行
           三步UI流程（briefing→generating→report）+ 独立调/api/doctor
  Phase 2: 处方增强 ─ 进度条 + 可展开卡片 + P0/P1/P2分组 + 预期效果
           （前端组件已部分完成 scan-prescription-steps.tsx）
  Phase 3: 效果追踪 ─ 用户填执行后数据 → 对比前后引用率 → 标记已解决
  Phase 4: 处方历史 ─ v1→v2→...版本链 + 回滚查看
```

## 测试账号
- 邮箱：test@citeflow.com
- 密码：test1234（注意不是test123！test123只有7位不满足8位密码要求）
- 切换tier：localStorage cf_user.tier字段

## API 配置
- **开发启动**: `uvicorn api:app --reload --port 8000`
- **生产启动**: `gunicorn api:app -c gunicorn.conf.py`（4 workers, 600s timeout）
- **并发控制**: 全局信号量 max 5 并发扫描，超限返回 503
- **数据库**: SQLite WAL 模式 + busy_timeout=5000ms + 单连接复用
- **任务清理**: 每 5 分钟自动清理超过 30 分钟的过期扫描任务
- ChatGPT 中转站: api.ofox.ai/v1, Model: openai/gpt-4o
- DeepSeek: api.deepseek.com/v1, Model: deepseek-chat
- Gemini: api.ofox.ai/v1, Model: gemini-3.1-flash-lite-preview
- Haiku: api.ofox.ai/v1, Model: anthropic/claude-haiku-4.5
- Embedding: api.ofox.io/v1, Model: text-embedding-3-small（1536维，已验证）
- 联网搜索: Serper Google Search API
- 所有 ofox 引擎共用一个 API Key（_OFOX_API_KEY）
- 注意：聊天/嵌入用不同域名（.ai vs .io）

## 大小限制
硬上限 8KB。当前: ~8.5KB（略超，下次清理）。

## 2026-05-24 凌晨状态

### Landing Page（已全面改版，待commit）
- Hero: H1 "AI不推荐你≠产品不好"，聊天气泡版poster，删tag/浮层/ugreen
- 导航: 居中三段式，锚点链接(工作流/方法论/定价)，goToScan智能跳转
- 工作流: "从扫描到优化，一次闭环"，三步文案重写
- 方法论: 六大维度①-⑥，"开源可审计"标签
- Social Proof: ChatGPT/Gemini/Claude·3引擎·6维度·可追溯
- 定价: ¥0/¥100两档，删企业版
- CTA: "注册免费体验"

### 代码改动（已改，待commit）
- page.tsx: 记忆层修复（doctorPhase恢复+localStorage同步）
- auth_db.py: DB_PATH→os.environ.get
- auth.py: SECRET_KEY→os.environ.get
- api.py: CORS→os.environ.get("CORS_ORIGINS").split(",")
- doctor_prompt.py: 四维→六维
- knowledge_loader.py: 四维→六维
- citeflow-geo-audit-framework.md: v2.1.0（六维+完整AI爬虫列表）
- knowledge/geoflow-practices.md: GEOFlow最佳实践提取（新建）
- knowledge/templates/llms-txt-template.md: llms.txt模板（新建）

### 已发现但未修的Bug
- Probe full模式A类查询词引用率0%：bc_query_strs在full模式只含B/C类，_stream_cite用B/C搜索结果检查A类
- 修复方案：probe_node.py L222 bc_query_strs=expanded_query_strs（一行改）

### 今天进展（2026-05-24）
- ✅ Landing page 新增「为什么选择我们」+「使命」两个 section
- ✅ ai-crawlers 开源 repo 发布（github.com/fong-foo/ai-crawlers）
- ⏳ llms-txt repo 待发布
- ⏳ geo-knowledge repo 待发布
- ⏳ 部署上线（Railway+Vercel+citeflow.cn）
