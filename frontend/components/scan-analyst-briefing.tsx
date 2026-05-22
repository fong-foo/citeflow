"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ScanAnalystBriefingProps {
  probeOutput: any;
  onComplete: (analystOutput: any) => void;
  onScanningChange: (isScanning: boolean) => void;
}

interface Rule {
  id: number;
  name: string;
  severity: "critical" | "warning" | "info";
  evidence: string;
}

interface LogLine {
  type: "header" | "success" | "warning" | "critical" | "thinking";
  text: string;
}

function detectRules(probeOutput: any, _highAuthRatio?: number): Rule[] {
  const cm = probeOutput?.citation_metrics || {};
  const sa = probeOutput?.source_authority || {};
  const er = probeOutput?.engine_results || {};
  const gr = probeOutput?.gap_report || {};
  const comp = probeOutput?.competitor_analysis || [];

  const rules: Rule[] = [];

  // 规则1：定位偏差（对齐度<60 且 行业引用率>80%）
  const alignmentScore = gr.alignment_score || 0;
  const industryRate = cm.industry_rate || 0;
  if (alignmentScore < 60 && industryRate > 80) {
    rules.push({
      id: 1, name: "定位偏差", severity: "critical",
      evidence: `对齐度${alignmentScore} < 60 且行业引用率${industryRate}% > 80%`,
    });
  }

  // 规则2：品牌隐形（引用率<30%）
  if ((cm.rate || 0) < 30) {
    rules.push({
      id: 2, name: "品牌隐形", severity: "critical",
      evidence: `引用率${cm.rate}% < 30%`,
    });
  }

  // 规则3：引用源质量差（引用率>60%但高权威源<30%，加权计算）
  const highAuthRatio = _highAuthRatio ?? 0;
  if ((cm.rate || 0) > 60 && highAuthRatio < 0.3) {
    rules.push({
      id: 3, name: "引用源质量差", severity: "warning",
      evidence: `引用率${cm.rate}%但高权威源占比${Math.round(highAuthRatio * 100)}%`,
    });
  }

  // 规则4：引用源单一（来源多样性<0.5）
  if ((sa.source_diversity ?? 1) < 0.5) {
    rules.push({
      id: 4, name: "引用源单一", severity: "warning",
      evidence: `来源多样性${sa.source_diversity}`,
    });
  }

  // 规则6：竞品维度劣势（存在gap<-20的维度，近似计算）
  const dimensionMap: Record<string, { brand: number[]; comp: number[] }> = {};
  for (const c of comp) {
    for (const ds of (c.dimension_scores || [])) {
      const dim = ds.dimension;
      if (!dimensionMap[dim]) dimensionMap[dim] = { brand: [], comp: [] };
      for (const r of (ds.rankings || [])) {
        if (r.score === null || r.score === undefined) continue;
        if (dimensionMap[dim].brand.length === 0) {
          dimensionMap[dim].brand.push(r.score);
        } else {
          dimensionMap[dim].comp.push(r.score);
        }
      }
    }
  }
  const losingDims = Object.entries(dimensionMap)
    .filter(([, v]) => v.brand.length > 0 && v.comp.length > 0)
    .map(([name, v]) => {
      const brandAvg = v.brand.reduce((a, b) => a + b, 0) / v.brand.length;
      const compAvg = v.comp.reduce((a, b) => a + b, 0) / v.comp.length;
      return { name, gap: brandAvg - compAvg };
    })
    .filter(d => d.gap < -20);

  if (losingDims.length > 0) {
    rules.push({
      id: 6, name: "竞品维度劣势", severity: "warning",
      evidence: `${losingDims.length}个维度存在重大劣势`,
    });
  }

  // 规则10：行业影响力弱（B类>50%但A类<20%）
  if ((cm.brand_rate || 0) > 50 && (cm.industry_rate || 0) < 20) {
    rules.push({
      id: 10, name: "行业影响力弱", severity: "warning",
      evidence: `B类${cm.brand_rate}%但A类${cm.industry_rate}%`,
    });
  }

  // 规则12：引擎差异异常（≥2个引擎有数据且差异>20%）
  const rates = [er.gpt?.citation_rate || 0, er.gemini?.citation_rate || 0, er.haiku?.citation_rate || 0];
  const diff = Math.max(...rates) - Math.min(...rates);
  if (rates.filter(r => r > 0).length >= 2 && diff > 20) {
    rules.push({
      id: 12, name: "引擎差异异常", severity: "warning",
      evidence: `引用率差异${diff}个百分点`,
    });
  }

  // 规则13：AI认知偏差（B类查询≥3条）
  if ((cm.brand_count || 0) >= 3) {
    rules.push({
      id: 13, name: "AI认知偏差", severity: "info",
      evidence: `${cm.brand_count}条B类查询数据`,
    });
  }

  // 规则14：竞品胜负矩阵（C类查询≥3条）
  if ((cm.competitor_count || 0) >= 3) {
    rules.push({
      id: 14, name: "竞品胜负矩阵", severity: "info",
      evidence: `${cm.competitor_count}条C类查询数据`,
    });
  }

  const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  rules.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  return rules;
}

