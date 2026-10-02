"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Flame, 
  Snowflake, 
  Zap, 
  Copy, 
  Check, 
  RefreshCw, 
  Shuffle, 
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface TactileQuantMatrixProps {
  game?: "lotto-plus" | "play-whe" | "win-for-life" | "cashpot" | "pick4";
  poolSize?: number;
  pickCount?: number;
  hasBonus?: boolean;
  bonusPoolSize?: number;
  bonusName?: string;
  onApplyTicket?: (numbers: number[], bonus?: number | null) => void;
  onNavigateGame?: (game: string) => void;
}

export default function TactileQuantMatrix({
  game = "lotto-plus",
  poolSize = 35,
  pickCount = 5,
  hasBonus = true,
  bonusPoolSize = 10,
  bonusName = "Powerball",
  onApplyTicket,
  onNavigateGame
}: TactileQuantMatrixProps) {
  const [selectedNums, setSelectedNums] = useState<number[]>(() => {
    // Generate initial balanced ticket
    const initial: number[] = [];
    while (initial.length < pickCount) {
      const r = Math.floor(Math.random() * poolSize) + 1;
      if (!initial.includes(r)) initial.push(r);
    }
    return initial.sort((a, b) => a - b);
  });

  const [selectedBonus, setSelectedBonus] = useState<number | null>(() => {
    return hasBonus ? Math.floor(Math.random() * bonusPoolSize) + 1 : null;
  });

  const [copied, setCopied] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "hot" | "cold" | "balanced" | "random">("balanced");

  // Statistical mock indicators (calibrated to NLCB historical distributions)
  const hotNumbers = [7, 14, 17, 21, 28, 32].filter(n => n <= poolSize);
  const coldNumbers = [3, 9, 13, 23, 29, 34].filter(n => n <= poolSize);

  const toggleNumber = (num: number) => {
    triggerHaptic("selection");
    if (selectedNums.includes(num)) {
      setSelectedNums(selectedNums.filter(n => n !== num));
    } else {
      if (selectedNums.length < pickCount) {
        setSelectedNums([...selectedNums, num].sort((a, b) => a - b));
      } else {
        // Replace oldest or shift
        setSelectedNums([...selectedNums.slice(1), num].sort((a, b) => a - b));
      }
    }
  };

  const handleGeneratePreset = (mode: "random" | "hot" | "cold" | "balanced") => {
    triggerHaptic("medium");
    setFilterMode(mode);

    let candidates: number[] = [];
    if (mode === "hot") {
      candidates = [...hotNumbers];
    } else if (mode === "cold") {
      candidates = [...coldNumbers];
    }

    const newTicket: number[] = [];
    // pick from candidates if available
    while (newTicket.length < pickCount && candidates.length > 0) {
      const randIdx = Math.floor(Math.random() * candidates.length);
      const chosen = candidates.splice(randIdx, 1)[0];
      if (!newTicket.includes(chosen)) newTicket.push(chosen);
    }

    // fill remaining
    while (newTicket.length < pickCount) {
      const r = Math.floor(Math.random() * poolSize) + 1;
      if (!newTicket.includes(r)) newTicket.push(r);
    }

    newTicket.sort((a, b) => a - b);
    setSelectedNums(newTicket);

    if (hasBonus) {
      setSelectedBonus(Math.floor(Math.random() * bonusPoolSize) + 1);
    }

    if (onApplyTicket) {
      onApplyTicket(newTicket, hasBonus ? (selectedBonus || 1) : null);
    }
  };

  const handleCopy = () => {
    triggerHaptic("success");
    const numStr = selectedNums.map(n => String(n).padStart(2, "0")).join(" - ");
    const bonusStr = hasBonus && selectedBonus ? ` [${bonusName}: ${selectedBonus}]` : "";
    const text = `The Win Concept - ${game.toUpperCase()} Quick Slip: ${numStr}${bonusStr}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sum = selectedNums.reduce((a, b) => a + b, 0);
  const odds = selectedNums.filter(n => n % 2 !== 0).length;
  const evens = selectedNums.length - odds;

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-slate-900/60 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <h3 className="font-mono text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>QUANT NUMBER MATRIX & SMART QUICK PICK</span>
            </h3>
          </div>
          <p className="text-xs text-gray-400 font-mono">
            Interactive high-density matrix selector • Click any number to toggle or trigger algorithmic presets
          </p>
        </div>

        {/* Presets Control Pill */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => handleGeneratePreset("balanced")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
              filterMode === "balanced"
                ? "bg-sky-500 text-slate-950 font-black shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Balanced
          </button>
          <button
            onClick={() => handleGeneratePreset("hot")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              filterMode === "hot"
                ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                : "text-gray-400 hover:text-amber-300"
            }`}
          >
            <Flame className="w-3 h-3 text-amber-400 fill-current" />
            Hot
          </button>
          <button
            onClick={() => handleGeneratePreset("cold")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              filterMode === "cold"
                ? "bg-cyan-500 text-slate-950 font-black shadow-sm"
                : "text-gray-400 hover:text-cyan-300"
            }`}
          >
            <Snowflake className="w-3 h-3 text-cyan-400" />
            Cold
          </button>
          <button
            onClick={() => handleGeneratePreset("random")}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Randomize"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Visual Selected Slip Display */}
      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
            Active Slip ({selectedNums.length}/{pickCount}):
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {selectedNums.map((num) => (
              <span
                key={num}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-sky-400 via-sky-600 to-slate-900 border border-sky-300/40 text-white font-mono font-black text-sm flex items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.35)]"
              >
                {String(num).padStart(2, "0")}
              </span>
            ))}
            {hasBonus && selectedBonus !== null && (
              <>
                <span className="text-gray-500 font-bold font-mono text-sm">+</span>
                <span
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300/50 text-slate-950 font-mono font-black text-sm flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                  title={bonusName}
                >
                  {selectedBonus}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Real-time Slip Metrics */}
        <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
          <div>
            Sum: <span className="text-sky-400 font-bold">{sum}</span>
          </div>
          <div>
            Parity: <span className="text-gray-200 font-bold">{odds}O/{evens}E</span>
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-gray-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* 3. The Number Matrix Grid (1 to poolSize) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
          <span>SELECT NUMBERS (1 TO {poolSize})</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Hot Ball</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Cold Ball</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-12 gap-1.5 sm:gap-2">
          {Array.from({ length: poolSize }, (_, i) => i + 1).map((num) => {
            const isSelected = selectedNums.includes(num);
            const isHot = hotNumbers.includes(num);
            const isCold = coldNumbers.includes(num);

            return (
              <button
                key={num}
                onClick={() => toggleNumber(num)}
                className={`relative h-10 sm:h-11 rounded-xl flex flex-col items-center justify-center font-mono transition-all duration-150 select-none cursor-pointer ${
                  isSelected
                    ? "bg-sky-500 text-slate-950 font-black shadow-[0_0_15px_rgba(56,189,248,0.4)] scale-105 z-10 ring-2 ring-sky-300"
                    : "border border-white/5 bg-slate-950/60 hover:border-sky-400/40 hover:bg-slate-900 text-slate-300 active:scale-95"
                }`}
              >
                <span className="text-xs sm:text-sm font-bold tracking-tight">
                  {String(num).padStart(2, "0")}
                </span>

                {/* Sub Indicator */}
                <div className="absolute top-1 right-1">
                  {isHot && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 block shadow-[0_0_4px_rgba(245,158,11,0.8)]" />
                  )}
                  {isCold && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 block shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Bonus Ball Selector (if game has bonus) */}
      {hasBonus && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="text-[11px] font-mono text-gray-400 uppercase">
            {bonusName} (1 TO {bonusPoolSize})
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {Array.from({ length: bonusPoolSize }, (_, i) => i + 1).map((b) => {
              const isSelected = selectedBonus === b;
              return (
                <button
                  key={b}
                  onClick={() => {
                    triggerHaptic("selection");
                    setSelectedBonus(b);
                    if (onApplyTicket) onApplyTicket(selectedNums, b);
                  }}
                  className={`w-9 h-9 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105"
                      : "border border-white/5 bg-slate-950/60 hover:border-amber-400/40 text-amber-200"
                  }`}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
        <button
          onClick={() => {
            if (onApplyTicket) {
              onApplyTicket(selectedNums, selectedBonus);
              alert("Quick Slip applied to Ticket Builder!");
            }
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>USE THIS SLIP IN WHEEL BUILDER</span>
        </button>

        {onNavigateGame && (
          <button
            onClick={() => onNavigateGame(game)}
            className="text-xs font-mono text-gray-400 hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Open {game.toUpperCase()} Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
