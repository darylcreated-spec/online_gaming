"use client";

import React, { useState, useEffect } from "react";
import { 
  Binary, 
  TrendingUp, 
  ShieldCheck, 
  RefreshCw, 
  Award, 
  Layers, 
  BarChart3, 
  CheckCircle2, 
  Cpu, 
  HelpCircle, 
  Copy, 
  Check, 
  ArrowRight, 
  Sigma,
  Zap,
  Filter,
  Search,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Diff35AnalysisResult, FormulaSet, VerificationEntry } from "@/lib/lotto_diff35_engine";

export default function LottoDiff35Panel() {
  const [data, setData] = useState<Diff35AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "3plus" | "2plus" | "1plus">("all");
  const [showTheory, setShowTheory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/lotto/diff35", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load Sum-35 quantitative data.");
      }
    } catch (err: any) {
      console.error("Error loading Sum-35 engine:", err);
      setError(err.message || "Network error loading Sum-35 engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopy = (id: string, nums: number[]) => {
    const text = nums.join(", ");
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4 glass-panel rounded-2xl border border-sky-500/20 bg-slate-950/60">
        <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm font-mono font-bold text-white tracking-widest uppercase">
            Executing Quantitative Sum-35 Engine
          </p>
          <p className="text-xs font-mono text-gray-400">
            Evaluating historical draws, additive inversions, parity flips &amp; backtesting 5 formula sets...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 glass-panel rounded-2xl border border-rose-500/30 bg-rose-950/20 text-center space-y-4">
        <div className="text-rose-400 font-mono font-bold text-sm">Engine Execution Failure</div>
        <p className="text-xs font-mono text-gray-300">{error || "Data unavailable"}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-xs hover:bg-rose-500/30 transition-all cursor-pointer"
        >
          Retry Calculation
        </button>
      </div>
    );
  }

  const { latestDraw, nextDrawPredictions, verification, mathematicalInvariants } = data;

  // Filter verification log
  const filteredAuditLog = verification.recentAuditLog.filter(entry => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDraw = entry.drawNumber.toString().includes(q);
      const matchDate = entry.drawDate.toLowerCase().includes(q);
      const matchNums = entry.actualNumbers.join(" ").includes(q);
      if (!matchDraw && !matchDate && !matchNums) return false;
    }

    if (selectedFilter === "3plus") return entry.bestHit >= 3;
    if (selectedFilter === "2plus") return entry.bestHit >= 2;
    if (selectedFilter === "1plus") return entry.bestHit >= 1;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-cyan-500/20 bg-slate-950/70 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                <Binary className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                QUANTITATIVE STATISTICAL ENGINE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Sigma className="w-3 h-3 text-emerald-400" />
                Sum-35 Additive Inversion
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                Excludes Powerball • Unordered Sets
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-white font-mono uppercase tracking-tight flex items-center gap-2">
              Sum-35 Difference Model &amp; Recurrent Formula Sets
            </h2>

            <p className="text-xs text-gray-400 font-mono max-w-3xl leading-relaxed">
              Maps every drawn ball <span className="text-cyan-300 font-bold">n_i</span> to its complement <span className="text-cyan-300 font-bold">d_i = 35 - n_i</span> across the 5 number positions. Inverts parity, enforces the <span className="text-emerald-400 font-bold">175 sum invariant</span>, and evaluates sliding 5-draw matrix resonance across <span className="text-white font-bold">{verification.totalDrawsTested} historical draws</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setShowTheory(!showTheory)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-300 font-mono text-xs flex items-center gap-1.5 hover:bg-cyan-500/10 hover:border-cyan-400/50 transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {showTheory ? "Hide Theory" : "Math Proof"}
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs flex items-center gap-1.5 hover:bg-cyan-500/20 hover:border-cyan-400/60 transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Recalculate
            </button>
          </div>
        </div>
      </div>

      {/* 2. Mathematical Theory / Proof Drawer */}
      {showTheory && (
        <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 bg-slate-950/80 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Sigma className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Mathematical Foundations &amp; Combinatorial Invariants
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400/80">Algebraic Group &#8484;&#8323;&#8325;</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-gray-300 leading-relaxed">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                1. Canonical Additive Involution
              </div>
              <p>
                In the Lotto Plus number field {"{1, ..., 35}"}, every number has a unique complement <span className="text-white font-bold">&#963;&#8323;&#8325;(x) = 35 - x</span> (with 35 mapping to 35). This transformation is an involution (<span className="text-white">&#963;&#8323;&#8325;(&#963;&#8323;&#8325;(x)) = x</span>), ensuring zero information loss and bijective mapping.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                <Sigma className="w-3.5 h-3.5 text-emerald-400" />
                2. Parity Inversion Theorem
              </div>
              <p>
                Because 35 is odd, <span className="text-white font-bold">35 - Odd = Even</span> and <span className="text-white font-bold">35 - Even = Odd</span>. A draw with 4 Odds / 1 Even strictly maps to 1 Odd / 4 Evens. This prevents parity lock and restores combinatorial equilibrium across sequential draws.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="text-purple-300 font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                3. The 175 Sum Invariant &amp; Gaussian Reversion
              </div>
              <p>
                Sum(D) + Sum(&#963;&#8323;&#8325;(D)) = 5 &#215; 35 = 175. The theoretical mean sum is <span className="text-white font-bold">&#956; = 90</span>. When a draw exceeds 90, its complement is strictly below 85, providing an exact mathematical anchor for mean-reverting candidate sets.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Latest Draw & Sum-35 Decomposition Card */}
      <div className="glass-panel p-6 rounded-2xl border border-sky-500/20 bg-slate-950/60 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Latest Official Database Draw
            </div>
            <div className="text-lg font-mono font-black text-white flex items-center gap-2 mt-0.5">
              <span>Draw #{latestDraw.drawNumber}</span>
              <span className="text-xs text-gray-500 font-normal">({latestDraw.drawDate})</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10">
              <span className="text-gray-400">Sum(Draw): </span>
              <span className="text-white font-bold">{latestDraw.sum}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10">
              <span className="text-gray-400">Sum(Comp): </span>
              <span className="text-cyan-300 font-bold">{latestDraw.complementSum}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
              Total Invariant: {latestDraw.sum + latestDraw.complementSum} / 175
            </div>
          </div>
        </div>

        {/* Visual Mapping: n_i -> d_i */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
            <span>Additive Decomposition Map: n_i + d_i = 35</span>
            <span className="text-[11px] text-cyan-400 font-normal">
              Parity Flip: {latestDraw.oddCount}O/{latestDraw.evenCount}E &#8594; {latestDraw.complementOddCount}O/{latestDraw.complementEvenCount}E
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {latestDraw.numbers.map((num, idx) => {
              const comp = latestDraw.complements[idx];
              const isEven = num % 2 === 0;
              return (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/20 flex flex-col items-center justify-center space-y-2 relative group hover:border-cyan-500/50 transition-all shadow-[0_0_15px_rgba(0,0,0,0.4)]"
                >
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Ball {idx + 1}</span>
                  
                  <div className="flex items-center gap-2">
                    {/* Actual Number */}
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/20 flex items-center justify-center text-sm font-mono font-black text-white shadow-inner">
                      {num}
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />

                    {/* Complement Difference */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-mono font-black text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                      {comp}
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-gray-400">
                    {num} + {comp} = <span className="text-cyan-300 font-bold">35</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Next Draw Prediction - 5 Formula Sets */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Mathematical Forecast
            </div>
            <h3 className="text-lg font-mono font-black text-white uppercase tracking-tight">
              5 Formula Sets for Next Draw #{nextDrawPredictions.targetDrawNumber}
            </h3>
          </div>

          <div className="text-xs font-mono text-gray-400">
            Combined Union Pool: <span className="text-white font-bold">{nextDrawPredictions.unionPoolSize} unique balls</span> ({nextDrawPredictions.unionPool.join(", ")})
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nextDrawPredictions.sets.map((set, idx) => {
            const isCopied = copiedId === set.id;
            return (
              <div 
                key={set.id}
                className="glass-panel p-5 rounded-2xl border border-white/10 bg-slate-950/60 flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-all relative group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase text-slate-950 bg-gradient-to-r ${set.badgeColor}`}>
                      {set.badge}
                    </span>
                    <button
                      onClick={() => handleCopy(set.id, set.numbers)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all cursor-pointer"
                      title="Copy Numbers"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div>
                    <h4 className="text-sm font-mono font-bold text-white tracking-wide">{set.name}</h4>
                    <p className="text-[10px] font-mono text-cyan-400/80">{set.subtitle}</p>
                  </div>

                  <p className="text-[11px] font-mono text-gray-400 leading-relaxed min-h-[38px]">
                    {set.description}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/5">
                  {/* Number Balls */}
                  <div className="flex items-center justify-center gap-2">
                    {set.numbers.map((n, i) => (
                      <div 
                        key={i}
                        className="w-10 h-10 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-center text-sm font-mono font-black text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)] group-hover:border-cyan-400 transition-all"
                      >
                        {n}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                    <span>Sum: <strong className="text-white">{set.sum}</strong></span>
                    <span>Parity: <strong className="text-white">{set.oddEvenRatio}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 6th Card: Super-Set Union Card */}
          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col justify-between space-y-4 hover:border-emerald-500/60 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-500">
                  WHEELING SUPER-SET
                </span>
                <button
                  onClick={() => handleCopy("union-pool", nextDrawPredictions.unionPool)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all cursor-pointer"
                  title="Copy Super-Set Pool"
                >
                  {copiedId === "union-pool" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div>
                <h4 className="text-sm font-mono font-bold text-white tracking-wide">5-Set Combined Pool</h4>
                <p className="text-[10px] font-mono text-emerald-400">Master Wheeling Candidate Selection</p>
              </div>

              <p className="text-[11px] font-mono text-gray-300 leading-relaxed">
                Contains all {nextDrawPredictions.unionPoolSize} unique balls from the 5 formula sets. Historically captured 3+ winning numbers in <strong className="text-emerald-300">{verification.unionCoverageRates.atLeastThree.percentage}%</strong> of all draws.
              </p>
            </div>

            <div className="pt-2 border-t border-emerald-500/20 space-y-2">
              <div className="flex flex-wrap gap-1.5 justify-center">
                {nextDrawPredictions.unionPool.map((n, i) => (
                  <span 
                    key={i}
                    className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center"
                  >
                    {n}
                  </span>
                ))}
              </div>
              <div className="text-center text-[10px] font-mono text-emerald-400/90 font-bold">
                Pool Size: {nextDrawPredictions.unionPoolSize} / 35 Balls
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Historical Verification Scorecard */}
      <div className="glass-panel p-6 rounded-2xl border border-sky-500/20 bg-slate-950/60 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
          <div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              Empirical Backtest Audit
            </div>
            <h3 className="text-lg font-mono font-black text-white uppercase tracking-tight">
              Historical Verification Across {verification.totalDrawsTested} Draws
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              Evaluated strictly out-of-sample: prior 5 draws used to forecast each historical draw.
            </p>
          </div>

          <div className="text-xs font-mono text-gray-400">
            Audit Range: <span className="text-white font-bold">{verification.dateRange.from}</span> to <span className="text-white font-bold">{verification.dateRange.to}</span>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase">Portfolio 1+ Match</span>
            <div className="text-2xl font-mono font-black text-cyan-300">
              {verification.bestTicketHitRates.atLeastOne.percentage}%
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {verification.bestTicketHitRates.atLeastOne.count} / {verification.totalDrawsTested} draws
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase">Portfolio 2+ Matches</span>
            <div className="text-2xl font-mono font-black text-emerald-300">
              {verification.bestTicketHitRates.atLeastTwo.percentage}%
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {verification.bestTicketHitRates.atLeastTwo.count} / {verification.totalDrawsTested} draws
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase">Prize Tier (3+ Hits)</span>
            <div className="text-2xl font-mono font-black text-amber-300">
              {verification.bestTicketHitRates.atLeastThree.percentage}%
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {verification.bestTicketHitRates.atLeastThree.count} exact ticket hits
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase">Pool 3+ Capture</span>
            <div className="text-2xl font-mono font-black text-purple-300">
              {verification.unionCoverageRates.atLeastThree.percentage}%
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {verification.unionCoverageRates.atLeastThree.count} / {verification.totalDrawsTested} in union
            </span>
          </div>
        </div>

        {/* Interactive Verification Audit Log Table */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Historical Draw Verification Log (Recent Draws)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search draw # or date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 w-44"
                />
              </div>

              {/* Hit Filter Buttons */}
              <div className="flex rounded-lg bg-slate-900 p-0.5 border border-white/10">
                <button
                  onClick={() => setSelectedFilter("all")}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded-md transition-all cursor-pointer ${
                    selectedFilter === "all" ? "bg-cyan-500 text-slate-950 font-bold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  All ({verification.recentAuditLog.length})
                </button>
                <button
                  onClick={() => setSelectedFilter("3plus")}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded-md transition-all cursor-pointer ${
                    selectedFilter === "3plus" ? "bg-amber-500 text-slate-950 font-bold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  3+ Hits
                </button>
                <button
                  onClick={() => setSelectedFilter("2plus")}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded-md transition-all cursor-pointer ${
                    selectedFilter === "2plus" ? "bg-emerald-500 text-slate-950 font-bold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  2+ Hits
                </button>
                <button
                  onClick={() => setSelectedFilter("1plus")}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded-md transition-all cursor-pointer ${
                    selectedFilter === "1plus" ? "bg-cyan-500/30 text-cyan-300 font-bold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  1+ Hits
                </button>
              </div>
            </div>
          </div>

          {/* Audit Table */}
          <div className="overflow-x-auto sleek-scrollbar rounded-xl border border-white/5">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/90 text-gray-400 uppercase text-[10px] border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">Draw #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Actual Winning Set</th>
                  <th className="py-2.5 px-3">Best Formula Ticket</th>
                  <th className="py-2.5 px-3 text-center">Ticket Hits</th>
                  <th className="py-2.5 px-3 text-center">Union Pool</th>
                  <th className="py-2.5 px-3 text-right">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {filteredAuditLog.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No draws match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLog.map((row) => {
                    const actualSet = new Set(row.actualNumbers);

                    return (
                      <tr key={row.drawNumber} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white">#{row.drawNumber}</td>
                        <td className="py-2.5 px-3 text-gray-400">{row.drawDate}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            {row.actualNumbers.map((n, i) => (
                              <span 
                                key={i}
                                className="w-6 h-6 rounded bg-slate-800 text-white font-bold flex items-center justify-center text-[11px]"
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-cyan-300 font-bold">{row.bestSetName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                            row.bestHit >= 3 
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" 
                              : (row.bestHit === 2 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-cyan-500/10 text-cyan-300")
                          }`}>
                            {row.bestHit} / 5
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-400">
                          {row.unionHits} / 5 ({row.unionSize} balls)
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {row.bestHit >= 3 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">
                              PRIZE TIER WIN
                            </span>
                          ) : row.bestHit === 2 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                              2-BALL MATCH
                            </span>
                          ) : row.bestHit === 1 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] text-cyan-400 bg-cyan-500/10">
                              1-BALL MATCH
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] text-gray-500 bg-slate-800">
                              NO MATCH
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
