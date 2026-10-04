"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  X,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  DollarSign,
  Calendar,
  Layers,
  HelpCircle,
  RefreshCw,
  Trophy,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import TicketAutopsyCard from "@/components/TicketAutopsyCard";

interface TicketScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGame?: string;
}

export default function TicketScannerModal({
  isOpen,
  onClose,
  defaultGame = "cashpot"
}: TicketScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [selectedGame, setSelectedGame] = useState<string>(defaultGame);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>("");
  const [drawNumberInput, setDrawNumberInput] = useState<string>("");
  const [betAmount, setBetAmount] = useState<number>(1.0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = "nlcb-ticket-reader";

  // Play celebration audio using Web Audio API
  const playWinChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = "sine";
      const now = audioCtx.currentTime;
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
      
      osc.start(now);
      osc.stop(now + 0.7);
    } catch {
      // Audio not permitted or context not ready
    }
  };

  // Start Html5Qrcode camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerElementId);
      }

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.777778
        },
        (decodedText) => {
          handleScannedData(decodedText);
        },
        (errorMessage) => {
          // Scanner frame error (ignore continuous scan failures)
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      setCameraError(err.message || "Camera access was denied or not available on this device.");
      setIsCameraActive(false);
    }
  };

  // Stop camera
  const stopCamera = async () => {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn("Error stopping scanner:", e);
      }
      setIsCameraActive(false);
    }
  };

  // Handle scanned ticket barcode or QR string
  const handleScannedData = async (rawCode: string) => {
    // Stop camera temporarily upon detection
    await stopCamera();

    // Extract numbers if present in barcode/QR format
    // Common NLCB QR payloads include comma-separated numbers, e.g. "CP:1,4,12,15,19" or "4,12,15,19,20"
    let parsedNums: number[] = [];
    let detectedDrawNum: number | undefined;

    const matches = rawCode.match(/\b\d{1,2}\b/g);
    if (matches && matches.length >= 4) {
      parsedNums = matches.map(Number);
    }

    await verifyTicket(parsedNums, detectedDrawNum, rawCode);
  };

  // Verification request to Turso DB
  const verifyTicket = async (numbers: number[], drawNum?: number, rawText?: string) => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const res = await fetch("/api/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: selectedGame,
          numbers,
          drawNumber: drawNum || (drawNumberInput ? parseInt(drawNumberInput) : undefined),
          betAmount: betAmount || 1.0,
          scannedRaw: rawText
        })
      });

      const data = await res.json();
      setVerificationResult(data);

      if (data.success && data.isWinner) {
        playWinChime();
      }
    } catch (err: any) {
      setVerificationResult({
        success: false,
        error: err.message || "Failed to communicate with verification engine."
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Trigger manual check
  const handleManualVerify = () => {
    if (!manualInput.trim()) return;
    const nums = manualInput
      .replace(/[^0-9,\s-]/g, " ")
      .trim()
      .split(/[\s,-]+/)
      .map(Number)
      .filter(n => !isNaN(n));

    verifyTicket(nums);
  };

  // Lifecycle for camera on modal open/close
  useEffect(() => {
    if (isOpen && activeTab === "camera") {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#0b0f13] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-500/20 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600/30 to-emerald-500/30 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Live Ticket Scanner & Prize Auditor
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 rounded-full">
                  TURSO DB VERIFIED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Point camera at paper barcode or enter ticket numbers to check official payouts
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-3 gap-2">
          <button
            onClick={() => {
              setActiveTab("camera");
              setVerificationResult(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "camera"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Camera Barcode</span>
          </button>
          <button
            onClick={() => {
              stopCamera();
              setActiveTab("manual");
              setVerificationResult(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "manual"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manual Number Input</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Game Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 block">
              Select Game
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { key: "cashpot", name: "Cash Pot" },
                { key: "lotto-plus", name: "Lotto Plus" },
                { key: "win-for-life", name: "Win For Life" },
                { key: "playwhe", name: "Play Whe" },
                { key: "pick4", name: "Pick 4" }
              ].map(g => (
                <button
                  key={g.key}
                  onClick={() => {
                    setSelectedGame(g.key);
                    setVerificationResult(null);
                  }}
                  className={`py-2 px-2 rounded-xl border text-xs font-medium text-center transition-all ${
                    selectedGame === g.key
                      ? "bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                      : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Tab */}
          {activeTab === "camera" && (
            <div className="space-y-4">
              <div className="relative w-full aspect-video rounded-2xl bg-black border border-cyan-500/30 overflow-hidden flex items-center justify-center">
                {/* HTML5 QR Container */}
                <div id={scannerElementId} className="w-full h-full" />

                {/* Cyberpunk Scanner Reticle Overlay */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="relative w-64 h-32 border-2 border-dashed border-cyan-400/70 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                    {/* Targeting Laser Line */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
                    {/* Reticles */}
                    <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-300" />
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-300" />
                    <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-300" />
                    <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-300" />
                  </div>
                  <span className="mt-3 text-[11px] font-mono text-cyan-300/80 bg-black/60 px-3 py-1 rounded-full border border-cyan-500/30">
                    Align ticket barcode or QR code inside box
                  </span>
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-10">
                    <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                    <div className="text-sm font-bold text-white mb-1">Camera Inactive</div>
                    <p className="text-xs text-slate-400 max-w-sm mb-4">{cameraError}</p>
                    <button
                      onClick={() => setActiveTab("manual")}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                    >
                      Switch to Manual Input
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manual Input Tab */}
          {activeTab === "manual" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Ticket Numbers (comma, space, or dash separated)
                </label>
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={
                    selectedGame === "cashpot"
                      ? "e.g. 3, 7, 12, 18, 20"
                      : selectedGame === "lotto-plus"
                      ? "e.g. 5, 14, 21, 28, 33"
                      : selectedGame === "win-for-life"
                      ? "e.g. 2, 8, 11, 16, 22, 27"
                      : selectedGame === "playwhe"
                      ? "e.g. 24"
                      : "e.g. 4, 1, 9, 2"
                  }
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Draw # (optional, checks latest if blank)
                  </label>
                  <input
                    type="number"
                    value={drawNumberInput}
                    onChange={(e) => setDrawNumberInput(e.target.value)}
                    placeholder="e.g. 2410"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                    Bet Amount ($ TTD)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <button
                onClick={handleManualVerify}
                disabled={isVerifying || !manualInput.trim()}
                className={`w-full py-3 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                  isVerifying || !manualInput.trim()
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                }`}
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Querying Turso Cloud Database...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Verify Numbers Against Official Database
                  </>
                )}
              </button>
            </div>
          )}

          {/* Verification Results Panel & Forensic Ticket Autopsy */}
          {verificationResult && (
            <div className="pt-3 border-t border-slate-800 space-y-3 animate-in fade-in duration-300">
              {verificationResult.success ? (
                verificationResult.autopsy ? (
                  <TicketAutopsyCard autopsy={verificationResult.autopsy} />
                ) : verificationResult.isWinner ? (
                  /* WINNER BANNER FALLBACK */
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-teal-950/50 to-slate-900 border border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
                        <div>
                          <div className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-bold">
                            WINNING TICKET VERIFIED!
                          </div>
                          <div className="text-base font-extrabold text-white">
                            {verificationResult.prizeTier}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-emerald-300 font-mono">
                          ${verificationResult.netPayoutTT.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-emerald-400">TTD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* NO PRIZE BANNER FALLBACK */
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
                    <div className="text-slate-400 text-xs font-medium mb-1">
                      No Prize Won for Draw #{verificationResult.drawNumber} ({verificationResult.drawDate})
                    </div>
                    <div className="text-sm font-semibold text-slate-300">
                      Matched {verificationResult.matchCount} numbers
                    </div>
                  </div>
                )
              ) : (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                  {verificationResult.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
