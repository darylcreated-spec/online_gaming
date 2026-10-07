import { createClient } from "@libsql/client";
import * as fs from "fs";
import { executeLottoForensicEngine, LottoDraw } from "../src/lib/lotto_forensic_engine";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

async function main() {
  const lottoRows = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const lottoDraws: LottoDraw[] = lottoRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
    powerball: Number(r.powerball || 1)
  }));

  console.log(`Loaded ${lottoDraws.length} Lotto Plus draws.`);

  for (const sample of [50, 100, 200, lottoDraws.length - 15]) {
    const res = executeLottoForensicEngine(lottoDraws, sample);
    console.log(`\n--- Sample Horizon: ${sample} draws ---`);
    console.log(`Overall Capture (>=1): ${res.audit.overallCaptureRatePercent}%`);
    console.log(`>=2 Hits: ${res.audit.atLeastTwoHitsRatePercent}%`);
    console.log(`>=3 Hits (Prize Tier): ${res.audit.atLeastThreeHitsRatePercent}%`);
    console.log(`Match 5: ${res.audit.fiveHitsCount}, Match 4: ${res.audit.fourHitsCount}, Match 3: ${res.audit.threeHitsCount}, Match 2: ${res.audit.twoHitsCount}`);
    console.log(`Total Simulated Payout: $${res.audit.totalSimulatedPayoutTT.toLocaleString()} TT`);
    console.log(`Invariant Subspace rolling windows: 1-draw: ${res.invariantSubspace.rollingWindowCaptureRates.singleDrawThreePlusRate}%, 2-draw: ${res.invariantSubspace.rollingWindowCaptureRates.windowTwoDrawsRate}%, 3-draw: ${res.invariantSubspace.rollingWindowCaptureRates.windowThreeDrawsRate}%, 5-draw: ${res.invariantSubspace.rollingWindowCaptureRates.windowFiveDrawsRate}%`);
  }
}

main().catch(console.error);
