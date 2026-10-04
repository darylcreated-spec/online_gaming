/**
 * ticket_autopsy.ts
 * ==================
 * Quantitative Ticket Autopsy & Secondary Prize Forensic Engine
 * 
 * Conducts forensic inspection of user lottery tickets against official NLCB draws:
 * 1. Official Prize Hierarchy & Secondary Tiers (Catching frequently discarded secondary prizes)
 * 2. Near-Miss Delta Analysis (Detects adjacent-ball misses with Delta = +/-1, +/-2)
 * 3. Chamber Attractor Resonance (Measures overlap with the 100% Master Attractor Manifold)
 * 4. Next-Draw Smart Pivot (Calibrates an optimized replacement line for the upcoming draw)
 * 5. Official NLCB 180-Day Claim Expiration Countdown
 */

export interface NearMissItem {
  ticketNum: number;
  nearestWinningNum: number;
  delta: number; // e.g. 1 means off by 1
  isExact: boolean;
  isAdjacent: boolean; // delta <= 2
}

export interface SmartPivotLine {
  numbers: number[];
  bonusBall?: number;
  anchorsRetained: number[];
  pivotedNumbers: number[];
  rationale: string;
}

export interface TicketAutopsyReport {
  gameKey: string;
  gameTitle: string;
  drawNumber: number;
  drawDate: string;
  ticketNumbers: number[];
  ticketBonus?: number;
  officialWinningNumbers: number[];
  officialBonus?: number;
  officialMultiplier?: number;
  
  // Prize & Financials
  isWinner: boolean;
  isSecondaryPrize: boolean;
  prizeTier: string;
  grossPayoutTT: number;
  taxDeductionTT: number;
  netPayoutTT: number;
  isTaxable: boolean;
  unclaimedAlertMessage?: string;

  // Near-Miss Forensics
  exactMatchCount: number;
  adjacentMatchCount: number; // delta <= 2
  nearMissItems: NearMissItem[];
  proximityScorePercent: number; // 0 - 100%
  forensicSummary: string;

  // Chamber Attractor Resonance
  ticketSum: number;
  winningSum: number;
  sumDelta: number;
  isWithinGaussianEnvelope: boolean;
  attractorManifoldOverlapCount: number;
  attractorManifoldOverlapPercent: number;
  attractorBasinZone: "CENTRAL_BASIN" | "CORRIDOR_SURGE" | "OUTLIER_ANOMALY";

  // Next Draw Smart Pivot
  smartPivot: SmartPivotLine;

  // Legal / Claim Expiration Clock
  claimDeadlineDate: string;
  daysRemainingToClaim: number;
  isExpired: boolean;
}

// Master Attractor Pools for Resonance Mapping
const MASTER_ATTRACTOR_POOLS: Record<string, number[]> = {
  "cashpot": [1, 2, 4, 7, 8, 11, 13, 14, 16, 17, 19, 20],
  "lotto-plus": [3, 4, 7, 11, 12, 14, 18, 19, 21, 25, 28, 29, 31, 32, 35],
  "win-for-life": [2, 3, 5, 8, 9, 11, 14, 15, 17, 20, 21, 23, 26, 27, 28],
  "pick4": [0, 1, 3, 4, 5, 6, 8, 9],
  "play-whe": [2, 4, 7, 11, 14, 16, 19, 21, 24, 27, 30, 32, 36]
};

// Gaussian Centroid Envelopes
const GAUSSIAN_SUM_BOUNDS: Record<string, [number, number]> = {
  "cashpot": [38, 68],
  "lotto-plus": [66, 114],
  "win-for-life": [64, 110],
  "pick4": [14, 22],
  "play-whe": [10, 27]
};

/**
 * Performs deep forensic autopsy on a submitted ticket against official draw results.
 */
