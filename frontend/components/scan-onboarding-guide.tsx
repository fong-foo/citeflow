"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingGuideProps {
  onStart: () => void;
}

// ─── State machine ─────────────────────────────────────

type GuideState =
  | "greeting"
  | "show_probe"
  | "probe_tip"
  | "show_analyst"
  | "show_doctor"
  | "cta"
  | "done";

interface GuideMessage {
  id: number;
  sender: "guide";
  content: string;
  type: "text" | "typing" | "product_card" | "highlight";
  productIndex?: number;
}

interface ProductIntro {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  items: string[];
}

const PRODUCTS: ProductIntro[] = [
  {
    icon: "🔬",
    title: "Probe 侦察兵",
    subtitle: "AI 引用率扫描",
    description: "扫描 ChatGPT / Gemini / Claude 等 AI 引擎，看看它们怎么描述你的品牌。",
    items: [
      "综合评分、引用率、推荐率",
      "AI 描述原文（它怎么说你）",
      "三大引擎视角差异",
      "竞品对比（谁赢了你）",
    ],
  },
  {
    icon: "🩺",
    title: "Analyst 诊断师",
    subtitle: "14 条规则诊断",
    description: '不是给你打分，是告诉你"为什么 AI 不推荐你"。',
    items: [
      "结构化数据是否缺失",
      "内容是否足够权威",
      "技术 SEO 是否有问题",
      "AI 可发现性诊断",
    ],
  },
  {
    icon: "💊",
    title: "Doctor 处方",
    subtitle: "分步执行清单",
    description: "不是一份 PDF 报告。是可执行的任务清单，做完一条勾一条。",
    items: [
      "P0 紧急：立即修复的关键问题",
      "P1 重要：两周内优化",
      "P2 建议：长期建设",
    ],
  },
];

const GREETING_LINES = [
  "欢迎来到 CiteFlow 体检中心。我是你的 AI 体检顾问。",
  "在开始之前，让我介绍一下我们的三层诊断体系——从体检到处方，每一步都有据可查。",
];

let msgId = 0;

