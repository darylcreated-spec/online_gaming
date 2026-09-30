import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { computePick4Diff9Engine, Pick4DrawRecord } from "@/lib/pick4_diff9_engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawDraws = await query<any>(
      `SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 
       FROM pick4_draws 
       ORDER BY CAST(draw_number AS INTEGER) ASC`
    );

    if (!rawDraws || rawDraws.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient historical draws for Pick 4 in database to run Sum-9 quantitative engine.",
        },
        { status: 400 }
      );
    }

    const drawsChronological: Pick4DrawRecord[] = rawDraws.map(d => ({
      draw_number: Number(d.draw_number),
      draw_date: String(d.draw_date),
      draw_time_slot: String(d.draw_time_slot || "UNKNOWN"),
      digit1: Number(d.digit1),
      digit2: Number(d.digit2),
      digit3: Number(d.digit3),
      digit4: Number(d.digit4),
    }));

    // Compute live quantitative 9's complement engine analysis and verification
    const analysis = computePick4Diff9Engine(drawsChronological);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      game: "pick4",
      totalDrawsInDb: drawsChronological.length,
      data: analysis,
    });
  } catch (err: any) {
    console.error("Error in /api/pick4/diff9 route:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to compute Pick 4 Sum-9 difference engine.",
      },
      { status: 500 }
    );
  }
}
