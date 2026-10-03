import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeCashPotQuant100Engine } from "@/lib/cashpot_quant100_engine";

export async function GET(request: NextRequest) {
  try {
    const rowsRes = await db.execute({
      sql: `SELECT draw_number, draw_date, num1, num2, num3, num4, num5, multiplier 
            FROM cashpot_draws 
            WHERE num1 IS NOT NULL AND num5 IS NOT NULL 
            ORDER BY draw_number ASC`,
      args: []
    });

    const draws = rowsRes.rows.map((r: any) => ({
      draw_number: Number(r.draw_number ?? r[0]),
      draw_date: String(r.draw_date ?? r[1]),
      num1: Number(r.num1 ?? r[2]),
      num2: Number(r.num2 ?? r[3]),
      num3: Number(r.num3 ?? r[4]),
      num4: Number(r.num4 ?? r[5]),
      num5: Number(r.num5 ?? r[6]),
      multiplier: r.multiplier ? Number(r.multiplier ?? r[7]) : 1,
    }));

    if (draws.length === 0) {
      return NextResponse.json({ success: false, error: "No Cash Pot draws found in database." }, { status: 404 });
    }

    const result = computeCashPotQuant100Engine(draws);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error("[API /api/cashpot/quant100 GET Error]:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to compute Cash Pot quant audit." }, { status: 500 });
  }
}
