"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Heart,
  ArrowRight,
  Clock,
  Camera,
  Database,
  Layers,
  Mail,
  Copy,
  Check,
  ShieldCheck
} from "lucide-react";
import { CHINAPOO_CHART } from "@/lib/playwhe";
import QuickPickEngine from "@/components/QuickPickEngine";
import WinConceptLogoEmblem from "@/components/WinConceptLogoEmblem";
import BudgetOddsExplorer from "@/components/BudgetOddsExplorer";
import { calculateNextDrawCountdown, DrawCountdown } from "@/lib/draw_schedule";
import { triggerHaptic } from "@/lib/haptics";

export type GameKey =
  | "welcome"
  | "lotto-plus"
  | "play-whe"
  | "win-for-life"
  | "cashpot"
  | "pick4"
  | "fast-cash"
  | "syndicate"
  | "scanner"
  | "settings";

interface WelcomeTabProps {
  onSelectGame?: (game: GameKey) => void;
}

export default function WelcomeTab({ onSelectGame }: WelcomeTabProps) {
  const [mounted, setMounted] = useState(false);
  const [clock, setClock] = useState<Date>(() => new Date(0));
  const [emailCopied, setEmailCopied] = useState(false);

  // Latest official draws across all 6 NLCB games
  const [latestLotto, setLatestLotto] = useState<any>(null);
  const [latestPlayWhe, setLatestPlayWhe] = useState<any>(null);
  const [latestWinForLife, setLatestWinForLife] = useState<any>(null);
  const [latestCashPot, setLatestCashPot] = useState<any>(null);
  const [latestPick4, setLatestPick4] = useState<any>(null);
  const [latestFastCash, setLatestFastCash] = useState<any>(null);
  const [loadingResults, setLoadingResults] = useState(true);

  useEffect(() => {
    setMounted(true);
    setClock(new Date());
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const countdowns = useMemo(() => {
    return {
      playWhe: calculateNextDrawCountdown("play-whe", clock),
      lotto: calculateNextDrawCountdown("lotto-plus", clock),
      winForLife: calculateNextDrawCountdown("win-for-life", clock),
      cashPot: calculateNextDrawCountdown("cashpot", clock),
      pick4: calculateNextDrawCountdown("pick4", clock)
    };
  }, [clock]);

  const fetchLatestDraws = (bypassCache: boolean = false) => {
    setLoadingResults(true);
    const url = bypassCache ? `/api/latest-results?_t=${Date.now()}` : "/api/latest-results";
    fetch(url, { cache: bypassCache ? "no-store" : "default" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.latest) {
          if (d.latest.lotto) setLatestLotto(d.latest.lotto);
          if (d.latest.playWhe) setLatestPlayWhe(d.latest.playWhe);
          if (d.latest.winForLife) setLatestWinForLife(d.latest.winForLife);
          if (d.latest.cashPot) setLatestCashPot(d.latest.cashPot);
          if (d.latest.pick4) setLatestPick4(d.latest.pick4);
          if (d.latest.fastCash) setLatestFastCash(d.latest.fastCash);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingResults(false));
  };

  useEffect(() => {
    fetchLatestDraws(false);
    const handleSync = () => fetchLatestDraws(true);
    window.addEventListener("win_concept_sync_completed", handleSync);
    return () => window.removeEventListener("win_concept_sync_completed", handleSync);
  }, []);

  const targetDrawNumbers = useMemo(
    () => ({
      cashpot: latestCashPot ? Number(latestCashPot.draw_number) + 1 : 7972,
      "lotto-plus": latestLotto ? Number(latestLotto.draw_number) + 1 : 2586,
      "win-for-life": latestWinForLife ? Number(latestWinForLife.draw_number) + 1 : 483
    }),
    [latestCashPot, latestLotto, latestWinForLife]
  );

  const renderCountdownRow = (cd: DrawCountdown) => (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#070b14] border border-white/[0.06] text-xs font-sans">
      <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="truncate">
          Next: <strong className="text-slate-200 font-semibold">{mounted ? cd.targetLabel.replace(" Draw ", " ") : "Loading"}</strong>
        </span>
      </div>
      <span className="font-mono tabular-nums font-bold text-slate-100 shrink-0">
        {mounted ? `${cd.hours}h ${cd.minutes}m ${cd.seconds}s` : "Loading"}
      </span>
    </div>
  );

  const navigate = (key: GameKey) => {
    triggerHaptic("selection");
    if (onSelectGame) onSelectGame(key);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-8">
      {/* 1. Clean First-Time Orientation Strip */}
      <header className="rounded-2xl bg-[#0a0f1a] border border-white/[0.08] px-4 sm:px-6 py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <WinConceptLogoEmblem size="md" className="shrink-0" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                The Win Concept
              </h1>
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-900 border border-white/10 text-slate-300 font-sans">
                NLCB ANALYTICS
              </span>
            </div>
            <p className="text-sm text-slate-300 font-sans leading-relaxed">
              Understand exact odds, compare ticket budgets, and remove overlapping plays.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 shrink-0 text-xs font-sans">
          {[
            {
              num: "01",
              label: "Pick Game",
              color: "text-sky-400",
              desc: "Compare Cash Pot, Lotto Plus, Win For Life, Play Whe, Pick 4, and Fast Cash costs and draw schedules."
            },
            {
              num: "02",
              label: "Check Odds",
              color: "text-emerald-400",
              desc: "See exact mathematical prize odds, your chance of winning nothing, and the non-overlapping budget curve."
            },
            {
              num: "03",
              label: "Play",
              color: "text-amber-400",
              desc: "Copy, download, or print Panel A to E play sheets and play at any official NLCB Lotto booth."
            }
          ].map((step) => (
            <div
              key={step.num}
              className="relative group px-3 py-2 rounded-lg bg-[#070b14] border border-white/[0.06] md:hover:border-white/20 text-slate-200 font-semibold transition cursor-default text-center sm:text-left"
            >
              <span className={`${step.color} font-mono font-bold mr-1`}>{step.num}</span>
              <span>{step.label}</span>
              <div className="hidden md:block pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute right-0 top-full mt-2 w-64 p-3 rounded-xl bg-[#0d1424]/95 border border-white/15 shadow-2xl backdrop-blur-md z-40 font-sans text-xs text-slate-300 leading-relaxed text-left font-normal">
                <div className="font-bold text-white mb-1 text-sm">
                  <span className={`${step.color} font-mono mr-1.5`}>{step.num}</span>
                  {step.label}
                </div>
                {step.desc}
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* 2. Interactive Global Budget Curve and Exact Odds Planner (Centerpiece) */}
      <BudgetOddsExplorer
        onSelectGame={(g) => navigate(g)}
        targetDrawNumbers={targetDrawNumbers}
      />

      {/* 3. Live Official NLCB Draw Results (All 6 Games) */}
      <section aria-label="Latest Official NLCB Results" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-white font-sans tracking-tight">
              Latest Official NLCB Results
            </h2>
            <p className="text-sm text-slate-400 font-sans leading-relaxed">
              Verified results from the live database. Select any game for full draw history and ticket planning tools.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-2 text-xs font-medium text-slate-300 font-sans">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            All 6 NLCB Games Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* CARD 1: CASH POT */}
          <article className="rounded-2xl bg-[#0a0f1a] border border-white/[0.08] hover:border-white/20 transition-colors p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/cash_pot_icon.png"
                    alt="Cash Pot"
                    className="w-10 h-10 rounded-xl object-contain border border-white/10 shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">Cash Pot</h3>
                    <span className="text-xs text-slate-400 font-sans">
                      {latestCashPot ? `Draw ${latestCashPot.draw_number} on ${latestCashPot.draw_date}` : "Updating results"}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shrink-0 font-sans">
                  $5 per slip
                </span>
              </div>

              {renderCountdownRow(countdowns.cashPot)}

              <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.06] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs font-sans text-slate-400 font-medium">
                  <span>Last 5 Winning Numbers (1 to 20)</span>
                  {latestCashPot?.multiplier && (
                    <span className="text-amber-300 font-bold whitespace-nowrap">
                      {String(latestCashPot.multiplier).replace(/x$/i, "")} times Multiplier
                    </span>
                  )}
                </div>
                {loadingResults && !latestCashPot ? (
                  <div className="flex gap-1.5 animate-pulse py-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-slate-800" />
                    ))}
                  </div>
                ) : latestCashPot ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {[latestCashPot.num1, latestCashPot.num2, latestCashPot.num3, latestCashPot.num4, latestCashPot.num5].map(
                      (num: number, i: number) => (
                        <span
                          key={i}
                          className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/45 text-amber-200 font-mono font-bold text-xs flex items-center justify-center tabular-nums"
                        >
                          {num}
                        </span>
                      )
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-sans">No draw data yet</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-sans text-slate-400 px-0.5">
                <span>10-Slip Best Odds</span>
                <span className="text-emerald-300 font-bold">63.34% win chance (all 20 numbers)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("cashpot")}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-100 text-sm font-semibold font-sans transition flex items-center justify-between cursor-pointer"
            >
              <span>Open Cash Pot Page</span>
              <ArrowRight className="w-4 h-4 text-sky-400" />
            </button>
          </article>

          {/* CARD 2: LOTTO PLUS */}
          <article className="rounded-2xl bg-[#0a0f1a] border border-white/[0.08] hover:border-white/20 transition-colors p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/lotto_plus_icon.png"
                    alt="Lotto Plus"
                    className="w-10 h-10 rounded-xl object-contain border border-white/10 shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">Lotto Plus</h3>
                    <span className="text-xs text-slate-400 font-sans">
                      {latestLotto ? `Draw ${latestLotto.draw_number} on ${latestLotto.draw_date}` : "Updating results"}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shrink-0 font-sans">
                  $5 per play
                </span>
              </div>

              {renderCountdownRow(countdowns.lotto)}

              <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs font-sans text-slate-400 font-medium">
                  <span>Last Winning Numbers (1 to 35)</span>
                  {latestLotto?.multiplier && (
                    <span className="text-sky-300 font-bold">
                      {String(latestLotto.multiplier).replace(/x$/i, "")} times Multiplier
                    </span>
                  )}
                </div>
                {loadingResults && !latestLotto ? (
                  <div className="flex gap-1.5 animate-pulse py-0.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-slate-800" />
                    ))}
                  </div>
                ) : latestLotto ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[latestLotto.num1, latestLotto.num2, latestLotto.num3, latestLotto.num4, latestLotto.num5].map(
                      (num: number, i: number) => (
                        <span
                          key={i}
                          className="w-8 h-8 rounded-full bg-sky-400/15 border border-sky-400/45 text-sky-200 font-mono font-bold text-xs flex items-center justify-center tabular-nums"
                        >
                          {num}
                        </span>
                      )
                    )}
                    {latestLotto.powerball && (
                      <span
                        title="Powerball"
                        className="px-2.5 h-8 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-200 font-sans font-bold text-xs flex items-center justify-center gap-1 tabular-nums"
                      >
                        <span className="text-amber-300/90 font-medium">Powerball</span>
                        <span className="font-mono">{latestLotto.powerball}</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-sans">No draw data yet</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-sans text-slate-400 px-0.5">
                <span>10 Plays (all 10 Powerballs)</span>
                <span className="text-emerald-300 font-bold">62.93% any prize chance</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("lotto-plus")}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-100 text-sm font-semibold font-sans transition flex items-center justify-between cursor-pointer"
            >
              <span>Open Lotto Plus Page</span>
              <ArrowRight className="w-4 h-4 text-sky-400" />
            </button>
          </article>

          {/* CARD 3: WIN FOR LIFE */}
          <article className="rounded-2xl bg-[#0a0f1a] border border-white/[0.08] hover:border-white/20 transition-colors p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/win_for_life_icon.png"
                    alt="Win For Life"
                    className="w-10 h-10 rounded-xl object-contain border border-white/10 shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">Win For Life</h3>
                    <span className="text-xs text-slate-400 font-sans">
                      {latestWinForLife ? `Draw ${latestWinForLife.draw_number} on ${latestWinForLife.draw_date}` : "Updating results"}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shrink-0 font-sans">
                  $10 per line
                </span>
              </div>

              {renderCountdownRow(countdowns.winForLife)}

              <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.06] space-y-2">
                <div className="text-xs font-sans text-slate-400 font-medium">
                  Last Winning Numbers (1 to 28) and Cash Ball
                </div>
                {loadingResults && !latestWinForLife ? (
                  <div className="flex gap-1.5 animate-pulse py-0.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded-full bg-slate-800" />
                    ))}
                  </div>
                ) : latestWinForLife ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      latestWinForLife.num1,
                      latestWinForLife.num2,
                      latestWinForLife.num3,
                      latestWinForLife.num4,
                      latestWinForLife.num5,
                      latestWinForLife.num6
                    ].map((num: number, i: number) => (
                      <span
                        key={i}
                        className="w-7 h-7 rounded-full bg-emerald-400/15 border border-emerald-400/45 text-emerald-200 font-mono font-bold text-xs flex items-center justify-center tabular-nums"
                      >
                        {num}
                      </span>
                    ))}
                    {latestWinForLife.cash_ball && (
                      <span
                        title="Cash Ball"
                        className="px-2.5 h-7 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-200 font-sans font-bold text-xs flex items-center justify-center gap-1 tabular-nums"
                      >
                        <span className="text-amber-300/90 font-medium">Cash Ball</span>
                        <span className="font-mono">{latestWinForLife.cash_ball}</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-sans">No draw data yet</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-sans text-slate-400 px-0.5">
                <span>10-Line Best Odds</span>
                <span className="text-emerald-300 font-bold">72.13% win chance (all 28 numbers)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("win-for-life")}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-100 text-sm font-semibold font-sans transition flex items-center justify-between cursor-pointer"
            >
              <span>Open Win For Life Page</span>
              <ArrowRight className="w-4 h-4 text-sky-400" />
            </button>
          </article>

          {/* CARD 4: PLAY WHE */}
          <article className="rounded-2xl bg-[#0a0f1a] border border-white/[0.08] hover:border-white/20 transition-colors p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/play_whe_icon.png"
                    alt="Play Whe"
                    className="w-10 h-10 rounded-xl object-contain border border-white/10 shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">Play Whe</h3>
                    <span className="text-xs text-slate-400 font-sans">
                      {latestPlayWhe
                        ? `${latestPlayWhe.draw_time_slot || "Draw"} Number ${latestPlayWhe.draw_number}`
                        : "Updating results"}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shrink-0 font-sans">
                  From $1
                </span>
              </div>

              {renderCountdownRow(countdowns.playWhe)}

              <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.06] space-y-2">
                <div className="text-xs font-sans text-slate-400 font-medium">
                  Last Winning Mark (1 to 36)
                </div>
                {loadingResults && !latestPlayWhe ? (
                  <div className="flex items-center gap-2.5 animate-pulse py-0.5">
                    <div className="w-9 h-9 rounded-full bg-slate-800" />
                    <div className="w-24 h-3 bg-slate-800 rounded" />
                  </div>
                ) : latestPlayWhe ? (
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-amber-400/15 border border-amber-400/50 text-amber-200 font-mono font-bold text-sm flex items-center justify-center shrink-0 tabular-nums">
                      {latestPlayWhe.winning_number}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white font-sans truncate">
                        {CHINAPOO_CHART[latestPlayWhe.winning_number]?.mark || "Official Mark"}
                      </div>
                      <div className="text-xs text-slate-400 font-sans truncate">
                        {CHINAPOO_CHART[latestPlayWhe.winning_number]?.keywords?.slice(0, 3).join(", ") || ""}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-sans">No draw data yet</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-sans text-slate-400 px-0.5">
                <span>Single Mark Odds</span>
                <span className="text-slate-200 font-bold">1 in 36 (pays 26 times)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("play-whe")}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-100 text-sm font-semibold font-sans transition flex items-center justify-between cursor-pointer"
            >
              <span>Open Play Whe and Chinapoo</span>
              <ArrowRight className="w-4 h-4 text-sky-400" />
            </button>
          </article>

          {/* CARD 5: PICK 4 */}
          <article className="rounded-2xl bg-[#0a0f1a] border border-white/[0.08] hover:border-white/20 transition-colors p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/pick_four_icon.png"
                    alt="Pick 4"
                    className="w-10 h-10 rounded-xl object-contain border border-white/10 shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">Pick 4</h3>
                    <span className="text-xs text-slate-400 font-sans">
                      {latestPick4 ? `${latestPick4.draw_time_slot || "Draw"} Number ${latestPick4.draw_number}` : "Updating results"}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shrink-0 font-sans">
                  From $1
                </span>
              </div>

              {renderCountdownRow(countdowns.pick4)}

              <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.06] space-y-2">
                <div className="text-xs font-sans text-slate-400 font-medium">
                  Last Winning 4 Digits (0 to 9)
                </div>
                {loadingResults && !latestPick4 ? (
                  <div className="flex gap-1.5 animate-pulse py-0.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-lg bg-slate-800" />
                    ))}
                  </div>
                ) : latestPick4 ? (
                  <div className="flex items-center gap-2">
                    {[latestPick4.digit1, latestPick4.digit2, latestPick4.digit3, latestPick4.digit4].map(
                      (d: number, i: number) => (
                        <span
                          key={i}
                          className="w-8 h-8 rounded-lg bg-purple-400/15 border border-purple-400/45 text-purple-200 font-mono font-bold text-sm flex items-center justify-center tabular-nums"
                        >
                          {d}
                        </span>
                      )
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-sans">No draw data yet</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-sans text-slate-400 px-0.5">
                <span>Exact or 24-Way Box</span>
                <span className="text-slate-200 font-bold">1 in 10,000 or 1 in 417</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("pick4")}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-100 text-sm font-semibold font-sans transition flex items-center justify-between cursor-pointer"
            >
              <span>Open Pick 4 Page</span>
              <ArrowRight className="w-4 h-4 text-sky-400" />
            </button>
          </article>

          {/* CARD 6: FAST CASH */}
          <article className="rounded-2xl bg-[#0a0f1a] border border-white/[0.08] hover:border-white/20 transition-colors p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/fast_cash_icon.png"
                    alt="Fast Cash"
                    className="w-10 h-10 rounded-xl object-contain border border-white/10 shrink-0"
                  />
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">Fast Cash</h3>
                    <span className="text-xs text-slate-400 font-sans">
                      {latestFastCash ? `Draw Number ${latestFastCash.draw_number}` : "Every 3 Minutes"}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shrink-0 font-sans">
                  From $1
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#070b14] border border-white/[0.06] text-xs font-sans">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>New draw every 3 minutes</span>
                </div>
                <span className="text-emerald-400 font-bold uppercase">Live</span>
              </div>

              <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.06] space-y-2">
                <div className="text-xs font-sans text-slate-400 font-medium">
                  Latest Winning Number (0, 00, and 1 to 36)
                </div>
                {latestFastCash?.winning_code ? (
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-full bg-cyan-400/15 border border-cyan-400/45 text-cyan-200 font-mono font-bold text-sm flex items-center justify-center tabular-nums">
                      {latestFastCash.winning_code}
                    </span>
                    <span className="text-xs text-slate-300 font-sans">
                      {latestFastCash.draw_time || "Recent 3-minute draw"}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-sans">
                    Open Fast Cash to view the latest 3-minute draws
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-sans text-slate-400 px-0.5">
                <span>Single Number Odds</span>
                <span className="text-slate-200 font-bold">2.63% (1 in 38)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("fast-cash")}
              className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-100 text-sm font-semibold font-sans transition flex items-center justify-between cursor-pointer"
            >
              <span>Open Fast Cash Page</span>
              <ArrowRight className="w-4 h-4 text-sky-400" />
            </button>
          </article>
        </div>
      </section>

      {/* 4. Helpful Player Tools */}
      <section aria-label="Player Tools" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => navigate("scanner")}
          className="text-left p-5 rounded-2xl bg-[#0a0f1a] border border-white/[0.08] hover:border-sky-400/40 transition flex items-start gap-3.5 cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-sky-400 shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-1.5">
              <span>Ticket Scanner</span>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition" />
            </h3>
            <p className="text-sm text-slate-400 font-sans leading-relaxed">
              Scan or type in your printed NLCB ticket to check for winning matches against official draws.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("scanner-query" as any)}
          className="text-left p-5 rounded-2xl bg-[#0a0f1a] border border-white/[0.08] hover:border-sky-400/40 transition flex items-start gap-3.5 cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-emerald-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-1.5">
              <span>Ask the Draw Database</span>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
            </h3>
            <p className="text-sm text-slate-400 font-sans leading-relaxed">
              Ask everyday questions across more than 22,500 past NLCB draws and get instant answers.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("syndicate")}
          className="text-left p-5 rounded-2xl bg-[#0a0f1a] border border-white/[0.08] hover:border-sky-400/40 transition flex items-start gap-3.5 cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-amber-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-1.5">
              <span>Group Pools</span>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
            </h3>
            <p className="text-sm text-slate-400 font-sans leading-relaxed">
              Split 15-slip ($75) or 20-slip ($100) non-overlapping ticket sets with friends and share them on WhatsApp.
            </p>
          </div>
        </button>
      </section>

      {/* 5. Interactive Quick Pick Generator */}
      <QuickPickEngine
        initialGame="cashpot"
        onSelectGame={(gameKey) => navigate(gameKey)}
      />

      {/* 6. Honest Math Transparency and Fair Play Footer */}
      <footer className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 rounded-2xl bg-[#0a0f1a] border border-white/[0.08] p-5 space-y-2.5">
          <h3 className="text-base flex items-center gap-2 font-bold text-white font-sans">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Honest Odds and Fair Play Notice</span>
          </h3>
          <p className="text-sm text-slate-300 font-sans leading-relaxed">
            Every NLCB game is a game of chance where the lottery keeps about 40% of ticket sales on shared-jackpot games. No formula can predict which numbers a fair lottery machine will draw next. What math can improve is: removing wasted overlapping pairs across your tickets, covering all 10 Powerball or Cash Ball numbers from 1 to 10, avoiding common date patterns so jackpots are shared less often, and playing Cash Pot on Monday, Thursday, and Saturday Sure Call days for 2 to 4 times Multipliers.
          </p>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            This platform is not affiliated with or endorsed by the National Lotteries Control Board (NLCB) of Trinidad and Tobago. Using this tool does not guarantee winnings. Always play within your budget.
          </p>
        </div>

        <div className="lg:col-span-4 rounded-2xl bg-[#0a0f1a] border border-white/[0.08] p-5 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <h3 className="text-base flex items-center gap-2 font-bold text-white font-sans">
              <Heart className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Support and Feedback</span>
            </h3>
            <p className="text-sm text-slate-300 font-sans leading-relaxed">
              This platform is free to use. Questions, suggestions, or support messages are always welcome.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.08] flex items-center justify-between gap-2">
            <a
              href="mailto:daryl.created@gmail.com"
              className="flex items-center gap-2 text-xs font-sans font-semibold text-amber-300 truncate"
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span className="truncate">daryl.created@gmail.com</span>
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText("daryl.created@gmail.com").catch(() => {});
                setEmailCopied(true);
                setTimeout(() => setEmailCopied(false), 2200);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 text-xs font-sans font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {emailCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
