import { db } from "./db";

// Helper to format Date objects as YYYY-MM-DD local time
export function getLocalDateString(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split("T")[0];
}

// ============================================================
// PLAY WHE ENSEMBLE PREDICTION ENGINE v2.0
// 5 Independent Models + Ensemble Voting + Weighted Random Sampling
// ============================================================

// Seeded PRNG for reproducible weighted random sampling per slot
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

function createSlotSeed(dateStr: string, slotStr: string): number {
  let hash = 0;
  const str = dateStr + slotStr + new Date().getMinutes().toString();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Generate Play Whe predictions using 5-Model Ensemble + Weighted Random Sampling
export async function generatePlayWhePredictions(dateStr: string, slotStr: string): Promise<{ predicted_numbers: string; success: boolean; modelBreakdown?: any[] }> {
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
      if (status !== 'PENDING') {
        return { predicted_numbers: predicted, success: true, modelBreakdown: [] };
      }
    }

    // 2. Fetch data — include draw_date and draw_time_slot for day-of-week profiling
    const slotDrawsRes = await db.execute({
      sql: "SELECT winning_number FROM playwhe_draws WHERE UPPER(draw_time_slot) = UPPER(?) ORDER BY id DESC LIMIT 200",
      args: [slotStr]
    });
    const slotDraws = slotDrawsRes.rows.map(row => Number(row[0]));

    const generalDrawsRes = await db.execute({
      sql: "SELECT winning_number, draw_date, draw_time_slot FROM playwhe_draws ORDER BY id DESC LIMIT 300"
    });
    const generalDraws = generalDrawsRes.rows.map(row => ({
      num: Number(row[0]),
      date: String(row[1]),
      slot: String(row[2])
    }));
    const allNums = generalDraws.map(d => d.num);

    if (allNums.length < 10) {
      // Fallback if db has too few records
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
      return { predicted_numbers: fallback, success: true, modelBreakdown: [] };
    }

    // ============================================================
    // MODEL 1: 2nd-Order Markov Chain
    // Tracks what numbers historically follow the last two drawn numbers.
    // ============================================================
    const lastDrawn = allNums[0];
    const secondLastDrawn = allNums[1];
    const markovScores: Record<number, number> = {};
    for (let i = 1; i <= 36; i++) markovScores[i] = 0;

    for (let i = 0; i < allNums.length - 1; i++) {
      if (allNums[i + 1] === lastDrawn) {
        markovScores[allNums[i]] += 1.5;
      }
    }
    for (let i = 0; i < allNums.length - 2; i++) {
      if (allNums[i + 2] === secondLastDrawn && allNums[i + 1] === lastDrawn) {
        markovScores[allNums[i]] += 3.0;
      }
    }

    const markovTop8 = Object.entries(markovScores)
      .map(([n, s]) => ({ num: Number(n), score: s }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(c => c.num);

    // ============================================================
    // MODEL 2: Momentum Detection (Heating Up / Cooling Down)
    // Compares a number's frequency in the last 12 draws vs the last 60.
    // Numbers accelerating above their long-term average are "heating up".
    // ============================================================
    const recent12 = allNums.slice(0, Math.min(12, allNums.length));
    const recent60 = allNums.slice(0, Math.min(60, allNums.length));
    const momentumScores: Record<number, number> = {};
    for (let i = 1; i <= 36; i++) {
      const shortFreq = recent12.filter(n => n === i).length / recent12.length;
      const longFreq = recent60.filter(n => n === i).length / recent60.length;
      // Momentum = ratio of short-term rate to long-term rate
      // Numbers not seen in the long term but seen recently get a boost
      momentumScores[i] = longFreq > 0 ? (shortFreq / longFreq) : (shortFreq > 0 ? 3.0 : 0);
    }

    const momentumTop8 = Object.entries(momentumScores)
      .map(([n, s]) => ({ num: Number(n), score: s }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(c => c.num);

    // ============================================================
    // MODEL 3: Day-of-Week + Slot Profile
    // Filters historical draws by the same day of week AND same time slot.
    // Some numbers historically favour specific day+slot combinations.
    // ============================================================
    const targetDate = new Date(dateStr + 'T12:00:00');
    const targetDayOfWeek = targetDate.getDay();

    const daySlotDraws = generalDraws.filter(d => {
      try {
        const drawDate = new Date(d.date + 'T12:00:00');
        return drawDate.getDay() === targetDayOfWeek &&
               d.slot.toUpperCase() === slotStr.toUpperCase();
      } catch { return false; }
    }).map(d => d.num);

    const daySlotFreqs: Record<number, number> = {};
    for (let i = 1; i <= 36; i++) daySlotFreqs[i] = 0;
    daySlotDraws.forEach(n => { if (daySlotFreqs[n] !== undefined) daySlotFreqs[n]++; });

    const daySlotTop8 = Object.entries(daySlotFreqs)
      .map(([n, s]) => ({ num: Number(n), score: s }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(c => c.num);

    // ============================================================
    // MODEL 4: Cycle / Periodicity Detection
    // For each number, computes average gap between consecutive appearances.
    // Numbers whose current gap is near a multiple of their average cycle
    // are scored higher — they're entering their expected return window.
    // ============================================================
    const cycleScores: Record<number, number> = {};
    for (let i = 1; i <= 36; i++) {
      const positions: number[] = [];
      allNums.forEach((n, idx) => { if (n === i) positions.push(idx); });

      if (positions.length >= 3) {
        const gapsBetween: number[] = [];
        for (let j = 0; j < positions.length - 1; j++) {
          gapsBetween.push(positions[j + 1] - positions[j]);
        }
        const avgGap = gapsBetween.reduce((a, b) => a + b, 0) / gapsBetween.length;
        const currentGap = positions[0]; // draws since last seen

        if (avgGap > 0) {
          const ratio = currentGap / avgGap;
          const nearestMultiple = Math.max(1, Math.round(ratio));
          const deviation = Math.abs(ratio - nearestMultiple);
          // Score is high when deviation is small (number is due based on its cycle)
          cycleScores[i] = (1 / (deviation + 0.15)) * Math.min(nearestMultiple, 3);
        } else {
          cycleScores[i] = 0;
        }
      } else {
        cycleScores[i] = 0;
      }
    }

    const cycleTop8 = Object.entries(cycleScores)
      .map(([n, s]) => ({ num: Number(n), score: s }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(c => c.num);

    // ============================================================
    // MODEL 5: Slot-Specific Frequency + Gap Scoring (enhanced)
    // Uses slot-specific data with a balanced frequency/gap formula.
    // ============================================================
    const slotFreqs: Record<number, number> = {};
    const slotGaps: Record<number, number> = {};
    for (let i = 1; i <= 36; i++) {
      slotFreqs[i] = 0;
      slotGaps[i] = 200;
    }
    slotDraws.forEach(val => { if (slotFreqs[val] !== undefined) slotFreqs[val]++; });
    for (let i = 1; i <= 36; i++) {
      const idx = slotDraws.indexOf(i);
      if (idx !== -1) slotGaps[i] = idx;
    }

    const slotScoreTop8 = Object.entries(slotFreqs)
      .map(([n]) => {
        const num = Number(n);
        return { num, score: slotFreqs[num] * 1.0 + slotGaps[num] * 0.4 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(c => c.num);

    // ============================================================
    // MODEL 6: Number Decay — exponential pressure build-up
    // ============================================================
    const decayScores: Record<number, number> = {};
    for (let i = 1; i <= 36; i++) {
      const lastSeenIdx = allNums.indexOf(i);
      if (lastSeenIdx === -1) {
        decayScores[i] = 5.0; // never seen = maximum pressure
      } else {
        const avgGapForNum = allNums.filter(n => n === i).length > 0
          ? allNums.length / allNums.filter(n => n === i).length
          : 36;
        decayScores[i] = 1 - Math.exp(-lastSeenIdx / avgGapForNum);
      }
    }
    const decayTop8 = Object.entries(decayScores)
      .map(([n, s]) => ({ num: Number(n), score: s }))
      .filter(c => c.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(c => c.num);

    // ============================================================
    // MODEL 7: Positional Pair Chains (skip-gram at distances 2-5)
    // ============================================================
    const pairScores: Record<number, number> = {};
    for (let i = 1; i <= 36; i++) pairScores[i] = 0;
    const distances = [2, 3, 4, 5];
    const distWeights = [1.5, 1.2, 0.8, 0.5];
    for (let dIdx = 0; dIdx < distances.length; dIdx++) {
      const d = distances[dIdx];
      const w = distWeights[dIdx];
      for (let j = d; j < allNums.length; j++) {
        if (allNums[j] === lastDrawn) {
          const target = allNums[j - d];
          if (target >= 1 && target <= 36) pairScores[target] += w;
        }
      }
    }
    const pairTop8 = Object.entries(pairScores)
      .map(([n, s]) => ({ num: Number(n), score: s }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(c => c.num);

    // ============================================================
    // MODEL 8: Entropy Anomaly — predict underrepresented numbers when distribution is skewed
    // ============================================================
    const window40 = allNums.slice(0, Math.min(40, allNums.length));
    const windowFreq: Record<number, number> = {};
    for (let i = 1; i <= 36; i++) windowFreq[i] = 0;
    window40.forEach(n => { if (windowFreq[n] !== undefined) windowFreq[n]++; });
    const total40 = window40.length;
    let entropy = 0;
    for (let i = 1; i <= 36; i++) {
      const p = windowFreq[i] / total40;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(36); // ~5.17
    const entropyRatio = entropy / maxEntropy;

    const entropyScores: Record<number, number> = {};
    if (entropyRatio < 0.88) {
      // Distribution is skewed — favor underrepresented numbers
      const avgFreq = total40 / 36;
      for (let i = 1; i <= 36; i++) {
        entropyScores[i] = Math.max(0, avgFreq - windowFreq[i]) * (1 - entropyRatio) * 3;
      }
    } else {
      // Distribution is uniform — no strong signal from entropy
      for (let i = 1; i <= 36; i++) entropyScores[i] = 0;
    }
    const entropyTop8 = Object.entries(entropyScores)
      .map(([n, s]) => ({ num: Number(n), score: s }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(c => c.num);

    // ============================================================
    // STRATEGY 5: ELIMINATION FILTER
    // Remove numbers that are statistically unlikely for this draw.
    // ============================================================
    const eliminated = new Set<number>();
    // Remove the last 2 drawn numbers (immediate repeats are rare)
    eliminated.add(allNums[0]);
    if (allNums.length > 1) eliminated.add(allNums[1]);
    // Remove numbers with zero signal across ALL models
    for (let i = 1; i <= 36; i++) {
      if (markovScores[i] === 0 && momentumScores[i] === 0 &&
          daySlotFreqs[i] === 0 && cycleScores[i] === 0 && slotFreqs[i] === 0) {
        eliminated.add(i);
      }
    }

    // ============================================================
    // STRATEGY 3: ENSEMBLE VOTING
    // Each model's top-8 votes; numbers appearing across the most models win.
    // ============================================================
    const voteCount: Record<number, number> = {};
    const rankSum: Record<number, number> = {};
    for (let i = 1; i <= 36; i++) {
      voteCount[i] = 0;
      rankSum[i] = 0;
    }

    const models = [markovTop8, momentumTop8, daySlotTop8, cycleTop8, slotScoreTop8, decayTop8, pairTop8, entropyTop8];
    models.forEach(top8 => {
      top8.forEach((num, rank) => {
        voteCount[num]++;
        rankSum[num] += (8 - rank); // Higher rank = higher bonus
      });
    });

    // Filter out eliminated numbers and build ensemble candidates
    const ensembleCandidates = Array.from({ length: 36 }, (_, i) => i + 1)
      .filter(n => !eliminated.has(n))
      .map(num => ({
        num,
        votes: voteCount[num],
        rankBonus: rankSum[num],
        totalScore: voteCount[num] * 10 + rankSum[num]
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 15);

    // ============================================================
    // STRATEGY 6: WEIGHTED RANDOM SAMPLING
    // Use ensemble scores as probability weights instead of deterministic top-5.
    // This ensures different numbers get picked each draw.
    // ============================================================
    const rng = seededRandom(createSlotSeed(dateStr, slotStr));
    const selected: number[] = [];
    const remaining = [...ensembleCandidates];

    while (selected.length < 5 && remaining.length > 0) {
      const totalWeight = remaining.reduce((sum, c) => sum + c.totalScore + 1, 0);
      const rand = rng() * totalWeight;
      let cumulative = 0;
      for (let i = 0; i < remaining.length; i++) {
        cumulative += remaining[i].totalScore + 1;
        if (rand <= cumulative) {
          selected.push(remaining[i].num);
          remaining.splice(i, 1);
          break;
        }
      }
    }

    // Fallback: if we couldn't fill 5 numbers, pull from ensemble
    while (selected.length < 5 && ensembleCandidates.length > 0) {
      const next = ensembleCandidates.find(c => !selected.includes(c.num));
      if (next) selected.push(next.num);
      else break;
    }
    // Final fallback: random from 1-36
    while (selected.length < 5) {
      const r = Math.floor(rng() * 36) + 1;
      if (!selected.includes(r) && !eliminated.has(r)) selected.push(r);
    }
    
    const breakdown = selected.map(num => {
      const votedModels: string[] = [];
      if (markovTop8.includes(num)) votedModels.push('Markov');
      if (momentumTop8.includes(num)) votedModels.push('Momentum');
      if (daySlotTop8.includes(num)) votedModels.push('Day+Slot');
      if (cycleTop8.includes(num)) votedModels.push('Cycle');
      if (slotScoreTop8.includes(num)) votedModels.push('SlotFreq');
      if (decayTop8.includes(num)) votedModels.push('Decay');
      if (pairTop8.includes(num)) votedModels.push('PairChain');
      if (entropyTop8.includes(num)) votedModels.push('Entropy');
      return {
        number: num,
        votes: votedModels.length,
        models: votedModels,
        confidence: Math.round((votedModels.length / 8) * 100)
      };
    });

    const top5 = selected.map(c => String(c).padStart(2, "0"));
    const predictionString = top5.join(",");

    // Save or update to database
    await db.execute({
      sql: "INSERT OR REPLACE INTO playwhe_predictions (prediction_date, draw_time_slot, predicted_numbers, status) VALUES (?, ?, ?, 'PENDING')",
      args: [dateStr, slotStr, predictionString]
    });

    console.log(`[Predictor v2] Ensemble predictions for ${dateStr} [${slotStr}]: ${predictionString}`);
    console.log(`[Predictor v2] Models: Markov=${markovTop8.join(",")}, Momentum=${momentumTop8.join(",")}, DaySlot=${daySlotTop8.join(",")}, Cycle=${cycleTop8.join(",")}, SlotFreq=${slotScoreTop8.join(",")}, Decay=${decayTop8.join(",")}, PairChain=${pairTop8.join(",")}, Entropy=${entropyTop8.join(",")}`);
    console.log(`[Predictor v2] Eliminated: ${[...eliminated].join(",")}`);

    return { predicted_numbers: predictionString, success: true, modelBreakdown: breakdown };
  } catch (err) {
    console.error(`[Predictor v2] Error generating predictions for ${dateStr} [${slotStr}]:`, err);
    return { predicted_numbers: "", success: false, modelBreakdown: [] };
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
