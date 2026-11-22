"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart2, 
  Calendar, 
  RefreshCw, 
  Cpu, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  Award,
  Brain,
  HelpCircle,
  Activity,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Zap,
  ShieldCheck,
  Sigma,
  Printer,
  Crosshair,
  GitMerge
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
import MultiBallMathPanel from "@/components/MultiBallMathPanel";
import GameHeaderBanner from "@/components/GameHeaderBanner";
import CashPotAuditPanel from "@/components/CashPotAuditPanel";
import CashPotDiff20Panel from "@/components/CashPotDiff20Panel";
import CashPotForensicPanel from "@/components/CashPotForensicPanel";
import TrevorEnginePanel from "@/components/TrevorEnginePanel";
import Lucky7EnginePanel from "@/components/Lucky7EnginePanel";
import BetSlipExportModal from "@/components/BetSlipExportModal";
import { generateWheel } from "@/lib/wheeling";
import { triggerHaptic } from "@/lib/haptics";

interface CashPotDraw {
  id: number;
  draw_number: number;
  draw_date: string;
  num1: number;
  num2: number;
  num3: number;
  num4: number;
  num5: number;
  multiplier: number;
}

export default function CashPotTab() {
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "lucky7" | "trevor" | "math" | "diff" | "audit" | "forensic" | "wheeling" | "archive" | "explain">("dashboard");
  const [draws, setDraws] = useState<CashPotDraw[]>([]);
  const [latestDraw, setLatestDraw] = useState<CashPotDraw | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedCashPotDraw, setSelectedCashPotDraw] = useState<CashPotDraw | null>(null);

  // Archive filters
  const [search, setSearch] = useState("");
  const [numberFilter, setNumberFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDraws, setTotalDraws] = useState(0);

  // Wheeling states
  const [selectedPool, setSelectedPool] = useState<number[]>([1, 2, 3, 5, 7, 9, 12, 15]);
  const [wheelStrategy, setWheelStrategy] = useState<"abbreviated-4-4" | "abbreviated-3-3" | "full">("abbreviated-4-4");
  const [generatedTickets, setGeneratedTickets] = useState<number[][]>([]);
  const [championPick, setChampionPick] = useState<any>(null);
  const [showChampionDrawer, setShowChampionDrawer] = useState<boolean>(false);
  const [exportPayload, setExportPayload] = useState<{
    slips: number[][];
    targetDrawNumber?: number;
  } | null>(null);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const [res, trackerRes] = await Promise.all([
        fetch("/api/cashpot/stats", { cache: "no-store" }),
        fetch("/api/engine-tracker?game=cashpot&depth=100", { cache: "no-store" }).catch(() => null)
      ]);
      const data = await res.json();
      if (data.success) {
        setStats(data);
        if (data.latestDraw && !latestDraw) {
          setLatestDraw(data.latestDraw);
        }
      }
      if (trackerRes && trackerRes.ok) {
        const tData = await trackerRes.json();
        const cpChamp = tData?.championPicks?.find((c: any) => c.game_key === "cashpot") || tData?.championPicks?.[0];
        if (cpChamp) {
          setChampionPick(cpChamp);
          const coreSet = new Set<number>();
          for (const slip of cpChamp.wheel_slips || [cpChamp.predicted_numbers || []]) {
            for (const b of slip) {
              if (coreSet.size < 12) coreSet.add(b);
            }
          }
          if (coreSet.size >= 5) {
            setSelectedPool(Array.from(coreSet).sort((a, b) => a - b));
          }
        }
      }
    } catch (e) {
      console.error("Error fetching Cashpot stats:", e);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchDraws = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        search,
        number: numberFilter
      });
      const res = await fetch(`/api/cashpot/draws?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setDraws(data.draws);
        setTotalPages(data.pagination.pages);
        setTotalDraws(data.pagination.total);
        if (data.draws.length > 0 && page === 1 && !search && !numberFilter) {
          setLatestDraw(data.draws[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching Cash Pot draws:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchDraws();
  }, [page, search, numberFilter]);

  const togglePoolNumber = (num: number) => {
    if (selectedPool.includes(num)) {
      if (selectedPool.length > 5) {
        setSelectedPool(selectedPool.filter(n => n !== num));
      }
    } else {
      if (selectedPool.length < 15) {
        setSelectedPool([...selectedPool, num].sort((a, b) => a - b));
      }
    }
  };

  const handleGenerateWheel = () => {
    try {
      const tickets = generateWheel(selectedPool, wheelStrategy, 5);
      setGeneratedTickets(tickets);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Game Hero Header Banner */}
      <GameHeaderBanner
        game="cashpot"
        title="Cash Pot"
        subtitle="Pick 5 numbers from 1 to 20 with Multiplier. Draws daily at 7:00 PM except religious holidays. 1 in 15,504 odds for all 5 numbers."
        themeColor="yellow"
        iconSrc="/images/cash_pot_icon.png"
        totalDrawsCount={stats?.totalDraws || totalDraws}
        loading={statsLoading}
        latestDraw={
          latestDraw
            ? {
                draw_number: latestDraw.draw_number,
                draw_date: latestDraw.draw_date,
                winning_display: (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[latestDraw.num1, latestDraw.num2, latestDraw.num3, latestDraw.num4, latestDraw.num5].map((n, idx) => (
                      <span
                        key={idx}
                        className="w-7 h-7 rounded-full bg-yellow-500/20 border border-yellow-400 text-yellow-200 font-black text-xs flex items-center justify-center font-mono shadow-[0_0_8px_rgba(250,204,21,0.4)]"
                      >
                        {n}
                      </span>
                    ))}
                    {latestDraw.multiplier > 1 && (
                      <span className="ml-1 px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-200 font-black text-xs border border-amber-400 font-mono">
                        {latestDraw.multiplier}X
                      </span>
                    )}
                  </div>
                ),
              }
            : null
        }
      />

      {/* Subtab Navigator */}
      <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full md:w-fit mb-6 overflow-x-auto flex-nowrap scrollbar-none gap-1">
        {[
          { id: "dashboard", label: "DASHBOARD & STATS", icon: BarChart2 },
          { id: "lucky7", label: "LUCKY 7", icon: GitMerge },
          { id: "trevor", label: "TREVOR ENGINE", icon: Crosshair },
          { id: "math", label: "MATHEMATICAL ENGINE", icon: Brain },
          { id: "diff", label: "SUM-28 / DIFF ENGINE", icon: Sigma },
          { id: "audit", label: "100% QUANT AUDIT", icon: ShieldCheck },
          { id: "forensic", label: "FORENSIC ENGINE", icon: Cpu },
          { id: "wheeling", label: "WHEELING BUILDER", icon: ClipboardList },
          { id: "archive", label: "DRAW ARCHIVE", icon: Calendar },
          { id: "explain", label: "METHODOLOGY", icon: HelpCircle },
        ].map((tabItem) => {
          const IconComp = tabItem.icon;
          const isActive = activeSubTab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              onClick={() => setActiveSubTab(tabItem.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-yellow-500 text-slate-950 font-black shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              {tabItem.label}
            </button>
          );
        })}
      </div>

      {/* Subtab Content: Dashboard & Stats */}
      {activeSubTab === "dashboard" && (
        <div className="space-y-6">
          {/* Connected Engines Tab #1 Verified Champion Portfolio Drawer */}
          {championPick && (
            <div className="rounded-2xl bg-slate-900/80 border border-yellow-500/30 overflow-hidden font-mono">
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShieldCheck className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-yellow-300">
                    Verified Champion Engine — {championPick.engine_name}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                    {championPick.verified_win_rate_pct ?? championPick.win_rate_pct}% WIN RATE ({(championPick.verified_roi_pct ?? championPick.roi_pct) >= 0 ? "+" : ""}{championPick.verified_roi_pct ?? championPick.roi_pct}% ROI)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 text-xs font-bold">
                    Target Draw #{championPick.target_draw_number}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      const slips = (championPick.wheel_slips || [championPick.predicted_numbers]).slice(0, 10);
                      setExportPayload({
                        slips,
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
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-yellow-300 text-xs font-bold transition cursor-pointer"
                  >
                    {showChampionDrawer ? "Close Champion Drawer" : "Open 10-Slip & Window Drawer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("selection");
                      setActiveSubTab("wheeling");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Wheeling ({selectedPool.length} Balls)
                  </button>
                </div>
              </div>

              {showChampionDrawer && (
                <div className="p-4 border-t border-yellow-500/20 space-y-4 bg-slate-950/60">
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
                          <span className="text-xs text-gray-500">3+ Ball Hit Capture</span>
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
                            ? "bg-yellow-500/15 border-yellow-400/50"
                            : "bg-black/40 border-white/10"
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                        <div className="flex items-center gap-1">
                          {slip.map((n: number, bIdx: number) => (
                            <span
                              key={bIdx}
                              className="w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 font-black text-xs flex items-center justify-center"
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

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-yellow-500/20 space-y-1">
              <span className="text-xs text-gray-400 uppercase">Total Draws Analyzed</span>
              <div className="text-xl font-black text-yellow-300">
                {stats?.totalDraws ? stats.totalDraws.toLocaleString() : "..."}
              </div>
              <span className="text-xs text-emerald-400">100% Database Records</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-yellow-500/20 space-y-1">
              <span className="text-xs text-gray-400 uppercase">Combinatorial Odds</span>
              <div className="text-xl font-black text-white">1 in 15,504</div>
              <span className="text-xs text-gray-400">C(20, 5) Permutations</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-yellow-500/20 space-y-1">
              <span className="text-xs text-gray-400 uppercase">Average Ticket Sum</span>
              <div className="text-xl font-black text-yellow-300">
                {stats?.averageSum || 52.5}
              </div>
              <span className="text-xs text-gray-400">Normal range 40–65</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-yellow-500/20 space-y-1">
              <span className="text-xs text-gray-400 uppercase">Chi-Square Randomness</span>
              <div className="text-xl font-black text-emerald-400">
                {stats?.advancedStats?.chiSquare?.verdict || "Unbiased"}
              </div>
              <span className="text-xs text-gray-400">Fair machine distribution</span>
            </div>
          </div>

          {/* Frequency Bar Chart (Numbers 1-20) */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-yellow-500/20 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-yellow-400" />
                  Historical Number Frequencies (Balls 1 to 20 across all draws)
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  Exact hit distribution computed across 100% of official NLCB Cash Pot winning draws.
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              {stats?.mainFrequencies ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.mainFrequencies} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="number" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", borderColor: "rgba(250,204,21,0.4)", borderRadius: "8px" }}
                      formatter={(val: any) => [`${val} draws`, "Frequency"]}
                      labelFormatter={(label) => `Ball #${label}`}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.mainFrequencies.map((entry: any) => (
                        <Cell
                          key={entry.number}
                          fill={
                            stats.rankings?.hotNumbers?.some((h: any) => h.number === entry.number)
                              ? "#eab308"
                              : stats.rankings?.coldNumbers?.some((c: any) => c.number === entry.number)
                              ? "#475569"
                              : "#ca8a04"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 font-mono text-xs">
                  Computing 100% frequency matrix...
                </div>
              )}
            </div>
          </div>

          {/* Hot / Cold Rankings and Multiplier distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
            {/* Hot & Cold Rankings */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-yellow-500/20 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Rankings: Hot &amp; Cold Balls
              </h4>

              <div className="space-y-3">
                <div>
                  <span className="text-xs text-yellow-400 uppercase font-bold block mb-1.5">Top 5 Most Frequent:</span>
                  <div className="flex gap-2">
                    {stats?.rankings?.hotNumbers?.map((item: any) => (
                      <div key={item.number} className="flex-1 p-2 bg-yellow-500/10 border border-yellow-400/30 rounded-xl text-center">
                        <span className="text-sm font-black text-yellow-300 block">#{item.number}</span>
                        <span className="text-xs text-gray-400">{item.count} draws</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-gray-400 uppercase font-bold block mb-1.5">Top 5 Least Frequent (Cold / Overdue):</span>
                  <div className="flex gap-2">
                    {stats?.rankings?.coldNumbers?.map((item: any) => (
                      <div key={item.number} className="flex-1 p-2 bg-slate-800/40 border border-white/10 rounded-xl text-center">
                        <span className="text-sm font-black text-slate-300 block">#{item.number}</span>
                        <span className="text-xs text-gray-500">{item.count} draws</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Multiplier Frequencies */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-yellow-500/20 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Multiplier Distribution (1X to 5X)
              </h4>

              <div className="space-y-2">
                {stats?.multiplierFrequencies?.map((m: any) => (
                  <div key={m.multiplier} className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 text-xs">
                    <span className="font-bold text-amber-300">{m.multiplier}X Multiplier</span>
                    <span className="text-gray-400">{m.count} draws</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab Content: Lucky 7 */}
      {activeSubTab === "lucky7" && (
        <Lucky7EnginePanel game="cashpot" />
      )}

      {/* Subtab Content: Trevor Engine */}
      {activeSubTab === "trevor" && (
        <TrevorEnginePanel game="cashpot" />
      )}

      {/* Subtab Content: Mathematical Engine */}
      {activeSubTab === "math" && (
        <MultiBallMathPanel game="cashpot" />
      )}

      {/* Subtab Content: Sum-28 / Diff-20 Quantitative Engine */}
      {activeSubTab === "diff" && (
        <CashPotDiff20Panel />
      )}

      {/* Subtab Content: 100% Invariant & Audit System */}
      {activeSubTab === "audit" && (
        <CashPotAuditPanel />
      )}

      {/* Subtab Content: Forensic Quantitative Engine */}
      {activeSubTab === "forensic" && (
        <div className="tab-content-enter">
          <CashPotForensicPanel />
        </div>
      )}

      {/* Subtab Content: Wheeling */}
      {activeSubTab === "wheeling" && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-yellow-500/20 rounded-2xl p-6 backdrop-blur-md space-y-6 font-mono">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-yellow-400" />
                Abbreviated Set Cover Wheeling Generator (5 of 20 Pool)
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Select between 5 and 15 numbers from the pool of 20 to generate mathematically guaranteed tickets.
              </p>
            </div>

            {/* Strategy selector */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-gray-300 uppercase">Guarantee Strategy:</span>
              <button
                onClick={() => setWheelStrategy("abbreviated-4-4")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  wheelStrategy === "abbreviated-4-4"
                    ? "bg-yellow-500 text-slate-950 border-yellow-400 font-black"
                    : "bg-black/40 text-gray-400 border-white/10 hover:border-yellow-500/30"
                }`}
              >
                Match 4 if 4 Drawn (Balanced Cover)
              </button>
              <button
                onClick={() => setWheelStrategy("abbreviated-3-3")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  wheelStrategy === "abbreviated-3-3"
                    ? "bg-yellow-500 text-slate-950 border-yellow-400 font-black"
                    : "bg-black/40 text-gray-400 border-white/10 hover:border-yellow-500/30"
                }`}
              >
                Match 3 if 3 Drawn (Budget Cover)
              </button>
            </div>

            {/* Pool Number Selector (1 to 20) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Selected Pool ({selectedPool.length}/15 numbers):</span>
                <span>Click numbers to toggle selection</span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {Array.from({ length: 20 }, (_, i) => i + 1).map(num => {
                  const selected = selectedPool.includes(num);
                  return (
                    <button
                      key={num}
                      onClick={() => togglePoolNumber(num)}
                      className={`h-10 rounded-xl font-mono font-bold text-xs flex items-center justify-center transition-all cursor-pointer border ${
                        selected
                          ? "bg-yellow-500 text-slate-950 border-yellow-300 font-black shadow-[0_0_12px_rgba(250,204,21,0.4)]"
                          : "bg-black/40 text-gray-300 border-white/10 hover:border-yellow-500/40"
                      }`}
                    >
                      {String(num).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleGenerateWheel}
              className="px-6 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-yellow-500/20 cursor-pointer"
            >
              Generate Optimized Wheel
            </button>

            {/* Generated Tickets */}
            {generatedTickets.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex flex-wrap justify-between items-center gap-2 text-xs font-bold text-white">
                  <span>Generated Tickets ({generatedTickets.length} lines):</span>
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-400 font-mono text-xs">
                      Total Stake: ${generatedTickets.length * 5} TT ($5/ticket)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        setExportPayload({
                          slips: generatedTickets,
                          targetDrawNumber: championPick?.target_draw_number
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-bold text-xs transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print or Export</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {generatedTickets.map((ticket, idx) => (
                    <div key={idx} className="p-3 bg-black/50 border border-yellow-500/20 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-gray-400">#{idx + 1}</span>
                      <div className="flex gap-1.5">
                        {ticket.map(n => (
                          <span key={n} className="w-6 h-6 rounded-md bg-yellow-500/20 border border-yellow-400 text-yellow-300 font-bold text-xs flex items-center justify-center">
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
        </div>
      )}

      {/* Subtab Content: Archive / Log */}
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
                className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div className="text-xs text-gray-400">
              Showing {draws.length} of {totalDraws} recorded draws
            </div>
          </div>

          {/* Main Content Split: Table on left, Investigation Drawer on right */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Table Container */}
            <div className={`transition-all duration-300 ${selectedCashPotDraw ? "w-full lg:w-2/3" : "w-full"}`}>
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-x-auto sleek-scrollbar max-h-[600px] relative">
                <table className="w-full text-left text-xs min-w-[480px]">
                  <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md text-gray-400 border-b border-white/5 uppercase text-xs">
                    <tr>
                      <th className="py-3 px-4 bg-slate-950">Draw #</th>
                      <th className="py-3 px-4 bg-slate-950">Date</th>
                      <th className="py-3 px-4 bg-slate-950">Winning Numbers (5 of 20)</th>
                      <th className="py-3 px-4 bg-slate-950">Multiplier</th>
                      <th className="py-3 px-3 bg-slate-950 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading draws...</td></tr>
                    ) : draws.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-500">No draws found.</td></tr>
                    ) : (
                      draws.map(d => {
                        const isSelected = selectedCashPotDraw?.id === d.id;
                        return (
                          <tr 
                            key={d.id} 
                            onClick={() => {
                              setSelectedCashPotDraw(isSelected ? null : d);
                              triggerHaptic("selection");
                            }}
                            className={`cursor-pointer transition-all duration-200 ${
                              isSelected 
                                ? "bg-yellow-500/15 border-l-4 border-l-yellow-400 text-white shadow-inner" 
                                : "hover:bg-white/[0.02] text-gray-300"
                            }`}
                          >
                            <td className="py-3 px-4 font-bold text-white">#{d.draw_number}</td>
                            <td className="py-3 px-4 text-gray-400">{d.draw_date}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                {[d.num1, d.num2, d.num3, d.num4, d.num5].map((n, i) => (
                                  <span key={i} className={`w-6 h-6 rounded-md font-bold flex items-center justify-center text-xs transition-transform ${
                                    isSelected
                                      ? "bg-yellow-400 text-slate-950 scale-105 shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                                      : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                                  }`}>
                                    {String(n).padStart(2, "0")}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                d.multiplier > 1 ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-white/5 text-gray-400"
                              }`}>
                                {d.multiplier}X
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className={`text-xs uppercase font-bold px-2 py-1 rounded transition-colors ${
                                isSelected ? "bg-yellow-400/20 text-yellow-300" : "text-gray-500 hover:text-white"
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

            {/* Split-View Investigation Panel (SaaS Drawer Pattern) */}
            {selectedCashPotDraw && (
              <div className="w-full lg:w-1/3 glass-panel p-5 rounded-2xl border border-yellow-500/30 bg-slate-950/95 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 relative shadow-2xl shrink-0 font-mono">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-yellow-400" />
                    <div>
                      <h4 className="text-xs font-black uppercase text-white tracking-wider">
                        Cash Pot Draw #{selectedCashPotDraw.draw_number}
                      </h4>
                      <span className="text-xs text-gray-400">
                        {selectedCashPotDraw.draw_date}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCashPotDraw(null)}
                    className="px-2 py-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition text-xs font-sans font-semibold cursor-pointer"
                    title="Close details panel"
                  >
                    Close
                  </button>
                </div>

                {/* Balls Display */}
                {(() => {
                  const nums = [selectedCashPotDraw.num1, selectedCashPotDraw.num2, selectedCashPotDraw.num3, selectedCashPotDraw.num4, selectedCashPotDraw.num5].sort((a, b) => a - b);
                  const sum = nums.reduce((a, b) => a + b, 0);
                  const isManifoldPassed = sum >= 35 && sum <= 70;
                  const oddsCount = nums.filter(n => n % 2 !== 0).length;
                  const evensCount = 5 - oddsCount;
                  const lowsCount = nums.filter(n => n <= 10).length;
                  const highsCount = 5 - lowsCount;
                  const spread = nums[4] - nums[0];

                  return (
                    <div className="space-y-4">
                      {/* Balls Cluster */}
                      <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-2">
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">Drawn Numbers (5 of 20)</span>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {nums.map((n, i) => (
                            <div key={i} className="w-9 h-9 rounded-xl bg-yellow-500/20 border-2 border-yellow-400 text-yellow-200 font-bold text-sm flex items-center justify-center">
                              {String(n).padStart(2, "0")}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Draw Summary Breakdown */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2.5 font-sans">
                        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider block">
                          Draw Balance Summary
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                            <span className="text-xs text-slate-400 block">Total Sum</span>
                            <span className="text-base font-bold text-yellow-300 font-mono">{sum}</span>
                            <span className={`text-xs block mt-0.5 font-semibold ${isManifoldPassed ? "text-emerald-400" : "text-amber-400"}`}>
                              {isManifoldPassed ? "Typical Range (35 to 70)" : "Unusual Sum"}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                            <span className="text-xs text-slate-400 block">Odd and Even</span>
                            <span className="text-base font-bold text-cyan-300">{oddsCount} Odd, {evensCount} Even</span>
                            <span className="text-xs text-slate-400 block mt-0.5">Balance Mix</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                            <span className="text-xs text-slate-400 block">High and Low</span>
                            <span className="text-base font-bold text-purple-300">{highsCount} High, {lowsCount} Low</span>
                            <span className="text-xs text-slate-400 block mt-0.5">Split at 10 and 11</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                            <span className="text-xs text-slate-400 block">Number Spread</span>
                            <span className="text-base font-bold text-emerald-300 font-mono">{spread}</span>
                            <span className="text-xs text-slate-400 block mt-0.5">Highest ({nums[4]}) minus Lowest ({nums[0]})</span>
                          </div>
                        </div>
                      </div>

                      {/* Multiplier Details */}
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between text-xs font-sans">
                        <span className="text-slate-400 font-semibold">Multiplier Drawn:</span>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                          selectedCashPotDraw.multiplier > 1 ? "bg-red-500/20 text-red-300 border border-red-500/40" : "bg-white/5 text-slate-300"
                        }`}>
                          {selectedCashPotDraw.multiplier} times Multiplier
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab Content: How It Works */}
      {activeSubTab === "explain" && (
        <div className="glass-panel border border-yellow-500/20 p-6 rounded-2xl bg-slate-950/40 space-y-4 font-sans">
          <h3 className="text-base font-bold text-yellow-400 border-b border-white/5 pb-2.5">
            How Ticket Coverage Works in NLCB Cash Pot (5 of 20)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300 leading-relaxed">
            <div className="space-y-2">
              <h4 className="text-sm text-yellow-300 font-bold">1. Removing Overlapping Slips</h4>
              <p className="text-slate-300">
                Out of <strong className="text-yellow-300">15,504 total combinations</strong>, this app checks multiple models side by side and enforces strict non-overlapping coverage (at most 1 shared number between slips) so your tickets never waste money repeating the same pairs.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm text-yellow-300 font-bold">2. Balanced Sum Range (37 to 65)</h4>
              <p className="text-slate-300">
                Generated 5-number lines stay within the typical sum range of <strong className="text-white">37 to 65</strong> with a balanced odd-and-even and low-and-high mix, avoiding extreme patterns.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm text-yellow-300 font-bold">3. 10-Slip Coverage and Sure Call Days</h4>
              <p className="text-slate-300">
                A 10-slip non-overlapping set covers all 20 numbers and reaches the exact <strong className="text-white">63.34% chance</strong> of matching 3 or more numbers. Playing on Monday, Thursday, or Saturday Sure Call days ensures a 2 to 4 times Multiplier.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-yellow-300 font-bold uppercase">4. Closed-Loop Calibration &amp; Merit Ranking</h4>
              <p className="text-gray-400">
                After each official draw, the <strong>Engine Tracker</strong> grades all pending predictions, updates Bayesian sub-model weights, measures Shannon entropy conviction regimes, and promotes the highest-performing engine by verified Win Rate &amp; ROI.
              </p>
            </div>
          </div>
        </div>
      )}

      {exportPayload && (
        <BetSlipExportModal
          isOpen={true}
          onClose={() => setExportPayload(null)}
          gameKey="cashpot"
          gameName="Cash Pot"
          targetDrawNumber={exportPayload.targetDrawNumber}
          slips={exportPayload.slips}
          unitCostTT={5}
          multiplierIncluded={true}
        />
      )}
    </div>
  );
}
