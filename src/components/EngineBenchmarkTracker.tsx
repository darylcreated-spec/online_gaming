"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  RefreshCw,
  Target,
  Binary,
  Cpu,
  Layers,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Filter,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Sliders,
  Flame,
  Award
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { EngineLeaderboardRow, EngineLogEntry, CalibrationDiagnostic } from "@/lib/engine_tracker";

interface EngineTrackerResponse {
  success: boolean;
  game: string;
  horizon: number;
  leaderboard: EngineLeaderboardRow[];
  recentAudits: EngineLogEntry[];
  diagnostics: CalibrationDiagnostic[];
  totalEvaluated: number;
  overallWinRatePct: number;
  totalSimulatedNetProfitTT: number;
  error?: string;
}

export default function EngineBenchmarkTracker() {
  const [data, setData] = useState<EngineTrackerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [selectedHorizon, setSelectedHorizon] = useState<string>("100");
  const [searchQuery, setSearchQuery] = useState("");
  const [auditFilter, setAuditFilter] = useState<"ALL" | "WINS" | "LOSSES">("ALL");

  const fetchData = async (game = selectedGame, horizon = selectedHorizon) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/engine-tracker?game=${game}&depth=${horizon}`, {
        cache: "no-store"
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load engine performance stats.");
      setData(json);
      triggerHaptic("success");
    } catch (err: any) {
      console.error("[EngineTracker UI] Fetch error:", err);
      setError(err.message || "Failed to load engine data.");
      triggerHaptic("warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedGame, selectedHorizon);
  }, [selectedGame, selectedHorizon]);

  const handleManualAction = async (action: "reconcile" | "snapshot" | "reconcile_and_snapshot") => {
    setActionLoading(true);
    try {
      triggerHaptic("selection");
      const res = await fetch("/api/engine-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, game: selectedGame === "all" ? undefined : selectedGame })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to execute action.");
      triggerHaptic("success");
      await fetchData(selectedGame, selectedHorizon);
    } catch (err: any) {
      alert("Error: " + err.message);
      triggerHaptic("warning");
    } finally {
      setActionLoading(false);
    }
  };

  // Format game key display
  const getGameLabel = (key: string) => {
    switch (key) {
      case "play-whe": return "Play Whe";
      case "pick4": return "Pick 4";
      case "cashpot": return "Cash Pot";
      case "lotto-plus": return "Lotto Plus";
      case "win-for-life": return "Win For Life";
      default: return key.toUpperCase();
    }
  };

  // Filter audit records
  const filteredAudits = (data?.recentAudits || []).filter(audit => {
    const matchesFilter =
      auditFilter === "ALL" ? true :
      auditFilter === "WINS" ? audit.is_prize_winner === 1 :
      audit.is_prize_winner === 0;

    const matchesSearch = searchQuery === "" ||
      audit.engine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.strategy_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.target_draw_number.toString().includes(searchQuery) ||
      audit.game_key.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4 animate-fade-in text-slate-100">
      {/* 1. Header & Terminal Status Strip */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0f1418] border border-cyan-500/20 p-5 sm:p-6 shadow-[0_0_30px_rgba(56,189,248,0.06)]">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-500" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono tracking-wider font-semibold bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                NLCB QUANTUM // MULTI-ENGINE BENCHMARK
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                EMPIRICAL VERIFIER ONLINE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Cpu className="w-6 h-6 text-cyan-400" />
              Engine Prediction & Hit Evaluation Tracker
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Automatic snapshotting, multi-tier prize grading, and comparative hit leaderboards across all 5 NLCB games. Detects optimal regimes and flags models requiring calibration.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleManualAction("reconcile_and_snapshot")}
              disabled={actionLoading || loading}
              className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
              Reconcile & Snapshot N+1
            </button>
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-colors"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Global KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-[#171c20]/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Total Audited Draws</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-white mt-0.5 block">
              {data?.totalEvaluated || 0}
            </span>
          </div>

          <div className="bg-[#171c20]/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Overall Prize Win Rate</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
              {data?.overallWinRatePct || 0}%
            </span>
          </div>

          <div className="bg-[#171c20]/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Net Simulated Profit</span>
            <span className={`text-lg sm:text-xl font-bold font-mono mt-0.5 block ${
              (data?.totalSimulatedNetProfitTT || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              ${(data?.totalSimulatedNetProfitTT || 0).toLocaleString()} TT
            </span>
          </div>

          <div className="bg-[#171c20]/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Active Regimes Tracked</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-cyan-400 mt-0.5 block">
              {data?.leaderboard.length || 0} Regimes
            </span>
          </div>
        </div>
      </div>

      {/* 2. Game Selector Bar & Horizon Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#13171b] p-2 rounded-xl border border-slate-800">
        {/* Game filter pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All Games" },
            { id: "play-whe", label: "Play Whe" },
            { id: "pick4", label: "Pick 4" },
            { id: "cashpot", label: "Cash Pot" },
            { id: "lotto-plus", label: "Lotto Plus" },
            { id: "win-for-life", label: "Win For Life" },
          ].map(game => (
            <button
              key={game.id}
              onClick={() => setSelectedGame(game.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedGame === game.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.15)] font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {game.label}
            </button>
          ))}
        </div>

        {/* Horizon selector */}
        <div className="flex items-center gap-1.5 justify-end">
          <span className="text-[11px] font-mono text-slate-500 uppercase mr-1">Horizon:</span>
          {["50", "100", "200", "all"].map(depth => (
            <button
              key={depth}
              onClick={() => setSelectedHorizon(depth)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                selectedHorizon === depth
                  ? "bg-slate-700 text-white font-bold border border-slate-600"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {depth === "all" ? "Full Archive" : depth}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Engine Performance Leaderboard */}
      <div className="bg-[#0f1418] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-white text-base">Comparative Engine Performance Leaderboard</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Ranked by Prize Win Rate & ROI
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
            Evaluating multi-engine backtest and live draw logs...
          </div>
        ) : !data || data.leaderboard.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            No verified engine records available for this game horizon yet. Click "Reconcile & Snapshot N+1" to start tracking.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#171c20]/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Rank / Engine</th>
                  <th className="py-3 px-4">Game</th>
                  <th className="py-3 px-4 text-center">Evaluated</th>
                  <th className="py-3 px-4 text-center">Prize Win Rate</th>
                  <th className="py-3 px-4 text-center">Any Match %</th>
                  <th className="py-3 px-4 text-right">Net Profit TT$</th>
                  <th className="py-3 px-4 text-right">ROI %</th>
                  <th className="py-3 px-4">Best Prize Captured</th>
                  <th className="py-3 px-4 text-center">Engine Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {data.leaderboard.map((row, idx) => {
                  const isPrime = row.status === "ACTIVE PRIME";
                  const isDrift = row.status === "REGIME DRIFT ALERT";
                  const isCalib = row.status === "NEEDS CALIBRATION";

                  return (
                    <tr key={`${row.engine_key}_${row.game_key}_${idx}`} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold font-mono ${
                            idx === 0 ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                            idx === 1 ? "bg-slate-400/20 text-slate-300 border border-slate-400/40" :
                            idx === 2 ? "bg-amber-700/20 text-amber-500 border border-amber-700/40" :
                            "bg-slate-800 text-slate-400"
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-semibold text-white block">{row.engine_name}</span>
                            <span className="text-[11px] text-slate-400">{row.engine_key}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 border border-slate-700 text-slate-300">
                          {getGameLabel(row.game_key)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center text-slate-300">
                        {row.total_evaluated}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-sm">
                        <span className={row.prize_win_rate_pct >= 25 ? "text-emerald-400" : row.prize_win_rate_pct >= 15 ? "text-cyan-400" : "text-rose-400"}>
                          {row.prize_win_rate_pct}%
                        </span>
                        <span className="block text-[10px] text-slate-400 font-normal">({row.prize_hits} hits)</span>
                      </td>

                      <td className="py-3.5 px-4 text-center text-slate-300">
                        {row.any_match_rate_pct}%
                      </td>

                      <td className={`py-3.5 px-4 text-right font-semibold ${
                        row.net_profit_tt >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        ${row.net_profit_tt.toLocaleString()} TT
                      </td>

                      <td className={`py-3.5 px-4 text-right font-bold ${
                        row.roi_pct >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {row.roi_pct >= 0 ? `+${row.roi_pct}%` : `${row.roi_pct}%`}
                      </td>

                      <td className="py-3.5 px-4 font-sans text-slate-200">
                        <span className="text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {row.best_prize !== "NONE" ? row.best_prize : "No Cash Tier"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPrime ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40" :
                          isDrift ? "bg-rose-950/80 text-rose-300 border border-rose-500/40" :
                          isCalib ? "bg-amber-950/80 text-amber-300 border border-amber-500/40" :
                          "bg-cyan-950/60 text-cyan-300 border border-cyan-500/30"
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Calibration Diagnostics & Improvement Alerts */}
      {data?.diagnostics && data.diagnostics.length > 0 && (
        <div className="bg-[#0f1418] rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-white text-base">Mathematical Calibration & Diagnostic Advisories</h2>
          </div>
          <p className="text-xs text-slate-400">
            Automated recommendations based on empirical hit rates and mathematical regime shifts.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {data.diagnostics.map((diag) => {
              const isCrit = diag.severity === "CRITICAL";
              const isOpt = diag.severity === "OPTIMAL";

              return (
                <div
                  key={diag.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between ${
                    isCrit ? "bg-rose-950/20 border-rose-500/30" :
                    isOpt ? "bg-emerald-950/20 border-emerald-500/30" :
                    "bg-amber-950/20 border-amber-500/30"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isCrit ? "bg-rose-500/20 text-rose-300" :
                        isOpt ? "bg-emerald-500/20 text-emerald-300" :
                        "bg-amber-500/20 text-amber-300"
                      }`}>
                        {diag.severity}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {getGameLabel(diag.game_key)}
                      </span>
                    </div>

                    <h3 className="font-semibold text-white text-sm mb-1.5">{diag.title}</h3>
                    <p className="text-xs text-slate-300 mb-2 leading-relaxed">{diag.anomalyDescription}</p>
                    <p className="text-xs text-slate-400 italic mb-4">
                      <span className="font-semibold text-slate-200">Recommendation:</span> {diag.recommendation}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-cyan-400 font-semibold">{diag.suggestedAction}</span>
                    <ArrowUpRight className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Live Draw-by-Draw Audit Feed */}
      <div className="bg-[#0f1418] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h2 className="font-bold text-white text-base">Draw-by-Draw Verification Audit Ledger</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual predictions graded deterministically against actual winning draws.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center bg-[#171c20] rounded-lg p-0.5 border border-slate-800 text-xs">
              {(["ALL", "WINS", "LOSSES"] as const).map(tier => (
                <button
                  key={tier}
                  onClick={() => setAuditFilter(tier)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                    auditFilter === tier
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search draw # or engine..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44"
              />
            </div>
          </div>
        </div>

        {filteredAudits.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            No audit records matching your current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#171c20]/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Target Draw</th>
                  <th className="py-3 px-4">Game</th>
                  <th className="py-3 px-4">Engine / Strategy</th>
                  <th className="py-3 px-4">Predicted Combination</th>
                  <th className="py-3 px-4">Official Winning Result</th>
                  <th className="py-3 px-4 text-center">Hits</th>
                  <th className="py-3 px-4">Prize Tier</th>
                  <th className="py-3 px-4 text-right">Payout TT$</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredAudits.map((audit) => {
                  const actualSet = new Set(audit.actual_numbers || []);

                  return (
                    <tr key={audit.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        #{audit.target_draw_number}
                        {audit.target_time_slot && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {audit.target_time_slot}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          {getGameLabel(audit.game_key)}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <span className="font-semibold text-white block">{audit.engine_name}</span>
                        <span className="text-[11px] text-slate-400">{audit.strategy_name}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {audit.predicted_numbers.map((n, nIdx) => {
                            const isMatch = actualSet.has(n);
                            return (
                              <span
                                key={nIdx}
                                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                  isMatch
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {String(n).padStart(2, "0")}
                              </span>
                            );
                          })}
                          {audit.predicted_powerball !== undefined && (
                            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              PB {audit.predicted_powerball}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {audit.actual_numbers ? (
                          <div className="flex flex-wrap gap-1">
                            {audit.actual_numbers.map((an, aIdx) => (
                              <span key={aIdx} className="px-1 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-slate-300">
                                {String(an).padStart(2, "0")}
                              </span>
                            ))}
                            {audit.actual_powerball && (
                              <span className="px-1 py-0.5 rounded text-[10px] bg-slate-900 text-amber-400">
                                PB {audit.actual_powerball}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Pending Draw</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-bold">
                        <span className={audit.match_count > 0 ? "text-emerald-400" : "text-slate-500"}>
                          {audit.match_count}
                        </span>
                        {audit.best_wheel_match > 0 && (
                          <span className="block text-[10px] text-cyan-400">Wheel: {audit.best_wheel_match}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          audit.is_prize_winner
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold"
                            : "bg-slate-900 text-slate-400 border border-slate-800"
                        }`}>
                          {audit.prize_tier}
                        </span>
                      </td>

                      <td className={`py-3 px-4 text-right font-bold ${
                        audit.simulated_payout_tt > 0 ? "text-emerald-400" : "text-slate-500"
                      }`}>
                        ${audit.simulated_payout_tt.toLocaleString()} TT
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
