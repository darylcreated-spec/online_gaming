/**
 * cashpot_rng_lab.ts
 * ==================
 * Cash Pot (5 of 20 + 1x-4x Multiplier) Adaptive Stochastic Generator &
 * Strict Walk-Forward Anti-Overfitting Backtest Laboratory.
 *
 * Scientific Design:
 * 1. Strictly causal feature precomputation: for every draw index t, features[t]
 *    reads ONLY draws [0 .. t-1] (zero lookahead leakage).
 * 2. Chronological Calibration (Training) vs Blind Out-of-Sample Test split:
 *    The evolutionary optimizer adjusts the 6 stochastic generator knobs ONLY on
 *    earlier draws [30 .. N - testWindow - 1], then evaluates strictly walk-forward
 *    on the unseen final `testWindow` draws.
 * 3. Honest Pure-Random Benchmark: compares the tuned generator against both exact
 *    hypergeometric odds and a 150-trial Monte Carlo Pure Uniform Random baseline
 *    over the identical test window, reporting Z-score and In-Sample vs Out-of-Sample
 *    Overfit Gap transparently.
 */

export interface CashPotHistoricalRow {
  drawNumber: number;
  drawDate: string;
  numbers: number[]; // 5 sorted unique integers in 1..20
  multiplier: number; // 1..4
}

export type RngObjectiveKey = "match3_rate" | "high_tier" | "multiplier_roi";

export interface CashPotRngGenome {
  wRecency: number;       // 0.0 .. 3.0 (short-window hot momentum)
  wOverdue: number;       // 0.0 .. 3.0 (skip / drought tension)
  wMarkov: number;        // 0.0 .. 3.0 (Lag-1 "what follows last draw")
  wCooccur: number;       // 0.0 .. 3.0 (pair co-occurrence with last draw)
  temperature: number;    // 0.25 .. 4.0 (sampling randomness; higher = closer to uniform)
  sumParityGuard: number; // 0.0 .. 1.0 (structural sum [38..67] & odd/even balance filter)
}

export interface CashPotRngLabRequest {
  autoTune?: boolean;
  genome?: Partial<CashPotRngGenome>;
  slipCount?: 5 | 7 | 10;
  testWindow?: 40 | 60 | 80;
  objective?: RngObjectiveKey;
  seed?: number;
  antiCrowding?: boolean;
}

export interface RngBallProbability {
  ball: number;
  probabilityPct: number;
  uniformBaselinePct: number;
  deltaPct: number;
  recentHits20: number;
  drawsSkipped: number;
  followsLastCount: number;
}

export interface RngGeneratedSlip {
  index: number;
  numbers: number[];
  sum: number;
  oddEvenSplit: string;
  lowHighSplit: string;
  avgBallProbPct: number;
}

export interface RngBlindDrawRecord {
  drawNumber: number;
  drawDate: string;
  isSureCallDay: boolean;
  actualNumbers: number[];
  multiplier: number;
  bestSlip: number[];
  bestMatch: number;
  prizeSlipsCount: number;
  payoutTT: number;
  stakeTT: number;
  netTT: number;
  cumTunedHits: number;
  cumRandomExpectedHits: number;
}

export interface RngWindowMetrics {
  drawsTested: number;
  match3PlusDraws: number;
  match3PlusRatePct: number;
  match4PlusDraws: number;
  match4PlusRatePct: number;
  match5Draws: number;
  totalPrizeSlips: number;
  totalStakeTT: number;
  totalPayoutTT: number;
  netProfitTT: number;
  roiPct: number;
  sureCallDraws: number;
  sureCallWinRatePct: number;
  sureCallNetTT: number;
}

export interface CashPotRngLabOutput {
  totalDrawsAvailable: number;
  calibrationDrawsCount: number;
  blindTestDrawsCount: number;
  latestDraw: CashPotHistoricalRow;
  nextTargetDrawNumber: number;
  nextIsSureCallDay: boolean;
  slipCount: 5 | 7 | 10;
  testWindow: 40 | 60 | 80;
  objective: RngObjectiveKey;
  seed: number;
  antiCrowding: boolean;
  wasAutoTuned: boolean;
  optimizerEvaluations: number;
  computeMs: number;
  genome: CashPotRngGenome;
  calibrationMetrics: RngWindowMetrics;
  blindTestMetrics: RngWindowMetrics;
  randomBenchmark: {
    exactSingleSlipMatch3Pct: number;
    exactSingleSlipMatch4Pct: number;
    monteCarloTrials: number;
    expectedMatch3RatePct: number;
    stdMatch3RatePct: number;
    expectedMatch4Draws: number;
    expectedNetProfitTT: number;
    zScoreVsRandom: number;
    liftPctPoints: number;
  };
  overfitDiagnostics: {
    inSampleRatePct: number;
    outOfSampleRatePct: number;
    overfitGapPctPoints: number;
    verdictCode: "VERIFIED_LIFT" | "WITHIN_NOISE" | "OVERFIT_WARNING";
    verdictTitle: string;
    verdictSummary: string;
  };
  ballProbabilities: RngBallProbability[];
  nextDrawSlips: RngGeneratedSlip[];
  trajectory: Array<{
    step: number;
    drawNumber: number;
    drawDate: string;
    tunedCumHits: number;
    randomExpectedCumHits: number;
  }>;
  blindAuditLog: RngBlindDrawRecord[];
}

