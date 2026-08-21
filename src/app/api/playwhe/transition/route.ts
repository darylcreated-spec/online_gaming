import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { CHINAPOO_CHART } from "@/lib/playwhe";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromNumParam = searchParams.get("fromNumber");
    const limit = Math.max(100, Math.min(10000, parseInt(searchParams.get("limit") || "3000")));

    // 1. Get recent chronological draws
    const rawDraws = await query<any>(
      `SELECT draw_number, draw_date, draw_time_slot, winning_number 
       FROM playwhe_draws 
       ORDER BY CAST(draw_number AS INTEGER) DESC 
       LIMIT ?`,
      [limit]
    );

    if (!rawDraws || rawDraws.length < 2) {
      return NextResponse.json({
        success: true,
        transitions: [],
        latestDraw: null
      });
    }

    // Chronological order (oldest to newest)
    const chronological = [...rawDraws].reverse();
    const latestDraw = rawDraws[0];

    // Determine target fromNumber and fromSlot
    const targetNumber = fromNumParam ? parseInt(fromNumParam, 10) : latestDraw.winning_number;
    const targetSlot = latestDraw.draw_time_slot;

    // Slot ordering logic
    const nextSlotMap: Record<string, string> = {
      "Morning": "Midday",
      "Midday": "Afternoon",
      "Afternoon": "Evening",
      "Evening": "Morning"
    };
    const expectedNextSlot = nextSlotMap[targetSlot] || "Next Draw";

    // 2. Count all transitions where previous draw had targetNumber
    const successorCounts: Record<number, number> = {};
    let totalOccurrences = 0;

    for (let i = 0; i < chronological.length - 1; i++) {
      const current = chronological[i];
      const next = chronological[i + 1];

      if (current.winning_number === targetNumber) {
        totalOccurrences++;
        const nextNum = next.winning_number;
        successorCounts[nextNum] = (successorCounts[nextNum] || 0) + 1;
      }
    }

    // 3. Format top successors
    const sortedSuccessors = Object.entries(successorCounts)
      .map(([numStr, count]) => {
        const num = parseInt(numStr, 10);
        const percentage = totalOccurrences > 0 ? ((count / totalOccurrences) * 100).toFixed(1) : "0.0";
        const chinapoo = CHINAPOO_CHART[num as keyof typeof CHINAPOO_CHART];
        return {
          number: num,
          mark: chinapoo?.mark || "Unknown",
          keywords: chinapoo?.keywords || "",
          count,
          percentage: parseFloat(percentage)
        };
      })
      .sort((a, b) => b.count - a.count);

    const top5 = sortedSuccessors.slice(0, 5);

    return NextResponse.json(
      {
        success: true,
        currentMark: {
          number: targetNumber,
          mark: CHINAPOO_CHART[targetNumber as keyof typeof CHINAPOO_CHART]?.mark || "Unknown",
          timeSlot: targetSlot,
          drawNumber: latestDraw.draw_number
        },
        expectedNextSlot,
        sampleSize: totalOccurrences,
        topSuccessors: top5,
        allSuccessors: sortedSuccessors
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
        }
      }
    );
  } catch (error: any) {
    console.error("[API /api/playwhe/transition] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
