import fs from "fs";
import path from "path";

async function main() {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath) && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(envLocalPath);
    } catch {
      // Ignore if environment already injected by CI/Vercel
    }
  }

  console.log("=================================================");
  console.log("AUTONOMOUS NLCB DRAW SYNC ENGINE");
  console.log("Timestamp:", new Date().toISOString());
  console.log("=================================================");

  const startTime = Date.now();
  const { runUnifiedSyncPipeline } = await import("../src/lib/sync_orchestrator");
  const { acquireSyncLock, releaseSyncLock } = await import("../src/lib/cron_auth");

  const lock = await acquireSyncLock("cron_sync_all", 0, 120);
  if (!lock.acquired) {
    console.log(`Another sync holds the active DB lock (retry in ${lock.retryAfterSeconds}s). Exiting cleanly.`);
    return;
  }

  try {
    const summary = await runUnifiedSyncPipeline({
      calibrate: true,
      reconcile: true,
      notify: true,
      audit: true,
      triggerSource: "autonomous-cli"
    });
    const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nSync finished in ${durationSec}s (totalDrawsAdded=${summary.totalDrawsAdded})`);
    console.log("Play Whe:", summary.results.playWhe);
    console.log("Lotto Plus:", summary.results.lottoPlus);
    console.log("Win For Life:", summary.results.winForLife);
    console.log("Cash Pot:", summary.results.cashPot);
    console.log("Pick 4:", summary.results.pick4);
    console.log("Watchdog:", summary.results.watchdog?.status, "lagging:", summary.results.watchdog?.laggingGamesCount);
  } finally {
    await releaseSyncLock("cron_sync_all", lock.ownerId, true);
  }
}

main().catch((err) => {
  console.error("Fatal sync error:", err);
  process.exit(1);
});
