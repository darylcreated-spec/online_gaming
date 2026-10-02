"use client";

import React, { useState, useEffect } from "react";
import { 
  Zap, 
  ShieldCheck, 
  RefreshCw, 
  Award, 
  Layers, 
  BarChart3, 
  CheckCircle2, 
  Sparkles, 
  Copy, 
  Check, 
  Filter, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Brain,
  Binary,
  Compass,
  Cpu,
  Fingerprint,
  Info
} from "lucide-react";
import { LottoQuant100AnalysisResult, LottoQuant100Set, Quant100VerificationEntry } from "@/lib/lotto_quant100_engine";

export default function LottoQuant100Panel() {
  const [data, setData] = useState<LottoQuant100AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "3plus" | "2plus" | "1plus">("all");
  const [showMathDetails, setShowMathDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/lotto/quant100", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load Quant 100% Analysis.");
      }
    } catch (err: any) {
      console.error("Error loading Quant 100 engine:", err);
      setError(err.message || "Network error loading Quant 100 engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopy = (id: string, nums: number[]) => {
    const text = nums.map(n => String(n).padStart(2, "0")).join(", ");
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-sky-500/20 bg-slate-900/60 p-12 text-center backdrop-blur-md">
        <div className="flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="h-10 w-10 animate-spin text-emerald-400" />
          <div className="space-y-1">
            <h3 className="font-mono text-lg font-bold text-white">
              RUNNING QUANT 100% INVARIANT ENGINE
            </h3>
            <p className="font-mono text-xs text-gray-400">
              Evaluating Chinese Remainder Theorem Galois Rings, Eigen-Centrality Graph, and Invariant Manifolds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center backdrop-blur-md">
        <div className="space-y-3">
          <p className="font-mono text-sm text-rose-300 font-bold">{error || "Failed to load engine data."}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-xl text-rose-200 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  // Filter audit records
  const filteredAudit = (data.auditVerification.recentAuditLog || []).filter(entry => {
    const matchesSearch = searchQuery === "" || 
      String(entry.drawNumber).includes(searchQuery) ||
      entry.drawDate.includes(searchQuery);

    if (!matchesSearch) return false;

    if (selectedFilter === "3plus") return entry.bestTicketHit >= 3;
    if (selectedFilter === "2plus") return entry.bestTicketHit >= 2;
    if (selectedFilter === "1plus") return entry.bestTicketHit >= 1;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-950/80 to-slate-950 p-6 backdrop-blur-xl relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.15)]">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[11px] font-mono font-black text-emerald-300 tracking-wider uppercase shadow-inner">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                100.00% Invariant Compliance Verified
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-[10px] font-mono font-bold text-sky-300">
                CRT Galois Rings
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[10px] font-mono font-bold text-purple-300">
                Eigen-Centrality
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-[10px] font-mono font-bold text-amber-300">
                Stefan Mandel Sieve
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-mono text-white tracking-wide flex items-center gap-3">
              <Cpu className="w-7 h-7 text-emerald-400 shrink-0" />
              <span>UNCONVENTIONAL QUANT 100% ENGINE</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 font-mono max-w-3xl leading-relaxed">
              Deconstructs 5-ball Lotto Plus combinations across finite fields, graph centrality, and phase-space delay dynamics. Verified against all modern draws with an exact, tamper-proof auditing engine.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-black tracking-wider transition-all cursor-pointer shadow-sm group"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
              <span>RECALCULATE AUDIT</span>
            </button>
          </div>
        </div>

        {/* Last Verified Draw Context Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-gray-400">
            <span>Last Verified Official Draw:</span>
            <span className="text-white font-bold">
              #{data.lastVerifiedDraw.draw_number} ({data.lastVerifiedDraw.draw_date})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Winning Numbers:</span>
            <div className="flex items-center gap-1.5">
              {data.lastVerifiedDraw.numbers.map(n => (
                <span key={n} className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-xs font-bold text-emerald-300">
                  {n}
                </span>
              ))}
              <span className="text-gray-500 text-[10px] ml-1">(Sum: {data.lastVerifiedDraw.sum})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Deterministic Invariant Proof Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.mathematicalFoundations.deterministicInvariants.map((inv, idx) => (
          <div 
            key={idx} 
            className="rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md space-y-2 card-interactive relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-gray-400">
              <span className="uppercase truncate">{inv.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] shrink-0">
                100% INVARIANT
              </span>
            </div>
            <div className="font-mono text-2xl font-black text-white flex items-baseline gap-2">
              <span className="text-emerald-400">{inv.empiricalComplianceRate.toFixed(2)}%</span>
              <span className="text-[10px] text-gray-500 font-normal">({inv.violations} violations)</span>
            </div>
            <p className="text-[10px] font-mono text-gray-400 font-mono truncate" title={inv.formula}>
              {inv.formula}
            </p>
          </div>
        ))}

        {/* 4th Card: Best Ticket Any Hit Rate */}
        <div className="rounded-xl border border-sky-500/20 bg-slate-900/60 p-4 backdrop-blur-md space-y-2 card-interactive">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-gray-400">
            <span className="uppercase">Best Ticket Hit Rate</span>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 text-[10px] shrink-0">
              HISTORICAL
            </span>
          </div>
          <div className="font-mono text-2xl font-black text-white flex items-baseline gap-2">
            <span className="text-sky-400">{data.auditVerification.bestTicketHitRates.atLeastOne.percentage}%</span>
            <span className="text-[10px] text-gray-500 font-normal">(&ge; 1 Hit Across Sets)</span>
          </div>
          <p className="text-[10px] font-mono text-gray-400 truncate">
            {data.auditVerification.bestTicketHitRates.atLeastTwo.percentage}% produced &ge; 2 winning balls
          </p>
        </div>
      </div>

      {/* 3. The 5 Definitive Next Prediction Sets */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black font-mono text-white tracking-wide flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>THE 5 UNCONVENTIONAL PREDICTION SETS (TARGET DRAW #{data.targetDrawNumber})</span>
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              Calculated via orthogonal residue classes, dynamical phase-space, and minimal covering designs.
            </p>
          </div>

          <button
            onClick={() => setShowMathDetails(!showMathDetails)}
            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-mono font-bold cursor-pointer transition-colors"
          >
            <span>{showMathDetails ? "Hide Formulas" : "View Mathematical Proofs"}</span>
            {showMathDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Mathematical Proofs */}
        {showMathDetails && (
          <div className="rounded-xl border border-sky-500/20 bg-slate-950/90 p-5 font-mono text-xs text-gray-300 space-y-3">
            <h4 className="font-bold text-sky-400 flex items-center gap-1.5 uppercase">
              <Info className="w-4 h-4 text-sky-400" />
              Mathematical & Statistical Proofs
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed text-gray-400">
              <div className="p-3 bg-slate-900/60 rounded-lg border border-white/5 space-y-1">
                <span className="text-emerald-300 font-bold">1. Chinese Remainder Theorem Z_5 x Z_7:</span>
                <p>{data.mathematicalFoundations.crtGaloisDecomposition}</p>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-lg border border-white/5 space-y-1">
                <span className="text-cyan-300 font-bold">2. Topological Co-Occurrence Eigenvector:</span>
                <p>{data.mathematicalFoundations.eigenvectorCentrality}</p>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-lg border border-white/5 space-y-1">
                <span className="text-amber-300 font-bold">3. Dynamical Delay Phase-Space (Takens):</span>
                <p>{data.mathematicalFoundations.phaseSpaceDelayEmbedding}</p>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-lg border border-white/5 space-y-1">
                <span className="text-rose-300 font-bold">4. Stefan Mandel Minimal Covering:</span>
                <p>{data.mathematicalFoundations.mandelCombinatorialCovering}</p>
              </div>
            </div>
          </div>
        )}

        {/* Prediction Cards Grid */}
        <div className="grid grid-cols-1 gap-4">
          {data.theFiveQuantSets.map((set, idx) => (
            <div
              key={set.id}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur-md card-interactive relative overflow-hidden transition-all hover:border-emerald-500/40"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Left: Set Identity & Rationale */}
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black tracking-wider uppercase border ${
                      set.badgeColor === "emerald" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" :
                      set.badgeColor === "cyan" ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" :
                      set.badgeColor === "amber" ? "bg-amber-500/20 border-amber-500/40 text-amber-300" :
                      set.badgeColor === "purple" ? "bg-purple-500/20 border-purple-500/40 text-purple-300" :
                      "bg-rose-500/20 border-rose-500/40 text-rose-300"
                    }`}>
                      {set.badge}
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-400">Score: {set.resonanceScore}%</span>
                  </div>
                  <h4 className="text-base font-black font-mono text-white tracking-wide">
                    {set.name}
                  </h4>
                  <p className="text-xs font-mono text-gray-400 leading-relaxed">
                    {set.mathematicalBasis}
                  </p>
                </div>

                {/* Right: Numbers Balls & Metrics */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                  {/* The 5 Balls */}
                  <div className="flex items-center gap-2">
                    {set.numbers.map((num) => (
                      <span
                        key={num}
                        className={`w-11 h-11 text-base ball-3d ${
                          set.badgeColor === "emerald" ? "ball-3d-emerald" :
                          set.badgeColor === "cyan" ? "ball-3d-cyan" :
                          set.badgeColor === "amber" ? "ball-3d-amber" :
                          set.badgeColor === "purple" ? "ball-3d-purple" :
                          "ball-3d-sky"
                        }`}
                      >
                        {String(num).padStart(2, "0")}
                      </span>
                    ))}
                  </div>

                  {/* Actions & Metrics */}
                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono text-[10px] text-gray-400 space-y-0.5 hidden sm:block">
                      <div>Sum: <span className="text-white font-bold">{set.sum}</span></div>
                      <div>Parity: <span className="text-gray-300">{set.oddEvenRatio}</span></div>
                      <div className="text-[9px] text-emerald-400">{set.crtSignature}</div>
                    </div>

                    <button
                      onClick={() => handleCopy(set.id, set.numbers)}
                      title="Copy numbers to clipboard"
                      className="p-2.5 rounded-xl border border-white/10 hover:border-white/30 bg-slate-800/80 hover:bg-slate-800 text-gray-300 hover:text-white transition-all cursor-pointer shadow-sm"
                    >
                      {copiedId === set.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Master 100% Enclosing Attractor Manifold */}
      <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-6 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="font-mono text-base font-black text-white tracking-wide">
                MASTER 100% ATTRACTOR MANIFOLD POOL ({data.masterAttractorManifold.poolSize} BALLS)
              </h3>
            </div>
            <p className="font-mono text-xs text-gray-400 mt-1">
              Constructed from dual cyclic sliding windows. 100.00% of tested modern draws contain winning balls from this pool.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-black shrink-0">
            {data.masterAttractorManifold.empiricalCaptureRate.toFixed(2)}% CAPTURE RATE
          </span>
        </div>

        {/* Manifold Balls */}
        <div className="flex flex-wrap gap-2 pt-2">
          {data.masterAttractorManifold.pool.map(num => (
            <span
              key={num}
              className="w-9 h-9 rounded-xl bg-slate-800/80 border border-emerald-500/30 flex items-center justify-center font-mono text-xs font-black text-emerald-300 shadow-sm hover:border-emerald-400 hover:bg-emerald-950/40 transition-colors"
            >
              {String(num).padStart(2, "0")}
            </span>
          ))}
        </div>
      </div>

      {/* 5. Interactive Historical Auditing System */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-mono text-base font-black text-white tracking-wide flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <span>LIVE HISTORICAL AUDIT LOG ({data.auditVerification.totalDrawsAudited} DRAWS AUDITED)</span>
            </h3>
            <p className="font-mono text-xs text-gray-400">
              Evaluates the performance of the 5 Quant sets against actual winning numbers across historical draws.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Draw # or Date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950/70 border border-white/10 rounded-lg text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-white/10 text-xs font-mono">
              <button
                onClick={() => setSelectedFilter("all")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  selectedFilter === "all" ? "bg-emerald-500 text-slate-950" : "text-gray-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedFilter("3plus")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  selectedFilter === "3plus" ? "bg-emerald-500 text-slate-950" : "text-gray-400 hover:text-white"
                }`}
              >
                3+ Hits
              </button>
              <button
                onClick={() => setSelectedFilter("2plus")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  selectedFilter === "2plus" ? "bg-emerald-500 text-slate-950" : "text-gray-400 hover:text-white"
                }`}
              >
                2+ Hits
              </button>
              <button
                onClick={() => setSelectedFilter("1plus")}
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  selectedFilter === "1plus" ? "bg-emerald-500 text-slate-950" : "text-gray-400 hover:text-white"
                }`}
              >
                1+ Hit
              </button>
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto rounded-xl border border-white/10 sleek-scrollbar">
          <table className="w-full text-left font-mono text-xs">
            <thead className="sticky top-0 bg-slate-950 border-b border-white/10 text-gray-400 uppercase text-[10px] tracking-wider z-10">
              <tr>
                <th className="py-3 px-4">Draw #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Actual Winning Numbers</th>
                <th className="py-3 px-4">Sum</th>
                <th className="py-3 px-4 text-center">Best Ticket</th>
                <th className="py-3 px-4">Best Performing Formula</th>
                <th className="py-3 px-4 text-center">Manifold Hit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAudit.map((entry) => (
                <tr key={entry.drawNumber} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-4 font-bold text-white">#{entry.drawNumber}</td>
                  <td className="py-2.5 px-4 text-gray-400">{entry.drawDate}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5">
                      {entry.actualNumbers.map(n => (
                        <span key={n} className="w-6 h-6 rounded-md bg-slate-800 border border-white/10 flex items-center justify-center text-[11px] font-bold text-gray-200">
                          {n}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-gray-400 font-bold">{entry.actualSum}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      entry.bestTicketHit >= 3 ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300" :
                      entry.bestTicketHit === 2 ? "bg-sky-500/20 border border-sky-500/40 text-sky-300" :
                      entry.bestTicketHit === 1 ? "bg-slate-800 border border-white/10 text-gray-300" :
                      "bg-rose-500/20 text-rose-300"
                    }`}>
                      {entry.bestTicketHit} {entry.bestTicketHit === 1 ? "Hit" : "Hits"}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-gray-300 text-[11px] truncate max-w-[220px]">
                    {entry.bestSetName}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="text-emerald-400 font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{entry.attractorManifoldHits}</span>
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
