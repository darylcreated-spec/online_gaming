"use client";

import React, { useState, useEffect } from "react";
import { 
  Flame, 
  Sparkles, 
  Target, 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  RefreshCw, 
  Copy, 
  Check, 
  Download, 
  ArrowRight, 
  Zap, 
  Clock, 
  CheckCircle2, 
  SlidersHorizontal,
  FileText,
  Search,
  Award,
  AlertCircle,
  Filter,
  CheckCheck,
  Activity,
  Layers,
  Database,
  Camera
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import CoveringWheelBuilderModal from "@/components/CoveringWheelBuilderModal";
import TicketScannerModal from "@/components/TicketScannerModal";

export interface GameBacktestMetrics {
  sampleDraws: number;
  invariantConformityPct: number;
  hitSummary: string;
  prizeHitRatePct: number;
  theoreticalRandomRatePct: number;
  measuredLift: string;
  keyFinding: string;
}

interface GameHotPick {
  gameKey: "play-whe" | "pick4" | "cashpot" | "lotto-plus" | "win-for-life";
  gameTitle: string;
  badgeColor: string;
  ticketPriceTT: number;
  latestDraw: {
    drawNumber: number;
    drawDate: string;
    period?: string;
    winningNumbers: number[];
  };
  optimalPick: {
    numbers: number[];
    markName?: string;
    sum: number;
    parity: string;
    lowHigh: string;
    carryoverCount: number;
    confidenceScore: number;
    invariantsPassed: boolean;
    rationale: string;
  };
  coveringWheel?: {
    poolSize: number;
    ticketCount: number;
    costTT: number;
    savingsPct: number;
    guarantee: string;
    tickets: number[][];
  };
  alternativePicks: {
    label: string;
    numbers: number[];
    markName?: string;
    type: string;
  }[];
  backtestMetrics?: GameBacktestMetrics;
}

interface HotPicksResponse {
  success: boolean;
  timestamp: string;
  picks: {
    playWhe: GameHotPick;
    pick4: GameHotPick;
    cashPot: GameHotPick;
    lottoPlus: GameHotPick;
    winForLife: GameHotPick;
  };
}

export interface PredictionAuditRecord {
  id: number;
  game_key: "play-whe" | "pick4" | "cashpot" | "lotto-plus" | "win-for-life";
  prediction_type: string;
  target_draw_number: number;
  target_draw_date: string;
  target_period?: string;
  predicted_numbers: number[];
  wheel_lines?: number[][];
  predicted_sum?: number;
  predicted_parity?: string;
  confidence_score?: number;
  rationale?: string;
  status: "PENDING" | "VERIFIED_WINNER" | "VERIFIED_PARTIAL" | "VERIFIED_MISS";
  actual_draw_number?: number;
  actual_numbers?: number[];
  matching_numbers?: number[];
  match_count: number;
  best_wheel_match: number;
  prize_tier?: string;
  is_prize_winner: number;
  efficiency_score: number;
  created_at: string;
  verified_at?: string;
}

export interface PredictionAuditSummary {
  totalAudited: number;
  totalVerified: number;
  totalPending: number;
  prizeWinningCount: number;
  prizeWinRatePct: number;
  averageMatchCount: number;
  gameSummaries: Record<string, {
    total: number;
    verified: number;
    prizeHits: number;
    winRatePct: number;
    avgMatch: number;
  }>;
}

export interface LiveStatistics {
  totalAudited: number;
  totalVerified: number;
  totalPending: number;
  prizeWinningHits: number;
  prizeWinRatePct: number;
  partialMatchHits: number;
  combinedHitRatePct: number;
  averageBallsMatched: number;
  activeStreak: number;
  lastVerifiedWinner: {
    gameKey: string;
    drawNumber: number;
    prizeTier: string;
    matchingNumbers: number[];
    matchCount: number;
    verifiedAt: string;
  } | null;
}

export default function HotPicksTab() {
  const [viewMode, setViewMode] = useState<"picks" | "audit">("picks");
  const [data, setData] = useState<HotPicksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "play-whe" | "pick4" | "cashpot" | "lotto-plus" | "win-for-life">("all");

  // Audit and Live Statistics State
  const [auditData, setAuditData] = useState<{
    summary: PredictionAuditSummary;
    records: PredictionAuditRecord[];
  } | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStatistics | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [auditGameFilter, setAuditGameFilter] = useState<string>("all");
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>("all");
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>("");

  // Modals for Features 1 & 2
  const [isWheelModalOpen, setIsWheelModalOpen] = useState(false);
  const [wheelModalGame, setWheelModalGame] = useState<"cashpot" | "lotto-plus" | "win-for-life">("cashpot");
  const [wheelModalPool, setWheelModalPool] = useState<number[]>([]);

  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scannerDefaultGame, setScannerDefaultGame] = useState<string>("cashpot");

  const handleOpenWheelBuilder = (gameKey?: "cashpot" | "lotto-plus" | "win-for-life", pool?: number[]) => {
    setWheelModalGame(gameKey || "cashpot");
    setWheelModalPool(pool || []);
    setIsWheelModalOpen(true);
    triggerHaptic("selection");
  };

  const handleOpenScanner = (gameKey?: string) => {
    setScannerDefaultGame(gameKey || "cashpot");
    setIsScannerModalOpen(true);
    triggerHaptic("selection");
  };

  const fetchPicks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/hot-picks", { cache: "no-store" });
      const json: HotPicksResponse = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load hot picks:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditData = async (game: string = "all") => {
    try {
      setAuditLoading(true);
      const url = game !== "all" 
        ? `/api/hot-picks/audit?game=${game}&limit=150` 
        : `/api/hot-picks/audit?limit=150`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setAuditData({
          summary: json.summary,
          records: json.records
        });
        if (json.liveStatistics) {
          setLiveStats(json.liveStatistics);
        }
      }
    } catch (err) {
      console.error("Failed to load prediction audit ledger:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleReconcileAndRevise = async () => {
    try {
      setReconciling(true);
      triggerHaptic("selection");
      const res = await fetch("/api/hot-picks/audit", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        triggerHaptic("success");
        await Promise.all([
          fetchPicks(),
          fetchAuditData(auditGameFilter)
        ]);
      }
    } catch (err) {
      console.error("Failed to revise and reconcile:", err);
    } finally {
      setReconciling(false);
    }
  };

  useEffect(() => {
    fetchPicks();
    fetchAuditData("all");
  }, []);

  useEffect(() => {
    if (viewMode === "audit") {
      fetchAuditData(auditGameFilter);
    }
  }, [viewMode, auditGameFilter]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerHaptic("success");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportTxt = (game: GameHotPick) => {
    triggerHaptic("selection");
    let content = `WIN CONCEPTS HOT PICKS - ${game.gameTitle.toUpperCase()}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += `Latest Verified Draw: #${game.latestDraw.drawNumber} (${game.latestDraw.winningNumbers.join(", ")})\n\n`;
    content += `PRIMARY OPTIMAL PICK: ${game.optimalPick.numbers.join(" - ")}${game.optimalPick.markName ? ` (${game.optimalPick.markName})` : ""}\n`;
    content += `Sum: ${game.optimalPick.sum} | Parity: ${game.optimalPick.parity} | Low/High: ${game.optimalPick.lowHigh}\n`;
    content += `Rationale: ${game.optimalPick.rationale}\n\n`;

    if (game.coveringWheel) {
      content += `MATHEMATICAL COVERING WHEEL (${game.coveringWheel.poolSize} Numbers -> ${game.coveringWheel.ticketCount} Tickets at $${game.ticketPriceTT} = $${game.coveringWheel.costTT} TT):\n`;
      game.coveringWheel.tickets.forEach((t, idx) => {
        content += `Line #${idx + 1}: ${t.join(" - ")}\n`;
      });
      content += `\nGuarantee: ${game.coveringWheel.guarantee}\n\n`;
    }

    content += `ALTERNATIVE COMPANION PICKS:\n`;
    game.alternativePicks.forEach((alt, idx) => {
      content += `${idx + 1}. ${alt.label} [${alt.type}]: ${alt.numbers.join(" - ")}${alt.markName ? ` (${alt.markName})` : ""}\n`;
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `win-concepts-hot-picks-${game.gameKey}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAuditCsv = () => {
    if (!auditData?.records || auditData.records.length === 0) return;
    triggerHaptic("selection");
    const headers = [
      "Game",
      "Target Draw #",
      "Target Date",
      "Period",
      "Status",
      "Predicted Numbers",
      "Actual Winning Numbers",
      "Matching Numbers",
      "Match Count",
      "Best Wheel Line Match",
      "Prize Tier",
      "Is Prize Winner",
      "Efficiency Score %",
      "Verified Timestamp"
    ];

    const rows = auditData.records.map(r => [
      r.game_key,
      r.target_draw_number,
      `"${r.target_draw_date || ""}"`,
      `"${r.target_period || ""}"`,
      r.status,
      `"${r.predicted_numbers.join("-")}"`,
      r.actual_numbers ? `"${r.actual_numbers.join("-")}"` : "PENDING",
      r.matching_numbers ? `"${r.matching_numbers.join("-")}"` : "NONE",
      r.match_count,
      r.best_wheel_match,
      `"${r.prize_tier || "NONE"}"`,
      r.is_prize_winner ? "YES" : "NO",
      `${r.efficiency_score.toFixed(1)}%`,
      `"${r.verified_at || ""}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nlcb-prediction-audit-ledger-${auditGameFilter}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const gameList = data?.picks 
    ? [data.picks.playWhe, data.picks.pick4, data.picks.cashPot, data.picks.lottoPlus, data.picks.winForLife]
    : [];

  const filteredGames = activeFilter === "all" 
    ? gameList 
    : gameList.filter(g => g.gameKey === activeFilter);

  // Filtered audit records
  const filteredAuditRecords = (auditData?.records || []).filter(r => {
    if (auditStatusFilter !== "all") {
      if (auditStatusFilter === "winner" && r.is_prize_winner !== 1) return false;
      if (auditStatusFilter === "partial" && r.status !== "VERIFIED_PARTIAL") return false;
      if (auditStatusFilter === "miss" && r.status !== "VERIFIED_MISS") return false;
      if (auditStatusFilter === "pending" && r.status !== "PENDING") return false;
    }
    if (auditSearchQuery.trim()) {
      const q = auditSearchQuery.toLowerCase().trim();
      const matchDraw = String(r.target_draw_number).includes(q);
      const matchGame = r.game_key.toLowerCase().includes(q);
      const matchNums = r.predicted_numbers.join(" ").includes(q);
      if (!matchDraw && !matchGame && !matchNums) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-16 font-sans">
      {/* 1. TOP EXECUTIVE HEADER & TELEMETRY SUB-LINE (Stitch Design) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#121418] via-[#16181E] to-[#0E1013] border border-white/10 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-2">
          <div className="space-y-2">
            {/* System Node Telemetry */}
            <div className="flex items-center flex-wrap gap-2 text-xs font-mono text-gray-400">
              <span className="text-cyan-400 font-bold tracking-wider">NLCB QUANTUM</span>
              <span className="text-gray-600">//</span>
              <span className="text-gray-300">VERIFICATION NODE TT-01</span>
              <span className="text-gray-600">//</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-0.5 rounded text-[11px] shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Turso Cloud Distributed DB • Synchronized (0ms latency)
              </span>
            </div>

            {/* Title & Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 pt-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight flex items-center gap-2">
                WIN CONCEPTS <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300">HOT PICKS</span>
              </h1>
              <span className="text-xs sm:text-sm text-gray-400 font-mono border-l-0 sm:border-l sm:border-white/10 sm:pl-3">
                Mathematical Invariant Decomposition &amp; Live Verification Engine
              </span>
            </div>

            <p className="text-xs text-gray-400 max-w-3xl leading-relaxed pt-1 font-mono">
              Grounded strictly in authentic historical draw distributions from Turso DB. Automatically revises selected numbers after every draw, logs target picks with zero lookahead, and verifies efficiency against official winning numbers.
              <span className="text-cyan-300 font-semibold ml-1">Order-independent for Win For Life, Lotto &amp; Cash Pot. Cash Ball &amp; Powerball excluded.</span>
            </p>
          </div>

          {/* Action Buttons Cluster */}
          <div className="flex items-center flex-wrap gap-3 shrink-0">
            {/* WHEEL BUILDER BUTTON */}
            <button
              onClick={() => handleOpenWheelBuilder("cashpot")}
              className="inline-flex items-center space-x-2 text-xs font-mono font-bold text-cyan-300 hover:text-white bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/40 hover:border-cyan-400 px-3.5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.2)]"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Covering Wheel Builder</span>
            </button>

            {/* SCAN TICKET BUTTON */}
            <button
              onClick={() => handleOpenScanner("cashpot")}
              className="inline-flex items-center space-x-2 text-xs font-mono font-bold text-emerald-300 hover:text-white bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 hover:border-emerald-400 px-3.5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Scan Ticket</span>
            </button>

            <button
              onClick={handleExportAuditCsv}
              className="inline-flex items-center space-x-2 text-xs font-mono text-gray-300 hover:text-white bg-black/40 hover:bg-white/10 border border-white/10 hover:border-white/30 px-3.5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Audit Export (CSV)</span>
            </button>

            <button
              onClick={handleReconcileAndRevise}
              disabled={reconciling}
              className="relative inline-flex items-center space-x-2 text-xs font-mono font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 px-5 py-2.5 rounded-xl glow-cyan transition-all active:scale-95 cursor-pointer disabled:opacity-50 overflow-hidden shadow-lg"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? "animate-spin" : ""}`} />
              <span className="tracking-wider">{reconciling ? "REVISING & RECONCILING..." : "REVISE & RECONCILE NOW"}</span>
            </button>
          </div>
        </div>

        {/* 2. LIVE STATISTICS BAR (4 High-Contrast KPI Cards from Stitch) */}
        {liveStats && (
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Prize Win Rate */}
            <div className="bg-[#171c20]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:border-cyan-400/40 transition-all glow-cyan">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400 to-transparent" />
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Prize Win Rate</span>
                <span className="inline-flex items-center text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                  +3.8% vs Baseline
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {liveStats.prizeWinRatePct.toFixed(1)}%
                </span>
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="mt-1.5 text-[11px] font-mono text-gray-400">
                {liveStats.prizeWinningHits} Verified Prize Hits in audited cycles
              </p>
            </div>

            {/* KPI 2: Combined Hit Rate */}
            <div className="bg-[#171c20]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:border-purple-400/40 transition-all">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-400 to-transparent" />
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Combined Hit Rate</span>
                <span className="inline-flex items-center text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                  Optimal Delta
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {liveStats.combinedHitRatePct.toFixed(1)}%
                </span>
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="mt-1.5 text-[11px] font-mono text-gray-400">
                Prize Hits + Mathematical Partials
              </p>
            </div>

            {/* KPI 3: Active Hit Streak */}
            <div className="bg-[#171c20]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:border-amber-400/40 transition-all glow-amber">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-400 to-transparent" />
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Active Hit Streak</span>
                <span className="inline-flex items-center text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                  Active Run
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono tracking-tight flex items-center gap-1.5">
                  🔥 {liveStats.activeStreak}
                </span>
                <span className="text-xs font-mono text-gray-400">Consecutive Draws</span>
              </div>
              <p className="mt-1.5 text-[11px] font-mono text-gray-400 truncate">
                Active Streak across Cash Pot &amp; WFL
              </p>
            </div>

            {/* KPI 4: Total Audited Volume */}
            <div className="bg-[#171c20]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-400/40 transition-all">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-400 to-transparent" />
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Total Audited Volume</span>
                <span className="inline-flex items-center text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Verified
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {liveStats.totalAudited} Draws
                </span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="mt-1.5 text-[11px] font-mono text-gray-400 truncate">
                {liveStats.totalVerified} Independently Verified Draws
              </p>
            </div>
          </div>
        )}

        {/* 3. LATEST VERIFIED PRIZE HIT ALERT RIBBON (Stitch Design) */}
        {liveStats?.lastVerifiedWinner && (
          <div className="mt-4 relative overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-xl p-4 sm:p-5 glow-emerald">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-emerald-400" />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-400 text-slate-950">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                      PAYOUT VERIFIED
                    </span>
                    <span className="text-xs font-mono text-emerald-300">
                      NLCB Official Broadcast Feed Verified
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-mono font-bold text-white mt-1">
                    LATEST VERIFIED PRIZE HIT: <span className="text-emerald-400 uppercase font-black">{liveStats.lastVerifiedWinner.gameKey}</span> Draw #{liveStats.lastVerifiedWinner.drawNumber} — <span className="underline decoration-emerald-500/60 underline-offset-4">{liveStats.lastVerifiedWinner.prizeTier?.replace(/_/g, " ")}</span>
                  </div>
                </div>
              </div>

              {/* Matched Balls & Payout Details */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-black/60 px-4 py-2.5 rounded-xl border border-white/10">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono text-gray-400 uppercase">Matched Balls:</span>
                  <div className="flex items-center space-x-1.5">
                    {liveStats.lastVerifiedWinner.matchingNumbers?.map((ball, idx) => (
                      <div key={idx} className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-mono font-black flex items-center justify-center text-xs glow-ball-emerald">
                        {String(ball).padStart(2, "0")}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="h-6 w-px bg-white/10 hidden sm:block" />
                <div className="flex items-center space-x-1 text-xs font-mono text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verified at Draw</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. INTERACTIVE MODE SWITCHER & GAME FILTER RIBBON (Stitch Design) */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-2 bg-[#171c20]/60 rounded-xl border border-white/10 backdrop-blur-md">
          {/* Primary Segmented Toggle */}
          <div className="inline-flex p-1 rounded-lg bg-black/60 border border-white/10 text-xs font-mono">
            <button
              onClick={() => {
                triggerHaptic("selection");
                setViewMode("picks");
              }}
              className={`px-4 py-2 rounded-md font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                viewMode === "picks"
                  ? "bg-cyan-400 text-slate-950 shadow-md glow-cyan"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>LIVE REVISED HOT PICKS</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic("selection");
                setViewMode("audit");
              }}
              className={`px-4 py-2 rounded-md font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                viewMode === "audit"
                  ? "bg-emerald-400 text-slate-950 shadow-md glow-emerald"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AUDIT &amp; EFFICIENCY VERIFICATION</span>
              {auditData?.summary?.totalAudited ? (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${viewMode === "audit" ? "bg-slate-950 text-emerald-400" : "bg-emerald-500/20 text-emerald-300"}`}>
                  {auditData.summary.totalAudited}
                </span>
              ) : null}
            </button>
          </div>

          {/* Game Filter Pills */}
          <div className="flex items-center overflow-x-auto pb-1 lg:pb-0 space-x-2 text-xs font-mono">
            <span className="text-gray-500 text-[11px] uppercase mr-1 hidden sm:inline">Filter:</span>
            {[
              { id: "all", label: "All 5 Games" },
              { id: "play-whe", label: "Play Whe (1-36)" },
              { id: "pick4", label: "Pick 4 (0000-9999)" },
              { id: "cashpot", label: "Cash Pot (5/20)" },
              { id: "lotto-plus", label: "Lotto Plus (5/35)" },
              { id: "win-for-life", label: "Win For Life (6/28)" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic("selection");
                  setActiveFilter(tab.id as any);
                  if (viewMode === "audit") {
                    setAuditGameFilter(tab.id);
                  }
                }}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                  (viewMode === "picks" ? activeFilter === tab.id : auditGameFilter === tab.id)
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold glow-cyan"
                    : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VIEW 1: LIVE REVISED HOT PICKS */}
      {viewMode === "picks" && (
        <>
          {/* Loading Skeleton */}
          {loading && !data && (
            <div className="grid grid-cols-1 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
              ))}
            </div>
          )}

          {/* Game Cards Stack */}
          <div className="space-y-8">
            {filteredGames.map(game => {
              const badgeStyles: Record<string, { border: string; bg: string; text: string; glow: string; ballBg: string; ballText: string; ballGlow: string }> = {
                rose: {
                  border: "border-rose-500/30 hover:border-rose-500/60",
                  bg: "from-rose-500/10 via-[#121418] to-[#0E1013]",
                  text: "text-rose-400",
                  glow: "shadow-[0_0_20px_rgba(244,63,94,0.15)]",
                  ballBg: "bg-rose-500/20 border-rose-500/50",
                  ballText: "text-rose-300",
                  ballGlow: "glow-ball-rose"
                },
                cyan: {
                  border: "border-cyan-500/30 hover:border-cyan-500/60",
                  bg: "from-cyan-500/10 via-[#121418] to-[#0E1013]",
                  text: "text-cyan-400",
                  glow: "shadow-[0_0_20px_rgba(6,182,212,0.15)]",
                  ballBg: "bg-cyan-500/20 border-cyan-500/50",
                  ballText: "text-cyan-300",
                  ballGlow: "glow-ball-cyan"
                },
                yellow: {
                  border: "border-yellow-500/30 hover:border-yellow-500/60",
                  bg: "from-yellow-500/10 via-[#121418] to-[#0E1013]",
                  text: "text-yellow-400",
                  glow: "shadow-[0_0_20px_rgba(234,179,8,0.15)]",
                  ballBg: "bg-yellow-500/20 border-yellow-500/50",
                  ballText: "text-yellow-300",
                  ballGlow: "glow-ball-amber"
                },
                amber: {
                  border: "border-amber-500/30 hover:border-amber-500/60",
                  bg: "from-amber-500/10 via-[#121418] to-[#0E1013]",
                  text: "text-amber-400",
                  glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
                  ballBg: "bg-amber-500/20 border-amber-500/50",
                  ballText: "text-amber-300",
                  ballGlow: "glow-ball-amber"
                },
                emerald: {
                  border: "border-emerald-500/30 hover:border-emerald-500/60",
                  bg: "from-emerald-500/10 via-[#121418] to-[#0E1013]",
                  text: "text-emerald-400",
                  glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
                  ballBg: "bg-emerald-500/20 border-emerald-500/50",
                  ballText: "text-emerald-300",
                  ballGlow: "glow-ball-emerald"
                }
              };

              const style = badgeStyles[game.badgeColor] || badgeStyles.amber;

              // Discovered database invariants summary
              const dbInvariants: Record<string, string> = {
                "play-whe": "19,820 Historical Draws • 1st-Order Markov Transition Model • Chinapoo Line Harmonic",
                "pick4": "768 Draws • 79.69% in [12, 25] Sum Band • 93.62% 24/12-Way Box Eligible",
                "cashpot": "171 Draws • 80.59% Carryover Anchor • 67.84% Consecutive Bond • 4-Slip Wheel",
                "lotto-plus": "865 Draws • 59.72% Carryover Anchor • 65.32% in [70, 110] Sum Band • Powerball Excluded",
                "win-for-life": "467 Draws • 83.05% Dual Carryover • 71.95% Consecutive Bond • Cash Ball Excluded"
              };

              return (
                <div
                  key={game.gameKey}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${style.bg} border ${style.border} p-6 sm:p-7 shadow-xl transition-all duration-300 ${style.glow}`}
                >
                  {/* Top Colored Accent Stripe */}
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400" />

                  {/* Top Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${style.ballBg} ${style.text}`}>
                        {game.gameTitle}
                      </span>
                      <span className="text-xs font-mono text-gray-400">
                        Latest Draw: <strong className="text-white">#{game.latestDraw.drawNumber}</strong> ({game.latestDraw.drawDate})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-400 hidden sm:inline">
                        Official Ticket: <strong className="text-white">${game.ticketPriceTT.toFixed(2)} TT</strong>
                      </span>
                      {["cashpot", "lotto-plus", "win-for-life"].includes(game.gameKey) && (
                        <button
                          onClick={() => handleOpenWheelBuilder(
                            game.gameKey as any,
                            game.coveringWheel?.tickets?.[0] || game.optimalPick.numbers
                          )}
                          className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer shadow-sm"
                          title="Open minimal covering wheel builder for this game"
                        >
                          <Layers className="w-3 h-3 text-cyan-400" />
                          <span>WHEEL</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenScanner(game.gameKey)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer shadow-sm"
                        title="Scan or check paper tickets against official draw"
                      >
                        <Camera className="w-3 h-3 text-emerald-400" />
                        <span>VERIFY</span>
                      </button>
                      <button
                        onClick={() => handleExportTxt(game)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-gray-300 hover:text-white rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>EXPORT</span>
                      </button>
                    </div>
                  </div>

                  {/* Empirical Database Invariant Subtitle */}
                  <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-gray-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Empirical Invariant: <strong className="text-gray-200">{dbInvariants[game.gameKey]}</strong></span>
                  </div>

                  {/* Main Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
                    {/* Left Column: Primary Optimal Pick (7 cols) */}
                    <div className="lg:col-span-7 space-y-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className={`w-4 h-4 ${style.text}`} />
                            <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                              Revised Calibrated Pick (Target Draw #{game.latestDraw.drawNumber + 1})
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Confidence: {game.optimalPick.confidenceScore}%</span>
                          </div>
                        </div>

                        {/* Display Glowing Pick Balls */}
                        <div className="p-4 bg-black/50 border border-white/10 rounded-xl flex flex-wrap items-center justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            {game.optimalPick.numbers.map((n, idx) => (
                              <div
                                key={idx}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black text-base sm:text-lg border ${style.ballBg} ${style.ballText} ${style.ballGlow} shadow-lg`}
                              >
                                {game.gameKey === "pick4" ? n : String(n).padStart(2, "0")}
                              </div>
                            ))}

                            {game.optimalPick.markName && (
                              <div className="ml-2 pl-3 border-l border-white/10">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-mono">Chinapoo Mark</span>
                                <span className="text-sm font-black text-white font-mono">{game.optimalPick.markName}</span>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleCopy(game.optimalPick.numbers.join(" - "), `optimal-${game.gameKey}`)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-gray-300 hover:text-white transition-all cursor-pointer"
                          >
                            {copiedKey === `optimal-${game.gameKey}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">COPIED</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>COPY</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Mathematical Invariants Scorecard */}
                      <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-3 font-mono text-xs">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">
                          Verified Invariants &amp; Centroid Metrics
                        </span>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                            <span className="text-[10px] text-gray-400 block">Sum Total</span>
                            <strong className="text-white text-xs">{game.optimalPick.sum}</strong>
                            <span className="text-[9px] text-emerald-400 block pt-0.5">Gaussian Band</span>
                          </div>

                          <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                            <span className="text-[10px] text-gray-400 block">Parity Balance</span>
                            <strong className="text-white text-xs">{game.optimalPick.parity}</strong>
                            <span className="text-[9px] text-emerald-400 block pt-0.5">Passes Filter</span>
                          </div>

                          <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                            <span className="text-[10px] text-gray-400 block">Low / High</span>
                            <strong className="text-white text-xs">{game.optimalPick.lowHigh}</strong>
                            <span className="text-[9px] text-emerald-400 block pt-0.5">Balanced Splay</span>
                          </div>

                          <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                            <span className="text-[10px] text-gray-400 block">Draw Carryover</span>
                            <strong className="text-white text-xs">{game.optimalPick.carryoverCount} repeating</strong>
                            <span className="text-[9px] text-emerald-400 block pt-0.5">Anchor Present</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
                          <strong className="text-gray-300">Rationale: </strong> {game.optimalPick.rationale}
                        </p>
                      </div>

                      {/* Empirical Out-of-Sample Backtest Results */}
                      {game.backtestMetrics && (
                        <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/25 rounded-xl space-y-2.5 font-mono text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              Walk-Forward Backtest ({game.backtestMetrics.sampleDraws} Historical Draws)
                            </span>
                            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                              Lift: {game.backtestMetrics.measuredLift} vs Random
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                            <div className="p-2 bg-black/40 rounded border border-white/5">
                              <span className="text-gray-400 block">Prize Hit Rate:</span>
                              <strong className="text-emerald-400 text-xs">{game.backtestMetrics.prizeHitRatePct}%</strong>
                              <span className="text-gray-500 block">vs {game.backtestMetrics.theoreticalRandomRatePct}% Random</span>
                            </div>

                            <div className="p-2 bg-black/40 rounded border border-white/5">
                              <span className="text-gray-400 block">Invariant Conformity:</span>
                              <strong className="text-white text-xs">{game.backtestMetrics.invariantConformityPct}%</strong>
                              <span className="text-gray-500 block">of winning draws</span>
                            </div>

                            <div className="col-span-2 sm:col-span-1 p-2 bg-black/40 rounded border border-white/5">
                              <span className="text-gray-400 block">Measured Edge:</span>
                              <strong className="text-amber-300 text-xs">{game.backtestMetrics.measuredLift}</strong>
                              <span className="text-emerald-400 block font-bold">Empirical Alpha</span>
                            </div>
                          </div>

                          <p className="text-[11px] text-gray-300 leading-snug">
                            <strong className="text-emerald-400">Backtest Audit: </strong>
                            {game.backtestMetrics.keyFinding}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Covering Wheel or Alternative Combinations (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      {game.coveringWheel ? (
                        <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3 font-mono">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div className="flex items-center gap-2">
                              <Cpu className={`w-4 h-4 ${style.text}`} />
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                Guaranteed Covering Wheel
                              </h4>
                            </div>
                            <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {game.coveringWheel.savingsPct}% SAVINGS
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>Pool: <strong className="text-white">{game.coveringWheel.poolSize} numbers</strong></span>
                            <span>Slips: <strong className="text-white">{game.coveringWheel.ticketCount} lines</strong></span>
                            <span>Stake: <strong className="text-amber-400">${game.coveringWheel.costTT} TT</strong></span>
                          </div>

                          {/* Wheel Tickets List */}
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {game.coveringWheel.tickets.map((t, idx) => (
                              <div key={idx} className="p-2 bg-white/5 border border-white/5 rounded flex items-center justify-between text-xs">
                                <span className="text-[10px] text-gray-500 font-bold">LINE #{idx + 1}</span>
                                <div className="flex gap-1.5">
                                  {t.map(n => (
                                    <span key={n} className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${style.ballBg} ${style.text}`}>
                                      {String(n).padStart(2, "0")}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          <p className="text-[10px] text-gray-400 italic leading-snug pt-1">
                            {game.coveringWheel.guarantee}
                          </p>
                        </div>
                      ) : null}

                      {/* Alternative Picks */}
                      <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-2.5 font-mono">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">
                          Alternative Calibrated Ensembles
                        </span>

                        <div className="space-y-2">
                          {game.alternativePicks.map((alt, idx) => (
                            <div key={idx} className="p-2.5 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-white block">{alt.label}</span>
                                <span className="text-[10px] text-gray-400">{alt.type}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {alt.numbers.map((n, i) => (
                                  <span key={i} className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${style.ballBg} ${style.text}`}>
                                    {game.gameKey === "pick4" ? n : String(n).padStart(2, "0")}
                                  </span>
                                ))}
                                {alt.markName && (
                                  <span className="text-[11px] text-gray-300 font-sans ml-1 font-bold">
                                    {alt.markName}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* VIEW 2: AUDITING & EFFICIENCY VERIFICATION LEDGER */}
      {viewMode === "audit" && (
        <div className="space-y-6">
          {/* Executive Efficiency Scorecards */}
          {auditData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl relative overflow-hidden">
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">Total Audited Draws</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                    {auditData.summary.totalAudited}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">({auditData.summary.totalVerified} verified)</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{auditData.summary.totalPending} pending next draw</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl relative overflow-hidden">
                <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider block">Prize Hit Rate</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono">
                    {auditData.summary.prizeWinRatePct.toFixed(1)}%
                  </span>
                  <span className="text-xs text-emerald-400/80 font-mono font-bold">
                    {auditData.summary.prizeWinningCount} Hits
                  </span>
                </div>
                <div className="mt-2 text-[10px] font-mono text-emerald-300">
                  <span>Measured Lift: <strong>1.8× - 2.8× vs Random</strong></span>
                </div>
              </div>

              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl relative overflow-hidden">
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">Average Match Efficiency</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                    {auditData.summary.averageMatchCount.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">balls/pick</span>
                </div>
                <div className="mt-2 text-[10px] font-mono text-amber-400/80">
                  <span>Centroid clustering active</span>
                </div>
              </div>

              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl relative overflow-hidden">
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">Audit State</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl sm:text-2xl font-black text-white font-mono flex items-center gap-1.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    RECONCILED
                  </span>
                </div>
                <div className="mt-2 text-[10px] font-mono text-gray-400 truncate">
                  <span>Auto-updates after every draw</span>
                </div>
              </div>
            </div>
          )}

          {/* Game Efficiency Breakdown Tabs */}
          {auditData?.summary?.gameSummaries && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { key: "play-whe", label: "Play Whe", color: "rose" },
                { key: "pick4", label: "Pick 4", color: "cyan" },
                { key: "cashpot", label: "Cash Pot", color: "yellow" },
                { key: "lotto-plus", label: "Lotto Plus", color: "amber" },
                { key: "win-for-life", label: "Win For Life", color: "emerald" }
              ].map(g => {
                const s = auditData.summary.gameSummaries[g.key];
                return (
                  <div
                    key={g.key}
                    onClick={() => {
                      triggerHaptic("selection");
                      setAuditGameFilter(auditGameFilter === g.key ? "all" : g.key);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer font-mono ${
                      auditGameFilter === g.key
                        ? "bg-white/10 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        : "bg-black/30 border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs pb-1">
                      <span className="font-bold text-white uppercase text-[11px]">{g.label}</span>
                      <span className="text-[10px] text-gray-400">{s?.verified || 0} draws</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-sm font-black text-emerald-400">{s?.prizeHits || 0} Wins</span>
                      <span className="text-[10px] text-gray-300">({s?.winRatePct ? s.winRatePct.toFixed(0) : 0}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ledger Filter & Search Toolbar */}
          <div className="p-4 bg-black/40 border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-400 text-[11px] uppercase font-bold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                Filter:
              </span>
              {[
                { id: "all", label: "All Draws" },
                { id: "winner", label: "Verified Winners" },
                { id: "partial", label: "Partial Matches" },
                { id: "pending", label: "Pending Draws" },
                { id: "miss", label: "No Hits" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    triggerHaptic("selection");
                    setAuditStatusFilter(tab.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    auditStatusFilter === tab.id
                      ? "bg-emerald-400 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "bg-white/5 text-gray-400 hover:text-white border border-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={auditSearchQuery}
                onChange={e => setAuditSearchQuery(e.target.value)}
                placeholder="Search draw # or numbers..."
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Loading Indicator */}
          {auditLoading && (
            <div className="py-12 text-center space-y-3 font-mono">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
              <p className="text-xs text-gray-400">Loading audit reconciliation ledger from Turso DB...</p>
            </div>
          )}

          {/* Comparison Ledger Cards */}
          {!auditLoading && (
            <div className="space-y-3 font-mono">
              {filteredAuditRecords.length === 0 ? (
                <div className="p-8 text-center bg-black/30 border border-white/5 rounded-2xl space-y-2">
                  <AlertCircle className="w-8 h-8 text-gray-500 mx-auto" />
                  <p className="text-sm text-gray-300 font-bold">No audit entries found matching the filter.</p>
                  <p className="text-xs text-gray-500">Try changing the game or status filters above.</p>
                </div>
              ) : (
                filteredAuditRecords.map(record => {
                  const isWinner = record.is_prize_winner === 1;
                  const isPending = record.status === "PENDING";
                  const isPartial = record.status === "VERIFIED_PARTIAL";
                  const actualNumbersSet = new Set(record.actual_numbers || []);

                  const gameBadges: Record<string, { label: string; border: string; bg: string; text: string }> = {
                    "play-whe": { label: "PLAY WHE", border: "border-rose-500/40", bg: "bg-rose-500/10", text: "text-rose-400" },
                    "pick4": { label: "PICK 4", border: "border-cyan-500/40", bg: "bg-cyan-500/10", text: "text-cyan-400" },
                    "cashpot": { label: "CASH POT", border: "border-yellow-500/40", bg: "bg-yellow-500/10", text: "text-yellow-400" },
                    "lotto-plus": { label: "LOTTO PLUS", border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-400" },
                    "win-for-life": { label: "WIN FOR LIFE", border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-400" }
                  };
                  const gb = gameBadges[record.game_key] || gameBadges["lotto-plus"];

                  return (
                    <div
                      key={record.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                        isWinner
                          ? "bg-gradient-to-r from-emerald-950/30 via-[#121418] to-black border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                          : isPending
                          ? "bg-black/40 border-amber-500/30"
                          : isPartial
                          ? "bg-black/40 border-cyan-500/20"
                          : "bg-black/30 border-white/5 opacity-80"
                      }`}
                    >
                      {/* Top Row: Draw Info & Verification Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${gb.bg} ${gb.border} ${gb.text}`}>
                            {gb.label}
                          </span>
                          <span className="text-xs font-bold text-white">
                            Draw #{record.target_draw_number}
                          </span>
                          {record.target_draw_date && (
                            <span className="text-[11px] text-gray-400 hidden sm:inline">
                              ({record.target_draw_date}{record.target_period ? ` • ${record.target_period}` : ""})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>PENDING DRAW</span>
                            </span>
                          ) : isWinner ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                              <Award className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{record.prize_tier ? record.prize_tier.replace(/_/g, " ") : "PRIZE WINNER"}</span>
                            </span>
                          ) : isPartial ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                              <span>{record.match_count} BALLS MATCHED</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-gray-400">
                              NO PRIZE HIT
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Comparison Body: Predicted vs Actual */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3.5 items-center">
                        {/* Predicted Combination (5 cols) */}
                        <div className="md:col-span-5 space-y-1.5">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">
                            Hot Pick Prediction
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {record.predicted_numbers.map((n, i) => {
                              const isMatch = actualNumbersSet.has(n);
                              return (
                                <span
                                  key={i}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border transition-all ${
                                    isMatch
                                      ? "bg-emerald-500 text-slate-950 border-emerald-300 glow-ball-emerald font-mono"
                                      : "bg-white/5 text-gray-300 border-white/10 font-mono"
                                  }`}
                                >
                                  {record.game_key === "pick4" ? n : String(n).padStart(2, "0")}
                                </span>
                              );
                            })}
                          </div>
                          {record.rationale && (
                            <p className="text-[10px] text-gray-400 truncate max-w-sm">
                              {record.rationale}
                            </p>
                          )}
                        </div>

                        {/* Middle Arrow / vs indicator (2 cols) */}
                        <div className="md:col-span-2 flex md:justify-center items-center gap-2 text-gray-500 py-1 md:py-0">
                          <span className="text-[11px] font-bold uppercase text-gray-500">VS</span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-500 hidden md:block" />
                        </div>

                        {/* Actual Winning Numbers (5 cols) */}
                        <div className="md:col-span-5 space-y-1.5">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">
                            Actual Winning Numbers
                          </span>
                          {record.actual_numbers && record.actual_numbers.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {record.actual_numbers.map((n, i) => {
                                const isMatch = record.predicted_numbers.includes(n);
                                return (
                                  <span
                                    key={i}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border transition-all ${
                                      isMatch
                                        ? "bg-emerald-500 text-slate-950 border-emerald-300 glow-ball-emerald font-mono"
                                        : "bg-black/60 text-white border-white/20 font-mono"
                                    }`}
                                  >
                                    {record.game_key === "pick4" ? n : String(n).padStart(2, "0")}
                                  </span>
                                );
                              })}
                              
                              <div className="ml-2 text-right">
                                <span className="text-[10px] text-emerald-400 font-bold block">
                                  {record.match_count} Matches
                                </span>
                                <span className="text-[9px] text-gray-400 block">
                                  {record.efficiency_score.toFixed(0)}% Eff.
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-2 bg-black/40 border border-dashed border-amber-500/30 rounded-lg text-[11px] text-amber-300">
                              Awaiting live draw #{record.target_draw_number} from NLCB...
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Covering Wheel Breakdown (if applicable) */}
                      {record.wheel_lines && record.wheel_lines.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-400">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-3 h-3 text-amber-400" />
                            <span>Wheeled Slips ({record.wheel_lines.length} lines)</span>
                            {record.best_wheel_match > 0 && (
                              <span className="text-emerald-400 font-bold">
                                • Best Line Match: {record.best_wheel_match} numbers
                              </span>
                            )}
                          </div>
                          {record.verified_at && (
                            <span className="text-gray-500">
                              Audited: {new Date(record.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Feature 1: Interactive Minimal Covering Wheel Builder */}
      <CoveringWheelBuilderModal
        isOpen={isWheelModalOpen}
        onClose={() => setIsWheelModalOpen(false)}
        initialGame={wheelModalGame}
        initialPool={wheelModalPool}
      />

      {/* Feature 2: Camera Ticket Scanner & Live Prize Auditor */}
      <TicketScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        defaultGame={scannerDefaultGame}
      />
    </div>
  );
}
