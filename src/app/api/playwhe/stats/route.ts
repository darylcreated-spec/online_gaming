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

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "1000"));
    
    // 1. Fetch draws
    const sql = `
      SELECT * FROM playwhe_draws 
      ORDER BY draw_number DESC 
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
    
    return NextResponse.json({
      success: true,
      totalDraws: draws.length,
      latestDraw: draws[0],
      frequencies,
      slotStats,
      lines,
      suits,
      saturdayPlayback,
      doublesAndZeroes,
      partners
    });
  } catch (error: any) {
    console.error("[API /api/playwhe/stats] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
