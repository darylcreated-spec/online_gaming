/**
 * consensus_engine.ts
 * ===================
 * Unified In-App Cross-Engine Consensus & Pre-Draw Lock Engine across ALL 6 NLCB games.
 *
 * Aggregates every active quantitative engine per game (Steiner Top 10, Lucky 7,
 * Forensic Engine, Quant 100%, Diff Involution Engine, Winning Formula / Fast Cash Sector Engine),
 * identifies unanimous consensus numbers and multi-engine slip convergences, persists timestamped
 * pre-draw locks in Turso DB (`consensus_pre_draw_locks`), and automatically grades locked cards
 * with zero hindsight the instant official winning numbers enter the database.
 */

import { db, query } from "@/lib/db";
import { ensureFastCashSchema, queryFastCash } from "@/lib/fastcash_db";
import { executeLucky7Engine, Lucky7GameKey } from "@/lib/lucky7_engine";
import {
  formatTrevorBall,
  getTrevorGameMeta,
  TrevorHistoricalDraw
} from "@/lib/trevor_engine";
import { executeCashPotForensicEngine } from "@/lib/cashpot_forensic_engine";
import { computeCashPotQuant100Engine } from "@/lib/cashpot_quant100_engine";
import { CashPotDiffEngine } from "@/lib/cashpot_diff20_engine";
import { executeLottoForensicEngine } from "@/lib/lotto_forensic_engine";
import { computeLottoQuant100Engine } from "@/lib/lotto_quant100_engine";
import { computeSum35DiffEngine } from "@/lib/lotto_diff35_engine";
import { executeWinForLifeForensicEngine } from "@/lib/winforlife_forensic_engine";
import { computeWinForLifeQuant100Engine } from "@/lib/winforlife_quant100_engine";
import { computeWinForLifeDiff28Engine } from "@/lib/winforlife_diff28_engine";
import { executePlayWheForensicEngine } from "@/lib/playwhe_forensic_engine";
import { computePlayWheQuant100Engine } from "@/lib/playwhe_quant100_engine";
import { PlayWheDiff37Engine } from "@/lib/playwhe_diff37_engine";
import { executePick4ForensicEngine } from "@/lib/pick4_forensic_engine";
import { computePick4Quant100Engine } from "@/lib/pick4_quant100_engine";
import { computePick4Diff9Engine } from "@/lib/pick4_diff9_engine";
import {
  computeCashPotFormulaPick,
  computeLottoPlusFormulaPick,
  computePick4FormulaPick,
  computePlayWheFormulaPick,
  computeWinForLifeFormulaPick
} from "@/lib/winning_formula_engine";
import { runFastCashEngine } from "@/lib/fastcash_engine";
import { CHINAPOO_CHART } from "@/lib/playwhe";

export type ConsensusGameKey = Lucky7GameKey;

export interface ConsensusNumberRank {
  number: number;
  label: string;
  engineAgreement: number;
  totalEngines: number;
  agreementPct: number;
  totalSlipVotes: number;
  agreeingEngines: string[];
}

export interface ConsensusConvergenceCard {
  title: string;
  sharedNumbers: number[];
  engines: string[];
  overlapSize: number;
  note: string;
}

export interface ConsensusEngineSummary {
  engineKey: string;
  engineName: string;
  slips: number[][];
  bonusBalls?: number[];
  primaryLabel: string;
}

export interface LockedPreDrawRecord {
  id: number;
  gameKey: ConsensusGameKey;
  targetDrawNumber: number;
  targetSlot?: string;
  lockedAt: string;
  consensusTicket: number[];
  consensusBonus?: number;
  topConsensusPool: number[];
  engineSummaries: ConsensusEngineSummary[];
  status: "PENDING" | "GRADED";
  actualNumbers?: number[];
  actualBonus?: number;
  consensusTicketMatch?: number;
  bestEngineName?: string;
  bestEngineMatch?: number;
  bestEngineSlip?: number[];
  gradedAt?: string;
}

export interface CrossEngineConsensusResult {
  game: ConsensusGameKey;
  gameName: string;
  themeColor: "yellow" | "sky" | "emerald" | "amber" | "purple" | "rose";
  unitCostTT: number;
  bonusName?: string;
  totalEnginesChecked: number;
  nextTargetDrawNumber: number;
  nextTargetSlot?: string;
  latestDraw?: {
    drawNumber: number;
    drawDate: string;
    timeSlot?: string;
    numbers: number[];
    bonus?: number;
  };
  consensusMasterTicket: number[];
  consensusBonusTop1?: number;
  consensusBonusTop3?: number[];
  consensusPlaySheet5: number[][];
  consensusNumbers: ConsensusNumberRank[];
  sharedConvergences: ConsensusConvergenceCard[];
  engineSummaries: ConsensusEngineSummary[];
  currentDrawLocked: boolean;
  lockedHistory: LockedPreDrawRecord[];
}

