"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Cpu,
  Crosshair,
  Layers,
  ListOrdered,
  Printer,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp
} from "lucide-react";
import BetSlipExportModal from "@/components/BetSlipExportModal";
import { formatTrevorBall } from "@/lib/trevor_engine";
import { CHINAPOO_CHART } from "@/lib/playwhe";
import type { Lucky7EngineResult, Lucky7GameKey } from "@/lib/lucky7_engine";

interface Lucky7EnginePanelProps {
  game: Lucky7GameKey;
}

interface ThemeStyles {
  border: string;
  borderStrong: string;
  bgTint: string;
  accentText: string;
  accentTextSoft: string;
  badgeBg: string;
  buttonPrimary: string;
  buttonSecondary: string;
  ballActive: string;
  barFill: string;
}

const THEME_MAP: Record<Lucky7EngineResult["themeColor"], ThemeStyles> = {
  yellow: {
    border: "border-yellow-500/30",
    borderStrong: "border-yellow-400/50",
    bgTint: "bg-yellow-500/10",
    accentText: "text-yellow-400",
    accentTextSoft: "text-yellow-300",
    badgeBg: "bg-yellow-500/15 border-yellow-500/35 text-yellow-200",
    buttonPrimary: "bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold",
    buttonSecondary: "bg-yellow-500/15 hover:bg-yellow-500/25 border-yellow-500/35 text-yellow-200",
    ballActive: "bg-yellow-400 text-slate-950 border-yellow-200 shadow-lg shadow-yellow-500/25",
    barFill: "bg-yellow-400"
  },
  sky: {
    border: "border-sky-500/30",
    borderStrong: "border-sky-400/50",
    bgTint: "bg-sky-500/10",
    accentText: "text-sky-400",
    accentTextSoft: "text-sky-300",
    badgeBg: "bg-sky-500/15 border-sky-500/35 text-sky-200",
    buttonPrimary: "bg-sky-500 hover:bg-sky-400 text-white font-bold",
    buttonSecondary: "bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/35 text-sky-200",
    ballActive: "bg-sky-400 text-slate-950 border-sky-200 shadow-lg shadow-sky-500/25",
    barFill: "bg-sky-400"
  },
  emerald: {
    border: "border-emerald-500/30",
    borderStrong: "border-emerald-400/50",
    bgTint: "bg-emerald-500/10",
    accentText: "text-emerald-400",
    accentTextSoft: "text-emerald-300",
    badgeBg: "bg-emerald-500/15 border-emerald-500/35 text-emerald-200",
    buttonPrimary: "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold",
    buttonSecondary: "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35 text-emerald-200",
    ballActive: "bg-emerald-400 text-slate-950 border-emerald-200 shadow-lg shadow-emerald-500/25",
    barFill: "bg-emerald-400"
  },
  amber: {
    border: "border-amber-500/30",
    borderStrong: "border-amber-400/50",
    bgTint: "bg-amber-500/10",
    accentText: "text-amber-400",
    accentTextSoft: "text-amber-300",
    badgeBg: "bg-amber-500/15 border-amber-500/35 text-amber-200",
    buttonPrimary: "bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold",
    buttonSecondary: "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-200",
    ballActive: "bg-amber-400 text-slate-950 border-amber-200 shadow-lg shadow-amber-500/25",
    barFill: "bg-amber-400"
  },
  purple: {
    border: "border-purple-500/30",
    borderStrong: "border-purple-400/50",
    bgTint: "bg-purple-500/10",
    accentText: "text-purple-400",
    accentTextSoft: "text-purple-300",
    badgeBg: "bg-purple-500/15 border-purple-500/35 text-purple-200",
    buttonPrimary: "bg-purple-500 hover:bg-purple-400 text-white font-bold",
    buttonSecondary: "bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/35 text-purple-200",
    ballActive: "bg-purple-400 text-slate-950 border-purple-200 shadow-lg shadow-purple-500/25",
    barFill: "bg-purple-400"
  },
  rose: {
    border: "border-rose-500/30",
    borderStrong: "border-rose-400/50",
    bgTint: "bg-rose-500/10",
    accentText: "text-rose-400",
    accentTextSoft: "text-rose-300",
    badgeBg: "bg-rose-500/15 border-rose-500/35 text-rose-200",
    buttonPrimary: "bg-rose-500 hover:bg-rose-400 text-white font-bold",
    buttonSecondary: "bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/35 text-rose-200",
    ballActive: "bg-rose-400 text-slate-950 border-rose-200 shadow-lg shadow-rose-500/25",
    barFill: "bg-rose-400"
  }
};

