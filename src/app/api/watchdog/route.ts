import { NextResponse } from "next/server";
import { runDrawWatchdog } from "@/lib/draw_watchdog";
import { reconcileRecentDrawGaps } from "@/lib/scraper";
import {
  acquireSyncLock,
  releaseSyncLock,
  isAuthorizedCronRequest,
  unauthorizedResponse
} from "@/lib/cron_auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await runDrawWatchdog();
    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"
      }
    });
  } catch (error: any) {
    console.error("[API /api/watchdog] Error:", error);
    return NextResponse.json(
      { status: "CRITICAL", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!isAuthorizedCronRequest(request, typeof body?.secret === "string" ? body.secret : undefined)) {
    return unauthorizedResponse();
  }

  const lock = await acquireSyncLock("watchdog_reconcile", 30, 60);
  if (!lock.acquired) {
    return NextResponse.json(
      {
        success: false,
        throttled: true,
        retryAfterSeconds: lock.retryAfterSeconds,
        error: `Watchdog reconcile cooldown active (${lock.retryAfterSeconds}s remaining).`
      },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const report = await runDrawWatchdog();
    let reconciliationResult = null;

    if (report.sequenceGapsCount > 0 || report.laggingGamesCount > 0) {
      console.log("[Watchdog POST] Gaps or lag detected. Running sequence reconciliation...");
      reconciliationResult = await reconcileRecentDrawGaps();
    }

    const updatedReport = await runDrawWatchdog();

    return NextResponse.json(
      {
        success: true,
        initialStatus: report.status,
        finalStatus: updatedReport.status,
        reconciliation: reconciliationResult,
        report: updatedReport
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("[API /api/watchdog POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  } finally {
    await releaseSyncLock("watchdog_reconcile", lock.ownerId, true);
  }
}
