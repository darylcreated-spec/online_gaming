import * as cheerio from "cheerio";
import { db } from "./db";

const BASE_URL = "https://www.nlcbplaywhelotto.com/nlcb-lotto-plus-results/";

let isScraperApiExhausted = false;
let scraperApiCooldownUntil = 0;

export function markScraperApiExhausted(reason: string) {
  isScraperApiExhausted = true;
  scraperApiCooldownUntil = Date.now() + 1000 * 60 * 60; // 1 hour cooldown
  console.warn(`[ScraperAPI] Credit limit reached or proxy error (${reason}). Automatically falling back to DIRECT scraping and secondary REST API tiers.`);
}

export function canUseScraperApi(): boolean {
  const apiKey = process.env.SCRAPER_API_KEY;
  if (!apiKey) return false;
  if (isScraperApiExhausted && Date.now() < scraperApiCooldownUntil) return false;
  return true;
}

export function getScrapeUrl(url: string): string {
  if (canUseScraperApi()) {
    const apiKey = process.env.SCRAPER_API_KEY;
    return `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;
  }
  return url;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.nlcbplaywhelotto.com/",
};

// Helper: fetch with exponential backoff retries and multi-tier fallback (ScraperAPI -> Direct Fetch)
export async function fetchWithRetry(targetUrl: string, options: RequestInit = {}, retries: number = 2): Promise<Response> {
  // If targetUrl contains ScraperAPI proxy, extract raw target URL for fallback
  let rawUrl = targetUrl;
  let isProxy = false;
  if (targetUrl.includes("api.scraperapi.com")) {
    isProxy = true;
    try {
      const parsed = new URL(targetUrl);
      rawUrl = parsed.searchParams.get("url") || targetUrl;
    } catch {
      rawUrl = targetUrl;
    }
  }

  // Tier 1: Try ScraperAPI if requested and not exhausted
  if (isProxy && canUseScraperApi()) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(targetUrl, {
          ...options,
          headers: { ...HEADERS, ...(options.headers || {}) },
          signal: AbortSignal.timeout(8000)
        });

        // 401 Unauthorized, 403 Forbidden (Credits exhausted), or 429 Rate limited
        if (res.status === 401 || res.status === 403 || res.status === 429) {
          markScraperApiExhausted(`HTTP ${res.status}`);
          break; // Break out immediately to fall back to direct fetch without waiting
        }

        if (res.ok) return res;
      } catch (err: any) {
        if (i === retries - 1) {
          console.warn(`[Proxy] ScraperAPI attempt failed: ${err.message}. Falling back to direct fetch.`);
        }
      }
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 400 * Math.pow(2, i)));
      }
    }
  }

  // Tier 2: Direct Fetch from raw target URL with native browser headers
  let lastError: any = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(rawUrl, {
        ...options,
        headers: { ...HEADERS, ...(options.headers || {}) },
        signal: AbortSignal.timeout(9000)
      });
      if (res.ok) return res;
      lastError = new Error(`Direct fetch HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      lastError = err;
    }
    if (i < retries - 1) {
      await new Promise(r => setTimeout(r, 400 * Math.pow(2, i)));
    }
  }
  throw lastError || new Error(`Fetch failed after ${retries} direct attempts for ${rawUrl}`);
}

