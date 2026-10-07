import { createClient } from "@libsql/client";
import * as fs from "fs";
import { LottoDraw } from "../src/lib/lotto_forensic_engine";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

async function verifyPool18() {
  const lottoRows = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const sortedDraws: LottoDraw[] = lottoRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
    powerball: Number(r.powerball || 1)
  }));

  // True walk-forward rolling window capture:
  let win5Count = 0;
  let win3Count = 0;
  let win2Count = 0;
  let single3Count = 0;
  let totalWalk = 0;

  for (let i = 50; i < sortedDraws.length; i++) {
    const prior = sortedDraws.slice(0, i);
    const H = prior.length;
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

    const pool18 = Array.from({ length: 35 }, (_, idx) => idx + 1)
      .sort((a, b) => scores[b] - scores[a])
      .slice(0, 18);
    const pSet = new Set(pool18);

    if (sortedDraws[i].numbers.filter(n => pSet.has(n)).length >= 3) single3Count++;

    const hit2 = [0, 1].some(offset => i - offset >= 0 && sortedDraws[i - offset].numbers.filter(n => pSet.has(n)).length >= 3);
    if (hit2) win2Count++;

    const hit3 = [0, 1, 2].some(offset => i - offset >= 0 && sortedDraws[i - offset].numbers.filter(n => pSet.has(n)).length >= 3);
    if (hit3) win3Count++;

    const hit5 = [0, 1, 2, 3, 4].some(offset => i - offset >= 0 && sortedDraws[i - offset].numbers.filter(n => pSet.has(n)).length >= 3);
    if (hit5) win5Count++;

    totalWalk++;
  }

  console.log(`True Walk-Forward across ${totalWalk} windows:`);
  console.log(`Single Draw 3+: ${(single3Count/totalWalk*100).toFixed(1)}%`);
  console.log(`2-Draw Window: ${(win2Count/totalWalk*100).toFixed(1)}%`);
  console.log(`3-Draw Window: ${(win3Count/totalWalk*100).toFixed(1)}%`);
  console.log(`5-Draw Window (5 in a row): ${(win5Count/totalWalk*100).toFixed(1)}%`);
}

verifyPool18().catch(console.error);
