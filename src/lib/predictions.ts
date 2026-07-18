import { db } from "./db";

// Helper to format Date objects as YYYY-MM-DD local time
export function getLocalDateString(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split("T")[0];
}

// Generate Play Whe predictions (3 numbers) for a given date string (YYYY-MM-DD)
export async function generatePlayWhePredictions(dateStr: string): Promise<{ predicted_numbers: string; success: boolean }> {
  try {
    // 1. Check if a prediction already exists for this date
    const existing = await db.execute({
      sql: "SELECT predicted_numbers FROM playwhe_predictions WHERE prediction_date = ?",
      args: [dateStr]
    });
    
    if (existing.rows.length > 0) {
      return {
        predicted_numbers: String(existing.rows[0][0]),
        success: true
      };
    }

    // 2. Fetch the last 200 draws to run statistical analysis
    const drawsRes = await db.execute({
      sql: "SELECT winning_number, draw_time_slot FROM playwhe_draws ORDER BY id DESC LIMIT 200"
    });
    
    const draws = drawsRes.rows.map(row => ({
      winning_number: Number(row[0]),
      draw_time_slot: String(row[1])
    }));

    if (draws.length < 5) {
      // Fallback if db is empty or has too few records
      const fallback = ["1", "12", "29"].join(",");
      await db.execute({
        sql: "INSERT OR IGNORE INTO playwhe_predictions (prediction_date, predicted_numbers, status) VALUES (?, ?, 'PENDING')",
        args: [dateStr, fallback]
      });
      return { predicted_numbers: fallback, success: true };
    }

    // 3. Compute simple probability weights for all 36 numbers
    const freqs: Record<number, number> = {};
    const gaps: Record<number, number> = {};
    const successors: Record<number, number> = {};

    // Initialize metrics
    for (let i = 1; i <= 36; i++) {
      freqs[i] = 0;
      gaps[i] = 200; // default large gap
      successors[i] = 0;
    }

    // A. Frequencies over last 200 draws
    draws.forEach(d => {
      freqs[d.winning_number]++;
    });

    // B. Calculate Gaps (draws since last seen)
    for (let i = 1; i <= 36; i++) {
      const idx = draws.findIndex(d => d.winning_number === i);
      if (idx !== -1) {
        gaps[i] = idx;
      }
    }

    // C. Successors of the last drawn number
    const lastDrawn = draws[0].winning_number;
    for (let i = 0; i < draws.length - 1; i++) {
      if (draws[i + 1].winning_number === lastDrawn) {
        // draws is DESC sorted, so draws[i] followed draws[i+1] chronologically
        successors[draws[i].winning_number]++;
      }
    }

    // 4. Calculate total score for each of the 36 numbers
    const candidates = [];
    for (let i = 1; i <= 36; i++) {
      // Weighting formula: Overdue gap + Frequency + Successor tendency
      const score = (gaps[i] * 1.8) + (freqs[i] * 1.2) + (successors[i] * 2.5);
      candidates.push({ num: i, score });
    }

    // Sort descending by score
    candidates.sort((a, b) => b.score - a.score);

    // Pick top 3 unique numbers
    const top3 = candidates.slice(0, 3).map(c => String(c.num).padStart(2, "0"));
    const predictionString = top3.join(",");

    // Save to database
    await db.execute({
      sql: "INSERT OR IGNORE INTO playwhe_predictions (prediction_date, predicted_numbers, status) VALUES (?, ?, 'PENDING')",
      args: [dateStr, predictionString]
    });

    console.log(`[Predictor] Generated predictions for ${dateStr}: ${predictionString}`);
    return { predicted_numbers: predictionString, success: true };
  } catch (err) {
    console.error("[Predictor] Error generating predictions:", err);
    return { predicted_numbers: "", success: false };
  }
}

// Scans all PENDING predictions and checks if they hit against playwhe_draws
export async function verifyPlayWhePredictions(): Promise<{ verifiedCount: number; hitsAdded: number }> {
  let verifiedCount = 0;
  let hitsAdded = 0;
  try {
    // 1. Get all pending predictions
    const pendingRes = await db.execute({
      sql: "SELECT id, prediction_date, predicted_numbers FROM playwhe_predictions WHERE status = 'PENDING'"
    });

    const pending = pendingRes.rows.map(row => ({
      id: Number(row[0]),
      prediction_date: String(row[1]),
      predicted_numbers: String(row[2])
    }));

    const todayStr = getLocalDateString();

    for (const p of pending) {
      // Fetch draws for this prediction date
      const drawsRes = await db.execute({
        sql: "SELECT draw_number, winning_number, draw_time_slot FROM playwhe_draws WHERE draw_date = ?",
        args: [p.prediction_date]
      });

      const draws = drawsRes.rows.map(row => ({
        draw_number: Number(row[0]),
        winning_number: Number(row[1]),
        draw_time_slot: String(row[2])
      }));

      const predictedList = p.predicted_numbers.split(",").map(Number);
      
      // Look for a hit
      let hitDraw = null;
      for (const draw of draws) {
        if (predictedList.includes(draw.winning_number)) {
          hitDraw = draw;
          break;
        }
      }

      if (hitDraw) {
        // It's a HIT!
        await db.execute({
          sql: `UPDATE playwhe_predictions 
                SET status = 'HIT', 
                    winning_number = ?, 
                    winning_time_slot = ?, 
                    winning_draw_number = ? 
                WHERE id = ?`,
          args: [hitDraw.winning_number, hitDraw.draw_time_slot, hitDraw.draw_number, p.id]
        });
        verifiedCount++;
        hitsAdded++;
        console.log(`[Verifier] HIT: Prediction on ${p.prediction_date} (${p.predicted_numbers}) matched drawn number ${hitDraw.winning_number} at ${hitDraw.draw_time_slot}`);
      } else {
        // Check if we should mark it as a MISS
        // We mark it as MISS if:
        // A. There are 4 draws registered for that date (all daily slots done)
        // B. The date is older than today (in local AST time)
        const isPastDate = p.prediction_date < todayStr;
        if (draws.length >= 4 || isPastDate) {
          await db.execute({
            sql: "UPDATE playwhe_predictions SET status = 'MISS' WHERE id = ?",
            args: [p.id]
          });
          verifiedCount++;
          console.log(`[Verifier] MISS: Prediction on ${p.prediction_date} (${p.predicted_numbers}) was a miss.`);
        }
      }
    }
  } catch (err) {
    console.error("[Verifier] Error verifying predictions:", err);
  }
  return { verifiedCount, hitsAdded };
}
