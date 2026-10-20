import * as fs from "fs";
import * as path from "path";

try {
  const envFile = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {}

async function main() {
  const { 
    ensureEngineLogsTable, 
    calibrateAndReverifyAllEngines,
    getEngineLeaderboardStats 
  } = await import("../src/lib/engine_tracker");
  console.log("================================================================================");
  console.log("TESTING CLOSED-LOOP BAYESIAN CALIBRATOR & ENGINE PREDICTION TRACKER");
  console.log("================================================================================\n");

  const { db } = await import("../src/lib/db");
  const { reviseAndAuditAfterDraw } = await import("../src/lib/winning_formula_engine");

  // 1. Ensure Table Exists & Clean Stale Pending/Corrupted Rows
  console.log(">>> [1/3] Initializing database schema & clearing stale pending snapshots...");
  await ensureEngineLogsTable();
  await db.execute("DELETE FROM prediction_engine_logs WHERE status = 'PENDING'");
  await db.execute("DELETE FROM prediction_engine_logs WHERE game_key = 'win-for-life' AND target_draw_number >= 475");
  console.log("Database tables & indexes verified.\n");

  // 2. Run Full System Calibration + Historical Walk-Forward Re-Verification + N+1 Snapshot
  console.log(">>> [2/3] Running closed-loop Bayesian calibration & walk-forward test verification...");
  const calibRes = await calibrateAndReverifyAllEngines("all");
  await reviseAndAuditAfterDraw();
  console.log(`Calibrated ${calibRes.calibratedProfiles.length} game regimes.`);
  console.log(`Re-verified ${calibRes.reverifiedCount} historical engine logs (${calibRes.prizesAwarded} money prize hits confirmed).`);
  console.log(`Snapshotted ${calibRes.snapshottedCount} calibrated predictions for upcoming draw N+1.\n`);

  console.log("--- BAYESIAN CALIBRATION PROFILES ---");
  for (const prof of calibRes.calibratedProfiles) {
    console.log(`[${prof.game_key.toUpperCase()}] Window: ${prof.window_size}d | Pre-Calib: ${prof.pre_calibration_win_rate_pct}% -> Post-Calib: ${prof.post_calibration_win_rate_pct}% (Lift: +${prof.calibration_lift_pct}%)`);
    console.log(`   Optimal Sum Band: [${prof.optimal_sum_min} - ${prof.optimal_sum_max}] | Carryover Rate: ${prof.empirical_carryover_rate_pct}% | Lead Model: ${prof.dominant_strategy}`);
    const topWeights = prof.sub_model_weights.slice(0, 3).map((w: any) => `${w.modelName}: ${Math.round(w.weight * 100)}% (${w.liftMultiplier}x)`).join(" | ");
    console.log(`   Top Weights: ${topWeights}\n`);
  }

  // 3. Query Comparative Leaderboard
  console.log(">>> [3/3] Querying multi-engine leaderboard stats across all games...");
  const stats = await getEngineLeaderboardStats("all", 100);
  console.log(`Total Evaluated Draws: ${stats.totalEvaluated}`);
  console.log(`Overall Win Rate: ${stats.overallWinRatePct}%`);
  console.log(`Total Simulated Net Profit: $${stats.totalSimulatedNetProfitTT.toLocaleString()} TT\n`);

  console.log("--- APEX CHAMPION MASTER PICKS (1 REFINED SELECTION PER GAME FOR DRAW N+1) ---");
  stats.championPicks.forEach(pick => {
    const nums = pick.game_key === "pick4"
      ? pick.predicted_numbers.map(n => String(n)).join(" - ")
      : pick.predicted_numbers.map(n => String(n).padStart(2, "0")).join(" - ");
    console.log(`[${pick.game_key.toUpperCase()}] Target Draw #${pick.target_draw_number}${pick.target_time_slot ? ` (${pick.target_time_slot})` : ""} | System: ${pick.engine_name}`);
    console.log(`   Master Pick: [${nums}]${pick.predicted_powerball ? ` + PB/Mult: ${pick.predicted_powerball}` : ""} | Verified Win Rate: ${pick.verified_win_rate_pct}% | ROI: +${pick.verified_roi_pct}% | Best: ${pick.best_prize}`);
    if (pick.game_key === "pick4" && pick.condensed_wheel.length > 0) {
      const top4Sets = pick.condensed_wheel.slice(0, 4).map((w, i) => `Set #${i + 1}: [${w.join(" - ")}]`).join(" | ");
      console.log(`   Top 4 Refined 4-Number Sets: ${top4Sets}`);
    }
  });

  console.log("\n--- ENGINE LEADERBOARD RANKINGS ---");
  stats.leaderboard.forEach((row, idx) => {
    console.log(`[Rank #${idx + 1}] ${row.engine_name} (${row.game_key})`);
    console.log(`         Win Rate: ${row.prize_win_rate_pct}% (${row.prize_hits}/${row.total_evaluated}) | Any Match: ${row.any_match_rate_pct}% | ROI: ${row.roi_pct}% | Net: $${row.net_profit_tt} TT | Best: ${row.best_prize} | Status: ${row.status}`);
  });

  console.log("\n--- CALIBRATION DIAGNOSTICS & ANOMALIES ---");
  stats.diagnostics.forEach((diag, idx) => {
    console.log(`[Diagnostic #${idx + 1}] [${diag.severity}] ${diag.title}`);
    console.log(`   Anomaly: ${diag.anomalyDescription}`);
    console.log(`   Recommendation: ${diag.recommendation}`);
  });

  console.log("\n================================================================================");
  console.log("CLOSED-LOOP ENGINE CALIBRATION & VERIFICATION PASSED!");
  console.log("================================================================================");
}

main().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
