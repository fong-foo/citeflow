"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanDiagnosisSummary } from "@/components/scan-diagnosis-summary";
import { ScanPrescriptionSteps } from "@/components/scan-prescription-steps";
import { ScanCompetitorChart, type ChartLine } from "@/components/scan-competitor-chart";
import { LockedSection } from "@/components/locked-section";
import { PreviewModal, type PreviewModule } from "@/components/preview-modal";
import { userKey, type Tier, type ScanMode } from "@/lib/storage";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props {
  data: any;
  tier: Tier;
  mode: ScanMode;
  domain: string;
  brandName: string;
  lastScanTime: string;
  onViewReport: () => void;
  onUpgrade: (feature?: "probe" | "analyst" | "doctor") => void;
  onNavigateToStep?: (step: "analyst" | "doctor") => void;
}

const STEPS = [
  { id: "input", label: "初步体检" },
  { id: "probe", label: "Probe 侦察兵" },
  { id: "analyst", label: "Analyst 诊断师" },
  { id: "doctor", label: "Doctor 处方" },
];

const DASH_NAV_GROUPS = [
  {
    id: "overview",
    label: "品牌概览",
    items: [
      { id: "dash-score", label: "综合评分" },
      { id: "dash-citation", label: "引用率分析" },
      { id: "dash-competitors", label: "竞品对比" },
    ],
  },
  {
    id: "ai-cognition",
    label: "AI认知",
    items: [
      { id: "dash-perception", label: "AI认知画像" },
      { id: "dash-engines", label: "引擎对比" },
      { id: "dash-gap", label: "认知差距" },
      { id: "dash-sources", label: "引用来源分析" },
    ],
  },
  {
    id: "data-insight",
    label: "数据洞察",
    items: [
      { id: "dash-comp-dimension", label: "竞品维度对比" },
      { id: "dash-diagnosis", label: "品牌诊断" },
      { id: "dash-progress", label: "体检进度" },
    ],
  },
];

const DASH_PRODUCTS = [
  { id: "dash-analyst", label: "Analyst 诊断师", icon: "📊" },
  { id: "dash-doctor", label: "Doctor 处方", icon: "💊" },
];

// Mock data for locked diagnosis — shows what users would see if they upgrade
const LOCKED_DIAGNOSIS = {
  diagnosis: {
    severity: "warning",
    core_problem: "AI 引用率显著低于品类平均水平",
    problem_detail: "品牌在行业通用查询中的存在感不足，竞品在推荐结果中占据主导位置。",
  },
  threeLayerChain: {
    observation: "A类行业查询中品牌被引用率仅 x%，而竞品 y 达到 z%。",
    explanation: "官网内容与AI搜索查询意图存在语义缺口，品牌信息未有效触达AI模型。",
    implication: "若不修复，品牌在AI驱动的购买决策中将被竞品持续替代，市场份额逐步流失。",
  },
  competitorGap: {
    losing_dimensions: ["内容可见性", "权威引用", "产品对比"],
    root_cause: "竞品通过结构化数据和权威媒体引用建立了更强的AI存在感，品牌在这些维度的投入明显不足。",
  },
  alignmentScore: 38,
  alignmentSummary: "品牌自认为是高端创新领导者，但AI认知将其归类为通用制造商。",
  verdict: "品牌在AI搜索中存在感薄弱，行业引用率低于品类均值，需系统性优化内容与权威建设。",
};

const LOCKED_PRESCRIPTION = [
  { priority: "P0", category: "技术优化", action: "部署 Schema.org 结构化数据，提升AI对产品页的理解" },
  { priority: "P0", category: "内容优化", action: "重写核心产品页，对齐AI搜索的高频查询意图" },
  { priority: "P1", category: "权威建设", action: "获取行业权威媒体的产品评测与引用" },
  { priority: "P1", category: "内容优化", action: "创建品类对比指南，覆盖用户决策关键维度" },
  { priority: "P2", category: "社区运营", action: "在 Reddit 相关子版块建立品牌专业讨论存在" },
];

const LOCKED_RX_SUMMARY = "执行以上 5 项任务，预计 4-8 周内行业引用率可提升 10-15 个百分点。";

// Mock data for locked Probe sections — shows what users would see if they upgrade
const LOCKED_AI_PERCEPTION = {
  identity: "AI 认为你的品牌是一个________领域的________类型企业，主要面向________市场。",
  strengths: ["在特定场景下有一定品牌认知度", "产品在某些维度上具备差异化特征", "用户口碑中有部分正向反馈"],
  weaknesses: ["品牌在行业通用查询中曝光不足", "AI 搜索结果中品牌信息较为模糊", "与竞品相比缺乏清晰的差异化标签"],
  idealDescription: "品牌在AI认知中尚未形成明确画像，建议升级Probe侦察兵获取完整AI认知分析，了解AI如何描述你的品牌及其优劣势。",
  keywords: ["行业通用", "中等认知", "待明确"],
};

const LOCKED_ENGINE_COMPARISON = {
  gpt: { citation_rate: 42, recommendation_rate: 25 },
  gemini: { citation_rate: 38, recommendation_rate: 20 },
  haiku: { citation_rate: 35, recommendation_rate: 18 },
};

const LOCKED_GAP_REPORT = {
  alignment_score: 45,
  aligned: ["品牌名称被AI正确识别"],
  misaligned: ["品牌定位与AI认知存在偏差", "核心产品在AI回答中未被提及"],
  blind_spots: ["AI对品牌优势的描述不够具体", "品牌差异化特征未在搜索结果中体现"],
  one_line_summary: "品牌自述与AI认知存在中等程度偏差，核心定位未有效触达AI模型。",
};

