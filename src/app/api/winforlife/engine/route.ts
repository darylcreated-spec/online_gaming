// src/app/api/winforlife/engine/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { executeWinForLifeForensicEngine } from '@/lib/winforlife_forensic_engine';

export const dynamic = "force-dynamic";

/**
 * GET /api/winforlife/engine
 * Returns the compiled forensic engine analysis for the latest draws,
 * including candidate sets, Mandel covering portfolio, positional corridors,
 * and empirical telemetry.
 */
export async function GET() {
  // Pull all draws from the database (same query used in the back‑test)
  const rows = await query<any>(`
    SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball
    FROM winforlife_draws
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const draws = rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [
      Number(r.num1),
      Number(r.num2),
      Number(r.num3),
      Number(r.num4),
      Number(r.num5),
      Number(r.num6)
    ].sort((a, b) => a - b),
    cash_ball: Number(r.cash_ball || 1),
  }));

  // Use the full history as the window (engine will internally slice if needed)
  const windowSize = draws.length;
  const result = executeWinForLifeForensicEngine(draws, windowSize);

  return NextResponse.json(result);
}
