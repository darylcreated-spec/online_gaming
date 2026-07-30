import { query } from "@/lib/db";
import { calculateDeltas } from "@/lib/deltas";
import { NextResponse } from "next/server";
import {
  computeEWMA,
  computeRTMZScores,
  computeChiSquare,
  computeShannonEntropy,
  computeBayesianPosterior,
  computeMonteCarlo,
  computeKellyCriterion,
} from "@/lib/mathStats";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "alltime";
    
    let whereClause = "";
    const args: any[] = [];
    
    // Calculate date threshold for timeframes
    if (timeframe === "3months" || timeframe === "6months") {
      const months = timeframe === "3months" ? 3 : 6;
      const thresholdDate = new Date();
      thresholdDate.setMonth(thresholdDate.getMonth() - months);
      
      const yyyy = thresholdDate.getFullYear();
      const mm = String(thresholdDate.getMonth() + 1).padStart(2, "0");
      const dd = String(thresholdDate.getDate()).padStart(2, "0");
      
      whereClause = "WHERE draw_date >= ?";
      args.push(`${yyyy}-${mm}-${dd}`);
    }
    
    // Fetch draws in timeframe
    const drawsSql = `
      SELECT num1, num2, num3, num4, num5, powerball, draw_date 
      FROM draws 
      ${whereClause}
      ORDER BY CAST(draw_number AS INTEGER) DESC
    `;
    const draws = await query(drawsSql, args);
    const totalDraws = draws.length;
    
    // Initialize frequency counters
    const mainFreqs: Record<number, number> = {};
    for (let i = 1; i <= 35; i++) mainFreqs[i] = 0;
    
    const pbFreqs: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) pbFreqs[i] = 0;
    
    const gapFreqs: Record<number, number> = {};
    
    // Calculate frequencies and gaps
    draws.forEach(draw => {
      // Main numbers
      mainFreqs[draw.num1]++;
      mainFreqs[draw.num2]++;
      mainFreqs[draw.num3]++;
      mainFreqs[draw.num4]++;
      mainFreqs[draw.num5]++;
      
      // Powerball
      pbFreqs[draw.powerball]++;
      
      // Gaps (Deltas)
      const sortedNums = [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5].sort((a, b) => a - b);
      const deltas = calculateDeltas(sortedNums);
      deltas.forEach(gap => {
        gapFreqs[gap] = (gapFreqs[gap] || 0) + 1;
      });
    });
    
    // Format main frequencies list for Recharts
    const mainFreqList = Object.entries(mainFreqs).map(([num, count]) => ({
      number: parseInt(num),
      count,
    })).sort((a, b) => a.number - b.number);
    
    // Format Powerball frequencies list for Recharts
    const pbFreqList = Object.entries(pbFreqs).map(([num, count]) => ({
      number: parseInt(num),
      count,
    })).sort((a, b) => a.number - b.number);
    
    // Format gap frequencies list
    const gapFreqList = Object.entries(gapFreqs).map(([gap, count]) => ({
      gap: parseInt(gap),
      count,
    })).sort((a, b) => a.gap - b.gap);
    
    // Compute Hot/Cold rankings
    const sortedMainByFreq = [...mainFreqList].sort((a, b) => b.count - a.count);
    const sortedPbByFreq = [...pbFreqList].sort((a, b) => b.count - a.count);
    
    const hotNumbers = sortedMainByFreq.slice(0, 5);
    const coldNumbers = sortedMainByFreq.slice(-5).reverse(); // least frequent first
    
    const hotPowerballs = sortedPbByFreq.slice(0, 3);
    const coldPowerballs = sortedPbByFreq.slice(-3).reverse();
    
    // Get latest draw details
    let latestDraw = null;
    if (totalDraws > 0) {
      const latestRow = await query<any>(
        "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball, jackpot FROM draws ORDER BY CAST(draw_number AS INTEGER) DESC LIMIT 1"
      );
      if (latestRow.length > 0) {
        latestDraw = latestRow[0];
      }
    }
    
    let lastDrawDate = latestDraw ? latestDraw.draw_date : "No Draws";
    
    // Get live next estimated jackpot from settings
    let nextJackpot = null;
    try {
      const settingsRow = await query<any>(
        "SELECT value FROM settings WHERE key = 'lotto_next_jackpot' LIMIT 1"
      );
      if (settingsRow.length > 0) {
        nextJackpot = settingsRow[0].value;
      }
    } catch (e) {
      console.warn("Could not retrieve next estimated jackpot from settings:", e);
    }
    
    // ── Advanced Statistical Analysis ──────────────────────────────────────
    // Flatten all main numbers into a single draw history array (most recent first)
    const allMainNums: number[] = [];
    draws.forEach(d => {
      [d.num1, d.num2, d.num3, d.num4, d.num5].forEach(n => allMainNums.push(Number(n)));
    });
    const allPBNums: number[] = draws.map(d => Number(d.powerball));

    // EWMA frequency scores
    const ewmaMainScores = computeEWMA(allMainNums, 35, 0.08);
    const ewmaPBScores = computeEWMA(allPBNums, 10, 0.1);
    const ewmaMainFrequencies = Object.entries(ewmaMainScores)
      .map(([n, s]) => ({ number: parseInt(n), ewmaScore: Math.round(s * 10000) / 10000 }))
      .sort((a, b) => a.number - b.number);
    const ewmaPBFrequencies = Object.entries(ewmaPBScores)
      .map(([n, s]) => ({ number: parseInt(n), ewmaScore: Math.round(s * 10000) / 10000 }))
      .sort((a, b) => a.number - b.number);

    // RTM Z-Scores
    const rtmlZScoreMain = computeRTMZScores(allMainNums, 35);
    const rtmlZScorePB = computeRTMZScores(allPBNums, 10);
    const zScoreMainList = Object.entries(rtmlZScoreMain)
      .map(([n, r]) => ({ number: parseInt(n), ...r }))
      .sort((a, b) => a.zScore - b.zScore); // most underrepresented first
    const zScorePBList = Object.entries(rtmlZScorePB)
      .map(([n, r]) => ({ number: parseInt(n), ...r }))
      .sort((a, b) => a.zScore - b.zScore);

    // Chi-Square Test
    const chiSquareMain = computeChiSquare(allMainNums, 35);
    const chiSquarePB = computeChiSquare(allPBNums, 10);

    // Shannon Entropy
    const entropyMain = computeShannonEntropy(allMainNums, 35, 50);
    const entropyPB = computeShannonEntropy(allPBNums, 10, 30);

    // Bayesian Posterior
    const bayesianMain = computeBayesianPosterior(allMainNums, 35, 1.0, 60);
    const bayesianMainList = Object.entries(bayesianMain)
      .map(([n, p]) => ({ number: parseInt(n), posteriorProb: Math.round(p * 10000) / 100 }))
      .sort((a, b) => b.posteriorProb - a.posteriorProb);

    // Kelly Criterion — Lotto Plus payout structure:
    // Match 5+PB jackpot (odds ~1 in 3.2M), realistic win = match 2+ numbers
    // For stats display, use estimated top-5 predicted win probability from entropy ratio
    const estimatedWinProb = Math.max(0.001, (1 - entropyMain.ratio) * 0.15);
    const kellyLotto = computeKellyCriterion(estimatedWinProb, 10, 100); // 10x payout for partial match

    // Monte Carlo — use top-5 Bayesian numbers as predicted set
    const top5Bayesian = bayesianMainList.slice(0, 5).map(b => b.number);
    const monteCarloMain = computeMonteCarlo(
      bayesianMain,
      top5Bayesian,
      35,
      10000,
      5  // 5 main numbers drawn per Lotto Plus draw
    );

    return NextResponse.json({
      success: true,
      timeframe,
      totalDraws,
      lastDrawDate,
      latestDraw,
      nextJackpot,
      mainFrequencies: mainFreqList,
      powerballFrequencies: pbFreqList,
      gapFrequencies: gapFreqList,
      rankings: {
        hotNumbers,
        coldNumbers,
        hotPowerballs,
        coldPowerballs
      },
      // Advanced statistical analysis
      advancedStats: {
        ewma: {
          mainNumbers: ewmaMainFrequencies,
          powerballs: ewmaPBFrequencies,
        },
        zScores: {
          mainNumbers: zScoreMainList,
          powerballs: zScorePBList,
          reboundCandidates: zScoreMainList.filter(z => z.signal === 'rebound').slice(0, 5),
          suppressCandidates: zScoreMainList.filter(z => z.signal === 'suppress').slice(0, 5),
        },
        chiSquare: {
          mainNumbers: chiSquareMain,
          powerballs: chiSquarePB,
        },
        entropy: {
          mainNumbers: entropyMain,
          powerballs: entropyPB,
        },
        bayesian: {
          top10: bayesianMainList.slice(0, 10),
        },
        kelly: kellyLotto,
        monteCarlo: monteCarloMain,
      }
    });
  } catch (error: any) {
    console.error("[API /api/stats] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
