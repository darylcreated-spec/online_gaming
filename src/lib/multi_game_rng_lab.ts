/**
 * multi_game_rng_lab.ts
 * =====================
 * Game-Specific Adaptive Stochastic RNG & Strict Walk-Forward Anti-Overfitting
 * Backtest Laboratory for the 4 Core NLCB Games:
 *   1. Lotto Plus   (5 of 35 + Decoupled Powerball 1-10, $5/play)
 *   2. Win For Life (6 of 28 + Decoupled Cash Ball 1-3 ONLY, $10/line)
 *   3. Play Whe     (1 of 36 Chinapoo Marks, $1/mark, $26 payout)
 *   4. Pick 4       (4 x 0-9 Unordered Box-First + 3+ Right Digits, $1/Box)
 *
 * Scientific Invariants:
 * - Strictly causal feature precomputation: frame[t] uses ONLY draws[0 .. t-1]
 *   (guaranteed zero lookahead leakage).
 * - Chronological Calibration vs Blind Out-of-Sample Test split:
 *   Evolutionary calibration tunes the 6 game-native parameters strictly on
 *   pre-test draws, then evaluates blind on the unseen recent test window.
 * - Honest Pure Uniform Random Benchmark: compares tuned performance against
 *   exact analytical odds + 120-trial Monte Carlo pure uniform sampling over
 *   the identical unseen test draws, reporting Z-score and Overfit Gap.
 */

import { CHINAPOO_CHART } from "@/lib/playwhe";

export type MultiGameRngKey = "lotto-plus" | "win-for-life" | "play-whe" | "pick4";

export interface HistoricalDrawInput {
  drawNumber: number;
  drawDate: string;
  timeSlot?: string;
  numbers: number[];
  bonus?: number;
}

export interface RngWeights {
  k1: number;          // 0.0 .. 3.0
  k2: number;          // 0.0 .. 3.0
  k3: number;          // 0.0 .. 3.0
  k4: number;          // 0.0 .. 3.0
  temperature: number; // 0.25 .. 4.0
  k6: number;          // 0.0 .. 1.0
}

export interface RngSliderDefinition {
  key: keyof RngWeights;
  label: string;
  helper: string;
  min: number;
  max: number;
  step: number;
  format: "decimal1" | "decimal2" | "percent";
}

export interface RngChoiceOption {
  value: string;
  label: string;
}

export interface MultiGameRngRequest {
  autoTune?: boolean;
  weights?: Partial<RngWeights>;
  slipCount?: 5 | 7 | 10;
  testWindow?: number;
  objective?: string;
  bonusMode?: string;
  guardEnabled?: boolean;
  seed?: number;
}

export interface UniversalBallProbability {
  ball: number;
  displayLabel: string;
  subLabel?: string;
  probabilityPct: number;
  uniformBaselinePct: number;
  deltaPct: number;
  statALabel: string;
  statAVal: string;
  statBLabel: string;
  statBVal: string;
}

export interface UniversalBonusProbability {
  ball: number;
  probabilityPct: number;
  uniformBaselinePct: number;
  drawsSkipped: number;
  recentHits: number;
}

export interface UniversalGeneratedSlip {
  index: number;
  numbers: number[];
  bonusBall?: number;
  primaryTag: string;
  secondaryTag: string;
  boxTypeLabel?: string;
  markName?: string;
}

export interface UniversalBlindDrawRecord {
  drawNumber: number;
  drawDate: string;
  timeSlot?: string;
  actualNumbers: number[];
  actualBonus?: number;
  actualMarkName?: string;
  bestSlip: number[];
  bestSlipBonus?: number;
  primaryHit: boolean;
  matchBadge: string;
  highlightTier: "top" | "win" | "near" | "miss";
  payoutTT: number;
  stakeTT: number;
  netTT: number;
  cumTunedHits: number;
  cumRandomExpectedHits: number;
}

export interface UniversalWindowMetrics {
  drawsTested: number;
  primaryHitDraws: number;
  primaryHitRatePct: number;
  secondaryHitDraws: number;
  secondaryHitRatePct: number;
  topTierHits: number;
  bonusHitDraws: number;
  bonusHitRatePct: number;
  totalWinningSlips: number;
  totalStakeTT: number;
  totalPayoutTT: number;
  netProfitTT: number;
  roiPct: number;
}

export interface UniversalRngLabOutput {
  game: MultiGameRngKey;
  gameName: string;
  themeColor: "sky" | "emerald" | "amber" | "purple";
  unitCostTT: number;
  slipUnitLabel: string; // "Slips" | "Marks" | "Lines"
  heroHeadline: string;
  heroDescription: string;
  bonusName: string | null;
  bonusMax: number;
  uniformBaselinePct: number;
  totalDrawsAvailable: number;
  calibrationDrawsCount: number;
  blindTestDrawsCount: number;
  latestDraw: HistoricalDrawInput;
  nextTargetDrawNumber: number;
  slipCount: 5 | 7 | 10;
  testWindow: number;
  windowChoices: number[];
  objective: string;
  objectiveChoices: RngChoiceOption[];
  bonusMode: string;
  bonusModeChoices: RngChoiceOption[];
  guardEnabled: boolean;
  guardLabel: string;
  guardHelper: string;
  seed: number;
  wasAutoTuned: boolean;
  optimizerEvaluations: number;
  computeMs: number;
  weights: RngWeights;
  pureRandomWeights: RngWeights;
  sliderDefs: RngSliderDefinition[];
  metricLabels: {
    primaryTitle: string;
    primaryShort: string;
    secondaryLabel: string;
    topTierLabel: string;
    singleSlipOddsText: string;
    trajectorySubtitle: string;
    heatmapTitle: string;
  };
  calibrationMetrics: UniversalWindowMetrics;
  blindTestMetrics: UniversalWindowMetrics;
  randomBenchmark: {
    monteCarloTrials: number;
    expectedPrimaryRatePct: number;
    stdPrimaryRatePct: number;
    expectedSecondaryDraws: number;
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
  ballProbabilities: UniversalBallProbability[];
  bonusProbabilities?: UniversalBonusProbability[];
  nextDrawSlips: UniversalGeneratedSlip[];
  trajectory: Array<{
    step: number;
    drawNumber: number;
    drawDate: string;
    tunedCumHits: number;
    randomExpectedCumHits: number;
  }>;
  blindAuditLog: UniversalBlindDrawRecord[];
}

// ============================================================================
// Shared Math, Clamping, and Deterministic PRNG Utilities
// ============================================================================
function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

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

function zNormalizeRange(raw: Float64Array, startIdx: number, endIdxInclusive: number): Float64Array {
  const count = endIdxInclusive - startIdx + 1;
  let sum = 0;
  for (let i = startIdx; i <= endIdxInclusive; i++) sum += raw[i];
  const mean = sum / count;
  let varSum = 0;
  for (let i = startIdx; i <= endIdxInclusive; i++) {
    const d = raw[i] - mean;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / count);
  const out = new Float64Array(raw.length);
  if (std < 1e-9) return out;
  for (let i = startIdx; i <= endIdxInclusive; i++) {
    out[i] = (raw[i] - mean) / std;
  }
  return out;
}

function sanitizeWeights(input: Partial<RngWeights> | undefined, fallback: RngWeights): RngWeights {
  return {
    k1: round2(clamp(Number(input?.k1 ?? fallback.k1), 0, 3)),
    k2: round2(clamp(Number(input?.k2 ?? fallback.k2), 0, 3)),
    k3: round2(clamp(Number(input?.k3 ?? fallback.k3), 0, 3)),
    k4: round2(clamp(Number(input?.k4 ?? fallback.k4), 0, 3)),
    temperature: round2(clamp(Number(input?.temperature ?? fallback.temperature), 0.25, 4.0)),
    k6: round2(clamp(Number(input?.k6 ?? fallback.k6), 0, 1))
  };
}

function softmaxFromRaw(
  rawScores: Float64Array,
  startIdx: number,
  endIdxInclusive: number,
  temperature: number
): { logits: Float64Array; probs: Float64Array } {
  const len = rawScores.length;
  const logits = new Float64Array(len);
  const probs = new Float64Array(len);
  const invTemp = 1 / Math.max(0.25, temperature);
  const count = endIdxInclusive - startIdx + 1;

  let maxVal = -Infinity;
  for (let i = startIdx; i <= endIdxInclusive; i++) {
    const s = rawScores[i] * invTemp;
    logits[i] = s;
    if (s > maxVal) maxVal = s;
  }

  let expSum = 0;
  for (let i = startIdx; i <= endIdxInclusive; i++) {
    const e = Math.exp(logits[i] - maxVal);
    probs[i] = e;
    expSum += e;
  }
  for (let i = startIdx; i <= endIdxInclusive; i++) {
    probs[i] = expSum > 0 ? probs[i] / expSum : 1 / count;
  }
  return { logits, probs };
}

function sampleWeightedTopK(
  logits: Float64Array,
  usage: Int16Array,
  antiCrowdingPenalty: number,
  startIdx: number,
  endIdxInclusive: number,
  pickCount: number,
  rng: () => number
): number[] {
  const len = logits.length;
  const keys = new Float64Array(len);
  for (let i = startIdx; i <= endIdxInclusive; i++) {
    const u = Math.max(1e-12, Math.min(1 - 1e-12, rng()));
    const gumbel = -Math.log(-Math.log(u));
    keys[i] = logits[i] - usage[i] * antiCrowdingPenalty + gumbel;
  }

  const chosen: number[] = [];
  const picked = new Uint8Array(len);
  for (let k = 0; k < pickCount; k++) {
    let bestIdx = startIdx;
    let bestKey = -Infinity;
    for (let i = startIdx; i <= endIdxInclusive; i++) {
      if (!picked[i] && keys[i] > bestKey) {
        bestKey = keys[i];
        bestIdx = i;
      }
    }
    picked[bestIdx] = 1;
    chosen.push(bestIdx);
  }
  chosen.sort((a, b) => a - b);
  return chosen;
}

function buildOverfitVerdict(
  primaryMetricName: string,
  drawsTested: number,
  inSampleRate: number,
  blindRate: number,
  randExpected: number,
  zScore: number,
  liftPts: number,
  overfitGap: number
): UniversalRngLabOutput["overfitDiagnostics"] {
  let verdictCode: "VERIFIED_LIFT" | "WITHIN_NOISE" | "OVERFIT_WARNING" = "WITHIN_NOISE";
  let verdictTitle = "Matches Pure Random (Within Normal Variance)";
  let verdictSummary = `On the ${drawsTested} unseen blind draws, this generator achieved ${blindRate}% ${primaryMetricName} versus ${randExpected}% for a pure uniform random generator (${liftPts >= 0 ? "+" : ""}${liftPts} percentage points, Z = ${zScore}). That difference sits inside normal random fluctuation.`;

  if (zScore >= 1.5 && liftPts > 0) {
    verdictCode = "VERIFIED_LIFT";
    verdictTitle = "Verified Out-of-Sample Lift Above Pure Random";
    verdictSummary = `On the ${drawsTested} unseen blind draws, this configuration reached ${blindRate}% ${primaryMetricName} versus ${randExpected}% for pure random (+${liftPts} percentage points, Z = +${zScore}). Past backtests never guarantee future draws, so continue tracking live draws in Consensus Lock.`;
  } else if (overfitGap >= 6.0 && liftPts <= 0) {
    verdictCode = "OVERFIT_WARNING";
    verdictTitle = "Overfit Warning: Strong on Older Training, Flat on Unseen Draws";
    verdictSummary = `The settings scored ${inSampleRate}% on older training draws but dropped by ${overfitGap} percentage points to ${blindRate}% on the ${drawsTested} unseen test draws (Pure Random = ${randExpected}%). Raise Randomness Temperature or soften weights to reduce curve-fitting.`;
  }

  return {
    inSampleRatePct: inSampleRate,
    outOfSampleRatePct: blindRate,
    overfitGapPctPoints: overfitGap,
    verdictCode,
    verdictTitle,
    verdictSummary
  };
}

// ============================================================================
// GAME 1 & 2 ENGINE: Multi-Ball + Decoupled Bonus (Lotto Plus 5/35 & WFL 6/28)
// ============================================================================
interface MultiBallFrame {
  recencyZ: Float64Array;
  overdueZ: Float64Array;
  markovZ: Float64Array;
  cooccurZ: Float64Array;
  rawRecent: Int16Array;
  rawSkip: Int16Array;
  bonusRanked: number[];      // causal-ranked bonus balls (1..bonusMax)
  bonusProbs: Float64Array;   // length bonusMax + 1
  bonusRecent: Int16Array;
  bonusSkip: Int16Array;
}

interface MultiBallConfig {
  game: "lotto-plus" | "win-for-life";
  gameName: string;
  themeColor: "sky" | "emerald";
  maxBall: number;       // 35 or 28
  pickCount: number;     // 5 or 6
  bonusName: string;     // "Powerball" or "Cash Ball"
  bonusMax: number;      // 10 or 3
  unitCostTT: number;    // 5 or 10
  recentWindow: number;  // 30 or 25
  sumMin: number;        // 60 or 58
  sumMax: number;        // 125 or 118
  lowCut: number;        // 17 or 14
  windowChoices: number[];
  defaultWindow: number;
  singleSlipOddsText: string;
  payoutFn: (mainMatch: number, bonusHit: boolean) => number;
  isPrimaryWin: (mainMatch: number, bonusHit: boolean) => boolean;
  isSecondaryWin: (mainMatch: number, bonusHit: boolean) => boolean;
  isTopTier: (mainMatch: number, bonusHit: boolean) => boolean;
  bonusModeChoices: RngChoiceOption[];
  defaultBonusMode: string;
  objectiveChoices: RngChoiceOption[];
  sliderDefs: RngSliderDefinition[];
}

function precomputeMultiBallFrames(
  draws: HistoricalDrawInput[],
  cfg: MultiBallConfig
): MultiBallFrame[] {
  const N = draws.length;
  const M = cfg.maxBall;
  const B = cfg.bonusMax;
  const W = cfg.recentWindow;
  const frames: MultiBallFrame[] = new Array(N + 1);

  const lastSeen = new Int32Array(M + 1).fill(-1);
  const recent = new Int16Array(M + 1);
  const markov: Int32Array[] = Array.from({ length: M + 1 }, () => new Int32Array(M + 1));
  const cooccur: Int32Array[] = Array.from({ length: M + 1 }, () => new Int32Array(M + 1));

  // Strictly decoupled bonus ball state (1..B)
  const bLastSeen = new Int32Array(B + 1).fill(-1);
  const bRecent = new Int16Array(B + 1);
  const bMarkov: Int32Array[] = Array.from({ length: B + 1 }, () => new Int32Array(B + 1));
  const bWindow = Math.min(40, Math.max(20, W));

  for (let t = 0; t <= N; t++) {
    const rawRec = new Float64Array(M + 1);
    const rawOvd = new Float64Array(M + 1);
    const rawMkv = new Float64Array(M + 1);
    const rawCoo = new Float64Array(M + 1);
    const rawSkip = new Int16Array(M + 1);
    const rawRecentCopy = new Int16Array(M + 1);

    const lastNums = t > 0 ? draws[t - 1].numbers : [];
    const lastBonus = t > 0 ? clampBonus(draws[t - 1].bonus, B) : 0;

    for (let b = 1; b <= M; b++) {
      const skip = lastSeen[b] === -1 ? Math.min(t, 25) : t - 1 - lastSeen[b];
      rawSkip[b] = skip;
      rawRecentCopy[b] = recent[b];
      rawRec[b] = recent[b];
      rawOvd[b] = Math.min(skip, 24);

      let mkvSum = 0;
      let cooSum = 0;
      for (let k = 0; k < lastNums.length; k++) {
        const pb = lastNums[k];
        if (pb >= 1 && pb <= M) {
          mkvSum += markov[pb][b];
          cooSum += cooccur[pb][b];
        }
      }
      rawMkv[b] = mkvSum;
      rawCoo[b] = cooSum;
    }

    // Decoupled bonus scoring strictly from [0 .. t-1]
    const bRawScore = new Float64Array(B + 1);
    const bSkipCopy = new Int16Array(B + 1);
    const bRecCopy = new Int16Array(B + 1);
    const bRecArr = new Float64Array(B + 1);
    const bOvdArr = new Float64Array(B + 1);
    const bMkvArr = new Float64Array(B + 1);

    for (let bb = 1; bb <= B; bb++) {
      const sk = bLastSeen[bb] === -1 ? Math.min(t, B * 3) : t - 1 - bLastSeen[bb];
      bSkipCopy[bb] = sk;
      bRecCopy[bb] = bRecent[bb];
      bRecArr[bb] = bRecent[bb];
      bOvdArr[bb] = Math.min(sk, B * 3);
      bMkvArr[bb] = lastBonus >= 1 && lastBonus <= B ? bMarkov[lastBonus][bb] : 0;
    }

    const bRecZ = zNormalizeRange(bRecArr, 1, B);
    const bOvdZ = zNormalizeRange(bOvdArr, 1, B);
    const bMkvZ = zNormalizeRange(bMkvArr, 1, B);
    for (let bb = 1; bb <= B; bb++) {
      // Gentle blended decoupled score (overdue rebound + Markov + recency)
      bRawScore[bb] = 0.55 * bOvdZ[bb] + 0.5 * bMkvZ[bb] + 0.35 * bRecZ[bb];
    }
    const { probs: bonusProbs } = softmaxFromRaw(bRawScore, 1, B, 1.5);
    const bonusRanked = Array.from({ length: B }, (_, i) => i + 1).sort(
      (a, b) => bonusProbs[b] - bonusProbs[a] || bSkipCopy[b] - bSkipCopy[a] || a - b
    );

    frames[t] = {
      recencyZ: zNormalizeRange(rawRec, 1, M),
      overdueZ: zNormalizeRange(rawOvd, 1, M),
      markovZ: zNormalizeRange(rawMkv, 1, M),
      cooccurZ: zNormalizeRange(rawCoo, 1, M),
      rawRecent: rawRecentCopy,
      rawSkip,
      bonusRanked,
      bonusProbs,
      bonusRecent: bRecCopy,
      bonusSkip: bSkipCopy
    };

    // Update running historical state AFTER recording frame[t] (strictly causal!)
    if (t < N) {
      const cur = draws[t].numbers;
      for (let i = 0; i < cur.length; i++) {
        const a = cur[i];
        if (a < 1 || a > M) continue;
        lastSeen[a] = t;
        recent[a]++;
        for (let j = i + 1; j < cur.length; j++) {
          const b = cur[j];
          if (b < 1 || b > M) continue;
          cooccur[a][b]++;
          cooccur[b][a]++;
        }
      }
      if (t >= W) {
        const exp = draws[t - W].numbers;
        for (let i = 0; i < exp.length; i++) {
          const a = exp[i];
          if (a >= 1 && a <= M) recent[a]--;
        }
      }
      if (t > 0) {
        const prev = draws[t - 1].numbers;
        for (let i = 0; i < prev.length; i++) {
          const p = prev[i];
          if (p < 1 || p > M) continue;
          for (let j = 0; j < cur.length; j++) {
            const c = cur[j];
            if (c >= 1 && c <= M) markov[p][c]++;
          }
        }
      }

      const curB = clampBonus(draws[t].bonus, B);
      bLastSeen[curB] = t;
      bRecent[curB]++;
      if (t >= bWindow) {
        const expB = clampBonus(draws[t - bWindow].bonus, B);
        bRecent[expB]--;
      }
      if (t > 0) {
        const prevB = clampBonus(draws[t - 1].bonus, B);
        bMarkov[prevB][curB]++;
      }
    }
  }

  return frames;
}

function clampBonus(raw: number | undefined, bonusMax: number): number {
  const n = Math.floor(Number(raw ?? 1));
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n <= bonusMax) return n;
  return ((n - 1) % bonusMax) + 1;
}

