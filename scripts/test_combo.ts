import { createClient } from "@libsql/client";
import * as fs from "fs";
import { generateForensicCandidateSets, WFLDraw } from "../src/lib/winforlife_forensic_engine";

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

  const testCount = draws.length - 15;

  // Let's test combining the candidate sets with covering wheels
  // Let's test a covering wheel on pool of 16 balls vs 18 balls
  // In combinatorial covering theory, an optimal covering array can be generated or fixed
  // Let's see what happens if pool is 16 balls, and we design an 8-slip or 10-slip covering wheel
  
  // Let's write an optimizer to find the wheel designs that maximize portfolio performance
  // while preserving the 6/6 Grand Annuity ($480k) and all 5/6 hits!
}

run();
