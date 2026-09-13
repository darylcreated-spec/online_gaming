"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Info, 
  Heart, 
  ArrowRight, 
  Sigma,
  Network,
  Scale,
  Hourglass,
  Trophy, 
  Clock, 
  Calendar, 
  Activity, 
  Calculator,
  TrendingUp,
  BarChart3,
  ChevronRight, 
  Zap, 
  Mail, 
  Copy, 
  Check, 
  Layers, 
  RefreshCw,
  Compass,
  DollarSign
} from "lucide-react";
import { CHINAPOO_CHART } from "@/lib/playwhe";
import InteractiveTumbler from "@/components/InteractiveTumbler";

export type GameKey = "welcome" | "lotto-plus" | "play-whe" | "win-for-life" | "cashpot" | "pick4" | "syndicate" | "scanner" | "settings";

interface WelcomeTabProps {
  onSelectGame?: (game: GameKey) => void;
}

// NLCB Draw Schedule AST helper (AST is UTC-4 year-round)
interface DrawCountdown {
  targetLabel: string;
  targetDateStr: string;
  hours: string;
  minutes: string;
  seconds: string;
  totalSec: number;
  isUrgent: boolean;
}

function calculateNextDrawCountdown(game: "play-whe" | "pick4" | "cashpot" | "lotto-plus" | "win-for-life", nowUtc: Date): DrawCountdown {
  const astOffsetMs = -4 * 60 * 60 * 1000;
  const astNow = new Date(nowUtc.getTime() + astOffsetMs);

  let candidates: { diffMs: number; label: string; dateStr: string }[] = [];

  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const targetDate = new Date(astNow.getTime() + dayOffset * 86400000);
    const dayOfWeek = targetDate.getUTCDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    const y = targetDate.getUTCFullYear();
    const m = targetDate.getUTCMonth();
    const d = targetDate.getUTCDate();

    let times: [number, number, string][] = [];

    if (game === "play-whe") {
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        times = [
          [10, 30, "Morning (10:30 AM)"],
          [13, 0, "Midday (1:00 PM)"],
          [16, 0, "Afternoon (4:00 PM)"],
          [19, 0, "Evening (7:00 PM)"]
        ];
      } else if (dayOfWeek === 0) {
        times = [
          [10, 30, "Morning (10:30 AM)"],
          [13, 0, "Midday (1:00 PM)"]
        ];
      }
    } else if (game === "pick4") {
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        times = [
          [13, 0, "Midday (1:00 PM)"],
          [19, 0, "Evening (7:00 PM)"]
        ];
      }
    } else if (game === "cashpot") {
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        times = [
          [19, 0, "Evening (7:00 PM)"]
        ];
      }
    } else if (game === "lotto-plus") {
      // Wednesday & Saturday
      if (dayOfWeek === 3 || dayOfWeek === 6) {
        times = [
          [20, 30, "Night Draw (8:30 PM)"]
        ];
      }
    } else if (game === "win-for-life") {
      // Tuesday & Friday
      if (dayOfWeek === 2 || dayOfWeek === 5) {
        times = [
          [19, 0, "Evening Draw (7:00 PM)"]
        ];
      }
    }

    for (const [h, min, label] of times) {
      const drawUtcMs = Date.UTC(y, m, d, h + 4, min, 0);
      const diffMs = drawUtcMs - nowUtc.getTime();
      if (diffMs > 0) {
        const dateStr = targetDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC"
        });
        candidates.push({ diffMs, label, dateStr });
      }
    }
    if (candidates.length > 0) break;
  }

  candidates.sort((a, b) => a.diffMs - b.diffMs);
  const next = candidates[0];

  if (!next) {
    return {
      targetLabel: "Scheduled Draw",
      targetDateStr: "Today",
      hours: "00",
      minutes: "00",
      seconds: "00",
      totalSec: 0,
      isUrgent: false
    };
  }

  const totalSec = Math.max(0, Math.floor(next.diffMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return {
    targetLabel: next.label,
    targetDateStr: next.dateStr,
    hours: String(h).padStart(2, "0"),
    minutes: String(m).padStart(2, "0"),
    seconds: String(s).padStart(2, "0"),
    totalSec,
    isUrgent: totalSec <= 3600 // Less than 1 hour away
  };
}

export default function WelcomeTab({ onSelectGame }: WelcomeTabProps) {
  // Live ticker clock for countdowns
  const [clock, setClock] = useState<Date>(() => new Date());

  const [emailCopied, setEmailCopied] = useState(false);

  // Latest winning draws
  const [latestLotto, setLatestLotto] = useState<any>(null);
  const [latestPlayWhe, setLatestPlayWhe] = useState<any>(null);
  const [latestWinForLife, setLatestWinForLife] = useState<any>(null);
  const [latestCashPot, setLatestCashPot] = useState<any>(null);
  const [latestPick4, setLatestPick4] = useState<any>(null);
  const [loadingResults, setLoadingResults] = useState(true);

  // Mathematical Suggestions
  const [playWhePrediction, setPlayWhePrediction] = useState<any>(null);
  const [lottoPrediction, setLottoPrediction] = useState<any>(null);
  const [wflPrediction, setWflPrediction] = useState<any>(null);
  const [cashPotPrediction, setCashPotPrediction] = useState<any>(null);
  const [pick4Prediction, setPick4Prediction] = useState<any>(null);

  // Live countdown timer hook - updates state every 1000ms
  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date());
    }, 1000);
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

  // Fetch draws and mathematical engine predictions
  const fetchAllData = async () => {
    setLoadingResults(true);
    try {
      const now = Date.now();
      const [
        lottoRes,
        playWheRes,
        wflRes,
        cashPotRes,
        pick4Res,
        playWheMathRes,
        lottoMathRes,
        wflMathRes,
        cashPotMathRes,
        pick4MathRes
      ] = await Promise.allSettled([
        fetch(`/api/draws?page=1&limit=1&_t=${now}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/playwhe/draws?page=1&limit=1&_t=${now}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/winforlife/draws?page=1&limit=1&_t=${now}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/cashpot/draws?page=1&limit=1&_t=${now}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/pick4/draws?page=1&limit=1&_t=${now}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/playwhe/math-engine?sampleSize=50&_t=${now}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/lotto/math-engine?game=lotto-plus&sampleSize=50&_t=${now}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/lotto/math-engine?game=win-for-life&sampleSize=50&_t=${now}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/cashpot/math-engine?sampleSize=50&_t=${now}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/pick4/math-engine?sampleSize=50&_t=${now}`, { cache: "no-store" }).then(r => r.json())
      ]);

      // Populate latest official draws
      if (lottoRes.status === "fulfilled" && lottoRes.value?.draws?.[0]) {
        setLatestLotto(lottoRes.value.draws[0]);
      }
      if (playWheRes.status === "fulfilled" && playWheRes.value?.draws?.[0]) {
        setLatestPlayWhe(playWheRes.value.draws[0]);
      }
      if (wflRes.status === "fulfilled" && wflRes.value?.draws?.[0]) {
        setLatestWinForLife(wflRes.value.draws[0]);
      }
      if (cashPotRes.status === "fulfilled" && cashPotRes.value?.draws?.[0]) {
        setLatestCashPot(cashPotRes.value.draws[0]);
      }
      if (pick4Res.status === "fulfilled" && pick4Res.value?.draws?.[0]) {
        setLatestPick4(pick4Res.value.draws[0]);
      }

      // Populate mathematical predictions
      if (playWheMathRes.status === "fulfilled" && playWheMathRes.value?.success && playWheMathRes.value?.prediction) {
        setPlayWhePrediction(playWheMathRes.value.prediction);
      }
      if (lottoMathRes.status === "fulfilled" && lottoMathRes.value?.success && lottoMathRes.value?.prediction) {
        setLottoPrediction(lottoMathRes.value.prediction);
      }
      if (wflMathRes.status === "fulfilled" && wflMathRes.value?.success && wflMathRes.value?.prediction) {
        setWflPrediction(wflMathRes.value.prediction);
      }
      if (cashPotMathRes.status === "fulfilled" && cashPotMathRes.value?.success && cashPotMathRes.value?.prediction) {
        setCashPotPrediction(cashPotMathRes.value.prediction);
      }
      if (pick4MathRes.status === "fulfilled" && pick4MathRes.value?.success && pick4MathRes.value?.prediction) {
        setPick4Prediction(pick4MathRes.value.prediction);
      }
    } catch (e) {
      console.error("Error fetching live dashboard metrics:", e);
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    const handleSyncEvent = () => {
      fetchAllData();
    };
    window.addEventListener("win_concept_sync_completed", handleSyncEvent);
    return () => window.removeEventListener("win_concept_sync_completed", handleSyncEvent);
  }, []);


  // Helper for countdown display badge
  const renderCountdownBadge = (cd: DrawCountdown, colorTheme: "sky" | "amber" | "emerald" | "purple" | "yellow") => {
    const themeStyles = {
      sky: "border-sky-500/30 bg-sky-950/40 text-sky-300",
      amber: "border-amber-500/30 bg-amber-950/40 text-amber-300",
      emerald: "border-emerald-500/30 bg-emerald-950/40 text-emerald-300",
      purple: "border-purple-500/30 bg-purple-950/40 text-purple-300",
      yellow: "border-yellow-500/30 bg-yellow-950/40 text-yellow-300"
    };

    return (
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border ${themeStyles[colorTheme]} backdrop-blur-md`}>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 opacity-80" />
          <span className="text-[10px] font-mono font-medium tracking-wide text-gray-300">
            Next: <strong className="text-white font-bold">{cd.targetLabel}</strong> ({cd.targetDateStr})
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-md border border-white/10 font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${cd.isUrgent ? "bg-red-400 animate-ping" : "bg-emerald-400 animate-pulse"}`} />
            <span className="text-xs font-black tracking-wider text-white">
              {cd.hours}:{cd.minutes}:{cd.seconds}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-mono pb-8">
      
      {/* 1. Header Hero Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/5 bg-slate-950/60 space-y-3 relative overflow-hidden shadow-2xl">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight uppercase text-white drop-shadow-[0_0_20px_rgba(56,189,248,0.25)]">
          THE WIN CONCEPT
        </h1>

        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-4xl">
          Real-time statistical tracking and combinatorial optimization across all official National Lotteries Control Board (NLCB) games. Powered by Markov state-transitions, Bayesian priors, Gaussian digit sums, and minimum-covering wheeling mathematics.
        </p>
      </div>

      {/* 2. THE 5-GAME COMMAND CENTER GRID */}
      <div className="space-y-4">
        {/* 5 Game Cards Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* CARD 1: PLAY WHE */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-950/25 via-slate-950/90 to-slate-950 border border-amber-500/30 hover:border-amber-400/60 transition-all duration-300 space-y-4 relative group shadow-xl hover:shadow-[0_4px_30px_rgba(251,191,36,0.18)] flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3.5">
                  <img 
                    src="/images/play_whe_icon.png" 
                    alt="Play Whe" 
                    className="w-12 h-12 rounded-xl object-contain shadow-[0_0_15px_rgba(251,191,36,0.35)] border border-amber-500/40 shrink-0" 
                  />
                  <div className="space-y-0.5">
                    <h3 className="text-lg sm:text-xl font-black text-amber-400 uppercase tracking-wider drop-shadow-[0_0_12px_rgba(251,191,36,0.45)]">
                      Play Whe
                    </h3>
                    <span className="text-xs text-gray-300 font-semibold block">
                      {latestPlayWhe ? `${latestPlayWhe.draw_time_slot || "Draw"} #${latestPlayWhe.draw_number}` : "Loading Draw..."}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30">
                  {latestPlayWhe?.draw_date || "Official"}
                </span>
              </div>

              {/* Countdown Timer */}
              {renderCountdownBadge(countdowns.playWhe, "amber")}

              {/* Section A: Last Winning Result */}
              <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                  Last Winning Mark & Ball:
                </span>
                {loadingResults && !latestPlayWhe ? (
                  <div className="flex items-center gap-3 animate-pulse py-1">
                    <div className="w-10 h-10 rounded-full bg-slate-800" />
                    <div className="space-y-1">
                      <div className="w-16 h-3 bg-slate-800 rounded" />
                      <div className="w-24 h-2 bg-slate-800 rounded" />
                    </div>
                  </div>
                ) : latestPlayWhe ? (
                  <div className="flex items-center gap-3 py-1">
                    <div className="w-11 h-11 rounded-full bg-amber-400 text-slate-950 font-black text-base flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.5)] shrink-0 font-mono">
                      {latestPlayWhe.winning_number}
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-black text-white uppercase tracking-wider">
                        {CHINAPOO_CHART[latestPlayWhe.winning_number]?.mark || "Unknown"}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[170px]">
                        {CHINAPOO_CHART[latestPlayWhe.winning_number]?.keywords?.slice(0, 3).join(", ") || "Tradition Mark"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 italic">No draw data found</span>
                )}
              </div>

              {/* Section B: App Suggested Numbers */}
              <div className="space-y-1.5 bg-amber-950/20 p-3 rounded-xl border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <Calculator className="w-3 h-3 text-amber-400" />
                    Mathematical Next Pick:
                  </span>
                  <span className="text-[9px] text-amber-400/80 font-mono">
                    {playWhePrediction ? `Markov/MAP: ${(playWhePrediction.top1SinglePick?.probability * 100 || 0).toFixed(1)}%` : "Calculating..."}
                  </span>
                </div>
                
                {playWhePrediction?.top1SinglePick ? (
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-amber-400/20 border-2 border-amber-400 text-amber-300 font-black text-sm flex items-center justify-center font-mono">
                        {playWhePrediction.top1SinglePick.number}
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white uppercase">
                          {playWhePrediction.top1SinglePick.mark}
                        </span>
                        <span className="text-[9px] text-gray-400 block">
                          Optimal Single Pick
                        </span>
                      </div>
                    </div>
                    {playWhePrediction.top3Trio && (
                      <div className="text-right">
                        <span className="text-[9px] text-gray-400 block">Top Trio</span>
                        <span className="text-xs font-bold text-amber-300 font-mono">
                          {playWhePrediction.top3Trio.map((t: any) => t.number).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1 text-xs text-gray-400 animate-pulse">
                    <span>Compiling Markov transition chains...</span>
                  </div>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => onSelectGame && onSelectGame("play-whe")}
              className="w-full py-2.5 bg-amber-500/15 hover:bg-amber-500 border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 mt-3 shadow-lg group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:border-transparent"
            >
              <span>Launch Play Whe Analytics</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* CARD 2: LOTTO PLUS */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-sky-950/25 via-slate-950/90 to-slate-950 border border-sky-500/30 hover:border-sky-400/60 transition-all duration-300 space-y-4 relative group shadow-xl hover:shadow-[0_4px_30px_rgba(56,189,248,0.18)] flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3.5">
                  <img 
                    src="/images/lotto_plus_icon.png" 
                    alt="Lotto Plus" 
                    className="w-12 h-12 rounded-xl object-contain shadow-[0_0_15px_rgba(56,189,248,0.35)] border border-sky-500/40 shrink-0" 
                  />
                  <div className="space-y-0.5">
                    <h3 className="text-lg sm:text-xl font-black text-sky-400 uppercase tracking-wider drop-shadow-[0_0_12px_rgba(56,189,248,0.45)]">
                      Lotto Plus
                    </h3>
                    <span className="text-xs text-gray-300 font-semibold block">
                      {latestLotto ? `Draw #${latestLotto.draw_number}` : "Loading Draw..."}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-300 font-bold border border-sky-500/30">
                  {latestLotto?.draw_date || "Official"}
                </span>
              </div>

              {/* Countdown Timer */}
              {renderCountdownBadge(countdowns.lotto, "sky")}

              {/* Section A: Last Winning Result */}
              <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    Last Winning Combination:
                  </span>
                  {latestLotto?.multiplier && (
                    <span className="text-[9px] text-sky-300 font-bold">
                      Mult: {latestLotto.multiplier}X
                    </span>
                  )}
                </div>

                {loadingResults && !latestLotto ? (
                  <div className="flex gap-1.5 animate-pulse py-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded-full bg-slate-800" />
                    ))}
                    <div className="w-7 h-7 rounded-full bg-purple-900/40 ml-1" />
                  </div>
                ) : latestLotto ? (
                  <div className="flex flex-wrap items-center gap-1.5 py-1">
                    {[latestLotto.num1, latestLotto.num2, latestLotto.num3, latestLotto.num4, latestLotto.num5].map((num: number, i: number) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-[0_0_10px_rgba(56,189,248,0.3)] font-mono"
                      >
                        {num}
                      </div>
                    ))}
                    {latestLotto.powerball && (
                      <>
                        <span className="text-gray-600 font-bold">|</span>
                        <div
                          className="w-7 h-7 rounded-full bg-purple-600 border border-purple-400 text-white font-black text-xs flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.4)] font-mono"
                          title="Powerball"
                        >
                          {latestLotto.powerball}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 italic">No draw data found</span>
                )}
              </div>

              {/* Section B: App Suggested Numbers */}
              <div className="space-y-1.5 bg-sky-950/20 p-3 rounded-xl border border-sky-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1">
                    <Calculator className="w-3 h-3 text-sky-400" />
                    Suggested Ensemble Ticket:
                  </span>
                  <span className="text-[9px] text-sky-400 font-bold px-1.5 py-0.2 rounded bg-sky-500/15 border border-sky-500/30">
                    Grade {lottoPrediction?.topEnsembles?.[0]?.confidenceGrade || "A+"}
                  </span>
                </div>

                {lottoPrediction?.topEnsembles?.[0] ? (
                  <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      {lottoPrediction.topEnsembles[0].numbers.map((num: number, idx: number) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded-md bg-sky-500/20 border border-sky-400 text-sky-300 font-black text-[11px] flex items-center justify-center font-mono"
                        >
                          {num}
                        </div>
                      ))}
                      <span className="text-purple-400 font-bold text-xs mx-0.5">+</span>
                      <div
                        className="w-6 h-6 rounded-md bg-purple-600/40 border border-purple-400 text-purple-200 font-black text-[11px] flex items-center justify-center font-mono"
                        title="Powerball"
                      >
                        {lottoPrediction.topEnsembles[0].bonusBall}
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-400">
                      Sum: {lottoPrediction.topEnsembles[0].sum}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1 text-xs text-gray-400 animate-pulse">
                    <span>Optimizing combinatorial wheel...</span>
                  </div>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => onSelectGame && onSelectGame("lotto-plus")}
              className="w-full py-2.5 bg-sky-500/15 hover:bg-sky-500 border border-sky-500/40 text-sky-300 text-[11px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 mt-3 shadow-lg group-hover:bg-sky-500 group-hover:text-slate-950 group-hover:border-transparent"
            >
              <span>Explore Lotto Plus Wheels</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* CARD 3: WIN FOR LIFE */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/25 via-slate-950/90 to-slate-950 border border-emerald-500/30 hover:border-emerald-400/60 transition-all duration-300 space-y-4 relative group shadow-xl hover:shadow-[0_4px_30px_rgba(52,211,153,0.18)] flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3.5">
                  <img 
                    src="/images/win_for_life_icon.png" 
                    alt="Win For Life" 
                    className="w-12 h-12 rounded-xl object-contain shadow-[0_0_15px_rgba(52,211,153,0.35)] border border-emerald-500/40 shrink-0" 
                  />
                  <div className="space-y-0.5">
                    <h3 className="text-lg sm:text-xl font-black text-emerald-400 uppercase tracking-wider drop-shadow-[0_0_12px_rgba(52,211,153,0.45)]">
                      Win For Life
                    </h3>
                    <span className="text-xs text-gray-300 font-semibold block">
                      {latestWinForLife ? `Draw #${latestWinForLife.draw_number}` : "Loading Draw..."}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/30">
                  {latestWinForLife?.draw_date || "Official"}
                </span>
              </div>

              {/* Countdown Timer */}
              {renderCountdownBadge(countdowns.winForLife, "emerald")}

              {/* Section A: Last Winning Result */}
              <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                  Last Winning 6 Balls + Cash Ball:
                </span>

                {loadingResults && !latestWinForLife ? (
                  <div className="flex gap-1 animate-pulse py-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-slate-800" />
                    ))}
                    <div className="w-6 h-6 rounded-full bg-emerald-900/40 ml-1" />
                  </div>
                ) : latestWinForLife ? (
                  <div className="flex flex-wrap items-center gap-1 py-1">
                    {[
                      latestWinForLife.num1,
                      latestWinForLife.num2,
                      latestWinForLife.num3,
                      latestWinForLife.num4,
                      latestWinForLife.num5,
                      latestWinForLife.num6
                    ].map((num: number, i: number) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.3)] font-mono"
                      >
                        {num}
                      </div>
                    ))}
                    {latestWinForLife.cash_ball && (
                      <>
                        <span className="text-gray-600 font-bold text-xs mx-0.5">|</span>
                        <div
                          className="w-6 h-6 rounded-full bg-emerald-600 border border-emerald-400 text-white font-black text-[10px] flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.4)] font-mono"
                          title="Cash Ball"
                        >
                          {latestWinForLife.cash_ball}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 italic">No draw data found</span>
                )}
              </div>

              {/* Section B: App Suggested Numbers */}
              <div className="space-y-1.5 bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                    <Calculator className="w-3 h-3 text-emerald-400" />
                    Mathematical 6+1 Selection:
                  </span>
                  <span className="text-[9px] text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30">
                    Grade {wflPrediction?.topEnsembles?.[0]?.confidenceGrade || "A+"}
                  </span>
                </div>

                {wflPrediction?.topEnsembles?.[0] ? (
                  <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      {wflPrediction.topEnsembles[0].numbers.map((num: number, idx: number) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black text-[10px] flex items-center justify-center font-mono"
                        >
                          {num}
                        </div>
                      ))}
                      <span className="text-emerald-400 font-bold text-xs mx-0.5">+</span>
                      <div
                        className="w-6 h-6 rounded-md bg-emerald-600/40 border border-emerald-400 text-emerald-200 font-black text-[10px] flex items-center justify-center font-mono"
                        title="Cash Ball"
                      >
                        {wflPrediction.topEnsembles[0].bonusBall}
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-400">
                      Top Prize: $20K/Mo
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1 text-xs text-gray-400 animate-pulse">
                    <span>Computing renewal hazard models...</span>
                  </div>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => onSelectGame && onSelectGame("win-for-life")}
              className="w-full py-2.5 bg-emerald-500/15 hover:bg-emerald-500 border border-emerald-500/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 mt-3 shadow-lg group-hover:bg-emerald-500 group-hover:text-slate-950 group-hover:border-transparent"
            >
              <span>Explore Win For Life</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* CARD 4: CASHPOT (5 OF 20) */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-yellow-950/25 via-slate-950/90 to-slate-950 border border-yellow-500/30 hover:border-yellow-400/60 transition-all duration-300 space-y-4 relative group shadow-xl hover:shadow-[0_4px_30px_rgba(250,204,21,0.18)] flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3.5">
                  <img 
                    src="/images/cash_pot_icon.png" 
                    alt="Cash Pot" 
                    className="w-12 h-12 rounded-xl object-contain shadow-[0_0_15px_rgba(250,204,21,0.35)] border border-yellow-500/40 shrink-0" 
                  />
                  <div className="space-y-0.5">
                    <h3 className="text-lg sm:text-xl font-black text-yellow-400 uppercase tracking-wider drop-shadow-[0_0_12px_rgba(250,204,21,0.45)]">
                      Cash Pot
                    </h3>
                    <span className="text-xs text-gray-300 font-semibold block">
                      {latestCashPot ? `Draw #${latestCashPot.draw_number}` : "Loading Draw..."}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-md bg-yellow-500/10 text-yellow-300 font-bold border border-yellow-500/30">
                  {latestCashPot?.draw_date || "Official"}
                </span>
              </div>

              {/* Countdown Timer */}
              {renderCountdownBadge(countdowns.cashPot, "yellow")}

              {/* Section A: Last Winning Result */}
              <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    Last Winning 5 Balls (1–20):
                  </span>
                  {latestCashPot?.multiplier && (
                    <span className="text-[9px] text-yellow-300 font-bold">
                      Mult: {latestCashPot.multiplier}X
                    </span>
                  )}
                </div>

                {loadingResults && !latestCashPot ? (
                  <div className="flex gap-1.5 animate-pulse py-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded-full bg-slate-800" />
                    ))}
                    <div className="w-7 h-7 rounded-full bg-yellow-900/40 ml-1" />
                  </div>
                ) : latestCashPot ? (
                  <div className="flex flex-wrap items-center gap-1.5 py-1">
                    {[latestCashPot.num1, latestCashPot.num2, latestCashPot.num3, latestCashPot.num4, latestCashPot.num5].map((num: number, i: number) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full bg-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-[0_0_10px_rgba(250,204,21,0.35)] font-mono"
                      >
                        {num}
                      </div>
                    ))}
                    {latestCashPot.multiplier && (
                      <>
                        <span className="text-gray-600 font-bold">|</span>
                        <div
                          className="w-7 h-7 rounded-full bg-amber-500 border border-amber-300 text-slate-950 font-black text-xs flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.4)] font-mono"
                          title="Multiplier"
                        >
                          {latestCashPot.multiplier}X
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 italic">No draw data found</span>
                )}
              </div>

              {/* Section B: App Suggested Numbers */}
              <div className="space-y-1.5 bg-yellow-950/20 p-3 rounded-xl border border-yellow-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-1">
                    <Calculator className="w-3 h-3 text-yellow-400" />
                    Statistical 5-Ball Quintet:
                  </span>
                  <span className="text-[9px] text-yellow-400 font-bold px-1.5 py-0.2 rounded bg-yellow-500/15 border border-yellow-500/30">
                    Grade {cashPotPrediction?.topEnsembles?.[0]?.confidenceGrade || "A+"}
                  </span>
                </div>

                {cashPotPrediction?.topEnsembles?.[0] ? (
                  <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      {cashPotPrediction.topEnsembles[0].numbers.map((num: number, idx: number) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded-md bg-yellow-500/20 border border-yellow-400 text-yellow-300 font-black text-[11px] flex items-center justify-center font-mono"
                        >
                          {num}
                        </div>
                      ))}
                      <span className="text-yellow-400 font-bold text-xs mx-0.5">+</span>
                      <div
                        className="w-6 h-6 rounded-md bg-amber-500/40 border border-amber-400 text-amber-200 font-black text-[11px] flex items-center justify-center font-mono"
                        title="Target Multiplier"
                      >
                        {cashPotPrediction.topEnsembles[0].bonusBall}X
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-400">
                      Odds: 1 in 15,504
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1 text-xs text-gray-400 animate-pulse">
                    <span>Evaluating companion affinities...</span>
                  </div>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => onSelectGame && onSelectGame("cashpot")}
              className="w-full py-2.5 bg-yellow-500/15 hover:bg-yellow-500 border border-yellow-500/40 text-yellow-300 text-[11px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 mt-3 shadow-lg group-hover:bg-yellow-500 group-hover:text-slate-950 group-hover:border-transparent"
            >
              <span>Explore Cash Pot Analytics</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* CARD 5: PICK 4 */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-950/25 via-slate-950/90 to-slate-950 border border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 space-y-4 relative group shadow-xl hover:shadow-[0_4px_30px_rgba(168,85,247,0.18)] flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3.5">
                  <img 
                    src="/images/pick_four_icon.png" 
                    alt="Pick 4" 
                    className="w-12 h-12 rounded-xl object-contain shadow-[0_0_15px_rgba(168,85,247,0.35)] border border-purple-500/40 shrink-0" 
                  />
                  <div className="space-y-0.5">
                    <h3 className="text-lg sm:text-xl font-black text-purple-400 uppercase tracking-wider drop-shadow-[0_0_12px_rgba(168,85,247,0.45)]">
                      Pick 4
                    </h3>
                    <span className="text-xs text-gray-300 font-semibold block">
                      {latestPick4 ? `${latestPick4.draw_time_slot || "Draw"} #${latestPick4.draw_number}` : "Loading Draw..."}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-300 font-bold border border-purple-500/30">
                  {latestPick4?.draw_date || "Official"}
                </span>
              </div>

              {/* Countdown Timer */}
              {renderCountdownBadge(countdowns.pick4, "purple")}

              {/* Section A: Last Winning Result */}
              <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                  Last Winning 4 Digits:
                </span>

                {loadingResults && !latestPick4 ? (
                  <div className="flex gap-2 animate-pulse py-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-lg bg-slate-800" />
                    ))}
                  </div>
                ) : latestPick4 ? (
                  <div className="flex items-center gap-2 py-1">
                    {[latestPick4.digit1, latestPick4.digit2, latestPick4.digit3, latestPick4.digit4].map((d: number, i: number) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-lg bg-purple-500/25 border border-purple-400 text-purple-200 font-black text-sm flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.35)] font-mono"
                      >
                        {d}
                      </div>
                    ))}
                    <span className="text-[10px] text-gray-400 ml-2 font-mono">
                      Sum: {Number(latestPick4.digit1) + Number(latestPick4.digit2) + Number(latestPick4.digit3) + Number(latestPick4.digit4)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 italic">No draw data found</span>
                )}
              </div>

              {/* Section B: App Suggested Numbers */}
              <div className="space-y-1.5 bg-purple-950/20 p-3 rounded-xl border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                    <Calculator className="w-3 h-3 text-purple-400" />
                    Optimal Straight & Box EV:
                  </span>
                  <span className="text-[9px] text-purple-400 font-bold px-1.5 py-0.2 rounded bg-purple-500/15 border border-purple-500/30">
                    EV Score {pick4Prediction?.optimalStraightTicket?.confidenceScore || 92}%
                  </span>
                </div>

                {pick4Prediction?.optimalStraightTicket ? (
                  <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      {pick4Prediction.optimalStraightTicket.digits.map((digit: number, idx: number) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded-md bg-purple-500/20 border border-purple-400 text-purple-200 font-black text-[11px] flex items-center justify-center font-mono"
                        >
                          {digit}
                        </div>
                      ))}
                      <span className="text-[9px] text-purple-400 ml-1 font-bold">
                        (Straight)
                      </span>
                    </div>
                    {pick4Prediction.optimalBoxTickets?.twentyFourWay && (
                      <div className="text-right">
                        <span className="text-[9px] text-gray-400 block">Box 24-Way</span>
                        <span className="text-[10px] font-bold text-purple-300 font-mono">
                          {pick4Prediction.optimalBoxTickets.twentyFourWay.digitsString}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1 text-xs text-gray-400 animate-pulse">
                    <span>Computing positional Markov matrices...</span>
                  </div>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => onSelectGame && onSelectGame("pick4")}
              className="w-full py-2.5 bg-purple-500/15 hover:bg-purple-500 border border-purple-500/40 text-purple-300 text-[11px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 mt-3 shadow-lg group-hover:bg-purple-500 group-hover:text-white group-hover:border-transparent"
            >
              <span>Explore Pick 4 Permutations</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* UNIFIED 3D BLENDER-GRADE TUMBLER QUICK PICK (Placed Between Pick 4 & Utility Suite) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <InteractiveTumbler
              initialGame="lotto-plus"
              onNavigateGame={(game) => {
                if (onSelectGame) onSelectGame(game as GameKey);
              }}
            />
          </div>

          {/* CARD 6: TICKET SCANNER & SYNDICATES SHORTCUT CARD */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-indigo-950/25 via-slate-950/90 to-slate-950 border border-indigo-500/30 hover:border-indigo-400/60 transition-all duration-300 space-y-4 relative group shadow-xl hover:shadow-[0_4px_30px_rgba(99,102,241,0.18)] flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3.5">
                  <img 
                    src="/images/scanner_icon.png" 
                    alt="Utility Suite" 
                    className="w-12 h-12 rounded-xl object-contain shadow-[0_0_15px_rgba(99,102,241,0.35)] border border-indigo-500/40 shrink-0" 
                  />
                  <div className="space-y-0.5">
                    <h3 className="text-lg sm:text-xl font-black text-indigo-400 uppercase tracking-wider drop-shadow-[0_0_12px_rgba(99,102,241,0.45)]">
                      Utility Suite
                    </h3>
                    <span className="text-xs text-gray-300 font-semibold block">
                      Ticket Scanner & Syndicates
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/30">
                  OCR Engine
                </span>
              </div>

              {/* Utility Info */}
              <div className="space-y-2 bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white uppercase">
                    Automatic Ticket Verification
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Scan printed physical bet slips with your phone camera across Play Whe, Lotto Plus, Win For Life, Cash Pot, and Pick 4 to automatically cross-reference against official winning database records and calculate payouts.
                </p>
              </div>

              {/* Syndicate Pooling Info */}
              <div className="space-y-1 bg-purple-950/20 p-3 rounded-xl border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3 h-3 text-purple-400" />
                    Syndicate Pooling
                  </span>
                  <span className="text-[9px] text-purple-400 font-bold">
                    WhatsApp Share Ready
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 leading-normal">
                  Pool ticket entries with colleagues and calculate exact prize percentages per member automatically.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => onSelectGame && onSelectGame("scanner")}
                className="py-2.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-lg group-hover:border-purple-400"
              >
                <span>Launch Scanner</span>
              </button>
              <button
                onClick={() => onSelectGame && onSelectGame("syndicate")}
                className="py-2.5 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-lg group-hover:border-purple-400"
              >
                <span>Syndicates</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Architecture & Engineering Overview */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/5 bg-slate-950/40 space-y-6">
        <div className="flex items-center gap-3 border-b border-white/5 pb-3">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)] shrink-0">
            <Sigma className="w-5 h-5" />
          </div>
          <div>
            <h3 
              className="text-base sm:text-lg font-black uppercase tracking-wider"
              style={{ color: "#ffffff" }}
            >
              Mathematical Architecture
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-300">
              Rigorous probabilistic reasoning replacing superstition with empirical evidence
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* 1. Markov Transitions */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/20 hover:border-amber-500/40 transition space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
              <Activity className="w-4 h-4 text-amber-400 shrink-0" />
              <span>1. Markov Transitions</span>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              First-order Markov chains calculate state transition probabilities P(S_t | S_t-1) between sequential lottery draws, uncovering recurring directional paths across Trinidad lottery history.
            </p>
          </div>

          {/* 2. Graph & Companion Affinity */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-sky-500/20 hover:border-sky-500/40 transition space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase">
              <Network className="w-4 h-4 text-sky-400 shrink-0" />
              <span>2. Graph & Companion Affinity</span>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              PageRank-inspired bipartite affinity networks detect high-frequency companion numbers and co-occurrence cliques that depart significantly from uniform random distributions.
            </p>
          </div>

          {/* 3. Combinatorial Covering Wheels */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/20 hover:border-emerald-500/40 transition space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
              <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>3. Combinatorial Covering Wheels</span>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Abbreviated wheeling algorithms compile your high-confidence pools into mathematically minimized ticket sets that guarantee designated tier matches without purchasing full combinations.
            </p>
          </div>

          {/* 4. Gaussian Sum Distribution & CLT */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-yellow-500/20 hover:border-yellow-500/40 transition space-y-2">
            <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs uppercase">
              <Sigma className="w-4 h-4 text-yellow-400 shrink-0" />
              <span>4. Gaussian Sums & Central Limit</span>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Normal distribution modeling enforces empirical μ ± 2σ sum envelopes, eliminating combinations whose digit sums fall into low-probability statistical tails (&lt;5% historical frequency).
            </p>
          </div>

          {/* 5. Weibull Renewal Hazard Aging */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-rose-500/20 hover:border-rose-500/40 transition space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase">
              <Hourglass className="w-4 h-4 text-rose-400 shrink-0" />
              <span>5. Weibull Renewal Hazard</span>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Non-linear survival analysis measures interval aging and hazard arrival rates λ(t) for overdue numbers, separating genuine cyclical regime changes from the gambler's fallacy.
            </p>
          </div>

          {/* 6. Maximum Expected Value & Shannon Entropy */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-purple-500/20 hover:border-purple-500/40 transition space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase">
              <Scale className="w-4 h-4 text-purple-400 shrink-0" />
              <span>6. Maximum Expected Value (MEV)</span>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Information-theoretic Shannon entropy optimization evaluates ticket portfolio diversity, maximizing unique combinatorial coverage while penalizing redundant ball overlaps.
            </p>
          </div>

          {/* 7. Bayesian Dirichlet Conjugate Priors */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-cyan-500/20 hover:border-cyan-500/40 transition space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase">
              <Calculator className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>7. Bayesian Dirichlet Priors</span>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Conjugate Dirichlet-multinomial updating adjusts prior likelihood distributions with rolling historical observations, filtering out transient variance and small-sample bias.
            </p>
          </div>

          {/* 8. Non-Homogeneous Poisson Arrival */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-indigo-500/20 hover:border-indigo-500/40 transition space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase">
              <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>8. Poisson Point-Process Renewal</span>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Time-varying Poisson process likelihoods evaluate interval recurrence intervals between hits, statistically detecting burst clusters versus steady Poisson equilibrium.
            </p>
          </div>

          {/* 9. Monte Carlo Permutation Entropy */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-pink-500/20 hover:border-pink-500/40 transition space-y-2">
            <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase">
              <BarChart3 className="w-4 h-4 text-pink-400 shrink-0" />
              <span>9. Monte Carlo Entropy Audit</span>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Stochastic 100,000-draw synthetic bootstrap iterations benchmark actual official lottery distributions against true random noise to guarantee algorithmic integrity.
            </p>
          </div>

        </div>
      </div>

      {/* 5. Warning Disclaimer Panel */}
      <div className="glass-panel p-5 rounded-xl border-red-500/10 bg-red-500/[0.01] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 font-mono">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Disclaimer & Fair Play Notice</h4>
            <p className="text-xs leading-relaxed text-gray-400">
              This application is designed as an empirical analytical system that calculates mathematical odds, frequencies, and combinatorial coverage for Trinidad and Tobago lottery games. It is <strong>NOT affiliated with, authorized, or endorsed by the National Lotteries Control Board (NLCB)</strong> of Trinidad and Tobago. Using this app <strong>does NOT guarantee any winnings</strong>. Please gamble responsibly.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Support the Creator Panel */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] relative overflow-hidden font-mono">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 shrink-0 mt-0.5">
            <Heart className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div className="space-y-3 w-full">
            <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
              Support the Creator
            </h4>
            <p className="text-xs leading-relaxed text-gray-300">
              Creating and maintaining these complex mathematical models and cloud scraping pipelines requires continuous hosting, compute, and dedication. If this system helps you hit a lucky streak, win big, or build wealth, please show some love and support the creator!
            </p>
            <div className="p-3.5 sm:p-4 bg-slate-950/80 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-inner">
              <a 
                href="mailto:daryl.created@gmail.com"
                className="flex items-center gap-2.5 text-sm sm:text-base md:text-lg font-black text-amber-400 hover:text-amber-300 transition tracking-wider group"
              >
                <Mail className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="underline underline-offset-4 break-all">daryl.created@gmail.com</span>
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("daryl.created@gmail.com");
                  setEmailCopied(true);
                  setTimeout(() => setEmailCopied(false), 2500);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
                title="Copy Email Address"
              >
                {emailCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
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
        </div>
      </div>

    </div>
  );
}
