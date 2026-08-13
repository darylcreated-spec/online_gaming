"use client";

import React, { useState, useEffect } from "react";
import { Clock, RefreshCw, Zap, Sparkles, CheckCircle2 } from "lucide-react";

interface NextDrawInfo {
  game: "Play Whe" | "Lotto Plus" | "Win for Life";
  name: string;
  targetDate: Date;
  secondsRemaining: number;
  totalIntervalSeconds: number;
  timeStringAST: string;
}

export default function LiveDrawTicker({
  onSelectGame
}: {
  onSelectGame?: (game: "welcome" | "lotto-plus" | "play-whe" | "win-for-life") => void;
}) {
  const [nextDraw, setNextDraw] = useState<NextDrawInfo | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success">("idle");
  const [lastSyncText, setLastSyncText] = useState<string>("Active");

  // Calculate upcoming draws across all 3 games based on AST (UTC-4)
  const calculateNextDraw = (): NextDrawInfo => {
    const now = new Date();
    // Current UTC time + calculate AST time
    const astMs = now.getTime() - 4 * 60 * 60 * 1000;
    const astDate = new Date(astMs);

    const candidates: { game: "Play Whe" | "Lotto Plus" | "Win for Life"; name: string; date: Date; intervalHrs: number }[] = [];

    // Helper to build AST date for a given day offset and hour/minute
    const makeASTDate = (dayOffset: number, hours: number, minutes: number) => {
      const d = new Date(now);
      // reset to today's UTC midnight, adjust for AST offset
      d.setUTCHours(hours + 4, minutes, 0, 0);
      d.setUTCDate(d.getUTCDate() + dayOffset);
      return d;
    };

    // 1. Play Whe draws (Mon-Sun at 10:30 AM, 1:00 PM, 4:00 PM, 7:00 PM AST)
    const pwSlots = [
      { name: "Play Whe Morning", h: 10, m: 30, interval: 3.5 },
      { name: "Play Whe Midday", h: 13, m: 0, interval: 2.5 },
      { name: "Play Whe Afternoon", h: 16, m: 0, interval: 3.0 },
      { name: "Play Whe Evening", h: 19, m: 0, interval: 3.0 },
    ];

    for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
      // Play Whe is drawn 7 days a week (Monday to Sunday)
      for (const slot of pwSlots) {
        const target = makeASTDate(dayOffset, slot.h, slot.m);
        if (target.getTime() > now.getTime()) {
          candidates.push({ game: "Play Whe", name: slot.name, date: target, intervalHrs: slot.interval });
        }
      }
    }

    // 2. Lotto Plus draws (Wed & Sat at 20:30 AST = 8:30 PM)
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const checkDay = (astDate.getUTCDay() + dayOffset) % 7;
      if (checkDay === 3 || checkDay === 6) { // Wed or Sat
        const target = makeASTDate(dayOffset, 20, 30);
        if (target.getTime() > now.getTime()) {
          candidates.push({ game: "Lotto Plus", name: "Lotto Plus Jackpot", date: target, intervalHrs: 72 });
        }
      }
    }

    // 3. Win for Life draws (Tue & Fri at 20:30 AST = 8:30 PM)
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const checkDay = (astDate.getUTCDay() + dayOffset) % 7;
      if (checkDay === 2 || checkDay === 5) { // Tue or Fri
        const target = makeASTDate(dayOffset, 20, 30);
        if (target.getTime() > now.getTime()) {
          candidates.push({ game: "Win for Life", name: "Win for Life Draw", date: target, intervalHrs: 72 });
        }
      }
    }

    // Sort by earliest upcoming
    candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
    const earliest = candidates[0] || {
      game: "Play Whe",
      name: "Play Whe Morning",
      date: makeASTDate(1, 10, 30),
      intervalHrs: 12
    };

    const secondsRemaining = Math.max(0, Math.floor((earliest.date.getTime() - now.getTime()) / 1000));
    const totalIntervalSeconds = earliest.intervalHrs * 3600;

    // Time string format (e.g. "Today 6:30 PM")
    const isToday = earliest.date.getUTCDate() === now.getUTCDate();
    const isTomorrow = earliest.date.getUTCDate() === (now.getUTCDate() + 1);
    const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : earliest.date.toLocaleDateString("en-US", { weekday: "short" });
    
    // AST hours
    const astHoursRaw = (earliest.date.getUTCHours() - 4 + 24) % 24;
    const hour12 = astHoursRaw % 12 || 12;
    const ampm = astHoursRaw >= 12 ? "PM" : "AM";
    const minFormatted = earliest.date.getUTCMinutes().toString().padStart(2, "0");
    const timeStringAST = `${dayLabel} ${hour12}:${minFormatted} ${ampm}`;

    return {
      game: earliest.game,
      name: earliest.name,
      targetDate: earliest.date,
      secondsRemaining,
      totalIntervalSeconds,
      timeStringAST
    };
  };

  // Ticker countdown interval
  useEffect(() => {
    setNextDraw(calculateNextDraw());

    const timer = setInterval(() => {
      setNextDraw(calculateNextDraw());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update last sync text
  useEffect(() => {
    const updateSyncLabel = () => {
      if (typeof window === "undefined") return;
      const ts = localStorage.getItem("win_concept_last_sync_timestamp");
      if (!ts) {
        setLastSyncText("Live");
        return;
      }
      const diffSec = Math.floor((Date.now() - parseInt(ts, 10)) / 1000);
      if (diffSec < 60) setLastSyncText("Just now");
      else if (diffSec < 3600) setLastSyncText(`${Math.floor(diffSec / 60)}m ago`);
      else setLastSyncText(`${Math.floor(diffSec / 3600)}h ago`);
    };

    updateSyncLabel();
    const interval = setInterval(updateSyncLabel, 30000);
    return () => clearInterval(interval);
  }, [syncStatus]);

  const handleManualSyncTrigger = async () => {
    if (syncStatus === "syncing") return;
    setSyncStatus("syncing");
    try {
      const res = await fetch("/api/cron/sync-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      localStorage.setItem("win_concept_last_sync_timestamp", Date.now().toString());
      setSyncStatus("success");
      window.dispatchEvent(new CustomEvent("win_concept_sync_completed", { detail: data }));
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (e) {
      setSyncStatus("idle");
    }
  };

  // Auto-trigger sync 15s after a scheduled draw occurs
  useEffect(() => {
    if (nextDraw && nextDraw.secondsRemaining === 0) {
      const timer = setTimeout(() => {
        handleManualSyncTrigger();
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [nextDraw?.secondsRemaining]);

  if (!nextDraw) return null;

  const hours = Math.floor(nextDraw.secondsRemaining / 3600);
  const minutes = Math.floor((nextDraw.secondsRemaining % 3600) / 60);
  const seconds = nextDraw.secondsRemaining % 60;

  const progressPercent = Math.max(0, Math.min(100, ((nextDraw.totalIntervalSeconds - nextDraw.secondsRemaining) / nextDraw.totalIntervalSeconds) * 100));

  const gameColors = {
    "Play Whe": {
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      accent: "text-amber-400",
      ring: "stroke-amber-400",
      glow: "shadow-[0_0_15px_rgba(251,191,36,0.2)]",
      tab: "play-whe" as const
    },
    "Lotto Plus": {
      badge: "bg-sky-500/10 text-sky-400 border-sky-500/30",
      accent: "text-sky-400",
      ring: "stroke-sky-400",
      glow: "shadow-[0_0_15px_rgba(56,189,248,0.2)]",
      tab: "lotto-plus" as const
    },
    "Win for Life": {
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      accent: "text-emerald-400",
      ring: "stroke-emerald-400",
      glow: "shadow-[0_0_15px_rgba(52,211,153,0.2)]",
      tab: "win-for-life" as const
    }
  };

  const currentTheme = gameColors[nextDraw.game];

  return (
    <div className="w-full bg-slate-950/80 border-b border-white/5 backdrop-blur-md px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none">
      
      {/* Left: Next Draw Countdown Banner */}
      <div 
        onClick={() => onSelectGame && onSelectGame(currentTheme.tab)}
        className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
      >
        {/* Animated Progress Ring */}
        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-800"
              strokeWidth="3"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={`${currentTheme.ring} transition-all duration-1000`}
              strokeDasharray={`${progressPercent}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <Clock className={`w-3.5 h-3.5 ${currentTheme.accent} absolute`} />
        </div>

        {/* Game & Time Details */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.2 rounded border text-[9px] font-black uppercase tracking-wider ${currentTheme.badge}`}>
              {nextDraw.game}
            </span>
            <span className="text-white font-bold text-[11px] truncate max-w-[160px] sm:max-w-none">
              {nextDraw.name}
            </span>
          </div>
          <p className="text-[10px] text-gray-400">
            Draws at <span className="text-white font-semibold">{nextDraw.timeStringAST}</span> AST
          </p>
        </div>
      </div>

      {/* Center / Right: Countdown Digits */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/5 px-3 py-1.5 rounded-lg">
          <div className="text-center">
            <span className="text-sm font-black text-white">{String(hours).padStart(2, "0")}</span>
            <span className="text-[8px] text-gray-500 block uppercase">HRS</span>
          </div>
          <span className="text-gray-600 font-black text-xs mb-2">:</span>
          <div className="text-center">
            <span className="text-sm font-black text-white">{String(minutes).padStart(2, "0")}</span>
            <span className="text-[8px] text-gray-500 block uppercase">MIN</span>
          </div>
          <span className="text-gray-600 font-black text-xs mb-2">:</span>
          <div className="text-center">
            <span className={`text-sm font-black ${currentTheme.accent}`}>{String(seconds).padStart(2, "0")}</span>
            <span className="text-[8px] text-gray-500 block uppercase">SEC</span>
          </div>
        </div>

        {/* Right: Live Cloud Auto-Sync Health Badge */}
        <button
          onClick={handleManualSyncTrigger}
          disabled={syncStatus === "syncing"}
          title="Click to force immediate Turso Cloud DB sync"
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
            syncStatus === "syncing"
              ? "bg-primary/20 border-primary text-primary animate-pulse"
              : syncStatus === "success"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              : "bg-slate-900/60 border-white/5 text-gray-400 hover:text-white hover:border-white/20"
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${syncStatus === "syncing" ? "animate-spin text-primary" : "text-emerald-400"}`} />
          <span>
            {syncStatus === "syncing" ? "Syncing..." : syncStatus === "success" ? "Updated!" : `Cloud: ${lastSyncText}`}
          </span>
        </button>
      </div>

    </div>
  );
}
