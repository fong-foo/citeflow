"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

interface Props {
  feature: "analyst" | "doctor";
  tier: "free" | "full";
  onClose: () => void;
  onUpgrade?: () => void;
}

function getUpgradeType(tier: string, _feature: string): "full" {
  return "full";
}

const UPGRADE_CONFIGS = {
  "free-full": {
    title: "解锁专业版",
    subtitle: "完整 AI 品牌体检 · 一次性付费",
    unlocks: [
      "Probe 侦察兵（完整扫描，4引擎交叉对比）",
      "Analyst 诊断师（14条规则根因诊断）",
      "Doctor 处方（P0/P1/P2可执行任务清单）",
      "AI 认知画像 + 竞品差距量化",
      "每条结论可追溯 AI 原文来源",
      "3-5 分钟出完整报告",
    ],
    price: "¥100/次",
    priceDetail: "一次性付费，解锁全部功能",
  },
};

export function UpgradeModal({ feature, tier, onClose, onUpgrade }: Props) {
  const configKey = `${tier}-full`;
  const info = UPGRADE_CONFIGS[configKey as keyof typeof UPGRADE_CONFIGS] || UPGRADE_CONFIGS["free-full"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2,2,8,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0D0D15 0%, #0A0A12 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.4), transparent)",
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 transition-colors duration-200"
          style={{ color: "rgba(255,255,255,0.2)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8 pt-10 text-center">
          {/* Lock icon */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{
              background: "rgba(56,189,248,0.06)",
              border: "1px solid rgba(56,189,248,0.12)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(56,189,248,0.5)" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h2 className="text-lg font-semibold tracking-tight mb-1" style={{ color: "#EDEDF5" }}>
            {info.title}
          </h2>
          <p className="text-sm mb-8" style={{ color: "#5E5E78" }}>
            {info.subtitle}
          </p>

          {/* Feature list */}
          <ul className="space-y-3 mb-8 text-left">
            {info.unlocks.map((f, i) => (
              <motion.li
                key={f}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                className="flex items-start gap-3"
              >
                <Check className="w-4 h-4 shrink-0 mt-px" style={{ color: "rgba(56,189,248,0.5)" }} />
                <span className="text-sm" style={{ color: "#9A9AB0" }}>{f}</span>
              </motion.li>
            ))}
          </ul>

          {/* CTA */}
          <button
            className="w-full py-3 text-sm font-semibold tracking-wide transition-all duration-500"
            style={{
              background: "rgba(56,189,248,0.14)",
              border: "1px solid rgba(56,189,248,0.25)",
              color: "#7DD3FC",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(56,189,248,0.22)";
              e.currentTarget.style.borderColor = "rgba(56,189,248,0.40)";
              e.currentTarget.style.boxShadow = "0 0 32px rgba(56,189,248,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(56,189,248,0.14)";
              e.currentTarget.style.borderColor = "rgba(56,189,248,0.25)";
              e.currentTarget.style.boxShadow = "none";
            }}
            onClick={() => onUpgrade ? onUpgrade() : alert("付费功能开发中，敬请期待")}
          >
            升级解锁 · {info.price}
          </button>

          <p className="text-[10px] mt-4" style={{ color: "rgba(255,255,255,0.12)" }}>
            {info.priceDetail}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
