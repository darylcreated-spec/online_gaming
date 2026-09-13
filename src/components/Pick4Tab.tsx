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
  Layers,
  Brain,
  HelpCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from "recharts";
import { Pick4MathPrediction, Pick4BacktestResult } from "@/lib/pick4_math_engine";
import GameHeaderBanner from "@/components/GameHeaderBanner";

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
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "math" | "backtest" | "archive" | "explain">("dashboard");
  const [draws, setDraws] = useState<Pick4Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await fetch("/api/pick4/stats", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (e) {
      console.error("Error fetching Pick 4 stats:", e);
    } finally {
      setStatsLoading(false);
    }
  };

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
    fetchStats();
    fetchMathEngine(false);
  }, []);

  useEffect(() => {
    fetchDraws();
  }, [page, search, slotFilter, digitFilter]);

  useEffect(() => {
    fetchMathEngine(false);
  }, [selectedSlot]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const slots = ["MORNING", "MIDDAY", "AFTERNOON", "EVENING"];

  const latestDrawItem = stats?.latestDraw || (draws.length > 0 ? draws[0] : null);

  return (
    <div className="space-y-6">
      {/* Game Hero Header Banner */}
      <GameHeaderBanner
        game="pick4"
        title="Pick 4"
        subtitle="4 Digits (0000–9999) • Daily 4 Slots • Straight Payout $5,000 • 24-Way / 12-Way Box"
        themeColor="purple"
        iconSrc="/images/pick_four_icon.png"
        totalDrawsCount={stats?.totalDraws || totalDraws}
        loading={statsLoading}
        latestDraw={
          latestDrawItem
            ? {
                draw_number: latestDrawItem.draw_number,
                draw_date: latestDrawItem.draw_date,
                time_slot: latestDrawItem.draw_time_slot,
                winning_display: (
                  <div className="flex items-center gap-1.5">
                    {[latestDrawItem.digit1, latestDrawItem.digit2, latestDrawItem.digit3, latestDrawItem.digit4].map((d: number, idx: number) => (
                      <span
                        key={idx}
                        className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-400 text-purple-200 font-black text-sm flex items-center justify-center font-mono shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                      >
                        {d}
                      </span>
                    ))}
                    <span className="text-[10px] text-gray-400 font-mono ml-1">
                      (Sum: {Number(latestDrawItem.digit1) + Number(latestDrawItem.digit2) + Number(latestDrawItem.digit3) + Number(latestDrawItem.digit4)})
                    </span>
                  </div>
                ),
              }
            : null
        }
      />

      {/* Subtab Navigator */}
      <div className="flex bg-slate-900/60 p-1 rounded-xl border border-purple-500/20 w-full md:w-fit mb-6 overflow-x-auto flex-nowrap scrollbar-none gap-1">
        <button
          onClick={() => setActiveSubTab("dashboard")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "dashboard"
              ? "bg-purple-500 text-slate-950 font-black shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              : "text-gray-400 hover:text-purple-300 hover:bg-purple-500/10"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          DASHBOARD & STATS
        </button>

        <button
          onClick={() => setActiveSubTab("math")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "math"
              ? "bg-purple-500 text-slate-950 font-black shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              : "text-purple-400/90 hover:text-purple-300 hover:bg-purple-500/10"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          MATHEMATICAL ENGINE
        </button>

        <button
          onClick={() => {
            setActiveSubTab("backtest");
            if (!backtestData) fetchMathEngine(true);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "backtest"
              ? "bg-purple-500 text-slate-950 font-black shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              : "text-gray-400 hover:text-purple-300 hover:bg-purple-500/10"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          PREDICTION HITS (BACKTEST)
        </button>

        <button
          onClick={() => setActiveSubTab("archive")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "archive"
              ? "bg-purple-500 text-slate-950 font-black shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              : "text-gray-400 hover:text-purple-300 hover:bg-purple-500/10"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          DRAW LOG ARCHIVE
        </button>

        <button
          onClick={() => setActiveSubTab("explain")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "explain"
              ? "bg-purple-500 text-slate-950 font-black shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              : "text-gray-400 hover:text-purple-300 hover:bg-purple-500/10"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          HOW IT WORKS
        </button>
      </div>

      {/* Subtab: Dashboard & Stats */}
      {activeSubTab === "dashboard" && (
        <div className="space-y-6 font-mono">
          {/* Positional Frequency Matrix */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-purple-500/20 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              Global Digit Frequency Across 100% of Draws (Digits 0 to 9)
            </h3>
            <p className="text-xs text-gray-400">
              Total historical occurrence of each digit across all 4 positions in the Turso database.
            </p>

            <div className="h-64 w-full">
              {stats?.globalDigitFrequencies ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.globalDigitFrequencies} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="digit" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", borderColor: "rgba(168,85,247,0.4)", borderRadius: "8px" }}
                      formatter={(val: any) => [`${val} times`, "Digit Frequency"]}
                      labelFormatter={(label) => `Digit ${label}`}
                    />
                    <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]}>
                      {stats.globalDigitFrequencies.map((entry: any) => (
                        <Cell key={entry.digit} fill="#c084fc" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                  Computing 100% digit frequency matrix...
                </div>
              )}
            </div>
          </div>

          {/* Positional Breakdown (Pos 1 to 4) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(pos => {
              const posData = stats?.positionFrequencies?.[`pos${pos}`] || [];
              const maxFreq = Math.max(...posData.map((p: any) => p.count), 1);
              return (
                <div key={pos} className="p-4 rounded-xl bg-slate-900/60 border border-purple-500/20 space-y-3">
                  <span className="text-xs font-black text-purple-300 uppercase">Position {pos} (Digit {pos})</span>
                  <div className="space-y-1.5 text-xs">
                    {posData.slice(0, 5).map((item: any) => (
                      <div key={item.digit} className="flex items-center justify-between">
                        <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs">
                          {item.digit}
                        </span>
                        <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden mx-2">
                          <div
                            className="bg-purple-400 h-full rounded-full"
                            style={{ width: `${(item.count / maxFreq) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Patterns Breakdown */}
          {stats?.patternCounts && (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-purple-500/20 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Historical Box Permutation Classifications
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                  <span className="text-gray-400 block text-[10px]">24-WAY (ALL 4 UNIQUE)</span>
                  <span className="text-lg font-black text-white">{stats.patternCounts.unique}</span>
                </div>
                <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                  <span className="text-gray-400 block text-[10px]">12-WAY (ONE PAIR)</span>
                  <span className="text-lg font-black text-purple-300">{stats.patternCounts.double}</span>
                </div>
                <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                  <span className="text-gray-400 block text-[10px]">4-WAY (TRIPLE)</span>
                  <span className="text-lg font-black text-white">{stats.patternCounts.triple}</span>
                </div>
                <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
                  <span className="text-gray-400 block text-[10px]">1-WAY (QUAD / 4 EQUAL)</span>
                  <span className="text-lg font-black text-white">{stats.patternCounts.quad}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtab: Mathematical Engine */}
      {activeSubTab === "math" && (
        <div className="space-y-6 font-mono">
          {/* Target Slot Selector */}
          <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-900/60 p-4 rounded-2xl border border-purple-500/20">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Target Draw Slot:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedSlot("")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedSlot === ""
                      ? "bg-purple-500 text-slate-950 font-black"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  ALL SLOTS
                </button>
                {slots.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSlot(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedSlot === s
                        ? "bg-purple-500 text-slate-950 font-black"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {mathLoading ? (
            <div className="p-12 text-center text-gray-500 text-xs">
              Computing Positional Markov Matrices and Joint Probability Distributions...
            </div>
          ) : mathData ? (
            <>
              {/* Top Recommended Tickets Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Optimal Straight Ticket */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-purple-500/30 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded-bl-xl border-l border-b border-purple-500/30">
                    EXACT ORDER (STRAIGHT)
                  </div>
                  <span className="text-[11px] text-gray-400 block mb-1">
                    Maximum Joint MAP Posterior
                  </span>
                  <div className="flex items-center gap-2 my-3">
                    {mathData.optimalStraightTicket.digits.map((d, i) => (
                      <span
                        key={i}
                        className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 text-slate-950 font-black text-xl flex items-center justify-center shadow-md"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 border-t border-white/5 pt-3">
                    <div><span>Straight Payout:</span> <strong className="text-white">$5,000</strong></div>
                    <div><span>Confidence:</span> <strong className="text-purple-400">{mathData.optimalStraightTicket.confidenceScore}%</strong></div>
                    <div><span>Sum:</span> <strong className="text-white">{mathData.optimalStraightTicket.sum}</strong></div>
                    <div><span>Parity:</span> <strong className="text-white">{mathData.optimalStraightTicket.evenOddRatio}</strong></div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(mathData.optimalStraightTicket.digitsString, "straight")}
                    className="w-full mt-4 py-2 rounded-xl bg-purple-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer"
                  >
                    {copiedId === "straight" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === "straight" ? "Copied to Clipboard" : "Copy Straight Ticket"}
                  </button>
                </div>

                {/* 2. Optimal 24-Way Box Ticket */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-white/10 text-gray-300 text-[10px] font-bold rounded-bl-xl border-l border-b border-white/10">
                    24-WAY BOX (ANY ORDER)
                  </div>
                  <span className="text-[11px] text-gray-400 block mb-1">
                    4 Distinct High-Probability Digits
                  </span>
                  <div className="flex items-center gap-2 my-3">
                    {mathData.optimalBoxTickets.twentyFourWay.digits.map((d, i) => (
                      <span
                        key={i}
                        className="w-11 h-11 rounded-xl bg-white/10 text-white font-bold text-xl flex items-center justify-center border border-white/10"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 border-t border-white/5 pt-3">
                    <div><span>Box Payout:</span> <strong className="text-white">$208</strong></div>
                    <div><span>Box Ways:</span> <strong className="text-white">24 Ways</strong></div>
                    <div><span>Sum:</span> <strong className="text-white">{mathData.optimalBoxTickets.twentyFourWay.sum}</strong></div>
                    <div><span>Box EV:</span> <strong className="text-purple-400">${mathData.optimalBoxTickets.twentyFourWay.boxEV}</strong></div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(mathData.optimalBoxTickets.twentyFourWay.digitsString, "box24")}
                    className="w-full mt-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-white/10 cursor-pointer"
                  >
                    {copiedId === "box24" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === "box24" ? "Copied" : "Copy 24-Way Box"}
                  </button>
                </div>

                {/* 3. Optimal 12-Way Box Ticket */}
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-white/10 text-gray-300 text-[10px] font-bold rounded-bl-xl border-l border-b border-white/10">
                    12-WAY BOX (ONE PAIR)
                  </div>
                  <span className="text-[11px] text-gray-400 block mb-1">
                    Pair Cluster Multiplier
                  </span>
                  <div className="flex items-center gap-2 my-3">
                    {mathData.optimalBoxTickets.twelveWay.digits.map((d, i) => (
                      <span
                        key={i}
                        className="w-11 h-11 rounded-xl bg-white/10 text-white font-bold text-xl flex items-center justify-center border border-white/10"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 border-t border-white/5 pt-3">
                    <div><span>Box Payout:</span> <strong className="text-white">$417</strong></div>
                    <div><span>Box Ways:</span> <strong className="text-white">12 Ways</strong></div>
                    <div><span>Sum:</span> <strong className="text-white">{mathData.optimalBoxTickets.twelveWay.sum}</strong></div>
                    <div><span>Box EV:</span> <strong className="text-purple-400">${mathData.optimalBoxTickets.twelveWay.boxEV}</strong></div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(mathData.optimalBoxTickets.twelveWay.digitsString, "box12")}
                    className="w-full mt-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-white/10 cursor-pointer"
                  >
                    {copiedId === "box12" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === "box12" ? "Copied" : "Copy 12-Way Box"}
                  </button>
                </div>
              </div>

              {/* Positional Probability Heatmap */}
              <div className="bg-slate-900/60 border border-purple-500/20 rounded-2xl p-6 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  Positional Posterior Probabilities Heatmap (Dirichlet-Markov Matrix)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 text-[11px]">
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
                                    ? "bg-purple-500 text-slate-950 font-black shadow-sm" 
                                    : p > 0.12 
                                      ? "bg-purple-500/20 text-purple-300" 
                                      : "text-gray-500"
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
            </>
          ) : null}
        </div>
      )}

      {/* Subtab: Prediction Hits / Backtest */}
      {activeSubTab === "backtest" && (
        <div className="space-y-6 font-mono">
          <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-purple-500/20">
            <div>
              <h3 className="text-sm font-bold text-white uppercase">Walk-Forward Accuracy Grading</h3>
              <p className="text-xs text-gray-400">Backtested against past historical Pick 4 winning draws.</p>
            </div>
            <button
              onClick={() => fetchMathEngine(true)}
              disabled={backtestLoading}
              className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${backtestLoading ? "animate-spin" : ""}`} />
              {backtestLoading ? "Simulating..." : "Re-Run 100-Draw Backtest"}
            </button>
          </div>

          {backtestData ? (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-purple-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  Out-Of-Sample Results ({backtestData.sampleSize} Evaluated Draws)
                </h4>
                <span className="text-xs px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 font-bold">
                  Box Multiplier: {backtestData.boxEfficiencyRatio}x Random Baseline
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-gray-500 text-[10px]">STRAIGHT EXACT HITS</div>
                  <div className="text-lg font-black text-white mt-1">{backtestData.straightMatches}</div>
                  <div className="text-[10px] text-gray-400">Rate: {(backtestData.straightMatchRate * 100).toFixed(2)}%</div>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-gray-500 text-[10px]">BOX ANY-ORDER HITS</div>
                  <div className="text-lg font-black text-purple-400 mt-1">{backtestData.boxMatches}</div>
                  <div className="text-[10px] text-gray-400">Rate: {(backtestData.boxMatchRate * 100).toFixed(2)}%</div>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-gray-500 text-[10px]">3-OF-4 DIGITS MATCHED</div>
                  <div className="text-lg font-black text-white mt-1">{backtestData.threeDigitMatches}</div>
                  <div className="text-[10px] text-gray-400">Rate: {(backtestData.threeDigitMatchRate * 100).toFixed(2)}%</div>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-gray-500 text-[10px]">2-OF-4 DIGITS MATCHED</div>
                  <div className="text-lg font-black text-white mt-1">{backtestData.twoDigitMatches}</div>
                  <div className="text-[10px] text-gray-400">Rate: {(backtestData.twoDigitMatchRate * 100).toFixed(2)}%</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 text-xs">
              Click &quot;Re-Run 100-Draw Backtest&quot; to execute out-of-sample prediction grading.
            </div>
          )}
        </div>
      )}

      {/* Subtab: Archive / Log */}
      {activeSubTab === "archive" && (
        <div className="space-y-4 font-mono">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search draw # or date..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="text-xs text-gray-400">
              Showing {draws.length} of {totalDraws} recorded draws
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/50 text-gray-400 border-b border-white/5 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Draw #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Digits</th>
                  <th className="py-3 px-4">Sum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading draws...</td></tr>
                ) : draws.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">No draws found.</td></tr>
                ) : (
                  draws.map(d => (
                    <tr key={d.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-white">#{d.draw_number}</td>
                      <td className="py-3 px-4 text-gray-400">{d.draw_date}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-gray-300">
                          {d.draw_time_slot}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {[d.digit1, d.digit2, d.digit3, d.digit4].map((digit, i) => (
                            <span key={i} className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center border border-purple-500/30 text-[11px]">
                              {digit}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{d.digit1 + d.digit2 + d.digit3 + d.digit4}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-xs text-gray-400">
                <span>Page {page} of {totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab: How It Works */}
      {activeSubTab === "explain" && (
        <div className="glass-panel border border-purple-500/20 p-6 rounded-2xl bg-slate-950/40 space-y-4 font-mono">
          <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2">
            How The App Reduces The Odds in NLCB Pick 4
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-300 leading-relaxed">
            <div className="space-y-2">
              <h4 className="text-purple-300 font-bold uppercase">1. Independent Positional Markov Chains</h4>
              <p className="text-gray-400">
                Unlike ball games with sampling without replacement, Pick 4 allows digit repetition (e.g. 7-7-2-7). Our mathematical engine tracks 4 distinct transition matrices (Position 1, 2, 3, and 4) to calculate joint maximum a posteriori (MAP) vector estimates.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-purple-300 font-bold uppercase">2. Straight vs. Box Mathematical Optimization</h4>
              <p className="text-gray-400">
                A single Straight ticket has 1 in 10,000 odds paying $5,000. A 24-Way Box ticket covers 24 permutations, boosting hit odds to <strong>1 in 416.6</strong>. The app generates balanced ensembles combining high-conviction Straights with EV-positive Box safety nets.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-purple-300 font-bold uppercase">3. Digit Sum Distribution (Gaussian Center)</h4>
              <p className="text-gray-400">
                Pick 4 digit sums range from 0 (0000) to 36 (9999). Over 70% of winning draws feature sums between <strong>14 and 22</strong>. All candidate combinations generated by the mathematical engine are filtered to maintain Gaussian central tendency.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-purple-300 font-bold uppercase">4. 4 Slots Daily Auto-Grader</h4>
              <p className="text-gray-400">
                Pick 4 draws 4 times daily (Morning 10:30 AM, Midday 1:00 PM, Afternoon 4:00 PM, Evening 7:00 PM). The engine automatically updates positional frequencies and evaluates prediction hits following each official draw.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