// Standardize date: "11-Jul-26" -> "2026-07-11"
export function parseDate(dateStr: string): string {
  const cleanStr = dateStr.replace("DATE:", "").trim();
  const parts = cleanStr.split("-");
  if (parts.length !== 3) return cleanStr;

  const day = parts[0].padStart(2, "0");
  const monthRaw = parts[1].trim().toLowerCase();
  let year = parts[2].trim();

  if (year.length === 2) {
    year = "20" + year;
  }

  // Handle numeric month (e.g. 07 or 7)
  if (/^\d+$/.test(monthRaw)) {
    const monthNum = parseInt(monthRaw);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${year}-${monthRaw.padStart(2, "0")}-${day}`;
    }
  }

  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    january: "01", february: "02", march: "03", april: "04", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12"
  };

  const month = months[monthRaw] || "01";
  return `${year}-${month}-${day}`;
}

// Scrape Homepage to get latest draw & active CSRF token (sid)
export async function scrapeHomepage(): Promise<{ latestDraw: any | null, sid: string | null }> {
  try {
    const res = await fetchWithRetry(getScrapeUrl(BASE_URL));
    if (!res.ok) throw new Error(`Failed to load homepage: ${res.statusText}`);
    
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // 1. Get CSRF token
    const sid = $('input[name="sid"]').val() as string || null;
    
    // 2. Get latest draw details
    const resultsDiv = $("#results");
    if (!resultsDiv.length) return { latestDraw: null, sid };
    
    const dateText = resultsDiv.find("strong").first().text().trim();
    if (!dateText) return { latestDraw: null, sid };
    const dateStr = parseDate(dateText);
    
    const drawText = resultsDiv.find(".drawnum").text().trim();
    const drawMatch = drawText.match(/Draw\s*#\s*(\d+)/i);
    if (!drawMatch) return { latestDraw: null, sid };
    const drawNumber = parseInt(drawMatch[1]);
    
    const balls = resultsDiv.find(".ball");
    if (balls.length < 6) return { latestDraw: null, sid };
    
    const numbers: number[] = [];
    balls.slice(0, 5).each((_, el) => {
      numbers.push(parseInt($(el).text().trim()));
    });
    numbers.sort((a, b) => a - b);
    
    const powerball = parseInt($(balls[5]).text().trim());
    
    // Multiplier
    const multiplierText = resultsDiv.find(".multiplier").text().trim();
    const multMatch = multiplierText.match(/(\d+x)/i);
    const multiplier = multMatch ? multMatch[1].toLowerCase() : "1x";
    
    // Jackpot
    const jackpotText = $("#jackpot").text().trim() || "Unknown";
    
    const latestDraw = {
      draw_number: drawNumber,
      draw_date: dateStr,
      num1: numbers[0],
      num2: numbers[1],
      num3: numbers[2],
      num4: numbers[3],
      num5: numbers[4],
      powerball,
      multiplier,
      jackpot: jackpotText
    };
    
    return { latestDraw, sid };
  } catch (error) {
    console.error("Error scraping homepage in JS:", error);
    return { latestDraw: null, sid: null };
  }
}

// Scrape draws for a specific month/year using POST
export async function scrapeMonth(monthStr: string, yearVal: number, sid: string | null): Promise<any[]> {
  try {
    const formData = new URLSearchParams();
    formData.append("lotto_month", monthStr);
    formData.append("lotto_year", yearVal.toString());
    formData.append("month_year_btn", "SEARCH");
    if (sid) {
      formData.append("sid", sid);
    }
    
    const res = await fetchWithRetry(getScrapeUrl(BASE_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    
    if (!res.ok) throw new Error(`POST failed for ${monthStr} ${yearVal}: ${res.statusText}`);
    
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const table = $("#monthResults");
    if (!table.length) return [];
    
    const tbody = table.find("tbody").length ? table.find("tbody") : table;
    const rows = tbody.find("tr");
    
    const draws: any[] = [];
    let currentDate = "";
    
    rows.each((_, row) => {
      const $row = $(row);
      if ($row.hasClass("lotto-date-tr")) {
        const dateText = $row.find("strong").text().trim();
        currentDate = parseDate(dateText);
      } else if ($row.hasClass("lotto-tr")) {
        const tds = $row.find("td");
        if (tds.length >= 4 && currentDate) {
          try {
            const drawNum = parseInt($(tds[0]).text().trim());
            const numsStr = $(tds[1]).text().trim();
            const nums = numsStr.split("-").map(n => parseInt(n.trim())).sort((a, b) => a - b);
            const pb = parseInt($(tds[2]).text().trim());
            
            let mult = $(tds[3]).text().replace(/\s+/g, "").trim().toLowerCase();
            if (mult && !mult.endsWith("x")) {
              mult += "x";
            }
            
            const jackpot = tds.length >= 5 ? $(tds[4]).text().trim() : "Unknown";
            
            draws.push({
              draw_number: drawNum,
              draw_date: currentDate,
              num1: nums[0],
              num2: nums[1],
              num3: nums[2],
              num4: nums[3],
              num5: nums[4],
              powerball: pb,
              multiplier: mult || "1x",
              jackpot: jackpot || "X"
            });
          } catch (e) {
            console.error("Error parsing row in JS:", e);
          }
        }
      }
    });
    
    return draws;
  } catch (error) {
    console.error(`Error scraping monthly draws for ${monthStr} ${yearVal} in JS:`, error);
    return [];
  }
}

// Save draw to Turso/SQLite
export async function saveDraw(draw: any): Promise<void> {
  const sql = `
    INSERT OR IGNORE INTO draws (draw_number, draw_date, num1, num2, num3, num4, num5, powerball, multiplier, jackpot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const args = [
    draw.draw_number,
    draw.draw_date,
    draw.num1,
    draw.num2,
    draw.num3,
    draw.num4,
    draw.num5,
    draw.powerball,
    draw.multiplier,
    draw.jackpot
  ];
  await db.execute({ sql, args });
}

// Sync latest draws (runs homepage scrape + current/previous year, or specific targetYear)
export async function syncLatest(full: boolean = false, targetYear?: number): Promise<{ success: boolean, drawsAdded: number, details: string }> {
  let drawsAdded = 0;
  let details = "";
  
  try {
    // 1. Initialize schema table if not exists (libSQL client doesn't support executing script in one call easily, 
    // but we can execute the CREATE TABLE statement directly)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS draws (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        draw_number INTEGER UNIQUE,
        draw_date TEXT NOT NULL,
        num1 INTEGER NOT NULL,
        num2 INTEGER NOT NULL,
        num3 INTEGER NOT NULL,
        num4 INTEGER NOT NULL,
        num5 INTEGER NOT NULL,
        powerball INTEGER NOT NULL,
        multiplier TEXT,
        jackpot TEXT
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
    
    // 2. Fetch homepage (only do this for recent syncs, skip for specific historical years to speed up)
    try {
      let sid = null;
      if (!targetYear) {
        const homeRes = await scrapeHomepage();
        sid = homeRes.sid;
        if (homeRes.latestDraw) {
          // Save live next estimated jackpot to settings
          if (homeRes.latestDraw.jackpot && homeRes.latestDraw.jackpot !== "Unknown") {
            await db.execute({
              sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('lotto_next_jackpot', ?)",
              args: [homeRes.latestDraw.jackpot]
            });
          }
          
          const check = await db.execute({
            sql: "SELECT 1 FROM draws WHERE draw_number = ?",
            args: [homeRes.latestDraw.draw_number]
          });
          if (check.rows.length === 0) {
            await saveDraw(homeRes.latestDraw);
            drawsAdded++;
            details += `Added Draw #${homeRes.latestDraw.draw_number} (${homeRes.latestDraw.draw_date}) from homepage. `;
          }
        }
      } else {
        sid = await scrapeHomepage().then(r => r.sid);
      }
      
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentYear = new Date().getFullYear();
      const currentMonthIdx = new Date().getMonth();
      
      // If it's January (index 0), allow startYear to go back to previous year to check December
      const startYear = targetYear ? targetYear : (full ? 2001 : (currentMonthIdx === 0 ? currentYear - 1 : currentYear));
      const endYear = targetYear ? targetYear : currentYear;
      
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      for (let y = endYear; y >= startYear; y--) {
        for (let mIdx = months.length - 1; mIdx >= 0; mIdx--) {
          // If not full sync, only scrape current month (or previous month if in the first 3 days of month)
          if (!full && !targetYear) {
            const nowDay = new Date().getDate();
            if (y === currentYear) {
              if (mIdx !== currentMonthIdx && !(nowDay <= 3 && mIdx === currentMonthIdx - 1)) {
                continue;
              }
            } else if (y === currentYear - 1 && currentMonthIdx === 0 && mIdx === 11 && nowDay <= 3) {
              // Allow Dec of previous year on first 3 days of Jan
            } else {
              continue;
            }
          }
          const month = months[mIdx];
          const monthDraws = await scrapeMonth(month, y, sid);
          
          if (monthDraws.length > 0) {
            const batchStmts = monthDraws.map(d => ({
              sql: `INSERT OR IGNORE INTO draws (draw_number, draw_date, num1, num2, num3, num4, num5, powerball, multiplier, jackpot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [d.draw_number, d.draw_date, d.num1, d.num2, d.num3, d.num4, d.num5, d.powerball, d.multiplier || "", d.jackpot || ""]
            }));
            await db.batch(batchStmts);
            drawsAdded += monthDraws.length;
          }
        }
      }
    } catch (lottoScrapeErr: any) {
      console.warn("[LottoPlus] Official scrape notice (falling back to REST API):", lottoScrapeErr.message);
    }

    // 3. High-Speed Secondary REST API Fallback (Railway)
    try {
      const restRes = await fetchWithRetry("https://backend-production-412b.up.railway.app/api/lottoplus/results/latest-date");
      if (restRes.ok) {
        const items = await restRes.json();
        const list = Array.isArray(items) ? items : [items];
        for (const item of list) {
          if (item && item.draw_number) {
            const dDate = item.draw_date ? item.draw_date.split("T")[0] : "";
            const nums = [item.number1, item.number2, item.number3, item.number4, item.number5].sort((a: number, b: number) => a - b);
            const mult = item.multiplier ? `${item.multiplier}x` : "1x";
            const res = await db.execute({
              sql: `INSERT OR IGNORE INTO draws (draw_number, draw_date, num1, num2, num3, num4, num5, powerball, multiplier, jackpot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [item.draw_number, dDate, nums[0], nums[1], nums[2], nums[3], nums[4], item.powerball, mult, item.next_estimated_jackpot || ""]
            });
            if (res.rowsAffected > 0) {
              drawsAdded++;
              details += `Added Lotto Plus Draw #${item.draw_number} (${dDate}) from REST fallback. `;
            }
            if (item.next_estimated_jackpot) {
              await db.execute({
                sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('lotto_next_jackpot', ?)",
                args: [item.next_estimated_jackpot]
              });
            }
          }
        }
      }
    } catch (e: any) {
      console.warn("[LottoPlus] REST API fallback notice:", e.message);
    }
    
    return { success: true, drawsAdded, details: details || `Sync complete. ${drawsAdded} draws added/updated.` };
  } catch (error: any) {
    console.error("Sync error in JS scraper:", error);
    return { success: false, drawsAdded, details: error.message };
  }
}

// === PLAY WHE SCRAPING ENGINE ===

const PLAYWHE_URL = "https://www.nlcbplaywhelotto.com/nlcb-play-whe-results/";

export function parsePlayWheDate(dateStr: string): string {
  const cleanStr = dateStr.replace("DATE:", "").trim();
  const parts = cleanStr.split("-");
  if (parts.length !== 3) return cleanStr;

  const day = parts[0].padStart(2, "0");
  const monthName = parts[1].toLowerCase();
  let year = parts[2];

  if (year.length === 2) {
    year = "20" + year;
  }

  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    january: "01", february: "02", march: "03", april: "04", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12"
  };

  const month = months[monthName] || "01";
  return `${year}-${month}-${day}`;
}

export async function scrapePlayWheSid(): Promise<string | null> {
  try {
    const res = await fetchWithRetry(getScrapeUrl(PLAYWHE_URL));
    if (!res.ok) throw new Error(`Failed to load page: ${res.statusText}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    return $('input[name="sid"]').val() as string || null;
  } catch (error) {
    console.error("Error fetching Play Whe sid:", error);
    return null;
  }
}

export async function scrapePlayWheMonth(monthStr: string, yearVal: number, sid: string | null): Promise<any[]> {
  try {
    const formData = new URLSearchParams();
    formData.append("playwhe_month", monthStr);
    formData.append("playwhe_year", yearVal.toString());
    formData.append("dateBtn", "SEARCH");
    if (sid) {
      formData.append("sid", sid);
    }
    
    const res = await fetchWithRetry(getScrapeUrl(PLAYWHE_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    
    if (!res.ok) throw new Error(`POST failed for ${monthStr} ${yearVal}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const table = $("table");
    if (!table.length) return [];
    
    const draws: any[] = [];
    const rows = table.find("tr");
    
    rows.each((_, row) => {
      const tds = $(row).find("td, th");
      if (tds.length < 4) return;
      
      const firstText = $(tds[0]).text().trim();
      if (firstText.includes("Draw") || firstText.includes("Draw#")) return;
      
      try {
        const drawNum = parseInt(firstText);
        const rawDate = $(tds[1]).text().trim();
        const drawDate = parsePlayWheDate(rawDate);
        const drawTimeSlot = $(tds[2]).text().trim();
        
        const rawMark = $(tds[3]).text().trim();
        const markParts = rawMark.split(/\s+/);
        if (!markParts.length) return;
        const winningNumber = parseInt(markParts[0]);
        
        if (isNaN(drawNum) || isNaN(winningNumber)) return;
        
        draws.push({
          draw_number: drawNum,
          draw_date: drawDate,
          draw_time_slot: drawTimeSlot,
          winning_number: winningNumber
        });
      } catch (e) {
        // Ignore parsing errors
      }
    });
    
    return draws;
  } catch (error) {
    console.error(`Error scraping Play Whe draws for ${monthStr} ${yearVal}:`, error);
    return [];
  }
}

// === PLAY WHE LIVE PORTAL SCRAPER (nlcblottoresult.com) ===
export async function scrapePlayWheLivePortal(): Promise<any[]> {
  try {
    const res = await fetchWithRetry("https://nlcblottoresult.com/");
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const t0 = $('table').eq(0);
    const text = t0.text();
    const today = new Date().toISOString().split("T")[0];

    const MARKS = [
      'Centipede','Old Lady','Carriage','Dead Man','Parson Man','Belly','Hog','Tiger',
      'Cattle','Monkey','Corbeau','King','Crapaud','Money','Sick Woman','Jamette',
      'Pigeon','Water Boat','Horse','Dog','Mouth','Rat','House','Queen','Morocoy',
      'Fowl','Little Snake','Red Fish','Opium Man','House Cat','Parson Wife','Shrimps',
      'Spider','Blind Man','Big Snake','Donkey'
    ];

    const draws: any[] = [];
    const slots = ['Morning', 'Midday', 'Afternoon', 'Evening'];
    for (const slot of slots) {
      const re = new RegExp(slot + '\\s+Draw\\s+#(\\d+)[\\s\\S]*?(\\d{1,2})\\s+([A-Za-z\\s]+?)(?:WB|MU|MX|MB|Pay|Mid|$)', 'i');
      const m = text.match(re);
      if (m) {
        const drawNum = parseInt(m[1], 10);
        const winNum = parseInt(m[2], 10);
        const markRaw = m[3].trim().toLowerCase();
        const isValidMark = MARKS.some(mark => markRaw.includes(mark.toLowerCase()));
        if (isValidMark && winNum >= 1 && winNum <= 36) {
          draws.push({
            draw_number: drawNum,
            draw_date: today,
            draw_time_slot: slot,
            winning_number: winNum
          });
        }
      }
    }
    return draws;
  } catch (err: any) {
    console.warn("[PlayWhe] Live portal scrape notice:", err.message);
    return [];
  }
}

export async function savePlayWheDraw(draw: any): Promise<void> {
  const sql = `
    INSERT OR IGNORE INTO playwhe_draws (draw_number, draw_date, draw_time_slot, winning_number)
    VALUES (?, ?, ?, ?)
  `;
  await db.execute({
    sql,
    args: [draw.draw_number, draw.draw_date, draw.draw_time_slot, draw.winning_number]
  });
}

export async function syncPlayWhe(full: boolean = false, targetYear?: number): Promise<{ success: boolean; drawsAdded: number; details: string }> {
  let drawsAdded = 0;
  let details = "";
  try {
    // Initialize playwhe_draws table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS playwhe_draws (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        draw_number INTEGER UNIQUE,
        draw_date TEXT NOT NULL,
        draw_time_slot TEXT NOT NULL,
        winning_number INTEGER NOT NULL
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS playwhe_predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prediction_date TEXT NOT NULL,
        draw_time_slot TEXT NOT NULL,
        predicted_numbers TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        winning_number INTEGER,
        winning_draw_number INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(prediction_date, draw_time_slot)
      )
    `);

    try {
      const sid = await scrapePlayWheSid();
      if (!sid) {
        console.warn("WARNING: Could not retrieve CSRF sid token for Play Whe. Sync might fail but proceeding...");
      }
      
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentYear = new Date().getFullYear();
      const currentMonthIdx = new Date().getMonth();
      
      // If it's January (index 0), allow startYear to go back to previous year to check December
      const startYear = targetYear ? targetYear : (full ? 2001 : (currentMonthIdx === 0 ? currentYear - 1 : currentYear));
      const endYear = targetYear ? targetYear : currentYear;
      
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      for (let y = endYear; y >= startYear; y--) {
        for (let mIdx = months.length - 1; mIdx >= 0; mIdx--) {
          // If not full sync, only scrape current month (or previous month if in first 3 days of month)
          if (!full && !targetYear) {
            const nowDay = new Date().getDate();
            if (y === currentYear) {
              if (mIdx !== currentMonthIdx && !(nowDay <= 3 && mIdx === currentMonthIdx - 1)) {
                continue;
              }
            } else if (y === currentYear - 1 && currentMonthIdx === 0 && mIdx === 11 && nowDay <= 3) {
              // Allow Dec of previous year on first 3 days of Jan
            } else {
              continue;
            }
          }
          const month = months[mIdx];
          const monthDraws = await scrapePlayWheMonth(month, y, sid);
          
          if (monthDraws.length > 0) {
            const batchStmts = monthDraws.map(d => ({
              sql: `INSERT OR IGNORE INTO playwhe_draws (draw_number, draw_date, draw_time_slot, winning_number) VALUES (?, ?, ?, ?)`,
              args: [d.draw_number, d.draw_date, d.draw_time_slot, d.winning_number]
            }));
            await db.batch(batchStmts);
            drawsAdded += monthDraws.length;
          }
        }
      }
    } catch (playWheScrapeErr: any) {
      console.warn("[PlayWhe] Official scrape error (falling back to REST API):", playWheScrapeErr.message);
    }

    // 2. High-Speed Secondary REST API Fallback (Railway)
    try {
      const restRes = await fetchWithRetry("https://backend-production-412b.up.railway.app/api/playwhe/results/latest-date");
      if (restRes.ok) {
        const items = await restRes.json();
        const list = Array.isArray(items) ? items : [items];
        for (const item of list) {
          if (item && item.draw_number && item.main_number !== undefined) {
            const dDate = item.draw_date ? item.draw_date.split("T")[0] : "";
            const slot = (item.draw_period || item.draw_time || "MORNING").trim();
            const res = await db.execute({
              sql: `INSERT OR IGNORE INTO playwhe_draws (draw_number, draw_date, draw_time_slot, winning_number) VALUES (?, ?, ?, ?)`,
              args: [item.draw_number, dDate, slot, item.main_number]
            });
            if (res.rowsAffected > 0) {
              drawsAdded++;
            }
          }
        }
      }
    } catch (e: any) {
      console.warn("[PlayWhe] REST API fallback notice:", e.message);
    }

    // 3. Live HTML Portal Fallback (nlcblottoresult.com)
    try {
      const liveDraws = await scrapePlayWheLivePortal();
      for (const item of liveDraws) {
        if (item && item.draw_number) {
          const res = await db.execute({
            sql: `INSERT OR IGNORE INTO playwhe_draws (draw_number, draw_date, draw_time_slot, winning_number) VALUES (?, ?, ?, ?)`,
            args: [item.draw_number, item.draw_date, item.draw_time_slot, item.winning_number]
          });
          if (res.rowsAffected > 0) {
            drawsAdded++;
          }
        }
      }
    } catch (liveErr: any) {
      console.warn("[PlayWhe] Live Portal fallback notice:", liveErr.message);
    }
    
    return { success: true, drawsAdded, details: `Play Whe sync complete. ${drawsAdded} draws added/updated.` };
  } catch (error: any) {
    console.error("Play Whe sync error in JS:", error);
    return { success: false, drawsAdded, details: error.message };
  }
}

// === WIN FOR LIFE SCRAPING ENGINE ===

const WINFORLIFE_URL = "https://www.nlcbplaywhelotto.com/nlcb-win-for-life-results/";

export async function scrapeWinForLifeSid(): Promise<string | null> {
  try {
    const res = await fetchWithRetry(getScrapeUrl(WINFORLIFE_URL));
    if (!res.ok) throw new Error(`Failed to load page: ${res.statusText}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    return $('input[name="sid"]').val() as string || null;
  } catch (error) {
    console.error("Error fetching Win for Life sid:", error);
    return null;
  }
}

export async function scrapeWinForLifeMonth(monthStr: string, yearVal: number, sid: string | null): Promise<any[]> {
  try {
    const formData = new URLSearchParams();
    formData.append("search_month", monthStr);
    formData.append("search_year", yearVal.toString());
    formData.append("date_btn", "SEARCH");
    if (sid) {
      formData.append("sid", sid);
    }
    
    const res = await fetchWithRetry(getScrapeUrl(WINFORLIFE_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    
    if (!res.ok) throw new Error(`POST failed for Win for Life ${monthStr} ${yearVal}: ${res.statusText}`);
    
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const table = $("#monthResults");
    if (!table.length) return [];
    
    const tbody = table.find("tbody").length ? table.find("tbody") : table;
    const rows = tbody.find("tr");
    
    const draws: any[] = [];
    let currentDate = "";
    
    rows.each((_, row) => {
      const $row = $(row);
      const tds = $row.find("td, th");
      const text = $row.text().trim();
      const dateMatch = text.match(/(\d{1,2}-[A-Za-z]{3}-\d{2,4})/);

      if (dateMatch && tds.length <= 2) {
        const rawDate = dateMatch[1];
        currentDate = parseDate(rawDate);
      } else if ($row.hasClass("lotto-date-tr")) {
        const dateText = $row.find("strong").text().trim();
        currentDate = parseDate(dateText);
      } else if (tds.length >= 3) {
        try {
          const drawNum = parseInt($(tds[0]).text().trim());
          const numsStr = $(tds[1]).text().trim();
          const nums = numsStr.split(/[\s-]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n)).sort((a, b) => a - b);
          const cb = parseInt($(tds[2]).text().trim());
          
          const jackpot = tds.length >= 4 ? $(tds[3]).text().trim() : "X";
          
          if (isNaN(drawNum) || nums.length < 6 || isNaN(cb) || !currentDate) return;

          draws.push({
            draw_number: drawNum,
            draw_date: currentDate,
            num1: nums[0],
            num2: nums[1],
            num3: nums[2],
            num4: nums[3],
            num5: nums[4],
            num6: nums[5],
            cash_ball: cb,
            jackpot: jackpot || "X"
          });
        } catch (e) {
          console.error("Error parsing Win for Life row in JS:", e);
        }
      }
    });
    
    return draws;
  } catch (error) {
    console.error(`Error scraping monthly Win for Life draws for ${monthStr} ${yearVal} in JS:`, error);
    return [];
  }
}

export async function saveWinForLifeDraw(draw: any): Promise<void> {
  const sql = `
    INSERT OR IGNORE INTO winforlife_draws (draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball, jackpot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const args = [
    draw.draw_number,
    draw.draw_date,
    draw.num1,
    draw.num2,
    draw.num3,
    draw.num4,
    draw.num5,
    draw.num6,
    draw.cash_ball,
    draw.jackpot
  ];
  await db.execute({ sql, args });
}

export async function syncWinForLife(full: boolean = false, targetYear?: number): Promise<{ success: boolean; drawsAdded: number; details: string }> {
  let drawsAdded = 0;
  try {
    // Initialize winforlife_draws table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS winforlife_draws (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        draw_number INTEGER UNIQUE,
        draw_date TEXT NOT NULL,
        num1 INTEGER NOT NULL,
        num2 INTEGER NOT NULL,
        num3 INTEGER NOT NULL,
        num4 INTEGER NOT NULL,
        num5 INTEGER NOT NULL,
        num6 INTEGER NOT NULL,
        cash_ball INTEGER NOT NULL,
        jackpot TEXT
      )
    `);

    // 1. Official HTML Scrape
    try {
      const sid = await scrapeWinForLifeSid();
      if (!sid) {
        console.warn("WARNING: Could not retrieve CSRF sid token for Win for Life. Sync proceeding...");
      }
      
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentYear = new Date().getFullYear();
      const currentMonthIdx = new Date().getMonth();
      
      const startYear = targetYear ? targetYear : (full ? 2022 : (currentMonthIdx === 0 ? currentYear - 1 : currentYear));
      const endYear = targetYear ? targetYear : currentYear;
      
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      for (let y = endYear; y >= startYear; y--) {
        for (let mIdx = months.length - 1; mIdx >= 0; mIdx--) {
          // If not full sync, only scrape current month (or previous month if in first 3 days of month)
          if (!full && !targetYear) {
            const nowDay = new Date().getDate();
            if (y === currentYear) {
              if (mIdx !== currentMonthIdx && !(nowDay <= 3 && mIdx === currentMonthIdx - 1)) {
                continue;
              }
            } else if (y === currentYear - 1 && currentMonthIdx === 0 && mIdx === 11 && nowDay <= 3) {
              // Allow Dec of previous year on first 3 days of Jan
            } else {
              continue;
            }
          }
          const month = months[mIdx];
          const monthDraws = await scrapeWinForLifeMonth(month, y, sid);
          
          if (monthDraws.length > 0) {
            const batchStmts = monthDraws.map(d => ({
              sql: `INSERT OR IGNORE INTO winforlife_draws (draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball, jackpot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [d.draw_number, d.draw_date, d.num1, d.num2, d.num3, d.num4, d.num5, d.num6, d.cash_ball, d.jackpot || ""]
            }));
            await db.batch(batchStmts);
            drawsAdded += monthDraws.length;
          }
        }
      }
    } catch (winForLifeScrapeErr: any) {
      console.warn("[WinForLife] Official scrape error (falling back to REST API):", winForLifeScrapeErr.message);
    }

    // 2. High-Speed Secondary REST API Fallback (Railway)
    try {
      const restRes = await fetchWithRetry("https://backend-production-412b.up.railway.app/api/winforlife/results/latest-date");
      if (restRes.ok) {
        const items = await restRes.json();
        const list = Array.isArray(items) ? items : [items];
        for (const item of list) {
          if (item && item.draw_number) {
            const dDate = item.draw_date ? item.draw_date.split("T")[0] : "";
            const nums = [item.number1, item.number2, item.number3, item.number4, item.number5, item.number6].sort((a: number, b: number) => a - b);
            const res = await db.execute({
              sql: `INSERT OR IGNORE INTO winforlife_draws (draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball, jackpot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [item.draw_number, dDate, nums[0], nums[1], nums[2], nums[3], nums[4], nums[5], item.cash_ball || 0, ""]
            });
            if (res.rowsAffected > 0) {
              drawsAdded++;
            }
          }
        }
      }
    } catch (e: any) {
      console.warn("[WinForLife] REST API fallback notice:", e.message);
    }
    
    return { success: true, drawsAdded, details: `Win for Life sync complete. ${drawsAdded} draws added.` };
  } catch (error: any) {
    console.error("Win for Life sync error in JS:", error);
    return { success: false, drawsAdded, details: error.message };
  }
}

// === CASHPOT SCRAPING & REST API ENGINE ===

export async function syncCashPot(full: boolean = false, targetYear?: number): Promise<{ success: boolean; drawsAdded: number; details: string }> {
  let drawsAdded = 0;
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS cashpot_draws (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        draw_number INTEGER UNIQUE,
        draw_date TEXT NOT NULL,
        num1 INTEGER NOT NULL,
        num2 INTEGER NOT NULL,
        num3 INTEGER NOT NULL,
        num4 INTEGER NOT NULL,
        num5 INTEGER NOT NULL,
        multiplier INTEGER
      )
    `);

    // 1. If not full sync, first fetch latest draw via fast REST endpoint
    if (!full && !targetYear) {
      try {
        const res = await fetchWithRetry("https://backend-production-412b.up.railway.app/api/cashpot/results/latest-date");
        if (res.ok) {
          const items = await res.json();
          const list = Array.isArray(items) ? items : [items];
          for (const item of list) {
            if (item && item.draw_number) {
              const dDate = item.draw_date ? item.draw_date.split("T")[0] : "";
              const nums = [item.number1, item.number2, item.number3, item.number4, item.number5].sort((a: number, b: number) => a - b);
              await db.execute({
                sql: `INSERT OR IGNORE INTO cashpot_draws (draw_number, draw_date, num1, num2, num3, num4, num5, multiplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [item.draw_number, dDate, nums[0], nums[1], nums[2], nums[3], nums[4], item.multiplier || 1]
              });
              drawsAdded++;
            }
          }
        }
      } catch (err) {
        console.warn("[CashPot] Latest-date fetch warning:", err);
      }
    }

    // 2. Fetch monthly archive (current month or historical range)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const startYear = targetYear ? targetYear : (full ? 2022 : currentYear);
    const endYear = targetYear ? targetYear : currentYear;

    for (let y = endYear; y >= startYear; y--) {
      const maxMonth = (y === currentYear) ? currentMonth : 12;
      const minMonth = (!full && !targetYear && y === currentYear) ? Math.max(1, currentMonth - 1) : 1;

      for (let m = maxMonth; m >= minMonth; m--) {
        const mStr = String(m).padStart(2, "0");
        try {
          const res = await fetchWithRetry(`https://backend-production-412b.up.railway.app/api/cashpot/results/by-month-year/${y}/${mStr}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const batch = data.map((d: any) => {
                const nums = [d.number1, d.number2, d.number3, d.number4, d.number5].sort((a: number, b: number) => a - b);
                const dDate = d.draw_date ? d.draw_date.split("T")[0] : "";
                return {
                  sql: `INSERT OR IGNORE INTO cashpot_draws (draw_number, draw_date, num1, num2, num3, num4, num5, multiplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  args: [d.draw_number, dDate, nums[0], nums[1], nums[2], nums[3], nums[4], d.multiplier || 1]
                };
              });
              await db.batch(batch);
              drawsAdded += data.length;
            }
          }
        } catch (e) {
          console.warn(`[CashPot] Month ${y}-${mStr} sync notice:`, e);
        }
      }
    }

    return { success: true, drawsAdded, details: `Cash Pot sync complete. ${drawsAdded} records processed.` };
  } catch (error: any) {
    console.error("Cash Pot sync error:", error);
    return { success: false, drawsAdded, details: error.message };
  }
}