// ============================================================================
// Pure Random Baseline Genome & Clamping Helpers
// ============================================================================
export const PURE_RANDOM_GENOME: CashPotRngGenome = {
  wRecency: 0,
  wOverdue: 0,
  wMarkov: 0,
  wCooccur: 0,
  temperature: 2.0,
  sumParityGuard: 0
};

export const DEFAULT_TUNED_SEED_GENOME: CashPotRngGenome = {
  wRecency: 0.8,
  wOverdue: 0.6,
  wMarkov: 0.9,
  wCooccur: 0.7,
  temperature: 1.1,
  sumParityGuard: 0.7
};

function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sanitizeGenome(input?: Partial<CashPotRngGenome>): CashPotRngGenome {
  return {
    wRecency: round2(clamp(Number(input?.wRecency ?? DEFAULT_TUNED_SEED_GENOME.wRecency), 0, 3)),
    wOverdue: round2(clamp(Number(input?.wOverdue ?? DEFAULT_TUNED_SEED_GENOME.wOverdue), 0, 3)),
    wMarkov: round2(clamp(Number(input?.wMarkov ?? DEFAULT_TUNED_SEED_GENOME.wMarkov), 0, 3)),
    wCooccur: round2(clamp(Number(input?.wCooccur ?? DEFAULT_TUNED_SEED_GENOME.wCooccur), 0, 3)),
    temperature: round2(clamp(Number(input?.temperature ?? DEFAULT_TUNED_SEED_GENOME.temperature), 0.25, 4.0)),
    sumParityGuard: round2(clamp(Number(input?.sumParityGuard ?? DEFAULT_TUNED_SEED_GENOME.sumParityGuard), 0, 1))
  };
}

// Deterministic fast PRNG (Mulberry32)
function createMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isSureCallIsoDate(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  // Monday (1), Thursday (4), Saturday (6) are NLCB Sure Call days (2x-4x guaranteed)
  return dow === 1 || dow === 4 || dow === 6;
}

function computeCashPotPayoutTT(matchCount: number, multiplier: number): number {
  const m = Math.max(1, Math.min(4, multiplier || 1));
  if (matchCount === 5) return 25000; // Official NLCB rule: Jackpot has NO multiplier
  if (matchCount === 4) return 50 * m; // Conservative Match 4 shared pool estimate * Multiplier
  if (matchCount === 3) return 5 * m; // Official NLCB fixed Match 3 ($5 base * Multiplier)
  return 0;
}

// ============================================================================
// Strictly Causal Feature Precomputation (Zero Lookahead Leakage)
// ============================================================================
interface CausalFeatureFrame {
  recencyZ: Float64Array;   // length 21 (indices 1..20)
  overdueZ: Float64Array;   // length 21
  markovZ: Float64Array;    // length 21
  cooccurZ: Float64Array;   // length 21
  rawRecent20: Int16Array;  // length 21
  rawSkip: Int16Array;      // length 21
  rawFollowLast: Int16Array; // length 21
}

function zNormalize20(raw: Float64Array): Float64Array {
  let sum = 0;
  for (let b = 1; b <= 20; b++) sum += raw[b];
  const mean = sum / 20;
  let varSum = 0;
  for (let b = 1; b <= 20; b++) {
    const d = raw[b] - mean;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / 20);
  const out = new Float64Array(21);
  if (std < 1e-9) return out;
  for (let b = 1; b <= 20; b++) {
    out[b] = (raw[b] - mean) / std;
  }
  return out;
}

/**
 * Builds causal feature frames for every target index t in [0 .. N].
 * Frame[t] uses ONLY draws[0 .. t-1] — guaranteed zero leakage from t or future draws.
 */
