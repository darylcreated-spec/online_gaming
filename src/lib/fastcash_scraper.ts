import * as cheerio from "cheerio";
import { ensureFastCashSchema, fastCashDb, normalizeFastCashBall, queryFastCash } from "./fastcash_db";

export interface ParsedFastCashDraw {
  draw_number: number;
  draw_date: string;
  draw_time: string;
  winning_code: string;
  winning_index: number;
}

const FASTCASH_BASE_URL = "https://www.nlcbgames.com/fast-cash/";

function parseTimeToMinutes(timeStr: string): number | null {
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ap = m[3].toLowerCase();
  if (ap === "pm" && hh !== 12) hh += 12;
  if (ap === "am" && hh === 12) hh = 0;
  return hh * 60 + mm;
}

function addDaysISO(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().split("T")[0];
}

function getTodayAstISO(): string {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().split("T")[0];
}

/**
 * Scrapes a single paginated page of https://www.nlcbgames.com/fast-cash/.
 * Parses only the 24-row repeater (.oxy-dynamic-list #2) and extracts the main
 * winning number (0, 00, 01..36), explicitly ignoring bonus indicators and jackpot numbers.
 */
export async function scrapeFastCashPage(
  pageNum: number = 1,
  initialDateISO?: string
): Promise<{ draws: ParsedFastCashDraw[]; lastDateISO: string }> {
  const url = pageNum <= 1 ? FASTCASH_BASE_URL : `${FASTCASH_BASE_URL}page/${pageNum}/`;
  let html = "";
  let lastFetchErr: any;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml"
        },
        signal: AbortSignal.timeout(9000)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${url}`);
      }
      html = await res.text();
      break;
    } catch (err: any) {
      lastFetchErr = err;
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  if (!html && lastFetchErr) throw lastFetchErr;

  const $ = cheerio.load(html);
  const repeaters = $(".oxy-dynamic-list");
  const targetRepeater = repeaters.length > 1 ? repeaters.eq(1) : repeaters.eq(0);

  let currentDate = initialDateISO || getTodayAstISO();
  let prevMinutes: number | null = null;
  const draws: ParsedFastCashDraw[] = [];

  targetRepeater.children().each((_, row) => {
    const $row = $(row);
    const rowText = $row.text().replace(/\s+/g, " ").trim();
    const drawNumText =
      $row.find('[id^="code_block-18771"], [id^="code_block-18722"]').first().text().trim() ||
      (rowText.match(/Draw#\s*(\d+)/i)?.[1] ?? "");
    const drawNumber = parseInt(drawNumText.replace(/[^\d]/g, ""), 10);
    if (isNaN(drawNumber)) return;

    const drawTime =
      $row.find('[id^="text_block-19129"], [id^="text_block-19153"]').first().text().trim() ||
      (rowText.match(/(\d{1,2}:\d{2}\s*(?:am|pm))/i)?.[1] ?? "Unknown");
    const mins = parseTimeToMinutes(drawTime);
    if (mins !== null && prevMinutes !== null && mins > prevMinutes + 180) {
      // Midnight rollover stepping backward in time (e.g. 12:03 am -> 11:57 pm)
      currentDate = addDaysISO(currentDate, -1);
    }
    if (mins !== null) prevMinutes = mins;

    // Extract ONLY the primary Winning Number ball (ignore bonus ME/MD and Jackpot Numbers)
    const rawBall = $row
      .find('[id^="div_block-10049"] .gamenumber [id^="span-10052"], [id^="div_block-10049"] .gamenumber, [id^="div_block-9912"] .gamenumber')
      .first()
      .text()
      .trim();

    const normalized = normalizeFastCashBall(rawBall);
    if (!normalized) return;

    draws.push({
      draw_number: drawNumber,
      draw_date: currentDate,
      draw_time: drawTime,
      winning_code: normalized.code,
      winning_index: normalized.index
    });
  });

  return { draws, lastDateISO: currentDate };
}

let lastFastCashSyncMs = 0;
const SYNC_COOLDOWN_MS = 45_000;
const DEFAULT_MAX_ARCHIVE_ROWS = Number(process.env.FASTCASH_MAX_ROWS || 50000);

/**
 * Incrementally syncs latest Fast Cash draws into the dedicated Fast Cash Turso DB,
 * stopping as soon as it hits draws already persisted and only writing new draw_numbers.
 */
export async function syncLatestFastCash(
  maxPages: number = 3,
  force: boolean = false
): Promise<{
  success: boolean;
  skippedCooldown?: boolean;
  pagesFetched: number;
  drawsFetched: number;
  drawsAdded: number;
  rowsPruned?: number;
  latestDrawNumber: number | null;
}> {
  await ensureFastCashSchema();

  const existingRow = await queryFastCash<{ max_draw: number | null }>(
    "SELECT MAX(draw_number) as max_draw FROM fastcash_draws"
  );
  const maxExistingDraw = existingRow[0]?.max_draw ? Number(existingRow[0].max_draw) : 0;

  const nowMs = Date.now();
  if (!force && maxExistingDraw > 0 && nowMs - lastFastCashSyncMs < SYNC_COOLDOWN_MS) {
    return {
      success: true,
      skippedCooldown: true,
      pagesFetched: 0,
      drawsFetched: 0,
      drawsAdded: 0,
      latestDrawNumber: maxExistingDraw
    };
  }
  lastFastCashSyncMs = nowMs;

  let pagesFetched = 0;
  let drawsFetched = 0;
  let drawsAdded = 0;
  let rowsPruned = 0;
  let latestDrawNumber: number | null = maxExistingDraw || null;
  let dateCursor = getTodayAstISO();

  for (let page = 1; page <= maxPages; page++) {
    let pageDraws: ParsedFastCashDraw[] = [];
    try {
      const { draws, lastDateISO } = await scrapeFastCashPage(page, dateCursor);
      dateCursor = lastDateISO;
      pageDraws = draws;
      pagesFetched++;
    } catch (pageErr: any) {
      // If page 1 already succeeded, return partial success rather than failing the sync
      if (page > 1 && pagesFetched > 0) {
        console.warn(`[FastCash Sync] Page ${page} skipped due to timeout/error:`, pageErr.message);
        break;
      }
      lastFastCashSyncMs = 0; // Reset cooldown on page 1 failure so retry is allowed immediately
      throw pageErr;
    }
    if (pageDraws.length === 0) break;

    drawsFetched += pageDraws.length;
    if (page === 1 && pageDraws[0]) {
      latestDrawNumber = Math.max(latestDrawNumber || 0, pageDraws[0].draw_number);
    }

    // Only write draws strictly newer than maxExistingDraw (saves ~95% of Turso write ops)
    const candidateDraws =
      maxExistingDraw > 0 && page === 1
        ? pageDraws.filter((d) => d.draw_number > maxExistingDraw)
        : pageDraws;

    if (candidateDraws.length > 0) {
      const batchRes = await fastCashDb.batch(
        candidateDraws.map((d) => ({
          sql: `INSERT OR IGNORE INTO fastcash_draws (draw_number, draw_date, draw_time, winning_code, winning_index) VALUES (?, ?, ?, ?, ?)`,
          args: [d.draw_number, d.draw_date, d.draw_time, d.winning_code, d.winning_index]
        })),
        "write"
      );
      const insertedOnPage = batchRes.reduce((acc, r) => acc + (r.rowsAffected || 0), 0);
      drawsAdded += insertedOnPage;
    }

    // Stop as soon as we reach draw numbers already present in the database
    if (maxExistingDraw > 0 && pageDraws.some((d) => d.draw_number <= maxExistingDraw)) {
      break;
    }
  }

  // Automatic retention cap so 3-minute draws never exhaust free-tier storage
  if (drawsAdded > 0 && DEFAULT_MAX_ARCHIVE_ROWS > 1000) {
    try {
      const countRes = await queryFastCash<{ cnt: number }>("SELECT COUNT(*) as cnt FROM fastcash_draws");
      const totalRows = Number(countRes[0]?.cnt || 0);
      if (totalRows > DEFAULT_MAX_ARCHIVE_ROWS) {
        const pruneRes = await fastCashDb.execute({
          sql: `DELETE FROM fastcash_draws WHERE draw_number <= (
            SELECT draw_number FROM fastcash_draws ORDER BY draw_number DESC LIMIT 1 OFFSET ?
          )`,
          args: [DEFAULT_MAX_ARCHIVE_ROWS]
        });
        rowsPruned = pruneRes.rowsAffected || 0;
      }
    } catch (pruneErr: any) {
      console.warn("[FastCash Retention] Prune notice:", pruneErr.message);
    }
  }

  return {
    success: true,
    pagesFetched,
    drawsFetched,
    drawsAdded,
    rowsPruned,
    latestDrawNumber
  };
}

/**
 * Resumable bulk backfill across paginated Fast Cash pages.
 */
export async function backfillFastCashPages(
  startPage: number = 1,
  endPage: number = 250,
  onProgress?: (info: { page: number; totalAdded: number; latestDraw: number }) => void
): Promise<{ pagesProcessed: number; totalParsed: number; totalAdded: number }> {
  await ensureFastCashSchema();

  let pagesProcessed = 0;
  let totalParsed = 0;
  let totalAdded = 0;
  let dateCursor = getTodayAstISO();
  let prevGlobalMins: number | null = null;
  const CHUNK_SIZE = 5;

  for (let chunkStart = startPage; chunkStart <= endPage; chunkStart += CHUNK_SIZE) {
    const chunkPages: number[] = [];
    for (let p = chunkStart; p < chunkStart + CHUNK_SIZE && p <= endPage; p++) {
      chunkPages.push(p);
    }

    const pageResults = await Promise.all(
      chunkPages.map(async (p) => {
        try {
          const res = await scrapeFastCashPage(p, dateCursor);
          return { page: p, draws: res.draws };
        } catch (err: any) {
          console.warn(`[FastCash Backfill] Page ${p} warning:`, err.message);
          return { page: p, draws: [] as ParsedFastCashDraw[] };
        }
      })
    );

    const allChunkDraws: ParsedFastCashDraw[] = [];
    for (const pr of pageResults) {
      pagesProcessed++;
      if (pr.draws.length === 0) continue;
      for (const d of pr.draws) {
        const mins = parseTimeToMinutes(d.draw_time);
        if (mins !== null && prevGlobalMins !== null && mins > prevGlobalMins + 180) {
          dateCursor = addDaysISO(dateCursor, -1);
        }
        if (mins !== null) prevGlobalMins = mins;
        d.draw_date = dateCursor;
        allChunkDraws.push(d);
      }
    }

    if (allChunkDraws.length > 0) {
      totalParsed += allChunkDraws.length;
      const batchRes = await fastCashDb.batch(
        allChunkDraws.map((d) => ({
          sql: `INSERT OR IGNORE INTO fastcash_draws (draw_number, draw_date, draw_time, winning_code, winning_index) VALUES (?, ?, ?, ?, ?)`,
          args: [d.draw_number, d.draw_date, d.draw_time, d.winning_code, d.winning_index]
        })),
        "write"
      );
      totalAdded += batchRes.reduce((acc, r) => acc + (r.rowsAffected || 0), 0);

      const lastPage = chunkPages[chunkPages.length - 1];
      if (onProgress && (lastPage % 10 === 0 || chunkStart === startPage || lastPage === endPage)) {
        onProgress({ page: lastPage, totalAdded, latestDraw: allChunkDraws[allChunkDraws.length - 1].draw_number });
      }
    }
  }

  return { pagesProcessed, totalParsed, totalAdded };
}
