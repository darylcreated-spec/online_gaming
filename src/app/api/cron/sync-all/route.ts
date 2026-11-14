import { NextResponse } from "next/server";
import {
  acquireSyncLock,
  releaseSyncLock,
  isAuthorizedCronRequest,
  unauthorizedResponse
} from "@/lib/cron_auth";
import { recordSyncAudit } from "@/lib/db";
import { runUnifiedSyncPipeline } from "@/lib/sync_orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    console.log(`[Auto-Sync] Authorized trigger from: ${userAgent} (force=${force})`);
    const payload = await runUnifiedSyncPipeline({
      calibrate: true,
      reconcile: true,
      notify: true,
      audit: true,
      triggerSource: userAgent.slice(0, 50)
    });
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("[Auto-Sync] Fatal error:", error);
    await recordSyncAudit({
      durationMs: Date.now() - syncStartTime,
      gamesSynced: "all",
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
