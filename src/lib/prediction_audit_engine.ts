import { query, db } from "@/lib/db";

export interface PredictionAuditRecord {
  id: number;
  game_key: "play-whe" | "pick4" | "cashpot" | "lotto-plus" | "win-for-life";
  prediction_type: string;
  target_draw_number: number;
  target_draw_date: string;
  target_period?: string;
  predicted_numbers: number[];
  wheel_lines?: number[][];
  predicted_sum?: number;
  predicted_parity?: string;
  confidence_score?: number;
  rationale?: string;
  status: "PENDING" | "VERIFIED_WINNER" | "VERIFIED_PARTIAL" | "VERIFIED_MISS";
  actual_draw_number?: number;
  actual_numbers?: number[];
  matching_numbers?: number[];
  match_count: number;
  best_wheel_match: number;
  prize_tier?: string;
  is_prize_winner: number;
  efficiency_score: number;
  created_at: string;
  verified_at?: string;
}

export interface PredictionAuditSummary {
  totalAudited: number;
  totalVerified: number;
  totalPending: number;
  prizeWinningCount: number;
  prizeWinRatePct: number;
  averageMatchCount: number;
  gameSummaries: Record<string, {
    total: number;
    verified: number;
    prizeHits: number;
    winRatePct: number;
    avgMatch: number;
  }>;
}

/**
 * Initializes the unified prediction audits table and indexes in Turso DB
 */
