"use client";

import React, { useState } from "react";
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  Copy,
  Check,
  Info,
  Grid,
  List
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

export interface BetSlipExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameKey: "cashpot" | "lotto-plus" | "win-for-life";
  gameName: string;
  targetDrawNumber?: number;
  slips: number[][];
  bonusBalls?: number[];
  unitCostTT: number;
  multiplierIncluded?: boolean;
}

const PANEL_LETTERS = ["A", "B", "C", "D", "E"];

export default function BetSlipExportModal({
  isOpen,
  onClose,
  gameKey,
  gameName,
  targetDrawNumber,
  slips,
  bonusBalls = [],
  unitCostTT,
  multiplierIncluded = true
}: BetSlipExportModalProps) {
  const [viewMode, setViewMode] = useState<"visual" | "operator">("visual");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const maxBall = gameKey === "cashpot" ? 20 : gameKey === "win-for-life" ? 28 : 35;
  const gridCols = gameKey === "win-for-life" ? 7 : 5;
  const bonusLabel = gameKey === "win-for-life" ? "CB" : gameKey === "lotto-plus" ? "PB" : "";
  const totalCostTT = slips.length * unitCostTT;

  // Group slips into physical 5-panel NLCB cards (Panels A, B, C, D, E)
  const cards: { cardNum: number; panels: { letter: string; slipIdx: number; nums: number[]; bonus?: number }[] }[] = [];
  for (let i = 0; i < slips.length; i += 5) {
    const slice = slips.slice(i, i + 5);
    cards.push({
      cardNum: Math.floor(i / 5) + 1,
      panels: slice.map((nums, idx) => ({
        letter: PANEL_LETTERS[idx],
        slipIdx: i + idx,
        nums: [...nums].sort((a, b) => a - b),
        bonus: bonusBalls[i + idx]
      }))
    });
  }

  const buildPlainText = () => {
    const lines: string[] = [
      `THE WIN CONCEPT — NLCB BETTING SLIP SHEET`,
      `Game: ${gameName.toUpperCase()}${targetDrawNumber ? ` | Target Draw #${targetDrawNumber}` : ""}`,
      `Slips: ${slips.length} (${cards.length} physical 5-panel card${cards.length > 1 ? "s" : ""}) | Est. Total: $${totalCostTT}.00 TT${
        gameKey === "cashpot" && multiplierIncluded ? " (w/ Multiplier)" : ""
      }`,
      `======================================================`,
      ""
    ];
    for (const card of cards) {
      lines.push(`CARD #${card.cardNum} (Panels A–${card.panels[card.panels.length - 1].letter})`);
      for (const p of card.panels) {
        const numStr = p.nums.map((n) => String(n).padStart(2, "0")).join(" - ");
        const bStr = p.bonus !== undefined && bonusLabel ? `  + ${bonusLabel} ${String(p.bonus).padStart(2, "0")}` : "";
        lines.push(`  Panel ${p.letter}:  ${numStr}${bStr}`);
      }
      lines.push("");
    }
    lines.push("Note: Copy these marks onto official NLCB playslip cards or present to an NLCB booth operator.");
    return lines.join("\n");
  };

  const handleCopyText = () => {
    triggerHaptic("success");
    navigator.clipboard?.writeText(buildPlainText()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownloadTxt = () => {
    triggerHaptic("selection");
    const blob = new Blob([buildPlainText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NLCB_${gameKey}_${slips.length}slips${targetDrawNumber ? `_draw${targetDrawNumber}` : ""}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    triggerHaptic("selection");
    const pickLen = gameKey === "win-for-life" ? 6 : 5;
    const header = [
      "Card",
      "Panel",
      "SlipNo",
      ...Array.from({ length: pickLen }, (_, i) => `Ball${i + 1}`),
      ...(bonusLabel ? [bonusLabel] : []),
      "CostTT"
    ].join(",");
    const rows = cards.flatMap((card) =>
      card.panels.map((p) =>
        [
          card.cardNum,
          p.letter,
          p.slipIdx + 1,
          ...p.nums,
          ...(bonusLabel ? [p.bonus ?? ""] : []),
          unitCostTT
        ].join(",")
      )
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NLCB_${gameKey}_${slips.length}slips${targetDrawNumber ? `_draw${targetDrawNumber}` : ""}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Opens a crisp, ink-friendly white-background printable HTML sheet (Save PDF or Print)
  const handlePrintSheet = () => {
    triggerHaptic("medium");
    const printWin = window.open("", "_blank", "width=900,height=750");
    if (!printWin) return;

    const renderBubbleGridHtml = (nums: number[], bonus?: number) => {
      const set = new Set(nums);
      const cells = Array.from({ length: maxBall }, (_, i) => {
        const n = i + 1;
        const active = set.has(n);
        return `<div class="cell ${active ? "marked" : ""}">${String(n).padStart(2, "0")}</div>`;
      }).join("");

      const bonusHtml =
        bonusLabel && bonus !== undefined
          ? `<div class="bonus-row">
              <span class="bonus-title">${bonusLabel}:</span>
              ${Array.from({ length: 10 }, (_, i) => {
                const b = i + 1;
                return `<span class="bcell ${b === bonus ? "bmarked" : ""}">${b}</span>`;
              }).join("")}
            </div>`
          : "";

      return `
        <div class="grid" style="grid-template-columns: repeat(${gridCols}, 1fr);">${cells}</div>
        ${bonusHtml}
      `;
    };

    const cardsHtml = cards
      .map(
        (card) => `
      <div class="card">
        <div class="card-head">
          <span>OFFICIAL PLAYSLIP CARD #${card.cardNum} (Panels A–${card.panels[card.panels.length - 1].letter})</span>
          <span>${gameName.toUpperCase()} · ${card.panels.length} Panels · $${card.panels.length * unitCostTT}.00 TT${
            gameKey === "cashpot" && multiplierIncluded ? " (CHECK MULTIPLIER: YES)" : ""
          }</span>
        </div>
        <div class="operator-list">
          ${card.panels
            .map(
              (p) =>
                `<div class="op-row"><strong>Panel ${p.letter}:</strong> <span class="op-nums">${p.nums
                  .map((n) => String(n).padStart(2, "0"))
                  .join("  -  ")}</span>${
                  p.bonus !== undefined && bonusLabel
                    ? ` <span class="op-bonus">+ ${bonusLabel} ${String(p.bonus).padStart(2, "0")}</span>`
                    : ""
                }</div>`
            )
            .join("")}
        </div>
        <div class="panels-grid">
          ${card.panels
            .map(
              (p) => `
            <div class="panel">
              <div class="panel-title">PANEL ${p.letter} <span>${p.nums.map((n) => String(n).padStart(2, "0")).join("-")}</span></div>
              ${renderBubbleGridHtml(p.nums, p.bonus)}
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>NLCB ${gameName} Playslip Sheet (${slips.length} Slips)</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 18px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 18px; letter-spacing: 0.04em; text-transform: uppercase; }
    .header .meta { font-size: 12px; color: #374151; font-family: monospace; text-align: right; }
    .notice { font-size: 11px; background: #f3f4f6; border: 1px solid #d1d5db; padding: 7px 10px; border-radius: 6px; margin-bottom: 14px; color: #1f2937; }
    .card { border: 1.5px solid #111827; border-radius: 8px; padding: 10px; margin-bottom: 16px; page-break-inside: avoid; }
    .card-head { display: flex; justify-content: space-between; font-weight: 800; font-size: 12px; font-family: monospace; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; margin-bottom: 8px; }
    .operator-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 16px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 8px; border-radius: 6px; margin-bottom: 10px; font-family: monospace; font-size: 13px; }
    .op-nums { font-weight: 800; letter-spacing: 0.05em; }
    .op-bonus { font-weight: 800; background: #111827; color: #fff; padding: 1px 5px; border-radius: 3px; font-size: 11px; margin-left: 4px; }
    .panels-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .panel { border: 1px solid #9ca3af; border-radius: 6px; padding: 6px; }
    .panel-title { font-size: 10px; font-weight: 800; font-family: monospace; display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }
    .grid { display: grid; gap: 2px; }
    .cell { font-family: monospace; font-size: 9px; text-align: center; padding: 2px 0; border: 1px solid #d1d5db; border-radius: 3px; color: #6b7280; }
    .cell.marked { background: #111827; color: #ffffff; border-color: #111827; font-weight: 900; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .bonus-row { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin-top: 5px; padding-top: 4px; border-top: 1px dashed #d1d5db; font-family: monospace; font-size: 8px; }
    .bonus-title { font-weight: 800; margin-right: 2px; }
    .bcell { padding: 1px 3px; border: 1px solid #d1d5db; border-radius: 2px; color: #6b7280; }
    .bcell.bmarked { background: #111827; color: #fff; border-color: #111827; font-weight: 900; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media print {
      body { margin: 8mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>The Win Concept — ${gameName} Playslip Sheet</h1>
      <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">Steiner-Johnson Zero-Pair-Overlap Portfolio${
        targetDrawNumber ? ` · Target Draw #${targetDrawNumber}` : ""
      }</div>
    </div>
    <div class="meta">
      <div><strong>${slips.length} Slips</strong> (${cards.length} Official Card${cards.length > 1 ? "s" : ""})</div>
      <div>Total: <strong>$${totalCostTT}.00 TT</strong></div>
    </div>
  </div>
  <div class="notice">
    <strong>Booth &amp; OMR Notice:</strong> NLCB optical scanner terminals only accept official NLCB playslip stock (infrared dropout ink &amp; timing marks). Use the darkened grids below to shade your official NLCB Panels A–E accurately in seconds, or hand the bold Panel A–E list to your NLCB operator for manual terminal entry.
  </div>
  ${cardsHtml}
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-5">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-[#0a0f1a] border border-white/15 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-slate-950/80">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white font-sans">
              Export &amp; Print {gameName} Betting Slips
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              {slips.length} Slips · {cards.length} Official 5-Panel Card{cards.length > 1 ? "s" : ""} · Total ${totalCostTT}.00 TT
              {targetDrawNumber ? ` · Draw #${targetDrawNumber}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Honest NLCB OMR Machine Notice */}
        <div className="px-4 sm:px-6 py-2.5 bg-amber-950/25 border-b border-amber-500/20 flex items-start gap-2.5 text-[11px] font-sans text-amber-100/90">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-amber-300">About NLCB Scanner Machines:</strong> NLCB OMR readers only scan official NLCB playslip paper (infrared dropout ink + edge timing tracks). Use this printable sheet either as a <strong>1-to-1 Panel A–E shading guide</strong> for your official card, or hand the <strong>Booth Operator Sheet</strong> directly to the agent to key in.
          </span>
        </div>

        {/* Export Action Toolbar */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/50 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintSheet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-sans transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-100 text-xs font-mono font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>.TXT</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-100 text-xs font-mono font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>.CSV</span>
            </button>
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-100 text-xs font-mono font-semibold transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="inline-flex rounded-lg bg-slate-900 border border-white/10 p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition ${
                viewMode === "visual" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>Bubble Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("operator")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition ${
                viewMode === "operator" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="w-3 h-3" />
              <span>Agent List</span>
            </button>
          </div>
        </div>

        {/* Scrollable Card Preview Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {cards.map((card) => (
            <div
              key={card.cardNum}
              className="rounded-xl bg-[#070b14] border border-white/[0.08] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/[0.06] font-mono text-xs">
                <span className="font-bold text-white uppercase">
                  Official NLCB Card #{card.cardNum} (Panels A–{card.panels[card.panels.length - 1].letter})
                </span>
                <span className="text-emerald-300 font-semibold">
                  {card.panels.length} Slips · ${card.panels.length * unitCostTT}.00 TT
                  {gameKey === "cashpot" && multiplierIncluded ? " · Multiplier: YES" : ""}
                </span>
              </div>

              {viewMode === "operator" ? (
                <div className="space-y-1.5 font-mono">
                  {card.panels.map((p) => (
                    <div
                      key={p.letter}
                      className="px-3 py-2.5 rounded-lg bg-slate-900/80 border border-white/[0.06] flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-bold text-slate-400">PANEL {p.letter}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-black text-white tracking-wider tabular-nums">
                          {p.nums.map((n) => String(n).padStart(2, "0")).join(" - ")}
                        </span>
                        {p.bonus !== undefined && bonusLabel && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold">
                            {bonusLabel} {String(p.bonus).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {card.panels.map((p) => {
                    const numSet = new Set(p.nums);
                    return (
                      <div
                        key={p.letter}
                        className="p-3 rounded-xl bg-slate-900/70 border border-white/[0.07] space-y-2"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px] pb-1 border-b border-white/[0.06]">
                          <span className="font-bold text-sky-300">PANEL {p.letter}</span>
                          <span className="text-slate-200 font-bold tabular-nums">
                            {p.nums.map((n) => String(n).padStart(2, "0")).join("-")}
                          </span>
                        </div>
                        <div
                          className="grid gap-1 font-mono text-[10px]"
                          style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
                        >
                          {Array.from({ length: maxBall }, (_, i) => {
                            const n = i + 1;
                            const isMarked = numSet.has(n);
                            return (
                              <div
                                key={n}
                                className={`py-1 rounded text-center tabular-nums border ${
                                  isMarked
                                    ? "bg-emerald-400 text-slate-950 border-emerald-300 font-black"
                                    : "bg-slate-950/70 text-slate-600 border-white/[0.05]"
                                }`}
                              >
                                {String(n).padStart(2, "0")}
                              </div>
                            );
                          })}
                        </div>
                        {p.bonus !== undefined && bonusLabel && (
                          <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between font-mono text-[10px]">
                            <span className="text-slate-400 font-bold">{bonusLabel} (1–10):</span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 10 }, (_, i) => {
                                const b = i + 1;
                                const marked = b === p.bonus;
                                return (
                                  <span
                                    key={b}
                                    className={`w-4 h-4 rounded flex items-center justify-center text-[9px] ${
                                      marked
                                        ? "bg-amber-400 text-slate-950 font-black"
                                        : "bg-slate-950 text-slate-600"
                                    }`}
                                  >
                                    {b}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
