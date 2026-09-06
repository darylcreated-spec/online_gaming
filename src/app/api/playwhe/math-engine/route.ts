import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { 
  computeNextDrawProbabilities, 
  getNextSlot, 
  PlayWheDraw, 
  runWalkForwardBacktest 
} from "@/lib/playwhe_engine";
import { getLocalDateString } from "@/lib/predictions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runBacktest = searchParams.get("backtest") === "true";
    const testSampleSize = Math.min(2000, Math.max(100, parseInt(searchParams.get("sampleSize") || "1000", 10)));
    const targetSlotParam = searchParams.get("slot");

    // Fetch all historical draws ordered chronologically (oldest to newest)
    const rawDraws = await query<any>(
      `SELECT draw_number, draw_date, draw_time_slot, winning_number 
       FROM playwhe_draws 
       ORDER BY CAST(draw_number AS INTEGER) ASC`
    );

    if (!rawDraws || rawDraws.length < 20) {
      return NextResponse.json(
        { success: false, error: "Insufficient historical draws in database (need >= 20)." },
        { status: 400 }
      );
    }

    const drawsChronological: PlayWheDraw[] = rawDraws.map(d => ({
      draw_number: Number(d.draw_number),
      draw_date: String(d.draw_date),
      draw_time_slot: String(d.draw_time_slot),
      winning_number: Number(d.winning_number)
    }));

    const latestDraw = drawsChronological[drawsChronological.length - 1];

    // Determine upcoming slot and target date
    const expectedSlot = targetSlotParam || getNextSlot(latestDraw.draw_time_slot);
    const todayStr = getLocalDateString();

    // Compute live next draw predictions
    const prediction = computeNextDrawProbabilities(
      drawsChronological,
      expectedSlot,
      todayStr
    );

    // If backtest requested, execute walk-forward test
    let backtestResults = null;
    if (runBacktest) {
      backtestResults = runWalkForwardBacktest(drawsChronological, testSampleSize);
    }

    return NextResponse.json(
      {
        success: true,
        prediction,
        backtest: backtestResults,
        databaseStats: {
          totalDraws: drawsChronological.length,
          latestDrawNumber: latestDraw.draw_number,
          latestDrawDate: latestDraw.draw_date,
          latestDrawSlot: latestDraw.draw_time_slot,
          latestWinningNumber: latestDraw.winning_number
        }
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
        }
      }
    );
  } catch (error: any) {
    console.error("[API /api/playwhe/math-engine] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred in Play Whe Math Engine" },
      { status: 500 }
    );
  }
}
