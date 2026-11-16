import { ensureFastCashSchema, indexToFastCashCode, queryFastCash } from "./fastcash_db";

export const FASTCASH_STATES = 38; // 0 ("0"), 1..36 ("01".."36"), 37 ("00")

export interface FastCashDrawRow {
  draw_number: number;
  draw_date: string | null;
  draw_time: string;
  winning_code: string;
  winning_index: number;
}

export interface FastCashAuditEntry {
  draw_number: number;
  draw_date: string | null;
  draw_time: string;
  actual_code: string;
  actual_index: number;
  predicted_top1: string;
  predicted_top5: string[];
  predicted_top10: string[];
  hit_top1: boolean;
  hit_top5: boolean;
  hit_top10: boolean;
  rank_of_actual: number; // 1..38
  top_driver: string;
}

export interface FastCashDiagnostics {
  totalDrawsAnalyzed: number;
  latestDraw: FastCashDrawRow | null;
  chiSquare: number;
  degreesOfFreedom: number;
  pValueApprox: number;
  shannonEntropyBits: number;
  maxEntropyBits: number;
  entropyEfficiencyPct: number;
  repeatRatePct: number;
  expectedRepeatRatePct: number;
  lag1Autocorr: number;
  maxAbsAutocorrLag1To20: { lag: number; r: number };
  verdict: "UNIFORM_CRYPTO_LIKE" | "MILD_BIAS_DETECTED" | "ALGORITHMIC_STRUCTURE_DETECTED";
  pocketDistribution: Array<{
    code: string;
    index: number;
    count: number;
    expected: number;
    zScore: number;
  }>;
}

export interface FastCashEngineReport {
  success: boolean;
  dbTotalDraws: number;
  analyzedDraws: number;
  auditDepth: number;
  diagnostics: FastCashDiagnostics;
  nextDrawPrediction: {
    targetDrawNumber: number;
    top1: string;
    top5: string[];
    top10: string[];
    bestAffineRule: { a: number; c: number; trainHitTop5Pct: number };
    modelWeights: {
      markov: number;
      lcgAffine: number;
      phaseMod: number;
      ewma: number;
    };
    rankedScores: Array<{ code: string; index: number; score: number }>;
  };
  walkForwardSummary: {
    evaluatedCount: number;
    top1Hits: number;
    top1RatePct: number;
    top1BaselinePct: number;
    top5Hits: number;
    top5RatePct: number;
    top5BaselinePct: number;
    top10Hits: number;
    top10RatePct: number;
    top10BaselinePct: number;
    lcgTop5RatePct: number;
    markovTop5RatePct: number;
    phaseTop5RatePct: number;
    ewmaTop5RatePct: number;
  };
  recentDraws: FastCashDrawRow[];
  auditLedger: FastCashAuditEntry[];
}

/**
 * Wilson-Hilferty approximation for upper-tail Chi-Square p-value.
 */