export async function initPredictionAuditTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS prediction_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_key TEXT NOT NULL,
      prediction_type TEXT NOT NULL,
      target_draw_number INTEGER NOT NULL,
      target_draw_date TEXT,
      target_period TEXT,
      predicted_numbers TEXT NOT NULL,
      wheel_lines TEXT,
      predicted_sum INTEGER,
      predicted_parity TEXT,
      confidence_score REAL,
      rationale TEXT,
      status TEXT DEFAULT 'PENDING',
      actual_draw_number INTEGER,
      actual_numbers TEXT,
      matching_numbers TEXT,
      match_count INTEGER DEFAULT 0,
      best_wheel_match INTEGER DEFAULT 0,
      prize_tier TEXT,
      is_prize_winner INTEGER DEFAULT 0,
      efficiency_score REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      verified_at TEXT
    );
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_pred_audit_game ON prediction_audits (game_key, status);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_pred_audit_target ON prediction_audits (game_key, target_draw_number);`);
}

/**
 * Saves a generated Hot Pick prediction into the audit table if not already recorded.
 */
export async function recordHotPickPrediction(params: {
  gameKey: "play-whe" | "pick4" | "cashpot" | "lotto-plus" | "win-for-life";
  predictionType: string;
  targetDrawNumber: number;
  targetDrawDate?: string;
  targetPeriod?: string;
  predictedNumbers: number[];
  wheelLines?: number[][];
  predictedSum?: number;
  predictedParity?: string;
  confidenceScore?: number;
  rationale?: string;
}) {
  try {
    await initPredictionAuditTable();

    // Check if an identical prediction is already logged for this game and target draw
    const existing = await query<any>(
      "SELECT id FROM prediction_audits WHERE game_key = ? AND target_draw_number = ? AND prediction_type = ?",
      [params.gameKey, params.targetDrawNumber, params.predictionType]
    );

    if (existing && existing.length > 0) {
      return { recorded: false, id: existing[0].id, message: "Already tracked in audit table" };
    }

    const res = await db.execute({
      sql: `
        INSERT INTO prediction_audits (
          game_key, prediction_type, target_draw_number, target_draw_date, target_period,
          predicted_numbers, wheel_lines, predicted_sum, predicted_parity,
          confidence_score, rationale, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `,
      args: [
        params.gameKey,
        params.predictionType,
        params.targetDrawNumber,
        params.targetDrawDate || null,
        params.targetPeriod || null,
        JSON.stringify(params.predictedNumbers),
        params.wheelLines ? JSON.stringify(params.wheelLines) : null,
        params.predictedSum || null,
        params.predictedParity || null,
        params.confidenceScore || null,
        params.rationale || null
      ]
    });

    return { recorded: true, id: Number(res.lastInsertRowid), message: "Logged to audit database" };
  } catch (error: any) {
    console.error(`[Audit Engine] Error saving prediction for ${params.gameKey}:`, error);
    return { recorded: false, error: error.message };
  }
}

/**
 * Reconciles and verifies all pending predictions against actual winning draws in the database
 */
export async function reconcilePredictionAudits() {
  await initPredictionAuditTable();

  const pending = await query<any>(
    "SELECT * FROM prediction_audits WHERE status = 'PENDING' ORDER BY id ASC"
  );

  if (!pending || pending.length === 0) {
    return { verifiedCount: 0, message: "No pending predictions to reconcile" };
  }

  let verifiedCount = 0;

  for (const pred of pending) {
    const gameKey = pred.game_key;
    const targetDraw = Number(pred.target_draw_number);
    let actualDraw: any = null;

    if (gameKey === "play-whe") {
      const rows = await query<any>(
        "SELECT draw_number, draw_date, draw_time_slot, winning_number FROM playwhe_draws WHERE draw_number = ?",
        [targetDraw]
      );
      if (rows.length > 0) {
        actualDraw = {
          draw_number: Number(rows[0].draw_number),
          numbers: [Number(rows[0].winning_number)]
        };
      }
    } else if (gameKey === "pick4") {
      const rows = await query<any>(
        "SELECT draw_number, draw_date, digit1, digit2, digit3, digit4 FROM pick4_draws WHERE draw_number = ?",
        [targetDraw]
      );
      if (rows.length > 0) {
        actualDraw = {
          draw_number: Number(rows[0].draw_number),
          numbers: [Number(rows[0].digit1), Number(rows[0].digit2), Number(rows[0].digit3), Number(rows[0].digit4)]
        };
      }
    } else if (gameKey === "cashpot") {
      const rows = await query<any>(
        "SELECT draw_number, draw_date, num1, num2, num3, num4, num5 FROM cashpot_draws WHERE draw_number = ?",
        [targetDraw]
      );
      if (rows.length > 0) {
        actualDraw = {
          draw_number: Number(rows[0].draw_number),
          numbers: [Number(rows[0].num1), Number(rows[0].num2), Number(rows[0].num3), Number(rows[0].num4), Number(rows[0].num5)].sort((a, b) => a - b)
        };
      }
    } else if (gameKey === "lotto-plus") {
      const rows = await query<any>(
        "SELECT draw_number, draw_date, num1, num2, num3, num4, num5 FROM draws WHERE draw_number = ?",
        [targetDraw]
      );
      if (rows.length > 0) {
        actualDraw = {
          draw_number: Number(rows[0].draw_number),
          numbers: [Number(rows[0].num1), Number(rows[0].num2), Number(rows[0].num3), Number(rows[0].num4), Number(rows[0].num5)].sort((a, b) => a - b)
        };
      }
    } else if (gameKey === "win-for-life") {
      const rows = await query<any>(
        "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6 FROM winforlife_draws WHERE draw_number = ?",
        [targetDraw]
      );
      if (rows.length > 0) {
        actualDraw = {
          draw_number: Number(rows[0].draw_number),
          numbers: [
            Number(rows[0].num1), Number(rows[0].num2), Number(rows[0].num3),
            Number(rows[0].num4), Number(rows[0].num5), Number(rows[0].num6)
          ].sort((a, b) => a - b)
        };
      }
    }

    // If actual draw is found, evaluate the prediction efficiency
    if (actualDraw) {
      let predictedNums: number[] = [];
      try {
        predictedNums = JSON.parse(pred.predicted_numbers);
      } catch {
        predictedNums = String(pred.predicted_numbers).split(",").map(Number);
      }

      let wheelLines: number[][] = [];
      if (pred.wheel_lines) {
        try {
          wheelLines = JSON.parse(pred.wheel_lines);
        } catch {
          wheelLines = [];
        }
      }

      const actualNums = actualDraw.numbers;
      const actualSet = new Set(actualNums);

      // Compute intersection matches
      let matchingNumbers: number[] = [];
      let matchCount = 0;
      let isPrize = 0;
      let prizeTier = "NONE";
      let status: "VERIFIED_WINNER" | "VERIFIED_PARTIAL" | "VERIFIED_MISS" = "VERIFIED_MISS";

      if (gameKey === "play-whe") {
        if (predictedNums.includes(actualNums[0])) {
          matchingNumbers = [actualNums[0]];
          matchCount = 1;
          isPrize = 1;
          prizeTier = "EXACT_MARK";
          status = "VERIFIED_WINNER";
        }
      } else if (gameKey === "pick4") {
        // Evaluate Box and Straight matches
        const actualSorted = [...actualNums].sort((a, b) => a - b).join("");
        const predSorted = [...predictedNums].sort((a, b) => a - b).join("");
        const exactStraight = predictedNums.join("") === actualNums.join("");
        matchingNumbers = predictedNums.filter(d => actualNums.includes(d));
        matchCount = matchingNumbers.length;

        if (exactStraight) {
          isPrize = 1;
          prizeTier = "STRAIGHT";
          status = "VERIFIED_WINNER";
        } else if (predSorted === actualSorted) {
          isPrize = 1;
          prizeTier = "BOX";
          status = "VERIFIED_WINNER";
        } else if (matchCount >= 3) {
          prizeTier = "MATCH_3_DIGITS";
          status = "VERIFIED_PARTIAL";
        }
      } else {
        // Multi-ball games: Cash Pot (5), Lotto Plus (5), Win For Life (6)
        matchingNumbers = predictedNums.filter(n => actualSet.has(n));
        matchCount = matchingNumbers.length;

        // Check wheel lines best match
        let bestWheelMatch = 0;
        wheelLines.forEach(line => {
          const m = line.filter(n => actualSet.has(n)).length;
          if (m > bestWheelMatch) bestWheelMatch = m;
        });

        // Determine prize eligibility based on official NLCB rules
        if (gameKey === "cashpot") {
          if (matchCount === 5 || bestWheelMatch === 5) {
            isPrize = 1;
            prizeTier = "MATCH_5_JACKPOT";
            status = "VERIFIED_WINNER";
          } else if (matchCount === 4 || bestWheelMatch === 4) {
            isPrize = 1;
            prizeTier = "MATCH_4";
            status = "VERIFIED_WINNER";
          } else if (matchCount === 3 || bestWheelMatch === 3) {
            isPrize = 1;
            prizeTier = "MATCH_3";
            status = "VERIFIED_WINNER";
          } else if (matchCount >= 1 || bestWheelMatch >= 1) {
            status = "VERIFIED_PARTIAL";
          }
        } else if (gameKey === "lotto-plus") {
          if (matchCount === 5 || bestWheelMatch === 5) {
            isPrize = 1;
            prizeTier = "MATCH_5";
            status = "VERIFIED_WINNER";
          } else if (matchCount === 4 || bestWheelMatch === 4) {
            isPrize = 1;
            prizeTier = "MATCH_4";
            status = "VERIFIED_WINNER";
          } else if (matchCount === 3 || bestWheelMatch === 3) {
            isPrize = 1;
            prizeTier = "MATCH_3";
            status = "VERIFIED_WINNER";
          } else if (matchCount >= 2 || bestWheelMatch >= 2) {
            status = "VERIFIED_PARTIAL";
          }
        } else if (gameKey === "win-for-life") {
          if (matchCount === 6 || bestWheelMatch === 6) {
            isPrize = 1;
            prizeTier = "MATCH_6";
            status = "VERIFIED_WINNER";
          } else if (matchCount === 5 || bestWheelMatch === 5) {
            isPrize = 1;
            prizeTier = "MATCH_5";
            status = "VERIFIED_WINNER";
          } else if (matchCount === 4 || bestWheelMatch === 4) {
            isPrize = 1;
            prizeTier = "MATCH_4";
            status = "VERIFIED_WINNER";
          } else if (matchCount === 3 || bestWheelMatch === 3) {
            isPrize = 1;
            prizeTier = "MATCH_3";
            status = "VERIFIED_WINNER";
          } else if (matchCount >= 2 || bestWheelMatch >= 2) {
            status = "VERIFIED_PARTIAL";
          }
        }
      }

      const efficiencyScore = (matchCount / (predictedNums.length || 1)) * 100;

      await db.execute({
        sql: `
          UPDATE prediction_audits
          SET status = ?,
              actual_draw_number = ?,
              actual_numbers = ?,
              matching_numbers = ?,
              match_count = ?,
              best_wheel_match = ?,
              prize_tier = ?,
              is_prize_winner = ?,
              efficiency_score = ?,
              verified_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [
          status,
          actualDraw.draw_number,
          JSON.stringify(actualNums),
          JSON.stringify(matchingNumbers),
          matchCount,
          pred.wheel_lines ? Math.max(matchCount, ...wheelLines.map(l => l.filter(n => actualSet.has(n)).length), 0) : 0,
          prizeTier,
          isPrize,
          efficiencyScore,
          pred.id
        ]
      });

      verifiedCount++;
    }
  }

  return { verifiedCount, message: `Reconciled ${verifiedCount} predictions against winning database draws` };
}

