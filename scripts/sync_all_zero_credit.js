const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { createClient } = require("@libsql/client");

function loadEnv() {
  const envPaths = [".env.production.local", ".env.local", ".env.production", ".env"];
  const envVars = {};
  for (const file of envPaths) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      content.split(/\r?\n/).forEach(line => {
        if (line.trim().startsWith("#") || !line.includes("=")) return;
        const [key, ...valParts] = line.split("=");
        let value = valParts.join("=").trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[key.trim()] = value;
      });
      break;
    }
  }
  return envVars;
}

const env = loadEnv();
const dbUrl = process.env.TURSO_DATABASE_URL || env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN || env.TURSO_AUTH_TOKEN;

const db = createClient({
  url: dbUrl,
  authToken: dbToken
});

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(6000) });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn(`[REST API] Notice for ${url}:`, e.message);
  }
  return null;
}

async function fetchHtml(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(6000) });
    if (res.ok) return await res.text();
  } catch (e) {
    console.warn(`[HTML Scrape] Notice for ${url}:`, e.message);
  }
  return null;
}

function parseDate(dateStr) {
  const cleanStr = dateStr.replace("DATE:", "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) return cleanStr;

  const spaceParts = cleanStr.split(/\s+/);
  if (spaceParts.length === 3 && isNaN(Number(spaceParts[1]))) {
    const day = spaceParts[0].padStart(2, "0");
    const monthRaw = spaceParts[1].toLowerCase().slice(0, 3);
    const year = spaceParts[2].length === 2 ? "20" + spaceParts[2] : spaceParts[2];
    const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
    return `${year}-${months[monthRaw] || "01"}-${day}`;
  }

  const parts = cleanStr.split("-");
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const monthRaw = parts[1].trim().toLowerCase().slice(0, 3);
    let year = parts[2].trim();
    if (year.length === 2) year = "20" + year;
    const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
    return `${year}-${months[monthRaw] || "01"}-${day}`;
  }
  return cleanStr;
}

