"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Database, Terminal, CheckCircle2, AlertTriangle, Play, HelpCircle } from "lucide-react";

export default function SettingsTab() {
  const [lottoStats, setLottoStats] = useState<any>(null);
  const [playWheStats, setPlayWheStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  const [syncingGame, setSyncingGame] = useState<"lotto" | "playwhe" | null>(null);
  const [syncType, setSyncType] = useState<"recent" | "full" | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);
  const [activeStep, setActiveStep] = useState<string>("");

  const fetchDBStatus = async () => {
    setLoadingStats(true);
    try {
      // 1. Fetch Lotto Plus stats
      const lottoRes = await fetch("/api/stats?timeframe=all");
      const lottoData = await lottoRes.json();
      
      // 2. Fetch Play Whe stats
      const pwRes = await fetch("/api/playwhe/stats?limit=1");
      const pwData = await pwRes.json();
      
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
            body: JSON.stringify({ year: y })
          });
          const data = await res.json();
          if (data.success) {
            totalAdded += data.drawsAdded || 0;
            addLog(`Year ${y} complete: Added ${data.drawsAdded || 0} draws.`);
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
            body: JSON.stringify({ year: y })
          });
          const data = await res.json();
          if (data.success) {
            totalAdded += data.drawsAdded || 0;
            addLog(`Year ${y} complete: Added ${data.drawsAdded || 0} draws.`);
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
        <button
          onClick={fetchDBStatus}
          disabled={loadingStats || syncingGame !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-slate-900/50 hover:bg-slate-900 text-[11px] font-bold font-mono tracking-wider text-gray-300 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? "animate-spin" : ""}`} />
          REFRESH
        </button>
      </div>

      {/* Interactive Explainer Card */}
      <div className="glass-panel border border-white/5 p-4 rounded-xl bg-slate-950/20 flex gap-3.5">
        <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
            Synchronization Architecture
          </h4>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Due to hosting firewall rules, cloud-based automatic sync runners (e.g. GitHub Actions or Vercel Serverless) 
            cannot scrape the NLCB results website directly because they block hosting provider IP ranges. 
            To bypass this, you can trigger updates directly from your unblocked local computer by running 
            <code className="text-primary mx-1 px-1 bg-slate-950 rounded font-mono font-semibold">npm run sync-cloud</code> in your terminal. 
            Alternatively, use the controls below to trigger a backend database refresh.
          </p>
        </div>
      </div>

      {/* Database Overview & Sync Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Lotto Plus Card */}
        <div className="glass-panel border border-white/5 p-5 rounded-xl bg-slate-950/40 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold font-mono tracking-widest text-primary uppercase">
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
                  <div className="text-[11px] text-gray-400 space-y-1">
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
              <span className="text-[11px] font-bold font-mono tracking-widest text-primary uppercase">
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
                  <div className="text-[11px] text-gray-400 space-y-1">
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

      </div>

      {/* Terminal logs panel */}
      <div className="glass-panel border border-white/5 rounded-xl bg-slate-950/60 overflow-hidden">
        
        {/* Terminal Header */}
        <div className="bg-slate-900/80 px-4 py-2 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold font-mono tracking-wider text-gray-300 uppercase">
              LIVE SYNC LOG CONSOLE
            </span>
          </div>
          
          {syncingGame !== null ? (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-primary animate-pulse font-semibold uppercase">
                {activeStep}
              </span>
              <div className="w-2.5 h-2.5 border border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : syncSuccess === true ? (
            <div className="flex items-center gap-1.5 text-green-400 text-[9px] font-bold font-mono">
              <CheckCircle2 className="w-3 h-3" />
              SYNC COMPLETE
            </div>
          ) : syncSuccess === false ? (
            <div className="flex items-center gap-1.5 text-rose-400 text-[9px] font-bold font-mono">
              <AlertTriangle className="w-3 h-3" />
              SYNC ERROR
            </div>
          ) : (
            <div className="text-[9px] font-mono text-gray-500">IDLE</div>
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
    </div>
  );
}
