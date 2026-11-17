import { NextResponse } from "next/server";
import { runDrawWatchdog, WatchdogReport } from "@/lib/draw_watchdog";
import { acquireSyncLock, releaseSyncLock } from "@/lib/cron_auth";
import { runUnifiedSyncPipeline, SyncGameKey } from "@/lib/sync_orchestrator";
import { syncLatestFastCash } from "@/lib/fastcash_scraper";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VALID_SYNC_GAMES: SyncGameKey[] = [
  "play-whe",
  "lotto-plus",
  "win-for-life",
  "cashpot",
  "pick4"
];

function getPendingGamesFromWatchdog(report: WatchdogReport): SyncGameKey[] {
  const candidates: SyncGameKey[] = [];
  const g = report.games;

  if (
    g.playWhe.isLagging ||
    g.playWhe.latestDrawDate !== g.playWhe.expectedDrawDateAST ||
    !(g.playWhe.latestTimeSlot || "").toLowerCase().includes(g.playWhe.expectedDrawSlot.toLowerCase())
  ) {
    candidates.push("play-whe");
  }
  if (
    g.pick4.isLagging ||
    g.pick4.latestDrawDate !== g.pick4.expectedDrawDateAST ||
    !(g.pick4.latestTimeSlot || "").toLowerCase().includes(g.pick4.expectedDrawSlot.toLowerCase())
  ) {
    candidates.push("pick4");
  }
  if (g.cashPot.isLagging || g.cashPot.latestDrawDate !== g.cashPot.expectedDrawDateAST) {
    candidates.push("cashpot");
  }
  if (g.lottoPlus.isLagging || g.lottoPlus.latestDrawDate !== g.lottoPlus.expectedDrawDateAST) {
    candidates.push("lotto-plus");
  }
  if (g.winForLife.isLagging || g.winForLife.latestDrawDate !== g.winForLife.expectedDrawDateAST) {
    candidates.push("win-for-life");
  }

  if (report.sequenceGapsCount > 0) {
    if (!candidates.includes("play-whe")) candidates.push("play-whe");
    if (!candidates.includes("pick4")) candidates.push("pick4");
  }
  return candidates;
}

/**
 * Safe public stale-draw pulse for live dashboard visitors.
 * Only scrapes if a draw is actually pending/lagging AND the 120s global Turso lock permits.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isManual = searchParams.get("manual") === "1";
    const requestedGame = searchParams.get("game") || "";

    if (isManual) {
      const lock = await acquireSyncLock("manual_pulse", 25, 60);
      if (!lock.acquired) {
        return NextResponse.json({
          success: true,
          rateLimited: true,
          cooldownRemainingSeconds: lock.retryAfterSeconds,
          totalDrawsAdded: 0,
          details: `Sync already ran recently (${lock.retryAfterSeconds}s cooldown remaining).`
        });
      }

      try {
        const targetGames: SyncGameKey[] = VALID_SYNC_GAMES.includes(requestedGame as SyncGameKey)
          ? [requestedGame as SyncGameKey]
          : VALID_SYNC_GAMES;

        const [result, fastCashRes] = await Promise.all([
          runUnifiedSyncPipeline({
            onlyGames: targetGames,
            calibrate: false,
            reconcile: false,
            notify: true,
            audit: true,
            triggerSource: "manual-pulse"
          }),
          !requestedGame || requestedGame === "all" || requestedGame === "fast-cash"
            ? syncLatestFastCash(2).catch((e: any) => ({ success: false, drawsAdded: 0, error: e.message }))
            : Promise.resolve(null)
        ]);

        const r = result.results || {};
        const singleGameResult =
          targetGames.length === 1
            ? targetGames[0] === "play-whe"
              ? r.playWhe
              : targetGames[0] === "lotto-plus"
              ? r.lottoPlus
              : targetGames[0] === "win-for-life"
              ? r.winForLife
              : targetGames[0] === "cashpot"
              ? r.cashPot
              : r.pick4
            : null;

        return NextResponse.json({
          ...result,
          fastCash: fastCashRes,
          drawsAdded: singleGameResult ? singleGameResult.drawsAdded || 0 : result.totalDrawsAdded || 0,
          details: singleGameResult?.details || `Synchronized ${targetGames.join(", ")}`,
          targetedGames: targetGames
        });
      } finally {
        await releaseSyncLock("manual_pulse", lock.ownerId, true);
      }
    }

    const watchdog = await runDrawWatchdog();
    if (watchdog.holidayPause?.isHoliday && watchdog.sequenceGapsCount === 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        holidayPause: watchdog.holidayPause,
        totalDrawsAdded: 0,
        watchdog
      });
    }

    const pendingGames = getPendingGamesFromWatchdog(watchdog);

    if (pendingGames.length === 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        totalDrawsAdded: 0,
        watchdog
      });
    }

    const lock = await acquireSyncLock("public_pulse", 120, 75);
    if (!lock.acquired) {
      return NextResponse.json({
        success: true,
        rateLimited: true,
        cooldownRemainingSeconds: lock.retryAfterSeconds,
        totalDrawsAdded: 0,
        watchdog
      });
    }

    try {
      const result = await runUnifiedSyncPipeline({
        onlyGames: pendingGames,
        calibrate: false,
        reconcile: reportHasSeqGap(watchdog),
        notify: true,
        audit: true,
        triggerSource: "public-pulse"
      });
      return NextResponse.json({
        ...result,
        targetedGames: pendingGames
      });
    } finally {
      await releaseSyncLock("public_pulse", lock.ownerId, true);
    }
  } catch (error: any) {
    console.error("[API /api/sync/pulse] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

function reportHasSeqGap(report: WatchdogReport): boolean {
  return report.sequenceGapsCount > 0;
}
