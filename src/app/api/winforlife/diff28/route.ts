import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { computeWinForLifeDiff28Engine, WinForLifeDrawRecord } from "@/lib/winforlife_diff28_engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawDraws = await query<any>(
      `SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball 
       FROM winforlife_draws 
       ORDER BY CAST(draw_number AS INTEGER) ASC`
    );

    if (!rawDraws || rawDraws.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient historical draws for Win For Life in database to run Sum-28 quantitative engine.",
        },
        { status: 400 }
      );
    }

    const drawsChronological: WinForLifeDrawRecord[] = rawDraws.map(d => ({
      draw_number: Number(d.draw_number),
      draw_date: String(d.draw_date),
      num1: Number(d.num1),
      num2: Number(d.num2),
      num3: Number(d.num3),
      num4: Number(d.num4),
      num5: Number(d.num5),
      num6: Number(d.num6),
      cash_ball: d.cash_ball !== undefined ? Number(d.cash_ball) : undefined,
    }));

    // Compute live quantitative 28-difference engine analysis and verification
    const analysis = computeWinForLifeDiff28Engine(drawsChronological);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      game: "win-for-life",
      totalDrawsInDb: drawsChronological.length,
      data: analysis,
    });
  } catch (err: any) {
    console.error("Error in /api/winforlife/diff28 route:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to compute Win For Life Sum-28 difference engine.",
      },
      { status: 500 }
    );
  }
}
