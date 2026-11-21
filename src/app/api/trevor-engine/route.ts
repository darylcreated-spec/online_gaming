import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureFastCashSchema, queryFastCash } from "@/lib/fastcash_db";
import {
  executeTrevorEngine,
  TrevorGameKey,
  TrevorHistoricalDraw
} from "@/lib/trevor_engine";

export const dynamic = "force-dynamic";

const VALID_GAMES: TrevorGameKey[] = [
  "cashpot",
  "lotto-plus",
  "win-for-life",
  "play-whe",
  "pick4",
  "fast-cash"
];

async function loadGameHistory(game: TrevorGameKey): Promise<TrevorHistoricalDraw[]> {
  if (game === "cashpot") {
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
        bonus: r.multiplier !== undefined && r.multiplier !== null ? Number(r.multiplier) : 1
      }))
      .filter((d) => d.numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 20));
  }

  if (game === "lotto-plus") {
    let rows = await query<any>(
      "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC"
    ).catch(() => []);
    if (!rows || rows.length < 20) {
      rows = await query<any>(
        "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM lotto_draws ORDER BY CAST(draw_number AS INTEGER) ASC"
      ).catch(() => []);
    }
    const parsed = (rows || []).map((r) => ({
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
    return modern.length >= 20 ? modern : parsed;
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

  if (game === "pick4") {
    const rows = await query<any>(
      "SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 FROM pick4_draws ORDER BY CAST(draw_number AS INTEGER) DESC LIMIT 2000"
    );
    return (rows || [])
      .reverse()
      .map((r) => ({
        drawNumber: Number(r.draw_number),
        drawDate: String(r.draw_date || ""),
        timeSlot: String(r.draw_time_slot || ""),
        numbers: [
          Number(r.digit1),
          Number(r.digit2),
          Number(r.digit3),
          Number(r.digit4)
        ]
      }))
      .filter((d) => d.numbers.every((n) => Number.isInteger(n) && n >= 0 && n <= 9));
  }

  // Fast Cash
  await ensureFastCashSchema();
  const rows = await queryFastCash<any>(
    "SELECT draw_number, draw_date, draw_time, winning_code, winning_index FROM fastcash_draws ORDER BY draw_number DESC LIMIT 2000"
  );
  return (rows || [])
    .reverse()
    .map((r: any) => ({
      drawNumber: Number(r.draw_number),
      drawDate: String(r.draw_date || ""),
      timeSlot: String(r.draw_time || ""),
      numbers: [Number(r.winning_index)]
    }))
    .filter((d) => Number.isInteger(d.numbers[0]) && d.numbers[0] >= 0 && d.numbers[0] <= 37);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawGame = (searchParams.get("game") || "lotto-plus") as TrevorGameKey;
    if (!VALID_GAMES.includes(rawGame)) {
      return NextResponse.json(
        { success: false, error: `Unsupported game "${rawGame}".` },
        { status: 400 }
      );
    }

    const totalPlays = Math.max(
      50,
      Math.min(5000, parseInt(searchParams.get("simulations") || "500", 10) || 500)
    );
    const seedParam = searchParams.get("seed");
    const customSeed = seedParam ? parseInt(seedParam, 10) : undefined;
    const includeBacktest = searchParams.get("backtest") !== "false";
    const backtestWindow = Math.max(
      10,
      Math.min(80, parseInt(searchParams.get("window") || "40", 10) || 40)
    );

    const histDraws = await loadGameHistory(rawGame);
    const result = executeTrevorEngine(rawGame, histDraws, {
      totalPlays,
      customSeed: Number.isFinite(customSeed) ? customSeed : undefined,
      includeBacktest,
      backtestWindow
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    console.error("[API /api/trevor-engine] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to compute Trevor Engine." },
      { status: 500 }
    );
  }
}
