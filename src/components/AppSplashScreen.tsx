"use client";

import React, { useState, useEffect } from "react";

interface AppSplashScreenProps {
  onComplete?: () => void;
  isLoading: boolean;
}

export default function AppSplashScreen({ onComplete, isLoading }: AppSplashScreenProps) {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState("Loading official NLCB games...");
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(45);
      setStatusText("Checking latest draw results...");
    }, 400);

    const timer2 = setTimeout(() => {
      setProgress(78);
      setStatusText("Preparing exact odds and budgets...");
    }, 850);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setStatusText("Ready");
    }, 1300);

    const timer4 = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setIsMounted(false);
        if (onComplete) onComplete();
      }, 450);
    }, 1450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070b19] font-sans select-none px-6 transition-opacity duration-700 ease-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-950/30 via-[#070b19]/90 to-[#030712] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center space-y-6">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-sky-400/40 animate-spin" style={{ animationDuration: "8s" }} />
          <div className="absolute inset-1 rounded-full border-2 border-amber-400/30 animate-spin" style={{ animationDuration: "12s", animationDirection: "reverse" }} />
          <div className="absolute inset-2 rounded-full border-2 border-emerald-400/30 animate-spin" style={{ animationDuration: "16s" }} />

          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(56,189,248,0.4)] border border-white/15 bg-slate-950">
            <img
              src="/images/pwa-icon-512.png"
              alt="The Win Concept"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            The Win Concept
          </h1>
          <p className="text-xs text-slate-400 tracking-wider uppercase font-semibold">
            NLCB Analytics
          </p>
        </div>

        <div className="w-full space-y-2 pt-2">
          <div className="w-full h-2 bg-slate-900/80 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 px-1">
            <span className="text-sky-300 font-semibold truncate max-w-[240px] text-left">
              {statusText}
            </span>
            <span className="text-white font-mono font-bold">{progress}%</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="text-xs text-sky-300 bg-sky-950/40 px-2.5 py-1 rounded-md border border-sky-500/20 font-medium">
            Lotto Plus
          </span>
          <span className="text-xs text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-500/20 font-medium">
            Play Whe
          </span>
          <span className="text-xs text-emerald-300 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-500/20 font-medium">
            Win For Life
          </span>
        </div>
      </div>

      <div className="absolute bottom-6 text-xs text-slate-500 text-center px-4">
        Trinidad and Tobago NLCB Odds and Budget Guide
      </div>
    </div>
  );
}
