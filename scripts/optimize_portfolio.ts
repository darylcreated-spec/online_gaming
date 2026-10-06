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

  const testCount = draws.length - 15;

  // Let's test a full backtest function that evaluates a candidate set generator + covering wheel
  function runBacktest(
    poolSize: number,
    candidateCount: number,
    wheelSlips: number[][],
    addExtraCandidates: boolean = true
  ) {
    let winCount = 0;
    let hit6 = 0, hit5 = 0, hit4 = 0, hit3 = 0;
    let payout = 0;

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
        let s = (totalFreq[b] / H) * 20 + winFreq[b] * 32;
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

      const ranked: { b: number; s: number; drought: number; avg: number }[] = [];
      for (let b = 1; b <= 28; b++) {
        const avg = skips[b].length ? skips[b].reduce((x, y) => x + y, 0) / skips[b].length : 3.5;
        ranked.push({ b, s: synthesisScores[b], drought: droughts[b], avg });
      }
      ranked.sort((a, b) => b.s - a.s);

      const pool = ranked.slice(0, poolSize).map(x => x.b);

      // Helper to build a candidate ticket
      function makeTicket(anchors: number[], seedOffset = 0): number[] {
        const set = new Set(anchors);
        const arr = Array.from(set);
        let hasConsec = false;
        for (const a of arr) {
          if (set.has(a + 1) || set.has(a - 1)) { hasConsec = true; break; }
        }
        if (!hasConsec && arr.length > 0) {
          for (const a of arr) {
            if (a < 28 && pool.includes(a + 1)) { set.add(a + 1); hasConsec = true; break; }
            if (a > 1 && pool.includes(a - 1)) { set.add(a - 1); hasConsec = true; break; }
          }
          if (!hasConsec && arr[0] < 28) set.add(arr[0] + 1);
        }

        for (let idx = 0; idx < pool.length; idx++) {
          if (set.size >= 6) break;
          set.add(pool[(idx + seedOffset) % pool.length]);
        }
        for (const r of ranked) {
          if (set.size >= 6) break;
          set.add(r.b);
        }
        return Array.from(set).slice(0, 6).sort((a, b) => a - b);
      }

      // Candidate Sets
      const candidates: number[][] = [];
      // 1. Alpha Balanced
      candidates.push(makeTicket([latestNums[0], latestNums[1] || pool[0]], 0));
      // 2. CRT Galois Ring
      const crtAnchors = pool.filter(n => (n % 4 !== 0) && (n % 7 !== 0)).slice(0, 3);
      candidates.push(makeTicket(crtAnchors.length >= 2 ? crtAnchors : [pool[0], pool[1]], 2));
      // 3. Multi-Lag Resonance
      const waveAnchors = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28]
        .filter(b => winFreq[b] >= 2)
        .sort((a, b) => synthesisScores[b] - synthesisScores[a]);
      candidates.push(makeTicket(waveAnchors.length >= 2 ? waveAnchors.slice(0, 3) : [ranked[0].b, ranked[1].b], 3));
      // 4. Poisson Tension Turnaround
      const tensionBalls = [...ranked].filter(x => droughts[x.b] >= 6).sort((a, b) => droughts[b.b] - droughts[a.b]);
      candidates.push(makeTicket([tensionBalls[0]?.b || 26, latestNums[latestNums.length - 1] || 22], 4));
      // 5. Co-occurrence Affinity Hub
      let bestP1 = 7, bestP2 = 12, maxAff = 0;
      for (let a = 0; a < pool.length; a++) {
        for (let b = a + 1; b < pool.length; b++) {
          if (aff[pool[a]][pool[b]] > maxAff) {
            maxAff = aff[pool[a]][pool[b]];
            bestP1 = pool[a];
            bestP2 = pool[b];
          }
        }
      }
      candidates.push(makeTicket([bestP1, bestP2, latestNums[0] || pool[0]], 1));
      // 6. Takens Kinematic
      const kinematicAnchors = latestNums.map((n, idx) => {
        const shift = Math.round(velocity[idx] * 0.5);
        const c = n + shift;
        return (c >= 1 && c <= 28) ? c : n;
      }).slice(0, 3);
      candidates.push(makeTicket(kinematicAnchors, 5));
      // 7. Non-Linear Parity Inversion
      const evensInPool = pool.filter(n => n % 2 === 0);
      const t7 = evensInPool.length >= 6 ? evensInPool.slice(0, 6) : makeTicket([2, 4], 7);
      candidates.push(t7.sort((a, b) => a - b));
      // 8. Triplet Cascade
      let consecTriplet: number[] | null = null;
      for (let b = 1; b <= 26; b++) {
        if (pool.includes(b) && pool.includes(b + 1) && pool.includes(b + 2)) {
          consecTriplet = [b, b + 1, b + 2];
          break;
        }
      }
      candidates.push(makeTicket(consecTriplet || [pool[0], pool[1], pool[2]], 8));

      // Extra candidate strategies if requested:
      if (addExtraCandidates) {
        // Strategy 9: Odd Parity Inversion Wave
        const oddsInPool = pool.filter(n => n % 2 !== 0);
        const t9 = oddsInPool.length >= 6 ? oddsInPool.slice(0, 6) : makeTicket([1, 3], 9);
        candidates.push(t9.sort((a, b) => a - b));

        // Strategy 10: Markov Lag 1 & Lag 2 Dual Carryover Anchor Set
        const lag1Lag2 = [latestNums[0] || pool[0], prev.numbers[0] || pool[1], pool[2]];
        candidates.push(makeTicket(lag1Lag2, 6));
      }

      // Covering wheel tickets from pool:
      const wheelTickets: number[][] = wheelSlips.map(indices => {
        return indices.map(idx => pool[idx % pool.length]).sort((a, b) => a - b);
      });

      const fullPortfolio = [...candidates, ...wheelTickets];

      let bestHit = 0;
      for (const t of fullPortfolio) {
        const h = t.filter(n => targetSet.has(n)).length;
        if (h > bestHit) bestHit = h;
      }

      if (bestHit === 6) { hit6++; winCount++; payout += 480000; }
      else if (bestHit === 5) { hit5++; winCount++; payout += 1000; }
      else if (bestHit === 4) { hit4++; winCount++; payout += 50; }
      else if (bestHit === 3) { hit3++; winCount++; payout += 10; }
    }

    const rate = (winCount / testCount * 100).toFixed(1);
    const candLen = addExtraCandidates ? 10 : 8;
    console.log(`Pool ${poolSize} | Cand ${candLen} | Wheel ${wheelSlips.length} (${candLen + wheelSlips.length} total) -> WinRate: ${winCount}/${testCount} (${rate}%) | 6-hit: ${hit6} | 5-hit: ${hit5} | 4-hit: ${hit4} | 3-hit: ${hit3} | Payout: $${payout.toLocaleString()} TT`);
  }

  // 1. Current baseline wheel (6 slips on 16)
  const currentWheel6 = [
    [0, 1, 2, 3, 4, 5],
    [0, 1, 6, 7, 8, 9],
    [2, 3, 4, 10, 11, 12],
    [0, 2, 5, 7, 9, 13],
    [1, 3, 6, 8, 10, 14],
    [4, 5, 6, 11, 13, 15]
  ];

  console.log("--- 1. Baseline ---");
  runBacktest(16, 8, currentWheel6, false);

  // 2. High-Density Covering Wheels on 16-ball pool
  // An 8-ticket covering wheel covering 16 balls:
  const wheel16_8 = [
    [0, 1, 2, 3, 4, 5],
    [0, 1, 6, 7, 8, 9],
    [2, 3, 6, 7, 10, 11],
    [4, 5, 8, 9, 12, 13],
    [0, 2, 10, 12, 14, 15],
    [1, 3, 11, 13, 14, 15],
    [4, 6, 9, 10, 13, 14],
    [5, 7, 8, 11, 12, 15]
  ];

  console.log("\n--- 2. 16-ball Pool with 8-ticket wheel ---");
  runBacktest(16, 8, wheel16_8, false);
  runBacktest(16, 10, wheel16_8, true);

  // 3. High-Density Covering Wheels on 16-ball pool with 10 tickets
  const wheel16_10 = [
    [0, 1, 2, 3, 4, 5],
    [0, 1, 6, 7, 8, 9],
    [2, 3, 6, 7, 10, 11],
    [4, 5, 8, 9, 12, 13],
    [0, 2, 10, 12, 14, 15],
    [1, 3, 11, 13, 14, 15],
    [0, 4, 6, 10, 13, 14],
    [1, 5, 7, 11, 12, 15],
    [2, 4, 8, 11, 12, 14],
    [3, 5, 9, 10, 13, 15]
  ];

  console.log("\n--- 3. 16-ball Pool with 10-ticket wheel ---");
  runBacktest(16, 8, wheel16_10, false);
  runBacktest(16, 10, wheel16_10, true);

  // 4. 18-ball pool with 10-ticket and 12-ticket covering wheels
  // 18 numbers partitioned into 3 hexads: [0..5], [6..11], [12..17]
  const wheel18_10 = [
    [0, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17],
    [0, 1, 2, 6, 7, 8],
    [3, 4, 5, 9, 10, 11],
    [0, 1, 2, 12, 13, 14],
    [3, 4, 5, 15, 16, 17],
    [6, 7, 8, 12, 13, 14],
    [9, 10, 11, 15, 16, 17],
    [0, 3, 6, 9, 12, 15]
  ];

  const wheel18_12 = [
    [0, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17],
    [0, 1, 2, 6, 7, 8],
    [3, 4, 5, 9, 10, 11],
    [0, 1, 2, 12, 13, 14],
    [3, 4, 5, 15, 16, 17],
    [6, 7, 8, 12, 13, 14],
    [9, 10, 11, 15, 16, 17],
    [0, 3, 6, 9, 12, 15],
    [1, 4, 7, 10, 13, 16],
    [2, 5, 8, 11, 14, 17]
  ];

  console.log("\n--- 4. 18-ball Pool with 10-ticket and 12-ticket wheels ---");
  runBacktest(18, 8, wheel18_10, false);
  runBacktest(18, 10, wheel18_10, true);
  runBacktest(18, 10, wheel18_12, true);
}

run();
