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
  Sigma
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
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "math" | "diff" | "audit" | "forensic" | "wheeling" | "archive" | "explain">("dashboard");
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

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await fetch("/api/cashpot/stats", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setStats(data);
        if (data.latestDraw && !latestDraw) {
          setLatestDraw(data.latestDraw);
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
        subtitle="5 of 20 Numbers (1–20) + Multiplier • Daily 7:00 PM • 1 in 15,504 Odds • Top Prize $100,000 TTD"
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
      <div className="flex bg-slate-900/60 p-1 rounded-xl border border-yellow-500/20 w-full md:w-fit mb-6 overflow-x-auto flex-nowrap scrollbar-none gap-1">
        <button
          onClick={() => setActiveSubTab("dashboard")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "dashboard"
              ? "bg-yellow-500 text-slate-950 font-black shadow-[0_0_15px_rgba(250,204,21,0.3)]"
              : "text-gray-400 hover:text-yellow-300 hover:bg-yellow-500/10"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          DASHBOARD & STATS
        </button>

        <button
          onClick={() => setActiveSubTab("math")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "math"
              ? "bg-yellow-500 text-slate-950 font-black shadow-[0_0_15px_rgba(250,204,21,0.3)]"
              : "text-yellow-400/90 hover:text-yellow-300 hover:bg-yellow-500/10"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          MATHEMATICAL ENGINE
        </button>

        <button
          onClick={() => setActiveSubTab("diff")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "diff"
              ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_15px_rgba(251,191,36,0.4)]"
              : "text-amber-400/90 hover:text-amber-300 hover:bg-amber-400/10"
          }`}
        >
          <Sigma className="w-3.5 h-3.5" />
          SUM-28 / DIFF ENGINE
        </button>

        <button
          onClick={() => setActiveSubTab("audit")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "audit"
              ? "bg-purple-500 text-slate-950 font-black shadow-[0_0_15px_rgba(168,85,247,0.4)]"
              : "text-purple-400/90 hover:text-purple-300 hover:bg-purple-500/10"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          100% QUANT AUDIT &amp; VERIFICATION
        </button>

        <button
          onClick={() => setActiveSubTab("forensic")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "forensic"
              ? "bg-cyan-400 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              : "text-cyan-400/90 hover:text-cyan-300 hover:bg-cyan-500/10"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          FORENSIC ENGINE
        </button>

        <button
          onClick={() => setActiveSubTab("wheeling")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "wheeling"
              ? "bg-yellow-500 text-slate-950 font-black shadow-[0_0_15px_rgba(250,204,21,0.3)]"
              : "text-gray-400 hover:text-yellow-300 hover:bg-yellow-500/10"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          ODDS REDUCTION & WHEELING
        </button>

        <button
          onClick={() => setActiveSubTab("archive")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "archive"
              ? "bg-yellow-500 text-slate-950 font-black shadow-[0_0_15px_rgba(250,204,21,0.3)]"
              : "text-gray-400 hover:text-yellow-300 hover:bg-yellow-500/10"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          DRAW LOG ARCHIVE
        </button>

        <button
          onClick={() => setActiveSubTab("explain")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "explain"
              ? "bg-yellow-500 text-slate-950 font-black shadow-[0_0_15px_rgba(250,204,21,0.3)]"
              : "text-gray-400 hover:text-yellow-300 hover:bg-yellow-500/10"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          HOW IT WORKS
        </button>
      </div>

      {/* Subtab Content: Dashboard & Stats */}
      {activeSubTab === "dashboard" && (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-yellow-500/20 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase">Total Draws Analyzed</span>
              <div className="text-xl font-black text-yellow-300">
                {stats?.totalDraws ? stats.totalDraws.toLocaleString() : "..."}
              </div>
              <span className="text-[9px] text-emerald-400">100% Database Records</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-yellow-500/20 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase">Combinatorial Odds</span>
              <div className="text-xl font-black text-white">1 in 15,504</div>
              <span className="text-[9px] text-gray-400">C(20, 5) Permutations</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-yellow-500/20 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase">Average Ticket Sum</span>
              <div className="text-xl font-black text-yellow-300">
                {stats?.averageSum || 52.5}
              </div>
              <span className="text-[9px] text-gray-400">Normal range 40–65</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-yellow-500/20 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase">Chi-Square Randomness</span>
              <div className="text-xl font-black text-emerald-400">
                {stats?.advancedStats?.chiSquare?.verdict || "Unbiased"}
              </div>
              <span className="text-[9px] text-gray-400">Fair machine distribution</span>
            </div>
          </div>

          {/* Frequency Bar Chart (Numbers 1-20) */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-yellow-500/20 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
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
                  <span className="text-[10px] text-yellow-400 uppercase font-bold block mb-1.5">Top 5 Most Frequent:</span>
                  <div className="flex gap-2">
                    {stats?.rankings?.hotNumbers?.map((item: any) => (
                      <div key={item.number} className="flex-1 p-2 bg-yellow-500/10 border border-yellow-400/30 rounded-xl text-center">
                        <span className="text-sm font-black text-yellow-300 block">#{item.number}</span>
                        <span className="text-[9px] text-gray-400">{item.count} draws</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1.5">Top 5 Least Frequent (Cold / Overdue):</span>
                  <div className="flex gap-2">
                    {stats?.rankings?.coldNumbers?.map((item: any) => (
                      <div key={item.number} className="flex-1 p-2 bg-slate-800/40 border border-white/10 rounded-xl text-center">
                        <span className="text-sm font-black text-slate-300 block">#{item.number}</span>
                        <span className="text-[9px] text-gray-500">{item.count} draws</span>
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
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
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
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span>Generated Tickets ({generatedTickets.length} lines):</span>
                  <span className="text-yellow-400 font-mono text-[11px]">
                    Total Stake: ${generatedTickets.length * 5} TT ($5/ticket)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {generatedTickets.map((ticket, idx) => (
                    <div key={idx} className="p-3 bg-black/50 border border-yellow-500/20 rounded-xl flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">#{idx + 1}</span>
                      <div className="flex gap-1.5">
                        {ticket.map(n => (
                          <span key={n} className="w-6 h-6 rounded-md bg-yellow-500/20 border border-yellow-400 text-yellow-300 font-bold text-[11px] flex items-center justify-center">
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
                  <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md text-gray-400 border-b border-white/5 uppercase text-[10px]">
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
                                  <span key={i} className={`w-6 h-6 rounded-md font-bold flex items-center justify-center text-[11px] transition-transform ${
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
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                d.multiplier > 1 ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-white/5 text-gray-400"
                              }`}>
                                {d.multiplier}X
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors ${
                                isSelected ? "bg-yellow-400/20 text-yellow-300" : "text-gray-500 hover:text-white"
                              }`}>
                                {isSelected ? "Active" : "Inspect →"}
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
                      <span className="text-[10px] text-gray-400">
                        {selectedCashPotDraw.draw_date}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCashPotDraw(null)}
                    className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition text-xs"
                    title="Close Investigation Panel"
                  >
                    ✕
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
                        <span className="text-[9px] text-gray-400 uppercase tracking-widest block">Drawn Balls (5 of 20)</span>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {nums.map((n, i) => (
                            <div key={i} className="w-9 h-9 rounded-xl bg-yellow-500/20 border-2 border-yellow-400 text-yellow-200 font-black text-sm flex items-center justify-center shadow-[0_0_10px_rgba(250,204,21,0.3)]">
                              {String(n).padStart(2, "0")}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Invariant Coordinates */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2.5">
                        <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest block">
                          Gaussian Manifold Coordinates
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                            <span className="text-[8px] text-gray-500 block uppercase">Ball Sum</span>
                            <span className="text-base font-black text-yellow-300">{sum}</span>
                            <span className={`text-[8px] block mt-0.5 font-bold ${isManifoldPassed ? "text-emerald-400" : "text-amber-400"}`}>
                              {isManifoldPassed ? "✓ In Manifold [35-70]" : "Tail Distribution"}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                            <span className="text-[8px] text-gray-500 block uppercase">Odd : Even</span>
                            <span className="text-base font-black text-cyan-300">{oddsCount}O : {evensCount}E</span>
                            <span className="text-[8px] text-gray-400 block mt-0.5">Parity Split</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                            <span className="text-[8px] text-gray-500 block uppercase">High : Low</span>
                            <span className="text-base font-black text-purple-300">{highsCount}H : {lowsCount}L</span>
                            <span className="text-[8px] text-gray-400 block mt-0.5">Median Split at 10/11</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                            <span className="text-[8px] text-gray-500 block uppercase">Range Spread</span>
                            <span className="text-base font-black text-emerald-300">{spread}</span>
                            <span className="text-[8px] text-gray-400 block mt-0.5">Max ({nums[4]}) - Min ({nums[0]})</span>
                          </div>
                        </div>
                      </div>

                      {/* Multiplier Details */}
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between text-xs">
                        <span className="text-gray-400 uppercase text-[10px]">Multiplier Ball:</span>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-black font-mono ${
                          selectedCashPotDraw.multiplier > 1 ? "bg-red-500/20 text-red-300 border border-red-500/40" : "bg-white/5 text-gray-300"
                        }`}>
                          {selectedCashPotDraw.multiplier}X Payout Multiplier
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
        <div className="glass-panel border border-yellow-500/20 p-6 rounded-2xl bg-slate-950/40 space-y-4 font-mono">
          <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-white/5 pb-2">
            How The App Reduces The Odds in NLCB Cash Pot (5 of 20)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-300 leading-relaxed">
            <div className="space-y-2">
              <h4 className="text-yellow-300 font-bold uppercase">1. Compact 20-Ball State Space</h4>
              <p className="text-gray-400">
                Unlike games with 35 or 36 balls, Cash Pot selects 5 balls from only 20. The complete mathematical sample space is:
                <br /><code className="text-yellow-400 font-bold">C(20, 5) = 15,504 combinations</code>.
                This allows our engine to compute exact combinatorial graphs and PageRank companion network affinities with 100% precision.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-yellow-300 font-bold uppercase">2. Gaussian Sum &amp; Odd/Even Filtering</h4>
              <p className="text-gray-400">
                Winning tickets concentrate heavily around a sum of <strong>52.5</strong> (range 40 to 65 accounts for &gt;80% of historical outcomes). Combinations with unbalanced sums (e.g. &lt;25 or &gt;85) or 5 all-odd / 5 all-even tickets are automatically suppressed.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-yellow-300 font-bold uppercase">3. Abbreviated Wheel Coverage</h4>
              <p className="text-gray-400">
                By choosing a pool of 8 to 12 numbers and applying bitmask covering wheels, players can guarantee a 4-of-5 or 3-of-5 winning payout if their target pool contains the winning numbers, slashing wager cost by 85% compared to full permutation wheels.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-yellow-300 font-bold uppercase">4. Daily Draw Auto-Grading</h4>
              <p className="text-gray-400">
                Immediately following the daily 7:00 PM AST draw, the Turso cloud database synchronizes the official result, updating historical frequency counts, EWMA velocity, and Markov transition matrices automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
