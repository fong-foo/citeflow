"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { motion } from "framer-motion";

function isValidDomain(v: string): boolean {
  const trimmed = v.trim();
  if (trimmed.length < 4) return false;
  if (trimmed.includes(" ")) return false;
  if (!trimmed.includes(".")) return false;
  const parts = trimmed.split(".");
  if (parts.length < 2) return false;
  if (parts[parts.length - 1].length < 2) return false;
  if (parts[parts.length - 2].length < 1) return false;
  return true;
}

interface Props {
  onSubmit: (domain: string, brandName: string, industry: string, targetMarket: string) => void;
  isLoading: boolean;
  onSwitchToChat?: () => void;
}

/* ─── Shared input styles ─────────────────────────────── */

const fieldBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)",
  color: "#EDEDF5",
  fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
  fontSize: 14,
  height: 46,
  paddingLeft: 14,
  paddingRight: 14,
  borderRadius: 2,
  outline: "none",
  width: "100%",
  transition: "border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease",
  boxSizing: "border-box" as const,
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), monospace",
  fontSize: 10,
  letterSpacing: "0.06em",
  color: "#5E5E78",
  textTransform: "uppercase" as const,
  marginBottom: 6,
  display: "flex",
  alignItems: "center",
  gap: 6,
};

/* ─── Component ───────────────────────────────────────── */

