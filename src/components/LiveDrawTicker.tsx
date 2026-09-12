"use client";

import React, { useState, useEffect } from "react";
import { Clock, Calendar, RefreshCw, Zap, Sparkles, CheckCircle2 } from "lucide-react";

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
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  // Clock tick interval for live AST time display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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



  return (
    <div className="w-full bg-slate-950/80 border-b border-white/5 backdrop-blur-md px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none">
      
      {/* Left: Actual Current Date & Time (AST) */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sky-400 bg-sky-950/40 border border-sky-500/20 px-3 py-1.5 rounded-lg shadow-sm">
          <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-bold text-[11px] sm:text-xs tracking-wide">
            {currentTime.toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
              timeZone: "America/Port_of_Spain"
            })}
          </span>
        </div>

        <div className="flex items-center gap-2 text-amber-400 bg-amber-950/40 border border-amber-500/20 px-3 py-1.5 rounded-lg shadow-sm">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-black font-mono text-[11px] sm:text-xs tracking-wider">
            {currentTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
              timeZone: "America/Port_of_Spain"
            })} <span className="text-[10px] text-amber-400/80 font-bold">AST</span>
          </span>
        </div>
      </div>

      {/* Right: Cloud Database Connected Badge + Sync Button */}
      <div className="flex items-center gap-2.5">
        {/* Cloud Database Connected Badge matching button size */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/50 text-[10px] text-emerald-400 font-bold uppercase tracking-wider shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span>Cloud Database Connected</span>
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
              : "bg-slate-900/60 border-white/5 text-gray-400 hover:text-white hover:border-white/20"
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
