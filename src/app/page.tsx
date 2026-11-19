"use client";

import React, { useState, useEffect } from "react";
import DashboardTab from "@/components/DashboardTab";
import HistoryTab from "@/components/HistoryTab";
import BuilderTab from "@/components/BuilderTab";
import CheckerTab from "@/components/CheckerTab";
import PlayWheTab from "@/components/PlayWheTab";
import WinForLifeTab from "@/components/WinForLifeTab";
import SettingsTab from "@/components/SettingsTab";
import WelcomeTab from "@/components/WelcomeTab";
import SyndicateTab from "@/components/SyndicateTab";
import CashPotTab from "@/components/CashPotTab";
import Pick4Tab from "@/components/Pick4Tab";
import FastCashTab from "@/components/FastCashTab";
import LiveDrawTicker from "@/components/LiveDrawTicker";
import AppSplashScreen from "@/components/AppSplashScreen";
import MultiBallMathPanel from "@/components/MultiBallMathPanel";
import LottoDiff35Panel from "@/components/LottoDiff35Panel";
import LottoQuant100Panel from "@/components/LottoQuant100Panel";
import LottoAuditPanel from "@/components/LottoAuditPanel";
import LottoForensicPanel from "@/components/LottoForensicPanel";
import EngineBenchmarkTracker from "@/components/EngineBenchmarkTracker";
import GameHeaderBanner from "@/components/GameHeaderBanner";
import PushNotificationBell from "@/components/PushNotificationBell";
import MemberCheckInPill from "@/components/MemberCheckInPill";
import { Activity, BarChart2, Calendar, ClipboardList, Camera, HelpCircle, ChevronDown, Layers, Compass, RefreshCw, Users, Brain, Flame, Binary, ShieldCheck, Cpu, Zap, Gamepad2, Menu, X, DollarSign } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { getCacheItem, setCacheItem } from "@/lib/idb_cache";
import WinConceptLogoEmblem from "@/components/WinConceptLogoEmblem";
import { NLCB_GAME_GUIDE } from "@/lib/game_guide";

const QuantumLogoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Quantum Orbitals */}
    <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" stroke="currentColor" strokeOpacity="0.6" />
    <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" stroke="currentColor" strokeOpacity="0.6" />
    
    {/* Core Lattice Nucleus */}
    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" stroke="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    
    {/* Discrete Nodal Satellites */}
    <circle cx="5" cy="8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="19" cy="16" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="18" cy="7" r="1" fill="currentColor" stroke="none" />
    <circle cx="6" cy="17" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const LottoPlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Outer circle */}
    <circle cx="12" cy="12" r="10" />
    {/* L letter */}
    <path d="M9 7v10h6" />
    {/* Plus sign */}
    <path d="M12 7v4M10 9h4" />
  </svg>
);

const PlayWheIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Outer wheel ring */}
    <circle cx="12" cy="12" r="9" />
    {/* Inner target circle */}
    <circle cx="12" cy="12" r="4" />
    {/* Radial spoke dividers */}
    <line x1="12" y1="3" x2="12" y2="8" />
    <line x1="12" y1="16" x2="12" y2="21" />
    <line x1="3" y1="12" x2="8" y2="12" />
    <line x1="16" y1="12" x2="21" y2="12" />
  </svg>
);

