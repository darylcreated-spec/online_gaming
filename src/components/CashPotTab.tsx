"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart2, 
  Calendar, 
  RefreshCw, 
  Cpu, 
  Sparkles, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  Award
} from "lucide-react";
import MultiBallMathPanel from "@/components/MultiBallMathPanel";
import { generateWheel } from "@/lib/wheeling";

interface CashPotDraw {
  id: number;
  draw_number: number;
  draw_date: string;
  num1: number;
  num2: number;
  num3: number;
  num4: number;
  num5: number;
  multiplier: number;
}

export default function CashPotTab() {
  const [activeSubTab, setActiveSubTab] = useState<"math" | "archive" | "wheeling">("math");
  const [draws, setDraws] = useState<CashPotDraw[]>([]);
  const [latestDraw, setLatestDraw] = useState<CashPotDraw | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Archive filters
  const [search, setSearch] = useState("");
  const [numberFilter, setNumberFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDraws, setTotalDraws] = useState(0);

  // Wheeling states
  const [selectedPool, setSelectedPool] = useState<number[]>([1, 2, 3, 5, 7, 9, 12, 15]);
  const [wheelStrategy, setWheelStrategy] = useState<"abbreviated-4-4" | "abbreviated-3-3" | "full">("abbreviated-4-4");
  const [generatedTickets, setGeneratedTickets] = useState<number[][]>([]);

  const fetchDraws = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        search,
        number: numberFilter
      });
      const res = await fetch(`/api/cashpot/draws?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setDraws(data.draws);
        setTotalPages(data.pagination.pages);
        setTotalDraws(data.pagination.total);
        if (!latestDraw && data.draws.length > 0 && page === 1 && !search && !numberFilter) {
          setLatestDraw(data.draws[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching Cash Pot draws:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDraws();
  }, [page, search, numberFilter]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncStatus("Syncing Cash Pot with NLCB...");
      const res = await fetch("/api/cashpot/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncStatus(`Sync Complete! ${data.drawsAdded} new draws added.`);
        fetchDraws();
      } else {
        setSyncStatus(`Sync failed: ${data.error || data.details}`);
      }
    } catch (err: any) {
      setSyncStatus(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const togglePoolNumber = (num: number) => {
    if (selectedPool.includes(num)) {
      if (selectedPool.length > 5) {
        setSelectedPool(selectedPool.filter(n => n !== num));
      }
    } else {
      if (selectedPool.length < 15) {
        setSelectedPool([...selectedPool, num].sort((a, b) => a - b));
      }
    }
  };

  const handleGenerateWheel = () => {
    try {
      const tickets = generateWheel(selectedPool, wheelStrategy, 5);
      setGeneratedTickets(tickets);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950/40 via-neutral-900/60 to-black/80 border border-amber-500/20 p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                5/20
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  NLCB CASHPOT
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                    DAILY 7:00 PM
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Pick 5 from 20 • 15,504 Total Outcomes • Top Prize $100,000 TTD
                </p>
              </div>
            </div>
          </div>

          {/* Sync action */}
          <div className="flex items-center gap-3">
            {syncStatus && (
              <span className="text-xs text-amber-300 font-mono animate-pulse">
                {syncStatus}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-amber-400" : ""}`} />
              {syncing ? "Syncing..." : "Sync Live NLCB"}
            </button>
          </div>
        </div>

        {/* Latest Winning Banner */}
        {latestDraw && (
          <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Draw #{latestDraw.draw_number}</span>
              <span className="text-neutral-600">•</span>
              <span>{latestDraw.draw_date}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mr-1">
                Winning Numbers:
              </span>
              {[latestDraw.num1, latestDraw.num2, latestDraw.num3, latestDraw.num4, latestDraw.num5].map((n, idx) => (
                <span
                  key={idx}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 font-black text-sm flex items-center justify-center shadow-lg shadow-amber-500/20 font-mono"
                >
                  {String(n).padStart(2, "0")}
                </span>
              ))}
              {latestDraw.multiplier > 1 && (
                <span className="ml-2 px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-xs font-mono">
                  {latestDraw.multiplier}X MULTIPLIER
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subtab Navigator */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("math")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "math"
              ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Cpu className="w-4 h-4" />
          MATHEMATICAL ENGINE
        </button>

        <button
          onClick={() => setActiveSubTab("wheeling")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "wheeling"
              ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Layers className="w-4 h-4" />
          SET COVER WHEELING
        </button>

        <button
          onClick={() => setActiveSubTab("archive")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "archive"
              ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Calendar className="w-4 h-4" />
          RESULTS ARCHIVE ({totalDraws})
        </button>
      </div>

      {/* Subtab Content */}
      {activeSubTab === "math" && (
        <MultiBallMathPanel game="cashpot" />
      )}

      {activeSubTab === "wheeling" && (
        <div className="space-y-6">
          <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                64-Bit Bitmask Set Cover Wheeling Generator (5/20 Pool)
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Select between 5 and 15 numbers from the pool of 20 to generate mathematically guaranteed tickets.
              </p>
            </div>

            {/* Ball Selector Grid (1 to 20) */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {Array.from({ length: 20 }, (_, i) => i + 1).map(num => {
                const isSelected = selectedPool.includes(num);
                return (
                  <button
                    key={num}
                    onClick={() => togglePoolNumber(num)}
                    className={`h-11 rounded-xl font-bold font-mono text-sm transition-all border ${
                      isSelected
                        ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/20 scale-105"
                        : "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {String(num).padStart(2, "0")}
                  </button>
                );
              })}
            </div>

            {/* Wheeling Strategy & Generate Button */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-neutral-400">Guarantee Strategy:</span>
                <select
                  value={wheelStrategy}
                  onChange={(e: any) => setWheelStrategy(e.target.value)}
                  className="bg-neutral-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="abbreviated-4-4">4-if-4 Guarantee (Abbreviated)</option>
                  <option value="abbreviated-3-3">3-if-3 Guarantee (Economical)</option>
                  <option value="full">Full Wheel (All Combinations)</option>
                </select>
                <span className="text-xs font-mono text-neutral-400">
                  Pool: {selectedPool.length} Numbers
                </span>
              </div>

              <button
                onClick={handleGenerateWheel}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate Covering Wheel
              </button>
            </div>
          </div>

          {/* Generated Tickets Output */}
          {generatedTickets.length > 0 && (
            <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Generated {generatedTickets.length} Covering Tickets (Total Cost: ${generatedTickets.length * 4} TTD)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {generatedTickets.map((ticket, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 font-mono"
                  >
                    <span className="text-xs text-neutral-500">#{idx + 1}</span>
                    <div className="flex items-center gap-1.5">
                      {ticket.map(n => (
                        <span
                          key={n}
                          className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-500/30"
                        >
                          {String(n).padStart(2, "0")}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "archive" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-neutral-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search Draw # or Date (YYYY-MM-DD)..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 font-mono">Ball:</span>
              <select
                value={numberFilter}
                onChange={e => { setNumberFilter(e.target.value); setPage(1); }}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="">All Balls (1-20)</option>
                {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n.toString()}>Ball {n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-neutral-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-neutral-400 uppercase text-[11px]">
                    <th className="py-3 px-4">Draw #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Winning Balls</th>
                    <th className="py-3 px-4">Multiplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-neutral-500">
                        Loading Cash Pot draws...
                      </td>
                    </tr>
                  ) : draws.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-neutral-500">
                        No draws found matching your search.
                      </td>
                    </tr>
                  ) : (
                    draws.map(d => (
                      <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-bold text-white">#{d.draw_number}</td>
                        <td className="py-3 px-4 text-neutral-400">{d.draw_date}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {[d.num1, d.num2, d.num3, d.num4, d.num5].map((n, i) => (
                              <span
                                key={i}
                                className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center border border-amber-500/30 text-[11px]"
                              >
                                {String(n).padStart(2, "0")}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            d.multiplier > 1
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : "bg-white/5 text-neutral-400"
                          }`}>
                            {d.multiplier}X
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 text-xs text-neutral-400 font-mono">
                <span>Page {page} of {totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
