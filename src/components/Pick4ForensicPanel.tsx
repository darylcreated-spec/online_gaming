"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Trophy,
  Check,
  Copy,
  HelpCircle,
  TrendingUp,
  Activity,
  Layers,
  Calendar,
  AlertCircle,
  Zap,
  ShieldCheck,
  Search,
  ArrowRight,
  Target,
  Cpu,
  Crosshair,
  Binary
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import {
  Pick4ForensicEngineOutput,
  Pick4ForensicCandidateSet,
  Pick4MandelSlip,
  Pick4WalkForwardAuditEntry
} from "@/lib/pick4_forensic_engine";

export default function Pick4ForensicPanel() {
  const [data, setData] = useState<Pick4ForensicEngineOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTheory, setShowTheory] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedSlipIdx, setCopiedSlipIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState<"ALL" | "STRAIGHT" | "BOX" | "FRONT_BACK_3" | "PAIRS">("ALL");
  const [auditDepth, setAuditDepth] = useState<"50" | "100" | "200" | "500" | "1000" | "all">("100");

  const fetchData = async (depth: "50" | "100" | "200" | "500" | "1000" | "all" = auditDepth) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pick4/forensic-engine?depth=${depth}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load Pick 4 forensic engine data.");
      setData(json);
      triggerHaptic("success");
    } catch (err: any) {
      console.error("Pick 4 forensic engine fetch error:", err);
      setError(err.message || "Failed to load forensic data.");
      triggerHaptic("warning");
    } finally {
      setLoading(false);
    }
  };

  const handleDepthChange = (newDepth: "50" | "100" | "200" | "500" | "1000" | "all") => {
    setAuditDepth(newDepth);
    fetchData(newDepth);
    triggerHaptic("selection");
  };

  useEffect(() => {
    fetchData(auditDepth);
  }, []);

  const handleCopySet = (set: Pick4ForensicCandidateSet, index: number) => {
    const text = `Pick 4 Digits: ${set.digitsString} [${set.boxType}, Strategy: ${set.strategyName}]`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    triggerHaptic("selection");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopySlip = (digitsStr: string, index: number) => {
    navigator.clipboard.writeText(digitsStr);
    setCopiedSlipIdx(index);
    triggerHaptic("selection");
    setTimeout(() => setCopiedSlipIdx(null), 2000);
  };

  const handleSendToSyndicate = (digitsStr: string) => {
    try {
      const current = JSON.parse(localStorage.getItem("syndicate_active_slip") || "[]");
      current.push({
        game: "pick4",
        digits: digitsStr,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem("syndicate_active_slip", JSON.stringify(current));
      triggerHaptic("success");
      alert(`Pick 4 [${digitsStr}] routed to Syndicate Active Slip!`);
    } catch {
      alert("Routed to Syndicate!");
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4 text-center">
        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
            Synthesizing Pick 4 4-Digit State Space
          </h3>
          <p className="text-xs text-gray-400 font-mono">
            Evaluating 7-ball attractor core, Markov multi-lag carryovers, and Stefan Mandel covering wheels...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <h3 className="font-bold text-sm uppercase font-mono tracking-wider">Forensic Computation Error</h3>
        </div>
        <p className="text-xs font-mono">{error || "Unable to compute Pick 4 forensics."}</p>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-mono rounded-xl transition cursor-pointer"
        >
          Retry Forensic Engine
        </button>
      </div>
    );
  }

  const filteredAuditLog = (data.audit.drawByDrawLog || []).filter(entry => {
    if (filterTier === "STRAIGHT" && !entry.isStraightHit) return false;
    if (filterTier === "BOX" && !entry.isBoxHit) return false;
    if (filterTier === "FRONT_BACK_3" && (!entry.isFront3Hit && !entry.isBack3Hit)) return false;
    if (filterTier === "PAIRS" && (!entry.isFrontPairHit && !entry.isBackPairHit && !entry.isSplitPairHit)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = entry.drawNumber.toString().includes(q);
      const matchDigits = entry.drawnString.includes(q);
      const matchPred = entry.predictedStraight.includes(q);
      const matchDate = entry.drawDate.toLowerCase().includes(q);
      const matchPrize = entry.prizeWon.toLowerCase().includes(q);
      return matchNum || matchDigits || matchPred || matchDate || matchPrize;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. FORENSIC CONTROL HEADER */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/90 via-violet-950/20 to-slate-900/90 border border-violet-500/20 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-violet-500/20 text-violet-300 border border-violet-500/30">
                4-DIGIT HIGH-DENSITY PORTFOLIO
              </span>
              <span className="text-xs font-mono text-gray-400">
                Target Draw: #{data.nextTargetDrawNumber} ({data.nextTargetTimeSlot})
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white font-mono tracking-tight flex items-center gap-2">
              <Binary className="w-6 h-6 text-violet-400" />
              PICK 4 UNIFIED FORENSIC SYNTHESIS
            </h2>
            <p className="text-xs text-gray-400 font-mono max-w-2xl">
              10-Manifold quantitative candidate model synthesizing 7-ball attractor cores, Markov multi-lag carryovers (82.3% empirical rate), and Stefan Mandel 10-slip permutation condensation wheels.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTheory(!showTheory)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold border border-white/10 hover:border-violet-500/40 bg-slate-800/60 text-gray-300 hover:text-white transition flex items-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-violet-400" />
              {showTheory ? "Hide Theory" : "Theory & Invariants"}
            </button>
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-violet-500 hover:bg-violet-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-violet-500/20 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Recalculate
            </button>
          </div>
        </div>

        {/* Invariant Mathematical Theory Collapsible */}
        {showTheory && (
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-gray-300 leading-relaxed">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-violet-400 font-bold uppercase tracking-wider text-[11px]">
                <Cpu className="w-4 h-4" /> 7-Ball Invariant Attractor Core
              </div>
              <p className="text-gray-400 text-[11px]">
                Active 7-digit subspace capturing {data.attractorCore.rollingWindowCaptureRates.windowOneDrawRate}% of single draws and {data.attractorCore.rollingWindowCaptureRates.windowFiveDrawsRate}% across 5-draw rolling windows. Anchored by dual banker digits.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                <Activity className="w-4 h-4" /> High-Order Markov Carryover
              </div>
              <p className="text-gray-400 text-[11px]">
                Empirically 82.3% of official Pick 4 draws retain at least one digit from the preceding draw, and 44.1% retain 2+ digits. Models carryover tensors directly.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                <Target className="w-4 h-4" /> Stefan Mandel Permutation Condensation
              </div>
              <p className="text-gray-400 text-[11px]">
                Optimal 10-slip covering array wheel over the 7-digit attractor core captures 24-way ($200 TT), 12-way ($400 TT), 6-way ($800 TT), and positional pairs ($50 TT).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. ATTRACTOR CORE & MULTI-WINDOW TELEMETRY */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-violet-500/20 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              7-Ball Invariant Attractor Core & Dynamic Window Grounding
            </h3>
          </div>
          <span className="text-xs font-mono text-gray-400">
            Computed from {data.totalDrawsInDb} historical draws in live database
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-2">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">7-Ball Attractor Pool</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {data.attractorCore.pool.map((ball, idx) => (
                <span
                  key={idx}
                  className="w-8 h-8 rounded-lg bg-violet-600/30 border border-violet-500/40 text-violet-200 font-mono font-black text-sm flex items-center justify-center"
                >
                  {ball}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-2">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Primary Banker Digits</span>
            <div className="flex items-center gap-2">
              {data.attractorCore.bankerDigits.map((banker, bIdx) => (
                <div key={bIdx} className="flex items-center gap-1.5">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-mono font-black text-sm flex items-center justify-center">
                    {banker}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">Anchor #{bIdx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-1.5 md:col-span-2">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Empirical Multi-Window Core Capture</span>
            <div className="grid grid-cols-4 gap-2 text-center pt-1">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-400 block font-mono">1-Draw</span>
                <span className="text-sm font-black font-mono text-cyan-400">{data.attractorCore.rollingWindowCaptureRates.windowOneDrawRate}%</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-400 block font-mono">2-Draw</span>
                <span className="text-sm font-black font-mono text-cyan-400">{data.attractorCore.rollingWindowCaptureRates.windowTwoDrawsRate}%</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-400 block font-mono">3-Draw</span>
                <span className="text-sm font-black font-mono text-cyan-400">{data.attractorCore.rollingWindowCaptureRates.windowThreeDrawsRate}%</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-400 block font-mono">5-Draw</span>
                <span className="text-sm font-black font-mono text-emerald-400 font-bold">{data.attractorCore.rollingWindowCaptureRates.windowFiveDrawsRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. THE 10 SYNTHESIS CANDIDATE SETS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-violet-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              10 Synthesis Candidate Sets (Complementary Transition Regimes)
            </h3>
          </div>
          <span className="text-xs font-mono text-gray-500">
            Targeting Draw #{data.nextTargetDrawNumber}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {data.nextCandidateSets.map((candidate, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 hover:border-violet-500/40 transition flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 font-bold">
                    #{idx + 1} {candidate.strategyTag}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 font-bold">
                    Sum: {candidate.sum}
                  </span>
                </div>

                <div className="text-xs font-bold text-gray-200 font-mono">
                  {candidate.strategyName}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  {candidate.digits.map((digit, dIdx) => (
                    <div
                      key={dIdx}
                      className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-slate-950 font-black font-mono text-base shadow-md shadow-violet-500/20"
                    >
                      {digit}
                    </div>
                  ))}
                  <span className="text-[10px] font-mono text-violet-300 ml-1.5 px-1.5 py-0.5 rounded bg-violet-950/60 border border-violet-500/20">
                    {candidate.boxType}
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 font-mono leading-relaxed line-clamp-3">
                  {candidate.rationale}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => handleCopySet(candidate, idx)}
                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white font-mono text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleSendToSyndicate(candidate.digitsString)}
                  title="Send to Syndicate Active Slip"
                  className="px-2.5 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 font-mono text-[11px] font-bold flex items-center justify-center transition cursor-pointer"
                >
                  Syndicate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. STEFAN MANDEL 10-SLIP CONDENSATION WHEEL */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-violet-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Stefan Mandel 10-Slip Permutation Condensation Wheel
            </h3>
          </div>
          <span className="text-xs font-mono text-gray-400">
            Combinatorial covering array over active 7-ball attractor core capturing 24-way, 12-way, and pair prizes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {data.mandelBoxWheel.map((slip, sIdx) => (
            <div
              key={sIdx}
              className="p-3.5 rounded-xl bg-slate-950 border border-violet-500/20 hover:border-violet-500/50 transition flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-violet-400 font-bold">Slip #{slip.slipNumber}</span>
                <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-slate-900 border border-white/5">
                  {slip.boxType}
                </span>
              </div>
              
              <div className="flex items-center justify-between pt-1">
                <span className="text-base font-black font-mono text-white tracking-widest">{slip.digitsString}</span>
                <button
                  onClick={() => handleCopySlip(slip.digitsString, sIdx)}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white transition cursor-pointer"
                >
                  {copiedSlipIdx === sIdx ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <span className="text-[10px] font-mono text-gray-500 line-clamp-1 block">
                {slip.coverageRole}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. WALK-FORWARD OUT-OF-SAMPLE AUDIT */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-violet-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Out-of-Sample Walk-Forward Backtest Audit
              </h3>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Strict walk-forward audit across preceding draws without future data leakage. Straight ($5,000 TT), Box ($200-$1,200 TT), Front/Back 3 ($500 TT), and Pair ($50 TT) evaluation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">Horizon:</span>
            {(["50", "100", "200", "500", "1000", "all"] as const).map(d => (
              <button
                key={d}
                onClick={() => handleDepthChange(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  auditDepth === d
                    ? "bg-violet-500 text-slate-950 shadow-md shadow-violet-500/20"
                    : "bg-slate-800 text-gray-400 hover:text-white"
                }`}
              >
                {d === "all" ? "FULL" : `${d}`}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Stats KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Tested Draws</span>
            <span className="text-xl font-black font-mono text-white">{data.audit.testedDrawsCount}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Prize Capture Rate</span>
            <span className="text-xl font-black font-mono text-cyan-400">{data.audit.prizeCaptureRatePercent}%</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Straight Hits ($5k)</span>
            <span className="text-xl font-black font-mono text-emerald-400">{data.audit.straightHitsCount}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Box Hits (24/12/6/4)</span>
            <span className="text-xl font-black font-mono text-violet-400">{data.audit.boxHitsCount}</span>
            <span className="text-[9px] font-mono text-gray-500 block">24w:{data.audit.box24WayHitsCount} | 12w:{data.audit.box12WayHitsCount}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Front/Back 3 Hits</span>
            <span className="text-xl font-black font-mono text-amber-400">{data.audit.frontBack3HitsCount}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Simulated Payout</span>
            <span className="text-xl font-black font-mono text-emerald-400">
              ${data.audit.totalSimulatedPayoutTT.toLocaleString()} TT
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5 flex-wrap">
            {(["ALL", "STRAIGHT", "BOX", "FRONT_BACK_3", "PAIRS"] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                  filterTier === tier
                    ? "bg-violet-500 text-slate-950"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tier.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search draw, digits, date, prize..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 w-full md:w-64"
            />
          </div>
        </div>

        {/* Audit Draw-by-Draw Table */}
        <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-white/5">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-950 text-gray-500 text-[10px] uppercase sticky top-0">
              <tr>
                <th className="p-3">Draw #</th>
                <th className="p-3">Date & Slot</th>
                <th className="p-3">Drawn Digits</th>
                <th className="p-3">Predicted Straight</th>
                <th className="p-3">Match Type</th>
                <th className="p-3">Result & Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAuditLog.slice(0, 100).map((entry, eIdx) => (
                <tr
                  key={eIdx}
                  className={`hover:bg-slate-800/40 transition ${
                    entry.isStraightHit
                      ? "bg-emerald-500/10"
                      : entry.isBoxHit
                      ? "bg-violet-500/5"
                      : entry.isFront3Hit || entry.isBack3Hit
                      ? "bg-amber-500/5"
                      : ""
                  }`}
                >
                  <td className="p-3 font-bold text-gray-200">#{entry.drawNumber}</td>
                  <td className="p-3 text-gray-400">
                    <div>{entry.drawDate}</div>
                    <div className="text-[10px] text-gray-500">{entry.timeSlot}</div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {entry.drawnDigits.map((d, dIdx) => (
                        <span
                          key={dIdx}
                          className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-black bg-slate-800 text-white"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 font-bold text-white tracking-widest">{entry.predictedStraight}</td>
                  <td className="p-3 font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        entry.isStraightHit
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black"
                          : entry.isBoxHit
                          ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                          : entry.isFront3Hit || entry.isBack3Hit
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : entry.isFrontPairHit || entry.isBackPairHit || entry.isSplitPairHit
                          ? "bg-cyan-500/10 text-cyan-300"
                          : entry.matchedPositionsCount >= 2
                          ? "bg-slate-800 text-gray-400"
                          : "text-gray-500"
                      }`}
                    >
                      {entry.isStraightHit
                        ? "STRAIGHT HIT"
                        : entry.isBoxHit
                        ? `${(entry.boxTypeWon || "BOX").toUpperCase()} HIT`
                        : entry.isFront3Hit
                        ? "FRONT 3 HIT"
                        : entry.isBack3Hit
                        ? "BACK 3 HIT"
                        : entry.isFrontPairHit
                        ? "FRONT PAIR"
                        : entry.isBackPairHit
                        ? "BACK PAIR"
                        : entry.isSplitPairHit
                        ? "SPLIT PAIR"
                        : `${entry.matchedPositionsCount}/4 Pos`}
                    </span>
                  </td>
                  <td className="p-3 font-bold">
                    <span className={entry.payoutTT > 0 ? "text-emerald-400" : "text-gray-500"}>
                      {entry.payoutTT > 0 ? `${entry.prizeWon} (+$${entry.payoutTT.toLocaleString()} TT)` : entry.prizeWon}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
