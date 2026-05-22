"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ScanDoctorBriefingProps {
  /** 诊断数据（来自 Analyst 输出），用于显示摘要 */
  data: any;
  /** 生成完成后回调，传入 Doctor API 返回的处方数据 */
  onComplete: (doctorOutput: any) => void;
}

export function ScanDoctorBriefing({ data, onComplete }: ScanDoctorBriefingProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const oneLineVerdict = data?.one_line_verdict || "";
  const diagnosis = data?.diagnosis || {};
  const coreProblem = diagnosis?.core_problem || "";
  const severity = diagnosis?.severity || "healthy";
  const competitorGap = data?.competitor_gap || {};
  const losingCount = competitorGap?.losing_dimensions?.length || 0;

  const severityLabel =
    severity === "critical" ? "严重" : severity === "warning" ? "警告" : "健康";
  const severityColor =
    severity === "critical"
      ? "#EF4444"
      : severity === "warning"
      ? "#F59E0B"
      : "#22C55E";

  const hasDiagnosis = !!(coreProblem || oneLineVerdict || diagnosis?.core_problem);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/doctor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_input: {
            domain: data?.domain || data?.scanDomain || "",
            brand_name: data?.brandName || data?.brand_name || "",
          },
          analyst_output: data || {},
          probe_output: data?.probe || data || {},
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }
      const result = await res.json();
      onComplete(result);
    } catch (e: any) {
      const msg = e?.message || "处方生成失败，请重试";
      setError(msg);
      setGenerating(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100%",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
        }}
      >
        {/* ── 标题 ── */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>💊</span>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#EDEDF5",
              margin: 0,
              marginBottom: 4,
              letterSpacing: "-0.01em",
            }}
          >
            Doctor 处方生成
          </h2>
          <p style={{ fontSize: 13, color: "#6A6A82", margin: 0 }}>
            基于诊断结果生成优化处方
          </p>
        </div>

        {/* ── 诊断摘要卡片 ── */}
        <div
          style={{
            background: hasDiagnosis
              ? "rgba(255,255,255,0.02)"
              : "rgba(255,255,255,0.01)",
            border: "1px solid rgba(56,189,248,0.10)",
            padding: "20px 24px",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(56,189,248,0.5)",
              margin: 0,
              marginBottom: 12,
            }}
          >
            诊断摘要
          </p>

          {hasDiagnosis ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* 核心问题 */}
              {coreProblem && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#5E5E78", whiteSpace: "nowrap" }}>
                    核心问题:
                  </span>
                  <span style={{ fontSize: 13, color: "#C8C8D8", lineHeight: 1.5 }}>
                    {coreProblem}
                  </span>
                </div>
              )}

              {/* 严重程度 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#5E5E78", whiteSpace: "nowrap" }}>
                  严重程度:
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: severityColor,
                    padding: "2px 8px",
                    background: `${severityColor}15`,
                    border: `1px solid ${severityColor}30`,
                  }}
                >
                  {severity === "critical" ? "⚠️" : severity === "warning" ? "⚡" : "✅"}{" "}
                  {severityLabel}
                </span>
              </div>

              {/* 一句话诊断 */}
              {oneLineVerdict && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#5E5E78", whiteSpace: "nowrap" }}>
                    一句话:
                  </span>
                  <span style={{ fontSize: 13, color: "#C8C8D8", lineHeight: 1.5 }}>
                    {oneLineVerdict}
                  </span>
                </div>
              )}

              {/* 竞品差距 */}
              {losingCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "#5E5E78", whiteSpace: "nowrap" }}>
                    竞品差距:
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#F59E0B",
                      padding: "2px 8px",
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.18)",
                    }}
                  >
                    {losingCount} 个维度落后于竞品
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "24px 0",
              }}
            >
              <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>📋</span>
              <p style={{ fontSize: 13, color: "#6A6A82", margin: 0 }}>
                暂无诊断数据，请先运行 Analyst 诊断
              </p>
            </div>
          )}
        </div>

        {/* ── 将生成的处方类别 ── */}
        {hasDiagnosis && (
          <div
            style={{
              background: "rgba(255,255,255,0.012)",
              border: "1px solid rgba(255,255,255,0.05)",
              padding: "16px 24px",
              marginBottom: 32,
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.18)",
                margin: 0,
                marginBottom: 10,
              }}
            >
              将生成 4 类处方
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {["技术优化", "内容优化", "权威建设", "社区运营"].map((cat) => (
                <span
                  key={cat}
                  style={{
                    fontSize: 12,
                    color: "#9A9AB0",
                    padding: "4px 10px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── 错误提示 ── */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.18)",
              padding: "12px 16px",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 12, color: "#EF4444", margin: 0 }}>{error}</p>
          </motion.div>
        )}

        {/* ── 生成按钮 ── */}
        {hasDiagnosis && (
          <div style={{ textAlign: "center" }}>
            <motion.button
              onClick={handleGenerate}
              disabled={generating}
              whileHover={{ scale: generating ? 1 : 1.02 }}
              whileTap={{ scale: generating ? 1 : 0.98 }}
              style={{
                padding: "12px 40px",
                fontSize: 15,
                fontWeight: 600,
                background: generating
                  ? "rgba(56,189,248,0.15)"
                  : "linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)",
                color: generating ? "rgba(255,255,255,0.3)" : "#FFF",
                border: "none",
                cursor: generating ? "not-allowed" : "pointer",
                boxShadow: generating
                  ? "none"
                  : "0 4px 12px rgba(56,189,248,0.3)",
                transition: "all 0.3s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {generating ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderTopColor: "rgba(255,255,255,0.5)",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  生成中...
                </>
              ) : (
                "生成处方 →"
              )}
            </motion.button>

            {/* spinner keyframes injected via style tag — harmless duplication, only one needed */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>
    </motion.div>
  );
}
