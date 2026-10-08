import { NextRequest, NextResponse } from "next/server";
import { 
  getEngineLeaderboardStats, 
  snapshotAllEnginePredictions, 
  reconcileAndGradeEnginePredictions,
  seedHistoricalEngineAuditsIfEmpty
} from "@/lib/engine_tracker";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get("game") || "all";
    const depthParam = searchParams.get("depth") || "100";
    const horizon = depthParam === "all" ? 1000 : parseInt(depthParam, 10) || 100;

    // Check if initial seeding/snapshotting is needed
    await seedHistoricalEngineAuditsIfEmpty();

    const stats = await getEngineLeaderboardStats(game, horizon);

    return NextResponse.json({
      success: true,
      game,
      horizon,
      ...stats
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache"
      }
    });
  } catch (error: any) {
    console.error("[API /api/engine-tracker GET Error]:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to load Engine Tracker analytics."
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "reconcile_and_snapshot";
    const specificGame = body.game || undefined;

    let reconcileResult = { verifiedCount: 0, prizesAwarded: 0 };
    let snapshotResult = { recordedCount: 0 };

    if (action === "reconcile" || action === "reconcile_and_snapshot") {
      reconcileResult = await reconcileAndGradeEnginePredictions();
    }

    if (action === "snapshot" || action === "reconcile_and_snapshot") {
      snapshotResult = await snapshotAllEnginePredictions(specificGame);
    }

    return NextResponse.json({
      success: true,
      action,
      reconciled: reconcileResult,
      snapshotted: snapshotResult,
      message: `Reconciliation verified ${reconcileResult.verifiedCount} draws (${reconcileResult.prizesAwarded} prize hits). Snapshotted ${snapshotResult.recordedCount} engine predictions.`
    });
  } catch (error: any) {
    console.error("[API /api/engine-tracker POST Error]:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to execute Engine Tracker action."
    }, { status: 500 });
  }
}
