# 技术优化处方模板：Schema标记 + AI爬虫友好
- **用途**: 改善AI引擎对网站内容的理解和抓取
- **来源**: 论文2(Section 3.3) + 论文6 + GEOFlow最佳实践（Apache 2.0）
- **处方类型**: 技术优化
- **预期效果**: 避免因技术障碍丢失AI引用机会
- **难度**: 低（一次性设置）
- **适用**: 所有网站、所有行业、所有地区

> 补充来源：https://github.com/yaojingang/GEOFlow（Apache 2.0 License）的AI爬虫UA列表

## 第一步：robots.txt 放行AI爬虫

在网站根目录的 robots.txt 中确保以下内容：

```
# ===== LLM训练 / AI搜索爬虫（必须放行）=====
User-agent: GPTBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: oai-searchbot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-Web
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-Chat
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: CCBot
Allow: /
User-agent: meta-externalagent
Allow: /
User-agent: meta-externalfetcher
Allow: /
User-agent: cohere-ai
Allow: /
User-agent: Bytespider
Allow: /

# ===== 搜索引擎爬虫 =====
User-agent: Googlebot
Allow: /
User-agent: Bingbot
Allow: /
User-agent: DuckDuckBot
Allow: /
```

### 为什么需要放行这么多Bot？
不同的AI搜索引擎使用不同的爬虫来收集训练数据和RAG检索内容：
- **GPTBot/ChatGPT-User/oai-searchbot** → OpenAI（ChatGPT + SearchGPT）
- **ClaudeBot/Claude-Web/anthropic-ai** → Anthropic（Claude）
- **PerplexityBot** → Perplexity AI 搜索引擎
- **Google-Extended** → Google（Gemini训练数据）
- **CCBot** → Common Crawl（LLM训练数据的关键来源）
- **meta-externalagent** → Meta（LLaMA训练数据）
- **cohere-ai** → Cohere
- **Bytespider** → ByteDance（豆包训练数据）

### 验证方法
1. 在浏览器访问 https://你的域名.com/robots.txt，确认以上内容存在
2. 用 Google Search Console 检查 robots.txt 是否有语法错误
3. 检查是否同时存在 `llms.txt`（见 llms-txt-template.md）

---

## 第二步：添加 Schema.org 结构化标记

### Product Schema（产品页面用）
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "你的产品名",
  "description": "产品简短描述（50-160字）",
  "brand": {
    "@type": "Brand",
    "name": "你的品牌名"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "2340"
  },
  "offers": {
    "@type": "Offer",
    "price": "49.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

### FAQ Schema（问答页面用）
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "你的产品和竞品X有什么区别？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "具体对比数据：我们便宜15%，重量轻30%，保修多1年。详见https://你的域名.com/compare"
      }
    },
    {
      "@type": "Question",
      "name": "你的产品适合什么场景？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "适合[场景A]、[场景B]、[场景C]。2000+用户评价4.8/5。"
      }
    },
    {
      "@type": "Question",
      "name": "保修政策是什么？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "2年保修，30天无理由退货。详见保修页面。"
      }
    }
  ]
}
</script>
```

### 放置位置
在 `</head>` 标签前或HTML body中任意位置插入。推荐放在页面顶部区域。

---

## 第三步：页面性能检查

1. **加载速度**: Google PageSpeed Insights 评分 > 70
2. **移动端友好**: 通过 Google Mobile-Friendly Test
3. **图片alt文本**: 所有产品图有描述性alt文本

---

## 配套：创建 llms.txt

除了 robots.txt，建议同时在网站根目录创建 `llms.txt` 文件，帮助 AI 爬虫快速了解网站的核心页面结构。详见 `llms-txt-template.md`。

## 验证清单
- [ ] robots.txt 放行全部主要 AI 爬虫（GPTBot/ClaudeBot/PerplexityBot/Google-Extended/CCBot/meta-externalagent/cohere-ai/Bytespider）
- [ ] 同时放行搜索引擎爬虫（Googlebot/Bingbot/DuckDuckBot）
- [ ] 产品页有 Product Schema（含评分和价格）
- [ ] 关键页面有 FAQ Schema（至少3个问答）
- [ ] 页面加载 < 3秒
- [ ] `llms.txt` 已创建并包含核心页面（见 llms-txt-template.md）
