import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { CashPotDiffEngine, CashPotDrawRecord } from "@/lib/cashpot_diff20_engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sql = `
      SELECT draw_number, draw_date, num1, num2, num3, num4, num5, multiplier 
      FROM cashpot_draws 
      ORDER BY CAST(draw_number AS INTEGER) ASC
    `;
    const rows = await query(sql);

    if (!rows || rows.length < 5) {
      return NextResponse.json({
        success: false,
        error: "Insufficient historical Cash Pot draws in database to execute Sum-28/Diff-20 Quantitative Engine."
      }, { status: 400 });
    }

    const draws: CashPotDrawRecord[] = rows.map((r: any) => ({
      draw_number: Number(r.draw_number),
      draw_date: r.draw_date,
      num1: Number(r.num1),
      num2: Number(r.num2),
      num3: Number(r.num3),
      num4: Number(r.num4),
      num5: Number(r.num5),
      multiplier: r.multiplier ? Number(r.multiplier) : 1
    }));

    const analysis = CashPotDiffEngine.analyze(draws);

    return NextResponse.json({
      success: true,
      data: analysis
    });
  } catch (error: any) {
    console.error("Cash Pot Diff/Sum-28 API error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to execute Cash Pot Diff/Sum-28 Engine"
    }, { status: 500 });
  }
}
