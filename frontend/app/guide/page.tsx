"use client";

export default function GuidePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", color: "#9A9AB0" }}>
      {/* Top bar */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
        <a
          href="/scan"
          style={{
            color: "#5E5E78",
            fontSize: 13,
            textDecoration: "none",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#9A9AB0"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#5E5E78"; }}
        >
          ← 返回体检中心
        </a>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 80px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#EDEDF5", marginBottom: 32 }}>
          CiteFlow 体检指南
        </h1>

        {/* ═══ 什么是 CiteFlow？ ═══ */}
        <Section title="什么是 CiteFlow？">
          <P>
            你的潜在客户在 ChatGPT 里问“最好的户外蓝牙音箱推荐”，AI 提到了你的竞品，却没有提到你。这不是你的产品不好——是 AI 不知道你、或者知道但觉得你不够权威。
          </P>
          <P>
            CiteFlow 是一套 AI 搜索可见度（GEO）诊断系统，专门为跨境出海品牌设计。我们不给你打分、不卖你关键词排名——我们告诉你三件事：
          </P>
          <ol style={{ paddingLeft: 20, marginBottom: 16 }}>
            <li style={{ fontSize: 14, color: "#9A9AB0", lineHeight: 1.7, marginBottom: 4 }}>
              <strong style={{ color: "#EDEDF5" }}>AI 现在怎么说你？</strong>（Probe 侦察兵：扫描 ChatGPT、Gemini、Claude 等 AI 引擎）
            </li>
            <li style={{ fontSize: 14, color: "#9A9AB0", lineHeight: 1.7, marginBottom: 4 }}>
              <strong style={{ color: "#EDEDF5" }}>为什么 AI 不推荐你？</strong>（Analyst 诊断师：14 条规则逐条诊断）
            </li>
            <li style={{ fontSize: 14, color: "#9A9AB0", lineHeight: 1.7, marginBottom: 4 }}>
              <strong style={{ color: "#EDEDF5" }}>怎么让 AI 推荐你？</strong>（Doctor 处方：分步执行清单，可执行、可验证）
            </li>
          </ol>
          <HighlightBlock>
            💡 做完一轮之后，按处方改完回来复查——看到引用率涨了，才叫有用。
          </HighlightBlock>
        </Section>

        {/* ═══ 产品能力 ═══ */}
        <Section title="产品能力">
          {/* Probe */}
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#EDEDF5", marginTop: 24, marginBottom: 12 }}>
            🔬 Probe 侦察兵 — AI 引用率扫描
          </h3>
          <P>
            Probe 是你的品牌在 AI 世界的“体检报告”。我们用三类查询词（行业通用查询 / 品牌直接查询 / 竞品对比查询）在多个 AI 引擎上并发扫描，输出 8 个模块：
          </P>
          <GuideTable
            headers={["模块", "给你什么"]}
            rows={[
              ["综合评分", "品牌在 AI 生态中的整体健康度（0-100 分），含各维度得分。一个数字知道自己的位置。"],
              ["引用率 & 推荐率", "你的品牌在 AI 回答中被提及了多少次（引用率）、被正面推荐的频率（推荐率）、在推荐列表中的排名（Top 率）。按 A/B/C 三类查询分开展示。"],
              ["AI 认知画像", "AI 是怎么描述你的品牌的？输出 AI 眼中的品牌定位、产品认知、市场印象。不是你的官网怎么写，是 AI 实际说了什么。"],
              ["认知差距分析", "品牌自述（你官网说的）vs AI 认知（AI 实际说的）之间的差距。哪些信息 AI 没捕捉到？哪些被误解了？"],
              ["竞品战场", "在具体维度上你和竞品谁赢了？逐维对比，标出胜负。"],
              ["来源权威度", "谁的发言影响了 AI 对你的判断？是官方文档、权威媒体、还是论坛帖子？高权威来源引用不足 = 你的“证据链”薄弱。"],
              ["多引擎差异", "同一个品牌，ChatGPT 怎么说、Gemini 怎么说、Claude 怎么说？三个引擎的引用差异一目了然。"],
              ["AI 描述原文", "不加工、不总结——AI 回答里提到你品牌的原话，完整保留。"],
            ]}
          />
          <HighlightBlock>
            💡 Probe 的核心价值在于复查。第一次扫描是“摸底”，知道自己的起点。按 Doctor 处方改完之后，回来再跑一次 Probe——引用率从 20% 涨到 60%，这就是 ROI。没有复查，Probe 就只是一份“哦原来如此”的报告。
          </HighlightBlock>

          {/* Analyst */}
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#EDEDF5", marginTop: 32, marginBottom: 12 }}>
            🩺 Analyst 诊断师 — 14 条规则诊断
          </h3>
          <P>
            Analyst 告诉你“为什么 AI 不推荐你”。不是打分，是诊断——每条规则对应一个具体的问题根因。
          </P>
          <GuideTable
            headers={["输出", "给你什么"]}
            rows={[
              ["一句话诊断", "不看报告也能知道核心结论。例：“你的品牌在 AI 中处于行业隐形状态——行业通用查询中引用率为 0%，但品牌认知尚可。”"],
              ["严重程度评级", "严重 / 警告 / 良好。一眼判断问题紧迫性。"],
              ["核心问题", "最根本的问题是什么？是结构化数据缺失？是内容权威度不够？还是 AI 根本没发现你？"],
              ["问题详情", "核心问题的展开说明，解释为什么这个问题会导致 AI 不推荐你。"],
              ["14 条规则诊断", "逐条检查：结构化数据、内容权威度、技术 SEO、AI 可发现性、竞争定位、信任信号……每条告诉你过没过、为什么。"],
              ["竞品差距分析", "在哪些维度上输给了竞品？差距有多大？根因是什么？"],
              ["引擎对比洞察", "不同 AI 引擎对你的诊断差异——有的引擎能发现你，有的完全不知道你。为什么？"],
            ]}
          />

          {/* Doctor */}
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#EDEDF5", marginTop: 32, marginBottom: 12 }}>
            💊 Doctor 处方 — 分步执行清单
          </h3>
          <P>
            Analyst 告诉你“哪里生病了”，Doctor 告诉你“怎么治”。输出不是 PDF 报告——是一份可以逐条勾选、逐条验证的执行清单。
          </P>
          <GuideTable
            headers={["输出", "给你什么"]}
            rows={[
              ["P0 紧急任务", "一周内必须修的致命问题。例：“首页缺少 Schema.org Organization 标记 → AI 无法提取品牌基本信息”。每条含：目标页面、具体操作、操作原因（evidence）、怎么验证改好了。"],
              ["P1 重要任务", "两周内优化的关键改进。例：“Product 页面缺少结构化数据 → 产品信息无法被 AI 索引”。含完整执行指引。"],
              ["P2 建议任务", "长期建设项。例：“建立行业权威内容专栏 → 提升 AI 信息来源权威度”。"],
              ["处方总结", "一句话概括整体处方思路——先做什么，再做什么，预期效果。"],
              ["知识来源", "每条处方基于哪篇论文/研究——不是我们编的，有学术依据。CiteFlow CITE 六大诊断维度（可发现性 / 结构化数据 / 内容力 / 身份力 / 信任力 / 社区力）融合 21 篇 GEO 研究论文。"],
            ]}
          />
          <P>
            每条任务包含 7 个字段：<strong style={{ color: "#EDEDF5" }}>优先级 · 分类 · 操作描述 · 目标页面 · 具体操作 · 操作原因 · 验证方法</strong>
          </P>
          <P>
            不改代码的人也能执行。技术团队用来排期，运营团队用来跟进度。
          </P>
        </Section>

        {/* ═══ 使用流程 ═══ */}
        <Section title="使用流程">
          <StepItem num={1} title="免费初步体检" desc="进入体检中心，输入你的品牌域名。系统自动爬取你的官网信息，生成品牌画像。≈ 1 分钟" />
          <StepItem num={2} title="AI 多引擎扫描" desc="系统用你的品牌信息生成 30 个查询词（覆盖行业通用查询、品牌直接查询、竞品对比查询三类），在多个 AI 引擎上并发扫描。≈ 3 分钟" />
          <StepItem num={3} title="查看初步体检报告" desc="免费版包含：综合健康分、品牌基本信息验证。升级后解锁完整 8 个模块。" />
          <StepItem num={4} title="解锁完整诊断" desc={"“完整体检套餐”（¥368，含 2 次 Probe → Analyst → Doctor 全套），或“单次 Probe”（¥68，仅侦察兵）。付费后系统自动开始深度分析。"} />
          <StepItem num={5} title="Analyst 诊断 + Doctor 处方" desc="系统基于 Probe 扫描结果，运行 14 条诊断规则，生成诊断报告。然后基于诊断 + 学术知识库，生成 P0/P1/P2 三级处方。≈ 5 分钟" />
          <StepItem num={6} title="执行 + 复查" desc="按处方逐条执行。完成后回来重新跑 Probe——对比前后数据：引用率涨了没？AI 描述变了没？竞品维度赢回来了没？" />
          <HighlightBlock>
            💡 数字涨了，才叫有用。
          </HighlightBlock>
        </Section>

        {/* ═══ 常见问题 ═══ */}
        <Section title="常见问题">
          <FaqItem
            q="免费体检能看到什么？"
            a="初步体检报告包含：综合健康分、品牌基本信息验证。付费后解锁完整 8 个 Probe 模块 + Analyst 诊断 + Doctor 处方。"
          />
          <FaqItem
            q="和 SEO 工具有什么区别？"
            a={"SEO 工具告诉你“在 Google 里排第几”。CiteFlow 告诉你“在 AI 眼里你是谁”。AI 不按蓝色链接排名——它综合处理信息后生成回答。你的品牌可能 SEO 做得很好，但在 AI 回答里完全不存在。"}
          />
          <FaqItem
            q="复查真的能看到变化吗？"
            a="能。Probe 的核心设计就是可对比——第一次摸底，改完复查，数字可量化。你自己在 ChatGPT 里问同一个问题，也能手动验证。"
          />
          <FaqItem
            q="你们的诊断依据是什么？"
            a="CiteFlow CITE 六大诊断维度（可发现性 / 结构化数据 / 内容力 / 身份力 / 信任力 / 社区力），融合 21 篇 GEO 学术论文 + 行业实践研究。每条处方都有来源——你可以在处方详情里看到对应的论文引用。"
          />
          <FaqItem
            q="适合什么样的品牌？"
            a={"跨境出海的消费品/DTC 品牌。如果你的客户用 AI 搜索做购买决策（“最好的XX推荐”），你就需要 CiteFlow。"}
          />
          <FaqItem
            q="数据安全吗？"
            a="你的扫描数据和诊断报告仅你可见。我们不存储你的网站内容，只保留诊断结果供复查对比。"
          />
        </Section>

        {/* Footer quote */}
        <div style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}>
          <p style={{ color: "#5E5E78", fontSize: 14, fontStyle: "italic" }}>
            CiteFlow — 不是告诉你“你有问题”，是告诉你怎么解决。
          </p>
          <p style={{ color: "#5E5E78", fontSize: 12, marginTop: 8 }}>
            <a href="https://www.citeflow.cn" style={{ color: "#3B82F6", textDecoration: "none" }}>citeflow.cn</a>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ─── Local sub-components ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{
        fontSize: 18,
        fontWeight: 700,
        color: "#EDEDF5",
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 14, color: "#9A9AB0", lineHeight: 1.7, marginBottom: 12 }}>
      {children}
    </p>
  );
}

