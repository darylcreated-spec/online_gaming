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

    // 2. Ensure today's prediction exists
    const todayStr = getLocalDateString();
    await generatePlayWhePredictions(todayStr);

    // 3. Query predictions log (latest 100 entries)
    const predictionsRes = await db.execute({
      sql: `SELECT id, prediction_date, predicted_numbers, status, winning_number, winning_time_slot, winning_draw_number, created_at 
            FROM playwhe_predictions 
            ORDER BY prediction_date DESC 
            LIMIT 100`
    });

    const predictions = predictionsRes.rows.map(row => ({
      id: Number(row[0]),
      prediction_date: String(row[1]),
      predicted_numbers: String(row[2]),
      status: String(row[3]),
      winning_number: row[4] !== null ? Number(row[4]) : null,
      winning_time_slot: row[5] !== null ? String(row[5]) : null,
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
      }
    });
  } catch (error: any) {
    console.error("[API /api/playwhe/predictions] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
