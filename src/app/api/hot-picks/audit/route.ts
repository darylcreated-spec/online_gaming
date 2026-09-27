import { NextRequest, NextResponse } from "next/server";
import { getPredictionAuditLedger } from "@/lib/prediction_audit_engine";
import { reviseAndAuditAfterDraw } from "@/lib/winning_formula_engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get("game") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 150;

    const data = await getPredictionAuditLedger(game, limit);

    // Calculate extended live statistics
    const verified = data.records.filter(r => r.status !== "PENDING");
    const prizeWinners = verified.filter(r => r.is_prize_winner === 1);
    const partials = verified.filter(r => r.status === "VERIFIED_PARTIAL");

    // Compute live winning streak (consecutive verified draws with either prize win or partial match)
    let currentStreak = 0;
    for (const rec of verified) {
      if (rec.is_prize_winner === 1 || rec.status === "VERIFIED_PARTIAL") {
        currentStreak++;
      } else {
        break;
      }
    }

    const lastWinner = prizeWinners.length > 0 ? prizeWinners[0] : null;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      liveStatistics: {
        totalAudited: data.summary.totalAudited,
        totalVerified: data.summary.totalVerified,
        totalPending: data.summary.totalPending,
        prizeWinningHits: data.summary.prizeWinningCount,
        prizeWinRatePct: data.summary.prizeWinRatePct,
        partialMatchHits: partials.length,
        combinedHitRatePct: verified.length > 0 ? ((prizeWinners.length + partials.length) / verified.length) * 100 : 0,
        averageBallsMatched: data.summary.averageMatchCount,
        activeStreak: currentStreak,
        lastVerifiedWinner: lastWinner ? {
          gameKey: lastWinner.game_key,
          drawNumber: lastWinner.target_draw_number,
          prizeTier: lastWinner.prize_tier,
          matchingNumbers: lastWinner.matching_numbers,
          matchCount: lastWinner.match_count,
          verifiedAt: lastWinner.verified_at
        } : null
      },
      ...data
    });
  } catch (error: any) {
    console.error("Prediction audit GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Reconcile past predictions against newly arrived draws, revise the selected numbers, and log new hot picks
    const revisionResult = await reviseAndAuditAfterDraw();
    const freshLedger = await getPredictionAuditLedger(undefined, 150);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      reconciliation: revisionResult.reconciled,
      revisedHotPicks: revisionResult.revisedHotPicks.map(p => ({
        gameKey: p.gameKey,
        targetDrawNumber: p.targetDrawNumber,
        predictedNumbers: p.predictedNumbers,
        formula: p.formulaDescription,
        confidenceScore: p.confidenceScore
      })),
      summary: freshLedger.summary
    });
  } catch (error: any) {
    console.error("Prediction audit POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
