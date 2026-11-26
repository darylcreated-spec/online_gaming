import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  CashPotHistoricalRow,
  CashPotRngLabRequest,
  runCashPotRngLab
} from "@/lib/cashpot_rng_lab";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function loadCashPotDrawsChronological(): Promise<CashPotHistoricalRow[]> {
  const rows = await query<any>(
    "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, multiplier FROM cashpot_draws ORDER BY CAST(draw_number AS INTEGER) ASC"
  );
  return (rows || [])
    .map((r) => ({
      drawNumber: Number(r.draw_number),
      drawDate: String(r.draw_date || ""),
      numbers: [
        Number(r.num1),
        Number(r.num2),
        Number(r.num3),
        Number(r.num4),
        Number(r.num5)
      ].sort((a, b) => a - b),
      multiplier: Math.max(1, Math.min(4, Number(r.multiplier || 1)))
    }))
    .filter((d) => d.numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 20));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slipRaw = Number(searchParams.get("slips") || 7);
    const windowRaw = Number(searchParams.get("window") || 60);
    const autoTune = searchParams.get("autoTune") !== "false";
    const objectiveRaw = searchParams.get("objective") || "match3_rate";
    const seedParam = searchParams.get("seed");

    const draws = await loadCashPotDrawsChronological();
    const data = runCashPotRngLab(draws, {
      autoTune,
      slipCount: slipRaw === 5 || slipRaw === 10 ? slipRaw : 7,
      testWindow: windowRaw === 40 || windowRaw === 80 ? windowRaw : 60,
      objective:
        objectiveRaw === "high_tier" || objectiveRaw === "multiplier_roi"
          ? objectiveRaw
          : "match3_rate",
      seed: seedParam ? Number(seedParam) : undefined,
      antiCrowding: searchParams.get("antiCrowding") !== "false"
    });

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err: any) {
    console.error("[API /api/cashpot/rng-lab GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to run Cash Pot RNG Lab." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CashPotRngLabRequest;
    const draws = await loadCashPotDrawsChronological();
    const data = runCashPotRngLab(draws, {
      autoTune: Boolean(body.autoTune),
      genome: body.genome,
      slipCount: body.slipCount === 5 || body.slipCount === 10 ? body.slipCount : 7,
      testWindow: body.testWindow === 40 || body.testWindow === 80 ? body.testWindow : 60,
      objective:
        body.objective === "high_tier" || body.objective === "multiplier_roi"
          ? body.objective
          : "match3_rate",
      seed: body.seed !== undefined ? Number(body.seed) : undefined,
      antiCrowding: body.antiCrowding !== false
    });

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err: any) {
    console.error("[API /api/cashpot/rng-lab POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to run Cash Pot RNG Lab." },
      { status: 500 }
    );
  }
}
