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
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "max-age=0"
};

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

async function scrapePlayWheMonth(month, year) {
  const url = "https://www.nlcbplaywhelotto.com/nlcb-play-whe-results/";
  try {
    const formData = new URLSearchParams();
    formData.append("playwhe_month", month);
    formData.append("playwhe_year", year.toString());
    formData.append("dateBtn", "SEARCH");
    
    const res = await fetch(url, {
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

async function scrapeLottoMonth(month, year) {
  const url = "https://www.nlcbplaywhelotto.com/nlcb-lotto-plus-results/";
  try {
    const formData = new URLSearchParams();
    formData.append("lotto_month", month);
    formData.append("lotto_year", year.toString());
    formData.append("month_year_btn", "SEARCH");
    
    const res = await fetch(url, {
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
  
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // 2. Play Whe Sync (Recent 4 Years)
  console.log("\n[Play Whe] Syncing draws (2023 - Present)...");
  let playWheAdded = 0;
  for (let y = currentYear; y >= currentYear - 3; y--) {
    console.log(` -> Syncing Year ${y}...`);
    for (let mIdx = months.length - 1; mIdx >= 0; mIdx--) {
      const month = months[mIdx];
      const draws = await scrapePlayWheMonth(month, y);
      
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
        }
      }
      await sleep(1000); // Be polite to avoid rate limits
    }
  }
  console.log(`[Play Whe] Done! Added ${playWheAdded} new drawings.`);
  
  // 3. Lotto Plus Sync (Recent 4 Years)
  console.log("\n[Lotto Plus] Syncing draws (2023 - Present)...");
  let lottoAdded = 0;
  for (let y = currentYear; y >= currentYear - 3; y--) {
    console.log(` -> Syncing Year ${y}...`);
    for (let mIdx = months.length - 1; mIdx >= 0; mIdx--) {
      const month = months[mIdx];
      const draws = await scrapeLottoMonth(month, y);
      
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
