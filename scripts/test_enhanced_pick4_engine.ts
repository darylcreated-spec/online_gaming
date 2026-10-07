import { createClient } from "@libsql/client";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/TURSO_DATABASE_URL=(.+)/)![1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)![1].trim();
const db = createClient({ url, authToken: token });

interface Pick4Draw {
  draw_number: number;
  draw_date: string;
  draw_time_slot: string;
  digit1: number;
  digit2: number;
  digit3: number;
  digit4: number;
}

// Multiset box check
function isBoxMatch(pred: number[], actual: number[]): boolean {
  const p = [...pred].sort((a, b) => a - b);
  const a = [...actual].sort((a, b) => a - b);
  return p.every((val, idx) => val === a[idx]);
}

function getBoxTypeAndPayout(digits: number[]): { boxType: string; payout: number } {
  const counts: Record<number, number> = {};
  digits.forEach(d => counts[d] = (counts[d] || 0) + 1);
  const uniqueCount = Object.keys(counts).length;
  const maxRep = Math.max(...Object.values(counts));

  if (uniqueCount === 4) return { boxType: "24-Way Box", payout: 200 };
  if (uniqueCount === 3) return { boxType: "12-Way Box", payout: 400 };
  if (uniqueCount === 2 && maxRep === 2) return { boxType: "6-Way Box", payout: 800 };
  if (uniqueCount === 2 && maxRep === 3) return { boxType: "4-Way Box", payout: 1200 };
  return { boxType: "Straight", payout: 5000 };
}

function evaluateTicket(pred: number[], actual: number[]): {
  isStraight: boolean;
  isBox: boolean;
  isFront3: boolean;
  isBack3: boolean;
  isFrontPair: boolean;
  isBackPair: boolean;
  isSplitPair: boolean;
  matchedPositionsCount: number;
  bestPrize: string;
  payoutTT: number;
} {
  const isStraight = pred[0] === actual[0] && pred[1] === actual[1] && pred[2] === actual[2] && pred[3] === actual[3];
  const isBox = isBoxMatch(pred, actual);
  const isFront3 = pred[0] === actual[0] && pred[1] === actual[1] && pred[2] === actual[2];
  const isBack3 = pred[1] === actual[1] && pred[2] === actual[2] && pred[3] === actual[3];
  const isFrontPair = pred[0] === actual[0] && pred[1] === actual[1];
  const isBackPair = pred[2] === actual[2] && pred[3] === actual[3];
  const isSplitPair = pred[0] === actual[0] && pred[3] === actual[3];

  let matchedPositionsCount = 0;
  for (let i = 0; i < 4; i++) {
    if (pred[i] === actual[i]) matchedPositionsCount++;
  }

  let bestPrize = "No Match";
  let payoutTT = 0;

  if (isStraight) {
    bestPrize = "STRAIGHT HIT ($5,000 TT)";
    payoutTT = 5000;
  } else if (isBox) {
    const boxInfo = getBoxTypeAndPayout(pred);
    bestPrize = `${boxInfo.boxType.toUpperCase()} HIT ($${boxInfo.payout} TT)`;
    payoutTT = boxInfo.payout;
  } else if (isFront3 || isBack3) {
    bestPrize = `${isFront3 ? "Front 3" : "Back 3"} Hit ($500 TT)`;
    payoutTT = 500;
  } else if (isFrontPair || isBackPair || isSplitPair) {
    const pairType = isFrontPair ? "Front Pair" : isBackPair ? "Back Pair" : "Split Pair";
    bestPrize = `${pairType} Hit ($50 TT)`;
    payoutTT = 50;
  } else if (matchedPositionsCount >= 2) {
    bestPrize = `${matchedPositionsCount}/4 Positions`;
  }

  return {
    isStraight,
    isBox,
    isFront3,
    isBack3,
    isFrontPair,
    isBackPair,
    isSplitPair,
    matchedPositionsCount,
    bestPrize,
    payoutTT
  };
}

