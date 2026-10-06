import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { executePlayWheForensicEngine, PlayWheDraw } from "@/lib/playwhe_forensic_engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rows = await query<any>(
      `SELECT draw_number, draw_date, draw_time_slot, winning_number 
       FROM playwhe_draws 
       ORDER BY CAST(draw_number AS INTEGER) ASC`
    );

    if (!rows || rows.length < 20) {
      return NextResponse.json({
        success: false,
        error: "Insufficient Play Whe draws in database for forensic analysis."
      }, { status: 400 });
    }

    const draws: PlayWheDraw[] = rows.map(r => ({
      draw_number: Number(r.draw_number),
      draw_date: String(r.draw_date),
      draw_time_slot: String(r.draw_time_slot || "Morning"),
      winning_number: Number(r.winning_number)
    }));

    const url = new URL(request.url);
    const depthParam = url.searchParams.get("depth");
    let sampleSize = 100;
    if (depthParam === "50") sampleSize = 50;
    else if (depthParam === "100") sampleSize = 100;
    else if (depthParam === "200") sampleSize = 200;
    else if (depthParam === "all" || depthParam === "full") sampleSize = draws.length - 20;

    const result = executePlayWheForensicEngine(draws, sampleSize);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("[Play Whe Forensic Engine API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to execute Play Whe forensic engine."
    }, { status: 500 });
  }
}