function precomputeCausalFeatures(draws: CashPotHistoricalRow[]): CausalFeatureFrame[] {
  const N = draws.length;
  const frames: CausalFeatureFrame[] = new Array(N + 1);

  const lastSeen = new Int32Array(21).fill(-1);
  const markov: Int32Array[] = Array.from({ length: 21 }, () => new Int32Array(21));
  const cooccur: Int32Array[] = Array.from({ length: 21 }, () => new Int32Array(21));
  const recent20 = new Int16Array(21);

  for (let t = 0; t <= N; t++) {
    const rawRec = new Float64Array(21);
    const rawOvd = new Float64Array(21);
    const rawMkv = new Float64Array(21);
    const rawCoo = new Float64Array(21);
    const rawSkip = new Int16Array(21);
    const rawFollowLast = new Int16Array(21);
    const rawRecentCopy = new Int16Array(21);

    const lastNums = t > 0 ? draws[t - 1].numbers : [];

    for (let b = 1; b <= 20; b++) {
      const skip = lastSeen[b] === -1 ? Math.min(t, 20) : t - 1 - lastSeen[b];
      rawSkip[b] = skip;
      rawRecentCopy[b] = recent20[b];
      rawRec[b] = recent20[b];
      rawOvd[b] = Math.min(skip, 16);

      let mkvSum = 0;
      let cooSum = 0;
      for (let k = 0; k < lastNums.length; k++) {
        const prevBall = lastNums[k];
        mkvSum += markov[prevBall][b];
        cooSum += cooccur[prevBall][b];
      }
      rawFollowLast[b] = mkvSum;
      rawMkv[b] = mkvSum;
      rawCoo[b] = cooSum;
    }

    frames[t] = {
      recencyZ: zNormalize20(rawRec),
      overdueZ: zNormalize20(rawOvd),
      markovZ: zNormalize20(rawMkv),
      cooccurZ: zNormalize20(rawCoo),
      rawRecent20: rawRecentCopy,
      rawSkip,
      rawFollowLast
    };

    // Update running historical state AFTER recording frame[t] (strictly causal!)
    if (t < N) {
      const cur = draws[t].numbers;
      for (let i = 0; i < cur.length; i++) {
        const a = cur[i];
        lastSeen[a] = t;
        recent20[a]++;
        for (let j = i + 1; j < cur.length; j++) {
          const b = cur[j];
          cooccur[a][b]++;
          cooccur[b][a]++;
        }
      }
      if (t >= 20) {
        const expired = draws[t - 20].numbers;
        for (let i = 0; i < expired.length; i++) {
          recent20[expired[i]]--;
        }
      }
      if (t > 0) {
        const prev = draws[t - 1].numbers;
        for (let i = 0; i < prev.length; i++) {
          for (let j = 0; j < cur.length; j++) {
            markov[prev[i]][cur[j]]++;
          }
        }
      }
    }
  }

  return frames;
}

// ============================================================================
// Parametric Weighted Stochastic Portfolio Generator
// ============================================================================
function computeBallLogitsAndProbs(
  frame: CausalFeatureFrame,
  genome: CashPotRngGenome
): { logits: Float64Array; probs: Float64Array } {
  const logits = new Float64Array(21);
  const probs = new Float64Array(21);
  const invTemp = 1 / Math.max(0.25, genome.temperature);

  let maxVal = -Infinity;
  for (let b = 1; b <= 20; b++) {
    const raw =
      genome.wRecency * frame.recencyZ[b] +
      genome.wOverdue * frame.overdueZ[b] +
      genome.wMarkov * frame.markovZ[b] +
      genome.wCooccur * frame.cooccurZ[b];
    const scaled = raw * invTemp;
    logits[b] = scaled;
    if (scaled > maxVal) maxVal = scaled;
  }

  let expSum = 0;
  for (let b = 1; b <= 20; b++) {
    const e = Math.exp(logits[b] - maxVal);
    probs[b] = e;
    expSum += e;
  }
  for (let b = 1; b <= 20; b++) {
    probs[b] = expSum > 0 ? probs[b] / expSum : 0.05;
  }
  return { logits, probs };
}

function passesSumParityGuard(nums: number[]): boolean {
  let sum = 0;
  let odds = 0;
  let lows = 0;
  for (let i = 0; i < 5; i++) {
    const n = nums[i];
    sum += n;
    if (n % 2 === 1) odds++;
    if (n <= 10) lows++;
  }
  // Core Cash Pot Gaussian envelope: sum [38..67], avoid 5-0 or 0-5 extreme splits
  return sum >= 38 && sum <= 67 && odds >= 1 && odds <= 4 && lows >= 1 && lows <= 4;
}

/**
 * Weighted sampling without replacement via Gumbel-Top-5 trick.
 * Exact distribution proportional to exp(adjustedLogits[b]).
 */
function sampleWeightedFiveBalls(
  baseLogits: Float64Array,
  usage: Int16Array,
  antiCrowdingPenalty: number,
  rng: () => number
): number[] {
  const keys = new Float64Array(21);
  for (let b = 1; b <= 20; b++) {
    const u = Math.max(1e-12, Math.min(1 - 1e-12, rng()));
    const gumbel = -Math.log(-Math.log(u));
    keys[b] = baseLogits[b] - usage[b] * antiCrowdingPenalty + gumbel;
  }

  // Pick top 5 balls by perturbed Gumbel key (simple O(20*5) selection — very fast)
  const chosen: number[] = [];
  const picked = new Uint8Array(21);
  for (let k = 0; k < 5; k++) {
    let bestB = 1;
    let bestKey = -Infinity;
    for (let b = 1; b <= 20; b++) {
      if (!picked[b] && keys[b] > bestKey) {
        bestKey = keys[b];
        bestB = b;
      }
    }
    picked[bestB] = 1;
    chosen.push(bestB);
  }
  chosen.sort((a, b) => a - b);
  return chosen;
}

