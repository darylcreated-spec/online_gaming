"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Copy,
  Check,
  Users,
  CheckCircle2,
  ArrowRight,
  Sliders,
  X,
  Printer
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { CHINAPOO_CHART } from "@/lib/playwhe";
import BetSlipExportModal from "@/components/BetSlipExportModal";
import { copyTextToClipboard } from "@/lib/export_helpers";

export type QuickPickGame = "lotto-plus" | "win-for-life" | "cashpot" | "pick4" | "play-whe";
export type StrategyMode = "balanced" | "hot" | "cold" | "pure";

interface QuickPickEngineProps {
  initialGame?: QuickPickGame;
  onSelectGame?: (game: QuickPickGame) => void;
  className?: string;
}

interface GameDefinition {
  id: QuickPickGame;
  name: string;
  shortName: string;
  tagline: string;
  poolSize: number;
  pickCount: number;
  minNumber: number;
  hasBonus?: boolean;
  bonusName?: string;
  bonusPoolSize?: number;
  hasMultiplier?: boolean;
  themeColor: string;
  accentHex: string;
  glowHex: string;
  borderClass: string;
  badgeBg: string;
  badgeText: string;
  iconSrc: string;
  gaussianSumRange?: [number, number];
  hotPool: number[];
  coldPool: number[];
}

const STRATEGY_LABELS: Record<StrategyMode, string> = {
  balanced: "Balanced Mix",
  hot: "Frequently Drawn",
  cold: "Less Recent",
  pure: "Pure Random"
};

const GAME_DEFINITIONS: Record<QuickPickGame, GameDefinition> = {
  "lotto-plus": {
    id: "lotto-plus",
    name: "Lotto Plus",
    shortName: "Lotto Plus",
    tagline: "5 numbers from 1 to 35 plus 1 Powerball from 1 to 10",
    poolSize: 35,
    pickCount: 5,
    minNumber: 1,
    hasBonus: true,
    bonusName: "Powerball",
    bonusPoolSize: 10,
    themeColor: "sky",
    accentHex: "#38bdf8",
    glowHex: "rgba(56, 189, 248, 0.35)",
    borderClass: "border-white/[0.09]",
    badgeBg: "bg-sky-500/15",
    badgeText: "text-sky-300",
    iconSrc: "/images/lotto_plus_icon.png",
    gaussianSumRange: [66, 114],
    hotPool: [28, 29, 17, 10, 16, 19, 27, 31, 35, 12],
    coldPool: [3, 7, 14, 21, 23, 24, 32, 33]
  },
  "win-for-life": {
    id: "win-for-life",
    name: "Win For Life",
    shortName: "Win For Life",
    tagline: "6 numbers from 1 to 28 plus 1 Cash Ball (1, 2, or 3)",
    poolSize: 28,
    pickCount: 6,
    minNumber: 1,
    hasBonus: true,
    bonusName: "Cash Ball",
    bonusPoolSize: 3,
    themeColor: "emerald",
    accentHex: "#10b981",
    glowHex: "rgba(16, 185, 129, 0.35)",
    borderClass: "border-white/[0.09]",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-300",
    iconSrc: "/images/win_for_life_icon.png",
    gaussianSumRange: [67, 108],
    hotPool: [7, 12, 4, 18, 26, 19, 23, 1, 3, 15],
    coldPool: [2, 8, 11, 14, 17, 21, 25, 27]
  },
  cashpot: {
    id: "cashpot",
    name: "Cash Pot",
    shortName: "Cash Pot",
    tagline: "5 numbers from 1 to 20 with Multiplier",
    poolSize: 20,
    pickCount: 5,
    minNumber: 1,
    hasBonus: false,
    hasMultiplier: true,
    themeColor: "yellow",
    accentHex: "#eab308",
    glowHex: "rgba(234, 179, 8, 0.35)",
    borderClass: "border-white/[0.09]",
    badgeBg: "bg-yellow-500/15",
    badgeText: "text-yellow-300",
    iconSrc: "/images/cash_pot_icon.png",
    gaussianSumRange: [38, 65],
    hotPool: [6, 11, 3, 12, 2, 15, 8, 10, 7, 18],
    coldPool: [1, 4, 5, 9, 13, 14, 17, 19]
  },
  pick4: {
    id: "pick4",
    name: "Pick 4",
    shortName: "Pick 4",
    tagline: "4 digits from 0 to 9",
    poolSize: 10,
    pickCount: 4,
    minNumber: 0,
    hasBonus: false,
    themeColor: "purple",
    accentHex: "#a855f7",
    glowHex: "rgba(168, 85, 247, 0.35)",
    borderClass: "border-white/[0.09]",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-300",
    iconSrc: "/images/pick_four_icon.png",
    gaussianSumRange: [12, 25],
    hotPool: [3, 7, 8, 2, 5, 9],
    coldPool: [0, 1, 4, 6]
  },
  "play-whe": {
    id: "play-whe",
    name: "Play Whe",
    shortName: "Play Whe",
    tagline: "1 mark from 1 to 36 (Chinapoo chart)",
    poolSize: 36,
    pickCount: 1,
    minNumber: 1,
    hasBonus: false,
    themeColor: "amber",
    accentHex: "#f59e0b",
    glowHex: "rgba(245, 158, 11, 0.35)",
    borderClass: "border-white/[0.09]",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-300",
    iconSrc: "/images/play_whe_icon.png",
    hotPool: [18, 14, 16, 2, 29, 23, 10, 6],
    coldPool: [15, 36, 1, 19, 24, 30]
  }
};

