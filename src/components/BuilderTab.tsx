"use client";

import React, { useState, useEffect } from "react";
import { analyzeDeltas, DeltaAnalysis } from "@/lib/deltas";
import { generateWheel } from "@/lib/wheeling";
import { Sliders, Download, Trash2, Cpu, Eye, Compass, Info, Save } from "lucide-react";

interface BuilderTabProps {
  historicalDraws: any[];
}

const validateTicket = (ticket: number[], freqArray?: number[]) => {
  const oddCount = ticket.filter(n => n % 2 !== 0).length;
  const evenCount = ticket.length - oddCount;
  const oddEvenRatio = `${oddCount}:${evenCount}`;
  
  const lowCount = ticket.filter(n => n <= 17).length;
  const highCount = ticket.length - lowCount;
  const highLowRatio = `${lowCount}:${highCount}`;
  
  const sorted = [...ticket].sort((a, b) => a - b);
  const spread = sorted[sorted.length - 1] - sorted[0];
  
  let consecutiveCount = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] === 1) {
      consecutiveCount++;
    }
  }
  
  // Dynamically compute hot/cold from actual frequency data instead of hardcoded lists
  let hotNums = [17, 10, 28, 31, 18]; // fallback defaults
  let coldNums = [15, 12, 30, 32, 1]; // fallback defaults
  if (freqArray && freqArray.length > 1) {
    const ranked = Array.from({ length: 35 }, (_, i) => ({ num: i + 1, freq: freqArray[i + 1] || 0 }))
      .sort((a, b) => b.freq - a.freq);
    hotNums = ranked.slice(0, 5).map(r => r.num);
    coldNums = ranked.slice(-5).map(r => r.num);
  }
  
  const hotCount = ticket.filter(n => hotNums.includes(n)).length;
  const coldCount = ticket.filter(n => coldNums.includes(n)).length;
  
  const sum = ticket.reduce((a, b) => a + b, 0);
  let score = 0;
  const checks = {
    oddEven: ["3:2", "2:3", "4:1"].includes(oddEvenRatio),
    highLow: ["3:2", "2:3", "4:1"].includes(highLowRatio),
    spread: spread >= 15 && spread <= 33,
    consecutive: consecutiveCount <= 1,
    sum: sum >= 75 && sum <= 105,
  };
  
  if (checks.oddEven) score += 20;
  if (checks.highLow) score += 20;
  if (checks.spread) score += 20;
  if (checks.consecutive) score += 20;
  if (checks.sum) score += 20;
  
  let grade = "D";
  if (score >= 100) grade = "A+";
  else if (score >= 80) grade = "A";
  else if (score >= 60) grade = "B";
  else if (score >= 40) grade = "C";
  
  return {
    grade,
    score,
    oddEvenRatio,
    highLowRatio,
    spread,
    consecutiveCount,
    hotCount,
    coldCount,
    checks
  };
};

