/**
 * pick4_math_engine.ts
 * Rigorous Mathematical Inference, Positional Markov Chains,
 * Digit Sum Gaussian Distributions, Box vs. Straight EV Optimization,
 * and Walk-Forward Out-Of-Sample Historical Backtesting for NLCB Pick 4.
 */

export interface Pick4DrawRecord {
  draw_number: number | string;
  draw_date: string;
  draw_time_slot: string; // MORNING, MIDDAY, AFTERNOON, EVENING
  digit1: number;
  digit2: number;
  digit3: number;
  digit4: number;
}

export type Pick4PatternType = "QUAD" | "4-WAY" | "6-WAY" | "12-WAY" | "24-WAY";

export interface DigitFactorBreakdown {
  digit: number;
  position: number; // 0 to 3
  frequency: number;
  ewmaScore: number;
  markovProb: number;
  posteriorProb: number;
}

export interface Pick4TicketRecommendation {
  digits: [number, number, number, number];
  digitsString: string;
  pattern: Pick4PatternType;
  boxWays: number;
  sum: number;
  evenOddRatio: string;
  highLowRatio: string;
  straightJointProb: number;
  straightEV: number; // Expected Value per $1
  boxPayout: number;
  boxEV: number; // Expected Value per $1
  confidenceScore: number; // 0-100
}

export interface Pick4MathPrediction {
  game: "pick4";
  targetDrawSlot: string;
  optimalStraightTicket: Pick4TicketRecommendation;
  optimalBoxTickets: {
    twentyFourWay: Pick4TicketRecommendation;
    twelveWay: Pick4TicketRecommendation;
    sixWay?: Pick4TicketRecommendation;
  };
  fiveTicketEnsemble: Pick4TicketRecommendation[];
  positionalProbabilities: number[][]; // [4 positions][10 digits 0-9]
  digitFactorTable: DigitFactorBreakdown[];
  sumDistribution: {
    mean: number;
    stdDev: number;
    recommendedRange: [number, number];
  };
}

export interface Pick4BacktestResult {
  sampleSize: number;
  straightMatches: number;
  straightMatchRate: number;
  boxMatches: number;
  boxMatchRate: number;
  threeDigitMatches: number;
  threeDigitMatchRate: number;
  twoDigitMatches: number;
  twoDigitMatchRate: number;
  randomBaselineBoxRate: number;
  boxEfficiencyRatio: number;
}

/**
 * Determine pattern type (Straight/Box permutations)
 */
export function getPick4Pattern(digits: [number, number, number, number]): { pattern: Pick4PatternType; boxWays: number; boxPayout: number } {
  const counts = new Map<number, number>();
  for (const d of digits) {
    counts.set(d, (counts.get(d) || 0) + 1);
  }
  const freqs = Array.from(counts.values()).sort((a, b) => b - a);

  if (freqs[0] === 4) {
    return { pattern: "QUAD", boxWays: 1, boxPayout: 5000 };
  }
  if (freqs[0] === 3) {
    return { pattern: "4-WAY", boxWays: 4, boxPayout: 1250 };
  }
  if (freqs[0] === 2 && freqs[1] === 2) {
    return { pattern: "6-WAY", boxWays: 6, boxPayout: 833 };
  }
  if (freqs[0] === 2) {
    return { pattern: "12-WAY", boxWays: 12, boxPayout: 417 };
  }
  return { pattern: "24-WAY", boxWays: 24, boxPayout: 208 };
}

/**
 * Main inference engine for Pick 4
 */
