import { createClient } from "@libsql/client";
import * as fs from "fs";
import { executeLottoForensicEngine, LottoDraw } from "../src/lib/lotto_forensic_engine";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

async function run() {
  const lottoRows = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const lottoDraws: LottoDraw[] = lottoRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
    powerball: Number(r.powerball || 1)
  }));

  const res = executeLottoForensicEngine(lottoDraws, 50);

  console.log("TARGET_DRAW:" + res.nextTargetDrawNumber);
  console.log("LATEST_DRAW:" + res.latestDraw.draw_number + "|" + res.latestDraw.draw_date + "|" + res.latestDraw.numbers.join(",") + "|PB:" + res.latestDraw.powerball);
  console.log("CORE18:" + res.invariantSubspace.pool.join(","));
  console.log("DUAL_CORE22:" + res.invariantSubspace.dualCorePool.join(","));
  console.log("BANKERS:" + res.invariantSubspace.bankerBalls.join(","));

  console.log("---CANDIDATES---");
  res.nextCandidateSets.forEach((c, idx) => {
    console.log(`CAND_${idx + 1}:${c.strategyName}|${c.numbers.join(",")}|SUM:${c.sum}|PB:${c.powerball}`);
  });

  console.log("---MANDEL_WHEEL_TOP5---");
  res.invariantSubspace.coveringTickets.slice(0, 5).forEach((t, idx) => {
    console.log(`WHEEL_${idx + 1}:${t.join(",")}`);
  });

  console.log("---HIGH_DENSITY_TOP5---");
  res.invariantSubspace.highDensityTickets.slice(0, 5).forEach((t, idx) => {
    console.log(`HD_${idx + 1}:${t.join(",")}`);
  });
}

run().catch(console.error);
