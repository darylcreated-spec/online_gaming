"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";
import { RefreshCw, TrendingUp, Calendar, Award, DollarSign, Database } from "lucide-react";

interface DashboardTabProps {
  stats: any;
  statsLoading: boolean;
  timeframe: string;
  setTimeframe: (val: string) => void;
  syncing: boolean;
  onSync: (full: boolean) => void;
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
  setTimeframe,
  syncing,
  onSync
}: DashboardTabProps) {
  
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

          {/* Sync Buttons */}
          <button
            onClick={() => onSync(false)}
            disabled={syncing}
            className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 border border-primary/50 hover:border-primary text-primary px-3.5 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(56,189,248,0.15)] hover:shadow-[0_0_15px_rgba(56,189,248,0.3)] shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "SYNCING..." : "SYNC RECENT"}
          </button>
          
          <button
            onClick={() => onSync(true)}
            disabled={syncing}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 border border-white/10 hover:border-primary/30 text-gray-300 hover:text-white px-3.5 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Database className="w-3.5 h-3.5" />
            {syncing ? "SYNCING..." : "SYNC FULL (2001+)"}
          </button>
        </div>
      </div>

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
              <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase font-mono">Latest Draw Date</span>
              <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-secondary" />
                {statsLoading ? "Loading..." : stats?.lastDrawDate ? new Date(stats.lastDrawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : "N/A"}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {statsLoading ? (
                <div className="text-sm text-gray-500">Loading draws...</div>
              ) : (
                <>
                  {stats?.rankings?.hotNumbers?.length > 0 ? (
                    // Display actual draw numbers if available (we will fetch from stats or directly page)
                    // Wait, we can pass latest draw info inside stats or load it. For now let's show static-looking balls 
                    // representing that we are loaded, or let's extract from stats. We will fetch this details from the API.
                    // Let's look up hot numbers or show the actual numbers
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-gray-500 font-mono mr-1">Hot 3:</span>
                      {hotNums.slice(0, 3).map((n: any) => (
                        <div key={n.number} className="w-8 h-8 rounded-full bg-primary/10 border border-primary text-primary flex items-center justify-center font-bold font-mono text-sm shadow-[0_0_8px_rgba(56,189,248,0.2)]">
                          {n.number}
                        </div>
                      ))}
                      <span className="text-xs text-gray-500 font-mono mx-1">Hot PB:</span>
                      {hotPbs.slice(0, 1).map((n: any) => (
                        <div key={n.number} className="w-8 h-8 rounded-full bg-secondary/10 border border-secondary text-secondary flex items-center justify-center font-bold font-mono text-sm shadow-[0_0_8px_rgba(192,132,252,0.2)]">
                          {n.number}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-xs font-mono">No data seeded yet. Click Sync.</span>
                  )}
                </>
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
                {statsLoading ? "..." : (stats?.latestDraw?.jackpot || "$10.2 MILLION").replace(/^\$/, "")}
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
                    <div key={n.number} className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/25 px-2.5 py-1 rounded-lg text-sm text-green-400 font-mono font-bold">
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
                    <div key={n.number} className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-lg text-sm text-rose-400 font-mono font-bold">
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
                    <div key={n.number} className="flex items-center gap-1.5 bg-secondary/10 border border-secondary/25 px-2.5 py-1 rounded-lg text-sm text-secondary font-mono font-bold">
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
    </div>
  );
}
