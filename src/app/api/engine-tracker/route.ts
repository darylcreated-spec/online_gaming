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
import { isAuthorizedCronRequest, unauthorizedResponse } from "@/lib/cron_auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const trackerResponseCache = new Map<string, { ts: number; payload: any }>();
const CACHE_TTL_MS = 15_000;
const ALLOWED_HORIZONS = [25, 50, 100, 200, 500, 1000];
const ALLOWED_GAMES = new Set(["all", "cashpot", "lotto-plus", "win-for-life", "play-whe", "pick4"]);

function normalizeHorizon(raw: string | null): number {
  if (raw === "all") return 1000;
  const parsed = parseInt(raw || "100", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 100;
  return ALLOWED_HORIZONS.reduce((best, h) =>
    Math.abs(h - parsed) < Math.abs(best - parsed) ? h : best
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawGame = searchParams.get("game") || "all";
    const game = ALLOWED_GAMES.has(rawGame) ? rawGame : "all";
    const forceFresh = searchParams.get("fresh") === "1";
    const horizon = normalizeHorizon(searchParams.get("depth"));
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
    if (trackerResponseCache.size >= 50) {
      const oldestKey = trackerResponseCache.keys().next().value;
      if (oldestKey) trackerResponseCache.delete(oldestKey);
    }
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
      if (anchorDrawNumber !== undefined && (!Number.isInteger(anchorDrawNumber) || anchorDrawNumber <= 0)) {
        return NextResponse.json({ success: false, error: "Invalid anchorDrawNumber." }, { status: 400 });
      }
      const customSlips = Array.isArray(body.customSlips) ? body.customSlips.slice(0, 25) : undefined;
      const customPowerball = body.customPowerball !== undefined ? Number(body.customPowerball) : undefined;
      const locked = await lockMultiDrawPlayCampaign(specificGame, anchorDrawNumber, customSlips, customPowerball);
      return NextResponse.json({
        success: true,
        action: "lock_campaign",
        lockedCount: locked.lockedCount,
        message: customSlips
          ? `Locked your custom ${customSlips.length}-slip group into the 5-Draw Verification Tracker.`
          : `Locked ${locked.lockedCount} suggested play(s) into the Multi-Draw 3-Draw & 5-Draw Verification Tracker.`
      });
    }

    if (action === "calibrate") {
      if (!isAuthorizedCronRequest(request, body.secret)) {
        return unauthorizedResponse("Admin CRON_SECRET required to run full engine calibration.");
      }
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
