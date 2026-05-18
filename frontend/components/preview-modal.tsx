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
              className="relative w-full max-w-md"
              style={{
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
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity"
                style={{ color: "#5E5E78" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>

              {/* 内容 */}
              <div className="p-6">
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

                {/* 预览数据 */}
                {module.previewData && (
                  <div
                    className="mb-5 p-4"
                    style={{
                      background: "rgba(56,189,248,0.03)",
                      border: "1px solid rgba(56,189,248,0.08)",
                    }}
                  >
                    <p className="text-[10px] font-mono tracking-wider uppercase mb-2.5" style={{ color: "rgba(56,189,248,0.5)" }}>
                      预览（基于你的初步体检数据）
                    </p>
                    <p className="text-xs mb-1" style={{ color: "#9A9AB0" }}>
                      {module.previewData.label}
                    </p>
                    <p className="text-sm" style={{ color: "#C8C8D8" }}>
                      {module.previewData.value}
                    </p>
                    <p className="text-[10px] mt-2.5" style={{ color: "#5E5E78" }}>
                      完整数据需要升级后查看
                    </p>
                  </div>
                )}

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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
