import * as XLSX from "xlsx";
import * as path from "path";

function runAnalysis() {
  const filePath = path.join(process.cwd(), "NLCB_Sorted_Winning_Combinations.xlsx");
  const workbook = XLSX.readFile(filePath);

  console.log("Analyzing Sorted Data Patterns from:", filePath);

  for (const sheetName of ["Lotto Plus (Sorted)", "Win For Life (Sorted)", "Cash Pot (Sorted)"]) {
    console.log(`\n================================================================================`);
    console.log(`DEEP PATTERN DISCOVERY: ${sheetName.toUpperCase()}`);
    console.log(`================================================================================`);

    const ws = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const headers = data[0];
    const rows = data.slice(1);
    const totalDraws = rows.length;

    // Determine ball count based on sheet
    const numBalls = sheetName.includes("Win For Life") ? 6 : 5;
    const maxNumber = sheetName.includes("Lotto Plus") ? 35 : (sheetName.includes("Win For Life") ? 28 : 20);

    // Extract sorted number arrays: columns C onwards (index 2 to 2 + numBalls - 1)
    const allDraws: number[][] = [];
    rows.forEach(r => {
      const balls: number[] = [];
      for (let i = 0; i < numBalls; i++) {
        balls.push(Number(r[2 + i]));
      }
      if (balls.every(b => !isNaN(b) && b > 0)) {
        allDraws.push(balls);
      }
    });

    console.log(`Total valid draws analyzed: ${allDraws.length}`);

    // 1. POSITIONAL RANGE (ORDER STATISTICS)
    console.log("\n--- 1. POSITIONAL BOUNDARIES (MIN, MEDIAN, MAX, 90% CONFIDENCE INTERVAL) ---");
    for (let pos = 0; pos < numBalls; pos++) {
      const vals = allDraws.map(d => d[pos]).sort((a, b) => a - b);
      const min = vals[0];
      const max = vals[vals.length - 1];
      const p5 = vals[Math.floor(vals.length * 0.05)];
      const median = vals[Math.floor(vals.length * 0.50)];
      const p95 = vals[Math.floor(vals.length * 0.95)];
      const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      console.log(`Ball ${pos + 1}: Avg = ${avg} | Median = ${median} | 90% CI: [${p5} - ${p95}] | Range: [${min} - ${max}]`);
    }

    // 2. CONSECUTIVE PAIRS & TRIPLETS FREQUENCY
    console.log("\n--- 2. CONSECUTIVE STEPPING PATTERNS ---");
    let hasConsecPair = 0;
    let hasConsecTriplet = 0;
    let exactPairsCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    
    allDraws.forEach(d => {
      let pairs = 0;
      let maxRun = 1;
      let curRun = 1;
      for (let i = 0; i < numBalls - 1; i++) {
        if (d[i + 1] - d[i] === 1) {
          pairs++;
          curRun++;
          if (curRun > maxRun) maxRun = curRun;
        } else {
          curRun = 1;
        }
      }
      if (pairs > 0) hasConsecPair++;
      if (maxRun >= 3) hasConsecTriplet++;
      exactPairsCount[pairs] = (exactPairsCount[pairs] || 0) + 1;
    });

    console.log(`Draws with at least ONE consecutive pair (e.g. {x, x+1}): ${hasConsecPair} / ${allDraws.length} (${((hasConsecPair / allDraws.length) * 100).toFixed(1)}%)`);
    console.log(`Draws with consecutive TRIPLETS (e.g. {x, x+1, x+2}): ${hasConsecTriplet} / ${allDraws.length} (${((hasConsecTriplet / allDraws.length) * 100).toFixed(1)}%)`);
    console.log(`Breakdown: 0 pairs: ${((exactPairsCount[0] / allDraws.length) * 100).toFixed(1)}% | 1 pair: ${((exactPairsCount[1] / allDraws.length) * 100).toFixed(1)}% | 2 pairs: ${((exactPairsCount[2] / allDraws.length) * 100).toFixed(1)}%`);

    // 3. STEP INTERVALS (GAPS BETWEEN SORTED BALLS)
    console.log("\n--- 3. STEP INTERVAL DELTAS (B_{i+1} - B_i) ---");
    const deltaFreq: Record<number, number> = {};
    let totalDeltas = 0;
    allDraws.forEach(d => {
      for (let i = 0; i < numBalls - 1; i++) {
        const diff = d[i + 1] - d[i];
        deltaFreq[diff] = (deltaFreq[diff] || 0) + 1;
        totalDeltas++;
      }
    });

    const topDeltas = Object.entries(deltaFreq)
      .map(([diff, count]) => ({ diff: Number(diff), count, pct: ((count / totalDeltas) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    console.log("Top 8 Step Gaps between adjacent balls:", topDeltas);

    // 4. LAST DIGIT (TERMINAL MODULO 10) PATTERNS
    console.log("\n--- 4. TERMINAL DIGIT (LAST DIGIT MOD 10) REPETITION ---");
    let hasTerminalDuplicate = 0; // e.g. 7 and 17, 3 and 23
    let hasTerminalTriplicate = 0;
    allDraws.forEach(d => {
      const endings = d.map(n => n % 10);
      const counts: Record<number, number> = {};
      endings.forEach(e => { counts[e] = (counts[e] || 0) + 1; });
      const maxCount = Math.max(...Object.values(counts));
      if (maxCount >= 2) hasTerminalDuplicate++;
      if (maxCount >= 3) hasTerminalTriplicate++;
    });
    console.log(`Draws with at least two balls sharing the SAME last digit: ${hasTerminalDuplicate} / ${allDraws.length} (${((hasTerminalDuplicate / allDraws.length) * 100).toFixed(1)}%)`);
    console.log(`Draws with three balls sharing the same last digit: ${hasTerminalTriplicate} / ${allDraws.length} (${((hasTerminalTriplicate / allDraws.length) * 100).toFixed(1)}%)`);

    // 5. DECADE OCCUPANCY PATTERNS
    console.log("\n--- 5. DECADE SPREAD & DISPERSION ---");
    const decadeOccupancyCount: Record<number, number> = {};
    allDraws.forEach(d => {
      const decades = new Set(d.map(n => Math.floor((n - 1) / 10)));
      decadeOccupancyCount[decades.size] = (decadeOccupancyCount[decades.size] || 0) + 1;
    });
    for (const [decCount, cnt] of Object.entries(decadeOccupancyCount)) {
      console.log(`Occupying exactly ${decCount} distinct decades: ${cnt} draws (${((cnt / allDraws.length) * 100).toFixed(1)}%)`);
    }

    // 6. LAG-1 CARRYOVER REPEAT RECURRENCE
    console.log("\n--- 6. LAG-1 CARRYOVER REPEATS ---");
    let repeatCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (let i = 0; i < allDraws.length - 1; i++) {
      const cur = allDraws[i];
      const prev = new Set(allDraws[i + 1]);
      const common = cur.filter(b => prev.has(b)).length;
      repeatCounts[common] = (repeatCounts[common] || 0) + 1;
    }
    const totalTested = allDraws.length - 1;
    console.log(`0 repeats from last draw: ${((repeatCounts[0] / totalTested) * 100).toFixed(1)}%`);
    console.log(`1 repeat from last draw:  ${((repeatCounts[1] / totalTested) * 100).toFixed(1)}%`);
    console.log(`2 repeats from last draw: ${((repeatCounts[2] / totalTested) * 100).toFixed(1)}%`);
    console.log(`3+ repeats:               ${(((repeatCounts[3] + (repeatCounts[4] || 0)) / totalTested) * 100).toFixed(1)}%`);
    console.log(`Net rate of at least 1 repeat: ${(((totalTested - repeatCounts[0]) / totalTested) * 100).toFixed(1)}%`);
  }
}

runAnalysis();
