process.env.TURSO_DATABASE_URL = 'libsql://online-daryl-created.aws-us-east-2.turso.io';
process.env.TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQxMTgwMzQsImlkIjoiMDE5ZjY1YjgtMTcwMS03YmVhLWI1MjItZGYxZjdiZjE1NDg1Iiwia2lkIjoidEpUaFlJVDIzRGZJRGZlWWo3ZEltaEppUUc2RmloUzhmUGtQVHBkVTNkMCIsInJpZCI6ImViMTJjYjcyLWFhOWEtNDk1Yy04ODc4LTE5NTE1ODQ4OWM1ZCJ9.OEBf8RdVvnqXfFSas4_ciVXhfcmVuywRbVobCS2Y1ERhCS2dnE12xm1FI7oLraZoxxv4ZLA0UAVREJK-K5c0Dg';

const { query } = require('../src/lib/db.ts');

async function main() {
  console.log('--- Inspecting Sunday draws from Turso Cloud DB ---');

  // Play Whe Sunday draws
  const pw = await query(\"SELECT draw_number, draw_date, draw_time_slot FROM playwhe_draws WHERE strftime('%w', draw_date) = '0' ORDER BY draw_date DESC, CAST(draw_number AS INTEGER) DESC LIMIT 10\");
  console.log('\nPlay Whe Sunday Draws:');
  console.table(pw.rows);

  const pwSlots = await query(\"SELECT draw_time_slot, count(*) as count FROM playwhe_draws WHERE strftime('%w', draw_date) = '0' GROUP BY draw_time_slot\");
  console.log('\nPlay Whe Sunday Slots Summary:');
  console.table(pwSlots.rows);

  // Cash Pot Sunday draws
  const cp = await query(\"SELECT draw_number, draw_date, multiplier FROM cashpot_draws WHERE strftime('%w', draw_date) = '0' ORDER BY draw_date DESC LIMIT 10\");
  console.log('\nCash Pot Sunday Draws:');
  console.table(cp.rows);

  const cpTotalSundays = await query(\"SELECT count(*) as count FROM cashpot_draws WHERE strftime('%w', draw_date) = '0'\");
  console.log('\nCash Pot Sunday total count:', cpTotalSundays.rows);

  // Pick 4 Sunday draws
  const p4 = await query(\"SELECT draw_number, draw_date, draw_time_slot FROM pick4_draws WHERE strftime('%w', draw_date) = '0' ORDER BY draw_date DESC, CAST(draw_number AS INTEGER) DESC LIMIT 10\");
  console.log('\nPick 4 Sunday Draws:');
  console.table(p4.rows);

  const p4Slots = await query(\"SELECT draw_time_slot, count(*) as count FROM pick4_draws WHERE strftime('%w', draw_date) = '0' GROUP BY draw_time_slot\");
  console.log('\nPick 4 Sunday Slots Summary:');
  console.table(p4Slots.rows);

  // Check Sunday Sep 13, 2026 specifically across all games!
  const todayPW = await query(\"SELECT draw_number, draw_date, draw_time_slot, winning_number FROM playwhe_draws WHERE draw_date = '2026-09-13' ORDER BY CAST(draw_number AS INTEGER) DESC\");
  console.log('\nPlay Whe on 2026-09-13 (Sunday):');
  console.table(todayPW.rows);

  const todayP4 = await query(\"SELECT draw_number, draw_date, draw_time_slot, d1, d2, d3, d4 FROM pick4_draws WHERE draw_date = '2026-09-13' ORDER BY CAST(draw_number AS INTEGER) DESC\");
  console.log('\nPick 4 on 2026-09-13 (Sunday):');
  console.table(todayP4.rows);

  const todayCP = await query(\"SELECT draw_number, draw_date, multiplier, num1, num2, num3, num4, num5 FROM cashpot_draws WHERE draw_date = '2026-09-13'\");
  console.log('\nCash Pot on 2026-09-13 (Sunday):');
  console.table(todayCP.rows);
}

main().catch(console.error);