// Generate the 10 synthesis candidates + 10 Mandel wheel slips for a historical slice
function generatePortfolio(historicalSlice: Pick4Draw[]): { candidates: number[][]; wheel: number[][] } {
  const N = historicalSlice.length;
  const latest = historicalSlice[N - 1];
  const prevDigits = [latest.digit1, latest.digit2, latest.digit3, latest.digit4];

  // Frequency in recent 15 draws
  const recent15 = historicalSlice.slice(-15);
  const digitScore = Array(10).fill(0);
  const posCounts = [Array(10).fill(0), Array(10).fill(0), Array(10).fill(0), Array(10).fill(0)];

  recent15.forEach((d, idx) => {
    const recencyWeight = (idx + 1) / 15;
    const digits = [d.digit1, d.digit2, d.digit3, d.digit4];
    digits.forEach((val, pos) => {
      digitScore[val] += 2 * recencyWeight;
      posCounts[pos][val] += 2 * recencyWeight;
    });
  });

  // Lag 1 boost: carryover digits have 82.3% empirical rate!
  prevDigits.forEach(d => {
    digitScore[d] += 3.5;
  });

  // Rank overall digits
  const rankedDigits = Array.from({ length: 10 }, (_, i) => i)
    .sort((a, b) => digitScore[b] - digitScore[a]);

  // Positional ranked digits
  const topPos = (pos: number, rank = 0) => {
    const sorted = Array.from({ length: 10 }, (_, i) => i)
      .sort((a, b) => (posCounts[pos][b] * 2 + digitScore[b]) - (posCounts[pos][a] * 2 + digitScore[a]));
    return sorted[rank % 10];
  };

  // Primary 6-digit attractor core
  const core6 = rankedDigits.slice(0, 6);
  const banker1 = core6[0];
  const banker2 = core6[1];

  // 10 Synthesis Candidates
  const c1 = [topPos(0, 0), topPos(1, 0), topPos(2, 0), topPos(3, 0)]; // Alpha Centroid
  const c2 = [prevDigits[0], prevDigits[1], topPos(2, 0), topPos(3, 1)]; // Lag 1 Carryover
  const c3 = [core6[0], core6[1], core6[2], core6[3]]; // Mandel 24-way Core
  const c4 = [banker1, banker1, core6[2], core6[3]]; // 12-Way Pair Resonance (Banker pair)
  const c5 = [(prevDigits[0] + 9 - prevDigits[1] + 10) % 10, topPos(1, 1), topPos(2, 1), (prevDigits[3] + 9) % 10]; // CRT Modulo 9
  const c6 = [(prevDigits[0] + 5) % 10, (prevDigits[1] + 5) % 10, (prevDigits[2] + 4) % 10, (prevDigits[3] + 6) % 10]; // Poisson Tension
  const c7 = [(prevDigits[0] + 1) % 10, (prevDigits[1] + 2) % 10, (prevDigits[2] + 1) % 10, (prevDigits[3] + 2) % 10]; // Takens Kinematic
  const c8 = [banker1, banker1, banker2, banker2]; // 6-Way Dual Pair
  const c9 = [core6[1], core6[2], core6[4], core6[5]]; // Secondary Core Set
  const c10 = [banker2, banker2, core6[0], core6[4]]; // 12-Way Secondary Pair

  const candidates = [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10];

  // 10-Slip Mandel Condensation Wheel covering the 6-digit attractor core
  const w1 = [core6[0], core6[1], core6[2], core6[3]];
  const w2 = [core6[0], core6[1], core6[4], core6[5]];
  const w3 = [core6[0], core6[2], core6[3], core6[4]];
  const w4 = [core6[1], core6[2], core6[3], core6[5]];
  const w5 = [core6[0], core6[3], core6[4], core6[5]];
  const w6 = [core6[1], core6[2], core6[4], core6[5]];
  const w7 = [core6[0], core6[1], core6[3], core6[5]];
  const w8 = [core6[0], core6[2], core6[4], core6[5]];
  const w9 = [banker1, banker1, core6[1], core6[2]]; // Banker double
  const w10 = [banker2, banker2, core6[0], core6[3]]; // Secondary banker double

  const wheel = [w1, w2, w3, w4, w5, w6, w7, w8, w9, w10];

  return { candidates, wheel };
}