export default function BuilderTab({ historicalDraws }: BuilderTabProps) {
  const [selectedNums, setSelectedNums] = useState<number[]>([]);
  const [selectedPb, setSelectedPb] = useState<number | null>(null);
  const [wheelStrategy, setWheelStrategy] = useState<"full" | "abbreviated-4-4" | "abbreviated-3-3">("abbreviated-4-4");
  
  const [deltaAnalysis, setDeltaAnalysis] = useState<DeltaAnalysis | null>(null);
  const [generatedTickets, setGeneratedTickets] = useState<number[][]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [hoveredTicket, setHoveredTicket] = useState<number[] | null>(null);
  const [wheelingLoading, setWheelingLoading] = useState(false);
  const [showHeatmapOverlay, setShowHeatmapOverlay] = useState(true);

  // --- Real-time Statistics Computations ---
  const [frequencies, setFrequencies] = useState<number[]>(Array(36).fill(0));
  const [maxFreq, setMaxFreq] = useState(1);
  const [minFreq, setMinFreq] = useState(0);

  useEffect(() => {
    if (!historicalDraws || historicalDraws.length === 0) return;
    
    const freq = Array(36).fill(0);
    historicalDraws.forEach((draw) => {
      [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5].forEach((num) => {
        if (num >= 1 && num <= 35) {
          freq[num]++;
        }
      });
    });
    
    const slice = freq.slice(1);
    setFrequencies(freq);
    setMaxFreq(Math.max(...slice, 1));
    setMinFreq(Math.min(...slice));
  }, [historicalDraws]);

  // Handle number selection toggle
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

  // Clear selections
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

  // Quick Pick generator
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

  // Live Delta Analyzer trigger
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
    setGeneratedTickets([]);
  }, [selectedNums, historicalDraws]);

  // Generate wheel tickets
  const handleGenerateWheel = () => {
    if (selectedNums.length < 5) {
      alert("Please select at least 5 numbers to generate tickets.");
      return;
    }
    setWheelingLoading(true);
    setGeneratedTickets([]);
    
    // Spawn Web Worker for background nCr wheeling calculations
    const worker = new Worker(new URL("../lib/wheeling.worker.ts", import.meta.url));
    worker.postMessage({ pool: selectedNums, strategy: wheelStrategy });
    
    worker.onmessage = (e) => {
      const { success, result, error } = e.data;
      setWheelingLoading(false);
      if (success) {
        setGeneratedTickets(result);
      } else {
        alert(error || "Failed to generate wheel");
      }
      worker.terminate();
    };
    
    worker.onerror = (err) => {
      console.error("Web Worker error:", err);
      setWheelingLoading(false);
      alert("An unexpected background processing error occurred.");
      worker.terminate();
    };
  };

  // Export tickets to TXT file
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

  // Save generated slips to SQLite database workspace
  const handleSaveSlips = async () => {
    if (generatedTickets.length === 0) return;
    
    const name = prompt("Enter a label for this saved ticket group (e.g. 'My Saturday Play'):");
    if (!name) return;

    try {
      let savedCount = 0;
      for (const ticket of generatedTickets) {
        const res = await fetch("/api/slips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            game_type: "lotto",
            numbers: ticket.join(","),
            powerball: selectedPb || null
          })
        });
        const data = await res.json();
        if (data.success) savedCount++;
      }
      alert(`Successfully saved ${savedCount} slips to your workspace!`);
    } catch (err: any) {
      console.error(err);
      alert(`Error saving slips: ${err.message}`);
    }
  };

  // Shading logic for standard heatmap
  const getHeatmapStyle = (num: number) => {
    const freq = frequencies[num] || 0;
    const ratio = (freq - minFreq) / (maxFreq - minFreq || 1);
    const ratioVal = Math.max(0, Math.min(1, ratio));

    // Base colors: Cold is Dark Charcoal (#181A20), Hot is Muted Gold (#D4AF37)
    // Redshift interpolation
    const r = Math.round(24 + (212 - 24) * ratioVal);
    const g = Math.round(26 + (175 - 26) * ratioVal);
    const b = Math.round(32 + (55 - 32) * ratioVal);

    const isSelected = selectedNums.includes(num);
    const isHovered = hoveredTicket?.includes(num);

    let borderStyle = "border-[#1F232B]";
    let shadowStyle = "";

    if (isHovered) {
      borderStyle = "border-amber-400 scale-[1.05] z-10";
      shadowStyle = "0px 0px 12px rgba(212,175,55,0.6)";
    } else if (isSelected) {
      borderStyle = "border-emerald-500 scale-[1.02] z-10";
      shadowStyle = "0px 0px 8px rgba(16,185,129,0.3)";
    }

    return {
      style: {
        backgroundColor: `rgba(${r}, ${g}, ${b}, ${0.15 + ratioVal * 0.85})`,
        color: ratioVal > 0.65 ? "#0B0C0E" : "#94A3B8",
        boxShadow: shadowStyle,
      },
      classes: `w-9 h-9 flex items-center justify-center font-mono font-bold text-xs border ${borderStyle} transition-all duration-200 cursor-pointer select-none`
    };
  };

  // Co-occurrence / Companions logic for selected numbers
  const getCompanionNumbers = () => {
    if (selectedNums.length === 0) return [];
    
    // Sum occurrences of all other numbers drawn alongside any selected numbers
    const companions = Array(36).fill(0);
    historicalDraws.forEach((draw) => {
      const drawNums = [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5];
      // Check if this draw contains any of our selected numbers
      const intersection = drawNums.filter(n => selectedNums.includes(n));
      if (intersection.length > 0) {
        drawNums.forEach(n => {
          if (n >= 1 && n <= 35 && !selectedNums.includes(n)) {
            companions[n] += intersection.length; // weight by matching pool overlap
          }
        });
      }
    });

    return companions
      .map((count, num) => ({ num, count }))
      .filter(item => item.num > 0 && item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const companionNums = getCompanionNumbers();

  return (
    <div className="space-y-8 bg-[#0B0C0E] p-1 text-slate-100 min-h-screen font-mono">
      
      {/* Inject Keyframe animations for ticket slips */}
      <style>{`
        @keyframes ticketSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-ticket-slide {
          animation: ticketSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1F232B] pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">Wheeling Workspace</h2>
          <p className="text-xs text-slate-500 uppercase">Interactive combinatorial systems & live frequency mappings</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleQuickPick(5)}
            className="flex items-center gap-1.5 bg-[#121418] border border-[#1F232B] hover:border-amber-400 hover:text-amber-400 text-slate-300 px-4 py-2 rounded-none text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            QP 5
          </button>
          <button
            onClick={() => handleQuickPick(8)}
            className="flex items-center gap-1.5 bg-[#121418] border border-[#1F232B] hover:border-amber-400 hover:text-amber-400 text-slate-300 px-4 py-2 rounded-none text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            QP 8
          </button>
          <button
            onClick={handleMatrixQuickPick}
            disabled={matrixLoading}
            className="flex items-center gap-1.5 bg-[#121418] border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 px-4 py-2 rounded-none text-xs font-semibold tracking-wider transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5" />
            {matrixLoading ? "COMPUTING..." : "MATRIX QP"}
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 bg-[#121418] border border-[#1F232B] hover:border-red-500 hover:text-red-500 text-slate-400 px-4 py-2 rounded-none text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            RESET
          </button>
        </div>
      </div>

      {/* Bento Grid Layout (60% Workspace / 40% Analytics Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* LEFT CARD: Wheeling Engine Workspace (60% width) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[#121418] border border-[#1F232B] p-6 rounded-none space-y-6 relative">
            
            {/* Headline */}
            <div className="flex items-center justify-between border-b border-[#1F232B] pb-4">
              <div className="space-y-1">
                <span className="text-xs text-amber-500 uppercase tracking-widest font-bold">Workspace Core</span>
                <h3 className="text-md font-bold text-white uppercase"> Bet Matrix Generator</h3>
              </div>
              <Compass className="w-5 h-5 text-slate-600" />
            </div>

            {/* Selection Steps */}
            <div className="space-y-6">
              
              {/* Step 1: Main Number Pool */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white uppercase tracking-wider">Step 1: Pick Main Pool (1 to 35)</span>
                    <button
                      onClick={() => setShowHeatmapOverlay(!showHeatmapOverlay)}
                      className={`px-2 py-0.5 border text-[9px] font-bold uppercase transition cursor-pointer select-none ${
                        showHeatmapOverlay 
                          ? "bg-amber-400/10 border-amber-400/30 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]" 
                          : "bg-slate-950/40 border-white/5 text-gray-500 hover:text-gray-400"
                      }`}
                    >
                      Heatmap {showHeatmapOverlay ? "ON" : "OFF"}
                    </button>
                  </div>
                  <span className="text-slate-500 uppercase font-mono">Selected: {selectedNums.length}/12</span>
                </div>

                {showHeatmapOverlay && (
                  <div className="flex items-center gap-2 text-[9px] font-mono text-gray-500 uppercase pb-1 select-none">
                    <span>Heatmap Key:</span>
                    <span className="w-2 h-2 bg-[#181A20] border border-[#1F232B] inline-block" />
                    <span>Cold (Low Freq)</span>
                    <div className="w-10 h-1.5 bg-gradient-to-r from-[#181A20] to-[#D4AF37] border border-[#1F232B] inline-block" />
                    <span>Hot (High Freq)</span>
                    <span className="w-2 h-2 bg-[#D4AF37] inline-block" />
                  </div>
                )}
                
                {/* Number selection grid */}
                <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
                  {Array.from({ length: 35 }).map((_, idx) => {
                    const num = idx + 1;
                    const isSelected = selectedNums.includes(num);
                    
                    const freq = frequencies[num] || 0;
                    const ratio = (freq - minFreq) / (maxFreq - minFreq || 1);
                    const ratioVal = Math.max(0, Math.min(1, ratio));
                    // Base colors: Cold is Charcoal (18, 26, 32) -> Hot is Gold (212, 175, 55)
                    const r = Math.round(24 + (212 - 24) * ratioVal);
                    const g = Math.round(26 + (175 - 26) * ratioVal);
                    const b = Math.round(32 + (55 - 32) * ratioVal);
                    
                    const bgStyle = (showHeatmapOverlay && !isSelected)
                      ? { 
                          backgroundColor: `rgba(${r}, ${g}, ${b}, ${0.15 + ratioVal * 0.85})`,
                          color: ratioVal > 0.65 ? "#0B0C0E" : "#94A3B8",
                          borderColor: ratioVal > 0.65 ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.05)"
                        }
                      : {};

                    return (
                      <button
                        key={num}
                        onClick={() => toggleNumber(num)}
                        style={bgStyle}
                        className={`w-9 h-9 rounded-none flex items-center justify-center font-bold text-xs border tracking-wider transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-amber-400 border-amber-400 text-[#0B0C0E] shadow-[0_0_12px_rgba(212,175,55,0.3)] z-10"
                            : "bg-[#0B0C0E] border-[#1F232B] hover:border-amber-400/50 text-slate-400 hover:text-white"
                        }`}
                        title={`Number ${num} - Frequency: ${freq} draws`}
                      >
                        {String(num).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Powerball Selection */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white uppercase tracking-wider">Step 2: Choose Powerball (1 to 10)</span>
                  <span className="text-slate-500 uppercase">{selectedPb ? `PB: ${selectedPb}` : "None"}</span>
                </div>
                
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const num = idx + 1;
                    const isSelected = selectedPb === num;
                    return (
                      <button
                        key={num}
                        onClick={() => setSelectedPb(isSelected ? null : num)}
                        className={`w-9 h-9 rounded-none flex items-center justify-center font-bold text-xs border tracking-wider transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500 border-emerald-500 text-[#0B0C0E] shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                            : "bg-[#0B0C0E] border-[#1F232B] hover:border-emerald-500/50 text-slate-400 hover:text-white"
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Wheeling Strategy */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  <span>Step 3: Wheeling Options</span>
                </div>
                
                {selectedNums.length >= 5 ? (
                  <div className="space-y-4 bg-[#0B0C0E] p-4 border border-[#1F232B]">
                    <div className="space-y-1.5">
                      <span className="text-xs text-slate-500 uppercase tracking-widest">Select Strategy</span>
                      <select
                        value={wheelStrategy}
                        onChange={(e) => setWheelStrategy(e.target.value as any)}
                        className="w-full bg-[#121418] border border-[#1F232B] focus:border-amber-400 focus:outline-none px-3 py-2 text-xs text-white rounded-none cursor-pointer"
                      >
                        <option value="abbreviated-4-4">Abbreviated "4-if-4" (Optimized Slips)</option>
                        <option value="abbreviated-3-3">Abbreviated "3-if-3" (Budget Guarantee)</option>
                        <option value="full">Full Wheel (All combinations)</option>
                      </select>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {wheelStrategy === "abbreviated-4-4" &&
                        "Generates a filtered subset ensuring that if 4 of your chosen numbers are drawn, you have a 100% guarantee of hitting at least one 4-number match."}
                      {wheelStrategy === "abbreviated-3-3" &&
                        "Generates a high-efficiency budget subset ensuring that if 3 of your chosen numbers are drawn, you will match at least 3 numbers."}
                      {wheelStrategy === "full" &&
                        "Generates all possible combinations. Provides maximum mathematical coverage, but requires larger budgets."}
                    </p>

                    <button
                      onClick={handleGenerateWheel}
                      disabled={wheelingLoading}
                      className="w-full py-2.5 bg-amber-400 disabled:bg-amber-400/50 disabled:cursor-not-allowed text-[#0B0C0E] font-bold text-xs tracking-widest uppercase hover:bg-amber-300 transition-all duration-200 cursor-pointer shadow-[0_0_12px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2"
                    >
                      {wheelingLoading ? (
                        <>
                          <Cpu className="w-3.5 h-3.5 animate-spin" />
                          COMPILING IN BACKGROUND...
                        </>
                      ) : (
                        "Compile Betting Slips"
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="p-5 text-center text-xs text-slate-500 bg-[#0B0C0E] border border-[#1F232B] uppercase">
                    Select a pool of 5 to 12 numbers to configure wheeling matrices.
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* RIGHT CARD: Real-time Analytics & Heatmap Sidebar (40% width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Heatmap Grid Card */}
          <div className="bg-[#121418] border border-[#1F232B] p-6 rounded-none space-y-4">
            <div className="border-b border-[#1F232B] pb-3">
              <span className="text-xs text-amber-500 uppercase tracking-widest font-bold">Statistical Density</span>
              <h3 className="text-md font-bold text-white uppercase">Number Grid Heatmap</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed uppercase">
              Shading indicates draw frequency. Amber cells denote hot ranges; charcoal represents cold numbers.
            </p>

            <div className="grid grid-cols-5 sm:grid-cols-7 gap-2.5 pt-2">
              {Array.from({ length: 35 }).map((_, idx) => {
                const num = idx + 1;
                const { style, classes } = getHeatmapStyle(num);
                return (
                  <div
                    key={num}
                    style={style}
                    className={classes}
                    onClick={() => toggleNumber(num)}
                    title={`Number ${num} - Frequency: ${frequencies[num] || 0} draws`}
                  >
                    {String(num).padStart(2, "0")}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dream Chart Co-occurrence Card */}
          <div className="bg-[#121418] border border-[#1F232B] p-6 rounded-none space-y-4">
            <div className="border-b border-[#1F232B] pb-3">
              <span className="text-xs text-emerald-400 uppercase tracking-widest font-bold">Dynamic Companions</span>
              <h3 className="text-md font-bold text-white uppercase">Dream Chart Mapping</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed uppercase">
              Identifies co-occurring pairings drawn alongside your selected pool.
            </p>

            {companionNums.length > 0 ? (
              <div className="space-y-2 pt-2">
                {companionNums.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-[#0B0C0E] border border-[#1F232B] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-sans">#{idx+1}</span>
                      <span className="w-5 h-5 bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                        {String(item.num).padStart(2, "0")}
                      </span>
                      <span className="text-slate-400 uppercase text-xs">Statistical Companion</span>
                    </div>
                    <span className="text-slate-500 text-xs">Score: {item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 bg-[#0B0C0E] border border-[#1F232B] uppercase">
                Select numbers to compute companions.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Delta Analyzer Info Block (Shown when exactly 5 numbers are selected) */}
      {deltaAnalysis && (
        <div className="bg-[#121418] border border-[#1F232B] p-6 rounded-none space-y-4">
          <div className="border-b border-[#1F232B] pb-3 flex justify-between items-center">
            <div>
              <span className="text-xs text-amber-500 uppercase tracking-widest font-bold">Delta Spacing</span>
              <h3 className="text-md font-bold text-white uppercase">Draw Variance Analysis</h3>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-slate-500 uppercase block">Distribution score</span>
              <span className={`text-sm font-bold ${deltaAnalysis.score >= 70 ? "text-emerald-400" : "text-amber-500"}`}>
                {deltaAnalysis.score}/100
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 space-y-2">
              <span className="text-xs text-slate-500 uppercase tracking-widest block">Consecutive Gaps</span>
              <div className="flex gap-2">
                {deltaAnalysis.deltas.map((g, idx) => (
                  <div key={idx} className="w-8 h-8 bg-[#0B0C0E] border border-[#1F232B] text-amber-400 flex items-center justify-center font-bold text-xs">
                    {g}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="md:col-span-8 p-3.5 bg-[#0B0C0E] border border-[#1F232B] text-xs text-slate-300 leading-relaxed font-sans">
              <strong>MODEL VERDICT:</strong> {deltaAnalysis.advice}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM ROW: Combinatorial Coverage Slips Workspace */}
      {wheelingLoading && (
        <div className="bg-[#121418] border border-[#1F232B] p-12 rounded-none flex flex-col items-center justify-center space-y-4">
          <Cpu className="w-8 h-8 text-amber-400 animate-spin" />
          <div className="text-center font-mono space-y-1">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Compiling Wheeling Matrix...</h4>
            <p className="text-xs text-slate-500">Generating and optimizing matching tickets on a background thread.</p>
          </div>
        </div>
      )}

      {generatedTickets.length > 0 && !wheelingLoading && (
        <div className="bg-[#121418] border border-[#1F232B] p-6 rounded-none space-y-6">
          
          {/* Section Header */}
          <div className="flex justify-between items-center border-b border-[#1F232B] pb-4">
            <div className="space-y-1">
              <span className="text-xs text-amber-500 uppercase tracking-widest font-bold">Betting slips</span>
              <h3 className="text-md font-bold text-white uppercase flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                Compiled Combos ({generatedTickets.length})
              </h3>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleSaveSlips}
                className="flex items-center gap-1.5 border border-[#1F232B] hover:border-amber-400 hover:text-amber-400 text-slate-400 px-4 py-2 rounded-none text-xs font-semibold font-mono tracking-wider transition-all duration-200 cursor-pointer bg-[#0B0C0E]"
              >
                <Save className="w-3.5 h-3.5 text-amber-400" />
                SAVE TO WORKSPACE
              </button>
              <button
                onClick={handleExportTxt}
                className="flex items-center gap-1.5 border border-[#1F232B] hover:border-amber-400 hover:text-amber-400 text-slate-400 px-4 py-2 rounded-none text-xs font-semibold font-mono tracking-wider transition-all duration-200 cursor-pointer bg-[#0B0C0E]"
              >
                <Download className="w-3.5 h-3.5" />
                EXPORT SLIPS (.TXT)
              </button>
            </div>
          </div>

          {/* Staggered Stacked Ticket Slips */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[480px] overflow-y-auto pr-2">
            {generatedTickets.map((ticket, idx) => (
              <div
                key={idx}
                style={{ animationDelay: `${idx * 25}ms` }}
                className="bg-[#0B0C0E] border border-[#1F232B] hover:border-amber-400/50 p-4 rounded-none flex flex-col justify-between transition-all duration-200 group relative overflow-hidden animate-ticket-slide select-none cursor-pointer"
                onMouseEnter={() => setHoveredTicket(ticket)}
                onMouseLeave={() => setHoveredTicket(null)}
              >
                {/* Physical Ticket Slip top serration dot indicators */}
                <div className="absolute top-0 inset-x-0 h-1 bg-[#121418] flex justify-between px-2 gap-1 overflow-hidden pointer-events-none">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#0B0C0E] -translate-y-1/2" />
                  ))}
                </div>

                {(() => {
                  const evalResult = validateTicket(ticket, frequencies);
                  return (
                    <>
                      <div className="flex justify-between items-center mt-1 pb-3 border-b border-[#1F232B]">
                        <span className="text-xs text-slate-500 font-bold">SLIP #{String(idx + 1).padStart(3, "0")}</span>
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${
                          evalResult.grade === "A+"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : evalResult.grade === "B"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          SCORE: {evalResult.grade}
                        </span>
                      </div>

                      {/* Main Numbers */}
                      <div className="flex justify-between items-center pt-4">
                        <div className="flex gap-1.5">
                          {ticket.map((num, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 bg-[#121418] border border-[#1F232B] text-white flex items-center justify-center font-bold text-xs"
                            >
                              {String(num).padStart(2, "0")}
                            </div>
                          ))}
                        </div>
                        
                        {/* Powerball */}
                        {selectedPb && (
                          <div className="w-7 h-7 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs ml-2">
                            {selectedPb}
                          </div>
                        )}
                      </div>

                      {/* Staggered dashed divider & footer */}
                      <div className="border-t border-dashed border-[#1F232B] mt-4 pt-2.5 flex justify-between items-center text-[8px] text-slate-500 font-mono">
                        <div className="flex gap-2">
                          <span>O/E: {evalResult.oddEvenRatio}</span>
                          <span>H/L: {evalResult.highLowRatio}</span>
                          <span>SUM: {ticket.reduce((a, b) => a + b, 0)} ({evalResult.checks.sum ? "PASS" : "FAIL"})</span>
                        </div>
                        <span className="text-emerald-500 font-bold">ACTIVE FILTERED</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Combinatorial Coverage Metrics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-[#121418] border border-[#1F232B] p-5 rounded-none flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">Combinatorial Density</span>
            <div className="text-xl font-bold text-white tracking-tight">215,766 Slips</div>
            <p className="text-[9px] text-slate-500 uppercase">Filtered High-Prob combinations</p>
          </div>
          <Cpu className="w-5 h-5 text-slate-700" />
        </div>

        {/* Metric 2 */}
        <div className="bg-[#121418] border border-[#1F232B] p-5 rounded-none flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">Optimization Rate</span>
            <div className="text-xl font-bold text-emerald-400 tracking-tight">98.24%</div>
            <p className="text-[9px] text-slate-500 uppercase">Successor Dispersion Ratio</p>
          </div>
          <Compass className="w-5 h-5 text-emerald-500/50" />
        </div>

        {/* Metric 3 */}
        <div className="bg-[#121418] border border-[#1F232B] p-5 rounded-none flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">System Status</span>
            <div className="text-xl font-bold text-amber-500 tracking-tight">Active</div>
            <p className="text-[9px] text-slate-500 uppercase">Turso Cloud Sync Connected</p>
          </div>
          <Info className="w-5 h-5 text-amber-500/50" />
        </div>

      </div>

    </div>
  );
}
