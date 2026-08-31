/**
 * Maximum Expected Value (MEV) Engine
 * ====================================
 * Uses ALL historical draw data to build a multi-factor probabilistic scoring
 * model that ranks candidate combinations by expected value.
 *
 * Supports both:
 *  - Lotto Plus (5/36 + Powerball 1-10)
 *  - Win For Life (6/28 + Cash Ball 1-3)
 *
 * Factors computed from the database:
 *  1. Individual Number Frequency Weight (empirical vs expected)
 *  2. Exponential Recency Decay (0.985 factor, favoring active trends)
 *  3. Companion Pair Affinity Matrix (co-occurrence strength)
 *  4. Positional Frequency (which numbers appear in which sorted position)
 *  5. Sum Distribution Bell Curve Fit
 *  6. Odd/Even & High/Low Balance Score
 *  7. Consecutive Run Penalty
 *  8. Gap / Overdue Mean-Reversion Boost
 *  9. Powerball / Cash Ball Frequency & Recency Weight
 */

export interface MEVTicket {
  numbers: number[];
  bonusBall: number;
  bonusLabel: "Powerball" | "Cash Ball";
  mevScore: number;
  grade: "S" | "A+" | "A" | "B";
  breakdown: {
    frequencyScore: number;
    recencyScore: number;
    companionScore: number;
    positionalScore: number;
    balanceScore: number;
    overdueBoost: number;
  };
}

export interface MEVEngineResult {
  game: "lotto-plus" | "win-for-life";
  tickets: MEVTicket[];
  engineStats: {
    drawsAnalyzed: number;
    candidatesScored: number;
    topScoreCutoff: number;
    computeTimeMs: number;
  };
}

export interface GenericDrawRecord {
  num1: number;
  num2: number;
  num3: number;
  num4: number;
  num5: number;
  num6?: number;
  powerball?: number;
  cash_ball?: number;
}

interface GameConfig {
  game: "lotto-plus" | "win-for-life";
  poolMax: number;
  pickCount: number;
  bonusLabel: "Powerball" | "Cash Ball";
  bonusMax: number;
  targetMinSum: number;
  targetMaxSum: number;
  midPoint: number;
}

const LOTTO_PLUS_CONFIG: GameConfig = {
  game: "lotto-plus",
  poolMax: 36,
  pickCount: 5,
  bonusLabel: "Powerball",
  bonusMax: 10,
  targetMinSum: 75,
  targetMaxSum: 115,
  midPoint: 18,
};

const WIN_FOR_LIFE_CONFIG: GameConfig = {
  game: "win-for-life",
  poolMax: 28,
  pickCount: 6,
  bonusLabel: "Cash Ball",
  bonusMax: 3,
  targetMinSum: 65,
  targetMaxSum: 110,
  midPoint: 14,
};

// ─────────────────────────────────────────────────────────────────────
// 1. Build Statistical Model from Historical Data
// ─────────────────────────────────────────────────────────────────────

