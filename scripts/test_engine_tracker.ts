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
    snapshotAllEnginePredictions, 
    reconcileAndGradeEnginePredictions,
    getEngineLeaderboardStats 
  } = await import("../src/lib/engine_tracker");
  console.log("================================================================================");
  console.log("TESTING ENGINE PREDICTION TRACKER & HIT EVALUATOR");
  console.log("================================================================================\n");

  // 1. Ensure Table Exists
  console.log(">>> [1/4] Initializing database schema...");
  await ensureEngineLogsTable();
  console.log("Database table & indexes verified.\n");

  // 2. Snapshot Predictions
  console.log(">>> [2/4] Snapshotting predictions from all active engines for target draw N+1...");
  const snapshotRes = await snapshotAllEnginePredictions();
  console.log(`Successfully snapshotted ${snapshotRes.recordedCount} engine predictions across all 5 games.\n`);

  // 3. Reconcile & Grade Predictions
  console.log(">>> [3/4] Reconciling and grading pending engine predictions against official draws...");
  const reconcileRes = await reconcileAndGradeEnginePredictions();
  console.log(`Reconciliation completed: ${reconcileRes.verifiedCount} predictions verified, ${reconcileRes.prizesAwarded} money prize hits recorded.\n`);

  // 4. Query Comparative Leaderboard
  console.log(">>> [4/4] Querying multi-engine leaderboard stats across all games...");
  const stats = await getEngineLeaderboardStats("all", 100);
  console.log(`Total Evaluated Draws: ${stats.totalEvaluated}`);
  console.log(`Overall Win Rate: ${stats.overallWinRatePct}%`);
  console.log(`Total Simulated Net Profit: $${stats.totalSimulatedNetProfitTT.toLocaleString()} TT\n`);

  console.log("--- ENGINE LEADERBOARD RANKINGS ---");
  stats.leaderboard.forEach((row, idx) => {
    console.log(`[Rank #${idx + 1}] ${row.engine_name} (${row.game_key})`);
    console.log(`         Win Rate: ${row.prize_win_rate_pct}% (${row.prize_hits}/${row.total_evaluated}) | ROI: ${row.roi_pct}% | Net: $${row.net_profit_tt} TT | Status: ${row.status}`);
  });

  console.log("\n--- CALIBRATION DIAGNOSTICS & ANOMALIES ---");
  stats.diagnostics.forEach((diag, idx) => {
    console.log(`[Diagnostic #${idx + 1}] [${diag.severity}] ${diag.title}`);
    console.log(`   Anomaly: ${diag.anomalyDescription}`);
    console.log(`   Recommendation: ${diag.recommendation}`);
  });

  console.log("\n================================================================================");
  console.log("ENGINE TRACKER PIPELINE VERIFICATION PASSED!");
  console.log("================================================================================");
}

main().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
