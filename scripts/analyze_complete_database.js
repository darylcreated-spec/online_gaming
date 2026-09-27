const fs = require("fs");
const path = require("path");
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
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        envVars[key.trim()] = value;
      });
      break;
    }
  }
  return envVars;
}

const env = loadEnv();
const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });

async function analyze() {
  console.log("=== COMPREHENSIVE MATHEMATICAL DATABASE DECOMPOSITION ===");

  // 1. Check counts
  const tables = ['playwhe_draws', 'pick4_draws', 'cashpot_draws', 'draws', 'winforlife_draws', 'prediction_audits'];
  for (const t of tables) {
    const res = await client.execute(`SELECT COUNT(*) as c FROM ${t}`);
    console.log(`Table ${t}: ${res.rows[0].c} records`);
  }

  // 2. Play Whe Invariants (1-36)
  const pwRes = await client.execute("SELECT draw_number, draw_date, winning_number FROM playwhe_draws ORDER BY draw_number ASC");
  const pw = pwRes.rows.map(r => Number(r.winning_number));
  console.log(`\n--- PLAY WHE ANALYSIS (${pw.length} draws) ---`);
  let pwRepeats = 0;
  const pwFreq = Array(37).fill(0);
  const pwMarkov = Array.from({ length: 37 }, () => Array(37).fill(0));
  for (let i = 0; i < pw.length; i++) {
    pwFreq[pw[i]]++;
    if (i > 0) {
      if (pw[i] === pw[i - 1]) pwRepeats++;
      pwMarkov[pw[i - 1]][pw[i]]++;
    }
  }
  console.log(`Exact back-to-back repeats: ${pwRepeats} (${((pwRepeats / (pw.length - 1)) * 100).toFixed(2)}%)`);
  
  // 3. Pick 4 (4 digits)
  const p4Res = await client.execute("SELECT digit1, digit2, digit3, digit4 FROM pick4_draws ORDER BY draw_number ASC");
  console.log(`\n--- PICK 4 ANALYSIS (${p4Res.rows.length} draws) ---`);
  let p4SumInRange = 0;
  let p4AllDistinct = 0; // 24-way
  let p4OnePair = 0; // 12-way
  p4Res.rows.forEach(r => {
    const d = [Number(r.digit1), Number(r.digit2), Number(r.digit3), Number(r.digit4)];
    const sum = d.reduce((a, b) => a + b, 0);
    if (sum >= 12 && sum <= 25) p4SumInRange++;
    const set = new Set(d);
    if (set.size === 4) p4AllDistinct++;
    else if (set.size === 3) p4OnePair++;
  });
  console.log(`Sum in [12, 25]: ${((p4SumInRange / p4Res.rows.length) * 100).toFixed(2)}%`);
  console.log(`All 4 distinct (24-Way): ${((p4AllDistinct / p4Res.rows.length) * 100).toFixed(2)}%`);
  console.log(`One pair (12-Way): ${((p4OnePair / p4Res.rows.length) * 100).toFixed(2)}%`);

  // 4. Cash Pot (5 of 20, order does not matter)
  const cpRes = await client.execute("SELECT num1, num2, num3, num4, num5 FROM cashpot_draws ORDER BY draw_number ASC");
  console.log(`\n--- CASH POT ANALYSIS (${cpRes.rows.length} draws) ---`);
  let cpCarryovers = 0;
  let cpConsecutives = 0;
  let cpSumBands = 0;
  let cpOddEven23 = 0;
  let cpPrev = null;
  cpRes.rows.forEach(r => {
    const nums = [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    if (sum >= 40 && sum <= 65) cpSumBands++;
    const odds = nums.filter(n => n % 2 !== 0).length;
    if (odds === 2 || odds === 3) cpOddEven23++;
    let hasConsec = false;
    for (let i = 0; i < nums.length - 1; i++) {
      if (nums[i + 1] - nums[i] === 1) hasConsec = true;
    }
    if (hasConsec) cpConsecutives++;

    if (cpPrev) {
      const prevSet = new Set(cpPrev);
      const matches = nums.filter(n => prevSet.has(n));
      if (matches.length >= 1) cpCarryovers++;
    }
    cpPrev = nums;
  });
  console.log(`Carryover from prev draw (>=1 ball): ${((cpCarryovers / (cpRes.rows.length - 1)) * 100).toFixed(2)}%`);
  console.log(`Consecutive pair present: ${((cpConsecutives / cpRes.rows.length) * 100).toFixed(2)}%`);
  console.log(`Sum in [40, 65]: ${((cpSumBands / cpRes.rows.length) * 100).toFixed(2)}%`);
  console.log(`Parity 2:3 or 3:2: ${((cpOddEven23 / cpRes.rows.length) * 100).toFixed(2)}%`);

  // 5. Lotto Plus (5 of 35, order does not matter, NO Powerball)
  const lottoRes = await client.execute("SELECT num1, num2, num3, num4, num5 FROM draws ORDER BY draw_number ASC");
  console.log(`\n--- LOTTO PLUS ANALYSIS (${lottoRes.rows.length} draws) ---`);
  let lottoCarryovers = 0;
  let lottoConsecutives = 0;
  let lottoSumBands = 0;
  let lottoOddEven23 = 0;
  let lottoPrev = null;
  lottoRes.rows.forEach(r => {
    const nums = [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    if (sum >= 70 && sum <= 110) lottoSumBands++;
    const odds = nums.filter(n => n % 2 !== 0).length;
    if (odds === 2 || odds === 3) lottoOddEven23++;
    let hasConsec = false;
    for (let i = 0; i < nums.length - 1; i++) {
      if (nums[i + 1] - nums[i] === 1) hasConsec = true;
    }
    if (hasConsec) lottoConsecutives++;

    if (lottoPrev) {
      const prevSet = new Set(lottoPrev);
      const matches = nums.filter(n => prevSet.has(n));
      if (matches.length >= 1) lottoCarryovers++;
    }
    lottoPrev = nums;
  });
  console.log(`Carryover from prev draw (>=1 ball): ${((lottoCarryovers / (lottoRes.rows.length - 1)) * 100).toFixed(2)}%`);
  console.log(`Consecutive pair present: ${((lottoConsecutives / lottoRes.rows.length) * 100).toFixed(2)}%`);
  console.log(`Sum in [70, 110]: ${((lottoSumBands / lottoRes.rows.length) * 100).toFixed(2)}%`);
  console.log(`Parity 2:3 or 3:2: ${((lottoOddEven23 / lottoRes.rows.length) * 100).toFixed(2)}%`);

  // 6. Win For Life (6 of 28, order does not matter, NO Cash Ball)
  const wflRes = await client.execute("SELECT num1, num2, num3, num4, num5, num6 FROM winforlife_draws ORDER BY draw_number ASC");
  console.log(`\n--- WIN FOR LIFE ANALYSIS (${wflRes.rows.length} draws) ---`);
  let wflCarryovers1 = 0;
  let wflCarryovers2 = 0;
  let wflConsecutives = 0;
  let wflSumBands = 0;
  let wflOddEven33 = 0;
  let wflPrev = null;
  wflRes.rows.forEach(r => {
    const nums = [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5), Number(r.num6)].sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    if (sum >= 70 && sum <= 104) wflSumBands++;
    const odds = nums.filter(n => n % 2 !== 0).length;
    if (odds >= 2 && odds <= 4) wflOddEven33++;
    let hasConsec = false;
    for (let i = 0; i < nums.length - 1; i++) {
      if (nums[i + 1] - nums[i] === 1) hasConsec = true;
    }
    if (hasConsec) wflConsecutives++;

    if (wflPrev) {
      const prevSet = new Set(wflPrev);
      const matches = nums.filter(n => prevSet.has(n));
      if (matches.length >= 1) wflCarryovers1++;
      if (matches.length >= 2) wflCarryovers2++;
    }
    wflPrev = nums;
  });
  console.log(`Carryover from prev draw (>=1 ball): ${((wflCarryovers1 / (wflRes.rows.length - 1)) * 100).toFixed(2)}%`);
  console.log(`Carryover from prev draw (>=2 balls): ${((wflCarryovers2 / (wflRes.rows.length - 1)) * 100).toFixed(2)}%`);
  console.log(`Consecutive pair present: ${((wflConsecutives / wflRes.rows.length) * 100).toFixed(2)}%`);
  console.log(`Sum in [70, 104]: ${((wflSumBands / wflRes.rows.length) * 100).toFixed(2)}%`);
  console.log(`Parity 2O/4E, 3O/3E, 4O/2E: ${((wflOddEven33 / wflRes.rows.length) * 100).toFixed(2)}%`);

  console.log("\n=== AUDIT DATABASE CURRENT STATUS ===");
  const auditRes = await client.execute("SELECT status, is_prize_winner, count(*) as count FROM prediction_audits GROUP BY status, is_prize_winner");
  console.log(auditRes.rows);
}

analyze().catch(console.error);
