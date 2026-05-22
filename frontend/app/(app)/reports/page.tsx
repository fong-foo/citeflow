"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { userKey } from "@/lib/storage";

const REPORTS_KEY_BASE = "cf_reports";

type TabId = "probe" | "probe_scout" | "analyst" | "doctor";

interface ReportRecord {
  id: string;
  type: string;
  label: string;
  domain: string;
  brandName: string;
  data: any;
  mode: string;
  timestamp: number;
}

const TABS: { id: TabId; label: string; sub: string }[] = [
  { id: "probe", label: "初步体检报告", sub: "Light Probe" },
  { id: "probe_scout", label: "Probe 侦察兵报告", sub: "Full Probe" },
  { id: "analyst", label: "Analyst 诊断师报告", sub: "14-Rule Diagnosis" },
  { id: "doctor", label: "处方", sub: "Prescription" },
];

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getScore(report: ReportRecord): number | null {
  return report.data?.probe?.company_score?.overall ?? null;
}

/* ─── ScoreBadge ─── */
function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const color = score >= 80 ? "#22C55E" : score >= 60 ? "#38BDF8" : score >= 40 ? "#F59E0B" : "#EF4444";
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
  return (
    <div className="inline-flex items-center gap-2" style={{ minWidth: 52 }}>
      <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color }}>
        {score}
      </span>
      <span
        className="text-[9px] font-mono font-bold px-1 py-0.5 rounded-sm"
        style={{
          color,
          background: `${color}14`,
          border: `1px solid ${color}28`,
        }}
      >
        {grade}
      </span>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ activeTab }: { activeTab: TabId }) {
  const tab = TABS.find((t) => t.id === activeTab)!;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center justify-center py-28 gap-8"
    >
      {/* Specimen drawer — empty */}
      <div className="relative" style={{ width: 100, height: 72 }}>
        {/* Drawer body */}
        <div
          className="absolute inset-0 rounded-sm"
          style={{
            background: "rgba(255,255,255,0.012)",
            border: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "inset 0 2px 16px rgba(0,0,0,0.4)",
          }}
        />
        {/* Drawer interior shadow */}
        <div
          className="absolute inset-2 rounded-sm"
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px dashed rgba(255,255,255,0.03)",
          }}
        />
        {/* Handle */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: -6, width: 44, height: 6 }}
        >
          <div
            className="w-full h-full rounded-t-sm"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
            }}
          />
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
            style={{
              background: "rgba(56,189,248,0.10)",
              border: "1px solid rgba(56,189,248,0.15)",
              boxShadow: "0 0 6px rgba(56,189,248,0.08)",
            }}
          />
        </div>
        {/* Corner rivets */}
        {[[8, 8], [92, 8], [8, 64], [92, 64]].map(([x, y], i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: x - 2, top: y - 2,
              background: "rgba(255,255,255,0.06)",
            }}
          />
        ))}
      </div>

      <div className="text-center space-y-2">
        <p className="text-[13px] font-medium tracking-[0.04em]" style={{ color: "rgba(255,255,255,0.22)" }}>
          暂无{tab.label}
        </p>
        <p className="text-[11px] tracking-[0.02em] max-w-[280px] leading-relaxed" style={{ color: "rgba(255,255,255,0.12)" }}>
          完成一次品牌扫描后，报告将自动归档至此抽屉
        </p>
      </div>

      <Link
        href="/scan"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-[11px] font-medium tracking-[0.04em] transition-all duration-300"
        style={{
          background: "rgba(56,189,248,0.05)",
          border: "1px solid rgba(56,189,248,0.10)",
          color: "#7DD3FC",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(56,189,248,0.10)";
          e.currentTarget.style.borderColor = "rgba(56,189,248,0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(56,189,248,0.05)";
          e.currentTarget.style.borderColor = "rgba(56,189,248,0.10)";
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
        开始新体检
      </Link>
    </motion.div>
  );
}

