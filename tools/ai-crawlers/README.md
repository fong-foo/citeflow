# AI Crawlers — AI 搜索引擎爬虫 User-Agent 清单

> 你的 robots.txt 放对了吗？屏蔽 AI 爬虫 = 你的品牌在 ChatGPT / Gemini / Claude 搜索结果里不存在。

---

## 为什么重要

AI 搜索引擎（ChatGPT、Gemini、Claude、Perplexity 等）使用专用爬虫收集训练数据和 RAG 检索内容。如果 `robots.txt` 屏蔽了它们，你的网站内容就不会出现在 AI 搜索结果中。

**这不是 SEO 问题——这是 AI 时代的"网站是否存在"的问题。**

---

## 快速检查

一行命令检查你的网站：

```bash
curl -sL https://raw.githubusercontent.com/fong-foo/ai-crawlers/main/check.sh | zsh -s https://你的域名.com
```

输出示例：
```
🔍 检查: https://example.com/robots.txt

AI 搜索爬虫:
✅ GPTBot (OpenAI)
❌ ClaudeBot (Anthropic) — 被屏蔽
✅ PerplexityBot (Perplexity)

结果: 13 放行 / 1 屏蔽 / 14 总计
```

也支持 JSON 输出（方便接入 CI/CD）：
```bash
curl -sL https://raw.githubusercontent.com/fong-foo/ai-crawlers/main/check.sh | zsh -s https://你的域名.com --json
```

---

## 完整 AI 爬虫列表

| 爬虫 User-Agent | 所属引擎 | 用途 |
|---|---|---|
| `GPTBot` | OpenAI（ChatGPT） | LLM 训练数据收集 |
| `ChatGPT-User` | OpenAI（ChatGPT） | 用户实时搜索请求 |
| `oai-searchbot` | OpenAI（SearchGPT） | 搜索引擎索引 |
| `ClaudeBot` | Anthropic（Claude） | LLM 训练数据 + 搜索 |
| `Claude-Web` | Anthropic（Claude） | 用户实时搜索请求 |
| `anthropic-ai` | Anthropic（Claude） | 训练数据收集 |
| `PerplexityBot` | Perplexity AI | 搜索引擎索引 |
| `Perplexity-Chat` | Perplexity AI | 用户实时搜索请求 |
| `Google-Extended` | Google（Gemini） | AI 训练数据（不影响 Google 搜索排名） |
| `CCBot` | Common Crawl | LLM 训练数据的关键来源 |
| `meta-externalagent` | Meta（LLaMA） | LLM 训练数据收集 |
| `meta-externalfetcher` | Meta（LLaMA） | 外部链接抓取 |
| `cohere-ai` | Cohere | LLM 训练数据收集 |
| `Bytespider` | ByteDance（豆包） | LLM 训练数据收集 |

### 传统搜索引擎

| 爬虫 User-Agent | 搜索引擎 |
|---|---|
| `Googlebot` | Google |
| `Bingbot` | Bing |
| `DuckDuckBot` | DuckDuckGo |

---

## robots.txt 一键模板

直接下载使用：

```bash
wget https://raw.githubusercontent.com/fong-foo/ai-crawlers/main/robots.txt
# 或用 curl
curl -O https://raw.githubusercontent.com/fong-foo/ai-crawlers/main/robots.txt
```

修改 `Sitemap` 行中的域名为你自己的域名，然后放到网站根目录。

---

## 放行了 robots.txt，然后呢？

`robots.txt` 放行只是第一步。你还需要知道 **AI 实际上有没有引用你的品牌**。

👉 **[CiteFlow](https://citeflow.cn) — 免费 AI 品牌体检。3 分钟，4 大 AI 引擎扫描，看看你的品牌在 AI 眼中是什么样。**

---

## 贡献

发现新的 AI 爬虫？请提 Issue 或 PR。更新只需两步：
1. 在 README 表格中添加爬虫
2. 在 `robots.txt` 和 `check.sh` 中同步

## 许可

MIT · [CiteFlow](https://citeflow.cn)
