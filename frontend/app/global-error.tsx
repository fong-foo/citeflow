"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CiteFlow] Global error:", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          background: "#08080D",
          color: "#EDEDF5",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            padding: "32px",
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.20)",
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: "#EF4444", margin: "0 0 8px" }}>
            页面崩溃
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#9A9AB0",
              margin: "0 0 16px",
              wordBreak: "break-word",
              lineHeight: 1.6,
            }}
          >
            {error.message || "未知错误"}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "8px 20px",
              fontSize: 12,
              fontWeight: 600,
              background: "rgba(56,189,248,0.12)",
              border: "1px solid rgba(56,189,248,0.22)",
              color: "#7DD3FC",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
