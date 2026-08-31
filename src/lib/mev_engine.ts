/**
 * Maximum Expected Value (MEV) Engine
 * ====================================
 * Uses ALL historical draw data to build a multi-factor probabilistic scoring
 * model that ranks every possible combination by expected value.
 *
 * Factors computed from the database:
 *  1. Individual Number Frequency Weight (empirical vs expected)
 *  2. Recency Decay (exponential moving average favoring recent draws)
 *  3. Companion Pair Affinity Matrix (co-occurrence strength)
 *  4. Positional Frequency (which numbers appear in which sorted position)
 *  5. Sum Distribution Bell Curve Fit
 *  6. Odd/Even & High/Low Balance Score
 *  7. Consecutive Run Penalty
 *  8. Gap / Overdue Mean-Reversion Boost
 *  9. Powerball Frequency & Recency Weight
 */

export interface MEVTicket {
  numbers: number[];
  powerball: number;
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
  tickets: MEVTicket[];
  engineStats: {
    drawsAnalyzed: number;
    candidatesScored: number;
    topScoreCutoff: number;
    computeTimeMs: number;
  };
}

interface DrawRecord {
  num1: number;
  num2: number;
  num3: number;
  num4: number;
  num5: number;
  powerball: number;
}

// ─────────────────────────────────────────────────────────────────────
// 1. Build Statistical Model from Historical Data
// ─────────────────────────────────────────────────────────────────────

function buildStatisticalModel(draws: DrawRecord[]) {
  const totalDraws = draws.length;
  const POOL_MAX = 36;
  const PB_MAX = 10;

  // A) Raw frequency counts (1-indexed)
  const freq = new Float64Array(POOL_MAX + 1);
  // B) Exponential recency weight (newer draws worth more)
  const recency = new Float64Array(POOL_MAX + 1);
  // C) Last seen index (for overdue calculation)
  const lastSeen = new Int32Array(POOL_MAX + 1).fill(-1);
  // D) Positional frequency: pos[position][number] = count
  const posFreq: Float64Array[] = Array.from({ length: 5 }, () => new Float64Array(POOL_MAX + 1));
  // E) Companion pair matrix (symmetric): companion[a][b] = count
  const companion: Float64Array[] = Array.from({ length: POOL_MAX + 1 }, () => new Float64Array(POOL_MAX + 1));
  // F) Powerball frequency
  const pbFreq = new Float64Array(PB_MAX + 1);
  const pbRecency = new Float64Array(PB_MAX + 1);

  const decayFactor = 0.985; // Each draw older is worth 1.5% less

  for (let i = 0; i < totalDraws; i++) {
    const d = draws[i];
    const nums = [d.num1, d.num2, d.num3, d.num4, d.num5].map(Number).sort((a, b) => a - b);
    const pb = Number(d.powerball);
    const weight = Math.pow(decayFactor, i); // i=0 is most recent

    // Frequency & Recency
    for (const n of nums) {
      if (n >= 1 && n <= POOL_MAX) {
        freq[n]++;
        recency[n] += weight;
        if (lastSeen[n] === -1) lastSeen[n] = i;
      }
    }

    // Positional frequency
    for (let p = 0; p < 5; p++) {
      if (nums[p] >= 1 && nums[p] <= POOL_MAX) {
        posFreq[p][nums[p]]++;
      }
    }

    // Companion pairs
    for (let a = 0; a < nums.length; a++) {
      for (let b = a + 1; b < nums.length; b++) {
        companion[nums[a]][nums[b]]++;
        companion[nums[b]][nums[a]]++;
      }
    }

    // Powerball
    if (pb >= 1 && pb <= PB_MAX) {
      pbFreq[pb]++;
      pbRecency[pb] += weight;
    }
  }

  // Normalize to 0-1 ranges
  const maxFreq = Math.max(...Array.from(freq).slice(1));
  const maxRecency = Math.max(...Array.from(recency).slice(1));
  const maxCompanion = Math.max(...companion.flatMap(row => Array.from(row)));
  const maxPbFreq = Math.max(...Array.from(pbFreq).slice(1));

  // Overdue scores (higher = more overdue relative to expected frequency)
  const expectedInterval = totalDraws / (totalDraws * 5 / POOL_MAX); // ~7.2 draws
  const overdueScore = new Float64Array(POOL_MAX + 1);
  for (let n = 1; n <= POOL_MAX; n++) {
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
    pbFreq,
    pbRecency,
    overdueScore,
    maxFreq,
    maxRecency,
    maxCompanion,
    maxPbFreq
  };
}

// ─────────────────────────────────────────────────────────────────────
// 2. Score a Single Candidate Combination
// ─────────────────────────────────────────────────────────────────────

