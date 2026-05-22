"use client";

import { motion } from "framer-motion";

interface Props {
  onViewDashboard: () => void;
}

export function ScanCompleted({ onViewDashboard }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center justify-center flex-1"
    >
      {/* Checkmark circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.18)",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, delay: 0.4, ease: "easeOut" }}
            d="M20 6L9 17l-5-5"
          />
        </svg>
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        className="text-lg font-semibold mb-2"
        style={{ color: "#EDEDF5" }}
      >
        您的品牌已经完成了初步体检
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.65 }}
        className="text-sm text-center max-w-md mb-8"
        style={{ color: "#9A9AB0" }}
      >
        我们已经对您的品牌有了初步的了解。
        <br />
        如需再次查看报告，请到仪表盘或报告历史。
      </motion.p>

      {/* CTA button */}
      <motion.button
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.75 }}
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
        前往仪表盘
      </motion.button>
    </motion.div>
  );
}
