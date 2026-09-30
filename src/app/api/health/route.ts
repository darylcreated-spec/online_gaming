import { NextResponse } from "next/server";
import { pingDb, query } from "@/lib/db";
import { runDrawWatchdog } from "@/lib/draw_watchdog";
import { CLOUDFLARE_WORKER_PROXY_URL } from "@/lib/scraper";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {};
  let overallHealthy = true;

  // 1. Turso Cloud Database Connectivity & Latency Ping
  const dbPing = await pingDb();
  checks.database = {
    status: dbPing.ok ? "UP" : "DOWN",
    latencyMs: dbPing.latencyMs,
    driver: process.env.TURSO_DATABASE_URL?.startsWith("libsql:") ? "Turso Cloud libSQL" : "Local SQLite",
    error: dbPing.error || null,
  };
  if (!dbPing.ok) overallHealthy = false;

  // 2. Cloudflare Worker Edge Proxy Reachability Check
  if (CLOUDFLARE_WORKER_PROXY_URL) {
    try {
      const proxyBase = CLOUDFLARE_WORKER_PROXY_URL.endsWith("/")
        ? CLOUDFLARE_WORKER_PROXY_URL.slice(0, -1)
        : CLOUDFLARE_WORKER_PROXY_URL;
      const proxyHealthUrl = `${proxyBase}/health`;
      
      const pStart = Date.now();
      const pRes = await fetch(proxyHealthUrl, { method: "GET", next: { revalidate: 0 } });
      const pLatency = Date.now() - pStart;
      
      checks.cloudflareEdgeProxy = {
        status: pRes.ok ? "UP" : "DEGRADED",
        httpStatus: pRes.status,
        latencyMs: pLatency,
        endpoint: proxyBase
      };
    } catch (proxyErr: any) {
      checks.cloudflareEdgeProxy = {
        status: "UNREACHABLE",
        latencyMs: null,
        error: proxyErr.message
      };
    }
  } else {
    checks.cloudflareEdgeProxy = {
      status: "NOT_CONFIGURED",
      note: "Set CLOUDFLARE_WORKER_PROXY_URL in environment variables to enable Plan C edge scraper relay"
    };
  }

  // 3. Draw Freshness & Watchdog Audit
  try {
    const watchdog = await runDrawWatchdog();
    checks.watchdog = {
      status: watchdog.status,
      laggingGamesCount: watchdog.laggingGamesCount,
      sequenceGapsCount: watchdog.sequenceGapsCount,
      totalDrawsInDb: watchdog.totalDrawsInDb,
      games: {
        playWhe: { latest: watchdog.games.playWhe.latestDrawNumber, date: watchdog.games.playWhe.latestDrawDate, slot: watchdog.games.playWhe.latestTimeSlot, status: watchdog.games.playWhe.status },
        pick4: { latest: watchdog.games.pick4.latestDrawNumber, date: watchdog.games.pick4.latestDrawDate, slot: watchdog.games.pick4.latestTimeSlot, status: watchdog.games.pick4.status },
        cashPot: { latest: watchdog.games.cashPot.latestDrawNumber, date: watchdog.games.cashPot.latestDrawDate, status: watchdog.games.cashPot.status },
        lottoPlus: { latest: watchdog.games.lottoPlus.latestDrawNumber, date: watchdog.games.lottoPlus.latestDrawDate, status: watchdog.games.lottoPlus.status },
        winForLife: { latest: watchdog.games.winForLife.latestDrawNumber, date: watchdog.games.winForLife.latestDrawDate, status: watchdog.games.winForLife.status },
      },
      recommendations: watchdog.recommendations
    };
  } catch (wErr: any) {
    checks.watchdog = { status: "ERROR", error: wErr.message };
  }

  // 4. Push Subscribers & Sync Audit Telemetry
  try {
    const [subCount, lastAudit] = await Promise.all([
      query<any>("SELECT COUNT(*) as cnt FROM user_push_subscriptions"),
      query<any>("SELECT timestamp, duration_ms, games_synced, draws_added, errors FROM sync_audit_log ORDER BY id DESC LIMIT 1").catch(() => [])
    ]);

    checks.telemetry = {
      activePushSubscribers: subCount[0]?.cnt || 0,
      lastSyncAttempt: lastAudit[0] || null
    };
  } catch (tErr: any) {
    checks.telemetry = { error: tErr.message };
  }

  const totalDurationMs = Date.now() - startTime;
  const httpStatus = overallHealthy ? 200 : 503;

  return NextResponse.json({
    status: overallHealthy ? "HEALTHY" : "UNHEALTHY",
    service: "Online Results NLCB Analytics Platform",
    timestamp: new Date().toISOString(),
    uptimeCheckDurationMs: totalDurationMs,
    checks
  }, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}