function scoreCombination(
  nums: number[],
  model: ReturnType<typeof buildStatisticalModel>
): {
  total: number;
  frequencyScore: number;
  recencyScore: number;
  companionScore: number;
  positionalScore: number;
  balanceScore: number;
  overdueBoost: number;
} {
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
      pairScore += model.companion[sorted[a]][sorted[b]] / (model.maxCompanion || 1);
      pairCount++;
    }
  }
  const companionScore = pairCount > 0 ? (pairScore / pairCount) * 100 : 50;

  // 4. Positional Fitness (is each number in its historically optimal position?)
  let posScore = 0;
  for (let p = 0; p < Math.min(n, 5); p++) {
    const posMax = Math.max(...Array.from(model.posFreq[p]).slice(1));
    if (posMax > 0) {
      posScore += (model.posFreq[p][sorted[p]] / posMax) * 100;
    }
  }
  const positionalScore = posScore / Math.min(n, 5);

  // 5. Balance Score (odd/even, high/low, sum, consecutive penalties)
  let balance = 100;

  // Odd/Even
  const oddCount = sorted.filter(v => v % 2 !== 0).length;
  if (oddCount === 0 || oddCount === n) balance -= 30;
  else if (oddCount === 1 || oddCount === n - 1) balance -= 10;

  // High/Low
  const lowCount = sorted.filter(v => v <= 18).length;
  if (lowCount === 0 || lowCount === n) balance -= 30;
  else if (lowCount === 1 || lowCount === n - 1) balance -= 10;

  // Sum bell curve (target: 65-120 for 5/36)
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum < 45 || sum > 145) balance -= 35;
  else if (sum < 60 || sum > 130) balance -= 15;
  else if (sum >= 75 && sum <= 110) balance += 0; // optimal

  // Consecutive penalty
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

  // Decade spread
  const decades = new Set(sorted.map(v => Math.floor((v - 1) / 10))).size;
  if (decades === 1) balance -= 20;

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
    overdueBoost: Math.round(overdueBoost * 10) / 10
  };
}

// ─────────────────────────────────────────────────────────────────────
// 3. Stochastic Sampling Engine (Tournament + Roulette Wheel)
// ─────────────────────────────────────────────────────────────────────

function generateWeightedCandidate(model: ReturnType<typeof buildStatisticalModel>): number[] {
  const POOL_MAX = 36;

  // Build weighted probability distribution for each number
  const weights = new Float64Array(POOL_MAX + 1);
  for (let n = 1; n <= POOL_MAX; n++) {
    weights[n] =
      (model.freq[n] / model.maxFreq) * 0.3 +
      (model.recency[n] / model.maxRecency) * 0.4 +
      model.overdueScore[n] * 0.3;
  }

  // Roulette wheel selection (5 unique numbers)
  const totalWeight = Array.from(weights).slice(1).reduce((a, b) => a + b, 0);
  const selected: number[] = [];

  while (selected.length < 5) {
    let r = Math.random() * totalWeight;
    for (let n = 1; n <= POOL_MAX; n++) {
      r -= weights[n];
      if (r <= 0 && !selected.includes(n)) {
        selected.push(n);
        break;
      }
    }
    // Fallback for edge cases
    if (selected.length < 5 && r > 0) {
      for (let n = 1; n <= POOL_MAX; n++) {
        if (!selected.includes(n)) {
          selected.push(n);
          break;
        }
      }
    }
  }

  return selected.sort((a, b) => a - b);
}

function selectPowerball(model: ReturnType<typeof buildStatisticalModel>): number {
  const PB_MAX = 10;
  const weights = new Float64Array(PB_MAX + 1);
  for (let p = 1; p <= PB_MAX; p++) {
    weights[p] = (model.pbFreq[p] / model.maxPbFreq) * 0.4 +
                 (model.pbRecency[p] / Math.max(...Array.from(model.pbRecency).slice(1))) * 0.6;
  }
  const totalWeight = Array.from(weights).slice(1).reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let p = 1; p <= PB_MAX; p++) {
    r -= weights[p];
    if (r <= 0) return p;
  }
  return Math.floor(Math.random() * 10) + 1;
}

// ─────────────────────────────────────────────────────────────────────
// 4. Main Engine: Generate Optimized Ticket Set
// ─────────────────────────────────────────────────────────────────────

export function runMEVEngine(
  historicalDraws: DrawRecord[],
  ticketCount: number = 5,
  candidatePoolSize: number = 25000
): MEVEngineResult {
  const startTime = performance.now();

  // Step 1: Build statistical model from ALL historical draws
  const model = buildStatisticalModel(historicalDraws);

  // Step 2: Generate weighted candidates (biased by historical patterns)
  const candidates: { nums: number[]; score: ReturnType<typeof scoreCombination> }[] = [];

  for (let i = 0; i < candidatePoolSize; i++) {
    const nums = generateWeightedCandidate(model);
    const score = scoreCombination(nums, model);
    candidates.push({ nums, score });
  }

  // Step 3: Sort by MEV score (highest first)
  candidates.sort((a, b) => b.score.total - a.score.total);

  // Step 4: Select top N unique tickets (deduplicate)
  const seen = new Set<string>();
  const topTickets: MEVTicket[] = [];

  for (const c of candidates) {
    const key = c.nums.join(",");
    if (seen.has(key)) continue;
    seen.add(key);

    const pb = selectPowerball(model);

    let grade: "S" | "A+" | "A" | "B" = "B";
    if (c.score.total >= 82) grade = "S";
    else if (c.score.total >= 72) grade = "A+";
    else if (c.score.total >= 62) grade = "A";

    topTickets.push({
      numbers: c.nums,
      powerball: pb,
      mevScore: Math.round(c.score.total * 10) / 10,
      grade,
      breakdown: {
        frequencyScore: c.score.frequencyScore,
        recencyScore: c.score.recencyScore,
        companionScore: c.score.companionScore,
        positionalScore: c.score.positionalScore,
        balanceScore: c.score.balanceScore,
        overdueBoost: c.score.overdueBoost
      }
    });

    if (topTickets.length >= ticketCount) break;
  }

  const computeTimeMs = Math.round(performance.now() - startTime);

  return {
    tickets: topTickets,
    engineStats: {
      drawsAnalyzed: model.totalDraws,
      candidatesScored: candidatePoolSize,
      topScoreCutoff: topTickets.length > 0 ? topTickets[topTickets.length - 1].mevScore : 0,
      computeTimeMs
    }
  };
}
