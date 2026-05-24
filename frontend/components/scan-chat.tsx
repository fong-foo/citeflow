"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ChatState =
  | "greeting"
  | "ask_domain"
  | "ask_brand_name"
  | "ask_industry"
  | "ask_target_market"
  | "scanning"
  | "show_profile"
  | "editing"
  | "confirm"
  | "expand_queries"
  | "show_queries"
  | "launching"
  | "done";

type MessageType = "text" | "profile_card" | "typing" | "confirm_buttons" | "query_preview";

interface ProfileData {
  domain: string;
  brand_name: string;
  industry: string;
  target_market: string;
  core_product: string;
}

interface ChatMessage {
  id: number;
  sender: "probe" | "user";
  content: string;
  type?: MessageType;
  profileData?: ProfileData;
  timestamp: Date;
}

interface Props {
  onComplete: (data: {
    domain: string;
    brandName: string;
    industry: string;
    targetMarket: string;
    seed_queries: string[];
    core_product: string;
  }) => void;
}

// ─── Helpers ───────────────────────────────────────────

let msgId = 0;

function isValidDomain(v: string): boolean {
  const trimmed = v.trim();
  if (trimmed.length < 4) return false;
  if (trimmed.includes(" ")) return false;
  if (!trimmed.includes(".")) return false;
  const parts = trimmed.split(".");
  if (parts.length < 2) return false;
  if (parts[parts.length - 1].length < 2) return false;
  if (parts[parts.length - 2].length < 1) return false;
  return true;
}

function fmtTime(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const PROBE_INTRO = [
  "欢迎来到 CiteFlow 体检中心。我是你的 AI 侦察兵。",
  "我们初步体检可以告知您的品牌的综合评分、行业引用率、推荐率、竞品提及。",
  "想初步了解您的品牌在 ChatGPT 中的健康值吗，您先告诉我您品牌的域名，我为你拨开迷雾。",
];

const GLOW_KEYWORDS = ["综合评分", "行业引用率", "推荐率", "竞品提及", "品牌官网域名", "域名", "品牌名称", "行业", "目标市场"];

function GlowText({ text }: { text: string }) {
  // find the first matching keyword in text
  let bestIdx = -1;
  let bestKw = "";
  for (const kw of GLOW_KEYWORDS) {
    const i = text.indexOf(kw);
    if (i !== -1 && (bestIdx === -1 || i < bestIdx)) { bestIdx = i; bestKw = kw; }
  }
  if (bestIdx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, bestIdx)}
      <span
        className="font-bold"
        style={{
          color: "#7DD3FC",
          animation: "keywordGlow 2.2s ease-in-out infinite",
        }}
      >
        {text.slice(bestIdx, bestIdx + bestKw.length)}
      </span>
      <GlowText text={text.slice(bestIdx + bestKw.length)} />
    </>
  );
}

const STEPS: { state: ChatState; question: string; placeholder: string }[] = [
  { state: "ask_domain", question: "", placeholder: "输入域名，例如 ugreen.com" },
  { state: "ask_brand_name", question: "好的，你的品牌名称是什么？", placeholder: "输入品牌名，例如 UGREEN绿联" },
  { state: "ask_industry", question: "你们属于什么行业？", placeholder: "例如：电子配件、美妆…（可跳过）" },
  { state: "ask_target_market", question: "目标市场是哪里？", placeholder: "例如：北美、东南亚…（可跳过）" },
];

// ─── Component ─────────────────────────────────────────

