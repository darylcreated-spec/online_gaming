"use client";

import React, { useState, useEffect } from "react";
import { 
  Flame, 
  Sparkles, 
  Target, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  RefreshCw, 
  Copy, 
  Check, 
  Download, 
  ArrowRight, 
  Zap, 
  Clock, 
  CheckCircle2, 
  SlidersHorizontal,
  FileText
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

export interface GameBacktestMetrics {
  sampleDraws: number;
  invariantConformityPct: number;
  hitSummary: string;
  prizeHitRatePct: number;
  theoreticalRandomRatePct: number;
  measuredLift: string;
  keyFinding: string;
}

interface GameHotPick {
  gameKey: "play-whe" | "pick4" | "cashpot" | "lotto-plus" | "win-for-life";
  gameTitle: string;
  badgeColor: string;
  ticketPriceTT: number;
  latestDraw: {
    drawNumber: number;
    drawDate: string;
    period?: string;
    winningNumbers: number[];
  };
  optimalPick: {
    numbers: number[];
    markName?: string;
    sum: number;
    parity: string;
    lowHigh: string;
    carryoverCount: number;
    confidenceScore: number;
    invariantsPassed: boolean;
    rationale: string;
  };
  coveringWheel?: {
    poolSize: number;
    ticketCount: number;
    costTT: number;
    savingsPct: number;
    guarantee: string;
    tickets: number[][];
  };
  alternativePicks: {
    label: string;
    numbers: number[];
    markName?: string;
    type: string;
  }[];
  backtestMetrics?: GameBacktestMetrics;
}

interface HotPicksResponse {
  success: boolean;
  timestamp: string;
  picks: {
    playWhe: GameHotPick;
    pick4: GameHotPick;
    cashPot: GameHotPick;
    lottoPlus: GameHotPick;
    winForLife: GameHotPick;
  };
}

export default function HotPicksTab() {
  const [data, setData] = useState<HotPicksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "play-whe" | "pick4" | "cashpot" | "lotto-plus" | "win-for-life">("all");

  const fetchPicks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/hot-picks", { cache: "no-store" });
      const json: HotPicksResponse = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load hot picks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPicks();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerHaptic("success");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportTxt = (game: GameHotPick) => {
    triggerHaptic("selection");
    let content = `WIN CONCEPTS HOT PICKS - ${game.gameTitle.toUpperCase()}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `Latest Verified Draw: #${game.latestDraw.drawNumber} (${game.latestDraw.winningNumbers.join(", ")})\n\n`;
    content += `PRIMARY OPTIMAL PICK: ${game.optimalPick.numbers.join(" - ")}${game.optimalPick.markName ? ` (${game.optimalPick.markName})` : ""}\n`;
    content += `Sum: ${game.optimalPick.sum} | Parity: ${game.optimalPick.parity} | Low/High: ${game.optimalPick.lowHigh}\n`;
    content += `Rationale: ${game.optimalPick.rationale}\n\n`;

    if (game.coveringWheel) {
      content += `MATHEMATICAL COVERING WHEEL (${game.coveringWheel.poolSize} Numbers -> ${game.coveringWheel.ticketCount} Tickets at $${game.ticketPriceTT} = $${game.coveringWheel.costTT} TT):\n`;
      game.coveringWheel.tickets.forEach((t, idx) => {
        content += `Line #${idx + 1}: ${t.join(" - ")}\n`;
      });
      content += `\nGuarantee: ${game.coveringWheel.guarantee}\n\n`;
    }

    content += `ALTERNATIVE COMPANION PICKS:\n`;
    game.alternativePicks.forEach((alt, idx) => {
      content += `${idx + 1}. ${alt.label} [${alt.type}]: ${alt.numbers.join(" - ")}${alt.markName ? ` (${alt.markName})` : ""}\n`;
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `win-concepts-hot-picks-${game.gameKey}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const gameList = data?.picks 
    ? [data.picks.playWhe, data.picks.pick4, data.picks.cashPot, data.picks.lottoPlus, data.picks.winForLife]
    : [];

  const filteredGames = activeFilter === "all" 
    ? gameList 
    : gameList.filter(g => g.gameKey === activeFilter);

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#121418] via-[#16181E] to-[#0E1013] border border-white/10 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-rose-500/5 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-slate-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <Flame className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white font-mono tracking-wider flex items-center gap-2">
                  WIN CONCEPTS HOT PICKS
                </h1>
                <p className="text-xs text-amber-400 font-mono tracking-wide">
                  Live Mathematical Invariant & Combinatorial Covering Engine
                </p>
              </div>
            </div>
            
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed pt-1">
              Grounded exclusively in authentic historical draw distributions from Turso DB. Automatically recalculates dynamically after every live draw using Markov transition matrices, Gaussian centroid envelopes, and draw-to-draw carryover persistence. 
              <span className="text-gray-300 font-semibold ml-1">Zero AI spindles or simulated RNG.</span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl text-xs font-mono text-gray-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Turso Cloud Synced</span>
            </div>

            <button
              onClick={() => {
                triggerHaptic("selection");
                fetchPicks();
              }}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
              <span>{loading ? "CALCULATING..." : "RECALCULATE"}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap gap-2">
          {[
            { id: "all", label: "All 5 Games" },
            { id: "play-whe", label: "Play Whe" },
            { id: "pick4", label: "Pick 4" },
            { id: "cashpot", label: "Cash Pot" },
            { id: "lotto-plus", label: "Lotto Plus" },
            { id: "win-for-life", label: "Win For Life" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic("selection");
                setActiveFilter(tab.id as any);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeFilter === tab.id
                  ? "bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : "bg-black/30 text-gray-400 border border-white/5 hover:border-white/20 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
          ))}
        </div>
      )}

      {/* Game Cards Stack */}
      <div className="space-y-8">
        {filteredGames.map(game => {
          const badgeStyles: Record<string, { border: string; bg: string; text: string; glow: string; ballBg: string; ballText: string }> = {
            rose: {
              border: "border-rose-500/30 hover:border-rose-500/60",
              bg: "from-rose-500/10 via-[#121418] to-[#0E1013]",
              text: "text-rose-400",
              glow: "shadow-[0_0_20px_rgba(244,63,94,0.15)]",
              ballBg: "bg-rose-500/20 border-rose-500/40",
              ballText: "text-rose-300"
            },
            cyan: {
              border: "border-cyan-500/30 hover:border-cyan-500/60",
              bg: "from-cyan-500/10 via-[#121418] to-[#0E1013]",
              text: "text-cyan-400",
              glow: "shadow-[0_0_20px_rgba(6,182,212,0.15)]",
              ballBg: "bg-cyan-500/20 border-cyan-500/40",
              ballText: "text-cyan-300"
            },
            yellow: {
              border: "border-yellow-500/30 hover:border-yellow-500/60",
              bg: "from-yellow-500/10 via-[#121418] to-[#0E1013]",
              text: "text-yellow-400",
              glow: "shadow-[0_0_20px_rgba(234,179,8,0.15)]",
              ballBg: "bg-yellow-500/20 border-yellow-500/40",
              ballText: "text-yellow-300"
            },
            amber: {
              border: "border-amber-500/30 hover:border-amber-500/60",
              bg: "from-amber-500/10 via-[#121418] to-[#0E1013]",
              text: "text-amber-400",
              glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
              ballBg: "bg-amber-500/20 border-amber-500/40",
              ballText: "text-amber-300"
            },
            emerald: {
              border: "border-emerald-500/30 hover:border-emerald-500/60",
              bg: "from-emerald-500/10 via-[#121418] to-[#0E1013]",
              text: "text-emerald-400",
              glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
              ballBg: "bg-emerald-500/20 border-emerald-500/40",
              ballText: "text-emerald-300"
            }
          };

          const style = badgeStyles[game.badgeColor] || badgeStyles.amber;

          return (
            <div
              key={game.gameKey}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${style.bg} border ${style.border} p-6 sm:p-7 shadow-xl transition-all duration-300 ${style.glow}`}
            >
              {/* Top Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${style.ballBg} ${style.text}`}>
                    {game.gameTitle}
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    Latest Draw: <strong className="text-white">#{game.latestDraw.drawNumber}</strong> ({game.latestDraw.drawDate})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400">
                    Official Ticket: <strong className="text-white">${game.ticketPriceTT.toFixed(2)} TT</strong>
                  </span>
                  <button
                    onClick={() => handleExportTxt(game)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-gray-300 hover:text-white rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>EXPORT</span>
                  </button>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
                {/* Left Column: Primary Optimal Pick (7 cols) */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${style.text}`} />
                        <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                          Primary Calibrated Pick
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Confidence: {game.optimalPick.confidenceScore}%</span>
                      </div>
                    </div>

                    {/* Display Glowing Pick Balls */}
                    <div className="p-4 bg-black/40 border border-white/10 rounded-xl flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {game.optimalPick.numbers.map((n, idx) => (
                          <div
                            key={idx}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black text-base sm:text-lg border ${style.ballBg} ${style.ballText} shadow-lg`}
                          >
                            {game.gameKey === "pick4" ? n : String(n).padStart(2, "0")}
                          </div>
                        ))}

                        {game.optimalPick.markName && (
                          <div className="ml-2 pl-3 border-l border-white/10">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-mono">Chinapoo Mark</span>
                            <span className="text-sm font-black text-white font-mono">{game.optimalPick.markName}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopy(game.optimalPick.numbers.join(" - "), `optimal-${game.gameKey}`)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-gray-300 hover:text-white transition-all cursor-pointer"
                      >
                        {copiedKey === `optimal-${game.gameKey}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>COPY</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Mathematical Invariants Scorecard */}
                  <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-3 font-mono text-xs">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">
                      Mathematical Invariants & Centroid Metrics
                    </span>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                        <span className="text-[10px] text-gray-400 block">Sum Total</span>
                        <strong className="text-white text-xs">{game.optimalPick.sum}</strong>
                        <span className="text-[9px] text-emerald-400 block pt-0.5">Gaussian Band</span>
                      </div>

                      <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                        <span className="text-[10px] text-gray-400 block">Parity Balance</span>
                        <strong className="text-white text-xs">{game.optimalPick.parity}</strong>
                        <span className="text-[9px] text-emerald-400 block pt-0.5">Passes Filter</span>
                      </div>

                      <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                        <span className="text-[10px] text-gray-400 block">Low / High</span>
                        <strong className="text-white text-xs">{game.optimalPick.lowHigh}</strong>
                        <span className="text-[9px] text-emerald-400 block pt-0.5">Balanced Splay</span>
                      </div>

                      <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                        <span className="text-[10px] text-gray-400 block">Draw Carryover</span>
                        <strong className="text-white text-xs">{game.optimalPick.carryoverCount} repeating</strong>
                        <span className="text-[9px] text-emerald-400 block pt-0.5">Anchor Present</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
                      <strong className="text-gray-300">Rationale: </strong> {game.optimalPick.rationale}
                    </p>
                  </div>

                  {/* Empirical Out-of-Sample Backtest Results */}
                  {game.backtestMetrics && (
                    <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/25 rounded-xl space-y-2.5 font-mono text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          Walk-Forward Backtest ({game.backtestMetrics.sampleDraws} Historical Draws)
                        </span>
                        <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          Lift: {game.backtestMetrics.measuredLift} vs Random
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                        <div className="p-2 bg-black/40 rounded border border-white/5">
                          <span className="text-gray-400 block">Prize Hit Rate:</span>
                          <strong className="text-emerald-400 text-xs">{game.backtestMetrics.prizeHitRatePct}%</strong>
                          <span className="text-gray-500 block">vs {game.backtestMetrics.theoreticalRandomRatePct}% Random</span>
                        </div>

                        <div className="p-2 bg-black/40 rounded border border-white/5">
                          <span className="text-gray-400 block">Invariant Conformity:</span>
                          <strong className="text-white text-xs">{game.backtestMetrics.invariantConformityPct}%</strong>
                          <span className="text-gray-500 block">of winning draws</span>
                        </div>

                        <div className="col-span-2 sm:col-span-1 p-2 bg-black/40 rounded border border-white/5">
                          <span className="text-gray-400 block">Measured Edge:</span>
                          <strong className="text-amber-300 text-xs">{game.backtestMetrics.measuredLift}</strong>
                          <span className="text-emerald-400 block font-bold">Empirical Alpha</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-300 leading-snug">
                        <strong className="text-emerald-400">Backtest Audit: </strong>
                        {game.backtestMetrics.keyFinding}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column: Covering Wheel or Alternative Combinations (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {game.coveringWheel ? (
                    <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3 font-mono">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <Cpu className={`w-4 h-4 ${style.text}`} />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Guaranteed Covering Wheel
                          </h4>
                        </div>
                        <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {game.coveringWheel.savingsPct}% SAVINGS
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>Pool: <strong className="text-white">{game.coveringWheel.poolSize} numbers</strong></span>
                        <span>Slips: <strong className="text-white">{game.coveringWheel.ticketCount} lines</strong></span>
                        <span>Stake: <strong className="text-amber-400">${game.coveringWheel.costTT} TT</strong></span>
                      </div>

                      {/* Wheel Tickets List */}
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {game.coveringWheel.tickets.map((t, idx) => (
                          <div key={idx} className="p-2 bg-white/5 border border-white/5 rounded flex items-center justify-between text-xs">
                            <span className="text-[10px] text-gray-500 font-bold">LINE #{idx + 1}</span>
                            <div className="flex gap-1.5">
                              {t.map(n => (
                                <span key={n} className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${style.ballBg} ${style.text}`}>
                                  {String(n).padStart(2, "0")}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-[10px] text-gray-400 italic leading-snug pt-1">
                        {game.coveringWheel.guarantee}
                      </p>
                    </div>
                  ) : null}

                  {/* Alternative Picks */}
                  <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-2.5 font-mono">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">
                      Alternative Calibrated Ensembles
                    </span>

                    <div className="space-y-2">
                      {game.alternativePicks.map((alt, idx) => (
                        <div key={idx} className="p-2.5 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-white block">{alt.label}</span>
                            <span className="text-[10px] text-gray-400">{alt.type}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {alt.numbers.map((n, i) => (
                              <span key={i} className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${style.ballBg} ${style.text}`}>
                                {game.gameKey === "pick4" ? n : String(n).padStart(2, "0")}
                              </span>
                            ))}
                            {alt.markName && (
                              <span className="text-[11px] text-gray-300 font-sans ml-1 font-bold">
                                {alt.markName}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
