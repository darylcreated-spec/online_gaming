import { NextResponse } from "next/server";
import {
  syncLatest,
  syncPlayWhe,
  syncWinForLife,
  syncCashPot,
  syncPick4,
  reconcileRecentDrawGaps,
  resetScraperTelemetry,
  getLastScraperTelemetry,
  getParserDriftWarnings
} from "./scraper";
import {
  verifyPlayWhePredictions,
  generatePlayWhePredictions,
  getLocalDateString
} from "./predictions";
import { reviseAndAuditAfterDraw } from "./winning_formula_engine";
import { broadcastDrawNotification } from "./pushNotifications";
import { query, recordSyncAudit } from "./db";
import {
  reconcileAndGradeEnginePredictions,
  snapshotAllEnginePredictions
} from "./engine_tracker";
import { runFullSystemCalibration } from "./engine_calibrator";
import { CHINAPOO_CHART } from "./playwhe";
import { runDrawWatchdog, WatchdogReport } from "./draw_watchdog";
import {
  acquireSyncLock,
  releaseSyncLock,
  isAuthorizedCronRequest,
  isAuthorizedFullSyncRequest,
  unauthorizedResponse
} from "./cron_auth";

export type SyncGameKey = "play-whe" | "lotto-plus" | "win-for-life" | "cashpot" | "pick4";

export interface UnifiedSyncOptions {
  onlyGames?: SyncGameKey[];
  calibrate?: boolean;
  reconcile?: boolean;
  notify?: boolean;
  audit?: boolean;
  triggerSource?: string;
}

const ALL_GAMES: SyncGameKey[] = [
  "play-whe",
  "lotto-plus",
  "win-for-life",
  "cashpot",
  "pick4"
];

/**
 * Unified post-draw synchronization pipeline shared by Vercel/external cron,
 * bounded public stale-draw pulse, and CLI automation.
 */
