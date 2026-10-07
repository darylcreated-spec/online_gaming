import { createClient } from "@libsql/client";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

async function analyzeLottoPlusPatterns() {
  const lottoRows = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const draws = lottoRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
    powerball: Number(r.powerball || 1)
  }));

  console.log(`Analyzing ${draws.length} Lotto Plus draws...`);

  // 1. Ball Frequencies
  const freq = Array(36).fill(0);
  draws.forEach(d => d.numbers.forEach(n => freq[n]++));

  // 2. Rolling window capture rates for different pool sizes (14, 16, 18, 20)
  for (const poolSize of [14, 16, 18, 20, 22]) {
    let single3Plus = 0;
    let window2_3Plus = 0;
    let window3_3Plus = 0;
    let window5_3Plus = 0;
    let totalWindows = 0;

    for (let i = 50; i < draws.length; i++) {
      // Prior draws
      const prior = draws.slice(0, i);
      
      // Calculate ball scores on prior
      const ballScores = Array(36).fill(0);
      const lastSeen = Array(36).fill(-1);
      prior.forEach((d, idx) => {
        d.numbers.forEach(n => {
          ballScores[n] += 1;
          lastSeen[n] = idx;
        });
      });
      // Add recency bonus
      for (let b = 1; b <= 35; b++) {
        const drought = (i - 1) - lastSeen[b];
        if (drought === 0) ballScores[b] += 5;
        if (drought <= 3) ballScores[b] += 3;
      }

      // Rank top poolSize balls
      const ranked = Array.from({ length: 35 }, (_, idx) => idx + 1)
        .sort((a, b) => ballScores[b] - ballScores[a]);
      const pool = new Set(ranked.slice(0, poolSize));

      // Check current draw i
      const hitCount = draws[i].numbers.filter(n => pool.has(n)).length;
      if (hitCount >= 3) single3Plus++;

      // Check 2-draw window (draws[i] and draws[i-1])
      const hit2 = (draws[i].numbers.filter(n => pool.has(n)).length >= 3) ||
                   (i > 0 && draws[i-1].numbers.filter(n => pool.has(n)).length >= 3);
      if (hit2) window2_3Plus++;

      // Check 3-draw window
      const hit3 = [0, 1, 2].some(offset => (i - offset >= 0) && draws[i - offset].numbers.filter(n => pool.has(n)).length >= 3);
      if (hit3) window3_3Plus++;

      // Check 5-draw window
      const hit5 = [0, 1, 2, 3, 4].some(offset => (i - offset >= 0) && draws[i - offset].numbers.filter(n => pool.has(n)).length >= 3);
      if (hit5) window5_3Plus++;

      totalWindows++;
    }

    console.log(`Pool Size ${poolSize} (out of 35): Single 3+: ${(single3Plus/totalWindows*100).toFixed(1)}%, 2-draw: ${(window2_3Plus/totalWindows*100).toFixed(1)}%, 3-draw: ${(window3_3Plus/totalWindows*100).toFixed(1)}%, 5-draw: ${(window5_3Plus/totalWindows*100).toFixed(1)}%`);
  }
}

analyzeLottoPlusPatterns().catch(console.error);
