import { createClient } from "@libsql/client";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/TURSO_DATABASE_URL=(.+)/)![1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)![1].trim();
const db = createClient({ url, authToken: token });

async function experiment() {
  const res = await db.execute(`
    SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball 
    FROM winforlife_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const draws = res.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [
      Number(r.num1),
      Number(r.num2),
      Number(r.num3),
      Number(r.num4),
      Number(r.num5),
      Number(r.num6)
    ].sort((a, b) => a - b),
    cash_ball: Number(r.cash_ball || 1)
  }));

  console.log(`Experiment loaded ${draws.length} draws.`);

  // Let's test pool sizes from 14 to 18 and evaluate how often draws have >= 3, >= 4, >= 5, 6 balls in the pool.
  for (let poolSize = 14; poolSize <= 18; poolSize++) {
    let cap3 = 0, cap4 = 0, cap5 = 0, cap6 = 0;
    const testCount = draws.length - 15;
    for (let i = 15; i < draws.length; i++) {
      const hist = draws.slice(0, i);
      const target = draws[i];
      const targetSet = new Set(target.numbers);

      // Simple frequency + momentum ranking
      const H = hist.length;
      const winFreq = Array(29).fill(0);
      hist.slice(-4).forEach(d => d.numbers.forEach(n => winFreq[n]++));
      const totalFreq = Array(29).fill(0);
      const lastSeen = Array(29).fill(-1);
      hist.forEach((d, idx) => {
        d.numbers.forEach(n => {
          totalFreq[n]++;
          lastSeen[n] = idx;
        });
      });

      const scores = Array(29).fill(0);
      for (let b = 1; b <= 28; b++) {
        const drought = H - 1 - lastSeen[b];
        scores[b] = (totalFreq[b] / H) * 20 + winFreq[b] * 32;
        if (drought === 0) scores[b] += 28;
        else if (drought === 1) scores[b] += 16;
        else if (drought === 2) scores[b] += 12;
        if (drought >= 8 && drought <= 14) scores[b] += 25;
        if (b % 4 !== 0 && b % 7 !== 0) scores[b] += 6;
      }

      const ranked = [];
      for (let b = 1; b <= 28; b++) ranked.push({ b, s: scores[b] });
      ranked.sort((x, y) => y.s - x.s);
      const pool = new Set(ranked.slice(0, poolSize).map(x => x.b));

      const hits = target.numbers.filter(n => pool.has(n)).length;
      if (hits >= 3) cap3++;
      if (hits >= 4) cap4++;
      if (hits >= 5) cap5++;
      if (hits === 6) cap6++;
    }
    console.log(`Pool Size ${poolSize}: Cap >=3: ${cap3}/${testCount} (${(cap3/testCount*100).toFixed(1)}%) | Cap >=4: ${cap4}/${testCount} (${(cap4/testCount*100).toFixed(1)}%) | Cap >=5: ${cap5}/${testCount} (${(cap5/testCount*100).toFixed(1)}%) | Cap 6: ${cap6}/${testCount}`);
  }
}

experiment().catch(console.error);
