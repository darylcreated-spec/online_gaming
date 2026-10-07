import { createClient } from "@libsql/client";
import * as fs from "fs";
import { executeLottoForensicEngine, LottoDraw, MANDEL_COVERING_WHEEL_18_5BALL, HIGH_DENSITY_WHEEL_18_5BALL, computeUnifiedSynthesisScores, generateLottoForensicCandidateSets } from "../src/lib/lotto_forensic_engine";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

async function testAudit() {
  const lottoRows = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC");
  const draws: LottoDraw[] = lottoRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
    powerball: Number(r.powerball || 1)
  }));

  const N = draws.length;
  const sampleSize = 50;
  const startIdx = Math.max(15, N - sampleSize);

  let m3Hits = 0, m4Hits = 0, m5Hits = 0;
  for (let i = startIdx; i < N; i++) {
    const prior = draws.slice(0, i);
    const target = draws[i];
    const targetSet = new Set(target.numbers);

    const { pool18 } = computeUnifiedSynthesisScores(prior);
    const candidateSets = generateLottoForensicCandidateSets(prior);
    const mandelWheelSlips = MANDEL_COVERING_WHEEL_18_5BALL.map((indices, idx) => ({
      strategyName: `Mandel Covering Wheel #${idx + 1}`,
      numbers: indices.map(ind => pool18[ind % pool18.length]).sort((a, b) => a - b)
    }));
    const highDensitySlips = HIGH_DENSITY_WHEEL_18_5BALL.map((indices, idx) => ({
      strategyName: `High-Density Sieve #${idx + 1}`,
      numbers: indices.map(ind => pool18[ind % pool18.length]).sort((a, b) => a - b)
    }));

    const portfolio = [
      ...candidateSets.map(cs => ({ strategyName: cs.strategyName, numbers: cs.numbers })),
      ...mandelWheelSlips,
      ...highDensitySlips
    ];

    let bestH = 0;
    portfolio.forEach(t => {
      const h = t.numbers.filter(n => targetSet.has(n)).length;
      if (h > bestH) bestH = h;
    });

    if (bestH === 5) m5Hits++;
    if (bestH === 4) m4Hits++;
    if (bestH === 3) m3Hits++;
  }

  console.log(`Audited ${sampleSize} draws with complete portfolio (Candidate Sets + Mandel + High-Density):`);
  console.log(`Match 5: ${m5Hits}`);
  console.log(`Match 4: ${m4Hits}`);
  console.log(`Match 3: ${m3Hits}`);
  console.log(`Prize Hit Rate (>=3): ${((m3Hits + m4Hits + m5Hits) / sampleSize * 100).toFixed(1)}%`);
}

testAudit().catch(console.error);