// ============================================================================
// DB Schema & Grading Helpers
// ============================================================================
async function ensureConsensusLockTable(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS consensus_pre_draw_locks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_key TEXT NOT NULL,
      target_draw_number INTEGER NOT NULL,
      target_slot TEXT,
      locked_at TEXT NOT NULL,
      consensus_ticket TEXT NOT NULL,
      consensus_bonus INTEGER,
      top_consensus_pool TEXT NOT NULL,
      engine_cards_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      actual_numbers TEXT,
      actual_bonus INTEGER,
      consensus_ticket_match INTEGER,
      best_engine_name TEXT,
      best_engine_match INTEGER,
      best_engine_slip TEXT,
      graded_at TEXT,
      UNIQUE(game_key, target_draw_number)
    )
  `);
}

function multisetMatchCount(pred: number[], actual: number[]): number {
  const pool = [...actual];
  let cnt = 0;
  for (const d of pred) {
    const idx = pool.indexOf(d);
    if (idx !== -1) {
      cnt++;
      pool.splice(idx, 1);
    }
  }
  return cnt;
}

function scoreSlipAgainstActual(game: ConsensusGameKey, slip: number[], actual: number[]): number {
  if (game === "pick4") {
    // Order-independent right-digits-first scoring (4 = exact Box or Straight!)
    return multisetMatchCount(slip, actual);
  }
  if (game === "play-whe" || game === "fast-cash") {
    return slip.includes(actual[0]) ? 1 : 0;
  }
  const actSet = new Set(actual);
  return slip.filter((n) => actSet.has(n)).length;
}

function sortBoxKey(arr: number[]): string {
  return [...arr].sort((a, b) => a - b).join("-");
}

// ============================================================================
// Load Live History From Turso DB (Reused Cleanly Across All 6 Games)
// ============================================================================
async function loadGameHistory(game: ConsensusGameKey): Promise<TrevorHistoricalDraw[]> {
  if (game === "cashpot") {
    const rows = await query<any>(
      "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, multiplier FROM cashpot_draws ORDER BY CAST(draw_number AS INTEGER) ASC"
    );
    return (rows || [])
      .map((r) => ({
        drawNumber: Number(r.draw_number),
        drawDate: String(r.draw_date || ""),
        numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
        bonus: r.multiplier !== undefined && r.multiplier !== null ? Number(r.multiplier) : 1
      }))
      .filter((d) => d.numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 20));
  }

  if (game === "lotto-plus") {
    let rows = await query<any>(
      "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC"
    ).catch(() => []);
    if (!rows || rows.length < 20) {
      rows = await query<any>(
        "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM lotto_draws ORDER BY CAST(draw_number AS INTEGER) ASC"
      ).catch(() => []);
    }
    const parsed = (rows || []).map((r) => ({
      drawNumber: Number(r.draw_number),
      drawDate: String(r.draw_date || ""),
      numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
      bonus: Math.max(1, Math.min(10, Number(r.powerball || 1)))
    }));
    const modern = parsed.filter((d) => d.numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 35));
    return modern.length >= 20 ? modern : parsed;
  }

  if (game === "win-for-life") {
    const rows = await query<any>(
      "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball FROM winforlife_draws ORDER BY CAST(draw_number AS INTEGER) ASC"
    );
    return (rows || [])
      .map((r) => {
        const rawCb = Number(r.cash_ball || 1);
        const cb = rawCb >= 1 && rawCb <= 3 ? rawCb : ((Math.abs(rawCb) - 1) % 3) + 1;
        return {
          drawNumber: Number(r.draw_number),
          drawDate: String(r.draw_date || ""),
          numbers: [
            Number(r.num1),
            Number(r.num2),
            Number(r.num3),
            Number(r.num4),
            Number(r.num5),
            Number(r.num6)
          ].sort((a, b) => a - b),
          bonus: cb
        };
      })
      .filter((d) => d.numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 28));
  }

  if (game === "play-whe") {
    const rows = await query<any>(
      "SELECT draw_number, draw_date, draw_time_slot, winning_number FROM playwhe_draws ORDER BY CAST(draw_number AS INTEGER) DESC LIMIT 2000"
    );
    return (rows || [])
      .reverse()
      .map((r) => ({
        drawNumber: Number(r.draw_number),
        drawDate: String(r.draw_date || ""),
        timeSlot: String(r.draw_time_slot || ""),
        numbers: [Number(r.winning_number)]
      }))
      .filter((d) => Number.isInteger(d.numbers[0]) && d.numbers[0] >= 1 && d.numbers[0] <= 36);
  }

  if (game === "pick4") {
    const rows = await query<any>(
      "SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 FROM pick4_draws ORDER BY CAST(draw_number AS INTEGER) DESC LIMIT 2000"
    );
    return (rows || [])
      .reverse()
      .map((r) => ({
        drawNumber: Number(r.draw_number),
        drawDate: String(r.draw_date || ""),
        timeSlot: String(r.draw_time_slot || ""),
        numbers: [Number(r.digit1), Number(r.digit2), Number(r.digit3), Number(r.digit4)]
      }))
      .filter((d) => d.numbers.every((n) => Number.isInteger(n) && n >= 0 && n <= 9));
  }

  await ensureFastCashSchema();
  const rows = await queryFastCash<any>(
    "SELECT draw_number, draw_date, draw_time, winning_code, winning_index FROM fastcash_draws ORDER BY draw_number DESC LIMIT 2000"
  );
  return (rows || [])
    .reverse()
    .map((r: any) => ({
      drawNumber: Number(r.draw_number),
      drawDate: String(r.draw_date || ""),
      timeSlot: String(r.draw_time || ""),
      numbers: [Number(r.winning_index)]
    }))
    .filter((d) => Number.isInteger(d.numbers[0]) && d.numbers[0] >= 0 && d.numbers[0] <= 37);
}

// ============================================================================
// Auto-Grade Any Pending Locked Pre-Draw Snapshots Using Live History
// ============================================================================
async function reconcileAndLoadLocks(
  game: ConsensusGameKey,
  histDraws: TrevorHistoricalDraw[]
): Promise<LockedPreDrawRecord[]> {
  await ensureConsensusLockTable();
  const drawByNum = new Map<number, TrevorHistoricalDraw>();
  for (const d of histDraws) drawByNum.set(d.drawNumber, d);

  const rows = await query<any>(
    "SELECT * FROM consensus_pre_draw_locks WHERE game_key = ? ORDER BY target_draw_number DESC LIMIT 20",
    [game]
  );

  const out: LockedPreDrawRecord[] = [];

  for (const r of rows || []) {
    const targetDraw = Number(r.target_draw_number);
    const consensusTicket: number[] = JSON.parse(r.consensus_ticket || "[]");
    const topConsensusPool: number[] = JSON.parse(r.top_consensus_pool || "[]");
    const engineSummaries: ConsensusEngineSummary[] = JSON.parse(r.engine_cards_json || "[]");
    let status: "PENDING" | "GRADED" = r.status === "GRADED" ? "GRADED" : "PENDING";
    let actualNumbers: number[] | undefined = r.actual_numbers ? JSON.parse(r.actual_numbers) : undefined;
    let actualBonus: number | undefined = r.actual_bonus !== null && r.actual_bonus !== undefined ? Number(r.actual_bonus) : undefined;
    let consensusTicketMatch: number | undefined = r.consensus_ticket_match !== null && r.consensus_ticket_match !== undefined ? Number(r.consensus_ticket_match) : undefined;
    let bestEngineName: string | undefined = r.best_engine_name || undefined;
    let bestEngineMatch: number | undefined = r.best_engine_match !== null && r.best_engine_match !== undefined ? Number(r.best_engine_match) : undefined;
    let bestEngineSlip: number[] | undefined = r.best_engine_slip ? JSON.parse(r.best_engine_slip) : undefined;
    let gradedAt: string | undefined = r.graded_at || undefined;

    if (status === "PENDING" && drawByNum.has(targetDraw)) {
      const actual = drawByNum.get(targetDraw)!;
      actualNumbers = actual.numbers;
      actualBonus = actual.bonus;
      consensusTicketMatch = scoreSlipAgainstActual(game, consensusTicket, actual.numbers);

      let topMatch = -1;
      let topEng = "";
      let topSlip: number[] = [];

      for (const eng of engineSummaries) {
        for (const slip of eng.slips || []) {
          const m = scoreSlipAgainstActual(game, slip, actual.numbers);
          if (m > topMatch) {
            topMatch = m;
            topEng = eng.engineName;
            topSlip = slip;
          }
        }
      }

      bestEngineName = topEng || "Consensus";
      bestEngineMatch = Math.max(0, topMatch);
      bestEngineSlip = topSlip;
      status = "GRADED";
      gradedAt = new Date().toISOString();

      await db.execute({
        sql: `
          UPDATE consensus_pre_draw_locks
          SET status = 'GRADED',
              actual_numbers = ?,
              actual_bonus = ?,
              consensus_ticket_match = ?,
              best_engine_name = ?,
              best_engine_match = ?,
              best_engine_slip = ?,
              graded_at = ?
          WHERE id = ?
        `,
        args: [
          JSON.stringify(actualNumbers),
          actualBonus ?? null,
          consensusTicketMatch,
          bestEngineName,
          bestEngineMatch,
          JSON.stringify(bestEngineSlip),
          gradedAt,
          r.id
        ]
      });
    }

    out.push({
      id: Number(r.id),
      gameKey: game,
      targetDrawNumber: targetDraw,
      targetSlot: r.target_slot || undefined,
      lockedAt: String(r.locked_at),
      consensusTicket,
      consensusBonus: r.consensus_bonus !== null && r.consensus_bonus !== undefined ? Number(r.consensus_bonus) : undefined,
      topConsensusPool,
      engineSummaries,
      status,
      actualNumbers,
      actualBonus,
      consensusTicketMatch,
      bestEngineName,
      bestEngineMatch,
      bestEngineSlip,
      gradedAt
    });
  }

  return out;
}

// ============================================================================
// Master Aggregator: Execute Live Cross-Engine Consensus for Any of the 6 Games
// ============================================================================
export async function computeCrossEngineConsensus(
  game: ConsensusGameKey
): Promise<CrossEngineConsensusResult> {
  const meta = getTrevorGameMeta(game);
  const histDraws = await loadGameHistory(game);
  const latest = histDraws.length > 0 ? histDraws[histDraws.length - 1] : undefined;
  const nextTargetDrawNumber = latest ? latest.drawNumber + 1 : 1;

  const engineSummaries: ConsensusEngineSummary[] = [];

  // 1. Always execute Lucky 7 (which also supplies Steiner Top 10)
  const lucky7 = executeLucky7Engine(game, histDraws, { includeAudit: false });

  engineSummaries.push({
    engineKey: "steiner-10",
    engineName: "Steiner Top 10",
    slips: lucky7.top10SteinerPicks.map((p) => p.numbers),
    bonusBalls:
      game === "lotto-plus" || game === "win-for-life"
        ? lucky7.top10SteinerPicks.map((p) => p.bonus || 1)
        : undefined,
    primaryLabel: `${lucky7.top10SteinerPicks.length} Optimal Steiner Picks`
  });

  engineSummaries.push({
    engineKey: "lucky-7",
    engineName: "Lucky 7 Engine",
    slips: lucky7.lucky7Plays.map((p) => p.numbers),
    bonusBalls:
      game === "lotto-plus" || game === "win-for-life"
        ? lucky7.lucky7Plays.map((p) => p.bonus || 1)
        : undefined,
    primaryLabel: "7 Out-of-the-Box Number-Theory & Follower Plays"
  });

  let nextTargetSlot: string | undefined = undefined;

  // 2. Game-specific specialized engines (Forensic, Quant 100%, Diff Involution, Winning Formula)
  try {
    if (game === "cashpot" && histDraws.length >= 20) {
      const cpForensicDraws = histDraws.map((d) => ({
        draw_number: d.drawNumber,
        draw_date: d.drawDate,
        numbers: d.numbers,
        multiplier: d.bonus || 1
      }));
      const forensic = executeCashPotForensicEngine(cpForensicDraws, 5);
      if (forensic.nextCandidateSets?.length) {
        engineSummaries.push({
          engineKey: "forensic",
          engineName: "Forensic Engine",
          slips: forensic.nextCandidateSets.slice(0, 5).map((c) => c.numbers),
          primaryLabel: "Top 5 Harmonic & Resonance Sets"
        });
      }

      const cpRecords = histDraws.map((d) => ({
        draw_number: d.drawNumber,
        draw_date: d.drawDate,
        num1: d.numbers[0],
        num2: d.numbers[1],
        num3: d.numbers[2],
        num4: d.numbers[3],
        num5: d.numbers[4],
        multiplier: d.bonus || 1
      }));
      const quant = computeCashPotQuant100Engine(cpRecords, 1);
      if (quant.theFiveQuantSets?.length) {
        engineSummaries.push({
          engineKey: "quant-100",
          engineName: "Quant 100% Sieve",
          slips: quant.theFiveQuantSets.slice(0, 5).map((s) => s.numbers),
          primaryLabel: "5 Orthogonal CRT & Involution Sets"
        });
      }

      const diff20 = CashPotDiffEngine.analyze(cpRecords);
      if (diff20.formulaSets?.length) {
        engineSummaries.push({
          engineKey: "diff-20",
          engineName: "Diff-20 Formula",
          slips: diff20.formulaSets.slice(0, 5).map((s) => s.numbers),
          primaryLabel: "5 Sigma-21 & Sum-28 Sets"
        });
      }

      const wf = computeCashPotFormulaPick(cpRecords);
      const wfSlips = wf.wheelLines?.length ? wf.wheelLines.slice(0, 5) : wf.predictedNumbers?.length === 5 ? [wf.predictedNumbers] : [];
      if (wfSlips.length) {
        engineSummaries.push({
          engineKey: "winning-formula",
          engineName: "Winning Formula",
          slips: wfSlips,
          primaryLabel: "Kinematic Lag & Neighbor Lines"
        });
      }
    } else if (game === "lotto-plus" && histDraws.length >= 20) {
      const lpForensicDraws = histDraws.map((d) => ({
        draw_number: d.drawNumber,
        draw_date: d.drawDate,
        numbers: d.numbers,
        powerball: d.bonus || 1
      }));
      const forensic = executeLottoForensicEngine(lpForensicDraws, 5);
      if (forensic.nextCandidateSets?.length) {
        engineSummaries.push({
          engineKey: "forensic",
          engineName: "Forensic Engine",
          slips: forensic.nextCandidateSets.slice(0, 5).map((c) => c.numbers),
          primaryLabel: "Top 5 Main-Ball Resonance Sets"
        });
      }

      const lpRecords = histDraws.map((d) => ({
        draw_number: d.drawNumber,
        draw_date: d.drawDate,
        num1: d.numbers[0],
        num2: d.numbers[1],
        num3: d.numbers[2],
        num4: d.numbers[3],
        num5: d.numbers[4],
        powerball: d.bonus || 1
      }));
      const quant = computeLottoQuant100Engine(lpRecords, 1);
      if (quant.theFiveQuantSets?.length) {
        engineSummaries.push({
          engineKey: "quant-100",
          engineName: "Quant 100% Sieve",
          slips: quant.theFiveQuantSets.slice(0, 5).map((s) => s.numbers),
          primaryLabel: "5 Galois Ring & Mandel Sets"
        });
      }

      const diff35 = computeSum35DiffEngine(lpRecords);
      if (diff35.nextDrawPredictions?.sets?.length) {
        engineSummaries.push({
          engineKey: "diff-35",
          engineName: "Diff-35 Formula",
          slips: diff35.nextDrawPredictions.sets.slice(0, 5).map((s) => s.numbers),
          primaryLabel: "5 Sigma-35 Involution Sets"
        });
      }

      const wf = computeLottoPlusFormulaPick(lpRecords);
      const wfSlips = wf.wheelLines?.length ? wf.wheelLines.slice(0, 5) : wf.predictedNumbers?.length === 5 ? [wf.predictedNumbers] : [];
      if (wfSlips.length) {
        engineSummaries.push({
          engineKey: "winning-formula",
          engineName: "Winning Formula",
          slips: wfSlips,
          primaryLabel: "Kinematic Neighbor Wave"
        });
      }
    } else if (game === "win-for-life" && histDraws.length >= 20) {
      const wflForensicDraws = histDraws.map((d) => ({
        draw_number: d.drawNumber,
        draw_date: d.drawDate,
        numbers: d.numbers,
        cash_ball: d.bonus || 1
      }));
      const forensic = executeWinForLifeForensicEngine(wflForensicDraws, 5);
      if (forensic.nextCandidateSets?.length) {
        engineSummaries.push({
          engineKey: "forensic",
          engineName: "Forensic Engine",
          slips: forensic.nextCandidateSets.slice(0, 5).map((c) => c.numbers),
          primaryLabel: "Top 5 6-Ball Dual-Manifold Lines"
        });
      }

      const wflRecords = histDraws.map((d) => ({
        draw_number: d.drawNumber,
        draw_date: d.drawDate,
        num1: d.numbers[0],
        num2: d.numbers[1],
        num3: d.numbers[2],
        num4: d.numbers[3],
        num5: d.numbers[4],
        num6: d.numbers[5],
        cash_ball: d.bonus || 1
      }));
      const quant = computeWinForLifeQuant100Engine(wflRecords, 1);
      if (quant.theFiveQuantSets?.length) {
        engineSummaries.push({
          engineKey: "quant-100",
          engineName: "Quant 100% Sieve",
          slips: quant.theFiveQuantSets.slice(0, 5).map((s) => s.numbers),
          primaryLabel: "5 CRT Z_28 Orthogonal Lines"
        });
      }

      const diff28 = computeWinForLifeDiff28Engine(wflRecords);
      if (diff28.nextDrawPredictions?.sets?.length) {
        engineSummaries.push({
          engineKey: "diff-28",
          engineName: "Diff-28 Formula",
          slips: diff28.nextDrawPredictions.sets.slice(0, 5).map((s) => s.numbers),
          primaryLabel: "5 Sigma-28 Involution Lines"
        });
      }

      const wf = computeWinForLifeFormulaPick(wflRecords);
      const wfSlips = wf.wheelLines?.length ? wf.wheelLines.slice(0, 5) : wf.predictedNumbers?.length === 6 ? [wf.predictedNumbers] : [];
      if (wfSlips.length) {
        engineSummaries.push({
          engineKey: "winning-formula",
          engineName: "Winning Formula",
          slips: wfSlips,
          primaryLabel: "Kinematic Neighbor Wave"
        });
      }
    } else if (game === "play-whe" && histDraws.length >= 20) {
      const pwDraws = histDraws.map((d) => ({
        draw_number: d.drawNumber,
        draw_date: d.drawDate,
        draw_time_slot: d.timeSlot || "Morning",
        winning_number: d.numbers[0]
      }));
      const forensic = executePlayWheForensicEngine(pwDraws, 5);
      nextTargetSlot = forensic.nextTargetTimeSlot;
      if (forensic.nextCandidateSets?.length) {
        engineSummaries.push({
          engineKey: "forensic",
          engineName: "Forensic Engine",
          slips: forensic.nextCandidateSets.slice(0, 5).map((c) => [c.markNumber]),
          primaryLabel: "Top 5 Slot-Conditional Marks"
        });
      }

      const quant = computePlayWheQuant100Engine(pwDraws, 5);
      if (quant.theFiveQuantSets?.length) {
        engineSummaries.push({
          engineKey: "quant-100",
          engineName: "Quant 100% Sieve",
          slips: quant.theFiveQuantSets.slice(0, 5).map((s) => [s.markNumber]),
          primaryLabel: "5 Markov & Kinematic Marks"
        });
      }

      const diff37 = PlayWheDiff37Engine.analyze(pwDraws, 20);
      if (diff37.nextDrawPredictions?.sets?.length) {
        const uniqDiffMarks = Array.from(
          new Set(diff37.nextDrawPredictions.sets.map((s) => s.primaryMark).filter((m) => m >= 1 && m <= 36))
        );
        engineSummaries.push({
          engineKey: "diff-37",
          engineName: "Diff-37 Involution",
          slips: uniqDiffMarks.map((m) => [m]),
          primaryLabel: "Sigma-37 Mirror Primary Marks"
        });
      }

      const wf = computePlayWheFormulaPick(pwDraws);
      const wfMarks = wf.predictedNumbers?.slice(0, 5) || [];
      if (wfMarks.length) {
        engineSummaries.push({
          engineKey: "winning-formula",
          engineName: "Winning Formula",
          slips: wfMarks.map((m) => [m]),
          primaryLabel: "Top 5 Tactical Marks"
        });
      }
    } else if (game === "pick4" && histDraws.length >= 20) {
      const p4Draws = histDraws.map((d) => ({
        draw_number: d.drawNumber,
        draw_date: d.drawDate,
        draw_time_slot: d.timeSlot || "MORNING",
        digit1: d.numbers[0],
        digit2: d.numbers[1],
        digit3: d.numbers[2],
        digit4: d.numbers[3]
      }));
      const forensic = executePick4ForensicEngine(p4Draws, 5);
      nextTargetSlot = forensic.nextTargetTimeSlot;
      if (forensic.nextCandidateSets?.length) {
        engineSummaries.push({
          engineKey: "forensic",
          engineName: "Forensic Engine",
          slips: forensic.nextCandidateSets.slice(0, 5).map((c) => c.digits),
          primaryLabel: "Top 5 Multi-Lag & CRT Sets"
        });
      }

      const quant = computePick4Quant100Engine(p4Draws, 5);
      if (quant.theFiveQuantSets?.length) {
        engineSummaries.push({
          engineKey: "quant-100",
          engineName: "Quant 100% Sieve",
          slips: quant.theFiveQuantSets.slice(0, 5).map((s) => s.digits),
          primaryLabel: "5 Positional Markov Sets"
        });
      }

      const diff9 = computePick4Diff9Engine(p4Draws);
      if (diff9.nextDrawPredictions?.sets?.length) {
        engineSummaries.push({
          engineKey: "diff-9",
          engineName: "Diff-9 Mirror",
          slips: diff9.nextDrawPredictions.sets.slice(0, 4).map((s) => s.digits),
          primaryLabel: "4 Canonical 9-Complement Sets"
        });
      }

      const wf = computePick4FormulaPick(p4Draws);
      const wfSlips = wf.wheelLines?.length ? wf.wheelLines.slice(0, 4) : wf.predictedNumbers?.length === 4 ? [wf.predictedNumbers] : [];
      if (wfSlips.length) {
        engineSummaries.push({
          engineKey: "winning-formula",
          engineName: "Winning Formula",
          slips: wfSlips,
          primaryLabel: "4 Kinematic Digit Sets"
        });
      }
    } else if (game === "fast-cash") {
      const fcReport = await runFastCashEngine({ depth: 200 }).catch(() => null);
      const ranked = fcReport?.nextDrawPrediction?.rankedScores;
      if (Array.isArray(ranked) && ranked.length > 0) {
        const top7Pockets = ranked
          .slice(0, 7)
          .map((r) => Number(r.index))
          .filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 37);
        if (top7Pockets.length > 0) {
          engineSummaries.push({
            engineKey: "fastcash-sector",
            engineName: "Fast Cash Live Wheel Engine",
            slips: top7Pockets.map((p: number) => [p]),
            primaryLabel: "Top 7 Live Wheel Sectors"
          });
        }
      }
    }
  } catch (err: any) {
    console.warn(`[ConsensusEngine] Optional engine warning for ${game}:`, err?.message);
  }

  // 3. Tally Cross-Engine Number Agreement across ALL active engines
  const minVal = game === "pick4" || game === "fast-cash" ? 0 : 1;
  const maxVal =
    game === "cashpot"
      ? 20
      : game === "lotto-plus"
      ? 35
      : game === "win-for-life"
      ? 28
      : game === "play-whe"
      ? 36
      : game === "pick4"
      ? 9
      : 37;

  const totalEngines = engineSummaries.length;
  const slipVotes = Array(maxVal + 1).fill(0);
  const engSets = Array.from({ length: maxVal + 1 }, () => new Set<string>());

  for (const eng of engineSummaries) {
    // For single-number Steiner-10, count primary mark per card so it doesn't swamp single-number consensus
    const slipsToCount =
      (game === "play-whe" || game === "fast-cash") && eng.engineKey === "steiner-10"
        ? eng.slips.map((s) => [s[0]])
        : eng.slips;

    for (const slip of slipsToCount) {
      for (const n of slip) {
        if (n >= minVal && n <= maxVal) {
          slipVotes[n]++;
          engSets[n].add(eng.engineName);
        }
      }
    }
  }

  const consensusNumbers: ConsensusNumberRank[] = [];
  for (let n = minVal; n <= maxVal; n++) {
    const agree = engSets[n].size;
    if (agree === 0 && slipVotes[n] === 0) continue;
    const label =
      game === "play-whe"
        ? `${formatTrevorBall(game, n)} ${CHINAPOO_CHART[n]?.mark || ""}`.trim()
        : formatTrevorBall(game, n);
    consensusNumbers.push({
      number: n,
      label,
      engineAgreement: agree,
      totalEngines,
      agreementPct: Math.round((agree / Math.max(1, totalEngines)) * 100),
      totalSlipVotes: slipVotes[n],
      agreeingEngines: Array.from(engSets[n])
    });
  }
  consensusNumbers.sort(
    (a, b) => b.engineAgreement - a.engineAgreement || b.totalSlipVotes - a.totalSlipVotes || a.number - b.number
  );

  // 4. Find Cross-Engine Convergences (Shared 4-ball cores or Shared Unordered Pick 4 Boxes!)
  const sharedConvergences: ConsensusConvergenceCard[] = [];
  const isMultiBall = game === "cashpot" || game === "lotto-plus" || game === "win-for-life";
  const pickSize = game === "win-for-life" ? 6 : isMultiBall ? 5 : game === "pick4" ? 4 : 1;

  if (game === "pick4") {
    // Unordered Box convergence across engines (Right Digits First!)
    const boxMap = new Map<string, { digits: number[]; engines: Set<string>; count: number }>();
    for (const eng of engineSummaries) {
      for (const s of eng.slips) {
        if (s.length !== 4) continue;
        const bk = sortBoxKey(s);
        const entry = boxMap.get(bk) || {
          digits: [...s].sort((a, b) => a - b),
          engines: new Set<string>(),
          count: 0
        };
        entry.engines.add(eng.engineName);
        entry.count++;
        boxMap.set(bk, entry);
      }
    }
    const multiBoxes = Array.from(boxMap.values())
      .filter((b) => b.engines.size >= 2)
      .sort((a, b) => b.engines.size - a.engines.size || b.count - a.count)
      .slice(0, 4);

    for (const b of multiBoxes) {
      sharedConvergences.push({
        title: `Shared Unordered Box {${b.digits.join("-")}}`,
        sharedNumbers: b.digits,
        engines: Array.from(b.engines),
        overlapSize: 4,
        note: `${b.engines.size} independent engines independently produced the exact same 4 unordered digits.`
      });
    }
  } else if (isMultiBall) {
    // Find cross-engine slip pairs sharing >= (pickSize - 1) numbers (e.g., 4 of 5 in Cash Pot / Lotto Plus, 4-5 of 6 in Win For Life)
    const minShared = pickSize === 6 ? 4 : 4;
    const seenCore = new Set<string>();
    const rawPairs: { shared: number[]; e1: string; e2: string }[] = [];

    for (let i = 0; i < engineSummaries.length; i++) {
      for (let j = i + 1; j < engineSummaries.length; j++) {
        const eA = engineSummaries[i];
        const eB = engineSummaries[j];
        for (const sA of eA.slips) {
          for (const sB of eB.slips) {
            const shared = sA.filter((n) => sB.includes(n)).sort((a, b) => a - b);
            if (shared.length >= minShared) {
              const key = `${shared.join("-")}|${eA.engineKey}|${eB.engineKey}`;
              if (!seenCore.has(key)) {
                seenCore.add(key);
                rawPairs.push({ shared, e1: eA.engineName, e2: eB.engineName });
              }
            }
          }
        }
      }
    }
    rawPairs.sort((a, b) => b.shared.length - a.shared.length);
    const dedupShared = new Set<string>();
    for (const p of rawPairs) {
      const sk = p.shared.join("-");
      if (dedupShared.has(sk)) continue;
      dedupShared.add(sk);
      sharedConvergences.push({
        title: `${p.shared.length}-Ball Cross-Engine Convergence`,
        sharedNumbers: p.shared,
        engines: [p.e1, p.e2],
        overlapSize: p.shared.length,
        note: `Both ${p.e1} and ${p.e2} independently converged on these exact ${p.shared.length} balls.`
      });
      if (sharedConvergences.length >= 4) break;
    }
  }

  // 5. Build the Consensus Master Ticket & 5-Play Consensus Sheet
  let consensusMasterTicket: number[];
  let consensusPlaySheet5: number[][] = [];

  if (game === "play-whe" || game === "fast-cash") {
    const top5 = consensusNumbers.slice(0, 5).map((c) => c.number);
    consensusMasterTicket = top5;
    consensusPlaySheet5 = top5.map((m) => [m]);
  } else if (game === "pick4") {
    const top4 = consensusNumbers.slice(0, 4).map((c) => c.number);
    consensusMasterTicket = top4;
    const sheet: number[][] = [top4];
    const usedBk = new Set<string>([sortBoxKey(top4)]);
    // Add shared unordered boxes + top Lucky 7 & Forensic sets to create a 5-set Consensus Sheet
    for (const conv of sharedConvergences) {
      const bk = sortBoxKey(conv.sharedNumbers);
      if (!usedBk.has(bk)) {
        usedBk.add(bk);
        sheet.push(conv.sharedNumbers);
      }
    }
    for (const p of lucky7.lucky7Plays) {
      if (sheet.length >= 5) break;
      const bk = sortBoxKey(p.numbers);
      if (!usedBk.has(bk)) {
        usedBk.add(bk);
        sheet.push(p.numbers);
      }
    }
    consensusPlaySheet5 = sheet.slice(0, 5);
  } else {
    consensusMasterTicket = consensusNumbers
      .slice(0, pickSize)
      .map((c) => c.number)
      .sort((a, b) => a - b);

    // Build 5 distinct Consensus-Driven Slips:
    // #1: Pure Top-K Unanimous Consensus Ticket
    // #2-#5: Highest consensus-scored slips across all engines (zero duplicates!)
    const seenSlip = new Set<string>([consensusMasterTicket.join("-")]);
    const sheet: number[][] = [consensusMasterTicket];
    const scoreMap = new Map<number, number>();
    consensusNumbers.forEach((c) => scoreMap.set(c.number, c.engineAgreement * 10 + c.totalSlipVotes));

    const allSlipsScored: { slip: number[]; score: number }[] = [];
    for (const eng of engineSummaries) {
      for (const s of eng.slips) {
        if (s.length !== pickSize) continue;
        const sorted = [...s].sort((a, b) => a - b);
        const sc = sorted.reduce((acc, n) => acc + (scoreMap.get(n) || 0), 0);
        allSlipsScored.push({ slip: sorted, score: sc });
      }
    }
    allSlipsScored.sort((a, b) => b.score - a.score);
    for (const item of allSlipsScored) {
      if (sheet.length >= 5) break;
      const key = item.slip.join("-");
      if (!seenSlip.has(key)) {
        seenSlip.add(key);
        sheet.push(item.slip);
      }
    }
    consensusPlaySheet5 = sheet;
  }

  // Independent Decoupled Bonus Consensus (Lotto Plus 1-10, Win For Life strictly 1-3!)
  const consensusBonusTop1 =
    game === "lotto-plus" || game === "win-for-life" ? lucky7.decoupledBonus?.topPick : undefined;
  const consensusBonusTop3 =
    game === "lotto-plus" || game === "win-for-life" ? lucky7.decoupledBonus?.topThreePicks : undefined;

  // 6. Auto-Grade Any Pending Locks & Load Locked History
  const lockedHistory = await reconcileAndLoadLocks(game, histDraws);
  const currentDrawLocked = lockedHistory.some((l) => l.targetDrawNumber === nextTargetDrawNumber);

  return {
    game,
    gameName: meta.gameName,
    themeColor: meta.themeColor,
    unitCostTT: meta.unitCostTT,
    bonusName: meta.bonusName,
    totalEnginesChecked: totalEngines,
    nextTargetDrawNumber,
    nextTargetSlot,
    latestDraw: latest
      ? {
          drawNumber: latest.drawNumber,
          drawDate: latest.drawDate,
          timeSlot: latest.timeSlot,
          numbers: latest.numbers,
          bonus: latest.bonus
        }
      : undefined,
    consensusMasterTicket,
    consensusBonusTop1,
    consensusBonusTop3,
    consensusPlaySheet5,
    consensusNumbers,
    sharedConvergences,
    engineSummaries,
    currentDrawLocked,
    lockedHistory
  };
}

// ============================================================================
// Freeze & Persist a Pre-Draw Snapshot Into Turso DB (Zero Hindsight Bias)
// ============================================================================
export async function lockConsensusPreDrawSnapshot(
  game: ConsensusGameKey,
  forceOverwrite: boolean = false
): Promise<{ alreadyLocked: boolean; lockedRecord: LockedPreDrawRecord; consensus: CrossEngineConsensusResult }> {
  await ensureConsensusLockTable();
  const consensus = await computeCrossEngineConsensus(game);

  const existing = consensus.lockedHistory.find(
    (l) => l.targetDrawNumber === consensus.nextTargetDrawNumber
  );
  if (existing && !forceOverwrite) {
    return { alreadyLocked: true, lockedRecord: existing, consensus };
  }

  const nowIso = new Date().toISOString();
  const topPool = consensus.consensusNumbers.slice(0, 10).map((c) => c.number);

  await db.execute({
    sql: `
      INSERT INTO consensus_pre_draw_locks (
        game_key, target_draw_number, target_slot, locked_at,
        consensus_ticket, consensus_bonus, top_consensus_pool, engine_cards_json, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      ON CONFLICT(game_key, target_draw_number) DO UPDATE SET
        locked_at = excluded.locked_at,
        consensus_ticket = excluded.consensus_ticket,
        consensus_bonus = excluded.consensus_bonus,
        top_consensus_pool = excluded.top_consensus_pool,
        engine_cards_json = excluded.engine_cards_json,
        status = 'PENDING',
        actual_numbers = NULL,
        actual_bonus = NULL,
        consensus_ticket_match = NULL,
        best_engine_name = NULL,
        best_engine_match = NULL,
        best_engine_slip = NULL,
        graded_at = NULL
    `,
    args: [
      game,
      consensus.nextTargetDrawNumber,
      consensus.nextTargetSlot || null,
      nowIso,
      JSON.stringify(consensus.consensusMasterTicket),
      consensus.consensusBonusTop1 ?? null,
      JSON.stringify(topPool),
      JSON.stringify(consensus.engineSummaries)
    ]
  });

  const refreshed = await computeCrossEngineConsensus(game);
  const lockedRecord = refreshed.lockedHistory.find(
    (l) => l.targetDrawNumber === consensus.nextTargetDrawNumber
  )!;

  return { alreadyLocked: false, lockedRecord, consensus: refreshed };
}
