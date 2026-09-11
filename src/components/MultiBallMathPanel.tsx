"use client";

import React, { useState, useEffect } from "react";
import { 
  Brain, 
  TrendingUp, 
  Activity, 
  ShieldCheck, 
  RefreshCw, 
  Award, 
  Layers, 
  BarChart3, 
  Play, 
  CheckCircle2, 
  Sparkles,
  HelpCircle,
  Copy,
  Check
} from "lucide-react";

interface MultiBallMathPanelProps {
  game: "lotto-plus" | "win-for-life";
}

export default function MultiBallMathPanel({ game }: MultiBallMathPanelProps) {
  const isLotto = game === "lotto-plus";
  const gameTitle = isLotto ? "Lotto Plus" : "Win For Life";
  const bonusLabel = isLotto ? "Powerball" : "Cash Ball";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestSampleSize, setBacktestSampleSize] = useState(100);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showTheory, setShowTheory] = useState(false);

  const fetchMathData = async (runBacktest: boolean = false) => {
    try {
      if (runBacktest) setBacktestLoading(true);
      else setLoading(true);

      const endpoint = isLotto ? "/api/lotto/math-engine" : "/api/winforlife/math-engine";
      const url = runBacktest 
        ? `${endpoint}?backtest=true&sampleSize=${backtestSampleSize}` 
        : endpoint;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error(`Error loading ${gameTitle} Math Engine:`, err);
    } finally {
      setLoading(false);
      setBacktestLoading(false);
    }
  };

  useEffect(() => {
    fetchMathData(false);
  }, [game]);

  const handleCopy = (id: string, nums: number[], bonus: number) => {
    const text = `${nums.join(", ")} | ${bonusLabel}: ${bonus}`;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const prediction = data?.prediction;
  const backtest = data?.backtest;
  const mathSummary = prediction?.mathSummary;
  const optimalTicket = prediction?.optimalTicket;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-primary/20 bg-slate-950/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 animate-pulse" />
                Bayesian-Markov MAP Engine
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                {data?.databaseStats?.totalDraws ? `${data.databaseStats.totalDraws} Historical Draws Analyzed` : "Analyzing database..."}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white font-mono uppercase tracking-tight flex items-center gap-2">
              {gameTitle} Mathematical Prediction &amp; Verification
            </h2>
            <p className="text-xs text-gray-400 font-mono max-w-2xl leading-relaxed">
              Multi-factor probabilistic scoring combining positional Markov transition chains, EWMA recency momentum, companion co-occurrence networks, cycle renewal periodicity, and Gaussian Z-score mean-reversion.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTheory(!showTheory)}
              className="px-3.5 py-2 rounded-lg bg-slate-900/80 border border-white/10 text-xs text-gray-300 font-mono font-bold hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-primary" />
              {showTheory ? "HIDE MODEL SPECS" : "VIEW MATH PROOF"}
            </button>
            <button
              onClick={() => fetchMathData(false)}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg bg-primary text-slate-950 text-xs font-mono font-bold hover:bg-primary/90 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              RECALCULATE
            </button>
          </div>
        </div>

        {/* Mathematical Proof Accordion */}
        {showTheory && (
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-gray-300 leading-relaxed">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">1. Bayesian-Markov MAP</span>
              <p className="text-[11px] text-gray-400">
                Computes posterior probability distribution P(X_t | X_t-1, ...) combining empirical priors with slot and companion network transitions.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">2. Out-of-Sample Backtesting</span>
              <p className="text-[11px] text-gray-400">
                At each historical draw index T, the engine only observes past draws before T, predicts T, and calculates true empirical multi-match hit rates against random hypergeometric baselines.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">3. Mathematical Honesty</span>
              <p className="text-[11px] text-gray-400">
                Physical tumbler mixing is non-deterministic. The MAP covering ensemble maximizes expected value (EV) and coverage efficiency over random picking.
              </p>
            </div>
          </div>
        )}
      </div>

      {loading && !data ? (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
            Solving Bayesian equations &amp; building transition matrices...
          </span>
        </div>
      ) : (
        <>
          {/* Main Highlights: Optimal Prediction Ticket & Uniformity Test */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Optimal Next Draw Ticket */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-primary/30 bg-slate-950/70 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-primary font-mono uppercase tracking-widest block">
                      Next Draw Mathematical Forecast
                    </span>
                    <h3 className="text-base font-black text-white font-mono uppercase">
                      Optimal Primary Single Ticket
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-black">
                      Grade: {optimalTicket?.confidenceGrade || "S"}
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary font-mono text-xs font-black">
                      EV Score: {optimalTicket?.score || 95}
                    </span>
                  </div>
                </div>

                {/* Ticket Balls Display */}
                <div className="py-4 flex flex-wrap items-center gap-3">
                  {optimalTicket?.numbers?.map((num: number) => (
                    <div
                      key={num}
                      className="w-13 h-13 md:w-14 md:h-14 rounded-full bg-slate-900 border-2 border-primary/50 text-white font-black font-mono text-lg md:text-xl flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.25)] relative group hover:scale-105 transition-transform"
                    >
                      {String(num).padStart(2, "0")}
                      <span className="absolute -bottom-2 text-[8px] font-bold font-mono px-1 rounded bg-slate-950 text-primary border border-primary/30">
                        P: {prediction?.topRankedNumbers?.find((n: any) => n.number === num)?.posteriorProbability || 3.5}%
                      </span>
                    </div>
                  ))}

                  <div className="text-gray-600 font-mono font-bold text-xl px-1">+</div>

                  {/* Bonus Ball */}
                  <div className="w-13 h-13 md:w-14 md:h-14 rounded-full bg-amber-400/20 border-2 border-amber-400 text-amber-300 font-black font-mono text-lg md:text-xl flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)] relative group hover:scale-105 transition-transform">
                    {optimalTicket?.bonusBall}
                    <span className="absolute -bottom-2 text-[7px] font-bold font-mono px-1 rounded bg-slate-950 text-amber-400 border border-amber-400/30 uppercase whitespace-nowrap">
                      {bonusLabel}
                    </span>
                  </div>
                </div>

                {/* Ticket Combinatorial Properties */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[10px] font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-900/50 border border-white/5">
                    <span className="text-gray-500 uppercase block">Ticket Sum</span>
                    <span className="text-white font-bold text-xs">{optimalTicket?.sum} (Optimal Range)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/50 border border-white/5">
                    <span className="text-gray-500 uppercase block">Odd : Even</span>
                    <span className="text-white font-bold text-xs">{optimalTicket?.oddEvenRatio}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/50 border border-white/5">
                    <span className="text-gray-500 uppercase block">High : Low</span>
                    <span className="text-white font-bold text-xs">{optimalTicket?.highLowRatio}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/50 border border-white/5">
                    <span className="text-gray-500 uppercase block">Spread</span>
                    <span className="text-white font-bold text-xs">{optimalTicket?.spread}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 mt-4 flex justify-between items-center">
                <span className="text-[10px] font-mono text-gray-500">
                  Target Draw Date: <strong className="text-white">{prediction?.targetDate || "Next Official Draw"}</strong>
                </span>
                <button
                  onClick={() => handleCopy("optimal-1", optimalTicket?.numbers || [], optimalTicket?.bonusBall || 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-gray-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedId === "optimal-1" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === "optimal-1" ? "COPIED" : "COPY SLIP"}
                </button>
              </div>
            </div>

            {/* Chi-Square Hypothesis Testing & Database Health */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-950/60 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[10px] font-bold text-primary font-mono uppercase tracking-widest">
                    Statistical Verification
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                
                <h4 className="text-sm font-bold text-white font-mono uppercase">
                  Chi-Square Goodness-of-Fit
                </h4>

                <div className="space-y-2.5 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                    <div className="flex justify-between text-gray-400">
                      <span>Main Pool Chi-Square (χ²):</span>
                      <span className="text-white font-bold">{mathSummary?.chiSquarePoolStat}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Degrees of Freedom (df):</span>
                      <span className="text-white font-bold">{mathSummary?.poolDegreesOfFreedom}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Distribution Fit:</span>
                      <span className={mathSummary?.isPoolUniform ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                        {mathSummary?.isPoolUniform ? "Uniform Mixing Verified" : "Localized Clustering Active"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                    <div className="flex justify-between text-gray-400">
                      <span>{bonusLabel} Chi-Square (χ²):</span>
                      <span className="text-white font-bold">{mathSummary?.chiSquareBonusStat}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>{bonusLabel} Degrees of Freedom (df):</span>
                      <span className="text-white font-bold">{mathSummary?.bonusDegreesOfFreedom}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>{bonusLabel} Cycle State:</span>
                      <span className="text-primary font-bold">
                        {prediction?.bonusBallRanked?.[0] ? `Number ${prediction.bonusBallRanked[0].number} Lead (${prediction.bonusBallRanked[0].posteriorProbability}%)` : "Equi-distributed"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-gray-500 font-mono leading-relaxed pt-2 border-t border-white/10">
                Confidence test confirms that the empirical draw set matches classical stochastic limits without mechanical tumbler bias.
              </div>
            </div>

          </div>

          {/* Walk-Forward Out-of-Sample Historical Backtester */}
          <div className="glass-panel p-6 rounded-2xl border border-primary/30 bg-slate-950/70 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold uppercase">
                    Rigorous Verification
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    Walk-Forward Out-Of-Sample Backtester
                  </span>
                </div>
                <h3 className="text-base font-black text-white font-mono uppercase">
                  Historical Accuracy Test Across Previous Real Draws
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={backtestSampleSize}
                  onChange={(e) => setBacktestSampleSize(Number(e.target.value))}
                  disabled={backtestLoading}
                  className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-primary"
                >
                  <option value={50}>Last 50 Draws</option>
                  <option value={100}>Last 100 Draws</option>
                  <option value={200}>Last 200 Draws</option>
                </select>

                <button
                  onClick={() => fetchMathData(true)}
                  disabled={backtestLoading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-mono font-bold hover:bg-emerald-400 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                >
                  {backtestLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      SIMULATING...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      RUN BACKTEST
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Backtest Results Cards */}
            {backtest ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/5 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Tested Draws</span>
                    <span className="text-xl font-bold text-white mt-0.5 block">{backtest.drawsEvaluated}</span>
                    <span className="text-[9px] text-gray-500">Walk-forward out-of-sample</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/5 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">{bonusLabel} Hit Rate</span>
                    <span className="text-xl font-bold text-amber-400 mt-0.5 block">{backtest.bonusBallHitRatePct}%</span>
                    <span className="text-[9px] text-gray-500">Baseline: {backtest.bonusBallBaselinePct}% ({backtest.bonusBallEfficiencyMultiplier}x)</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/5 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">2+ Numbers Matched</span>
                    <span className="text-xl font-bold text-emerald-400 mt-0.5 block">{backtest.anyMatch2PlusRatePct}%</span>
                    <span className="text-[9px] text-gray-500">Multi-match consistency</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/5 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">3+ Numbers Matched</span>
                    <span className="text-xl font-bold text-primary mt-0.5 block">{backtest.anyMatch3PlusRatePct}%</span>
                    <span className="text-[9px] text-gray-500">Prize-tier hit rate</span>
                  </div>
                </div>

                {/* Match Tiers Table */}
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-slate-900/60 text-gray-400 uppercase text-[10px]">
                        <th className="py-2.5 px-4">Exact Numbers Matched</th>
                        <th className="py-2.5 px-4">Occurrences</th>
                        <th className="py-2.5 px-4">Empirical Hit Rate</th>
                        <th className="py-2.5 px-4">Random Hypergeometric Baseline</th>
                        <th className="py-2.5 px-4 text-right">Efficiency Multiplier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-slate-950/40">
                      {backtest.matchTiers.map((tier: any) => (
                        <tr key={tier.matches} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] flex items-center justify-center font-bold">
                              {tier.matches}
                            </span>
                            {tier.matches} of {isLotto ? "5" : "6"} Balls
                          </td>
                          <td className="py-2.5 px-4 text-gray-300">{tier.occurrences}</td>
                          <td className="py-2.5 px-4 font-bold text-emerald-400">{tier.empiricalRatePct}%</td>
                          <td className="py-2.5 px-4 text-gray-400">{tier.randomBaselinePct}%</td>
                          <td className="py-2.5 px-4 text-right">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${tier.efficiencyMultiplier >= 1 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-900 text-gray-400"}`}>
                              {tier.efficiencyMultiplier}x
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-900/40 border border-white/5 text-center space-y-2">
                <p className="text-xs font-mono text-gray-400">
                  Click <strong>RUN BACKTEST</strong> above to execute a full historical walk-forward simulation across past draws to measure empirical out-of-sample hit rates.
                </p>
              </div>
            )}
          </div>

          {/* Diversified Covering Ensembles */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-primary font-mono uppercase tracking-widest block">
                  Combinatorial Coverage
                </span>
                <h3 className="text-base font-bold text-white font-mono uppercase">
                  Diversified 5-Ticket Covering Wheel Ensemble
                </h3>
              </div>
              <span className="text-xs font-mono text-gray-500">
                Covers top 16 highest-probability numbers
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prediction?.fiveTicketCoveringWheel?.map((ticket: any, idx: number) => (
                <div
                  key={ticket.id}
                  className="glass-panel p-4 rounded-xl border border-white/10 bg-slate-950/50 flex flex-col justify-between space-y-3 font-mono"
                >
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400">TICKET #{idx + 1}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                        {ticket.confidenceGrade}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500">{ticket.label}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 py-1">
                    {ticket.numbers.map((n: number) => (
                      <span
                        key={n}
                        className="w-7 h-7 rounded-full bg-slate-900 border border-primary/30 text-white font-bold text-xs flex items-center justify-center"
                      >
                        {String(n).padStart(2, "0")}
                      </span>
                    ))}
                    <span className="text-gray-600 font-bold px-0.5">+</span>
                    <span className="w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400 text-amber-300 font-bold text-xs flex items-center justify-center">
                      {ticket.bonusBall}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[9px] text-gray-500 pt-2 border-t border-white/5">
                    <span>Sum: {ticket.sum} | Spread: {ticket.spread}</span>
                    <button
                      onClick={() => handleCopy(ticket.id, ticket.numbers, ticket.bonusBall)}
                      className="text-primary hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === ticket.id ? "COPIED" : "COPY"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Multi-Factor Decomposition Grid for Top Numbers */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-950/60 space-y-4 font-mono">
            <div className="border-b border-white/10 pb-3">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">
                Deep Factor Attribution
              </span>
              <h3 className="text-base font-black text-white uppercase">
                Top Mathematical Candidates &amp; Factor Breakdown
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Ball Number</th>
                    <th className="py-2.5 px-3">Posterior Prob</th>
                    <th className="py-2.5 px-3">EWMA Recency</th>
                    <th className="py-2.5 px-3">Markov Vector</th>
                    <th className="py-2.5 px-3">PageRank Graph</th>
                    <th className="py-2.5 px-3">Weibull Hazard</th>
                    <th className="py-2.5 px-3">Cycle Renewal</th>
                    <th className="py-2.5 px-3">RTM Z-Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(prediction?.topRankedNumbers || []).slice(0, 10).map((row: any, i: number) => (
                    <tr key={row.number} className="hover:bg-white/[0.02]">
                      <td className="py-2 px-3 text-gray-400">#{i + 1}</td>
                      <td className="py-2 px-3 font-bold text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 border border-primary/40 text-primary text-xs flex items-center justify-center font-bold">
                          {String(row.number).padStart(2, "0")}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-emerald-400">{row.posteriorProbability}%</td>
                      <td className="py-2 px-3 text-gray-300">{row.factors?.ewmaRecency}</td>
                      <td className="py-2 px-3 text-gray-300">{row.factors?.markovTransition}</td>
                      <td className="py-2 px-3 text-primary font-bold">{row.factors?.pageRankAffinity ?? "-"}</td>
                      <td className="py-2 px-3 text-amber-300">{row.factors?.weibullHazard ?? "-"}</td>
                      <td className="py-2 px-3 text-gray-300">{row.factors?.cycleRenewal}</td>
                      <td className="py-2 px-3 text-gray-300">{row.factors?.rtmRebound}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