function safeNum(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* ═══════════════════════════════════════════
   Section header — instrument-panel label
   ═══════════════════════════════════════════ */
function SectionLabel({ children, accent = true }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {accent && (
        <span
          className="block w-1 h-3 rounded-full shrink-0"
          style={{ background: "linear-gradient(180deg, #38BDF8 0%, rgba(56,189,248,0.15) 100%)" }}
        />
      )}
      <span
        className="text-[10px] font-mono tracking-[0.15em] uppercase"
        style={{ color: accent ? "rgba(56,189,248,0.50)" : "rgba(255,255,255,0.18)" }}
      >
        {children}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Metric card — instrument readout
   ═══════════════════════════════════════════ */
function MetricCard({
  label,
  value,
  suffix,
  highlight,
  delay = 0,
}: {
  label: string;
  value: number;
  suffix: string;
  highlight?: boolean;
  delay?: number;
}) {
  const displayValue = Number.isInteger(value) ? value : value.toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      className="relative p-5 text-center overflow-hidden"
      style={{
        background: highlight
          ? "linear-gradient(180deg, rgba(56,189,248,0.06) 0%, rgba(56,189,248,0.015) 100%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
        border: highlight
          ? "1px solid rgba(56,189,248,0.14)"
          : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Top accent line for highlight card */}
      {highlight && (
        <div
          className="absolute top-0 left-4 right-4 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.3), transparent)" }}
        />
      )}
      <p
        className="text-3xl font-light tracking-tight mb-1.5"
        style={{
          color: highlight ? "#7DD3FC" : "#EDEDF5",
          fontFamily: "'JetBrains Mono', var(--font-mono), monospace",
        }}
      >
        {displayValue}
        <span className="text-sm ml-0.5" style={{ color: "#5E5E78", fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
          {suffix}
        </span>
      </p>
      <p className="text-[11px] tracking-wide" style={{ color: "#5E5E78" }}>{label}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Evidence section — why is my score low?
   ═══════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════
   Paid feature teaser card
   ═══════════════════════════════════════════ */
function UnlockCard({
  icon,
  title,
  desc,
  detail,
  unlocked,
}: {
  icon: string;
  title: string;
  desc: string;
  detail?: string;
  unlocked?: boolean;
}) {
  return (
    <div
      className="p-5 text-center relative overflow-hidden"
      style={{
        background: unlocked
          ? "linear-gradient(180deg, rgba(34,197,94,0.05) 0%, rgba(34,197,94,0.01) 100%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
        border: unlocked
          ? "1px solid rgba(34,197,94,0.12)"
          : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {unlocked && (
        <div
          className="absolute top-0 left-4 right-4 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.2), transparent)" }}
        />
      )}
      <p className="text-lg mb-2">{icon}</p>
      <p className="text-sm font-medium mb-0.5" style={{ color: "#EDEDF5" }}>{title}</p>
      <p className="text-xs" style={{ color: "#9A9AB0" }}>{desc}</p>
      {detail && <p className="text-[10px] mt-1" style={{ color: "#5E5E78" }}>{detail}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Competitor dimension comparison table
   ═══════════════════════════════════════════ */
function CompetitorDimensionComparison({
  competitorAnalysis,
  brandName,
}: {
  competitorAnalysis: any[];
  brandName: string;
}) {
  if (!competitorAnalysis || competitorAnalysis.length === 0) return null;

  const dimensionMap: Record<string, { brandScores: Record<string, number[]>; importance: string }> = {};

  competitorAnalysis.forEach((ca: any) => {
    if (!ca.dimension_scores) return;
    ca.dimension_scores.forEach((ds: any) => {
      if (!dimensionMap[ds.dimension]) {
        dimensionMap[ds.dimension] = { brandScores: {}, importance: ds.importance || "medium" };
      }
      ds.rankings?.forEach((r: any) => {
        if (!dimensionMap[ds.dimension].brandScores[r.brand]) {
          dimensionMap[ds.dimension].brandScores[r.brand] = [];
        }
        if (r.score != null) {
          dimensionMap[ds.dimension].brandScores[r.brand].push(r.score);
        }
      });
    });
  });

  const dimensions = Object.keys(dimensionMap);
  if (dimensions.length === 0) return null;

  const allBrands = new Set<string>();
  dimensions.forEach((dim) => {
    Object.keys(dimensionMap[dim].brandScores).forEach((b) => allBrands.add(b));
  });
  const brands = Array.from(allBrands).slice(0, 4);

  const avgScores: Record<string, Record<string, number>> = {};
  dimensions.forEach((dim) => {
    avgScores[dim] = {};
    brands.forEach((brand) => {
      const scores = dimensionMap[dim].brandScores[brand] || [];
      avgScores[dim][brand] = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    });
  });

  const winners: Record<string, string> = {};
  dimensions.forEach((dim) => {
    let maxScore = 0;
    let winner = "";
    brands.forEach((brand) => {
      if (avgScores[dim][brand] > maxScore) {
        maxScore = avgScores[dim][brand];
        winner = brand;
      }
    });
    winners[dim] = winner;
  });

  const winCount: Record<string, number> = {};
  brands.forEach((b) => (winCount[b] = 0));
  Object.values(winners).forEach((w) => {
    if (winCount[w] !== undefined) winCount[w]++;
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.32 }}
      className="px-7 py-7 flex-shrink-0 min-w-0"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <SectionLabel>竞品维度对比</SectionLabel>

      <div className="rounded-sm overflow-hidden mb-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div
          className="grid gap-2 px-4 py-2 text-[10px] font-mono tracking-wider uppercase"
          style={{
            gridTemplateColumns: `1fr ${brands.map(() => "60px").join(" ")}`,
            color: "rgba(255,255,255,0.3)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span>维度</span>
          {brands.map((b, i) => (
            <span key={i} className="text-center">{b === brandName ? "你" : b.slice(0, 8)}</span>
          ))}
        </div>

        {dimensions.slice(0, 6).map((dim, i) => {
          const isHigh = dimensionMap[dim].importance === "high";
          return (
            <div
              key={i}
              className="grid gap-2 px-4 py-2 text-xs"
              style={{
                gridTemplateColumns: `1fr ${brands.map(() => "60px").join(" ")}`,
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                borderBottom: i < dimensions.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
              }}
            >
              <span className="flex items-center gap-1.5" style={{ color: isHigh ? "#F59E0B" : "#9A9AB0" }}>
                {isHigh && <span className="w-1 h-1 rounded-full" style={{ background: "#F59E0B" }} />}
                {dim}
              </span>
              {brands.map((brand, j) => {
                const score = avgScores[dim][brand];
                const isWinner = winners[dim] === brand;
                const isBrand = brand === brandName;
                return (
                  <span
                    key={j}
                    className="text-center font-mono"
                    style={{
                      color: isWinner ? "#22C55E" : isBrand ? "#38BDF8" : "#9A9AB0",
                      fontWeight: isWinner ? 600 : 400,
                    }}
                  >
                    {score || "—"}
                    {isWinner && " ✓"}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.14)" }}>
          胜出统计
        </span>
        {brands.map((brand, i) => (
          <span key={i} className="text-xs" style={{ color: brand === brandName ? "#38BDF8" : "#9A9AB0" }}>
            {brand === brandName ? "你" : brand}: <span className="font-mono">{winCount[brand]}</span> 次
          </span>
        ))}
      </div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   Brand diagnosis — strengths / weaknesses
   ═══════════════════════════════════════════ */
function BrandDiagnosis({
  companyEvaluation,
}: {
  companyEvaluation: any;
}) {
  if (!companyEvaluation) return null;

  const { overall, strengths, weaknesses, positioning } = companyEvaluation;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.34 }}
      className="px-7 py-7 flex-shrink-0 min-w-0"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <SectionLabel>品牌诊断</SectionLabel>

      {overall && (
        <div className="mb-5">
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.14)" }}>
            整体评价
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#C8C8D8" }}>
            {overall}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "#22C55E" }}>
            ✓ 优势
          </p>
          <div className="space-y-1.5">
            {strengths && strengths.length > 0 ? (
              strengths.map((s: string, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 text-xs"
                  style={{
                    background: "rgba(34,197,94,0.03)",
                    border: "1px solid rgba(34,197,94,0.06)",
                  }}
                >
                  <span style={{ color: "#22C55E" }}>•</span>
                  <span style={{ color: "#C8C8D8" }}>{s}</span>
                </div>
              ))
            ) : (
              <p className="text-xs pl-3" style={{ color: "#5E5E78" }}>暂无数据</p>
            )}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "#EF4444" }}>
            ✗ 劣势
          </p>
          <div className="space-y-1.5">
            {weaknesses && weaknesses.length > 0 ? (
              weaknesses.map((w: string, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 text-xs"
                  style={{
                    background: "rgba(239,68,68,0.03)",
                    border: "1px solid rgba(239,68,68,0.06)",
                  }}
                >
                  <span style={{ color: "#EF4444" }}>•</span>
                  <span style={{ color: "#C8C8D8" }}>{w}</span>
                </div>
              ))
            ) : (
              <p className="text-xs pl-3" style={{ color: "#5E5E78" }}>暂无数据</p>
            )}
          </div>
        </div>
      </div>

      {positioning && (
        <div>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.14)" }}>
            品牌定位
          </p>
          <div
            className="px-4 py-3 text-sm"
            style={{
              background: "rgba(56,189,248,0.03)",
              border: "1px solid rgba(56,189,248,0.08)",
              color: "#7DD3FC",
            }}
          >
            {positioning}
          </div>
        </div>
      )}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   Source authority analysis
   ═══════════════════════════════════════════ */
function SourceAuthoritySection({
  sourceAuthority,
}: {
  sourceAuthority: any;
}) {
  if (!sourceAuthority || !sourceAuthority.top_sources || sourceAuthority.top_sources.length === 0) return null;

  const { top_sources, total_sources, source_diversity } = sourceAuthority;

  const diversityLabel = source_diversity >= 0.7 ? "高" : source_diversity >= 0.4 ? "中等" : "低";
  const diversityColor = source_diversity >= 0.7 ? "#22C55E" : source_diversity >= 0.4 ? "#F59E0B" : "#EF4444";

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.36 }}
      className="px-7 py-7 flex-shrink-0 min-w-0"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <SectionLabel>引用来源分析</SectionLabel>

      <div className="rounded-sm overflow-hidden mb-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div
          className="grid gap-3 px-4 py-2 text-[10px] font-mono tracking-wider uppercase"
          style={{
            gridTemplateColumns: "1fr 80px 60px 60px",
            color: "rgba(255,255,255,0.3)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span>来源</span>
          <span>类型</span>
          <span className="text-center">权威度</span>
          <span className="text-center">提及</span>
        </div>

        {top_sources.slice(0, 8).map((s: any, i: number) => (
          <div
            key={i}
            className="grid gap-3 px-4 py-2 text-xs"
            style={{
              gridTemplateColumns: "1fr 80px 60px 60px",
              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              borderBottom: i < top_sources.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
            }}
          >
            <span className="font-mono" style={{ color: "#38BDF8" }}>{s.domain}</span>
            <span style={{ color: "#9A9AB0" }}>{s.source_type || "—"}</span>
            <span className="text-center font-mono" style={{ color: "#EDEDF5" }}>{s.authority_score ?? "—"}</span>
            <span className="text-center font-mono" style={{ color: "#EDEDF5" }}>{s.mention_count ?? "—"}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs" style={{ color: "#9A9AB0" }}>
          来源总数：<span className="font-mono" style={{ color: "#EDEDF5" }}>{total_sources ?? "—"}</span>
        </span>
        <span className="text-xs" style={{ color: "#9A9AB0" }}>
          多样性：
          <span className="font-mono" style={{ color: diversityColor }}>
            {source_diversity != null ? (source_diversity * 100).toFixed(0) : "—"}%
          </span>
          <span className="ml-1" style={{ color: "#5E5E78" }}>（{diversityLabel}）</span>
        </span>
      </div>
    </motion.section>
  );
}

export function ScanDashboard({ data, tier, mode, domain, brandName, lastScanTime, onViewReport, onUpgrade, onNavigateToStep }: Props) {
  const isFree = tier === "free";
  const isPaid = tier === "full";
  const probe = data?.probe || data || {};

  // ── Preview modal state ──
  const [previewModule, setPreviewModule] = useState<PreviewModule | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  function buildPreview(moduleId: string): PreviewModule | null {
    const bp = probe?.brand_profile || {};
    const citation = probe?.citation_metrics || {};
    const comps = probe?.competitor_mentions || [];
    const topComp = comps[0];

    const configs: Record<string, PreviewModule> = {
      ai_perception: {
        id: "ai_perception",
        title: "AI认知画像",
        description: "了解 AI 搜索引擎如何描述你的品牌，以及你应该被如何描述。",
        features: [
          "AI 怎么描述你的品牌（实际输出）",
          "AI 理想中你应该是什么形象",
          "你的品牌关键词是什么",
          "你的品牌调性是什么",
        ],
        previewData: bp.one_liner ? {
          label: "品牌定位",
          value: bp.one_liner,
        } : undefined,
        previewTemplate: {
          type: "ai_perception",
          data: {
            aiDescription: "Flower Knows 是一个专注于环保手机壳的品牌，主打可持续生活方式，目标客户是关注环保的年轻消费者。",
            idealDescription: "一个在AI搜索中被频繁引用的环保手机壳品牌，以创新设计和可持续材料著称，被推荐为环保消费者的首选。",
            keywords: ["环保手机壳", "可持续", "生物降解", "创新设计", "年轻消费者"],
            tone: "专业、环保、创新、年轻",
          },
        },
        price: "¥50/次",
        priceDetail: "包含：AI认知画像 + 引擎对比 + 认知差距",
      },
      engine_comparison: {
        id: "engine_comparison",
        title: "引擎对比 · 交叉验证",
        description: "对比 ChatGPT、Gemini、Claude 三大 AI 引擎对你的引用情况。",
        features: [
          "各引擎的引用率对比",
          "各引擎的推荐率对比",
          "各引擎的来源偏好",
          "引擎差异分析",
        ],
        previewData: citation.industry_rate != null ? {
          label: "ChatGPT 行业引用率",
          value: `${safeNum(citation.industry_rate)}%`,
        } : undefined,
        previewTemplate: {
          type: "engine_comparison",
          data: {
            engines: [
              { name: "ChatGPT", citationRate: 25, recommendationRate: 12, topSources: ["reddit.com", "amazon.com"] },
              { name: "Gemini", citationRate: 20, recommendationRate: 10, topSources: ["trustpilot.com", "youtube.com"] },
              { name: "Claude", citationRate: 22, recommendationRate: 11, topSources: ["reddit.com", "g2.com"] },
            ],
            insight: "ChatGPT 引用率最高，但推荐率偏低；Gemini 偏好评测平台；Claude 来源最均衡。",
          },
        },
        price: "¥50/次",
        priceDetail: "包含：AI认知画像 + 引擎对比 + 认知差距",
      },
      gap_report: {
        id: "gap_report",
        title: "认知差距",
        description: "对比品牌自述与 AI 认知的差距，找到改进方向。",
        features: [
          "品牌自述 vs AI 认知的对齐度",
          "具体差距分析",
          "改进建议",
        ],
        previewData: undefined,
        previewTemplate: {
          type: "gap_report",
          data: {
            alignmentScore: 45,
            aligned: ["品牌定位清晰", "核心产品明确"],
            misaligned: ["AI 认为你是'便宜货'，但你想做'高端环保'", "AI 没有提到你的设计优势"],
            blindSpots: ["竞品在社交媒体上的提及率是你的3倍", "AI 搜索中几乎没有你的第三方评测"],
            summary: "品牌自述与 AI 认知存在较大差距，主要在品牌定位和产品优势两个维度。",
          },
        },
        price: "¥50/次",
        priceDetail: "包含：AI认知画像 + 引擎对比 + 认知差距",
      },
      competitor_dimension: {
        id: "competitor_dimension",
        title: "竞品维度对比",
        description: "你的品牌 vs 竞品在多个维度的雷达图对比。",
        features: [
          "竞品在哪些维度赢了你",
          "你在哪些维度有优势",
          "各维度的差距有多大",
          "优先改进哪个维度",
        ],
        previewData: topComp ? {
          label: "提及最多的竞品",
          value: `${topComp.brand || "—"}（提及 ${topComp.mention_count || 0} 次）`,
        } : undefined,
        price: "¥50/次",
        priceDetail: "包含：AI认知画像 + 引擎对比 + 认知差距",
      },
      brand_diagnosis: {
        id: "brand_diagnosis",
        title: "品牌诊断",
        description: "基于 AI 数据的品牌优势/劣势/机会分析。",
        features: [
          "品牌优势分析",
          "品牌劣势识别",
          "改进机会点",
          "行业定位对比",
        ],
        previewData: bp.inferred_industry ? {
          label: "推断行业",
          value: bp.inferred_industry,
        } : undefined,
        price: "¥50/次",
        priceDetail: "包含：AI认知画像 + 引擎对比 + 认知差距",
      },
      source_authority: {
        id: "source_authority",
        title: "引用来源分析",
        description: "分析哪些来源在引用你的品牌，以及这些来源的权威度。",
        features: [
          "来源总数与多样性",
          "来源权威度分布",
          "高权威来源占比",
          "低质量来源警告",
        ],
        previewData: citation.total_queries != null ? {
          label: "扫描覆盖",
          value: `${citation.total_queries} 个查询 · ${citation.engines_queried?.length || 1} 个引擎`,
        } : undefined,
        price: "¥50/次",
        priceDetail: "包含：AI认知画像 + 引擎对比 + 认知差距",
      },
      diagnosis: {
        id: "diagnosis",
        title: "Analyst 诊断报告",
        description: "14条自研规则逐条诊断，定位根因，对比竞品差距。",
        features: [
          "14条规则逐条检查",
          "核心问题定位",
          "竞品差距分析",
          "一句话诊断",
        ],
        previewData: undefined,
        previewTemplate: {
          type: "diagnosis",
          data: {
            verdict: "AI引用率显著低于品类平均水平，竞品在推荐结果中占据主导位置。",
            observation: "A类行业查询中品牌被引用率仅 25%，而竞品 Pela Case 达到 60%。",
            explanation: "官网内容与AI搜索查询意图存在语义缺口，品牌信息未有效触达AI模型。",
            implication: "若不修复，品牌在AI驱动的购买决策中将被竞品持续替代，市场份额逐步流失。",
            losingDimensions: [
              { dimension: "环保可持续", competitor: "Pela Case", gap: 25 },
              { dimension: "品牌知名度", competitor: "Casetify", gap: 15 },
            ],
            winningDimensions: [
              { dimension: "设计感", competitor: "Pela Case", gap: 10 },
              { dimension: "性价比", competitor: "Casetify", gap: 20 },
            ],
          },
        },
        price: "¥299/月",
        priceDetail: "包含：诊断报告 + 处方执行步骤",
      },
      prescription: {
        id: "prescription",
        title: "Doctor 处方",
        description: "根据诊断结果生成 P0/P1/P2 任务清单，精确到页面和操作步骤。",
        features: [
          "P0/P1/P2 任务清单",
          "每条含目标页面、操作步骤、证据、验证方法",
          "4类处方：技术优化 / 内容优化 / 权威建设 / 社区运营",
        ],
        previewData: undefined,
        previewTemplate: {
          type: "prescription",
          data: {
            summary: "基于诊断结果，我们为您生成了 3 个优先级任务，预计执行后引用率可提升 15-20%。",
            items: [
              {
                priority: "P0",
                category: "技术优化",
                action: "优化官网产品页面",
                targetPage: "/products",
                whatToAdd: ["添加 Product 结构化数据", "优化 title 标签", "添加 meta description"],
                expectedImpact: "A类引用率从 25% 提升至 35-40%",
                evidence: "论文3，Section 2.1",
                timeline: "1-2周",
                difficulty: "中",
              },
              {
                priority: "P1",
                category: "权威建设",
                action: "增加第三方评测",
                targetPage: "Trustpilot, G2",
                whatToAdd: ["邀请客户写评价", "回复所有评价", "展示评价在官网"],
                expectedImpact: "推荐率从 12% 提升至 18-20%",
                evidence: "论文7，Section 3.2",
                timeline: "2-4周",
                difficulty: "中",
              },
              {
                priority: "P2",
                category: "社区运营",
                action: "Reddit/Quora 品牌提及",
                targetPage: "Reddit, Quora",
                whatToAdd: ["回答相关问题", "分享使用体验", "建立品牌社区"],
                expectedImpact: "来源多样性从 0.6 提升至 0.8",
                evidence: "论文12，Section 4.1",
                timeline: "4-8周",
                difficulty: "高",
              },
            ],
          },
        },
        price: "¥299/月",
        priceDetail: "包含：诊断报告 + 处方执行步骤",
      },
    };
    return configs[moduleId] || null;
  }

  function handleLockedModuleClick(moduleId: string) {
    const m = buildPreview(moduleId);
    if (m) {
      setPreviewModule(m);
      setShowPreview(true);
    }
  }

  // ── Brand Profile (fetch once, cache in localStorage) ──
  const PROFILE_CACHE_KEY = userKey("cf_brand_profile");
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!domain) return;

    // Probe 数据已包含 brand_profile，直接使用
    if (probe?.brand_profile?.brand_name || probe?.brand_profile?.one_liner) {
      setProfile(probe.brand_profile);
      return;
    }

    // 先读缓存
    try {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.domain === domain) {
          setProfile(cached.profile);
          return;
        }
      }
    } catch {}

    // 无缓存 → 调接口
    setProfileLoading(true);
    fetch(`${API_BASE}/api/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, brand_name: brandName }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") {
          setProfile(d.brand_profile);
          try {
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
              domain,
              profile: d.brand_profile,
            }));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [domain, brandName]);

  // ── 侧导航 IntersectionObserver ──
  const [dashActiveSection, setDashActiveSection] = useState(DASH_NAV_GROUPS[0].items[0].id);
  const dashContentRef = useRef<HTMLDivElement>(null);

  // ── 分组折叠状态 ──
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(DASH_NAV_GROUPS.map((g) => g.id))
  );
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const dashScrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setDashActiveSection(id);
    }
  }, []);

  // ── Metrics ──
  const score = safeNum(probe?.company_score?.overall);
  const industryRate = safeNum(probe?.citation_metrics?.industry_rate);
  const recommendationRate = safeNum(probe?.citation_metrics?.recommendation_rate);
  const topRate = safeNum(probe?.citation_metrics?.top_rate);
  const competitorScenarioRate = safeNum(probe?.citation_metrics?.competitor_scenario_rate);
  const competitors = probe?.competitor_mentions || [];

  // ── Full-only (Analyst + Doctor) ──
  const verdict = data?.one_line_verdict || "";
  const diagnosis = data?.diagnosis || null;
  const threeLayer = data?.three_layer_chain || null;
  const competitorGap = data?.competitor_gap || null;
  const alignmentScore = safeNum(probe?.gap_report?.alignment_score);
  const alignmentSummary = probe?.gap_report?.one_line_summary || "";
  const prescription = data?.prescription || [];
  const prescriptionSummary = data?.prescription_summary || "";

  // ── Probe-only (full mode 产出，light 模式下为空) ──
  const hasFullData = mode === "full";
  const aiNarrative = probe?.ai_narrative || null;
  const marketPerception = probe?.market_perception || null;
  const engineResultsRaw = probe?.engine_results || null;
  const hasEngineResults = engineResultsRaw && typeof engineResultsRaw === "object" && Object.keys(engineResultsRaw).length > 0;
  const gapReport = probe?.gap_report || null;
  const competitorAnalysis = probe?.competitor_analysis || [];
  const companyEvaluation = probe?.company_evaluation || null;
  const sourceAuthority = probe?.source_authority || null;

  // 用户是否已解锁 Analyst / Doctor（以实际数据是否存在为准，不靠 mode）
  const hasDiagnosis = !!(data?.diagnosis || data?.one_line_verdict);
  const hasPrescription = !!(data?.prescription && data.prescription.length > 0);

  // ── Analyst / Doctor 解锁状态 ──
  const isAnalystUnlocked = isPaid && hasDiagnosis;
  const isDoctorUnlocked = isPaid && hasPrescription;

  // ── 产品导航点击（Analyst / Doctor） ──
  function handleProductNavClick(productId: string) {
    if (productId === "dash-analyst") {
      if (!isAnalystUnlocked) {
        if (isPaid) {
          dashScrollTo("dash-analyst");
        } else {
          handleLockedModuleClick("diagnosis");
        }
      } else {
        dashScrollTo("dash-analyst");
      }
    } else if (productId === "dash-doctor") {
      if (!isDoctorUnlocked) {
        if (isPaid) {
          dashScrollTo("dash-doctor");
        } else {
          handleLockedModuleClick("prescription");
        }
      } else {
        dashScrollTo("dash-doctor");
      }
    }
  }

  // ── 侧导航 IntersectionObserver ──
  useEffect(() => {
    if (!dashContentRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setDashActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-15% 0px -65% 0px", threshold: 0 }
    );

    // 监听分组内的item（全部监听，这些始终可见）
    DASH_NAV_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) observer.observe(el);
      });
    });

    // 只监听已解锁的 Analyst/Doctor
    if (isAnalystUnlocked) {
      const el = document.getElementById("dash-analyst");
      if (el) observer.observe(el);
    }
    if (isDoctorUnlocked) {
      const el = document.getElementById("dash-doctor");
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [probe, data, isAnalystUnlocked, isDoctorUnlocked]);

  // 体检进度
  const stepDoneMap: Record<string, boolean> = {
    input: true,
    probe: !isFree,
    analyst: isPaid && hasDiagnosis,
    doctor: isPaid && hasPrescription,
  };
  const completedStepCount = Object.values(stepDoneMap).filter(Boolean).length;

  // ── Competitor chart data ──
  const fullChartLabels = ["行业引用率", "推荐率", "Top率", "竞品场景率"];
  const lightChartLabels = ["行业引用率", "推荐率", "Top率"];

  const totalMentions = competitors.reduce((sum: number, c: any) => sum + (c.mention_count || 0), 0);

  const compColors = ["#F59E0B", "#EF4444", "#A855F7"];

  function buildChartLines(mode: "light" | "full"): { xLabels: string[]; lines: ChartLine[] } {
    const xLabels = mode === "light" ? lightChartLabels : fullChartLabels;

    const userValues = mode === "light"
      ? [industryRate, recommendationRate, topRate]
      : [industryRate, recommendationRate, topRate, competitorScenarioRate];

    const userLine: ChartLine = {
      label: brandName || "你的品牌",
      color: "#38BDF8",
      values: userValues,
    };

    const lines: ChartLine[] = [userLine];

    // Add competitor lines from per-dimension competitor_metrics (populated by citation analyzer)
    const compMetrics = probe?.citation_metrics?.competitor_metrics;
    if (compMetrics && typeof compMetrics === "object") {
      const compEntries = Object.entries(compMetrics) as [string, { industry_rate: number; recommendation_rate: number; top_rate: number; competitor_scenario_rate: number }][];
      compEntries.slice(0, 3).forEach(([compName, metrics], i) => {
        if (metrics.industry_rate === undefined) return;
        const values = mode === "light"
          ? [metrics.industry_rate, metrics.recommendation_rate, metrics.top_rate]
          : [metrics.industry_rate, metrics.recommendation_rate, metrics.top_rate, metrics.competitor_scenario_rate || 0];
        lines.push({
          label: compName,
          color: compColors[i % compColors.length],
          values,
        });
      });
    }

    return { xLabels, lines };
  }

  const fullChart = buildChartLines("full");
  const lightChart = buildChartLines("light");

  return (
    <div className="flex min-h-screen" style={{ background: "#0A0A0F" }}>
      {/* 左侧固定导航 */}
      <nav
        className="fixed top-0 h-screen flex flex-col shrink-0 z-20"
        style={{ left: 160, width: 116, background: "rgba(10,10,15,0.92)", paddingTop: "calc((100vh - 520px) / 2)", paddingBottom: "calc((100vh - 520px) / 2)" }}
      >
        {/* 右侧边线 */}
        <div className="absolute right-0 top-0 bottom-0 w-px" style={{ background: "linear-gradient(180deg, transparent 5%, rgba(255,255,255,0.06) 15%, rgba(255,255,255,0.06) 85%, transparent 95%)" }} />

        {/* 分组 + 折叠 */}
        {DASH_NAV_GROUPS.map((group) => (
          <div key={group.id} className="mb-2">
            {/* 分组标题 */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono tracking-wider uppercase"
              style={{ color: "#5E5E78" }}
            >
              <span>{group.label}</span>
              <motion.span
                animate={{ rotate: expandedGroups.has(group.id) ? 0 : -90 }}
                transition={{ duration: 0.2 }}
                style={{ fontSize: 10, color: "#4A4A60" }}
              >
                ▾
              </motion.span>
            </button>

            {/* 分组内 items */}
            <AnimatePresence>
              {expandedGroups.has(group.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  {group.items.map((item) => {
                    const isActive = dashActiveSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => dashScrollTo(item.id)}
                        className="w-full flex items-center gap-3 py-2.5 px-4 transition-all group relative"
                      >
                        {/* 活跃指示器 — 右侧竖条 */}
                        <motion.div
                          className="absolute right-0 w-0.5 rounded-l-full"
                          animate={{
                            height: isActive ? 28 : 0,
                            background: isActive ? "#38BDF8" : "transparent",
                            boxShadow: isActive ? "0 0 8px rgba(56,189,248,0.4)" : "none",
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        />

                        <span
                          className="text-xs tracking-wide transition-all text-left leading-tight"
                          style={{
                            color: isActive ? "#D0D0E0" : "#4A4A60",
                            opacity: isActive ? 1 : 0.4,
                            fontWeight: isActive ? 500 : 400,
                          }}
                        >
                          {item.label}
                        </span>

                        {!isActive && (
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            style={{ background: "radial-gradient(ellipse at right center, rgba(56,189,248,0.04) 0%, transparent 60%)" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* 分隔线 */}
        <div className="mx-3 my-2 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* 独立产品：Analyst / Doctor */}
        {DASH_PRODUCTS.map((item) => {
          const isActive = dashActiveSection === item.id;
          const isUnlocked = item.id === "dash-analyst" ? isAnalystUnlocked : isDoctorUnlocked;
          return (
            <button
              key={item.id}
              onClick={() => handleProductNavClick(item.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-all group relative"
            >
              {/* 图标 */}
              <span className="text-sm shrink-0">{item.icon}</span>

              {/* 标签 */}
              <span
                className="text-xs tracking-wide transition-all"
                style={{
                  color: isActive ? "#E8E8F0" : "#8A8AA0",
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {item.label}
              </span>

              {/* 状态图标 */}
              {!isUnlocked && !isPaid && (
                <span className="ml-auto text-[10px]" style={{ color: "#4A4A60" }}>🔒</span>
              )}
              {!isUnlocked && isPaid && (
                <span className="ml-auto text-[10px]" style={{ color: "#60A5FA" }}>▶</span>
              )}

              {/* 活跃指示条 */}
              {isActive && (
                <motion.div
                  className="absolute right-0 w-0.5 rounded-l-full"
                  style={{ height: 28, background: "#38BDF8", boxShadow: "0 0 8px rgba(56,189,248,0.4)" }}
                  layoutId="active-dash-bar"
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* 主内容区 — 可滚动 */}
      <div ref={dashContentRef} className="flex-1 flex flex-col gap-8 py-6" style={{ overflowY: "auto", overflowX: "hidden", minWidth: 0, overflowWrap: "break-word", wordBreak: "break-word", paddingLeft: 140 }}>

      {/* ── Probe 未使用提醒 ── */}
      {!isFree && !hasFullData && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between px-5 py-4"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)",
            border: "1px solid rgba(245,158,11,0.18)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🔬</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "#EDEDF5" }}>
                Probe 侦察兵已就绪
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#9A9AB0" }}>
                你已解锁完整版体检，点击左侧「Probe 侦察兵」开始深度扫描
              </p>
            </div>
          </div>
          <span
            className="px-2 py-1 text-[10px] font-mono"
            style={{
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.22)",
              color: "#FBBF24",
            }}
          >
            待使用
          </span>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 1 — 综合评分卡 (Hero)
          ═══════════════════════════════════════════ */}
      <motion.section
        id="dash-score"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        className="px-7 py-7 flex-shrink-0 min-w-0"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <SectionLabel>综合评分</SectionLabel>

        {/* 综合评分 MetricCard，居中 */}
        <div className="flex justify-center mb-6">
          <div className="w-48">
            <MetricCard label="综合评分" value={score} suffix="/100" highlight delay={0.05} />
          </div>
        </div>

        {/* AI 眼中的你 */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45 }}
            className="mb-5 p-5"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.03) 0%, rgba(56,189,248,0.005) 100%)",
              border: "1px solid rgba(56,189,248,0.08)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#38BDF8", boxShadow: "0 0 6px rgba(56,189,248,0.4)" }}
              />
              <p className="text-[10px] font-mono tracking-[0.15em] uppercase" style={{ color: "rgba(56,189,248,0.45)" }}>
                AI 眼中的你
              </p>
            </div>

            {profile.one_liner && (
              <p className="text-sm leading-relaxed mb-3" style={{ color: "#C8C8D8" }}>
                {profile.one_liner}
              </p>
            )}

            <div className="flex flex-wrap gap-4 mb-3">
              {profile.inferred_industry && (
                <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#9A9AB0" }}>
                  <span style={{ color: "rgba(56,189,248,0.35)" }}>行业</span>
                  {profile.inferred_industry}
                </span>
              )}
              {profile.inferred_target_market && (
                <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#9A9AB0" }}>
                  <span style={{ color: "rgba(56,189,248,0.35)" }}>市场</span>
                  {profile.inferred_target_market}
                </span>
              )}
              {profile.inferred_core_product && (
                <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#9A9AB0" }}>
                  <span style={{ color: "rgba(56,189,248,0.35)" }}>核心产品</span>
                  {profile.inferred_core_product}
                </span>
              )}
            </div>

            {profile.value_props && profile.value_props.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.value_props.map((vp: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-[10px] tracking-wide"
                    style={{
                      background: "rgba(56,189,248,0.05)",
                      border: "1px solid rgba(56,189,248,0.08)",
                      color: "#7DD3FC",
                    }}
                  >
                    {vp}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
        {profileLoading && (
          <div className="mb-5 p-4 flex items-center gap-2" style={{ color: "rgba(255,255,255,0.10)" }}>
            <span className="w-3 h-3 border rounded-full animate-spin" style={{ borderColor: "rgba(56,189,248,0.12)", borderTopColor: "#38BDF8" }} />
            <span className="text-[10px] font-mono tracking-wider">正在获取品牌画像…</span>
          </div>
        )}

        {/* 一句话诊断（仅付费用户） */}
        {!isFree && verdict && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.4 }}
            className="p-4"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.04) 0%, rgba(56,189,248,0.01) 100%)",
              borderLeft: "2px solid rgba(56,189,248,0.25)",
            }}
          >
            <p className="text-[10px] font-mono tracking-widest uppercase mb-1.5" style={{ color: "rgba(56,189,248,0.4)" }}>
              一句话诊断
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#C8C8D8" }}>{verdict}</p>
          </motion.div>
        )}
      </motion.section>

      {/* ═══════════════════════════════════════════
          SECTION 1.5 — 引用率分析
          ═══════════════════════════════════════════ */}
      <motion.section
        id="dash-citation"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="px-7 py-7 flex-shrink-0 min-w-0"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <SectionLabel>引用率分析</SectionLabel>

        {/* 3个引用率 MetricCard */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <MetricCard label="行业引用率" value={industryRate} suffix="%" delay={0.05} />
          <MetricCard label="推荐率" value={recommendationRate} suffix="%" delay={0.1} />
          <MetricCard label="Top率" value={topRate} suffix="%" delay={0.15} />
        </div>

        {/* 证据溯源 */}
        <EvidenceSection
          citationMetrics={probe?.citation_metrics}
          brandName={brandName}
        />

        {/* CTA — view full report */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="flex justify-end mt-5"
        >
          <motion.button
            onClick={onViewReport}
            className="group relative inline-flex items-center gap-2.5 px-6 py-3 text-sm font-medium tracking-wide"
            style={{
              color: "#C8C8D8",
              background: "rgba(56,189,248,0.05)",
              border: "1px solid rgba(56,189,248,0.14)",
            }}
            whileHover={{
              background: "rgba(56,189,248,0.14)",
              borderColor: "rgba(56,189,248,0.35)",
              boxShadow: "0 0 32px rgba(56,189,248,0.10)",
              scale: 1.02,
            }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.span
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              style={{
                border: "1px solid rgba(56,189,248,0.2)",
                animation: "pulseRing 2s ease-in-out infinite",
              }}
            />
            {isFree ? "查看免费报告" : "查看详细报告"}
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              style={{ color: "#38BDF8" }}
            >
              →
            </motion.span>
          </motion.button>
        </motion.div>
      </motion.section>

      {/* SECTION 2 — 竞品对比折线图 */}
      <div id="dash-competitors">
      {isFree ? (
        <ScanCompetitorChart xLabels={lightChart.xLabels} lines={lightChart.lines} />
      ) : (
        <ScanCompetitorChart xLabels={fullChart.xLabels} lines={fullChart.lines} />
      )}
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 2.5 — 竞品维度对比 (Probe产出)
          ═══════════════════════════════════════════ */}
      <div id="dash-comp-dimension">
      {!isFree && hasFullData && competitorAnalysis && competitorAnalysis.length > 0 ? (
        <CompetitorDimensionComparison
          competitorAnalysis={competitorAnalysis}
          brandName={brandName}
        />
      ) : !isFree && competitors.length > 0 ? (
        /* 竞品对比管道未产出数据，但有 Haiku 提取的竞品提及 → 展示真实竞品概览 */
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="px-7 py-7 flex-shrink-0 min-w-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(255,255,255,0.008) 100%)",
            border: "1px solid rgba(245,158,11,0.10)",
          }}
        >
          <SectionLabel>竞品战场 · 提及概览</SectionLabel>
          <p className="text-xs leading-relaxed mb-5" style={{ color: "#8A8AA0" }}>
            Haiku 从搜索结果中识别到 {competitors.length} 个竞品，共 {totalMentions} 次提及。
            详细维度对比需竞品搜索管道产出数据（当前搜索未命中对比文章）。
          </p>
          <div className="flex flex-col gap-2">
            {competitors.slice(0, 8).map((c: any, i: number) => {
              const pct = totalMentions > 0 ? Math.round(((c.mention_count || 0) / totalMentions) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-[160px] shrink-0 truncate" style={{ color: "#C8C8D8" }}>
                    {c.brand}
                  </span>
                  <div className="flex-1 h-5 relative rounded-sm overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-sm"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, 2)}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                      style={{
                        background: `linear-gradient(90deg, ${compColors[i % 3]}33, ${compColors[i % 3]}88)`,
                      }}
                    />
                    <span
                      className="absolute inset-y-0 right-2 flex items-center text-[10px] font-mono"
                      style={{ color: "rgba(255,255,255,0.30)" }}
                    >
                      {c.mention_count}次 · {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] mt-4 font-mono" style={{ color: "rgba(255,255,255,0.12)" }}>
            数据来源：搜索结果的竞品提及频次（Haiku 提取）· 非完整维度对比
          </p>
        </motion.section>
      ) : !isFree ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="px-7 py-7 flex-shrink-0 min-w-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}
        >
          <SectionLabel>竞品维度对比</SectionLabel>
          <div className="flex items-center gap-3 py-6">
            <span className="text-2xl">⚔️</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "#9A9AB0" }}>等待竞品数据</p>
              <p className="text-xs mt-0.5" style={{ color: "#5E5E78" }}>运行 Probe 侦察兵后，竞品维度对比将自动生成</p>
            </div>
          </div>
        </motion.section>
      ) : null}
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 3 — AI认知画像 (Probe产出)
          ═══════════════════════════════════════════ */}
      <div id="dash-perception">
      {isFree ? (
        <LockedSection
          title="AI认知画像"
          description="AI怎么描述你的品牌、理想描述、关键词"
          lockPrice="¥50/次"
          onUpgrade={() => onUpgrade("probe")}
          onClick={() => handleLockedModuleClick("ai_perception")}
        >
          <div className="p-5 rounded-sm" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.10)" }}>AI怎么描述你</p>
            <p className="text-sm leading-relaxed mb-4 blur-[3px] select-none" style={{ color: "#6E6E88" }}>{LOCKED_AI_PERCEPTION.identity}</p>
            <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.10)" }}>AI理想描述</p>
            <p className="text-sm leading-relaxed italic mb-4 blur-[3px] select-none" style={{ color: "#6E6E88" }}>"{LOCKED_AI_PERCEPTION.idealDescription}"</p>
            <div className="flex flex-wrap gap-2">
              {LOCKED_AI_PERCEPTION.keywords.map((k, i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] font-mono blur-[3px] select-none" style={{ background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.08)", color: "#7DD3FC" }}>{k}</span>
              ))}
            </div>
          </div>
        </LockedSection>
      ) : hasFullData && (aiNarrative || marketPerception) ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="px-7 py-7 flex-shrink-0 min-w-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <SectionLabel>AI认知画像</SectionLabel>

          {/* AI怎么描述你 */}
          {marketPerception?.perceived_identity && (
            <div className="mb-4">
              <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.14)" }}>
                AI怎么描述你
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#9A9AB0" }}>
                {marketPerception.perceived_identity}
              </p>
            </div>
          )}

          {/* AI理想描述 */}
          {aiNarrative?.ideal_description && (
            <div className="mb-4">
              <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.14)" }}>
                AI理想描述
              </p>
              <p className="text-sm leading-relaxed italic" style={{ color: "#9A9AB0" }}>
                "{aiNarrative.ideal_description}"
              </p>
            </div>
          )}

          {/* 关键词 */}
          {aiNarrative?.keywords && aiNarrative.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {aiNarrative.keywords.map((k: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-[10px] font-mono"
                  style={{
                    background: "rgba(56,189,248,0.05)",
                    border: "1px solid rgba(56,189,248,0.08)",
                    color: "#7DD3FC",
                  }}
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </motion.section>
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="px-7 py-7 flex-shrink-0 min-w-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}
        >
          <SectionLabel>AI认知画像</SectionLabel>
          <div className="flex items-center gap-3 py-6">
            <span className="text-2xl">🔬</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "#9A9AB0" }}>
                等待 Probe 侦察
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#5E5E78" }}>
                运行 Probe 侦察兵后，AI认知画像将自动生成
              </p>
            </div>
          </div>
        </motion.section>
      )}
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 4 — 引擎对比 (Probe产出)
          ═══════════════════════════════════════════ */}
      <div id="dash-engines">
      {isFree ? (
        <LockedSection
          title="引擎对比"
          description="ChatGPT/Gemini/Claude三引擎交叉验证"
          lockPrice="¥50/次"
          onUpgrade={() => onUpgrade("probe")}
          onClick={() => handleLockedModuleClick("engine_comparison")}
        >
          <div className="grid grid-cols-3 gap-4 p-2">
            {(["gpt", "gemini", "haiku"] as const).map((engine) => (
              <div key={engine} className="p-4 blur-[3px] select-none" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: "rgba(255,255,255,0.14)" }}>
                  {engine === "gpt" ? "ChatGPT" : engine === "gemini" ? "Gemini" : "Claude"}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: "#9A9AB0" }}>引用率</span>
                    <span className="text-xs font-mono" style={{ color: "#EDEDF5" }}>{LOCKED_ENGINE_COMPARISON[engine].citation_rate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: "#9A9AB0" }}>推荐率</span>
                    <span className="text-xs font-mono" style={{ color: "#EDEDF5" }}>{LOCKED_ENGINE_COMPARISON[engine].recommendation_rate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </LockedSection>
      ) : hasFullData && hasEngineResults ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="px-7 py-7 flex-shrink-0 min-w-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <SectionLabel>引擎对比 · 交叉验证</SectionLabel>

          <div className="grid grid-cols-3 gap-4">
            {(["gpt", "gemini", "haiku"] as const).map((engine) => {
              const er = engineResultsRaw[engine];
              if (!er) return null;
              return (
                <div
                  key={engine}
                  className="p-4"
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: "rgba(255,255,255,0.14)" }}>
                    {engine === "gpt" ? "ChatGPT" : engine === "gemini" ? "Gemini" : "Claude"}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: "#9A9AB0" }}>引用率</span>
                      <span className="text-xs font-mono" style={{ color: "#EDEDF5" }}>
                        {(er.citation_rate || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: "#9A9AB0" }}>推荐率</span>
                      <span className="text-xs font-mono" style={{ color: "#EDEDF5" }}>
                        {(er.recommendation_rate || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="px-7 py-7 flex-shrink-0 min-w-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}
        >
          <SectionLabel>引擎对比 · 交叉验证</SectionLabel>
          <div className="flex items-center gap-3 py-6">
            <span className="text-2xl">🔬</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "#9A9AB0" }}>
                等待 Probe 侦察
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#5E5E78" }}>
                运行 Probe 侦察兵后，三引擎交叉验证数据将自动生成
              </p>
            </div>
          </div>
        </motion.section>
      )}
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 5 — 认知差距 (Probe产出)
          ═══════════════════════════════════════════ */}
      <div id="dash-gap">
      {isFree ? (
        <LockedSection
          title="认知差距"
          description="品牌自述 vs AI认知的差距分析"
          lockPrice="¥50/次"
          onUpgrade={() => onUpgrade("probe")}
          onClick={() => handleLockedModuleClick("gap_report")}
        >
          <div className="p-5 rounded-sm" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex items-center justify-between mb-3 blur-[3px] select-none">
              <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.10)" }}>对齐度</span>
              <span className="text-lg font-mono font-light" style={{ color: "#F59E0B" }}>{LOCKED_GAP_REPORT.alignment_score}<span className="text-xs ml-1" style={{ color: "#5E5E78" }}>/100</span></span>
            </div>
            <div className="h-1 rounded-full mb-3 blur-[3px] select-none" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="h-full rounded-full" style={{ width: `${LOCKED_GAP_REPORT.alignment_score}%`, background: "#F59E0B" }} />
            </div>
            <p className="text-sm leading-relaxed blur-[3px] select-none" style={{ color: "#6E6E88" }}>{LOCKED_GAP_REPORT.one_line_summary}</p>
          </div>
        </LockedSection>
      ) : hasFullData && gapReport ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="px-7 py-7 flex-shrink-0 min-w-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <SectionLabel>认知差距</SectionLabel>

          {/* 对齐度 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.14)" }}>
                对齐度
              </span>
              <span className="text-lg font-mono font-light" style={{ color: "#38BDF8" }}>
                {gapReport.alignment_score || 0}
                <span className="text-xs ml-1" style={{ color: "#5E5E78" }}>/100</span>
              </span>
            </div>
            <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${gapReport.alignment_score || 0}%`,
                  background: (gapReport.alignment_score || 0) >= 60 ? "#22C55E" : (gapReport.alignment_score || 0) >= 40 ? "#F59E0B" : "#EF4444",
                }}
              />
            </div>
          </div>

          {/* 一句话总结 */}
          {gapReport.one_line_summary && (
            <p className="text-sm leading-relaxed" style={{ color: "#9A9AB0" }}>
              {gapReport.one_line_summary}
            </p>
          )}
        </motion.section>
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="px-7 py-7 flex-shrink-0 min-w-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}
        >
          <SectionLabel>认知差距</SectionLabel>
          <div className="flex items-center gap-3 py-6">
            <span className="text-2xl">🔬</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "#9A9AB0" }}>
                等待 Probe 侦察
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#5E5E78" }}>
                运行 Probe 侦察兵后，品牌认知差距分析将自动生成
              </p>
            </div>
          </div>
        </motion.section>
      )}
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 5.2 — 品牌诊断 (Probe产出)
          ═══════════════════════════════════════════ */}
      <div id="dash-diagnosis">
      {!isFree && hasFullData && companyEvaluation ? (
        <BrandDiagnosis companyEvaluation={companyEvaluation} />
      ) : !isFree ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.34 }}
          className="px-7 py-7 flex-shrink-0 min-w-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}
        >
          <SectionLabel>品牌诊断</SectionLabel>
          <div className="flex items-center gap-3 py-6">
            <span className="text-2xl">🩺</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "#9A9AB0" }}>等待诊断数据</p>
              <p className="text-xs mt-0.5" style={{ color: "#5E5E78" }}>运行 Probe 侦察兵后，品牌优势劣势分析将自动生成</p>
            </div>
          </div>
        </motion.section>
      ) : null}
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 5.3 — 引用来源分析 (Probe产出)
          ═══════════════════════════════════════════ */}
      <div id="dash-sources">
      {!isFree && hasFullData && sourceAuthority ? (
        <SourceAuthoritySection sourceAuthority={sourceAuthority} />
      ) : !isFree ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.36 }}
          className="px-7 py-7 flex-shrink-0 min-w-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}
        >
          <SectionLabel>引用来源分析</SectionLabel>
          <div className="flex items-center gap-3 py-6">
            <span className="text-2xl">🔗</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "#9A9AB0" }}>等待来源数据</p>
              <p className="text-xs mt-0.5" style={{ color: "#5E5E78" }}>运行 Probe 侦察兵后，引用来源分析将自动生成</p>
            </div>
          </div>
        </motion.section>
      ) : null}
      </div>

      {/* Analyst 诊断摘要 */}
      <div id="dash-analyst">
        {isPaid && hasDiagnosis ? (
          <ScanDiagnosisSummary
            diagnosis={diagnosis}
            threeLayerChain={threeLayer}
            competitorGap={competitorGap}
            alignmentScore={alignmentScore}
            alignmentSummary={alignmentSummary}
            verdict={verdict}
          />
        ) : isPaid ? (
          /* Full 用户但无诊断数据 → 引导运行 Analyst */
          <div
            onClick={() => onNavigateToStep?.("analyst")}
            className="cursor-pointer px-7 py-10 text-center rounded-xl transition-all duration-300 hover:brightness-110"
            style={{
              background: "linear-gradient(180deg, rgba(59,130,246,0.03) 0%, rgba(59,130,246,0.008) 100%)",
              border: "1px dashed rgba(59,130,246,0.18)",
            }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: "#93C5FD" }}>运行 Analyst 诊断</p>
            <p className="text-xs mb-4" style={{ color: "#6A6A82" }}>14条自研规则逐条诊断，定位根因，对比竞品差距</p>
            <span className="inline-block px-4 py-2 text-xs font-semibold rounded-lg transition-all"
              style={{ background: "rgba(59,130,246,0.14)", border: "1px solid rgba(59,130,246,0.25)", color: "#7DD3FC" }}>
              开始诊断 →
            </span>
          </div>
        ) : (
          <LockedSection
            title={isPaid ? "升级解锁 Analyst 诊断报告" : "升级解锁完整诊断"}
            description="14条自研规则逐条诊断，定位根因，对比竞品差距"
            lockPrice="¥100/次"
            onUpgrade={() => onUpgrade("analyst")}
            onClick={() => handleLockedModuleClick("diagnosis")}
          >
            <ScanDiagnosisSummary
              diagnosis={LOCKED_DIAGNOSIS.diagnosis}
              threeLayerChain={LOCKED_DIAGNOSIS.threeLayerChain}
              competitorGap={LOCKED_DIAGNOSIS.competitorGap}
              alignmentScore={LOCKED_DIAGNOSIS.alignmentScore}
              alignmentSummary={LOCKED_DIAGNOSIS.alignmentSummary}
              verdict={LOCKED_DIAGNOSIS.verdict}
            />
          </LockedSection>
        )}
      </div>

      {/* Doctor 处方执行 */}
      <div id="dash-doctor">
        {isPaid && hasPrescription && prescription.length > 0 ? (
          <ScanPrescriptionSteps
            prescription={prescription}
            summary={prescriptionSummary}
            domain={domain}
          />
        ) : isPaid ? (
          /* Full 用户但无处方数据 → 引导运行 Doctor */
          <div
            onClick={() => onNavigateToStep?.("doctor")}
            className="cursor-pointer px-7 py-10 text-center rounded-xl transition-all duration-300 hover:brightness-110"
            style={{
              background: "linear-gradient(180deg, rgba(59,130,246,0.03) 0%, rgba(59,130,246,0.008) 100%)",
              border: "1px dashed rgba(59,130,246,0.18)",
            }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: "#93C5FD" }}>运行 Doctor 处方</p>
            <p className="text-xs mb-4" style={{ color: "#6A6A82" }}>获取 P0/P1/P2 任务清单，精确到页面和操作步骤</p>
            <span className="inline-block px-4 py-2 text-xs font-semibold rounded-lg transition-all"
              style={{ background: "rgba(59,130,246,0.14)", border: "1px solid rgba(59,130,246,0.25)", color: "#7DD3FC" }}>
              生成处方 →
            </span>
          </div>
        ) : (
          <LockedSection
            title={isPaid ? "升级解锁 Doctor 处方" : "升级解锁完整处方"}
            description="获取 P0/P1/P2 任务清单，精确到页面和操作步骤，逐个执行提升 AI 引用率"
            lockPrice="¥100/次"
            onUpgrade={() => onUpgrade("doctor")}
            onClick={() => handleLockedModuleClick("prescription")}
          >
            <ScanPrescriptionSteps
              prescription={LOCKED_PRESCRIPTION}
              summary={LOCKED_RX_SUMMARY}
              domain={domain}
            />
          </LockedSection>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 5 — 体检进度
          ═══════════════════════════════════════════ */}
      <motion.section
        id="dash-progress"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="px-7 py-7 flex-shrink-0 min-w-0"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <SectionLabel accent={false}>体检进度</SectionLabel>

        {/* Progress pipeline */}
        <div className="flex items-center justify-between mb-5 px-2">
          {STEPS.map((step, i, arr) => {
            const done = stepDoneMap[step.id] ?? false;
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  {/* Step indicator circle */}
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono transition-all duration-500"
                    style={{
                      background: done
                        ? "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)"
                        : "rgba(255,255,255,0.03)",
                      border: done
                        ? "1px solid rgba(34,197,94,0.25)"
                        : "1px solid rgba(255,255,255,0.06)",
                      color: done ? "#22C55E" : "rgba(255,255,255,0.12)",
                    }}
                  >
                    {done ? "✓" : "—"}
                  </span>
                  <span
                    className="text-[10px] tracking-wide"
                    style={{ color: done ? "#A8A8B8" : "rgba(255,255,255,0.14)" }}
                  >
                    {step.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className="w-10 md:w-14 mx-1.5">
                    <div
                      className="h-px"
                      style={{
                        background: done
                          ? "linear-gradient(90deg, rgba(34,197,94,0.3), rgba(34,197,94,0.05))"
                          : "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p
          className="text-[10px] text-center mb-3 font-mono tracking-wide"
          style={{ color: completedStepCount === 4 ? "#22C55E" : "rgba(255,255,255,0.12)" }}
        >
          {completedStepCount === 4
            ? "全部完成"
            : isFree
              ? `已完成 ${completedStepCount}/4 步（升级解锁完整流程）`
              : `已完成 ${completedStepCount}/4 步（运行完整扫描解锁全部）`}
        </p>

        {lastScanTime && (
          <p className="text-[10px] text-center font-mono" style={{ color: "rgba(255,255,255,0.08)" }}>
            最后扫描: {lastScanTime}
          </p>
        )}
      </motion.section>

      {/* SECTION 7 — 付费能力预告 (free + probe only; full users don't see this) */}
      {!isPaid && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="px-7 py-7 flex-shrink-0 min-w-0"
          style={{
            background: isPaid
              ? "linear-gradient(180deg, rgba(34,197,94,0.025) 0%, rgba(34,197,94,0.005) 100%)"
              : "linear-gradient(180deg, rgba(56,189,248,0.025) 0%, rgba(56,189,248,0.005) 100%)",
            border: isPaid
              ? "1px solid rgba(34,197,94,0.10)"
              : "1px solid rgba(56,189,248,0.08)",
          }}
        >
          <SectionLabel accent={!isPaid}>{isPaid ? "已解锁能力" : "付费能力预告"}</SectionLabel>

          {isFree ? (
            /* ── Free user: 4 cards ── */
            <div className="grid grid-cols-4 gap-4 mb-6">
              <UnlockCard icon="✅" title="Probe 免费版" desc="初步体检" detail="单引擎·限A类" unlocked />
              <UnlockCard icon="🔒" title="Probe 完整版" desc="满血侦察兵" detail="3引擎·全查询·竞品" />
              <UnlockCard icon="🔒" title="Analyst" desc="完整诊断" detail="14条规则" />
              <UnlockCard icon="🔒" title="Doctor" desc="处方执行" detail="P0/P1/P2" />
            </div>
          ) : (
            /* ── Probe user: 3 cards ── */
            <div className="grid grid-cols-3 gap-4 mb-6">
              <UnlockCard icon="✅" title="Probe 完整版" desc="满血侦察兵" detail="3引擎·全查询·竞品" unlocked />
              <UnlockCard icon="🔒" title="Analyst" desc="完整诊断" detail="14条规则" />
              <UnlockCard icon="🔒" title="Doctor" desc="处方执行" detail="P0/P1/P2" />
            </div>
          )}

          <motion.button
            className="w-full py-3.5 text-sm font-semibold tracking-wide transition-all duration-500"
            style={{
              background: isPaid
                ? "rgba(34,197,94,0.10)"
                : "rgba(56,189,248,0.10)",
              border: isPaid
                ? "1px solid rgba(34,197,94,0.20)"
                : "1px solid rgba(56,189,248,0.18)",
              color: isPaid ? "#22C55E" : "#7DD3FC",
            }}
            whileHover={{
              background: isPaid
                ? "rgba(34,197,94,0.20)"
                : "rgba(56,189,248,0.20)",
              borderColor: isPaid
                ? "rgba(34,197,94,0.40)"
                : "rgba(56,189,248,0.38)",
              boxShadow: isPaid
                ? "0 0 36px rgba(34,197,94,0.08)"
                : "0 0 36px rgba(56,189,248,0.08)",
              scale: 1.01,
            }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onUpgrade("analyst")}
          >
            {isFree ? "升级解锁专业版 · ¥100/次" : "升级解锁全套诊断 · ¥100/次"}
          </motion.button>
        </motion.section>
      )}

      {/* 预览弹窗 */}
      {previewModule && (
        <PreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          onUpgrade={() => {
            const featureMap: Record<string, "analyst" | "doctor"> = {
              "ai_perception": "analyst",
              "engine_comparison": "analyst",
              "gap_report": "analyst",
              "diagnosis": "analyst",
              "prescription": "doctor",
            };
            setShowPreview(false);
            onUpgrade(featureMap[previewModule?.id || ""] || "analyst");
          }}
          module={previewModule}
        />
      )}
    </div>
    </div>
  );
}
