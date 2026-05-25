"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { userKey } from "@/lib/storage";

interface Props {
  prescription: any[];
  summary: string;
  domain: string;
  locked?: boolean;
  lockMessage?: string;
  lockPrice?: string;
  showHeader?: boolean;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; leftBorder: string }> = {
  P0: { label: "P0", color: "#EF4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.20)", leftBorder: "rgba(239,68,68,0.40)" },
  P1: { label: "P1", color: "#F59E0B", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.20)", leftBorder: "rgba(245,158,11,0.25)" },
  P2: { label: "P2", color: "#9A9AB0", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", leftBorder: "rgba(255,255,255,0.06)" },
};

const STORAGE_KEY_BASE = "cf_prescription_done";

function loadDoneState(domain: string): Set<number> {
  try {
    const raw = localStorage.getItem(userKey(STORAGE_KEY_BASE));
    if (!raw) return new Set();
    const all = JSON.parse(raw);
    const domainDone = all[domain] || {};
    return new Set(Object.keys(domainDone).filter(k => domainDone[k]).map(Number));
  } catch {
    return new Set();
  }
}

function saveDoneState(domain: string, done: Set<number>) {
  try {
    const raw = localStorage.getItem(userKey(STORAGE_KEY_BASE));
    const all = raw ? JSON.parse(raw) : {};
    const domainDone: Record<number, boolean> = {};
    done.forEach(i => { domainDone[i] = true; });
    all[domain] = domainDone;
    localStorage.setItem(userKey(STORAGE_KEY_BASE), JSON.stringify(all));
  } catch {}
}

type SeverityColor = { dot: string; bg: string; border: string; text: string };

const SEVERITY_COLORS: Record<string, SeverityColor> = {
  critical: { dot: "#EF4444", bg: "rgba(239,68,68,0.05)", border: "rgba(239,68,68,0.15)", text: "#EF4444" },
  warning: { dot: "#F59E0B", bg: "rgba(245,158,11,0.05)", border: "rgba(245,158,11,0.15)", text: "#F59E0B" },
  healthy: { dot: "#22C55E", bg: "rgba(34,197,94,0.05)", border: "rgba(34,197,94,0.15)", text: "#22C55E" },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span
        className="block w-1 h-3 rounded-full shrink-0"
        style={{ background: "linear-gradient(180deg, #0EA5E9 0%, rgba(14,165,233,0.15) 100%)" }}
      />
      <span className="text-[10px] font-mono tracking-[0.15em] uppercase" style={{ color: "rgba(14,165,233,0.50)" }}>
        {children}
      </span>
    </div>
  );
}

function extractEstimatedWeeks(summary: string): string {
  const m = summary.match(/(\d+[-–]\d+)\s*周/);
  return m ? m[1] + " 周" : "4-8 周";
}

