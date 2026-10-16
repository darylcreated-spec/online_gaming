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
import { EngineLeaderboardRow, EngineLogEntry, CalibrationDiagnostic, ChampionMasterPick } from "@/lib/engine_tracker";
import type { EngineCalibrationProfile } from "@/lib/engine_calibrator";

interface EngineTrackerResponse {
  success: boolean;
  game: string;
  horizon: number;
  leaderboard: EngineLeaderboardRow[];
  recentAudits: EngineLogEntry[];
  diagnostics: CalibrationDiagnostic[];
  calibrationProfiles?: EngineCalibrationProfile[];
  championPicks?: ChampionMasterPick[];
  totalEvaluated: number;
  overallWinRatePct: number;
  totalSimulatedNetProfitTT: number;
  error?: string;
}

export default function EngineBenchmarkTracker() {
  const [data, setData] = useState<EngineTrackerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [selectedHorizon, setSelectedHorizon] = useState<string>("100");
  const [searchQuery, setSearchQuery] = useState("");
  const [auditFilter, setAuditFilter] = useState<"ALL" | "WINS" | "LOSSES">("ALL");
  const [championOnlyMode, setChampionOnlyMode] = useState<boolean>(true);
  const [expandedWheelGame, setExpandedWheelGame] = useState<string | null>(null);
  const [copiedGame, setCopiedGame] = useState<string | null>(null);

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

    const handleLiveDrawSync = () => {
      fetchData(selectedGame, selectedHorizon);
    };
    window.addEventListener("win_concept_sync_completed", handleLiveDrawSync);
    return () => window.removeEventListener("win_concept_sync_completed", handleLiveDrawSync);
  }, [selectedGame, selectedHorizon]);

  const handleManualAction = async (
    action: "reconcile" | "snapshot" | "reconcile_and_snapshot" | "calibrate",
    targetGame?: string
  ) => {
    if (action === "calibrate") {
      setCalibrating(true);
    } else {
      setActionLoading(true);
    }
    setActionBanner(null);
    try {
      triggerHaptic("selection");
      const gameParam = targetGame || (selectedGame === "all" ? undefined : selectedGame);
      const res = await fetch("/api/engine-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, game: gameParam })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to execute action.");
      triggerHaptic("success");
      if (action === "calibrate") {
        setActionBanner(
          json.message || "Closed-Loop Bayesian Calibration and historical re-verification completed."
        );
      } else {
        setActionBanner(json.message || "Engine reconciliation and N+1 snapshot completed.");
      }
      await fetchData(selectedGame, selectedHorizon);
    } catch (err: any) {
      setError("Error: " + err.message);
      triggerHaptic("warning");
    } finally {
      setActionLoading(false);
      setCalibrating(false);
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

  const handleCopyChampionPick = (pick: ChampionMasterPick) => {
    triggerHaptic("selection");
    const fmt = (arr: number[]) =>
      pick.game_key === "pick4"
        ? arr.map(n => String(n)).join(" - ")
        : arr.map(n => String(n).padStart(2, "0")).join(" - ");
    const lines = [
      `[${getGameLabel(pick.game_key).toUpperCase()} — APEX CHAMPION MASTER PICK | Draw #${pick.target_draw_number}${pick.target_time_slot ? ` (${pick.target_time_slot})` : ""}]`,
      `Master 4-Number Pick: ${fmt(pick.predicted_numbers)}${pick.predicted_powerball ? ` + PB/Mult: ${pick.predicted_powerball}` : ""}`,
      ...(pick.condensed_wheel.length > 0
        ? [`Top Refined Combinations:`, ...pick.condensed_wheel.slice(0, 5).map((w, i) => `  Set #${i + 1}: ${fmt(w)}`)]
        : [])
    ];
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
    setCopiedGame(pick.game_key);
    setTimeout(() => setCopiedGame(null), 2200);
  };

  // Determine the #1 Champion Engine per game
  const championEngineKeyByGame = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of data?.leaderboard || []) {
      if (!map[row.game_key]) {
        map[row.game_key] = row.engine_key;
      } else if (row.engine_key === "apex-master") {
        const currentBest = (data?.leaderboard || []).find(
          r => r.game_key === row.game_key && r.engine_key === map[row.game_key]
        );
        if (currentBest && row.prize_win_rate_pct >= currentBest.prize_win_rate_pct) {
          map[row.game_key] = "apex-master";
        }
      }
    }
    return map;
  }, [data?.leaderboard]);

  const displayedLeaderboard = React.useMemo(() => {
    const allRows = data?.leaderboard || [];
    if (!championOnlyMode) return allRows;
    const seenGames = new Set<string>();
    return allRows.filter(row => {
      const targetChampKey = championEngineKeyByGame[row.game_key] || row.engine_key;
      if (!seenGames.has(row.game_key) && row.engine_key === targetChampKey) {
        seenGames.add(row.game_key);
        return true;
      }
      return false;
    });
  }, [data?.leaderboard, championOnlyMode, championEngineKeyByGame]);

  // Filter audit records
  const filteredAudits = (data?.recentAudits || []).filter(audit => {
    if (championOnlyMode) {
      const champKey = championEngineKeyByGame[audit.game_key];
      if (champKey && audit.engine_key !== champKey) return false;
    }

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
                BAYESIAN CALIBRATOR ACTIVE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Cpu className="w-6 h-6 text-cyan-400" />
              Engine Prediction & Closed-Loop Calibration Tracker
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Walk-forward Bayesian weight optimization, multi-slip wheel grading, and comparative hit leaderboards across all 5 NLCB games.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleManualAction("calibrate")}
              disabled={calibrating || actionLoading || loading}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sliders className={`w-3.5 h-3.5 ${calibrating ? "animate-spin" : ""}`} />
              {calibrating ? "Calibrating Regimes..." : "Auto-Calibrate All Engines"}
            </button>
            <button
              onClick={() => handleManualAction("reconcile_and_snapshot")}
              disabled={actionLoading || calibrating || loading}
              className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
              Reconcile & Snapshot N+1
            </button>
            <button
              onClick={() => fetchData()}
              disabled={loading || calibrating}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-colors"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {actionBanner && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionBanner}</span>
            </div>
            <button
              onClick={() => setActionBanner(null)}
              className="text-slate-400 hover:text-white text-[11px] px-2 py-0.5 rounded bg-slate-900/60"
            >
              Dismiss
            </button>
          </div>
        )}

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

        {/* Horizon & Champion Mode selector */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <div className="flex items-center bg-[#0f1418] rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setChampionOnlyMode(true)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                championOnlyMode
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Show only the #1 winning engine system per game"
            >
              <Award className="w-3.5 h-3.5" />
              Top 1 Champion Per Game
            </button>
            <button
              onClick={() => setChampionOnlyMode(false)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                !championOnlyMode
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Compare all tracked sub-engines"
            >
              All Tracked Engines ({data?.leaderboard.length || 0})
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-slate-500 uppercase mr-0.5">Horizon:</span>
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
      </div>

      {/* 2.5. APEX CHAMPION MASTER PICKS COMMAND DECK (Refined Best Selection Per Game for Draw N+1) */}
      {data?.championPicks && data.championPicks.length > 0 && (
        <div className="bg-[#0f1418] rounded-2xl border border-amber-500/30 p-5 space-y-4 shadow-[0_0_30px_rgba(245,158,11,0.06)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h2 className="font-bold text-white text-base sm:text-lg">
                  Apex Champion Master Picks — Next Draw (N+1)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SINGLE REFINED SELECTION PER GAME
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Eliminates choice overload by automatically selecting the #1 verified winning engine system per game and intersecting its top Bayesian-calibrated numbers for the upcoming draw.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.championPicks.map((pick) => {
              const isExpanded = expandedWheelGame === pick.game_key;
              const isCopied = copiedGame === pick.game_key;
              return (
                <div
                  key={pick.game_key}
                  className="rounded-xl bg-gradient-to-b from-[#161c22] to-[#11161b] border border-emerald-500/30 p-4 flex flex-col justify-between space-y-3.5 shadow-md"
                >
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {getGameLabel(pick.game_key)}
                        </span>
                        <span className="ml-2 text-xs font-mono text-slate-300 font-bold">
                          Target Draw #{pick.target_draw_number}
                          {pick.target_time_slot ? ` (${pick.target_time_slot})` : ""}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                        {pick.verified_win_rate_pct}% Hit | +{pick.verified_roi_pct}% ROI
                      </span>
                    </div>

                    {/* Selected Champion Engine Name */}
                    <div className="flex items-center justify-between text-[11px] font-mono bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Winning System:</span>
                      <span className="text-amber-300 font-semibold truncate max-w-[180px]" title={pick.engine_name}>
                        {pick.engine_name}
                      </span>
                    </div>

                    {/* Master Pick Numbers */}
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block mb-1.5">
                        {pick.game_key === "play-whe"
                          ? "Refined Top-5 Master Marks (Play Any or All 5)"
                          : pick.game_key === "pick4"
                          ? "Primary 4 Positional Numbers (Pos 1 – Pos 2 – Pos 3 – Pos 4)"
                          : "Primary Refined Master Combination"}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {pick.predicted_numbers.map((num, i) => (
                          <React.Fragment key={i}>
                            <div className="flex flex-col items-center">
                              {pick.game_key === "pick4" && (
                                <span className="text-[9px] font-mono text-slate-400 mb-0.5">
                                  Pos {i + 1}
                                </span>
                              )}
                              <span className="w-9 h-9 rounded-lg bg-emerald-500/20 border-2 border-emerald-400/70 text-white font-mono font-bold text-sm flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                                {pick.game_key === "pick4" ? String(num) : String(num).padStart(2, "0")}
                              </span>
                            </div>
                            {pick.game_key === "pick4" && i < pick.predicted_numbers.length - 1 && (
                              <span className="text-emerald-400/70 font-mono font-bold text-xs mt-3">-</span>
                            )}
                          </React.Fragment>
                        ))}
                        {pick.predicted_powerball !== undefined && (
                          <span className="px-2.5 h-9 rounded-lg bg-amber-500/20 border-2 border-amber-400/70 text-amber-300 font-mono font-bold text-xs flex items-center justify-center">
                            {pick.game_key === "cashpot" ? `Mult x${pick.predicted_powerball}` : `PB ${pick.predicted_powerball}`}
                          </span>
                        )}
                      </div>

                      {/* For Pick 4: Always show the Top 4 Refined 4-Number Combinations directly on the card */}
                      {pick.game_key === "pick4" && pick.condensed_wheel && pick.condensed_wheel.length > 0 && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-semibold block">
                            Top 4 Refined 4-Number Combinations (Straight / 24-Way Box):
                          </span>
                          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                            {pick.condensed_wheel.slice(0, 4).map((slip, sIdx) => (
                              <div
                                key={sIdx}
                                className="px-2 py-1 rounded bg-slate-950/90 border border-slate-800 flex items-center justify-between text-[11px] font-mono"
                              >
                                <span className="text-slate-500">Set #{sIdx + 1}:</span>
                                <span className="text-emerald-300 font-bold">
                                  {slip.map(d => String(d)).join(" - ")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Calibrated Corridor & Contributing Models */}
                    <div className="text-[11px] font-mono text-slate-400 space-y-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span>Calibrated Sum Corridor:</span>
                        <span className="text-cyan-300 font-semibold">{pick.sum_corridor}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Best Verified Capture:</span>
                        <span className="text-emerald-300 font-semibold">{pick.best_prize}</span>
                      </div>
                    </div>

                    {/* Expandable Condensed Wheel Slips */}
                    {pick.condensed_wheel && pick.condensed_wheel.length > 0 && (
                      <div className="pt-1">
                        <button
                          onClick={() => setExpandedWheelGame(isExpanded ? null : pick.game_key)}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center justify-between transition-colors"
                        >
                          <span>
                            {pick.game_key === "play-whe"
                              ? `View 13-Mark High-Density Subspace Core`
                              : `View Condensed Backup Wheel (${pick.condensed_wheel.length} Slips)`}
                          </span>
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </button>

                        {isExpanded && (
                          <div className="mt-2 p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 space-y-1.5 max-h-44 overflow-y-auto font-mono text-[11px]">
                            {pick.condensed_wheel.map((slip, sIdx) => (
                              <div key={sIdx} className="flex items-center justify-between py-0.5 border-b border-slate-900 last:border-0">
                                <span className="text-slate-500">
                                  {pick.game_key === "play-whe" ? "Core Pool:" : `Wheel #${sIdx + 1}:`}
                                </span>
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {slip.map((n, nIdx) => (
                                    <span key={nIdx} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-200 border border-slate-800">
                                      {pick.game_key === "pick4" ? String(n) : String(n).padStart(2, "0")}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleCopyChampionPick(pick)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isCopied ? "Copied Master Ticket!" : "Copy Master Pick"}
                    </button>
                    <button
                      onClick={() => setSelectedGame(pick.game_key === selectedGame ? "all" : pick.game_key)}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono transition-colors"
                    >
                      {selectedGame === pick.game_key ? "Show All" : "Focus Game"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Engine Performance Leaderboard */}
      <div className="bg-[#0f1418] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-white text-base">
              {championOnlyMode
                ? "Verified #1 Champion Engine Systems (1 Per Game)"
                : "Comparative Engine Performance Leaderboard (All Tracked Engines)"}
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {championOnlyMode
              ? "Showing only the highest-performing refined system per game"
              : "Ranked by Prize Win Rate & ROI"}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
            Evaluating multi-engine backtest and live draw logs...
          </div>
        ) : !data || displayedLeaderboard.length === 0 ? (
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
                {displayedLeaderboard.map((row, idx) => {
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

      {/* 3.5. Closed-Loop Bayesian Calibration Telemetry */}
      {data?.calibrationProfiles && data.calibrationProfiles.length > 0 && (
        <div className="bg-[#0f1418] rounded-2xl border border-emerald-500/20 p-5 space-y-4 shadow-[0_0_25px_rgba(16,185,129,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Binary className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-white text-base">
                  Closed-Loop Bayesian Walk-Forward Calibration Profiles
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Empirically optimized sub-model posterior weights, sum corridors, and walk-forward test-verification lift across historical winning combinations.
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 self-start sm:self-auto">
              MULTIPLICATIVE WEIGHTS + SOFTMAX POSTERIOR
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {data.calibrationProfiles
              .filter(p => selectedGame === "all" || p.game_key === selectedGame)
              .map(profile => (
                <div
                  key={profile.game_key}
                  className="p-4 rounded-xl bg-[#14191e] border border-slate-800 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {getGameLabel(profile.game_key)}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        {profile.calibration_lift_pct >= 0
                          ? `+${profile.calibration_lift_pct}% Lift`
                          : `${profile.calibration_lift_pct}% Lift`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 block">Pre-Calib Win Rate</span>
                        <span className="text-slate-300 font-semibold">{profile.pre_calibration_win_rate_pct}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Calibrated Win Rate</span>
                        <span className="text-emerald-400 font-bold">{profile.post_calibration_win_rate_pct}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Optimal Sum Band</span>
                        <span className="text-cyan-300 font-semibold">
                          {profile.optimal_sum_min} – {profile.optimal_sum_max}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Carryover / Window</span>
                        <span className="text-amber-300 font-semibold">
                          {profile.empirical_carryover_rate_pct}% ({profile.window_size}d)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 mt-2.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        Calibrated Sub-Model Weights (Top Regimes)
                      </span>
                      {profile.sub_model_weights.slice(0, 4).map(sw => (
                        <div key={sw.modelKey} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-300 truncate max-w-[175px]" title={sw.modelName}>
                              {sw.modelName}
                            </span>
                            <span className="text-emerald-400 font-semibold">
                              {Math.round(sw.weight * 100)}% ({sw.liftMultiplier}x)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                              style={{ width: `${Math.min(100, Math.round(sw.weight * 100 * 1.6))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="truncate max-w-[180px]" title={profile.dominant_strategy}>
                      Lead: <strong className="text-slate-200">{profile.dominant_strategy}</strong>
                    </span>
                    <button
                      onClick={() => handleManualAction("calibrate", profile.game_key)}
                      disabled={calibrating}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-0.5 disabled:opacity-50"
                    >
                      Recalibrate
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

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

                  <button
                    onClick={() => handleManualAction("calibrate", diag.game_key)}
                    disabled={calibrating}
                    className="pt-2 border-t border-slate-800 flex items-center justify-between w-full text-left hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <span className="text-[11px] font-mono text-cyan-400 font-semibold">{diag.suggestedAction}</span>
                    <ArrowUpRight className="w-4 h-4 text-cyan-400" />
                  </button>
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
                            const isMatch = audit.game_key === "pick4"
                              ? audit.actual_numbers?.[nIdx] === n || actualSet.has(n)
                              : actualSet.has(n);
                            return (
                              <span
                                key={nIdx}
                                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                  isMatch
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {audit.game_key === "pick4" ? String(n) : String(n).padStart(2, "0")}
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
                                {audit.game_key === "pick4" ? String(an) : String(an).padStart(2, "0")}
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
