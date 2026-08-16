import { syncLatest, syncPlayWhe, syncWinForLife } from "../src/lib/scraper";

async function main() {
  console.log("=================================================");
  console.log("🚀 AUTONOMOUS 24/7 NLCB DRAW SYNC ENGINE");
  console.log("Timestamp:", new Date().toISOString());
  console.log("=================================================");

  const startTime = Date.now();
  const [playWheResult, lottoResult, winForLifeResult] = await Promise.allSettled([
    syncPlayWhe(false),
    syncLatest(false),
    syncWinForLife(false)
  ]);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n⚡ Sync finished in ${durationSec}s`);
  console.log("Play Whe:", playWheResult.status === "fulfilled" ? playWheResult.value : playWheResult.reason);
  console.log("Lotto Plus:", lottoResult.status === "fulfilled" ? lottoResult.value : lottoResult.reason);
  console.log("Win For Life:", winForLifeResult.status === "fulfilled" ? winForLifeResult.value : winForLifeResult.reason);
}

main().catch(err => {
  console.error("Fatal sync error:", err);
  process.exit(1);
});
