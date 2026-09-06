import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { 
  computeMultiBallNextDrawProbabilities, 
  MultiBallDrawRecord, 
  runMultiBallWalkForwardBacktest, 
  SupportedGame 
} from "@/lib/lotto_wfl_math_engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameParam = (searchParams.get("game") || "lotto-plus").toLowerCase();
    const game: SupportedGame = gameParam === "win-for-life" ? "win-for-life" : "lotto-plus";
    
    const runBacktest = searchParams.get("backtest") === "true";
    const testSampleSize = Math.min(250, Math.max(10, parseInt(searchParams.get("sampleSize") || "100", 10)));

    let rawDraws: any[] = [];
    if (game === "win-for-life") {
      rawDraws = await query<any>(
        `SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball 
         FROM winforlife_draws 
         ORDER BY CAST(draw_number AS INTEGER) ASC`
      );
    } else {
      rawDraws = await query<any>(
        `SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball 
         FROM draws 
         ORDER BY CAST(draw_number AS INTEGER) ASC`
      );
    }

    if (!rawDraws || rawDraws.length < 15) {
      return NextResponse.json(
        { success: false, error: `Insufficient historical draws for ${game} in database.` },
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
      num6: d.num6 !== undefined ? Number(d.num6) : undefined,
      powerball: d.powerball !== undefined ? Number(d.powerball) : undefined,
      cash_ball: d.cash_ball !== undefined ? Number(d.cash_ball) : undefined
    }));

    // Compute live next draw probability mass and optimal ensemble
    const prediction = computeMultiBallNextDrawProbabilities(
      drawsChronological,
      game
    );

    // If requested, run walk-forward out-of-sample backtest
    let backtestResults = null;
    if (runBacktest) {
      backtestResults = runMultiBallWalkForwardBacktest(
        drawsChronological,
        game,
        testSampleSize
      );
    }

    const latestDraw = drawsChronological[drawsChronological.length - 1];

    return NextResponse.json(
      {
        success: true,
        game,
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
    console.error("[API /api/lotto/math-engine] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred in Multi-Ball Math Engine" },
      { status: 500 }
    );
  }
}
