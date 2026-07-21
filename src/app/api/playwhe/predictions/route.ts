import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  getLocalDateString, 
  generatePlayWhePredictions, 
  verifyPlayWhePredictions 
} from "@/lib/predictions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Run validation checks on PENDING entries
    await verifyPlayWhePredictions();

    // 2. Ensure today's predictions exist for all 4 slots
    const todayStr = getLocalDateString();
    const modelBreakdown: Record<string, any[]> = {};
    for (const slot of ["MORNING", "MIDDAY", "AFTERNOON", "EVENING"]) {
      const res = await generatePlayWhePredictions(todayStr, slot);
      if (res.modelBreakdown) {
        modelBreakdown[slot] = res.modelBreakdown;
      }
    }

    // 3. Query predictions log (latest 100 entries sorted newest first)
    const predictionsRes = await db.execute({
      sql: `SELECT 
              p.id, 
              p.prediction_date, 
              p.draw_time_slot, 
              p.predicted_numbers, 
              p.status, 
              COALESCE(p.winning_number, d.winning_number) as winning_number, 
              COALESCE(p.winning_draw_number, d.draw_number) as winning_draw_number, 
              p.created_at 
            FROM playwhe_predictions p
            LEFT JOIN playwhe_draws d ON p.prediction_date = d.draw_date AND UPPER(p.draw_time_slot) = UPPER(d.draw_time_slot)
            ORDER BY p.prediction_date DESC, 
                     CASE p.draw_time_slot 
                       WHEN 'EVENING' THEN 1 
                       WHEN 'AFTERNOON' THEN 2 
                       WHEN 'MIDDAY' THEN 3 
                       WHEN 'MORNING' THEN 4 
                     END ASC
            LIMIT 100`
    });

    const predictions = predictionsRes.rows.map(row => ({
      id: Number(row[0]),
      prediction_date: String(row[1]),
      draw_time_slot: String(row[2]),
      predicted_numbers: String(row[3]),
      status: String(row[4]),
      winning_number: row[5] !== null ? Number(row[5]) : null,
      winning_draw_number: row[6] !== null ? Number(row[6]) : null,
      created_at: String(row[7])
    }));

    // 4. Compute overall statistics for predictions that have been completed
    const statsRes = await db.execute({
      sql: `SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'HIT' THEN 1 ELSE 0 END) as hits,
              SUM(CASE WHEN status = 'MISS' THEN 1 ELSE 0 END) as misses
            FROM playwhe_predictions 
            WHERE status != 'PENDING'`
    });

    const total = Number(statsRes.rows[0][0]) || 0;
    const hits = Number(statsRes.rows[0][1]) || 0;
    const misses = Number(statsRes.rows[0][2]) || 0;
    const hitRate = total > 0 ? Math.round((hits / total) * 1000) / 10 : 0;

    return NextResponse.json({
      success: true,
      predictions,
      stats: {
        total,
        hits,
        misses,
        hitRate
      },
      modelBreakdown
    });
  } catch (error: any) {
    console.error("[API /api/playwhe/predictions] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
