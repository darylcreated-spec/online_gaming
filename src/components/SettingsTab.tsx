"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Database, Terminal, CheckCircle2, AlertTriangle, Play, HelpCircle, Bell } from "lucide-react";

export default function SettingsTab() {
  const [lottoStats, setLottoStats] = useState<any>(null);
  const [playWheStats, setPlayWheStats] = useState<any>(null);
  const [winForLifeStats, setWinForLifeStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  const [syncingGame, setSyncingGame] = useState<"lotto" | "playwhe" | "winforlife" | null>(null);
  const [syncType, setSyncType] = useState<"recent" | "full" | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);
  const [activeStep, setActiveStep] = useState<string>("");
  const [settingsTab, setSettingsTab] = useState<"sync" | "install" | "notifications">("sync");
  const [notificationPermission, setNotificationPermission] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === "granted") {
        new Notification("The Win Concept", {
          body: "Local PWA notifications enabled! You will now receive draw alerts.",
          icon: "/pwa-192x192.png"
        });
      }
    }
  };

  const fetchDBStatus = async () => {
    setLoadingStats(true);
    try {
      // 1. Fetch Lotto Plus stats
      const lottoRes = await fetch("/api/stats?timeframe=all");
      const lottoData = await lottoRes.json();
      
      // 2. Fetch Play Whe stats
      const pwRes = await fetch("/api/playwhe/stats?limit=1");
      const pwData = await pwRes.json();
      
      // 3. Fetch Win for Life stats
      const wflRes = await fetch("/api/winforlife/stats?limit=1");
      const wflData = await wflRes.json();
      
      if (lottoData.success) {
        setLottoStats({
          count: lottoData.totalDraws || 0,
          latest: lottoData.latestDraw || null
        });
      }
      
      if (pwData.success) {
        setPlayWheStats({
          count: pwData.totalDraws || 0,
          latest: pwData.latestDraw || null
        });
      }

      if (wflData.success) {
        setWinForLifeStats({
          count: wflData.totalDraws || 0,
          latest: wflData.latestDraw || null
        });
      }
    } catch (err) {
      console.error("Error fetching database status:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchDBStatus();
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleLottoSync = async (full: boolean = false) => {
    if (syncingGame) return;
    
    let pwd = "";
    if (full) {
      const input = prompt("Please enter the Full Sync password to continue:");
      if (!input) {
        addLog("Sync cancelled by user.");
        return;
      }
      pwd = input;
    }

    setSyncingGame("lotto");
    setSyncType(full ? "full" : "recent");
    setSyncSuccess(null);
    setLogs([]);
    setActiveStep(full ? "Initializing Lotto Plus Full Sync..." : "Syncing Lotto Plus Recent Draws...");

    if (full) {
      addLog("Initializing Lotto Plus FULL history sync (Year by Year)...");
      try {
        const currentYear = new Date().getFullYear();
        const startYear = 2001;
        let totalAdded = 0;
        
        for (let y = currentYear; y >= startYear; y--) {
          setActiveStep(`Syncing Lotto Plus Year ${y} (2001 to Present)...`);
          addLog(`Syncing Lotto Plus Year ${y}...`);
          
          const res = await fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year: y, fullSecret: pwd })
          });
          const data = await res.json();
          if (data.success) {
            totalAdded += data.drawsAdded || 0;
            addLog(`Year ${y} complete: Added ${data.drawsAdded || 0} draws.`);
            if (data.drawsAdded > 0 && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification("Lotto Plus Synced!", {
                body: `Year ${y} complete: Added ${data.drawsAdded} historical draws!`,
                icon: "/pwa-192x192.png"
              });
            }
          } else {
            addLog(`Year ${y} failed: ${data.error || data.details}`);
          }
          // Polite delay
          await new Promise(r => setTimeout(r, 600));
        }
        addLog(`Full Sync Completed Successfully! Total draws added: ${totalAdded}`);
        setSyncSuccess(true);
        setActiveStep("Sync Completed!");
        fetchDBStatus();
      } catch (err: any) {
        addLog(`Full Sync Error: ${err.message}`);
        setSyncSuccess(false);
        setActiveStep("Sync Error!");
      } finally {
        setSyncingGame(null);
        setSyncType(null);
      }
    } else {
      addLog("Starting Lotto Plus sync (Recent)...");
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full: false })
        });
        const data = await res.json();
        if (data.success) {
          addLog(`Sync Success! Added/Updated ${data.drawsAdded || 0} draws.`);
          addLog(`Details: ${data.details}`);
          setSyncSuccess(true);
          setActiveStep("Sync Completed!");
          fetchDBStatus();
          if (data.drawsAdded > 0 && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("Lotto Plus Synced!", {
              body: `Added/Updated ${data.drawsAdded} draws successfully!`,
              icon: "/pwa-192x192.png"
            });
          }
        } else {
          addLog(`Sync Failed: ${data.error || data.details}`);
          setSyncSuccess(false);
          setActiveStep("Sync Failed!");
        }
      } catch (err: any) {
        addLog(`Sync Error: ${err.message}`);
        setSyncSuccess(false);
        setActiveStep("Sync Error!");
      } finally {
        setSyncingGame(null);
        setSyncType(null);
      }
    }
  };

  const handlePlayWheSync = async (full: boolean = false) => {
    if (syncingGame) return;

    let pwd = "";
    if (full) {
      const input = prompt("Please enter the Full Sync password to continue:");
      if (!input) {
        addLog("Sync cancelled by user.");
        return;
      }
      pwd = input;
    }

    setSyncingGame("playwhe");
    setSyncType(full ? "full" : "recent");
    setSyncSuccess(null);
    setLogs([]);
    setActiveStep(full ? "Initializing Play Whe Full Sync..." : "Syncing Play Whe Recent Draws...");

    if (full) {
      addLog("Initializing Play Whe FULL history sync (Year by Year)...");
      try {
        const currentYear = new Date().getFullYear();
        const startYear = 2001;
        let totalAdded = 0;
        
        for (let y = currentYear; y >= startYear; y--) {
          setActiveStep(`Syncing Play Whe Year ${y} (2001 to Present)...`);
          addLog(`Syncing Play Whe Year ${y}...`);
          
          const res = await fetch("/api/playwhe/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year: y, fullSecret: pwd })
          });
          const data = await res.json();
           if (data.success) {
            totalAdded += data.drawsAdded || 0;
            addLog(`Year ${y} complete: Added ${data.drawsAdded || 0} draws.`);
            if (data.drawsAdded > 0 && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification("Play Whe Synced!", {
                body: `Year ${y} complete: Added ${data.drawsAdded} historical draws!`,
                icon: "/pwa-192x192.png"
              });
            }
          } else {
            addLog(`Year ${y} failed: ${data.error || data.details}`);
          }
          // Polite delay
          await new Promise(r => setTimeout(r, 600));
        }
        addLog(`Full Sync Completed Successfully! Total draws added: ${totalAdded}`);
        setSyncSuccess(true);
        setActiveStep("Sync Completed!");
        fetchDBStatus();
      } catch (err: any) {
        addLog(`Full Sync Error: ${err.message}`);
        setSyncSuccess(false);
        setActiveStep("Sync Error!");
      } finally {
        setSyncingGame(null);
        setSyncType(null);
      }
    } else {
      addLog("Starting Play Whe sync (Recent)...");
      try {
        const res = await fetch("/api/playwhe/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full: false })
        });
        const data = await res.json();
        if (data.success) {
          addLog(`Sync Success! Added/Updated ${data.drawsAdded || 0} draws.`);
          addLog(`Details: ${data.details}`);
          setSyncSuccess(true);
          setActiveStep("Sync Completed!");
          fetchDBStatus();
          if (data.drawsAdded > 0 && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("Play Whe Synced!", {
              body: `Added/Updated ${data.drawsAdded} draws successfully!`,
              icon: "/pwa-192x192.png"
            });
          }
        } else {
          addLog(`Sync Failed: ${data.error || data.details}`);
          setSyncSuccess(false);
          setActiveStep("Sync Failed!");
        }
      } catch (err: any) {
        addLog(`Sync Error: ${err.message}`);
        setSyncSuccess(false);
        setActiveStep("Sync Error!");
      } finally {
        setSyncingGame(null);
        setSyncType(null);
      }
    }
  };

  const handleWinForLifeSync = async (full: boolean = false) => {
    if (syncingGame) return;
    
    let pwd = "";
    if (full) {
      const input = prompt("Please enter the Full Sync password to continue:");
      if (!input) {
        addLog("Sync cancelled by user.");
        return;
      }
      pwd = input;
    }

    setSyncingGame("winforlife");
    setSyncType(full ? "full" : "recent");
    setSyncSuccess(null);
    setLogs([]);
    setActiveStep(full ? "Initializing Win for Life Full Sync..." : "Syncing Win for Life Recent Draws...");

    if (full) {
      addLog("Initializing Win for Life FULL history sync (Year by Year)...");
      try {
        const currentYear = new Date().getFullYear();
        const startYear = 2022;
        let totalAdded = 0;
        
        for (let y = currentYear; y >= startYear; y--) {
          setActiveStep(`Syncing Win for Life Year ${y} (2022 to Present)...`);
          addLog(`Syncing Win for Life Year ${y}...`);
          
          const res = await fetch("/api/winforlife/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year: y, fullSecret: pwd })
          });
          const data = await res.json();
          if (data.success) {
            totalAdded += data.drawsAdded || 0;
            addLog(`Year ${y} complete: Added ${data.drawsAdded || 0} draws.`);
            if (data.drawsAdded > 0 && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification("Win for Life Synced!", {
                body: `Year ${y} complete: Added ${data.drawsAdded} historical draws!`,
                icon: "/pwa-192x192.png"
              });
            }
          } else {
            addLog(`Year ${y} failed: ${data.error || data.details}`);
          }
          // Polite delay
          await new Promise(r => setTimeout(r, 600));
        }
        addLog(`Full Sync Completed Successfully! Total draws added: ${totalAdded}`);
        setSyncSuccess(true);
        setActiveStep("Sync Completed!");
        fetchDBStatus();
      } catch (err: any) {
        addLog(`Full Sync Error: ${err.message}`);
        setSyncSuccess(false);
        setActiveStep("Sync Error!");
      } finally {
        setSyncingGame(null);
        setSyncType(null);
      }
    } else {
      addLog("Starting Win for Life sync (Recent)...");
      try {
        const res = await fetch("/api/winforlife/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full: false })
        });
        const data = await res.json();
        if (data.success) {
          addLog(`Sync Success! Added/Updated ${data.drawsAdded || 0} draws.`);
          addLog(`Details: ${data.details}`);
          setSyncSuccess(true);
          setActiveStep("Sync Completed!");
          fetchDBStatus();
          if (data.drawsAdded > 0 && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("Win for Life Synced!", {
              body: `Added/Updated ${data.drawsAdded} draws successfully!`,
              icon: "/pwa-192x192.png"
            });
          }
        } else {
          addLog(`Sync Failed: ${data.error || data.details}`);
          setSyncSuccess(false);
          setActiveStep("Sync Failed!");
        }
      } catch (err: any) {
        addLog(`Sync Error: ${err.message}`);
        setSyncSuccess(false);
        setActiveStep("Sync Error!");
      } finally {
        setSyncingGame(null);
        setSyncType(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-black tracking-wider text-white uppercase font-mono">
            System & Sync Center
          </h2>
          <p className="text-xs text-gray-400 font-mono">
            Manage your database records, trigger synchronizations, and monitor server logs.
          </p>
        </div>
        {settingsTab === "sync" && (
          <button
            onClick={fetchDBStatus}
            disabled={loadingStats || syncingGame !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-slate-900/50 hover:bg-slate-900 text-xs font-bold font-mono tracking-wider text-gray-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5 w-full md:w-fit mb-6 overflow-x-auto flex-nowrap scrollbar-none">
        <button
          onClick={() => setSettingsTab("sync")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            settingsTab === "sync"
              ? "bg-primary text-slate-950 font-bold"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          DATABASE & SYNC
        </button>
        <button
          onClick={() => setSettingsTab("install")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            settingsTab === "install"
              ? "bg-primary text-slate-950 font-bold"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          MOBILE INSTALLATION GUIDE
        </button>
        <button
          onClick={() => setSettingsTab("notifications")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold font-mono tracking-wider transition-all whitespace-nowrap ${
            settingsTab === "notifications"
              ? "bg-primary text-slate-950 font-bold"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          PWA NOTIFICATIONS
        </button>
      </div>

      {settingsTab === "sync" && (
        <>
          {/* Interactive Explainer Card */}
          <div className="glass-panel border border-white/5 p-4 rounded-xl bg-slate-950/20 flex gap-3.5">
            <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2 font-mono">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Synchronization Guide & Control Actions
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Due to hosting firewall limits, automated servers (like Vercel) are blocked by NLCB. To pull latest numbers, trigger a direct update below or run <code className="text-primary mx-1 px-1 bg-slate-950 rounded font-semibold">npm run sync-cloud</code> in your terminal.
              </p>
              <div className="border-t border-white/5 pt-2 mt-1 space-y-1.5 text-xs text-gray-400">
                <div>
                  <strong className="text-primary uppercase font-bold">● SYNC RECENT:</strong> Connects to NLCB, scrapes the latest draw results, and saves them to your database. **Use this to get today's drawings.**
                </div>
                <div>
                  <strong className="text-amber-400 uppercase font-bold">● SYNC FULL:</strong> Wipes and completely reconstructs the historical archive from 2001 to Present (takes 1–2 mins).
                </div>
                <div>
                  <strong className="text-white uppercase font-bold">● REFRESH (top right):</strong> Updates the display statistics and latest draw details on this screen from the database (does not scrape NLCB).
                </div>
              </div>
            </div>
          </div>

          {/* Database Overview & Sync Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Lotto Plus Card */}
            <div className="glass-panel border border-white/5 p-5 rounded-xl bg-slate-950/40 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold font-mono tracking-widest text-primary uppercase">
                    LOTTO PLUS DATA
                  </span>
                  <Database className="w-4 h-4 text-primary/50" />
                </div>
                
                {loadingStats ? (
                  <div className="space-y-2 animate-pulse py-2">
                    <div className="h-6 w-32 bg-white/5 rounded" />
                    <div className="h-4 w-48 bg-white/5 rounded" />
                  </div>
                ) : (
                  <div className="space-y-3 font-mono">
                    <div className="text-2xl font-black text-white">
                      {lottoStats?.count.toLocaleString() || "0"} <span className="text-xs font-bold text-gray-500">Draws</span>
                    </div>
                    {lottoStats?.latest && (
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>Latest Draw: <span className="text-white font-bold">#{lottoStats.latest.draw_number}</span></div>
                        <div>Winning: <span className="text-primary font-bold">
                          {[lottoStats.latest.num1, lottoStats.latest.num2, lottoStats.latest.num3, lottoStats.latest.num4, lottoStats.latest.num5].join("-")}
                        </span> + PB <span className="text-amber-400 font-bold">{lottoStats.latest.powerball}</span></div>
                        <div>Date: <span className="text-white">{lottoStats.latest.draw_date}</span></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => handleLottoSync(false)}
                  disabled={syncingGame !== null}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-bold font-mono tracking-wider transition ${
                    syncingGame === "lotto" && syncType === "recent"
                      ? "bg-primary/20 border-primary text-primary animate-pulse"
                      : "bg-slate-950 border-white/5 text-gray-300 hover:bg-slate-900 hover:border-white/10"
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingGame === "lotto" && syncType === "recent" ? "animate-spin" : ""}`} />
                  SYNC RECENT
                </button>
                <button
                  onClick={() => handleLottoSync(true)}
                  disabled={syncingGame !== null}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-bold font-mono tracking-wider transition ${
                    syncingGame === "lotto" && syncType === "full"
                      ? "bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse"
                      : "bg-slate-950 border-white/5 text-gray-400 hover:bg-slate-900 hover:border-white/10"
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingGame === "lotto" && syncType === "full" ? "animate-spin" : ""}`} />
                  SYNC FULL (2001+)
                </button>
              </div>
            </div>

            {/* Play Whe Card */}
            <div className="glass-panel border border-white/5 p-5 rounded-xl bg-slate-950/40 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold font-mono tracking-widest text-primary uppercase">
                    PLAY WHE DATA
                  </span>
                  <Database className="w-4 h-4 text-primary/50" />
                </div>
                
                {loadingStats ? (
                  <div className="space-y-2 animate-pulse py-2">
                    <div className="h-6 w-32 bg-white/5 rounded" />
                    <div className="h-4 w-48 bg-white/5 rounded" />
                  </div>
                ) : (
                  <div className="space-y-3 font-mono">
                    <div className="text-2xl font-black text-white">
                      {playWheStats?.count.toLocaleString() || "0"} <span className="text-xs font-bold text-gray-500">Draws</span>
                    </div>
                    {playWheStats?.latest && (
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>Latest Draw: <span className="text-white font-bold">#{playWheStats.latest.draw_number}</span></div>
                        <div>Winning: <span className="text-primary font-bold">
                          {playWheStats.latest.winning_number}
                        </span> ({playWheStats.latest.draw_time_slot})</div>
                        <div>Date: <span className="text-white">{playWheStats.latest.draw_date}</span></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => handlePlayWheSync(false)}
                  disabled={syncingGame !== null}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-bold font-mono tracking-wider transition ${
                    syncingGame === "playwhe" && syncType === "recent"
                      ? "bg-primary/20 border-primary text-primary animate-pulse"
                      : "bg-slate-950 border-white/5 text-gray-300 hover:bg-slate-900 hover:border-white/10"
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingGame === "playwhe" && syncType === "recent" ? "animate-spin" : ""}`} />
                  SYNC RECENT
                </button>
                <button
                  onClick={() => handlePlayWheSync(true)}
                  disabled={syncingGame !== null}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-bold font-mono tracking-wider transition ${
                    syncingGame === "playwhe" && syncType === "full"
                      ? "bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse"
                      : "bg-slate-950 border-white/5 text-gray-400 hover:bg-slate-900 hover:border-white/10"
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingGame === "playwhe" && syncType === "full" ? "animate-spin" : ""}`} />
                  SYNC FULL (2001+)
                </button>
              </div>
            </div>

            {/* Win for Life Card */}
            <div className="glass-panel border border-white/5 p-5 rounded-xl bg-slate-950/40 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold font-mono tracking-widest text-primary uppercase">
                    WIN FOR LIFE DATA
                  </span>
                  <Database className="w-4 h-4 text-primary/50" />
                </div>
                
                {loadingStats ? (
                  <div className="space-y-2 animate-pulse py-2">
                    <div className="h-6 w-32 bg-white/5 rounded" />
                    <div className="h-4 w-48 bg-white/5 rounded" />
                  </div>
                ) : (
                  <div className="space-y-3 font-mono">
                    <div className="text-2xl font-black text-white">
                      {winForLifeStats?.count.toLocaleString() || "0"} <span className="text-xs font-bold text-gray-500">Draws</span>
                    </div>
                    {winForLifeStats?.latest && (
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>Latest Draw: <span className="text-white font-bold">#{winForLifeStats.latest.draw_number}</span></div>
                        <div>Winning: <span className="text-primary font-bold">
                          {[winForLifeStats.latest.num1, winForLifeStats.latest.num2, winForLifeStats.latest.num3, winForLifeStats.latest.num4, winForLifeStats.latest.num5, winForLifeStats.latest.num6].join("-")}
                        </span> + CB <span className="text-emerald-400 font-bold">{winForLifeStats.latest.cash_ball}</span></div>
                        <div>Date: <span className="text-white">{winForLifeStats.latest.draw_date}</span></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => handleWinForLifeSync(false)}
                  disabled={syncingGame !== null}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-bold font-mono tracking-wider transition ${
                    syncingGame === "winforlife" && syncType === "recent"
                      ? "bg-primary/20 border-primary text-primary animate-pulse"
                      : "bg-slate-950 border-white/5 text-gray-300 hover:bg-slate-900 hover:border-white/10"
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingGame === "winforlife" && syncType === "recent" ? "animate-spin" : ""}`} />
                  SYNC RECENT
                </button>
                <button
                  onClick={() => handleWinForLifeSync(true)}
                  disabled={syncingGame !== null}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-bold font-mono tracking-wider transition ${
                    syncingGame === "winforlife" && syncType === "full"
                      ? "bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse"
                      : "bg-slate-950 border-white/5 text-gray-400 hover:bg-slate-900 hover:border-white/10"
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingGame === "winforlife" && syncType === "full" ? "animate-spin" : ""}`} />
                  SYNC FULL (2022+)
                </button>
              </div>
            </div>

          </div>

          {/* Terminal logs panel */}
          <div className="glass-panel border border-white/5 rounded-xl bg-slate-950/60 overflow-hidden">
            
            {/* Terminal Header */}
            <div className="bg-slate-900/80 px-4 py-2 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold font-mono tracking-wider text-gray-300 uppercase">
                  LIVE SYNC LOG CONSOLE
                </span>
              </div>
              
              {syncingGame !== null ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-primary animate-pulse font-semibold uppercase">
                    {activeStep}
                  </span>
                  <div className="w-2.5 h-2.5 border border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : syncSuccess === true ? (
                <div className="flex items-center gap-1.5 text-green-400 text-[10px] font-bold font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  SYNC COMPLETE
                </div>
              ) : syncSuccess === false ? (
                <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold font-mono">
                  <AlertTriangle className="w-3 h-3" />
                  SYNC ERROR
                </div>
              ) : (
                <div className="text-[10px] font-mono text-gray-500">IDLE</div>
              )}
            </div>

            {/* Terminal Output */}
            <div className="p-4 bg-slate-950/80 min-h-[180px] max-h-[300px] overflow-y-auto font-mono text-xs text-gray-400 space-y-1.5">
              {logs.length === 0 ? (
                <div className="text-gray-600 italic">No console logs available. Click a sync button above to trigger synchronization.</div>
              ) : (
                logs.map((log, idx) => (
                  <div 
                    key={idx} 
                    className={`${
                      log.includes("failed") || log.includes("Error") 
                        ? "text-rose-400" 
                        : log.includes("Success") || log.includes("complete:")
                        ? "text-green-400"
                        : "text-gray-300"
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {settingsTab === "install" && (
        <div className="space-y-6">
          {/* Main Card */}
          <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/40 space-y-4">
            <h3 className="text-sm font-bold font-mono tracking-widest text-white uppercase border-b border-white/5 pb-2">
              Progressive Web App (PWA) Installation Guide
            </h3>
            <p className="text-xs text-gray-400 font-mono leading-relaxed">
              Installing this application on your mobile device places a standalone, borderless launcher icon directly on your home screen. This provides instant access, saves storage, and removes browser interface bars for a full-screen, native experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Apple iOS Guide */}
            <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-4 font-mono">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71,19.5C17.88,20.74,17,21.95,15.66,22c-1.34,.05-1.77-.77-3.31-.77s-2,.75-3.31,.8c-1.31,.05-2.3-1.32-3.14-2.53C4.25,17,2.94,12.45,4.7,9.39c.87-1.52,2.43-2.48,4.12-2.51,1.28-.02,2.5,.87,3.29,.87s1.78-.85,3.06-.72c.54,.02,2.05,.22,3.02,1.64-1.04,.63-2.15,1.86-2.13,3.46,0,1.92,1.57,2.83,1.6,2.85-.02,.07-.26,.88-.85,1.96M15.97,4.17c.56-.7,1.01-1.66,.81-2.61-.83,.03-1.89,.57-2.48,1.28-.5,.58-.94,1.56-.74,2.49,.92,.07,1.9-.45,2.41-1.16Z"/>
                </svg>
                Apple iOS (iPhone / iPad)
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                iOS requires PWA installation through Safari. Google Chrome or other browsers on iOS do not support home screen installations.
              </p>
              <ol className="list-decimal pl-4 text-xs text-gray-300 space-y-2 pt-2">
                <li>
                  Open <strong className="text-white">Safari</strong> and navigate to the application URL.
                </li>
                <li>
                  Tap the <strong className="text-white">Share</strong> button (the square icon with the upward arrow) at the bottom tab bar.
                </li>
                <li>
                  Scroll down the share sheet menu and select <strong className="text-primary font-bold">Add to Home Screen</strong>.
                </li>
                <li>
                  Type a name (default is <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-400">WinConcept</code>) and tap <strong className="text-white">Add</strong> at the top right.
                </li>
                <li>
                  The custom lottery tumbler logo will appear on your screen and launch full screen!
                </li>
              </ol>
            </div>

            {/* Google Android Guide */}
            <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-4 font-mono">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M16.61,15.15C16.14,15.15,15.77,14.78,15.77,14.31C15.77,13.84,16.14,13.47,16.61,13.47C17.08,13.47,17.45,13.84,17.45,14.31C17.45,14.78,17.08,15.15,16.61,15.15M7.39,15.15C6.92,15.15,6.55,14.78,6.55,14.31C6.55,13.84,6.92,13.47,7.39,13.47C7.86,13.47,8.23,13.84,8.23,14.31C8.23,14.78,7.86,15.15,7.39,15.15M19.12,11.53L21,8.27C21.1,8.1,21.05,7.87,20.88,7.77C20.71,7.67,20.48,7.72,20.38,7.89L18.47,11.19C16.8,10.42,14.93,10,13,10C11.07,10,9.2,10.42,7.53,11.19L5.62,7.89C5.52,7.72,5.29,7.67,5.12,7.77C4.95,7.87,4.9,8.1,5,8.27L6.88,11.53C3.06,13.62,0.5,17.65,0.5,22.31H23.5C23.5,17.65,20.94,13.62,19.12,11.53Z"/>
                </svg>
                Google Android (Chrome / Brave / Firefox)
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Android supports app installations through Chrome, Brave, Edge, Opera, or Firefox.
              </p>
              <ol className="list-decimal pl-4 text-xs text-gray-300 space-y-2 pt-2">
                <li>
                  Open <strong className="text-white">Google Chrome</strong> and navigate to the application URL.
                </li>
                <li>
                  Look for the <strong className="text-primary font-bold">"Add WinConcept to Home Screen"</strong> banner prompt at the bottom of your screen.
                </li>
                <li>
                  If you don't see the banner, tap the browser's <strong className="text-white">Three Dots menu (⋮)</strong> at the top right.
                </li>
                <li>
                  Select <strong className="text-primary font-bold">Install App</strong> or <strong className="text-primary font-bold">Add to Home screen</strong>.
                </li>
                <li>
                  Confirm the prompt by tapping <strong className="text-white">Install</strong>, and it will configure automatically in the background.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {settingsTab === "notifications" && (
        <div className="glass-panel p-6 rounded-xl border border-white/5 bg-slate-900/30 space-y-4 font-mono">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">PWA Notification Center</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Enable HTML5 web notifications to receive real-time updates when lottery numbers are synchronized or when a new win is detected.
          </p>

          <div className="bg-slate-950/50 p-4 border border-white/5 rounded-lg flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-bold text-white uppercase">Notification Status</div>
              <div className="text-[10px] text-gray-400 font-bold">
                {notificationPermission === "granted" ? (
                  <span className="text-emerald-400 font-extrabold uppercase">● Active & Authorized</span>
                ) : notificationPermission === "denied" ? (
                  <span className="text-red-400 font-extrabold uppercase">● Blocked by Browser Settings</span>
                ) : (
                  <span className="text-amber-400 font-extrabold uppercase">● Pending User Permission</span>
                )}
              </div>
            </div>

            {notificationPermission !== "granted" && (
              <button
                onClick={requestNotificationPermission}
                className="bg-primary hover:bg-primary/95 text-slate-950 font-black px-4 py-2 rounded-lg text-xs tracking-wider transition cursor-pointer"
              >
                ENABLE ALERTS
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