export function computePick4NextDrawProbabilities(
  drawsChronological: Pick4DrawRecord[],
  targetSlot: string = "NEXT"
): Pick4MathPrediction {
  const totalDraws = drawsChronological.length;
  if (totalDraws < 10) {
    throw new Error(`Insufficient historical data: ${totalDraws} draws found (minimum 10 required).`);
  }

  const decayFactor = 0.985;
  // 4 positions (0=P1, 1=P2, 2=P3, 3=P4), each has digits 0 to 9
  const positionalFreq = Array.from({ length: 4 }, () => new Float64Array(10));
  const positionalEwma = Array.from({ length: 4 }, () => new Float64Array(10));

  // 4 Positional Markov transition matrices: T[pos][fromDigit][toDigit]
  const markovMatrices = Array.from({ length: 4 }, () =>
    Array.from({ length: 10 }, () => new Float64Array(10))
  );

  for (let i = 0; i < totalDraws; i++) {
    const d = drawsChronological[i];
    const digits = [d.digit1, d.digit2, d.digit3, d.digit4];
    const recencyWeight = Math.pow(decayFactor, totalDraws - 1 - i);

    for (let pos = 0; pos < 4; pos++) {
      const val = digits[pos];
      if (val >= 0 && val <= 9) {
        positionalFreq[pos][val]++;
        positionalEwma[pos][val] += recencyWeight;
      }
    }

    if (i > 0) {
      const prevD = drawsChronological[i - 1];
      const prevDigits = [prevD.digit1, prevD.digit2, prevD.digit3, prevD.digit4];
      for (let pos = 0; pos < 4; pos++) {
        const fromVal = prevDigits[pos];
        const toVal = digits[pos];
        if (fromVal >= 0 && fromVal <= 9 && toVal >= 0 && toVal <= 9) {
          markovMatrices[pos][fromVal][toVal]++;
        }
      }
    }
  }

  const latestDraw = drawsChronological[totalDraws - 1];
  const lastDigits = [latestDraw.digit1, latestDraw.digit2, latestDraw.digit3, latestDraw.digit4];

  // Compute Dirichlet-smoothed posteriors P(D_pos = d)
  const positionalProbabilities: number[][] = Array.from({ length: 4 }, () => new Array(10).fill(0));
  const digitFactorTable: DigitFactorBreakdown[] = [];

  for (let pos = 0; pos < 4; pos++) {
    const lastVal = lastDigits[pos];
    let totalScore = 0;
    const scores = new Float64Array(10);

    // Row sum for Markov normalization
    let markovRowSum = 0;
    for (let d = 0; d < 10; d++) {
      markovRowSum += markovMatrices[pos][lastVal][d];
    }

    for (let d = 0; d < 10; d++) {
      // Prior frequency
      const freqScore = (positionalFreq[pos][d] + 1) / (totalDraws + 10);
      // EWMA momentum
      const ewmaScore = positionalEwma[pos][d];
      // Markov transition
      const markovProb = (markovMatrices[pos][lastVal][d] + 0.5) / (markovRowSum + 5.0);

      // Composite posterior
      const score = (freqScore * 0.30) + (ewmaScore * 0.40) + (markovProb * 0.30);
      scores[d] = score;
      totalScore += score;
    }

    // Normalize
    for (let d = 0; d < 10; d++) {
      const prob = scores[d] / totalScore;
      positionalProbabilities[pos][d] = prob;

      digitFactorTable.push({
        digit: d,
        position: pos + 1,
        frequency: positionalFreq[pos][d],
        ewmaScore: Number(positionalEwma[pos][d].toFixed(2)),
        markovProb: Number(((markovMatrices[pos][lastVal][d] + 0.5) / (markovRowSum + 5.0)).toFixed(4)),
        posteriorProb: Number(prob.toFixed(4))
      });
    }
  }

  // Generate Optimal Straight recommendation (max joint probability)
  const bestStraightDigits: [number, number, number, number] = [0, 0, 0, 0];
  for (let pos = 0; pos < 4; pos++) {
    let maxP = -1;
    let bestD = 0;
    for (let d = 0; d < 10; d++) {
      if (positionalProbabilities[pos][d] > maxP) {
        maxP = positionalProbabilities[pos][d];
        bestD = d;
      }
    }
    bestStraightDigits[pos] = bestD;
  }

  function scoreCandidateTicket(digits: [number, number, number, number]): Pick4TicketRecommendation {
    const patternInfo = getPick4Pattern(digits);
    const sum = digits[0] + digits[1] + digits[2] + digits[3];
    const evenCount = digits.filter(d => d % 2 === 0).length;
    const highCount = digits.filter(d => d >= 5).length;

    // Joint probability P(d1, d2, d3, d4)
    const straightJointProb = 
      positionalProbabilities[0][digits[0]] *
      positionalProbabilities[1][digits[1]] *
      positionalProbabilities[2][digits[2]] *
      positionalProbabilities[3][digits[3]];

    // Expected Value per $1
    const straightEV = (straightJointProb * 5000) - 1.0;
    const boxProb = straightJointProb * patternInfo.boxWays;
    const boxEV = (boxProb * patternInfo.boxPayout) - 1.0;

    // Sum Gaussian penalty (ideal sum 14 to 22)
    const sumDeviation = Math.abs(sum - 18);
    const sumPenalty = Math.exp(-Math.pow(sumDeviation / 6.7, 2));

    const confidenceScore = Math.min(99, Math.max(50, Math.round(
      (straightJointProb * 10000) * 8 + (sumPenalty * 15)
    )));

    return {
      digits,
      digitsString: digits.join(""),
      pattern: patternInfo.pattern,
      boxWays: patternInfo.boxWays,
      sum,
      evenOddRatio: `${evenCount}E / ${4 - evenCount}O`,
      highLowRatio: `${highCount}H / ${4 - highCount}L`,
      straightJointProb: Number(straightJointProb.toFixed(6)),
      straightEV: Number(straightEV.toFixed(2)),
      boxPayout: patternInfo.boxPayout,
      boxEV: Number(boxEV.toFixed(2)),
      confidenceScore
    };
  }

  const optimalStraight = scoreCandidateTicket(bestStraightDigits);

  // Generate Optimal Box 24-Way (all unique digits)
  // Pick top 4 distinct digits across the pool
  const overallDigitScores = new Float64Array(10);
  for (let d = 0; d < 10; d++) {
    for (let pos = 0; pos < 4; pos++) {
      overallDigitScores[d] += positionalProbabilities[pos][d];
    }
  }
  const sortedDigitsByScore = Array.from({ length: 10 }, (_, i) => i)
    .sort((a, b) => overallDigitScores[b] - overallDigitScores[a]);

  const top4Distinct: [number, number, number, number] = [
    sortedDigitsByScore[0],
    sortedDigitsByScore[1],
    sortedDigitsByScore[2],
    sortedDigitsByScore[3]
  ];
  const optimal24Way = scoreCandidateTicket(top4Distinct);

  // Generate Optimal Box 12-Way (one pair, two distinct)
  const top12WayDigits: [number, number, number, number] = [
    sortedDigitsByScore[0],
    sortedDigitsByScore[0],
    sortedDigitsByScore[1],
    sortedDigitsByScore[2]
  ];
  const optimal12Way = scoreCandidateTicket(top12WayDigits);

  // Generate Optimal Box 6-Way (two pairs)
  const top6WayDigits: [number, number, number, number] = [
    sortedDigitsByScore[0],
    sortedDigitsByScore[0],
    sortedDigitsByScore[1],
    sortedDigitsByScore[1]
  ];
  const optimal6Way = scoreCandidateTicket(top6WayDigits);

  // 5-Ticket Ensemble
  const ensemble: Pick4TicketRecommendation[] = [
    optimalStraight,
    optimal24Way,
    optimal12Way,
    scoreCandidateTicket([sortedDigitsByScore[1], sortedDigitsByScore[2], sortedDigitsByScore[3], sortedDigitsByScore[4]]),
    scoreCandidateTicket([sortedDigitsByScore[0], sortedDigitsByScore[2], sortedDigitsByScore[4], sortedDigitsByScore[5]])
  ];

  return {
    game: "pick4",
    targetDrawSlot: targetSlot,
    optimalStraightTicket: optimalStraight,
    optimalBoxTickets: {
      twentyFourWay: optimal24Way,
      twelveWay: optimal12Way,
      sixWay: optimal6Way
    },
    fiveTicketEnsemble: ensemble,
    positionalProbabilities,
    digitFactorTable,
    sumDistribution: {
      mean: 18.0,
      stdDev: 6.7,
      recommendedRange: [13, 23]
    }
  };
}

