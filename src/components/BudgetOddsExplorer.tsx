"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Layers,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Printer
} from "lucide-react";
import BetSlipExportModal from "@/components/BetSlipExportModal";
import { NLCB_GAME_GUIDE, GameGuideInfo } from "@/lib/game_guide";
import {
  generateOptimalSteinerPortfolio,
  getCashPotSureCallStatus,
  SteinerGameKey
} from "@/lib/steiner_johnson_engine";
import { triggerHaptic } from "@/lib/haptics";

export interface BudgetOddsExplorerProps {
  onSelectGame?: (game: GameGuideInfo["key"]) => void;
  targetDrawNumbers?: Partial<Record<GameGuideInfo["key"], number>>;
}

export default function BudgetOddsExplorer({
  onSelectGame,
  targetDrawNumbers = {}
}: BudgetOddsExplorerProps) {
  const [selectedGameKey, setSelectedGameKey] = useState<GameGuideInfo["key"]>("cashpot");
  const [tierIndexByGame, setTierIndexByGame] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const g of NLCB_GAME_GUIDE) init[g.key] = g.defaultTierIndex;
    return init;
  });
  const [showSlipsDrawer, setShowSlipsDrawer] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [copiedSlips, setCopiedSlips] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const game = useMemo(
    () => NLCB_GAME_GUIDE.find((g) => g.key === selectedGameKey) || NLCB_GAME_GUIDE[0],
    [selectedGameKey]
  );

  const activeTierIdx = Math.min(
    tierIndexByGame[game.key] ?? game.defaultTierIndex,
    game.budgetCurve.length - 1
  );
  const tier = game.budgetCurve[activeTierIdx];

  const zeroReturnPct = Math.max(0, Math.round((100 - tier.anyPrizePct) * 100) / 100);
  const p = tier.anyPrizePct / 100;
  const multi3Pct = Math.round((1 - Math.pow(1 - p, 3)) * 1000) / 10;
  const multi5Pct = Math.round((1 - Math.pow(1 - p, 5)) * 1000) / 10;
  const edgeGain =
    tier.naiveOverlapPct !== undefined && tier.anyPrizePct > tier.naiveOverlapPct
      ? Math.round((tier.anyPrizePct - tier.naiveOverlapPct) * 10) / 10
      : null;

  const sureCall = useMemo(() => {
    if (!mounted || game.key !== "cashpot") return null;
    return getCashPotSureCallStatus();
  }, [mounted, game.key]);

  // Inline Steiner-Johnson zero-overlap slips for supported games & tiers
  const steinerPortfolio = useMemo(() => {
    if (
      !tier.steinerSupported ||
      (game.key !== "cashpot" && game.key !== "lotto-plus" && game.key !== "win-for-life")
    ) {
      return null;
    }
    const validCount = ([5, 10, 15, 20].includes(tier.slips) ? tier.slips : 10) as 5 | 10 | 15 | 20;
    const drawSeed = targetDrawNumbers[game.key] || 7972;
    return generateOptimalSteinerPortfolio(game.key as SteinerGameKey, [], validCount, drawSeed);
  }, [game.key, tier.slips, tier.steinerSupported, targetDrawNumbers]);

  const handleSelectGameTab = (key: GameGuideInfo["key"]) => {
    triggerHaptic("selection");
    setSelectedGameKey(key);
    setShowSlipsDrawer(false);
    setCopiedSlips(false);
  };

  const handleSelectTier = (idx: number) => {
    triggerHaptic("light");
    setTierIndexByGame((prev) => ({ ...prev, [game.key]: idx }));
    setCopiedSlips(false);
  };

  const handleCopySlips = () => {
    if (!steinerPortfolio) return;
    triggerHaptic("success");
    const targetNum = targetDrawNumbers[game.key];
    const header = `${game.name.toUpperCase()} — ${tier.label} ($${tier.costTT} TT) | Steiner-Johnson Zero-Overlap${
      targetNum ? ` | Target Draw #${targetNum}` : ""
    }`;
    const meta = `Exact Any-Prize: ${tier.anyPrizePct}% | Zero-Return Risk: ${zeroReturnPct}% | Jackpot: ${tier.jackpotOdds}`;
    const rows = steinerPortfolio.slips.map((slip, idx) => {
      const nums = slip.map((n) => String(n).padStart(2, "0")).join(" - ");
      const bonus = steinerPortfolio.bonusBalls[idx];
      const bonusTag =
        bonus !== undefined
          ? game.key === "win-for-life"
            ? ` + CB ${bonus}`
            : ` + PB ${bonus}`
          : "";
      return `Slip ${String(idx + 1).padStart(2, "0")}: ${nums}${bonusTag}`;
    });
    navigator.clipboard?.writeText([header, meta, "", ...rows].join("\n")).catch(() => {});
    setCopiedSlips(true);
    setTimeout(() => setCopiedSlips(false), 2200);
  };

  // === PRECISION SVG BUDGET CURVE GEOMETRY ===
  const svgW = 420;
  const svgH = 200;
  const padL = 36;
  const padR = 20;
  const padT = 22;
  const padB = 34;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const points = game.budgetCurve;
  const maxY = Math.max(
    15,
    Math.min(100, Math.ceil((Math.max(...points.map((pt) => pt.anyPrizePct)) + 8) / 20) * 20)
  );
  const yTicks = maxY <= 40 ? [0, 10, 20, 30, 40].filter((v) => v <= maxY) : [0, 25, 50, 75, 100];

  const getX = (idx: number) =>
    points.length <= 1 ? padL + plotW / 2 : padL + (idx / (points.length - 1)) * plotW;
  const getY = (pct: number) => padT + plotH - (Math.min(maxY, Math.max(0, pct)) / maxY) * plotH;

  const optimalLinePath = points
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(pt.anyPrizePct).toFixed(1)}`)
    .join(" ");

  const optimalAreaPath = `${optimalLinePath} L ${getX(points.length - 1).toFixed(1)} ${(padT + plotH).toFixed(
    1
  )} L ${getX(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  const hasBaseline = points.some(
    (pt) => pt.naiveOverlapPct !== undefined && pt.naiveOverlapPct !== pt.anyPrizePct
  );
  const baselinePath = hasBaseline
    ? points
        .map(
          (pt, i) =>
            `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(
              pt.naiveOverlapPct ?? pt.anyPrizePct
            ).toFixed(1)}`
        )
        .join(" ")
    : "";

  return (
    <section
      aria-label="Global Budget Curve & Exact Odds Planner"
      className="relative rounded-2xl bg-[#0a0f1a] border border-white/[0.09] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] overflow-hidden"
    >
      {/* Crisp subtle top specular edge */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Section Header */}
      <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-sky-400 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Exact Odds &amp; Global Budget Planner</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-50 font-sans">
            See Your Exact Odds Before You Spend a Dollar
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-2xl leading-relaxed">
            Select any NLCB game and budget below to see your exact mathematical chance of winning a real prize, your risk of a $0 draw, and your zero-overlap covering slips.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-white/[0.08] text-[11px] font-mono text-slate-300 shrink-0 self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>100% Exact Combinatorics · Zero Fake Stats</span>
        </div>
      </div>

      {/* Step 1: 6-Game Clean Segmented Bar */}
      <div className="px-4 sm:px-6 py-3 bg-slate-950/60 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 overflow-x-auto sleek-scrollbar pb-0.5">
          {NLCB_GAME_GUIDE.map((g) => {
            const isSelected = g.key === game.key;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => handleSelectGameTab(g.key)}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-800/95 border-sky-400/60 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.2)]"
                    : "bg-slate-900/50 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/15"
                }`}
              >
                <img
                  src={g.iconSrc}
                  alt={g.name}
                  className="w-5 h-5 rounded-md object-contain shrink-0"
                />
                <div className="leading-tight">
                  <div className="text-xs font-bold font-sans whitespace-nowrap">{g.shortName}</div>
                  <div className="text-[10px] font-mono text-emerald-400/90 whitespace-nowrap">
                    {g.unitCostTT === 1 ? "From $1" : g.unitCostTT === 2 ? "From $2" : `$${g.unitCostTT}/play`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Step 2: Budget Tier Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400 uppercase tracking-wider font-semibold">
              Choose Your {game.name} Budget
            </span>
            <span className="text-slate-400">{game.schedule}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {points.map((pt, idx) => {
              const active = idx === activeTierIdx;
              return (
                <button
                  key={`${game.key}-${pt.label}`}
                  type="button"
                  onClick={() => handleSelectTier(idx)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? "bg-emerald-500/12 border-emerald-400/70 text-white"
                      : "bg-slate-900/60 border-white/[0.07] text-slate-300 hover:border-white/20 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-xs font-bold font-sans">{pt.label}</span>
                    <span
                      className={`text-xs font-mono font-bold tabular-nums ${
                        active ? "text-emerald-300" : "text-slate-400"
                      }`}
                    >
                      ${pt.costTT}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] font-mono tabular-nums text-slate-400">
                    {pt.anyPrizePct.toFixed(pt.anyPrizePct < 1 ? 2 : 1)}% prize
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Split Metrics + Precision SVG Budget Curve */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Honest Odds Readout */}
          <div className="lg:col-span-6 rounded-xl bg-[#070b14] border border-white/[0.07] p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Hero Probability Split */}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Exact Any-Prize Chance (1 Draw)
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mt-0.5">
                    <span className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums tracking-tight text-emerald-400">
                      {tier.anyPrizePct.toFixed(tier.anyPrizePct < 1 ? 2 : 2)}%
                    </span>
                    {edgeGain !== null && (
                      <span className="text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 whitespace-nowrap">
                        +{edgeGain}% vs overlap
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Chance of $0
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-300">
                    {zeroReturnPct.toFixed(zeroReturnPct > 99 ? 2 : 1)}%
                  </div>
                </div>
              </div>

              {/* Dual-Tone Honest Risk Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-2.5 rounded-full bg-slate-800/90 overflow-hidden flex border border-white/[0.06]">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.max(1.5, Math.min(100, tier.anyPrizePct))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Prize Zone ({tier.anyPrizePct.toFixed(tier.anyPrizePct < 1 ? 2 : 1)}%)</span>
                  <span>No-Prize Zone ({zeroReturnPct.toFixed(1)}%)</span>
                </div>
              </div>

              {/* 3 Structured Micro-Metric Tiles */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-900/70 border border-white/[0.06]">
                  <div className="text-[10px] font-mono uppercase text-slate-500">Total Cost</div>
                  <div className="text-sm font-bold font-mono tabular-nums text-white mt-0.5">
                    ${tier.costTT} TT
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/70 border border-white/[0.06]">
                  <div className="text-[10px] font-mono uppercase text-slate-500 truncate">
                    {tier.tier2Label || "Tier 2"}
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums text-sky-300 mt-0.5">
                    {tier.tier2Pct !== undefined
                      ? `${tier.tier2Pct.toFixed(tier.tier2Pct < 1 ? 2 : 2)}%`
                      : "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/70 border border-white/[0.06]">
                  <div className="text-[10px] font-mono uppercase text-slate-500">Top Odds</div>
                  <div className="text-[11px] sm:text-sm font-bold font-mono tabular-nums text-amber-300 mt-0.5 whitespace-nowrap">
                    {tier.jackpotOdds}
                  </div>
                </div>
              </div>

              {/* Multi-Draw Analytical Horizon Strip */}
              <div className="p-2.5 rounded-lg bg-slate-950/90 border border-white/[0.06] flex items-center justify-between gap-2 text-[11px] font-mono">
                <span className="text-slate-400">Hit ≥1 Prize Over:</span>
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="text-slate-300">
                    1 Draw <strong className="text-white">{tier.anyPrizePct.toFixed(1)}%</strong>
                  </span>
                  <span className="text-slate-300">
                    3 Draws <strong className="text-sky-300">{multi3Pct}%</strong>
                  </span>
                  <span className="text-slate-300">
                    5 Draws <strong className="text-emerald-300">{multi5Pct}%</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Plain-English Rules & Zero-Return Clarity */}
            <div className="pt-3 border-t border-white/[0.06] space-y-1 text-xs font-sans">
              <div className="text-slate-300 leading-snug">
                <span className="font-semibold text-emerald-400">What wins: </span>
                {game.whatWins}
              </div>
              <div className="text-slate-400 leading-snug">
                <span className="font-semibold text-slate-200">Pays $0: </span>
                {game.whatPaysZero}
              </div>
            </div>
          </div>

          {/* Right Column: Precision SVG Global Budget-vs-Odds Curve */}
          <div className="lg:col-span-6 rounded-xl bg-[#070b14] border border-white/[0.07] p-4 sm:p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  {game.name} Global Budget Curve
                </div>
                <div className="text-xs text-slate-500 font-sans">
                  Tap any point on the curve to compare budget vs. exact prize probability
                </div>
              </div>
              {hasBaseline && (
                <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
                    Optimal
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-3 h-0.5 border-t border-dashed border-slate-500 inline-block" />
                    Standard
                  </span>
                </div>
              )}
            </div>

            <div className="w-full">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-auto select-none overflow-visible"
                role="img"
                aria-label={`${game.name} budget versus exact prize probability curve`}
              >
                <defs>
                  <linearGradient id={`curveFill-${game.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines & Y-Axis Labels */}
                {yTicks.map((v) => {
                  const y = getY(v);
                  return (
                    <g key={v}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={svgW - padR}
                        y2={y}
                        stroke="rgba(255,255,255,0.07)"
                        strokeWidth="1"
                      />
                      <text
                        x={padL - 7}
                        y={y + 3.5}
                        textAnchor="end"
                        className="fill-slate-500 text-[9px] font-mono"
                      >
                        {v}%
                      </text>
                    </g>
                  );
                })}

                {/* Active Vertical Crosshair */}
                <line
                  x1={getX(activeTierIdx)}
                  y1={padT}
                  x2={getX(activeTierIdx)}
                  y2={padT + plotH}
                  stroke="rgba(56,189,248,0.35)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />

                {/* Area Under Optimal Curve */}
                <path d={optimalAreaPath} fill={`url(#curveFill-${game.key})`} />

                {/* Standard Overlapping / Unstratified Baseline Curve */}
                {hasBaseline && (
                  <path
                    d={baselinePath}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="1.75"
                    strokeDasharray="4 4"
                  />
                )}

                {/* Optimal Steiner-Johnson Curve */}
                <path
                  d={optimalLinePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Data Nodes */}
                {points.map((pt, idx) => {
                  const cx = getX(idx);
                  const cy = getY(pt.anyPrizePct);
                  const isActive = idx === activeTierIdx;
                  return (
                    <g
                      key={pt.label}
                      onClick={() => handleSelectTier(idx)}
                      className="cursor-pointer"
                    >
                      {/* Larger invisible hit area for mobile thumbs */}
                      <circle cx={cx} cy={cy} r="18" fill="transparent" />
                      {isActive && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r="9"
                          fill="rgba(16,185,129,0.18)"
                          stroke="rgba(16,185,129,0.55)"
                          strokeWidth="1.25"
                        />
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isActive ? "4.5" : "3.5"}
                        fill={isActive ? "#34d399" : "#0a0f1a"}
                        stroke="#10b981"
                        strokeWidth="2"
                      />
                      {/* Exact % Value Above Node */}
                      <text
                        x={cx}
                        y={Math.max(11, cy - 10)}
                        textAnchor="middle"
                        className={`text-[9.5px] font-mono ${
                          isActive ? "fill-emerald-300 font-bold" : "fill-slate-400"
                        }`}
                      >
                        {pt.anyPrizePct.toFixed(pt.anyPrizePct < 1 ? 2 : 1)}%
                      </text>
                      {/* Cost Label on X-Axis */}
                      <text
                        x={cx}
                        y={padT + plotH + 16}
                        textAnchor="middle"
                        className={`text-[9.5px] font-mono ${
                          isActive ? "fill-white font-bold" : "fill-slate-400"
                        }`}
                      >
                        ${pt.costTT}
                      </text>
                      <text
                        x={cx}
                        y={padT + plotH + 28}
                        textAnchor="middle"
                        className="fill-slate-500 text-[8px] font-mono"
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Active Tier Mathematical Note */}
            <div className="p-3 rounded-lg bg-slate-900/70 border border-white/[0.06] text-xs font-sans text-slate-300 leading-relaxed">
              <strong className="text-white font-semibold">{tier.label} (${tier.costTT} TT): </strong>
              {tier.note}
            </div>
          </div>
        </div>

        {/* Step 4: Cash Pot Live Sure Call Timing Banner OR Game Math Edge Strip */}
        {sureCall ? (
          <div
            className={`px-4 py-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans ${
              sureCall.isSureCallDay
                ? "bg-emerald-950/35 border-emerald-500/35 text-emerald-100"
                : "bg-amber-950/30 border-amber-500/30 text-amber-100"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  sureCall.isSureCallDay ? "text-emerald-400" : "text-amber-400"
                }`}
              />
              <div>
                <span className="font-bold font-mono uppercase tracking-wider text-[11px] block">
                  {sureCall.isSureCallDay
                    ? `Sure Call Multiplier Day Active — ${sureCall.nextDrawDayName} (2.95x Historical Avg · +56% EV)`
                    : `Standard Multiplier Day — ${sureCall.nextDrawDayName} (1.89x Historical Avg · ~53% Chance of 1x)`}
                </span>
                <span className="text-slate-300">
                  {sureCall.isSureCallDay
                    ? "Across all 2026 Mon / Thu / Sat draws (108/108), Cash Pot Multiplier has NEVER dropped 1x. Best nights for 10–15 slips."
                    : "Mon, Thu, and Sat draws guarantee 2x–4x Multipliers (108/108 in 2026). Consider focusing larger Cash Pot plays on those 3 days."}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 rounded-xl bg-slate-900/60 border border-white/[0.07] flex items-start gap-2.5 text-xs font-sans text-slate-300">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Mathematical Reality: </span>
              {game.mathEdgeSummary}
            </div>
          </div>
        )}

        {/* Step 5: Primary Action Bar + Inline Optimal Slips Drawer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          {steinerPortfolio ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setShowSlipsDrawer((v) => !v);
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm font-sans transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>
                {showSlipsDrawer
                  ? `Hide Optimal ${tier.label} ($${tier.costTT} TT)`
                  : `View & Copy Optimal ${tier.label} ($${tier.costTT} TT)`}
              </span>
              {showSlipsDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          ) : (
            <div className="text-xs text-slate-400 font-sans">
              Select a 5, 10, 15, or 20-slip tier on Cash Pot, Lotto Plus, or Win For Life to generate zero-overlap Steiner slips inline, or open the game workspace.
            </div>
          )}

          <button
            type="button"
            onClick={() => onSelectGame && onSelectGame(game.key)}
            className="py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-100 font-semibold text-xs sm:text-sm font-sans transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>Open {game.name} Workspace</span>
            <ArrowRight className="w-4 h-4 text-sky-400" />
          </button>
        </div>

        {/* Inline Zero-Overlap Steiner-Johnson Slips Drawer */}
        {showSlipsDrawer && steinerPortfolio && (
          <div className="rounded-xl bg-[#070b14] border border-emerald-500/30 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-white/[0.06]">
              <div>
                <div className="text-xs font-bold font-mono text-emerald-300 uppercase tracking-wider">
                  {game.name} · {steinerPortfolio.slips.length} Steiner-Johnson Slips (${tier.costTT} TT)
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  MaxOverlap ≤ {steinerPortfolio.maxPairOverlap} · {steinerPortfolio.coveredBallsCount}/
                  {steinerPortfolio.totalBalls} Balls Covered · Anti-Crowding {steinerPortfolio.antiCrowdingScore}%
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setShowExportModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Export</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopySlips}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-mono font-semibold text-white transition cursor-pointer"
                >
                  {copiedSlips ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-sky-400" />
                      <span>Copy All {steinerPortfolio.slips.length}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1">
              {steinerPortfolio.slips.map((slip, idx) => {
                const bonus = steinerPortfolio.bonusBalls[idx];
                return (
                  <div
                    key={idx}
                    className="px-3 py-2 rounded-lg bg-slate-900/75 border border-white/[0.06] flex items-center justify-between font-mono text-xs"
                  >
                    <span className="text-slate-500 text-[11px]">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-100 font-bold tracking-wider tabular-nums">
                        {slip.map((n) => String(n).padStart(2, "0")).join(" · ")}
                      </span>
                      {bonus !== undefined && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                          {game.key === "win-for-life" ? `CB ${bonus}` : `PB ${bonus}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              These slips are generated for free analysis — play your chosen numbers in person at any official NLCB Lotto booth.
            </p>
          </div>
        )}
      </div>

      {steinerPortfolio && (
        <BetSlipExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          gameKey={game.key as "cashpot" | "lotto-plus" | "win-for-life"}
          gameName={game.name}
          targetDrawNumber={targetDrawNumbers[game.key]}
          slips={steinerPortfolio.slips}
          bonusBalls={steinerPortfolio.bonusBalls}
          unitCostTT={game.unitCostTT}
          multiplierIncluded={game.key === "cashpot"}
        />
      )}
    </section>
  );
}
