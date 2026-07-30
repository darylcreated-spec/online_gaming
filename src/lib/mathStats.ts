/**
 * mathStats.ts — Advanced Mathematical & Statistical Engine
 * Win Concept Lottery Analytics Platform
 *
 * Provides 8 independent statistical models:
 *  1. EWMA (Exponential Weighted Moving Average) Frequency
 *  2. RTM Z-Score (Regression to the Mean)
 *  3. Autocorrelation Lag Analysis
 *  4. Chi-Square Goodness-of-Fit Test
 *  5. Shannon Entropy Score
 *  6. Bayesian Probability Updating
 *  7. Monte Carlo Coverage Simulation
 *  8. Kelly Criterion Bet Sizing
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. EWMA — Exponential Weighted Moving Average Frequency
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Computes EWMA-weighted frequency score for each number in the draw history.
 * Recent draws count exponentially more than older ones.
 *
 * @param draws    Ordered array of drawn numbers (most recent first)
 * @param poolSize Total number of possible outcomes (36 for Play Whe, 35 for Lotto, 28 for WFL)
 * @param alpha    Decay factor 0 < α ≤ 1. Higher α = stronger recency bias. Default 0.1
 * @returns        Record<number, number> mapping each number to its EWMA score
 */
export function computeEWMA(
  draws: number[],
  poolSize: number,
  alpha: number = 0.1
): Record<number, number> {
  const scores: Record<number, number> = {};
  for (let i = 1; i <= poolSize; i++) scores[i] = 0;

  // Process draws oldest-to-newest (reverse of input) to build EWMA forward
  const reversed = [...draws].reverse();
  for (let t = 0; t < reversed.length; t++) {
    const n = reversed[t];
    if (n >= 1 && n <= poolSize) {
      // Exponential update: new value = alpha * 1 (hit) + (1-alpha) * old
      scores[n] = alpha * 1 + (1 - alpha) * scores[n];
    }
    // Decay all non-hit numbers
    for (let i = 1; i <= poolSize; i++) {
      if (i !== n) {
        scores[i] = (1 - alpha) * scores[i];
      }
    }
  }

  return scores;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. RTM Z-Score — Regression to the Mean
// ─────────────────────────────────────────────────────────────────────────────
export interface ZScoreResult {
  zScore: number;
  observedRate: number;
  expectedRate: number;
  signal: "rebound" | "suppress" | "neutral";
  isSignificant: boolean;
}

/**
 * Computes Z-Score deviation for each number vs the expected uniform distribution.
 * Z < -2.0 → statistically underrepresented (rebound candidate)
 * Z > +2.0 → statistically overrepresented (suppress candidate)
 *
 * @param draws     Ordered array of drawn numbers
 * @param poolSize  Total possible outcomes
 * @param windowSize Number of recent draws to analyze (default: all)
 */
export function computeRTMZScores(
  draws: number[],
  poolSize: number,
  windowSize?: number
): Record<number, ZScoreResult> {
  const window = windowSize ? draws.slice(0, windowSize) : draws;
  const n = window.length;
  const expectedRate = 1 / poolSize;
  const results: Record<number, ZScoreResult> = {};

  // Count occurrences
  const counts: Record<number, number> = {};
  for (let i = 1; i <= poolSize; i++) counts[i] = 0;
  window.forEach(d => { if (d >= 1 && d <= poolSize) counts[d]++; });

  for (let i = 1; i <= poolSize; i++) {
    const observedRate = counts[i] / n;
    // Standard error for a proportion: sqrt(p*(1-p)/n)
    const stdError = Math.sqrt((expectedRate * (1 - expectedRate)) / n);
    const zScore = stdError > 0 ? (observedRate - expectedRate) / stdError : 0;

    let signal: "rebound" | "suppress" | "neutral" = "neutral";
    if (zScore < -1.5) signal = "rebound";
    else if (zScore > 1.5) signal = "suppress";

    results[i] = {
      zScore: Math.round(zScore * 100) / 100,
      observedRate: Math.round(observedRate * 10000) / 100, // as %
      expectedRate: Math.round(expectedRate * 10000) / 100,
      signal,
      isSignificant: Math.abs(zScore) >= 1.96,
    };
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Autocorrelation Lag Analysis
// ─────────────────────────────────────────────────────────────────────────────
export interface AutocorrelationResult {
  lag: number;
  coefficient: number;
  isSignificant: boolean; // |r| > 2/sqrt(n) at 95% CI
}

/**
 * Computes lag-k autocorrelation for a specific number's appearance series.
 * Positive r_k means the number tends to re-appear k draws after it last appeared.
 *
 * @param draws   Array of drawn numbers (most recent first)
 * @param target  The specific number to analyze
 * @param maxLag  Maximum lag to compute (default: 10)
 */
export function computeAutocorrelation(
  draws: number[],
  target: number,
  maxLag: number = 10
): AutocorrelationResult[] {
  // Build binary series: 1 if target appeared, 0 otherwise
  const series: number[] = draws.map(d => (d === target ? 1 : 0));
  const n = series.length;
  const mean = series.reduce((a, b) => a + b, 0) / n;
  const variance = series.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;

  const results: AutocorrelationResult[] = [];
  const ciThreshold = 2 / Math.sqrt(n);

  for (let lag = 1; lag <= Math.min(maxLag, n - 1); lag++) {
    let covSum = 0;
    for (let t = 0; t < n - lag; t++) {
      covSum += (series[t] - mean) * (series[t + lag] - mean);
    }
    const covariance = covSum / (n - lag);
    const coefficient = variance > 0 ? covariance / variance : 0;

    results.push({
      lag,
      coefficient: Math.round(coefficient * 1000) / 1000,
      isSignificant: Math.abs(coefficient) > ciThreshold,
    });
  }

  return results;
}

/**
 * Computes the top-N numbers with the strongest significant autocorrelation at a given lag.
 *
 * @param draws   Array of all drawn numbers (most recent first)
 * @param poolSize Total possible outcomes
 * @param lag     Specific lag to analyze (default: 3)
 * @param topN    How many numbers to return (default: 10)
 */
export function computeTopAutocorrelationNumbers(
  draws: number[],
  poolSize: number,
  lag: number = 3,
  topN: number = 10
): { num: number; coefficient: number; isSignificant: boolean }[] {
  const results: { num: number; coefficient: number; isSignificant: boolean }[] = [];

  for (let i = 1; i <= poolSize; i++) {
    const acf = computeAutocorrelation(draws, i, lag);
    const lagResult = acf.find(r => r.lag === lag);
    if (lagResult) {
      results.push({
        num: i,
        coefficient: lagResult.coefficient,
        isSignificant: lagResult.isSignificant,
      });
    }
  }

  return results
    .sort((a, b) => b.coefficient - a.coefficient)
    .slice(0, topN);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Chi-Square Goodness-of-Fit Test
// ─────────────────────────────────────────────────────────────────────────────
export interface ChiSquareResult {
  statistic: number;
  degreesOfFreedom: number;
  pValue: number;       // Approximated using chi-square CDF
  isNonRandom: boolean; // p < 0.05 → distribution is non-random
  interpretation: string;
}

/**
 * Tests whether the observed draw frequency distribution deviates significantly
 * from a perfectly uniform random distribution.
 * p < 0.05 → statistically significant non-randomness detected.
 */
export function computeChiSquare(
  draws: number[],
  poolSize: number
): ChiSquareResult {
  const n = draws.length;
  const expected = n / poolSize;

  const counts: Record<number, number> = {};
  for (let i = 1; i <= poolSize; i++) counts[i] = 0;
  draws.forEach(d => { if (d >= 1 && d <= poolSize) counts[d]++; });

  let chiSq = 0;
  for (let i = 1; i <= poolSize; i++) {
    chiSq += Math.pow(counts[i] - expected, 2) / expected;
  }

  const df = poolSize - 1;

  // Approximate p-value using chi-square CDF (regularized incomplete gamma)
  const pValue = chiSquarePValue(chiSq, df);
  const isNonRandom = pValue < 0.05;

  return {
    statistic: Math.round(chiSq * 100) / 100,
    degreesOfFreedom: df,
    pValue: Math.round(pValue * 10000) / 10000,
    isNonRandom,
    interpretation: isNonRandom
      ? `Non-random pattern detected (χ²=${chiSq.toFixed(1)}, p=${pValue.toFixed(4)}). Certain numbers draw at above/below-expected rates.`
      : `Distribution appears uniform (χ²=${chiSq.toFixed(1)}, p=${pValue.toFixed(4)}). Draws are consistent with randomness.`,
  };
}

/** Chi-Square p-value via regularized incomplete gamma function approximation */
function chiSquarePValue(x: number, df: number): number {
  // Use the Wilson-Hilferty normal approximation for p-value
  if (x <= 0) return 1.0;
  const k = df;
  const z = Math.pow(x / k, 1 / 3) - (1 - 2 / (9 * k));
  const sigma = Math.sqrt(2 / (9 * k));
  const zNorm = z / sigma;
  // P(Z > zNorm) using complementary error function
  return 1 - normalCDF(zNorm);
}

function normalCDF(z: number): number {
  // Abramowitz & Stegun approximation
  if (z < -8) return 0;
  if (z > 8) return 1;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530
    + t * (-0.356563782
    + t * (1.781477937
    + t * (-1.821255978
    + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Shannon Entropy Score
// ─────────────────────────────────────────────────────────────────────────────
export interface EntropyResult {
  entropy: number;        // Raw Shannon entropy H bits
  maxEntropy: number;     // log2(poolSize)
  ratio: number;          // entropy / maxEntropy (0-1)
  signal: "predictable" | "moderate" | "random";
  interpretation: string;
}

/**
 * Computes Shannon entropy for the most recent N draws.
 * Low ratio (< 0.85) → distribution is skewed → more predictable → increase confidence.
 * High ratio (> 0.95) → maximally random → reduce bet exposure.
 *
 * @param draws      Array of drawn numbers (most recent first)
 * @param poolSize   Total possible outcomes
 * @param windowSize Rolling window of recent draws to analyze (default: 40)
 */
export function computeShannonEntropy(
  draws: number[],
  poolSize: number,
  windowSize: number = 40
): EntropyResult {
  const window = draws.slice(0, Math.min(windowSize, draws.length));
  const n = window.length;

  const counts: Record<number, number> = {};
  for (let i = 1; i <= poolSize; i++) counts[i] = 0;
  window.forEach(d => { if (d >= 1 && d <= poolSize) counts[d]++; });

  let entropy = 0;
  for (let i = 1; i <= poolSize; i++) {
    const p = counts[i] / n;
    if (p > 0) entropy -= p * Math.log2(p);
  }

  const maxEntropy = Math.log2(poolSize);
  const ratio = entropy / maxEntropy;

  let signal: "predictable" | "moderate" | "random" = "moderate";
  if (ratio < 0.85) signal = "predictable";
  else if (ratio > 0.95) signal = "random";

  return {
    entropy: Math.round(entropy * 1000) / 1000,
    maxEntropy: Math.round(maxEntropy * 1000) / 1000,
    ratio: Math.round(ratio * 1000) / 1000,
    signal,
    interpretation:
      ratio < 0.85
        ? `Draw distribution is skewed (entropy ${(ratio * 100).toFixed(1)}% of max). Patterns are emerging — increase prediction confidence.`
        : ratio > 0.95
        ? `Draw distribution is highly uniform (entropy ${(ratio * 100).toFixed(1)}% of max). Draws appear maximally random — maintain normal exposure.`
        : `Draw distribution is moderately uniform (entropy ${(ratio * 100).toFixed(1)}% of max).`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Bayesian Probability Updating
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Updates a flat prior probability distribution with observed draw evidence.
 * Uses Dirichlet-Multinomial Bayesian update (conjugate prior for categorical data).
 *
 * @param draws      Array of drawn numbers (most recent first)
 * @param poolSize   Total possible outcomes
 * @param alpha0     Prior strength (pseudo-count per category). Default 1.0 (uniform Dirichlet)
 * @param decayHalfLife Recent draws decay half-life in number of draws. Default 50.
 * @returns          Record<number, number> posterior probability per number (sums to 1)
 */
export function computeBayesianPosterior(
  draws: number[],
  poolSize: number,
  alpha0: number = 1.0,
  decayHalfLife: number = 50
): Record<number, number> {
  // Initialize Dirichlet prior counts
  const alphaCounts: Record<number, number> = {};
  for (let i = 1; i <= poolSize; i++) alphaCounts[i] = alpha0;

  // Update posterior with observed draws, weighted by exponential recency decay
  draws.forEach((d, idx) => {
    if (d >= 1 && d <= poolSize) {
      const weight = Math.pow(0.5, idx / decayHalfLife);
      alphaCounts[d] += weight;
    }
  });

  // Normalize to posterior probabilities
  const totalAlpha = Object.values(alphaCounts).reduce((a, b) => a + b, 0);
  const posterior: Record<number, number> = {};
  for (let i = 1; i <= poolSize; i++) {
    posterior[i] = alphaCounts[i] / totalAlpha;
  }

  return posterior;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Monte Carlo Coverage Simulation
// ─────────────────────────────────────────────────────────────────────────────
export interface MonteCarloResult {
  coverageProbability: number;  // Probability (0-1) that predicted set covers winning number
  coveragePercent: number;      // As percentage, rounded to 1 decimal
  simulations: number;
  interpretation: string;
}

/**
 * Simulates N draws using weighted probabilities and measures how often the
 * predicted set covers at least one winning number.
 *
 * @param weights        Probability weight per number (Record<number, number>)
 * @param predictedSet   The predicted numbers to test coverage for
 * @param poolSize       Total possible outcomes
 * @param simCount       Number of Monte Carlo simulations (default: 10000)
 * @param picksPerDraw   How many numbers are drawn per draw (1 for Play Whe, 6 for WFL)
 */
export function computeMonteCarlo(
  weights: Record<number, number>,
  predictedSet: number[],
  poolSize: number,
  simCount: number = 10000,
  picksPerDraw: number = 1
): MonteCarloResult {
  // Build cumulative probability array for fast sampling
  const nums = Object.keys(weights).map(Number).sort((a, b) => a - b);
  const totalWeight = nums.reduce((s, n) => s + (weights[n] || 0), 0);
  
  const cumulative: { num: number; cumProb: number }[] = [];
  let cumProb = 0;
  for (const n of nums) {
    cumProb += (weights[n] || 0) / totalWeight;
    cumulative.push({ num: n, cumProb });
  }

  const predictedSet_ = new Set(predictedSet);
  let hits = 0;

  // Fast LCG PRNG for performance
  let seed = 0xDEADBEEF + simCount;
  const fastRand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (seed >>> 0) / 0xFFFFFFFF;
  };

  const sampleOne = (): number => {
    const r = fastRand();
    for (const { num, cumProb: cp } of cumulative) {
      if (r <= cp) return num;
    }
    return cumulative[cumulative.length - 1].num;
  };

  for (let sim = 0; sim < simCount; sim++) {
    // Simulate a single draw (picksPerDraw numbers without replacement)
    if (picksPerDraw === 1) {
      const drawn = sampleOne();
      if (predictedSet_.has(drawn)) hits++;
    } else {
      // Multi-ball draw (Win for Life, Lotto Plus): sample without replacement
      const drawn = new Set<number>();
      let attempts = 0;
      while (drawn.size < picksPerDraw && attempts < poolSize * 3) {
        drawn.add(sampleOne());
        attempts++;
      }
      // Check if any predicted number was drawn
      for (const d of drawn) {
        if (predictedSet_.has(d)) { hits++; break; }
      }
    }
  }

  const coverageProbability = hits / simCount;
  const coveragePercent = Math.round(coverageProbability * 1000) / 10;

  return {
    coverageProbability,
    coveragePercent,
    simulations: simCount,
    interpretation: `Your ${predictedSet.length} picks cover a winning number in ${coveragePercent}% of ${simCount.toLocaleString()} simulated draws.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Kelly Criterion Bet Sizing
// ─────────────────────────────────────────────────────────────────────────────
export interface KellyResult {
  kellyFraction: number;     // Optimal fraction of bankroll to bet (0-1)
  kellyPercent: number;      // As percentage
  recommendedBet: number;   // Recommended $ bet given a budget
  halfKelly: number;        // Conservative half-Kelly bet (recommended for safety)
  interpretation: string;
}

/**
 * Computes the Kelly Criterion optimal bet fraction given estimated win probability and payout odds.
 *
 * Kelly formula: f* = (b*p - q) / b
 * where b = net payout odds (payout per $1 risked), p = win probability, q = 1 - p
 *
 * @param winProbability  Estimated probability of winning (0-1)
 * @param payoutOdds      Net payout per $1 bet (e.g., 24 for Play Whe which pays $24 on $1)
 * @param budget          Total bankroll/budget in dollars (default: 100)
 */
export function computeKellyCriterion(
  winProbability: number,
  payoutOdds: number,
  budget: number = 100
): KellyResult {
  const p = Math.max(0, Math.min(1, winProbability));
  const q = 1 - p;
  const b = payoutOdds;

  // Kelly fraction (clamp to [0, 1])
  const kellyFraction = Math.max(0, Math.min(1, (b * p - q) / b));
  const kellyPercent = Math.round(kellyFraction * 1000) / 10;

  const recommendedBet = Math.round(budget * kellyFraction * 100) / 100;
  const halfKelly = Math.round(budget * kellyFraction * 0.5 * 100) / 100;

  let interpretation = "";
  if (kellyFraction === 0) {
    interpretation = `No positive edge detected. Kelly recommends $0 — do not bet.`;
  } else {
    interpretation = `Kelly optimal: ${kellyPercent}% of bankroll ($${recommendedBet.toFixed(2)} of $${budget}). Half-Kelly (safer): $${halfKelly.toFixed(2)}.`;
  }

  return {
    kellyFraction: Math.round(kellyFraction * 10000) / 10000,
    kellyPercent,
    recommendedBet,
    halfKelly,
    interpretation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Compute EWMA-based score array for ensemble use
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns top-N numbers ranked by EWMA score, suitable for ensemble voting.
 */
export function ewmaTopN(
  draws: number[],
  poolSize: number,
  topN: number,
  alpha: number = 0.1
): number[] {
  const scores = computeEWMA(draws, poolSize, alpha);
  return Object.entries(scores)
    .map(([n, s]) => ({ num: Number(n), score: s }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(c => c.num);
}

/**
 * Returns top-N rebound candidates (numbers with strongest negative Z-Score)
 */
export function rtmReboundTopN(
  draws: number[],
  poolSize: number,
  topN: number,
  windowSize?: number
): number[] {
  const zScores = computeRTMZScores(draws, poolSize, windowSize);
  return Object.entries(zScores)
    .map(([n, r]) => ({ num: Number(n), zScore: r.zScore }))
    .filter(c => c.zScore < 0) // only underrepresented
    .sort((a, b) => a.zScore - b.zScore) // most negative first
    .slice(0, topN)
    .map(c => c.num);
}

/**
 * Returns top-N numbers with strongest positive lag-k autocorrelation
 */
export function autocorrelationTopN(
  draws: number[],
  poolSize: number,
  lag: number,
  topN: number
): number[] {
  return computeTopAutocorrelationNumbers(draws, poolSize, lag, topN)
    .filter(r => r.coefficient > 0)
    .map(r => r.num);
}
