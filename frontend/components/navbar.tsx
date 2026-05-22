"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";

const links = [
  { label: "首页", href: "/" },
  { label: "产品宗旨", href: "#mission" },
  { label: "为什么选我们", href: "#why-us" },
  { label: "产品", href: "#product" },
  { label: "定价", href: "#pricing" },
];

export function Navbar() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <motion.nav
      initial={{ y: -48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        height: scrolled ? 56 : 64,
        background: scrolled
          ? "rgba(13,13,21,0.97)"
          : "rgba(13,13,21,0.78)",
        borderBottom: scrolled
          ? "1px solid rgba(56,189,248,0.08)"
          : "1px solid rgba(255,255,255,0.03)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="mx-auto max-w-[1200px] px-8 md:px-12 h-full flex items-center justify-between">
        {/* Logo + 定位语 */}
        <motion.a
          href="/"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex flex-col"
        >
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 8 8" width="22" height="22" style={{ imageRendering: "pixelated" }}>
              <rect x="2" y="1" width="4" height="1" fill="#38BDF8" opacity="0.8" />
              <rect x="1" y="2" width="1" height="1" fill="#38BDF8" opacity="0.8" />
              <rect x="1" y="3" width="1" height="1" fill="#38BDF8" opacity="0.8" />
              <rect x="1" y="4" width="1" height="1" fill="#38BDF8" opacity="0.8" />
              <rect x="1" y="5" width="1" height="1" fill="#38BDF8" opacity="0.8" />
              <rect x="2" y="6" width="4" height="1" fill="#38BDF8" opacity="0.8" />
            </svg>
            <span className="text-base font-medium tracking-tight text-[#C8C8D8]">
              CiteFlow
            </span>
          </div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="hidden md:block text-[10px] tracking-wide mt-0.5"
            style={{ color: "rgba(255,255,255,0.50)" }}
          >
            深耕国外AI · 专注服务跨境出海品牌
          </motion.span>
        </motion.a>

        {/* Nav links */}
        <div className="flex items-center gap-8">
          {links.map(({ label, href }, i) => (
            <motion.a
              key={href}
              href={href}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.06, duration: 0.4 }}
              onMouseEnter={() => setHovered(href)}
              onMouseLeave={() => setHovered(null)}
              className="relative text-[13px] font-medium tracking-wide text-[#6E6E88] hover:text-[#C8C8D8] transition-colors duration-300"
            >
              {label}
              {hovered === href && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute -bottom-1.5 left-0 right-0 h-px"
                  style={{ background: "rgba(56,189,248,0.3)" }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                />
              )}
            </motion.a>
          ))}
        </div>

        {/* CTA */}
        <motion.a
          href="/enter"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 text-[13px] font-medium tracking-wide rounded-sm
            transition-all duration-300"
          style={{
            background: "rgba(56,189,248,0.08)",
            border: "1px solid rgba(56,189,248,0.15)",
            color: "#7DD3FC",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(56,189,248,0.14)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(56,189,248,0.25)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(56,189,248,0.08)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(56,189,248,0.15)";
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#38BDF8] opacity-40" style={{ animation: "luminousBreath 2s ease-in-out infinite" }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#38BDF8] opacity-70" />
          </span>
          进入体检中心
        </motion.a>
      </div>
    </motion.nav>
  );
}
