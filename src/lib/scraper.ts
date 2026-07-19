import * as cheerio from "cheerio";
import { db } from "./db";

const BASE_URL = "https://www.nlcbplaywhelotto.com/nlcb-lotto-plus-results/";

function getScrapeUrl(url: string): string {
  const apiKey = process.env.SCRAPER_API_KEY;
  if (apiKey) {
    return `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;
  }
  return url;
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

// Standardize date: "11-Jul-26" -> "2026-07-11"
export function parseDate(dateStr: string): string {
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

// Scrape Homepage to get latest draw & active CSRF token (sid)
export async function scrapeHomepage(): Promise<{ latestDraw: any | null, sid: string | null }> {
  try {
    const res = await fetch(getScrapeUrl(BASE_URL), { 
      headers: HEADERS,
      signal: AbortSignal.timeout(30000)
    });
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
    
    const res = await fetch(getScrapeUrl(BASE_URL), {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(30000)
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
        // If not full sync, limit to current month and previous month (handling January/December crossover)
        if (!full && !targetYear) {
          if (y === currentYear) {
            if (mIdx > currentMonthIdx || (mIdx < currentMonthIdx - 1 && currentMonthIdx > 0)) {
              continue;
            }
          } else if (y === currentYear - 1 && currentMonthIdx === 0 && mIdx === 11) {
            // Allow December of previous year when we are in January
          } else {
            continue;
          }
        }
        const month = months[mIdx];
        const monthDraws = await scrapeMonth(month, y, sid);
        
        for (const draw of monthDraws) {
          const check = await db.execute({
            sql: "SELECT 1 FROM draws WHERE draw_number = ?",
            args: [draw.draw_number]
          });
          if (check.rows.length === 0) {
            await saveDraw(draw);
            drawsAdded++;
          }
        }
        
        await sleep(400); // Be polite to avoid rate limits
      }
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
    const res = await fetch(getScrapeUrl(PLAYWHE_URL), { 
      headers: HEADERS,
      signal: AbortSignal.timeout(30000)
    });
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
    
    const res = await fetch(getScrapeUrl(PLAYWHE_URL), {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(30000)
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
      DROP TABLE IF EXISTS playwhe_predictions
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
        // If not full sync, limit to current month and previous month (handling January/December crossover)
        if (!full && !targetYear) {
          if (y === currentYear) {
            if (mIdx > currentMonthIdx || (mIdx < currentMonthIdx - 1 && currentMonthIdx > 0)) {
              continue;
            }
          } else if (y === currentYear - 1 && currentMonthIdx === 0 && mIdx === 11) {
            // Allow December of previous year when we are in January
          } else {
            continue;
          }
        }
        const month = months[mIdx];
        const monthDraws = await scrapePlayWheMonth(month, y, sid);
        
        for (const draw of monthDraws) {
          const check = await db.execute({
            sql: "SELECT 1 FROM playwhe_draws WHERE draw_number = ?",
            args: [draw.draw_number]
          });
          if (check.rows.length === 0) {
            await savePlayWheDraw(draw);
            drawsAdded++;
          }
        }
        
        await sleep(400); // Be polite to avoid rate limits
      }
    }
    
    return { success: true, drawsAdded, details: `Play Whe sync complete. ${drawsAdded} draws added/updated.` };
  } catch (error: any) {
    console.error("Play Whe sync error in JS:", error);
    return { success: false, drawsAdded, details: error.message };
  }
}
