import { createClient } from "@libsql/client";
import * as fs from "fs";
import { executeWinForLifeForensicEngine, WFLDraw } from "../src/lib/winforlife_forensic_engine";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/TURSO_DATABASE_URL=(.+)/)![1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)![1].trim();
const db = createClient({ url, authToken: token });

async function analyzeMisses() {
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

  const output = executeWinForLifeForensicEngine(draws, draws.length - 15);
  const log = output.audit.drawByDrawLog;
  
  let missesWithPool3Plus = 0;
  let missesWithPool4Plus = 0;
  let totalMisses = 0;

  for (const entry of log) {
    if (!entry.isWinningTier) {
      totalMisses++;
      if (entry.invariantPoolCapturedCount >= 3) missesWithPool3Plus++;
      if (entry.invariantPoolCapturedCount >= 4) missesWithPool4Plus++;
    }
  }

  console.log(`Total Misses: ${totalMisses}/${log.length}`);
  console.log(`Misses where pool16 had >= 3 winning numbers: ${missesWithPool3Plus}/${totalMisses} (${(missesWithPool3Plus/totalMisses*100).toFixed(1)}%)`);
  console.log(`Misses where pool16 had >= 4 winning numbers: ${missesWithPool4Plus}/${totalMisses} (${(missesWithPool4Plus/totalMisses*100).toFixed(1)}%)`);
}

analyzeMisses();
