"use client";

import React, { useState, useEffect } from "react";
import { Info, Heart } from "lucide-react";

export default function WelcomeTab() {
  const [shadedNums, setShadedNums] = useState<number[]>([]);
  const [pencilPos, setPencilPos] = useState({ x: 50, y: -25, rotate: 0, shake: false });

  useEffect(() => {
    let active = true;
    const targetNums = [4, 12, 19, 26, 33];

    const runSequence = async () => {
      while (active) {
        // Reset state
        setShadedNums([]);
        setPencilPos({ x: 50, y: -30, rotate: 0, shake: false });
        
        // Idle at start
        await new Promise((r) => setTimeout(r, 2000));
        if (!active) break;

        // Move to each target number and shade it
        for (const num of targetNums) {
          const col = (num - 1) % 6;
          const row = Math.floor((num - 1) / 6);
          const targetX = 12 + col * 15.5;
          const targetY = 15 + row * 13.5;

          // Move pencil to target
          setPencilPos({ x: targetX, y: targetY, rotate: -10, shake: false });
          await new Promise((r) => setTimeout(r, 800));
          if (!active) break;

          // Shading motion
          setPencilPos({ x: targetX, y: targetY, rotate: -10, shake: true });
          await new Promise((r) => setTimeout(r, 550));
          if (!active) break;

          // Mark as shaded
          setShadedNums((prev) => [...prev, num]);
          setPencilPos({ x: targetX, y: targetY, rotate: -10, shake: false });
          await new Promise((r) => setTimeout(r, 200));
          if (!active) break;
        }

        if (!active) break;

        // Move pencil off-screen and rest on the completed shaded slip for 3 seconds
        setPencilPos({ x: 50, y: -35, rotate: 0, shake: false });
        await new Promise((r) => setTimeout(r, 3500));
      }
    };

    runSequence();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT COLUMN: Welcome Info & Disclaimers (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Welcome Text block */}
        <div className="glass-panel p-8 rounded-xl border border-white/5 bg-slate-950/20 space-y-4 font-mono">
          <h1 className="text-4xl font-extrabold tracking-tight uppercase text-white drop-shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            THE WIN CONCEPT
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed font-mono">
            Welcome to the analytical portal for local lottery prediction models. This application parses historical draw databases, builds mathematical successors/companions correlation models, and isolates statistical hot and cold mark frequencies to help you optimize and reduce your statistical odds.
          </p>
        </div>

        {/* Warning Disclaimer Panel */}
        <div className="glass-panel p-5 rounded-xl border-red-500/10 bg-red-500/[0.01] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 font-mono">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Disclaimer & Fair Play Notice</h4>
              <p className="text-xs leading-relaxed text-gray-400">
                This application is designed as a statistical tool that attempts to reduce the mathematical odds of NLCB online games by tracking historical frequencies and delta gaps. It is <strong>NOT affiliated with, authorized, or endorsed by the National Lotteries Control Board (NLCB)</strong> of Trinidad and Tobago in any form or fashion. Using this app <strong>does NOT guarantee any winnings</strong>. Please play responsibly.
              </p>
            </div>
          </div>
        </div>

        {/* Tipping Panel */}
        <div className="glass-panel p-5 rounded-xl border-amber-500/15 bg-amber-500/[0.01] relative overflow-hidden font-mono">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50" />
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-2 w-full">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Support the Creator
              </h4>
              <p className="text-xs leading-relaxed text-gray-400">
                Creating and maintaining these complex analytical scraping systems requires time, hosting, and dedication. If this mathematical tool helps you hit a lucky streak, win big, or become wealthy, please show some love and support the creator!
              </p>
              <div className="p-2.5 bg-slate-950/60 border border-white/5 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-xs text-gray-400">Send Tips / Support (PayPal):</span>
                <a 
                  href="mailto:daryl.created@gmail.com"
                  className="text-xs font-extrabold text-amber-400 hover:text-amber-300 transition tracking-wider underline underline-offset-4"
                >
                  daryl.created@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Ticket Shading Animation (5 cols) */}
      <div className="lg:col-span-5 flex justify-center">
        <div className="bg-[#f4efe0] text-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-300/30 p-6 font-mono w-full max-w-sm relative overflow-hidden h-[460px] flex flex-col justify-between select-none">

          {/* Ticket Header Details */}
          <div className="mt-2 space-y-1 border-b border-dashed border-slate-400 pb-3">
            <h2 className="text-md font-black text-slate-800 uppercase tracking-widest text-center">
              THE WIN CONCEPT
            </h2>
            <div className="text-center text-[9px] font-bold text-slate-600 bg-slate-200 py-0.5 rounded tracking-wider uppercase">
              Statistical Model Optimizer
            </div>
          </div>

          {/* Checklist Number Matrix Grid */}
          <div className="relative my-4 flex-1">
            <div className="grid grid-cols-6 gap-2 h-full py-1">
              {Array.from({ length: 36 }).map((_, idx) => {
                const num = idx + 1;
                const isShaded = shadedNums.includes(num);
                return (
                  <div
                    key={num}
                    className="border border-slate-400 bg-white/60 relative flex items-center justify-center rounded text-xs font-bold text-slate-800 transition"
                  >
                    <span>{String(num).padStart(2, "0")}</span>
                    
                    {/* Pencil Shading Overlay lines */}
                    {isShaded && (
                      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                        <svg viewBox="0 0 100 100" className="w-full h-full text-slate-700 opacity-90">
                          <path 
                            d="M10,20 L90,80 M15,10 L85,90 M30,10 L70,90 M10,30 L90,70 M20,15 L80,85 M5,45 L95,55 M45,5 L55,95" 
                            stroke="currentColor" 
                            strokeWidth="10" 
                            strokeLinecap="round"
                            className="animate-scribble"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Absolute Pencil SVG Icon (Quadrupled in size: w-48 h-48) */}
            <div
              className={`absolute z-30 w-48 h-48 pointer-events-none ${
                pencilPos.shake ? "animate-pencil-wiggle animate-lead-scribble" : ""
              }`}
              style={{
                left: `${pencilPos.x}%`,
                top: `${pencilPos.y}%`,
                transform: `translate(-5%, -95%) rotate(${pencilPos.rotate}deg)`,
                transition: pencilPos.shake ? "none" : "left 0.75s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.75s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.75s cubic-bezier(0.25, 0.8, 0.25, 1)",
              }}
            >
              {/* Yellow Drawing Pencil SVG */}
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[4px_10px_6px_rgba(0,0,0,0.35)]">
                {/* Yellow Pencil body */}
                <polygon points="10,90 90,10 95,15 15,95" fill="#f59e0b" />
                <polygon points="12,92 88,16 91,19 15,95" fill="#d97706" />
                {/* Wood/Lead Tip */}
                <polygon points="10,90 2,98 15,95" fill="#fde047" />
                <polygon points="2,98 0,100 4,96" fill="#1e293b" />
                {/* Eraser End */}
                <polygon points="85,15 90,10 95,15 90,20" fill="#f43f5e" />
                <polygon points="82,18 85,15 90,20 87,23" fill="#94a3b8" />
              </svg>
            </div>
          </div>

          <div className="border-t border-slate-300 pt-3 text-center text-[8px] text-slate-500 font-extrabold tracking-widest uppercase">
            MODEL COMPILING SYSTEM
          </div>

        </div>
      </div>

      {/* Embedded Animation Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scribble {
          from {
            stroke-dasharray: 600;
            stroke-dashoffset: 600;
          }
          to {
            stroke-dasharray: 600;
            stroke-dashoffset: 0;
          }
        }
        .animate-scribble {
          animation: scribble 0.4s ease-out forwards;
        }
        
        @keyframes pencil-wiggle {
          0%, 100% { transform: translate(-5%, -95%) rotate(-10deg) translate(0, 0); }
          25% { transform: translate(-5%, -95%) rotate(-10deg) translate(-2px, 2px); }
          50% { transform: translate(-5%, -95%) rotate(-10deg) translate(2px, -2px); }
          75% { transform: translate(-5%, -95%) rotate(-10deg) translate(-1px, -1px); }
        }
        .animate-pencil-wiggle {
          animation: pencil-wiggle 0.08s infinite;
        }
      `}} />

    </div>
  );
}