export function generatePortfolioForFrame(
  frame: CausalFeatureFrame,
  genome: CashPotRngGenome,
  slipCount: number,
  drawSeed: number,
  antiCrowding: boolean
): { slips: number[][]; probs: Float64Array } {
  const { logits, probs } = computeBallLogitsAndProbs(frame, genome);
  const rng = createMulberry32(drawSeed);
  const usage = new Int16Array(21);
  const usedKeys = new Set<string>();
  const slips: number[][] = [];

  // Scale anti-crowding penalty based on portfolio size (keeps all 20 balls active for 7-10 slips)
  const penalty = antiCrowding ? (slipCount >= 10 ? 0.85 : slipCount >= 7 ? 0.65 : 0.45) : 0;

  for (let s = 0; s < slipCount; s++) {
    let accepted: number[] | null = null;
    for (let attempt = 0; attempt < 14; attempt++) {
      const cand = sampleWeightedFiveBalls(logits, usage, penalty, rng);
      const key = `${cand[0]}-${cand[1]}-${cand[2]}-${cand[3]}-${cand[4]}`;
      if (usedKeys.has(key)) continue;

      if (genome.sumParityGuard > 0 && !passesSumParityGuard(cand)) {
        // Probabilistic enforcement: guard=1.0 strictly enforces, guard=0.5 enforces 50% of attempts
        if (rng() < genome.sumParityGuard && attempt < 12) continue;
      }
      accepted = cand;
      usedKeys.add(key);
      break;
    }
    if (!accepted) {
      // Fallback: pick any unique distinct 5-ball combination
      const fallback = sampleWeightedFiveBalls(logits, usage, penalty * 1.2, rng);
      accepted = fallback;
      usedKeys.add(`${fallback[0]}-${fallback[1]}-${fallback[2]}-${fallback[3]}-${fallback[4]}`);
    }
    for (let i = 0; i < 5; i++) usage[accepted[i]]++;
    slips.push(accepted);
  }

  return { slips, probs };
}

function countOverlapSorted(a: number[], bMask: Uint8Array): number {
  let c = 0;
  for (let i = 0; i < 5; i++) {
    if (bMask[a[i]]) c++;
  }
  return c;
}

// ============================================================================
// Walk-Forward Range Evaluator
// ============================================================================
function evaluateGenomeOnRange(
  draws: CashPotHistoricalRow[],
  frames: CausalFeatureFrame[],
  actualMasks: Uint8Array[],
  genome: CashPotRngGenome,
  startIdx: number,
  endIdxExclusive: number,
  slipCount: number,
  baseSeed: number,
  antiCrowding: boolean,
  collectDetails: boolean
): {
  metrics: RngWindowMetrics;
  records: RngBlindDrawRecord[];
} {
  let match3PlusDraws = 0;
  let match4PlusDraws = 0;
  let match5Draws = 0;
  let totalPrizeSlips = 0;
  let totalStakeTT = 0;
  let totalPayoutTT = 0;
  let sureCallDraws = 0;
  let sureCallWins = 0;
  let sureCallNetTT = 0;

  const records: RngBlindDrawRecord[] = [];
  const stakePerDraw = slipCount * 5;
  const count = Math.max(0, endIdxExclusive - startIdx);

  for (let t = startIdx; t < endIdxExclusive; t++) {
    const draw = draws[t];
    const mask = actualMasks[t];
    const drawSeed = (baseSeed ^ Math.imul(draw.drawNumber, 2654435761)) >>> 0;
    const { slips } = generatePortfolioForFrame(frames[t], genome, slipCount, drawSeed, antiCrowding);

    let bestMatch = -1;
    let bestSlip = slips[0];
    let prizeSlipsCount = 0;
    let payoutTT = 0;

    for (let s = 0; s < slips.length; s++) {
      const m = countOverlapSorted(slips[s], mask);
      if (m > bestMatch) {
        bestMatch = m;
        bestSlip = slips[s];
      }
      if (m >= 3) {
        prizeSlipsCount++;
        payoutTT += computeCashPotPayoutTT(m, draw.multiplier);
      }
    }

    if (bestMatch >= 3) match3PlusDraws++;
    if (bestMatch >= 4) match4PlusDraws++;
    if (bestMatch === 5) match5Draws++;
    totalPrizeSlips += prizeSlipsCount;
    totalStakeTT += stakePerDraw;
    totalPayoutTT += payoutTT;

    const isSureCall = isSureCallIsoDate(draw.drawDate);
    if (isSureCall) {
      sureCallDraws++;
      if (bestMatch >= 3) sureCallWins++;
      sureCallNetTT += payoutTT - stakePerDraw;
    }

    if (collectDetails) {
      records.push({
        drawNumber: draw.drawNumber,
        drawDate: draw.drawDate,
        isSureCallDay: isSureCall,
        actualNumbers: draw.numbers,
        multiplier: draw.multiplier,
        bestSlip,
        bestMatch,
        prizeSlipsCount,
        payoutTT,
        stakeTT: stakePerDraw,
        netTT: payoutTT - stakePerDraw,
        cumTunedHits: match3PlusDraws,
        cumRandomExpectedHits: 0
      });
    }
  }

  const netProfitTT = totalPayoutTT - totalStakeTT;
  const metrics: RngWindowMetrics = {
    drawsTested: count,
    match3PlusDraws,
    match3PlusRatePct: count > 0 ? round2((match3PlusDraws / count) * 100) : 0,
    match4PlusDraws,
    match4PlusRatePct: count > 0 ? round2((match4PlusDraws / count) * 100) : 0,
    match5Draws,
    totalPrizeSlips,
    totalStakeTT,
    totalPayoutTT,
    netProfitTT,
    roiPct: totalStakeTT > 0 ? round2((netProfitTT / totalStakeTT) * 100) : 0,
    sureCallDraws,
    sureCallWinRatePct: sureCallDraws > 0 ? round2((sureCallWins / sureCallDraws) * 100) : 0,
    sureCallNetTT
  };

  return { metrics, records };
}

