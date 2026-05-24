# llms.txt 生成处方模板
- **用途**: 为 LLM/AI 爬虫提供网站导航，提高关键页面被 AI 收录的概率
- **来源**: GEOFlow 最佳实践（Apache 2.0）+ llms.txt 社区标准
- **处方类型**: 技术优化
- **预期效果**: 提高 AI 爬虫对核心页面的收录率，减少 JS 渲染导致的内容丢失
- **难度**: 低（一次性创建文本文件）
- **适用**: 所有网站、所有行业

> 融合来源：https://github.com/yaojingang/GEOFlow（Apache 2.0 License）

---

## 第一步：检查是否已有 llms.txt

在浏览器访问 `https://客户域名.com/llms.txt`

- 如果有 → 检查内容是否完整（参考下面的清单）
- 如果 404 → 需要创建

---

## 第二步：生成 llms.txt 内容

### 模板

```txt
# llms.txt
# Domain: {客户域名}
# Last Updated: {当前日期}

## About {品牌名}
{2-3句话描述品牌：做什么的、核心品类、目标市场。要精确，不夸张}

## Key Pages
- {品牌官网首页路径} — 品牌官网首页
- {关于我们页面路径} — 品牌故事、使命、创始团队
- {产品目录页路径} — 完整产品目录
- {FAQ页面路径} — 产品常见问题与解答
- {联系页面路径} — 联系方式与客服信息

## Product Categories
- {品类1路径} — {品类1名称和简要描述}
- {品类2路径} — {品类2名称和简要描述}
- {品类3路径} — {品类3名称和简要描述}

## Blog / Resources
- {博客首页路径} — 行业洞察与产品指南
- {关键文章1路径} — {文章标题}
- {关键文章2路径} — {文章标题}

## Optional Sections
{如果有以下内容，添加对应区域}

### Documentation
- {文档路径} — {文档描述}

### Case Studies
- {案例1路径} — {案例标题}
- {案例2路径} — {案例标题}
```

### 编写原则

1. **只列最重要的页面**（10-20个），不是完整站点地图
2. **每个链接配一行描述**，让 AI 理解页面内容
3. **About 描述要精确**，这决定了 AI 怎么定义你的品牌
4. **用绝对路径**（如 `/products`），不用完整 URL
5. **英文优先**，如果目标市场非英语，增加多语言说明

---

## 第三步：上传到网站根目录

将 llms.txt 文件放到网站根目录，确保可以通过 `https://客户域名.com/llms.txt` 访问。

### 多语言网站的额外处理

如果有多个语言版本，每种语言创建独立的 llms.txt：

```
/en/llms.txt        → 英文页面列表
/fr/llms.txt        → 法文页面列表
/de/llms.txt        → 德文页面列表
```

---

## 第四步：配套创建 TXT 地图

TXT 地图是纯文本版的站点地图，每行一个 URL：

```txt
https://客户域名.com/
https://客户域名.com/about
https://客户域名.com/products
https://客户域名.com/products/category-1
https://客户域名.com/products/category-2
https://客户域名.com/faq
https://客户域名.com/blog
https://客户域名.com/blog/article-1
https://客户域名.com/blog/article-2
```

上传到：`https://客户域名.com/sitemap.txt`

---

## 验证清单

- [ ] `https://客户域名.com/llms.txt` 可访问，返回 200
- [ ] llms.txt 的第一段 About 准确描述了品牌
- [ ] Key Pages 包含 About、Products、FAQ 至少三个关键页面
- [ ] Product Categories 列出了所有核心品类
- [ ] 链接全部使用绝对路径（以 `/` 开头）
- [ ] `robots.txt` 同时放行了 AI 爬虫（见 technical-schema-robots.md）
- [ ] `sitemap.txt` 存在且包含所有重要页面
