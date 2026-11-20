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
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  ArrowUpRight,
  Crosshair,
  ShieldCheck,
  Zap,
  Sliders,
  Flame,
  Award,
  Copy,
  Share2,
  Printer
} from "lucide-react";
import BetSlipExportModal from "@/components/BetSlipExportModal";
import { triggerHaptic } from "@/lib/haptics";
import {
  EngineLeaderboardRow,
  EngineLogEntry,
  CalibrationDiagnostic,
  ChampionMasterPick,
  MultiDrawPlayCampaign,
  MultiDrawGameSummary
} from "@/lib/engine_tracker";
import type { EngineCalibrationProfile } from "@/lib/engine_calibrator";
import { generateOptimalSteinerPortfolio } from "@/lib/steiner_johnson_engine";

interface EngineTrackerResponse {
  success: boolean;
  game: string;
  horizon: number;
  leaderboard: EngineLeaderboardRow[];
  recentAudits: EngineLogEntry[];
  diagnostics: CalibrationDiagnostic[];
  calibrationProfiles?: EngineCalibrationProfile[];
  championPicks?: ChampionMasterPick[];
  multiDrawCampaigns?: MultiDrawPlayCampaign[];
  multiDrawSummary?: MultiDrawGameSummary[];
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
  const [copiedSyndicateGame, setCopiedSyndicateGame] = useState<string | null>(null);
  const [multiDrawViewMode, setMultiDrawViewMode] = useState<"stepper" | "ledger">("stepper");
  const [multiDrawFilterState, setMultiDrawFilterState] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");
  const [lockingGame, setLockingGame] = useState<string | null>(null);
  const [showLeaderboardDrawer, setShowLeaderboardDrawer] = useState<boolean>(false);
  const [showDiagnosticsDrawer, setShowDiagnosticsDrawer] = useState<boolean>(false);
  const [multiDrawGameFilter, setMultiDrawGameFilter] = useState<string>("all");
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [expandedRulesGame, setExpandedRulesGame] = useState<string | null>(null);
  const [showCustomTrackerDrawer, setShowCustomTrackerDrawer] = useState<boolean>(false);
  const [customGameKey, setCustomGameKey] = useState<string>("cashpot");
  const [customGroupInput, setCustomGroupInput] = useState<string>("");
  const [customLocking, setCustomLocking] = useState<boolean>(false);
  const [cashPotBudgetTier, setCashPotBudgetTier] = useState<5 | 10 | 15 | 20>(10);
  const [exportSlipPayload, setExportSlipPayload] = useState<{
    gameKey: "cashpot" | "lotto-plus" | "win-for-life";
    gameName: string;
    targetDrawNumber?: number;
    slips: number[][];
    bonusBalls?: number[];
    unitCostTT: number;
  } | null>(null);

  const formatPlainStrategy = (raw?: string | null) => {
    if (!raw) return "";
    return raw
      .replace(/J\*\(\d+,\d+(?:;\d+)?\)/g, "Non-Overlapping")
      .replace(/Max-Coverage Packing/g, "Coverage Set")
      .replace(/Exact 3\+ Ceiling/g, "3 or More Win Chance")
      .replace(/MaxOverlap\s*=\s*(\d+)/gi, "At Most $1 Shared")
      .replace(/Anti-Crowding/g, "Uncommon Numbers")
      .replace(/\bPB\b/g, "Powerball")
      .replace(/\bCB\b/g, "Cash Ball")
      .replace(/Steiner-Johnson/g, "Non-Overlapping");
  };

  const getGamePortfolioNotice = (gameKey: string, slipCount: number) => {
    switch (gameKey) {
      case "cashpot":
        return `Checks all ${slipCount} non-overlapping slips together ($5.00 TTD per slip, totaling $${slipCount * 5}.00 TTD per draw with Multiplier). Official NLCB rules: Match 3 ($5 base times the Multiplier), Match 4 (shared prize times the Multiplier), Match 5 Jackpot (no Multiplier); Match 2 pays $0. Highest possible odds for 10 slips: 63.34% chance of matching 3 or more numbers (at most 1 shared number, all 20 numbers covered). Monday, Thursday, and Saturday are Sure Call days (Multiplier is always 2 to 4 times, 2.95 times average).`;
      case "win-for-life":
        return `Checks all ${slipCount} non-overlapping lines together ($10.00 TTD per line, totaling $${slipCount * 10}.00 TTD per draw). Prizes start at Match 3 ($25 TTD) up to Match 6 plus the Cash Ball. 10-line odds: 72.13% chance of matching 3 or more numbers, 9.55% chance of matching 4 or more (at most 1 shared number, all 28 numbers and all 10 Cash Balls covered).`;
      case "lotto-plus":
        return `Checks all ${slipCount} non-overlapping plays together ($5.00 TTD per play, totaling $${slipCount * 5}.00 TTD per draw). Prizes start at Match 1 plus Powerball ($5 TTD) or Match 3 ($25 TTD). Covering every Powerball from 1 to 10 guarantees a Powerball match (62.93% chance of any prize across all 35 numbers with at most 1 shared number).`;
      case "play-whe":
        return `Checks 5 different marks ($5 TTD per draw total). Matching any 1 of the 5 marks pays $26 TTD. Past results do not guarantee future draws.`;
      case "pick4":
        return `Checks ${slipCount} Box and Exact Order sets. Exact Order pays $5,000, Box pays $200 to $1,200, Front or Back 3 pays $500, Pair pays $50. Past results do not guarantee future draws.`;
      default:
        return `Checks the full ${slipCount}-slip set together. Past results do not guarantee future draws.`;
    }
  };

  const handleLockCustomGroup = async () => {
    const rawLines = customGroupInput
      .split(/\n+/)
      .map(l => l.trim())
      .filter(Boolean);
    const parsedSlips: number[][] = [];
    for (const line of rawLines) {
      const nums = (line.match(/\d+/g) || []).map(Number);
      if (nums.length > 0) parsedSlips.push(nums);
    }
    if (parsedSlips.length === 0) {
      setError("Enter at least one line of numbers (e.g. 2, 3, 5, 11, 17).");
      return;
    }
    setCustomLocking(true);
    setError(null);
    setActionBanner(null);
    try {
      triggerHaptic("selection");
      const res = await fetch("/api/engine-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lock_campaign",
          game: customGameKey,
          customSlips: parsedSlips
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to lock custom group.");
      triggerHaptic("success");
      setActionBanner(json.message);
      setCustomGroupInput("");
      setShowCustomTrackerDrawer(false);
      setMultiDrawGameFilter(customGameKey);
      await fetchData(selectedGame, selectedHorizon);
    } catch (err: any) {
      setError("Error: " + err.message);
      triggerHaptic("warning");
    } finally {
      setCustomLocking(false);
    }
  };

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
    action: "reconcile" | "snapshot" | "reconcile_and_snapshot" | "calibrate" | "lock_campaign",
    targetGame?: string,
    anchorDrawNumber?: number
  ) => {
    if (action === "calibrate") {
      setCalibrating(true);
    } else if (action === "lock_campaign") {
      setLockingGame(targetGame || "all");
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
        body: JSON.stringify({ action, game: gameParam, anchorDrawNumber })
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
      setLockingGame(null);
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
      `Master Anchor Pick: ${fmt(pick.predicted_numbers)}${pick.predicted_powerball ? ` + PB/Mult: ${pick.predicted_powerball}` : ""}`,
      ...(pick.condensed_wheel.length > 0
        ? [`Top Refined Combinations:`, ...pick.condensed_wheel.slice(0, 5).map((w, i) => `  Set #${i + 1}: ${fmt(w)}`)]
        : [])
    ];
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
    setCopiedGame(pick.game_key);
    setTimeout(() => setCopiedGame(null), 2200);
  };

