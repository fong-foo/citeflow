# llms.txt 标准中文指南

> 为 AI 爬虫提供网站导航。提高品牌在 ChatGPT / Claude / Gemini 中的可见度。

---

## 什么是 llms.txt

`llms.txt` 是一个放在网站根目录的 Markdown 文件，告诉 AI 搜索引擎你的网站有哪些重要页面、每个页面是做什么的。

由 Jeremy Howard（Answer.ai）提出，已被 LLM 社区广泛采纳。AI 爬虫在抓取你的网站时会先读 `llms.txt`，然后有针对性地抓取列出的页面。

**没有 llms.txt = AI 爬虫只能盲猜你的网站结构。猜错的代价是你的品牌在 AI 搜索结果里被误读。**

---

## 和 robots.txt 有什么区别

| | robots.txt | llms.txt |
|---|---|---|
| 作用 | 告诉爬虫**能不能**访问 | 告诉 AI **应该读**哪些页面 |
| 格式 | 纯文本指令 | Markdown |
| 对象 | 所有爬虫 | AI/LLM 爬虫 |
| 必须 | 是 | 强烈推荐 |

两者互补。`robots.txt` 放行，`llms.txt` 导航。

---

## 快速检查

一行命令检查你的网站有没有 llms.txt：

```bash
curl -sI https://你的域名.com/llms.txt | head -1
```

返回 `200 OK` = 有。`404` = 还没有。

也可以用本 repo 的验证脚本：

```bash
curl -sL https://raw.githubusercontent.com/fong-foo/llms-txt/main/check.sh | zsh -s https://你的域名.com
```

---

## 模板

直接下载：

```bash
wget https://raw.githubusercontent.com/fong-foo/llms-txt/main/llms.txt
# 或
curl -O https://raw.githubusercontent.com/fong-foo/llms-txt/main/llms.txt
```

### 模板内容预览

```markdown
# llms.txt
# Domain: example.com
# Last Updated: 2026-05-24

## About 品牌名
2-3 句话描述品牌：做什么、核心品类、目标市场。写精确，不夸张。

## Key Pages
- / — 品牌官网首页
- /about — 品牌故事、使命、创始团队
- /products — 完整产品目录
- /faq — 产品常见问题与解答
- /contact — 联系方式与客服信息

## Product Categories
- /products/category-1 — 品类名称和简要描述
- /products/category-2 — 品类名称和简要描述
- /products/category-3 — 品类名称和简要描述

## Blog / Resources
- /blog — 行业洞察与产品指南
- /blog/key-article-1 — 文章标题
- /blog/key-article-2 — 文章标题
```

### 编写原则

1. **只列最重要的 10-20 个页面**，不是完整站点地图
2. **每个链接配一行描述**，让 AI 理解页面内容
3. **About 描述要精确**——这决定了 AI 怎么定义你的品牌
4. **用绝对路径**（如 `/products`），不用完整 URL
5. **英文优先**，如果目标市场非英语，增加多语言版本

---

## 配套：llms-full.txt

对于内容更丰富的网站，可以额外创建 `llms-full.txt`，包含完整的产品描述、FAQ 全文等详细内容。

`llms.txt` = 导航 + 摘要（AI 爬虫先读这个）
`llms-full.txt` = 完整内容（AI 训练数据的直接来源）

---

## 多语言网站

每种语言放一个独立的 llms.txt：

```
/en/llms.txt  → 英文页面
/ja/llms.txt  → 日文页面
/de/llms.txt  → 德文页面
```

---

## 验证清单

- [ ] `https://你的域名.com/llms.txt` 可访问，返回 200
- [ ] About 描述准确描述了品牌（别让 AI 误读）
- [ ] Key Pages 包含 About、Products、FAQ 至少三个关键页面
- [ ] Product Categories 列出了核心品类
- [ ] 链接全部使用绝对路径（以 `/` 开头）
- [ ] `robots.txt` 同时放行了 AI 爬虫（参考 [ai-crawlers](https://github.com/fong-foo/ai-crawlers)）

---

## 有了 llms.txt，然后呢？

`llms.txt` 告诉 AI 该读什么。但你还需要知道 **AI 读完之后，有没有引用你的品牌**。

👉 **[CiteFlow](https://citeflow.cn) — 免费 AI 品牌体检。3 分钟，4 大 AI 引擎扫描，看看你的品牌在 AI 眼中是什么样。**

---

## 参考

- [llms.txt 社区标准](https://llmstxt.org/)
- [Jeremy Howard 原始提案](https://answer.ai/)
- [ai-crawlers — AI 爬虫 UA 清单](https://github.com/fong-foo/ai-crawlers)

## 许可

MIT · [CiteFlow](https://citeflow.cn)
