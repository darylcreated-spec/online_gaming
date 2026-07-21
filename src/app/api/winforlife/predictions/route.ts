import { query, db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getLocalDateString() {
  const d = new Date();
  const localTime = new Date(d.getTime() - 4 * 60 * 60 * 1000);
  return localTime.toISOString().split("T")[0];
}

export async function GET() {
  try {
    // 1. Initialize predictions table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS winforlife_predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prediction_date TEXT UNIQUE,
        predicted_numbers TEXT NOT NULL,
        predicted_cash_ball INTEGER NOT NULL,
        status TEXT DEFAULT 'PENDING',
        matching_count INTEGER,
        cash_ball_matched INTEGER,
        winning_draw_number INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Verify any pending predictions against real draws
    const pending = await query<any>("SELECT * FROM winforlife_predictions WHERE status = 'PENDING'");
    if (pending.length > 0) {
      const dates = pending.map(p => p.prediction_date);
      const placeholders = dates.map(() => "?").join(",");
      const draws = await query<any>(
        `SELECT * FROM winforlife_draws WHERE draw_date IN (${placeholders})`,
        dates
      );

      const drawsByDate = new Map<string, any>();
      draws.forEach(d => drawsByDate.set(d.draw_date, d));

      for (const pred of pending) {
        const draw = drawsByDate.get(pred.prediction_date);
        if (draw) {
          const predNums = pred.predicted_numbers.split(",").map(Number);
          const drawNums: number[] = [
            Number(draw.num1),
            Number(draw.num2),
            Number(draw.num3),
            Number(draw.num4),
            Number(draw.num5),
            Number(draw.num6)
          ];
          const overlap = predNums.filter((n: number) => drawNums.includes(n));
          const cbMatched = Number(pred.predicted_cash_ball) === Number(draw.cash_ball) ? 1 : 0;
          
          const isHit = overlap.length >= 3 || (overlap.length >= 2 && cbMatched === 1);
          const status = isHit ? "HIT" : "MISS";
          
          await db.execute({
            sql: `UPDATE winforlife_predictions 
                  SET status = ?, matching_count = ?, cash_ball_matched = ?, winning_draw_number = ?
                  WHERE id = ?`,
            args: [status, overlap.length, cbMatched, draw.draw_number, pred.id]
          });
        }
      }
    }

    // 3. Generate today's predictions if not existing
    const todayStr = getLocalDateString();
    const checkToday = await query("SELECT 1 FROM winforlife_predictions WHERE prediction_date = ?", [todayStr]);
    if (checkToday.length === 0) {
      const draws = await query("SELECT * FROM winforlife_draws ORDER BY draw_number DESC LIMIT 150");
      if (draws.length > 5) {
        // 1. Initialize stats containers
        const freqs: Record<number, number> = {};
        const cbFreqs: Record<number, number> = {};
        const transitions1st: Record<number, number> = {};
        const transitions2nd: Record<number, number> = {};

        for (let i = 1; i <= 28; i++) {
          freqs[i] = 0;
          transitions1st[i] = 0;
          transitions2nd[i] = 0;
        }
        for (let i = 1; i <= 3; i++) {
          cbFreqs[i] = 0;
        }

        // 2. Global frequencies & Cash Ball frequencies
        draws.forEach(d => {
          [d.num1, d.num2, d.num3, d.num4, d.num5, d.num6].forEach(n => {
            if (n >= 1 && n <= 28) freqs[n]++;
          });
          if (d.cash_ball >= 1 && d.cash_ball <= 3) cbFreqs[d.cash_ball]++;
        });

        // 3. Compute 1st-order and 2nd-order transitions
        // draws[0] is the latest draw (draw_number DESC)
        // draws[1] is the draw before that, etc.
        const lastDrawNums = [draws[0].num1, draws[0].num2, draws[0].num3, draws[0].num4, draws[0].num5, draws[0].num6];
        const secondLastDrawNums = [draws[1].num1, draws[1].num2, draws[1].num3, draws[1].num4, draws[1].num5, draws[1].num6];

        // Loop historically to find matches
        for (let i = 0; i < draws.length - 2; i++) {
          const currentDraw = draws[i]; // drawn at time N+1
          const prevDraw = draws[i + 1];    // drawn at time N
          const prevPrevDraw = draws[i + 2]; // drawn at time N-1

          const currentNums = [currentDraw.num1, currentDraw.num2, currentDraw.num3, currentDraw.num4, currentDraw.num5, currentDraw.num6];
          const prevNums = [prevDraw.num1, prevDraw.num2, prevDraw.num3, prevDraw.num4, prevDraw.num5, prevDraw.num6];
          const prevPrevNums = [prevPrevDraw.num1, prevPrevDraw.num2, prevPrevDraw.num3, prevPrevDraw.num4, prevPrevDraw.num5, prevPrevDraw.num6];

          // 1st order transitions: if any number in prevNums was in lastDrawNums
          let match1stCount = 0;
          prevNums.forEach(n => {
            if (lastDrawNums.includes(n)) {
              match1stCount++;
            }
          });
          if (match1stCount > 0) {
            currentNums.forEach(n => {
              if (transitions1st[n] !== undefined) {
                transitions1st[n] += match1stCount;
              }
            });
          }

          // 2nd order transitions: if numbers match the joint sequence
          let match2ndCount = 0;
          prevNums.forEach(y => {
            if (lastDrawNums.includes(y)) {
              prevPrevNums.forEach(x => {
                if (secondLastDrawNums.includes(x)) {
                  match2ndCount++;
                }
              });
            }
          });
          if (match2ndCount > 0) {
            currentNums.forEach(n => {
              if (transitions2nd[n] !== undefined) {
                transitions2nd[n] += match2ndCount;
              }
            });
          }
        }

        // 4. Score candidates
        const candidates = [];
        for (let i = 1; i <= 28; i++) {
          const score = (transitions2nd[i] * 2.0) + (transitions1st[i] * 1.5) + (freqs[i] * 1.0);
          candidates.push({ num: i, score });
        }

        // Sort descending by score
        candidates.sort((a, b) => b.score - a.score);

        const sortedNums = candidates.map(c => c.num);
        const sortedCbs = Object.keys(cbFreqs).map(Number).sort((a, b) => cbFreqs[b] - cbFreqs[a]);

        const hotPool = sortedNums.slice(0, 12);
        const coldPool = sortedNums.slice(12);

        const selected: number[] = [];
        hotPool.sort(() => Math.random() - 0.5);
        coldPool.sort(() => Math.random() - 0.5);

        selected.push(...hotPool.slice(0, 4));
        selected.push(...coldPool.slice(0, 2));
        selected.sort((a, b) => a - b);

        const predictedCb = sortedCbs[0] || 1;

        await db.execute({
          sql: "INSERT OR IGNORE INTO winforlife_predictions (prediction_date, predicted_numbers, predicted_cash_ball) VALUES (?, ?, ?)",
          args: [todayStr, selected.join(","), predictedCb]
        });
      }
    }

    const predictions = await query(`
      SELECT 
        p.id, p.prediction_date, p.predicted_numbers, p.predicted_cash_ball, p.status, p.matching_count, p.cash_ball_matched,
        COALESCE(p.winning_draw_number, d.draw_number) as winning_draw_number,
        d.num1, d.num2, d.num3, d.num4, d.num5, d.num6, d.cash_ball as winning_cash_ball
      FROM winforlife_predictions p
      LEFT JOIN winforlife_draws d ON p.prediction_date = d.draw_date
      ORDER BY p.prediction_date DESC
      LIMIT 100
    `);

    const statsRes = await query("SELECT COUNT(*) as total, SUM(CASE WHEN status='HIT' THEN 1 ELSE 0 END) as hits FROM winforlife_predictions WHERE status != 'PENDING'");
    const total = statsRes[0]?.total || 0;
    const hits = statsRes[0]?.hits || 0;
    const hitRate = total > 0 ? Math.round((hits / total) * 1000) / 10 : 0;

    return NextResponse.json({
      success: true,
      predictions,
      stats: { total, hits, hitRate }
    });
  } catch (error: any) {
    console.error("[API /api/winforlife/predictions] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
