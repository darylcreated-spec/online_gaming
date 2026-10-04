"use client";

import React, { useState, useEffect } from "react";
import {
  Sigma,
  Zap,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  Users,
  CheckCircle2,
  TrendingUp,
  Activity
} from "lucide-react";
import {
  PlayWheDiff37AnalysisResult,
  PlayWheFormulaSet,
  PlayWheDiffVerificationEntry
} from "@/lib/playwhe_diff37_engine";
import { triggerHaptic } from "@/lib/haptics";

export default function PlayWheDiff37Panel() {
  const [data, setData] = useState<PlayWheDiff37AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showTheory, setShowTheory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHit, setFilterHit] = useState<"all" | "hits" | "top1" | "top3" | "misses">("all");
  const [syndicateSuccess, setSyndicateSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/playwhe/diff37", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load Play Whe Diff-37 quantitative data.");
      }
    } catch (err: any) {
      console.error("Error loading Play Whe Diff-37 engine:", err);
      setError(err.message || "Network error loading Diff-37 engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-update on sync event
    const handleSyncCompleted = () => {
      console.log("[PlayWheDiff37Panel] Real-time draw sync detected! Recalibrating Diff-37 engine...");
      fetchData();
    };

    window.addEventListener("win_concept_sync_completed", handleSyncCompleted);
    return () => {
      window.removeEventListener("win_concept_sync_completed", handleSyncCompleted);
    };
  }, []);

  const handleCopy = (id: string, marks: number[]) => {
    triggerHaptic("selection");
    const text = marks.map(m => String(m).padStart(2, "0")).join(" - ");
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendToSyndicate = (fSet: PlayWheFormulaSet) => {
    triggerHaptic("success");
    const formattedMarks = fSet.ensembleMarks.map(m => String(m).padStart(2, "0")).join(", ");
    setSyndicateSuccess(`Set "${fSet.name}" (${formattedMarks}) copied and queued for Syndicate slip!`);
    navigator.clipboard.writeText(`Play Whe Prediction: ${fSet.name} [${formattedMarks}]`);
    setTimeout(() => setSyndicateSuccess(null), 3500);
  };

  if (loading && !data) {
    return (
      <div className="p-8 rounded-2xl glass-panel border border-amber-500/20 bg-slate-950/60 font-mono text-center space-y-4">
        <div className="flex items-center justify-center gap-3 text-amber-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm font-bold tracking-wider uppercase">
            Executing Play Whe Sum-37 / Diff-36 Quantitative Symmetry Engine...
          </span>
        </div>
        <p className="text-xs text-gray-400">
          Auditing Center Axis Involutions, Galois Z_4 &times; Z_9 Cosets, and Out-of-Sample Walk-Forward Backtesting against Turso Cloud.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-red-950/40 border border-red-500/30 font-mono text-red-200 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">Engine Computation Failure</h3>
        <p className="text-xs text-gray-300">{error || "Unable to retrieve Play Whe difference model results."}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> RETRY QUANT AUDIT
        </button>
      </div>
    );
  }

  const { latestDraw, nextDrawPredictions, verification } = data;

  const filteredEntries = verification.entries.filter((entry) => {
    if (filterHit === "hits" && !entry.isHit) return false;
    if (filterHit === "top1" && entry.hitRank !== 1) return false;
    if (filterHit === "top3" && (!entry.hitRank || entry.hitRank > 3)) return false;
    if (filterHit === "misses" && entry.isHit) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = String(entry.drawNumber).includes(q);
      const matchMark = entry.actualMarkName.toLowerCase().includes(q);
      const matchDate = entry.drawDate.toLowerCase().includes(q);
      const matchSlot = entry.timeSlot.toLowerCase().includes(q);
      return matchNum || matchMark || matchDate || matchSlot;
    }
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

      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-slate-950/70 relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                &sigma;37 Involutive Symmetry
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                Z_4 &times; Z_9 Galois CRT
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                Live Auto-Sync
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-white tracking-wide flex items-center gap-2">
              <Sigma className="w-5 h-5 text-amber-400" />
              Play Whe Sum-37 / Diff-36 Quantitative Symmetry Engine
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              Mathematical involution &sigma;37(x) = 37 - x reflecting across the median centroid &mu; = 18.5, coupled with Galois CRT ring decomposition and out-of-sample walk-forward historical auditing.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowTheory(!showTheory)}
              className="px-3.5 py-2 rounded-lg bg-slate-900/80 border border-white/10 text-xs text-gray-300 font-bold hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              {showTheory ? "HIDE MODEL SPECS" : "VIEW MATH PROOF"}
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg bg-amber-400 text-slate-950 text-xs font-black hover:bg-amber-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
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
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">1. Fixed-Point-Free Involution</span>
              <p className="text-[11px] text-gray-400">
                In a 36-ball pool, &sigma;37(x) = 37 - x is a strict involution (&sigma;(&sigma;(x)) = x). Every mark has an exact conjugate partner summing to 37. Since 37 is odd, parity strictly alternates: Even &harr; Odd.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">2. Galois CRT Decomposition</span>
              <p className="text-[11px] text-gray-400">
                By the Chinese Remainder Theorem, Z_36 is isomorphic to Z_4 &times; Z_9. Residues mod 4 correspond to the 4 daily time-slots (Morning, Midday, Afternoon, Evening), while residues mod 9 correspond to the 9 Chinapoo lines.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">3. Walk-Forward Verification</span>
              <p className="text-[11px] text-gray-400">
                Every historical draw in the audit window is evaluated strictly out-of-sample: at draw t, only draws 1 to t-1 are provided to the engine, preventing any look-ahead bias.
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
            <span className="text-amber-400 font-bold">Draw #{latestDraw.drawNumber}</span>
          </div>
          <div className="flex items-center gap-3 justify-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-[0_0_18px_rgba(245,158,11,0.5)]">
              {String(latestDraw.winningNumber).padStart(2, "0")}
            </div>
            <div>
              <span className="text-sm font-black text-white block uppercase tracking-wide">
                {latestDraw.markName}
              </span>
              <span className="text-[10px] text-amber-300 block">
                {latestDraw.timeSlot} • Chinapoo Line {latestDraw.chinapooLine}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-white/5 pt-2">
            <span>Parity: <strong className="text-cyan-400">{latestDraw.parity}</strong></span>
            <span>Magnitude: <strong className="text-purple-400">{latestDraw.magnitude}</strong></span>
            <span>Mod: <strong className="text-white">{latestDraw.mod4}m4, {latestDraw.mod9}m9</strong></span>
          </div>
        </div>

        {/* Dual Involution Inversion */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/20 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-emerald-400 uppercase font-bold text-[10px]">&sigma;37 Center Axis Inversion</span>
            <span className="text-gray-500 text-[10px]">&mu; = 18.5</span>
          </div>
          <div className="flex items-center gap-3 justify-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border-2 border-emerald-400 text-emerald-300 font-black text-2xl flex items-center justify-center shadow-[0_0_18px_rgba(16,185,129,0.3)]">
              {String(latestDraw.sigma37Complement).padStart(2, "0")}
            </div>
            <div>
              <span className="text-sm font-black text-white block uppercase tracking-wide">
                {latestDraw.sigma37MarkName}
              </span>
              <span className="text-[10px] text-emerald-300 block">
                Conjugate Invariant: {latestDraw.winningNumber} + {latestDraw.sigma37Complement} = 37
              </span>
            </div>
          </div>
          <div className="text-center text-[10px] text-gray-400 border-t border-white/5 pt-2">
            Parity Alternation: <strong className="text-emerald-300">{latestDraw.parity === "EVEN" ? "ODD" : "EVEN"}</strong> (Strict Complement)
          </div>
        </div>

        {/* Target Next Slot Projection */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-cyan-500/20 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-cyan-400 uppercase font-bold text-[10px]">Target Upcoming Slot</span>
            <span className="text-gray-500 text-[10px]">Draw #{nextDrawPredictions.targetDrawNumber}</span>
          </div>
          <div className="flex items-center justify-center py-3">
            <div className="text-center">
              <span className="text-2xl font-black text-cyan-300 block">
                {nextDrawPredictions.targetSlot}
              </span>
              <span className="text-[10px] text-gray-400 mt-1 block">
                Residue: {nextDrawPredictions.sets[1]?.mod4 ?? 0} mod 4
              </span>
            </div>
          </div>
          <div className="text-center text-[10px] text-gray-400 border-t border-white/5 pt-2">
            Candidate Union Pool: <strong className="text-cyan-300">{nextDrawPredictions.unionPoolSize} marks</strong> ({nextDrawPredictions.unionPool.join(", ")})
          </div>
        </div>
      </div>

      {/* 5 Quantitative Formula Sets (Next Draw Prediction) */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Next Draw 5 Quantitative Candidate Mark Sets
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              5 mathematically derived candidate ensembles calibrated for {nextDrawPredictions.targetSlot} Draw #{nextDrawPredictions.targetDrawNumber}.
            </p>
          </div>
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
            TARGET: {nextDrawPredictions.targetSlot.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {nextDrawPredictions.sets.map((fSet) => (
            <div
              key={fSet.id}
              className="p-4 rounded-xl glass-panel border border-white/10 bg-slate-950/70 hover:border-amber-400/40 transition flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${fSet.badgeColor}`}>
                    {fSet.badge}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(fSet.id, fSet.ensembleMarks)}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition text-[10px]"
                      title="Copy marks"
                    >
                      {copiedId === fSet.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleSendToSyndicate(fSet)}
                      className="p-1 rounded text-gray-400 hover:text-amber-400 hover:bg-white/10 transition text-[10px]"
                      title="Send to Syndicate"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className="text-xs font-bold text-white">{fSet.name}</h4>
                <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{fSet.description}</p>
              </div>

              {/* Primary Mark Showcase */}
              <div className="text-center py-1">
                <div className="inline-flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-400/30">
                  <span className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center">
                    {String(fSet.primaryMark).padStart(2, "0")}
                  </span>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block uppercase">
                      {fSet.primaryMarkName}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      Anchor • {fSet.parity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ensemble Marks */}
              <div className="flex items-center justify-center gap-1.5 py-1 flex-wrap">
                {fSet.ensembleMarks.map((m, i) => (
                  <span
                    key={i}
                    className="w-7 h-7 rounded-lg bg-slate-900 border border-white/10 text-amber-300 font-bold text-xs flex items-center justify-center shadow-sm"
                    title={fSet.ensembleNames[i]}
                  >
                    {String(m).padStart(2, "0")}
                  </span>
                ))}
              </div>

              {/* Invariants Footer */}
              <div className="border-t border-white/5 pt-2 flex justify-between items-center text-[9px] text-gray-400">
                <span>Mod: <strong className="text-white">{fSet.mod4}m4, {fSet.mod9}m9</strong></span>
                <span>Confidence: <strong className="text-emerald-400">{fSet.confidenceScore}%</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Walk-Forward Audit Summary (KPI Cards) */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Walk-Forward Historical Audit Verification (Out-of-Sample)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl glass-panel bg-slate-950/60 border border-white/10">
            <span className="text-[9px] text-gray-400 uppercase font-bold block">Overall Hit Rate</span>
            <span className="text-2xl font-black text-emerald-400 mt-0.5 block font-mono">
              {verification.overallHitRatePercent}%
            </span>
            <span className="text-[10px] text-gray-500">Draws hitting any candidate set</span>
          </div>

          <div className="p-4 rounded-xl glass-panel bg-slate-950/60 border border-white/10">
            <span className="text-[9px] text-gray-400 uppercase font-bold block">Top-1 Set Hit Rate</span>
            <span className="text-2xl font-black text-amber-400 mt-0.5 block font-mono">
              {verification.top1HitRatePercent}%
            </span>
            <span className="text-[10px] text-gray-500">Hit on primary &sigma;37 Sieve</span>
          </div>

          <div className="p-4 rounded-xl glass-panel bg-slate-950/60 border border-white/10">
            <span className="text-[9px] text-gray-400 uppercase font-bold block">Top-3 Sets Hit Rate</span>
            <span className="text-2xl font-black text-cyan-400 mt-0.5 block font-mono">
              {verification.top3HitRatePercent}%
            </span>
            <span className="text-[10px] text-gray-500">Hit within Sets 1, 2, or 3</span>
          </div>

          <div className="p-4 rounded-xl glass-panel bg-slate-950/60 border border-white/10">
            <span className="text-[9px] text-gray-400 uppercase font-bold block">Draws Audited</span>
            <span className="text-2xl font-black text-purple-400 mt-0.5 block font-mono">
              {verification.totalDrawsTested}
            </span>
            <span className="text-[10px] text-gray-500">Sequential out-of-sample steps</span>
          </div>
        </div>
      </div>

      {/* Verification Draw-by-Draw Audit Table */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 uppercase font-bold">Filter By:</span>
            <button
              onClick={() => setFilterHit("all")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                filterHit === "all" ? "bg-amber-400 text-slate-950" : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              All ({verification.entries.length})
            </button>
            <button
              onClick={() => setFilterHit("hits")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                filterHit === "hits" ? "bg-emerald-500 text-slate-950" : "bg-white/5 text-gray-400 hover:text-emerald-400"
              }`}
            >
              All Hits
            </button>
            <button
              onClick={() => setFilterHit("top1")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                filterHit === "top1" ? "bg-amber-400 text-slate-950" : "bg-white/5 text-gray-400 hover:text-amber-400"
              }`}
            >
              Top-1 Set
            </button>
            <button
              onClick={() => setFilterHit("top3")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                filterHit === "top3" ? "bg-cyan-500 text-slate-950" : "bg-white/5 text-gray-400 hover:text-cyan-400"
              }`}
            >
              Top-3 Sets
            </button>
            <button
              onClick={() => setFilterHit("misses")}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                filterHit === "misses" ? "bg-rose-500 text-white" : "bg-white/5 text-gray-400 hover:text-rose-400"
              }`}
            >
              Misses
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search draw #, mark, date..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-950/70 max-h-96 overflow-y-auto sleek-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-950 text-gray-400 text-[10px] uppercase border-b border-white/10 z-10">
              <tr>
                <th className="py-2.5 px-3">Draw #</th>
                <th className="py-2.5 px-3">Date &amp; Slot</th>
                <th className="py-2.5 px-3">Actual Result</th>
                <th className="py-2.5 px-3">&sigma;37 Complement</th>
                <th className="py-2.5 px-3">Audit Hit Status</th>
                <th className="py-2.5 px-3">Matched Set</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px]">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No historical verification entries match your filter.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.drawNumber} className="hover:bg-white/[0.02] transition">
                    <td className="py-2.5 px-3 font-bold text-white">#{entry.drawNumber}</td>
                    <td className="py-2.5 px-3 text-gray-400">
                      <div>{entry.drawDate}</div>
                      <div className="text-[9px] text-amber-400/80">{entry.timeSlot}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                          {String(entry.actualNumber).padStart(2, "0")}
                        </span>
                        <span className="text-white font-bold uppercase">{entry.actualMarkName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400">
                      #{entry.sigma37Complement} ({37 - entry.actualNumber === entry.sigma37Complement ? "Exact" : ""})
                    </td>
                    <td className="py-2.5 px-3">
                      {entry.isHit ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          HIT (Rank #{entry.hitRank})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-gray-500">
                          MISS
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-gray-300">
                      {entry.winningSetName || "—"}
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