export async function runUnifiedSyncPipeline(options: UnifiedSyncOptions = {}) {
  const syncStartTime = Date.now();
  const now = new Date();
  const astHour = (now.getUTCHours() - 4 + 24) % 24;
  const dayOfWeek = new Date(now.getTime() - 4 * 60 * 60 * 1000).getDay();

  const activeGames = options.onlyGames && options.onlyGames.length > 0
    ? new Set<SyncGameKey>(options.onlyGames)
    : new Set<SyncGameKey>(ALL_GAMES);

  const skippedResult = { success: true, drawsAdded: 0, skipped: true };
  resetScraperTelemetry();

  const [playWheRes, lottoRes, wflRes, cpRes, pick4Res] = await Promise.allSettled([
    activeGames.has("play-whe") ? syncPlayWhe(false) : Promise.resolve(skippedResult),
    activeGames.has("lotto-plus") ? syncLatest(false) : Promise.resolve(skippedResult),
    activeGames.has("win-for-life") ? syncWinForLife(false) : Promise.resolve(skippedResult),
    activeGames.has("cashpot") ? syncCashPot(false) : Promise.resolve(skippedResult),
    activeGames.has("pick4") ? syncPick4(false) : Promise.resolve(skippedResult)
  ]);

  const unpack = (r: PromiseSettledResult<any>) =>
    r.status === "fulfilled" ? r.value : { success: false, drawsAdded: 0, error: r.reason?.message || "Unknown error" };

  const results: Record<string, any> = {
    timestamp: now.toISOString(),
    astHour,
    dayOfWeek,
    playWhe: unpack(playWheRes),
    lottoPlus: unpack(lottoRes),
    winForLife: unpack(wflRes),
    cashPot: unpack(cpRes),
    pick4: unpack(pick4Res),
    sourceTelemetry: getLastScraperTelemetry(),
    parserDrift: getParserDriftWarnings()
  };

  if (activeGames.has("play-whe") && results.playWhe.success) {
    try {
      results.playWheVerify = await verifyPlayWhePredictions();
      const todayStr = getLocalDateString();
      for (const slot of ["MORNING", "MIDDAY", "AFTERNOON", "EVENING"]) {
        await generatePlayWhePredictions(todayStr, slot);
      }
    } catch (e: any) {
      results.playWheVerify = { success: false, error: e.message };
    }
  }

  if (options.reconcile !== false) {
    try {
      results.reconciliation = await reconcileRecentDrawGaps();
    } catch (e: any) {
      results.reconciliation = { gapsDetected: 0, drawsHealed: 0, error: e.message };
    }
  } else {
    results.reconciliation = { gapsDetected: 0, drawsHealed: 0, skipped: true };
  }

  const changedGames: SyncGameKey[] = [];
  if ((results.playWhe?.drawsAdded || 0) > 0) changedGames.push("play-whe");
  if ((results.pick4?.drawsAdded || 0) > 0) changedGames.push("pick4");
  if ((results.cashPot?.drawsAdded || 0) > 0) changedGames.push("cashpot");
  if ((results.lottoPlus?.drawsAdded || 0) > 0) changedGames.push("lotto-plus");
  if ((results.winForLife?.drawsAdded || 0) > 0) changedGames.push("win-for-life");

  const healedCount = results.reconciliation?.drawsHealed || 0;
  if (healedCount > 0 && Array.isArray(results.reconciliation?.report)) {
    const reportStr = results.reconciliation.report.join(" ").toLowerCase();
    if (reportStr.includes("play whe") && !changedGames.includes("play-whe")) changedGames.push("play-whe");
    if (reportStr.includes("pick 4") && !changedGames.includes("pick4")) changedGames.push("pick4");
    if (reportStr.includes("cash pot") && !changedGames.includes("cashpot")) changedGames.push("cashpot");
  }

  const shouldPostProcess = changedGames.length > 0 || healedCount > 0;

  let engineVerifiedCount = 0;
  if (shouldPostProcess) {
    try {
      results.predictionRevision = await reviseAndAuditAfterDraw();
    } catch (e: any) {
      results.predictionRevision = { error: e.message };
    }

    try {
      const reconcileEngineRes = await reconcileAndGradeEnginePredictions();
      engineVerifiedCount = reconcileEngineRes.verifiedCount || 0;
      results.engineTracking = {
        ...reconcileEngineRes,
        calibratedGames: [] as string[],
        snapshotsRecorded: 0
      };
    } catch (e: any) {
      results.engineTracking = { error: e.message };
    }
  }

  // Only recalibrate games whose draw tables actually gained new draws
  if (options.calibrate !== false && changedGames.length > 0) {
    const calibratedGames: string[] = [];
    for (const gameKey of changedGames) {
      try {
        await runFullSystemCalibration(gameKey);
        calibratedGames.push(gameKey);
      } catch (e: any) {
        console.warn(`[Auto-Sync] Game calibration notice (${gameKey}):`, e.message);
      }
    }
    if (results.engineTracking) {
      results.engineTracking.calibratedGames = calibratedGames;
    }
  }

  // Refresh N+1 engine prediction snapshots only for games that actually gained new draws
  const snapshotTargets: string[] =
    changedGames.length > 0
      ? changedGames
      : (engineVerifiedCount > 0 ? ["all"] : []);

  if (snapshotTargets.length > 0) {
    let totalSnapshots = 0;
    for (const target of snapshotTargets) {
      try {
        const snapRes = await snapshotAllEnginePredictions(target);
        totalSnapshots += snapRes.recordedCount || 0;
      } catch (e: any) {
        console.warn(`[Auto-Sync] Snapshot notice (${target}):`, e.message);
      }
    }
    if (results.engineTracking) {
      results.engineTracking.snapshotsRecorded = totalSnapshots;
    }
  }

  let watchdogReport: WatchdogReport | undefined;
  try {
    watchdogReport = await runDrawWatchdog();
    results.watchdog = watchdogReport;
  } catch (wErr: any) {
    results.watchdog = { status: "UNKNOWN", error: wErr.message };
  }

  const totalAdded =
    (results.playWhe?.drawsAdded || 0) +
    (results.lottoPlus?.drawsAdded || 0) +
    (results.winForLife?.drawsAdded || 0) +
    (results.cashPot?.drawsAdded || 0) +
    (results.pick4?.drawsAdded || 0) +
    healedCount;
  results.totalDrawsAdded = totalAdded;

  if (totalAdded > 0 && options.notify !== false) {
    try {
      const detailLines: string[] = [];
      if ((results.playWhe?.drawsAdded || 0) > 0) {
        const pwRow = await query<any>("SELECT draw_number, draw_time_slot, winning_number FROM playwhe_draws ORDER BY draw_number DESC LIMIT 1");
        if (pwRow[0]) {
          const num = pwRow[0].winning_number;
          const markName = CHINAPOO_CHART[num]?.mark || `Mark #${num}`;
          detailLines.push(`Play Whe #${pwRow[0].draw_number} (${pwRow[0].draw_time_slot || ""}): #${num} ${markName}`);
        }
      }
      if ((results.pick4?.drawsAdded || 0) > 0) {
        const p4Row = await query<any>("SELECT draw_number, digit1, digit2, digit3, digit4 FROM pick4_draws ORDER BY draw_number DESC LIMIT 1");
        if (p4Row[0]) {
          detailLines.push(`Pick 4 #${p4Row[0].draw_number}: [${p4Row[0].digit1}-${p4Row[0].digit2}-${p4Row[0].digit3}-${p4Row[0].digit4}]`);
        }
      }
      if ((results.lottoPlus?.drawsAdded || 0) > 0) {
        const lpRow = await query<any>("SELECT draw_number, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) DESC LIMIT 1");
        if (lpRow[0]) {
          detailLines.push(`Lotto Plus #${lpRow[0].draw_number}: ${lpRow[0].num1}, ${lpRow[0].num2}, ${lpRow[0].num3}, ${lpRow[0].num4}, ${lpRow[0].num5} + PB ${lpRow[0].powerball}`);
        }
      }
      if ((results.winForLife?.drawsAdded || 0) > 0) {
        const wflRow = await query<any>("SELECT draw_number, num1, num2, num3, num4, num5, num6 FROM winforlife_draws ORDER BY draw_number DESC LIMIT 1");
        if (wflRow[0]) {
          detailLines.push(`Win For Life #${wflRow[0].draw_number}: ${wflRow[0].num1}, ${wflRow[0].num2}, ${wflRow[0].num3}, ${wflRow[0].num4}, ${wflRow[0].num5}, ${wflRow[0].num6}`);
        }
      }
      if ((results.cashPot?.drawsAdded || 0) > 0) {
        const cpRow = await query<any>("SELECT draw_number, num1, num2, num3, num4, num5 FROM cashpot_draws ORDER BY draw_number DESC LIMIT 1");
        if (cpRow[0]) {
          detailLines.push(`Cash Pot #${cpRow[0].draw_number}: ${cpRow[0].num1}, ${cpRow[0].num2}, ${cpRow[0].num3}, ${cpRow[0].num4}, ${cpRow[0].num5}`);
        }
      }

      const bodyText =
        detailLines.length > 0
          ? detailLines.join(" | ")
          : `${totalAdded} new official draws verified. Check your hot picks and ticket results!`;

      await broadcastDrawNotification({
        title: "New NLCB Winning Results In!",
        body: bodyText,
        url: "/"
      });
    } catch (pushErr: any) {
      console.warn("[Auto-Sync] Push notification broadcast warning:", pushErr.message);
    }
  }

  if (options.audit !== false) {
    const errorsList = [
      results.playWhe?.error,
      results.lottoPlus?.error,
      results.winForLife?.error,
      results.cashPot?.error,
      results.pick4?.error,
      ...(Array.isArray(results.parserDrift) ? results.parserDrift : [])
    ].filter(Boolean);

    await recordSyncAudit({
      durationMs: Date.now() - syncStartTime,
      gamesSynced: Array.from(activeGames).join(","),
      drawsAdded: totalAdded,
      errors: errorsList.length > 0 ? errorsList.join("; ") : undefined,
      triggerSource: (options.triggerSource || "cron").slice(0, 50)
    });
  }

  return {
    success: true,
    results,
    totalDrawsAdded: totalAdded
  };
}