function scoreFitness(metrics: RngWindowMetrics, objective: RngObjectiveKey): number {
  if (objective === "high_tier") {
    return (
      metrics.match3PlusDraws * 1.0 +
      metrics.match4PlusDraws * 12.0 +
      metrics.match5Draws * 100.0 +
      metrics.totalPrizeSlips * 0.25
    );
  }
  if (objective === "multiplier_roi") {
    return metrics.netProfitTT + metrics.match4PlusDraws * 40;
  }
  // Default: maximize Match 3+ capture rate with slight tie-break on Match 4+ & total prize slips
  return metrics.match3PlusDraws * 10 + metrics.match4PlusDraws * 4 + metrics.totalPrizeSlips * 0.5;
}

// ============================================================================
// Pure Uniform Random Monte Carlo Benchmark (Exact Distribution on Test Window)
// ============================================================================
function runPureRandomBenchmark(
  draws: CashPotHistoricalRow[],
  actualMasks: Uint8Array[],
  startIdx: number,
  endIdxExclusive: number,
  slipCount: number,
  baseSeed: number,
  trials: number = 120
): {
  expectedMatch3RatePct: number;
  stdMatch3RatePct: number;
  expectedMatch4Draws: number;
  expectedNetProfitTT: number;
  perStepExpectedCumHits: number[];
} {
  const count = Math.max(1, endIdxExclusive - startIdx);
  const stakePerDraw = slipCount * 5;
  const trialRates: number[] = [];
  let sumMatch4 = 0;
  let sumNet = 0;
  const stepHitTotals = new Float64Array(count);

  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  for (let tr = 0; tr < trials; tr++) {
    const rng = createMulberry32((baseSeed ^ Math.imul(tr + 17, 1597334677)) >>> 0);
    let m3Draws = 0;
    let m4Draws = 0;
    let payoutSum = 0;

    for (let step = 0; step < count; step++) {
      const t = startIdx + step;
      const mask = actualMasks[t];
      const mult = draws[t].multiplier;
      let bestM = 0;
      const seenSlips = new Set<string>();

      for (let s = 0; s < slipCount; s++) {
        // Fisher-Yates partial shuffle for 5 uniform random distinct balls from 1..20
        let key = "";
        let picked5: number[] = [];
        for (let attempt = 0; attempt < 6; attempt++) {
          for (let k = 0; k < 5; k++) {
            const j = k + Math.floor(rng() * (20 - k));
            const tmp = pool[k];
            pool[k] = pool[j];
            pool[j] = tmp;
          }
          picked5 = [pool[0], pool[1], pool[2], pool[3], pool[4]].sort((a, b) => a - b);
          key = `${picked5[0]}-${picked5[1]}-${picked5[2]}-${picked5[3]}-${picked5[4]}`;
          if (!seenSlips.has(key)) {
            seenSlips.add(key);
            break;
          }
        }
        const ov = countOverlapSorted(picked5, mask);
        if (ov > bestM) bestM = ov;
        if (ov >= 3) payoutSum += computeCashPotPayoutTT(ov, mult);
      }

      if (bestM >= 3) {
        m3Draws++;
        stepHitTotals[step] += 1;
      }
      if (bestM >= 4) m4Draws++;
    }

    trialRates.push((m3Draws / count) * 100);
    sumMatch4 += m4Draws;
    sumNet += payoutSum - count * stakePerDraw;
  }

  const meanRate = trialRates.reduce((a, b) => a + b, 0) / trials;
  const variance = trialRates.reduce((acc, r) => acc + (r - meanRate) * (r - meanRate), 0) / trials;
  const stdRate = Math.sqrt(variance);

  const perStepExpectedCumHits: number[] = [];
  let running = 0;
  for (let step = 0; step < count; step++) {
    running += stepHitTotals[step] / trials;
    perStepExpectedCumHits.push(round2(running));
  }

  return {
    expectedMatch3RatePct: round2(meanRate),
    stdMatch3RatePct: round2(stdRate),
    expectedMatch4Draws: round2(sumMatch4 / trials),
    expectedNetProfitTT: round2(sumNet / trials),
    perStepExpectedCumHits
  };
}

