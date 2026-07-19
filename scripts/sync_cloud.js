const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { createClient } = require("@libsql/client");

// 1. Load Environment Variables from .env files
function loadEnv() {
  const envPaths = [
    ".env.production.local",
    ".env.local",
    ".env.production",
    ".env"
  ];
  const envVars = {};
  
  for (const file of envPaths) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      console.log(`[Env] Loading variables from: ${file}`);
      const content = fs.readFileSync(fullPath, "utf8");
      content.split(/\r?\n/).forEach(line => {
        // Skip comments and empty lines
        if (line.trim().startsWith("#") || !line.includes("=")) return;
        const [key, ...valParts] = line.split("=");
        let value = valParts.join("=").trim();
        // Strip quotes
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        envVars[key.trim()] = value;
      });
      break; // Stop at the first file found
    }
  }
  return envVars;
}

const env = loadEnv();
const dbUrl = process.env.TURSO_DATABASE_URL || env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN || env.TURSO_AUTH_TOKEN;

if (!dbUrl) {
  console.error("\n[Error] TURSO_DATABASE_URL is not set!");
  console.error("Please ensure you have configured it in your .env.local file.");
  process.exit(1);
}

console.log(`[Database] Connecting to: ${dbUrl.startsWith("file:") ? "local file" : "Turso Cloud (" + dbUrl + ")"}`);
const db = createClient({
  url: dbUrl,
  authToken: dbToken
});

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, win64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "max-age=0"
};