export function ScanInput({ onSubmit, isLoading, onSwitchToChat }: Props) {
  const [domain, setDomain] = useState("");
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [domainError, setDomainError] = useState("");
  const [touched, setTouched] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const domainRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    domainRef.current?.focus();
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!domain.trim()) {
      setDomainError("请输入域名");
      return;
    }
    if (!isValidDomain(domain)) {
      setDomainError("域名格式不正确，例如 yourbrand.com");
      return;
    }
    setDomainError("");
    onSubmit(domain.trim(), brandName.trim(), industry.trim(), targetMarket.trim());
  }

  const showDomainError = touched && domainError;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-[500px]"
    >
      {/* ═══════ Header ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="text-center mb-12"
      >
        {/* Terminal badge */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: "#22C55E",
              boxShadow: "0 0 6px rgba(34,197,94,0.5)",
              animation: "sensorPulse 2s ease-in-out infinite",
            }}
          />
          <span
            className="tracking-[0.12em] font-mono text-[10px]"
            style={{ color: "rgba(56,189,248,0.5)" }}
          >
            诊断终端 v1.0
          </span>
        </div>

        <h1
          className="text-[26px] font-semibold tracking-[-0.02em] leading-tight mb-3"
          style={{ color: "#EDEDF5" }}
        >
          你的品牌在 AI 眼中
          <br />
          是什么样子？
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "#6E6E88" }}>
          输入官网，免费查看 AI 对品牌的真实评价
        </p>
      </motion.div>

      {/* ═══════ Diagnostic Panel ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative"
      >
        {/* ─── Corner brackets ─── */}
        <CornerBrackets />

        {/* ─── Ambient scanline ─── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-sm">
          <div
            className="absolute left-0 right-0 h-[1px]"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.06), transparent)",
              animation: "scanSweepVertical 4s ease-in-out infinite",
            }}
          />
        </div>

        {/* ─── Panel body ─── */}
        <div
          className="px-8 py-8 rounded-sm"
          style={{
            background: "rgba(255,255,255,0.012)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ── Domain (required) ── */}
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <label style={labelStyle}>
                <StatusDot active={focusedField === "domain"} error={!!showDomainError} />
                官网域名
                <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span>
              </label>
              <div className="relative">
                <input
                  ref={domainRef}
                  type="text"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value);
                    if (domainError) setDomainError("");
                  }}
                  onFocus={() => setFocusedField("domain")}
                  onBlur={() => {
                    setTouched(true);
                    setFocusedField(null);
                  }}
                  placeholder="yourbrand.com"
                  style={{
                    ...fieldBase,
                    borderColor: showDomainError
                      ? "rgba(239,68,68,0.35)"
                      : focusedField === "domain"
                        ? "rgba(56,189,248,0.30)"
                        : "rgba(255,255,255,0.06)",
                    boxShadow: focusedField === "domain"
                      ? "0 0 0 3px rgba(56,189,248,0.04)"
                      : "none",
                  }}
                />
                {/* Input measurement tick */}
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2"
                  style={{
                    width: 1,
                    height: 8,
                    background: focusedField === "domain"
                      ? "rgba(56,189,248,0.3)"
                      : "rgba(255,255,255,0.04)",
                    transition: "background 0.3s ease",
                  }}
                />
              </div>
              {showDomainError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 font-mono text-[10px]"
                  style={{ color: "#EF4444" }}
                >
                  {domainError}
                </motion.p>
              )}
            </fieldset>

            {/* ── Brand Name ── */}
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <label style={labelStyle}>
                <StatusDot active={focusedField === "brandName"} />
                品牌名称
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  onFocus={() => setFocusedField("brandName")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Your Brand"
                  style={{
                    ...fieldBase,
                    borderColor: focusedField === "brandName"
                      ? "rgba(56,189,248,0.30)"
                      : "rgba(255,255,255,0.06)",
                    boxShadow: focusedField === "brandName"
                      ? "0 0 0 3px rgba(56,189,248,0.04)"
                      : "none",
                  }}
                />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2"
                  style={{
                    width: 1,
                    height: 8,
                    background: focusedField === "brandName"
                      ? "rgba(56,189,248,0.3)"
                      : "rgba(255,255,255,0.04)",
                    transition: "background 0.3s ease",
                  }}
                />
              </div>
            </fieldset>

            {/* ── Industry + Target Market ── */}
            <div className="grid grid-cols-2 gap-4">
              <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                <label style={labelStyle}>
                  <StatusDot active={focusedField === "industry"} />
                  行业
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    onFocus={() => setFocusedField("industry")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="例如：美妆"
                    style={{
                      ...fieldBase,
                      borderColor: focusedField === "industry"
                        ? "rgba(56,189,248,0.30)"
                        : "rgba(255,255,255,0.06)",
                      boxShadow: focusedField === "industry"
                        ? "0 0 0 3px rgba(56,189,248,0.04)"
                        : "none",
                    }}
                  />
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2"
                    style={{
                      width: 1,
                      height: 8,
                      background: focusedField === "industry"
                        ? "rgba(56,189,248,0.3)"
                        : "rgba(255,255,255,0.04)",
                      transition: "background 0.3s ease",
                    }}
                  />
                </div>
              </fieldset>

              <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                <label style={labelStyle}>
                  <StatusDot active={focusedField === "targetMarket"} />
                  目标市场
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={targetMarket}
                    onChange={(e) => setTargetMarket(e.target.value)}
                    onFocus={() => setFocusedField("targetMarket")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="例如：北美"
                    style={{
                      ...fieldBase,
                      borderColor: focusedField === "targetMarket"
                        ? "rgba(56,189,248,0.30)"
                        : "rgba(255,255,255,0.06)",
                      boxShadow: focusedField === "targetMarket"
                        ? "0 0 0 3px rgba(56,189,248,0.04)"
                        : "none",
                    }}
                  />
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2"
                    style={{
                      width: 1,
                      height: 8,
                      background: focusedField === "targetMarket"
                        ? "rgba(56,189,248,0.3)"
                        : "rgba(255,255,255,0.04)",
                      transition: "background 0.3s ease",
                    }}
                  />
                </div>
              </fieldset>
            </div>

            {/* ── Submit ── */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !domain.trim()}
                className="w-full h-[50px] text-sm font-semibold tracking-[0.06em] rounded-sm transition-all duration-500 relative overflow-hidden font-mono"
                style={{
                  background: domain.trim() && !isLoading
                    ? "linear-gradient(180deg, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0.10) 100%)"
                    : "rgba(255,255,255,0.02)",
                  border: domain.trim() && !isLoading
                    ? "1px solid rgba(56,189,248,0.25)"
                    : "1px solid rgba(255,255,255,0.05)",
                  color: domain.trim() && !isLoading ? "#7DD3FC" : "#3E3E52",
                  cursor: domain.trim() && !isLoading ? "pointer" : "not-allowed",
                  opacity: isLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (domain.trim() && !isLoading) {
                    e.currentTarget.style.background = "linear-gradient(180deg, rgba(56,189,248,0.26) 0%, rgba(56,189,248,0.16) 100%)";
                    e.currentTarget.style.borderColor = "rgba(56,189,248,0.40)";
                    e.currentTarget.style.boxShadow = "0 0 24px rgba(56,189,248,0.10)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (domain.trim() && !isLoading) {
                    e.currentTarget.style.background = "linear-gradient(180deg, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0.10) 100%)";
                    e.currentTarget.style.borderColor = "rgba(56,189,248,0.25)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {/* Button scanline */}
                {domain.trim() && !isLoading && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(180deg, transparent 0%, rgba(56,189,248,0.06) 50%, transparent 100%)",
                      animation: "scanSweepVertical 2.5s ease-in-out infinite",
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <span className="inline-flex gap-0.5">
                        <span className="inline-block w-1 h-1 rounded-full animate-pulse" style={{ background: "#7DD3FC" }} />
                        <span className="inline-block w-1 h-1 rounded-full animate-pulse" style={{ background: "#7DD3FC", animationDelay: "0.2s" }} />
                        <span className="inline-block w-1 h-1 rounded-full animate-pulse" style={{ background: "#7DD3FC", animationDelay: "0.4s" }} />
                      </span>
                      检测中...
                    </>
                  ) : (
                    <>
                      <ScanIcon />
                      开始免费体检
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* ═══════ Footer Info ═══════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="mt-5 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <FooterStat label="AI引用率" />
          <span style={{ color: "rgba(255,255,255,0.08)" }}>·</span>
          <FooterStat label="推荐率" />
          <span style={{ color: "rgba(255,255,255,0.08)" }}>·</span>
          <FooterStat label="竞品对比" />
        </div>
        <p className="text-[10px] font-mono tracking-[0.04em]" style={{ color: "rgba(255,255,255,0.18)" }}>
          约 2-3 分钟 · 完全免费
        </p>

        {/* Switch mode */}
        {onSwitchToChat && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-[1px]" style={{ background: "rgba(255,255,255,0.04)" }} />
              <span className="text-[10px] font-mono tracking-[0.06em]" style={{ color: "rgba(255,255,255,0.15)" }}>OR</span>
              <div className="flex-1 h-[1px]" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>
            <button
              type="button"
              onClick={onSwitchToChat}
              className="text-[11px] font-mono tracking-[0.04em] transition-colors duration-300"
              style={{ color: "#3E3E52", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#5E5E78"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#3E3E52"; }}
            >
              切换到对话模式
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Sub-components ──────────────────────────────────── */

function StatusDot({ active, error }: { active?: boolean; error?: boolean }) {
  return (
    <span
      className="inline-block w-[5px] h-[5px] rounded-full shrink-0 transition-all duration-300"
      style={{
        background: error
          ? "#EF4444"
          : active
            ? "#38BDF8"
            : "#2E2E40",
        boxShadow: error
          ? "0 0 4px rgba(239,68,68,0.5)"
          : active
            ? "0 0 6px rgba(56,189,248,0.5)"
            : "none",
      }}
    />
  );
}

function CornerBrackets() {
  const bracketStyle: React.CSSProperties = {
    position: "absolute",
    width: 12,
    height: 12,
    pointerEvents: "none",
    zIndex: 2,
  };

  return (
    <>
      {/* TL */}
      <div style={{ ...bracketStyle, top: -1, left: -1 }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 12, height: 1, background: "rgba(56,189,248,0.15)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 1, height: 12, background: "rgba(56,189,248,0.15)" }} />
      </div>
      {/* TR */}
      <div style={{ ...bracketStyle, top: -1, right: -1 }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 12, height: 1, background: "rgba(56,189,248,0.15)" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 1, height: 12, background: "rgba(56,189,248,0.15)" }} />
      </div>
      {/* BL */}
      <div style={{ ...bracketStyle, bottom: -1, left: -1 }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 12, height: 1, background: "rgba(56,189,248,0.15)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 1, height: 12, background: "rgba(56,189,248,0.15)" }} />
      </div>
      {/* BR */}
      <div style={{ ...bracketStyle, bottom: -1, right: -1 }}>
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 1, background: "rgba(56,189,248,0.15)" }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 1, height: 12, background: "rgba(56,189,248,0.15)" }} />
      </div>
    </>
  );
}

function FooterStat({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-mono tracking-[0.04em]" style={{ color: "rgba(255,255,255,0.20)" }}>
      {label}
    </span>
  );
}

function ScanIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1" />
      <line x1="7.5" y1="1.5" x2="7.5" y2="4" stroke="currentColor" strokeWidth="1" />
      <line x1="7.5" y1="11" x2="7.5" y2="13.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
