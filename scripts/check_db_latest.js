const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envVars = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      if (line.trim().startsWith('#') || !line.includes('=')) return;
      const [key, ...val] = line.split('=');
      envVars[key.trim()] = val.join('=').trim();
    });
  }
  return envVars;
}

const env = loadEnv();
const db = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN
});

async function checkLatestInDb() {
  console.log("Checking Turso Database latest draws...");
  const queries = {
    "Lotto Plus (draws)": "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY draw_number DESC LIMIT 3",
    "Play Whe": "SELECT draw_number, draw_date, draw_time_slot, winning_number FROM playwhe_draws ORDER BY draw_number DESC LIMIT 5",
    "Cash Pot": "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, multiplier FROM cashpot_draws ORDER BY draw_number DESC LIMIT 3",
    "Win For Life": "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball FROM winforlife_draws ORDER BY draw_number DESC LIMIT 3",
    "Pick 4": "SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 FROM pick4_draws ORDER BY draw_number DESC LIMIT 5"
  };

  for (const [name, sql] of Object.entries(queries)) {
    try {
      const res = await db.execute(sql);
      console.log(`\n=== ${name} ===`);
      console.log(res.rows);
    } catch (e) {
      console.error(name, e.message);
    }
  }
}

checkLatestInDb();