/**
 * Shared route-handler factory for per-game sync routes (/api/*\/sync).
 * Enforces CRON_SECRET / FULL_SYNC_SECRET authentication and Turso DB locking.
 */
export function createSingleGameSyncHandlers(config: {
  routeName: string;
  lockKey: string;
  syncFn: (full: boolean, year?: number) => Promise<{ success: boolean; drawsAdded: number; details: string }>;
  postSyncHook?: (result: { success: boolean; drawsAdded: number; details: string }) => Promise<void>;
}) {
  async function execute(
    request: Request,
    params: {
      full: boolean;
      year?: number;
      bodySecret?: string | null;
      fullSecret?: string | null;
    }
  ) {
    const isFullOrYear = params.full || params.year !== undefined;
    if (isFullOrYear) {
      if (!isAuthorizedFullSyncRequest(request, params.bodySecret, params.fullSecret)) {
        return unauthorizedResponse("Unauthorized: Full sync password required.");
      }
    } else if (
      !isAuthorizedCronRequest(request, params.bodySecret) &&
      !isAuthorizedFullSyncRequest(request, params.bodySecret, params.fullSecret)
    ) {
      return unauthorizedResponse("Unauthorized: Admin or cron secret required.");
    }

    const cooldown = isFullOrYear ? 0 : 20;
    const lock = await acquireSyncLock(config.lockKey, cooldown, 90);
    if (!lock.acquired) {
      return NextResponse.json(
        {
          success: false,
          throttled: true,
          retryAfterSeconds: lock.retryAfterSeconds,
          error: `Sync is locked or in cooldown. Retry in ${lock.retryAfterSeconds}s.`
        },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    try {
      console.log(`[API ${config.routeName}] Triggering sync (full=${params.full}, year=${params.year})...`);
      const result = await config.syncFn(params.full, params.year);
      if (result.success && config.postSyncHook) {
        await config.postSyncHook(result);
      }
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error: any) {
      console.error(`[API ${config.routeName}] Error:`, error);
      return NextResponse.json(
        { success: false, error: error.message || "An unknown error occurred" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    } finally {
      await releaseSyncLock(config.lockKey, lock.ownerId, !isFullOrYear);
    }
  }

  return {
    async POST(request: Request) {
      const body = await request.json().catch(() => ({}));
      const full = Boolean(body.full);
      const parsedYear = body.year !== undefined ? parseInt(String(body.year), 10) : NaN;
      const year = Number.isFinite(parsedYear) ? parsedYear : undefined;
      return execute(request, {
        full,
        year,
        bodySecret: body.secret,
        fullSecret: body.fullSecret
      });
    },
    async GET(request: Request) {
      const { searchParams } = new URL(request.url);
      const full = searchParams.get("full") === "true";
      const parsedYear = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : NaN;
      const year = Number.isFinite(parsedYear) ? parsedYear : undefined;
      return execute(request, {
        full,
        year
      });
    }
  };
}
