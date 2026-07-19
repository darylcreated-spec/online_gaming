"use client";

import React, { useState } from "react";
import { Info, Heart } from "lucide-react";

export default function WelcomeTab() {
  return (
    <div className="space-y-6">
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
  );
}
