import { createClient } from '@libsql/client';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const db = createClient({ url: urlMatch![1].trim(), authToken: tokenMatch![1].trim() });

async function findOptimalAnchors() {
  // 1. LOTTO PLUS
  const lottoRes = await db.execute('SELECT draw_number, draw_date, num1, num2, num3, num4, num5 FROM draws ORDER BY draw_date ASC');
  const lottoDraws = lottoRes.rows.map(r => [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)]);
  
  const lottoCandidates = [
    [7, 11, 16, 28, 29], // Sum = 91, Parity: 3 odd (7, 11, 29), 2 even (16, 28). Top pair 28-29.
    [7, 16, 17, 23, 28], // Sum = 91, Parity: 3 odd (7, 17, 23), 2 even (16, 28). Top pair 16-17.
    [10, 11, 17, 25, 28], // Sum = 91, Parity: 3 odd (11, 17, 25), 2 even (10, 28). Top pair 10-17.
    [4, 11, 17, 28, 29], // Sum = 89, Parity: 3 odd (11, 17, 29), 2 even (4, 28).
    [7, 10, 17, 25, 31], // Sum = 90, Parity: 4 odd, 1 even.
    [11, 16, 17, 25, 28], // Sum = 97, High density
    [3, 11, 17, 28, 31], // Sum = 90
    [7, 9, 17, 28, 29],  // Sum = 90
  ];

  console.log('--- LOTTO PLUS (5/35) CANDIDATES AUDIT (Total ' + lottoDraws.length + ' draws) ---');
  for (const c of lottoCandidates) {
    let m2 = 0, m3 = 0, m4 = 0, m5 = 0;
    for (const d of lottoDraws) {
      const match = c.filter(b => d.includes(b)).length;
      if (match === 2) m2++;
      if (match === 3) m3++;
      if (match === 4) m4++;
      if (match === 5) m5++;
    }
    console.log(JSON.stringify(c), 'Sum:', c.reduce((a,b)=>a+b,0), 'M2:', m2, 'M3:', m3, 'M4:', m4, 'M5:', m5, 'Total Hits (>=2):', m2+m3+m4+m5);
  }

  // 2. WIN FOR LIFE
  const wflRes = await db.execute('SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6 FROM winforlife_draws ORDER BY draw_date ASC');
  const wflDraws = wflRes.rows.map(r => [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5), Number(r.num6)]);
  
  const wflCandidates = [
    [4, 7, 12, 19, 20, 26], // Sum: 88, Parity: 2 odd, 4 even. Top pairs: 7-12, 4-26, 7-19.
    [4, 7, 12, 15, 23, 26], // Sum: 87, Parity: 3 odd, 3 even. Top pairs: 7-12, 4-26, 23-26.
    [5, 8, 12, 19, 20, 23], // Sum: 87, Parity: 3 odd, 3 even.
    [1, 7, 12, 19, 22, 26], // Sum: 87, Parity: 3 odd, 3 even.
    [4, 7, 8, 19, 23, 26],  // Sum: 87, Parity: 3 odd, 3 even. Top pairs: 7-8, 23-26, 4-26, 7-19.
    [7, 8, 12, 15, 19, 26], // Sum: 87, Parity: 3 odd, 3 even.
  ];

  console.log('\n--- WIN FOR LIFE (6/28) CANDIDATES AUDIT (Total ' + wflDraws.length + ' draws) ---');
  for (const c of wflCandidates) {
    let m2 = 0, m3 = 0, m4 = 0, m5 = 0, m6 = 0;
    for (const d of wflDraws) {
      const match = c.filter(b => d.includes(b)).length;
      if (match === 2) m2++;
      if (match === 3) m3++;
      if (match === 4) m4++;
      if (match === 5) m5++;
      if (match === 6) m6++;
    }
    console.log(JSON.stringify(c), 'Sum:', c.reduce((a,b)=>a+b,0), 'M2:', m2, 'M3 (Free):', m3, 'M4 ($20):', m4, 'M5 ($1k):', m5, 'M6:', m6, 'Total Prize (>=3):', m3+m4+m5+m6);
  }

  // 3. CASH POT
  const cpRes = await db.execute('SELECT draw_number, draw_date, num1, num2, num3, num4, num5 FROM cashpot_draws ORDER BY draw_date ASC');
  const cpDraws = cpRes.rows.map(r => [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)]);
  
  const cpCandidates = [
    [2, 7, 10, 12, 17], // Sum: 48
    [6, 7, 10, 12, 17], // Sum: 52. Parity: 2 odd, 3 even. Top co-occurrences: 10-12, 7-10, 7-12, 10-17.
    [2, 6, 10, 15, 19], // Sum: 52. Parity: 2 odd, 3 even.
    [5, 8, 10, 12, 17], // Sum: 52. Parity: 2 odd, 3 even.
    [6, 7, 9, 12, 18],  // Sum: 52.
    [2, 7, 11, 15, 17], // Sum: 52.
    [6, 8, 10, 12, 15], // Sum: 51.
  ];

  console.log('\n--- CASH POT (5/20) CANDIDATES AUDIT (Total ' + cpDraws.length + ' draws) ---');
  for (const c of cpCandidates) {
    let m2 = 0, m3 = 0, m4 = 0, m5 = 0;
    for (const d of cpDraws) {
      const match = c.filter(b => d.includes(b)).length;
      if (match === 2) m2++;
      if (match === 3) m3++;
      if (match === 4) m4++;
      if (match === 5) m5++;
    }
    console.log(JSON.stringify(c), 'Sum:', c.reduce((a,b)=>a+b,0), 'M2:', m2, 'M3:', m3, 'M4:', m4, 'M5:', m5, 'Total Hits (>=2):', m2+m3+m4+m5);
  }
}

findOptimalAnchors().catch(console.error);