  const handleSyndicateQuickExport = (pick: ChampionMasterPick) => {
    triggerHaptic("selection");
    const fmt = (arr: number[]) =>
      pick.game_key === "pick4"
        ? arr.map(n => String(n)).join(" - ")
        : arr.map(n => String(n).padStart(2, "0")).join(" - ");

    const slips =
      pick.game_key === "cashpot" && cashPotBudgetTier !== 10
        ? generateOptimalSteinerPortfolio("cashpot", [], cashPotBudgetTier, pick.target_draw_number || 1).slips
        : pick.wheel_slips && pick.wheel_slips.length > 0
        ? pick.wheel_slips
        : pick.condensed_wheel;

    const lines = [
      `=======================================================`,
      `[NLCB SYNDICATE COVERING ARRAY PORTFOLIO]`,
      `Game: ${getGameLabel(pick.game_key).toUpperCase()}`,
      `Target Draw: #${pick.target_draw_number}${pick.target_time_slot ? ` (${pick.target_time_slot})` : ""}`,
      `Winning Strategy: ${pick.engine_name} — ${pick.strategy_name}`,
      `Sum Corridor: ${pick.sum_corridor}`,
      `Window Capture: 1-Draw ${pick.multi_draw_window_rates?.window_1_draw ?? 48}% | 3-Draw ${pick.multi_draw_window_rates?.window_3_draw ?? 86}% | 5-Draw ${pick.multi_draw_window_rates?.window_5_draw ?? 99}%`,
      ...(pick.convergence_locks && pick.convergence_locks.length > 0
        ? [`Multi-Engine Convergence Locks: ${pick.convergence_locks.join(", ")}`]
        : []),
      ...(pick.bonus_ball_rotation && pick.bonus_ball_rotation.length > 0
        ? [`Top-3 Weibull Renewal Bonus Ball Rotation: ${pick.bonus_ball_rotation.join(", ")}`]
        : []),
      `-------------------------------------------------------`,
      `PORTFOLIO COVERING SLIPS (${slips.length} Tickets):`,
      ...slips.map((slip, i) => {
        const rotatedPb =
          pick.game_key === "lotto-plus" && pick.line_powerballs && pick.line_powerballs.length > 0
            ? pick.line_powerballs[i % pick.line_powerballs.length]
            : pick.predicted_powerball;
        const pbSuffix = rotatedPb !== undefined
          ? pick.game_key === "cashpot"
            ? ` [Mult: x${rotatedPb}]`
            : ` [PB: ${rotatedPb}]`
          : "";
        return `Slip #${String(i + 1).padStart(2, "0")}:  ${fmt(slip)}${pbSuffix}`;
      }),
      `-------------------------------------------------------`,
      `Syndicate Persistence Horizon: Maintain active slips for 3 consecutive draws.`,
      `=======================================================`
    ];
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
    setCopiedSyndicateGame(pick.game_key);
    setTimeout(() => setCopiedSyndicateGame(null), 2500);
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
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-xs tracking-wider font-semibold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 uppercase">
                NLCB Engine Performance
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live Tracking Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Cpu className="w-6 h-6 text-cyan-400 shrink-0" />
              <span>Number Covering Engines and Past Results</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Verified out-of-sample results, non-overlapping ticket sets, and side-by-side comparisons across all 5 main NLCB games.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleManualAction("calibrate")}
              disabled={calibrating || actionLoading || loading}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Sliders className={`w-3.5 h-3.5 ${calibrating ? "animate-spin" : ""}`} />
              {calibrating ? "Recalibrating..." : "Recalibrate Models"}
            </button>
            <button
              onClick={() => handleManualAction("reconcile_and_snapshot")}
              disabled={actionLoading || calibrating || loading}
              className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
              Update and Check Results
            </button>
            <button
              onClick={() => fetchData()}
              disabled={loading || calibrating}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh page"
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
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-900/60"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Global KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-[#171c20]/60 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Total Audited Draws</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-white mt-0.5 block">
              {data?.totalEvaluated || 0}
            </span>
          </div>

          <div className="bg-[#171c20]/60 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Overall Prize Win Rate</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
              {data?.overallWinRatePct || 0}%
            </span>
          </div>

