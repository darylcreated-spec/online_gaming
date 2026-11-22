import React, { useState, useEffect } from "react";
import { BarChart2, Calendar, ClipboardList, RefreshCw, Sliders, Cpu, Eye, Compass, Info, Save, Download, Trash2, GitBranch, Play, HelpCircle, Brain, Zap, Shield, Binary, ShieldCheck, X, Printer, Crosshair, GitMerge } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from "recharts";
import MultiBallMathPanel from "@/components/MultiBallMathPanel";
import GameHeaderBanner from "@/components/GameHeaderBanner";
import WinForLifeDiff28Panel from "@/components/WinForLifeDiff28Panel";
import WinForLifeQuant100Panel from "@/components/WinForLifeQuant100Panel";
import WinForLifeForensicPanel from "@/components/WinForLifeForensicPanel";
import TrevorEnginePanel from "@/components/TrevorEnginePanel";
import Lucky7EnginePanel from "@/components/Lucky7EnginePanel";
import BetSlipExportModal from "@/components/BetSlipExportModal";
import { downloadBlobFile } from "@/lib/export_helpers";

// Helper to generate all combinations of size k from an array
function getCombinations(arr: number[], k: number): number[][] {
  const result: number[][] = [];
  function helper(start: number, combo: number[]) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return result;
}

// Greedy Abbreviated Wheeling generator for tickets of size 6
function generateWinForLifeWheel(pool: number[], t: number, m: number): number[][] {
  const sortedPool = [...pool].sort((a, b) => a - b);
  const targets = getCombinations(sortedPool, m);
  const candidates = getCombinations(sortedPool, 6);
  
  const candidateCoverage = candidates.map(ticket => {
    const coveredIndices = new Set<number>();
    targets.forEach((target, idx) => {
      const matchCount = target.filter(val => ticket.includes(val)).length;
      if (matchCount >= t) {
        coveredIndices.add(idx);
      }
    });
    return { ticket, coveredIndices };
  });
  
  const selectedTickets: number[][] = [];
  const uncoveredTargetIndices = new Set<number>(targets.map((_, idx) => idx));
  
  while (uncoveredTargetIndices.size > 0 && candidateCoverage.length > 0) {
    let bestCandidateIdx = -1;
    let maxNewCoverage = 0;
    
    for (let i = 0; i < candidateCoverage.length; i++) {
      let currentNewCoverage = 0;
      for (const idx of candidateCoverage[i].coveredIndices) {
        if (uncoveredTargetIndices.has(idx)) {
          currentNewCoverage++;
        }
      }
      if (currentNewCoverage > maxNewCoverage) {
        maxNewCoverage = currentNewCoverage;
        bestCandidateIdx = i;
      }
    }
    
    if (bestCandidateIdx === -1 || maxNewCoverage === 0) {
      break;
    }
    
    const bestCandidate = candidateCoverage[bestCandidateIdx];
    selectedTickets.push(bestCandidate.ticket);
    
    for (const idx of bestCandidate.coveredIndices) {
      uncoveredTargetIndices.delete(idx);
    }
    candidateCoverage.splice(bestCandidateIdx, 1);
  }
  
  return selectedTickets;
}

const validateTicket = (ticket: number[]) => {
  const oddCount = ticket.filter(n => n % 2 !== 0).length;
  const evenCount = ticket.length - oddCount;
  const oddEvenRatio = `${oddCount}:${evenCount}`;
  
  const lowCount = ticket.filter(n => n <= 14).length;
  const highCount = ticket.length - lowCount;
  const highLowRatio = `${lowCount}:${highCount}`;
  
  const sorted = [...ticket].sort((a, b) => a - b);
  const spread = sorted[sorted.length - 1] - sorted[0];
  
  let consecutiveCount = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] === 1) {
      consecutiveCount++;
    }
  }
  
  const sum = ticket.reduce((a, b) => a + b, 0);
  const checks = {
    oddEven: ["3:3", "4:2", "2:4"].includes(oddEvenRatio),
    highLow: ["3:3", "4:2", "2:4"].includes(highLowRatio),
    spread: spread >= 12 && spread <= 24,
    consecutive: consecutiveCount <= 1,
    sum: sum >= 65 && sum <= 110,
  };
  
  let score = 0;
  if (checks.oddEven) score += 20;
  if (checks.highLow) score += 20;
  if (checks.spread) score += 20;
  if (checks.consecutive) score += 20;
  if (checks.sum) score += 20;
  
  let grade = "D";
  if (score >= 100) grade = "A+";
  else if (score >= 80) grade = "A";
  else if (score >= 60) grade = "B";
  else if (score >= 40) grade = "C";
  
  return {
    grade,
    score,
    oddEvenRatio,
    highLowRatio,
    spread,
    consecutiveCount,
    checks
  };
};

