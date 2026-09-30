const { createClient } = require('@libsql/client');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/TURSO_DATABASE_URL=(.+)/)[1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)[1].trim();
const db = createClient({ url, authToken: token });

function comb(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - (k - i))) / i;
  return c;
}

function hypergeom(k, N, K, n) {
  return (comb(K, k) * comb(N - K, n - k)) / comb(N, n);
}

async function analyzeWinForLife() {
  console.log("================================================================================");
  console.log("📊 QUANTITATIVE & STATISTICAL ANALYSIS: WIN FOR LIFE SUM-28 DIFFERENCE ENGINE");
  console.log("================================================================================\n");

  const queryRes = await db.execute(`
    SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball 
    FROM winforlife_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const draws = queryRes.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: r.draw_date,
    nums: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5), Number(r.num6)].sort((a,b) => a - b),
    cash_ball: Number(r.cash_ball)
  }));

  const N = draws.length;
  console.log(`Total Win For Life draws analyzed: ${N}`);
  console.log(`Date range: ${draws[0].draw_date} (#${draws[0].draw_number}) to ${draws[N-1].draw_date} (#${draws[N-1].draw_number})\n`);

  function diff28(n) {
    const d = 28 - n;
    return d === 0 ? 28 : d;
  }

  // 1. INVARIANTS & PROPERTIES
  console.log("--- 1. COMBINATORIAL & ALGEBRAIC INVARIANTS IN Z_28 ---");
  console.log("Pool: N = 28 balls. Drawn: k = 6. Total combinations: C(28, 6) = " + comb(28, 6));
  console.log("Transformation: sigma_28(x) = (28 - x === 0 ? 28 : 28 - x).");
  console.log("Fixed Points: sigma_28(14) = 14, and sigma_28(28) = 28.");
  console.log("Symmetric Duals: (1-27, 2-26, 3-25, 4-24, 5-23, 6-22, 7-21, 8-20, 9-19, 10-18, 11-17, 12-16, 13-15).");
  console.log("Parity Preservation: Since 28 is EVEN, 28 - even = even, 28 - odd = odd. Parity is strictly conserved.");
  console.log("Sum Invariant: Sum(D) + Sum(sigma_28(D)) = 6 * 28 = 168. Theoretical E[Sum] = 6 * 14.5 = 87.0.\n");

  // Intradraw Sum-28 Pairs (x + y = 28 in same draw)
  let intradrawPairDraws = 0;
  const pairCounts = {};
  draws.forEach(d => {
    const set = new Set(d.nums);
    let found = false;
    for (const x of d.nums) {
      const comp = 28 - x;
      if (comp > x && set.has(comp)) {
        found = true;
        const key = `${x}-${comp}`;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
    if (found) intradrawPairDraws++;
  });
  console.log(`Draws containing at least one intradraw Sum-28 pair: ${intradrawPairDraws} / ${N} (${((intradrawPairDraws/N)*100).toFixed(2)}%)`);
  const topPairs = Object.entries(pairCounts).sort((a,b) => b[1] - a[1]);
  console.log("Top occurring Sum-28 pairs:", topPairs.slice(0, 8).map(([p,c]) => `${p} (${c}x)`).join(", "));
  console.log();

  // 2. SLIDING MULTI-DRAW DIFFERENCE MATRIX (W = 4 draws, matching bi-weekly 2-week cycle)
  console.log("--- 2. MULTI-SET SLIDING WINDOW (W = 4 to 6 Draws) ---");
  for (let W of [4, 5, 6]) {
    let poolHits = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
    let totalTrials = 0;
    let poolSizes = [];

    for (let t = W - 1; t < N - 1; t++) {
      totalTrials++;
      const nextDraw = new Set(draws[t + 1].nums);

      const diffPool = new Set();
      for (let w = 0; w < W; w++) {
        draws[t - w].nums.forEach(n => diffPool.add(diff28(n)));
      }
      poolSizes.push(diffPool.size);

      let hits = 0;
      nextDraw.forEach(n => { if (diffPool.has(n)) hits++; });
      poolHits[hits]++;
    }

    const avgSize = (poolSizes.reduce((a,b)=>a+b,0) / totalTrials).toFixed(1);
    const atLeast3 = poolHits[3] + poolHits[4] + poolHits[5] + poolHits[6];
    const atLeast4 = poolHits[4] + poolHits[5] + poolHits[6];
    const atLeast5 = poolHits[5] + poolHits[6];
    console.log(`Window W=${W} Draws (Avg Pool Size: ${avgSize} / 28 balls):`);
    console.log(`  Captures >= 3 winning balls: ${atLeast3}/${totalTrials} (${((atLeast3/totalTrials)*100).toFixed(2)}%)`);
    console.log(`  Captures >= 4 winning balls: ${atLeast4}/${totalTrials} (${((atLeast4/totalTrials)*100).toFixed(2)}%)`);
    console.log(`  Captures >= 5 winning balls: ${atLeast5}/${totalTrials} (${((atLeast5/totalTrials)*100).toFixed(2)}%)`);
    console.log(`  Captures ALL 6 winning balls: ${poolHits[6]}/${totalTrials} (${((poolHits[6]/totalTrials)*100).toFixed(2)}%)`);
  }
  console.log();

  // 3. BACKTESTING 5 PREDICTIVE FORMULA SETS FOR WIN FOR LIFE (6 Balls each)
  console.log("--- 3. 5-SET FORMULA PREDICTION SYSTEM BACKTEST ---");
  // Set 1: Pure Sum-28 Difference: { sigma_28(n_i) }
  // Set 2: Multi-Draw Matrix Resonance (Top 6 most recurrent numbers in 28-diff matrix of last 5 draws)
  // Set 3: Harmonic Mean Reversion Dual (3 from draw + 3 from 28-complements, sum ~87)
  // Set 4: Modular Drift Transformation ((28 - n_i + 1) mod 28)
  // Set 5: Cross-Symmetric Dual Resonance (Bayesian score: 2.2*freq28 + 1.4*partner + 1.1*direct)

  let totalTested = 0;
  const bestTicketDist = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
  const unionPoolDist = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
  const set1Hits = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
  const set2Hits = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
  const set3Hits = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
  const set4Hits = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
  const set5Hits = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };

  const recentExamples = [];

  for (let t = 5; t < N - 1; t++) {
    totalTested++;
    const actualNext = new Set(draws[t + 1].nums);
    const currNums = draws[t].nums;

    // Set 1: Pure 28-difference
    const S1 = currNums.map(diff28).sort((a,b) => a - b);

    // Sliding window of last 5 draws
    const freq28 = new Array(29).fill(0);
    const directFreq = new Array(29).fill(0);
    for (let w = 0; w < 5; w++) {
      draws[t - w].nums.forEach(n => {
        directFreq[n]++;
        freq28[diff28(n)]++;
      });
    }

    // Set 2: Top 6 by 28-diff matrix recurrence
    const ranked = [];
    for (let n = 1; n <= 28; n++) {
      ranked.push({ n, diffCount: freq28[n], directCount: directFreq[n] });
    }
    ranked.sort((a,b) => b.diffCount - a.diffCount || b.directCount - a.directCount || a.n - b.n);
    const S2 = ranked.slice(0, 6).map(r => r.n).sort((a,b) => a - b);

    // Set 3: Harmonic Mean Reversion (3 from current draw + 3 from complements)
    const comps = currNums.map(diff28);
    const S3 = [currNums[0], currNums[1], currNums[2], comps[3], comps[4], comps[5]].sort((a,b) => a - b);

    // Set 4: Modular Drift Transformation ((28 - n + 1) mod 28)
    const S4 = currNums.map(n => {
      let v = (diff28(n) + 1) % 28;
      return v === 0 ? 28 : v;
    }).sort((a,b) => a - b);

    // Set 5: Cross-Symmetric Dual Resonance
    const resonance = [];
    for (let n = 1; n <= 28; n++) {
      const partner = diff28(n);
      const score = freq28[n] * 2.2 + freq28[partner] * 1.4 + directFreq[n] * 1.1;
      resonance.push({ n, score });
    }
    resonance.sort((a,b) => b.score - a.score || a.n - b.n);
    const S5 = resonance.slice(0, 6).map(r => r.n).sort((a,b) => a - b);

    const countHits = (set) => {
      let h = 0;
      set.forEach(n => { if (actualNext.has(n)) h++; });
      return h;
    };

    const h1 = countHits(S1);
    const h2 = countHits(S2);
    const h3 = countHits(S3);
    const h4 = countHits(S4);
    const h5 = countHits(S5);

    set1Hits[h1]++;
    set2Hits[h2]++;
    set3Hits[h3]++;
    set4Hits[h4]++;
    set5Hits[h5]++;

    const bestHit = Math.max(h1, h2, h3, h4, h5);
    bestTicketDist[bestHit]++;

    const unionPool = new Set([...S1, ...S2, ...S3, ...S4, ...S5]);
    let uHits = 0;
    actualNext.forEach(n => { if (unionPool.has(n)) uHits++; });
    unionPoolDist[uHits]++;

    if (t >= N - 6) {
      recentExamples.push({
        drawNumber: draws[t+1].draw_number,
        drawDate: draws[t+1].draw_date,
        actual: draws[t+1].nums,
        S1, S2, S3, S4, S5,
        h1, h2, h3, h4, h5,
        bestHit,
        unionSize: unionPool.size,
        uHits
      });
    }
  }

  console.log(`Evaluated ${totalTested} consecutive transitions across Win For Life history:`);
  console.log("--------------------------------------------------------------------------------");
  console.log("BEST SINGLE LINE HIT DISTRIBUTION (Playing the 5 Recommended Formula Sets):");
  for (let k = 0; k <= 6; k++) {
    const cnt = bestTicketDist[k];
    const pct = ((cnt / totalTested) * 100).toFixed(2);
    console.log(`  Hit ${k}/6 balls: ${cnt} (${pct}%)`);
  }

  const atLeast1 = totalTested - bestTicketDist[0];
  const atLeast2 = atLeast1 - bestTicketDist[1];
  const atLeast3 = atLeast2 - bestTicketDist[2];
  const atLeast4 = atLeast3 - bestTicketDist[3];
  console.log(`\nPortfolio >= 1 Match: ${atLeast1}/${totalTested} (${((atLeast1/totalTested)*100).toFixed(2)}%)`);
  console.log(`Portfolio >= 2 Matches: ${atLeast2}/${totalTested} (${((atLeast2/totalTested)*100).toFixed(2)}%)`);
  console.log(`Portfolio >= 3 Matches (Prize Tier): ${atLeast3}/${totalTested} (${((atLeast3/totalTested)*100).toFixed(2)}%)`);
  console.log(`Portfolio >= 4 Matches (High Prize Tier): ${atLeast4}/${totalTested} (${((atLeast4/totalTested)*100).toFixed(2)}%)\n`);

  console.log("5-SET COMBINED COVERAGE POOL (Union of 5 Formula Sets):");
  for (let k = 0; k <= 6; k++) {
    console.log(`  Captured ${k}/6 winners in union: ${unionPoolDist[k]} (${((unionPoolDist[k]/totalTested)*100).toFixed(2)}%)`);
  }
  const pool3Plus = unionPoolDist[3] + unionPoolDist[4] + unionPoolDist[5] + unionPoolDist[6];
  const pool4Plus = unionPoolDist[4] + unionPoolDist[5] + unionPoolDist[6];
  console.log(`Pool captures >= 3 winning balls: ${pool3Plus} / ${totalTested} (${((pool3Plus/totalTested)*100).toFixed(2)}%)`);
  console.log(`Pool captures >= 4 winning balls: ${pool4Plus} / ${totalTested} (${((pool4Plus/totalTested)*100).toFixed(2)}%)\n`);

  console.log("--- RECENT WIN FOR LIFE TRANSITIONS ---");
  recentExamples.forEach(ex => {
    console.log(`Draw #${ex.drawNumber} (${ex.drawDate}): Actual = [${ex.actual.join(', ')}]`);
    console.log(`  Set 1 (Pure 28-Diff): [${ex.S1.join(', ')}] -> Hits: ${ex.h1}/6`);
    console.log(`  Set 2 (Matrix Recurr): [${ex.S2.join(', ')}] -> Hits: ${ex.h2}/6`);
    console.log(`  Set 3 (Harmonic Dual): [${ex.S3.join(', ')}] -> Hits: ${ex.h3}/6`);
    console.log(`  Set 4 (Modular Drift): [${ex.S4.join(', ')}] -> Hits: ${ex.h4}/6`);
    console.log(`  Set 5 (Cross-Reson):   [${ex.S5.join(', ')}] -> Hits: ${ex.h5}/6`);
    console.log(`  Best Ticket: ${ex.bestHit}/6 | Union Coverage: ${ex.uHits}/6 (${ex.unionSize} unique balls)\n`);
  });

  // Next Draw Prediction
  const latestDraw = draws[N - 1];
  console.log("================================================================================");
  console.log(`🎯 PREDICTION FOR NEXT WIN FOR LIFE DRAW AFTER #${latestDraw.draw_number} (${latestDraw.draw_date})`);
  console.log("================================================================================");
  console.log(`Input Actual Numbers: [${latestDraw.nums.join(', ')}] (Cash Ball ${latestDraw.cash_ball} excluded)`);

  const nextS1 = latestDraw.nums.map(diff28).sort((a,b) => a - b);

  const freqNext = new Array(29).fill(0);
  const directNext = new Array(29).fill(0);
  for (let w = 0; w < 5; w++) {
    draws[N - 1 - w].nums.forEach(n => {
      directNext[n]++;
      freqNext[diff28(n)]++;
    });
  }
  const rankedNext = [];
  for (let n = 1; n <= 28; n++) {
    rankedNext.push({ n, diffCount: freqNext[n], directCount: directNext[n] });
  }
  rankedNext.sort((a,b) => b.diffCount - a.diffCount || b.directCount - a.directCount || a.n - b.n);
  const nextS2 = rankedNext.slice(0, 6).map(r => r.n).sort((a,b) => a - b);

  const compsNext = latestDraw.nums.map(diff28);
  const nextS3 = [latestDraw.nums[0], latestDraw.nums[1], latestDraw.nums[2], compsNext[3], compsNext[4], compsNext[5]].sort((a,b) => a - b);

  const nextS4 = latestDraw.nums.map(n => {
    let v = (diff28(n) + 1) % 28;
    return v === 0 ? 28 : v;
  }).sort((a,b) => a - b);

  const resNext = [];
  for (let n = 1; n <= 28; n++) {
    const partner = diff28(n);
    const score = freqNext[n] * 2.2 + freqNext[partner] * 1.4 + directNext[n] * 1.1;
    resNext.push({ n, score });
  }
  resNext.sort((a,b) => b.score - a.score || a.n - b.n);
  const nextS5 = resNext.slice(0, 6).map(r => r.n).sort((a,b) => a - b);

  console.log(`Set 1 (Pure Sum-28 Difference):   [${nextS1.join(', ')}] (Sum: ${nextS1.reduce((a,b)=>a+b,0)})`);
  console.log(`Set 2 (5-Draw Matrix Resonance):  [${nextS2.join(', ')}] (Sum: ${nextS2.reduce((a,b)=>a+b,0)})`);
  console.log(`Set 3 (Harmonic Mean Reversion):  [${nextS3.join(', ')}] (Sum: ${nextS3.reduce((a,b)=>a+b,0)})`);
  console.log(`Set 4 (Modular Drift Rotation):   [${nextS4.join(', ')}] (Sum: ${nextS4.reduce((a,b)=>a+b,0)})`);
  console.log(`Set 5 (Cross-Symmetric Dual):     [${nextS5.join(', ')}] (Sum: ${nextS5.reduce((a,b)=>a+b,0)})`);
  const unionNext = Array.from(new Set([...nextS1, ...nextS2, ...nextS3, ...nextS4, ...nextS5])).sort((a,b)=>a-b);
  console.log(`Master Wheeling Pool (${unionNext.length} balls): [${unionNext.join(', ')}]`);
}

analyzeWinForLife().catch(console.error);
