import { createClient } from "@libsql/client";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/TURSO_DATABASE_URL=(.+)/)![1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)![1].trim();
const db = createClient({ url, authToken: token });

async function checkPatterns() {
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

  const N = draws.length;
  console.log(`Analyzed ${N} draws.`);

  // 1. Lag 1 carryover: How many digits carry over from draw t-1 to draw t?
  const carryoverCounts = [0, 0, 0, 0, 0];
  for (let i = 1; i < N; i++) {
    const prev = draws[i - 1].digits;
    const curr = draws[i].digits;
    const c = curr.filter(d => prev.includes(d)).length;
    carryoverCounts[c]++;
  }
  console.log("\nLag 1 Carryover Digits (how many digits in curr were in prev):");
  carryoverCounts.forEach((cnt, k) => {
    console.log(`  ${k} digits carryover: ${cnt}/${N-1} (${(cnt/(N-1)*100).toFixed(1)}%)`);
  });

  // 2. Pair / Double presence:
  let hasPair = 0;
  let hasTriple = 0;
  let allDistinct = 0;
  draws.forEach(d => {
    const s = new Set(d.digits).size;
    if (s === 4) allDistinct++;
    else if (s === 3) hasPair++;
    else if (s === 2) {
      const counts: Record<number, number> = {};
      d.digits.forEach(x => counts[x] = (counts[x] || 0) + 1);
      if (Object.values(counts).includes(3)) hasTriple++;
      else hasPair++;
    }
  });
  console.log(`\nBox Structure Distribution:`);
  console.log(`  24-Way (all distinct): ${allDistinct}/${N} (${(allDistinct/N*100).toFixed(1)}%)`);
  console.log(`  12-Way or 6-Way (pairs): ${hasPair}/${N} (${(hasPair/N*100).toFixed(1)}%)`);
  console.log(`  4-Way (triples): ${hasTriple}/${N} (${(hasTriple/N*100).toFixed(1)}%)`);

  // 3. Difference from previous draw (modulo 10):
  // Let diff = (curr - prev) mod 10
  const diffFreq: Record<number, number> = {};
  for (let d = 0; d < 10; d++) diffFreq[d] = 0;
  for (let i = 1; i < N; i++) {
    for (let p = 0; p < 4; p++) {
      const diff = (draws[i].digits[p] - draws[i-1].digits[p] + 10) % 10;
      diffFreq[diff]++;
    }
  }
  console.log("\nPositional Transition Step (curr[p] - prev[p] mod 10):");
  Object.entries(diffFreq).forEach(([diff, cnt]) => {
    console.log(`  Step +${diff}: ${cnt} (${(cnt/( (N-1)*4 )*100).toFixed(1)}%)`);
  });
}

checkPatterns().catch(console.error);