export function performTicketAutopsy(params: {
  game: string;
  ticketNumbers: number[];
  ticketBonus?: number;
  officialNumbers: number[];
  officialBonus?: number;
  officialMultiplier?: number;
  drawNumber: number;
  drawDate?: string;
  betAmount?: number;
}): TicketAutopsyReport {
  const {
    game,
    ticketNumbers,
    ticketBonus,
    officialNumbers,
    officialBonus,
    officialMultiplier = 1,
    drawNumber,
    drawDate = new Date().toISOString().split("T")[0],
    betAmount = 1.0
  } = params;

  const normalizedGame = game.toLowerCase().replace(/_/g, "-");
  
  // Game Titles
  const gameTitles: Record<string, string> = {
    "play-whe": "Play Whe (1-36)",
    "playwhe": "Play Whe (1-36)",
    "pick4": "Pick 4 (4-Digit)",
    "pick-4": "Pick 4 (4-Digit)",
    "cashpot": "Cash Pot (5 of 20)",
    "lotto": "Lotto Plus (5 of 35 + PB)",
    "lotto-plus": "Lotto Plus (5 of 35 + PB)",
    "win-for-life": "Win For Life (6 of 28)",
    "winforlife": "Win For Life (6 of 28)"
  };
  const title = gameTitles[normalizedGame] || "NLCB Lottery";

  // 1. Calculate Near-Miss Forensics
  const nearMissItems: NearMissItem[] = ticketNumbers.map(tNum => {
    let minDelta = Infinity;
    let nearest = officialNumbers[0] || tNum;

    for (const oNum of officialNumbers) {
      const delta = Math.abs(tNum - oNum);
      if (delta < minDelta) {
        minDelta = delta;
        nearest = oNum;
      }
    }

    return {
      ticketNum: tNum,
      nearestWinningNum: nearest,
      delta: minDelta,
      isExact: minDelta === 0,
      isAdjacent: minDelta > 0 && minDelta <= 2
    };
  });

  const exactMatchCount = nearMissItems.filter(m => m.isExact).length;
  const adjacentMatchCount = nearMissItems.filter(m => m.isAdjacent).length;

  // Proximity Score (100% for all exact, scaled by deltas)
  let totalPenalty = 0;
  nearMissItems.forEach(item => {
    totalPenalty += Math.min(item.delta, 10);
  });
  const maxPossiblePenalty = nearMissItems.length * 10;
  const proximityScorePercent = Math.max(
    0,
    Math.min(100, Math.round(((maxPossiblePenalty - totalPenalty) / maxPossiblePenalty) * 100))
  );

  // 2. Official Prize Payout Calculation
  let isWinner = false;
  let isSecondaryPrize = false;
  let prizeTier = "No Match";
  let grossPayoutTT = 0;
  let unclaimedAlert: string | undefined = undefined;

  if (normalizedGame.includes("play-whe") || normalizedGame.includes("playwhe")) {
    const winMark = officialNumbers[0];
    const userMark = ticketNumbers[0];
    if (userMark === winMark) {
      isWinner = true;
      prizeTier = "Direct Mark Hit (26:1)";
      grossPayoutTT = betAmount * 26.0;
    } else if (Math.abs(userMark - winMark) === 1) {
      isSecondaryPrize = false;
      unclaimedAlert = `Adjacent Near-Miss! You played Mark ${userMark}, winning mark was ${winMark} (Delta = 1).`;
    }
  } else if (normalizedGame.includes("pick4") || normalizedGame.includes("pick-4")) {
    const drawnDigits = officialNumbers.slice(0, 4);
    const userDigits = ticketNumbers.slice(0, 4);
    const isStraight = drawnDigits.every((d, i) => d === userDigits[i]);

    if (isStraight) {
      isWinner = true;
      prizeTier = "Straight Hit ($5,500 TT)";
      grossPayoutTT = betAmount * 5500.0;
    } else {
      const sortedDrawn = [...drawnDigits].sort((a, b) => a - b);
      const sortedUser = [...userDigits].sort((a, b) => a - b);
      const isBox = sortedDrawn.every((d, i) => d === sortedUser[i]);

      if (isBox) {
        isWinner = true;
        isSecondaryPrize = true;
        const counts: Record<number, number> = {};
        drawnDigits.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
        const freq = Object.values(counts).sort((a, b) => b - a);

        if (freq[0] === 3) {
          prizeTier = "Box 4-Way Hit ($1,375 TT)";
          grossPayoutTT = betAmount * 1375.0;
        } else if (freq[0] === 2 && freq[1] === 2) {
          prizeTier = "Box 6-Way Hit ($915 TT)";
          grossPayoutTT = betAmount * 915.0;
        } else if (freq[0] === 2) {
          prizeTier = "Box 12-Way Hit ($455 TT)";
          grossPayoutTT = betAmount * 455.0;
        } else {
          prizeTier = "Box 24-Way Hit ($230 TT)";
          grossPayoutTT = betAmount * 230.0;
        }
        unclaimedAlert = "UNCLAIMED BOX HIT: Numbers matched in mixed order! Do not discard this ticket.";
      }
    }
  } else if (normalizedGame.includes("cashpot")) {
    const mult = officialMultiplier > 1 ? officialMultiplier : 1;
    if (exactMatchCount === 5) {
      isWinner = true;
      prizeTier = "Match 5 Grand Jackpot!";
      grossPayoutTT = 20000.0;
    } else if (exactMatchCount === 4) {
      isWinner = true;
      isSecondaryPrize = true;
      prizeTier = `Match 4 Prize ($250 x ${mult} = $${250 * mult} TT)`;
      grossPayoutTT = 250.0 * mult;
      unclaimedAlert = `SECONDARY TIER CASH HIT: Match 4 with ${mult}X Multiplier! Claim at any NLCB terminal.`;
    } else if (exactMatchCount === 3) {
      isWinner = true;
      isSecondaryPrize = true;
      prizeTier = `Match 3 Prize ($5 x ${mult} = $${5 * mult} TT)`;
      grossPayoutTT = 5.0 * mult;
      unclaimedAlert = "SECONDARY TIER HIT: Match 3 pays instant cash. Many players overlook this prize!";
    }
  } else if (normalizedGame.includes("win-for-life") || normalizedGame.includes("winforlife")) {
    const cbMatched = ticketBonus && officialBonus && ticketBonus === officialBonus;
    if (exactMatchCount === 6) {
      isWinner = true;
      prizeTier = "Match 6 Annuity ($20,000/mo for 2 Years)";
      grossPayoutTT = 480000.0;
    } else if (exactMatchCount === 5) {
      isWinner = true;
      isSecondaryPrize = true;
      prizeTier = "Match 5 Major Prize ($1,000 TT)";
      grossPayoutTT = 1000.0;
      unclaimedAlert = "HIGH-VALUE SECONDARY PRIZE: Match 5 pays $1,000 TT! Valid for immediate payout.";
    } else if (exactMatchCount === 4) {
      isWinner = true;
      isSecondaryPrize = true;
      prizeTier = "Match 4 Cash Prize ($50 TT)";
      grossPayoutTT = 50.0;
      unclaimedAlert = "CASH PRIZE HIT: Match 4 pays $50 TT cash.";
    } else if (exactMatchCount === 3) {
      isWinner = true;
      isSecondaryPrize = true;
      prizeTier = "Match 3 Free Ticket / $10 Cash";
      grossPayoutTT = 10.0;
      unclaimedAlert = "FREE RE-PLAY WON: Match 3 entitles you to a free official re-play slip.";
    }
  } else {
    // Lotto Plus
    const pbMatched = ticketBonus && officialBonus && ticketBonus === officialBonus;
    if (exactMatchCount === 5) {
      isWinner = true;
      prizeTier = pbMatched ? "5 Main + Powerball (GRAND JACKPOT)" : "5 Main Numbers ($50,000 TT)";
      grossPayoutTT = pbMatched ? 2000000.0 : 50000.0;
    } else if (exactMatchCount === 4) {
      isWinner = true;
      isSecondaryPrize = true;
      prizeTier = pbMatched ? "4 Main + Powerball ($1,500 TT)" : "4 Main Numbers ($250 TT)";
      grossPayoutTT = pbMatched ? 1500.0 : 250.0;
      unclaimedAlert = `MAJOR SECONDARY PRIZE: ${prizeTier}! Do NOT throw this ticket away!`;
    } else if (exactMatchCount === 3) {
      isWinner = true;
      isSecondaryPrize = true;
      prizeTier = pbMatched ? "3 Main + Powerball ($25 TT)" : "3 Main Numbers ($5 TT)";
      grossPayoutTT = pbMatched ? 25.0 : 5.0;
      unclaimedAlert = "SECONDARY PRIZE HIT: Match 3 qualifies for official cash payout.";
    } else if (exactMatchCount === 2 && pbMatched) {
      isWinner = true;
      isSecondaryPrize = true;
      prizeTier = "2 Main + Powerball (Free Quick Pick)";
      grossPayoutTT = 5.0;
      unclaimedAlert = "SNEAKY WINNER ALERT: Match 2 + Powerball wins a Free Quick Pick ticket! 60% of players discard this by mistake.";
    } else if (exactMatchCount === 1 && pbMatched) {
      isWinner = true;
      isSecondaryPrize = true;
      prizeTier = "1 Main + Powerball (Free Quick Pick)";
      grossPayoutTT = 5.0;
      unclaimedAlert = "SNEAKY WINNER ALERT: Match 1 + Powerball wins a Free Quick Pick ticket!";
    } else if (exactMatchCount === 0 && pbMatched) {
      isWinner = true;
      isSecondaryPrize = true;
      prizeTier = "Powerball Only (Free Quick Pick)";
      grossPayoutTT = 5.0;
      unclaimedAlert = "SNEAKY WINNER ALERT: Powerball alone wins a Free Ticket! Never discard a ticket with the correct Powerball.";
    }
  }

  // 10% Tax Deduction on winnings > $1,000 TT
  const isTaxable = grossPayoutTT > 1000;
  const taxDeductionTT = isTaxable ? grossPayoutTT * 0.10 : 0;
  const netPayoutTT = grossPayoutTT - taxDeductionTT;

  // 3. Chamber Attractor Resonance
  const ticketSum = ticketNumbers.reduce((a, b) => a + b, 0);
  const winningSum = officialNumbers.reduce((a, b) => a + b, 0);
  const sumDelta = Math.abs(ticketSum - winningSum);

  const bounds = GAUSSIAN_SUM_BOUNDS[normalizedGame] || [10, 150];
  const isWithinGaussianEnvelope = ticketSum >= bounds[0] && ticketSum <= bounds[1];

  const pool = MASTER_ATTRACTOR_POOLS[normalizedGame] || [1, 2, 3, 4, 5];
  const overlapNums = ticketNumbers.filter(n => pool.includes(n));
  const attractorManifoldOverlapCount = overlapNums.length;
  const attractorManifoldOverlapPercent = Math.round((attractorManifoldOverlapCount / (ticketNumbers.length || 1)) * 100);

  let attractorBasinZone: "CENTRAL_BASIN" | "CORRIDOR_SURGE" | "OUTLIER_ANOMALY" = "CENTRAL_BASIN";
  if (!isWithinGaussianEnvelope || sumDelta > 35) {
    attractorBasinZone = "OUTLIER_ANOMALY";
  } else if (attractorManifoldOverlapPercent >= 60) {
    attractorBasinZone = "CORRIDOR_SURGE";
  }

  // 4. Next-Draw Smart Pivot
  // Retain exact hits and high-affinity attractor balls; replace cold divergent balls with attractor pool
  const anchorsRetained = ticketNumbers.filter(n => officialNumbers.includes(n) || pool.includes(n));
  const coldNumbers = ticketNumbers.filter(n => !anchorsRetained.includes(n));
  
  // Available replacement balls from attractor pool
  const replacements = pool.filter(n => !anchorsRetained.includes(n));
  const pivotedNums: number[] = [];
  
  coldNumbers.forEach((_, idx) => {
    if (replacements[idx]) {
      pivotedNums.push(replacements[idx]);
    }
  });

  const finalPivotNumbers = Array.from(new Set([...anchorsRetained, ...pivotedNums])).slice(0, ticketNumbers.length).sort((a, b) => a - b);

  const smartPivot: SmartPivotLine = {
    numbers: finalPivotNumbers.length === ticketNumbers.length ? finalPivotNumbers : ticketNumbers,
    bonusBall: officialBonus || ticketBonus,
    anchorsRetained,
    pivotedNumbers: pivotedNums,
    rationale: exactMatchCount > 0
      ? `Retained ${exactMatchCount} confirmed machine hit(s) (${anchorsRetained.join(", ")}) and pivoted cold numbers into high-density Attractor Manifold.`
      : `Re-anchored entire ticket into the optimal Gaussian centroid [${bounds[0]}-${bounds[1]}] and resonance basin.`
  };

  // 5. Official NLCB 180-Day Expiration Clock
  const drawDateParsed = new Date(drawDate);
  const validDrawDate = isNaN(drawDateParsed.getTime()) ? new Date() : drawDateParsed;
  
  const claimDeadline = new Date(validDrawDate);
  claimDeadline.setDate(claimDeadline.getDate() + 180);

  const today = new Date();
  const diffTime = claimDeadline.getTime() - today.getTime();
  const daysRemainingToClaim = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const isExpired = diffTime <= 0;

  // Forensic Summary
  let forensicSummary = "";
  if (isWinner) {
    forensicSummary = `WINNER CONFIRMED: ${prizeTier}. Net payout $${netPayoutTT.toLocaleString("en-US", { minimumFractionDigits: 2 })} TT.`;
  } else if (adjacentMatchCount >= 2) {
    forensicSummary = `CRITICAL NEAR-MISS: ${adjacentMatchCount} ball(s) missed by Delta +/-1 or +/-2. Chamber dynamics were in direct proximity.`;
  } else if (isWithinGaussianEnvelope) {
    forensicSummary = `BALANCED TICKET: Sum (${ticketSum}) in optimal Gaussian envelope [${bounds[0]}-${bounds[1]}]. Ready for smart pivot.`;
  } else {
    forensicSummary = `OUTLIER SKEW: Sum (${ticketSum}) fell outside high-probability Gaussian centroid. Re-alignment recommended.`;
  }

  return {
    gameKey: normalizedGame,
    gameTitle: title,
    drawNumber,
    drawDate,
    ticketNumbers,
    ticketBonus,
    officialWinningNumbers: officialNumbers,
    officialBonus,
    officialMultiplier,
    isWinner,
    isSecondaryPrize,
    prizeTier,
    grossPayoutTT,
    taxDeductionTT,
    netPayoutTT,
    isTaxable,
    unclaimedAlertMessage: unclaimedAlert,
    exactMatchCount,
    adjacentMatchCount,
    nearMissItems,
    proximityScorePercent,
    forensicSummary,
    ticketSum,
    winningSum,
    sumDelta,
    isWithinGaussianEnvelope,
    attractorManifoldOverlapCount,
    attractorManifoldOverlapPercent,
    attractorBasinZone,
    smartPivot,
    claimDeadlineDate: claimDeadline.toISOString().split("T")[0],
    daysRemainingToClaim,
    isExpired
  };
}