function chiSquarePValueApprox(chi2: number, df: number): number {
  if (chi2 <= 0 || df <= 0) return 1;
  const z = (Math.pow(chi2 / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  // Standard normal survival function approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? Math.max(0, Math.min(1, p)) : Math.max(0, Math.min(1, 1 - p));
}

function computeAutocorr(series: number[], lag: number): number {
  const n = series.length;
  if (n <= lag + 2) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += series[i];
  const mean = sum / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const d = series[i] - mean;
    den += d * d;
    if (i >= lag) {
      num += d * (series[i - lag] - mean);
    }
  }
  return den > 0 ? num / den : 0;
}

/**
 * Finds the best modular affine rule (a * x_t + c) mod 38 over a trailing window
 * and returns normalized scores over 0..37 for the next draw.
 */
function scoreAffineRule(
  indices: number[],
  endIdx: number,
  windowSize: number = 300
): { scores: Float64Array; bestA: number; bestC: number; top5HitRate: number } {
  const start = Math.max(1, endIdx - windowSize);
  const len = endIdx - start;
  const scores = new Float64Array(FASTCASH_STATES);

  if (len < 20) {
    scores.fill(1 / FASTCASH_STATES);
    return { scores, bestA: 1, bestC: 0, top5HitRate: 0 };
  }

  // Test a in 1..37, c in 0..37 using modular residue proximity
  let bestA = 1;
  let bestC = 0;
  let bestHits = -1;

  for (let a = 1; a < FASTCASH_STATES; a++) {
    for (let c = 0; c < FASTCASH_STATES; c++) {
      let hits = 0;
      for (let t = start; t < endIdx; t++) {
        const pred = (a * indices[t - 1] + c) % FASTCASH_STATES;
        const dist = Math.min(
          Math.abs(pred - indices[t]),
          FASTCASH_STATES - Math.abs(pred - indices[t])
        );
        if (dist <= 2) hits++; // Top-5 modular neighborhood
      }
      if (hits > bestHits) {
        bestHits = hits;
        bestA = a;
        bestC = c;
      }
    }
  }

  const lastVal = indices[endIdx - 1];
  const center = (bestA * lastVal + bestC) % FASTCASH_STATES;
  for (let s = 0; s < FASTCASH_STATES; s++) {
    const dist = Math.min(Math.abs(s - center), FASTCASH_STATES - Math.abs(s - center));
    scores[s] = Math.exp(-0.55 * dist);
  }
  const sum = scores.reduce((acc, v) => acc + v, 0) || 1;
  for (let s = 0; s < FASTCASH_STATES; s++) scores[s] /= sum;

  return {
    scores,
    bestA,
    bestC,
    top5HitRate: (bestHits / len) * 100
  };
}

function scoreMarkov(
  transCounts: Float64Array,
  lastIndex: number
): Float64Array {
  const scores = new Float64Array(FASTCASH_STATES);
  const offset = lastIndex * FASTCASH_STATES;
  let rowSum = 0;
  for (let s = 0; s < FASTCASH_STATES; s++) {
    const val = transCounts[offset + s] + 0.5; // Laplace smoothing
    scores[s] = val;
    rowSum += val;
  }
  for (let s = 0; s < FASTCASH_STATES; s++) scores[s] /= rowSum || 1;
  return scores;
}

function scorePhaseMod(
  modCounts: Map<number, Float64Array>,
  targetDrawNumber: number
): Float64Array {
  const scores = new Float64Array(FASTCASH_STATES);
  const moduli = [3, 5, 10, 20, 38, 60];
  for (const k of moduli) {
    const residue = targetDrawNumber % k;
    const table = modCounts.get(k);
    if (!table) continue;
    const offset = residue * FASTCASH_STATES;
    let sum = 0;
    for (let s = 0; s < FASTCASH_STATES; s++) sum += table[offset + s] + 0.25;
    for (let s = 0; s < FASTCASH_STATES; s++) {
      scores[s] += (table[offset + s] + 0.25) / (sum || 1);
    }
  }
  const total = scores.reduce((a, b) => a + b, 0) || 1;
  for (let s = 0; s < FASTCASH_STATES; s++) scores[s] /= total;
  return scores;
}

function scoreEwmaAndGap(ewma: Float64Array, lastSeen: Int32Array, step: number): Float64Array {
  const scores = new Float64Array(FASTCASH_STATES);
  let sum = 0;
  for (let s = 0; s < FASTCASH_STATES; s++) {
    const gap = Math.max(1, step - lastSeen[s]);
    const gapBoost = Math.min(2.0, gap / FASTCASH_STATES);
    scores[s] = ewma[s] * 0.7 + gapBoost * 0.3;
    sum += scores[s];
  }
  for (let s = 0; s < FASTCASH_STATES; s++) scores[s] /= sum || 1;
  return scores;
}

function topIndicesFromScores(scores: Float64Array): number[] {
  const arr = Array.from({ length: FASTCASH_STATES }, (_, i) => i);
  arr.sort((a, b) => scores[b] - scores[a]);
  return arr;
}

export async function runFastCashEngine(options?: {
  depth?: number;
  limit?: number;
}): Promise<FastCashEngineReport> {
  await ensureFastCashSchema();

  const requestedLimit = Math.min(20000, Math.max(200, options?.limit || 6000));
  const requestedDepth = Math.min(1000, Math.max(50, options?.depth || 200));

  const countRows = await queryFastCash<{ cnt: number }>("SELECT COUNT(*) as cnt FROM fastcash_draws");
  const dbTotalDraws = Number(countRows[0]?.cnt || 0);

  const rawDesc = await queryFastCash<FastCashDrawRow>(
    `SELECT draw_number, draw_date, draw_time, winning_code, winning_index
     FROM fastcash_draws
     ORDER BY draw_number DESC
     LIMIT ?`,
    [requestedLimit]
  );

  const recentDraws = rawDesc.slice(0, 25);
  const chronological = [...rawDesc].reverse(); // oldest -> newest
  const n = chronological.length;
  const indices = chronological.map((d) => Number(d.winning_index));

  // 1. Statistical RNG Diagnostics
  const counts = new Int32Array(FASTCASH_STATES);
  for (const idx of indices) {
    if (idx >= 0 && idx < FASTCASH_STATES) counts[idx]++;
  }
  const expected = n / FASTCASH_STATES;
  let chi2 = 0;
  let entropy = 0;
  const pocketDistribution = [];

  for (let s = 0; s < FASTCASH_STATES; s++) {
    const c = counts[s];
    if (expected > 0) {
      chi2 += ((c - expected) * (c - expected)) / expected;
    }
    const p = n > 0 ? c / n : 0;
    if (p > 0) entropy -= p * Math.log2(p);
    pocketDistribution.push({
      code: indexToFastCashCode(s),
      index: s,
      count: c,
      expected: Number(expected.toFixed(1)),
      zScore: expected > 0 ? Number(((c - expected) / Math.sqrt(expected)).toFixed(2)) : 0
    });
  }

  let repeatCount = 0;
  for (let i = 1; i < n; i++) {
    if (indices[i] === indices[i - 1]) repeatCount++;
  }
  const repeatRatePct = n > 1 ? (repeatCount / (n - 1)) * 100 : 0;
  const lag1Autocorr = computeAutocorr(indices, 1);
  let maxLag = 1;
  let maxAbsR = Math.abs(lag1Autocorr);
  let maxSignedR = lag1Autocorr;
  for (let lag = 2; lag <= 20; lag++) {
    const r = computeAutocorr(indices, lag);
    if (Math.abs(r) > maxAbsR) {
      maxAbsR = Math.abs(r);
      maxSignedR = r;
      maxLag = lag;
    }
  }

  const df = FASTCASH_STATES - 1;
  const pValueApprox = chiSquarePValueApprox(chi2, df);
  const maxEntropyBits = Math.log2(FASTCASH_STATES);
  const entropyEfficiencyPct = (entropy / maxEntropyBits) * 100;

  const verdict: FastCashDiagnostics["verdict"] =
    pValueApprox < 0.01 || maxAbsR > 0.08
      ? "ALGORITHMIC_STRUCTURE_DETECTED"
      : pValueApprox < 0.1 || maxAbsR > 0.05
      ? "MILD_BIAS_DETECTED"
      : "UNIFORM_CRYPTO_LIKE";

  // 2. Causal Walk-Forward Replication Audit
  const warmup = Math.min(Math.max(50, Math.floor(n * 0.3)), Math.max(0, n - requestedDepth));
  const evalStart = Math.max(20, n - requestedDepth);
  const actualEvalStart = Math.max(warmup, evalStart);

  const transCounts = new Float64Array(FASTCASH_STATES * FASTCASH_STATES);
  const moduli = [3, 5, 10, 20, 38, 60];
  const modCounts = new Map<number, Float64Array>();
  for (const k of moduli) modCounts.set(k, new Float64Array(k * FASTCASH_STATES));

  const ewma = new Float64Array(FASTCASH_STATES).fill(1 / FASTCASH_STATES);
  const lastSeen = new Int32Array(FASTCASH_STATES).fill(-1);
  const alpha = 0.03;

  // Populate state up to actualEvalStart
  for (let t = 0; t < actualEvalStart && t < n; t++) {
    const curr = indices[t];
    if (t > 0) {
      transCounts[indices[t - 1] * FASTCASH_STATES + curr] += 1;
    }
    for (const k of moduli) {
      const table = modCounts.get(k)!;
      table[(chronological[t].draw_number % k) * FASTCASH_STATES + curr] += 1;
    }
    for (let s = 0; s < FASTCASH_STATES; s++) ewma[s] *= 1 - alpha;
    ewma[curr] += alpha;
    lastSeen[curr] = t;
  }

  let top1Hits = 0;
  let top5Hits = 0;
  let top10Hits = 0;
  let lcgTop5Hits = 0;
  let markovTop5Hits = 0;
  let phaseTop5Hits = 0;
  let ewmaTop5Hits = 0;
  const auditLedger: FastCashAuditEntry[] = [];

  const weights = { markov: 0.35, lcgAffine: 0.25, phaseMod: 0.2, ewma: 0.2 };

  for (let t = actualEvalStart; t < n; t++) {
    const draw = chronological[t];
    const prevIdx = indices[t - 1];

    const markovScores = scoreMarkov(transCounts, prevIdx);
    // Re-fit LCG affine every 20 steps for speed + causality
    const affine = scoreAffineRule(indices, t, 250);
    const phaseScores = scorePhaseMod(modCounts, draw.draw_number);
    const ewmaScores = scoreEwmaAndGap(ewma, lastSeen, t);

    const combined = new Float64Array(FASTCASH_STATES);
    for (let s = 0; s < FASTCASH_STATES; s++) {
      combined[s] =
        weights.markov * markovScores[s] +
        weights.lcgAffine * affine.scores[s] +
        weights.phaseMod * phaseScores[s] +
        weights.ewma * ewmaScores[s];
    }

    const ranked = topIndicesFromScores(combined);
    const top1 = indexToFastCashCode(ranked[0]);
    const top5 = ranked.slice(0, 5).map(indexToFastCashCode);
    const top10 = ranked.slice(0, 10).map(indexToFastCashCode);
    const rankOfActual = ranked.indexOf(draw.winning_index) + 1;

    const hit1 = rankOfActual === 1;
    const hit5 = rankOfActual <= 5;
    const hit10 = rankOfActual <= 10;
    if (hit1) top1Hits++;
    if (hit5) top5Hits++;
    if (hit10) top10Hits++;

    if (topIndicesFromScores(affine.scores).slice(0, 5).includes(draw.winning_index)) lcgTop5Hits++;
    if (topIndicesFromScores(markovScores).slice(0, 5).includes(draw.winning_index)) markovTop5Hits++;
    if (topIndicesFromScores(phaseScores).slice(0, 5).includes(draw.winning_index)) phaseTop5Hits++;
    if (topIndicesFromScores(ewmaScores).slice(0, 5).includes(draw.winning_index)) ewmaTop5Hits++;

    // Determine dominant driver for top1
    const bestDriverScore = Math.max(
      weights.markov * markovScores[ranked[0]],
      weights.lcgAffine * affine.scores[ranked[0]],
      weights.phaseMod * phaseScores[ranked[0]],
      weights.ewma * ewmaScores[ranked[0]]
    );
    const topDriver =
      bestDriverScore === weights.lcgAffine * affine.scores[ranked[0]]
        ? `LCG (${affine.bestA}x+${affine.bestC})`
        : bestDriverScore === weights.markov * markovScores[ranked[0]]
        ? "Markov Transition"
        : bestDriverScore === weights.phaseMod * phaseScores[ranked[0]]
        ? "Phase Mod"
        : "EWMA Momentum";

    auditLedger.push({
      draw_number: draw.draw_number,
      draw_date: draw.draw_date,
      draw_time: draw.draw_time,
      actual_code: draw.winning_code,
      actual_index: draw.winning_index,
      predicted_top1: top1,
      predicted_top5: top5,
      predicted_top10: top10,
      hit_top1: hit1,
      hit_top5: hit5,
      hit_top10: hit10,
      rank_of_actual: rankOfActual,
      top_driver: topDriver
    });

    // Update state AFTER evaluating draw t (strictly causal)
    transCounts[prevIdx * FASTCASH_STATES + draw.winning_index] += 1;
    for (const k of moduli) {
      const table = modCounts.get(k)!;
      table[(draw.draw_number % k) * FASTCASH_STATES + draw.winning_index] += 1;
    }
    for (let s = 0; s < FASTCASH_STATES; s++) ewma[s] *= 1 - alpha;
    ewma[draw.winning_index] += alpha;
    lastSeen[draw.winning_index] = t;
  }

  // 3. Next Draw Prediction (N+1)
  const latestDraw = n > 0 ? chronological[n - 1] : null;
  const nextDrawNum = latestDraw ? latestDraw.draw_number + 1 : 1;
  const nextScores = new Float64Array(FASTCASH_STATES).fill(1 / FASTCASH_STATES);
  let nextAffine = { a: 1, c: 0, trainHitTop5Pct: 0 };

  if (n >= 2) {
    const mScores = scoreMarkov(transCounts, indices[n - 1]);
    const aRes = scoreAffineRule(indices, n, 300);
    const pScores = scorePhaseMod(modCounts, nextDrawNum);
    const eScores = scoreEwmaAndGap(ewma, lastSeen, n);
    nextAffine = { a: aRes.bestA, c: aRes.bestC, trainHitTop5Pct: Number(aRes.top5HitRate.toFixed(2)) };

    for (let s = 0; s < FASTCASH_STATES; s++) {
      nextScores[s] =
        weights.markov * mScores[s] +
        weights.lcgAffine * aRes.scores[s] +
        weights.phaseMod * pScores[s] +
        weights.ewma * eScores[s];
    }
  }

  const nextRanked = topIndicesFromScores(nextScores);
  const evaluatedCount = auditLedger.length;

  return {
    success: true,
    dbTotalDraws,
    analyzedDraws: n,
    auditDepth: evaluatedCount,
    diagnostics: {
      totalDrawsAnalyzed: n,
      latestDraw,
      chiSquare: Number(chi2.toFixed(2)),
      degreesOfFreedom: df,
      pValueApprox: Number(pValueApprox.toFixed(4)),
      shannonEntropyBits: Number(entropy.toFixed(4)),
      maxEntropyBits: Number(maxEntropyBits.toFixed(4)),
      entropyEfficiencyPct: Number(entropyEfficiencyPct.toFixed(2)),
      repeatRatePct: Number(repeatRatePct.toFixed(2)),
      expectedRepeatRatePct: Number(((1 / FASTCASH_STATES) * 100).toFixed(2)),
      lag1Autocorr: Number(lag1Autocorr.toFixed(4)),
      maxAbsAutocorrLag1To20: { lag: maxLag, r: Number(maxSignedR.toFixed(4)) },
      verdict,
      pocketDistribution
    },
    nextDrawPrediction: {
      targetDrawNumber: nextDrawNum,
      top1: indexToFastCashCode(nextRanked[0]),
      top5: nextRanked.slice(0, 5).map(indexToFastCashCode),
      top10: nextRanked.slice(0, 10).map(indexToFastCashCode),
      bestAffineRule: nextAffine,
      modelWeights: weights,
      rankedScores: nextRanked.map((idx) => ({
        code: indexToFastCashCode(idx),
        index: idx,
        score: Number((nextScores[idx] * 100).toFixed(2))
      }))
    },
    walkForwardSummary: {
      evaluatedCount,
      top1Hits,
      top1RatePct: evaluatedCount > 0 ? Number(((top1Hits / evaluatedCount) * 100).toFixed(2)) : 0,
      top1BaselinePct: Number(((1 / FASTCASH_STATES) * 100).toFixed(2)),
      top5Hits,
      top5RatePct: evaluatedCount > 0 ? Number(((top5Hits / evaluatedCount) * 100).toFixed(2)) : 0,
      top5BaselinePct: Number(((5 / FASTCASH_STATES) * 100).toFixed(2)),
      top10Hits,
      top10RatePct: evaluatedCount > 0 ? Number(((top10Hits / evaluatedCount) * 100).toFixed(2)) : 0,
      top10BaselinePct: Number(((10 / FASTCASH_STATES) * 100).toFixed(2)),
      lcgTop5RatePct: evaluatedCount > 0 ? Number(((lcgTop5Hits / evaluatedCount) * 100).toFixed(2)) : 0,
      markovTop5RatePct: evaluatedCount > 0 ? Number(((markovTop5Hits / evaluatedCount) * 100).toFixed(2)) : 0,
      phaseTop5RatePct: evaluatedCount > 0 ? Number(((phaseTop5Hits / evaluatedCount) * 100).toFixed(2)) : 0,
      ewmaTop5RatePct: evaluatedCount > 0 ? Number(((ewmaTop5Hits / evaluatedCount) * 100).toFixed(2)) : 0
    },
    recentDraws,
    auditLedger: auditLedger.reverse() // newest first
  };
}