/**
 * Returns the complete audited ledger and summary efficiency statistics
 */
export async function getPredictionAuditLedger(filterGame?: string, limit: number = 100): Promise<{
  summary: PredictionAuditSummary;
  records: PredictionAuditRecord[];
}> {
  await initPredictionAuditTable();

  // Run reconciliation first to ensure latest draws are matched
  await reconcilePredictionAudits();

  let querySql = "SELECT * FROM prediction_audits";
  const queryArgs: any[] = [];

  if (filterGame && filterGame !== "all") {
    querySql += " WHERE game_key = ?";
    queryArgs.push(filterGame);
  }

  querySql += " ORDER BY target_draw_number DESC, id DESC LIMIT ?";
  queryArgs.push(limit);

  const rawRecords = await query<any>(querySql, queryArgs);

  const records: PredictionAuditRecord[] = rawRecords.map(r => ({
    id: Number(r.id),
    game_key: r.game_key,
    prediction_type: r.prediction_type,
    target_draw_number: Number(r.target_draw_number),
    target_draw_date: r.target_draw_date,
    target_period: r.target_period,
    predicted_numbers: JSON.parse(r.predicted_numbers || "[]"),
    wheel_lines: r.wheel_lines ? JSON.parse(r.wheel_lines) : undefined,
    predicted_sum: r.predicted_sum ? Number(r.predicted_sum) : undefined,
    predicted_parity: r.predicted_parity,
    confidence_score: r.confidence_score ? Number(r.confidence_score) : undefined,
    rationale: r.rationale,
    status: r.status,
    actual_draw_number: r.actual_draw_number ? Number(r.actual_draw_number) : undefined,
    actual_numbers: r.actual_numbers ? JSON.parse(r.actual_numbers) : undefined,
    matching_numbers: r.matching_numbers ? JSON.parse(r.matching_numbers) : undefined,
    match_count: Number(r.match_count || 0),
    best_wheel_match: Number(r.best_wheel_match || 0),
    prize_tier: r.prize_tier,
    is_prize_winner: Number(r.is_prize_winner || 0),
    efficiency_score: Number(r.efficiency_score || 0),
    created_at: r.created_at,
    verified_at: r.verified_at
  }));

  // Compute summary statistics
  const verifiedRecords = records.filter(r => r.status !== "PENDING");
  const prizeWins = verifiedRecords.filter(r => r.is_prize_winner === 1).length;
  const avgMatch = verifiedRecords.length > 0
    ? verifiedRecords.reduce((acc, r) => acc + r.match_count, 0) / verifiedRecords.length
    : 0;

  const gameSummaries: Record<string, any> = {};
  ["play-whe", "pick4", "cashpot", "lotto-plus", "win-for-life"].forEach(gk => {
    const gRecords = verifiedRecords.filter(r => r.game_key === gk);
    const gPrizes = gRecords.filter(r => r.is_prize_winner === 1).length;
    const gAvgMatch = gRecords.length > 0
      ? gRecords.reduce((acc, r) => acc + r.match_count, 0) / gRecords.length
      : 0;

    gameSummaries[gk] = {
      total: records.filter(r => r.game_key === gk).length,
      verified: gRecords.length,
      prizeHits: gPrizes,
      winRatePct: gRecords.length > 0 ? (gPrizes / gRecords.length) * 100 : 0,
      avgMatch: gAvgMatch
    };
  });

  return {
    summary: {
      totalAudited: records.length,
      totalVerified: verifiedRecords.length,
      totalPending: records.length - verifiedRecords.length,
      prizeWinningCount: prizeWins,
      prizeWinRatePct: verifiedRecords.length > 0 ? (prizeWins / verifiedRecords.length) * 100 : 0,
      averageMatchCount: avgMatch,
      gameSummaries
    },
    records
  };
}