function buildStatisticalModel(draws: GenericDrawRecord[], config: GameConfig) {
  const totalDraws = draws.length;
  const { poolMax, pickCount, bonusMax } = config;

  // A) Raw frequency counts (1-indexed)
  const freq = new Float64Array(poolMax + 1);
  // B) Exponential recency weight (newer draws worth more)
  const recency = new Float64Array(poolMax + 1);
  // C) Last seen index (for overdue calculation)
  const lastSeen = new Int32Array(poolMax + 1).fill(-1);
  // D) Positional frequency: pos[position][number] = count
  const posFreq: Float64Array[] = Array.from({ length: pickCount }, () => new Float64Array(poolMax + 1));
  // E) Companion pair matrix (symmetric): companion[a][b] = count
  const companion: Float64Array[] = Array.from({ length: poolMax + 1 }, () => new Float64Array(poolMax + 1));
  // F) Bonus ball frequency & recency
  const bonusFreq = new Float64Array(bonusMax + 1);
  const bonusRecency = new Float64Array(bonusMax + 1);

  const decayFactor = 0.985; // Each draw older is worth 1.5% less

  for (let i = 0; i < totalDraws; i++) {
    const d = draws[i];
    const rawNums = [d.num1, d.num2, d.num3, d.num4, d.num5];
    if (pickCount === 6 && d.num6 !== undefined) {
      rawNums.push(d.num6);
    }
    const nums = rawNums.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
    const bonus = Number(d.powerball ?? d.cash_ball ?? 1);
    const weight = Math.pow(decayFactor, i); // i=0 is most recent

    // Frequency & Recency
    for (const n of nums) {
      if (n >= 1 && n <= poolMax) {
        freq[n]++;
        recency[n] += weight;
        if (lastSeen[n] === -1) lastSeen[n] = i;
      }
    }

    // Positional frequency
    for (let p = 0; p < Math.min(nums.length, pickCount); p++) {
      if (nums[p] >= 1 && nums[p] <= poolMax) {
        posFreq[p][nums[p]]++;
      }
    }

    // Companion pairs
    for (let a = 0; a < nums.length; a++) {
      for (let b = a + 1; b < nums.length; b++) {
        if (nums[a] <= poolMax && nums[b] <= poolMax) {
          companion[nums[a]][nums[b]]++;
          companion[nums[b]][nums[a]]++;
        }
      }
    }

    // Bonus Ball
    if (bonus >= 1 && bonus <= bonusMax) {
      bonusFreq[bonus]++;
      bonusRecency[bonus] += weight;
    }
  }

  // Normalize to 0-1 ranges
  const maxFreq = Math.max(1, ...Array.from(freq).slice(1));
  const maxRecency = Math.max(1, ...Array.from(recency).slice(1));
  const maxCompanion = Math.max(1, ...companion.flatMap(row => Array.from(row)));
  const maxBonusFreq = Math.max(1, ...Array.from(bonusFreq).slice(1));
  const maxBonusRecency = Math.max(1, ...Array.from(bonusRecency).slice(1));

  // Overdue scores (higher = more overdue relative to expected frequency)
  const expectedInterval = totalDraws / (totalDraws * pickCount / poolMax);
  const overdueScore = new Float64Array(poolMax + 1);
  for (let n = 1; n <= poolMax; n++) {
    const drawsAgo = lastSeen[n] === -1 ? totalDraws : lastSeen[n];
    overdueScore[n] = Math.min(1.0, drawsAgo / (expectedInterval * 3));
  }

  return {
    totalDraws,
    freq,
    recency,
    lastSeen,
    posFreq,
    companion,
    bonusFreq,
    bonusRecency,
    overdueScore,
    maxFreq,
    maxRecency,
    maxCompanion,
    maxBonusFreq,
    maxBonusRecency,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 2. Score a Single Candidate Combination
// ─────────────────────────────────────────────────────────────────────

function scoreCombination(
  nums: number[],
  model: ReturnType<typeof buildStatisticalModel>,
  config: GameConfig
) {
  const sorted = [...nums].sort((a, b) => a - b);
  const n = sorted.length;

  // 1. Frequency Score (are these historically common numbers?)
  let freqSum = 0;
  for (const num of sorted) {
    freqSum += model.freq[num] / model.maxFreq;
  }
  const frequencyScore = (freqSum / n) * 100;

  // 2. Recency Score (are these numbers trending in recent draws?)
  let recSum = 0;
  for (const num of sorted) {
    recSum += model.recency[num] / model.maxRecency;
  }
  const recencyScore = (recSum / n) * 100;

  // 3. Companion Pair Synergy (do these numbers co-occur historically?)
  let pairScore = 0;
  let pairCount = 0;
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      pairScore += model.companion[sorted[a]][sorted[b]] / model.maxCompanion;
      pairCount++;
    }
  }
  const companionScore = pairCount > 0 ? (pairScore / pairCount) * 100 : 50;

  // 4. Positional Fitness
  let posScore = 0;
  for (let p = 0; p < Math.min(n, config.pickCount); p++) {
    const posMax = Math.max(...Array.from(model.posFreq[p]).slice(1));
    if (posMax > 0) {
      posScore += (model.posFreq[p][sorted[p]] / posMax) * 100;
    }
  }
  const positionalScore = posScore / Math.min(n, config.pickCount);

  // 5. Balance Score (odd/even, high/low, sum bell curve, consecutive run)
  let balance = 100;

  // Odd/Even
  const oddCount = sorted.filter(v => v % 2 !== 0).length;
  if (config.pickCount === 5) {
    if (oddCount === 0 || oddCount === 5) balance -= 30;
    else if (oddCount === 1 || oddCount === 4) balance -= 10;
  } else {
    // 6 picks
    if (oddCount === 0 || oddCount === 6) balance -= 30;
    else if (oddCount === 1 || oddCount === 5) balance -= 15;
    else if (oddCount === 3) balance += 5; // 3:3 is ideal
  }

  // High/Low
  const lowCount = sorted.filter(v => v <= config.midPoint).length;
  if (config.pickCount === 5) {
    if (lowCount === 0 || lowCount === 5) balance -= 30;
    else if (lowCount === 1 || lowCount === 4) balance -= 10;
  } else {
    if (lowCount === 0 || lowCount === 6) balance -= 30;
    else if (lowCount === 1 || lowCount === 5) balance -= 15;
    else if (lowCount === 3) balance += 5;
  }

  // Sum bell curve
  const sum = sorted.reduce((a, b) => a + b, 0);
  const targetMean = (config.targetMinSum + config.targetMaxSum) / 2;
  const sumDiff = Math.abs(sum - targetMean);
  if (sumDiff > 35) balance -= 30;
  else if (sumDiff > 20) balance -= 15;

  // Consecutive run penalty
  let maxRun = 1, curRun = 1;
  for (let i = 1; i < n; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      curRun++;
      if (curRun > maxRun) maxRun = curRun;
    } else {
      curRun = 1;
    }
  }
  if (maxRun >= 4) balance -= 40;
  else if (maxRun === 3) balance -= 15;

  // Spread (min to max difference)
  const spread = sorted[n - 1] - sorted[0];
  if (spread < 10) balance -= 30;

  const balanceScore = Math.max(0, Math.min(100, balance));

  // 6. Overdue Mean-Reversion Boost
  let overdueSum = 0;
  for (const num of sorted) {
    overdueSum += model.overdueScore[num];
  }
  const overdueBoost = (overdueSum / n) * 100;

  // Weighted Final Score
  const total =
    frequencyScore * 0.18 +
    recencyScore * 0.22 +
    companionScore * 0.15 +
    positionalScore * 0.15 +
    balanceScore * 0.18 +
    overdueBoost * 0.12;

  return {
    total,
    frequencyScore: Math.round(frequencyScore * 10) / 10,
    recencyScore: Math.round(recencyScore * 10) / 10,
    companionScore: Math.round(companionScore * 10) / 10,
    positionalScore: Math.round(positionalScore * 10) / 10,
    balanceScore: Math.round(balanceScore * 10) / 10,
    overdueBoost: Math.round(overdueBoost * 10) / 10,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 3. Stochastic Sampling Engine
// ─────────────────────────────────────────────────────────────────────

function generateWeightedCandidate(
  model: ReturnType<typeof buildStatisticalModel>,
  config: GameConfig
): number[] {
  const { poolMax, pickCount } = config;

  const weights = new Float64Array(poolMax + 1);
  for (let n = 1; n <= poolMax; n++) {
    weights[n] =
      (model.freq[n] / model.maxFreq) * 0.3 +
      (model.recency[n] / model.maxRecency) * 0.4 +
      model.overdueScore[n] * 0.3;
  }

  const totalWeight = Array.from(weights).slice(1).reduce((a, b) => a + b, 0);
  const selected: number[] = [];

  let attempts = 0;
  while (selected.length < pickCount && attempts < 200) {
    let r = Math.random() * totalWeight;
    for (let n = 1; n <= poolMax; n++) {
      r -= weights[n];
      if (r <= 0 && !selected.includes(n)) {
        selected.push(n);
        break;
      }
    }
    attempts++;
    // Fallback if needed
    if (selected.length < pickCount && attempts >= 100) {
      for (let n = 1; n <= poolMax; n++) {
        if (!selected.includes(n)) {
          selected.push(n);
          if (selected.length === pickCount) break;
        }
      }
    }
  }

  return selected.sort((a, b) => a - b);
}

function selectBonusBall(
  model: ReturnType<typeof buildStatisticalModel>,
  config: GameConfig
): number {
  const { bonusMax } = config;
  const weights = new Float64Array(bonusMax + 1);
  for (let p = 1; p <= bonusMax; p++) {
    weights[p] =
      (model.bonusFreq[p] / model.maxBonusFreq) * 0.4 +
      (model.bonusRecency[p] / model.maxBonusRecency) * 0.6;
  }
  const totalWeight = Array.from(weights).slice(1).reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let p = 1; p <= bonusMax; p++) {
    r -= weights[p];
    if (r <= 0) return p;
  }
  return Math.floor(Math.random() * bonusMax) + 1;
}

