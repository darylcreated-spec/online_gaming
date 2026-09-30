"use client";

import React, { useState, useEffect } from "react";
import { Clock, Calendar, RefreshCw, Zap, Sparkles, CheckCircle2 } from "lucide-react";

interface NextDrawInfo {
  game: "Play Whe" | "Pick 4" | "Cash Pot" | "Lotto Plus" | "Win for Life";
  gameKey: "play-whe" | "pick4" | "cashpot" | "lotto-plus" | "win-for-life";
  name: string;
  targetDate: Date;
  secondsRemaining: number;
  totalIntervalSeconds: number;
  timeStringAST: string;
}

export default function LiveDrawTicker({
  onSelectGame
}: {
  onSelectGame?: (game: "welcome" | "lotto-plus" | "play-whe" | "win-for-life" | "cashpot" | "pick4") => void;
}) {
  const [nextDraw, setNextDraw] = useState<NextDrawInfo | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success">("idle");
  const [lastSyncText, setLastSyncText] = useState<string>("Active");
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [mounted, setMounted] = useState(false);

  // Clock tick interval for live AST time display
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate upcoming draws across all 5 games based on AST (UTC-4)
  const calculateNextDraw = (): NextDrawInfo => {
    const now = new Date();
    const astMs = now.getTime() - 4 * 60 * 60 * 1000;
    const astDate = new Date(astMs);

    const candidates: {
      game: "Play Whe" | "Pick 4" | "Cash Pot" | "Lotto Plus" | "Win for Life";
      gameKey: "play-whe" | "pick4" | "cashpot" | "lotto-plus" | "win-for-life";
      name: string;
      date: Date;
      intervalHrs: number;
    }[] = [];

    // Helper to build AST date for a given day offset and hour/minute
    const makeASTDate = (dayOffset: number, hours: number, minutes: number) => {
      const d = new Date(now);
      d.setUTCHours(hours + 4, minutes, 0, 0);
      d.setUTCDate(d.getUTCDate() + dayOffset);
      return d;
    };

    // 1. Play Whe & Pick 4 (Mon-Sun at 10:30 AM, 1:00 PM, 4:00 PM, 7:00 PM AST)
    const dailySlots = [
      { name: "Morning", h: 10, m: 30, interval: 3.5 },
      { name: "Midday", h: 13, m: 0, interval: 2.5 },
      { name: "Afternoon", h: 16, m: 0, interval: 3.0 },
      { name: "Evening", h: 19, m: 0, interval: 3.0 },
    ];

    for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
      for (const slot of dailySlots) {
        const target = makeASTDate(dayOffset, slot.h, slot.m);
        if (target.getTime() > now.getTime()) {
          candidates.push({ game: "Play Whe", gameKey: "play-whe", name: `Play Whe ${slot.name}`, date: target, intervalHrs: slot.interval });
          candidates.push({ game: "Pick 4", gameKey: "pick4", name: `Pick 4 ${slot.name}`, date: target, intervalHrs: slot.interval });
        }
      }
    }

    // 2. Cash Pot (Mon-Sun at 19:00 AST = 7:00 PM)
    for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
      const target = makeASTDate(dayOffset, 19, 0);
      if (target.getTime() > now.getTime()) {
        candidates.push({ game: "Cash Pot", gameKey: "cashpot", name: "Cash Pot Evening", date: target, intervalHrs: 24 });
      }
    }

    // 3. Lotto Plus draws (Wed & Sat at 20:30 AST = 8:30 PM)
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const checkDay = (astDate.getUTCDay() + dayOffset) % 7;
      if (checkDay === 3 || checkDay === 6) { // Wed or Sat
        const target = makeASTDate(dayOffset, 20, 30);
        if (target.getTime() > now.getTime()) {
          candidates.push({ game: "Lotto Plus", gameKey: "lotto-plus", name: "Lotto Plus Jackpot", date: target, intervalHrs: 72 });
        }
      }
    }

    // 4. Win for Life draws (Tue & Fri at 19:00 AST = 7:00 PM)
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const checkDay = (astDate.getUTCDay() + dayOffset) % 7;
      if (checkDay === 2 || checkDay === 5) { // Tue or Fri
        const target = makeASTDate(dayOffset, 19, 0);
        if (target.getTime() > now.getTime()) {
          candidates.push({ game: "Win for Life", gameKey: "win-for-life", name: "Win for Life Draw", date: target, intervalHrs: 72 });
        }
      }
    }

    // Sort by earliest upcoming
    candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
    const earliest = candidates[0] || {
      game: "Play Whe" as const,
      gameKey: "play-whe" as const,
      name: "Play Whe Morning",
      date: makeASTDate(1, 10, 30),
      intervalHrs: 12
    };

    const secondsRemaining = Math.max(0, Math.floor((earliest.date.getTime() - now.getTime()) / 1000));
    const totalIntervalSeconds = earliest.intervalHrs * 3600;

    const isToday = earliest.date.getUTCDate() === now.getUTCDate();
    const isTomorrow = earliest.date.getUTCDate() === (now.getUTCDate() + 1);
    const dayLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : earliest.date.toLocaleDateString("en-US", { weekday: "short" });
    
    const astHoursRaw = (earliest.date.getUTCHours() - 4 + 24) % 24;
    const hour12 = astHoursRaw % 12 || 12;
    const ampm = astHoursRaw >= 12 ? "PM" : "AM";
    const minFormatted = earliest.date.getUTCMinutes().toString().padStart(2, "0");
    const timeStringAST = `${dayLabel} ${hour12}:${minFormatted} ${ampm}`;

    return {
      game: earliest.game,
      gameKey: earliest.gameKey,
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

  const hoursRemaining = nextDraw ? Math.floor(nextDraw.secondsRemaining / 3600) : 0;
  const minsRemaining = nextDraw ? Math.floor((nextDraw.secondsRemaining % 3600) / 60) : 0;
  const secsRemaining = nextDraw ? nextDraw.secondsRemaining % 60 : 0;

  return (
    <div className="w-full bg-slate-950/75 border-b border-sky-500/15 backdrop-blur-xl px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none relative z-30 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]">
      
      {/* Left: Actual Current Date & Time (AST) */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2 text-sky-400 bg-sky-950/50 border border-sky-500/30 px-3 py-1.5 rounded-lg shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span suppressHydrationWarning className="font-bold text-[11px] sm:text-xs tracking-wide">
            {mounted ? currentTime.toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
              timeZone: "America/Port_of_Spain"
            }) : "Loading..."}
          </span>
        </div>

        <div className="flex items-center gap-2 text-amber-400 bg-amber-950/50 border border-amber-500/30 px-3 py-1.5 rounded-lg shadow-sm">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span suppressHydrationWarning className="font-black font-mono text-[11px] sm:text-xs tracking-wider">
            {mounted ? currentTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
              timeZone: "America/Port_of_Spain"
            }) : "--:--:--"} <span className="text-[10px] text-amber-400/80 font-bold">AST</span>
          </span>
        </div>
      </div>

      {/* Center: Live Upcoming Draw Badge with Live Countdown */}
      {nextDraw && (
        <button
          onClick={() => onSelectGame?.(nextDraw.gameKey)}
          title={`Click to view ${nextDraw.name}`}
          className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-sky-400/20 hover:border-sky-400/50 text-[11px] transition-all cursor-pointer group shadow-inner"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-gray-400 uppercase font-bold text-[10px]">Next:</span>
          <span className="text-sky-300 font-bold group-hover:text-sky-200 transition-colors">{nextDraw.name}</span>
          <span className="text-gray-400">({nextDraw.timeStringAST})</span>
          <span className="text-emerald-400 font-black pl-1.5 border-l border-white/10 flex items-center gap-1">
            <span>{hoursRemaining > 0 ? `${hoursRemaining}h ` : ""}{minsRemaining}m {secsRemaining}s</span>
          </span>
        </button>
      )}

      {/* Right: Cloud Database Connected Badge + Sync Button */}
      <div className="flex items-center gap-2.5">
        {/* Cloud Database Connected Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/60 text-[10px] text-emerald-400 font-bold uppercase tracking-wider shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="hidden sm:inline">Cloud Database Connected</span>
          <span className="sm:hidden">Turso Live</span>
        </div>

        {/* Live Cloud Auto-Sync Button */}
        <button
          onClick={handleManualSyncTrigger}
          disabled={syncStatus === "syncing"}
          title="Click to force immediate Turso Cloud DB sync"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
            syncStatus === "syncing"
              ? "bg-primary/20 border-primary text-primary animate-pulse"
              : syncStatus === "success"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              : "bg-slate-900/70 border-white/10 text-gray-300 hover:text-white hover:border-white/30 hover:bg-slate-800"
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${syncStatus === "syncing" ? "animate-spin text-primary" : "text-emerald-400"}`} />
          <span>
            {syncStatus === "syncing" ? "Syncing..." : syncStatus === "success" ? "Updated!" : `Sync`}
          </span>
        </button>
      </div>

    </div>
  );
}
