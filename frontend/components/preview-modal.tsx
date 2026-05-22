"use client";

import { motion, AnimatePresence } from "framer-motion";

export interface PreviewModule {
  id: string;
  title: string;
  description: string;
  features: string[];
  previewData?: {
    label: string;
    value: string;
  };
  previewTemplate?: {
    type: string;
    data: any;
  };
  price: string;
  priceDetail: string;
}

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  module: PreviewModule;
}

export function PreviewModal({ isOpen, onClose, onUpgrade, module }: PreviewModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
          />

          {/* 弹窗 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            <div
              className="relative w-full max-w-4xl"
              style={{
                maxHeight: "calc(100vh - 48px)",
                display: "flex",
                flexDirection: "column",
                background: "linear-gradient(180deg, #1A1A22 0%, #131318 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              }}
            >
              {/* 顶部装饰线 */}
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.3), transparent)" }}
              />

              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity z-10"
                style={{ color: "#5E5E78" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>

              {/* 横版两栏 */}
              <div className="flex flex-col md:flex-row" style={{ overflow: "hidden" }}>
                {/* 左栏：说明 + 功能 + 价格 */}
                <div className="p-6 flex-shrink-0" style={{ width: module.previewTemplate ? 360 : "100%" }}>
                  <div>
                    {/* 标题 */}
                    <h3 className="text-lg font-semibold mb-4 pr-8" style={{ color: "#EDEDF5" }}>
                      {module.title}
                    </h3>

                    {/* 功能说明 */}
                    <p className="text-sm mb-5" style={{ color: "#9A9AB0", lineHeight: 1.6 }}>
                      {module.description}
                    </p>

                    {/* 功能列表 */}
                    <div className="mb-5">
                      <p className="text-[10px] font-mono tracking-wider uppercase mb-2.5" style={{ color: "rgba(56,189,248,0.5)" }}>
                        这个模块能告诉你
                      </p>
                      <ul className="space-y-2">
                        {module.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#C8C8D8" }}>
                            <span style={{ color: "#38BDF8", flexShrink: 0, marginTop: 1 }}>✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 价格区 */}
                    <div
                      className="p-4 mb-4"
                      style={{
                        background: "linear-gradient(135deg, rgba(56,189,248,0.06) 0%, rgba(56,189,248,0.02) 100%)",
                        border: "1px solid rgba(56,189,248,0.15)",
                      }}
                    >
                      <p className="text-lg font-semibold mb-1" style={{ color: "#7DD3FC" }}>
                        升级解锁 {module.price}
                      </p>
                      <p className="text-xs" style={{ color: "#9A9AB0" }}>
                        {module.priceDetail}
                      </p>
                    </div>

                    {/* 按钮组 */}
                    <div className="flex gap-3">
                      <motion.button
                        onClick={onUpgrade}
                        className="flex-1 py-3 text-sm font-medium"
                        style={{
                          background: "linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)",
                          color: "#FFF",
                          boxShadow: "0 4px 12px rgba(56,189,248,0.3)",
                        }}
                        whileHover={{
                          boxShadow: "0 4px 20px rgba(56,189,248,0.45)",
                          scale: 1.02,
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        立即升级
                      </motion.button>
                      <button
                        onClick={onClose}
                        className="px-4 py-3 text-sm transition-opacity hover:opacity-70"
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.06)",
                          color: "#5E5E78",
                        }}
                      >
                        稍后再说
                      </button>
                    </div>
                  </div>
                </div>

                {/* 右栏：模板预览 */}
                {module.previewTemplate && (
                  <div
                    className="p-6 flex-1 min-w-0"
                    style={{
                      overflowY: "auto",
                      maxHeight: "calc(100vh - 120px)",
                      borderLeft: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: "rgba(245,158,11,0.5)" }}>
                      📊 功能预览
                    </p>
                    <PreviewTemplateRenderer template={module.previewTemplate} />
                    <p className="text-[10px] mt-4 py-2 px-3 text-center" style={{ color: "#F59E0B", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                      ⚠️ 以上为示例数据，升级后查看你的真实数据
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════
   Template renderer
   ═══════════════════════════════════════════ */

function PreviewTemplateRenderer({ template }: { template: { type: string; data: any } }) {
  switch (template.type) {
    case "ai_perception":
      return <AIPerceptionTemplate data={template.data} />;
    case "engine_comparison":
      return <EngineComparisonTemplate data={template.data} />;
    case "gap_report":
      return <GapReportTemplate data={template.data} />;
    case "diagnosis":
      return <DiagnosisTemplate data={template.data} />;
    case "prescription":
      return <PrescriptionTemplate data={template.data} />;
    default:
      return null;
  }
}

function AIPerceptionTemplate({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          AI 怎么描述你
        </p>
        <p className="text-sm" style={{ color: "#C8C8D8" }}>{data.aiDescription}</p>
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          AI 理想描述
        </p>
        <p className="text-sm italic" style={{ color: "#C8C8D8" }}>&ldquo;{data.idealDescription}&rdquo;</p>
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          关键词
        </p>
        <div className="flex flex-wrap gap-1.5">
          {data.keywords.map((k: string, i: number) => (
            <span key={i} className="px-2 py-0.5 text-[10px]" style={{ background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.08)", color: "#7DD3FC" }}>
              {k}
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          调性
        </p>
        <p className="text-sm" style={{ color: "#C8C8D8" }}>{data.tone}</p>
      </div>
    </div>
  );
}

function EngineComparisonTemplate({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {data.engines.map((engine: any, i: number) => (
        <div key={i} className="p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-sm font-medium mb-2" style={{ color: "#EDEDF5" }}>{engine.name}</p>
          <div className="flex gap-4 text-xs" style={{ color: "#9A9AB0" }}>
            <span>引用率：<span className="font-mono" style={{ color: "#38BDF8" }}>{engine.citationRate}%</span></span>
            <span>推荐率：<span className="font-mono" style={{ color: "#22C55E" }}>{engine.recommendationRate}%</span></span>
          </div>
          <p className="text-xs mt-1" style={{ color: "#5E5E78" }}>来源：{engine.topSources.join(", ")}</p>
        </div>
      ))}
      <div className="p-3" style={{ background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.08)" }}>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(245,158,11,0.5)" }}>
          洞察
        </p>
        <p className="text-sm" style={{ color: "#C8C8D8" }}>{data.insight}</p>
      </div>
    </div>
  );
}

function GapReportTemplate({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          对齐度
        </p>
        <p className="text-2xl font-mono" style={{ color: "#F59E0B" }}>{data.alignmentScore}<span className="text-xs" style={{ color: "#5E5E78" }}>/100</span></p>
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(34,197,94,0.5)" }}>
          已对齐
        </p>
        {data.aligned.map((item: string, i: number) => (
          <p key={i} className="text-xs" style={{ color: "#22C55E" }}>✓ {item}</p>
        ))}
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(239,68,68,0.5)" }}>
          未对齐
        </p>
        {data.misaligned.map((item: string, i: number) => (
          <p key={i} className="text-xs" style={{ color: "#EF4444" }}>✗ {item}</p>
        ))}
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(245,158,11,0.5)" }}>
          盲点
        </p>
        {data.blindSpots.map((item: string, i: number) => (
          <p key={i} className="text-xs" style={{ color: "#F59E0B" }}>⚠ {item}</p>
        ))}
      </div>
    </div>
  );
}

function DiagnosisTemplate({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          一句话诊断
        </p>
        <p className="text-sm" style={{ color: "#C8C8D8" }}>{data.verdict}</p>
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(56,189,248,0.5)" }}>
          三层诊断链
        </p>
        <div className="space-y-1">
          <p className="text-xs" style={{ color: "#38BDF8" }}>观察：{data.observation}</p>
          <p className="text-xs" style={{ color: "#F59E0B" }}>解释：{data.explanation}</p>
          <p className="text-xs" style={{ color: "#EF4444" }}>影响：{data.implication}</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(239,68,68,0.5)" }}>
          失败维度
        </p>
        {data.losingDimensions.map((dim: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: "#EF4444" }}>
            {dim.dimension}（落后 {dim.competitor} {dim.gap} 分）
          </p>
        ))}
      </div>
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(34,197,94,0.5)" }}>
          胜出维度
        </p>
        {data.winningDimensions.map((dim: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: "#22C55E" }}>
            {dim.dimension}（领先 {dim.competitor} {dim.gap} 分）
          </p>
        ))}
      </div>
    </div>
  );
}

function PrescriptionTemplate({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(34,197,94,0.5)" }}>
          处方摘要
        </p>
        <p className="text-sm" style={{ color: "#C8C8D8" }}>{data.summary}</p>
      </div>
      {data.items.map((item: any, i: number) => (
        <div key={i} className="p-3" style={{
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${item.priority === "P0" ? "rgba(239,68,68,0.15)" : item.priority === "P1" ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)"}`,
        }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: "#EDEDF5" }}>{item.action}</p>
            <span className="text-xs px-2 py-0.5" style={{
              background: item.priority === "P0" ? "rgba(239,68,68,0.1)" : item.priority === "P1" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)",
              color: item.priority === "P0" ? "#EF4444" : item.priority === "P1" ? "#F59E0B" : "#22C55E",
            }}>
              {item.priority}
            </span>
          </div>
          <p className="text-xs mb-1" style={{ color: "#5E5E78" }}>目标页面：{item.targetPage}</p>
          <p className="text-xs mb-1" style={{ color: "#5E5E78" }}>预期效果：{item.expectedImpact}</p>
          <p className="text-xs" style={{ color: "#5E5E78" }}>证据来源：{item.evidence}</p>
        </div>
      ))}
    </div>
  );
}
