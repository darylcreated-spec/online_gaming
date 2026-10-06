import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { executeLottoForensicEngine, LottoDraw } from "@/lib/lotto_forensic_engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    let rows: any[] = [];
    try {
      rows = await query<any>(
        `SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball 
         FROM draws 
         ORDER BY CAST(draw_number AS INTEGER) ASC`
      );
    } catch {
      // Fallback if named lotto_draws
      rows = await query<any>(
        `SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball 
         FROM lotto_draws 
         ORDER BY CAST(draw_number AS INTEGER) ASC`
      );
    }

    if (!rows || rows.length < 20) {
      return NextResponse.json({
        success: false,
        error: "Insufficient Lotto Plus draws in database for forensic analysis."
      }, { status: 400 });
    }

    const draws: LottoDraw[] = rows.map(r => ({
      draw_number: Number(r.draw_number),
      draw_date: String(r.draw_date),
      numbers: [
        Number(r.num1),
        Number(r.num2),
        Number(r.num3),
        Number(r.num4),
        Number(r.num5)
      ].sort((a, b) => a - b),
      powerball: Number(r.powerball || 1)
    }));

    const url = new URL(request.url);
    const depthParam = url.searchParams.get("depth");
    let sampleSize = 100;
    if (depthParam === "50") sampleSize = 50;
    else if (depthParam === "100") sampleSize = 100;
    else if (depthParam === "200") sampleSize = 200;
    else if (depthParam === "all" || depthParam === "full") sampleSize = draws.length - 15;

    const result = executeLottoForensicEngine(draws, sampleSize);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("[Lotto Plus Forensic Engine API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to execute Lotto Plus forensic engine."
    }, { status: 500 });
  }
}
