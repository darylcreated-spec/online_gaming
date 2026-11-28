import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_SLIP_GAMES = new Set([
  "lotto",
  "lotto-plus",
  "win-for-life",
  "play-whe",
  "cashpot",
  "pick4",
  "fast-cash"
]);

export async function GET() {
  try {
    const slips = await query("SELECT * FROM saved_slips ORDER BY created_at DESC LIMIT 200");
    return NextResponse.json(
      { success: true, slips },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error: any) {
    console.error("[API /api/slips] Error GET:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawName = String(body.name || body.group_name || "").trim().slice(0, 120);
    const rawGame = String(body.game_type || body.game || "").trim().toLowerCase();
    const rawNumbers = Array.isArray(body.numbers)
      ? body.numbers.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)).join(",")
      : String(body.numbers || "").trim();
    const powerball = body.powerball !== undefined && body.powerball !== null ? Number(body.powerball) : null;

    if (!rawName || !rawGame || !rawNumbers) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, game_type, numbers" },
        { status: 400 }
      );
    }
    if (!ALLOWED_SLIP_GAMES.has(rawGame)) {
      return NextResponse.json(
        { success: false, error: `Unsupported game_type "${rawGame}".` },
        { status: 400 }
      );
    }
    if (rawNumbers.length > 120) {
      return NextResponse.json(
        { success: false, error: "Numbers string is too long." },
        { status: 400 }
      );
    }

    await query(
      "INSERT INTO saved_slips (name, game_type, numbers, powerball) VALUES (?, ?, ?, ?)",
      [rawName, rawGame, rawNumbers, powerball !== null && Number.isFinite(powerball) ? powerball : null]
    );

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("[API /api/slips] Error POST:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idRaw = searchParams.get("id");
    const id = idRaw ? parseInt(idRaw, 10) : NaN;

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid numeric slip id is required" },
        { status: 400 }
      );
    }

    await query("DELETE FROM saved_slips WHERE id = ?", [id]);
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("[API /api/slips] Error DELETE:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
