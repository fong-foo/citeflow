"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ScanChat } from "@/components/scan-chat";
import { ScanDashboard } from "@/components/scan-dashboard";
import { ScanLoading } from "@/components/scan-loading";
import { ScanProbeLoading } from "@/components/scan-probe-loading";
import { ScanResult } from "@/components/scan-result";
import { ScanReport } from "@/components/scan-probe-report";
import { ScanSidebar } from "@/components/scan-sidebar";
import { ProbeBriefing, type ProbeFullInput } from "@/components/probe-briefing";
import { UpgradeModal } from "@/components/upgrade-modal";
import { CreditUnlockModal } from "@/components/credit-unlock-modal";
import { ScanAnalystBriefing } from "@/components/scan-analyst-briefing";
import { ScanAnalystReport } from "@/components/scan-analyst-report";
import { ScanPrescriptionSteps } from "@/components/scan-prescription-steps";
import { ScanDoctorBriefing } from "@/components/scan-doctor-briefing";
import { ScanDoctorGenerating } from "@/components/scan-doctor-generating";
import { ScanDoctorWorkshop } from "@/components/scan-doctor-workshop";
import { ScanOnboardingGuide } from "@/components/scan-onboarding-guide";
import { userKey, getUserTier, setUserTier, type Tier, type ScanMode } from "@/lib/storage";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const STORAGE_KEY_BASE = "cf_scan_result";
const REPORTS_KEY_BASE = "cf_reports";

function scanResultKey(mode: string): string {
  return `cf_scan_result_${mode}`;
}

// ─── 全局产品步骤 (每个产品独立，不串台) ───
type Step = "input" | "probe" | "analyst" | "doctor" | "dashboard" | "error";

// ─── 产品内部阶段 ───
type InputPhase = "guide" | "form" | "scanning" | "report";
type ProbePhase = "briefing" | "scanning" | "report";
type AnalystPhase = "briefing" | "report";
type DoctorPhase = "briefing" | "generating" | "report";

interface PendingScan {
  domain: string;
  brandName: string;
  industry: string;
  targetMarket: string;
  startTime: number;
  mode: ScanMode;
  scanId?: string;
  product?: "input" | "probe";
}

