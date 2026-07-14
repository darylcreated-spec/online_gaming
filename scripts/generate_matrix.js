const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

const url = process.env.TURSO_DATABASE_URL || "file:data/lotto.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

async function main() {
  console.log(`Connecting to database: ${url}`);
  const db = createClient({ url, authToken });

  // 1. Initialize schema table if not exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS eligible_combinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      num1 INTEGER NOT NULL,
      num2 INTEGER NOT NULL,
      num3 INTEGER NOT NULL,
      num4 INTEGER NOT NULL,
      num5 INTEGER NOT NULL
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_eligible_nums ON eligible_combinations(num1, num2, num3, num4, num5)
  `);

  // 2. Fetch historical combinations (Filter C)
  console.log("Loading historical draws...");
  const drawsResult = await db.execute("SELECT num1, num2, num3, num4, num5 FROM draws");
  
  const historicalSet = new Set();
  const numFrequencies = Array(36).fill(0); // 1-35 frequency count

  for (const row of drawsResult.rows) {
    const nums = [row[0], row[1], row[2], row[3], row[4]].map(Number).sort((a, b) => a - b);
    historicalSet.add(nums.join(","));
    for (const num of nums) {
      if (num >= 1 && num <= 35) {
        numFrequencies[num]++;
      }
    }
  }
  console.log(`Loaded ${historicalSet.size} unique historical combinations.`);

  // Define Hot, Cold, Warm tiers based on frequency (Filter J)
  const numberFreqs = Array.from({ length: 35 }, (_, idx) => ({
    num: idx + 1,
    freq: numFrequencies[idx + 1]
  }));

  // Sort by frequency descending
  numberFreqs.sort((a, b) => b.freq - a.freq);

  // Top 11 are Hot, Bottom 11 are Cold, middle 13 are Warm
  const hasHistory = drawsResult.rows.length > 0;
  const hotNumbers = new Set();
  const coldNumbers = new Set();
  
  if (hasHistory) {
    numberFreqs.slice(0, 11).forEach(x => hotNumbers.add(x.num));
    numberFreqs.slice(24).forEach(x => coldNumbers.add(x.num));
    console.log("Hot numbers identified:", Array.from(hotNumbers).join(", "));
    console.log("Cold numbers identified:", Array.from(coldNumbers).join(", "));
  } else {
    console.log("No drawing history available. Skipping Hot/Cold ratio filtering.");
  }

  // 3. Clear old eligible combinations
  console.log("Clearing old eligible combinations...");
  await db.execute("DELETE FROM eligible_combinations");

  // Double numbers repeating subset (Filter E)
  const R = new Set([11, 22, 33]);

  console.log("Generating & filtering combinations...");
  const eligibleCombinations = [];
  let totalGenerated = 0;
  let totalEligible = 0;

  // Generate 5-number combinations from 1 to 35
  for (let i = 1; i <= 31; i++) {
    for (let j = i + 1; j <= 32; j++) {
      for (let k = j + 1; k <= 33; k++) {
        for (let l = k + 1; l <= 34; l++) {
          for (let m = l + 1; m <= 35; m++) {
            totalGenerated++;
            const comb = [i, j, k, l, m]; // Sorted by loop structure

            // Filter B: Continuous sequence (straight run check)
            if (j - i === 1 && k - j === 1 && l - k === 1 && m - l === 1) {
              continue;
            }

            // Filter C: Historical draws exclusion
            if (historicalSet.has(comb.join(","))) {
              continue;
            }

            // Filter D: Fixed Arithmetic Progressions
            const d1 = j - i;
            const d2 = k - j;
            const d3 = l - k;
            const d4 = m - l;
            if (d1 === d2 && d2 === d3 && d3 === d4) {
              continue;
            }

            // Filter E: Repeating-Digit Limit (completely exclude combinations containing 11, 22, or 33)
            let doublesCount = 0;
            if (R.has(i)) doublesCount++;
            if (R.has(j)) doublesCount++;
            if (R.has(k)) doublesCount++;
            if (R.has(l)) doublesCount++;
            if (R.has(m)) doublesCount++;
            if (doublesCount >= 1) {
              continue;
            }

            // Filter N: More than 4 double-digit numbers (must have at least one single-digit number 1-9)
            let doubleDigitCount = 0;
            if (i >= 10) doubleDigitCount++;
            if (j >= 10) doubleDigitCount++;
            if (k >= 10) doubleDigitCount++;
            if (l >= 10) doubleDigitCount++;
            if (m >= 10) doubleDigitCount++;
            if (doubleDigitCount > 4) {
              continue;
            }

            // Filter F: Odd/Even Balanced Ratio (no all-odd or all-even)
            let oddsCount = 0;
            if (i % 2 !== 0) oddsCount++;
            if (j % 2 !== 0) oddsCount++;
            if (k % 2 !== 0) oddsCount++;
            if (l % 2 !== 0) oddsCount++;
            if (m % 2 !== 0) oddsCount++;
            if (oddsCount === 5 || oddsCount === 0) {
              continue;
            }

            // Filter G: High/Low Distribution Boundary (Low: 1-17, High: 18-35)
            let lowsCount = 0;
            if (i <= 17) lowsCount++;
            if (j <= 17) lowsCount++;
            if (k <= 17) lowsCount++;
            if (l <= 17) lowsCount++;
            if (m <= 17) lowsCount++;
            if (lowsCount === 5 || lowsCount === 0) {
              continue;
            }

            // Filter H: Summation Variance Window (65 to 115)
            const sum = i + j + k + l + m;
            if (sum < 65 || sum > 115) {
              continue;
            }

            // Filter I: Last-Digit Congruence Limit (no terminal digit frequency >= 3)
            const digits = [i % 10, j % 10, k % 10, l % 10, m % 10];
            const digitCounts = {};
            let hasCongruenceExclusion = false;
            for (const d of digits) {
              digitCounts[d] = (digitCounts[d] || 0) + 1;
              if (digitCounts[d] >= 3) {
                hasCongruenceExclusion = true;
                break;
              }
            }
            if (hasCongruenceExclusion) {
              continue;
            }

            // Filter J: Hot/Cold/Warm Ratio Filter (Reject if >=4 Hot, >=4 Cold, or 0 Hot)
            if (hasHistory) {
              let hotCount = 0;
              let coldCount = 0;
              
              if (hotNumbers.has(i)) hotCount++;
              else if (coldNumbers.has(i)) coldCount++;
              
              if (hotNumbers.has(j)) hotCount++;
              else if (coldNumbers.has(j)) coldCount++;
              
              if (hotNumbers.has(k)) hotCount++;
              else if (coldNumbers.has(k)) coldCount++;
              
              if (hotNumbers.has(l)) hotCount++;
              else if (coldNumbers.has(l)) coldCount++;
              
              if (hotNumbers.has(m)) hotCount++;
              else if (coldNumbers.has(m)) coldCount++;

              if (hotCount >= 4 || coldCount >= 4 || hotCount === 0) {
                continue;
              }
            }

            // Filter K: Consecutive Pairs Limit (no triplets, no two separate consecutive pairs)
            let consecutiveDiffsOfOne = 0;
            if (j - i === 1) consecutiveDiffsOfOne++;
            if (k - j === 1) consecutiveDiffsOfOne++;
            if (l - k === 1) consecutiveDiffsOfOne++;
            if (m - l === 1) consecutiveDiffsOfOne++;
            if (consecutiveDiffsOfOne >= 2) {
              continue;
            }

            // Filter L: Distinct Terminal Digits Minimum (Reject if <= 2 unique terminal digits)
            const uniqueDigits = new Set(digits);
            if (uniqueDigits.size <= 2) {
              continue;
            }

            // Filter M: Sum of Last Digits Variance (Reject if sum < 15 or sum > 30)
            const lastDigitsSum = digits.reduce((s, d) => s + d, 0);
            if (lastDigitsSum < 15 || lastDigitsSum > 30) {
              continue;
            }

            // Passes all filters!
            eligibleCombinations.push(comb);
            totalEligible++;
          }
        }
      }
    }
  }

  console.log(`Filtering Complete! Found ${totalEligible} eligible combinations.`);
  console.log("Writing to database in batches...");

  // Batch insert into database
  const batchSize = 1000;
  for (let idx = 0; idx < eligibleCombinations.length; idx += batchSize) {
    const chunk = eligibleCombinations.slice(idx, idx + batchSize);
    const statements = chunk.map(comb => ({
      sql: "INSERT INTO eligible_combinations (num1, num2, num3, num4, num5) VALUES (?, ?, ?, ?, ?)",
      args: comb
    }));

    await db.batch(statements, "write");
    if ((idx + chunk.length) % 10000 === 0 || idx + chunk.length === eligibleCombinations.length) {
      console.log(`Wrote ${idx + chunk.length} / ${eligibleCombinations.length} combinations...`);
    }
  }

  console.log("Database write complete!");
  console.log(`Summary: Evaluated ${totalGenerated} combinations. Eligible pool: ${totalEligible} (${((totalEligible/totalGenerated)*100).toFixed(2)}% of universe)`);
}

main().catch(err => {
  console.error("Fatal Error running matrix generation:", err);
  process.exit(1);
});