export default function Home() {
  const [activeTab, setActiveTab] = useState<"welcome" | "lotto-plus" | "scanner" | "play-whe" | "win-for-life" | "cashpot" | "pick4" | "fast-cash" | "syndicate" | "engine-tracker" | "settings">("welcome");
  const [utilitySubTool, setUtilitySubTool] = useState<"scanner" | "nl-query">("scanner");
  const [lottoSubTab, setLottoSubTab] = useState<"dashboard" | "math-engine" | "diff-35" | "quant-100" | "forensic" | "audit" | "history" | "builder" | "explain">("dashboard");
  const [playWheSubTab, setPlayWheSubTab] = useState<"dashboard" | "transition" | "math-engine" | "diff" | "history" | "translator" | "relationship" | "hits" | "explain" | "network" | "audit" | "forensic">("dashboard");
  
  const [mobileSheet, setMobileSheet] = useState<null | "games" | "more">(null);
  const [desktopGamesOpen, setDesktopGamesOpen] = useState(false);

  const isGameTab = ["lotto-plus", "play-whe", "win-for-life", "cashpot", "pick4", "fast-cash"].includes(activeTab);

  const handleTabChange = (tab: "welcome" | "lotto-plus" | "scanner" | "play-whe" | "win-for-life" | "cashpot" | "pick4" | "fast-cash" | "syndicate" | "engine-tracker" | "settings") => {
    triggerHaptic("selection");
    setActiveTab(tab);
    setMobileSheet(null);
    setDesktopGamesOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  
  // Dashboard Stats States
  const [timeframe, setTimeframe] = useState("alltime");
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // History Draws States
  const [draws, setDraws] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, pages: 1 });
  const [historySearch, setHistorySearch] = useState("");
  const [historyNumberFilter, setHistoryNumberFilter] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  
  // Prediction Builder Cached Draws (for live delta calculations)
  const [allDraws, setAllDraws] = useState<any[]>([]);

  // 1. Fetch dashboard statistics with IndexedDB + localStorage fallback
  const fetchStats = async () => {
    setStatsLoading(true);
    const cacheKey = `win_concept_stats_${timeframe}`;
    try {
      const res = await fetch(`/api/stats?timeframe=${timeframe}`);
      const data = await res.json();
      if (data.success) {
        setStats(data);
        await setCacheItem(cacheKey, data);
        if (typeof window !== "undefined") {
          try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) {}
        }
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      const idbData = await getCacheItem(cacheKey);
      if (idbData) {
        setStats(idbData);
        console.log(`[IndexedDB Cache] Loaded stats for timeframe: ${timeframe}`);
      } else if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setStats(JSON.parse(cached));
            console.log(`[Offline Cache] Loaded stats for timeframe: ${timeframe}`);
          } catch (e) {
            console.error("Error parsing cached stats:", e);
          }
        }
      }
    } finally {
      setStatsLoading(false);
    }
  };

  // 2. Fetch history draws with IndexedDB + localStorage fallback
  const fetchHistoryDraws = async (page: number = 1) => {
    setHistoryLoading(true);
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: pagination.limit.toString(),
      search: historySearch,
      number: historyNumberFilter
    });
    const cacheKey = `win_concept_draws_${queryParams.toString()}`;
    try {
      const res = await fetch(`/api/draws?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDraws(data.draws);
        setPagination(data.pagination);
        await setCacheItem(cacheKey, data);
        if (typeof window !== "undefined") {
          try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) {}
        }
      }
    } catch (err) {
      console.error("Error fetching history draws:", err);
      const idbDrawsData = await getCacheItem(cacheKey);
      if (idbDrawsData) {
        setDraws(idbDrawsData.draws);
        setPagination(idbDrawsData.pagination);
        console.log(`[IndexedDB Cache] Loaded history page ${page}`);
      } else if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setDraws(parsed.draws);
            setPagination(parsed.pagination);
            console.log(`[Offline Cache] Loaded history page ${page}`);
          } catch (e) {
            console.error("Error parsing cached draws:", e);
          }
        }
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  // 3. Fetch all draws for client-side delta analysis with IndexedDB
  const fetchAllDraws = async () => {
    const cacheKey = "win_concept_all_draws";
    try {
      const res = await fetch(`/api/draws?limit=5000`);
      const data = await res.json();
      if (data.success) {
        setAllDraws(data.draws);
        await setCacheItem(cacheKey, data.draws);
        if (typeof window !== "undefined") {
          try { localStorage.setItem(cacheKey, JSON.stringify(data.draws)); } catch (e) {}
        }
      }
    } catch (err) {
      console.error("Error fetching all draws:", err);
      const idbAllDraws = await getCacheItem<any[]>(cacheKey);
      if (idbAllDraws && idbAllDraws.length > 0) {
        setAllDraws(idbAllDraws);
        console.log("[IndexedDB Cache] Loaded all draws for wheeling analysis");
      } else if (typeof window !== "undefined") {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setAllDraws(JSON.parse(cached));
            console.log("[Offline Cache] Loaded all draws for wheeling analysis");
          } catch (e) {
            console.error("Error parsing cached all draws:", e);
          }
        }
      }
    }
  };

  // Trigger stats reload on mount & timeframe change
  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  // Lazy-load Lotto Plus history table when Lotto Plus tab is active
  useEffect(() => {
    if (activeTab === "lotto-plus") {
      fetchHistoryDraws(pagination.page);
    }
  }, [activeTab, pagination.page, historySearch, historyNumberFilter]);

  // Register PWA Service Worker on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("PWA Service Worker registered:", reg.scope))
        .catch((err) => console.error("PWA Service Worker registration failed:", err));
    }
  }, []);

  // Free privacy-friendly visitor & active tab telemetry (Turso DB)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let visitorId = localStorage.getItem("win_concept_visitor_id");
    if (!visitorId) {
      visitorId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem("win_concept_visitor_id", visitorId);
    }
    const isNewSession = !sessionStorage.getItem("win_concept_session_counted");
    if (isNewSession) sessionStorage.setItem("win_concept_session_counted", "1");
    const displayName = localStorage.getItem("win_concept_display_name") || undefined;

    fetch("/api/analytics/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, displayName, activeTab, isNewSession })
    }).catch(() => {});
  }, [activeTab]);

  // Lazy-load all draws only when Builder tab is active (avoids 500KB+ fetch on every page load)
  useEffect(() => {
    if (activeTab === "lotto-plus" && lottoSubTab === "builder" && allDraws.length === 0) {
      fetchAllDraws();
    }
  }, [activeTab, lottoSubTab]);

  // Smart Read-First Auto-Refresh: Lightweight cached DB watchdog poll + bounded stale-draw pulse
  useEffect(() => {
    let isMounted = true;
    let refreshInterval: NodeJS.Timeout;
    let lastDrawSignature = "";

    const checkLiveUpdates = async () => {
      if (typeof window === "undefined" || document.visibilityState === "hidden") return;

      try {
        const watchdogRes = await fetch("/api/watchdog");
        if (!watchdogRes.ok) return;
        const watchdog = await watchdogRes.json();
        if (!isMounted) return;

        const g = watchdog?.games;
        const signature = g
          ? `${g.playWhe?.latestDrawNumber}|${g.pick4?.latestDrawNumber}|${g.cashPot?.latestDrawNumber}|${g.lottoPlus?.latestDrawNumber}|${g.winForLife?.latestDrawNumber}`
          : "";

        // Refresh local view immediately whenever the DB shows newer results from background crons
        if (signature && lastDrawSignature && signature !== lastDrawSignature) {
          localStorage.setItem("win_concept_last_sync_timestamp", Date.now().toString());
          fetchStats();
          fetchHistoryDraws(pagination.page);
          window.dispatchEvent(new CustomEvent("win_concept_sync_completed", { detail: { watchdog } }));
        }
        if (signature) lastDrawSignature = signature;

        // Only nudge bounded stale-draw pulse if results are lagging past schedule or a gap exists
        if ((watchdog?.laggingGamesCount || 0) > 0 || (watchdog?.sequenceGapsCount || 0) > 0) {
          const lastPulseStr = localStorage.getItem("win_concept_last_sync_timestamp");
          const lastPulse = lastPulseStr ? parseInt(lastPulseStr, 10) : 0;
          if (Date.now() - lastPulse < 120 * 1000) return;

          localStorage.setItem("win_concept_last_sync_timestamp", Date.now().toString());
          const pulseRes = await fetch("/api/sync/pulse", { method: "POST" });
          const pulseData = await pulseRes.json().catch(() => null);

          if (isMounted && pulseData && (pulseData.totalDrawsAdded || 0) > 0) {
            fetchStats();
            fetchHistoryDraws(pagination.page);
            window.dispatchEvent(new CustomEvent("win_concept_sync_completed", { detail: pulseData }));
          }
        }
      } catch (err) {
        console.warn("[AutoSync] Lightweight status check notice:", err);
      }
    };

    checkLiveUpdates();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkLiveUpdates();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Poll lightweight cached DB watchdog every 90s while tab is visible
    refreshInterval = setInterval(checkLiveUpdates, 90 * 1000);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [pagination.page]);



  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col selection:bg-primary/30 selection:text-white relative overflow-x-hidden">
      
      {/* Dynamic Ambient Reactive Aura */}
      <div className={`ambient-aura aura-${activeTab}`} aria-hidden="true" />

      {/* Pre-Landing Initial Loading & Splash Screen */}
      <AppSplashScreen isLoading={statsLoading} />

      {/* Global Terminal Header */}
      <header className="glass-panel border-b border-white/5 sticky top-0 z-50 py-2.5 sm:py-3 px-3 sm:px-6 lg:px-10 flex justify-between items-center gap-3 bg-slate-950/85 backdrop-blur-md w-full">
        <div className="flex items-center gap-2.5 shrink-0">
          <WinConceptLogoEmblem 
            size="sm" 
            onClick={() => handleTabChange("welcome")}
            className="cursor-pointer"
          />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base lg:text-lg font-black tracking-wider text-white uppercase font-mono whitespace-nowrap">
              The Win Concept
            </h1>
            <p className="text-[9px] sm:text-[10px] tracking-wider text-primary font-mono font-semibold uppercase whitespace-nowrap">
              NLCB Analytics &amp; Cost Guide
            </p>
          </div>
        </div>

        {/* Desktop Global Navigation (Clean 6-item bar, zero overflow at 1280px) */}
        <div className="hidden md:flex items-center gap-1.5 relative">
          <nav className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-white/10">
            {/* HOME */}
            <button
              onClick={() => handleTabChange("welcome")}
              className={`h-9 px-3 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "welcome"
                  ? "bg-sky-500/20 border border-sky-400 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                  : "text-gray-400 hover:text-sky-300 border border-transparent hover:bg-sky-500/10"
              }`}
            >
              <img src="/images/welcome_icon.png" alt="Home" className="w-4 h-4 object-contain rounded shrink-0" />
              <span>HOME</span>
            </button>

            {/* GAMES DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setDesktopGamesOpen((v) => !v)}
                className={`h-9 px-3 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isGameTab
                    ? "bg-amber-500/20 border border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]"
                    : "text-gray-300 hover:text-white border border-transparent hover:bg-white/5"
                }`}
              >
                <Gamepad2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {isGameTab
                    ? NLCB_GAME_GUIDE.find((g) => g.key === activeTab)?.name.toUpperCase() || "GAMES"
                    : "GAMES (6)"}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${desktopGamesOpen ? "rotate-180" : ""}`} />
              </button>

              {desktopGamesOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDesktopGamesOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-80 p-2 rounded-2xl bg-slate-950/95 border border-white/15 shadow-2xl z-50 space-y-1 backdrop-blur-xl">
                    <div className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 border-b border-white/5">
                      Select NLCB Game
                    </div>
                    {NLCB_GAME_GUIDE.map((g) => (
                      <button
                        key={g.key}
                        onClick={() => handleTabChange(g.key)}
                        className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl transition cursor-pointer text-left ${
                          activeTab === g.key
                            ? "bg-sky-500/15 border border-sky-400/40 text-white"
                            : "hover:bg-white/5 border border-transparent text-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={g.iconSrc} alt={g.name} className="w-7 h-7 rounded-lg object-contain shrink-0 border border-white/10" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{g.name}</div>
                            <div className="text-[10px] text-gray-400 truncate">{g.tagline}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0">
                          {g.costPerPlay}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ENGINES */}
            <button
              onClick={() => handleTabChange("engine-tracker")}
              className={`h-9 px-3 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "engine-tracker"
                  ? "bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                  : "text-gray-400 hover:text-cyan-300 border border-transparent hover:bg-cyan-500/10"
              }`}
            >
              <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>ENGINES</span>
            </button>

            {/* SCANNER */}
            <button
              onClick={() => handleTabChange("scanner")}
              className={`h-9 px-3 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "scanner"
                  ? "bg-purple-500/20 border border-purple-400 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                  : "text-gray-400 hover:text-purple-300 border border-transparent hover:bg-purple-500/10"
              }`}
            >
              <img src="/images/scanner_icon.png" alt="Scanner" className="w-4 h-4 object-contain rounded shrink-0" />
              <span>SCANNER</span>
            </button>

            {/* POOLS */}
            <button
              onClick={() => handleTabChange("syndicate")}
              className={`h-9 px-3 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "syndicate"
                  ? "bg-violet-500/20 border border-violet-400 text-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.2)]"
                  : "text-gray-400 hover:text-violet-300 border border-transparent hover:bg-violet-500/10"
              }`}
            >
              <img src="/images/syndicate_icon.png" alt="Pools" className="w-4 h-4 object-contain rounded shrink-0" />
              <span>POOLS</span>
            </button>

            {/* SETTINGS */}
            <button
              onClick={() => handleTabChange("settings")}
              className={`h-9 px-3 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "settings"
                  ? "bg-slate-700/40 border border-slate-400 text-slate-200 shadow-[0_0_12px_rgba(148,163,184,0.2)]"
                  : "text-gray-400 hover:text-slate-200 border border-transparent hover:bg-slate-700/20"
              }`}
            >
              <img src="/images/settings_icon.png" alt="Settings" className="w-4 h-4 object-contain rounded shrink-0" />
              <span>SETTINGS</span>
            </button>
          </nav>
        </div>

        {/* Right: Alerts & Member Check-In (Desktop + Mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <MemberCheckInPill />
          <PushNotificationBell />
        </div>
      </header>

      {/* Global Live Draw Ticker & Auto-Sync Bar */}
      <LiveDrawTicker onSelectGame={setActiveTab} />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 md:px-12 py-4 sm:py-8 pb-28 md:pb-8 overflow-x-hidden">
        
        {/* Lotto Plus Hero Header & Sub-Navigation */}
        {activeTab === "lotto-plus" && (
          <div className="space-y-6 mb-6">
            <GameHeaderBanner
              game="lotto-plus"
              title="Lotto Plus"
              subtitle="5 of 35 Main Numbers + 1 of 10 Powerball • Wednesday & Saturday 8:30 PM • $5.00 TT / play"
              themeColor="sky"
              iconSrc="/images/lotto_plus_icon.png"
              totalDrawsCount={stats?.totalDraws || pagination.total}
              loading={statsLoading}
              latestDraw={
                stats?.latestDraw || (draws.length > 0 ? draws[0] : null)
                  ? {
                      draw_number: (stats?.latestDraw || draws[0]).draw_number,
                      draw_date: (stats?.latestDraw || draws[0]).draw_date,
                      winning_display: (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            (stats?.latestDraw || draws[0]).num1,
                            (stats?.latestDraw || draws[0]).num2,
                            (stats?.latestDraw || draws[0]).num3,
                            (stats?.latestDraw || draws[0]).num4,
                            (stats?.latestDraw || draws[0]).num5,
                          ].map((n: number, idx: number) => (
                            <span
                              key={idx}
                              className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-400 text-sky-200 font-black text-xs flex items-center justify-center font-mono shadow-[0_0_8px_rgba(56,189,248,0.4)]"
                            >
                              {n}
                            </span>
                          ))}
                          <span className="text-white font-bold text-xs">+</span>
                          <span
                            className="w-7 h-7 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center font-mono shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                            title="Powerball"
                          >
                            {(stats?.latestDraw || draws[0]).powerball}
                          </span>
                        </div>
                      ),
                    }
                  : null
              }
            />

            <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full md:w-fit overflow-x-auto flex-nowrap sleek-scrollbar gap-1">
              {[
                { id: "dashboard", label: "DASHBOARD & STATS", icon: BarChart2 },
                { id: "math-engine", label: "MATHEMATICAL ENGINE", icon: Brain },
                { id: "diff-35", label: "SUM-35 QUANT ENGINE", icon: Binary },
                { id: "quant-100", label: "100% QUANT ENGINE", icon: ShieldCheck },
                { id: "forensic", label: "FORENSIC ENGINE", icon: Cpu },
                { id: "audit", label: "AUDIT & VERIFICATION", icon: ShieldCheck },
                { id: "builder", label: "WHEELING BUILDER", icon: ClipboardList },
                { id: "history", label: "DRAW ARCHIVE", icon: Calendar },
                { id: "explain", label: "METHODOLOGY", icon: HelpCircle },
              ].map((tabItem) => {
                const IconComp = tabItem.icon;
                const isActive = lottoSubTab === tabItem.id;
                return (
                  <button
                    key={tabItem.id}
                    onClick={() => setLottoSubTab(tabItem.id as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "bg-sky-500 text-slate-950 font-black shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    {tabItem.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Render Active View Tab */}
        {activeTab === "welcome" && (
          <div className="tab-content-enter">
            <WelcomeTab 
              onSelectGame={(game) => {
                if ((game as string) === "scanner-query") {
                  setUtilitySubTool("nl-query");
                  setActiveTab("scanner");
                } else {
                  if (game === "scanner") setUtilitySubTool("scanner");
                  setActiveTab(game);
                }
              }} 
            />
          </div>
        )}

        {activeTab === "lotto-plus" && lottoSubTab === "dashboard" && (
          <div className="tab-content-enter">
            <DashboardTab
              stats={stats}
              statsLoading={statsLoading}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
            />
          </div>
        )}

        {activeTab === "lotto-plus" && lottoSubTab === "math-engine" && (
          <div className="tab-content-enter">
            <MultiBallMathPanel game="lotto-plus" />
          </div>
        )}

        {activeTab === "lotto-plus" && lottoSubTab === "diff-35" && (
          <div className="tab-content-enter">
            <LottoDiff35Panel />
          </div>
        )}

        {activeTab === "lotto-plus" && lottoSubTab === "quant-100" && (
          <div className="tab-content-enter">
            <LottoQuant100Panel />
          </div>
        )}

        {activeTab === "lotto-plus" && lottoSubTab === "forensic" && (
          <div className="tab-content-enter">
            <LottoForensicPanel />
          </div>
        )}

        {activeTab === "lotto-plus" && lottoSubTab === "audit" && (
          <div className="tab-content-enter">
            <LottoAuditPanel />
          </div>
        )}
        
        {activeTab === "lotto-plus" && lottoSubTab === "history" && (
          <div className="tab-content-enter">
            <HistoryTab
              draws={draws}
              pagination={pagination}
              loading={historyLoading}
              onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
              onSearchChange={setHistorySearch}
              onNumberFilterChange={setHistoryNumberFilter}
            />
          </div>
        )}
        
        {activeTab === "lotto-plus" && lottoSubTab === "builder" && (
          <div className="tab-content-enter">
            <BuilderTab
              historicalDraws={allDraws}
            />
          </div>
        )}

        {activeTab === "lotto-plus" && lottoSubTab === "explain" && (
          <div className="tab-content-enter space-y-6">
            {/* Explainer Header */}
            <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/40">
              <h2 className="text-sm font-bold font-mono tracking-widest text-white uppercase mb-2">Lotto Plus System Explainer</h2>
              <p className="text-[11px] text-gray-400 font-mono leading-relaxed max-w-2xl">
                The Lotto Plus dashboard uses advanced statistical modeling to track, analyze, and combine numbers drawn in the Trinidad & Tobago NLCB Lotto Plus game.
              </p>
            </div>

            {/* Explainer Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Delta System */}
              <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold font-mono text-[11px] uppercase">
                  <Activity className="w-4 h-4 text-primary" />
                  1. Delta Number Analysis
                </div>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  Instead of analyzing raw numbers, the Delta System calculates the mathematical <strong>differences (deltas)</strong> between consecutive numbers in a draw. 
                </p>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  Since lottery numbers are drawn sequentially but ordered ascendingly, their deltas follow a highly predictable distribution. Over 90% of winning combinations feature deltas that sum up to less than 15. The system uses these intervals to filter out low-probability sets.
                </p>
              </div>

              {/* Card 2: Wheeling Engine */}
              <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold font-mono text-[11px] uppercase">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  2. Combinatorial Wheeling
                </div>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  A <strong>Wheeling System</strong> allows you to select a large pool of numbers (e.g. 10 to 15 numbers) and mathematically compile them into an optimized set of tickets (combinations).
                </p>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  Rather than buying all possible combinations (which would require hundreds of tickets), the Wheeling Engine runs coverage algorithms (e.g., Abbreviated Wheel) to guarantee that if your chosen pool contains the winning numbers, you will win at least a 3-match or 4-match prize on at least one ticket.
                </p>
              </div>

              {/* Card 3: Monochromatic Heatmap */}
              <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold font-mono text-[11px] uppercase">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  3. Monochromatic Heatmap & Overlay
                </div>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  The frequency grid is shaded dynamically using monochromatic opacity levels. Numbers that are drawn more frequently in history light up with high opacity (amber/gold for hot ranges; charcoal for cold).
                </p>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  In the <strong>Wheeling Workspace</strong>, you can toggle the **Heatmap Overlay ON/OFF** directly over the Step 1 selection buttons to instantly identify hot/cold values as you select your pool!
                </p>
              </div>

              {/* Card 4: Companion Mappings */}
              <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold font-mono text-[11px] uppercase">
                  <Compass className="w-4 h-4 text-primary" />
                  4. Companion Correlations
                </div>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  Numbers are not drawn in isolation. The system tracks <strong>Companion (Partner) Numbers</strong>—which numbers are drawn together most frequently.
                </p>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  When you select a pool in the wheeling engine workspace, the dashboard dynamically scans the historical database to identify and recommend "Companion Numbers" that have high historical co-occurrence with your selected pool.
                </p>
              </div>

              {/* Card 5: Slip Validation & Quality Grading */}
              <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold font-mono text-[11px] uppercase">
                  <Layers className="w-4 h-4 text-primary" />
                  5. Slip Validation & Quality Grading
                </div>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  To filter out weak combinations, the system runs a real-time validation scan on every compiled betting slip, assigning an instant quality score and grade (**A+**, **B**, **C**, **D**).
                </p>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  This evaluation checks:
                </p>
                <ul className="list-disc pl-5 text-[11px] text-gray-400 font-mono space-y-1">
                  <li><strong>Odd/Even Ratios:</strong> Verifies the balance of odd and even numbers (e.g. 3:2, 2:3, or 4:1).</li>
                  <li><strong>High/Low Ratios:</strong> Verifies the balance of high numbers vs. low numbers (split at 17/18).</li>
                  <li><strong>Mathematical Spread:</strong> Ensures the difference between the highest and lowest numbers in the ticket falls within the optimal 15 to 33 range.</li>
                  <li><strong>Adjacent Runs:</strong> Restricts tickets containing low-probability runs of more than 1 consecutive pair.</li>
                </ul>
              </div>

              {/* Card 6: Quick Pick */}
              <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold font-mono text-[11px] uppercase">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  6. Quick Pick (QP5)
                </div>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  Draws a Quick Pick ticket (5 unique numbers from 1-35 + 1 Powerball from 1-10) using interactive ball draw simulation with sound and haptics.
                </p>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  The drawn main numbers are color-matched to the corresponding balls, while the Powerball is highlighted in solid white.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "scanner" && (
          <div className="tab-content-enter">
            <CheckerTab initialTool={utilitySubTool} onToolChange={setUtilitySubTool} />
          </div>
        )}

        {activeTab === "play-whe" && (
          <div className="tab-content-enter">
            <PlayWheTab
              activeSubTab={playWheSubTab}
              onSubTabChange={(tab) => {
                setPlayWheSubTab(tab);
              }}
            />
          </div>
        )}

        {activeTab === "win-for-life" && (
          <div className="tab-content-enter">
            <WinForLifeTab />
          </div>
        )}

        {activeTab === "cashpot" && (
          <div className="tab-content-enter">
            <CashPotTab />
          </div>
        )}

        {activeTab === "pick4" && (
          <div className="tab-content-enter">
            <Pick4Tab />
          </div>
        )}

        {activeTab === "fast-cash" && (
          <div className="tab-content-enter">
            <FastCashTab />
          </div>
        )}

        {activeTab === "syndicate" && (
          <div className="tab-content-enter">
            <SyndicateTab onSelectGame={setActiveTab} />
          </div>
        )}

        {activeTab === "engine-tracker" && (
          <div className="tab-content-enter">
            <EngineBenchmarkTracker />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="tab-content-enter">
            <SettingsTab />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 pb-28 md:pb-6 text-center text-[10px] text-gray-500 font-mono tracking-wider space-y-1.5 bg-slate-950/20">
        <div 
          className="text-white/90 font-bold" 
          style={{ textShadow: "0 0 8px rgba(56, 189, 248, 0.6), 0 0 16px rgba(56, 189, 248, 0.3)" }}
        >
          THE WIN CONCEPT | TRINIDAD AND TOBAGO ONLINE GAMING ANALYTICAL SYSTEM © {new Date().getFullYear()}
        </div>
        <div 
          className="text-gray-400 text-[9px] tracking-normal uppercase" 
          style={{ textShadow: "0 0 6px rgba(255, 255, 255, 0.25)" }}
        >
          This app is not affiliated with the National Lotteries Control Board (NLCB) and does not guarantee any winning combinations.
        </div>
      </footer>

      {/* Mobile Slide-Up Sheet for Games & More */}
      {mobileSheet && (
        <div className="md:hidden fixed inset-0 z-50 flex items-center justify-center p-4 pb-20">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileSheet(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-slate-950 border border-white/15 rounded-3xl p-5 space-y-4 shadow-2xl max-h-[78vh] overflow-y-auto">
            <div className="relative flex items-center justify-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-black font-mono uppercase tracking-wider text-white text-center">
                {mobileSheet === "games" ? "Choose NLCB Game" : "Tools & Settings"}
              </h3>
              <button
                onClick={() => setMobileSheet(null)}
                className="absolute right-0 p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {mobileSheet === "games" ? (
              <div className="grid grid-cols-1 gap-2.5">
                {NLCB_GAME_GUIDE.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => handleTabChange(g.key)}
                    className={`w-full flex items-center justify-between gap-3 p-3 rounded-2xl border transition cursor-pointer text-left ${
                      activeTab === g.key
                        ? "bg-sky-500/15 border-sky-400/50 text-white"
                        : "bg-slate-900/70 border-white/10 text-gray-200 hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={g.iconSrc} alt={g.name} className="w-10 h-10 rounded-xl object-contain shrink-0 border border-white/10" />
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white">{g.name}</div>
                        <div className="text-[11px] text-gray-400 truncate">{g.tagline}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                        {g.costPerPlay}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => handleTabChange("engine-tracker")}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 text-left cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <Cpu className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">Engine Benchmark Tracker</div>
                    <div className="text-[11px] text-gray-400">Compare historical hit rates across all models</div>
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange("settings")}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 text-left cursor-pointer"
                >
                  <img src="/images/settings_icon.png" alt="Settings" className="w-10 h-10 rounded-xl object-contain border border-white/10 shrink-0" />
                  <div>
                    <div className="text-sm font-black text-white">Settings &amp; Visitor Analytics</div>
                    <div className="text-[11px] text-gray-400">App preferences, draw sync &amp; usage stats</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Tab Bar (6 Thumb-Zone Tabs: Engines before Scan & Pools) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070b19]/95 backdrop-blur-xl border-t border-white/10 px-1.5 py-1.5 grid grid-cols-6 gap-1 shadow-[0_-5px_25px_rgba(0,0,0,0.6)]">
        <button
          onClick={() => handleTabChange("welcome")}
          className={`h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "welcome" && !mobileSheet
              ? "bg-sky-500/20 border-sky-400 text-sky-300 font-bold"
              : "text-gray-400 border-transparent hover:bg-white/5"
          }`}
        >
          <img src="/images/welcome_icon.png" alt="Home" className="w-5 h-5 object-contain rounded" />
          <span className="text-[8.5px] font-mono tracking-tight">HOME</span>
        </button>

        <button
          onClick={() => setMobileSheet(mobileSheet === "games" ? null : "games")}
          className={`h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer border ${
            isGameTab || mobileSheet === "games"
              ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold"
              : "text-gray-400 border-transparent hover:bg-white/5"
          }`}
        >
          <Gamepad2 className="w-5 h-5" />
          <span className="text-[8.5px] font-mono tracking-tight">GAMES</span>
        </button>

        <button
          onClick={() => handleTabChange("engine-tracker")}
          className={`h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "engine-tracker" && !mobileSheet
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
              : "text-gray-400 border-transparent hover:bg-white/5"
          }`}
        >
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span className="text-[8.5px] font-mono tracking-tight">ENGINES</span>
        </button>

        <button
          onClick={() => handleTabChange("scanner")}
          className={`h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "scanner" && !mobileSheet
              ? "bg-purple-500/20 border-purple-400 text-purple-300 font-bold"
              : "text-gray-400 border-transparent hover:bg-white/5"
          }`}
        >
          <img src="/images/scanner_icon.png" alt="Scan" className="w-5 h-5 object-contain rounded" />
          <span className="text-[8.5px] font-mono tracking-tight">SCAN</span>
        </button>

        <button
          onClick={() => handleTabChange("syndicate")}
          className={`h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "syndicate" && !mobileSheet
              ? "bg-violet-500/20 border-violet-400 text-violet-300 font-bold"
              : "text-gray-400 border-transparent hover:bg-white/5"
          }`}
        >
          <img src="/images/syndicate_icon.png" alt="Pools" className="w-5 h-5 object-contain rounded" />
          <span className="text-[8.5px] font-mono tracking-tight">POOLS</span>
        </button>

        <button
          onClick={() => handleTabChange("settings")}
          className={`h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "settings" && !mobileSheet
              ? "bg-slate-700/40 border-slate-400 text-slate-200 font-bold"
              : "text-gray-400 border-transparent hover:bg-white/5"
          }`}
        >
          <img src="/images/settings_icon.png" alt="Settings" className="w-5 h-5 object-contain rounded" />
          <span className="text-[8.5px] font-mono tracking-tight">SETTINGS</span>
        </button>
      </nav>

    </div>
  );
}
