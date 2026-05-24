"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LockedSection } from "@/components/locked-section";
import type { Tier, ScanMode } from "@/lib/storage";

// ─── 常量 ───────────────────────────────────────────────
const UPGRADE_PRICE = "¥299/月";
const ENGINE_DISPLAY: Record<string, string> = {
  gpt: "ChatGPT",
  gemini: "Gemini",
  haiku: "Claude",
};

// ─── 工具函数 ───────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#38BDF8";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function fmtPct(v: number | undefined | null): string {
  if (v == null) return "—";
  return (Math.round(v * 10) / 10).toFixed(1) + "%";
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// ─── 设计 Token ─────────────────────────────────────────
const T = {
  bg: "#08080D",
  card: "#0D0D15",
  surface: "rgba(255,255,255,0.02)",
  elevated: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.06)",
  borderAccent: "rgba(56,189,248,0.14)",
  text: "#EDEDF5",
  secondary: "#9A9AB0",
  muted: "#5E5E78",
  accent: "#38BDF8",
  accentSubtle: "rgba(56,189,248,0.10)",
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
};

// ─── Props ──────────────────────────────────────────────
interface Props {
  data: any;
  tier: Tier;
  mode: ScanMode;
  domain: string;
  brandName: string;
  onUpgrade: () => void;
  onBack: () => void;
  onViewAnalyst?: () => void;
}

// ─── 子组件 ─────────────────────────────────────────────

function SectionLabel({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <div id={id} className="flex items-center gap-3 mb-5">
      <span
        className="block w-1 h-3 rounded-full shrink-0"
        style={{ background: `linear-gradient(180deg, ${T.accent} 0%, rgba(56,189,248,0.15) 100%)` }}
      />
      <span
        className="text-[10px] font-mono tracking-[0.15em] uppercase"
        style={{ color: "rgba(56,189,248,0.50)" }}
      >
        {children}
      </span>
    </div>
  );
}

function EmptySection({ title, reason }: { title: string; reason: string }) {
  return (
    <div
      className="p-6 text-center rounded-lg"
      style={{ background: T.surface, border: `1px solid ${T.border}` }}
    >
      <p className="text-sm" style={{ color: T.muted }}>{title} — 暂无数据</p>
      <p className="text-xs mt-1" style={{ color: "#3A3A52" }}>{reason}</p>
    </div>
  );
}

function SectionDivider() {
  return (
    <div className="flex items-center gap-3 my-8">
      <span className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
      <span className="w-1 h-1 rounded-full" style={{ background: "rgba(56,189,248,0.15)" }} />
      <span className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
    </div>
  );
}

function ScoreBar({ score, max = 100, height = 4 }: { score: number; max?: number; height?: number }) {
  const pct = Math.min(Math.max((score / max) * 100, 2), 98);
  return (
    <div className="rounded-full" style={{ height, background: "rgba(255,255,255,0.06)" }}>
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{ background: scoreColor(score) }}
      />
    </div>
  );
}

// ─── Section 1: 综合评分 ────────────────────────────────