function HighlightBlock({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: "#7DD3FC",
      fontSize: 13,
      fontStyle: "italic",
      padding: "12px 16px",
      background: "rgba(56,189,248,0.05)",
      borderLeft: "3px solid rgba(56,189,248,0.3)",
      borderRadius: "0 8px 8px 0",
      margin: "16px 0",
      lineHeight: 1.6,
    }}>
      {children}
    </p>
  );
}

function GuideTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 12, marginBottom: 20 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
        <thead>
          <tr style={{ background: "#131318" }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: "10px 14px",
                textAlign: "left",
                fontSize: 13,
                color: "#EDEDF5",
                fontWeight: 600,
                borderBottom: "1px solid #222228",
                whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "#131318" : "#1A1A22" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: "10px 14px",
                  fontSize: 13,
                  color: ci === 0 ? "#EDEDF5" : "#9A9AB0",
                  borderBottom: "1px solid #222228",
                  lineHeight: 1.6,
                  fontWeight: ci === 0 ? 600 : 400,
                  whiteSpace: ci === 0 ? "nowrap" : "normal",
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepItem({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 16, alignItems: "flex-start" }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "rgba(56,189,248,0.08)",
        border: "1px solid rgba(56,189,248,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        fontWeight: 600,
        color: "#7DD3FC",
      }}>
        {num}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#EDEDF5", marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "#9A9AB0", lineHeight: 1.6 }}>
          {desc}
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#EDEDF5", marginBottom: 6 }}>
        {q}
      </div>
      <div style={{ fontSize: 14, color: "#9A9AB0", lineHeight: 1.7 }}>
        {a}
      </div>
    </div>
  );
}
