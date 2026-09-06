import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { 
  computeMultiBallNextDrawProbabilities, 
  MultiBallDrawRecord, 
  runMultiBallWalkForwardBacktest 
} from "@/lib/lotto_wfl_math_engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runBacktest = searchParams.get("backtest") === "true";
    const testSampleSize = Math.min(250, Math.max(10, parseInt(searchParams.get("sampleSize") || "100", 10)));

    const rawDraws = await query<any>(
      `SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball 
       FROM winforlife_draws 
       ORDER BY CAST(draw_number AS INTEGER) ASC`
    );

    if (!rawDraws || rawDraws.length < 15) {
      return NextResponse.json(
        { success: false, error: "Insufficient historical draws for Win For Life in database." },
        { status: 400 }
      );
    }

    const drawsChronological: MultiBallDrawRecord[] = rawDraws.map(d => ({
      draw_number: Number(d.draw_number),
      draw_date: String(d.draw_date),
      num1: Number(d.num1),
      num2: Number(d.num2),
      num3: Number(d.num3),
      num4: Number(d.num4),
      num5: Number(d.num5),
      num6: Number(d.num6),
      cash_ball: Number(d.cash_ball)
    }));

    const prediction = computeMultiBallNextDrawProbabilities(
      drawsChronological,
      "win-for-life"
    );

    let backtestResults = null;
    if (runBacktest) {
      backtestResults = runMultiBallWalkForwardBacktest(
        drawsChronological,
        "win-for-life",
        testSampleSize
      );
    }

    const latestDraw = drawsChronological[drawsChronological.length - 1];

    return NextResponse.json(
      {
        success: true,
        game: "win-for-life",
        prediction,
        backtest: backtestResults,
        databaseStats: {
          totalDraws: drawsChronological.length,
          latestDrawNumber: latestDraw.draw_number,
          latestDrawDate: latestDraw.draw_date
        }
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
        }
      }
    );
  } catch (error: any) {
    console.error("[API /api/winforlife/math-engine] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred in Win For Life Math Engine" },
      { status: 500 }
    );
  }
}