// Module-level coordination: prevents duplicate polling loops across mount/unmount cycles
let activeScanCleanup: (() => void) | null = null;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function FallbackUI({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div style={{
      minHeight: "100vh", background: "#08080D", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{
        maxWidth: 480, padding: 32, background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.20)", borderRadius: 4, textAlign: "center"
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#EF4444", margin: "0 0 8px" }}>
          ScanPage 渲染错误
        </p>
        <p style={{
          fontSize: 12, color: "#9A9AB0", margin: 0,
          wordBreak: "break-word", lineHeight: 1.6, fontFamily: "monospace"
        }}>
          {msg || "未知错误"}
        </p>
      </div>
    </div>
  );
}

class ScanPageErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  constructor(props: {children: React.ReactNode}) { super(props); this.state = {error: null}; }
  static getDerivedStateFromError(error: Error) { return {error}; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[CiteFlow] ScanPage error boundary caught:", error, info);
  }
  render() {
    if (this.state.error) return <FallbackUI error={this.state.error} />;
    return this.props.children;
  }
}

export default function ScanPage() {
  // ─── Global state ───
  const [step, setStep] = useState<Step>("input");
  const [tier, setTier] = useState<Tier>("free");
  const [tierLoaded, setTierLoaded] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("light");
  const [data, setData] = useState<any>(null);
  const [inputReportData, setInputReportData] = useState<any>(null);  // light scan report data, not overwritten by probe
  const [scanDomain, setScanDomain] = useState("");
  const [scanBrandName, setScanBrandName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [progressMsg, setProgressMsg] = useState("");
  const [progressLog, setProgressLog] = useState<any[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [lastScanTime, setLastScanTime] = useState("");
  const [analystCompleted, setAnalystCompleted] = useState(() => {
    try { return localStorage.getItem(userKey("cf_analyst_done")) === "1"; } catch { return false; }
  });
  const [doctorCompleted, setDoctorCompleted] = useState(() => {
    try { return localStorage.getItem(userKey("cf_doctor_done")) === "1"; } catch { return false; }
  });
  const hasAnalystData = !!(data?.diagnosis || data?.one_line_verdict);
  const hasDoctorData = !!(data?.prescription && data.prescription.length > 0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScanRef = useRef<{ input: any; mode: ScanMode; product: "input" | "probe" } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scanIdRef = useRef<string | null>(null);
  const scanCreditsRef = useRef(0);
  const probeCreditsRef = useRef(0);

  // ─── Product-internal phases ───
  const [inputPhase, setInputPhase] = useState<InputPhase>("form");
  const [probePhase, setProbePhase] = useState<ProbePhase>("briefing");
  const [analystPhase, setAnalystPhase] = useState<AnalystPhase>("briefing");
  const [analystScanning, setAnalystScanning] = useState(false);
  const [doctorPhase, setDoctorPhase] = useState<DoctorPhase>("briefing");

  // ─── Upgrade modal ───
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<"probe" | "analyst" | "doctor">("analyst");
  const [scanCredits, setScanCredits] = useState(0);
  const [probeCredits, setProbeCredits] = useState(0);
  const [creditNotification, setCreditNotification] = useState<{ product: "full" | "probe"; count: number } | null>(null);
  const [hasLightScan, setHasLightScan] = useState(false);
  useEffect(() => { scanCreditsRef.current = scanCredits; }, [scanCredits]);
  useEffect(() => { probeCreditsRef.current = probeCredits; }, [probeCredits]);
  const [briefingData, setBriefingData] = useState<ProbeFullInput | null>(null);
  const [briefingDefaults, setBriefingDefaults] = useState<{
    domain: string; brandName: string; industry: string; targetMarket: string; coreProduct: string;
    seedQueries?: string[];
    competitorMentions: { brand: string; mention_count: number }[];
  } | null>(null);

  // ─── Resume state ───
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null);

  // ─── 3-tab index (Probe 产品的 scanning/report 阶段共用) ───
  const [scanTabIndex, setScanTabIndex] = useState(0);

  // ─── Helpers ───
  async function deductCredit(product: "full" | "probe") {
    const token = localStorage.getItem("cf_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/user/deduct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product }),
      });
      const d = await res.json();
      if (d.ok) {
        if (product === "full") setScanCredits(d.remaining);
        else setProbeCredits(d.remaining);
      }
    } catch {}
  }

  function getCachedProfile(domain: string) {
    try {
      const raw = localStorage.getItem(userKey("cf_brand_profile"));
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (cached.domain === domain) return cached.profile;
    } catch {}
    return null;
  }

  function getStoredCredits(): { scan: number; probe: number; initialized: boolean } {
    try {
      const raw = localStorage.getItem(userKey("cf_known_credits"));
      if (raw) return { ...JSON.parse(raw), initialized: true };
    } catch {}
    return { scan: 0, probe: 0, initialized: false };
  }

  function storeCredits(scan: number, probe: number) {
    try { localStorage.setItem(userKey("cf_known_credits"), JSON.stringify({ scan, probe })); } catch {}
  }

  // ─── Timer ───
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ─── beforeunload protection (检查产品内部阶段) ───
  useEffect(() => {
    const scanning = (step === "input" && inputPhase === "scanning") ||
                     (step === "probe" && probePhase === "scanning") ||
                     (step === "analyst" && analystScanning);
    if (!scanning) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step, inputPhase, probePhase, analystScanning]);

  // ─── Initialization ───
  useEffect(() => {
    const token = localStorage.getItem("cf_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const savedTier = getUserTier();
    setTier(savedTier);
    setTierLoaded(true);

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.tier && d.tier !== savedTier) {
          setTier(d.tier);
          setUserTier(d.tier);
        }
        const newScan = typeof d.scan_credits === "number" ? d.scan_credits : 0;
        const newProbe = typeof d.probe_credits === "number" ? d.probe_credits : 0;
        const { scan: prevScan, probe: prevProbe, initialized } = getStoredCredits() as { scan: number; probe: number; initialized: boolean };

        if (typeof d.scan_credits === "number") setScanCredits(d.scan_credits);
        if (typeof d.probe_credits === "number") setProbeCredits(d.probe_credits);
        if (typeof d.has_light_scan === "boolean") setHasLightScan(d.has_light_scan);

        // 只在已有初始记录且次数确实增加时才弹恭喜通知
        if (initialized) {
          if (newScan > prevScan) {
            setCreditNotification({ product: "full", count: newScan - prevScan });
          } else if (newProbe > prevProbe) {
            setCreditNotification({ product: "probe", count: newProbe - prevProbe });
          }
        }
        storeCredits(newScan, newProbe);
      })
      .catch(() => {});

    (["cf_scan_result", "cf_reports", "cf_prescription_done"] as const).forEach((base) => {
      const newKey = userKey(base);
      if (!localStorage.getItem(newKey)) {
        const old = localStorage.getItem(base);
        if (old) {
          try { localStorage.setItem(newKey, old); } catch {}
          localStorage.removeItem(base);
        }
      }
    });

    let pendingAutoResume: (PendingScan & { scanId: string; product: "input" | "probe" }) | null = null;
    const pendingRaw = localStorage.getItem(userKey("cf_pending_scan"));
    if (pendingRaw) {
      try {
        const pending: PendingScan = JSON.parse(pendingRaw);
        const age = Date.now() - pending.startTime;
        if (age < 10 * 60 * 1000) {
          if (pending.scanId && pending.product) {
            // New format with scanId: auto-resume polling instead of showing resume prompt
            pendingAutoResume = pending as any;
            setScanDomain(pending.domain);
            setScanBrandName(pending.brandName || pending.domain);
            setScanMode(pending.mode || "light");
          } else {
            // Old format: show resume prompt (existing behavior)
            setPendingScan(pending);
            setScanDomain(pending.domain);
            setScanBrandName(pending.brandName || pending.domain);
            setScanMode(pending.mode || "light");
          }
        } else {
          localStorage.removeItem(userKey("cf_pending_scan"));
        }
      } catch {
        localStorage.removeItem(userKey("cf_pending_scan"));
      }
    }

    // Auto-resume polling if we have a running scan from a previous mount
    if (pendingAutoResume) {
      resumePolling(
        pendingAutoResume.scanId,
        pendingAutoResume.mode || "light",
        pendingAutoResume.product,
        pendingAutoResume.domain,
        pendingAutoResume.brandName || pendingAutoResume.domain,
        pendingAutoResume.startTime,
      );
      setInitialized(true);
      return;
    }

    // P0-1: Try loading from server first, fall back to localStorage
    async function loadFromServer() {
      try {
        const res = await fetch(`${API_BASE}/api/scans`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return false;
        const list = await res.json();
        if (!list.scans || list.scans.length === 0) return false;

        const latest = list.scans[0];
        const detailRes = await fetch(
          `${API_BASE}/api/scan/${latest.id}/result`
        );
        if (!detailRes.ok) return false;
        const result = await detailRes.json();

        setData(result);
        setScanDomain(latest.domain);
        setScanBrandName(latest.brand_name);
        setScanMode(latest.mode as ScanMode);
        setStep("dashboard");
        setInputPhase("report");
        if (latest.mode === "full") {
          setProbePhase("report");
          setScanTabIndex(2);
        }
        if (result?.diagnosis || result?.one_line_verdict) setAnalystPhase("report");
        if (result?.prescription && result.prescription.length > 0) {
          setDoctorPhase("report");
        }
        setLastScanTime(formatTime(new Date(latest.created_at).getTime()));

        // 同步写 localStorage 作为离线兜底
        const saveMode = latest.mode;
        try {
          localStorage.setItem(
            userKey(scanResultKey(saveMode)),
            JSON.stringify({
              data: result,
              mode: latest.mode,
              domain: latest.domain,
              brandName: latest.brand_name,
              timestamp: Date.now(),
            })
          );
        } catch {}

        return true;
      } catch {
        return false;
      }
    }

    loadFromServer().then((loaded) => {
      if (loaded) {
        setInitialized(true);
        return;
      }

      // Fallback: Restore last scan result from localStorage
      // Try mode-specific keys first (full > light), then old unified key for migration
      let restored = false;
      function tryRestore(key: string) {
        if (restored) return;
        const raw = localStorage.getItem(userKey(key));
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.data) {
            setData(parsed.data);
            setScanMode(parsed.mode || "light");
            setStep(parsed.mode === "full" ? "dashboard" : "dashboard");
            setInputPhase("report");
            if (parsed.mode === "full") setProbePhase("report");
            if (parsed.data?.diagnosis || parsed.data?.one_line_verdict) setAnalystPhase("report");
            if (parsed.data?.prescription && parsed.data.prescription.length > 0) {
              setDoctorPhase("report");
            }
            if (parsed.domain) setScanDomain(parsed.domain);
            if (parsed.brandName) setScanBrandName(parsed.brandName);
            if (parsed.timestamp) setLastScanTime(formatTime(parsed.timestamp));
            restored = true;
          }
        } catch {}
      }
      tryRestore(scanResultKey("full"));
      tryRestore(scanResultKey("light"));
      // Migration: old unified key → mode-specific
      tryRestore(STORAGE_KEY_BASE);
      if (!restored) {
        const reports = localStorage.getItem(userKey(REPORTS_KEY_BASE));
        if (reports) {
          try {
            const list = JSON.parse(reports);
            const latest = list.find((r: any) => r.type === "probe");
            if (latest?.data) {
              setData(latest.data);
              setScanMode(latest.mode || "light");
              setStep("dashboard");
              setInputPhase("report");
              if (latest.mode === "full") setProbePhase("report");
              if (latest.data?.diagnosis || latest.data?.one_line_verdict) setAnalystPhase("report");
              setScanDomain(latest.domain || "");
              setScanBrandName(latest.brandName || "");
              if (latest.timestamp) setLastScanTime(formatTime(latest.timestamp));
              restored = true;
            }
          } catch {}
        }
      }
      setInitialized(true);
    });

    // Always restore light scan data separately (not overwritten by probe)
    try {
      const lightRaw = localStorage.getItem(userKey(scanResultKey("light")));
      if (lightRaw) {
        const lightParsed = JSON.parse(lightRaw);
        if (lightParsed.data) setInputReportData(lightParsed.data);
      }
    } catch {}
  }, []);

  // ─── Auto-save to report history + scan result key ───
  useEffect(() => {
    if (!data || !scanDomain) return;
    try {
      const raw = localStorage.getItem(userKey(REPORTS_KEY_BASE));
      let history: any[] = raw ? JSON.parse(raw) : [];

      const upsertEntry = (entry: any) => {
        const existingIdx = history.findIndex(
          (r: any) => r.type === entry.type && r.domain === entry.domain && r.brandName === entry.brandName
        );
        if (existingIdx >= 0) {
          history[existingIdx] = entry;
        } else {
          history.unshift(entry);
        }
      };

      // 1) Probe entry (light or full)
      upsertEntry({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        type: scanMode === "full" ? "probe_scout" : "probe",
        label: scanMode === "full" ? "Probe 完整侦察报告" : "初步体检报告",
        domain: scanDomain,
        brandName: scanBrandName || scanDomain,
        data,
        mode: scanMode,
        timestamp: Date.now(),
      });

      // 2) Analyst entry — when diagnosis data is present
      if (data?.diagnosis || data?.one_line_verdict) {
        upsertEntry({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + "_a",
          type: "analyst",
          label: "Analyst 诊断师报告",
          domain: scanDomain,
          brandName: scanBrandName || scanDomain,
          data,
          mode: scanMode,
          timestamp: Date.now(),
        });
      }

      // 3) Doctor entry — when prescription data is present
      if (data?.prescription && data.prescription.length > 0) {
        upsertEntry({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + "_d",
          type: "doctor",
          label: "处方",
          domain: scanDomain,
          brandName: scanBrandName || scanDomain,
          data,
          mode: scanMode,
          timestamp: Date.now(),
        });
      }

      if (history.length > 60) history.length = 60;
      localStorage.setItem(userKey(REPORTS_KEY_BASE), JSON.stringify(history));
      window.dispatchEvent(new Event("cf-reports-updated"));

      // 同步更新 scan result key，确保页面刷新后能恢复最新数据
      const saveMode = scanMode;
      try { localStorage.setItem(userKey(scanResultKey(saveMode)), JSON.stringify({ data, mode: scanMode, domain: scanDomain, brandName: scanBrandName, timestamp: Date.now() })); } catch {}
    } catch {}
  }, [data, scanDomain, scanBrandName, scanMode]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ═══════════════════════════════════════════
  // STATE TRANSITIONS
  // ═══════════════════════════════════════════

  /** 输入完成 → credits 驱动：free+无credits→Light，有credits→briefing，都用完→付费 */
  function handleInputComplete(input: { domain: string; brandName: string; industry: string; targetMarket: string; seed_queries?: string[]; core_product?: string }) {
    if (!tierLoaded) return;

    if (hasLightScan && scanCredits === 0 && probeCredits === 0) {
      setUpgradeFeature("probe");
      setShowUpgrade(true);
      return;
    }

    setScanDomain(input.domain);
    setScanBrandName(input.brandName || input.domain);

    if (!hasLightScan && scanCredits === 0 && probeCredits === 0) {
      startScan(input, "light", "input");
    } else {
      setBriefingDefaults({
        domain: input.domain,
        brandName: input.brandName || input.domain,
        industry: input.industry,
        targetMarket: input.targetMarket,
        coreProduct: input.core_product || "",
        seedQueries: input.seed_queries || [],
        competitorMentions: [],
      });
      setProbePhase("briefing");
      setStep("probe");
    }
  }

  /** Briefing 确认 → full scan */
  function handleBriefingConfirm(input: ProbeFullInput) {
    setBriefingData(input);
    setScanDomain(input.domain);
    setScanBrandName(input.brand_name || input.domain);
    startScan(input, "full", "probe");
  }

  /** 统一 scan launcher：POST 获取 scan_id → 每5秒轮询状态 */
  async function startScan(input: any, mode: ScanMode, product: "input" | "probe") {
    // 新扫描重置 analyst/doctor 完成标记，确保用户走 briefing 流程
    setAnalystCompleted(false);
    setDoctorCompleted(false);
    try { localStorage.removeItem(userKey("cf_analyst_done")); } catch {}
    try { localStorage.removeItem(userKey("cf_doctor_done")); } catch {}

    if (product === "input") {
      setStep("input");
      setInputPhase("scanning");
    } else {
      setStep("probe");
      setProbePhase("scanning");
      setScanTabIndex(1);
    }
    setScanMode(mode);
    setErrorMsg("");
    setElapsed(0);
    setProgressMsg("");
    setProgressLog([]);
    lastScanRef.current = { input, mode, product };
    localStorage.removeItem(userKey(scanResultKey(mode)));

    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 100);

    const pending: PendingScan = {
      domain: input.domain,
      brandName: input.brandName || input.brand_name || "",
      industry: input.industry || "",
      targetMarket: input.targetMarket || input.target_market || "",
      startTime: Date.now(),
      mode,
    };
    try { localStorage.setItem(userKey("cf_pending_scan"), JSON.stringify(pending)); } catch {}

    const globalController = new AbortController();
    abortRef.current = globalController;
    const globalTimeoutId = setTimeout(() => globalController.abort(), 540_000); // 9分钟总超时

    // Register module-level cleanup to prevent duplicate polling across mount cycles
    activeScanCleanup?.();
    activeScanCleanup = () => {
      globalController.abort();
      clearTimeout(globalTimeoutId);
    };

    // Helper: fetch with per-request timeout + global abort signal
    function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
      const reqController = new AbortController();
      const reqTimeoutId = setTimeout(() => reqController.abort(), timeoutMs);
      const onGlobalAbort = () => reqController.abort();
      globalController.signal.addEventListener("abort", onGlobalAbort, { once: true });
      if (globalController.signal.aborted) reqController.abort();

      return fetch(url, { ...options, signal: reqController.signal }).finally(() => {
        clearTimeout(reqTimeoutId);
        globalController.signal.removeEventListener("abort", onGlobalAbort);
      });
    }

    // Step 1: POST → 获取 scan_id（含重试，线上网络比 localhost 不可靠得多）
    let scanId: string | null = null;
    const body: any = {
      domain: input.domain,
      brand_name: input.brandName || input.brand_name || "",
      industry: input.industry || "",
      target_market: input.targetMarket || input.target_market || "",
      core_product: input.core_product || "",
      target_positioning: input.target_positioning || "",
      seed_queries: input.seed_queries || [],
      competitors: input.competitors || [],
      mode,
    };

    for (let postAttempt = 0; postAttempt < 3; postAttempt++) {
      if (globalController.signal.aborted) break;
      try {
        const postRes = await fetchWithTimeout(
          `${API_BASE}/api/scan`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
          30000, // 30s per-request timeout
        );
        const postJson = await postRes.json();

        if (!postRes.ok) {
          const detail = Array.isArray(postJson.detail) ? postJson.detail.map((d: any) => d.msg).join("; ") : (postJson.detail || `HTTP ${postRes.status}`);
          if (postRes.status >= 500 && postAttempt < 2) {
            await new Promise(r => setTimeout(r, 2000 * (postAttempt + 1)));
            continue;
          }
          handleError(detail, product);
          return;
        }

        if (postJson.status === "error") {
          handleError(postJson.error || "扫描失败，请重试", product);
          return;
        }

        scanId = postJson.scan_id;
        scanIdRef.current = scanId;
        // Persist scanId to pending scan so we can resume polling after navigation
        try {
          const pendingRaw = localStorage.getItem(userKey("cf_pending_scan"));
          if (pendingRaw) {
            const p = JSON.parse(pendingRaw);
            p.scanId = scanId;
            p.product = product;
            localStorage.setItem(userKey("cf_pending_scan"), JSON.stringify(p));
          }
        } catch {}
        break;
      } catch (e: any) {
        if (e?.name === "AbortError" && globalController.signal.aborted) break;
        console.error(`[CiteFlow] POST /api/scan attempt ${postAttempt + 1}/3 failed:`, e.message || e);
        if (postAttempt >= 2) {
          stopTimer();
          handleError("创建扫描失败，请检查网络后重试", product);
          return;
        }
        await new Promise(r => setTimeout(r, 2000 * (postAttempt + 1)));
      }
    }

    if (!scanId) {
      stopTimer();
      handleError("创建扫描失败，请重试", product);
      return;
    }

    if (globalController.signal.aborted) {
      stopTimer();
      handleError("扫描已取消", product);
      return;
    }

    startPollingLoop(scanId, product, globalController, globalTimeoutId);
  }

  /** Shared polling loop — used by both startScan and resumePolling */
  function startPollingLoop(
    scanId: string,
    product: "input" | "probe",
    globalController: AbortController,
    globalTimeoutId: ReturnType<typeof setTimeout>,
  ) {
    function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
      const reqController = new AbortController();
      const reqTimeoutId = setTimeout(() => reqController.abort(), timeoutMs);
      const onGlobalAbort = () => reqController.abort();
      globalController.signal.addEventListener("abort", onGlobalAbort, { once: true });
      if (globalController.signal.aborted) reqController.abort();
      return fetch(url, { ...options, signal: reqController.signal }).finally(() => {
        clearTimeout(reqTimeoutId);
        globalController.signal.removeEventListener("abort", onGlobalAbort);
      });
    }

    let pollFailCount = 0;
    const MAX_POLL_FAIL = 10;

    const poll = async () => {
      if (globalController.signal.aborted) return;
      try {
        const pollRes = await fetchWithTimeout(
          `${API_BASE}/api/scan/${scanId}`,
          {},
          15000,
        );

        if (!pollRes.ok) {
          pollFailCount++;
          if (pollFailCount >= MAX_POLL_FAIL) {
            clearTimeout(globalTimeoutId);
            handleError(`查询扫描状态失败 (HTTP ${pollRes.status})，请检查网络后重试`, product);
            return;
          }
          setTimeout(poll, Math.min(2000 * pollFailCount, 15000));
          return;
        }

        pollFailCount = 0;
        const pollJson = await pollRes.json();

        if (pollJson.progress) setProgressMsg(pollJson.progress);
        if (pollJson.progress_log?.length > 0) setProgressLog(pollJson.progress_log);

        if (pollJson.status === "done") {
          clearTimeout(globalTimeoutId);
          stopTimer();
          handleScanFinish(pollJson.result, product);
          return;
        }

        if (pollJson.status === "error") {
          clearTimeout(globalTimeoutId);
          console.error("[CiteFlow] Backend returned scan error:", pollJson.error);
          handleError(pollJson.error || "扫描失败，请重试", product);
          return;
        }

        setTimeout(poll, 5000);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error(`[CiteFlow] Poll attempt failed (consecutive: ${pollFailCount + 1}):`, e.message || e);
        pollFailCount++;
        if (pollFailCount >= MAX_POLL_FAIL) {
          clearTimeout(globalTimeoutId);
          handleError("网络连接不稳定，扫描状态查询中断，请重试", product);
          return;
        }
        setTimeout(poll, Math.min(2000 * pollFailCount, 15000));
      }
    };

    setTimeout(poll, 1000);
  }

  /** Resume polling for an existing scan (after navigating back to /scan) */
  function resumePolling(
    scanId: string,
    mode: ScanMode,
    product: "input" | "probe",
    domain: string,
    brandName: string,
    startTime: number,
  ) {
    activeScanCleanup?.();

    setScanDomain(domain);
    setScanBrandName(brandName);
    setScanMode(mode);
    setErrorMsg("");
    setProgressMsg("");
    setProgressLog([]);

    if (product === "input") {
      setStep("input");
      setInputPhase("scanning");
    } else {
      setStep("probe");
      setProbePhase("scanning");
      setScanTabIndex(1);
    }

    // Resume timer from saved startTime
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 100);

    const globalController = new AbortController();
    abortRef.current = globalController;
    const globalTimeoutId = setTimeout(() => globalController.abort(), 540_000);

    activeScanCleanup = () => {
      globalController.abort();
      clearTimeout(globalTimeoutId);
    };

    startPollingLoop(scanId, product, globalController, globalTimeoutId);
  }

  /** Scan 完成 → 进入对应产品的 report 阶段 */
  function handleScanFinish(result: any, product: "input" | "probe") {
    activeScanCleanup = null;
    localStorage.removeItem(userKey("cf_pending_scan"));
    setPendingScan(null);
    setData(result);
    setScanMode(result.mode || scanMode);
    setLastScanTime(formatTime(Date.now()));

    if (product === "probe" || result.mode === "full") {
      setProbePhase("report");
      setScanTabIndex(2);
      setStep("probe");
      // 单次 Probe（非完整流程，无 scanCredits）→ 扣 probe_credits
      if (product === "probe" && scanCreditsRef.current === 0) {
        deductCredit("probe");
      }
    } else {
      setInputReportData(result);
      setInputPhase("report");
      setStep("input");
      // Light 扫描完成 → 标记 has_light_scan
      const token = localStorage.getItem("cf_token");
      if (token) {
        fetch(`${API_BASE}/api/auth/light-scan-done`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }

    const report = {
      data: result,
      mode: result.mode || scanMode,
      domain: scanDomain,
      brandName: scanBrandName,
      timestamp: Date.now(),
    };
    const saveMode = result.mode || scanMode;
    try { localStorage.setItem(userKey(scanResultKey(saveMode)), JSON.stringify(report)); } catch {}
  }

  /** Error → 全局 error state */
  function handleError(msg: string, _product?: "input" | "probe") {
    activeScanCleanup = null;
    localStorage.removeItem(userKey("cf_pending_scan"));
    stopTimer();
    setErrorMsg(msg);
    setStep("error");
  }

  /** Error → 直接重新扫描 */
  function handleReScan() {
    const params = lastScanRef.current;
    if (!params) { handleRetry(); return; }
    startScan(params.input, params.mode, params.product);
  }

  /** Error → 回到输入 */
  function handleRetry() {
    localStorage.removeItem(userKey("cf_pending_scan"));
    setStep("input");
    setInputPhase("form");
    setErrorMsg("");
    setData(null);
    setScanDomain("");
    setScanBrandName("");
  }

  /** 重扫 → 回到输入 */
  function handleRescan() {
    setStep("input");
    setInputPhase("form");
    setData(null);
    setScanDomain("");
    setScanBrandName("");
  }

  /** 仪表盘 → 查看 Probe 完整报告 */
  function handleViewReport() {
    if (scanMode === "full") {
      // 已跑 Probe → 跳转到 Probe 页面 Tab3（侦察报告）
      setProbePhase("report");
      setScanTabIndex(2);
      setStep("probe");
    } else {
      // 免费版（light）→ 跳转到初步体检的报告生成页面
      setInputPhase("report");
      setStep("input");
    }
  }

  // ═══════════════════════════════════════════
  // SIDEBAR CALLBACKS
  // ═══════════════════════════════════════════

  function handleSidebarInputClick() {
    // 没有旧数据 → 直接进表单
    if (!inputReportData && !data) {
      setInputPhase("form");
      setStep("input");
      return;
    }

    // 有旧数据 + 还有 scan_credits → 弹选择
    if (scanCredits > 0) {
      const choice = confirm(
        "你还有 " + scanCredits + " 次完整体检可用。\n\n" +
        "点「确定」开始一次新的体检\n" +
        "点「取消」查看上次报告"
      );
      if (choice) {
        setInputPhase("form");
        setInputReportData(null);
        setStep("input");
      } else {
        setInputPhase("report");
        setStep("input");
      }
      return;
    }

    // 有旧数据但没有 scan_credits → 只能看报告
    setInputPhase("report");
    setStep("input");
  }

  function handleSidebarHomeClick() {
    if (!data) { alert("请先完成一次品牌体检"); return; }
    setStep("dashboard");
  }

  function handleSidebarProbeClick() {
    if (!data) { alert("请先完成一次品牌体检"); return; }

    const probe = data?.probe || {};
    const hasProbeData = !!(probe.company_score || probe.citation_metrics);

    // 已有 Probe 数据 + 还有 probe_credits → 弹选择
    if (hasProbeData && probeCredits > 0) {
      const choice = confirm(
        "你还有 " + probeCredits + " 次侦察兵可用。\n\n" +
        "点「确定」开始一次新的侦察\n" +
        "点「取消」查看上次侦察报告"
      );
      if (choice) {
        const profile = getCachedProfile(scanDomain);
        setBriefingDefaults({
          domain: scanDomain,
          brandName: scanBrandName,
          industry: probe.brand_profile?.inferred_industry || profile?.inferred_industry || "",
          targetMarket: probe.brand_profile?.inferred_target_market || profile?.inferred_target_market || "",
          coreProduct: probe.brand_profile?.inferred_core_product || profile?.inferred_core_product || "",
          competitorMentions: probe.competitor_mentions || [],
        });
        setProbePhase("briefing");
        setStep("probe");
        return;
      }
      setProbePhase("report");
      setScanTabIndex(2);
      setStep("probe");
      return;
    }

    // 没有 Probe 数据 → 进 briefing
    if (scanMode === "light") {
      const profile = getCachedProfile(scanDomain);
      setBriefingDefaults({
        domain: scanDomain,
        brandName: scanBrandName,
        industry: probe.brand_profile?.inferred_industry || profile?.inferred_industry || "",
        targetMarket: probe.brand_profile?.inferred_target_market || profile?.inferred_target_market || "",
        coreProduct: probe.brand_profile?.inferred_core_product || profile?.inferred_core_product || "",
        competitorMentions: probe.competitor_mentions || [],
      });
      setProbePhase("briefing");
      setStep("probe");
      return;
    }

    // 已跑过 full scan → 直接看报告
    setProbePhase("report");
    setScanTabIndex(2);
    setStep("probe");
  }

  function handleSidebarAnalystClick() {
    if (!data) { alert("请先完成一次品牌体检"); return; }
    if (scanCredits === 0) {
      setUpgradeFeature("analyst");
      setShowUpgrade(true);
      return;
    }
    // 只有用户明确完成过 analyst 流程才直接进报告
    setAnalystPhase(analystCompleted && hasAnalystData ? "report" : "briefing");
    setStep("analyst");
  }

  function handleSidebarDoctorClick() {
    if (!data) { alert("请先完成一次品牌体检"); return; }
    if (scanCredits === 0) {
      setUpgradeFeature("doctor");
      setShowUpgrade(true);
      return;
    }
    // 只有用户明确完成过 doctor 流程才直接进报告
    setDoctorPhase(doctorCompleted && hasDoctorData ? "report" : "briefing");
    setStep("doctor");
  }

  function handleSidebarUpgradeClick(feature?: string) {
    setUpgradeFeature((feature as "analyst" | "doctor") || "analyst");
    setShowUpgrade(true);
  }

  // ═══════════════════════════════════════════
  // UPGRADE
  // ═══════════════════════════════════════════

  async function handleUpgradeConfirm() {
    setShowUpgrade(false);

    setUserTier("full");
    setTier("full");

    const token = localStorage.getItem("cf_token");
    if (token) {
      fetch(`${API_BASE}/api/auth/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier: "full" }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.token) localStorage.setItem("cf_token", d.token);
        })
        .catch(() => {});
    }

    if (data) setStep(upgradeFeature);
  }

  // ═══════════════════════════════════════════
  // RESUME
  // ═══════════════════════════════════════════

  function handleResumeScan() {
    if (!pendingScan) return;
    setPendingScan(null);
    startScan(pendingScan, pendingScan.mode || "light", pendingScan.mode === "full" ? "probe" : "input");
  }

  function handleAbortResume() {
    localStorage.removeItem(userKey("cf_pending_scan"));
    setPendingScan(null);
  }

  /** 取消正在进行的扫描 */
  function handleCancelScan() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (scanIdRef.current) {
      fetch(`${API_BASE}/api/scan/${scanIdRef.current}/cancel`, { method: "POST" }).catch(() => {});
      scanIdRef.current = null;
    }
    localStorage.removeItem(userKey("cf_pending_scan"));
    stopTimer();
    setStep("input");
    setInputPhase("form");
    setProbePhase("briefing");
    setErrorMsg("");
    setData(null);
    setScanDomain("");
    setScanBrandName("");
  }

  /** Light 扫描完成后升级到完整扫描 */
  function handleUpgradeToFull() {
    if (scanCredits === 0 && probeCredits === 0) {
      setUpgradeFeature("probe");
      setShowUpgrade(true);
      return;
    }
    const probe = data?.probe || {};
    setBriefingDefaults({
      domain: scanDomain,
      brandName: scanBrandName,
      industry: probe.company_score?.industry || probe.brand_profile?.inferred_industry || "",
      targetMarket: probe.brand_profile?.inferred_target_market || "",
      coreProduct: probe.brand_profile?.inferred_core_product || "",
      competitorMentions: probe.competitor_mentions || [],
    });
    setProbePhase("briefing");
    setStep("probe");
  }

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  if (!initialized) {
    return (
      <div style={{
        minHeight: "100vh", background: "#08080D", display: "flex",
        alignItems: "center", justifyContent: "center"
      }}>
        <div style={{
          width: 20, height: 20, border: "2px solid rgba(56,189,248,0.15)",
          borderTopColor: "#38BDF8", borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }} />
      </div>
    );
  }

  /** Probe 产品的 3-tab 视图（scanning 和 report 阶段共用） */
  function renderProbeTabs(phase: "briefing" | "scanning" | "report") {
    const tabLabelsMap = {
      briefing: [
        { id: 0, label: "简报室", sub: "BRIEFING" },
        { id: 1, label: "侦察室", sub: "SCANNING" },
        { id: 2, label: "侦察报告", sub: "REPORT" },
      ],
      scanning: [
        { id: 0, label: "简报回顾", sub: "BRIEFING" },
        { id: 1, label: "侦察中", sub: "SCANNING" },
        { id: 2, label: "侦察报告", sub: "REPORT" },
      ],
      report: [
        { id: 0, label: "简报回顾", sub: "BRIEFING" },
        { id: 1, label: "侦察回顾", sub: "SCANNING" },
        { id: 2, label: "侦察报告", sub: "REPORT" },
      ],
    };

    const tabs = tabLabelsMap[phase];

    return (
      <div className="flex-1 flex flex-col pb-8">
        {/* Tab bar */}
        <div className="relative shrink-0 ml-8 mr-[112px] mb-6" style={{ marginTop: 0 }}>
          <span className="absolute top-0 left-0 w-4 h-px" style={{ background: "linear-gradient(90deg, rgba(56,189,248,0.25), transparent)" }} />
          <span className="absolute top-0 left-0 w-px h-4" style={{ background: "linear-gradient(180deg, rgba(56,189,248,0.25), transparent)" }} />
          <span className="absolute top-0 right-0 w-4 h-px" style={{ background: "linear-gradient(270deg, rgba(56,189,248,0.25), transparent)" }} />
          <span className="absolute top-0 right-0 w-px h-4" style={{ background: "linear-gradient(180deg, rgba(56,189,248,0.25), transparent)" }} />

          <div
            className="flex"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderBottom: "none",
            }}
          >
            {tabs.map((tab) => {
              const isActive = scanTabIndex === tab.id;
              const clickable = phase === "briefing" ? tab.id === 0
                : phase === "scanning" ? tab.id !== 2
                : true;

              return (
                <button
                  key={tab.id}
                  onClick={() => { if (clickable) setScanTabIndex(tab.id); }}
                  disabled={!clickable}
                  className="flex-1 flex flex-col items-center justify-center relative py-4 transition-all duration-500 group"
                  style={{ cursor: clickable ? "pointer" : "default" }}
                >
                  <span
                    className="text-[9px] font-mono tracking-[0.14em] mb-1 transition-all duration-500"
                    style={{ color: isActive ? "rgba(56,189,248,0.45)" : clickable ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)" }}
                  >
                    {tab.sub}
                  </span>
                  <span
                    className="text-sm font-semibold tracking-wide transition-all duration-500"
                    style={{
                      color: isActive ? "#D0D0E0"
                        : clickable ? "#6A6A82"
                        : "#2A2A3A",
                    }}
                  >
                    {tab.label}
                  </span>
                  <motion.div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-500"
                    style={{
                      width: isActive ? "60%" : "0%",
                      background: isActive ? "linear-gradient(90deg, transparent, #38BDF8, transparent)" : "transparent",
                      boxShadow: isActive ? "0 0 10px rgba(56,189,248,0.5), 0 0 4px rgba(56,189,248,0.3)" : "none",
                      opacity: isActive ? 1 : 0,
                    }}
                  />
                  {clickable && !isActive && (
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ background: "radial-gradient(ellipse at center, rgba(56,189,248,0.025) 0%, transparent 70%)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative h-px" style={{ background: "rgba(255,255,255,0.05)" }}>
            <motion.div
              className="absolute h-px transition-all duration-500"
              style={{
                background: "linear-gradient(90deg, transparent, #38BDF8, transparent)",
                boxShadow: "0 0 8px rgba(56,189,248,0.35)",
                width: `${100 / 3}%`,
                left: `${scanTabIndex * (100 / 3)}%`,
              }}
            />
            <span className="absolute bottom-0 left-0 w-3 h-px" style={{ background: "rgba(56,189,248,0.12)" }} />
            <span className="absolute bottom-0 left-0 w-px h-2" style={{ background: "rgba(56,189,248,0.12)" }} />
            <span className="absolute bottom-0 right-0 w-3 h-px" style={{ background: "rgba(56,189,248,0.12)" }} />
            <span className="absolute bottom-0 right-0 w-px h-2" style={{ background: "rgba(56,189,248,0.12)" }} />
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 flex flex-col pl-6 pr-[120px]">
          {/* Tab 0 — 简报室/简报回顾 */}
          {scanTabIndex === 0 && (
            phase === "briefing" ? (
              briefingDefaults ? (
                <ProbeBriefing
                  domain={briefingDefaults.domain}
                  brandName={briefingDefaults.brandName}
                  industry={briefingDefaults.industry}
                  targetMarket={briefingDefaults.targetMarket}
                  coreProduct={briefingDefaults.coreProduct}
                  competitorMentions={briefingDefaults.competitorMentions}
                  onSubmit={handleBriefingConfirm}
                  onCancel={() => setStep(data ? "dashboard" : "input")}
                />
              ) : (
                <div className="flex items-center justify-center h-48">
                  <span className="w-4 h-4 border rounded-full animate-spin" style={{ borderColor: "rgba(56,189,248,0.12)", borderTopColor: "#38BDF8" }} />
                </div>
              )
            ) : (
              <div className="max-w-2xl mx-auto w-full py-4">
                <p className="text-[10px] font-mono tracking-[0.15em] uppercase mb-4" style={{ color: "rgba(56,189,248,0.5)" }}>
                  简报参数回顾
                </p>
                {briefingData ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ["域名", briefingData.domain],
                        ["品牌", briefingData.brand_name],
                        ["行业", briefingData.industry],
                        ["目标市场", briefingData.target_market],
                        ["核心产品", briefingData.core_product || "—"],
                        ["品牌定位", briefingData.target_positioning || "—"],
                      ].map(([label, val]) => (
                        <div key={label} className="p-3" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                          <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(255,255,255,0.14)" }}>{label}</p>
                          <p className="text-sm font-mono truncate" style={{ color: "#C8C8D8" }}>{val}</p>
                        </div>
                      ))}
                    </div>
                    {briefingData.competitors.length > 0 && (
                      <div className="mt-3 p-3" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <p className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "rgba(255,255,255,0.14)" }}>竞品 ({briefingData.competitors.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {briefingData.competitors.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 text-[10px]" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", color: "#9A9AB0" }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {[["域名", scanDomain], ["品牌", scanBrandName], ["扫描模式", scanMode === "full" ? "完整侦察" : "初步体检"]].map(([label, val]) => (
                      <div key={label} className="p-3" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <p className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "rgba(255,255,255,0.14)" }}>{label}</p>
                        <p className="text-sm font-mono truncate" style={{ color: "#C8C8D8" }}>{val}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* Tab 1 — 侦察室/侦察中/侦察回顾 */}
          {scanTabIndex === 1 && (
            phase === "briefing" ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl mb-2">🔬</p>
                  <p className="text-sm" style={{ color: "#9A9AB0" }}>完成简报后解锁</p>
                </div>
              </div>
            ) : phase === "scanning" ? (
              briefingData ? (
                <ScanProbeLoading elapsed={elapsed} domain={scanDomain} brandName={scanBrandName} briefingData={briefingData} progressLog={progressLog} onCancel={handleCancelScan} />
              ) : (
                <ScanLoading elapsed={elapsed} domain={scanDomain} brandName={scanBrandName} mode="full" progressMsg={progressMsg} onCancel={handleCancelScan} />
              )
            ) : (
              /* report phase — 侦察回顾（只读） */
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 mx-auto mb-4 rounded-full border-2"
                    style={{ borderColor: "rgba(56,189,248,0.12)", borderTopColor: "#38BDF8" }}
                  />
                  <p className="text-xs font-mono" style={{ color: "#5E5E78" }}>
                    完整侦察已完成
                  </p>
                </div>
              </div>
            )
          )}

          {/* Tab 2 — 侦察报告 */}
          {scanTabIndex === 2 && (
            phase === "report" ? (
              <ScanReport
                data={data}
                tier={tier}
                mode={scanMode}
                domain={scanDomain}
                brandName={scanBrandName}
                probeCredits={probeCredits}
                onUpgrade={() => { setUpgradeFeature("analyst"); setShowUpgrade(true); }}
                onBack={() => setStep("dashboard")}
                onViewAnalyst={() => {
                  if (scanCredits === 0) {
                    setUpgradeFeature("analyst");
                    setShowUpgrade(true);
                    return;
                  }
                  setAnalystPhase("briefing");
                  setStep("analyst");
                }}
                onBuyMore={() => { setUpgradeFeature("probe"); setShowUpgrade(true); }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl mb-2">📊</p>
                  <p className="text-sm" style={{ color: "#9A9AB0" }}>
                    {phase === "briefing" ? "完成侦察后解锁" : "侦察完成后解锁"}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  // 当 analyst/doctor 报告被渲染时，标记已完成
  useEffect(() => {
    if (step === "analyst" && analystPhase === "report" && !analystCompleted) {
      setAnalystCompleted(true);
      try { localStorage.setItem(userKey("cf_analyst_done"), "1"); } catch {}
    }
  }, [step, analystPhase, analystCompleted]);
  useEffect(() => {
    if (step === "doctor" && doctorPhase === "report" && !doctorCompleted) {
      setDoctorCompleted(true);
      try { localStorage.setItem(userKey("cf_doctor_done"), "1"); } catch {}
    }
  }, [step, doctorPhase, doctorCompleted]);

  function renderAnalystContent(phase: "briefing" | "report") {
    return (
      <div className="flex-1 flex flex-col pb-8">
        <div className="flex-1 ml-8 mr-[112px]">
          {phase === "briefing" && (
            <ScanAnalystBriefing
              probeOutput={data?.probe_output || data?.probe || data}
              onComplete={(analystOutput: any) => {
                setData((prev: any) => ({ ...prev, ...analystOutput }));
                setAnalystPhase("report");
              }}
              onScanningChange={setAnalystScanning}
            />
          )}
          {phase === "report" && (
            <ScanAnalystReport
              data={data}
              mode={scanMode}
              onBackToBriefing={() => setAnalystPhase("briefing")}
              onViewDoctor={() => { setDoctorPhase("briefing"); setStep("doctor"); }}
            />
          )}
        </div>
      </div>
    );
  }

  function renderDoctorContent(phase: DoctorPhase) {
    return (
      <div className="flex-1 flex flex-col pb-8">
        <div className="flex-1 ml-8 mr-[112px]">
          {phase === "briefing" && (
            <ScanDoctorBriefing
              data={data}
              onComplete={(doctorOutput: any) => {
                setData((prev: any) => ({
                  ...prev,
                  prescription: doctorOutput.prescription,
                  prescription_summary: doctorOutput.summary,
                  knowledge_sources: doctorOutput.knowledge_sources,
                }));
                setDoctorPhase("generating");
                // 模拟生成动画后跳到 report（4 张卡片 × 600ms + 600ms buffer）
                setTimeout(() => {
                  setDoctorPhase("report");
                  deductCredit("full");
                }, 3000);
              }}
            />
          )}
          {phase === "generating" && (
            <ScanDoctorGenerating />
          )}
          {phase === "report" && (
            <div className="flex-1 ml-8 mr-[112px] overflow-y-auto">
              <div className="max-w-[780px] mx-auto pt-6 pb-8">
                <ScanDoctorWorkshop
                  prescription={data?.prescription || []}
                  summary={data?.prescription_summary || ""}
                  paperCount={data?.knowledge_sources?.length || 0}
                  domain={scanDomain}
                  brandName={scanBrandName || scanDomain}
                  scanCredits={scanCredits}
                  onNewScan={() => { setInputPhase("form"); setInputReportData(null); setStep("input"); }}
                  onUpgrade={() => { setUpgradeFeature("analyst"); setShowUpgrade(true); }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <ScanPageErrorBoundary>
    <div className="flex min-h-screen">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          opacity: 0.07,
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.25) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      <ScanSidebar
        currentStep={step}
        inputPhase={inputPhase}
        analystPhase={analystPhase}
        isScanning={(step === "input" && inputPhase === "scanning") || (step === "probe" && probePhase === "scanning") || (step === "analyst" && analystScanning)}
        tier={tier}
        scanMode={scanMode}
        hasData={!!data}
        hasAnalystData={hasAnalystData}
        hasDoctorData={hasDoctorData}
        scanCredits={scanCredits}
        probeCredits={probeCredits}
        domain={scanDomain}
        brandName={scanBrandName}
        onInputClick={handleSidebarInputClick}
        onHomeClick={handleSidebarHomeClick}
        onProbeClick={handleSidebarProbeClick}
        onAnalystClick={handleSidebarAnalystClick}
        onDoctorClick={handleSidebarDoctorClick}
        onUpgradeClick={handleSidebarUpgradeClick}
      />

      <main className="flex-1 ml-[160px] flex flex-col px-6 pt-4 pb-8 overflow-y-auto">
        {/* ═══ step = "input" (初步体检: form → scanning → report) ═══ */}
        {step === "input" && (
          <>
            {/* guide 阶段：新手引导卡片 */}
            {inputPhase === "guide" && (
              <ScanOnboardingGuide
                onStart={() => setInputPhase("form")}
              />
            )}

            {inputPhase === "form" && (
              pendingScan ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-6">
                  <div className="px-8 py-8 rounded-sm max-w-md w-full text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="mb-4 flex justify-center">
                      <span className="inline-block w-3 h-3 rounded-full"
                        style={{ background: "#F59E0B", boxShadow: "0 0 12px rgba(245,158,11,0.5), 0 0 4px rgba(245,158,11,0.8)" }} />
                    </div>
                    <p className="text-sm font-medium mb-2" style={{ color: "#EDEDF5" }}>检测到中断的扫描</p>
                    <p className="text-xs mb-1" style={{ color: "#9A9AB0" }}>
                      域名 <span className="font-mono" style={{ color: "#7DD3FC" }}>{scanDomain || "—"}</span>
                    </p>
                    {scanBrandName && scanBrandName !== scanDomain && (
                      <p className="text-xs mb-4" style={{ color: "#5E5E78" }}>品牌 {scanBrandName}</p>
                    )}
                    {!scanBrandName && <div className="mb-4" />}
                    <p className="text-[10px] mb-6" style={{ color: "rgba(255,255,255,0.12)" }}>上次扫描意外中断，点击下方按钮可从断点续扫</p>
                    <div className="flex gap-3 justify-center">
                      <button onClick={handleResumeScan}
                        className="px-6 py-2.5 text-sm font-medium rounded-sm transition-all duration-300"
                        style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.22)", color: "#7DD3FC" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(56,189,248,0.20)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.35)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(56,189,248,0.12)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.22)"; }}
                      >继续扫描</button>
                      <button onClick={handleAbortResume}
                        className="px-5 py-2.5 text-xs font-medium rounded-sm transition-all duration-300"
                        style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.25)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                      >放弃，重新开始</button>
                    </div>
                  </div>
                </div>
              ) : (
                <ScanChat onComplete={handleInputComplete} />
              )
            )}

            {inputPhase === "scanning" && (
              <ScanLoading elapsed={elapsed} domain={scanDomain} brandName={scanBrandName} progressMsg={progressMsg} onCancel={handleCancelScan} />
            )}

            {inputPhase === "report" && (inputReportData || data) && (
              <ScanResult
                data={inputReportData || data}
                mode="light"
                brandName={scanBrandName}
                onUpgrade={() => { setUpgradeFeature("analyst"); setShowUpgrade(true); }}
                onViewDashboard={() => setStep("dashboard")}
                onUpgradeToFull={handleUpgradeToFull}
                scanCredits={scanCredits}
                probeCredits={probeCredits}
                onUpgradeClick={(product) => { setUpgradeFeature(product === "full" ? "analyst" : "probe"); setShowUpgrade(true); }}
              />
            )}
          </>
        )}

        {/* ═══ step = "probe" (Probe侦察兵: briefing → scanning → report) ═══ */}
        {step === "probe" && renderProbeTabs(probePhase)}

        {/* ═══ step = "analyst" (Analyst 诊断师: briefing → report) ═══ */}
        {step === "analyst" && renderAnalystContent(analystPhase)}

        {/* ═══ step = "doctor" (Doctor 处方: briefing → generating → report) ═══ */}
        {step === "doctor" && renderDoctorContent(doctorPhase)}

        {/* ═══ step = "dashboard" (仪表盘总览) ═══ */}
        {step === "dashboard" && (
          <ScanDashboard
            data={data}
            tier={tier}
            mode={scanMode}
            domain={scanDomain}
            brandName={scanBrandName}
            lastScanTime={lastScanTime}
            scanCredits={scanCredits}
            probeCredits={probeCredits}
            onViewReport={handleViewReport}
            onUpgrade={(feature) => { setUpgradeFeature(feature || "probe"); setShowUpgrade(true); }}
            onNavigateToStep={(step) => {
              if (step === "analyst") { setAnalystPhase((analystCompleted && hasAnalystData) ? "report" : "briefing"); setStep("analyst"); }
              else if (step === "doctor") { setDoctorPhase((doctorCompleted && hasDoctorData) ? "report" : "briefing"); setStep("doctor"); }
            }}
            onNewScan={() => { setInputPhase("form"); setInputReportData(null); setStep("input"); }}
            onNewProbe={() => {
              const probe = data?.probe || {};
              const profile = getCachedProfile(scanDomain);
              setBriefingDefaults({
                domain: scanDomain, brandName: scanBrandName,
                industry: probe.brand_profile?.inferred_industry || profile?.inferred_industry || "",
                targetMarket: probe.brand_profile?.inferred_target_market || profile?.inferred_target_market || "",
                coreProduct: probe.brand_profile?.inferred_core_product || profile?.inferred_core_product || "",
                competitorMentions: probe.competitor_mentions || [],
              });
              setProbePhase("briefing"); setStep("probe");
            }}
          />
        )}

        {/* ═══ step = "error" ═══ */}
        {step === "error" && (
          <div className="flex flex-col items-center gap-6 mt-20">
            <div className="px-6 py-4 rounded-sm max-w-md text-center"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
              <p className="text-sm font-medium text-[#EF4444] mb-1">扫描中断</p>
              <p className="text-xs text-cf-muted">{errorMsg}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleReScan}
                className="px-6 py-2.5 text-sm font-medium rounded-sm transition-all duration-300"
                style={{ background: "#7DD3FC", border: "1px solid #7DD3FC", color: "#0A0A0F" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#38BDF8"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#7DD3FC"; }}
              >重新扫描</button>
              <button onClick={handleRetry}
                className="px-6 py-2.5 text-sm font-medium rounded-sm transition-all duration-300"
                style={{ background: "rgba(56,189,248,0.10)", border: "1px solid rgba(56,189,248,0.18)", color: "#7DD3FC" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(56,189,248,0.18)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.30)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(56,189,248,0.10)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.18)"; }}
              >返回修改</button>
            </div>
          </div>
        )}
      </main>

      {showUpgrade && (
        <UpgradeModal
          feature={upgradeFeature}
          tier={tier}
          onClose={() => setShowUpgrade(false)}
        />
      )}

      {creditNotification && (
        <CreditUnlockModal
          product={creditNotification.product}
          count={creditNotification.count}
          onClose={() => setCreditNotification(null)}
        />
      )}
    </div>
    </ScanPageErrorBoundary>
  );
}
