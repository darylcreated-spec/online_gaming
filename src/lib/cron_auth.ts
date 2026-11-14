import crypto from "crypto";
import { NextResponse } from "next/server";
import { db } from "./db";

let syncLocksTableReady = false;

function safeTokenEquals(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function extractRequestToken(request: Request, bodyToken?: string | null): string {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  if (headerSecret) return headerSecret;

  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret")?.trim();
  if (querySecret) return querySecret;

  if (bodyToken && bodyToken.trim()) return bodyToken.trim();
  return "";
}

/**
 * Verifies cron/admin authorization using server-only CRON_SECRET.
 * Fails closed if CRON_SECRET is unset or empty.
 */
export function isAuthorizedCronRequest(request: Request, bodySecret?: string | null): boolean {
  const expected = (process.env.CRON_SECRET || "").trim();
  if (!expected) return false;

  const candidate = extractRequestToken(request, bodySecret);
  return safeTokenEquals(candidate, expected);
}

/**
 * Verifies full-archive sync requests against server-only FULL_SYNC_SECRET or CRON_SECRET.
 * Zero hardcoded password fallbacks.
 */
export function isAuthorizedFullSyncRequest(
  request: Request,
  bodySecret?: string | null,
  fullSecret?: string | null
): boolean {
  const allowedSecrets = [
    (process.env.FULL_SYNC_SECRET || "").trim(),
    (process.env.CRON_SECRET || "").trim()
  ].filter(Boolean);

  if (allowedSecrets.length === 0) return false;

  const { searchParams } = new URL(request.url);
  const candidates = [
    extractRequestToken(request, bodySecret),
    (fullSecret || "").trim(),
    (searchParams.get("fullSecret") || "").trim()
  ].filter(Boolean);

  for (const candidate of candidates) {
    for (const secret of allowedSecrets) {
      if (safeTokenEquals(candidate, secret)) return true;
    }
  }
  return false;
}

export function unauthorizedResponse(message = "Unauthorized: valid cron or admin secret required.") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

async function ensureSyncLocksTable(): Promise<void> {
  if (syncLocksTableReady) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_locks (
      lock_key TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL DEFAULT '',
      locked_until_ms INTEGER NOT NULL DEFAULT 0,
      last_sync_ms INTEGER NOT NULL DEFAULT 0
    )
  `);
  syncLocksTableReady = true;
}

export interface SyncLockResult {
  acquired: boolean;
  ownerId: string;
  retryAfterSeconds: number;
}

/**
 * Acquires a distributed lock + cooldown slot backed by Turso so concurrent
 * serverless invocations never run duplicate scrapes.
 */
export async function acquireSyncLock(
  lockKey: string,
  cooldownSeconds: number,
  leaseSeconds: number = 90
): Promise<SyncLockResult> {
  try {
    await ensureSyncLocksTable();
    await db.execute({
      sql: `INSERT OR IGNORE INTO sync_locks (lock_key, owner_id, locked_until_ms, last_sync_ms) VALUES (?, '', 0, 0)`,
      args: [lockKey]
    });

    const now = Date.now();
    const ownerId = crypto.randomUUID();
    const lockedUntil = now + Math.max(15, leaseSeconds) * 1000;
    const minLastSyncCutoff = cooldownSeconds <= 0 ? Number.MAX_SAFE_INTEGER : now - cooldownSeconds * 1000;

    const updateRes = await db.execute({
      sql: `
        UPDATE sync_locks
        SET owner_id = ?, locked_until_ms = ?, last_sync_ms = ?
        WHERE lock_key = ?
          AND locked_until_ms <= ?
          AND last_sync_ms <= ?
      `,
      args: [ownerId, lockedUntil, now, lockKey, now, minLastSyncCutoff]
    });

    if ((updateRes.rowsAffected || 0) > 0) {
      return { acquired: true, ownerId, retryAfterSeconds: 0 };
    }

    const rowRes = await db.execute({
      sql: `SELECT locked_until_ms, last_sync_ms FROM sync_locks WHERE lock_key = ? LIMIT 1`,
      args: [lockKey]
    });
    const row = rowRes.rows[0];
    const rowLockedUntil = Number(row?.locked_until_ms || 0);
    const rowLastSync = Number(row?.last_sync_ms || 0);
    const nextReadyMs = Math.max(
      rowLockedUntil,
      cooldownSeconds > 0 ? rowLastSync + cooldownSeconds * 1000 : rowLockedUntil
    );
    const retryAfterSeconds = Math.max(1, Math.ceil((nextReadyMs - now) / 1000));

    return { acquired: false, ownerId: "", retryAfterSeconds };
  } catch (err: any) {
    console.warn("[SyncLock] Lock table notice, proceeding cautiously:", err.message);
    return { acquired: true, ownerId: "fallback", retryAfterSeconds: 0 };
  }
}

export async function releaseSyncLock(
  lockKey: string,
  ownerId: string,
  preserveCooldown: boolean = true
): Promise<void> {
  if (!ownerId || ownerId === "fallback") return;
  try {
    await ensureSyncLocksTable();
    if (preserveCooldown) {
      await db.execute({
        sql: `UPDATE sync_locks SET locked_until_ms = 0, last_sync_ms = ? WHERE lock_key = ? AND owner_id = ?`,
        args: [Date.now(), lockKey, ownerId]
      });
    } else {
      await db.execute({
        sql: `UPDATE sync_locks SET locked_until_ms = 0, last_sync_ms = 0 WHERE lock_key = ? AND owner_id = ?`,
        args: [lockKey, ownerId]
      });
    }
  } catch (err: any) {
    console.warn("[SyncLock] Release notice:", err.message);
  }
}
