import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  HistoricalDrawInput,
  MultiGameRngKey,
  MultiGameRngRequest,
  runMultiGameRngLab
} from "@/lib/multi_game_rng_lab";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SUPPORTED_GAMES: MultiGameRngKey[] = [
  "lotto-plus",
  "win-for-life",
  "play-whe",
  "pick4"
];

function parseGameKey(raw: string | null | undefined): MultiGameRngKey | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase() as MultiGameRngKey;
  return SUPPORTED_GAMES.includes(clean) ? clean : null;
}

async function loadChronologicalHistory(game: MultiGameRngKey): Promise<HistoricalDrawInput[]> {
  if (game === "lotto-plus") {
    let rows = await query<any>(
      "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC"
    ).catch(() => []);
    if (!rows || rows.length < 20) {
      rows = await query<any>(
        "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM lotto_draws ORDER BY CAST(draw_number AS INTEGER) ASC"
      ).catch(() => []);
    }
    const parsed: HistoricalDrawInput[] = (rows || []).map((r) => ({
      drawNumber: Number(r.draw_number),
      drawDate: String(r.draw_date || ""),
      numbers: [
        Number(r.num1),
        Number(r.num2),
        Number(r.num3),
        Number(r.num4),
        Number(r.num5)
      ].sort((a, b) => a - b),
      bonus: Math.max(1, Math.min(10, Number(r.powerball || 1)))
    }));
    const modern = parsed.filter((d) =>
      d.numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 35)
    );
    return modern.length >= 60 ? modern : parsed;
  }

  if (game === "win-for-life") {
    const rows = await query<any>(
      "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball FROM winforlife_draws ORDER BY CAST(draw_number AS INTEGER) ASC"
    );
    return (rows || [])
      .map((r) => {
        const rawCb = Number(r.cash_ball || 1);
        const cb = rawCb >= 1 && rawCb <= 3 ? rawCb : ((Math.abs(rawCb) - 1) % 3) + 1;
        return {
          drawNumber: Number(r.draw_number),
          drawDate: String(r.draw_date || ""),
          numbers: [
            Number(r.num1),
            Number(r.num2),
            Number(r.num3),
            Number(r.num4),
            Number(r.num5),
            Number(r.num6)
          ].sort((a, b) => a - b),
          bonus: cb
        };
      })
      .filter((d) => d.numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 28));
  }

  if (game === "play-whe") {
    const rows = await query<any>(
      "SELECT draw_number, draw_date, draw_time_slot, winning_number FROM playwhe_draws ORDER BY CAST(draw_number AS INTEGER) DESC LIMIT 2000"
    );
    return (rows || [])
      .reverse()
      .map((r) => ({
        drawNumber: Number(r.draw_number),
        drawDate: String(r.draw_date || ""),
        timeSlot: String(r.draw_time_slot || ""),
        numbers: [Number(r.winning_number)]
      }))
      .filter((d) => Number.isInteger(d.numbers[0]) && d.numbers[0] >= 1 && d.numbers[0] <= 36);
  }

  // Pick 4
  const rows = await query<any>(
    "SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 FROM pick4_draws ORDER BY CAST(draw_number AS INTEGER) DESC LIMIT 2000"
  );
  return (rows || [])
    .reverse()
    .map((r) => ({
      drawNumber: Number(r.draw_number),
      drawDate: String(r.draw_date || ""),
      timeSlot: String(r.draw_time_slot || ""),
      numbers: [Number(r.digit1), Number(r.digit2), Number(r.digit3), Number(r.digit4)]
    }))
    .filter((d) => d.numbers.every((n) => Number.isInteger(n) && n >= 0 && n <= 9));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const game = parseGameKey(searchParams.get("game"));
    if (!game) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid game parameter. Use lotto-plus, win-for-life, play-whe, or pick4."
        },
        { status: 400 }
      );
    }

    const slipRaw = Number(searchParams.get("slips") || 7);
    const windowRaw = searchParams.get("window") ? Number(searchParams.get("window")) : undefined;
    const autoTune = searchParams.get("autoTune") !== "false";
    const objective = searchParams.get("objective") || undefined;
    const bonusMode = searchParams.get("bonusMode") || undefined;
    const seedParam = searchParams.get("seed");
    const guardEnabled = searchParams.get("guardEnabled") !== "false";

    const draws = await loadChronologicalHistory(game);
    const data = runMultiGameRngLab(game, draws, {
      autoTune,
      slipCount: slipRaw === 5 || slipRaw === 10 ? slipRaw : 7,
      testWindow: windowRaw,
      objective,
      bonusMode,
      guardEnabled,
      seed: seedParam ? Number(seedParam) : undefined
    });

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err: any) {
    console.error("[API /api/rng-lab GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to run Multi-Game RNG Lab." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as MultiGameRngRequest & {
      game?: string;
    };
    const game = parseGameKey(body.game);
    if (!game) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid game parameter. Use lotto-plus, win-for-life, play-whe, or pick4."
        },
        { status: 400 }
      );
    }

    const draws = await loadChronologicalHistory(game);
    const data = runMultiGameRngLab(game, draws, {
      autoTune: Boolean(body.autoTune),
      weights: body.weights,
      slipCount: body.slipCount === 5 || body.slipCount === 10 ? body.slipCount : 7,
      testWindow: body.testWindow !== undefined ? Number(body.testWindow) : undefined,
      objective: body.objective,
      bonusMode: body.bonusMode,
      guardEnabled: body.guardEnabled !== false,
      seed: body.seed !== undefined ? Number(body.seed) : undefined
    });

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err: any) {
    console.error("[API /api/rng-lab POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to run Multi-Game RNG Lab." },
      { status: 500 }
    );
  }
}
