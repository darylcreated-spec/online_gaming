import { createClient } from '@libsql/client';
import * as fs from 'fs';
import { executeLottoForensicEngine, LottoDraw } from '../src/lib/lotto_forensic_engine';

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/TURSO_DATABASE_URL=(.+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=(.+)/);
const db = createClient({ url: urlMatch![1].trim(), authToken: tokenMatch![1].trim() });

async function checkLotto() {
  const lottoRows = await db.execute('SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) ASC');
  const lottoDraws: LottoDraw[] = lottoRows.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [Number(r.num1), Number(r.num2), Number(r.num3), Number(r.num4), Number(r.num5)].sort((a, b) => a - b),
    powerball: Number(r.powerball || 1)
  }));

  const lastDraw = lottoDraws[lottoDraws.length - 1];
  console.log('Total Lotto Draws in DB:', lottoDraws.length);
  console.log('Latest Lotto Draw in DB:', JSON.stringify(lastDraw));

  const engineResult = executeLottoForensicEngine(lottoDraws, 50);
  console.log('Next Target Draw Number:', engineResult.nextTargetDrawNumber);
  console.log('Invariant Subspace Pool (18 balls):', JSON.stringify(engineResult.invariantSubspace.pool));
  console.log('Dual-Core Pool (22 balls):', JSON.stringify(engineResult.invariantSubspace.dualCorePool));
  console.log('Bankers:', JSON.stringify(engineResult.invariantSubspace.bankerBalls));

  console.log('\n--- TOP CANDIDATE SETS ---');
  engineResult.nextCandidateSets.slice(0, 5).forEach((c, idx) => {
    console.log('Set ' + (idx + 1) + ' (' + c.name + '): [' + c.numbers.join(', ') + '] + PB: ' + c.powerball + ' | Sum: ' + c.sum + ' | Parity: ' + c.oddCount + 'O/' + (5 - c.oddCount) + 'E | Rationale: ' + c.rationale);
  });

  console.log('\n--- STEFAN MANDEL 5-SLIP COVERING WHEEL ---');
  engineResult.invariantSubspace.coveringTickets.slice(0, 5).forEach((t, idx) => {
    const sum = t.reduce((a, b) => a + b, 0);
    const odd = t.filter(x => x % 2 !== 0).length;
    console.log('Slip ' + (idx + 1) + ': [' + t.join(', ') + '] | Sum: ' + sum + ' | Parity: ' + odd + 'O/' + (5 - odd) + 'E');
  });

  console.log('\nRolling Window Capture Rates:');
  console.log(JSON.stringify(engineResult.invariantSubspace.rollingWindowCaptureRates, null, 2));
}

checkLotto().catch(console.error);
