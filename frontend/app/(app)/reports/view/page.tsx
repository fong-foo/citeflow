"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ScanResult } from "@/components/scan-result";
import { userKey } from "@/lib/storage";

export default function ReportViewPage() {
  const [report, setReport] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("cf_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    try {
      const raw = localStorage.getItem(userKey("cf_view_report"));
      if (raw) setReport(JSON.parse(raw));
    } catch {}
    setInitialized(true);
  }, []);

  if (!initialized) return null;

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#08080D" }}>
        <div className="text-center space-y-4">
          <p className="text-sm text-[#6A6A88]">未找到报告数据</p>
          <Link
            href="/reports"
            className="inline-block text-xs px-4 py-2 rounded-sm transition-all duration-300"
            style={{
              background: "rgba(56,189,248,0.06)",
              border: "1px solid rgba(56,189,248,0.12)",
              color: "#7DD3FC",
            }}
          >
            ← 返回报告历史
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#08080D" }}>
      {/* Measurement grid background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          opacity: 0.035,
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* ═══════ Top Bar ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        {/* Logo + Brand */}
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 8 8" width="20" height="20" style={{ imageRendering: "pixelated" }}>
            <rect x="2" y="1" width="4" height="1" fill="#38BDF8" opacity="0.9" />
            <rect x="1" y="2" width="1" height="1" fill="#38BDF8" opacity="0.9" />
            <rect x="1" y="3" width="1" height="1" fill="#38BDF8" opacity="0.9" />
            <rect x="1" y="4" width="1" height="1" fill="#38BDF8" opacity="0.9" />
            <rect x="1" y="5" width="1" height="1" fill="#38BDF8" opacity="0.9" />
            <rect x="2" y="6" width="4" height="1" fill="#38BDF8" opacity="0.9" />
          </svg>
          <span className="text-[13px] font-semibold tracking-tight text-[#D4D4E0]">
            CiteFlow
          </span>
          <span
            className="text-[9px] tracking-[0.06em] font-medium px-2 py-0.5 rounded-sm"
            style={{
              background: "rgba(56,189,248,0.06)",
              color: "rgba(56,189,248,0.6)",
            }}
          >
            报告阅览
          </span>
        </div>

        {/* Back to reports */}
        <Link
          href="/reports"
          className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.03em] transition-all duration-300 px-3 py-1.5 rounded-sm"
          style={{
            color: "#6A6A88",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#7DD3FC";
            e.currentTarget.style.borderColor = "rgba(56,189,248,0.18)";
            e.currentTarget.style.background = "rgba(56,189,248,0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#6A6A88";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>←</span>
          返回报告历史
        </Link>
      </motion.div>

      {/* ═══════ Report Content ═══════ */}
      <div className="relative z-10 flex-1 flex justify-center px-6 py-10">
        <ScanResult
          data={report.data}
          mode={report.mode || "light"}
          brandName={report.brandName || ""}
        />
      </div>
    </div>
  );
}
