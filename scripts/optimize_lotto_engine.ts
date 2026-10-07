import { createClient } from "@libsql/client";
import * as fs from "fs";
import { LottoDraw } from "../src/lib/lotto_forensic_engine";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

async function optimizeLotto() {
  const lottoRows = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const draws: LottoDraw[] = lottoRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
    powerball: Number(r.powerball || 1)
  }));

  console.log(`Optimizing over ${draws.length} draws...`);

  // Let's test different wheelings over the top 10, 12, 14, 16 balls of the dynamic attractor
  for (const coreSize of [10, 12, 14, 16, 18]) {
    let win3PlusCount = 0;
    let win4PlusCount = 0;
    let win5Count = 0;
    const testCount = 100;

    for (let i = draws.length - testCount; i < draws.length; i++) {
      const prior = draws.slice(0, i);
      const target = draws[i];
      const targetSet = new Set(target.numbers);

      // Rank balls from prior
      const scores = Array(36).fill(0);
      const lastSeen = Array(36).fill(-1);
      prior.forEach((d, idx) => {
        d.numbers.forEach(n => {
          scores[n] += 1;
          lastSeen[n] = idx;
        });
      });
      for (let b = 1; b <= 35; b++) {
        const drought = (i - 1) - lastSeen[b];
        if (drought === 0) scores[b] += 8; // Carryover
        if (drought <= 2) scores[b] += 4;
        if (drought >= 8 && drought <= 14) scores[b] += 3; // Poisson turnaround
      }

      const ranked = Array.from({ length: 35 }, (_, idx) => idx + 1)
        .sort((a, b) => scores[b] - scores[a])
        .slice(0, coreSize);

      const capturedInCore = target.numbers.filter(n => ranked.includes(n)).length;
      if (capturedInCore >= 3) win3PlusCount++;
      if (capturedInCore >= 4) win4PlusCount++;
      if (capturedInCore === 5) win5Count++;
    }

    console.log(`Core Size ${coreSize}: Last 100 Draws Core Capture -> 3+: ${win3PlusCount}%, 4+: ${win4PlusCount}%, 5/5: ${win5Count}%`);
  }
}

optimizeLotto().catch(console.error);