export default function WinForLifeTab() {
  const [subTab, setSubTab] = useState<"dashboard" | "lucky7" | "trevor" | "math-engine" | "diff-28" | "quant-100" | "forensic" | "history" | "builder" | "predictions" | "network" | "explain">("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // History tab states
  const [draws, setDraws] = useState<any[]>([]);
  const [allDrawsForGaps, setAllDrawsForGaps] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilterNum, setHistoryFilterNum] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedWflDraw, setSelectedWflDraw] = useState<any | null>(null);

  // Predictions states
  const [predictions, setPredictions] = useState<any[]>([]);
  const [predictionsStats, setPredictionsStats] = useState<any>(null);
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  const [modelBreakdown, setModelBreakdown] = useState<any[]>([]);

  // Builder states
  const [selectedNums, setSelectedNums] = useState<number[]>([]);
  const [selectedCb, setSelectedCb] = useState<number | null>(null);
  const [wheelStrategy, setWheelStrategy] = useState<"full" | "abbreviated-5-5" | "abbreviated-4-4">("abbreviated-5-5");
  const [generatedTickets, setGeneratedTickets] = useState<number[][]>([]);
  const [wheelingLoading, setWheelingLoading] = useState(false);
  const [isSavingSlips, setIsSavingSlips] = useState(false);
  const [showHeatmapOverlay, setShowHeatmapOverlay] = useState(true);
  const [championPick, setChampionPick] = useState<any>(null);
  const [showChampionDrawer, setShowChampionDrawer] = useState<boolean>(false);
  const [exportPayload, setExportPayload] = useState<{
    slips: number[][];
    bonusBalls: number[];
    targetDrawNumber?: number;
  } | null>(null);

  // Network map states
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);



  // MEV Engine States
  const [mevTickets, setMevTickets] = useState<any[]>([]);
  const [mevStats, setMevStats] = useState<any>(null);
  const [mevLoading, setMevLoading] = useState(false);
  const [mevTicketCount, setMevTicketCount] = useState(5);
  const [mevHasRun, setMevHasRun] = useState(false);

  const runMEVEngine = async () => {
    try {
      setMevLoading(true);
      setMevHasRun(true);
      const res = await fetch(`/api/mev?game=win-for-life&tickets=${mevTicketCount}&candidates=25000`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setMevTickets(data.tickets || []);
        setMevStats(data.engineStats || null);
      }
    } catch (err) {
      console.error("WFL MEV Engine error:", err);
    } finally {
      setMevLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchPredictions();
    fetchAllDraws();

    const handleSyncEvent = () => {
      console.log("[WinForLifeTab] Global sync event received, refreshing data...");
      fetchStats();
      fetchPredictions();
      fetchAllDraws();
      if (subTab === "history") {
        fetchHistory();
      }
    };

    window.addEventListener("win_concept_sync_completed", handleSyncEvent);
    return () => window.removeEventListener("win_concept_sync_completed", handleSyncEvent);
  }, []);

  useEffect(() => {
    if (subTab === "history") {
      fetchHistory();
    }
  }, [subTab, historyPage, historySearch, historyFilterNum]);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const [res, trackerRes] = await Promise.all([
        fetch("/api/winforlife/stats", { cache: "no-store" }),
        fetch("/api/engine-tracker?game=win-for-life&depth=100", { cache: "no-store" }).catch(() => null)
      ]);
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
      if (trackerRes && trackerRes.ok) {
        const tData = await trackerRes.json();
        const wflChamp = tData?.championPicks?.find((c: any) => c.game_key === "win-for-life") || tData?.championPicks?.[0];
        if (wflChamp) {
          setChampionPick(wflChamp);
          const coreSet = new Set<number>();
          for (const slip of wflChamp.wheel_slips || [wflChamp.predicted_numbers || []]) {
            for (const b of slip) {
              if (coreSet.size < 10) coreSet.add(b);
            }
          }
          if (coreSet.size >= 6) {
            setSelectedNums(prev => (prev.length === 0 ? Array.from(coreSet).sort((a, b) => a - b) : prev));
            setSelectedCb(prev => (prev === null ? (wflChamp.predicted_powerball || wflChamp.bonus_ball_rotation?.[0] || 1) : prev));
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`/api/winforlife/draws?page=${historyPage}&limit=12&search=${encodeURIComponent(historySearch)}&number=${historyFilterNum}`);
      const data = await res.json();
      if (data.success) {
        setDraws(data.draws);
        setHistoryPages(data.pagination.pages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchAllDraws = async () => {
    try {
      const res = await fetch("/api/winforlife/draws?page=1&limit=1000");
      const data = await res.json();
      if (data.success) {
        setAllDrawsForGaps(data.draws);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPredictions = async () => {
    try {
      setPredictionsLoading(true);
      const res = await fetch("/api/winforlife/predictions");
      const data = await res.json();
      if (data.success) {
        setPredictions(data.predictions);
        setPredictionsStats(data.stats);
        if (data.modelBreakdown) setModelBreakdown(data.modelBreakdown);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPredictionsLoading(false);
    }
  };

  const toggleNumber = (num: number) => {
    if (selectedNums.includes(num)) {
      setSelectedNums(selectedNums.filter(n => n !== num));
    } else {
      if (selectedNums.length >= 12) {
        alert("Maximum pool size is 12 numbers.");
        return;
      }
      setSelectedNums([...selectedNums, num]);
    }
  };

  const handleGenerateWheel = () => {
    if (selectedNums.length < 6) {
      alert("Please select at least 6 numbers.");
      return;
    }
    setWheelingLoading(true);
    setTimeout(() => {
      try {
        let tickets: number[][] = [];
        if (wheelStrategy === "full") {
          tickets = getCombinations(selectedNums, 6);
        } else if (wheelStrategy === "abbreviated-5-5") {
          tickets = generateWinForLifeWheel(selectedNums, 5, 5);
        } else {
          tickets = generateWinForLifeWheel(selectedNums, 4, 4);
        }
        setGeneratedTickets(tickets);
      } catch (err) {
        console.error(err);
      } finally {
        setWheelingLoading(false);
      }
    }, 100);
  };

  const handleQuickPick = (count: number) => {
    const numbers = Array.from({ length: 28 }, (_, i) => i + 1);
    numbers.sort(() => Math.random() - 0.5);
    setSelectedNums(numbers.slice(0, count).sort((a, b) => a - b));
    setSelectedCb(Math.floor(Math.random() * 3) + 1);
  };

  const handleClear = () => {
    setSelectedNums([]);
    setSelectedCb(null);
    setGeneratedTickets([]);
  };

  const handleSaveSlips = async () => {
    if (generatedTickets.length === 0) return;
    setIsSavingSlips(true);
    try {
      const promises = generatedTickets.map(ticket => {
        return fetch('/api/slips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numbers: ticket,
            powerball: selectedCb || 1,
            game: 'win-for-life',
            group_name: 'WFL Generated'
          })
        });
      });
      await Promise.all(promises);
      alert(`Successfully saved ${generatedTickets.length} slips!`);
    } catch (err) {
      console.error(err);
      alert('Failed to save slips.');
    } finally {
      setIsSavingSlips(false);
    }
  };

  const handleExportTxt = () => {
    if (generatedTickets.length === 0) return;
    const content = generatedTickets
      .map(
        (t, idx) =>
          `Slip ${String(idx + 1).padStart(2, "0")}: ${t.map((n) => String(n).padStart(2, "0")).join(", ")} | Cash Ball: ${selectedCb || ((idx % 3) + 1)}`
      )
      .join("\n");
    downloadBlobFile(
      `THE WIN CONCEPT - WIN FOR LIFE SLIPS\nTotal Lines: ${generatedTickets.length} ($${generatedTickets.length * 10}.00 TTD)\n\n${content}`,
      `NLCB_win-for-life_${generatedTickets.length}slips_${Date.now()}.txt`,
      "text/plain;charset=utf-8"
    );
  };



  const getCompanionNumbers = () => {
    if (selectedNums.length === 0 || !stats?.frequencies) return [];
    const comps = Array(29).fill(0);
    selectedNums.forEach(num => {
      const row = stats.transitions[num] || {};
      Object.keys(row).forEach(target => {
        const t = parseInt(target);
        if (!selectedNums.includes(t)) {
          comps[t] += row[target];
        }
      });
    });
    return comps
      .map((count, num) => ({ num, count }))
      .filter(item => item.num > 0 && item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const companionNums = getCompanionNumbers();

  // Compute Gap trends dynamically from all draws
  const getGaps = () => {
    const gaps = Array(29).fill(999);
    if (allDrawsForGaps.length === 0) return gaps;
    
    for (let i = 1; i <= 28; i++) {
      const idx = allDrawsForGaps.findIndex(d => 
        [d.num1, d.num2, d.num3, d.num4, d.num5, d.num6].includes(i)
      );
      if (idx !== -1) {
        gaps[i] = idx;
      }
    }
    return gaps;
  };

  const currentGaps = getGaps();

  const latestDrawItem = stats?.latestDraw || (draws.length > 0 ? draws[0] : null);

  return (
    <div className="space-y-6">
      {/* Game Hero Header Banner */}
      <GameHeaderBanner
        game="win-for-life"
        title="Win For Life"
        subtitle="Pick 6 numbers from 1 to 28 plus 1 Cash Ball (1, 2, or 3). Draws Tuesday and Friday at 7:00 PM, $10.00 per line."
        themeColor="emerald"
        iconSrc="/images/win_for_life_icon.png"
        totalDrawsCount={stats?.totalDraws || draws.length}
        loading={statsLoading}
        latestDraw={
          latestDrawItem
            ? {
                draw_number: latestDrawItem.draw_number,
                draw_date: latestDrawItem.draw_date,
                winning_display: (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      latestDrawItem.num1,
                      latestDrawItem.num2,
                      latestDrawItem.num3,
                      latestDrawItem.num4,
                      latestDrawItem.num5,
                      latestDrawItem.num6,
                    ].map((n: number, idx: number) => (
                      <span
                        key={idx}
                        className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-200 font-black text-xs flex items-center justify-center font-mono shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                      >
                        {n}
                      </span>
                    ))}
                    <span className="text-white font-bold text-xs">+</span>
                    <span
                      className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center font-mono shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                      title="Cash Ball"
                    >
                      {latestDrawItem.cash_ball}
                    </span>
                  </div>
                ),
              }
            : null
        }
      />
      
      {/* Sub-Navigation Menu */}
      <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full md:w-fit mb-6 overflow-x-auto flex-nowrap scrollbar-none gap-1">
        {[
          { id: "dashboard", label: "DASHBOARD & STATS", icon: BarChart2 },
          { id: "lucky7", label: "LUCKY 7", icon: GitMerge },
          { id: "trevor", label: "TREVOR ENGINE", icon: Crosshair },
          { id: "math-engine", label: "MATHEMATICAL ENGINE", icon: Brain },
          { id: "diff-28", label: "SUM-28 QUANT ENGINE", icon: Binary },
          { id: "quant-100", label: "100% QUANT ENGINE", icon: ShieldCheck },
          { id: "forensic", label: "FORENSIC ENGINE", icon: Cpu },
          { id: "builder", label: "WHEELING BUILDER", icon: ClipboardList },
          { id: "history", label: "DRAW ARCHIVE", icon: Calendar },
          { id: "network", label: "SUCCESSOR MATRIX", icon: GitBranch },
          { id: "predictions", label: "PREDICTION HITS", icon: RefreshCw },
          { id: "explain", label: "METHODOLOGY", icon: HelpCircle },
        ].map((tabItem) => {
          const IconComp = tabItem.icon;
          const isActive = subTab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              onClick={() => setSubTab(tabItem.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              {tabItem.label}
            </button>
          );
        })}
      </div>

      {subTab === "dashboard" && (
        <div className="space-y-6">
          
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Latest Draw Results */}
            <div className="glass-panel p-5 rounded-xl border border-white/5 bg-slate-950/40 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
              <div>
                <span className="text-xs font-bold font-mono tracking-widest text-primary uppercase block mb-2">
                  LATEST DRAW RESULTS
                </span>
                {statsLoading || !stats?.latestDraw ? (
                  <div className="space-y-2 animate-pulse py-1">
                    <div className="h-6 w-32 bg-white/5 rounded" />
                    <div className="h-4 w-48 bg-white/5 rounded" />
                  </div>
                ) : (
                  <div className="space-y-2 font-mono">
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>Draw #{stats.latestDraw.draw_number}</span>
                      <span>{stats.latestDraw.draw_date}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {[
                        stats.latestDraw.num1,
                        stats.latestDraw.num2,
                        stats.latestDraw.num3,
                        stats.latestDraw.num4,
                        stats.latestDraw.num5,
                        stats.latestDraw.num6
                      ].map((n, idx) => (
                        <span key={idx} className="w-7 h-7 rounded-full bg-slate-900 border border-white/5 text-white flex items-center justify-center font-bold text-xs">
                          {n}
                        </span>
                      ))}
                      <span className="text-gray-600 font-bold mx-0.5">|</span>
                      <span className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {stats.latestDraw.cash_ball}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Next Draw Schedule */}
            <div className="glass-panel p-5 rounded-xl border border-white/5 bg-slate-950/40 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
              <div>
                <span className="text-xs font-bold font-mono tracking-widest text-primary uppercase block mb-2">
                  NEXT SCHEDULED DRAW
                </span>
                <div className="space-y-1.5 font-mono">
                  <div className="text-sm font-bold text-white uppercase tracking-wider">
                    {(() => {
                      const now = new Date();
                      const ttTime = new Date(now.getTime() - 4 * 60 * 60 * 1000);
                      let nextDraw = new Date(ttTime);
                      nextDraw.setHours(19, 0, 0, 0);
                      const day = ttTime.getDay();
                      if (day === 2) {
                        if (ttTime.getHours() >= 19) nextDraw.setDate(ttTime.getDate() + 3);
                      } else if (day === 5) {
                        if (ttTime.getHours() >= 19) nextDraw.setDate(ttTime.getDate() + 4);
                      } else if (day === 0 || day === 1) {
                        nextDraw.setDate(ttTime.getDate() + (2 - day));
                      } else if (day === 3 || day === 4) {
                        nextDraw.setDate(ttTime.getDate() + (5 - day));
                      } else if (day === 6) {
                        nextDraw.setDate(ttTime.getDate() + 3);
                      }
                      return nextDraw.toLocaleDateString("en-TT", { weekday: "long", month: "short", day: "numeric" });
                    })()}
                  </div>
                  <div className="text-xs text-amber-400 font-black">
                    7:00 PM
                  </div>
                  <div className="text-xs text-gray-500 leading-relaxed pt-1">
                    Draws occur every Tuesday and Friday evening.
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Verified Champion Master Pick */}
            <div className="glass-panel p-5 rounded-xl border border-emerald-500/30 bg-slate-950/60 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold font-mono tracking-widest text-emerald-400 uppercase block">
                    VERIFIED CHAMPION PICK
                  </span>
                  {championPick && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black font-mono">
                      {championPick.verified_win_rate_pct ?? championPick.win_rate_pct}% WIN RATE
                    </span>
                  )}
                </div>
                {statsLoading && !championPick ? (
                  <div className="space-y-2 animate-pulse py-1">
                    <div className="h-6 w-32 bg-white/5 rounded" />
                    <div className="h-4 w-48 bg-white/5 rounded" />
                  </div>
                ) : (
                  <div className="space-y-2 font-mono">
                    <div className="text-xs text-slate-400 uppercase tracking-widest">
                      {championPick ? `${championPick.engine_name} (Next Draw ${championPick.target_draw_number})` : "Balanced Hot and Cold Numbers"}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {(() => {
                        const finalPool: number[] =
                          championPick?.predicted_numbers?.length === 6
                            ? championPick.predicted_numbers
                            : (stats?.frequencies || []).slice(0, 6).map((f: any) => f.number).sort((a: number, b: number) => a - b);
                        const cb =
                          championPick?.predicted_powerball ||
                          championPick?.bonus_ball_rotation?.[0] ||
                          stats?.cashBallFrequencies?.[0]?.number ||
                          1;
                        return (
                          <>
                            {finalPool.map((n, idx) => (
                              <span key={idx} className="w-7 h-7 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center font-black text-xs">
                                {n}
                              </span>
                            ))}
                            <span className="text-gray-600 font-bold mx-0.5">|</span>
                            <span className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 flex items-center justify-center font-black text-xs" title="Cash Ball (1–3)">
                              {cb}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Connected Engines Tab #1 Verified Champion Portfolio Drawer */}
          {championPick && (
            <div className="rounded-2xl bg-slate-900/80 border border-emerald-500/30 overflow-hidden font-mono">
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    Verified Champion Engine — {championPick.engine_name}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                    {championPick.verified_win_rate_pct ?? championPick.win_rate_pct}% 3+ BALL PRIZE WIN RATE ({(championPick.verified_roi_pct ?? championPick.roi_pct) >= 0 ? "+" : ""}{championPick.verified_roi_pct ?? championPick.roi_pct}% ROI)
                  </span>
                  {championPick.bonus_ball_rotation?.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold">
                      Cash Ball Rotation (1–3): {championPick.bonus_ball_rotation.join(", ")}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      const slips = (championPick.wheel_slips || [championPick.predicted_numbers]).slice(0, 10);
                      const bonusBalls = slips.map((_: number[], idx: number) => {
                        const raw =
                          championPick.line_powerballs?.[idx % (championPick.line_powerballs?.length || 1)] ||
                          championPick.predicted_powerball ||
                          ((idx % 3) + 1);
                        return raw >= 1 && raw <= 3 ? raw : ((Math.abs(raw) - 1) % 3) + 1;
                      });
                      setExportPayload({
                        slips,
                        bonusBalls,
                        targetDrawNumber: championPick.target_draw_number
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-bold text-xs transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print or Export</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setShowChampionDrawer(!showChampionDrawer);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-xs font-bold transition cursor-pointer"
                  >
                    {showChampionDrawer ? "Close Champion Drawer" : "Open 10-Slip & Window Drawer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setSubTab("builder");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Wheeling ({selectedNums.length} Balls)
                  </button>
                </div>
              </div>

              {showChampionDrawer && (
                <div className="p-4 border-t border-emerald-500/20 space-y-4 bg-slate-950/60">
                  {championPick.multi_draw_window_rates && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-gray-400 uppercase block">1-Draw Window</span>
                          <span className="text-xs text-gray-500">{championPick.multi_draw_window_rates.description}</span>
                        </div>
                        <span className="text-base font-black text-emerald-400">{championPick.multi_draw_window_rates.window_1_draw}%</span>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-gray-400 uppercase block">3-Draw Rolling Window</span>
                          <span className="text-xs text-gray-500">4+ Prize Ball Capture</span>
                        </div>
                        <span className="text-base font-black text-emerald-400">{championPick.multi_draw_window_rates.window_3_draw}%</span>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-gray-400 uppercase block">5-Draw Saturation Window</span>
                          <span className="text-xs text-gray-500">Multi-Draw Convergence</span>
                        </div>
                        <span className="text-base font-black text-emerald-400">{championPick.multi_draw_window_rates.window_5_draw}%</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    {(championPick.wheel_slips || [championPick.predicted_numbers]).slice(0, 10).map((slip: number[], idx: number) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          idx === 0
                            ? "bg-emerald-500/15 border-emerald-400/50"
                            : "bg-black/40 border-white/10"
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                        <div className="flex items-center gap-1">
                          {slip.map((n: number, bIdx: number) => (
                            <span
                              key={bIdx}
                              className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-black text-xs flex items-center justify-center"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}



          {/* ═══════════════════════════════════════════════════════════════════
              MEV ENGINE — Maximum Expected Value AI Optimizer (Win For Life)
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="glass-panel rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-slate-950/60 to-transparent p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-black uppercase tracking-wider text-white font-mono">
                    Expected Value (EV) Combinatorial Optimizer
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black uppercase border border-emerald-500/30">
                    {mevStats ? `${mevStats.drawsAnalyzed} DRAWS` : "459+ DRAWS"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono max-w-2xl">
                  Scores 25,000 stochastic candidates against 6 weighted factors derived from every historical Win For Life draw:
                  Combines draw frequency, recent appearances, partner pairs, number balance, and overdue gaps.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 bg-slate-900/80 border border-white/10 px-3 py-1.5 rounded-lg">
                  <span className="text-xs text-gray-400 font-mono uppercase">Lines ($10/ticket):</span>
                  <select
                    value={mevTicketCount}
                    onChange={(e) => setMevTicketCount(parseInt(e.target.value))}
                    className="bg-transparent border-none text-white font-bold text-xs font-mono cursor-pointer focus:outline-none"
                  >
                    <option value="3">3 ($30 TT)</option>
                    <option value="5">5 ($50 TT)</option>
                    <option value="8">8 ($80 TT)</option>
                    <option value="10">10 ($100 TT)</option>
                  </select>
                </div>

                <button
                  onClick={runMEVEngine}
                  disabled={mevLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-emerald-500/50 disabled:to-teal-500/50 disabled:cursor-not-allowed text-slate-950 text-xs font-black tracking-widest uppercase transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] rounded-lg cursor-pointer"
                >
                  {mevLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      COMPUTING...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      {mevHasRun ? "RE-GENERATE" : "GENERATE OPTIMAL LINES"}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* MEV Results */}
            {mevLoading ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-xs font-mono text-gray-400">Scoring 25,000 weighted candidates across 6 statistical dimensions...</span>
              </div>
            ) : mevTickets.length > 0 ? (
              <div className="space-y-4">
                {/* Engine Stats Bar */}
                {mevStats && (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-gray-400 uppercase bg-slate-950/40 border border-white/5 px-4 py-2 rounded-lg">
                    <div className="flex flex-wrap gap-4">
                      <span>Draws Analyzed: <strong className="text-emerald-400">{mevStats.drawsAnalyzed}</strong></span>
                      <span>Candidates Scored: <strong className="text-emerald-400">{mevStats.candidatesScored.toLocaleString()}</strong></span>
                      <span>Score Cutoff: <strong className="text-emerald-400">{mevStats.topScoreCutoff}</strong></span>
                      <span>Compute Time: <strong className="text-emerald-400">{mevStats.computeTimeMs}ms</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setExportPayload({
                          slips: mevTickets.map((t: any) => t.numbers),
                          bonusBalls: mevTickets.map((t: any, i: number) => {
                            const raw = Number(t.cashBall ?? t.powerball ?? ((i % 3) + 1));
                            return raw >= 1 && raw <= 3 ? raw : ((Math.abs(raw) - 1) % 3) + 1;
                          }),
                          targetDrawNumber: championPick?.target_draw_number
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-bold normal-case transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print or Export Lines</span>
                    </button>
                  </div>
                )}

                {/* Ticket Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {mevTickets.map((ticket: any, idx: number) => {
                    const gradeColors: Record<string, string> = {
                      "S": "border-amber-400/40 bg-amber-500/10",
                      "A+": "border-emerald-400/40 bg-emerald-500/10",
                      "A": "border-sky-400/40 bg-sky-500/10",
                      "B": "border-purple-400/40 bg-purple-500/10"
                    };
                    const gradeTextColors: Record<string, string> = {
                      "S": "text-amber-300",
                      "A+": "text-emerald-300",
                      "A": "text-sky-300",
                      "B": "text-purple-300"
                    };
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border ${gradeColors[ticket.grade] || "border-white/10"} space-y-3 font-mono hover:scale-[1.02] transition-transform`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 border border-white/10 text-gray-300">
                            Line #{idx + 1}
                          </span>
                          <span className={`text-xs font-black ${gradeTextColors[ticket.grade] || "text-gray-400"}`}>
                            Grade {ticket.grade} (Score {ticket.mevScore})
                          </span>
                        </div>

                        {/* Ball Numbers (6 balls + Cash Ball) */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5 py-2">
                          {ticket.numbers.map((num: number, i: number) => (
                            <div
                              key={i}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                            >
                              {String(num).padStart(2, "0")}
                            </div>
                          ))}
                          <span className="text-gray-500 font-bold text-xs mx-0.5">+</span>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.4)] border border-emerald-300/40">
                            {String(ticket.bonusBall).padStart(2, "0")}
                          </div>
                        </div>

                        {/* Score Breakdown */}
                        <div className="space-y-1 text-xs border-t border-white/5 pt-2">
                          {[
                            { label: "Frequency", val: ticket.breakdown.frequencyScore, color: "bg-blue-400" },
                            { label: "Recency", val: ticket.breakdown.recencyScore, color: "bg-emerald-400" },
                            { label: "Companion", val: ticket.breakdown.companionScore, color: "bg-amber-400" },
                            { label: "Positional", val: ticket.breakdown.positionalScore, color: "bg-purple-400" },
                            { label: "Balance", val: ticket.breakdown.balanceScore, color: "bg-sky-400" },
                            { label: "Overdue", val: ticket.breakdown.overdueBoost, color: "bg-rose-400" }
                          ].map((metric) => (
                            <div key={metric.label} className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 shrink-0">{metric.label}</span>
                              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${metric.color} rounded-full transition-all duration-500`}
                                  style={{ width: `${Math.min(100, metric.val)}%` }}
                                />
                              </div>
                              <span className="text-gray-400 w-8 text-right">{metric.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-2">
                <Shield className="w-8 h-8 text-emerald-400/30 mx-auto" />
                <p className="text-xs font-mono text-gray-500">
                  Click <strong className="text-emerald-400">GENERATE OPTIMAL LINES</strong> to run the MEV engine against {stats?.totalDraws || 459}+ historical Win For Life draws.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Number Frequency Chart */}
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-base font-bold uppercase tracking-wider text-white font-mono">Main Pool Frequencies (1 to 28)</h3>
                <span className="text-xs text-gray-500 font-mono">Sorted highest to lowest</span>
              </div>
              <div className="h-64 w-full">
                {statsLoading ? (
                  <div className="w-full h-full bg-slate-900/30 animate-pulse rounded" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.frequencies || []} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
                      <XAxis dataKey="number" stroke="#6b7280" style={{ fontSize: "9px", fontFamily: "monospace" }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: "10px", fontFamily: "monospace" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px" }} />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Cash Ball Frequency Chart */}
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-base font-bold text-white font-sans">Cash Ball Frequencies (1 to 3)</h3>
                <span className="text-xs text-gray-500 font-mono">Draw Count</span>
              </div>
              <div className="h-64 w-full">
                {statsLoading ? (
                  <div className="w-full h-full bg-slate-900/30 animate-pulse rounded" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.cashBallFrequencies || []} margin={{ left: -20, right: 10, top: 10, bottom: 10 }}>
                      <XAxis dataKey="number" stroke="#6b7280" style={{ fontSize: "10px", fontFamily: "monospace" }} tickFormatter={(v) => `BALL ${v}`} />
                      <YAxis stroke="#6b7280" style={{ fontSize: "10px", fontFamily: "monospace" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px" }} />
                      <Bar dataKey="count" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* Overdue Gap Heatmap */}
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold uppercase tracking-wider text-white font-mono">Overdue Gap Analysis Heatmap</h3>
                <p className="text-xs text-gray-400 mt-0.5">Shows current draws elapsed since each number was last drawn. Red alerts indicate numbers highly overdue.</p>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-10 gap-3 font-mono">
              {Array.from({ length: 28 }).map((_, idx) => {
                const num = idx + 1;
                const gap = currentGaps[num];
                
                let alertColor = "border-slate-800 text-slate-400 bg-slate-950/20";
                if (gap >= 12) {
                  alertColor = "border-red-500/30 text-red-400 bg-red-500/10 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.2)]";
                } else if (gap >= 8) {
                  alertColor = "border-amber-500/30 text-amber-400 bg-amber-500/10";
                } else if (gap <= 2) {
                  alertColor = "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
                }

                return (
                  <div key={num} className={`border p-2.5 rounded-lg flex flex-col items-center justify-center transition ${alertColor}`}>
                    <span className="text-xs font-bold font-sans">#{String(num).padStart(2, "0")}</span>
                    <span className="text-xs font-mono tracking-widest mt-1 text-gray-500">
                      GAP: {gap === 999 ? "N/A" : gap}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Advanced Statistical Intelligence Panel ── */}
          {!statsLoading && stats?.advancedStats && (
            <div className="glass-panel p-6 rounded-xl space-y-5 border border-white/5 mt-6">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Eye className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white">Advanced Statistical Intelligence</h3>
                  <p className="text-xs text-gray-400">Recent trends, rebound signals, fairness check, randomness score, and simulations</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

                {/* EWMA Top Numbers */}
                <div className="bg-slate-950/60 rounded-xl p-4 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-sky-400">EWMA Top Numbers</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono leading-snug">Recent frequency bias (α=0.15, bi-weekly cadence).</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(stats.advancedStats.ewma?.mainNumbers || []).slice(0, 8).map((e: any) => (
                      <div key={e.number} className="flex flex-col items-center bg-sky-950/40 border border-sky-500/20 rounded-lg px-2 py-1.5 min-w-[34px]">
                        <span className="text-sm font-black font-mono text-sky-300">{String(e.number).padStart(2, "0")}</span>
                        <span className="text-xs font-mono text-sky-600">{e.ewmaScore?.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Z-Score Rebound Candidates */}
                <div className="bg-slate-950/60 rounded-xl p-4 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-emerald-400">RTM Rebound</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono leading-snug">Numbers statistically underrepresented (Z &lt; -1.5).</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(stats.advancedStats.zScores?.reboundCandidates || []).map((z: any) => (
                      <div key={z.number} className="flex flex-col items-center bg-emerald-950/40 border border-emerald-500/20 rounded-lg px-2 py-1.5 min-w-[34px]">
                        <span className="text-sm font-black font-mono text-emerald-300">{String(z.number).padStart(2, "0")}</span>
                        <span className="text-xs font-mono text-emerald-600">Z={z.zScore}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chi-Square + Entropy */}
                <div className="bg-slate-950/60 rounded-xl p-4 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stats.advancedStats.chiSquare?.mainNumbers?.isNonRandom ? "bg-amber-400" : "bg-slate-500"}`} />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-amber-400">Fairness and Randomness</span>
                  </div>
                  <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-bold font-mono ${
                    stats.advancedStats.chiSquare?.mainNumbers?.isNonRandom
                      ? "bg-amber-950/40 border-amber-500/30 text-amber-300"
                      : "bg-slate-900/40 border-white/5 text-gray-400"
                  }`}>
                    {stats.advancedStats.chiSquare?.mainNumbers?.isNonRandom ? "Non-Random Pattern" : "Uniform Distribution"}
                  </div>
                  {(() => {
                    const ratio = stats.advancedStats.entropy?.mainNumbers?.ratio || 0;
                    const pct = Math.round(ratio * 100);
                    const color = pct < 85 ? "#34d399" : pct > 95 ? "#f87171" : "#38bdf8";
                    return (
                      <>
                        <div className="relative h-2.5 rounded-full bg-slate-800 overflow-hidden mt-2">
                          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <p className="text-xs font-bold font-mono" style={{ color }}>
                          Entropy {pct}% — {stats.advancedStats.entropy?.mainNumbers?.signal?.toUpperCase()}
                        </p>
                      </>
                    );
                  })()}
                </div>

                {/* Monte Carlo */}
                <div className="bg-slate-950/60 rounded-xl p-4 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-xs font-bold font-mono uppercase tracking-widest text-violet-400">Monte Carlo</span>
                  </div>
                  <div className="bg-violet-950/30 border border-violet-500/20 rounded-lg px-3 py-2">
                    <p className="text-xs font-mono text-gray-400">Bayesian top-6 coverage</p>
                    <p className="text-2xl font-black font-mono text-violet-300">{stats.advancedStats.monteCarlo?.coveragePercent}%</p>
                    <p className="text-xs font-mono text-gray-500">in {(stats.advancedStats.monteCarlo?.simulations || 0).toLocaleString()} simulations</p>
                  </div>
                </div>
              </div>

              {/* Bayesian Top-8 */}
              <div className="space-y-2">
                <p className="text-xs font-mono uppercase tracking-widest text-gray-500">Bayesian Posterior Probability — Top 8 Main Numbers</p>
                <div className="flex flex-wrap gap-2">
                  {(stats.advancedStats.bayesian?.top10 || []).slice(0, 8).map((b: any, i: number) => (
                    <div key={b.number} className="flex items-center gap-1.5 bg-slate-900 border border-white/5 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs font-mono text-gray-500">#{i+1}</span>
                      <span className="text-sm font-black font-mono text-white">{String(b.number).padStart(2, "0")}</span>
                      <span className="text-xs font-mono text-emerald-400">{b.posteriorProb}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* SUBTAB: MATHEMATICAL ENGINE */}
      {subTab === "lucky7" && (
        <Lucky7EnginePanel game="win-for-life" />
      )}

      {subTab === "trevor" && (
        <TrevorEnginePanel game="win-for-life" />
      )}

      {subTab === "math-engine" && (
        <MultiBallMathPanel game="win-for-life" />
      )}

      {/* SUBTAB: SUM-28 QUANTITATIVE ENGINE */}
      {subTab === "diff-28" && (
        <div className="tab-content-enter">
          <WinForLifeDiff28Panel />
        </div>
      )}

      {/* SUBTAB: 100% INVARIANT QUANTITATIVE ENGINE */}
      {subTab === "quant-100" && (
        <div className="tab-content-enter">
          <WinForLifeQuant100Panel />
        </div>
      )}

      {/* SUBTAB: FORENSIC QUANTITATIVE ENGINE */}
      {subTab === "forensic" && (
        <div className="tab-content-enter">
          <WinForLifeForensicPanel />
        </div>
      )}

      {/* SUBTAB: HISTORY */}
      {subTab === "history" && (
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">Win for Life Draw Log</h3>
              <p className="text-xs text-gray-400 mt-1">Browse and filter NLCB Win for Life results history. Click any draw to inspect deep structural manifolds.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-900/80 p-0.5 rounded-lg border border-white/5 text-xs font-mono">
                {["All", "2025", "2024", "2023"].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setHistorySearch(chip === "All" ? "" : chip);
                      setHistoryPage(1);
                      triggerHaptic("selection");
                    }}
                    className={`px-2 py-1 rounded transition-all ${
                      (chip === "All" && historySearch === "") || historySearch === chip
                        ? "bg-emerald-500 text-slate-950 font-bold"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                placeholder="Search date..."
                className="bg-slate-950/70 border border-white/10 rounded px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono w-36"
              />
              <input
                type="number"
                value={historyFilterNum}
                onChange={(e) => { setHistoryFilterNum(e.target.value); setHistoryPage(1); }}
                placeholder="Filter ball..."
                className="bg-slate-950/70 border border-white/10 rounded px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono w-28"
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Main Table Column (2/3 when drawer active, full when inactive) */}
            <div className={`transition-all duration-300 ${selectedWflDraw ? "w-full lg:w-2/3" : "w-full"}`}>
              <div className="overflow-x-auto sleek-scrollbar border border-white/5 rounded-xl">
                <table className="w-full text-left border-collapse text-xs font-mono min-w-[520px]">
                  <thead className="sticky top-0 bg-slate-950/95 backdrop-blur-md z-10">
                    <tr className="border-b border-white/10 text-gray-500 uppercase tracking-widest text-xs">
                      <th className="py-3 px-4">Draw #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Winning Numbers (6 Balls)</th>
                      <th className="py-3 px-4 text-center">Cash Ball</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {historyLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td colSpan={5} className="py-4 px-4 bg-slate-900/10 h-8"></td>
                        </tr>
                      ))
                    ) : draws.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500 italic">No draws matched the query.</td>
                      </tr>
                    ) : (
                      draws.map((d) => {
                        const isSelected = selectedWflDraw?.draw_number === d.draw_number;
                        const nums = [d.num1, d.num2, d.num3, d.num4, d.num5, d.num6];
                        return (
                          <tr 
                            key={d.draw_number}
                            onClick={() => {
                              setSelectedWflDraw(isSelected ? null : d);
                              triggerHaptic("selection");
                            }}
                            className={`cursor-pointer transition-all duration-200 ${
                              isSelected 
                                ? "bg-emerald-500/15 border-l-4 border-l-emerald-400 text-white shadow-inner" 
                                : "hover:bg-white/[0.03] text-gray-300"
                            }`}
                          >
                            <td className="py-3 px-4 font-bold text-white">#{d.draw_number}</td>
                            <td className="py-3 px-4 text-gray-400">{d.draw_date}</td>
                            <td className="py-3 px-4">
                              <div className="flex gap-1.5 justify-center">
                                {nums.map((n, i) => (
                                  <span 
                                    key={i} 
                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-transform ${
                                      isSelected 
                                        ? "bg-emerald-400 text-slate-950 font-black shadow-[0_0_8px_rgba(52,211,153,0.5)] scale-105" 
                                        : "bg-slate-800 text-white border border-white/5"
                                    }`}
                                  >
                                    {n}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                                {d.cash_ball}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`text-xs uppercase font-bold px-2 py-1 rounded transition-colors ${
                                isSelected ? "bg-emerald-400/20 text-emerald-300" : "text-gray-500 hover:text-white"
                              }`}>
                                {isSelected ? "Selected" : "Inspect"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center border-t border-white/5 pt-4 text-xs mt-4">
                <button
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-slate-900 border border-white/5 rounded text-white disabled:opacity-50 hover:bg-slate-800 transition cursor-pointer font-mono"
                >
                  PREVIOUS
                </button>
                <span className="text-gray-500 font-mono">PAGE {historyPage} OF {historyPages}</span>
                <button
                  disabled={historyPage === historyPages}
                  onClick={() => setHistoryPage(p => Math.min(historyPages, p + 1))}
                  className="px-3 py-1 bg-slate-900 border border-white/5 rounded text-white disabled:opacity-50 hover:bg-slate-800 transition cursor-pointer font-mono"
                >
                  NEXT
                </button>
              </div>
            </div>

            {/* Split-View Investigation Panel (SaaS Drawer Pattern) */}
            {selectedWflDraw && (
              <div className="w-full lg:w-1/3 glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-slate-950/95 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 relative shadow-2xl shrink-0 font-mono">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-black uppercase text-white tracking-wider">
                        Win For Life Draw #{selectedWflDraw.draw_number}
                      </h4>
                      <span className="text-xs text-slate-400">
                        {selectedWflDraw.draw_date}, {selectedWflDraw.jackpot || "$20,000 per month for 20 years"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedWflDraw(null)}
                    className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition text-xs"
                    title="Close Investigation Panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quantitative Analysis */}
                {(() => {
                  const nums = [
                    selectedWflDraw.num1,
                    selectedWflDraw.num2,
                    selectedWflDraw.num3,
                    selectedWflDraw.num4,
                    selectedWflDraw.num5,
                    selectedWflDraw.num6
                  ].map(Number).sort((a, b) => a - b);
                  const sum = nums.reduce((a, b) => a + b, 0);
                  const isManifoldPassed = sum >= 60 && sum <= 114;
                  const oddsCount = nums.filter(n => n % 2 !== 0).length;
                  const evensCount = 6 - oddsCount;
                  const lowsCount = nums.filter(n => n <= 14).length;
                  const highsCount = 6 - lowsCount;
                  const spread = nums[5] - nums[0];
                  let consecutivePairs = 0;
                  for (let i = 0; i < 5; i++) {
                    if (nums[i + 1] === nums[i] + 1) consecutivePairs++;
                  }

                  return (
                    <div className="space-y-4">
                      {/* Balls Cluster */}
                      <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-2">
                        <span className="text-xs text-gray-400 uppercase tracking-widest block">6 Winning Balls + Cash Ball</span>
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {nums.map((n, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-200 font-black text-xs flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                              {n}
                            </div>
                          ))}
                          <span className="text-gray-400 font-bold mx-0.5">+</span>
                          <div className="w-8 h-8 rounded-full bg-emerald-600 border-2 border-emerald-300 text-white font-black text-xs flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.5)]" title="Cash Ball">
                            {selectedWflDraw.cash_ball}
                          </div>
                        </div>
                      </div>

                      {/* Manifold Diagnostics Grid */}
                      <div className="space-y-2">
                        <span className="text-xs text-gray-400 uppercase tracking-widest block">Structural Invariants</span>
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                            <span className="text-xs text-gray-500 block uppercase">Ball Sum</span>
                            <span className="text-base font-black text-emerald-300">{sum}</span>
                            <span className={`text-xs block mt-0.5 font-semibold ${isManifoldPassed ? "text-emerald-400" : "text-amber-400"}`}>
                              {isManifoldPassed ? "Typical Range (60 to 114)" : "Unusual Sum"}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                            <span className="text-xs text-slate-400 block">Odd and Even</span>
                            <span className="text-base font-bold text-cyan-300">{oddsCount} Odd, {evensCount} Even</span>
                            <span className="text-xs text-slate-400 block mt-0.5">{oddsCount === 3 ? "Even 3 and 3 Mix" : "Standard Mix"}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                            <span className="text-xs text-gray-500 block uppercase">High : Low</span>
                            <span className="text-base font-black text-purple-300">{highsCount}H : {lowsCount}L</span>
                            <span className="text-xs text-gray-400 block mt-0.5">Median Split at 14/15</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                            <span className="text-xs text-gray-500 block uppercase">Range Spread</span>
                            <span className="text-base font-black text-emerald-300">{spread}</span>
                            <span className="text-xs text-gray-400 block mt-0.5">Max ({nums[5]}) - Min ({nums[0]})</span>
                          </div>
                        </div>
                      </div>

                      {/* Consecutive & Cash Ball Info */}
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 uppercase text-xs">Consecutive Pairs:</span>
                          <span className={`text-xs font-bold ${consecutivePairs > 0 ? "text-emerald-400" : "text-gray-300"}`}>
                            {consecutivePairs === 0 ? "0 (Dispersed)" : `${consecutivePairs} Pair(s)`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 uppercase text-xs">Cash Ball Option:</span>
                          <span className="text-xs font-bold text-emerald-300">
                            Ball #{selectedWflDraw.cash_ball} (1 of 3)
                          </span>
                        </div>
                      </div>

                      {/* 1-Click Interactive Actions */}
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <button
                          onClick={() => {
                            setSelectedNums(nums);
                            setSelectedCb(Number(selectedWflDraw.cash_ball) || 1);
                            setSubTab("builder");
                            triggerHaptic("success");
                          }}
                          className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-bold tracking-wider uppercase transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Load Into Wheel Builder</span>
                        </button>
                        <button
                          onClick={() => {
                            setHoveredNode(nums[0]);
                            setSubTab("network");
                            triggerHaptic("selection");
                          }}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 text-gray-300 rounded-lg text-xs font-bold tracking-wider uppercase transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Explore Node #{nums[0]} In Network</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB: SUCCESSOR MATRIX */}
      {subTab === "network" && (
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">Successor Transition Network</h3>
            <p className="text-xs text-gray-400 mt-1">Select or hover a node to map which numbers statistically succeed it in subsequent drawings.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* SVG Circular Node Network Map (Col Span 7) */}
            <div className="lg:col-span-7 flex justify-center items-center select-none overflow-x-auto min-h-[450px]">
              <svg width="600" height="600" viewBox="0 0 780 780" className="max-w-full h-auto">
                <g>
                  {/* Central Node Display */}
                  <circle cx="390" cy="390" r="75" fill="#070a13" stroke="#1e293b" strokeWidth="2" />
                  {hoveredNode !== null ? (
                    (() => {
                      const count = stats?.frequencies?.find((f: any) => f.number === hoveredNode)?.count || 0;
                      return (
                        <>
                          <text x="390" y="360" textAnchor="middle" className="text-xs font-bold fill-primary font-mono uppercase tracking-widest">
                            SELECTED
                          </text>
                          <text x="390" y="395" textAnchor="middle" className="text-3xl font-black fill-white font-mono">
                            #{hoveredNode}
                          </text>
                          <text x="390" y="425" textAnchor="middle" className="text-xs fill-gray-400 font-mono">
                            FREQ: {count}x
                          </text>
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <text x="390" y="375" textAnchor="middle" className="text-xs font-extrabold fill-slate-500 font-mono uppercase tracking-wider animate-pulse">
                        HOVER NODE
                      </text>
                      <text x="390" y="405" textAnchor="middle" className="text-xs font-bold fill-white font-mono">
                        SUCCESSORS
                      </text>
                    </>
                  )}
                </g>

                {/* Circular Nodes */}
                {Array.from({ length: 28 }).map((_, idx) => {
                  const num = idx + 1;
                  const angle = ((num - 1) * 2 * Math.PI) / 28 - Math.PI / 2;
                  const coords = {
                    x: 390 + 280 * Math.cos(angle),
                    y: 390 + 280 * Math.sin(angle)
                  };
                  const isHovered = hoveredNode === num;
                  
                  // Check if this node is in the successor list of the hovered node
                  let isSuccessorOfHovered = false;
                  let isTopSuccessor = false;
                  if (hoveredNode !== null) {
                    const transitionsMatrix = stats?.transitions || {};
                    const targetsMap = transitionsMatrix[hoveredNode] || {};
                    const sortedTargets = Object.keys(targetsMap)
                      .map(Number)
                      .map(target => ({ target, count: targetsMap[target] }))
                      .filter(t => t.count > 0)
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 5);
                    
                    const foundIdx = sortedTargets.findIndex(t => t.target === num);
                    if (foundIdx !== -1) {
                      isSuccessorOfHovered = true;
                      isTopSuccessor = foundIdx === 0;
                    }
                  }

                  return (
                    <g 
                      key={num} 
                      className="cursor-pointer transition-all duration-300"
                      onMouseEnter={() => setHoveredNode(num)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <circle 
                        cx={coords.x} 
                        cy={coords.y} 
                        r={isHovered ? "22" : isSuccessorOfHovered ? "18" : "15"} 
                        fill={isHovered ? "#10b981" : isTopSuccessor ? "#10b981" : isSuccessorOfHovered ? "#059669" : "#0f172a"}
                        stroke={isHovered ? "#ffffff" : isSuccessorOfHovered ? "#34d399" : "#334155"}
                        strokeWidth={isHovered || isSuccessorOfHovered ? "2.5" : "1.5"}
                        className="transition-all duration-300 hover:scale-110"
                      />
                      <text 
                        x={coords.x} 
                        y={coords.y + 4.5} 
                        textAnchor="middle"
                        className={`text-xs font-bold font-mono ${isHovered || isSuccessorOfHovered ? "fill-slate-950" : "fill-white"}`}
                      >
                        {num}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Side Stats Card Listing (Col Span 5) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="glass-panel p-5 rounded-xl space-y-3 font-mono">
                <h4 className="text-xs font-bold uppercase text-gray-300 tracking-wider border-b border-white/5 pb-2">
                  {hoveredNode !== null ? `Top Successors of #${hoveredNode}` : "Hover Matrix Summary"}
                </h4>
                {hoveredNode !== null ? (
                  (() => {
                    const transitionsMatrix = stats?.transitions || {};
                    const targetsMap = transitionsMatrix[hoveredNode] || {};
                    const sortedTargets = Object.keys(targetsMap)
                      .map(Number)
                      .map(target => ({ target, count: targetsMap[target] }))
                      .filter(t => t.count > 0)
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 5);

                    if (sortedTargets.length === 0) {
                      return <p className="text-xs text-gray-500 italic">No transition records found for this node.</p>;
                    }

                    return (
                      <div className="space-y-2">
                        {sortedTargets.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-950/40 border border-white/5 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-sans">#{idx+1}</span>
                              <span className="w-5.5 h-5.5 bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                                {item.target}
                              </span>
                              <span className="text-gray-400 uppercase text-xs">Successor</span>
                            </div>
                            <span className="text-gray-400 font-bold">{item.count}x draws</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-xs text-gray-500 italic">Hover over any node in the transition wheel to inspect successor probabilities.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUBTAB: WHEELING WORKSPACE */}
      {subTab === "builder" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">Win for Life Wheeling Workspace</h3>
              <p className="text-xs text-gray-400 mt-1">Select a custom number pool and construct optimized betting combinations.</p>
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => handleQuickPick(8)} className="bg-slate-900 border border-white/5 hover:border-amber-400 hover:text-amber-400 text-slate-300 px-3 py-1.5 text-xs font-semibold font-mono cursor-pointer transition">QP 8</button>
              <button onClick={() => handleQuickPick(10)} className="bg-slate-900 border border-white/5 hover:border-amber-400 hover:text-amber-400 text-slate-300 px-3 py-1.5 text-xs font-semibold font-mono cursor-pointer transition">QP 10</button>
              <button onClick={handleClear} className="bg-slate-900 border border-white/5 hover:border-red-500 hover:text-red-500 text-slate-400 px-3 py-1.5 text-xs font-semibold font-mono cursor-pointer transition">RESET</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Pick Pool (Left Column) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="glass-panel p-6 rounded-xl space-y-6">
                
                {/* Pick Numbers */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white uppercase tracking-wider">Step 1: Pick Main Pool (1 to 28)</span>
                      <button
                        onClick={() => setShowHeatmapOverlay(!showHeatmapOverlay)}
                        className={`px-2 py-0.5 border text-xs font-bold uppercase transition cursor-pointer select-none ${
                          showHeatmapOverlay ? "bg-amber-400/10 border-amber-400/30 text-amber-400" : "bg-slate-950/40 border-white/5 text-gray-500"
                        }`}
                      >
                        Heatmap {showHeatmapOverlay ? "ON" : "OFF"}
                      </button>
                    </div>
                    <span className="text-slate-500 uppercase font-mono">Selected: {selectedNums.length}/12</span>
                  </div>

                  {showHeatmapOverlay && (
                    <div className="flex items-center gap-2 text-xs font-mono text-gray-500 uppercase pb-1 select-none">
                      <span>Heatmap Key:</span>
                      <span className="w-2 h-2 bg-slate-900 border border-white/5 inline-block" />
                      <span>Cold (Low Freq)</span>
                      <div className="w-10 h-1.5 bg-gradient-to-r from-slate-900 to-[#10b981] border border-white/5 inline-block" />
                      <span>Hot (High Freq)</span>
                      <span className="w-2 h-2 bg-[#10b981] inline-block" />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
                    {Array.from({ length: 28 }).map((_, idx) => {
                      const num = idx + 1;
                      const isSelected = selectedNums.includes(num);
                      
                      let bgStyle = {};
                      if (showHeatmapOverlay && !isSelected && stats?.frequencies) {
                        const freqEntry = stats.frequencies.find((f: any) => f.number === num);
                        const count = freqEntry ? freqEntry.count : 0;
                        const maxCount = stats.frequencies[0]?.count || 1;
                        const minCount = stats.frequencies[stats.frequencies.length - 1]?.count || 0;
                        const ratio = (count - minCount) / (maxCount - minCount || 1);
                        const ratioVal = Math.max(0, Math.min(1, ratio));
                        const r = Math.round(16 + (16 - 16) * ratioVal); // green theme
                        const g = Math.round(185 - (185 - 20) * (1 - ratioVal));
                        const b = Math.round(129 - (129 - 10) * (1 - ratioVal));
                        bgStyle = { 
                          backgroundColor: `rgba(${r}, ${g}, ${b}, ${0.15 + ratioVal * 0.85})`,
                          color: ratioVal > 0.65 ? "#0B0C0E" : "#94A3B8"
                        };
                      }

                      return (
                        <button
                          key={num}
                          onClick={() => toggleNumber(num)}
                          style={bgStyle}
                          className={`w-9 h-9 flex items-center justify-center font-bold text-xs border tracking-wider transition cursor-pointer ${
                            isSelected ? "bg-emerald-400 border-emerald-400 text-slate-950 font-black animate-pulse" : "bg-[#0B0C0E] border-[#1F232B] text-slate-400 hover:text-white"
                          }`}
                        >
                          {String(num).padStart(2, "0")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Choose Cash Ball */}
                <div className="space-y-3">
                  <span className="font-bold text-white uppercase tracking-wider text-xs block">Step 2: Choose Cash Ball (1 to 3)</span>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((num) => {
                      const isSelected = selectedCb === num;
                      return (
                        <button
                          key={num}
                          onClick={() => setSelectedCb(isSelected ? null : num)}
                          className={`w-12 h-10 flex items-center justify-center font-bold text-xs border tracking-wider transition cursor-pointer ${
                            isSelected ? "bg-emerald-555 border-emerald-555 text-slate-950 font-black animate-pulse" : "bg-[#0B0C0E] border-[#1F232B] text-slate-400 hover:text-white"
                          }`}
                        >
                          BALL {num}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Strategy picker */}
                {selectedNums.length >= 6 ? (
                  <div className="space-y-4 border-t border-white/5 pt-4">
                    <div className="space-y-1.5 font-mono">
                      <span className="text-xs text-slate-500 uppercase tracking-widest block font-bold">Step 3: Select Wheel Strategy</span>
                      <select
                        value={wheelStrategy}
                        onChange={(e) => setWheelStrategy(e.target.value as any)}
                        className="bg-slate-950 border border-white/10 text-xs text-white p-2 w-full focus:outline-none focus:border-emerald-400 rounded cursor-pointer"
                      >
                        <option value="abbreviated-5-5">Abbreviated "5-if-5" (Optimized budget slips)</option>
                        <option value="abbreviated-4-4">Abbreviated "4-if-4" (Super Budget Guarantee)</option>
                        <option value="full">Full Wheel (All combinations)</option>
                      </select>
                    </div>

                    <button
                      onClick={handleGenerateWheel}
                      disabled={wheelingLoading}
                      className="w-full py-2.5 bg-emerald-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase hover:bg-emerald-300 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      {wheelingLoading ? "COMPILING COMBINATIONS..." : "Compile Betting Slips"}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-gray-500 italic bg-[#0B0C0E] border border-[#1F232B] rounded">
                    Select a pool of 6 to 12 numbers to activate the Wheeling Engine.
                  </div>
                )}

              </div>
            </div>

            {/* Side Stats & Recommendations (Right Column) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Companions */}
              <div className="glass-panel p-5 rounded-xl space-y-3 font-mono">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-white/5 pb-2">Companion Mappings</h4>
                {companionNums.length > 0 ? (
                  <div className="space-y-2">
                    {companionNums.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-950/40 border border-white/5 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-sans">#{idx+1}</span>
                          <span className="w-5.5 h-5.5 bg-emerald-400/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            {item.num}
                          </span>
                          <span className="text-gray-400 uppercase text-xs">Companion</span>
                        </div>
                        <span className="text-gray-400">{item.count}x co-occurrences</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">Select numbers to compute companions dynamically.</p>
                )}
              </div>

            </div>

          </div>

          {/* Compiled slips stack */}
          {generatedTickets.length > 0 && (
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Compiled Combos ({generatedTickets.length})</h4>
                  <span className="text-emerald-400 font-mono text-xs bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded">
                    Total Stake: ${generatedTickets.length * 10} TT ($10/ticket)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setExportPayload({
                        slips: generatedTickets,
                        bonusBalls: generatedTickets.map((_, idx) => selectedCb || ((idx % 3) + 1)),
                        targetDrawNumber: championPick?.target_draw_number
                      });
                    }}
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print or Export</span>
                  </button>
                  <button type="button" onClick={handleSaveSlips} disabled={isSavingSlips} className="flex items-center gap-1.5 border border-white/10 hover:border-emerald-400 hover:text-emerald-400 text-slate-300 disabled:opacity-50 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer"><Save className="w-3 h-3" /> {isSavingSlips ? "SAVING..." : "SAVE SLIPS"}</button>
                  <button type="button" onClick={handleExportTxt} className="flex items-center gap-1.5 border border-white/10 hover:border-emerald-400 hover:text-emerald-400 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer"><Download className="w-3 h-3" /> EXPORT (.TXT)</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[360px] overflow-y-auto pr-1">
                {generatedTickets.map((ticket, idx) => {
                  const evalResult = validateTicket(ticket);
                  return (
                    <div key={idx} className="bg-slate-950/40 border border-white/5 hover:border-emerald-400/50 p-4 rounded-lg flex flex-col justify-between transition relative overflow-hidden select-none cursor-pointer">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <span className="text-xs text-gray-500 font-bold">SLIP #{String(idx+1).padStart(3, "0")}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-sm ${
                          evalResult.grade === "A+" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          GRADE: {evalResult.grade}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3">
                        <div className="flex gap-1.5">
                          {ticket.map((n, i) => (
                            <span key={i} className="w-6.5 h-6.5 bg-slate-900 border border-white/5 text-white flex items-center justify-center font-bold text-xs">
                              {n}
                            </span>
                          ))}
                        </div>
                        {selectedCb && (
                          <span className="w-6.5 h-6.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs ml-2">
                            {selectedCb}
                          </span>
                        )}
                      </div>
                      <div className="border-t border-dashed border-white/5 mt-3 pt-2 flex justify-between items-center text-xs text-slate-500 font-mono">
                        <div className="flex gap-2">
                          <span>O/E: {evalResult.oddEvenRatio}</span>
                          <span>H/L: {evalResult.highLowRatio}</span>
                          <span>SUM: {ticket.reduce((a, b) => a + b, 0)} ({evalResult.checks.sum ? "PASS" : "FAIL"})</span>
                        </div>
                        <span className="text-emerald-500 font-bold">ACTIVE FILTERED</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* SUBTAB: PREDICTIONS LOG */}
      {subTab === "predictions" && (
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">Win for Life Predictive Outcome Logs</h3>
              <p className="text-xs text-gray-400 mt-1">Verifies generated predictions against NLCB official drawings in real-time.</p>
            </div>
            
            {predictionsStats && (
              <div className="text-right font-mono">
                <span className="text-xs text-gray-500 uppercase block">Historical Success Rate</span>
                <span className="text-sm font-bold text-emerald-400">{predictionsStats.hitRate}% hits</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto sleek-scrollbar">
            <table className="w-full text-left border-collapse text-xs font-mono min-w-[620px]">
              <thead>
                <tr className="border-b border-white/10 text-gray-500 uppercase tracking-widest text-xs">
                  <th className="py-3 px-4">Prediction Date</th>
                  <th className="py-3 px-4">Forecasted Combo</th>
                  <th className="py-3 px-4">CB</th>
                  <th className="py-3 px-4">Winning Draw Results</th>
                  <th className="py-3 px-4">Matches</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {predictionsLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td colSpan={6} className="py-4 px-4 bg-slate-900/10 h-8"></td>
                    </tr>
                  ))
                ) : predictions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 italic">No prediction logs available. Sync database to calculate forecasting.</td>
                  </tr>
                ) : (
                  predictions.map((p) => {
                    const predNums = p.predicted_numbers.split(",").map(Number);
                    const drawNums = p.num1 ? [p.num1, p.num2, p.num3, p.num4, p.num5, p.num6] : null;
                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition">
                        <td className="py-3 px-4 font-bold text-white">{p.prediction_date}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            {predNums.map((n: number, i: number) => (
                              <span key={i} className={`w-5.5 h-5.5 rounded-sm flex items-center justify-center font-bold text-xs ${
                                drawNums && drawNums.includes(n) ? "bg-emerald-450 text-slate-950 font-black animate-pulse" : "bg-slate-900 border border-white/5 text-gray-400"
                              }`}>
                                {n}
                              </span>
                            ))}
                          </div>
                          
                          {p.status === "PENDING" && modelBreakdown && modelBreakdown.length > 0 && (
                            <div className="mt-3 space-y-2 min-w-[240px]">
                              <div className="text-xs font-bold font-mono text-gray-500 uppercase tracking-wider">Model Attribution</div>
                              {modelBreakdown.map((mbItem: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3">
                                  <span className="text-sm font-bold font-mono text-primary w-6">{String(mbItem.number).padStart(2, '0')}</span>
                                  <div className="flex-1">
                                    <div className="confidence-bar">
                                      <div 
                                        className={`confidence-bar-fill ${mbItem.confidence >= 60 ? 'confidence-high' : mbItem.confidence >= 40 ? 'confidence-medium' : 'confidence-low'}`}
                                        style={{ width: `${mbItem.confidence}%` }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-xs font-mono text-gray-400 w-8 text-right">{mbItem.confidence}%</span>
                                  <div className="flex gap-1 flex-wrap">
                                    {mbItem.models.map((m: string, mIdx: number) => (
                                      <span key={mIdx} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold whitespace-nowrap">{m}</span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`w-5.5 h-5.5 rounded-sm flex items-center justify-center font-bold text-xs ${
                            p.winning_cash_ball && p.winning_cash_ball === p.predicted_cash_ball ? "bg-emerald-500 text-slate-950 font-black animate-pulse" : "bg-slate-900 border border-white/5 text-gray-400"
                          }`}>
                            {p.predicted_cash_ball}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {drawNums ? (
                            <div className="flex gap-1 items-center">
                              <span className="text-xs text-gray-500 mr-1.5 font-bold">#{p.winning_draw_number}</span>
                              {drawNums.map((n: number, i: number) => (
                                <span key={i} className="w-5.5 h-5.5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                                  {n}
                                </span>
                              ))}
                              <span className="text-gray-500 mx-1 font-bold">|</span>
                              <span className="w-5.5 h-5.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
                                {p.winning_cash_ball}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">Drawing Pending...</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {p.matching_count !== null ? p.matching_count + " + " + (p.cash_ball_matched ? "CB" : "0") : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            p.status === "HIT" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse" :
                            p.status === "MISS" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB: EXPLAIN */}
      {subTab === "explain" && (
        <div className="space-y-6 font-sans">
          <div className="glass-panel p-6 rounded-2xl space-y-5">
            <div className="border-b border-white/5 pb-3 space-y-1">
              <h3 className="text-base font-bold text-white">How Ticket Coverage Works in Win For Life (6 of 28)</h3>
              <p className="text-sm text-slate-300">Balanced sum ranges, non-overlapping 10-line sets covering all 28 numbers, and balanced Cash Ball coverage across 1, 2, and 3.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm text-slate-300 leading-relaxed">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-emerald-400 mb-1">1. Balanced Sum Range (66 to 111)</h4>
                  <p>
                    Out of 376,740 possible 6-number combinations (times 3 Cash Balls = 1,130,220 grand prize combinations), generated lines stay inside the typical <strong className="text-white">66 to 111</strong> sum range with a balanced odd-and-even and low-and-high mix.
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-400 mb-1">2. Four Tracked Models</h4>
                  <p>
                    Every Tuesday and Friday draw is graded across 4 models in the <strong className="text-white">Engines</strong> tab so you can inspect verified past results before choosing numbers.
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-400 mb-1">3. 10-Line Non-Overlapping Coverage</h4>
                  <p>
                    A 10-line non-overlapping set covers all 28 numbers with at most 1 shared number between any two lines, reaching a <strong className="text-white">72.13% chance</strong> of matching 3 or more numbers across all 3 Cash Balls (1, 2, and 3).
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-sky-400 mb-1">4. Cash Ball Coverage (1, 2, and 3)</h4>
                  <p>
                    Win For Life uses 3 Cash Balls (1, 2, and 3). Spreading your lines evenly across 1, 2, and 3 covers every Cash Ball while keeping every main 6-number combination distinct.
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">5. Real-Time Ticket OCR &amp; Auto-Grading</h4>
                  <p>
                    Computer-vision ticket scanning verifies physical slips against official draws, while background sync jobs reconcile NLCB Win For Life results and update Bayesian sub-model weights automatically.
                  </p>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-lg border border-white/5">
                  <div className="text-xs font-bold uppercase tracking-wider mb-1 text-emerald-400">Winning Strategy Tip</div>
                  <p className="text-xs text-gray-300">
                    Check the <strong>ENGINE TRACKER</strong> tab before playing to see which engine currently holds the #1 merit rank for Win For Life and whether the chamber is in a <strong>BALANCED</strong> or <strong>HIGH ENTROPY</strong> regime.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {exportPayload && (
        <BetSlipExportModal
          isOpen={true}
          onClose={() => setExportPayload(null)}
          gameKey="win-for-life"
          gameName="Win For Life"
          targetDrawNumber={exportPayload.targetDrawNumber}
          slips={exportPayload.slips}
          bonusBalls={exportPayload.bonusBalls}
          unitCostTT={10}
        />
      )}
    </div>
  );
}