const DEFAULT_THEME_BY_GAME: Record<Lucky7GameKey, Lucky7EngineResult["themeColor"]> = {
  cashpot: "yellow",
  "lotto-plus": "sky",
  "win-for-life": "emerald",
  "play-whe": "amber",
  pick4: "purple",
  "fast-cash": "rose"
};

export default function Lucky7EnginePanel({ game }: Lucky7EnginePanelProps) {
  const [data, setData] = useState<Lucky7EngineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showAllPoolNumbers, setShowAllPoolNumbers] = useState(false);
  const [showSteiner10, setShowSteiner10] = useState(false);
  const [bonusMode, setBonusMode] = useState<"top3" | "top1">("top3");
  const [exportModalMode, setExportModalMode] = useState<"lucky7" | "combined17" | null>(null);

  const fetchLucky7 = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lucky7-engine?game=${encodeURIComponent(game)}&audit=true&window=60`, {
        cache: "no-store"
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load Lucky 7 Engine.");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err?.message || "Unable to connect to Lucky 7 Engine.");
    } finally {
      setLoading(false);
    }
  }, [game]);

  useEffect(() => {
    fetchLucky7();
  }, [fetchLucky7]);

  const theme = THEME_MAP[data?.themeColor || DEFAULT_THEME_BY_GAME[game]];

  // Effective plays honoring user's decoupled Powerball / Cash Ball mode (Top 3 3-2-2 vs Lock #1 Most Likely)
  const effectivePlays = useMemo(() => {
    if (!data) return [];
    const top1 = data.decoupledBonus?.topPick;
    return data.lucky7Plays.map((p) => {
      if ((game === "lotto-plus" || game === "win-for-life") && bonusMode === "top1" && top1 !== undefined) {
        return { ...p, bonus: top1 };
      }
      return p;
    });
  }, [data, game, bonusMode]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatSlipLine = (nums: number[], bonus?: number) => {
    const main = nums
      .map((n) => {
        const b = formatTrevorBall(game, n);
        if (game === "play-whe") return `${b} (${CHINAPOO_CHART[n]?.mark || ""})`;
        return b;
      })
      .join(game === "pick4" ? "-" : " - ");
    if (bonus !== undefined && data?.bonusName) {
      return `${main}  |  ${data.bonusName} ${String(bonus).padStart(2, "0")}`;
    }
    return main;
  };

  const exportConfig = useMemo(() => {
    if (!data || !exportModalMode) return null;
    if (exportModalMode === "lucky7") {
      return {
        slips: effectivePlays.map((p) => p.numbers),
        bonusBalls:
          game === "lotto-plus" || game === "win-for-life"
            ? effectivePlays.map((p) => p.bonus || 1)
            : undefined,
        title: `Lucky 7 Engine — ${data.gameName}`
      };
    }
    const combinedSlips = [
      ...data.top10SteinerPicks.map((p) => p.numbers),
      ...effectivePlays.map((p) => p.numbers)
    ];
    const combinedBonus =
      game === "lotto-plus" || game === "win-for-life"
        ? [
            ...data.top10SteinerPicks.map((p) => p.bonus || 1),
            ...effectivePlays.map((p) => p.bonus || 1)
          ]
        : undefined;
    return {
      slips: combinedSlips,
      bonusBalls: combinedBonus,
      title: `Combined Steiner-10 + Lucky 7 (17 Slips) — ${data.gameName}`
    };
  }, [data, effectivePlays, exportModalMode, game]);

  if (loading && !data) {
    return (
      <div className={`rounded-2xl border ${theme.border} bg-[#0a0f1a] p-8 text-center space-y-3`}>
        <div className={`w-10 h-10 rounded-xl ${theme.bgTint} border ${theme.border} flex items-center justify-center mx-auto`}>
          <Cpu className={`w-5 h-5 ${theme.accentText} animate-spin`} />
        </div>
        <div className="text-base font-bold text-white">Running Lucky 7 Number-Theory &amp; Follower Engine...</div>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Listing the Steiner 1 to 10 number pool, calculating live draw-to-draw followers, and auditing Match 4+ and 5+ performance on official draws.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/35 bg-rose-950/20 p-6 text-center space-y-3">
        <div className="text-base font-bold text-rose-300">Could not load Lucky 7 Engine</div>
        <p className="text-sm text-slate-300">{error || "Unexpected empty response."}</p>
        <button
          type="button"
          onClick={fetchLucky7}
          className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const audit = data.hypothesisAudit;
  const isMultiBall = game === "cashpot" || game === "lotto-plus" || game === "win-for-life";
  const displayedPool = showAllPoolNumbers ? data.steinerNumberPool : data.steinerNumberPool.slice(0, 12);
  const fullBallLen = game === "win-for-life" ? 6 : isMultiBall ? 5 : game === "pick4" ? 4 : 1;

  const copyAllLucky7Text = [
    `LUCKY 7 ENGINE v2 — ${data.gameName.toUpperCase()} (Target Draw #${data.nextTargetDrawNumber})`,
    `Method: Steiner 1-10 Pool -> 7 Out-of-the-Box Number-Theory & Follower Plays`,
    ...(data.decoupledBonus && (game === "lotto-plus" || game === "win-for-life")
      ? [
          `${data.decoupledBonus.sequenceRangeLabel}: ${
            bonusMode === "top1"
              ? `Locked #1 Most Likely (${String(data.decoupledBonus.topPick).padStart(2, "0")})`
              : `Top 3 Most Likely (${data.decoupledBonus.topThreePicks.map((b) => String(b).padStart(2, "0")).join(", ")})`
          }`
        ]
      : []),
    "",
    ...effectivePlays.map(
      (p) => `Play #${p.index} [${p.methodName}]: ${formatSlipLine(p.numbers, p.bonus)}`
    )
  ].join("\n");

  return (
    <div className="space-y-5">
      {/* 1. HERO HEADER */}
      <div className={`rounded-2xl border ${theme.borderStrong} bg-gradient-to-br from-[#0c1322] via-[#0a0f1a] to-[#080c15] p-5 sm:p-6 space-y-4 shadow-xl`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${theme.badgeBg}`}>
                <Crosshair className="w-3.5 h-3.5" />
                Lucky 7 Engine
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono">
                Target Draw #{data.nextTargetDrawNumber}
              </span>
              {data.latestDraw && (
                <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono">
                  Last Draw #{data.latestDraw.drawNumber}:{" "}
                  {data.latestDraw.numbers.map((n) => formatTrevorBall(game, n)).join("-")}
                  {data.latestDraw.bonus !== undefined && data.bonusName
                    ? ` | ${data.bonusName} ${String(data.latestDraw.bonus).padStart(2, "0")}`
                    : ""}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {data.gameName}: {data.metrics.contextTitle}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              {data.metrics.contextSubtitle} — verified live across{" "}
              <span className="text-white font-semibold">{data.totalDrawsAnalyzed.toLocaleString()}</span>{" "}
              official draws without Match-3+ spread limits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchLucky7}
              disabled={loading}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${theme.buttonSecondary}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => handleCopy(copyAllLucky7Text, "all")}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${theme.buttonSecondary}`}
            >
              {copiedKey === "all" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === "all" ? "Copied 7 Plays" : "Copy 7 Plays"}
            </button>
            <button
              type="button"
              onClick={() => setExportModalMode("lucky7")}
              className={`px-3.5 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 transition cursor-pointer ${theme.buttonPrimary}`}
            >
              <Printer className="w-3.5 h-3.5" />
              Print or Export Lucky 7
            </button>
            {isMultiBall && (
              <button
                type="button"
                onClick={() => setExportModalMode("combined17")}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                Export Combined 17
              </button>
            )}
          </div>
        </div>

        {/* 3 Key Architecture Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/[0.07] space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Step 1: Listed Steiner Pool
            </div>
            <div className={`text-base font-black ${theme.accentText}`}>
              {data.steinerNumberPool.length} Numbers Listed First
            </div>
            <div className="text-xs text-slate-400">
              Low ({data.metrics.lowRangeLabel}) vs High ({data.metrics.highRangeLabel}) + Next-Draw Followers
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/[0.07] space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Step 2: No Match-3+ Cap
            </div>
            <div className={`text-base font-black ${theme.accentText}`}>
              7 Distinct Number-Theory Plays
            </div>
            <div className="text-xs text-slate-400">
              {data.metrics.standaloneCoverageNote}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/[0.07] space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {data.decoupledBonus ? data.decoupledBonus.sequenceRangeLabel : "Game Structure"}
            </div>
            <div className="text-base font-black text-emerald-400">
              {data.decoupledBonus && (game === "lotto-plus" || game === "win-for-life")
                ? `Most Likely: ${data.decoupledBonus.topThreePicks.map((v) => String(v).padStart(2, "0")).join(", ")}`
                : data.decoupledBonus
                ? "1 to 20 Pure Main (Multiplier Separate)"
                : "7 Non-Duplicate Sets ($7.00 TTD)"}
            </div>
            <div className="text-xs text-slate-400">
              {data.decoupledBonus
                ? "Analyzed independently from the main sequence"
                : data.metrics.combined17CoverageNote}
            </div>
          </div>
        </div>
      </div>

      {/* 2. STEP 1: EXPLICIT LISTED STEINER 1-10 NUMBER POOL + WHAT FOLLOWS LAST DRAW */}
      <div className={`rounded-2xl border ${theme.border} bg-[#0a0f1a] p-5 sm:p-6 space-y-4 shadow-xl`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ListOrdered className={`w-4 h-4 ${theme.accentTextSoft}`} />
              <span>Step 1: Numbers Extracted From Steiner Picks #1 to #10</span>
            </h3>
            <p className="text-xs text-slate-400">
              Ranked by Steiner pick strength, what historically follows the last draw, and overdue balance before building any combinations.
            </p>
          </div>
          {data.steinerNumberPool.length > 12 && (
            <button
              type="button"
              onClick={() => setShowAllPoolNumbers((v) => !v)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0 ${theme.buttonSecondary}`}
            >
              {showAllPoolNumbers ? (
                <>
                  Show Top 12 <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Show All {data.steinerNumberPool.length} Listed Numbers <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Listed Steiner Numbers Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {displayedPool.map((item, idx) => (
            <div
              key={item.number}
              className={`p-3 rounded-xl bg-slate-900/75 border ${
                idx < 6 ? theme.borderStrong : "border-white/[0.07]"
              } space-y-1.5`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-8 h-8 shrink-0 ${
                      game === "pick4" || game === "fast-cash" ? "rounded-lg" : "rounded-full"
                    } border font-mono font-black text-xs flex items-center justify-center ${
                      idx < 6 ? theme.ballActive : "bg-slate-800 border-slate-600 text-white"
                    }`}
                  >
                    {formatTrevorBall(game, item.number)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {game === "play-whe" ? CHINAPOO_CHART[item.number]?.mark || item.label : `Rank #${idx + 1}`}
                    </div>
                    <div className="text-xs text-slate-400">
                      {item.zone} / {item.parity}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400 shrink-0">
                  {item.steinerCount}/10
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {item.isPrime && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
                    Prime
                  </span>
                )}
                {item.isFibonacci && (
                  <span className="px-1.5 py-0.5 rounded bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold">
                    Fib
                  </span>
                )}
                {item.followsLastCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                    {item.topTriggerNote}
                  </span>
                )}
              </div>

              {item.topPartnerNumber !== null && (
                <div className="text-xs text-slate-400 pt-0.5 border-t border-white/[0.05]">
                  {isMultiBall ? "Plays with" : "Followed by"}{" "}
                  <span className="text-slate-200 font-mono font-bold">
                    {formatTrevorBall(game, item.topPartnerNumber)}
                  </span>{" "}
                  ({item.topPartnerCount}x)
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Live "What Follows Last Draw" Strip */}
        {data.whatFollowsLastDraw.length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-950/75 border border-white/[0.08] space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <TrendingUp className={`w-3.5 h-3.5 ${theme.accentTextSoft}`} />
              <span>What Historically Follows Last Draw #{data.latestDraw?.drawNumber}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.whatFollowsLastDraw.map((link) => (
                <div
                  key={link.fromNumber}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-1.5 text-xs"
                >
                  <span className="text-slate-400">After</span>
                  <span className={`font-mono font-black ${theme.accentText}`}>{link.fromLabel}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  {link.topFollowers.length > 0 ? (
                    link.topFollowers.map((f, fIdx) => (
                      <span key={f.number} className="font-mono text-slate-200">
                        {f.label}
                        <span className="text-slate-500">({f.count})</span>
                        {fIdx < link.topFollowers.length - 1 ? "," : ""}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">Fresh</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. DECOUPLED BONUS / TIMING PANEL (Lotto Plus 1-10, Win For Life 1-3, Cash Pot Multiplier) */}
      {data.decoupledBonus && (
        <div className={`rounded-2xl border ${theme.border} bg-[#0a0f1a] p-5 sm:p-6 space-y-4 shadow-xl`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 ${theme.accentTextSoft}`} />
                <span>{data.decoupledBonus.title}</span>
              </h3>
              <p className="text-xs text-slate-400 max-w-3xl">{data.decoupledBonus.subtitle}</p>
            </div>

            {(game === "lotto-plus" || game === "win-for-life") && (
              <div className="inline-flex rounded-xl bg-slate-900 border border-slate-700 p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setBonusMode("top3")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    bonusMode === "top3" ? theme.buttonPrimary : "text-slate-300 hover:text-white"
                  }`}
                >
                  {game === "lotto-plus" ? "Top 3 Most Likely (3-2-2)" : "All 3 Cash Balls (3-2-2)"}
                </button>
                <button
                  type="button"
                  onClick={() => setBonusMode("top1")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    bonusMode === "top1" ? theme.buttonPrimary : "text-slate-300 hover:text-white"
                  }`}
                >
                  Lock #1 ({String(data.decoupledBonus.topPick).padStart(2, "0")})
                </button>
              </div>
            )}
          </div>

          <div
            className={`grid gap-2 ${
              game === "lotto-plus"
                ? "grid-cols-2 sm:grid-cols-5"
                : game === "win-for-life"
                ? "grid-cols-3"
                : "grid-cols-2 sm:grid-cols-4"
            }`}
          >
            {data.decoupledBonus.rankings.map((r, rIdx) => (
              <div
                key={r.value}
                className={`p-3 rounded-xl border space-y-1 ${
                  r.isTopPick
                    ? "bg-amber-500/12 border-amber-400/50"
                    : "bg-slate-900/65 border-white/[0.07]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono font-black text-base ${
                      r.isTopPick ? "text-amber-300" : "text-white"
                    }`}
                  >
                    {r.label}
                  </span>
                  {r.isTopPick && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-200 text-xs font-bold">
                      #{rIdx + 1} Likely
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-300">
                  Recent: <span className="font-mono font-bold text-white">{r.recentCount}</span> | All:{" "}
                  <span className="font-mono text-slate-300">{r.totalCount}</span>
                </div>
                {game !== "cashpot" && (
                  <div className="text-xs text-slate-400">
                    Follows last: {r.followsLastCount}x | Skip: {r.overdueDraws}
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-300 bg-slate-900/70 border border-white/[0.06] rounded-xl px-3.5 py-2.5">
            {bonusMode === "top1" && (game === "lotto-plus" || game === "win-for-life")
              ? `Locked Mode Active: All 7 plays use the #1 most likely ${data.bonusName} (${String(data.decoupledBonus.topPick).padStart(2, "0")}) while keeping the main combinations strictly decoupled.`
              : data.decoupledBonus.assignmentNote}
          </p>
        </div>
      )}

      {/* 4. STEP 2: THE 7 OUT-OF-THE-BOX LUCKY 7 PLAYS */}
      <div className={`rounded-2xl border ${theme.borderStrong} bg-[#0a0f1a] p-5 sm:p-6 space-y-4 shadow-xl`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className={`w-4 h-4 ${theme.accentTextSoft}`} />
              <span>Step 2: 7 Out-of-the-Box Plays for {data.gameName} (${data.lucky7TotalCostTT}.00 TTD)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Each play applies a different number-theory, High/Low, or follower lens directly to the Steiner pool above — built to chase full winning combinations, not capped at Match 3+.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {effectivePlays.map((play) => (
            <div
              key={play.index}
              className={`p-4 rounded-xl bg-slate-900/75 border ${theme.border} space-y-2.5`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${theme.accentText}`}>
                  Play #{play.index} — {play.methodName}
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

              {/* Number-Theory Structure Badges */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-slate-300">
                  {play.highLowSplit}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-slate-300">
                  {play.oddEvenSplit}
                </span>
                {play.sumTotal !== undefined && (
                  <span className="px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-slate-300 font-mono">
                    Sum {play.sumTotal}
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span className="leading-relaxed">{play.rationale}</span>
                {play.sourceSteinerRanks.length > 0 && (
                  <span className="font-mono text-slate-300 shrink-0">
                    Steiner: {play.sourceSteinerRanks.slice(0, 6).map((r) => `#${r}`).join(", ")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. STEP 3: HIGHER-TIER WALK-FORWARD AUDIT + 7-METHOD LEADERBOARD */}
      {audit && audit.drawsAudited > 0 && (
        <div className={`rounded-2xl border ${theme.border} bg-[#0a0f1a] p-5 sm:p-6 space-y-5 shadow-xl`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className={`w-4 h-4 ${theme.accentTextSoft}`} />
                <span>Higher-Tier Out-of-Sample Audit (Last {audit.drawsAudited} Official Draws)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Strict walk-forward verification measuring Match 3+, Match 4+, Match 5+ / Jackpot, Top-12 Pool Capture, and per-method hits.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-bold shrink-0">
              Best Single Slip: {audit.bestSingleTicketMatch} of {fullBallLen}
            </span>
          </div>

          <div className={`p-4 rounded-xl ${theme.bgTint} border ${theme.border} space-y-1.5`}>
            <div className={`text-sm font-bold ${theme.accentTextSoft}`}>
              {audit.verdictHeadline}
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {audit.verdictExplanation}
            </p>
          </div>

          {/* Higher-Tier Audit Stat Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/75 border border-white/[0.07] space-y-1">
              <div className="text-xs text-slate-400 font-semibold">
                {isMultiBall ? "Lucky 7 Match 4+" : "Steiner Pool Capture"}
              </div>
              <div className="text-xl font-black font-mono text-emerald-400">
                {isMultiBall ? `${audit.lucky7Match4PlusHits} (${audit.lucky7Match4PlusPct}%)` : `${audit.steiner10UnionCapturePct}%`}
              </div>
              <div className="text-xs text-slate-400">
                {isMultiBall
                  ? `Combined 17: ${audit.combined17Match4PlusHits} (${audit.combined17Match4PlusPct}%)`
                  : `All winning numbers in Steiner-10`}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/75 border border-white/[0.07] space-y-1">
              <div className="text-xs text-slate-400 font-semibold">
                {isMultiBall ? "Top-12 Pool 4+ Capture" : "Steiner-10 Prize Rate"}
              </div>
              <div className={`text-xl font-black font-mono ${theme.accentText}`}>
                {isMultiBall ? `${audit.top12Pool4PlusPct}%` : `${audit.steiner10PrizeRatePct}%`}
              </div>
              <div className="text-xs text-slate-400">
                {isMultiBall
                  ? `All ${fullBallLen} inside Top 12: ${audit.top12PoolAllPct}%`
                  : `${audit.steiner10PrizeHits} of ${audit.drawsAudited} draws`}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/75 border border-white/[0.07] space-y-1">
              <div className="text-xs text-slate-400 font-semibold">Lucky 7 Prize Rate</div>
              <div className={`text-xl font-black font-mono ${theme.accentText}`}>
                {audit.lucky7StandalonePrizeRatePct}%
              </div>
              <div className="text-xs text-slate-400">
                {audit.lucky7StandalonePrizeHits} of {audit.drawsAudited} draws (7 plays)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/75 border border-white/[0.07] space-y-1">
              <div className="text-xs text-slate-400 font-semibold">Combined 17-Slip Rate</div>
              <div className="text-xl font-black font-mono text-emerald-400">
                {audit.combined17PrizeRatePct}%
              </div>
              <div className="text-xs text-slate-400">
                {audit.combined17PrizeHits} of {audit.drawsAudited} draws
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/75 border border-white/[0.07] space-y-1 col-span-2 lg:col-span-1">
              <div className="text-xs text-slate-400 font-semibold">
                {audit.decoupledBonusTop3Pct !== undefined
                  ? `${data.bonusName} Top-3 Hit`
                  : "Misses Rescued"}
              </div>
              <div className="text-xl font-black font-mono text-amber-300">
                {audit.decoupledBonusTop3Pct !== undefined
                  ? `${audit.decoupledBonusTop3Pct}%`
                  : `${audit.rescuedFragmentedCount}`}
              </div>
              <div className="text-xs text-slate-400">
                {audit.decoupledBonusTop3Pct !== undefined
                  ? `Exact #1 pick: ${audit.decoupledBonusTop1Pct}%`
                  : `Rescued Steiner-10 misses`}
              </div>
            </div>
          </div>

          {/* 7-Method Live Leaderboard */}
          {audit.methodLeaderboard && audit.methodLeaderboard.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Live Out-of-Sample Performance by Out-of-the-Box Method
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {audit.methodLeaderboard.map((m) => (
                  <div
                    key={m.index}
                    className="p-3 rounded-xl bg-slate-900/65 border border-white/[0.06] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        Play #{m.index}: {m.methodName}
                      </div>
                      <div className="text-xs text-slate-400">
                        Best single slip: <span className="text-slate-200 font-mono">{m.bestMatch}/{fullBallLen}</span>
                        {isMultiBall && m.match4PlusHits > 0 && (
                          <span className="ml-2 text-emerald-300 font-bold">
                            {m.match4PlusHits}x Match 4+
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-mono font-black ${theme.accentText}`}>
                        {m.prizeHits} hits
                      </div>
                      <div className="text-xs text-slate-400 font-mono">{m.hitRatePct}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Why We Adjusted The Math */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Why Match-3+ Caps Held Back Higher Prizes
              </div>
              <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
                {data.metrics.whySteinerFragments}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Lucky 7 v2 Mathematical Adjustment
              </div>
              <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
                {data.metrics.mathAdjustmentSummary}
              </p>
            </div>
          </div>

          {/* Recent Audited Draws Table */}
          {audit.recentLog.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Audited Official Draws (Most Recent First)
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono">
                    <tr>
                      <th className="px-3 py-2.5">Draw</th>
                      <th className="px-3 py-2.5">Official Winning Result</th>
                      <th className="px-3 py-2.5">Steiner-10</th>
                      <th className="px-3 py-2.5">Lucky 7</th>
                      <th className="px-3 py-2.5">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] bg-slate-950/50">
                    {audit.recentLog.map((row) => (
                      <tr key={row.drawNumber} className="hover:bg-slate-900/50">
                        <td className="px-3 py-2 font-mono text-slate-300 whitespace-nowrap">
                          #{row.drawNumber}
                        </td>
                        <td className="px-3 py-2 font-mono text-white whitespace-nowrap">
                          {row.actualNumbers.map((n) => formatTrevorBall(game, n)).join("-")}
                          {row.actualBonus !== undefined && data.bonusName
                            ? ` (${data.bonusName} ${String(row.actualBonus).padStart(2, "0")})`
                            : ""}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-300 whitespace-nowrap">
                          {row.steiner10BestMatch} match
                        </td>
                        <td className="px-3 py-2 font-mono text-white font-bold whitespace-nowrap">
                          {row.lucky7BestMatch} match
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.lucky7Hit4Plus ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/45 text-amber-200 font-bold">
                              {row.outcomeNote}
                            </span>
                          ) : row.rescuedFragmentedDraw ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold">
                              {row.outcomeNote}
                            </span>
                          ) : row.lucky7WonPrize ? (
                            <span className={`px-2 py-0.5 rounded border font-semibold ${theme.badgeBg}`}>
                              {row.outcomeNote}
                            </span>
                          ) : (
                            <span className="text-slate-400">{row.outcomeNote}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. COLLAPSIBLE SOURCE STEINER-10 REFERENCE */}
      <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSteiner10((prev) => !prev)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-900/50 transition cursor-pointer"
        >
          <div className="space-y-0.5">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <span>Source Top 10 Steiner Picks (Pool Input for Step 1)</span>
            </div>
            <div className="text-xs text-slate-400">
              Expand to inspect the original 10 Steiner picks from which Lucky 7 extracted its ranked number pool.
            </div>
          </div>
          {showSteiner10 ? (
            <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
          )}
        </button>

        {showSteiner10 && (
          <div className="px-5 pb-5 pt-1 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {data.top10SteinerPicks.map((pick) => (
              <div
                key={pick.rank}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900/70 border border-white/[0.06] flex items-center justify-between gap-2 text-xs"
              >
                <span className="font-mono text-slate-400 font-bold shrink-0">
                  Steiner #{pick.rank}
                </span>
                <span className="font-mono text-slate-100 font-bold">
                  {formatSlipLine(pick.numbers, pick.bonus)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PRINT & EXPORT MODAL */}
      {exportConfig && (
        <BetSlipExportModal
          isOpen={true}
          onClose={() => setExportModalMode(null)}
          gameKey={game}
          gameName={exportConfig.title}
          targetDrawNumber={data.nextTargetDrawNumber}
          slips={exportConfig.slips}
          bonusBalls={exportConfig.bonusBalls}
          unitCostTT={data.unitCostTT}
          multiplierIncluded={game === "cashpot"}
        />
      )}
    </div>
  );
}