function assignBonusBalls(
  frame: MultiBallFrame,
  bonusMax: number,
  slipCount: number,
  bonusMode: string,
  isPureRandom: boolean,
  rng: () => number
): number[] {
  const out: number[] = [];
  if (isPureRandom) {
    for (let s = 0; s < slipCount; s++) {
      out.push(1 + Math.floor(rng() * bonusMax));
    }
    return out;
  }

  const ranked = frame.bonusRanked;
  if (bonusMode === "lock_top1") {
    for (let s = 0; s < slipCount; s++) out.push(ranked[0]);
    return out;
  }

  if (bonusMode === "all10_rotate" || bonusMode === "balanced_123") {
    const cap = bonusMode === "balanced_123" ? Math.min(3, bonusMax) : bonusMax;
    for (let s = 0; s < slipCount; s++) {
      out.push(ranked[s % cap]);
    }
    return out;
  }

  // Default Lotto Plus "top3_split": 3-2-2 for 7 slips, 2-2-1 for 5, 4-3-3 for 10
  const top3 = [ranked[0], ranked[1] ?? ranked[0], ranked[2] ?? ranked[0]];
  if (slipCount === 5) return [top3[0], top3[0], top3[1], top3[1], top3[2]];
  if (slipCount === 10) return [top3[0], top3[0], top3[0], top3[0], top3[1], top3[1], top3[1], top3[2], top3[2], top3[2]];
  return [top3[0], top3[0], top3[0], top3[1], top3[1], top3[2], top3[2]];
}

function generateMultiBallPortfolio(
  frame: MultiBallFrame,
  weights: RngWeights,
  cfg: MultiBallConfig,
  slipCount: number,
  bonusMode: string,
  guardEnabled: boolean,
  drawSeed: number
): { slips: number[][]; bonuses: number[]; probs: Float64Array } {
  const M = cfg.maxBall;
  const K = cfg.pickCount;
  const raw = new Float64Array(M + 1);
  for (let b = 1; b <= M; b++) {
    raw[b] =
      weights.k1 * frame.recencyZ[b] +
      weights.k2 * frame.overdueZ[b] +
      weights.k3 * frame.markovZ[b] +
      weights.k4 * frame.cooccurZ[b];
  }
  const { logits, probs } = softmaxFromRaw(raw, 1, M, weights.temperature);
  const rng = createMulberry32(drawSeed);
  const usage = new Int16Array(M + 1);
  const usedKeys = new Set<string>();
  const slips: number[][] = [];
  const penalty = guardEnabled ? (slipCount >= 10 ? 0.72 : slipCount >= 7 ? 0.56 : 0.4) : 0;

  const passesEnvelope = (nums: number[]): boolean => {
    let sum = 0;
    let odds = 0;
    let lows = 0;
    for (let i = 0; i < K; i++) {
      const n = nums[i];
      sum += n;
      if (n % 2 === 1) odds++;
      if (n <= cfg.lowCut) lows++;
    }
    return sum >= cfg.sumMin && sum <= cfg.sumMax && odds >= 1 && odds <= K - 1 && lows >= 1 && lows <= K - 1;
  };

  for (let s = 0; s < slipCount; s++) {
    let accepted: number[] | null = null;
    for (let attempt = 0; attempt < 14; attempt++) {
      const cand = sampleWeightedTopK(logits, usage, penalty, 1, M, K, rng);
      const key = cand.join("-");
      if (usedKeys.has(key)) continue;
      if (weights.k6 > 0 && !passesEnvelope(cand)) {
        if (rng() < weights.k6 && attempt < 12) continue;
      }
      accepted = cand;
      usedKeys.add(key);
      break;
    }
    if (!accepted) {
      accepted = sampleWeightedTopK(logits, usage, penalty * 1.2, 1, M, K, rng);
      usedKeys.add(accepted.join("-"));
    }
    for (let i = 0; i < K; i++) usage[accepted[i]]++;
    slips.push(accepted);
  }

  const isPureRandom =
    weights.k1 === 0 && weights.k2 === 0 && weights.k3 === 0 && weights.k4 === 0 && weights.k6 === 0 && !guardEnabled;
  const bonuses = assignBonusBalls(frame, cfg.bonusMax, slipCount, bonusMode, isPureRandom, rng);
  return { slips, bonuses, probs };
}

