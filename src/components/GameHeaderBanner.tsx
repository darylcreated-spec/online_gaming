"use client";

import React, { useState, useEffect } from "react";
import { Clock, Calendar, Database, ChevronDown, ChevronUp, DollarSign, HelpCircle } from "lucide-react";
import { calculateNextDrawCountdown, DrawCountdown, SupportedGameKey } from "@/lib/draw_schedule";
import { GAME_GUIDE_MAP } from "@/lib/game_guide";

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
}: GameHeaderBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [showPlayGuide, setShowPlayGuide] = useState(false);
  const [countdown, setCountdown] = useState<DrawCountdown>(() =>
    calculateNextDrawCountdown(game, new Date(0))
  );

  useEffect(() => {
    setMounted(true);
    setCountdown(calculateNextDrawCountdown(game, new Date()));
    const timer = setInterval(() => {
      setCountdown(calculateNextDrawCountdown(game, new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, [game]);

  const guide = GAME_GUIDE_MAP[game as keyof typeof GAME_GUIDE_MAP];

  const colorStyles = {
    amber: {
      border: "border-amber-500/30 hover:border-amber-400/50",
      gradient: "from-amber-950/30 via-slate-950/80 to-slate-950",
      glow: "shadow-[0_0_25px_rgba(245,158,11,0.12)]",
      titleColor: "text-amber-300",
      badge: "bg-amber-500/15 border-amber-500/30 text-amber-300",
      timeBg: "bg-amber-500/20 text-amber-200 border-amber-400/40",
      iconGlow: "border-amber-500/40",
    },
    sky: {
      border: "border-sky-500/30 hover:border-sky-400/50",
      gradient: "from-sky-950/30 via-slate-950/80 to-slate-950",
      glow: "shadow-[0_0_25px_rgba(56,189,248,0.12)]",
      titleColor: "text-sky-300",
      badge: "bg-sky-500/15 border-sky-500/30 text-sky-300",
      timeBg: "bg-sky-500/20 text-sky-200 border-sky-400/40",
      iconGlow: "border-sky-500/40",
    },
    emerald: {
      border: "border-emerald-500/30 hover:border-emerald-400/50",
      gradient: "from-emerald-950/30 via-slate-950/80 to-slate-950",
      glow: "shadow-[0_0_25px_rgba(52,211,153,0.12)]",
      titleColor: "text-emerald-300",
      badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
      timeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
      iconGlow: "border-emerald-500/40",
    },
    yellow: {
      border: "border-yellow-500/30 hover:border-yellow-400/50",
      gradient: "from-yellow-950/30 via-slate-950/80 to-slate-950",
      glow: "shadow-[0_0_25px_rgba(250,204,21,0.12)]",
      titleColor: "text-yellow-300",
      badge: "bg-yellow-500/15 border-yellow-500/30 text-yellow-300",
      timeBg: "bg-yellow-500/20 text-yellow-200 border-yellow-400/40",
      iconGlow: "border-yellow-500/40",
    },
    purple: {
      border: "border-purple-500/30 hover:border-purple-400/50",
      gradient: "from-purple-950/30 via-slate-950/80 to-slate-950",
      glow: "shadow-[0_0_25px_rgba(168,85,247,0.12)]",
      titleColor: "text-purple-300",
      badge: "bg-purple-500/15 border-purple-500/30 text-purple-300",
      timeBg: "bg-purple-500/20 text-purple-200 border-purple-400/40",
      iconGlow: "border-purple-500/40",
    },
  }[themeColor];

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${colorStyles.gradient} border ${colorStyles.border} ${colorStyles.glow} p-5 sm:p-6 space-y-5 backdrop-blur-md relative overflow-hidden transition-all duration-300 font-sans`}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
        {/* Left: Game Identity */}
        <div className="flex items-center gap-4">
          <img
            src={iconSrc}
            alt={title}
            className={`w-14 h-14 rounded-2xl object-contain shrink-0 border ${colorStyles.iconGlow}`}
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${colorStyles.titleColor}`}>
                {title}
              </h1>
              {totalDrawsCount && totalDrawsCount > 0 && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1.5 ${colorStyles.badge}`}>
                  <Database className="w-3.5 h-3.5" />
                  {totalDrawsCount.toLocaleString()} official draws saved
                </span>
              )}
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{subtitle}</p>
          </div>
        </div>

        {/* Right: Next Draw Countdown Card */}
        <div className="flex items-center gap-3.5 bg-black/50 border border-white/10 px-4 py-3 rounded-xl shrink-0 w-full sm:w-auto justify-between sm:justify-start">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Next Draw: {countdown.targetLabel}</span>
            </div>
            <div className="text-xs text-slate-200 font-semibold">{mounted ? countdown.targetDateStr : "Calculating..."}</div>
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            <div className="flex flex-col items-center">
              <span className={`px-2.5 py-1 rounded-lg text-sm font-bold border font-mono tabular-nums ${colorStyles.timeBg}`}>
                {mounted ? countdown.hours : "--"}
              </span>
              <span className="text-xs text-slate-400 mt-0.5">Hours</span>
            </div>
            <span className="text-sm font-bold text-slate-400 pb-4">:</span>
            <div className="flex flex-col items-center">
              <span className={`px-2.5 py-1 rounded-lg text-sm font-bold border font-mono tabular-nums ${colorStyles.timeBg}`}>
                {mounted ? countdown.minutes : "--"}
              </span>
              <span className="text-xs text-slate-400 mt-0.5">Minutes</span>
            </div>
            <span className="text-sm font-bold text-slate-400 pb-4">:</span>
            <div className="flex flex-col items-center">
              <span className={`px-2.5 py-1 rounded-lg text-sm font-bold border font-mono tabular-nums ${colorStyles.timeBg}`}>
                {mounted ? countdown.seconds : "--"}
              </span>
              <span className="text-xs text-slate-400 mt-0.5">Seconds</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Official Last Winning Draw Banner */}
      <div className="pt-3.5 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-slate-400 flex-wrap">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>Last Official Draw:</span>
          {latestDraw ? (
            <span className="text-white font-semibold">
              {latestDraw.time_slot ? `${latestDraw.time_slot} ` : ""}Draw {latestDraw.draw_number} ({latestDraw.draw_date})
            </span>
          ) : (
            <span className="text-slate-400">Updating latest draw...</span>
          )}
        </div>

        {latestDraw?.winning_display && (
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">Winning Result:</span>
            {latestDraw.winning_display}
          </div>
        )}
      </div>

      {/* Cost, Odds and How-to-Play Strip for First-Time Players */}
      {guide && (
        <div className="pt-3.5 border-t border-white/5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-semibold">
                <DollarSign className="w-3.5 h-3.5" />
                {guide.costPerPlay}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-white/10 text-slate-300">
                Top Prize: <strong className="text-white">{guide.topPrize}</strong>
              </span>
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-900/80 border border-white/10 text-slate-300">
                Odds: {guide.odds}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowPlayGuide((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-100 transition cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>How to Play and Costs</span>
              {showPlayGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showPlayGuide && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-2.5 text-sm leading-relaxed">
              <p className="text-slate-300">
                <strong className="text-white">Cost and Options:</strong> {guide.costDetail}
              </p>
              <ol className="space-y-1.5 text-slate-300 list-decimal list-inside">
                {guide.howToPlay.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
              <p className="text-xs text-amber-300/90 pt-1">
                Note: This app helps you understand odds and plan your plays for free. Buy official tickets at any authorized NLCB Lotto booth.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
