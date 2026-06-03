"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ContentTemplatesData {
  page_title?: string;
  meta_description?: string;
  about_us_opening?: string;
  social_bio?: string;
  faq_pairs?: Array<{ q: string; a: string }>;
  keywords_to_emphasize?: string[];
  keywords_to_avoid?: string[];
  key_content_action?: string;
}

interface Props {
  data: ContentTemplatesData | null;
}

export function ScanDoctorContentTemplates({ data }: Props) {
  const [expandedFaqs, setExpandedFaqs] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [copyAllLabel, setCopyAllLabel] = useState("一键复制全部");

  if (!data) return null;

  const hasAny = !!(
    data.page_title || data.meta_description || data.about_us_opening ||
    data.social_bio || (data.faq_pairs && data.faq_pairs.length > 0) ||
    (data.keywords_to_emphasize && data.keywords_to_emphasize.length > 0) ||
    (data.keywords_to_avoid && data.keywords_to_avoid.length > 0) ||
    data.key_content_action
  );

  if (!hasAny) return null;

  // 此后 data 非 null（已在上面 return）
  const d = data;

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast(`已复制 ${label}`);
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast("复制失败");
      setTimeout(() => setToast(null), 2000);
    }
  }

  function copyAll() {
    const lines: string[] = [];
    if (d.page_title) { lines.push("=== Page Title ==="); lines.push(d.page_title); lines.push(""); }
    if (d.meta_description) { lines.push("=== Meta Description ==="); lines.push(d.meta_description); lines.push(""); }
    if (d.about_us_opening) { lines.push("=== About Us 开篇 ==="); lines.push(d.about_us_opening); lines.push(""); }
    if (d.social_bio) { lines.push("=== 社媒 Bio ==="); lines.push(d.social_bio); lines.push(""); }
    if (d.faq_pairs?.length) {
      lines.push("=== FAQ ===");
      d.faq_pairs.forEach((faq) => {
        lines.push(`Q: ${faq.q}`);
        lines.push(`A: ${faq.a}`);
        lines.push("");
      });
    }
    const all = lines.join("\n");
    navigator.clipboard.writeText(all).then(() => {
      setCopyAllLabel("已复制！");
      setTimeout(() => setCopyAllLabel("一键复制全部"), 1500);
    }).catch(() => {
      setCopyAllLabel("复制失败");
      setTimeout(() => setCopyAllLabel("一键复制全部"), 1500);
    });
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(56,189,248,0.5)",
    marginBottom: 4,
  };

  const copyBtnStyle: React.CSSProperties = {
    fontSize: 10,
    fontFamily: "'JetBrains Mono', monospace",
    padding: "2px 8px",
    color: "#7DD3FC",
    background: "rgba(59,130,246,0.06)",
    border: "1px solid rgba(59,130,246,0.12)",
    cursor: "pointer",
    flexShrink: 0,
    transition: "background 0.2s",
  };

  const cardStyle: React.CSSProperties = {
    background: "#131318",
    border: "1px solid rgba(255,255,255,0.04)",
    padding: "20px 24px",
    marginBottom: 20,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <span style={{
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(56,189,248,0.5)",
            }}>
              内容模版（可直接复制使用）
            </span>
          </div>
          <motion.button
            onClick={copyAll}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              ...copyBtnStyle,
              padding: "6px 14px",
              fontSize: 11,
            }}
          >
            {copyAllLabel}
          </motion.button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Page Title */}
          {data.page_title && (
            <FieldBlock label="Page Title" text={data.page_title} onCopy={() => copyText(data.page_title!, "Page Title")} />
          )}

          {/* Meta Description */}
          {data.meta_description && (
            <FieldBlock label="Meta Description" text={data.meta_description} onCopy={() => copyText(data.meta_description!, "Meta Description")} />
          )}

          {/* About Us */}
          {data.about_us_opening && (
            <FieldBlock label="About Us 开篇" text={data.about_us_opening} multiline onCopy={() => copyText(data.about_us_opening!, "About Us")} />
          )}

          {/* Social Bio */}
          {data.social_bio && (
            <FieldBlock label="社媒 Bio" text={data.social_bio} multiline onCopy={() => copyText(data.social_bio!, "社媒 Bio")} />
          )}

          {/* FAQ */}
          {data.faq_pairs && data.faq_pairs.length > 0 && (
            <div>
              <p style={labelStyle}>FAQ 问答对</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.faq_pairs.map((faq, i) => {
                  const isOpen = expandedFaqs.has(i);
                  return (
                    <div key={i} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <button
                        onClick={() => {
                          const next = new Set(expandedFaqs);
                          if (next.has(i)) next.delete(i); else next.add(i);
                          setExpandedFaqs(next);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 14px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          color: "#C8C8D8",
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>Q: {faq.q}</span>
                        <span style={{ color: "#5E5E78", fontSize: 10 }}>{isOpen ? "▲" : "▼"}</span>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: "hidden" }}
                          >
                            <div style={{ padding: "0 14px 14px", display: "flex", gap: 12 }}>
                              <p style={{ flex: 1, fontSize: 12, color: "#9A9AB0", margin: 0, lineHeight: 1.6 }}>
                                A: {faq.a}
                              </p>
                              <button
                                onClick={() => copyText(faq.a, `FAQ ${i + 1}`)}
                                style={copyBtnStyle}
                              >
                                复制
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Keywords */}
          {(data.keywords_to_emphasize?.length || data.keywords_to_avoid?.length) ? (
            <div>
              {data.keywords_to_emphasize && data.keywords_to_emphasize.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ ...labelStyle, color: "rgba(34,197,94,0.5)" }}>强调关键词</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {data.keywords_to_emphasize.map((kw, i) => (
                      <span key={i} style={{
                        fontSize: 10, padding: "2px 8px",
                        background: "rgba(34,197,94,0.06)", color: "#22C55E",
                        border: "1px solid rgba(34,197,94,0.12)",
                      }}>{kw}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.keywords_to_avoid && data.keywords_to_avoid.length > 0 && (
                <div>
                  <p style={{ ...labelStyle, color: "rgba(239,68,68,0.5)" }}>避免关键词</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {data.keywords_to_avoid.map((kw, i) => (
                      <span key={i} style={{
                        fontSize: 10, padding: "2px 8px",
                        background: "rgba(239,68,68,0.06)", color: "#EF4444",
                        border: "1px solid rgba(239,68,68,0.12)",
                      }}>{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Key Action */}
          {data.key_content_action && (
            <div style={{
              padding: "12px 16px",
              background: "rgba(59,130,246,0.03)",
              border: "1px solid rgba(59,130,246,0.08)",
            }}>
              <p style={{ ...labelStyle, marginBottom: 4 }}>优先行动</p>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <p style={{ flex: 1, fontSize: 12, color: "#7DD3FC", margin: 0, lineHeight: 1.5 }}>
                  {data.key_content_action}
                </p>
                <button onClick={() => copyText(data.key_content_action!, "优先行动")} style={copyBtnStyle}>复制</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          style={{
            position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
            zIndex: 999, padding: "8px 16px", fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            background: "#131318", border: "1px solid rgba(59,130,246,0.22)",
            color: "#7DD3FC",
          }}
        >
          {toast}
        </motion.div>
      )}
    </motion.div>
  );
}

function FieldBlock({ label, text, multiline, onCopy }: {
  label: string;
  text: string;
  multiline?: boolean;
  onCopy: () => void;
}) {
  return (
    <div style={{
      padding: "10px 14px",
      background: "rgba(255,255,255,0.015)",
      border: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.2)",
            marginBottom: 4,
          }}>{label}</p>
          <p style={{
            fontSize: 12,
            color: "#C8C8D8",
            margin: 0,
            lineHeight: 1.6,
            whiteSpace: multiline ? "pre-wrap" : "nowrap",
            overflow: multiline ? "visible" : "hidden",
            textOverflow: multiline ? "clip" : "ellipsis",
          }}>{text}</p>
        </div>
        <button
          onClick={onCopy}
          style={{
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            padding: "3px 10px",
            color: "#7DD3FC",
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.12)",
            cursor: "pointer",
            flexShrink: 0,
            marginTop: 2,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.14)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.06)"; }}
        >
          复制
        </button>
      </div>
    </div>
  );
}