// ─────────────────────────────────────────────────────────────────────
// 4. Main Engine Export
// ─────────────────────────────────────────────────────────────────────

export function runMEVEngine(
  historicalDraws: GenericDrawRecord[],
  ticketCount: number = 5,
  candidatePoolSize: number = 25000,
  game: "lotto-plus" | "win-for-life" = "lotto-plus"
): MEVEngineResult {
  const startTime = performance.now();
  const config = game === "win-for-life" ? WIN_FOR_LIFE_CONFIG : LOTTO_PLUS_CONFIG;

  // Step 1: Build statistical model from ALL historical draws
  const model = buildStatisticalModel(historicalDraws, config);

  // Step 2: Generate weighted stochastic candidates
  const candidates: { nums: number[]; score: ReturnType<typeof scoreCombination> }[] = [];

  for (let i = 0; i < candidatePoolSize; i++) {
    const nums = generateWeightedCandidate(model, config);
    const score = scoreCombination(nums, model, config);
    candidates.push({ nums, score });
  }

  // Step 3: Sort by MEV score descending
  candidates.sort((a, b) => b.score.total - a.score.total);

  // Step 4: Pick top unique candidates
  const seen = new Set<string>();
  const topTickets: MEVTicket[] = [];

  for (const c of candidates) {
    const key = c.nums.join(",");
    if (seen.has(key)) continue;
    seen.add(key);

    const bonus = selectBonusBall(model, config);

    let grade: "S" | "A+" | "A" | "B" = "B";
    if (c.score.total >= 80) grade = "S";
    else if (c.score.total >= 70) grade = "A+";
    else if (c.score.total >= 60) grade = "A";

    topTickets.push({
      numbers: c.nums,
      bonusBall: bonus,
      bonusLabel: config.bonusLabel,
      mevScore: Math.round(c.score.total * 10) / 10,
      grade,
      breakdown: {
        frequencyScore: c.score.frequencyScore,
        recencyScore: c.score.recencyScore,
        companionScore: c.score.companionScore,
        positionalScore: c.score.positionalScore,
        balanceScore: c.score.balanceScore,
        overdueBoost: c.score.overdueBoost,
      },
    });

    if (topTickets.length >= ticketCount) break;
  }

  const computeTimeMs = Math.round(performance.now() - startTime);

  return {
    game,
    tickets: topTickets,
    engineStats: {
      drawsAnalyzed: model.totalDraws,
      candidatesScored: candidatePoolSize,
      topScoreCutoff: topTickets.length > 0 ? topTickets[topTickets.length - 1].mevScore : 0,
      computeTimeMs,
    },
  };
}
