"use client";

import React, { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Hash } from "lucide-react";

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

      {/* Paginated Draws List */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/50 text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                <th className="py-4 px-6">Draw #</th>
                <th className="py-4 px-6">Draw Date</th>
                <th className="py-4 px-6 text-center">Winning Numbers</th>
                <th className="py-4 px-6 text-center">Powerball</th>
                <th className="py-4 px-6 text-center">Multiplier</th>
                <th className="py-4 px-6 text-right">Jackpot</th>
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
                  const numbers = [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5];
                  return (
                    <tr key={draw.id} className="hover:bg-white/[0.01] transition-all">
                      <td className="py-4 px-6 font-bold text-white">#{draw.draw_number}</td>
                      <td className="py-4 px-6 text-gray-400">
                        {new Date(draw.draw_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          timeZone: 'UTC'
                        })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center gap-1.5">
                          {numbers.map((num, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 rounded-full bg-primary/10 border border-primary/40 text-primary flex items-center justify-center font-bold text-xs"
                            >
                              {num}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center">
                          <div className="w-7 h-7 rounded-full bg-secondary/10 border border-secondary/40 text-secondary flex items-center justify-center font-bold text-xs shadow-[0_0_8px_rgba(192,132,252,0.15)]">
                            {draw.powerball}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center">
                          <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-xs text-gray-400">
                            {draw.multiplier}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-primary">
                        {draw.jackpot === "X" ? "-" : draw.jackpot}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
    </div>
  );
}
