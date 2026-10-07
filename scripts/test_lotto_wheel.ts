import { FastLotteryWheeler } from "../src/lib/FastLotteryWheeler";
import { MANDEL_COVERING_WHEEL_16_5BALL } from "../src/lib/lotto_forensic_engine";

function testMandelWheel() {
  const pool = Array.from({ length: 16 }, (_, i) => i);
  const targets = FastLotteryWheeler.kCombinations(pool, 4); // all 4-subsets
  console.log(`Total 4-combinations of 16: ${targets.length}`);

  let covered3 = 0;
  for (const tg of targets) {
    const hit = MANDEL_COVERING_WHEEL_16_5BALL.some(ticket => {
      const match = tg.filter(n => ticket.includes(n)).length;
      return match >= 3;
    });
    if (hit) covered3++;
  }
  console.log(`MANDEL_COVERING_WHEEL_16_5BALL 3-if-4 coverage: ${(covered3 / targets.length * 100).toFixed(1)}% (${covered3}/${targets.length})`);

  // Let's test FastLotteryWheeler.generateWheel on pool 16 or 18
  const generated16 = FastLotteryWheeler.generateWheel(pool, 5, 3, 4, 5);
  console.log(`FastLotteryWheeler C(16, 5, 3, 4) generated ${generated16.ticketCount} tickets.`);
}

testMandelWheel();
