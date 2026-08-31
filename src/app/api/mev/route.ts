import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { runMEVEngine, GenericDrawRecord } from "@/lib/mev_engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const game = (searchParams.get("game") || "lotto-plus") as "lotto-plus" | "win-for-life";
    const ticketCount = Math.max(1, Math.min(20, parseInt(searchParams.get("tickets") || "5")));
    const candidates = Math.max(5000, Math.min(50000, parseInt(searchParams.get("candidates") || "25000")));

    let draws: GenericDrawRecord[] = [];

    if (game === "win-for-life") {
      draws = await query<GenericDrawRecord>(
        `SELECT num1, num2, num3, num4, num5, num6, cash_ball
         FROM winforlife_draws
         ORDER BY CAST(draw_number AS INTEGER) DESC`
      );
    } else {
      draws = await query<GenericDrawRecord>(
        `SELECT num1, num2, num3, num4, num5, powerball
         FROM draws
         ORDER BY CAST(draw_number AS INTEGER) DESC`
      );
    }

    if (!draws || draws.length < 10) {
      return NextResponse.json(
        { success: false, error: `Insufficient historical data for ${game} MEV analysis` },
        { status: 400 }
      );
    }

    // Run the Maximum Expected Value Engine
    const result = runMEVEngine(draws, ticketCount, candidates, game);

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error("[API /api/mev] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "MEV Engine error" },
      { status: 500 }
    );
  }
}
