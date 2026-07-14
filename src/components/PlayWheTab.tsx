"use client";

import React, { useState, useEffect } from "react";
import { 
  tokenizeAndMatch, 
  CHINAPOO_CHART 
} from "@/lib/playwhe";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";
import { 
  BookOpen, 
  BarChart2, 
  Calendar, 
  RefreshCw, 
  Search, 
  HelpCircle, 
  Activity, 
  Flame, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  Database
} from "lucide-react";

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

export default function PlayWheTab() {
  const [subTab, setSubTab] = useState<"translator" | "dashboard" | "relationship" | "history" | "sync">("dashboard");
  
  // Analytics States
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsLimit, setStatsLimit] = useState(1000);
  
  // Dream Translator States
  const [dreamText, setDreamText] = useState("");
  const [matchedNumbers, setMatchedNumbers] = useState<any[]>([]);
  const [translatorSearched, setTranslatorSearched] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([]);

  // History States
  const [draws, setDraws] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [historyNumberFilter, setHistoryNumberFilter] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  // Sync States
  const [syncing, setSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);

  // Correlation States
  const [focusedNumber, setFocusedNumber] = useState<number>(1);
  const [correlationData, setCorrelationData] = useState<any>(null);
  const [correlationLoading, setCorrelationLoading] = useState<boolean>(true);

  const fetchCorrelation = async (num: number) => {
    try {
      setCorrelationLoading(true);
      const res = await fetch(`/api/playwhe/correlation?number=${num}&limit=1000`);
      const data = await res.json();
      if (data.success) {
        setCorrelationData(data);
      }
    } catch (err) {
      console.error("Error fetching Play Whe correlations:", err);
    } finally {
      setCorrelationLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === "relationship") {
      fetchCorrelation(focusedNumber);
    }
  }, [focusedNumber, subTab]);

  // Fetch Stats data
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await fetch(`/api/playwhe/stats?limit=${statsLimit}`);
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching Play Whe stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch paginated history draws
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch(
        `/api/playwhe/draws?page=${pagination.page}&limit=${pagination.limit}&search=${historySearch}&number=${historyNumberFilter}`
      );
      const data = await res.json();
      if (data.success) {
        setDraws(data.draws);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages
        }));
      }
    } catch (err) {
      console.error("Error fetching Play Whe draws:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [statsLimit]);

  useEffect(() => {
    fetchHistory();
  }, [pagination.page, historySearch, historyNumberFilter]);

  // Handle dream translation
  const handleTranslateDream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dreamText.trim()) return;
    
    const results = tokenizeAndMatch(dreamText);
    setMatchedNumbers(results);
    setTranslatorSearched(true);
  };

  // Handle manual dictionary search
  const handleManualSearch = (val: string) => {
    setManualSearchQuery(val);
    if (!val.trim()) {
      setManualSearchResults([]);
      return;
    }
    
    const term = val.toLowerCase().trim();
    const results: any[] = [];
    
    // Check if it's a number
    const num = parseInt(term);
    if (!isNaN(num) && num >= 1 && num <= 36) {
      results.push({
        number: num,
        mark: CHINAPOO_CHART[num].mark,
        keywords: CHINAPOO_CHART[num].keywords
      });
    } else {
      // Search keywords or mark names
      for (let n = 1; n <= 36; n++) {
        const entry = CHINAPOO_CHART[n];
        if (
          entry.mark.toLowerCase().includes(term) ||
          entry.keywords.some(kw => kw.includes(term))
        ) {
          results.push({
            number: n,
            mark: entry.mark,
            keywords: entry.keywords
          });
        }
      }
    }
    
    setManualSearchResults(results);
  };

  // Trigger sync
  const handleSync = async (full: boolean = false) => {
    if (syncing) return;
    setSyncing(true);
    setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting Play Whe sync (full=${full})...`]);
    setSyncSuccess(null);

    try {
      const res = await fetch("/api/playwhe/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full })
      });
      const data = await res.json();
      if (data.success) {
        setSyncLogs(prev => [
          ...prev, 
          `[${new Date().toLocaleTimeString()}] Sync Success! Added/Updated ${data.drawsAdded} draws.`,
          `[${new Date().toLocaleTimeString()}] Details: ${data.details}`
        ]);
        setSyncSuccess(true);
        // Refresh data
        fetchStats();
        fetchHistory();
      } else {
        throw new Error(data.error || data.details || "Sync failed");
      }
    } catch (err: any) {
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Sync Error: ${err.message}`]);
      setSyncSuccess(false);
    } finally {
      setSyncing(false);
    }
  };

  // Format date helper
  const formatDateString = (ds: string) => {
    try {
      const d = new Date(ds);
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
    } catch (e) {
      return ds;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Sub-Navigation Menu */}
      <div className="flex flex-col md:flex-row gap-4 border-b border-white/5 pb-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 border border-primary/20 text-primary rounded-lg shadow-[0_0_15px_rgba(56,189,248,0.25)]">
            <PlayWheIcon className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white font-mono uppercase">PLAY WHE</h2>
        </div>
        
        <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setSubTab("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
              subTab === "dashboard"
                ? "bg-primary text-slate-950 font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            ANALYTICS DASHBOARD
          </button>
          
          <button
            onClick={() => setSubTab("relationship")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
              subTab === "relationship"
                ? "bg-primary text-slate-950 font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            RELATIONSHIP MAP
          </button>

          <button
            onClick={() => setSubTab("translator")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
              subTab === "translator"
                ? "bg-primary text-slate-950 font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            DREAM TRANSLATOR
          </button>
          
          <button
            onClick={() => setSubTab("history")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
              subTab === "history"
                ? "bg-primary text-slate-950 font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            DRAW LOG
          </button>
          
          <button
            onClick={() => setSubTab("sync")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
              subTab === "sync"
                ? "bg-primary text-slate-950 font-bold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            SYNC CENTER
          </button>
        </div>
      </div>

      {/* RENDER SUB-TABS */}

      {/* TAB 1: DREAM TRANSLATOR */}
      {subTab === "translator" && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          
          {/* Input Panel - Span 3 */}
          <div className="xl:col-span-3 space-y-6">
            <div className="glass-panel p-6 rounded-xl border-primary/15 bg-primary/[0.01] space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Translate Your Dream</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Describe details from your dream below. The engine tokenizes your text, matches items against the traditional Chinapoo marks, and suggests matching numbers backed by live draw statistics.
              </p>
              
              <form onSubmit={handleTranslateDream} className="space-y-4">
                <textarea
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value)}
                  placeholder="Example: I dreamt I was chased by a dog and climbed a tree where I saw a monkey eating bananas near a big snake..."
                  className="w-full min-h-[140px] bg-slate-950/70 border border-white/10 rounded-lg p-4 text-sm text-foreground focus:outline-none focus:border-primary transition-all resize-none placeholder-gray-600 font-mono"
                />
                
                <button
                  type="submit"
                  disabled={!dreamText.trim()}
                  className="w-full py-3 bg-primary hover:bg-primary-light text-slate-950 font-bold font-mono text-xs uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(56, 189, 248,0.25)] hover:shadow-[0_0_20px_rgba(56, 189, 248,0.4)] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  INTERPRET DREAM MARKS
                </button>
              </form>
            </div>

            {/* Translation Results */}
            {translatorSearched && (
              <div className="glass-panel p-6 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h3 className="text-xs font-bold font-mono uppercase text-gray-300 tracking-wider">Matched Dream Marks</h3>
                  <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary font-bold px-2 py-0.5 rounded-full font-mono">
                    {matchedNumbers.length} MATCHES
                  </span>
                </div>
                
                {matchedNumbers.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <HelpCircle className="w-8 h-8 text-gray-600 mx-auto" />
                    <p className="text-xs text-gray-400 font-mono">No matching keywords found in the Chinapoo Chart.</p>
                    <p className="text-[10px] text-gray-500 max-w-xs mx-auto">Try describing objects, animals, people, actions, or emotions in more detail, or use the dictionary search on the right.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {matchedNumbers.map((match) => {
                      // Get stats for this number if available
                      const freqEntry = stats?.frequencies?.find((f: any) => f.number === match.number);
                      const drawsList = stats?.totalDraws || 1;
                      const appearances = freqEntry ? freqEntry.count : 0;
                      
                      return (
                        <div key={match.number} className="glass-panel p-4 rounded-lg border-white/5 bg-slate-950/40 relative overflow-hidden group hover:border-primary/20 transition-all">
                          <div className="absolute top-0 right-0 p-2 text-right">
                            <span className="text-3xl font-black text-primary/10 group-hover:text-primary/20 font-mono transition-all">
                              {match.number.toString().padStart(2, "0")}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm font-mono shadow-[0_0_10px_rgba(56, 189, 248,0.15)]">
                              {match.number}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">{match.mark}</h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {match.matchedKeywords.map((kw: string) => (
                                  <span key={kw} className="text-[9px] bg-white/5 text-gray-400 border border-white/5 px-1.5 py-0.5 rounded font-mono">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-gray-400">
                            <div>
                              APPEARANCES: <span className="text-white font-bold">{appearances}</span> ({((appearances / drawsList)*100).toFixed(1)}%)
                            </div>
                            <div>
                              PARTNER GROUP: <span className="text-primary font-bold">#{Math.ceil(match.number / 6)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dictionary Panel - Span 2 */}
          <div className="xl:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Chinapoo Dictionary Search</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Directly search the traditional Chinapoo Chart dictionary by keyword, mark name, or number (1–36) to look up symbol associations.
              </p>
              
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={manualSearchQuery}
                  onChange={(e) => handleManualSearch(e.target.value)}
                  placeholder="Search 'cow', 'old lady', '35'..."
                  className="w-full bg-slate-950/70 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                />
              </div>

              {manualSearchQuery.trim() && (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {manualSearchResults.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-gray-500 font-mono">
                      No matching dictionary marks found.
                    </div>
                  ) : (
                    manualSearchResults.map((res) => (
                      <div key={res.number} className="p-3 bg-slate-950/50 rounded-lg border border-white/5 flex justify-between items-center gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold flex items-center justify-center">
                            {res.number}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">{res.mark}</span>
                            <div className="text-[9px] text-gray-500 max-w-[200px] truncate">
                              Keywords: {res.keywords.join(", ")}
                            </div>
                          </div>
                        </div>
                        <span className="text-[8px] border border-white/5 bg-white/5 text-gray-400 px-1.5 py-0.5 rounded font-mono">
                          LINE {Math.ceil(res.number / 6)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Quick Chart Grid (Only visible if not searching) */}
            {!manualSearchQuery.trim() && (
              <div className="glass-panel p-6 rounded-xl space-y-4">
                <h4 className="text-xs font-bold uppercase font-mono text-gray-300 tracking-wider">Traditional Marks Reference</h4>
                <div className="grid grid-cols-6 gap-1.5 max-h-[350px] overflow-y-auto pr-1">
                  {Array.from({ length: 36 }).map((_, idx) => {
                    const num = idx + 1;
                    return (
                      <div
                        key={num}
                        title={`${num}: ${CHINAPOO_CHART[num].mark}`}
                        onClick={() => {
                          setDreamText(prev => prev ? `${prev} ${CHINAPOO_CHART[num].mark.toLowerCase()}` : CHINAPOO_CHART[num].mark.toLowerCase());
                          setManualSearchQuery(CHINAPOO_CHART[num].mark);
                          handleManualSearch(CHINAPOO_CHART[num].mark);
                        }}
                        className="aspect-square bg-slate-950/40 border border-white/5 rounded flex flex-col justify-center items-center cursor-pointer hover:border-primary/30 hover:bg-primary/[0.02] transition-all"
                      >
                        <span className="text-[11px] font-bold text-white font-mono">{num}</span>
                        <span className="text-[7px] text-gray-500 font-mono truncate max-w-[40px] uppercase">{CHINAPOO_CHART[num].mark.split(" ")[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1.5: RELATIONSHIP MAP */}
      {subTab === "relationship" && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          
          {/* Grid Selection Map - Span 2 */}
          <div className="xl:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-xl border-primary/15 bg-primary/[0.01] space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Relationship Focus Selector</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Select any Chinapoo mark below to examine its mathematical successors, co-occurring same-day companion numbers, and traditional folkloric partnerships.
              </p>
              
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 36 }).map((_, idx) => {
                  const num = idx + 1;
                  const isSelected = focusedNumber === num;
                  const entry = CHINAPOO_CHART[num];
                  return (
                    <div
                      key={num}
                      onClick={() => setFocusedNumber(num)}
                      className={`aspect-square rounded-lg border flex flex-col justify-center items-center cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary text-slate-950 border-primary shadow-[0_0_15px_rgba(56, 189, 248,0.3)] font-bold scale-105"
                          : "bg-slate-950/40 border-white/5 text-gray-400 hover:border-primary/30 hover:text-white"
                      }`}
                    >
                      <span className={`text-xs font-mono font-bold ${isSelected ? "text-slate-950" : "text-white"}`}>
                        {num}
                      </span>
                      <span className={`text-[7px] font-mono truncate max-w-[45px] uppercase mt-0.5 ${isSelected ? "text-slate-900" : "text-gray-500"}`}>
                        {entry.mark.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Relationships Display Panel - Span 3 */}
          <div className="xl:col-span-3 space-y-6">
            {correlationLoading ? (
              <div className="glass-panel p-12 rounded-xl flex flex-col items-center justify-center space-y-4 min-h-[450px]">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <span className="text-xs font-mono text-gray-400">Computing transition & co-occurrence matrices...</span>
              </div>
            ) : correlationData && (
              <div className="space-y-6">
                
                {/* Header Banner */}
                <div className="glass-panel p-4 rounded-xl flex items-center justify-between border-primary/15 bg-primary/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/35 text-primary flex items-center justify-center font-bold text-sm font-mono">
                      {correlationData.number}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                        {correlationData.mark}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-mono">
                        ANALYSIS FOCUS | SAMPLE SIZE: LAST {correlationData.limit} DRAWS
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] border border-white/5 bg-slate-950/40 text-gray-400 px-2.5 py-1 rounded font-mono uppercase">
                    LINE {Math.ceil(correlationData.number / 6)}
                  </span>
                </div>

                {/* Folklore vs. Reality Panel */}
                <div className="glass-panel p-6 rounded-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h4 className="text-xs font-bold font-mono uppercase text-gray-300 tracking-wider">
                      Folkloric Pairings vs. Database Reality
                    </h4>
                    <span className={`text-[8px] font-mono px-2 py-0.5 rounded font-bold ${
                      correlationData.folklore.isFolkloric 
                        ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                        : "bg-slate-900 border border-white/5 text-gray-500"
                    }`}>
                      {correlationData.folklore.isFolkloric ? "TRADITIONAL FOLKLORE" : "1/16 COMPANION GROUP"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {correlationData.folklore.partners.map((partner: any) => (
                      <div key={partner.number} className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 text-white text-[9px] font-bold flex items-center justify-center">
                              {partner.number}
                            </span>
                            <span className="font-bold text-white uppercase">{partner.mark}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">
                              CO-PLAYED: <span className="text-white font-bold">{partner.actualCount}x</span>
                            </span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                              partner.status === "HOT" ? "bg-green-500/10 border border-green-500/20 text-green-400" :
                              partner.status === "COLD" ? "bg-red-500/10 border border-red-500/20 text-red-400" :
                              "bg-gray-500/10 border border-gray-500/20 text-gray-400"
                            }`}>
                              {partner.status}
                            </span>
                          </div>
                        </div>

                        {/* Co-Occurrence Progress Bar comparison */}
                        <div className="space-y-1">
                          <div className="w-full bg-slate-950 border border-white/5 h-2.5 rounded-full overflow-hidden relative">
                            {/* Expected Average line indicator */}
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/60 z-10"
                              style={{ left: `${Math.min(100, (partner.expectedAvgCount / Math.max(1, partner.expectedAvgCount * 2)) * 100)}%` }}
                              title={`Expected Average: ${partner.expectedAvgCount}x`}
                            />
                            {/* Actual fill */}
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                partner.status === "HOT" ? "bg-green-400" :
                                partner.status === "COLD" ? "bg-red-400" :
                                "bg-primary"
                              }`}
                              style={{ width: `${Math.min(100, (partner.actualCount / Math.max(1, partner.expectedAvgCount * 2)) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[8px] font-mono text-gray-500">
                            <span>0x co-occurrences</span>
                            <span>EXP. AVG: {partner.expectedAvgCount}x</span>
                            <span>{partner.expectedAvgCount * 2}x+</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Successors & Companions Grids */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Top Successors */}
                  <div className="glass-panel p-5 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold font-mono uppercase text-gray-300 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Top Successors (Next Draw)
                    </h4>
                    
                    <div className="space-y-2">
                      {correlationData.successors.map((item: any, idx: number) => (
                        <div key={item.number} className="flex justify-between items-center p-2 bg-slate-950/40 border border-white/5 rounded-lg text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">#{idx + 1}</span>
                            <span className="w-5.5 h-5.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[10px] flex items-center justify-center">
                              {item.number}
                            </span>
                            <span className="text-white font-bold uppercase tracking-wide">{item.mark}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-white font-bold">{item.count}x</span>
                            <span className="text-[9px] text-gray-500 ml-1.5">({item.probability.toFixed(1)}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Companions */}
                  <div className="glass-panel p-5 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold font-mono uppercase text-gray-300 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Top Companions (Same Day)
                    </h4>
                    
                    <div className="space-y-2">
                      {correlationData.companions.map((item: any, idx: number) => (
                        <div key={item.number} className="flex justify-between items-center p-2 bg-slate-950/40 border border-white/5 rounded-lg text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">#{idx + 1}</span>
                            <span className="w-5.5 h-5.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[10px] flex items-center justify-center">
                              {item.number}
                            </span>
                            <span className="text-white font-bold uppercase tracking-wide">{item.mark}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-white font-bold">{item.count}x</span>
                            <span className="text-[9px] text-gray-500 ml-1.5">co-played</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ANALYTICS DASHBOARD */}
      {subTab === "dashboard" && (
        <div className="space-y-6">
          
          {/* Top Analytical Cards */}
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-panel p-6 rounded-xl h-32 animate-pulse bg-slate-900/30 border-white/5" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Partner Group Advisor */}
              <div className="glass-panel p-6 rounded-xl border-primary/10 flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] text-primary font-mono font-bold uppercase tracking-wider">1/16 Companion Recommendation</span>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Overdue Partner Marks</h3>
                  </div>
                  <TrendingUp className="w-4.5 h-4.5 text-primary" />
                </div>
                
                {stats?.partners?.recommendations?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.partners.recommendations.map((rec: any) => (
                      <div key={rec.number} className="flex items-center justify-between p-2 bg-slate-950/50 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/15 border border-primary/35 text-primary text-[10px] font-bold font-mono flex items-center justify-center">
                            {rec.number}
                          </span>
                          <span className="text-xs font-bold text-white uppercase font-mono tracking-wide">{rec.mark}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-gray-400 font-mono">GAP: {rec.gap} DRAWS</span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            rec.status === "OVERDUE" ? "bg-red-500/10 border border-red-500/20 text-red-400" :
                            rec.status === "HOT" ? "bg-green-500/10 border border-green-500/20 text-green-400" :
                            "bg-gray-500/10 border border-gray-500/20 text-gray-400"
                          }`}>
                            {rec.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-mono">No partner recommendations available. Sync some draws.</p>
                )}
                
                <div className="text-[9px] text-gray-500 font-mono leading-relaxed pt-2 border-t border-white/5">
                  If companion marks are overdue while their primary partner plays, standard Chinapoo law holds they are highly likely to follow soon.
                </div>
              </div>

              {/* Saturday Playback Checker */}
              <div className="glass-panel p-6 rounded-xl flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] text-primary font-mono font-bold uppercase tracking-wider">Traditional Trends</span>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Saturday Playbacks</h3>
                  </div>
                  <Calendar className="w-4.5 h-4.5 text-primary" />
                </div>
                
                {stats?.saturdayPlayback?.lastSaturdayDraw ? (
                  <div className="space-y-3 py-2">
                    <div className="p-3 bg-slate-950/50 rounded-lg border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] text-gray-500 font-mono">LAST SATURDAY EVENING:</div>
                        <div className="text-xs font-bold text-white font-mono uppercase tracking-wide mt-1">
                          #{stats.saturdayPlayback.lastSaturdayDraw.winning_number} {CHINAPOO_CHART[stats.saturdayPlayback.lastSaturdayDraw.winning_number].mark}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-gray-500 font-mono">DRAWN DATE:</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-1">
                          {formatDateString(stats.saturdayPlayback.lastSaturdayDraw.draw_date)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-slate-950 font-bold text-[9px] ${
                        stats.saturdayPlayback.playbackOccurred ? "bg-green-400" : "bg-red-400"
                      }`}>
                        {stats.saturdayPlayback.playbackOccurred ? "✓" : "✗"}
                      </div>
                      <p className="text-xs text-gray-300 font-mono">
                        {stats.saturdayPlayback.playbackOccurred 
                          ? "Playback has occurred this week!" 
                          : "Playback has NOT occurred this week yet."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-mono">No Saturday draws found. Sync some draws.</p>
                )}

                <div className="text-[9px] text-gray-500 font-mono leading-relaxed pt-2 border-t border-white/5">
                  Saturday Playback tracks whether the Saturday evening draw number returns at any point during the subsequent week.
                </div>
              </div>

              {/* Doubles & Zeroes Tracker */}
              <div className="glass-panel p-6 rounded-xl flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] text-purple-400 font-mono font-bold uppercase tracking-wider">Variance models</span>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">James Bond Figures</h3>
                  </div>
                  <Flame className="w-4.5 h-4.5 text-purple-400" />
                </div>
                
                {stats?.doublesAndZeroes ? (
                  <div className="space-y-3 py-2">
                    <div className="flex items-center justify-between p-2 bg-slate-950/50 rounded-lg border border-white/5 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">DOUBLES (11,22,33):</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-bold">{stats.doublesAndZeroes.doublePercentage}%</span>
                        <span className="text-[9px] text-gray-500 ml-1.5">(GAP: {stats.doublesAndZeroes.doubleGap})</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-slate-950/50 rounded-lg border border-white/5 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">ZEROES (10,20,30):</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-bold">{stats.doublesAndZeroes.zeroPercentage}%</span>
                        <span className="text-[9px] text-gray-500 ml-1.5">(GAP: {stats.doublesAndZeroes.zeroGap})</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-mono">No metrics computed. Sync draws.</p>
                )}

                <div className="text-[9px] text-gray-500 font-mono leading-relaxed pt-2 border-t border-white/5">
                  Tracks the drawing frequencies of double figures (11, 22, 33) and zeroes (10, 20, 30) relative to standard random expectation (~8.3%).
                </div>
              </div>

            </div>
          )}

          {/* Grids: Time Slot Hot/Cold Lists */}
          <div className="glass-panel p-6 rounded-xl space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Slot-Specific Hot/Cold Analyzer</h3>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  Individual draw periods (Morning vs. Evening) tend to favor specific mark profiles. Select timeframe size:
                </p>
              </div>
              <select
                value={statsLimit}
                onChange={(e) => setStatsLimit(parseInt(e.target.value))}
                className="bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3 py-1.5 text-xs text-foreground font-mono transition-all"
              >
                <option value={100}>Last 100 Draws</option>
                <option value={500}>Last 500 Draws</option>
                <option value={1000}>Last 1000 Draws</option>
              </select>
            </div>
            
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-64 bg-slate-900/30 border border-white/5 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {Object.keys(stats?.slotStats || {}).map((slotName) => {
                  const data = stats.slotStats[slotName];
                  
                  return (
                    <div key={slotName} className="glass-panel p-4 rounded-lg bg-slate-950/20 border-white/5 space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <h4 className="text-xs font-bold font-mono uppercase text-primary tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {slotName}
                        </h4>
                      </div>
                      
                      {/* Hot Grid */}
                      <div className="space-y-2">
                        <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider flex items-center gap-1">
                          <Flame className="w-3 h-3 text-red-400" />
                          Hot Marks
                        </div>
                        
                        <div className="space-y-1">
                          {data.hot.slice(0, 3).map((item: any) => (
                            <div key={item.number} className="flex justify-between items-center text-[11px] font-mono p-1.5 bg-red-500/[0.02] border border-red-500/10 rounded">
                              <span className="text-white font-bold uppercase tracking-wide">
                                {item.number}. {item.mark}
                              </span>
                              <span className="text-red-400 font-bold">{item.count}x</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cold Grid */}
                      <div className="space-y-2">
                        <div className="text-[9px] text-gray-500 font-mono uppercase tracking-wider flex items-center gap-1">
                          <Activity className="w-3 h-3 text-blue-400 animate-pulse" />
                          Cold/Overdue Marks
                        </div>
                        
                        <div className="space-y-1">
                          {data.cold.slice(0, 3).map((item: any) => (
                            <div key={item.number} className="flex justify-between items-center text-[11px] font-mono p-1.5 bg-blue-500/[0.02] border border-blue-500/10 rounded">
                              <span className="text-white font-bold uppercase tracking-wide">
                                {item.number}. {item.mark}
                              </span>
                              <span className="text-blue-400 font-bold">GAP: {item.gap}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bar Charts: Lines & Suits */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Line Distribution Chart */}
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold font-mono uppercase text-gray-300 tracking-wider">Line Frequencies</h3>
                <span className="text-[10px] text-gray-500 font-mono">ROWS: 1–6</span>
              </div>
              
              <div className="h-64 w-full">
                {statsLoading ? (
                  <div className="w-full h-full bg-slate-900/30 animate-pulse rounded" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.lines || []} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
                      <XAxis dataKey="line" stroke="#6b7280" style={{ fontSize: "10px", fontFamily: "monospace" }} tickFormatter={(val) => `LINE ${val}`} />
                      <YAxis stroke="#6b7280" style={{ fontSize: "10px", fontFamily: "monospace" }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px" }}
                        labelStyle={{ color: "#fff", fontFamily: "monospace", fontSize: "11px" }}
                        itemStyle={{ color: "#c084fc", fontFamily: "monospace", fontSize: "11px" }}
                        labelFormatter={(label) => `Line ${label} (Numbers ${(label-1)*6+1} - ${label*6})`}
                      />
                      <Bar dataKey="count" fill="url(#lineGrad)">
                        {stats?.lines?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.gap > 8 ? "#ef4444" : "#c084fc"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Suit Distribution Chart */}
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold font-mono uppercase text-gray-300 tracking-wider">Suit Frequencies</h3>
                <span className="text-[10px] text-gray-500 font-mono">COLUMNS: ENdING 1–6</span>
              </div>
              
              <div className="h-64 w-full">
                {statsLoading ? (
                  <div className="w-full h-full bg-slate-900/30 animate-pulse rounded" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.suits || []} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
                      <XAxis dataKey="suit" stroke="#6b7280" style={{ fontSize: "10px", fontFamily: "monospace" }} tickFormatter={(val) => `SUIT ${val}`} />
                      <YAxis stroke="#6b7280" style={{ fontSize: "10px", fontFamily: "monospace" }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px" }}
                        labelStyle={{ color: "#fff", fontFamily: "monospace", fontSize: "11px" }}
                        itemStyle={{ color: "#c084fc", fontFamily: "monospace", fontSize: "11px" }}
                        labelFormatter={(label) => `Suit ${label} (Ending digit ${label})`}
                      />
                      <Bar dataKey="count" fill="#3b82f6">
                        {stats?.suits?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.gap > 8 ? "#f59e0b" : "#3b82f6"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: DRAW LOG */}
      {subTab === "history" && (
        <div className="glass-panel p-6 rounded-xl space-y-6">
          
          {/* Header Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Play Whe Draw Log</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Filter and browse the complete catalog of daily draws.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  placeholder="Search Date/Draw..."
                  className="bg-slate-950/70 border border-white/10 rounded-lg pl-8 pr-4 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-mono placeholder-gray-600"
                />
              </div>

              <select
                value={historyNumberFilter}
                onChange={(e) => {
                  setHistoryNumberFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3 py-1.5 text-xs text-foreground font-mono transition-all"
              >
                <option value="">All Marks</option>
                {Array.from({ length: 36 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {idx + 1} - {CHINAPOO_CHART[idx + 1].mark}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-white/5 rounded-lg">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-950 border-b border-white/5 text-[10px] uppercase text-gray-400 tracking-wider">
                  <th className="py-3 px-4 font-semibold">Draw #</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Time Slot</th>
                  <th className="py-3 px-4 font-semibold text-center">Mark Number</th>
                  <th className="py-3 px-4 font-semibold">Chinapoo Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {historyLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse bg-slate-900/10">
                      <td colSpan={5} className="py-4 px-4 h-12 bg-slate-950/5" />
                    </tr>
                  ))
                ) : draws.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 font-mono">
                      No matching draws found in the database. Try running a Sync.
                    </td>
                  </tr>
                ) : (
                  draws.map((draw) => (
                    <tr key={draw.draw_number} className="hover:bg-white/[0.01] transition-all">
                      <td className="py-3 px-4 text-white font-bold">#{draw.draw_number}</td>
                      <td className="py-3 px-4 text-gray-400">{formatDateString(draw.draw_date)}</td>
                      <td className="py-3 px-4 text-gray-400">
                        <span className="px-2 py-0.5 border border-white/5 bg-slate-950/30 rounded text-[10px]">
                          {draw.draw_time_slot}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="w-7 h-7 rounded-full bg-primary/15 border border-primary/35 text-primary font-bold flex items-center justify-center mx-auto">
                          {draw.winning_number}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-bold uppercase tracking-wider">
                        {CHINAPOO_CHART[draw.winning_number].mark}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-white/5 font-mono text-[10px] text-gray-500">
              <div>
                SHOWING <span className="text-white font-bold">{draws.length}</span> OF <span className="text-white font-bold">{pagination.total}</span> DRAWS
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="p-1 bg-slate-900 border border-white/5 rounded hover:border-primary/30 disabled:opacity-30 disabled:pointer-events-none transition-all text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-gray-300 text-xs">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="p-1 bg-slate-900 border border-white/5 rounded hover:border-primary/30 disabled:opacity-30 disabled:pointer-events-none transition-all text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 4: SYNC CENTER */}
      {subTab === "sync" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Controls - Span 2 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-5 h-5 text-primary ${syncing ? "animate-spin" : ""}`} />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Sync Control Center</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Manually trigger the Play Whe web scraper to pull draws from the official results page. The parser extracts the winning marks and commits them to the local SQLite database.
              </p>
              
              <div className="grid grid-cols-1 gap-3 pt-2">
                <button
                  onClick={() => handleSync(false)}
                  disabled={syncing}
                  className="py-3 bg-primary hover:bg-primary-light text-slate-950 font-mono font-bold text-xs uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(56, 189, 248,0.2)] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                  SYNC RECENT DRAWS (4 Years)
                </button>
                
                <button
                  onClick={() => handleSync(true)}
                  disabled={syncing}
                  className="py-3 bg-slate-900 border border-white/10 hover:border-primary/40 text-gray-300 hover:text-white font-mono font-bold text-xs uppercase tracking-wider rounded-lg disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
                >
                  <Database className="w-3.5 h-3.5" />
                  SYNC FULL HISTORY (2001 - Present)
                </button>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-xl space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-gray-400 border-b border-white/5 pb-2">
                <span>DATABASE STATUS</span>
                <span className="text-[10px] text-green-400 font-bold">ONLINE</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">PLAY WHE DRAWS SEEDED:</span>
                <span className="text-white font-bold">{pagination.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">LAST SYNCED DRAW:</span>
                <span className="text-white font-bold">
                  {draws.length > 0 ? `#${draws[0].draw_number}` : "None"}
                </span>
              </div>
            </div>
          </div>

          {/* Sync logs output console - Span 3 */}
          <div className="lg:col-span-3">
            <div className="glass-panel rounded-xl h-full flex flex-col overflow-hidden border-white/5 bg-slate-950/60 min-h-[300px]">
              <div className="bg-slate-950 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-bold font-mono text-gray-500 uppercase tracking-wider">Sync Console Output</span>
                {syncSuccess !== null && (
                  <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded ${
                    syncSuccess ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
                  }`}>
                    {syncSuccess ? "SYNC SUCCESS" : "SYNC ERROR"}
                  </span>
                )}
              </div>
              <div className="flex-1 p-4 overflow-y-auto font-mono text-[10px] text-green-400 space-y-1 bg-slate-950/70 select-text max-h-[350px]">
                {syncLogs.length === 0 ? (
                  <div className="text-gray-600 italic">No console logs available. Click a sync button to trigger.</div>
                ) : (
                  syncLogs.map((log, idx) => (
                    <div key={idx} className="whitespace-pre-wrap leading-relaxed">{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
