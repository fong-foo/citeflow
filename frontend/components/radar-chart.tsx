"use client";

import { motion } from "framer-motion";

interface RadarChartProps {
  dimensions: { name: string; score: number; maxScore?: number }[];
  size?: number;
  onDimensionClick?: (index: number) => void;
}

export function RadarChart({ dimensions, size = 280, onDimensionClick }: RadarChartProps) {
  const validDimensions = dimensions.filter(
    (d) => d.name && typeof d.score === "number"
  );

  if (validDimensions.length < 3) {
    return (
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          width: size,
          height: size,
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <p className="text-xs" style={{ color: "#5E5E78" }}>
          升级解锁完整诊断
        </p>
      </div>
    );
  }

  const N = validDimensions.length;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.36;
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const angleForIndex = (i: number): number =>
    -Math.PI / 2 + (i * 2 * Math.PI) / N;

  const vertex = (i: number, r: number) => ({
    x: cx + r * Math.cos(angleForIndex(i)),
    y: cy + r * Math.sin(angleForIndex(i)),
  });

  const polygonPoints = (r: number): string =>
    Array.from({ length: N }, (_, i) => {
      const v = vertex(i, r);
      return `${v.x},${v.y}`;
    }).join(" ");

  const dataPoints = validDimensions.map((d, i) => {
    const ratio = Math.min(Math.max(d.score / (d.maxScore || 100), 0), 1);
    return vertex(i, outerR * ratio);
  });

  const dataPolygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Font size adapts to number of dimensions
  const labelSize = N > 6 ? 8 : N > 5 ? 9 : 10;
  const scoreSize = N > 6 ? 9 : N > 5 ? 10 : 11;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Reference polygons */}
      {levels.map((level) => (
        <polygon
          key={level}
          points={polygonPoints(outerR * level)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={level === 1 ? 1 : 0.5}
        />
      ))}

      {/* Reference level labels (on the first axis) */}
      {levels.slice(0, -1).map((level) => {
        const v = vertex(0, outerR * level);
        return (
          <text
            key={`label-${level}`}
            x={v.x + 4}
            y={v.y - 2}
            fill="#5E5E78"
            fontSize={9}
            fontFamily="JetBrains Mono, monospace"
            textAnchor="start"
          >
            {Math.round(level * 100)}
          </text>
        );
      })}

      {/* Axis lines from center to each vertex */}
      {Array.from({ length: N }, (_, i) => {
        const v = vertex(i, outerR);
        return (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={v.x}
            y2={v.y}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Data polygon fill */}
      <motion.polygon
        points={dataPolygonPoints}
        fill="rgba(59,130,246,0.12)"
        stroke="#3B82F6"
        strokeWidth={1.5}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Data vertex dots (clickable) */}
      {dataPoints.map((p, i) => (
        <g key={`dot-${i}`} style={{ cursor: onDimensionClick ? "pointer" : "default" }}>
          {/* Invisible larger hit area */}
          <circle
            cx={p.x}
            cy={p.y}
            r={14}
            fill="transparent"
            onClick={() => onDimensionClick?.(i)}
          />
          <motion.circle
            cx={p.x}
            cy={p.y}
            r={3}
            fill="#3B82F6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
          />
        </g>
      ))}

      {/* Dimension name + score labels */}
      {validDimensions.map((d, i) => {
        const v = vertex(i, outerR);
        const angle = angleForIndex(i);
        // Push label outward from vertex
        const labelR = outerR + 24;
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);

        // Text anchor based on position
        let textAnchor: "start" | "middle" | "end" = "middle";
        if (angle < -Math.PI * 0.2 && angle > -Math.PI * 0.8) {
          textAnchor = "end";
        } else if (angle > Math.PI * 0.2 && angle < Math.PI * 0.8) {
          textAnchor = "start";
        }

        return (
          <g key={`label-${i}`}>
            <text
              x={lx}
              y={ly}
              fill="#9A9AB0"
              fontSize={labelSize}
              fontFamily="Inter, sans-serif"
              textAnchor={textAnchor}
            >
              {d.name}
            </text>
            <text
              x={lx}
              y={ly + (labelSize + 2)}
              fill="#EDEDEF"
              fontSize={scoreSize}
              fontFamily="JetBrains Mono, monospace"
              fontWeight={600}
              textAnchor={textAnchor}
            >
              {d.score}
            </text>
          </g>
        );
      })}
    </motion.svg>
  );
}
