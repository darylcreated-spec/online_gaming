"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  Info,
  Grid,
  List
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { CHINAPOO_CHART } from "@/lib/playwhe";
import {
  copyTextToClipboard,
  downloadBlobFile,
  printHtmlDocument
} from "@/lib/export_helpers";

export type ExportableGameKey =
  | "cashpot"
  | "lotto-plus"
  | "win-for-life"
  | "play-whe"
  | "pick4"
  | "fast-cash";

export interface BetSlipExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameKey: ExportableGameKey;
  gameName: string;
  targetDrawNumber?: number;
  slips: number[][];
  bonusBalls?: number[];
  unitCostTT: number;
  multiplierIncluded?: boolean;
  playLabels?: string[];
}

const PANEL_LETTERS = ["A", "B", "C", "D", "E"];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatFastCashPocket(n: number): string {
  if (n === 37 || n === -1) return "00";
  if (n === 0) return "0";
  return String(n).padStart(2, "0");
}

function getPick4TypeLabel(digits: number[], override?: string): string {
  if (override) return override;
  const unique = new Set(digits).size;
  if (unique === 4) return "24-Way Box or Straight";
  if (unique === 3) return "12-Way Twin Box or Straight";
  if (unique === 2) return "6-Way or 4-Way Box";
  return "Straight";
}

