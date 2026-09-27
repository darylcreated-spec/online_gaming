import { syncLatest, syncPlayWhe, syncWinForLife, syncCashPot, syncPick4 } from "../src/lib/scraper";
import { verifyPlayWhePredictions, generatePlayWhePredictions, getLocalDateString } from "../src/lib/predictions";
import { reviseAndAuditAfterDraw } from "../src/lib/winning_formula_engine";

async function main() {
  console.log("=================================================");
  console.log("🚀 AUTONOMOUS 24/7 NLCB DRAW SYNC ENGINE");
  console.log("Timestamp:", new Date().toISOString());
  console.log("=================================================");

  const startTime = Date.now();
  const [playWheResult, lottoResult, winForLifeResult, cashPotResult, pick4Result] = await Promise.allSettled([
    syncPlayWhe(false),
    syncLatest(false),
    syncWinForLife(false),
    syncCashPot(false),
    syncPick4(false)
  ]);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n⚡ Sync finished in ${durationSec}s`);
  console.log("Play Whe:", playWheResult.status === "fulfilled" ? playWheResult.value : playWheResult.reason);
  console.log("Lotto Plus:", lottoResult.status === "fulfilled" ? lottoResult.value : lottoResult.reason);
  console.log("Win For Life:", winForLifeResult.status === "fulfilled" ? winForLifeResult.value : winForLifeResult.reason);
  console.log("Cash Pot:", cashPotResult.status === "fulfilled" ? cashPotResult.value : cashPotResult.reason);
  console.log("Pick 4:", pick4Result.status === "fulfilled" ? pick4Result.value : pick4Result.reason);

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

  // Auto-audit Hot Picks and revised invariants
  try {
    const auditRes = await reviseAndAuditAfterDraw();
    console.log(`\n🔥 Hot Picks Revision & Live Audit Completed:`, auditRes);
  } catch (err) {
    console.warn("⚠️ Post-draw audit notice:", err);
  }
}

main().catch(err => {
  console.error("Fatal sync error:", err);
  process.exit(1);
});
