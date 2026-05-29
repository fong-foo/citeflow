"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────

interface DoctorWorkshopProps {
  prescription: PrescriptionItem[];
  summary: string;
  paperCount: number;
  domain: string;
  brandName?: string;
  onNewScan: () => void;
}

interface PrescriptionItem {
  priority: string;
  category: string;
  target_page: string;
  action: string;
  what_to_add: string[];
  evidence: string;
  expected_impact: string;
  timeline: string;
  how_to_verify: string;
  difficulty: string;
}

// ─── Constants ─────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; leftBorder: string }> = {
  P0: { label: "P0", color: "#EF4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.20)", leftBorder: "rgba(239,68,68,0.40)" },
  P1: { label: "P1", color: "#F59E0B", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.20)", leftBorder: "rgba(245,158,11,0.25)" },
  P2: { label: "P2", color: "#9A9AB0", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", leftBorder: "rgba(255,255,255,0.06)" },
};

// ─── localStorage helpers (same key format as scan-prescription-steps) ──

// ─── Sub-components ────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "rgba(56,189,248,0.5)",
      margin: "0 0 4px 0",
    }}>{children}</p>
  );
}

function PrescriptionCard({
  item,
  isDone,
  isExpanded,
  priority,
  onToggleExpand,
  onToggleDone,
}: {
  item: PrescriptionItem;
  isDone: boolean;
  isExpanded: boolean;
  priority: string;
  onToggleExpand: () => void;
  onToggleDone: () => void;
}) {
  const priConf = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.P2;

  return (
    <div>
      {/* Collapsed row */}
      <button
        type="button"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-checkbox]")) {
            onToggleDone();
          } else {
            onToggleExpand();
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "10px 14px",
          textAlign: "left",
          background: isDone ? "rgba(34,197,94,0.03)" : "rgba(255,255,255,0.012)",
          borderLeft: `2px solid ${priConf.leftBorder}`,
          borderTop: "1px solid rgba(255,255,255,0.04)",
          borderRight: "1px solid rgba(255,255,255,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          cursor: "pointer",
          transition: "background 0.3s, border-color 0.3s",
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
          style={{
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isDone ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
            border: isDone ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          {isDone && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{ color: "#22C55E", fontSize: 11 }}
            >
              ✓
            </motion.span>
          )}
        </span>

        {/* Priority badge */}
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "1px 6px",
          color: priConf.color,
          background: priConf.bg,
          border: `1px solid ${priConf.border}`,
          flexShrink: 0,
        }}>{priConf.label}</span>

        {/* Category + action + target_page */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 12,
            margin: 0,
            color: isDone ? "#5E5E78" : "#C8C8D8",
            textDecoration: isDone ? "line-through" : "none",
          }}>
            <span style={{ color: "#5E5E78", fontSize: 11 }}>{item.category}</span>
            <span style={{ color: "rgba(255,255,255,0.08)", margin: "0 6px" }}>·</span>
            {item.action}
          </p>
          {item.target_page && (
            <p style={{
              fontSize: 10,
              margin: "2px 0 0 0",
              color: "#5E5E78",
              fontFamily: "'JetBrains Mono', monospace",
            }}>{item.target_page}</p>
          )}
        </div>

        {/* Expand arrow */}
        <span style={{ color: "#5E5E78", fontSize: 10, flexShrink: 0 }}>
          {isExpanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded details — all 7 fields */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              padding: "14px 18px",
              background: "rgba(255,255,255,0.008)",
              borderLeft: `2px solid ${priConf.leftBorder}`,
              borderRight: "1px solid rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              {/* 1. what_to_add */}
              {item.what_to_add && item.what_to_add.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <Label>📋 内容模板</Label>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {item.what_to_add.map((step, j) => (
                      <li key={j} style={{
                        fontSize: 12,
                        color: "#C8C8D8",
                        padding: "3px 0",
                        paddingLeft: 12,
                        lineHeight: 1.5,
                      }}>
                        <span style={{ color: "#38BDF8", marginRight: 6 }}>·</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 2. expected_impact */}
              {item.expected_impact && (
                <div style={{ marginBottom: 10 }}>
                  <Label>📊 预期效果</Label>
                  <p style={{ fontSize: 12, color: "#34D399", margin: 0 }}>{item.expected_impact}</p>
                </div>
              )}

              {/* 3. meta row: timeline + difficulty */}
              <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 11 }}>
                {item.timeline && (
                  <span style={{ color: "#5E5E78" }}>⏱ 预计时间：<span style={{ color: "#9A9AB0" }}>{item.timeline}</span></span>
                )}
                {item.difficulty && (
                  <span style={{ color: "#5E5E78" }}>📊 难度：<span style={{ color: "#9A9AB0" }}>{item.difficulty}</span></span>
                )}
              </div>

              {/* 4. how_to_verify */}
              {item.how_to_verify && (
                <div style={{
                  marginBottom: 10,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <Label>🔬 如何验证</Label>
                  <p style={{ fontSize: 12, color: "#9A9AB0", margin: 0, lineHeight: 1.5 }}>
                    {item.how_to_verify}
                  </p>
                </div>
              )}

              {/* 5. evidence */}
              {item.evidence && (
                <div style={{ marginBottom: 0 }}>
                  <Label>📚 知识来源</Label>
                  <p style={{ fontSize: 11, color: "#5E5E78", margin: 0 }}>{item.evidence}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PrioritySection({
  priority,
  items,
  globalIndices,
  done,
  onToggleDone,
  defaultExpanded,
}: {
  priority: "P0" | "P1" | "P2";
  items: PrescriptionItem[];
  globalIndices: number[];
  done: Set<number>;
  onToggleDone: (globalIndex: number) => void;
  defaultExpanded: boolean;
}) {
  const [collapsed, setCollapsed] = useState(!defaultExpanded);
  const [expandedGlobalIndex, setExpandedGlobalIndex] = useState<number | null>(null);

  const config = PRIORITY_CONFIG[priority];
  const priLabel = priority === "P0" ? "紧急" : priority === "P1" ? "重要" : "优化";
  const remaining = globalIndices.filter(i => !done.has(i)).length;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Section header — clickable collapse */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "12px 16px",
          background: config.bg,
          border: `1px solid ${config.border}`,
          borderLeft: `3px solid ${config.leftBorder}`,
          cursor: "pointer",
          transition: "background 0.3s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = config.border;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = config.bg;
        }}
      >
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 8px",
          color: config.color,
          background: config.bg,
          border: `1px solid ${config.border}`,
        }}>{config.label}</span>
        <span style={{ color: "#C8C8D8", fontSize: 13, fontWeight: 500 }}>
          {priLabel}
        </span>
        <span style={{ color: "#5E5E78", fontSize: 12 }}>
          （{items.length}条{remaining < items.length ? `，${remaining}条未解决` : ""}）
        </span>
        <span style={{ marginLeft: "auto", color: "#5E5E78", fontSize: 10 }}>
          {collapsed ? "▶ 展开" : "▼ 收起"}
        </span>
      </button>

      {/* Collapsed content */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "8px 0" }}>
              {items.map((item, sectionIndex) => {
                const globalIndex = globalIndices[sectionIndex];
                const isDone = done.has(globalIndex);
                const isExpanded = expandedGlobalIndex === globalIndex;

                return (
                  <motion.div
                    key={globalIndex}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * sectionIndex, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <PrescriptionCard
                      item={item}
                      isDone={isDone}
                      isExpanded={isExpanded}
                      priority={priority}
                      onToggleExpand={() => setExpandedGlobalIndex(isExpanded ? null : globalIndex)}
                      onToggleDone={() => onToggleDone(globalIndex)}
                    />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────

export function ScanDoctorWorkshop({
  prescription,
  summary,
  paperCount,
  domain,
  brandName,
  scanCredits,
  onNewScan,
  onUpgrade,
}: ScanDoctorWorkshopProps) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Load persisted done state
  useEffect(() => {
    setDone(loadDoneState(domain));
    setInitialized(true);
  }, [domain]);

  function toggleDone(globalIndex: number) {
    setDone(prev => {
      const next = new Set(prev);
      if (next.has(globalIndex)) next.delete(globalIndex);
      else next.add(globalIndex);
      saveDoneState(domain, next);
      return next;
    });
  }

  // ── Data aggregation ──
  const items = prescription || [];
  const p0Items = items.filter((item) => item.priority === "P0");
  const p1Items = items.filter((item) => item.priority === "P1");
  const p2Items = items.filter((item) => item.priority === "P2");

  // Build global index maps
  const p0Indices = p0Items.map(item => items.indexOf(item));
  const p1Indices = p1Items.map(item => items.indexOf(item));
  const p2Indices = p2Items.map(item => items.indexOf(item));

  const total = items.length;
  const donePercent = total > 0 ? (done.size / total) * 100 : 0;
  const p0Remaining = p0Indices.filter(i => !done.has(i)).length;
  const p1Remaining = p1Indices.filter(i => !done.has(i)).length;
  const allP0Done = initialized && p0Items.length > 0 && p0Remaining === 0;
  const allP1Done = initialized && p1Items.length > 0 && p1Remaining === 0;

  // ── Empty state ──
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{
          padding: "60px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 14, color: "#9A9AB0" }}>暂无处方数据</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* ── Page title ── */}
      <h1 style={{
        fontSize: 14,
        fontWeight: 600,
        color: "#EDEDF5",
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        {brandName || domain} 处方工作室
      </h1>

      {/* ═══ ZONE 1: Strategy Overview ═══ */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(56,189,248,0.10)",
        padding: "20px 24px",
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>🧠</span>
          <span style={{
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(56,189,248,0.5)",
          }}>核心策略</span>
        </div>

        <p style={{
          fontSize: 13,
          color: "#C8C8D8",
          lineHeight: 1.6,
          margin: 0,
          marginBottom: 16,
        }}>{summary || "暂无策略总结"}</p>

        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          background: "rgba(56,189,248,0.06)",
          border: "1px solid rgba(56,189,248,0.12)",
        }}>
          <span style={{ fontSize: 10, color: "rgba(56,189,248,0.6)" }}>
            📚 基于 CiteFlow CITE 四维模型{paperCount > 0 ? ` · 融合 ${paperCount} 项研究` : ""}
          </span>
        </div>
      </div>

      {/* ═══ ZONE 2: Execution Overview ═══ */}
      <div style={{ marginBottom: 24 }}>
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>📊</span>
          <span style={{
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(56,189,248,0.5)",
          }}>执行进度</span>
        </div>

        {/* Progress bar */}
        <div style={{
          background: "rgba(255,255,255,0.06)",
          borderRadius: 9999,
          height: 4,
          marginBottom: 10,
          overflow: "hidden",
        }}>
          <motion.div
            style={{
              background: "#38BDF8",
              borderRadius: 9999,
              height: 4,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${donePercent}%` }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12 }}>
          <span style={{ color: "#9A9AB0" }}>
            {done.size}/{total} 已完成
          </span>
          {p0Remaining > 0 && (
            <span style={{ color: "#EF4444" }}>⚠️ {p0Remaining}条P0待处理</span>
          )}
          <span style={{ color: "#5E5E78" }}>
            · {p1Items.length}条P1 · {p2Items.length}条P2
          </span>
        </div>
      </div>

      {/* ═══ ZONE 3: Prescription List (P0/P1/P2 grouped) ═══ */}

      {/* ── P0 Section ── */}
      {p0Items.length > 0 && (
        <PrioritySection
          priority="P0"
          items={p0Items}
          globalIndices={p0Indices}
          done={done}
          onToggleDone={toggleDone}
          defaultExpanded={true}
        />
      )}

      {/* ── P1 Section ── */}
      {p1Items.length > 0 && (
        <PrioritySection
          priority="P1"
          items={p1Items}
          globalIndices={p1Indices}
          done={done}
          onToggleDone={toggleDone}
          defaultExpanded={allP0Done}
        />
      )}

      {/* ── P2 Section ── */}
      {p2Items.length > 0 && (
        <PrioritySection
          priority="P2"
          items={p2Items}
          globalIndices={p2Indices}
          done={done}
          onToggleDone={toggleDone}
          defaultExpanded={allP1Done}
        />
      )}

      {/* ── 底部操作区 ── */}
      <div style={{ marginTop: 40, padding: "16px 20px", borderRadius: 12,
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
        textAlign: "center" }}>
        {scanCredits > 0 ? (
          <>
            <p style={{ color: "#9A9AB0", fontSize: 13, marginBottom: 12 }}>
              完整体检还剩 {scanCredits} 次。需要给另一个品牌做体检？
            </p>
            <button onClick={onNewScan} style={{
              padding: "8px 24px", borderRadius: 8, border: "1px solid rgba(56,189,248,0.25)",
              background: "rgba(56,189,248,0.10)", color: "#7DD3FC", fontSize: 14, fontWeight: 500,
              cursor: "pointer",
            }}>开始新体检</button>
          </>
        ) : (
          <>
            <p style={{ color: "#9A9AB0", fontSize: 13, marginBottom: 12 }}>
              完整体检次数已用完
            </p>
            <button onClick={onUpgrade} style={{
              padding: "8px 24px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg, #3B82F6, #2563EB)", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>预约开通</button>
          </>
        )}
      </div>
    </motion.div>
  );
}
