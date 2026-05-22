"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, X, RefreshCw, Globe, Zap, Target, FileText, Eye, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────

export interface ProbeFullInput {
  domain: string;
  brand_name: string;
  industry: string;
  target_market: string;
  core_product: string;
  target_positioning: string;
  seed_queries: string[];
  competitors: string[];
  mode: "full";
}

interface CompetitorMention {
  brand: string;
  mention_count: number;
}

interface Props {
  domain: string;
  brandName: string;
  industry: string;
  targetMarket: string;
  coreProduct: string;
  competitorMentions: CompetitorMention[];
  onSubmit: (data: ProbeFullInput) => void;
  onCancel: () => void;
}

// ─── Helpers ──────────────────────────────────────────────

function dedupeQueries(queries: { query: string; category: string }[]): { query: string; category: string }[] {
  const seen = new Set<string>();
  return queries.filter((q) => {
    const key = q.query.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  industry: "A类 · 行业通用",
  brand: "B类 · 品牌直接",
  competitor: "C类 · 竞品场景",
};

const CATEGORY_COLORS: Record<string, { dot: string; bg: string; border: string }> = {
  industry: { dot: "#38BDF8", bg: "rgba(56,189,248,0.06)", border: "rgba(56,189,248,0.12)" },
  brand: { dot: "#22C55E", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.12)" },
  competitor: { dot: "#F59E0B", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.12)" },
};

// ─── Step Definitions ────────────────────────────────────

const STEPS = [
  { id: 1, label: "品牌信息", icon: Globe },
  { id: 2, label: "业务画像", icon: Target },
  { id: 3, label: "竞品配置", icon: Zap },
  { id: 4, label: "查询词", icon: FileText },
  { id: 5, label: "确认发射", icon: Eye },
];

// ─── Sub-components ──────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const isDone = i < current - 1;
        const isCurrent = i === current - 1;
        const isFuture = i > current - 1;

        return (
          <div key={step.id} className="flex items-center gap-2">
            {/* Circle */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold transition-all duration-500 shrink-0"
                style={{
                  background: isDone
                    ? "linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.08) 100%)"
                    : isCurrent
                      ? "linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(56,189,248,0.08) 100%)"
                      : "rgba(255,255,255,0.02)",
                  border: isDone
                    ? "1px solid rgba(34,197,94,0.3)"
                    : isCurrent
                      ? "1px solid rgba(56,189,248,0.35)"
                      : "1px solid rgba(255,255,255,0.06)",
                  color: isDone ? "#22C55E" : isCurrent ? "#7DD3FC" : "rgba(255,255,255,0.15)",
                  boxShadow: isCurrent ? "0 0 12px rgba(56,189,248,0.15)" : "none",
                }}
              >
                {isDone ? "✓" : step.id}
              </div>
              <span
                className="text-[10px] font-mono tracking-[0.06em] uppercase hidden sm:inline"
                style={{
                  color: isCurrent ? "#7DD3FC" : isDone ? "#9090A8" : "rgba(255,255,255,0.12)",
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className="w-6 sm:w-8 h-px shrink-0" style={{
                background: isDone
                  ? "linear-gradient(90deg, rgba(34,197,94,0.35), rgba(34,197,94,0.08))"
                  : "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span
        className="block w-1 h-3 rounded-full shrink-0"
        style={{ background: "linear-gradient(180deg, #38BDF8 0%, rgba(56,189,248,0.15) 100%)" }}
      />
      <span className="text-[10px] font-mono tracking-[0.15em] uppercase" style={{ color: "rgba(56,189,248,0.5)" }}>
        {children}
      </span>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  readOnly,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  readOnly?: boolean;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium tracking-wide" style={{ color: "#9A9AB0" }}>
        {label}
        {required && <span style={{ color: "rgba(56,189,248,0.5)" }}> *</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="px-3.5 py-2.5 text-sm outline-none transition-all duration-300 font-mono"
        style={{
          background: readOnly ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)",
          border: readOnly ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(255,255,255,0.08)",
          color: readOnly ? "#5E5E78" : "#C8C8D8",
        }}
        onFocus={(e) => {
          if (!readOnly) {
            e.currentTarget.style.borderColor = "rgba(56,189,248,0.3)";
            e.currentTarget.style.background = "rgba(56,189,248,0.04)";
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = readOnly ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)";
          e.currentTarget.style.background = readOnly ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.03)";
        }}
      />
      {hint && <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.12)" }}>{hint}</span>}
    </div>
  );
}

function CompetitorTag({ name, onRemove, color }: { name: string; onRemove: () => void; color: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs group"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#C8C8D8",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      {name}
      <button
        onClick={onRemove}
        className="ml-0.5 opacity-30 group-hover:opacity-70 transition-opacity"
        style={{ color: "#EF4444" }}
      >
        <X className="w-3 h-3" />
      </button>
    </motion.span>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

const COMP_COLORS = ["#F59E0B", "#EF4444", "#A855F7", "#22C55E", "#EC4899", "#38BDF8", "#F97316", "#8B5CF6"];

export function ProbeBriefing({ domain, brandName, industry, targetMarket, coreProduct, competitorMentions, onSubmit, onCancel }: Props) {
  const [step, setStep] = useState(1);

  // Step 1 state
  const [d, setD] = useState(domain);
  const [bn, setBn] = useState(brandName);

  // Step 2 state — pre-filled from Light scan data
  const [ind, setInd] = useState(industry);
  const [tm, setTm] = useState(targetMarket);
  const [cp, setCp] = useState(coreProduct);
  const [tp, setTp] = useState("");

  // Step 3 state — pre-fill from light scan competitor mentions
  const [competitors, setCompetitors] = useState<string[]>(() =>
    competitorMentions.map((c) => c.brand).filter(Boolean).slice(0, 8)
  );
  const [newComp, setNewComp] = useState("");

  // Step 4 state — queries fetched from DeepSeek via backend API
  interface CategorizedQuery { query: string; category: string; }
  const [queries, setQueries] = useState<CategorizedQuery[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState("");
  const [newQuery, setNewQuery] = useState("");
  const [newQueryCategory, setNewQueryCategory] = useState("industry");
  const [regenerating, setRegenerating] = useState(false);

  async function fetchQueries() {
    setQueryLoading(true);
    setQueryError("");
    try {
      const res = await fetch(`${API_BASE}/api/expand-queries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: ind,
          brand_name: bn,
          competitors,
          seed_queries: [],
        }),
      });
      const json = await res.json();
      if (json.status === "success" && json.queries?.length > 0) {
        setQueries(dedupeQueries(json.queries));
      } else {
        setQueryError(json.error || "查询词生成失败，请手动输入英文查询词");
      }
    } catch {
      setQueryError("网络错误，无法生成查询词。请手动输入英文查询词。");
    } finally {
      setQueryLoading(false);
    }
  }

  // When reaching Step 4, auto-fetch queries from DeepSeek
  useEffect(() => {
    if (step === 4 && queries.length === 0 && !queryLoading) {
      fetchQueries();
    }
  }, [step]);

  function handleRegenerate() {
    setRegenerating(true);
    fetchQueries().finally(() => {
      setTimeout(() => setRegenerating(false), 600);
    });
  }

  function addCompetitor() {
    const name = newComp.trim();
    if (!name || competitors.includes(name)) return;
    setCompetitors((prev) => [...prev, name]);
    setNewComp("");
  }

  function removeCompetitor(name: string) {
    setCompetitors((prev) => prev.filter((c) => c !== name));
  }

  function addQuery() {
    const q = newQuery.trim();
    if (!q || queries.some(x => x.query === q)) return;
    setQueries((prev) => [...prev, { query: q, category: newQueryCategory }]);
    setNewQuery("");
  }

  function removeQuery(q: string) {
    setQueries((prev) => prev.filter((x) => x.query !== q));
  }

  function canProceed(): boolean {
    switch (step) {
      case 1: return d.trim().length > 0 && bn.trim().length > 0;
      case 2: return ind.trim().length > 0 && tm.trim().length > 0;
      case 3: return true;
      case 4: return queries.length >= 5;
      default: return true;
    }
  }

  function handleNext() {
    if (!canProceed()) return;
    if (step < 5) setStep((s) => s + 1);
  }

  function handleLaunch() {
    const data: ProbeFullInput = {
      domain: d.trim(),
      brand_name: bn.trim(),
      industry: ind.trim(),
      target_market: tm.trim(),
      core_product: cp.trim(),
      target_positioning: tp.trim(),
      seed_queries: queries.map(q => q.query).slice(0, 30),
      competitors: competitors.slice(0, 10),
      mode: "full",
    };
    onSubmit(data);
  }

  const stepIcons = [Globe, Target, Zap, FileText, Eye];

  return (
    <div className="flex-1 flex flex-col py-6" style={{ maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
      <div className="max-w-2xl mx-auto w-full px-6">

        {/* ── Step Indicator ── */}
        <StepIndicator current={step} total={5} />

        {/* ═══════════════════════════════════════════
            STEP 1 — Brand Identity
            ═══════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="px-7 py-7"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <SectionLabel>Step 1 · 品牌身份确认</SectionLabel>
              <p className="text-xs mb-6" style={{ color: "#5E5E78" }}>
                这些信息来自初步体检结果，请确认或修正。
              </p>

              <div className="grid gap-5">
                <InputField
                  label="官网域名"
                  value={d}
                  onChange={setD}
                  placeholder="example.com"
                  required
                  hint="用于爬取官网内容，提取品牌信息"
                />
                <InputField
                  label="品牌名称"
                  value={bn}
                  onChange={setBn}
                  placeholder="你的品牌名"
                  required
                  hint="将用于生成品牌相关查询词"
                />
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════
              STEP 2 — Business Context
              ═══════════════════════════════════════════ */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="px-7 py-7"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <SectionLabel>Step 2 · 业务画像</SectionLabel>
              <p className="text-xs mb-6" style={{ color: "#5E5E78" }}>
                越精确地描述你的业务，AI 扫描的查询词越精准。
              </p>

              <div className="grid gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="行业"
                    value={ind}
                    onChange={setInd}
                    placeholder="如：B2B SaaS / DTC消费品牌 / 跨境支付"
                    required
                    hint="建议加英文括号，如「彩妆（Color Cosmetics）」"
                  />
                  <InputField
                    label="目标市场"
                    value={tm}
                    onChange={setTm}
                    placeholder="如：北美 / 欧洲 / 全球"
                    required
                  />
                </div>
                <InputField
                  label="核心产品 / 服务"
                  value={cp}
                  onChange={setCp}
                  placeholder="一句话描述你的核心产品，如「可降解手机壳」"
                  hint="用于生成品类查询词（如 best phone cases 2025）"
                />
                <InputField
                  label="品牌想让 AI 看到什么"
                  value={tp}
                  onChange={setTp}
                  placeholder="你期望AI如何描述你的品牌？如「最环保的手机壳品牌」"
                  hint="可选。用于 AI 认知 vs 品牌期望的差距分析"
                />
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════
              STEP 3 — Competitors
              ═══════════════════════════════════════════ */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="px-7 py-7"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <SectionLabel>Step 3 · 竞品配置</SectionLabel>
              <p className="text-xs mb-6" style={{ color: "#5E5E78" }}>
                以下竞品来自初步体检中 AI 常提到的品牌。你可以删除、或添加新的竞品。
              </p>

              {/* Current competitors */}
              <div className="flex flex-wrap gap-2 mb-6 min-h-[36px]">
                <AnimatePresence>
                  {competitors.map((c, i) => (
                    <CompetitorTag
                      key={c}
                      name={c}
                      color={COMP_COLORS[i % COMP_COLORS.length]}
                      onRemove={() => removeCompetitor(c)}
                    />
                  ))}
                </AnimatePresence>
                {competitors.length === 0 && (
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.12)" }}>
                    暂无竞品，请在下方添加
                  </span>
                )}
              </div>

              {/* Add competitor */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComp}
                  onChange={(e) => setNewComp(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCompetitor(); }}
                  placeholder="输入竞品名称或域名，按 Enter 添加"
                  className="flex-1 px-3.5 py-2.5 text-sm outline-none transition-all duration-300 font-mono"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#C8C8D8",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(56,189,248,0.3)";
                    e.currentTarget.style.background = "rgba(56,189,248,0.04)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                />
                <button
                  onClick={addCompetitor}
                  disabled={!newComp.trim()}
                  className="px-4 py-2.5 text-xs font-medium transition-all duration-300 flex items-center gap-1.5"
                  style={{
                    background: newComp.trim() ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.03)",
                    border: newComp.trim() ? "1px solid rgba(56,189,248,0.25)" : "1px solid rgba(255,255,255,0.06)",
                    color: newComp.trim() ? "#7DD3FC" : "rgba(255,255,255,0.15)",
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════
              STEP 4 — Seed Queries (DeepSeek 生成)
              ═══════════════════════════════════════════ */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="px-7 py-7"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <SectionLabel>Step 4 · 查询词配置</SectionLabel>
                <button
                  onClick={handleRegenerate}
                  disabled={queryLoading}
                  className="flex items-center gap-1.5 text-[10px] font-mono tracking-wide transition-all duration-300 px-2.5 py-1.5"
                  style={{
                    color: regenerating || queryLoading ? "#7DD3FC" : "rgba(56,189,248,0.45)",
                    background: regenerating || queryLoading ? "rgba(56,189,248,0.12)" : "rgba(56,189,248,0.04)",
                    border: regenerating || queryLoading ? "1px solid rgba(56,189,248,0.25)" : "1px solid rgba(56,189,248,0.08)",
                    cursor: queryLoading ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!queryLoading) {
                      e.currentTarget.style.color = "#7DD3FC";
                      e.currentTarget.style.borderColor = "rgba(56,189,248,0.2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!regenerating && !queryLoading) {
                      e.currentTarget.style.color = "rgba(56,189,248,0.45)";
                      e.currentTarget.style.borderColor = "rgba(56,189,248,0.08)";
                    }
                  }}
                >
                  <RefreshCw
                    className="w-3 h-3"
                    style={{ animation: regenerating || queryLoading ? "spin 1s linear infinite" : "none" }}
                  />
                  DeepSeek 重新生成
                </button>
              </div>

              <p className="text-xs mb-5" style={{ color: "#5E5E78" }}>
                DeepSeek 根据行业和品牌信息自动生成 A/B/C 三类查询词。可增删调整，最终以下方列表为准。
              </p>

              {/* ── Loading State ── */}
              {queryLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#38BDF8" }} />
                  <p className="text-xs font-mono" style={{ color: "#5E5E78" }}>
                    DeepSeek 正在生成查询词...
                  </p>
                </div>
              )}

              {/* ── Error State ── */}
              {!queryLoading && queryError && queries.length === 0 && (
                <div
                  className="flex flex-col items-center gap-3 py-10 px-4 mb-5"
                  style={{
                    background: "rgba(239,68,68,0.04)",
                    border: "1px solid rgba(239,68,68,0.12)",
                  }}
                >
                  <p className="text-xs text-center" style={{ color: "#EF4444" }}>{queryError}</p>
                  <button
                    onClick={handleRegenerate}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono transition-all duration-300"
                    style={{
                      color: "#EF4444",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    <RefreshCw className="w-3 h-3" />
                    重试
                  </button>
                </div>
              )}

              {/* ── Category-grouped query display ── */}
              {!queryLoading && queries.length > 0 && (
                <>
                  {(["industry", "brand", "competitor"] as const).map((cat) => {
                    const catQueries = queries.filter((q) => q.category === cat);
                    if (catQueries.length === 0) return null;
                    const colors = CATEGORY_COLORS[cat];
                    return (
                      <div key={cat} className="mb-5">
                        {/* Category header */}
                        <div className="flex items-center gap-2 mb-2.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: colors.dot, boxShadow: `0 0 5px ${colors.dot}40` }}
                          />
                          <span className="text-[11px] font-semibold tracking-wide" style={{ color: "#9A9AB0" }}>
                            {CATEGORY_LABELS[cat]}
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>
                            {catQueries.length} 条
                          </span>
                        </div>

                        {/* Query chips */}
                        <div
                          className="flex flex-wrap gap-2 p-3"
                          style={{
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          <AnimatePresence>
                            {catQueries.map((q) => (
                              <motion.span
                                key={q.query}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="inline-flex items-center gap-2 px-2.5 py-1 text-xs group"
                                style={{
                                  background: "rgba(255,255,255,0.03)",
                                  border: "1px solid rgba(255,255,255,0.06)",
                                  color: "#B0B0C8",
                                }}
                              >
                                <span
                                  className="w-1 h-1 rounded-full shrink-0"
                                  style={{ background: colors.dot }}
                                />
                                <span className="font-mono text-[11px] truncate max-w-[320px]">{q.query}</span>
                                <button
                                  onClick={() => removeQuery(q.query)}
                                  className="shrink-0 opacity-20 group-hover:opacity-60 transition-opacity"
                                  style={{ color: "#EF4444" }}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </motion.span>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}

                  {/* Category counts bar */}
                  <div className="flex items-center gap-4 mb-6">
                    {(["industry", "brand", "competitor"] as const).map((cat) => {
                      const count = queries.filter((q) => q.category === cat).length;
                      const colors = CATEGORY_COLORS[cat];
                      return (
                        <div key={cat} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.dot }} />
                          <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                            {CATEGORY_LABELS[cat].split("·")[0].trim()}: {count}
                          </span>
                        </div>
                      );
                    })}
                    <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>
                      共 {queries.length} 条
                    </span>
                  </div>
                </>
              )}

              {/* ── Add custom query ── */}
              {!queryLoading && (
                <div className="flex gap-2">
                  <select
                    value={newQueryCategory}
                    onChange={(e) => setNewQueryCategory(e.target.value)}
                    className="px-2.5 py-2.5 text-xs outline-none font-mono shrink-0"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#7DD3FC",
                      width: 130,
                    }}
                  >
                    <option value="industry" style={{ background: "#0D0D15", color: "#38BDF8" }}>A类 · 行业通用</option>
                    <option value="brand" style={{ background: "#0D0D15", color: "#22C55E" }}>B类 · 品牌直接</option>
                    <option value="competitor" style={{ background: "#0D0D15", color: "#F59E0B" }}>C类 · 竞品场景</option>
                  </select>
                  <input
                    type="text"
                    value={newQuery}
                    onChange={(e) => setNewQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addQuery(); }}
                    placeholder="输入自定义英文查询词，按 Enter 添加"
                    className="flex-1 px-3.5 py-2.5 text-sm outline-none transition-all duration-300 font-mono"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#C8C8D8",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(56,189,248,0.3)";
                      e.currentTarget.style.background = "rgba(56,189,248,0.04)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }}
                  />
                  <button
                    onClick={addQuery}
                    disabled={!newQuery.trim()}
                    className="px-4 py-2.5 text-xs font-medium transition-all duration-300 flex items-center gap-1.5 shrink-0"
                    style={{
                      background: newQuery.trim() ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.03)",
                      border: newQuery.trim() ? "1px solid rgba(56,189,248,0.25)" : "1px solid rgba(255,255,255,0.06)",
                      color: newQuery.trim() ? "#7DD3FC" : "rgba(255,255,255,0.15)",
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════
              STEP 5 — Review & Launch
              ═══════════════════════════════════════════ */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="px-7 py-7"
              style={{
                background: "linear-gradient(180deg, rgba(56,189,248,0.025) 0%, rgba(56,189,248,0.005) 100%)",
                border: "1px solid rgba(56,189,248,0.1)",
              }}
            >
              <SectionLabel>Step 5 · 任务简报确认</SectionLabel>
              <p className="text-xs mb-6" style={{ color: "#5E5E78" }}>
                确认以下信息无误后，启动完整扫描。预计耗时 3-5 分钟，消耗 4 个 AI 引擎配额。
              </p>

              {/* Review cards */}
              <div className="grid gap-3 mb-8">
                {/* Row 1: Domain + Brand */}
                <div className="grid grid-cols-2 gap-3">
                  <ReviewCard label="官网域名" value={d} />
                  <ReviewCard label="品牌名称" value={bn} />
                </div>

                {/* Row 2: Industry + Market */}
                <div className="grid grid-cols-2 gap-3">
                  <ReviewCard label="行业" value={ind} />
                  <ReviewCard label="目标市场" value={tm} />
                </div>

                {/* Row 3: Core Product */}
                {cp && <ReviewCard label="核心产品" value={cp} />}

                {/* Row 4: Target Positioning */}
                {tp && <ReviewCard label="期望 AI 认知" value={tp} />}

                {/* Row 5: Competitors */}
                <div className="p-3.5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.14)" }}>
                    竞品 ({competitors.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {competitors.length > 0 ? competitors.map((c, i) => (
                      <span key={c} className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px]" style={{
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        color: "#9A9AB0",
                      }}>
                        <span className="w-1 h-1 rounded-full" style={{ background: COMP_COLORS[i % COMP_COLORS.length] }} />
                        {c}
                      </span>
                    )) : (
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.12)" }}>未配置竞品</span>
                    )}
                  </div>
                </div>

                {/* Row 6: Queries */}
                <div className="p-3.5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.14)" }}>
                    查询词 ({Math.min(queries.length, 30)} 条)
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                    {queries.slice(0, 30).map((q) => {
                      const c = CATEGORY_COLORS[q.category] || CATEGORY_COLORS.industry;
                      return (
                        <span key={q.query} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono" style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          color: "#6A6A88",
                        }}>
                          <span className="w-1 h-1 rounded-full shrink-0" style={{ background: c.dot }} />
                          {q.query}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Engine allocation */}
              <div
                className="p-4 mb-6 flex items-center gap-4"
                style={{
                  background: "linear-gradient(135deg, rgba(56,189,248,0.04) 0%, rgba(56,189,248,0.01) 100%)",
                  border: "1px solid rgba(56,189,248,0.06)",
                }}
              >
                <div className="flex -space-x-2">
                  {["GPT", "Gemini", "DeepSeek", "Haiku"].map((e, i) => (
                    <div
                      key={e}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-mono font-semibold"
                      style={{
                        background: "rgba(56,189,248,0.12)",
                        border: "1px solid rgba(56,189,248,0.2)",
                        color: "#7DD3FC",
                        zIndex: 4 - i,
                      }}
                    >
                      {e[0]}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "#C8C8D8" }}>4 引擎并发扫描</p>
                  <p className="text-[10px] font-mono" style={{ color: "#5E5E78" }}>预计 3-5 分钟 · 约 ¥12-15</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════
            Bottom Navigation
            ═══════════════════════════════════════════ */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={step === 1 ? onCancel : () => setStep((s) => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all duration-300"
            style={{
              color: "rgba(255,255,255,0.3)",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.55)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.3)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {step === 1 ? "返回仪表盘" : "上一步"}
          </button>

          {step < 5 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-300"
              style={{
                background: canProceed() ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.03)",
                border: canProceed() ? "1px solid rgba(56,189,248,0.25)" : "1px solid rgba(255,255,255,0.06)",
                color: canProceed() ? "#7DD3FC" : "rgba(255,255,255,0.15)",
              }}
              onMouseEnter={(e) => {
                if (canProceed()) {
                  e.currentTarget.style.background = "rgba(56,189,248,0.20)";
                  e.currentTarget.style.borderColor = "rgba(56,189,248,0.4)";
                  e.currentTarget.style.boxShadow = "0 0 24px rgba(56,189,248,0.08)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = canProceed() ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = canProceed() ? "1px solid rgba(56,189,248,0.25)" : "1px solid rgba(255,255,255,0.06)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              下一步
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <motion.button
              onClick={handleLaunch}
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold tracking-wide transition-all duration-500 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0.08) 100%)",
                border: "1px solid rgba(56,189,248,0.3)",
                color: "#7DD3FC",
              }}
              whileHover={{
                background: "linear-gradient(135deg, rgba(56,189,248,0.28) 0%, rgba(56,189,248,0.14) 100%)",
                borderColor: "rgba(56,189,248,0.5)",
                boxShadow: "0 0 48px rgba(56,189,248,0.12)",
                scale: 1.02,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.span
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                style={{
                  border: "1px solid rgba(56,189,248,0.3)",
                  animation: "pulseRing 2s ease-in-out infinite",
                }}
              />
              <Zap className="w-4 h-4" />
              启动完整扫描
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Review sub-component ─────────────────────────────────

function ReviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3.5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(255,255,255,0.14)" }}>
        {label}
      </p>
      <p className="text-sm font-mono truncate" style={{ color: "#C8C8D8" }}>{value || "—"}</p>
    </div>
  );
}