export default function QuickPickEngine({
  initialGame = "lotto-plus",
  onSelectGame,
  className = ""
}: QuickPickEngineProps) {
  const [selectedGame, setSelectedGame] = useState<QuickPickGame>(initialGame);
  const [strategy, setStrategy] = useState<StrategyMode>("balanced");
  const [lineCount, setLineCount] = useState<number>(1);
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const [dropIteration, setDropIteration] = useState<number>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [syndicateMsg, setSyndicateMsg] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Active generated lines
  const [primaryPicks, setPrimaryPicks] = useState<number[]>([]);
  const [primaryBonus, setPrimaryBonus] = useState<number | null>(null);
  const [primaryMultiplier, setPrimaryMultiplier] = useState<number>(1);
  const [additionalLines, setAdditionalLines] = useState<Array<{ numbers: number[]; bonus?: number }>>([]);

  const gameConfig = GAME_DEFINITIONS[selectedGame];

  const generateSingleTicket = useCallback((game: GameDefinition, strat: StrategyMode): { numbers: number[]; bonus?: number; multiplier?: number } => {
    const isPick4 = game.id === "pick4";
    const { pickCount, poolSize, minNumber, hasBonus, bonusPoolSize, hasMultiplier, gaussianSumRange, hotPool, coldPool } = game;

    let numbers: number[] = [];
    let attempts = 0;
    const maxAttempts = 150;

    while (attempts < maxAttempts) {
      attempts++;
      const candidate: number[] = [];

      if (isPick4) {
        for (let i = 0; i < pickCount; i++) {
          if (strat === "hot" && Math.random() < 0.65) {
            candidate.push(hotPool[Math.floor(Math.random() * hotPool.length)]);
          } else if (strat === "cold" && Math.random() < 0.65) {
            candidate.push(coldPool[Math.floor(Math.random() * coldPool.length)]);
          } else {
            candidate.push(Math.floor(Math.random() * 10));
          }
        }
        if (strat === "balanced") {
          const sum = candidate.reduce((a, b) => a + b, 0);
          const uniqueDigits = new Set(candidate).size;
          if (sum >= 12 && sum <= 25 && uniqueDigits >= 2) {
            numbers = candidate;
            break;
          }
        } else {
          numbers = candidate;
          break;
        }
      } else {
        const poolSet = new Set<number>();

        if (strat === "hot") {
          hotPool.forEach(h => { if (Math.random() < 0.5 && poolSet.size < pickCount) poolSet.add(h); });
        } else if (strat === "cold") {
          coldPool.forEach(c => { if (Math.random() < 0.5 && poolSet.size < pickCount) poolSet.add(c); });
        }

        while (poolSet.size < pickCount) {
          const rand = Math.floor(Math.random() * poolSize) + minNumber;
          poolSet.add(rand);
        }

        const candidateArray = Array.from(poolSet).sort((a, b) => a - b);

        if (strat === "balanced" && gaussianSumRange) {
          const sum = candidateArray.reduce((a, b) => a + b, 0);
          const oddCount = candidateArray.filter(n => n % 2 !== 0).length;
          const isParityBalanced = oddCount >= 1 && oddCount <= (pickCount - 1);

          if (sum >= gaussianSumRange[0] && sum <= gaussianSumRange[1] && isParityBalanced) {
            numbers = candidateArray;
            break;
          }
        } else {
          numbers = candidateArray;
          break;
        }
      }
    }

    if (numbers.length === 0) {
      if (isPick4) {
        numbers = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10));
      } else {
        const pool: number[] = [];
        while (pool.length < pickCount) {
          const r = Math.floor(Math.random() * poolSize) + minNumber;
          if (!pool.includes(r)) pool.push(r);
        }
        numbers = pool.sort((a, b) => a - b);
      }
    }

    let bonus: number | undefined;
    if (hasBonus && bonusPoolSize) {
      bonus = Math.floor(Math.random() * bonusPoolSize) + 1;
    }

    let multiplier: number | undefined;
    if (hasMultiplier) {
      const mults = [1, 2, 2, 3, 3, 4];
      multiplier = mults[Math.floor(Math.random() * mults.length)];
    }

    return { numbers, bonus, multiplier };
  }, []);

  const executeBallDrop = useCallback(() => {
    setIsDropping(true);
    triggerHaptic("heavy");

    const primary = generateSingleTicket(gameConfig, strategy);
    setPrimaryPicks(primary.numbers);
    setPrimaryBonus(primary.bonus ?? null);
    setPrimaryMultiplier(primary.multiplier ?? 1);

    if (lineCount > 1) {
      const extra: Array<{ numbers: number[]; bonus?: number }> = [];
      for (let i = 1; i < lineCount; i++) {
        const t = generateSingleTicket(gameConfig, strategy);
        extra.push({ numbers: t.numbers, bonus: t.bonus });
      }
      setAdditionalLines(extra);
    } else {
      setAdditionalLines([]);
    }

    setDropIteration(prev => prev + 1);

    const duration = 200 + gameConfig.pickCount * 140;
    setTimeout(() => {
      setIsDropping(false);
      triggerHaptic("success");
    }, duration);
  }, [gameConfig, strategy, lineCount, generateSingleTicket]);

  useEffect(() => {
    executeBallDrop();
  }, [selectedGame]);

  const handleCopyTicket = async (numbers: number[], bonus?: number | null, index: number = 0) => {
    triggerHaptic("selection");
    let text = "";
    if (selectedGame === "pick4") {
      text = numbers.join("");
    } else if (selectedGame === "play-whe") {
      text = `Mark ${numbers[0]} - ${CHINAPOO_CHART[numbers[0]]?.mark || ""}`;
    } else {
      text = numbers.map(n => String(n).padStart(2, "0")).join(", ");
      if (bonus && gameConfig.bonusName) text += ` | ${gameConfig.bonusName}: ${bonus}`;
    }
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleSendToSyndicate = async (numbers: number[], bonus?: number | null) => {
    triggerHaptic("success");
    const formatted = numbers.map(n => String(n).padStart(2, "0")).join(", ");
    const bonusText = bonus && gameConfig.bonusName ? ` | ${gameConfig.bonusName}: ${bonus}` : "";
    const text = `${gameConfig.name} Quick Pick: ${formatted}${bonusText}`;
    await copyTextToClipboard(text);
    setSyndicateMsg(`Copied ${gameConfig.shortName} numbers (${formatted}) for sharing with your group.`);
    setTimeout(() => setSyndicateMsg(null), 4000);
  };

  const ticketMetrics = useMemo(() => {
    if (primaryPicks.length === 0) return null;
    const sum = primaryPicks.reduce((a, b) => a + b, 0);
    const odds = primaryPicks.filter(n => n % 2 !== 0).length;
    const evens = primaryPicks.length - odds;
    const isPick4 = selectedGame === "pick4";

    let formType = "";
    if (isPick4) {
      const counts: Record<number, number> = {};
      primaryPicks.forEach(d => counts[d] = (counts[d] || 0) + 1);
      const values = Object.values(counts).sort((a, b) => b - a);
      if (values[0] === 4) formType = "All 4 Same (1-Way)";
      else if (values[0] === 3) formType = "3 Same Digits (4-Way Box)";
      else if (values[0] === 2 && values[1] === 2) formType = "2 Pairs (6-Way Box)";
      else if (values[0] === 2) formType = "1 Pair (12-Way Box)";
      else formType = "4 Different Digits (24-Way Box)";
    }

    const inGaussian = gameConfig.gaussianSumRange
      ? sum >= gameConfig.gaussianSumRange[0] && sum <= gameConfig.gaussianSumRange[1]
      : true;

    return {
      sum,
      odds,
      evens,
      formType,
      inGaussian,
      spread: Math.max(...primaryPicks) - Math.min(...primaryPicks)
    };
  }, [primaryPicks, selectedGame, gameConfig]);

  return (
    <section
      aria-label="Quick Number Picker"
      className={`p-5 sm:p-6 rounded-2xl border ${gameConfig.borderClass} bg-[#0a0f1a] relative overflow-hidden font-sans shadow-xl transition-all duration-300 ${className}`}
    >
      {/* Subtle Ambient Glow */}
      <div
        className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-colors duration-500 opacity-30"
        style={{ background: gameConfig.glowHex }}
      />

      {/* Top Header and Toast */}
      <div className="relative z-10 space-y-4">
        {syndicateMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syndicateMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyndicateMsg(null)}
              className="text-emerald-300 hover:text-white p-1 cursor-pointer"
              aria-label="Close message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider border border-white/10 ${gameConfig.badgeBg} ${gameConfig.badgeText}`}>
                Quick Number Picker
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {gameConfig.tagline}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <img
                src={gameConfig.iconSrc}
                alt={gameConfig.name}
                className="w-7 h-7 rounded-lg object-contain border border-white/10 shadow-sm"
              />
              <span>{gameConfig.name} Quick Pick</span>
            </h2>
          </div>

          {/* Game Switcher Tabs */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/10 overflow-x-auto scrollbar-none gap-1 max-w-full">
            {(Object.keys(GAME_DEFINITIONS) as QuickPickGame[]).map((gId) => {
              const g = GAME_DEFINITIONS[gId];
              const isCurrent = selectedGame === gId;
              return (
                <button
                  key={gId}
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setSelectedGame(gId);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isCurrent
                      ? `${g.badgeBg} ${g.badgeText} border border-current shadow-sm font-bold`
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: g.accentHex }}
                  />
                  {g.shortName}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Control Configuration Bar: Style and Lines */}
      <div className="mt-5 pt-4 border-t border-white/10 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Style Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            Number Style:
          </span>
          {(["balanced", "hot", "cold", "pure"] as StrategyMode[]).map((mode) => {
            const activeColors: Record<StrategyMode, string> = {
              balanced: "bg-emerald-500/20 text-emerald-300 border border-emerald-400",
              hot: "bg-amber-500/20 text-amber-300 border border-amber-400",
              cold: "bg-cyan-500/20 text-cyan-300 border border-cyan-400",
              pure: "bg-purple-500/20 text-purple-300 border border-purple-400"
            };
            return (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setStrategy(mode);
                  triggerHaptic("selection");
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer text-xs ${
                  strategy === mode
                    ? activeColors[mode]
                    : "bg-slate-900/60 text-slate-400 border border-white/5 hover:text-white"
                }`}
              >
                {STRATEGY_LABELS[mode]}
              </button>
            );
          })}
        </div>

        {/* Lines Count Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lines:</span>
          {[1, 3, 5].map((cnt) => (
            <button
              key={cnt}
              type="button"
              onClick={() => {
                setLineCount(cnt);
                triggerHaptic("selection");
              }}
              className={`w-8 h-8 rounded-lg font-bold transition cursor-pointer text-xs flex items-center justify-center border ${
                lineCount === cnt
                  ? `${gameConfig.badgeBg} ${gameConfig.badgeText} border-current`
                  : "bg-slate-900/60 text-slate-400 border-white/5 hover:text-white"
              }`}
            >
              {cnt}
            </button>
          ))}
        </div>
      </div>

      {/* Ball Display Chamber */}
      <div className="my-5 relative z-10">
        <div className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-slate-300">
              {isDropping ? "Picking your numbers..." : "Ready to generate a quick pick"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: gameConfig.pickCount }).map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-1.5 rounded-full transition-all duration-300 ${
                  isDropping
                    ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                    : "bg-white/15"
                }`}
              />
            ))}
            {gameConfig.hasBonus && (
              <div
                className={`w-3.5 h-1.5 rounded-full transition-all duration-300 ${
                  isDropping ? "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-red-500/25"
                }`}
              />
            )}
          </div>
        </div>

        <div className="mt-3 p-6 sm:p-7 rounded-2xl bg-[#070b14] border border-white/10 relative overflow-hidden min-h-[160px] flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap relative z-10 py-2">
            {primaryPicks.map((num, idx) => {
              const animDelay = isDropping ? `${idx * 130}ms` : "0ms";
              const isPlayWhe = selectedGame === "play-whe";

              return (
                <div
                  key={`${dropIteration}-${idx}`}
                  style={{ animationDelay: animDelay }}
                  className={`flex flex-col items-center gap-1.5 ${isDropping ? "animate-ball-drop" : ""}`}
                >
                  <div
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-black text-xl sm:text-2xl shadow-2xl transition-transform hover:scale-105 select-none ${
                      isPlayWhe ? "w-20 h-20 sm:w-24 sm:h-24 text-3xl sm:text-4xl" : ""
                    }`}
                    style={{
                      background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${gameConfig.accentHex} 45%, #050505 100%)`,
                      boxShadow: `0 8px 24px -2px ${gameConfig.glowHex}, inset 0 -4px 8px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.9)`
                    }}
                  >
                    <div className="absolute inset-0 rounded-full ball-3d-gloss pointer-events-none" />
                    <span className="relative z-10 text-slate-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] font-mono font-black">
                      {selectedGame === "pick4" ? num : String(num).padStart(2, "0")}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-medium">
                    {isPlayWhe
                      ? CHINAPOO_CHART[num]?.mark || `Mark ${num}`
                      : `Number ${idx + 1}`}
                  </span>
                </div>
              );
            })}

            {/* Bonus Ball (Powerball or Cash Ball) */}
            {gameConfig.hasBonus && primaryBonus !== null && (
              <div
                key={`bonus-${dropIteration}`}
                style={{ animationDelay: `${gameConfig.pickCount * 130}ms` }}
                className={`flex flex-col items-center gap-1.5 ml-2 pl-3 border-l border-white/10 ${
                  isDropping ? "animate-ball-drop" : ""
                }`}
              >
                <div
                  className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-black text-xl sm:text-2xl shadow-2xl transition-transform hover:scale-105 select-none"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, #ffffff 0%, #ef4444 45%, #450a0a 100%)",
                    boxShadow: "0 8px 24px -2px rgba(239, 68, 68, 0.5), inset 0 -4px 8px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.9)"
                  }}
                >
                  <div className="absolute inset-0 rounded-full ball-3d-gloss pointer-events-none" />
                  <span className="relative z-10 text-white font-mono font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {primaryBonus}
                  </span>
                </div>
                <span className="text-xs text-red-300 font-semibold">
                  {gameConfig.bonusName}
                </span>
              </div>
            )}

            {/* Cash Pot Sample Multiplier */}
            {gameConfig.hasMultiplier && (
              <div
                key={`mult-${dropIteration}`}
                style={{ animationDelay: `${gameConfig.pickCount * 130}ms` }}
                className={`flex flex-col items-center gap-1.5 ml-2 pl-3 border-l border-white/10 ${
                  isDropping ? "animate-ball-drop" : ""
                }`}
              >
                <div
                  className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow-2xl transition-transform select-none bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 border border-yellow-300"
                  style={{ boxShadow: "0 8px 20px -2px rgba(234, 179, 8, 0.45)" }}
                >
                  <span className="font-mono font-black">
                    {primaryMultiplier}x
                  </span>
                </div>
                <span className="text-xs text-amber-300 font-semibold">
                  Multiplier
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plain-English Summary Bar */}
      {ticketMetrics && (
        <div className="relative z-10 p-3.5 rounded-xl bg-slate-900/70 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-4 flex-wrap">
            {selectedGame !== "play-whe" && (
              <>
                <div>
                  <span className="text-slate-400 text-xs font-semibold uppercase block">Total Sum</span>
                  <span className="font-bold text-white text-sm font-mono">
                    {ticketMetrics.sum}
                  </span>
                </div>

                <div className="h-6 w-px bg-white/10" />

                <div>
                  <span className="text-slate-400 text-xs font-semibold uppercase block">Odd and Even</span>
                  <span className="font-bold text-cyan-300 text-sm">
                    {ticketMetrics.odds} Odd, {ticketMetrics.evens} Even
                  </span>
                </div>

                <div className="h-6 w-px bg-white/10" />
              </>
            )}

            {selectedGame === "pick4" ? (
              <div>
                <span className="text-slate-400 text-xs font-semibold uppercase block">Digit Pattern</span>
                <span className="font-bold text-purple-300 text-sm">
                  {ticketMetrics.formType}
                </span>
              </div>
            ) : selectedGame === "play-whe" ? (
              <div>
                <span className="text-slate-400 text-xs font-semibold uppercase block">Chinapoo Mark</span>
                <span className="font-bold text-amber-300 text-sm">
                  Mark {primaryPicks[0]}: {CHINAPOO_CHART[primaryPicks[0]]?.mark} (Line {((primaryPicks[0] - 1) % 9) + 1})
                </span>
              </div>
            ) : (
              <div>
                <span className="text-slate-400 text-xs font-semibold uppercase block">Number Balance</span>
                <span className={`font-bold text-sm ${ticketMetrics.inGaussian ? "text-emerald-400" : "text-amber-400"}`}>
                  {ticketMetrics.inGaussian ? "Typical Balanced Range" : "Wide Sum Range"}
                </span>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-400">
            Style: <strong className="text-white">{STRATEGY_LABELS[strategy]}</strong>
          </div>
        </div>
      )}

      {/* Additional Lines */}
      {additionalLines.length > 0 && (
        <div className="mt-4 space-y-2.5 relative z-10">
          <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider block">
            Additional Lines
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {additionalLines.map((line, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-2 text-xs hover:border-white/15 transition"
              >
                <span className="text-slate-400 font-semibold">Line {idx + 2}</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {line.numbers.map((n, i) => (
                    <span
                      key={i}
                      className="w-7 h-7 rounded-lg bg-slate-800 border border-white/10 text-white font-mono font-bold text-xs flex items-center justify-center"
                    >
                      {selectedGame === "pick4" ? n : String(n).padStart(2, "0")}
                    </span>
                  ))}
                  {line.bonus && (
                    <span className="px-2 h-7 rounded-lg bg-red-500/20 border border-red-400 text-red-200 font-sans font-bold text-xs flex items-center justify-center">
                      {gameConfig.bonusName} {line.bonus}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopyTicket(line.numbers, line.bonus, idx + 1)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                    title="Copy line"
                  >
                    {copiedIndex === idx + 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToSyndicate(line.numbers, line.bonus)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-white/10 transition cursor-pointer"
                    title="Copy for group pool"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="mt-5 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={executeBallDrop}
            disabled={isDropping}
            className={`w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 ${
              isDropping
                ? "bg-slate-800 text-slate-400 border border-white/10"
                : "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 active:scale-95"
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isDropping ? "animate-spin" : ""}`} />
            <span>{isDropping ? "Picking Numbers..." : "Generate Quick Pick"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopyTicket(primaryPicks, primaryBonus, 0)}
            className="px-4 py-3 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-200 hover:text-white text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            title="Copy numbers"
          >
            {copiedIndex === 0 ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copiedIndex === 0 ? "Copied" : "Copy"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setShowExportModal(true);
            }}
            disabled={primaryPicks.length === 0}
            className="px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 hover:bg-emerald-500/25 text-emerald-200 text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Print or export Quick Pick lines"
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span className="hidden sm:inline">Print / Export</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendToSyndicate(primaryPicks, primaryBonus)}
            className="px-4 py-3 rounded-xl bg-slate-900 border border-white/10 hover:border-amber-400/40 text-amber-300 hover:text-amber-200 text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            title="Copy numbers for group pool"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Group Pool</span>
          </button>
        </div>

        {onSelectGame && (
          <button
            type="button"
            onClick={() => onSelectGame(selectedGame)}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition flex items-center justify-center sm:justify-end gap-1.5 cursor-pointer group"
          >
            <span>Open {gameConfig.shortName} Page</span>
            <ArrowRight className="w-4 h-4 text-amber-400 transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>

      {primaryPicks.length > 0 && (
        <BetSlipExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          gameKey={selectedGame}
          gameName={gameConfig.name}
          slips={[primaryPicks, ...additionalLines.map((l) => l.numbers)]}
          bonusBalls={
            gameConfig.hasBonus
              ? [
                  primaryBonus ?? 1,
                  ...additionalLines.map((l) => l.bonus ?? primaryBonus ?? 1)
                ]
              : []
          }
          unitCostTT={
            selectedGame === "win-for-life"
              ? 10
              : selectedGame === "play-whe" || selectedGame === "pick4"
              ? 1
              : 5
          }
          multiplierIncluded={selectedGame === "cashpot"}
        />
      )}
    </section>
  );
}
