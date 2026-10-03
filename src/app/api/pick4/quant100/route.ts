import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computePick4Quant100Engine } from "@/lib/pick4_quant100_engine";

export async function GET(request: NextRequest) {
  try {
    const rowsRes = await db.execute({
      sql: `SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 
            FROM pick4_draws 
            WHERE digit1 IS NOT NULL AND digit4 IS NOT NULL 
            ORDER BY draw_number ASC`,
      args: []
    });

    const draws = rowsRes.rows.map((r: any) => ({
      draw_number: Number(r.draw_number ?? r[0]),
      draw_date: String(r.draw_date ?? r[1]),
      draw_time_slot: r.draw_time_slot ? String(r.draw_time_slot ?? r[2]) : undefined,
      digit1: Number(r.digit1 ?? r[3]),
      digit2: Number(r.digit2 ?? r[4]),
      digit3: Number(r.digit3 ?? r[5]),
      digit4: Number(r.digit4 ?? r[6]),
    }));

    if (draws.length === 0) {
      return NextResponse.json({ success: false, error: "No Pick 4 draws found in database." }, { status: 404 });
    }

    const result = computePick4Quant100Engine(draws, 100);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error("[API /api/pick4/quant100 GET Error]:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to compute Pick 4 quant audit." }, { status: 500 });
  }
}
