"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import type { ProbeFullInput } from "./probe-briefing";

// ─── Types ───────────────────────────────────────────────

interface Props {
  elapsed: number;
  domain: string;
  brandName: string;
  briefingData: ProbeFullInput;
  progressLog?: LogEntry[];
  onCancel?: () => void;
}

export interface LogEntry {
  time: number;
  text: string;
  type: "info" | "success" | "error";
}

interface MockMessage {
  time: number;
  text: string;
  type: "info" | "success" | "error";
}

// ─── Helpers ──────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(m).padStart(2, "0")}:${String(Math.floor(s)).padStart(2, "0")}.${tenths}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── MOCK_MESSAGES ────────────────────────────────────────

const MOCK_MESSAGES: MockMessage[] = [
  { time: 3, text: "开始扫描品牌官网...", type: "info" },
  { time: 6, text: "抓取官网结构化数据 · 识别到 12 个页面", type: "info" },
  { time: 10, text: "提取品牌实体：品牌名、产品线、价值主张", type: "info" },
  { time: 14, text: "品牌画像完成 · 识别到核心产品线 4 条", type: "success" },
  { time: 17, text: "行业定位：消费电子 → 手机配件 → 环保手机壳", type: "info" },
  { time: 20, text: "品牌扫描阶段完成 ✓", type: "success" },

  { time: 22, text: "DeepSeek 查询词生成引擎启动...", type: "info" },
  { time: 25, text: "A类查询完成 · 10个行业通用词", type: "success" },
  { time: 28, text: "B类查询完成 · 10个品牌直接词", type: "success" },
  { time: 30, text: "C类查询完成 · 10个竞品对比词", type: "success" },
  { time: 35, text: "查询词生成完成 ✓ · 共30个查询词", type: "success" },

  { time: 38, text: "ChatGPT引擎启动 · 开始搜索...", type: "info" },
  { time: 42, text: "ChatGPT · A1/10 · \"best eco friendly phone case\"", type: "info" },
  { time: 46, text: "ChatGPT · 品牌被提及 ✓ · 位置：第3位", type: "success" },
  { time: 50, text: "ChatGPT · A2/10 · \"top sustainable phone case brands\"", type: "info" },
  { time: 54, text: "ChatGPT · 品牌未提及 ✗", type: "error" },
  { time: 58, text: "ChatGPT · A3/10 · \"biodegradable phone case review\"", type: "info" },
  { time: 62, text: "ChatGPT · 品牌被提及 ✓ · 位置：第5位", type: "success" },
  { time: 66, text: "ChatGPT · A4/10 · \"phone case buying guide 2026\"", type: "info" },
  { time: 70, text: "ChatGPT · 品牌未提及 ✗", type: "error" },
  { time: 74, text: "ChatGPT · A5/10 · \"eco friendly tech accessories\"", type: "info" },
  { time: 78, text: "ChatGPT · 品牌被提及 ✓ · 位置：第2位", type: "success" },
  { time: 82, text: "ChatGPT · A类查询完成 · 引用率 40%", type: "info" },
  { time: 85, text: "ChatGPT · 开始搜索B类查询...", type: "info" },
  { time: 88, text: "ChatGPT · B1/10 · \"UGREEN review\"", type: "info" },
  { time: 91, text: "ChatGPT · 品牌被提及 ✓ · 推荐位置：顶部", type: "success" },
  { time: 94, text: "ChatGPT · B2/10 · \"UGREEN quality\"", type: "info" },
  { time: 97, text: "ChatGPT · 品牌被提及 ✓ · 推荐位置：中部", type: "success" },
  { time: 100, text: "ChatGPT · B3/10 · \"is UGREEN worth it\"", type: "info" },
  { time: 103, text: "ChatGPT · 品牌被提及 ✓ · 推荐位置：顶部", type: "success" },
  { time: 106, text: "ChatGPT · B类查询完成 · 引用率 80%", type: "success" },
  { time: 109, text: "ChatGPT · 开始搜索C类查询...", type: "info" },
  { time: 112, text: "ChatGPT · C1/10 · \"UGREEN vs Anker\"", type: "info" },
  { time: 115, text: "ChatGPT · 品牌被提及 ✓ · 竞品Anker也被提及", type: "info" },
  { time: 118, text: "ChatGPT · C2/10 · \"UGREEN vs Baseus\"", type: "info" },
  { time: 121, text: "ChatGPT · 品牌被提及 ✓ · 竞品Baseus也被提及", type: "info" },
  { time: 124, text: "ChatGPT · C3/10 · \"best phone case brands\"", type: "info" },
  { time: 127, text: "ChatGPT · 品牌未提及 ✗ · 竞品Casetify被提及", type: "error" },
  { time: 130, text: "ChatGPT · C类查询完成 · 引用率 60%", type: "info" },
  { time: 135, text: "ChatGPT引擎搜索完成 ✓ · 总引用率 55%", type: "success" },
  { time: 138, text: "ChatGPT · 推荐率 35% · 头部引用率 15%", type: "info" },

  { time: 142, text: "Gemini引擎启动 · 开始搜索...", type: "info" },
  { time: 146, text: "Gemini · A1/10 · \"best eco friendly phone case\"", type: "info" },
  { time: 150, text: "Gemini · 品牌未提及 ✗", type: "error" },
  { time: 154, text: "Gemini · A2/10 · \"top sustainable phone case brands\"", type: "info" },
  { time: 158, text: "Gemini · 品牌被提及 ✓ · 位置：第7位", type: "success" },
  { time: 162, text: "Gemini · A3/10 · \"biodegradable phone case review\"", type: "info" },
  { time: 166, text: "Gemini · 品牌未提及 ✗", type: "error" },
  { time: 170, text: "Gemini · A类查询完成 · 引用率 20%", type: "info" },
  { time: 174, text: "Gemini · 开始搜索B类查询...", type: "info" },
  { time: 178, text: "Gemini · B1/10 · \"UGREEN review\"", type: "info" },
  { time: 182, text: "Gemini · 品牌被提及 ✓ · 推荐位置：中部", type: "success" },
  { time: 186, text: "Gemini · B2/10 · \"UGREEN quality\"", type: "info" },
  { time: 190, text: "Gemini · 品牌被提及 ✓ · 推荐位置：底部", type: "success" },
  { time: 194, text: "Gemini · B类查询完成 · 引用率 70%", type: "success" },
  { time: 198, text: "Gemini · 开始搜索C类查询...", type: "info" },
  { time: 202, text: "Gemini · C1/10 · \"UGREEN vs Anker\"", type: "info" },
  { time: 206, text: "Gemini · 品牌被提及 ✓ · 竞品Anker也被提及", type: "info" },
  { time: 210, text: "Gemini · C2/10 · \"best phone case brands\"", type: "info" },
  { time: 214, text: "Gemini · 品牌未提及 ✗ · 竞品Casetify被提及", type: "error" },
  { time: 218, text: "Gemini · C类查询完成 · 引用率 50%", type: "info" },
  { time: 225, text: "Gemini引擎搜索完成 ✓ · 总引用率 42%", type: "success" },
  { time: 228, text: "Gemini · 推荐率 28% · 头部引用率 10%", type: "info" },

  { time: 232, text: "Claude引擎启动 · 开始搜索...", type: "info" },
  { time: 236, text: "Claude · A1/10 · \"best eco friendly phone case\"", type: "info" },
  { time: 240, text: "Claude · 品牌被提及 ✓ · 位置：第4位", type: "success" },
  { time: 244, text: "Claude · A2/10 · \"top sustainable phone case brands\"", type: "info" },
  { time: 248, text: "Claude · 品牌未提及 ✗", type: "error" },
  { time: 252, text: "Claude · A类查询完成 · 引用率 30%", type: "info" },
  { time: 256, text: "Claude · 开始搜索B类查询...", type: "info" },
  { time: 260, text: "Claude · B1/10 · \"UGREEN review\"", type: "info" },
  { time: 264, text: "Claude · 品牌被提及 ✓ · 推荐位置：顶部", type: "success" },
  { time: 268, text: "Claude · B类查询完成 · 引用率 75%", type: "success" },
  { time: 272, text: "Claude · 开始搜索C类查询...", type: "info" },
  { time: 276, text: "Claude · C1/10 · \"UGREEN vs Anker\"", type: "info" },
  { time: 280, text: "Claude · 品牌被提及 ✓ · 竞品Anker也被提及", type: "info" },
  { time: 284, text: "Claude · C类查询完成 · 引用率 55%", type: "info" },
  { time: 290, text: "Claude引擎搜索完成 ✓ · 总引用率 48%", type: "success" },
  { time: 293, text: "Claude · 推荐率 32% · 头部引用率 12%", type: "info" },

  { time: 298, text: "三引擎搜索完成 · 开始竞品分析...", type: "info" },
  { time: 302, text: "竞品识别：Casetify、Pela、Wildflower、Burga", type: "info" },
  { time: 306, text: "场景1/9 · \"best eco friendly phone case\" · 对比中...", type: "info" },
  { time: 310, text: "场景1完成 · 你的品牌排名第3 · Casetify排名第1", type: "info" },
  { time: 314, text: "场景5/9 · \"sustainable phone accessories\" · 对比中...", type: "info" },
  { time: 318, text: "场景5完成 · 你的品牌排名第2 · Pela排名第1", type: "success" },
  { time: 322, text: "9个场景逐维度对比完成 ✓", type: "success" },

  { time: 326, text: "综合评分计算中...", type: "info" },
  { time: 330, text: "A类引用率：30% · B类引用率：75% · C类引用率：55%", type: "info" },
  { time: 334, text: "Gap分析：品牌自述 vs AI认知差距...", type: "info" },
  { time: 338, text: "AI认知画像生成中...", type: "info" },
  { time: 342, text: "引用来源权威度分析...", type: "info" },
  { time: 346, text: "报告生成完成 ✓", type: "success" },
  { time: 350, text: "综合评分：67/100 · 行业引用率：30%", type: "info" },
  { time: 355, text: "侦察任务完成 · 正在生成侦察报告...", type: "success" },
];

