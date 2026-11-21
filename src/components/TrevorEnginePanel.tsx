"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Crosshair,
  RefreshCw,
  RotateCcw,
  Printer,
  Copy,
  Check,
  Layers,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Target,
  Activity
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from "recharts";
import {
  formatTrevorBall,
  simulateTrevor500Plays,
  TrevorEngineResult,
  TrevorGameKey,
  TrevorSimulationOutput
} from "@/lib/trevor_engine";
import { CHINAPOO_CHART } from "@/lib/playwhe";
import { copyTextToClipboard } from "@/lib/export_helpers";
import { triggerHaptic } from "@/lib/haptics";
import BetSlipExportModal from "@/components/BetSlipExportModal";

interface TrevorEnginePanelProps {
  game: TrevorGameKey;
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
  barWinnerHex: string;
  barPoolHex: string;
  cardGlow: string;
  activeTab: string;
}

const THEME_MAP: Record<TrevorEngineResult["themeColor"], ThemeTokens> = {
  yellow: {
    accentText: "text-yellow-300",
    accentTextSoft: "text-yellow-400",
    border: "border-yellow-500/30",
    borderStrong: "border-yellow-400/60",
    badgeBg: "bg-yellow-500/15 border-yellow-400/40 text-yellow-200",
    primaryBtn: "bg-yellow-500 hover:bg-yellow-400 text-slate-950",
    secondaryBtn: "bg-yellow-500/15 hover:bg-yellow-500/25 border-yellow-400/40 text-yellow-200",
    ballActive: "bg-yellow-400 text-slate-950 border-yellow-200 shadow-[0_0_16px_rgba(250,204,21,0.45)]",
    ballSubtle: "bg-yellow-500/15 border-yellow-400/40 text-yellow-200",
    barWinnerHex: "#facc15",
    barPoolHex: "#334155",
    cardGlow: "from-yellow-950/25 via-slate-950/90 to-slate-950",
    activeTab: "bg-yellow-500 text-slate-950"
  },
  sky: {
    accentText: "text-sky-300",
    accentTextSoft: "text-sky-400",
    border: "border-sky-500/30",
    borderStrong: "border-sky-400/60",
    badgeBg: "bg-sky-500/15 border-sky-400/40 text-sky-200",
    primaryBtn: "bg-sky-500 hover:bg-sky-400 text-slate-950",
    secondaryBtn: "bg-sky-500/15 hover:bg-sky-500/25 border-sky-400/40 text-sky-200",
    ballActive: "bg-sky-400 text-slate-950 border-sky-200 shadow-[0_0_16px_rgba(56,189,248,0.45)]",
    ballSubtle: "bg-sky-500/15 border-sky-400/40 text-sky-200",
    barWinnerHex: "#38bdf8",
    barPoolHex: "#334155",
    cardGlow: "from-sky-950/30 via-slate-950/90 to-slate-950",
    activeTab: "bg-sky-500 text-slate-950"
  },
  emerald: {
    accentText: "text-emerald-300",
    accentTextSoft: "text-emerald-400",
    border: "border-emerald-500/30",
    borderStrong: "border-emerald-400/60",
    badgeBg: "bg-emerald-500/15 border-emerald-400/40 text-emerald-200",
    primaryBtn: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
    secondaryBtn: "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/40 text-emerald-200",
    ballActive: "bg-emerald-400 text-slate-950 border-emerald-200 shadow-[0_0_16px_rgba(52,211,153,0.45)]",
    ballSubtle: "bg-emerald-500/15 border-emerald-400/40 text-emerald-200",
    barWinnerHex: "#34d399",
    barPoolHex: "#334155",
    cardGlow: "from-emerald-950/30 via-slate-950/90 to-slate-950",
    activeTab: "bg-emerald-500 text-slate-950"
  },
  amber: {
    accentText: "text-amber-300",
    accentTextSoft: "text-amber-400",
    border: "border-amber-500/30",
    borderStrong: "border-amber-400/60",
    badgeBg: "bg-amber-500/15 border-amber-400/40 text-amber-200",
    primaryBtn: "bg-amber-500 hover:bg-amber-400 text-slate-950",
    secondaryBtn: "bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-amber-200",
    ballActive: "bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.45)]",
    ballSubtle: "bg-amber-500/15 border-amber-400/40 text-amber-200",
    barWinnerHex: "#fbbf24",
    barPoolHex: "#334155",
    cardGlow: "from-amber-950/25 via-slate-950/90 to-slate-950",
    activeTab: "bg-amber-500 text-slate-950"
  },
  purple: {
    accentText: "text-purple-300",
    accentTextSoft: "text-purple-400",
    border: "border-purple-500/30",
    borderStrong: "border-purple-400/60",
    badgeBg: "bg-purple-500/15 border-purple-400/40 text-purple-200",
    primaryBtn: "bg-purple-500 hover:bg-purple-400 text-slate-950",
    secondaryBtn: "bg-purple-500/15 hover:bg-purple-500/25 border-purple-400/40 text-purple-200",
    ballActive: "bg-purple-400 text-slate-950 border-purple-200 shadow-[0_0_16px_rgba(192,132,252,0.45)]",
    ballSubtle: "bg-purple-500/15 border-purple-400/40 text-purple-200",
    barWinnerHex: "#c084fc",
    barPoolHex: "#334155",
    cardGlow: "from-purple-950/30 via-slate-950/90 to-slate-950",
    activeTab: "bg-purple-500 text-slate-950"
  },
  rose: {
    accentText: "text-rose-300",
    accentTextSoft: "text-rose-400",
    border: "border-rose-500/30",
    borderStrong: "border-rose-400/60",
    badgeBg: "bg-rose-500/15 border-rose-400/40 text-rose-200",
    primaryBtn: "bg-rose-500 hover:bg-rose-400 text-slate-950",
    secondaryBtn: "bg-rose-500/15 hover:bg-rose-500/25 border-rose-400/40 text-rose-200",
    ballActive: "bg-rose-400 text-slate-950 border-rose-200 shadow-[0_0_16px_rgba(251,113,133,0.45)]",
    ballSubtle: "bg-rose-500/15 border-rose-400/40 text-rose-200",
    barWinnerHex: "#fb7185",
    barPoolHex: "#334155",
    cardGlow: "from-rose-950/30 via-slate-950/90 to-slate-950",
    activeTab: "bg-rose-500 text-slate-950"
  }
};

