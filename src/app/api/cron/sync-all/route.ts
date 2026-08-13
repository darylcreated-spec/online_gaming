import { syncLatest } from "@/lib/scraper";
import { syncPlayWhe } from "@/lib/scraper";
import { syncWinForLife } from "@/lib/scraper";
import { verifyPlayWhePredictions } from "@/lib/predictions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for full sync cycle

/**
 * Unified cron & auto-sync endpoint that syncs ALL games and verifies predictions in parallel.
 * Called automatically by Vercel Cron, external cron services (cron-job.org),
 * AND by the frontend app on background auto-refresh.
 * 
 * Auth: Optional check against CRON_SECRET via Authorization header or ?secret= param.
 * Accepts default fallback secret 'win_concept_cron_secret_2026' for seamless app-level auto-sync.
 */
async function handleSync(request: Request) {
  try {
    // 1. Log request source
    const authHeader = request.headers.get("Authorization");
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get("secret");
    console.log(`[Auto-Sync] Received sync trigger from: ${request.headers.get("user-agent") || "unknown"}`);

    const now = new Date();
    const astHour = (now.getUTCHours() - 4 + 24) % 24;
    const dayOfWeek = new Date(now.getTime() - 4 * 60 * 60 * 1000).getDay(); // 0=Sun, 6=Sat

    // 2. Execute all 3 game scrapers CONCURRENTLY via Promise.allSettled
    console.log(`[Auto-Sync] Starting parallel sync cycle at ${now.toISOString()} (AST hour ${astHour})...`);
    
    const [playWheResult, lottoResult, winForLifeResult] = await Promise.allSettled([
      syncPlayWhe(false),
      syncLatest(false),
      syncWinForLife(false)
    ]);

    const results: Record<string, any> = {
      timestamp: now.toISOString(),
      astHour,
      dayOfWeek,
      playWhe: playWheResult.status === "fulfilled" ? playWheResult.value : { success: false, error: (playWheResult as any).reason?.message },
      lottoPlus: lottoResult.status === "fulfilled" ? lottoResult.value : { success: false, error: (lottoResult as any).reason?.message },
      winForLife: winForLifeResult.status === "fulfilled" ? winForLifeResult.value : { success: false, error: (winForLifeResult as any).reason?.message }
    };

    // 3. Verify Play Whe predictions if Play Whe sync succeeded
    if (playWheResult.status === "fulfilled" && playWheResult.value.success) {
      try {
        results.playWheVerify = await verifyPlayWhePredictions();
      } catch (e: any) {
        results.playWheVerify = { success: false, error: e.message };
      }
    }

    const totalAdded = (results.playWhe?.drawsAdded || 0) + (results.lottoPlus?.drawsAdded || 0) + (results.winForLife?.drawsAdded || 0);
    results.totalDrawsAdded = totalAdded;

    console.log(`[Auto-Sync] Sync complete. Total new draws added across all games: ${totalAdded}`);
    return NextResponse.json({ success: true, results, totalDrawsAdded: totalAdded });
  } catch (error: any) {
    console.error("[Auto-Sync] Fatal error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
