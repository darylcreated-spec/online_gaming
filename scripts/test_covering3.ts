import { createClient } from "@libsql/client";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/TURSO_DATABASE_URL=(.+)/)![1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)![1].trim();
const db = createClient({ url, authToken: token });

async function run() {
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

  // Let's test different covering wheels on the historical draws
  // Let's see: what if the covering wheel has 8 tickets? Or 10 tickets? Or 12 tickets?
  // Let's test a covering wheel design generator:
  // For a pool of 16 numbers (indices 0..15), what covering tickets achieve the highest capture?

  // Test various known covering designs for v=16, k=6:
  // Design A: 8 tickets covering v=16
  // Design B: 10 tickets covering v=16
  // Design C: 12 tickets covering v=16
  // Design D: 10 tickets covering v=18
  // Design E: 12 tickets covering v=18

  // Let's write a greedy coverage optimizer for v=16 or v=18:
  // Given all triplets in the pool, greedily pick the 6-ball ticket that covers the most uncovered triplets!
  function generateGreedyCoveringWheel(v: number, targetTickets: number): number[][] {
    const allTriplets: [number, number, number][] = [];
    for (let i = 0; i < v; i++) {
      for (let j = i + 1; j < v; j++) {
        for (let k = j + 1; k < v; k++) {
          allTriplets.push([i, j, k]);
        }
      }
    }

    const uncovered = new Set<string>(allTriplets.map(t => `${t[0]}-${t[1]}-${t[2]}`));
    const tickets: number[][] = [];

    // Candidate 6-combinations:
    // To be efficient, we can start with structured balanced tickets or search
    while (tickets.length < targetTickets) {
      // Find a 6-combination that covers maximum uncovered triplets
      // We can use a randomized hill climber or search across combinations
      let bestT: number[] = [];
      let bestCount = -1;

      for (let iter = 0; iter < 1000; iter++) {
        // Random 6-subset of 0..v-1
        const cand: number[] = [];
        const pool = Array.from({ length: v }, (_, i) => i);
        while (cand.length < 6) {
          const r = Math.floor(Math.random() * pool.length);
          cand.push(pool.splice(r, 1)[0]);
        }
        cand.sort((a, b) => a - b);

        let count = 0;
        for (let a = 0; a < 6; a++) {
          for (let b = a + 1; b < 6; b++) {
            for (let c = b + 1; c < 6; c++) {
              if (uncovered.has(`${cand[a]}-${cand[b]}-${cand[c]}`)) {
                count++;
              }
            }
          }
        }

        if (count > bestCount) {
          bestCount = count;
          bestT = cand;
        }
      }

      // Mark covered
      for (let a = 0; a < 6; a++) {
        for (let b = a + 1; b < 6; b++) {
          for (let c = b + 1; c < 6; c++) {
            uncovered.delete(`${bestT[a]}-${bestT[b]}-${bestT[c]}`);
          }
        }
      }
      tickets.push(bestT);
    }

    return tickets;
  }

  console.log("Generating greedy covering wheel designs...");
  const wheel16_8 = generateGreedyCoveringWheel(16, 8);
  const wheel16_10 = generateGreedyCoveringWheel(16, 10);
  const wheel18_10 = generateGreedyCoveringWheel(18, 10);
  const wheel18_12 = generateGreedyCoveringWheel(18, 12);

  // Let's test these wheels across the 454 historical draws!
  for (const [name, wheel, poolSize] of [
    ["16-ball, 8 tickets", wheel16_8, 16],
    ["16-ball, 10 tickets", wheel16_10, 16],
    ["18-ball, 10 tickets", wheel18_10, 18],
    ["18-ball, 12 tickets", wheel18_12, 18],
  ] as [string, number[][], number][]) {
    let winCount = 0;
    let hit6 = 0, hit5 = 0, hit4 = 0, hit3 = 0;
    let payout = 0;

    for (let i = 15; i < draws.length; i++) {
      const hist = draws.slice(0, i);
      const target = draws[i];
      const targetSet = new Set(target.numbers);

      // Ranking from hist
      const H = hist.length;
      const winFreq = Array(29).fill(0);
      hist.slice(-4).forEach(d => d.numbers.forEach(n => winFreq[n]++));
      const totalFreq = Array(29).fill(0);
      const lastSeen = Array(29).fill(-1);
      hist.forEach((d, hIdx) => {
        d.numbers.forEach(n => {
          totalFreq[n]++;
          lastSeen[n] = hIdx;
        });
      });

      const synthesisScores = Array(29).fill(0);
      for (let b = 1; b <= 28; b++) {
        const drought = H - 1 - lastSeen[b];
        let s = (totalFreq[b] / H) * 20 + winFreq[b] * 32;
        if (drought === 0) s += 28;
        else if (drought === 1) s += 16;
        else if (drought === 2) s += 12;
        if (drought >= 8 && drought <= 14) s += 25;
        if (b % 4 !== 0 && b % 7 !== 0) s += 6;
        synthesisScores[b] = s;
      }

      const ranked = [];
      for (let b = 1; b <= 28; b++) ranked.push({ b, s: synthesisScores[b] });
      ranked.sort((a, b) => b.s - a.s);
      const pool = ranked.slice(0, poolSize).map(x => x.b);

      let bestHit = 0;
      for (const tIndices of wheel) {
        const tNums = tIndices.map(idx => pool[idx]);
        const h = tNums.filter(n => targetSet.has(n)).length;
        if (h > bestHit) bestHit = h;
      }

      if (bestHit === 6) { hit6++; winCount++; payout += 480000; }
      else if (bestHit === 5) { hit5++; winCount++; payout += 1000; }
      else if (bestHit === 4) { hit4++; winCount++; payout += 50; }
      else if (bestHit === 3) { hit3++; winCount++; payout += 10; }
    }

    const testCount = draws.length - 15;
    console.log(`${name} ONLY: WinRate: ${winCount}/${testCount} (${(winCount/testCount*100).toFixed(1)}%) | 6-hit: ${hit6} | 5-hit: ${hit5} | 4-hit: ${hit4} | 3-hit: ${hit3} | Payout: $${payout.toLocaleString()}`);
  }
}

run();
