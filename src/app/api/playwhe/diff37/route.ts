import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { PlayWheDiff37Engine, PlayWheDiffDrawRecord } from "@/lib/playwhe_diff37_engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sql = `
      SELECT draw_number, draw_date, draw_time_slot, winning_number 
      FROM playwhe_draws 
      WHERE winning_number IS NOT NULL AND winning_number >= 1 AND winning_number <= 36
      ORDER BY CAST(draw_number AS INTEGER) ASC
    `;
    const rows = await query(sql);

    if (!rows || rows.length < 10) {
      return NextResponse.json({
        success: false,
        error: "Insufficient historical Play Whe draws in database to execute Diff-37 Quantitative Engine."
      }, { status: 400 });
    }

    const draws: PlayWheDiffDrawRecord[] = rows.map((r: any) => ({
      draw_number: Number(r.draw_number),
      draw_date: String(r.draw_date),
      draw_time_slot: String(r.draw_time_slot || "Morning"),
      winning_number: Number(r.winning_number)
    }));

    const analysis = PlayWheDiff37Engine.analyze(draws, 100);

    return NextResponse.json({
      success: true,
      data: analysis
    });
  } catch (error: any) {
    console.error("Play Whe Diff-37 API error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to execute Play Whe Diff-37 Engine"
    }, { status: 500 });
  }
}
