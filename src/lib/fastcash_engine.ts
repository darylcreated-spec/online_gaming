import { ensureFastCashSchema, indexToFastCashCode, queryFastCash } from "./fastcash_db";

export const FASTCASH_STATES = 38; // 0 ("0"), 1..36 ("01".."36"), 37 ("00")

// Physical 38-pocket American Roulette wheel layout (where 37 represents "00")
export const AMERICAN_ROULETTE_WHEEL = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
  37, 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2
];

const WHEEL_POS = new Int32Array(FASTCASH_STATES);
AMERICAN_ROULETTE_WHEEL.forEach((val, pos) => {
  WHEEL_POS[val] = pos;
});

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
  predicted_top14: string[];
  hit_top1: boolean;
  hit_top5: boolean;
  hit_top10: boolean;
  hit_top14: boolean;
  hit_top19: boolean;
  rank_of_actual: number; // 1..38
  top_driver: string;
  session_draws_to_hit_top14: number | null; // 0 = immediate hit, 1..14 = subsequent draws in W=15 window
}

export interface FastCashHistoricalTwin {
  matchedDrawNumber: number;
  matchedDate: string | null;
  matchedTime: string;
  patternType: "3-DRAW_EXACT" | "2-DRAW_EXACT";
  sequenceCodes: string[];
  followerDrawNumber: number;
  followerCode: string;
}

export interface FastCashSessionWindowRow {
  windowDraws: number;
  durationMinutes: number;
  windowsEvaluated: number;
  top5Hits: number;
  top5RatePct: number;
  top10Hits: number;
  top10RatePct: number;
  top14Hits: number;
  top14RatePct: number;
  top19Hits: number;
  top19RatePct: number;
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
  topNumericStepDeltas: Array<{ delta: number; count: number; zScore: number; nextTargetCode: string }>;
  topWheelStepDeltas: Array<{ wheelStep: number; count: number; zScore: number; nextTargetCode: string }>;
  topHazardGaps: Array<{ gap: number; hitRatePct: number; zScore: number }>;
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
    top14MandelCore: string[];
    top19HalfWheel: string[];
    bestAffineRule: { a: number; c: number; trainHitTop5Pct: number };
    historicalTwins: FastCashHistoricalTwin[];
    twinFollowerUnion: string[];
    modelWeights: {
      markov: number;
      lcgAffine: number;
      phaseMod: number;
      ewma: number;
      stepDelta: number;
      wheelSector: number;
      hazardGap: number;
      sequenceTwins: number;
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
    top14Hits: number;
    top14RatePct: number;
    top14BaselinePct: number;
    top19Hits: number;
    top19RatePct: number;
    top19BaselinePct: number;
    lcgTop5RatePct: number;
    markovTop5RatePct: number;
    phaseTop5RatePct: number;
    ewmaTop5RatePct: number;
  };
  sessionWindows: FastCashSessionWindowRow[];
  recentDraws: FastCashDrawRow[];
  auditLedger: FastCashAuditEntry[];
}

function normalize(arr: Float64Array): Float64Array {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  if (s > 0) {
    for (let i = 0; i < arr.length; i++) arr[i] /= s;
  } else {
    arr.fill(1 / arr.length);
  }
  return arr;
}

/**
 * Wilson-Hilferty approximation for upper-tail Chi-Square p-value.
 */
