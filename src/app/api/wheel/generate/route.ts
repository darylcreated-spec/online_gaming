import { NextRequest, NextResponse } from "next/server";
import { FastLotteryWheeler } from "@/lib/FastLotteryWheeler";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { game, pool, matchGoal, conditionHits } = body;

    if (!pool || !Array.isArray(pool) || pool.length < 5) {
      return NextResponse.json({ success: false, error: "Please provide a valid pool with at least 5 numbers" }, { status: 400 });
    }

    const gameKey = game || "cashpot";
    let ticketSize = 5;
    let ticketCostTT = 4.0; // Cash Pot base $4 TT

    if (gameKey === "lotto-plus") {
      ticketSize = 5;
      ticketCostTT = 5.0; // Lotto Plus base $5 TT
    } else if (gameKey === "win-for-life") {
      ticketSize = 6;
      ticketCostTT = 10.0; // Win For Life base $10 TT
    }

    const goal = matchGoal ? parseInt(matchGoal) : 3;
    const hits = conditionHits ? parseInt(conditionHits) : (ticketSize - 1);

    const result = FastLotteryWheeler.generateWheel(
      pool.map(Number),
      ticketSize,
      goal,
      hits,
      ticketCostTT
    );

    return NextResponse.json({
      success: true,
      game: gameKey,
      ...result
    });
  } catch (error: any) {
    console.error("Wheel generator API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
