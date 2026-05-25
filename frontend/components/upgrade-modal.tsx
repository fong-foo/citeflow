"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface Props {
  feature: "probe" | "analyst" | "doctor";
  tier: "free" | "full";
  onClose: () => void;
  onUpgrade?: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export function UpgradeModal({ feature, tier: _tier, onClose, onUpgrade: _onUpgrade }: Props) {
  const [loading, setLoading] = useState(false);

  const isFull = feature === "analyst" || feature === "doctor";
  const title = isFull ? "解锁完整诊断" : "升级侦察兵";
  const subtitle = isFull
    ? "包含 Analyst 诊断 + Doctor 处方"
    : "4 大 AI 引擎深度侦察";

  async function handleCheckout(product: "full" | "probe") {
    setLoading(true);
    const token = localStorage.getItem("cf_token");
    if (!token) {
      alert("请先登录");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/pay/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("支付暂不可用");
      }
    } catch {
      alert("网络错误");
    }
    setLoading(false);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          style={{
            background: "#131318", border: "1px solid #222228",
            borderRadius: 16, padding: 32, maxWidth: 480, width: "90%",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ color: "#EDEDF5", fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
            {title}
          </h2>
          <p style={{ color: "#9A9AB0", fontSize: 14, marginBottom: 24 }}>
            {subtitle}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* ¥368 完整体检 */}
            <button
              onClick={() => handleCheckout("full")}
              disabled={loading}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 20px", background: "#1A1A22", border: "1px solid #222228",
                borderRadius: 12, cursor: "pointer", textAlign: "left",
                opacity: loading ? 0.5 : 1,
              }}
            >
              <div>
                <div style={{ color: "#EDEDF5", fontSize: 16, fontWeight: 600 }}>
                  完整体检套餐
                </div>
                <div style={{ color: "#9A9AB0", fontSize: 13, marginTop: 4 }}>
                  Probe → Analyst → Doctor · 2 次
                </div>
              </div>
              <div style={{ color: "#3B82F6", fontSize: 20, fontWeight: 700 }}>
                ¥368
              </div>
            </button>

            {/* ¥68 单次 Probe */}
            <button
              onClick={() => handleCheckout("probe")}
              disabled={loading}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 20px", background: "transparent",
                border: "1px solid #222228", borderRadius: 12, cursor: "pointer",
                textAlign: "left", opacity: loading ? 0.5 : 1,
              }}
            >
              <div>
                <div style={{ color: "#EDEDF5", fontSize: 16, fontWeight: 600 }}>
                  单次侦察兵
                </div>
                <div style={{ color: "#9A9AB0", fontSize: 13, marginTop: 4 }}>
                  仅 Probe 侦察 · 不含诊断处方
                </div>
              </div>
              <div style={{ color: "#9A9AB0", fontSize: 20, fontWeight: 700 }}>
                ¥68
              </div>
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              marginTop: 20, width: "100%", padding: "10px",
              background: "transparent", border: "none",
              color: "#5E5E78", fontSize: 13, cursor: "pointer",
            }}
          >
            以后再说
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
