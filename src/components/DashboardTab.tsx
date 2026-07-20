"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { RefreshCw, TrendingUp, Calendar, Award, DollarSign, Database, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface DashboardTabProps {
  stats: any;
  statsLoading: boolean;
  timeframe: string;
  setTimeframe: (val: string) => void;
}

// Custom tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-3 border border-primary/30 rounded-md">
        <p className="font-mono text-sm text-foreground">Number: <span className="text-primary font-bold">{label}</span></p>
        <p className="font-mono text-sm text-foreground">Frequency: <span className="text-secondary font-bold">{payload[0].value}</span></p>
      </div>
    );
  }
  return null;
};

export default function DashboardTab({
  stats,
  statsLoading,
  timeframe,
  setTimeframe
}: DashboardTabProps) {
  const [showHelp, setShowHelp] = useState(false);
  
  // Lucky Generator States
  const [luckyNumbers, setLuckyNumbers] = useState<number[]>([]);
  const [luckyPowerball, setLuckyPowerball] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // Saved Slips States
  const [savedSlips, setSavedSlips] = useState<any[]>([]);
  const [loadingSlips, setLoadingSlips] = useState(false);

  // Fetch saved slips
  const fetchSlips = async () => {
    try {
      setLoadingSlips(true);
      const res = await fetch("/api/slips");
      const data = await res.json();
      if (data.success) {
        setSavedSlips(data.slips || []);
      }
    } catch (err) {
      console.error("Error fetching saved slips:", err);
    } finally {
      setLoadingSlips(false);
    }
  };

  useEffect(() => {
    fetchSlips();
  }, []);

  const handleDeleteSlip = async (id: number) => {
    if (!confirm("Are you sure you want to delete this saved ticket?")) return;
    try {
      const res = await fetch(`/api/slips?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        fetchSlips();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Pick 5 (QP5) function
  const qp5 = () => {
    const pool: number[] = [];
    while (pool.length < 5) {
      const rand = Math.floor(Math.random() * 35) + 1;
      if (!pool.includes(rand)) {
        pool.push(rand);
      }
    }
    pool.sort((a, b) => a - b);
    const pb = Math.floor(Math.random() * 10) + 1;
    return { numbers: pool, powerball: pb };
  };

  const generateLuckyNumbers = () => {
    setIsSpinning(true);
    setLuckyNumbers([]);
    setLuckyPowerball(null);
    
    setTimeout(() => {
      const result = qp5();
      setLuckyNumbers(result.numbers);
      setLuckyPowerball(result.powerball);
      setIsSpinning(false);
    }, 1500);
  };
  
  // Helper to calculate next Lotto Plus draw date (Wednesday or Saturday at 8:30 PM)
  const getNextDrawDate = () => {
    const now = new Date();
    const day = now.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    const hour = now.getHours();
    const min = now.getMinutes();
    const timeValue = hour + min / 60;

    let daysToAdd = 0;
    if (day === 0) daysToAdd = 3; // Sun -> Wed
    else if (day === 1) daysToAdd = 2; // Mon -> Wed
    else if (day === 2) daysToAdd = 1; // Tue -> Wed
    else if (day === 3) {
      daysToAdd = timeValue < 20.5 ? 0 : 3; // Wed before 8:30 PM -> today, after -> Sat
    }
    else if (day === 4) daysToAdd = 2; // Thu -> Sat
    else if (day === 5) daysToAdd = 1; // Fri -> Sat
    else if (day === 6) {
      daysToAdd = timeValue < 20.5 ? 0 : 4; // Sat before 8:30 PM -> today, after -> Wed
    }

    const nextDraw = new Date(now);
    nextDraw.setDate(now.getDate() + daysToAdd);
    return nextDraw.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " at 8:30 PM";
  };



  const hotNums = stats?.rankings?.hotNumbers || [];
  const coldNums = stats?.rankings?.coldNumbers || [];
  const hotPbs = stats?.rankings?.hotPowerballs || [];
  
  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Statistical Analytics</h2>
          <p className="text-sm text-gray-400">Real-time frequencies and hot/cold matrix calculations</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Timeframe Selector */}
          <div className="flex bg-slate-900/80 p-1 rounded-lg border border-white/5 w-full sm:w-auto">
            {(["3months", "6months", "alltime"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  timeframe === t
                    ? "bg-primary text-slate-950 font-bold shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {t === "3months" ? "3 Months" : t === "6months" ? "6 Months" : "All-Time"}
              </button>
            ))}
          </div>

          {/* Help Toggle Button */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold font-mono tracking-wider transition ${
              showHelp
                ? "bg-primary/20 border-primary text-primary"
                : "bg-slate-950 border-white/10 text-gray-300 hover:bg-slate-900"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            {showHelp ? "HIDE GUIDE" : "EXPLAIN SECTIONS"}
          </button>
        </div>
      </div>

      {/* Toggleable Explainer Section */}
      {showHelp && (
        <div className="glass-panel border border-white/5 p-5 rounded-xl bg-slate-950/20 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest border-b border-white/5 pb-2">
            Lotto Plus Dashboard Explainer Guide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px] leading-relaxed text-gray-400 font-mono">
            <div className="space-y-1.5">
              <h4 className="text-primary font-bold">1. TOTAL DRAWS & JACKPOT</h4>
              <p>
                <strong>Total Draws:</strong> Represents the entire historical database of official Lotto Plus drawings.
              </p>
              <p>
                <strong>Estimated Jackpot:</strong> Fetched live from the NLCB website to show current prize pool stakes.
              </p>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-primary font-bold">2. HOT & COLD NUMBERS</h4>
              <p>
                <strong>Hot Numbers/Powerballs:</strong> The most frequently drawn numbers in your selected timeframe (e.g. 3 Months).
              </p>
              <p>
                <strong>Cold Numbers/Powerballs:</strong> The numbers drawn least frequently, or with the largest draw gaps.
              </p>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-primary font-bold">3. FREQUENCIES & DELTAS</h4>
              <p>
                <strong>Frequencies:</strong> A bar chart visualizing how many times each number (1-35) was drawn.
              </p>
              <p>
                <strong>Delta Spacing:</strong> Measures the gaps/distances between sorted consecutive numbers in a single draw (e.g. 5, 12, 13, 20, 31 has deltas: 7, 1, 7, 11). Aids in observing dispersion trends.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Draws Card */}
        <div className="glass-panel p-5 rounded-xl flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
          <div className="space-y-1">
            <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase font-mono">Total Draws</span>
            <div className="text-3xl font-extrabold font-mono text-white">
              {statsLoading ? "..." : stats?.totalDraws ?? "0"}
            </div>
            <p className="text-xs text-gray-500">Persisted in local SQLite database</p>
          </div>
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 text-primary group-hover:scale-110 transition-transform">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Latest Draw Banner Card */}
        <div className="glass-panel p-5 rounded-xl flex items-center justify-between md:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary" />
          <div className="space-y-3 w-full">
            <div className="flex justify-between items-center w-full">
              <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase font-mono">Latest Draw Results</span>
              <span className="text-xs text-secondary font-mono font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-secondary" />
                {statsLoading ? "Loading..." : stats?.latestDraw ? `Draw #${stats.latestDraw.draw_number} on ${new Date(stats.latestDraw.draw_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}` : "N/A"}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {statsLoading ? (
                <div className="text-sm text-gray-500">Loading draws...</div>
              ) : stats?.latestDraw ? (
                <div className="flex gap-1.5 items-center w-full justify-between flex-wrap">
                  <div className="flex gap-1.5 items-center">
                    {[stats.latestDraw.num1, stats.latestDraw.num2, stats.latestDraw.num3, stats.latestDraw.num4, stats.latestDraw.num5].map((n: number, idx: number) => (
                      <div key={idx} className="w-8 h-8 rounded-full bg-primary/10 border border-primary/40 text-primary flex items-center justify-center font-bold font-mono text-sm shadow-[0_0_8px_rgba(56,189,248,0.15)]">
                        {n}
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full bg-secondary/10 border border-secondary/40 text-secondary flex items-center justify-center font-bold font-mono text-sm shadow-[0_0_8px_rgba(192,132,252,0.15)] ml-1">
                      {stats.latestDraw.powerball}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Next Draw: <span className="text-white font-bold">{getNextDrawDate()}</span>
                  </span>
                </div>
              ) : (
                <span className="text-gray-500 text-xs font-mono">No data seeded yet. Click Sync.</span>
              )}
            </div>
          </div>
        </div>

        {/* Next Jackpot Estimated Card */}
        <div className="glass-panel p-5 rounded-xl flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
          <div className="space-y-3 w-full">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase font-mono">Estimated Jackpot</span>
              <div className="text-2xl font-black font-mono text-primary pulse-glow uppercase">
                {statsLoading ? "..." : (stats?.nextJackpot || stats?.latestDraw?.jackpot || "$10.2 MILLION").replace(/^\$/, "")}
              </div>
            </div>
            
            {/* Latest Winning Numbers */}
            <div className="space-y-1 border-t border-white/5 pt-2">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Latest Winning Numbers</span>
              {statsLoading ? (
                <div className="text-[10px] text-gray-500 font-mono">Loading...</div>
              ) : stats?.latestDraw ? (
                <div className="flex gap-1 items-center">
                  {[stats.latestDraw.num1, stats.latestDraw.num2, stats.latestDraw.num3, stats.latestDraw.num4, stats.latestDraw.num5].map((n: number, idx: number) => (
                    <div key={idx} className="w-6 h-6 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-bold font-mono text-xs">
                      {n}
                    </div>
                  ))}
                  <div className="w-6 h-6 rounded-full bg-secondary/10 border border-secondary/30 text-secondary flex items-center justify-center font-bold font-mono text-xs ml-0.5">
                    {stats.latestDraw.powerball}
                  </div>
                </div>
              ) : (
                <span className="text-[10px] text-gray-500 font-mono">No draw data synced</span>
              )}
            </div>
            
            <p className="text-[10px] text-gray-500 font-mono">Next Draw: {getNextDrawDate()}</p>
          </div>
        </div>
      </div>

      {/* Custom CSS Animation Keyframes for Tumbler */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce-ball-1 {
          0%, 100% { transform: translate(10px, 10px); }
          25% { transform: translate(90px, 20px); }
          50% { transform: translate(20px, 90px); }
          75% { transform: translate(90px, 90px); }
        }
        @keyframes bounce-ball-2 {
          0%, 100% { transform: translate(90px, 90px); }
          35% { transform: translate(20px, 15px); }
          65% { transform: translate(95px, 10px); }
        }
        @keyframes bounce-ball-3 {
          0%, 100% { transform: translate(50px, 90px); }
          30% { transform: translate(15px, 15px); }
          60% { transform: translate(90px, 30px); }
          80% { transform: translate(20px, 80px); }
        }
        @keyframes bounce-ball-4 {
          0%, 100% { transform: translate(15px, 60px); }
          15% { transform: translate(80px, 90px); }
          55% { transform: translate(55px, 10px); }
          75% { transform: translate(90px, 40px); }
        }
        @keyframes bounce-ball-5 {
          0%, 100% { transform: translate(65px, 10px); }
          25% { transform: translate(10px, 80px); }
          50% { transform: translate(90px, 65px); }
          75% { transform: translate(30px, 20px); }
        }
        @keyframes bounce-ball-6 {
          0%, 100% { transform: translate(25px, 90px); }
          20% { transform: translate(90px, 25px); }
          45% { transform: translate(15px, 50px); }
          70% { transform: translate(80px, 80px); }
        }
        @keyframes ballDrop {
          0% {
            transform: translateY(-80px) scale(0.3);
            opacity: 0;
          }
          60% {
            transform: translateY(12px) scale(1.1);
            opacity: 0.9;
          }
          90% {
            transform: translateY(-4px) scale(0.98);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-ball-1 { animation: bounce-ball-1 4.5s infinite ease-in-out; }
        .animate-bounce-ball-2 { animation: bounce-ball-2 5s infinite ease-in-out; }
        .animate-bounce-ball-3 { animation: bounce-ball-3 4s infinite ease-in-out; }
        .animate-bounce-ball-4 { animation: bounce-ball-4 5.5s infinite ease-in-out; }
        .animate-bounce-ball-5 { animation: bounce-ball-5 3.8s infinite ease-in-out; }
        .animate-bounce-ball-6 { animation: bounce-ball-6 5.2s infinite ease-in-out; }
        .animate-spin-slow { animation: spin 25s infinite linear; }
        .animate-ball-drop { animation: ballDrop 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

      {/* QP5 Tumbler Generator Panel */}
      <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-950/40 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Tumbler stand and animated balls (Col Span 4) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center relative select-none min-h-[220px]">
            {/* Glowing Background Radial */}
            <div className="absolute w-48 h-48 bg-primary/10 rounded-full blur-[50px] animate-pulse pointer-events-none" />
            
            {/* Tumbler Stand */}
            <div className="relative w-52 h-52 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 text-slate-700/60 stroke-current fill-none stroke-[2.5] z-0">
                <path d="M20,85 L35,40 L65,40 L80,85" strokeLinecap="round" />
                <path d="M15,85 L85,85" strokeLinecap="round" strokeWidth="4" />
                <circle cx="50" cy="40" r="5" fill="#020617" stroke="white" strokeWidth="2" />
              </svg>

              <div className="relative w-40 h-40 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center p-3">
                {/* Outer Spinner Ring */}
                <div className="absolute inset-0 rounded-full border-2 border-dotted border-primary/20 animate-spin-slow" />
                {/* Inner Container */}
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-slate-900 via-[#0B0C0E] to-slate-950 border border-white/5 flex items-center justify-center relative overflow-hidden shadow-[inset_0_0_15px_rgba(255,255,255,0.05),0_0_20px_rgba(0,0,0,0.5)]">
                  <span className="font-mono text-[8px] text-gray-500 font-extrabold tracking-widest text-center uppercase leading-tight select-none z-10">
                    THE WIN<br />CONCEPT
                  </span>
                  
                  {/* Bouncing Colored Balls Inside Spinner Container */}
                  <div className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(56,189,248,0.6)] animate-bounce-ball-1 select-none z-0">
                    17
                  </div>
                  <div className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(167,139,250,0.6)] animate-bounce-ball-2 select-none z-0">
                    28
                  </div>
                  <div className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-bounce-ball-3 select-none z-0">
                    9
                  </div>
                  <div className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-bounce-ball-4 select-none z-0">
                    35
                  </div>
                  <div className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-bounce-ball-5 select-none z-0">
                    1
                  </div>
                  <div className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-bounce-ball-6 select-none z-0">
                    21
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls and Ball display (Col Span 8) */}
          <div className="md:col-span-8 space-y-4 font-mono">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Quick Pick 5 (QP5) Generator</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
                Draw 5 unique random numbers from 1 to 35 and 1 Powerball from 1 to 10 by spinning the animated lottery tumbler.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center pt-2">
              <button
                onClick={generateLuckyNumbers}
                disabled={isSpinning}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:from-amber-500/50 disabled:to-amber-500/50 disabled:cursor-not-allowed text-slate-950 text-xs font-black tracking-widest uppercase transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] rounded-lg cursor-pointer shrink-0"
              >
                {isSpinning ? "SPINNING..." : "SPIN TUMBLER"}
              </button>

              {/* Ball Drop Prediction Display */}
              {(luckyNumbers.length > 0 || isSpinning) && (
                <div className="flex flex-col items-center sm:items-start justify-center space-y-2 font-mono w-full">
                  <span className="text-[9px] text-primary uppercase font-bold tracking-widest">
                    {isSpinning ? "Drawing balls..." : "Your Lucky Ticket"}
                  </span>
                  <div className="flex justify-center items-center gap-1.5">
                    {isSpinning ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-8 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-ping" style={{ animationDelay: `${idx * 150}ms` }} />
                        </div>
                      ))
                    ) : (
                      <>
                        {/* 5 Main Numbers */}
                        {luckyNumbers.map((num, idx) => {
                          const ballGradients = [
                            "from-primary to-blue-600 text-white shadow-[0_0_10px_rgba(56,189,248,0.4)]",
                            "from-purple-500 to-indigo-600 text-white shadow-[0_0_10px_rgba(167,139,250,0.4)]",
                            "from-teal-400 to-emerald-600 text-white shadow-[0_0_10px_rgba(52,211,153,0.4)]",
                            "from-amber-400 to-orange-600 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.4)]",
                            "from-rose-500 to-pink-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                          ];
                          const gradientClass = ballGradients[idx % ballGradients.length];
                          return (
                            <div
                              key={idx}
                              className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradientClass} font-extrabold text-[11px] flex items-center justify-center select-none animate-ball-drop opacity-0`}
                              style={{ animationDelay: `${idx * 150}ms` }}
                            >
                              {String(num).padStart(2, "0")}
                            </div>
                          );
                        })}
                        {/* Plus Sign */}
                        <span className="text-gray-500 font-bold text-xs shrink-0 mx-0.5 animate-ball-drop opacity-0" style={{ animationDelay: "750ms" }}>+</span>
                        {/* Powerball */}
                        <div
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-white to-gray-200 text-slate-950 font-extrabold text-[11px] flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.4)] border border-white/20 select-none animate-ball-drop opacity-0"
                          style={{ animationDelay: "900ms" }}
                        >
                          {luckyPowerball}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Rankings Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Main Numbers Frequency Chart - Span 2 */}
        <div className="xl:col-span-2 glass-panel p-6 rounded-xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">Main Numbers Frequency</h3>
              <p className="text-xs text-gray-400">Total times drawn for numbers 1 to 35</p>
            </div>
            <div className="p-2 bg-primary/5 rounded-lg border border-primary/10 text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          
          <div className="h-72 w-full">
            {statsLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500 font-mono">
                Computing frequencies...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.mainFrequencies || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="number"
                    stroke="#475569"
                    fontSize={10}
                    fontFamily="Geist"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={10}
                    fontFamily="Geist"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <Bar
                    dataKey="count"
                    fill="#38bdf8"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        {/* Hot / Cold Matrix - Span 1 */}
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white">Hot & Cold Matrix</h3>
            <p className="text-xs text-gray-400">Ranked by draw frequency in timeframe</p>
          </div>
          
          {statsLoading ? (
            <div className="flex flex-col gap-6 text-sm text-gray-500 font-mono py-10 items-center justify-center">
              Calculating rankings...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Hot Numbers */}
              <div className="space-y-2">
                <span className="text-xs font-semibold tracking-wider text-green-400 uppercase font-mono">Top Hot Numbers</span>
                <div className="flex flex-wrap gap-2">
                  {hotNums.map((n: any) => (
                    <div key={n.number} className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/25 px-2.5 py-1 rounded-lg text-sm text-green-400 font-mono font-bold shadow-[0_0_12px_rgba(74,222,128,0.15)] animate-pulse">
                      <span>{n.number}</span>
                      <span className="text-xs text-green-500 font-normal">({n.count})</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Cold Numbers */}
              <div className="space-y-2">
                <span className="text-xs font-semibold tracking-wider text-rose-400 uppercase font-mono">Top Cold Numbers</span>
                <div className="flex flex-wrap gap-2">
                  {coldNums.map((n: any) => (
                    <div key={n.number} className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-lg text-sm text-rose-400 font-mono font-bold shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                      <span>{n.number}</span>
                      <span className="text-xs text-rose-500 font-normal">({n.count})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Powerball Frequencies List */}
              <div className="space-y-2 border-t border-white/5 pt-4">
                <span className="text-xs font-semibold tracking-wider text-secondary uppercase font-mono">Hot Powerballs</span>
                <div className="flex flex-wrap gap-2">
                  {hotPbs.map((n: any) => (
                    <div key={n.number} className="flex items-center gap-1.5 bg-secondary/10 border border-secondary/25 px-2.5 py-1 rounded-lg text-sm text-secondary font-mono font-bold shadow-[0_0_12px_rgba(192,132,252,0.15)]">
                      <span>{n.number}</span>
                      <span className="text-xs text-secondary-container/80 font-normal">({n.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Powerball Frequencies Bar Chart */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-white">Powerball Number Frequency</h3>
          <p className="text-xs text-gray-400">Total times drawn for Powerball numbers 1 to 10</p>
        </div>
        
        <div className="h-56 w-full">
          {statsLoading ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500 font-mono">
              Computing Powerball statistics...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.powerballFrequencies || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="number"
                  stroke="#475569"
                  fontSize={10}
                  fontFamily="Geist"
                  tickLine={false}
                />
                <YAxis
                  stroke="#475569"
                  fontSize={10}
                  fontFamily="Geist"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Bar
                  dataKey="count"
                  fill="#c084fc"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Delta Dispersion Scatter Plot */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Delta Gap Dispersion Scatter Plot
          </h3>
          <p className="text-xs text-gray-400 font-mono">Mathematical spread frequency of consecutive number differences</p>
        </div>
        
        <div className="h-64 w-full">
          {statsLoading ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500 font-mono">
              Computing delta dispersion...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={true} />
                <XAxis
                  type="number"
                  dataKey="gap"
                  name="Delta Gap"
                  stroke="#475569"
                  fontSize={10}
                  fontFamily="Geist"
                  tickLine={false}
                  domain={[1, 'auto']}
                />
                <YAxis
                  type="number"
                  dataKey="count"
                  name="Frequency"
                  stroke="#475569"
                  fontSize={10}
                  fontFamily="Geist"
                  tickLine={false}
                  axisLine={false}
                />
                <ZAxis type="number" range={[50, 400]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950/90 border border-white/10 p-2.5 rounded-lg shadow-xl font-mono text-[10px]">
                          <div className="text-primary font-bold">Delta Gap: {data.gap}</div>
                          <div className="text-white">Occurrences: {data.count} times</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter 
                  name="Deltas" 
                  data={stats?.gapFrequencies || []} 
                  fill="#38bdf8" 
                  line={{ stroke: '#38bdf8', strokeWidth: 1.5, strokeDasharray: '3 3' }} 
                  lineType="joint"
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Saved Slips Workspace Tracker */}
      <div className="glass-panel p-6 rounded-xl space-y-4">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Lotto Plus Slips Workspace Tracker
            </h3>
            <p className="text-xs text-gray-400">Track and auto-grade your saved combinations against NLCB drawings</p>
          </div>
          <button
            onClick={fetchSlips}
            className="p-1.5 hover:bg-white/5 rounded transition text-gray-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loadingSlips ? "animate-spin" : ""}`} />
          </button>
        </div>

        {savedSlips.length === 0 ? (
          <div className="text-center py-10 text-xs text-gray-500 font-mono">
            No saved slips found in your workspace. Build slips in the builder tab and click 'Save to Workspace' to track them.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 text-gray-400">
                  <th className="py-2">Label</th>
                  <th className="py-2">Numbers</th>
                  <th className="py-2">Powerball</th>
                  <th className="py-2">Saved Date</th>
                  <th className="py-2 text-right">Latest Match Result</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedSlips.map((slip) => {
                  const slipNums = slip.numbers.split(",").map(Number);
                  
                  // Calculate match grade against latest draw
                  let matchCount = 0;
                  let pbMatch = false;
                  
                  if (stats?.latestDraw) {
                    const winningNums = [
                      stats.latestDraw.num1,
                      stats.latestDraw.num2,
                      stats.latestDraw.num3,
                      stats.latestDraw.num4,
                      stats.latestDraw.num5
                    ].map(Number);
                    
                    matchCount = slipNums.filter((n: number) => winningNums.includes(n)).length;
                    pbMatch = stats.latestDraw.powerball === Number(slip.powerball);
                  }

                  const dateStr = new Date(slip.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <tr key={slip.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                      <td className="py-3 font-semibold text-white">{slip.name}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {slipNums.map((n: number, idx: number) => {
                            // Check if this number matched the winning numbers
                            const isWin = stats?.latestDraw && [
                              stats.latestDraw.num1,
                              stats.latestDraw.num2,
                              stats.latestDraw.num3,
                              stats.latestDraw.num4,
                              stats.latestDraw.num5
                            ].map(Number).includes(n);

                            return (
                              <span 
                                key={idx} 
                                className={`px-1.5 py-0.5 rounded font-bold ${
                                  isWin 
                                    ? "bg-primary/20 text-primary border border-primary/30" 
                                    : "bg-slate-900 border border-white/5 text-gray-400"
                                }`}
                              >
                                {String(n).padStart(2, "0")}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3">
                        {slip.powerball ? (
                          <span 
                            className={`px-1.5 py-0.5 rounded-full font-bold ${
                              pbMatch 
                                ? "bg-secondary/20 text-secondary border border-secondary/30" 
                                : "bg-slate-900 border border-white/5 text-gray-500"
                            }`}
                          >
                            {slip.powerball}
                          </span>
                        ) : "N/A"}
                      </td>
                      <td className="py-3 text-gray-500">{dateStr}</td>
                      <td className="py-3 text-right">
                        {stats?.latestDraw ? (
                          <span className={`font-extrabold ${
                            matchCount >= 3 
                              ? "text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.1)]" 
                              : matchCount > 0 
                              ? "text-primary" 
                              : "text-gray-500"
                          }`}>
                            {matchCount} Match{matchCount === 1 ? "" : "es"}
                            {pbMatch && " + Powerball"}
                          </span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteSlip(slip.id)}
                          className="text-red-500 hover:text-red-400 font-extrabold underline tracking-widest uppercase text-[10px] ml-4 cursor-pointer"
                        >
                          DELETE
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