/**
 * Walk-Forward Out-Of-Sample Historical Backtester for Pick 4
 */
export function runPick4WalkForwardBacktest(
  drawsChronological: Pick4DrawRecord[],
  testSampleSize: number = 100
): Pick4BacktestResult {
  const N = drawsChronological.length;
  const actualTestSize = Math.min(testSampleSize, N - 15);
  const startIndex = N - actualTestSize;

  let straightHits = 0;
  let boxHits = 0;
  let threeDigitHits = 0;
  let twoDigitHits = 0;

  for (let t = startIndex; t < N; t++) {
    const historicalSlice = drawsChronological.slice(0, t);
    const actualDraw = drawsChronological[t];
    const actualDigits: [number, number, number, number] = [
      actualDraw.digit1,
      actualDraw.digit2,
      actualDraw.digit3,
      actualDraw.digit4
    ];

    const pred = computePick4NextDrawProbabilities(historicalSlice);
    const predDigits = pred.optimalStraightTicket.digits;

    // Check Straight hit
    if (
      predDigits[0] === actualDigits[0] &&
      predDigits[1] === actualDigits[1] &&
      predDigits[2] === actualDigits[2] &&
      predDigits[3] === actualDigits[3]
    ) {
      straightHits++;
    }

    // Check Box hit (multiset equality)
    const sortedActual = [...actualDigits].sort();
    const sortedPred = [...predDigits].sort();
    if (sortedActual.every((val, idx) => val === sortedPred[idx])) {
      boxHits++;
    }

    // Positional matches count
    let matchCount = 0;
    for (let p = 0; p < 4; p++) {
      if (predDigits[p] === actualDigits[p]) matchCount++;
    }
    if (matchCount >= 3) threeDigitHits++;
    if (matchCount >= 2) twoDigitHits++;
  }

  const straightRate = straightHits / actualTestSize;
  const boxRate = boxHits / actualTestSize;
  const threeRate = threeDigitHits / actualTestSize;
  const twoRate = twoDigitHits / actualTestSize;

  const baselineBoxRate = 24 / 10000; // 0.0024 for 24-way
  const boxEfficiency = baselineBoxRate > 0 ? boxRate / baselineBoxRate : 1.0;

  return {
    sampleSize: actualTestSize,
    straightMatches: straightHits,
    straightMatchRate: Number(straightRate.toFixed(4)),
    boxMatches: boxHits,
    boxMatchRate: Number(boxRate.toFixed(4)),
    threeDigitMatches: threeDigitHits,
    threeDigitMatchRate: Number(threeRate.toFixed(4)),
    twoDigitMatches: twoDigitHits,
    twoDigitMatchRate: Number(twoRate.toFixed(4)),
    randomBaselineBoxRate: baselineBoxRate,
    boxEfficiencyRatio: Number(boxEfficiency.toFixed(2))
  };
}