export function ScanPrescriptionSteps({ prescription, summary, domain, locked, lockMessage, lockPrice, showHeader }: Props) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    setDone(loadDoneState(domain));
    setInitialized(true);
  }, [domain]);

  function toggleDone(index: number) {
    setDone(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      saveDoneState(domain, next);
      return next;
    });
  }

  const items = prescription || [];
  if (items.length === 0) return null;

  const allDone = initialized && done.size === items.length;
  const p0Remaining = items.filter((item: any, i: number) =>
    item.priority === "P0" && !done.has(i)
  ).length;
  const estimatedWeeks = extractEstimatedWeeks(summary);

  const listContent = (
    <div
      className="px-7 py-7 flex-shrink-0"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.008) 100%)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* ── Header (showHeader mode) ── */}
      {showHeader && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">💊</span>
              <h2 className="text-lg font-semibold" style={{ color: "#EDEDF5" }}>Doctor 处方</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 text-xs transition-all duration-300"
                style={{
                  background: "rgba(56,189,248,0.08)",
                  border: "1px solid rgba(56,189,248,0.18)",
                  color: "#7DD3FC",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(56,189,248,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(56,189,248,0.08)";
                }}
                onClick={() => alert("导出功能开发中")}
              >
                导出
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-2.5" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 9999, height: 4 }}>
            <motion.div
              style={{ background: "#38BDF8", borderRadius: 9999, height: 4 }}
              initial={{ width: 0 }}
              animate={{ width: `${(done.size / Math.max(items.length, 1)) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs" style={{ color: "#5E5E78" }}>
            <span>{done.size}/{items.length} 已完成</span>
            {p0Remaining > 0 && (
              <span style={{ color: "#EF4444" }}>⚠️ {p0Remaining}个P0待处理</span>
            )}
            <span>· 预计 {estimatedWeeks} 引用率显著提升</span>
          </div>
        </div>
      )}

      {/* ── Section label (non-header mode) ── */}
      {!showHeader && (
        <div className="flex items-center justify-between mb-5">
          <SectionLabel>处方执行步骤</SectionLabel>
          {allDone && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] font-mono tracking-wide px-2 py-1"
              style={{
                color: "#22C55E",
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.15)",
              }}
            >
              全部完成 ✓
            </motion.span>
          )}
        </div>
      )}

      {/* ── Task items ── */}
      <div className="space-y-2">
        {items.map((item: any, i: number) => {
          const priority = item.priority || "P2";
          const priConf = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.P2;
          const isDone = done.has(i);
          const isExpanded = expandedIndex === i;
          const hasDetails = !!(item.what_to_add?.length > 0 || item.how_to_verify || item.evidence);

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            >
              <button
                type="button"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("[data-checkbox]")) {
                    toggleDone(i);
                  } else if (hasDetails) {
                    setExpandedIndex(isExpanded ? null : i);
                  }
                }}
                className="w-full flex items-center gap-3.5 p-3.5 text-left transition-all duration-300"
                style={{
                  background: isDone
                    ? "rgba(34,197,94,0.03)"
                    : "rgba(255,255,255,0.012)",
                  borderLeft: `2px solid ${priConf.leftBorder}`,
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                  borderRight: "1px solid rgba(255,255,255,0.04)",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
                onMouseEnter={(e) => {
                  if (!isDone) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderRightColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.borderBottomColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.borderTopColor = "rgba(255,255,255,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDone) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.012)";
                    e.currentTarget.style.borderRightColor = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.borderBottomColor = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.borderTopColor = "rgba(255,255,255,0.04)";
                  }
                }}
              >
                {/* Checkbox */}
                <span
                  data-checkbox
                  className="shrink-0 w-5 h-5 rounded-sm flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isDone ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
                    border: isDone ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {isDone && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-[11px] leading-none"
                      style={{ color: "#22C55E" }}
                    >
                      ✓
                    </motion.span>
                  )}
                </span>

                {/* Priority badge */}
                <span
                  className="shrink-0 text-[10px] px-2 py-0.5 font-medium tracking-wide"
                  style={{ color: priConf.color, background: priConf.bg, border: `1px solid ${priConf.border}` }}
                >
                  {priConf.label}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm truncate"
                    style={{
                      color: isDone ? "#5E5E78" : "#C8C8D8",
                      textDecoration: isDone ? "line-through" : "none",
                    }}
                  >
                    <span className="text-[11px]" style={{ color: "#5E5E78" }}>{item.category}</span>
                    <span className="mx-1.5" style={{ color: "rgba(255,255,255,0.08)" }}>·</span>
                    {item.action}
                  </p>
                </div>

                {/* Expand arrow */}
                {hasDetails && (
                  <span className="shrink-0 text-[10px]" style={{ color: "#5E5E78" }}>
                    {isExpanded ? "▲" : "▼"}
                  </span>
                )}
              </button>

              {/* ── Expanded details ── */}
              <AnimatePresence>
                {isExpanded && hasDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-4 py-4 space-y-3"
                      style={{
                        background: "rgba(255,255,255,0.008)",
                        borderLeft: `2px solid ${priConf.leftBorder}`,
                        borderRight: "1px solid rgba(255,255,255,0.04)",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      {/* Target page */}
                      {item.target_page && (
                        <div>
                          <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
                            目标页面
                          </p>
                          <p className="text-xs" style={{ color: "#C8C8D8" }}>{item.target_page}</p>
                        </div>
                      )}

                      {/* What to add */}
                      {item.what_to_add && item.what_to_add.length > 0 && (
                        <div>
                          <p className="text-[10px] font-mono tracking-wider uppercase mb-1.5" style={{ color: "rgba(56,189,248,0.5)" }}>
                            具体操作
                          </p>
                          <ul className="space-y-1.5">
                            {item.what_to_add.map((step: string, j: number) => (
                              <li key={j} className="text-xs flex items-start gap-2" style={{ color: "#C8C8D8" }}>
                                <span style={{ color: "#38BDF8" }}>·</span>
                                <span className="leading-relaxed">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Meta: evidence + timeline + difficulty */}
                      <div className="flex flex-wrap gap-4 text-[10px]" style={{ color: "#5E5E78" }}>
                        {item.evidence && <span>📚 {item.evidence}</span>}
                        {item.timeline && <span>⏱️ {item.timeline}</span>}
                        {item.difficulty && <span>📊 难度：{item.difficulty}</span>}
                      </div>

                      {/* Expected impact */}
                      {item.expected_impact && (
                        <div>
                          <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(34,197,94,0.5)" }}>
                            预期效果
                          </p>
                          <p className="text-xs" style={{ color: "#34D399" }}>{item.expected_impact}</p>
                        </div>
                      )}

                      {/* How to verify */}
                      {item.how_to_verify && (
                        <div className="p-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                          <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(245,158,11,0.5)" }}>
                            如何验证
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>{item.how_to_verify}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* All-done badge (showHeader mode) */}
      {showHeader && allDone && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-4 text-xs font-mono"
          style={{ color: "#22C55E" }}
        >
          全部完成 ✓
        </motion.p>
      )}

      {/* Summary */}
      {summary && (
        <p className="text-xs mt-6 text-center leading-relaxed" style={{ color: "#6A6A82" }}>
          {summary}
        </p>
      )}
    </div>
  );

  if (!locked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
      >
        {listContent}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="relative overflow-hidden flex-shrink-0"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.008) 100%)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="select-none" style={{ filter: "blur(8px)", opacity: 0.18 }}>
        {listContent}
      </div>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4"
        style={{
          background: "linear-gradient(180deg, rgba(8,8,13,0.3) 0%, rgba(8,8,13,0.78) 50%, rgba(8,8,13,0.3) 100%)",
        }}
      >
        <span className="text-2xl">🔒</span>
        <p className="text-sm font-medium" style={{ color: "#EDEDF5" }}>{lockMessage || "升级解锁处方执行"}</p>
        <p className="text-xs text-center max-w-xs" style={{ color: "#5E5E78" }}>
          获取 P0/P1/P2 任务清单，精确到页面和操作步骤，逐个执行提升 AI 引用率
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
