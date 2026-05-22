"use client";

import { useEffect } from "react";

export default function EnterPage() {
  useEffect(() => {
    const token = localStorage.getItem("cf_token");
    if (token) {
      window.location.href = "/scan";
    } else {
      window.location.href = "/login";
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="w-5 h-5 border-2 rounded-full animate-spin"
        style={{
          borderColor: "rgba(56,189,248,0.15)",
          borderTopColor: "#38BDF8",
        }}
      />
    </div>
  );
}
