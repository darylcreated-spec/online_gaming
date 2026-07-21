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

    let modelBreakdown: any[] = [];

    // 3. Generate today's predictions if not existing
    const todayStr = getLocalDateString();
    const checkToday = await query("SELECT 1 FROM winforlife_predictions WHERE prediction_date = ?", [todayStr]);
    if (checkToday.length === 0) {
      const draws = await query("SELECT * FROM winforlife_draws ORDER BY draw_number DESC LIMIT 200");
      if (draws.length > 5) {
        // ============================================================
        // WIN FOR LIFE ENSEMBLE PREDICTION ENGINE v2.0
        // 5 Models + Ensemble Voting + Elimination + Weighted Random
        // ============================================================

        // Seeded PRNG for controlled randomness
        let prngSeed = 0;
        const seedStr = todayStr + 'winforlife';
        for (let i = 0; i < seedStr.length; i++) {
          prngSeed = ((prngSeed << 5) - prngSeed) + seedStr.charCodeAt(i);
          prngSeed |= 0;
        }
        prngSeed = Math.abs(prngSeed) + new Date().getMinutes();
        const rng = () => {
          prngSeed = (prngSeed * 1664525 + 1013904223) & 0xFFFFFFFF;
          return (prngSeed >>> 0) / 0xFFFFFFFF;
        };

        // Helper: extract all 6 numbers from a draw row
        const drawNums = (d: any): number[] => [
          Number(d.num1), Number(d.num2), Number(d.num3),
          Number(d.num4), Number(d.num5), Number(d.num6)
        ];

        // ============================================================
        // MODEL 1: 2nd-Order Markov Chain (adapted for multi-ball)
        // ============================================================
        const lastDrawNums = drawNums(draws[0]);
        const secondLastDrawNums = drawNums(draws[1]);
        const markovScores: Record<number, number> = {};
        for (let i = 1; i <= 28; i++) markovScores[i] = 0;

        for (let i = 0; i < draws.length - 2; i++) {
          const currentNums = drawNums(draws[i]);
          const prevNums = drawNums(draws[i + 1]);
          const prevPrevNums = drawNums(draws[i + 2]);

          // 1st-order: if prevDraw shares numbers with lastDraw
          const match1st = prevNums.filter(n => lastDrawNums.includes(n)).length;
          if (match1st > 0) {
            currentNums.forEach(n => {
              if (markovScores[n] !== undefined) markovScores[n] += match1st * 1.5;
            });
          }

          // 2nd-order: both previous draws match the pattern
          const match2nd = prevNums.filter(n => lastDrawNums.includes(n)).length;
          const match2ndPrev = prevPrevNums.filter(n => secondLastDrawNums.includes(n)).length;
          if (match2nd > 0 && match2ndPrev > 0) {
            currentNums.forEach(n => {
              if (markovScores[n] !== undefined) markovScores[n] += (match2nd * match2ndPrev) * 0.5;
            });
          }
        }

        const markovTop10 = Object.entries(markovScores)
          .map(([n, s]) => ({ num: Number(n), score: s }))
          .filter(c => c.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(c => c.num);

        // ============================================================
        // MODEL 2: Momentum Detection
        // Compare frequency in last 8 draws vs last 40 draws.
        // ============================================================
        const recent8Draws = draws.slice(0, Math.min(8, draws.length));
        const recent40Draws = draws.slice(0, Math.min(40, draws.length));
        const momentumScores: Record<number, number> = {};

        const countInDraws = (numArr: any[], target: number) => {
          let count = 0;
          numArr.forEach(d => { if (drawNums(d).includes(target)) count++; });
          return count;
        };

        for (let i = 1; i <= 28; i++) {
          const shortFreq = countInDraws(recent8Draws, i) / recent8Draws.length;
          const longFreq = countInDraws(recent40Draws, i) / recent40Draws.length;
          momentumScores[i] = longFreq > 0 ? (shortFreq / longFreq) : (shortFreq > 0 ? 3.0 : 0);
        }

        const momentumTop10 = Object.entries(momentumScores)
          .map(([n, s]) => ({ num: Number(n), score: s }))
          .filter(c => c.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(c => c.num);

        // ============================================================
        // MODEL 3: Day-of-Week Profile
        // Filter draws by same day of week.
        // ============================================================
        const targetDate = new Date(todayStr + 'T12:00:00');
        const targetDOW = targetDate.getDay();

        const dayDraws = draws.filter(d => {
          try {
            return new Date(d.draw_date + 'T12:00:00').getDay() === targetDOW;
          } catch { return false; }
        });

        const dayFreqs: Record<number, number> = {};
        for (let i = 1; i <= 28; i++) dayFreqs[i] = 0;
        dayDraws.forEach(d => {
          drawNums(d).forEach(n => { if (dayFreqs[n] !== undefined) dayFreqs[n]++; });
        });

        const dayTop10 = Object.entries(dayFreqs)
          .map(([n, s]) => ({ num: Number(n), score: s }))
          .filter(c => c.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(c => c.num);

        // ============================================================
        // MODEL 4: Cycle / Periodicity Detection
        // Compute average gap between appearances; score numbers near their cycle.
        // ============================================================
        const cycleScores: Record<number, number> = {};
        for (let i = 1; i <= 28; i++) {
          const positions: number[] = [];
          draws.forEach((d, idx) => { if (drawNums(d).includes(i)) positions.push(idx); });

          if (positions.length >= 3) {
            const gapsArr: number[] = [];
            for (let j = 0; j < positions.length - 1; j++) {
              gapsArr.push(positions[j + 1] - positions[j]);
            }
            const avgGap = gapsArr.reduce((a, b) => a + b, 0) / gapsArr.length;
            const currentGap = positions[0];

            if (avgGap > 0) {
              const ratio = currentGap / avgGap;
              const nearest = Math.max(1, Math.round(ratio));
              const deviation = Math.abs(ratio - nearest);
              cycleScores[i] = (1 / (deviation + 0.15)) * Math.min(nearest, 3);
            } else {
              cycleScores[i] = 0;
            }
          } else {
            cycleScores[i] = 0;
          }
        }

        const cycleTop10 = Object.entries(cycleScores)
          .map(([n, s]) => ({ num: Number(n), score: s }))
          .filter(c => c.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(c => c.num);

        // ============================================================
        // MODEL 5: Global Frequency + Gap Scoring
        // ============================================================
        const globalFreqs: Record<number, number> = {};
        const globalGaps: Record<number, number> = {};
        for (let i = 1; i <= 28; i++) {
          globalFreqs[i] = 0;
          globalGaps[i] = 200;
        }
        draws.forEach(d => {
          drawNums(d).forEach(n => { if (globalFreqs[n] !== undefined) globalFreqs[n]++; });
        });
        for (let i = 1; i <= 28; i++) {
          const idx = draws.findIndex(d => drawNums(d).includes(i));
          if (idx !== -1) globalGaps[i] = idx;
        }

        const freqGapTop10 = Object.entries(globalFreqs)
          .map(([n]) => {
            const num = Number(n);
            return { num, score: globalFreqs[num] * 1.0 + globalGaps[num] * 0.3 };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(c => c.num);

        // ============================================================
        // ELIMINATION FILTER
        // ============================================================
        const eliminated = new Set<number>();
        // Remove numbers that appeared in ALL of the last 2 draws (overplayed)
        const last2Sets = draws.slice(0, 2).map(d => drawNums(d));
        for (let i = 1; i <= 28; i++) {
          if (last2Sets.every(set => set.includes(i))) {
            eliminated.add(i);
          }
        }
        // Remove numbers with zero signal across all models
        for (let i = 1; i <= 28; i++) {
          if (markovScores[i] === 0 && momentumScores[i] === 0 &&
              dayFreqs[i] === 0 && cycleScores[i] === 0 && globalFreqs[i] === 0) {
            eliminated.add(i);
          }
        }

        // ============================================================
        // ENSEMBLE VOTING
        // ============================================================
        const voteCount: Record<number, number> = {};
        const rankSum: Record<number, number> = {};
        for (let i = 1; i <= 28; i++) {
          voteCount[i] = 0;
          rankSum[i] = 0;
        }

        const models = [markovTop10, momentumTop10, dayTop10, cycleTop10, freqGapTop10];
        models.forEach(top10 => {
          top10.forEach((num, rank) => {
            voteCount[num]++;
            rankSum[num] += (10 - rank);
          });
        });

        const ensembleCandidates = Array.from({ length: 28 }, (_, i) => i + 1)
          .filter(n => !eliminated.has(n))
          .map(num => ({
            num,
            votes: voteCount[num],
            totalScore: voteCount[num] * 10 + rankSum[num]
          }))
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, 16);

        // ============================================================
        // WEIGHTED RANDOM SAMPLING — Pick 6 main numbers
        // ============================================================
        const selected: number[] = [];
        const pool = [...ensembleCandidates];

        while (selected.length < 6 && pool.length > 0) {
          const totalWeight = pool.reduce((sum, c) => sum + c.totalScore + 1, 0);
          const rand = rng() * totalWeight;
          let cumulative = 0;
          for (let i = 0; i < pool.length; i++) {
            cumulative += pool[i].totalScore + 1;
            if (rand <= cumulative) {
              selected.push(pool[i].num);
              pool.splice(i, 1);
              break;
            }
          }
        }

        // Fallback fills
        while (selected.length < 6) {
          const next = ensembleCandidates.find(c => !selected.includes(c.num));
          if (next) selected.push(next.num);
          else {
            const r = Math.floor(rng() * 28) + 1;
            if (!selected.includes(r)) selected.push(r);
          }
        }

        selected.sort((a, b) => a - b);
        
        modelBreakdown = selected.map(num => {
          const votedModels: string[] = [];
          if (markovTop10.includes(num)) votedModels.push('Markov');
          if (momentumTop10.includes(num)) votedModels.push('Momentum');
          if (dayTop10.includes(num)) votedModels.push('Day');
          if (cycleTop10.includes(num)) votedModels.push('Cycle');
          if (freqGapTop10.includes(num)) votedModels.push('FreqGap');
          return { number: num, votes: votedModels.length, models: votedModels, confidence: Math.round((votedModels.length / 5) * 100) };
        });

        // Cash Ball: use weighted frequency with momentum boost
        const cbFreqs: Record<number, number> = {};
        for (let i = 1; i <= 3; i++) cbFreqs[i] = 0;
        draws.forEach(d => {
          if (d.cash_ball >= 1 && d.cash_ball <= 3) cbFreqs[d.cash_ball]++;
        });
        // Add momentum for cash ball from last 10 draws
        const cbRecent: Record<number, number> = {};
        for (let i = 1; i <= 3; i++) cbRecent[i] = 0;
        draws.slice(0, 10).forEach(d => {
          if (d.cash_ball >= 1 && d.cash_ball <= 3) cbRecent[d.cash_ball]++;
        });
        const predictedCb = [1, 2, 3]
          .map(i => ({ num: i, score: cbFreqs[i] + cbRecent[i] * 3 }))
          .sort((a, b) => b.score - a.score)[0]?.num || 1;

        await db.execute({
          sql: "INSERT OR IGNORE INTO winforlife_predictions (prediction_date, predicted_numbers, predicted_cash_ball) VALUES (?, ?, ?)",
          args: [todayStr, selected.join(","), predictedCb]
        });

        console.log(`[WFL Predictor v2] Ensemble: ${selected.join(",")} CB:${predictedCb}`);
        console.log(`[WFL Predictor v2] Models: Markov=${markovTop10.join(",")}, Momentum=${momentumTop10.join(",")}, Day=${dayTop10.join(",")}, Cycle=${cycleTop10.join(",")}, FreqGap=${freqGapTop10.join(",")}`);
        console.log(`[WFL Predictor v2] Eliminated: ${[...eliminated].join(",")}`);
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
      stats: { total, hits, hitRate },
      modelBreakdown
    });
  } catch (error: any) {
    console.error("[API /api/winforlife/predictions] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
