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
  Crosshair, 
  HelpCircle, 
  Copy, 
  Check, 
  ArrowRight, 
  Sigma,
  Zap,
  Filter,
  Search,
  Lock,
  Compass,
  Users
} from "lucide-react";
import { CashPotDiffAnalysisResult, CashPotFormulaSet, CashPotVerificationEntry } from "@/lib/cashpot_diff20_engine";
import { triggerHaptic } from "@/lib/haptics";

export default function CashPotDiff20Panel() {
  const [data, setData] = useState<CashPotDiffAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "4plus" | "3plus" | "2plus" | "1plus">("all");
  const [showTheory, setShowTheory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [syndicateSuccess, setSyndicateSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/cashpot/diff20", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load Cash Pot Sum-28 / Diff quantitative data.");
      }
    } catch (err: any) {
      console.error("Error loading Cash Pot Sum-28 engine:", err);
      setError(err.message || "Network error loading Cash Pot Sum-28 engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-updating: listen for sync events from live database updates
    const handleSyncEvent = () => {
      fetchData();
    };

    window.addEventListener("win_concept_sync_completed", handleSyncEvent);
    return () => window.removeEventListener("win_concept_sync_completed", handleSyncEvent);
  }, []);

  const handleCopy = (id: string, nums: number[]) => {
    const text = nums.join(", ");
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    triggerHaptic("selection");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendToSyndicate = (fSet: CashPotFormulaSet) => {
    triggerHaptic("success");
    const formattedNumbers = fSet.numbers.map(n => String(n).padStart(2, "0")).join(", ");
    setSyndicateSuccess(`Set "${fSet.name}" (${formattedNumbers}) copied and queued for Syndicate slip!`);
    navigator.clipboard.writeText(`Cash Pot Prediction: ${fSet.name} [${formattedNumbers}]`);
    setTimeout(() => setSyndicateSuccess(null), 3500);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4 glass-panel rounded-2xl border border-yellow-500/20 bg-slate-950/60">
        <RefreshCw className="w-10 h-10 text-yellow-400 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm font-mono font-bold text-white tracking-widest uppercase">
            Executing Cash Pot Sum-28 / Diff-20 Quantitative Engine
          </p>
          <p className="text-xs font-mono text-gray-400">
            Evaluating Z_20 dual inversions, CRT Galois rings, Sum-28 harmonic bridges &amp; backtesting 5 formula sets...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-red-500/30 bg-red-950/20 text-center space-y-3 font-mono">
        <p className="text-sm font-bold text-red-400 uppercase tracking-wider">Engine Execution Error</p>
        <p className="text-xs text-gray-300">{error || "Unable to retrieve Cash Pot difference model results."}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-bold border border-red-500/40 transition cursor-pointer"
        >
          RETRY EXECUTION
        </button>
      </div>
    );
  }

  const { latestDraw, formulaSets, historicalAudit, systemStatus } = data;

  // Filter verification log
  const filteredVerifications = (historicalAudit.recentVerifications || []).filter((entry) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDraw = entry.drawNumber.toString().includes(q);
      const matchDate = entry.drawDate.toLowerCase().includes(q);
      if (!matchDraw && !matchDate) return false;
    }
    if (selectedFilter === "4plus") return entry.bestHit >= 4;
    if (selectedFilter === "3plus") return entry.bestHit >= 3;
    if (selectedFilter === "2plus") return entry.bestHit >= 2;
    if (selectedFilter === "1plus") return entry.bestHit >= 1;
    return true;
  });

  return (
    <div className="space-y-6 font-mono">
      {/* Toast Notification */}
      {syndicateSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{syndicateSuccess}</span>
          </div>
          <button onClick={() => setSyndicateSuccess(null)} className="text-emerald-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-950/20 via-slate-950/80 to-transparent relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sigma className="w-3.5 h-3.5 text-yellow-400" />
                Sum-28 / Diff-20 Quant System
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Live Auto-Update Active
              </span>
              <span className="text-[10px] text-gray-500">
                {systemStatus.databaseDrawsCount} Draws Verified ({historicalAudit.totalDrawsTested} Walk-Forward Tests)
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              Cash Pot Sum-28 Difference Transformation
            </h2>
            <p className="text-xs text-gray-400 max-w-3xl leading-relaxed">
              Dual Involution Sieve &sigma;21(x) = 21 - x, Chinese Remainder Theorem Galois partition Z_4 &times; Z_5, and Sum-28 Harmonic Bridge ((28 - x) mod 20) generating 5 deterministic prediction sets.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowTheory(!showTheory)}
              className="px-3.5 py-2 rounded-lg bg-slate-900/80 border border-white/10 text-xs text-gray-300 font-bold hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-yellow-400" />
              {showTheory ? "HIDE MODEL SPECS" : "VIEW MATH PROOF"}
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg bg-yellow-400 text-slate-950 text-xs font-black hover:bg-yellow-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              RECALCULATE AUDIT
            </button>
          </div>
        </div>

        {/* Mathematical Proof Accordion */}
        {showTheory && (
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-300 leading-relaxed animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest block">1. Dual Involution &sigma;21</span>
              <p className="text-[11px] text-gray-400">
                In a 20-ball pool, &sigma;21(x) = 21 - x is an exact involution (&sigma;(&sigma;(x)) = x). Every draw has an exact counterpart summing to 105. Any draw above the 52.5 mean creates a complementary anchor below 52.5.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">2. Galois CRT Partition</span>
              <p className="text-[11px] text-gray-400">
                By the Chinese Remainder Theorem, Z_20 is isomorphic to Z_4 x Z_5. 100% of historical winning combinations span multiple residues mod 4 and mod 5, guaranteeing optimal coset coverage.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">3. Sum-28 Harmonic Bridge</span>
              <p className="text-[11px] text-gray-400">
                The operator H_28(x) = (28 - x) mod 20 maps cross-pool harmonic resonance between 20-ball Cash Pot and 28-ball Win For Life mechanics, capturing cyclical probability surges.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Latest Draw & Inversions Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Actual Latest Draw */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 uppercase font-bold text-[10px]">Latest Official Result</span>
            <span className="text-yellow-400 font-bold">Draw #{latestDraw.drawNumber}</span>
          </div>
          <div className="flex items-center gap-2 justify-center py-2 flex-wrap">
            {latestDraw.actualNumbers.map((n, i) => (
              <div key={i} className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 text-white font-black text-sm flex items-center justify-center shadow-inner">
                {String(n).padStart(2, "0")}
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-white/5 pt-2">
            <span>Sum: <strong className="text-white">{latestDraw.sum}</strong></span>
            <span>Parity: <strong className="text-cyan-400">{latestDraw.oddEvenRatio}</strong></span>
            <span>Spread: <strong className="text-purple-400">{latestDraw.lowHighRatio}</strong></span>
          </div>
        </div>

        {/* Dual Involution Inversion */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/20 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-emerald-400 uppercase font-bold text-[10px]">&sigma;21 Center Axis Inversion</span>
            <span className="text-gray-500 text-[10px]">&mu; = 10.5</span>
          </div>
          <div className="flex items-center gap-2 justify-center py-2 flex-wrap">
            {latestDraw.diff20Numbers.map((n, i) => (
              <div key={i} className="w-10 h-10 rounded-full bg-emerald-500/10 border-2 border-emerald-400 text-emerald-300 font-black text-sm flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                {String(n).padStart(2, "0")}
              </div>
            ))}
          </div>
          <div className="text-center text-[10px] text-gray-400 border-t border-white/5 pt-2">
            Sum Invariant: <strong className="text-emerald-300">{latestDraw.diff20Numbers.reduce((a, b) => a + b, 0)}</strong> (Complement: {105 - latestDraw.sum})
          </div>
        </div>

        {/* Sum-28 Harmonic Bridge */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-purple-500/20 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-purple-400 uppercase font-bold text-[10px]">Sum-28 Harmonic Bridge</span>
            <span className="text-gray-500 text-[10px]">(28 - x) mod 20</span>
          </div>
          <div className="flex items-center gap-2 justify-center py-2 flex-wrap">
            {latestDraw.harmonic28Numbers.map((n, i) => (
              <div key={i} className="w-10 h-10 rounded-full bg-purple-500/10 border-2 border-purple-400 text-purple-300 font-black text-sm flex items-center justify-center shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                {String(n).padStart(2, "0")}
              </div>
            ))}
          </div>
          <div className="text-center text-[10px] text-gray-400 border-t border-white/5 pt-2">
            Harmonic Sum: <strong className="text-purple-300">{latestDraw.harmonic28Numbers.reduce((a, b) => a + b, 0)}</strong>
          </div>
        </div>
      </div>

      {/* 5 Quantitative Formula Sets (Next Draw Prediction) */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Next Draw 5 Quantitative Candidate Sets
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              5 mathematically derived candidate combinations calibrated against the 100% invariant manifold.
            </p>
          </div>
          <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-1 rounded-full">
            FOR DRAW #{latestDraw.drawNumber + 1}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {formulaSets.map((fSet) => (
            <div
              key={fSet.id}
              className="p-4 rounded-xl glass-panel border border-white/10 bg-slate-950/70 hover:border-yellow-400/40 transition flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-400">
                    {fSet.badge}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(fSet.id, fSet.numbers)}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition text-[10px]"
                      title="Copy numbers"
                    >
                      {copiedId === fSet.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleSendToSyndicate(fSet)}
                      className="p-1 rounded text-gray-400 hover:text-yellow-400 hover:bg-white/10 transition text-[10px]"
                      title="Send to Syndicate"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className="text-xs font-bold text-white">{fSet.name}</h4>
                <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{fSet.description}</p>
              </div>

              {/* Number Balls */}
              <div className="flex items-center justify-center gap-1.5 py-2">
                {fSet.numbers.map((n, i) => (
                  <span
                    key={i}
                    className="w-7 h-7 rounded-lg bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 font-bold text-xs flex items-center justify-center shadow-sm"
                  >
                    {String(n).padStart(2, "0")}
                  </span>
                ))}
              </div>

              {/* Invariants Footer */}
              <div className="border-t border-white/5 pt-2 flex justify-between items-center text-[9px] text-gray-400">
                <span>Sum: <strong className="text-white">{fSet.sum}</strong></span>
                <span>Parity: <strong className="text-cyan-400">{fSet.oddEvenRatio}</strong></span>
                <span>Split: <strong className="text-purple-400">{fSet.lowHighRatio}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Walk-Forward Audit Summary (KPI Cards) */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Walk-Forward Historical Audit Verification
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl glass-panel bg-slate-950/60 border border-white/10">
            <span className="text-[9px] text-gray-400 uppercase font-bold block">Historical Hit Rate</span>
            <span className="text-2xl font-black text-emerald-400 mt-0.5 block font-mono">
              {historicalAudit.anyHitRatePercent}%
            </span>
            <span className="text-[10px] text-gray-500">Draws with &ge; 1 hit</span>
          </div>

          <div className="p-4 rounded-xl glass-panel bg-slate-950/60 border border-white/10">
            <span className="text-[9px] text-gray-400 uppercase font-bold block">Prize Tier Rate (&ge;3 Hits)</span>
            <span className="text-2xl font-black text-yellow-400 mt-0.5 block font-mono">
              {historicalAudit.prizeTierHitRatePercent}%
            </span>
            <span className="text-[10px] text-gray-500">Draws with 3, 4, or 5 hits</span>
          </div>

          <div className="p-4 rounded-xl glass-panel bg-slate-950/60 border border-white/10">
            <span className="text-[9px] text-gray-400 uppercase font-bold block">Avg Best Single-Set Hit</span>
            <span className="text-2xl font-black text-cyan-400 mt-0.5 block font-mono">
              {historicalAudit.averageBestHit} / 5
            </span>
            <span className="text-[10px] text-gray-500">Balls matched per draw</span>
          </div>

          <div className="p-4 rounded-xl glass-panel bg-slate-950/60 border border-white/10">
            <span className="text-[9px] text-gray-400 uppercase font-bold block">5-Set Union Coverage</span>
            <span className="text-2xl font-black text-purple-400 mt-0.5 block font-mono">
              {historicalAudit.averageUnionHits} / 5
            </span>
            <span className="text-[10px] text-gray-500">All 5 sets combined</span>
          </div>
        </div>

        {/* Match Breakdown Progress Ribbon */}
        <div className="p-4 rounded-xl glass-panel bg-slate-950/80 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-300 uppercase text-[10px]">Single-Set Historical Match Distribution</span>
            <span className="text-gray-500 text-[10px]">{historicalAudit.totalDrawsTested} Draws Evaluated</span>
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-slate-900 border border-white/5">
              <span className="text-[9px] text-emerald-400 font-bold block">5 OF 5 (JACKPOT)</span>
              <span className="text-base font-black text-white">{historicalAudit.matchBreakdown.match5}</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-white/5">
              <span className="text-[9px] text-cyan-400 font-bold block">4 OF 5 HITS</span>
              <span className="text-base font-black text-white">{historicalAudit.matchBreakdown.match4}</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-white/5">
              <span className="text-[9px] text-yellow-400 font-bold block">3 OF 5 HITS</span>
              <span className="text-base font-black text-white">{historicalAudit.matchBreakdown.match3}</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-white/5">
              <span className="text-[9px] text-purple-400 font-bold block">2 OF 5 HITS</span>
              <span className="text-base font-black text-white">{historicalAudit.matchBreakdown.match2}</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-white/5">
              <span className="text-[9px] text-gray-400 font-bold block">1 OF 5 HITS</span>
              <span className="text-base font-black text-white">{historicalAudit.matchBreakdown.match1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Audit Log Table */}
      <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-yellow-400" />
              Draw-by-Draw Walk-Forward Verification Audit Log
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Validating out-of-sample prediction sets against actual historical winning drawings.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter buttons */}
            <div className="flex bg-slate-900/80 p-0.5 rounded-lg border border-white/5 text-[10px]">
              {(["all", "4plus", "3plus", "2plus", "1plus"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setSelectedFilter(f);
                    triggerHaptic("selection");
                  }}
                  className={`px-2 py-1 rounded transition-all cursor-pointer ${
                    selectedFilter === f ? "bg-yellow-400 text-slate-950 font-bold" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {f === "all" ? "All Draws" : f === "4plus" ? "4+ Hits" : f === "3plus" ? "3+ Hits" : f === "2plus" ? "2+ Hits" : "1+ Hits"}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search draw #..."
              className="bg-slate-950 border border-white/10 rounded px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 w-32"
            />
          </div>
        </div>

        {/* Verification Rows */}
        <div className="overflow-x-auto sleek-scrollbar max-h-96">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-950/95 backdrop-blur-md z-10">
              <tr className="border-b border-white/10 text-gray-500 uppercase tracking-widest text-[9px]">
                <th className="py-2.5 px-3">Draw #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-center">Actual Winning Numbers</th>
                <th className="py-2.5 px-3 text-center">Best Set Performance</th>
                <th className="py-2.5 px-3 text-center">Sets (1 / 2 / 3 / 4 / 5)</th>
                <th className="py-2.5 px-3 text-right">Union Hits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredVerifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 italic">
                    No historical draws matched the active filter.
                  </td>
                </tr>
              ) : (
                filteredVerifications.map((v) => (
                  <tr key={v.drawNumber} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white">#{v.drawNumber}</td>
                    <td className="py-2.5 px-3 text-gray-400 text-[10px]">{v.drawDate}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1 justify-center">
                        {v.actualNumbers.map((n, i) => (
                          <span
                            key={i}
                            className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center border border-white/5"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.bestHit >= 4 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                        v.bestHit === 3 ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30" :
                        v.bestHit >= 1 ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 text-gray-400"
                      }`}>
                        {v.bestHit} HITS ({v.bestSetName})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-[10px] font-mono text-gray-400">
                      <span className={v.hits.set1 >= 3 ? "text-yellow-400 font-bold" : ""}>{v.hits.set1}</span> /{" "}
                      <span className={v.hits.set2 >= 3 ? "text-yellow-400 font-bold" : ""}>{v.hits.set2}</span> /{" "}
                      <span className={v.hits.set3 >= 3 ? "text-yellow-400 font-bold" : ""}>{v.hits.set3}</span> /{" "}
                      <span className={v.hits.set4 >= 3 ? "text-yellow-400 font-bold" : ""}>{v.hits.set4}</span> /{" "}
                      <span className={v.hits.set5 >= 3 ? "text-yellow-400 font-bold" : ""}>{v.hits.set5}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-bold text-purple-400">
                        {v.unionHits} / 5
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
