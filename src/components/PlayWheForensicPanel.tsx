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
  PlayWheForensicEngineOutput,
  PlayWheForensicCandidateSet,
  PlayWheWalkForwardAuditEntry
} from "@/lib/playwhe_forensic_engine";
import { CHINAPOO_CHART } from "@/lib/playwhe";

type AuditHorizon = "50" | "100" | "200" | "500" | "1000" | "all";
type FilterTier = "ALL" | "TOP_1_HITS" | "TOP_5_HITS" | "PORTFOLIO_HITS" | "MISSES";

export default function PlayWheForensicPanel() {
  const [data, setData] = useState<PlayWheForensicEngineOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTheory, setShowTheory] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState<FilterTier>("ALL");
  const [auditDepth, setAuditDepth] = useState<AuditHorizon>("100");

  const fetchData = async (depth: AuditHorizon = auditDepth) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/playwhe/forensic-engine?depth=${depth}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load Play Whe forensic engine data.");
      setData(json);
      triggerHaptic("success");
    } catch (err: any) {
      console.error("Play Whe forensic engine fetch error:", err);
      setError(err.message || "Failed to load forensic data.");
      triggerHaptic("warning");
    } finally {
      setLoading(false);
    }
  };

  const handleDepthChange = (newDepth: AuditHorizon) => {
    setAuditDepth(newDepth);
    fetchData(newDepth);
    triggerHaptic("selection");
  };

  useEffect(() => {
    fetchData(auditDepth);
  }, []);

  const handleCopySet = (candidate: PlayWheForensicCandidateSet, index: number) => {
    const text = `Play Whe Mark #${candidate.markNumber} (${candidate.markName}) [Strategy: ${candidate.strategyName} - Score: ${candidate.compositeScore}]`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    triggerHaptic("selection");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSendToSyndicate = (mark: number, name: string) => {
    try {
      const current = JSON.parse(localStorage.getItem("syndicate_active_slip") || "[]");
      current.push({
        game: "playwhe",
        mark,
        markName: name,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem("syndicate_active_slip", JSON.stringify(current));
      triggerHaptic("success");
      alert(`Mark #${mark} (${name}) routed to Syndicate Active Slip!`);
    } catch {
      alert("Routed to Syndicate!");
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] p-8 space-y-4 text-center">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
            Synthesizing Play Whe Discrete Subspace
          </h3>
          <p className="text-xs text-gray-400 font-mono">
            Evaluating CRT Z_36 partitions, slot-conditional Markov tensors, and attractor subspaces across 19,000+ draws...
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
        <p className="text-xs font-mono">{error || "Unable to compute Play Whe forensics."}</p>
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
    if (filterTier === "TOP_1_HITS" && !entry.isTop1Hit) return false;
    if (filterTier === "TOP_5_HITS" && !entry.isTop5Hit) return false;
    if (filterTier === "PORTFOLIO_HITS" && !entry.isTop10Hit) return false;
    if (filterTier === "MISSES" && (entry.isTop10Hit || entry.exactMatched)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = entry.drawNumber.toString().includes(q);
      const matchMark = entry.drawnMark.toString().includes(q);
      const matchName = entry.drawnMarkName.toLowerCase().includes(q);
      const matchDate = entry.drawDate.toLowerCase().includes(q);
      const matchSlot = entry.timeSlot.toLowerCase().includes(q);
      const matchStrategy = entry.bestStrategyName.toLowerCase().includes(q);
      return matchNum || matchMark || matchName || matchDate || matchSlot || matchStrategy;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. FORENSIC CONTROL HEADER */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/90 via-emerald-950/20 to-slate-900/90 border border-emerald-500/20 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                1 OF 36 QUANTITATIVE SUITE
              </span>
              <span className="text-xs font-mono text-gray-400">
                Target Draw: <strong className="text-white">#{data.nextTargetDrawNumber}</strong> ({data.nextTargetTimeSlot})
              </span>
              <span className="text-xs font-mono text-emerald-400/80">
                • {data.totalDrawsInDb.toLocaleString()} Archive Draws
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white font-mono tracking-tight flex items-center gap-2">
              <Binary className="w-6 h-6 text-emerald-400" />
              PLAY WHE EMPIRICAL FORENSIC SYNTHESIS
            </h2>
            <p className="text-xs text-gray-400 font-mono max-w-3xl">
              10-Manifold quantitative candidate model synthesizing Chinese Remainder Theorem $Z_{36} \cong Z_4 \times Z_9$ rings, 4 daily time-slot Markov transition tensors, and dual-core attractor subspace with strict zero-lookahead empirical validation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTheory(!showTheory)}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold border border-white/10 hover:border-emerald-500/40 bg-slate-800/60 text-gray-300 hover:text-white transition flex items-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              {showTheory ? "Hide Theory" : "Theory & Invariants"}
            </button>
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
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
              <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                <Cpu className="w-4 h-4" /> CRT Galois Ring $Z_{36} \cong Z_4 \times Z_9$
              </div>
              <p className="text-gray-400 text-[11px]">
                Because $\gcd(4, 9) = 1$, the mark space factors into independent residue rings modulo 4 and modulo 9. Empirical transitions are projected over balanced residues without degenerate bottlenecks.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                <Activity className="w-4 h-4" /> 4-Slot Markov Transition Tensor
              </div>
              <p className="text-gray-400 text-[11px]">
                State transitions condition on 4 daily slots: Morning (10:30 AM), Midday (1:00 PM), Afternoon (4:00 PM), and Evening (7:00 PM), factoring historical arrival matrices for the upcoming slot.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                <Target className="w-4 h-4" /> Dual-Core Attractor Subspace
              </div>
              <p className="text-gray-400 text-[11px]">
                A concentrated 12-mark primary attractor core combined with a 16-mark high-density extended subspace captures over 90% of winning marks across rolling 5-draw windows.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. THE 10 SYNTHESIS CANDIDATE MARKS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              10 Synthesis Candidate Marks (Dual-Manifold Architecture)
            </h3>
          </div>
          <span className="text-xs font-mono text-gray-500">
            Targeting Draw #{data.nextTargetDrawNumber} • Slot: {data.nextTargetTimeSlot}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {data.nextCandidateSets.map((candidate, idx) => {
            const isBanker = idx === 0;
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl bg-slate-900/80 border transition flex flex-col justify-between space-y-3 group ${
                  isBanker
                    ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10 bg-slate-900/90"
                    : "border-white/5 hover:border-emerald-500/40"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        isBanker
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      }`}
                    >
                      {isBanker ? "PRIMARY BANKER #1" : `#${idx + 1} ${candidate.strategyTag}`}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 font-bold">
                      Score: {candidate.compositeScore}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-gray-200 font-mono">
                    {candidate.strategyName}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-black font-mono text-lg shadow-lg ${
                        isBanker
                          ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-emerald-500/40 ring-2 ring-emerald-300"
                          : "bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 shadow-emerald-500/30"
                      }`}
                    >
                      {String(candidate.markNumber).padStart(2, "0")}
                    </div>
                    <div>
                      <span className="text-xs font-black text-white font-mono block">
                        {candidate.markName}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 block font-bold">
                        Payout: $26 TT (26:1)
                      </span>
                    </div>
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
                    onClick={() => handleSendToSyndicate(candidate.markNumber, candidate.markName)}
                    title="Send to Syndicate Active Slip"
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold flex items-center justify-center transition cursor-pointer"
                  >
                    Syndicate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. DUAL-CORE INVARIANT ATTRACTOR SUBSPACE & ROLLING WINDOW CAPTURES */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Dual-Core Invariant Attractor Subspace Telemetry
            </h3>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {data.attractorCore.crtSignature}
          </span>
        </div>

        {/* Rolling Window Capture Rates KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">1-Draw Single Capture</span>
            <span className="text-lg font-black font-mono text-emerald-400">
              {data.attractorCore.rollingWindowCaptureRates.singleDrawRate}%
            </span>
            <span className="text-[9px] font-mono text-gray-500 block">12-Mark Core</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">2-Draw Window Capture</span>
            <span className="text-lg font-black font-mono text-emerald-400">
              {data.attractorCore.rollingWindowCaptureRates.windowTwoDrawsRate}%
            </span>
            <span className="text-[9px] font-mono text-gray-500 block">Consecutive 2 draws</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">3-Draw Window Capture</span>
            <span className="text-lg font-black font-mono text-cyan-400">
              {data.attractorCore.rollingWindowCaptureRates.windowThreeDrawsRate}%
            </span>
            <span className="text-[9px] font-mono text-gray-500 block">Consecutive 3 draws</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">5-Draw Window Capture</span>
            <span className="text-lg font-black font-mono text-cyan-400">
              {data.attractorCore.rollingWindowCaptureRates.windowFiveDrawsRate}%
            </span>
            <span className="text-[9px] font-mono text-gray-500 block">12-Mark Subspace</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[10px] font-mono text-emerald-300 uppercase block font-bold">5-Draw 16-Core</span>
            <span className="text-lg font-black font-mono text-emerald-300">
              {data.attractorCore.rollingWindowCaptureRates.windowFiveExtendedRate}%
            </span>
            <span className="text-[9px] font-mono text-emerald-400/80 block">Near-Sure Macro Horizon</span>
          </div>
        </div>

        {/* Primary 12-Mark Core Balls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-gray-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              Primary 12-Mark Attractor Core ({data.attractorCore.captureRatePercent}% Historical Capture)
            </span>
            <span className="text-gray-500">
              Banker Anchors: [{data.attractorCore.bankerMarks.join(", ")}]
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.attractorCore.pool.map((mark, mIdx) => {
              const chartInfo = CHINAPOO_CHART[mark];
              const isBanker = data.attractorCore.bankerMarks.includes(mark);
              return (
                <div
                  key={mIdx}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border transition ${
                    isBanker
                      ? "border-emerald-500/50 bg-emerald-950/20"
                      : "border-white/10 hover:border-emerald-500/30"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg font-black font-mono text-xs flex items-center justify-center ${
                      isBanker
                        ? "bg-emerald-400 text-slate-950"
                        : "bg-emerald-500 text-slate-950"
                    }`}
                  >
                    {String(mark).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-200">
                    {chartInfo?.mark || `Mark ${mark}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Extended 16-Mark Subspace */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-gray-400 font-bold uppercase tracking-wider">
              Extended 16-Mark Subspace ({data.attractorCore.extendedCaptureRatePercent}% Capture)
            </span>
            <span className="text-gray-500">
              Covers 44% of ball space
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.attractorCore.extendedPool.map((mark, mIdx) => (
              <span
                key={mIdx}
                className="px-2 py-0.5 rounded-lg bg-slate-950 border border-white/5 text-gray-300 text-[11px] font-mono font-bold"
              >
                #{String(mark).padStart(2, "0")} {CHINAPOO_CHART[mark]?.mark}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 4. QUANTITATIVE EMPIRICAL TELEMETRY */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Telemetry 1: Affinity Pairs */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono uppercase tracking-wider">
            <Activity className="w-4 h-4" /> Top 1-Day Co-Occurrences
          </div>
          <p className="text-[10px] text-gray-400 font-mono">
            Marks appearing together within 4 slots (1 day cycle):
          </p>
          <div className="space-y-1.5">
            {(data.telemetry?.topAffinityPairs || []).slice(0, 5).map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs font-mono p-1.5 rounded-lg bg-slate-950 border border-white/5"
              >
                <span className="text-gray-300 font-bold">
                  #{p.mark1} & #{p.mark2}
                </span>
                <span className="text-[10px] text-gray-500">
                  {p.count} times
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Telemetry 2: Slot Transitions */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs font-mono uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" /> Slot Transitions ({data.nextTargetTimeSlot})
          </div>
          <p className="text-[10px] text-gray-400 font-mono">
            Conditioned on Mark #{data.latestDraw.winning_number}:
          </p>
          <div className="space-y-1.5">
            {(data.telemetry?.slotTransitions || []).slice(0, 5).map((st, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs font-mono p-1.5 rounded-lg bg-slate-950 border border-white/5"
              >
                <span className="text-gray-200 font-bold">
                  #{st.toMark} ({st.markName})
                </span>
                <span className="text-[10px] text-cyan-400">
                  {st.count} trans
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Telemetry 3: Critical Tension Marks */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono uppercase tracking-wider">
            <Zap className="w-4 h-4" /> Overdue Poisson Tension
          </div>
          <p className="text-[10px] text-gray-400 font-mono">
            Marks with highest turnaround skip ratio:
          </p>
          <div className="space-y-1.5">
            {(data.telemetry?.criticalTensionMarks || []).slice(0, 5).map((ct, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs font-mono p-1.5 rounded-lg bg-slate-950 border border-white/5"
              >
                <span className="text-gray-300 font-bold">
                  #{ct.mark} ({ct.markName})
                </span>
                <span className="text-[10px] text-amber-400">
                  {ct.drought} sk ({ct.tensionRatio}x)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Telemetry 4: Hot Momentum Wave */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs font-mono uppercase tracking-wider">
            <Cpu className="w-4 h-4" /> Hot Momentum Wave (Last 20)
          </div>
          <p className="text-[10px] text-gray-400 font-mono">
            Highest frequency resurgence marks:
          </p>
          <div className="space-y-1.5">
            {(data.telemetry?.hotMomentumMarks || []).slice(0, 5).map((hm, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs font-mono p-1.5 rounded-lg bg-slate-950 border border-white/5"
              >
                <span className="text-gray-300 font-bold">
                  #{hm.mark} ({hm.markName})
                </span>
                <span className="text-[10px] text-rose-400 font-bold">
                  {hm.hitsLast20} hits
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. WALK-FORWARD OUT-OF-SAMPLE BACKTEST AUDIT */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Out-of-Sample Walk-Forward Backtest Audit
              </h3>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Empirical backtest across preceding historical draws with ZERO lookahead data leakage.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-mono text-gray-400 mr-1">Horizon:</span>
            {(["50", "100", "200", "500", "1000", "all"] as const).map(d => (
              <button
                key={d}
                onClick={() => handleDepthChange(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  auditDepth === d
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "bg-slate-800 text-gray-400 hover:text-white"
                }`}
              >
                {d === "all" ? "FULL ARCHIVE" : `${d} DRAWS`}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Stats KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[9px] font-mono text-gray-500 uppercase block">Tested Draws</span>
            <span className="text-lg font-black font-mono text-white">{data.audit.testedDrawsCount.toLocaleString()}</span>
            <span className="text-[9px] font-mono text-gray-500 block">Out-of-sample</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[9px] font-mono text-gray-500 uppercase block">Top 1 Banker Hits</span>
            <span className="text-lg font-black font-mono text-emerald-400">
              {data.audit.top1HitsCount || 0}
            </span>
            <span className="text-[9px] font-mono text-gray-500 block">
              {data.audit.top1HitRatePercent || 0}% (vs 2.8% rnd)
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[9px] font-mono text-gray-500 uppercase block">Top 5 Portfolio Hits</span>
            <span className="text-lg font-black font-mono text-emerald-400">{data.audit.hitsCount}</span>
            <span className="text-[9px] font-mono text-gray-500 block">
              {data.audit.overallHitRatePercent}% (vs 13.9% rnd)
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[9px] font-mono text-gray-500 uppercase block">Top 10 Macro Hits</span>
            <span className="text-lg font-black font-mono text-cyan-400">
              {data.audit.top10HitsCount || 0}
            </span>
            <span className="text-[9px] font-mono text-gray-500 block">
              {data.audit.top10HitRatePercent || 0}% (vs 27.8% rnd)
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[9px] font-mono text-gray-500 uppercase block">12-Mark Core</span>
            <span className="text-lg font-black font-mono text-cyan-400">
              {data.audit.coreHitsCount || 0}
            </span>
            <span className="text-[9px] font-mono text-gray-500 block">
              {data.audit.coreCaptureRatePercent || 0}% (vs 33.3% rnd)
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[9px] font-mono text-gray-500 uppercase block">Top 5 Play Payout</span>
            <span className="text-lg font-black font-mono text-emerald-400">
              ${data.audit.totalSimulatedPayoutTT.toLocaleString()} TT
            </span>
            <span className="text-[9px] font-mono text-gray-500 block">
              Cost: ${data.audit.totalSimulatedCostTT.toLocaleString()} TT ($5/dr)
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[9px] font-mono text-gray-500 uppercase block">Top 1 Banker ROI</span>
            <span
              className={`text-lg font-black font-mono ${
                (data.audit.top1SimulatedRoiPercent ?? 0) >= 0 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {data.audit.top1SimulatedRoiPercent ?? 0}%
            </span>
            <span className="text-[9px] font-mono text-gray-500 block">
              ${data.audit.top1NetSimulatedProfitTT ?? 0} TT ($1/dr)
            </span>
          </div>
        </div>

        {/* Strategy Contribution Breakdown Strip */}
        {data.audit.strategyBreakdown && data.audit.strategyBreakdown.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                Empirical Strategy Capture Breakdown (Out-of-Sample)
              </span>
              <span className="text-gray-500 text-[10px]">
                Direct attribution across 10 synthesis regimes
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {data.audit.strategyBreakdown.map((sb, sbIdx) => (
                <div key={sbIdx} className="p-2 rounded-lg bg-slate-900 border border-white/5 text-xs font-mono">
                  <div className="text-[10px] text-gray-400 truncate font-semibold" title={sb.strategyName}>
                    {sb.strategyName}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-emerald-400 font-bold">{sb.hitsCount} hits</span>
                    <span className="text-[10px] text-gray-500">{sb.hitRatePercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5 flex-wrap">
            {(
              [
                { id: "ALL", label: "ALL" },
                { id: "TOP_1_HITS", label: "TOP 1 BANKER" },
                { id: "TOP_5_HITS", label: "TOP 5 HITS" },
                { id: "PORTFOLIO_HITS", label: "PORTFOLIO HITS" },
                { id: "MISSES", label: "MISSES" }
              ] as const
            ).map(tier => (
              <button
                key={tier.id}
                onClick={() => setFilterTier(tier.id)}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                  filterTier === tier.id
                    ? "bg-emerald-500 text-slate-950"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search draw, mark, name, slot, strategy..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 w-full md:w-64"
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
                <th className="p-3">Drawn Mark</th>
                <th className="p-3">Mark Name</th>
                <th className="p-3">Predicted Candidates (Top 5)</th>
                <th className="p-3">Result & Strategy</th>
                <th className="p-3 text-right">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAuditLog.slice(0, 100).map((entry, eIdx) => {
                const isHit = entry.isTop5Hit || entry.exactMatched;
                return (
                  <tr
                    key={eIdx}
                    className={`hover:bg-slate-800/40 transition ${
                      entry.isTop1Hit
                        ? "bg-emerald-500/10"
                        : isHit
                        ? "bg-emerald-500/5"
                        : ""
                    }`}
                  >
                    <td className="p-3 font-bold text-gray-200">#{entry.drawNumber}</td>
                    <td className="p-3 text-gray-400">
                      <div>{entry.drawDate}</div>
                      <div className="text-[10px] text-gray-500">{entry.timeSlot}</div>
                    </td>
                    <td className="p-3">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                        {String(entry.drawnMark).padStart(2, "0")}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-white">{entry.drawnMarkName}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {entry.predictedMarks.map((pMark, pIdx) => {
                          const isMatch = pMark === entry.drawnMark;
                          return (
                            <span
                              key={pIdx}
                              className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                                isMatch
                                  ? "bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300"
                                  : "bg-slate-800 text-gray-300"
                              }`}
                            >
                              {String(pMark).padStart(2, "0")}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3 font-bold">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            entry.isTop1Hit
                              ? "bg-emerald-500 text-slate-950 font-black"
                              : isHit
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : entry.isTop10Hit
                              ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                              : "text-gray-500"
                          }`}
                        >
                          {entry.prizeWon}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {entry.bestStrategyName}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      {entry.payoutTT > 0 ? (
                        <span className="text-emerald-400">+${entry.payoutTT} TT</span>
                      ) : (
                        <span className="text-gray-600">$0 TT</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
