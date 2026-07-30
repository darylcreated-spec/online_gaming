import { query } from "@/lib/db";
import { 
  analyzeLines, 
  analyzeSuits, 
  checkSaturdayPlayback, 
  checkDoublesAndZeroes, 
  analyzePartners,
  CHINAPOO_CHART
} from "@/lib/playwhe";
import { NextResponse } from "next/server";
import {
  computeEWMA,
  computeRTMZScores,
  computeChiSquare,
  computeShannonEntropy,
  computeTopAutocorrelationNumbers,
  computeBayesianPosterior,
  computeKellyCriterion,
  computeMonteCarlo,
} from "@/lib/mathStats";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "1000"));
    
    // 1. Fetch draws
    const sql = `
      SELECT * FROM playwhe_draws 
      ORDER BY CAST(draw_number AS INTEGER) DESC 
      LIMIT ?
    `;
    const draws = await query<any>(sql, [limit]);
    
    if (draws.length === 0) {
      return NextResponse.json({
        success: true,
        totalDraws: 0,
        frequencies: [],
        slotStats: {},
        lines: [],
        suits: [],
        saturdayPlayback: null,
        doublesAndZeroes: null,
        partners: { list: [], recommendations: [] }
      });
    }

    // 2. Compute global frequencies
    const globalFreqs: Record<number, number> = {};
    for (let n = 1; n <= 36; n++) globalFreqs[n] = 0;
    draws.forEach(d => {
      globalFreqs[d.winning_number] = (globalFreqs[d.winning_number] || 0) + 1;
    });

    const frequencies = Object.keys(globalFreqs).map(n => {
      const num = parseInt(n);
      return {
        number: num,
        mark: CHINAPOO_CHART[num].mark,
        count: globalFreqs[num]
      };
    }).sort((a, b) => b.count - a.count);

    // 3. Compute slot-specific hot/cold lists
    // Time slots are: 'Morning', 'Midday', 'Afternoon', 'Evening'
    const slots = ["Morning", "Midday", "Afternoon", "Evening"];
    const slotStats: Record<string, { hot: any[], cold: any[] }> = {};
    
    slots.forEach(slot => {
      const slotDraws = draws.filter(d => d.draw_time_slot.toLowerCase() === slot.toLowerCase());
      
      const freq: Record<number, number> = {};
      for (let n = 1; n <= 36; n++) freq[n] = 0;
      
      // Track last seen index
      const lastSeen: Record<number, number> = {};
      for (let n = 1; n <= 36; n++) lastSeen[n] = 9999;
      
      slotDraws.forEach((d, idx) => {
        freq[d.winning_number]++;
        if (lastSeen[d.winning_number] === 9999) {
          lastSeen[d.winning_number] = idx;
        }
      });
      
      const statsList = Object.keys(freq).map(n => {
        const num = parseInt(n);
        return {
          number: num,
          mark: CHINAPOO_CHART[num].mark,
          count: freq[num],
          gap: lastSeen[num]
        };
      });

      // Hot: sorted by count desc
      const hot = [...statsList].sort((a, b) => b.count - a.count).slice(0, 5);
      // Cold: sorted by count asc (or highest gap)
      const cold = [...statsList].sort((a, b) => b.gap === a.gap ? a.count - b.count : b.gap - a.gap).slice(0, 5);
      
      slotStats[slot] = { hot, cold };
    });

    // 4. Run analytical engines
    const lines = analyzeLines(draws);
    const suits = analyzeSuits(draws);
    const saturdayPlayback = checkSaturdayPlayback(draws);
    const doublesAndZeroes = checkDoublesAndZeroes(draws);
    const partners = analyzePartners(draws);

    // 5. Compute global transitions matrix (successors map)
    const transitions: Record<number, Record<number, number>> = {};
    for (let n = 1; n <= 36; n++) {
      transitions[n] = {};
      for (let m = 1; m <= 36; m++) {
        transitions[n][m] = 0;
      }
    }
    for (let i = draws.length - 1; i > 0; i--) {
      const prev = draws[i].winning_number;
      const next = draws[i-1].winning_number;
      if (prev >= 1 && prev <= 36 && next >= 1 && next <= 36) {
        transitions[prev][next]++;
      }
    }
    
    // ── Advanced Statistical Analysis ──────────────────────────────────────
    const allNums: number[] = draws.map((d: any) => Number(d.winning_number));

    // EWMA frequency (α=0.12 — last ~8 draws dominate signal)
    const ewmaScores = computeEWMA(allNums, 36, 0.12);
    const ewmaFrequencies = Object.entries(ewmaScores)
      .map(([n, s]) => ({
        number: parseInt(n),
        mark: CHINAPOO_CHART[parseInt(n)]?.mark || "",
        ewmaScore: Math.round(s * 10000) / 10000
      }))
      .sort((a, b) => b.ewmaScore - a.ewmaScore);

    // RTM Z-Score deviation per mark
    const zScoreResults = computeRTMZScores(allNums, 36);
    const zScoreList = Object.entries(zScoreResults)
      .map(([n, r]) => ({
        number: parseInt(n),
        mark: CHINAPOO_CHART[parseInt(n)]?.mark || "",
        ...r
      }))
      .sort((a, b) => a.zScore - b.zScore); // most underrepresented first

    // Chi-Square Goodness-of-Fit
    const chiSquare = computeChiSquare(allNums, 36);

    // Shannon Entropy (rolling 40-draw window)
    const entropy = computeShannonEntropy(allNums, 36, 40);

    // Autocorrelation — top marks at lag 2, 3, 4
    const acfLag2 = computeTopAutocorrelationNumbers(allNums, 36, 2, 8);
    const acfLag3 = computeTopAutocorrelationNumbers(allNums, 36, 3, 8);
    const acfLag4 = computeTopAutocorrelationNumbers(allNums, 36, 4, 8);

    // Bayesian posterior probabilities
    const bayesian = computeBayesianPosterior(allNums, 36, 1.0, 60);
    const bayesianList = Object.entries(bayesian)
      .map(([n, p]) => ({
        number: parseInt(n),
        mark: CHINAPOO_CHART[parseInt(n)]?.mark || "",
        posteriorProb: Math.round(p * 10000) / 100
      }))
      .sort((a, b) => b.posteriorProb - a.posteriorProb);

    // Kelly Criterion — Play Whe pays 24x on a $1 bet
    // Estimated win prob = top-5 picks from Bayesian posterior
    const top5BayesianProb = bayesianList.slice(0, 5).reduce((s, b) => s + b.posteriorProb / 100, 0);
    const kelly = computeKellyCriterion(top5BayesianProb, 24, 100);

    // Monte Carlo — simulate coverage of top-5 Bayesian picks
    const top5Nums = bayesianList.slice(0, 5).map(b => b.number);
    const monteCarlo = computeMonteCarlo(bayesian, top5Nums, 36, 10000, 1);

    return NextResponse.json({
      success: true,
      totalDraws: draws.length,
      latestDraw: draws[0],
      latestDraws: draws.slice(0, 4),
      frequencies,
      slotStats,
      lines,
      suits,
      saturdayPlayback,
      doublesAndZeroes,
      partners,
      transitions,
      // Advanced statistical analysis
      advancedStats: {
        ewma: ewmaFrequencies,
        zScores: {
          list: zScoreList,
          reboundCandidates: zScoreList.filter(z => z.signal === 'rebound').slice(0, 8),
          suppressCandidates: zScoreList.filter(z => z.signal === 'suppress').slice(0, 5),
        },
        chiSquare,
        entropy,
        autocorrelation: {
          lag2: acfLag2,
          lag3: acfLag3,
          lag4: acfLag4,
        },
        bayesian: {
          top10: bayesianList.slice(0, 10),
        },
        kelly,
        monteCarlo,
      }
    });
  } catch (error: any) {
    console.error("[API /api/playwhe/stats] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
