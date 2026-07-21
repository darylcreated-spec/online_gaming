import { db } from "./db";

// Helper to format Date objects as YYYY-MM-DD local time
export function getLocalDateString(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split("T")[0];
}

// Generate Play Whe predictions (3 numbers) for a given date (YYYY-MM-DD) and draw time slot
export async function generatePlayWhePredictions(dateStr: string, slotStr: string): Promise<{ predicted_numbers: string; success: boolean }> {
  try {
    // 1. Check if a prediction already exists for this date and slot combination
    const existing = await db.execute({
      sql: "SELECT status, predicted_numbers FROM playwhe_predictions WHERE prediction_date = ? AND UPPER(draw_time_slot) = UPPER(?)",
      args: [dateStr, slotStr]
    });
    
    if (existing.rows.length > 0) {
      const record = existing.rows[0];
      const status = String(record[0]);
      const predicted = String(record[1]);
      
      // If the prediction status is locked (HIT or MISS), return it directly.
      // If it is PENDING, we let the predictor recalculate it using the latest drawing results.
      if (status !== 'PENDING') {
        return {
          predicted_numbers: predicted,
          success: true
        };
      }
    }

    // 2. Fetch the last 150 draws for this specific slot to analyze slot-specific behavior
    const slotDrawsRes = await db.execute({
      sql: "SELECT winning_number FROM playwhe_draws WHERE UPPER(draw_time_slot) = UPPER(?) ORDER BY id DESC LIMIT 150",
      args: [slotStr]
    });
    
    const slotDraws = slotDrawsRes.rows.map(row => Number(row[0]));

    // Fetch the last 150 draws overall for successor/companion co-occurrences
    const generalDrawsRes = await db.execute({
      sql: "SELECT winning_number FROM playwhe_draws ORDER BY id DESC LIMIT 150"
    });
    
    const generalDraws = generalDrawsRes.rows.map(row => Number(row[0]));

    if (generalDraws.length < 5) {
      // Fallback if db is empty or has too few records
      const fallbackList = [
        ["01", "12", "29", "08", "22"],
        ["02", "13", "30", "09", "23"],
        ["03", "14", "31", "10", "24"],
        ["04", "15", "32", "11", "25"]
      ];
      const slots = ["MORNING", "MIDDAY", "AFTERNOON", "EVENING"];
      const slotIdx = Math.max(0, slots.indexOf(slotStr));
      const fallback = fallbackList[slotIdx].join(",");

      await db.execute({
        sql: "INSERT OR IGNORE INTO playwhe_predictions (prediction_date, draw_time_slot, predicted_numbers, status) VALUES (?, ?, ?, 'PENDING')",
        args: [dateStr, slotStr, fallback]
      });
      return { predicted_numbers: fallback, success: true };
    }

    // 3. Compute probability weights for all 36 numbers
    const freqs: Record<number, number> = {};
    const gaps: Record<number, number> = {};
    const successors: Record<number, number> = {};

    // Initialize metrics
    for (let i = 1; i <= 36; i++) {
      freqs[i] = 0;
      gaps[i] = 150; // default large gap
      successors[i] = 0;
    }

    // A. Slot Frequencies over slot-specific history
    slotDraws.forEach(val => {
      if (freqs[val] !== undefined) freqs[val]++;
    });

    // B. Calculate Gaps (draws since last seen in this slot)
    for (let i = 1; i <= 36; i++) {
      const idx = slotDraws.indexOf(i);
      if (idx !== -1) {
        gaps[i] = idx;
      }
    }

    // C. Successors of the last drawn numbers overall (1st and 2nd order Markov Chain)
    const lastDrawn = generalDraws[0];
    const secondLastDrawn = generalDraws[1]; // generalDraws length is checked >= 5
    const successors1st: Record<number, number> = {};
    const successors2nd: Record<number, number> = {};

    for (let i = 1; i <= 36; i++) {
      successors1st[i] = 0;
      successors2nd[i] = 0;
    }

    // 1st-order transitions: lastDrawn -> candidate
    for (let i = 0; i < generalDraws.length - 1; i++) {
      if (generalDraws[i + 1] === lastDrawn) {
        successors1st[generalDraws[i]]++;
      }
    }

    // 2nd-order transitions: (secondLastDrawn, lastDrawn) -> candidate
    for (let i = 0; i < generalDraws.length - 2; i++) {
      if (generalDraws[i + 2] === secondLastDrawn && generalDraws[i + 1] === lastDrawn) {
        successors2nd[generalDraws[i]]++;
      }
    }

    // 4. Calculate total score for each of the 36 numbers
    const candidates = [];
    for (let i = 1; i <= 36; i++) {
      // Weighting formula: 2nd-order transitions (3.0) + 1st-order transitions (1.5) + Slot frequency (1.0) + Overdue gap in slot (0.5)
      const score = (successors2nd[i] * 3.0) + (successors1st[i] * 1.5) + (freqs[i] * 1.0) + (gaps[i] * 0.5);
      candidates.push({ num: i, score });
    }

    // Sort descending by score
    candidates.sort((a, b) => b.score - a.score);

    // Pick top 5 unique numbers
    const top5 = candidates.slice(0, 5).map(c => String(c.num).padStart(2, "0"));
    const predictionString = top5.join(",");

    // Save or update to database (using INSERT OR REPLACE to overwrite PENDING values)
    await db.execute({
      sql: "INSERT OR REPLACE INTO playwhe_predictions (prediction_date, draw_time_slot, predicted_numbers, status) VALUES (?, ?, ?, 'PENDING')",
      args: [dateStr, slotStr, predictionString]
    });

    console.log(`[Predictor] Generated predictions for ${dateStr} [${slotStr}]: ${predictionString}`);
    return { predicted_numbers: predictionString, success: true };
  } catch (err) {
    console.error(`[Predictor] Error generating predictions for ${dateStr} [${slotStr}]:`, err);
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
      sql: "SELECT id, prediction_date, draw_time_slot, predicted_numbers FROM playwhe_predictions WHERE status = 'PENDING'"
    });

    const pending = pendingRes.rows.map(row => ({
      id: Number(row[0]),
      prediction_date: String(row[1]),
      draw_time_slot: String(row[2]),
      predicted_numbers: String(row[3])
    }));

    const todayStr = getLocalDateString();
    const slotOrder = ["MORNING", "MIDDAY", "AFTERNOON", "EVENING"];

    for (const p of pending) {
      // Fetch draw for this specific date and time slot
      const drawRes = await db.execute({
        sql: "SELECT draw_number, winning_number FROM playwhe_draws WHERE draw_date = ? AND UPPER(draw_time_slot) = UPPER(?)",
        args: [p.prediction_date, p.draw_time_slot]
      });

      if (drawRes.rows.length > 0) {
        // Draw exists! Evaluate hit/miss
        const drawNumber = Number(drawRes.rows[0][0]);
        const winningNumber = Number(drawRes.rows[0][1]);
        const predictedList = p.predicted_numbers.split(",").map(Number);

        if (predictedList.includes(winningNumber)) {
          // It's a HIT!
          await db.execute({
            sql: `UPDATE playwhe_predictions 
                  SET status = 'HIT', 
                      winning_number = ?, 
                      winning_draw_number = ? 
                  WHERE id = ?`,
            args: [winningNumber, drawNumber, p.id]
          });
          hitsAdded++;
          verifiedCount++;
          console.log(`[Verifier] HIT: Prediction on ${p.prediction_date} [${p.draw_time_slot}] (${p.predicted_numbers}) matched winning number ${winningNumber} on draw #${drawNumber}`);
        } else {
          // It's a MISS!
          await db.execute({
            sql: `UPDATE playwhe_predictions 
                  SET status = 'MISS', 
                      winning_number = ?, 
                      winning_draw_number = ? 
                  WHERE id = ?`,
            args: [winningNumber, drawNumber, p.id]
          });
          verifiedCount++;
          console.log(`[Verifier] MISS: Prediction on ${p.prediction_date} [${p.draw_time_slot}] (${p.predicted_numbers}) missed against drawn number ${winningNumber}`);
        }
      } else {
        // Draw does not exist in the database. Should we grade it as MISS?
        const isPastDate = p.prediction_date < todayStr;
        
        if (isPastDate) {
          // Date is in the past, so if no draw is found, it's a miss
          await db.execute({
            sql: "UPDATE playwhe_predictions SET status = 'MISS' WHERE id = ?",
            args: [p.id]
          });
          verifiedCount++;
        } else if (p.prediction_date === todayStr) {
          // Date is today. Check if a later slot of today has already been drawn
          const currentSlotIndex = slotOrder.indexOf(p.draw_time_slot);
          const subsequentSlots = slotOrder.slice(currentSlotIndex + 1);
          
          let subsequentDrawn = false;
          if (subsequentSlots.length > 0) {
            const placeholders = subsequentSlots.map(() => "?").join(",");
            const checkSubRes = await db.execute({
              sql: `SELECT COUNT(*) FROM playwhe_draws 
                    WHERE draw_date = ? AND UPPER(draw_time_slot) IN (${placeholders})`,
              args: [p.prediction_date, ...subsequentSlots]
            });
            if (Number(checkSubRes.rows[0][0]) > 0) {
              subsequentDrawn = true;
            }
          }

          if (subsequentDrawn) {
            // A later slot has already been drawn today, so this missing slot is graded as a miss
            await db.execute({
              sql: "UPDATE playwhe_predictions SET status = 'MISS' WHERE id = ?",
              args: [p.id]
            });
            verifiedCount++;
            console.log(`[Verifier] Same-day MISS: Prediction on ${p.prediction_date} [${p.draw_time_slot}] missed because a later draw has already occurred.`);
          }
        }
      }
    }
  } catch (err) {
    console.error("[Verifier] Error verifying predictions:", err);
  }
  return { verifiedCount, hitsAdded };
}
