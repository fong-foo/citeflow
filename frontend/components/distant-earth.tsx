"use client";

/* ═══════════════════════════════════════════
   远景地球 — 自转 + 大气层辉光
   深空背景左上角，体现品牌全球视野
   ═══════════════════════════════════════════ */
export function DistantEarth() {
  return (
    <div className="fixed pointer-events-none z-0" style={{ left: "-6%", top: "8%", width: 360, height: 360 }}>
      {/* 外层大气辉光 */}
      <div
        className="absolute rounded-full"
        style={{
          inset: -20,
          background: "radial-gradient(circle, rgba(56,160,220,0.10) 55%, rgba(56,140,200,0.04) 70%, transparent 85%)",
          filter: "blur(8px)",
          animation: "atmosphereBreath 4s ease-in-out infinite",
        }}
      />

      {/* 地球本体 — 海洋底色 */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          inset: 0,
          background: "radial-gradient(circle at 65% 40%, #1a5c8a 0%, #0d3b5c 35%, #0a2a40 65%, #061e2f 100%)",
          boxShadow: "inset -20px -10px 60px rgba(0,0,0,0.5), inset 10px 5px 30px rgba(100,180,220,0.15)",
        }}
      >
        {/* 旋转的大陆纹理 — 图层1: 大块陆地 */}
        <div
          className="absolute"
          style={{
            width: "200%",
            height: "100%",
            left: "-50%",
            background: `
              radial-gradient(ellipse at 25% 35%, rgba(40,120,70,0.55) 0%, transparent 28%),
              radial-gradient(ellipse at 28% 30%, rgba(60,140,80,0.40) 0%, transparent 22%),
              radial-gradient(ellipse at 58% 45%, rgba(35,100,60,0.50) 0%, transparent 30%),
              radial-gradient(ellipse at 62% 42%, rgba(55,130,75,0.45) 0%, transparent 24%),
              radial-gradient(ellipse at 75% 55%, rgba(30,95,55,0.40) 0%, transparent 26%),
              radial-gradient(ellipse at 80% 20%, rgba(45,115,65,0.35) 0%, transparent 20%),
              radial-gradient(ellipse at 15% 65%, rgba(35,110,60,0.35) 0%, transparent 22%),
              radial-gradient(ellipse at 42% 70%, rgba(50,125,70,0.38) 0%, transparent 25%),
              radial-gradient(ellipse at 70% 32%, rgba(40,135,72,0.32) 0%, transparent 18%)
            `,
            animation: "earthSpin 30s linear infinite",
          }}
        />

        {/* 旋转的云层 */}
        <div
          className="absolute"
          style={{
            width: "200%",
            height: "100%",
            left: "-50%",
            background: `
              radial-gradient(ellipse at 20% 25%, rgba(255,255,255,0.10) 0%, transparent 35%),
              radial-gradient(ellipse at 45% 40%, rgba(255,255,255,0.08) 0%, transparent 30%),
              radial-gradient(ellipse at 68% 30%, rgba(255,255,255,0.09) 0%, transparent 32%),
              radial-gradient(ellipse at 85% 50%, rgba(255,255,255,0.07) 0%, transparent 28%),
              radial-gradient(ellipse at 10% 55%, rgba(255,255,255,0.08) 0%, transparent 30%),
              radial-gradient(ellipse at 52% 60%, rgba(255,255,255,0.06) 0%, transparent 28%)
            `,
            animation: "earthSpin 22s linear infinite",
          }}
        />

        {/* 球体光影 — 左上亮、右下暗 */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, transparent 30%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.55) 100%)",
            boxShadow: "inset 15px -8px 40px rgba(0,0,0,0.4)",
          }}
        />

        {/* 镜面高光 */}
        <div
          className="absolute rounded-full"
          style={{
            width: "45%",
            height: "25%",
            left: "28%",
            top: "18%",
            background: "radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 70%)",
            transform: "rotate(-15deg)",
            filter: "blur(4px)",
          }}
        />
      </div>

      {/* 动画keyframes */}
      <style jsx>{`
        @keyframes earthSpin {
          from { transform: translateX(0); }
          to { transform: translateX(50%); }
        }
        @keyframes atmosphereBreath {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