// Helper for official Pick 4 HTML scraping
const PICK4_OFFICIAL_URL = "https://www.nlcbplaywhelotto.com/nlcb-pick-4-results/";

// === PICK 4 LIVE PORTAL SCRAPER (nlcblottoresult.com) ===
export async function scrapePick4LivePortal(): Promise<any[]> {
  try {
    const res = await fetchWithRetry("https://nlcblottoresult.com/nlcb-pick-4-results/");
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const t0 = $('table').eq(0);
    const text = t0.text();
    const today = new Date().toISOString().split("T")[0];

    const draws: any[] = [];
    const slots = ['Morning', 'Midday', 'Afternoon', 'Evening'];
    for (const slot of slots) {
      const re = new RegExp(slot + '\\s+Draw\\s+#(\\d+)[\\s\\S]*?Verified[\\s\\S]*?(\\d)\\s+(\\d)\\s+(\\d)\\s+(\\d)', 'i');
      const m = text.match(re);
      if (m) {
        draws.push({
          draw_number: parseInt(m[1], 10),
          draw_date: today,
          draw_time_slot: slot.toUpperCase(),
          digit1: parseInt(m[2], 10),
          digit2: parseInt(m[3], 10),
          digit3: parseInt(m[4], 10),
          digit4: parseInt(m[5], 10)
        });
      }
    }
    return draws;
  } catch (err: any) {
    console.warn("[Pick4] Live portal scrape notice:", err.message);
    return [];
  }
}

