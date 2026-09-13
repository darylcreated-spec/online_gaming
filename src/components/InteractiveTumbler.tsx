"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Zap, Brain, ArrowRight, Layers, Award } from "lucide-react";
import { CHINAPOO_CHART } from "@/lib/playwhe";

interface BallPhysics {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
}

export type LotteryGameType = "play-whe" | "lotto-plus" | "win-for-life" | "cashpot" | "pick4";

interface InteractiveTumblerProps {
  initialGame?: LotteryGameType;
  onTicketGenerated?: (game: LotteryGameType, numbers: number[], bonusBall?: number) => void;
  onNavigateGame?: (game: LotteryGameType) => void;
}

export default function InteractiveTumbler({
  initialGame = "lotto-plus",
  onTicketGenerated,
  onNavigateGame
}: InteractiveTumblerProps) {
  const [selectedGame, setSelectedGame] = useState<LotteryGameType>(initialGame);
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [drawnBonus, setDrawnBonus] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const ballsRef = useRef<BallPhysics[]>([]);
  const drumAngleRef = useRef(0);
  const drumSpeedRef = useRef(0.015);

  // Configuration for all 5 official NLCB games
  const gameConfig = {
    "play-whe": {
      name: "Play Whe",
      poolSize: 36,
      pickCount: 1,
      hasBonus: false,
      bonusName: "",
      bonusMax: 0,
      accentColor: "#fbbf24",
      activeGlow: "rgba(251, 191, 36, 0.4)",
      dropAnimationClass: "animate-drop-playwhe",
      ballColors: [
        { main: "#f59e0b", glow: "#fbbf24" },
        { main: "#d97706", glow: "#f59e0b" },
        { main: "#b45309", glow: "#d97706" },
        { main: "#f97316", glow: "#fb923c" },
        { main: "#ea580c", glow: "#f97316" }
      ],
      description: "Draw 1 lucky mark from numbers 1 to 36"
    },
    "lotto-plus": {
      name: "Lotto Plus",
      poolSize: 35,
      pickCount: 5,
      hasBonus: true,
      bonusName: "Powerball",
      bonusMax: 10,
      accentColor: "#38bdf8",
      activeGlow: "rgba(56, 189, 248, 0.4)",
      dropAnimationClass: "animate-drop-lottoplus",
      ballColors: [
        { main: "#0284c7", glow: "#38bdf8" },
        { main: "#2563eb", glow: "#60a5fa" },
        { main: "#1d4ed8", glow: "#3b82f6" },
        { main: "#0369a1", glow: "#0ea5e9" },
        { main: "#075985", glow: "#38bdf8" }
      ],
      description: "Draw 5 numbers from 1 to 35 + 1 Powerball (1 to 10)"
    },
    "win-for-life": {
      name: "Win for Life",
      poolSize: 28,
      pickCount: 6,
      hasBonus: true,
      bonusName: "Cash Ball",
      bonusMax: 3,
      accentColor: "#34d399",
      activeGlow: "rgba(52, 211, 153, 0.4)",
      dropAnimationClass: "animate-drop-winforlife",
      ballColors: [
        { main: "#059669", glow: "#34d399" },
        { main: "#047857", glow: "#10b981" },
        { main: "#0f766e", glow: "#2dd4bf" },
        { main: "#14b8a6", glow: "#5eead4" },
        { main: "#10b981", glow: "#34d399" }
      ],
      description: "Draw 6 numbers from 1 to 28 + 1 Cash Ball (1 to 3)"
    },
    "cashpot": {
      name: "Cash Pot",
      poolSize: 20,
      pickCount: 5,
      hasBonus: true,
      bonusName: "Multiplier",
      bonusMax: 5,
      accentColor: "#eab308",
      activeGlow: "rgba(234, 179, 8, 0.4)",
      dropAnimationClass: "animate-drop-cashpot",
      ballColors: [
        { main: "#ca8a04", glow: "#facc15" },
        { main: "#a16207", glow: "#eab308" },
        { main: "#d97706", glow: "#fbbf24" },
        { main: "#eab308", glow: "#fde047" },
        { main: "#b45309", glow: "#f59e0b" }
      ],
      description: "Draw 5 numbers from 1 to 20 + 1 Multiplier (1X to 5X)"
    },
    "pick4": {
      name: "Pick 4",
      poolSize: 40,
      pickCount: 4,
      hasBonus: false,
      bonusName: "",
      bonusMax: 0,
      accentColor: "#c084fc",
      activeGlow: "rgba(192, 132, 252, 0.4)",
      dropAnimationClass: "animate-drop-pick4",
      ballColors: [
        { main: "#9333ea", glow: "#c084fc" },
        { main: "#7e22ce", glow: "#a855f7" },
        { main: "#6b21a8", glow: "#d8b4fe" },
        { main: "#a21caf", glow: "#f472b6" },
        { main: "#86198f", glow: "#e879f9" }
      ],
      description: "Draw 4 positional digits from 0 to 9"
    }
  };

  const currentConfig = gameConfig[selectedGame];

  // Initialize Web Audio Context on user interaction
  const getAudioContext = () => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Sound effects (Synthesized in real-time)
  const playCollisionSound = (speed: number) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      const baseFreq = selectedGame === "play-whe" ? 520 : selectedGame === "pick4" ? 640 : 440;
      osc.frequency.setValueAtTime(baseFreq + Math.random() * 200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);
      
      const vol = Math.min(0.08, 0.02 + speed * 0.015);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.045);
    } catch (e) {}
  };

  // Game-specific ball drop audio synthesizers
  const playDrawDropSound = (game: LotteryGameType, index: number) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (game === "play-whe") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      } else if (game === "lotto-plus") {
        osc.type = "sine";
        const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
        const f = freqs[index % freqs.length] || 880;
        osc.frequency.setValueAtTime(f, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(f * 1.5, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      } else if (game === "win-for-life") {
        osc.type = "square";
        osc.frequency.setValueAtTime(880 + index * 100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      } else if (game === "cashpot") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(987.77, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(740, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  const playVictoryChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
      });
    } catch (e) {}
  };

  // Trigger mobile haptic feedback
  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof window !== "undefined" && "navigator" in window && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  };

  // Re-populate unnumbered balls inside tumbler on game selection
  useEffect(() => {
    const balls: BallPhysics[] = [];
    const count = Math.min(36, currentConfig.poolSize);
    const colorPalette = currentConfig.ballColors;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 55;
      const palette = colorPalette[i % colorPalette.length];
      balls.push({
        id: i,
        x: 150 + Math.cos(angle) * dist,
        y: 150 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        radius: 11.5,
        color: palette.main,
        glowColor: palette.glow
      });
    }
    ballsRef.current = balls;
    setDrawnNumbers([]);
    setDrawnBonus(null);
  }, [selectedGame]);

  // Blender-grade Canvas Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastCollisionTime = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const drumRadius = 115;

      // ─── 1. BLENDER CHASSIS & OUTER FRAME ─────────────────────────────────
      ctx.save();
      const baseGrad = ctx.createLinearGradient(centerX - 100, centerY + 105, centerX + 100, centerY + 145);
      baseGrad.addColorStop(0, "#1e293b");
      baseGrad.addColorStop(0.5, "#334155");
      baseGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.moveTo(centerX - 95, centerY + 140);
      ctx.lineTo(centerX + 95, centerY + 140);
      ctx.lineTo(centerX + 75, centerY + 115);
      ctx.lineTo(centerX - 75, centerY + 115);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Heavy Pivot Struts
      ctx.beginPath();
      ctx.moveTo(centerX - 80, centerY + 115);
      ctx.lineTo(centerX - 5, centerY);
      ctx.moveTo(centerX + 80, centerY + 115);
      ctx.lineTo(centerX + 5, centerY);
      ctx.strokeStyle = "rgba(100, 116, 139, 0.6)";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Outer Cage Glass Rim Glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, drumRadius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = currentConfig.activeGlow;
      ctx.lineWidth = isSpinning ? 3 : 1.5;
      ctx.shadowColor = currentConfig.accentColor;
      ctx.shadowBlur = isSpinning ? 20 : 8;
      ctx.stroke();
      ctx.restore();

      // ─── 2. ROTATING INTERNAL CAGE SPOKES (BLENDER CAGE) ─────────────────
      ctx.save();
      if (isSpinning) {
        drumSpeedRef.current = Math.min(0.08, drumSpeedRef.current + 0.003);
      } else {
        drumSpeedRef.current = Math.max(0.008, drumSpeedRef.current - 0.001);
      }
      drumAngleRef.current += drumSpeedRef.current;

      ctx.beginPath();
      const spokeCount = 12;
      for (let i = 0; i < spokeCount; i++) {
        const spokeAngle = drumAngleRef.current + (i * Math.PI * 2) / spokeCount;
        const x1 = centerX + Math.cos(spokeAngle) * 22;
        const y1 = centerY + Math.sin(spokeAngle) * 22;
        const x2 = centerX + Math.cos(spokeAngle) * (drumRadius - 2);
        const y2 = centerY + Math.sin(spokeAngle) * (drumRadius - 2);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Outer Bezel Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, drumRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // ─── 3. PHYSICS PARTICLES: UNNUMBERED LOTTERY BALLS ─────────────────
      const balls = ballsRef.current;
      const speedMultiplier = isSpinning ? 2.6 : 0.65;
      const gravity = isSpinning ? 0.09 : 0.26;

      balls.forEach((ball) => {
        ball.vy += gravity;
        if (isSpinning) {
          ball.vx += (Math.random() - 0.5) * 2.8;
          ball.vy += (Math.random() - 0.5) * 2.8;
        }

        ball.x += ball.vx * speedMultiplier;
        ball.y += ball.vy * speedMultiplier;

        ball.vx *= 0.985;
        ball.vy *= 0.985;

        // Circular Cage Collision
        const dx = ball.x - centerX;
        const dy = ball.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist + ball.radius > drumRadius - 3) {
          const nx = dx / dist;
          const ny = dy / dist;

          ball.x = centerX + nx * (drumRadius - 3 - ball.radius);
          ball.y = centerY + ny * (drumRadius - 3 - ball.radius);

          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * 0.85;
          ball.vy = (ball.vy - 2 * dot * ny) * 0.85;

          const now = performance.now();
          if (isSpinning && now - lastCollisionTime > 90 && Math.random() < 0.25) {
            playCollisionSound(Math.abs(dot));
            lastCollisionTime = now;
          }
        }

        // Draw Blender-Grade 3D Spherical Ball (NO NUMBERS ON BALLS INSIDE TUMBLER)
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);

        const sphereGrad = ctx.createRadialGradient(
          ball.x - ball.radius * 0.35,
          ball.y - ball.radius * 0.35,
          ball.radius * 0.05,
          ball.x,
          ball.y,
          ball.radius
        );
        sphereGrad.addColorStop(0, "#ffffff");
        sphereGrad.addColorStop(0.25, ball.glowColor);
        sphereGrad.addColorStop(0.65, ball.color);
        sphereGrad.addColorStop(1, "#050811");

        ctx.fillStyle = sphereGrad;
        ctx.shadowColor = ball.glowColor;
        ctx.shadowBlur = isSpinning ? 8 : 3;
        ctx.fill();

        // Glossy Specular Highlight arc
        ctx.beginPath();
        ctx.arc(
          ball.x - ball.radius * 0.25,
          ball.y - ball.radius * 0.25,
          ball.radius * 0.45,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.fill();
        ctx.restore();
      });

      // ─── 4. GLASS REFLECTION HIGHLIGHT OVERLAY ──────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, drumRadius - 2, Math.PI * 0.75, Math.PI * 1.45);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, drumRadius - 6, Math.PI * 0.8, Math.PI * 1.35);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // ─── 5. CENTRAL ROTARY HUB & CHROME EMBLEM ──────────────────────────
      ctx.beginPath();
      ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
      const hubGrad = ctx.createRadialGradient(centerX - 4, centerY - 4, 2, centerX, centerY, 18);
      hubGrad.addColorStop(0, "#f8fafc");
      hubGrad.addColorStop(0.5, "#475569");
      hubGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = hubGrad;
      ctx.fill();
      ctx.strokeStyle = currentConfig.accentColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = currentConfig.accentColor;
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Hub inner pin
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = currentConfig.accentColor;
      ctx.fill();
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpinning, selectedGame, soundEnabled]);

  // Unified Multi-Game Quick Pick Generation Handler
  const handleSpinAndDraw = async () => {
    if (isSpinning) return;
    getAudioContext();
    setIsSpinning(true);
    setDrawnNumbers([]);
    setDrawnBonus(null);
    triggerHaptic([40, 30, 40]);

    // Initial agitation spin duration
    await new Promise(r => setTimeout(r, 1300));

    const selectedPicks: number[] = [];

    if (selectedGame === "pick4") {
      // Pick 4: 4 digits from 0 to 9
      for (let i = 0; i < 4; i++) {
        await new Promise(r => setTimeout(r, 400));
        const digit = Math.floor(Math.random() * 10);
        selectedPicks.push(digit);
        setDrawnNumbers([...selectedPicks]);
        playDrawDropSound(selectedGame, i);
        triggerHaptic(50);
      }
    } else {
      // Pool-based games (Play Whe, Lotto Plus, Win For Life, Cash Pot)
      const pool = Array.from({ length: currentConfig.poolSize }, (_, i) => i + 1);
      
      for (let i = 0; i < currentConfig.pickCount; i++) {
        await new Promise(r => setTimeout(r, selectedGame === "play-whe" ? 600 : 380));
        const randomIndex = Math.floor(Math.random() * pool.length);
        const drawn = pool.splice(randomIndex, 1)[0];
        selectedPicks.push(drawn);
        if (selectedGame !== "play-whe") {
          selectedPicks.sort((a, b) => a - b);
        }
        setDrawnNumbers([...selectedPicks]);
        playDrawDropSound(selectedGame, i);
        triggerHaptic(50);
      }
    }

    // Extract bonus ball if applicable
    let bonus: number | undefined = undefined;
    if (currentConfig.hasBonus) {
      await new Promise(r => setTimeout(r, 550));
      bonus = Math.floor(Math.random() * currentConfig.bonusMax) + 1;
      setDrawnBonus(bonus);
      playDrawDropSound(selectedGame, currentConfig.pickCount);
      triggerHaptic([60, 40, 60]);
    }

    setIsSpinning(false);
    playVictoryChime();
    triggerHaptic([50, 50, 100, 50, 150]);

    if (onTicketGenerated) {
      onTicketGenerated(selectedGame, selectedPicks, bonus);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-950 border border-white/10 relative overflow-hidden space-y-6 font-mono shadow-2xl">
      
      {/* Ambient Radial Accent */}
      <div 
        className="absolute top-0 right-1/4 w-96 h-96 rounded-full blur-[100px] pointer-events-none opacity-20 transition-all duration-700"
        style={{ backgroundColor: currentConfig.accentColor }}
      />

      {/* Header & Game Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div 
              className="p-1.5 rounded-lg border shadow-sm"
              style={{ borderColor: `${currentConfig.accentColor}50`, backgroundColor: `${currentConfig.accentColor}15` }}
            >
              <Sparkles className="w-4 h-4" style={{ color: currentConfig.accentColor }} />
            </div>
            <div>
              <h3 
                className="text-base sm:text-lg font-black uppercase tracking-wider flex items-center gap-2"
                style={{ color: "#ffffff" }}
              >
                Blender 3D Physics Tumbler
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
                  ALL 5 GAMES
                </span>
              </h3>
              <p className="text-[11px] text-gray-300 mt-0.5">
                Stochastic pneumatic mixing simulation with game-specific ball drop physics
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Audio Mute & 5 Game Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
              soundEnabled ? "bg-slate-900 border-white/15 text-white" : "bg-slate-950 border-white/5 text-gray-500"
            }`}
            title={soundEnabled ? "Mute Collision SFX" : "Enable Collision SFX"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* 5-Game Ribbon Selector */}
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-white/10 gap-1 overflow-x-auto scrollbar-none max-w-full">
            {(["play-whe", "lotto-plus", "win-for-life", "cashpot", "pick4"] as const).map((g) => {
              const cfg = gameConfig[g];
              const isSelected = selectedGame === g;
              return (
                <button
                  key={g}
                  onClick={() => {
                    if (!isSpinning) {
                      setSelectedGame(g);
                    }
                  }}
                  disabled={isSpinning}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? "shadow-sm font-black text-slate-950"
                      : "text-gray-400 hover:text-white border-transparent hover:bg-white/5"
                  }`}
                  style={{
                    backgroundColor: isSelected ? cfg.accentColor : undefined,
                    borderColor: isSelected ? cfg.accentColor : "transparent",
                    color: isSelected ? "#020617" : undefined
                  }}
                >
                  {cfg.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left: 3D Blender Canvas Drum Simulator */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative select-none">
          <div 
            className="absolute w-64 h-64 rounded-full blur-[70px] pointer-events-none opacity-25 transition-all duration-500"
            style={{ backgroundColor: currentConfig.accentColor }}
          />

          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="w-[270px] h-[270px] sm:w-[290px] sm:h-[290px] rounded-full border border-white/10 bg-slate-950/90 shadow-[inset_0_0_35px_rgba(0,0,0,0.9),0_0_30px_rgba(0,0,0,0.7)] cursor-pointer"
            onClick={handleSpinAndDraw}
            title="Click to spin tumbler and draw"
          />

          <p className="text-[10px] text-gray-400 mt-2 font-mono text-center">
            {isSpinning ? (
              <span className="text-emerald-400 font-bold animate-pulse">Agitating tumbler & extracting random balls...</span>
            ) : (
              <span>Tap tumbler or press DRAW to run Quick Pick</span>
            )}
          </p>
        </div>

        {/* Right: Ball Drop Extraction Stage with Distinct Game Animations */}
        <div className="lg:col-span-7 space-y-5">
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                {currentConfig.name} Live Extraction Chute
              </span>
              <span className="text-[9px] text-gray-400">
                {currentConfig.description}
              </span>
            </div>

            {/* Ball Drop Stage Container */}
            <div className="min-h-[110px] p-5 bg-black/50 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-inner relative overflow-hidden">
              
              {drawnNumbers.length === 0 && !isSpinning ? (
                <div className="text-center space-y-1">
                  <span className="text-xs text-gray-400 font-semibold block">
                    Tumbler Ready for {currentConfig.name}
                  </span>
                  <span className="text-[10px] text-gray-400 block">
                    Unnumbered balls agitated stochastically inside blender chassis
                  </span>
                </div>
              ) : isSpinning && drawnNumbers.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 animate-pulse font-bold">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Drawing lucky balls from pneumatic chamber...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 w-full">
                  
                  {/* Balls Display with Distinct Game Animation */}
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    
                    {/* Play Whe: Single Large Gold Ball with Chinapoo Mark */}
                    {selectedGame === "play-whe" && drawnNumbers.length > 0 && (
                      <div className="flex items-center gap-4 flex-wrap justify-center">
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl text-slate-950 font-mono shadow-[0_0_20px_rgba(251,191,36,0.6)] ${currentConfig.dropAnimationClass}`}
                          style={{ backgroundColor: currentConfig.accentColor }}
                        >
                          {drawnNumbers[0]}
                        </div>
                        <div className="text-left space-y-0.5">
                          <span className="text-sm font-black text-amber-300 uppercase tracking-wider block">
                            {CHINAPOO_CHART[drawnNumbers[0]]?.mark || "Unknown"}
                          </span>
                          <span className="text-[10px] text-gray-400 block">
                            Keywords: {CHINAPOO_CHART[drawnNumbers[0]]?.keywords?.slice(0, 4).join(", ") || "Traditional Mark"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Lotto Plus: 5 Main Balls + 1 Powerball */}
                    {selectedGame === "lotto-plus" && (
                      <>
                        {drawnNumbers.map((num, i) => (
                          <div
                            key={i}
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-slate-950 font-mono shadow-[0_0_12px_rgba(56,189,248,0.5)] ${currentConfig.dropAnimationClass}`}
                            style={{ 
                              backgroundColor: currentConfig.accentColor,
                              animationDelay: `${i * 120}ms`
                            }}
                          >
                            {num}
                          </div>
                        ))}

                        {drawnBonus !== null && (
                          <>
                            <span className="text-gray-500 font-bold mx-1 text-sm">+</span>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white bg-purple-600 border border-purple-400 shadow-[0_0_16px_rgba(168,85,247,0.6)] ${currentConfig.dropAnimationClass}`}>
                              {drawnBonus}
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* Win For Life: 6 Main Balls + 1 Cash Ball */}
                    {selectedGame === "win-for-life" && (
                      <>
                        {drawnNumbers.map((num, i) => (
                          <div
                            key={i}
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-slate-950 font-mono shadow-[0_0_12px_rgba(52,211,153,0.5)] ${currentConfig.dropAnimationClass}`}
                            style={{ 
                              backgroundColor: currentConfig.accentColor,
                              animationDelay: `${i * 100}ms`
                            }}
                          >
                            {num}
                          </div>
                        ))}

                        {drawnBonus !== null && (
                          <>
                            <span className="text-gray-500 font-bold mx-1 text-sm">+</span>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-white bg-emerald-600 border border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.6)] ${currentConfig.dropAnimationClass}`}>
                              {drawnBonus}
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* Cash Pot: 5 Main Balls + 1 Multiplier */}
                    {selectedGame === "cashpot" && (
                      <>
                        {drawnNumbers.map((num, i) => (
                          <div
                            key={i}
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-slate-950 font-mono shadow-[0_0_12px_rgba(234,179,8,0.5)] ${currentConfig.dropAnimationClass}`}
                            style={{ 
                              backgroundColor: currentConfig.accentColor,
                              animationDelay: `${i * 110}ms`
                            }}
                          >
                            {num}
                          </div>
                        ))}

                        {drawnBonus !== null && (
                          <>
                            <span className="text-gray-500 font-bold mx-1 text-sm">×</span>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs text-white bg-amber-600 border border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.6)] ${currentConfig.dropAnimationClass}`}>
                              {drawnBonus}X
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* Pick 4: 4 Positional Digit Tumbler Blocks */}
                    {selectedGame === "pick4" && (
                      <div className="flex items-center gap-2">
                        {drawnNumbers.map((digit, i) => (
                          <div
                            key={i}
                            className={`w-11 h-12 rounded-xl flex flex-col items-center justify-center font-black text-base text-purple-200 bg-purple-950/60 border-2 border-purple-400 font-mono shadow-[0_0_15px_rgba(168,85,247,0.4)] ${currentConfig.dropAnimationClass}`}
                            style={{ animationDelay: `${i * 140}ms` }}
                          >
                            <span>{digit}</span>
                            <span className="text-[7px] text-purple-400/80 uppercase">POS {i + 1}</span>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Bonus Ball Labels */}
                  {drawnBonus !== null && currentConfig.hasBonus && (
                    <span className="text-[10px] font-bold tracking-wider uppercase text-gray-300">
                      Bonus Drawn: <strong style={{ color: currentConfig.accentColor }}>{currentConfig.bonusName} #{drawnBonus}</strong>
                    </span>
                  )}

                </div>
              )}

            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={handleSpinAndDraw}
              disabled={isSpinning}
              className={`flex-1 py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                isSpinning
                  ? "bg-slate-800 text-gray-400 cursor-not-allowed border border-white/5"
                  : "hover:scale-[1.01] active:scale-[0.99]"
              }`}
              style={{
                backgroundColor: !isSpinning ? currentConfig.accentColor : undefined,
                color: !isSpinning ? "#020617" : undefined,
                boxShadow: !isSpinning ? `0 0 25px ${currentConfig.activeGlow}` : undefined
              }}
            >
              <Play className={`w-4 h-4 fill-current ${isSpinning ? "animate-spin" : ""}`} />
              <span>{isSpinning ? "SPINNING & DRAWING..." : `QUICK PICK ${currentConfig.name.toUpperCase()}`}</span>
            </button>

            {onNavigateGame && (
              <button
                onClick={() => onNavigateGame(selectedGame)}
                className="py-3 px-4 rounded-xl border border-white/10 hover:border-white/20 bg-slate-900/60 hover:bg-slate-800 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
