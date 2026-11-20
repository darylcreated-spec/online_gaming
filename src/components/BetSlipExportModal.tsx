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
  const bonusFullName = gameKey === "win-for-life" ? "Cash Ball" : gameKey === "lotto-plus" ? "Powerball" : "";
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
      `THE WIN CONCEPT - NLCB PLAYSLIP SHEET`,
      `Game: ${gameName}${targetDrawNumber ? ` | Target Draw ${targetDrawNumber}` : ""}`,
      `Slips: ${slips.length} (${cards.length} official 5-panel card${cards.length > 1 ? "s" : ""}) | Estimated Total: $${totalCostTT}.00 TTD${
        gameKey === "cashpot" && multiplierIncluded ? " (with Multiplier)" : ""
      }`,
      `======================================================`,
      ""
    ];
    for (const card of cards) {
      lines.push(`CARD ${card.cardNum} (Panels A to ${card.panels[card.panels.length - 1].letter})`);
      for (const p of card.panels) {
        const numStr = p.nums.map((n) => String(n).padStart(2, "0")).join(", ");
        const bStr = p.bonus !== undefined && bonusFullName ? ` | ${bonusFullName}: ${String(p.bonus).padStart(2, "0")}` : "";
        lines.push(`  Panel ${p.letter}:  ${numStr}${bStr}`);
      }
      lines.push("");
    }
    lines.push("Note: Copy these numbers onto official NLCB playslip cards or hand this list to an NLCB booth operator.");
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
      "SlipNumber",
      ...Array.from({ length: pickLen }, (_, i) => `Number${i + 1}`),
      ...(bonusFullName ? [bonusFullName.replace(/\s+/g, "")] : []),
      "CostTTD"
    ].join(",");
    const rows = cards.flatMap((card) =>
      card.panels.map((p) =>
        [
          card.cardNum,
          p.letter,
          p.slipIdx + 1,
          ...p.nums,
          ...(bonusFullName ? [p.bonus ?? ""] : []),
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

  // Opens an ink-friendly white-background printable HTML sheet (Save PDF or Print)
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
        bonusFullName && bonus !== undefined
          ? `<div class="bonus-row">
              <span class="bonus-title">${bonusFullName}:</span>
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
          <span>OFFICIAL PLAYSLIP CARD ${card.cardNum} (Panels A to ${card.panels[card.panels.length - 1].letter})</span>
          <span>${gameName} | ${card.panels.length} Panels | $${card.panels.length * unitCostTT}.00 TTD${
            gameKey === "cashpot" && multiplierIncluded ? " (CHECK MULTIPLIER: YES)" : ""
          }</span>
        </div>
        <div class="operator-list">
          ${card.panels
            .map(
              (p) =>
                `<div class="op-row"><strong>Panel ${p.letter}:</strong> <span class="op-nums">${p.nums
                  .map((n) => String(n).padStart(2, "0"))
                  .join(", ")}</span>${
                  p.bonus !== undefined && bonusFullName
                    ? ` <span class="op-bonus">${bonusFullName} ${String(p.bonus).padStart(2, "0")}</span>`
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
              <div class="panel-title">PANEL ${p.letter} <span>${p.nums.map((n) => String(n).padStart(2, "0")).join(" ")}</span></div>
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
    .header h1 { margin: 0; font-size: 18px; letter-spacing: 0.02em; }
    .header .meta { font-size: 12px; color: #374151; text-align: right; }
    .notice { font-size: 12px; background: #f3f4f6; border: 1px solid #d1d5db; padding: 8px 12px; border-radius: 6px; margin-bottom: 14px; color: #1f2937; line-height: 1.5; }
    .card { border: 1.5px solid #111827; border-radius: 8px; padding: 10px; margin-bottom: 16px; page-break-inside: avoid; }
    .card-head { display: flex; justify-content: space-between; font-weight: 700; font-size: 12px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; margin-bottom: 8px; }
    .operator-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 8px; border-radius: 6px; margin-bottom: 10px; font-family: monospace; font-size: 13px; }
    .op-nums { font-weight: 800; letter-spacing: 0.04em; }
    .op-bonus { font-weight: 700; background: #111827; color: #fff; padding: 1px 6px; border-radius: 3px; font-size: 11px; margin-left: 4px; }
    .panels-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .panel { border: 1px solid #9ca3af; border-radius: 6px; padding: 6px; }
    .panel-title { font-size: 11px; font-weight: 700; font-family: monospace; display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }
    .grid { display: grid; gap: 2px; }
    .cell { font-family: monospace; font-size: 10px; text-align: center; padding: 2px 0; border: 1px solid #d1d5db; border-radius: 3px; color: #6b7280; }
    .cell.marked { background: #111827; color: #ffffff; border-color: #111827; font-weight: 900; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .bonus-row { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin-top: 5px; padding-top: 4px; border-top: 1px dashed #d1d5db; font-family: monospace; font-size: 9px; }
    .bonus-title { font-weight: 700; margin-right: 2px; }
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
      <h1>The Win Concept: ${gameName} Playslip Sheet</h1>
      <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">Non-Overlapping Ticket Set${
        targetDrawNumber ? ` for Draw ${targetDrawNumber}` : ""
      }</div>
    </div>
    <div class="meta">
      <div><strong>${slips.length} Slips</strong> (${cards.length} Official Card${cards.length > 1 ? "s" : ""})</div>
      <div>Total: <strong>$${totalCostTT}.00 TTD</strong></div>
    </div>
  </div>
  <div class="notice">
    <strong>Booth and Machine Notice:</strong> NLCB ticket machines only scan official NLCB playslip paper printed with special scanner ink and edge marks. Use the darkened boxes below to shade your official Panels A to E accurately in seconds, or hand the Panel A to E list to your NLCB booth operator to enter directly.
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-5 font-sans">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-[#0a0f1a] border border-white/15 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-slate-950/80">
          <div className="space-y-0.5">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Print and Export {gameName} Betting Slips
            </h2>
            <p className="text-xs text-slate-400">
              {slips.length} slips across {cards.length} official 5-panel card{cards.length > 1 ? "s" : ""}, estimated total ${totalCostTT}.00 TTD
              {targetDrawNumber ? ` for Draw ${targetDrawNumber}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plain-English NLCB Machine Notice */}
        <div className="px-4 sm:px-6 py-3 bg-amber-950/25 border-b border-amber-500/20 flex items-start gap-2.5 text-sm text-amber-100/90 leading-relaxed">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
          <span>
            <strong className="text-amber-300">About NLCB Ticket Machines:</strong> NLCB optical scanners only read official NLCB paper slips. Use this printable sheet as a <strong>Panel A to E shading guide</strong> for your official card, or hand the <strong>Booth Agent List</strong> directly to the operator to key in.
          </span>
        </div>

        {/* Export Action Toolbar */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/50 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintSheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print or Save PDF</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Text File</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Spreadsheet (CSV)</span>
            </button>
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                  <span>Copy All</span>
                </>
              )}
            </button>
          </div>

          <div className="inline-flex rounded-lg bg-slate-900 border border-white/10 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition ${
                viewMode === "visual" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Bubble Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("operator")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition ${
                viewMode === "operator" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
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
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.06] text-xs">
                <h3 className="text-base font-bold text-white">
                  Official NLCB Card {card.cardNum} (Panels A to {card.panels[card.panels.length - 1].letter})
                </h3>
                <span className="text-emerald-300 font-semibold">
                  {card.panels.length} slips, ${card.panels.length * unitCostTT}.00 TTD
                  {gameKey === "cashpot" && multiplierIncluded ? ", Multiplier: Yes" : ""}
                </span>
              </div>

              {viewMode === "operator" ? (
                <div className="space-y-2">
                  {card.panels.map((p) => (
                    <div
                      key={p.letter}
                      className="px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-white/[0.06] flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-bold text-slate-400 uppercase">Panel {p.letter}</span>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="text-base font-mono font-bold text-white tracking-wider tabular-nums">
                          {p.nums.map((n) => String(n).padStart(2, "0")).join(", ")}
                        </span>
                        {p.bonus !== undefined && bonusFullName && (
                          <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold">
                            {bonusFullName} {String(p.bonus).padStart(2, "0")}
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
                        <div className="flex items-center justify-between text-xs pb-1.5 border-b border-white/[0.06]">
                          <span className="font-bold text-sky-300">Panel {p.letter}</span>
                          <span className="text-slate-200 font-mono font-bold tabular-nums">
                            {p.nums.map((n) => String(n).padStart(2, "0")).join(" ")}
                          </span>
                        </div>
                        <div
                          className="grid gap-1 font-mono text-xs"
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
                                    : "bg-slate-950/70 text-slate-500 border-white/[0.05]"
                                }`}
                              >
                                {String(n).padStart(2, "0")}
                              </div>
                            );
                          })}
                        </div>
                        {p.bonus !== undefined && bonusFullName && (
                          <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                            <span className="text-xs text-slate-400 font-semibold block">
                              {bonusFullName} (1 to 10):
                            </span>
                            <div className="grid grid-cols-10 gap-1 font-mono text-xs">
                              {Array.from({ length: 10 }, (_, i) => {
                                const b = i + 1;
                                const marked = b === p.bonus;
                                return (
                                  <span
                                    key={b}
                                    className={`py-0.5 rounded flex items-center justify-center ${
                                      marked
                                        ? "bg-amber-400 text-slate-950 font-black"
                                        : "bg-slate-950 text-slate-500"
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
