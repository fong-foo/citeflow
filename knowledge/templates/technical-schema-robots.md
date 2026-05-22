# 技术优化处方模板：Schema标记 + AI爬虫友好
- **用途**: 改善AI引擎对网站内容的理解和抓取
- **来源**: 论文2(Section 3.3) + 论文6
- **处方类型**: 技术优化
- **预期效果**: 避免因技术障碍丢失AI引用机会
- **难度**: 低（一次性设置）
- **适用**: 所有网站、所有行业、所有地区

## 第一步：robots.txt 放行AI爬虫

在网站根目录的 robots.txt 中确保以下内容：

```
User-agent: GPTBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: PerplexityBot
Allow: /
```

### 验证方法
在浏览器访问 https://你的域名.com/robots.txt，确认以上内容存在。

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

## 验证清单
- [ ] robots.txt 放行 GPTBot + Google-Extended + anthropic-ai + PerplexityBot
- [ ] 产品页有 Product Schema（含评分和价格）
- [ ] 关键页面有 FAQ Schema（至少3个问答）
- [ ] 页面加载 < 3秒
