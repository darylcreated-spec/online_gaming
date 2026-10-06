import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { executeWinForLifeForensicEngine, WFLDraw } from "@/lib/winforlife_forensic_engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rows = await query<any>(
      `SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball 
       FROM winforlife_draws 
       ORDER BY CAST(draw_number AS INTEGER) ASC`
    );

    if (!rows || rows.length < 20) {
      return NextResponse.json({
        success: false,
        error: "Insufficient Win For Life draws in database for forensic analysis."
      }, { status: 400 });
    }

    const draws: WFLDraw[] = rows.map(r => ({
      draw_number: Number(r.draw_number),
      draw_date: String(r.draw_date),
      numbers: [
        Number(r.num1),
        Number(r.num2),
        Number(r.num3),
        Number(r.num4),
        Number(r.num5),
        Number(r.num6)
      ].sort((a, b) => a - b),
      cash_ball: Number(r.cash_ball || 1)
    }));

    const url = new URL(request.url);
    const depthParam = url.searchParams.get("depth");
    let sampleSize = 100;
    if (depthParam === "50") sampleSize = 50;
    else if (depthParam === "100") sampleSize = 100;
    else if (depthParam === "200") sampleSize = 200;
    else if (depthParam === "all" || depthParam === "full") sampleSize = draws.length - 15;

    const result = executeWinForLifeForensicEngine(draws, sampleSize);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("[Win For Life Forensic Engine API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to execute Win For Life forensic engine."
    }, { status: 500 });
  }
}
