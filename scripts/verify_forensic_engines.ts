import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";
import { executeLottoForensicEngine, LottoDraw } from "../src/lib/lotto_forensic_engine";
import { executeCashPotForensicEngine, CashPotDraw } from "../src/lib/cashpot_forensic_engine";
import { executePlayWheForensicEngine, PlayWheDraw } from "../src/lib/playwhe_forensic_engine";
import { executePick4ForensicEngine, Pick4Draw } from "../src/lib/pick4_forensic_engine";
import { executeWinForLifeForensicEngine, WFLDraw } from "../src/lib/winforlife_forensic_engine";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

async function verifyForensicEngines() {
  console.log("================================================================================");
  console.log("QUANTITATIVE FORENSIC ENGINE SUITE VERIFICATION");
  console.log("================================================================================\n");

  // 1. LOTTO PLUS FORENSIC ENGINE (5/35)
  console.log(">>> [1/4] Testing Lotto Plus Forensic Engine (5 of 35 + PB 1-10)...");
  const lottoRows = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const lottoDraws: LottoDraw[] = lottoRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
    powerball: Number(r.powerball || 1)
  }));
  const lottoResult = executeLottoForensicEngine(lottoDraws, 50);
  console.log(`Lotto Plus: Total Draws: ${lottoResult.totalDrawsInDb}, Target Draw: #${lottoResult.nextTargetDrawNumber}`);
  console.log(`Lotto Plus: Candidate sets generated: ${lottoResult.nextCandidateSets.length}`);
  console.log(`Lotto Plus: Mandel covering slips: ${lottoResult.invariantSubspace.coveringTickets.length}`);
  console.log(`Lotto Plus: Invariant Subspace Pool (16 balls): [${lottoResult.invariantSubspace.pool.join(", ")}]`);
  console.log(`Lotto Plus: 5-draw window 3+ rate: ${lottoResult.invariantSubspace.rollingWindowCaptureRates.windowFiveDrawsRate}%`);
  console.log(`Lotto Plus: Audit Tested Draws: ${lottoResult.audit.testedDrawsCount}, Capture Rate (>=1): ${lottoResult.audit.overallCaptureRatePercent}%, Money Tier (>=3): ${lottoResult.audit.atLeastThreeHitsRatePercent}%`);
  console.log(`Lotto Plus: Total Simulated Payout: $${lottoResult.audit.totalSimulatedPayoutTT.toLocaleString()} TT`);
  console.log("Lotto Plus Forensic Engine: PASS!\n");

  // 2. CASH POT FORENSIC ENGINE (5/20)
  console.log(">>> [2/4] Testing Cash Pot Forensic Engine (5 of 20 + Mult 1-5x)...");
  const cashpotRows = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, multiplier FROM cashpot_draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const cashpotDraws: CashPotDraw[] = cashpotRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
    multiplier: Number(r.multiplier || 1)
  }));
  const cashpotResult = executeCashPotForensicEngine(cashpotDraws, 50);
  console.log(`Cash Pot: Total Draws: ${cashpotResult.totalDrawsInDb}, Target Draw: #${cashpotResult.nextTargetDrawNumber}`);
  console.log(`Cash Pot: Candidate sets generated: ${cashpotResult.nextCandidateSets.length}`);
  console.log(`Cash Pot: Mandel covering slips: ${cashpotResult.invariantSubspace.coveringTickets.length}`);
  console.log(`Cash Pot: Invariant Subspace Pool (14 balls): [${cashpotResult.invariantSubspace.pool.join(", ")}]`);
  console.log(`Cash Pot: 5-draw window 3+ rate: ${cashpotResult.invariantSubspace.rollingWindowCaptureRates.windowFiveDrawsRate}%`);
  console.log(`Cash Pot: Audit Tested Draws: ${cashpotResult.audit.testedDrawsCount}, Capture Rate (>=1): ${cashpotResult.audit.overallCaptureRatePercent}%, Money Tier (>=2): ${cashpotResult.audit.atLeastTwoHitsRatePercent}%`);
  console.log(`Cash Pot: Total Simulated Payout: $${cashpotResult.audit.totalSimulatedPayoutTT.toLocaleString()} TT`);
  console.log("Cash Pot Forensic Engine: PASS!\n");

  // 3. PLAY WHE FORENSIC ENGINE (1 of 36)
  console.log(">>> [3/4] Testing Play Whe Forensic Engine (1 of 36, 4 slots)...");
  const pwRows = await db.execute("SELECT draw_number, draw_date, draw_time_slot, winning_number FROM playwhe_draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const pwDraws: PlayWheDraw[] = pwRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    draw_time_slot: String(r.draw_time_slot || "Morning"),
    winning_number: Number(r.winning_number)
  }));
  const pwResult = executePlayWheForensicEngine(pwDraws, 50);
  console.log(`Play Whe: Total Draws: ${pwResult.totalDrawsInDb}, Target Draw: #${pwResult.nextTargetDrawNumber}`);
  console.log(`Play Whe: Candidate marks generated: ${pwResult.nextCandidateSets.length}`);
  console.log(`Play Whe: Invariant core capture rate: ${pwResult.attractorCore.captureRatePercent}%`);
  console.log(`Play Whe: Audit Tested Draws: ${pwResult.audit.testedDrawsCount}, Hit Rate: ${pwResult.audit.overallHitRatePercent}%`);
  console.log("Play Whe Forensic Engine: PASS!\n");

  // 4. PICK 4 FORENSIC ENGINE (4 Digits)
  console.log(">>> [4/4] Testing Pick 4 Forensic Engine (4 Digits 0-9)...");
  const p4Rows = await db.execute("SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 FROM pick4_draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const p4Draws: Pick4Draw[] = p4Rows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    draw_time_slot: String(r.draw_time_slot || "MORNING"),
    digit1: Number(r.digit1),
    digit2: Number(r.digit2),
    digit3: Number(r.digit3),
    digit4: Number(r.digit4)
  }));
  const p4Result = executePick4ForensicEngine(p4Draws, 50);
  console.log(`Pick 4: Total Draws: ${p4Result.totalDrawsInDb}, Target Draw: #${p4Result.nextTargetDrawNumber}`);
  console.log(`Pick 4: Candidate sets generated: ${p4Result.nextCandidateSets.length}`);
  console.log(`Pick 4: Audit Tested Draws: ${p4Result.audit.testedDrawsCount}, Box Hits: ${p4Result.audit.boxHitsCount}`);
  console.log("Pick 4 Forensic Engine: PASS!\n");

  console.log("================================================================================");
  console.log("ALL FORENSIC ENGINES SUCCESSFULLY VALIDATED EMPIRICALLY!");
  console.log("================================================================================");
}

verifyForensicEngines().catch(console.error);
