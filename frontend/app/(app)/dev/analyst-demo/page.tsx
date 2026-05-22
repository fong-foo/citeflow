"use client";

import { useState } from "react";
import { ScanAnalystBriefing } from "@/components/scan-analyst-briefing";
import { ScanAnalystReport } from "@/components/scan-analyst-report";

const MOCK_PROBE = {
  brand_profile: {
    brand_name: "Flower Knows",
    one_liner: "环保可持续手机壳品牌",
    inferred_industry: "DTC 消费品牌",
    inferred_target_market: "北美、欧洲",
    value_props: ["100% 可生物降解材料", "独特艺术设计", "每单种植一棵树"],
    differentiators: ["零塑料包装", "碳中和认证"],
    target_personas: ["环保 conscious 年轻消费者", "艺术设计爱好者"],
    tone_keywords: ["环保", "艺术", "年轻", "可持续"],
    full_description: "Flower Knows 是一个将环保理念与艺术设计相结合的可持续手机壳品牌。我们使用100%可生物降解材料，每售出一个产品种植一棵树。",
  },
  citation_metrics: {
    rate: 28,
    industry_rate: 12,
    brand_rate: 85,
    competitor_scenario_rate: 8,
    industry_count: 10,
    brand_count: 10,
    competitor_count: 10,
    recommendation_rate: 18,
    recommended_count: 5,
    top_rate: 3,
    top_count: 1,
    total_queries: 30,
    mentioned_count: 8,
    industry_mentioned: 1,
    brand_mentioned: 7,
    competitor_mentioned: 3,
    source_distribution: {},
    official_site_ratio: 0.35,
    third_party_ratio: 0.65,
  },
  source_authority: {
    total_sources: 18,
    source_diversity: 0.42,
    top_sources: [
      { domain: "flowerknows.com", source_type: "官网", mention_count: 8, authority_score: 40, queries: [] },
      { domain: "reddit.com", source_type: "社区", mention_count: 6, authority_score: 55, queries: [] },
      { domain: "sustainablychic.com", source_type: "博客", mention_count: 4, authority_score: 72, queries: [] },
      { domain: "etsy.com", source_type: "电商", mention_count: 3, authority_score: 60, queries: [] },
      { domain: "instagram.com", source_type: "社交", mention_count: 2, authority_score: 35, queries: [] },
      { domain: "ecowarrior.com", source_type: "媒体", mention_count: 2, authority_score: 78, queries: [] },
      { domain: "pinterest.com", source_type: "社交", mention_count: 1, authority_score: 40, queries: [] },
      { domain: "youtube.com", source_type: "视频", mention_count: 1, authority_score: 50, queries: [] },
    ],
  },
  engine_results: {
    gpt: { engine: "gpt", citation_rate: 8, recommendation_rate: 5, sources: { "reddit.com": 3, "sustainablychic.com": 2 }, queries: [] },
    gemini: { engine: "gemini", citation_rate: 5, recommendation_rate: 3, sources: { "ecowarrior.com": 1, "reddit.com": 1 }, queries: [] },
    haiku: { engine: "haiku", citation_rate: 2, recommendation_rate: 1, sources: { "reddit.com": 1 }, queries: [] },
  },
  gap_report: {
    alignment_score: 45,
    one_line_summary: "AI 将 Flower Knows 描述为艺术环保品牌，但未捕捉到其碳中和认证和零塑料包装等核心竞争力。",
    misaligned: ["碳中和认证未被 AI 提及", "零塑料包装未出现在 AI 描述中"],
    blind_spots: ["B Corp 认证进程", "供应链透明度"],
    opportunities: ["强化碳中和叙事", "与环保媒体建立合作"],
    aligned: ["环保定位", "艺术设计"],
  },
  competitor_mentions: [
    { brand: "Casetify", mention_count: 15 },
    { brand: "Pela Case", mention_count: 12 },
    { brand: "OtterBox", mention_count: 8 },
    { brand: "Wildflower", mention_count: 5 },
  ],
  competitor_analysis: [
    {
      query: "best eco friendly phone case",
      winner: "Pela Case",
      reason: "Pela Case 在环保认证和降解材料方面更有说服力",
      competitor_refs: ["Pela Case", "Casetify"],
      dimension_scores: [
        {
          dimension: "环保可持续",
          rankings: [
            { brand: "Flower Knows", rank: 2, score: 65, summary: "有环保叙事但缺乏第三方认证背书", source_quote: "" },
            { brand: "Pela Case", rank: 1, score: 92, summary: "行业环保标杆，B Corp认证", source_quote: "" },
            { brand: "Casetify", rank: 3, score: 55, summary: "有回收计划但力度有限", source_quote: "" },
          ],
          importance: "high",
        },
        {
          dimension: "设计美学",
          rankings: [
            { brand: "Flower Knows", rank: 1, score: 88, summary: "独特艺术风格广受好评", source_quote: "" },
            { brand: "Pela Case", rank: 3, score: 60, summary: "设计简约但缺乏个性化", source_quote: "" },
            { brand: "Casetify", rank: 2, score: 75, summary: "联名设计丰富", source_quote: "" },
          ],
          importance: "high",
        },
      ],
    },
    {
      query: "most stylish sustainable phone case",
      winner: "Flower Knows",
      reason: "Flower Knows 的艺术设计在可持续品类中独树一帜",
      competitor_refs: ["Pela Case", "Wildflower"],
      dimension_scores: [
        {
          dimension: "设计美学",
          rankings: [
            { brand: "Flower Knows", rank: 1, score: 90, summary: "独树一帜的艺术风格", source_quote: "" },
            { brand: "Pela Case", rank: 2, score: 58, summary: "设计偏保守", source_quote: "" },
          ],
          importance: "high",
        },
        {
          dimension: "品牌知名度",
          rankings: [
            { brand: "Flower Knows", rank: 3, score: 25, summary: "社交媒体有存在但主流认知度低", source_quote: "" },
            { brand: "Pela Case", rank: 1, score: 78, summary: "环保品类第一提及率", source_quote: "" },
            { brand: "Wildflower", rank: 2, score: 55, summary: "名人带货认知度高", source_quote: "" },
          ],
          importance: "medium",
        },
      ],
    },
  ],
  company_score: {
    overall: 48,
    industry: "DTC 消费品牌",
    weights_used: { "内容力": 0.25, "品牌力": 0.25, "技术力": 0.2, "产品力": 0.2, "市场力": 0.1 },
    dimensions: [
      { name: "内容力", score: 45, evidence: "官网内容偏少，博客更新频率低", suggestion: "" },
      { name: "品牌力", score: 55, evidence: "社交媒体有一定影响力", suggestion: "" },
      { name: "技术力", score: 40, evidence: "网站SEO基础薄弱", suggestion: "" },
      { name: "产品力", score: 60, evidence: "产品设计独特，环保属性明确", suggestion: "" },
      { name: "市场力", score: 35, evidence: "北美市场存在感低", suggestion: "" },
    ],
  },
};

export default function AnalystDemoPage() {
  const [result, setResult] = useState<any>(null);

  if (result) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0F" }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#EDEDF5" }}>Analyst Demo</p>
            <p className="text-[10px] font-mono" style={{ color: "#5E5E78" }}>Mock Probe Data → 诊断报告</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
            REPORT
          </span>
        </div>
        <ScanAnalystReport
          data={{ probe: MOCK_PROBE, ...result }}
          onBackToBriefing={() => setResult(null)}
          onViewDoctor={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0A0A0F" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: "#EDEDF5" }}>Analyst Demo</p>
          <p className="text-[10px] font-mono" style={{ color: "#5E5E78" }}>Mock Probe Data → 军师阅卷</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
          MOCK
        </span>
      </div>

      {/* Briefing component fills remaining height */}
      <div className="flex-1 flex flex-col min-h-0 px-4 py-4">
        <ScanAnalystBriefing
          probeOutput={MOCK_PROBE}
          onComplete={(output) => {
            console.log("Analyst output:", output);
            setResult(output);
          }}
          onScanningChange={() => {}}
        />
      </div>
    </div>
  );
}
