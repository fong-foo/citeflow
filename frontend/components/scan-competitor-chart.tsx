"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

export interface ChartLine {
  label: string;
  color: string;
  dashed?: boolean;
  values: number[]; // 0-100
}

interface Props {
  xLabels: string[];
  lines: ChartLine[];
  locked?: boolean;
}

const CHART_H = 180;
const PAD_L = 38;
const PAD_R = 16;
const PAD_T = 12;
const PAD_B = 28;

const Y_TICKS = [0, 25, 50, 75, 100];

function svgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  const start = `M${points[0].x},${points[0].y}`;
  const rest = points.slice(1).map((p) => `L${p.x},${p.y}`).join(" ");
  return `${start} ${rest}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span
        className="block w-1 h-3 rounded-full shrink-0"
        style={{ background: "linear-gradient(180deg, #38BDF8 0%, rgba(56,189,248,0.15) 100%)" }}
      />
      <span className="text-[10px] font-mono tracking-[0.15em] uppercase" style={{ color: "rgba(56,189,248,0.50)" }}>
        {children}
      </span>
    </div>
  );
}

export function ScanCompetitorChart({ xLabels, lines, locked }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [svgWidth, setSvgWidth] = useState(600);

  const onResize = useCallback((node: HTMLDivElement | null) => {
    if (node) setSvgWidth(node.getBoundingClientRect().width);
  }, []);

  const plotW = svgWidth - PAD_L - PAD_R;
  const xStep = xLabels.length > 1 ? plotW / (xLabels.length - 1) : plotW / 2;

  function getX(i: number) { return PAD_L + i * xStep; }
  function getY(v: number) { return PAD_T + CHART_H * (1 - v / 100); }

  const chartSvg = (
    <svg width={svgWidth} height={PAD_T + CHART_H + PAD_B} className="block">
      {/* Grid lines */}
      {Y_TICKS.map((tick) => (
        <g key={`y-${tick}`}>
          <line
            x1={PAD_L} x2={svgWidth - PAD_R}
            y1={getY(tick)} y2={getY(tick)}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.5}
          />
          <text x={PAD_L - 6} y={getY(tick) + 4} textAnchor="end"
            className="font-mono text-[9px]" fill="rgba(255,255,255,0.12)">
            {tick}%
          </text>
        </g>
      ))}

      {/* X axis labels */}
      {xLabels.map((label, i) => (
        <text key={`x-${i}`} x={getX(i)} y={PAD_T + CHART_H + 18} textAnchor="middle"
          className="text-[9px]" fill="rgba(255,255,255,0.16)">
          {label}
        </text>
      ))}

      {/* Data lines */}
      {lines.map((line, li) => {
        const points = line.values.map((v, i) => ({ x: getX(i), y: getY(v) }));
        return (
          <g key={li}>
            <path
              d={svgPath(points)}
              fill="none"
              stroke={line.color}
              strokeWidth={line.dashed ? 1 : 1.8}
              strokeDasharray={line.dashed ? "4 4" : undefined}
              opacity={line.dashed ? 0.3 : 0.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x} cy={p.y} r={14}
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
                <circle
                  cx={p.x} cy={p.y} r={2.8}
                  fill={line.color}
                  opacity={hoverIdx === i ? 1 : line.dashed ? 0.25 : 0.85}
                  style={{ transition: "opacity 0.15s" }}
                />
                {hoverIdx === i && !line.dashed && (
                  <circle cx={p.x} cy={p.y} r={5.5} fill="none" stroke={line.color} strokeWidth={1.2} opacity={0.5} />
                )}
              </g>
            ))}
          </g>
        );
      })}

      {/* Hover tooltip line */}
      {hoverIdx !== null && (
        <line
          x1={getX(hoverIdx)} x2={getX(hoverIdx)}
          y1={PAD_T} y2={PAD_T + CHART_H}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}
    </svg>
  );

  const tooltipValues = hoverIdx !== null
    ? lines.map(l => ({ label: l.label, color: l.color, value: l.values[hoverIdx] })).filter(tv => tv.value !== undefined)
    : [];

  const content = (
    <div
      className="px-7 py-7 flex-shrink-0"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.008) 100%)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <SectionLabel>竞品对比</SectionLabel>

      <div ref={onResize} className="relative">
        {chartSvg}

        {hoverIdx !== null && tooltipValues.length > 0 && (
          <div
            className="absolute pointer-events-none px-3.5 py-2.5"
            style={{
              left: Math.min(getX(hoverIdx), svgWidth - 140),
              top: 0,
              background: "rgba(8,8,13,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              zIndex: 10,
            }}
          >
            <p className="text-[9px] font-mono tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.20)" }}>
              {xLabels[hoverIdx]}
            </p>
            {tooltipValues.map((tv, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs mb-1 last:mb-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tv.color }} />
                <span style={{ color: "#9A9AB0" }}>{tv.label}</span>
                <span
                  className="font-mono ml-auto pl-4"
                  style={{ color: "#EDEDF5", fontFamily: "'JetBrains Mono', var(--font-mono), monospace" }}
                >
                  {tv.value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 justify-center">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-3 h-px shrink-0"
              style={{
                background: line.color,
                opacity: line.dashed ? 0.35 : 0.9,
                borderTop: line.dashed ? "1px dashed" : undefined,
                borderColor: line.dashed ? line.color : undefined,
              }}
            />
            <span className="text-[10px]" style={{ color: line.dashed ? "rgba(255,255,255,0.12)" : "#9A9AB0" }}>
              {line.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (!locked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12, ease: [0.4, 0, 0.2, 1] }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12, ease: [0.4, 0, 0.2, 1] }}
      className="relative overflow-hidden flex-shrink-0"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.008) 100%)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="select-none" style={{ filter: "blur(6px)", opacity: 0.2 }}>
        {content}
      </div>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3"
        style={{
          background: "linear-gradient(180deg, rgba(8,8,13,0.3) 0%, rgba(8,8,13,0.78) 50%, rgba(8,8,13,0.3) 100%)",
        }}
      >
        <span className="text-xl">🔒</span>
        <p className="text-sm font-medium" style={{ color: "#EDEDF5" }}>升级解锁竞品对比</p>
        <p className="text-xs text-center max-w-xs" style={{ color: "#5E5E78" }}>
          查看您的品牌与 TOP3 竞品在各维度上的详细对比，精准定位差距
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
          ¥368 完整体检两次
        </motion.button>
      </div>
    </motion.div>
  );
}
