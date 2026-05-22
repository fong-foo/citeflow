# TASK_PRODUCT_SHOWCASE.md — 三大产品卡片重写：文字墙→报告预览

> 药老出品 · 2026-05-13
> 目标: 把 #product section 里3张文字密集卡片替换为"报告预览"展示
> 预计工时: 30min

---

## 问题

当前3张产品卡片（行483-573）每张有3列文字："它做什么/你得到什么/为什么付费"。
3张卡 × 3列 × 大段文字 = 用户要读9块内容，信息过载且跟上面用户旅程重复。

## 需要改的文件

`app/page.tsx` — 替换 `{/* 三个产品 — 上下错位排版，打破均等网格 */}` 这个div块

---

## 改动内容

**删除**：行483-573 的整个 `{/* 三个产品 ... */}` div块

**替换为**：3个产品展示卡片，每个 = 名字 + tagline + 报告预览mock组件

设计要点：
- 每张卡片左侧：编号 + 名称 + Agent标签 + 一句话tagline
- 每张卡片右侧：一个mini报告预览组件（模拟真实报告的样子）
- 报告预览用ugreen.com的mock数据，让用户看到"产品长什么样"
- 不要"它做什么/你得到什么/为什么付费"三列文字
- 暗色主题保持一致：背景 #0A0F1E，边框 #1E293B，强调色 #38BDF8

---

## 完整替换代码

直接复制下面代码，替换 `{/* 三个产品 — 上下错位排版，打破均等网格 */}` 开始到 `</section>` 之前的 `</div>` 结束（即行483-573）：

