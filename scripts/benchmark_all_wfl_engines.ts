/**
 * scripts/benchmark_all_wfl_engines.ts
 *
 * UNIFIED ZERO-LOOKAHEAD WALK-FORWARD EMPIRICAL EVALUATION & BENCHMARK
 * Evaluates all four Win For Life analytical engines across 3 distinct horizons:
 *   1. Short Horizon: Last 50 Draws (#420 to #469)
 *   2. Medium Horizon: Last 100 Draws (#370 to #469)
 *   3. Full Archive Horizon: All 454 Audited Draws (#16 to #469)
 *
 * Engines evaluated:
 *   - Forensic Quantitative Engine (20 tickets: 10 candidates + 10 Mandel covering array slips)
 *   - Quant100 Engine (5 quant tickets)
 *   - Diff28 Centroid Engine (5 diff formula tickets)
 *   - Core Math Engine (Optimal single ticket & 5-ticket covering wheel)
 *
 * Zero Sparkle Policy: Strict quantitative fintech terminal aesthetics.
 */

import * as fs from "fs";
import * as path from "path";

// Load .env.local before initializing database
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
} catch (e) {
  console.warn("Could not load .env.local directly:", e);
}

// db will be dynamically imported inside runBenchmark() after .env.local is loaded
import {
  executeWinForLifeForensicEngine,
  MANDEL_COVERING_WHEEL_16_INDICES,
  WFLDraw,
} from "../src/lib/winforlife_forensic_engine";
import {
  computeWinForLifeQuant100Engine,
  WinForLifeDrawRecord as Quant100DrawRecord,
} from "../src/lib/winforlife_quant100_engine";
import {
  computeWinForLifeDiff28Engine,
  diff28,
  WinForLifeDrawRecord as Diff28DrawRecord,
} from "../src/lib/winforlife_diff28_engine";
import {
  computeMultiBallNextDrawProbabilities,
  MultiBallDrawRecord,
} from "../src/lib/lotto_wfl_math_engine";

interface CleanDraw {
  draw_number: number;
  draw_date: string;
  numbers: number[];
  cash_ball: number;
}

interface EngineResult {
  engineName: string;
  architecture: string;
  ticketCount: number;
  costPerDrawTT: number;
  testedDraws: number;
  match6: number;
  match5: number;
  match4: number;
  match3: number;
  prizeWins: number;
  captureRatePct: number;
  totalPayoutTT: number;
  totalCostTT: number;
  netProfitLossTT: number;
  costPerWinTT: number;
  outlierHitsDetail: string[];
}

interface HorizonBenchmark {
  horizonName: string;
  horizonRange: string;
  drawCount: number;
  results: EngineResult[];
}

// Diff28 Five Sets generator matching src/lib/winforlife_diff28_engine.ts exactly
function generateDiff28SetsAt(
  draws: CleanDraw[],
  t: number
): { S1: number[]; S2: number[]; S3: number[]; S4: number[]; S5: number[]; poolNums: number[] } {
  const currNums = draws[t].numbers;
  const freq28 = new Array(29).fill(0);
  const directFreq = new Array(29).fill(0);
  const windowStart = Math.max(0, t - 4);

  for (let w = windowStart; w <= t; w++) {
    draws[w].numbers.forEach((n) => {
      directFreq[n]++;
      freq28[diff28(n)]++;
    });
  }

  const rankedPool: { n: number; score: number; diffScore: number; directScore: number }[] = [];
  for (let n = 1; n <= 28; n++) {
    const partner = diff28(n);
    const score = freq28[n] * 2.2 + freq28[partner] * 1.4 + directFreq[n] * 1.1;
    rankedPool.push({ n, score, diffScore: freq28[n], directScore: directFreq[n] });
  }
  rankedPool.sort((a, b) => b.score - a.score || a.n - b.n);
  const poolNums = rankedPool.map((r) => r.n);

  function ensureSixDistinct(nums: number[], ranked: number[]): number[] {
    const distinct = Array.from(new Set(nums.filter((n) => n >= 1 && n <= 28)));
    let poolIdx = 0;
    while (distinct.length < 6 && poolIdx < ranked.length) {
      const candidate = ranked[poolIdx];
      if (!distinct.includes(candidate)) {
        distinct.push(candidate);
      }
      poolIdx++;
    }
    return distinct.slice(0, 6).sort((a, b) => a - b);
  }

  const S1 = ensureSixDistinct(currNums.map(diff28), poolNums);
  const rankedByDiff = [...rankedPool].sort(
    (a, b) => b.diffScore - a.diffScore || b.directScore - a.directScore || a.n - b.n
  );
  const S2 = ensureSixDistinct(rankedByDiff.slice(0, 6).map((x) => x.n), poolNums);
  const comps = currNums.map(diff28);
  const rawS3 = [currNums[0], currNums[1], currNums[2], comps[3], comps[4], comps[5]];
  const S3 = ensureSixDistinct(rawS3, poolNums);
  const rawS4 = currNums.map((n) => {
    let v = (diff28(n) + 1) % 28;
    return v === 0 ? 28 : v;
  });
  const S4 = ensureSixDistinct(rawS4, poolNums);
  const S5 = ensureSixDistinct(poolNums.slice(0, 6), poolNums);

  return { S1, S2, S3, S4, S5, poolNums };
}

