"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Sliders,
  Cpu,
  Target,
  TrendingUp,
  Activity,
  RefreshCw,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shuffle,
  BarChart2
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import BetSlipExportModal from "@/components/BetSlipExportModal";
import { triggerHaptic } from "@/lib/haptics";
import { copyTextToClipboard } from "@/lib/export_helpers";
import type {
  MultiGameRngKey,
  RngWeights,
  UniversalRngLabOutput
} from "@/lib/multi_game_rng_lab";

const THEME_STYLES = {
  sky: {
    borderHero: "border-sky-500/35",
    borderCard: "border-sky-500/30",
    borderKpi: "border-sky-500/25",
    pillBadge: "border-sky-400/40 bg-sky-500/15 text-sky-300",
    primaryBtn: "bg-sky-500 hover:bg-sky-400 text-slate-950",
    softBtn: "bg-sky-500/20 hover:bg-sky-500/30 border-sky-400/40 text-sky-300",
    activeToggle: "bg-sky-500 text-slate-950",
    textAccent: "text-sky-300",
    iconAccent: "text-sky-400",
    sliderAccent: "accent-sky-400",
    ballCircle: "bg-sky-500/20 border-sky-400/70 text-sky-100",
    hoverSlip: "hover:border-sky-500/40",
    heatActive: "bg-sky-500/12 border-sky-500/35",
    heatBar: "bg-sky-400",
    heatCircle: "border-sky-400/50 text-sky-200",
    strokeHex: "#38bdf8",
    bonusPill: "bg-red-600/90 border-red-400/60 text-white"
  },
  emerald: {
    borderHero: "border-emerald-500/35",
    borderCard: "border-emerald-500/30",
    borderKpi: "border-emerald-500/25",
    pillBadge: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300",
    primaryBtn: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
    softBtn: "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/40 text-emerald-300",
    activeToggle: "bg-emerald-500 text-slate-950",
    textAccent: "text-emerald-300",
    iconAccent: "text-emerald-400",
    sliderAccent: "accent-emerald-400",
    ballCircle: "bg-emerald-500/20 border-emerald-400/70 text-emerald-100",
    hoverSlip: "hover:border-emerald-500/40",
    heatActive: "bg-emerald-500/12 border-emerald-500/35",
    heatBar: "bg-emerald-400",
    heatCircle: "border-emerald-400/50 text-emerald-200",
    strokeHex: "#34d399",
    bonusPill: "bg-amber-500/90 border-amber-300 text-slate-950"
  },
  amber: {
    borderHero: "border-amber-500/35",
    borderCard: "border-amber-500/30",
    borderKpi: "border-amber-500/25",
    pillBadge: "border-amber-400/40 bg-amber-500/15 text-amber-300",
    primaryBtn: "bg-amber-500 hover:bg-amber-400 text-slate-950",
    softBtn: "bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/40 text-amber-300",
    activeToggle: "bg-amber-500 text-slate-950",
    textAccent: "text-amber-300",
    iconAccent: "text-amber-400",
    sliderAccent: "accent-amber-400",
    ballCircle: "bg-amber-500/20 border-amber-400/70 text-amber-100",
    hoverSlip: "hover:border-amber-500/40",
    heatActive: "bg-amber-500/12 border-amber-500/35",
    heatBar: "bg-amber-400",
    heatCircle: "border-amber-400/50 text-amber-200",
    strokeHex: "#fbbf24",
    bonusPill: "bg-amber-500/20 border-amber-400/50 text-amber-200"
  },
  purple: {
    borderHero: "border-purple-500/35",
    borderCard: "border-purple-500/30",
    borderKpi: "border-purple-500/25",
    pillBadge: "border-purple-400/40 bg-purple-500/15 text-purple-300",
    primaryBtn: "bg-purple-500 hover:bg-purple-400 text-slate-950",
    softBtn: "bg-purple-500/20 hover:bg-purple-500/30 border-purple-400/40 text-purple-300",
    activeToggle: "bg-purple-500 text-slate-950",
    textAccent: "text-purple-300",
    iconAccent: "text-purple-400",
    sliderAccent: "accent-purple-400",
    ballCircle: "bg-purple-500/20 border-purple-400/70 text-purple-100",
    hoverSlip: "hover:border-purple-500/40",
    heatActive: "bg-purple-500/12 border-purple-500/35",
    heatBar: "bg-purple-400",
    heatCircle: "border-purple-400/50 text-purple-200",
    strokeHex: "#c084fc",
    bonusPill: "bg-purple-500/20 border-purple-400/50 text-purple-200"
  }
} as const;

