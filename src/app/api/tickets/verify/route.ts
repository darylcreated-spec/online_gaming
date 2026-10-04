import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { performTicketAutopsy } from "@/lib/ticket_autopsy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { game, numbers, drawNumber, betAmount = 1.0, scannedRaw } = body;

    const gameKey = (game || "cashpot").toLowerCase().replace(/_/g, "-");

    // Fetch official draw from Turso DB
    let drawQuery = "";
    let drawArgs: any[] = [];

    if (gameKey === "playwhe" || gameKey === "play-whe") {
      if (drawNumber) {
        drawQuery = "SELECT * FROM playwhe_draws WHERE draw_number = ? LIMIT 1";
        drawArgs = [drawNumber];
      } else {
        drawQuery = "SELECT * FROM playwhe_draws ORDER BY draw_number DESC LIMIT 1";
      }
    } else if (gameKey === "pick4" || gameKey === "pick-4") {
      if (drawNumber) {
        drawQuery = "SELECT * FROM pick4_draws WHERE draw_number = ? LIMIT 1";
        drawArgs = [drawNumber];
      } else {
        drawQuery = "SELECT * FROM pick4_draws ORDER BY draw_number DESC LIMIT 1";
      }
    } else if (gameKey === "winforlife" || gameKey === "win-for-life") {
      if (drawNumber) {
        drawQuery = "SELECT * FROM winforlife_draws WHERE draw_number = ? LIMIT 1";
        drawArgs = [drawNumber];
      } else {
        drawQuery = "SELECT * FROM winforlife_draws ORDER BY draw_number DESC LIMIT 1";
      }
    } else if (gameKey === "lotto" || gameKey === "lotto-plus") {
      if (drawNumber) {
        drawQuery = "SELECT * FROM draws WHERE draw_number = ? LIMIT 1";
        drawArgs = [drawNumber];
      } else {
        drawQuery = "SELECT * FROM draws ORDER BY draw_number DESC LIMIT 1";
      }
    } else {
      // Default: Cash Pot
      if (drawNumber) {
        drawQuery = "SELECT * FROM cashpot_draws WHERE draw_number = ? LIMIT 1";
        drawArgs = [drawNumber];
      } else {
        drawQuery = "SELECT * FROM cashpot_draws ORDER BY draw_number DESC LIMIT 1";
      }
    }

    const drawRes = await db.execute({ sql: drawQuery, args: drawArgs });
    if (!drawRes.rows || drawRes.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No draw record found in database for ${gameKey}${drawNumber ? ` #${drawNumber}` : ""}.`
      }, { status: 404 });
    }

    const draw = drawRes.rows[0] as any;
    let isWinner = false;
    let matchedNumbers: number[] = [];
    let matchCount = 0;
    let prizeTier = "No Prize";
    let grossPayoutTT = 0;
    let officialWinningNumbers: number[] = [];
    let multiplier = 1;

    const parsedNumbers: number[] = Array.isArray(numbers)
      ? numbers.map(Number)
      : String(numbers || "").split(/[\s,-]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n));

    // Calculate outcomes based on official NLCB 2026 payout rules
    if (gameKey === "playwhe" || gameKey === "play-whe") {
      const winningNum = Number(draw.winning_number);
      officialWinningNumbers = [winningNum];
      const userNum = parsedNumbers[0];

      if (userNum === winningNum) {
        isWinner = true;
        matchCount = 1;
        matchedNumbers = [userNum];
        prizeTier = "Winning Mark (26:1)";
        grossPayoutTT = betAmount * 26.0;
      }
    } else if (gameKey === "pick4" || gameKey === "pick-4") {
      const drawnDigits = [Number(draw.digit1), Number(draw.digit2), Number(draw.digit3), Number(draw.digit4)];
      officialWinningNumbers = drawnDigits;
      const userDigits = parsedNumbers.slice(0, 4);

      const isStraight = drawnDigits.every((d, idx) => d === userDigits[idx]);
      if (isStraight) {
        isWinner = true;
        matchCount = 4;
        matchedNumbers = userDigits;
        prizeTier = "Straight Hit";
        grossPayoutTT = betAmount * 5500.0;
      } else {
        // Check Box win
        const sortedDrawn = [...drawnDigits].sort((a, b) => a - b);
        const sortedUser = [...userDigits].sort((a, b) => a - b);
        const isBox = sortedDrawn.every((d, idx) => d === sortedUser[idx]);

        if (isBox) {
          isWinner = true;
          matchCount = 4;
          matchedNumbers = userDigits;

          // Determine Box tier: 24-way, 12-way, 6-way, 4-way
          const counts: Record<number, number> = {};
          drawnDigits.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
          const freq = Object.values(counts).sort((a, b) => b - a);

          if (freq[0] === 3) {
            prizeTier = "Box 4-Way";
            grossPayoutTT = betAmount * 1375.0;
          } else if (freq[0] === 2 && freq[1] === 2) {
            prizeTier = "Box 6-Way";
            grossPayoutTT = betAmount * 915.0;
          } else if (freq[0] === 2) {
            prizeTier = "Box 12-Way";
            grossPayoutTT = betAmount * 455.0;
          } else {
            prizeTier = "Box 24-Way";
            grossPayoutTT = betAmount * 230.0;
          }
        }
      }
    } else if (gameKey === "cashpot") {
      officialWinningNumbers = [Number(draw.num1), Number(draw.num2), Number(draw.num3), Number(draw.num4), Number(draw.num5)];
      multiplier = draw.multiplier ? Number(draw.multiplier) : 1;

      matchedNumbers = parsedNumbers.filter(n => officialWinningNumbers.includes(n));
      matchCount = matchedNumbers.length;

      if (matchCount === 5) {
        isWinner = true;
        prizeTier = "Match 5 Jackpot!";
        grossPayoutTT = 5000.0; // Minimum jackpot starting pool
      } else if (matchCount === 4) {
        isWinner = true;
        prizeTier = `Match 4 Prize${multiplier > 1 ? ` (${multiplier}x Multiplier)` : ""}`;
        grossPayoutTT = 250.0 * multiplier;
      } else if (matchCount === 3) {
        isWinner = true;
        prizeTier = `Match 3 Prize${multiplier > 1 ? ` (${multiplier}x Multiplier)` : ""}`;
        grossPayoutTT = 5.0 * multiplier;
      }
    } else if (gameKey === "lotto" || gameKey === "lotto-plus") {
      officialWinningNumbers = [Number(draw.num1), Number(draw.num2), Number(draw.num3), Number(draw.num4), Number(draw.num5)];
      matchedNumbers = parsedNumbers.filter(n => officialWinningNumbers.includes(n));
      matchCount = matchedNumbers.length;

      if (matchCount === 5) {
        isWinner = true;
        prizeTier = "Match 5 Major Prize";
        grossPayoutTT = 50000.0;
      } else if (matchCount === 4) {
        isWinner = true;
        prizeTier = "Match 4 Prize";
        grossPayoutTT = 250.0;
      } else if (matchCount === 3) {
        isWinner = true;
        prizeTier = "Match 3 Prize";
        grossPayoutTT = 5.0;
      }
    } else if (gameKey === "winforlife" || gameKey === "win-for-life") {
      officialWinningNumbers = [
        Number(draw.num1),
        Number(draw.num2),
        Number(draw.num3),
        Number(draw.num4),
        Number(draw.num5),
        Number(draw.num6)
      ];
      matchedNumbers = parsedNumbers.filter(n => officialWinningNumbers.includes(n));
      matchCount = matchedNumbers.length;

      if (matchCount === 6) {
        isWinner = true;
        prizeTier = "Match 6 Annuity ($20,000/mo for 2 Years)";
        grossPayoutTT = 480000.0;
      } else if (matchCount === 5) {
        isWinner = true;
        prizeTier = "Match 5 Prize";
        grossPayoutTT = 1000.0;
      } else if (matchCount === 4) {
        isWinner = true;
        prizeTier = "Match 4 Prize";
        grossPayoutTT = 50.0;
      } else if (matchCount === 3) {
        isWinner = true;
        prizeTier = "Match 3 Free Slip Equivalent";
        grossPayoutTT = 10.0;
      }
    }

    // 10% Trinidad & Tobago Winnings Tax applies on prizes >= $1,000 TTD
    const isTaxable = grossPayoutTT >= 1000.0;
    const taxDeductionTT = isTaxable ? Math.round(grossPayoutTT * 0.10 * 100) / 100 : 0;
    const netPayoutTT = Math.max(0, grossPayoutTT - taxDeductionTT);

    const officialBonusBall = (gameKey === "lotto" || gameKey === "lotto-plus")
      ? Number(draw.powerball || 0)
      : (gameKey === "winforlife" || gameKey === "win-for-life")
      ? Number(draw.cash_ball || 0)
      : undefined;

    const userBonusBall = parsedNumbers.length > officialWinningNumbers.length
      ? parsedNumbers[parsedNumbers.length - 1]
      : undefined;

    const autopsy = performTicketAutopsy({
      game: gameKey,
      ticketNumbers: parsedNumbers.slice(0, officialWinningNumbers.length || parsedNumbers.length),
      ticketBonus: userBonusBall,
      officialNumbers: officialWinningNumbers,
      officialBonus: officialBonusBall,
      officialMultiplier: multiplier,
      drawNumber: Number(draw.draw_number),
      drawDate: draw.draw_date,
      betAmount
    });

    return NextResponse.json({
      success: true,
      game: gameKey,
      drawNumber: draw.draw_number,
      drawDate: draw.draw_date,
      timeSlot: draw.draw_time_slot || null,
      officialWinningNumbers,
      userNumbers: parsedNumbers,
      isWinner,
      matchCount,
      matchedNumbers,
      prizeTier,
      grossPayoutTT,
      isTaxable,
      taxDeductionTT,
      netPayoutTT,
      claimWindowDays: autopsy.daysRemainingToClaim,
      claimDeadlineDate: autopsy.claimDeadlineDate,
      autopsy,
      scannedRaw: scannedRaw || null
    });
  } catch (error: any) {
    console.error("[Ticket Verify API] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
