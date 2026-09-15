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
import LiveDrawTicker from "@/components/LiveDrawTicker";
import AppSplashScreen from "@/components/AppSplashScreen";
import MultiBallMathPanel from "@/components/MultiBallMathPanel";
import GameHeaderBanner from "@/components/GameHeaderBanner";
import { Activity, BarChart2, Calendar, ClipboardList, Camera, HelpCircle, ChevronDown, Layers, Compass, RefreshCw, Users, Brain } from "lucide-react";

const TumblerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Axis/Stand */}
    <path d="M6 21h12" />
    <path d="M12 18v3" />
    <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    <path d="M5.5 16h13" />
    
    {/* Tumbler Drum */}
    <circle cx="12" cy="11" r="7" />
    <circle cx="12" cy="11" r="5" strokeDasharray="2 2" />
    
    {/* Balls inside */}
    <circle cx="10" cy="10" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="14" cy="9" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="11" cy="13" r="1.2" fill="currentColor" stroke="none" />
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
  const [activeTab, setActiveTab] = useState<"welcome" | "lotto-plus" | "scanner" | "play-whe" | "win-for-life" | "cashpot" | "pick4" | "syndicate" | "settings">("welcome");
  const [lottoSubTab, setLottoSubTab] = useState<"dashboard" | "math-engine" | "history" | "builder" | "explain">("dashboard");
  const [playWheSubTab, setPlayWheSubTab] = useState<"dashboard" | "transition" | "math-engine" | "history" | "translator" | "relationship" | "hits" | "explain" | "network">("dashboard");
  
  
  
  // Dashboard Stats States
  const [timeframe, setTimeframe] = useState("alltime");
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // History Draws States
  const [draws, setDraws] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, pages: 1 });
  const [historySearch, setHistorySearch] = useState("");
  const [historyNumberFilter, setHistoryNumberFilter] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  
  // Prediction Builder Cached Draws (for live delta calculations)
  const [allDraws, setAllDraws] = useState<any[]>([]);

  // 1. Fetch dashboard statistics
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/stats?timeframe=${timeframe}`);
      const data = await res.json();
      if (data.success) {
        setStats(data);
        if (typeof window !== "undefined") {
          localStorage.setItem(`win_concept_stats_${timeframe}`, JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(`win_concept_stats_${timeframe}`);
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

  // 2. Fetch history draws
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
        if (typeof window !== "undefined") {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error("Error fetching history draws:", err);
      if (typeof window !== "undefined") {
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

  // 3. Fetch all draws for client-side delta analysis
  const fetchAllDraws = async () => {
    const cacheKey = "win_concept_all_draws";
    try {
      const res = await fetch(`/api/draws?limit=5000`);
      const data = await res.json();
      if (data.success) {
        setAllDraws(data.draws);
        if (typeof window !== "undefined") {
          localStorage.setItem(cacheKey, JSON.stringify(data.draws));
        }
      }
    } catch (err) {
      console.error("Error fetching all draws:", err);
      if (typeof window !== "undefined") {
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

  // Trigger stats reload on timeframe change
  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  // Trigger history reload on search or filter change
  useEffect(() => {
    fetchHistoryDraws(pagination.page);
  }, [pagination.page, historySearch, historyNumberFilter]);

  // Load initial data on mount & register PWA Service Worker
  useEffect(() => {
    fetchHistoryDraws(1);

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("PWA Service Worker registered:", reg.scope))
        .catch((err) => console.error("PWA Service Worker registration failed:", err));
    }
  }, []);

  // Lazy-load all draws only when Builder tab is active (avoids 500KB+ fetch on every page load)
  useEffect(() => {
    if (activeTab === "lotto-plus" && lottoSubTab === "builder" && allDraws.length === 0) {
      fetchAllDraws();
    }
  }, [activeTab, lottoSubTab]);

  // Smart Auto-Sync: Immediate on-launch check + Visibility change + Draw time scheduler
  useEffect(() => {
    let isMounted = true;
    let refreshInterval: NodeJS.Timeout;

    const triggerBackgroundAutoSync = async (force: boolean = false) => {
      if (typeof window === "undefined") return;
      const lastSyncStr = localStorage.getItem("win_concept_last_sync_timestamp");
      const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
      const now = Date.now();
      const fortySeconds = 40 * 1000;

      // Only skip if synced less than 40 seconds ago and not forced
      if (!force && now - lastSync < fortySeconds) {
        return;
      }

      console.log("[AutoSync] Triggering background auto-sync from NLCB...");
      try {
        const res = await fetch("/api/cron/sync-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();
        
        if (isMounted) {
          localStorage.setItem("win_concept_last_sync_timestamp", Date.now().toString());
          console.log("[AutoSync] Background sync result:", data);
          
          fetchStats();
          fetchHistoryDraws(pagination.page);
          window.dispatchEvent(new CustomEvent("win_concept_sync_completed", { detail: data }));
        }
      } catch (err) {
        console.warn("[AutoSync] Background sync network error (will retry):", err);
      }
    };

    // 1. Run immediately on app load (always forces fresh scrape check)
    triggerBackgroundAutoSync(true);

    // 2. Run whenever user switches back to this browser tab (force check)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerBackgroundAutoSync(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. Periodic interval every 60 seconds
    refreshInterval = setInterval(() => {
      triggerBackgroundAutoSync(false);
    }, 60 * 1000);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [pagination.page]);



  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col selection:bg-primary/30 selection:text-white">
      
      {/* Pre-Landing Initial Loading & Splash Screen */}
      <AppSplashScreen isLoading={statsLoading} />

      {/* Global Terminal Header */}
      <header className="glass-panel border-b border-white/5 sticky top-0 z-50 py-3 sm:py-4 px-3 sm:px-6 md:px-12 flex justify-between items-center bg-slate-950/70 backdrop-blur-md w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 border border-primary/20 text-primary rounded-lg shadow-[0_0_15px_rgba(56,189,248,0.25)]">
            <TumblerIcon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-widest text-white uppercase font-mono">
              The Win Concept
            </h1>
            <p className="text-[10px] tracking-wider text-primary font-mono font-semibold uppercase">
              Your Online Gaming Resource
            </p>
          </div>
        </div>

        {/* Desktop Global Navigation Ribbon (Hidden on mobile, bottom bar used on mobile) */}
        <div className="hidden md:flex items-center min-w-0 max-w-[calc(100vw-360px)]">
          <nav className="flex items-center gap-2 p-1.5 bg-slate-900/80 rounded-xl border border-white/10 overflow-x-auto scrollbar-none sleek-scrollbar scroll-smooth w-full">
          {/* HOME */}
          <button
            onClick={() => setActiveTab("welcome")}
            className={`min-w-[115px] h-10 shrink-0 px-3 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "welcome"
                ? "bg-sky-500/20 border border-sky-400 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.25)]"
                : "text-gray-400 hover:text-sky-300 border border-transparent hover:border-sky-500/30 hover:bg-sky-500/10"
            }`}
          >
            <img 
              src="/images/welcome_icon.png" 
              alt="Welcome" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(56,189,248,0.4)] shrink-0" 
            />
            <span>HOME</span>
          </button>

          {/* LOTTO PLUS */}
          <button
            onClick={() => setActiveTab("lotto-plus")}
            className={`min-w-[125px] h-10 shrink-0 px-3 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "lotto-plus"
                ? "bg-sky-500/20 border border-sky-400 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.25)]"
                : "text-gray-400 hover:text-sky-300 border border-transparent hover:border-sky-500/30 hover:bg-sky-500/10"
            }`}
          >
            <img 
              src="/images/lotto_plus_icon.png" 
              alt="Lotto Plus" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(56,189,248,0.4)] shrink-0" 
            />
            <span>LOTTO PLUS</span>
          </button>
          
          {/* PLAY WHE */}
          <button
            onClick={() => setActiveTab("play-whe")}
            className={`min-w-[120px] h-10 shrink-0 px-3 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "play-whe"
                ? "bg-amber-500/20 border border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.25)]"
                : "text-gray-400 hover:text-amber-300 border border-transparent hover:border-amber-500/30 hover:bg-amber-500/10"
            }`}
          >
            <img 
              src="/images/play_whe_icon.png" 
              alt="Play Whe" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(251,191,36,0.4)] shrink-0" 
            />
            <span>PLAY WHE</span>
          </button>
          
          {/* WIN FOR LIFE */}
          <button
            onClick={() => setActiveTab("win-for-life")}
            className={`min-w-[130px] h-10 shrink-0 px-3 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "win-for-life"
                ? "bg-emerald-500/20 border border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.25)]"
                : "text-gray-400 hover:text-emerald-300 border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/10"
            }`}
          >
            <img 
              src="/images/win_for_life_icon.png" 
              alt="Win for Life" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(52,211,153,0.4)] shrink-0" 
            />
            <span>WIN FOR LIFE</span>
          </button>

          {/* CASHPOT */}
          <button
            onClick={() => setActiveTab("cashpot")}
            className={`min-w-[120px] h-10 shrink-0 px-3 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "cashpot"
                ? "bg-yellow-500/20 border border-yellow-400 text-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.25)]"
                : "text-gray-400 hover:text-yellow-300 border border-transparent hover:border-yellow-500/30 hover:bg-yellow-500/10"
            }`}
          >
            <img 
              src="/images/cash_pot_icon.png" 
              alt="Cashpot" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(250,204,21,0.4)] shrink-0" 
            />
            <span>CASHPOT</span>
          </button>

          {/* PICK 4 */}
          <button
            onClick={() => setActiveTab("pick4")}
            className={`min-w-[115px] h-10 shrink-0 px-3 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "pick4"
                ? "bg-purple-500/20 border border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                : "text-gray-400 hover:text-purple-300 border border-transparent hover:border-purple-500/30 hover:bg-purple-500/10"
            }`}
          >
            <img 
              src="/images/pick_four_icon.png" 
              alt="Pick 4" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(168,85,247,0.4)] shrink-0" 
            />
            <span>PICK 4</span>
          </button>

          {/* SYNDICATES */}
          <button
            onClick={() => setActiveTab("syndicate")}
            className={`min-w-[125px] h-10 shrink-0 px-3 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "syndicate"
                ? "bg-violet-500/20 border border-violet-400 text-violet-300 shadow-[0_0_15px_rgba(167,139,250,0.25)]"
                : "text-gray-400 hover:text-violet-300 border border-transparent hover:border-violet-500/30 hover:bg-violet-500/10"
            }`}
          >
            <img 
              src="/images/syndicate_icon.png" 
              alt="Syndicates" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(167,139,250,0.4)] shrink-0" 
            />
            <span>SYNDICATES</span>
          </button>
          
          {/* TICKET SCANNER */}
          <button
            onClick={() => setActiveTab("scanner")}
            className={`min-w-[140px] h-10 shrink-0 px-3 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "scanner"
                ? "bg-emerald-500/20 border border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.25)]"
                : "text-gray-400 hover:text-emerald-300 border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/10"
            }`}
          >
            <img 
              src="/images/scanner_icon.png" 
              alt="Scanner" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(52,211,153,0.4)] shrink-0" 
            />
            <span>SCANNER</span>
          </button>

          {/* SETTINGS */}
          <button
            onClick={() => setActiveTab("settings")}
            className={`min-w-[115px] h-10 shrink-0 px-3 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "settings"
                ? "bg-slate-700/40 border border-slate-400 text-slate-200 shadow-[0_0_15px_rgba(148,163,184,0.25)]"
                : "text-gray-400 hover:text-slate-200 border border-transparent hover:border-slate-500/30 hover:bg-slate-700/20"
            }`}
          >
            <img 
              src="/images/settings_icon.png" 
              alt="Settings" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(148,163,184,0.4)] shrink-0" 
            />
            <span>SETTINGS</span>
          </button>
        </nav>
        </div>

        {/* Desktop nav bar occupies this space; mobile nav bar is pinned to the screen bottom */}
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
              subtitle="5 of 35 Main Numbers + 1 of 10 Powerball • Wednesday & Saturday 8:30 PM • Estimated Jackpot"
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

            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-sky-500/20 w-full md:w-fit overflow-x-auto flex-nowrap sleek-scrollbar gap-1">
              <button
                onClick={() => setLottoSubTab("dashboard")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  lottoSubTab === "dashboard"
                    ? "bg-sky-500 text-slate-950 font-black shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                    : "text-gray-400 hover:text-sky-300 hover:bg-sky-500/10"
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                DASHBOARD & STATS
              </button>
              <button
                onClick={() => setLottoSubTab("math-engine")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  lottoSubTab === "math-engine"
                    ? "bg-sky-500 text-slate-950 font-black shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                    : "text-sky-400/90 hover:text-sky-300 hover:bg-sky-500/10"
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                MATHEMATICAL ENGINE
              </button>
              <button
                onClick={() => setLottoSubTab("builder")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  lottoSubTab === "builder"
                    ? "bg-sky-500 text-slate-950 font-black shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                    : "text-gray-400 hover:text-sky-300 hover:bg-sky-500/10"
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                ODDS REDUCTION & WHEELING
              </button>
              <button
                onClick={() => setLottoSubTab("history")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  lottoSubTab === "history"
                    ? "bg-sky-500 text-slate-950 font-black shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                    : "text-gray-400 hover:text-sky-300 hover:bg-sky-500/10"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                DRAW LOG ARCHIVE
              </button>
              <button
                onClick={() => setLottoSubTab("explain")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  lottoSubTab === "explain"
                    ? "bg-sky-500 text-slate-950 font-black shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                    : "text-gray-400 hover:text-sky-300 hover:bg-sky-500/10"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                HOW IT WORKS
              </button>
            </div>
          </div>
        )}

        {/* Render Active View Tab */}
        {activeTab === "welcome" && (
          <div className="tab-content-enter">
            <WelcomeTab onSelectGame={setActiveTab} />
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
            <CheckerTab />
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

        {activeTab === "syndicate" && (
          <div className="tab-content-enter">
            <SyndicateTab onSelectGame={setActiveTab} />
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

      {/* Mobile Sticky Bottom Tab Bar (Horizontally Scrollable & Uniform) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070b19]/95 backdrop-blur-xl border-t border-white/10 px-3 py-2 flex items-center gap-2 overflow-x-auto scroll-smooth sleek-scrollbar shadow-[0_-5px_25px_rgba(0,0,0,0.6)]">
        {/* HOME */}
        <button
          onClick={() => setActiveTab("welcome")}
          className={`min-w-[68px] h-[52px] shrink-0 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "welcome"
              ? "bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.25)] font-bold"
              : "text-gray-400 hover:text-sky-300 border-transparent hover:border-white/10 hover:bg-white/5"
          }`}
        >
          <img 
            src="/images/welcome_icon.png" 
            alt="Home" 
            className="w-6 h-6 object-contain rounded-md shrink-0 drop-shadow-[0_0_6px_rgba(56,189,248,0.3)]" 
          />
          <span className="text-[9px] font-mono tracking-wider whitespace-nowrap">HOME</span>
        </button>

        {/* LOTTO PLUS */}
        <button
          onClick={() => { setActiveTab("lotto-plus"); setLottoSubTab("dashboard"); }}
          className={`min-w-[68px] h-[52px] shrink-0 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "lotto-plus"
              ? "bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.25)] font-bold"
              : "text-gray-400 hover:text-sky-300 border-transparent hover:border-white/10 hover:bg-white/5"
          }`}
        >
          <img 
            src="/images/lotto_plus_icon.png" 
            alt="Lotto" 
            className="w-6 h-6 object-contain rounded-md shrink-0 drop-shadow-[0_0_6px_rgba(56,189,248,0.3)]" 
          />
          <span className="text-[9px] font-mono tracking-wider whitespace-nowrap">LOTTO</span>
        </button>

        {/* PLAY WHE */}
        <button
          onClick={() => { setActiveTab("play-whe"); setPlayWheSubTab("dashboard"); }}
          className={`min-w-[68px] h-[52px] shrink-0 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "play-whe"
              ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)] font-bold"
              : "text-gray-400 hover:text-amber-300 border-transparent hover:border-white/10 hover:bg-white/5"
          }`}
        >
          <img 
            src="/images/play_whe_icon.png" 
            alt="Play Whe" 
            className="w-6 h-6 object-contain rounded-md shrink-0 drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]" 
          />
          <span className="text-[9px] font-mono tracking-wider whitespace-nowrap">PLAY WHE</span>
        </button>

        {/* WIN FOR LIFE */}
        <button
          onClick={() => setActiveTab("win-for-life")}
          className={`min-w-[68px] h-[52px] shrink-0 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "win-for-life"
              ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.25)] font-bold"
              : "text-gray-400 hover:text-emerald-300 border-transparent hover:border-white/10 hover:bg-white/5"
          }`}
        >
          <img 
            src="/images/win_for_life_icon.png" 
            alt="Win for Life" 
            className="w-6 h-6 object-contain rounded-md shrink-0 drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]" 
          />
          <span className="text-[9px] font-mono tracking-wider whitespace-nowrap">WFL</span>
        </button>

        {/* CASHPOT */}
        <button
          onClick={() => setActiveTab("cashpot")}
          className={`min-w-[68px] h-[52px] shrink-0 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "cashpot"
              ? "bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.25)] font-bold"
              : "text-gray-400 hover:text-yellow-300 border-transparent hover:border-white/10 hover:bg-white/5"
          }`}
        >
          <img 
            src="/images/cash_pot_icon.png" 
            alt="Cashpot" 
            className="w-6 h-6 object-contain rounded-md shrink-0 drop-shadow-[0_0_6px_rgba(234,179,8,0.3)]" 
          />
          <span className="text-[9px] font-mono tracking-wider whitespace-nowrap">CASHPOT</span>
        </button>

        {/* PICK 4 */}
        <button
          onClick={() => setActiveTab("pick4")}
          className={`min-w-[68px] h-[52px] shrink-0 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "pick4"
              ? "bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.25)] font-bold"
              : "text-gray-400 hover:text-purple-300 border-transparent hover:border-white/10 hover:bg-white/5"
          }`}
        >
          <img 
            src="/images/pick_four_icon.png" 
            alt="Pick 4" 
            className="w-6 h-6 object-contain rounded-md shrink-0 drop-shadow-[0_0_6px_rgba(168,85,247,0.3)]" 
          />
          <span className="text-[9px] font-mono tracking-wider whitespace-nowrap">PICK 4</span>
        </button>

        {/* SYNDICATES / POOLS */}
        <button
          onClick={() => setActiveTab("syndicate")}
          className={`min-w-[68px] h-[52px] shrink-0 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "syndicate"
              ? "bg-violet-500/20 border-violet-400 text-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.25)] font-bold"
              : "text-gray-400 hover:text-violet-300 border-transparent hover:border-white/10 hover:bg-white/5"
          }`}
        >
          <img 
            src="/images/syndicate_icon.png" 
            alt="Pools" 
            className="w-6 h-6 object-contain rounded-md shrink-0 drop-shadow-[0_0_6px_rgba(167,139,250,0.3)]" 
          />
          <span className="text-[9px] font-mono tracking-wider whitespace-nowrap">POOLS</span>
        </button>

        {/* SCANNER */}
        <button
          onClick={() => setActiveTab("scanner")}
          className={`min-w-[68px] h-[52px] shrink-0 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "scanner"
              ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.25)] font-bold"
              : "text-gray-400 hover:text-emerald-300 border-transparent hover:border-white/10 hover:bg-white/5"
          }`}
        >
          <img 
            src="/images/scanner_icon.png" 
            alt="Scanner" 
            className="w-6 h-6 object-contain rounded-md shrink-0 drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]" 
          />
          <span className="text-[9px] font-mono tracking-wider whitespace-nowrap">SCAN</span>
        </button>

        {/* SETTINGS */}
        <button
          onClick={() => setActiveTab("settings")}
          className={`min-w-[68px] h-[52px] shrink-0 flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition-all cursor-pointer border ${
            activeTab === "settings"
              ? "bg-slate-700/40 border-slate-400 text-slate-200 shadow-[0_0_12px_rgba(148,163,184,0.25)] font-bold"
              : "text-gray-400 hover:text-slate-200 border-transparent hover:border-white/10 hover:bg-white/5"
          }`}
        >
          <img 
            src="/images/settings_icon.png" 
            alt="Settings" 
            className="w-6 h-6 object-contain rounded-md shrink-0 drop-shadow-[0_0_6px_rgba(148,163,184,0.3)]" 
          />
          <span className="text-[9px] font-mono tracking-wider whitespace-nowrap">SETTINGS</span>
        </button>
      </div>

    </div>
  );
}