function Section1({ companyScore }: { companyScore: any }) {
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  if (!companyScore) return <EmptySection title="综合评分" reason="Probe 未返回公司评分数据" />;

  const { overall, dimensions = [], industry, weights_used } = companyScore;

  return (
    <section className="mb-10">
      <SectionLabel id="sec-score">综合评分</SectionLabel>

      {/* 总评分 */}
      <div
        className="p-6 rounded-lg mb-5 text-center"
        style={{ background: T.card, border: `1px solid ${T.border}` }}
      >
        <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: T.muted }}>
          {industry ? `${industry} · AI 综合得分` : "AI 综合得分"}
        </p>
        <p
          className="font-mono font-light tracking-tight"
          style={{ fontSize: 56, lineHeight: 1, color: scoreColor(overall) }}
        >
          {overall ?? "—"}
        </p>
        <p className="text-xs mt-1" style={{ color: T.muted }}>满分 100</p>
        <div className="mt-3 max-w-xs mx-auto">
          <ScoreBar score={overall ?? 0} height={4} />
        </div>
      </div>

      {/* 维度卡片 */}
      {dimensions.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {dimensions.map((dim: any) => {
            const isOpen = expandedDim === dim.name;
            return (
              <div key={dim.name}>
                <button
                  onClick={() => setExpandedDim(isOpen ? null : dim.name)}
                  className="w-full p-4 rounded-lg text-left transition-all hover:brightness-110"
                  style={{
                    background: isOpen ? "rgba(56,189,248,0.04)" : T.card,
                    border: `1px solid ${isOpen ? "rgba(56,189,248,0.18)" : T.border}`,
                    borderLeft: isOpen ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono tracking-wider uppercase" style={{ color: isOpen ? T.accent : T.secondary }}>
                      {dim.name}
                    </span>
                    <span className="font-mono text-lg" style={{ color: scoreColor(dim.score) }}>
                      {dim.score}
                    </span>
                  </div>
                  <ScoreBar score={dim.score ?? 0} />
                  <span className="text-[9px] font-mono mt-1 inline-block" style={{ color: T.muted }}>
                    {isOpen ? "收起 ▲" : "展开 ▼"}
                  </span>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="p-3 mt-1 rounded-r-lg text-[11px] leading-relaxed space-y-2"
                        style={{
                          background: "rgba(56,189,248,0.03)",
                          border: "1px solid rgba(56,189,248,0.08)",
                          borderLeft: `2px solid ${T.accent}`,
                        }}
                      >
                        {dim.evidence && (
                          <div className="flex gap-2">
                            <span className="font-mono shrink-0 px-1.5 py-0.5 rounded text-[9px]" style={{ background: T.accentSubtle, color: T.accent }}>证据</span>
                            <span style={{ color: T.secondary }}>{dim.evidence}</span>
                          </div>
                        )}
                        {dim.suggestion && (
                          <div className="flex gap-2">
                            <span className="font-mono shrink-0 px-1.5 py-0.5 rounded text-[9px]" style={{ background: "rgba(34,197,94,0.10)", color: T.success }}>建议</span>
                            <span style={{ color: T.secondary }}>{dim.suggestion}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

    </section>
  );
}

// ─── Section 2: AI认知画像 ──────────────────────────────

function Section2({ marketPerception, aiNarrative }: { marketPerception: any; aiNarrative: any }) {
  const hasPerception = marketPerception?.perceived_identity;
  const hasNarrative = aiNarrative?.ideal_description;
  if (!hasPerception && !hasNarrative) return <EmptySection title="AI认知画像" reason="Probe 未返回 AI 认知数据" />;

  return (
    <section className="mb-10">
      <SectionLabel id="sec-perception">AI认知画像</SectionLabel>

      {hasPerception && (
        <>
          {/* AI描述 */}
          <div className="p-5 rounded-lg mb-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: T.muted }}>
              AI 怎么描述你
            </p>
            <p className="text-sm leading-relaxed" style={{ color: T.secondary }}>
              {marketPerception.perceived_identity}
            </p>
          </div>

          {/* 优势/劣势 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: T.muted }}>
                AI 认为你的优势
              </p>
              <div className="flex flex-wrap gap-2">
                {(marketPerception.perceived_strengths || []).length > 0 ? (
                  marketPerception.perceived_strengths.map((s: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-[11px] rounded"
                      style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", color: "#22C55E" }}
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px]" style={{ color: T.muted }}>暂无数据</span>
                )}
              </div>
            </div>
            <div className="p-4 rounded-lg" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: T.muted }}>
                AI 认为你的劣势
              </p>
              <div className="flex flex-wrap gap-2">
                {(marketPerception.perceived_weaknesses || []).length > 0 ? (
                  marketPerception.perceived_weaknesses.map((w: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-[11px] rounded"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444" }}
                    >
                      {w}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px]" style={{ color: T.muted }}>暂无数据</span>
                )}
              </div>
            </div>
          </div>

          {/* AI定位 */}
          {marketPerception.perceived_positioning && (
            <div className="p-5 rounded-lg mb-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: T.muted }}>
                AI 定位
              </p>
              <p className="text-sm leading-relaxed" style={{ color: T.secondary }}>
                {marketPerception.perceived_positioning}
              </p>
            </div>
          )}
        </>
      )}

      {/* AI理想描述 */}
      {hasNarrative && (
        <div className="p-5 rounded-lg mb-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: T.muted }}>
            AI 理想描述
          </p>
          <p className="text-sm leading-relaxed italic mb-3" style={{ color: T.secondary }}>
            &ldquo;{aiNarrative.ideal_description}&rdquo;
          </p>
          {aiNarrative.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {aiNarrative.keywords.map((k: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-[10px] font-mono rounded"
                  style={{ background: T.accentSubtle, border: `1px solid ${T.borderAccent}`, color: T.accent }}
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Section 3: 认知差距 ────────────────────────────────

function Section3({ gapReport, companyEvaluation }: { gapReport: any; companyEvaluation: any }) {
  if (!gapReport && !companyEvaluation) return <EmptySection title="认知差距" reason="Probe 未返回差距分析数据" />;

  const g = gapReport || {};

  return (
    <section className="mb-10">
      <SectionLabel id="sec-gap">认知差距</SectionLabel>

      {/* 对齐度 */}
      {gapReport && (
        <div className="p-6 rounded-lg mb-5 text-center" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: T.muted }}>
            品牌自述 vs AI 认知 · 对齐度
          </p>
          <p
            className="font-mono font-light tracking-tight"
            style={{ fontSize: 48, lineHeight: 1, color: scoreColor(g.alignment_score ?? 0) }}
          >
            {g.alignment_score ?? "—"}
          </p>
          <p className="text-xs mt-1" style={{ color: T.muted }}>满分 100</p>
          <div className="mt-3 max-w-xs mx-auto">
            <ScoreBar score={g.alignment_score ?? 0} />
          </div>
          {g.one_line_summary && (
            <p className="text-sm mt-3 leading-relaxed" style={{ color: T.secondary }}>
              {g.one_line_summary}
            </p>
          )}
        </div>
      )}

      {/* 对齐项 / 偏差项 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 rounded-lg" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: T.muted }}>
            对齐项 ✓
          </p>
          <div className="flex flex-wrap gap-2">
            {(g.aligned || []).length > 0 ? (
              (g.aligned || []).map((item: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-1 text-[11px] rounded"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", color: "#22C55E" }}
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="text-[11px]" style={{ color: T.muted }}>暂无数据</span>
            )}
          </div>
        </div>
        <div className="p-4 rounded-lg" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: T.muted }}>
            偏差项 ✗
          </p>
          <div className="flex flex-wrap gap-2">
            {(g.misaligned || []).length > 0 ? (
              (g.misaligned || []).map((item: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-1 text-[11px] rounded"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444" }}
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="text-[11px]" style={{ color: T.muted }}>暂无数据</span>
            )}
          </div>
        </div>
      </div>

      {/* 盲点 / 机会 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 rounded-lg" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: T.muted }}>
            盲点 ⚠
          </p>
          <div className="flex flex-wrap gap-2">
            {(g.blind_spots || []).length > 0 ? (
              (g.blind_spots || []).map((item: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-1 text-[11px] rounded"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", color: "#F59E0B" }}
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="text-[11px]" style={{ color: T.muted }}>暂无数据</span>
            )}
          </div>
        </div>
        <div className="p-4 rounded-lg" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: T.muted }}>
            机会 💡
          </p>
          <div className="flex flex-wrap gap-2">
            {(g.opportunities || []).length > 0 ? (
              (g.opportunities || []).map((item: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-1 text-[11px] rounded"
                  style={{ background: T.accentSubtle, border: `1px solid ${T.borderAccent}`, color: T.accent }}
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="text-[11px]" style={{ color: T.muted }}>暂无数据</span>
            )}
          </div>
        </div>
      </div>

      {/* 品牌期望 vs AI认知（次要指标，用户填写了 target_positioning 时才有） */}
      {g.has_target_gap && (
        <div className="p-3 rounded-lg mb-4" style={{ background: T.surface, border: `1px solid ${T.border}`, opacity: 0.85 }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono tracking-wider uppercase" style={{ color: T.muted }}>
              参考：品牌期望 vs AI 认知
            </span>
            <span className="font-mono text-xs" style={{ color: T.accent }}>
              {g.target_alignment_score ?? "—"}/100
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] font-mono mb-1" style={{ color: T.success }}>已对齐</p>
              {(g.target_aligned || []).map((item: string, i: number) => (
                <p key={i} className="text-[10px] leading-relaxed" style={{ color: T.secondary }}>· {item}</p>
              ))}
            </div>
            <div>
              <p className="text-[9px] font-mono mb-1" style={{ color: T.error }}>未对齐</p>
              {(g.target_misaligned || []).map((item: string, i: number) => (
                <p key={i} className="text-[10px] leading-relaxed" style={{ color: T.secondary }}>· {item}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 公司评估 */}
      {companyEvaluation && (
        <div className="p-5 rounded-lg" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: T.muted }}>
            公司评估
          </p>
          {companyEvaluation.overall && (
            <p className="text-sm leading-relaxed mb-3" style={{ color: T.secondary }}>
              {companyEvaluation.overall}
            </p>
          )}
          {companyEvaluation.positioning && (
            <p className="text-xs mb-2" style={{ color: T.accent }}>
              定位：{companyEvaluation.positioning}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <p className="text-[10px] font-mono mb-1" style={{ color: T.success }}>优势</p>
              {(companyEvaluation.strengths || []).map((s: string, i: number) => (
                <p key={i} className="text-[11px]" style={{ color: T.secondary }}>· {s}</p>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-mono mb-1" style={{ color: T.error }}>劣势</p>
              {(companyEvaluation.weaknesses || []).map((w: string, i: number) => (
                <p key={i} className="text-[11px]" style={{ color: T.secondary }}>· {w}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Section 4: 引擎对比 ────────────────────────────────

function Section4({ engineResults }: { engineResults: any }) {
  const engines = Object.entries(engineResults || {}) as [string, any][];

  if (engines.length === 0)
    return <EmptySection title="引擎对比" reason="Probe 未返回引擎对比数据" />;

  return (
    <section className="mb-10">
      <SectionLabel id="sec-engines">引擎对比 · 交叉验证</SectionLabel>

      <p className="text-[11px] leading-relaxed mb-4" style={{ color: T.muted }}>
        三个 AI 引擎独立搜索同一套查询词，交叉验证品牌在不同 AI 系统中的可见度。
      </p>

      {/* 三引擎卡片 */}
      {engines.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {engines.map(([key, er]: [string, any]) => (
            <div key={key} className="rounded-lg overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="p-4 text-center" style={{ borderBottom: er?.raw_data?.answers?.length ? `1px solid ${T.border}` : "none" }}>
                <p className="text-xs font-mono tracking-wider uppercase mb-3" style={{ color: T.accent }}>
                  {ENGINE_DISPLAY[key] || key}
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] font-mono" style={{ color: T.muted }}>引用率</p>
                    <p className="font-mono text-lg" style={{ color: T.text }}>{fmtPct(er?.citation_rate)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono" style={{ color: T.muted }}>推荐率</p>
                    <p className="font-mono text-lg" style={{ color: T.text }}>{fmtPct(er?.recommendation_rate)}</p>
                  </div>
                </div>
              </div>
              {er?.raw_data?.answers && er.raw_data.answers.length > 0 && (
                <div className="p-3 space-y-2 max-h-52 overflow-y-auto" style={{ background: T.surface }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded" style={{ background: "rgba(56,189,248,0.08)", color: T.accent, border: `1px solid rgba(56,189,248,0.15)` }}>证据</span>
                  </div>
                  {er.raw_data.answers.slice(0, 5).map((a: any, i: number) => (
                    <div key={i}>
                      <p className="text-[10px] font-mono mb-1" style={{ color: T.muted }}>
                        问：{truncate(a?.query || `查询 ${i + 1}`, 60)}
                      </p>
                      <p className="text-[11px] leading-relaxed" style={{ color: T.secondary }}>
                        {truncate(typeof a?.answer === "string" ? a.answer : JSON.stringify(a), 200)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </section>
  );
}

// ─── Section 5: 竞品战场 ────────────────────────────────

function Section5({ competitorAnalysis, brandName }: { competitorAnalysis: any[]; brandName: string }) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (!competitorAnalysis || competitorAnalysis.length === 0)
    return <EmptySection title="竞品战场" reason="Probe 未返回竞品对比数据" />;

  const winCount = competitorAnalysis.filter(
    (c: any) => c.winner?.toLowerCase().includes(brandName.toLowerCase())
  ).length;

  return (
    <section className="mb-10">
      <SectionLabel id="sec-competitors">竞品战场 · 逐维对比</SectionLabel>

      <div className="rounded-lg overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {/* 表头 */}
        <div
          className="grid gap-3 px-4 py-2 text-[10px] font-mono tracking-wider uppercase"
          style={{ gridTemplateColumns: "1fr 80px 1fr", color: T.muted, borderBottom: `1px solid ${T.border}` }}
        >
          <span>查询场景</span>
          <span className="text-center">赢家</span>
          <span className="text-center">原因</span>
        </div>

        {competitorAnalysis.map((c: any, i: number) => {
          const isWinner = c.winner?.toLowerCase().includes(brandName.toLowerCase());
          const isTie = c.winner?.toLowerCase() === "tie" || c.winner?.toLowerCase().includes("平");
          const winnerColor = isWinner ? T.success : isTie ? T.secondary : T.error;
          const isOpen = expandedRow === i;

          const hasDetail = c.dimension_scores?.length > 0;

          return (
            <div key={i}>
              <button
                onClick={() => hasDetail && setExpandedRow(isOpen ? null : i)}
                className="w-full grid gap-3 px-4 py-3 text-left text-[11px] transition-all duration-200"
                style={{
                  gridTemplateColumns: "1fr 80px 1fr 36px",
                  background: isOpen
                    ? "rgba(56,189,248,0.03)"
                    : i % 2 === 0
                    ? "transparent"
                    : T.surface,
                  borderLeft: isOpen ? `2px solid ${T.accent}` : "2px solid transparent",
                  borderBottom: i < competitorAnalysis.length - 1 ? `1px solid ${T.border}` : "none",
                  cursor: hasDetail ? "pointer" : "default",
                }}
              >
                <span style={{ color: T.secondary }} className="leading-relaxed" title={c.query}>
                  {truncate(c.query, 50)}
                </span>
                <span className="text-center font-mono" style={{ color: winnerColor }}>
                  {isWinner ? "我们赢" : isTie ? "平局" : truncate(c.winner, 10)}
                </span>
                <span className="text-center leading-relaxed" style={{ color: T.muted }} title={c.reason}>
                  {truncate(c.reason, 80)}
                </span>
                <span className="text-right font-mono text-[8px]" style={{ color: T.muted }}>
                  {hasDetail ? (isOpen ? "收起 ▲" : "展开 ▼") : ""}
                </span>
              </button>

              <AnimatePresence>
                {isOpen && c.dimension_scores?.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 py-3 space-y-2" style={{ background: T.surface }}>
                      <p className="text-[10px] font-mono tracking-wider uppercase" style={{ color: T.accent }}>
                        维度评分
                      </p>
                      {c.dimension_scores.map((ds: any, j: number) => (
                        <div key={j} className="flex items-center gap-3">
                          <span className="text-[10px] font-mono w-24 shrink-0" style={{ color: T.muted }}>
                            {ds.dimension}
                          </span>
                          <div className="flex-1 flex gap-1">
                            {(ds.rankings || []).map((r: any, k: number) => (
                              <span
                                key={k}
                                className="px-2 py-0.5 text-[10px] font-mono rounded"
                                style={{
                                  background: r.brand?.toLowerCase().includes(brandName.toLowerCase())
                                    ? "rgba(34,197,94,0.10)"
                                    : "rgba(255,255,255,0.03)",
                                  color: r.brand?.toLowerCase().includes(brandName.toLowerCase())
                                    ? T.success
                                    : T.secondary,
                                }}
                              >
                                {r.brand} #{r.rank}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-center">
        <span className="text-[11px] font-mono" style={{ color: T.secondary }}>
          你在 <span style={{ color: T.accent }}>{winCount}</span> / {competitorAnalysis.length} 个场景中获胜
        </span>
      </div>
    </section>
  );
}

// ─── Section 6: 数据溯源 ────────────────────────────────

function Section6({ sourceAuthority, citationDetails }: { sourceAuthority: any; citationDetails: any[] }) {
  const [expandedDetail, setExpandedDetail] = useState<number | null>(null);

  if (!sourceAuthority && (!citationDetails || citationDetails.length === 0))
    return <EmptySection title="数据溯源" reason="Probe 未返回引用溯源数据" />;

  const diversity = sourceAuthority?.source_diversity;
  const diversityLabel = diversity >= 0.7 ? "高" : diversity >= 0.4 ? "中" : "低";
  const diversityColor = diversity >= 0.7 ? T.success : diversity >= 0.4 ? T.warning : T.error;

  return (
    <section className="mb-10">
      <SectionLabel id="sec-traceability">数据溯源 · 引用明细</SectionLabel>

      {/* 来源权威度 */}
      {sourceAuthority?.top_sources?.length > 0 && (
        <div className="rounded-lg overflow-hidden mb-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div
            className="grid gap-3 px-4 py-2 text-[10px] font-mono tracking-wider uppercase"
            style={{ gridTemplateColumns: "1fr 72px 56px 48px", color: T.muted, borderBottom: `1px solid ${T.border}` }}
          >
            <span>来源</span>
            <span>类型</span>
            <span className="text-center">权威度</span>
            <span className="text-center">提及</span>
          </div>
          {sourceAuthority.top_sources.map((s: any, i: number) => (
            <div
              key={i}
              className="grid gap-3 px-4 py-2 text-[11px]"
              style={{
                gridTemplateColumns: "1fr 72px 56px 48px",
                background: i % 2 === 0 ? "transparent" : T.surface,
                borderBottom: i < sourceAuthority.top_sources.length - 1 ? `1px solid ${T.border}` : "none",
              }}
            >
              <span className="font-mono" style={{ color: T.accent, wordBreak: "break-all" }}>{s.domain}</span>
              <span style={{ color: T.secondary }}>{s.source_type || "—"}</span>
              <span className="text-center font-mono" style={{ color: T.text }}>{s.authority_score ?? "—"}</span>
              <span className="text-center font-mono" style={{ color: T.text }}>{s.mention_count ?? "—"}</span>
            </div>
          ))}
        </div>
      )}

      {sourceAuthority && (
        <div className="flex items-center gap-3 mb-5 text-[11px]">
          <span style={{ color: T.muted }}>
            来源总数：<span className="font-mono" style={{ color: T.text }}>{sourceAuthority.total_sources ?? "—"}</span>
          </span>
          <span style={{ color: T.muted }}>
            多样性：
            <span className="font-mono" style={{ color: diversityColor }}>
              {(diversity != null ? (diversity * 100).toFixed(0) : "—") + (diversity != null ? "%" : "")} · {diversityLabel}
            </span>
          </span>
        </div>
      )}

      {/* 引用明细 */}
      {citationDetails && citationDetails.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div
            className="grid gap-3 px-4 py-2 text-[10px] font-mono tracking-wider uppercase"
            style={{ gridTemplateColumns: "1fr 36px 50px 1fr", color: T.muted, borderBottom: `1px solid ${T.border}` }}
          >
            <span>查询词</span>
            <span className="text-center">提及</span>
            <span className="text-center">位置</span>
            <span>来源</span>
          </div>
          {citationDetails.slice(0, 20).map((d: any, i: number) => {
            const isOpen = expandedDetail === i;
            return (
              <div key={i}>
                <button
                  onClick={() => setExpandedDetail(isOpen ? null : i)}
                  className="w-full grid gap-3 px-4 py-2 text-[11px] transition-colors hover:brightness-110 text-left"
                  style={{
                    gridTemplateColumns: "1fr 36px 50px 1fr",
                    background: i % 2 === 0 ? "transparent" : T.surface,
                    borderBottom: i < citationDetails.slice(0, 20).length - 1 ? `1px solid ${T.border}` : "none",
                  }}
                >
                  <span className="leading-relaxed" style={{ color: T.secondary }}>
                    {truncate(d.query, 40)}
                  </span>
                  <span className="text-center font-mono" style={{ color: d.mentioned ? T.success : T.error }}>
                    {d.mentioned ? "✓" : "✗"}
                  </span>
                  <span className="text-center font-mono" style={{ color: T.muted }}>
                    {d.position || "—"}
                  </span>
                  <span className="font-mono leading-relaxed" style={{ color: T.accent, wordBreak: "break-all" }}>
                    {d.reference_source || "—"}
                  </span>
                </button>
                <AnimatePresence>
                  {isOpen && d.mention_context && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 py-3" style={{ background: T.surface }}>
                        <p className="text-[11px] leading-relaxed" style={{ color: T.secondary }}>
                          {d.mention_context}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Section 7: 诊断报告 ────────────────────────────────

function Section7({ diagnosis, competitorGap, oneLineVerdict, analystEngineComparison }: {
  diagnosis: any;
  competitorGap: any;
  oneLineVerdict: string;
  analystEngineComparison: any;
}) {
  if (!diagnosis && !oneLineVerdict && !competitorGap) return <EmptySection title="诊断报告" reason="Analyst 未返回诊断数据" />;

  return (
    <section className="mb-10">
      <SectionLabel id="sec-diagnosis">诊断报告 · 14条规则逐条检查</SectionLabel>

      {/* 一句话诊断 */}
      {oneLineVerdict && (
        <div className="p-5 rounded-lg mb-5" style={{ background: T.accentSubtle, border: `1px solid ${T.borderAccent}` }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: T.accent }}>一句话诊断</p>
          <p className="text-sm leading-relaxed" style={{ color: T.text }}>{oneLineVerdict}</p>
        </div>
      )}

      {/* 核心问题 */}
      {diagnosis && (
        <div className="p-5 rounded-lg mb-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: T.muted }}>根因分析</p>

          {diagnosis.core_problem && (
            <div className="mb-4 p-4 rounded-lg" style={{
              background: diagnosis.severity === "critical" ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)",
              border: `1px solid ${diagnosis.severity === "critical" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)"}`,
            }}>
              <p className="text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{
                color: diagnosis.severity === "critical" ? "#EF4444" : "#F59E0B",
              }}>
                {diagnosis.severity === "critical" ? "⚠ 严重" : "⚡ 警告"}
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: T.secondary }}>
                {diagnosis.core_problem}
              </p>
            </div>
          )}

          {diagnosis.problem_detail && (
            <p className="text-[11px] leading-relaxed" style={{ color: T.secondary }}>
              {diagnosis.problem_detail}
            </p>
          )}
        </div>
      )}

      {/* 竞品差距 */}
      {competitorGap?.losing_dimensions?.length > 0 && (
        <div className="p-5 rounded-lg mb-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: T.muted }}>竞品差距 · 落后维度</p>
          <div className="space-y-3">
            {competitorGap.losing_dimensions.map((dim: any, i: number) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-medium" style={{ color: T.text }}>{dim.dimension}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{
                    background: dim.severity === "critical" ? "rgba(239,68,68,0.10)" : "rgba(245,158,11,0.10)",
                    color: dim.severity === "critical" ? "#EF4444" : "#F59E0B",
                  }}>
                    {dim.severity === "critical" ? "严重" : "警告"}
                  </span>
                </div>
                {dim.qualitative && (
                  <p className="text-[11px] leading-relaxed" style={{ color: T.secondary }}>{dim.qualitative}</p>
                )}
                {dim.direction && (
                  <p className="text-[10px] font-mono mt-1" style={{ color: T.muted }}>
                    趋势：{dim.direction === "negative" ? "下降 ↓" : dim.direction}
                    {dim.confidence && ` · 置信度: ${dim.confidence}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyst 引擎对比 */}
      {analystEngineComparison?.per_engine && (
        <div className="p-5 rounded-lg" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: T.muted }}>
            Analyst 引擎一致性
          </p>
          <div className="flex items-center gap-4 mb-3 text-[11px]">
            <span style={{ color: T.secondary }}>
              最佳引擎：<span className="font-mono" style={{ color: T.accent }}>{analystEngineComparison.best_engine || "—"}</span>
            </span>
            <span style={{ color: T.secondary }}>
              一致性：<span className="font-mono" style={{ color: T.text }}>{analystEngineComparison.consistency || "—"}</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(analystEngineComparison.per_engine as Record<string, any>).map(([engine, stats]: [string, any]) => (
              <div key={engine} className="p-3 rounded-lg text-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: T.accent }}>
                  {ENGINE_DISPLAY[engine] || engine}
                </p>
                <p className="text-[11px] font-mono" style={{ color: T.text }}>
                  引用率 {fmtPct(stats.citation_rate)}
                </p>
                <p className="text-[11px] font-mono" style={{ color: T.text }}>
                  推荐率 {fmtPct(stats.recommendation_rate)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Section 8: 处方 ──────────────────────────────────────

function Section8({ prescription }: { prescription: any[] }) {
  if (!prescription || prescription.length === 0) return <EmptySection title="处方" reason="Doctor 未返回处方数据" />;

  const p0 = prescription.filter((p: any) => p.priority === "P0");
  const p1 = prescription.filter((p: any) => p.priority === "P1");
  const p2 = prescription.filter((p: any) => p.priority === "P2");

  return (
    <section className="mb-10">
      <SectionLabel id="sec-prescription">处方 · P0/P1/P2 任务清单</SectionLabel>

      <p className="text-[11px] leading-relaxed mb-5" style={{ color: T.muted }}>
        每项处方包含具体执行步骤、预期效果和验证方法。按优先级从 P0（立即）到 P2（计划）执行。
      </p>

      {[
        { label: "P0 · 立即执行", items: p0, color: "#EF4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.15)" },
        { label: "P1 · 短期计划", items: p1, color: "#F59E0B", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)" },
        { label: "P2 · 长期规划", items: p2, color: "#22C55E", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.15)" },
      ].map((group) => (
        <div key={group.label} className="mb-5">
          <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: group.color }}>
            {group.label} ({group.items.length})
          </p>
          <div className="space-y-3">
            {group.items.map((item: any, i: number) => (
              <div key={i} className="p-4 rounded-lg" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-start gap-3 mb-2">
                  <span
                    className="shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded mt-0.5"
                    style={{ background: group.bg, border: `1px solid ${group.border}`, color: group.color }}
                  >
                    {item.priority}
                  </span>
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: T.text }}>{item.action}</p>
                    {item.target_page && (
                      <p className="text-[11px] font-mono" style={{ color: T.muted }}>目标页面: {item.target_page}</p>
                    )}
                  </div>
                </div>

                {item.rationale && (
                  <div className="ml-9 mb-2">
                    <p className="text-[11px] leading-relaxed" style={{ color: T.secondary }}>{item.rationale}</p>
                  </div>
                )}

                {item.action_steps?.length > 0 && (
                  <div className="ml-9 mb-2">
                    <p className="text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: T.muted }}>执行步骤</p>
                    <ol className="space-y-1">
                      {item.action_steps.map((step: string, j: number) => (
                        <li key={j} className="text-[11px] flex gap-2" style={{ color: T.secondary }}>
                          <span className="font-mono shrink-0" style={{ color: T.muted }}>{j + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="ml-9 flex flex-wrap gap-4 text-[10px] font-mono">
                  {item.expected_impact && (
                    <span style={{ color: T.success }}>预期: {item.expected_impact}</span>
                  )}
                  {item.estimated_time && (
                    <span style={{ color: T.muted }}>预计: {item.estimated_time}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

// ─── CTA ────────────────────────────────────────────────

function SectionCTA({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm leading-relaxed mb-1" style={{ color: T.secondary }}>
        侦察报告已生成
      </p>
      <p className="text-xs leading-relaxed mb-6" style={{ color: T.muted }}>
        你已经看到 AI 怎么描述你的品牌、哪些竞品在抢你的位置。<br />
        但你还不知道为什么——以及怎么改。
      </p>
      <div
        className="p-6 rounded-lg text-center max-w-md mx-auto"
        style={{ background: T.card, border: `1px solid ${T.borderAccent}` }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: T.text }}>解锁诊断报告 + 处方</p>
        <p className="text-[11px] leading-relaxed mb-4" style={{ color: T.muted }}>
          Analyst 诊断师：14条规则逐条检查，告诉你根因<br />
          Doctor 医师：P0/P1/P2 任务清单，告诉你怎么改
        </p>
        <button
          onClick={onUpgrade}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ background: T.accent, color: "#08080D" }}
        >
          升级解锁 · {UPGRADE_PRICE}
        </button>
      </div>
    </div>
  );
}

// ─── 侧导航 ─────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "sec-score", label: "综合评分", num: "01" },
  { id: "sec-perception", label: "AI认知", num: "02" },
  { id: "sec-gap", label: "认知差距", num: "03" },
  { id: "sec-engines", label: "引擎对比", num: "04" },
  { id: "sec-competitors", label: "竞品战场", num: "05" },
  { id: "sec-traceability", label: "数据溯源", num: "06" },
];

// ─── 主组件 ─────────────────────────────────────────────

export function ScanReport({ data, tier, mode, domain, brandName, onUpgrade, onBack, onViewAnalyst }: Props) {
  const probe = data?.probe || {};
  const diagnosis = data?.diagnosis;
  const prescription = data?.actions;
  const competitorGap = data?.competitor_gap;
  const oneLineVerdict = data?.one_line_verdict;
  const analystEngineComparison = data?.engine_comparison;
  const [activeSection, setActiveSection] = useState(NAV_ITEMS[0].id);
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // IntersectionObserver：滚动时自动高亮当前 section
  useEffect(() => {
    if (!contentRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    NAV_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [probe]);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  }, []);

  const queryCount = probe.query_terms?.length || 0;
  const engineCount = Object.keys(probe.engine_results || {}).length;

  return (
    <div className="flex h-full" style={{ background: T.bg }}>
      {/* 主内容区 — 左侧可滚动 */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-6" style={{ paddingRight: 120 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-lg font-semibold tracking-tight" style={{ color: T.text }}>
                  {brandName || domain}
                </h1>
                <span
                  className="text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-0.5 rounded"
                  style={{ background: "rgba(56,189,248,0.08)", color: T.accent, border: `1px solid rgba(56,189,248,0.15)` }}
                >
                  侦察报告
                </span>
              </div>
              <p className="text-[11px] font-mono" style={{ color: T.muted }}>
                {domain}
                {queryCount > 0 && ` · ${queryCount} 个查询词`}
                {engineCount > 0 && ` · ${engineCount} 个引擎`}
                {probe.elapsed != null && ` · ${probe.elapsed.toFixed(1)}s`}
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-lg text-[11px] font-mono tracking-wider uppercase transition-all hover:brightness-125"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.secondary }}
            >
              查看仪表盘
            </button>
          </div>

          {/* Section 1: 综合评分 - 所有模式都显示 */}
          <Section1 companyScore={probe.company_score} />

          {/* Light 模式: 升级 CTA */}
          {mode === "light" && (
            <div className="text-center py-8">
              <p className="text-sm leading-relaxed mb-1" style={{ color: T.secondary }}>
                以上为免费体检可见数据
              </p>
              <p className="text-xs leading-relaxed mb-4" style={{ color: T.muted }}>
                升级后解锁：AI认知画像 · 引擎对比 · 竞品分析 · 引用溯源 · 诊断报告 · 处方清单
              </p>
              <button
                onClick={onUpgrade}
                className="px-5 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
                style={{ background: T.accent, color: "#08080D" }}
              >
                升级解锁完整报告
              </button>
            </div>
          )}

          {/* Full 模式: 渲染 Section2-6 */}
          {mode === "full" && (
            <>
              <SectionDivider />
              {tier !== "free" ? (
                <>
                  <Section2 marketPerception={probe.market_perception} aiNarrative={probe.ai_narrative} />
                  <SectionDivider />
                  <Section3 gapReport={probe.gap_report} companyEvaluation={probe.company_evaluation} />
                  <SectionDivider />
                  <Section4 engineResults={probe.engine_results} />
                  <SectionDivider />
                  <Section5 competitorAnalysis={probe.competitor_analysis} brandName={brandName} />
                  <SectionDivider />
                  <Section6 sourceAuthority={probe.source_authority} citationDetails={probe.citation_metrics?.details} />
                </>
              ) : (
                <>
                  <LockedSection title="AI认知画像" description="了解 AI 如何描述你的品牌、你的优势和劣势" onUpgrade={onUpgrade}>
                    <Section2 marketPerception={probe.market_perception} aiNarrative={probe.ai_narrative} />
                  </LockedSection>
                  <SectionDivider />
                  <LockedSection title="认知差距" description="品牌自述 vs AI 认知的对齐度分析" onUpgrade={onUpgrade}>
                    <Section3 gapReport={probe.gap_report} companyEvaluation={probe.company_evaluation} />
                  </LockedSection>
                  <SectionDivider />
                  <LockedSection title="引擎对比 · 交叉验证" description="三个 AI 引擎独立搜索同一套查询词" onUpgrade={onUpgrade}>
                    <Section4 engineResults={probe.engine_results} />
                  </LockedSection>
                  <SectionDivider />
                  <LockedSection title="竞品战场" description="逐查询场景的竞品对比分析" onUpgrade={onUpgrade}>
                    <Section5 competitorAnalysis={probe.competitor_analysis} brandName={brandName} />
                  </LockedSection>
                  <SectionDivider />
                  <LockedSection title="数据溯源" description="引用来源权威度分析与引用明细" onUpgrade={onUpgrade}>
                    <Section6 sourceAuthority={probe.source_authority} citationDetails={probe.citation_metrics?.details} />
                  </LockedSection>
                </>
              )}
            </>
          )}

          {/* P1-7: 下一步引导 → Analyst */}
          {mode === "full" && tier !== "free" && onViewAnalyst && (data?.diagnosis || data?.one_line_verdict) && (
            <div className="text-center py-6">
              <button
                onClick={onViewAnalyst}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:brightness-110"
                style={{
                  background: "rgba(59,130,246,0.12)",
                  border: "1px solid rgba(59,130,246,0.25)",
                  color: "#3B82F6",
                }}
              >
                查看诊断报告 → Analyst
              </button>
            </div>
          )}

        </div>
      </div>

      {/* 右侧固定导航 — 不随页面滚动，上下顶格 */}
      <nav
        className="fixed right-0 top-0 h-screen flex flex-col justify-between shrink-0 z-10"
        style={{ width: 96, paddingTop: "calc((100vh - 360px) / 2)", paddingBottom: "calc((100vh - 360px) / 2)" }}
      >
        {/* 左侧边线 */}
        <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: "linear-gradient(180deg, transparent 5%, rgba(255,255,255,0.06) 15%, rgba(255,255,255,0.06) 85%, transparent 95%)" }} />

        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="w-full flex items-center gap-3 py-2.5 px-4 transition-all group relative"
            >
              {/* 活跃指示器 — 左侧竖条 */}
              <motion.div
                className="absolute left-0 w-0.5 rounded-r-full"
                animate={{
                  height: isActive ? 28 : 0,
                  background: isActive ? T.accent : "transparent",
                  boxShadow: isActive ? "0 0 8px rgba(56,189,248,0.4)" : "none",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              />

              <span
                className="text-[10px] font-mono tracking-wider shrink-0 transition-all"
                style={{
                  color: isActive ? T.accent : T.muted,
                  opacity: isActive ? 1 : 0.4,
                }}
              >
                {item.num}
              </span>
              <span
                className="text-xs tracking-wide transition-all text-left leading-tight"
                style={{
                  color: isActive ? T.text : T.muted,
                  opacity: isActive ? 1 : 0.4,
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {item.label}
              </span>

              {/* hover 光晕 */}
              {!isActive && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at left center, rgba(56,189,248,0.04) 0%, transparent 60%)" }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