async function runBenchmark() {
  console.log("================================================================================");
  console.log("   WIN FOR LIFE (6/28 + CB 1-3) MULTI-ENGINE EMPIRICAL BENCHMARK & AUDIT");
  console.log("   Zero-Lookahead Walk-Forward Evaluation across Historical Turso DB");
  console.log("================================================================================\n");

  const startTime = Date.now();

  // 1. Fetch historical draws from Turso Cloud DB
  console.log("[Phase 1] Querying full historical archive from database...");
  const { query } = await import("../src/lib/db");
  const rawRows = await query<any>(`
    SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball
    FROM winforlife_draws
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  if (!rawRows || rawRows.length < 469) {
    throw new Error(`Expected at least 469 draws from Turso DB, received: ${rawRows?.length}`);
  }

  const draws: CleanDraw[] = rawRows.map((r) => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [
      Number(r.num1),
      Number(r.num2),
      Number(r.num3),
      Number(r.num4),
      Number(r.num5),
      Number(r.num6),
    ].sort((a, b) => a - b),
    cash_ball: Number(r.cash_ball || 1),
  }));

  const N = draws.length;
  console.log(`[Phase 1] Successfully loaded ${N} verified draws.`);
  console.log(`          Earliest Draw: #${draws[0].draw_number} (${draws[0].draw_date}) [${draws[0].numbers.join(", ")}] CB:${draws[0].cash_ball}`);
  console.log(`          Latest Draw:   #${draws[N - 1].draw_number} (${draws[N - 1].draw_date}) [${draws[N - 1].numbers.join(", ")}] CB:${draws[N - 1].cash_ball}`);
  console.log(`          Target Prediction Draw: #${draws[N - 1].draw_number + 1}\n`);

  // Define Horizons
  const horizons = [
    { name: "Short Horizon (Last 50 Draws)", depth: 50, startIdx: N - 50, endIdx: N - 1 },
    { name: "Medium Horizon (Last 100 Draws)", depth: 100, startIdx: N - 100, endIdx: N - 1 },
    { name: "Full Archive Horizon (All 454 Audited Draws)", depth: 454, startIdx: 15, endIdx: N - 1 },
  ];

  // Map draws for engines requiring specific interfaces
  const wflDraws: WFLDraw[] = draws.map((d) => ({
    draw_number: d.draw_number,
    draw_date: d.draw_date,
    numbers: d.numbers,
    cash_ball: d.cash_ball,
  }));

  const quant100Raw: Quant100DrawRecord[] = draws.map((d) => ({
    draw_number: d.draw_number,
    draw_date: d.draw_date,
    num1: d.numbers[0],
    num2: d.numbers[1],
    num3: d.numbers[2],
    num4: d.numbers[3],
    num5: d.numbers[4],
    num6: d.numbers[5],
    cash_ball: d.cash_ball,
  }));

  const diff28Raw: Diff28DrawRecord[] = draws.map((d) => ({
    draw_number: d.draw_number,
    draw_date: d.draw_date,
    num1: d.numbers[0],
    num2: d.numbers[1],
    num3: d.numbers[2],
    num4: d.numbers[3],
    num5: d.numbers[4],
    num6: d.numbers[5],
    cash_ball: d.cash_ball,
  }));

  const multiBallDraws: MultiBallDrawRecord[] = draws.map((d) => ({
    draw_number: d.draw_number,
    draw_date: d.draw_date,
    num1: d.numbers[0],
    num2: d.numbers[1],
    num3: d.numbers[2],
    num4: d.numbers[3],
    num5: d.numbers[4],
    num6: d.numbers[5],
    cash_ball: d.cash_ball,
  }));

  console.log("[Phase 2] Pre-calculating full Quant100 walk-forward audit log...");
  const quant100Output = computeWinForLifeQuant100Engine(quant100Raw);
  // Map of draw_number -> audit entry
  const quant100AuditByDraw = new Map<number, any>();
  quant100Output.auditVerification.recentAuditLog.forEach((entry: any) => {
    quant100AuditByDraw.set(entry.drawNumber, entry);
  });
  console.log(`          Precomputed ${quant100AuditByDraw.size} Quant100 walk-forward steps.\n`);

  const benchmarkReports: HorizonBenchmark[] = [];

  for (const h of horizons) {
    const horizonRange = `Draws #${draws[h.startIdx].draw_number} to #${draws[h.endIdx].draw_number}`;
    const testedCount = h.endIdx - h.startIdx + 1;
    console.log(`--------------------------------------------------------------------------------`);
    console.log(` EVALUATING HORIZON: ${h.name}`);
    console.log(` Range: ${horizonRange} (${testedCount} draws tested)`);
    console.log(`--------------------------------------------------------------------------------`);

    // 1. Forensic Quantitative Engine (20 tickets)
    console.log(`  -> Running Forensic Quantitative Engine (20 tickets/draw)...`);
    const forensicOutput = executeWinForLifeForensicEngine(wflDraws, h.depth);
    const fAudit = forensicOutput.audit;
    const fTested = fAudit.testedDrawsCount;
    const fMatch6 = fAudit.sixHitsCount;
    const fMatch5 = fAudit.fiveHitsCount;
    const fMatch4 = fAudit.fourHitsCount;
    const fMatch3 = fAudit.threeHitsCount;
    const fPrizeWins = fMatch3 + fMatch4 + fMatch5 + fMatch6;
    const fCaptureRate = (fPrizeWins / fTested) * 100;
    const fTotalPayout = fAudit.totalSimulatedPayoutTT;
    const fTotalCost = fTested * 20 * 10;
    const fNetPL = fTotalPayout - fTotalCost;
    const fCostPerWin = fPrizeWins > 0 ? fTotalCost / fPrizeWins : 0;

    const fOutliers: string[] = [];
    fAudit.drawByDrawLog.forEach((entry) => {
      if (entry.bestPortfolioHitCount === 6) {
        fOutliers.push(
          `Draw #${entry.drawNumber} (${entry.drawDate}): 6/6 Match! Actual [${entry.drawnNumbers?.join(", ") || ""}], Strat: ${entry.bestStrategyName}, Payout $480,000 TT`
        );
      } else if (entry.bestPortfolioHitCount === 5) {
        fOutliers.push(
          `Draw #${entry.drawNumber} (${entry.drawDate}): 5/6 Match! Actual [${entry.drawnNumbers?.join(", ") || ""}], Strat: ${entry.bestStrategyName}, Payout $1,000 TT`
        );
      }
    });

    const fRes: EngineResult = {
      engineName: "Forensic Quantitative Engine",
      architecture: "Dual-Manifold 10 Strategies + 10-Slip Mandel Covering Wheel",
      ticketCount: 20,
      costPerDrawTT: 200,
      testedDraws: fTested,
      match6: fMatch6,
      match5: fMatch5,
      match4: fMatch4,
      match3: fMatch3,
      prizeWins: fPrizeWins,
      captureRatePct: Number(fCaptureRate.toFixed(2)),
      totalPayoutTT: fTotalPayout,
      totalCostTT: fTotalCost,
      netProfitLossTT: fNetPL,
      costPerWinTT: Number(fCostPerWin.toFixed(2)),
      outlierHitsDetail: fOutliers,
    };

    // 2. Quant100 Engine (5 tickets)
    console.log(`  -> Running Quant100 Engine (5 tickets/draw)...`);
    let qMatch6 = 0, qMatch5 = 0, qMatch4 = 0, qMatch3 = 0, qPrizeWins = 0;
    let qTotalPayout = 0;
    const qOutliers: string[] = [];

    for (let i = h.startIdx; i <= h.endIdx; i++) {
      const dNum = draws[i].draw_number;
      const entry = quant100AuditByDraw.get(dNum);
      if (entry) {
        const bestHit = entry.bestTicketHit;
        if (bestHit === 6) {
          qMatch6++;
          qTotalPayout += 480000;
          qPrizeWins++;
          qOutliers.push(`Draw #${dNum} (${draws[i].draw_date}): 6/6 Match! Payout $480,000 TT`);
        } else if (bestHit === 5) {
          qMatch5++;
          qTotalPayout += 1000;
          qPrizeWins++;
          qOutliers.push(`Draw #${dNum} (${draws[i].draw_date}): 5/6 Match! Payout $1,000 TT`);
        } else if (bestHit === 4) {
          qMatch4++;
          qTotalPayout += 50;
          qPrizeWins++;
        } else if (bestHit === 3) {
          qMatch3++;
          qTotalPayout += 10;
          qPrizeWins++;
        }
      }
    }

    const qTested = testedCount;
    const qTotalCost = qTested * 5 * 10;
    const qNetPL = qTotalPayout - qTotalCost;
    const qCostPerWin = qPrizeWins > 0 ? qTotalCost / qPrizeWins : 0;

    const qRes: EngineResult = {
      engineName: "Quant100 Engine",
      architecture: "CRT Z4 x Z7 Galois Ring Sieve + 5 Quant Sets",
      ticketCount: 5,
      costPerDrawTT: 50,
      testedDraws: qTested,
      match6: qMatch6,
      match5: qMatch5,
      match4: qMatch4,
      match3: qMatch3,
      prizeWins: qPrizeWins,
      captureRatePct: Number(((qPrizeWins / qTested) * 100).toFixed(2)),
      totalPayoutTT: qTotalPayout,
      totalCostTT: qTotalCost,
      netProfitLossTT: qNetPL,
      costPerWinTT: Number(qCostPerWin.toFixed(2)),
      outlierHitsDetail: qOutliers,
    };

    // 3. Diff28 Centroid Engine (5 tickets)
    console.log(`  -> Running Diff28 Centroid Engine (5 tickets/draw)...`);
    let dMatch6 = 0, dMatch5 = 0, dMatch4 = 0, dMatch3 = 0, dPrizeWins = 0;
    let dTotalPayout = 0;
    const dOutliers: string[] = [];

    for (let i = h.startIdx; i <= h.endIdx; i++) {
      const targetDraw = draws[i];
      const targetSet = new Set(targetDraw.numbers);
      // History strictly up to index i - 1
      const sets = generateDiff28SetsAt(draws, i - 1);
      const tickets = [sets.S1, sets.S2, sets.S3, sets.S4, sets.S5];

      let bestHit = 0;
      tickets.forEach((t) => {
        const hit = t.filter((n) => targetSet.has(n)).length;
        if (hit > bestHit) bestHit = hit;
      });

      if (bestHit === 6) {
        dMatch6++;
        dTotalPayout += 480000;
        dPrizeWins++;
        dOutliers.push(`Draw #${targetDraw.draw_number} (${targetDraw.draw_date}): 6/6 Match! Payout $480,000 TT`);
      } else if (bestHit === 5) {
        dMatch5++;
        dTotalPayout += 1000;
        dPrizeWins++;
        dOutliers.push(`Draw #${targetDraw.draw_number} (${targetDraw.draw_date}): 5/6 Match! Payout $1,000 TT`);
      } else if (bestHit === 4) {
        dMatch4++;
        dTotalPayout += 50;
        dPrizeWins++;
      } else if (bestHit === 3) {
        dMatch3++;
        dTotalPayout += 10;
        dPrizeWins++;
      }
    }

    const dTested = testedCount;
    const dTotalCost = dTested * 5 * 10;
    const dNetPL = dTotalPayout - dTotalCost;
    const dCostPerWin = dPrizeWins > 0 ? dTotalCost / dPrizeWins : 0;

    const dRes: EngineResult = {
      engineName: "Diff28 Centroid Engine",
      architecture: "Group Modular Involution sigma_28(x) = 28 - x + 5 Formula Sets",
      ticketCount: 5,
      costPerDrawTT: 50,
      testedDraws: dTested,
      match6: dMatch6,
      match5: dMatch5,
      match4: dMatch4,
      match3: dMatch3,
      prizeWins: dPrizeWins,
      captureRatePct: Number(((dPrizeWins / dTested) * 100).toFixed(2)),
      totalPayoutTT: dTotalPayout,
      totalCostTT: dTotalCost,
      netProfitLossTT: dNetPL,
      costPerWinTT: Number(dCostPerWin.toFixed(2)),
      outlierHitsDetail: dOutliers,
    };

    // 4. Core Math Engine (Optimal single ticket & 5-ticket covering wheel)
    console.log(`  -> Running Core Math Engine (Optimal Ticket + 5-Ticket Covering Wheel)...`);
    let cmOptMatch6 = 0, cmOptMatch5 = 0, cmOptMatch4 = 0, cmOptMatch3 = 0, cmOptPrizeWins = 0;
    let cmOptTotalPayout = 0;

    let cmWheelMatch6 = 0, cmWheelMatch5 = 0, cmWheelMatch4 = 0, cmWheelMatch3 = 0, cmWheelPrizeWins = 0;
    let cmWheelTotalPayout = 0;

    for (let i = h.startIdx; i <= h.endIdx; i++) {
      const histSlice = multiBallDraws.slice(0, i);
      const targetDraw = draws[i];
      const targetSet = new Set(targetDraw.numbers);

      const prediction = computeMultiBallNextDrawProbabilities(histSlice, "win-for-life");

      // Optimal Single Ticket
      const optNums = prediction.optimalTicket.numbers;
      const optHits = optNums.filter((n) => targetSet.has(n)).length;

      if (optHits === 6) {
        cmOptMatch6++;
        cmOptTotalPayout += 480000;
        cmOptPrizeWins++;
      } else if (optHits === 5) {
        cmOptMatch5++;
        cmOptTotalPayout += 1000;
        cmOptPrizeWins++;
      } else if (optHits === 4) {
        cmOptMatch4++;
        cmOptTotalPayout += 50;
        cmOptPrizeWins++;
      } else if (optHits === 3) {
        cmOptMatch3++;
        cmOptTotalPayout += 10;
        cmOptPrizeWins++;
      }

      // 5-Ticket Covering Wheel
      let wheelBestHit = 0;
      prediction.fiveTicketCoveringWheel.forEach((ticket) => {
        const hits = ticket.numbers.filter((n) => targetSet.has(n)).length;
        if (hits > wheelBestHit) wheelBestHit = hits;
      });

      if (wheelBestHit === 6) {
        cmWheelMatch6++;
        cmWheelTotalPayout += 480000;
        cmWheelPrizeWins++;
      } else if (wheelBestHit === 5) {
        cmWheelMatch5++;
        cmWheelTotalPayout += 1000;
        cmWheelPrizeWins++;
      } else if (wheelBestHit === 4) {
        cmWheelMatch4++;
        cmWheelTotalPayout += 50;
        cmWheelPrizeWins++;
      } else if (wheelBestHit === 3) {
        cmWheelMatch3++;
        cmWheelTotalPayout += 10;
        cmWheelPrizeWins++;
      }
    }

    const cmTested = testedCount;

    // Core Math Optimal Pick
    const cmOptTotalCost = cmTested * 1 * 10;
    const cmOptNetPL = cmOptTotalPayout - cmOptTotalCost;
    const cmOptCostPerWin = cmOptPrizeWins > 0 ? cmOptTotalCost / cmOptPrizeWins : 0;

    const cmOptRes: EngineResult = {
      engineName: "Core Math Engine (Optimal Single Pick)",
      architecture: "8-Factor Bayesian/Markov MAP Posterior Scoring (1 Line)",
      ticketCount: 1,
      costPerDrawTT: 10,
      testedDraws: cmTested,
      match6: cmOptMatch6,
      match5: cmOptMatch5,
      match4: cmOptMatch4,
      match3: cmOptMatch3,
      prizeWins: cmOptPrizeWins,
      captureRatePct: Number(((cmOptPrizeWins / cmTested) * 100).toFixed(2)),
      totalPayoutTT: cmOptTotalPayout,
      totalCostTT: cmOptTotalCost,
      netProfitLossTT: cmOptNetPL,
      costPerWinTT: Number(cmOptCostPerWin.toFixed(2)),
      outlierHitsDetail: [],
    };

    // Core Math 5-Ticket Wheel
    const cmWheelTotalCost = cmTested * 5 * 10;
    const cmWheelNetPL = cmWheelTotalPayout - cmWheelTotalCost;
    const cmWheelCostPerWin = cmWheelPrizeWins > 0 ? cmWheelTotalCost / cmWheelPrizeWins : 0;

    const cmWheelRes: EngineResult = {
      engineName: "Core Math Engine (5-Ticket Covering Wheel)",
      architecture: "Bitmask Set Cover over Top 12 Ranked Pool (5 Slips)",
      ticketCount: 5,
      costPerDrawTT: 50,
      testedDraws: cmTested,
      match6: cmWheelMatch6,
      match5: cmWheelMatch5,
      match4: cmWheelMatch4,
      match3: cmWheelMatch3,
      prizeWins: cmWheelPrizeWins,
      captureRatePct: Number(((cmWheelPrizeWins / cmTested) * 100).toFixed(2)),
      totalPayoutTT: cmWheelTotalPayout,
      totalCostTT: cmWheelTotalCost,
      netProfitLossTT: cmWheelNetPL,
      costPerWinTT: Number(cmWheelCostPerWin.toFixed(2)),
      outlierHitsDetail: [],
    };

    benchmarkReports.push({
      horizonName: h.name,
      horizonRange,
      drawCount: testedCount,
      results: [fRes, qRes, dRes, cmOptRes, cmWheelRes],
    });

    console.log(`\n  [Summary Table: ${h.name}]`);
    console.table(
      [fRes, qRes, dRes, cmOptRes, cmWheelRes].map((r) => ({
        Engine: r.engineName,
        Tickets: r.ticketCount,
        "Capture %": `${r.captureRatePct}% (${r.prizeWins}/${r.testedDraws})`,
        "Match 6": r.match6,
        "Match 5": r.match5,
        "Match 4": r.match4,
        "Match 3": r.match3,
        "Payout (TTD)": `$${r.totalPayoutTT.toLocaleString()}`,
        "Cost (TTD)": `$${r.totalCostTT.toLocaleString()}`,
        "Net P/L (TTD)": `$${r.netProfitLossTT.toLocaleString()}`,
        "Cost/Win": `$${r.costPerWinTT}`,
      }))
    );
  }

  // Phase 3: Active Target Draw #470 Predictions & Confluence Matrix
  console.log("================================================================================");
  console.log("   TARGET DRAW #470 PREDICTIONS & MULTI-ENGINE CONFLUENCE SYNTHESIS");
  console.log("================================================================================\n");

  // 1. Forensic Engine Active Predictions for Draw #470
  const forensicDraw470 = executeWinForLifeForensicEngine(wflDraws, 100);
  const forensicActiveCandidates = forensicDraw470.nextCandidateSets;
  const forensicAttractorCore = forensicDraw470.invariantSubspace.pool;
  const forensicMandelSlips = forensicDraw470.invariantSubspace.coveringTickets.map((nums, idx) => ({
    name: `Mandel Covering Slip #${idx + 1}`,
    numbers: nums,
  }));

  // 2. Quant100 Active Predictions for Draw #470
  const quantActiveResult = computeWinForLifeQuant100Engine(quant100Raw);
  const quantSets = quantActiveResult.theFiveQuantSets;
  const quantManifold = quantActiveResult.masterAttractorManifold.pool;

  // 3. Diff28 Active Predictions for Draw #470
  const diffActiveResult = computeWinForLifeDiff28Engine(diff28Raw);
  const diffSets = diffActiveResult.nextDrawPredictions.sets;
  const diffUnion = diffActiveResult.nextDrawPredictions.unionPool;

  // 4. Core Math Active Predictions for Draw #470
  const coreMathActive = computeMultiBallNextDrawProbabilities(multiBallDraws, "win-for-life");
  const cmOptimalTicket = coreMathActive.optimalTicket;
  const cmTrio = coreMathActive.trioEnsemble;
  const cmWheel = coreMathActive.fiveTicketCoveringWheel;

  // Build Cross-Engine Confluence Matrix for all balls 1 to 28
  // Definition: Ball presence in primary candidate portfolios
  const forensicPrimaryBalls = new Set<number>();
  forensicActiveCandidates.forEach((c) => c.numbers.forEach((n) => forensicPrimaryBalls.add(n)));

  const quantPrimaryBalls = new Set<number>();
  quantSets.forEach((s) => s.numbers.forEach((n) => quantPrimaryBalls.add(n)));

  const diffPrimaryBalls = new Set<number>();
  diffSets.forEach((s) => s.numbers.forEach((n) => diffPrimaryBalls.add(n)));

  const coreMathPrimaryBalls = new Set<number>();
  // Core math primary active slips: optimal ticket + trio + 5-ticket wheel
  [cmOptimalTicket, ...cmTrio, ...cmWheel].forEach((t) => t.numbers.forEach((n) => coreMathPrimaryBalls.add(n)));

  // Detailed slip appearance count
  const ticketCounts = new Array(29).fill(0);
  const fTicketCounts = new Array(29).fill(0);
  const qTicketCounts = new Array(29).fill(0);
  const dTicketCounts = new Array(29).fill(0);
  const cmTicketCounts = new Array(29).fill(0);

  forensicActiveCandidates.forEach((c) => c.numbers.forEach((n) => { fTicketCounts[n]++; ticketCounts[n]++; }));
  quantSets.forEach((s) => s.numbers.forEach((n) => { qTicketCounts[n]++; ticketCounts[n]++; }));
  diffSets.forEach((s) => s.numbers.forEach((n) => { dTicketCounts[n]++; ticketCounts[n]++; }));
  [cmOptimalTicket, ...cmTrio, ...cmWheel].forEach((t) => t.numbers.forEach((n) => { cmTicketCounts[n]++; ticketCounts[n]++; }));

  interface ConfluenceRow {
    ball: number;
    confluenceCount: number;
    engines: string[];
    totalTickets: number;
    breakdown: string;
    tier: string;
  }

  const confluenceMatrix: ConfluenceRow[] = [];

  for (let b = 1; b <= 28; b++) {
    const selectingEngines: string[] = [];
    if (forensicPrimaryBalls.has(b)) selectingEngines.push("Forensic");
    if (quantPrimaryBalls.has(b)) selectingEngines.push("Quant100");
    if (diffPrimaryBalls.has(b)) selectingEngines.push("Diff28");
    if (coreMathPrimaryBalls.has(b)) selectingEngines.push("CoreMath");

    const confCount = selectingEngines.length;
    let tier = "Suppressed (0/4)";
    if (confCount === 4) tier = "Quad-Engine Consensus (4/4)";
    else if (confCount === 3) tier = "High Confluence (3/4)";
    else if (confCount === 2) tier = "Moderate Confluence (2/4)";
    else if (confCount === 1) tier = "Single Engine (1/4)";

    confluenceMatrix.push({
      ball: b,
      confluenceCount: confCount,
      engines: selectingEngines,
      totalTickets: ticketCounts[b],
      breakdown: `(${fTicketCounts[b]} / ${qTicketCounts[b]} / ${dTicketCounts[b]} / ${cmTicketCounts[b]})`,
      tier,
    });
  }

  // Sort descending by confluence count, then ticket appearances
  confluenceMatrix.sort((a, b) => b.confluenceCount - a.confluenceCount || b.totalTickets - a.totalTickets || a.ball - b.ball);

  console.log("[Confluence Matrix for Draw #470]");
  console.table(
    confluenceMatrix.map((r) => ({
      Ball: r.ball,
      "Confluence (0-4)": `${r.confluenceCount}/4`,
      Tier: r.tier,
      "Selecting Engines": r.engines.join(", "),
      "Total Slips": r.totalTickets,
      "Breakdown (F/Q/D/CM)": r.breakdown,
    }))
  );

  const quadBall = confluenceMatrix.filter((r) => r.confluenceCount === 4).map((r) => r.ball);
  const triBalls = confluenceMatrix.filter((r) => r.confluenceCount >= 3).map((r) => r.ball);

  console.log(`\nQuad Consensus Ball (4/4): [${quadBall.join(", ")}]`);
  console.log("--------------------------------------------------------------------------------");
  console.log("   DRAW #470 ACTIVE ENGINE PREDICTION PORTFOLIOS");
  console.log("--------------------------------------------------------------------------------");
  console.log("\n[1. Forensic Quantitative Engine (10 Candidates)]");
  forensicActiveCandidates.forEach((c, idx) => {
    console.log(`   S${idx + 1} (${c.strategyTag}): [${c.numbers.join(", ")}] CB: ${c.cashBall} | Sum: ${c.sum} | Parity: ${c.oddEvenRatio}`);
  });
  console.log("\n[1b. Forensic Stefan Mandel 10-Slip Covering Array Wheel (over 16-ball Invariant Core)]");
  console.log(`   16-Ball Invariant Core: [${forensicAttractorCore.join(", ")}]`);
  forensicMandelSlips.forEach((s, idx) => {
    console.log(`   Slip #${idx + 1}: [${s.numbers.join(", ")}] CB: 3`);
  });

  console.log("\n[2. Quant100 Engine (5 Quant Sets)]");
  console.log(`   18-Ball Master Attractor Manifold: [${quantManifold.join(", ")}]`);
  quantSets.forEach((s) => {
    console.log(`   ${s.name} (${s.id}): [${s.numbers.join(", ")}] | Sum: ${s.sum} | Parity: ${s.oddEvenRatio}`);
  });

  console.log("\n[3. Diff28 Centroid Engine (5 Formula Sets)]");
  console.log(`   18-Ball Union Pool: [${diffUnion.join(", ")}]`);
  diffSets.forEach((s) => {
    console.log(`   ${s.name}: [${s.numbers.join(", ")}] | Sum: ${s.sum} | Parity: ${s.oddEvenRatio}`);
  });

  console.log("\n[4. Core Math Engine (Optimal Line + Trio + 5-Slip Covering Wheel)]");
  console.log(`   Optimal Line (Grade S): [${cmOptimalTicket.numbers.join(", ")}] CB: ${cmOptimalTicket.bonusBall}`);
  console.log(`   Trio Ensemble:`);
  cmTrio.forEach((t) => {
    console.log(`     ${t.label}: [${t.numbers.join(", ")}] CB: ${t.bonusBall}`);
  });
  console.log(`   5-Slip Covering Wheel:`);
  cmWheel.forEach((w) => {
    console.log(`     ${w.label}: [${w.numbers.join(", ")}] CB: ${w.bonusBall}`);
  });
  console.log("");

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Execution completed in ${elapsed}s.`);

  return {
    benchmarkReports,
    confluenceMatrix,
    quadBall,
    triBalls,
    forensicAttractorCore,
    forensicActiveCandidates,
    forensicMandelSlips,
    quantSets,
    quantManifold,
    diffSets,
    diffUnion,
    cmOptimalTicket,
    cmTrio,
    cmWheel,
  };
}

runBenchmark().catch((err) => {
  console.error("FATAL ERROR in benchmark_all_wfl_engines:", err);
  process.exit(1);
});