async function runZeroCreditSync() {
  console.log("=================================================");
  console.log("🚀 STARTING ZERO-CREDIT MULTI-GAME SYNC ENGINE");
  console.log("Database target:", dbUrl);
  console.log("=================================================\n");

  let totalAdded = 0;

  // 1. PLAY WHE
  console.log("--- 1. SYNCING PLAY WHE ---");
  let pwAdded = 0;
  // 1a. Railway REST API latest-date
  const pwLatest = await fetchJson("https://backend-production-412b.up.railway.app/api/playwhe/results/latest-date");
  if (pwLatest) {
    const list = Array.isArray(pwLatest) ? pwLatest : [pwLatest];
    for (const d of list) {
      if (d && d.draw_number && d.main_number !== undefined) {
        const dDate = d.draw_date ? d.draw_date.split("T")[0] : "";
        const slot = (d.draw_period || d.draw_time || "MORNING").trim();
        const r = await db.execute({
          sql: "INSERT OR IGNORE INTO playwhe_draws (draw_number, draw_date, draw_time_slot, winning_number) VALUES (?, ?, ?, ?)",
          args: [d.draw_number, dDate, slot, d.main_number]
        });
        if (r.rowsAffected > 0) pwAdded++;
      }
    }
  }

  // 1b. Railway REST API September 2026
  const pwMonth = await fetchJson("https://backend-production-412b.up.railway.app/api/playwhe/results/by-month-year/2026/09");
  if (Array.isArray(pwMonth)) {
    for (const d of pwMonth) {
      if (d && d.draw_number && d.main_number !== undefined) {
        const dDate = d.draw_date ? d.draw_date.split("T")[0] : "";
        const slot = (d.draw_period || d.draw_time || "MORNING").trim();
        const r = await db.execute({
          sql: "INSERT OR IGNORE INTO playwhe_draws (draw_number, draw_date, draw_time_slot, winning_number) VALUES (?, ?, ?, ?)",
          args: [d.draw_number, dDate, slot, d.main_number]
        });
        if (r.rowsAffected > 0) pwAdded++;
      }
    }
  }

  // 1c. Live Portal Table 0 (Today)
  const pwHtml = await fetchHtml("https://nlcblottoresult.com/");
  if (pwHtml) {
    const $ = cheerio.load(pwHtml);
    const text = $('table').eq(0).text();
    const today = new Date().toISOString().split("T")[0];
    const slots = [
      { name: 'Morning', re: /Morning\s+Draw\s+#(\d+)[\s\S]*?Verified\s*(\d{1,2})/i },
      { name: 'Midday', re: /(?:Midday|Middy)\s+Draw\s+#(\d+)[\s\S]*?Verified\s*(\d{1,2})/i },
      { name: 'Afternoon', re: /Afternoon\s+Draw\s+#(\d+)[\s\S]*?Verified\s*(\d{1,2})/i },
      { name: 'Evening', re: /Evening\s+Draw\s+#(\d+)[\s\S]*?Verified\s*(\d{1,2})/i }
    ];
    for (const s of slots) {
      const m = text.match(s.re);
      if (m) {
        const drawNum = parseInt(m[1], 10);
        const winNum = parseInt(m[2], 10);
        if (!isNaN(drawNum) && !isNaN(winNum) && winNum >= 1 && winNum <= 36) {
          const r = await db.execute({
            sql: "INSERT OR IGNORE INTO playwhe_draws (draw_number, draw_date, draw_time_slot, winning_number) VALUES (?, ?, ?, ?)",
            args: [drawNum, today, s.name, winNum]
          });
          if (r.rowsAffected > 0) {
            pwAdded++;
            console.log(`[Play Whe Live] Added #${drawNum} (${s.name}): ${winNum}`);
          }
        }
      }
    }
  }
  console.log(`Play Whe Sync Result: +${pwAdded} new draws.`);
  totalAdded += pwAdded;

  // 2. PICK 4
  console.log("\n--- 2. SYNCING PICK 4 ---");
  let p4Added = 0;
  // 2a. Railway latest-date
  const p4Latest = await fetchJson("https://backend-production-412b.up.railway.app/api/pick4/results/latest-date");
  if (p4Latest) {
    const list = Array.isArray(p4Latest) ? p4Latest : [p4Latest];
    for (const d of list) {
      if (d && d.draw_number) {
        const dDate = d.draw_date ? d.draw_date.split("T")[0] : "";
        const slot = (d.draw_period || d.draw_time || "MORNING").toUpperCase();
        const r = await db.execute({
          sql: "INSERT OR IGNORE INTO pick4_draws (draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [d.draw_number, dDate, slot, d.number1, d.number2, d.number3, d.number4]
        });
        if (r.rowsAffected > 0) p4Added++;
      }
    }
  }

  // 2b. Railway September 2026
  const p4Month = await fetchJson("https://backend-production-412b.up.railway.app/api/pick4/results/by-month-year/2026/09");
  if (Array.isArray(p4Month)) {
    for (const d of p4Month) {
      if (d && d.draw_number) {
        const dDate = d.draw_date ? d.draw_date.split("T")[0] : "";
        const slot = (d.draw_period || d.draw_time || "MORNING").toUpperCase();
        const r = await db.execute({
          sql: "INSERT OR IGNORE INTO pick4_draws (draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [d.draw_number, dDate, slot, d.number1, d.number2, d.number3, d.number4]
        });
        if (r.rowsAffected > 0) p4Added++;
      }
    }
  }

  // 2c. Live Portal Pick 4
  const p4Html = await fetchHtml("https://nlcblottoresult.com/nlcb-pick-4-results/");
  if (p4Html) {
    const $ = cheerio.load(p4Html);
    const text = $('table').eq(0).text();
    const today = new Date().toISOString().split("T")[0];
    const p4Slots = [
      { name: 'MORNING', re: /Morning\s+Draw\s+#(\d+)[\s\S]*?Verified\s*(\d)\s*(\d)\s*(\d)\s*(\d)/i },
      { name: 'MIDDAY', re: /(?:Midday|Middy)\s+Draw\s+#(\d+)[\s\S]*?Verified\s*(\d)\s*(\d)\s*(\d)\s*(\d)/i },
      { name: 'AFTERNOON', re: /Afternoon\s+Draw\s+#(\d+)[\s\S]*?Verified\s*(\d)\s*(\d)\s*(\d)\s*(\d)/i },
      { name: 'EVENING', re: /Evening\s+Draw\s+#(\d+)[\s\S]*?Verified\s*(\d)\s*(\d)\s*(\d)\s*(\d)/i }
    ];
    for (const s of p4Slots) {
      const m = text.match(s.re);
      if (m) {
        const drawNum = parseInt(m[1], 10);
        const r = await db.execute({
          sql: "INSERT OR IGNORE INTO pick4_draws (draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [drawNum, today, s.name, parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4], 10), parseInt(m[5], 10)]
        });
        if (r.rowsAffected > 0) {
          p4Added++;
          console.log(`[Pick 4 Live] Added #${drawNum} (${s.name}): ${m[2]}-${m[3]}-${m[4]}-${m[5]}`);
        }
      }
    }
  }
  console.log(`Pick 4 Sync Result: +${p4Added} new draws.`);
  totalAdded += p4Added;

  // 3. CASH POT
  console.log("\n--- 3. SYNCING CASH POT ---");
  let cpAdded = 0;
  const cpLatest = await fetchJson("https://backend-production-412b.up.railway.app/api/cashpot/results/latest-date");
  if (cpLatest) {
    const list = Array.isArray(cpLatest) ? cpLatest : [cpLatest];
    for (const d of list) {
      if (d && d.draw_number) {
        const dDate = d.draw_date ? d.draw_date.split("T")[0] : "";
        const nums = [d.number1, d.number2, d.number3, d.number4, d.number5].sort((a, b) => a - b);
        const r = await db.execute({
          sql: "INSERT OR IGNORE INTO cashpot_draws (draw_number, draw_date, num1, num2, num3, num4, num5, multiplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          args: [d.draw_number, dDate, nums[0], nums[1], nums[2], nums[3], nums[4], d.multiplier || 1]
        });
        if (r.rowsAffected > 0) cpAdded++;
      }
    }
  }

  const cpMonth = await fetchJson("https://backend-production-412b.up.railway.app/api/cashpot/results/by-month-year/2026/09");
  if (Array.isArray(cpMonth)) {
    for (const d of cpMonth) {
      if (d && d.draw_number) {
        const dDate = d.draw_date ? d.draw_date.split("T")[0] : "";
        const nums = [d.number1, d.number2, d.number3, d.number4, d.number5].sort((a, b) => a - b);
        const r = await db.execute({
          sql: "INSERT OR IGNORE INTO cashpot_draws (draw_number, draw_date, num1, num2, num3, num4, num5, multiplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          args: [d.draw_number, dDate, nums[0], nums[1], nums[2], nums[3], nums[4], d.multiplier || 1]
        });
        if (r.rowsAffected > 0) cpAdded++;
      }
    }
  }
  console.log(`Cash Pot Sync Result: +${cpAdded} new draws.`);
  totalAdded += cpAdded;

  // 4. LOTTO PLUS
  console.log("\n--- 4. SYNCING LOTTO PLUS ---");
  let lpAdded = 0;
  const lpLatest = await fetchJson("https://backend-production-412b.up.railway.app/api/lottoplus/results/latest-date");
  if (lpLatest) {
    const list = Array.isArray(lpLatest) ? lpLatest : [lpLatest];
    for (const d of list) {
      if (d && d.draw_number) {
        const dDate = d.draw_date ? d.draw_date.split("T")[0] : "";
        const nums = [d.number1, d.number2, d.number3, d.number4, d.number5].sort((a, b) => a - b);
        const mult = d.multiplier ? `${d.multiplier}x` : "1x";
        const r = await db.execute({
          sql: "INSERT OR IGNORE INTO draws (draw_number, draw_date, num1, num2, num3, num4, num5, powerball, multiplier, jackpot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: [d.draw_number, dDate, nums[0], nums[1], nums[2], nums[3], nums[4], d.powerball, mult, d.next_estimated_jackpot || ""]
        });
        if (r.rowsAffected > 0) lpAdded++;
      }
    }
  }

  const lpMonth = await fetchJson("https://backend-production-412b.up.railway.app/api/lottoplus/results/by-month-year/2026/09");
  if (Array.isArray(lpMonth)) {
    for (const d of lpMonth) {
      if (d && d.draw_number) {
        const dDate = d.draw_date ? d.draw_date.split("T")[0] : "";
        const nums = [d.number1, d.number2, d.number3, d.number4, d.number5].sort((a, b) => a - b);
        const mult = d.multiplier ? `${d.multiplier}x` : "1x";
        const r = await db.execute({
          sql: "INSERT OR IGNORE INTO draws (draw_number, draw_date, num1, num2, num3, num4, num5, powerball, multiplier, jackpot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: [d.draw_number, dDate, nums[0], nums[1], nums[2], nums[3], nums[4], d.powerball, mult, d.next_estimated_jackpot || ""]
        });
        if (r.rowsAffected > 0) lpAdded++;
      }
    }
  }

  const lpHtml = await fetchHtml("https://nlcblottoresult.com/nlcb-lotto-plus-results/");
  if (lpHtml) {
    const $ = cheerio.load(lpHtml);
    $('table').eq(0).find('tr').slice(1).each(async (_, row) => {
      const text = $(row).text().replace(/\s+/g, ' ').trim();
      const m = text.match(/(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+([\d,\s]+)\s*:\s*(\d+)\s+(\d+x)/i);
      if (m) {
        const dDate = parseDate(m[1]);
        const nums = m[2].split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)).sort((a, b) => a - b);
        const pb = parseInt(m[3]);
        const mult = m[4];
        if (nums.length === 5) {
          const check = await db.execute({ sql: "SELECT 1 FROM draws WHERE draw_date = ?", args: [dDate] });
          if (check.rows.length === 0) {
            const maxRes = await db.execute("SELECT MAX(draw_number) as max_num FROM draws");
            const nextDrawNum = (Number(maxRes.rows[0]?.max_num) || 2568) + 1;
            const r = await db.execute({
              sql: "INSERT OR IGNORE INTO draws (draw_number, draw_date, num1, num2, num3, num4, num5, powerball, multiplier, jackpot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              args: [nextDrawNum, dDate, nums[0], nums[1], nums[2], nums[3], nums[4], pb, mult, ""]
            });
            if (r.rowsAffected > 0) lpAdded++;
          }
        }
      }
    });
  }
  console.log(`Lotto Plus Sync Result: +${lpAdded} new draws.`);
  totalAdded += lpAdded;

  // 5. WIN FOR LIFE
  console.log("\n--- 5. SYNCING WIN FOR LIFE ---");
  let wflAdded = 0;
  const wflLatest = await fetchJson("https://backend-production-412b.up.railway.app/api/winforlife/results/latest-date");
  if (wflLatest) {
    const list = Array.isArray(wflLatest) ? wflLatest : [wflLatest];
    for (const d of list) {
      if (d && d.draw_number) {
        const dDate = d.draw_date ? d.draw_date.split("T")[0] : "";
        const nums = [d.number1, d.number2, d.number3, d.number4, d.number5, d.number6].sort((a, b) => a - b);
        const r = await db.execute({
          sql: "INSERT OR IGNORE INTO winforlife_draws (draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball, jackpot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: [d.draw_number, dDate, nums[0], nums[1], nums[2], nums[3], nums[4], nums[5], d.cash_ball || 0, ""]
        });
        if (r.rowsAffected > 0) wflAdded++;
      }
    }
  }

  const wflMonth = await fetchJson("https://backend-production-412b.up.railway.app/api/winforlife/results/by-month-year/2026/09");
  if (Array.isArray(wflMonth)) {
    for (const d of wflMonth) {
      if (d && d.draw_number) {
        const dDate = d.draw_date ? d.draw_date.split("T")[0] : "";
        const nums = [d.number1, d.number2, d.number3, d.number4, d.number5, d.number6].sort((a, b) => a - b);
        const r = await db.execute({
          sql: "INSERT OR IGNORE INTO winforlife_draws (draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball, jackpot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: [d.draw_number, dDate, nums[0], nums[1], nums[2], nums[3], nums[4], nums[5], d.cash_ball || 0, ""]
        });
        if (r.rowsAffected > 0) wflAdded++;
      }
    }
  }

  console.log(`Win For Life Sync Result: +${wflAdded} new draws.`);
  totalAdded += wflAdded;

  console.log("\n=================================================");
  console.log(`✅ SYNC COMPLETE! Total new draws inserted: ${totalAdded}`);
  console.log("=================================================\n");
}

runZeroCreditSync().catch(err => {
  console.error("Fatal sync error:", err);
  process.exit(1);
});