```tsx
          {/* 三个产品 — 报告预览展示 */}
          <div className="px-8 md:px-12 lg:px-16 pb-20 md:pb-24">
            <div className="grid grid-cols-1 gap-10 max-w-[960px] mx-auto">

              {/* ── Probe 侦察兵 ── */}
              <DarkReveal>
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 md:gap-10 p-6 md:p-8" style={{ borderLeft: "1px solid rgba(56,189,248,0.20)", background: "rgba(56,189,248,0.015)" }}>
                  <div>
                    <span className="font-mono text-[11px] tracking-widest block mb-3" style={{ color: "rgba(56,189,248,0.35)" }}>01</span>
                    <h3 className="text-base font-medium text-[#C8C8D8] mb-1 tracking-tight">
                      Probe 侦察兵
                      <span className="ml-2 text-[9px] font-medium tracking-wider px-1.5 py-0.5 align-middle" style={{ color: "rgba(56,189,248,0.5)", border: "1px solid rgba(56,189,248,0.12)", background: "rgba(56,189,248,0.05)" }}>Agent</span>
                    </h3>
                    <p className="text-xs text-[#38BDF8]/60 mb-4">让你第一次看到AI眼中的自己</p>
                    <p className="text-xs text-[#6E6E88] leading-relaxed">4大AI引擎并发扫描，3分钟拿到全景图</p>
                  </div>
                  {/* 报告预览 mock */}
                  <div className="rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#38BDF8", opacity: 0.5 }} />
                      <span className="font-mono text-[10px] tracking-widest uppercase text-[#5E5E78]">体检报告 · ugreen.com</span>
                    </div>
                    <div className="p-4 space-y-3">
                      {/* 引用率表格 */}
                      <div className="grid grid-cols-[1fr_60px_60px] gap-2 text-[11px] font-mono">
                        <span className="text-[#5E5E78]">引擎</span>
                        <span className="text-[#5E5E78] text-right">引用率</span>
                        <span className="text-[#5E5E78] text-right">推荐率</span>
                        <span className="text-[#9A9AB0]">ChatGPT</span>
                        <span className="text-[#7DD3FC] text-right">26.7%</span>
                        <span className="text-[#7DD3FC] text-right">16.7%</span>
                        <span className="text-[#9A9AB0]">Perplexity</span>
                        <span className="text-[#7DD3FC] text-right">10.0%</span>
                        <span className="text-[#7DD3FC] text-right">6.7%</span>
                        <span className="text-[#9A9AB0]">Gemini</span>
                        <span className="text-[#7DD3FC] text-right">20.0%</span>
                        <span className="text-[#7DD3FC] text-right">13.3%</span>
                        <span className="text-[#9A9AB0]">Claude</span>
                        <span className="text-[#7DD3FC] text-right">23.3%</span>
                        <span className="text-[#7DD3FC] text-right">10.0%</span>
                      </div>
                      {/* 竞品对比条 */}
                      <div className="pt-2 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="flex items-center gap-3 text-[11px] font-mono">
                          <span className="text-[#9A9AB0] w-16 flex-shrink-0">UGREEN</span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="h-full rounded-full" style={{ width: "20%", background: "rgba(56,189,248,0.5)" }} />
                          </div>
                          <span className="text-[#7DD3FC] w-10 text-right">20%</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono">
                          <span className="text-[#9A9AB0] w-16 flex-shrink-0">Anker</span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="h-full rounded-full" style={{ width: "73%", background: "rgba(239,68,68,0.4)" }} />
                          </div>
                          <span className="text-[#EF4444] w-10 text-right">73%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DarkReveal>

              {/* ── Analyst 分析师 ── */}
              <DarkReveal delay={0.08}>
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 md:gap-10 p-6 md:p-8" style={{ borderLeft: "1px solid rgba(255,255,255,0.03)" }}>
                  <div>
                    <span className="font-mono text-[11px] tracking-widest block mb-3" style={{ color: "rgba(56,189,248,0.35)" }}>02</span>
                    <h3 className="text-base font-medium text-[#C8C8D8] mb-1 tracking-tight">
                      Analyst 分析师
                      <span className="ml-2 text-[9px] font-medium tracking-wider px-1.5 py-0.5 align-middle" style={{ color: "rgba(56,189,248,0.5)", border: "1px solid rgba(56,189,248,0.12)", background: "rgba(56,189,248,0.05)" }}>Agent</span>
                    </h3>
                    <p className="text-xs text-[#38BDF8]/60 mb-4">告诉你"为什么AI不推荐你"</p>
                    <p className="text-xs text-[#6E6E88] leading-relaxed">14条规则逐条检查，根因分析</p>
                  </div>
                  {/* 诊断报告预览 mock */}
                  <div className="rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#7DD3FC", opacity: 0.5 }} />
                      <span className="font-mono text-[10px] tracking-widest uppercase text-[#5E5E78]">诊断报告 · ugreen.com</span>
                    </div>
                    <div className="p-4 space-y-2.5">
                      {/* 诊断条目 */}
                      {[
                        { icon: "✗", text: "行业引用率仅10%，严重低于竞品Anker(73%)", color: "#EF4444" },
                        { icon: "✗", text: "品牌被AI提及但定位模糊，缺乏差异化描述", color: "#EF4444" },
                        { icon: "✗", text: "Anker在5个维度全面领先（内容力/权威性/结构化）", color: "#EF4444" },
                        { icon: "→", text: "根因：缺乏权威第三方内容背书 + 结构化数据缺失", color: "#F59E0B" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-[11px]">
                          <span className="flex-shrink-0 mt-0.5" style={{ color: item.color }}>{item.icon}</span>
                          <span className="text-[#9A9AB0] leading-relaxed">{item.text}</span>
                        </div>
                      ))}
                      {/* 一行判定 */}
                      <div className="pt-2.5 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <p className="text-[11px] font-mono text-[#F59E0B]">⚠ AI能搜到你，但不推荐你——问题在内容策略</p>
                      </div>
                    </div>
                  </div>
                </div>
              </DarkReveal>

              {/* ── Doctor 医师（处方）── */}
              <DarkReveal delay={0.16}>
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 md:gap-10 p-6 md:p-8" style={{ borderLeft: "1px solid rgba(255,255,255,0.03)" }}>
                  <div>
                    <span className="font-mono text-[11px] tracking-widest block mb-3" style={{ color: "rgba(56,189,248,0.35)" }}>03</span>
                    <h3 className="text-base font-medium text-[#C8C8D8] mb-1 tracking-tight">处方</h3>
                    <p className="text-xs text-[#38BDF8]/60 mb-4">从"知道问题"到"知道怎么改"</p>
                    <p className="text-xs text-[#6E6E88] leading-relaxed">21篇论文知识库，页面级可执行方案</p>
                  </div>
                  {/* 处方预览 mock */}
                  <div className="rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.015)" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#0EA5E9", opacity: 0.5 }} />
                      <span className="font-mono text-[10px] tracking-widest uppercase text-[#5E5E78]">处方 · ugreen.com</span>
                    </div>
                    <div className="p-4 space-y-2">
                      {[
                        { priority: "P0", task: "添加FAQPage结构化数据", impact: "★★★★☆", effort: "★★☆☆☆" },
                        { priority: "P1", task: "3篇权威媒体评测内容", impact: "★★★★☆", effort: "★★★☆☆" },
                        { priority: "P1", task: "重写About页品牌定位", impact: "★★★☆☆", effort: "★★☆☆☆" },
                        { priority: "P2", task: "建立产品对比页面（vs Anker）", impact: "★★★☆☆", effort: "★★★☆☆" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-[11px] font-mono py-1.5" style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] ${item.priority === "P0" ? "text-[#EF4444]" : item.priority === "P1" ? "text-[#F59E0B]" : "text-[#6E6E88]"}`}
                            style={{ background: item.priority === "P0" ? "rgba(239,68,68,0.1)" : item.priority === "P1" ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.03)" }}>
                            {item.priority}
                          </span>
                          <span className="text-[#C8C8D8] flex-1">{item.task}</span>
                          <span className="text-[#5E5E78] hidden sm:inline">影响 {item.impact}</span>
                          <span className="text-[#5E5E78] hidden sm:inline">难度 {item.effort}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DarkReveal>

            </div>
          </div>
```

---

## 验证方法

1. 滚动到 #product section，确认只有3个产品展示（Probe/Analyst/处方），不再有"它做什么/你得到什么/为什么付费"三列
2. 每个产品卡片左侧有：编号、名称、Agent标签（Probe和Analyst有，处方没有）、tagline、一句话描述
3. 每个产品卡片右侧有：报告预览mock组件，模拟真实报告的样子
4. Probe预览：引用率表格 + 竞品对比进度条
5. Analyst预览：4条诊断条目（红✗ + 黄→）+ 一行判定
6. 处方预览：4条P0/P1/P2任务，每条有影响/难度星级
7. 颜色风格与页面其他部分一致（暗色、#38BDF8强调色）
8. 手机端：左右布局变上下布局

---

## CHECKLIST 自检

- [ ] "三个产品 — 上下错位排版" div块已删除
- [ ] 替换为"三个产品 — 报告预览展示"
- [ ] Probe卡片：有引用率表格（4引擎 × 引用率/推荐率）+ 竞品对比条
- [ ] Analyst卡片：有4条诊断条目 + 根因 + 一行判定
- [ ] 处方卡片：有4条P0/P1/P2任务 + 影响/难度星级
- [ ] 每个预览mock有标题栏（带圆点 + "xxx报告 · ugreen.com"）
- [ ] 无"它做什么/你得到什么/为什么付费"文字残留
- [ ] 暗色主题一致，无白色/亮色突兀
- [ ] 响应式：md断点以上左右布局，以下上下布局

---

## 交付格式

```
自检结果: X/9
失败项: (无 / 列出)
```

---

## 注意事项

1. 只改 #product section 里的3张卡片，不要动其他section
2. 用户旅程（ugreen.com示例）保持不动
3. 社会证明、定价、CTA、Footer 都不动
4. DarkReveal 组件已存在，直接用
5. 不要加新的npm依赖
