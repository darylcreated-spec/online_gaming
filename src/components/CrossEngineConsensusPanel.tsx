"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Cpu,
  Layers,
  Lock,
  Printer,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp
} from "lucide-react";
import BetSlipExportModal from "@/components/BetSlipExportModal";
import { formatTrevorBall } from "@/lib/trevor_engine";
import { CHINAPOO_CHART } from "@/lib/playwhe";
import type { ConsensusGameKey, CrossEngineConsensusResult } from "@/lib/consensus_engine";

interface CrossEngineConsensusPanelProps {
  game: ConsensusGameKey;
}

interface ThemeStyles {
  border: string;
  borderStrong: string;
  bgTint: string;
  accentText: string;
  accentTextSoft: string;
  badgeBg: string;
  buttonPrimary: string;
  buttonSecondary: string;
  ballActive: string;
  barFill: string;
}

const THEME_MAP: Record<CrossEngineConsensusResult["themeColor"], ThemeStyles> = {
  yellow: {
    border: "border-yellow-500/30",
    borderStrong: "border-yellow-400/50",
    bgTint: "bg-yellow-500/10",
    accentText: "text-yellow-400",
    accentTextSoft: "text-yellow-300",
    badgeBg: "bg-yellow-500/15 border-yellow-500/35 text-yellow-200",
    buttonPrimary: "bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold",
    buttonSecondary: "bg-yellow-500/15 hover:bg-yellow-500/25 border-yellow-500/35 text-yellow-200",
    ballActive: "bg-yellow-400 text-slate-950 border-yellow-200 shadow-lg shadow-yellow-500/25",
    barFill: "bg-yellow-400"
  },
  sky: {
    border: "border-sky-500/30",
    borderStrong: "border-sky-400/50",
    bgTint: "bg-sky-500/10",
    accentText: "text-sky-400",
    accentTextSoft: "text-sky-300",
    badgeBg: "bg-sky-500/15 border-sky-500/35 text-sky-200",
    buttonPrimary: "bg-sky-500 hover:bg-sky-400 text-white font-bold",
    buttonSecondary: "bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/35 text-sky-200",
    ballActive: "bg-sky-400 text-slate-950 border-sky-200 shadow-lg shadow-sky-500/25",
    barFill: "bg-sky-400"
  },
  emerald: {
    border: "border-emerald-500/30",
    borderStrong: "border-emerald-400/50",
    bgTint: "bg-emerald-500/10",
    accentText: "text-emerald-400",
    accentTextSoft: "text-emerald-300",
    badgeBg: "bg-emerald-500/15 border-emerald-500/35 text-emerald-200",
    buttonPrimary: "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold",
    buttonSecondary: "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35 text-emerald-200",
    ballActive: "bg-emerald-400 text-slate-950 border-emerald-200 shadow-lg shadow-emerald-500/25",
    barFill: "bg-emerald-400"
  },
  amber: {
    border: "border-amber-500/30",
    borderStrong: "border-amber-400/50",
    bgTint: "bg-amber-500/10",
    accentText: "text-amber-400",
    accentTextSoft: "text-amber-300",
    badgeBg: "bg-amber-500/15 border-amber-500/35 text-amber-200",
    buttonPrimary: "bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold",
    buttonSecondary: "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-200",
    ballActive: "bg-amber-400 text-slate-950 border-amber-200 shadow-lg shadow-amber-500/25",
    barFill: "bg-amber-400"
  },
  purple: {
    border: "border-purple-500/30",
    borderStrong: "border-purple-400/50",
    bgTint: "bg-purple-500/10",
    accentText: "text-purple-400",
    accentTextSoft: "text-purple-300",
    badgeBg: "bg-purple-500/15 border-purple-500/35 text-purple-200",
    buttonPrimary: "bg-purple-500 hover:bg-purple-400 text-white font-bold",
    buttonSecondary: "bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/35 text-purple-200",
    ballActive: "bg-purple-400 text-slate-950 border-purple-200 shadow-lg shadow-purple-500/25",
    barFill: "bg-purple-400"
  },
  rose: {
    border: "border-rose-500/30",
    borderStrong: "border-rose-400/50",
    bgTint: "bg-rose-500/10",
    accentText: "text-rose-400",
    accentTextSoft: "text-rose-300",
    badgeBg: "bg-rose-500/15 border-rose-500/35 text-rose-200",
    buttonPrimary: "bg-rose-500 hover:bg-rose-400 text-white font-bold",
    buttonSecondary: "bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/35 text-rose-200",
    ballActive: "bg-rose-400 text-slate-950 border-rose-200 shadow-lg shadow-rose-500/25",
    barFill: "bg-rose-400"
  }
};

