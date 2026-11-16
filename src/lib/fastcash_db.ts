import { createClient, InStatement } from "@libsql/client";
import path from "path";

const fallbackDbPath = path.join(process.cwd(), "data/fastcash.db");
const fastCashUrl = process.env.FASTCASH_TURSO_DATABASE_URL || `file:${fallbackDbPath}`;
const fastCashToken = process.env.FASTCASH_TURSO_AUTH_TOKEN;

const globalForFastCashDb = globalThis as unknown as {
  fastCashLibsqlDb: ReturnType<typeof createClient> | undefined;
  fastCashSchemaReady: boolean | undefined;
};

if (!globalForFastCashDb.fastCashLibsqlDb) {
  console.log(
    `[FastCash DB] Connecting to: ${fastCashUrl.startsWith("file:") ? `local SQLite (${fallbackDbPath})` : "Turso Fast Cash Cloud DB"}`
  );
  globalForFastCashDb.fastCashLibsqlDb = createClient({
    url: fastCashUrl,
    authToken: fastCashToken
  });
}

const rawClient = globalForFastCashDb.fastCashLibsqlDb;

async function withTransientRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let lastErr: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const code = String(err?.cause?.code || err?.code || "");
      const msg = String(err?.message || "");
      const isTransient =
        msg.includes("fetch failed") ||
        code === "UND_ERR_CONNECT_TIMEOUT" ||
        code === "ETIMEDOUT" ||
        code === "ECONNRESET" ||
        code === "ENOTFOUND" ||
        code === "EAI_AGAIN";
      if (!isTransient || attempt === maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }
  throw lastErr;
}

export const fastCashDb: typeof rawClient = new Proxy(rawClient, {
  get(target, prop, receiver) {
    if (prop === "execute") {
      return (stmt: Parameters<typeof target.execute>[0]) =>
        withTransientRetry(() => target.execute(stmt));
    }
    if (prop === "batch") {
      return (stmts: InStatement[], mode?: "write" | "read" | "deferred") =>
        withTransientRetry(() => target.batch(stmts, mode));
    }
    return Reflect.get(target, prop, receiver);
  }
});

export async function queryFastCash<T = Record<string, any>>(
  sql: string,
  args: any[] = []
): Promise<T[]> {
  const res = await fastCashDb.execute({ sql, args });
  return res.rows as unknown as T[];
}

export async function ensureFastCashSchema(): Promise<void> {
  if (globalForFastCashDb.fastCashSchemaReady) return;
  await fastCashDb.execute(`
    CREATE TABLE IF NOT EXISTS fastcash_draws (
      draw_number INTEGER PRIMARY KEY,
      draw_date TEXT,
      draw_time TEXT NOT NULL,
      winning_code TEXT NOT NULL,
      winning_index INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await fastCashDb.execute(`CREATE INDEX IF NOT EXISTS idx_fastcash_idx ON fastcash_draws(winning_index)`);
  await fastCashDb.execute(`CREATE INDEX IF NOT EXISTS idx_fastcash_date ON fastcash_draws(draw_date)`);
  globalForFastCashDb.fastCashSchemaReady = true;
}

/**
 * Normalizes a Fast Cash winning ball into canonical code and 0..37 state index.
 * "0" -> index 0, "00" -> index 37, "1".."36" -> index 1..36 (canonical "01".."36").
 */
export function normalizeFastCashBall(raw: string): { code: string; index: number } | null {
  const cleaned = raw.trim();
  if (cleaned === "00") {
    return { code: "00", index: 37 };
  }
  if (cleaned === "0") {
    return { code: "0", index: 0 };
  }
  if (/^\d{1,2}$/.test(cleaned)) {
    const n = parseInt(cleaned, 10);
    if (n >= 1 && n <= 36) {
      return { code: String(n).padStart(2, "0"), index: n };
    }
  }
  return null;
}

export function indexToFastCashCode(index: number): string {
  if (index === 0) return "0";
  if (index === 37) return "00";
  if (index >= 1 && index <= 36) return String(index).padStart(2, "0");
  return String(index);
}