export default function TrevorEnginePanel({ game }: TrevorEnginePanelProps) {
  const [data, setData] = useState<TrevorEngineResult | null>(null);
  const [sim, setSim] = useState<TrevorSimulationOutput | null>(null);
  const [activeSteinerIndices, setActiveSteinerIndices] = useState<number[]>([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9
  ]);
  const [runCounter, setRunCounter] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [portfolioView, setPortfolioView] = useState<5 | 10>(5);
  const [showSamplePlays, setShowSamplePlays] = useState<boolean>(false);
  const [showSteinerDrawer, setShowSteinerDrawer] = useState<boolean>(true);
  const [exportModalState, setExportModalState] = useState<{
    slips: number[][];
    bonusBalls: number[];
    playLabels?: string[];
  } | null>(null);

  const loadTrevorData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/trevor-engine?game=${game}&simulations=500&backtest=true`, {
        cache: "no-store"
      });
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || "Failed to load Trevor Engine data.");
      }
      const result: TrevorEngineResult = json.data;
      setData(result);
      setSim(result.simulation);
      setActiveSteinerIndices(result.top10SteinerPicks.map((_, i) => i));
      setRunCounter(1);
    } catch (err: any) {
      setError(err?.message || "Could not load Trevor Engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrevorData();
    const onSync = () => loadTrevorData();
    window.addEventListener("win_concept_sync_completed", onSync);
    return () => window.removeEventListener("win_concept_sync_completed", onSync);
  }, [game]);

  const handleRun500Again = () => {
    if (!data) return;
    triggerHaptic("medium");
    const freshSeed =
      typeof crypto !== "undefined" && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint32Array(1))[0]
        : Math.floor(Math.random() * 2_000_000_000) + Date.now();
    const nextSim = simulateTrevor500Plays(data.game, data.top10SteinerPicks, {
      totalPlays: 500,
      seed: freshSeed,
      isCustomSeed: true,
      activeIndices: activeSteinerIndices
    });
    setSim(nextSim);
    setRunCounter((c) => c + 1);
  };

  const handleResetDrawSeed = () => {
    if (!data) return;
    triggerHaptic("selection");
    const allIdx = data.top10SteinerPicks.map((_, i) => i);
    setActiveSteinerIndices(allIdx);
    setSim(data.simulation);
    setRunCounter(1);
  };

  const handleToggleSteinerPick = (idx: number) => {
    if (!data) return;
    triggerHaptic("light");
    const exists = activeSteinerIndices.includes(idx);
    // Keep at least 2 Steiner picks active so the 500-play generator always has a full pool
    if (exists && activeSteinerIndices.length <= 2) return;
    const updated = exists
      ? activeSteinerIndices.filter((i) => i !== idx)
      : [...activeSteinerIndices, idx].sort((a, b) => a - b);
    setActiveSteinerIndices(updated);
    const nextSim = simulateTrevor500Plays(data.game, data.top10SteinerPicks, {
      totalPlays: 500,
      seed: (sim?.seedUsed ?? data.simulation.seedUsed) + updated.length * 17,
      isCustomSeed: true,
      activeIndices: updated
    });
    setSim(nextSim);
  };

  const handleSelectSteinerPreset = (count: 5 | 10) => {
    if (!data) return;
    triggerHaptic("selection");
    const indices = data.top10SteinerPicks.slice(0, count).map((_, i) => i);
    setActiveSteinerIndices(indices);
    const nextSim = simulateTrevor500Plays(data.game, data.top10SteinerPicks, {
      totalPlays: 500,
      seed: data.nextTargetDrawNumber * 1009 + 500 + (count === 5 ? 55 : 0),
      isCustomSeed: count !== 10,
      activeIndices: indices
    });
    setSim(nextSim);
  };

  const handleCopy = async (id: string, text: string) => {
    triggerHaptic("success");
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2200);
    }
  };

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

  const chartData = useMemo(() => {
    if (!sim) return [];
    // Show top 20 frequency-ranked numbers on chart for clean readability (all 10 for Pick 4, all 20 for Cash Pot)
    return sim.frequencyRankings.slice(0, 20).map((item) => ({
      name: item.display,
      hits: item.simHits,
      pct: item.simPct,
      steinerCount: item.steinerCount,
      isWinner: item.selectedForWinner,
      sublabel: item.sublabel
    }));
  }, [sim]);

  if (loading && !data) {
    return (
      <div
        className={`rounded-2xl border ${theme.border} bg-slate-950/70 p-10 text-center space-y-3 font-sans`}
      >
        <RefreshCw className={`w-8 h-8 animate-spin mx-auto ${theme.accentTextSoft}`} />
        <h2 className="text-lg sm:text-xl font-bold text-white">
          Running the Trevor Engine (Top 10 Steiner Picks into 500 Random Plays)
        </h2>
        <p className="text-sm text-slate-400">
          Loading live official draws, building the Top 10 non-overlapping Steiner picks, and running 500 random plays to find the most frequent winning combination.
        </p>
      </div>
    );
  }

  if (error || !data || !sim) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center space-y-3 font-sans">
        <p className="text-sm font-semibold text-rose-200">{error || "Failed to load Trevor Engine."}</p>
        <button
          type="button"
          onClick={loadTrevorData}
          className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs font-bold cursor-pointer"
        >
          Retry Trevor Engine
        </button>
      </div>
    );
  }

  const freqByNum = new Map(sim.frequencyRankings.map((r) => [r.number, r]));
  const bonusByNum = new Map(sim.bonusFrequencyRankings.map((r) => [r.number, r]));

  const primaryComboText = (() => {
    if (game === "pick4") {
      return `Trevor Engine ${data.gameName} (Draw ${data.nextTargetDrawNumber}): Straight ${sim.winningNumbers.join(" - ")} | 24-Way Box ${(sim.winningSecondary?.box24 || []).join(" - ")} | 12-Way Twin ${(sim.winningSecondary?.box12 || []).join(" - ")}`;
    }
    if (game === "play-whe") {
      const top1 = sim.winningNumbers[0];
      const top5 = (sim.winningSecondary?.top5 || []).map(
        (m) => `${String(m).padStart(2, "0")} (${CHINAPOO_CHART[m]?.mark || ""})`
      );
      return `Trevor Engine ${data.gameName} (Draw ${data.nextTargetDrawNumber}): #1 Mark ${String(top1).padStart(2, "0")} (${CHINAPOO_CHART[top1]?.mark || ""}) | Top 5: ${top5.join(", ")}`;
    }
    if (game === "fast-cash") {
      const top1 = formatTrevorBall(game, sim.winningNumbers[0]);
      const top5 = (sim.winningSecondary?.top5 || []).map((n) => formatTrevorBall(game, n)).join(", ");
      return `Trevor Engine ${data.gameName} (Draw ${data.nextTargetDrawNumber}): #1 Pocket ${top1} | Top 5: ${top5}`;
    }
    const numsStr = sim.winningNumbers.map((n) => formatTrevorBall(game, n)).join(", ");
    const bonusStr =
      sim.winningBonus !== undefined && data.bonusName
        ? ` | ${data.bonusName}: ${sim.winningBonus}`
        : "";
    return `Trevor Engine ${data.gameName} (Draw ${data.nextTargetDrawNumber}): ${numsStr}${bonusStr}`;
  })();

  const activePortfolioSlips = portfolioView === 5 ? sim.trevorPortfolio5 : sim.trevorPortfolio10;
  const activePortfolioBonuses =
    portfolioView === 5 ? sim.trevorPortfolio5Bonus : sim.trevorPortfolio10Bonus;

  const openPrimaryExport = () => {
    triggerHaptic("selection");
    if (game === "pick4") {
      setExportModalState({
        slips: [
          sim.winningNumbers,
          sim.winningSecondary?.box24 || sim.winningNumbers,
          sim.winningSecondary?.box12 || sim.winningNumbers
        ],
        bonusBalls: [],
        playLabels: [
          "Trevor Primary Straight (Exact Order)",
          "Trevor Top 4 Distinct (24-Way Box)",
          "Trevor Top Pair (12-Way Twin Box)"
        ]
      });
      return;
    }
    if (game === "play-whe" || game === "fast-cash") {
      const top5 = sim.winningSecondary?.top5 || sim.winningNumbers;
      setExportModalState({
        slips: top5.map((n) => [n]),
        bonusBalls: []
      });
      return;
    }
    setExportModalState({
      slips: [sim.winningNumbers],
      bonusBalls: sim.winningBonus !== undefined ? [sim.winningBonus] : []
    });
  };

  const openPortfolioExport = (count: 5 | 10) => {
    triggerHaptic("selection");
    setExportModalState({
      slips: count === 5 ? sim.trevorPortfolio5 : sim.trevorPortfolio10,
      bonusBalls: count === 5 ? sim.trevorPortfolio5Bonus : sim.trevorPortfolio10Bonus
    });
  };

  const portfolioCopyText = () => {
    const header = `THE WIN CONCEPT - TREVOR ENGINE (${data.gameName.toUpperCase()} | ${portfolioView}-Play Set | Draw ${data.nextTargetDrawNumber})`;
    const rows = activePortfolioSlips.map((slip, idx) => {
      if (game === "play-whe") {
        const m = slip[0];
        return `Mark ${String(idx + 1).padStart(2, "0")}: ${String(m).padStart(2, "0")} (${CHINAPOO_CHART[m]?.mark || ""})`;
      }
      if (game === "fast-cash") {
        return `Pick ${String(idx + 1).padStart(2, "0")}: ${formatTrevorBall(game, slip[0])}`;
      }
      if (game === "pick4") {
        return `Set ${String(idx + 1).padStart(2, "0")}: ${slip.join(" - ")}`;
      }
      const b = activePortfolioBonuses[idx];
      const bStr = b !== undefined && data.bonusName ? ` | ${data.bonusName} ${b}` : "";
      return `Slip ${String(idx + 1).padStart(2, "0")}: ${slip.map((n) => formatTrevorBall(game, n)).join(", ")}${bStr}`;
    });
    return [header, "", ...rows].join("\n");
  };

  const wf = data.walkForwardAudit;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. HERO HEADER BANNER (Matches Active Game Theme) */}
      <div
        className={`rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.cardGlow} p-5 sm:p-6 shadow-xl space-y-4`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wider ${theme.badgeBg}`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Trevor Engine</span>
              </span>
              <span className="text-xs text-slate-400">
                Top 10 Steiner Picks into {sim.totalPlays} Random Plays
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-300 font-mono">
                Target Draw {data.nextTargetDrawNumber}
              </span>
              <span className="text-xs text-slate-400">
                {data.totalDrawsAnalyzed.toLocaleString()} official draws loaded
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {data.gameName} Trevor Engine: 500-Play Steiner Frequency Synthesizer
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              Pulls the Top 10 non-overlapping Steiner picks for {data.gameName}, collects their chosen numbers, runs{" "}
              <strong className="text-white">500 random plays</strong> strictly from those chosen numbers, and selects the{" "}
              <strong className="text-white">most frequent numbers</strong> to form your winning combination.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRun500Again}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm ${theme.primaryBtn}`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Run 500 Plays Again (Run {runCounter})</span>
            </button>
            {(sim.isCustomSeed || activeSteinerIndices.length !== 10) && (
              <button
                type="button"
                onClick={handleResetDrawSeed}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Draw Seed</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openPortfolioExport(portfolioView)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${theme.secondaryBtn}`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print or Export</span>
            </button>
          </div>
        </div>

        {/* 3-Stage Pipeline Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-1">
            <div className="text-slate-400 font-semibold uppercase">Step 1: Top 10 Steiner Pool</div>
            <div className={`text-base font-bold font-mono ${theme.accentText}`}>
              {activeSteinerIndices.length} of 10 Steiner Picks Active
            </div>
            <div className="text-slate-400">
              {sim.chosenUniquePool.length} chosen numbers ({sim.chosenSlotCount} weighted slots)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-1">
            <div className="text-slate-400 font-semibold uppercase">Step 2: Random Play Generator</div>
            <div className={`text-base font-bold font-mono ${theme.accentText}`}>
              {sim.totalPlays} Random Plays Completed
            </div>
            <div className="text-slate-400">
              {sim.isCustomSeed ? `Live random run (seed ${sim.seedUsed})` : `Draw-anchored run for Draw ${data.nextTargetDrawNumber}`}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-1">
            <div className="text-slate-400 font-semibold uppercase">Step 3: Winning Combination</div>
            <div className={`text-base font-bold font-mono ${theme.accentText}`}>
              Top Frequency Leader Selected
            </div>
            <div className="text-slate-400">
              Highest hit count across all {sim.totalPlays} generated plays
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY WINNING COMBINATION CARD */}
      <div className={`rounded-2xl border ${theme.borderStrong} bg-[#0a0f1a] p-5 sm:p-6 space-y-4 shadow-xl`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Target className={`w-4 h-4 ${theme.accentTextSoft}`} />
              <h3 className="text-base font-bold text-white">
                Trevor Engine Winning Combination (Most Frequent Across 500 Plays)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Built directly from the highest-frequency numbers produced by the 500-play random generator.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy("primary", primaryComboText)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              {copiedId === "primary" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Combo</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={openPrimaryExport}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${theme.primaryBtn}`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print or Export Primary</span>
            </button>
          </div>
        </div>

        {/* Winning Combination Display — Tailored to Game Format */}
        {game === "pick4" && sim.positionalRankings ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Straight */}
            <div className={`p-4 rounded-xl bg-slate-900/70 border ${theme.border} space-y-3`}>
              <div className="text-xs font-bold uppercase text-purple-300">
                Primary Exact Order (Straight)
              </div>
              <div className="flex items-center justify-center gap-2 py-1">
                {sim.positionalRankings.map((pos) => (
                  <div key={pos.position} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-slate-400 font-semibold">Pos {pos.position}</span>
                    <span
                      className={`w-12 h-12 rounded-xl border-2 font-mono font-black text-xl flex items-center justify-center ${theme.ballActive}`}
                    >
                      {pos.winningDigit}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {pos.winningHits}/500
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 24-Way Box */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-3">
              <div className="text-xs font-bold uppercase text-slate-200">
                Top 4 Distinct Digits (24-Way Box)
              </div>
              <div className="flex items-center justify-center gap-2 py-3">
                {(sim.winningSecondary?.box24 || []).map((d, i) => (
                  <span
                    key={i}
                    className={`w-11 h-11 rounded-xl border font-mono font-bold text-lg flex items-center justify-center ${theme.ballSubtle}`}
                  >
                    {d}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center">
                4 most frequent overall digits across all 500 plays (any order).
              </p>
            </div>

            {/* 12-Way Twin Box */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-3">
              <div className="text-xs font-bold uppercase text-slate-200">
                Top Pair Combination (12-Way Twin Box)
              </div>
              <div className="flex items-center justify-center gap-2 py-3">
                {(sim.winningSecondary?.box12 || []).map((d, i) => (
                  <span
                    key={i}
                    className={`w-11 h-11 rounded-xl border font-mono font-bold text-lg flex items-center justify-center ${theme.ballSubtle}`}
                  >
                    {d}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center">
                Doubles the highest-frequency digit with the next 2 frequency leaders.
              </p>
            </div>
          </div>
        ) : game === "play-whe" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* #1 Mark */}
            <div className={`p-4 rounded-xl bg-slate-900/70 border ${theme.border} space-y-2.5`}>
              <div className="text-xs font-bold uppercase text-amber-300">
                #1 Most Frequent Mark
              </div>
              {(() => {
                const topMark = sim.winningNumbers[0];
                const info = freqByNum.get(topMark);
                return (
                  <div className="flex items-center gap-3.5 pt-1">
                    <span
                      className={`w-14 h-14 rounded-full border-2 font-mono font-black text-2xl flex items-center justify-center shrink-0 ${theme.ballActive}`}
                    >
                      {String(topMark).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="text-base font-bold text-white">
                        {CHINAPOO_CHART[topMark]?.mark || `Mark ${topMark}`}
                      </div>
                      <div className="text-xs text-amber-300 font-mono font-semibold">
                        {info?.simHits || 0} of {sim.totalPlays} plays ({info?.simPct || 0}%)
                      </div>
                      <div className="text-xs text-slate-400">
                        Appeared in {info?.steinerCount || 0} Steiner picks
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Top 3 Trio */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-2.5">
              <div className="text-xs font-bold uppercase text-slate-200">Top 3 Most Frequent Marks</div>
              <div className="grid grid-cols-3 gap-2">
                {(sim.winningSecondary?.top3 || []).map((m) => {
                  const info = freqByNum.get(m);
                  return (
                    <div
                      key={m}
                      className="p-2 rounded-lg bg-slate-950/80 border border-white/5 text-center space-y-0.5"
                    >
                      <div
                        className={`w-9 h-9 mx-auto rounded-full border font-mono font-bold text-sm flex items-center justify-center ${theme.ballSubtle}`}
                      >
                        {String(m).padStart(2, "0")}
                      </div>
                      <div className="text-xs text-white font-semibold truncate">
                        {(CHINAPOO_CHART[m]?.mark || "").split(" ")[0]}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">{info?.simHits}/500</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Marks */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-2.5">
              <div className="text-xs font-bold uppercase text-slate-200">Top 5 Tactical Marks ($5 TTD)</div>
              <div className="flex flex-wrap gap-2">
                {(sim.winningSecondary?.top5 || []).map((m) => {
                  const info = freqByNum.get(m);
                  return (
                    <div
                      key={m}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-white/10 flex items-center gap-1.5 text-xs"
                    >
                      <span className="font-mono font-bold text-amber-300">
                        {String(m).padStart(2, "0")}
                      </span>
                      <span className="text-slate-300">
                        {(CHINAPOO_CHART[m]?.mark || "").split(" ")[0]}
                      </span>
                      <span className="text-slate-500 font-mono">({info?.simHits})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : game === "fast-cash" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl bg-slate-900/70 border ${theme.border} space-y-2`}>
              <div className="text-xs font-bold uppercase text-rose-300">#1 Most Frequent Pocket</div>
              {(() => {
                const topPocket = sim.winningNumbers[0];
                const info = freqByNum.get(topPocket);
                return (
                  <div className="flex items-center gap-3.5 pt-1">
                    <span
                      className={`w-14 h-14 rounded-xl border-2 font-mono font-black text-2xl flex items-center justify-center shrink-0 ${theme.ballActive}`}
                    >
                      {formatTrevorBall(game, topPocket)}
                    </span>
                    <div>
                      <div className="text-base font-bold text-white">
                        Pocket {formatTrevorBall(game, topPocket)}
                      </div>
                      <div className="text-xs text-rose-300 font-mono font-semibold">
                        {info?.simHits || 0} of {sim.totalPlays} plays ({info?.simPct || 0}%)
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-2">
              <div className="text-xs font-bold uppercase text-slate-200">Top 5 Pockets ($5 TTD)</div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(sim.winningSecondary?.top5 || []).map((n) => (
                  <span
                    key={n}
                    className={`w-10 h-10 rounded-lg border font-mono font-bold text-sm flex items-center justify-center ${theme.ballSubtle}`}
                  >
                    {formatTrevorBall(game, n)}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-2">
              <div className="text-xs font-bold uppercase text-slate-200">Top 10 Pockets ($10 TTD)</div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(sim.winningSecondary?.top10 || []).map((n) => (
                  <span
                    key={n}
                    className="px-2 py-1 rounded-md bg-slate-950 border border-white/10 text-rose-200 font-mono font-bold text-xs"
                  >
                    {formatTrevorBall(game, n)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Cash Pot (5/20), Lotto Plus (5/35 + PB), Win For Life (6/28 + CB 1-3) */
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-2">
            {sim.winningNumbers.map((num) => {
              const info = freqByNum.get(num);
              return (
                <div
                  key={num}
                  className="flex flex-col items-center gap-1.5 min-w-[68px] p-2.5 rounded-xl bg-slate-900/70 border border-white/[0.07]"
                >
                  <span
                    className={`w-12 h-12 rounded-full border-2 font-mono font-black text-lg flex items-center justify-center ${theme.ballActive}`}
                  >
                    {formatTrevorBall(game, num)}
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {info?.simHits || 0} / {sim.totalPlays}
                  </span>
                  <span className="text-xs text-slate-400">
                    {info?.simPct || 0}% of plays
                  </span>
                </div>
              );
            })}

            {sim.winningBonus !== undefined && data.bonusName && (() => {
              const bInfo = bonusByNum.get(sim.winningBonus);
              return (
                <div className="flex flex-col items-center gap-1.5 min-w-[96px] p-2.5 rounded-xl bg-amber-950/30 border border-amber-400/45">
                  <span className="px-3 h-12 rounded-full bg-amber-400 text-slate-950 border-2 border-amber-200 font-mono font-black text-lg flex items-center justify-center shadow-[0_0_16px_rgba(251,191,36,0.4)]">
                    {String(sim.winningBonus).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-bold text-amber-300">
                    {data.bonusName}
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    {bInfo?.simHits || 0} / {sim.totalPlays} ({bInfo?.simPct || 0}%)
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* 3. STEP 1: TOP 10 STEINER SOURCE PICKS (INTERACTIVE) */}
      <div className={`rounded-2xl border ${theme.border} bg-[#0a0f1a] p-5 sm:p-6 space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className={`w-4 h-4 ${theme.accentTextSoft}`} />
              <span>Step 1: Top 10 Steiner Picks Feeding the Generator</span>
            </h3>
            <p className="text-xs text-slate-400">
              {data.steinerMeta.sourceNote}. Click any Steiner pick below to include or exclude it from the 500 random plays.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectSteinerPreset(10)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeSteinerIndices.length === 10
                  ? theme.activeTab
                  : "bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
              }`}
            >
              All 10 Picks
            </button>
            <button
              type="button"
              onClick={() => handleSelectSteinerPreset(5)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeSteinerIndices.length === 5 && activeSteinerIndices.every((v, i) => v === i)
                  ? theme.activeTab
                  : "bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
              }`}
            >
              Top 5 Only
            </button>
            <button
              type="button"
              onClick={() => setShowSteinerDrawer((v) => !v)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>{showSteinerDrawer ? "Hide" : "Show"}</span>
              {showSteinerDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {showSteinerDrawer && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {data.top10SteinerPicks.map((pick, idx) => {
              const isSelected = activeSteinerIndices.includes(idx);
              return (
                <button
                  key={pick.rank}
                  type="button"
                  onClick={() => handleToggleSteinerPick(idx)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-2 ${
                    isSelected
                      ? `bg-slate-900/90 ${theme.borderStrong}`
                      : "bg-slate-950/50 border-white/5 opacity-45 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${isSelected ? theme.accentText : "text-slate-500"}`}>
                      Steiner #{pick.rank}
                    </span>
                    <span className="text-slate-400">
                      {isSelected ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {pick.numbers.map((n, nIdx) => (
                      <span
                        key={nIdx}
                        className={`px-1.5 py-0.5 rounded font-mono font-bold text-xs border ${
                          isSelected ? theme.ballSubtle : "bg-slate-900 border-white/5 text-slate-500"
                        }`}
                      >
                        {formatTrevorBall(game, n)}
                      </span>
                    ))}
                    {pick.bonus !== undefined && data.bonusName && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-sans font-bold text-xs">
                        {data.bonusName} {pick.bonus}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Chosen Numbers Pool Summary */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/[0.07] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-200">
              Chosen Numbers Pool ({sim.chosenUniquePool.length} numbers extracted from {activeSteinerIndices.length} Steiner picks)
            </span>
            <span className="text-slate-400">
              Number in parentheses shows how many Steiner picks include that number
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sim.frequencyRankings.map((item) => (
              <span
                key={item.number}
                className={`px-2 py-0.5 rounded-md border font-mono text-xs ${
                  item.selectedForWinner
                    ? `${theme.badgeBg} font-bold`
                    : "bg-slate-900 border-white/10 text-slate-400"
                }`}
              >
                {item.display} ({item.steinerCount})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 4. STEP 2: 500-PLAY RANDOM GENERATOR FREQUENCY CHART & BREAKDOWN */}
      <div className={`rounded-2xl border ${theme.border} bg-[#0a0f1a] p-5 sm:p-6 space-y-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className={`w-4 h-4 ${theme.accentTextSoft}`} />
              <span>Step 2: 500-Play Random Generator Frequency Results</span>
            </h3>
            <p className="text-xs text-slate-400">
              Highlighted bars show the most frequent numbers chosen for your winning combination out of {sim.totalPlays} random plays.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSamplePlays((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-200 font-semibold cursor-pointer self-start sm:self-auto"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{showSamplePlays ? "Hide Sample Plays" : "Inspect Sample of 500 Plays"}</span>
          </button>
        </div>

        {/* Frequency Bar Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 12, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{
                  backgroundColor: "#0b1120",
                  borderColor: "rgba(255,255,255,0.15)",
                  borderRadius: "10px",
                  fontSize: "12px",
                  color: "#f8fafc"
                }}
                formatter={(val: any, _name: any, props: any) => [
                  `${val} of ${sim.totalPlays} plays (${props?.payload?.pct ?? 0}%)`,
                  props?.payload?.isWinner ? "Selected Winner" : "Pool Number"
                ]}
                labelFormatter={(lbl) =>
                  game === "play-whe"
                    ? `Mark ${lbl} (${CHINAPOO_CHART[Number(lbl)]?.mark || ""})`
                    : game === "pick4"
                    ? `Digit ${lbl}`
                    : `Number ${lbl}`
                }
              />
              <Bar dataKey="hits" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.isWinner ? theme.barWinnerHex : theme.barPoolHex}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bonus Ball 500-Play Frequency Breakdown (Lotto Plus 1..10 & Win For Life 1..3) */}
        {sim.bonusFrequencyRankings.length > 0 && data.bonusName && (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/25 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-amber-300">
                {data.bonusName} 500-Play Frequency Ranking (1 to {data.bonusMax})
              </span>
              <span className="text-slate-400">
                Top frequency {data.bonusName}: <strong className="text-amber-200">{sim.winningBonus}</strong>
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2">
              {sim.bonusFrequencyRankings.map((b) => (
                <div
                  key={b.number}
                  className={`p-2 rounded-lg border text-center font-mono text-xs ${
                    b.selectedForWinner
                      ? "bg-amber-400/20 border-amber-400 text-amber-200 font-bold"
                      : "bg-slate-900 border-white/10 text-slate-400"
                  }`}
                >
                  <div className="text-sm font-bold">{b.display}</div>
                  <div>{b.simHits} hits</div>
                  <div className="opacity-80">{b.simPct}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pick 4 Positional 500-Play Matrix */}
        {sim.positionalRankings && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sim.positionalRankings.map((pos) => (
              <div
                key={pos.position}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-purple-500/25 space-y-2"
              >
                <div className="flex items-center justify-between text-xs border-b border-white/10 pb-1.5">
                  <span className="font-bold text-purple-300">Position {pos.position}</span>
                  <span className="font-mono text-white font-bold">
                    Winner: {pos.winningDigit} ({pos.winningHits}/500)
                  </span>
                </div>
                <div className="space-y-1">
                  {pos.digits.slice(0, 5).map((d) => (
                    <div
                      key={d.digit}
                      className="flex items-center justify-between text-xs font-mono"
                    >
                      <span className={d.isWinner ? "text-purple-300 font-bold" : "text-slate-400"}>
                        Digit {d.digit}
                      </span>
                      <span className={d.isWinner ? "text-white font-bold" : "text-slate-400"}>
                        {d.simHits} hits ({d.simPct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expandable 500-Play Sample Inspector */}
        {showSamplePlays && (
          <div className="p-4 rounded-xl bg-slate-950/90 border border-white/10 space-y-3">
            <div className="text-xs text-slate-300 font-semibold">
              First 25 Random Plays out of {sim.totalPlays} Generated Plays (drawn strictly from your active Steiner pool):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 max-h-60 overflow-y-auto pr-1">
              {sim.samplePlays.map((sp) => (
                <div
                  key={sp.playNumber}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/[0.06] flex items-center justify-between text-xs font-mono"
                >
                  <span className="text-slate-500">#{sp.playNumber}</span>
                  <span className="text-slate-200 font-semibold">
                    {sp.numbers.map((n) => formatTrevorBall(game, n)).join(" ")}
                    {sp.bonus !== undefined ? ` + ${sp.bonus}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. STEP 3: MULTI-SLIP TREVOR FREQUENCY PLAY SETS (5-SLIP & 10-SLIP) */}
      <div className={`rounded-2xl border ${theme.border} bg-[#0a0f1a] p-5 sm:p-6 space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white">
              Step 3: Ready-to-Play Trevor Frequency Sets
            </h3>
            <p className="text-xs text-slate-400">
              Slip 1 is your Primary Winning Combination; additional slips expand across the next highest-frequency numbers from the 500 plays.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-900 border border-white/10 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPortfolioView(5)}
                className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                  portfolioView === 5 ? theme.activeTab : "text-slate-400 hover:text-white"
                }`}
              >
                5 Plays (${5 * data.unitCostTT})
              </button>
              <button
                type="button"
                onClick={() => setPortfolioView(10)}
                className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                  portfolioView === 10 ? theme.activeTab : "text-slate-400 hover:text-white"
                }`}
              >
                10 Plays (${10 * data.unitCostTT})
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleCopy("portfolio", portfolioCopyText())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs text-white font-semibold cursor-pointer"
            >
              {copiedId === "portfolio" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Set</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => openPortfolioExport(portfolioView)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${theme.primaryBtn}`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print or Export {portfolioView}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {activePortfolioSlips.map((slip, idx) => {
            const b = activePortfolioBonuses[idx];
            return (
              <div
                key={idx}
                className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                  idx === 0
                    ? `bg-slate-900/95 ${theme.borderStrong}`
                    : "bg-slate-900/60 border-white/[0.07]"
                }`}
              >
                <span className={`font-semibold shrink-0 ${idx === 0 ? theme.accentText : "text-slate-400"}`}>
                  {idx === 0
                    ? "Primary Winner"
                    : game === "play-whe"
                    ? `Mark ${idx + 1}`
                    : game === "fast-cash"
                    ? `Pocket ${idx + 1}`
                    : game === "pick4"
                    ? `Set ${idx + 1}`
                    : `Slip ${String(idx + 1).padStart(2, "0")}`}
                </span>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className="font-mono font-bold text-sm text-white tracking-wider">
                    {game === "pick4"
                      ? slip.join(" - ")
                      : slip.map((n) => formatTrevorBall(game, n)).join("  ")}
                  </span>
                  {game === "play-whe" && (
                    <span className="text-xs text-slate-300">
                      {CHINAPOO_CHART[slip[0]]?.mark || ""}
                    </span>
                  )}
                  {b !== undefined && data.bonusName && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-semibold">
                      {data.bonusName} {b}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. OUT-OF-SAMPLE WALK-FORWARD HISTORICAL VERIFICATION */}
      {wf && wf.drawsAudited > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Historical Backtest ({wf.drawsAudited} Past Draws)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Strict out-of-sample test: for every past draw, the Trevor Engine used only earlier draws, ran 500 random plays, and graded its picks against the real outcome.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/[0.07]">
              <div className="text-slate-400 font-semibold">Primary Combo Prize Rate</div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                {wf.primaryPrizeRatePct}%
              </div>
              <div className="text-slate-400">
                {wf.primaryPrizeHits} of {wf.drawsAudited} draws
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/[0.07]">
              <div className="text-slate-400 font-semibold">5-Play Set Prize Rate</div>
              <div className={`text-lg font-bold font-mono mt-0.5 ${theme.accentText}`}>
                {wf.portfolio5PrizeRatePct}%
              </div>
              <div className="text-slate-400">
                {wf.portfolio5PrizeHits} of {wf.drawsAudited} draws
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/[0.07]">
              <div className="text-slate-400 font-semibold">10-Play Set Prize Rate</div>
              <div className="text-lg font-bold font-mono text-emerald-300 mt-0.5">
                {wf.portfolio10PrizeRatePct}%
              </div>
              <div className="text-slate-400">
                {wf.portfolio10PrizeHits} of {wf.drawsAudited} draws
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/[0.07]">
              <div className="text-slate-400 font-semibold">Avg / Best Primary Match</div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                {wf.avgPrimaryMatches} avg / {wf.bestPrimaryMatch} best
              </div>
              <div className="text-slate-400">Single winning combination</div>
            </div>
          </div>

          {/* Recent Audited Draws Table */}
          <div className="overflow-x-auto sleek-scrollbar rounded-xl border border-white/[0.07]">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-slate-950/90 text-slate-400 border-b border-white/10 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Draw</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Trevor Primary Combo</th>
                  <th className="py-2.5 px-3">Actual Result</th>
                  <th className="py-2.5 px-3 text-right">Verified Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {wf.recentLog.slice(0, 10).map((row) => (
                  <tr key={row.drawNumber} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-bold text-white">#{row.drawNumber}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-sans">{row.drawDate}</td>
                    <td className="py-2.5 px-3 text-slate-200">
                      {game === "pick4"
                        ? row.predictedNumbers.join("-")
                        : row.predictedNumbers.map((n) => formatTrevorBall(game, n)).join(", ")}
                      {row.predictedBonus !== undefined && data.bonusName
                        ? ` (${data.bonusName} ${row.predictedBonus})`
                        : ""}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {game === "pick4"
                        ? row.actualNumbers.join("-")
                        : row.actualNumbers.map((n) => formatTrevorBall(game, n)).join(", ")}
                      {row.actualBonus !== undefined && data.bonusName
                        ? ` (${data.bonusName} ${row.actualBonus})`
                        : ""}
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                          row.primaryWonPrize || row.portfolio10WonPrize
                            ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300"
                            : "bg-slate-900 border border-white/10 text-slate-400"
                        }`}
                      >
                        {(row.primaryWonPrize || row.portfolio10WonPrize) && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        <span>{row.prizeNote}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Honest Fair-Play Notice */}
      <div className="px-4 py-3 rounded-xl bg-slate-900/60 border border-white/[0.07] flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
        <Info className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
        <span>
          Every official NLCB draw is an independent game of chance. The Trevor Engine organizes your play by pulling the Top 10 non-overlapping Steiner picks, running 500 random plays strictly from those numbers, and ranking the most frequent results into clean printable slips.
        </span>
      </div>

      {/* Unified Portaled Print & Export Modal */}
      {exportModalState && (
        <BetSlipExportModal
          isOpen={true}
          onClose={() => setExportModalState(null)}
          gameKey={data.game}
          gameName={`${data.gameName} (Trevor Engine)`}
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
