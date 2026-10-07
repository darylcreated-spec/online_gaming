import { createClient } from "@libsql/client";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/TURSO_DATABASE_URL=(.+)/)![1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)![1].trim();
const db = createClient({ url, authToken: token });

async function analyze() {
  const res = await db.execute(`
    SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 
    FROM pick4_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const draws = res.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    draw_time_slot: String(r.draw_time_slot || "MORNING"),
    digits: [Number(r.digit1), Number(r.digit2), Number(r.digit3), Number(r.digit4)]
  }));

  console.log(`Loaded ${draws.length} draws.`);

  // 1. Analyze digit pool coverage
  // For each draw i, if we pick the top K most frequent digits from rolling window W:
  for (const W of [10, 15, 20, 30]) {
    for (const K of [5, 6, 7]) {
      let capture4 = 0;
      let capture3 = 0;
      let tested = 0;
      for (let i = W; i < draws.length; i++) {
        tested++;
        const window = draws.slice(i - W, i);
        const freq: Record<number, number> = {};
        for (let d = 0; d <= 9; d++) freq[d] = 0;
        window.forEach(w => w.digits.forEach(d => freq[d]++));

        const topK = Object.keys(freq).map(Number).sort((a, b) => freq[b] - freq[a]).slice(0, K);
        const target = draws[i].digits;
        const capturedInPool = target.filter(d => topK.includes(d)).length;
        if (capturedInPool >= 4) capture4++;
        if (capturedInPool >= 3) capture3++;
      }
      console.log(`Window=${W}, Pool K=${K}: >=4 in pool: ${(capture4/tested*100).toFixed(1)}% | >=3 in pool: ${(capture3/tested*100).toFixed(1)}%`);
    }
  }

  // 2. Positional top candidates:
  console.log("\nPositional Top 2 / Top 3 per column coverage:");
  for (const W of [10, 20, 30]) {
    let exactAll4InTop2 = 0;
    let exactAll4InTop3 = 0;
    let exact3InTop2 = 0;
    let exact3InTop3 = 0;
    let tested = 0;
    for (let i = W; i < draws.length; i++) {
      tested++;
      const window = draws.slice(i - W, i);
      const posFreq = [Array(10).fill(0), Array(10).fill(0), Array(10).fill(0), Array(10).fill(0)];
      window.forEach(w => {
        for (let p = 0; p < 4; p++) posFreq[p][w.digits[p]]++;
      });
      const top2PerPos = posFreq.map(counts => 
        Array.from({ length: 10 }, (_, d) => d).sort((a, b) => counts[b] - counts[a]).slice(0, 2)
      );
      const top3PerPos = posFreq.map(counts => 
        Array.from({ length: 10 }, (_, d) => d).sort((a, b) => counts[b] - counts[a]).slice(0, 3)
      );

      const target = draws[i].digits;
      const matchTop2 = target.filter((d, p) => top2PerPos[p].includes(d)).length;
      const matchTop3 = target.filter((d, p) => top3PerPos[p].includes(d)).length;
      if (matchTop2 === 4) exactAll4InTop2++;
      if (matchTop2 >= 3) exact3InTop2++;
      if (matchTop3 === 4) exactAll4InTop3++;
      if (matchTop3 >= 3) exact3InTop3++;
    }
    console.log(`Window=${W}: All 4 in Top 2: ${(exactAll4InTop2/tested*100).toFixed(1)}%, >=3 in Top 2: ${(exact3InTop2/tested*100).toFixed(1)}%`);
    console.log(`Window=${W}: All 4 in Top 3: ${(exactAll4InTop3/tested*100).toFixed(1)}%, >=3 in Top 3: ${(exact3InTop3/tested*100).toFixed(1)}%`);
  }
}

analyze().catch(console.error);
