"use client";

import React, { useState, useEffect } from "react";
import DashboardTab from "@/components/DashboardTab";
import HistoryTab from "@/components/HistoryTab";
import BuilderTab from "@/components/BuilderTab";
import CheckerTab from "@/components/CheckerTab";
import PlayWheTab from "@/components/PlayWheTab";
import SettingsTab from "@/components/SettingsTab";
import WelcomeTab from "@/components/WelcomeTab";
import { Activity, BarChart2, Calendar, ClipboardList, Camera, Sparkles, HelpCircle, Menu, X, ChevronDown, Layers } from "lucide-react";

const SlotMachine = (props: React.SVGProps<SVGSVGElement>) => (
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
    {/* Slot Machine Main Cabinet */}
    <rect x="4" y="3" width="14" height="18" rx="2" />
    
    {/* Lever Handle */}
    <path d="M18 12h2.5a1.5 1.5 0 0 0 1.5-1.5V6" />
    <circle cx="22" cy="4" r="1.5" fill="currentColor" />
    
    {/* Reel Display Window */}
    <rect x="7" y="6" width="8" height="5" rx="0.5" />
    <line x1="10" y1="6" x2="10" y2="11" />
    <line x1="12" y1="6" x2="12" y2="11" />
    
    {/* Coin Payout Tray */}
    <rect x="7" y="14" width="8" height="3" rx="0.5" />
    <path d="M11 14v3" />
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
  const [activeTab, setActiveTab] = useState<"welcome" | "lotto-plus" | "scanner" | "play-whe" | "settings">("welcome");
  const [lottoSubTab, setLottoSubTab] = useState<"dashboard" | "history" | "builder" | "explain">("dashboard");
  const [playWheSubTab, setPlayWheSubTab] = useState<"dashboard" | "history" | "translator" | "relationship">("dashboard");
  const [playWheExplain, setPlayWheExplain] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
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
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // 2. Fetch history draws
  const fetchHistoryDraws = async (page: number = 1) => {
    setHistoryLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        search: historySearch,
        number: historyNumberFilter
      });
      const res = await fetch(`/api/draws?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDraws(data.draws);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Error fetching history draws:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 3. Fetch all draws for client-side delta analysis
  const fetchAllDraws = async () => {
    try {
      const res = await fetch(`/api/draws?limit=5000`);
      const data = await res.json();
      if (data.success) {
        setAllDraws(data.draws);
      }
    } catch (err) {
      console.error("Error fetching all draws:", err);
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
            <SlotMachine className="w-6 h-6 animate-pulse" />
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

        {/* Mobile Hamburger Trigger (Mobile Only) */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="md:hidden p-2 rounded-lg bg-slate-900 border border-white/5 text-gray-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-8">
        
        {/* Lotto Plus Sub-navigation menu */}
        {activeTab === "lotto-plus" && (
          <div className="flex bg-slate-950/40 p-1 rounded-lg border border-white/5 w-fit mb-6 overflow-x-auto">
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

              {/* Card 3: Hot/Cold Frequencies */}
              <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold font-mono text-[11px] uppercase">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  3. Monochromatic Heatmap
                </div>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  The frequency grid is shaded dynamically using monochromatic opacity levels. Numbers that are drawn more frequently in your selected timeframe (e.g. last 100 draws) light up with high opacity.
                </p>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                  Hovering over a compiled physical ticket slip automatically highlights those ticket numbers on the heatmap, allowing you to visually verify the hot/cold distribution of your active tickets at a single glance.
                </p>
              </div>

              {/* Card 4: Companion Mappings */}
              <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold font-mono text-[11px] uppercase">
                  <Sparkles className="w-4 h-4 text-primary" />
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
              <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-3 md:col-span-2">
                <div className="flex items-center gap-2 text-primary font-bold font-mono text-[11px] uppercase">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
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
              if (tab !== "dashboard") setPlayWheExplain(false);
            }}
            showExplainer={playWheExplain}
            onShowExplainerChange={setPlayWheExplain}
          />
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

      {/* Mobile Drawer (Side Draw) Menu */}
      {drawerOpen && (
        <>
          {/* Custom CSS Animation Keyframes for Drawer */}
          <style>{`
            @keyframes drawerSlideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            .animate-drawer-slide-in {
              animation: drawerSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>

          {/* Backdrop Overlay */}
          <div 
            onClick={() => setDrawerOpen(false)} 
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm transition-opacity duration-300 md:hidden"
          />
          
          {/* Drawer Sidebar Panel */}
          <div 
            className="fixed top-0 right-0 h-full w-64 bg-slate-950 border-l border-white/10 z-[101] p-6 flex flex-col gap-6 md:hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-drawer-slide-in"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <span className="font-mono font-bold text-xs uppercase tracking-wider text-gray-400">NAVIGATION</span>
              <button 
                onClick={() => setDrawerOpen(false)} 
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

                      {/* Nav Stack */}
            <nav className="flex flex-col gap-4 overflow-y-auto pr-1">
              {/* Home */}
              <button
                onClick={() => { setActiveTab("welcome"); setDrawerOpen(false); }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[10px] font-bold font-mono tracking-wider transition-all cursor-pointer ${
                  activeTab === "welcome"
                    ? "bg-primary/10 border border-primary/25 text-primary font-bold shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <img src="/images/welcome_icon.png" alt="Home" className="w-4 h-4 object-contain" />
                HOME
              </button>
              
              {/* Lotto Plus Section */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-4 py-1 text-[9px] font-mono tracking-widest text-gray-500 font-bold uppercase">
                  <img src="/images/lotto_plus_icon.png" alt="Lotto Plus" className="w-3.5 h-3.5 object-contain" />
                  LOTTO PLUS
                </div>
                <div className="pl-4 border-l border-white/5 ml-6 space-y-1">
                  <button
                    onClick={() => { setActiveTab("lotto-plus"); setLottoSubTab("dashboard"); setDrawerOpen(false); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                      activeTab === "lotto-plus" && lottoSubTab === "dashboard"
                        ? "text-primary font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <BarChart2 className="w-3 h-3" />
                    DASHBOARD
                  </button>
                  <button
                    onClick={() => { setActiveTab("lotto-plus"); setLottoSubTab("history"); setDrawerOpen(false); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                      activeTab === "lotto-plus" && lottoSubTab === "history"
                        ? "text-primary font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    DRAW LOG
                  </button>
                  <button
                    onClick={() => { setActiveTab("lotto-plus"); setLottoSubTab("builder"); setDrawerOpen(false); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                      activeTab === "lotto-plus" && lottoSubTab === "builder"
                        ? "text-primary font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <ClipboardList className="w-3 h-3" />
                    ODDS REDUCTION
                  </button>
                  <button
                    onClick={() => { setActiveTab("lotto-plus"); setLottoSubTab("explain"); setDrawerOpen(false); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                      activeTab === "lotto-plus" && lottoSubTab === "explain"
                        ? "text-primary font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <HelpCircle className="w-3 h-3" />
                    HOW IT WORKS
                  </button>
                </div>
              </div>

              {/* Play Whe Section */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-4 py-1 text-[9px] font-mono tracking-widest text-gray-500 font-bold uppercase">
                  <img src="/images/play_whe_icon.png" alt="Play Whe" className="w-3.5 h-3.5 object-contain" />
                  PLAY WHE
                </div>
                <div className="pl-4 border-l border-white/5 ml-6 space-y-1">
                  <button
                    onClick={() => { setActiveTab("play-whe"); setPlayWheSubTab("dashboard"); setPlayWheExplain(false); setDrawerOpen(false); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                      activeTab === "play-whe" && playWheSubTab === "dashboard" && !playWheExplain
                        ? "text-primary font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <BarChart2 className="w-3 h-3" />
                    DASHBOARD
                  </button>
                  <button
                    onClick={() => { setActiveTab("play-whe"); setPlayWheSubTab("history"); setPlayWheExplain(false); setDrawerOpen(false); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                      activeTab === "play-whe" && playWheSubTab === "history"
                        ? "text-primary font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    DRAW LOG
                  </button>
                  <button
                    onClick={() => { setActiveTab("play-whe"); setPlayWheSubTab("translator"); setPlayWheExplain(false); setDrawerOpen(false); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                      activeTab === "play-whe" && playWheSubTab === "translator"
                        ? "text-primary font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    CHINAPOO DICTIONARY
                  </button>
                  <button
                    onClick={() => { setActiveTab("play-whe"); setPlayWheSubTab("relationship"); setPlayWheExplain(false); setDrawerOpen(false); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                      activeTab === "play-whe" && playWheSubTab === "relationship"
                        ? "text-primary font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Activity className="w-3 h-3" />
                    RELATIONSHIP MAP
                  </button>
                  <button
                    onClick={() => { setActiveTab("play-whe"); setPlayWheSubTab("dashboard"); setPlayWheExplain(true); setDrawerOpen(false); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                      activeTab === "play-whe" && playWheExplain
                        ? "text-primary font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <HelpCircle className="w-3 h-3" />
                    HOW IT WORKS
                  </button>
                </div>
              </div>

              {/* Other Utilities */}
              <div className="space-y-1">
                <div className="px-4 py-1 text-[9px] font-mono tracking-widest text-gray-500 font-bold uppercase">
                  UTILITIES
                </div>
                <div className="pl-4 border-l border-white/5 ml-6 space-y-1">
                  <button
                    onClick={() => { setActiveTab("scanner"); setDrawerOpen(false); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                      activeTab === "scanner"
                        ? "text-primary font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Camera className="w-3 h-3" />
                    TICKET SCANNER
                  </button>
                  <button
                    onClick={() => { setActiveTab("settings"); setDrawerOpen(false); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                      activeTab === "settings"
                        ? "text-primary font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <img src="/images/settings_icon.png" alt="Settings" className="w-3 h-3 object-contain inline-block mr-1" />
                    SETTINGS
                  </button>
                </div>
              </div>
            </nav>

            {/* Footer inside drawer */}
            <div className="mt-auto border-t border-white/5 pt-4 text-center">
              <span className="text-[9px] font-mono text-gray-500 block uppercase">The Win Concept</span>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
