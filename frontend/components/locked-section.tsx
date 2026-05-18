"use client";

import { motion } from "framer-motion";

interface Props {
  title: string;
  description?: string;
  children?: React.ReactNode;
  lockPrice?: string;
  onUpgrade: () => void;
  onClick?: () => void;
}

export function LockedSection({ title, description, children, lockPrice, onUpgrade, onClick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "relative",
        marginBottom: 32,
        overflow: "hidden",
        flexShrink: 0,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
      whileHover={onClick ? { borderColor: "rgba(245,158,11,0.25)" } : undefined}
    >
      {/* Blurred content area */}
      <div
        style={{
          filter: "blur(8px)",
          opacity: 0.22,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {children || (
          <div style={{ height: 128, background: "rgba(255,255,255,0.02)" }} />
        )}
      </div>

      {/* Lock overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, rgba(8,8,13,0.3) 0%, rgba(8,8,13,0.78) 50%, rgba(8,8,13,0.3) 100%)",
        }}
      >
        <span style={{ fontSize: 24, marginBottom: 12 }}>🔒</span>
        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#EDEDF5" }}>
          {title}
        </p>
        {description && (
          <p style={{ fontSize: 12, marginBottom: 16, color: "#9A9AB0", maxWidth: 280, textAlign: "center" }}>
            {description}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onUpgrade();
            }}
            style={{
              padding: "8px 20px",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.02em",
              background: "rgba(56,189,248,0.12)",
              border: "1px solid rgba(56,189,248,0.22)",
              color: "#7DD3FC",
              cursor: "pointer",
            }}
            whileHover={{
              background: "rgba(56,189,248,0.22)",
              borderColor: "rgba(56,189,248,0.40)",
              boxShadow: "0 0 24px rgba(56,189,248,0.08)",
            }}
          >
            {lockPrice ? `升级解锁 · ${lockPrice}` : "升级解锁"}
          </motion.button>
          {onClick && (
            <span style={{ fontSize: 11, color: "#5E5E78" }}>点击查看详情</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
