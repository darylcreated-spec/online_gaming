const { createClient } = require('@libsql/client');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/TURSO_DATABASE_URL=(.+)/)[1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)[1].trim();
const db = createClient({ url, authToken: token });

async function testDeduplicatedSets() {
  const queryRes = await db.execute(`
    SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6 
    FROM winforlife_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const draws = queryRes.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: r.draw_date,
    nums: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5), Number(r.num6)].sort((a,b) => a - b),
  }));

  const N = draws.length;

  function diff28(n) {
    const d = 28 - n;
    return d === 0 ? 28 : d;
  }

  function ensureSixDistinct(nums, rankedPool) {
    const distinct = Array.from(new Set(nums));
    let poolIdx = 0;
    while (distinct.length < 6 && poolIdx < rankedPool.length) {
      const candidate = rankedPool[poolIdx];
      if (!distinct.includes(candidate)) {
        distinct.push(candidate);
      }
      poolIdx++;
    }
    return distinct.sort((a,b) => a - b);
  }

  // Check last draw
  const latestDraw = draws[N - 1];
  console.log(`Latest draw: #${latestDraw.draw_number} (${latestDraw.draw_date}) => [${latestDraw.nums.join(', ')}]`);

  // Sliding window
  const freq28 = new Array(29).fill(0);
  const directFreq = new Array(29).fill(0);
  for (let w = 0; w < 5; w++) {
    draws[N - 1 - w].nums.forEach(n => {
      directFreq[n]++;
      freq28[diff28(n)]++;
    });
  }

  const rankedPool = [];
  for (let n = 1; n <= 28; n++) {
    const partner = diff28(n);
    const score = freq28[n] * 2.2 + freq28[partner] * 1.4 + directFreq[n] * 1.1;
    rankedPool.push({ n, score });
  }
  rankedPool.sort((a,b) => b.score - a.score || a.n - b.n);
  const poolNums = rankedPool.map(r => r.n);

  const S1 = ensureSixDistinct(latestDraw.nums.map(diff28), poolNums);
  const S2 = ensureSixDistinct(poolNums.slice(0, 6), poolNums);
  
  const comps = latestDraw.nums.map(diff28);
  const rawS3 = [latestDraw.nums[0], latestDraw.nums[1], latestDraw.nums[2], comps[3], comps[4], comps[5]];
  const S3 = ensureSixDistinct(rawS3, poolNums);

  const rawS4 = latestDraw.nums.map(n => {
    let v = (diff28(n) + 1) % 28;
    return v === 0 ? 28 : v;
  });
  const S4 = ensureSixDistinct(rawS4, poolNums);

  const S5 = poolNums.slice(0, 6).sort((a,b) => a - b);

  console.log('Set 1:', S1, 'length:', S1.length);
  console.log('Set 2:', S2, 'length:', S2.length);
  console.log('Set 3:', S3, 'length:', S3.length);
  console.log('Set 4:', S4, 'length:', S4.length);
  console.log('Set 5:', S5, 'length:', S5.length);
}

testDeduplicatedSets().catch(console.error);
