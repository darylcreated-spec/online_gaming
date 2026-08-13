const fs = require('fs');
const { createClient } = require('@libsql/client');

// Read environment variables
let envVars = {};
try {
  const env = fs.readFileSync('.env.local', 'utf8');
  env.split('\n').forEach(l => {
    const [k, ...v] = l.trim().split('=');
    if (k && v) envVars[k.trim()] = v.join('=').trim();
  });
} catch (e) {}

const url = envVars.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file:data/lotto.db';
const authToken = envVars.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function migrate() {
  console.log('[Migration] Creating syndicates and community chat tables on:', url.startsWith('file:') ? 'local db' : 'Turso Cloud DB');

  // 1. Syndicates Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS syndicates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      game_type TEXT NOT NULL,
      target_draw_date TEXT,
      total_stake REAL DEFAULT 0,
      ticket_count INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Syndicate Members Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS syndicate_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      syndicate_id INTEGER NOT NULL,
      member_name TEXT NOT NULL,
      contribution_amount REAL NOT NULL,
      share_percentage REAL NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (syndicate_id) REFERENCES syndicates (id) ON DELETE CASCADE
    );
  `);

  // 3. Syndicate Tickets Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS syndicate_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      syndicate_id INTEGER NOT NULL,
      game_type TEXT NOT NULL,
      numbers TEXT NOT NULL,
      bonus TEXT,
      cost REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (syndicate_id) REFERENCES syndicates (id) ON DELETE CASCADE
    );
  `);

  // 4. Community Chat Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS community_chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      message TEXT NOT NULL,
      game_tag TEXT DEFAULT 'ALL',
      lucky_numbers TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed sample initial community messages if empty
  const chatCount = await db.execute("SELECT COUNT(*) as count FROM community_chat");
  const count = Number(chatCount.rows[0]?.count ?? chatCount.rows[0]?.[0]) || 0;
  
  if (count === 0) {
    console.log('[Migration] Seeding initial welcome chat messages...');
    await db.execute({
      sql: `INSERT INTO community_chat (user_name, message, game_tag, lucky_numbers) VALUES 
            (?, ?, ?, ?),
            (?, ?, ?, ?),
            (?, ?, ?, ?)`,
      args: [
        'WinConcept AI', 'Welcome to The Win Concept Community Hub! Share your hot marks, discuss draw strategies, and form syndicates to reduce mathematical odds.', 'ALL', '4, 12, 19, 26, 33',
        'TriniLottoKing', 'Lotto Plus jackpot is building up! Genetic optimizer is favoring low-gap companions for Saturday.', 'LOTTO', '7, 14, 21, 28, 35',
        'ChinapooMaster', 'Mark 16 (Jamoo) and Mark 26 (Cow) are showing heavy Bayesian rebound signals today.', 'PLAYWHE', '16, 26'
      ]
    });
  }

  // Seed a sample public syndicate if none exists
  const syndCount = await db.execute("SELECT COUNT(*) as count FROM syndicates");
  const sCount = Number(syndCount.rows[0]?.count ?? syndCount.rows[0]?.[0]) || 0;

  if (sCount === 0) {
    console.log('[Migration] Seeding sample public syndicate...');
    const insertSynd = await db.execute({
      sql: `INSERT INTO syndicates (code, name, creator_name, game_type, target_draw_date, total_stake, ticket_count, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['WIN-7720', 'Trinidad Champions Pool #1', 'Daryl', 'lotto-plus', 'Saturday Draw', 150.0, 3, 'Public analytical pool testing genetic algorithm consensus lines.']
    });

    const syndId = Number(insertSynd.lastInsertRowid) || 1;

    await db.execute({
      sql: `INSERT INTO syndicate_members (syndicate_id, member_name, contribution_amount, share_percentage) VALUES
            (?, ?, ?, ?),
            (?, ?, ?, ?),
            (?, ?, ?, ?)`,
      args: [
        syndId, 'Daryl (Admin)', 50.0, 33.33,
        syndId, 'Ravi P.', 50.0, 33.33,
        syndId, 'Keshore M.', 50.0, 33.34
      ]
    });

    await db.execute({
      sql: `INSERT INTO syndicate_tickets (syndicate_id, game_type, numbers, bonus, cost) VALUES
            (?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?)`,
      args: [
        syndId, 'lotto-plus', '4, 12, 19, 26, 33', '7', 10.0,
        syndId, 'lotto-plus', '7, 14, 21, 28, 35', '3', 10.0,
        syndId, 'lotto-plus', '3, 11, 18, 25, 32', '10', 10.0
      ]
    });
  }

  console.log('[Migration] All tables and seed data created successfully!');
}

migrate().catch(console.error);
