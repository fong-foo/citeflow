# TASK_EVIDENCE_TRACE.md — 仪表盘品牌健康卡加"证据溯源"折叠区

> 药老出品 · 2026-05-18
> 目标: 用户看到"引用率25%"时，能立即明白"为什么这么低"
> 预计工时: 2-3小时

---

## 任务概览

| # | 任务 | 文件 | 预计 |
|---|------|------|------|
| 1 | 新增 EvidenceSection 组件 | scan-dashboard.tsx | 1.5h |
| 2 | 在品牌健康卡下方插入组件 | scan-dashboard.tsx | 0.5h |
| 3 | 验证 Light 和 Full 模式都能用 | 手动测试 | 0.5h |

**完成标准**: 用户点击"为什么引用率这么低？"→ 展开看到具体证据（哪些查询没提到、AI怎么说的）

---

## 背景

### 用户痛点
```
用户看到：行业引用率 25%
用户想问：为什么这么低？哪些查询没提到我？AI怎么说我的？
```

### 数据来源（已有，不需要改后端）
```python
# CitationMetrics 结构（Light 和 Full 都有）
{
  "rate": 25.0,                    # 总引用率
  "industry_rate": 25.0,           # A类行业查询引用率
  "recommendation_rate": 12.0,     # 推荐率
  "top_rate": 8.0,                 # Top率
  "total_queries": 10,             # Light=10, Full=30
  "mentioned_count": 2,            # 被提及的查询数
  "details": [                     # ← 这就是证据！
    {
      "query": "best flower makeup brand",
      "mentioned": false,           # 是否被提及
      "position": "none",           # top/middle/bottom/mention/none
      "mention_context": "",        # AI怎么说你的（空=没提到）
      "reference_source": "",       # 引用来源
      "query_category": "industry"  # industry/brand/competitor
    },
    // ... 更多查询
  ]
}
```

### Light vs Full 区别
| 维度 | Light（免费） | Full（付费） |
|------|--------------|-------------|
| 查询数量 | 10个（仅A类） | 30个（A/B/C类） |
| 引擎 | 仅ChatGPT | ChatGPT + DeepSeek |
| 引用详情 | ✅ 有 | ✅ 有 |

---

## 任务1: 新增 EvidenceSection 组件

### 问题
品牌健康卡只显示4个数字（综合评分、行业引用率、推荐率、Top率），但没有展示"为什么这么低"的证据。用户看到低分但不知道原因。

### 需要改的文件
`frontend/components/scan-dashboard.tsx`

### 实现要求

1. **在 MetricCard 组件后面（约第167行）新增 EvidenceSection 组件**

```tsx
function EvidenceSection({
  citationMetrics,
  brandName,
}: {
  citationMetrics: any;
  brandName: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!citationMetrics || !citationMetrics.details || citationMetrics.details.length === 0) {
    return null;
  }

  const details = citationMetrics.details;
  const mentioned = details.filter((d: any) => d.mentioned);
  const notMentioned = details.filter((d: any) => !d.mentioned);

  // 推荐位置分布
  const topCount = details.filter((d: any) => d.position === "top").length;
  const middleCount = details.filter((d: any) => d.position === "middle").length;
  const bottomCount = details.filter((d: any) => d.position === "bottom").length;
  const mentionOnlyCount = details.filter((d: any) => d.position === "mention").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="mt-4"
    >
      {/* 折叠按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:brightness-110"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span className="text-xs font-medium" style={{ color: "#9A9AB0" }}>
          为什么评分这么低？查看证据
        </span>
        <span
          className="text-xs transition-transform"
          style={{
            color: "#5E5E78",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </button>

      {/* 展开内容 */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
          className="px-4 py-4"
          style={{
            background: "rgba(255,255,255,0.01)",
            border: "1px solid rgba(255,255,255,0.04)",
            borderTop: "none",
          }}
        >
          {/* 未被提及的查询 */}
          {notMentioned.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "#EF4444" }}>
                未被提及的查询 ({notMentioned.length}/{details.length})
              </p>
              <div className="space-y-2">
                {notMentioned.slice(0, 5).map((d: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-3 py-2 text-xs"
                    style={{
                      background: "rgba(239,68,68,0.03)",
                      border: "1px solid rgba(239,68,68,0.06)",
                    }}
                  >
                    <span style={{ color: "#EF4444" }}>✗</span>
                    <span style={{ color: "#C8C8D8" }}>{d.query}</span>
                  </div>
                ))}
                {notMentioned.length > 5 && (
                  <p className="text-[10px] pl-3" style={{ color: "#5E5E78" }}>
                    还有 {notMentioned.length - 5} 个查询未被提及...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 被提及的查询 */}
          {mentioned.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "#22C55E" }}>
                被提及的查询 ({mentioned.length}/{details.length})
              </p>
              <div className="space-y-2">
                {mentioned.slice(0, 3).map((d: any, i: number) => (
                  <div
                    key={i}
                    className="px-3 py-2 text-xs"
                    style={{
                      background: "rgba(34,197,94,0.03)",
                      border: "1px solid rgba(34,197,94,0.06)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: "#22C55E" }}>✓</span>
                      <span style={{ color: "#C8C8D8" }}>{d.query}</span>
                      <span
                        className="px-1.5 py-0.5 text-[9px] font-mono"
                        style={{
                          background: d.position === "top" ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)",
                          color: d.position === "top" ? "#22C55E" : "#9A9AB0",
                        }}
                      >
                        {d.position}
                      </span>
                    </div>
                    {d.mention_context && (
                      <p className="pl-5 text-[11px] leading-relaxed" style={{ color: "#9A9AB0" }}>
                        "{d.mention_context.slice(0, 100)}{d.mention_context.length > 100 ? '...' : ''}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 推荐位置分布 */}
          <div>
            <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "#9A9AB0" }}>
              推荐位置分布
            </p>
            <div className="flex gap-2">
              {[
                { label: "Top", count: topCount, color: "#22C55E" },
                { label: "Middle", count: middleCount, color: "#F59E0B" },
                { label: "Bottom", count: bottomCount, color: "#EF4444" },
                { label: "仅提及", count: mentionOnlyCount, color: "#5E5E78" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex-1 px-2 py-1.5 text-center"
                  style={{
                    background: `${item.color}08`,
                    border: `1px solid ${item.color}15`,
                  }}
                >
                  <p className="text-lg font-mono" style={{ color: item.color }}>{item.count}</p>
                  <p className="text-[9px]" style={{ color: "#5E5E78" }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
```

