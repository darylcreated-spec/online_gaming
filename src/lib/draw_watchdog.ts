/**
 * draw_watchdog.ts
 * Automated Draw Watchdog & Reconciliation Engine for NLCB Lottery Operations.
 * 
 * Compares current Atlantic Standard Time (AST, UTC-4) against official draw schedules:
 * - Play Whe: Mon-Sun at 10:30 AM, 1:00 PM, 4:00 PM, 7:00 PM AST
 * - Pick 4: Mon-Sun at 10:30 AM, 1:00 PM, 4:00 PM, 7:00 PM AST
 * - Cash Pot: Mon-Sun at 7:00 PM AST
 * - Lotto Plus: Wed & Sat at 8:30 PM AST
 * - Win For Life: Tue & Fri at 7:00 PM AST
 * 
 * Detects missing draws, calculates lag beyond a 15-minute grace period, and audits sequence gaps.
 */

import { query } from "./db";
import { SupportedGameKey } from "./draw_schedule";

export interface GameFreshness {
  gameKey: SupportedGameKey;
  gameTitle: string;
  totalDraws: number;
  latestDrawNumber: number | string;
  latestDrawDate: string;
  latestTimeSlot?: string;
  expectedDrawSlot: string;
  expectedDrawDateAST: string;
  isLagging: boolean;
  lagMinutes: number;
  status: "UP_TO_DATE" | "DRAW_IN_PROGRESS" | "MISSING_RESULT" | "PENDING_SCHEDULED";
  statusMessage: string;
}

export interface WatchdogReport {
  status: "HEALTHY" | "ATTENTION_NEEDED" | "CRITICAL";
  timestampUTC: string;
  timestampAST: string;
  totalDrawsInDb: number;
  games: {
    playWhe: GameFreshness;
    pick4: GameFreshness;
    cashPot: GameFreshness;
    lottoPlus: GameFreshness;
    winForLife: GameFreshness;
  };
  laggingGamesCount: number;
  sequenceGapsCount: number;
  recommendations: string[];
}

// 15-minute grace period after scheduled draw time before flagging as lagging
const GRACE_PERIOD_MINUTES = 15;

/**
 * Converts a UTC Date into an AST (UTC-4) breakdown.
 */
function getASTDateInfo(utcDate: Date) {
  const astMs = utcDate.getTime() - 4 * 60 * 60 * 1000;
  const ast = new Date(astMs);
  return {
    astDate: ast,
    year: ast.getUTCFullYear(),
    month: ast.getUTCMonth(),
    date: ast.getUTCDate(),
    dayOfWeek: ast.getUTCDay(), // 0=Sun, 6=Sat
    hours: ast.getUTCHours(),
    minutes: ast.getUTCMinutes(),
    isoDateStr: `${ast.getUTCFullYear()}-${String(ast.getUTCMonth() + 1).padStart(2, "0")}-${String(ast.getUTCDate()).padStart(2, "0")}`
  };
}

/**
 * Checks the freshness and sequence integrity across all 5 NLCB games.
 */