export function ScanChat({ onComplete }: Props) {
  const [chatState, setChatState] = useState<ChatState>("greeting");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [domain, setDomain] = useState("");
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [profileData, setProfileData] = useState<ProfileData>({
    domain: "", brand_name: "", industry: "", target_market: "", core_product: "",
  });
  const [expandedQueries, setExpandedQueries] = useState<{ query: string; category: string }[]>([]);
  const [editingQueryIdx, setEditingQueryIdx] = useState<number | null>(null);
  const [editingQueryText, setEditingQueryText] = useState("");
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newQueryText, setNewQueryText] = useState("");
  const [editForm, setEditForm] = useState({
    domain: "", brand_name: "", industry: "", target_market: "", core_product: "",
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  function addMessage(msg: Omit<ChatMessage, "id" | "timestamp">) {
    setMessages((prev) => [...prev, { ...msg, id: ++msgId, timestamp: new Date() }]);
  }

  function transition(next: ChatState) { setChatState(next); }

  /* ─── Typewriter ───────────────────────────────────── */

  function typeMessage(text: string, onDone: () => void) {
    const id = ++msgId;
    let i = 0;
    setMessages((prev) => [...prev, { id, sender: "probe", content: "", type: "typing", timestamp: new Date() }]);
    function tick() {
      i++;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: text.slice(0, i) } : m)));
      if (i < text.length) {
        typingTimerRef.current = setTimeout(tick, 26);
      } else {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, type: "text" } : m)));
        onDone();
      }
    }
    typingTimerRef.current = setTimeout(tick, 26);
  }

  useEffect(() => {
    return () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); };
  }, []);

  /* ─── State machine ────────────────────────────────── */

  useEffect(() => {
    if (chatState === "greeting") {
      let idx = 0;
      const next = () => {
        if (idx < PROBE_INTRO.length) {
          typeMessage(PROBE_INTRO[idx++], next);
        } else {
          transition("ask_domain");
        }
      };
      next();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState]);

  useEffect(() => {
    if (chatState === "ask_brand_name") { typeMessage(STEPS[1].question, () => {}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState]);
  useEffect(() => {
    if (chatState === "ask_industry") { typeMessage(STEPS[2].question, () => {}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState]);
  useEffect(() => {
    if (chatState === "ask_target_market") { typeMessage(STEPS[3].question, () => {}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState]);

  useEffect(() => { if (chatState === "scanning") runProfile(); }, [chatState]);

  useEffect(() => {
    if (chatState === "confirm") { addMessage({ sender: "user", content: "确认无误" }); transition("expand_queries"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState]);

  useEffect(() => {
    if (chatState === "expand_queries") {
      typeMessage("正在根据你的品牌画像生成搜索引擎查询词...", async () => {
        const dotsId = ++msgId;
        setMessages((prev) => [...prev, { id: dotsId, sender: "probe", content: "", type: "typing", timestamp: new Date() }]);

        try {
          const res = await fetch(`${API_BASE}/api/expand-queries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              industry: profileData.industry,
              brand_name: profileData.brand_name,
              competitors: [],
              seed_queries: [],
            }),
          });
          setMessages((prev) => prev.filter((m) => m.id !== dotsId));
          const json = await res.json();
          if (json.status === "error" || !json.queries?.length) {
            addMessage({ sender: "probe", content: `查询词生成失败：${json.error || "无结果"}，将使用默认查询词` });
            setExpandedQueries([]);
            transition("launching");
            return;
          }
          setExpandedQueries(json.queries);
          // 构建查询词预览文案
          const cats: Record<string, string> = { industry: "行业通用查询", brand: "品牌直接查询", competitor: "竞品场景查询" };
          const descs: Record<string, string> = {
            industry: "测量品牌在行业通用查询中的AI引用率——用户搜品类词时，AI会不会推荐你",
            brand: "测量AI搜索引擎对你品牌的直接认知画像——用户搜你品牌名时，AI怎么描述你",
            competitor: "测量品牌在竞品对比查询中的AI可见度——用户拿你跟竞品比时，AI推荐谁更多",
          };
          const grouped: Record<string, string[]> = {};
          for (const q of json.queries) {
            const cat = q.category || "industry";
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(q.query);
          }
          let previewText = `已生成 ${json.queries.length} 条搜索查询词，分为 ${Object.keys(grouped).length} 类：\n\n`;
          for (const [cat, queries] of Object.entries(grouped)) {
            previewText += `【${cats[cat] || cat}】${queries.length}条\n`;
            previewText += `  ${descs[cat] || ""}\n\n`;
            previewText += queries.map(q => `  · ${q}`).join("\n");
            previewText += "\n\n";
          }
          previewText += "以上查询词将输入AI搜索引擎进行扫描，确认无误后开始正式体检。";
          addMessage({ sender: "probe", content: previewText, type: "query_preview" });
          transition("show_queries");
        } catch {
          setMessages((prev) => prev.filter((m) => m.id !== dotsId));
          addMessage({ sender: "probe", content: "查询词生成超时，将使用默认查询词" });
          setExpandedQueries([]);
          transition("launching");
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState]);

  useEffect(() => {
    if (chatState === "launching") {
      typeMessage("查询词已确认。正在启动扫描仪器...", () => { setTimeout(() => transition("done"), 2500); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState]);

  useEffect(() => {
    if (chatState === "done") {
      const timer = setTimeout(() => {
        onComplete({
          domain,
          brandName: profileData.brand_name || brandName || domain,
          industry: profileData.industry || industry,
          targetMarket: profileData.target_market || targetMarket,
          seed_queries: expandedQueries.map(q => q.query),
          core_product: profileData.core_product,
        });
      }, 400);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatState]);

  /* ─── Profile API ──────────────────────────────────── */

  async function runProfile() {
    typeMessage(`收到，正在扫描 ${domain}...`, async () => {
      // typewriter 完成 → 插入加载点消息，等待 API
      const dotsId = ++msgId;
      setMessages((prev) => [...prev, { id: dotsId, sender: "probe", content: "", type: "typing", timestamp: new Date() }]);

      const timer8s = setTimeout(() => {
        addMessage({
          sender: "probe",
          content: "正在分析你的官网内容...\n\n我们在从你的官网中提取关键信息，用来判断你的品牌属于什么行业、面向什么市场。",
          type: "text",
        });
      }, 8000);

      const timer12s = setTimeout(() => {
        addMessage({
          sender: "probe",
          content: "快好了，正在用 AI 推断你的行业和目标市场...\n\n马上就能看到：你的品牌属于什么行业、面向什么市场、核心产品是什么。",
          type: "text",
        });
      }, 12000);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);
        const res = await fetch(`${API_BASE}/api/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain, brand_name: brandName }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        clearTimeout(timer8s);
        clearTimeout(timer12s);
        // 移除加载点
        setMessages((prev) => prev.filter((m) => m.id !== dotsId));
        const json = await res.json();
        if (json.status === "error") {
          addMessage({ sender: "probe", content: `扫描遇到问题：${json.error || "请稍后重试"}` });
          transition("ask_domain");
          return;
        }
        const bp = json.brand_profile;
        const pd: ProfileData = {
          domain,
          brand_name: bp.brand_name || brandName || domain,
          industry: bp.inferred_industry || industry || "",
          target_market: bp.inferred_target_market || targetMarket || "",
          core_product: bp.inferred_core_product || "",
        };
        setProfileData(pd);
        addMessage({ sender: "probe", content: "扫描完成，识别到以下信息：", type: "profile_card", profileData: pd });
        addMessage({ sender: "probe", content: "以上信息是否正确？", type: "confirm_buttons", profileData: pd });
        transition("show_profile");
      } catch {
        clearTimeout(timer8s);
        clearTimeout(timer12s);
        setMessages((prev) => prev.filter((m) => m.id !== dotsId));
        addMessage({ sender: "probe", content: "扫描超时或网络错误，请检查网络后重试" });
        transition("ask_domain");
      }
    });
  }

  /* ─── User input ───────────────────────────────────── */

  function handleSend() {
    const val = inputValue.trim();
    if (!val) return;
    setInputValue("");

    if (chatState === "ask_domain") {
      if (!isValidDomain(val)) {
        typeMessage("请输入有效的域名，例如 ugreen.com", () => {});
        return;
      }
      setDomain(val);
      addMessage({ sender: "user", content: val });
      transition("ask_brand_name");
    } else if (chatState === "ask_brand_name") {
      setBrandName(val);
      addMessage({ sender: "user", content: val });
      transition("ask_industry");
    } else if (chatState === "ask_industry") {
      setIndustry(val);
      addMessage({ sender: "user", content: val || "（跳过）" });
      transition("ask_target_market");
    } else if (chatState === "ask_target_market") {
      setTargetMarket(val);
      addMessage({ sender: "user", content: val || "（跳过）" });
      transition("scanning");
    }
  }

  function handleSkip() {
    setInputValue("");
    if (chatState === "ask_industry") {
      addMessage({ sender: "user", content: "（跳过）" });
      transition("ask_target_market");
    } else if (chatState === "ask_target_market") {
      addMessage({ sender: "user", content: "（跳过）" });
      transition("scanning");
    }
  }

  function handleConfirm() { transition("confirm"); }

  function handleConfirmQueries() {
    addMessage({ sender: "user", content: "确认查询词" });
    transition("launching");
  }

  function handleRegenerateQueries() {
    setExpandedQueries([]);
    transition("expand_queries");
  }

  function handleDeleteQuery(idx: number) {
    setExpandedQueries((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleStartEditQuery(idx: number) {
    setEditingQueryIdx(idx);
    setEditingQueryText(expandedQueries[idx].query);
  }

  function handleSaveEditQuery(idx: number) {
    if (editingQueryText.trim()) {
      setExpandedQueries((prev) => prev.map((q, i) => i === idx ? { ...q, query: editingQueryText.trim() } : q));
    }
    setEditingQueryIdx(null);
    setEditingQueryText("");
  }

  function handleAddQuery(cat: string) {
    if (newQueryText.trim()) {
      setExpandedQueries((prev) => [...prev, { query: newQueryText.trim(), category: cat }]);
      setNewQueryText("");
      setAddingCategory(null);
    }
  }

  function handleStartEdit() {
    setEditForm({ domain, brand_name: profileData.brand_name, industry: profileData.industry, target_market: profileData.target_market, core_product: profileData.core_product });
    transition("editing");
  }

  function handleSaveEdit() {
    const newDomain = editForm.domain.trim() || domain;
    const newProfile: ProfileData = {
      domain: newDomain,
      brand_name: editForm.brand_name.trim(),
      industry: editForm.industry.trim(),
      target_market: editForm.target_market.trim(),
      core_product: editForm.core_product.trim(),
    };
    if (newDomain !== domain) setDomain(newDomain);
    setProfileData(newProfile);
    addMessage({ sender: "user", content: "确认修改" });
    addMessage({ sender: "probe", content: "信息已更新：", type: "profile_card", profileData: newProfile });
    addMessage({ sender: "probe", content: "以上信息是否正确？", type: "confirm_buttons", profileData: newProfile });
    transition("show_profile");
  }

  /* ─── Focus input on ask states ───────────────────── */

  useEffect(() => {
    const askStates: ChatState[] = ["ask_domain", "ask_brand_name", "ask_industry", "ask_target_market"];
    if (askStates.includes(chatState)) inputRef.current?.focus();
  }, [chatState]);

  /* ─── Render helpers ───────────────────────────────── */

  const askStates: ChatState[] = ["ask_domain", "ask_brand_name", "ask_industry", "ask_target_market"];
  const showInput = askStates.includes(chatState);
  const showEditForm = chatState === "editing";
  const showSkip = chatState === "ask_industry" || chatState === "ask_target_market";
  const currentStep = STEPS.find((s) => s.state === chatState);
  const placeholder = currentStep?.placeholder || "";

  /* ─── Render ──────────────────────────────────────── */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="w-full flex-1 flex flex-col relative min-h-0"
    >
      {/* DEBUG: version marker — if you see this, ScanChat is rendering */}
      <div className="absolute top-0 right-0 z-50 px-2 py-0.5 font-mono text-[10px] rounded-bl-sm" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }}>
        v2.0
      </div>


      {/* ═══════ Messages ═══════ */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1 pb-6 relative z-10">

        <AnimatePresence>
          {messages.map((msg, idx) => {
            const isProbe = msg.sender === "probe";
            const isPrevSame = idx > 0 && messages[idx - 1].sender === msg.sender;
            const showAvatar = isProbe && !isPrevSame;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, filter: "blur(2px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className={`flex ${isProbe ? "justify-start" : "justify-end"} ${isPrevSame ? "mt-px" : "mt-3"}`}
              >
                <div className={`flex items-start gap-1 ${isProbe ? "" : "flex-row-reverse"}`} style={{ maxWidth: "100%" }}>
                  {/* Avatar */}
                  {isProbe && (
                    <div className="shrink-0" style={{ marginTop: showAvatar ? 2 : 0 }}>
                      {showAvatar ? (
                        <ProbeAvatar />
                      ) : (
                        <div style={{ width: 16 }} />
                      )}
                    </div>
                  )}

                  {/* Message group */}
                  <div
                    className="shrink-0 flex items-end"
                    style={{
                      maxWidth: "100%",
                      flexDirection: isProbe ? "column" : "row",
                      alignItems: isProbe ? "flex-start" : "center",
                      gap: isProbe ? 0 : 6,
                    }}
                  >
                    {/* Timestamp */}
                    {!isPrevSame && (
                      <span
                        className="font-mono text-[8px] tracking-[0.06em] shrink-0"
                        style={{ color: "rgba(255,255,255,0.14)", marginBottom: isProbe ? 2 : 0 }}
                      >
                        {fmtTime(msg.timestamp)}
                      </span>
                    )}

                    {/* Content */}
                    {msg.type !== "profile_card" && msg.type !== "confirm_buttons" && msg.type !== "query_preview" && (
                      <TransmissionBubble sender={msg.sender} type={msg.type}>
                        {msg.type === "typing" && !msg.content ? (
                          <SpectralDots />
                        ) : (
                          <span className="text-xs leading-relaxed" style={{ whiteSpace: isProbe ? "normal" : "nowrap" }}>
                            <GlowText text={msg.content} />
                          </span>
                        )}
                      </TransmissionBubble>
                    )}

                    {/* Profile card */}
                    {msg.type === "profile_card" && msg.profileData && (
                      <TransmissionBubble sender={msg.sender}>
                        <p className="text-xs leading-relaxed mb-3" style={{ color: "#D4D4E0" }}>
                          <GlowText text={msg.content} />
                        </p>
                        <ScanReadout data={msg.profileData} />
                      </TransmissionBubble>
                    )}

                    {/* Confirm buttons */}
                    {msg.type === "confirm_buttons" && (
                      <TransmissionBubble sender={msg.sender}>
                        <p className="text-xs leading-relaxed mb-3" style={{ color: "#D4D4E0" }}><GlowText text={msg.content} /></p>
                        <div className="flex gap-3">
                          <button
                            onClick={handleConfirm}
                            className="px-5 py-2 text-xs font-semibold rounded-sm transition-all duration-300 font-mono tracking-[0.04em]"
                            style={{ background: "#38BDF8", color: "#06060C", border: "none", cursor: "pointer" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#7DD3FC"; e.currentTarget.style.boxShadow = "0 0 20px rgba(56,189,248,0.25)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "#38BDF8"; e.currentTarget.style.boxShadow = "none"; }}
                          >
                            确认无误
                          </button>
                          <button
                            onClick={handleStartEdit}
                            className="px-5 py-2 text-xs font-medium rounded-sm transition-all duration-300 font-mono tracking-[0.04em]"
                            style={{ background: "rgba(56,189,248,0)", border: "1px solid rgba(56,189,248,0.18)", color: "#7DD3FC", cursor: "pointer" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(56,189,248,0.06)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.35)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(56,189,248,0)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.18)"; }}
                          >
                            需要修改
                          </button>
                        </div>
                      </TransmissionBubble>
                    )}

                    {/* Query preview */}
                    {msg.type === "query_preview" && (
                      <TransmissionBubble sender={msg.sender}>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#D4D4E0" }}>
                          <GlowText text={msg.content} />
                        </p>
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

      {/* ═══════ Edit form ═══════ */}
      <AnimatePresence>
        {showEditForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden relative z-10"
          >
            <div
              className="p-5 rounded-sm"
              style={{
                background: "rgba(10,15,28,0.95)",
                border: "1px solid rgba(56,189,248,0.10)",
              }}
            >
              <div className="grid grid-cols-2 gap-3 mb-3">
                <EditField label="域名" value={editForm.domain} onChange={(v) => setEditForm((f) => ({ ...f, domain: v }))} />
                <EditField label="品牌名" value={editForm.brand_name} onChange={(v) => setEditForm((f) => ({ ...f, brand_name: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <EditField label="行业" value={editForm.industry} onChange={(v) => setEditForm((f) => ({ ...f, industry: v }))} />
                <EditField label="目标市场" value={editForm.target_market} onChange={(v) => setEditForm((f) => ({ ...f, target_market: v }))} />
                <EditField label="核心产品" value={editForm.core_product} onChange={(v) => setEditForm((f) => ({ ...f, core_product: v }))} />
              </div>
              <button
                onClick={handleSaveEdit}
                className="w-full py-2 text-xs font-semibold rounded-sm transition-all duration-300 font-mono tracking-[0.04em]"
                style={{ background: "#38BDF8", color: "#06060C", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#7DD3FC"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#38BDF8"; }}
              >
                确认修改
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ Query editor (show_queries) ═══════ */}
      {chatState === "show_queries" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-10"
          style={{
            padding: "12px 0 8px",
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <QueryEditor
            queries={expandedQueries}
            editingIdx={editingQueryIdx}
            editingText={editingQueryText}
            addingCat={addingCategory}
            newText={newQueryText}
            onEditStart={handleStartEditQuery}
            onEditChange={(v) => setEditingQueryText(v)}
            onEditSave={handleSaveEditQuery}
            onEditCancel={() => { setEditingQueryIdx(null); setEditingQueryText(""); }}
            onDelete={handleDeleteQuery}
            onAddStart={(cat) => { setAddingCategory(cat); setNewQueryText(""); }}
            onAddChange={(v) => setNewQueryText(v)}
            onAddConfirm={(cat) => handleAddQuery(cat)}
            onAddCancel={() => { setAddingCategory(null); setNewQueryText(""); }}
            onConfirm={handleConfirmQueries}
            onRegenerate={handleRegenerateQueries}
          />
        </motion.div>
      )}

      {/* ═══════ Input bar ═══════ */}
      {showInput && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="flex gap-2 relative z-10"
          style={{
            padding: "12px 0 8px",
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          {/* Prompt */}
          <span
            className="shrink-0 font-mono text-xs select-none mt-[9px]"
            style={{ color: "rgba(56,189,248,0.40)" }}
          >
            &gt;
          </span>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder={placeholder}
            className="flex-1 h-[38px] px-3 text-xs rounded-sm outline-none transition-all duration-300"
            style={{
              background: "rgba(255,255,255,0.015)",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "#EDEDF5",
              fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(56,189,248,0.25)";
              e.currentTarget.style.background = "rgba(56,189,248,0.03)";
              e.currentTarget.style.boxShadow = "0 0 0 4px rgba(56,189,248,0.03)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
              e.currentTarget.style.background = "rgba(255,255,255,0.015)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />

          {showSkip && (
            <button
              onClick={handleSkip}
              className="h-[44px] px-4 text-xs font-mono tracking-[0.04em] rounded-sm transition-all duration-300 shrink-0"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.04)", color: "#3E3E52", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#6E6E88"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#3E3E52"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}
            >
              跳过
            </button>
          )}

          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="h-[44px] px-6 text-sm font-semibold rounded-sm transition-all duration-300 disabled:cursor-not-allowed shrink-0 font-mono tracking-[0.04em]"
            style={{
              background: inputValue.trim() ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.015)",
              border: inputValue.trim() ? "1px solid rgba(56,189,248,0.20)" : "1px solid rgba(255,255,255,0.04)",
              color: inputValue.trim() ? "#7DD3FC" : "#2E2E42",
              cursor: inputValue.trim() ? "pointer" : "not-allowed",
              opacity: inputValue.trim() ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (inputValue.trim()) {
                e.currentTarget.style.background = "rgba(56,189,248,0.20)";
                e.currentTarget.style.borderColor = "rgba(56,189,248,0.35)";
                e.currentTarget.style.boxShadow = "0 0 16px rgba(56,189,248,0.08)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = inputValue.trim() ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.015)";
              e.currentTarget.style.borderColor = inputValue.trim() ? "1px solid rgba(56,189,248,0.20)" : "1px solid rgba(255,255,255,0.04)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            发送
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ═══════ Sub-components ═══════════════════════════════ */

function ProbeAvatar() {
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: 16,
        height: 16,
        borderRadius: 2,
        background: "rgba(56,189,248,0.06)",
        border: "1px solid rgba(56,189,248,0.10)",
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
    <span className="inline-flex items-center gap-0.5 h-[14px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block rounded-full"
          style={{
            width: 3,
            height: 3,
            background: "#7DD3FC",
            animation: `spectralPulse 1.6s ease-in-out ${i * 0.25}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

/* ─── Transmission Bubble ────────────────────────────── */

function TransmissionBubble({ sender, children, type }: {
  sender: "probe" | "user";
  children: React.ReactNode;
  type?: MessageType;
}) {
  const isProbe = sender === "probe";

  return (
    <div
      className="relative"
      style={{
        display: "inline-block",
        maxWidth: isProbe ? "none" : "78%",
        background: isProbe
          ? "rgba(10, 15, 30, 0.75)"
          : "rgba(56, 189, 248, 0.04)",
        border: isProbe
          ? "1px solid rgba(56, 189, 248, 0.06)"
          : "1px solid rgba(56, 189, 248, 0.10)",
        borderRadius: 2,
        padding: type === "typing" ? "8px 12px" : "10px 14px",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        overflow: "hidden",
      }}
    >
      {/* Spectral edge accent */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          [isProbe ? "left" : "right"]: 0,
          width: 1,
          background: isProbe
            ? "linear-gradient(180deg, transparent 0%, rgba(56,189,248,0.2) 20%, rgba(56,189,248,0.2) 80%, transparent 100%)"
            : "linear-gradient(180deg, transparent 0%, rgba(56,189,248,0.10) 20%, rgba(56,189,248,0.10) 80%, transparent 100%)",
          borderRadius: "0 1px 1px 0",
        }}
      />
      {children}
    </div>
  );
}

/* ─── Scan Readout (profile card) ────────────────────── */

function ScanReadout({ data }: { data: ProfileData }) {
  const fields = [
    { label: "域名", value: data.domain || "—" },
    { label: "品牌", value: data.brand_name || "—" },
    { label: "行业", value: data.industry || "未识别", accent: true },
    { label: "目标市场", value: data.target_market || "未识别", accent: true },
    { label: "核心产品", value: data.core_product || "未识别", accent: true },
  ];

  return (
    <div
      className="rounded-sm overflow-hidden"
      style={{
        background: "rgba(0,0,0,0.25)",
        border: "1px solid rgba(56,189,248,0.05)",
      }}
    >
      {/* Readout header */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
      >
        <span
          className="inline-block w-[5px] h-[5px] rounded-full shrink-0"
          style={{
            background: "#22C55E",
            boxShadow: "0 0 5px rgba(34,197,94,0.5)",
            animation: "sensorPulse 2s ease-in-out infinite",
          }}
        />
        <span className="font-mono text-[9px] tracking-[0.08em]" style={{ color: "rgba(56,189,248,0.35)" }}>
          扫描数据
        </span>
      </div>

      {/* Fields */}
      <div className="px-4 py-3">
        {fields.map((f, i) => (
          <div key={f.label}>
            {i > 0 && (
              <div className="my-2 h-[1px]" style={{ background: "rgba(255,255,255,0.025)" }} />
            )}
            <ReadoutRow label={f.label} value={f.value} accent={f.accent} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadoutRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1 flex-nowrap min-w-0">
      <span
        className="text-[10px] shrink-0 font-mono tracking-[0.06em] uppercase"
        style={{ color: "#4A4A62", width: 52 }}
      >
        {label}
      </span>
      <span
        className="text-[12px] font-medium truncate"
        style={{ color: accent ? "#7DD3FC" : "#D4D4E0" }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Query Editor ────────────────────────────────────── */

const CAT_CONFIG: Record<string, { label: string; desc: string; color: string; bg: string; border: string }> = {
  industry: { label: "A类 · 行业通用", desc: "测量你的品牌在行业通用查询中的AI引用率——用户在搜品类词时，AI会不会提到你", color: "#38BDF8", bg: "rgba(56,189,248,0.06)", border: "rgba(56,189,248,0.15)" },
  brand: { label: "B类 · 品牌直接", desc: "测量AI搜索引擎对你品牌的直接认知画像——用户搜你品牌名时，AI怎么描述你", color: "#34D399", bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.15)" },
  competitor: { label: "C类 · 竞品场景", desc: "测量品牌在竞品对比查询中的AI可见度——用户拿你跟竞品比时，AI推荐谁更多", color: "#F59E0B", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)" },
};

function QueryEditor({
  queries, editingIdx, editingText, addingCat, newText,
  onEditStart, onEditChange, onEditSave, onEditCancel,
  onDelete, onAddStart, onAddChange, onAddConfirm, onAddCancel,
  onConfirm, onRegenerate,
}: {
  queries: { query: string; category: string }[];
  editingIdx: number | null; editingText: string;
  addingCat: string | null; newText: string;
  onEditStart: (i: number) => void; onEditChange: (v: string) => void;
  onEditSave: (i: number) => void; onEditCancel: () => void;
  onDelete: (i: number) => void;
  onAddStart: (cat: string) => void; onAddChange: (v: string) => void;
  onAddConfirm: (cat: string) => void; onAddCancel: () => void;
  onConfirm: () => void; onRegenerate: () => void;
}) {
  const grouped: Record<string, { idx: number; query: string }[]> = {};
  queries.forEach((q, i) => {
    const cat = q.category || "industry";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ idx: i, query: q.query });
  });

  const catOrder = ["industry", "brand", "competitor"];

  return (
    <div>
      {catOrder.map((cat) => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        const cfg = CAT_CONFIG[cat] || CAT_CONFIG.industry;
        return (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.06em", color: cfg.color,
                  padding: "2px 8px", background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                }}>{cfg.label}</span>
                <span style={{ fontSize: 10, color: "#5E5E78" }}>{items.length}条</span>
              </div>
              <p style={{ fontSize: 11, color: "#6E6E88", margin: 0, lineHeight: 1.5 }}>{cfg.desc}</p>
            </div>
            {items.map(({ idx, query }) => {
              const isEditing = editingIdx === idx;
              return (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 8px", marginBottom: 4,
                  background: isEditing ? "rgba(56,189,248,0.04)" : "rgba(255,255,255,0.012)",
                  border: `1px solid ${isEditing ? "rgba(56,189,248,0.20)" : "rgba(255,255,255,0.03)"}`,
                  transition: "all 0.2s",
                }}>
                  {isEditing ? (
                    <>
                      <input
                        value={editingText}
                        onChange={(e) => onEditChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") onEditSave(idx); if (e.key === "Escape") onEditCancel(); }}
                        autoFocus
                        style={{
                          flex: 1, height: 28, padding: "0 8px", fontSize: 12,
                          background: "rgba(0,0,0,0.3)", border: "1px solid rgba(56,189,248,0.25)",
                          color: "#EDEDF5", outline: "none",
                        }}
                      />
                      <button onClick={() => onEditSave(idx)} style={btnMini("rgba(56,189,248,0.15)", "#7DD3FC")}>保存</button>
                      <button onClick={onEditCancel} style={btnMini("rgba(255,255,255,0.04)", "#5E5E78")}>取消</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 12, color: "#C8C8D8", lineHeight: 1.4 }}>{query}</span>
                      <button onClick={() => onEditStart(idx)} style={iconBtn}>✎</button>
                      <button onClick={() => onDelete(idx)} style={iconBtn}>×</button>
                    </>
                  )}
                </div>
              );
            })}
            {/* Add query row */}
            {addingCat === cat ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", marginBottom: 4 }}>
                <input
                  value={newText}
                  onChange={(e) => onAddChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") onAddConfirm(cat); if (e.key === "Escape") onAddCancel(); }}
                  placeholder="输入新查询词..."
                  autoFocus
                  style={{
                    flex: 1, height: 28, padding: "0 8px", fontSize: 12,
                    background: "rgba(0,0,0,0.3)", border: `1px solid ${cfg.border}`,
                    color: "#EDEDF5", outline: "none",
                  }}
                />
                <button onClick={() => onAddConfirm(cat)} style={btnMini("rgba(56,189,248,0.15)", "#7DD3FC")}>添加</button>
                <button onClick={onAddCancel} style={btnMini("rgba(255,255,255,0.04)", "#5E5E78")}>取消</button>
              </div>
            ) : (
              <button
                onClick={() => onAddStart(cat)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 10px", fontSize: 11,
                  background: "transparent", border: `1px dashed ${cfg.border}`,
                  color: cfg.color, cursor: "pointer", opacity: 0.6,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
              >+ 添加{cfg.label.split("·")[0].trim()}查询词</button>
            )}
          </div>
        );
      })}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          onClick={onConfirm}
          style={{
            flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em",
            background: "#38BDF8", color: "#06060C", border: "none", cursor: "pointer",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#7DD3FC"; e.currentTarget.style.boxShadow = "0 0 20px rgba(56,189,248,0.25)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#38BDF8"; e.currentTarget.style.boxShadow = "none"; }}
        >确认查询词，开始体检</button>
        <button
          onClick={onRegenerate}
          style={{
            padding: "10px 20px", fontSize: 12, fontWeight: 500,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em",
            background: "rgba(56,189,248,0)", border: "1px solid rgba(56,189,248,0.18)",
            color: "#7DD3FC", cursor: "pointer", transition: "all 0.3s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(56,189,248,0.06)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.35)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(56,189,248,0)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.18)"; }}
        >重新生成</button>
      </div>
    </div>
  );
}

function btnMini(bg: string, color: string): React.CSSProperties {
  return {
    padding: "2px 8px", fontSize: 10, fontWeight: 500,
    background: bg, border: "none", color, cursor: "pointer",
    fontFamily: "'JetBrains Mono', monospace",
  };
}

const iconBtn: React.CSSProperties = {
  width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 13, background: "transparent", border: "none",
  color: "#5E5E78", cursor: "pointer", padding: 0,
  transition: "color 0.2s",
};

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] block mb-1.5 font-mono tracking-[0.06em] uppercase" style={{ color: "#4A4A62" }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-[38px] px-3 text-xs rounded-sm outline-none transition-all duration-300"
        style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", color: "#EDEDF5" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(56,189,248,0.25)"; e.currentTarget.style.background = "rgba(56,189,248,0.03)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}
      />
    </div>
  );
}
