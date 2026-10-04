"use client";

import React, { useState } from "react";
import {
  Trophy,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Send,
  Zap,
  Activity,
  Layers
} from "lucide-react";
import { TicketAutopsyReport } from "@/lib/ticket_autopsy";

interface TicketAutopsyCardProps {
  autopsy: TicketAutopsyReport;
  onSendToSyndicate?: (numbers: number[], bonus?: number) => void;
}

export default function TicketAutopsyCard({
  autopsy,
  onSendToSyndicate
}: TicketAutopsyCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPivot = () => {
    const text = `${autopsy.smartPivot.numbers.join(", ")}${
      autopsy.smartPivot.bonusBall ? ` [Bonus: ${autopsy.smartPivot.bonusBall}]` : ""
    }`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 space-y-4 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
      {/* 1. Header with Prize or Near-Miss State + 180-Day Countdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
              autopsy.isWinner
                ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                : autopsy.adjacentMatchCount >= 2
                ? "bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            {autopsy.isWinner ? (
              <Trophy className="w-5 h-5" />
            ) : autopsy.adjacentMatchCount >= 2 ? (
              <Zap className="w-5 h-5" />
            ) : (
              <Activity className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-slate-400">
                {autopsy.gameTitle} • Draw #{autopsy.drawNumber}
              </span>
              {autopsy.isWinner && (
                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  OFFICIAL WINNER
                </span>
              )}
            </div>
            <h3 className="text-base font-extrabold text-white">
              {autopsy.prizeTier}
            </h3>
          </div>
        </div>

        {/* Financial & Expiration Tag */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
          {autopsy.isWinner ? (
            <div className="text-right">
              <div className="text-xl font-black font-mono text-emerald-300">
                ${autopsy.netPayoutTT.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                <span className="text-[10px] text-emerald-400">TTD</span>
              </div>
              {autopsy.isTaxable && (
                <div className="text-[9px] font-mono text-amber-300/80">
                  10% Tax (-${autopsy.taxDeductionTT.toFixed(2)} TT)
                </div>
              )}
            </div>
          ) : (
            <div className="text-right">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                {autopsy.proximityScorePercent}% Proximity Score
              </span>
            </div>
          )}

          {/* 180-Day NLCB Expiration Clock */}
          <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>
              Claim by {autopsy.claimDeadlineDate} (
              <strong
                className={
                  autopsy.daysRemainingToClaim <= 14
                    ? "text-rose-400"
                    : "text-cyan-300"
                }
              >
                {autopsy.daysRemainingToClaim}d left
              </strong>
              )
            </span>
          </div>
        </div>
      </div>

      {/* 2. SNEAKY SECONDARY PRIZE ALERT BANNER (If Applicable) */}
      {autopsy.unclaimedAlertMessage && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/70 to-yellow-950/40 border border-amber-400/50 flex items-start gap-2.5 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200 leading-relaxed">
            <strong className="text-amber-300 uppercase tracking-wide">
              Sneaky Secondary Prize Alert:
            </strong>{" "}
            {autopsy.unclaimedAlertMessage}
          </div>
        </div>
      )}

      {/* 3. Forensic Ball Comparison Spectrum */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Forensic Ticket Ball Breakdown (Your Slip vs Drawn)
          </span>
          <span className="font-mono text-[10px] text-cyan-300">
            {autopsy.exactMatchCount} Exact • {autopsy.adjacentMatchCount} Near-Miss (Δ≤2)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {autopsy.nearMissItems.map((item, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                item.isExact
                  ? "bg-emerald-950/50 border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : item.isAdjacent
                  ? "bg-amber-950/40 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <div className="text-[9px] uppercase tracking-wider text-slate-400 mb-1">
                Ball #{idx + 1}
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-8 h-8 rounded-lg font-mono font-black text-sm flex items-center justify-center ${
                    item.isExact
                      ? "bg-emerald-400 text-slate-950 ring-2 ring-emerald-300"
                      : item.isAdjacent
                      ? "bg-amber-400 text-slate-950 ring-2 ring-amber-300"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {String(item.ticketNum).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-1.5 text-[9px] font-mono flex items-center gap-1">
                {item.isExact ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> EXACT
                  </span>
                ) : item.isAdjacent ? (
                  <span className="text-amber-300 font-bold">
                    Δ = ±{item.delta} ({String(item.nearestWinningNum).padStart(2, "0")})
                  </span>
                ) : (
                  <span className="text-slate-500">
                    Δ = {item.delta}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Optional Bonus Ball Card */}
          {autopsy.ticketBonus !== undefined && (
            <div className="p-2.5 rounded-xl border bg-cyan-950/30 border-cyan-500/40 flex flex-col items-center justify-center">
              <div className="text-[9px] uppercase tracking-wider text-cyan-400 mb-1">
                Bonus / PB
              </div>
              <span className="w-8 h-8 rounded-lg font-mono font-black text-sm flex items-center justify-center bg-cyan-400 text-slate-950 ring-2 ring-cyan-300">
                {String(autopsy.ticketBonus).padStart(2, "0")}
              </span>
              <div className="mt-1.5 text-[9px] font-mono text-cyan-300">
                {autopsy.ticketBonus === autopsy.officialBonus ? "MATCHED" : `Drawn: ${autopsy.officialBonus ?? "-"}`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Chamber Attractor Resonance Diagnostics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center">
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[9px] uppercase text-slate-400">Proximity</div>
          <div className="text-sm font-extrabold text-cyan-300 font-mono">
            {autopsy.proximityScorePercent}%
          </div>
          <div className="text-[8px] text-slate-500">Chamber Closeness</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[9px] uppercase text-slate-400">Attractor Manifold</div>
          <div className="text-sm font-extrabold text-emerald-300 font-mono">
            {autopsy.attractorManifoldOverlapCount} Balls
          </div>
          <div className="text-[8px] text-slate-500">{autopsy.attractorManifoldOverlapPercent}% In Resonance Pool</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[9px] uppercase text-slate-400">Gaussian Sum</div>
          <div className="text-sm font-extrabold text-white font-mono">
            {autopsy.ticketSum}{" "}
            <span className="text-[9px] text-slate-400 font-normal">
              (Drawn: {autopsy.winningSum})
            </span>
          </div>
          <div className="text-[8px] text-slate-500">
            {autopsy.isWithinGaussianEnvelope ? "Optimal Centroid" : "Outlier Skew"}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[9px] uppercase text-slate-400">Phase Space</div>
          <div
            className={`text-xs font-black uppercase mt-0.5 ${
              autopsy.attractorBasinZone === "CENTRAL_BASIN"
                ? "text-emerald-400"
                : autopsy.attractorBasinZone === "CORRIDOR_SURGE"
                ? "text-amber-400"
                : "text-rose-400"
            }`}
          >
            {autopsy.attractorBasinZone.replace("_", " ")}
          </div>
          <div className="text-[8px] text-slate-500">Takens Attractor</div>
        </div>
      </div>

      {/* 5. Next-Draw Smart Pivot (Actionable Edge) */}
      <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Next-Draw Smart Pivot Line</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Anchored Hits + Calibrated Replacements
          </span>
        </div>

        <p className="text-[11px] text-slate-300 leading-snug">
          {autopsy.smartPivot.rationale}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
          {/* Pivoted Balls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {autopsy.smartPivot.numbers.map((num) => {
              const isRetained = autopsy.smartPivot.anchorsRetained.includes(num);
              return (
                <span
                  key={num}
                  className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center ${
                    isRetained
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50"
                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50"
                  }`}
                  title={isRetained ? "Retained Anchor" : "Pivoted Attractor Ball"}
                >
                  {String(num).padStart(2, "0")}
                </span>
              );
            })}
            {autopsy.smartPivot.bonusBall && (
              <span className="w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center bg-cyan-400 text-slate-950">
                {String(autopsy.smartPivot.bonusBall).padStart(2, "0")}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyPivot}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  Copy Line
                </>
              )}
            </button>

            {onSendToSyndicate && (
              <button
                onClick={() =>
                  onSendToSyndicate(
                    autopsy.smartPivot.numbers,
                    autopsy.smartPivot.bonusBall
                  )
                }
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black tracking-wide flex items-center justify-center gap-1.5 transition shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              >
                <Send className="w-3.5 h-3.5" />
                Send to Syndicate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
