"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Binary,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Zap
} from "lucide-react";
import type { FastCashEngineReport } from "@/lib/fastcash_engine";
import { triggerHaptic } from "@/lib/haptics";

export default function FastCashTab() {
  const [report, setReport] = useState<FastCashEngineReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [depth, setDepth] = useState<number>(200);
  const [ledgerFilter, setLedgerFilter] = useState<"ALL" | "TOP5" | "TOP10">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReport = async (targetDepth = depth) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fastcash/engine?depth=${targetDepth}&limit=6000`, {
        cache: "no-store"
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load Fast Cash engine");
      setReport(json);
    } catch (err: any) {
      setError(err.message || "Failed to load Fast Cash analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(depth);
  }, [depth]);

  const handleSyncLatest = async () => {
    setSyncing(true);
    setBanner(null);
    setError(null);
    triggerHaptic("selection");
    try {
      const res = await fetch("/api/fastcash/sync?pages=10", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Sync failed");
      setBanner(
        `Synced ${json.pagesFetched} pages (${json.drawsFetched} checked, ${json.drawsAdded} new draws stored).`
      );
      triggerHaptic("success");
      await fetchReport(depth);
    } catch (err: any) {
      setError(err.message || "Sync failed");
      triggerHaptic("warning");
    } finally {
      setSyncing(false);
    }
  };

  const filteredLedger = useMemo(() => {
    if (!report) return [];
    const q = searchQuery.trim().toLowerCase();
    return report.auditLedger.filter((row) => {
      if (ledgerFilter === "TOP5" && !row.hit_top5) return false;
      if (ledgerFilter === "TOP10" && !row.hit_top10) return false;
      if (!q) return true;
      return (
        String(row.draw_number).includes(q) ||
        row.actual_code.toLowerCase().includes(q) ||
        row.top_driver.toLowerCase().includes(q)
      );
    });
  }, [report, ledgerFilter, searchQuery]);

  const latest = report?.diagnostics.latestDraw;
  const wf = report?.walkForwardSummary;
  const diag = report?.diagnostics;
  const nextPred = report?.nextDrawPrediction;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0f1418] rounded-2xl border border-rose-500/30 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center">
                <Zap className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  NLCB Fast Cash — Algorithmic RNG Replication Lab
                </h1>
                <p className="text-xs text-slate-400 font-mono">
                  38-State Wheel (0, 00, 01–36) • 3-Min High-Frequency Draws • Dedicated Turso Audit DB
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-[#171c20] rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
              {[100, 200, 500].map((d) => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    depth === d
                      ? "bg-rose-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {d} Draws
                </button>
              ))}
            </div>

            <button
              onClick={handleSyncLatest}
              disabled={syncing || loading}
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-rose-200 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "SYNCING..." : "SYNC LATEST DRAWS"}</span>
            </button>
          </div>
        </div>

        {/* Live Telemetry Strip */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-[#14191e] rounded-xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Fast Cash DB Size</div>
            <div className="text-base font-bold text-white mt-0.5">
              {report ? report.dbTotalDraws.toLocaleString() : "—"} draws
            </div>
          </div>
          <div className="bg-[#14191e] rounded-xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Latest Official Draw</div>
            <div className="text-base font-bold text-white mt-0.5">
              {latest ? `#${latest.draw_number}` : "—"}
              {latest && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded bg-rose-500 text-slate-950 text-xs font-black">
                  {latest.winning_code}
                </span>
              )}
            </div>
            {latest && (
              <div className="text-[10px] text-slate-400 mt-0.5">
                {latest.draw_date} • {latest.draw_time}
              </div>
            )}
          </div>
          <div className="bg-[#14191e] rounded-xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Shannon Entropy</div>
            <div className="text-base font-bold text-cyan-300 mt-0.5">
              {diag ? `${diag.shannonEntropyBits} / ${diag.maxEntropyBits} bits` : "—"}
            </div>
            {diag && (
              <div className="text-[10px] text-slate-400 mt-0.5">
                {diag.entropyEfficiencyPct}% uniform efficiency
              </div>
            )}
          </div>
          <div className="bg-[#14191e] rounded-xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase">Chi-Square (df=37)</div>
            <div className="text-base font-bold text-amber-300 mt-0.5">
              {diag ? `χ²=${diag.chiSquare} (p=${diag.pValueApprox})` : "—"}
            </div>
            {diag && (
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">{diag.verdict}</div>
            )}
          </div>
        </div>

        {banner && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{banner}</span>
          </div>
        )}
        {error && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {loading && !report ? (
        <div className="bg-[#0f1418] rounded-2xl border border-slate-800 p-10 text-center text-slate-400 font-mono text-xs">
          Running causal walk-forward RNG replication across Fast Cash database...
        </div>
      ) : report && report.dbTotalDraws === 0 ? (
        <div className="bg-[#0f1418] rounded-2xl border border-amber-500/30 p-8 text-center space-y-3">
          <div className="text-sm font-bold text-white">Fast Cash Database Is Currently Empty</div>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Click <strong>SYNC LATEST DRAWS</strong> above to ingest the latest draws immediately, or run{" "}
            <code className="text-rose-300">npx tsx --env-file=.env.local scripts/backfill_fastcash.ts --pages=250</code>{" "}
            to seed 6,000+ historical draws.
          </p>
        </div>
      ) : (
        <>
          {/* Next Draw Algorithmic Replication & Walk-Forward Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Next Draw Replication */}
            <div className="bg-[#0f1418] rounded-2xl border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-rose-400" />
                  <h2 className="font-bold text-white text-sm sm:text-base">
                    Next Draw Replication Target (#{nextPred?.targetDrawNumber})
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                  38-State Ensemble
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#14191e] rounded-xl p-3 border border-rose-500/40">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Primary Top-1</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="w-10 h-10 rounded-xl bg-rose-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg">
                      {nextPred?.top1}
                    </span>
                    <div className="text-[11px] font-mono text-slate-300">
                      <div>Score: {nextPred?.rankedScores[0]?.score}%</div>
                      <div className="text-slate-500">Base: 2.63%</div>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 bg-[#14191e] rounded-xl p-3 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase mb-2">
                    Top-5 Algorithmic Candidate Set
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {nextPred?.top5.map((code, i) => (
                      <span
                        key={code}
                        className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs border ${
                          i === 0
                            ? "bg-rose-500/20 border-rose-400 text-rose-200"
                            : "bg-slate-800 border-slate-700 text-white"
                        }`}
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#14191e] rounded-xl p-3 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase mb-2">
                  Top-10 Coverage Set
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {nextPred?.top10.map((code) => (
                    <span
                      key={code}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs font-semibold"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              {nextPred && (
                <div className="text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span>
                    Best LCG Rule:{" "}
                    <strong className="text-cyan-300">
                      ({nextPred.bestAffineRule.a}x + {nextPred.bestAffineRule.c}) mod 38
                    </strong>
                  </span>
                  <span>
                    Trailing Top-5 Fit: <strong className="text-white">{nextPred.bestAffineRule.trainHitTop5Pct}%</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Walk-Forward Out-of-Sample Audit Summary */}
            <div className="bg-[#0f1418] rounded-2xl border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <h2 className="font-bold text-white text-sm sm:text-base">
                    Walk-Forward Replication Accuracy ({wf?.evaluatedCount} Draws)
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[10px] font-mono">
                  Out-of-Sample
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <div className="bg-[#14191e] rounded-xl p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-400">TOP-1 HIT RATE</div>
                  <div className="text-lg font-bold text-white mt-1">{wf?.top1RatePct}%</div>
                  <div className="text-[10px] text-slate-500">
                    {wf?.top1Hits}/{wf?.evaluatedCount} (Base {wf?.top1BaselinePct}%)
                  </div>
                </div>
                <div className="bg-[#14191e] rounded-xl p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-400">TOP-5 HIT RATE</div>
                  <div className="text-lg font-bold text-emerald-300 mt-1">{wf?.top5RatePct}%</div>
                  <div className="text-[10px] text-slate-500">
                    {wf?.top5Hits}/{wf?.evaluatedCount} (Base {wf?.top5BaselinePct}%)
                  </div>
                </div>
                <div className="bg-[#14191e] rounded-xl p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-400">TOP-10 HIT RATE</div>
                  <div className="text-lg font-bold text-cyan-300 mt-1">{wf?.top10RatePct}%</div>
                  <div className="text-[10px] text-slate-500">
                    {wf?.top10Hits}/{wf?.evaluatedCount} (Base {wf?.top10BaselinePct}%)
                  </div>
                </div>
              </div>

              <div className="bg-[#14191e] rounded-xl p-3 border border-slate-800 space-y-2">
                <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1.5">
                  <Binary className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sub-Model Top-5 Capture vs 13.16% Random Baseline</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Markov</div>
                    <div className="font-bold text-white">{wf?.markovTop5RatePct}%</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
                    <div className="text-[10px] text-slate-400">LCG Affine</div>
                    <div className="font-bold text-white">{wf?.lcgTop5RatePct}%</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Phase Mod</div>
                    <div className="font-bold text-white">{wf?.phaseTop5RatePct}%</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/70 border border-slate-800">
                    <div className="text-[10px] text-slate-400">EWMA Gap</div>
                    <div className="font-bold text-white">{wf?.ewmaTop5RatePct}%</div>
                  </div>
                </div>
              </div>

              {diag && (
                <div className="text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Repeat Rate: <strong className="text-white">{diag.repeatRatePct}%</strong> (exp {diag.expectedRepeatRatePct}%)
                  </span>
                  <span>
                    Max Autocorr (Lag 1–20):{" "}
                    <strong className="text-white">
                      Lag {diag.maxAbsAutocorrLag1To20.lag} (r={diag.maxAbsAutocorrLag1To20.r})
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Draw-by-Draw Verification Audit Ledger */}
          <div className="bg-[#0f1418] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-rose-400" />
                  <h2 className="font-bold text-white text-base">
                    Fast Cash Draw-by-Draw Verification Audit Ledger
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Causal out-of-sample replication predictions graded against official Fast Cash draws (bonus &amp; jackpot ignored).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-[#171c20] rounded-lg p-0.5 border border-slate-800 text-xs">
                  {(["ALL", "TOP5", "TOP10"] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setLedgerFilter(tier)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        ledgerFilter === tier
                          ? "bg-rose-500 text-slate-950 font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tier === "ALL" ? "ALL" : tier === "TOP5" ? "TOP-5 HITS" : "TOP-10 HITS"}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Draw # or number..."
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 w-40"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[520px] overflow-y-auto sleek-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#171c20] border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-3 px-4">Target Draw</th>
                    <th className="py-3 px-4">Actual Ball</th>
                    <th className="py-3 px-4">Top-1</th>
                    <th className="py-3 px-4">Top-5 Replication Set</th>
                    <th className="py-3 px-4 text-center">Rank</th>
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No audit rows match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.slice(0, 150).map((row) => (
                      <tr key={row.draw_number} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          {row.draw_date && (
                            <span className="block text-[10px] text-cyan-400/80 font-normal mb-0.5">
                              {row.draw_date}
                            </span>
                          )}
                          #{row.draw_number}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {row.draw_time}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500 text-slate-950 font-black text-xs">
                            {row.actual_code}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-bold ${
                              row.hit_top1
                                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                                : "bg-slate-900 border-slate-700 text-slate-300"
                            }`}
                          >
                            {row.predicted_top1}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {row.predicted_top5.map((code) => (
                              <span
                                key={code}
                                className={`px-2 py-0.5 rounded text-[11px] border ${
                                  code === row.actual_code
                                    ? "bg-emerald-500/25 border-emerald-400 text-emerald-300 font-bold"
                                    : "bg-slate-900 border-slate-800 text-slate-300"
                                }`}
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-300">
                          #{row.rank_of_actual}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                          {row.top_driver}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {row.hit_top1 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                              TOP-1 HIT
                            </span>
                          ) : row.hit_top5 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                              TOP-5 HIT
                            </span>
                          ) : row.hit_top10 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-400/30">
                              TOP-10 HIT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-500">
                              MISS
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
