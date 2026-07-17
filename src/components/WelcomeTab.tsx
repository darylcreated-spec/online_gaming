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
          0%, 100% { transform: translate(10px, 10px); }
          25% { transform: translate(65px, 20px); }
          50% { transform: translate(25px, 60px); }
          75% { transform: translate(60px, 60px); }
        }
        @keyframes bounce-ball-2 {
          0%, 100% { transform: translate(60px, 60px); }
          35% { transform: translate(20px, 15px); }
          65% { transform: translate(70px, 10px); }
        }
        @keyframes bounce-ball-3 {
          0%, 100% { transform: translate(40px, 60px); }
          30% { transform: translate(15px, 15px); }
          60% { transform: translate(70px, 30px); }
        }
        @keyframes bounce-ball-4 {
          0%, 100% { transform: translate(15px, 55px); }
          15% { transform: translate(60px, 70px); }
          55% { transform: translate(45px, 12px); }
        }
        .animate-bounce-ball-1 { animation: bounce-ball-1 4.5s infinite ease-in-out; }
        .animate-bounce-ball-2 { animation: bounce-ball-2 5s infinite ease-in-out; }
        .animate-bounce-ball-3 { animation: bounce-ball-3 4s infinite ease-in-out; }
        .animate-bounce-ball-4 { animation: bounce-ball-4 5.5s infinite ease-in-out; }
        .animate-spin-slow { animation: spin 25s infinite linear; }
      `}</style>

      {/* Visual Header Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        
        {/* Floating Animated Graphic (Col Span 5) - Bingo Tumbler */}
        <div className="md:col-span-5 flex justify-center relative select-none h-56 items-center">
          <div className="relative w-44 h-44 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center p-4">
            {/* Outer Spinner Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dotted border-primary/20 animate-spin-slow" />
            {/* Inner Concentric Glow */}
            <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-slate-900 via-[#0B0C0E] to-slate-950 border border-white/5 flex items-center justify-center relative overflow-hidden shadow-[inset_0_0_20px_rgba(255,255,255,0.05),0_0_30px_rgba(0,0,0,0.5)]">
              <span className="font-mono text-[9px] text-gray-500 font-extrabold tracking-widest text-center uppercase leading-tight select-none">
                THE WIN<br />CONCEPT
              </span>
            </div>
            
            {/* Bouncing Colored Balls Inside Spinner Container */}
            {/* Ball 1 */}
            <div className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-[0_0_10px_rgba(56,189,248,0.5)] animate-bounce-ball-1 select-none">
              17
            </div>
            {/* Ball 2 */}
            <div className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-[0_0_10px_rgba(167,139,250,0.5)] animate-bounce-ball-2 select-none">
              28
            </div>
            {/* Ball 3 */}
            <div className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-bounce-ball-3 select-none">
              9
            </div>
            {/* Ball 4 */}
            <div className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.5)] animate-bounce-ball-4 select-none">
              35
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
