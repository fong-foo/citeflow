"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Props {
  elapsed: number;
  domain: string;
  brandName: string;
  mode?: "light" | "full";
  progressMsg?: string;
  onCancel?: () => void;
}

const PHASES = [
  { threshold: 12, label: "扫描品牌", text: "抓取官网结构化数据 · 提取品牌实体与属性" },
  { threshold: 30, label: "引用分析", text: "多查询并发扫描 · 计算AI引擎引用率与推荐率" },
  { threshold: Infinity, label: "竞品分析与评分", text: "综合评分建模 · 提取竞品提及频次与排名" },
];

const FULL_PHASES = [
  { threshold: 20, label: "品牌深度扫描", text: "官网全量抓取 · 品牌画像10维度提取 · 行业定位分析" },
  { threshold: 50, label: "3引擎并发侦察", text: "30条查询词 × 3大AI引擎 · 三分类引用率计算 · 推荐率统计" },
  { threshold: 100, label: "竞品9场景对比", text: "维度级竞品分析 · 引用源权威评估 · AI认知画像生成" },
  { threshold: 180, label: "Gap分析", text: "品牌自述 vs AI认知差距 · 目标定位偏差检测 · 盲点发现" },
  { threshold: Infinity, label: "报告汇总", text: "综合评分建模 · 竞争力排名 · 完整侦察报告生成中" },
];

function domainFontSize(d: string): string {
  if (d.length <= 15) return "15px";
  if (d.length <= 22) return "13px";
  if (d.length <= 30) return "11px";
  return "10px";
}

