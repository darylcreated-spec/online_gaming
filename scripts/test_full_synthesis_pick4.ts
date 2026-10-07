import { createClient } from "@libsql/client";
import * as fs from "fs";
import { executePick4ForensicEngine, Pick4Draw } from "../src/lib/pick4_forensic_engine";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/TURSO_DATABASE_URL=(.+)/)![1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)![1].trim();
const db = createClient({ url, authToken: token });

async function run() {
  const rs = await db.execute(`
    SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 
    FROM pick4_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const draws: Pick4Draw[] = rs.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    draw_time_slot: String(r.draw_time_slot || "MORNING"),
    digit1: Number(r.digit1),
    digit2: Number(r.digit2),
    digit3: Number(r.digit3),
    digit4: Number(r.digit4)
  }));

  console.log(`Analyzing ${draws.length} Pick 4 draws using unified forensic engine.`);

  for (const depth of [50, 100, 200, 500, 1000, draws.length - 20]) {
    const result = executePick4ForensicEngine(draws, depth);
    const audit = result.audit;

    console.log(`\n========================================`);
    console.log(`HORIZON: ${depth === draws.length - 20 ? "FULL ARCHIVE" : depth} (Tested: ${audit.testedDrawsCount})`);
    console.log(`Prize Capture Rate: ${audit.prizeCaptureRatePercent}%`);
    console.log(`Straight Hits: ${audit.straightHitsCount} ($${(audit.straightHitsCount * 5000).toLocaleString()} TT)`);
    console.log(`Box Hits: ${audit.boxHitsCount} (24-Way: ${audit.box24WayHitsCount}, 12-Way: ${audit.box12WayHitsCount}, 6-Way: ${audit.box6WayHitsCount}, 4-Way: ${audit.box4WayHitsCount})`);
    console.log(`Front/Back 3 Hits: ${audit.frontBack3HitsCount} ($${(audit.frontBack3HitsCount * 500).toLocaleString()} TT)`);
    console.log(`Pair Hits (Front/Back/Split): ${audit.pairHitsCount}`);
    console.log(`3+ Exact Positions: ${audit.atLeastThreeDigitsRatePercent}%`);
    console.log(`Total Simulated Payout: $${audit.totalSimulatedPayoutTT.toLocaleString()} TT`);
  }
}

run().catch(console.error);
