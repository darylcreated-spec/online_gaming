"use client";

import React from "react";
import { Info, Heart } from "lucide-react";

export default function WelcomeTab() {
  return (
    <div className="space-y-6">
      
      {/* Custom CSS Animation Keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce-ball-1 {
          0%, 100% { transform: translate(15px, 15px); }
          25% { transform: translate(125px, 25px); }
          50% { transform: translate(25px, 125px); }
          75% { transform: translate(125px, 125px); }
        }
        @keyframes bounce-ball-2 {
          0%, 100% { transform: translate(125px, 125px); }
          35% { transform: translate(25px, 20px); }
          65% { transform: translate(130px, 15px); }
        }
        @keyframes bounce-ball-3 {
          0%, 100% { transform: translate(70px, 125px); }
          30% { transform: translate(20px, 20px); }
          60% { transform: translate(125px, 45px); }
          80% { transform: translate(25px, 110px); }
        }
        @keyframes bounce-ball-4 {
          0%, 100% { transform: translate(20px, 80px); }
          15% { transform: translate(110px, 125px); }
          55% { transform: translate(75px, 15px); }
          75% { transform: translate(125px, 50px); }
        }
        @keyframes bounce-ball-5 {
          0%, 100% { transform: translate(85px, 15px); }
          25% { transform: translate(15px, 110px); }
          50% { transform: translate(125px, 85px); }
          75% { transform: translate(45px, 25px); }
        }
        @keyframes bounce-ball-6 {
          0%, 100% { transform: translate(35px, 125px); }
          20% { transform: translate(125px, 35px); }
          45% { transform: translate(20px, 65px); }
          70% { transform: translate(110px, 110px); }
        }
        .animate-bounce-ball-1 { animation: bounce-ball-1 4.5s infinite ease-in-out; }
        .animate-bounce-ball-2 { animation: bounce-ball-2 5s infinite ease-in-out; }
        .animate-bounce-ball-3 { animation: bounce-ball-3 4s infinite ease-in-out; }
        .animate-bounce-ball-4 { animation: bounce-ball-4 5.5s infinite ease-in-out; }
        .animate-bounce-ball-5 { animation: bounce-ball-5 3.8s infinite ease-in-out; }
        .animate-bounce-ball-6 { animation: bounce-ball-6 5.2s infinite ease-in-out; }
        .animate-spin-slow { animation: spin 25s infinite linear; }
      `}</style>

      {/* Visual Header Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Floating Animated Graphic (Col Span 5) - Bingo Tumbler */}
        <div className="md:col-span-5 flex justify-center relative select-none h-72 items-center">
          {/* Glowing Background Radial */}
          <div className="absolute w-64 h-64 bg-primary/10 rounded-full blur-[70px] animate-pulse" />
          
          {/* Tumbler Stand */}
          <svg viewBox="0 0 100 100" className="absolute w-72 h-72 text-slate-700/60 stroke-current fill-none stroke-[2.5] z-0">
            <path d="M20,85 L35,40 L65,40 L80,85" strokeLinecap="round" />
            <path d="M15,85 L85,85" strokeLinecap="round" strokeWidth="4" />
            <circle cx="50" cy="40" r="5" fill="#020617" stroke="white" strokeWidth="2" />
          </svg>

          <div className="relative w-60 h-60 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center p-4">
            {/* Outer Spinner Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dotted border-primary/20 animate-spin-slow" />
            {/* Inner Concentric Glow / Ball Container (Clipped Circle) */}
            <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-slate-900 via-[#0B0C0E] to-slate-950 border border-white/5 flex items-center justify-center relative overflow-hidden shadow-[inset_0_0_20px_rgba(255,255,255,0.05),0_0_30px_rgba(0,0,0,0.5)]">
              <span className="font-mono text-[11px] text-gray-500 font-extrabold tracking-widest text-center uppercase leading-tight select-none z-10">
                THE WIN<br />CONCEPT
              </span>
              
              {/* Bouncing Colored Balls Inside Spinner Container */}
              {/* Ball 1 */}
              <div className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.6)] animate-bounce-ball-1 select-none z-0">
                17
              </div>
              {/* Ball 2 */}
              <div className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-[0_0_12px_rgba(167,139,250,0.6)] animate-bounce-ball-2 select-none z-0">
                28
              </div>
              {/* Ball 3 */}
              <div className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-[0_0_12px_rgba(52,211,153,0.6)] animate-bounce-ball-3 select-none z-0">
                9
              </div>
              {/* Ball 4 */}
              <div className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.6)] animate-bounce-ball-4 select-none z-0">
                35
              </div>
              {/* Ball 5 */}
              <div className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-bounce-ball-5 select-none z-0">
                1
              </div>
              {/* Ball 6 */}
              <div className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 text-white font-mono font-black text-xs flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.6)] animate-bounce-ball-6 select-none z-0">
                21
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Text block */}
        <div className="md:col-span-7 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight font-mono uppercase text-white drop-shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            THE WIN CONCEPT
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed font-mono">
            Welcome to the analytical portal for local lottery prediction models. This application parses historical draw databases, builds mathematical successors/companions correlation models, and isolates statistical hot and cold mark frequencies to help you optimize and reduce your statistical odds.
          </p>
        </div>
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
