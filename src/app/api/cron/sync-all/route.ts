import { syncLatest } from "@/lib/scraper";
import { syncPlayWhe } from "@/lib/scraper";
import { syncWinForLife } from "@/lib/scraper";
import { verifyPlayWhePredictions } from "@/lib/predictions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for full sync cycle

/**
 * Unified cron endpoint that syncs ALL games and verifies predictions.
 * Called automatically by Vercel Cron Jobs after each draw time.
 * 
 * Trinidad & Tobago Draw Schedule (AST = UTC-4):
 *   Play Whe:    10:30 AM, 1:00 PM, 4:00 PM, 6:30 PM (Mon-Sat)
 *   Lotto Plus:  ~8:30 PM (Wed & Sat)
 *   Win for Life: ~8:30 PM (Daily)
 * 
 * Auth: Requires CRON_SECRET via Authorization header or ?secret= param.
 * Vercel automatically sends the Authorization header for cron jobs.
 */
export async function GET(request: Request) {
  try {
    // 1. Auth check — Vercel cron sends Authorization: Bearer <CRON_SECRET>
    const authHeader = request.headers.get("Authorization");
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Determine which games to sync based on the current time (AST = UTC-4)
    const now = new Date();
    const astHour = (now.getUTCHours() - 4 + 24) % 24;
    const dayOfWeek = new Date(now.getTime() - 4 * 60 * 60 * 1000).getDay(); // 0=Sun, 6=Sat
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 6; // Mon-Sat

    const results: Record<string, any> = {
      timestamp: now.toISOString(),
      astHour,
      dayOfWeek,
    };

    // 3. Always sync Play Whe on weekdays (draws 4x/day)
    if (isWeekday) {
      try {
        console.log(`[Cron] Syncing Play Whe (AST hour: ${astHour})...`);
        const pwResult = await syncPlayWhe(false);
        results.playWhe = pwResult;
      } catch (e: any) {
        console.error("[Cron] Play Whe sync error:", e);
        results.playWhe = { success: false, error: e.message };
      }

      // Verify predictions after sync
      try {
        const verifyResult = await verifyPlayWhePredictions();
        results.playWheVerify = verifyResult;
      } catch (e: any) {
        console.error("[Cron] Play Whe verify error:", e);
        results.playWheVerify = { success: false, error: e.message };
      }
    }

    // 4. Sync Lotto Plus (Wed=3, Sat=6 evenings, but we sync daily to catch late posts)
    try {
      console.log(`[Cron] Syncing Lotto Plus...`);
      const lottoResult = await syncLatest(false);
      results.lottoPlus = lottoResult;
    } catch (e: any) {
      console.error("[Cron] Lotto Plus sync error:", e);
      results.lottoPlus = { success: false, error: e.message };
    }

    // 5. Sync Win for Life (daily draws)
    try {
      console.log(`[Cron] Syncing Win for Life...`);
      const wflResult = await syncWinForLife(false);
      results.winForLife = wflResult;
    } catch (e: any) {
      console.error("[Cron] Win for Life sync error:", e);
      results.winForLife = { success: false, error: e.message };
    }

    console.log(`[Cron] Sync cycle complete:`, JSON.stringify(results));
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("[Cron] Fatal error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