// ============================================================================
// Evolutionary Optimizer (Strictly On Calibration Window — Zero Test Leakage!)
// ============================================================================
function optimizeGenomeOnCalibration(
  draws: CashPotHistoricalRow[],
  frames: CausalFeatureFrame[],
  actualMasks: Uint8Array[],
  trainStart: number,
  trainEnd: number,
  slipCount: number,
  objective: RngObjectiveKey,
  baseSeed: number,
  antiCrowding: boolean
): { bestGenome: CashPotRngGenome; evaluations: number } {
  const rng = createMulberry32((baseSeed ^ 0x9e3779b9) >>> 0);
  const candidates: Array<{ genome: CashPotRngGenome; score: number }> = [];
  let evaluations = 0;

  // Seed with interpretable anchors + 48 diverse random genomes
  const anchors: CashPotRngGenome[] = [
    PURE_RANDOM_GENOME,
    DEFAULT_TUNED_SEED_GENOME,
    { wRecency: 1.4, wOverdue: 0.4, wMarkov: 1.2, wCooccur: 0.8, temperature: 0.9, sumParityGuard: 0.85 },
    { wRecency: 0.4, wOverdue: 1.8, wMarkov: 0.7, wCooccur: 0.6, temperature: 1.0, sumParityGuard: 0.75 },
    { wRecency: 1.0, wOverdue: 1.0, wMarkov: 1.0, wCooccur: 1.0, temperature: 1.4, sumParityGuard: 0.9 },
    { wRecency: 0.6, wOverdue: 0.5, wMarkov: 1.8, wCooccur: 1.4, temperature: 0.75, sumParityGuard: 0.6 }
  ];

  const evalAndPush = (g: CashPotRngGenome) => {
    const clean = sanitizeGenome(g);
    const { metrics } = evaluateGenomeOnRange(
      draws,
      frames,
      actualMasks,
      clean,
      trainStart,
      trainEnd,
      slipCount,
      baseSeed,
      antiCrowding,
      false
    );
    evaluations++;
    candidates.push({ genome: clean, score: scoreFitness(metrics, objective) });
  };

  for (const a of anchors) evalAndPush(a);

  for (let i = 0; i < 48; i++) {
    evalAndPush({
      wRecency: rng() * 2.6,
      wOverdue: rng() * 2.6,
      wMarkov: rng() * 2.6,
      wCooccur: rng() * 2.6,
      temperature: 0.35 + rng() * 2.65,
      sumParityGuard: rng()
    });
  }

  // Stage 2: Local evolutionary mutation around top 3 calibration elites
  candidates.sort((a, b) => b.score - a.score);
  const elites = candidates.slice(0, 3);
  let best = elites[0];

  const keys: Array<keyof CashPotRngGenome> = [
    "wRecency",
    "wOverdue",
    "wMarkov",
    "wCooccur",
    "temperature",
    "sumParityGuard"
  ];

  for (let iter = 0; iter < 26; iter++) {
    const parent = elites[iter % elites.length].genome;
    const child: CashPotRngGenome = { ...parent };
    // Mutate 1 or 2 knobs with decaying step size
    const stepScale = iter < 14 ? 0.45 : 0.2;
    const numMut = rng() < 0.5 ? 1 : 2;
    for (let m = 0; m < numMut; m++) {
      const k = keys[Math.floor(rng() * keys.length)];
      const delta = (rng() * 2 - 1) * (k === "sumParityGuard" ? stepScale * 0.6 : stepScale * 1.4);
      child[k] = child[k] + delta;
    }
    const clean = sanitizeGenome(child);
    const { metrics } = evaluateGenomeOnRange(
      draws,
      frames,
      actualMasks,
      clean,
      trainStart,
      trainEnd,
      slipCount,
      baseSeed,
      antiCrowding,
      false
    );
    evaluations++;
    const sc = scoreFitness(metrics, objective);
    if (sc > best.score) {
      best = { genome: clean, score: sc };
      elites[0] = best;
    }
  }

  return { bestGenome: best.genome, evaluations };
}

