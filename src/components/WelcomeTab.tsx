"use client";

import React, { useState } from "react";
import { Info, Heart, ChevronDown, Layers } from "lucide-react";

interface WelcomeTabProps {
  onNavigate: (tab: "lotto-plus" | "play-whe" | "scanner" | "settings") => void;
}

export default function WelcomeTab({ onNavigate }: WelcomeTabProps) {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    { 
      id: "lotto-plus", 
      label: "Lotto Plus Analytics", 
      desc: "Odds reduction, draw logs & guides", 
      icon: "/images/lotto_plus_icon.png" 
    },
    { 
      id: "play-whe", 
      label: "Play Whe Analytics", 
      desc: "Relationship map, dictionary & logs", 
      icon: "/images/play_whe_icon.png" 
    },
    { 
      id: "scanner", 
      label: "Ticket Scanner", 
      desc: "Scan physical slips with camera", 
      icon: "/images/scanner_icon.png" 
    },
    { 
      id: "settings", 
      label: "System Settings", 
      desc: "Database diagnostics & updates", 
      icon: "/images/settings_icon.png" 
    }
  ] as const;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-10">
      
      {/* Inject Custom Ball Bouncing Keyframes */}
      <style>{`
        @keyframes bounce-ball-1 {
          0%, 100% { transform: translate(10px, 20px); }
          25% { transform: translate(65px, 15px); }
          50% { transform: translate(45px, 75px); }
          75% { transform: translate(12px, 50px); }
        }
        @keyframes bounce-ball-2 {
          0%, 100% { transform: translate(75px, 40px); }
          20% { transform: translate(25px, 70px); }
          45% { transform: translate(15px, 15px); }
          70% { transform: translate(60px, 10px); }
        }
        @keyframes bounce-ball-3 {
          0%, 100% { transform: translate(40px, 60px); }
          30% { transform: translate(15px, 15px); }
          60% { transform: translate(70px, 30px); }
          80% { transform: translate(20px, 75px); }
        }
        @keyframes bounce-ball-4 {
          0%, 100% { transform: translate(15px, 55px); }
          15% { transform: translate(60px, 70px); }
          55% { transform: translate(45px, 12px); }
          75% { transform: translate(75px, 35px); }
        }
        @keyframes bounce-ball-5 {
          0%, 100% { transform: translate(50px, 12px); }
          25% { transform: translate(12px, 65px); }
          50% { transform: translate(75px, 55px); }
          75% { transform: translate(30px, 20px); }
        }
        
        @keyframes text-shine {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-bounce-ball-1 { animation: bounce-ball-1 4.5s infinite ease-in-out; }
        .animate-bounce-ball-2 { animation: bounce-ball-2 5s infinite ease-in-out; }
        .animate-bounce-ball-3 { animation: bounce-ball-3 4s infinite ease-in-out; }
        .animate-bounce-ball-4 { animation: bounce-ball-4 5.5s infinite ease-in-out; }
        .animate-bounce-ball-5 { animation: bounce-ball-5 3.8s infinite ease-in-out; }
        .animate-spin-slow { animation: spin 25s infinite linear; }
        
        .animate-text-shine {
          background: linear-gradient(
            to right,
            #ffffff 20%,
            #38bdf8 38%,
            #a78bfa 50%,
            #38bdf8 62%,
            #ffffff 80%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: text-shine 4s linear infinite;
        }
      `}</style>

      {/* Visual Header Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Floating Animated Graphic (Col Span 5) - Bingo Tumbler */}
        <div className="md:col-span-5 flex justify-center relative select-none h-56 items-center">
          {/* Glowing Background Radial */}
          <div className="absolute w-48 h-48 bg-primary/20 rounded-full blur-[60px] animate-pulse" />
          
          {/* Tumbler Stand */}
          <svg viewBox="0 0 100 100" className="absolute w-52 h-52 text-slate-700/60 stroke-current fill-none stroke-[2.5] z-0">
            <path d="M20,85 L35,40 L65,40 L80,85" strokeLinecap="round" />
            <path d="M15,85 L85,85" strokeLinecap="round" strokeWidth="4" />
            <circle cx="50" cy="40" r="5" fill="#020617" stroke="white" strokeWidth="2" />
          </svg>

          {/* Outer Spin Tumbler Cage */}
          <div className="absolute w-44 h-44 border border-dashed border-white/10 rounded-full animate-spin-slow z-10 pointer-events-none" />
          
          {/* Bouncing Balls Glass Capsule Container */}
          <div className="relative w-32 h-32 rounded-full bg-slate-950/60 border border-white/15 overflow-hidden backdrop-blur-md shadow-[inset_0_0_25px_rgba(255,255,255,0.08)] z-20 flex items-center justify-center">
            {/* Ball 1 */}
            <div className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-[0_0_10px_rgba(56,189,248,0.5)] animate-bounce-ball-1 select-none">
              14
            </div>
            {/* Ball 2 */}
            <div className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.5)] animate-bounce-ball-2 select-none">
              30
            </div>
            {/* Ball 3 */}
            <div className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-bounce-ball-3 select-none">
              9
            </div>
            {/* Ball 4 */}
            <div className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.5)] animate-bounce-ball-4 select-none">
              35
            </div>
            {/* Ball 5 */}
            <div className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-bounce-ball-5 select-none">
              1
            </div>
          </div>
        </div>

        {/* Welcome Text block */}
        <div className="md:col-span-7 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight font-mono uppercase animate-text-shine drop-shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            THE WIN CONCEPT
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed font-mono">
            Welcome to the analytical portal for local lottery prediction models. This application parses historical draw databases, builds mathematical successors/companions correlation models, and isolates statistical hot and cold mark frequencies to help you optimize and reduce your statistical odds.
          </p>
        </div>
      </div>

      {/* Dropdown Selection Panel */}
      <div className="max-w-md mx-auto space-y-3 relative font-mono">
        <label className="text-[10px] font-bold tracking-widest text-primary uppercase block text-center">
          Select Analytical Portal
        </label>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-5 py-4 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 hover:border-primary/45 transition-all text-xs font-bold text-white shadow-lg cursor-pointer"
        >
          <span className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-primary animate-pulse" />
            CHOOSE A GAME OR UTILITY...
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 mt-2 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-md overflow-hidden z-[100] shadow-[0_10px_40px_rgba(0,0,0,0.9)]">
            <div className="p-1.5 flex flex-col gap-1">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    onNavigate(opt.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-left hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <img src={opt.icon} alt={opt.label} className="w-6 h-6 object-contain shrink-0 group-hover:scale-105 transition-transform" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white group-hover:text-primary transition-colors">
                      {opt.label}
                    </span>
                    <span className="text-[9px] text-gray-500 uppercase mt-0.5">
                      {opt.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
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
