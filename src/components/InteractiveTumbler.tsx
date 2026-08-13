"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Check, Download, Layers } from "lucide-react";

interface BallPhysics {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  number: number;
}

interface InteractiveTumblerProps {
  initialGame?: "lotto-plus" | "play-whe" | "win-for-life";
  onTicketGenerated?: (numbers: number[], bonusBall?: number) => void;
}

export default function InteractiveTumbler({
  initialGame = "lotto-plus",
  onTicketGenerated
}: InteractiveTumblerProps) {
  const [selectedGame, setSelectedGame] = useState<"lotto-plus" | "play-whe" | "win-for-life">(initialGame);
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [drawnBonus, setDrawnBonus] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const ballsRef = useRef<BallPhysics[]>([]);
  const drumAngleRef = useRef(0);

  const gameConfig = {
    "lotto-plus": {
      name: "Lotto Plus",
      poolSize: 35,
      pickCount: 5,
      hasBonus: true,
      bonusName: "Powerball",
      bonusMax: 10,
      accentColor: "#38bdf8",
      ballColors: ["#38bdf8", "#0284c7", "#f59e0b", "#fbbf24", "#9333ea", "#38bdf8", "#f59e0b"]
    },
    "play-whe": {
      name: "Play Whe",
      poolSize: 36,
      pickCount: 1,
      hasBonus: false,
      bonusName: "",
      bonusMax: 0,
      accentColor: "#fbbf24",
      ballColors: ["#fbbf24", "#f59e0b", "#d97706", "#f97316", "#ef4444", "#fbbf24", "#f59e0b"]
    },
    "win-for-life": {
      name: "Win for Life",
      poolSize: 28,
      pickCount: 6,
      hasBonus: true,
      bonusName: "Cash Ball",
      bonusMax: 3,
      accentColor: "#34d399",
      ballColors: ["#34d399", "#10b981", "#059669", "#14b8a6", "#34d399", "#10b981", "#059669"]
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

  // Synthesize procedural sound effects (zero external files required)
  const playCollisionSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(450 + Math.random() * 250, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  };

  const playDrawDropSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  };

  const playVictoryChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
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

  // Initialize balls in the canvas
  useEffect(() => {
    const balls: BallPhysics[] = [];
    const count = currentConfig.poolSize;
    const colors = currentConfig.ballColors;

    for (let i = 1; i <= count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 50;
      balls.push({
        id: i,
        number: i,
        x: 150 + Math.cos(angle) * dist,
        y: 150 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        radius: 11,
        color: colors[(i - 1) % colors.length]
      });
    }
    ballsRef.current = balls;
    setDrawnNumbers([]);
    setDrawnBonus(null);
  }, [selectedGame]);

  // Main Canvas Physics Loop
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
      const drumRadius = 110;

      // 1. Draw Tumbler Outer Stand & Cage
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, drumRadius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Rotating Spoke Bars
      if (isSpinning) {
        drumAngleRef.current += 0.04;
      }
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const spokeAngle = drumAngleRef.current + (i * Math.PI) / 4;
        const x1 = centerX + Math.cos(spokeAngle) * 20;
        const y1 = centerY + Math.sin(spokeAngle) * 20;
        const x2 = centerX + Math.cos(spokeAngle) * drumRadius;
        const y2 = centerY + Math.sin(spokeAngle) * drumRadius;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 2. Physics Update for Balls
      const balls = ballsRef.current;
      const speedMultiplier = isSpinning ? 2.8 : 0.6;
      const gravity = isSpinning ? 0.08 : 0.25;

      balls.forEach((ball) => {
        // Apply gravity & agitation
        ball.vy += gravity;
        if (isSpinning) {
          // Centrifugal / turbulent forces
          ball.vx += (Math.random() - 0.5) * 2.5;
          ball.vy += (Math.random() - 0.5) * 2.5;
        }

        ball.x += ball.vx * speedMultiplier;
        ball.y += ball.vy * speedMultiplier;

        // Friction damping
        ball.vx *= 0.985;
        ball.vy *= 0.985;

        // Circular Boundary Collision with Drum
        const dx = ball.x - centerX;
        const dy = ball.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist + ball.radius > drumRadius) {
          const nx = dx / dist;
          const ny = dy / dist;

          // Reposition at boundary
          ball.x = centerX + nx * (drumRadius - ball.radius);
          ball.y = centerY + ny * (drumRadius - ball.radius);

          // Reflect velocity
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * 0.85;
          ball.vy = (ball.vy - 2 * dot * ny) * 0.85;

          // Play occasional collision sound
          const now = performance.now();
          if (isSpinning && now - lastCollisionTime > 120 && Math.random() < 0.2) {
            playCollisionSound();
            lastCollisionTime = now;
          }
        }

        // Draw Spherical 3D-Shaded Ball
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);

        // Radial Gradient for 3D sphere depth
        const grad = ctx.createRadialGradient(
          ball.x - ball.radius * 0.3,
          ball.y - ball.radius * 0.3,
          ball.radius * 0.1,
          ball.x,
          ball.y,
          ball.radius
        );
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.3, ball.color);
        grad.addColorStop(1, "#020617");

        ctx.fillStyle = grad;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = isSpinning ? 6 : 2;
        ctx.fill();

        // Draw Ball Number
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${ball.radius * 0.85}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(ball.number), ball.x, ball.y + 0.5);
        ctx.restore();
      });

      // 3. Central Hub & Accent Glow
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = currentConfig.accentColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = currentConfig.accentColor;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.stroke();
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

  // Spin & Draw Sequence Handler
  const handleSpinAndDraw = async () => {
    if (isSpinning) return;
    getAudioContext();
    setIsSpinning(true);
    setDrawnNumbers([]);
    setDrawnBonus(null);
    triggerHaptic([40, 30, 40]);

    // Spin agitation duration
    const spinDuration = 1800;
    await new Promise(r => setTimeout(r, spinDuration));

    // Extract numbers one-by-one with staggered animation
    const pool = Array.from({ length: currentConfig.poolSize }, (_, i) => i + 1);
    const selectedPicks: number[] = [];

    for (let i = 0; i < currentConfig.pickCount; i++) {
      await new Promise(r => setTimeout(r, 450));
      const randomIndex = Math.floor(Math.random() * pool.length);
      const drawn = pool.splice(randomIndex, 1)[0];
      selectedPicks.push(drawn);
      setDrawnNumbers([...selectedPicks]);
      playDrawDropSound();
      triggerHaptic(50);
    }

    // Extract Bonus Ball if applicable
    let bonus: number | undefined = undefined;
    if (currentConfig.hasBonus) {
      await new Promise(r => setTimeout(r, 600));
      bonus = Math.floor(Math.random() * currentConfig.bonusMax) + 1;
      setDrawnBonus(bonus);
      playDrawDropSound();
      triggerHaptic([60, 40, 60]);
    }

    setIsSpinning(false);
    playVictoryChime();
    triggerHaptic([50, 50, 100, 50, 150]);

    if (onTicketGenerated) {
      onTicketGenerated(selectedPicks, bonus);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-slate-950/40 relative overflow-hidden space-y-6 font-mono">
      
      {/* Header & Game Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Quick Pick
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Mute Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border text-xs transition cursor-pointer ${
              soundEnabled ? "bg-slate-900 border-white/10 text-white" : "bg-slate-950 border-white/5 text-gray-500"
            }`}
            title={soundEnabled ? "Mute Sound" : "Enable Sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Game Selector */}
          <div className="flex bg-slate-900/90 p-1 rounded-lg border border-white/5 gap-1">
            {(["lotto-plus", "play-whe", "win-for-life"] as const).map((g) => (
              <button
                key={g}
                onClick={() => {
                  if (!isSpinning) {
                    setSelectedGame(g);
                  }
                }}
                disabled={isSpinning}
                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition ${
                  selectedGame === g
                    ? "bg-white/10 text-white shadow-sm font-black border border-white/10"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {g.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Canvas Drum Physics Simulator */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative select-none">
          <div 
            className="absolute w-56 h-56 rounded-full blur-[60px] pointer-events-none opacity-20"
            style={{ backgroundColor: currentConfig.accentColor }}
          />

          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] rounded-full border border-white/5 bg-slate-950 shadow-[inset_0_0_30px_rgba(0,0,0,0.8),0_0_30px_rgba(0,0,0,0.5)] cursor-pointer"
            onClick={handleSpinAndDraw}
            title="Click to draw"
          />

          {isSpinning && (
            <p className="text-[10px] text-emerald-400 mt-3 uppercase tracking-widest text-center animate-pulse">
              Drawing random balls...
            </p>
          )}
        </div>

        {/* Drawn Result Chute & Action Controls */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
              Drawn Results ({currentConfig.name})
            </span>

            <div className="min-h-[70px] p-4 bg-slate-900/60 border border-white/5 rounded-xl flex items-center justify-center gap-2 flex-wrap shadow-inner">
              {drawnNumbers.length === 0 && !isSpinning ? (
                <span className="text-xs text-gray-500 italic">
                  Press DRAW to generate numbers
                </span>
              ) : (
                <>
                  {drawnNumbers.map((num, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-slate-950 shadow-[0_0_12px_rgba(255,255,255,0.2)] animate-scale-up"
                      style={{ backgroundColor: currentConfig.accentColor }}
                    >
                      {num}
                    </div>
                  ))}

                  {currentConfig.hasBonus && drawnBonus !== null && (
                    <>
                      <span className="text-gray-600 font-bold mx-1">|</span>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white bg-purple-600 border border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] animate-scale-up">
                        {drawnBonus}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {drawnBonus !== null && currentConfig.hasBonus && (
              <p className="text-[10px] text-purple-400 text-right font-bold uppercase">
                + {currentConfig.bonusName}: #{drawnBonus}
              </p>
            )}
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSpinAndDraw}
              disabled={isSpinning}
              className={`flex-1 py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isSpinning
                  ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 text-slate-950 shadow-[0_0_25px_rgba(52,211,153,0.4)] scale-[1.02] cursor-not-allowed"
                  : "bg-slate-900 border border-white/10 hover:border-emerald-400/50 hover:bg-slate-800 text-white shadow-md active:bg-gradient-to-r active:from-emerald-400 active:via-teal-400 active:to-sky-400 active:text-slate-950"
              }`}
            >
              <Play className={`w-4 h-4 fill-current ${isSpinning ? "animate-spin" : ""}`} />
              <span>{isSpinning ? "DRAWING..." : "DRAW"}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
