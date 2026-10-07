import { createClient } from "@libsql/client";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

async function analyze5HitWindows() {
  console.log("================================================================================");
  console.log("5-HIT WINDOW COMBINATORIAL & EMPIRICAL ANALYSIS");
  console.log("================================================================================\n");

  // 1. LOTTO PLUS (5/35)
  const lottoRows = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const lottoDraws = lottoRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
    powerball: Number(r.powerball || 1)
  }));

  console.log(`Analyzing ${lottoDraws.length} Lotto Plus draws for 5-Hit window containment...\n`);

  // Test across pool sizes: 16, 18, 20, 22, 24
  for (const poolSize of [16, 18, 20, 22, 24]) {
    // We check windows of size 1, 2, 3, 5, 7, 10
    const windowSizes = [1, 2, 3, 5, 7, 10];
    const window5HitCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 5: 0, 7: 0, 10: 0 };
    const window4HitCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 5: 0, 7: 0, 10: 0 };
    let totalWindows = 0;

    for (let i = 50; i < lottoDraws.length; i++) {
      const prior = lottoDraws.slice(0, i);
      const H = prior.length;

      // Score balls dynamically from prior
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

      const pool = new Set(
        Array.from({ length: 35 }, (_, idx) => idx + 1)
          .sort((a, b) => scores[b] - scores[a])
          .slice(0, poolSize)
      );

      for (const w of windowSizes) {
        let maxHit = 0;
        for (let offset = 0; offset < w; offset++) {
          if (i - offset >= 0) {
            const hit = lottoDraws[i - offset].numbers.filter(n => pool.has(n)).length;
            if (hit > maxHit) maxHit = hit;
          }
        }
        if (maxHit === 5) window5HitCounts[w]++;
        if (maxHit >= 4) window4HitCounts[w]++;
      }
      totalWindows++;
    }

    console.log(`--- POOL SIZE ${poolSize} (out of 35) across ${totalWindows} test windows ---`);
    for (const w of windowSizes) {
      const rate5 = (window5HitCounts[w] / totalWindows * 100).toFixed(1);
      const rate4 = (window4HitCounts[w] / totalWindows * 100).toFixed(1);
      console.log(`  Window ${w}-Draw: 5/5 Capture = ${rate5}% (${window5HitCounts[w]}/${totalWindows}) | 4+ Capture = ${rate4}%`);
    }
    console.log("");
  }
}

analyze5HitWindows().catch(console.error);
