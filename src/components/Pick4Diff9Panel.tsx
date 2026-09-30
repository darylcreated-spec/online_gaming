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
  Sparkles, 
  HelpCircle, 
  Copy, 
  Check, 
  ArrowRight, 
  Sigma,
  Zap,
  Filter,
  Search,
  Clock
} from "lucide-react";
import { Pick4Diff9AnalysisResult, Pick4FormulaSet, Pick4VerificationEntry } from "@/lib/pick4_diff9_engine";

export default function Pick4Diff9Panel() {
  const [data, setData] = useState<Pick4Diff9AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "4win" | "3plus" | "2plus" | "1plus">("all");
  const [showTheory, setShowTheory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/pick4/diff9", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load Pick 4 Sum-9 quantitative data.");
      }
    } catch (err: any) {
      console.error("Error loading Pick 4 Sum-9 engine:", err);
      setError(err.message || "Network error loading Pick 4 Sum-9 engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopy = (id: string, digits: number[]) => {
    const text = digits.join(" - ");
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4 glass-panel rounded-2xl border border-purple-500/20 bg-slate-950/60">
        <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm font-mono font-bold text-white tracking-widest uppercase">
            Executing Pick 4 Sum-9 Quantitative Engine
          </p>
          <p className="text-xs font-mono text-gray-400">
            Evaluating 9's complement inversions, parity flips, multiset Box matches &amp; 4-set backtest...
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
      const matchSlot = entry.drawTimeSlot.toLowerCase().includes(q);
      const matchDigits = entry.actualDigits.join("").includes(q);
      if (!matchDraw && !matchDate && !matchSlot && !matchDigits) return false;
    }

    if (selectedFilter === "4win") return entry.bestHit === 4;
    if (selectedFilter === "3plus") return entry.bestHit >= 3;
    if (selectedFilter === "2plus") return entry.bestHit >= 2;
    if (selectedFilter === "1plus") return entry.bestHit >= 1;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-purple-500/20 bg-slate-950/70 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                <Binary className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                QUANTITATIVE STATISTICAL ENGINE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Sigma className="w-3 h-3 text-emerald-400" />
                Radix 9's Complement
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                Sequence Invariant • Box Combinatorics
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-white font-mono uppercase tracking-tight flex items-center gap-2">
              Pick 4 Sum-9 Difference Model &amp; 4-Set Prediction
            </h2>

            <p className="text-xs text-gray-400 font-mono max-w-3xl leading-relaxed">
              Maps every drawn digit <span className="text-purple-300 font-bold">x_i</span> to its complement <span className="text-purple-300 font-bold">d_i = 9 - x_i</span> across the 4 digits. Inverts parity, enforces the <span className="text-emerald-400 font-bold">36 sum invariant</span>, and evaluates sliding 4-draw matrix recurrence across <span className="text-white font-bold">{verification.totalDrawsTested} historical draws</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setShowTheory(!showTheory)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-purple-500/30 text-purple-300 font-mono text-xs flex items-center gap-1.5 hover:bg-purple-500/10 hover:border-purple-400/50 transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {showTheory ? "Hide Theory" : "Math Proof"}
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs flex items-center gap-1.5 hover:bg-purple-500/20 hover:border-purple-400/60 transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.15)] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Recalculate
            </button>
          </div>
        </div>
      </div>

      {/* 2. Mathematical Theory / Proof Drawer */}
      {showTheory && (
        <div className="glass-panel p-6 rounded-2xl border border-purple-500/30 bg-slate-950/80 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Sigma className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Pick 4 Mathematical Foundations &amp; Combinatorial Invariants
              </h3>
            </div>
            <span className="text-[10px] font-mono text-purple-400/80">Decimal Radix-Minus-One Involution</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-gray-300 leading-relaxed">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="text-purple-300 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                1. 9's Complement Involution
              </div>
              <p>
                In decimal arithmetic {"{0, 1, ..., 9}"}, every digit maps to its 9's complement <span className="text-white font-bold">&#963;&#8329;(x) = 9 - x</span>. Because <span className="text-white">&#963;&#8329;(&#963;&#8329;(x)) = x</span>, the transformation is a bijective involution with zero information loss, pairing digits into symmetrical duals: (0&#8596;9, 1&#8596;8, 2&#8596;7, 3&#8596;6, 4&#8596;5).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                <Sigma className="w-3.5 h-3.5 text-emerald-400" />
                2. Parity Inversion Theorem
              </div>
              <p>
                Because 9 is odd, <span className="text-white font-bold">9 - Odd = Even</span> and <span className="text-white font-bold">9 - Even = Odd</span>. A draw with 3 Evens / 1 Odd strictly inverts into 1 Even / 3 Odds across all 4 positions (verified in <span className="text-emerald-400 font-bold">100% of draws</span>).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                3. The 36 Sum Invariant &amp; Box Play
              </div>
              <p>
                Sum(D) + Sum(&#963;&#8329;(D)) = 4 &#215; 9 = 36. Since sequence does not matter in Box play, combinations are evaluated as multisets across 24-Way, 12-Way, 6-Way, 4-Way, and 1-Way permutations, clustering probability mass into high-yield zones.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Latest Draw & Sum-9 Decomposition Card */}
      <div className="glass-panel p-6 rounded-2xl border border-purple-500/20 bg-slate-950/60 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div>
            <div className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              Latest Official Database Draw
            </div>
            <div className="text-lg font-mono font-black text-white flex items-center gap-2 mt-0.5">
              <span>Draw #{latestDraw.drawNumber}</span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
                {latestDraw.drawTimeSlot}
              </span>
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
              <span className="text-purple-300 font-bold">{latestDraw.complementSum}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
              Total Invariant: {latestDraw.sum + latestDraw.complementSum} / 36
            </div>
          </div>
        </div>

        {/* Visual Mapping: x_i -> d_i */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
            <span>9's Complement Decomposition: x_i + d_i = 9</span>
            <span className="text-[11px] text-purple-400 font-normal">
              Parity Flip: {latestDraw.oddCount}O/{latestDraw.evenCount}E &#8594; {latestDraw.complementOddCount}O/{latestDraw.complementEvenCount}E
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {latestDraw.digits.map((digit, idx) => {
              const comp = latestDraw.complements[idx];
              return (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/70 border border-purple-500/20 flex flex-col items-center justify-center space-y-2 relative group hover:border-purple-500/50 transition-all shadow-[0_0_15px_rgba(0,0,0,0.4)]"
                >
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Digit {idx + 1}</span>
                  
                  <div className="flex items-center gap-2">
                    {/* Actual Digit */}
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/20 flex items-center justify-center text-base font-mono font-black text-white shadow-inner">
                      {digit}
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-purple-400 animate-pulse" />

                    {/* Complement Difference */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-base font-mono font-black text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                      {comp}
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-gray-400">
                    {digit} + {comp} = <span className="text-purple-300 font-bold">9</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Next Draw Prediction - 4 Formula Sets */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Mathematical Forecast (Sequence Invariant Box Play)
            </div>
            <h3 className="text-lg font-mono font-black text-white uppercase tracking-tight flex items-center gap-2">
              <span>4 Formula Sets for Next Draw #{nextDrawPredictions.targetDrawNumber}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                {nextDrawPredictions.targetSlot}
              </span>
            </h3>
          </div>

          <div className="text-xs font-mono text-gray-400">
            Combined Union Pool: <span className="text-white font-bold">{nextDrawPredictions.unionPoolSize} unique digits</span> ({nextDrawPredictions.unionPool.join(", ")})
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {nextDrawPredictions.sets.map((set) => {
            const isCopied = copiedId === set.id;
            return (
              <div 
                key={set.id}
                className="glass-panel p-5 rounded-2xl border border-white/10 bg-slate-950/60 flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition-all relative group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase text-white bg-gradient-to-r ${set.badgeColor}`}>
                      {set.badge}
                    </span>
                    <button
                      onClick={() => handleCopy(set.id, set.digits)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all cursor-pointer"
                      title="Copy Digits"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div>
                    <h4 className="text-sm font-mono font-bold text-white tracking-wide">{set.name}</h4>
                    <p className="text-[10px] font-mono text-purple-400/80">{set.subtitle}</p>
                  </div>

                  <p className="text-[11px] font-mono text-gray-400 leading-relaxed min-h-[38px]">
                    {set.description}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/5">
                  {/* Digits Display */}
                  <div className="flex items-center justify-center gap-2">
                    {set.digits.map((d, i) => (
                      <div 
                        key={i}
                        className="w-10 h-10 rounded-xl bg-slate-900 border border-purple-500/30 flex items-center justify-center text-base font-mono font-black text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.15)] group-hover:border-purple-400 transition-all"
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                    <span>Sum: <strong className="text-white">{set.sum}</strong></span>
                    <span>Box: <strong className="text-purple-300">{set.boxType}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Super-Set Union Card */}
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-500">
                WHEELING SUPER-POOL
              </span>
              <span className="text-xs font-mono font-bold text-white">4-Set Combined Candidate Pool</span>
            </div>
            <p className="text-[11px] font-mono text-gray-300">
              Captures &#8805; 3 winning digits in <strong className="text-emerald-300">{verification.unionCoverageRates.atLeastThree.percentage}%</strong> of all draws, and <strong className="text-emerald-300">ALL 4 WINNING DIGITS</strong> in <strong className="text-emerald-300">{verification.unionCoverageRates.allFour.percentage}%</strong> of all draws.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1.5 justify-center">
              {nextDrawPredictions.unionPool.map((d, i) => (
                <span 
                  key={i}
                  className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-sm flex items-center justify-center shadow-inner"
                >
                  {d}
                </span>
              ))}
            </div>

            <button
              onClick={() => handleCopy("union-pool", nextDrawPredictions.unionPool)}
              className="p-2 rounded-xl bg-slate-900 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all cursor-pointer"
              title="Copy Union Digits"
            >
              {copiedId === "union-pool" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Historical Verification Scorecard */}
      <div className="glass-panel p-6 rounded-2xl border border-purple-500/20 bg-slate-950/60 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
          <div>
            <div className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-purple-400" />
              Empirical Backtest Audit (Unordered Box Play)
            </div>
            <h3 className="text-lg font-mono font-black text-white uppercase tracking-tight">
              Historical Verification Across {verification.totalDrawsTested} Consecutive Draws
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              Evaluated strictly out-of-sample: prior 4 draws used to forecast each historical draw.
            </p>
          </div>

          <div className="text-xs font-mono text-gray-400">
            Audit Range: <span className="text-white font-bold">{verification.dateRange.from}</span> to <span className="text-white font-bold">{verification.dateRange.to}</span>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase">Portfolio 1+ Match</span>
            <div className="text-2xl font-mono font-black text-purple-300">
              {verification.bestTicketHitRates.atLeastOne.percentage}%
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {verification.bestTicketHitRates.atLeastOne.count} / {verification.totalDrawsTested} draws
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase">Portfolio 2+ Matches</span>
            <div className="text-2xl font-mono font-black text-cyan-300">
              {verification.bestTicketHitRates.atLeastTwo.percentage}%
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {verification.bestTicketHitRates.atLeastTwo.count} / {verification.totalDrawsTested} draws
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase">3-Digit Box Match</span>
            <div className="text-2xl font-mono font-black text-amber-300">
              {verification.bestTicketHitRates.atLeastThree.percentage}%
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {verification.bestTicketHitRates.atLeastThree.count} ticket hits
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase">Pool 3+ Capture</span>
            <div className="text-2xl font-mono font-black text-emerald-300">
              {verification.unionCoverageRates.atLeastThree.percentage}%
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {verification.unionCoverageRates.atLeastThree.count} in union
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase">Pool 4/4 Capture</span>
            <div className="text-2xl font-mono font-black text-pink-300">
              {verification.unionCoverageRates.allFour.percentage}%
            </div>
            <span className="text-[10px] font-mono text-gray-500">
              {verification.unionCoverageRates.allFour.count} draws
            </span>
          </div>
        </div>

        {/* Interactive Verification Audit Log Table */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Pick 4 Historical Verification Audit Log
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search draw, slot, date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 w-44"
                />
              </div>

              {/* Hit Filter Buttons */}
              <div className="flex rounded-lg bg-slate-900 p-0.5 border border-white/10">
                <button
                  onClick={() => setSelectedFilter("all")}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded-md transition-all cursor-pointer ${
                    selectedFilter === "all" ? "bg-purple-500 text-slate-950 font-bold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  All ({verification.recentAuditLog.length})
                </button>
                <button
                  onClick={() => setSelectedFilter("4win")}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded-md transition-all cursor-pointer ${
                    selectedFilter === "4win" ? "bg-pink-500 text-slate-950 font-bold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  4/4 Win
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
                    selectedFilter === "2plus" ? "bg-cyan-500 text-slate-950 font-bold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  2+ Hits
                </button>
                <button
                  onClick={() => setSelectedFilter("1plus")}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded-md transition-all cursor-pointer ${
                    selectedFilter === "1plus" ? "bg-purple-500/30 text-purple-300 font-bold" : "text-gray-400 hover:text-white"
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
                  <th className="py-2.5 px-3">Slot / Date</th>
                  <th className="py-2.5 px-3">Actual Winning Digits</th>
                  <th className="py-2.5 px-3">Best Formula Ticket</th>
                  <th className="py-2.5 px-3 text-center">Ticket Match</th>
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
                  filteredAuditLog.map((row) => (
                    <tr key={row.drawNumber} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-white">#{row.drawNumber}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className="text-purple-300 font-bold text-[11px]">{row.drawTimeSlot}</span>
                          <span className="text-[10px] text-gray-500">{row.drawDate}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          {row.actualDigits.map((d, i) => (
                            <span 
                              key={i}
                              className="w-6 h-6 rounded bg-slate-800 text-white font-bold flex items-center justify-center text-[11px]"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-purple-300 font-bold">{row.bestSetName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                          row.bestHit === 4
                            ? "bg-pink-500 text-slate-950 font-black"
                            : (row.bestHit === 3 
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" 
                              : (row.bestHit === 2 ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-purple-500/10 text-purple-300"))
                        }`}>
                          {row.bestHit} / 4
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-400">
                        {row.unionHits} / 4 ({row.unionSize} digits)
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {row.bestHit === 4 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-pink-500 text-slate-950">
                            4/4 EXACT BOX WIN
                          </span>
                        ) : row.bestHit === 3 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40">
                            3-DIGIT MATCH
                          </span>
                        ) : row.bestHit === 2 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] text-cyan-300 bg-cyan-500/10">
                            2-DIGIT MATCH
                          </span>
                        ) : row.bestHit === 1 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] text-purple-400 bg-purple-500/10">
                            1-DIGIT MATCH
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] text-gray-500 bg-slate-800">
                            NO MATCH
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
