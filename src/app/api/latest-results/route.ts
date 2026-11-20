import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { queryFastCash } from "@/lib/fastcash_db";

export const dynamic = "force-dynamic";

/**
 * Consolidated ultra-fast Home endpoint: fetches the latest verified draw
 * for all 6 NLCB games in a single parallel DB round-trip (replaces 6 separate API calls).
 */
export async function GET() {
  try {
    const [lotto, playWhe, winForLife, cashPot, pick4, fastCash] = await Promise.allSettled([
      query<any>("SELECT * FROM draws ORDER BY CAST(draw_number AS INTEGER) DESC LIMIT 1"),
      query<any>("SELECT * FROM playwhe_draws ORDER BY draw_number DESC LIMIT 1"),
      query<any>("SELECT * FROM winforlife_draws ORDER BY draw_number DESC LIMIT 1"),
      query<any>("SELECT * FROM cashpot_draws ORDER BY draw_number DESC LIMIT 1"),
      query<any>("SELECT * FROM pick4_draws ORDER BY draw_number DESC LIMIT 1"),
      queryFastCash<any>("SELECT draw_number, draw_date, draw_time, winning_code, winning_index FROM fastcash_draws ORDER BY draw_number DESC LIMIT 1")
    ]);

    const firstRow = (res: PromiseSettledResult<any[]>) =>
      res.status === "fulfilled" && Array.isArray(res.value) && res.value.length > 0
        ? res.value[0]
        : null;

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        latest: {
          lotto: firstRow(lotto),
          playWhe: firstRow(playWhe),
          winForLife: firstRow(winForLife),
          cashPot: firstRow(cashPot),
          pick4: firstRow(pick4),
          fastCash: firstRow(fastCash)
        }
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40"
        }
      }
    );
  } catch (error: any) {
    console.error("[API /api/latest-results] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load latest results" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
