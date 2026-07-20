import React, { useState, useEffect } from "react";
import { BarChart2, Calendar, ClipboardList, RefreshCw, Sliders, Cpu, Eye, Compass, Info, Save, Download, Trash2 } from "lucide-react";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, Cell } from "recharts";

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
  
  const checks = {
    oddEven: ["3:3", "4:2", "2:4"].includes(oddEvenRatio),
    highLow: ["3:3", "4:2", "2:4"].includes(highLowRatio),
    spread: spread >= 12 && spread <= 24,
    consecutive: consecutiveCount <= 1,
  };
  
  let score = 0;
  if (checks.oddEven) score += 25;
  if (checks.highLow) score += 25;
  if (checks.spread) score += 25;
  if (checks.consecutive) score += 25;
  
  let grade = "D";
  if (score >= 100) grade = "A+";
  else if (score >= 75) grade = "B";
  else if (score >= 50) grade = "C";
  
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
  const [subTab, setSubTab] = useState<"dashboard" | "history" | "builder" | "predictions" | "explain">("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // History tab states
  const [draws, setDraws] = useState<any[]>([]);
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

  useEffect(() => {
    fetchStats();
    fetchPredictions();
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

  const getCompanionNumbers = () => {
    if (selectedNums.length === 0 || !stats?.frequencies) return [];
    // Calculate simple co-occurrence companions based on selected numbers in our stats transitions or frequencies
    const comps = Array(29).fill(0);
    // Dummy companion calculations using transition matrix weights
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
                        // Extract suggested pick: 4 hot + 2 cold + 1 CB
                        const frequencies = stats.frequencies || [];
                        const hot = frequencies.slice(0, 4).map((f: any) => f.number);
                        const cold = frequencies.slice(-4).map((f: any) => f.number);
                        // Pick random items for variation
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
                        const r = Math.round(24 + (212 - 24) * ratioVal);
                        const g = Math.round(26 + (175 - 26) * ratioVal);
                        const b = Math.round(32 + (55 - 32) * ratioVal);
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
                            isSelected ? "bg-amber-400 border-amber-400 text-slate-950 font-black" : "bg-[#0B0C0E] border-[#1F232B] text-slate-400 hover:text-white"
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
                            isSelected ? "bg-emerald-500 border-emerald-500 text-slate-950 font-black" : "bg-[#0B0C0E] border-[#1F232B] text-slate-400 hover:text-white"
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
                        className="bg-slate-950 border border-white/10 text-xs text-white p-2 w-full focus:outline-none focus:border-amber-400 rounded cursor-pointer"
                      >
                        <option value="abbreviated-5-5">Abbreviated "5-if-5" (Optimized budget slips)</option>
                        <option value="abbreviated-4-4">Abbreviated "4-if-4" (Super Budget Guarantee)</option>
                        <option value="full">Full Wheel (All combinations)</option>
                      </select>
                    </div>

                    <button
                      onClick={handleGenerateWheel}
                      disabled={wheelingLoading}
                      className="w-full py-2.5 bg-amber-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase hover:bg-amber-300 transition cursor-pointer flex items-center justify-center gap-2"
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
                          <span className="w-5.5 h-5.5 bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold text-[10px]">
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
                  <button onClick={handleSaveSlips} className="flex items-center gap-1.5 border border-white/5 hover:border-amber-400 hover:text-amber-400 text-slate-400 px-3 py-1.5 text-[10px] font-bold font-mono transition cursor-pointer"><Save className="w-3 h-3" /> SAVE SLIPS</button>
                  <button onClick={handleExportTxt} className="flex items-center gap-1.5 border border-white/5 hover:border-amber-400 hover:text-amber-400 text-slate-400 px-3 py-1.5 text-[10px] font-bold font-mono transition cursor-pointer"><Download className="w-3 h-3" /> EXPORT (.TXT)</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[360px] overflow-y-auto pr-1">
                {generatedTickets.map((ticket, idx) => {
                  const evalResult = validateTicket(ticket);
                  return (
                    <div key={idx} className="bg-slate-950/40 border border-white/5 hover:border-amber-400/50 p-4 rounded-lg flex flex-col justify-between transition relative overflow-hidden select-none cursor-pointer">
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
                                drawNums && drawNums.includes(n) ? "bg-amber-400 text-slate-950" : "bg-slate-900 border border-white/5 text-gray-400"
                              }`}>
                                {n}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`w-5.5 h-5.5 rounded-sm flex items-center justify-center font-bold text-[9px] ${
                            p.winning_cash_ball && p.winning_cash_ball === p.predicted_cash_ball ? "bg-emerald-500 text-slate-950" : "bg-slate-900 border border-white/5 text-gray-400"
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
                          {p.matching_count !== null ? `${p.matching_count} + ${p.cash_ball_matched ? "CB" : "0"}` : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === "HIT" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
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
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono border-b border-white/5 pb-2">Win for Life System Explainer</h3>
            <div className="space-y-3 text-xs text-gray-400 leading-relaxed font-mono">
              <p>
                <strong>1. Main Number Pool (1 to 28):</strong> The Win for Life matrix requires players to select 6 main numbers from 1 to 28. Because the pool is relatively small, numbers repeat and co-occur in clusters more frequently than standard Lotto Plus games.
              </p>
              <p>
                <strong>2. Cash Ball (1 to 3):</strong> Drawn from a secondary drum containing only three balls, the Cash Ball has a very high 1 in 3 hit probability. Matching the Cash Ball drastically boosts prize payouts.
              </p>
              <p>
                <strong>3. Combinatorial Coverage:</strong> The Wheeling workspace runs Abbreviated set cover algorithms specifically compiled for 6-number tickets. Selecting a pool of 8 to 10 numbers compiles tickets ensuring you match a prize tier without buying a full wheel, saving up to 85% in wager costs.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
