"use client";

import { motion } from "framer-motion";

interface Props {
  diagnosis: any;
  threeLayerChain: any;
  competitorGap: any;
  alignmentScore: number;
  alignmentSummary: string;
  verdict: string;
  locked?: boolean;
  lockMessage?: string;
  lockPrice?: string;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: "严重", color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.15)" },
  warning: { label: "警告", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.15)" },
  healthy: { label: "健康", color: "#22C55E", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.15)" },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span
        className="block w-1 h-3 rounded-full shrink-0"
        style={{ background: "linear-gradient(180deg, #7DD3FC 0%, rgba(125,211,252,0.15) 100%)" }}
      />
      <span className="text-[10px] font-mono tracking-[0.15em] uppercase" style={{ color: "rgba(125,211,252,0.50)" }}>
        {children}
      </span>
    </div>
  );
}

export function ScanDiagnosisSummary({
  diagnosis,
  threeLayerChain,
  competitorGap,
  alignmentScore,
  alignmentSummary,
  verdict,
  locked,
  lockMessage,
  lockPrice,
}: Props) {
  const sev = diagnosis?.severity ? SEVERITY_CONFIG[diagnosis.severity] || SEVERITY_CONFIG.warning : null;
  const losingDims = competitorGap?.losing_dimensions || [];
  const rootCause = competitorGap?.root_cause || "";

  const content = (
    <div
      className="px-7 py-7 flex-shrink-0"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.008) 100%)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <SectionLabel>诊断摘要</SectionLabel>

      <div className="grid grid-cols-2 gap-5">
        {/* ── Left column ── */}
        <div className="space-y-4">
          {verdict && (
            <div
              className="p-4"
              style={{
                background: "linear-gradient(135deg, rgba(56,189,248,0.04) 0%, rgba(56,189,248,0.01) 100%)",
                borderLeft: "2px solid rgba(56,189,248,0.2)",
              }}
            >
              <p className="text-[10px] font-mono tracking-widest uppercase mb-1.5" style={{ color: "rgba(56,189,248,0.4)" }}>
                一句话诊断
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#C8C8D8" }}>{verdict}</p>
            </div>
          )}

          {diagnosis && (
            <div
              className="p-4"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                {sev && (
                  <span
                    className="text-[10px] px-2 py-0.5 font-medium tracking-wide"
                    style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.border}` }}
                  >
                    {sev.label}
                  </span>
                )}
                <span className="text-sm font-medium" style={{ color: "#EDEDF5" }}>{diagnosis.core_problem}</span>
              </div>
              {diagnosis.problem_detail && (
                <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>{diagnosis.problem_detail}</p>
              )}
            </div>
          )}

          {threeLayerChain && (
            <div
              className="p-4"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <p className="text-[10px] font-mono tracking-widest uppercase mb-3" style={{ color: "rgba(255,255,255,0.15)" }}>
                三层分析
              </p>
              <div className="space-y-3">
                {[
                  { level: "L1", text: threeLayerChain.observation },
                  { level: "L2", text: threeLayerChain.explanation },
                  { level: "L3", text: threeLayerChain.implication },
                ].map(({ level, text }, i) => (
                  <div key={level} className="flex gap-3 text-xs">
                    <span
                      className="font-mono shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px]"
                      style={{
                        color: "rgba(56,189,248,0.6)",
                        background: "rgba(56,189,248,0.06)",
                        border: "1px solid rgba(56,189,248,0.1)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="leading-relaxed" style={{ color: "#9A9AB0" }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {(losingDims.length > 0 || rootCause) && (
            <div
              className="p-4"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <p className="text-[10px] font-mono tracking-widest uppercase mb-3" style={{ color: "rgba(255,255,255,0.15)" }}>
                竞品差距
              </p>
              {losingDims.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {losingDims.map((d: any, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-[10px] tracking-wide"
                      style={{
                        background: "rgba(239,68,68,0.05)",
                        border: "1px solid rgba(239,68,68,0.10)",
                        color: "#D4A0A0",
                      }}
                    >
                      {d.dimension || d}
                    </span>
                  ))}
                </div>
              )}
              {rootCause && <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>{rootCause}</p>}
            </div>
          )}

          {alignmentScore > 0 && (
            <div
              className="p-4"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <p className="text-[10px] font-mono tracking-widest uppercase mb-3" style={{ color: "rgba(255,255,255,0.15)" }}>
                品牌自述 vs AI 认知
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <span
                  className="text-2xl font-light tracking-tight"
                  style={{
                    color: alignmentScore >= 70 ? "#22C55E" : alignmentScore >= 40 ? "#F59E0B" : "#EF4444",
                    fontFamily: "'JetBrains Mono', var(--font-mono), monospace",
                  }}
                >
                  {alignmentScore}
                </span>
                <span className="text-sm" style={{ color: "#5E5E78" }}>/100 对齐分</span>
              </div>
              {alignmentSummary && <p className="text-xs leading-relaxed" style={{ color: "#5E5E78" }}>{alignmentSummary}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!locked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
      className="relative overflow-hidden flex-shrink-0"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.008) 100%)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Blurred content */}
      <div className="select-none" style={{ filter: "blur(8px)", opacity: 0.22 }}>
        {content}
      </div>

      {/* Overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4"
        style={{
          background: "linear-gradient(180deg, rgba(8,8,13,0.3) 0%, rgba(8,8,13,0.78) 50%, rgba(8,8,13,0.3) 100%)",
        }}
      >
        <span className="text-2xl">🔒</span>
        <p className="text-sm font-medium" style={{ color: "#EDEDF5" }}>{lockMessage || "升级解锁完整诊断"}</p>
        <p className="text-xs text-center max-w-xs" style={{ color: "#5E5E78" }}>
          14条自研规则逐条诊断，定位根因，对比竞品差距
        </p>
        <motion.button
          className="px-5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-500"
          style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.22)", color: "#7DD3FC" }}
          whileHover={{
            background: "rgba(56,189,248,0.22)",
            borderColor: "rgba(56,189,248,0.40)",
            boxShadow: "0 0 24px rgba(56,189,248,0.08)",
          }}
          onClick={() => alert("付费功能开发中，敬请期待")}
        >
          {lockPrice || "¥368 完整体检两次"}
        </motion.button>
      </div>
    </motion.div>
  );
}
