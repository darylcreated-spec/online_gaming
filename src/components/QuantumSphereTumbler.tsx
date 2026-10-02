"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Sparkles, 
  RotateCw, 
  Copy, 
  Check, 
  Sliders, 
  Award,
  Play,
  ArrowRight
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { CHINAPOO_CHART } from "@/lib/playwhe";

export type TumblerGame = "lotto-plus" | "win-for-life" | "play-whe" | "cashpot" | "pick4";

interface QuantumSphereTumblerProps {
  initialGame?: TumblerGame;
  onSendToBuilder?: (numbers: number[], bonus?: number) => void;
  onSelectGameTab?: (game: TumblerGame) => void;
  className?: string;
}

interface InternalBall {
  id: number;
  num: number | string;
  x: number; // percentage in chamber
  y: number; // percentage in chamber
  vx: number;
  vy: number;
  size: number;
  color: string;
}

const GAME_CONFIGS: Record<TumblerGame, {
  name: string;
  poolSize: number;
  pickCount: number;
  hasBonus?: boolean;
  bonusName?: string;
  bonusPoolSize?: number;
  themeColor: string;
  accentHex: string;
  glowHex: string;
  borderClass: string;
  activeBtnClass: string;
}> = {
  "lotto-plus": {
    name: "Lotto Plus",
    poolSize: 35,
    pickCount: 5,
    hasBonus: true,
    bonusName: "Powerball",
    bonusPoolSize: 10,
    themeColor: "sky",
    accentHex: "#38bdf8",
    glowHex: "rgba(56, 189, 248, 0.5)",
    borderClass: "border-sky-500/40",
    activeBtnClass: "bg-sky-500/20 text-sky-300 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.35)]"
  },
  "win-for-life": {
    name: "Win For Life",
    poolSize: 28,
    pickCount: 6,
    hasBonus: false,
    themeColor: "emerald",
    accentHex: "#10b981",
    glowHex: "rgba(16, 185, 129, 0.5)",
    borderClass: "border-emerald-500/40",
    activeBtnClass: "bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)]"
  },
  "play-whe": {
    name: "Play Whe",
    poolSize: 36,
    pickCount: 1,
    hasBonus: false,
    themeColor: "amber",
    accentHex: "#f59e0b",
    glowHex: "rgba(245, 158, 11, 0.5)",
    borderClass: "border-amber-500/40",
    activeBtnClass: "bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]"
  },
  "cashpot": {
    name: "Cash Pot",
    poolSize: 20,
    pickCount: 5,
    hasBonus: false,
    themeColor: "yellow",
    accentHex: "#eab308",
    glowHex: "rgba(234, 179, 8, 0.5)",
    borderClass: "border-yellow-500/40",
    activeBtnClass: "bg-yellow-500/20 text-yellow-300 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.35)]"
  },
  "pick4": {
    name: "Pick 4",
    poolSize: 10, // 0-9
    pickCount: 4,
    hasBonus: false,
    themeColor: "purple",
    accentHex: "#a855f7",
    glowHex: "rgba(168, 85, 247, 0.5)",
    borderClass: "border-purple-500/40",
    activeBtnClass: "bg-purple-500/20 text-purple-300 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.35)]"
  }
};

