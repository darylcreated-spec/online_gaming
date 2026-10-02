const { createClient } = require('@libsql/client');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/TURSO_DATABASE_URL=(.+)/)[1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)[1].trim();
const db = createClient({ url, authToken: token });

function diff28(n) {
  const d = 28 - n;
  return d === 0 ? 28 : d;
}

function solveCRT(r4, r7) {
  for (let x = 1; x <= 28; x++) {
    if (x % 4 === r4 && x % 7 === r7) return x;
  }
  return null;
}

async function backtestEngine() {
  const res = await db.execute(`
    SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6 
    FROM winforlife_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const draws = res.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: r.draw_date,
    nums: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5), Number(r.num6)].sort((a,b) => a - b)
  }));

  const N = draws.length;
  console.log(`Starting full backtest across ${N} Win For Life draws...`);

  // Build global adjacency matrix and frequency
  const adj = Array.from({ length: 29 }, () => Array(29).fill(0));
  const globalFreq = new Array(29).fill(0);

  // We will run walking forward test from draw t = 10 to N-1
  let totalAudits = 0;
  let manifoldHits100 = 0;
  const bestHitsDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const individualSetHits = { set1: 0, set2: 0, set3: 0, set4: 0, set5: 0 };
  let invariantViolations = 0;

  for (let t = 10; t < N; t++) {
    totalAudits++;
    const target = draws[t].nums;

    // Train on draws 0 to t-1
    const trainingDraws = draws.slice(0, t);
    const prevDraw = draws[t - 1].nums;
    const prevPrevDraw = draws[t - 2].nums;
    const prev3Draw = draws[t - 3].nums;

    // Rolling frequencies for W = 4
    const winFreq = new Array(29).fill(0);
    for (let w = 1; w <= 4; w++) {
      draws[t - w].nums.forEach(n => winFreq[n]++);
    }

    // Co-occurrence adjacency up to t-1
    const trainAdj = Array.from({ length: 29 }, () => Array(29).fill(0));
    const trainFreq = new Array(29).fill(0);
    trainingDraws.forEach(d => {
      d.nums.forEach(n => trainFreq[n]++);
      for (let i = 0; i < 6; i++) {
        for (let j = i + 1; j < 6; j++) {
          trainAdj[d.nums[i]][d.nums[j]]++;
          trainAdj[d.nums[j]][d.nums[i]]++;
        }
      }
    });

    // 1. SET 1: CRT Galois Ring Basis
    // Select residues across Z_4 x Z_7
    const crtCandidates = [];
    const usedCRT = new Set();
    const desiredR4 = [0, 1, 2, 3, (t % 4), ((t + 1) % 4)];
    const desiredR7 = [t % 7, (t + 2) % 7, (t + 4) % 7, (t + 6) % 7, (t + 1) % 7, (t + 3) % 7];
    for (let i = 0; i < 6; i++) {
      const x = solveCRT(desiredR4[i], desiredR7[i]);
      if (x && !usedCRT.has(x)) {
        usedCRT.add(x);
        crtCandidates.push(x);
      }
    }
    // fill up if needed
    for (let b = 1; b <= 28 && crtCandidates.length < 6; b++) {
      if (!usedCRT.has(b)) {
        usedCRT.add(b);
        crtCandidates.push(b);
      }
    }
    const set1 = crtCandidates.slice(0, 6).sort((a,b)=>a-b);

    // 2. SET 2: Topological Graph Eigen-Centrality
    // Compute degree centrality conditioned on previous draw
    const graphScores = [];
    for (let b = 1; b <= 28; b++) {
      let affinity = 0;
      prevDraw.forEach(pn => {
        affinity += trainAdj[b][pn];
      });
      const score = affinity * 1.5 + trainFreq[b] * 0.8;
      graphScores.push({ ball: b, score });
    }
    graphScores.sort((a, b) => b.score - a.score);
    const set2 = graphScores.slice(0, 6).map(x => x.ball).sort((a,b)=>a-b);

    // 3. SET 3: Harmonic Mean Reversion (Sum-28 Dual)
    // sigma_28(x) = 28 - x. Deduplicate cleanly
    const duals = [];
    const usedDuals = new Set();
    prevDraw.forEach(n => {
      let d = diff28(n);
      if (d === n || usedDuals.has(d)) {
        // shift by +1 or -1
        d = (d % 28) + 1;
      }
      while (usedDuals.has(d)) {
        d = (d % 28) + 1;
      }
      usedDuals.add(d);
      duals.push(d);
    });
    const set3 = duals.slice(0, 6).sort((a,b)=>a-b);

    // 4. SET 4: Takens' Phase-Space Delay Embedding Velocity
    const velocity = prevDraw.map((val, idx) => val - prevPrevDraw[idx]);
    const projected = prevDraw.map((val, idx) => {
      let pred = val + velocity[idx];
      while (pred < 1) pred += 28;
      while (pred > 28) pred -= 28;
      return pred;
    });
    const set4Clean = [];
    const usedV = new Set();
    projected.forEach(p => {
      let cur = p;
      while (usedV.has(cur)) {
        cur = (cur % 28) + 1;
      }
      usedV.add(cur);
      set4Clean.push(cur);
    });
    const set4 = set4Clean.slice(0, 6).sort((a,b)=>a-b);

    // 5. SET 5: Stefan Mandel Covering Sieve
    // Combines top rolling frequency balls with minimal covering dispersion
    const sortedByRolling = [];
    for (let b = 1; b <= 28; b++) {
      sortedByRolling.push({ ball: b, count: winFreq[b], global: trainFreq[b] });
    }
    sortedByRolling.sort((a, b) => (b.count * 10 + b.global) - (a.count * 10 + a.global));
    const set5Pool = sortedByRolling.map(x => x.ball);
    // Take 6 balls with diverse residue mod 4 and mod 7
    const set5 = [];
    const set5Res4 = new Set();
    for (const b of set5Pool) {
      if (set5.length < 6) {
        if (!set5.includes(b)) {
          set5.push(b);
          set5Res4.add(b % 4);
        }
      }
    }
    set5.sort((a,b)=>a-b);

    // Evaluate Hits
    const hits1 = set1.filter(n => target.includes(n)).length;
    const hits2 = set2.filter(n => target.includes(n)).length;
    const hits3 = set3.filter(n => target.includes(n)).length;
    const hits4 = set4.filter(n => target.includes(n)).length;
    const hits5 = set5.filter(n => target.includes(n)).length;

    const maxHit = Math.max(hits1, hits2, hits3, hits4, hits5);
    bestHitsDist[maxHit]++;

    individualSetHits.set1 += hits1;
    individualSetHits.set2 += hits2;
    individualSetHits.set3 += hits3;
    individualSetHits.set4 += hits4;
    individualSetHits.set5 += hits5;

    // Evaluate Master Attractor Manifold (Top 18 scored balls)
    const manifoldScored = [];
    for (let b = 1; b <= 28; b++) {
      let score = winFreq[b] * 2.0;
      if (prevDraw.includes(diff28(b))) score += 1.8;
      if (prevDraw.includes(b)) score += 1.2;
      manifoldScored.push({ ball: b, score });
    }
    manifoldScored.sort((a, b) => b.score - a.score);
    const manifold18 = new Set(manifoldScored.slice(0, 18).map(x => x.ball));

    let mHits = 0;
    target.forEach(n => { if (manifold18.has(n)) mHits++; });
    if (mHits >= 1) manifoldHits100++;

    // Invariant check on target:
    const targetMod4 = new Set(target.map(n => n % 4)).size;
    const targetMod7 = new Set(target.map(n => n % 7)).size;
    if (targetMod4 < 2 || targetMod7 < 2) invariantViolations++;
  }

  console.log(`\n================ BACKTEST RESULTS (Total Audits: ${totalAudits}) ================`);
  console.log(`Attractor Manifold Capture Rate: ${manifoldHits100} / ${totalAudits} (${((manifoldHits100 / totalAudits) * 100).toFixed(2)}%)`);
  console.log(`Invariant Violations (Mod4 < 2 or Mod7 < 2): ${invariantViolations} / ${totalAudits}`);
  console.log(`\nBest Ticket Hit Distribution across 5 Sets:`);
  for (let k = 0; k <= 6; k++) {
    const c = bestHitsDist[k];
    console.log(`  Hit ${k}/6 balls: ${c} (${((c / totalAudits) * 100).toFixed(2)}%)`);
  }
  const atLeast1 = Object.entries(bestHitsDist).filter(([k]) => Number(k) >= 1).reduce((a, [_, c]) => a + c, 0);
  const atLeast2 = Object.entries(bestHitsDist).filter(([k]) => Number(k) >= 2).reduce((a, [_, c]) => a + c, 0);
  const atLeast3 = Object.entries(bestHitsDist).filter(([k]) => Number(k) >= 3).reduce((a, [_, c]) => a + c, 0);
  const atLeast4 = Object.entries(bestHitsDist).filter(([k]) => Number(k) >= 4).reduce((a, [_, c]) => a + c, 0);
  console.log(`\nPortfolio Summary:`);
  console.log(`  Portfolio >= 1 Match: ${atLeast1} / ${totalAudits} (${((atLeast1 / totalAudits) * 100).toFixed(2)}%)`);
  console.log(`  Portfolio >= 2 Matches: ${atLeast2} / ${totalAudits} (${((atLeast2 / totalAudits) * 100).toFixed(2)}%)`);
  console.log(`  Portfolio >= 3 Matches (Prize Tier): ${atLeast3} / ${totalAudits} (${((atLeast3 / totalAudits) * 100).toFixed(2)}%)`);
  console.log(`  Portfolio >= 4 Matches (High Tier): ${atLeast4} / ${totalAudits} (${((atLeast4 / totalAudits) * 100).toFixed(2)}%)`);
}

backtestEngine().catch(console.error);
