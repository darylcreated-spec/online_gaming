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

  // Let's test different covering wheel designs for an 18-ball pool (or 16-ball pool)
  // Let's create a mathematical covering wheel for 18 balls into 8-10 tickets
  // A standard covering wheel design for 18 numbers: C(18, 6, 3, 3) or C(18, 6, 3, 4)
  // For 18 numbers (indices 0..17):
  // Let's test how various designs perform on the entire database (draws 15..468)

  function evaluatePortfolio(getPortfolio: (pool: number[], ranked: number[], prevNums: number[], winFreq: number[], velocity: number[]) => { name: string; numbers: number[] }[]) {
    let winCount = 0;
    let hit6 = 0, hit5 = 0, hit4 = 0, hit3 = 0;
    let payout = 0;
    const testCount = draws.length - 15;

    for (let i = 15; i < draws.length; i++) {
      const hist = draws.slice(0, i);
      const target = draws[i];
      const targetSet = new Set(target.numbers);
      const H = hist.length;
      const latest = hist[H - 1];
      const prev = hist[H - 2] || latest;
      const latestNums = latest.numbers;

      const windowDraws = hist.slice(Math.max(0, H - 4), H);
      const winFreq = Array(29).fill(0);
      windowDraws.forEach(d => d.numbers.forEach(n => winFreq[n]++));

      const aff = Array.from({ length: 29 }, () => Array(29).fill(0));
      const lastSeen = Array(29).fill(-1);
      const totalFreq = Array(29).fill(0);
      const skips = Array.from({ length: 29 }, () => [] as number[]);

      hist.forEach((d, hIdx) => {
        d.numbers.forEach(n => {
          totalFreq[n]++;
          if (lastSeen[n] !== -1) skips[n].push(hIdx - lastSeen[n] - 1);
          lastSeen[n] = hIdx;
        });
        for (let a = 0; a < 6; a++) {
          for (let b = a + 1; b < 6; b++) {
            aff[d.numbers[a]][d.numbers[b]]++;
            aff[d.numbers[b]][d.numbers[a]]++;
          }
        }
      });

      const degreeCentrality = Array(29).fill(0);
      for (let a = 1; a <= 28; a++) {
        for (let b = 1; b <= 28; b++) degreeCentrality[a] += aff[a][b];
      }

      const velocity = latest.numbers.map((n, idx) => n - (prev ? prev.numbers[idx] : n));

      const synthesisScores = Array(29).fill(0);
      const droughts = Array(29).fill(0);
      for (let b = 1; b <= 28; b++) {
        droughts[b] = H - 1 - lastSeen[b];
        let s = (totalFreq[b] / H) * 20;
        s += winFreq[b] * 32;
        if (droughts[b] === 0) s += 28;
        else if (droughts[b] === 1) s += 16;
        else if (droughts[b] === 2) s += 12;
        s += (degreeCentrality[b] / 100) * 1.5;
        let affLatest = 0;
        latestNums.forEach(ln => affLatest += aff[b][ln]);
        s += (affLatest / 6) * 1.5;
        if (droughts[b] >= 8 && droughts[b] <= 14) s += 25;
        if (b % 4 !== 0 && b % 7 !== 0) s += 6;
        synthesisScores[b] = s;
      }

      const ranked = [];
      for (let b = 1; b <= 28; b++) {
        const avg = skips[b].length ? skips[b].reduce((x, y) => x + y, 0) / skips[b].length : 3.5;
        ranked.push({ b, s: synthesisScores[b], drought: droughts[b], avg });
      }
      ranked.sort((x, y) => y.s - x.s);

      const pool18 = ranked.slice(0, 18).map(x => x.b);
      const rankedBalls = ranked.map(x => x.b);

      const portfolio = getPortfolio(pool18, rankedBalls, latestNums, winFreq, velocity);

      let bestHit = 0;
      portfolio.forEach(t => {
        const h = t.numbers.filter(n => targetSet.has(n)).length;
        if (h > bestHit) bestHit = h;
      });

      if (bestHit === 6) { hit6++; winCount++; payout += 480000; }
      else if (bestHit === 5) { hit5++; winCount++; payout += 1000; }
      else if (bestHit === 4) { hit4++; winCount++; payout += 50; }
      else if (bestHit === 3) { hit3++; winCount++; payout += 10; }
    }

    const rate = (winCount / testCount * 100).toFixed(1);
    console.log(`Results: WinRate: ${winCount}/${testCount} (${rate}%) | 6-hit: ${hit6} | 5-hit: ${hit5} | 4-hit: ${hit4} | 3-hit: ${hit3} | Payout: $${payout.toLocaleString()}`);
  }

  // Baseline test: current 14 tickets (8 candidates + 6 wheels)
  console.log("Testing current baseline structure:");
  // Let's implement baseline in the callback to verify
}

run();
