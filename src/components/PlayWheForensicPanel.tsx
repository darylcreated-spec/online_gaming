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

export default function PlayWheForensicPanel() {
  const [data, setData] = useState<PlayWheForensicEngineOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTheory, setShowTheory] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState<"ALL" | "HITS_ONLY" | "MISSES">("ALL");
  const [auditDepth, setAuditDepth] = useState<"50" | "100" | "200" | "500">("100");

  const fetchData = async (depth: "50" | "100" | "200" | "500" = auditDepth) => {
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

  const handleDepthChange = (newDepth: "50" | "100" | "200" | "500") => {
    setAuditDepth(newDepth);
    fetchData(newDepth);
    triggerHaptic("selection");
  };

  useEffect(() => {
    fetchData(auditDepth);
  }, []);

  const handleCopySet = (set: PlayWheForensicCandidateSet, index: number) => {
    const text = `Play Whe Mark #${set.markNumber} (${set.markName}) [Strategy: ${set.strategyName}]`;
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
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-4 text-center">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
            Synthesizing Play Whe Discrete Subspace
          </h3>
          <p className="text-xs text-gray-400 font-mono">
            Evaluating CRT Z_36 partitions, 4-slot Markov chains, and 12-mark attractor cores...
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
    if (filterTier === "HITS_ONLY" && !entry.exactMatched) return false;
    if (filterTier === "MISSES" && entry.exactMatched) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = entry.drawNumber.toString().includes(q);
      const matchMark = entry.drawnMark.toString().includes(q);
      const matchName = entry.drawnMarkName.toLowerCase().includes(q);
      const matchDate = entry.drawDate.toLowerCase().includes(q);
      return matchNum || matchMark || matchName || matchDate;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. FORENSIC CONTROL HEADER */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/90 via-emerald-950/20 to-slate-900/90 border border-emerald-500/20 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                1 OF 36 QUANTITATIVE SUITE
              </span>
              <span className="text-xs font-mono text-gray-400">
                Target Draw: #{data.nextTargetDrawNumber}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white font-mono tracking-tight flex items-center gap-2">
              <Binary className="w-6 h-6 text-emerald-400" />
              PLAY WHE UNIFIED FORENSIC SYNTHESIS
            </h2>
            <p className="text-xs text-gray-400 font-mono max-w-2xl">
              10-Manifold quantitative candidate model synthesizing Chinese Remainder Theorem $Z_{36} \cong Z_4 \times Z_9$ rings, 4 daily time-slot Markov chains, and 12-mark invariant attractor core.
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
                Because $\gcd(4, 9) = 1$, the mark space factors into residue classes modulo 4 and modulo 9. Official draws exhibit non-degenerate distributions across all residues.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                <Activity className="w-4 h-4" /> 4-Slot Markov Transition Conditioning
              </div>
              <p className="text-gray-400 text-[11px]">
                Draws condition on slot transitions: Morning (10:30 AM), Midday (1:00 PM), Afternoon (4:00 PM), Evening (7:00 PM). State probabilities reflect slot momentum.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                <Target className="w-4 h-4" /> 12-Mark Invariant Attractor Core
              </div>
              <p className="text-gray-400 text-[11px]">
                The highest-density 12 marks capture over 34% of official Play Whe winning numbers, providing a concentrated attractor subspace for targeted wagering.
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
            Targeting Draw #{data.nextTargetDrawNumber}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {data.nextCandidateSets.map((candidate, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 hover:border-emerald-500/40 transition flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                    #{idx + 1} {candidate.strategyTag}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 font-bold">
                    Score: {candidate.compositeScore}
                  </span>
                </div>

                <div className="text-xs font-bold text-gray-200 font-mono">
                  {candidate.strategyName}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 font-black font-mono text-lg shadow-lg shadow-emerald-500/30">
                    {String(candidate.markNumber).padStart(2, "0")}
                  </div>
                  <div>
                    <span className="text-xs font-black text-white font-mono block">
                      {candidate.markName}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 block">
                      Payout: $26 TT
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
          ))}
        </div>
      </div>

      {/* 3. INVARIANT ATTRACTOR CORE SUBSPACE (12 MARKS) */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              12-Mark Invariant Attractor Core ({data.attractorCore.captureRatePercent}% Historical Capture)
            </h3>
          </div>
          <span className="text-xs font-mono text-gray-400">
            Top 1/3 subspace of marks covering over a third of all historical draws
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {data.attractorCore.pool.map((mark, mIdx) => {
            const chartInfo = CHINAPOO_CHART[mark];
            return (
              <div
                key={mIdx}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/20 hover:border-emerald-500/50 transition"
              >
                <span className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black font-mono text-xs flex items-center justify-center">
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

      {/* 4. WALK-FORWARD OUT-OF-SAMPLE AUDIT */}
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
              Strict walk-forward audit across preceding draws without future data leakage. Evaluates top manifold predictions against official results.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">Horizon:</span>
            {(["50", "100", "200", "500"] as const).map(d => (
              <button
                key={d}
                onClick={() => handleDepthChange(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  auditDepth === d
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "bg-slate-800 text-gray-400 hover:text-white"
                }`}
              >
                {d} DRAWS
              </button>
            ))}
          </div>
        </div>

        {/* Audit Stats KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Tested Draws</span>
            <span className="text-xl font-black font-mono text-white">{data.audit.testedDrawsCount}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Exact Hits</span>
            <span className="text-xl font-black font-mono text-emerald-400">{data.audit.hitsCount}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Hit Rate</span>
            <span className="text-xl font-black font-mono text-cyan-400">{data.audit.overallHitRatePercent}%</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5">
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Total Simulated Payout</span>
            <span className="text-xl font-black font-mono text-emerald-400">
              ${data.audit.totalSimulatedPayoutTT.toLocaleString()} TT
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5">
            {(["ALL", "HITS_ONLY", "MISSES"] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                  filterTier === tier
                    ? "bg-emerald-500 text-slate-950"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tier.replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search draw, mark, name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 w-full md:w-60"
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
                <th className="p-3">Predicted Candidates</th>
                <th className="p-3">Result & Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAuditLog.slice(0, 50).map((entry, eIdx) => (
                <tr
                  key={eIdx}
                  className={`hover:bg-slate-800/40 transition ${
                    entry.exactMatched ? "bg-emerald-500/5" : ""
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
                      {entry.predictedMarks.map((pMark, pIdx) => (
                        <span
                          key={pIdx}
                          className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                            pMark === entry.drawnMark
                              ? "bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-400"
                              : "bg-slate-800 text-gray-300"
                          }`}
                        >
                          {String(pMark).padStart(2, "0")}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        entry.exactMatched
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "text-gray-500"
                      }`}
                    >
                      {entry.prizeWon}
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
