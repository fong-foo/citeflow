"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { clearUserData } from "@/lib/storage";

export function AppNavbar() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cf_user");
      if (raw) {
        const user = JSON.parse(raw);
        setEmail(user.email || "");
      }
    } catch {}
  }, []);

  function handleLogout() {
    clearUserData();
    window.location.href = "/";
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-6"
      style={{
        background: "rgba(10,10,15,0.92)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/scan" className="flex items-center gap-2.5 group">
          <svg viewBox="0 0 8 8" width="20" height="20" style={{ imageRendering: "pixelated" }}>
            <rect x="2" y="1" width="4" height="1" fill="#38BDF8" opacity="0.8" />
            <rect x="1" y="2" width="1" height="1" fill="#38BDF8" opacity="0.8" />
            <rect x="1" y="3" width="1" height="1" fill="#38BDF8" opacity="0.8" />
            <rect x="1" y="4" width="1" height="1" fill="#38BDF8" opacity="0.8" />
            <rect x="1" y="5" width="1" height="1" fill="#38BDF8" opacity="0.8" />
            <rect x="2" y="6" width="4" height="1" fill="#38BDF8" opacity="0.8" />
          </svg>
          <span className="text-sm font-medium tracking-tight text-[#C8C8D8] group-hover:text-white transition-colors duration-300">
            CiteFlow
          </span>
          <span className="text-[10px] tracking-wider px-2 py-0.5 rounded-sm text-[#38BDF8]" style={{ background: "rgba(56,189,248,0.08)" }}>
            体检中心
          </span>
        </Link>

        {/* Right: User + Logout */}
        <div className="flex items-center gap-4">
          {email && (
            <span className="text-xs text-[#6E6E88] hidden sm:block">
              {email}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-[#5E5E78] hover:text-[#EF4444] transition-colors duration-300 px-3 py-1.5 rounded-sm"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            退出登录
          </button>
        </div>
      </div>
    </nav>
  );
}
