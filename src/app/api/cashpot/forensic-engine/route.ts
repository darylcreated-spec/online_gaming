import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { executeCashPotForensicEngine, CashPotDraw } from "@/lib/cashpot_forensic_engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rows = await query<any>(
      `SELECT draw_number, draw_date, num1, num2, num3, num4, num5, multiplier 
       FROM cashpot_draws 
       ORDER BY CAST(draw_number AS INTEGER) ASC`
    );

    if (!rows || rows.length < 20) {
      return NextResponse.json({
        success: false,
        error: "Insufficient Cash Pot draws in database for forensic analysis."
      }, { status: 400 });
    }

    const draws: CashPotDraw[] = rows.map(r => ({
      draw_number: Number(r.draw_number),
      draw_date: String(r.draw_date),
      numbers: [
        Number(r.num1),
        Number(r.num2),
        Number(r.num3),
        Number(r.num4),
        Number(r.num5)
      ].sort((a, b) => a - b),
      multiplier: Number(r.multiplier || 1)
    }));

    const url = new URL(request.url);
    const depthParam = url.searchParams.get("depth");
    let sampleSize = 100;
    if (depthParam === "50") sampleSize = 50;
    else if (depthParam === "100") sampleSize = 100;
    else if (depthParam === "200") sampleSize = 200;
    else if (depthParam === "all" || depthParam === "full") sampleSize = draws.length - 15;

    const result = executeCashPotForensicEngine(draws, sampleSize);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("[Cash Pot Forensic Engine API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to execute Cash Pot forensic engine."
    }, { status: 500 });
  }
}
