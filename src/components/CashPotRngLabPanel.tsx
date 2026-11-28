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
  CashPotRngGenome,
  CashPotRngLabOutput,
  RngObjectiveKey
} from "@/lib/cashpot_rng_lab";

const PURE_RANDOM_SLIDERS: CashPotRngGenome = {
  wRecency: 0,
  wOverdue: 0,
  wMarkov: 0,
  wCooccur: 0,
  temperature: 2.0,
  sumParityGuard: 0
};

export default function CashPotRngLabPanel() {
  const [data, setData] = useState<CashPotRngLabOutput | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Interactive tuning state
  const [genome, setGenome] = useState<CashPotRngGenome>({
    wRecency: 0.8,
    wOverdue: 0.6,
    wMarkov: 0.9,
    wCooccur: 0.7,
    temperature: 1.1,
    sumParityGuard: 0.7
  });
  const [slipCount, setSlipCount] = useState<5 | 7 | 10>(7);
  const [testWindow, setTestWindow] = useState<40 | 60 | 80>(60);
  const [objective, setObjective] = useState<RngObjectiveKey>("match3_rate");
  const [antiCrowding, setAntiCrowding] = useState<boolean>(true);
  const [seed, setSeed] = useState<number>(7978);

  // UI toggles
  const [copied, setCopied] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showAuditLog, setShowAuditLog] = useState<boolean>(false);
  const reqIdRef = useRef<number>(0);

  const runSimulation = useCallback(
    async (opts: {
      autoTune: boolean;
      customGenome?: CashPotRngGenome;
      customSlips?: 5 | 7 | 10;
      customWindow?: 40 | 60 | 80;
      customObjective?: RngObjectiveKey;
      customSeed?: number;
      customAntiCrowding?: boolean;
      isInitial?: boolean;
    }) => {
      const thisReqId = ++reqIdRef.current;
      if (opts.isInitial) setLoading(true);
      else setRunning(true);
      setError(null);

      try {
        const res = await fetch("/api/cashpot/rng-lab", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            autoTune: opts.autoTune,
            genome: opts.customGenome ?? genome,
            slipCount: opts.customSlips ?? slipCount,
            testWindow: opts.customWindow ?? testWindow,
            objective: opts.customObjective ?? objective,
            seed: opts.customSeed ?? seed,
            antiCrowding: opts.customAntiCrowding ?? antiCrowding
          })
        });
        const json = await res.json();
        if (thisReqId !== reqIdRef.current) return;
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to run Cash Pot RNG Lab.");
        }
        const out = json.data as CashPotRngLabOutput;
        setData(out);
        setGenome(out.genome);
        setSeed(out.seed);
      } catch (err: any) {
        if (thisReqId !== reqIdRef.current) return;
        setError(err?.message || "Failed to load Cash Pot RNG Lab.");
      } finally {
        if (thisReqId === reqIdRef.current) {
          setLoading(false);
          setRunning(false);
        }
      }
    },
    [genome, slipCount, testWindow, objective, seed, antiCrowding]
  );

  useEffect(() => {
    runSimulation({ autoTune: true, isInitial: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAutoTune = () => {
    triggerHaptic("selection");
    setAntiCrowding(true);
    runSimulation({ autoTune: true, customAntiCrowding: true });
  };

  const handleRunManual = () => {
    triggerHaptic("selection");
    runSimulation({ autoTune: false, customGenome: genome });
  };

  const handleResetPureRandom = () => {
    triggerHaptic("selection");
    setGenome(PURE_RANDOM_SLIDERS);
    setAntiCrowding(false);
    runSimulation({
      autoTune: false,
      customGenome: PURE_RANDOM_SLIDERS,
      customAntiCrowding: false
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
    const lines = [
      `Cash Pot RNG Lab (Draw #${data.nextTargetDrawNumber}, Seed ${data.seed})`,
      `Blind Out-of-Sample: ${data.blindTestMetrics.match3PlusRatePct}% vs ${data.randomBenchmark.expectedMatch3RatePct}% Pure Random (Z = ${data.randomBenchmark.zScoreVsRandom})`,
      ...data.nextDrawSlips.map(
        (s) =>
          `Play #${s.index}: ${s.numbers.map((n) => String(n).padStart(2, "0")).join(" - ")} (Sum ${s.sum}, ${s.oddEvenSplit})`
      )
    ];
    const ok = await copyTextToClipboard(lines.join("\n"));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-yellow-500/25 bg-[#0c1322] p-8 text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-yellow-400 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-white">
          Running Cash Pot Walk-Forward RNG Calibration &amp; Pure Random Benchmark...
        </p>
        <p className="text-xs text-slate-400">
          Testing 80 candidate generator configurations on older draws, then validating blind on unseen recent draws.
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
          className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold cursor-pointer"
        >
          Retry RNG Lab
        </button>
      </div>
    );
  }

  if (!data) return null;

  const isPureRandomActive =
    genome.wRecency === 0 &&
    genome.wOverdue === 0 &&
    genome.wMarkov === 0 &&
    genome.wCooccur === 0 &&
    genome.sumParityGuard === 0;

  const verdictStyle =
    data.overfitDiagnostics.verdictCode === "VERIFIED_LIFT"
      ? "border-emerald-400/45 bg-emerald-950/25 text-emerald-200"
      : data.overfitDiagnostics.verdictCode === "OVERFIT_WARNING"
      ? "border-amber-400/50 bg-amber-950/25 text-amber-200"
      : "border-slate-700 bg-slate-900/70 text-slate-200";

  const sliderConfigs: Array<{
    key: keyof CashPotRngGenome;
    label: string;
    helper: string;
    min: number;
    max: number;
    step: number;
    format: (v: number) => string;
  }> = [
    {
      key: "wRecency",
      label: "Recent Momentum (Last 20 Draws)",
      helper: "Favors balls appearing more often recently",
      min: 0,
      max: 3,
      step: 0.1,
      format: (v) => v.toFixed(1)
    },
    {
      key: "wOverdue",
      label: "Overdue Drought Tension",
      helper: "Boosts balls that have skipped more draws",
      min: 0,
      max: 3,
      step: 0.1,
      format: (v) => v.toFixed(1)
    },
    {
      key: "wMarkov",
      label: "Follows Last Draw (Lag-1)",
      helper: "Weights balls that historically follow the previous draw",
      min: 0,
      max: 3,
      step: 0.1,
      format: (v) => v.toFixed(1)
    },
    {
      key: "wCooccur",
      label: "Pair Co-Occurrence Gravity",
      helper: "Favors balls that frequently appear together with last draw",
      min: 0,
      max: 3,
      step: 0.1,
      format: (v) => v.toFixed(1)
    },
    {
      key: "temperature",
      label: "Randomness Temperature",
      helper: "Lower = sharper top weights; Higher = closer to uniform random",
      min: 0.25,
      max: 4.0,
      step: 0.05,
      format: (v) => v.toFixed(2)
    },
    {
      key: "sumParityGuard",
      label: "Sum (38 to 67) & Balance Filter",
      helper: "Filters out extreme sum totals and 5-0 odd/even or low/high splits",
      min: 0,
      max: 1,
      step: 0.05,
      format: (v) => `${Math.round(v * 100)}%`
    }
  ];

  const maxBallProb = Math.max(...data.ballProbabilities.map((b) => b.probabilityPct), 8);

  return (
    <div className="space-y-5">
      {/* 1. HERO HEADER + ACTION CONTROLS */}
      <div className="rounded-2xl border border-yellow-500/35 bg-gradient-to-br from-[#0e1526] via-[#0a0f1a] to-[#080c15] p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full border border-yellow-400/40 bg-yellow-500/15 text-yellow-300 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Walk-Forward RNG Lab
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-mono">
                {data.totalDrawsAvailable} Official Draws ({data.calibrationDrawsCount} Train / {data.blindTestDrawsCount} Blind Test)
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
                Target Draw #{data.nextTargetDrawNumber}
              </span>
              {data.nextIsSureCallDay && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                  Sure Call Day (2x to 4x Guaranteed)
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {`Cash Pot: Adaptive Random Generator & Walk-Forward Backtest Lab`}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              Tunes a stochastic 5-of-20 number generator strictly on earlier draws, then tests it blind on the latest {data.blindTestDrawsCount} unseen draws against a pure uniform random generator to expose genuine lift versus historical overfitting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAutoTune}
              disabled={running}
              className="px-3.5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
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
                {isPureRandomActive ? "Pure Uniform Random Mode Active (5.0% Per Ball)" : data.overfitDiagnostics.verdictTitle}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-300">
              {data.wasAutoTuned
                ? `Auto-tuned across ${data.optimizerEvaluations} genomes in ${data.computeMs}ms`
                : `Manual settings evaluated in ${data.computeMs}ms`}
            </span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
            {data.overfitDiagnostics.verdictSummary}
          </p>
        </div>

        {/* TOP KPI BENCHMARK CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-slate-950/80 border border-yellow-500/25 p-3.5 space-y-1">
            <span className="text-xs text-slate-400 block">Blind Out-of-Sample Match 3+</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black font-mono text-yellow-300">
                {data.blindTestMetrics.match3PlusRatePct}%
              </span>
              <span className="text-xs font-mono text-slate-400">
                ({data.blindTestMetrics.match3PlusDraws}/{data.blindTestMetrics.drawsTested})
              </span>
            </div>
            <span className="text-xs text-slate-400 block">
              Pure Random: <strong className="text-slate-200 font-mono">{data.randomBenchmark.expectedMatch3RatePct}%</strong> (
              <span className={data.randomBenchmark.liftPctPoints >= 0 ? "text-emerald-300 font-mono font-bold" : "text-rose-300 font-mono font-bold"}>
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
              Match 4+: <strong className="text-white font-mono">{data.blindTestMetrics.match4PlusDraws}</strong> (Random avg{" "}
              {data.randomBenchmark.expectedMatch4Draws})
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-1">
            <span className="text-xs text-slate-400 block">In-Sample vs Blind Overfit Gap</span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl sm:text-2xl font-black font-mono ${
                  data.overfitDiagnostics.overfitGapPctPoints >= 8
                    ? "text-amber-300"
                    : "text-cyan-300"
                }`}
              >
                {data.overfitDiagnostics.overfitGapPctPoints >= 0 ? "+" : ""}
                {data.overfitDiagnostics.overfitGapPctPoints} pts
              </span>
            </div>
            <span className="text-xs text-slate-400 block">
              Train: <strong className="text-slate-200 font-mono">{data.calibrationMetrics.match3PlusRatePct}%</strong> vs Blind:{" "}
              <strong className="text-slate-200 font-mono">{data.blindTestMetrics.match3PlusRatePct}%</strong>
            </span>
          </div>

          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 space-y-1">
            <span className="text-xs text-slate-400 block">Blind Simulated Net (${data.slipCount * 5}/draw)</span>
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
              Sure Call Days ({data.blindTestMetrics.sureCallDraws}):{" "}
              <strong className="text-emerald-300 font-mono">{data.blindTestMetrics.sureCallWinRatePct}%</strong> win
            </span>
          </div>
        </div>
      </div>

      {/* 2. GENERATED SLIPS FOR NEXT DRAW #N */}
      <div className="rounded-2xl border border-yellow-500/30 bg-[#0c1322] p-5 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Target className="w-4 h-4 text-yellow-400" />
              <h3 className="text-base font-bold text-white">
                {`Generated Slips for Next Cash Pot Draw #${data.nextTargetDrawNumber}`}
              </h3>
              <span className="px-2 py-0.5 rounded bg-yellow-500/15 border border-yellow-400/35 text-yellow-300 text-xs font-mono font-bold">
                {data.slipCount} Slips (${data.slipCount * 5} TTD)
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
                Seed #{data.seed}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Sampled deterministically from the 1-to-20 probabilities below using{" "}
              {data.antiCrowding ? "anti-crowding diversity across slips" : "independent random sampling without anti-crowding"}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShuffleSeed}
              disabled={running}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Shuffle className="w-3.5 h-3.5 text-yellow-300" />
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
              className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-yellow-500/35 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-400 w-14">
                  Play #{slip.index}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {slip.numbers.map((n) => (
                    <span
                      key={n}
                      className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-400/70 text-yellow-200 font-mono font-black text-xs flex items-center justify-center shadow-[0_0_8px_rgba(250,204,21,0.2)]"
                    >
                      {String(n).padStart(2, "0")}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono flex-wrap">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  Sum {slip.sum}
                </span>
                <span>{slip.oddEvenSplit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. INTERACTIVE GENERATOR TUNING DECK + TRAJECTORY CHART */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Sliders Panel */}
        <div className="xl:col-span-6 rounded-2xl border border-slate-800 bg-[#0c1322] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-bold text-white">Generator Controls &amp; Weights</h3>
            </div>
            <button
              type="button"
              onClick={handleRunManual}
              disabled={running}
              className="px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/40 text-yellow-300 text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {running ? "Testing..." : "Apply & Backtest"}
            </button>
          </div>

          {/* Discrete Setup Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold block">Slips Per Draw</label>
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
                        ? "bg-yellow-500 text-slate-950"
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
                {([40, 60, 80] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setTestWindow(w);
                      runSimulation({ autoTune: false, customWindow: w });
                    }}
                    className={`flex-1 py-1 rounded text-xs font-mono font-bold cursor-pointer transition ${
                      testWindow === w
                        ? "bg-yellow-500 text-slate-950"
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
                  const nextObj = e.target.value as RngObjectiveKey;
                  setObjective(nextObj);
                  runSimulation({ autoTune: true, customObjective: nextObj });
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-semibold"
              >
                <option value="match3_rate">Match 3+ Hit Rate</option>
                <option value="high_tier">Match 4+ / 5 Focus</option>
                <option value="multiplier_roi">Multiplier Net ROI</option>
              </select>
            </div>
          </div>

          {/* 6 Parametric Sliders */}
          <div className="space-y-3 pt-1">
            {sliderConfigs.map((cfg) => {
              const val = genome[cfg.key];
              return (
                <div key={cfg.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{cfg.label}</span>
                    <span className="font-mono font-bold text-yellow-300">{cfg.format(val)}</span>
                  </div>
                  <input
                    type="range"
                    min={cfg.min}
                    max={cfg.max}
                    step={cfg.step}
                    value={val}
                    onChange={(e) =>
                      setGenome((prev) => ({ ...prev, [cfg.key]: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-yellow-400 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">{cfg.helper}</p>
                </div>
              );
            })}
          </div>

          {/* Anti-Crowding Toggle */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Anti-Crowding Coverage Spread
              </span>
              <span className="text-[11px] text-slate-400">
                Penalizes reusing the exact same balls across slips so all 20 numbers stay active.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !antiCrowding;
                setAntiCrowding(next);
                runSimulation({ autoTune: false, customAntiCrowding: next });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer shrink-0 transition ${
                antiCrowding
                  ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                  : "bg-slate-900 border-slate-700 text-slate-400"
              }`}
            >
              {antiCrowding ? "Enabled" : "Off"}
            </button>
          </div>
        </div>

        {/* Cumulative Trajectory Chart */}
        <div className="xl:col-span-6 rounded-2xl border border-slate-800 bg-[#0c1322] p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-bold text-white">
                Blind Test Prize Trajectory (Tuned Generator vs Pure Random)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Cumulative draws with at least one Match 3+ prize across the latest {data.blindTestDrawsCount} unseen Cash Pot draws.
            </p>
          </div>

          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trajectory} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="tunedHitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#facc15" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#facc15" stopOpacity={0.02} />
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
                  labelFormatter={(lbl) => `Cash Pot Draw #${lbl}`}
                />
                <Area
                  type="monotone"
                  dataKey="tunedCumHits"
                  name="Tuned Generator Prize Draws"
                  stroke="#facc15"
                  strokeWidth={2.5}
                  fill="url(#tunedHitGrad)"
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

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block font-sans text-[11px]">Single-Slip Odds</span>
              <span className="text-white font-bold">{data.randomBenchmark.exactSingleSlipMatch3Pct}% M3+</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block font-sans text-[11px]">Blind Prize Slips</span>
              <span className="text-yellow-300 font-bold">{data.blindTestMetrics.totalPrizeSlips} Winning Slips</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400 block font-sans text-[11px]">Match 5 Jackpots</span>
              <span className="text-emerald-300 font-bold">{data.blindTestMetrics.match5Draws} Hits</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BALL 1-20 SELECTION PROBABILITY HEATMAP */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1322] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-bold text-white">
              {`Next Draw #${data.nextTargetDrawNumber} Ball Selection Probabilities (1 to 20 vs 5.0% Uniform)`}
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Green = above 5.0% pure random baseline; Slate = below baseline
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {data.ballProbabilities.map((b) => {
            const barWidth = Math.min(100, Math.round((b.probabilityPct / maxBallProb) * 100));
            const isBoosted = b.deltaPct > 0.25;
            return (
              <div
                key={b.ball}
                className={`p-2.5 rounded-xl border space-y-1.5 ${
                  isBoosted
                    ? "bg-yellow-500/10 border-yellow-500/35"
                    : "bg-slate-950/70 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-full bg-slate-900 border border-yellow-400/50 text-yellow-200 font-mono font-black text-xs flex items-center justify-center">
                    {String(b.ball).padStart(2, "0")}
                  </span>
                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-white block">{b.probabilityPct.toFixed(1)}%</span>
                    <span
                      className={`text-[11px] ${
                        b.deltaPct > 0 ? "text-emerald-300" : b.deltaPct < 0 ? "text-slate-400" : "text-slate-400"
                      }`}
                    >
                      {b.deltaPct >= 0 ? "+" : ""}
                      {b.deltaPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isBoosted ? "bg-yellow-400" : "bg-slate-600"}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>20d: {b.recentHits20}</span>
                  <span>Skip: {b.drawsSkipped}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. COLLAPSIBLE BLIND WALK-FORWARD AUDIT LOG */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1322] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAuditLog(!showAuditLog)}
          className="w-full px-5 py-4 flex items-center justify-between gap-2 text-left hover:bg-slate-900/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Activity className="w-4 h-4 text-yellow-400" />
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
                  <th className="py-2.5 px-3">Winning Numbers</th>
                  <th className="py-2.5 px-3">Best Generated Slip</th>
                  <th className="py-2.5 px-3 text-center">Match</th>
                  <th className="py-2.5 px-3 text-right">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {data.blindAuditLog.map((row) => {
                  const winSet = new Set(row.actualNumbers);
                  const isWin = row.bestMatch >= 3;
                  return (
                    <tr key={row.drawNumber} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-white font-bold block">#{row.drawNumber}</span>
                        <span className="text-[11px] text-slate-400">
                          {row.drawDate} {row.isSureCallDay ? "(Sure Call)" : ""}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-slate-200 font-bold">
                          {row.actualNumbers.map((n) => String(n).padStart(2, "0")).join("-")}
                        </span>
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px]">
                          {row.multiplier}x
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {row.bestSlip.map((n) => (
                            <span
                              key={n}
                              className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                winSet.has(n)
                                  ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400/40"
                                  : "bg-slate-900 text-slate-400"
                              }`}
                            >
                              {String(n).padStart(2, "0")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            row.bestMatch >= 4
                              ? "bg-yellow-500/25 text-yellow-200 border border-yellow-400/50"
                              : isWin
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                              : "bg-slate-900 text-slate-400"
                          }`}
                        >
                          {row.bestMatch}/5
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                          row.payoutTT > 0 ? "text-emerald-300" : "text-slate-500"
                        }`}
                      >
                        {row.payoutTT > 0 ? `$${row.payoutTT}` : "$0"}
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
          gameKey="cashpot"
          gameName="Cash Pot RNG Lab"
          targetDrawNumber={data.nextTargetDrawNumber}
          slips={data.nextDrawSlips.map((s) => s.numbers)}
          unitCostTT={5}
          multiplierIncluded={true}
          playLabels={data.nextDrawSlips.map((s) => `RNG Lab Play #${s.index} (Sum ${s.sum})`)}
        />
      )}
    </div>
  );
}