// ─── Phase Pipeline ────────────────────────────────────

const PHASES = [
  { label: "品牌扫描", threshold: 20 },
  { label: "查询生成", threshold: 35 },
  { label: "引擎搜索", threshold: 280 },
  { label: "竞品分析", threshold: 310 },
  { label: "报告生成", threshold: Infinity },
];

// ─── Design tokens ─────────────────────────────────────

const T = {
  bg: "#08080D",
  accent: "#38BDF8",
  accentGlow: "#7DD3FC",
  primary: "#EDEDF5",
  secondary: "#9A9AB0",
  muted: "#5E5E78",
  success: "#22C55E",
  danger: "#EF4444",
  border: "rgba(255,255,255,0.04)",
  surface: "rgba(255,255,255,0.015)",
};

// ─── Sub-components ────────────────────────────────────

/** Classification banner — thin bar at top */
function ClassificationBar() {
  return (
    <div
      className="flex items-center justify-between px-6 shrink-0"
      style={{
        height: 10,
        background: "rgba(56,189,248,0.04)",
        borderBottom: "1px solid rgba(56,189,248,0.06)",
      }}
    >
      <span
        className="font-mono text-[8px] tracking-[0.18em] uppercase"
        style={{ color: "rgba(56,189,248,0.45)" }}
      >
        SIGINT // ACTIVE MISSION
      </span>
      <span
        className="font-mono text-[8px] tracking-[0.18em] uppercase"
        style={{ color: "rgba(56,189,248,0.45)" }}
      >
        PROBE RECON // CLASSIFIED
      </span>
    </div>
  );
}

