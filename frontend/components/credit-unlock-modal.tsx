"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  product: "full" | "probe";
  count: number;
  onClose: () => void;
}

export function CreditUnlockModal({ product, count, onClose }: Props) {
  const productLabel = product === "full" ? "完整体检" : "Probe 侦察兵";
  const unit = product === "full" ? "次" : "次";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 110,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{
            background: "#131318", border: "1px solid rgba(34,197,94,0.20)",
            borderRadius: 16, padding: 36, maxWidth: 420, width: "90%", textAlign: "center",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(34,197,94,0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 32,
            }}
          >
            🎉
          </motion.div>

          <h2 style={{ color: "#EDEDF5", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            恭喜解锁！
          </h2>

          <p style={{ color: "#9A9AB0", fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
            你已成功解锁{" "}
            <span style={{ color: "#4ADE80", fontWeight: 700 }}>
              {productLabel} {count} {unit}
            </span>
          </p>

          <p style={{ color: "#5E5E78", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
            {product === "full"
              ? "返回仪表盘，开始你的完整体检之旅"
              : "点击左侧「Probe 侦察兵」，开始深度扫描你的品牌"}
          </p>

          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 10,
              background: "linear-gradient(135deg, #22C55E, #16A34A)",
              border: "none", color: "#fff", fontSize: 15, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            开始使用
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
