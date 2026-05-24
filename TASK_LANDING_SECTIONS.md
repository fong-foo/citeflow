# TASK_LANDING_SECTIONS.md — 接入"为什么选择我们"+"使命"两个 section

> 药老出品 · 2026-05-24
> 目标: 把两个新 section 接入 landing.html
> 预计工时: 30min

## 任务概览

| # | 内容 | 文件 |
|---|------|------|
| 1 | 插入"为什么选择我们" section HTML | `frontend/public/landing.html` |
| 2 | 插入"使命" section HTML | `frontend/public/landing.html` |
| 3 | 追加新 CSS 样式 | `frontend/public/landing.html` |

---

## 任务 1: 插入"为什么选择我们" section

### 位置
在"工作流" section 结束标签 `</section>` 和"方法论" section 起始之间。

### 查找
```
</section>        ← 工作流 section 结束（约第 1398 行）

<!-- Section 4: CITE 六大诊断维度               -->
<section class="cite" id="methodology">
```

### 插入
从 `/Users/fogn/Desktop/CiteFlow/frontend/public/sections-whyus-mission.html` 中提取 `<!-- Section X: 为什么选择我们 -->` 到 `</section>` 之间的全部 HTML（约第 1-114 行，到 `</section>` 闭合标签）。

---

## 任务 2: 插入"使命" section

### 位置
在"定价" section 结束和"CTA" section 起始之间。

### 查找
```
</section>        ← 定价 section 结束
<!-- ═══════════════════════════════════════════ -->
<!-- Section 7: CTA + Footer                    -->
```

### 插入
从 sections-whyus-mission.html 中提取 `<!-- Section Y: 使命 -->` 到其 `</section>` 闭合标签之间的全部 HTML。

---

## 任务 3: 追加 CSS

从 sections-whyus-mission.html 的 `<style>` 块中，**只提取 landing.html 里没有的新样式**：

```css
  /* ── Section 5: 为什么选择我们 ── */
  .why-us { padding: 120px 0; position: relative; }
  .why-us-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
  .why-us-card { text-align: center; }
  .why-us-screenshot { margin-bottom: 20px; }
  .screenshot-placeholder { background: #0d0d14; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.4); }
  .screenshot-header { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.04); }
  .screenshot-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.15); }
  .screenshot-label { margin-left: auto; }
  .screenshot-body { padding: 0; }
  .why-us-card-text { font-size: 15px; font-weight: 500; color: var(--text-secondary); letter-spacing: -0.1px; }
  .mission { padding: 120px 0; text-align: center; position: relative; }
  .mission-title { font-size: 40px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.5px; line-height: 1.3; margin-bottom: 24px; }
  .mission-desc { font-size: 15px; color: var(--text-secondary); line-height: 1.8; max-width: 480px; margin: 0 auto; }
```

追加到 landing.html 的 `<style>` 块末尾，`</style>` 之前。

**不要重复加**：`.reveal`、`.section-label`、`.section-title`、`.section-desc`、响应式 `@media` 块——这些 landing.html 已经有了。

---

## 不需要改的文件

- `sections-whyus-mission.html` — 只读，不改
- 其他任何文件

---

## 验证方法

1. 浏览器打开 `http://localhost:3000`
2. 滚动到"工作流"下面 → 应该看到"为什么选择我们" section + 三张 mockup
3. 滚动到"定价"下面 → 应该看到"使命" section（大字居中）
4. 响应式：缩小浏览器宽度 → 三栏变单栏
5. Console 无红色报错

---

## 注意事项

- 不要改动 existing section HTML 的任何内容
- 不要删任何现有 CSS
- 不要改 sections-whyus-mission.html
- 插入位置必须精准——插错 `</section>` 会导致布局炸裂