/** Top bar with breathing status dot + mission label + timer */
function TopBar({ elapsed }: { elapsed: number }) {
  return (
    <div
      className="flex items-center justify-between px-6 shrink-0"
      style={{
        height: 48,
        background: "linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(255,255,255,0.006) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Breathing status dot */}
        <span
          className="inline-block w-[5px] h-[5px] rounded-full shrink-0"
          style={{
            background: T.success,
            boxShadow: "0 0 4px rgba(34,197,94,0.5), 0 0 8px rgba(34,197,94,0.2)",
            animation: "statusBreath 2s ease-in-out infinite",
          }}
        />
        <span
          className="font-mono text-[11px] tracking-[0.14em] uppercase"
          style={{ color: "#6B6B8A" }}
        >
          PROBE 侦察兵 · 执行中
        </span>
      </div>

      <div className="flex flex-col items-end">
        <span
          className="font-mono text-[8px] tracking-[0.16em] uppercase mb-0.5"
          style={{ color: "rgba(56,189,248,0.35)" }}
        >
          MISSION ELAPSED
        </span>
        <span
          className="font-mono text-[28px] font-semibold tracking-[0.02em] leading-none"
          style={{
            color: T.accent,
            textShadow: "0 0 4px rgba(56,189,248,0.4), 0 0 20px rgba(56,189,248,0.18), 0 0 60px rgba(56,189,248,0.06)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatElapsed(elapsed)}
        </span>
      </div>
    </div>
  );
}

/** Dossier card wrapper with left accent bar and hash marks */
function DossierCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden shrink-0"
      style={{
        padding: "18px 18px 18px 22px",
        background: "linear-gradient(135deg, rgba(255,255,255,0.018) 0%, rgba(255,255,255,0.008) 100%)",
        border: "1px solid rgba(255,255,255,0.045)",
      }}
    >
      {/* Left accent bar */}
      <span
        className="absolute left-0"
        style={{
          top: 12,
          width: 2,
          height: "calc(100% - 24px)",
          background: "linear-gradient(180deg, rgba(56,189,248,0.3) 0%, rgba(56,189,248,0.08) 50%, rgba(56,189,248,0.3) 100%)",
        }}
      />
      {/* Hash marks */}
      <span
        className="absolute font-mono text-[6px] tracking-[3px] pointer-events-none"
        style={{ top: 6, right: 10, color: "rgba(255,255,255,0.07)" }}
      >
        {"///////"}
      </span>
      {children}
    </div>
  );
}

/** Ruled field row */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-baseline py-[7px]"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.025)" }}
    >
      <span
        className="font-mono text-[9px] tracking-[0.08em] uppercase shrink-0"
        style={{ color: "rgba(56,189,248,0.3)", width: 72 }}
      >
        {label}
      </span>
      <span className="text-xs leading-relaxed flex-1" style={{ color: "#A0A0B8" }}>
        {value || "—"}
      </span>
    </div>
  );
}

