"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "probe" | "analyst" | "doctor";

interface Props {
  data: any;
  mode: "light" | "full";
  brandName?: string;
  onUpgrade?: () => void;
  onViewDashboard?: () => void;
  onUpgradeToFull?: () => void;
}

export function ScanResult({ data, mode, brandName = "", onUpgrade, onViewDashboard, onUpgradeToFull }: Props) {
  const [tab, setTab] = useState<Tab>("probe");
  const isLight = mode === "light";

  return (
    <div className="w-full max-w-[720px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <h1 className="text-xl font-semibold tracking-tight mb-2 flex items-center justify-center gap-0.5" style={{ color: "#EDEDF5" }}>
          {brandName && (
            <>
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                style={{ color: "rgba(56,189,248,0.5)" }}
              >
                【
              </motion.span>
              <motion.span
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: [0, 1, 0.7, 1], filter: ["blur(4px)", "blur(0px)", "blur(0px)", "blur(0px)"] }}
                transition={{ duration: 1.0, delay: 0.3, times: [0, 0.3, 0.5, 1] }}
                className="relative brand-shine"
              >
                {brandName}
                {/* 扫描线 */}
                <motion.span
                  initial={{ top: 0, opacity: 0 }}
                  animate={{ top: ["0%", "100%"], opacity: [0, 0.6, 0] }}
                  transition={{ duration: 0.8, delay: 0.5, ease: "easeInOut" }}
                  className="absolute left-0 right-0 h-[1px] pointer-events-none"
                  style={{ background: "linear-gradient(90deg, transparent, #38BDF8, transparent)" }}
                />
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                style={{ color: "rgba(56,189,248,0.5)" }}
              >
                】
              </motion.span>
            </>
          )}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.55 }}
          >
            AI 初步体检报告
          </motion.span>
        </h1>
        {isLight ? (
          <p className="text-xs flex items-center justify-center gap-1.5 flex-wrap" style={{ color: "#5E5E78" }}>
            <span
              className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-sm"
              style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}
            >
              注意
            </span>
            此次报告为免费版 Probe，如需了解更详细的体检报告请跳转到
            <span
              className="cursor-pointer underline underline-offset-2 transition-colors duration-200 hover:text-[#7DD3FC]"
              style={{ color: "#38BDF8" }}
              onClick={() => alert("Probe 侦察兵为付费功能，请升级后使用。")}
            >
              Probe 侦察兵
            </span>
            页面
          </p>
        ) : (
          <p className="text-xs" style={{ color: "#5E5E78" }}>完整版</p>
        )}
      </motion.div>

      {/* Tab Content — light 模式只展示体检报告，full 模式展示三栏 */}
      {isLight ? (
        <ProbeTab data={data} />
      ) : (
        <>
          <div className="flex mb-8" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {([
              ["probe", "体检报告"],
              ["analyst", "诊断报告"],
              ["doctor", "处方"],
            ] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex-1 relative pb-3 text-sm font-medium transition-colors duration-300"
                style={{ color: tab === key ? "#C8C8D8" : "#4E4E68" }}
              >
                {label}
                {tab === key && (
                  <motion.div
                    layoutId="result-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: "#38BDF8" }}
                  />
                )}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {tab === "probe" && <ProbeTab key="probe" data={data} />}
            {tab === "analyst" && <AnalystTab key="analyst" data={data} />}
            {tab === "doctor" && <DoctorTab key="doctor" data={data} />}
          </AnimatePresence>
        </>
      )}

      {/* P1-8: Light 模式升级完整扫描 CTA */}
      {isLight && onUpgradeToFull && (
        <div className="text-center py-6 mt-4">
          <p className="text-xs mb-3" style={{ color: "#5E5E78" }}>
            当前为快速体检（15条行业查询词）。完整侦察包括30条查询词 + 品牌画像 + 竞品对比 + 多引擎验证
          </p>
          <button
            onClick={onUpgradeToFull}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:brightness-110"
            style={{ background: "#38BDF8", color: "#08080D" }}
          >
            升级完整扫描
          </button>
        </div>
      )}

      {/* 查看仪表盘按钮 */}
      {onViewDashboard && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onViewDashboard}
            className="px-6 py-2.5 text-sm font-medium rounded-sm transition-all duration-300"
            style={{
              background: "rgba(56,189,248,0.10)",
              border: "1px solid rgba(56,189,248,0.18)",
              color: "#7DD3FC",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(56,189,248,0.18)";
              e.currentTarget.style.borderColor = "rgba(56,189,248,0.30)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(56,189,248,0.10)";
              e.currentTarget.style.borderColor = "rgba(56,189,248,0.18)";
            }}
          >
            查看仪表盘
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Probe Tab — Vernier Caliper Readout ──────────────── */

function summarizeScore(score: number | undefined): string {
  if (score == null) return "暂无评分数据。";
  if (score >= 80) return `品牌 AI 综合得分 ${score}/100，处于行业优秀水平。AI 搜索结果中品牌可见度高，引用率和推荐率均表现强劲，已建立稳定的 AI 认知基础。`;
  if (score >= 60) return `品牌 AI 综合得分 ${score}/100，处于行业中等水平。在 AI 搜索结果中已有一定声量，但距离头部品牌仍有差距，需针对性提升引用率与推荐率。`;
  if (score >= 40) return `品牌 AI 综合得分 ${score}/100，处于行业中等偏下水平。品牌在 AI 搜索中的声量较弱，竞品可能已经在抢占 AI 引用红利，建议尽快进行诊断。`;
  return `品牌 AI 综合得分 ${score}/100，处于行业低位。品牌在 AI 搜索结果中几乎不可见，竞争对手已经跑在前面，亟需全面诊断和系统性优化。`;
}

function summarizeMetrics(cm: any): string {
  const industry = cm?.industry_rate ?? 0;
  const rec = cm?.recommendation_rate ?? 0;
  const top = cm?.top_rate ?? 0;
  const parts: string[] = [];
  if (industry > 50) parts.push(`行业引用率 ${industry.toFixed(0)}%，在行业通用查询中品牌有一定声量。`);
  else parts.push(`行业引用率 ${industry.toFixed(0)}% 偏低，行业场景中品牌辨识度不足。`);
  if (rec < 40) parts.push(`推荐率 ${rec.toFixed(0)}% 较低，AI 更倾向于仅提及而非主动推荐您的品牌。`);
  else parts.push(`推荐率 ${rec.toFixed(0)}%，AI 在推荐场景中会提及您的品牌。`);
  if (top < 20) parts.push(`头部引用率 ${top.toFixed(0)}% 是最大短板，品牌极少出现在 AI 回答的首页位置。`);
  else parts.push(`头部引用率 ${top.toFixed(0)}%，品牌在 AI 回答中有首页曝光。`);
  return parts.join("");
}

function summarizeCompetitors(mentions: any[]): string {
  if (!mentions || mentions.length === 0) return "AI 搜索结果中未检测到明确的竞品品牌，您的品牌在行业 AI 对话中处于相对独立的位置。";
  const top = mentions.slice(0, 3).map((m: any) => m.brand || m.name).join("、");
  const total = mentions.length;
  const topCount = mentions[0]?.mention_count ?? mentions[0]?.count ?? 0;
  return `AI 搜索结果中检测到 ${total} 个竞品品牌被同时提及。${top} 是出现频次最高的竞品，其中 ${mentions[0]?.brand || mentions[0]?.name} 被提及 ${topCount} 次，在 AI 对话中占据明显优势。品牌需关注竞品的 AI 可见度策略并找到差异化切入点。`;
}

function ProbeTab({ data }: { data: any }) {
  const probe = data?.probe || data || {};
  const d = probe;
  const cs = d?.company_score || {};
  const cm = d?.citation_metrics || {};
  const queryTerms: string[] = d?.query_terms || [];
  const mentions = d?.competitor_mentions || [];
  const elapsed = d?.elapsed;
  const sc = scoreColor(cs?.overall);
  const score = cs?.overall;
  const markerPct = Math.min(Math.max((score ?? 0), 2), 98);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="rounded-sm overflow-hidden"
      style={{ background: "rgba(8,12,24,0.85)", border: "1px solid rgba(255,255,255,0.04)" }}
    >
      {/* ═══ 1. Scale Ruler — 综合评分 ═══ */}
      <div className="px-10 pt-10 pb-6 relative">
        {/* 免费版角标 */}
        <span className="absolute top-3 left-3 text-[10px] font-mono tracking-[0.06em] px-2 py-0.5 rounded-sm" style={{ color: "rgba(34,197,94,0.5)", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}>免费版</span>
        <p className="text-[11px] font-mono tracking-[0.08em] mb-8" style={{ color: "#6A6A88" }}>
          AI 综合评分 · 精密卡尺读数
        </p>

        {/* Scale bar */}
        <div className="relative mb-2" style={{ height: 32 }}>
          <div className="absolute inset-x-0 top-0 flex justify-between">
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((tick) => (
              <div key={tick} className="flex flex-col items-center" style={{ width: 1 }}>
                <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.10)" }} />
                <span className="text-[9px] font-mono mt-1" style={{ color: "rgba(255,255,255,0.12)" }}>{tick}</span>
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 top-0 flex justify-between px-0">
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((tick) => (
              <div key={tick} style={{ width: 1, height: 6, background: tick % 20 === 0 ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)" }} />
            ))}
          </div>
        </div>

        {/* Color gradient bar with diamond marker */}
        <div className="relative h-[3px] rounded-full mb-6" style={{ background: "linear-gradient(90deg, #EF4444, #F59E0B 30%, #7DD3FC 55%, #22C55E 80%)" }}>
          <motion.div
            initial={{ left: "0%" }}
            animate={{ left: `${markerPct}%` }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="w-[10px] h-[10px] rotate-45" style={{ background: sc, boxShadow: `0 0 10px ${sc}88, 0 0 2px ${sc}` }} />
            <div className="absolute top-[8px] left-1/2 -translate-x-1/2" style={{ width: 1, height: 28, background: `linear-gradient(180deg, ${sc}88, transparent)` }} />
          </motion.div>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="font-mono text-5xl font-bold tracking-tighter" style={{ color: sc }}>{score ?? "--"}</span>
          <span className="font-mono text-xs tracking-[0.10em]" style={{ color: sc, opacity: 0.5 }}>/ 100</span>
        </div>
        <span className="text-[10px] font-mono tracking-[0.06em]" style={{ color: sc, opacity: 0.4 }}>
          {score >= 80 ? "优秀" : score >= 60 ? "中等" : score >= 40 ? "警告区" : "严重"}
        </span>

        {/* Score analysis */}
        <div className="mt-6 p-4 rounded-sm" style={{ background: "rgba(56,189,248,0.03)", border: "1px solid rgba(56,189,248,0.06)" }}>
          <p className="text-[10px] font-mono tracking-[0.08em] mb-2" style={{ color: "rgba(56,189,248,0.35)" }}>分析摘要</p>
          <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>{summarizeScore(score)}</p>
        </div>
      </div>

      <div className="hairline-accent" />

      {/* ═══ 2. Metric Verniers — 三指标 ═══ */}
      <div className="px-10 py-6 space-y-5">
        <p className="text-[10px] font-mono tracking-[0.10em] mb-4" style={{ color: "rgba(56,189,248,0.3)" }}>
          核心指标 · 游标读数
        </p>
        {[
          ["行业引用率", cm?.industry_rate],
          ["推荐率", cm?.recommendation_rate],
          ["头部引用率", cm?.top_rate],
        ].map(([label, value]) => (
          <VernierRow key={label as string} label={label as string} value={value} />
        ))}

        {/* Metrics analysis */}
        <div className="!mt-6 p-4 rounded-sm" style={{ background: "rgba(56,189,248,0.03)", border: "1px solid rgba(56,189,248,0.06)" }}>
          <p className="text-[10px] font-mono tracking-[0.08em] mb-2" style={{ color: "rgba(56,189,248,0.35)" }}>分析摘要</p>
          <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>{summarizeMetrics(cm)}</p>
        </div>

        {/* Query Terms */}
        {queryTerms.length > 0 && (
          <div className="!mt-6">
            <p className="text-[10px] font-mono tracking-[0.10em] mb-3" style={{ color: "rgba(56,189,248,0.3)" }}>
              用了哪些查询词查询？
            </p>
            <div className="flex flex-wrap gap-1.5">
              {queryTerms.map((q: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-1 text-[11px] rounded-sm font-mono tracking-[0.03em]"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    color: "#5E5E78",
                  }}
                >
                  {q}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="hairline-accent" />

      {/* ═══ 3. Competitor Ledger — 竞品提及 ═══ */}
      <div className="px-10 py-6">
        <p className="text-[10px] font-mono tracking-[0.10em] mb-4" style={{ color: "rgba(56,189,248,0.3)" }}>
          竞品提及 · 总账
        </p>
        <div className="space-y-1">
          {mentions?.map((m: any, i: number) => (
            <div key={i} className="flex items-center py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
              <span className="font-mono text-[10px] w-5 shrink-0" style={{ color: "rgba(255,255,255,0.12)" }}>{(i + 1).toString().padStart(2, "0")}</span>
              <span className="text-xs flex-1" style={{ color: "#C8C8D8" }}>{m.brand || m.name}</span>
              <span className="text-[11px] font-mono tabular-nums mr-2" style={{ color: "#5E5E78" }}>{m.mention_count ?? m.count}</span>
              <div className="w-16 h-[2px] rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(((m.mention_count ?? m.count ?? 0) / 15) * 100, 100)}%`,
                    background: i === 0 ? "#7DD3FC" : "rgba(56,189,248,0.3)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Competitor analysis */}
        <div className="mt-6 p-4 rounded-sm" style={{ background: "rgba(56,189,248,0.03)", border: "1px solid rgba(56,189,248,0.06)" }}>
          <p className="text-[10px] font-mono tracking-[0.08em] mb-2" style={{ color: "rgba(56,189,248,0.35)" }}>分析摘要</p>
          <p className="text-xs leading-relaxed" style={{ color: "#9A9AB0" }}>{summarizeCompetitors(mentions)}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-10 py-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}>
        <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.16)" }}>
          扫描耗时 {elapsed != null ? `${elapsed.toFixed(1)}s` : "--"}
        </span>
      </div>
    </motion.div>
  );
}

function VernierRow({ label, value }: { label: string; value: number | undefined }) {
  const v = value ?? 0;
  const sc = scoreColor(v);
  const pct = Math.min(v, 100);
  return (
    <div className="flex items-center gap-4">
      <span className="text-[11px] font-mono tracking-[0.04em] w-[72px] shrink-0" style={{ color: "#8A8AA0" }}>{label}</span>
      <div className="flex-1 relative h-[14px]" style={{ background: `repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 10px)` }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          className="absolute inset-y-0 left-0"
          style={{ background: `linear-gradient(90deg, ${sc}22, ${sc})`, maxWidth: "100%" }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 1.3 }}
          className="absolute top-1/2 -translate-y-1/2 w-[4px] h-[4px] rounded-full"
          style={{ left: `${pct}%`, background: sc, boxShadow: `0 0 6px ${sc}88` }}
        />
      </div>
      <span className="font-mono text-sm font-semibold tabular-nums w-[52px] text-right" style={{ color: sc }}>{v.toFixed(1)}%</span>
    </div>
  );
}

/* ─── Analyst Tab (付费) ──────────────────────────────── */

function AnalystTab({ data }: { data: any }) {
  const diagnosis = data?.diagnosis || [];
  const verdict = data?.one_line_verdict || "";
  const competitorGap = data?.competitor_gap || {};
  const engineComparison = data?.engine_comparison || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Verdict */}
      {verdict && (
        <div
          className="p-5 rounded-sm"
          style={{
            background: "rgba(56,189,248,0.05)",
            border: "1px solid rgba(56,189,248,0.10)",
          }}
        >
          <p className="text-xs text-cf-muted mb-1.5">一句话诊断</p>
          <p className="text-sm leading-relaxed" style={{ color: "#C8C8D8" }}>{verdict}</p>
        </div>
      )}

      {/* Engine comparison */}
      {engineComparison && Object.keys(engineComparison).length > 0 && (
        <div
          className="p-5 rounded-sm"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <p className="text-xs text-cf-muted mb-3 tracking-wide">多引擎交叉验证</p>
          <div className="space-y-2">
            {Object.entries(engineComparison).map(([engine, score]: [string, any]) => (
              <div key={engine} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#9A9AB0" }}>{engine}</span>
                <span className="font-mono text-sm" style={{ color: "#EDEDF5" }}>{score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnosis list */}
      {diagnosis.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-cf-muted tracking-wide">诊断详情</p>
          {diagnosis.map((d: any, i: number) => (
            <div
              key={i}
              className="p-4 rounded-sm"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: "#EDEDF5" }}>{d.rule || d.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "#6E6E88" }}>{d.finding || d.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* Competitor gap */}
      {competitorGap && Object.keys(competitorGap).length > 0 && (
        <div
          className="p-5 rounded-sm"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <p className="text-xs text-cf-muted mb-3 tracking-wide">竞品差距</p>
          <pre className="text-xs leading-relaxed font-mono" style={{ color: "#9A9AB0", whiteSpace: "pre-wrap" }}>
            {JSON.stringify(competitorGap, null, 2)}
          </pre>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Doctor Tab (付费) ────────────────────────────────── */

function DoctorTab({ data }: { data: any }) {
  const prescription = data?.prescription || [];
  const summary = data?.prescription_summary || "";
  const sources = data?.knowledge_sources || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Summary */}
      {summary && (
        <div
          className="p-5 rounded-sm"
          style={{
            background: "rgba(34,197,94,0.05)",
            border: "1px solid rgba(34,197,94,0.10)",
          }}
        >
          <p className="text-xs text-cf-muted mb-1.5">处方概览</p>
          <p className="text-sm leading-relaxed" style={{ color: "#C8C8D8" }}>{summary}</p>
        </div>
      )}

      {/* Prescription tasks */}
      {prescription.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-cf-muted tracking-wide">执行任务清单</p>
          {prescription.map((p: any, i: number) => {
            const priorityColor =
              p.priority === "P0" ? "#EF4444" :
              p.priority === "P1" ? "#F59E0B" :
              "#22C55E";

            return (
              <div
                key={i}
                className="p-4 rounded-sm"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-sm"
                    style={{
                      background: `${priorityColor}15`,
                      color: priorityColor,
                    }}
                  >
                    {p.priority}
                  </span>
                  <span className="text-sm font-medium" style={{ color: "#EDEDF5" }}>{p.task || p.title}</span>
                </div>
                {p.target_page && (
                  <p className="text-xs ml-1" style={{ color: "#5E5E78" }}>目标页面: {p.target_page}</p>
                )}
                {p.what_to_add && (
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "#6E6E88" }}>{p.what_to_add}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Knowledge sources */}
      {sources.length > 0 && (
        <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.20)" }}>
          <p className="mb-1">参考来源:</p>
          {sources.map((s: string, i: number) => (
            <p key={i} className="truncate">{s}</p>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Lock Overlay (付费锁定) ──────────────────────────── */

function LockTab({ title, description }: { title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      {/* Lock icon */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <h3 className="text-base font-semibold mb-2" style={{ color: "#C8C8D8" }}>{title}</h3>
      <p className="text-sm leading-relaxed max-w-[340px] mb-8" style={{ color: "#6E6E88" }}>
        {description}
      </p>

      <button
        className="px-8 py-3 text-sm font-semibold tracking-wide rounded-sm transition-all duration-300"
        style={{
          background: "rgba(56,189,248,0.14)",
          border: "1px solid rgba(56,189,248,0.25)",
          color: "#7DD3FC",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(56,189,248,0.22)";
          e.currentTarget.style.borderColor = "rgba(56,189,248,0.38)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(56,189,248,0.14)";
          e.currentTarget.style.borderColor = "rgba(56,189,248,0.25)";
        }}
        onClick={() => alert("付费功能开发中，敬请期待")}
      >
        升级解锁 · ¥299/月
      </button>

      <p className="text-[11px] mt-4" style={{ color: "rgba(255,255,255,0.18)" }}>
        含完整诊断报告 + AI 处方 + 竞品对比
      </p>
    </motion.div>
  );
}

/* ─── Helpers ──────────────────────────────────────────── */

function scoreColor(score: number | undefined): string {
  if (score == null) return "#5E5E78";
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#7DD3FC";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}
