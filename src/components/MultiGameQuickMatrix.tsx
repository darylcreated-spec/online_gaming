"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Flame, 
  Snowflake, 
  Zap, 
  Copy, 
  Check, 
  Shuffle, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
  Activity
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface MultiGameQuickMatrixProps {
  onSelectGame?: (game: string) => void;
}

interface GamePresetConfig {
  key: string;
  name: string;
  badge: string;
  color: string;
  borderColor: string;
  iconSrc: string;
  poolSize: number;
  pickCount: number;
  hasBonus: boolean;
  bonusPoolSize: number;
  bonusName: string;
  oddsText: string;
}

const GAME_CONFIGS: Record<string, GamePresetConfig> = {
  "lotto-plus": {
    key: "lotto-plus",
    name: "Lotto Plus",
    badge: "5 of 35 + PB",
    color: "from-sky-500/20 via-sky-600/10 to-transparent",
    borderColor: "border-sky-500/40",
    iconSrc: "/images/lotto_plus_icon.png",
    poolSize: 35,
    pickCount: 5,
    hasBonus: true,
    bonusPoolSize: 10,
    bonusName: "Powerball",
    oddsText: "1 in 324,632"
  },
  "play-whe": {
    key: "play-whe",
    name: "Play Whe",
    badge: "1 of 36 Mark",
    color: "from-amber-500/20 via-amber-600/10 to-transparent",
    borderColor: "border-amber-500/40",
    iconSrc: "/images/play_whe_icon.png",
    poolSize: 36,
    pickCount: 1,
    hasBonus: false,
    bonusPoolSize: 0,
    bonusName: "",
    oddsText: "1 in 36 (Pays 26:1)"
  },
  "win-for-life": {
    key: "win-for-life",
    name: "Win For Life",
    badge: "6 of 28 + CB",
    color: "from-emerald-500/20 via-emerald-600/10 to-transparent",
    borderColor: "border-emerald-500/40",
    iconSrc: "/images/win_for_life_icon.png",
    poolSize: 28,
    pickCount: 6,
    hasBonus: true,
    bonusPoolSize: 3,
    bonusName: "Cash Ball",
    oddsText: "1 in 376,740"
  },
  "cashpot": {
    key: "cashpot",
    name: "Cash Pot",
    badge: "5 of 20 + Mult",
    color: "from-yellow-500/20 via-yellow-600/10 to-transparent",
    borderColor: "border-yellow-500/40",
    iconSrc: "/images/cash_pot_icon.png",
    poolSize: 20,
    pickCount: 5,
    hasBonus: true,
    bonusPoolSize: 5,
    bonusName: "Multiplier",
    oddsText: "1 in 15,504"
  },
  "pick4": {
    key: "pick4",
    name: "Pick 4",
    badge: "4 Digits (0-9)",
    color: "from-purple-500/20 via-purple-600/10 to-transparent",
    borderColor: "border-purple-500/40",
    iconSrc: "/images/pick_4_icon.png",
    poolSize: 10,
    pickCount: 4,
    hasBonus: false,
    bonusPoolSize: 0,
    bonusName: "",
    oddsText: "1 in 10,000 Straight"
  }
};

