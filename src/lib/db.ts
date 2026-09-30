import { createClient } from "@libsql/client";
import path from "path";

// Get database configuration from environment variables.
// Fallback to local SQLite file for development.
const dbPath = path.join(process.cwd(), "data/lotto.db");
const url = process.env.TURSO_DATABASE_URL || `file:${dbPath}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

// Prevent recreating database client in dev mode to avoid exhaustion of connection pools.
const globalForDb = globalThis as unknown as {
  libsqlDb: ReturnType<typeof createClient> | undefined;
};

if (!globalForDb.libsqlDb) {
  console.log(`[Database] Connecting to: ${url.startsWith("file:") ? "local SQLite file (" + dbPath + ")" : "Turso Cloud DB"}`);
  globalForDb.libsqlDb = createClient({
    url,
    authToken,
  });
}

export const db = globalForDb.libsqlDb;

// Helper to run raw SQL statements
export async function query<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  const result = await db.execute({ sql, args });
  
  // Convert rows to key-value objects matching column names
  const columns = result.columns;
  return result.rows.map(row => {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as T;
  });
}

/**
 * Executes an array of SQL statements in a single atomic batch transaction.
 * Cuts network round-trip latency by bundling multi-row inserts/updates.
 */
export async function batchExecute(statements: { sql: string; args?: any[] }[]): Promise<any[]> {
  if (!statements || statements.length === 0) return [];
  return await db.batch(statements as any, "write");
}

/**
 * Diagnostic ping to test live database round-trip latency.
 */
export async function pingDb(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await db.execute("SELECT 1 AS ping");
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}

/**
 * Ensures the sync audit logging table exists for operational observability.
 */
export async function ensureSyncAuditTable(): Promise<void> {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sync_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        duration_ms INTEGER,
        games_synced TEXT,
        draws_added INTEGER,
        errors TEXT,
        trigger_source TEXT
      )
    `);
  } catch (e: any) {
    console.warn("[Database] ensureSyncAuditTable warning:", e.message);
  }
}

/**
 * Records a sync attempt in the operational audit log.
 */
export async function recordSyncAudit(entry: {
  durationMs: number;
  gamesSynced: string;
  drawsAdded: number;
  errors?: string;
  triggerSource?: string;
}): Promise<void> {
  try {
    await ensureSyncAuditTable();
    await db.execute({
      sql: `
        INSERT INTO sync_audit_log (timestamp, duration_ms, games_synced, draws_added, errors, trigger_source)
        VALUES (datetime('now'), ?, ?, ?, ?, ?)
      `,
      args: [
        entry.durationMs,
        entry.gamesSynced,
        entry.drawsAdded,
        entry.errors || null,
        entry.triggerSource || "cron"
      ]
    });
  } catch (err: any) {
    console.warn("[Database] Failed to record sync audit log:", err.message);
  }
}