/** Brand Dossier card */
function BrandDossier({ data }: { data: ProbeFullInput }) {
  return (
    <DossierCard>
      <p
        className="font-mono text-[8px] tracking-[0.16em] uppercase mb-2.5"
        style={{ color: "rgba(56,189,248,0.35)" }}
      >
        TARGET DOSSIER
      </p>
      <p className="text-base font-semibold tracking-[0.04em] mb-0.5" style={{ color: "#E8E8F0" }}>
        {data.brand_name}
      </p>
      <p className="font-mono text-[11px] mb-[18px]" style={{ color: T.muted }}>
        {data.domain}
      </p>
      <Field label="核心产品" value={data.core_product} />
      <Field label="目标市场" value={data.target_market} />
      <Field label="竞品" value={data.competitors.length > 0 ? data.competitors.join(" · ") : ""} />
      <Field label="目标定位" value={data.target_positioning} />
    </DossierCard>
  );
}

/** Query type row in scan config */
function QueryTypeRow({
  label,
  count,
  desc,
  explain,
  variant,
}: {
  label: string;
  count: number;
  desc: string;
  explain: string;
  variant: "a" | "b" | "c";
}) {
  const accentColors = {
    a: "rgba(56,189,248,0.5)",
    b: "rgba(34,197,94,0.5)",
    c: "rgba(245,158,11,0.5)",
  };
  return (
    <div
      className="relative mb-2 last:mb-0"
      style={{
        padding: "10px 12px",
        background: "rgba(255,255,255,0.012)",
        border: "1px solid rgba(255,255,255,0.03)",
      }}
    >
      <span
        className="absolute top-0 left-0 h-full"
        style={{
          width: 3,
          background: `linear-gradient(180deg, ${accentColors[variant]}, rgba(0,0,0,0.1))`,
        }}
      />
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium" style={{ color: "#B0B0C8" }}>
          {label} · {desc}
        </span>
        <span
          className="font-mono text-[10px]"
          style={{
            color: T.muted,
            background: "rgba(255,255,255,0.03)",
            padding: "1px 7px",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          {count}个
        </span>
      </div>
      <span className="font-mono text-[9px] pl-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>
        → {explain}
      </span>
    </div>
  );
}

/** Scan Config card */
function ScanConfigCard({ queryCount }: { queryCount: number }) {
  const perCategory = Math.floor(queryCount / 3);
  const rem = queryCount - perCategory * 3;
  const aCount = perCategory + (rem > 0 ? 1 : 0);
  const bCount = perCategory + (rem > 1 ? 1 : 0);
  const cCount = perCategory;

  return (
    <DossierCard>
      <p
        className="font-mono text-[8px] tracking-[0.16em] uppercase mb-3"
        style={{ color: "rgba(56,189,248,0.35)" }}
      >
        SCAN CONFIG
      </p>
      <QueryTypeRow label="A类查询" count={aCount} desc="行业通用搜索" explain="测试AI是否认识你的品类" variant="a" />
      <QueryTypeRow label="B类查询" count={bCount} desc="品牌直接搜索" explain="测试AI怎么描述你的品牌" variant="b" />
      <QueryTypeRow label="C类查询" count={cCount} desc="竞品对比搜索" explain="测试AI推荐你还是推荐竞品" variant="c" />
      <div
        className="mt-3 pt-3 flex justify-between"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <span className="font-mono text-[9px]" style={{ color: "#6B6B8A" }}>
          引擎：ChatGPT · Gemini · Claude
        </span>
        <span className="font-mono text-[9px]" style={{ color: "#6B6B8A" }}>
          预计耗时：3-5分钟
        </span>
      </div>
    </DossierCard>
  );
}

/** SIGINT Data Feed — uses real backend progress_log, falls back to MOCK_MESSAGES */
function SigintFeed({ elapsed, progressLog }: { elapsed: number; progressLog?: LogEntry[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const hasRealLogs = progressLog && progressLog.length > 0;

  // Real logs: show all received entries, last 15
  const realMessages = hasRealLogs ? progressLog!.slice(-15) : [];
  // Mock fallback: show messages filtered by elapsed time
  const mockMessages = hasRealLogs ? [] : MOCK_MESSAGES.filter((m) => m.time <= elapsed).slice(-15);
  const visibleMessages = hasRealLogs ? realMessages : mockMessages;

  const totalCount = hasRealLogs ? progressLog!.length : MOCK_MESSAGES.length;
  const receivedCount = hasRealLogs ? progressLog!.length : MOCK_MESSAGES.filter((m) => m.time <= elapsed).length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Feed header */}
      <div className="flex items-center justify-between pb-2.5 shrink-0">
        <span
          className="font-mono text-[9px] tracking-[0.14em] uppercase"
          style={{ color: "rgba(56,189,248,0.3)" }}
        >
          SIGINT FEED
        </span>
        <span className="font-mono text-[9px]" style={{ color: hasRealLogs ? "rgba(34,197,94,0.45)" : "rgba(56,189,248,0.35)" }}>
          {hasRealLogs ? "● LIVE" : "● RECEIVING"}
        </span>
      </div>

      {/* Feed body with scan-line background */}
      <div
        className="relative flex-1 overflow-hidden min-h-0"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.003) 2px, rgba(255,255,255,0.003) 4px)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Top gradient mask */}
        <div
          className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: 40,
            background: `linear-gradient(180deg, ${T.bg} 0%, rgba(8,8,13,0.85) 40%, transparent 100%)`,
          }}
        />

        {/* CRT scan line */}
        <div
          className="absolute left-0 right-0 z-[11] pointer-events-none"
          style={{
            height: 2,
            background: "linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.06) 20%, rgba(56,189,248,0.1) 50%, rgba(56,189,248,0.06) 80%, transparent 100%)",
            animation: "scanLineSweep 4s linear infinite",
          }}
        />

        {/* Message list */}
        <div ref={listRef} className="p-3.5 flex flex-col gap-px h-full overflow-hidden relative z-[1]">
          {visibleMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="font-mono text-[11px] tracking-[0.08em]" style={{ color: "#3A3A52" }}>
                等待扫描开始...
              </span>
            </div>
          ) : (
            visibleMessages.map((msg, i) => {
              const marker = msg.type === "success" ? "✓" : msg.type === "error" ? "✗" : "·";
              const markerColor = msg.type === "success" ? "#2D8A4E" : msg.type === "error" ? "#9B3030" : "#6B6B8A";
              const textColor = msg.type === "success" ? "#4CAF6E" : msg.type === "error" ? "#D94A4A" : "#8A8AA0";
              // Real logs use absolute backend time, mock uses relative offset from scan start
              const displayTime = hasRealLogs ? formatElapsed(msg.time) : formatTime(msg.time);
              return (
                <motion.div
                  key={`${msg.time}-${i}`}
                  initial={{ opacity: 0, x: 6, background: "rgba(56,189,248,0.03)" }}
                  animate={{ opacity: 1, x: 0, background: "transparent" }}
                  transition={{ duration: 0.25 }}
                  className="flex items-start gap-2.5 px-2 py-1"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.015)" }}
                >
                  <span className="font-mono text-[9px] w-[38px] shrink-0 pt-px" style={{ color: T.muted }}>
                    {displayTime}
                  </span>
                  <span className="font-mono text-[10px] w-[14px] shrink-0 text-center pt-px" style={{ color: markerColor }}>
                    {marker}
                  </span>
                  <span className="font-mono text-[10.5px] leading-[1.45] flex-1" style={{ color: textColor }}>
                    {msg.text}
                  </span>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Feed footer */}
      <div className="flex items-center justify-between pt-2 shrink-0">
        <span className="font-mono text-[9px]" style={{ color: T.muted }}>
          SIGNALS: {receivedCount}/{hasRealLogs ? receivedCount : totalCount}
        </span>
        <span className="font-mono text-[9px]" style={{ color: T.muted }}>
          {hasRealLogs ? "LIVE" : elapsed < PHASES[PHASES.length - 1].threshold ? "ACTIVE" : "COMPLETE"}
        </span>
      </div>
    </div>
  );
}