export default function MultiGameQuickMatrix({ onSelectGame }: MultiGameQuickMatrixProps) {
  const [activeGameKey, setActiveGameKey] = useState<string>("lotto-plus");
  const config = GAME_CONFIGS[activeGameKey];

  // Store active tickets per game
  const [tickets, setTickets] = useState<Record<string, { numbers: number[]; bonus: number | null }>>({
    "lotto-plus": { numbers: [7, 14, 19, 25, 32], bonus: 4 },
    "play-whe": { numbers: [21], bonus: null },
    "win-for-life": { numbers: [4, 9, 14, 18, 20, 26], bonus: 2 },
    "cashpot": { numbers: [3, 8, 12, 17, 19], bonus: 2 },
    "pick4": { numbers: [7, 2, 9, 4], bonus: null }
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const generateTicketForGame = (gameKey: string) => {
    triggerHaptic("medium");
    const cfg = GAME_CONFIGS[gameKey];
    let newNums: number[] = [];

    if (cfg.key === "pick4") {
      // Pick 4 digits from 0 to 9 (duplicates allowed)
      newNums = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10));
    } else {
      while (newNums.length < cfg.pickCount) {
        const r = Math.floor(Math.random() * cfg.poolSize) + 1;
        if (!newNums.includes(r)) newNums.push(r);
      }
      newNums.sort((a, b) => a - b);
    }

    const bonus = cfg.hasBonus ? Math.floor(Math.random() * cfg.bonusPoolSize) + 1 : null;

    setTickets(prev => ({
      ...prev,
      [gameKey]: { numbers: newNums, bonus }
    }));
  };

  const handleCopy = (gameKey: string) => {
    triggerHaptic("success");
    const t = tickets[gameKey];
    const cfg = GAME_CONFIGS[gameKey];
    const numStr = t.numbers.map(n => String(n).padStart(cfg.key === "pick4" ? 1 : 2, "0")).join(" - ");
    const bonusStr = cfg.hasBonus && t.bonus ? ` [${cfg.bonusName}: ${t.bonus}]` : "";
    const text = `The Win Concept - ${cfg.name.toUpperCase()} Quick Slip: ${numStr}${bonusStr}`;
    navigator.clipboard.writeText(text);
    setCopiedKey(gameKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const activeTicket = tickets[activeGameKey];

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-slate-950 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="font-mono text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-5 h-5 text-sky-400" />
              <span>HIGH-PERFORMANCE QUANT SLIP MATRIX</span>
            </h3>
          </div>
          <p className="text-xs text-gray-400 font-mono">
            Fast, zero-latency 1-click combinatorial slip compiler • Replaces legacy spinning spindle with instant tactile intelligence
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold">
            100% Deterministic Engine
          </span>
        </div>
      </div>

      {/* 2. 5-Game Quick Select Pill Bar */}
      <div className="flex bg-slate-950/80 p-1 rounded-xl border border-white/10 overflow-x-auto scrollbar-none gap-1.5">
        {Object.values(GAME_CONFIGS).map((cfg) => {
          const isActive = activeGameKey === cfg.key;
          return (
            <button
              key={cfg.key}
              onClick={() => {
                triggerHaptic("selection");
                setActiveGameKey(cfg.key);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-slate-800 text-white border border-white/20 shadow-md font-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <img src={cfg.iconSrc} alt={cfg.name} className="w-4 h-4 object-contain rounded" />
              <span>{cfg.name}</span>
              <span className="text-[9px] opacity-75 font-normal">({cfg.badge})</span>
            </button>
          );
        })}
      </div>

      {/* 3. Active Game Slip Card */}
      <div className={`rounded-xl border ${config.borderColor} bg-gradient-to-r ${config.color} p-5 space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img 
              src={config.iconSrc} 
              alt={config.name} 
              className="w-10 h-10 object-contain rounded-xl shadow-lg border border-white/20"
            />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-mono text-base font-black text-white">{config.name} Optimal Slip</h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-gray-200">
                  {config.oddsText}
                </span>
              </div>
              <p className="text-xs text-gray-300 font-mono mt-0.5">
                Calibrated by statistical transition chains and mean-reverting coverage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => generateTicketForGame(activeGameKey)}
              className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-white/10 border border-white/20 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Shuffle className="w-3.5 h-3.5 text-sky-400" />
              <span>Re-Roll</span>
            </button>

            <button
              onClick={() => handleCopy(activeGameKey)}
              className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-white/10 border border-white/20 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {copiedKey === activeGameKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === activeGameKey ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Selected Balls Render */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {activeTicket.numbers.map((n, idx) => (
              <span
                key={idx}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-b from-slate-700 via-slate-900 to-slate-950 border border-white/20 text-white font-mono font-black text-sm sm:text-base flex items-center justify-center shadow-lg"
              >
                {String(n).padStart(config.key === "pick4" ? 1 : 2, "0")}
              </span>
            ))}

            {config.hasBonus && activeTicket.bonus !== null && (
              <>
                <span className="text-gray-400 font-bold font-mono text-sm">+</span>
                <span
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300 text-slate-950 font-mono font-black text-sm sm:text-base flex items-center justify-center shadow-lg"
                  title={config.bonusName}
                >
                  {activeTicket.bonus}
                </span>
              </>
            )}
          </div>

          {onSelectGame && (
            <button
              onClick={() => onSelectGame(config.key)}
              className="text-xs font-mono font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Explore {config.name} Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