export function ScanAnalystBriefing({
  probeOutput,
  onComplete,
  onScanningChange,
}: ScanAnalystBriefingProps) {
  // ── Data extraction ──
  const bp = probeOutput?.brand_profile || {};
  const cm = probeOutput?.citation_metrics || {};
  const sa = probeOutput?.source_authority || {};
  const er = probeOutput?.engine_results || {};
  const gr = probeOutput?.gap_report || {};
  const competitors = probeOutput?.competitor_mentions || [];
  const competitorAnalysis = probeOutput?.competitor_analysis || [];

  const brandName = bp.brand_name || "未知品牌";
  const industry = bp.inferred_industry || "未指定行业";
  const industryRateVal = cm.industry_rate || 0;
  const brandRate = cm.brand_rate || 0;
  const recommendationRate = cm.recommendation_rate || 0;
  const gptRate = er.gpt?.citation_rate || 0;
  const geminiRate = er.gemini?.citation_rate || 0;
  const haikuRate = er.haiku?.citation_rate || 0;
  const sourceCount = sa.total_sources || 0;

  // highAuthPct (加权计算，与后端一致)
  const topSources = sa.top_sources || [];
  const totalMentions = topSources.reduce((sum: number, s: any) => sum + (s.mention_count || 0), 0);
  const highAuthMentions = topSources
    .filter((s: any) => (s.authority_score || 0) >= 70)
    .reduce((sum: number, s: any) => sum + (s.mention_count || 0), 0);
  const highAuthRatio = totalMentions > 0 ? highAuthMentions / totalMentions : 0;
  const highAuthPct = totalMentions > 0 ? Math.round(highAuthRatio * 100) : 0;

  const competitorCount = competitors.length;
  const compCount = competitorAnalysis.length;

  // ── Rules ──
  const rules = detectRules(probeOutput, highAuthRatio);

  // ── Log lines ──
  const logLines: LogLine[] = [
    { type: "header", text: "> 读取品牌数据..." },
    { type: "success", text: `✓ 品牌：${brandName} | 行业：${industry}` },

    { type: "header", text: "> 读取引用率数据..." },
    { type: "success", text: `✓ A类：${industryRateVal}% | B类：${brandRate}% | 推荐率：${recommendationRate}%` },

    { type: "header", text: "> 读取竞品数据..." },
    { type: "success", text: `✓ ${competitorCount}家竞品 | ${compCount}条对比` },

    { type: "header", text: "> 读取引擎数据..." },
    { type: "success", text: `✓ GPT: ${gptRate}% | Gemini: ${geminiRate}% | Haiku: ${haikuRate}%` },

    { type: "header", text: "> 读取来源数据..." },
    { type: "success", text: `✓ ${sourceCount}个引用源 | 高权威占比：${highAuthPct}%` },

    { type: "header", text: "> 规则检测中..." },
    { type: "warning", text: `⚡ 触发${rules.length}条规则：` },
    ...rules.map(r => ({
      type: r.severity === "critical" ? "critical" as const : "warning" as const,
      text: `  · ${r.name}（${r.severity}）— ${r.evidence}`,
    })),

    { type: "header", text: "> 开始深度诊断..." },
    { type: "thinking", text: "🧠 Analyst 正在推理..." },
  ];

  // ── Log playback ──
  const ESTIMATED_API_TIME = 60;
  const LOG_PLAYBACK_TIME = Math.max(15, Math.min(25, ESTIMATED_API_TIME * 0.3));
  const LINE_INTERVAL = (LOG_PLAYBACK_TIME * 1000) / logLines.length;

  // ── Phases ──
  const [phase, setPhase] = useState<"idle" | "log" | "api" | "done">("idle");
  const [apiStatus, setApiStatus] = useState<"idle" | "calling" | "done" | "error">("idle");
  const [apiElapsed, setApiElapsed] = useState(0);
  const [analystResult, setAnalystResult] = useState<any>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const [visibleLines, setVisibleLines] = useState(0);
  useEffect(() => {
    if (phase !== "log") return;
    if (visibleLines >= logLines.length) return;
    const timer = setTimeout(() => setVisibleLines(v => v + 1), LINE_INTERVAL);
    return () => clearTimeout(timer);
  }, [phase, visibleLines, LINE_INTERVAL, logLines.length]);

  // Log progress
  const logProgress = phase === "log" ? Math.round((visibleLines / logLines.length) * 100) : 0;

  // Transition log → api
  useEffect(() => {
    if (visibleLines >= logLines.length && phase === "log") {
      setPhase("api");
    }
  }, [visibleLines, phase, logLines.length]);

  // API timer
  useEffect(() => {
    if (phase !== "api") return;
    const timer = setInterval(() => {
      setApiElapsed(e => e + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // API progress (capped at 95%)
  const apiProgress = phase === "api" ? Math.min(95, Math.round((apiElapsed / ESTIMATED_API_TIME) * 100)) : 0;

  // Total progress
  const totalProgress = phase === "idle" ? 0
    : phase === "log" ? logProgress * 0.3
    : phase === "api" ? 30 + apiProgress * 0.7
    : 100;

  const remaining = phase === "api" ? Math.max(0, ESTIMATED_API_TIME - apiElapsed) : 0;

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleLines]);

  // ── API call ──
  useEffect(() => {
    if (phase !== "api") return;
    if (apiStatus !== "idle") return;

    const callAnalyst = async () => {
      setApiStatus("calling");
      onScanningChange(true);
      try {
        const res = await fetch(`${API_BASE}/api/analyst`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ probe_output: probeOutput }),
        });
        const result = await res.json();
        if (result.status === "error") {
          setApiStatus("error");
          onScanningChange(false);
          return;
        }
        setApiStatus("done");
        setPhase("done");
        setAnalystResult(result);
        onScanningChange(false);
      } catch {
        setApiStatus("error");
        onScanningChange(false);
      }
    };

    callAnalyst();
  }, [phase, apiStatus]);

  // ── Button handler ──
  function handleButtonClick() {
    if (phase === "idle") {
      setPhase("log");
    } else if (phase === "done") {
      onComplete(analystResult);
    } else if (apiStatus === "error") {
      setVisibleLines(0);
      setApiElapsed(0);
      setApiStatus("idle");
      setPhase("log");
    }
  }

  // ── Metric color thresholds ──
  function metricColor(value: number, metric: "industry" | "brand" | "recommendation"): { text: string; bg: string; border: string; glow: string } {
    const thresholds: Record<string, [number, number]> = {
      industry: [40, 20],
      brand: [60, 30],
      recommendation: [30, 10],
    };
    const [high, low] = thresholds[metric];
    if (value >= high) return { text: "#22C55E", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.15)", glow: "0 0 12px rgba(34,197,94,0.15)" };
    if (value >= low) return { text: "#F59E0B", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)", glow: "0 0 12px rgba(245,158,11,0.15)" };
    return { text: "#EF4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.15)", glow: "0 0 12px rgba(239,68,68,0.15)" };
  }

  const industryMetric = metricColor(industryRateVal, "industry");
  const brandMetric = metricColor(brandRate, "brand");
  const recMetric = metricColor(recommendationRate, "recommendation");

  // ── Shared: Probe summary + button ──
  const isRunning = phase === "log" || phase === "api";
  const isDisabled = isRunning && apiStatus !== "error";

  const btnBase = "w-full py-3 text-sm font-semibold tracking-wide transition-all duration-300 rounded-lg";
  const btnIdle = "bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.22)] text-[#7DD3FC]";
  const btnDisabled = "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[#4A4A60] cursor-not-allowed";
  const btnHover = "hover:bg-[rgba(59,130,246,0.20)] hover:border-[rgba(59,130,246,0.38)] hover:shadow-[0_0_28px_rgba(59,130,246,0.10)]";

  function renderProbePanel() {
    return (
      <>
        {/* Probe 数据摘要 */}
        <div className="rounded-xl p-6 mb-5" style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.008) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(59,130,246,0.5)" }}>
            PROBE 数据摘要
          </p>

          <div className="mb-4">
            <p className="text-base font-semibold mb-0.5" style={{ color: "#EDEDEF" }}>{brandName}</p>
            <p className="text-xs" style={{ color: "#8B8B90" }}>{industry}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "A类引用率", value: industryRateVal, m: industryMetric },
              { label: "B类引用率", value: brandRate, m: brandMetric },
              { label: "推荐率", value: recommendationRate, m: recMetric },
            ].map(({ label, value, m }) => (
              <div key={label} className="text-center py-3 px-2 rounded-lg" style={{ background: m.bg, border: `1px solid ${m.border}` }}>
                <p className="text-xl font-mono font-bold" style={{ color: m.text, textShadow: m.glow }}>
                  {value}%
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "#6A6A82" }}>{label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-5 text-xs" style={{ color: "#6A6A82" }}>
            <span>竞品：{competitorCount}家</span>
            <span>引擎：3个</span>
            <span>来源：{sourceCount}个</span>
          </div>
        </div>

        {/* 即将诊断 */}
        <div className="rounded-xl p-6 mb-5" style={{
          background: "rgba(255,255,255,0.012)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-3" style={{ color: "rgba(59,130,246,0.35)" }}>
            即将诊断
          </p>
          <ul className="space-y-2.5 text-xs" style={{ color: "#9A9AB0" }}>
            {[
              "检测 9 条规则（品牌隐形、引用源质量、竞品劣势...）",
              "分析竞品差距（维度级对比）",
              "对比三大引擎（ChatGPT / Gemini / Claude）",
              "生成三层诊断链（现象→原因→影响）",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 w-1 h-1 rounded-full shrink-0" style={{ background: "rgba(59,130,246,0.35)" }} />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-4 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <p className="text-[10px]" style={{ color: "#5E5E78" }}>预计耗时：约 1 分钟</p>
          </div>
        </div>

        {/* 按钮 */}
        {phase === "idle" ? (
          <button onClick={handleButtonClick} className={`${btnBase} ${btnIdle} ${btnHover} animate-pulse`}>
            开始诊断 →
          </button>
        ) : (
          <button
            onClick={handleButtonClick}
            disabled={isDisabled}
            className={`${btnBase} ${isDisabled ? btnDisabled : `${btnIdle} ${btnHover}`}`}
          >
            {phase === "done" ? "查看诊断报告 →"
              : isRunning ? "诊断进行中..."
              : "重试"}
          </button>
        )}
      </>
    );
  }

  function renderRiskPanel() {
    if (rules.length === 0) {
      return (
        <div className="rounded-xl p-6" style={{
          background: "rgba(255,255,255,0.012)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <p className="text-xs text-center" style={{ color: "#6A6A82" }}>
            未发现异常，点击"开始诊断"进行深度分析
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-xl p-5" style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.008) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}>
        <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(239,68,68,0.5)" }}>
          风险预警 ({rules.length})
        </p>

        <div className="flex flex-col gap-2.5">
          {rules.map((rule, i) => {
            const sev = rule.severity;
            const sevColor = sev === "critical" ? "#EF4444" : sev === "warning" ? "#F59E0B" : "#38BDF8";
            const sevBg = sev === "critical" ? "rgba(239,68,68,0.06)" : sev === "warning" ? "rgba(245,158,11,0.06)" : "rgba(56,189,248,0.06)";
            const sevBorder = sev === "critical" ? "rgba(239,68,68,0.15)" : sev === "warning" ? "rgba(245,158,11,0.15)" : "rgba(56,189,248,0.15)";
            const sevLabel = sev === "critical" ? "严重" : sev === "warning" ? "警告" : "提示";

            return (
              <div
                key={i}
                className="rounded-lg overflow-hidden"
                style={{ background: sevBg, border: `1px solid ${sevBorder}` }}
              >
                <div className="flex">
                  <div className="w-0.5 shrink-0" style={{ background: sevColor }} />
                  <div className="flex-1 px-3 py-2.5 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-mono px-1.5 py-px rounded-full" style={{ background: `${sevColor}20`, color: sevColor }}>
                        {sevLabel}
                      </span>
                      <p className="text-xs font-medium truncate" style={{ color: "#EDEDEF" }}>{rule.name}</p>
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: "#6A6A82" }}>{rule.evidence}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] mt-4 text-center" style={{ color: "#4A4A60" }}>
          Analyst 将深入分析以上风险，生成诊断链
        </p>
      </div>
    );
  }

  // ── Main layout ──
  return (
    <div className="flex-1 flex min-h-0 overflow-hidden p-4">
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左栏：Probe 摘要 + 按钮 */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="max-w-md w-full mx-auto py-4">
            {renderProbePanel()}
          </div>
        </div>

        {/* 右栏：idle→风险预警 / running→终端日志+进度+规则 */}
        <div className="w-80 shrink-0 overflow-y-auto flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
          {phase === "idle" ? (
            renderRiskPanel()
          ) : (
            <>
              {/* 日志区 */}
            <div className="rounded-xl overflow-hidden shrink-0" style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              {/* 终端标题栏 */}
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "#22C55E", boxShadow: "0 0 4px rgba(34,197,94,0.4)" }} />
                <span className="text-[10px] font-mono tracking-[0.1em] uppercase" style={{ color: "#5E5E78" }}>Analyst Terminal</span>
                <span className="ml-auto text-[10px] font-mono" style={{ color: "#3A3A48" }}>
                  {phase === "log" ? "LOG" : phase === "api" ? "API" : phase === "done" ? "DONE" : ""}
                </span>
              </div>
              {/* 日志内容 */}
              <div
                ref={logRef}
                className="overflow-y-auto p-4 font-mono text-xs max-h-[320px]"
                style={{ scrollbarWidth: "none" }}
              >
                {logLines.slice(0, visibleLines).map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className="leading-relaxed"
                    style={{
                      color: line.type === "success" ? "#4ADE80"
                        : line.type === "critical" ? "#EF4444"
                        : line.type === "warning" ? "#FBBF24"
                        : line.type === "thinking" ? "#60A5FA"
                        : "#6A6A82",
                      marginBottom: line.type === "header" ? 8 : 2,
                    }}
                  >
                    {line.text}
                  </motion.div>
                ))}
                {/* 光标 */}
                {phase === "api" && apiStatus === "calling" && (
                  <span className="inline-block w-1.5 h-3.5 bg-[#60A5FA] animate-pulse align-middle" style={{ boxShadow: "0 0 6px rgba(96,165,250,0.5)" }} />
                )}
                {/* 完成提示 */}
                {phase === "done" && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs mt-3 font-mono" style={{ color: "#22C55E" }}>
                    ✓ 诊断完成
                  </motion.p>
                )}
              </div>
            </div>

            {/* 进度条 */}
            <div className="rounded-xl p-4" style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-mono tracking-[0.1em] uppercase" style={{ color: "#6A6A82" }}>诊断进度</p>
                <p className="text-[10px] font-mono font-semibold" style={{ color: "#60A5FA" }}>{totalProgress}%</p>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #3B82F6, #60A5FA)",
                    boxShadow: totalProgress > 0 ? "0 0 10px rgba(59,130,246,0.3)" : "none",
                  }}
                  animate={{ width: `${totalProgress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: "#4A4A60" }}>
                {phase === "done" ? "诊断完成"
                  : phase === "api" ? `预计剩余：${remaining}秒`
                  : phase === "log" ? "读取数据中..."
                  : ""}
              </p>
            </div>

            {/* 触发规则 */}
            {rules.length > 0 && (
              <div className="rounded-xl p-4 flex-1 overflow-y-auto" style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                scrollbarWidth: "none",
              }}>
                <p className="text-[10px] font-mono tracking-[0.1em] uppercase mb-3" style={{ color: "#6A6A82" }}>
                  已触发规则 ({rules.length})
                </p>
                <div className="flex flex-col gap-2">
                  {rules.map((rule, i) => {
                    const sev = rule.severity;
                    const sevColor = sev === "critical" ? "#EF4444" : sev === "warning" ? "#F59E0B" : "#38BDF8";
                    const sevBg = sev === "critical" ? "rgba(239,68,68,0.06)" : sev === "warning" ? "rgba(245,158,11,0.06)" : "rgba(56,189,248,0.06)";
                    const sevBorder = sev === "critical" ? "rgba(239,68,68,0.15)" : sev === "warning" ? "rgba(245,158,11,0.15)" : "rgba(56,189,248,0.15)";
                    const sevLabel = sev === "critical" ? "严重" : sev === "warning" ? "警告" : "提示";
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: (logLines.length - rules.length + i) * LINE_INTERVAL / 1000 }}
                        className="rounded-lg overflow-hidden"
                        style={{ background: sevBg, border: `1px solid ${sevBorder}` }}
                      >
                        {/* 左侧色条 + 内容 */}
                        <div className="flex">
                          <div className="w-0.5 shrink-0" style={{ background: sevColor }} />
                          <div className="flex-1 px-3 py-2.5 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[9px] font-mono px-1.5 py-px rounded-full" style={{ background: `${sevColor}20`, color: sevColor }}>
                                {sevLabel}
                              </span>
                              <p className="text-xs font-medium truncate" style={{ color: "#EDEDEF" }}>{rule.name}</p>
                            </div>
                            <p className="text-[10px] leading-relaxed" style={{ color: "#6A6A82" }}>{rule.evidence}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 错误状态 */}
            {apiStatus === "error" && (
              <div className="rounded-xl p-4 flex items-start gap-3" style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
              }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-px" style={{ background: "rgba(239,68,68,0.15)" }}>
                  <span className="text-[10px]" style={{ color: "#EF4444" }}>!</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#FCA5A5" }}>诊断失败，请点击左侧「重试」按钮重新开始</p>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