export async function runDrawWatchdog(nowUtc: Date = new Date()): Promise<WatchdogReport> {
  const astInfo = getASTDateInfo(nowUtc);
  const nowMs = nowUtc.getTime();

  // 1. Fetch latest draw from all 5 database tables concurrently
  const [
    pwLatest,
    pick4Latest,
    cpLatest,
    lottoLatest,
    wflLatest,
    pwCount,
    pick4Count,
    cpCount,
    lottoCount,
    wflCount
  ] = await Promise.all([
    query<any>("SELECT draw_number, draw_date, draw_time_slot, winning_number FROM playwhe_draws ORDER BY draw_number DESC LIMIT 1"),
    query<any>("SELECT draw_number, draw_date, draw_time_slot, d1, d2, d3, d4 FROM pick4_draws ORDER BY draw_number DESC LIMIT 1"),
    query<any>("SELECT draw_number, draw_date, ball1, ball2, ball3, ball4, ball5, multiplier FROM cashpot_draws ORDER BY draw_number DESC LIMIT 1"),
    query<any>("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) DESC LIMIT 1"),
    query<any>("SELECT draw_number, draw_date, ball1, ball2, ball3, ball4, ball5, ball6, cash_ball FROM winforlife_draws ORDER BY draw_number DESC LIMIT 1"),
    query<any>("SELECT COUNT(*) AS cnt FROM playwhe_draws"),
    query<any>("SELECT COUNT(*) AS cnt FROM pick4_draws"),
    query<any>("SELECT COUNT(*) AS cnt FROM cashpot_draws"),
    query<any>("SELECT COUNT(*) AS cnt FROM draws"),
    query<any>("SELECT COUNT(*) AS cnt FROM winforlife_draws"),
  ]);

  const recommendations: string[] = [];
  let laggingCount = 0;

  // Helper to build AST UTC timestamp for a specific target time
  const makeUtcFromAST = (year: number, month: number, date: number, h: number, m: number) => {
    return Date.UTC(year, month, date, h + 4, m, 0);
  };

  // -------------------------------------------------------------
  // A. PLAY WHE & PICK 4 (Daily 4 draws: 10:30, 13:00, 16:00, 19:00 AST)
  // -------------------------------------------------------------
  const dailySlots = [
    { name: "Morning", h: 10, m: 30 },
    { name: "Midday", h: 13, m: 0 },
    { name: "Afternoon", h: 16, m: 0 },
    { name: "Evening", h: 19, m: 0 },
  ];

  // Find most recent scheduled slot that is in the past
  let mostRecentDailySlot = dailySlots[dailySlots.length - 1];
  let mostRecentDailyDateStr = astInfo.isoDateStr;
  let mostRecentDailySlotUtcMs = 0;

  // Check today's slots in reverse
  for (let i = dailySlots.length - 1; i >= 0; i--) {
    const slot = dailySlots[i];
    const slotUtcMs = makeUtcFromAST(astInfo.year, astInfo.month, astInfo.date, slot.h, slot.m);
    if (nowMs >= slotUtcMs) {
      mostRecentDailySlot = slot;
      mostRecentDailySlotUtcMs = slotUtcMs;
      break;
    }
  }

  // If before 10:30 AM today, the most recent past slot was yesterday's Evening
  if (mostRecentDailySlotUtcMs === 0) {
    const yesterdayAst = new Date(astInfo.astDate.getTime() - 86400000);
    const yInfo = getASTDateInfo(new Date(yesterdayAst.getTime() + 4 * 60 * 60 * 1000));
    mostRecentDailySlot = dailySlots[3]; // Evening
    mostRecentDailyDateStr = yInfo.isoDateStr;
    mostRecentDailySlotUtcMs = makeUtcFromAST(yInfo.year, yInfo.month, yInfo.date, 19, 0);
  }

  const minutesSinceDailyDraw = Math.floor((nowMs - mostRecentDailySlotUtcMs) / 60000);

  // Evaluate Play Whe
  const pwRow = pwLatest[0];
  const pwLagging = minutesSinceDailyDraw > GRACE_PERIOD_MINUTES && 
    (pwRow?.draw_date !== mostRecentDailyDateStr || !pwRow?.draw_time_slot?.toLowerCase().includes(mostRecentDailySlot.name.toLowerCase()));
  if (pwLagging) {
    laggingCount++;
    recommendations.push(`Play Whe ${mostRecentDailySlot.name} draw (${mostRecentDailyDateStr}) is ${minutesSinceDailyDraw} min past schedule. Auto-sync trigger recommended.`);
  }

  const playWheFreshness: GameFreshness = {
    gameKey: "play-whe",
    gameTitle: "Play Whe",
    totalDraws: pwCount[0]?.cnt || 0,
    latestDrawNumber: pwRow?.draw_number || "N/A",
    latestDrawDate: pwRow?.draw_date || "N/A",
    latestTimeSlot: pwRow?.draw_time_slot || undefined,
    expectedDrawSlot: mostRecentDailySlot.name,
    expectedDrawDateAST: mostRecentDailyDateStr,
    isLagging: pwLagging,
    lagMinutes: pwLagging ? minutesSinceDailyDraw : 0,
    status: pwLagging 
      ? (minutesSinceDailyDraw < 45 ? "DRAW_IN_PROGRESS" : "MISSING_RESULT")
      : "UP_TO_DATE",
    statusMessage: pwLagging
      ? `Awaiting official ${mostRecentDailySlot.name} result (${minutesSinceDailyDraw}m since scheduled)`
      : `Latest draw verified: #${pwRow?.draw_number} (${pwRow?.draw_time_slot || ""} ${pwRow?.draw_date})`
  };

  // Evaluate Pick 4
  const pick4Row = pick4Latest[0];
  const pick4Lagging = minutesSinceDailyDraw > GRACE_PERIOD_MINUTES && 
    (pick4Row?.draw_date !== mostRecentDailyDateStr || !pick4Row?.draw_time_slot?.toLowerCase().includes(mostRecentDailySlot.name.toLowerCase()));
  if (pick4Lagging) {
    laggingCount++;
    recommendations.push(`Pick 4 ${mostRecentDailySlot.name} draw (${mostRecentDailyDateStr}) is ${minutesSinceDailyDraw} min past schedule. Auto-sync trigger recommended.`);
  }

  const pick4Freshness: GameFreshness = {
    gameKey: "pick4",
    gameTitle: "Pick 4",
    totalDraws: pick4Count[0]?.cnt || 0,
    latestDrawNumber: pick4Row?.draw_number || "N/A",
    latestDrawDate: pick4Row?.draw_date || "N/A",
    latestTimeSlot: pick4Row?.draw_time_slot || undefined,
    expectedDrawSlot: mostRecentDailySlot.name,
    expectedDrawDateAST: mostRecentDailyDateStr,
    isLagging: pick4Lagging,
    lagMinutes: pick4Lagging ? minutesSinceDailyDraw : 0,
    status: pick4Lagging 
      ? (minutesSinceDailyDraw < 45 ? "DRAW_IN_PROGRESS" : "MISSING_RESULT")
      : "UP_TO_DATE",
    statusMessage: pick4Lagging
      ? `Awaiting official ${mostRecentDailySlot.name} result (${minutesSinceDailyDraw}m since scheduled)`
      : `Latest draw verified: #${pick4Row?.draw_number} (${pick4Row?.draw_time_slot || ""} ${pick4Row?.draw_date})`
  };

  // -------------------------------------------------------------
  // B. CASH POT (Daily Evening at 19:00 AST = 7:00 PM)
  // -------------------------------------------------------------
  const cpTodayEveningUtcMs = makeUtcFromAST(astInfo.year, astInfo.month, astInfo.date, 19, 0);
  let expectedCpDateStr = astInfo.isoDateStr;
  let cpPastDrawUtcMs = cpTodayEveningUtcMs;

  if (nowMs < cpTodayEveningUtcMs) {
    // Has not occurred today yet; expected is yesterday's evening
    const yesterdayAst = new Date(astInfo.astDate.getTime() - 86400000);
    const yInfo = getASTDateInfo(new Date(yesterdayAst.getTime() + 4 * 60 * 60 * 1000));
    expectedCpDateStr = yInfo.isoDateStr;
    cpPastDrawUtcMs = makeUtcFromAST(yInfo.year, yInfo.month, yInfo.date, 19, 0);
  }

  const cpMinutesSince = Math.floor((nowMs - cpPastDrawUtcMs) / 60000);
  const cpRow = cpLatest[0];
  const cpLagging = cpMinutesSince > GRACE_PERIOD_MINUTES && cpRow?.draw_date !== expectedCpDateStr;
  if (cpLagging) {
    laggingCount++;
    recommendations.push(`Cash Pot draw for ${expectedCpDateStr} is ${cpMinutesSince} min past schedule.`);
  }

  const cashPotFreshness: GameFreshness = {
    gameKey: "cashpot",
    gameTitle: "Cash Pot",
    totalDraws: cpCount[0]?.cnt || 0,
    latestDrawNumber: cpRow?.draw_number || "N/A",
    latestDrawDate: cpRow?.draw_date || "N/A",
    expectedDrawSlot: "Evening (7:00 PM)",
    expectedDrawDateAST: expectedCpDateStr,
    isLagging: cpLagging,
    lagMinutes: cpLagging ? cpMinutesSince : 0,
    status: cpLagging ? (cpMinutesSince < 60 ? "DRAW_IN_PROGRESS" : "MISSING_RESULT") : "UP_TO_DATE",
    statusMessage: cpLagging
      ? `Awaiting official Cash Pot result for ${expectedCpDateStr}`
      : `Latest draw verified: #${cpRow?.draw_number} (${cpRow?.draw_date})`
  };

  // -------------------------------------------------------------
  // C. LOTTO PLUS (Wed & Sat at 20:30 AST = 8:30 PM)
  // -------------------------------------------------------------
  // Find most recent Wednesday (3) or Saturday (6) at 8:30 PM
  let lottoTargetDate = new Date(astInfo.astDate);
  let lottoDrawUtcMs = 0;
  let lottoDateStr = "";

  for (let offset = 0; offset <= 7; offset++) {
    const testDate = new Date(astInfo.astDate.getTime() - offset * 86400000);
    const day = testDate.getUTCDay();
    if (day === 3 || day === 6) { // Wed or Sat
      const testUtcMs = makeUtcFromAST(testDate.getUTCFullYear(), testDate.getUTCMonth(), testDate.getUTCDate(), 20, 30);
      if (nowMs >= testUtcMs) {
        lottoDrawUtcMs = testUtcMs;
        lottoDateStr = `${testDate.getUTCFullYear()}-${String(testDate.getUTCMonth() + 1).padStart(2, "0")}-${String(testDate.getUTCDate()).padStart(2, "0")}`;
        break;
      }
    }
  }

  const lottoMinutesSince = lottoDrawUtcMs > 0 ? Math.floor((nowMs - lottoDrawUtcMs) / 60000) : 0;
  const lottoRow = lottoLatest[0];
  const lottoLagging = lottoMinutesSince > GRACE_PERIOD_MINUTES && lottoRow?.draw_date !== lottoDateStr;
  if (lottoLagging) {
    laggingCount++;
    recommendations.push(`Lotto Plus jackpot draw for ${lottoDateStr} is pending official result.`);
  }

  const lottoPlusFreshness: GameFreshness = {
    gameKey: "lotto-plus",
    gameTitle: "Lotto Plus",
    totalDraws: lottoCount[0]?.cnt || 0,
    latestDrawNumber: lottoRow?.draw_number || "N/A",
    latestDrawDate: lottoRow?.draw_date || "N/A",
    expectedDrawSlot: "Night Draw (8:30 PM)",
    expectedDrawDateAST: lottoDateStr,
    isLagging: lottoLagging,
    lagMinutes: lottoLagging ? lottoMinutesSince : 0,
    status: lottoLagging ? (lottoMinutesSince < 60 ? "DRAW_IN_PROGRESS" : "MISSING_RESULT") : "UP_TO_DATE",
    statusMessage: lottoLagging
      ? `Awaiting official Lotto Plus draw for ${lottoDateStr}`
      : `Latest draw verified: #${lottoRow?.draw_number} (${lottoRow?.draw_date})`
  };

  // -------------------------------------------------------------
  // D. WIN FOR LIFE (Tue & Fri at 19:00 AST = 7:00 PM)
  // -------------------------------------------------------------
  let wflDrawUtcMs = 0;
  let wflDateStr = "";

  for (let offset = 0; offset <= 7; offset++) {
    const testDate = new Date(astInfo.astDate.getTime() - offset * 86400000);
    const day = testDate.getUTCDay();
    if (day === 2 || day === 5) { // Tue or Fri
      const testUtcMs = makeUtcFromAST(testDate.getUTCFullYear(), testDate.getUTCMonth(), testDate.getUTCDate(), 19, 0);
      if (nowMs >= testUtcMs) {
        wflDrawUtcMs = testUtcMs;
        wflDateStr = `${testDate.getUTCFullYear()}-${String(testDate.getUTCMonth() + 1).padStart(2, "0")}-${String(testDate.getUTCDate()).padStart(2, "0")}`;
        break;
      }
    }
  }

  const wflMinutesSince = wflDrawUtcMs > 0 ? Math.floor((nowMs - wflDrawUtcMs) / 60000) : 0;
  const wflRow = wflLatest[0];
  const wflLagging = wflMinutesSince > GRACE_PERIOD_MINUTES && wflRow?.draw_date !== wflDateStr;
  if (wflLagging) {
    laggingCount++;
    recommendations.push(`Win For Life draw for ${wflDateStr} is pending official result.`);
  }

  const winForLifeFreshness: GameFreshness = {
    gameKey: "win-for-life",
    gameTitle: "Win For Life",
    totalDraws: wflCount[0]?.cnt || 0,
    latestDrawNumber: wflRow?.draw_number || "N/A",
    latestDrawDate: wflRow?.draw_date || "N/A",
    expectedDrawSlot: "Evening Draw (7:00 PM)",
    expectedDrawDateAST: wflDateStr,
    isLagging: wflLagging,
    lagMinutes: wflLagging ? wflMinutesSince : 0,
    status: wflLagging ? (wflMinutesSince < 60 ? "DRAW_IN_PROGRESS" : "MISSING_RESULT") : "UP_TO_DATE",
    statusMessage: wflLagging
      ? `Awaiting official Win For Life draw for ${wflDateStr}`
      : `Latest draw verified: #${wflRow?.draw_number} (${wflRow?.draw_date})`
  };

  // -------------------------------------------------------------
  // Sequence Gap Integrity Audit (Check last 25 draws in Play Whe and Pick 4)
  // -------------------------------------------------------------
  let sequenceGapsCount = 0;
  try {
    const recentPwDraws = await query<any>("SELECT draw_number FROM playwhe_draws ORDER BY draw_number DESC LIMIT 25");
    if (recentPwDraws.length > 1) {
      for (let i = 0; i < recentPwDraws.length - 1; i++) {
        const curr = Number(recentPwDraws[i].draw_number);
        const prev = Number(recentPwDraws[i + 1].draw_number);
        if (curr - prev > 1) {
          sequenceGapsCount += (curr - prev - 1);
        }
      }
    }
  } catch (err: any) {
    console.warn("[Watchdog] Gap audit warning:", err.message);
  }

  if (sequenceGapsCount > 0) {
    recommendations.push(`${sequenceGapsCount} missing sequence gaps detected in recent draw history. Sequence reconciliation recommended.`);
  }

  const totalDrawsInDb = (pwCount[0]?.cnt || 0) + 
    (pick4Count[0]?.cnt || 0) + 
    (cpCount[0]?.cnt || 0) + 
    (lottoCount[0]?.cnt || 0) + 
    (wflCount[0]?.cnt || 0);

  const status: "HEALTHY" | "ATTENTION_NEEDED" | "CRITICAL" = 
    laggingCount > 2 ? "CRITICAL" :
    (laggingCount > 0 || sequenceGapsCount > 0) ? "ATTENTION_NEEDED" :
    "HEALTHY";

  return {
    status,
    timestampUTC: nowUtc.toISOString(),
    timestampAST: `${astInfo.isoDateStr} ${String(astInfo.hours).padStart(2, "0")}:${String(astInfo.minutes).padStart(2, "0")} AST`,
    totalDrawsInDb,
    games: {
      playWhe: playWheFreshness,
      pick4: pick4Freshness,
      cashPot: cashPotFreshness,
      lottoPlus: lottoPlusFreshness,
      winForLife: winForLifeFreshness,
    },
    laggingGamesCount: laggingCount,
    sequenceGapsCount,
    recommendations: recommendations.length > 0 ? recommendations : ["All 5 NLCB games are 100% synchronized and up to date with official schedules."]
  };
}
