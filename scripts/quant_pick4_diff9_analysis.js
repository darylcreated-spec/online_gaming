const { createClient } = require('@libsql/client');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/TURSO_DATABASE_URL=(.+)/)[1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)[1].trim();
const db = createClient({ url, authToken: token });

async function analyzePick4() {
  console.log("================================================================================");
  console.log("📊 QUANTITATIVE & STATISTICAL ANALYSIS: PICK 4 SUM-9 DIFFERENCE ENGINE");
  console.log("================================================================================\n");

  const queryRes = await db.execute(`
    SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 
    FROM pick4_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const draws = queryRes.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: r.draw_date,
    draw_time_slot: r.draw_time_slot,
    digits: [Number(r.digit1), Number(r.digit2), Number(r.digit3), Number(r.digit4)],
  }));

  const N = draws.length;
  console.log(`Total Pick 4 draws analyzed: ${N}`);
  console.log(`Date range: ${draws[0].draw_date} (#${draws[0].draw_number}, ${draws[0].draw_time_slot}) to ${draws[N-1].draw_date} (#${draws[N-1].draw_number}, ${draws[N-1].draw_time_slot})\n`);

  function diff9(d) {
    return 9 - d;
  }

  // 1. INVARIANTS
  console.log("--- 1. COMBINATORIAL & ALGEBRAIC INVARIANTS OF 9's COMPLEMENT ---");
  console.log("Pool: Digits {0, 1, 2, 3, 4, 5, 6, 7, 8, 9}. Drawn: k = 4 digits.");
  console.log("Total permutations: 10^4 = 10,000. Box types: 24-Way (distinct), 12-Way (1 pair), 6-Way (2 pairs), 4-Way (trips), 1-Way (quads).");
  console.log("Mapping: sigma_9(x) = 9 - x. Involution: sigma_9(sigma_9(x)) = x.");
  console.log("Sum Invariant: sum(x_i) + sum(sigma_9(x_i)) = 4 * 9 = 36. Theoretical mean sum E[Sum] = 4 * 4.5 = 18.0.");
  console.log("Parity Inversion: Since 9 is odd, 9 - even = odd, 9 - odd = even. 100% strict parity flip.\n");

  // Verify parity and sum invariant
  let validInvariants = 0;
  draws.forEach(d => {
    const comps = d.digits.map(diff9);
    const sumD = d.digits.reduce((a,b) => a+b, 0);
    const sumC = comps.reduce((a,b) => a+b, 0);
    if (sumD + sumC === 36) validInvariants++;
  });
  console.log(`Sum invariant (Sum(D) + Sum(Comp) = 36) verified: ${validInvariants} / ${N} (100%)\n`);

  // 2. INTRADRAW SUM-9 COMPLEMENT PAIRS (e.g. 0+9, 1+8, 2+7, 3+6, 4+5)
  console.log("--- 2. INTRADRAW 9's COMPLEMENT PAIRS (x + y = 9 within same draw) ---");
  let intradrawPairDraws = 0;
  const pairFreq = {};
  draws.forEach(d => {
    let found = false;
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        if (d.digits[i] + d.digits[j] === 9) {
          found = true;
          const p = [Math.min(d.digits[i], d.digits[j]), Math.max(d.digits[i], d.digits[j])].join("-");
          pairFreq[p] = (pairFreq[p] || 0) + 1;
        }
      }
    }
    if (found) intradrawPairDraws++;
  });
  console.log(`Draws containing at least one Sum-9 pair: ${intradrawPairDraws} / ${N} (${((intradrawPairDraws/N)*100).toFixed(2)}%)`);
  console.log("Top occurring Sum-9 pairs:", Object.entries(pairFreq).sort((a,b) => b[1]-a[1]).map(([p,c]) => `${p} (${c}x)`).join(", "));
  console.log();

  // 3. MULTISET (BOX) MATCHING HELPER
  // Given prediction P and actual A, count multiset intersection
  function countMultisetMatches(pred, actual) {
    const actCount = {};
    actual.forEach(x => { actCount[x] = (actCount[x] || 0) + 1; });
    let matches = 0;
    pred.forEach(x => {
      if (actCount[x] && actCount[x] > 0) {
        matches++;
        actCount[x]--;
      }
    });
    return matches;
  }

  // 4. BACKTESTING 4-SET FORMULA SYSTEM ACROSS ALL DRAWS
  console.log("--- 3. 4-SET FORMULA PREDICTION SYSTEM BACKTEST ---");
  console.log("Formulating 4 candidate sets across 4 sliding historical sets (W=4):");
  console.log("  Set 1: Pure 9's Complement of Draw t");
  console.log("  Set 2: 4-Draw Matrix Recurrence (Top 4 most recurrent digits across 9-diff matrix of last 4 draws)");
  console.log("  Set 3: Harmonic Mean Reversion Dual (2 digits from draw t + 2 from complement, sum ~18)");
  console.log("  Set 4: Modular Drift Transformation ( (9 - x_i + 1) mod 10 )");

  let totalTested = 0;
  const bestHitsDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const set1Hits = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const set2Hits = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const set3Hits = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const set4Hits = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const unionCoverage = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

  const recentExamples = [];

  for (let t = 4; t < N - 1; t++) {
    totalTested++;
    const actualNext = draws[t + 1].digits;
    const currDigits = draws[t].digits;

    // Set 1: Pure 9's complement
    const S1 = currDigits.map(diff9);

    // Sliding window of last 4 draws (t-3 to t)
    const diffFreq = new Array(10).fill(0);
    const directFreq = new Array(10).fill(0);
    for (let w = 0; w < 4; w++) {
      draws[t - w].digits.forEach(d => {
        directFreq[d]++;
        diffFreq[diff9(d)]++;
      });
    }

    // Set 2: Top 4 by recurrence in 9-diff matrix
    const ranked = [];
    for (let d = 0; d <= 9; d++) {
      ranked.push({ digit: d, count: diffFreq[d], direct: directFreq[d] });
    }
    ranked.sort((a,b) => b.count - a.count || b.direct - a.direct || a.digit - b.digit);
    const S2 = ranked.slice(0, 4).map(r => r.digit);

    // Set 3: Harmonic Mean Reversion (take 2 from current draw + 2 from complement)
    const comps = currDigits.map(diff9);
    const S3 = [currDigits[0], currDigits[1], comps[2], comps[3]];

    // Set 4: Modular Drift Transformation ((9 - x + 1) mod 10)
    const S4 = currDigits.map(x => (diff9(x) + 1) % 10);

    const h1 = countMultisetMatches(S1, actualNext);
    const h2 = countMultisetMatches(S2, actualNext);
    const h3 = countMultisetMatches(S3, actualNext);
    const h4 = countMultisetMatches(S4, actualNext);

    set1Hits[h1]++;
    set2Hits[h2]++;
    set3Hits[h3]++;
    set4Hits[h4]++;

    const bestHit = Math.max(h1, h2, h3, h4);
    bestHitsDist[bestHit]++;

    // Union pool
    const unionPool = new Set([...S1, ...S2, ...S3, ...S4]);
    let uHits = 0;
    actualNext.forEach(d => { if (unionPool.has(d)) uHits++; });
    unionCoverage[uHits]++;

    if (t >= N - 6) {
      recentExamples.push({
        drawNumber: draws[t+1].draw_number,
        drawDate: draws[t+1].draw_date,
        slot: draws[t+1].draw_time_slot,
        actual: actualNext,
        S1, S2, S3, S4,
        h1, h2, h3, h4,
        bestHit,
        unionSize: unionPool.size,
        uHits
      });
    }
  }

  console.log(`Evaluated ${totalTested} consecutive Pick 4 transitions out-of-sample:`);
  console.log("--------------------------------------------------------------------------------");
  console.log("BEST TICKET BOX HIT DISTRIBUTION (Playing the 4 Formula Sets):");
  for (let k = 0; k <= 4; k++) {
    const cnt = bestHitsDist[k];
    const pct = ((cnt / totalTested) * 100).toFixed(2);
    console.log(`  Hit ${k}/4 digits (Box match): ${cnt} (${pct}%)`);
  }

  const atLeast1 = totalTested - bestHitsDist[0];
  const atLeast2 = atLeast1 - bestHitsDist[1];
  const atLeast3 = atLeast2 - bestHitsDist[2];
  const atLeast4 = bestHitsDist[4];
  console.log(`\nPortfolio >= 1 Match: ${atLeast1}/${totalTested} (${((atLeast1/totalTested)*100).toFixed(2)}%)`);
  console.log(`Portfolio >= 2 Matches: ${atLeast2}/${totalTested} (${((atLeast2/totalTested)*100).toFixed(2)}%)`);
  console.log(`Portfolio >= 3 Matches: ${atLeast3}/${totalTested} (${((atLeast3/totalTested)*100).toFixed(2)}%)`);
  console.log(`Portfolio 4/4 EXACT BOX WIN: ${atLeast4}/${totalTested} (${((atLeast4/totalTested)*100).toFixed(2)}%)\n`);

  console.log("4-SET COMBINED POOL COVERAGE (Union of all 4 sets):");
  for (let k = 0; k <= 4; k++) {
    console.log(`  Pool captured ${k}/4 winning digits: ${unionCoverage[k]} (${((unionCoverage[k]/totalTested)*100).toFixed(2)}%)`);
  }
  console.log(`Pool captures >= 3 winning digits: ${unionCoverage[3] + unionCoverage[4]} / ${totalTested} (${(((unionCoverage[3]+unionCoverage[4])/totalTested)*100).toFixed(2)}%)\n`);

  console.log("--- RECENT PICK 4 TRANSITIONS ---");
  recentExamples.forEach(ex => {
    console.log(`Draw #${ex.drawNumber} (${ex.drawDate} ${ex.slot}): Actual = [${ex.actual.join(', ')}]`);
    console.log(`  Set 1 (Pure 9's Diff):  [${ex.S1.join(', ')}] -> Hits: ${ex.h1}/4`);
    console.log(`  Set 2 (Matrix Recurr):  [${ex.S2.join(', ')}] -> Hits: ${ex.h2}/4`);
    console.log(`  Set 3 (Harmonic Dual):  [${ex.S3.join(', ')}] -> Hits: ${ex.h3}/4`);
    console.log(`  Set 4 (Modular Drift):  [${ex.S4.join(', ')}] -> Hits: ${ex.h4}/4`);
    console.log(`  Best Ticket: ${ex.bestHit}/4 | Union Coverage: ${ex.uHits}/4 (${ex.unionSize} unique digits)\n`);
  });

  // Latest draw prediction
  const latestDraw = draws[N - 1];
  console.log("================================================================================");
  console.log(`🎯 PREDICTION FOR NEXT PICK 4 DRAW AFTER #${latestDraw.draw_number} (${latestDraw.draw_date} ${latestDraw.draw_time_slot})`);
  console.log("================================================================================");
  console.log(`Input Actual Digits: [${latestDraw.digits.join(', ')}]`);
  
  const nextS1 = latestDraw.digits.map(diff9);
  
  const diffFreqNext = new Array(10).fill(0);
  const directFreqNext = new Array(10).fill(0);
  for (let w = 0; w < 4; w++) {
    draws[N - 1 - w].digits.forEach(d => {
      directFreqNext[d]++;
      diffFreqNext[diff9(d)]++;
    });
  }
  const rankedNext = [];
  for (let d = 0; d <= 9; d++) {
    rankedNext.push({ digit: d, count: diffFreqNext[d], direct: directFreqNext[d] });
  }
  rankedNext.sort((a,b) => b.count - a.count || b.direct - a.direct || a.digit - b.digit);
  const nextS2 = rankedNext.slice(0, 4).map(r => r.digit);

  const compsNext = latestDraw.digits.map(diff9);
  const nextS3 = [latestDraw.digits[0], latestDraw.digits[1], compsNext[2], compsNext[3]];
  const nextS4 = latestDraw.digits.map(x => (diff9(x) + 1) % 10);

  console.log(`Set 1 (Pure 9's Complement):     [${nextS1.join(', ')}] (Sum: ${nextS1.reduce((a,b)=>a+b,0)})`);
  console.log(`Set 2 (4-Draw Matrix Recurrence): [${nextS2.join(', ')}] (Sum: ${nextS2.reduce((a,b)=>a+b,0)})`);
  console.log(`Set 3 (Harmonic Mean Reversion):  [${nextS3.join(', ')}] (Sum: ${nextS3.reduce((a,b)=>a+b,0)})`);
  console.log(`Set 4 (Modular Drift Rotation):   [${nextS4.join(', ')}] (Sum: ${nextS4.reduce((a,b)=>a+b,0)})`);
  const unionNext = Array.from(new Set([...nextS1, ...nextS2, ...nextS3, ...nextS4])).sort((a,b)=>a-b);
  console.log(`Master Wheeling Pool (${unionNext.length} digits): [${unionNext.join(', ')}]`);
}

analyzePick4().catch(console.error);