export function ScanLoading({ elapsed, domain, brandName, mode = "light", progressMsg, onCancel }: Props) {
  const seconds = elapsed;
  const phases = mode === "full" ? FULL_PHASES : PHASES;
  let phaseIdx = phases.findIndex((p) => seconds < p.threshold);
  if (phaseIdx === -1) phaseIdx = phases.length - 1;
  const hasRealProgress = !!progressMsg;

  // Phase flash effect
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 2000);
    return () => clearTimeout(t);
  }, [phaseIdx]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center justify-center pt-16 pb-8"
    >
      {/* ═══════ Scan Chamber ═══════ */}
      <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>
        {/* ── Ambient outer glow ── */}
        <div
          className="absolute rounded-full"
          style={{
            width: 320,
            height: 320,
            background: "radial-gradient(circle, rgba(56,189,248,0.03) 0%, transparent 70%)",
            animation: flash
              ? "scanFlash 2s ease-in-out, scanRingBreath 3s ease-in-out infinite"
              : "scanRingBreath 3s ease-in-out infinite",
          }}
        />

        {/* ── Outer ring ── */}
        <div
          className="absolute rounded-full"
          style={{
            width: 280,
            height: 280,
            border: "1px solid rgba(56,189,248,0.10)",
            animation: "scanRingCW 30s linear infinite",
          }}
        >
          {/* Cardinal crosshair marks */}
          <TickMarks />
        </div>

        {/* ── Middle ring ── */}
        <div
          className="absolute rounded-full"
          style={{
            width: 220,
            height: 220,
            border: "1px solid rgba(56,189,248,0.07)",
            animation: "scanRingCCW 22s linear infinite",
          }}
        />

        {/* ── Inner ring ── */}
        <div
          className="absolute rounded-full"
          style={{
            width: 164,
            height: 164,
            border: "1px solid rgba(56,189,248,0.05)",
          }}
        />

        {/* ── Scan sweep arm ── */}
        <div
          className="absolute rounded-full overflow-hidden"
          style={{ width: 280, height: 280 }}
        >
          <div
            className="absolute"
            style={{
              top: "50%",
              left: "50%",
              width: "50%",
              height: "1px",
              background: "linear-gradient(90deg, rgba(56,189,248,0.5), transparent)",
              transformOrigin: "left center",
              animation: "scanSweep 4s linear infinite",
            }}
          />
          {/* Secondary faint sweep, offset */}
          <div
            className="absolute"
            style={{
              top: "50%",
              left: "50%",
              width: "50%",
              height: "1px",
              background: "linear-gradient(90deg, rgba(56,189,248,0.12), transparent)",
              transformOrigin: "left center",
              animation: "scanSweep 4s linear infinite",
              animationDelay: "-2s",
            }}
          />
        </div>

        {/* ── Center content ── */}
        <div className="absolute flex flex-col items-center justify-center text-center px-4" style={{ width: 160, height: 160 }}>
          {/* Subtle crosshair behind text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
            <div className="absolute w-px h-full" style={{ background: "#38BDF8" }} />
            <div className="absolute h-px w-full" style={{ background: "#38BDF8" }} />
          </div>

          <motion.span
            key={domain}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="font-mono font-semibold tracking-tight truncate w-full"
            style={{ color: "#D4D4E0", fontSize: domainFontSize(domain) }}
          >
            {domain || "—"}
          </motion.span>

          {brandName && (
            <motion.span
              key={brandName}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-[11px] tracking-[0.06em] mt-1 truncate w-full"
              style={{ color: "rgba(56,189,248,0.7)" }}
            >
              {brandName}
            </motion.span>
          )}
        </div>
      </div>

      {/* ═══════ Phase indicator LEDs ═══════ */}
      <div className="flex items-center gap-2 mt-10 mb-6" style={{ height: 24 }}>
        {phases.map((p, i) => {
          const isDone = i < phaseIdx;
          const isActive = i === phaseIdx;

          return (
            <div key={i} className="flex items-center gap-1.5">
              {/* Dot */}
              <span
                className="inline-block rounded-full shrink-0"
                style={{
                  width: 5,
                  height: 5,
                  background: isDone ? "#22C55E" : isActive ? "#38BDF8" : "#1E1E2A",
                  boxShadow: isDone
                    ? "0 0 3px rgba(34,197,94,0.4)"
                    : isActive
                      ? "0 0 6px rgba(56,189,248,0.5)"
                      : "none",
                  animation: isActive ? "phaseDotActive 1.8s ease-in-out infinite" : "none",
                }}
              />
              <span
                className="text-[10px] tracking-[0.05em] font-medium"
                style={{
                  color: isDone ? "#4A7A5A" : isActive ? "#7DD3FC" : "#1A1A28",
                }}
              >
                {p.label}
              </span>
              {/* Separator dot between items */}
              {i < PHASES.length - 1 && (
                <span className="inline-block w-0.5 h-0.5 rounded-full mx-1" style={{ background: "rgba(255,255,255,0.06)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ═══════ Phase message ═══════ */}
      <motion.p
        key={hasRealProgress ? progressMsg : phaseIdx}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-[13px] tracking-[0.03em] mb-6 text-center max-w-sm leading-relaxed"
        style={{ color: "#7E7E9A" }}
      >
        {hasRealProgress ? progressMsg : phases[phaseIdx].text}
      </motion.p>

      {/* ═══════ Timer ═══════ */}
      <div
        className="font-mono text-5xl font-semibold tracking-tight mb-3"
        style={{
          color: "#7DD3FC",
          textShadow: "0 0 20px rgba(56,189,248,0.15)",
        }}
      >
        {elapsed.toFixed(1)}
        <span className="text-sm text-cf-muted ml-1.5 font-sans font-normal">秒</span>
      </div>

      {/* ═══════ Brand status line ═══════ */}
      <p className="text-[13px] tracking-[0.03em] text-center mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>
        您的品牌{" "}
        <span className="brand-scan-shimmer" style={{ fontWeight: 600 }}>{brandName || domain}</span>
        {" "}正在被精密仪器检查中
        <span className="inline-flex ml-0.5">
          <span className="inline-block rounded-full" style={{ width: 3, height: 3, background: "#7DD3FC", boxShadow: "0 0 4px rgba(125,211,252,0.5)", animation: "dotsPulse 1.5s ease-in-out infinite" }} />
          <span className="inline-block rounded-full ml-0.5" style={{ width: 3, height: 3, background: "#7DD3FC", boxShadow: "0 0 4px rgba(125,211,252,0.5)", animation: "dotsPulse 1.5s ease-in-out 0.3s infinite" }} />
          <span className="inline-block rounded-full ml-0.5" style={{ width: 3, height: 3, background: "#7DD3FC", boxShadow: "0 0 4px rgba(125,211,252,0.5)", animation: "dotsPulse 1.5s ease-in-out 0.6s infinite" }} />
        </span>
      </p>

      {/* ═══════ Engine tag ═══════ */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-sm"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{
            background: "#22C55E",
            boxShadow: "0 0 3px rgba(34,197,94,0.4)",
          }}
        />
        <span className="text-[10px] tracking-[0.05em] text-[#4A4A60] font-medium">
          {mode === "full" ? "4引擎并发扫描" : "AI 联网搜索"}
        </span>
      </div>

      {/* ═══════ Cancel button ═══════ */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-1.5 text-xs rounded-lg transition-all hover:brightness-110"
          style={{ color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          取消扫描
        </button>
      )}
    </motion.div>
  );
}

/* ─── Cardinal tick marks on the outer ring ─── */

function TickMarks() {
  const positions = [
    { top: -2, left: "50%", width: 1, height: 6 },      // N
    { bottom: -2, left: "50%", width: 1, height: 6 },    // S
    { left: -2, top: "50%", width: 6, height: 1 },       // W
    { right: -2, top: "50%", width: 6, height: 1 },      // E
    // diagonals (shorter)
    { top: 16, left: -1, width: 4, height: 1, transform: "rotate(45deg)", transformOrigin: "center" } as any,
    { top: 16, right: -1, width: 4, height: 1, transform: "rotate(-45deg)", transformOrigin: "center" } as any,
    { bottom: 16, left: -1, width: 4, height: 1, transform: "rotate(-45deg)", transformOrigin: "center" } as any,
    { bottom: 16, right: -1, width: 4, height: 1, transform: "rotate(45deg)", transformOrigin: "center" } as any,
  ];

  return (
    <>
      {positions.map((style, i) => (
        <span
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            ...style,
            background: "rgba(56,189,248,0.2)",
          }}
        />
      ))}
    </>
  );
}
