"use client";

import React from "react";
import { Info, Sparkles, Heart } from "lucide-react";

interface WelcomeTabProps {
  onNavigate: (tab: "lotto" | "playwhe") => void;
}

export default function WelcomeTab({ onNavigate }: WelcomeTabProps) {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-10">
      
      {/* Visual Header Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Floating Animated Graphic (Col Span 5) */}
        <div className="md:col-span-5 flex justify-center relative select-none">
          {/* Glowing Background Radial */}
          <div className="absolute w-48 h-48 bg-primary/20 rounded-full blur-[60px] animate-pulse" />
          
          {/* Interactive CSS Floating Token */}
          <div className="relative w-40 h-40 flex items-center justify-center animate-bounce duration-[6000ms] ease-in-out">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_20px_rgba(56,189,248,0.4)] animate-spin-slow">
              <defs>
                <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
              {/* Outer Glowing Rings */}
              <circle cx="100" cy="100" r="85" fill="none" stroke="url(#glowGrad)" strokeWidth="3" strokeDasharray="10 15" className="opacity-80" />
              <circle cx="100" cy="100" r="70" fill="none" stroke="url(#glowGrad)" strokeWidth="1.5" strokeDasharray="30 8" className="opacity-60" />
              
              {/* Floating inner geometric core */}
              <polygon points="100,45 145,130 55,130" fill="none" stroke="url(#glowGrad)" strokeWidth="4" />
              <circle cx="100" cy="85" r="15" fill="url(#glowGrad)" />
            </svg>
            <div className="absolute text-white font-mono font-black text-lg tracking-wider animate-pulse">
              LUCK
            </div>
          </div>
        </div>

        {/* Welcome Text block (Col Span 7) */}
        <div className="md:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold font-mono tracking-wider uppercase">
            <Sparkles className="w-3 h-3" />
            Probability Optimizer
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white font-mono uppercase bg-gradient-to-r from-white via-slate-100 to-primary bg-clip-text text-transparent">
            THE WIN CONCEPT
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed font-mono">
            Welcome to the analytical portal for local lottery prediction models. This application parses historical draw databases, builds mathematical successors/companions correlation models, and isolates statistical hot and cold mark frequencies to help you optimize and reduce your statistical odds.
          </p>
        </div>
      </div>

      {/* Dual Portal Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        
        {/* Lotto Plus Card */}
        <button
          onClick={() => onNavigate("lotto")}
          className="glass-panel p-6 rounded-2xl border-primary/15 bg-primary/[0.01] hover:border-primary/45 hover:bg-primary/[0.03] transition-all text-left group space-y-4 relative overflow-hidden flex flex-col justify-between cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          <div className="space-y-3">
            <span className="text-[10px] font-bold tracking-widest text-primary uppercase font-mono">Model Option 1</span>
            <h3 className="text-xl font-extrabold text-white font-mono uppercase tracking-wide">Lotto Plus Analytics</h3>
            <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
              Explore Delta spacing models, Powerball frequency charts, Hot/Cold listings, and generate optimized combinations based on past draws.
            </p>
          </div>
          <div className="pt-4 flex items-center justify-between text-xs font-mono font-bold text-white group-hover:text-primary transition-colors">
            <span>ENTER LOTTO ANALYTICS →</span>
          </div>
        </button>

        {/* Play Whe Card */}
        <button
          onClick={() => onNavigate("playwhe")}
          className="glass-panel p-6 rounded-2xl border-secondary/15 bg-secondary/[0.01] hover:border-secondary/45 hover:bg-secondary/[0.03] transition-all text-left group space-y-4 relative overflow-hidden flex flex-col justify-between cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-colors" />
          <div className="space-y-3">
            <span className="text-[10px] font-bold tracking-widest text-secondary uppercase font-mono">Model Option 2</span>
            <h3 className="text-xl font-extrabold text-white font-mono uppercase tracking-wide">Play Whe Analytics</h3>
            <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
              Analyze Saturday Evening playbacks, traditional Chinapoo groupings, co-occurring daily companions, and successors maps.
            </p>
          </div>
          <div className="pt-4 flex items-center justify-between text-xs font-mono font-bold text-white group-hover:text-secondary transition-colors">
            <span>ENTER PLAY WHE ANALYTICS →</span>
          </div>
        </button>

      </div>

      {/* Warning Disclaimer Panel */}
      <div className="glass-panel p-5 rounded-xl border-red-500/10 bg-red-500/[0.01] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 font-mono">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Disclaimer & Fair Play Notice</h4>
            <p className="text-[10px] leading-relaxed text-gray-400">
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
            <p className="text-[10px] leading-relaxed text-gray-400">
              Creating and maintaining these complex analytical scraping systems requires time, hosting, and dedication. If this mathematical tool helps you hit a lucky streak, win big, or become wealthy, please show some love and support the creator!
            </p>
            <div className="p-2.5 bg-slate-950/60 border border-white/5 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-[10px] text-gray-400">Send Tips / Support (PayPal):</span>
              <span className="text-xs font-extrabold text-amber-400 select-all tracking-wider">
                daryl.created@gmail.com
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
