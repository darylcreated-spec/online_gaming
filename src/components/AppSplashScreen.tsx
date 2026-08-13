"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Shield, Cpu, Activity } from "lucide-react";

interface AppSplashScreenProps {
  onComplete?: () => void;
  isLoading: boolean;
}

export default function AppSplashScreen({ onComplete, isLoading }: AppSplashScreenProps) {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState("INITIALIZING PROBABILITY ENGINES...");
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    // Sequence of loading steps
    const timer1 = setTimeout(() => {
      setProgress(45);
      setStatusText("CONNECTING TO TURSO CLOUD DB...");
    }, 400);

    const timer2 = setTimeout(() => {
      setProgress(78);
      setStatusText("COMPUTING BAYESIAN & MARKOV CONSENSUS...");
    }, 850);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setStatusText("OPTIMIZATION ENGINES READY");
    }, 1300);

    const timer4 = setTimeout(() => {
      if (!isLoading) {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsMounted(false);
          if (onComplete) onComplete();
        }, 600);
      }
    }, 1600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [isLoading, onComplete]);

  // If loading finishes later, trigger fade out
  useEffect(() => {
    if (!isLoading && progress === 100 && !isFadingOut) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setIsMounted(false);
        if (onComplete) onComplete();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isLoading, progress, isFadingOut, onComplete]);

  if (!isMounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070b19] font-mono select-none px-6 transition-opacity duration-700 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background Starfield & Radial Aura */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-950/30 via-[#070b19]/90 to-[#030712] pointer-events-none" />
      
      {/* Ambient Pulsing Glowing Orbs */}
      <div className="absolute w-72 h-72 rounded-full bg-sky-500/10 blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute w-64 h-64 rounded-full bg-amber-500/10 blur-[90px] pointer-events-none" style={{ transform: "translate(40px, -40px)" }} />
      <div className="absolute w-64 h-64 rounded-full bg-emerald-500/10 blur-[90px] pointer-events-none" style={{ transform: "translate(-40px, 40px)" }} />

      {/* Main Brand Container */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center space-y-6">
        
        {/* Crowned "W" Emblem with Tri-Color Orbital Ring */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
          {/* Animated Outer Tri-Color Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-sky-400/40 animate-spin" style={{ animationDuration: "8s" }} />
          <div className="absolute inset-1 rounded-full border-2 border-amber-400/30 animate-spin" style={{ animationDuration: "12s", animationDirection: "reverse" }} />
          <div className="absolute inset-2 rounded-full border-2 border-emerald-400/30 animate-spin" style={{ animationDuration: "16s" }} />

          {/* App Icon Image */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(56,189,248,0.4)] border border-white/15 bg-slate-950">
            <img
              src="/images/pwa-icon-512.png"
              alt="The Win Concept"
              className="w-full h-full object-cover animate-pulse"
              style={{ animationDuration: "3s" }}
            />
          </div>
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-1.5">
          <h1 
            className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-white"
            style={{ textShadow: "0 0 20px rgba(56, 189, 248, 0.6), 0 0 40px rgba(251, 191, 36, 0.3)" }}
          >
            THE WIN CONCEPT
          </h1>
          <p className="text-[10px] text-gray-400 tracking-wider uppercase font-bold">
            Lottery Intelligence &amp; Combinatorial Engine
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full space-y-2 pt-2">
          <div className="w-full h-1.5 bg-slate-900/80 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(56,189,248,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[9px] text-gray-400 px-1">
            <span className="text-primary font-bold uppercase truncate max-w-[240px] text-left">
              {statusText}
            </span>
            <span className="text-white font-bold">{progress}%</span>
          </div>
        </div>

        {/* Subtle Game Tri-Indicator Badges */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="flex items-center gap-1 text-[8px] text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>LOTTO PLUS</span>
          </div>
          <div className="flex items-center gap-1 text-[8px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>PLAY WHE</span>
          </div>
          <div className="flex items-center gap-1 text-[8px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>WIN FOR LIFE</span>
          </div>
        </div>

      </div>

      {/* Footer System Notice */}
      <div className="absolute bottom-6 text-[8px] text-gray-600 uppercase tracking-widest text-center">
        TRINIDAD &amp; TOBAGO ONLINE GAMING ANALYTICAL SYSTEM
      </div>
    </div>
  );
}