export async function scrapePick4Sid(): Promise<string | null> {
  try {
    const res = await fetchWithRetry(getScrapeUrl(PICK4_OFFICIAL_URL));
    if (!res.ok) throw new Error(`Failed to load Pick 4 page: ${res.statusText}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    return $('input[name="sid"]').val() as string || null;
  } catch (error) {
    console.error("Error fetching Pick 4 sid:", error);
    return null;
  }
}

export async function scrapePick4MonthOfficial(monthStr: string, yearVal: number, sid: string | null): Promise<any[]> {
  try {
    const formData = new URLSearchParams();
    formData.append("search_month", monthStr);
    formData.append("search_year", yearVal.toString());
    formData.append("date_btn", "SEARCH");
    if (sid) {
      formData.append("sid", sid);
    }

    const res = await fetchWithRetry(getScrapeUrl(PICK4_OFFICIAL_URL), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const table = $("table");
    if (!table.length) return [];

    const draws: any[] = [];
    const rows = table.find("tr");

    rows.each((_, row) => {
      const tds = $(row).find("td, th");
      if (tds.length < 7) return;

      const firstText = $(tds[0]).text().trim();
      if (firstText.toLowerCase().includes("draw")) return;

      try {
        const drawNum = parseInt(firstText);
        const rawDate = $(tds[1]).text().trim();
        const drawDate = parseDate(rawDate);
        const drawTimeSlot = $(tds[2]).text().trim().toUpperCase();
        const d1 = parseInt($(tds[3]).text().trim());
        const d2 = parseInt($(tds[4]).text().trim());
        const d3 = parseInt($(tds[5]).text().trim());
        const d4 = parseInt($(tds[6]).text().trim());

        if (isNaN(drawNum) || isNaN(d1) || isNaN(d2) || isNaN(d3) || isNaN(d4)) return;

        draws.push({
          draw_number: drawNum,
          draw_date: drawDate,
          draw_time_slot: drawTimeSlot,
          digit1: d1,
          digit2: d2,
          digit3: d3,
          digit4: d4
        });
      } catch (e) {}
    });

    return draws;
  } catch (error) {
    console.error(`Error scraping official Pick 4 month ${monthStr} ${yearVal}:`, error);
    return [];
  }
}

export async function syncPick4(full: boolean = false, targetYear?: number): Promise<{ success: boolean; drawsAdded: number; details: string }> {
  let drawsAdded = 0;
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pick4_draws (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        draw_number INTEGER UNIQUE,
        draw_date TEXT NOT NULL,
        draw_time_slot TEXT NOT NULL,
        digit1 INTEGER NOT NULL,
        digit2 INTEGER NOT NULL,
        digit3 INTEGER NOT NULL,
        digit4 INTEGER NOT NULL
      )
    `);

    // 1. Primary Scrape: Direct from official NLCB portal (nlcbplaywhelotto.com) for real-time results
    try {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentYear = new Date().getFullYear();
      const currentMonthIdx = new Date().getMonth();

      const sid = await scrapePick4Sid();
      const currentMonthStr = months[currentMonthIdx];
      const officialDraws = await scrapePick4MonthOfficial(currentMonthStr, currentYear, sid);

      if (officialDraws && officialDraws.length > 0) {
        const batch = officialDraws.map(d => ({
          sql: `INSERT OR IGNORE INTO pick4_draws (draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [d.draw_number, d.draw_date, d.draw_time_slot, d.digit1, d.digit2, d.digit3, d.digit4]
        }));
        await db.batch(batch);
        drawsAdded += officialDraws.length;
      }
    } catch (officialErr: any) {
      console.warn("[Pick4] Official scrape notice (falling back to REST API):", officialErr.message);
    }

    // 2. Secondary Scrape: Fast REST endpoint fallback
    if (!full && !targetYear) {
      try {
        const res = await fetchWithRetry("https://backend-production-412b.up.railway.app/api/pick4/results/latest-date");
        if (res.ok) {
          const items = await res.json();
          const list = Array.isArray(items) ? items : [items];
          for (const item of list) {
            if (item && item.draw_number) {
              const dDate = item.draw_date ? item.draw_date.split("T")[0] : "";
              const slot = (item.draw_period || item.draw_time || "MORNING").toUpperCase();
              await db.execute({
                sql: `INSERT OR IGNORE INTO pick4_draws (draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: [item.draw_number, dDate, slot, item.number1, item.number2, item.number3, item.number4]
              });
              drawsAdded++;
            }
          }
        }
      } catch (err) {
        console.warn("[Pick4] Latest-date fetch warning:", err);
      }

      // 2.5. Live HTML Portal Fallback (nlcblottoresult.com)
      try {
        const liveDraws = await scrapePick4LivePortal();
        for (const item of liveDraws) {
          if (item && item.draw_number) {
            const res = await db.execute({
              sql: `INSERT OR IGNORE INTO pick4_draws (draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              args: [item.draw_number, item.draw_date, item.draw_time_slot, item.digit1, item.digit2, item.digit3, item.digit4]
            });
            if (res.rowsAffected > 0) {
              drawsAdded++;
            }
          }
        }
      } catch (liveErr: any) {
        console.warn("[Pick4] Live portal fallback notice:", liveErr.message);
      }
    }

    // 3. Historical Archive Scrape (for full sync or multi-month historical backfills)
    if (full || targetYear) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const startYear = targetYear ? targetYear : 2022;
      const endYear = targetYear ? targetYear : currentYear;

      for (let y = endYear; y >= startYear; y--) {
        const maxMonth = (y === currentYear) ? currentMonth : 12;
        const minMonth = 1;

        for (let m = maxMonth; m >= minMonth; m--) {
          const mStr = String(m).padStart(2, "0");
          try {
            const res = await fetchWithRetry(`https://backend-production-412b.up.railway.app/api/pick4/results/by-month-year/${y}/${mStr}`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                const batch = data.map((d: any) => {
                  const dDate = d.draw_date ? d.draw_date.split("T")[0] : "";
                  const slot = (d.draw_period || d.draw_time || "MORNING").toUpperCase();
                  return {
                    sql: `INSERT OR IGNORE INTO pick4_draws (draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    args: [d.draw_number, dDate, slot, d.number1, d.number2, d.number3, d.number4]
                  };
                });
                await db.batch(batch);
                drawsAdded += data.length;
              }
            }
          } catch (e) {
            console.warn(`[Pick4] Month ${y}-${mStr} sync notice:`, e);
          }
        }
      }
    }

    return { success: true, drawsAdded, details: `Pick 4 sync complete. ${drawsAdded} records processed.` };
  } catch (error: any) {
    console.error("Pick 4 sync error:", error);
    return { success: false, drawsAdded, details: error.message };
  }
}


