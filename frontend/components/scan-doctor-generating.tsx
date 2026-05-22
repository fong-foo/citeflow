"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface ScanDoctorGeneratingProps {
  /** 4 个类别依次亮起的延迟（ms），默认 600 */
  stepDelay?: number;
}

const CATEGORIES = [
  { key: "tech", label: "技术优化", icon: "🔧", papers: 3 },
  { key: "content", label: "内容优化", icon: "📝", papers: 7 },
  { key: "authority", label: "权威建设", icon: "🏆", papers: 12 },
  { key: "community", label: "社区运营", icon: "👥", papers: 4 },
];

export function ScanDoctorGenerating({ stepDelay = 600 }: ScanDoctorGeneratingProps) {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    // Start the first card immediately
    const startTimer = setTimeout(() => {
      setActiveIndex(0);
    }, 100);

    return () => clearTimeout(startTimer);
  }, []);

  useEffect(() => {
    if (activeIndex < 0) return;
    if (activeIndex >= CATEGORIES.length - 1) return;

    const timer = setTimeout(() => {
      setActiveIndex((prev) => prev + 1);
    }, stepDelay);

    return () => clearTimeout(timer);
  }, [activeIndex, stepDelay]);

  const allDone = activeIndex >= CATEGORIES.length - 1;

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
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* ── 标题 ── */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <motion.span
            style={{ fontSize: 32, display: "block", marginBottom: 8 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            💊
          </motion.span>
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
            正在生成处方...
          </h2>
          <p style={{ fontSize: 13, color: "#6A6A82", margin: 0 }}>
            分析诊断结果，匹配知识库论文
          </p>
        </div>

        {/* ── 4 张类别卡片 ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {CATEGORIES.map((cat, i) => {
            const isActive = i <= activeIndex;
            return (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 18px",
                  background: isActive
                    ? "rgba(56,189,248,0.04)"
                    : "rgba(255,255,255,0.01)",
                  border: `1px solid ${
                    isActive ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.04)"
                  }`,
                  opacity: isActive ? 1 : 0.4,
                  transition: "all 0.5s ease",
                }}
              >
                {/* Icon */}
                <span style={{ fontSize: 20, flexShrink: 0 }}>{cat.icon}</span>

                {/* Label */}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: isActive ? "#C8C8D8" : "#5E5E78",
                    flex: 1,
                  }}
                >
                  {cat.label}
                </span>

                {/* Status */}
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: isActive ? "#38BDF8" : "#3A3A48",
                    flexShrink: 0,
                  }}
                >
                  {isActive ? "✓" : "⋯"} 匹配论文 {cat.papers} 条
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* ── 底部文字：全部亮起后出现 ── */}
        {allDone && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "#6A6A82",
              margin: 0,
            }}
          >
            正在生成 P0/P1/P2 任务清单...
            <motion.span
              style={{ display: "inline-block", marginLeft: 2 }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              ...
            </motion.span>
          </motion.p>
        )}

        {/* ── 脉冲点指示器（前3张卡片期间） ── */}
        {!allDone && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {CATEGORIES.map((cat, i) => {
              const isActive = i <= activeIndex;
              const isCurrent = i === activeIndex + 1;
              return (
                <span
                  key={cat.key}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: isActive
                      ? "#38BDF8"
                      : isCurrent
                      ? "rgba(56,189,248,0.3)"
                      : "rgba(255,255,255,0.06)",
                    transition: "all 0.5s ease",
                    boxShadow: isActive
                      ? "0 0 6px rgba(56,189,248,0.4)"
                      : "none",
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
