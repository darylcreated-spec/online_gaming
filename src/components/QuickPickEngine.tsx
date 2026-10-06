"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Zap,
  RefreshCw,
  Copy,
  Check,
  Users,
  CheckCircle2,
  Binary,
  ArrowRight,
  Sliders,
  ShieldCheck,
  TrendingUp,
  Award,
  Layers,
  Flame,
  Clock,
  Compass
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { CHINAPOO_CHART } from "@/lib/playwhe";

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

const GAME_DEFINITIONS: Record<QuickPickGame, GameDefinition> = {
  "lotto-plus": {
    id: "lotto-plus",
    name: "Lotto Plus",
    shortName: "Lotto Plus",
    tagline: "5 of 35 • Powerball 1-10",
    poolSize: 35,
    pickCount: 5,
    minNumber: 1,
    hasBonus: true,
    bonusName: "Powerball",
    bonusPoolSize: 10,
    themeColor: "sky",
    accentHex: "#38bdf8",
    glowHex: "rgba(56, 189, 248, 0.45)",
    borderClass: "border-sky-500/40",
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
    tagline: "6 of 28 • LJCR Manifold",
    poolSize: 28,
    pickCount: 6,
    minNumber: 1,
    hasBonus: false,
    themeColor: "emerald",
    accentHex: "#10b981",
    glowHex: "rgba(16, 185, 129, 0.45)",
    borderClass: "border-emerald-500/40",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-300",
    iconSrc: "/images/win_for_life_icon.png",
    gaussianSumRange: [67, 108],
    hotPool: [7, 12, 4, 18, 26, 19, 23, 1, 3, 15],
    coldPool: [2, 8, 11, 14, 17, 21, 25, 27]
  },
  "cashpot": {
    id: "cashpot",
    name: "Cash Pot",
    shortName: "Cash Pot",
    tagline: "5 of 20 • Multiplier 1X-5X",
    poolSize: 20,
    pickCount: 5,
    minNumber: 1,
    hasBonus: false,
    hasMultiplier: true,
    themeColor: "yellow",
    accentHex: "#eab308",
    glowHex: "rgba(234, 179, 8, 0.45)",
    borderClass: "border-yellow-500/40",
    badgeBg: "bg-yellow-500/15",
    badgeText: "text-yellow-300",
    iconSrc: "/images/cash_pot_icon.png",
    gaussianSumRange: [38, 65],
    hotPool: [6, 11, 3, 12, 2, 15, 8, 10, 7, 18],
    coldPool: [1, 4, 5, 9, 13, 14, 17, 19]
  },
  "pick4": {
    id: "pick4",
    name: "Pick 4",
    shortName: "Pick 4",
    tagline: "4 Digits 0000 - 9999",
    poolSize: 10, // 0-9
    pickCount: 4,
    minNumber: 0,
    hasBonus: false,
    themeColor: "purple",
    accentHex: "#a855f7",
    glowHex: "rgba(168, 85, 247, 0.45)",
    borderClass: "border-purple-500/40",
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
    tagline: "1 of 36 • Chinapoo Lineage",
    poolSize: 36,
    pickCount: 1,
    minNumber: 1,
    hasBonus: false,
    themeColor: "amber",
    accentHex: "#f59e0b",
    glowHex: "rgba(245, 158, 11, 0.45)",
    borderClass: "border-amber-500/40",
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

  // Active generated lines
  const [primaryPicks, setPrimaryPicks] = useState<number[]>([]);
  const [primaryBonus, setPrimaryBonus] = useState<number | null>(null);
  const [primaryMultiplier, setPrimaryMultiplier] = useState<number>(1);
  const [additionalLines, setAdditionalLines] = useState<Array<{ numbers: number[]; bonus?: number }>>([]);

  const gameConfig = GAME_DEFINITIONS[selectedGame];

  // Generator algorithm
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
        // Pick 4 generates ordered 4 digits with replacement allowed
        for (let i = 0; i < pickCount; i++) {
          if (strat === "hot" && Math.random() < 0.65) {
            candidate.push(hotPool[Math.floor(Math.random() * hotPool.length)]);
          } else if (strat === "cold" && Math.random() < 0.65) {
            candidate.push(coldPool[Math.floor(Math.random() * coldPool.length)]);
          } else {
            candidate.push(Math.floor(Math.random() * 10));
          }
        }
        // If balanced strategy, verify sum within 12-25 and reject 4-of-a-kind
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
        // Multi-ball games without replacement
        const poolSet = new Set<number>();

        if (strat === "hot") {
          // Favor hot numbers
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

    // Fallback if max attempts exceeded
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
      // 1X to 5X with 2X, 3X, 5X weighted
      const mults = [1, 2, 2, 3, 3, 4, 5];
      multiplier = mults[Math.floor(Math.random() * mults.length)];
    }

    return { numbers, bonus, multiplier };
  }, []);

  // Trigger Ball Drop Animation
  const executeBallDrop = useCallback(() => {
    setIsDropping(true);
    triggerHaptic("heavy");

    // Generate new numbers
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

    // End dropping state after gravity animation finishes
    const duration = 200 + gameConfig.pickCount * 140;
    setTimeout(() => {
      setIsDropping(false);
      triggerHaptic("success");
    }, duration);
  }, [gameConfig, strategy, lineCount, generateSingleTicket]);

  // Initial draw generation on mount or game switch
  useEffect(() => {
    executeBallDrop();
  }, [selectedGame]);

  // Copy Ticket Handlers
  const handleCopyTicket = (numbers: number[], bonus?: number | null, index: number = 0) => {
    triggerHaptic("selection");
    let text = "";
    if (selectedGame === "pick4") {
      text = numbers.join("");
    } else if (selectedGame === "play-whe") {
      text = `#${numbers[0]} - ${CHINAPOO_CHART[numbers[0]]?.mark || ""}`;
    } else {
      text = numbers.map(n => String(n).padStart(2, "0")).join(" - ");
      if (bonus) text += ` | Powerball: ${bonus}`;
    }
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSendToSyndicate = (numbers: number[], bonus?: number | null) => {
    triggerHaptic("success");
    const formatted = numbers.map(n => String(n).padStart(2, "0")).join(", ");
    const text = `${gameConfig.name} Quick Pick: [${formatted}]${bonus ? ` PB: ${bonus}` : ""}`;
    navigator.clipboard.writeText(text);
    setSyndicateMsg(`Added ${gameConfig.shortName} slip [${formatted}] to clipboard for Syndicate submission!`);
    setTimeout(() => setSyndicateMsg(null), 4000);
  };

  // Metrics
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
      if (values[0] === 4) formType = "Quad (1-Way)";
      else if (values[0] === 3) formType = "Triple (4-Way Box)";
      else if (values[0] === 2 && values[1] === 2) formType = "Two-Pair (6-Way Box)";
      else if (values[0] === 2) formType = "One-Pair (12-Way Box)";
      else formType = "ABCD (24-Way Box)";
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
    <div className={`p-6 sm:p-7 rounded-3xl glass-panel border ${gameConfig.borderClass} bg-slate-950/85 relative overflow-hidden font-mono shadow-2xl transition-all duration-300 ${className}`}>
      {/* Background Ambient Glow */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-500"
        style={{ background: gameConfig.glowHex }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-colors duration-500 opacity-40"
        style={{ background: gameConfig.glowHex }}
      />

      {/* Top Header & Toast */}
      <div className="relative z-10 space-y-4">
        {syndicateMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{syndicateMsg}</span>
            </div>
            <button onClick={() => setSyndicateMsg(null)} className="text-emerald-400 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-white/10 ${gameConfig.badgeBg} ${gameConfig.badgeText}`}>
                TACTICAL BALL DROP
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold">
                {gameConfig.tagline}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
              <img
                src={gameConfig.iconSrc}
                alt={gameConfig.name}
                className="w-7 h-7 rounded-lg object-contain border border-white/10 shadow-sm"
              />
              <span>{gameConfig.name} Quick Pick Engine</span>
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
                  onClick={() => {
                    triggerHaptic("selection");
                    setSelectedGame(gId);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isCurrent
                      ? `${g.badgeBg} ${g.badgeText} border border-current shadow-sm font-black`
                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
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

      {/* Control Configuration Bar: Strategy & Lines */}
      <div className="mt-5 pt-4 border-t border-white/10 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Strategy Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-gray-500" />
            Strategy:
          </span>
          <button
            onClick={() => { setStrategy("balanced"); triggerHaptic("selection"); }}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
              strategy === "balanced"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400"
                : "bg-slate-900/60 text-gray-400 border border-white/5 hover:text-white"
            }`}
          >
            Gaussian Balanced
          </button>
          <button
            onClick={() => { setStrategy("hot"); triggerHaptic("selection"); }}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
              strategy === "hot"
                ? "bg-amber-500/20 text-amber-300 border border-amber-400"
                : "bg-slate-900/60 text-gray-400 border border-white/5 hover:text-white"
            }`}
          >
            Hot Attractor
          </button>
          <button
            onClick={() => { setStrategy("cold"); triggerHaptic("selection"); }}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
              strategy === "cold"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400"
                : "bg-slate-900/60 text-gray-400 border border-white/5 hover:text-white"
            }`}
          >
            Overdue Reversion
          </button>
          <button
            onClick={() => { setStrategy("pure"); triggerHaptic("selection"); }}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] ${
              strategy === "pure"
                ? "bg-purple-500/20 text-purple-300 border border-purple-400"
                : "bg-slate-900/60 text-gray-400 border border-white/5 hover:text-white"
            }`}
          >
            Pure RNG
          </button>
        </div>

        {/* Lines Count Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lines:</span>
          {[1, 3, 5].map((cnt) => (
            <button
              key={cnt}
              onClick={() => {
                setLineCount(cnt);
                triggerHaptic("selection");
              }}
              className={`w-7 h-7 rounded-lg font-bold transition cursor-pointer text-xs flex items-center justify-center border ${
                lineCount === cnt
                  ? `${gameConfig.badgeBg} ${gameConfig.badgeText} border-current font-black`
                  : "bg-slate-900/60 text-gray-400 border-white/5 hover:text-white"
              }`}
            >
              {cnt}
            </button>
          ))}
        </div>
      </div>

      {/* MECHANICAL DROP CHUTE & BALL RECEPTACLES */}
      <div className="my-6 relative z-10">
        {/* Overhead Pneumatic Rail & Release Chutes */}
        <div className="w-full h-10 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-white/15 p-2 flex items-center justify-between relative shadow-inner">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {isDropping ? "GRAVITY DISPENSING BALLS..." : "PNEUMATIC CHUTE ARMED"}
            </span>
          </div>

          {/* Chute Status Lights */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: gameConfig.pickCount }).map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-1.5 rounded-full transition-all duration-300 ${
                  isDropping
                    ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                    : "bg-white/10"
                }`}
              />
            ))}
            {gameConfig.hasBonus && (
              <div
                className={`w-3.5 h-1.5 rounded-full transition-all duration-300 ${
                  isDropping ? "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-red-500/20"
                }`}
              />
            )}
          </div>
        </div>

        {/* BALL DROP RECEPTACLES (Physical Slotted Chamber) */}
        <div className="mt-4 p-6 sm:p-8 rounded-2xl bg-slate-950/90 border border-white/10 relative overflow-hidden min-h-[170px] flex flex-col items-center justify-center">
          {/* Laser Guide Lines */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_16px]" />

          {/* Primary Line Balls */}
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
                  {/* The Physical Ball */}
                  <div
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-black text-xl sm:text-2xl shadow-2xl transition-transform hover:scale-105 select-none ${
                      isPlayWhe
                        ? "w-20 h-20 sm:w-24 sm:h-24 text-3xl sm:text-4xl"
                        : ""
                    }`}
                    style={{
                      background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${gameConfig.accentHex} 45%, #050505 100%)`,
                      boxShadow: `0 8px 24px -2px ${gameConfig.glowHex}, inset 0 -4px 8px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.9)`
                    }}
                  >
                    {/* Gloss Reflection Layer */}
                    <div className="absolute inset-0 rounded-full ball-3d-gloss pointer-events-none" />

                    {/* Ball Number */}
                    <span className="relative z-10 text-slate-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] font-mono font-black">
                      {selectedGame === "pick4" ? num : String(num).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Slot Sub-Label / Chinapoo Name */}
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    {isPlayWhe
                      ? CHINAPOO_CHART[num]?.mark || `Mark #${num}`
                      : `Slot #${idx + 1}`}
                  </span>
                </div>
              );
            })}

            {/* Lotto Plus Bonus Powerball */}
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
                    boxShadow: "0 8px 24px -2px rgba(239, 68, 68, 0.6), inset 0 -4px 8px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.9)"
                  }}
                >
                  <div className="absolute inset-0 rounded-full ball-3d-gloss pointer-events-none" />
                  <span className="relative z-10 text-white font-mono font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {primaryBonus}
                  </span>
                </div>
                <span className="text-[10px] text-red-400 font-black uppercase tracking-wider">
                  Powerball
                </span>
              </div>
            )}

            {/* Cash Pot Multiplier Ball */}
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
                  style={{
                    boxShadow: "0 8px 20px -2px rgba(234, 179, 8, 0.5)"
                  }}
                >
                  <span className="font-mono font-black">
                    {primaryMultiplier}X
                  </span>
                </div>
                <span className="text-[10px] text-yellow-400 font-black uppercase tracking-wider">
                  Multiplier
                </span>
              </div>
            )}
          </div>

          {/* Under-Chamber Cradle Floor Lighting */}
          <div
            className="w-3/4 h-2 rounded-full blur-md mt-2 transition-colors duration-500 opacity-70"
            style={{ background: gameConfig.accentHex }}
          />
        </div>
      </div>

      {/* METRIC ANALYSIS BAR */}
      {ticketMetrics && (
        <div className="relative z-10 p-3.5 rounded-xl bg-slate-900/70 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-300">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {selectedGame !== "play-whe" && (
              <>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase block">Sum Total</span>
                  <span className="font-black text-white text-sm">
                    {ticketMetrics.sum}
                  </span>
                </div>

                <div className="h-6 w-px bg-white/10" />

                <div>
                  <span className="text-gray-500 text-[10px] uppercase block">Parity Ratio</span>
                  <span className="font-black text-cyan-300 text-sm">
                    {ticketMetrics.odds}O : {ticketMetrics.evens}E
                  </span>
                </div>

                <div className="h-6 w-px bg-white/10" />
              </>
            )}

            {selectedGame === "pick4" ? (
              <div>
                <span className="text-gray-500 text-[10px] uppercase block">Combinatorial Form</span>
                <span className="font-black text-purple-300 text-sm">
                  {ticketMetrics.formType}
                </span>
              </div>
            ) : selectedGame === "play-whe" ? (
              <div>
                <span className="text-gray-500 text-[10px] uppercase block">Chinapoo Folkloric Lineage</span>
                <span className="font-black text-amber-300 text-sm">
                  #{primaryPicks[0]} • {CHINAPOO_CHART[primaryPicks[0]]?.mark} (Line {((primaryPicks[0] - 1) % 9) + 1})
                </span>
              </div>
            ) : (
              <div>
                <span className="text-gray-500 text-[10px] uppercase block">Gaussian Status</span>
                <span className={`font-black text-sm ${ticketMetrics.inGaussian ? "text-emerald-400" : "text-amber-400"}`}>
                  {ticketMetrics.inGaussian ? "✓ In 75% Centroid Band" : "Tail Distribution"}
                </span>
              </div>
            )}
          </div>

          <div className="text-[10px] text-gray-400">
            Strategy: <strong className="text-white capitalize">{strategy}</strong>
          </div>
        </div>
      )}

      {/* ADDITIONAL LINES (IF MULTI-LINE SELECTED) */}
      {additionalLines.length > 0 && (
        <div className="mt-4 space-y-2 relative z-10">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
            Additional Generated Lines:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {additionalLines.map((line, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs hover:border-white/15 transition"
              >
                <span className="text-gray-500 font-bold text-[10px]">Line #{idx + 2}</span>
                <div className="flex items-center gap-1.5">
                  {line.numbers.map((n, i) => (
                    <span
                      key={i}
                      className="w-7 h-7 rounded-lg bg-slate-800 border border-white/10 text-white font-bold text-xs flex items-center justify-center"
                    >
                      {selectedGame === "pick4" ? n : String(n).padStart(2, "0")}
                    </span>
                  ))}
                  {line.bonus && (
                    <span className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-400 text-red-300 font-bold text-xs flex items-center justify-center">
                      {line.bonus}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopyTicket(line.numbers, line.bonus, idx + 1)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                    title="Copy line"
                  >
                    {copiedIndex === idx + 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleSendToSyndicate(line.numbers, line.bonus)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-white/10 transition"
                    title="Send to Syndicate"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BIG PRIMARY ACTION BUTTONS */}
      <div className="mt-6 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Main Drop Button */}
          <button
            onClick={executeBallDrop}
            disabled={isDropping}
            className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 ${
              isDropping
                ? "bg-slate-800 text-gray-400 border border-white/10"
                : "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95"
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isDropping ? "animate-spin" : ""}`} />
            <span>{isDropping ? "DISPENSING BALLS..." : "DROP QUICK PICK"}</span>
          </button>

          {/* Quick Copy Primary */}
          <button
            onClick={() => handleCopyTicket(primaryPicks, primaryBonus, 0)}
            className="px-4 py-3.5 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            title="Copy primary numbers"
          >
            {copiedIndex === 0 ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">COPY</span>
          </button>

          {/* Send to Syndicate */}
          <button
            onClick={() => handleSendToSyndicate(primaryPicks, primaryBonus)}
            className="px-4 py-3.5 rounded-xl bg-slate-900 border border-white/10 hover:border-amber-400/40 text-amber-300 hover:text-amber-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            title="Queue for Syndicate ticket slip"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">SYNDICATE</span>
          </button>
        </div>

        {/* View Deep Game Engine CTA */}
        {onSelectGame && (
          <button
            onClick={() => onSelectGame(selectedGame)}
            className="w-full sm:w-auto px-4 py-3 text-xs text-gray-400 hover:text-white transition flex items-center justify-center sm:justify-end gap-1.5 cursor-pointer group"
          >
            <span>Launch {gameConfig.shortName} Full Analytics</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400 transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>
    </div>
  );
}
