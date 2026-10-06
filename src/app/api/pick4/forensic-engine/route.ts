import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { executePick4ForensicEngine, Pick4Draw } from "@/lib/pick4_forensic_engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rows = await query<any>(
      `SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 
       FROM pick4_draws 
       ORDER BY CAST(draw_number AS INTEGER) ASC`
    );

    if (!rows || rows.length < 20) {
      return NextResponse.json({
        success: false,
        error: "Insufficient Pick 4 draws in database for forensic analysis."
      }, { status: 400 });
    }

    const draws: Pick4Draw[] = rows.map(r => ({
      draw_number: Number(r.draw_number),
      draw_date: String(r.draw_date),
      draw_time_slot: String(r.draw_time_slot || "MORNING"),
      digit1: Number(r.digit1),
      digit2: Number(r.digit2),
      digit3: Number(r.digit3),
      digit4: Number(r.digit4)
    }));

    const url = new URL(request.url);
    const depthParam = url.searchParams.get("depth");
    let sampleSize = 100;
    if (depthParam === "50") sampleSize = 50;
    else if (depthParam === "100") sampleSize = 100;
    else if (depthParam === "200") sampleSize = 200;
    else if (depthParam === "all" || depthParam === "full") sampleSize = draws.length - 20;

    const result = executePick4ForensicEngine(draws, sampleSize);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("[Pick 4 Forensic Engine API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to execute Pick 4 forensic engine."
    }, { status: 500 });
  }
}