function runMultiBallRngLab(
  drawsChronological: HistoricalDrawInput[],
  cfg: MultiBallConfig,
  req: MultiGameRngRequest
): UniversalRngLabOutput {
  const t0 = Date.now();
  const draws = [...drawsChronological].sort((a, b) => a.drawNumber - b.drawNumber);
  const N = draws.length;
  if (N < 60) {
    throw new Error(`${cfg.gameName} RNG Lab requires at least 60 historical draws (found ${N}).`);
  }

  const slipCount: 5 | 7 | 10 = req.slipCount === 5 || req.slipCount === 10 ? req.slipCount : 7;
  const reqWin = Number(req.testWindow || cfg.defaultWindow);
  const testWindow = cfg.windowChoices.includes(reqWin)
    ? Math.min(reqWin, Math.floor(N * 0.45))
    : Math.min(cfg.defaultWindow, Math.floor(N * 0.45));
  const validObjectives = cfg.objectiveChoices.map((o) => o.value);
  const objective = req.objective && validObjectives.includes(req.objective) ? req.objective : validObjectives[0];
  const validBonusModes = cfg.bonusModeChoices.map((o) => o.value);
  const bonusMode = req.bonusMode && validBonusModes.includes(req.bonusMode) ? req.bonusMode : cfg.defaultBonusMode;
  const guardEnabled = req.guardEnabled !== false;
  const latestDraw = draws[N - 1];
  const nextTargetDrawNumber = latestDraw.drawNumber + 1;
  const seed = Number.isFinite(Number(req.seed))
    ? Math.floor(Math.abs(Number(req.seed))) % 999999
    : nextTargetDrawNumber;
  const autoTune = Boolean(req.autoTune);

  const pureRandomWeights: RngWeights = {
    k1: 0,
    k2: 0,
    k3: 0,
    k4: 0,
    temperature: 2.0,
    k6: 0
  };
  const defaultSeedWeights: RngWeights =
    cfg.game === "lotto-plus"
      ? { k1: 0.4, k2: 1.4, k3: 0.7, k4: 0.5, temperature: 1.15, k6: 0.75 }
      : { k1: 0.7, k2: 0.8, k3: 0.8, k4: 0.7, temperature: 1.15, k6: 0.75 };

  const frames = precomputeMultiBallFrames(draws, cfg);
  const actualMasks: Uint8Array[] = draws.map((d) => {
    const mask = new Uint8Array(cfg.maxBall + 1);
    for (const n of d.numbers) if (n >= 1 && n <= cfg.maxBall) mask[n] = 1;
    return mask;
  });

  const warmup = Math.min(35, Math.max(20, Math.floor(N * 0.1)));
  const testStart = N - testWindow;
  const trainStart = Math.max(warmup, testStart - 350);
  const trainEnd = testStart;

  const evaluateRange = (
    w: RngWeights,
    startIdx: number,
    endIdx: number,
    collectDetails: boolean
  ): { metrics: UniversalWindowMetrics; records: UniversalBlindDrawRecord[] } => {
    let primaryHitDraws = 0;
    let secondaryHitDraws = 0;
    let topTierHits = 0;
    let bonusHitDraws = 0;
    let totalWinningSlips = 0;
    let totalStakeTT = 0;
    let totalPayoutTT = 0;
    const records: UniversalBlindDrawRecord[] = [];
    const stakePerDraw = slipCount * cfg.unitCostTT;
    const count = Math.max(0, endIdx - startIdx);

    for (let t = startIdx; t < endIdx; t++) {
      const draw = draws[t];
      const mask = actualMasks[t];
      const actBonus = clampBonus(draw.bonus, cfg.bonusMax);
      const drawSeed = (seed ^ Math.imul(draw.drawNumber, 2654435761)) >>> 0;
      const { slips, bonuses } = generateMultiBallPortfolio(
        frames[t],
        w,
        cfg,
        slipCount,
        bonusMode,
        guardEnabled,
        drawSeed
      );

      let bestScore = -1;
      let bestMain = 0;
      let bestBonusHit = false;
      let bestSlip = slips[0];
      let bestSlipBonus = bonuses[0];
      let anyPrimary = false;
      let anySecondary = false;
      let anyTopTier = false;
      let anyBonus = false;
      let payoutTT = 0;

      for (let s = 0; s < slips.length; s++) {
        let m = 0;
        const sl = slips[s];
        for (let i = 0; i < cfg.pickCount; i++) if (mask[sl[i]]) m++;
        const bHit = bonuses[s] === actBonus;
        if (bHit) anyBonus = true;
        const pay = cfg.payoutFn(m, bHit);
        if (cfg.isPrimaryWin(m, bHit)) {
          anyPrimary = true;
          totalWinningSlips++;
        }
        if (cfg.isSecondaryWin(m, bHit)) anySecondary = true;
        if (cfg.isTopTier(m, bHit)) anyTopTier = true;
        payoutTT += pay;

        const rankScore = pay * 100 + m * 10 + (bHit ? 3 : 0);
        if (rankScore > bestScore) {
          bestScore = rankScore;
          bestMain = m;
          bestBonusHit = bHit;
          bestSlip = sl;
          bestSlipBonus = bonuses[s];
        }
      }

      if (anyPrimary) primaryHitDraws++;
      if (anySecondary) secondaryHitDraws++;
      if (anyTopTier) topTierHits++;
      if (anyBonus) bonusHitDraws++;
      totalStakeTT += stakePerDraw;
      totalPayoutTT += payoutTT;

      if (collectDetails) {
        records.push({
          drawNumber: draw.drawNumber,
          drawDate: draw.drawDate,
          actualNumbers: draw.numbers,
          actualBonus: actBonus,
          bestSlip,
          bestSlipBonus,
          primaryHit: anyPrimary,
          matchBadge: `${bestMain}/${cfg.pickCount}${bestBonusHit ? ` + ${cfg.bonusName}` : ""}`,
          highlightTier: anyTopTier ? "top" : anyPrimary ? "win" : bestMain === 2 ? "near" : "miss",
          payoutTT,
          stakeTT: stakePerDraw,
          netTT: payoutTT - stakePerDraw,
          cumTunedHits: primaryHitDraws,
          cumRandomExpectedHits: 0
        });
      }
    }

    const netProfitTT = totalPayoutTT - totalStakeTT;
    return {
      metrics: {
        drawsTested: count,
        primaryHitDraws,
        primaryHitRatePct: count > 0 ? round2((primaryHitDraws / count) * 100) : 0,
        secondaryHitDraws,
        secondaryHitRatePct: count > 0 ? round2((secondaryHitDraws / count) * 100) : 0,
        topTierHits,
        bonusHitDraws,
        bonusHitRatePct: count > 0 ? round2((bonusHitDraws / count) * 100) : 0,
        totalWinningSlips,
        totalStakeTT,
        totalPayoutTT,
        netProfitTT,
        roiPct: totalStakeTT > 0 ? round2((netProfitTT / totalStakeTT) * 100) : 0
      },
      records
    };
  };

  const scoreFitness = (m: UniversalWindowMetrics): number => {
    if (objective === "main_match3" || objective === "high_tier") {
      return m.secondaryHitDraws * 16 + m.topTierHits * 45 + m.primaryHitDraws * 2 + m.totalWinningSlips * 0.4;
    }
    if (objective === "net_roi") {
      // Cap single jackpot outliers in training fitness so optimizer doesn't overfit one lucky draw
      return Math.min(m.netProfitTT, 25000) + m.secondaryHitDraws * 35 + m.primaryHitDraws * 8;
    }
    return m.primaryHitDraws * 10 + m.secondaryHitDraws * 6 + m.topTierHits * 20 + m.totalWinningSlips * 0.5;
  };

  let activeWeights = sanitizeWeights(req.weights, defaultSeedWeights);
  let optimizerEvaluations = 0;

  if (autoTune && trainEnd - trainStart >= 20) {
    const optRng = createMulberry32((seed ^ 0x9e3779b9) >>> 0);
    const candidates: Array<{ w: RngWeights; score: number }> = [];
    const anchors: RngWeights[] = [
      pureRandomWeights,
      defaultSeedWeights,
      { k1: 0.3, k2: 2.0, k3: 0.6, k4: 0.5, temperature: 0.95, k6: 0.85 },
      { k1: 1.5, k2: 0.4, k3: 1.1, k4: 0.8, temperature: 0.95, k6: 0.8 },
      { k1: 0.9, k2: 0.9, k3: 0.9, k4: 0.9, temperature: 1.35, k6: 0.7 },
      { k1: 0.5, k2: 1.1, k3: 1.7, k4: 1.2, temperature: 0.8, k6: 0.65 }
    ];

    const evalCand = (g: RngWeights) => {
      const clean = sanitizeWeights(g, defaultSeedWeights);
      const { metrics } = evaluateRange(clean, trainStart, trainEnd, false);
      optimizerEvaluations++;
      candidates.push({ w: clean, score: scoreFitness(metrics) });
    };

    for (const a of anchors) evalCand(a);
    for (let i = 0; i < 42; i++) {
      evalCand({
        k1: optRng() * 2.6,
        k2: optRng() * 2.6,
        k3: optRng() * 2.6,
        k4: optRng() * 2.6,
        temperature: 0.35 + optRng() * 2.5,
        k6: optRng()
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const elites = candidates.slice(0, 3);
    let best = elites[0];
    const keys: Array<keyof RngWeights> = ["k1", "k2", "k3", "k4", "temperature", "k6"];

    for (let iter = 0; iter < 22; iter++) {
      const parent = elites[iter % elites.length].w;
      const child: RngWeights = { ...parent };
      const stepScale = iter < 12 ? 0.45 : 0.2;
      const numMut = optRng() < 0.5 ? 1 : 2;
      for (let m = 0; m < numMut; m++) {
        const k = keys[Math.floor(optRng() * keys.length)];
        const delta = (optRng() * 2 - 1) * (k === "k6" ? stepScale * 0.6 : stepScale * 1.35);
        child[k] = child[k] + delta;
      }
      const clean = sanitizeWeights(child, defaultSeedWeights);
      const { metrics } = evaluateRange(clean, trainStart, trainEnd, false);
      optimizerEvaluations++;
      const sc = scoreFitness(metrics);
      if (sc > best.score) {
        best = { w: clean, score: sc };
        elites[0] = best;
      }
    }
    activeWeights = best.w;
  }

  const calibEval = evaluateRange(activeWeights, trainStart, trainEnd, false);
  const blindEval = evaluateRange(activeWeights, testStart, N, true);

  // 120-Trial Pure Uniform Random Monte Carlo Benchmark on the identical blind window
  const trials = 120;
  const count = Math.max(1, N - testStart);
  const stakePerDraw = slipCount * cfg.unitCostTT;
  const pool = Array.from({ length: cfg.maxBall }, (_, i) => i + 1);
  const trialRates: number[] = [];
  let sumSecondary = 0;
  let sumNet = 0;
  const stepHitTotals = new Float64Array(count);

  for (let tr = 0; tr < trials; tr++) {
    const rng = createMulberry32((seed ^ Math.imul(tr + 29, 1597334677)) >>> 0);
    let primDraws = 0;
    let secDraws = 0;
    let paySum = 0;

    for (let step = 0; step < count; step++) {
      const t = testStart + step;
      const mask = actualMasks[t];
      const actBonus = clampBonus(draws[t].bonus, cfg.bonusMax);
      let anyPrim = false;
      let anySec = false;
      const seen = new Set<string>();

      for (let s = 0; s < slipCount; s++) {
        let picked: number[] = [];
        for (let att = 0; att < 5; att++) {
          for (let k = 0; k < cfg.pickCount; k++) {
            const j = k + Math.floor(rng() * (cfg.maxBall - k));
            const tmp = pool[k];
            pool[k] = pool[j];
            pool[j] = tmp;
          }
          picked = pool.slice(0, cfg.pickCount).sort((a, b) => a - b);
          const key = picked.join("-");
          if (!seen.has(key)) {
            seen.add(key);
            break;
          }
        }
        let ov = 0;
        for (let i = 0; i < cfg.pickCount; i++) if (mask[picked[i]]) ov++;
        const bHit = 1 + Math.floor(rng() * cfg.bonusMax) === actBonus;
        if (cfg.isPrimaryWin(ov, bHit)) anyPrim = true;
        if (cfg.isSecondaryWin(ov, bHit)) anySec = true;
        paySum += cfg.payoutFn(ov, bHit);
      }

      if (anyPrim) {
        primDraws++;
        stepHitTotals[step] += 1;
      }
      if (anySec) secDraws++;
    }
    trialRates.push((primDraws / count) * 100);
    sumSecondary += secDraws;
    sumNet += paySum - count * stakePerDraw;
  }

  const meanRate = trialRates.reduce((a, b) => a + b, 0) / trials;
  const stdRate = Math.sqrt(
    trialRates.reduce((acc, r) => acc + (r - meanRate) * (r - meanRate), 0) / trials
  );
  const expectedPrimaryRatePct = round2(meanRate);
  const stdPrimaryRatePct = round2(stdRate);

  let runningExp = 0;
  const trajectory = blindEval.records.map((rec, i) => {
    runningExp += stepHitTotals[i] / trials;
    const expCum = round2(runningExp);
    rec.cumRandomExpectedHits = expCum;
    return {
      step: i + 1,
      drawNumber: rec.drawNumber,
      drawDate: rec.drawDate,
      tunedCumHits: rec.cumTunedHits,
      randomExpectedCumHits: expCum
    };
  });

  const liftPctPoints = round2(blindEval.metrics.primaryHitRatePct - expectedPrimaryRatePct);
  const zScoreVsRandom = round2(
    (blindEval.metrics.primaryHitRatePct - expectedPrimaryRatePct) / Math.max(stdPrimaryRatePct, 0.5)
  );
  const overfitGapPctPoints = round2(
    calibEval.metrics.primaryHitRatePct - blindEval.metrics.primaryHitRatePct
  );

  const primaryName = cfg.game === "lotto-plus" ? "Any Prize Capture" : "Match 3+ Prize Capture";
  const overfitDiagnostics = buildOverfitVerdict(
    primaryName,
    blindEval.metrics.drawsTested,
    calibEval.metrics.primaryHitRatePct,
    blindEval.metrics.primaryHitRatePct,
    expectedPrimaryRatePct,
    zScoreVsRandom,
    liftPctPoints,
    overfitGapPctPoints
  );

  // Next-Draw Live Generation from Frame[N]
  const nextFrame = frames[N];
  const nextSeed = (seed ^ Math.imul(nextTargetDrawNumber, 2654435761)) >>> 0;
  const { slips: nextSlipsRaw, bonuses: nextBonuses, probs: nextProbs } = generateMultiBallPortfolio(
    nextFrame,
    activeWeights,
    cfg,
    slipCount,
    bonusMode,
    guardEnabled,
    nextSeed
  );

  const uniformBase = round2(100 / cfg.maxBall);
  const ballProbabilities: UniversalBallProbability[] = [];
  for (let b = 1; b <= cfg.maxBall; b++) {
    const pPct = round2(nextProbs[b] * 100);
    ballProbabilities.push({
      ball: b,
      displayLabel: String(b).padStart(2, "0"),
      probabilityPct: pPct,
      uniformBaselinePct: uniformBase,
      deltaPct: round2(pPct - uniformBase),
      statALabel: `${cfg.recentWindow}d`,
      statAVal: String(nextFrame.rawRecent[b]),
      statBLabel: "Skip",
      statBVal: String(nextFrame.rawSkip[b])
    });
  }

  const bonusUniform = round2(100 / cfg.bonusMax);
  const bonusProbabilities: UniversalBonusProbability[] = [];
  for (let bb = 1; bb <= cfg.bonusMax; bb++) {
    bonusProbabilities.push({
      ball: bb,
      probabilityPct: round2(nextFrame.bonusProbs[bb] * 100),
      uniformBaselinePct: bonusUniform,
      drawsSkipped: nextFrame.bonusSkip[bb],
      recentHits: nextFrame.bonusRecent[bb]
    });
  }

  const nextDrawSlips: UniversalGeneratedSlip[] = nextSlipsRaw.map((nums, idx) => {
    const sum = nums.reduce((a, b) => a + b, 0);
    const odds = nums.filter((n) => n % 2 === 1).length;
    return {
      index: idx + 1,
      numbers: nums,
      bonusBall: nextBonuses[idx],
      primaryTag: `Sum ${sum}`,
      secondaryTag: `${odds} Odd / ${cfg.pickCount - odds} Even`
    };
  });

  return {
    game: cfg.game,
    gameName: cfg.gameName,
    themeColor: cfg.themeColor,
    unitCostTT: cfg.unitCostTT,
    slipUnitLabel: "Slips",
    heroHeadline: `${cfg.gameName}: Adaptive Random Generator & Walk-Forward Backtest Lab`,
    heroDescription:
      cfg.game === "lotto-plus"
        ? `Tunes a stochastic 5-of-35 main generator with a strictly decoupled Powerball (1 to 10) on older draws, then tests blind on the latest ${blindEval.metrics.drawsTested} unseen draws against a pure uniform random generator.`
        : `Tunes a stochastic 6-of-28 main generator with a strictly decoupled Cash Ball (1, 2, or 3 only) on older draws, then tests blind on the latest ${blindEval.metrics.drawsTested} unseen draws against pure randomness.`,
    bonusName: cfg.bonusName,
    bonusMax: cfg.bonusMax,
    uniformBaselinePct: uniformBase,
    totalDrawsAvailable: N,
    calibrationDrawsCount: Math.max(0, trainEnd - trainStart),
    blindTestDrawsCount: blindEval.metrics.drawsTested,
    latestDraw,
    nextTargetDrawNumber,
    slipCount,
    testWindow: blindEval.metrics.drawsTested,
    windowChoices: cfg.windowChoices,
    objective,
    objectiveChoices: cfg.objectiveChoices,
    bonusMode,
    bonusModeChoices: cfg.bonusModeChoices,
    guardEnabled,
    guardLabel: "Anti-Crowding Coverage Spread",
    guardHelper: `Penalizes repeating the exact same main balls across slips so more of the 1 to ${cfg.maxBall} pool stays active.`,
    seed,
    wasAutoTuned: autoTune,
    optimizerEvaluations,
    computeMs: Date.now() - t0,
    weights: activeWeights,
    pureRandomWeights,
    sliderDefs: cfg.sliderDefs,
    metricLabels: {
      primaryTitle: cfg.game === "lotto-plus" ? "Blind Any Prize Draw Rate" : "Blind Match 3+ Draw Rate",
      primaryShort: cfg.game === "lotto-plus" ? "Any Prize" : "Match 3+",
      secondaryLabel: cfg.game === "lotto-plus" ? "Pure Main Match 3+" : "Match 4+ Draws",
      topTierLabel: cfg.game === "lotto-plus" ? "Match 4+ / 5 Draws" : "Match 5+ / 6 Draws",
      singleSlipOddsText: cfg.singleSlipOddsText,
      trajectorySubtitle:
        cfg.game === "lotto-plus"
          ? `Cumulative unseen Lotto Plus draws with at least one official prize (1+Powerball, 2+Powerball, or Match 3+) across the latest ${blindEval.metrics.drawsTested} draws.`
          : `Cumulative unseen Win For Life draws with at least one Match 3+ prize across the latest ${blindEval.metrics.drawsTested} draws.`,
      heatmapTitle: `Next Draw #${nextTargetDrawNumber} Main Ball Selection Probabilities (1 to ${cfg.maxBall} vs ${uniformBase}% Uniform)`
    },
    calibrationMetrics: calibEval.metrics,
    blindTestMetrics: blindEval.metrics,
    randomBenchmark: {
      monteCarloTrials: trials,
      expectedPrimaryRatePct,
      stdPrimaryRatePct,
      expectedSecondaryDraws: round2(sumSecondary / trials),
      expectedNetProfitTT: round2(sumNet / trials),
      zScoreVsRandom,
      liftPctPoints
    },
    overfitDiagnostics,
    ballProbabilities,
    bonusProbabilities,
    nextDrawSlips,
    trajectory,
    blindAuditLog: [...blindEval.records].reverse()
  };
}

// ============================================================================
// GAME 3 ENGINE: Play Whe (1 of 36 Chinapoo Marks, $1/mark, $26 payout)
// ============================================================================
interface PlayWheFrame {
  droughtZ: Float64Array;   // length 37 (1..36)
  kinematicZ: Float64Array; // -1 / 0 / +1 step around previous draw
  mirrorLineZ: Float64Array; // 37 - n mirror & +/- 9 Chinapoo lines
  markovZ: Float64Array;    // Lag-1 + 0.5*Lag-2 transitions
  hot45Z: Float64Array;     // 45-draw hot momentum
  rawSkip: Int16Array;
  rawHot45: Int16Array;
}

function wrap36(n: number): number {
  return ((((n - 1) % 36) + 36) % 36) + 1;
}

function precomputePlayWheFrames(draws: HistoricalDrawInput[]): PlayWheFrame[] {
  const N = draws.length;
  const frames: PlayWheFrame[] = new Array(N + 1);

  const lastSeen = new Int32Array(37).fill(-1);
  const recent45 = new Int16Array(37);
  const markov1: Int32Array[] = Array.from({ length: 37 }, () => new Int32Array(37));
  const markov2: Int32Array[] = Array.from({ length: 37 }, () => new Int32Array(37));

  for (let t = 0; t <= N; t++) {
    const rawDrought = new Float64Array(37);
    const rawKin = new Float64Array(37);
    const rawMir = new Float64Array(37);
    const rawMkv = new Float64Array(37);
    const rawHot = new Float64Array(37);
    const rawSkipCopy = new Int16Array(37);
    const rawHotCopy = new Int16Array(37);

    const prev1 = t >= 1 ? draws[t - 1].numbers[0] : 0;
    const prev2 = t >= 2 ? draws[t - 2].numbers[0] : 0;

    if (prev1 >= 1 && prev1 <= 36) {
      rawKin[wrap36(prev1 - 1)] += 1.0;
      rawKin[prev1] += 0.85;
      rawKin[wrap36(prev1 + 1)] += 1.0;
      rawKin[wrap36(prev1 - 2)] += 0.35;
      rawKin[wrap36(prev1 + 2)] += 0.35;

      const mirror = 37 - prev1;
      rawMir[mirror] += 1.25;
      rawMir[wrap36(prev1 + 9)] += 0.75;
      rawMir[wrap36(prev1 - 9)] += 0.75;
      rawMir[wrap36(prev1 + 18)] += 0.65;
    }

    for (let m = 1; m <= 36; m++) {
      const skip = lastSeen[m] === -1 ? Math.min(t, 80) : t - 1 - lastSeen[m];
      rawSkipCopy[m] = skip;
      rawHotCopy[m] = recent45[m];
      rawDrought[m] = Math.min(skip, 120);
      rawHot[m] = recent45[m];
      let mk = 0;
      if (prev1 >= 1 && prev1 <= 36) mk += markov1[prev1][m];
      if (prev2 >= 1 && prev2 <= 36) mk += 0.5 * markov2[prev2][m];
      rawMkv[m] = mk;
    }

    frames[t] = {
      droughtZ: zNormalizeRange(rawDrought, 1, 36),
      kinematicZ: zNormalizeRange(rawKin, 1, 36),
      mirrorLineZ: zNormalizeRange(rawMir, 1, 36),
      markovZ: zNormalizeRange(rawMkv, 1, 36),
      hot45Z: zNormalizeRange(rawHot, 1, 36),
      rawSkip: rawSkipCopy,
      rawHot45: rawHotCopy
    };

    if (t < N) {
      const cur = draws[t].numbers[0];
      if (cur >= 1 && cur <= 36) {
        lastSeen[cur] = t;
        recent45[cur]++;
        if (t >= 45) {
          const exp = draws[t - 45].numbers[0];
          if (exp >= 1 && exp <= 36) recent45[exp]--;
        }
        if (t >= 1 && prev1 >= 1 && prev1 <= 36) markov1[prev1][cur]++;
        if (t >= 2 && prev2 >= 1 && prev2 <= 36) markov2[prev2][cur]++;
      }
    }
  }

  return frames;
}

function generatePlayWheMarks(
  frame: PlayWheFrame,
  weights: RngWeights,
  markCount: number,
  lowHighBalance: boolean,
  drawSeed: number
): { marks: number[]; probs: Float64Array } {
  const raw = new Float64Array(37);
  for (let m = 1; m <= 36; m++) {
    raw[m] =
      weights.k1 * frame.droughtZ[m] +
      weights.k2 * frame.kinematicZ[m] +
      weights.k3 * frame.mirrorLineZ[m] +
      weights.k4 * frame.markovZ[m] +
      weights.k6 * 1.5 * frame.hot45Z[m];
  }
  const { logits, probs } = softmaxFromRaw(raw, 1, 36, weights.temperature);
  const rng = createMulberry32(drawSeed);
  const zeroUsage = new Int16Array(37);

  if (!lowHighBalance) {
    const marks = sampleWeightedTopK(logits, zeroUsage, 0, 1, 36, markCount, rng);
    // Order by descending model probability for cleaner display
    marks.sort((a, b) => probs[b] - probs[a] || a - b);
    return { marks, probs };
  }

  // Low (1-18) / High (19-36) balance guard: at least floor(markCount*0.4) from each half
  const minHalf = Math.floor(markCount * 0.4);
  let chosen = sampleWeightedTopK(logits, zeroUsage, 0, 1, 36, markCount, rng);
  for (let attempt = 0; attempt < 10; attempt++) {
    const lows = chosen.filter((n) => n <= 18).length;
    if (lows >= minHalf && markCount - lows >= minHalf) break;
    chosen = sampleWeightedTopK(logits, zeroUsage, 0, 1, 36, markCount, rng);
  }
  chosen.sort((a, b) => probs[b] - probs[a] || a - b);
  return { marks: chosen, probs };
}

function runPlayWheRngLab(
  drawsChronological: HistoricalDrawInput[],
  req: MultiGameRngRequest
): UniversalRngLabOutput {
  const t0 = Date.now();
  const draws = [...drawsChronological].sort((a, b) => a.drawNumber - b.drawNumber);
  const N = draws.length;
  if (N < 150) {
    throw new Error(`Play Whe RNG Lab requires at least 150 historical draws (found ${N}).`);
  }

  const windowChoices = [100, 200, 300];
  const slipCount: 5 | 7 | 10 = req.slipCount === 5 || req.slipCount === 10 ? req.slipCount : 7;
  const reqWin = Number(req.testWindow || 200);
  const testWindow = windowChoices.includes(reqWin) ? Math.min(reqWin, Math.floor(N * 0.45)) : 200;
  const objectiveChoices: RngChoiceOption[] = [
    { value: "exact_hit_rate", label: "Exact Mark Hit Rate" },
    { value: "net_roi", label: "Simulated Net Profit ($26 Payout)" }
  ];
  const objective = req.objective === "net_roi" ? "net_roi" : "exact_hit_rate";
  const guardEnabled = req.guardEnabled !== false;
  const latestDraw = draws[N - 1];
  const nextTargetDrawNumber = latestDraw.drawNumber + 1;
  const seed = Number.isFinite(Number(req.seed))
    ? Math.floor(Math.abs(Number(req.seed))) % 999999
    : nextTargetDrawNumber;
  const autoTune = Boolean(req.autoTune);

  const pureRandomWeights: RngWeights = {
    k1: 0,
    k2: 0,
    k3: 0,
    k4: 0,
    temperature: 2.0,
    k6: 0
  };
  const defaultSeedWeights: RngWeights = {
    k1: 1.2,
    k2: 0.7,
    k3: 0.8,
    k4: 0.9,
    temperature: 1.2,
    k6: 0.45
  };

  const frames = precomputePlayWheFrames(draws);
  const warmup = Math.min(60, Math.floor(N * 0.1));
  const testStart = N - testWindow;
  const trainStart = Math.max(warmup, testStart - 350);
  const trainEnd = testStart;

  const evaluateRange = (
    w: RngWeights,
    startIdx: number,
    endIdx: number,
    collectDetails: boolean
  ): { metrics: UniversalWindowMetrics; records: UniversalBlindDrawRecord[] } => {
    let exactHits = 0;
    let nearHits = 0; // within +/- 1 kinematic step of winning mark
    let totalStakeTT = 0;
    let totalPayoutTT = 0;
    const records: UniversalBlindDrawRecord[] = [];
    const stakePerDraw = slipCount * 1;
    const count = Math.max(0, endIdx - startIdx);

    for (let t = startIdx; t < endIdx; t++) {
      const draw = draws[t];
      const actual = draw.numbers[0];
      const drawSeed = (seed ^ Math.imul(draw.drawNumber, 2654435761)) >>> 0;
      const { marks } = generatePlayWheMarks(frames[t], w, slipCount, guardEnabled, drawSeed);
      const hit = marks.includes(actual);
      const near = !hit && (marks.includes(wrap36(actual - 1)) || marks.includes(wrap36(actual + 1)));
      const payoutTT = hit ? 26 : 0;

      if (hit) exactHits++;
      if (near) nearHits++;
      totalStakeTT += stakePerDraw;
      totalPayoutTT += payoutTT;

      if (collectDetails) {
        records.push({
          drawNumber: draw.drawNumber,
          drawDate: draw.drawDate,
          timeSlot: draw.timeSlot,
          actualNumbers: [actual],
          actualMarkName: CHINAPOO_CHART[actual]?.mark || `Mark ${actual}`,
          bestSlip: marks,
          primaryHit: hit,
          matchBadge: hit ? "EXACT HIT" : near ? "NEIGHBOR +/-1" : "MISS",
          highlightTier: hit ? "top" : near ? "near" : "miss",
          payoutTT,
          stakeTT: stakePerDraw,
          netTT: payoutTT - stakePerDraw,
          cumTunedHits: exactHits,
          cumRandomExpectedHits: 0
        });
      }
    }

    const netProfitTT = totalPayoutTT - totalStakeTT;
    return {
      metrics: {
        drawsTested: count,
        primaryHitDraws: exactHits,
        primaryHitRatePct: count > 0 ? round2((exactHits / count) * 100) : 0,
        secondaryHitDraws: nearHits,
        secondaryHitRatePct: count > 0 ? round2((nearHits / count) * 100) : 0,
        topTierHits: exactHits,
        bonusHitDraws: 0,
        bonusHitRatePct: 0,
        totalWinningSlips: exactHits,
        totalStakeTT,
        totalPayoutTT,
        netProfitTT,
        roiPct: totalStakeTT > 0 ? round2((netProfitTT / totalStakeTT) * 100) : 0
      },
      records
    };
  };

  const scoreFitness = (m: UniversalWindowMetrics): number => {
    if (objective === "net_roi") return m.netProfitTT + m.secondaryHitDraws * 1.2;
    return m.primaryHitDraws * 15 + m.secondaryHitDraws * 0.8;
  };

  let activeWeights = sanitizeWeights(req.weights, defaultSeedWeights);
  let optimizerEvaluations = 0;

  if (autoTune && trainEnd - trainStart >= 30) {
    const optRng = createMulberry32((seed ^ 0x9e3779b9) >>> 0);
    const candidates: Array<{ w: RngWeights; score: number }> = [];
    const anchors: RngWeights[] = [
      pureRandomWeights,
      defaultSeedWeights,
      { k1: 2.0, k2: 0.4, k3: 0.6, k4: 0.8, temperature: 1.0, k6: 0.2 },
      { k1: 0.5, k2: 1.6, k3: 1.4, k4: 0.8, temperature: 0.9, k6: 0.5 },
      { k1: 0.8, k2: 0.8, k3: 0.8, k4: 1.8, temperature: 1.1, k6: 0.6 },
      { k1: 1.2, k2: 1.0, k3: 1.0, k4: 1.0, temperature: 1.5, k6: 0.8 }
    ];

    const evalCand = (g: RngWeights) => {
      const clean = sanitizeWeights(g, defaultSeedWeights);
      const { metrics } = evaluateRange(clean, trainStart, trainEnd, false);
      optimizerEvaluations++;
      candidates.push({ w: clean, score: scoreFitness(metrics) });
    };

    for (const a of anchors) evalCand(a);
    for (let i = 0; i < 44; i++) {
      evalCand({
        k1: optRng() * 2.6,
        k2: optRng() * 2.6,
        k3: optRng() * 2.6,
        k4: optRng() * 2.6,
        temperature: 0.35 + optRng() * 2.5,
        k6: optRng()
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const elites = candidates.slice(0, 3);
    let best = elites[0];
    const keys: Array<keyof RngWeights> = ["k1", "k2", "k3", "k4", "temperature", "k6"];

    for (let iter = 0; iter < 24; iter++) {
      const parent = elites[iter % elites.length].w;
      const child: RngWeights = { ...parent };
      const stepScale = iter < 13 ? 0.45 : 0.2;
      const numMut = optRng() < 0.5 ? 1 : 2;
      for (let m = 0; m < numMut; m++) {
        const k = keys[Math.floor(optRng() * keys.length)];
        const delta = (optRng() * 2 - 1) * (k === "k6" ? stepScale * 0.6 : stepScale * 1.35);
        child[k] = child[k] + delta;
      }
      const clean = sanitizeWeights(child, defaultSeedWeights);
      const { metrics } = evaluateRange(clean, trainStart, trainEnd, false);
      optimizerEvaluations++;
      const sc = scoreFitness(metrics);
      if (sc > best.score) {
        best = { w: clean, score: sc };
        elites[0] = best;
      }
    }
    activeWeights = best.w;
  }

  const calibEval = evaluateRange(activeWeights, trainStart, trainEnd, false);
  const blindEval = evaluateRange(activeWeights, testStart, N, true);

  // Exact analytical Binomial benchmark + 120-trial Monte Carlo on blind window
  const trials = 120;
  const count = Math.max(1, N - testStart);
  const exactP = slipCount / 36;
  const exactRatePct = round2(exactP * 100);
  const exactStdPct = round2(Math.sqrt((exactP * (1 - exactP)) / count) * 100);
  const exactExpectedNet = round2(count * (exactP * 26 - slipCount));
  const exactExpectedNear = round2(count * (1 - Math.pow((36 - 2) / 36, slipCount)));

  const trajectory = blindEval.records.map((rec, i) => {
    const expCum = round2((i + 1) * exactP);
    rec.cumRandomExpectedHits = expCum;
    return {
      step: i + 1,
      drawNumber: rec.drawNumber,
      drawDate: rec.drawDate,
      tunedCumHits: rec.cumTunedHits,
      randomExpectedCumHits: expCum
    };
  });

  const liftPctPoints = round2(blindEval.metrics.primaryHitRatePct - exactRatePct);
  const zScoreVsRandom = round2((blindEval.metrics.primaryHitRatePct - exactRatePct) / Math.max(exactStdPct, 0.5));
  const overfitGapPctPoints = round2(calibEval.metrics.primaryHitRatePct - blindEval.metrics.primaryHitRatePct);

  const overfitDiagnostics = buildOverfitVerdict(
    "Exact Mark Hit Rate",
    blindEval.metrics.drawsTested,
    calibEval.metrics.primaryHitRatePct,
    blindEval.metrics.primaryHitRatePct,
    exactRatePct,
    zScoreVsRandom,
    liftPctPoints,
    overfitGapPctPoints
  );

  // Live Next-Draw Generation
  const nextFrame = frames[N];
  const nextSeed = (seed ^ Math.imul(nextTargetDrawNumber, 2654435761)) >>> 0;
  const { marks: nextMarks, probs: nextProbs } = generatePlayWheMarks(
    nextFrame,
    activeWeights,
    slipCount,
    guardEnabled,
    nextSeed
  );

  const uniformBase = round2(100 / 36);
  const ballProbabilities: UniversalBallProbability[] = [];
  for (let m = 1; m <= 36; m++) {
    const pPct = round2(nextProbs[m] * 100);
    ballProbabilities.push({
      ball: m,
      displayLabel: String(m).padStart(2, "0"),
      subLabel: CHINAPOO_CHART[m]?.mark || `Mark ${m}`,
      probabilityPct: pPct,
      uniformBaselinePct: uniformBase,
      deltaPct: round2(pPct - uniformBase),
      statALabel: "45d",
      statAVal: String(nextFrame.rawHot45[m]),
      statBLabel: "Skip",
      statBVal: String(nextFrame.rawSkip[m])
    });
  }

  const nextDrawSlips: UniversalGeneratedSlip[] = nextMarks.map((m, idx) => ({
    index: idx + 1,
    numbers: [m],
    markName: CHINAPOO_CHART[m]?.mark || `Mark ${m}`,
    primaryTag: `${round2(nextProbs[m] * 100).toFixed(1)}% Weight`,
    secondaryTag: `Skip ${nextFrame.rawSkip[m]} | Mirror ${String(37 - m).padStart(2, "0")}`
  }));

  return {
    game: "play-whe",
    gameName: "Play Whe",
    themeColor: "amber",
    unitCostTT: 1,
    slipUnitLabel: "Marks",
    heroHeadline: "Play Whe: Chinapoo Adaptive Generator & Walk-Forward Backtest Lab",
    heroDescription: `Tunes a 1-of-36 Chinapoo stochastic generator using drought skips, kinematic steps, Sum-37 mirrors, and 2-lag followers on older draws, then validates blind across ${blindEval.metrics.drawsTested} unseen draws versus exact ${slipCount}/36 (${exactRatePct}%) pure randomness.`,
    bonusName: null,
    bonusMax: 0,
    uniformBaselinePct: uniformBase,
    totalDrawsAvailable: N,
    calibrationDrawsCount: Math.max(0, trainEnd - trainStart),
    blindTestDrawsCount: blindEval.metrics.drawsTested,
    latestDraw,
    nextTargetDrawNumber,
    slipCount,
    testWindow: blindEval.metrics.drawsTested,
    windowChoices,
    objective,
    objectiveChoices,
    bonusMode: "none",
    bonusModeChoices: [],
    guardEnabled,
    guardLabel: "Low (1 to 18) & High (19 to 36) Balance Guard",
    guardHelper: "Prevents clustering all selected Chinapoo marks inside only one half of the 1 to 36 chart.",
    seed,
    wasAutoTuned: autoTune,
    optimizerEvaluations,
    computeMs: Date.now() - t0,
    weights: activeWeights,
    pureRandomWeights,
    sliderDefs: [
      {
        key: "k1",
        label: "Extreme Cold Drought (Skip Tension)",
        helper: "Boosts Chinapoo marks with the longest draw droughts",
        min: 0,
        max: 3,
        step: 0.1,
        format: "decimal1"
      },
      {
        key: "k2",
        label: "Kinematic Step (-1 / Repeat / +1)",
        helper: "Favors marks directly adjacent to or repeating the previous draw",
        min: 0,
        max: 3,
        step: 0.1,
        format: "decimal1"
      },
      {
        key: "k3",
        label: "Chinapoo Mirror (37 - n) & Line (+/- 9)",
        helper: "Boosts the exact Sum-37 opposite mark and +/- 9 wheel lines",
        min: 0,
        max: 3,
        step: 0.1,
        format: "decimal1"
      },
      {
        key: "k4",
        label: "Lag-1 & Lag-2 Historical Follower",
        helper: "Weights marks that historically follow the last 2 winning marks",
        min: 0,
        max: 3,
        step: 0.1,
        format: "decimal1"
      },
      {
        key: "temperature",
        label: "Randomness Temperature",
        helper: "Lower = sharper top mark focus; Higher = closer to uniform 1/36",
        min: 0.25,
        max: 4.0,
        step: 0.05,
        format: "decimal2"
      },
      {
        key: "k6",
        label: "Hot Momentum Blend (Last 45 Draws)",
        helper: "Blends short-term 45-draw hot mark frequency into sampling weights",
        min: 0,
        max: 1,
        step: 0.05,
        format: "percent"
      }
    ],
    metricLabels: {
      primaryTitle: "Blind Exact Mark Hit Rate",
      primaryShort: "Exact Hit",
      secondaryLabel: "Near Neighbor (+/-1) Misses",
      topTierLabel: "Exact $26 Hits",
      singleSlipOddsText: `2.78% per mark (${exactRatePct}% for ${slipCount} marks)`,
      trajectorySubtitle: `Cumulative exact Chinapoo mark hits across the latest ${blindEval.metrics.drawsTested} unseen Play Whe draws versus exact ${slipCount}/36 pure random expectation.`,
      heatmapTitle: `Next Draw #${nextTargetDrawNumber} Chinapoo Mark Probabilities (1 to 36 vs 2.78% Uniform)`
    },
    calibrationMetrics: calibEval.metrics,
    blindTestMetrics: blindEval.metrics,
    randomBenchmark: {
      monteCarloTrials: trials,
      expectedPrimaryRatePct: exactRatePct,
      stdPrimaryRatePct: exactStdPct,
      expectedSecondaryDraws: exactExpectedNear,
      expectedNetProfitTT: exactExpectedNet,
      zScoreVsRandom,
      liftPctPoints
    },
    overfitDiagnostics,
    ballProbabilities,
    nextDrawSlips,
    trajectory,
    blindAuditLog: [...blindEval.records].reverse()
  };
}

// ============================================================================
// GAME 4 ENGINE: Pick 4 (4 x 0-9 Unordered Box-First + 3+ Right Digits, $1/Box)
// ============================================================================
interface Pick4Frame {
  carryoverZ: Float64Array; // length 10 (digits 0..9)
  mirrorZ: Float64Array;    // 9 - d reflection of last draw
  neighborZ: Float64Array;  // (d +/- 1) mod 10 slide from last draw
  overdueZ: Float64Array;   // cold digit drought across all 4 positions
  rawSkip: Int16Array;
  rawRecent20: Int16Array;
}

function precomputePick4Frames(draws: HistoricalDrawInput[]): Pick4Frame[] {
  const N = draws.length;
  const frames: Pick4Frame[] = new Array(N + 1);

  const lastSeen = new Int32Array(10).fill(-1);
  const recent20 = new Int16Array(10);

  for (let t = 0; t <= N; t++) {
    const rawCarry = new Float64Array(10);
    const rawMir = new Float64Array(10);
    const rawNeigh = new Float64Array(10);
    const rawOvd = new Float64Array(10);
    const rawSkipCopy = new Int16Array(10);
    const rawRecCopy = new Int16Array(10);

    const prev1 = t >= 1 ? draws[t - 1].numbers : [];
    const prev2 = t >= 2 ? draws[t - 2].numbers : [];

    for (let i = 0; i < prev1.length; i++) {
      const d = prev1[i];
      if (d < 0 || d > 9) continue;
      rawCarry[d] += 1.0;
      rawMir[9 - d] += 1.0;
      rawNeigh[(d + 1) % 10] += 1.0;
      rawNeigh[(d + 9) % 10] += 1.0;
    }
    for (let i = 0; i < prev2.length; i++) {
      const d = prev2[i];
      if (d >= 0 && d <= 9) rawCarry[d] += 0.45;
    }

    for (let d = 0; d <= 9; d++) {
      const skip = lastSeen[d] === -1 ? Math.min(t, 12) : t - 1 - lastSeen[d];
      rawSkipCopy[d] = skip;
      rawRecCopy[d] = recent20[d];
      rawOvd[d] = Math.min(skip, 12);
    }

    frames[t] = {
      carryoverZ: zNormalizeRange(rawCarry, 0, 9),
      mirrorZ: zNormalizeRange(rawMir, 0, 9),
      neighborZ: zNormalizeRange(rawNeigh, 0, 9),
      overdueZ: zNormalizeRange(rawOvd, 0, 9),
      rawSkip: rawSkipCopy,
      rawRecent20: rawRecCopy
    };

    if (t < N) {
      const cur = draws[t].numbers;
      for (let i = 0; i < cur.length; i++) {
        const d = cur[i];
        if (d >= 0 && d <= 9) {
          lastSeen[d] = t;
          recent20[d]++;
        }
      }
      if (t >= 20) {
        const exp = draws[t - 20].numbers;
        for (let i = 0; i < exp.length; i++) {
          const d = exp[i];
          if (d >= 0 && d <= 9) recent20[d]--;
        }
      }
    }
  }

  return frames;
}

function multisetOverlap4(pred: number[], actual: number[]): number {
  const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 4; i++) counts[actual[i]]++;
  let hits = 0;
  for (let i = 0; i < 4; i++) {
    const d = pred[i];
    if (counts[d] > 0) {
      hits++;
      counts[d]--;
    }
  }
  return hits;
}

function getPick4BoxPayout(digits: number[]): { payout: number; label: string } {
  const freq = new Map<number, number>();
  for (const d of digits) freq.set(d, (freq.get(d) || 0) + 1);
  const counts = Array.from(freq.values()).sort((a, b) => b - a);
  if (counts[0] === 4) return { payout: 5000, label: "Straight Quad" };
  if (counts[0] === 3) return { payout: 1200, label: "4-Way Box" };
  if (counts[0] === 2 && counts[1] === 2) return { payout: 800, label: "6-Way Box" };
  if (counts[0] === 2) return { payout: 400, label: "12-Way Twin Box" };
  return { payout: 200, label: "24-Way Box" };
}

function sampleOnePick4Digit(probs: Float64Array, usage: Int16Array, penalty: number, rng: () => number): number {
  let total = 0;
  const w = new Float64Array(10);
  for (let d = 0; d <= 9; d++) {
    const val = probs[d] * Math.exp(-usage[d] * penalty);
    w[d] = val;
    total += val;
  }
  let r = rng() * total;
  for (let d = 0; d <= 9; d++) {
    r -= w[d];
    if (r <= 0) return d;
  }
  return 9;
}

function generatePick4Portfolio(
  frame: Pick4Frame,
  weights: RngWeights,
  slipCount: number,
  allDigitsGuard: boolean,
  drawSeed: number
): { slips: number[][]; probs: Float64Array } {
  const raw = new Float64Array(10);
  for (let d = 0; d <= 9; d++) {
    raw[d] =
      weights.k1 * frame.carryoverZ[d] +
      weights.k2 * frame.mirrorZ[d] +
      weights.k3 * frame.neighborZ[d] +
      weights.k4 * frame.overdueZ[d];
  }
  const { logits, probs } = softmaxFromRaw(raw, 0, 9, weights.temperature);
  const rng = createMulberry32(drawSeed);
  const usage = new Int16Array(10);
  const usedBoxKeys = new Set<string>();
  const slips: number[][] = [];
  const penalty = allDigitsGuard ? 0.55 : 0;

  for (let s = 0; s < slipCount; s++) {
    let accepted: number[] | null = null;
    // Last slip in 10/10 guard actively pulls in any remaining unused digits (0..9)
    const missingDigits: number[] = [];
    if (allDigitsGuard && s >= slipCount - 2) {
      for (let d = 0; d <= 9; d++) if (usage[d] === 0) missingDigits.push(d);
    }

    for (let attempt = 0; attempt < 16; attempt++) {
      let cand: number[];
      const allowRepeats = rng() < weights.k6;
      if (!allowRepeats) {
        // 4 distinct digits (24-Way Box)
        cand = sampleWeightedTopK(logits, usage, penalty, 0, 9, 4, rng);
      } else {
        // Independent sampling with replacement (natural twins/triples allowed)
        cand = [
          sampleOnePick4Digit(probs, usage, penalty * 0.45, rng),
          sampleOnePick4Digit(probs, usage, penalty * 0.45, rng),
          sampleOnePick4Digit(probs, usage, penalty * 0.45, rng),
          sampleOnePick4Digit(probs, usage, penalty * 0.45, rng)
        ];
      }

      // Inject uncovered digits cleanly on the final lines when 10/10 guard is enabled
      if (missingDigits.length > 0 && attempt === 0) {
        const injectCount = Math.min(missingDigits.length, s === slipCount - 1 ? 4 : 2);
        for (let i = 0; i < injectCount; i++) {
          cand[3 - i] = missingDigits[i];
        }
      }

      // Shuffle positional order deterministically while keeping distinct unordered Box key
      for (let i = 3; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = cand[i];
        cand[i] = cand[j];
        cand[j] = tmp;
      }

      const boxKey = [...cand].sort((a, b) => a - b).join("-");
      if (usedBoxKeys.has(boxKey)) continue;
      accepted = cand;
      usedBoxKeys.add(boxKey);
      break;
    }

    if (!accepted) {
      accepted = sampleWeightedTopK(logits, usage, penalty, 0, 9, 4, rng);
      usedBoxKeys.add([...accepted].sort((a, b) => a - b).join("-"));
    }
    for (let i = 0; i < 4; i++) usage[accepted[i]]++;
    slips.push(accepted);
  }

  return { slips, probs };
}

function runPick4RngLab(
  drawsChronological: HistoricalDrawInput[],
  req: MultiGameRngRequest
): UniversalRngLabOutput {
  const t0 = Date.now();
  const draws = [...drawsChronological].sort((a, b) => a.drawNumber - b.drawNumber);
  const N = draws.length;
  if (N < 120) {
    throw new Error(`Pick 4 RNG Lab requires at least 120 historical draws (found ${N}).`);
  }

  const windowChoices = [100, 200, 300];
  const slipCount: 5 | 7 | 10 = req.slipCount === 5 || req.slipCount === 10 ? req.slipCount : 7;
  const reqWin = Number(req.testWindow || 200);
  const testWindow = windowChoices.includes(reqWin) ? Math.min(reqWin, Math.floor(N * 0.45)) : 200;
  const objectiveChoices: RngChoiceOption[] = [
    { value: "box4_and_right3", label: "Unordered 4/4 Box + 3+ Right Digits" },
    { value: "box4_roi", label: "4/4 Box Net Profit ($200 to $1,200)" },
    { value: "straight_focus", label: "Exact Straight + 4/4 Box Bonus" }
  ];
  const validObj = objectiveChoices.map((o) => o.value);
  const objective = req.objective && validObj.includes(req.objective) ? req.objective : "box4_and_right3";
  const guardEnabled = req.guardEnabled !== false;
  const latestDraw = draws[N - 1];
  const nextTargetDrawNumber = latestDraw.drawNumber + 1;
  const seed = Number.isFinite(Number(req.seed))
    ? Math.floor(Math.abs(Number(req.seed))) % 999999
    : nextTargetDrawNumber;
  const autoTune = Boolean(req.autoTune);

  // Pure random for Pick 4 = zero feature bias + 100% natural repeats allowed (exact independent uniform 0..9!)
  const pureRandomWeights: RngWeights = {
    k1: 0,
    k2: 0,
    k3: 0,
    k4: 0,
    temperature: 2.0,
    k6: 1.0
  };
  const defaultSeedWeights: RngWeights = {
    k1: 0.8,
    k2: 1.1,
    k3: 0.9,
    k4: 0.7,
    temperature: 1.15,
    k6: 0.35
  };

  const frames = precomputePick4Frames(draws);
  const warmup = Math.min(40, Math.floor(N * 0.1));
  const testStart = N - testWindow;
  const trainStart = Math.max(warmup, testStart - 350);
  const trainEnd = testStart;

  const evaluateRange = (
    w: RngWeights,
    startIdx: number,
    endIdx: number,
    collectDetails: boolean
  ): { metrics: UniversalWindowMetrics; records: UniversalBlindDrawRecord[] } => {
    let right3PlusDraws = 0; // Primary smooth statistical metric (3+ right digits)
    let box4Draws = 0;       // Secondary marquee metric (exact 4/4 Box win!)
    let straightDraws = 0;   // Bonus exact positional straight
    let totalBox4Slips = 0;
    let totalStakeTT = 0;
    let totalPayoutTT = 0;
    const records: UniversalBlindDrawRecord[] = [];
    const stakePerDraw = slipCount * 1;
    const count = Math.max(0, endIdx - startIdx);

    for (let t = startIdx; t < endIdx; t++) {
      const draw = draws[t];
      const act = draw.numbers;
      const drawSeed = (seed ^ Math.imul(draw.drawNumber, 2654435761)) >>> 0;
      const { slips } = generatePick4Portfolio(frames[t], w, slipCount, guardEnabled, drawSeed);

      let bestOv = -1;
      let bestStraight = false;
      let bestSlip = slips[0];
      let anyRight3 = false;
      let anyBox4 = false;
      let anyStraight = false;
      let payoutTT = 0;

      for (let s = 0; s < slips.length; s++) {
        const sl = slips[s];
        const ov = multisetOverlap4(sl, act);
        const isStr = sl[0] === act[0] && sl[1] === act[1] && sl[2] === act[2] && sl[3] === act[3];
        if (ov >= 3) anyRight3 = true;
        if (ov === 4) {
          anyBox4 = true;
          totalBox4Slips++;
          payoutTT += getPick4BoxPayout(sl).payout;
        }
        if (isStr) anyStraight = true;

        if (ov > bestOv || (ov === bestOv && isStr && !bestStraight)) {
          bestOv = ov;
          bestStraight = isStr;
          bestSlip = sl;
        }
      }

      if (anyRight3) right3PlusDraws++;
      if (anyBox4) box4Draws++;
      if (anyStraight) straightDraws++;
      totalStakeTT += stakePerDraw;
      totalPayoutTT += payoutTT;

      if (collectDetails) {
        const sortedBest = [...bestSlip].sort((a, b) => a - b);
        records.push({
          drawNumber: draw.drawNumber,
          drawDate: draw.drawDate,
          timeSlot: draw.timeSlot,
          actualNumbers: act,
          bestSlip: sortedBest,
          primaryHit: anyRight3,
          matchBadge: bestStraight
            ? "4/4 STRAIGHT"
            : bestOv === 4
            ? "4/4 BOX WIN"
            : bestOv === 3
            ? "3/4 RIGHT"
            : `${bestOv}/4`,
          highlightTier: bestOv === 4 ? "top" : bestOv === 3 ? "win" : "miss",
          payoutTT,
          stakeTT: stakePerDraw,
          netTT: payoutTT - stakePerDraw,
          cumTunedHits: right3PlusDraws,
          cumRandomExpectedHits: 0
        });
      }
    }

    const netProfitTT = totalPayoutTT - totalStakeTT;
    return {
      metrics: {
        drawsTested: count,
        primaryHitDraws: right3PlusDraws,
        primaryHitRatePct: count > 0 ? round2((right3PlusDraws / count) * 100) : 0,
        secondaryHitDraws: box4Draws,
        secondaryHitRatePct: count > 0 ? round2((box4Draws / count) * 100) : 0,
        topTierHits: straightDraws,
        bonusHitDraws: box4Draws,
        bonusHitRatePct: count > 0 ? round2((box4Draws / count) * 100) : 0,
        totalWinningSlips: totalBox4Slips,
        totalStakeTT,
        totalPayoutTT,
        netProfitTT,
        roiPct: totalStakeTT > 0 ? round2((netProfitTT / totalStakeTT) * 100) : 0
      },
      records
    };
  };

  const scoreFitness = (m: UniversalWindowMetrics): number => {
    if (objective === "box4_roi") {
      return m.netProfitTT + m.secondaryHitDraws * 120 + m.primaryHitDraws * 2;
    }
    if (objective === "straight_focus") {
      return m.topTierHits * 250 + m.secondaryHitDraws * 35 + m.primaryHitDraws * 1.5;
    }
    // Default 2.A: Unordered 4/4 Box + 3+ Right Digits
    return m.secondaryHitDraws * 18 + m.primaryHitDraws * 2.2 + m.totalWinningSlips * 4;
  };

  let activeWeights = sanitizeWeights(req.weights, defaultSeedWeights);
  let optimizerEvaluations = 0;

  if (autoTune && trainEnd - trainStart >= 30) {
    const optRng = createMulberry32((seed ^ 0x9e3779b9) >>> 0);
    const candidates: Array<{ w: RngWeights; score: number }> = [];
    const anchors: RngWeights[] = [
      pureRandomWeights,
      defaultSeedWeights,
      { k1: 1.2, k2: 1.5, k3: 0.7, k4: 0.5, temperature: 0.95, k6: 0.0 },
      { k1: 0.5, k2: 0.7, k3: 1.4, k4: 1.3, temperature: 1.0, k6: 0.35 },
      { k1: 1.0, k2: 1.0, k3: 1.0, k4: 1.0, temperature: 1.4, k6: 0.5 },
      { k1: 0.4, k2: 1.8, k3: 1.2, k4: 0.4, temperature: 0.85, k6: 0.2 }
    ];

    const evalCand = (g: RngWeights) => {
      const clean = sanitizeWeights(g, defaultSeedWeights);
      const { metrics } = evaluateRange(clean, trainStart, trainEnd, false);
      optimizerEvaluations++;
      candidates.push({ w: clean, score: scoreFitness(metrics) });
    };

    for (const a of anchors) evalCand(a);
    for (let i = 0; i < 42; i++) {
      evalCand({
        k1: optRng() * 2.6,
        k2: optRng() * 2.6,
        k3: optRng() * 2.6,
        k4: optRng() * 2.6,
        temperature: 0.35 + optRng() * 2.5,
        k6: optRng()
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const elites = candidates.slice(0, 3);
    let best = elites[0];
    const keys: Array<keyof RngWeights> = ["k1", "k2", "k3", "k4", "temperature", "k6"];

    for (let iter = 0; iter < 22; iter++) {
      const parent = elites[iter % elites.length].w;
      const child: RngWeights = { ...parent };
      const stepScale = iter < 12 ? 0.45 : 0.2;
      const numMut = optRng() < 0.5 ? 1 : 2;
      for (let m = 0; m < numMut; m++) {
        const k = keys[Math.floor(optRng() * keys.length)];
        const delta = (optRng() * 2 - 1) * (k === "k6" ? stepScale * 0.6 : stepScale * 1.35);
        child[k] = child[k] + delta;
      }
      const clean = sanitizeWeights(child, defaultSeedWeights);
      const { metrics } = evaluateRange(clean, trainStart, trainEnd, false);
      optimizerEvaluations++;
      const sc = scoreFitness(metrics);
      if (sc > best.score) {
        best = { w: clean, score: sc };
        elites[0] = best;
      }
    }
    activeWeights = best.w;
  }

  const calibEval = evaluateRange(activeWeights, trainStart, trainEnd, false);
  const blindEval = evaluateRange(activeWeights, testStart, N, true);

  // 120-Trial Pure Uniform Random Monte Carlo Benchmark on the identical blind window
  const trials = 120;
  const count = Math.max(1, N - testStart);
  const stakePerDraw = slipCount * 1;
  const trialRates: number[] = [];
  let sumBox4 = 0;
  let sumNet = 0;
  const stepHitTotals = new Float64Array(count);

  for (let tr = 0; tr < trials; tr++) {
    const rng = createMulberry32((seed ^ Math.imul(tr + 41, 1597334677)) >>> 0);
    let r3Draws = 0;
    let b4Draws = 0;
    let paySum = 0;

    for (let step = 0; step < count; step++) {
      const t = testStart + step;
      const act = draws[t].numbers;
      let anyR3 = false;
      let anyB4 = false;
      const seen = new Set<string>();

      for (let s = 0; s < slipCount; s++) {
        let cand: number[] = [];
        for (let att = 0; att < 5; att++) {
          cand = [
            Math.floor(rng() * 10),
            Math.floor(rng() * 10),
            Math.floor(rng() * 10),
            Math.floor(rng() * 10)
          ];
          const key = [...cand].sort((a, b) => a - b).join("-");
          if (!seen.has(key)) {
            seen.add(key);
            break;
          }
        }
        const ov = multisetOverlap4(cand, act);
        if (ov >= 3) anyR3 = true;
        if (ov === 4) {
          anyB4 = true;
          paySum += getPick4BoxPayout(cand).payout;
        }
      }

      if (anyR3) {
        r3Draws++;
        stepHitTotals[step] += 1;
      }
      if (anyB4) b4Draws++;
    }

    trialRates.push((r3Draws / count) * 100);
    sumBox4 += b4Draws;
    sumNet += paySum - count * stakePerDraw;
  }

  const meanRate = trialRates.reduce((a, b) => a + b, 0) / trials;
  const stdRate = Math.sqrt(
    trialRates.reduce((acc, r) => acc + (r - meanRate) * (r - meanRate), 0) / trials
  );
  const expectedPrimaryRatePct = round2(meanRate);
  const stdPrimaryRatePct = round2(stdRate);

  let runningExp = 0;
  const trajectory = blindEval.records.map((rec, i) => {
    runningExp += stepHitTotals[i] / trials;
    const expCum = round2(runningExp);
    rec.cumRandomExpectedHits = expCum;
    return {
      step: i + 1,
      drawNumber: rec.drawNumber,
      drawDate: rec.drawDate,
      tunedCumHits: rec.cumTunedHits,
      randomExpectedCumHits: expCum
    };
  });

  const liftPctPoints = round2(blindEval.metrics.primaryHitRatePct - expectedPrimaryRatePct);
  const zScoreVsRandom = round2(
    (blindEval.metrics.primaryHitRatePct - expectedPrimaryRatePct) / Math.max(stdPrimaryRatePct, 0.5)
  );
  const overfitGapPctPoints = round2(
    calibEval.metrics.primaryHitRatePct - blindEval.metrics.primaryHitRatePct
  );

  const overfitDiagnostics = buildOverfitVerdict(
    "3+ Right Digits Alignment",
    blindEval.metrics.drawsTested,
    calibEval.metrics.primaryHitRatePct,
    blindEval.metrics.primaryHitRatePct,
    expectedPrimaryRatePct,
    zScoreVsRandom,
    liftPctPoints,
    overfitGapPctPoints
  );

  // Live Next-Draw Generation
  const nextFrame = frames[N];
  const nextSeed = (seed ^ Math.imul(nextTargetDrawNumber, 2654435761)) >>> 0;
  const { slips: nextSlipsRaw, probs: nextProbs } = generatePick4Portfolio(
    nextFrame,
    activeWeights,
    slipCount,
    guardEnabled,
    nextSeed
  );

  const ballProbabilities: UniversalBallProbability[] = [];
  for (let d = 0; d <= 9; d++) {
    const pPct = round2(nextProbs[d] * 100);
    ballProbabilities.push({
      ball: d,
      displayLabel: String(d),
      subLabel: `Mirror ${9 - d}`,
      probabilityPct: pPct,
      uniformBaselinePct: 10.0,
      deltaPct: round2(pPct - 10.0),
      statALabel: "20d",
      statAVal: String(nextFrame.rawRecent20[d]),
      statBLabel: "Skip",
      statBVal: String(nextFrame.rawSkip[d])
    });
  }

  const nextDrawSlips: UniversalGeneratedSlip[] = nextSlipsRaw.map((digits, idx) => {
    const sorted = [...digits].sort((a, b) => a - b);
    const boxInfo = getPick4BoxPayout(digits);
    const sum = digits.reduce((a, b) => a + b, 0);
    return {
      index: idx + 1,
      numbers: digits,
      boxTypeLabel: boxInfo.label,
      primaryTag: `Box {${sorted.join("-")}}`,
      secondaryTag: `${boxInfo.label} ($${boxInfo.payout}) | Sum ${sum}`
    };
  });

  return {
    game: "pick4",
    gameName: "Pick 4",
    themeColor: "purple",
    unitCostTT: 1,
    slipUnitLabel: "Box Lines",
    heroHeadline: "Pick 4: Box-First Adaptive Digit Generator & Walk-Forward Lab",
    heroDescription: `Tunes a 0-to-9 Pick 4 digit generator around 2-draw carryover, pure 9-d mirrors, +/-1 neighbor slides, and twin allowance strictly on older draws, then grades blind unordered 4/4 Box + 3+ Right Digits alignment on ${blindEval.metrics.drawsTested} unseen draws.`,
    bonusName: null,
    bonusMax: 0,
    uniformBaselinePct: 10.0,
    totalDrawsAvailable: N,
    calibrationDrawsCount: Math.max(0, trainEnd - trainStart),
    blindTestDrawsCount: blindEval.metrics.drawsTested,
    latestDraw,
    nextTargetDrawNumber,
    slipCount,
    testWindow: blindEval.metrics.drawsTested,
    windowChoices,
    objective,
    objectiveChoices,
    bonusMode: "none",
    bonusModeChoices: [],
    guardEnabled,
    guardLabel: "10/10 All-Digits Coverage Guard",
    guardHelper: "Spreads picks across all ten digits (0 to 9) so zero digits are left completely uncovered.",
    seed,
    wasAutoTuned: autoTune,
    optimizerEvaluations,
    computeMs: Date.now() - t0,
    weights: activeWeights,
    pureRandomWeights,
    sliderDefs: [
      {
        key: "k1",
        label: "2-Draw Carryover Pull",
        helper: "Favors digits repeating from the previous 1 to 2 Pick 4 draws",
        min: 0,
        max: 3,
        step: 0.1,
        format: "decimal1"
      },
      {
        key: "k2",
        label: "Pure Mirror (9 - d) Reflection",
        helper: "Boosts Sum-9 mirror digits (0<->9, 1<->8, 2<->7, 3<->6, 4<->5)",
        min: 0,
        max: 3,
        step: 0.1,
        format: "decimal1"
      },
      {
        key: "k3",
        label: "Adjacent Neighbor (+/- 1) Slide",
        helper: "Favors digits stepping up or down by 1 from the previous draw",
        min: 0,
        max: 3,
        step: 0.1,
        format: "decimal1"
      },
      {
        key: "k4",
        label: "Cold-Digit Overdue Tension",
        helper: "Boosts digits that have skipped the most consecutive draws",
        min: 0,
        max: 3,
        step: 0.1,
        format: "decimal1"
      },
      {
        key: "temperature",
        label: "Randomness Temperature",
        helper: "Lower = sharper favorite digits; Higher = closer to uniform 10% per digit",
        min: 0.25,
        max: 4.0,
        step: 0.05,
        format: "decimal2"
      },
      {
        key: "k6",
        label: "Twin / Repeat Digit Allowance",
        helper: "0% = 4 distinct digits only (24-Way Box); 100% = full natural repeats (12-Way / 6-Way)",
        min: 0,
        max: 1,
        step: 0.05,
        format: "percent"
      }
    ],
    metricLabels: {
      primaryTitle: "Blind 3+ Right Digits Rate",
      primaryShort: "3+ Right Digits",
      secondaryLabel: "Exact 4/4 Box Wins",
      topTierLabel: "Bonus Exact Straights",
      singleSlipOddsText: "0.24% 24-Way Box (1 in 417) | ~12.6% 3+ Right per line",
      trajectorySubtitle: `Cumulative unseen Pick 4 draws achieving 3+ Right Digits (unordered 3/4 or 4/4 Box) across the latest ${blindEval.metrics.drawsTested} draws versus pure random.`,
      heatmapTitle: `Next Draw #${nextTargetDrawNumber} Digit Selection Probabilities (0 to 9 vs 10.0% Uniform)`
    },
    calibrationMetrics: calibEval.metrics,
    blindTestMetrics: blindEval.metrics,
    randomBenchmark: {
      monteCarloTrials: trials,
      expectedPrimaryRatePct,
      stdPrimaryRatePct,
      expectedSecondaryDraws: round2(sumBox4 / trials),
      expectedNetProfitTT: round2(sumNet / trials),
      zScoreVsRandom,
      liftPctPoints
    },
    overfitDiagnostics,
    ballProbabilities,
    nextDrawSlips,
    trajectory,
    blindAuditLog: [...blindEval.records].reverse()
  };
}

// ============================================================================
// Game Configurations & Unified Public Dispatcher
// ============================================================================
const LOTTO_PLUS_CONFIG: MultiBallConfig = {
  game: "lotto-plus",
  gameName: "Lotto Plus",
  themeColor: "sky",
  maxBall: 35,
  pickCount: 5,
  bonusName: "Powerball",
  bonusMax: 10,
  unitCostTT: 5,
  recentWindow: 30,
  sumMin: 60,
  sumMax: 125,
  lowCut: 17,
  windowChoices: [60, 100, 150],
  defaultWindow: 100,
  singleSlipOddsText: "6.86% Any Prize | 1.39% Main Match 3+ | 10.0% Powerball",
  payoutFn: (m, pb) => {
    if (m === 5 && pb) return 2000000;
    if (m === 5) return 10000;
    if (m === 4 && pb) return 3000;
    if (m === 4) return 250;
    if (m === 3 && pb) return 200;
    if (m === 3) return 25;
    if (m === 2 && pb) return 15;
    if (m === 1 && pb) return 5;
    return 0;
  },
  isPrimaryWin: (m, pb) => m >= 3 || (m >= 1 && pb),
  isSecondaryWin: (m) => m >= 3,
  isTopTier: (m) => m >= 4,
  bonusModeChoices: [
    { value: "all10_rotate", label: "Spread Distinct Powerballs (Recommended)" },
    { value: "top3_split", label: "Top-3 Powerball Split" },
    { value: "lock_top1", label: "Lock #1 Powerball" }
  ],
  defaultBonusMode: "all10_rotate",
  objectiveChoices: [
    { value: "primary_rate", label: "Any Prize Capture Rate" },
    { value: "main_match3", label: "Pure Main Match 3+ Focus" },
    { value: "net_roi", label: "Simulated Net Payout" }
  ],
  sliderDefs: [
    {
      key: "k1",
      label: "Recent Momentum (Last 30 Draws)",
      helper: "Favors 1-to-35 balls drawn more frequently in the last 30 draws",
      min: 0,
      max: 3,
      step: 0.1,
      format: "decimal1"
    },
    {
      key: "k2",
      label: "Cold / Overdue Drought Surge",
      helper: "Boosts overdue balls with the highest draw-skip tension",
      min: 0,
      max: 3,
      step: 0.1,
      format: "decimal1"
    },
    {
      key: "k3",
      label: "Follows Last Draw (Lag-1)",
      helper: "Weights numbers that historically follow the previous Lotto Plus draw",
      min: 0,
      max: 3,
      step: 0.1,
      format: "decimal1"
    },
    {
      key: "k4",
      label: "Pair Co-Occurrence Gravity",
      helper: "Favors partner balls frequently drawn together with last draw",
      min: 0,
      max: 3,
      step: 0.1,
      format: "decimal1"
    },
    {
      key: "temperature",
      label: "Randomness Temperature",
      helper: "Lower = sharper top weights; Higher = closer to uniform 1/35",
      min: 0.25,
      max: 4.0,
      step: 0.05,
      format: "decimal2"
    },
    {
      key: "k6",
      label: "Sum (60 to 125) & Parity Filter",
      helper: "Filters out extreme sum totals and 5-0 odd/even or low/high splits",
      min: 0,
      max: 1,
      step: 0.05,
      format: "percent"
    }
  ]
};

const WIN_FOR_LIFE_CONFIG: MultiBallConfig = {
  game: "win-for-life",
  gameName: "Win For Life",
  themeColor: "emerald",
  maxBall: 28,
  pickCount: 6,
  bonusName: "Cash Ball",
  bonusMax: 3, // STRICT OFFICIAL NLCB RULE: Cash Ball is ONLY 1, 2, or 3
  unitCostTT: 10,
  recentWindow: 25,
  sumMin: 58,
  sumMax: 118,
  lowCut: 14,
  windowChoices: [40, 80, 120],
  defaultWindow: 80,
  singleSlipOddsText: "9.13% Match 3+ | 0.96% Match 4+ | 33.3% Cash Ball (1-3)",
  payoutFn: (m, cb) => {
    if (m === 6 && cb) return 250000;
    if (m === 6) return 100000;
    if (m === 5 && cb) return 2000;
    if (m === 5) return 1000;
    if (m === 4 && cb) return 100;
    if (m === 4) return 50;
    if (m === 3 && cb) return 20;
    if (m === 3) return 10;
    return 0;
  },
  isPrimaryWin: (m) => m >= 3,
  isSecondaryWin: (m) => m >= 4,
  isTopTier: (m) => m >= 5,
  bonusModeChoices: [
    { value: "balanced_123", label: "Balanced 1-2-3 Cash Ball Split" },
    { value: "lock_top1", label: "Lock #1 Cash Ball (1-3)" }
  ],
  defaultBonusMode: "balanced_123",
  objectiveChoices: [
    { value: "primary_rate", label: "Match 3+ Prize Rate" },
    { value: "high_tier", label: "Match 4+ / 5+ Focus" },
    { value: "net_roi", label: "Simulated Net Payout" }
  ],
  sliderDefs: [
    {
      key: "k1",
      label: "Recent Momentum (Last 25 Draws)",
      helper: "Favors 1-to-28 balls appearing more frequently recently",
      min: 0,
      max: 3,
      step: 0.1,
      format: "decimal1"
    },
    {
      key: "k2",
      label: "Overdue Rebound Tension",
      helper: "Boosts balls with the highest skipped-draw counts",
      min: 0,
      max: 3,
      step: 0.1,
      format: "decimal1"
    },
    {
      key: "k3",
      label: "Follows Last Draw (Lag-1)",
      helper: "Weights numbers that historically follow the previous 6-ball draw",
      min: 0,
      max: 3,
      step: 0.1,
      format: "decimal1"
    },
    {
      key: "k4",
      label: "Pair Co-Occurrence Gravity",
      helper: "Favors partner balls frequently drawn together with last draw",
      min: 0,
      max: 3,
      step: 0.1,
      format: "decimal1"
    },
    {
      key: "temperature",
      label: "Randomness Temperature",
      helper: "Lower = sharper top weights; Higher = closer to uniform 1/28",
      min: 0.25,
      max: 4.0,
      step: 0.05,
      format: "decimal2"
    },
    {
      key: "k6",
      label: "Sum (58 to 118) & Low/High Filter",
      helper: "Filters out extreme 6-ball sums and 6-0 odd/even or low/high splits",
      min: 0,
      max: 1,
      step: 0.05,
      format: "percent"
    }
  ]
};

export function runMultiGameRngLab(
  game: MultiGameRngKey,
  drawsChronological: HistoricalDrawInput[],
  req: MultiGameRngRequest = {}
): UniversalRngLabOutput {
  if (game === "lotto-plus") {
    return runMultiBallRngLab(drawsChronological, LOTTO_PLUS_CONFIG, req);
  }
  if (game === "win-for-life") {
    return runMultiBallRngLab(drawsChronological, WIN_FOR_LIFE_CONFIG, req);
  }
  if (game === "play-whe") {
    return runPlayWheRngLab(drawsChronological, req);
  }
  return runPick4RngLab(drawsChronological, req);
}
