import { createClient } from "@libsql/client";
import * as fs from "fs";
import {
  executePlayWheForensicEngine,
  runPlayWheWalkForwardAudit,
  PlayWheDraw
} from "../src/lib/playwhe_forensic_engine";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

async function run() {
  console.log("================================================================================");
  console.log("PLAY WHE EMPIRICAL FORENSIC EVALUATION (TURSO ARCHIVE)");
  console.log("================================================================================\n");

  const t0 = Date.now();
  const res = await db.execute(`
    SELECT draw_number, draw_date, draw_time_slot, winning_number 
    FROM playwhe_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);
  console.log(`Fetched ${res.rows.length} rows from Turso in ${Date.now() - t0}ms.`);

  const draws: PlayWheDraw[] = res.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    draw_time_slot: String(r.draw_time_slot || "Morning").trim(),
    winning_number: Number(r.winning_number)
  })).filter(d => d.winning_number >= 1 && d.winning_number <= 36);

  console.log(`Valid draws in range 1-36: ${draws.length}\n`);

  // 1. ENGINE SYNTHESIS ON LATEST DRAW
  const engineRes = executePlayWheForensicEngine(draws, 100);
  console.log(`>>> Target Draw: #${engineRes.nextTargetDrawNumber} (${engineRes.nextTargetTimeSlot})`);
  console.log(`>>> Candidate Marks Generated (${engineRes.nextCandidateSets.length}):`);
  engineRes.nextCandidateSets.forEach((c, idx) => {
    console.log(`    [${idx + 1}] Mark #${String(c.markNumber).padStart(2, "0")} (${c.markName}) - ${c.strategyName} (Score: ${c.compositeScore})`);
  });

  console.log("\n>>> Attractor Core Telemetry:");
  console.log(`    Primary 12-Core: [${engineRes.attractorCore.pool.join(", ")}]`);
  console.log(`    Extended 16-Core: [${engineRes.attractorCore.extendedPool.join(", ")}]`);
  console.log(`    Banker Marks: [${engineRes.attractorCore.bankerMarks.join(", ")}]`);
  console.log(`    1-Draw Capture Rate: ${engineRes.attractorCore.captureRatePercent}%`);
  console.log(`    2-Draw Window Capture: ${engineRes.attractorCore.rollingWindowCaptureRates.windowTwoDrawsRate}%`);
  console.log(`    3-Draw Window Capture: ${engineRes.attractorCore.rollingWindowCaptureRates.windowThreeDrawsRate}%`);
  console.log(`    5-Draw Window Capture: ${engineRes.attractorCore.rollingWindowCaptureRates.windowFiveDrawsRate}% (16-Core: ${engineRes.attractorCore.rollingWindowCaptureRates.windowFiveExtendedRate}%)`);

  // 2. MULTI-HORIZON WALK-FORWARD AUDIT BENCHMARKS
  console.log("\n>>> Multi-Horizon Walk-Forward Audit Validation:");
  const horizons = [50, 100, 200, 500, 1000, draws.length - 30];

  for (const h of horizons) {
    const tStart = Date.now();
    const auditRes = runPlayWheWalkForwardAudit(draws, h);
    const dur = Date.now() - tStart;
    const label = h === draws.length - 30 ? `FULL ARCHIVE (${auditRes.testedDrawsCount})` : `${h} DRAWS`;
    console.log(`\n    --- Horizon: ${label} (Computed in ${dur}ms) ---`);
    console.log(`    Tested Draws: ${auditRes.testedDrawsCount}`);
    console.log(`    Top 1 Banker Hit Rate: ${auditRes.top1HitRatePercent}% (${auditRes.top1HitsCount} hits, vs 2.8% random)`);
    console.log(`    Top 3 Hit Rate: ${auditRes.top3HitRatePercent}% (${auditRes.top3HitsCount} hits, vs 8.3% random)`);
    console.log(`    Top 5 Portfolio Hit Rate: ${auditRes.top5HitRatePercent}% (${auditRes.top5HitsCount} hits, vs 13.9% random)`);
    console.log(`    Top 10 Macro Hit Rate: ${auditRes.top10HitRatePercent}% (${auditRes.top10HitsCount} hits, vs 27.8% random)`);
    console.log(`    12-Core Capture Rate: ${auditRes.coreCaptureRatePercent}% (${auditRes.coreHitsCount} hits, vs 33.3% random)`);
    console.log(`    Top-5 Play Payout: $${auditRes.totalSimulatedPayoutTT.toLocaleString()} TT, Net: $${auditRes.netSimulatedProfitTT} TT, ROI: ${auditRes.simulatedRoiPercent}%`);
    console.log(`    Top-1 Banker Payout: $${auditRes.top1SimulatedPayoutTT.toLocaleString()} TT, Net: $${auditRes.top1NetSimulatedProfitTT} TT, ROI: ${auditRes.top1SimulatedRoiPercent}%`);

    if (h === 100 && auditRes.strategyBreakdown) {
      console.log(`\n    Top Strategies (100 draws):`);
      auditRes.strategyBreakdown.slice(0, 5).forEach(sb => {
        console.log(`      * ${sb.strategyName}: ${sb.hitsCount} hits (${sb.hitRatePercent}%)`);
      });
    }
  }

  // 3. CLEANUP TEMPORARY FILES IF PRESENT
  const tempFiles = [
    "scripts/test_engine_perf.ts",
    "scripts/test_slot_trans.ts",
    "scripts/test_crt.ts",
    "scripts/test_online_audit.ts"
  ];
  for (const tf of tempFiles) {
    if (fs.existsSync(tf)) {
      fs.unlinkSync(tf);
    }
  }

  console.log("\n================================================================================");
  console.log("PLAY WHE EMPIRICAL EVALUATION COMPLETED SUCCESSFULLY!");
  console.log("================================================================================");
}

run().catch(console.error);
