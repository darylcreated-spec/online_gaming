import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import {
  computeEWMA,
  computeRTMZScores,
  computeChiSquare,
  computeShannonEntropy,
} from "@/lib/mathStats";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const rawDraws = await query<any>(
      `SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 
       FROM pick4_draws 
       ORDER BY CAST(draw_number AS INTEGER) DESC`
    );

    const totalDraws = rawDraws.length;
    if (totalDraws === 0) {
      return NextResponse.json({
        success: true,
        totalDraws: 0,
        positionFrequencies: { pos1: [], pos2: [], pos3: [], pos4: [] },
        globalDigitFrequencies: [],
        slotFrequencies: {},
        sumFrequencies: [],
        latestDraw: null
      });
    }

    const latestDraw = rawDraws[0];

    // Positional counts (0-9)
    const pos1: Record<number, number> = {};
    const pos2: Record<number, number> = {};
    const pos3: Record<number, number> = {};
    const pos4: Record<number, number> = {};
    const globalDigits: Record<number, number> = {};
    for (let d = 0; d <= 9; d++) {
      pos1[d] = 0;
      pos2[d] = 0;
      pos3[d] = 0;
      pos4[d] = 0;
      globalDigits[d] = 0;
    }

    // Sum frequencies (0 to 36)
    const sumFreqs: Record<number, number> = {};
    const allDigits: number[] = [];

    // Pair patterns
    let doubleCount = 0;
    let tripleCount = 0;
    let quadCount = 0;
    let uniqueCount = 0;

    rawDraws.forEach(d => {
      const d1 = Number(d.digit1);
      const d2 = Number(d.digit2);
      const d3 = Number(d.digit3);
      const d4 = Number(d.digit4);

      if (d1 >= 0 && d1 <= 9) { pos1[d1]++; globalDigits[d1]++; allDigits.push(d1); }
      if (d2 >= 0 && d2 <= 9) { pos2[d2]++; globalDigits[d2]++; allDigits.push(d2); }
      if (d3 >= 0 && d3 <= 9) { pos3[d3]++; globalDigits[d3]++; allDigits.push(d3); }
      if (d4 >= 0 && d4 <= 9) { pos4[d4]++; globalDigits[d4]++; allDigits.push(d4); }

      const sum = d1 + d2 + d3 + d4;
      sumFreqs[sum] = (sumFreqs[sum] || 0) + 1;

      // Pattern classification
      const uniqueDigits = new Set([d1, d2, d3, d4]).size;
      if (uniqueDigits === 4) uniqueCount++;
      else if (uniqueDigits === 3) doubleCount++;
      else if (uniqueDigits === 2) {
        // either pair-pair or triple
        const counts = [d1, d2, d3, d4].reduce((acc, val) => {
          acc[val] = (acc[val] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        if (Object.values(counts).includes(3)) tripleCount++;
        else doubleCount++;
      } else if (uniqueDigits === 1) quadCount++;
    });

    const formatPos = (record: Record<number, number>) =>
      Object.entries(record).map(([digit, count]) => ({
        digit: parseInt(digit),
        count
      })).sort((a, b) => a.digit - b.digit);

    const globalDigitList = Object.entries(globalDigits).map(([digit, count]) => ({
      digit: parseInt(digit),
      count
    })).sort((a, b) => a.digit - b.digit);

    const sumDistribution = Object.entries(sumFreqs).map(([sum, count]) => ({
      sum: parseInt(sum),
      count
    })).sort((a, b) => a.sum - b.sum);

    const chiSquare = computeChiSquare(allDigits.map(d => d + 1), 10);
    const entropy = computeShannonEntropy(allDigits.map(d => d + 1), 10, 100);

    return NextResponse.json({
      success: true,
      game: "pick4",
      totalDraws,
      latestDraw,
      positionFrequencies: {
        pos1: formatPos(pos1),
        pos2: formatPos(pos2),
        pos3: formatPos(pos3),
        pos4: formatPos(pos4),
      },
      globalDigitFrequencies: globalDigitList,
      sumDistribution,
      patternCounts: {
        unique: uniqueCount,
        double: doubleCount,
        triple: tripleCount,
        quad: quadCount
      },
      chiSquare,
      entropy
    });
  } catch (err: any) {
    console.error("[API /api/pick4/stats] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to compute Pick 4 statistics" },
      { status: 500 }
    );
  }
}
