"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  X,
  RefreshCw,
  Activity,
  Layers,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Brain,
  HelpCircle,
  Zap,
  Target
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface PhaseSpaceAttractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGame?: "lotto-plus" | "win-for-life" | "cashpot" | "pick4" | "playwhe";
}

export default function PhaseSpaceAttractorModal({
  isOpen,
  onClose,
  initialGame = "lotto-plus"
}: PhaseSpaceAttractorModalProps) {
  const [game, setGame] = useState<string>(initialGame);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttractorData = async (targetGame: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/attractor?game=${targetGame}&limit=300`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to load phase-space trajectory");
      } else {
        setData(json);
      }
    } catch (err: any) {
      setError(err.message || "Network error loading attractor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAttractorData(game);
    }
  }, [isOpen, game]);

  if (!isOpen) return null;

  const gameTitles: Record<string, string> = {
    "lotto-plus": "Lotto Plus (5/35)",
    "win-for-life": "Win For Life (6/28)",
    "cashpot": "Cash Pot (5/20)",
    "pick4": "Pick 4 (4-Digit)",
    "playwhe": "Play Whe (1-36)"
  };

  const latest = data?.latestState;
  const centroid = data?.centroid;
  const trajectory = data?.recentTrajectory || [];

  // Calculate SVG plot bounding box
  const allX = trajectory.map((p: any) => p.x);
  const allY = trajectory.map((p: any) => p.y);
  const minX = Math.min(...(allX.length ? allX : [0]));
  const maxX = Math.max(...(allX.length ? allX : [100]));
  const minY = Math.min(...(allY.length ? allY : [0]));
  const maxY = Math.max(...(allY.length ? allY : [100]));

  const padX = (maxX - minX) * 0.15 || 10;
  const padY = (maxY - minY) * 0.15 || 10;

  const plotMinX = minX - padX;
  const plotMaxX = maxX + padX;
  const plotMinY = minY - padY;
  const plotMaxY = maxY + padY;

  const toSvgX = (x: number) => ((x - plotMinX) / (plotMaxX - plotMinX || 1)) * 520 + 40;
  const toSvgY = (y: number) => 360 - ((y - plotMinY) / (plotMaxY - plotMinY || 1)) * 300 - 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#070a0e] border border-emerald-500/30 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-500/20 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600/30 to-teal-500/30 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Takens&apos; Phase Space Attractor Radar
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 rounded-full">
                  $m=3$ DELAY EMBEDDING
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Dynamic phase-space reconstruction of physical draw machine invariants &amp; mechanical memory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Game Selector Bar */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-900/50 border-b border-white/5 overflow-x-auto sleek-scrollbar">
          {["lotto-plus", "win-for-life", "cashpot", "pick4", "playwhe"].map((gKey) => (
            <button
              key={gKey}
              onClick={() => {
                setGame(gKey);
                triggerHaptic("selection");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                game === gKey
                  ? "bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  : "bg-slate-950/60 border border-white/5 text-gray-400 hover:text-white"
              }`}
            >
              {gameTitles[gKey]}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 sleek-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs text-gray-400 font-mono">
                Computing Average Mutual Information &amp; Phase-Space Trajectory...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Dynamic Attractor State Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-emerald-500/20">
                  <div className="text-[9px] uppercase text-gray-400">Attractor Zone</div>
                  <div className={`text-base font-black mt-0.5 ${
                    latest?.attractorZone === "CENTRAL_BASIN" ? "text-emerald-300" :
                    latest?.attractorZone === "CORRIDOR_SURGE" ? "text-amber-300" : "text-rose-300"
                  }`}>
                    {latest?.attractorZone?.replace("_", " ")}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    Drift: {latest?.normalizedDrift}x Radius
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="text-[9px] uppercase text-gray-400">Optimal Delay (&tau;*)</div>
                  <div className="text-base font-black text-cyan-300 mt-0.5 font-mono">
                    &tau; = {data.optimalTau} <span className="text-[10px] font-normal text-gray-400">draws</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">1st AMI Local Minima</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="text-[9px] uppercase text-gray-400">Lyapunov Exponent (&lambda;)</div>
                  <div className="text-base font-black text-purple-300 mt-0.5 font-mono">
                    {data.lyapunovExponent}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    Horizon: ~{data.predictionHorizonDraws} draws
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                  <div className="text-[9px] uppercase text-emerald-400">Mean Reversion Odds</div>
                  <div className="text-base font-black text-emerald-300 mt-0.5 font-mono">
                    {latest?.meanReversionProbabilityPct}%
                  </div>
                  <div className="text-[10px] text-emerald-400/80 mt-0.5">
                    Snaps to Center Basin
                  </div>
                </div>
              </div>

              {/* 2D Projected Phase-Space Canvas Map (s_t vs s_{t-tau}) */}
              <div className="glass-panel p-4 rounded-xl border border-white/10 bg-slate-950/80 space-y-2">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Phase-Space Orbit: Observable S(t) vs Delayed S(t-&tau;)
                  </span>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Centroid Basin
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" /> Latest Draw Vector
                    </span>
                  </div>
                </div>

                <div className="w-full flex justify-center py-2 overflow-x-auto">
                  <svg width="600" height="380" viewBox="0 0 600 380" className="max-w-full h-auto select-none">
                    {/* Background Grid */}
                    <line x1="40" y1="330" x2="560" y2="330" stroke="#1e293b" strokeWidth="1" />
                    <line x1="40" y1="30" x2="40" y2="330" stroke="#1e293b" strokeWidth="1" />

                    {/* Attractor Centroid Concentric Radii */}
                    {centroid && (
                      <>
                        <circle
                          cx={toSvgX(centroid.x)}
                          cy={toSvgY(centroid.y)}
                          r="45"
                          fill="rgba(16, 185, 129, 0.08)"
                          stroke="rgba(16, 185, 129, 0.3)"
                          strokeDasharray="3 3"
                        />
                        <circle
                          cx={toSvgX(centroid.x)}
                          cy={toSvgY(centroid.y)}
                          r="85"
                          fill="rgba(6, 182, 212, 0.04)"
                          stroke="rgba(6, 182, 212, 0.2)"
                          strokeDasharray="4 4"
                        />
                        {/* Centroid Bullseye */}
                        <circle
                          cx={toSvgX(centroid.x)}
                          cy={toSvgY(centroid.y)}
                          r="4"
                          fill="#10b981"
                        />
                      </>
                    )}

                    {/* Trajectory Path Line connecting historical points */}
                    {trajectory.length > 1 && (
                      <path
                        d={trajectory.reduce((acc: string, pt: any, idx: number) => {
                          const px = toSvgX(pt.x);
                          const py = toSvgY(pt.y);
                          return idx === 0 ? `M ${px} ${py}` : `${acc} L ${px} ${py}`;
                        }, "")}
                        fill="none"
                        stroke="rgba(56, 189, 248, 0.25)"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Historical Orbit Points */}
                    {trajectory.map((pt: any, idx: number) => {
                      const isLatest = idx === trajectory.length - 1;
                      const px = toSvgX(pt.x);
                      const py = toSvgY(pt.y);

                      if (isLatest) return null;

                      return (
                        <circle
                          key={idx}
                          cx={px}
                          cy={py}
                          r="3"
                          fill="rgba(148, 163, 184, 0.5)"
                          className="hover:fill-emerald-300 transition-colors"
                        >
                          <title>Draw #{pt.drawNumber}: S_t={pt.x}, S_prev={pt.y}</title>
                        </circle>
                      );
                    })}

                    {/* Latest Vector Point */}
                    {trajectory.length > 0 && (() => {
                      const latestPt = trajectory[trajectory.length - 1];
                      const lx = toSvgX(latestPt.x);
                      const ly = toSvgY(latestPt.y);
                      return (
                        <g>
                          <circle
                            cx={lx}
                            cy={ly}
                            r="12"
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2"
                            className="animate-ping"
                          />
                          <circle
                            cx={lx}
                            cy={ly}
                            r="6"
                            fill="#38bdf8"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                          <text
                            x={lx + 10}
                            y={ly - 10}
                            fill="#38bdf8"
                            fontSize="10"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            Latest #{latestPt.drawNumber} (Sum {latestPt.x})
                          </text>
                        </g>
                      );
                    })()}

                    {/* Axis Labels */}
                    <text x="300" y="360" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">
                      Current Draw Sum S_t &rarr;
                    </text>
                    <text x="25" y="180" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace" transform="rotate(-90 25 180)">
                      Delayed Sum S_(t-&tau;) &rarr;
                    </text>
                  </svg>
                </div>
              </div>

              {/* Mathematical Explainer Callout */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 text-xs text-gray-400 font-sans leading-relaxed">
                <h4 className="text-white font-bold font-mono uppercase text-xs flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-emerald-400" />
                  How Takens&apos; Delay Coordinate Embedding Works
                </h4>
                <p>
                  According to <strong>Takens&apos; Embedding Theorem</strong>, the multi-variable chaotic dynamics of lottery chambers (aerodynamics, kinetic ball-to-ball collisions, thermodynamic heating) leave deterministic footprints in the scalar draw sequence. By plotting current sum S(t) against delayed state S(t-&tau;), we map the chamber&apos;s geometric strange attractor.
                </p>
                <p>
                  When the latest draw lands far outside the central basin ($&gt; 1.8\times$ Radius), the physical system undergoes strong restoring forces, yielding a <strong>{latest?.meanReversionProbabilityPct}% statistical mean-reversion</strong> back to the Gaussian centroid in the subsequent drawing.
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