/* ─── Report Card — Filed Specimen Document ─── */
function ReportCard({
  report,
  onDelete,
  index,
}: {
  report: ReportRecord;
  onDelete: (id: string) => void;
  index: number;
}) {
  const [imgError, setImgError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const score = getScore(report);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.4, 0, 0.2, 1] }}
      className="group relative"
    >
      {/* Card */}
      <div
        className="relative flex items-center gap-4 px-4 py-3 transition-all duration-300"
        style={{
          background: "rgba(255,255,255,0.010)",
          border: "1px solid rgba(255,255,255,0.03)",
          borderLeft: "2px solid rgba(255,255,255,0.04)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.022)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
          e.currentTarget.style.borderLeftColor = "rgba(56,189,248,0.25)";
          e.currentTarget.style.transform = "translateX(2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.010)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.03)";
          e.currentTarget.style.borderLeftColor = "rgba(255,255,255,0.04)";
          e.currentTarget.style.transform = "translateX(0px)";
        }}
      >
        {/* Document frame — subtle inner border */}
        <div
          className="absolute inset-[3px] pointer-events-none"
          style={{
            border: "1px solid rgba(255,255,255,0.015)",
          }}
        />

        {/* Index number — stamped specimen ID */}
        <div className="shrink-0 flex flex-col items-center gap-0.5" style={{ width: 28 }}>
          <span
            className="font-mono text-[9px] font-medium leading-none"
            style={{ color: "rgba(255,255,255,0.10)" }}
          >
            #
          </span>
          <span
            className="font-mono text-[10px] font-medium leading-none"
            style={{ color: "rgba(255,255,255,0.16)" }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Specimen tag (favicon) */}
        <div
          className="shrink-0 flex items-center justify-center overflow-hidden relative"
          style={{
            width: 32,
            height: 32,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Corner marks on tag */}
          <span className="absolute top-0.5 left-0.5 w-1 h-[1px]" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="absolute top-0.5 left-0.5 h-1 w-[1px]" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="absolute top-0.5 right-0.5 w-1 h-[1px]" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="absolute top-0.5 right-0.5 h-1 w-[1px]" style={{ background: "rgba(255,255,255,0.06)" }} />

          {imgError ? (
            <span className="text-[12px] font-semibold font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>
              {report.brandName?.charAt(0)?.toUpperCase() || "?"}
            </span>
          ) : (
            <img
              src={`https://www.google.com/s2/favicons?domain=${report.domain}&sz=64`}
              alt=""
              width={18}
              height={18}
              className="object-contain"
              onError={() => setImgError(true)}
            />
          )}
        </div>

        {/* Info columns */}
        <div className="flex-1 min-w-0 flex items-center">
          {/* Brand + Domain */}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[12px] font-medium truncate tracking-[0.02em]" style={{ color: "rgba(255,255,255,0.72)" }}>
              {report.brandName}
            </span>
            <span
              className="text-[10px] truncate font-mono tracking-[0.04em]"
              style={{ color: "rgba(255,255,255,0.16)" }}
            >
              {report.domain}
            </span>
          </div>

          {/* Score — hidden on mobile */}
          <div className="shrink-0 hidden sm:flex items-center" style={{ width: 72 }}>
            <ScoreBadge score={score} />
          </div>

          {/* Timestamp — hidden on mobile */}
          <div
            className="shrink-0 hidden md:flex items-center gap-2 font-mono text-[10px]"
            style={{ width: 140, color: "rgba(255,255,255,0.14)" }}
          >
            <span
              className="inline-block w-0.5 h-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)" }}
            />
            {formatTime(report.timestamp)}
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1" style={{ width: 72, justifyContent: "flex-end" }}>
          <Link
            href="/reports/view"
            onClick={() => {
              try { localStorage.setItem(userKey("cf_view_report"), JSON.stringify(report)); } catch {}
            }}
            className="px-2.5 py-1 text-[10px] font-medium tracking-[0.04em] transition-all duration-200 opacity-0 group-hover:opacity-100"
            style={{
              background: "rgba(56,189,248,0.05)",
              border: "1px solid rgba(56,189,248,0.08)",
              color: "#7DD3FC",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(56,189,248,0.12)";
              e.currentTarget.style.borderColor = "rgba(56,189,248,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(56,189,248,0.05)";
              e.currentTarget.style.borderColor = "rgba(56,189,248,0.08)";
            }}
          >
            调阅
          </Link>

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDelete(report.id)}
                className="px-2 py-1 text-[10px] font-medium tracking-[0.04em] transition-all duration-200"
                style={{
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.18)",
                  color: "#EF4444",
                }}
              >
                确认
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-1.5 py-1 text-[10px] font-medium tracking-[0.04em] transition-all duration-200"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.25)",
                }}
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-2 py-1 text-[10px] font-medium tracking-[0.04em] transition-all duration-200 opacity-0 group-hover:opacity-100"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.03)",
                color: "rgba(255,255,255,0.25)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#EF4444";
                e.currentTarget.style.borderColor = "rgba(239,68,68,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.25)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.03)";
              }}
            >
              注销
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Page ─── */
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("probe");
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("cf_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    // 迁移旧版全局键 → 用户隔离键
    const newKey = userKey(REPORTS_KEY_BASE);
    if (!localStorage.getItem(newKey)) {
      const old = localStorage.getItem("cf_reports");
      if (old) {
        try { localStorage.setItem(newKey, old); } catch {}
        localStorage.removeItem("cf_reports");
      }
    }
    loadReports();
    setInitialized(true);

    const onUpdate = () => loadReports();
    window.addEventListener("cf-reports-updated", onUpdate);
    return () => window.removeEventListener("cf-reports-updated", onUpdate);
  }, []);

  function loadReports() {
    try {
      const raw = localStorage.getItem(userKey(REPORTS_KEY_BASE));
      setReports(raw ? JSON.parse(raw) : []);
    } catch {
      setReports([]);
    }
  }

  function handleDelete(id: string) {
    const next = reports.filter((r) => r.id !== id);
    setReports(next);
    localStorage.setItem(userKey(REPORTS_KEY_BASE), JSON.stringify(next));
    window.dispatchEvent(new Event("cf-reports-updated"));
  }

  const filtered = reports.filter((r) => r.type === activeTab);
  const activeCount = reports.filter((r) => r.type === activeTab).length;
  const totalCount = reports.length;

  if (!initialized) return null;

  return (
    <div className="flex min-h-screen" style={{ background: "#08080D" }}>
      {/* Measurement grid background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          opacity: 0.03,
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.12) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-[1000px] mx-auto px-8 py-8 flex flex-col gap-10">
        {/* ═══════ Top Bar ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="relative shrink-0">
              <svg viewBox="0 0 8 8" width="22" height="22" style={{ imageRendering: "pixelated" }}>
                <rect x="2" y="1" width="4" height="1" fill="#38BDF8" opacity="0.9" />
                <rect x="1" y="2" width="1" height="1" fill="#38BDF8" opacity="0.9" />
                <rect x="1" y="3" width="1" height="1" fill="#38BDF8" opacity="0.9" />
                <rect x="1" y="4" width="1" height="1" fill="#38BDF8" opacity="0.9" />
                <rect x="1" y="5" width="1" height="1" fill="#38BDF8" opacity="0.9" />
                <rect x="2" y="6" width="4" height="1" fill="#38BDF8" opacity="0.9" />
              </svg>
              <div
                className="absolute -inset-1 -z-10 blur-md"
                style={{ background: "rgba(56,189,248,0.06)" }}
              />
            </div>
            <span className="text-[14px] font-semibold tracking-tight" style={{ color: "rgba(255,255,255,0.82)" }}>
              CiteFlow
            </span>
            <span
              className="text-[9px] tracking-[0.08em] font-medium px-2 py-1"
              style={{
                background: "rgba(56,189,248,0.04)",
                border: "1px solid rgba(56,189,248,0.08)",
                color: "rgba(56,189,248,0.50)",
              }}
            >
              档案库
            </span>
          </div>

          <Link
            href="/scan"
            className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.04em] transition-all duration-300 px-3.5 py-2"
            style={{
              color: "rgba(255,255,255,0.30)",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#7DD3FC";
              e.currentTarget.style.borderColor = "rgba(56,189,248,0.18)";
              e.currentTarget.style.background = "rgba(56,189,248,0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.30)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>←</span>
            返回体检中心
          </Link>
        </motion.div>

        {/* ═══════ Page Header ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              {/* Catalog reference */}
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[9px] tracking-[0.12em] px-2 py-0.5"
                  style={{
                    color: "rgba(56,189,248,0.35)",
                    background: "rgba(56,189,248,0.04)",
                    border: "1px solid rgba(56,189,248,0.06)",
                  }}
                >
                  DOC-ARCH-001
                </span>
                <span
                  className="h-[1px] flex-1"
                  style={{ background: "linear-gradient(90deg, rgba(56,189,248,0.10), transparent)" }}
                />
              </div>
              <h1
                className="text-[22px] font-semibold tracking-[0.02em]"
                style={{ color: "rgba(255,255,255,0.88)" }}
              >
                报告档案
              </h1>
              <p className="text-[11px] tracking-[0.03em]" style={{ color: "rgba(255,255,255,0.18)" }}>
                每次品牌扫描自动归档，按报告类型分类查阅
              </p>
            </div>

            {/* Archive inventory — total count */}
            {totalCount > 0 && (
              <div className="text-right space-y-0.5">
                <span
                  className="font-mono text-[28px] font-bold leading-none tracking-tighter"
                  style={{ color: "rgba(255,255,255,0.06)" }}
                >
                  {String(totalCount).padStart(2, "0")}
                </span>
                <p className="text-[9px] font-mono tracking-[0.10em]" style={{ color: "rgba(255,255,255,0.10)" }}>
                  归档总数
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ═══════ Tab Switcher — Instrument Mode Selector ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Instrument panel */}
          <div
            className="relative inline-flex items-center gap-0.5"
            style={{
              padding: 4,
              background: "rgba(0,0,0,0.30)",
              border: "1px solid rgba(255,255,255,0.04)",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)",
            }}
          >
            {/* Panel corner marks */}
            <span className="absolute top-1 left-1 w-1.5 h-[1px]" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="absolute top-1 left-1 h-1.5 w-[1px]" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="absolute top-1 right-1 w-1.5 h-[1px]" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="absolute top-1 right-1 h-1.5 w-[1px]" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="absolute bottom-1 left-1 w-1.5 h-[1px]" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="absolute bottom-1 left-1 h-1.5 w-[1px]" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="absolute bottom-1 right-1 w-1.5 h-[1px]" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="absolute bottom-1 right-1 h-1.5 w-[1px]" style={{ background: "rgba(255,255,255,0.06)" }} />

            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = reports.filter((r) => r.type === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex items-center gap-2 px-4 py-2 transition-all duration-200"
                  style={{
                    background: isActive ? "rgba(56,189,248,0.05)" : "transparent",
                    border: isActive
                      ? "1px solid rgba(56,189,248,0.12)"
                      : "1px solid transparent",
                  }}
                >
                  {/* Top-edge glow for active */}
                  {isActive && (
                    <motion.div
                      layoutId="tab-edge-glow"
                      className="absolute top-0 left-1 right-1 h-[1px]"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.5), transparent)",
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}

                  {/* Status light */}
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: isActive ? "#38BDF8" : "rgba(255,255,255,0.06)",
                      boxShadow: isActive ? "0 0 6px rgba(56,189,248,0.6), 0 0 2px rgba(56,189,248,0.9)" : "none",
                    }}
                  />

                  <span
                    className="text-[11px] font-medium tracking-[0.03em] whitespace-nowrap"
                    style={{
                      color: isActive ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.22)",
                    }}
                  >
                    {tab.label}
                  </span>

                  {count > 0 && (
                    <span
                      className="text-[9px] font-mono font-medium px-1.5 py-0.5 min-w-[18px] text-center"
                      style={{
                        background: isActive
                          ? "rgba(56,189,248,0.10)"
                          : "rgba(255,255,255,0.02)",
                        color: isActive ? "#7DD3FC" : "rgba(255,255,255,0.18)",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ═══════ Report List Area ═══════ */}
        <div className="flex flex-col">
          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <EmptyState activeTab={activeTab} />
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {/* List container — like a drawer interior */}
                <div
                  className="relative"
                  style={{
                    background: "rgba(0,0,0,0.20)",
                    border: "1px solid rgba(255,255,255,0.03)",
                    boxShadow: "inset 0 2px 20px rgba(0,0,0,0.3)",
                  }}
                >
                  {/* List top edge — instrument panel-style */}
                  <div
                    className="flex items-center gap-4 px-4 py-2.5"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: "rgba(255,255,255,0.008)",
                    }}
                  >
                    {/* Header with measurement mark styling */}
                    <div className="flex items-center gap-4 w-full text-[9px] font-mono tracking-[0.08em] select-none" style={{ color: "rgba(255,255,255,0.10)" }}>
                      <span style={{ width: 28, textAlign: "center" }}>ID</span>
                      <span style={{ width: 32 }} />
                      <span className="flex-1">品牌 / 域名</span>
                      <span className="shrink-0 hidden sm:block" style={{ width: 72 }}>评级</span>
                      <span className="shrink-0 hidden md:block" style={{ width: 140 }}>归档时间</span>
                      <span style={{ width: 72, textAlign: "right" }}>操作</span>
                    </div>
                  </div>

                  {/* Card stack */}
                  <div className="flex flex-col">
                    {filtered.map((report, i) => (
                      <div key={report.id}>
                        <ReportCard
                          report={report}
                          onDelete={handleDelete}
                          index={i}
                        />
                        {/* Inter-card hairline */}
                        {i < filtered.length - 1 && (
                          <div style={{ height: 1, background: "rgba(255,255,255,0.015)", margin: "0 12px" }} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* List footer — status bar */}
                  <div
                    className="flex items-center justify-between px-4 py-2"
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.03)",
                      background: "rgba(255,255,255,0.005)",
                    }}
                  >
                    <span className="font-mono text-[9px] tracking-[0.06em]" style={{ color: "rgba(255,255,255,0.08)" }}>
                      共 {activeCount} 份记录
                    </span>
                    <span
                      className="inline-block w-1 h-1 rounded-full"
                      style={{
                        background: activeCount > 0 ? "#22C55E" : "rgba(255,255,255,0.10)",
                        boxShadow: activeCount > 0 ? "0 0 4px rgba(34,197,94,0.3)" : "none",
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom decorative */}
        <div
          className="w-full h-[1px]"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.05), transparent)",
          }}
        />
      </div>
    </div>
  );
}
