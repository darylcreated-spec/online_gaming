import { query } from "@/lib/db";
import { CHINAPOO_CHART, getPartnersForNumber } from "@/lib/playwhe";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Traditional folkloric pairings
const FOLKLORE_PARTNERS: Record<number, number[]> = {
  1: [27, 35],  // Centipede -> Little Snake, Big Snake
  4: [23, 5],   // Dead Man -> House, Parson Man
  11: [4],      // Corbeau -> Dead Man
  14: [12, 24]  // Money -> King, Queen
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const numStr = searchParams.get("number") || "";
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "1000"));

    const number = parseInt(numStr);
    if (isNaN(number) || number < 1 || number > 36) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid number between 1 and 36." },
        { status: 400 }
      );
    }

    // 1. Successor Transitions Query
    // Retrieves the numbers that play immediately after the selected number in chronological sequence
    const successorSql = `
      WITH RecentDraws AS (
        SELECT winning_number, draw_date, draw_number 
        FROM playwhe_draws 
        ORDER BY draw_number DESC 
        LIMIT ?
      ),
      OrderedDraws AS (
        SELECT 
          winning_number as current_number,
          LEAD(winning_number) OVER (ORDER BY draw_number ASC) as next_number
        FROM RecentDraws
      )
      SELECT 
        next_number,
        COUNT(*) as transition_count
      FROM OrderedDraws
      WHERE current_number = ? AND next_number IS NOT NULL
      GROUP BY next_number
      ORDER BY transition_count DESC
    `;
    const successorRows = await query<any>(successorSql, [limit, number]);

    // Format Successors list
    const totalTransitions = successorRows.reduce((sum, r) => sum + r.transition_count, 0);
    const successors = Array.from({ length: 36 }).map((_, idx) => {
      const n = idx + 1;
      const row = successorRows.find(r => r.next_number === n);
      const count = row ? row.transition_count : 0;
      return {
        number: n,
        mark: CHINAPOO_CHART[n].mark,
        count,
        probability: totalTransitions > 0 ? (count / totalTransitions) * 100 : 0
      };
    }).sort((a, b) => b.count - a.count);

    // 2. Co-Occurrence (Same-Day Companions) Query
    // Retrieves numbers that played on the same calendar day as the selected number
    const companionSql = `
      WITH RecentDraws AS (
        SELECT winning_number, draw_date, draw_number
        FROM playwhe_draws
        ORDER BY draw_number DESC
        LIMIT ?
      )
      SELECT 
        d2.winning_number as companion_number,
        COUNT(*) as co_occurrence_count
      FROM RecentDraws d1
      JOIN RecentDraws d2 ON d1.draw_date = d2.draw_date AND d1.draw_number != d2.draw_number
      WHERE d1.winning_number = ?
      GROUP BY companion_number
      ORDER BY co_occurrence_count DESC
    `;
    const companionRows = await query<any>(companionSql, [limit, number]);

    // Format Companions list
    const companions = Array.from({ length: 36 }).map((_, idx) => {
      const n = idx + 1;
      const row = companionRows.find(r => r.companion_number === n);
      const count = row ? row.co_occurrence_count : 0;
      return {
        number: n,
        mark: CHINAPOO_CHART[n].mark,
        count
      };
    }).filter(c => c.number !== number).sort((a, b) => b.count - a.count);

    // 3. Folklore Pairs vs. Reality Calculations
    // Retrieve traditional partners or fall back to 1/16 groups if undocumented
    const traditionalPartnersList = FOLKLORE_PARTNERS[number] || getPartnersForNumber(number);
    const isFolkloric = !!FOLKLORE_PARTNERS[number];

    // Compute database averages for same-day co-occurrences
    const totalCompanionsCount = companions.reduce((sum, c) => sum + c.count, 0);
    const avgCompanionCount = companions.length > 0 ? totalCompanionsCount / companions.length : 0;

    const partnersComparison = traditionalPartnersList.map(pNum => {
      const compEntry = companions.find(c => c.number === pNum);
      const actualCount = compEntry ? compEntry.count : 0;
      
      // Determine status based on deviation from the database average
      let status: "HOT" | "WARM" | "COLD" = "WARM";
      if (actualCount > avgCompanionCount * 1.3) {
        status = "HOT";
      } else if (actualCount < avgCompanionCount * 0.7) {
        status = "COLD";
      }

      return {
        number: pNum,
        mark: CHINAPOO_CHART[pNum].mark,
        actualCount,
        expectedAvgCount: parseFloat(avgCompanionCount.toFixed(2)),
        status
      };
    });

    return NextResponse.json({
      success: true,
      number,
      mark: CHINAPOO_CHART[number].mark,
      limit,
      successors: successors.slice(0, 5),      // Top 5 successors
      companions: companions.slice(0, 5),      // Top 5 companions
      folklore: {
        isFolkloric,
        partners: partnersComparison
      }
    });

  } catch (error: any) {
    console.error("[API /api/playwhe/correlation] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