          <div className="bg-[#171c20]/60 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Net Simulated Profit</span>
            <span className={`text-lg sm:text-xl font-bold font-mono mt-0.5 block ${
              (data?.totalSimulatedNetProfitTT || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              ${(data?.totalSimulatedNetProfitTT || 0).toLocaleString()} TT
            </span>
          </div>

          <div className="bg-[#171c20]/60 p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">Active Regimes Tracked</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-cyan-400 mt-0.5 block">
              {data?.leaderboard.length || 0} Regimes
            </span>
          </div>
        </div>
      </div>

      {/* 2. Game Selector Bar and Horizon Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#13171b] p-2.5 rounded-xl border border-slate-800">
        {/* Game filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedGame === game.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.15)] font-semibold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
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
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all flex items-center gap-1 ${
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
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
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
            <span className="text-xs font-mono text-slate-500 uppercase mr-0.5">Horizon:</span>
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
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Apex Champion Master Picks — Next Draw (N+1)
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
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
              const isSyndicateCopied = copiedSyndicateGame === pick.game_key;
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
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                        {pick.verified_win_rate_pct}% Real Hit | {pick.verified_roi_pct >= 0 ? "+" : ""}{pick.verified_roi_pct}% ROI
                      </span>
                    </div>

                    {/* Exact Coverage and Cash Pot Sure Call Summary */}
                    {pick.steiner_meta && (
                      <div className="space-y-2 font-sans">
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                            <div className="text-xs text-emerald-300/90 font-semibold">
                              {pick.game_key === "lotto-plus" ? "Any Prize" : "3 or More"}
                            </div>
                            <div className="text-sm font-bold font-mono text-emerald-300">
                              {pick.game_key === "lotto-plus"
                                ? `${pick.steiner_meta.exact_any_prize_pct}%`
                                : `${pick.steiner_meta.exact_match3_pct}%`}
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-500/30">
                            <div className="text-xs text-sky-300/90 font-semibold">4 or More</div>
                            <div className="text-sm font-bold font-mono text-sky-300 whitespace-nowrap">
                              {pick.steiner_meta.exact_match4_pct}%
                            </div>
                            <div className="text-xs text-sky-200/80 whitespace-nowrap">
                              Max {pick.steiner_meta.max_pair_overlap} shared
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30">
                            <div className="text-xs text-amber-300/90 font-semibold">Numbers</div>
                            <div className="text-sm font-bold font-mono text-amber-300 whitespace-nowrap">
                              {pick.steiner_meta.covered_balls}
                            </div>
                            <div className="text-xs text-amber-200/80 whitespace-nowrap">
                              {pick.steiner_meta.anti_crowding_score}% unique
                            </div>
                          </div>
                        </div>

                        {pick.steiner_meta.sure_call && (
                          <div
                            className={`px-3 py-2 rounded-lg border text-xs leading-relaxed ${
                              pick.steiner_meta.sure_call.isSureCallDay
                                ? "bg-emerald-950/50 border-emerald-400/40 text-emerald-100"
                                : "bg-amber-950/40 border-amber-500/30 text-amber-100"
                            }`}
                          >
                            <span className="font-bold">
                              {pick.steiner_meta.sure_call.isSureCallDay
                                ? `Sure Call Multiplier Boost (${pick.steiner_meta.sure_call.nextDrawDayName}, 2.95 times average): `
                                : `Timing Tip (${pick.steiner_meta.sure_call.nextDrawDayName}, 1.89 times average): `}
                            </span>
                            {pick.steiner_meta.sure_call.isSureCallDay
                              ? "Historical Multiplier has always been 2 to 4 times (56% higher expected payout than standard days)."
                              : "About 53% chance of a 1 time Multiplier. Best value days for 10 to 15 slips are Monday, Thursday, and Saturday."}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected Champion Engine Name */}
                    <div className="flex items-center justify-between text-xs font-mono bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Winning System:</span>
                      <span className="text-amber-300 font-semibold truncate max-w-[180px]" title={pick.engine_name}>
                        {pick.engine_name}
                      </span>
                    </div>

                    {/* Multi-Engine Convergence Locks, Bonus Ball Rotation, Conviction & Wheel Telemetry */}
                    {(pick.convergence_locks || pick.bonus_ball_rotation || pick.conviction_tier || pick.wheel_10_capture_pct !== undefined) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {pick.conviction_tier && (
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-mono font-bold ${
                            pick.conviction_tier === "HIGH CONVICTION"
                              ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
                              : pick.conviction_tier === "HIGH ENTROPY"
                              ? "bg-rose-950/70 border-rose-500/40 text-rose-300"
                              : "bg-slate-900 border-slate-700 text-slate-300"
                          }`}>
                            <Activity className="w-3 h-3" />
                            <span>{pick.conviction_tier}</span>
                            {pick.entropy_ratio !== undefined && (
                              <span className="opacity-75">({pick.entropy_ratio.toFixed(3)})</span>
                            )}
                          </div>
                        )}
                        {pick.wheel_10_capture_pct !== undefined && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-950/70 border border-violet-500/40 text-xs font-mono">
                            <ShieldCheck className="w-3 h-3 text-violet-400" />
                            <span className="text-violet-300 font-semibold">10-Slip Wheel Capture:</span>
                            <span className="text-white font-bold">{pick.wheel_10_capture_pct}%</span>
                          </div>
                        )}
                        {pick.convergence_locks && pick.convergence_locks.length > 0 && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-500/40 text-xs font-mono">
                            <Crosshair className="w-3 h-3 text-cyan-400" />
                            <span className="text-cyan-300 font-semibold">Convergence Locks:</span>
                            <span className="text-white font-bold">
                              {pick.convergence_locks.map(b => (pick.game_key === "pick4" ? String(b) : String(b).padStart(2, "0"))).join(", ")}
                            </span>
                          </div>
                        )}
                        {pick.bonus_ball_rotation && pick.bonus_ball_rotation.length > 0 && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/70 border border-amber-500/40 text-xs font-mono">
                            <Target className="w-3 h-3 text-amber-400" />
                            <span className="text-amber-300 font-semibold">
                              {pick.game_key === "cashpot" ? "Top-3 Mult:" : "Top-3 Renewal PB:"}
                            </span>
                            <span className="text-amber-200 font-bold">
                              {pick.bonus_ball_rotation.join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Master Pick Numbers */}
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold block mb-1.5">
                        {pick.game_key === "play-whe"
                          ? "5 Playable Tactical Marks (100% Graded Card Parity)"
                          : pick.game_key === "pick4"
                          ? "Primary Twin-Anchor Combination (Pos 1 – Pos 2 – Pos 3 – Pos 4)"
                          : "Line #1: Kinematic Lag 1–2 Neighbor Core"}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {pick.predicted_numbers.map((num, i) => (
                          <React.Fragment key={i}>
                            <div className="flex flex-col items-center">
                              {pick.game_key === "pick4" && (
                                <span className="text-xs font-mono text-slate-400 mb-0.5">
                                  Pos {i + 1}
                                </span>
                              )}
                              {pick.game_key === "play-whe" && (
                                <span className="text-xs font-sans text-slate-400 mb-0.5">
                                  {["Step", "Recent", "Mirror", "Slot", "Due"][i] || `Mark ${i + 1}`}
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
                          <span className="px-2.5 h-9 rounded-lg bg-amber-500/20 border-2 border-amber-400/70 text-amber-300 font-sans font-bold text-xs flex items-center justify-center">
                            {pick.game_key === "cashpot"
                              ? `Multiplier ${pick.predicted_powerball} times`
                              : pick.game_key === "win-for-life"
                              ? `Cash Ball ${pick.predicted_powerball}`
                              : `Powerball ${pick.predicted_powerball}`}
                          </span>
                        )}
                      </div>

                      {/* Multi-Draw Window Capture Gauge */}
                      {pick.multi_draw_window_rates && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>Multi-Draw Capture Horizon</span>
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                              {pick.multi_draw_window_rates.description}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
                            {/* 1-Draw Horizon */}
                            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
                              <span className="text-xs text-slate-400">1-Draw Horizon</span>
                              <span className="text-sm font-bold text-white mt-1">
                                {pick.multi_draw_window_rates.window_1_draw}%
                              </span>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                <div
                                  className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, pick.multi_draw_window_rates.window_1_draw)}%` }}
                                />
                              </div>
                            </div>

                            {/* 3-Draw Window Persistence */}
                            <div className="p-2 rounded-lg bg-slate-950/80 border border-cyan-500/30 flex flex-col justify-between shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-cyan-300 font-semibold">3-Draw Window</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                              </div>
                              <span className="text-sm font-bold text-cyan-300 mt-1">
                                {pick.multi_draw_window_rates.window_3_draw}%
                              </span>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, pick.multi_draw_window_rates.window_3_draw)}%` }}
                                />
                              </div>
                            </div>

                            {/* 5-Draw Saturation */}
                            <div className="p-2 rounded-lg bg-slate-950/80 border border-emerald-500/30 flex flex-col justify-between shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-emerald-300 font-semibold">5-Draw Saturation</span>
                                <span className="text-xs px-1 rounded bg-emerald-500/20 text-emerald-400 font-bold">OPTIMAL</span>
                              </div>
                              <span className="text-sm font-bold text-emerald-400 mt-1">
                                {pick.multi_draw_window_rates.window_5_draw}%
                              </span>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, pick.multi_draw_window_rates.window_5_draw)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* For Pick 4: Always show the 4 Dual-Regime Playable Combinations (2x 12-Way Twin + 2x 24-Way) */}
                      {pick.game_key === "pick4" && pick.condensed_wheel && pick.condensed_wheel.length > 0 && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                          <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-semibold block">
                            4 Playable Card Sets (2x 12-Way Twin + 2x 24-Way Box):
                          </span>
                          <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                            {pick.condensed_wheel.slice(0, 4).map((slip, sIdx) => {
                              const uniqueCount = new Set(slip).size;
                              const modeLabel = uniqueCount <= 3 ? "12-WAY TWIN" : "24-WAY DISTINCT";
                              return (
                                <div
                                  key={sIdx}
                                  className="px-2.5 py-1.5 rounded bg-slate-950/90 border border-slate-800 flex items-center justify-between text-xs font-mono"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400">Set #{sIdx + 1}</span>
                                    <span className={`px-1.5 py-0.2 rounded text-xs font-bold ${
                                      uniqueCount <= 3
                                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                        : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    }`}>
                                      {modeLabel}
                                    </span>
                                  </div>
                                  <span className="text-emerald-300 font-bold tracking-wider">
                                    {slip.map(d => String(d)).join(" - ")}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* For Multi-Ball Games (Cash Pot, Lotto Plus, Win For Life): Primary 5 Playable Lines */}
                      {pick.game_key !== "play-whe" && pick.game_key !== "pick4" && pick.condensed_wheel && pick.condensed_wheel.length > 0 && (() => {
                        const unitCost = pick.game_key === "win-for-life" ? 10 : 5;
                        const totalSlipsCount = pick.wheel_slips?.length || pick.condensed_wheel.length;
                        return (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
                          <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-semibold block">
                            {pick.wheel_slips && pick.wheel_slips.length > 5 && pick.engine_key === "apex-master"
                              ? `Top 5 of ${totalSlipsCount} Optimal Steiner Slips ($${totalSlipsCount * unitCost} TT Total):`
                              : `5 Orthogonal Playable Lines ($${5 * unitCost} TT Total):`}
                          </span>
                          <div className="space-y-1 pt-0.5">
                            {pick.condensed_wheel.slice(0, 5).map((slip, sIdx) => {
                              const linePb =
                                (pick.game_key === "lotto-plus" || pick.game_key === "win-for-life") && pick.line_powerballs && pick.line_powerballs.length > 0
                                  ? pick.line_powerballs[sIdx % pick.line_powerballs.length]
                                  : undefined;
                              return (
                                <div
                                  key={sIdx}
                                  className="px-2 py-1 rounded bg-slate-950/90 border border-slate-800 flex items-center justify-between text-xs font-mono"
                                >
                                  <span className="text-slate-400 text-xs font-sans">Slip {sIdx + 1}:</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-emerald-300 font-bold">
                                      {slip.map(n => String(n).padStart(2, "0")).join(" - ")}
                                    </span>
                                    {linePb !== undefined && (
                                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-sans font-bold">
                                        {pick.game_key === "win-for-life" ? `Cash Ball ${linePb}` : `Powerball ${linePb}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        );
                      })()}

                      {/* Full Steiner-Johnson Covering Array Wheel (Expandable View + Cash Pot 5/10/15/20 Budget Scaler) */}
                      {pick.wheel_slips && pick.wheel_slips.length > (pick.game_key === "pick4" ? 4 : 5) && (() => {
                        const isCashPot = pick.game_key === "cashpot";
                        const scaledSteiner =
                          isCashPot && cashPotBudgetTier !== 10
                            ? generateOptimalSteinerPortfolio("cashpot", [], cashPotBudgetTier, pick.target_draw_number || 1)
                            : null;
                        const activeWheelSlips = scaledSteiner ? scaledSteiner.slips : pick.wheel_slips;
                        const activePct3 = scaledSteiner
                          ? scaledSteiner.exactMatch3Pct
                          : pick.steiner_meta?.exact_match3_pct;
                        const unitCost = pick.game_key === "win-for-life" ? 10 : 5;

                        return (
                        <div className="mt-2">
                          <button
                            onClick={() => setExpandedWheelGame(isExpanded ? null : pick.game_key)}
                            className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold transition-all flex items-center justify-between cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-cyan-400" />
                              {isExpanded
                                ? "Collapse Optimal Steiner Wheel"
                                : `View Full ${activeWheelSlips.length}-Slip Steiner Wheel ($${activeWheelSlips.length * unitCost} TT)`}
                            </span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-cyan-500/20 space-y-2 animate-fade-in font-mono text-xs">
                              {isCashPot && (
                                <div className="space-y-1.5 pb-2 border-b border-slate-800">
                                  <div className="text-xs text-slate-300 font-semibold">
                                    Cash Pot Budget Tier (Exact 3-or-More Odds):
                                  </div>
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {([
                                      { n: 5 as const, pct: "35.2%", cost: "$25" },
                                      { n: 10 as const, pct: "63.3%", cost: "$50" },
                                      { n: 15 as const, pct: "84.6%", cost: "$75" },
                                      { n: 20 as const, pct: "94.9%", cost: "$100" },
                                    ]).map((tier) => (
                                      <button
                                        key={tier.n}
                                        type="button"
                                        onClick={() => setCashPotBudgetTier(tier.n)}
                                        className={`py-1.5 px-1 rounded-lg border text-center transition cursor-pointer ${
                                          cashPotBudgetTier === tier.n
                                            ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold"
                                            : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600"
                                        }`}
                                      >
                                        <div className="text-xs font-semibold">{tier.n} Slips</div>
                                        <div className="text-xs opacity-85">{tier.pct} ({tier.cost})</div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-800 text-xs text-slate-300">
                                <span>Non-Overlapping Set (at most {scaledSteiner ? scaledSteiner.maxPairOverlap : (pick.steiner_meta?.max_pair_overlap ?? 1)} shared)</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-emerald-400 font-bold">
                                    {activePct3 ? `${activePct3}% win chance` : "Zero Repeated Pairs"}
                                  </span>
                                  {(pick.game_key === "cashpot" || pick.game_key === "lotto-plus" || pick.game_key === "win-for-life") && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExportSlipPayload({
                                          gameKey: pick.game_key as "cashpot" | "lotto-plus" | "win-for-life",
                                          gameName: getGameLabel(pick.game_key),
                                          targetDrawNumber: pick.target_draw_number,
                                          slips: activeWheelSlips,
                                          bonusBalls: pick.line_powerballs,
                                          unitCostTT: unitCost
                                        })
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-semibold cursor-pointer"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                      <span>Print or Export</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                                {activeWheelSlips.map((slip, slipIdx) => {
                                  const slipPb =
                                    (pick.game_key === "lotto-plus" || pick.game_key === "win-for-life") && pick.line_powerballs && pick.line_powerballs.length > 0
                                      ? pick.line_powerballs[slipIdx % pick.line_powerballs.length]
                                      : undefined;
                                  return (
                                    <div
                                      key={slipIdx}
                                      className="px-2 py-1 rounded bg-slate-900/70 border border-slate-800 flex items-center justify-between"
                                    >
                                      <span className="text-slate-400 text-xs">Slip #{String(slipIdx + 1).padStart(2, "0")}</span>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-white font-bold tracking-wider">
                                          {pick.game_key === "pick4"
                                            ? slip.map(d => String(d)).join(" - ")
                                            : slip.map(n => String(n).padStart(2, "0")).join(" - ")}
                                        </span>
                                        {slipPb !== undefined && (
                                          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-sans font-bold">
                                            {pick.game_key === "win-for-life" ? `Cash Ball ${slipPb}` : `Powerball ${slipPb}`}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })()}
                    </div>

                    {/* Per-Game Portfolio Rules & 5-Draw Group Tracker Drawer */}
                    <div className="pt-1">
                      <button
                        onClick={() => setExpandedRulesGame(expandedRulesGame === pick.game_key ? null : pick.game_key)}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold transition-all flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-amber-400" />
                          {expandedRulesGame === pick.game_key ? "Hide Portfolio Rules & 5-Draw Tracker" : "Play Rules & 5-Draw Group Tracker"}
                        </span>
                        {expandedRulesGame === pick.game_key ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {expandedRulesGame === pick.game_key && (() => {
                        const slipCount = pick.wheel_slips?.length || pick.condensed_wheel?.length || 1;
                        const gameLatestCamp = (data?.multiDrawCampaigns || []).find(c => c.game_key === pick.game_key);
                        return (
                          <div className="mt-2 p-3 rounded-xl bg-slate-950/90 border border-amber-500/25 space-y-2.5 font-mono text-xs">
                            <div className="text-xs text-amber-200/90 leading-relaxed bg-amber-950/20 border border-amber-500/20 rounded-lg p-2">
                              <strong className="text-amber-300 uppercase block mb-0.5">
                                {getGameLabel(pick.game_key)} Portfolio Scope:
                              </strong>
                              {getGamePortfolioNotice(pick.game_key, slipCount)}
                            </div>

                            {gameLatestCamp && (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-400">
                                    Tracked Group (Draw {gameLatestCamp.anchor_draw_number} to {gameLatestCamp.anchor_draw_number + 4}):
                                  </span>
                                  <span className="text-emerald-300 font-bold">
                                    {gameLatestCamp.draws_completed}/5 Verified
                                  </span>
                                </div>
                                <div className="grid grid-cols-5 gap-1">
                                  {gameLatestCamp.steps.map(st => (
                                    <div
                                      key={st.step}
                                      className={`p-1.5 rounded border text-center text-xs ${
                                        st.status !== "VERIFIED"
                                          ? "bg-slate-900/50 border-slate-800 border-dashed text-slate-500"
                                          : st.is_prize_winner
                                          ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-300 font-bold"
                                          : "bg-slate-900 border-slate-800 text-slate-400"
                                      }`}
                                    >
                                      <div className="font-bold">D{st.step}</div>
                                      <div>{st.status === "VERIFIED" ? (st.is_prize_winner ? `+$${st.payout_tt}` : `${st.best_slip_match}m`) : "Wait"}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Calibrated Corridor & Contributing Models */}
                    <div className="text-xs font-mono text-slate-400 space-y-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span>Calibrated Sum Corridor:</span>
                        <span className="text-cyan-300 font-semibold">{pick.sum_corridor}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Best Verified Capture:</span>
                        <span className="text-emerald-300 font-semibold">{pick.best_prize}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => handleCopyChampionPick(pick)}
                      className="flex-1 min-w-[120px] py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
                      title="Copy primary line / tactical set"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isCopied ? "Copied Anchor Line!" : "Copy Anchor Pick"}
                    </button>
                    <button
                      onClick={() => handleSyndicateQuickExport(pick)}
                      className="flex-1 min-w-[130px] py-1.5 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
                      title="Export full 5-to-10 slip covering array portfolio to clipboard"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      {isSyndicateCopied ? "Copied Portfolio!" : "Syndicate Quick Export"}
                    </button>
                    <button
                      onClick={() => handleManualAction("lock_campaign", pick.game_key, pick.target_draw_number)}
                      disabled={lockingGame === pick.game_key}
                      className="py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold transition-colors flex items-center gap-1"
                      title="Pin and track this suggested play across its upcoming 3-Draw and 5-Draw windows"
                    >
                      <Target className="w-3.5 h-3.5" />
                      {lockingGame === pick.game_key ? "Locking..." : "Track 3 & 5 Draws"}
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

      {/* 2.8. MULTI-DRAW PLAY WINDOW VERIFICATION TRACKER (Simplified 1-Draw, 3-Draw & 5-Draw Tracker) */}
      {data?.multiDrawSummary && data.multiDrawSummary.length > 0 && (
        <div className="bg-[#0f1418] rounded-2xl border border-cyan-500/30 p-5 space-y-5 shadow-[0_0_30px_rgba(6,182,212,0.06)]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Target className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Multi-Draw Play Tracker (1-Draw, 3-Draw &amp; 5-Draw Windows)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Follows one suggested Champion portfolio across 5 consecutive draws to verify whether it wins on Draw 1, within 3 Draws, or within 5 Draws. Click any game card below to filter.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[#171c20] rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => setMultiDrawViewMode("stepper")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    multiDrawViewMode === "stepper"
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Draw-by-Draw Cards
                </button>
                <button
                  onClick={() => setMultiDrawViewMode("ledger")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    multiDrawViewMode === "ledger"
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Summary Table
                </button>
              </div>

              <div className="flex items-center bg-[#171c20] rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
                {(["ALL", "ACTIVE", "COMPLETED"] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setMultiDrawFilterState(st)}
                    className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-all ${
                      multiDrawFilterState === st
                        ? "bg-slate-700 text-white font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {st === "ALL" ? "All" : st === "ACTIVE" ? "In-Progress" : "Completed"}
                  </button>
                ))}
              </div>

              {(selectedGame !== "all" || multiDrawGameFilter !== "all") && (
                <button
                  onClick={() => {
                    if (selectedGame !== "all") setSelectedGame("all");
                    setMultiDrawGameFilter("all");
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-cyan-300 font-semibold cursor-pointer"
                >
                  Show All Games
                </button>
              )}

              <button
                onClick={() => setShowCustomTrackerDrawer(!showCustomTrackerDrawer)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-mono text-amber-300 font-bold cursor-pointer flex items-center gap-1"
              >
                <Target className="w-3.5 h-3.5" />
                {showCustomTrackerDrawer ? "Close Custom Tracker" : "Track Custom Group (5 Draws)"}
              </button>
            </div>
          </div>

          {showCustomTrackerDrawer && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-3 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-amber-300 uppercase">
                    Track Your Group of Numbers (Up to 5 Consecutive Draws)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Enter 1 or more lines (one slip per line, comma or space separated). The tracker will automatically grade all lines as each of the next 5 draws completes.
                  </p>
                </div>
                <select
                  value={customGameKey}
                  onChange={e => setCustomGameKey(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-bold"
                >
                  <option value="cashpot">Cash Pot (5 of 20)</option>
                  <option value="win-for-life">Win For Life (6 of 28)</option>
                  <option value="lotto-plus">Lotto Plus (5 of 35)</option>
                  <option value="play-whe">Play Whe (Marks 1–36)</option>
                  <option value="pick4">Pick 4 (4 Digits)</option>
                </select>
              </div>
              <textarea
                rows={3}
                value={customGroupInput}
                onChange={e => setCustomGroupInput(e.target.value)}
                placeholder={"Example (one ticket per line):\n2, 3, 5, 11, 17\n4, 9, 12, 16, 20"}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowCustomTrackerDrawer(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLockCustomGroup}
                  disabled={customLocking}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase cursor-pointer disabled:opacity-50"
                >
                  {customLocking ? "Locking..." : "Lock & Track for 5 Draws"}
                </button>
              </div>
            </div>
          )}

          {/* Clickable 5-Game Summary Cards (Click any card to switch game) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono">
            {data.multiDrawSummary.map(sum => {
              const activeGame = selectedGame !== "all" ? selectedGame : multiDrawGameFilter;
              const isCardSelected = activeGame === sum.game_key;
              return (
                <button
                  key={sum.game_key}
                  onClick={() => {
                    triggerHaptic("selection");
                    if (selectedGame !== "all") setSelectedGame("all");
                    setMultiDrawGameFilter(isCardSelected ? "all" : sum.game_key);
                  }}
                  className={`p-3.5 rounded-xl border text-left space-y-2.5 flex flex-col justify-between transition-all cursor-pointer ${
                    isCardSelected
                      ? "bg-cyan-950/35 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.18)]"
                      : "bg-[#14191f] border-slate-800 hover:border-cyan-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                      isCardSelected
                        ? "bg-cyan-500 text-slate-950 border-cyan-400"
                        : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                    }`}>
                      {getGameLabel(sum.game_key)}
                    </span>
                    <span className="text-xs text-slate-400">
                      Avg Hit: <strong className="text-emerald-400">{sum.avg_draws_to_first_hit}d</strong>
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs w-full">
                    <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-900/80 border border-slate-800/80">
                      <span className="text-slate-400">1-Draw Win:</span>
                      <span className="text-white font-bold">{sum.w1_slip_win_rate_pct}%</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1 rounded bg-cyan-950/30 border border-cyan-500/30">
                      <span className="text-cyan-300 font-semibold">3-Draw Win:</span>
                      <span className="text-cyan-200 font-bold">{sum.w3_slip_win_rate_pct}%</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1 rounded bg-emerald-950/30 border border-emerald-500/30">
                      <span className="text-emerald-300 font-semibold">5-Draw Win:</span>
                      <span className="text-emerald-300 font-bold">{sum.w5_slip_win_rate_pct}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-800/70 w-full">
                    <span>{sum.total_campaigns_evaluated} Windows</span>
                    <span className={isCardSelected ? "text-cyan-300 font-bold" : "text-amber-400 font-semibold"}>
                      {isCardSelected ? "Selected" : "Click to Filter"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Campaign List / Table */}
          {(() => {
            const activeGame = selectedGame !== "all" ? selectedGame : multiDrawGameFilter;
            const filteredRaw = (data.multiDrawCampaigns || []).filter(c => {
              if (activeGame !== "all" && c.game_key !== activeGame) return false;
              if (multiDrawFilterState === "ACTIVE") return c.campaign_state === "ACTIVE_IN_PROGRESS";
              if (multiDrawFilterState === "COMPLETED") return c.campaign_state === "COMPLETED_5_DRAWS";
              return true;
            });

            // Interleave across games when viewing "all" so Cash Pot doesn't push other games out of view
            let campaigns = filteredRaw;
            if (activeGame === "all") {
              const byGame: Record<string, MultiDrawPlayCampaign[]> = {};
              for (const c of filteredRaw) {
                if (!byGame[c.game_key]) byGame[c.game_key] = [];
                byGame[c.game_key].push(c);
              }
              const interleaved: MultiDrawPlayCampaign[] = [];
              const gameKeys = Object.keys(byGame);
              const maxLen = Math.max(0, ...gameKeys.map(k => byGame[k].length));
              for (let i = 0; i < maxLen; i++) {
                for (const k of gameKeys) {
                  if (byGame[k][i]) interleaved.push(byGame[k][i]);
                }
              }
              campaigns = interleaved;
            }

            if (campaigns.length === 0) {
              return (
                <div className="p-6 text-center text-slate-400 font-mono text-xs">
                  No multi-draw campaigns match your current filter.
                </div>
              );
            }

            const fmtNums = (gKey: string, arr: number[]) =>
              arr.map(n => (gKey === "pick4" ? String(n) : String(n).padStart(2, "0"))).join("-");

            if (multiDrawViewMode === "stepper") {
              return (
                <div className="space-y-3.5 max-h-[640px] overflow-y-auto pr-1">
                  {campaigns.slice(0, 15).map(camp => {
                    const isSlipsOpen = expandedCampaignId === camp.campaign_id;
                    return (
                      <div
                        key={camp.campaign_id}
                        className="p-4 rounded-xl bg-[#13181d] border border-slate-800 space-y-3 font-mono"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                              {getGameLabel(camp.game_key)}
                            </span>
                            <span className="text-xs font-bold text-white">
                              Play Locked at Draw #{camp.anchor_draw_number}
                              {camp.anchor_draw_date ? ` (${camp.anchor_draw_date})` : ""}
                            </span>
                            <button
                              onClick={() => setExpandedCampaignId(isSlipsOpen ? null : camp.campaign_id)}
                              className="px-2 py-0.5 rounded text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-semibold cursor-pointer"
                            >
                              {isSlipsOpen ? "Hide Played Slips" : `View ${camp.wheel_slips.length} Played Slips`}
                            </button>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                              camp.window_3.slip_prize_hit
                                ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                                : camp.window_3.completed
                                ? "bg-slate-900 border-slate-700 text-slate-400"
                                : "bg-cyan-950/70 border-cyan-500/40 text-cyan-300"
                            }`}>
                              3-Draw: {camp.window_3.slip_prize_hit ? `WON ${camp.window_3.slip_win_count}/3 ($${camp.window_3.cumulative_payout_tt} TT)` : camp.window_3.completed ? "0/3 Won" : `${camp.window_3.draws_completed}/3 Draws`}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                              camp.window_5.slip_prize_hit
                                ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                                : camp.window_5.completed
                                ? "bg-slate-900 border-slate-700 text-slate-400"
                                : "bg-amber-950/70 border-amber-500/40 text-amber-300"
                            }`}>
                              5-Draw: {camp.window_5.slip_prize_hit ? `WON ${camp.window_5.slip_win_count}/5 ($${camp.window_5.cumulative_payout_tt} TT)` : camp.window_5.completed ? "0/5 Won" : `${camp.window_5.draws_completed}/5 Draws`}
                            </span>
                          </div>
                        </div>

                        {isSlipsOpen && (
                          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5 text-xs">
                            {camp.wheel_slips.map((sl, slIdx) => (
                              <div key={slIdx} className="px-2 py-1 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                                <span className="text-slate-500">Slip #{slIdx + 1}</span>
                                <span className="text-emerald-300 font-bold">{fmtNums(camp.game_key, sl)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 5-Step Consecutive Draw Progress Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                          {camp.steps.map(st => {
                            const isVerified = st.status === "VERIFIED";
                            const isWin = st.is_prize_winner;
                            const actualSet = new Set(st.actual_numbers || []);
                            const bestSlip = st.best_slip_numbers || camp.predicted_numbers;
                            return (
                              <div
                                key={st.step}
                                className={`p-2.5 rounded-lg border flex flex-col justify-between space-y-1.5 ${
                                  !isVerified
                                    ? "bg-slate-950/60 border-slate-800/80 border-dashed text-slate-500"
                                    : isWin
                                    ? "bg-emerald-950/35 border-emerald-500/50"
                                    : "bg-slate-900/70 border-slate-800"
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-300">
                                    Draw {st.step} {st.step === 1 ? "(1D)" : st.step === 3 ? "(3D)" : st.step === 5 ? "(5D)" : ""}
                                  </span>
                                  <span className="text-cyan-400 font-bold">#{st.target_draw_number}</span>
                                </div>

                                {isVerified ? (
                                  <>
                                    <div className="text-xs text-slate-400">
                                      Result: <strong className="text-white">{fmtNums(camp.game_key, st.actual_numbers || [])}</strong>
                                    </div>
                                    <div className="text-xs">
                                      <span className="text-slate-500 block">Best Slip #{st.best_slip_index || 1}:</span>
                                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                                        {bestSlip.map((n, bIdx) => {
                                          const hit = camp.game_key === "pick4"
                                            ? st.actual_numbers?.[bIdx] === n || actualSet.has(n)
                                            : actualSet.has(n);
                                          return (
                                            <span
                                              key={bIdx}
                                              className={`px-1 rounded text-xs font-bold ${
                                                hit ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40" : "bg-slate-800 text-slate-400"
                                              }`}
                                            >
                                              {camp.game_key === "pick4" ? String(n) : String(n).padStart(2, "0")}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    <div className={`text-xs font-bold px-1.5 py-0.5 rounded text-center ${
                                      isWin
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : "bg-slate-800 text-slate-400"
                                    }`}>
                                      {isWin ? `WON $${st.payout_tt} (${st.prize_tier.split("(")[0].trim()})` : `No Prize (${st.best_slip_match} Match)`}
                                    </div>
                                  </>
                                ) : (
                                  <div className="py-4 text-center text-xs text-amber-400/80 font-semibold">
                                    Awaiting Draw #{st.target_draw_number}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            return (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#171c20] border-b border-slate-800 text-xs text-slate-400 uppercase sticky top-0">
                    <tr>
                      <th className="py-3 px-3">Anchor Draw</th>
                      <th className="py-3 px-3">Game &amp; Play</th>
                      <th className="py-3 px-3 text-center">Progress</th>
                      <th className="py-3 px-3">1-Draw (#T)</th>
                      <th className="py-3 px-3">3-Draw Window (#T..#T+2)</th>
                      <th className="py-3 px-3">5-Draw Window (#T..#T+4)</th>
                      <th className="py-3 px-3 text-right">5D Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {campaigns.slice(0, 35).map(camp => (
                      <tr key={camp.campaign_id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                          {camp.anchor_draw_date && (
                            <span className="block text-xs text-cyan-400 font-normal">{camp.anchor_draw_date}</span>
                          )}
                          Draw {camp.anchor_draw_number} to {camp.anchor_draw_number + 4}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-xs bg-slate-800 text-cyan-300 mr-1.5">
                            {getGameLabel(camp.game_key)}
                          </span>
                          <span className="text-emerald-300 font-bold">
                            {camp.predicted_numbers.map(n => (camp.game_key === "pick4" ? String(n) : String(n).padStart(2, "0"))).join("-")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            camp.draws_completed === 5
                              ? "bg-emerald-950/70 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-950/70 text-amber-300 border border-amber-500/30"
                          }`}>
                            {camp.draws_completed}/5 Draws
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {camp.window_1.completed ? (
                            <span className={camp.window_1.slip_prize_hit ? "text-emerald-400 font-bold" : "text-slate-400"}>
                              {camp.window_1.slip_prize_hit ? camp.window_1.best_prize : `Match ${camp.window_1.best_match}`}
                            </span>
                          ) : (
                            <span className="text-amber-400/80">Pending</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            camp.window_3.slip_prize_hit
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                              : camp.window_3.core_target_hit
                              ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/40"
                              : "bg-slate-900 text-slate-400"
                          }`}>
                            {camp.window_3.slip_prize_hit
                              ? `Won (${camp.window_3.slip_win_count} of 3 draws, hit on Draw ${camp.window_3.first_hit_step})`
                              : camp.window_3.core_target_hit
                              ? "Core Numbers Matched"
                              : `${camp.window_3.draws_completed} of 3 Checked`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            camp.window_5.slip_prize_hit
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                              : camp.window_5.core_target_hit
                              ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/40"
                              : "bg-slate-900 text-slate-400"
                          }`}>
                            {camp.window_5.slip_prize_hit
                              ? `Won (${camp.window_5.slip_win_count} of 5 draws, hit on Draw ${camp.window_5.first_hit_step})`
                              : camp.window_5.core_target_hit
                              ? "Core Numbers Matched"
                              : `${camp.window_5.draws_completed} of 5 Checked`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                          ${camp.window_5.cumulative_payout_tt.toLocaleString()} TT
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* 3. Collapsible Drawer: Verified Champion Engine Systems & Comparative Leaderboard */}
      <div className="bg-[#0f1418] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <button
          onClick={() => {
            triggerHaptic("selection");
            setShowLeaderboardDrawer(!showLeaderboardDrawer);
          }}
          className="w-full px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-slate-900/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {championOnlyMode
                ? "Verified #1 Champion Engine Systems (1 Per Game)"
                : "Comparative Engine Performance Leaderboard (All Tracked Engines)"}
            </h2>
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 border border-slate-700 text-slate-300">
              {displayedLeaderboard.length} Systems
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span>{showLeaderboardDrawer ? "Close Drawer" : "Open Leaderboard Drawer"}</span>
            {showLeaderboardDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showLeaderboardDrawer && (
          <div className="border-t border-slate-800 animate-fade-in">
            {loading ? (
              <div className="p-8 text-center text-slate-400 font-mono text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                Evaluating multi-engine backtest and live draw logs...
              </div>
            ) : !data || displayedLeaderboard.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                No verified engine records available for this game horizon yet. Click "Reconcile &amp; Snapshot N+1" to start tracking.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#171c20]/80 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase tracking-wider">
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
                                <span className="text-xs text-slate-400">{row.engine_key}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-xs bg-slate-800 border border-slate-700 text-slate-300">
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
                            <span className="block text-xs text-slate-400 font-normal">({row.prize_hits} hits)</span>
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
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
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
        )}
      </div>

      {/* 4. Collapsible Drawer: Mathematical Calibration Profiles & Diagnostic Advisories */}
      {((data?.calibrationProfiles && data.calibrationProfiles.length > 0) || (data?.diagnostics && data.diagnostics.length > 0)) && (
        <div className="bg-[#0f1418] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
          <button
            onClick={() => {
              triggerHaptic("selection");
              setShowDiagnosticsDrawer(!showDiagnosticsDrawer);
            }}
            className="w-full px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-slate-900/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Mathematical Calibration &amp; Diagnostic Advisories
              </h2>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                {data?.calibrationProfiles?.length || 0} Calibrated Models, {data?.diagnostics?.length || 0} Notes
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <span>{showDiagnosticsDrawer ? "Close Drawer" : "Open Calibration & Diagnostics Drawer"}</span>
              {showDiagnosticsDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showDiagnosticsDrawer && (
            <div className="p-5 border-t border-slate-800 space-y-6 animate-fade-in">
              {/* Bayesian Walk-Forward Calibration Profiles */}
              {data?.calibrationProfiles && data.calibrationProfiles.length > 0 && (
                <div className="space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Binary className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-base font-bold text-white">
                          Closed-Loop Bayesian Walk-Forward Calibration Profiles
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Empirically optimized sub-model posterior weights, sum corridors, and walk-forward test-verification lift across historical winning combinations.
                      </p>
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 self-start sm:self-auto">
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
                              <span className="text-xs font-mono text-emerald-400 font-bold">
                                {profile.calibration_lift_pct >= 0
                                  ? `+${profile.calibration_lift_pct}% Lift`
                                  : `${profile.calibration_lift_pct}% Lift`}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 my-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs font-mono">
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
                              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
                                Calibrated Sub-Model Weights (Top Regimes)
                              </span>
                              {profile.sub_model_weights.slice(0, 4).map(sw => (
                                <div key={sw.modelKey} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-xs font-mono">
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

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
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

              {/* Diagnostic Advisories */}
              {data?.diagnostics && data.diagnostics.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <div>
                    <h3 className="text-base font-bold text-white">Diagnostic Advisories &amp; Regime Alerts</h3>
                    <p className="text-xs text-slate-400">
                      Automated recommendations based on empirical hit rates and mathematical regime shifts.
                    </p>
                  </div>

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
                              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                                isCrit ? "bg-rose-500/20 text-rose-300" :
                                isOpt ? "bg-emerald-500/20 text-emerald-300" :
                                "bg-amber-500/20 text-amber-300"
                              }`}>
                                {diag.severity}
                              </span>
                              <span className="text-xs font-mono text-slate-400">
                                {getGameLabel(diag.game_key)}
                              </span>
                            </div>

                            <h3 className="text-base font-semibold text-white mb-1.5">{diag.title}</h3>
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
                            <span className="text-xs font-mono text-cyan-400 font-semibold">{diag.suggestedAction}</span>
                            <ArrowUpRight className="w-4 h-4 text-cyan-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Live Draw-by-Draw Audit Feed */}
      <div className="bg-[#0f1418] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">Draw-by-Draw Verification Audit Ledger</h2>
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
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
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
              <thead className="bg-[#171c20]/80 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase tracking-wider">
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
                  const allSlips = audit.wheel_slips && audit.wheel_slips.length > 0 ? audit.wheel_slips : [audit.predicted_numbers];
                  let bestSlipIdx = 0;
                  let bestSlipScore = -1;
                  allSlips.forEach((sl, sIdx) => {
                    if (!Array.isArray(sl)) return;
                    const sc =
                      audit.game_key === "pick4"
                        ? sl.filter((d, pos) => audit.actual_numbers?.[pos] === d).length * 2 +
                          sl.filter(d => actualSet.has(d)).length
                        : sl.filter(n => actualSet.has(n)).length;
                    if (sc > bestSlipScore) {
                      bestSlipScore = sc;
                      bestSlipIdx = sIdx;
                    }
                  });
                  const displayedSlip = allSlips[bestSlipIdx] || audit.predicted_numbers;

                  return (
                    <tr key={audit.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {audit.target_draw_date && (
                          <span className="block text-xs text-cyan-400/80 font-normal mb-0.5">
                            {audit.target_draw_date}
                          </span>
                        )}
                        #{audit.target_draw_number}
                        {audit.target_time_slot && (
                          <span className="block text-xs text-slate-400 font-normal">
                            {audit.target_time_slot}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">
                          {getGameLabel(audit.game_key)}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <span className="font-semibold text-white block">{audit.engine_name}</span>
                        <span className="text-xs text-slate-400">{formatPlainStrategy(audit.strategy_name)}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {allSlips.length > 1 && (
                            <span className="text-xs text-cyan-400 block">
                              {bestSlipIdx === 0 ? `Slip 1 of ${allSlips.length}` : `Winning Slip ${bestSlipIdx + 1} of ${allSlips.length}`}
                            </span>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {displayedSlip.map((n, nIdx) => {
                              const isMatch = audit.game_key === "pick4"
                                ? audit.actual_numbers?.[nIdx] === n || actualSet.has(n)
                                : actualSet.has(n);
                              return (
                                <span
                                  key={nIdx}
                                  className={`px-1.5 py-0.5 rounded text-xs font-bold ${
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
                              <span className="px-2 py-0.5 rounded text-xs font-sans font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                {audit.game_key === "win-for-life" ? `Cash Ball ${audit.predicted_powerball}` : `Powerball ${audit.predicted_powerball}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {audit.actual_numbers ? (
                          <div className="flex flex-wrap gap-1">
                            {audit.actual_numbers.map((an, aIdx) => (
                              <span key={aIdx} className="px-1 py-0.5 rounded text-xs bg-slate-900 border border-slate-800 text-slate-300">
                                {audit.game_key === "pick4" ? String(an) : String(an).padStart(2, "0")}
                              </span>
                            ))}
                            {audit.actual_powerball && (
                              <span className="px-2 py-0.5 rounded text-xs font-sans bg-slate-900 text-amber-300">
                                {audit.game_key === "win-for-life" ? `Cash Ball ${audit.actual_powerball}` : `Powerball ${audit.actual_powerball}`}
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
                          <span className="block text-xs text-cyan-400">Wheel: {audit.best_wheel_match}</span>
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

      {/* 6. Engine Guide */}
      <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-5 space-y-4 font-sans">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              How the Tracking Engines Work
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Ranked by Verified Past Results</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
            <h3 className="text-base font-bold text-emerald-400">Winning Formula Engine</h3>
            <p>
              Tracks nearby neighbor numbers (within 1 of recent draws), mirror patterns, and balanced sum ranges (<span className="text-white font-semibold">37 to 65</span> for Cash Pot, <span className="text-white font-semibold">65 to 118</span> for Lotto Plus, <span className="text-white font-semibold">66 to 111</span> for Win For Life) with an even odd-to-even mix.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
            <h3 className="text-base font-bold text-cyan-400">Full Archive Sieve Engine</h3>
            <p>
              Combines remainder groups, frequently paired numbers, movement speed across draws, and non-overlapping ticket filtering to remove repeated combinations.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
            <h3 className="text-base font-bold text-amber-400">Deep Pattern Audit Engine</h3>
            <p>
              Combines recent momentum, overdue number gaps, and frequently linked pairs while keeping overlap to at most 2 numbers in Cash Pot and balancing 12-Way and 24-Way Boxes in Pick 4.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
            <h3 className="text-base font-bold text-purple-400">Combined Consensus Set</h3>
            <p>
              Brings together the highest-scoring picks into non-overlapping playable lines plus a 10-slip covering wheel and rotating Powerball or Cash Ball coverage.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <div className="text-sky-400 font-bold uppercase">11-Model Ensemble (Play Whe)</div>
            <p>
              Play Whe consensus combining Markov transitions, EWMA, cycle recency, day+slot bias, pair chains, autocorrelation, and RTM Z-score rebound across 5 tactical marks.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <div className="text-rose-400 font-bold uppercase">Conviction &amp; Merit Selection</div>
            <p>
              Each game&apos;s Champion Pick is selected dynamically by verified Win Rate + ROI composite. <span className="text-emerald-300">HIGH CONVICTION</span> vs. <span className="text-rose-300">HIGH ENTROPY</span> reflects rolling 60-draw Shannon entropy departure from uniform randomness.
            </p>
          </div>
        </div>
      </div>

      {exportSlipPayload && (
        <BetSlipExportModal
          isOpen={true}
          onClose={() => setExportSlipPayload(null)}
          gameKey={exportSlipPayload.gameKey}
          gameName={exportSlipPayload.gameName}
          targetDrawNumber={exportSlipPayload.targetDrawNumber}
          slips={exportSlipPayload.slips}
          bonusBalls={exportSlipPayload.bonusBalls}
          unitCostTT={exportSlipPayload.unitCostTT}
          multiplierIncluded={exportSlipPayload.gameKey === "cashpot"}
        />
      )}
    </div>
  );
}
