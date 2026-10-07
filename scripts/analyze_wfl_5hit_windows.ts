import { createClient } from "@libsql/client";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

async function analyzeWfl5HitWindows() {
  const wflRows = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball FROM winforlife_draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const wflDraws = wflRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5), Number(r.num6)].sort((a, b) => a - b),
    cash_ball: Number(r.cash_ball || 1)
  }));

  console.log(`Analyzing ${wflDraws.length} Win For Life draws for 5+ Hit window containment...\n`);

  for (const poolSize of [14, 16, 18]) {
    const windowSizes = [1, 2, 3, 5, 7];
    const window5HitCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 5: 0, 7: 0 };
    const window6HitCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 5: 0, 7: 0 };
    let totalWindows = 0;

    for (let i = 30; i < wflDraws.length; i++) {
      const prior = wflDraws.slice(0, i);
      const H = prior.length;

      const scores = Array(29).fill(0);
      const lastSeen = Array(29).fill(-1);
      const winFreq = Array(29).fill(0);
      prior.slice(Math.max(0, H - 4), H).forEach(d => d.numbers.forEach(n => winFreq[n]++));
      prior.forEach((d, idx) => d.numbers.forEach(n => { scores[n]++; lastSeen[n] = idx; }));

      for (let b = 1; b <= 28; b++) {
        const drought = (H - 1) - lastSeen[b];
        scores[b] += winFreq[b] * 5;
        if (drought === 0) scores[b] += 8;
        else if (drought <= 2) scores[b] += 4;
        if (drought >= 6 && drought <= 12) scores[b] += 4;
      }

      const pool = new Set(
        Array.from({ length: 28 }, (_, idx) => idx + 1)
          .sort((a, b) => scores[b] - scores[a])
          .slice(0, poolSize)
      );

      for (const w of windowSizes) {
        let maxHit = 0;
        for (let offset = 0; offset < w; offset++) {
          if (i - offset >= 0) {
            const hit = wflDraws[i - offset].numbers.filter(n => pool.has(n)).length;
            if (hit > maxHit) maxHit = hit;
          }
        }
        if (maxHit >= 5) window5HitCounts[w]++;
        if (maxHit === 6) window6HitCounts[w]++;
      }
      totalWindows++;
    }

    console.log(`--- WIN FOR LIFE POOL SIZE ${poolSize} (out of 28) across ${totalWindows} test windows ---`);
    for (const w of windowSizes) {
      const rate5 = (window5HitCounts[w] / totalWindows * 100).toFixed(1);
      const rate6 = (window6HitCounts[w] / totalWindows * 100).toFixed(1);
      console.log(`  Window ${w}-Draw: 5+ Capture = ${rate5}% | 6/6 Capture = ${rate6}%`);
    }
    console.log("");
  }
}

analyzeWfl5HitWindows().catch(console.error);
