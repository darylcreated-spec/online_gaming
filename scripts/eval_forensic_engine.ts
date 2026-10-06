import { createClient } from "@libsql/client";
import * as fs from "fs";
import { executeWinForLifeForensicEngine, WFLDraw } from "../src/lib/winforlife_forensic_engine";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/TURSO_DATABASE_URL=(.+)/)![1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)![1].trim();
const db = createClient({ url, authToken: token });

async function run() {
  const res = await db.execute(`
    SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball 
    FROM winforlife_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const draws: WFLDraw[] = res.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [
      Number(r.num1),
      Number(r.num2),
      Number(r.num3),
      Number(r.num4),
      Number(r.num5),
      Number(r.num6)
    ].sort((a, b) => a - b),
    cash_ball: Number(r.cash_ball || 1)
  }));

  console.log(`Loaded ${draws.length} draws from database.`);

  for (const depth of [50, 100, 200, draws.length - 15]) {
    const output = executeWinForLifeForensicEngine(draws, depth);
    const audit = output.audit;
    const wins = audit.threeHitsCount + audit.fourHitsCount + audit.fiveHitsCount + audit.sixHitsCount;
    const winRate = ((wins / audit.testedDrawsCount) * 100).toFixed(1);
    console.log(`\n--- DEPTH: ${depth} (Tested: ${audit.testedDrawsCount}) ---`);
    console.log(`Prize Wins: ${wins}/${audit.testedDrawsCount} (${winRate}%)`);
    console.log(`Match 6: ${audit.sixHitsCount} | Match 5: ${audit.fiveHitsCount} | Match 4: ${audit.fourHitsCount} | Match 3: ${audit.threeHitsCount}`);
    console.log(`Payout: $${audit.totalSimulatedPayoutTT.toLocaleString()} TT`);
    console.log(`Pool Capture >=4: ${audit.drawByDrawLog.filter(e => e.invariantPoolCapturedCount >= 4).length}/${audit.testedDrawsCount}`);
    console.log(`Pool Capture >=5: ${audit.drawByDrawLog.filter(e => e.invariantPoolCapturedCount >= 5).length}/${audit.testedDrawsCount}`);
    console.log(`Pool Capture ==6: ${audit.drawByDrawLog.filter(e => e.invariantPoolCapturedCount === 6).length}/${audit.testedDrawsCount}`);
  }
}

run().catch(console.error);