async function run() {
  const res = await db.execute(`
    SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 
    FROM pick4_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const draws: Pick4Draw[] = res.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    draw_time_slot: String(r.draw_time_slot || "MORNING"),
    digit1: Number(r.digit1),
    digit2: Number(r.digit2),
    digit3: Number(r.digit3),
    digit4: Number(r.digit4)
  }));

  console.log(`Analyzing ${draws.length} Pick 4 draws.`);

  for (const depth of [50, 100, 200, 500, draws.length - 20]) {
    const N = draws.length;
    const startIdx = Math.max(20, N - depth);

    let straightHits = 0;
    let boxHits = 0;
    let frontBack3Hits = 0;
    let pairHits = 0;
    let anyPrizeHits = 0;
    let totalSimulatedPayout = 0;
    let threeDigitsOverlap = 0;
    let testedCount = 0;

    for (let i = startIdx; i < N; i++) {
      testedCount++;
      const historicalSlice = draws.slice(0, i);
      const actual = [draws[i].digit1, draws[i].digit2, draws[i].digit3, draws[i].digit4];

      const { candidates, wheel } = generatePortfolio(historicalSlice);
      // Portfolio tickets: 10 candidates + 10 wheel slips = 20 tickets
      const allTickets = [...candidates, ...wheel];

      let bestForDraw = {
        isStraight: false,
        isBox: false,
        isFrontBack3: false,
        isPair: false,
        matchedPos: 0,
        drawPayout: 0
      };

      for (const ticket of allTickets) {
        const ev = evaluateTicket(ticket, actual);
        if (ev.isStraight) bestForDraw.isStraight = true;
        if (ev.isBox) bestForDraw.isBox = true;
        if (ev.isFront3 || ev.isBack3) bestForDraw.isFrontBack3 = true;
        if (ev.isFrontPair || ev.isBackPair || ev.isSplitPair) bestForDraw.isPair = true;
        if (ev.matchedPositionsCount > bestForDraw.matchedPos) bestForDraw.matchedPos = ev.matchedPositionsCount;
        bestForDraw.drawPayout += ev.payoutTT;
      }

      if (bestForDraw.isStraight) straightHits++;
      if (bestForDraw.isBox) boxHits++;
      if (bestForDraw.isFrontBack3) frontBack3Hits++;
      if (bestForDraw.isPair) pairHits++;
      if (bestForDraw.drawPayout > 0) anyPrizeHits++;
      if (bestForDraw.matchedPos >= 3) threeDigitsOverlap++;
      totalSimulatedPayout += bestForDraw.drawPayout;
    }

    console.log(`\n========================================`);
    console.log(`HORIZON: ${depth} (Tested: ${testedCount})`);
    console.log(`Prize Capture Rate: ${anyPrizeHits}/${testedCount} (${(anyPrizeHits/testedCount*100).toFixed(1)}%)`);
    console.log(`Straight Hits: ${straightHits}`);
    console.log(`Box Hits: ${boxHits}`);
    console.log(`Front/Back 3 Hits: ${frontBack3Hits}`);
    console.log(`Pair Hits (Front/Back/Split): ${pairHits}`);
    console.log(`3+ Exact Positions: ${threeDigitsOverlap}/${testedCount} (${(threeDigitsOverlap/testedCount*100).toFixed(1)}%)`);
    console.log(`Total Simulated Payout: $${totalSimulatedPayout.toLocaleString()} TT`);
  }
}

run().catch(console.error);
