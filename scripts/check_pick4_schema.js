const { createClient } = require('@libsql/client');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/TURSO_DATABASE_URL=(.+)/)[1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)[1].trim();
const db = createClient({ url, authToken: token });

async function main() {
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%pick%'");
  console.log('Pick tables:', tables.rows);

  for (const t of tables.rows) {
    const tableName = t.name;
    const info = await db.execute(`PRAGMA table_info(${tableName})`);
    console.log(`\nTable ${tableName} columns:`, info.rows.map(r => `${r.name} (${r.type})`));
    const count = await db.execute(`SELECT count(*) as c FROM ${tableName}`);
    console.log(`Total count in ${tableName}:`, count.rows[0].c);
    const sample = await db.execute(`SELECT * FROM ${tableName} ORDER BY CAST(draw_number AS INTEGER) DESC LIMIT 5`);
    console.log(`Sample 5 in ${tableName}:`, sample.rows);
  }
}

main().catch(console.error);
