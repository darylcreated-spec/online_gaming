import { syncLatest, syncPlayWhe, syncWinForLife } from "../src/lib/scraper";
import { verifyPlayWhePredictions, generatePlayWhePredictions, getLocalDateString } from "../src/lib/predictions";

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

  // Auto-verify predictions and prepare next slot
  try {
    const verResult = await verifyPlayWhePredictions();
    console.log(`\n🎯 Play Whe Verification: Verified ${verResult.verifiedCount} draws (${verResult.hitsAdded} hits recorded)`);
    
    // Ensure all 4 slots are ready for today
    const todayStr = getLocalDateString();
    for (const slot of ["MORNING", "MIDDAY", "AFTERNOON", "EVENING"]) {
      await generatePlayWhePredictions(todayStr, slot);
    }
    console.log("✅ Next Play Whe predictions prepared and ready.");
  } catch (err) {
    console.warn("⚠️ Post-sync prediction update notice:", err);
  }
}

main().catch(err => {
  console.error("Fatal sync error:", err);
  process.exit(1);
});
