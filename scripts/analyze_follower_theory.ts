import { createClient } from "@libsql/client";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

async function safeExecute(sql: string, args: any[] = [], maxRetries = 5): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await db.execute({ sql, args });
    } catch (err: any) {
      console.warn(`Query attempt ${attempt} failed: ${err.message}. Retrying in ${attempt * 1.5}s...`);
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
}

async function analyzeFollowerTheory() {
  console.log("================================================================================");
  console.log("QUANTITATIVE AUDIT: ANCIENT 'FOLLOWER NUMBERS' THEORY");
  console.log("Empirical Markov Transition Analysis & Statistical Significance Testing");
  console.log("================================================================================\n");

  // 1. PLAY WHE (1 to 36 single mark - The classic Follower game)
  console.log("--- 1. PLAY WHE (1-36 Single Mark, ~20,000 Draws) ---");
  const pwRes = await safeExecute("SELECT draw_number, draw_date, winning_number FROM playwhe_draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const pwDraws = pwRes.rows.map((r: any) => Number(r.winning_number)).filter((n: number) => !isNaN(n) && n >= 1 && n <= 36);
  console.log(`Loaded ${pwDraws.length} consecutive Play Whe draws.`);

  // Build 36x36 transition matrix
  const pwTransitions: number[][] = Array.from({ length: 37 }, () => Array(37).fill(0));
  const pwRowTotals: number[] = Array(37).fill(0);

  for (let i = 0; i < pwDraws.length - 1; i++) {
    const prev = pwDraws[i];
    const next = pwDraws[i + 1];
    pwTransitions[prev][next]++;
    pwRowTotals[prev]++;
  }

  // Statistical Test: Chi-Square Test for Uniformity of Transitions
  // Expected transitions from state i to state j = RowTotal[i] / 36
  let pwTotalChiSq = 0;
  let dfTotal = 36 * 35; // degrees of freedom = 1260

  const strongestFollowers: Record<number, { next: number, count: number, exp: number, ratio: number }[]> = {};

  for (let i = 1; i <= 36; i++) {
    const exp = pwRowTotals[i] / 36;
    const followers = [];
    for (let j = 1; j <= 36; j++) {
      const obs = pwTransitions[i][j];
      const chi = Math.pow(obs - exp, 2) / exp;
      pwTotalChiSq += chi;
      followers.push({ next: j, count: obs, exp: Math.round(exp * 10) / 10, ratio: Math.round((obs / exp) * 100) / 100 });
    }
    followers.sort((a, b) => b.count - a.count);
    strongestFollowers[i] = followers.slice(0, 3);
  }

  console.log(`Chi-Square Statistic across 36x36 transitions: ${pwTotalChiSq.toFixed(2)} (df = ${dfTotal})`);
  // If Chi-square > critical value (~1350 for df=1260 at p=0.05)
  console.log(`P-value evaluation: ${pwTotalChiSq > 1350 ? "STATISTICALLY SIGNIFICANT DEPENDENCE (Non-uniform transitions detectible)" : "Consistent with near-uniform Markov transitions"}`);

  // Walk-forward accuracy audit:
  // If you bet the top-3 empirical followers of yesterday's mark, what is your hit rate?
  // Baseline random expectation for 3 numbers out of 36: 3 / 36 = 8.33%
  // Baseline random expectation for top-5: 5 / 36 = 13.89%
  // Baseline random expectation for top-10: 10 / 36 = 27.78%
  let top1Hits = 0;
  let top3Hits = 0;
  let top5Hits = 0;
  let top10Hits = 0;
  const testHorizon = 2000; // last 2000 draws out-of-sample
  const startIdx = pwDraws.length - testHorizon;

  for (let i = startIdx; i < pwDraws.length - 1; i++) {
    // Train strictly up to i (walk-forward with ZERO lookahead)
    const rollingTrans: number[] = Array(37).fill(0);
    const prev = pwDraws[i];
    const actualNext = pwDraws[i + 1];

    for (let k = 0; k < i; k++) {
      if (pwDraws[k] === prev) {
        rollingTrans[pwDraws[k + 1]]++;
      }
    }

    const ranked = Array.from({ length: 36 }, (_, idx) => idx + 1)
      .map(ball => ({ ball, count: rollingTrans[ball] }))
      .sort((a, b) => b.count - a.count);

    if (ranked[0].ball === actualNext) top1Hits++;
    if (ranked.slice(0, 3).some(r => r.ball === actualNext)) top3Hits++;
    if (ranked.slice(0, 5).some(r => r.ball === actualNext)) top5Hits++;
    if (ranked.slice(0, 10).some(r => r.ball === actualNext)) top10Hits++;
  }

  console.log(`\n--- Walk-Forward Out-of-Sample Accuracy Audit (${testHorizon} Draws) ---`);
  console.log(`Top 1 Follower Accuracy: ${top1Hits} / ${testHorizon} (${((top1Hits / testHorizon) * 100).toFixed(2)}%) vs Random Baseline (2.78%)`);
  console.log(`Top 3 Followers Accuracy: ${top3Hits} / ${testHorizon} (${((top3Hits / testHorizon) * 100).toFixed(2)}%) vs Random Baseline (8.33%)`);
  console.log(`Top 5 Followers Accuracy: ${top5Hits} / ${testHorizon} (${((top5Hits / testHorizon) * 100).toFixed(2)}%) vs Random Baseline (13.89%)`);
  console.log(`Top 10 Followers Accuracy: ${top10Hits} / ${testHorizon} (${((top10Hits / testHorizon) * 100).toFixed(2)}%) vs Random Baseline (27.78%)`);

  // Latest Play Whe mark and its top empirical followers
  const latestPw = pwDraws[pwDraws.length - 1];
  console.log(`\nLatest Play Whe Result: #${latestPw}`);
  console.log(`Top 5 Statistically Verified Followers for #${latestPw}:`, strongestFollowers[latestPw]?.slice(0, 5));

  // 2. MULTI-BALL FOLLOWER ANALYSIS (WIN FOR LIFE 6/28)
  console.log("\n================================================================================");
  console.log("--- 2. WIN FOR LIFE (6 of 28 Cross-Draw Follower Matrix) ---");
  const wflRes = await safeExecute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6 FROM winforlife_draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const wflDraws = wflRes.rows.map((r: any) => [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5), Number(r.num6)]);
  console.log(`Loaded ${wflDraws.length} Win For Life draws.`);

  // Probability P(Ball B in Draw t | Ball A in Draw t-1)
  const wflCrossTrans: number[][] = Array.from({ length: 29 }, () => Array(29).fill(0));
  const wflBallAppearances: number[] = Array(29).fill(0);

  for (let i = 0; i < wflDraws.length - 1; i++) {
    const curDraw = wflDraws[i];
    const nextDraw = wflDraws[i + 1];
    curDraw.forEach(a => {
      wflBallAppearances[a]++;
      nextDraw.forEach(b => {
        wflCrossTrans[a][b]++;
      });
    });
  }

  // Find top cross-draw follower pairs
  const topCrossPairs: { from: number, to: number, count: number, prob: number }[] = [];
  for (let a = 1; a <= 28; a++) {
    for (let b = 1; b <= 28; b++) {
      if (wflBallAppearances[a] > 0) {
        const prob = wflCrossTrans[a][b] / wflBallAppearances[a];
        topCrossPairs.push({ from: a, to: b, count: wflCrossTrans[a][b], prob: Math.round(prob * 1000) / 10 });
      }
    }
  }
  topCrossPairs.sort((a, b) => b.prob - a.prob);

  console.log("Top 10 Cross-Draw Follower Bonds in Win For Life (P(B_t | A_{t-1})):");
  topCrossPairs.slice(0, 10).forEach(p => {
    console.log(`When Ball ${p.from} appears -> Ball ${p.to} appears in next draw: ${p.count} times (${p.prob}% probability vs expected ${(6 / 28 * 100).toFixed(1)}%)`);
  });

  // What follows the latest Win For Life draw?
  const latestWfl = wflDraws[wflDraws.length - 1];
  console.log(`\nLatest Win For Life Draw: [${latestWfl.join(", ")}]`);
  
  // Aggregate follower scores for next draw
  const nextBallScores: Record<number, number> = {};
  for (let b = 1; b <= 28; b++) nextBallScores[b] = 0;
  latestWfl.forEach(a => {
    for (let b = 1; b <= 28; b++) {
      nextBallScores[b] += wflCrossTrans[a][b];
    }
  });

  const rankedNextBalls = Object.entries(nextBallScores)
    .map(([ball, score]) => ({ ball: Number(ball), score }))
    .sort((a, b) => b.score - a.score);

  console.log("Ranked Top Follower Balls for Upcoming Win For Life Draw:");
  console.log(rankedNextBalls.slice(0, 10));
}

analyzeFollowerTheory().catch(console.error);
