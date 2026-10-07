import { createClient } from "@libsql/client";
import * as fs from "fs";
import { executePick4ForensicEngine, Pick4Draw } from "../src/lib/pick4_forensic_engine";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/TURSO_DATABASE_URL=(.+)/)![1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)![1].trim();
const db = createClient({ url, authToken: token });

async function run() {
  const res = await db.execute(`
    SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 
    FROM pick4_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const draws: Pick4Draw[] = res.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    draw_time_slot: String(r.draw_time_slot || "MORNING"),
    digit1: Number(r.digit1),
    digit2: Number(r.digit2),
    digit3: Number(r.digit3),
    digit4: Number(r.digit4)
  }));

  console.log(`Loaded ${draws.length} Pick 4 draws.`);

  for (const depth of [50, 100, 200, 500, draws.length - 20]) {
    const output = executePick4ForensicEngine(draws, depth);
    const audit = output.audit;
    console.log(`\n--- DEPTH: ${depth} (Tested: ${audit.testedDrawsCount}) ---`);
    console.log(`Straight Hits: ${audit.straightHitsCount} | Box Hits: ${audit.boxHitsCount} | 3+ Digits: ${audit.atLeastThreeDigitsRatePercent}%`);
    console.log(`Total Simulated Payout: $${audit.totalSimulatedPayoutTT.toLocaleString()} TT`);
  }
}

run().catch(console.error);
