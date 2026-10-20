import { query } from "../src/lib/db";
import * as XLSX from "xlsx";
import * as path from "path";

async function main() {
  console.log("Fetching winning combinations for all NLCB games from Turso Cloud DB...");

  // 1. Win For Life (6 of 28)
  const wflRows = await query<any>(
    "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball, jackpot FROM winforlife_draws ORDER BY CAST(draw_number AS INTEGER) DESC"
  );
  console.log(`Win For Life: ${wflRows.length} draws fetched`);

  const wflData = wflRows.map((r) => {
    const numbers = [r.num1, r.num2, r.num3, r.num4, r.num5, r.num6]
      .filter((n) => n !== null && n !== undefined)
      .map(Number)
      .sort((a, b) => a - b);
    return {
      "Draw #": Number(r.draw_number),
      "Draw Date": r.draw_date || "",
      "Ball 1": numbers[0] ?? "",
      "Ball 2": numbers[1] ?? "",
      "Ball 3": numbers[2] ?? "",
      "Ball 4": numbers[3] ?? "",
      "Ball 5": numbers[4] ?? "",
      "Ball 6": numbers[5] ?? "",
      "Cash Ball": r.cash_ball !== null && r.cash_ball !== undefined ? Number(r.cash_ball) : "",
      "Winning Combination": numbers.join(" - ") + (r.cash_ball ? ` [CB: ${r.cash_ball}]` : ""),
      "Sum": numbers.reduce((a, b) => a + b, 0),
    };
  });

  // 2. Pick 4 (4 Digits)
  const pick4Rows = await query<any>(
    "SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 FROM pick4_draws ORDER BY CAST(draw_number AS INTEGER) DESC"
  );
  console.log(`Pick 4: ${pick4Rows.length} draws fetched`);

  const pick4Data = pick4Rows.map((r) => {
    const digits = [r.digit1, r.digit2, r.digit3, r.digit4].map(Number);
    const digitStr = digits.join("");
    const sortedDigits = [...digits].sort((a, b) => a - b).join("");
    return {
      "Draw #": Number(r.draw_number),
      "Draw Date": r.draw_date || "",
      "Time Slot": r.draw_time_slot || "",
      "Digit 1": digits[0] ?? "",
      "Digit 2": digits[1] ?? "",
      "Digit 3": digits[2] ?? "",
      "Digit 4": digits[3] ?? "",
      "Straight (Exact)": digitStr,
      "Box (Sorted)": sortedDigits,
      "Digit Sum": digits.reduce((a, b) => a + b, 0),
    };
  });

  // 3. Cash Pot (5 of 20)
  const cashpotRows = await query<any>(
    "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, multiplier FROM cashpot_draws ORDER BY CAST(draw_number AS INTEGER) DESC"
  );
  console.log(`Cash Pot: ${cashpotRows.length} draws fetched`);

  const cashpotData = cashpotRows.map((r) => {
    const numbers = [r.num1, r.num2, r.num3, r.num4, r.num5]
      .filter((n) => n !== null && n !== undefined)
      .map(Number)
      .sort((a, b) => a - b);
    return {
      "Draw #": Number(r.draw_number),
      "Draw Date": r.draw_date || "",
      "Ball 1": numbers[0] ?? "",
      "Ball 2": numbers[1] ?? "",
      "Ball 3": numbers[2] ?? "",
      "Ball 4": numbers[3] ?? "",
      "Ball 5": numbers[4] ?? "",
      "Multiplier": r.multiplier !== null && r.multiplier !== undefined ? Number(r.multiplier) : "",
      "Winning Combination": numbers.join(" - ") + (r.multiplier ? ` [x${r.multiplier}]` : ""),
      "Sum": numbers.reduce((a, b) => a + b, 0),
    };
  });

  // 4. Lotto Plus (5 of 35)
  let lottoRows: any[] = [];
  try {
    lottoRows = await query<any>(
      "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) DESC"
    );
  } catch {}
  if (!lottoRows || lottoRows.length === 0) {
    try {
      lottoRows = await query<any>(
        "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM lotto_draws ORDER BY CAST(draw_number AS INTEGER) DESC"
      );
    } catch {}
  }
  console.log(`Lotto Plus: ${lottoRows.length} draws fetched`);

  const lottoData = lottoRows.map((r) => {
    const numbers = [r.num1, r.num2, r.num3, r.num4, r.num5]
      .filter((n) => n !== null && n !== undefined)
      .map(Number)
      .sort((a, b) => a - b);
    return {
      "Draw #": Number(r.draw_number),
      "Draw Date": r.draw_date || "",
      "Ball 1": numbers[0] ?? "",
      "Ball 2": numbers[1] ?? "",
      "Ball 3": numbers[2] ?? "",
      "Ball 4": numbers[3] ?? "",
      "Ball 5": numbers[4] ?? "",
      "Powerball": r.powerball !== null && r.powerball !== undefined ? Number(r.powerball) : "",
      "Winning Combination": numbers.join(" - ") + (r.powerball ? ` [PB: ${r.powerball}]` : ""),
      "Sum": numbers.reduce((a, b) => a + b, 0),
    };
  });

  // 5. Play Whe (1 of 36)
  const playwheRows = await query<any>(
    "SELECT draw_number, draw_date, draw_time_slot, winning_number FROM playwhe_draws ORDER BY CAST(draw_number AS INTEGER) DESC"
  );
  console.log(`Play Whe: ${playwheRows.length} draws fetched`);

  const playwheData = playwheRows.map((r) => {
    const mark = Number(r.winning_number);
    return {
      "Draw #": Number(r.draw_number),
      "Draw Date": r.draw_date || "",
      "Time Slot": r.draw_time_slot || "",
      "Winning Mark": mark,
      "Parity": mark % 2 === 0 ? "Even" : "Odd",
      "Range": mark <= 18 ? "Low (1-18)" : "High (19-36)",
    };
  });

  // Summary Sheet Data
  const summaryData = [
    {
      "Game Name": "Win For Life",
      "Game Matrix": "6 balls from 1-28 + Cash Ball 1-3",
      "Draw Days": "Tuesday & Friday (7:00 PM AST)",
      "Total Draws Recorded": wflData.length,
      "Latest Draw #": wflData[0]?.["Draw #"] ?? "",
      "Latest Draw Date": wflData[0]?.["Draw Date"] ?? "",
      "Latest Winning Combination": wflData[0]?.["Winning Combination"] ?? "",
      "Spreadsheet Sheet Tab": "Win For Life (6 of 28)",
    },
    {
      "Game Name": "Pick 4",
      "Game Matrix": "4 digits from 0-9 (0000 to 9999)",
      "Draw Days": "Daily 4x (10:30 AM, 1:00 PM, 4:00 PM, 7:00 PM AST)",
      "Total Draws Recorded": pick4Data.length,
      "Latest Draw #": pick4Data[0]?.["Draw #"] ?? "",
      "Latest Draw Date": pick4Data[0]?.["Draw Date"] ?? "",
      "Latest Winning Combination": pick4Data[0]?.["Straight (Exact)"] ?? "",
      "Spreadsheet Sheet Tab": "Pick 4 (4 Digits)",
    },
    {
      "Game Name": "Cash Pot",
      "Game Matrix": "5 balls from 1-20 + Multiplier (x1 - x5)",
      "Draw Days": "Daily (7:00 PM AST)",
      "Total Draws Recorded": cashpotData.length,
      "Latest Draw #": cashpotData[0]?.["Draw #"] ?? "",
      "Latest Draw Date": cashpotData[0]?.["Draw Date"] ?? "",
      "Latest Winning Combination": cashpotData[0]?.["Winning Combination"] ?? "",
      "Spreadsheet Sheet Tab": "Cash Pot (5 of 20)",
    },
    {
      "Game Name": "Lotto Plus",
      "Game Matrix": "5 balls from 1-35 + Powerball 1-10",
      "Draw Days": "Wednesday & Saturday (8:30 PM AST)",
      "Total Draws Recorded": lottoData.length,
      "Latest Draw #": lottoData[0]?.["Draw #"] ?? "",
      "Latest Draw Date": lottoData[0]?.["Draw Date"] ?? "",
      "Latest Winning Combination": lottoData[0]?.["Winning Combination"] ?? "",
      "Spreadsheet Sheet Tab": "Lotto Plus (5 of 35)",
    },
    {
      "Game Name": "Play Whe",
      "Game Matrix": "1 mark from 1-36",
      "Draw Days": "Daily 4x (10:30 AM, 1:00 PM, 4:00 PM, 7:00 PM AST)",
      "Total Draws Recorded": playwheData.length,
      "Latest Draw #": playwheData[0]?.["Draw #"] ?? "",
      "Latest Draw Date": playwheData[0]?.["Draw Date"] ?? "",
      "Latest Winning Combination": `Mark #${playwheData[0]?.["Winning Mark"] ?? ""}`,
      "Spreadsheet Sheet Tab": "Play Whe (1 of 36)",
    },
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Helper to add sheet with column widths
  const addSheetWithFormatting = (sheetData: any[], sheetName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    if (sheetData.length > 0) {
      const keys = Object.keys(sheetData[0]);
      worksheet["!cols"] = keys.map((key) => {
        let maxLen = key.length;
        for (let i = 0; i < Math.min(sheetData.length, 300); i++) {
          const val = sheetData[i][key];
          if (val !== undefined && val !== null) {
            const str = String(val);
            if (str.length > maxLen) maxLen = str.length;
          }
        }
        return { wch: Math.min(Math.max(maxLen + 3, 10), 38) };
      });
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  };

  // Add sheets: Summary first, then the 4 requested games, then Play Whe
  addSheetWithFormatting(summaryData, "Summary & Overview");
  addSheetWithFormatting(wflData, "Win For Life (6 of 28)");
  addSheetWithFormatting(pick4Data, "Pick 4 (4 Digits)");
  addSheetWithFormatting(cashpotData, "Cash Pot (5 of 20)");
  addSheetWithFormatting(lottoData, "Lotto Plus (5 of 35)");
  addSheetWithFormatting(playwheData, "Play Whe (1 of 36)");

  // Write file to root and to public/downloads/ for browser access
  const outputPath = path.resolve(process.cwd(), "NLCB_Winning_Combinations.xlsx");
  XLSX.writeFile(workbook, outputPath);

  const publicDir = path.resolve(process.cwd(), "public");
  const publicOutputPath = path.resolve(publicDir, "NLCB_Winning_Combinations.xlsx");
  XLSX.writeFile(workbook, publicOutputPath);

  console.log(`Successfully generated Excel spreadsheet:`);
  console.log(`1. Local Workspace: ${outputPath}`);
  console.log(`2. Web Download:    ${publicOutputPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error generating Excel spreadsheet:", err);
  process.exit(1);
});
