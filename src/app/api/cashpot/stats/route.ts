import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import {
  computeEWMA,
  computeRTMZScores,
  computeChiSquare,
  computeShannonEntropy,
  computeBayesianPosterior,
} from "@/lib/mathStats";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const rawDraws = await query<any>(
      `SELECT draw_number, draw_date, num1, num2, num3, num4, num5, multiplier 
       FROM cashpot_draws 
       ORDER BY CAST(draw_number AS INTEGER) DESC`
    );

    const totalDraws = rawDraws.length;
    if (totalDraws === 0) {
      return NextResponse.json({
        success: true,
        totalDraws: 0,
        mainFrequencies: [],
        multiplierFrequencies: [],
        rankings: { hotNumbers: [], coldNumbers: [] },
        oddEvenStats: {},
        sumStats: {},
        latestDraw: null
      });
    }

    const latestDraw = rawDraws[0];

    // 1. Calculate main ball frequencies (1 to 20)
    const mainFreqs: Record<number, number> = {};
    for (let i = 1; i <= 20; i++) mainFreqs[i] = 0;

    // 2. Multiplier frequencies (usually 1X to 5X)
    const multFreqs: Record<number, number> = {};

    // 3. Odd/Even balance counts
    const oddEvenCounts: Record<string, number> = {};

    // 4. Sum counts
    const sumValues: number[] = [];

    // 5. Flattened numbers for advanced statistical math
    const allNumbers: number[] = [];

    rawDraws.forEach(d => {
      const nums = [Number(d.num1), Number(d.num2), Number(d.num3), Number(d.num4), Number(d.num5)].filter(n => n >= 1 && n <= 20);
      let odds = 0;
      let sum = 0;

      nums.forEach(n => {
        mainFreqs[n] = (mainFreqs[n] || 0) + 1;
        allNumbers.push(n);
        if (n % 2 !== 0) odds++;
        sum += n;
      });

      const evens = nums.length - odds;
      const ratio = `${odds}:${evens}`;
      oddEvenCounts[ratio] = (oddEvenCounts[ratio] || 0) + 1;
      sumValues.push(sum);

      const m = Number(d.multiplier || 1);
      multFreqs[m] = (multFreqs[m] || 0) + 1;
    });

    const mainFrequencies = Object.entries(mainFreqs).map(([num, count]) => ({
      number: parseInt(num),
      count
    })).sort((a, b) => a.number - b.number);

    const multiplierFrequencies = Object.entries(multFreqs).map(([m, count]) => ({
      multiplier: parseInt(m),
      count
    })).sort((a, b) => a.multiplier - b.multiplier);

    const sortedByFreq = [...mainFrequencies].sort((a, b) => b.count - a.count);
    const hotNumbers = sortedByFreq.slice(0, 5);
    const coldNumbers = sortedByFreq.slice(-5).reverse();

    // Advanced mathematical metrics
    const ewmaScores = computeEWMA(allNumbers, 20, 0.08);
    const ewmaList = Object.entries(ewmaScores).map(([n, s]) => ({
      number: parseInt(n),
      ewmaScore: Math.round(s * 10000) / 10000
    })).sort((a, b) => a.number - b.number);

    const rtmZScores = computeRTMZScores(allNumbers, 20);
    const zScoreList = Object.entries(rtmZScores).map(([n, r]) => ({
      number: parseInt(n),
      ...r
    })).sort((a, b) => a.zScore - b.zScore);

    const chiSquare = computeChiSquare(allNumbers, 20);
    const entropy = computeShannonEntropy(allNumbers, 20, 50);

    const bayesian = computeBayesianPosterior(allNumbers, 20, 1.0, 50);
    const bayesianList = Object.entries(bayesian).map(([n, p]) => ({
      number: parseInt(n),
      posteriorProb: Math.round(p * 10000) / 100
    })).sort((a, b) => b.posteriorProb - a.posteriorProb);

    return NextResponse.json({
      success: true,
      game: "cashpot",
      totalDraws,
      latestDraw,
      mainFrequencies,
      multiplierFrequencies,
      rankings: {
        hotNumbers,
        coldNumbers
      },
      oddEvenStats: oddEvenCounts,
      averageSum: Math.round(sumValues.reduce((a, b) => a + b, 0) / (sumValues.length || 1)),
      advancedStats: {
        ewma: ewmaList,
        zScores: zScoreList,
        chiSquare,
        entropy,
        bayesianTop: bayesianList.slice(0, 8)
      }
    });
  } catch (err: any) {
    console.error("[API /api/cashpot/stats] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to compute Cash Pot statistics" },
      { status: 500 }
    );
  }
}