// ============================================================================
// Main Public Runner
// ============================================================================
export function runCashPotRngLab(
  drawsChronological: CashPotHistoricalRow[],
  req: CashPotRngLabRequest = {}
): CashPotRngLabOutput {
  const t0 = Date.now();
  const draws = [...drawsChronological].sort((a, b) => a.drawNumber - b.drawNumber);
  const N = draws.length;
  if (N < 50) {
    throw new Error(`Cash Pot RNG Lab requires at least 50 historical draws (found ${N}).`);
  }

  const slipCount: 5 | 7 | 10 = req.slipCount === 5 || req.slipCount === 10 ? req.slipCount : 7;
  const requestedWindow: 40 | 60 | 80 = req.testWindow === 40 || req.testWindow === 80 ? req.testWindow : 60;
  const testWindow = Math.min(requestedWindow, Math.max(20, Math.floor(N * 0.45))) as 40 | 60 | 80;
  const objective: RngObjectiveKey =
    req.objective === "high_tier" || req.objective === "multiplier_roi" ? req.objective : "match3_rate";
  const antiCrowding = req.antiCrowding !== false;
  const latestDraw = draws[N - 1];
  const nextTargetDrawNumber = latestDraw.drawNumber + 1;
  const seed = Number.isFinite(Number(req.seed)) ? Math.floor(Math.abs(Number(req.seed))) % 999999 : nextTargetDrawNumber;
  const autoTune = Boolean(req.autoTune);

  // Build strict causal features [0 .. N] + bitmasks for O(1) match checking
  const frames = precomputeCausalFeatures(draws);
  const actualMasks: Uint8Array[] = draws.map((d) => {
    const mask = new Uint8Array(21);
    for (const n of d.numbers) if (n >= 1 && n <= 20) mask[n] = 1;
    return mask;
  });

  const warmup = Math.min(30, Math.max(15, Math.floor(N * 0.15)));
  const testStart = N - testWindow;
  const trainStart = warmup;
  const trainEnd = testStart;

  let activeGenome = sanitizeGenome(req.genome);
  let optimizerEvaluations = 0;

  if (autoTune && trainEnd - trainStart >= 15) {
    const opt = optimizeGenomeOnCalibration(
      draws,
      frames,
      actualMasks,
      trainStart,
      trainEnd,
      slipCount,
      objective,
      seed,
      antiCrowding
    );
    activeGenome = opt.bestGenome;
    optimizerEvaluations = opt.evaluations;
  }

  // Evaluate both Calibration (In-Sample) and Blind Out-of-Sample Test Window
  const calibEval = evaluateGenomeOnRange(
    draws,
    frames,
    actualMasks,
    activeGenome,
    trainStart,
    trainEnd,
    slipCount,
    seed,
    antiCrowding,
    false
  );

  const blindEval = evaluateGenomeOnRange(
    draws,
    frames,
    actualMasks,
    activeGenome,
    testStart,
    N,
    slipCount,
    seed,
    antiCrowding,
    true
  );

  // Pure Uniform Random Monte Carlo Benchmark on the identical blind test window
  const randBench = runPureRandomBenchmark(draws, actualMasks, testStart, N, slipCount, seed, 120);

  // Attach expected random cumulative hits to blind audit records + chart trajectory
  const trajectory = blindEval.records.map((rec, i) => {
    const expCum = randBench.perStepExpectedCumHits[i] ?? 0;
    rec.cumRandomExpectedHits = expCum;
    return {
      step: i + 1,
      drawNumber: rec.drawNumber,
      drawDate: rec.drawDate,
      tunedCumHits: rec.cumTunedHits,
      randomExpectedCumHits: expCum
    };
  });

  const liftPctPoints = round2(blindEval.metrics.match3PlusRatePct - randBench.expectedMatch3RatePct);
  const zScoreVsRandom = round2(
    (blindEval.metrics.match3PlusRatePct - randBench.expectedMatch3RatePct) / Math.max(randBench.stdMatch3RatePct, 0.5)
  );
  const overfitGapPctPoints = round2(calibEval.metrics.match3PlusRatePct - blindEval.metrics.match3PlusRatePct);

  let verdictCode: "VERIFIED_LIFT" | "WITHIN_NOISE" | "OVERFIT_WARNING" = "WITHIN_NOISE";
  let verdictTitle = "Matches Pure Random (Within Normal Variance)";
  let verdictSummary =
    `On the ${blindEval.metrics.drawsTested} unseen blind draws, this generator won prizes on ${blindEval.metrics.match3PlusRatePct}% of draws vs ${randBench.expectedMatch3RatePct}% for a pure uniform random generator (${liftPctPoints >= 0 ? "+" : ""}${liftPctPoints} percentage points, Z = ${zScoreVsRandom}). That difference sits inside normal random fluctuation.`;

  if (zScoreVsRandom >= 1.5 && liftPctPoints > 0) {
    verdictCode = "VERIFIED_LIFT";
    verdictTitle = "Verified Out-of-Sample Lift Above Pure Random";
    verdictSummary =
      `On the ${blindEval.metrics.drawsTested} unseen blind draws, this configuration reached ${blindEval.metrics.match3PlusRatePct}% Match 3+ vs ${randBench.expectedMatch3RatePct}% for pure random (+${liftPctPoints} percentage points, Z = +${zScoreVsRandom}). Past backtests never guarantee future draws, so keep verifying live in Consensus Lock.`;
  } else if (overfitGapPctPoints >= 8.0 && liftPctPoints <= 0) {
    verdictCode = "OVERFIT_WARNING";
    verdictTitle = "Overfit Warning: Strong on Past Training, Flat on Unseen Draws";
    verdictSummary =
      `The weights scored ${calibEval.metrics.match3PlusRatePct}% on the older training draws but dropped by ${overfitGapPctPoints} percentage points to ${blindEval.metrics.match3PlusRatePct}% on the ${blindEval.metrics.drawsTested} unseen test draws (Pure Random = ${randBench.expectedMatch3RatePct}%). Try raising Temperature or lowering weights to reduce curve-fitting.`;
  }

  // Generate Live Next-Draw Portfolio using Frame[N] (all draws [0 .. N-1])
  const nextFrame = frames[N];
  const nextSeed = (seed ^ Math.imul(nextTargetDrawNumber, 2654435761)) >>> 0;
  const { slips: nextSlipsRaw, probs: nextProbs } = generatePortfolioForFrame(
    nextFrame,
    activeGenome,
    slipCount,
    nextSeed,
    antiCrowding
  );

  const ballProbabilities: RngBallProbability[] = [];
  for (let b = 1; b <= 20; b++) {
    const pPct = round2(nextProbs[b] * 100);
    ballProbabilities.push({
      ball: b,
      probabilityPct: pPct,
      uniformBaselinePct: 5.0,
      deltaPct: round2(pPct - 5.0),
      recentHits20: nextFrame.rawRecent20[b],
      drawsSkipped: nextFrame.rawSkip[b],
      followsLastCount: nextFrame.rawFollowLast[b]
    });
  }

  const nextDrawSlips: RngGeneratedSlip[] = nextSlipsRaw.map((nums, idx) => {
    const sum = nums.reduce((a, b) => a + b, 0);
    const odds = nums.filter((n) => n % 2 === 1).length;
    const lows = nums.filter((n) => n <= 10).length;
    const avgProb = nums.reduce((acc, n) => acc + nextProbs[n] * 100, 0) / 5;
    return {
      index: idx + 1,
      numbers: nums,
      sum,
      oddEvenSplit: `${odds} Odd / ${5 - odds} Even`,
      lowHighSplit: `${lows} Low / ${5 - lows} High`,
      avgBallProbPct: round2(avgProb)
    };
  });

  // Check whether tomorrow's next draw date (latest + 1 day) is a Sure Call day
  const [ly, lm, ld] = latestDraw.drawDate.split("-").map(Number);
  const nextUtc = new Date(Date.UTC(ly, lm - 1, ld + 1));
  const nextIso = `${nextUtc.getUTCFullYear()}-${String(nextUtc.getUTCMonth() + 1).padStart(2, "0")}-${String(nextUtc.getUTCDate()).padStart(2, "0")}`;

  return {
    totalDrawsAvailable: N,
    calibrationDrawsCount: Math.max(0, trainEnd - trainStart),
    blindTestDrawsCount: blindEval.metrics.drawsTested,
    latestDraw,
    nextTargetDrawNumber,
    nextIsSureCallDay: isSureCallIsoDate(nextIso),
    slipCount,
    testWindow,
    objective,
    seed,
    antiCrowding,
    wasAutoTuned: autoTune,
    optimizerEvaluations,
    computeMs: Date.now() - t0,
    genome: activeGenome,
    calibrationMetrics: calibEval.metrics,
    blindTestMetrics: blindEval.metrics,
    randomBenchmark: {
      exactSingleSlipMatch3Pct: 7.26, // 1126 / 15504
      exactSingleSlipMatch4Pct: 0.49, // 76 / 15504
      monteCarloTrials: 120,
      expectedMatch3RatePct: randBench.expectedMatch3RatePct,
      stdMatch3RatePct: randBench.stdMatch3RatePct,
      expectedMatch4Draws: randBench.expectedMatch4Draws,
      expectedNetProfitTT: randBench.expectedNetProfitTT,
      zScoreVsRandom,
      liftPctPoints
    },
    overfitDiagnostics: {
      inSampleRatePct: calibEval.metrics.match3PlusRatePct,
      outOfSampleRatePct: blindEval.metrics.match3PlusRatePct,
      overfitGapPctPoints,
      verdictCode,
      verdictTitle,
      verdictSummary
    },
    ballProbabilities,
    nextDrawSlips,
    trajectory,
    blindAuditLog: [...blindEval.records].reverse()
  };
}
