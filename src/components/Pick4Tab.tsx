"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart2, 
  Calendar, 
  RefreshCw, 
  Cpu, 
  Sparkles, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Award,
  Clock,
  Copy,
  Check,
  Zap,
  TrendingUp,
  Activity,
  Layers
} from "lucide-react";
import { Pick4MathPrediction, Pick4BacktestResult } from "@/lib/pick4_math_engine";

interface Pick4Draw {
  id: number;
  draw_number: number;
  draw_date: string;
  draw_time_slot: string;
  digit1: number;
  digit2: number;
  digit3: number;
  digit4: number;
}

export default function Pick4Tab() {
  const [activeSubTab, setActiveSubTab] = useState<"math" | "archive">("math");
  const [draws, setDraws] = useState<Pick4Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Math engine state
  const [mathData, setMathData] = useState<Pick4MathPrediction | null>(null);
  const [backtestData, setBacktestData] = useState<Pick4BacktestResult | null>(null);
  const [mathLoading, setMathLoading] = useState(true);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Archive filters
  const [search, setSearch] = useState("");
  const [slotFilter, setSlotFilter] = useState("");
  const [digitFilter, setDigitFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDraws, setTotalDraws] = useState(0);

  const fetchDraws = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "16",
        search,
        slot: slotFilter,
        digit: digitFilter
      });
      const res = await fetch(`/api/pick4/draws?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setDraws(data.draws);
        setTotalPages(data.pagination.pages);
        setTotalDraws(data.pagination.total);
      }
    } catch (err) {
      console.error("Error fetching Pick 4 draws:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMathEngine = async (runBacktest: boolean = false) => {
    try {
      if (runBacktest) setBacktestLoading(true);
      else setMathLoading(true);

      const params = new URLSearchParams();
      if (selectedSlot) params.set("slot", selectedSlot);
      if (runBacktest) {
        params.set("backtest", "true");
        params.set("sampleSize", "100");
      }

      const res = await fetch(`/api/pick4/math-engine?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setMathData(data.prediction);
        if (data.backtest) {
          setBacktestData(data.backtest);
        }
      }
    } catch (err) {
      console.error("Error fetching Pick 4 math engine:", err);
    } finally {
      setMathLoading(false);
      setBacktestLoading(false);
    }
  };

  useEffect(() => {
    fetchDraws();
  }, [page, search, slotFilter, digitFilter]);

  useEffect(() => {
    fetchMathEngine(false);
  }, [selectedSlot]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncStatus("Syncing Pick 4 with NLCB...");
      const res = await fetch("/api/pick4/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncStatus(`Sync Complete! ${data.drawsAdded} new draws added.`);
        fetchDraws();
        fetchMathEngine(false);
      } else {
        setSyncStatus(`Sync failed: ${data.error || data.details}`);
      }
    } catch (err: any) {
      setSyncStatus(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const slots = ["MORNING", "MIDDAY", "AFTERNOON", "EVENING"];

  // Find latest draw for each slot
  const latestBySlot: Record<string, Pick4Draw | undefined> = {};
  slots.forEach(slot => {
    latestBySlot[slot] = draws.find(d => d.draw_time_slot === slot);
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/40 via-neutral-900/60 to-black/80 border border-emerald-500/20 p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold font-mono">
                0-9
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  NLCB PICK 4
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                    4 DRAWS DAILY
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  4-Digit Permutations (0000–9999) • Straight $5,000 Payout • 24-Way / 12-Way Box
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {syncStatus && (
              <span className="text-xs text-emerald-300 font-mono animate-pulse">
                {syncStatus}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-emerald-400" : ""}`} />
              {syncing ? "Syncing..." : "Sync Live NLCB"}
            </button>
          </div>
        </div>

        {/* 4 Daily Draw Slot Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/5">
          {slots.map(slot => {
            const draw = latestBySlot[slot];
            const isLatestToday = draw && draw.draw_date === draws[0]?.draw_date;
            return (
              <div
                key={slot}
                className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neutral-400 font-semibold">{slot}</span>
                  {draw && <span className="text-neutral-500 text-[10px]">#{draw.draw_number}</span>}
                </div>

                {draw ? (
                  <div className="flex items-center justify-center gap-1.5 py-1">
                    {[draw.digit1, draw.digit2, draw.digit3, draw.digit4].map((d, i) => (
                      <span
                        key={i}
                        className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold text-sm flex items-center justify-center shadow-sm"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-xs text-neutral-600 font-mono">Pending Draw</div>
                )}

                <div className="text-[10px] text-neutral-500 font-mono text-center">
                  {draw ? draw.draw_date : "Awaiting Draw"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtab Navigator */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("math")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "math"
              ? "bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Cpu className="w-4 h-4" />
          MATHEMATICAL INFERENCE ENGINE
        </button>

        <button
          onClick={() => setActiveSubTab("archive")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "archive"
              ? "bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Calendar className="w-4 h-4" />
          RESULTS ARCHIVE ({totalDraws})
        </button>
      </div>

      {/* Subtab: Mathematical Engine */}
      {activeSubTab === "math" && (
        <div className="space-y-6">
          {/* Target Slot Selector */}
          <div className="flex items-center justify-between flex-wrap gap-4 bg-neutral-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400 font-mono">Target Draw Slot:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedSlot("")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    selectedSlot === ""
                      ? "bg-emerald-500 text-neutral-950"
                      : "bg-white/5 text-neutral-400 hover:bg-white/10"
                  }`}
                >
                  ALL SLOTS
                </button>
                {slots.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSlot(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      selectedSlot === s
                        ? "bg-emerald-500 text-neutral-950"
                        : "bg-white/5 text-neutral-400 hover:bg-white/10"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => fetchMathEngine(true)}
              disabled={backtestLoading}
              className="px-4 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 ${backtestLoading ? "animate-spin" : ""}`} />
              {backtestLoading ? "Running Simulation..." : "Run 100-Draw Backtest"}
            </button>
          </div>

          {mathLoading ? (
            <div className="p-12 text-center text-neutral-500 font-mono text-xs">
              Computing Positional Markov Matrices and Joint Probability Distributions...
            </div>
          ) : mathData ? (
            <>
              {/* Top Recommended Tickets Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Optimal Straight Ticket */}
                <div className="p-5 rounded-2xl bg-neutral-900/60 border border-emerald-500/30 shadow-xl relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold rounded-bl-xl border-l border-b border-emerald-500/30">
                    EXACT ORDER (STRAIGHT)
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 block mb-1">
                    Maximum Joint MAP Posterior
                  </span>
                  <div className="flex items-center gap-2 my-3">
                    {mathData.optimalStraightTicket.digits.map((d, i) => (
                      <span
                        key={i}
                        className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-neutral-950 font-black text-xl flex items-center justify-center font-mono shadow-md"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-neutral-400 border-t border-white/5 pt-3">
                    <div>
                      <span>Straight Payout:</span>{" "}
                      <strong className="text-white">$5,000</strong>
                    </div>
                    <div>
                      <span>Confidence:</span>{" "}
                      <strong className="text-emerald-400">{mathData.optimalStraightTicket.confidenceScore}%</strong>
                    </div>
                    <div>
                      <span>Sum:</span>{" "}
                      <strong className="text-white">{mathData.optimalStraightTicket.sum}</strong>
                    </div>
                    <div>
                      <span>Parity:</span>{" "}
                      <strong className="text-white">{mathData.optimalStraightTicket.evenOddRatio}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(mathData.optimalStraightTicket.digitsString, "straight")}
                    className="w-full mt-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all font-mono"
                  >
                    {copiedId === "straight" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === "straight" ? "Copied to Clipboard" : "Copy Straight Ticket"}
                  </button>
                </div>

                {/* 2. Optimal 24-Way Box Ticket */}
                <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-white/10 text-neutral-300 font-mono text-[10px] font-bold rounded-bl-xl border-l border-b border-white/10">
                    24-WAY BOX (ANY ORDER)
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 block mb-1">
                    4 Distinct High-Probability Digits
                  </span>
                  <div className="flex items-center gap-2 my-3">
                    {mathData.optimalBoxTickets.twentyFourWay.digits.map((d, i) => (
                      <span
                        key={i}
                        className="w-11 h-11 rounded-xl bg-white/10 text-white font-bold text-xl flex items-center justify-center font-mono border border-white/10"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-neutral-400 border-t border-white/5 pt-3">
                    <div>
                      <span>Box Payout:</span>{" "}
                      <strong className="text-white">$208</strong>
                    </div>
                    <div>
                      <span>Box Ways:</span>{" "}
                      <strong className="text-white">24 Ways</strong>
                    </div>
                    <div>
                      <span>Sum:</span>{" "}
                      <strong className="text-white">{mathData.optimalBoxTickets.twentyFourWay.sum}</strong>
                    </div>
                    <div>
                      <span>Box EV:</span>{" "}
                      <strong className="text-emerald-400">${mathData.optimalBoxTickets.twentyFourWay.boxEV}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(mathData.optimalBoxTickets.twentyFourWay.digitsString, "box24")}
                    className="w-full mt-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all font-mono border border-white/10"
                  >
                    {copiedId === "box24" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === "box24" ? "Copied" : "Copy 24-Way Box"}
                  </button>
                </div>

                {/* 3. Optimal 12-Way Box Ticket */}
                <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-white/10 text-neutral-300 font-mono text-[10px] font-bold rounded-bl-xl border-l border-b border-white/10">
                    12-WAY BOX (ONE PAIR)
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 block mb-1">
                    Pair Cluster Multiplier
                  </span>
                  <div className="flex items-center gap-2 my-3">
                    {mathData.optimalBoxTickets.twelveWay.digits.map((d, i) => (
                      <span
                        key={i}
                        className="w-11 h-11 rounded-xl bg-white/10 text-white font-bold text-xl flex items-center justify-center font-mono border border-white/10"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-neutral-400 border-t border-white/5 pt-3">
                    <div>
                      <span>Box Payout:</span>{" "}
                      <strong className="text-white">$417</strong>
                    </div>
                    <div>
                      <span>Box Ways:</span>{" "}
                      <strong className="text-white">12 Ways</strong>
                    </div>
                    <div>
                      <span>Sum:</span>{" "}
                      <strong className="text-white">{mathData.optimalBoxTickets.twelveWay.sum}</strong>
                    </div>
                    <div>
                      <span>Box EV:</span>{" "}
                      <strong className="text-emerald-400">${mathData.optimalBoxTickets.twelveWay.boxEV}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(mathData.optimalBoxTickets.twelveWay.digitsString, "box12")}
                    className="w-full mt-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all font-mono border border-white/10"
                  >
                    {copiedId === "box12" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === "box12" ? "Copied" : "Copy 12-Way Box"}
                  </button>
                </div>
              </div>

              {/* Backtest Results if triggered */}
              {backtestData && (
                <div className="p-6 rounded-2xl bg-neutral-900/60 border border-emerald-500/30 backdrop-blur-md space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Walk-Forward Out-Of-Sample Backtest Results ({backtestData.sampleSize} Simulated Draws)
                    </h4>
                    <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      Box Multiplier: {backtestData.boxEfficiencyRatio}x Random Baseline
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 font-mono">
                      <div className="text-neutral-500 text-[10px]">STRAIGHT EXACT HITS</div>
                      <div className="text-lg font-black text-white mt-1">{backtestData.straightMatches}</div>
                      <div className="text-[10px] text-neutral-400">Rate: {(backtestData.straightMatchRate * 100).toFixed(2)}%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 font-mono">
                      <div className="text-neutral-500 text-[10px]">BOX ANY-ORDER HITS</div>
                      <div className="text-lg font-black text-emerald-400 mt-1">{backtestData.boxMatches}</div>
                      <div className="text-[10px] text-neutral-400">Rate: {(backtestData.boxMatchRate * 100).toFixed(2)}%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 font-mono">
                      <div className="text-neutral-500 text-[10px]">3-OF-4 DIGITS MATCHED</div>
                      <div className="text-lg font-black text-white mt-1">{backtestData.threeDigitMatches}</div>
                      <div className="text-[10px] text-neutral-400">Rate: {(backtestData.threeDigitMatchRate * 100).toFixed(2)}%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 font-mono">
                      <div className="text-neutral-500 text-[10px]">2-OF-4 DIGITS MATCHED</div>
                      <div className="text-lg font-black text-white mt-1">{backtestData.twoDigitMatches}</div>
                      <div className="text-[10px] text-neutral-400">Rate: {(backtestData.twoDigitMatchRate * 100).toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Positional Probability Heatmap (Positions 1 to 4 vs Digits 0 to 9) */}
              <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md space-y-4">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Positional Posterior Probabilities Heatmap (Dirichlet-Markov Matrix)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-neutral-400 text-[11px]">
                        <th className="py-2 px-3 text-left">Position</th>
                        {Array.from({ length: 10 }, (_, i) => (
                          <th key={i} className="py-2 px-2">{i}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[0, 1, 2, 3].map(pos => (
                        <tr key={pos} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 text-left font-bold text-white">
                            Position {pos + 1}
                          </td>
                          {Array.from({ length: 10 }, (_, d) => {
                            const p = mathData.positionalProbabilities[pos][d];
                            const isMax = p === Math.max(...mathData.positionalProbabilities[pos]);
                            return (
                              <td key={d} className="py-2.5 px-2">
                                <span className={`px-2 py-1 rounded font-bold text-[11px] ${
                                  isMax 
                                    ? "bg-emerald-500 text-neutral-950 shadow-sm" 
                                    : p > 0.12 
                                      ? "bg-emerald-500/20 text-emerald-300" 
                                      : "text-neutral-400"
                                }`}>
                                  {(p * 100).toFixed(1)}%
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5-Ticket Diversified Covering Ensemble */}
              <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md space-y-4">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  5-Ticket Calibrated Ensemble ($5 Total Play)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {mathData.fiveTicketEnsemble.map((t, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/5 font-mono flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span>Slip #{idx + 1}</span>
                        <span className="text-emerald-400">{t.pattern}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 py-1">
                        {t.digits.map((d, i) => (
                          <span key={i} className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-sm flex items-center justify-center border border-emerald-500/30">
                            {d}
                          </span>
                        ))}
                      </div>
                      <div className="text-[10px] text-neutral-500 flex justify-between">
                        <span>Sum {t.sum}</span>
                        <span>{t.evenOddRatio}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Subtab: Results Archive */}
      {activeSubTab === "archive" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-neutral-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search Draw # or Date (YYYY-MM-DD)..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 font-mono">Slot:</span>
              <select
                value={slotFilter}
                onChange={e => { setSlotFilter(e.target.value); setPage(1); }}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="">All 4 Slots</option>
                <option value="MORNING">Morning (10:30 AM)</option>
                <option value="MIDDAY">Midday (1:00 PM)</option>
                <option value="AFTERNOON">Afternoon (4:00 PM)</option>
                <option value="EVENING">Evening (7:00 PM)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 font-mono">Digit:</span>
              <select
                value={digitFilter}
                onChange={e => { setDigitFilter(e.target.value); setPage(1); }}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="">All Digits (0-9)</option>
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i} value={i.toString()}>Digit {i}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-neutral-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-neutral-400 uppercase text-[11px]">
                    <th className="py-3 px-4">Draw #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Slot</th>
                    <th className="py-3 px-4">Digits</th>
                    <th className="py-3 px-4">Sum</th>
                    <th className="py-3 px-4">Pattern</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500">
                        Loading Pick 4 draws...
                      </td>
                    </tr>
                  ) : draws.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500">
                        No draws found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    draws.map(d => {
                      const sum = d.digit1 + d.digit2 + d.digit3 + d.digit4;
                      const digits: [number, number, number, number] = [d.digit1, d.digit2, d.digit3, d.digit4];
                      const counts = new Map<number, number>();
                      digits.forEach(x => counts.set(x, (counts.get(x) || 0) + 1));
                      const maxRepeats = Math.max(...Array.from(counts.values()));
                      const pattern = maxRepeats === 4 ? "QUAD" : maxRepeats === 3 ? "4-WAY" : maxRepeats === 2 && counts.size === 2 ? "6-WAY" : maxRepeats === 2 ? "12-WAY" : "24-WAY";

                      return (
                        <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-bold text-white">#{d.draw_number}</td>
                          <td className="py-3 px-4 text-neutral-400">{d.draw_date}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-neutral-300">
                              {d.draw_time_slot}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {[d.digit1, d.digit2, d.digit3, d.digit4].map((digit, i) => (
                                <span
                                  key={i}
                                  className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center border border-emerald-500/30 text-[11px]"
                                >
                                  {digit}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-neutral-300">{sum}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {pattern}
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-xs text-neutral-400 font-mono">
                <span>Page {page} of {totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
