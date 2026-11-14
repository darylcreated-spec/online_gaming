import { NextResponse } from "next/server";
import { runDrawWatchdog, WatchdogReport } from "@/lib/draw_watchdog";
import { acquireSyncLock, releaseSyncLock } from "@/lib/cron_auth";
import { runUnifiedSyncPipeline, SyncGameKey } from "@/lib/sync_orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function getPendingGamesFromWatchdog(report: WatchdogReport): SyncGameKey[] {
  const candidates: SyncGameKey[] = [];
  const g = report.games;
  const astDay = new Date(Date.now() - 4 * 60 * 60 * 1000).getUTCDay(); // 0=Sun

  if (
    g.playWhe.isLagging ||
    (astDay !== 0 &&
      (g.playWhe.latestDrawDate !== g.playWhe.expectedDrawDateAST ||
        !(g.playWhe.latestTimeSlot || "").toLowerCase().includes(g.playWhe.expectedDrawSlot.toLowerCase())))
  ) {
    candidates.push("play-whe");
  }
  if (
    g.pick4.isLagging ||
    (astDay !== 0 &&
      (g.pick4.latestDrawDate !== g.pick4.expectedDrawDateAST ||
        !(g.pick4.latestTimeSlot || "").toLowerCase().includes(g.pick4.expectedDrawSlot.toLowerCase())))
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
export async function POST() {
  try {
    const watchdog = await runDrawWatchdog();
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
