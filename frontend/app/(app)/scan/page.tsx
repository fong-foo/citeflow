"use client";

import { useState } from "react";

export default function ScanPage() {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      minHeight: "100vh", background: "#08080D", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{
        padding: 32, background: "rgba(34,197,94,0.06)",
        border: "1px solid rgba(34,197,94,0.20)", borderRadius: 4,
        textAlign: "center"
      }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#22C55E", margin: 0 }}>
          ULTRA MINIMAL — OK
        </p>
        <p style={{ fontSize: 12, color: "#9A9AB0", margin: "8px 0 0", fontFamily: "monospace" }}>
          count = {count}
        </p>
        <button onClick={() => setCount(c => c + 1)} style={{
          marginTop: 16, padding: "8px 20px", fontSize: 12,
          background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
          color: "#22C55E", borderRadius: 4, cursor: "pointer"
        }}>
          Click ({count})
        </button>
      </div>
    </div>
  );
}
