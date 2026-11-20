"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Info,
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

  const fetchLatestDraws = () => {
    setLoadingResults(true);
    const now = Date.now();
    const tasks = [
      fetch(`/api/draws?page=1&limit=1&_t=${now}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.draws?.[0]) setLatestLotto(d.draws[0]);
        })
        .catch(() => {}),
      fetch(`/api/playwhe/draws?page=1&limit=1&_t=${now}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.draws?.[0]) setLatestPlayWhe(d.draws[0]);
        })
        .catch(() => {}),
      fetch(`/api/winforlife/draws?page=1&limit=1&_t=${now}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.draws?.[0]) setLatestWinForLife(d.draws[0]);
        })
        .catch(() => {}),
      fetch(`/api/cashpot/draws?page=1&limit=1&_t=${now}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.draws?.[0]) setLatestCashPot(d.draws[0]);
        })
        .catch(() => {}),
      fetch(`/api/pick4/draws?page=1&limit=1&_t=${now}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.draws?.[0]) setLatestPick4(d.draws[0]);
        })
        .catch(() => {}),
      fetch(`/api/fastcash/engine?limit=1&_t=${now}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.latestDraw) setLatestFastCash(d.latestDraw);
        })
        .catch(() => {})
    ];
    Promise.allSettled(tasks).finally(() => setLoadingResults(false));
  };

  useEffect(() => {
    fetchLatestDraws();
    const handleSync = () => fetchLatestDraws();
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
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#070b14] border border-white/[0.06] font-mono text-[11px]">
      <div className="flex items-center gap-1.5 text-slate-400 min-w-0 truncate">
        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="truncate">
          Next: <strong className="text-slate-200">{mounted ? cd.targetLabel : "—"}</strong>
        </span>
      </div>
      <span className="tabular-nums font-bold text-slate-100 shrink-0">
        {mounted ? `${cd.hours}:${cd.minutes}:${cd.seconds}` : "--:--:--"}
      </span>
    </div>
  );

  const navigate = (key: GameKey) => {
    triggerHaptic("selection");
    if (onSelectGame) onSelectGame(key);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-8">
      {/* 1. Minimalist Editorial Orientation Strip */}
      <header className="rounded-2xl bg-[#0a0f1a] border border-white/[0.08] px-4 sm:px-6 py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <WinConceptLogoEmblem size="md" className="shrink-0" />
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-white font-sans">
                The Win Concept
              </h1>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900 border border-white/10 text-slate-300">
                Free NLCB Analytics
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-sans leading-snug">
              Understand exact odds, compare ticket budgets, and generate zero-overlap covering slips — then play in person at any official NLCB booth.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 shrink-0 text-[10px] sm:text-[11px] font-mono">
          <div className="px-2.5 py-1.5 rounded-lg bg-[#070b14] border border-white/[0.06] text-slate-300">
            <span className="text-sky-400 font-bold">01</span> Pick Budget
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-[#070b14] border border-white/[0.06] text-slate-300">
            <span className="text-emerald-400 font-bold">02</span> Check Odds
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-[#070b14] border border-white/[0.06] text-slate-300">
            <span className="text-amber-400 font-bold">03</span> Play at NLCB
          </div>
        </div>
      </header>

      {/* 2. Interactive Global Budget Curve & Exact Odds Planner (Centerpiece) */}
      <BudgetOddsExplorer
        onSelectGame={(g) => navigate(g)}
        targetDrawNumbers={targetDrawNumbers}
      />

      {/* 3. Live Official NLCB Draw Results (All 6 Games, Clean Institutional Grid) */}
      <section aria-label="Live Official NLCB Draw Results" className="space-y-3.5">
        <div className="flex items-end justify-between px-0.5">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white font-sans tracking-tight">
              Latest Official NLCB Results
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Verified results from the live database · Tap any game for full history &amp; covering tools
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            6 Games Active
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
                    <h3 className="text-sm font-bold text-white font-sans">Cash Pot</h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      {latestCashPot ? `Draw #${latestCashPot.draw_number} · ${latestCashPot.draw_date}` : "Syncing..."}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shrink-0">
                  $5 / slip
                </span>
              </div>

              {renderCountdownRow(countdowns.cashPot)}

              <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  <span>Last Winning 5 Balls (1–20)</span>
                  {latestCashPot?.multiplier && (
                    <span className="text-amber-300 font-bold">
                      {String(latestCashPot.multiplier).replace(/x$/i, "")}X Mult
                    </span>
                  )}
                </div>
                {loadingResults && !latestCashPot ? (
                  <div className="flex gap-1.5 animate-pulse py-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded-full bg-slate-800" />
                    ))}
                  </div>
                ) : latestCashPot ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[latestCashPot.num1, latestCashPot.num2, latestCashPot.num3, latestCashPot.num4, latestCashPot.num5].map(
                      (num: number, i: number) => (
                        <span
                          key={i}
                          className="w-7 h-7 rounded-full bg-amber-400/15 border border-amber-400/45 text-amber-200 font-mono font-bold text-xs flex items-center justify-center tabular-nums"
                        >
                          {num}
                        </span>
                      )
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">No draw data</span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
                <span>10-Slip Exact Ceiling</span>
                <span className="text-emerald-300 font-bold">63.34% Match 3+ · 20/20</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("cashpot")}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-100 text-xs font-semibold font-sans transition flex items-center justify-between cursor-pointer"
            >
              <span>Open Cash Pot Analytics</span>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
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
                    <h3 className="text-sm font-bold text-white font-sans">Lotto Plus</h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      {latestLotto ? `Draw #${latestLotto.draw_number} · ${latestLotto.draw_date}` : "Syncing..."}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shrink-0">
                  $5 / play
                </span>
              </div>

              {renderCountdownRow(countdowns.lotto)}

              <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  <span>Last Winning (5/35 + PB)</span>
                  {latestLotto?.multiplier && (
                    <span className="text-sky-300 font-bold">
                      {String(latestLotto.multiplier).replace(/x$/i, "")}X Mult
                    </span>
                  )}
                </div>
                {loadingResults && !latestLotto ? (
                  <div className="flex gap-1.5 animate-pulse py-0.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded-full bg-slate-800" />
                    ))}
                  </div>
                ) : latestLotto ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[latestLotto.num1, latestLotto.num2, latestLotto.num3, latestLotto.num4, latestLotto.num5].map(
                      (num: number, i: number) => (
                        <span
                          key={i}
                          className="w-7 h-7 rounded-full bg-sky-400/15 border border-sky-400/45 text-sky-200 font-mono font-bold text-xs flex items-center justify-center tabular-nums"
                        >
                          {num}
                        </span>
                      )
                    )}
                    {latestLotto.powerball && (
                      <>
                        <span className="text-slate-600 font-mono text-xs">+</span>
                        <span
                          title="Powerball"
                          className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-200 font-mono font-bold text-xs flex items-center justify-center tabular-nums"
                        >
                          {latestLotto.powerball}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">No draw data</span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
                <span>10-Play Stratified (1–10 PB)</span>
                <span className="text-emerald-300 font-bold">62.93% Any Prize</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("lotto-plus")}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-100 text-xs font-semibold font-sans transition flex items-center justify-between cursor-pointer"
            >
              <span>Open Lotto Plus Wheels</span>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
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
                    <h3 className="text-sm font-bold text-white font-sans">Win For Life</h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      {latestWinForLife ? `Draw #${latestWinForLife.draw_number} · ${latestWinForLife.draw_date}` : "Syncing..."}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shrink-0">
                  $10 / line
                </span>
              </div>

              {renderCountdownRow(countdowns.winForLife)}

              <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.06] space-y-2">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  Last Winning (6/28 + Cash Ball)
                </div>
                {loadingResults && !latestWinForLife ? (
                  <div className="flex gap-1 animate-pulse py-0.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-slate-800" />
                    ))}
                  </div>
                ) : latestWinForLife ? (
                  <div className="flex items-center gap-1 flex-wrap">
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
                        className="w-6 h-6 rounded-full bg-emerald-400/15 border border-emerald-400/45 text-emerald-200 font-mono font-bold text-[11px] flex items-center justify-center tabular-nums"
                      >
                        {num}
                      </span>
                    ))}
                    {latestWinForLife.cash_ball && (
                      <>
                        <span className="text-slate-600 font-mono text-xs">+</span>
                        <span
                          title="Cash Ball"
                          className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-200 font-mono font-bold text-[11px] flex items-center justify-center tabular-nums"
                        >
                          {latestWinForLife.cash_ball}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">No draw data</span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
                <span>10-Line Exact Ceiling</span>
                <span className="text-emerald-300 font-bold">72.13% Match 3+ · 28/28</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("win-for-life")}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-100 text-xs font-semibold font-sans transition flex items-center justify-between cursor-pointer"
            >
              <span>Open Win For Life</span>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
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
                    <h3 className="text-sm font-bold text-white font-sans">Play Whe</h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      {latestPlayWhe
                        ? `${latestPlayWhe.draw_time_slot || "Draw"} #${latestPlayWhe.draw_number}`
                        : "Syncing..."}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shrink-0">
                  From $1
                </span>
              </div>

              {renderCountdownRow(countdowns.playWhe)}

              <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.06] space-y-1.5">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  Last Winning Mark (1–36)
                </div>
                {loadingResults && !latestPlayWhe ? (
                  <div className="flex items-center gap-2.5 animate-pulse py-0.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800" />
                    <div className="w-24 h-3 bg-slate-800 rounded" />
                  </div>
                ) : latestPlayWhe ? (
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-amber-400/15 border border-amber-400/50 text-amber-200 font-mono font-bold text-sm flex items-center justify-center shrink-0 tabular-nums">
                      {latestPlayWhe.winning_number}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white uppercase font-sans truncate">
                        {CHINAPOO_CHART[latestPlayWhe.winning_number]?.mark || "Official Mark"}
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans truncate">
                        {CHINAPOO_CHART[latestPlayWhe.winning_number]?.keywords?.slice(0, 3).join(", ") || ""}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">No draw data</span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
                <span>Exact Single-Mark Odds</span>
                <span className="text-slate-200 font-bold">2.78% (1 in 36) · 26x</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("play-whe")}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-100 text-xs font-semibold font-sans transition flex items-center justify-between cursor-pointer"
            >
              <span>Open Play Whe &amp; Chinapoo</span>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
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
                    <h3 className="text-sm font-bold text-white font-sans">Pick 4</h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      {latestPick4 ? `${latestPick4.draw_time_slot || "Draw"} #${latestPick4.draw_number}` : "Syncing..."}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shrink-0">
                  From $1
                </span>
              </div>

              {renderCountdownRow(countdowns.pick4)}

              <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.06] space-y-2">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  Last Winning 4 Digits (0–9)
                </div>
                {loadingResults && !latestPick4 ? (
                  <div className="flex gap-1.5 animate-pulse py-0.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded-lg bg-slate-800" />
                    ))}
                  </div>
                ) : latestPick4 ? (
                  <div className="flex items-center gap-2">
                    {[latestPick4.digit1, latestPick4.digit2, latestPick4.digit3, latestPick4.digit4].map(
                      (d: number, i: number) => (
                        <span
                          key={i}
                          className="w-7 h-7 rounded-lg bg-purple-400/15 border border-purple-400/45 text-purple-200 font-mono font-bold text-sm flex items-center justify-center tabular-nums"
                        >
                          {d}
                        </span>
                      )
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">No draw data</span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
                <span>Straight / 24-Way Box</span>
                <span className="text-slate-200 font-bold">1 in 10k · 1 in 417</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("pick4")}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-100 text-xs font-semibold font-sans transition flex items-center justify-between cursor-pointer"
            >
              <span>Open Pick 4 Analytics</span>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
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
                    <h3 className="text-sm font-bold text-white font-sans">Fast Cash</h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      {latestFastCash ? `Draw #${latestFastCash.draw_number}` : "Every 3 Minutes"}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 shrink-0">
                  From $1
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#070b14] border border-white/[0.06] font-mono text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Rapid 3-Minute Cadence</span>
                </div>
                <span className="text-emerald-400 font-bold">LIVE</span>
              </div>

              <div className="p-3 rounded-xl bg-[#070b14] border border-white/[0.06] space-y-2">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  Latest Pocket (0, 00, 1–36)
                </div>
                {latestFastCash?.winning_code ? (
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-full bg-cyan-400/15 border border-cyan-400/45 text-cyan-200 font-mono font-bold text-sm flex items-center justify-center tabular-nums">
                      {latestFastCash.winning_code}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {latestFastCash.draw_time || "Recent 3-min draw"}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-sans">
                    Open Fast Cash tab to sync latest 3-minute draws
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
                <span>Exact 38-Pocket Odds</span>
                <span className="text-slate-200 font-bold">2.63% / pocket</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("fast-cash")}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-100 text-xs font-semibold font-sans transition flex items-center justify-between cursor-pointer"
            >
              <span>Open Fast Cash Terminal</span>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
            </button>
          </article>
        </div>
      </section>

      {/* 4. Compact 3-Tool Utility Strip (Scanner · Ask DB · Syndicates) */}
      <section aria-label="Player Tools" className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <button
          type="button"
          onClick={() => navigate("scanner")}
          className="text-left p-4 rounded-2xl bg-[#0a0f1a] border border-white/[0.08] hover:border-sky-400/40 transition flex items-start gap-3.5 cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-sky-400 shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
              <span>Ticket Scanner</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition" />
            </div>
            <p className="text-xs text-slate-400 font-sans leading-snug">
              Scan or enter your printed NLCB bet slip to verify matches against official records.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("scanner-query" as any)}
          className="text-left p-4 rounded-2xl bg-[#0a0f1a] border border-white/[0.08] hover:border-sky-400/40 transition flex items-start gap-3.5 cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-emerald-400 shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
              <span>Ask the Draw Database</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
            </div>
            <p className="text-xs text-slate-400 font-sans leading-snug">
              Ask plain-English questions across 22,500+ historical NLCB draws with instant SQL checks.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("syndicate")}
          className="text-left p-4 rounded-2xl bg-[#0a0f1a] border border-white/[0.08] hover:border-sky-400/40 transition flex items-start gap-3.5 cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-amber-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
              <span>Syndicate Pools</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
            </div>
            <p className="text-xs text-slate-400 font-sans leading-snug">
              Split 15-slip ($75) or 20-slip ($100) Steiner wheels with friends and share slips on WhatsApp.
            </p>
          </div>
        </button>
      </section>

      {/* 5. Interactive Quick Pick Generator */}
      <QuickPickEngine
        initialGame="cashpot"
        onSelectGame={(gameKey) => navigate(gameKey)}
      />

      {/* 6. Honest Math Transparency & Fair Play Footer */}
      <footer className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 rounded-2xl bg-[#0a0f1a] border border-white/[0.08] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Honest Probability &amp; Fair Play Notice</span>
          </div>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            Every NLCB game is a game of chance with an inherent house edge (~40% on pari-mutuel games). No algorithm can predict which individual balls a fair lottery machine will draw next. What mathematics <strong className="text-slate-200">can</strong> optimize is: (1) eliminating wasted ball overlap via Steiner-Johnson packing, (2) full 1–10 Powerball/Cash Ball stratification, (3) avoiding human-crowded combinations so pari-mutuel jackpots are split less often, and (4) playing Cash Pot on Mon / Thu / Sat Sure Call days for 2x–4x Multipliers.
          </p>
          <p className="text-[11px] text-slate-500 font-sans">
            Not affiliated with or endorsed by the National Lotteries Control Board (NLCB) of Trinidad &amp; Tobago. Using this tool does not guarantee winnings — play strictly within your budget.
          </p>
        </div>

        <div className="lg:col-span-4 rounded-2xl bg-[#0a0f1a] border border-white/[0.08] p-5 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              <Heart className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Support the Project</span>
            </div>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              This platform is free to use. Questions, feedback, or support inquiries are always welcome.
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#070b14] border border-white/[0.08] flex items-center justify-between gap-2">
            <a
              href="mailto:daryl.created@gmail.com"
              className="flex items-center gap-2 text-xs font-mono font-semibold text-amber-300 truncate"
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">daryl.created@gmail.com</span>
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText("daryl.created@gmail.com").catch(() => {});
                setEmailCopied(true);
                setTimeout(() => setEmailCopied(false), 2200);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 text-[11px] font-mono font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {emailCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
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
