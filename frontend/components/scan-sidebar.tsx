"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clearUserData, type Tier, type ScanMode } from "@/lib/storage";

const STEPS = [
  {
    id: "input",
    label: "初步体检",
    sub: "输入域名",
    step: 1,
    children: [
      { id: "collect", label: "收集信息", sub: "输入品牌资料" },
      { id: "scanning", label: "扫描仓", sub: "AI多引擎扫描" },
      { id: "report", label: "报告生成", sub: "初步体检报告展示" },
    ],
  },
  { id: "home", label: "仪表盘", sub: "", href: "/scan" },
  { id: "probe", label: "Probe 侦察兵", sub: "AI引用率扫描", step: 2 },
  {
    id: "analyst",
    label: "Analyst 诊断师",
    sub: "14条规则诊断",
    step: 3,
    children: [
      { id: "briefing", label: "军师阅卷", sub: "数据读取+诊断" },
      { id: "report", label: "诊断报告", sub: "4-Tab诊断结果" },
    ],
  },
  { id: "doctor", label: "Doctor 处方", sub: "生成执行清单", step: 4 },
];

/* ─── Module icons — precision line-art, 24x24 viewBox ─── */
function StepIcon({ stepId, color }: { stepId: string; color: string }) {
  const size = 13;
  switch (stepId) {
    case "input":
      // Magnifying glass — search / inspection
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
          <circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth="1.8" opacity="0.85" />
          <line x1="15.5" y1="15.5" x2="20.5" y2="20.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.65" />
        </svg>
      );
    case "probe":
      // Crosshair / targeting — precision scanning
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
          <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" opacity="0.5" />
          <circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth="1.5" opacity="0.85" />
          <line x1="12" y1="2" x2="12" y2="7" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          <line x1="12" y1="17" x2="12" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          <line x1="2" y1="12" x2="7" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          <line x1="17" y1="12" x2="22" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          <circle cx="12" cy="12" r="1.2" fill={color} opacity="0.9" />
        </svg>
      );
    case "analyst":
      // Bar chart — data analysis
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
          <rect x="2" y="13" width="4.5" height="8" rx="1" fill={color} opacity="0.35" />
          <rect x="9.75" y="7" width="4.5" height="14" rx="1" fill={color} opacity="0.55" />
          <rect x="17.5" y="3" width="4.5" height="18" rx="1" fill={color} opacity="0.85" />
        </svg>
      );
    case "doctor":
      // Clipboard with pulse — prescription
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
          <rect x="5" y="4" width="14" height="18" rx="2" stroke={color} strokeWidth="1.6" opacity="0.85" />
          <rect x="9" y="2" width="6" height="4" rx="1" stroke={color} strokeWidth="1.6" opacity="0.7" />
          <line x1="9" y1="10" x2="17" y2="10" stroke={color} strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
          <line x1="9" y1="13.5" x2="15" y2="13.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
          <line x1="9" y1="17" x2="13" y2="17" stroke={color} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
        </svg>
      );
    case "loop":
      // Refresh / closed loop
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
          <path d="M17.5 3.5A9 9 0 0 0 5.8 7.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
          <path d="M6.5 20.5A9 9 0 0 0 18.2 16.8" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
          <polyline points="14.8,3.5 17.5,0.8 20.2,3.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.85" />
          <polyline points="9.2,20.5 6.5,23.2 3.8,20.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.55" />
        </svg>
      );
    default:
      return null;
  }
}

type StepStatus = "completed" | "current" | "available" | "locked";

interface ScanSidebarProps {
  currentStep: string;
  inputPhase?: string;
  analystPhase?: string;
  isScanning: boolean;
  tier: Tier;
  scanMode: ScanMode;
  hasData: boolean;
  hasAnalystData: boolean;
  hasDoctorData: boolean;
  scanCredits: number;
  probeCredits: number;
  domain?: string;
  brandName?: string;
  onInputClick: () => void;
  onHomeClick: () => void;
  onProbeClick: () => void;
  onAnalystClick: () => void;
  onDoctorClick: () => void;
  onUpgradeClick: (feature?: string) => void;
}

