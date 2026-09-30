import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { computeSum35DiffEngine, LottoDrawRecord } from "@/lib/lotto_diff35_engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Access all Lotto Plus draws from the database
    const rawDraws = await query<any>(
      `SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball 
       FROM draws 
       ORDER BY CAST(draw_number AS INTEGER) ASC`
    );

    if (!rawDraws || rawDraws.length < 10) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Insufficient historical draws for Lotto Plus in database to run Sum-35 quantitative engine." 
        },
        { status: 400 }
      );
    }

    const drawsChronological: LottoDrawRecord[] = rawDraws.map(d => ({
      draw_number: Number(d.draw_number),
      draw_date: String(d.draw_date),
      num1: Number(d.num1),
      num2: Number(d.num2),
      num3: Number(d.num3),
      num4: Number(d.num4),
      num5: Number(d.num5),
      powerball: d.powerball !== undefined ? Number(d.powerball) : undefined,
    }));

    // Compute live quantitative 35-difference engine analysis and verification
    const analysis = computeSum35DiffEngine(drawsChronological);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      game: "lotto-plus",
      totalDrawsInDb: drawsChronological.length,
      data: analysis,
    });
  } catch (err: any) {
    console.error("Error in /api/lotto/diff35 route:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to compute Sum-35 difference engine.",
      },
      { status: 500 }
    );
  }
}