2. **在品牌健康卡 section 结束前（约第517行）插入组件**

找到这段代码：
```tsx
        {/* CTA — view full report */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.4 }}
          className="flex justify-end"
        >
```

在它前面插入：
```tsx
        {/* 证据溯源 */}
        <EvidenceSection
          citationMetrics={probe?.citation_metrics}
          brandName={brandName}
        />
```

### 验证方法

**测试1: Light 模式**
1. 用 test@citeflow.com 登录
2. 跑一次 Light 扫描
3. 进入仪表盘
4. 看到品牌健康卡，点击"为什么评分这么低？查看证据"
5. 应该看到：10个查询中哪些没被提及、哪些被提及、推荐位置分布

**测试2: Full 模式**
1. localStorage 改 tier=probe
2. 跑一次 Full 扫描
3. 进入仪表盘
4. 点击折叠区
5. 应该看到：30个查询的证据（A/B/C类都有）

**测试3: 空数据**
1. 如果 citation_metrics.details 为空
2. 折叠区应该不显示（return null）

---

## state.py 改动汇总

**不需要改后端！** 数据已经有了：
- `citation_metrics` 在 Light 和 Full 模式都返回
- `details` 字段包含每个查询的详细信息

---

## CHECKLIST 自检

**任务1 [EvidenceSection]:**
- [ ] 组件在 scan-dashboard.tsx 中定义
- [ ] 使用 useState 管理展开/折叠状态
- [ ] 正确读取 citationMetrics.details
- [ ] 未提及的查询显示红色 ✗
- [ ] 被提及的查询显示绿色 ✓ + 位置标签
- [ ] 被提及的查询显示 mention_context（截断100字）
- [ ] 推荐位置分布显示4个格子（Top/Middle/Bottom/仅提及）
- [ ] 空数据时不显示（return null）

**任务2 [插入组件]:**
- [ ] 在品牌健康卡 section 内部、CTA 按钮之前
- [ ] 传递 probe?.citation_metrics 和 brandName

**任务3 [验证]:**
- [ ] Light 模式能看到10个查询的证据
- [ ] Full 模式能看到30个查询的证据
- [ ] 折叠/展开动画流畅

---

## 交付格式

```
自检结果: X/8 任务1 + X/3 任务2 + X/3 任务3 = XX/14
失败项: (无 / 列出)
修复记录: (如有修复，简述)
```

---

## 注意事项

1. **不要改 MetricCard 组件** — 它是独立的，不要动
2. **不要改后端 API** — 数据已经有了
3. **不要加新的 state 管理** — 用 useState 就够了
4. **保持现有样式风格** — 用 inline style，不用 Tailwind（项目风格）
5. **mention_context 截断** — 最多显示100字，避免撑爆布局
6. **动画延迟** — EvidenceSection 的 delay=0.25，在 MetricCard（0.05-0.19）之后

---

## 预期效果

```
┌─────────────────────────────────────────────┐
│  品牌健康卡                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 62  │ │ 25% │ │ 12% │ │ 8%  │           │
│  │评分  │ │引用率│ │推荐率│ │Top率│           │
│  └─────┘ └─────┘ └─────┘ └─────┘           │
│                                             │
│  AI 眼中的你：Flower Knows 是一个...         │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 为什么评分这么低？查看证据           ▼ │   │  ← 新增
│  └─────────────────────────────────────┘   │
│  │                                       │   │
│  │  ✗ 未被提及的查询 (7/10)              │   │
│  │    ✗ best flower makeup brand         │   │
│  │    ✗ affordable cosmetics for teens   │   │
│  │    ✗ ...                              │   │
│  │                                       │   │
│  │  ✓ 被提及的查询 (3/10)                │   │
│  │    ✓ flower knows review [top]        │   │
│  │      "Flower Knows is a popular..."   │   │
│  │                                       │   │
│  │  推荐位置分布                         │   │
│  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐            │   │
│  │  │ 0 │ │ 1 │ │ 1 │ │ 1 │            │   │
│  │  │Top│ │Mid│ │Bot│ │提及│            │   │
│  │  └───┘ └───┘ └───┘ └───┘            │   │
│  └───────────────────────────────────────┘   │
│                                             │
│              [查看免费报告 →]                 │
└─────────────────────────────────────────────┘
```
