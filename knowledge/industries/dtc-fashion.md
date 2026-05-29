# DTC时尚行业GEO策略
- **适用**: 独立站服饰/鞋履/配饰品牌
- **典型客户**: 类似Shein、Cider、Halara的中国跨境时尚品牌
- **最后更新**: 2026-05-20

## 行业特殊性
- **视觉驱动**: 图片和视频是核心决策依据，但AI目前以文本为主 → 需要将视觉优势翻译为文本信号
- **品类查询多**: "best summer dress for petite"、"affordable workout leggings" → 场景化+形容词密集
- **评价权重高**: 时尚决策严重依赖他人评价和"上身效果"
- **社交媒体是流量源泉**: TikTok/Instagram驱动发现 → 需要转化为AI可引用的信号

## 核心策略

### 1. 产品页面优化（每个SKU）
- 尺码指南做成FAQ格式："What size should I order if I'm 5'4 and 130lbs?"
- 面料和工艺信息转换为数值事实："Fabric: 95% organic cotton, 5% spandex. 180 GSM weight."
- 对比信息："vs [竞品品牌] similar dress: ours has pockets, theirs doesn't"
- 用户评价高亮摘录："'Wore this to a wedding, got 5 compliments' — Sarah, Verified Buyer"

### 2. 搭配/场景化内容
- 创建"Complete the Look"内容块，搭配不同产品 → 提升关联查询覆盖
- 使用场景关键词："What to wear to a summer wedding guest"、"Business casual outfits under $100"
- 每套搭配包含：场合 + 单品清单 + 价格总计 + 替代方案

### 3. 社区存在
- Reddit: r/femalefashionadvice, r/malefashionadvice, r/FrugalFemaleFashion
- 做"honest review"帖子而非推广
- TikTok创作者合作 → YouTube搬运（Gemini引用YouTube）

### 4. 技术优化
- 所有产品图片有描述性alt文本（不仅是"dress"，而是"red midi wrap dress with flutter sleeves front and back view"）
- Product Schema含price、availability、color、size
- 评价标记用AggregateRating Schema
