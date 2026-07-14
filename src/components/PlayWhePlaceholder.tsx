"use client";

import React, { useState } from "react";
import { Sparkles, BarChart, Info, HelpCircle } from "lucide-react";

// The 36 traditional Play Whe marks
const PLAY_WHE_MARKS = [
  { num: 1, mark: "Centipede" },
  { num: 2, mark: "Old Lady" },
  { num: 3, mark: "Carriage" },
  { num: 4, mark: "Dead" },
  { num: 5, mark: "Fowler" },
  { num: 6, mark: "Candle" },
  { num: 7, mark: "Hog" },
  { num: 8, mark: "Tiger" },
  { num: 9, mark: "Cattle" },
  { num: 10, mark: "Monkey" },
  { num: 11, mark: "Play Boy" },
  { num: 12, mark: "King" },
  { num: 13, mark: "Frog" },
  { num: 14, mark: "Money" },
  { num: 15, mark: "Sick Woman" },
  { num: 16, mark: "Jamette" },
  { num: 17, mark: "Pigeon" },
  { num: 18, mark: "Water Boatman" },
  { num: 19, mark: "Horse" },
  { num: 20, mark: "Dog" },
  { num: 21, mark: "Mouth" },
  { num: 22, mark: "Rat" },
  { num: 23, mark: "House" },
  { num: 24, mark: "Queen" },
  { num: 25, mark: "Morocoy" },
  { num: 26, mark: "Fowl" },
  { num: 27, mark: "Penny" },
  { num: 28, mark: "Dead Man" },
  { num: 29, mark: "Opium Taker" },
  { num: 30, mark: "House Cat" },
  { num: 31, mark: "Parson" },
  { num: 32, mark: "Shrimp" },
  { num: 33, mark: "Spider" },
  { num: 34, mark: "Blind Man" },
  { num: 35, mark: "Big Snake" },
  { num: 36, mark: "Donkey" }
];

export default function PlayWhePlaceholder() {
  const [selectedMark, setSelectedMark] = useState<number | null>(null);

  // Generate mock frequencies for visual completeness
  const getMockFrequency = (num: number) => {
    return Math.floor(150 + Math.sin(num * 0.5) * 45);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Play Whe Suite</h2>
          <p className="text-sm text-gray-400">Traditional Trinidad & Tobago Chinapoo Mark Matrix</p>
        </div>
        <div className="bg-slate-900 border border-secondary/30 px-3.5 py-1.5 rounded-lg flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-secondary rounded-full animate-pulse" />
          <span className="text-xs font-mono font-bold text-secondary uppercase tracking-wider">DEVELOPMENT MODE</span>
        </div>
      </div>

      {/* Feature notice */}
      <div className="glass-panel p-6 rounded-xl flex flex-col md:flex-row gap-4 items-center relative overflow-hidden bg-secondary/[0.02] border-secondary/20">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary" />
        <div className="p-3 bg-secondary/10 border border-secondary/20 text-secondary rounded-lg">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-white text-sm">Play Whe Integration Coming Soon</h3>
          <p className="text-xs text-gray-400 leading-relaxed max-w-2xl font-sans">
            We are working on bringing a full Play Whe engine to **the Win Concept**. This will include automated daily drawing scraping, historical mark frequency logs, and ticket scanning support. Explore the symbol layout below.
          </p>
        </div>
      </div>

      {/* Split details layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Play Whe Matrix Grid - Span 3 */}
        <div className="xl:col-span-3 glass-panel p-6 rounded-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart className="w-4 h-4 text-secondary" />
            Traditional 36 Marks Matrix
          </h3>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {PLAY_WHE_MARKS.map((item) => {
              const isSelected = selectedMark === item.num;
              const freq = getMockFrequency(item.num);
              
              return (
                <button
                  key={item.num}
                  onClick={() => setSelectedMark(isSelected ? null : item.num)}
                  className={`p-3 rounded-lg border text-left flex flex-col justify-between aspect-square transition-all ${
                    isSelected
                      ? "bg-secondary/15 border-secondary text-white shadow-[0_0_12px_rgba(192,132,252,0.25)]"
                      : "bg-slate-950/60 border-white/5 hover:border-white/10 text-gray-300"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="font-mono text-sm font-bold">{item.num}</span>
                    <span className="text-[8px] font-mono text-gray-500">
                      f: {freq}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <div className={`text-[10px] font-bold ${isSelected ? "text-secondary" : "text-gray-400"}`}>
                      {item.mark}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Mark Detail Panel - Span 1 */}
        <div className="glass-panel p-6 rounded-xl space-y-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary" />
          
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Mark Inspector</h3>
              <p className="text-xs text-gray-400">Click a mark on the matrix to inspect analytics</p>
            </div>

            {selectedMark ? (
              <div className="space-y-4 font-mono text-xs border-t border-white/5 pt-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-500">Selected Number:</span>
                  <span className="text-white font-bold">{selectedMark}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-500">Traditional Mark:</span>
                  <span className="text-secondary font-bold">{PLAY_WHE_MARKS[selectedMark - 1].mark}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-500">Mock Frequency:</span>
                  <span className="text-white font-bold">{getMockFrequency(selectedMark)} times</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-500">Last Drawn:</span>
                  <span className="text-green-400 font-bold">5 draws ago</span>
                </div>
                
                <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5 text-[10px] text-gray-400 font-sans leading-relaxed flex gap-2">
                  <Info className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                  <span>
                    When connected, this panel will calculate standard deviations, hot/cold indices, and match history for the mark **{PLAY_WHE_MARKS[selectedMark - 1].mark}**.
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-gray-500 font-sans flex flex-col items-center justify-center gap-2">
                <HelpCircle className="w-8 h-8 text-gray-600" />
                Select a symbol to view predictions.
              </div>
            )}
          </div>

          <div className="border-t border-white/5 pt-4 text-[9px] text-gray-500 font-mono">
            PLAY WHE ANALYTICAL FRAMEWORK
          </div>
        </div>

      </div>
    </div>
  );
}