export default function QuantumSphereTumbler({
  initialGame = "lotto-plus",
  onSendToBuilder,
  onSelectGameTab,
  className = ""
}: QuantumSphereTumblerProps) {
  const [selectedGame, setSelectedGame] = useState<TumblerGame>(initialGame);
  const [drawStrategy, setDrawStrategy] = useState<"quant" | "rng">("quant");
  
  // Animation State: 'idle' | 'spinning' | 'extracting' | 'completed'
  const [animState, setAnimState] = useState<"idle" | "spinning" | "extracting" | "completed">("idle");
  const [currentExtractionIdx, setCurrentExtractionIdx] = useState<number>(-1);
  
  // Drawn Result
  const [drawnBalls, setDrawnBalls] = useState<number[]>([]);
  const [drawnBonus, setDrawnBonus] = useState<number | null>(null);
  
  // Floating Chamber Balls (Simulated in 2D projection)
  const [chamberBalls, setChamberBalls] = useState<InternalBall[]>([]);
  const [copied, setCopied] = useState(false);
  
  const animFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const config = GAME_CONFIGS[selectedGame];

  // Clean cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Initialize floating balls inside sphere whenever selectedGame changes
  useEffect(() => {
    const ballCount = selectedGame === "pick4" ? 10 : Math.min(config.poolSize, 14);
    const balls: InternalBall[] = [];

    for (let i = 0; i < ballCount; i++) {
      const num = selectedGame === "pick4" ? i : (i + 1);
      const angle = (i / ballCount) * Math.PI * 2;
      const dist = 18 + Math.random() * 20; // percent from center
      
      balls.push({
        id: i,
        num,
        x: 50 + Math.cos(angle) * dist,
        y: 50 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: 32,
        color: config.accentHex
      });
    }

    setChamberBalls(balls);
    setDrawnBalls([]);
    setDrawnBonus(null);
    setAnimState("idle");
    setCurrentExtractionIdx(-1);
  }, [selectedGame]);

  // Robust Game Switching Handler
  const handleGameSwitch = (gKey: TumblerGame) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    triggerHaptic("light");
    setSelectedGame(gKey);
    setAnimState("idle");
    setDrawnBalls([]);
    setDrawnBonus(null);
    setCurrentExtractionIdx(-1);

    if (onSelectGameTab) {
      onSelectGameTab(gKey);
    }
  };

  // Chamber Physics Loop
  useEffect(() => {
    let lastTime = performance.now();

    const updatePhysics = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      setChamberBalls(prevBalls => {
        return prevBalls.map(ball => {
          let { x, y, vx, vy } = ball;
          const centerX = 50;
          const centerY = 50;
          const maxRadius = 38; // spherical boundary

          if (animState === "spinning" || animState === "extracting") {
            // High-speed vortex swirl around center suction column
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Tangential angular velocity (vortex rotation)
            const speed = 120; // deg/sec
            const rad = Math.atan2(dy, dx) + (speed * dt * Math.PI / 180);
            
            // Centripetal suction oscillation
            const targetDist = 18 + Math.sin(now * 0.006 + ball.id) * 12;
            const newDist = dist + (targetDist - dist) * (dt * 3);

            x = centerX + Math.cos(rad) * newDist;
            y = centerY + Math.sin(rad) * newDist;
          } else {
            // Idle floating Brownian drift
            x += vx * 60 * dt;
            y += vy * 60 * dt;

            // Constrain within spherical boundary
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > maxRadius) {
              const nx = dx / dist;
              const ny = dy / dist;
              // Bounce inward
              const dot = vx * nx + vy * ny;
              vx = vx - 2 * dot * nx;
              vy = vy - 2 * dot * ny;
              x = centerX + nx * maxRadius;
              y = centerY + ny * maxRadius;
            }
          }

          return { ...ball, x, y, vx, vy };
        });
      });

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animState]);

  // Generate Winning Set (Quant vs RNG)
  const generateTargetNumbers = () => {
    if (selectedGame === "pick4") {
      const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10));
      return { main: digits, bonus: null };
    }

    if (selectedGame === "play-whe") {
      const single = Math.floor(Math.random() * 36) + 1;
      return { main: [single], bonus: null };
    }

    const pool = Array.from({ length: config.poolSize }, (_, i) => i + 1);

    if (drawStrategy === "quant") {
      const maxAttempts = 200;
      let bestSet: number[] = [];

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const candidate = shuffled.slice(0, config.pickCount).sort((a, b) => a - b);
        
        const sum = candidate.reduce((a, b) => a + b, 0);
        const oddCount = candidate.filter(n => n % 2 !== 0).length;
        const spread = candidate[candidate.length - 1] - candidate[0];

        if (selectedGame === "lotto-plus") {
          if (sum >= 75 && sum <= 105 && (oddCount === 2 || oddCount === 3) && spread >= 18) {
            bestSet = candidate;
            break;
          }
        } else if (selectedGame === "win-for-life") {
          if (sum >= 70 && sum <= 100 && (oddCount === 3 || oddCount === 2 || oddCount === 4)) {
            bestSet = candidate;
            break;
          }
        } else {
          if (sum >= 40 && sum <= 65) {
            bestSet = candidate;
            break;
          }
        }

        if (bestSet.length === 0 || attempt === maxAttempts - 1) {
          bestSet = candidate;
        }
      }

      let bonusNum: number | null = null;
      if (config.hasBonus && config.bonusPoolSize) {
        bonusNum = Math.floor(Math.random() * config.bonusPoolSize) + 1;
      }

      return { main: bestSet, bonus: bonusNum };
    } else {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, config.pickCount).sort((a, b) => a - b);
      
      let bonusNum: number | null = null;
      if (config.hasBonus && config.bonusPoolSize) {
        bonusNum = Math.floor(Math.random() * config.bonusPoolSize) + 1;
      }

      return { main: chosen, bonus: bonusNum };
    }
  };

  // Trigger Pneumatic Vortex Extraction Sequence
  const handleTriggerDraw = () => {
    if (animState === "spinning" || animState === "extracting") return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    triggerHaptic("heavy");
    setDrawnBalls([]);
    setDrawnBonus(null);
    setAnimState("spinning");
    setCurrentExtractionIdx(-1);

    const target = generateTargetNumbers();

    // 1. Vortex acceleration period (850ms)
    timeoutRef.current = setTimeout(() => {
      setAnimState("extracting");

      // 2. Sequential Bernoulli suction ball elevation
      let step = 0;

      intervalRef.current = setInterval(() => {
        if (step < target.main.length) {
          const nextBall = target.main[step];
          setDrawnBalls(prev => [...prev, nextBall]);
          setCurrentExtractionIdx(step);
          triggerHaptic("medium");
          step++;
        } else if (target.bonus && step === target.main.length) {
          setDrawnBonus(target.bonus);
          setCurrentExtractionIdx(step);
          triggerHaptic("heavy");
          step++;
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setAnimState("completed");
          triggerHaptic("light");
        }
      }, 550);

    }, 850);
  };

  // Clipboard Copy
  const handleCopyTicket = () => {
    if (drawnBalls.length === 0) return;
    const text = selectedGame === "pick4" 
      ? `Pick 4: ${drawnBalls.join("")}`
      : `${config.name}: ${drawnBalls.join(", ")}${drawnBonus ? ` [Powerball: ${drawnBonus}]` : ""}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    triggerHaptic("light");
    setTimeout(() => setCopied(false), 2000);
  };

  // Statistical Metrics of Drawn Slip
  const metrics = useMemo(() => {
    if (drawnBalls.length < 2 || selectedGame === "play-whe" || selectedGame === "pick4") return null;
    const sum = drawnBalls.reduce((a, b) => a + b, 0);
    const odd = drawnBalls.filter(n => n % 2 !== 0).length;
    const even = drawnBalls.length - odd;
    const spread = Math.max(...drawnBalls) - Math.min(...drawnBalls);
    return { sum, oddEven: `${odd}:${even}`, spread };
  }, [drawnBalls, selectedGame]);

  return (
    <div className={`glass-panel p-5 sm:p-7 rounded-2xl border ${config.borderClass} bg-slate-950/85 backdrop-blur-xl relative overflow-hidden shadow-2xl transition-all duration-300 ${className}`}>
      
      {/* Dynamic Ambient Background Aura */}
      <div 
        className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: config.accentHex }}
        aria-hidden="true"
      />

      {/* HEADER: Title & Interactive Game Selector Ribbon */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="relative p-2.5 rounded-xl bg-slate-900/90 border border-sky-400/30 shadow-[0_0_15px_rgba(56,189,248,0.25)] shrink-0">
            <Sparkles className="w-5 h-5 text-sky-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                The Quantum Sphere Tumbler
              </h2>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest bg-sky-500/20 text-sky-300 border border-sky-400/30">
                Option A Live
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Pneumatic Chamber Vortex & Bernoulli Suction Extraction
            </p>
          </div>
        </div>

        {/* Game Navigation Tabs - Fully Responsive & Interactive */}
        <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-xl border border-white/10 overflow-x-auto sleek-scrollbar">
          {(Object.keys(GAME_CONFIGS) as TumblerGame[]).map(gKey => {
            const isSel = selectedGame === gKey;
            const gConf = GAME_CONFIGS[gKey];
            return (
              <button
                key={gKey}
                type="button"
                onClick={() => handleGameSwitch(gKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all whitespace-nowrap cursor-pointer border ${
                  isSel
                    ? gConf.activeBtnClass
                    : "text-gray-400 hover:text-white hover:bg-white/5 border-transparent"
                }`}
              >
                {gConf.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN VIEWPORT GRID: 3D Spherical Chamber on Left, Extraction & Slip Controls on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-6">
        
        {/* LEFT / CENTER: THE 3D QUANTUM SPHERICAL CHAMBER (Cols 1-7) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
          
          {/* Main Containment Frame (Layered 3D Render Chassis Backdrop) */}
          <div className="relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] flex items-center justify-center select-none">
            
            {/* Photorealistic 3D Concept 1 Chassis Image Underlay */}
            <div className="absolute inset-0 rounded-full overflow-hidden opacity-35 filter brightness-110 contrast-125 pointer-events-none">
              <img
                src="/images/tumbler_concept_quantum.jpg"
                alt="Quantum Sphere 3D Chassis"
                className="w-full h-full object-cover scale-110"
              />
            </div>

            {/* Static High-Precision Metallic Bezel Rings (No AI Spindle / No Spinning Dashed Rings) */}
            <div className="absolute -inset-1 rounded-full border border-sky-500/30 opacity-70 pointer-events-none" />
            <div className="absolute -inset-2.5 rounded-full border border-white/10 pointer-events-none" />

            {/* Central Quartz Glass Containment Sphere Viewport */}
            <div className="relative w-[260px] h-[260px] sm:w-[310px] sm:h-[310px] rounded-full overflow-hidden bg-gradient-to-b from-slate-900/60 via-slate-950/90 to-black border-2 border-sky-400/50 shadow-[inset_0_0_50px_rgba(2,6,23,0.9),0_0_35px_rgba(56,189,248,0.3)] backdrop-blur-sm">
              
              {/* Central Bernoulli Optical Suction Vacuum Column */}
              <div 
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 sm:w-16 h-full transition-all duration-500 pointer-events-none z-10 flex flex-col items-center justify-between py-2 ${
                  animState === "extracting" || animState === "spinning"
                    ? "bg-gradient-to-r from-transparent via-sky-400/35 to-transparent shadow-[0_0_30px_rgba(56,189,248,0.8)]"
                    : "bg-gradient-to-r from-transparent via-white/5 to-transparent"
                }`}
              >
                {/* Upper Suction Funnel Aperture */}
                <div className="w-10 h-3 rounded-full border border-sky-400/60 bg-sky-400/20 shadow-[0_0_10px_rgba(56,189,248,0.6)]" />
                
                {/* Suction Flow Beam Particles */}
                {(animState === "spinning" || animState === "extracting") && (
                  <div className="w-1 h-3/4 bg-gradient-to-b from-sky-300 via-white to-transparent animate-pulse rounded-full" />
                )}

                {/* Lower Exhaust Core */}
                <div className="w-8 h-2 rounded-full border border-sky-400/40 bg-black/60" />
              </div>

              {/* Dynamic Floating / Vortex Chamber Balls */}
              <div className="relative w-full h-full">
                {chamberBalls.map((ball) => {
                  return (
                    <div
                      key={ball.id}
                      className="absolute rounded-full flex items-center justify-center font-black font-mono shadow-lg transition-transform pointer-events-none select-none"
                      style={{
                        width: `${ball.size}px`,
                        height: `${ball.size}px`,
                        left: `${ball.x}%`,
                        top: `${ball.y}%`,
                        transform: "translate(-50%, -50%)",
                        background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${config.accentHex} 45%, #020617 100%)`,
                        boxShadow: `0 0 14px ${config.glowHex}, inset 0 0 6px rgba(255,255,255,0.7)`,
                        color: "#020617",
                        fontSize: "12px",
                        zIndex: 15
                      }}
                    >
                      <span className="drop-shadow-sm font-extrabold">{ball.num}</span>
                    </div>
                  );
                })}
              </div>

              {/* 3D Convex Glass Specular Lens Reflection */}
              <div 
                className="absolute inset-0 rounded-full pointer-events-none z-20"
                style={{
                  background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.08) 35%, transparent 65%)"
                }}
              />
              <div 
                className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full pointer-events-none z-20 opacity-30"
                style={{
                  background: `radial-gradient(circle, ${config.accentHex} 0%, transparent 70%)`
                }}
              />
            </div>

            {/* Kinetic Stand / Pedestal Base Glow */}
            <div className="absolute -bottom-3 w-48 h-3 rounded-full bg-sky-400/30 blur-md pointer-events-none" />
          </div>

          {/* Chamber Controls Bar */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-[10px] text-gray-400 font-mono uppercase flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                animState === "idle" ? "bg-emerald-400" : "bg-sky-400 animate-ping"
              }`} />
              Status: <strong className="text-white uppercase">{animState}</strong>
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-[10px] text-gray-400 font-mono">
              Pool: <strong className="text-white">{config.poolSize}</strong> balls
            </span>
          </div>
        </div>

        {/* RIGHT: EXTRACTION SLIP, METRICS & ACTION CONTROLS (Cols 8-12) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* ACTION BUTTON & ALGORITHM SELECTOR */}
          <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                Algorithm Mode:
              </span>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setDrawStrategy("quant")}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                    drawStrategy === "quant"
                      ? "bg-sky-500 text-slate-950 font-black shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Quant +EV
                </button>
                <button
                  type="button"
                  onClick={() => setDrawStrategy("rng")}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                    drawStrategy === "rng"
                      ? "bg-amber-400 text-slate-950 font-black shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Physical RNG
                </button>
              </div>
            </div>

            {/* BIG ENGAGE PNEUMATIC DRAW BUTTON */}
            <button
              type="button"
              onClick={handleTriggerDraw}
              disabled={animState === "spinning" || animState === "extracting"}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-xl cursor-pointer ${
                animState === "spinning" || animState === "extracting"
                  ? "bg-slate-800 text-gray-400 cursor-not-allowed border border-white/5"
                  : "bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500 text-slate-950 hover:brightness-110 shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:scale-[1.02] active:scale-95"
              }`}
            >
              <RotateCw className="w-4 h-4" />
              <span>
                {animState === "spinning" ? "VORTEX ACCELERATING..." : animState === "extracting" ? "BERNOULLI EXTRACTING..." : `ENGAGE QUANTUM DRAW`}
              </span>
            </button>
          </div>

          {/* DRAWN NUMBERS REVEAL TRAY */}
          <div className="space-y-3 bg-slate-900/60 p-5 rounded-xl border border-sky-400/20 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-sky-400" />
                Optical Extraction Tray:
              </span>
              {drawnBalls.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyTicket}
                  className="flex items-center gap-1 text-[10px] font-bold text-sky-400 hover:text-sky-300 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied!" : "Copy Slip"}</span>
                </button>
              )}
            </div>

            {/* BALLS DISPLAY TRAY */}
            <div className="min-h-[72px] flex items-center justify-center p-3 bg-black/60 rounded-xl border border-white/5 gap-2 sm:gap-3 flex-wrap">
              {drawnBalls.length === 0 ? (
                <span className="text-xs text-gray-500 italic font-mono flex items-center gap-1.5">
                  <Play className="w-3 h-3 text-sky-400" />
                  Press 'ENGAGE QUANTUM DRAW' to trigger extraction
                </span>
              ) : (
                <>
                  {drawnBalls.map((n, idx) => (
                    <div
                      key={idx}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full font-black text-base sm:text-lg flex items-center justify-center font-mono shadow-[0_0_15px_rgba(56,189,248,0.4)] animate-in zoom-in duration-300 transition-all"
                      style={{
                        background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${config.accentHex} 50%, #0369a1 100%)`,
                        color: "#020617"
                      }}
                    >
                      {n}
                    </div>
                  ))}

                  {/* Powerball Bonus if applicable */}
                  {drawnBonus !== null && (
                    <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                      <div
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full font-black text-base sm:text-lg flex items-center justify-center font-mono bg-gradient-to-tr from-purple-700 via-purple-500 to-pink-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.6)] border-2 border-purple-300 animate-in zoom-in duration-300"
                        title="Powerball"
                      >
                        {drawnBonus}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Play Whe Chinapoo Mark Display */}
            {selectedGame === "play-whe" && drawnBalls.length > 0 && (
              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-400 uppercase font-bold block">Tradition Mark</span>
                  <span className="text-sm font-black text-white uppercase tracking-wider">
                    {CHINAPOO_CHART[drawnBalls[0]]?.mark || "Unknown"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block">Symbol Keywords</span>
                  <span className="text-[10px] text-amber-300 font-mono">
                    {CHINAPOO_CHART[drawnBalls[0]]?.keywords?.slice(0, 3).join(", ") || "Tradition"}
                  </span>
                </div>
              </div>
            )}

            {/* Combinatorial Slip Metrics */}
            {metrics && (
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                  <span className="text-[9px] text-gray-400 block uppercase">Sum</span>
                  <strong className="text-xs text-white">{metrics.sum}</strong>
                </div>
                <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                  <span className="text-[9px] text-gray-400 block uppercase">Odd:Even</span>
                  <strong className="text-xs text-sky-400">{metrics.oddEven}</strong>
                </div>
                <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                  <span className="text-[9px] text-gray-400 block uppercase">Spread</span>
                  <strong className="text-xs text-amber-400">{metrics.spread}</strong>
                </div>
              </div>
            )}

            {/* Send to Wheel Builder CTA */}
            {onSendToBuilder && drawnBalls.length >= 5 && selectedGame === "lotto-plus" && (
              <button
                type="button"
                onClick={() => onSendToBuilder(drawnBalls, drawnBonus || undefined)}
                className="w-full py-2.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-300 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Send Combination to Wheeling Matrix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