function chiSquarePValueApprox(chi2: number, df: number): number {
  if (chi2 <= 0 || df <= 0) return 1;
  const z = (Math.pow(chi2 / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
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

function scoreAffineRule(
  indices: number[],
  endIdx: number,
  windowSize: number = 250
): { scores: Float64Array; bestA: number; bestC: number; top5HitRate: number } {
  const start = Math.max(1, endIdx - windowSize);
  const len = endIdx - start;
  const scores = new Float64Array(FASTCASH_STATES);

  if (len < 20) {
    scores.fill(1 / FASTCASH_STATES);
    return { scores, bestA: 1, bestC: 0, top5HitRate: 0 };
  }

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
        if (dist <= 2) hits++;
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
  normalize(scores);

  return {
    scores,
    bestA,
    bestC,
    top5HitRate: (bestHits / len) * 100
  };
}

function scoreMarkov(transCounts: Float64Array, lastIndex: number): Float64Array {
  const scores = new Float64Array(FASTCASH_STATES);
  const offset = lastIndex * FASTCASH_STATES;
  for (let s = 0; s < FASTCASH_STATES; s++) {
    scores[s] = transCounts[offset + s] + 0.5;
  }
  return normalize(scores);
}

function scorePhaseMod(modCounts: Map<number, Float64Array>, targetDrawNumber: number): Float64Array {
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
  return normalize(scores);
}

function scoreEwmaAndGap(ewma: Float64Array, lastSeen: Int32Array, step: number): Float64Array {
  const scores = new Float64Array(FASTCASH_STATES);
  for (let s = 0; s < FASTCASH_STATES; s++) {
    const gap = Math.max(1, step - lastSeen[s]);
    const gapBoost = Math.min(2.0, gap / FASTCASH_STATES);
    scores[s] = ewma[s] * 0.7 + gapBoost * 0.3;
  }
  return normalize(scores);
}

function scoreStage2Orthogonal(
  prevIdx: number,
  prev2Idx: number,
  step: number,
  indices: number[],
  numDeltaCounts: Float64Array,
  wheelDeltaCounts: Float64Array,
  gapHits: Float64Array,
  gapExp: Float64Array,
  lastSeen: Int32Array,
  globalFreq: Float64Array
): Float64Array {
  const mNumDelta = new Float64Array(FASTCASH_STATES);
  for (let d = 0; d < FASTCASH_STATES; d++) {
    mNumDelta[(prevIdx + d) % FASTCASH_STATES] = numDeltaCounts[d];
  }
  normalize(mNumDelta);

  const mWheel = new Float64Array(FASTCASH_STATES);
  const prevPos = WHEEL_POS[prevIdx];
  for (let wd = 0; wd < FASTCASH_STATES; wd++) {
    mWheel[AMERICAN_ROULETTE_WHEEL[(prevPos + wd) % FASTCASH_STATES]] = wheelDeltaCounts[wd];
  }
  normalize(mWheel);

  const mHazard = new Float64Array(FASTCASH_STATES);
  for (let s = 0; s < FASTCASH_STATES; s++) {
    const g = lastSeen[s] >= 0 ? Math.min(249, step - lastSeen[s]) : 38;
    mHazard[s] = (gapHits[g] / gapExp[g]) * (globalFreq[s] / Math.max(1, step / FASTCASH_STATES));
  }
  normalize(mHazard);

  const mTwins = new Float64Array(FASTCASH_STATES).fill(0.1);
  const twinStart = Math.max(2, step - 3000);
  for (let k = twinStart; k < step; k++) {
    if (indices[k - 2] === prev2Idx && indices[k - 1] === prevIdx) {
      mTwins[indices[k]] += 2.0;
    }
  }
  normalize(mTwins);

  const stage2 = new Float64Array(FASTCASH_STATES);
  for (let s = 0; s < FASTCASH_STATES; s++) {
    stage2[s] = 0.30 * mNumDelta[s] + 0.25 * mWheel[s] + 0.25 * mHazard[s] + 0.20 * mTwins[s];
  }
  return normalize(stage2);
}

function buildTwoStageRanking(stage1: Float64Array, stage2: Float64Array): {
  ranked: number[];
  combinedDisplayScores: Float64Array;
} {
  const top5Stage1 = Array.from({ length: FASTCASH_STATES }, (_, i) => i)
    .sort((a, b) => stage1[b] - stage1[a])
    .slice(0, 5);
  const top5Set = new Set(top5Stage1);
  const restStage2 = Array.from({ length: FASTCASH_STATES }, (_, i) => i)
    .filter((i) => !top5Set.has(i))
    .sort((a, b) => stage2[b] - stage2[a]);

  const ranked = [...top5Stage1, ...restStage2];
  const combinedDisplayScores = new Float64Array(FASTCASH_STATES);
  for (let s = 0; s < FASTCASH_STATES; s++) {
    combinedDisplayScores[s] = top5Set.has(s) ? stage1[s] * 1.35 : stage2[s] * 0.85;
  }
  normalize(combinedDisplayScores);
  return { ranked, combinedDisplayScores };
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

  // 1. Statistical RNG Diagnostics (Full Loaded Sample)
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
  const fullNumDeltas = new Int32Array(FASTCASH_STATES);
  const fullWheelDeltas = new Int32Array(FASTCASH_STATES);
  for (let i = 1; i < n; i++) {
    if (indices[i] === indices[i - 1]) repeatCount++;
    fullNumDeltas[(indices[i] - indices[i - 1] + FASTCASH_STATES) % FASTCASH_STATES]++;
    fullWheelDeltas[(WHEEL_POS[indices[i]] - WHEEL_POS[indices[i - 1]] + FASTCASH_STATES) % FASTCASH_STATES]++;
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

  const latestIdx = n > 0 ? indices[n - 1] : 0;
  const latestWheelPos = WHEEL_POS[latestIdx];
  const expDelta = Math.max(1, (n - 1) / FASTCASH_STATES);

  const topNumericStepDeltas = Array.from({ length: FASTCASH_STATES }, (_, d) => ({
    delta: d,
    count: fullNumDeltas[d],
    zScore: Number(((fullNumDeltas[d] - expDelta) / Math.sqrt(expDelta)).toFixed(2)),
    nextTargetCode: indexToFastCashCode((latestIdx + d) % FASTCASH_STATES)
  }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topWheelStepDeltas = Array.from({ length: FASTCASH_STATES }, (_, wd) => ({
    wheelStep: wd,
    count: fullWheelDeltas[wd],
    zScore: Number(((fullWheelDeltas[wd] - expDelta) / Math.sqrt(expDelta)).toFixed(2)),
    nextTargetCode: indexToFastCashCode(AMERICAN_ROULETTE_WHEEL[(latestWheelPos + wd) % FASTCASH_STATES])
  }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 2. Causal Walk-Forward Two-Stage Hybrid Replication Audit
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

  const numDeltaCounts = new Float64Array(FASTCASH_STATES).fill(1);
  const wheelDeltaCounts = new Float64Array(FASTCASH_STATES).fill(1);
  const gapHits = new Float64Array(250).fill(1);
  const gapExp = new Float64Array(250).fill(FASTCASH_STATES);
  const globalFreq = new Float64Array(FASTCASH_STATES).fill(1);

  for (let t = 0; t < actualEvalStart && t < n; t++) {
    const curr = indices[t];
    globalFreq[curr] += 1;
    if (t > 0) {
      const prev = indices[t - 1];
      transCounts[prev * FASTCASH_STATES + curr] += 1;
      numDeltaCounts[(curr - prev + FASTCASH_STATES) % FASTCASH_STATES] += 1;
      wheelDeltaCounts[(WHEEL_POS[curr] - WHEEL_POS[prev] + FASTCASH_STATES) % FASTCASH_STATES] += 1;
    }
    for (const k of moduli) {
      const table = modCounts.get(k)!;
      table[(chronological[t].draw_number % k) * FASTCASH_STATES + curr] += 1;
    }
    for (let s = 0; s < FASTCASH_STATES; s++) {
      if (lastSeen[s] >= 0) {
        const g = t - lastSeen[s];
        if (g < 250) {
          gapExp[g] += 1;
          if (curr === s) gapHits[g] += 1;
        }
      }
      ewma[s] *= 1 - alpha;
    }
    ewma[curr] += alpha;
    lastSeen[curr] = t;
  }

  let top1Hits = 0;
  let top5Hits = 0;
  let top10Hits = 0;
  let top14Hits = 0;
  let top19Hits = 0;
  let lcgTop5Hits = 0;
  let markovTop5Hits = 0;
  let phaseTop5Hits = 0;
  let ewmaTop5Hits = 0;
  const auditLedger: FastCashAuditEntry[] = [];
  const rankedHistory: number[][] = [];
  const actualHistory: number[] = [];

  const weights = {
    markov: 0.35,
    lcgAffine: 0.25,
    phaseMod: 0.2,
    ewma: 0.2,
    stepDelta: 0.3,
    wheelSector: 0.25,
    hazardGap: 0.25,
    sequenceTwins: 0.2
  };

  for (let t = actualEvalStart; t < n; t++) {
    const draw = chronological[t];
    const prevIdx = indices[t - 1];
    const prev2Idx = t >= 2 ? indices[t - 2] : prevIdx;

    const markovScores = scoreMarkov(transCounts, prevIdx);
    const affine = scoreAffineRule(indices, t, 250);
    const phaseScores = scorePhaseMod(modCounts, draw.draw_number);
    const ewmaScores = scoreEwmaAndGap(ewma, lastSeen, t);

    const stage1 = new Float64Array(FASTCASH_STATES);
    for (let s = 0; s < FASTCASH_STATES; s++) {
      stage1[s] =
        weights.markov * markovScores[s] +
        weights.lcgAffine * affine.scores[s] +
        weights.phaseMod * phaseScores[s] +
        weights.ewma * ewmaScores[s];
    }

    const stage2 = scoreStage2Orthogonal(
      prevIdx,
      prev2Idx,
      t,
      indices,
      numDeltaCounts,
      wheelDeltaCounts,
      gapHits,
      gapExp,
      lastSeen,
      globalFreq
    );

    const { ranked } = buildTwoStageRanking(stage1, stage2);
    rankedHistory.push(ranked);
    actualHistory.push(draw.winning_index);

    const top1 = indexToFastCashCode(ranked[0]);
    const top5 = ranked.slice(0, 5).map(indexToFastCashCode);
    const top10 = ranked.slice(0, 10).map(indexToFastCashCode);
    const top14 = ranked.slice(0, 14).map(indexToFastCashCode);
    const rankOfActual = ranked.indexOf(draw.winning_index) + 1;

    const hit1 = rankOfActual === 1;
    const hit5 = rankOfActual <= 5;
    const hit10 = rankOfActual <= 10;
    const hit14 = rankOfActual <= 14;
    const hit19 = rankOfActual <= 19;
    if (hit1) top1Hits++;
    if (hit5) top5Hits++;
    if (hit10) top10Hits++;
    if (hit14) top14Hits++;
    if (hit19) top19Hits++;

    if (topIndicesFromScores(affine.scores).slice(0, 5).includes(draw.winning_index)) lcgTop5Hits++;
    if (topIndicesFromScores(markovScores).slice(0, 5).includes(draw.winning_index)) markovTop5Hits++;
    if (topIndicesFromScores(phaseScores).slice(0, 5).includes(draw.winning_index)) phaseTop5Hits++;
    if (topIndicesFromScores(ewmaScores).slice(0, 5).includes(draw.winning_index)) ewmaTop5Hits++;

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
        : "EWMA + Step-Delta";

    auditLedger.push({
      draw_number: draw.draw_number,
      draw_date: draw.draw_date,
      draw_time: draw.draw_time,
      actual_code: draw.winning_code,
      actual_index: draw.winning_index,
      predicted_top1: top1,
      predicted_top5: top5,
      predicted_top10: top10,
      predicted_top14: top14,
      hit_top1: hit1,
      hit_top5: hit5,
      hit_top10: hit10,
      hit_top14: hit14,
      hit_top19: hit19,
      rank_of_actual: rankOfActual,
      top_driver: topDriver,
      session_draws_to_hit_top14: null
    });

    // Update causal counters
    globalFreq[draw.winning_index] += 1;
    transCounts[prevIdx * FASTCASH_STATES + draw.winning_index] += 1;
    numDeltaCounts[(draw.winning_index - prevIdx + FASTCASH_STATES) % FASTCASH_STATES] += 1;
    wheelDeltaCounts[(WHEEL_POS[draw.winning_index] - WHEEL_POS[prevIdx] + FASTCASH_STATES) % FASTCASH_STATES] += 1;
    for (const k of moduli) {
      const table = modCounts.get(k)!;
      table[(draw.draw_number % k) * FASTCASH_STATES + draw.winning_index] += 1;
    }
    for (let s = 0; s < FASTCASH_STATES; s++) {
      if (lastSeen[s] >= 0) {
        const g = t - lastSeen[s];
        if (g < 250) {
          gapExp[g] += 1;
          if (draw.winning_index === s) gapHits[g] += 1;
        }
      }
      ewma[s] *= 1 - alpha;
    }
    ewma[draw.winning_index] += alpha;
    lastSeen[draw.winning_index] = t;
  }

  // Compute Session Draws-to-Hit (W=15) for each audit entry and Multi-Draw Session Window Matrix
  const evaluatedCount = auditLedger.length;
  for (let i = 0; i < evaluatedCount; i++) {
    let wait: number | null = null;
    for (let w = 0; i + w < evaluatedCount && w < 15; w++) {
      if (rankedHistory[i + w].slice(0, 14).includes(actualHistory[i + w])) {
        wait = w;
        break;
      }
    }
    auditLedger[i].session_draws_to_hit_top14 = wait;
  }

  const sessionWindows: FastCashSessionWindowRow[] = [];
  for (const W of [1, 3, 5, 8, 10, 12, 15]) {
    let totalW = 0;
    let h5 = 0;
    let h10 = 0;
    let h14 = 0;
    let h19 = 0;
    for (let i = 0; i <= evaluatedCount - W; i++) {
      totalW++;
      let ok5 = false, ok10 = false, ok14 = false, ok19 = false;
      for (let w = 0; w < W; w++) {
        const act = actualHistory[i + w];
        const rnk = rankedHistory[i + w];
        if (!ok5 && rnk.slice(0, 5).includes(act)) ok5 = true;
        if (!ok10 && rnk.slice(0, 10).includes(act)) ok10 = true;
        if (!ok14 && rnk.slice(0, 14).includes(act)) ok14 = true;
        if (!ok19 && rnk.slice(0, 19).includes(act)) ok19 = true;
      }
      if (ok5) h5++;
      if (ok10) h10++;
      if (ok14) h14++;
      if (ok19) h19++;
    }
    if (totalW > 0) {
      sessionWindows.push({
        windowDraws: W,
        durationMinutes: W * 3,
        windowsEvaluated: totalW,
        top5Hits: h5,
        top5RatePct: Number(((h5 / totalW) * 100).toFixed(1)),
        top10Hits: h10,
        top10RatePct: Number(((h10 / totalW) * 100).toFixed(1)),
        top14Hits: h14,
        top14RatePct: Number(((h14 / totalW) * 100).toFixed(1)),
        top19Hits: h19,
        top19RatePct: Number(((h19 / totalW) * 100).toFixed(1))
      });
    }
  }

  // Top hazard gaps from empirical survival curve
  const p0 = 1 / FASTCASH_STATES;
  const topHazardGaps: Array<{ gap: number; hitRatePct: number; zScore: number }> = [];
  for (let g = 1; g <= 120; g++) {
    if (gapExp[g] >= 200) {
      const rate = gapHits[g] / gapExp[g];
      const z = (rate - p0) / Math.sqrt((p0 * (1 - p0)) / gapExp[g]);
      topHazardGaps.push({
        gap: g,
        hitRatePct: Number((rate * 100).toFixed(2)),
        zScore: Number(z.toFixed(2))
      });
    }
  }
  topHazardGaps.sort((a, b) => b.zScore - a.zScore);

  // 3. Next Draw Prediction (N+1) + Exact Historical Sequence Twins
  const latestDraw = n > 0 ? chronological[n - 1] : null;
  const nextDrawNum = latestDraw ? latestDraw.draw_number + 1 : 1;
  let nextRanked = Array.from({ length: FASTCASH_STATES }, (_, i) => i);
  let nextScores: Float64Array<ArrayBufferLike> = new Float64Array(FASTCASH_STATES).fill(1 / FASTCASH_STATES);
  let nextAffine = { a: 1, c: 0, trainHitTop5Pct: 0 };
  const historicalTwins: FastCashHistoricalTwin[] = [];
  const twinFollowersSet = new Set<string>();

  if (n >= 2) {
    const prevIdx = indices[n - 1];
    const prev2Idx = indices[n - 2];
    const prev3Idx = n >= 3 ? indices[n - 3] : -1;

    const mScores = scoreMarkov(transCounts, prevIdx);
    const aRes = scoreAffineRule(indices, n, 300);
    const pScores = scorePhaseMod(modCounts, nextDrawNum);
    const eScores = scoreEwmaAndGap(ewma, lastSeen, n);
    nextAffine = { a: aRes.bestA, c: aRes.bestC, trainHitTop5Pct: Number(aRes.top5HitRate.toFixed(2)) };

    const stage1 = new Float64Array(FASTCASH_STATES);
    for (let s = 0; s < FASTCASH_STATES; s++) {
      stage1[s] =
        weights.markov * mScores[s] +
        weights.lcgAffine * aRes.scores[s] +
        weights.phaseMod * pScores[s] +
        weights.ewma * eScores[s];
    }

    const stage2 = scoreStage2Orthogonal(
      prevIdx,
      prev2Idx,
      n,
      indices,
      numDeltaCounts,
      wheelDeltaCounts,
      gapHits,
      gapExp,
      lastSeen,
      globalFreq
    );

    const built = buildTwoStageRanking(stage1, stage2);
    nextRanked = built.ranked;
    nextScores = built.combinedDisplayScores;

    // Search chronological history for exact 3-draw and 2-draw sequence twins
    for (let k = n - 2; k >= 2 && historicalTwins.length < 10; k--) {
      if (indices[k] === prevIdx && indices[k - 1] === prev2Idx) {
        const is3Match = prev3Idx >= 0 && indices[k - 2] === prev3Idx;
        const follower = chronological[k + 1];
        const matched = chronological[k];
        twinFollowersSet.add(follower.winning_code);
        historicalTwins.push({
          matchedDrawNumber: matched.draw_number,
          matchedDate: matched.draw_date,
          matchedTime: matched.draw_time,
          patternType: is3Match ? "3-DRAW_EXACT" : "2-DRAW_EXACT",
          sequenceCodes: is3Match
            ? [chronological[k - 2].winning_code, chronological[k - 1].winning_code, matched.winning_code]
            : [chronological[k - 1].winning_code, matched.winning_code],
          followerDrawNumber: follower.draw_number,
          followerCode: follower.winning_code
        });
      }
    }
  }

  const df = FASTCASH_STATES - 1;
  const pValueApprox = chiSquarePValueApprox(chi2, df);
  const maxEntropyBits = Math.log2(FASTCASH_STATES);
  const entropyEfficiencyPct = (entropy / maxEntropyBits) * 100;

  const verdict: FastCashDiagnostics["verdict"] =
    pValueApprox < 0.01 || maxAbsR > 0.08 || (topNumericStepDeltas[0]?.zScore || 0) >= 2.5
      ? "ALGORITHMIC_STRUCTURE_DETECTED"
      : pValueApprox < 0.1 || maxAbsR > 0.05
      ? "MILD_BIAS_DETECTED"
      : "UNIFORM_CRYPTO_LIKE";

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
      topNumericStepDeltas,
      topWheelStepDeltas,
      topHazardGaps: topHazardGaps.slice(0, 5),
      verdict,
      pocketDistribution
    },
    nextDrawPrediction: {
      targetDrawNumber: nextDrawNum,
      top1: indexToFastCashCode(nextRanked[0]),
      top5: nextRanked.slice(0, 5).map(indexToFastCashCode),
      top10: nextRanked.slice(0, 10).map(indexToFastCashCode),
      top14MandelCore: nextRanked.slice(0, 14).map(indexToFastCashCode),
      top19HalfWheel: nextRanked.slice(0, 19).map(indexToFastCashCode),
      bestAffineRule: nextAffine,
      historicalTwins,
      twinFollowerUnion: Array.from(twinFollowersSet),
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
      top14Hits,
      top14RatePct: evaluatedCount > 0 ? Number(((top14Hits / evaluatedCount) * 100).toFixed(2)) : 0,
      top14BaselinePct: Number(((14 / FASTCASH_STATES) * 100).toFixed(2)),
      top19Hits,
      top19RatePct: evaluatedCount > 0 ? Number(((top19Hits / evaluatedCount) * 100).toFixed(2)) : 0,
      top19BaselinePct: Number(((19 / FASTCASH_STATES) * 100).toFixed(2)),
      lcgTop5RatePct: evaluatedCount > 0 ? Number(((lcgTop5Hits / evaluatedCount) * 100).toFixed(2)) : 0,
      markovTop5RatePct: evaluatedCount > 0 ? Number(((markovTop5Hits / evaluatedCount) * 100).toFixed(2)) : 0,
      phaseTop5RatePct: evaluatedCount > 0 ? Number(((phaseTop5Hits / evaluatedCount) * 100).toFixed(2)) : 0,
      ewmaTop5RatePct: evaluatedCount > 0 ? Number(((ewmaTop5Hits / evaluatedCount) * 100).toFixed(2)) : 0
    },
    sessionWindows,
    recentDraws,
    auditLedger: auditLedger.reverse() // newest first
  };
}