const DEFAULT_THEME_BY_GAME: Record<ConsensusGameKey, CrossEngineConsensusResult["themeColor"]> = {
  cashpot: "yellow",
  "lotto-plus": "sky",
  "win-for-life": "emerald",
  "play-whe": "amber",
  pick4: "purple",
  "fast-cash": "rose"
};

export default function CrossEngineConsensusPanel({ game }: CrossEngineConsensusPanelProps) {
  const [data, setData] = useState<CrossEngineConsensusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAllConsensus, setShowAllConsensus] = useState(false);
  const [showAllEngines, setShowAllEngines] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const fetchConsensus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/consensus?game=${encodeURIComponent(game)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load Cross-Engine Consensus.");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err?.message || "Unable to load Cross-Engine Consensus.");
    } finally {
      setLoading(false);
    }
  }, [game]);

  useEffect(() => {
    fetchConsensus();
  }, [fetchConsensus]);

  const handleLockSnapshot = async () => {
    setLocking(true);
    setLockMessage(null);
    try {
      const res = await fetch("/api/consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to lock snapshot.");
      }
      setData(json.data);
      setLockMessage(json.message || "Pre-draw snapshot locked.");
    } catch (err: any) {
      setLockMessage(err?.message || "Could not lock snapshot.");
    } finally {
      setLocking(false);
    }
  };

  const theme = THEME_MAP[data?.themeColor || DEFAULT_THEME_BY_GAME[game]];

  const exportBonuses = useMemo(() => {
    if (!data || (game !== "lotto-plus" && game !== "win-for-life")) return undefined;
    if (data.consensusPlaySheet5Bonuses && data.consensusPlaySheet5Bonuses.length === data.consensusPlaySheet5.length) {
      return data.consensusPlaySheet5Bonuses;
    }
    const top3 = data.consensusBonusTop3 && data.consensusBonusTop3.length > 0 ? data.consensusBonusTop3 : [1, 2, 3];
    return data.consensusPlaySheet5.map((_, idx) => top3[idx % top3.length] ?? 1);
  }, [data, game]);

  const handleCopy = async () => {
    if (!data) return;
    const cov = data.consensusCoveringPortfolio;
    const lines = [
      `CROSS-ENGINE CONSENSUS — ${data.gameName.toUpperCase()} (Target Draw #${data.nextTargetDrawNumber})`,
      `Engines Checked: ${data.totalEnginesChecked}`,
      `Master Consensus: ${data.consensusMasterTicket.map((n) => formatTrevorBall(game, n)).join("-")}${
        data.consensusBonusTop1 !== undefined && data.bonusName
          ? ` | ${data.bonusName} ${String(data.consensusBonusTop1).padStart(2, "0")}`
          : ""
      }`,
      "",
      `Zero-Overlap 5-Slip Covering Portfolio (${cov.uniqueNumbersCovered}/${cov.poolSize} Covered, Max Overlap ${cov.maxPairwiseOverlap}, Stake $${cov.totalStakeTT} TT):`,
      ...cov.slips.map(
        (s) =>
          `  #${s.index} [${s.role}]: ${s.numbers.map((n) => formatTrevorBall(game, n)).join("-")}${
            s.bonusBall !== undefined && data.bonusName
              ? ` | ${data.bonusName} ${String(s.bonusBall).padStart(2, "0")}`
              : ""
          }`
      )
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = lines;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !data) {
    return (
      <div className={`rounded-2xl border ${theme.border} bg-[#0a0f1a] p-8 text-center space-y-3`}>
        <div className={`w-10 h-10 rounded-xl ${theme.bgTint} border ${theme.border} flex items-center justify-center mx-auto`}>
          <Cpu className={`w-5 h-5 ${theme.accentText} animate-spin`} />
        </div>
        <div className="text-base font-bold text-white">Aggregating All Engines for Live Consensus...</div>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Cross-checking Steiner-10, Lucky 7, Forensic, Quant 100%, Diff Involution, and Winning Formula while auto-grading any pending locked draws.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/35 bg-rose-950/20 p-6 text-center space-y-3">
        <div className="text-base font-bold text-rose-300">Could not load Cross-Engine Consensus</div>
        <p className="text-sm text-slate-300">{error || "Unexpected response."}</p>
        <button
          type="button"
          onClick={fetchConsensus}
          className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const displayedNumbers = showAllConsensus ? data.consensusNumbers : data.consensusNumbers.slice(0, 10);
  const isSingleBall = game === "play-whe" || game === "fast-cash";

  return (
    <div className="space-y-5">
      {/* 1. HERO BANNER + LOCK BUTTON */}
      <div className={`rounded-2xl border ${theme.borderStrong} bg-gradient-to-br from-[#0c1322] via-[#0a0f1a] to-[#080c15] p-5 sm:p-6 space-y-4 shadow-xl`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${theme.badgeBg}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                Cross-Engine Consensus Hub
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-mono">
                Target Draw #{data.nextTargetDrawNumber}
                {data.nextTargetSlot ? ` (${data.nextTargetSlot})` : ""}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold">
                {data.totalEnginesChecked} Engines Cross-Checked
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {`${data.gameName}: Multi-Engine Consensus & Pre-Draw Lock`}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              {game === "pick4"
                ? "Ranks digits 0 to 9 by unordered agreement across all active Pick 4 engines (right digits first), surfaces shared unordered Box sets, and auto-grades locked draws right after results post."
                : "Combines every active engine in this game to find unanimous consensus numbers, shared multi-engine slip convergences, and verifiable pre-draw locks stored in Turso."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLockSnapshot}
              disabled={locking}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                data.currentDrawLocked
                  ? "bg-emerald-500/20 border border-emerald-400/50 text-emerald-300"
                  : theme.buttonPrimary
              }`}
            >
              {data.currentDrawLocked ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Draw #{data.nextTargetDrawNumber} Locked
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  {locking ? "Locking..." : `Lock Pre-Draw #${data.nextTargetDrawNumber}`}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${theme.buttonSecondary}`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${theme.buttonSecondary}`}
            >
              <Printer className="w-3.5 h-3.5" />
              Print or Export
            </button>
            <button
              type="button"
              onClick={fetchConsensus}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {lockMessage && (
          <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-semibold">
            {lockMessage}
          </div>
        )}

        {/* MASTER CONSENSUS CARD */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className={`text-xs font-bold uppercase tracking-wider ${theme.accentText}`}>
                {isSingleBall
                  ? "Top 5 Cross-Engine Consensus Picks"
                  : game === "pick4"
                  ? "Master Unordered Consensus Box (Right Digits First)"
                  : "Master Cross-Engine Consensus Combination"}
              </div>
              <div className="text-xs text-slate-400">
                Built from the highest-agreement numbers across all {data.totalEnginesChecked} live engines.
              </div>
            </div>
            {data.latestDraw && (
              <span className="text-xs font-mono text-slate-400">
                Last Draw #{data.latestDraw.drawNumber}:{" "}
                {data.latestDraw.numbers.map((n) => formatTrevorBall(game, n)).join("-")}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {data.consensusMasterTicket.map((n, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span
                  className={`w-11 h-11 ${
                    game === "pick4" || game === "fast-cash" ? "rounded-xl" : "rounded-full"
                  } border-2 font-mono font-black text-base flex items-center justify-center ${theme.ballActive}`}
                >
                  {formatTrevorBall(game, n)}
                </span>
                {game === "play-whe" && (
                  <span className="text-xs font-semibold text-slate-200 mr-2">
                    {CHINAPOO_CHART[n]?.mark || ""}
                  </span>
                )}
              </div>
            ))}
            {data.consensusBonusTop1 !== undefined && data.bonusName && (
              <span className="px-3 h-11 rounded-full bg-amber-400/20 border border-amber-400 text-amber-200 font-sans font-bold text-xs flex items-center justify-center">
                {data.bonusName} {String(data.consensusBonusTop1).padStart(2, "0")}
                {data.consensusBonusTop3 && data.consensusBonusTop3.length > 1
                  ? ` (Top 3: ${data.consensusBonusTop3.map((v) => String(v).padStart(2, "0")).join(", ")})`
                  : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. CROSS-ENGINE NUMBER AGREEMENT LEADERBOARD */}
      <div className={`rounded-2xl border ${theme.border} bg-[#0a0f1a] p-5 sm:p-6 space-y-4 shadow-xl`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className={`w-4 h-4 ${theme.accentTextSoft}`} />
              <span>Cross-Engine Number Agreement Ranking</span>
            </h3>
            <p className="text-xs text-slate-400">
              Shows how many independent engines agreed on each number before Draw #{data.nextTargetDrawNumber}.
            </p>
          </div>
          {data.consensusNumbers.length > 10 && (
            <button
              type="button"
              onClick={() => setShowAllConsensus((v) => !v)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0 ${theme.buttonSecondary}`}
            >
              {showAllConsensus ? (
                <>
                  Show Top 10 <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Show All {data.consensusNumbers.length} <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {displayedNumbers.map((item, idx) => (
            <div
              key={item.number}
              className={`p-3 rounded-xl bg-slate-900/75 border ${
                idx < 5 ? theme.borderStrong : "border-white/[0.07]"
              } space-y-2`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-8 h-8 shrink-0 ${
                      game === "pick4" || game === "fast-cash" ? "rounded-lg" : "rounded-full"
                    } border font-mono font-black text-xs flex items-center justify-center ${
                      idx < 5 ? theme.ballActive : "bg-slate-800 border-slate-600 text-white"
                    }`}
                  >
                    {formatTrevorBall(game, item.number)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {game === "play-whe" ? CHINAPOO_CHART[item.number]?.mark || item.label : `Rank #${idx + 1}`}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {item.totalSlipVotes} slip votes
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-mono font-black shrink-0 ${theme.accentText}`}>
                  {item.engineAgreement}/{item.totalEngines}
                </span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${theme.barFill}`}
                  style={{ width: `${Math.min(100, item.agreementPct)}%` }}
                />
              </div>

              <div className="text-xs text-slate-400 truncate" title={item.agreeingEngines.join(", ")}>
                {item.agreeingEngines.join(", ")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. SHARED MULTI-ENGINE CONVERGENCES & TOP 5 CONSENSUS SHEET */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Shared Convergences */}
        <div className={`rounded-2xl border ${theme.border} bg-[#0a0f1a] p-5 space-y-3.5 shadow-xl`}>
          <div className="space-y-0.5 border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className={`w-4 h-4 ${theme.accentTextSoft}`} />
              <span>Multi-Engine Slip Convergences</span>
            </h3>
            <p className="text-xs text-slate-400">
              {game === "pick4"
                ? "Unordered 4-digit Box sets independently produced by 2 or more separate engines."
                : "4-ball or 5-ball cores where separate independent engines converged on the exact same numbers."}
            </p>
          </div>

          {data.sharedConvergences.length > 0 ? (
            <div className="space-y-2.5">
              {data.sharedConvergences.map((conv, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/75 border border-white/[0.08] space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${theme.accentText}`}>
                      {conv.title}
                    </span>
                    <span className="text-xs font-mono text-emerald-300 font-bold">
                      {conv.engines.join(" + ")}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {conv.sharedNumbers.map((n, nIdx) => (
                      <span
                        key={nIdx}
                        className={`w-9 h-9 ${
                          game === "pick4" || game === "fast-cash" ? "rounded-lg" : "rounded-full"
                        } border font-mono font-black text-xs flex items-center justify-center ${theme.ballActive}`}
                      >
                        {formatTrevorBall(game, n)}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">{conv.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-white/[0.06] text-xs text-slate-400">
              Engines are currently spread across distinct combinations for Draw #{data.nextTargetDrawNumber}. Use the Master Consensus Ticket and Top 5 Consensus Sheet for your highest-agreement core.
            </div>
          )}
        </div>

        {/* Zero-Overlap 5-Slip Consensus Covering Portfolio */}
        <div className={`rounded-2xl border ${theme.borderStrong} bg-[#0a0f1a] p-5 space-y-3.5 shadow-xl`}>
          <div className="space-y-2 border-b border-white/10 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className={`w-4 h-4 ${theme.accentTextSoft}`} />
                <span>Zero-Overlap Consensus Portfolio (5 Slips)</span>
              </h3>
              <span className={`px-2 py-0.5 rounded-md border text-xs font-mono font-bold ${theme.badgeBg}`}>
                {data.consensusCoveringPortfolio.uniqueNumbersCovered}/{data.consensusCoveringPortfolio.poolSize} Covered ({data.consensusCoveringPortfolio.coveragePct}%)
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {data.consensusCoveringPortfolio.strategySummary}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                Max Overlap: {data.consensusCoveringPortfolio.maxPairwiseOverlap}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                Stake: ${data.consensusCoveringPortfolio.totalStakeTT} TT
              </span>
              {data.consensusCoveringPortfolio.bonusStratificationLabel && (
                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/35 text-amber-200 font-sans font-semibold">
                  {data.consensusCoveringPortfolio.bonusStratificationLabel}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {data.consensusCoveringPortfolio.slips.map((slipObj) => (
              <div
                key={slipObj.index}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900/75 border border-white/[0.07] flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white">
                    Slip #{slipObj.index} <span className="text-slate-400 font-normal">· {slipObj.role}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {slipObj.numbers.map((n, nIdx) => (
                    <span
                      key={nIdx}
                      className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 font-mono font-bold text-xs text-white"
                    >
                      {formatTrevorBall(game, n)}
                      {game === "play-whe" ? ` ${CHINAPOO_CHART[n]?.mark || ""}` : ""}
                    </span>
                  ))}
                  {slipObj.bonusBall !== undefined && data.bonusName && (
                    <span className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 font-sans font-bold text-xs">
                      {data.bonusName} {String(slipObj.bonusBall).padStart(2, "0")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3.5 COST-ADJUSTED LIVE PRE-DRAW LOCK SCOREBOARD (APPLES-TO-APPLES ROI) */}
      {data.lockScoreboard && data.lockScoreboard.length > 0 && (
        <div className={`rounded-2xl border ${theme.border} bg-[#0a0f1a] p-5 sm:p-6 space-y-4 shadow-xl`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${theme.accentTextSoft}`} />
                <span>Cost-Adjusted Live Pre-Draw Lock Scoreboard</span>
              </h3>
              <p className="text-xs text-slate-400">
                Apples-to-apples real TT$ staked vs official NLCB payouts across all {data.totalGradedLocks} zero-hindsight graded locks (ranked by Net ROI). Fair lottery draws carry a house edge; covering maximizes hit efficiency per dollar.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono shrink-0">
              {data.totalGradedLocks} Graded Lock{data.totalGradedLocks === 1 ? "" : "s"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono">
                <tr>
                  <th className="px-3 py-2.5">Engine</th>
                  <th className="px-3 py-2.5 text-right">Locks</th>
                  <th className="px-3 py-2.5 text-right">Won Draws</th>
                  <th className="px-3 py-2.5 text-right">Avg Stake</th>
                  <th className="px-3 py-2.5 text-right">Staked</th>
                  <th className="px-3 py-2.5 text-right">Payout</th>
                  <th className="px-3 py-2.5 text-right">Net P/L</th>
                  <th className="px-3 py-2.5 text-right">ROI %</th>
                  <th className="px-3 py-2.5 text-right">Best</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] bg-slate-950/50">
                {data.lockScoreboard.map((row) => {
                  const isPos = row.netProfitTT >= 0;
                  const isPortfolio = row.engineName === "Consensus Zero-Overlap 5";
                  return (
                    <tr
                      key={row.engineName}
                      className={isPortfolio ? "bg-emerald-500/10 hover:bg-emerald-500/15" : "hover:bg-slate-900/50"}
                    >
                      <td className="px-3 py-2.5 font-semibold text-white whitespace-nowrap">
                        {row.engineName}
                        {isPortfolio && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold uppercase">
                            Covering
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-300 text-right whitespace-nowrap">
                        {row.drawsEvaluated}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-200 text-right whitespace-nowrap">
                        {row.winningDraws}/{row.drawsEvaluated} ({row.drawWinRatePct.toFixed(1)}%)
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-300 text-right whitespace-nowrap">
                        ${row.avgStakePerDrawTT.toFixed(0)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-300 text-right whitespace-nowrap">
                        ${row.totalStakedTT.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-white font-bold text-right whitespace-nowrap">
                        ${row.totalPayoutTT.toLocaleString()}
                      </td>
                      <td
                        className={`px-3 py-2.5 font-mono font-bold text-right whitespace-nowrap ${
                          isPos ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {isPos ? "+" : "-"}${Math.abs(row.netProfitTT).toLocaleString()}
                      </td>
                      <td
                        className={`px-3 py-2.5 font-mono font-black text-right whitespace-nowrap ${
                          isPos ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {isPos ? "+" : ""}
                        {row.roiPct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-300 text-right whitespace-nowrap">
                        {row.bestMatchEver}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. PRE-DRAW LOCKED SNAPSHOTS & AUTO-GRADED RESULTS HISTORY */}
      <div className={`rounded-2xl border ${theme.border} bg-[#0a0f1a] p-5 sm:p-6 space-y-4 shadow-xl`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className={`w-4 h-4 ${theme.accentTextSoft}`} />
              <span>Pre-Draw Locked Snapshots &amp; Auto-Graded Log</span>
            </h3>
            <p className="text-xs text-slate-400">
              Every snapshot locked before draw time is stored permanently in Turso DB and graded automatically the moment official numbers post.
            </p>
          </div>
        </div>

        {data.lockedHistory.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono">
                <tr>
                  <th className="px-3 py-2.5">Draw</th>
                  <th className="px-3 py-2.5">Locked Consensus</th>
                  <th className="px-3 py-2.5">Official Result</th>
                  <th className="px-3 py-2.5">Consensus Match</th>
                  <th className="px-3 py-2.5">Best Locked Engine</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] bg-slate-950/50">
                {data.lockedHistory.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/50">
                    <td className="px-3 py-2.5 font-mono text-white font-bold whitespace-nowrap">
                      #{row.targetDrawNumber}
                      {row.targetSlot ? ` (${row.targetSlot})` : ""}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-200 whitespace-nowrap">
                      {row.consensusTicket.map((n) => formatTrevorBall(game, n)).join("-")}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-white whitespace-nowrap">
                      {row.actualNumbers
                        ? row.actualNumbers.map((n) => formatTrevorBall(game, n)).join("-")
                        : "Awaiting Draw"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-200 whitespace-nowrap">
                      {row.status === "GRADED" ? `${row.consensusTicketMatch ?? 0} matched` : "--"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-200 whitespace-nowrap">
                      {row.status === "GRADED" && row.bestEngineName
                        ? `${row.bestEngineName} (${row.bestEngineMatch} matched)`
                        : `${row.engineSummaries.length} engines frozen`}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {row.status === "GRADED" ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold">
                          Auto-Graded
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded border font-semibold ${theme.badgeBg}`}>
                          Locked Pre-Draw
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              No pre-draw locks recorded for {data.gameName} yet. Click the button to freeze Draw #{data.nextTargetDrawNumber} before it draws.
            </span>
            <button
              type="button"
              onClick={handleLockSnapshot}
              disabled={locking}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${theme.buttonPrimary}`}
            >
              <Lock className="w-3.5 h-3.5" />
              Lock Draw #{data.nextTargetDrawNumber}
            </button>
          </div>
        )}
      </div>

      {/* 5. COLLAPSIBLE ALL-ENGINES SIDE-BY-SIDE MATRIX */}
      <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAllEngines((v) => !v)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-900/50 transition cursor-pointer"
        >
          <div className="space-y-0.5">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-400" />
              <span>Inspect All {data.totalEnginesChecked} Engines Side-by-Side (Draw #{data.nextTargetDrawNumber})</span>
            </div>
            <div className="text-xs text-slate-400">
              Expand to see the exact slips from Steiner-10, Lucky 7, Forensic, Quant 100%, Diff, and Winning Formula.
            </div>
          </div>
          {showAllEngines ? (
            <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
          )}
        </button>

        {showAllEngines && (
          <div className="px-5 pb-5 pt-2 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.engineSummaries.map((eng) => (
              <div
                key={eng.engineKey}
                className="p-3.5 rounded-xl bg-slate-900/75 border border-white/[0.07] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${theme.accentText}`}>
                    {eng.engineName}
                  </span>
                  <span className="text-xs text-slate-400">{eng.primaryLabel}</span>
                </div>
                <div className="space-y-1">
                  {eng.slips.slice(0, 7).map((s, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950/75 border border-white/[0.05] flex items-center justify-between text-xs font-mono text-slate-200"
                    >
                      <span className="text-slate-500">#{idx + 1}</span>
                      <span>
                        {s.map((n) => formatTrevorBall(game, n)).join("-")}
                        {game === "pick4" ? `  {${[...s].sort((a, b) => a - b).join("-")}}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EXPORT MODAL */}
      {exportOpen && (
        <BetSlipExportModal
          isOpen={true}
          onClose={() => setExportOpen(false)}
          gameKey={game}
          gameName={`Cross-Engine Consensus — ${data.gameName}`}
          targetDrawNumber={data.nextTargetDrawNumber}
          slips={data.consensusPlaySheet5}
          bonusBalls={exportBonuses}
          unitCostTT={data.unitCostTT}
          multiplierIncluded={game === "cashpot"}
        />
      )}
    </div>
  );
}
