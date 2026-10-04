import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { TakensAttractorEngine } from "@/lib/takens_attractor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get("game") || "lotto-plus";
    const limit = Math.min(500, Math.max(50, parseInt(searchParams.get("limit") || "250")));

    let rawDraws: { draw_number: number; draw_date: string; numbers: number[] }[] = [];

    if (game === "win-for-life") {
      const sql = `
        SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6 
        FROM winforlife_draws 
        ORDER BY CAST(draw_number AS INTEGER) ASC 
        LIMIT ?
      `;
      const rows = await query(sql, [limit]);
      rawDraws = rows.map((r: any) => ({
        draw_number: Number(r.draw_number),
        draw_date: r.draw_date,
        numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5), Number(r.num6)]
      }));
    } else if (game === "cashpot") {
      const sql = `
        SELECT draw_number, draw_date, num1, num2, num3, num4, num5 
        FROM cashpot_draws 
        ORDER BY CAST(draw_number AS INTEGER) ASC 
        LIMIT ?
      `;
      const rows = await query(sql, [limit]);
      rawDraws = rows.map((r: any) => ({
        draw_number: Number(r.draw_number),
        draw_date: r.draw_date,
        numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)]
      }));
    } else if (game === "pick4") {
      const sql = `
        SELECT draw_number, draw_date, d1, d2, d3, d4 
        FROM pick4_draws 
        ORDER BY CAST(draw_number AS INTEGER) ASC 
        LIMIT ?
      `;
      const rows = await query(sql, [limit]);
      rawDraws = rows.map((r: any) => ({
        draw_number: Number(r.draw_number),
        draw_date: r.draw_date,
        numbers: [Number(r.d1), Number(r.d2), Number(r.d3), Number(r.d4)]
      }));
    } else if (game === "playwhe") {
      const sql = `
        SELECT draw_number, draw_date, mark 
        FROM playwhe_draws 
        ORDER BY CAST(draw_number AS INTEGER) ASC 
        LIMIT ?
      `;
      const rows = await query(sql, [limit]);
      rawDraws = rows.map((r: any) => ({
        draw_number: Number(r.draw_number),
        draw_date: r.draw_date,
        numbers: [Number(r.mark)]
      }));
    } else {
      // Default: Lotto Plus
      const sql = `
        SELECT draw_number, draw_date, num1, num2, num3, num4, num5 
        FROM draws 
        ORDER BY CAST(draw_number AS INTEGER) ASC 
        LIMIT ?
      `;
      const rows = await query(sql, [limit]);
      rawDraws = rows.map((r: any) => ({
        draw_number: Number(r.draw_number),
        draw_date: r.draw_date,
        numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)]
      }));
    }

    if (!rawDraws || rawDraws.length < 20) {
      return NextResponse.json({
        success: false,
        error: `Insufficient historical draws (${rawDraws.length}) for attractor phase-space reconstruction.`
      }, { status: 400 });
    }

    const analysis = TakensAttractorEngine.analyze(game, rawDraws);

    return NextResponse.json({
      success: true,
      ...analysis
    });
  } catch (error: any) {
    console.error("Attractor API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