function formatSliderValue(val: number, fmt: "decimal1" | "decimal2" | "percent"): string {
  if (fmt === "percent") return `${Math.round(val * 100)}%`;
  if (fmt === "decimal2") return val.toFixed(2);
  return val.toFixed(1);
}

function getGameThemeKey(game: MultiGameRngKey): keyof typeof THEME_STYLES {
  if (game === "lotto-plus") return "sky";
  if (game === "win-for-life") return "emerald";
  if (game === "play-whe") return "amber";
  return "purple";
}

function highlightPick4Multiset(slip: number[], actual: number[]): boolean[] {
  const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const d of actual) if (d >= 0 && d <= 9) counts[d]++;
  return slip.map((d) => {
    if (d >= 0 && d <= 9 && counts[d] > 0) {
      counts[d]--;
      return true;
    }
    return false;
  });
}

export default function UniversalRngLabPanel({ game }: { game: MultiGameRngKey }) {
  const [data, setData] = useState<UniversalRngLabOutput | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [weights, setWeights] = useState<RngWeights>({
    k1: 0.8,
    k2: 0.8,
    k3: 0.8,
    k4: 0.8,
    temperature: 1.15,
    k6: 0.5
  });
  const [slipCount, setSlipCount] = useState<5 | 7 | 10>(7);
  const [testWindow, setTestWindow] = useState<number>(game === "win-for-life" ? 80 : game === "lotto-plus" ? 100 : 200);
  const [objective, setObjective] = useState<string>("");
  const [bonusMode, setBonusMode] = useState<string>("");
  const [guardEnabled, setGuardEnabled] = useState<boolean>(true);
  const [seed, setSeed] = useState<number | undefined>(undefined);

  const [copied, setCopied] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showAuditLog, setShowAuditLog] = useState<boolean>(false);
  const reqIdRef = useRef<number>(0);

  const theme = THEME_STYLES[data?.themeColor || getGameThemeKey(game)];

  const runSimulation = useCallback(
    async (opts: {
      autoTune: boolean;
      customWeights?: RngWeights;
      customSlips?: 5 | 7 | 10;
      customWindow?: number;
      customObjective?: string;
      customBonusMode?: string;
      customGuardEnabled?: boolean;
      customSeed?: number;
      isInitial?: boolean;
    }) => {
      const thisReqId = ++reqIdRef.current;
      if (opts.isInitial) setLoading(true);
      else setRunning(true);
      setError(null);

      try {
        const res = await fetch("/api/rng-lab", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            game,
            autoTune: opts.autoTune,
            weights: opts.customWeights ?? weights,
            slipCount: opts.customSlips ?? slipCount,
            testWindow: opts.customWindow ?? testWindow,
            objective: opts.customObjective ?? (objective || undefined),
            bonusMode: opts.customBonusMode ?? (bonusMode || undefined),
            guardEnabled: opts.customGuardEnabled ?? guardEnabled,
            seed: opts.customSeed !== undefined ? opts.customSeed : seed
          })
        });
        const json = await res.json();
        if (thisReqId !== reqIdRef.current) return;
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to run RNG Lab.");
        }
        const out = json.data as UniversalRngLabOutput;
        setData(out);
        setWeights(out.weights);
        setSlipCount(out.slipCount);
        setTestWindow(out.testWindow);
        setObjective(out.objective);
        setBonusMode(out.bonusMode);
        setGuardEnabled(out.guardEnabled);
        setSeed(out.seed);
      } catch (err: any) {
        if (thisReqId !== reqIdRef.current) return;
        setError(err?.message || "Failed to load RNG Lab.");
      } finally {
        if (thisReqId === reqIdRef.current) {
          setLoading(false);
          setRunning(false);
        }
      }
    },
    [game, weights, slipCount, testWindow, objective, bonusMode, guardEnabled, seed]
  );

  useEffect(() => {
    const defaultWin = game === "win-for-life" ? 80 : game === "lotto-plus" ? 100 : 200;
    setData(null);
    setTestWindow(defaultWin);
    setObjective("");
    setBonusMode("");
    setGuardEnabled(true);
    setSeed(undefined);
    setShowAuditLog(false);
    runSimulation({
      autoTune: true,
      customSlips: 7,
      customWindow: defaultWin,
      customObjective: "",
      customBonusMode: "",
      customGuardEnabled: true,
      customSeed: undefined,
      isInitial: true
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  const handleAutoTune = () => {
    triggerHaptic("selection");
    setGuardEnabled(true);
    runSimulation({ autoTune: true, customGuardEnabled: true });
  };

  const handleRunManual = () => {
    triggerHaptic("selection");
    runSimulation({ autoTune: false, customWeights: weights });
  };

  const handleResetPureRandom = () => {
    if (!data) return;
    triggerHaptic("selection");
    setWeights(data.pureRandomWeights);
    setGuardEnabled(false);
    runSimulation({
      autoTune: false,
      customWeights: data.pureRandomWeights,
      customGuardEnabled: false
    });
  };

  const handleShuffleSeed = () => {
    triggerHaptic("selection");
    const nextSeed = Math.floor(10000 + Math.random() * 89999);
    setSeed(nextSeed);
    runSimulation({ autoTune: false, customSeed: nextSeed });
  };

  const handleCopySlips = async () => {
    if (!data) return;
    triggerHaptic("selection");
    const header = `${data.gameName} RNG Lab (Target Draw #${data.nextTargetDrawNumber}, Seed ${data.seed})`;
    const bench = `Blind Out-of-Sample ${data.metricLabels.primaryShort}: ${data.blindTestMetrics.primaryHitRatePct}% vs ${data.randomBenchmark.expectedPrimaryRatePct}% Pure Random (Z = ${data.randomBenchmark.zScoreVsRandom})`;
    const slipLines = data.nextDrawSlips.map((s) => {
      if (data.game === "play-whe") {
        return `Mark #${s.index}: ${String(s.numbers[0]).padStart(2, "0")} - ${s.markName} (${s.primaryTag})`;
      }
      if (data.game === "pick4") {
        return `Line #${s.index}: ${s.numbers.join(" - ")} | ${s.primaryTag} | ${s.secondaryTag}`;
      }
      const nums = s.numbers.map((n) => String(n).padStart(2, "0")).join(" - ");
      const bonus = s.bonusBall !== undefined && data.bonusName ? ` + ${data.bonusName} ${String(s.bonusBall).padStart(2, "0")}` : "";
      return `Play #${s.index}: ${nums}${bonus} (${s.primaryTag}, ${s.secondaryTag})`;
    });
    const ok = await copyTextToClipboard([header, bench, ...slipLines].join("\n"));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading && !data) {
    return (
      <div className={`rounded-2xl border ${theme.borderCard} bg-[#0c1322] p-8 text-center space-y-3`}>
        <RefreshCw className={`w-6 h-6 ${theme.iconAccent} animate-spin mx-auto`} />
        <p className="text-sm font-semibold text-white">
          Running Walk-Forward RNG Calibration &amp; Pure Random Benchmark...
        </p>
        <p className="text-xs text-slate-400">
          Testing candidate game-specific generator settings on earlier draws, then validating blind on unseen recent draws.
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-center space-y-3">
        <AlertTriangle className="w-6 h-6 text-red-400 mx-auto" />
        <p className="text-sm text-red-200 font-semibold">{error}</p>
        <button
          type="button"
          onClick={() => runSimulation({ autoTune: true, isInitial: true })}
          className={`px-4 py-2 rounded-xl ${theme.primaryBtn} text-xs font-bold cursor-pointer`}
        >
          Retry RNG Lab
        </button>
      </div>
    );
  }

  if (!data) return null;

  const isPureRandomActive =
    weights.k1 === data.pureRandomWeights.k1 &&
    weights.k2 === data.pureRandomWeights.k2 &&
    weights.k3 === data.pureRandomWeights.k3 &&
    weights.k4 === data.pureRandomWeights.k4 &&
    weights.k6 === data.pureRandomWeights.k6 &&
    !guardEnabled;

  const verdictStyle =
    data.overfitDiagnostics.verdictCode === "VERIFIED_LIFT"
      ? "border-emerald-400/45 bg-emerald-950/25 text-emerald-200"
      : data.overfitDiagnostics.verdictCode === "OVERFIT_WARNING"
      ? "border-amber-400/50 bg-amber-950/25 text-amber-200"
      : "border-slate-700 bg-slate-900/70 text-slate-200";

  const maxBallProb = Math.max(...data.ballProbabilities.map((b) => b.probabilityPct), data.uniformBaselinePct * 1.4);

  const heatmapGridCols =
    data.game === "pick4"
      ? "grid-cols-2 sm:grid-cols-5"
      : data.game === "play-whe"
      ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6"
      : "grid-cols-2 sm:grid-cols-5 lg:grid-cols-7";

  const chartGradId = `rngGrad_${data.game}`;

  return (
    <div className="space-y-5 font-sans">
      {/* 1. HERO HEADER + VERDICT + TOP 4 KPI CARDS */}
      <div className={`rounded-2xl border ${theme.borderHero} bg-gradient-to-br from-[#0e1526] via-[#0a0f1a] to-[#080c15] p-5 sm:p-6 space-y-4 shadow-xl`}>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full border ${theme.pillBadge} text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5`}>
                <Sliders className="w-3.5 h-3.5" />
                Walk-Forward RNG Lab
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-mono">
                {data.totalDrawsAvailable} Official Draws ({data.calibrationDrawsCount} Train / {data.blindTestDrawsCount} Blind Test)
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
                Target Draw #{data.nextTargetDrawNumber}
              </span>
              {data.game === "win-for-life" && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold">
                  Cash Ball Strictly 1, 2, or 3
                </span>
              )}
              {data.game === "pick4" && (
                <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-bold">
                  Unordered Box-First + 3+ Right Digits
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {data.heroHeadline}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              {data.heroDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAutoTune}
              disabled={running}
              className={`px-3.5 py-2 rounded-xl ${theme.primaryBtn} text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60`}
            >
              <Cpu className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />
              {running ? "Running..." : "Auto-Tune Generator"}
            </button>
            <button
              type="button"
              onClick={handleResetPureRandom}
              disabled={running}
              className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Pure Random Baseline
            </button>
          </div>
        </div>

        {/* HONEST SCIENTIFIC VERDICT BANNER */}
        <div className={`rounded-xl border p-4 space-y-1.5 ${verdictStyle}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {data.overfitDiagnostics.verdictCode === "VERIFIED_LIFT" ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="text-sm font-bold text-white">
                {isPureRandomActive
                  ? `Pure Uniform Random Mode Active (${data.uniformBaselinePct}% Per Option)`
                  : data.overfitDiagnostics.verdictTitle}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-300">
              {data.wasAutoTuned
                ? `Auto-tuned across ${data.optimizerEvaluations} configs in ${data.computeMs}ms`
                : `Manual settings evaluated in ${data.computeMs}ms`}
            </span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
            {data.overfitDiagnostics.verdictSummary}
          </p>
        </div>

        {/* TOP 4 KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className={`rounded-xl bg-slate-950/80 border ${theme.borderKpi} p-3.5 space-y-1`}>
            <span className="text-xs text-slate-400 block">{data.metricLabels.primaryTitle}</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl sm:text-2xl font-black font-mono ${theme.textAccent}`}>
                {data.blindTestMetrics.primaryHitRatePct}%
              </span>
              <span className="text-xs font-mono text-slate-400">
                ({data.blindTestMetrics.primaryHitDraws}/{data.blindTestMetrics.drawsTested})
              </span>
            </div>
            <span className="text-xs text-slate-400 block">
              Pure Random:{" "}
              <strong className="text-slate-200 font-mono">
                {data.randomBenchmark.expectedPrimaryRatePct}%
              </strong>{" "}
              (
              <span
                className={
                  data.randomBenchmark.liftPctPoints >= 0
                    ? "text-emerald-300 font-mono font-bold"
                    : "text-rose-300 font-mono font-bold"
                }
              >
                {data.randomBenchmark.liftPctPoints >= 0 ? "+" : ""}
                {data.randomBenchmark.liftPctPoints} pts
              </span>
              )
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-1">
            <span className="text-xs text-slate-400 block">Statistical Z-Score vs Random</span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl sm:text-2xl font-black font-mono ${
                  data.randomBenchmark.zScoreVsRandom >= 1.5
                    ? "text-emerald-300"
                    : data.randomBenchmark.zScoreVsRandom <= -1.5
                    ? "text-rose-300"
                    : "text-white"
                }`}
              >
                {data.randomBenchmark.zScoreVsRandom >= 0 ? "+" : ""}
                {data.randomBenchmark.zScoreVsRandom}
              </span>
              <span className="text-xs text-slate-400">SD</span>
            </div>
            <span className="text-xs text-slate-400 block">
              {data.metricLabels.secondaryLabel}:{" "}
              <strong className="text-white font-mono">
                {data.blindTestMetrics.secondaryHitDraws}
              </strong>{" "}
              (Random avg {data.randomBenchmark.expectedSecondaryDraws})
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-1">
            <span className="text-xs text-slate-400 block">In-Sample vs Blind Overfit Gap</span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl sm:text-2xl font-black font-mono ${
                  data.overfitDiagnostics.overfitGapPctPoints >= 6
                    ? "text-amber-300"
                    : "text-cyan-300"
                }`}
              >
                {data.overfitDiagnostics.overfitGapPctPoints >= 0 ? "+" : ""}
                {data.overfitDiagnostics.overfitGapPctPoints} pts
              </span>
            </div>
            <span className="text-xs text-slate-400 block">
              Train:{" "}
              <strong className="text-slate-200 font-mono">
                {data.calibrationMetrics.primaryHitRatePct}%
              </strong>{" "}
              vs Blind:{" "}
              <strong className="text-slate-200 font-mono">
                {data.blindTestMetrics.primaryHitRatePct}%
              </strong>
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-1">
            <span className="text-xs text-slate-400 block">
              Blind Simulated Net (${data.slipCount * data.unitCostTT}/draw)
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl sm:text-2xl font-black font-mono ${
                  data.blindTestMetrics.netProfitTT >= 0 ? "text-emerald-300" : "text-slate-200"
                }`}
              >
                {data.blindTestMetrics.netProfitTT >= 0 ? "+" : "-"}$
                {Math.abs(data.blindTestMetrics.netProfitTT).toLocaleString()}
              </span>
            </div>
            <span className="text-xs text-slate-400 block">
              {data.bonusName ? (
                <>
                  {data.bonusName} Hits:{" "}
                  <strong className="text-emerald-300 font-mono">
                    {data.blindTestMetrics.bonusHitDraws}/{data.blindTestMetrics.drawsTested} (
                    {data.blindTestMetrics.bonusHitRatePct}%)
                  </strong>
                </>
              ) : (
                <>
                  {data.metricLabels.topTierLabel}:{" "}
                  <strong className="text-emerald-300 font-mono">
                    {data.blindTestMetrics.topTierHits}
                  </strong>{" "}
                  (ROI {data.blindTestMetrics.roiPct}%)
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 2. GENERATED SLIPS / MARKS / BOX LINES FOR NEXT DRAW #N */}
      <div className={`rounded-2xl border ${theme.borderCard} bg-[#0c1322] p-5 space-y-4 shadow-lg`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Target className={`w-4 h-4 ${theme.iconAccent}`} />
              <h3 className="text-base font-bold text-white">
                {`Generated ${data.slipUnitLabel} for Next ${data.gameName} Draw #${data.nextTargetDrawNumber}`}
              </h3>
              <span className={`px-2 py-0.5 rounded border ${theme.pillBadge} text-xs font-mono font-bold`}>
                {data.slipCount} {data.slipUnitLabel} (${data.slipCount * data.unitCostTT} TTD)
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
                Seed #{data.seed}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Sampled deterministically from the live probabilities below{" "}
              {data.guardEnabled ? `with ${data.guardLabel} enabled.` : "without structural coverage guard."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShuffleSeed}
              disabled={running}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Shuffle className={`w-3.5 h-3.5 ${theme.iconAccent}`} />
              New Seed
            </button>
            <button
              type="button"
              onClick={handleCopySlips}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setShowExportModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print or Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.nextDrawSlips.map((slip) => (
            <div
              key={slip.index}
              className={`p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 ${theme.hoverSlip} transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5`}
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-400 w-14 shrink-0">
                  {data.game === "play-whe"
                    ? `Mark #${slip.index}`
                    : data.game === "pick4"
                    ? `Line #${slip.index}`
                    : `Play #${slip.index}`}
                </span>

                {data.game === "play-whe" ? (
                  <div className="flex items-center gap-2.5">
                    <span className={`w-9 h-9 rounded-full border ${theme.ballCircle} font-mono font-black text-sm flex items-center justify-center`}>
                      {String(slip.numbers[0]).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-bold text-white">{slip.markName}</span>
                  </div>
                ) : data.game === "pick4" ? (
                  <div className="flex items-center gap-1.5">
                    {slip.numbers.map((d, di) => (
                      <span
                        key={di}
                        className={`w-8 h-8 rounded-lg border ${theme.ballCircle} font-mono font-black text-sm flex items-center justify-center`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {slip.numbers.map((n) => (
                      <span
                        key={n}
                        className={`w-8 h-8 rounded-full border ${theme.ballCircle} font-mono font-black text-xs flex items-center justify-center`}
                      >
                        {String(n).padStart(2, "0")}
                      </span>
                    ))}
                    {slip.bonusBall !== undefined && data.bonusName && (
                      <span
                        className={`px-2 h-8 rounded-full border ${theme.bonusPill} font-mono font-black text-xs inline-flex items-center justify-center gap-1`}
                        title={data.bonusName}
                      >
                        <span className="font-sans text-[10px] font-bold">
                          {data.bonusName}
                        </span>
                        <span>{String(slip.bonusBall).padStart(2, "0")}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono flex-wrap">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200">
                  {slip.primaryTag}
                </span>
                <span>{slip.secondaryTag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. INTERACTIVE GAME-NATIVE TUNING DECK + TRAJECTORY CHART */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-6 rounded-2xl border border-slate-800 bg-[#0c1322] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className={`w-4 h-4 ${theme.iconAccent}`} />
              <h3 className="text-sm font-bold text-white">
                {data.gameName} Controls &amp; Weights
              </h3>
            </div>
            <button
              type="button"
              onClick={handleRunManual}
              disabled={running}
              className={`px-3 py-1.5 rounded-lg border ${theme.softBtn} text-xs font-bold cursor-pointer disabled:opacity-60`}
            >
              {running ? "Testing..." : "Apply & Backtest"}
            </button>
          </div>

          {/* Discrete Setup Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">
                {data.slipUnitLabel} Per Draw
              </label>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
                {([5, 7, 10] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      setSlipCount(cnt);
                      runSimulation({ autoTune: false, customSlips: cnt });
                    }}
                    className={`flex-1 py-1 rounded text-xs font-mono font-bold cursor-pointer transition ${
                      slipCount === cnt
                        ? theme.activeToggle
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">Blind Test Window</label>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
                {data.windowChoices.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setTestWindow(w);
                      runSimulation({ autoTune: false, customWindow: w });
                    }}
                    className={`flex-1 py-1 rounded text-xs font-mono font-bold cursor-pointer transition ${
                      testWindow === w
                        ? theme.activeToggle
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">Auto-Tune Goal</label>
              <select
                value={objective}
                onChange={(e) => {
                  const nextObj = e.target.value;
                  setObjective(nextObj);
                  runSimulation({ autoTune: true, customObjective: nextObj });
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-semibold"
              >
                {data.objectiveChoices.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Decoupled Bonus Mode Selector (Lotto Plus Powerball / Win For Life Cash Ball) */}
          {data.bonusModeChoices.length > 0 && data.bonusName && (
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-semibold text-slate-200 block">
                  Decoupled {data.bonusName} Strategy (1 to {data.bonusMax})
                </span>
                <span className="text-[11px] text-slate-400">
                  Modeled independently from the main ball drum to preserve official odds.
                </span>
              </div>
              <select
                value={bonusMode}
                onChange={(e) => {
                  const nextMode = e.target.value;
                  setBonusMode(nextMode);
                  runSimulation({ autoTune: false, customBonusMode: nextMode });
                }}
                className="py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-semibold shrink-0"
              >
                {data.bonusModeChoices.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 6 Game-Native Parametric Sliders */}
          <div className="space-y-3 pt-1">
            {data.sliderDefs.map((cfg) => {
              const val = weights[cfg.key];
              return (
                <div key={cfg.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-slate-200">{cfg.label}</span>
                    <span className={`font-mono font-bold ${theme.textAccent}`}>
                      {formatSliderValue(val, cfg.format)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={cfg.min}
                    max={cfg.max}
                    step={cfg.step}
                    value={val}
                    onChange={(e) =>
                      setWeights((prev) => ({ ...prev, [cfg.key]: parseFloat(e.target.value) }))
                    }
                    className={`w-full ${theme.sliderAccent} cursor-pointer`}
                  />
                  <p className="text-[11px] text-slate-400">{cfg.helper}</p>
                </div>
              );
            })}
          </div>

          {/* Game-Specific Structural Guard Toggle */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                {data.guardLabel}
              </span>
              <span className="text-[11px] text-slate-400">{data.guardHelper}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !guardEnabled;
                setGuardEnabled(next);
                runSimulation({ autoTune: false, customGuardEnabled: next });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer shrink-0 transition ${
                guardEnabled
                  ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                  : "bg-slate-900 border-slate-700 text-slate-400"
              }`}
            >
              {guardEnabled ? "Enabled" : "Off"}
            </button>
          </div>
        </div>

        {/* Cumulative Trajectory Chart */}
        <div className="xl:col-span-6 rounded-2xl border border-slate-800 bg-[#0c1322] p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className={`w-4 h-4 ${theme.iconAccent}`} />
              <h3 className="text-sm font-bold text-white">
                Blind Test Trajectory (Tuned Generator vs Pure Random)
              </h3>
            </div>
            <p className="text-xs text-slate-400">{data.metricLabels.trajectorySubtitle}</p>
          </div>

          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trajectory} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id={chartGradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.strokeHex} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={theme.strokeHex} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="drawNumber"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(v) => `#${v}`}
                  minTickGap={24}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "10px",
                    fontSize: "12px"
                  }}
                  labelFormatter={(lbl) => `${data.gameName} Draw #${lbl}`}
                />
                <Area
                  type="monotone"
                  dataKey="tunedCumHits"
                  name={`Tuned ${data.metricLabels.primaryShort}`}
                  stroke={theme.strokeHex}
                  strokeWidth={2.5}
                  fill={`url(#${chartGradId})`}
                />
                <Area
                  type="monotone"
                  dataKey="randomExpectedCumHits"
                  name="Pure Random Expected"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block font-sans text-[11px]">Analytical Odds</span>
              <span className="text-white font-bold text-[11px]">{data.metricLabels.singleSlipOddsText}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block font-sans text-[11px]">
                {data.game === "pick4" ? "Blind 4/4 Box Wins" : "Blind Winning Slips"}
              </span>
              <span className={`${theme.textAccent} font-bold`}>
                {data.blindTestMetrics.totalWinningSlips} Wins
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block font-sans text-[11px]">
                {data.metricLabels.topTierLabel}
              </span>
              <span className="text-emerald-300 font-bold">
                {data.blindTestMetrics.topTierHits} Hits
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DECOUPLED BONUS PROBABILITY STRIP (LOTTO PLUS POWERBALL / WFL CASH BALL) */}
      {data.bonusProbabilities && data.bonusProbabilities.length > 0 && data.bonusName && (
        <div className="rounded-2xl border border-slate-800 bg-[#0c1322] p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <Target className={`w-4 h-4 ${theme.iconAccent}`} />
              <h3 className="text-sm font-bold text-white">
                {`Decoupled ${data.bonusName} Probabilities (1 to ${data.bonusMax} vs ${data.bonusProbabilities[0].uniformBaselinePct}% Uniform)`}
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Tracked separately from main balls
            </span>
          </div>
          <div
            className={`grid gap-2.5 ${
              data.bonusMax <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-5 lg:grid-cols-10"
            }`}
          >
            {data.bonusProbabilities.map((bp) => {
              const boosted = bp.probabilityPct > bp.uniformBaselinePct + 0.5;
              return (
                <div
                  key={bp.ball}
                  className={`p-2.5 rounded-xl border text-center space-y-1 ${
                    boosted
                      ? "bg-amber-500/12 border-amber-400/40"
                      : "bg-slate-950/70 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-black border ${theme.bonusPill}`}>
                      {String(bp.ball).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white">
                    {bp.probabilityPct.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Skip {bp.drawsSkipped} | Hits {bp.recentHits}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. FULL SELECTION PROBABILITY HEATMAP */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1322] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className={`w-4 h-4 ${theme.iconAccent}`} />
            <h3 className="text-sm font-bold text-white">{data.metricLabels.heatmapTitle}</h3>
          </div>
          <span className="text-xs text-slate-400">
            Highlighted = above {data.uniformBaselinePct}% pure random baseline
          </span>
        </div>

        <div className={`grid ${heatmapGridCols} gap-2.5`}>
          {data.ballProbabilities.map((b) => {
            const barWidth = Math.min(100, Math.round((b.probabilityPct / maxBallProb) * 100));
            const isBoosted = b.deltaPct > 0.15;
            return (
              <div
                key={b.ball}
                className={`p-2.5 rounded-xl border space-y-1.5 ${
                  isBoosted ? theme.heatActive : "bg-slate-950/70 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-7 h-7 shrink-0 rounded-full bg-slate-900 border ${theme.heatCircle} font-mono font-black text-xs flex items-center justify-center`}
                    >
                      {b.displayLabel}
                    </span>
                    {b.subLabel && (
                      <span className="text-[11px] font-semibold text-slate-200 truncate" title={b.subLabel}>
                        {b.subLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <span className="text-xs font-bold text-white block">
                      {b.probabilityPct.toFixed(1)}%
                    </span>
                    <span
                      className={`text-[10px] ${
                        b.deltaPct > 0 ? "text-emerald-300" : "text-slate-400"
                      }`}
                    >
                      {b.deltaPct >= 0 ? "+" : ""}
                      {b.deltaPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isBoosted ? theme.heatBar : "bg-slate-600"}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>
                    {b.statALabel}: {b.statAVal}
                  </span>
                  <span>
                    {b.statBLabel}: {b.statBVal}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. COLLAPSIBLE BLIND OUT-OF-SAMPLE DRAW-BY-DRAW AUDIT LOG */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1322] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAuditLog(!showAuditLog)}
          className="w-full px-5 py-4 flex items-center justify-between gap-2 text-left hover:bg-slate-900/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Activity className={`w-4 h-4 ${theme.iconAccent}`} />
            <span className="text-sm font-bold text-white">
              Blind Out-of-Sample Draw-by-Draw Audit Log ({data.blindAuditLog.length} Draws)
            </span>
          </div>
          {showAuditLog ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showAuditLog && (
          <div className="border-t border-slate-800 overflow-x-auto max-h-[440px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Draw</th>
                  <th className="py-2.5 px-3">Official Result</th>
                  <th className="py-2.5 px-3">
                    {data.game === "play-whe" ? "Generated Marks" : "Best Generated Slip"}
                  </th>
                  <th className="py-2.5 px-3 text-center">Outcome</th>
                  <th className="py-2.5 px-3 text-right">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {data.blindAuditLog.map((row) => {
                  const winSet = new Set(row.actualNumbers);
                  const pick4MatchMask =
                    data.game === "pick4"
                      ? highlightPick4Multiset(row.bestSlip, row.actualNumbers)
                      : null;

                  return (
                    <tr key={row.drawNumber} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-white font-bold block">#{row.drawNumber}</span>
                        <span className="text-[11px] text-slate-400">
                          {row.drawDate} {row.timeSlot ? `(${row.timeSlot})` : ""}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {data.game === "play-whe" ? (
                          <span className="text-slate-200 font-bold">
                            {String(row.actualNumbers[0]).padStart(2, "0")}{" "}
                            <span className="font-sans text-slate-400 font-normal">
                              {row.actualMarkName}
                            </span>
                          </span>
                        ) : data.game === "pick4" ? (
                          <span className="text-slate-200 font-bold">
                            {row.actualNumbers.join("-")}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-200 font-bold">
                              {row.actualNumbers.map((n) => String(n).padStart(2, "0")).join("-")}
                            </span>
                            {row.actualBonus !== undefined && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${theme.bonusPill}`}>
                                +{String(row.actualBonus).padStart(2, "0")}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          {row.bestSlip.map((n, idx) => {
                            const matched =
                              data.game === "pick4"
                                ? Boolean(pick4MatchMask?.[idx])
                                : winSet.has(n);
                            return (
                              <span
                                key={`${n}-${idx}`}
                                className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                  matched
                                    ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400/40"
                                    : "bg-slate-900 text-slate-400"
                                }`}
                              >
                                {data.game === "pick4" ? n : String(n).padStart(2, "0")}
                              </span>
                            );
                          })}
                          {row.bestSlipBonus !== undefined && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                row.bestSlipBonus === row.actualBonus
                                  ? "bg-amber-500/30 text-amber-200 border border-amber-400/50"
                                  : "bg-slate-900 text-slate-500"
                              }`}
                            >
                              +{String(row.bestSlipBonus).padStart(2, "0")}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            row.highlightTier === "top"
                              ? "bg-yellow-500/25 text-yellow-200 border border-yellow-400/50"
                              : row.highlightTier === "win"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                              : row.highlightTier === "near"
                              ? "bg-sky-500/15 text-sky-300 border border-sky-400/30"
                              : "bg-slate-900 text-slate-400"
                          }`}
                        >
                          {row.matchBadge}
                        </span>
                      </td>

                      <td
                        className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                          row.payoutTT > 0 ? "text-emerald-300" : "text-slate-500"
                        }`}
                      >
                        {row.payoutTT > 0 ? `$${row.payoutTT.toLocaleString()}` : "$0"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BET SLIP EXPORT MODAL */}
      {showExportModal && (
        <BetSlipExportModal
          isOpen={true}
          onClose={() => setShowExportModal(false)}
          gameKey={data.game}
          gameName={`${data.gameName} RNG Lab`}
          targetDrawNumber={data.nextTargetDrawNumber}
          slips={data.nextDrawSlips.map((s) => s.numbers)}
          bonusBalls={
            data.bonusName
              ? data.nextDrawSlips.map((s) => s.bonusBall ?? 1)
              : undefined
          }
          unitCostTT={data.unitCostTT}
          multiplierIncluded={false}
          playLabels={data.nextDrawSlips.map((s) =>
            data.game === "pick4"
              ? s.boxTypeLabel || s.primaryTag
              : data.game === "play-whe"
              ? s.primaryTag
              : `RNG Lab Play #${s.index} (${s.primaryTag})`
          )}
        />
      )}
    </div>
  );
}
