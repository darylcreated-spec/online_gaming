import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { computeWinForLifeQuant100Engine } from "@/lib/winforlife_quant100_engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const draws = await query<any>(
      "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball, jackpot FROM winforlife_draws ORDER BY CAST(draw_number AS INTEGER) ASC"
    );

    if (!draws || draws.length < 20) {
      return NextResponse.json(
        { success: false, error: "Insufficient draws for Win For Life Quant 100% Analysis" },
        { status: 400 }
      );
    }

    const analysis = computeWinForLifeQuant100Engine(draws);

    return NextResponse.json(
      { success: true, data: analysis },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
        }
      }
    );
  } catch (error: any) {
    console.error("[API /api/winforlife/quant100] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to compute Win For Life Quant 100% Analysis" },
      { status: 500 }
    );
  }
}
