import { createClient } from "@libsql/client";
import * as fs from "fs";
import { LottoDraw } from "../src/lib/lotto_forensic_engine";
import { FastLotteryWheeler } from "../src/lib/FastLotteryWheeler";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

// 16-Slip High-Density Covering Array Wheel over 18-22 balls
// Designed to maximize 4-if-5 and 5-if-5 capture density when core traps winning numbers
export const HIGH_DENSITY_WHEEL_18_5BALL: number[][] = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [1, 5, 9, 10, 11],
  [2, 6, 9, 12, 13],
  [3, 7, 10, 14, 15],
  [4, 8, 11, 16, 17],
  [0, 9, 10, 12, 16],
  [1, 6, 8, 13, 17],
  [2, 5, 7, 11, 15],
  [3, 8, 9, 14, 17],
  [4, 6, 10, 13, 15],
  [5, 11, 12, 14, 16],
  [0, 2, 8, 10, 17],
  [1, 4, 7, 12, 14],
  [2, 3, 6, 11, 16],
  [0, 4, 9, 13, 15]
];

async function testHighDensityPipeline() {
  const lottoRows = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const draws: LottoDraw[] = lottoRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
    powerball: Number(r.powerball || 1)
  }));

  console.log(`Testing High-Density Pipeline over ${draws.length} historical draws...`);

  // Let's test the last 100 draws
  const testDepth = 100;
  let match5Hits = 0;
  let match4Hits = 0;
  let match3Hits = 0;
  let match2Hits = 0;
  let totalPayout = 0;

  for (let i = draws.length - testDepth; i < draws.length; i++) {
    const prior = draws.slice(0, i);
    const target = draws[i];
    const targetSet = new Set(target.numbers);
    const H = prior.length;

    // Rank balls
    const scores = Array(36).fill(0);
    const lastSeen = Array(36).fill(-1);
    const winFreq = Array(36).fill(0);
    prior.slice(Math.max(0, H - 4), H).forEach(d => d.numbers.forEach(n => winFreq[n]++));
    prior.forEach((d, idx) => d.numbers.forEach(n => { scores[n]++; lastSeen[n] = idx; }));

    for (let b = 1; b <= 35; b++) {
      const drought = (H - 1) - lastSeen[b];
      scores[b] += winFreq[b] * 6;
      if (drought === 0) scores[b] += 8;
      else if (drought <= 2) scores[b] += 4;
      if (drought >= 8 && drought <= 14) scores[b] += 5;
      if (b % 5 !== 0 && b % 7 !== 0) scores[b] += 2;
    }

    const ranked = Array.from({ length: 35 }, (_, idx) => idx + 1)
      .sort((a, b) => scores[b] - scores[a]);

    // 22-ball dual core:
    // Core 18: ranked[0..17]
    // Edge 4: ranked[18..21]
    const core18 = ranked.slice(0, 18);
    const dualCore22 = ranked.slice(0, 22);

    // Identify top Banker: highest scoring carryover ball
    const prevDraw = prior[prior.length - 1];
    const carryovers = prevDraw.numbers.sort((a, b) => scores[b] - scores[a]);
    const bankerBall = carryovers[0] || core18[0];

    // Build High-Density 16-slip tickets from core18
    const wheelTickets = HIGH_DENSITY_WHEEL_18_5BALL.map(indices => 
      indices.map(idx => core18[idx % core18.length]).sort((a, b) => a - b)
    );

    // Also add 4 Banker-anchored slips from dualCore22
    const bankerSlips: number[][] = [
      [bankerBall, core18[1], core18[2], dualCore22[18], dualCore22[19]].sort((a, b) => a - b),
      [bankerBall, core18[3], core18[4], dualCore22[20], dualCore22[21]].sort((a, b) => a - b),
      [bankerBall, core18[5], core18[6], core18[7], core18[8]].sort((a, b) => a - b),
      [bankerBall, core18[0], core18[9], core18[10], core18[11]].sort((a, b) => a - b)
    ];

    const fullTestPortfolio = [...wheelTickets, ...bankerSlips];

    let bestHit = 0;
    fullTestPortfolio.forEach(t => {
      const h = t.filter(n => targetSet.has(n)).length;
      if (h > bestHit) bestHit = h;
    });

    if (bestHit === 5) { match5Hits++; totalPayout += 50000; }
    else if (bestHit === 4) { match4Hits++; totalPayout += 250; }
    else if (bestHit === 3) { match3Hits++; totalPayout += 5; }
    else if (bestHit === 2) { match2Hits++; }
  }

  console.log(`Results for last ${testDepth} draws:`);
  console.log(`Match 5 hits: ${match5Hits}`);
  console.log(`Match 4 hits: ${match4Hits}`);
  console.log(`Match 3 hits: ${match3Hits}`);
  console.log(`Match 2 hits: ${match2Hits}`);
  console.log(`Prize Win Rate (>=3): ${((match3Hits + match4Hits + match5Hits) / testDepth * 100).toFixed(1)}%`);
  console.log(`>=2 Hit Rate: ${((match2Hits + match3Hits + match4Hits + match5Hits) / testDepth * 100).toFixed(1)}%`);
  console.log(`Total Simulated Payout: $${totalPayout.toLocaleString()} TT`);
}

testHighDensityPipeline().catch(console.error);
