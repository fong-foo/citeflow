"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { RadarChart } from "@/components/radar-chart";

interface AnalystReportProps {
  data: any;
  onBackToBriefing: () => void;
  onViewDoctor: () => void;
}

export function AnalystReport({ data, onBackToBriefing, onViewDoctor }: AnalystReportProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [expandedDim, setExpandedDim] = useState<number | null>(null);
  const m4Ref = useRef<HTMLDivElement>(null);

  // ── Analyst 输出 ──
  const diagnosis = data?.diagnosis || {};
  const oneLineVerdict = data?.one_line_verdict || "";
  const threeLayerChain = data?.three_layer_chain || {};
  const engineComparison = data?.engine_comparison || {};
  const engineInsights: string[] = data?.engine_insights || [];
  const engineRecommendations: string[] = data?.engine_recommendations || [];
  const bClassPerception = data?.b_class_perception || {};
  const cClassMatrix = data?.c_class_matrix || {};
  const competitorGap = data?.competitor_gap || {};
  const contentTemplates = data?.content_templates || {};

  // ── Probe 数据（顶层，与 analyst 输出合并后为扁平结构）──
  const companyScore = data?.company_score;
  const overall = companyScore?.overall;
  const dimensions = companyScore?.dimensions || [];
  const cm = data?.citation_metrics || {};
  const mentionRate = cm?.mention_rate ?? null;
  const industryRate = cm?.industry_rate ?? cm?.rate ?? null;
  const aRecommendRate = cm?.a_recommendation_rate ?? null;
  const cRecommendRate = cm?.c_recommendation_rate ?? null;

  // ── 判空 ──
  const hasDiagnosis = !!(diagnosis.core_problem || oneLineVerdict);
  const hasEngineData = !!(engineComparison.per_engine && Object.keys(engineComparison.per_engine).length > 0);
  const hasBClass = !!(bClassPerception.ai_identity || bClassPerception.gap_description);
  const hasThreeLayer = !!(threeLayerChain.observation || threeLayerChain.explanation || threeLayerChain.implication);
  const hasCMatrix = !!(cClassMatrix.wins != null || cClassMatrix.total_comparisons != null);
  const hasCompetitorGap = !!(
    competitorGap &&
    ((competitorGap.winning_dimensions?.length > 0) ||
     (competitorGap.losing_dimensions?.length > 0))
  );
  const hasCompetitorData = hasCMatrix || hasCompetitorGap;
  const hasContentTemplates = !!(
    contentTemplates &&
    (contentTemplates.page_title || contentTemplates.meta_description)
  );

  // ── Severity ──
  const severity = diagnosis?.severity || "healthy";
  const sevColor = severity === "critical" ? "#EF4444" : severity === "warning" ? "#F59E0B" : "#22C55E";
  const sevBg = severity === "critical" ? "rgba(239,68,68,0.08)" : severity === "warning" ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)";
  const sevLabel = severity === "critical" ? "严重" : severity === "warning" ? "警告" : "良好";

  // ── Copy helper ──
  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast(`已复制 ${label}`);
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast("复制失败");
      setTimeout(() => setToast(null), 2000);
    }
  }

  function scrollToM4() {
    m4Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Shared styles ──
  const cardStyle: React.CSSProperties = {
    background: "#131318",
    border: "1px solid rgba(255,255,255,0.04)",
    borderRadius: 8,
  };

  const moduleTitleStyle: React.CSSProperties = {
    fontSize: 10,
    fontFamily: "JetBrains Mono, monospace",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "rgba(59,130,246,0.4)",
    marginBottom: 16,
  };

  function scoreColor(v: number) {
    if (v >= 50) return "#22C55E";
    if (v >= 20) return "#F59E0B";
    return "#EF4444";
  }

  // ═══════════════════════════════════════════════════════
  // M1: 诊断摘要
  // ═══════════════════════════════════════════════════════
  function renderM1() {
    if (!hasDiagnosis && overall == null && mentionRate == null) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0 }}
      >
        <p style={moduleTitleStyle}>诊断摘要</p>

        <div style={{ ...cardStyle, borderColor: sevColor + "20", background: sevBg }} className="p-5">
          {/* Severity badge */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: sevBg, color: sevColor, border: `1px solid ${sevColor}20` }}
            >
              {sevLabel}
            </span>
                      </div>

          {/* One-line verdict */}
          {oneLineVerdict && (
            <p className="text-sm leading-relaxed mb-4" style={{ color: "#EDEDEF" }}>
              {oneLineVerdict}
            </p>
          )}

          {/* Core problem */}
          {diagnosis.core_problem && (
            <div className="rounded-lg px-3 py-3 mb-3" style={{ background: "rgba(59,130,246,0.04)", borderLeft: "2px solid rgba(59,130,246,0.5)" }}>
              <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(59,130,246,0.6)" }}>
                核心问题
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>
                {diagnosis.core_problem}
              </p>
            </div>
          )}

          {/* Problem detail */}
          {diagnosis.problem_detail && (
            <div className="mb-3">
              <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                详情
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: "#5E5E78" }}>
                {diagnosis.problem_detail}
              </p>
            </div>
          )}

          {/* Link to M4 */}
          {hasThreeLayer && (
            <button
              onClick={scrollToM4}
              className="text-[10px] font-mono transition-colors duration-200"
              style={{ color: "#4A4A60" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#7DD3FC"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#4A4A60"; }}
            >
              诊断依据：三层链 →
            </button>
          )}
        </div>

        {/* Score sub-card */}
        {(overall != null || mentionRate != null) && (
          <div style={cardStyle} className="p-4 mt-3">
            <div className="flex flex-wrap gap-4">
              {overall != null && (
                <div className="text-center min-w-[60px]">
                  <p className="text-xl font-mono font-bold" style={{ color: scoreColor(overall) }}>
                    {overall}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#6A6A82" }}>综合评分</p>
                </div>
              )}
              {mentionRate != null && (
                <div className="text-center min-w-[60px]">
                  <p className="text-xl font-mono font-bold" style={{ color: scoreColor(mentionRate) }}>
                    {mentionRate.toFixed(1)}%
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#6A6A82" }}>提及率</p>
                </div>
              )}
              {industryRate != null && (
                <div className="text-center min-w-[60px]">
                  <p className="text-xl font-mono font-bold" style={{ color: scoreColor(industryRate) }}>
                    {industryRate.toFixed(1)}%
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#6A6A82" }}>A类引用率</p>
                </div>
              )}
              {aRecommendRate != null && (
                <div className="text-center min-w-[60px]">
                  <p className="text-xl font-mono font-bold" style={{ color: scoreColor(aRecommendRate) }}>
                    {aRecommendRate.toFixed(1)}%
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#6A6A82" }}>A类推荐率</p>
                </div>
              )}
              {cRecommendRate != null && (
                <div className="text-center min-w-[60px]">
                  <p className="text-xl font-mono font-bold" style={{ color: scoreColor(cRecommendRate) }}>
                    {cRecommendRate.toFixed(1)}%
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#6A6A82" }}>C类推荐率</p>
                </div>
              )}
            </div>
            {/* Radar chart */}
            {dimensions.length >= 3 && (
              <div className="mt-4 flex flex-col items-center">
                <RadarChart dimensions={dimensions} size={240} onDimensionClick={setExpandedDim} />
                {expandedDim != null && dimensions[expandedDim] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="w-full mt-3 px-3 py-3 rounded-lg"
                    style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.08)" }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: "#EDEDEF" }}>
                      {dimensions[expandedDim].name}
                    </p>
                    {dimensions[expandedDim].evidence && (
                      <p className="text-[11px] leading-relaxed mb-2" style={{ color: "#9A9AB0" }}>
                        {dimensions[expandedDim].evidence}
                      </p>
                    )}
                    {dimensions[expandedDim].suggestion && (
                      <p className="text-[11px] leading-relaxed" style={{ color: "#7DD3FC" }}>
                        {dimensions[expandedDim].suggestion}
                      </p>
                    )}
                  </motion.div>
                )}
                <p className="text-[10px] mt-2" style={{ color: "#5E5E78" }}>
                  点击维度节点查看证据
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // M2: 多引擎情报
  // ═══════════════════════════════════════════════════════
  function renderM2() {
    if (!hasEngineData) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <p style={moduleTitleStyle}>多引擎情报</p>
          <div style={cardStyle} className="p-6 flex flex-col items-center justify-center gap-2">
            <p className="text-xs" style={{ color: "#5E5E78" }}>
              {isLightMode ? "当前扫描未包含此数据" : "暂无引擎对比数据"}
            </p>
            {isLightMode && (
              <p className="text-[10px]" style={{ color: "#4A4A60" }}>
                请使用完整侦察模式重新扫描
              </p>
            )}
          </div>
        </motion.div>
      );
    }

    const perEngine = engineComparison.per_engine || {};
    const engines = [
      { key: "gpt", label: "ChatGPT" },
      { key: "gemini", label: "Gemini" },
      { key: "haiku", label: "Claude" },
    ].filter(e => perEngine[e.key]);

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <p style={moduleTitleStyle}>多引擎情报</p>

        {/* Engine cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {engines.map(({ key, label }) => {
            const ed = perEngine[key] || {};
            const eRate = ed.citation_rate ?? 0;
            const eRec = ed.recommendation_rate ?? 0;
            const eSources: string[] = ed.top_sources || [];
            const barW = Math.min(eRate, 100);

            return (
              <div key={key} style={cardStyle} className="p-4">
                <p className="text-xs font-semibold mb-3" style={{ color: "#EDEDEF" }}>{label}</p>

                <div className="mb-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px]" style={{ color: "#6A6A82" }}>A类引用率</span>
                    <span className="text-xs font-mono font-semibold" style={{ color: scoreColor(eRate) }}>
                      {eRate}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${barW}%` }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      style={{ background: scoreColor(eRate), boxShadow: `0 0 6px ${scoreColor(eRate)}40` }}
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px]" style={{ color: "#6A6A82" }}>推荐率</span>
                    <span className="text-xs font-mono font-semibold" style={{ color: scoreColor(eRec) }}>
                      {eRec}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(eRec, 100)}%` }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      style={{ background: scoreColor(eRec), boxShadow: `0 0 6px ${scoreColor(eRec)}40` }}
                    />
                  </div>
                </div>

                {eSources.length > 0 && (
                  <p className="text-[10px] leading-relaxed" style={{ color: "#5E5E78" }}>
                    来源: {eSources.slice(0, 3).join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Engine summary */}
        <div style={cardStyle} className="p-4 mb-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: "#9A9AB0" }}>
            {engineComparison.best_engine && (
              <span>最佳引擎: <span style={{ color: "#22C55E" }}>{engineComparison.best_engine}</span></span>
            )}
            {engineComparison.worst_engine && (
              <span>最差引擎: <span style={{ color: "#EF4444" }}>{engineComparison.worst_engine}</span></span>
            )}
            {engineComparison.citation_rate_diff != null && (
              <span>引用率差异: {engineComparison.citation_rate_diff}%</span>
            )}
            {engineComparison.recommendation_rate_diff != null && (
              <span>推荐率差异: {engineComparison.recommendation_rate_diff}%</span>
            )}
            {engineComparison.consistency && (
              <span>一致性: {engineComparison.consistency}</span>
            )}
          </div>
        </div>

        {/* Insights */}
        {engineInsights.length > 0 && (
          <div style={cardStyle} className="p-4 mb-4">
            <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: "rgba(255,255,255,0.2)" }}>
              引擎洞察
            </p>
            <ul className="flex flex-col gap-2">
              {engineInsights.map((text, i) => (
                <li key={i} className="text-xs leading-relaxed flex items-start gap-2" style={{ color: "#9A9AB0" }}>
                  <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "rgba(96,165,250,0.5)" }} />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {engineRecommendations.length > 0 && (
          <div style={cardStyle} className="p-4">
            <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: "rgba(255,255,255,0.2)" }}>
              引擎优化建议
            </p>
            <ul className="flex flex-col gap-2">
              {engineRecommendations.map((text, i) => (
                <li key={i} className="text-xs leading-relaxed flex items-start gap-2" style={{ color: "#7DD3FC" }}>
                  <span className="mt-1.5 shrink-0" style={{ color: "rgba(59,130,246,0.6)" }}>→</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // M3: AI 眼中的你
  // ═══════════════════════════════════════════════════════
  function renderM3() {
    if (!hasBClass) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p style={moduleTitleStyle}>AI 眼中的你</p>
          <div style={cardStyle} className="p-6 flex flex-col items-center justify-center gap-2">
            <p className="text-xs" style={{ color: "#5E5E78" }}>官网内容获取失败</p>
            <p className="text-[10px]" style={{ color: "#4A4A60" }}>无法生成 AI 认知画像</p>
          </div>
        </motion.div>
      );
    }

    const aiStrengths: string[] = bClassPerception.ai_strengths || [];
    const aiWeaknesses: string[] = bClassPerception.ai_weaknesses || [];
    const blindSpots: string[] = bClassPerception.blind_spots || [];

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <p style={moduleTitleStyle}>AI 眼中的你</p>

        <div style={cardStyle} className="p-5">
          {/* AI identity */}
          {bClassPerception.ai_identity && (
            <div className="mb-4">
              <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                AI 认为你是
              </p>
              <p className="text-sm font-semibold" style={{ color: "#EDEDEF" }}>
                {bClassPerception.ai_identity}
              </p>
            </div>
          )}

          {/* Brand self identity */}
          {bClassPerception.brand_self_identity && (
            <div className="mb-4">
              <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                你自称是
              </p>
              <p className="text-xs" style={{ color: "#9A9AB0" }}>
                {bClassPerception.brand_self_identity}
              </p>
            </div>
          )}

          {/* Gap description */}
          {bClassPerception.gap_description && (
            <div className="rounded-lg px-3 py-3 mb-4" style={{ background: "rgba(59,130,246,0.04)", borderLeft: "2px solid rgba(59,130,246,0.5)" }}>
              <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(59,130,246,0.6)" }}>
                认知差距
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: "#9A9AB0" }}>
                {bClassPerception.gap_description}
              </p>
            </div>
          )}

          {/* Strengths / Weaknesses / Blind spots */}
          <div className="flex flex-col gap-4">
            {aiStrengths.length > 0 && (
              <div>
                <p className="text-[10px] font-mono mb-2" style={{ color: "rgba(34,197,94,0.5)" }}>AI 看到的优势</p>
                <div className="flex flex-wrap gap-1.5">
                  {aiStrengths.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 text-[11px] rounded" style={{ background: "rgba(34,197,94,0.08)", color: "#22C55E" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {aiWeaknesses.length > 0 && (
              <div>
                <p className="text-[10px] font-mono mb-2" style={{ color: "rgba(239,68,68,0.5)" }}>AI 看到的劣势</p>
                <div className="flex flex-wrap gap-1.5">
                  {aiWeaknesses.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 text-[11px] rounded" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {blindSpots.length > 0 && (
              <div>
                <p className="text-[10px] font-mono mb-2" style={{ color: "rgba(255,255,255,0.1)" }}>AI 不知道的</p>
                <div className="flex flex-wrap gap-1.5">
                  {blindSpots.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 text-[11px] rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#6A6A82" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // M4: 三层诊断链（保持现有实现）
  // ═══════════════════════════════════════════════════════
  function renderM4() {
    if (!hasThreeLayer) return null;

    const steps = [
      { num: "①", label: "数据层", key: "observation" as const, color: "rgba(59,130,246,0.5)" },
      { num: "②", label: "解释层", key: "explanation" as const, color: "rgba(245,158,11,0.5)" },
      { num: "③", label: "影响层", key: "implication" as const, color: "rgba(239,68,68,0.5)" },
    ];

    const chainBg = severity === "critical" ? "rgba(239,68,68,0.03)" : severity === "warning" ? "rgba(245,158,11,0.03)" : "rgba(34,197,94,0.03)";
    const chainBorder = severity === "critical" ? "rgba(239,68,68,0.08)" : severity === "warning" ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)";

    return (
      <motion.div
        ref={m4Ref}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <p style={moduleTitleStyle}>三层诊断链</p>
        <div style={{ ...cardStyle, background: chainBg, border: `1px solid ${chainBorder}` }} className="p-5">
          <div className="flex gap-3">
            {steps.map((step, i) => (
              <div key={step.key} className="flex gap-3 items-start" style={{ flex: 1, minWidth: 0 }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono mb-2" style={{ color: step.color }}>
                    {step.num} {step.label}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>
                    {threeLayerChain?.[step.key] || "暂无数据"}
                  </p>
                </div>
                {i < 2 && (
                  <span className="text-lg shrink-0 mt-4" style={{ color: "#3A3A48" }}>→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // M5: 竞品分析（保持现有实现）
  // ═══════════════════════════════════════════════════════
  function renderM5() {
    if (!hasCompetitorData) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p style={moduleTitleStyle}>竞品分析</p>
          <div style={cardStyle} className="p-6 flex flex-col items-center justify-center gap-2">
            <p className="text-xs" style={{ color: "#5E5E78" }}>暂无竞品数据</p>
            <p className="text-[10px]" style={{ color: "#4A4A60" }}>请添加竞品后重新完整扫描</p>
          </div>
        </motion.div>
      );
    }

    const wins = hasCMatrix ? (cClassMatrix.wins ?? 0) : 0;
    const losses = hasCMatrix ? (cClassMatrix.losses ?? 0) : 0;
    const ties = hasCMatrix ? (cClassMatrix.ties ?? 0) : 0;
    const total = wins + losses + ties;
    const winningDims: string[] = hasCMatrix
      ? (cClassMatrix.winning_dimensions || [])
      : (competitorGap?.winning_dimensions?.map((d: any) => d.dimension || d) || []);
    const losingDims: string[] = hasCMatrix
      ? (cClassMatrix.losing_dimensions || [])
      : (competitorGap?.losing_dimensions?.map((d: any) => d.dimension || d) || []);
    const keyInsight = hasCMatrix
      ? (cClassMatrix.key_insight || "")
      : (competitorGap?.root_cause || "");
    const counterStrategy = competitorGap?.counter_strategy || "";

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <p style={moduleTitleStyle}>竞品分析 · C类查询</p>
        <div style={cardStyle} className="p-5">
          {/* Win/Loss/Tie summary */}
          {hasCMatrix && total > 0 && (
            <>
              <div className="flex gap-6 mb-3">
                <span className="text-sm font-mono font-semibold" style={{ color: "#22C55E" }}>{wins}胜</span>
                <span className="text-sm font-mono font-semibold" style={{ color: "#EF4444" }}>{losses}负</span>
                <span className="text-sm font-mono font-semibold" style={{ color: "#F59E0B" }}>{ties}平</span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                {wins > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(wins / total) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    style={{ background: "#22C55E", opacity: 0.6 }}
                  />
                )}
                {losses > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(losses / total) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    style={{ background: "#EF4444", opacity: 0.6 }}
                  />
                )}
                {ties > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(ties / total) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                    style={{ background: "#F59E0B", opacity: 0.6 }}
                  />
                )}
              </div>
            </>
          )}

          {/* Winning dimensions */}
          {winningDims.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-mono mb-1.5" style={{ color: "rgba(34,197,94,0.5)" }}>你赢在</p>
              <div className="flex flex-wrap gap-1.5">
                {winningDims.map((dim: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-[11px] rounded"
                    style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.10)", color: "#22C55E" }}
                  >
                    {dim}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Losing dimensions */}
          {losingDims.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-mono mb-1.5" style={{ color: "rgba(239,68,68,0.5)" }}>你输在</p>
              <div className="flex flex-wrap gap-1.5">
                {losingDims.map((dim: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-[11px] rounded"
                    style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.10)", color: "#EF4444" }}
                  >
                    {dim}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key insight */}
          {keyInsight && (
            <div className="rounded-lg px-3 py-2.5 mb-3" style={{ background: "rgba(255,255,255,0.015)" }}>
              <p className="text-[10px] font-mono mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>关键洞察</p>
              <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>{keyInsight}</p>
            </div>
          )}

          {/* Counter strategy */}
          {counterStrategy && (
            <div className="rounded-lg px-3 py-2.5" style={{ background: "rgba(59,130,246,0.03)" }}>
              <p className="text-[10px] font-mono mb-1" style={{ color: "rgba(59,130,246,0.5)" }}>对策</p>
              <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>{counterStrategy}</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // M6: 内容改造指南
  // ═══════════════════════════════════════════════════════
  function renderM6() {
    if (!hasContentTemplates) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p style={moduleTitleStyle}>内容改造指南</p>
          <div style={cardStyle} className="p-6 flex flex-col items-center justify-center gap-2">
            <p className="text-xs" style={{ color: "#5E5E78" }}>
              {data?.brand_profile?._fallback ? "官网内容获取失败" : "暂无内容改造建议"}
            </p>
            <p className="text-[10px]" style={{ color: "#4A4A60" }}>
              {data?.brand_profile?._fallback ? "无法基于官网信息生成文案模板" : "请确保品牌官网可正常访问后重新扫描"}
            </p>
          </div>
          {/* Still show Doctor CTA */}
          <div className="mt-4">
            <button
              onClick={onViewDoctor}
              className="w-full py-3 text-xs font-semibold tracking-wide transition-all duration-300 rounded-lg"
              style={{
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.22)",
                color: "#7DD3FC",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(59,130,246,0.20)";
                e.currentTarget.style.borderColor = "rgba(59,130,246,0.38)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(59,130,246,0.12)";
                e.currentTarget.style.borderColor = "rgba(59,130,246,0.22)";
              }}
            >
              查看完整处方 →
            </button>
          </div>
        </motion.div>
      );
    }

    const templateFields = [
      { key: "page_title", label: "Page Title" },
      { key: "meta_description", label: "Meta Description" },
      { key: "about_us_opening", label: "About Us 开篇" },
      { key: "social_bio", label: "社媒 Bio" },
    ].filter((f) => contentTemplates?.[f.key]);

    const keywordsEmphasize: string[] = contentTemplates?.keywords_to_emphasize || [];
    const keywordsAvoid: string[] = contentTemplates?.keywords_to_avoid || [];
    const keyAction = contentTemplates?.key_content_action || "";

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <p style={moduleTitleStyle}>内容改造指南</p>
        <div style={cardStyle} className="p-5">
          <div className="flex flex-col gap-3">
            {templateFields.map(({ key, label }) => {
              const text = contentTemplates[key];
              return (
                <div key={key} className="rounded-lg px-3 py-2.5" style={{ background: "rgba(255,255,255,0.015)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-mono tracking-wider" style={{ color: "rgba(255,255,255,0.18)" }}>
                      {label}
                    </p>
                    <button
                      onClick={() => copyToClipboard(text, label)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded transition-all duration-200"
                      style={{ color: "#7DD3FC", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.14)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.06)"; }}
                    >
                      复制
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>{text}</p>
                </div>
              );
            })}

            {/* Keywords */}
            {(keywordsEmphasize.length > 0 || keywordsAvoid.length > 0) && (
              <div className="rounded-lg px-3 py-2.5" style={{ background: "rgba(255,255,255,0.015)" }}>
                {keywordsEmphasize.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-mono mb-1.5" style={{ color: "rgba(34,197,94,0.5)" }}>强调关键词</p>
                    <div className="flex flex-wrap gap-1">
                      {keywordsEmphasize.map((kw: string, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 text-[10px] rounded" style={{ background: "rgba(34,197,94,0.06)", color: "#22C55E" }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {keywordsAvoid.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono mb-1.5" style={{ color: "rgba(239,68,68,0.5)" }}>避免关键词</p>
                    <div className="flex flex-wrap gap-1">
                      {keywordsAvoid.map((kw: string, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 text-[10px] rounded" style={{ background: "rgba(239,68,68,0.06)", color: "#EF4444" }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Key content action */}
            {keyAction && (
              <div className="rounded-lg px-3 py-2.5" style={{ background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.06)" }}>
                <p className="text-[10px] font-mono mb-1" style={{ color: "rgba(59,130,246,0.5)" }}>优先行动</p>
                <p className="text-xs leading-relaxed" style={{ color: "#7DD3FC" }}>{keyAction}</p>
              </div>
            )}
          </div>
        </div>

        {/* Doctor CTA */}
        <div className="mt-4">
          <button
            onClick={onViewDoctor}
            className="w-full py-3 text-xs font-semibold tracking-wide transition-all duration-300 rounded-lg"
            style={{
              background: "rgba(59,130,246,0.12)",
              border: "1px solid rgba(59,130,246,0.22)",
              color: "#7DD3FC",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(59,130,246,0.20)";
              e.currentTarget.style.borderColor = "rgba(59,130,246,0.38)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(59,130,246,0.12)";
              e.currentTarget.style.borderColor = "rgba(59,130,246,0.22)";
            }}
          >
            查看完整处方 →
          </button>
        </div>
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // Main
  // ═══════════════════════════════════════════════════════
  return (
    <div className="flex-1 flex min-h-0 overflow-hidden px-4">
      <div className="flex-1 flex flex-col overflow-y-auto py-4" style={{ scrollbarWidth: "none" }}>
        {/* Back link */}
        <button
          onClick={onBackToBriefing}
          className="text-[10px] font-mono tracking-[0.1em] uppercase mb-6 self-start transition-colors duration-200"
          style={{ color: "#4A4A60" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#7DD3FC"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#4A4A60"; }}
        >
          ← 返回诊断简报
        </button>

        {/* Modules */}
        <div className="flex flex-col gap-8" style={{ maxWidth: 780 }}>
          {renderM1()}
          {renderM2()}
          {renderM3()}
          {renderM4()}
          {renderM5()}
          {renderM6()}
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-xs font-mono"
          style={{ background: "#131318", border: "1px solid rgba(59,130,246,0.22)", color: "#7DD3FC" }}
        >
          {toast}
        </motion.div>
      )}
    </div>
  );
}
