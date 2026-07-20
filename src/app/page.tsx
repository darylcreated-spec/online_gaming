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
import { Activity, BarChart2, Calendar, ClipboardList, Camera, HelpCircle, ChevronDown, Layers, Compass, RefreshCw } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"welcome" | "lotto-plus" | "scanner" | "play-whe" | "win-for-life" | "settings">("welcome");
  const [lottoSubTab, setLottoSubTab] = useState<"dashboard" | "history" | "builder" | "explain">("dashboard");
  const [playWheSubTab, setPlayWheSubTab] = useState<"dashboard" | "history" | "translator" | "relationship" | "hits" | "explain" | "network">("dashboard");
  
  // Scraper Sync States
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
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
    fetchStats();
    fetchHistoryDraws(1);
    fetchAllDraws();

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("PWA Service Worker registered:", reg.scope))
        .catch((err) => console.error("PWA Service Worker registration failed:", err));
    }
  }, []);

  // Poll for updates every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchHistoryDraws(pagination.page);
    }, 60000);
    return () => clearInterval(interval);
  }, [timeframe, pagination.page, historySearch, historyNumberFilter]);

  // 4. Sync handler
  const handleSync = async (full: boolean = false) => {
    setSyncing(true);
    if (full) {
      setSyncMessage("Initializing Full Sync (Year by Year). Please keep this tab open...");
      try {
        const currentYear = new Date().getFullYear();
        const startYear = 2001;
        let totalAdded = 0;
        for (let y = currentYear; y >= startYear; y--) {
          setSyncMessage(`Syncing Lotto Plus Year ${y} (from 2001 to Present)... (${totalAdded} draws added so far)`);
          const res = await fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year: y })
          });
          const data = await res.json();
          if (data.success) {
            totalAdded += data.drawsAdded;
          } else {
            console.error(`Failed to sync year ${y}: ${data.error || data.details}`);
          }
          // Small polite pause to prevent server load spikes
          await new Promise(r => setTimeout(r, 600));
        }
        setSyncMessage(`Full sync successful! Seeded all years. Added ${totalAdded} draws.`);
        fetchStats();
        fetchHistoryDraws(1);
        fetchAllDraws();
      } catch (err: any) {
        setSyncMessage(`Full sync error: ${err.message || "Network error"}`);
      } finally {
        setSyncing(false);
        setTimeout(() => setSyncMessage(null), 8000);
      }
    } else {
      setSyncMessage("Syncing database with latest draws from NLCB... (this may take up to 30 seconds)");
      try {
        const res = await fetch("/api/sync", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full: false }) 
        });
        const data = await res.json();
        if (data.success) {
          setSyncMessage(`Sync successful! ${data.details}`);
          fetchStats();
          fetchHistoryDraws(1);
          fetchAllDraws();
        } else {
          setSyncMessage(`Sync failed: ${data.error || data.details}`);
        }
      } catch (err: any) {
        setSyncMessage(`Sync error: ${err.message || "Network error"}`);
      } finally {
        setSyncing(false);
        setTimeout(() => setSyncMessage(null), 8000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col selection:bg-primary/30 selection:text-white">
      
      {/* Global Terminal Header */}
      <header className="glass-panel border-b border-white/5 sticky top-0 z-50 py-4 px-6 md:px-12 flex justify-between items-center bg-slate-950/70 backdrop-blur-md w-full">
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

        {/* Global Navigation Tabs (Desktop Only) */}
        <nav className="hidden md:flex bg-slate-900/60 p-1 rounded-lg border border-white/5 gap-1">
          <button
            onClick={() => setActiveTab("welcome")}
            className={`flex items-center justify-center gap-2.5 px-4 py-2 rounded-md text-xs font-semibold font-mono tracking-wider transition-all whitespace-nowrap ${
              activeTab === "welcome"
                ? "bg-primary/10 border border-primary/20 text-primary font-bold"
                : "text-gray-400 hover:text-white border border-transparent hover:bg-white/5"
            }`}
          >
            <img 
              src="/images/welcome_icon.png" 
              alt="Welcome" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(56,189,248,0.4)]" 
            />
            HOME
          </button>

          <button
            onClick={() => setActiveTab("lotto-plus")}
            className={`flex items-center justify-center gap-2.5 px-4 py-2 rounded-md text-xs font-semibold font-mono tracking-wider transition-all whitespace-nowrap ${
              activeTab === "lotto-plus"
                ? "bg-primary/10 border border-primary/20 text-primary font-bold"
                : "text-gray-400 hover:text-white border border-transparent hover:bg-white/5"
            }`}
          >
            <img 
              src="/images/lotto_plus_icon.png" 
              alt="Lotto Plus" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(56,189,248,0.4)]" 
            />
            LOTTO PLUS
          </button>
          
          <button
            onClick={() => setActiveTab("play-whe")}
            className={`flex items-center justify-center gap-2.5 px-4 py-2 rounded-md text-xs font-semibold font-mono tracking-wider transition-all whitespace-nowrap ${
              activeTab === "play-whe"
                ? "bg-primary/10 border border-primary/20 text-primary font-bold"
                : "text-gray-400 hover:text-white border border-transparent hover:bg-white/5"
            }`}
          >
            <img 
              src="/images/play_whe_icon.png" 
              alt="Play Whe" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(56,189,248,0.4)]" 
            />
            PLAY WHE
          </button>
          
          <button
            onClick={() => setActiveTab("win-for-life")}
            className={`flex items-center justify-center gap-2.5 px-4 py-2 rounded-md text-xs font-semibold font-mono tracking-wider transition-all whitespace-nowrap ${
              activeTab === "win-for-life"
                ? "bg-primary/10 border border-primary/20 text-primary font-bold"
                : "text-gray-400 hover:text-white border border-transparent hover:bg-white/5"
            }`}
          >
            <img 
              src="/images/win_for_life_icon.png" 
              alt="Win for Life" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(56,189,248,0.4)]" 
            />
            WIN FOR LIFE
          </button>
          
          <button
            onClick={() => setActiveTab("scanner")}
            className={`flex items-center justify-center gap-2.5 px-4 py-2 rounded-md text-xs font-semibold font-mono tracking-wider transition-all whitespace-nowrap ${
              activeTab === "scanner"
                ? "bg-primary/10 border border-primary/20 text-primary font-bold"
                : "text-gray-400 hover:text-white border border-transparent hover:bg-white/5"
            }`}
          >
            <img 
              src="/images/scanner_icon.png" 
              alt="Scanner" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(74,222,128,0.4)]" 
            />
            TICKET SCANNER
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center justify-center gap-2.5 px-4 py-2 rounded-md text-xs font-semibold font-mono tracking-wider transition-all whitespace-nowrap ${
              activeTab === "settings"
                ? "bg-primary/10 border border-primary/20 text-primary font-bold"
                : "text-gray-400 hover:text-white border border-transparent hover:bg-white/5"
            }`}
          >
            <img 
              src="/images/settings_icon.png" 
              alt="Settings" 
              className="w-5 h-5 object-contain rounded shadow-[0_0_8px_rgba(56,189,248,0.4)]" 
            />
            SETTINGS
          </button>
        </nav>

        {/* Desktop nav bar occupies this space; mobile nav bar is pinned to the screen bottom */}
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-8 pb-24 md:pb-8">
        
        {/* Lotto Plus Sub-navigation menu */}
        {activeTab === "lotto-plus" && (
          <div className="flex bg-slate-950/40 p-1 rounded-lg border border-white/5 w-full md:w-fit mb-6 overflow-x-auto flex-nowrap scrollbar-none">
            <button
              onClick={() => setLottoSubTab("dashboard")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
                lottoSubTab === "dashboard"
                  ? "bg-primary text-slate-950 font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              DASHBOARD
            </button>
            <button
              onClick={() => setLottoSubTab("history")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
                lottoSubTab === "history"
                  ? "bg-primary text-slate-950 font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              DRAW LOG
            </button>
            <button
              onClick={() => setLottoSubTab("builder")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
                lottoSubTab === "builder"
                  ? "bg-primary text-slate-950 font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              ODDS REDUCTION
            </button>
            <button
              onClick={() => setLottoSubTab("explain")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
                lottoSubTab === "explain"
                  ? "bg-primary text-slate-950 font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              HOW IT WORKS
            </button>
          </div>
        )}

        {/* Render Active View Tab */}
        {activeTab === "welcome" && (
          <WelcomeTab />
        )}

        {activeTab === "lotto-plus" && lottoSubTab === "dashboard" && (
          <DashboardTab
            stats={stats}
            statsLoading={statsLoading}
            timeframe={timeframe}
            setTimeframe={setTimeframe}
          />
        )}
        
        {activeTab === "lotto-plus" && lottoSubTab === "history" && (
          <HistoryTab
            draws={draws}
            pagination={pagination}
            loading={historyLoading}
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
            onSearchChange={setHistorySearch}
            onNumberFilterChange={setHistoryNumberFilter}
          />
        )}
        
        {activeTab === "lotto-plus" && lottoSubTab === "builder" && (
          <BuilderTab
            historicalDraws={allDraws}
          />
        )}

        {activeTab === "lotto-plus" && lottoSubTab === "explain" && (
          <div className="space-y-6">
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

              {/* Card 6: QP5 Lucky Tumbler */}
              <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold font-mono text-[11px] uppercase">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  6. QP5 Lucky Tumbler
                </div>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  Draws a Quick Pick 5 ticket (5 unique numbers from 1-35 + 1 Powerball from 1-10) using a physics-based lottery tumbler animation.
                </p>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  The drawn main numbers are color-matched to the corresponding tumbler balls, while the Powerball is highlighted in solid white, mimicking standard physical drawing environments.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "scanner" && (
          <CheckerTab />
        )}

        {activeTab === "play-whe" && (
          <PlayWheTab
            activeSubTab={playWheSubTab}
            onSubTabChange={(tab) => {
              setPlayWheSubTab(tab);
            }}
          />
        )}

        {activeTab === "win-for-life" && (
          <WinForLifeTab />
        )}

        {activeTab === "settings" && (
          <SettingsTab />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-[10px] text-gray-500 font-mono tracking-wider space-y-1.5 bg-slate-950/20">
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

      {/* Mobile Sticky Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070b19]/90 backdrop-blur-lg border-t border-white/10 px-4 py-2 flex justify-around items-center shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setActiveTab("welcome")}
          className={`flex flex-col items-center gap-1 py-1 px-3.5 transition-all cursor-pointer ${
            activeTab === "welcome" ? "text-primary font-bold" : "text-gray-400"
          }`}
        >
          <img src="/images/welcome_icon.png" alt="Home" className="w-5 h-5 object-contain" />
          <span className="text-[9px] font-mono tracking-wider">HOME</span>
        </button>
        <button
          onClick={() => { setActiveTab("lotto-plus"); setLottoSubTab("dashboard"); }}
          className={`flex flex-col items-center gap-1 py-1 px-3.5 transition-all cursor-pointer ${
            activeTab === "lotto-plus" ? "text-primary font-bold" : "text-gray-400"
          }`}
        >
          <img src="/images/lotto_plus_icon.png" alt="Lotto" className="w-5 h-5 object-contain" />
          <span className="text-[9px] font-mono tracking-wider">LOTTO</span>
        </button>
        <button
          onClick={() => { setActiveTab("play-whe"); setPlayWheSubTab("dashboard"); }}
          className={`flex flex-col items-center gap-1 py-1 px-3.5 transition-all cursor-pointer ${
            activeTab === "play-whe" ? "text-primary font-bold" : "text-gray-400"
          }`}
        >
          <img src="/images/play_whe_icon.png" alt="Play Whe" className="w-5 h-5 object-contain" />
          <span className="text-[9px] font-mono tracking-wider">PLAY WHE</span>
        </button>
        <button
          onClick={() => setActiveTab("win-for-life")}
          className={`flex flex-col items-center gap-1 py-1 px-3.5 transition-all cursor-pointer ${
            activeTab === "win-for-life" ? "text-primary font-bold" : "text-gray-400"
          }`}
        >
          <img src="/images/win_for_life_icon.png" alt="Win for Life" className="w-5 h-5 object-contain" />
          <span className="text-[9px] font-mono tracking-wider">WFL</span>
        </button>
        <button
          onClick={() => setActiveTab("scanner")}
          className={`flex flex-col items-center gap-1 py-1 px-3.5 transition-all cursor-pointer ${
            activeTab === "scanner" ? "text-primary font-bold" : "text-gray-400"
          }`}
        >
          <img src="/images/scanner_icon.png" alt="Scanner" className="w-5 h-5 object-contain" />
          <span className="text-[9px] font-mono tracking-wider">SCANNER</span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center gap-1 py-1 px-3.5 transition-all cursor-pointer ${
            activeTab === "settings" ? "text-primary font-bold" : "text-gray-400"
          }`}
        >
          <img src="/images/settings_icon.png" alt="Settings" className="w-5 h-5 object-contain" />
          <span className="text-[9px] font-mono tracking-wider">SETTINGS</span>
        </button>
      </div>

    </div>
  );
}