function fmtTime(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ─── Component ─────────────────────────────────────────

export function ScanOnboardingGuide({ onStart }: OnboardingGuideProps) {
  const [state, setState] = useState<GuideState>("greeting");
  const [messages, setMessages] = useState<GuideMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); };
  }, []);

  function addMessage(msg: Omit<GuideMessage, "id">) {
    setMessages((prev) => [...prev, { ...msg, id: ++msgId }]);
  }

  function typeMessage(text: string, onDone: () => void, finalType: "text" | "highlight" = "text") {
    const id = ++msgId;
    let i = 0;
    setMessages((prev) => [...prev, { id, sender: "guide", content: "", type: "typing" }]);
    function tick() {
      i++;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: text.slice(0, i) } : m)));
      if (i < text.length) {
        typingTimerRef.current = setTimeout(tick, 24);
      } else {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, type: finalType } : m)));
        onDone();
      }
    }
    typingTimerRef.current = setTimeout(tick, 24);
  }

  // ─── State machine ──────────────────────────────────

  useEffect(() => {
    if (state === "greeting") {
      let idx = 0;
      const next = () => {
        if (idx < GREETING_LINES.length) {
          typeMessage(GREETING_LINES[idx++], next);
        } else {
          setTimeout(() => setState("show_probe"), 200);
        }
      };
      next();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (state === "show_probe") {
      addMessage({ sender: "guide", content: "", type: "product_card", productIndex: 0 });
      setTimeout(() => setState("probe_tip"), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (state === "probe_tip") {
      typeMessage("第一次是摸底，第二次是验证。按处方改完回来复查，引用率涨了才叫有用。", () => {
        setTimeout(() => setState("show_analyst"), 200);
      }, "highlight");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (state === "show_analyst") {
      addMessage({ sender: "guide", content: "", type: "product_card", productIndex: 1 });
      setTimeout(() => setState("show_doctor"), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (state === "show_doctor") {
      addMessage({ sender: "guide", content: "", type: "product_card", productIndex: 2 });
      setTimeout(() => setState("cta"), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (state === "cta") {
      typeMessage("准备好给你的品牌做一次 AI 体检了吗？输入域名，5 分钟出第一份报告。", () => {
        setState("done");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // ─── Render ─────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      style={{
        width: "100%",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        minHeight: 0,
      }}
    >
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: 4,
          paddingBottom: 24,
          position: "relative",
          zIndex: 10,
        }}
      >
        <AnimatePresence>
          {messages.map((msg, idx) => {
            const isPrevSame = idx > 0 && messages[idx - 1].sender === msg.sender;
            const showAvatar = !isPrevSame;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, filter: "blur(2px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  marginTop: isPrevSame ? 1 : 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 4, maxWidth: "100%" }}>
                  {showAvatar ? <ProbeAvatar /> : <div style={{ width: 16 }} />}

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
                    {!isPrevSame && (
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 8,
                          letterSpacing: "0.06em",
                          color: "rgba(255,255,255,0.14)",
                          marginBottom: 2,
                        }}
                      >
                        {fmtTime(new Date())}
                      </span>
                    )}

                    {msg.type === "product_card" ? (
                      <ProductCard product={PRODUCTS[msg.productIndex!]} />
                    ) : msg.type === "highlight" ? (
                      <HighlightBubble>
                        <span style={{ fontSize: 13, lineHeight: 1.7, fontWeight: 500 }}>
                          {msg.content}
                        </span>
                      </HighlightBubble>
                    ) : (
                      <TransmissionBubble>
                        {msg.type === "typing" && !msg.content ? (
                          <SpectralDots />
                        ) : (
                          <span style={{ fontSize: 12, lineHeight: 1.6 }}>
                            {msg.content}
                          </span>
                        )}
                      </TransmissionBubble>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* CTA button (appears when done) */}
      <AnimatePresence>
        {state === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            style={{
              padding: "12px 0 8px",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              position: "relative",
              zIndex: 10,
            }}
          >
            <button
              onClick={onStart}
              style={{
                width: "100%",
                padding: "12px 0",
                background: "#38BDF8",
                border: "none",
                color: "#06060C",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.04em",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#7DD3FC";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(56,189,248,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#38BDF8";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              免费开始初步体检
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Sub-components ────────────────────────────────────

function ProbeAvatar() {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: 2,
        background: "rgba(56,189,248,0.06)",
        border: "1px solid rgba(56,189,248,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="#7DD3FC" strokeWidth="0.8" opacity="0.4" />
        <circle cx="6" cy="6" r="1.5" stroke="#7DD3FC" strokeWidth="0.8" opacity="0.9" />
        <line x1="6" y1="1.5" x2="6" y2="3.5" stroke="#7DD3FC" strokeWidth="0.8" />
        <line x1="6" y1="8.5" x2="6" y2="10.5" stroke="#7DD3FC" strokeWidth="0.8" />
        <line x1="1.5" y1="6" x2="3.5" y2="6" stroke="#7DD3FC" strokeWidth="0.8" opacity="0.5" />
        <line x1="8.5" y1="6" x2="10.5" y2="6" stroke="#7DD3FC" strokeWidth="0.8" opacity="0.5" />
      </svg>
    </div>
  );
}

function SpectralDots() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, height: 14 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: "#7DD3FC",
            display: "inline-block",
            animation: `spectralPulse 1.6s ease-in-out ${i * 0.25}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

function TransmissionBubble({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "inline-block",
        maxWidth: "100%",
        background: "rgba(10, 15, 30, 0.75)",
        border: "1px solid rgba(56, 189, 248, 0.06)",
        borderRadius: 2,
        padding: "10px 14px",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 1,
          background: "linear-gradient(180deg, transparent 0%, rgba(56,189,248,0.2) 20%, rgba(56,189,248,0.2) 80%, transparent 100%)",
          borderRadius: "0 1px 1px 0",
        }}
      />
      {children}
    </div>
  );
}

function HighlightBubble({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ borderColor: "rgba(56,189,248,0.10)", boxShadow: "0 0 0 rgba(56,189,248,0)" }}
      animate={{
        borderColor: ["rgba(56,189,248,0.15)", "rgba(56,189,248,0.35)", "rgba(56,189,248,0.15)"],
        boxShadow: [
          "0 0 0 rgba(56,189,248,0)",
          "0 0 24px rgba(56,189,248,0.12)",
          "0 0 0 rgba(56,189,248,0)",
        ],
      }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      style={{
        display: "inline-block",
        maxWidth: "100%",
        background: "rgba(56,189,248,0.04)",
        border: "1px solid rgba(56,189,248,0.15)",
        borderRadius: 2,
        padding: "12px 16px",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        overflow: "hidden",
        position: "relative",
        color: "#7DD3FC",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 1,
          background: "rgba(56,189,248,0.5)",
        }}
      />
      {children}
    </motion.div>
  );
}

function ProductCard({ product }: { product: ProductIntro }) {
  return (
    <TransmissionBubble>
      <div style={{ minWidth: 280 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>{product.icon}</span>
          <div>
            <div style={{ color: "#EDEDF5", fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
              {product.title}
            </div>
            <div style={{ color: "#5E5E78", fontSize: 11, marginTop: 1 }}>
              {product.subtitle}
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ color: "#9A9AB0", fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>
          {product.description}
        </p>

        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {product.items.map((item) => (
            <div
              key={item}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontSize: 11,
                color: "#9A9AB0",
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: "#3B82F6", flexShrink: 0, marginTop: 1 }}>─</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </TransmissionBubble>
  );
}
