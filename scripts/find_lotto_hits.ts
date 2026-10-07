import { createClient } from "@libsql/client";
import * as fs from "fs";
import { executeLottoForensicEngine, LottoDraw } from "../src/lib/lotto_forensic_engine";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

async function findLottoHits() {
  const lottoRows = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const draws: LottoDraw[] = lottoRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
    powerball: Number(r.powerball || 1)
  }));

  const res = executeLottoForensicEngine(draws, draws.length - 15);
  console.log(`Audited ${res.audit.testedDrawsCount} draws.`);
  
  const match4And5 = res.audit.drawByDrawLog.filter(e => e.bestPortfolioHitCount >= 4);
  console.log(`Found ${match4And5.length} Match 4+ hits:`);
  match4And5.forEach(h => {
    console.log(`Draw #${h.drawNumber} (${h.drawDate}): Best Hits = ${h.bestPortfolioHitCount}/5, Strategy: ${h.bestStrategyName}, Drawn: [${h.drawnNumbers.join(", ")}], Ticket: [${h.bestPortfolioSet.join(", ")}], PB Matched: ${h.powerballMatched}, Prize: ${h.prizeWon}`);
  });
}

findLottoHits().catch(console.error);
