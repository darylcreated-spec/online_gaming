import { NextResponse } from "next/server";
import {
  acquireSyncLock,
  releaseSyncLock,
  isAuthorizedCronRequest,
  unauthorizedResponse
} from "@/lib/cron_auth";
import { recordSyncAudit } from "@/lib/db";
import { runDrawWatchdog, WatchdogReport } from "@/lib/draw_watchdog";
import { runUnifiedSyncPipeline, SyncGameKey } from "@/lib/sync_orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

async function handleSync(request: Request) {
  const syncStartTime = Date.now();
  let bodySecret: string | undefined;
  let bodyForce = false;

  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.secret === "string") bodySecret = body.secret;
    if (body?.force === true) bodyForce = true;
  }

  if (!isAuthorizedCronRequest(request, bodySecret)) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const force = bodyForce || searchParams.get("force") === "true";
  const userAgent = request.headers.get("user-agent") || "cron";

  // Fast Watchdog Pre-Check (~150ms): skip scraping & re-grading completely when all 5 games are already up to date
  let targetGames: SyncGameKey[] | undefined;
  let hasSequenceGaps = false;

  if (!force) {
    try {
      const watchdog = await runDrawWatchdog();
      if (watchdog.holidayPause?.isHoliday && watchdog.sequenceGapsCount === 0) {
        return NextResponse.json(
          {
            success: true,
            skipped: true,
            reason: `Holiday pause (${watchdog.holidayPause.holidayName || "NLCB Holiday"})`,
            totalDrawsAdded: 0,
            durationMs: Date.now() - syncStartTime
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      const pendingGames = getPendingGamesFromWatchdog(watchdog);
      if (pendingGames.length === 0) {
        return NextResponse.json(
          {
            success: true,
            skipped: true,
            reason: "All 5 NLCB games are already up to date.",
            totalDrawsAdded: 0,
            durationMs: Date.now() - syncStartTime
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      targetGames = pendingGames;
      hasSequenceGaps = watchdog.sequenceGapsCount > 0;
    } catch (wErr: any) {
      console.warn("[Auto-Sync] Watchdog pre-check notice, proceeding with full sync:", wErr.message);
    }
  }

  const lock = await acquireSyncLock("cron_sync_all", force ? 0 : 45, 90);
  if (!lock.acquired) {
    return NextResponse.json(
      {
        success: true,
        rateLimited: true,
        cooldownRemainingSeconds: lock.retryAfterSeconds,
        message: `Sync throttled by distributed DB lock (retry in ${lock.retryAfterSeconds}s).`
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    console.log(
      `[Auto-Sync] Authorized trigger from: ${userAgent} (force=${force}, games=${targetGames ? targetGames.join(",") : "all"})`
    );
    const payload = await runUnifiedSyncPipeline({
      onlyGames: targetGames,
      calibrate: true,
      reconcile: force || hasSequenceGaps,
      notify: true,
      audit: true,
      triggerSource: userAgent.slice(0, 50)
    });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("[Auto-Sync] Fatal error:", error);
    await recordSyncAudit({
      durationMs: Date.now() - syncStartTime,
      gamesSynced: targetGames ? targetGames.join(",") : "all",
      drawsAdded: 0,
      errors: error.message,
      triggerSource: "error"
    }).catch(() => {});
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    await releaseSyncLock("cron_sync_all", lock.ownerId, true);
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
