"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface Props {
  feature: "probe" | "analyst" | "doctor";
  tier: "free" | "full";
  onClose: () => void;
}

export function UpgradeModal({ feature, tier: _tier, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<"full" | "probe">("full");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 自动填邮箱
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cf_user");
      if (stored) {
        const user = JSON.parse(stored);
        if (user?.email) setEmail(user.email);
      }
    } catch {}
  }, []);

  const title = "预约开通";
  const subtitle = "选择套餐，我们会尽快联系你开通";

  async function handleSubmit() {
    if (!email) return;
    setSubmitting(true);

    const token = localStorage.getItem("cf_token");
    const res = await fetch(`${API_BASE}/api/booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        product: selectedProduct,
        email,
        phone,
        note,
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      setSubmitted(true);
    } else {
      alert("提交失败，请重试");
    }
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

          {!submitted ? (
            <>
              {/* ── 套餐选择 ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {([
                  { value: "full", label: "完整体检套餐", sub: "Probe → Analyst → Doctor · 2 次", price: "¥368" },
                  { value: "probe", label: "单次侦察兵", sub: "仅 Probe 侦察 · 不含诊断处方", price: "¥68" },
                ] as const).map((plan) => (
                  <label
                    key={plan.value}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                      background: selectedProduct === plan.value ? "rgba(59,130,246,0.08)" : "transparent",
                      border: selectedProduct === plan.value ? "1px solid rgba(59,130,246,0.25)" : "1px solid #222228",
                    }}
                  >
                    <input
                      type="radio" name="product" value={plan.value}
                      checked={selectedProduct === plan.value}
                      onChange={() => setSelectedProduct(plan.value)}
                      style={{ accentColor: "#3B82F6", width: 16, height: 16, cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#EDEDF5", fontSize: 14, fontWeight: 600 }}>{plan.label}</div>
                      <div style={{ color: "#9A9AB0", fontSize: 12, marginTop: 2 }}>{plan.sub}</div>
                    </div>
                    <span style={{ color: plan.value === "full" ? "#3B82F6" : "#9A9AB0", fontSize: 16, fontWeight: 700 }}>
                      {plan.price}
                    </span>
                  </label>
                ))}
              </div>

              {/* ── 邮箱 ── */}
              <Field label="联系邮箱">
                <Input value={email} onChange={setEmail} type="email" placeholder="your@email.com" />
              </Field>

              {/* ── 电话 ── */}
              <Field label="电话号码（微信同号）">
                <Input value={phone} onChange={setPhone} type="tel" placeholder="方便我们联系你" />
              </Field>

              {/* ── 备注 ── */}
              <Field label="品牌名称 / 备注（选填）">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="品牌域名或想咨询的问题"
                  rows={2}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 8,
                    background: "#0A0A0F", border: "1px solid #222228",
                    color: "#EDEDF5", fontSize: 14, outline: "none",
                    resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
              </Field>

              {/* ── 提交 ── */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !email}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10,
                  background: submitting || !email ? "rgba(59,130,246,0.25)" : "linear-gradient(135deg, #3B82F6, #2563EB)",
                  border: "none", color: "#fff", fontSize: 15, fontWeight: 600,
                  cursor: submitting || !email ? "not-allowed" : "pointer",
                  opacity: submitting || !email ? 0.5 : 1, marginTop: 4,
                }}
              >
                {submitting ? "提交中..." : "提交预约"}
              </button>
            </>
          ) : (
            /* ── 提交成功态 ── */
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(34,197,94,0.10)", display: "flex",
                alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", fontSize: 28, color: "#4ADE80",
              }}>
                ✓
              </div>
              <p style={{ color: "#EDEDF5", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                预约已提交
              </p>
              <p style={{ color: "#9A9AB0", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                我们会尽快联系你开通，请耐心等待。
              </p>
              <button
                onClick={onClose}
                style={{
                  width: "100%", padding: "10px 0", borderRadius: 8,
                  background: "transparent", border: "1px solid #222228",
                  color: "#9A9AB0", fontSize: 13, cursor: "pointer",
                }}
              >
                关闭
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── 局部组件 ── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", color: "#9A9AB0", fontSize: 12, marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type || "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "10px 14px", borderRadius: 8,
        background: "#0A0A0F", border: "1px solid #222228",
        color: "#EDEDF5", fontSize: 14, outline: "none", boxSizing: "border-box",
      }}
    />
  );
}
