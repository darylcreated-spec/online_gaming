import { createClient } from "@libsql/client";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const url = urlMatch ? urlMatch[1].trim() : "file:./data/lotto.db";
const token = tokenMatch ? tokenMatch[1].trim() : undefined;
const db = createClient({ url, authToken: token });

async function run() {
  console.log("Analyzing empirical draws for static continuous anchor ticket selection...");
  
  // 1. Lotto Plus (5 of 35)
  const lottoRes = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY draw_date DESC");
  const lottoDraws = lottoRes.rows;
  console.log(`Lotto Plus draws loaded: ${lottoDraws.length}`);
  
  const lottoFreq: Record<number, number> = {};
  for (let i = 1; i <= 35; i++) lottoFreq[i] = 0;
  let lottoSumTotal = 0;
  
  lottoDraws.forEach(d => {
    const balls = [Number(d.num1), Number(d.num2), Number(d.num3), Number(d.num4), Number(d.num5)];
    const sum = balls.reduce((a, b) => a + b, 0);
    lottoSumTotal += sum;
    balls.forEach(b => {
      lottoFreq[b] = (lottoFreq[b] || 0) + 1;
    });
  });
  
  const lottoAvgSum = lottoSumTotal / lottoDraws.length;
  const sortedLottoBalls = Object.entries(lottoFreq)
    .map(([k, v]) => ({ ball: Number(k), count: v }))
    .sort((a, b) => b.count - a.count);
    
  console.log(`Lotto Plus Average Sum: ${lottoAvgSum.toFixed(2)} (Theoretical E[Sum]: ${(5 * 36 / 2).toFixed(2)} = 90)`);
  console.log("Lotto Plus Top 15 High-Frequency Invariant Balls:", sortedLottoBalls.slice(0, 15));

  // 2. Win For Life (6 of 28)
  const wflRes = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6 FROM winforlife_draws ORDER BY draw_date DESC");
  const wflDraws = wflRes.rows;
  console.log(`\nWin For Life draws loaded: ${wflDraws.length}`);
  
  const wflFreq: Record<number, number> = {};
  for (let i = 1; i <= 28; i++) wflFreq[i] = 0;
  let wflSumTotal = 0;
  
  wflDraws.forEach(d => {
    const balls = [Number(d.num1), Number(d.num2), Number(d.num3), Number(d.num4), Number(d.num5), Number(d.num6)];
    const sum = balls.reduce((a, b) => a + b, 0);
    wflSumTotal += sum;
    balls.forEach(b => {
      wflFreq[b] = (wflFreq[b] || 0) + 1;
    });
  });
  
  const wflAvgSum = wflSumTotal / wflDraws.length;
  const sortedWflBalls = Object.entries(wflFreq)
    .map(([k, v]) => ({ ball: Number(k), count: v }))
    .sort((a, b) => b.count - a.count);

  console.log(`Win For Life Average Sum: ${wflAvgSum.toFixed(2)} (Theoretical E[Sum]: ${(6 * 29 / 2).toFixed(2)} = 87)`);
  console.log("Win For Life Top 14 High-Frequency Invariant Balls:", sortedWflBalls.slice(0, 14));

  // 3. Cash Pot (5 of 20)
  const cpRes = await db.execute("SELECT draw_number, draw_date, num1, num2, num3, num4, num5 FROM cashpot_draws ORDER BY draw_date DESC");
  const cpDraws = cpRes.rows;
  console.log(`\nCash Pot draws loaded: ${cpDraws.length}`);
  
  const cpFreq: Record<number, number> = {};
  for (let i = 1; i <= 20; i++) cpFreq[i] = 0;
  let cpSumTotal = 0;
  
  cpDraws.forEach(d => {
    const balls = [Number(d.num1), Number(d.num2), Number(d.num3), Number(d.num4), Number(d.num5)];
    const sum = balls.reduce((a, b) => a + b, 0);
    cpSumTotal += sum;
    balls.forEach(b => {
      cpFreq[b] = (cpFreq[b] || 0) + 1;
    });
  });
  
  const cpAvgSum = cpSumTotal / cpDraws.length;
  const sortedCpBalls = Object.entries(cpFreq)
    .map(([k, v]) => ({ ball: Number(k), count: v }))
    .sort((a, b) => b.count - a.count);

  console.log(`Cash Pot Average Sum: ${cpAvgSum.toFixed(2)} (Theoretical E[Sum]: ${(5 * 21 / 2).toFixed(2)} = 52.5)`);
  console.log("Cash Pot Top 12 High-Frequency Invariant Balls:", sortedCpBalls.slice(0, 12));

  // Co-occurrence graph pairs
  function getTopPairs(draws: any[], numCount: number) {
    const pairMap: Record<string, number> = {};
    draws.forEach(d => {
      const balls = [];
      for (let i = 1; i <= numCount; i++) balls.push(Number(d[`num${i}`]));
      balls.sort((a, b) => a - b);
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const key = `${balls[i]}-${balls[j]}`;
          pairMap[key] = (pairMap[key] || 0) + 1;
        }
      }
    });
    return Object.entries(pairMap)
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  console.log("\nTop Co-occurring Pairs Lotto Plus:", getTopPairs(lottoDraws, 5));
  console.log("Top Co-occurring Pairs Win For Life:", getTopPairs(wflDraws, 6));
  console.log("Top Co-occurring Pairs Cash Pot:", getTopPairs(cpDraws, 5));
}

run().catch(console.error);

run().catch(console.error);
