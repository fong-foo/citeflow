"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ScanDoctorBriefing } from "@/components/scan-doctor-briefing";
import { ScanDoctorGenerating } from "@/components/scan-doctor-generating";
import { ScanPrescriptionSteps } from "@/components/scan-prescription-steps";

const MOCK_DATA = {
  diagnosis: {
    core_problem: "AI 引用率显著低于品类平均水平，竞品在推荐结果中占据主导位置",
    problem_detail: "品牌在A类行业查询中的被引用率仅25%，而竞品Petal Poetry达到60%。官网内容与AI搜索查询意图存在语义缺口。",
    severity: "warning",
  },
  three_layer_chain: {
    observation: "A类行业查询中品牌被引用率仅25%，而竞品Petal Poetry达到60%。",
    explanation: "官网内容与AI搜索查询意图存在语义缺口，品牌信息未有效触达AI模型。",
    implication: "若不修复，品牌在AI驱动的购买决策中将被竞品持续替代。",
  },
  competitor_gap: {
    losing_dimensions: [
      { dimension: "内容可见性", competitor: "Petal Poetry", gap: 35 },
      { dimension: "权威引用", competitor: "Candy Crush Beauty", gap: 28 },
      { dimension: "产品对比", competitor: "Dream Glow", gap: 15 },
    ],
    root_cause: "竞品通过结构化数据和权威媒体引用建立了更强的AI存在感。",
  },
  one_line_verdict: "品牌在AI搜索中存在感薄弱，行业引用率低于品类均值，需系统性优化内容与权威建设。",
  _triggered_rules: [
    { rule_id: 2, name: "品牌隐形", severity: "warning" },
    { rule_id: 3, name: "引用源质量差", severity: "warning" },
    { rule_id: 10, name: "行业影响力弱", severity: "warning" },
  ],
  probe: {
    brand_profile: {
      brand_name: "Flower Knows",
      inferred_industry: "彩妆（Color Cosmetics）",
      inferred_target_market: "北美、欧洲",
      inferred_core_product: "少女风格彩妆产品",
    },
    citation_metrics: { industry_rate: 25, recommendation_rate: 12, top_rate: 8 },
    source_authority: {
      total_sources: 15,
      source_diversity: 0.45,
      top_sources: [
        { domain: "reddit.com", source_type: "社区", authority_score: 45, mention_count: 8 },
        { domain: "amazon.com", source_type: "电商", authority_score: 60, mention_count: 5 },
      ],
    },
  },
};

const MOCK_PRESCRIPTION = {
  prescription: [
    {
      priority: "P0",
      category: "技术优化",
      target_page: "/products 及各产品详情页",
      action: "为每个产品页面添加 FAQPage Schema 结构化数据",
      what_to_add: [
        "Q: 'How does Flower Knows compare to Petal Poetry?' A: 包含价格对比、配方成分、用户评价数据",
        "Q: 'Is Flower Knows cruelty-free?' A: 引用认证信息",
        "Q: 'What is the best Flower Knows palette?' A: 精确推荐，含使用场景",
      ],
      evidence: "论文6, Section 4.4: 宏观结构贡献44.9%",
      expected_impact: "A类引用率从25%提升至35-40%",
      timeline: "1-2周",
      difficulty: "低",
      how_to_verify: "复查时检查规则2是否仍触发，A类引用率是否>30%",
    },
    {
      priority: "P0",
      category: "权威建设",
      target_page: "外部平台（Trustpilot + Sephora Reviews）",
      action: "在 Trustpilot 建立品牌页面，目标积累30+条真实评价",
      what_to_add: [
        "注册 Trustpilot 企业账号，完善品牌信息和产品分类",
        "从现有客户中筛选100个活跃用户发送评价邀请",
        "前20条评价提供折扣码激励",
        "在官网添加 Trustpilot 评价徽章",
      ],
      evidence: "论文17: Earned Media权威信号",
      expected_impact: "高权威源占比从12%提升至35%+",
      timeline: "2-3个月",
      difficulty: "中",
      how_to_verify: "复查时检查规则3是否仍触发，source_authority中高权威源数量",
    },
    {
      priority: "P1",
      category: "内容优化",
      target_page: "/blog（新建）及行业媒体投稿",
      action: "发布3篇彩妆行业深度对比报告",
      what_to_add: [
        "文章1: 'Flower Knows vs Petal Poetry: 2026 Color Cosmetics Comparison'",
        "文章2: 'Best Cruelty-Free Makeup Brands 2026'",
        "文章3: 'Complete Guide to Asian Beauty Brands'",
        "每篇文章：1500+字、含数据表格、引用行业标准、有明确结论",
      ],
      evidence: "论文1, Section 4: Statistics Addition提升15-30%可见性",
      expected_impact: "A类引用率从35%提升至45%+",
      timeline: "1-2个月",
      difficulty: "中",
      how_to_verify: "复查时检查规则10是否仍触发",
    },
    {
      priority: "P1",
      category: "内容优化",
      target_page: "/about 及首页",
      action: "重写品牌定位，从'少女彩妆'升级为'高品质梦幻彩妆'",
      what_to_add: [
        "About页首段：加入品牌故事和设计理念",
        "首页Hero：加入数值事实（'1M+ happy customers'、'50+ countries'）",
        "添加'As seen in'板块：展示媒体评测和行业认可",
      ],
      evidence: "论文4, Section 5: Algorithmic Omnipresence战略",
      expected_impact: "B类AI认知从'平价少女'升级为'高品质梦幻'",
      timeline: "2-3周",
      difficulty: "低",
      how_to_verify: "复查时检查B类查询的AI描述是否包含'premium'、'quality'等关键词",
    },
    {
      priority: "P1",
      category: "社区运营",
      target_page: "Reddit r/MakeupAddiction + r/AsianBeauty",
      action: "在 Reddit 美妆社区参与讨论，建立品牌存在感",
      what_to_add: [
        "在 r/MakeupAddiction 分享产品试色和使用体验",
        "在 r/AsianBeauty 参与亚洲美妆品牌讨论",
        "参与'best palette'、'cruelty-free makeup'讨论",
        "不要硬推品牌，以美妆爱好者身份参与讨论",
      ],
      evidence: "论文5, Section 3.4: Reddit社区存在预测Perplexity可见性",
      expected_impact: "Perplexity引用率提升5-10个百分点",
      timeline: "1-2个月持续",
      difficulty: "低",
      how_to_verify: "复查时检查Perplexity引擎引用率是否提升",
    },
    {
      priority: "P2",
      category: "社区运营",
      target_page: "Quora + 小红书",
      action: "在 Quora 回答彩妆相关问题，在小红书发布品牌内容",
      what_to_add: [
        "搜索 Quora 上'best Korean makeup'、'cruelty-free cosmetics'等高流量问题",
        "用专业角度回答，引用产品测试和用户反馈",
        "在小红书建立品牌官方账号，发布试色和教程内容",
        "目标：每月 Quora 10-15条回答，小红书 20+篇内容",
      ],
      evidence: "论文5, Section 3.4: 社区存在和SEO基础预测可见性",
      expected_impact: "长尾查询引用率提升5-8个百分点",
      timeline: "2-3个月持续",
      difficulty: "低",
      how_to_verify: "复查时检查长尾查询中品牌是否被提及",
    },
  ],
  summary: "Flower Knows 产品力过硬但AI不认识你。核心策略：先让AI能找到你（Schema+爬虫）→ 再让AI信任你（Trustpilot评价+行业报告）→ 最后让AI推荐你（内容优化+社区运营）。预计90天内A类引用率从25%提升至45%+。",
  knowledge_sources: [
    "论文1 (arXiv:2311.09735) — GEO奠基方法论",
    "论文3 (arXiv:2604.25707) — 引用吸收框架",
    "论文4 (arXiv:2601.00869) — 文化编码与品牌存在",
    "论文5 (arXiv:2601.00912) — 创业公司可见性",
    "论文6 (arXiv:2603.29979) — 结构特征工程",
    "论文17 (arXiv:2603.12282) — 合规信号与权威乘数",
  ],
};