export default function BetSlipExportModal({
  isOpen,
  onClose,
  gameKey,
  gameName,
  targetDrawNumber,
  slips,
  bonusBalls = [],
  unitCostTT,
  multiplierIncluded = true,
  playLabels
}: BetSlipExportModalProps) {
  const [viewMode, setViewMode] = useState<"visual" | "operator">("visual");
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll and allow Escape key to close while open
  useEffect(() => {
    if (!isOpen) return;
    setStatusMessage(null);
    setCopied(false);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const isMultiBallCardGame =
    gameKey === "cashpot" || gameKey === "lotto-plus" || gameKey === "win-for-life";
  const isPlayWhe = gameKey === "play-whe";
  const isPick4 = gameKey === "pick4";
  const isFastCash = gameKey === "fast-cash";

  // Normalize single-number games (Play Whe / Fast Cash) so both [[18, 2, 14]] and [[18], [2], [14]] work cleanly
  const normalizedSlips: number[][] = (() => {
    if (isPlayWhe || isFastCash) {
      const seen = new Set<number>();
      const singlePlays: number[][] = [];
      for (const s of slips) {
        for (const n of s) {
          if (!seen.has(n)) {
            seen.add(n);
            singlePlays.push([n]);
          }
        }
      }
      return singlePlays;
    }
    if (isPick4) {
      // Preserve exact positional order for Pick 4 digits (0-9)
      return slips.filter((s) => s.length > 0).map((s) => [...s]);
    }
    return slips.filter((s) => s.length > 0).map((s) => [...s].sort((a, b) => a - b));
  })();

  const maxBall = gameKey === "cashpot" ? 20 : gameKey === "win-for-life" ? 28 : 35;
  const gridCols = gameKey === "win-for-life" ? 7 : 5;
  const bonusFullName =
    gameKey === "win-for-life" ? "Cash Ball" : gameKey === "lotto-plus" ? "Powerball" : "";
  const bonusMax = gameKey === "win-for-life" ? 3 : 10;

  const getBonusForIndex = (idx: number): number | undefined => {
    if (!bonusFullName || bonusBalls.length === 0) return undefined;
    const raw =
      bonusBalls[idx] !== undefined
        ? bonusBalls[idx]
        : bonusBalls[idx % bonusBalls.length];
    if (raw === undefined || raw === null || Number.isNaN(Number(raw))) return undefined;
    const n = Number(raw);
    if (gameKey === "win-for-life") {
      return n >= 1 && n <= 3 ? n : ((Math.abs(n) - 1) % 3) + 1;
    }
    return n >= 1 && n <= 10 ? n : ((Math.abs(n) - 1) % 10) + 1;
  };

  const totalSlips = normalizedSlips.length;
  const totalCostTT = totalSlips * unitCostTT;

  // Group multi-ball slips into physical 5-panel NLCB cards (Panels A to E)
  const cards: {
    cardNum: number;
    panels: { letter: string; slipIdx: number; nums: number[]; bonus?: number }[];
  }[] = [];
  if (isMultiBallCardGame) {
    for (let i = 0; i < normalizedSlips.length; i += 5) {
      const slice = normalizedSlips.slice(i, i + 5);
      cards.push({
        cardNum: Math.floor(i / 5) + 1,
        panels: slice.map((nums, idx) => ({
          letter: PANEL_LETTERS[idx],
          slipIdx: i + idx,
          nums,
          bonus: getBonusForIndex(i + idx)
        }))
      });
    }
  }

  const fileStem = `NLCB_${gameKey}_${totalSlips}${
    isPlayWhe ? "marks" : isFastCash ? "numbers" : "slips"
  }${targetDrawNumber ? `_draw${targetDrawNumber}` : ""}`;

  const flashStatus = (msg: string) => {
    setStatusMessage(msg);
    window.setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const buildPlainText = () => {
    const unitLabel = isPlayWhe ? "Marks" : isFastCash ? "Numbers" : "Slips";
    const lines: string[] = [
      `THE WIN CONCEPT - NLCB PLAYSLIP SHEET`,
      `Game: ${gameName}${targetDrawNumber ? ` | Target Draw ${targetDrawNumber}` : ""}`,
      isMultiBallCardGame
        ? `Slips: ${totalSlips} (${cards.length} official 5-panel card${cards.length === 1 ? "" : "s"}) | Estimated Total: $${totalCostTT}.00 TTD${
            gameKey === "cashpot" && multiplierIncluded ? " (with Multiplier)" : ""
          }`
        : `${unitLabel}: ${totalSlips} | Estimated Total: $${totalCostTT}.00 TTD (at $${unitCostTT}.00 each)`,
      `======================================================`,
      ""
    ];

    if (isMultiBallCardGame) {
      for (const card of cards) {
        lines.push(
          `CARD ${card.cardNum} (Panels A to ${card.panels[card.panels.length - 1].letter})`
        );
        for (const p of card.panels) {
          const numStr = p.nums.map((n) => String(n).padStart(2, "0")).join(", ");
          const bStr =
            p.bonus !== undefined && bonusFullName
              ? ` | ${bonusFullName}: ${String(p.bonus).padStart(2, "0")}`
              : "";
          lines.push(`  Panel ${p.letter}:  ${numStr}${bStr}`);
        }
        lines.push("");
      }
    } else if (isPlayWhe) {
      lines.push("PLAY WHE MARKS (CHINAPOO CHART):");
      normalizedSlips.forEach((s, idx) => {
        const markNum = s[0];
        const markName = CHINAPOO_CHART[markNum]?.mark || `Mark ${markNum}`;
        const label = playLabels?.[idx] ? ` (${playLabels[idx]})` : "";
        lines.push(
          `  Mark ${String(idx + 1).padStart(2, "0")}: ${String(markNum).padStart(2, "0")} - ${markName}${label} | $${unitCostTT}.00 TTD`
        );
      });
      lines.push("");
    } else if (isPick4) {
      lines.push("PICK 4 DIGIT COMBINATIONS:");
      normalizedSlips.forEach((digits, idx) => {
        const playType = getPick4TypeLabel(digits, playLabels?.[idx]);
        lines.push(
          `  Set ${String(idx + 1).padStart(2, "0")}: ${digits.join(" - ")} | ${playType} | $${unitCostTT}.00 TTD`
        );
      });
      lines.push("");
    } else if (isFastCash) {
      lines.push("FAST CASH BOARD NUMBERS (38 POCKETS):");
      normalizedSlips.forEach((s, idx) => {
        const pocket = formatFastCashPocket(s[0]);
        lines.push(`  Pick ${String(idx + 1).padStart(2, "0")}: ${pocket} | $${unitCostTT}.00 TTD`);
      });
      lines.push("");
    }

    lines.push(
      "Note: Copy these numbers onto official NLCB playslip cards or hand this list to an NLCB booth operator."
    );
    return lines.join("\n");
  };

  const buildCsvText = () => {
    if (isMultiBallCardGame) {
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
      return [header, ...rows].join("\n");
    }

    if (isPlayWhe) {
      const header = "PlayNumber,MarkNumber,ChinapooName,CostTTD";
      const rows = normalizedSlips.map((s, idx) => {
        const markNum = s[0];
        const markName = (CHINAPOO_CHART[markNum]?.mark || `Mark ${markNum}`).replace(/,/g, "");
        return [idx + 1, markNum, `"${markName}"`, unitCostTT].join(",");
      });
      return [header, ...rows].join("\n");
    }

    if (isPick4) {
      const header = "SetNumber,Pos1,Pos2,Pos3,Pos4,Digits,PlayType,CostTTD";
      const rows = normalizedSlips.map((d, idx) =>
        [
          idx + 1,
          d[0] ?? "",
          d[1] ?? "",
          d[2] ?? "",
          d[3] ?? "",
          `"${d.join("-")}"`,
          `"${getPick4TypeLabel(d, playLabels?.[idx])}"`,
          unitCostTT
        ].join(",")
      );
      return [header, ...rows].join("\n");
    }

    const header = "PickNumber,PocketNumber,CostTTD";
    const rows = normalizedSlips.map((s, idx) =>
      [idx + 1, `"${formatFastCashPocket(s[0])}"`, unitCostTT].join(",")
    );
    return [header, ...rows].join("\n");
  };

  const buildPrintableHtml = () => {
    const safeGameName = escapeHtml(gameName);

    const renderBubbleGridHtml = (nums: number[], bonus?: number) => {
      const set = new Set(nums);
      const cells = Array.from({ length: maxBall }, (_, i) => {
        const n = i + 1;
        const active = set.has(n);
        return `<div class="cell ${active ? "marked" : ""}">${String(n).padStart(2, "0")}</div>`;
      }).join("");

      const bonusCols = bonusMax <= 3 ? 3 : 5;
      const bonusHtml =
        bonusFullName && bonus !== undefined
          ? `<div class="bonus-block">
              <div class="bonus-title">${escapeHtml(bonusFullName)} (1 to ${bonusMax}):</div>
              <div class="bonus-grid" style="grid-template-columns: repeat(${bonusCols}, 1fr);">
                ${Array.from({ length: bonusMax }, (_, i) => {
                  const b = i + 1;
                  return `<span class="bcell ${b === bonus ? "bmarked" : ""}">${b}</span>`;
                }).join("")}
              </div>
            </div>`
          : "";

      return `
        <div class="grid" style="grid-template-columns: repeat(${gridCols}, 1fr);">${cells}</div>
        ${bonusHtml}
      `;
    };

    let bodySectionsHtml = "";

    if (isMultiBallCardGame) {
      bodySectionsHtml = cards
        .map(
          (card) => `
      <div class="card">
        <div class="card-head">
          <span>OFFICIAL PLAYSLIP CARD ${card.cardNum} (Panels A to ${card.panels[card.panels.length - 1].letter})</span>
          <span>${safeGameName} | ${card.panels.length} Panel${card.panels.length === 1 ? "" : "s"} | $${card.panels.length * unitCostTT}.00 TTD${
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
                    ? ` <span class="op-bonus">${escapeHtml(bonusFullName)} ${String(p.bonus).padStart(2, "0")}</span>`
                    : ""
                }</div>`
            )
            .join("")}
        </div>
        <div class="panels-grid" style="grid-template-columns: repeat(${Math.min(5, card.panels.length)}, 1fr);">
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
      </div>`
        )
        .join("");
    } else if (isPlayWhe) {
      const selectedSet = new Set(normalizedSlips.map((s) => s[0]));
      bodySectionsHtml = `
      <div class="card">
        <div class="card-head">
          <span>PLAY WHE MARKS SHEET (${totalSlips} Mark${totalSlips === 1 ? "" : "s"})</span>
          <span>$${unitCostTT}.00 per mark | Total: $${totalCostTT}.00 TTD</span>
        </div>
        <div class="operator-list">
          ${normalizedSlips
            .map((s, idx) => {
              const mark = s[0];
              const name = escapeHtml(CHINAPOO_CHART[mark]?.mark || `Mark ${mark}`);
              return `<div class="op-row"><strong>Mark ${idx + 1}:</strong> <span class="op-nums">${String(mark).padStart(2, "0")}</span> (${name})</div>`;
            })
            .join("")}
        </div>
        <div class="grid" style="grid-template-columns: repeat(6, 1fr); gap: 4px;">
          ${Array.from({ length: 36 }, (_, i) => {
            const n = i + 1;
            const active = selectedSet.has(n);
            const name = escapeHtml(CHINAPOO_CHART[n]?.mark || "");
            return `<div class="cell ${active ? "marked" : ""}" style="padding: 5px 3px;">
              <div style="font-size: 12px; font-weight: 800;">${String(n).padStart(2, "0")}</div>
              <div style="font-size: 8px; opacity: 0.85; margin-top: 1px;">${name}</div>
            </div>`;
          }).join("")}
        </div>
      </div>`;
    } else if (isPick4) {
      bodySectionsHtml = `
      <div class="card">
        <div class="card-head">
          <span>PICK 4 COMBINATIONS SHEET (${totalSlips} Set${totalSlips === 1 ? "" : "s"})</span>
          <span>$${unitCostTT}.00 per play | Total: $${totalCostTT}.00 TTD</span>
        </div>
        <div class="operator-list">
          ${normalizedSlips
            .map((d, idx) => {
              const type = escapeHtml(getPick4TypeLabel(d, playLabels?.[idx]));
              return `<div class="op-row"><strong>Set ${idx + 1}:</strong> <span class="op-nums">${d.join(" - ")}</span> <span class="op-bonus">${type}</span></div>`;
            })
            .join("")}
        </div>
        <div class="panels-grid" style="grid-template-columns: repeat(${Math.min(4, Math.max(1, normalizedSlips.length))}, 1fr);">
          ${normalizedSlips
            .map(
              (digits, idx) => `
            <div class="panel">
              <div class="panel-title">SET ${idx + 1} <span>${digits.join(" - ")}</span></div>
              <div class="grid" style="grid-template-columns: repeat(4, 1fr); gap: 3px;">
                ${[0, 1, 2, 3]
                  .map(
                    (pos) => `
                  <div>
                    <div style="font-size: 8px; text-align: center; font-weight: 700; margin-bottom: 2px;">P${pos + 1}</div>
                    ${Array.from({ length: 10 }, (_, digit) => {
                      const active = digits[pos] === digit;
                      return `<div class="cell ${active ? "marked" : ""}" style="margin-bottom: 2px;">${digit}</div>`;
                    }).join("")}
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>`;
    } else {
      const selectedSet = new Set(normalizedSlips.map((s) => s[0]));
      const allPockets = [0, 37, ...Array.from({ length: 36 }, (_, i) => i + 1)];
      bodySectionsHtml = `
      <div class="card">
        <div class="card-head">
          <span>FAST CASH BOARD SHEET (${totalSlips} Number${totalSlips === 1 ? "" : "s"})</span>
          <span>$${unitCostTT}.00 per number | Total: $${totalCostTT}.00 TTD</span>
        </div>
        <div class="operator-list">
          <div class="op-row" style="grid-column: 1 / -1;">
            <strong>Selected Numbers:</strong>
            <span class="op-nums">${normalizedSlips.map((s) => formatFastCashPocket(s[0])).join(", ")}</span>
          </div>
        </div>
        <div class="grid" style="grid-template-columns: repeat(8, 1fr); gap: 4px;">
          ${allPockets
            .map((p) => {
              const active = selectedSet.has(p);
              return `<div class="cell ${active ? "marked" : ""}" style="padding: 6px 2px; font-size: 12px;">${formatFastCashPocket(p)}</div>`;
            })
            .join("")}
        </div>
      </div>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>NLCB ${safeGameName} Playslip Sheet (${totalSlips})</title>
  <style>
    @page { margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 16px; background: #ffffff; }
    .print-toolbar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 12px; }
    .print-btn { background: #111827; color: #ffffff; border: none; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 18px; letter-spacing: 0.01em; }
    .header .meta { font-size: 12px; color: #374151; text-align: right; }
    .notice { font-size: 12px; background: #f3f4f6; border: 1px solid #d1d5db; padding: 8px 12px; border-radius: 6px; margin-bottom: 14px; color: #1f2937; line-height: 1.5; }
    .card { border: 1.5px solid #111827; border-radius: 8px; padding: 10px; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; }
    .card-head { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; font-weight: 700; font-size: 12px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; margin-bottom: 8px; }
    .operator-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 8px; border-radius: 6px; margin-bottom: 10px; font-family: monospace; font-size: 12px; }
    .op-nums { font-weight: 800; letter-spacing: 0.04em; }
    .op-bonus { font-weight: 700; background: #111827; color: #ffffff; padding: 1px 6px; border-radius: 3px; font-size: 10px; margin-left: 4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .panels-grid { display: grid; gap: 8px; }
    .panel { border: 1px solid #9ca3af; border-radius: 6px; padding: 5px; }
    .panel-title { font-size: 10px; font-weight: 700; font-family: monospace; display: flex; justify-content: space-between; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }
    .grid { display: grid; gap: 2px; }
    .cell { font-family: monospace; font-size: 10px; text-align: center; padding: 2px 0; border: 1px solid #d1d5db; border-radius: 3px; color: #6b7280; }
    .cell.marked { background: #111827; color: #ffffff; border-color: #111827; font-weight: 900; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .bonus-block { margin-top: 5px; padding-top: 4px; border-top: 1px dashed #d1d5db; font-family: monospace; }
    .bonus-title { font-size: 9px; font-weight: 700; margin-bottom: 3px; color: #374151; }
    .bonus-grid { display: grid; gap: 2px; }
    .bcell { font-size: 9px; text-align: center; padding: 1px 0; border: 1px solid #d1d5db; border-radius: 2px; color: #6b7280; }
    .bcell.bmarked { background: #111827; color: #ffffff; border-color: #111827; font-weight: 900; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <button type="button" class="print-btn" onclick="window.print()">Print or Save as PDF</button>
  </div>
  <div class="header">
    <div>
      <h1>The Win Concept: ${safeGameName} Playslip Sheet</h1>
      <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">Prepared Ticket Sheet${
        targetDrawNumber ? ` for Draw ${targetDrawNumber}` : ""
      }</div>
    </div>
    <div class="meta">
      <div><strong>${totalSlips} ${isPlayWhe ? "Marks" : isFastCash ? "Numbers" : "Slips"}</strong>${
        isMultiBallCardGame ? ` (${cards.length} Official Card${cards.length === 1 ? "" : "s"})` : ""
      }</div>
      <div>Estimated Total: <strong>$${totalCostTT}.00 TTD</strong></div>
    </div>
  </div>
  <div class="notice">
    <strong>Booth and Machine Notice:</strong> NLCB ticket machines only scan official NLCB playslip paper printed with special scanner ink and edge marks. Use the darkened boxes below to shade your official NLCB card accurately, or hand the Agent List directly to an NLCB booth operator to enter.
  </div>
  ${bodySectionsHtml}
</body>
</html>`;
  };

  const handleCopyText = async () => {
    triggerHaptic("success");
    const ok = await copyTextToClipboard(buildPlainText());
    if (ok) {
      setCopied(true);
      flashStatus(`Copied all ${totalSlips} ${gameName} lines to clipboard.`);
      window.setTimeout(() => setCopied(false), 2200);
    } else {
      flashStatus("Could not access clipboard. Use Text File or Printable Sheet instead.");
    }
  };

  const handleDownloadTxt = () => {
    triggerHaptic("selection");
    const filename = `${fileStem}.txt`;
    const ok = downloadBlobFile(buildPlainText(), filename, "text/plain;charset=utf-8");
    flashStatus(ok ? `Downloaded ${filename}.` : "Download failed. Try Copy All instead.");
  };

  const handleDownloadCsv = () => {
    triggerHaptic("selection");
    const filename = `${fileStem}.csv`;
    const ok = downloadBlobFile(buildCsvText(), filename, "text/csv;charset=utf-8");
    flashStatus(ok ? `Downloaded ${filename}.` : "CSV download failed. Try Copy All instead.");
  };

  const handleDownloadPrintableHtml = () => {
    triggerHaptic("selection");
    const filename = `${fileStem}_printable.html`;
    const ok = downloadBlobFile(buildPrintableHtml(), filename, "text/html;charset=utf-8");
    flashStatus(
      ok
        ? `Downloaded ${filename}. Open it on any phone or computer to print or save as PDF.`
        : "Could not save printable sheet."
    );
  };

  const handlePrintSheet = () => {
    triggerHaptic("medium");
    const result = printHtmlDocument(buildPrintableHtml(), `${fileStem}_printable.html`);
    if (result.ok && result.method === "print") {
      flashStatus("Print window opened. Choose your printer or Save as PDF.");
    } else if (result.ok && result.method === "download") {
      flashStatus(
        "Direct print is restricted in this browser. Downloaded a printable sheet file instead."
      );
    } else {
      flashStatus("Could not open print dialog. Use Printable Sheet or Text File instead.");
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="betslip-export-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 font-sans"
    >
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0a0f1a] border border-white/15 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-slate-950/90">
          <div className="space-y-0.5 min-w-0">
            <h2
              id="betslip-export-modal-title"
              className="text-lg sm:text-xl font-bold text-white"
            >
              Print and Export {gameName} Betting Slips
            </h2>
            <p className="text-xs text-slate-400">
              {isMultiBallCardGame
                ? `${totalSlips} slips across ${cards.length} official 5-panel card${cards.length === 1 ? "" : "s"}, estimated total $${totalCostTT}.00 TTD`
                : `${totalSlips} ${isPlayWhe ? "marks" : isFastCash ? "numbers" : "sets"}, estimated total $${totalCostTT}.00 TTD`}
              {targetDrawNumber ? ` for Draw ${targetDrawNumber}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plain-English NLCB Machine Notice */}
        <div className="px-4 sm:px-6 py-3 bg-amber-950/25 border-b border-amber-500/20 flex items-start gap-2.5 text-sm text-amber-100/90 leading-relaxed">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
          <span>
            <strong className="text-amber-300">About NLCB Ticket Machines:</strong> NLCB optical
            scanners only read official NLCB paper slips. Use this printable sheet as a{" "}
            <strong>shading guide</strong> for your official card, or hand the{" "}
            <strong>Agent List</strong> directly to the booth operator to enter.
          </span>
        </div>

        {/* Export Action Toolbar */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/60 border-b border-white/[0.06] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrintSheet}
                disabled={totalSlips === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print or Save PDF</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPrintableHtml}
                disabled={totalSlips === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-white/10 text-slate-100 text-xs font-semibold transition cursor-pointer"
                title="Download a clean white-background printable sheet you can open on any device"
              >
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                <span>Printable File</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                disabled={totalSlips === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-white/10 text-slate-100 text-xs font-semibold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Text File</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={totalSlips === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-white/10 text-slate-100 text-xs font-semibold transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Spreadsheet (CSV)</span>
              </button>
              <button
                type="button"
                onClick={handleCopyText}
                disabled={totalSlips === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-white/10 text-slate-100 text-xs font-semibold transition cursor-pointer"
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
                  viewMode === "visual"
                    ? "bg-slate-800 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Bubble Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("operator")}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition ${
                  viewMode === "operator"
                    ? "bg-slate-800 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Agent List</span>
              </button>
            </div>
          </div>

          {statusMessage && (
            <div
              role="status"
              className="px-3 py-2 rounded-lg bg-emerald-950/50 border border-emerald-500/35 text-xs text-emerald-200 font-medium"
            >
              {statusMessage}
            </div>
          )}
        </div>

        {/* Scrollable Preview Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {totalSlips === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/60 border border-white/10 text-center text-sm text-slate-400">
              No slips are ready to export yet. Generate at least one slip first.
            </div>
          ) : isMultiBallCardGame ? (
            cards.map((card) => (
              <div
                key={card.cardNum}
                className="rounded-xl bg-[#070b14] border border-white/[0.08] p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.06] text-xs">
                  <h3 className="text-base font-bold text-white">
                    Official NLCB Card {card.cardNum} (Panels A to{" "}
                    {card.panels[card.panels.length - 1].letter})
                  </h3>
                  <span className="text-emerald-300 font-semibold">
                    {card.panels.length} slip{card.panels.length === 1 ? "" : "s"}, $
                    {card.panels.length * unitCostTT}.00 TTD
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
                        <span className="text-xs font-bold text-slate-400 uppercase">
                          Panel {p.letter}
                        </span>
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
                            style={{
                              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`
                            }}
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
                                {bonusFullName} (1 to {bonusMax}):
                              </span>
                              <div
                                className="grid gap-1 font-mono text-xs"
                                style={{
                                  gridTemplateColumns: `repeat(${bonusMax <= 3 ? 3 : 5}, minmax(0, 1fr))`
                                }}
                              >
                                {Array.from({ length: bonusMax }, (_, i) => {
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
            ))
          ) : isPlayWhe ? (
            <div className="rounded-xl bg-[#070b14] border border-white/[0.08] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.06] text-xs">
                <h3 className="text-base font-bold text-white">
                  Play Whe Marks Sheet ({totalSlips} Mark{totalSlips === 1 ? "" : "s"})
                </h3>
                <span className="text-emerald-300 font-semibold">
                  ${unitCostTT}.00 per mark, Total ${totalCostTT}.00 TTD
                </span>
              </div>
              {viewMode === "operator" ? (
                <div className="space-y-2">
                  {normalizedSlips.map((s, idx) => {
                    const mark = s[0];
                    const name = CHINAPOO_CHART[mark]?.mark || `Mark ${mark}`;
                    return (
                      <div
                        key={mark}
                        className="px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-white/[0.06] flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-bold text-slate-400">
                          Mark {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-mono font-bold text-amber-300">
                            {String(mark).padStart(2, "0")}
                          </span>
                          <span className="text-sm text-white font-semibold">{name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 font-mono text-xs">
                  {Array.from({ length: 36 }, (_, i) => {
                    const n = i + 1;
                    const marked = normalizedSlips.some((s) => s[0] === n);
                    const name = CHINAPOO_CHART[n]?.mark || "";
                    return (
                      <div
                        key={n}
                        className={`p-2 rounded-lg text-center border ${
                          marked
                            ? "bg-amber-400 text-slate-950 border-amber-300 font-black"
                            : "bg-slate-950/70 text-slate-500 border-white/[0.05]"
                        }`}
                      >
                        <div className="text-sm font-bold">{String(n).padStart(2, "0")}</div>
                        <div className="text-[11px] font-sans truncate opacity-85">{name}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : isPick4 ? (
            <div className="rounded-xl bg-[#070b14] border border-white/[0.08] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.06] text-xs">
                <h3 className="text-base font-bold text-white">
                  Pick 4 Digit Combinations ({totalSlips} Set{totalSlips === 1 ? "" : "s"})
                </h3>
                <span className="text-emerald-300 font-semibold">
                  ${unitCostTT}.00 per play, Total ${totalCostTT}.00 TTD
                </span>
              </div>
              {viewMode === "operator" ? (
                <div className="space-y-2">
                  {normalizedSlips.map((d, idx) => (
                    <div
                      key={idx}
                      className="px-3.5 py-2.5 rounded-lg bg-slate-900/80 border border-white/[0.06] flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-bold text-slate-400">Set {idx + 1}</span>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="text-base font-mono font-bold text-white tracking-widest">
                          {d.join(" - ")}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-semibold">
                          {getPick4TypeLabel(d, playLabels?.[idx])}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {normalizedSlips.map((digits, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900/70 border border-white/[0.07] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-white/[0.06]">
                        <span className="font-bold text-purple-300">
                          Set {idx + 1} ({getPick4TypeLabel(digits, playLabels?.[idx])})
                        </span>
                        <span className="text-white font-mono font-bold tracking-wider">
                          {digits.join(" - ")}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                        {[0, 1, 2, 3].map((pos) => (
                          <div key={pos} className="space-y-1">
                            <div className="text-center text-slate-400 font-semibold">
                              Pos {pos + 1}
                            </div>
                            {Array.from({ length: 10 }, (_, digit) => {
                              const marked = digits[pos] === digit;
                              return (
                                <div
                                  key={digit}
                                  className={`py-0.5 rounded text-center border ${
                                    marked
                                      ? "bg-purple-400 text-slate-950 border-purple-300 font-black"
                                      : "bg-slate-950/70 text-slate-500 border-white/[0.05]"
                                  }`}
                                >
                                  {digit}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-[#070b14] border border-white/[0.08] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.06] text-xs">
                <h3 className="text-base font-bold text-white">
                  Fast Cash Board Sheet ({totalSlips} Number{totalSlips === 1 ? "" : "s"})
                </h3>
                <span className="text-emerald-300 font-semibold">
                  ${unitCostTT}.00 per number, Total ${totalCostTT}.00 TTD
                </span>
              </div>
              {viewMode === "operator" ? (
                <div className="p-3.5 rounded-lg bg-slate-900/80 border border-white/[0.06] space-y-1.5">
                  <div className="text-xs font-bold text-slate-400">Selected Board Numbers</div>
                  <div className="text-base font-mono font-bold text-cyan-300 tracking-wider">
                    {normalizedSlips.map((s) => formatFastCashPocket(s[0])).join(", ")}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 font-mono text-xs">
                  {[0, 37, ...Array.from({ length: 36 }, (_, i) => i + 1)].map((pocket) => {
                    const marked = normalizedSlips.some((s) => s[0] === pocket);
                    return (
                      <div
                        key={pocket}
                        className={`py-2 rounded-lg text-center border ${
                          marked
                            ? "bg-cyan-400 text-slate-950 border-cyan-300 font-black"
                            : "bg-slate-950/70 text-slate-500 border-white/[0.05]"
                        }`}
                      >
                        {formatFastCashPocket(pocket)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
