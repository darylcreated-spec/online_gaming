"use client";

import React, { useState, useEffect } from "react";
import { analyzeDeltas, DeltaAnalysis } from "@/lib/deltas";
import { generateWheel } from "@/lib/wheeling";
import { Sliders, Download, Sparkles, Trash2, Cpu, Eye } from "lucide-react";

interface BuilderTabProps {
  historicalDraws: any[];
}

export default function BuilderTab({ historicalDraws }: { historicalDraws: any[] }) {
  const [selectedNums, setSelectedNums] = useState<number[]>([]);
  const [selectedPb, setSelectedPb] = useState<number | null>(null);
  const [wheelStrategy, setWheelStrategy] = useState<"full" | "abbreviated-4-4" | "abbreviated-3-3">("abbreviated-4-4");
  
  const [deltaAnalysis, setDeltaAnalysis] = useState<DeltaAnalysis | null>(null);
  const [generatedTickets, setGeneratedTickets] = useState<number[][]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  
  // 1. Handle number selection toggle
  const toggleNumber = (num: number) => {
    if (selectedNums.includes(num)) {
      setSelectedNums(selectedNums.filter(n => n !== num));
    } else {
      if (selectedNums.length >= 12) {
        alert("You can select a maximum of 12 numbers for the Wheeling pool.");
        return;
      }
      setSelectedNums([...selectedNums, num].sort((a, b) => a - b));
    }
  };

  // 2. Clear selections
  const handleClear = () => {
    setSelectedNums([]);
    setSelectedPb(null);
    setDeltaAnalysis(null);
    setGeneratedTickets([]);
  };

  // Matrix Quick Pick (1 high-probability combination)
  const handleMatrixQuickPick = async () => {
    try {
      setMatrixLoading(true);
      const res = await fetch("/api/combinations/sample?count=1");
      const data = await res.json();
      if (data.success && data.combinations.length > 0) {
        handleClear();
        setSelectedNums(data.combinations[0]);
        setSelectedPb(Math.floor(Math.random() * 10) + 1);
      }
    } catch (err) {
      console.error("Error sampling matrix pool:", err);
    } finally {
      setMatrixLoading(false);
    }
  };

  // Matrix Slips Generator (Multiple combinations)
  const handleGenerateFromMatrix = async (count: number) => {
    try {
      setMatrixLoading(true);
      const res = await fetch(`/api/combinations/sample?count=${count}`);
      const data = await res.json();
      if (data.success) {
        setGeneratedTickets(data.combinations);
        if (!selectedPb) {
          setSelectedPb(Math.floor(Math.random() * 10) + 1);
        }
      }
    } catch (err) {
      console.error("Error generating from matrix pool:", err);
    } finally {
      setMatrixLoading(false);
    }
  };

  // 3. Quick Pick generator
  const handleQuickPick = (count: number = 5) => {
    handleClear();
    const numbers: number[] = [];
    while (numbers.length < count) {
      const rand = Math.floor(Math.random() * 35) + 1;
      if (!numbers.includes(rand)) {
        numbers.push(rand);
      }
    }
    setSelectedNums(numbers.sort((a, b) => a - b));
    setSelectedPb(Math.floor(Math.random() * 10) + 1);
  };

  // 4. Live Delta Analyzer trigger (when exactly 5 numbers are selected)
  useEffect(() => {
    if (selectedNums.length === 5) {
      try {
        const analysis = analyzeDeltas(selectedNums, historicalDraws);
        setDeltaAnalysis(analysis);
      } catch (err) {
        console.error(err);
      }
    } else {
      setDeltaAnalysis(null);
    }
    // Clear generated tickets if selected numbers count changes
    setGeneratedTickets([]);
  }, [selectedNums, historicalDraws]);

  // 5. Generate wheel tickets
  const handleGenerateWheel = () => {
    if (selectedNums.length < 5) {
      alert("Please select at least 5 numbers to generate tickets.");
      return;
    }
    try {
      const tickets = generateWheel(selectedNums, wheelStrategy);
      setGeneratedTickets(tickets);
    } catch (err: any) {
      alert(err.message || "Failed to generate wheel");
    }
  };

  // 6. Export tickets to TXT file
  const handleExportTxt = () => {
    if (generatedTickets.length === 0) return;
    
    const pbSuffix = selectedPb ? ` [Powerball: ${selectedPb}]` : "";
    const lines = [
      "=============================================",
      "           the Win Concept - Betting Slips ",
      "=============================================",
      `Wheeling Strategy: ${
        wheelStrategy === "full" ? "Full Wheel" : 
        wheelStrategy === "abbreviated-4-4" ? "Abbreviated (4-if-4)" : 
        "Abbreviated (3-if-3)"
      }`,
      `Selected Pool (${selectedNums.length} numbers): ${selectedNums.join(", ")}`,
      selectedPb ? `Selected Powerball: ${selectedPb}` : "No Powerball selected",
      `Total Generated Tickets: ${generatedTickets.length}`,
      "---------------------------------------------",
      ...generatedTickets.map((ticket, idx) => `Ticket ${String(idx + 1).padStart(3, "0")}: ${ticket.map(n => String(n).padStart(2, "0")).join("  ")}${pbSuffix}`),
      "---------------------------------------------",
      `Generated on: ${new Date().toLocaleString()}`,
      "============================================="
    ].join("\n");
    
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `win_concept_slips_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Picks */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Prediction Builder</h2>
          <p className="text-sm text-gray-400">Design optimal betting pools, analyze deltas, and generate wheels</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleQuickPick(5)}
            className="flex items-center gap-1.5 bg-slate-900 border border-white/10 hover:border-primary/50 text-gray-300 hover:text-primary px-3.5 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            QP 5
          </button>
          <button
            onClick={() => handleQuickPick(8)}
            className="flex items-center gap-1.5 bg-slate-900 border border-white/10 hover:border-primary/50 text-gray-300 hover:text-primary px-3.5 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            QP 8 (WHEEL)
          </button>
          <button
            onClick={handleMatrixQuickPick}
            disabled={matrixLoading}
            className="flex items-center gap-1.5 bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 px-3.5 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all disabled:opacity-50"
          >
            <Cpu className="w-3.5 h-3.5" />
            {matrixLoading ? "SAMPLING..." : "MATRIX QP"}
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 bg-slate-950 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/40 text-gray-400 hover:text-rose-400 px-3.5 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            RESET
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* Left Panel: Number Grid Selectors - Span 3 */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Main Numbers Selection Card */}
          <div className="glass-panel p-6 rounded-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-xs">1</span>
                Select Main Numbers
              </h3>
              <p className="text-xs text-gray-400">Pick 5 for single delta analysis, or 7 to 12 for combinatorial wheeling</p>
            </div>
            
            {/* Number Balls Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-7 gap-2.5 max-w-lg">
              {Array.from({ length: 35 }).map((_, idx) => {
                const num = idx + 1;
                const isSelected = selectedNums.includes(num);
                return (
                  <button
                    key={num}
                    onClick={() => toggleNumber(num)}
                    className={`aspect-square rounded-full flex items-center justify-center font-mono font-bold text-sm transition-all border ${
                      isSelected
                        ? "bg-primary border-primary text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
                        : "bg-slate-950 border-white/10 hover:border-primary/50 text-gray-300 hover:text-white"
                    }`}
                  >
                    {String(num).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
            
            <div className="text-xs font-mono text-gray-500 pt-2 flex justify-between">
              <span>Selected Main Numbers: {selectedNums.length}/12</span>
              {selectedNums.length > 0 && (
                <span className="text-primary font-bold">{selectedNums.join(", ")}</span>
              )}
            </div>
          </div>
          
          {/* Powerball Selection Card */}
          <div className="glass-panel p-6 rounded-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-mono text-xs">2</span>
                Select Powerball Number
              </h3>
              <p className="text-xs text-gray-400">Select exactly one Powerball (1 to 10)</p>
            </div>
            
            {/* Powerball Balls Grid */}
            <div className="flex flex-wrap gap-2.5 max-w-md">
              {Array.from({ length: 10 }).map((_, idx) => {
                const num = idx + 1;
                const isSelected = selectedPb === num;
                return (
                  <button
                    key={num}
                    onClick={() => setSelectedPb(isSelected ? null : num)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-sm transition-all border ${
                      isSelected
                        ? "bg-secondary border-secondary text-slate-950 shadow-[0_0_12px_rgba(192,132,252,0.4)]"
                        : "bg-slate-950 border-white/10 hover:border-secondary/50 text-gray-300 hover:text-white"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Analyzers & Wheel Setup - Span 2 */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Number Line (Delta) Analyzer Card */}
          <div className="glass-panel p-6 rounded-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              Number Line (Delta) Analyzer
            </h3>
            
            {deltaAnalysis ? (
              <div className="space-y-4 font-mono">
                {/* Score and Spacing badging */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-lg border border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Distribution Score</span>
                    <div className="text-lg font-bold">
                      <span className={deltaAnalysis.score >= 70 ? "text-green-400" : "text-rose-400"}>
                        {deltaAnalysis.score}/100
                      </span>
                    </div>
                  </div>
                  
                  {/* Delta badges */}
                  <div className="flex gap-1.5">
                    {deltaAnalysis.deltas.map((g, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                          {g}
                        </div>
                        <span className="text-[8px] text-gray-500 mt-1 font-sans">Gap {idx+1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Analysis Advice */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-white/5 text-xs leading-relaxed text-gray-300 font-sans">
                  {deltaAnalysis.advice}
                </div>

                {/* Historical Comparison */}
                <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/5 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-gray-500 text-[10px] font-sans">Consecutive Pair Draw Rate:</span>
                    <div className="font-bold">{deltaAnalysis.historicalComparison.consecutiveRate}%</div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-gray-500 text-[10px] font-sans">Your Consecutive Pairs:</span>
                    <div className="font-bold">{deltaAnalysis.consecutiveCount}</div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-gray-500 text-[10px] font-sans">Avg Hist Min / Max Gaps:</span>
                    <div className="font-bold">
                      {deltaAnalysis.historicalComparison.avgMinGap} / {deltaAnalysis.historicalComparison.avgMaxGap}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-gray-500 text-[10px] font-sans">Your Min / Max Gaps:</span>
                    <div className="font-bold">{deltaAnalysis.minGap} / {deltaAnalysis.maxGap}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-500 font-sans leading-relaxed">
                Select exactly <span className="text-primary font-bold font-mono">5</span> main numbers to run the Delta Spacing Analyzer.
              </div>
            )}
          </div>

          {/* Number Wheel System Card */}
          <div className="glass-panel p-6 rounded-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary" />
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-secondary" />
              Combinatorial Wheeling Engine
            </h3>
            
            {selectedNums.length >= 5 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 font-mono tracking-wider uppercase block">
                    Choose Wheeling Strategy
                  </label>
                  <select
                    value={wheelStrategy}
                    onChange={(e) => setWheelStrategy(e.target.value as any)}
                    className="w-full bg-slate-950 border border-white/10 focus:border-secondary focus:outline-none rounded-lg px-3 py-2 text-sm text-foreground font-mono"
                  >
                    <option value="abbreviated-4-4">Abbreviated "4-if-4" (Optimized Guarantee)</option>
                    <option value="abbreviated-3-3">Abbreviated "3-if-3" (Budget Guarantee)</option>
                    <option value="full">Full Wheel (All combinations)</option>
                  </select>
                </div>
                
                {/* Info Text */}
                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                  {wheelStrategy === "abbreviated-4-4" && 
                    "Abbreviated 4-if-4 generates a subset of tickets ensuring that if 4 of your selected numbers are drawn, you will have at least one ticket matching 4 numbers."}
                  {wheelStrategy === "abbreviated-3-3" && 
                    "Abbreviated 3-if-3 generates a compact subset of tickets ensuring that if 3 of your selected numbers are drawn, you will have at least one ticket matching 3 numbers."}
                  {wheelStrategy === "full" && 
                    "Full Wheel generates all possible 5-number combinations of your pool. Excellent coverage, but generates more tickets."}
                </p>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateWheel}
                  className="w-full py-2.5 bg-secondary text-slate-950 font-bold rounded-lg text-xs font-mono tracking-wider hover:bg-secondary/90 transition-all shadow-[0_0_10px_rgba(192,132,252,0.2)]"
                >
                  GENERATE BETTING SLIPS
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-500 font-sans leading-relaxed">
                Select between <span className="text-secondary font-bold font-mono">5 and 12</span> main numbers to configure the Wheeling Matrix.
              </div>
            )}
          </div>

          {/* Matrix Exclusion Pool Card */}
          <div className="glass-panel p-6 rounded-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500" />
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              High-Probability Matrix Pool
            </h3>
            <p className="text-xs text-gray-400 font-sans leading-relaxed">
              Directly draw random slips from the database containing the 215,766 combinations that have passed all 9 strict mathematical filters (bell-curve, sequence, congruence, and distribution rules).
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleGenerateFromMatrix(5)}
                disabled={matrixLoading}
                className="flex-1 py-2.5 bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 font-bold rounded-lg text-xs font-mono tracking-wider transition-all disabled:opacity-50"
              >
                {matrixLoading ? "SAMPLING..." : "SAMPLE 5 SLIPS"}
              </button>
              <button
                onClick={() => handleGenerateFromMatrix(10)}
                disabled={matrixLoading}
                className="flex-1 py-2.5 bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 font-bold rounded-lg text-xs font-mono tracking-wider transition-all disabled:opacity-50"
              >
                {matrixLoading ? "SAMPLING..." : "SAMPLE 10 SLIPS"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Generated Betting Slips */}
      {generatedTickets.length > 0 && (
        <div className="glass-panel p-6 rounded-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Generated Betting Slips
              </h3>
              <p className="text-xs text-gray-400">
                Created <span className="text-primary font-bold font-mono">{generatedTickets.length}</span> tickets from your pool of {selectedNums.length} numbers
              </p>
            </div>
            <button
              onClick={handleExportTxt}
              className="flex items-center gap-1.5 border border-white/10 hover:border-primary/50 text-gray-400 hover:text-primary px-4 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT SLIPS (.TXT)
            </button>
          </div>

          {/* Ticket Listing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 font-mono text-sm max-h-[400px] overflow-y-auto pr-2">
            {generatedTickets.map((ticket, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 border border-white/5 hover:border-white/10 p-3.5 rounded-lg flex justify-between items-center transition-all"
              >
                <span className="text-xs text-gray-500 font-bold">Slip #{String(idx + 1).padStart(3, "0")}</span>
                <div className="flex gap-1">
                  {ticket.map((num, i) => (
                    <div
                      key={i}
                      className="w-6.5 h-6.5 rounded bg-primary/5 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs"
                    >
                      {num}
                    </div>
                  ))}
                  {selectedPb && (
                    <div className="w-6.5 h-6.5 rounded bg-secondary/5 border border-secondary/20 text-secondary flex items-center justify-center font-bold text-xs">
                      {selectedPb}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
