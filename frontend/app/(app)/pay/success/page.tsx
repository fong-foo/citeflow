"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const productInfo: Record<string, { name: string; desc: string; icon: string }> = {
  full: {
    name: "完整体检套餐",
    desc: "2 次 Probe + Analyst + Doctor 全套诊断",
    icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  },
  probe: {
    name: "单次侦察兵",
    desc: "1 次 Probe 4 引擎深度侦察",
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  },
};

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const product = searchParams?.get("product") || "";
  const info = productInfo[product] || {
    name: "支付成功",
    desc: "credits 已加入你的账户",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  const [credits, setCredits] = useState<{
    scan_credits?: number;
    probe_credits?: number;
  }>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("cf_token");
    if (!token) {
      setLoaded(true);
      return;
    }
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setCredits(d);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0F",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 18 }}
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(59,130,246,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={info.icon} />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            color: "#EDEDF5",
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          购买成功
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ color: "#9A9AB0", fontSize: 15, marginBottom: 4, lineHeight: 1.6 }}
        >
          {info.name}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.33 }}
          style={{ color: "#5E5E78", fontSize: 13, marginBottom: 32 }}
        >
          {info.desc}
        </motion.p>

        {/* Credit summary */}
        {loaded && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              background: "#131318",
              border: "1px solid #222228",
              borderRadius: 12,
              padding: "20px 24px",
              marginBottom: 32,
              display: "flex",
              justifyContent: "center",
              gap: 40,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  color: "#EDEDF5",
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {credits.scan_credits ?? "-"}
              </div>
              <div style={{ color: "#5E5E78", fontSize: 12, marginTop: 4 }}>
                完整体检次数
              </div>
            </div>
            <div style={{ width: 1, background: "#222228", alignSelf: "stretch" }} />
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  color: "#EDEDF5",
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {credits.probe_credits ?? "-"}
              </div>
              <div style={{ color: "#5E5E78", fontSize: 12, marginTop: 4 }}>
                Probe 次数
              </div>
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <button
            onClick={() => router.push("/scan")}
            style={{
              width: "100%",
              padding: "14px 24px",
              background: "#3B82F6",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          >
            开始体检
          </button>
          <button
            onClick={() => router.push("/scan")}
            style={{
              width: "100%",
              padding: "12px 24px",
              background: "transparent",
              color: "#5E5E78",
              border: "1px solid #222228",
              borderRadius: 10,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          >
            返回仪表盘
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ color: "#3D3D50", fontSize: 12, marginTop: 24 }}
        >
          如有问题，请联系 support@citeflow.cn
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function PaySuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#0A0A0F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
