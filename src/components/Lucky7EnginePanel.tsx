"use client";

import React, { useEffect, useState } from "react";
import {
  GitMerge,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Printer,
  Copy,
  Check,
  RefreshCw,
  Info,
  Target,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react";
import { Lucky7EngineResult, Lucky7GameKey } from "@/lib/lucky7_engine";
import { formatTrevorBall } from "@/lib/trevor_engine";
import { CHINAPOO_CHART } from "@/lib/playwhe";
import { copyTextToClipboard } from "@/lib/export_helpers";
import { triggerHaptic } from "@/lib/haptics";
import BetSlipExportModal from "@/components/BetSlipExportModal";

interface Lucky7EnginePanelProps {
  game: Lucky7GameKey;
}

interface ThemeTokens {
  accentText: string;
  accentTextSoft: string;
  border: string;
  borderStrong: string;
  badgeBg: string;
  primaryBtn: string;
  secondaryBtn: string;
  ballActive: string;
  ballSubtle: string;
  cardGlow: string;
}

const THEME_MAP: Record<Lucky7EngineResult["themeColor"], ThemeTokens> = {
  yellow: {
    accentText: "text-yellow-300",
    accentTextSoft: "text-yellow-400",
    border: "border-yellow-500/30",
    borderStrong: "border-yellow-400/60",
    badgeBg: "bg-yellow-500/15 border-yellow-400/40 text-yellow-200",
    primaryBtn: "bg-yellow-500 hover:bg-yellow-400 text-slate-950",
    secondaryBtn: "bg-yellow-500/15 hover:bg-yellow-500/25 border-yellow-400/40 text-yellow-200",
    ballActive: "bg-yellow-400 text-slate-950 border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.35)]",
    ballSubtle: "bg-yellow-500/15 border-yellow-400/40 text-yellow-200",
    cardGlow: "from-yellow-950/25 via-slate-950/90 to-slate-950"
  },
  sky: {
    accentText: "text-sky-300",
    accentTextSoft: "text-sky-400",
    border: "border-sky-500/30",
    borderStrong: "border-sky-400/60",
    badgeBg: "bg-sky-500/15 border-sky-400/40 text-sky-200",
    primaryBtn: "bg-sky-500 hover:bg-sky-400 text-slate-950",
    secondaryBtn: "bg-sky-500/15 hover:bg-sky-500/25 border-sky-400/40 text-sky-200",
    ballActive: "bg-sky-400 text-slate-950 border-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.35)]",
    ballSubtle: "bg-sky-500/15 border-sky-400/40 text-sky-200",
    cardGlow: "from-sky-950/30 via-slate-950/90 to-slate-950"
  },
  emerald: {
    accentText: "text-emerald-300",
    accentTextSoft: "text-emerald-400",
    border: "border-emerald-500/30",
    borderStrong: "border-emerald-400/60",
    badgeBg: "bg-emerald-500/15 border-emerald-400/40 text-emerald-200",
    primaryBtn: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
    secondaryBtn: "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/40 text-emerald-200",
    ballActive: "bg-emerald-400 text-slate-950 border-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.35)]",
    ballSubtle: "bg-emerald-500/15 border-emerald-400/40 text-emerald-200",
    cardGlow: "from-emerald-950/30 via-slate-950/90 to-slate-950"
  },
  amber: {
    accentText: "text-amber-300",
    accentTextSoft: "text-amber-400",
    border: "border-amber-500/30",
    borderStrong: "border-amber-400/60",
    badgeBg: "bg-amber-500/15 border-amber-400/40 text-amber-200",
    primaryBtn: "bg-amber-500 hover:bg-amber-400 text-slate-950",
    secondaryBtn: "bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-amber-200",
    ballActive: "bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.35)]",
    ballSubtle: "bg-amber-500/15 border-amber-400/40 text-amber-200",
    cardGlow: "from-amber-950/25 via-slate-950/90 to-slate-950"
  },
  purple: {
    accentText: "text-purple-300",
    accentTextSoft: "text-purple-400",
    border: "border-purple-500/30",
    borderStrong: "border-purple-400/60",
    badgeBg: "bg-purple-500/15 border-purple-400/40 text-purple-200",
    primaryBtn: "bg-purple-500 hover:bg-purple-400 text-slate-950",
    secondaryBtn: "bg-purple-500/15 hover:bg-purple-500/25 border-purple-400/40 text-purple-200",
    ballActive: "bg-purple-400 text-slate-950 border-purple-200 shadow-[0_0_12px_rgba(192,132,252,0.35)]",
    ballSubtle: "bg-purple-500/15 border-purple-400/40 text-purple-200",
    cardGlow: "from-purple-950/30 via-slate-950/90 to-slate-950"
  },
  rose: {
    accentText: "text-rose-300",
    accentTextSoft: "text-rose-400",
    border: "border-rose-500/30",
    borderStrong: "border-rose-400/60",
    badgeBg: "bg-rose-500/15 border-rose-400/40 text-rose-200",
    primaryBtn: "bg-rose-500 hover:bg-rose-400 text-slate-950",
    secondaryBtn: "bg-rose-500/15 hover:bg-rose-500/25 border-rose-400/40 text-rose-200",
    ballActive: "bg-rose-400 text-slate-950 border-rose-200 shadow-[0_0_12px_rgba(251,113,133,0.35)]",
    ballSubtle: "bg-rose-500/15 border-rose-400/40 text-rose-200",
    cardGlow: "from-rose-950/30 via-slate-950/90 to-slate-950"
  }
};

export default function Lucky7EnginePanel({ game }: Lucky7EnginePanelProps) {
  const [data, setData] = useState<Lucky7EngineResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSteinerCompare, setShowSteinerCompare] = useState<boolean>(false);
  const [exportModalState, setExportModalState] = useState<{
    title: string;
    slips: number[][];
    bonusBalls: number[];
    playLabels?: string[];
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/lucky7-engine?game=${game}&audit=true&window=45`, {
        cache: "no-store"
      });
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || "Failed to load Lucky 7 Engine.");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err?.message || "Could not load Lucky 7 Engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const onSync = () => loadData();
    window.addEventListener("win_concept_sync_completed", onSync);
    return () => window.removeEventListener("win_concept_sync_completed", onSync);
  }, [game]);

  const theme = THEME_MAP[data?.themeColor || (
    game === "cashpot"
      ? "yellow"
      : game === "lotto-plus"
      ? "sky"
      : game === "win-for-life"
      ? "emerald"
      : game === "play-whe"
      ? "amber"
      : game === "pick4"
      ? "purple"
      : "rose"
  )];

  const isMultiBall = game === "cashpot" || game === "lotto-plus" || game === "win-for-life";

  const handleCopyLucky7 = async () => {
    if (!data) return;
    triggerHaptic("success");
    const header = `THE WIN CONCEPT - LUCKY 7 ENGINE (${data.gameName.toUpperCase()} | Draw ${data.nextTargetDrawNumber} | $${data.lucky7TotalCostTT}.00 TTD)`;
    const rows = data.lucky7Plays.map((p) => {
      if (game === "play-whe") {
        const m = p.numbers[0];
        return `Lucky 7 #${p.index}: Mark ${String(m).padStart(2, "0")} (${CHINAPOO_CHART[m]?.mark || ""}) - ${p.roleLabel}`;
      }
      if (game === "fast-cash") {
        return `Lucky 7 #${p.index}: Pocket ${formatTrevorBall(game, p.numbers[0])} - ${p.roleLabel}`;
      }
      if (game === "pick4") {
        return `Lucky 7 #${p.index}: ${p.numbers.join(" - ")} | ${p.roleLabel}`;
      }
      const numsStr = p.numbers.map((n) => formatTrevorBall(game, n)).join(", ");
      const bStr = p.bonus !== undefined && data.bonusName ? ` | ${data.bonusName} ${p.bonus}` : "";
      return `Lucky 7 #${p.index}: ${numsStr}${bStr}`;
    });
    const ok = await copyTextToClipboard([header, data.metrics.contextTitle, "", ...rows].join("\n"));
    if (ok) {
      setCopiedId("lucky7");
      setTimeout(() => setCopiedId(null), 2200);
    }
  };

  if (loading && !data) {
    return (
      <div
        className={`rounded-2xl border ${theme.border} bg-slate-950/70 p-10 text-center space-y-3 font-sans`}
      >
        <RefreshCw className={`w-8 h-8 animate-spin mx-auto ${theme.accentTextSoft}`} />
        <h2 className="text-lg sm:text-xl font-bold text-white">
          Building Lucky 7 Engine and Auditing Steiner Fragmentation
        </h2>
        <p className="text-sm text-slate-400">
          Checking live official draws, computing cross-slip complement bridges, and running out-of-sample hypothesis verification.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center space-y-3 font-sans">
        <p className="text-sm font-semibold text-rose-200">{error || "Failed to load Lucky 7 Engine."}</p>
        <button
          type="button"
          onClick={loadData}
          className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs font-bold cursor-pointer"
        >
          Retry Lucky 7 Engine
        </button>
      </div>
    );
  }

  const audit = data.hypothesisAudit;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. GAME-THEMED HERO HEADER */}
      <div
        className={`rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.cardGlow} p-5 sm:p-6 shadow-xl space-y-4`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wider ${theme.badgeBg}`}
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Lucky 7 Engine</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-300 font-mono">
                Target Draw {data.nextTargetDrawNumber}
              </span>
              <span className="text-xs text-slate-400">
                7 Plays (${data.lucky7TotalCostTT}.00 TTD)
              </span>
              <span className="text-xs text-slate-400">
                {data.totalDrawsAnalyzed.toLocaleString()} official draws analyzed
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {data.gameName} Lucky 7: {data.metrics.contextTitle}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              {data.metrics.contextSubtitle}. Built specifically for {data.gameName}&apos;s exact draw rules and audited out-of-sample against live database history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setExportModalState({
                  title: `${data.gameName} (Lucky 7)`,
                  slips: data.lucky7Plays.map((p) => p.numbers),
                  bonusBalls: data.lucky7Plays
                    .map((p) => p.bonus)
                    .filter((b): b is number => b !== undefined),
                  playLabels:
                    game === "pick4"
                      ? data.lucky7Plays.map((p) => p.roleLabel)
                      : undefined
                });
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm ${theme.primaryBtn}`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print or Export Lucky 7</span>
            </button>

            {isMultiBall && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  const combinedSlips = [
                    ...data.top10SteinerPicks.map((p) => p.numbers),
                    ...data.lucky7Plays.map((p) => p.numbers)
                  ];
                  const combinedBonuses = [
                    ...data.top10SteinerPicks
                      .map((p) => p.bonus)
                      .filter((b): b is number => b !== undefined),
                    ...data.lucky7Plays
                      .map((p) => p.bonus)
                      .filter((b): b is number => b !== undefined)
                  ];
                  setExportModalState({
                    title: `${data.gameName} (Steiner-10 + Lucky 7 = 17 Slips)`,
                    slips: combinedSlips,
                    bonusBalls: combinedBonuses
                  });
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${theme.secondaryBtn}`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Export Combined 17</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyLucky7}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              {copiedId === "lucky7" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy All 7</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Key Defragmentation Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-1">
            <div className="text-slate-400 font-semibold uppercase">Standalone 7-Play Coverage</div>
            <div className={`text-sm font-bold ${theme.accentText}`}>
              {data.metrics.standaloneCoverageNote}
            </div>
            <div className="text-slate-400">
              Covers {data.metrics.coveredNumbersCount} of {data.metrics.totalPoolSize} numbers (at most {data.metrics.internalMaxOverlap} shared internally)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-1">
            <div className="text-slate-400 font-semibold uppercase">
              {isMultiBall ? "New Cross-Slip Pairs Bridged" : "Game-Specific Strategy"}
            </div>
            <div className={`text-sm font-bold ${theme.accentText}`}>
              {isMultiBall
                ? `${data.metrics.newCrossSlipPairsCount} of ${data.metrics.totalLucky7PairsCount} Brand-New Pairs`
                : "7 Non-Overlapping Game Vectors"}
            </div>
            <div className="text-slate-400">
              {isMultiBall
                ? `Steiner-10 + Lucky 7 reaches ${data.metrics.combinedPairCoveragePct}% of all possible pairs`
                : data.metrics.combined17CoverageNote}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-1">
            <div className="text-slate-400 font-semibold uppercase">Combined Synergy</div>
            <div className="text-sm font-bold text-emerald-300">
              {data.metrics.combined17CoverageNote}
            </div>
            <div className="text-slate-400">
              {isMultiBall
                ? `Designed to catch fragmented draws Steiner-10 leaves scattered`
                : `Tailored strictly to ${data.gameName}'s draw structure`}
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE 7 LUCKY 7 PLAYS SHOWCASE */}
      <div className={`rounded-2xl border ${theme.borderStrong} bg-[#0a0f1a] p-5 sm:p-6 space-y-4 shadow-xl`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className={`w-4 h-4 ${theme.accentTextSoft}`} />
              <span>Lucky 7 Defragmented Plays for {data.gameName} (${data.lucky7TotalCostTT}.00 TTD)</span>
            </h3>
            <p className="text-xs text-slate-400">
              {isMultiBall
                ? "Each play pulls numbers from separate Steiner-10 picks to reconnect pairs that were split across different slips."
                : game === "pick4"
                ? "Splices digits across Steiner rows into 2 Exact-Order Straights, 3 Disjoint 24-Way Boxes, and 2 High-Affinity 12-Way Twin Boxes."
                : game === "play-whe"
                ? "7 strictly distinct Chinapoo marks defending every major Play Whe signal without overlapping bets."
                : "7 strictly distinct pockets spread evenly across all 7 zones of the 38-pocket Fast Cash board."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.lucky7Plays.map((play) => (
            <div
              key={play.index}
              className={`p-4 rounded-xl bg-slate-900/75 border ${theme.border} space-y-2.5`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${theme.accentText}`}>
                  Lucky 7 Play #{play.index}
                </span>
                <span className={`px-2 py-0.5 rounded-md border text-xs font-semibold ${theme.badgeBg}`}>
                  {play.roleLabel}
                </span>
              </div>

              {/* Numbers Display */}
              <div className="flex flex-wrap items-center gap-2 py-1">
                {play.numbers.map((n, nIdx) => (
                  <React.Fragment key={nIdx}>
                    <div className="flex flex-col items-center">
                      {game === "pick4" && (
                        <span className="text-xs text-slate-400 font-mono mb-0.5">
                          Pos {nIdx + 1}
                        </span>
                      )}
                      <span
                        className={`w-10 h-10 ${
                          game === "pick4" || game === "fast-cash" ? "rounded-xl" : "rounded-full"
                        } border-2 font-mono font-black text-sm flex items-center justify-center ${theme.ballActive}`}
                      >
                        {formatTrevorBall(game, n)}
                      </span>
                    </div>
                    {game === "pick4" && nIdx < play.numbers.length - 1 && (
                      <span className="text-slate-500 font-mono font-bold mt-4">-</span>
                    )}
                  </React.Fragment>
                ))}

                {game === "play-whe" && (
                  <div className="pl-1">
                    <div className="text-base font-bold text-white">
                      {CHINAPOO_CHART[play.numbers[0]]?.mark || `Mark ${play.numbers[0]}`}
                    </div>
                    <div className="text-xs text-slate-400">
                      Line {((play.numbers[0] - 1) % 9) + 1} on Chinapoo Chart
                    </div>
                  </div>
                )}

                {play.bonus !== undefined && data.bonusName && (
                  <span className="px-2.5 h-10 rounded-full bg-amber-400/20 border border-amber-400 text-amber-200 font-sans font-bold text-xs flex items-center justify-center ml-1">
                    {data.bonusName} {String(play.bonus).padStart(2, "0")}
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span className="leading-relaxed">{play.rationale}</span>
                {play.sourceSteinerRanks.length > 0 && (
                  <span className="font-mono text-slate-300 shrink-0">
                    Steiner: {play.sourceSteinerRanks.map((r) => `#${r}`).join(", ")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. LIVE HYPOTHESIS AUTHENTICITY AUDIT & MATH ADJUSTMENT */}
      <div className="rounded-2xl border border-emerald-500/30 bg-[#0a0f1a] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Live Hypothesis Audit and Mathematical Adjustment</span>
            </h3>
            <p className="text-xs text-slate-400">
              Empirical out-of-sample verification of whether Steiner-10 holds the winning numbers without combining them, plus how Lucky 7 adjusts the math.
            </p>
          </div>
          {audit && audit.drawsAudited > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-bold shrink-0">
              {audit.drawsAudited} Real Draws Audited Out-of-Sample
            </span>
          )}
        </div>

        {/* Verdict Banner */}
        {audit && audit.drawsAudited > 0 && (
          <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/30 space-y-1.5">
            <div className="text-sm font-bold text-emerald-300">{audit.verdictHeadline}</div>
            <p className="text-sm text-slate-200 leading-relaxed">{audit.verdictExplanation}</p>
          </div>
        )}

        {/* 4 Empirical Audit KPI Cards */}
        {audit && audit.drawsAudited > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/75 border border-white/[0.08]">
              <div className="text-slate-400 font-semibold">Steiner-10 Holds All Winners</div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                {audit.steiner10UnionCapturePct}%
              </div>
              <div className="text-slate-400">Across {audit.drawsAudited} real draws</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/75 border border-amber-500/30">
              <div className="text-amber-300 font-semibold">Fragmentation Gap</div>
              <div className="text-lg font-bold font-mono text-amber-200 mt-0.5">
                {audit.fragmentationGapPct}%
              </div>
              <div className="text-slate-400">
                {audit.fragmentationGapCount} draws scattered across slips
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/75 border border-white/[0.08]">
              <div className="text-slate-400 font-semibold">Lucky 7 Standalone (7 Plays)</div>
              <div className={`text-lg font-bold font-mono mt-0.5 ${theme.accentText}`}>
                {audit.lucky7StandalonePrizeRatePct}%
              </div>
              <div className="text-slate-400">
                {audit.lucky7StandalonePrizeHits} of {audit.drawsAudited} draws won prize
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/75 border border-emerald-500/35">
              <div className="text-emerald-300 font-semibold">
                {isMultiBall ? "Combined 17-Slip Capture" : "Draws Rescued by Lucky 7"}
              </div>
              <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">
                {isMultiBall ? `${audit.combined17PrizeRatePct}%` : `${audit.rescuedFragmentedCount} Draws`}
              </div>
              <div className="text-slate-400">
                {isMultiBall
                  ? `Rescued ${audit.rescuedFragmentedCount} Steiner-10 misses (${audit.rescuedFragmentedPct}%)`
                  : `Caught ${audit.rescuedFragmentedPct}% of Steiner-10 misses`}
              </div>
            </div>
          </div>
        )}

        {/* Plain-English Mathematical Diagnosis & Adjustment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.07] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Why Steiner-10 Splits Winning Numbers</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{data.metrics.whySteinerFragments}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.07] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>How Lucky 7 Adjusted the Math</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{data.metrics.mathAdjustmentSummary}</p>
          </div>
        </div>

        {/* Collapsible Steiner-10 Reference Comparison */}
        <div className="rounded-xl border border-white/10 bg-slate-950/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSteinerCompare((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-white/[0.03] transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <span>Compare Source Top 10 Steiner Picks That Lucky 7 Defragmented</span>
            </span>
            {showSteinerCompare ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showSteinerCompare && (
            <div className="p-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {data.top10SteinerPicks.map((p) => (
                <div
                  key={p.rank}
                  className="p-2.5 rounded-lg bg-slate-900/80 border border-white/[0.06] space-y-1.5 text-xs"
                >
                  <div className="font-bold text-slate-400">Steiner #{p.rank}</div>
                  <div className="flex flex-wrap gap-1 font-mono font-bold text-slate-200">
                    {p.numbers.map((n, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-slate-950 border border-white/10"
                      >
                        {formatTrevorBall(game, n)}
                      </span>
                    ))}
                    {p.bonus !== undefined && data.bonusName && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-sans">
                        {data.bonusName} {p.bonus}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Draw-by-Draw Out-of-Sample Audit Table */}
        {audit && audit.recentLog.length > 0 && (
          <div className="overflow-x-auto sleek-scrollbar rounded-xl border border-white/[0.07]">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-slate-950/90 text-slate-400 border-b border-white/10 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Draw</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Actual Result</th>
                  <th className="py-2.5 px-3 text-center">Steiner-10 Best</th>
                  <th className="py-2.5 px-3 text-center">Lucky 7 Best</th>
                  <th className="py-2.5 px-3 text-right">Audit Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {audit.recentLog.map((row) => (
                  <tr
                    key={row.drawNumber}
                    className={row.rescuedFragmentedDraw ? "bg-emerald-950/25" : "hover:bg-white/[0.02]"}
                  >
                    <td className="py-2.5 px-3 font-bold text-white">#{row.drawNumber}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-sans">{row.drawDate}</td>
                    <td className="py-2.5 px-3 text-slate-200">
                      {game === "pick4"
                        ? row.actualNumbers.join("-")
                        : row.actualNumbers.map((n) => formatTrevorBall(game, n)).join(", ")}
                      {row.actualBonus !== undefined && data.bonusName
                        ? ` (${data.bonusName} ${row.actualBonus})`
                        : ""}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={row.steiner10WonPrize ? "text-sky-300 font-bold" : "text-slate-400"}>
                        {row.steiner10BestMatch}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={row.lucky7WonPrize ? "text-emerald-300 font-bold" : "text-slate-400"}>
                        {row.lucky7BestMatch}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                          row.rescuedFragmentedDraw
                            ? "bg-emerald-500/25 border border-emerald-400 text-emerald-200 font-bold"
                            : row.steiner10WonPrize || row.lucky7WonPrize
                            ? "bg-sky-500/15 border border-sky-400/35 text-sky-200"
                            : "bg-slate-900 border border-white/10 text-slate-400"
                        }`}
                      >
                        {row.rescuedFragmentedDraw && <CheckCircle2 className="w-3 h-3" />}
                        <span>{row.outcomeNote}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Honest Fair-Play Notice */}
      <div className="px-4 py-3 rounded-xl bg-slate-900/60 border border-white/[0.07] flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
        <Info className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
        <span>
          Every official NLCB lottery draw is independent and random. No formula can predict which balls fall next. Lucky 7 improves your combinatorial ticket structure by eliminating duplicate pairs internally and bridging the cross-slip gaps left uncovered by Steiner-10.
        </span>
      </div>

      {/* Unified Portaled Print & Export Modal */}
      {exportModalState && (
        <BetSlipExportModal
          isOpen={true}
          onClose={() => setExportModalState(null)}
          gameKey={data.game}
          gameName={exportModalState.title}
          targetDrawNumber={data.nextTargetDrawNumber}
          slips={exportModalState.slips}
          bonusBalls={exportModalState.bonusBalls}
          unitCostTT={data.unitCostTT}
          multiplierIncluded={data.game === "cashpot"}
          playLabels={exportModalState.playLabels}
        />
      )}
    </div>
  );
}
