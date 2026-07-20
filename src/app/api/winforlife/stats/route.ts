import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "1000"));
    
    const draws = await query<any>(
      "SELECT * FROM winforlife_draws ORDER BY CAST(draw_number AS INTEGER) DESC LIMIT ?",
      [limit]
    );
    
    if (draws.length === 0) {
      return NextResponse.json({
        success: true,
        totalDraws: 0,
        frequencies: [],
        cashBallFrequencies: [],
        transitions: {}
      });
    }

    // Main number frequencies (1-28)
    const freqs: Record<number, number> = {};
    for (let i = 1; i <= 28; i++) freqs[i] = 0;
    draws.forEach(d => {
      [d.num1, d.num2, d.num3, d.num4, d.num5, d.num6].forEach(n => {
        if (n >= 1 && n <= 28) freqs[n] = (freqs[n] || 0) + 1;
      });
    });
    const frequencies = Object.keys(freqs).map(n => ({
      number: parseInt(n),
      count: freqs[parseInt(n)]
    })).sort((a, b) => b.count - a.count);

    // Cash ball frequencies (1-3)
    const cbFreqs: Record<number, number> = {};
    for (let i = 1; i <= 3; i++) cbFreqs[i] = 0;
    draws.forEach(d => {
      if (d.cash_ball >= 1 && d.cash_ball <= 3) {
        cbFreqs[d.cash_ball] = (cbFreqs[d.cash_ball] || 0) + 1;
      }
    });
    const cashBallFrequencies = Object.keys(cbFreqs).map(n => ({
      number: parseInt(n),
      count: cbFreqs[parseInt(n)]
    })).sort((a, b) => b.count - a.count);

    // Successor transitions matrix
    const transitions: Record<number, Record<number, number>> = {};
    for (let n = 1; n <= 28; n++) {
      transitions[n] = {};
      for (let m = 1; m <= 28; m++) {
        transitions[n][m] = 0;
      }
    }
    for (let i = draws.length - 1; i > 0; i--) {
      const prevDraw = draws[i];
      const nextDraw = draws[i-1];
      const prevNums = [prevDraw.num1, prevDraw.num2, prevDraw.num3, prevDraw.num4, prevDraw.num5, prevDraw.num6];
      const nextNums = [nextDraw.num1, nextDraw.num2, nextDraw.num3, nextDraw.num4, nextDraw.num5, nextDraw.num6];
      
      prevNums.forEach(p => {
        if (p >= 1 && p <= 28) {
          nextNums.forEach(q => {
            if (q >= 1 && q <= 28) {
              transitions[p][q]++;
            }
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      totalDraws: draws.length,
      latestDraw: draws[0],
      latestDraws: draws.slice(0, 4),
      frequencies,
      cashBallFrequencies,
      transitions
    });
  } catch (error: any) {
    console.error("[API /api/winforlife/stats] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