export function ScanSidebar({
  currentStep,
  inputPhase,
  analystPhase,
  isScanning,
  tier,
  scanMode,
  hasData,
  hasAnalystData,
  hasDoctorData,
  scanCredits,
  probeCredits,
  domain = "",
  brandName = "",
  onInputClick,
  onHomeClick,
  onProbeClick,
  onAnalystClick,
  onDoctorClick,
  onUpgradeClick,
}: ScanSidebarProps) {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [imgError, setImgError] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [hintMsg, setHintMsg] = useState("");

  // Auto-dismiss hint
  useEffect(() => {
    if (!hintMsg) return;
    const t = setTimeout(() => setHintMsg(""), 2500);
    return () => clearTimeout(t);
  }, [hintMsg]);

  // Auto-expand/collapse children based on current step
  useEffect(() => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      let changed = false;

      for (const stepId of ["input", "analyst"]) {
        const shouldExpand = currentStep === stepId;
        if (shouldExpand && !prev.has(stepId)) {
          next.add(stepId);
          changed = true;
        }
        if (!shouldExpand && prev.has(stepId)) {
          next.delete(stepId);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [currentStep]);

  useEffect(() => {
    setImgError(false);
  }, [domain]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cf_user");
      if (raw) {
        const user = JSON.parse(raw);
        setEmail(user.email || "");
      }
    } catch {}
  }, []);

  function handleLogout() {
    clearUserData();
    window.location.href = "/";
  }

  function getButtonStatus(stepId: string): StepStatus {
    if (stepId === "input") {
      return currentStep === "input" ? "current" : "completed";
    }

    const hasFullAccess = scanCredits > 0 || probeCredits > 0 || tier !== "free";

    if (stepId === "probe") {
      if (!hasFullAccess) return "locked";
      if (currentStep === "probe") return "current";
      if (hasData && scanMode === "full") return "completed";
      return "available";
    }

    if (stepId === "analyst") {
      if (scanCredits === 0) return "locked";
      if (currentStep === "analyst") return "current";
      if (hasAnalystData) return "completed";
      return "available";
    }

    if (stepId === "doctor") {
      if (scanCredits === 0) return "locked";
      if (currentStep === "doctor") return "current";
      if (hasDoctorData) return "completed";
      return "available";
    }

    return "locked";
  }

  function handleButtonClick(stepId: string) {
    // Scanning in progress → block all navigation
    if (isScanning) {
      setHintMsg("扫描进行中，请勿操作");
      return;
    }

    if (stepId === "input") { onInputClick(); return; }

    // No data yet → block probe/analyst/doctor
    if (!hasData && (stepId === "probe" || stepId === "analyst" || stepId === "doctor")) {
      setHintMsg("请先完成初步体检");
      return;
    }

    if (stepId === "probe") {
      if (scanCredits === 0 && probeCredits === 0) { onUpgradeClick("probe"); return; }
      onProbeClick(); return;
    }
    if (stepId === "analyst") {
      if (scanCredits === 0) { onUpgradeClick("analyst"); return; }
      onAnalystClick(); return;
    }
    if (stepId === "doctor") {
      if (scanCredits === 0) { onUpgradeClick("doctor"); return; }
      onDoctorClick(); return;
    }
  }

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col overflow-hidden select-none"
      style={{
        width: 160,
        background: "#06060C",
        borderRight: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* ─── Measurement grid background ─── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* ─── Corner alignment marks ─── */}
      <div className="absolute top-2 left-2 w-2 h-2 border-l border-t pointer-events-none" style={{ borderColor: "rgba(56,189,248,0.12)" }} />
      <div className="absolute bottom-2 left-2 w-2 h-2 border-l border-b pointer-events-none" style={{ borderColor: "rgba(56,189,248,0.12)" }} />

      {/* ═══════ Logo Section ═══════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="relative px-4 h-14 flex items-center"
      >
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative shrink-0">
            <svg viewBox="0 0 8 8" width="18" height="18" style={{ imageRendering: "pixelated" }}>
              <rect x="2" y="1" width="4" height="1" fill="#38BDF8" opacity="0.9" />
              <rect x="1" y="2" width="1" height="1" fill="#38BDF8" opacity="0.9" />
              <rect x="1" y="3" width="1" height="1" fill="#38BDF8" opacity="0.9" />
              <rect x="1" y="4" width="1" height="1" fill="#38BDF8" opacity="0.9" />
              <rect x="1" y="5" width="1" height="1" fill="#38BDF8" opacity="0.9" />
              <rect x="2" y="6" width="4" height="1" fill="#38BDF8" opacity="0.9" />
            </svg>
            <div
              className="absolute inset-0 -z-10 blur-md rounded-full"
              style={{ background: "rgba(56,189,248,0.08)" }}
            />
          </div>

          <div className="flex flex-col gap-px">
            <span className="text-[13px] font-semibold tracking-tight text-[#D4D4E0] group-hover:text-white transition-colors duration-300">
              CiteFlow
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] tracking-[0.06em] text-[#6A6A88] font-medium">
                体检中心
              </span>
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  background: "#38BDF8",
                  boxShadow: "0 0 4px rgba(56,189,248,0.6)",
                  animation: "sensorPulse 2s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Divider */}
      <div className="hairline-accent" />

      {/* ═══════ Pipeline Steps ═══════ */}
      <nav className="flex flex-col gap-1 px-2 py-3 overflow-y-auto transition-all duration-300"
        style={{
          scrollbarWidth: "none",
          opacity: isScanning ? 0.3 : 1,
          pointerEvents: isScanning ? "none" : "auto",
        }}
      >
        {STEPS.map((step, i) => {
          // Link item (e.g. 首页)
          if ("href" in step && step.href) {
            const isAlreadyHere = pathname === step.href;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.06, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* ── 上层分隔 + 标签 ── */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.10)" }} />
                  <span className="text-[8px] font-mono tracking-[0.12em] uppercase" style={{ color: "#5E5E78" }}>主面板</span>
                  <div className="w-6 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>

                {/* ── 仪表盘按钮（突出样式） ── */}
                {isAlreadyHere && onHomeClick ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (isScanning) { setHintMsg("扫描进行中，请勿操作"); return; }
                      onHomeClick();
                    }}
                    className="w-full text-left rounded-xl transition-all duration-300"
                    style={{
                      background: "rgba(59,130,246,0.08)",
                      border: "1px solid rgba(59,130,246,0.18)",
                      boxShadow: "0 0 20px rgba(59,130,246,0.06)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(59,130,246,0.14)";
                      e.currentTarget.style.borderColor = "rgba(59,130,246,0.30)";
                      e.currentTarget.style.boxShadow = "0 0 28px rgba(59,130,246,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(59,130,246,0.08)";
                      e.currentTarget.style.borderColor = "rgba(59,130,246,0.18)";
                      e.currentTarget.style.boxShadow = "0 0 20px rgba(59,130,246,0.06)";
                    }}
                  >
                    <div className="flex items-center gap-3 px-3 py-3">
                      {/* 仪表盘图标 */}
                      <div className="shrink-0 relative" style={{ width: 26, height: 26 }}>
                        <svg viewBox="0 0 24 24" width={26} height={26} fill="none">
                          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#60A5FA" strokeWidth="1.5" opacity="0.9" />
                          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#60A5FA" strokeWidth="1.5" opacity="0.9" />
                          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#60A5FA" strokeWidth="1.5" opacity="0.6" />
                          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#60A5FA" strokeWidth="1.5" opacity="0.6" />
                        </svg>
                        <div className="absolute inset-0 -z-10 blur-lg rounded-full" style={{ background: "rgba(59,130,246,0.10)" }} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[12px] font-semibold truncate tracking-[0.02em]" style={{ color: "#EDEDEF" }}>
                          仪表盘
                        </span>
                      </div>
                      {/* 活跃指示 */}
                      <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#60A5FA", boxShadow: "0 0 6px rgba(96,165,250,0.6)" }} />
                    </div>
                  </button>
                ) : (
                  <Link
                    href={step.href}
                    className="w-full text-left rounded-xl transition-all duration-300 block"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(59,130,246,0.08)";
                      e.currentTarget.style.borderColor = "rgba(59,130,246,0.18)";
                      e.currentTarget.style.boxShadow = "0 0 20px rgba(59,130,246,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div className="flex items-center gap-3 px-3 py-3">
                      {/* 仪表盘图标 */}
                      <div className="shrink-0 relative" style={{ width: 26, height: 26 }}>
                        <svg viewBox="0 0 24 24" width={26} height={26} fill="none">
                          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#6A6A82" strokeWidth="1.5" opacity="0.7" />
                          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#6A6A82" strokeWidth="1.5" opacity="0.7" />
                          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#6A6A82" strokeWidth="1.5" opacity="0.4" />
                          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#6A6A82" strokeWidth="1.5" opacity="0.4" />
                        </svg>
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[12px] font-semibold truncate tracking-[0.02em]" style={{ color: "#E8E8F0" }}>
                          仪表盘
                        </span>
                      </div>
                    </div>
                  </Link>
                )}
              </motion.div>
            );
          }

          const status = getButtonStatus(step.id);
          const isClickable = status === "completed" || status === "current" || status === "available";
          const hasChildren = "children" in step && step.children && step.children.length > 0;
          const isParentActive = status === "current" || status === "completed" || status === "available";
          const isExpanded = expandedParents.has(step.id);

          return (
            <div key={step.id}>
              {/* ─── Parent step ─── */}
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.15 + i * 0.06,
                  ease: [0.4, 0, 0.2, 1],
                }}
                onClick={() => handleButtonClick(step.id)}
                className="relative flex items-center gap-2 px-2 py-[7px] rounded-sm transition-colors duration-150 group"
                style={{
                  background: (status === "current" || status === "available") && !isExpanded ? "rgba(56,189,248,0.04)" : "transparent",
                  cursor: isClickable ? "pointer" : "default",
                }}
                onMouseEnter={(e) => {
                  if (isClickable)
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    status === "current" && !hasChildren ? "rgba(56,189,248,0.04)" : "transparent";
                }}
              >
                {/* Active indicator bar (only for non-parent or when no active child) */}
                {status === "current" && !hasChildren && (
                  <motion.div
                    layoutId="active-step-bar"
                    className="absolute left-0 top-[4px] bottom-[4px] w-[2px] rounded-full"
                    style={{
                      background: "#38BDF8",
                      boxShadow: "0 0 6px rgba(56,189,248,0.4), 0 0 2px rgba(56,189,248,0.6)",
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}

                {/* Step gauge */}
                <div
                  className="relative flex items-center justify-center shrink-0"
                  style={{ width: 22, height: 22 }}
                >
                  {/* Pulsing glow ring for probe when available (paid but unused) */}
                  {step.id === "probe" && status === "available" && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: "1px solid rgba(56,189,248,0.45)",
                        boxShadow: "0 0 12px rgba(56,189,248,0.2)",
                      }}
                      animate={{
                        boxShadow: [
                          "0 0 8px rgba(56,189,248,0.15)",
                          "0 0 18px rgba(56,189,248,0.35)",
                          "0 0 8px rgba(56,189,248,0.15)",
                        ],
                        borderColor: [
                          "rgba(56,189,248,0.35)",
                          "rgba(56,189,248,0.55)",
                          "rgba(56,189,248,0.35)",
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      border:
                        status === "completed" && step.id === "input"
                          ? "1px solid rgba(34,197,94,0.35)"
                          : status === "current"
                            ? "1px solid rgba(56,189,248,0.45)"
                            : status === "available" || (status === "completed" && step.id !== "input")
                              ? "1px solid rgba(56,189,248,0.25)"
                              : "1px solid rgba(255,255,255,0.10)",
                    }}
                  />
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 14,
                      height: 14,
                      background:
                        status === "completed" && step.id === "input"
                          ? "rgba(34,197,94,0.18)"
                          : status === "current"
                            ? "rgba(56,189,248,0.18)"
                            : status === "available" || (status === "completed" && step.id !== "input")
                              ? "rgba(56,189,248,0.06)"
                              : "transparent",
                      boxShadow:
                        status === "current"
                          ? "inset 0 0 4px rgba(56,189,248,0.15)"
                          : "none",
                    }}
                  >
                    {status === "completed" && step.id === "input" ? (
                      <span className="font-mono text-[10px] font-semibold leading-none" style={{ color: "#22C55E" }}>✓</span>
                    ) : (
                      <StepIcon
                        stepId={step.id}
                        color={status === "current" || status === "available" || (status === "completed" && step.id !== "input") ? "#7DD3FC" : "#4A4A5C"}
                      />
                    )}
                  </div>
                </div>

                {/* Label + Sub */}
                <div className="flex flex-col min-w-0">
                  <span
                    className="text-[11px] font-medium truncate tracking-[0.02em] flex items-center gap-1.5"
                    style={{
                      color:
                        status === "completed" ? "#A8A8B8" :
                        status === "current" || status === "available" ? "#E8E8F0" :
                        "#48485C",
                    }}
                  >
                    {step.label}
                    {step.id === "probe" && status === "available" && (
                      <motion.span
                        className="shrink-0 inline-block w-1.5 h-1.5 rounded-full"
                        style={{
                          background: "#38BDF8",
                          boxShadow: "0 0 6px rgba(56,189,248,0.6)",
                        }}
                        animate={{
                          opacity: [0.4, 1, 0.4],
                          scale: [0.8, 1.2, 0.8],
                        }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </span>
                  <span
                    className="text-[9px] truncate font-mono tracking-[0.03em]"
                    style={{
                      color:
                        status === "current" || status === "available"
                          ? "rgba(56,189,248,0.65)"
                          : "rgba(255,255,255,0.18)",
                    }}
                  >
                    {step.sub}
                  </span>
                </div>

                {/* Chevron toggle for parent steps with children */}
                {hasChildren && isParentActive && (
                  <motion.span
                    className="ml-auto shrink-0 font-mono text-[10px] px-1 py-1 -mr-1"
                    style={{ color: "rgba(56,189,248,0.5)" }}
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedParents((prev) => {
                        const next = new Set(prev);
                        if (next.has(step.id)) next.delete(step.id);
                        else next.add(step.id);
                        return next;
                      });
                    }}
                  >
                    ›
                  </motion.span>
                )}

                {/* Hover highlight edge */}
                {isClickable && (
                  <div
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-[2px] h-0 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 group-hover:h-3"
                    style={{ background: "rgba(56,189,248,0.2)" }}
                  />
                )}
              </motion.div>

              {/* ─── Children ─── */}
              <AnimatePresence>
                {hasChildren && isParentActive && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="ml-7 border-l overflow-hidden"
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}
                  >
                    {step.children!.map((child, ci) => {
                      const ip = inputPhase || "form";
                      const ap = analystPhase || "briefing";
                      const childActive = (child.id === "collect" && currentStep === "input" && ip === "form")
                        || (child.id === "scanning" && currentStep === "input" && ip === "scanning")
                        || (child.id === "report" && currentStep === "input" && ip === "report")
                        || (child.id === "briefing" && currentStep === "analyst" && ap === "briefing")
                        || (child.id === "report" && currentStep === "analyst" && ap === "report");
                      const childDone = (child.id === "collect" && currentStep === "input" && ip !== "form")
                        || (child.id === "scanning" && currentStep === "input" && ip === "report")
                        || (child.id === "report" && currentStep === "input" && currentStep !== "input" && hasData)
                        || (child.id === "briefing" && currentStep === "analyst" && ap === "report")
                        || (child.id === "report" && ((currentStep === "analyst" && ap === "report") || (currentStep !== "analyst" && hasAnalystData)));
                      return (
                        <motion.div
                          key={child.id}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: ci * 0.04 }}
                          className="relative flex items-center gap-2 pl-3 py-[5px]"
                        >
                          {/* Active bar for child */}
                          {childActive && (
                            <motion.div
                              layoutId="active-substep-bar"
                              className="absolute left-0 top-[4px] bottom-[4px] w-[2px] rounded-full"
                              style={{
                                background: "#38BDF8",
                                boxShadow: "0 0 6px rgba(56,189,248,0.4), 0 0 2px rgba(56,189,248,0.6)",
                              }}
                              transition={{ type: "spring", stiffness: 500, damping: 35 }}
                            />
                          )}

                          {/* Mini dot */}
                          <span
                            className="shrink-0 rounded-full"
                            style={{
                              width: 5,
                              height: 5,
                              background: childDone
                                ? "#22C55E"
                                : childActive
                                  ? "#38BDF8"
                                  : "#48485C",
                              boxShadow: childActive
                                ? "0 0 4px rgba(56,189,248,0.5)"
                                : childDone
                                  ? "0 0 4px rgba(34,197,94,0.5)"
                                  : "none",
                            }}
                          />

                          {/* Child label */}
                          <div className="flex flex-col min-w-0">
                            <span
                              className="text-[10px] font-medium truncate tracking-[0.02em]"
                              style={{
                                color: childDone
                                  ? "#9090A8"
                                  : childActive
                                    ? "#D4D4E0"
                                    : "#585870",
                              }}
                            >
                              {child.label}
                            </span>
                            <span
                              className="text-[8px] truncate font-mono tracking-[0.03em]"
                              style={{
                                color: childActive
                                  ? "rgba(56,189,248,0.55)"
                                  : "rgba(255,255,255,0.14)",
                              }}
                            >
                              {child.sub}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* ═══════ Report History Link ═══════ */}
      <div>
        <div className="hairline-accent" />
        <div className="px-2 py-2">
          <Link
            href="/reports"
            className="flex items-center gap-1.5 px-1 py-1 rounded-sm transition-colors duration-200 group"
            style={{ background: "rgba(56,189,248,0)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(56,189,248,0)"; }}
          >
            <span
              className="inline-block w-1 h-1 rounded-full shrink-0"
              style={{
                background: "#38BDF8",
                boxShadow: "0 0 6px rgba(56,189,248,0.5), 0 0 2px rgba(56,189,248,0.8)",
              }}
            />
            <span className="text-[10px] font-medium tracking-[0.04em] text-[#6A6A88] group-hover:text-[#7DD3FC] transition-colors duration-300">
              报告历史
            </span>
          </Link>
        </div>
      </div>

      {/* ═══════ Brand Section ═══════ */}
      {domain && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="hairline-accent" />
          <div className="px-3 py-3">
            <div className="flex items-center gap-2.5">
              {/* Brand logo */}
              <div
                className="shrink-0 rounded-sm flex items-center justify-center overflow-hidden"
                style={{
                  width: 28,
                  height: 28,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {imgError ? (
                  <span className="text-[11px] font-semibold text-[#5E5E78] font-mono">
                    {brandName?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                ) : (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                    alt=""
                    width={18}
                    height={18}
                    className="object-contain"
                    onError={() => setImgError(true)}
                  />
                )}
              </div>

              {/* Brand name + status */}
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-medium truncate text-[#C8C8D8]">
                  {brandName}
                </span>
                <span className="text-[9px] tracking-[0.03em] truncate" style={{ color: "rgba(56,189,248,0.6)" }}>
                  精密仪器检测中
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Spacer — pushes user section to bottom */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="hairline-accent" />

      {/* ═══════ User Section ═══════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="px-3 py-3"
      >
        {email && (
          <p
            className="text-[9px] text-[#5A5A78] truncate mb-1.5 font-mono tracking-[0.03em]"
            title={email}
          >
            {email}
          </p>
        )}
        <button
          onClick={handleLogout}
          className="text-[10px] tracking-[0.04em] text-[#5A5A78] hover:text-[#EF4444] transition-colors duration-300"
        >
          退出登录
        </button>
      </motion.div>

      {/* ─── Bottom scanline decoration ─── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px] pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.08), transparent)",
        }}
      />

      {/* ─── Hint toast (centered on page) ─── */}
      <AnimatePresence>
        {hintMsg && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="fixed z-50 px-5 py-3 text-center rounded-sm"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.25)",
              color: "#F59E0B",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {hintMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
