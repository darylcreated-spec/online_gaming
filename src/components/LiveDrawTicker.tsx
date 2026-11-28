"use client";

import React, { useState, useEffect } from "react";
import { Clock, Calendar, RefreshCw } from "lucide-react";
import ShareAppButton from "@/components/ShareAppButton";

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
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNextDraw(calculateNextDraw());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setNextDraw(calculateNextDraw());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

    const astYear = astDate.getUTCFullYear();
    const astMonth = astDate.getUTCMonth();
    const astDay = astDate.getUTCDate();

    // Construct an exact UTC timestamp for (AST date + dayOffset) at hours:minutes AST (UTC-4)
    const makeASTDate = (dayOffset: number, hours: number, minutes: number) => {
      return new Date(Date.UTC(astYear, astMonth, astDay + dayOffset, hours + 4, minutes, 0, 0));
    };

    const dailySlots = [
      { name: "Morning", h: 10, m: 30, interval: 3.5 },
      { name: "Midday", h: 13, m: 0, interval: 2.5 },
      { name: "Afternoon", h: 16, m: 0, interval: 3.0 },
      { name: "Evening", h: 19, m: 0, interval: 3.0 },
    ];

    // Play Whe & Pick 4 draw Mon-Sat (skip Sunday === 0)
    for (let dayOffset = 0; dayOffset <= 3; dayOffset++) {
      const checkDay = (astDate.getUTCDay() + dayOffset) % 7;
      if (checkDay === 0) continue;
      for (const slot of dailySlots) {
        const target = makeASTDate(dayOffset, slot.h, slot.m);
        if (target.getTime() > now.getTime()) {
          candidates.push({ game: "Play Whe", gameKey: "play-whe", name: `Play Whe ${slot.name}`, date: target, intervalHrs: slot.interval });
          candidates.push({ game: "Pick 4", gameKey: "pick4", name: `Pick 4 ${slot.name}`, date: target, intervalHrs: slot.interval });
        }
      }
    }

    for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
      const target = makeASTDate(dayOffset, 19, 0);
      if (target.getTime() > now.getTime()) {
        candidates.push({ game: "Cash Pot", gameKey: "cashpot", name: "Cash Pot Evening", date: target, intervalHrs: 24 });
      }
    }

    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const checkDay = (astDate.getUTCDay() + dayOffset) % 7;
      if (checkDay === 3 || checkDay === 6) {
        const target = makeASTDate(dayOffset, 20, 30);
        if (target.getTime() > now.getTime()) {
          candidates.push({ game: "Lotto Plus", gameKey: "lotto-plus", name: "Lotto Plus Jackpot", date: target, intervalHrs: 72 });
        }
      }
    }

    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const checkDay = (astDate.getUTCDay() + dayOffset) % 7;
      if (checkDay === 2 || checkDay === 5) {
        const target = makeASTDate(dayOffset, 19, 0);
        if (target.getTime() > now.getTime()) {
          candidates.push({ game: "Win for Life", gameKey: "win-for-life", name: "Win For Life Draw", date: target, intervalHrs: 72 });
        }
      }
    }

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

    const earliestAst = new Date(earliest.date.getTime() - 4 * 60 * 60 * 1000);
    const astDayStartMs = Date.UTC(astYear, astMonth, astDay);
    const earliestAstDayStartMs = Date.UTC(
      earliestAst.getUTCFullYear(),
      earliestAst.getUTCMonth(),
      earliestAst.getUTCDate()
    );
    const dayDiff = Math.round((earliestAstDayStartMs - astDayStartMs) / 86400000);
    const dayLabel =
      dayDiff === 0
        ? "Today"
        : dayDiff === 1
        ? "Tomorrow"
        : earliestAst.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

    const astHoursRaw = (earliest.date.getUTCHours() - 4 + 24) % 24;
    const hour12 = astHoursRaw % 12 || 12;
    const ampm = astHoursRaw >= 12 ? "PM" : "AM";
    const minFormatted = earliest.date.getUTCMinutes().toString().padStart(2, "0");
    const timeStringAST = `${dayLabel} at ${hour12}:${minFormatted} ${ampm}`;

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

  const handleManualSyncTrigger = async (isManualClick: boolean = true) => {
    if (syncStatus === "syncing") return;
    setSyncStatus("syncing");
    try {
      const endpoint = isManualClick ? "/api/sync/pulse?manual=1" : "/api/sync/pulse";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      localStorage.setItem("win_concept_last_sync_timestamp", Date.now().toString());
      setSyncStatus("success");
      window.dispatchEvent(new CustomEvent("win_concept_sync_completed", { detail: data }));
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch {
      setSyncStatus("idle");
    }
  };

  useEffect(() => {
    if (nextDraw && nextDraw.secondsRemaining === 0) {
      const timer = setTimeout(() => {
        handleManualSyncTrigger(false);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [nextDraw?.secondsRemaining]);

  const hoursRemaining = nextDraw ? Math.floor(nextDraw.secondsRemaining / 3600) : 0;
  const minsRemaining = nextDraw ? Math.floor((nextDraw.secondsRemaining % 3600) / 60) : 0;
  const secsRemaining = nextDraw ? nextDraw.secondsRemaining % 60 : 0;

  return (
    <div className="w-full bg-slate-950/75 border-b border-sky-500/15 backdrop-blur-xl px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs font-sans select-none relative z-30">
      {/* Left: Current Date and Trinidad Time */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sky-300 bg-sky-950/50 border border-sky-500/30 px-3 py-1.5 rounded-lg">
          <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span suppressHydrationWarning className="font-semibold text-xs">
            {mounted ? currentTime.toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
              timeZone: "America/Port_of_Spain"
            }) : "Loading"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/50 border border-amber-500/30 px-3 py-1.5 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span suppressHydrationWarning className="font-mono font-bold text-xs tabular-nums">
            {mounted ? currentTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
              timeZone: "America/Port_of_Spain"
            }) : "Loading"} <span className="font-sans font-semibold text-amber-300/80">AST</span>
          </span>
        </div>
      </div>

      {/* Center: Live Upcoming Draw Countdown */}
      {nextDraw && (
        <button
          type="button"
          onClick={() => onSelectGame?.(nextDraw.gameKey)}
          title={`Open ${nextDraw.name}`}
          className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-sky-400/20 hover:border-sky-400/50 text-xs transition-all cursor-pointer group"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-slate-400 font-semibold">Next Draw:</span>
          <span className="text-sky-300 font-bold group-hover:text-sky-200 transition-colors">{nextDraw.name}</span>
          <span className="text-slate-400">({nextDraw.timeStringAST})</span>
          <span className="text-emerald-400 font-mono font-bold pl-2 border-l border-white/10 tabular-nums">
            {hoursRemaining > 0 ? `${hoursRemaining}h ` : ""}{minsRemaining}m {secsRemaining}s
          </span>
        </button>
      )}

      {/* Right: Live Results Status and Refresh Button */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/60 text-xs text-emerald-300 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="hidden sm:inline">Live Results Synced</span>
          <span className="sm:hidden">Live</span>
        </div>

        <button
          type="button"
          onClick={() => handleManualSyncTrigger(true)}
          disabled={syncStatus === "syncing"}
          title="Check for newly published NLCB results"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
            syncStatus === "syncing"
              ? "bg-sky-500/20 border-sky-400 text-sky-300 animate-pulse"
              : syncStatus === "success"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : "bg-slate-900/70 border-white/10 text-slate-200 hover:text-white hover:border-white/30 hover:bg-slate-800"
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "syncing" ? "animate-spin text-sky-300" : "text-emerald-400"}`} />
          <span>
            {syncStatus === "syncing" ? "Updating" : syncStatus === "success" ? "Updated" : "Refresh"}
          </span>
        </button>

        <ShareAppButton />
      </div>
    </div>
  );
}
