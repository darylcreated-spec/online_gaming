import { createClient } from "@libsql/client";
import * as fs from "fs";
import { LottoDraw } from "../src/lib/lotto_forensic_engine";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

// 12-slip Mandel Covering Array for 18-ball core (5-ball lines)
// Optimized to maximize 3-if-3, 3-if-4, and 4-if-5 overlap density
const COVERING_WHEEL_18_5BALL: number[][] = [
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
  [5, 11, 12, 14, 16]
];

async function testEnhancedLotto() {
  const lottoRows = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const draws: LottoDraw[] = lottoRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
    powerball: Number(r.powerball || 1)
  }));

  const testDrawsCount = 100;
  let hit3Count = 0;
  let hit4Count = 0;
  let hit5Count = 0;
  let hit2Count = 0;
  let hit1Count = 0;
  let totalPayout = 0;

  for (let i = draws.length - testDrawsCount; i < draws.length; i++) {
    const prior = draws.slice(0, i);
    const target = draws[i];
    const targetSet = new Set(target.numbers);

    // Dynamic 18-ball pool from prior
    const scores = Array(36).fill(0);
    const lastSeen = Array(36).fill(-1);
    const winFreq = Array(36).fill(0);
    const H = prior.length;
    prior.slice(Math.max(0, H - 4), H).forEach(d => d.numbers.forEach(n => winFreq[n]++));

    prior.forEach((d, idx) => {
      d.numbers.forEach(n => {
        scores[n] += 1;
        lastSeen[n] = idx;
      });
    });

    for (let b = 1; b <= 35; b++) {
      const drought = (H - 1) - lastSeen[b];
      scores[b] += winFreq[b] * 6;
      if (drought === 0) scores[b] += 8;
      else if (drought <= 2) scores[b] += 4;
      if (drought >= 8 && drought <= 14) scores[b] += 5;
      if (b % 5 !== 0 && b % 7 !== 0) scores[b] += 2;
    }

    const pool18 = Array.from({ length: 35 }, (_, idx) => idx + 1)
      .sort((a, b) => scores[b] - scores[a])
      .slice(0, 18);

    // Build 12 wheel tickets
    const wheelTickets = COVERING_WHEEL_18_5BALL.map(indices => 
      indices.map(idx => pool18[idx % pool18.length]).sort((a, b) => a - b)
    );

    // Evaluate best hit across the 12 wheel tickets
    let bestHit = 0;
    wheelTickets.forEach(ticket => {
      const h = ticket.filter(n => targetSet.has(n)).length;
      if (h > bestHit) bestHit = h;
    });

    if (bestHit === 5) { hit5Count++; totalPayout += 50000; }
    else if (bestHit === 4) { hit4Count++; totalPayout += 250; }
    else if (bestHit === 3) { hit3Count++; totalPayout += 5; }
    else if (bestHit === 2) { hit2Count++; }
    else if (bestHit === 1) { hit1Count++; }
  }

  console.log(`--- Enhanced 18-Ball Wheel Results (Last ${testDrawsCount} Draws) ---`);
  console.log(`Match 5: ${hit5Count}`);
  console.log(`Match 4: ${hit4Count}`);
  console.log(`Match 3: ${hit3Count}`);
  console.log(`Match 2: ${hit2Count}`);
  console.log(`Money Hit Rate (>=3): ${((hit3Count + hit4Count + hit5Count) / testDrawsCount * 100).toFixed(1)}%`);
  console.log(`>=2 Hit Rate: ${((hit2Count + hit3Count + hit4Count + hit5Count) / testDrawsCount * 100).toFixed(1)}%`);
  console.log(`Total Simulated Payout: $${totalPayout.toLocaleString()} TT`);
}

testEnhancedLotto().catch(console.error);
