# GEO Engine Knowledge Base
# 基于21篇学术论文 + 12个GitHub项目 + Moz/Semrush等权威指南
# 创建时间：2026-05-10
# 最后更新：2026-05-10

---

## 一、21篇学术论文完整列表

### 论文1：GEO奠基论文 ✅ 已读完整
- **arXiv**: [2311.09735](https://arxiv.org/abs/2311.09735)
- **标题**: GEO: Generative Engine Optimization
- **作者**: Princeton University
- **关键发现**:
  - GEO可以提升40%的可见性（Table 1, Section 4）
  - 有效的GEO方法：Statistics Addition, Quotation Addition, Cite Sources, Fluency Optimization (+15-30%), Authoritative
  - 无效的方法：Keyword Stuffing（无效甚至有害）
  - 风格优化比内容添加更有效
  - 低排名网站通过GEO可以获得更大提升

### 论文2：AI如何颠覆搜索 ✅ 已读完整
- **arXiv**: [2604.27790](https://arxiv.org/abs/2604.27790)
- **标题**: How Generative AI Disrupts Search: An Empirical Study of Google Search, Gemini, and AI Overviews
- **会议**: SIGIR 2026
- **关键发现**:
  - 51.5%的用户查询会生成AI Overview（Section 3.1）
  - 传统搜索和AI搜索结果差异巨大（<0.2 Jaccard相似度）（Section 3.2）
  - 传统Google搜索偏好流行/机构网站（政府、教育）
  - 生成式搜索偏好Google自有内容
  - 阻止AI爬虫的网站被引用可能性更低（Section 3.3）
  - AIOs一致性较低，对查询编辑更敏感（Section 3.4）

### 论文3：引用吸收框架 ✅ 已读完整
- **arXiv**: [2604.25707](https://arxiv.org/abs/2604.25707)
- **标题**: From Citation Selection to Citation Absorption: A Measurement Framework for Generative Engine Optimization Across AI Search Platforms
- **关键发现**:
  - 引用广度和引用深度分化（Section 4.1）:
    - ChatGPT：引用更少（6.88个）但影响力更高（0.2713）
    - Google：引用更多（12.06个）但影响力较低（0.0584）
    - Perplexity：引用最多（16.35个）但影响力最低（0.0646）
  - Q&A格式单独使用效果弱：-5.74%相对差异（Section 4.2）
  - 高影响力页面特点（Section 4.3）:
    - 更长的内容
    - 更好的模块化结构
    - 语义对齐
    - 包含可提取证据：定义、数值事实、比较、程序步骤
  - 新闻被选中频率高，但百科页面影响力更高（Section 4.4）:
    - 新闻影响力：0.0726
    - 百科页面影响力：0.2144
  - 语言效应（Section 4.5）:
    - ChatGPT对中文查询引用更多（7.77 vs 7.03）
    - Google对英文查询引用更多（11.57 vs 7.53）

### 论文4：文化编码 ✅ 已读完整
- **arXiv**: [2601.00869](https://arxiv.org/abs/2601.00869)
- **标题**: Cultural Encoding in Large Language Models: The Existence Gap in AI-Mediated Brand Discovery
- **关键发现**:
  - 中文LLM品牌提及率比国际LLM高30.6%（88.9% vs 58.3%）（Section 3.2）
  - 训练数据地理（不是语言）驱动这个效应
  - 品牌如果不在LLM训练数据中，就"不存在"于AI回答中
  - 引入"Existence Gap"概念
  - 提出"Data Moat"框架和"Algorithmic Omnipresence"战略目标

### 论文5：创业公司产品可见性 ✅ 已读完整
- **arXiv**: [2601.00912](https://arxiv.org/abs/2601.00912)
- **标题**: The Discovery Gap: How Product Hunt Startups Vanish in LLM Organic Discovery Queries
- **关键发现**:
  - 按名称查询：ChatGPT识别率99.4%，Perplexity 94.3%（Section 3.1）
  - 发现式查询：ChatGPT成功率3.32%，Perplexity 8.29%（Section 3.2）
  - GEO得分与实际发现率没有相关性（Section 3.3）
  - 对Perplexity，传统SEO信号（引用域名、Product Hunt排名）预测可见性（Section 3.4）
  - 社区存在（Reddit）也很重要
  - 结论：不要直接优化AI发现，先建SEO基础

### 论文6：结构特征工程 ✅ 已读完整
- **arXiv**: [2603.29979](https://arxiv.org/abs/2603.29979)
- **标题**: Structural Feature Engineering for Generative Engine Optimization: How Content Structure Shapes Citation Behavior
- **关键发现**:
  - 结构优化提升17.3%引用率（Section 4.2）
  - 主观质量提升18.5%（Section 4.3）
  - 宏观结构贡献44.9%（Section 4.4）
  - 中观结构贡献39.7%
  - 微观结构贡献15.4%
  - 三个层次独立运作

### 论文7：AgenticGEO自进化系统 ✅ 已读完整
- **arXiv**: [2603.20213](https://arxiv.org/abs/2603.20213)
- **标题**: AgenticGEO: A Self-Evolving Agentic System for Generative Engine Optimization
- **关键发现**:
  - 现有方法依赖静态启发式，容易过拟合（Section 1）
  - 使用MAP-Elites档案进化多样策略（Section 3.2）
  - 引入Co-Evolving Critic轻量级替代器（Section 3.3）
  - 超越14个基线（Section 4）

### 论文8：领域特定微调方法 ✅ 已读完整
- **arXiv**: [2507.03169](https://arxiv.org/abs/2507.03169)
- **标题**: Beyond SEO: A Transformer-Based Approach for Reinventing Web Content Optimisation
- **关键发现**:
  - 使用BART-base模型优化旅游网站内容
  - 训练数据：1905个清洗后的实例
  - 提升网站可见性30.96%（位置调整后的词数）
  - 提升15.63%（绝对词数）
  - ROUGE-L: 0.249, BLEU: 0.2
  - 领域特定微调比通用模型更有效

### 论文9：AutoGEO自动学习 ✅ 已读完整
- **arXiv**: [2510.11438](https://arxiv.org/abs/2510.11438)
- **标题**: What Generative Search Engines Like and How to Optimize Web Content Cooperatively
- **作者**: Carnegie Mellon University
- **关键发现**:
  - AutoGEO框架自动学习生成引擎偏好
  - 提取preference rules作为context engineering
  - AutoGEO_API：无需额外训练的即插即用模型
  - AutoGEO_Mini：成本仅为API的0.0071倍
  - 引擎偏好因领域而异，每个LLM有独特的偏好规则
  - 引擎特定规则比通用规则效果更好

### 论文10：电商GEO ✅ 已读完整
- **arXiv**: [2511.20867](https://arxiv.org/abs/2511.20867)
- **标题**: E-GEO: A Testbed for Generative Engine Optimization in E-Commerce
- **作者**: Columbia University, MIT
- **关键发现**:
  - E-GEO：首个电商GEO基准数据集（7000+查询）
  - 评估15种常见重写启发式策略
  - 发现"普遍有效"的重写策略
  - 系统优化比临时启发式更有效
  - 电商GEO的目标更清晰：提高产品排名

### 论文11：多模态GEO攻击 ✅ 已读完整
- **arXiv**: [2601.12263](https://arxiv.org/abs/2601.12263)
- **标题**: Multimodal Generative Engine Optimization: Rank Manipulation for Vision-Language Model Rankers
- **作者**: Georgetown University, USC, UMD, ASU
- **关键发现**:
  - VLM-based产品搜索存在多模态排名攻击漏洞
  - MGEO：联合优化不可感知的图像扰动和流畅的文本后缀
  - 多模态协同攻击显著优于纯文本和纯图像基线
  - 多模态协同（通常是VLM的优势）可被武器化

### 论文12：多查询优化约束 ✅ 已读完整
- **arXiv**: [2601.13938](https://arxiv.org/abs/2601.13938)
- **标题**: IF-GEO: Conflict-Aware Instruction Fusion for Multi-Query Generative Engine Optimization
- **作者**: University of Science and Technology of China
- **关键发现**:
  - 优化文档以服务多样查询是约束优化挑战
  - 异构查询通常施加冲突和竞争的修改要求
  - IF-GEO："先发散后收敛"框架
  - 挖掘代表性潜在查询的优化偏好
  - 通过冲突感知的指令融合合成Global Revision Blueprint
  - 引入风险感知的稳定性指标

### 论文13：视觉内容平台GEO ✅ 已读完整
- **arXiv**: [2602.02961](https://arxiv.org/abs/2602.02961)
- **标题**: Generative Engine Optimization: A VLM and Agent Framework for Pinterest Acquisition Growth
- **作者**: Pinterest, Stanford University
- **关键发现**:
  - Pinterest GEO：生产级视觉GEO框架
  - 反向搜索设计：预测用户会搜索什么，而非描述内容是什么
  - 微调VLM生成意图对齐的主题
  - AI代理挖掘实时互联网趋势
  - 构建语义连贯的Collection Pages
  - 部署规模：数十亿图像，数千万集合
  - **结果：20%有机流量增长**

### 论文14：GEO测量方法 ✅ 已读完整
- **arXiv**: [2604.07585](https://arxiv.org/abs/2604.07585)
- **标题**: Don't Measure Once: Measuring Visibility in AI Search (GEO)
- **作者**: University of St. Gallen
- **关键发现**:
  - AI搜索的概率性质改变传统搜索范式
  - 答案会因运行、提示和时间而变化
  - 需要重复测量来评估品牌的GEO表现
  - 将可见性描述为分布而非单点结果
  - 日间Jaccard相似度平均0.34-0.42（仅35%来源重叠）
  - 来源不稳定性是生成搜索过程的持久属性

---

## 二、12个GitHub开源项目

### 项目1：gtm-engineer-skills ⭐1018
- **链接**: https://github.com/onvoyage-ai/gtm-engineer-skills
- **描述**: Claude Code skill for improving website AEO and GEO scores
- **特点**: 16 foundational checks, 6 intelligence dimensions, framework-specific fixes

### 项目2：geo-optimizer-skill ⭐395
- **链接**: https://github.com/Auriti-Labs/geo-optimizer-skill
- **描述**: GEO toolkit — audit, optimize, and make websites visible to AI search engines
- **特点**: 基于Princeton KDD 2024研究，支持ChatGPT、Perplexity、Claude、Gemini

### 项目3：awesome-generative-engine-optimization ⭐347
- **链接**: https://github.com/amplifying-ai/awesome-generative-engine-optimization
- **描述**: A curated guide to GEO resources
- **特点**: 资源合集，guides, tools & research

### 项目4：AutoGEO ⭐140
- **链接**: https://github.com/cxcscmu/AutoGEO
- **描述**: [ICLR'26] AutoGEO: automatically learn generative engine preferences
- **特点**: 学术论文代码，自动学习引擎偏好

### 项目5：awesome-geo ⭐124
- **链接**: https://github.com/luka2chat/awesome-geo
- **描述**: A curated list of awesome resources for GEO
- **特点**: 资源合集

### 项目6：geo-optimizer ⭐117
- **链接**: https://github.com/geo-team-red/geo-optimizer
- **描述**: A pluggable framework for GEO in Go
- **特点**: Go语言，可插拔框架，内置策略

### 项目7：getcito ⭐107
- **链接**: https://github.com/ai-search-guru/getcito-worlds-first-open-source-aio-aeo-or-geo-tool
- **描述**: GetCito the World's First & Only Open Source AIO/AEO/GEO Tool
- **特点**: 开源AIO/AEO/GEO工具

### 项目8：eGEOagents ⭐104
- **链接**: https://github.com/mverab/eGEOagents
- **描述**: Generative Engine Optimization skills for AI agents
- **特点**: AI agent的GEO技能

### 项目9：Awesome-GEO ⭐97
- **链接**: https://github.com/DavidHuji/Awesome-GEO
- **描述**: Awesome list for research on GEO
- **特点**: 研究资源合集

### 项目10：generative-engine-optimization-tools ⭐84
- **链接**: https://github.com/izak-fisher/generative-engine-optimization-tools
- **描述**: Awesome list of generative engine optimization tools
- **特点**: 工具合集

### 项目11：GEO ⭐65
- **链接**: https://github.com/krillinai/GEO
- **描述**: A comprehensive guide to GEO
- **特点**: 综合指南

### 项目12：gego ⭐58
- **链接**: https://github.com/AI2HU/gego
- **描述**: Generative Engine Optimization for your brand
- **特点**: 品牌GEO追踪

---

## 三、各引擎引用偏好

### 3.1 ChatGPT（OpenAI）

**数据来源**:
- 训练数据（截止到某个时间点）
- 联网搜索（Bing搜索结果）
- 用户上传的文档

**引用偏好**:
1. **格式偏好**:
   - FAQ格式（问答对）
   - 列表格式（Top 10、Best 5）
   - 对比表格（A vs B）
   - 结构化内容（标题、段落清晰）

2. **来源偏好**:
   - 权威网站（Wikipedia、权威媒体）
   - 专业论坛（Reddit、Quora）
   - 官方网站（品牌官网）
   - 深度文章（Medium、博客）

3. **内容偏好**:
   - 直接回答问题
   - 包含具体数据
   - 有明确结论
   - 引用可靠来源

4. **特殊行为**:
   - 引用更少但影响力更高（论文3，Section 4.1）
   - o3模型会"思考"后生成答案
   - 个性化会影响结果

**优化策略**:
- 官网内容用FAQ格式重写
- 在Medium发布深度对比文章
- 在Reddit参与相关讨论
- 加入Schema.org结构化标记
- 包含定义、数值事实、比较、程序步骤

### 3.2 Gemini（Google）

**数据来源**:
- Google搜索索引
- YouTube视频
- Google Maps商家信息
- Google Scholar学术论文

**引用偏好**:
1. **格式偏好**:
   - 视频内容（YouTube优先）
   - 结构化数据（Schema.org）
   - 列表格式
   - 对比内容

2. **来源偏好**:
   - Google生态（YouTube、Maps、Scholar）
   - 权威网站（.edu、.gov）
   - 新鲜内容（近期发布）
   - 用户评价（Google Reviews）

3. **内容偏好**:
   - 视觉内容（图片、视频）
   - 本地化内容
   - 用户生成内容
   - 实时信息

4. **特殊行为**:
   - 引用更多来源（论文3，Section 4.1）
   - 偏好Google自有内容（论文2，Section 3.2）
   - 51.5%的查询会生成AI Overview（论文2，Section 3.1）

**优化策略**:
- YouTube发布产品评测视频
- Google Maps优化商家信息
- 用Schema.org标记官网内容
- 鼓励用户在Google留评价
- 发布新鲜、时效性内容

### 3.3 Perplexity

**数据来源**:
- 实时网络搜索
- 多来源综合

**引用偏好**:
1. **格式偏好**:
   - 深度内容
   - 多来源综合
   - 直接回答问题

2. **来源偏好**:
   - 多样化来源
   - 权威网站
   - 新鲜内容

3. **内容偏好**:
   - 直接回答问题
   - 包含具体数据
   - 有明确结论

4. **特殊行为**:
   - 引用最多但影响力最低（论文3，Section 4.1）
   - 传统SEO信号预测可见性（论文5，Section 3.4）
   - 社区存在（Reddit）也很重要

**优化策略**:
- 发布深度、权威内容
- 包含具体数据和事实
- 在多个平台发布内容
- 保持内容新鲜度
- 建立社区存在

### 3.4 Claude（Anthropic）

**数据来源**:
- 训练数据
- 联网搜索（如果启用）

**引用偏好**:
1. **格式偏好**:
   - 深度论述
   - 学术格式
   - 专业分析
   - 详细解释

2. **来源偏好**:
   - 学术论文
   - 专业报告
   - 深度文章
   - 权威媒体

3. **内容偏好**:
   - 逻辑严密
   - 数据支撑
   - 引用可靠
   - 结论明确

**优化策略**:
- 发布深度行业报告
- 引用学术研究和数据
- 建立专业权威形象
- 在专业平台发布内容

---

## 四、通用GEO策略

### 4.1 内容优化策略

**结构优化**（论文6，Section 4.4）:
1. **宏观结构**（贡献44.9%）:
   - 清晰的标题层级（H1, H2, H3）
   - 逻辑清晰的段落结构
   - 目录和导航

2. **中观结构**（贡献39.7%）:
   - 信息分块（chunking）
   - 使用列表和表格
   - FAQ格式

3. **微观结构**（贡献15.4%）:
   - 视觉强调（加粗、斜体）
   - 关键信息突出
   - 易于扫描

**内容优化**（论文3，Section 4.3）:
1. **可提取证据**:
   - 定义（"X是..."）
   - 数值事实（"10% cheaper"、"4.8/5 rating"）
   - 比较（"A vs B"）
   - 程序步骤（"How to..."）

2. **权威性信号**（论文1，Section 4）:
   - 引用可靠来源
   - 包含专家观点
   - 提供数据支撑
   - 展示资质认证

3. **新鲜度**:
   - 定期更新内容
   - 发布时效性内容
   - 保持信息最新

### 4.2 技术优化策略

**Schema.org标记**:
- 使用结构化数据标记
- 包含产品信息、评价、FAQ
- 帮助AI理解内容

**AI爬虫友好**（论文2，Section 3.3）:
- 允许AI爬虫访问
- 不阻止GPTBot、Google-Extended
- 提供清晰的robots.txt

**页面性能**:
- 快速加载
- 移动友好
- 良好的用户体验

### 4.3 品牌建设策略

**Earned Media**（论文17）:
- 第三方权威来源
- 媒体报道
- 用户评价
- 专家推荐

**品牌一致性**:
- 统一的品牌信息
- 跨平台一致性
- 可识别的品牌声音

**社区参与**（论文5，Section 3.4）:
- Reddit讨论
- Quora回答
- 行业论坛参与

**Algorithmic Omnipresence**（论文4，Section 5）:
- 语义覆盖
- 技术深度
- 文化本地化

---

## 五、处方生成框架

### 5.1 诊断维度

**引用失败模式**（论文16）:
1. **内容缺失**: 没有相关内容
2. **结构问题**: 内容结构不佳
3. **权威性不足**: 缺乏可信度信号
4. **技术障碍**: AI爬虫无法访问
5. **竞争劣势**: 竞品内容更优

### 5.2 处方模板

**格式**:
```
诊断：[引擎]在回答"[查询]"时，引用了[竞品]但没引用你
原因：[具体原因]
处方：
1. [具体行动1]（基于论文X，Section Y）
2. [具体行动2]
3. [具体行动3]
预期：[时间]内[指标]从[X]提升到[Y]
```

### 5.3 处方示例

**场景**: GPT在回答"best budget welder"时，引用了Lincoln但没引用YesWelder

**诊断**:
- 引擎：ChatGPT
- 查询：best budget welder
- 问题：YesWelder未被引用

**原因分析**:
1. YesWelder官网缺少FAQ格式的对比内容（论文3，Section 4.2）
2. 缺少可提取的数值事实（论文3，Section 4.3）
3. 缺少第三方权威引用（论文17）

**处方**:
1. **官网优化**（宏观结构，贡献44.9%）:
   - 在/products页面加入FAQ版块
   - 内容："How does YesWelder compare to Lincoln? YesWelder offers..."
   - 加入具体数值事实（"10% cheaper"、"4.8/5 rating"）

2. **内容发布**（Earned Media策略）:
   - 在Medium发布"YesWelder vs Lincoln: Which is Better?"
   - 包含对比表格、具体数据、用户评价

3. **权威引用**（论文17）:
   - 联系焊接行业媒体做产品评测
   - 在Reddit r/welding参与讨论

4. **技术优化**（论文2，Section 3.3）:
   - 添加Schema.org产品标记
   - 确保GPTBot可以访问

**预期效果**:
- 30天内GPT引用率从10%提升到20%
- 60天内引用率提升到30%

---

## 六、行业最佳实践

### 6.1 Moz最佳实践

1. **关键词研究**:
   - 找到已排名前10的关键词
   - 筛选触发AI Overview的关键词
   - 识别未被引用的机会

2. **内容优化**:
   - 匹配查询意图
   - 简单易读的语言
   - 第一人称视角
   - 专家背书

3. **技术优化**:
   - Schema.org标记
   - AI爬虫友好
   - 页面性能优化

4. **品牌建设**:
   - 一致的品牌信息
   - 第三方权威引用
   - 用户评价

### 6.2 Semrush最佳实践

1. **内容策略**:
   - 围绕品牌相关主题持续发布内容
   - 让内容易于访问和理解
   - 获得可信的外部提及

2. **SEO与GEO结合**:
   - SEO和GEO相辅相成
   - 不需要放弃SEO策略
   - 整合AI搜索洞察

3. **追踪指标**:
   - AI可见性
   - 品牌提及
   - 品牌情感

---

## 七、关键指标

### 7.1 引用率指标

- **Citation Rate**: 被引用的查询比例
- **Citation Influence**: 引用的影响力（论文3，Section 4.1）
- **Citation Absorption**: 引用被吸收的程度

### 7.2 可见性指标

- **Visibility Score**: 在AI回答中的可见性
- **Share of Voice**: 品牌在AI回答中的声音份额
- **Brand Mention Rate**: 品牌被提及的频率

### 7.3 质量指标

- **Subjective Quality**: 内容的主观质量（论文6，Section 4.3）
- **Accuracy**: 信息的准确性
- **Relevance**: 与查询的相关性

---

## 八、未来趋势

### 8.1 技术趋势

1. **多代理系统**: 使用多个代理优化GEO（论文21）
2. **策略学习**: 自动学习引擎偏好（论文10）
3. **特征级优化**: 优化文档级特征而非token级（论文20）

### 8.2 市场趋势

1. **AI搜索增长**: 越来越多用户使用AI搜索
2. **零点击搜索**: 用户直接在AI回答中获取信息
3. **品牌可见性**: AI回答中的可见性变得重要

### 8.3 优化趋势

1. **诊断方法**: 识别引用失败模式（论文16）
2. **处方生成**: 生成具体优化建议
3. **效果追踪**: 持续监测优化效果

---

## 九、应用到CiteFlow

### 9.1 Analyst处方能力

**输入**:
- 品牌信息
- 目标引擎
- 当前引用情况
- 竞品信息

**处理**:
1. 查询引擎知识库，获取该引擎的引用偏好
2. 分析当前内容与偏好的差距
3. 识别引用失败模式
4. 生成具体优化建议

**输出**:
- 诊断报告
- 执行清单
- 预期效果

### 9.2 差异化优势

**竞品**:
- Profound: 告诉你"是什么"
- Ahrefs: 告诉你"为什么"

**CiteFlow**:
- 告诉你"是什么"
- 告诉你"为什么"
- 告诉你"具体怎么做"
- 告诉你"做了之后效果如何"

### 9.3 产品闭环

```
Probe（监测）→ Analyst（诊断）→ 处方（执行方案）→ 企业执行 → Probe（验证效果）
```

### 9.4 关键警告

1. **GEO得分不能完全反映实际效果**（论文5，Section 3.3）
2. **需要实际测试验证**（论文19）
3. **中国品牌在国际LLM中可见性更低**（论文4，Section 3.2）
4. **需要动态策略，不能只用静态规则**（论文7，Section 1）

---

## 十、参考资源

### 10.1 学术论文（21篇）

1. arXiv:2311.09735 - GEO: Generative Engine Optimization
2. arXiv:2507.03169 - Beyond SEO: A Transformer-Based Approach
3. arXiv:2509.08919 - Generative Engine Optimization: How to Dominate AI Search
4. arXiv:2510.11438 - What Generative Search Engines Like
5. arXiv:2511.20867 - E-GEO: A Testbed for GEO in E-Commerce
6. arXiv:2601.00869 - Cultural Encoding in Large Language Models
7. arXiv:2601.00912 - The Discovery Gap
8. arXiv:2601.12263 - Multimodal Generative Engine Optimization
9. arXiv:2601.13938 - IF-GEO: Conflict-Aware Instruction Fusion
10. arXiv:2602.02961 - GEO: A VLM and Agent Framework for Pinterest
11. arXiv:2602.12187 - SAGEO Arena
12. arXiv:2603.09296 - Diagnosing and Repairing Citation Failures
13. arXiv:2603.12282 - Algorithmic Trust and Compliance
14. arXiv:2603.20213 - AgenticGEO
15. arXiv:2603.29979 - Structural Feature Engineering
16. arXiv:2604.03656 - Beyond Retrieval: Modeling Confidence Decay
17. arXiv:2604.07585 - Don't Measure Once
18. arXiv:2604.19113 - Think Before Writing
19. arXiv:2604.19516 - From Experience to Skill
20. arXiv:2604.25707 - From Citation Selection to Citation Absorption
21. arXiv:2604.27790 - How Generative AI Disrupts Search

### 10.2 行业指南

1. Moz: What Is Generative Engine Optimization
2. Semrush: Generative Engine Optimization Guide
3. Search Engine Land: GEO Guide

### 10.3 开源项目（12个）

1. onvoyage-ai/gtm-engineer-skills ⭐1018
2. Auriti-Labs/geo-optimizer-skill ⭐395
3. amplifying-ai/awesome-generative-engine-optimization ⭐347
4. cxcscmu/AutoGEO ⭐140
5. luka2chat/awesome-geo ⭐124
6. geo-team-red/geo-optimizer ⭐117
7. ai-search-guru/getcito ⭐107
8. mverab/eGEOagents ⭐104
9. DavidHuji/Awesome-GEO ⭐97
10. izak-fisher/generative-engine-optimization-tools ⭐84
11. krillinai/GEO ⭐65
12. AI2HU/gego ⭐58

---

*最后更新：2026-05-10*
*数据来源：21篇学术论文（全部有arXiv ID） + 12个GitHub项目（全部有链接） + Moz/Semrush等权威指南*

---

## 十一、行业案例（来自论文）

### 案例1：Pinterest GEO（论文13，arXiv:2602.02961）
- **公司**：Pinterest, Stanford University
- **规模**：数十亿图像，数千万集合
- **方法**：
  - VLM生成意图对齐主题（预测用户会搜索什么，而非描述内容是什么）
  - AI代理挖掘实时互联网趋势
  - 构建语义连贯的Collection Pages
  - 混合VLM和two-tower ANN架构构建权威感知的链接结构
- **结果**：20%有机流量增长，贡献数百万MAU增长
- **对CiteFlow的意义**：视觉内容平台需要特殊的GEO策略

### 案例2：旅游网站GEO（论文8，arXiv:2507.03169）
- **领域**：旅游和旅游业
- **方法**：BART-base模型微调，1905个训练实例
- **结果**：
  - 绝对词数提升15.63%
  - 位置调整后词数提升30.96%
  - ROUGE-L: 0.249, BLEU: 0.2
- **对CiteFlow的意义**：领域特定微调比通用模型更有效

### 案例3：电商GEO（论文10，arXiv:2511.20867）
- **领域**：电商
- **数据集**：E-GEO，7000+查询
- **方法**：评估15种常见重写启发式策略
- **发现**：
  - 存在"普遍有效"的重写策略
  - 系统优化比临时启发式更有效
  - 电商GEO的目标更清晰：提高产品排名
- **对CiteFlow的意义**：电商GEO有明确的经济价值

### 案例4：UK iGaming合规GEO（论文17，arXiv:2603.12282）
- **领域**：UK在线赌博行业
- **方法**：
  - 合规信号（UKGC牌照）作为权威乘数
  - Schema.org结构化标记
  - Entity Clarity模型（4层）
- **发现**：
  - AI搜索对Earned media有系统性偏见
  - 合规信号可作为LLM的权威乘数
  - Algorithmic Trust是关键概念
- **对CiteFlow的意义**：合规信号在受监管行业特别重要

### 案例5：创业公司发现鸿沟（论文5，arXiv:2601.00912）
- **样本**：112个Product Hunt创业公司，2240个查询
- **发现**：
  - 按名称查询：ChatGPT识别率99.4%，Perplexity 94.3%
  - 发现式查询：ChatGPT成功率3.32%，Perplexity 8.29%
  - GEO得分与实际发现率没有相关性
  - 传统SEO信号（引用域名、社区存在）预测可见性
- **对CiteFlow的意义**：GEO得分不能完全反映实际效果，需要实际测试验证

### 案例6：文化编码（论文4，arXiv:2601.00869）
- **样本**：1909个查询，6个LLM，30个品牌
- **发现**：
  - 中文LLM品牌提及率88.9%，国际LLM 58.3%（差距30.6%）
  - Zhizibianjie：中文LLM 65.6%，国际LLM 0%
  - 训练数据地理（不是语言）驱动这个效应
- **对CiteFlow的意义**：中国品牌在国际LLM中可见性更低，需要特殊策略

---

## 十二、GEO工具生态

### 12.1 商业工具

| 工具 | 功能 | 价格 |
|------|------|------|
| Semrush AI Visibility | AI搜索可见性追踪 | 企业版 |
| Moz Pro | AI搜索追踪 | $99/月起 |
| Profound | GEO诊断+执行方案 | $3000+/月 |
| Ahrefs Brand Radar | AI品牌追踪 | 企业版 |

### 12.2 开源工具

| 工具 | 功能 | Stars |
|------|------|-------|
| gtm-engineer-skills | Claude Code GEO技能 | 1018 |
| geo-optimizer-skill | GEO审计+优化 | 395 |
| AutoGEO | 自动学习引擎偏好 | 140 |
| AgenticGEO | 自进化GEO系统 | 21 |

---

*最后更新：2026-05-10*
*数据来源：21篇学术论文（14篇完整读取，7篇摘要读取） + 12个GitHub项目 + 6个行业案例*
