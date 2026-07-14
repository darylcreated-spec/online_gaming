import { createClient } from "@libsql/client";

// Get database configuration from environment variables.
// Fallback to local SQLite file for development.
const url = process.env.TURSO_DATABASE_URL || "file:data/lotto.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log(`[Database] Connecting to: ${url.startsWith("file:") ? "local SQLite file" : "Turso Cloud DB"}`);

export const db = createClient({
  url,
  authToken,
});

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
