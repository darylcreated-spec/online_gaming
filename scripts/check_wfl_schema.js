const { createClient } = require('@libsql/client');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/TURSO_DATABASE_URL=(.+)/)[1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)[1].trim();
const db = createClient({ url, authToken: token });

async function main() {
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%win%'");
  console.log('Win tables:', tables.rows);
  
  const info = await db.execute("PRAGMA table_info(winforlife_draws)");
  console.log('Columns in winforlife_draws:', info.rows.map(r => `${r.name} (${r.type})`));
  
  const count = await db.execute("SELECT count(*) as c FROM winforlife_draws");
  console.log('Total count in winforlife_draws:', count.rows[0].c);
  
  const sample = await db.execute("SELECT * FROM winforlife_draws ORDER BY CAST(draw_number AS INTEGER) DESC LIMIT 5");
  console.log('Latest 5 draws:', sample.rows);
  
  const earliest = await db.execute("SELECT * FROM winforlife_draws ORDER BY CAST(draw_number AS INTEGER) ASC LIMIT 1");
  console.log('Earliest draw:', earliest.rows[0]);
}

main().catch(console.error);
