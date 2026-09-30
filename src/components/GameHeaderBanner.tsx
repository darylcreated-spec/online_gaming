"use client";

import React, { useState, useEffect } from "react";
import { Clock, Calendar, Database, Sparkles, RefreshCw } from "lucide-react";
import { calculateNextDrawCountdown, DrawCountdown, SupportedGameKey } from "@/lib/draw_schedule";

export interface GameHeaderBannerProps {
  game: SupportedGameKey;
  title: string;
  subtitle: string;
  themeColor: "amber" | "sky" | "emerald" | "yellow" | "purple";
  iconSrc: string;
  latestDraw: {
    draw_number: number | string;
    draw_date: string;
    winning_display?: React.ReactNode;
    time_slot?: string;
  } | null;
  totalDrawsCount?: number;
  loading?: boolean;
}

export default function GameHeaderBanner({
  game,
  title,
  subtitle,
  themeColor,
  iconSrc,
  latestDraw,
  totalDrawsCount,
  loading = false,
}: GameHeaderBannerProps) {
  const [countdown, setCountdown] = useState<DrawCountdown>(() =>
    calculateNextDrawCountdown(game, new Date())
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateNextDrawCountdown(game, new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, [game]);

  const colorStyles = {
    amber: {
      border: "border-amber-500/30 hover:border-amber-400/50",
      gradient: "from-amber-950/30 via-slate-950/80 to-slate-950",
      glow: "shadow-[0_0_25px_rgba(245,158,11,0.12)]",
      titleColor: "text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]",
      badge: "bg-amber-500/15 border-amber-500/30 text-amber-300",
      timeBg: "bg-amber-500/20 text-amber-200 border-amber-400/40",
      iconGlow: "shadow-[0_0_15px_rgba(245,158,11,0.4)] border-amber-500/40",
    },
    sky: {
      border: "border-sky-500/30 hover:border-sky-400/50",
      gradient: "from-sky-950/30 via-slate-950/80 to-slate-950",
      glow: "shadow-[0_0_25px_rgba(56,189,248,0.12)]",
      titleColor: "text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]",
      badge: "bg-sky-500/15 border-sky-500/30 text-sky-300",
      timeBg: "bg-sky-500/20 text-sky-200 border-sky-400/40",
      iconGlow: "shadow-[0_0_15px_rgba(56,189,248,0.4)] border-sky-500/40",
    },
    emerald: {
      border: "border-emerald-500/30 hover:border-emerald-400/50",
      gradient: "from-emerald-950/30 via-slate-950/80 to-slate-950",
      glow: "shadow-[0_0_25px_rgba(52,211,153,0.12)]",
      titleColor: "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]",
      badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
      timeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
      iconGlow: "shadow-[0_0_15px_rgba(52,211,153,0.4)] border-emerald-500/40",
    },
    yellow: {
      border: "border-yellow-500/30 hover:border-yellow-400/50",
      gradient: "from-yellow-950/30 via-slate-950/80 to-slate-950",
      glow: "shadow-[0_0_25px_rgba(250,204,21,0.12)]",
      titleColor: "text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.4)]",
      badge: "bg-yellow-500/15 border-yellow-500/30 text-yellow-300",
      timeBg: "bg-yellow-500/20 text-yellow-200 border-yellow-400/40",
      iconGlow: "shadow-[0_0_15px_rgba(250,204,21,0.4)] border-yellow-500/40",
    },
    purple: {
      border: "border-purple-500/30 hover:border-purple-400/50",
      gradient: "from-purple-950/30 via-slate-950/80 to-slate-950",
      glow: "shadow-[0_0_25px_rgba(168,85,247,0.12)]",
      titleColor: "text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]",
      badge: "bg-purple-500/15 border-purple-500/30 text-purple-300",
      timeBg: "bg-purple-500/20 text-purple-200 border-purple-400/40",
      iconGlow: "shadow-[0_0_15px_rgba(168,85,247,0.4)] border-purple-500/40",
    },
  }[themeColor];

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${colorStyles.gradient} border ${colorStyles.border} ${colorStyles.glow} p-6 space-y-5 backdrop-blur-md relative overflow-hidden transition-all duration-300 card-interactive`}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
        {/* Left: Game Identity */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 group">
            <div className={`absolute -inset-1.5 rounded-2xl opacity-40 blur-md transition-all duration-500 group-hover:opacity-75 ${
              themeColor === 'amber' ? 'bg-amber-500/50' :
              themeColor === 'sky' ? 'bg-sky-500/50' :
              themeColor === 'emerald' ? 'bg-emerald-500/50' :
              themeColor === 'yellow' ? 'bg-yellow-400/50' :
              'bg-purple-500/50'
            }`} />
            <img
              src={iconSrc}
              alt={title}
              className={`relative w-14 h-14 rounded-2xl object-contain shrink-0 border ${colorStyles.iconGlow}`}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-wider font-mono ${colorStyles.titleColor}`}>
                {title}
              </h1>
              {totalDrawsCount && totalDrawsCount > 0 && (
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-mono font-bold flex items-center gap-1.5 shadow-sm ${colorStyles.badge}`}>
                  <Database className="w-3 h-3" />
                  {totalDrawsCount.toLocaleString()} DRAWS (100% DATABASE)
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-mono tracking-wide">{subtitle}</p>
          </div>
        </div>

        {/* Right: Next Draw Countdown Card */}
        <div className="flex items-center gap-3.5 bg-black/60 border border-white/10 px-4 py-3 rounded-xl font-mono shrink-0 w-full sm:w-auto justify-between sm:justify-start shadow-inner backdrop-blur-sm">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Clock className="w-3 h-3 text-sky-400" />
              <span>Next Draw: {countdown.targetLabel}</span>
            </div>
            <div className="text-xs text-gray-300 font-bold">{countdown.targetDateStr}</div>
          </div>

          <div className="flex items-center gap-1 ml-2">
            <div className="flex flex-col items-center">
              <span className={`px-2.5 py-1 rounded-lg text-sm font-black border font-mono shadow-sm ${colorStyles.timeBg}`}>
                {countdown.hours}
              </span>
              <span className="text-[8px] uppercase tracking-tighter text-gray-500 font-sans mt-0.5 font-bold">hrs</span>
            </div>
            <span className="text-xs font-bold text-gray-400 pb-3">:</span>
            <div className="flex flex-col items-center">
              <span className={`px-2.5 py-1 rounded-lg text-sm font-black border font-mono shadow-sm ${colorStyles.timeBg}`}>
                {countdown.minutes}
              </span>
              <span className="text-[8px] uppercase tracking-tighter text-gray-500 font-sans mt-0.5 font-bold">min</span>
            </div>
            <span className="text-xs font-bold text-gray-400 pb-3">:</span>
            <div className="flex flex-col items-center">
              <span className={`px-2.5 py-1 rounded-lg text-sm font-black border font-mono shadow-sm ${colorStyles.timeBg}`}>
                {countdown.seconds}
              </span>
              <span className="text-[8px] uppercase tracking-tighter text-gray-500 font-sans mt-0.5 font-bold">sec</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Official Last Winning Draw Banner */}
      <div className="pt-3 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-gray-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>Last Official Draw:</span>
          {latestDraw ? (
            <span className="text-white font-bold">
              {latestDraw.time_slot ? `${latestDraw.time_slot} ` : ""}Draw #{latestDraw.draw_number} ({latestDraw.draw_date})
            </span>
          ) : (
            <span className="text-gray-500 italic">Syncing latest draw...</span>
          )}
        </div>

        {/* Winning ball / mark visualization */}
        {latestDraw?.winning_display && (
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider shrink-0">Result:</span>
            {latestDraw.winning_display}
          </div>
        )}
      </div>
    </div>
  );
}
