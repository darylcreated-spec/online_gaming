"use client";

import React, { useState, useEffect } from "react";
import { Info, Heart, ArrowRight, Sparkles, RefreshCw, Trophy, Flame, Mail, Copy, Check } from "lucide-react";
import InteractiveTumbler from "@/components/InteractiveTumbler";
import { CHINAPOO_CHART } from "@/lib/playwhe";

interface WelcomeTabProps {
  onSelectGame?: (game: "welcome" | "lotto-plus" | "play-whe" | "win-for-life" | "scanner") => void;
}

export default function WelcomeTab({ onSelectGame }: WelcomeTabProps) {
  const [shadedNums, setShadedNums] = useState<number[]>([]);
  const [pencilPos, setPencilPos] = useState({ x: 50, y: -25, rotate: 0, shake: false });
  const [showGoodLuck, setShowGoodLuck] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  // Latest winning results states
  const [latestLotto, setLatestLotto] = useState<any>(null);
  const [latestPlayWhe, setLatestPlayWhe] = useState<any>(null);
  const [latestWinForLife, setLatestWinForLife] = useState<any>(null);
  const [loadingResults, setLoadingResults] = useState(true);

  // Fetch latest draw results across all 3 games
  const fetchLatestWinningNumbers = async () => {
    setLoadingResults(true);
    try {
      const [lottoRes, playWheRes, wflRes] = await Promise.allSettled([
        fetch("/api/draws?page=1&limit=1").then(r => r.json()),
        fetch("/api/playwhe/draws?page=1&limit=1").then(r => r.json()),
        fetch("/api/winforlife/draws?page=1&limit=1").then(r => r.json())
      ]);

      if (lottoRes.status === "fulfilled" && lottoRes.value?.draws?.[0]) {
        setLatestLotto(lottoRes.value.draws[0]);
      }
      if (playWheRes.status === "fulfilled" && playWheRes.value?.draws?.[0]) {
        setLatestPlayWhe(playWheRes.value.draws[0]);
      }
      if (wflRes.status === "fulfilled" && wflRes.value?.draws?.[0]) {
        setLatestWinForLife(wflRes.value.draws[0]);
      }
    } catch (e) {
      console.error("Error fetching latest winning numbers for Welcome tab:", e);
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    fetchLatestWinningNumbers();

    const handleSyncEvent = () => {
      fetchLatestWinningNumbers();
    };
    window.addEventListener("win_concept_sync_completed", handleSyncEvent);
    return () => window.removeEventListener("win_concept_sync_completed", handleSyncEvent);
  }, []);

  // Pencil shading animation
  useEffect(() => {
    let active = true;
    const targetNums = [4, 12, 19, 26, 33];

    const runSequence = async () => {
      while (active) {
        setShadedNums([]);
        setShowGoodLuck(false);
        setPencilPos({ x: 50, y: -30, rotate: 0, shake: false });
        
        await new Promise((r) => setTimeout(r, 2000));
        if (!active) break;

        for (const num of targetNums) {
          const col = (num - 1) % 6;
          const row = Math.floor((num - 1) / 6);
          const targetX = 12 + col * 15.5;
          const targetY = 15 + row * 13.5;

          setPencilPos({ x: targetX, y: targetY, rotate: -10, shake: false });
          await new Promise((r) => setTimeout(r, 800));
          if (!active) break;

          setPencilPos({ x: targetX, y: targetY, rotate: -10, shake: true });
          await new Promise((r) => setTimeout(r, 550));
          if (!active) break;

          setShadedNums((prev) => [...prev, num]);
          setPencilPos({ x: targetX, y: targetY, rotate: -10, shake: false });
          await new Promise((r) => setTimeout(r, 200));
          if (!active) break;
        }

        if (!active) break;

        setPencilPos({ x: 50, y: 130, rotate: 0, shake: false });
        await new Promise((r) => setTimeout(r, 600));
        if (!active) break;

        setShowGoodLuck(true);
        await new Promise((r) => setTimeout(r, 3500));
      }
    };

    runSequence();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-mono">
      
      {/* 1. Welcome Text Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/5 bg-slate-950/40 space-y-3 relative overflow-hidden">
        <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span>Lottery Intelligence & Combinatorial Optimization</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight uppercase text-white drop-shadow-[0_0_15px_rgba(56,189,248,0.2)]">
          THE WIN CONCEPT
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-3xl">
          Welcome to the advanced analytical platform for local Trinidad and Tobago lottery models. This platform tracks real-time historical draws, computes multi-model Bayesian/Markov consensus vectors, and optimizes your statistical odds.
        </p>
      </div>

      {/* 2. LATEST WINNING NUMBERS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs sm:text-sm font-black uppercase text-white tracking-wider">
              Latest Official Winning Numbers
            </h2>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Cloud Data
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Lotto Plus */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-sky-500/20 hover:border-sky-500/50 transition-all duration-300 space-y-4 relative group shadow-lg flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest block">Lotto Plus</span>
                  <span className="text-xs text-white font-bold">
                    {latestLotto ? `Draw #${latestLotto.draw_number}` : "Loading..."}
                  </span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 font-bold">
                  {latestLotto?.draw_date || "Official"}
                </span>
              </div>

              {/* Lotto Plus Winning Balls */}
              <div className="py-2">
                {loadingResults && !latestLotto ? (
                  <div className="flex gap-1.5 animate-pulse">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-slate-800" />
                    ))}
                    <div className="w-8 h-8 rounded-full bg-purple-900/40 ml-1" />
                  </div>
                ) : latestLotto ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[latestLotto.num1, latestLotto.num2, latestLotto.num3, latestLotto.num4, latestLotto.num5].map((num: number, i: number) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-[0_0_10px_rgba(56,189,248,0.3)]"
                      >
                        {num}
                      </div>
                    ))}
                    {latestLotto.powerball && (
                      <>
                        <span className="text-gray-600 font-bold mx-0.5">|</span>
                        <div
                          className="w-8 h-8 rounded-full bg-purple-600 border border-purple-400 text-white font-black text-xs flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.4)]"
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

              {latestLotto?.multiplier && (
                <p className="text-[10px] text-gray-400">
                  Multiplier: <strong className="text-white">{latestLotto.multiplier}X</strong>
                </p>
              )}
            </div>

            <button
              onClick={() => onSelectGame && onSelectGame("lotto-plus")}
              className="w-full py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[10px] font-black uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 mt-2"
            >
              <span>Explore Lotto Plus</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Card 2: Play Whe */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-amber-500/20 hover:border-amber-500/50 transition-all duration-300 space-y-4 relative group shadow-lg flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">Play Whe</span>
                  <span className="text-xs text-white font-bold">
                    {latestPlayWhe ? `${latestPlayWhe.draw_time_slot || "Draw"} #${latestPlayWhe.draw_number}` : "Loading..."}
                  </span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold">
                  {latestPlayWhe?.draw_date || "Official"}
                </span>
              </div>

              {/* Play Whe Winning Ball & Mark */}
              <div className="py-2 flex items-center gap-3">
                {loadingResults && !latestPlayWhe ? (
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-slate-800" />
                    <div className="w-20 h-4 bg-slate-800 rounded" />
                  </div>
                ) : latestPlayWhe ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.4)] shrink-0">
                      {latestPlayWhe.winning_number}
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-black text-white uppercase tracking-wider">
                        {CHINAPOO_CHART[latestPlayWhe.winning_number]?.mark || "Unknown"}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[140px]">
                        {CHINAPOO_CHART[latestPlayWhe.winning_number]?.keywords?.slice(0, 2).join(", ") || "Tradition mark"}
                      </div>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-gray-500 italic">No draw data found</span>
                )}
              </div>

              <p className="text-[10px] text-gray-400">
                Next: <strong className="text-amber-400">10:30 AM · 1:00 PM · 4:00 PM · 7:00 PM</strong>
              </p>
            </div>

            <button
              onClick={() => onSelectGame && onSelectGame("play-whe")}
              className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 mt-2"
            >
              <span>Explore Play Whe</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Card 3: Win For Life */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300 space-y-4 relative group shadow-lg flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Win For Life</span>
                  <span className="text-xs text-white font-bold">
                    {latestWinForLife ? `Draw #${latestWinForLife.draw_number}` : "Loading..."}
                  </span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold">
                  {latestWinForLife?.draw_date || "Official"}
                </span>
              </div>

              {/* Win For Life Winning Balls */}
              <div className="py-2">
                {loadingResults && !latestWinForLife ? (
                  <div className="flex gap-1.5 animate-pulse">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded-full bg-slate-800" />
                    ))}
                    <div className="w-7 h-7 rounded-full bg-emerald-900/40 ml-1" />
                  </div>
                ) : latestWinForLife ? (
                  <div className="flex flex-wrap items-center gap-1">
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
                        className="w-7 h-7 rounded-full bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                      >
                        {num}
                      </div>
                    ))}
                    {latestWinForLife.cash_ball && (
                      <>
                        <span className="text-gray-600 font-bold mx-0.5">|</span>
                        <div
                          className="w-7 h-7 rounded-full bg-emerald-600 border border-emerald-400 text-white font-black text-[11px] flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.4)]"
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

              <p className="text-[10px] text-gray-400">
                Top Prize: <strong className="text-emerald-400">$20,000 / Month for 20 Yrs</strong>
              </p>
            </div>

            <button
              onClick={() => onSelectGame && onSelectGame("win-for-life")}
              className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 mt-2"
            >
              <span>Explore Win For Life</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

        </div>
      </div>

      {/* 3. Interactive Quick Pick */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
          Quick Pick Generator
        </h2>
        <InteractiveTumbler initialGame="lotto-plus" />
      </div>

      {/* 4. Interactive Ticket Shading Demonstration Animation */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
          Interactive Playslip Simulator
        </h2>
        <div className="flex justify-center">
          <div className="bg-[#f4efe0] text-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-slate-300/30 p-6 font-mono w-full max-w-md relative overflow-hidden h-[460px] flex flex-col justify-between select-none">

            {/* Ticket Header Details */}
            <div className="mt-2 space-y-1 border-b border-dashed border-slate-400 pb-3">
              <h2 className="text-md font-black text-slate-800 uppercase tracking-widest text-center">
                THE WIN CONCEPT
              </h2>
              <div className="text-center text-[9px] font-bold text-slate-600 bg-slate-200 py-0.5 rounded tracking-wider uppercase">
                Statistical Model Optimizer
              </div>
            </div>

            {/* Checklist Number Matrix Grid */}
            <div className="relative my-4 flex-1">
              <div className="grid grid-cols-6 gap-2 h-full py-1">
                {Array.from({ length: 36 }).map((_, idx) => {
                  const num = idx + 1;
                  const isShaded = shadedNums.includes(num);
                  return (
                    <div
                      key={num}
                      className="border border-slate-400 bg-white/60 relative flex items-center justify-center rounded text-xs font-bold text-slate-800 transition"
                    >
                      <span>{String(num).padStart(2, "0")}</span>
                      
                      {/* Pencil Shading Overlay lines */}
                      {isShaded && (
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                          <svg viewBox="0 0 100 100" className="w-full h-full text-slate-700 opacity-90">
                            <path 
                              d="M10,20 L90,80 M15,10 L85,90 M30,10 L70,90 M10,30 L90,70 M20,15 L80,85 M5,45 L95,55 M45,5 L55,95" 
                              stroke="currentColor" 
                              strokeWidth="10" 
                              strokeLinecap="round"
                              className="animate-scribble"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Animated Floating Pencil */}
              <div
                className={`absolute w-8 h-8 pointer-events-none transition-all duration-300 ease-out z-20 ${
                  pencilPos.shake ? "animate-pencil-wiggle" : ""
                }`}
                style={{
                  left: `${pencilPos.x}%`,
                  top: `${pencilPos.y}%`,
                  transform: `translate(-2%, -98%) rotate(${pencilPos.rotate}deg)`,
                }}
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 filter drop-shadow-md text-amber-500">
                  <path
                    d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
                    fill="#f59e0b"
                    stroke="#b45309"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="m15 5 4 4" stroke="#78350f" strokeWidth="1.5" />
                  <path d="M2 22l3-1-2-2z" fill="#1e293b" />
                </svg>
              </div>

              {/* Good Luck Stamp Overlay */}
              {showGoodLuck && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                  <div className="border-4 border-red-600 text-red-600 px-6 py-2 rounded-lg font-black text-2xl tracking-widest uppercase transform -rotate-6 animate-stamp-scale opacity-90 shadow-2xl bg-white/40 backdrop-blur-[1px]">
                    GOOD LUCK!
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-300 pt-3 text-center text-[8px] text-slate-500 font-extrabold tracking-widest uppercase">
              MODEL COMPILING SYSTEM
            </div>

          </div>
        </div>
      </div>

      {/* 5. Comprehensive How It Works & Architecture Hub */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/5 bg-slate-950/40 space-y-6">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <div>
            <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wider">
              How The Win Concept Mathematical Engine Works
            </h3>
            <p className="text-xs text-gray-400">
              Transforming raw historical draw logs into predictive combinatorial advantages
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          {/* Engine 1: Genetic Algorithm */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-sky-500/20 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <h4>1. Genetic Algorithm Optimizer</h4>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Simulates natural selection across a <strong>5,000-candidate population</strong> over 50 generations. It ranks lines based on historical companions, sum distribution equilibrium, and odd/even balance to isolate mathematically optimal combinations.
            </p>
          </div>

          {/* Engine 2: Bayesian & Markov Consensus */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h4>2. Bayesian &amp; Markov Networks</h4>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Tracks first and second-order transition matrices for Play Whe and Lotto Plus. It calculates the exact probability of mark <em>B</em> appearing immediately after mark <em>A</em>, isolating high-probability successor pathways.
            </p>
          </div>

          {/* Engine 3: EWMA & RTM Z-Scores */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <h4>3. EWMA &amp; RTM Z-Score Signals</h4>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Uses Exponentially Weighted Moving Averages (α=0.12) to weight recent draw trends, combined with Regression-To-The-Mean Z-Scores. Any number with <strong>Z &lt; -1.5</strong> is flagged as overdue for statistical rebound.
            </p>
          </div>

          {/* Engine 4: Syndicate Group Pooling */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-violet-500/20 space-y-2">
            <div className="flex items-center gap-2 text-violet-400 font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              <h4>4. Syndicate Group Pooling</h4>
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Pooling stakes with friends and family drastically expands matrix coverage. The platform auto-manages share percentages, calculates jackpot payouts per member, and generates verified shareable slips for WhatsApp group chats.
            </p>
          </div>

        </div>
      </div>

      {/* 6. Warning Disclaimer Panel */}
      <div className="glass-panel p-5 rounded-xl border-red-500/10 bg-red-500/[0.01] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 font-mono">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Disclaimer & Fair Play Notice</h4>
            <p className="text-xs leading-relaxed text-gray-400">
              This application is designed as a statistical tool that attempts to reduce the mathematical odds of NLCB online games by tracking historical frequencies and delta gaps. It is <strong>NOT affiliated with, authorized, or endorsed by the National Lotteries Control Board (NLCB)</strong> of Trinidad and Tobago in any form or fashion. Using this app <strong>does NOT guarantee any winnings</strong>. Please play responsibly.
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
              Creating and maintaining these complex analytical scraping systems requires time, hosting, and dedication. If this mathematical tool helps you hit a lucky streak, win big, or become wealthy, please show some love and support the creator!
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

      {/* Embedded Animation Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scribble {
          from {
            stroke-dasharray: 600;
            stroke-dashoffset: 600;
          }
          to {
            stroke-dasharray: 600;
            stroke-dashoffset: 0;
          }
        }
        .animate-scribble {
          animation: scribble 0.4s ease-out forwards;
        }
        
        @keyframes pencil-wiggle {
          0%, 100% { transform: translate(-2%, -98%) rotate(-10deg) translate(0, 0); }
          25% { transform: translate(-2%, -98%) rotate(-10deg) translate(-2px, 2px); }
          50% { transform: translate(-2%, -98%) rotate(-10deg) translate(2px, -2px); }
          75% { transform: translate(-2%, -98%) rotate(-10deg) translate(-1px, -1px); }
        }
        .animate-pencil-wiggle {
          animation: pencil-wiggle 0.08s infinite;
        }

        @keyframes stamp-scale {
          0% { transform: scale(3) rotate(0deg); opacity: 0; }
          40% { transform: scale(1) rotate(-6deg); opacity: 1; }
          100% { transform: scale(1) rotate(-6deg); opacity: 1; }
        }
        .animate-stamp-scale {
          animation: stamp-scale 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}} />

    </div>
  );
}
