"use client";

import React, { useState, useRef } from "react";
import Tesseract from "tesseract.js";
import { parseTicketText, checkTicket, CheckResult, parsePlayWheTicketText, checkPlayWheTicket } from "@/lib/checker";
import { CHINAPOO_CHART } from "@/lib/playwhe";
import { Upload, Camera, CheckCircle2, AlertTriangle, RefreshCw, HelpCircle, Sparkles } from "lucide-react";

export default function CheckerTab() {
  // File upload / capture states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("");
  
  // OCR Editable results
  const [ticketDrawNum, setTicketDrawNum] = useState<string>("");
  const [ticketNumbers, setTicketNumbers] = useState<string[]>(["", "", "", "", ""]);
  const [ticketPb, setTicketPb] = useState<string>("");
  const [ticketDate, setTicketDate] = useState<string>("");
  const [ticketTimeSlot, setTicketTimeSlot] = useState<string>("Morning");
  const [playWheSelectedNumber, setPlayWheSelectedNumber] = useState<string>("");
  
  // Checking results
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any | null>(null);
  const [winningDraw, setWinningDraw] = useState<any | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  
  // Manual check fallback (if draw not found in DB)
  const [showManualWinningInput, setShowManualWinningInput] = useState(false);
  const [manualWinningNumbers, setManualWinningNumbers] = useState<string[]>(["", "", "", "", ""]);
  const [manualWinningPb, setManualWinningPb] = useState<string>("");
  const [manualWinningPlayWheNumber, setManualWinningPlayWheNumber] = useState<string>("");
  const [selectedGame, setSelectedGame] = useState<"lotto-plus" | "play-whe">("lotto-plus");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Trigger file selection
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Trigger camera capture
  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  // Process image file
  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      runOcr(file);
    };
    reader.readAsDataURL(file);
  };

  // File selection change
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  };

  // OCR Processing
  const runOcr = async (file: File) => {
    setScanning(true);
    setScanProgress(0);
    setScanStatus("Initializing OCR Engine...");
    setCheckResult(null);
    setWinningDraw(null);
    setCheckError(null);
    setShowManualWinningInput(false);

    try {
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setScanStatus("Analyzing ticket text...");
            setScanProgress(Math.round(m.progress * 100));
          } else {
            setScanStatus(m.status);
          }
        },
      });

      const text = result.data.text;
      console.log("[OCR Text Extracted]:", text);

      if (selectedGame === "play-whe") {
        const parsed = parsePlayWheTicketText(text);
        setTicketDrawNum(parsed.drawNumber ? parsed.drawNumber.toString() : "");
        setTicketDate(parsed.dateStr || "");
        setTicketTimeSlot(parsed.timeSlot || "Morning");
        setPlayWheSelectedNumber(parsed.selectedNumber ? parsed.selectedNumber.toString() : "");
      } else {
        const parsed = parseTicketText(text);
        setTicketDrawNum(parsed.drawNumber ? parsed.drawNumber.toString() : "");
        setTicketPb(parsed.powerball ? parsed.powerball.toString() : "");
        
        const newNums = [...ticketNumbers];
        for (let i = 0; i < 5; i++) {
          newNums[i] = parsed.numbers[i] ? parsed.numbers[i].toString() : "";
        }
        setTicketNumbers(newNums);
      }
      
      setScanStatus("Scan complete!");
    } catch (err: any) {
      console.error(err);
      setScanStatus("Scan failed. You can enter details manually below.");
    } finally {
      setScanning(false);
    }
  };

  // Check Ticket against Database
  const handleCheckTicket = async () => {
    if (selectedGame === "play-whe") {
      const drawNum = parseInt(ticketDrawNum);
      const chosenNum = parseInt(playWheSelectedNumber);
      
      if (isNaN(chosenNum) || chosenNum < 1 || chosenNum > 36) {
        alert("Please enter a valid Play Whe number between 1 and 36.");
        return;
      }

      setChecking(true);
      setCheckError(null);
      setCheckResult(null);
      setWinningDraw(null);

      try {
        let url = "";
        if (!isNaN(drawNum)) {
          url = `/api/playwhe/draws/by-number?number=${drawNum}`;
        } else if (ticketDate && ticketTimeSlot) {
          url = `/api/playwhe/draws/by-number?date=${ticketDate}&timeSlot=${ticketTimeSlot}`;
        } else {
          alert("Please enter a Draw Number or both Draw Date and Time Slot.");
          setChecking(false);
          return;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
          setWinningDraw(data.draw);
          const isWinner = chosenNum === data.draw.winning_number;
          setCheckResult({
            matchedNumbers: isWinner ? [chosenNum] : [],
            pbMatched: false,
            tierName: isWinner ? "Play Whe MATCH" : "No Match",
            prizeEstimate: isWinner ? "$26.00 per $1.00 wagered" : "$0.00",
            isWinner
          });
        } else {
          setCheckError(data.error || "Draw not found.");
          setShowManualWinningInput(true);
        }
      } catch (error: any) {
        setCheckError(error.message || "Failed to connect to database.");
        setShowManualWinningInput(true);
      } finally {
        setChecking(false);
      }
      return;
    }

    // Validate inputs
    const drawNum = parseInt(ticketDrawNum);
    const parsedNums = ticketNumbers.map(n => parseInt(n)).filter(n => !isNaN(n));
    const pb = parseInt(ticketPb);

    if (isNaN(drawNum)) {
      alert("Please enter a valid Draw Number.");
      return;
    }
    if (parsedNums.length < 5 || parsedNums.some(n => n < 1 || n > 35)) {
      alert("Please enter 5 numbers between 1 and 35.");
      return;
    }
    if (isNaN(pb) || pb < 1 || pb > 10) {
      alert("Please enter a Powerball number between 1 and 10.");
      return;
    }

    setChecking(true);
    setCheckError(null);
    setCheckResult(null);
    setWinningDraw(null);

    try {
      const res = await fetch(`/api/draws/by-number?number=${drawNum}`);
      const data = await res.json();

      if (data.success) {
        setWinningDraw(data.draw);
        const winNums = [data.draw.num1, data.draw.num2, data.draw.num3, data.draw.num4, data.draw.num5];
        const resGraded = checkTicket(parsedNums, pb, winNums, data.draw.powerball);
        setCheckResult(resGraded);
      } else {
        setCheckError(data.error || "Draw not found.");
        setShowManualWinningInput(true);
      }
    } catch (error: any) {
      setCheckError(error.message || "Failed to connect to database.");
      setShowManualWinningInput(true);
    } finally {
      setChecking(false);
    }
  };

  // Manual fallback check
  const handleManualCheck = () => {
    if (selectedGame === "play-whe") {
      const chosenNum = parseInt(playWheSelectedNumber);
      const winNum = parseInt(manualWinningPlayWheNumber);

      if (isNaN(chosenNum) || chosenNum < 1 || chosenNum > 36) {
        alert("Please enter a valid Play Whe number between 1 and 36.");
        return;
      }
      if (isNaN(winNum) || winNum < 1 || winNum > 36) {
        alert("Please enter a winning Play Whe number between 1 and 36.");
        return;
      }

      setWinningDraw({
        draw_number: parseInt(ticketDrawNum) || 0,
        draw_date: ticketDate || "Manual Entry",
        draw_time_slot: ticketTimeSlot,
        winning_number: winNum
      });

      const isWinner = chosenNum === winNum;
      setCheckResult({
        matchedNumbers: isWinner ? [chosenNum] : [],
        pbMatched: false,
        tierName: isWinner ? "Play Whe MATCH" : "No Match",
        prizeEstimate: isWinner ? "$26.00 per $1.00 wagered" : "$0.00",
        isWinner
      });
      setCheckError(null);
      return;
    }

    const parsedNums = ticketNumbers.map(n => parseInt(n)).filter(n => !isNaN(n));
    const pb = parseInt(ticketPb);
    const winNums = manualWinningNumbers.map(n => parseInt(n)).filter(n => !isNaN(n));
    const winPb = parseInt(manualWinningPb);

    if (winNums.length < 5 || winNums.some(n => n < 1 || n > 35)) {
      alert("Please enter 5 winning numbers between 1 and 35.");
      return;
    }
    if (isNaN(winPb) || winPb < 1 || winPb > 10) {
      alert("Please enter a winning Powerball number between 1 and 10.");
      return;
    }

    // Mock winning draw structure
    setWinningDraw({
      draw_number: parseInt(ticketDrawNum),
      draw_date: "Manual Entry",
      num1: winNums[0],
      num2: winNums[1],
      num3: winNums[2],
      num4: winNums[3],
      num5: winNums[4],
      powerball: winPb,
      multiplier: "X",
      jackpot: "Manual Check"
    });

    const resGraded = checkTicket(parsedNums, pb, winNums, winPb);
    setCheckResult(resGraded);
    setCheckError(null);
  };

  const handleReset = () => {
    setImageSrc(null);
    setScanProgress(0);
    setScanStatus("");
    setTicketDrawNum("");
    setTicketNumbers(["", "", "", "", ""]);
    setTicketPb("");
    setTicketDate("");
    setTicketTimeSlot("Morning");
    setPlayWheSelectedNumber("");
    setCheckResult(null);
    setWinningDraw(null);
    setCheckError(null);
    setShowManualWinningInput(false);
    setManualWinningNumbers(["", "", "", "", ""]);
    setManualWinningPb("");
    setManualWinningPlayWheNumber("");
  };

  // Helper: check if a number is matching
  const isNumMatched = (num: number) => {
    return checkResult?.matchedNumbers.includes(num) || false;
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Ticket Scanner & Checker</h2>
          <p className="text-sm text-gray-400">
            {selectedGame === "play-whe"
              ? "Scan or photograph your Play Whe receipt to verify wins instantly"
              : "Scan or photograph your lotto ticket to verify wins instantly"}
          </p>
        </div>
      </div>

      {/* Game Selector Dropdown */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold font-mono text-gray-400 uppercase tracking-wider">Select Ticket Game:</span>
          <select
            value={selectedGame}
            onChange={(e) => {
              setSelectedGame(e.target.value as any);
              handleReset(); // Reset OCR state when changing games
            }}
            className="bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3 py-1.5 text-xs text-foreground font-mono transition-all"
          >
            <option value="lotto-plus">Lotto Plus (Active)</option>
            <option value="play-whe">Play Whe (Active)</option>
          </select>
        </div>
        <div className="text-[10px] text-gray-500 font-mono">
          SCANNING PORTAL
        </div>
      </div>

      <>
          {/* Upload/Capture & Preview Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* Upload Container - Span 2 */}
        <div className="xl:col-span-2 space-y-6">
          {!imageSrc ? (
            /* Upload/Capture Dropzone Card */
            <div className="glass-panel rounded-xl p-8 text-center flex flex-col items-center justify-center border-dashed border-white/10 hover:border-primary/30 transition-all min-h-[350px]">
              <div className="w-14 h-14 bg-primary/10 border border-primary/20 text-primary flex items-center justify-center rounded-full mb-4 shadow-[0_0_15px_rgba(56,189,248,0.15)]">
                <Upload className="w-6 h-6" />
              </div>
              
              <h3 className="font-bold text-white mb-2">Scan Your Ticket</h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto mb-6">
                Upload an image or take a photo of your NLCB Lotto Plus ticket to run the OCR extractor.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <button
                  onClick={handleCameraClick}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold font-mono tracking-wider transition-all ${
                    selectedGame === "play-whe"
                      ? "bg-primary text-slate-950 hover:bg-primary/90 shadow-[0_0_10px_rgba(56, 189, 248,0.2)]"
                      : "bg-primary text-slate-950 hover:bg-primary/90 shadow-[0_0_10px_rgba(56,189,248,0.2)]"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  TAKE PHOTO
                </button>
                <button
                  onClick={handleUploadClick}
                  className={`flex-1 flex items-center justify-center gap-2 bg-slate-900 border border-white/10 text-gray-300 hover:text-white px-4 py-2.5 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all ${
                    selectedGame === "play-whe" ? "hover:border-primary/50" : "hover:border-primary/50"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  UPLOAD FILE
                </button>
              </div>

              {/* Hidden Inputs */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                onChange={onFileChange}
                accept="image/*"
                capture="environment"
                className="hidden"
              />
            </div>
          ) : (
            /* Image Preview Card with Scanning Effect */
            <div className="glass-panel rounded-xl p-5 relative overflow-hidden flex flex-col items-center justify-center min-h-[350px]">
              <img
                src={imageSrc}
                alt="Ticket preview"
                className="max-h-[300px] w-auto object-contain rounded-lg border border-white/5"
              />

              {/* Scanning Overlay */}
              {scanning && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center">
                  {/* Glowing Laser Scan Line */}
                  <div 
                    className={`absolute left-0 right-0 h-0.5 animate-[pulse_1.5s_infinite] ${
                      selectedGame === "play-whe" ? "bg-primary shadow-[0_0_12px_#38bdf8]" : "bg-primary shadow-[0_0_12px_#38bdf8]"
                    }`} 
                    style={{
                      animation: "scan-line 2s infinite linear",
                      top: "0%"
                    }}
                  />
                  
                  {/* Progress Indicator */}
                  <div className="space-y-3 font-mono text-xs w-full max-w-[200px]">
                    <div className={`font-bold animate-pulse ${selectedGame === "play-whe" ? "text-primary" : "text-primary"}`}>{scanStatus}</div>
                    <div className="w-full bg-slate-900 border border-white/10 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${selectedGame === "play-whe" ? "bg-primary" : "bg-primary"}`}
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                    <div className="text-gray-400">{scanProgress}%</div>
                  </div>

                  {/* Add CSS for Laser Scan animation inline */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes scan-line {
                      0% { top: 5%; }
                      50% { top: 95%; }
                      100% { top: 5%; }
                    }
                  `}} />
                </div>
              )}

              {/* Options to Rescan */}
              {!scanning && (
                <div className="mt-4 flex gap-2 w-full">
                  <button
                    onClick={handleReset}
                    className={`w-full py-2 bg-slate-950 hover:bg-slate-900 border border-white/10 text-gray-400 hover:text-white rounded-lg text-xs font-mono tracking-wider transition-all ${
                      selectedGame === "play-whe" ? "hover:border-primary/50" : "hover:border-primary/50"
                    }`}
                  >
                    SCAN NEW PHOTO
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Adjust & Validate OCR Inputs - Span 3 */}
        <div className="xl:col-span-3 space-y-6">
          <div className="glass-panel p-6 rounded-xl space-y-5 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${selectedGame === "play-whe" ? "bg-primary" : "bg-primary"}`} />
            
            <div>
              <h3 className="text-base font-bold text-white">Review Extracted Numbers</h3>
              <p className="text-xs text-gray-400">Verify dates and numbers below and correct any parsing typos</p>
            </div>

            {/* Inputs Form */}
            <div className="space-y-4 font-mono">
              {selectedGame === "play-whe" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Draw number input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Draw Number</label>
                      <input
                        type="number"
                        value={ticketDrawNum}
                        onChange={(e) => setTicketDrawNum(e.target.value)}
                        placeholder="e.g. 27178"
                        className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-2 text-sm text-foreground"
                      />
                    </div>
                    {/* Time Slot input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold text-primary">Time Slot</label>
                      <select
                        value={ticketTimeSlot}
                        onChange={(e) => setTicketTimeSlot(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-2 text-sm text-foreground text-primary font-bold"
                      >
                        <option value="Morning">Morning (10:30 AM)</option>
                        <option value="Midday">Midday (1:00 PM)</option>
                        <option value="Afternoon">Afternoon (4:00 PM)</option>
                        <option value="Evening">Evening (7:00 PM)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Date input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Draw Date</label>
                      <input
                        type="text"
                        value={ticketDate}
                        onChange={(e) => setTicketDate(e.target.value)}
                        placeholder="YYYY-MM-DD"
                        className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-2 text-sm text-foreground"
                      />
                    </div>
                    {/* Selected Mark input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold text-primary">Your Mark Number (1-36)</label>
                      <input
                        type="number"
                        min="1"
                        max="36"
                        value={playWheSelectedNumber}
                        onChange={(e) => setPlayWheSelectedNumber(e.target.value)}
                        placeholder="e.g. 29"
                        className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-2 text-sm text-foreground font-bold text-primary"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Draw number input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Draw Number</label>
                      <input
                        type="number"
                        value={ticketDrawNum}
                        onChange={(e) => setTicketDrawNum(e.target.value)}
                        placeholder="e.g. 2537"
                        className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-2 text-sm text-foreground"
                      />
                    </div>
                    {/* Powerball input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold text-primary">Powerball (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={ticketPb}
                        onChange={(e) => setTicketPb(e.target.value)}
                        placeholder="e.g. 4"
                        className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-2 text-sm text-foreground text-primary"
                      />
                    </div>
                  </div>

                  {/* Main numbers inputs */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Ticket Numbers (5 Balls, 1-35)</label>
                    <div className="flex gap-2">
                      {ticketNumbers.map((num, idx) => (
                        <input
                          key={idx}
                          type="number"
                          min="1"
                          max="35"
                          value={num}
                          onChange={(e) => {
                            const newNums = [...ticketNumbers];
                            newNums[idx] = e.target.value;
                            setTicketNumbers(newNums);
                          }}
                          placeholder={`#${idx + 1}`}
                          className="w-full text-center bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg py-2 text-sm text-foreground font-bold"
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Action Trigger */}
              <button
                onClick={handleCheckTicket}
                disabled={scanning || checking}
                className={`w-full flex items-center justify-center gap-2 py-3 font-bold rounded-lg text-xs font-mono tracking-widest transition-all disabled:opacity-50 ${
                  selectedGame === "play-whe"
                    ? "bg-primary text-slate-950 shadow-[0_0_15px_rgba(56, 189, 248,0.25)] hover:bg-primary/90"
                    : "bg-primary text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.25)] hover:bg-primary/90"
                }`}
              >
                {checking ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    CHECKING WITH DATABASE...
                  </>
                ) : (
                  "CHECK TICKET FOR WINS"
                )}
              </button>
            </div>
          </div>

          {/* Manual winning numbers fallback box */}
          {showManualWinningInput && (
            <div className="glass-panel p-6 rounded-xl space-y-4 border border-rose-500/25 relative overflow-hidden bg-rose-500/[0.02]">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
              
              <div className="flex gap-2 items-start">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">Draw #{ticketDrawNum} Not Found</h4>
                  <p className="text-xs text-rose-400/80 leading-relaxed font-sans">
                    This draw record isn't in our local database yet. You can either trigger a sync on the Dashboard, or type the winning numbers below to perform a manual comparison.
                  </p>
                </div>
              </div>

              {/* Input grid for winning numbers */}
              <div className="space-y-4 font-mono border-t border-white/5 pt-3">
                {selectedGame === "play-whe" ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block text-primary">Official Winning Number (1-36)</label>
                    <input
                      type="number"
                      min="1"
                      max="36"
                      value={manualWinningPlayWheNumber}
                      onChange={(e) => setManualWinningPlayWheNumber(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-2 text-sm text-foreground text-primary font-bold"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Winning Numbers */}
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Official Winning Numbers (1-35)</label>
                      <div className="flex gap-2">
                        {manualWinningNumbers.map((num, idx) => (
                          <input
                            key={idx}
                            type="number"
                            min="1"
                            max="35"
                            value={num}
                            onChange={(e) => {
                              const newNums = [...manualWinningNumbers];
                              newNums[idx] = e.target.value;
                              setManualWinningNumbers(newNums);
                            }}
                            placeholder={`#${idx + 1}`}
                            className="w-full text-center bg-slate-950 border border-white/10 focus:border-rose-500 focus:outline-none rounded-lg py-2 text-sm text-foreground font-bold"
                          />
                        ))}
                      </div>
                    </div>
                    {/* Winning Powerball */}
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block text-primary">Official Powerball (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={manualWinningPb}
                        onChange={(e) => setManualWinningPb(e.target.value)}
                        placeholder="e.g. 4"
                        className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-2 text-sm text-foreground text-primary font-bold"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleManualCheck}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-900 border border-rose-500/40 hover:border-rose-500 text-rose-400 rounded-lg text-xs font-mono font-semibold tracking-wider transition-all"
                >
                  PERFORM MANUAL VERIFICATION
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Results Card */}
      {checkResult && winningDraw && (
        <div className="glass-panel p-6 rounded-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-green-500" />
          
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Draw Verification Report
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              Compared against Draw #{winningDraw.draw_number} ({winningDraw.draw_date === "Manual Entry" ? "Manual Entry" : new Date(winningDraw.draw_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })})
            </p>
          </div>

          {/* Balls Comparison Interface */}
          {selectedGame === "play-whe" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-sm">
              {/* Scanned ticket mark */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-3">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Your Ticket Mark</span>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border transition-all ${
                    checkResult.isWinner
                      ? "bg-green-500 border-green-500 text-slate-950 shadow-[0_0_12px_rgba(74,222,128,0.4)]"
                      : "bg-slate-900 border-white/10 text-gray-500"
                  }`}>
                    {playWheSelectedNumber}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase">{CHINAPOO_CHART[parseInt(playWheSelectedNumber)]?.mark || "Unknown"}</div>
                    <div className="text-[10px] text-gray-500">PLAYED VALUE</div>
                  </div>
                </div>
              </div>

              {/* Winning Official mark */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-3">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Official Winning Mark</span>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border transition-all ${
                    checkResult.isWinner
                      ? "bg-green-500 border-green-500 text-slate-950 shadow-[0_0_12px_rgba(74,222,128,0.4)] animate-pulse"
                      : "bg-primary/15 border-primary/30 text-primary"
                  }`}>
                    {winningDraw.winning_number}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase">{CHINAPOO_CHART[winningDraw.winning_number]?.mark || "Unknown"}</div>
                    <div className="text-[10px] text-gray-500">{winningDraw.draw_time_slot.toUpperCase()} DRAW</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-sm">
              {/* Scanned ticket balls */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-3">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Your Ticket Numbers</span>
                <div className="flex gap-2">
                  {ticketNumbers.map(n => parseInt(n)).filter(n => !isNaN(n)).map((num, i) => {
                    const matched = isNumMatched(num);
                    return (
                      <div
                        key={i}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                          matched
                            ? "bg-green-500 border-green-500 text-slate-950 shadow-[0_0_12px_rgba(74,222,128,0.4)]"
                            : "bg-slate-900 border-white/10 text-gray-500"
                        }`}
                      >
                        {num}
                      </div>
                    );
                  })}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                      checkResult.pbMatched
                        ? "bg-primary border-primary text-slate-950 shadow-[0_0_12px_rgba(56, 189, 248,0.4)]"
                        : "bg-slate-900 border-white/10 text-gray-500"
                    }`}
                  >
                    {ticketPb}
                  </div>
                </div>
              </div>

              {/* Winning Official balls */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-3">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Official Winning Numbers</span>
                <div className="flex gap-2">
                  {[winningDraw.num1, winningDraw.num2, winningDraw.num3, winningDraw.num4, winningDraw.num5].map((num, i) => {
                    const matched = isNumMatched(num);
                    return (
                      <div
                        key={i}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                          matched
                            ? "bg-green-500 border-green-500 text-slate-950 shadow-[0_0_12px_rgba(74,222,128,0.4)] animate-pulse"
                            : "bg-primary/10 border-primary/20 text-primary"
                        }`}
                      >
                        {num}
                      </div>
                    );
                  })}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                      checkResult.pbMatched
                        ? "bg-primary border-primary text-slate-950 shadow-[0_0_12px_rgba(56, 189, 248,0.4)]"
                        : "bg-primary/10 border-primary/20 text-primary"
                    }`}
                  >
                    {winningDraw.powerball}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Winner announcement panel */}
          {checkResult.isWinner ? (
            <div className="bg-green-500/10 border border-green-500/25 p-5 rounded-xl text-center space-y-2 pulse-glow-green">
              <h4 className="text-lg font-black text-green-400 tracking-wider uppercase font-mono">
                🎉 WINNING TICKET DETECTED!
              </h4>
              <p className="text-sm text-white font-semibold">
                Match Tier: <span className="text-green-300 font-bold">{checkResult.tierName}</span>
              </p>
              <div className="text-2xl font-black font-mono text-green-400">
                EST. VALUE: {checkResult.prizeEstimate}
              </div>
              <p className="text-[10px] text-gray-400">
                {selectedGame === "play-whe"
                  ? "Play Whe payouts are fixed at 26-to-1 based on official NLCB regulations."
                  : "Lotto Plus payouts are parimutuel and may vary based on actual draw sales and pool sizes."}
              </p>
              
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes pulse-glow-green {
                  0%, 100% { box-shadow: 0 0 10px rgba(74,222,128,0.1); }
                  50% { box-shadow: 0 0 20px rgba(74,222,128,0.3); }
                }
                .pulse-glow-green {
                  animation: pulse-glow-green 2s infinite ease-in-out;
                }
              `}} />
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-white/5 p-5 rounded-xl text-center">
              <h4 className="text-sm font-bold text-gray-400 uppercase font-mono tracking-wider">
                No winning combinations found
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {selectedGame === "play-whe"
                  ? "Your mark did not match the official winning number. Try interpreting companion gaps!"
                  : `You matched ${checkResult.matchedNumbers.length} numbers. Keep playing and analyze deltas to build better pools!`}
              </p>
            </div>
          )}
        </div>
      )}
        </>
    </div>
  );
}
