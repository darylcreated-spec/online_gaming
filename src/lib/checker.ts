export interface CheckResult {
  matchedNumbers: number[];
  pbMatched: boolean;
  tierName: string;
  prizeEstimate: string;
  isWinner: boolean;
}

/**
 * Checks a lotto ticket against winning numbers and calculates the prize tier.
 * 
 * NLCB Lotto Plus Prize Structure:
 * - 5 Match + PB: Jackpot
 * - 5 Match: Cash Prize (typically $5,000+)
 * - 4 Match + PB: Cash Prize (typically $1,500+)
 * - 4 Match: Cash Prize (typically $200)
 * - 3 Match + PB: Cash Prize (typically $150)
 * - 3 Match: Cash Prize (typically $20)
 * - 2 Match + PB: Cash Prize (typically $15)
 * - 1 Match + PB: Free Ticket
 * - 0 Match + PB: Free Ticket (Powerball only)
 */
export function checkTicket(
  ticketNumbers: number[],
  ticketPb: number,
  winningNumbers: number[],
  winningPb: number
): CheckResult {
  // Sort for comparison
  const tNums = [...ticketNumbers].sort((a, b) => a - b);
  const wNums = [...winningNumbers].sort((a, b) => a - b);

  // Find overlapping matches
  const matchedNumbers = tNums.filter(n => wNums.includes(n));
  const matchCount = matchedNumbers.length;
  const pbMatched = ticketPb === winningPb;

  let tierName = "No Match";
  let prizeEstimate = "$0.00";
  let isWinner = false;

  if (matchCount === 5) {
    isWinner = true;
    if (pbMatched) {
      tierName = "5 Main + Powerball (JACKPOT)";
      prizeEstimate = "GRAND JACKPOT!";
    } else {
      tierName = "5 Main Numbers";
      prizeEstimate = "$10,000.00 Est.";
    }
  } else if (matchCount === 4) {
    isWinner = true;
    if (pbMatched) {
      tierName = "4 Main + Powerball";
      prizeEstimate = "$1,500.00 Est.";
    } else {
      tierName = "4 Main Numbers";
      prizeEstimate = "$200.00 Est.";
    }
  } else if (matchCount === 3) {
    isWinner = true;
    if (pbMatched) {
      tierName = "3 Main + Powerball";
      prizeEstimate = "$150.00 Est.";
    } else {
      tierName = "3 Main Numbers";
      prizeEstimate = "$20.00 Est.";
    }
  } else if (matchCount === 2) {
    if (pbMatched) {
      isWinner = true;
      tierName = "2 Main + Powerball";
      prizeEstimate = "$15.00 Est.";
    }
  } else if (matchCount === 1) {
    if (pbMatched) {
      isWinner = true;
      tierName = "1 Main + Powerball";
      prizeEstimate = "Free Quick Pick Ticket";
    }
  } else if (matchCount === 0) {
    if (pbMatched) {
      isWinner = true;
      tierName = "Powerball Only";
      prizeEstimate = "Free Quick Pick Ticket";
    }
  }

  return {
    matchedNumbers,
    pbMatched,
    tierName,
    prizeEstimate,
    isWinner
  };
}

/**
 * Parses OCR extracted text to find potential lotto numbers.
 * It looks for lines containing 5 numbers between 1-35 and optionally a powerball.
 */
export function parseTicketText(text: string): {
  numbers: number[];
  powerball: number | null;
  drawNumber: number | null;
  dateStr: string | null;
} {
  const result: {
    numbers: number[];
    powerball: number | null;
    drawNumber: number | null;
    dateStr: string | null;
  } = {
    numbers: [],
    powerball: null,
    drawNumber: null,
    dateStr: null
  };

  const lines = text.split("\n");

  // 1. Look for Draw Number: e.g. "Draw # 2537" or "Draw 2537"
  for (const line of lines) {
    const drawMatch = line.match(/(?:draw|draw\s*#)\s*(\d{3,5})/i);
    if (drawMatch) {
      result.drawNumber = parseInt(drawMatch[1]);
      break;
    }
  }

  // 2. Look for Draw Date: e.g. "11-Jul-26" or "11-Jul-2026" or YYYY-MM-DD
  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2})-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-\d{2,4}/i);
    if (dateMatch) {
      result.dateStr = dateMatch[0];
      break;
    }
    const isoMatch = line.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      result.dateStr = isoMatch[0];
      break;
    }
  }

  // 3. Find lottery number lines: lines with multiple numbers
  // We look for any line containing 5 distinct numbers and a powerball
  for (const line of lines) {
    // Clean and split by non-alphanumeric chars (excluding spaces/hyphens)
    const tokens = line.replace(/[^a-zA-Z0-9\s-]/g, " ").split(/\s+/).filter(t => t.length > 0);
    
    // Look for numbers in tokens
    const parsedNums: number[] = [];
    let pbCandidate: number | null = null;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const val = parseInt(token);
      
      if (!isNaN(val)) {
        // Is it the Powerball indicator prefix?
        // E.g., if previous token was "pb" or "p/b", this is the Powerball
        const prevToken = tokens[i - 1]?.toLowerCase();
        if (prevToken === "pb" || prevToken === "powerball" || prevToken === "power") {
          pbCandidate = val;
        } else if (val >= 1 && val <= 35) {
          parsedNums.push(val);
        } else if (val >= 1 && val <= 10 && parsedNums.length >= 5) {
          // If we already have 5 numbers, this is likely the Powerball
          pbCandidate = val;
        }
      }
    }

    // Deduplicate
    const uniqueNums = Array.from(new Set(parsedNums)).sort((a, b) => a - b);
    
    if (uniqueNums.length >= 5) {
      result.numbers = uniqueNums.slice(0, 5);
      
      // If we found a Powerball, use it. Otherwise, look at the next token in the line.
      if (pbCandidate !== null && pbCandidate >= 1 && pbCandidate <= 10) {
        result.powerball = pbCandidate;
      } else {
        // Fallback: search for single digit at the end of the line
        const pbMatch = line.match(/(?:pb|pb\s*#|pb:|\b)\s*([1-9]|10)\b(?!.*\b\d+\b)/i);
        if (pbMatch) {
          result.powerball = parseInt(pbMatch[1]);
        }
      }
      break; // Found our lotto line!
    }
  }

  return result;
}

