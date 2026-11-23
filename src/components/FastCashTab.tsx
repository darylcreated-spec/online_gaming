"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Binary,
  CheckCircle2,
  Cpu,
  Crosshair,
  GitMerge,
  Layers,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Zap
} from "lucide-react";
import type { FastCashEngineReport } from "@/lib/fastcash_engine";
import TrevorEnginePanel from "@/components/TrevorEnginePanel";
import Lucky7EnginePanel from "@/components/Lucky7EnginePanel";
import CrossEngineConsensusPanel from "@/components/CrossEngineConsensusPanel";
import { triggerHaptic } from "@/lib/haptics";

export default function FastCashTab() {
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "consensus" | "lucky7" | "trevor">("dashboard");
  const [report, setReport] = useState<FastCashEngineReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [depth, setDepth] = useState<number>(200);
  const [ledgerFilter, setLedgerFilter] = useState<"ALL" | "TOP5" | "TOP10" | "TOP14">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [countdownSec, setCountdownSec] = useState<number>(180);

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

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      setCountdownSec((prev) => {
        if (prev <= 1) {
          handleSyncLatest(true);
          return 180;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [autoRefresh, depth]);

  const handleSyncLatest = async (silent = false) => {
    setSyncing(true);
    if (!silent) setBanner(null);
    setError(null);
    if (!silent) triggerHaptic("selection");
    try {
      const res = await fetch("/api/fastcash/sync?pages=2", { method: "POST" });
      const rawText = await res.text();
      let json: any;
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned HTTP ${res.status}. Please try again in a few seconds.`);
      }
      if (!json.success) throw new Error(json.error || "Sync failed");
      setCountdownSec(180);
      if (json.skippedCooldown) {
        if (!silent) setBanner("Sync cooldown active (checked within last 45s).");
      } else {
        setBanner(
          `Synced ${json.pagesFetched} page(s) (${json.drawsAdded} new draw(s) stored).`
        );
      }
      if (!silent) triggerHaptic("success");
      if (!json.skippedCooldown || !report) {
        await fetchReport(depth);
      }
    } catch (err: any) {
      setError(err.message || "Sync failed");
      if (!silent) triggerHaptic("warning");
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
      if (ledgerFilter === "TOP14" && !row.hit_top14) return false;
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
              <img
                src="/images/fast_cash_icon.png"
                alt="Fast Cash"
                className="w-11 h-11 object-contain rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.35)] shrink-0"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-50 tracking-tight font-sans" style={{ color: "#f8fafc" }}>
                  NLCB Fast Cash: Live Results and Odds
                </h1>
                <p className="text-sm text-slate-300 font-sans">
                  38 numbers (0, 00, and 1 to 36), drawn every 3 minutes daily starting from $1.00 per play.
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
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
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
              onClick={() => {
                setAutoRefresh((v) => !v);
                setCountdownSec(180);
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                autoRefresh
                  ? "bg-emerald-500/15 border-emerald-400/50 text-emerald-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {autoRefresh ? `AUTO 3M (${countdownSec}s)` : "AUTO 3M: OFF"}
            </button>

            <button
              onClick={() => handleSyncLatest(false)}
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
            <div className="text-xs text-slate-400 uppercase">Fast Cash DB Size</div>
            <div className="text-base font-bold text-white mt-0.5">
              {report ? report.dbTotalDraws.toLocaleString() : "—"} draws
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Analyzed: {report ? report.analyzedDraws.toLocaleString() : "—"}
            </div>
          </div>
          <div className="bg-[#14191e] rounded-xl p-3 border border-slate-800">
            <div className="text-xs text-slate-400 uppercase">Latest Official Draw</div>
            <div className="text-base font-bold text-white mt-0.5">
              {latest ? `#${latest.draw_number}` : "—"}
              {latest && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded bg-rose-500 text-slate-950 text-xs font-black">
                  {latest.winning_code}
                </span>
              )}
            </div>
            {latest && (
              <div className="text-xs text-slate-400 mt-0.5">
                {latest.draw_date} at {latest.draw_time}
              </div>
            )}
          </div>
          <div className="bg-[#14191e] rounded-xl p-3 border border-slate-800">
            <div className="text-xs text-slate-400 uppercase font-semibold">Randomness Score</div>
            <div className="text-base font-bold text-cyan-300 mt-0.5">
              {diag ? `${diag.shannonEntropyBits} of ${diag.maxEntropyBits} bits` : "Pending"}
            </div>
            {diag && (
              <div className="text-xs text-slate-400 mt-0.5">
                {diag.entropyEfficiencyPct}% even spread
              </div>
            )}
          </div>
          <div className="bg-[#14191e] rounded-xl p-3 border border-slate-800">
            <div className="text-xs text-slate-400 uppercase font-semibold">Fairness Test</div>
            <div className="text-base font-bold text-white mt-0.5">
              {diag ? `Score ${diag.chiSquare} (p-value ${diag.pValueApprox})` : "Pending"}
            </div>
            {diag && (
              <div className="text-xs text-cyan-300 font-semibold mt-0.5 truncate">
                {diag.verdict.replace(/_/g, " ")}
              </div>
            )}
          </div>
        </div>

        {/* Recent 3-Min Official Draws Feed */}
        {report && report.recentDraws.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto pb-1 sleek-scrollbar">
            <span className="text-xs font-mono uppercase text-slate-400 shrink-0 pr-1">
              Recent Feed:
            </span>
            {report.recentDraws.slice(0, 12).map((d, idx) => (
              <div
                key={d.draw_number}
                className={`shrink-0 px-2.5 py-1.5 rounded-lg border font-mono text-xs flex items-center gap-2 ${
                  idx === 0
                    ? "bg-rose-500/15 border-rose-500/40 text-white"
                    : "bg-[#14191e] border-slate-800 text-slate-300"
                }`}
              >
                <span className="text-xs text-slate-400">{d.draw_time}</span>
                <span className="font-bold text-rose-300">{d.winning_code}</span>
              </div>
            ))}
          </div>
        )}

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

      {/* Fast Cash Subtab Navigator (Matches Rose Theme) */}
      <div className="flex bg-slate-900/90 p-1 rounded-xl border border-rose-500/25 w-full md:w-fit overflow-x-auto flex-nowrap scrollbar-none gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab("dashboard")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "dashboard"
              ? "bg-rose-500 text-slate-950 font-black shadow-[0_0_15px_rgba(244,63,94,0.35)]"
              : "text-slate-300 hover:text-rose-200 hover:bg-rose-500/10"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>LIVE ENGINE &amp; AUDIT</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("consensus")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "consensus"
              ? "bg-rose-500 text-slate-950 font-black shadow-[0_0_15px_rgba(244,63,94,0.35)]"
              : "text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>CONSENSUS LOCK</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("lucky7")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "lucky7"
              ? "bg-rose-500 text-slate-950 font-black shadow-[0_0_15px_rgba(244,63,94,0.35)]"
              : "text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
          }`}
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>LUCKY 7</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("trevor")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "trevor"
              ? "bg-rose-500 text-slate-950 font-black shadow-[0_0_15px_rgba(244,63,94,0.35)]"
              : "text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>TREVOR ENGINE</span>
        </button>
      </div>

      {activeSubTab === "consensus" ? (
        <CrossEngineConsensusPanel game="fast-cash" />
      ) : activeSubTab === "lucky7" ? (
        <Lucky7EnginePanel game="fast-cash" />
      ) : activeSubTab === "trevor" ? (
        <TrevorEnginePanel game="fast-cash" />
      ) : loading && !report ? (
        <div className="bg-[#0f1418] rounded-2xl border border-slate-800 p-10 text-center text-slate-400 font-mono text-xs">
          Running Two-Stage Hybrid RNG Replication &amp; Session Window Audit across Fast Cash database...
        </div>
      ) : report && report.dbTotalDraws === 0 ? (
        <div className="bg-[#0f1418] rounded-2xl border border-amber-500/30 p-8 text-center space-y-3">
          <div className="text-sm font-bold text-white">Fast Cash Database Is Currently Empty</div>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Click <strong>SYNC LATEST DRAWS</strong> above to ingest the latest draws immediately.
          </p>
        </div>
      ) : (
        <>
          {/* Next Draw Algorithmic Replication & Walk-Forward Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Next Draw Candidate Rankings */}
            <div className="bg-[#0f1418] rounded-2xl border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-rose-400" />
                  <h2 className="text-lg sm:text-xl font-bold text-slate-50" style={{ color: "#f8fafc" }}>
                    Next Draw Candidate Rankings (#{nextPred?.targetDrawNumber})
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-xs font-mono text-rose-300">
                  38-State Ensemble
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#14191e] rounded-xl p-3 border border-rose-500/40">
                  <div className="text-xs font-mono text-slate-400 uppercase">Top-1 Pick</div>
                  <div className="mt-2 flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-xl bg-rose-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg">
                      {nextPred?.top1}
                    </span>
                    <div className="text-xs font-mono text-slate-300">
                      <div className="text-white font-semibold">Weight: {nextPred?.rankedScores[0]?.score}%</div>
                      <div className="text-slate-400">Base: 2.63%</div>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 bg-[#14191e] rounded-xl p-3 border border-slate-800">
                  <div className="text-xs font-mono text-slate-400 uppercase mb-2">
                    Top-5 Core (Markov + LCG + Phase + EWMA)
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

              {/* Top-10 Picks */}
              <div className="bg-[#14191e] rounded-xl p-3 border border-amber-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-amber-300 uppercase font-bold">
                    Top-10 Picks (Matches TOP-10 Analytics)
                  </span>
                  <span className="text-xs font-mono text-slate-400">26.3% of Wheel</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {nextPred?.top10.map((code, idx) => (
                    <span
                      key={code}
                      className={`px-2.5 py-1 rounded font-mono text-xs font-semibold border ${
                        idx < 5
                          ? "bg-rose-500/15 border-rose-500/40 text-rose-200"
                          : "bg-amber-500/15 border-amber-500/40 text-amber-200"
                      }`}
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              {/* 14-Ball Core */}
              <div className="bg-[#14191e] rounded-xl p-3 border border-cyan-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-cyan-300 uppercase font-bold">
                    14-Ball Extended Core (Top-14 Ranked)
                  </span>
                  <span className="text-xs font-mono text-slate-400">36.8% of Wheel</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {nextPred?.top14MandelCore.map((code, idx) => (
                    <span
                      key={code}
                      className={`px-2.5 py-1 rounded font-mono text-xs font-semibold border ${
                        idx < 5
                          ? "bg-rose-500/15 border-rose-500/40 text-rose-200"
                          : idx < 10
                          ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                          : "bg-slate-900 border-slate-700 text-slate-200"
                      }`}
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              {/* 19-Ball Half-Wheel */}
              <div className="bg-[#14191e] rounded-xl p-3 border border-emerald-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-emerald-300 uppercase font-bold">
                    19-Ball Half-Wheel Coverage
                  </span>
                  <span className="text-xs font-mono text-slate-400">50.0% of Wheel</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {nextPred?.top19HalfWheel.map((code) => (
                    <span
                      key={code}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-emerald-500/30 text-emerald-200 font-mono text-xs font-semibold"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              {nextPred && (
                <div className="text-xs font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/70">
                  <span>
                    Trailing LCG Fit:{" "}
                    <strong className="text-cyan-300">
                      ({nextPred.bestAffineRule.a}x + {nextPred.bestAffineRule.c}) mod 38
                    </strong>
                  </span>
                  <span>
                    300-Draw Top-5 Fit: <strong className="text-white">{nextPred.bestAffineRule.trainHitTop5Pct}%</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Walk-Forward Out-of-Sample Audit Summary */}
            <div className="bg-[#0f1418] rounded-2xl border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg sm:text-xl font-bold text-slate-50" style={{ color: "#f8fafc" }}>
                    Walk-Forward Backtest ({wf?.evaluatedCount} Draws)
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                  Out-of-Sample
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono">
                {[
                  { label: "TOP-1", val: wf?.top1RatePct ?? 0, base: wf?.top1BaselinePct ?? 2.63, accent: "text-rose-300", border: "border-slate-800" },
                  { label: "TOP-5", val: wf?.top5RatePct ?? 0, base: wf?.top5BaselinePct ?? 13.16, accent: "text-white", border: "border-slate-800" },
                  { label: "TOP-10", val: wf?.top10RatePct ?? 0, base: wf?.top10BaselinePct ?? 26.32, accent: "text-cyan-300", border: "border-slate-800" },
                  { label: "TOP-14", val: wf?.top14RatePct ?? 0, base: wf?.top14BaselinePct ?? 36.84, accent: "text-white", border: "border-cyan-500/30" },
                  { label: "TOP-19", val: wf?.top19RatePct ?? 0, base: wf?.top19BaselinePct ?? 50.0, accent: "text-emerald-300", border: "border-emerald-500/30" }
                ].map((tier) => {
                  const diff = Number((tier.val - tier.base).toFixed(2));
                  return (
                    <div key={tier.label} className={`bg-[#14191e] rounded-xl p-2.5 border ${tier.border}`}>
                      <div className="text-xs text-slate-400">{tier.label}</div>
                      <div className={`text-base font-bold ${tier.accent} mt-1`}>{tier.val}%</div>
                      <div className="text-xs text-slate-400">Base {tier.base}%</div>
                      <div className={`text-xs mt-0.5 font-semibold ${diff >= 0 ? "text-emerald-400" : "text-slate-500"}`}>
                        {diff >= 0 ? `+${diff}%` : `${diff}%`}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Discovered Algorithmic Step-Delta & Wheel Anomalies */}
              {diag && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                  <div className="bg-[#14191e] rounded-xl p-3.5 border border-slate-800 space-y-2">
                    <div className="text-xs text-slate-300 font-semibold uppercase flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                      <span>Most Common Number Jumps</span>
                    </div>
                    <div className="space-y-1.5">
                      {diag.topNumericStepDeltas.slice(0, 3).map((d) => (
                        <div key={d.delta} className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">
                            Jump of {d.delta} ({d.count} times, score {d.zScore})
                          </span>
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold font-mono">
                            Next: {d.nextTargetCode}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#14191e] rounded-xl p-3.5 border border-slate-800 space-y-2">
                    <div className="text-xs text-slate-300 font-semibold uppercase flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Most Common Wheel Steps</span>
                    </div>
                    <div className="space-y-1.5">
                      {diag.topWheelStepDeltas.slice(0, 3).map((w) => (
                        <div key={w.wheelStep} className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">
                            {w.wheelStep} spaces ({w.count} times, score {w.zScore})
                          </span>
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold font-mono">
                            Next: {w.nextTargetCode}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Historical Matching Sequences */}
              {nextPred && nextPred.historicalTwins.length > 0 && (
                <div className="bg-[#14191e] rounded-xl p-3.5 border border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-sans text-amber-300 uppercase font-bold">
                      Matching Past Sequences ({nextPred.historicalTwins.length} found)
                    </span>
                    <span className="text-xs font-sans text-slate-400">
                      Followed by: {nextPred.twinFollowerUnion.join(", ")}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    {nextPred.historicalTwins.slice(0, 4).map((tw) => (
                      <div
                        key={tw.matchedDrawNumber}
                        className="px-3 py-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                      >
                        <span className="text-slate-300">
                          <span className="text-slate-500">Draw {tw.matchedDrawNumber}</span>{" "}
                          ({tw.sequenceCodes.join(", ")})
                        </span>
                        <span className="text-emerald-300 font-bold">Next: {tw.followerCode}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Multi-Draw Rolling Window Coverage Matrix */}
          {report && report.sessionWindows.length > 0 && (
            <div className="bg-[#0f1418] rounded-2xl border border-slate-800 p-5 space-y-3 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-50" style={{ color: "#f8fafc" }}>
                      Rolling Multi-Draw Window Coverage
                    </h2>
                    <p className="text-xs text-slate-400">
                      How often at least 1 winning number landed inside each shortlist across N consecutive draws.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-semibold self-start sm:self-auto">
                  3-Min Draw Windows
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#171c20] border-b border-slate-800 text-xs text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Window</th>
                      <th className="py-2.5 px-3">Time Span</th>
                      <th className="py-2.5 px-3">Top 5 Picks <span className="text-slate-500">(of 38)</span></th>
                      <th className="py-2.5 px-3">Top 10 Picks <span className="text-slate-500">(of 38)</span></th>
                      <th className="py-2.5 px-3">Top 14 Picks <span className="text-slate-500">(of 38)</span></th>
                      <th className="py-2.5 px-3">Top 19 Picks <span className="text-slate-500">(of 38)</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {report.sessionWindows.map((sw) => (
                      <tr key={sw.windowDraws} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                          {sw.windowDraws} {sw.windowDraws === 1 ? "Draw" : "Draws"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{sw.durationMinutes} mins</td>
                        <td className="py-2.5 px-3 text-slate-200">
                          {sw.top5RatePct}% ({sw.top5Hits}/{sw.windowsEvaluated})
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={sw.top10RatePct >= 100 ? "text-emerald-300 font-black" : "text-cyan-300 font-semibold"}>
                            {sw.top10RatePct}% ({sw.top10Hits}/{sw.windowsEvaluated})
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={sw.top14RatePct >= 100 ? "text-emerald-300 font-black" : "text-white font-semibold"}>
                            {sw.top14RatePct}% ({sw.top14Hits}/{sw.windowsEvaluated})
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={
                              sw.top19RatePct >= 100
                                ? "px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black"
                                : "text-emerald-300 font-semibold"
                            }
                          >
                            {sw.top19RatePct}% ({sw.top19Hits}/{sw.windowsEvaluated})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Draw-by-Draw Verification Audit Ledger */}
          <div className="bg-[#0f1418] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-rose-400" />
                  <h2 className="text-lg sm:text-xl font-bold text-slate-50" style={{ color: "#f8fafc" }}>
                    Fast Cash Draw-by-Draw Verification Audit Ledger
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Causal out-of-sample replication predictions graded against official Fast Cash draws (bonus &amp; jackpot ignored).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-[#171c20] rounded-lg p-0.5 border border-slate-800 text-xs">
                  {(["ALL", "TOP5", "TOP10", "TOP14"] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setLedgerFilter(tier)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                        ledgerFilter === tier
                          ? "bg-rose-500 text-slate-950 font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tier === "ALL"
                        ? "ALL"
                        : tier === "TOP5"
                        ? "TOP-5 HITS"
                        : tier === "TOP10"
                        ? "TOP-10 HITS"
                        : "TOP-14 HITS"}
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
                <thead className="sticky top-0 bg-[#171c20] border-b border-slate-800 text-xs font-mono text-slate-400 uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-3 px-4">Target Draw</th>
                    <th className="py-3 px-4">Actual Ball</th>
                    <th className="py-3 px-4">Top-1</th>
                    <th className="py-3 px-4">Top-10 Picks</th>
                    <th className="py-3 px-4 text-center">Rank</th>
                    <th className="py-3 px-4">Session Resolution</th>
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
                            <span className="block text-xs text-cyan-400/80 font-normal mb-0.5">
                              {row.draw_date}
                            </span>
                          )}
                          #{row.draw_number}
                          <span className="block text-xs text-slate-400 font-normal">
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
                            {row.predicted_top10.map((code, idx) => (
                              <span
                                key={code}
                                className={`px-2 py-0.5 rounded text-xs border ${
                                  code === row.actual_code
                                    ? "bg-emerald-500/25 border-emerald-400 text-emerald-300 font-bold"
                                    : idx < 5
                                    ? "bg-slate-900 border-rose-500/30 text-slate-200"
                                    : "bg-slate-900 border-slate-800 text-slate-400"
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
                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          {row.session_draws_to_hit_top14 === 0 ? (
                            <span className="text-emerald-400 font-bold">IMMEDIATE (0d)</span>
                          ) : row.session_draws_to_hit_top14 !== null ? (
                            <span className="text-cyan-300">
                              Hit in +{row.session_draws_to_hit_top14}d ({row.session_draws_to_hit_top14 * 3}m)
                            </span>
                          ) : (
                            <span className="text-slate-500">Pending window</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {row.hit_top1 ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                              TOP-1 HIT
                            </span>
                          ) : row.hit_top5 ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                              TOP-5 HIT
                            </span>
                          ) : row.hit_top10 ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-400/30">
                              TOP-10 HIT
                            </span>
                          ) : row.hit_top14 ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-400/30">
                              TOP-14 HIT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-500">
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
