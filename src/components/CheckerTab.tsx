"use client";

import React, { useState, useRef, useEffect } from "react";
import Tesseract from "tesseract.js";
import { parseTicketText, checkTicket, CheckResult, parsePlayWheTicketText, checkPlayWheTicket, parseWinForLifeTicketText, checkWinForLifeTicket, parseMultiPlays } from "@/lib/checker";
import { CHINAPOO_CHART } from "@/lib/playwhe";
import { Upload, Camera, CheckCircle2, AlertTriangle, RefreshCw, HelpCircle, Zap } from "lucide-react";

export default function CheckerTab() {
  // File upload / capture states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("");
  
  // OCR Editable results
  const [ticketDrawNum, setTicketDrawNum] = useState<string>("");
  const [ticketNumbers, setTicketNumbers] = useState<string[]>(["", "", "", "", "", ""]);
  const [ticketPb, setTicketPb] = useState<string>("");
  const [ticketDate, setTicketDate] = useState<string>("");
  const [ticketTimeSlot, setTicketTimeSlot] = useState<string>("Morning");
  const [playWheSelectedNumber, setPlayWheSelectedNumber] = useState<string>("");
  
  // Multi-play states
  const [multiPlays, setMultiPlays] = useState<Array<{ label: string; numbers: string[]; pb: string }>>([]);
  const [checkResults, setCheckResults] = useState<Array<{ label: string; numbers: string[]; pb: string; grade: any }>>([]);

  // Checking results
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any | null>(null);
  const [winningDraw, setWinningDraw] = useState<any | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  
  // Manual check fallback (if draw not found in DB)
  const [showManualWinningInput, setShowManualWinningInput] = useState(false);
  const [manualWinningNumbers, setManualWinningNumbers] = useState<string[]>(["", "", "", "", "", ""]);
  const [manualWinningPb, setManualWinningPb] = useState<string>("");
  const [manualWinningPlayWheNumber, setManualWinningPlayWheNumber] = useState<string>("");
  const [selectedGame, setSelectedGame] = useState<"lotto-plus" | "play-whe" | "win-for-life">("lotto-plus");

  // In-App Video Scanner States
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleTorch = async () => {
    if (!activeStream) return;
    try {
      const track = activeStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities?.torch) {
        await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(!torchOn);
      }
    } catch (e) {
      console.warn('Torch not supported:', e);
    }
  };

  useEffect(() => {
    if (activeStream && videoRef.current) {
      videoRef.current.srcObject = activeStream;
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeStream, showScannerModal]);

  const startCamera = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera access is not supported on this browser or secure context is missing (HTTPS or localhost). Please enter numbers manually.");
      return;
    }
    try {
      setShowScannerModal(true);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch (fallbackErr) {
        console.warn("Failed to get environment camera, falling back to default webcam:", fallbackErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }
      setActiveStream(stream);
      let isFront = false;
      try {
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        if (settings.facingMode === 'user') {
          isFront = true;
        }
      } catch (e) {
        // Default to not front if unable to determine
      }
      setIsFrontCamera(isFront);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      alert("Could not access camera: " + err.message);
      setShowScannerModal(false);
    }
  };

  const stopCamera = () => {
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
      setActiveStream(null);
    }
    setShowScannerModal(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      if (isFrontCamera) {
        // Draw frame flipped back (since video is mirror preview for user convenience)
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      if (isFrontCamera) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "ticket.jpg", { type: "image/jpeg" });
          setImageSrc(URL.createObjectURL(blob));
          runOcr(file);
        }
      }, "image/jpeg");
    }
    
    stopCamera();
  };

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
    setCheckResults([]);
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

      // Auto-detect game type from slip headers
      const textLower = text.toLowerCase();
      let gameType: "lotto-plus" | "play-whe" | "win-for-life" = selectedGame;
      if (textLower.includes("win for life") || textLower.includes("win-for-life") || (textLower.includes("win") && textLower.includes("life"))) {
        gameType = "win-for-life";
      } else if (textLower.includes("play whe") || textLower.includes("play-whe") || (textLower.includes("play") && textLower.includes("whe"))) {
        gameType = "play-whe";
      } else if (textLower.includes("lotto plus") || textLower.includes("lotto-plus") || (textLower.includes("lotto") && textLower.includes("plus"))) {
        gameType = "lotto-plus";
      }
      setSelectedGame(gameType);

      // Parse Draw Number and Date
      let drawNumberStr = "";
      let dateStr = "";
      let timeSlotStr = "Morning";

      const lines = text.split("\n");
      for (const line of lines) {
        const drawMatch = line.match(/(?:draw|draw\s*#)\s*(\d{2,6})/i);
        if (drawMatch) {
          drawNumberStr = drawMatch[1];
          break;
        }
      }

      for (const line of lines) {
        const dateMatch = line.match(/(\d{1,2})-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-\d{2,4}/i);
        if (dateMatch) {
          dateStr = dateMatch[0];
          break;
        }
        const isoMatch = line.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
          dateStr = isoMatch[0];
          break;
        }
      }

      if (gameType === "play-whe") {
        for (const line of lines) {
          const cleanLine = line.toLowerCase();
          if (cleanLine.includes("morning") || cleanLine.includes("morn") || cleanLine.includes("10:30")) {
            timeSlotStr = "Morning";
            break;
          } else if (cleanLine.includes("midday") || cleanLine.includes("mid") || cleanLine.includes("1:00")) {
            timeSlotStr = "Midday";
            break;
          } else if (cleanLine.includes("afternoon") || cleanLine.includes("aft") || cleanLine.includes("4:00")) {
            timeSlotStr = "Afternoon";
            break;
          } else if (cleanLine.includes("evening") || cleanLine.includes("eve") || cleanLine.includes("7:00")) {
            timeSlotStr = "Evening";
            break;
          }
        }
      }

      setTicketDrawNum(drawNumberStr);
      setTicketDate(dateStr);
      setTicketTimeSlot(timeSlotStr);

      // Parse multiple plays
      const parsedPlays = parseMultiPlays(text, gameType);
      if (parsedPlays.length > 0) {
        const mappedPlays = parsedPlays.map(p => ({
          label: p.label,
          numbers: p.numbers.map(n => n.toString()),
          pb: p.pb ? p.pb.toString() : ""
        }));
        setMultiPlays(mappedPlays);

        // Populate primary inputs from Play A
        const firstPlay = parsedPlays[0];
        if (gameType === "play-whe") {
          setPlayWheSelectedNumber(firstPlay.numbers[0] ? firstPlay.numbers[0].toString() : "");
        } else if (gameType === "win-for-life") {
          setTicketPb(firstPlay.pb ? firstPlay.pb.toString() : "");
          const newNums = ["", "", "", "", "", ""];
          for (let i = 0; i < 6; i++) {
            newNums[i] = firstPlay.numbers[i] ? firstPlay.numbers[i].toString() : "";
          }
          setTicketNumbers(newNums);
        } else {
          setTicketPb(firstPlay.pb ? firstPlay.pb.toString() : "");
          const newNums = ["", "", "", "", "", ""];
          for (let i = 0; i < 5; i++) {
            newNums[i] = firstPlay.numbers[i] ? firstPlay.numbers[i].toString() : "";
          }
          setTicketNumbers(newNums);
        }
      } else {
        setMultiPlays([]);
        if (gameType === "play-whe") {
          const parsed = parsePlayWheTicketText(text);
          setPlayWheSelectedNumber(parsed.selectedNumber ? parsed.selectedNumber.toString() : "");
        } else if (gameType === "win-for-life") {
          const parsed = parseWinForLifeTicketText(text);
          setTicketPb(parsed.cashBall ? parsed.cashBall.toString() : "");
          const newNums = ["", "", "", "", "", ""];
          for (let i = 0; i < 6; i++) {
            newNums[i] = parsed.numbers[i] ? parsed.numbers[i].toString() : "";
          }
          setTicketNumbers(newNums);
        } else {
          const parsed = parseTicketText(text);
          setTicketPb(parsed.powerball ? parsed.powerball.toString() : "");
          const newNums = ["", "", "", "", "", ""];
          for (let i = 0; i < 5; i++) {
            newNums[i] = parsed.numbers[i] ? parsed.numbers[i].toString() : "";
          }
          setTicketNumbers(newNums);
        }
      }

      setScanStatus("Scan complete!");
    } catch (err: any) {
      console.error(err);
      setScanStatus("Scan failed. You can enter details manually below.");
    } finally {
      setScanning(false);
    }
  };

  const handleCheckTicket = async () => {
    const drawNum = parseInt(ticketDrawNum);
    if (isNaN(drawNum)) {
      alert("Please enter a valid Draw Number.");
      return;
    }

    setChecking(true);
    setCheckError(null);
    setCheckResult(null);
    setCheckResults([]);
    setWinningDraw(null);

    try {
      let url = "";
      if (selectedGame === "play-whe") {
        if (ticketDate && ticketTimeSlot) {
          url = `/api/playwhe/draws/by-number?date=${ticketDate}&timeSlot=${ticketTimeSlot}`;
        } else {
          url = `/api/playwhe/draws/by-number?number=${drawNum}`;
        }
      } else if (selectedGame === "win-for-life") {
        url = `/api/winforlife/draws?page=1&limit=1&search=${drawNum}`;
      } else {
        url = `/api/draws/by-number?number=${drawNum}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      let draw: any = null;
      if (selectedGame === "win-for-life") {
        if (data.success && data.draws && data.draws.length > 0) {
          draw = data.draws[0];
        }
      } else {
        if (data.success) {
          draw = data.draw;
        }
      }

      if (!draw) {
        setCheckError("Draw not found.");
        setShowManualWinningInput(true);
        setChecking(false);
        return;
      }

      setWinningDraw(draw);

      if (multiPlays.length > 0) {
        const gradedPlays = multiPlays.map(play => {
          const nums = play.numbers.map(n => parseInt(n)).filter(n => !isNaN(n));
          const pb = parseInt(play.pb);

          let grade: any = null;
          if (selectedGame === "play-whe") {
            const isWinner = nums[0] === draw.winning_number;
            grade = {
              matchedNumbers: isWinner ? [nums[0]] : [],
              pbMatched: false,
              tierName: isWinner ? "Play Whe MATCH" : "No Match",
              prizeEstimate: isWinner ? "$26.00 per $1.00 wagered" : "$0.00",
              isWinner
            };
          } else if (selectedGame === "win-for-life") {
            grade = checkWinForLifeTicket(nums, pb, [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5, draw.num6], draw.cash_ball);
          } else {
            grade = checkTicket(nums, pb, [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5], draw.powerball);
          }

          return {
            label: play.label,
            numbers: play.numbers,
            pb: play.pb,
            grade
          };
        });

        setCheckResults(gradedPlays);

        const winningPlays = gradedPlays.filter(p => p.grade.isWinner);
        if (winningPlays.length > 0) {
          setCheckResult(winningPlays[0].grade);
        } else {
          setCheckResult(gradedPlays[0].grade);
        }
      } else {
        let resGraded: any = null;
        if (selectedGame === "play-whe") {
          const chosenNum = parseInt(playWheSelectedNumber);
          const isWinner = chosenNum === draw.winning_number;
          resGraded = {
            matchedNumbers: isWinner ? [chosenNum] : [],
            pbMatched: false,
            tierName: isWinner ? "Play Whe MATCH" : "No Match",
            prizeEstimate: isWinner ? "$26.00 per $1.00 wagered" : "$0.00",
            isWinner
          };
        } else if (selectedGame === "win-for-life") {
          const parsedNums = ticketNumbers.slice(0, 6).map(n => parseInt(n)).filter(n => !isNaN(n));
          const cb = parseInt(ticketPb);
          resGraded = checkWinForLifeTicket(parsedNums, cb, [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5, draw.num6], draw.cash_ball);
        } else {
          const parsedNums = ticketNumbers.slice(0, 5).map(n => parseInt(n)).filter(n => !isNaN(n));
          const pb = parseInt(ticketPb);
          resGraded = checkTicket(parsedNums, pb, [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5], draw.powerball);
        }

        setCheckResult(resGraded);
        setCheckResults([{
          label: "Play A",
          numbers: selectedGame === "play-whe" ? [playWheSelectedNumber] : ticketNumbers,
          pb: ticketPb,
          grade: resGraded
        }]);
      }
    } catch (error: any) {
      setCheckError(error.message || "Failed to connect to database.");
      setShowManualWinningInput(true);
    } finally {
      setChecking(false);
    }
  };

  const handleManualCheck = () => {
    let draw: any = null;
    if (selectedGame === "play-whe") {
      const winNum = parseInt(manualWinningPlayWheNumber);
      if (isNaN(winNum) || winNum < 1 || winNum > 36) {
        alert("Please enter a winning Play Whe number between 1 and 36.");
        return;
      }
      draw = {
        draw_number: parseInt(ticketDrawNum) || 0,
        draw_date: ticketDate || "Manual Entry",
        draw_time_slot: ticketTimeSlot,
        winning_number: winNum
      };
    } else if (selectedGame === "win-for-life") {
      const winNums = manualWinningNumbers.slice(0, 6).map(n => parseInt(n)).filter(n => !isNaN(n));
      const winCb = parseInt(manualWinningPb);
      if (winNums.length < 6 || winNums.some(n => n < 1 || n > 28)) {
        alert("Please enter 6 winning numbers between 1 and 28.");
        return;
      }
      if (isNaN(winCb) || winCb < 1 || winCb > 3) {
        alert("Please enter a winning Cash Ball number between 1 and 3.");
        return;
      }
      draw = {
        draw_number: parseInt(ticketDrawNum) || 0,
        draw_date: "Manual Entry",
        num1: winNums[0],
        num2: winNums[1],
        num3: winNums[2],
        num4: winNums[3],
        num5: winNums[4],
        num6: winNums[5],
        cash_ball: winCb,
        jackpot: "Manual Check"
      };
    } else {
      const winNums = manualWinningNumbers.slice(0, 5).map(n => parseInt(n)).filter(n => !isNaN(n));
      const winPb = parseInt(manualWinningPb);
      if (winNums.length < 5 || winNums.some(n => n < 1 || n > 35)) {
        alert("Please enter 5 winning numbers between 1 and 35.");
        return;
      }
      if (isNaN(winPb) || winPb < 1 || winPb > 10) {
        alert("Please enter a winning Powerball number between 1 and 10.");
        return;
      }
      draw = {
        draw_number: parseInt(ticketDrawNum) || 0,
        draw_date: "Manual Entry",
        num1: winNums[0],
        num2: winNums[1],
        num3: winNums[2],
        num4: winNums[3],
        num5: winNums[4],
        powerball: winPb,
        multiplier: "X",
        jackpot: "Manual Check"
      };
    }

    setWinningDraw(draw);

    if (multiPlays.length > 0) {
      const gradedPlays = multiPlays.map(play => {
        const nums = play.numbers.map(n => parseInt(n)).filter(n => !isNaN(n));
        const pb = parseInt(play.pb);

        let grade: any = null;
        if (selectedGame === "play-whe") {
          const isWinner = nums[0] === draw.winning_number;
          grade = {
            matchedNumbers: isWinner ? [nums[0]] : [],
            pbMatched: false,
            tierName: isWinner ? "Play Whe MATCH" : "No Match",
            prizeEstimate: isWinner ? "$26.00 per $1.00 wagered" : "$0.00",
            isWinner
          };
        } else if (selectedGame === "win-for-life") {
          grade = checkWinForLifeTicket(nums, pb, [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5, draw.num6], draw.cash_ball);
        } else {
          grade = checkTicket(nums, pb, [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5], draw.powerball);
        }

        return {
          label: play.label,
          numbers: play.numbers,
          pb: play.pb,
          grade
        };
      });

      setCheckResults(gradedPlays);

      const winningPlays = gradedPlays.filter(p => p.grade.isWinner);
      if (winningPlays.length > 0) {
        setCheckResult(winningPlays[0].grade);
      } else {
        setCheckResult(gradedPlays[0].grade);
      }
    } else {
      let resGraded: any = null;
      if (selectedGame === "play-whe") {
        const chosenNum = parseInt(playWheSelectedNumber);
        const isWinner = chosenNum === draw.winning_number;
        resGraded = {
          matchedNumbers: isWinner ? [chosenNum] : [],
          pbMatched: false,
          tierName: isWinner ? "Play Whe MATCH" : "No Match",
          prizeEstimate: isWinner ? "$26.00 per $1.00 wagered" : "$0.00",
          isWinner
        };
      } else if (selectedGame === "win-for-life") {
        const parsedNums = ticketNumbers.slice(0, 6).map(n => parseInt(n)).filter(n => !isNaN(n));
        const cb = parseInt(ticketPb);
        resGraded = checkWinForLifeTicket(parsedNums, cb, [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5, draw.num6], draw.cash_ball);
      } else {
        const parsedNums = ticketNumbers.slice(0, 5).map(n => parseInt(n)).filter(n => !isNaN(n));
        const pb = parseInt(ticketPb);
        resGraded = checkTicket(parsedNums, pb, [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5], draw.powerball);
      }

      setCheckResult(resGraded);
      setCheckResults([{
        label: "Play A",
        numbers: selectedGame === "play-whe" ? [playWheSelectedNumber] : ticketNumbers,
        pb: ticketPb,
        grade: resGraded
      }]);
    }
    setCheckError(null);
  };

  const handleReset = () => {
    setImageSrc(null);
    setScanProgress(0);
    setScanStatus("");
    setTicketDrawNum("");
    setTicketNumbers(["", "", "", "", "", ""]);
    setTicketPb("");
    setTicketDate("");
    setTicketTimeSlot("Morning");
    setPlayWheSelectedNumber("");
    setCheckResult(null);
    setCheckResults([]);
    setMultiPlays([]);
    setWinningDraw(null);
    setCheckError(null);
    setShowManualWinningInput(false);
    setManualWinningNumbers(["", "", "", "", "", ""]);
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
            <option value="win-for-life">Win for Life (Active)</option>
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
                  onClick={startCamera}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold font-mono tracking-wider transition-all ${
                    selectedGame === "play-whe"
                      ? "bg-primary text-slate-950 hover:bg-primary/90 shadow-[0_0_10px_rgba(56,189,248,0.2)]"
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
              {/* Universal Draw Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Draw Number</label>
                  <input
                    type="number"
                    value={ticketDrawNum}
                    onChange={(e) => setTicketDrawNum(e.target.value)}
                    placeholder={selectedGame === "win-for-life" ? "e.g. 447" : selectedGame === "play-whe" ? "e.g. 27178" : "e.g. 2537"}
                    className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-2 text-sm text-foreground"
                  />
                </div>
                {selectedGame === "play-whe" ? (
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
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Draw Date (Optional)</label>
                    <input
                      type="text"
                      value={ticketDate}
                      onChange={(e) => setTicketDate(e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-2 text-sm text-foreground"
                    />
                  </div>
                )}
              </div>

              {/* Plays Workspace */}
              {multiPlays.length > 0 ? (
                <div className="space-y-4 border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold">Multiple Plays Detected ({multiPlays.length})</span>
                    <button
                      onClick={() => {
                        const nextLabel = String.fromCharCode(65 + multiPlays.length);
                        const defaultCount = selectedGame === "win-for-life" ? 6 : selectedGame === "play-whe" ? 1 : 5;
                        setMultiPlays([
                          ...multiPlays,
                          {
                            label: nextLabel,
                            numbers: Array(defaultCount).fill(""),
                            pb: ""
                          }
                        ]);
                      }}
                      className="text-xs text-primary hover:text-primary/80 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      + ADD PLAY
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 divide-y divide-white/5">
                    {multiPlays.map((play, playIdx) => (
                      <div key={playIdx} className="pt-3 first:pt-0 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-primary font-sans">Play {play.label}</span>
                          <button
                            onClick={() => {
                              const updated = multiPlays.filter((_, idx) => idx !== playIdx);
                              setMultiPlays(updated);
                            }}
                            className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                          >
                            REMOVE
                          </button>
                        </div>

                        {selectedGame === "play-whe" ? (
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-500 uppercase">Mark Number (1-36)</label>
                            <input
                              type="number"
                              min="1"
                              max="36"
                              value={play.numbers[0] || ""}
                              onChange={(e) => {
                                const updated = [...multiPlays];
                                updated[playIdx].numbers = [e.target.value];
                                setMultiPlays(updated);
                              }}
                              placeholder="e.g. 29"
                              className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-1.5 text-xs text-foreground font-bold text-primary"
                            />
                          </div>
                        ) : (
                          <div className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                              <label className="text-[10px] text-gray-500 uppercase">Numbers</label>
                              <div className="flex gap-1.5">
                                {play.numbers.map((num, numIdx) => (
                                  <input
                                    key={numIdx}
                                    type="number"
                                    min="1"
                                    max={selectedGame === "win-for-life" ? 28 : 35}
                                    value={num}
                                    onChange={(e) => {
                                      const updated = [...multiPlays];
                                      updated[playIdx].numbers[numIdx] = e.target.value;
                                      setMultiPlays(updated);
                                    }}
                                    placeholder={`#${numIdx + 1}`}
                                    className="w-full text-center bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg py-1.5 text-xs text-foreground font-bold"
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="w-16 space-y-1">
                              <label className="text-[10px] text-gray-500 uppercase">
                                {selectedGame === "win-for-life" ? "CB" : "PB"}
                              </label>
                              <input
                                type="number"
                                min="1"
                                max={selectedGame === "win-for-life" ? 3 : 10}
                                value={play.pb}
                                onChange={(e) => {
                                  const updated = [...multiPlays];
                                  updated[playIdx].pb = e.target.value;
                                  setMultiPlays(updated);
                                }}
                                placeholder={selectedGame === "win-for-life" ? "CB" : "PB"}
                                className="w-full text-center bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg py-1.5 text-xs text-foreground font-bold text-primary"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold">Single Play Review</span>
                    <button
                      onClick={() => {
                        const count = selectedGame === "win-for-life" ? 6 : selectedGame === "play-whe" ? 1 : 5;
                        setMultiPlays([
                          {
                            label: "A",
                            numbers: selectedGame === "play-whe" ? [playWheSelectedNumber] : [...ticketNumbers.slice(0, count)],
                            pb: ticketPb
                          }
                        ]);
                      }}
                      className="text-[10px] text-primary hover:text-primary/80 font-bold"
                    >
                      SWITCH TO MULTI-PLAY
                    </button>
                  </div>

                  {selectedGame === "play-whe" ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 col-span-2">
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
                  ) : selectedGame === "win-for-life" ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold text-primary">Cash Ball (1-3)</label>
                        <input
                          type="number"
                          min="1"
                          max="3"
                          value={ticketPb}
                          onChange={(e) => setTicketPb(e.target.value)}
                          placeholder="e.g. 2"
                          className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-2 text-sm text-foreground text-primary font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Ticket Numbers (6 Balls, 1-28)</label>
                        <div className="flex gap-2">
                          {ticketNumbers.slice(0, 6).map((num, idx) => (
                            <input
                              key={idx}
                              type="number"
                              min="1"
                              max="28"
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
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold text-primary">Powerball (1-10)</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={ticketPb}
                          onChange={(e) => setTicketPb(e.target.value)}
                          placeholder="e.g. 4"
                          className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-2 text-sm text-foreground text-primary font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Ticket Numbers (5 Balls, 1-35)</label>
                        <div className="flex gap-2">
                          {ticketNumbers.slice(0, 5).map((num, idx) => (
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
                </div>
              )}

              <button
                onClick={handleCheckTicket}
                disabled={scanning || checking}
                className="w-full flex items-center justify-center gap-2 py-3 font-bold rounded-lg text-xs font-mono tracking-widest transition-all disabled:opacity-50 bg-primary text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.25)] hover:bg-primary/90"
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
                    This draw record isn't in our local database yet. You can either trigger a sync on the Settings page, or type the winning numbers below to perform a manual comparison.
                  </p>
                </div>
              </div>

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
                ) : selectedGame === "win-for-life" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Official Winning Numbers (6 Balls, 1-28)</label>
                      <div className="flex gap-2">
                        {manualWinningNumbers.slice(0, 6).map((num, idx) => (
                          <input
                            key={idx}
                            type="number"
                            min="1"
                            max="28"
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
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block text-primary">Official Cash Ball (1-3)</label>
                      <input
                        type="number"
                        min="1"
                        max="3"
                        value={manualWinningPb}
                        onChange={(e) => setManualWinningPb(e.target.value)}
                        placeholder="e.g. 2"
                        className="w-full bg-slate-950 border border-white/10 focus:border-primary focus:outline-none rounded-lg px-3.5 py-2 text-sm text-foreground text-primary font-bold"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block">Official Winning Numbers (5 Balls, 1-35)</label>
                      <div className="flex gap-2">
                        {manualWinningNumbers.slice(0, 5).map((num, idx) => (
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
          
          <div className="border-b border-white/5 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Draw Verification Report
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                Compared against Draw #{winningDraw.draw_number} ({winningDraw.draw_date === "Manual Entry" ? "Manual Entry" : new Date(winningDraw.draw_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })})
              </p>
            </div>

            {selectedGame !== "play-whe" && (
              <div className="bg-slate-950/80 px-4 py-2 rounded-lg border border-white/5 font-mono text-left md:text-right shrink-0">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Official Winning Numbers</span>
                <div className="flex gap-1.5">
                  {selectedGame === "win-for-life" ? (
                    <>
                      {[winningDraw.num1, winningDraw.num2, winningDraw.num3, winningDraw.num4, winningDraw.num5, winningDraw.num6].map((num, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                          {num}
                        </div>
                      ))}
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                        {winningDraw.cash_ball}
                      </div>
                    </>
                  ) : (
                    <>
                      {[winningDraw.num1, winningDraw.num2, winningDraw.num3, winningDraw.num4, winningDraw.num5].map((num, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                          {num}
                        </div>
                      ))}
                      <div className="w-6 h-6 rounded-full bg-primary/30 border border-primary/50 text-white flex items-center justify-center font-bold text-[10px]">
                        {winningDraw.powerball}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results list mapping all plays */}
          <div className="space-y-4">
            {checkResults.map((resultItem, idx) => {
              const grade = resultItem.grade;
              const isWinner = grade.isWinner;
              const parsedNums = resultItem.numbers.map(n => parseInt(n)).filter(n => !isNaN(n));
              
              return (
                <div key={idx} className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-3 font-mono">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Play {resultItem.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      isWinner ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-slate-900 text-gray-500 border border-white/5"
                    }`}>
                      {grade.tierName}
                    </span>
                  </div>

                  {selectedGame === "play-whe" ? (
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
                          isWinner ? "bg-green-500 border-green-500 text-slate-950" : "bg-slate-900 border-white/10 text-gray-500"
                        }`}>
                          {resultItem.numbers[0]}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white uppercase">{CHINAPOO_CHART[parseInt(resultItem.numbers[0])]?.mark || "Unknown"}</span>
                          <span className="text-[10px] text-gray-500 block">PLAYED VALUE</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs text-gray-400 block">Winning Mark: {winningDraw.winning_number} ({CHINAPOO_CHART[winningDraw.winning_number]?.mark})</span>
                        <span className={`text-xs font-bold ${isWinner ? "text-green-400" : "text-gray-500"}`}>
                          Payout: {grade.prizeEstimate}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-3">
                      <div className="flex gap-1.5 items-center">
                        {parsedNums.map((num, i) => {
                          const matched = grade.matchedNumbers.includes(num);
                          return (
                            <div
                              key={i}
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border ${
                                matched
                                  ? "bg-green-500 border-green-500 text-slate-950 shadow-[0_0_8px_rgba(74,222,128,0.3)]"
                                  : "bg-slate-900 border-white/10 text-gray-500"
                              }`}
                            >
                              {num}
                            </div>
                          );
                        })}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border ${
                            grade.pbMatched
                              ? selectedGame === "win-for-life"
                                ? "bg-emerald-500 border-emerald-555 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                : "bg-primary border-primary text-slate-950 shadow-[0_0_8px_rgba(56,189,248,0.3)]"
                              : "bg-slate-900 border-white/10 text-gray-505"
                          }`}
                        >
                          {resultItem.pb}
                        </div>
                      </div>

                      <div className="text-left lg:text-right font-mono text-xs">
                        {isWinner ? (
                          <span className="text-green-400 font-extrabold block">Est. Payout: {grade.prizeEstimate}</span>
                        ) : (
                          <span className="text-gray-500 block">No Match</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Overall winner announcement banner */}
          {checkResult.isWinner ? (
            <div className="bg-green-500/10 border border-green-500/25 p-5 rounded-xl text-center space-y-2 pulse-glow-green">
              <h4 className="text-lg font-black text-green-400 tracking-wider uppercase font-mono">
                🎉 WINNING TICKET DETECTED!
              </h4>
              <p className="text-[10px] text-gray-400 mt-1">
                {selectedGame === "play-whe"
                  ? "Play Whe payouts are fixed at 26-to-1 based on official NLCB regulations."
                  : selectedGame === "win-for-life"
                  ? "Win for Life payouts include lump sums or ongoing monthly distributions depending on top tier hit."
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
                  : selectedGame === "win-for-life"
                  ? `None of your plays matched. Review statistical pools!`
                  : `None of your plays matched. Keep playing and analyze deltas to build better pools!`}
              </p>
            </div>
          )}
        </div>
      )}
      </>

      {/* CAMERA SCANNER MODAL */}
      {showScannerModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-950/95 z-[999] flex flex-col justify-between p-6 font-mono">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ticket Scanner Camera</h3>
              <p className="text-[10px] text-gray-500">Align ticket inside the frame box</p>
            </div>
            <button
              onClick={stopCamera}
              className="text-gray-400 hover:text-white text-xs font-extrabold border border-white/10 px-2.5 py-1 rounded cursor-pointer"
            >
              CLOSE
            </button>
          </div>

          {/* Video Preview with Corner framing guide */}
          <div className="relative flex-1 my-6 rounded-xl overflow-hidden border border-white/5 bg-black flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className={`w-full h-full object-cover transform ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
            />
            {/* Viewfinder overlay */}
            <div className="viewfinder-overlay">
              <div className="viewfinder-corner top-left" />
              <div className="viewfinder-corner top-right" />
              <div className="viewfinder-corner bottom-left" />
              <div className="viewfinder-corner bottom-right" />
            </div>
          </div>

          {/* Shutter Button Controls */}
          <div className="flex flex-row items-center justify-center gap-6 pb-6">
            <button
              onClick={toggleTorch}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${torchOn ? 'bg-primary border-primary text-slate-950' : 'bg-slate-800 border-white/10 text-white hover:bg-slate-700'}`}
            >
              <Zap className="w-5 h-5" />
            </button>
            <button
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full border-4 border-white bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center cursor-pointer transition shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <div className="w-10 h-10 rounded-full bg-white" />
            </button>
            <div className="w-12" /> {/* Spacer for centering */}
          </div>
        </div>
      )}
    </div>
  );
}