function getScrapeUrl(url) {
  const apiKey = process.env.SCRAPER_API_KEY || env.SCRAPER_API_KEY;
  if (apiKey) {
    return `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;
  }
  return url;
}

async function scrapeSid(url) {
  try {
    const res = await fetch(getScrapeUrl(url), { headers: HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    return $('input[name="sid"]').val() || null;
  } catch (e) {
    console.error("[Proxy] Error scraping sid token:", e);
    return null;
  }
}

async function scrapeLiveJackpot() {
  const url = "https://www.nlcbplaywhelotto.com/nlcb-lotto-plus-results/";
  try {
    const res = await fetch(getScrapeUrl(url), { headers: HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    return $("#jackpot").text().trim() || null;
  } catch (e) {
    console.error("[Proxy] Error scraping live jackpot:", e);
    return null;
  }
}

// Standardize dates
function parseLottoDate(dateStr) {
  const cleanStr = dateStr.replace("DATE:", "").trim();
  const parts = cleanStr.split("-");
  if (parts.length !== 3) return cleanStr;
  const day = parts[0].padStart(2, "0");
  const monthName = parts[1].toLowerCase();
  let year = parts[2];
  if (year.length === 2) year = "20" + year;

  const months = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    january: "01", february: "02", march: "03", april: "04", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12"
  };
  const month = months[monthName] || "01";
  return `${year}-${month}-${day}`;
}

async function scrapePlayWheMonth(month, year, sid) {
  const url = "https://www.nlcbplaywhelotto.com/nlcb-play-whe-results/";
  try {
    const formData = new URLSearchParams();
    formData.append("playwhe_month", month);
    formData.append("playwhe_year", year.toString());
    formData.append("dateBtn", "SEARCH");
    if (sid) {
      formData.append("sid", sid);
    }
    
    const res = await fetch(getScrapeUrl(url), {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const table = $("table");
    if (!table.length) return [];
    
    const draws = [];
    table.find("tr").each((_, row) => {
      const tds = $(row).find("td, th");
      if (tds.length < 4) return;
      const firstText = $(tds[0]).text().trim();
      if (firstText.includes("Draw") || firstText.includes("Draw#")) return;
      
      try {
        const drawNum = parseInt(firstText);
        const rawDate = $(tds[1]).text().trim();
        const drawDate = parseLottoDate(rawDate);
        const drawTimeSlot = $(tds[2]).text().trim();
        const rawMark = $(tds[3]).text().trim();
        const winningNumber = parseInt(rawMark.split(/\s+/)[0]);
        
        if (!isNaN(drawNum) && !isNaN(winningNumber)) {
          draws.push({ draw_number: drawNum, draw_date: drawDate, draw_time_slot: drawTimeSlot, winning_number: winningNumber });
        }
      } catch (e) {}
    });
    return draws;
  } catch (err) {
    console.error(`[Error] Play Whe scraping failed for ${month} ${year}:`, err.message);
    return [];
  }
}

async function scrapeLottoMonth(month, year, sid) {
  const url = "https://www.nlcbplaywhelotto.com/nlcb-lotto-plus-results/";
  try {
    const formData = new URLSearchParams();
    formData.append("lotto_month", month);
    formData.append("lotto_year", year.toString());
    formData.append("month_year_btn", "SEARCH");
    if (sid) {
      formData.append("sid", sid);
    }
    
    const res = await fetch(getScrapeUrl(url), {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const table = $("#monthResults");
    if (!table.length) return [];
    
    const draws = [];
    let currentDate = "";
    const tbody = table.find("tbody").length ? table.find("tbody") : table;
    
    tbody.find("tr").each((_, row) => {
      const $row = $(row);
      if ($row.hasClass("lotto-date-tr")) {
        currentDate = parseLottoDate($row.find("strong").text().trim());
      } else if ($row.hasClass("lotto-tr")) {
        const tds = $row.find("td");
        if (tds.length >= 4 && currentDate) {
          try {
            const drawNum = parseInt($(tds[0]).text().trim());
            const numsStr = $(tds[1]).text().trim();
            const nums = numsStr.split("-").map(n => parseInt(n.trim())).sort((a, b) => a - b);
            const pb = parseInt($(tds[2]).text().trim());
            let mult = $(tds[3]).text().replace(/\s+/g, "").trim().toLowerCase();
            if (mult && !mult.endsWith("x")) mult += "x";
            const jackpot = tds.length >= 5 ? $(tds[4]).text().trim() : "Unknown";
            
            if (!isNaN(drawNum) && nums.length >= 5) {
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
            }
          } catch (e) {}
        }
      }
    });
    return draws;
  } catch (err) {
    console.error(`[Error] Lotto scraping failed for ${month} ${year}:`, err.message);
    return [];
  }
}

async function main() {
  const currentYear = new Date().getFullYear();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  console.log("\n=== Starting Cloud Database Synchronizer ===");
  console.log(`Current Time: ${new Date().toLocaleString()}`);
  
  // 1. Initialize Tables
  console.log("\n[Database] Initializing tables if missing...");
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
    CREATE TABLE IF NOT EXISTS playwhe_draws (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draw_number INTEGER UNIQUE,
      draw_date TEXT NOT NULL,
      draw_time_slot TEXT NOT NULL,
      winning_number INTEGER NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
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
  
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Retrieve active CSRF tokens for both targets
  const playWheSid = await scrapeSid("https://www.nlcbplaywhelotto.com/nlcb-play-whe-results/");
  const lottoSid = await scrapeSid("https://www.nlcbplaywhelotto.com/nlcb-lotto-plus-results/");

  // 2. Play Whe Sync (Recent 4 Years)
  console.log("\n[Play Whe] Syncing draws (2023 - Present)...");
  let playWheAdded = 0;
  let playWheStop = false;
  for (let y = currentYear; y >= currentYear - 3; y--) {
    if (playWheStop) break;
    console.log(` -> Syncing Year ${y}...`);
    const startMonthIdx = (y === currentYear) ? new Date().getMonth() : months.length - 1;
    for (let mIdx = startMonthIdx; mIdx >= 0; mIdx--) {
      const month = months[mIdx];
      const draws = await scrapePlayWheMonth(month, y, playWheSid);
      
      if (draws.length > 0) {
        let allExist = true;
        for (const d of draws) {
          const check = await db.execute({
            sql: "SELECT 1 FROM playwhe_draws WHERE draw_number = ?",
            args: [d.draw_number]
          });
          if (check.rows.length === 0) {
            await db.execute({
              sql: "INSERT OR IGNORE INTO playwhe_draws (draw_number, draw_date, draw_time_slot, winning_number) VALUES (?, ?, ?, ?)",
              args: [d.draw_number, d.draw_date, d.draw_time_slot, d.winning_number]
            });
            playWheAdded++;
            allExist = false;
          }
        }
        if (allExist) {
          console.log(`[Play Whe] All draws for ${month} ${y} already exist. Database is up to date. Stopping sync.`);
          playWheStop = true;
          break;
        }
      }
      await sleep(1000); // Be polite to avoid rate limits
    }
  }
  console.log(`[Play Whe] Done! Added ${playWheAdded} new drawings.`);
  
  // 3. Lotto Plus Sync (Recent 4 Years)
  console.log("\n[Lotto Plus] Syncing draws (2023 - Present)...");
  
  // Scrape and update live estimated jackpot
  try {
    const liveJackpot = await scrapeLiveJackpot();
    if (liveJackpot) {
      console.log(`[Lotto Plus] Live Next Estimated Jackpot parsed: ${liveJackpot}`);
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('lotto_next_jackpot', ?)",
        args: [liveJackpot]
      });
    }
  } catch (err) {
    console.error("Error updating estimated jackpot settings:", err);
  }

  let lottoAdded = 0;
  let lottoStop = false;
  for (let y = currentYear; y >= currentYear - 3; y--) {
    if (lottoStop) break;
    console.log(` -> Syncing Year ${y}...`);
    const startMonthIdx = (y === currentYear) ? new Date().getMonth() : months.length - 1;
    for (let mIdx = startMonthIdx; mIdx >= 0; mIdx--) {
      const month = months[mIdx];
      const draws = await scrapeLottoMonth(month, y, lottoSid);
      
      if (draws.length > 0) {
        let allExist = true;
        for (const d of draws) {
          const check = await db.execute({
            sql: "SELECT 1 FROM draws WHERE draw_number = ?",
            args: [d.draw_number]
          });
          if (check.rows.length === 0) {
            await db.execute({
              sql: "INSERT OR IGNORE INTO draws (draw_number, draw_date, num1, num2, num3, num4, num5, powerball, multiplier, jackpot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              args: [d.draw_number, d.draw_date, d.num1, d.num2, d.num3, d.num4, d.num5, d.powerball, d.multiplier, d.jackpot]
            });
            lottoAdded++;
            allExist = false;
          }
        }
        if (allExist) {
          console.log(`[Lotto Plus] All draws for ${month} ${y} already exist. Database is up to date. Stopping sync.`);
          lottoStop = true;
          break;
        }
      }
      await sleep(1000); // Be polite to avoid rate limits
    }
  }
  console.log(`[Lotto Plus] Done! Added ${lottoAdded} new drawings.`);
  
  console.log("\n=== Cloud Sync Completed Successfully ===\n");
  process.exit(0);
}

main().catch(err => {
  console.error("\n[Error] Sync process failed:", err);
  process.exit(1);
});