/**
 * Parses OCR extracted text to find potential Play Whe receipt details.
 */
export function parsePlayWheTicketText(text: string): {
  drawNumber: number | null;
  dateStr: string | null;
  timeSlot: string | null;
  selectedNumber: number | null;
} {
  const result: {
    drawNumber: number | null;
    dateStr: string | null;
    timeSlot: string | null;
    selectedNumber: number | null;
  } = {
    drawNumber: null,
    dateStr: null,
    timeSlot: null,
    selectedNumber: null
  };

  const lines = text.split("\n");

  // 1. Look for Draw Number: e.g. "Draw # 27178" or "Draw 27178"
  for (const line of lines) {
    const drawMatch = line.match(/(?:draw|draw\s*#)\s*(\d{4,6})/i);
    if (drawMatch) {
      result.drawNumber = parseInt(drawMatch[1]);
      break;
    }
  }

  // 2. Look for Draw Date: e.g. "11-Jul-26" or YYYY-MM-DD
  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2})-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-\d{2,4}/i);
    if (dateMatch) {
      result.dateStr = dateMatch[0];
      break;
    }
    const isoMatch = line.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      result.dateStr = isoMatch[0];
      break;
    }
  }

  // 3. Look for Time Slot: Morning, Midday, Afternoon, Evening
  for (const line of lines) {
    const cleanLine = line.toLowerCase();
    if (cleanLine.includes("morning") || cleanLine.includes("morn") || cleanLine.includes("10:30")) {
      result.timeSlot = "Morning";
      break;
    } else if (cleanLine.includes("midday") || cleanLine.includes("mid") || cleanLine.includes("1:00")) {
      result.timeSlot = "Midday";
      break;
    } else if (cleanLine.includes("afternoon") || cleanLine.includes("aft") || cleanLine.includes("4:00")) {
      result.timeSlot = "Afternoon";
      break;
    } else if (cleanLine.includes("evening") || cleanLine.includes("eve") || cleanLine.includes("7:00")) {
      result.timeSlot = "Evening";
      break;
    }
  }

  // 4. Look for the selected play number:
  // Usually appears as "10 MONKEY" or a line containing a number 1-36 and a mark name, or just a number 1-36
  // E.g., check keywords of CHINAPOO_CHART
  const chinapooMarks = [
    "centipede", "old lady", "carriage", "dead man", "parson man", "belly",
    "hog", "tiger", "cattle", "monkey", "corbeau", "king", "crapaud", "money",
    "sick woman", "jamette", "pigeon", "water boat", "horse", "dog", "mouth",
    "rat", "house", "queen", "morocoy", "fowl", "little snake", "red fish",
    "opium man", "house cat", "parson wife", "shrimp", "spider", "blind man",
    "big snake", "donkey"
  ];

  for (const line of lines) {
    const cleanLine = line.toLowerCase();
    
    // Check if any mark name is explicitly in this line
    let foundMarkIdx = -1;
    for (let i = 0; i < chinapooMarks.length; i++) {
      if (cleanLine.includes(chinapooMarks[i])) {
        foundMarkIdx = i + 1;
        break;
      }
    }

    if (foundMarkIdx !== -1) {
      result.selectedNumber = foundMarkIdx;
      break;
    }

    // Fallback: look for a standalone number 1-36 in the line
    const matchNums = cleanLine.match(/\b([1-9]|[1-2]\d|3[0-6])\b/g);
    if (matchNums && matchNums.length > 0) {
      // Find the first number in the line
      const val = parseInt(matchNums[0]);
      if (val >= 1 && val <= 36) {
        result.selectedNumber = val;
        break;
      }
    }
  }

  return result;
}

/**
 * Checks a Play Whe selected mark against winning number.
 */
export function checkPlayWheTicket(
  selectedNumber: number,
  winningNumber: number
): {
  isWinner: boolean;
  tierName: string;
  prizeEstimate: string;
} {
  const isWinner = selectedNumber === winningNumber;
  return {
    isWinner,
    tierName: isWinner ? "Play Whe MATCH" : "No Match",
    prizeEstimate: isWinner ? "$26.00 per $1.00 wagered" : "$0.00"
  };
}
