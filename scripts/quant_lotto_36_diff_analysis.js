const { createClient } = require('@libsql/client');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/TURSO_DATABASE_URL=(.+)/)[1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)[1].trim();
const db = createClient({ url, authToken: token });

// Hypergeometric probability helper
function comb(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  for (let i = 1; i <= k; i++) {
    c = (c * (n - (k - i))) / i;
  }
  return c;
}

function hypergeom(k, N, K, n) {
  return (comb(K, k) * comb(N - K, n - k)) / comb(N, n);
}

async function analyze() {
  console.log("================================================================================");
  console.log("📊 QUANTITATIVE & STATISTICAL ANALYSIS: LOTTO PLUS 36-DIFFERENCE TRANSFORMATION");
  console.log("================================================================================\n");

  const queryRes = await db.execute(`
    SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball 
    FROM draws 
    ORDER BY draw_number ASC
  `);

  const draws = queryRes.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: r.draw_date,
    nums: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a,b) => a - b),
    powerball: Number(r.powerball)
  }));

  const N = draws.length;
  console.log(`Total historical draws analyzed: ${N}`);
  console.log(`Date range: ${draws[0].draw_date} (Draw #${draws[0].draw_number}) to ${draws[N-1].draw_date} (Draw #${draws[N-1].draw_number})\n`);

  // Transform each draw into its 36-difference set: d_i = 36 - n_i
  // e.g. [6, 12, 18, 19, 34] -> 36 - [34, 19, 18, 12, 6] = [2, 17, 18, 24, 30]
  const transformed = draws.map(d => {
    const diffs = d.nums.map(n => 36 - n).sort((a,b) => a - b);
    const sum = d.nums.reduce((a,b) => a + b, 0);
    const diffSum = diffs.reduce((a,b) => a + b, 0);
    return {
      draw_number: d.draw_number,
      draw_date: d.draw_date,
      original: d.nums,
      complements: diffs,
      sum,
      diffSum
    };
  });

  // 1. INTRADRAW COMPLEMENTARY PAIRS (x + y = 36 in same draw)
  console.log("--- 1. INTRADRAW COMPLEMENTARY PAIRS (x + y = 36 within same draw) ---");
  let totalIntraPairs = 0;
  const intraPairDraws = [];
  const pairCounts = {};

  transformed.forEach(d => {
    const numSet = new Set(d.original);
    const pairsInDraw = [];
    for (const x of d.original) {
      const comp = 36 - x;
      if (comp > x && numSet.has(comp)) {
        pairsInDraw.push([x, comp]);
        const key = `${x}-${comp}`;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
    if (pairsInDraw.length > 0) {
      totalIntraPairs += pairsInDraw.length;
      intraPairDraws.push({ draw: d.draw_number, date: d.draw_date, nums: d.original, pairs: pairsInDraw });
    }
  });

  const theoreticalPairsProb = 1 - (comb(17, 5) * Math.pow(2, 5) + comb(17, 4) * Math.pow(2, 4)) / comb(35, 5); // approx
  console.log(`Draws containing at least one complement pair (x + y = 36): ${intraPairDraws.length} / ${N} (${((intraPairDraws.length/N)*100).toFixed(2)}%)`);
  console.log(`Total complementary pairs found: ${totalIntraPairs}`);
  console.log("Top complementary pairs co-occurring:");
  const sortedPairs = Object.entries(pairCounts).sort((a,b) => b[1] - a[1]);
  sortedPairs.slice(0, 10).forEach(([pair, count]) => {
    console.log(`  Pair (${pair}): ${count} times (${((count/N)*100).toFixed(2)}%)`);
  });
  console.log();

  // 2. FIXED POINT: Number 18 (since 36 - 18 = 18)
  console.log("--- 2. THE FIXED POINT INVARIANT: NUMBER 18 ---");
  const count18 = draws.filter(d => d.nums.includes(18)).length;
  const expectedCount18 = N * (5 / 35);
  console.log(`Empirical frequency of 18: ${count18} times (${((count18/N)*100).toFixed(2)}%)`);
  console.log(`Expected theoretical frequency: ${expectedCount18.toFixed(1)} times (${((5/35)*100).toFixed(2)}%)`);
  console.log(`Z-score for number 18: ${((count18 - expectedCount18) / Math.sqrt(N * (5/35) * (30/35))).toFixed(3)}\n`);

  // 3. INTER-DRAW TRANSITION: C_t vs D_{t+1} (Complements predicting next draw)
  console.log("--- 3. INTER-DRAW TRANSITION: COMPLEMENTS C_t vs NEXT DRAW D_{t+1} ---");
  // How many numbers in draw t+1 were in C_t?
  const overlapDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const directRepeatDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (let i = 0; i < N - 1; i++) {
    const nextNums = new Set(draws[i+1].nums);
    const currComps = transformed[i].complements;
    const currNums = draws[i].nums;

    let compHits = 0;
    for (const c of currComps) {
      if (nextNums.has(c)) compHits++;
    }
    overlapDist[compHits]++;

    let repeatHits = 0;
    for (const n of currNums) {
      if (nextNums.has(n)) repeatHits++;
    }
    directRepeatDist[repeatHits]++;
  }

  const sampleTransitions = N - 1;
  console.log("Overlap | Complement Hits (C_t -> D_{t+1}) | Direct Repeat Hits (D_t -> D_{t+1}) | Theoretical Hypergeom");
  console.log("--------------------------------------------------------------------------------------------------");
  for (let k = 0; k <= 5; k++) {
    const compObs = overlapDist[k];
    const compPct = ((compObs / sampleTransitions) * 100).toFixed(2);
    const repObs = directRepeatDist[k];
    const repPct = ((repObs / sampleTransitions) * 100).toFixed(2);
    const thPct = (hypergeom(k, 35, 5, 5) * 100).toFixed(2);
    console.log(`   ${k}    |  ${compObs} (${compPct}%)               |  ${repObs} (${repPct}%)                |  ${thPct}%`);
  }
  console.log();

  // 4. MULTI-LAG COMPLEMENT MEMORY: C_{t-1}, C_{t-2}, C_{t-3} hitting in D_t
  console.log("--- 4. MULTI-LAG COMPLEMENT RECURRENCE (Lags 1 to 5) ---");
  for (let lag = 1; lag <= 5; lag++) {
    let totalHits = 0;
    let drawsWithAtLeastOne = 0;
    for (let i = lag; i < N; i++) {
      const nextSet = new Set(draws[i].nums);
      let hits = 0;
      for (const c of transformed[i - lag].complements) {
        if (nextSet.has(c)) hits++;
      }
      totalHits += hits;
      if (hits > 0) drawsWithAtLeastOne++;
    }
    const trials = N - lag;
    console.log(`Lag ${lag} (Draw t vs Complements of t-${lag}): At least 1 hit in ${drawsWithAtLeastOne}/${trials} (${((drawsWithAtLeastOne/trials)*100).toFixed(2)}%), Avg hits/draw: ${(totalHits/trials).toFixed(3)}`);
  }
  console.log();

  // 5. SUM SYMMETRY: Sum(D_t) + Sum(C_t) = 180
  console.log("--- 5. SUM INVARIANT & OSCILLATION PATTERNS ---");
  const sums = transformed.map(d => d.sum);
  const avgSum = sums.reduce((a,b) => a+b, 0) / N;
  const varianceSum = sums.reduce((a,b) => a + Math.pow(b - avgSum, 2), 0) / N;
  const stdSum = Math.sqrt(varianceSum);
  console.log(`Empirical Mean Sum: ${avgSum.toFixed(2)} (Theoretical E[Sum] = 5 * 18 = 90.00)`);
  console.log(`Empirical Std Dev: ${stdSum.toFixed(2)} (Theoretical Std Dev = sqrt(5 * (35^2 - 1)/12 * (30/34)) = 20.73)`);

  // Count how often a high sum (>90) is followed by a low sum (<90)
  let sumAlternations = 0;
  for (let i = 0; i < N - 1; i++) {
    const diff1 = sums[i] - 90;
    const diff2 = sums[i+1] - 90;
    if ((diff1 > 0 && diff2 < 0) || (diff1 < 0 && diff2 > 0)) {
      sumAlternations++;
    }
  }
  console.log(`Sum oscillation across mean (90) between consecutive draws: ${sumAlternations}/${N-1} (${((sumAlternations/(N-1))*100).toFixed(2)}%)\n`);

  // 6. DIFFERENCE PATTERN FORMULA GENERATOR
  console.log("--- 6. MATHEMATICAL FORMULATION FOR NEXT DRAW SELECTION ---");
  const lastDraw = draws[N-1];
  const lastComps = transformed[N-1].complements;
  console.log(`Latest Actual Draw #${lastDraw.draw_number} (${lastDraw.draw_date}): [${lastDraw.nums.join(', ')}]`);
  console.log(`36-Complement Set C_t: [${lastComps.join(', ')}] (each 36 - n_i)`);
  console.log(`Sum(D_t): ${transformed[N-1].sum}, Sum(C_t): ${transformed[N-1].diffSum} (Total = ${transformed[N-1].sum + transformed[N-1].diffSum})`);
}

analyze().catch(console.error);
