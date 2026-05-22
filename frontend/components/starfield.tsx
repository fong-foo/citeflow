"use client";

import { useMemo, useEffect, useState, useCallback } from "react";

interface Star {
  id: number;
  left: number;
  top: number;
  size: number;
  baseOpacity: number;
  depth: number;
  color: string;
  twinkleDuration: string;
  twinkleDelay: string;
}

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  angle: number;
  length: number;
  duration: string;
  delay: string;
}

/* ═══════════════════════════════════════════
   深空星场 — 三层星 + 星云带 + 宇宙尘埃 + 流星
   ═══════════════════════════════════════════ */
export function Starfield() {
  const [scrollY, setScrollY] = useState(0);

  /* ── 三层星星 ── */
  const stars = useMemo(() => {
    const layers: { depth: number; count: number; sizeRange: [number, number]; opacityRange: [number, number]; colors: string[] }[] = [
      { depth: 0.15, count: 120, sizeRange: [0.4, 1.0], opacityRange: [0.10, 0.35], colors: ["#c8d0ff", "#e8e8f0", "#d0d8ff", "#ffffff"] },
      { depth: 0.35, count: 60,  sizeRange: [0.8, 1.6], opacityRange: [0.20, 0.50], colors: ["#c0ccf8", "#e0e4f4", "#ffffff", "#b8c8ff"] },
      { depth: 0.55, count: 25,  sizeRange: [1.2, 2.4], opacityRange: [0.30, 0.65], colors: ["#a8bcf0", "#d8ddf0", "#ffffff", "#a0b8f8"] },
    ];

    const allStars: Star[] = [];
    let id = 0;
    layers.forEach((layer) => {
      for (let i = 0; i < layer.count; i++) {
        allStars.push({
          id: id++,
          left: Math.random() * 100,
          top: Math.random() * 100,
          size: layer.sizeRange[0] + Math.random() * (layer.sizeRange[1] - layer.sizeRange[0]),
          baseOpacity: layer.opacityRange[0] + Math.random() * (layer.opacityRange[1] - layer.opacityRange[0]),
          depth: layer.depth + (Math.random() * 0.08 - 0.04),
          color: layer.colors[Math.floor(Math.random() * layer.colors.length)],
          twinkleDuration: `${1.8 + Math.random() * 4}s`,
          twinkleDelay: `${Math.random() * 5}s`,
        });
      }
    });
    return allStars;
  }, []);

  /* ── 流星 ── */
  const shootingStars = useMemo<ShootingStar[]>(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      startX: 2 + Math.random() * 85,
      startY: 2 + Math.random() * 55,
      angle: 10 + Math.random() * 40,
      length: 80 + Math.random() * 180,
      duration: `${4 + Math.random() * 3}s`,
      delay: `${i * 2.5 + Math.random() * 3}s`,
    })),
  []);

  const handleScroll = useCallback(() => {
    setScrollY(window.scrollY);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const parallaxY = (depth: number) => scrollY * depth * 0.12;
  const parallaxX = (depth: number) => scrollY * depth * 0.03;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* ═══ 星云群 — 大尺度缓慢漂移 ═══ */}
      {/* 主星云：右侧大型蓝调 */}
      <div
        className="absolute rounded-full"
        style={{
          width: 900,
          height: 600,
          right: "-15%",
          top: `${12 + scrollY * 0.015}%`,
          background: "radial-gradient(ellipse at 40% 50%, rgba(30,60,180,0.07) 0%, rgba(20,40,140,0.03) 35%, transparent 65%)",
          filter: "blur(100px)",
          transform: `rotate(${scrollY * 0.008}deg)`,
        }}
      />
      {/* 左上星云 */}
      <div
        className="absolute rounded-full"
        style={{
          width: 650,
          height: 450,
          left: `${-8 + scrollY * 0.01}%`,
          top: `${5 + scrollY * 0.02}%`,
          background: "radial-gradient(ellipse at 60% 40%, rgba(20,50,160,0.05) 0%, rgba(15,35,120,0.02) 30%, transparent 60%)",
          filter: "blur(80px)",
          transform: `rotate(${-scrollY * 0.006}deg)`,
        }}
      />
      {/* 中下星云 */}
      <div
        className="absolute rounded-full"
        style={{
          width: 750,
          height: 400,
          left: `${30 + scrollY * 0.018}%`,
          top: `${55 + scrollY * 0.025}%`,
          background: "radial-gradient(ellipse at 50% 50%, rgba(25,45,150,0.04) 0%, rgba(15,30,100,0.015) 40%, transparent 70%)",
          filter: "blur(90px)",
          transform: `rotate(${scrollY * 0.005}deg)`,
        }}
      />
      {/* 小星云点缀 */}
      <div
        className="absolute rounded-full"
        style={{
          width: 400,
          height: 280,
          left: `${55 - scrollY * 0.012}%`,
          top: `${25 + scrollY * 0.022}%`,
          background: "radial-gradient(ellipse at 50% 50%, rgba(40,70,200,0.04) 0%, transparent 55%)",
          filter: "blur(60px)",
          transform: `rotate(${-scrollY * 0.007}deg)`,
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 350,
          height: 250,
          left: `${15 + scrollY * 0.016}%`,
          top: `${70 - scrollY * 0.02}%`,
          background: "radial-gradient(ellipse at 50% 50%, rgba(30,55,170,0.035) 0%, transparent 55%)",
          filter: "blur(55px)",
          transform: `rotate(${scrollY * 0.009}deg)`,
        }}
      />

      {/* ═══ 宇宙尘埃带 — 极淡的对角线光带 ═══ */}
      <div
        className="absolute"
        style={{
          width: 1400,
          height: 300,
          left: `${-20 + scrollY * 0.008}%`,
          top: `${40 + scrollY * 0.012}%`,
          background: "linear-gradient(105deg, transparent 20%, rgba(25,45,150,0.025) 40%, rgba(20,40,130,0.035) 50%, rgba(25,45,150,0.025) 60%, transparent 80%)",
          filter: "blur(40px)",
          transform: `rotate(${-3 + scrollY * 0.003}deg)`,
        }}
      />
      {/* 第二条更淡的尘埃带 */}
      <div
        className="absolute"
        style={{
          width: 1100,
          height: 200,
          left: `${-10 - scrollY * 0.006}%`,
          top: `${62 - scrollY * 0.01}%`,
          background: "linear-gradient(95deg, transparent 15%, rgba(20,35,140,0.018) 45%, rgba(18,30,120,0.025) 55%, transparent 85%)",
          filter: "blur(35px)",
          transform: `rotate(${2 - scrollY * 0.004}deg)`,
        }}
      />

      {/* ═══ 星空层 — 三层深度视差 ═══ */}
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `${s.left + parallaxX(s.depth)}%`,
            top: `${s.top + parallaxY(s.depth)}%`,
            width: s.size,
            height: s.size,
            backgroundColor: s.color,
            opacity: s.baseOpacity,
            boxShadow: s.size > 1.5 ? `0 0 ${s.size * 3}px ${s.size * 1.5}px ${s.color}20` : "none",
            animation: `starTwinkle ${s.twinkleDuration} ease-in-out ${s.twinkleDelay} infinite`,
          }}
        />
      ))}

      {/* ═══ 亮星点缀 — 带柔和光晕 ═══ */}
      {[
        { x: 22, y: 18, size: 3.0, depth: 0.48, color: "#d0dcff", glowAlpha: "0.35" },
        { x: 72, y: 28, size: 2.8, depth: 0.52, color: "#c8d4f8", glowAlpha: "0.30" },
        { x: 48, y: 62, size: 3.2, depth: 0.45, color: "#d8e0ff", glowAlpha: "0.38" },
        { x: 85, y: 55, size: 2.5, depth: 0.50, color: "#c0ccf0", glowAlpha: "0.28" },
        { x: 12, y: 75, size: 2.6, depth: 0.42, color: "#d4ddf8", glowAlpha: "0.30" },
      ].map((bs, i) => (
        <div key={`bright-${i}`}>
          <div
            className="absolute rounded-full"
            style={{
              left: `${bs.x + parallaxX(bs.depth)}%`,
              top: `${bs.y + parallaxY(bs.depth)}%`,
              width: bs.size,
              height: bs.size,
              backgroundColor: bs.color,
              opacity: 0.7,
              animation: `starTwinkle ${2.5 + i * 0.4}s ease-in-out ${i * 0.6}s infinite`,
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              left: `${bs.x + parallaxX(bs.depth) - bs.size * 2.5}%`,
              top: `${bs.y + parallaxY(bs.depth) - bs.size * 2.5}%`,
              width: bs.size * 6,
              height: bs.size * 6,
              background: `radial-gradient(circle, ${bs.color}${Math.round(parseFloat(bs.glowAlpha) * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
              filter: "blur(6px)",
              animation: `starTwinkle ${2.5 + i * 0.4}s ease-in-out ${i * 0.6}s infinite`,
            }}
          />
        </div>
      ))}

      {/* ═══ 流星 ═══ */}
      {shootingStars.map((ss) => (
        <div
          key={`shooting-${ss.id}`}
          className="absolute"
          style={{
            left: `${ss.startX}%`,
            top: `${ss.startY}%`,
            transform: `rotate(${ss.angle}deg)`,
            transformOrigin: "0 0",
          }}
        >
          <div
            className="absolute"
            style={{
              width: ss.length,
              height: 1.5,
              background: "linear-gradient(90deg, transparent, rgba(160,190,240,0.7) 30%, rgba(240,245,255,0.9) 50%, rgba(160,190,240,0.7) 70%, transparent)",
              opacity: 0,
              animation: `shootingStarTrail ${ss.duration} ease-out ${ss.delay} infinite`,
              filter: "blur(0.5px)",
            }}
          />
        </div>
      ))}

      <style jsx>{`
        @keyframes shootingStarTrail {
          0% { opacity: 0; transform: translateX(-60px); }
          3% { opacity: 0.9; }
          15% { opacity: 0.6; transform: translateX(200px); }
          25% { opacity: 0; transform: translateX(320px); }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
