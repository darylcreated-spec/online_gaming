/**
 * Live Parser Contract Verification Script
 *
 * Verifies primary and fallback NLCB scrapers against live upstream endpoints
 * without mutating the database. Exits non-zero if any HTTP 200 endpoint
 * exhibits PARSER_DRIFT (expected HTML/JSON markers present, 0 draws parsed).
 *
 * Usage: npx tsx scripts/verify_parsers.ts
 */

import * as cheerio from "cheerio";
import {
  scrapePlayWheLivePortal,
  scrapePick4LivePortal,
  scrapeCashPotLivePortal,
  scrapeWinForLifeLivePortal,
  resetScraperTelemetry,
  getLastScraperTelemetry,
  getParserDriftWarnings,
  recordScraperTelemetry
} from "../src/lib/scraper";

async function checkOfficialDrawDetails(url: string, game: "play-whe" | "pick4") {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml"
      }
    });
    if (!res.ok) {
      recordScraperTelemetry({
        source: "nlcbplaywhelotto",
        game,
        httpStatus: res.status,
        parsedCount: 0,
        drift: false,
        note: "non-ok-http"
      });
      return;
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    let parsed = 0;

    $(".drawDetails").each((_, card) => {
      const slotRaw = $(card).find(".timeOfDay").first().text().trim();
      const drawNumMatch = $(card).find(".drawnum").first().text().match(/(\d+)/);
      if (game === "play-whe") {
        const ballText = $(card).find("a .ball").first().text().trim() || $(card).find(".ball").first().text().trim();
        const winNum = parseInt(ballText, 10);
        if (slotRaw && drawNumMatch && !isNaN(winNum) && winNum >= 1 && winNum <= 36) parsed++;
      } else {
        const digits = $(card)
          .find(".ball")
          .slice(0, 4)
          .map((__, el) => parseInt($(el).text().trim(), 10))
          .get();
        if (slotRaw && drawNumMatch && digits.length === 4 && digits.every((d) => !isNaN(d) && d >= 0 && d <= 9)) {
          parsed++;
        }
      }
    });

    const hasMarkers =
      $(".drawDetails").length > 0 ||
      (game === "play-whe" ? /Play\s+Whe\s+Results/i.test(html) : /Pick\s*4/i.test(html));

    recordScraperTelemetry({
      source: "nlcbplaywhelotto",
      game,
      httpStatus: res.status,
      parsedCount: parsed,
      drift: parsed === 0 && hasMarkers
    });
  } catch (err: any) {
    recordScraperTelemetry({
      source: "nlcbplaywhelotto",
      game,
      httpStatus: 0,
      parsedCount: 0,
      drift: false,
      note: err.message
    });
  }
}

async function checkRailwayEndpoint(url: string, game: "play-whe" | "pick4") {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      recordScraperTelemetry({
        source: "railway",
        game,
        httpStatus: res.status,
        parsedCount: 0,
        drift: false,
        note: "non-ok-http"
      });
      return;
    }
    const json = await res.json();
    const list = Array.isArray(json) ? json : [json];
    let parsed = 0;
    for (const item of list) {
      if (game === "play-whe" && item?.draw_number && item?.main_number !== undefined) parsed++;
      if (game === "pick4" && item?.draw_number && item?.number1 !== undefined) parsed++;
    }
    recordScraperTelemetry({
      source: "railway",
      game,
      httpStatus: res.status,
      parsedCount: parsed,
      drift: parsed === 0 && list.length > 0 && Boolean(list[0])
    });
  } catch (err: any) {
    recordScraperTelemetry({
      source: "railway",
      game,
      httpStatus: 0,
      parsedCount: 0,
      drift: false,
      note: err.message
    });
  }
}

async function main() {
  resetScraperTelemetry();
  console.log("=== NLCB Live Parser Contract Check ===");

  const [pwLive, p4Live, cpLive, wflLive] = await Promise.all([
    scrapePlayWheLivePortal(),
    scrapePick4LivePortal(),
    scrapeCashPotLivePortal(),
    scrapeWinForLifeLivePortal()
  ]);

  await Promise.all([
    checkOfficialDrawDetails("https://www.nlcbplaywhelotto.com/nlcb-play-whe-results/", "play-whe"),
    checkOfficialDrawDetails("https://www.nlcbplaywhelotto.com/nlcb-pick-4-results/", "pick4"),
    checkRailwayEndpoint("https://backend-production-412b.up.railway.app/api/playwhe/results/latest-date", "play-whe"),
    checkRailwayEndpoint("https://backend-production-412b.up.railway.app/api/pick4/results/latest-date", "pick4")
  ]);

  console.log("\nLive Portal Parsed Counts:");
  console.log(`  play-whe (nlcblottoresult):     ${pwLive.length}`);
  console.log(`  pick4 (nlcblottoresult):        ${p4Live.length}`);
  console.log(`  cashpot (nlcblottoresult):      ${cpLive.length}`);
  console.log(`  win-for-life (nlcblottoresult): ${wflLive.length}`);

  const telemetry = getLastScraperTelemetry();
  console.log("\nPer-Source Telemetry:");
  for (const t of telemetry) {
    console.log(
      `  [${t.drift ? "DRIFT" : "OK   "}] ${t.source.padEnd(16)} ${t.game.padEnd(13)} HTTP=${String(t.httpStatus).padEnd(3)} parsed=${t.parsedCount}${t.note ? ` (${t.note})` : ""}`
    );
  }

  const driftWarnings = getParserDriftWarnings();
  if (driftWarnings.length > 0) {
    console.error("\nPARSER_DRIFT DETECTED:");
    for (const w of driftWarnings) console.error(`  - ${w}`);
    process.exit(1);
  }

  console.log("\nAll active HTTP 200 parser contracts passed with 0 drift.");
}

main().catch((err) => {
  console.error("Fatal parser verification error:", err);
  process.exit(1);
});
