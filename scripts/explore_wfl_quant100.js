const { createClient } = require('@libsql/client');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/TURSO_DATABASE_URL=(.+)/)[1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)[1].trim();
const db = createClient({ url, authToken: token });

async function runMathExploration() {
  const queryRes = await db.execute(`
    SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6 
    FROM winforlife_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const draws = queryRes.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: r.draw_date,
    nums: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5), Number(r.num6)].sort((a,b) => a - b)
  }));

  const N = draws.length;
  console.log(`Analyzing ${N} Win For Life draws...`);

  // 1. CRT Residue Diversity
  let mod4Min = 99, mod7Min = 99, mod2Min = 99, mod3Min = 99;
  let mod4DiversityViolations = 0; // count < 2
  let mod7DiversityViolations = 0; // count < 2
  let parityMonochrome = 0; // all odd or all even

  // 2. Sums and Spreads
  let minSum = 999, maxSum = 0;
  let minRange = 999, maxRange = 0;
  let quartileMinSpan = 99;

  draws.forEach(d => {
    const r4 = new Set(d.nums.map(n => n % 4));
    const r7 = new Set(d.nums.map(n => n % 7));
    const r2 = new Set(d.nums.map(n => n % 2));
    const r3 = new Set(d.nums.map(n => n % 3));

    if (r4.size < mod4Min) mod4Min = r4.size;
    if (r7.size < mod7Min) mod7Min = r7.size;
    if (r2.size < mod2Min) mod2Min = r2.size;
    if (r3.size < mod3Min) mod3Min = r3.size;

    if (r4.size < 2) mod4DiversityViolations++;
    if (r7.size < 2) mod7DiversityViolations++;
    if (r2.size === 1) parityMonochrome++;

    const sum = d.nums.reduce((a, b) => a + b, 0);
    if (sum < minSum) minSum = sum;
    if (sum > maxSum) maxSum = sum;

    const range = d.nums[5] - d.nums[0];
    if (range < minRange) minRange = range;
    if (range > maxRange) maxRange = range;

    const q = new Set(d.nums.map(n => Math.min(4, Math.floor((n - 1) / 7) + 1)));
    if (q.size < quartileMinSpan) quartileMinSpan = q.size;
  });

  console.log(`\n--- INVARIANT CHECKS (Total ${N} draws) ---`);
  console.log(`Mod 4 residue diversity min: ${mod4Min} (Violations < 2: ${mod4DiversityViolations}) -> Compliance: ${(((N - mod4DiversityViolations) / N) * 100).toFixed(2)}%`);
  console.log(`Mod 7 residue diversity min: ${mod7Min} (Violations < 2: ${mod7DiversityViolations}) -> Compliance: ${(((N - mod7DiversityViolations) / N) * 100).toFixed(2)}%`);
  console.log(`Mod 2 (Parity) diversity min: ${mod2Min} (All Odd or All Even: ${parityMonochrome}) -> Parity Mixed: ${(((N - parityMonochrome) / N) * 100).toFixed(2)}%`);
  console.log(`Mod 3 residue diversity min: ${mod3Min}`);
  console.log(`Quartile Span min: ${quartileMinSpan} (Min distinct quartiles in any draw)`);
  console.log(`Sum Range: [${minSum}, ${maxSum}] (Expected: 87.0)`);
  console.log(`Ball Range (Max - Min): [${minRange}, ${maxRange}]`);

  // 3. Testing Sliding Attractor Manifolds for 100% Capture
  console.log(`\n--- ATTRACTOR MANIFOLD DISCOVERY FOR 100% CAPTURE ---`);

  // We want to test different manifold definitions M_{t-1} across draws t = 10 to N-1
  // to find manifolds that achieve 100.00% capture rate (at least 1 hit, at least 2 hits, etc.)
  for (let W of [4, 5, 6, 7]) {
    for (let topK of [12, 14, 16, 18, 20]) {
      let hitsDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      let totalEval = 0;

      for (let t = W; t < N; t++) {
        totalEval++;
        const target = draws[t].nums;

        // Construct manifold M_{t-1}:
        // 1. Sliding window frequency from last W draws
        const winFreq = new Array(29).fill(0);
        for (let w = 1; w <= W; w++) {
          draws[t - w].nums.forEach(n => winFreq[n]++);
        }

        // 2. Sum-28 duals of the immediate previous draw
        const duals = draws[t - 1].nums.map(n => 28 - n === 0 ? 28 : 28 - n);

        // Score each ball from 1 to 28
        const ballScores = [];
        for (let b = 1; b <= 28; b++) {
          let score = winFreq[b] * 2.0;
          if (duals.includes(b)) score += 1.8;
          // check if b was in immediate previous draw (repeat momentum)
          if (draws[t - 1].nums.includes(b)) score += 1.2;
          ballScores.push({ ball: b, score });
        }

        ballScores.sort((a, b) => b.score - a.score);
        const manifold = new Set(ballScores.slice(0, topK).map(x => x.ball));

        let hitCount = 0;
        target.forEach(n => {
          if (manifold.has(n)) hitCount++;
        });
        hitsDist[hitCount]++;
      }

      const zeroHits = hitsDist[0];
      const captureRate = (((totalEval - zeroHits) / totalEval) * 100).toFixed(2);
      if (zeroHits === 0 || topK <= 16) {
        console.log(`Window W=${W}, TopK=${topK}: Zero Hits = ${zeroHits} / ${totalEval} | 100% Capture: ${captureRate}% | Avg Hits: ${(Object.entries(hitsDist).reduce((a,[k,v])=>a+Number(k)*v, 0)/totalEval).toFixed(2)}`);
      }
    }
  }
}

runMathExploration().catch(console.error);
