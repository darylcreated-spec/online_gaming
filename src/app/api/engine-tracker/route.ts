import { NextRequest, NextResponse } from "next/server";
import {
  getEngineLeaderboardStats,
  snapshotAllEnginePredictions,
  reconcileAndGradeEnginePredictions,
  seedHistoricalEngineAuditsIfEmpty,
  calibrateAndReverifyAllEngines,
  lockMultiDrawPlayCampaign
} from "@/lib/engine_tracker";
import { runFullSystemCalibration } from "@/lib/engine_calibrator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const trackerResponseCache = new Map<string, { ts: number; payload: any }>();
const CACHE_TTL_MS = 15_000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get("game") || "all";
    const depthParam = searchParams.get("depth") || "100";
    const forceFresh = searchParams.get("fresh") === "1";
    const horizon = depthParam === "all" ? 1000 : parseInt(depthParam, 10) || 100;
    const cacheKey = `${game}:${horizon}`;

    if (!forceFresh) {
      const cached = trackerResponseCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return NextResponse.json(cached.payload, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache"
          }
        });
      }
    }

    // 1. Check if initial seeding/snapshotting is needed
    await seedHistoricalEngineAuditsIfEmpty();

    // 2. Automatically grade any newly completed draws & recalculate Draw #N+1
    const reconciled = await reconcileAndGradeEnginePredictions();
    if (reconciled.verifiedCount > 0) {
      await runFullSystemCalibration();
      await snapshotAllEnginePredictions();
      trackerResponseCache.clear();
    }

    const stats = await getEngineLeaderboardStats(game, horizon);
    const payload = {
      success: true,
      game,
      horizon,
      ...stats
    };
    trackerResponseCache.set(cacheKey, { ts: Date.now(), payload });

    return NextResponse.json(payload, {
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
    trackerResponseCache.clear();
    const body = await request.json().catch(() => ({}));
    const action = body.action || "reconcile_and_snapshot";
    const specificGame = body.game && body.game !== "all" ? body.game : undefined;

    if (action === "lock_campaign") {
      const anchorDrawNumber = body.anchorDrawNumber ? Number(body.anchorDrawNumber) : undefined;
      const locked = await lockMultiDrawPlayCampaign(specificGame, anchorDrawNumber);
      return NextResponse.json({
        success: true,
        action: "lock_campaign",
        lockedCount: locked.lockedCount,
        message: `Locked ${locked.lockedCount} suggested play(s) into the Multi-Draw 3-Draw & 5-Draw Verification Tracker.`
      });
    }

    if (action === "calibrate") {
      const calibRes = await calibrateAndReverifyAllEngines(specificGame);
      return NextResponse.json({
        success: true,
        action: "calibrate",
        calibratedProfiles: calibRes.calibratedProfiles,
        reverifiedCount: calibRes.reverifiedCount,
        prizesAwarded: calibRes.prizesAwarded,
        snapshottedCount: calibRes.snapshottedCount,
        message: `Bayesian Walk-Forward Calibration complete: ${calibRes.calibratedProfiles.length} game regimes calibrated, ${calibRes.reverifiedCount} historical draw logs verified (${calibRes.prizesAwarded} prize hits), and ${calibRes.snapshottedCount} upcoming predictions updated.`
      });
    }

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
