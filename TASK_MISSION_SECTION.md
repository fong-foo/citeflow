# TASK_MISSION_SECTION.md — 产品宗旨section重写

> 药老出品 · 2026-05-12
> 目标: 重写产品宗旨section，两大主题6条文案
> 预计工时: 20min

---

## 需要改的文件

`app/page.tsx` — 替换 `id="mission"` 的 section

---

## 改动内容

把当前3条文案替换为6条，分两大主题，中间用分隔线隔开。

直接复制下面代码，替换 `app/page.tsx` 中 `id="mission"` 的整个 `<section>` 块：

```tsx
        {/* ═══ 产品宗旨 section（id="mission"）═══ */}
        <section id="mission" className="border-b border-[#1E293B]/50 py-20 px-8 text-center scroll-mt-18">
          <FadeIn>
            <p className="text-xs font-mono tracking-widest text-[#38BDF8] uppercase mb-3">我们的使命</p>
            <h2 className="text-2xl md:text-3xl font-bold text-[#F1F5F9] tracking-tight mb-4">
              为什么做 CiteFlow
            </h2>
            <p className="text-sm text-[#64748B] mb-12">我们相信，每一个中国品牌都值得被世界看见</p>
          </FadeIn>

          {/* 主题一：帮助中小企业 */}
          <div className="max-w-[800px] mx-auto mb-10">
            <FadeIn delay={0.05}>
              <p className="text-xs font-mono tracking-widest text-[#64748B] uppercase mb-6 text-left">帮助跨境出海中小企业</p>
            </FadeIn>
            <div className="space-y-4">
              {[
                { num: "01", title: "海外AI搜索正在成为新的\"被发现\"入口", text: "全球消费者已经开始用ChatGPT、Perplexity问\"推荐什么品牌\"。AI说谁，谁就进入候选。AI不说谁，谁就不存在。这不是未来，这是正在发生在海外市场的事。" },
                { num: "02", title: "中国出海品牌在这个入口里是隐形的", text: "深圳做了全世界最好的充电宝，杭州设计了最有性价比的女装，广州的美妆供应链让全球品牌依赖——但海外消费者问AI\"推荐什么品牌\"时，回答里没有他们。他们在亚马逊卷价格、在独立站烧广告，却在海外AI决策这个新入口里，完全隐形。" },
                { num: "03", title: "大企业有团队出海，中小企业只有自己", text: "大品牌有GEO团队、有海外PR、有信息差，中小企业连\"海外AI搜索优化\"这个词都没听过，更不知道自己的品牌在海外AI眼里是什么样子。CiteFlow存在的意义，就是让一家5个人的跨境公司也能拥有和大企业一样的海外AI可见度诊断能力。" },
              ].map(({ num, title, text }, i) => (
                <FadeIn key={num} delay={0.1 + i * 0.08}>
                  <div className="flex items-start gap-4 text-left p-5 rounded-xl border border-[#1E293B]/50 bg-[#0A0F1E]/30 hover:bg-[#0A0F1E]/60 transition-colors duration-300">
                    <span className="font-mono text-xs font-medium text-[#38BDF8] mt-0.5 flex-shrink-0">{num}</span>
                    <div>
                      <p className="text-base font-semibold text-[#F1F5F9] mb-1">{title}</p>
                      <p className="text-sm text-[#94A3B8] leading-relaxed">{text}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>

          {/* 分隔线 */}
          <div className="max-w-[800px] mx-auto mb-10">
            <div className="border-t border-[#1E293B]/50"></div>
          </div>

          {/* 主题二：整治行业乱象 */}
          <div className="max-w-[800px] mx-auto">
            <FadeIn delay={0.3}>
              <p className="text-xs font-mono tracking-widest text-[#64748B] uppercase mb-6 text-left">整治国内出海服务行业乱象</p>
            </FadeIn>
            <div className="space-y-4">
              {[
                { num: "04", title: "国内出海服务行业，乱象丛生", text: "打着\"海外GEO优化\"旗号的公司不少，但大多数只是给你一个分数——\"你的AI可见度60分\"，然后呢？没有然后。你自己琢磨。数据怎么来的不知道，结论怎么得出的不知道，哪些是真的、哪些是AI编的，你分不清。" },
                { num: "05", title: "我们要做的，是让出海服务有标准", text: "CiteFlow的每一条分析都有来源标记，每一个结论都可溯源、可验证、可信任。我们自研了14条分析规则、21篇论文支撑的知识库，不是为了炫技，是为了让跨境企业拿到的每一条建议都有据可查。" },
                { num: "06", title: "我们不卖焦虑，卖诊断", text: "行业里太多人在卖\"你的品牌在海外AI里不行\"的焦虑，但不告诉你为什么不行、怎么改。CiteFlow的逻辑是：先体检、再诊断、最后开处方。你拿到的不是一个分数，是一份可执行的任务清单。" },
              ].map(({ num, title, text }, i) => (
                <FadeIn key={num} delay={0.35 + i * 0.08}>
                  <div className="flex items-start gap-4 text-left p-5 rounded-xl border border-[#1E293B]/50 bg-[#0A0F1E]/30 hover:bg-[#0A0F1E]/60 transition-colors duration-300">
                    <span className="font-mono text-xs font-medium text-[#38BDF8] mt-0.5 flex-shrink-0">{num}</span>
                    <div>
                      <p className="text-base font-semibold text-[#F1F5F9] mb-1">{title}</p>
                      <p className="text-sm text-[#94A3B8] leading-relaxed">{text}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
```

---

## 验证方法

1. 点击导航栏"产品宗旨" → 滚动到mission section
2. 顶部有"我们的使命"小字标签（蓝色、大写）
3. 主题一标题"帮助跨境出海中小企业"，下面01/02/03三条
4. 中间有分隔线
5. 主题二标题"整治国内出海服务行业乱象"，下面04/05/06三条
6. 每条文案含"海外""跨境""出海"关键词

---

## CHECKLIST 自检

- [ ] id="mission" section存在
- [ ] 顶部有"我们的使命"标签
- [ ] 主题一"帮助跨境出海中小企业"：01/02/03三条
- [ ] 主题二"整治国内出海服务行业乱象"：04/05/06三条
- [ ] 两个主题之间有分隔线
- [ ] 每条文案突出"海外""跨境""出海"

---

## 交付格式

```
自检结果: X/6
失败项: (无 / 列出)
```