type DemoPhase = "briefing" | "generating" | "report";

export default function DoctorDemoPage() {
  const [phase, setPhase] = useState<DemoPhase>("briefing");
  const [prescription, setPrescription] = useState<any>(null);

  function handleComplete(doctorOutput: any) {
    setPrescription(doctorOutput);
    setPhase("generating");
    // 模拟生成动画后跳到 report（4 张卡片 × 600ms + 600ms buffer）
    setTimeout(() => {
      setPhase("report");
    }, 3000);
  }

  function handleGenerateDemo() {
    // Demo mode: skip actual API call, use mock data
    handleComplete(MOCK_PRESCRIPTION);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0F" }}>
      {/* Demo banner */}
      <div
        className="flex items-center justify-between px-6 py-2.5"
        style={{ background: "rgba(245,158,11,0.06)", borderBottom: "1px solid rgba(245,158,11,0.12)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#F59E0B", boxShadow: "0 0 6px rgba(245,158,11,0.5)" }}
          />
          <span className="text-[10px] font-mono tracking-wider" style={{ color: "#FBBF24" }}>
            DEMO MODE
          </span>
        </div>
        <div className="flex items-center gap-3">
          {(["briefing", "generating", "report"] as DemoPhase[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPhase(p); if (p === "report") setPrescription(MOCK_PRESCRIPTION); }}
              className="text-[10px] font-mono tracking-wide px-2 py-1 transition-all"
              style={{
                color: phase === p ? "#FBBF24" : "#5E5E78",
                background: phase === p ? "rgba(245,158,11,0.1)" : "transparent",
                border: phase === p ? "1px solid rgba(245,158,11,0.18)" : "1px solid transparent",
              }}
            >
              {p === "briefing" ? "Briefing" : p === "generating" ? "Generating" : "Report"}
            </button>
          ))}
        </div>
      </div>

      {/* Phase content */}
      <div className="flex-1 flex flex-col">
        {phase === "briefing" && (
          <ScanDoctorBriefing
            data={MOCK_DATA}
            onComplete={handleGenerateDemo}
          />
        )}

        {phase === "generating" && (
          <ScanDoctorGenerating />
        )}

        {phase === "report" && (
          <div className="max-w-[720px] mx-auto pt-4 w-full">
            <ScanPrescriptionSteps
              prescription={prescription?.prescription || MOCK_PRESCRIPTION.prescription}
              summary={prescription?.summary || MOCK_PRESCRIPTION.summary}
              domain="flowerknows.com"
              showHeader={true}
              onRegenerate={() => { setPrescription(null); setPhase("briefing"); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
