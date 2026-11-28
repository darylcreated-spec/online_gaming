import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computePlayWheQuant100Engine } from "@/lib/playwhe_quant100_engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Fetch latest 2000 modern draws from Turso (aligned with consensus_engine.ts)
    const rowsRes = await db.execute({
      sql: `SELECT draw_number, draw_date, draw_time_slot, winning_number 
            FROM playwhe_draws 
            WHERE winning_number IS NOT NULL AND winning_number >= 1 AND winning_number <= 36 
            ORDER BY draw_number DESC 
            LIMIT 2000`,
      args: []
    });

    const draws = rowsRes.rows.map((r: any) => ({
      draw_number: Number(r.draw_number ?? r[0]),
      draw_date: String(r.draw_date ?? r[1]),
      draw_time_slot: String(r.draw_time_slot ?? r[2] ?? "Morning"),
      winning_number: Number(r.winning_number ?? r[3]),
    })).reverse(); // Oldest to newest for walk-forward

    if (draws.length === 0) {
      return NextResponse.json({ success: false, error: "No Play Whe draws found in database." }, { status: 404 });
    }

    const result = computePlayWheQuant100Engine(draws, 100);

    return NextResponse.json(
      {
        success: true,
        data: result
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error: any) {
    console.error("[API /api/playwhe/quant100 GET Error]:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to compute Play Whe quant audit." }, { status: 500 });
  }
}
