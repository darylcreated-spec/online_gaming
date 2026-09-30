import { syncLatest, syncPlayWhe, syncWinForLife, syncCashPot, syncPick4, reconcileRecentDrawGaps } from "@/lib/scraper";
import { verifyPlayWhePredictions } from "@/lib/predictions";
import { reviseAndAuditAfterDraw } from "@/lib/winning_formula_engine";
import { broadcastDrawNotification } from "@/lib/pushNotifications";
import { query, recordSyncAudit } from "@/lib/db";
import { CHINAPOO_CHART } from "@/lib/playwhe";
import { runDrawWatchdog } from "@/lib/draw_watchdog";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for full sync cycle

// In-memory rate limiting and result caching (25-second cooldown against spam clicks/bots)
let lastSyncTimestamp = 0;
let lastCachedResponse: any = null;
const SYNC_COOLDOWN_MS = 25 * 1000; // 25 seconds

/**
 * Unified cron & auto-sync endpoint that syncs ALL games and verifies predictions in parallel.
 * Called automatically by Vercel Cron, external cron services (cron-job.org),
 * AND by the frontend app on background auto-refresh.
 */
async function handleSync(request: Request) {
  const syncStartTime = Date.now();
  try {
    const nowMs = Date.now();
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    // Rate-limiting check: if synced recently, return cached response immediately without scraping
    if (!force && lastCachedResponse && (nowMs - lastSyncTimestamp < SYNC_COOLDOWN_MS)) {
      const remainingSec = Math.ceil((SYNC_COOLDOWN_MS - (nowMs - lastSyncTimestamp)) / 1000);
      console.log(`[Auto-Sync] Cooldown active (${remainingSec}s remaining). Serving cached response.`);
      return NextResponse.json({
        ...lastCachedResponse,
        rateLimited: true,
        cooldownRemainingSeconds: remainingSec,
        message: `Sync throttled. Serving latest database snapshot (next live scrape allowed in ${remainingSec}s).`
      });
    }

    // 1. Log request source
    const authHeader = request.headers.get("Authorization");
    const secretParam = searchParams.get("secret");
    const userAgent = request.headers.get("user-agent") || "unknown";
    console.log(`[Auto-Sync] Received sync trigger from: ${userAgent}`);

    const now = new Date();
    const astHour = (now.getUTCHours() - 4 + 24) % 24;
    const dayOfWeek = new Date(now.getTime() - 4 * 60 * 60 * 1000).getDay(); // 0=Sun, 6=Sat

    // 2. Execute all 5 game scrapers CONCURRENTLY via Promise.allSettled
    console.log(`[Auto-Sync] Starting parallel sync cycle for 5 games at ${now.toISOString()} (AST hour ${astHour})...`);
    
    const [playWheResult, lottoResult, winForLifeResult, cashPotResult, pick4Result] = await Promise.allSettled([
      syncPlayWhe(false),
      syncLatest(false),
      syncWinForLife(false),
      syncCashPot(false),
      syncPick4(false)
    ]);

    const results: Record<string, any> = {
      timestamp: now.toISOString(),
      astHour,
      dayOfWeek,
      playWhe: playWheResult.status === "fulfilled" ? playWheResult.value : { success: false, error: (playWheResult as any).reason?.message },
      lottoPlus: lottoResult.status === "fulfilled" ? lottoResult.value : { success: false, error: (lottoResult as any).reason?.message },
      winForLife: winForLifeResult.status === "fulfilled" ? winForLifeResult.value : { success: false, error: (winForLifeResult as any).reason?.message },
      cashPot: cashPotResult.status === "fulfilled" ? cashPotResult.value : { success: false, error: (cashPotResult as any).reason?.message },
      pick4: pick4Result.status === "fulfilled" ? pick4Result.value : { success: false, error: (pick4Result as any).reason?.message }
    };

    // 3. Verify Play Whe predictions if Play Whe sync succeeded
    if (playWheResult.status === "fulfilled" && playWheResult.value.success) {
      try {
        results.playWheVerify = await verifyPlayWhePredictions();
      } catch (e: any) {
        results.playWheVerify = { success: false, error: e.message };
      }
    }

    // 4. Automated Sequence Gap Reconciliation Daemon
    try {
      results.reconciliation = await reconcileRecentDrawGaps();
    } catch (e: any) {
      results.reconciliation = { gapsDetected: 0, drawsHealed: 0, error: e.message };
    }

    // 5. Automated Post-Draw Invariant Revision & Audit Reconciliation
    try {
      results.predictionRevision = await reviseAndAuditAfterDraw();
    } catch (e: any) {
      results.predictionRevision = { error: e.message };
    }

    // 6. Draw Watchdog Freshness Check
    try {
      results.watchdog = await runDrawWatchdog();
    } catch (wErr: any) {
      results.watchdog = { status: "UNKNOWN", error: wErr.message };
    }

    const totalAdded = (results.playWhe?.drawsAdded || 0) + 
      (results.lottoPlus?.drawsAdded || 0) + 
      (results.winForLife?.drawsAdded || 0) + 
      (results.cashPot?.drawsAdded || 0) + 
      (results.pick4?.drawsAdded || 0) +
      (results.reconciliation?.drawsHealed || 0);
    results.totalDrawsAdded = totalAdded;

    console.log(`[Auto-Sync] Sync complete. Total new draws added across all games: ${totalAdded}`);
    const responsePayload = { success: true, results, totalDrawsAdded: totalAdded };

    // 7. Rich Web Push Notification Broadcast with Live Winning Numbers
    if (totalAdded > 0) {
      try {
        const detailLines: string[] = [];

        // Check Play Whe winning mark
        if (results.playWhe?.drawsAdded > 0) {
          const pwRow = await query<any>("SELECT draw_number, draw_time_slot, winning_number FROM playwhe_draws ORDER BY draw_number DESC LIMIT 1");
          if (pwRow[0]) {
            const num = pwRow[0].winning_number;
            const markName = CHINAPOO_CHART[num]?.mark || `Mark #${num}`;
            detailLines.push(`Play Whe #${pwRow[0].draw_number} (${pwRow[0].draw_time_slot || ""}): #${num} ${markName}`);
          }
        }

        // Check Pick 4 winning digits
        if (results.pick4?.drawsAdded > 0) {
          const p4Row = await query<any>("SELECT draw_number, draw_time_slot, d1, d2, d3, d4 FROM pick4_draws ORDER BY draw_number DESC LIMIT 1");
          if (p4Row[0]) {
            detailLines.push(`Pick 4 #${p4Row[0].draw_number}: [${p4Row[0].d1}-${p4Row[0].d2}-${p4Row[0].d3}-${p4Row[0].d4}]`);
          }
        }

        // Check Lotto Plus winning numbers
        if (results.lottoPlus?.drawsAdded > 0) {
          const lpRow = await query<any>("SELECT draw_number, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) DESC LIMIT 1");
          if (lpRow[0]) {
            detailLines.push(`Lotto Plus #${lpRow[0].draw_number}: ${lpRow[0].num1}, ${lpRow[0].num2}, ${lpRow[0].num3}, ${lpRow[0].num4}, ${lpRow[0].num5} + PB ${lpRow[0].powerball}`);
          }
        }

        // Check Win For Life winning numbers
        if (results.winForLife?.drawsAdded > 0) {
          const wflRow = await query<any>("SELECT draw_number, ball1, ball2, ball3, ball4, ball5, ball6, cash_ball FROM winforlife_draws ORDER BY draw_number DESC LIMIT 1");
          if (wflRow[0]) {
            detailLines.push(`Win For Life #${wflRow[0].draw_number}: ${wflRow[0].ball1}, ${wflRow[0].ball2}, ${wflRow[0].ball3}, ${wflRow[0].ball4}, ${wflRow[0].ball5}, ${wflRow[0].ball6}`);
          }
        }

        // Check Cash Pot winning numbers
        if (results.cashPot?.drawsAdded > 0) {
          const cpRow = await query<any>("SELECT draw_number, ball1, ball2, ball3, ball4, ball5 FROM cashpot_draws ORDER BY draw_number DESC LIMIT 1");
          if (cpRow[0]) {
            detailLines.push(`Cash Pot #${cpRow[0].draw_number}: ${cpRow[0].ball1}, ${cpRow[0].ball2}, ${cpRow[0].ball3}, ${cpRow[0].ball4}, ${cpRow[0].ball5}`);
          }
        }

        const bodyText = detailLines.length > 0 
          ? detailLines.join(" | ")
          : `${totalAdded} new official draws verified. Check your hot picks and ticket results!`;

        await broadcastDrawNotification({
          title: "🎉 New NLCB Winning Results In!",
          body: bodyText,
          url: "/"
        });
      } catch (pushErr: any) {
        console.warn("[Auto-Sync] Push notification broadcast warning:", pushErr.message);
      }
    }

    // 8. Record in Turso sync_audit_log for operational observability
    const syncDurationMs = Date.now() - syncStartTime;
    const errorsList = [
      results.playWhe?.error,
      results.lottoPlus?.error,
      results.winForLife?.error,
      results.cashPot?.error,
      results.pick4?.error
    ].filter(Boolean);

    await recordSyncAudit({
      durationMs: syncDurationMs,
      gamesSynced: "playwhe,lottoplus,winforlife,cashpot,pick4",
      drawsAdded: totalAdded,
      errors: errorsList.length > 0 ? errorsList.join("; ") : undefined,
      triggerSource: userAgent.slice(0, 50)
    });
    
    // Save to in-memory cache and update timestamp
    lastSyncTimestamp = nowMs;
    lastCachedResponse = responsePayload;

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("[Auto-Sync] Fatal error:", error);
    await recordSyncAudit({
      durationMs: Date.now() - syncStartTime,
      gamesSynced: "all",
      drawsAdded: 0,
      errors: error.message,
      triggerSource: "error"
    }).catch(() => {});
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
