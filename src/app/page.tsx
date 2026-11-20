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

  // Lazy-load Lotto Plus stats only when Lotto Plus tab is active (saves full-archive scan on Home)
  useEffect(() => {
    if (activeTab === "lotto-plus") {
      fetchStats();
    }
  }, [activeTab, timeframe]);

  // Lazy-load Lotto Plus history table when Lotto Plus tab is active
  useEffect(() => {
    if (activeTab === "lotto-plus") {
      fetchHistoryDraws(pagination.page);
    }
  }, [activeTab, pagination.page, historySearch, historyNumberFilter]);

  // Register PWA Service Worker on mount & trigger immediate update check
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.update().catch(() => {});
        })
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

      {/* Pre-Landing Initial Loading & Splash Screen (non-blocking) */}
      <AppSplashScreen isLoading={false} />

      {/* Global Terminal Header */}
      <header className="glass-panel border-b border-white/5 sticky top-0 z-50 py-2.5 sm:py-3 px-3 sm:px-6 lg:px-10 flex justify-between items-center gap-3 bg-slate-950/85 backdrop-blur-md w-full font-sans">
        <div className="flex items-center gap-2.5 shrink-0">
          <WinConceptLogoEmblem 
            size="sm" 
            onClick={() => handleTabChange("welcome")}
            className="cursor-pointer"
          />
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              The Win Concept
            </div>
            <p className="text-xs tracking-wider text-sky-400 font-semibold uppercase whitespace-nowrap">
              NLCB Analytics
            </p>
          </div>
        </div>

        {/* Desktop Global Navigation (Clean 6-item bar, zero overflow at 1280px) */}
        <div className="hidden md:flex items-center gap-1.5 relative">
          <nav className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-white/10">
            {/* HOME */}
            <div className="relative group">
              <button
                onClick={() => handleTabChange("welcome")}
                className={`h-9 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "welcome"
                    ? "bg-sky-500/20 border border-sky-400 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                    : "text-slate-300 hover:text-sky-300 border border-transparent hover:bg-sky-500/10"
                }`}
              >
                <img src="/images/welcome_icon.png" alt="Home" className="w-4 h-4 object-contain rounded shrink-0" />
                <span>Home</span>
              </button>
              <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-2 w-60 p-3 rounded-xl bg-[#0b1120] border border-white/15 shadow-2xl z-50 text-xs font-sans text-slate-300 leading-relaxed">
                <div className="text-sm font-bold text-white mb-1">Home Overview</div>
                Compare exact odds, ticket budgets, and latest results across all 6 NLCB games.
              </div>
            </div>

            {/* GAMES DROPDOWN (Opens on Hover & Click on Desktop) */}
            <div
              className="relative"
              onMouseEnter={() => setDesktopGamesOpen(true)}
              onMouseLeave={() => setDesktopGamesOpen(false)}
            >
              <button
                onClick={() => setDesktopGamesOpen((v) => !v)}
                className={`h-9 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isGameTab
                    ? "bg-amber-500/20 border border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]"
                    : "text-slate-200 hover:text-white border border-transparent hover:bg-white/5"
                }`}
              >
                <Gamepad2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {isGameTab
                    ? NLCB_GAME_GUIDE.find((g) => g.key === activeTab)?.name || "Games"
                    : "Games (6)"}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${desktopGamesOpen ? "rotate-180" : ""}`} />
              </button>

              {desktopGamesOpen && (
                <div className="absolute left-0 top-full pt-2 w-88 z-50">
                  <div className="p-2.5 rounded-2xl bg-[#0d1424]/95 border border-white/15 shadow-2xl space-y-1 backdrop-blur-xl">
                    <div className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-white/5">
                      Choose an NLCB Game
                    </div>
                    {NLCB_GAME_GUIDE.map((g) => (
                      <button
                        key={g.key}
                        onClick={() => handleTabChange(g.key)}
                        className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl transition cursor-pointer text-left ${
                          activeTab === g.key
                            ? "bg-sky-500/15 border border-sky-400/40 text-white"
                            : "hover:bg-white/5 border border-transparent text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={g.iconSrc} alt={g.name} className="w-8 h-8 rounded-lg object-contain shrink-0 border border-white/10" />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">{g.name}</div>
                            <div className="text-xs text-slate-400 truncate">{g.tagline}</div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0">
                          {g.costPerPlay}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ENGINES */}
            <div className="relative group">
              <button
                onClick={() => handleTabChange("engine-tracker")}
                className={`h-9 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "engine-tracker"
                    ? "bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                    : "text-slate-300 hover:text-cyan-300 border border-transparent hover:bg-cyan-500/10"
                }`}
              >
                <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Engines</span>
              </button>
              <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-2 w-60 p-3 rounded-xl bg-[#0b1120] border border-white/15 shadow-2xl z-50 text-xs font-sans text-slate-300 leading-relaxed">
                <div className="text-sm font-bold text-cyan-300 mb-1">Number Covering Engines</div>
                View non-overlapping ticket sets, Cash Pot Sure Call timing, and verified past results.
              </div>
            </div>

            {/* SCANNER */}
            <div className="relative group">
              <button
                onClick={() => handleTabChange("scanner")}
                className={`h-9 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "scanner"
                    ? "bg-purple-500/20 border border-purple-400 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                    : "text-slate-300 hover:text-purple-300 border border-transparent hover:bg-purple-500/10"
                }`}
              >
                <img src="/images/scanner_icon.png" alt="Scanner" className="w-4 h-4 object-contain rounded shrink-0" />
                <span>Scanner</span>
              </button>
              <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-2 w-60 p-3 rounded-xl bg-[#0b1120] border border-white/15 shadow-2xl z-50 text-xs font-sans text-slate-300 leading-relaxed">
                <div className="text-sm font-bold text-purple-300 mb-1">Ticket Scanner and Search</div>
                Check printed NLCB tickets or ask questions across over 22,500 past draws.
              </div>
            </div>

            {/* POOLS */}
            <div className="relative group">
              <button
                onClick={() => handleTabChange("syndicate")}
                className={`h-9 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "syndicate"
                    ? "bg-violet-500/20 border border-violet-400 text-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.2)]"
                    : "text-slate-300 hover:text-violet-300 border border-transparent hover:bg-violet-500/10"
                }`}
              >
                <img src="/images/syndicate_icon.png" alt="Pools" className="w-4 h-4 object-contain rounded shrink-0" />
                <span>Pools</span>
              </button>
              <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute right-0 top-full mt-2 w-60 p-3 rounded-xl bg-[#0b1120] border border-white/15 shadow-2xl z-50 text-xs font-sans text-slate-300 leading-relaxed">
                <div className="text-sm font-bold text-violet-300 mb-1">Group Pools</div>
                Split 15-slip ($75) or 20-slip ($100) sets with friends and share via WhatsApp.
              </div>
            </div>

            {/* SETTINGS */}
            <div className="relative group">
              <button
                onClick={() => handleTabChange("settings")}
                className={`h-9 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-slate-700/40 border border-slate-400 text-slate-200 shadow-[0_0_12px_rgba(148,163,184,0.2)]"
                    : "text-slate-300 hover:text-slate-200 border border-transparent hover:bg-slate-700/20"
                }`}
              >
                <img src="/images/settings_icon.png" alt="Settings" className="w-4 h-4 object-contain rounded shrink-0" />
                <span>Settings</span>
              </button>
              <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute right-0 top-full mt-2 w-60 p-3 rounded-xl bg-[#0b1120] border border-white/15 shadow-2xl z-50 text-xs font-sans text-slate-300 leading-relaxed">
                <div className="text-sm font-bold text-slate-200 mb-1">Settings and Sync</div>
                Refresh latest draws, check system status, and view app activity.
              </div>
            </div>
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
              subtitle="Pick 5 numbers from 1 to 35 plus 1 Powerball from 1 to 10. Draws Wednesday and Saturday at 8:30 PM, $5.00 per play."
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
                              className="w-7 h-7 rounded-full bg-sky-500/20 border border-sky-400 text-sky-200 font-bold text-xs flex items-center justify-center font-mono"
                            >
                              {n}
                            </span>
                          ))}
                          <span
                            className="px-2.5 h-7 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-1 font-sans"
                            title="Powerball"
                          >
                            <span>Powerball</span>
                            <span className="font-mono">{(stats?.latestDraw || draws[0]).powerball}</span>
                          </span>
                        </div>
                      ),
                    }
                  : null
              }
            />

            <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full md:w-fit overflow-x-auto flex-nowrap sleek-scrollbar gap-1 font-sans">
              {[
                { id: "dashboard", label: "Overview and Stats", icon: BarChart2 },
                { id: "math-engine", label: "Math Engine", icon: Brain },
                { id: "diff-35", label: "Sum-35 Engine", icon: Binary },
                { id: "quant-100", label: "Full Archive Model", icon: ShieldCheck },
                { id: "forensic", label: "Deep Pattern Audit", icon: Cpu },
                { id: "audit", label: "Audit Report", icon: ShieldCheck },
                { id: "builder", label: "Ticket Builder", icon: ClipboardList },
                { id: "history", label: "Past Draws", icon: Calendar },
                { id: "explain", label: "How It Works", icon: HelpCircle },
              ].map((tabItem) => {
                const IconComp = tabItem.icon;
                const isActive = lottoSubTab === tabItem.id;
                return (
                  <button
                    key={tabItem.id}
                    onClick={() => setLottoSubTab(tabItem.id as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "bg-sky-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/70"
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
          <div className="tab-content-enter space-y-6 font-sans">
            {/* Explainer Header */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/40 space-y-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                How Lotto Plus Tools Work
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                The Lotto Plus dashboard organizes past official draws from Trinidad and Tobago so you can study number gaps, avoid overlapping tickets, and build balanced plays.
              </p>
            </div>

            {/* Explainer Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Number Gaps */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/30 space-y-2.5">
                <h3 className="flex items-center gap-2 text-base font-bold text-white">
                  <Activity className="w-4 h-4 text-sky-400 shrink-0" />
                  1. Number Gap Analysis
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Instead of looking only at individual numbers, this method checks the <strong className="text-white">spacing (difference)</strong> between consecutive numbers in a sorted draw.
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Because winning numbers are ordered from lowest to highest, most draws have balanced gaps rather than tight clusters. Reviewing these gaps helps avoid extreme or overcrowded tickets.
                </p>
              </div>

              {/* Card 2: Covering Wheels */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/30 space-y-2.5">
                <h3 className="flex items-center gap-2 text-base font-bold text-white">
                  <ClipboardList className="w-4 h-4 text-sky-400 shrink-0" />
                  2. Ticket Covering Wheels
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  A <strong className="text-white">Covering Wheel</strong> lets you pick a larger group of favorite numbers (for example 10 to 15 numbers) and arrange them cleanly across a fixed set of tickets.
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Instead of paying for hundreds of combinations, a covering wheel reduces overlap so that if the winning numbers fall inside your chosen pool, at least one ticket guarantees a prize match.
                </p>
              </div>

              {/* Card 3: Frequency Heatmap */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/30 space-y-2.5">
                <h3 className="flex items-center gap-2 text-base font-bold text-white">
                  <BarChart2 className="w-4 h-4 text-sky-400 shrink-0" />
                  3. Number Frequency Heatmap
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  The number grid highlights how often each number from 1 to 35 has appeared in past draws. Bright amber shows numbers drawn more often, while darker shading shows numbers drawn less often.
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Inside the <strong className="text-white">Ticket Builder</strong>, you can turn the <strong className="text-white">Heatmap Overlay</strong> on or off directly over the number buttons while picking your pool.
                </p>
              </div>

              {/* Card 4: Partner Numbers */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/30 space-y-2.5">
                <h3 className="flex items-center gap-2 text-base font-bold text-white">
                  <Compass className="w-4 h-4 text-sky-400 shrink-0" />
                  4. Partner Numbers
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  This view tracks <strong className="text-white">Partner Numbers</strong>, showing which pairs of numbers have appeared together most frequently in official past draws.
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  When you pick numbers in the builder, the app checks the history database to show which other numbers appeared alongside them most often.
                </p>
              </div>

              {/* Card 5: Ticket Balance Checks */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/30 space-y-2.5">
                <h3 className="flex items-center gap-2 text-base font-bold text-white">
                  <Layers className="w-4 h-4 text-sky-400 shrink-0" />
                  5. Ticket Balance Checks
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Every generated ticket is checked for overall balance and given a clear rating from A to D based on common draw patterns:
                </p>
                <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1.5 leading-relaxed">
                  <li><strong className="text-white">Odd and Even Mix:</strong> Checks for a healthy mix of odd and even numbers (such as 3 odd and 2 even).</li>
                  <li><strong className="text-white">Low and High Mix:</strong> Checks the balance between lower numbers (1 to 17) and higher numbers (18 to 35).</li>
                  <li><strong className="text-white">Number Spread:</strong> Checks that the span from lowest to highest number falls in the typical 15 to 33 range.</li>
                  <li><strong className="text-white">Consecutive Numbers:</strong> Flags tickets with long back-to-back runs.</li>
                </ul>
              </div>

              {/* Card 6: Quick Pick */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/30 space-y-2.5">
                <h3 className="flex items-center gap-2 text-base font-bold text-white">
                  <RefreshCw className="w-4 h-4 text-sky-400 shrink-0" />
                  6. Quick Pick Generator
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Creates a ready-to-play ticket with 5 unique numbers from 1 to 35 plus 1 Powerball from 1 to 10 in one tap.
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  You can copy any generated line or use the Budget Planner on the Home page to create 5 or 10 non-overlapping tickets with every Powerball covered.
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
      <footer className="border-t border-white/5 py-6 pb-28 md:pb-6 px-4 text-center text-xs text-slate-400 font-sans space-y-1.5 bg-slate-950/20">
        <div className="text-slate-200 font-semibold">
          The Win Concept | Trinidad and Tobago NLCB Analytics ({new Date().getFullYear()})
        </div>
        <div className="text-slate-400 text-xs max-w-2xl mx-auto leading-relaxed">
          This app is not affiliated with the National Lotteries Control Board (NLCB) and does not guarantee winning combinations.
        </div>
      </footer>

      {/* Mobile Slide-Up Sheet for Games and Tools */}
      {mobileSheet && (
        <div className="md:hidden fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 font-sans">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileSheet(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-slate-950 border border-white/15 rounded-3xl p-5 space-y-4 shadow-2xl max-h-[78vh] overflow-y-auto">
            <div className="relative flex items-center justify-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white text-center">
                {mobileSheet === "games" ? "Choose an NLCB Game" : "Tools and Settings"}
              </h3>
              <button
                onClick={() => setMobileSheet(null)}
                aria-label="Close menu"
                className="absolute right-0 p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white cursor-pointer"
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
                        : "bg-slate-900/70 border-white/10 text-slate-200 hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={g.iconSrc} alt={g.name} className="w-10 h-10 rounded-xl object-contain shrink-0 border border-white/10" />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white">{g.name}</div>
                        <div className="text-xs text-slate-400 truncate">{g.tagline}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
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
                    <div className="text-sm font-bold text-white">Number Covering Engines</div>
                    <div className="text-xs text-slate-400">Compare past results across all models</div>
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange("settings")}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 text-left cursor-pointer"
                >
                  <img src="/images/settings_icon.png" alt="Settings" className="w-10 h-10 rounded-xl object-contain border border-white/10 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-white">Settings and Activity</div>
                    <div className="text-xs text-slate-400">App preferences, draw sync, and usage</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Tab Bar (6 Thumb-Zone Tabs: Engines before Scan and Pools) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070b19]/95 backdrop-blur-xl border-t border-white/10 px-1.5 py-1.5 grid grid-cols-6 gap-1 shadow-[0_-5px_25px_rgba(0,0,0,0.6)] font-sans">
        <button
          onClick={() => handleTabChange("welcome")}
          className={`h-[54px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "welcome" && !mobileSheet
              ? "bg-sky-500/20 border-sky-400 text-sky-300 font-bold"
              : "text-slate-400 border-transparent hover:bg-white/5"
          }`}
        >
          <img src="/images/welcome_icon.png" alt="Home" className="w-5 h-5 object-contain rounded" />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        <button
          onClick={() => setMobileSheet(mobileSheet === "games" ? null : "games")}
          className={`h-[54px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer border ${
            isGameTab || mobileSheet === "games"
              ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold"
              : "text-slate-400 border-transparent hover:bg-white/5"
          }`}
        >
          <Gamepad2 className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Games</span>
        </button>

        <button
          onClick={() => handleTabChange("engine-tracker")}
          className={`h-[54px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "engine-tracker" && !mobileSheet
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
              : "text-slate-400 border-transparent hover:bg-white/5"
          }`}
        >
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span className="text-[10px] font-semibold">Engines</span>
        </button>

        <button
          onClick={() => handleTabChange("scanner")}
          className={`h-[54px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "scanner" && !mobileSheet
              ? "bg-purple-500/20 border-purple-400 text-purple-300 font-bold"
              : "text-slate-400 border-transparent hover:bg-white/5"
          }`}
        >
          <img src="/images/scanner_icon.png" alt="Scan" className="w-5 h-5 object-contain rounded" />
          <span className="text-[10px] font-semibold">Scan</span>
        </button>

        <button
          onClick={() => handleTabChange("syndicate")}
          className={`h-[54px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "syndicate" && !mobileSheet
              ? "bg-violet-500/20 border-violet-400 text-violet-300 font-bold"
              : "text-slate-400 border-transparent hover:bg-white/5"
          }`}
        >
          <img src="/images/syndicate_icon.png" alt="Pools" className="w-5 h-5 object-contain rounded" />
          <span className="text-[10px] font-semibold">Pools</span>
        </button>

        <button
          onClick={() => handleTabChange("settings")}
          className={`h-[54px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "settings" && !mobileSheet
              ? "bg-slate-700/40 border-slate-400 text-slate-200 font-bold"
              : "text-slate-400 border-transparent hover:bg-white/5"
          }`}
        >
          <img src="/images/settings_icon.png" alt="Settings" className="w-5 h-5 object-contain rounded" />
          <span className="text-[10px] font-semibold">Settings</span>
        </button>
      </nav>

    </div>
  );
}
