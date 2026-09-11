import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { 
  computePick4NextDrawProbabilities, 
  Pick4DrawRecord, 
  runPick4WalkForwardBacktest 
} from "@/lib/pick4_math_engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runBacktest = searchParams.get("backtest") === "true";
    const testSampleSize = Math.min(250, Math.max(10, parseInt(searchParams.get("sampleSize") || "100", 10)));
    const slotFilter = searchParams.get("slot") || "";

    let sql = `
      SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 
      FROM pick4_draws 
    `;
    const args: any[] = [];
    if (slotFilter) {
      sql += " WHERE draw_time_slot = ? ";
      args.push(slotFilter.toUpperCase());
    }
    sql += " ORDER BY CAST(draw_number AS INTEGER) ASC";

    const rawDraws = await query<any>(sql, args);

    if (!rawDraws || rawDraws.length < 15) {
      return NextResponse.json(
        { success: false, error: "Insufficient historical draws for Pick 4 in database." },
        { status: 400 }
      );
    }

    const drawsChronological: Pick4DrawRecord[] = rawDraws.map(d => ({
      draw_number: Number(d.draw_number),
      draw_date: String(d.draw_date),
      draw_time_slot: String(d.draw_time_slot),
      digit1: Number(d.digit1),
      digit2: Number(d.digit2),
      digit3: Number(d.digit3),
      digit4: Number(d.digit4)
    }));

    const prediction = computePick4NextDrawProbabilities(
      drawsChronological,
      slotFilter ? slotFilter.toUpperCase() : "NEXT"
    );

    let backtestResults = null;
    if (runBacktest) {
      backtestResults = runPick4WalkForwardBacktest(
        drawsChronological,
        testSampleSize
      );
    }

    const latestDraw = drawsChronological[drawsChronological.length - 1];

    return NextResponse.json(
      {
        success: true,
        game: "pick4",
        prediction,
        backtest: backtestResults,
        databaseStats: {
          totalDraws: drawsChronological.length,
          latestDrawNumber: latestDraw.draw_number,
          latestDrawDate: latestDraw.draw_date,
          latestDrawSlot: latestDraw.draw_time_slot
        }
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
        }
      }
    );
  } catch (error: any) {
    console.error("[API /api/pick4/math-engine] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred in Pick 4 Math Engine" },
      { status: 500 }
    );
  }
}
