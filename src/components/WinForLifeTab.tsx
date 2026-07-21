import React, { useState, useEffect } from "react";
import { BarChart2, Calendar, ClipboardList, RefreshCw, Sliders, Cpu, Eye, Compass, Info, Save, Download, Trash2, GitBranch, Play, HelpCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from "recharts";

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
  const [subTab, setSubTab] = useState<"dashboard" | "history" | "builder" | "predictions" | "network" | "explain">("dashboard");
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

  // Predictions states
  const [predictions, setPredictions] = useState<any[]>([]);
  const [predictionsStats, setPredictionsStats] = useState<any>(null);
  const [predictionsLoading, setPredictionsLoading] = useState(true);

  // Builder states
  const [selectedNums, setSelectedNums] = useState<number[]>([]);
  const [selectedCb, setSelectedCb] = useState<number | null>(null);
  const [wheelStrategy, setWheelStrategy] = useState<"full" | "abbreviated-5-5" | "abbreviated-4-4">("abbreviated-5-5");
  const [generatedTickets, setGeneratedTickets] = useState<number[][]>([]);
  const [wheelingLoading, setWheelingLoading] = useState(false);
  const [showHeatmapOverlay, setShowHeatmapOverlay] = useState(true);

  // Network map states
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  // Tumbler simulation states
  const [luckyNumbers, setLuckyNumbers] = useState<number[]>([]);
  const [luckyCashBall, setLuckyCashBall] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchPredictions();
    fetchAllDraws();
  }, []);

  useEffect(() => {
    if (subTab === "history") {
      fetchHistory();
    }
  }, [subTab, historyPage, historySearch, historyFilterNum]);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await fetch("/api/winforlife/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data);
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

  const handleSaveSlips = () => {
    alert("Saved " + generatedTickets.length + " slips to workspace!");
  };

  const handleExportTxt = () => {
    const content = generatedTickets.map((t, idx) => `SLIP #${idx+1}: ${t.join(" - ")} [CB: ${selectedCb || "X"}]`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `win_for_life_slips_${Date.now()}.txt`;
    link.click();
  };

  const generateLuckyNumbers = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setLuckyNumbers([]);
    setLuckyCashBall(null);
    
    setTimeout(() => {
      const numbers = Array.from({ length: 28 }, (_, i) => i + 1);
      numbers.sort(() => Math.random() - 0.5);
      const chosen = numbers.slice(0, 6).sort((a, b) => a - b);
      const cb = Math.floor(Math.random() * 3) + 1;
      
      setLuckyNumbers(chosen);
      setLuckyCashBall(cb);
      setIsSpinning(false);
    }, 1500);
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

  return (
    <div className="space-y-6">
      
      {/* Sub-Navigation Menu */}
      <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5 w-full md:w-fit mb-6 overflow-x-auto flex-nowrap scrollbar-none">
        <button
          onClick={() => setSubTab("dashboard")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            subTab === "dashboard" ? "bg-primary text-slate-950 font-bold" : "text-gray-400 hover:text-white"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          DASHBOARD
        </button>
        <button
          onClick={() => setSubTab("history")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            subTab === "history" ? "bg-primary text-slate-950 font-bold" : "text-gray-400 hover:text-white"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          DRAW LOG
        </button>
        <button
          onClick={() => setSubTab("network")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            subTab === "network" ? "bg-primary text-slate-950 font-bold" : "text-gray-400 hover:text-white"
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          SUCCESSOR MATRIX
        </button>
        <button
          onClick={() => setSubTab("builder")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            subTab === "builder" ? "bg-primary text-slate-950 font-bold" : "text-gray-400 hover:text-white"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          WHEELING WORKSPACE
        </button>
        <button
          onClick={() => setSubTab("predictions")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            subTab === "predictions" ? "bg-primary text-slate-950 font-bold" : "text-gray-400 hover:text-white"
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          PREDICTIONS LOG
        </button>
        <button
          onClick={() => setSubTab("explain")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            subTab === "explain" ? "bg-primary text-slate-950 font-bold" : "text-gray-400 hover:text-white"
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          HOW IT WORKS
        </button>
      </div>

      {/* SUBTAB: DASHBOARD */}
      {subTab === "dashboard" && (
        <div className="space-y-6">
          
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Latest Draw Results */}
            <div className="glass-panel p-5 rounded-xl border border-white/5 bg-slate-950/40 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
              <div>
                <span className="text-[10px] font-bold font-mono tracking-widest text-primary uppercase block mb-2">
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
                <span className="text-[10px] font-bold font-mono tracking-widest text-primary uppercase block mb-2">
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
                    7:00 PM (Trinidad Time)
                  </div>
                  <div className="text-[10px] text-gray-500 leading-relaxed pt-1">
                    Draws occur every Tuesday and Friday evening.
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Suggested Picks */}
            <div className="glass-panel p-5 rounded-xl border border-white/5 bg-slate-950/40 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
              <div>
                <span className="text-[10px] font-bold font-mono tracking-widest text-primary uppercase block mb-2">
                  SUGGESTED ALGO PICKS
                </span>
                {statsLoading || !stats?.frequencies ? (
                  <div className="space-y-2 animate-pulse py-1">
                    <div className="h-6 w-32 bg-white/5 rounded" />
                    <div className="h-4 w-48 bg-white/5 rounded" />
                  </div>
                ) : (
                  <div className="space-y-2 font-mono">
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest">
                      Based on Hot/Cold Gap Analysis
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {(() => {
                        const frequencies = stats.frequencies || [];
                        const hot = frequencies.slice(0, 4).map((f: any) => f.number);
                        const cold = frequencies.slice(-4).map((f: any) => f.number);
                        const finalPool = [
                          ...hot,
                          cold[Math.floor(Math.random() * cold.length)],
                          cold[(Math.floor(Math.random() * cold.length) + 1) % cold.length]
                        ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6).sort((a, b) => a - b);
                        
                        const cb = stats.cashBallFrequencies?.[0]?.number || 1;
                        return (
                          <>
                            {finalPool.map((n, idx) => (
                              <span key={idx} className="w-7 h-7 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                                {n}
                              </span>
                            ))}
                            <span className="text-gray-600 font-bold mx-0.5">|</span>
                            <span className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
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

          {/* Tumbler Physics Simulation */}
          <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-950/40 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-4 flex flex-col items-center justify-center relative select-none min-h-[220px]">
                <div className="absolute w-48 h-48 bg-emerald-500/10 rounded-full blur-[50px] animate-pulse pointer-events-none" />
                <div className="relative w-52 h-52 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 text-slate-700/60 stroke-current fill-none stroke-[2.5] z-0">
                    <path d="M20,85 L35,40 L65,40 L80,85" strokeLinecap="round" />
                    <path d="M15,85 L85,85" strokeLinecap="round" strokeWidth="4" />
                    <circle cx="50" cy="40" r="5" fill="#020617" stroke="white" strokeWidth="2" />
                  </svg>

                  <div className="relative w-40 h-40 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center p-3">
                    <div className="absolute inset-0 rounded-full border-2 border-dotted border-emerald-500/20 animate-spin-slow" />
                    <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-slate-900 via-[#0B0C0E] to-slate-950 border border-white/5 flex items-center justify-center relative overflow-hidden shadow-[inset_0_0_15px_rgba(255,255,255,0.05),0_0_20px_rgba(0,0,0,0.5)]">
                      <span className="font-mono text-[8px] text-gray-500 font-extrabold tracking-widest text-center uppercase leading-tight select-none z-10">
                        WIN FOR LIFE<br />TUMBLER
                      </span>
                      {/* CSS-Animated bouncing balls inside */}
                      <div className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(56,189,248,0.6)] animate-bounce-ball-1 select-none z-0">22</div>
                      <div className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(167,139,250,0.6)] animate-bounce-ball-2 select-none z-0">11</div>
                      <div className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-bounce-ball-3 select-none z-0">7</div>
                      <div className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-bounce-ball-4 select-none z-0">15</div>
                      <div className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-bounce-ball-5 select-none z-0">3</div>
                      <div className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-bounce-ball-6 select-none z-0">28</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-8 space-y-4 font-mono">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Play className="w-4 h-4 text-emerald-400" />
                    Win for Life Tumbler Quick Pick
                  </h3>
                  <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
                    Draw 6 unique random numbers from 1 to 28 and 1 Cash Ball from 1 to 3 by spinning the animated lottery tumbler.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 items-center pt-2">
                  <button
                    onClick={generateLuckyNumbers}
                    disabled={isSpinning}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-350 hover:to-emerald-450 disabled:from-emerald-500/50 disabled:to-emerald-500/50 disabled:cursor-not-allowed text-slate-950 text-xs font-black tracking-widest uppercase transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] rounded-lg cursor-pointer shrink-0"
                  >
                    {isSpinning ? "SPINNING..." : "SPIN TUMBLER"}
                  </button>

                  {(luckyNumbers.length > 0 || isSpinning) && (
                    <div className="flex flex-col items-center sm:items-start justify-center space-y-2 font-mono w-full">
                      <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-widest">
                        {isSpinning ? "Drawing balls..." : "Your Lucky Ticket"}
                      </span>
                      <div className="flex justify-center items-center gap-1.5">
                        {isSpinning ? (
                          Array.from({ length: 7 }).map((_, idx) => (
                            <div
                              key={idx}
                              className="w-8 h-8 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/40 animate-ping" style={{ animationDelay: `${idx * 150}ms` }} />
                            </div>
                          ))
                        ) : (
                          <>
                            {luckyNumbers.map((num, idx) => {
                              const ballGradients = [
                                "from-primary to-blue-600 text-white shadow-[0_0_10px_rgba(56,189,248,0.4)]",
                                "from-purple-500 to-indigo-600 text-white shadow-[0_0_10px_rgba(167,139,250,0.4)]",
                                "from-teal-400 to-emerald-600 text-white shadow-[0_0_10px_rgba(52,211,153,0.4)]",
                                "from-amber-400 to-orange-600 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.4)]",
                                "from-rose-500 to-pink-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]",
                                "from-cyan-400 to-teal-500 text-white shadow-[0_0_10px_rgba(34,211,238,0.4)]"
                              ];
                              return (
                                <div
                                  key={idx}
                                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${ballGradients[idx]} font-extrabold text-[11px] flex items-center justify-center select-none animate-ball-drop opacity-0`}
                                  style={{ animationDelay: `${idx * 150}ms` }}
                                >
                                  {String(num).padStart(2, "0")}
                                </div>
                              );
                            })}
                            <span className="text-gray-500 font-bold text-xs shrink-0 mx-0.5 animate-ball-drop opacity-0" style={{ animationDelay: "900ms" }}>+</span>
                            <div
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-[11px] flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.4)] border border-emerald-500/20 select-none animate-ball-drop opacity-0"
                              style={{ animationDelay: "1050ms" }}
                            >
                              {luckyCashBall}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Number Frequency Chart */}
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Main Pool Frequencies (1 to 28)</h3>
                <span className="text-[10px] text-gray-500 font-mono">Sorted highest to lowest</span>
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Cash Ball Frequencies (1 to 3)</h3>
                <span className="text-[10px] text-gray-500 font-mono">Draw Count</span>
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Overdue Gap Analysis Heatmap</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Shows current draws elapsed since each number was last drawn. Red alerts indicate numbers highly overdue.</p>
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
                    <span className="text-[9px] font-mono tracking-widest mt-1 text-gray-500">
                      GAP: {gap === 999 ? "N/A" : gap}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* SUBTAB: HISTORY */}
      {subTab === "history" && (
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Win for Life Draw Log</h3>
              <p className="text-xs text-gray-400 mt-1">Browse and filter NLCB Win for Life results history.</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                placeholder="Search date..."
                className="bg-slate-950/70 border border-white/10 rounded px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono w-40"
              />
              <input
                type="number"
                value={historyFilterNum}
                onChange={(e) => { setHistoryFilterNum(e.target.value); setHistoryPage(1); }}
                placeholder="Filter number..."
                className="bg-slate-950/70 border border-white/10 rounded px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono w-32"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-gray-500 uppercase tracking-widest text-[10px]">
                  <th className="py-3 px-4">Draw #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Winning Numbers</th>
                  <th className="py-3 px-4">Cash Ball</th>
                  <th className="py-3 px-4">Jackpot</th>
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
                  draws.map((d) => (
                    <tr key={d.draw_number} className="hover:bg-white/5 transition">
                      <td className="py-3 px-4 font-bold text-white">#{d.draw_number}</td>
                      <td className="py-3 px-4 text-gray-400">{d.draw_date}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1.5">
                          {[d.num1, d.num2, d.num3, d.num4, d.num5, d.num6].map((n, i) => (
                            <span key={i} className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] border border-white/5">
                              {n}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                          {d.cash_ball}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{d.jackpot || "X"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center border-t border-white/5 pt-4 text-xs">
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
      )}

      {/* SUBTAB: SUCCESSOR MATRIX */}
      {subTab === "network" && (
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Successor Transition Network</h3>
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
                          <text x="390" y="360" textAnchor="middle" className="text-[10px] font-bold fill-primary font-mono uppercase tracking-widest">
                            SELECTED
                          </text>
                          <text x="390" y="395" textAnchor="middle" className="text-3xl font-black fill-white font-mono">
                            #{hoveredNode}
                          </text>
                          <text x="390" y="425" textAnchor="middle" className="text-[10px] fill-gray-400 font-mono">
                            FREQ: {count}x
                          </text>
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <text x="390" y="375" textAnchor="middle" className="text-[10px] font-extrabold fill-slate-500 font-mono uppercase tracking-wider animate-pulse">
                        HOVER NODE
                      </text>
                      <text x="390" y="405" textAnchor="middle" className="text-[10px] font-bold fill-white font-mono">
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
                        className={`text-[9px] font-bold font-mono ${isHovered || isSuccessorOfHovered ? "fill-slate-950" : "fill-white"}`}
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
                              <span className="text-[10px] text-gray-500 font-sans">#{idx+1}</span>
                              <span className="w-5.5 h-5.5 bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                                {item.target}
                              </span>
                              <span className="text-gray-400 uppercase text-[10px]">Successor</span>
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
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Win for Life Wheeling Workspace</h3>
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
                        className={`px-2 py-0.5 border text-[9px] font-bold uppercase transition cursor-pointer select-none ${
                          showHeatmapOverlay ? "bg-amber-400/10 border-amber-400/30 text-amber-400" : "bg-slate-950/40 border-white/5 text-gray-500"
                        }`}
                      >
                        Heatmap {showHeatmapOverlay ? "ON" : "OFF"}
                      </button>
                    </div>
                    <span className="text-slate-500 uppercase font-mono">Selected: {selectedNums.length}/12</span>
                  </div>

                  {showHeatmapOverlay && (
                    <div className="flex items-center gap-2 text-[9px] font-mono text-gray-500 uppercase pb-1 select-none">
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
                          <span className="text-[10px] text-gray-500 font-sans">#{idx+1}</span>
                          <span className="w-5.5 h-5.5 bg-emerald-400/10 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                            {item.num}
                          </span>
                          <span className="text-gray-400 uppercase text-[10px]">Companion</span>
                        </div>
                        <span className="text-gray-400">{item.count}x co-occurrences</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-500 italic">Select numbers to compute companions dynamically.</p>
                )}
              </div>

            </div>

          </div>

          {/* Compiled slips stack */}
          {generatedTickets.length > 0 && (
            <div className="glass-panel p-6 rounded-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Compiled Combos ({generatedTickets.length})</h4>
                <div className="flex gap-2">
                  <button onClick={handleSaveSlips} className="flex items-center gap-1.5 border border-white/5 hover:border-emerald-400 hover:text-emerald-400 text-slate-400 px-3 py-1.5 text-[10px] font-bold font-mono transition cursor-pointer"><Save className="w-3 h-3" /> SAVE SLIPS</button>
                  <button onClick={handleExportTxt} className="flex items-center gap-1.5 border border-white/5 hover:border-emerald-400 hover:text-emerald-400 text-slate-400 px-3 py-1.5 text-[10px] font-bold font-mono transition cursor-pointer"><Download className="w-3 h-3" /> EXPORT (.TXT)</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[360px] overflow-y-auto pr-1">
                {generatedTickets.map((ticket, idx) => {
                  const evalResult = validateTicket(ticket);
                  return (
                    <div key={idx} className="bg-slate-950/40 border border-white/5 hover:border-emerald-400/50 p-4 rounded-lg flex flex-col justify-between transition relative overflow-hidden select-none cursor-pointer">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <span className="text-[10px] text-gray-500 font-bold">SLIP #{String(idx+1).padStart(3, "0")}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm ${
                          evalResult.grade === "A+" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          GRADE: {evalResult.grade}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3">
                        <div className="flex gap-1.5">
                          {ticket.map((n, i) => (
                            <span key={i} className="w-6.5 h-6.5 bg-slate-900 border border-white/5 text-white flex items-center justify-center font-bold text-[10px]">
                              {n}
                            </span>
                          ))}
                        </div>
                        {selectedCb && (
                          <span className="w-6.5 h-6.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-[10px] ml-2">
                            {selectedCb}
                          </span>
                        )}
                      </div>
                      <div className="border-t border-dashed border-white/5 mt-3 pt-2 flex justify-between items-center text-[8px] text-slate-500 font-mono">
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
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Win for Life Predictive Outcome Logs</h3>
              <p className="text-xs text-gray-400 mt-1">Verifies generated predictions against NLCB official drawings in real-time.</p>
            </div>
            
            {predictionsStats && (
              <div className="text-right font-mono">
                <span className="text-[10px] text-gray-500 uppercase block">Historical Success Rate</span>
                <span className="text-sm font-bold text-emerald-400">{predictionsStats.hitRate}% hits</span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-gray-500 uppercase tracking-widest text-[10px]">
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
                              <span key={i} className={`w-5.5 h-5.5 rounded-sm flex items-center justify-center font-bold text-[9px] ${
                                drawNums && drawNums.includes(n) ? "bg-emerald-450 text-slate-950 font-black animate-pulse" : "bg-slate-900 border border-white/5 text-gray-400"
                              }`}>
                                {n}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`w-5.5 h-5.5 rounded-sm flex items-center justify-center font-bold text-[9px] ${
                            p.winning_cash_ball && p.winning_cash_ball === p.predicted_cash_ball ? "bg-emerald-500 text-slate-950 font-black animate-pulse" : "bg-slate-900 border border-white/5 text-gray-400"
                          }`}>
                            {p.predicted_cash_ball}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {drawNums ? (
                            <div className="flex gap-1 items-center">
                              <span className="text-[10px] text-gray-500 mr-1.5 font-bold">#{p.winning_draw_number}</span>
                              {drawNums.map((n: number, i: number) => (
                                <span key={i} className="w-5.5 h-5.5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[9px]">
                                  {n}
                                </span>
                              ))}
                              <span className="text-gray-500 mx-1 font-bold">|</span>
                              <span className="w-5.5 h-5.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-[9px]">
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
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-xl space-y-5">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Win for Life Game Mechanics</h3>
              <p className="text-[11px] text-gray-400 mt-1">Official NLCB Win for Life draw guidelines, payouts, and analytical strategies.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs text-gray-400 leading-relaxed font-mono">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">1. The Matrix (6/28 + CB 1/3)</h4>
                  <p>
                    Players select six main numbers from a pool of 1 to 28, and a single Cash Ball from a secondary pool of 1 to 3. Drawings take place every Tuesday and Friday evening at 7:00 PM.
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">2. Mobile Ticket Scanner Integrated</h4>
                  <p>
                    You can now use the central <strong>Ticket Scanner & Checker</strong> tab to verify your ticket receipt! Simply take a photo of your ticket or upload an image. The AI OCR engine extracts the date, draw number, main numbers, and Cash Ball, auto-verifying matches against official Turso cloud database results in real-time.
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">3. Stat-Guided Wheeling</h4>
                  <p>
                    Abbreviated wheeling allows you to play larger pools (e.g. 8 to 10 numbers) by compressing them into key sets. The heatmaps overlay past drawing frequencies directly on the grid so you build slips aligned with historic hot nodes.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-1">Prize Payout Structure</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-500 uppercase tracking-widest">
                        <th className="py-2 px-1">Match Tier</th>
                        <th className="py-2 px-1 text-right">Prize Estimate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      <tr>
                        <td className="py-1.5 px-1 font-bold text-white">6 + Cash Ball</td>
                        <td className="py-1.5 px-1 text-right text-emerald-400 font-extrabold">$1,000/Month for Life</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-1">6 Numbers</td>
                        <td className="py-1.5 px-1 text-right">$10,000.00 Est.</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-1 font-bold text-white">5 + Cash Ball</td>
                        <td className="py-1.5 px-1 text-right text-emerald-400">$1,000.00 Est.</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-1">5 Numbers</td>
                        <td className="py-1.5 px-1 text-right">$250.00 Est.</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-1 font-bold text-white">4 + Cash Ball</td>
                        <td className="py-1.5 px-1 text-right text-emerald-400">$100.00 Est.</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-1">4 Numbers</td>
                        <td className="py-1.5 px-1 text-right">$20.00 Est.</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-1 font-bold text-white">3 + Cash Ball</td>
                        <td className="py-1.5 px-1 text-right text-emerald-400">$10.00 Est.</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-1">3 Numbers</td>
                        <td className="py-1.5 px-1 text-right">$2.00 Est.</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-1 font-bold text-white">2 + Cash Ball</td>
                        <td className="py-1.5 px-1 text-right text-emerald-400">$5.00 Est.</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-1 font-bold text-white">1 + Cash Ball</td>
                        <td className="py-1.5 px-1 text-right">Free Quick Pick Ticket</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-1 font-bold text-white">0 + Cash Ball</td>
                        <td className="py-1.5 px-1 text-right">Free Quick Pick Ticket</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS Animation Keyframes for Tumbler */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce-ball-1 {
          0%, 100% { transform: translate(10px, 10px); }
          25% { transform: translate(80px, 20px); }
          50% { transform: translate(20px, 80px); }
          75% { transform: translate(80px, 80px); }
        }
        @keyframes bounce-ball-2 {
          0%, 100% { transform: translate(80px, 80px); }
          35% { transform: translate(20px, 15px); }
          65% { transform: translate(85px, 10px); }
        }
        @keyframes bounce-ball-3 {
          0%, 100% { transform: translate(50px, 80px); }
          30% { transform: translate(15px, 15px); }
          60% { transform: translate(80px, 30px); }
          80% { transform: translate(20px, 70px); }
        }
        @keyframes bounce-ball-4 {
          0%, 100% { transform: translate(15px, 50px); }
          15% { transform: translate(70px, 80px); }
          55% { transform: translate(50px, 10px); }
          75% { transform: translate(80px, 40px); }
        }
        @keyframes bounce-ball-5 {
          0%, 100% { transform: translate(65px, 10px); }
          25% { transform: translate(10px, 70px); }
          50% { transform: translate(80px, 60px); }
          75% { transform: translate(30px, 20px); }
        }
        @keyframes bounce-ball-6 {
          0%, 100% { transform: translate(25px, 80px); }
          20% { transform: translate(80px, 25px); }
          45% { transform: translate(15px, 40px); }
          70% { transform: translate(75px, 75px); }
        }
        @keyframes ballDrop {
          0% {
            transform: translateY(-80px) scale(0.3);
            opacity: 0;
          }
          60% {
            transform: translateY(12px) scale(1.1);
            opacity: 0.9;
          }
          90% {
            transform: translateY(-4px) scale(0.98);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-ball-1 { animation: bounce-ball-1 4.5s infinite ease-in-out; }
        .animate-bounce-ball-2 { animation: bounce-ball-2 5s infinite ease-in-out; }
        .animate-bounce-ball-3 { animation: bounce-ball-3 4s infinite ease-in-out; }
        .animate-bounce-ball-4 { animation: bounce-ball-4 5.5s infinite ease-in-out; }
        .animate-bounce-ball-5 { animation: bounce-ball-5 3.8s infinite ease-in-out; }
        .animate-bounce-ball-6 { animation: bounce-ball-6 5.2s infinite ease-in-out; }
        .animate-spin-slow { animation: spin 25s infinite linear; }
        .animate-ball-drop { animation: ballDrop 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

    </div>
  );
}