/** Pipeline with radar ping animations */
function Pipeline({ elapsed }: { elapsed: number }) {
  let phaseIdx = PHASES.findIndex((p) => elapsed < p.threshold);
  if (phaseIdx === -1) phaseIdx = PHASES.length - 1;

  return (
    <div className="shrink-0 px-5 pb-3.5">
      <div
        className="flex items-center relative"
        style={{
          padding: "14px 24px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.012) 0%, rgba(255,255,255,0.004) 100%)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {/* Top edge accent */}
        <div
          className="absolute left-10 right-10 top-0"
          style={{
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.08), transparent)",
          }}
        />

        {PHASES.map((phase, i) => {
          const isDone = i < phaseIdx;
          const isActive = i === phaseIdx;
          const isLast = i === PHASES.length - 1;

          return (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-1.5">
                {/* Phase dot with radar ping */}
                <span className="relative w-[14px] h-[14px] shrink-0 flex items-center justify-center">
                  <span
                    className="inline-block w-[6px] h-[6px] rounded-full relative z-[1]"
                    style={{
                      background: isDone ? T.success : isActive ? T.accent : "#2A2A40",
                      boxShadow: isDone
                        ? "0 0 4px rgba(34,197,94,0.5)"
                        : isActive
                          ? "0 0 6px rgba(56,189,248,0.6), 0 0 14px rgba(56,189,248,0.2)"
                          : "none",
                      transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                  {isActive && (
                    <span
                      className="absolute pointer-events-none rounded-full"
                      style={{
                        inset: -4,
                        border: "1px solid rgba(56,189,248,0.3)",
                        animation: "radarPing 2s ease-out infinite",
                      }}
                    />
                  )}
                </span>
                <span
                  className="text-[10px] font-medium tracking-[0.04em] whitespace-nowrap"
                  style={{
                    color: isDone ? "#4A7A5A" : isActive ? T.accentGlow : "#3A3A52",
                    transition: "color 0.6s ease",
                  }}
                >
                  {phase.label}
                </span>
              </div>

              {/* Connector */}
              {!isLast && (
                <div
                  className="flex-1 min-w-[30px] mx-1.5 h-px relative overflow-hidden"
                  style={{
                    background: isDone
                      ? "rgba(34,197,94,0.15)"
                      : isActive
                        ? "rgba(56,189,248,0.08)"
                        : "rgba(255,255,255,0.06)",
                    transition: "background 0.8s ease",
                  }}
                >
                  {isDone && (
                    <span
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(90deg, rgba(34,197,94,0.35) 0%, rgba(34,197,94,0.08) 100%)",
                      }}
                    />
                  )}
                  {isActive && (
                    <span
                      className="absolute top-0 bottom-0"
                      style={{
                        width: "30%",
                        background: "linear-gradient(90deg, rgba(56,189,248,0.25), transparent)",
                        animation: "connectorPulse 1.6s ease-in-out infinite",
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export function ScanProbeLoading({ elapsed, domain, brandName, briefingData, progressLog, onCancel }: Props) {
  const queryCount = briefingData.seed_queries?.length || 30;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col h-full relative"
      style={{ background: T.bg }}
    >
      {/* Ambient glow behind console */}
      <div
        className="absolute pointer-events-none z-0"
        style={{
          width: 1000,
          height: 700,
          background: "radial-gradient(ellipse at center, rgba(56,189,248,0.025) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Console frame — inner glow */}
      <div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          boxShadow: "inset 0 0 120px rgba(0,0,0,0.3)",
        }}
      />

      {/* Corner brackets */}
      <span
        className="absolute pointer-events-none z-[5]"
        style={{
          top: 6, left: 6, width: 1, height: 16,
          background: "linear-gradient(180deg, rgba(56,189,248,0.2) 0%, transparent 100%)",
        }}
      />
      <span
        className="absolute pointer-events-none z-[5]"
        style={{
          top: 6, right: 6, width: 1, height: 16,
          background: "linear-gradient(180deg, rgba(56,189,248,0.2) 0%, transparent 100%)",
        }}
      />
      <span
        className="absolute pointer-events-none z-[5]"
        style={{
          bottom: 6, left: 6, width: 1, height: 16,
          background: "linear-gradient(0deg, rgba(56,189,248,0.12) 0%, transparent 100%)",
        }}
      />
      <span
        className="absolute pointer-events-none z-[5]"
        style={{
          bottom: 6, right: 6, width: 1, height: 16,
          background: "linear-gradient(0deg, rgba(56,189,248,0.12) 0%, transparent 100%)",
        }}
      />

      <ClassificationBar />
      <TopBar elapsed={elapsed} />

      {/* Content: left-right split */}
      <div className="flex-1 flex gap-0 px-5 py-[18px] min-h-0 relative z-[1]">
        {/* Left column 44% */}
        <div className="w-[44%] flex flex-col gap-3.5 min-h-0 pr-[18px]" style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
          <BrandDossier data={briefingData} />
          <ScanConfigCard queryCount={queryCount} />
        </div>

        {/* Right column 56% */}
        <div className="w-[56%] flex flex-col min-h-0 pl-[18px]">
          <SigintFeed elapsed={elapsed} progressLog={progressLog} />
        </div>
      </div>

      <Pipeline elapsed={elapsed} />

      {/* Cancel button */}
      {onCancel && (
        <div className="flex justify-center pb-3.5">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs rounded-lg transition-all hover:brightness-110"
            style={{ color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            取消扫描
          </button>
        </div>
      )}

      {/* Keyframe animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes statusBreath {
          0%, 100% { opacity: 0.7; box-shadow: 0 0 3px rgba(34,197,94,0.4), 0 0 6px rgba(34,197,94,0.15); }
          50% { opacity: 1; box-shadow: 0 0 5px rgba(34,197,94,0.7), 0 0 12px rgba(34,197,94,0.3); }
        }
        @keyframes scanLineSweep {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        @keyframes radarPing {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes connectorPulse {
          0%, 100% { left: 0%; opacity: 0.4; }
          50% { left: 70%; opacity: 1; }
        }
      `}} />
    </motion.div>
  );
}
