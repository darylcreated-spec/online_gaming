"use client";

import React, { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Hash, ShieldCheck, CheckCircle2 } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface Draw {
  id: number;
  draw_number: number;
  draw_date: string;
  num1: number;
  num2: number;
  num3: number;
  num4: number;
  num5: number;
  powerball: number;
  multiplier: string;
  jackpot: string;
}

interface HistoryTabProps {
  draws: Draw[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  loading: boolean;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onNumberFilterChange: (num: string) => void;
}

export default function HistoryTab({
  draws,
  pagination,
  loading,
  onPageChange,
  onSearchChange,
  onNumberFilterChange
}: HistoryTabProps) {
  const [searchInput, setSearchInput] = useState("");
  const [numInput, setNumInput] = useState("");
  const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchInput);
    onPageChange(1); // Reset to page 1
  };

  const handleNumFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNumberFilterChange(numInput);
    onPageChange(1); // Reset to page 1
  };

  const handleClear = () => {
    setSearchInput("");
    setNumInput("");
    onSearchChange("");
    onNumberFilterChange("");
    onPageChange(1);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* General Search (Draw # or Date) */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by Draw # or Date (YYYY-MM-DD)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-gray-500 font-mono transition-all"
            />
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-500" />
            <button type="submit" className="hidden">Search</button>
          </form>

          {/* Number Filter */}
          <form onSubmit={handleNumFilterSubmit} className="relative w-full sm:w-60">
            <input
              type="number"
              min="1"
              max="35"
              placeholder="Filter by Main Number (1-35)..."
              value={numInput}
              onChange={(e) => setNumInput(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-gray-500 font-mono transition-all"
            />
            <Hash className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-500" />
            <button type="submit" className="hidden">Filter</button>
          </form>
        </div>

        <div className="flex gap-3 w-full md:w-auto justify-end">
          {(searchInput || numInput) && (
            <button
              onClick={handleClear}
              className="px-4 py-2 rounded-lg text-xs font-semibold font-mono border border-white/15 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              CLEAR FILTERS
            </button>
          )}
          <button
            onClick={() => {
              onSearchChange(searchInput);
              onNumberFilterChange(numInput);
              onPageChange(1);
            }}
            className="px-5 py-2 bg-primary text-slate-950 rounded-lg text-xs font-bold font-mono tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_10px_rgba(56,189,248,0.2)]"
          >
            APPLY FILTER
          </button>
        </div>
      </div>

      {/* Paginated Draws List Split Container */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Table Container */}
        <div className={`transition-all duration-300 ${selectedDraw ? "w-full lg:w-2/3" : "w-full"}`}>
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="overflow-x-auto sleek-scrollbar max-h-[600px] relative">
              <table className="w-full text-left border-collapse min-w-[580px]">
                <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md">
                  <tr className="border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                    <th className="py-3 px-4 bg-slate-950">Draw #</th>
                    <th className="py-3 px-4 bg-slate-950">Draw Date</th>
                    <th className="py-3 px-4 text-center bg-slate-950">Winning Numbers</th>
                    <th className="py-3 px-4 text-center bg-slate-950">Powerball</th>
                    <th className="py-3 px-4 text-center bg-slate-950">Multiplier</th>
                    <th className="py-3 px-3 text-right bg-slate-950">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-sm text-gray-300">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        <span className="inline-block animate-pulse">Querying database...</span>
                      </td>
                    </tr>
                  ) : draws.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        No draws found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    draws.map((draw) => {
                      const isSelected = selectedDraw?.id === draw.id;
                      const numbers = [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5];
                      return (
                        <tr 
                          key={draw.id} 
                          onClick={() => {
                            setSelectedDraw(isSelected ? null : draw);
                            triggerHaptic("selection");
                          }}
                          className={`cursor-pointer transition-all duration-200 ${
                            isSelected 
                              ? "bg-sky-500/15 border-l-4 border-l-sky-400 text-white shadow-inner" 
                              : "hover:bg-white/[0.02] text-gray-300"
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-white">#{draw.draw_number}</td>
                          <td className="py-3.5 px-4 text-gray-400 text-xs">
                            {new Date(draw.draw_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              timeZone: 'UTC'
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex justify-center gap-1.5">
                              {numbers.map((num, i) => (
                                <div
                                  key={i}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs font-mono transition-transform ${
                                    isSelected
                                      ? "bg-sky-400 text-slate-950 scale-105 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                                      : "bg-primary/10 border border-primary/40 text-primary"
                                  }`}
                                >
                                  {num}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex justify-center">
                              <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 flex items-center justify-center font-bold text-xs shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                                {draw.powerball}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex justify-center">
                              <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-xs text-gray-400">
                                {draw.multiplier}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded transition-colors ${
                              isSelected ? "bg-sky-400/20 text-sky-300" : "text-gray-500 hover:text-white"
                            }`}>
                              {isSelected ? "Active" : "Inspect →"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Split-View Investigation Panel (SaaS Drawer Pattern) */}
        {selectedDraw && (
          <div className="w-full lg:w-1/3 glass-panel p-5 rounded-2xl border border-sky-500/30 bg-slate-950/95 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 relative shadow-2xl shrink-0 font-mono">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wider">
                    Lotto Plus Draw #{selectedDraw.draw_number}
                  </h4>
                  <span className="text-[10px] text-gray-400">
                    {new Date(selectedDraw.draw_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDraw(null)}
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition text-xs"
                title="Close Investigation Panel"
              >
                ✕
              </button>
            </div>

            {/* Balls Display */}
            {(() => {
              const nums = [selectedDraw.num1, selectedDraw.num2, selectedDraw.num3, selectedDraw.num4, selectedDraw.num5].sort((a, b) => a - b);
              const sum = nums.reduce((a, b) => a + b, 0);
              const isGaussianBell = sum >= 60 && sum <= 120;
              const oddsCount = nums.filter(n => n % 2 !== 0).length;
              const evensCount = 5 - oddsCount;
              const lowsCount = nums.filter(n => n <= 17).length;
              const highsCount = 5 - lowsCount;
              const spread = nums[4] - nums[0];

              // Check consecutive pairs
              let consecutivePairs = 0;
              for (let i = 0; i < 4; i++) {
                if (nums[i + 1] === nums[i] + 1) consecutivePairs++;
              }

              return (
                <div className="space-y-4">
                  {/* Balls Cluster */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-2">
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest block">Main 5 Balls + Powerball</span>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {nums.map((n, i) => (
                        <div key={i} className="w-9 h-9 rounded-full bg-sky-500/20 border-2 border-sky-400 text-sky-200 font-black text-sm flex items-center justify-center shadow-[0_0_10px_rgba(56,189,248,0.4)]">
                          {n}
                        </div>
                      ))}
                      <span className="text-gray-400 font-bold">+</span>
                      <div className="w-9 h-9 rounded-full bg-red-600 border-2 border-red-400 text-white font-black text-sm flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.6)]" title="Powerball">
                        {selectedDraw.powerball}
                      </div>
                    </div>
                  </div>

                  {/* Mathematical Metrics Grid */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2.5">
                    <span className="text-[9px] font-bold text-sky-400 uppercase tracking-widest block">
                      Macro-State Invariants
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                        <span className="text-[8px] text-gray-500 block uppercase">Ball Sum (5 Balls)</span>
                        <span className="text-base font-black text-white">{sum}</span>
                        <span className={`text-[8px] block mt-0.5 font-bold ${isGaussianBell ? "text-emerald-400" : "text-amber-400"}`}>
                          {isGaussianBell ? "✓ Gaussian Center [60-120]" : "Tail Distribution"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                        <span className="text-[8px] text-gray-500 block uppercase">Odd : Even Ratio</span>
                        <span className="text-base font-black text-cyan-300">{oddsCount}O : {evensCount}E</span>
                        <span className="text-[8px] text-gray-400 block mt-0.5">Parity Balance</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                        <span className="text-[8px] text-gray-500 block uppercase">High : Low Split</span>
                        <span className="text-base font-black text-purple-300">{highsCount}H : {lowsCount}L</span>
                        <span className="text-[8px] text-gray-400 block mt-0.5">Median Split at 17/18</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                        <span className="text-[8px] text-gray-500 block uppercase">Range Spread</span>
                        <span className="text-base font-black text-emerald-300">{spread}</span>
                        <span className="text-[8px] text-gray-400 block mt-0.5">Max ({nums[4]}) - Min ({nums[0]})</span>
                      </div>
                    </div>
                  </div>

                  {/* Jackpots & Multiplier */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-400 uppercase">Jackpot Est.</span>
                      <span className="font-bold text-emerald-400">{selectedDraw.jackpot === "X" ? "Draw Finalized" : selectedDraw.jackpot}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-400 uppercase">Multiplier Ball</span>
                      <span className="font-bold text-amber-300">{selectedDraw.multiplier}</span>
                    </div>
                    {consecutivePairs > 0 && (
                      <div className="flex justify-between items-center text-[10px] text-cyan-400">
                        <span>Consecutive Pairs:</span>
                        <span className="font-bold">{consecutivePairs} pair(s) found</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="border-t border-white/5 bg-slate-950/30 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-gray-400 font-mono">
              Showing draws <span className="text-white font-bold">{Math.min(pagination.total, (pagination.page - 1) * pagination.limit + 1)}</span> to{" "}
              <span className="text-white font-bold">{Math.min(pagination.total, pagination.page * pagination.limit)}</span> of{" "}
              <span className="text-white font-bold">{pagination.total}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="flex items-center gap-1 border border-white/10 rounded-lg p-2 text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="text-xs font-mono text-gray-400">
                Page <span className="text-primary font-bold">{pagination.page}</span> of{" "}
                <span className="text-white font-bold">{pagination.pages}</span>
              </div>
              
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="flex items-center gap-1 border border-white/10 rounded-lg p-2 text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
  );
}
