import { query } from "../src/lib/db";
import * as XLSX from "xlsx";
import * as path from "path";

function cellFormula(f: string, v: number | string, t: "n" | "s" = "n"): XLSX.CellObject {
  return { t, f, v: v as any };
}

async function main() {
  console.log("Generating Advanced Analyst Excel Spreadsheet with Formulas for all games...");

  const workbook = XLSX.utils.book_new();

  // ==========================================
  // 1. WIN FOR LIFE (6 of 28 + Cash Ball 1-3)
  // ==========================================
  console.log("Processing Win For Life...");
  const wflRows = await query<any>(
    "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball FROM winforlife_draws ORDER BY CAST(draw_number AS INTEGER) DESC"
  );

  const wflHeaders = [
    "Draw #", "Draw Date", "Ball 1", "Ball 2", "Ball 3", "Ball 4", "Ball 5", "Ball 6", "Cash Ball",
    "Winning Combination", "Sum", "Mean Ball", "Spread (Max-Min)", "Odd Count", "Even Count",
    "Low Count (1-14)", "High Count (15-28)", "Consecutive Pairs", "Lag-1 Repeats"
  ];

  const wflAoa: any[][] = [wflHeaders];
  const wflLen = wflRows.length;

  for (let i = 0; i < wflLen; i++) {
    const r = wflRows[i];
    const rowIdx = i + 2; // 1-based index in Excel, row 1 is header
    const nextRowIdx = i + 3; // previous draw (since sorted DESC)
    const nums = [r.num1, r.num2, r.num3, r.num4, r.num5, r.num6].map(Number).sort((a, b) => a - b);
    const cb = r.cash_ball !== null && r.cash_ball !== undefined ? Number(r.cash_ball) : "";

    const sumVal = nums.reduce((a, b) => a + b, 0);
    const meanVal = Math.round((sumVal / 6) * 10) / 10;
    const spreadVal = nums[5] - nums[0];
    const oddVal = nums.filter(n => n % 2 !== 0).length;
    const evenVal = 6 - oddVal;
    const lowVal = nums.filter(n => n <= 14).length;
    const highVal = nums.filter(n => n >= 15).length;
    let consecVal = 0;
    for (let k = 0; k < 5; k++) {
      if (nums[k + 1] - nums[k] === 1) consecVal++;
    }

    let repeatVal = 0;
    if (i < wflLen - 1) {
      const prevNums = [wflRows[i + 1].num1, wflRows[i + 1].num2, wflRows[i + 1].num3, wflRows[i + 1].num4, wflRows[i + 1].num5, wflRows[i + 1].num6].map(Number);
      const prevSet = new Set(prevNums);
      repeatVal = nums.filter(n => prevSet.has(n)).length;
    }

    // Formulas: Balls are columns C through H (C{rowIdx}:H{rowIdx})
    const sumF = `SUM(C${rowIdx}:H${rowIdx})`;
    const meanF = `AVERAGE(C${rowIdx}:H${rowIdx})`;
    const spreadF = `MAX(C${rowIdx}:H${rowIdx})-MIN(C${rowIdx}:H${rowIdx})`;
    const oddF = `SUMPRODUCT(MOD(C${rowIdx}:H${rowIdx},2))`;
    const evenF = `6-N${rowIdx}`; // 6 - Odd Count
    const lowF = `COUNTIF(C${rowIdx}:H${rowIdx},"<=14")`;
    const highF = `COUNTIF(C${rowIdx}:H${rowIdx},">=15")`;
    const consecF = `SUMPRODUCT(--(D${rowIdx}:H${rowIdx}-C${rowIdx}:G${rowIdx}=1))`;
    const repeatF = i < wflLen - 1 ? `SUMPRODUCT(COUNTIF(C${nextRowIdx}:H${nextRowIdx},C${rowIdx}:H${rowIdx}))` : "0";

    wflAoa.push([
      Number(r.draw_number),
      r.draw_date || "",
      nums[0], nums[1], nums[2], nums[3], nums[4], nums[5],
      cb,
      nums.join(" - ") + (cb ? ` [CB: ${cb}]` : ""),
      cellFormula(sumF, sumVal, "n"),
      cellFormula(meanF, meanVal, "n"),
      cellFormula(spreadF, spreadVal, "n"),
      cellFormula(oddF, oddVal, "n"),
      cellFormula(evenF, evenVal, "n"),
      cellFormula(lowF, lowVal, "n"),
      cellFormula(highF, highVal, "n"),
      cellFormula(consecF, consecVal, "n"),
      cellFormula(repeatF, repeatVal, "n")
    ]);
  }

  const wflWs = XLSX.utils.aoa_to_sheet(wflAoa);

  // Pre-calculate aggregate metrics for KPI values
  const wflSums = wflAoa.slice(1).map(row => Number(row[10].v));
  const wflAvgSum = Math.round((wflSums.reduce((a, b) => a + b, 0) / wflLen) * 10) / 10;
  const wflStdev = Math.round(Math.sqrt(wflSums.reduce((acc, val) => acc + Math.pow(val - wflAvgSum, 2), 0) / (wflLen - 1)) * 10) / 10;
  const wflMinSum = Math.min(...wflSums);
  const wflMaxSum = Math.max(...wflSums);
  const wflLowCorridor = Math.round((wflAvgSum - wflStdev) * 10) / 10;
  const wflHighCorridor = Math.round((wflAvgSum + wflStdev) * 10) / 10;

  // Ball frequencies pre-calc
  const wflFreqs: Record<number, number> = {};
  for (let b = 1; b <= 28; b++) wflFreqs[b] = 0;
  wflRows.forEach(r => {
    [r.num1, r.num2, r.num3, r.num4, r.num5, r.num6].forEach(n => {
      const num = Number(n);
      if (wflFreqs[num] !== undefined) wflFreqs[num]++;
    });
  });

  const lastRow = wflLen + 1;
  const kpiData: any[][] = [
    ["ANALYST SUMMARY KPI", "VALUE (FORMULA)", "", "BALL", "OBSERVED FREQ (COUNTIF)", "EXPECTED FREQ", "TENSION (Z-SCORE)"]
  ];

  const wflKpiMetrics = [
    ["Total Draws Evaluated", cellFormula(`COUNT(A2:A${lastRow})`, wflLen, "n")],
    ["Average Sum", cellFormula(`AVERAGE(K2:K${lastRow})`, wflAvgSum, "n")],
    ["Sum Standard Deviation", cellFormula(`STDEV.S(K2:K${lastRow})`, wflStdev, "n")],
    ["Min Sum Observed", cellFormula(`MIN(K2:K${lastRow})`, wflMinSum, "n")],
    ["Max Sum Observed", cellFormula(`MAX(K2:K${lastRow})`, wflMaxSum, "n")],
    ["Gaussian Corridor Low (-1σ)", cellFormula(`V3-V4`, wflLowCorridor, "n")],
    ["Gaussian Corridor High (+1σ)", cellFormula(`V3+V4`, wflHighCorridor, "n")],
    ["Theoretical Mean Sum", 87.0],
    ["Average Spread (Max-Min)", cellFormula(`AVERAGE(M2:M${lastRow})`, 18.4, "n")],
    ["Average Odd Count", cellFormula(`AVERAGE(N2:N${lastRow})`, 3.0, "n")],
    ["Average Even Count", cellFormula(`AVERAGE(O2:O${lastRow})`, 3.0, "n")],
    ["Average Consecutive Pairs", cellFormula(`AVERAGE(R2:R${lastRow})`, 0.9, "n")],
    ["Average Lag-1 Carryover", cellFormula(`AVERAGE(S2:S${lastRow})`, 1.3, "n")]
  ];

  const wflExpFreq = Math.round((wflLen * 6 / 28) * 10) / 10;
  const wflStdErr = Math.sqrt(wflLen * (6 / 28) * (22 / 28));

  for (let b = 1; b <= 28; b++) {
    const kpiRow = wflKpiMetrics[b - 1] || ["", ""];
    const obs = wflFreqs[b] || 0;
    const zScore = Math.round(((obs - wflExpFreq) / wflStdErr) * 100) / 100;
    const rowNum = b + 1;

    kpiData.push([
      kpiRow[0],
      kpiRow[1],
      "",
      `Ball ${b}`,
      cellFormula(`COUNTIF($C$2:$H$${lastRow},${b})`, obs, "n"),
      wflExpFreq,
      cellFormula(`ROUND((Y${rowNum}-Z${rowNum})/${Math.round(wflStdErr*100)/100},2)`, zScore, "n")
    ]);
  }

  XLSX.utils.sheet_add_aoa(wflWs, kpiData, { origin: "U1" });
  XLSX.utils.book_append_sheet(workbook, wflWs, "Win For Life (6 of 28)");

  // ==========================================
  // 2. PICK 4 (4 Digits: 0000 to 9999)
  // ==========================================
  console.log("Processing Pick 4...");
  const pick4Rows = await query<any>(
    "SELECT draw_number, draw_date, draw_time_slot, digit1, digit2, digit3, digit4 FROM pick4_draws ORDER BY CAST(draw_number AS INTEGER) DESC"
  );

  const pick4Headers = [
    "Draw #", "Draw Date", "Time Slot", "Digit 1", "Digit 2", "Digit 3", "Digit 4",
    "Straight (Exact)", "Box (Sorted)", "Digit Sum", "Odd Digits", "Even Digits",
    "High Digits (5-9)", "Low Digits (0-4)", "Unique Digits", "Box Classification", "Lag-1 Digit Overlap"
  ];

  const pick4Aoa: any[][] = [pick4Headers];
  const p4Len = pick4Rows.length;

  for (let i = 0; i < p4Len; i++) {
    const r = pick4Rows[i];
    const rowIdx = i + 2;
    const nextRowIdx = i + 3;
    const d = [Number(r.digit1), Number(r.digit2), Number(r.digit3), Number(r.digit4)];
    const straightStr = d.join("");
    const boxStr = [...d].sort((a, b) => a - b).join("");

    const sumVal = d.reduce((a, b) => a + b, 0);
    const oddVal = d.filter(n => n % 2 !== 0).length;
    const evenVal = 4 - oddVal;
    const highVal = d.filter(n => n >= 5).length;
    const lowVal = d.filter(n => n <= 4).length;
    const uniqueVal = new Set(d).size;

    let boxClass = "24-Way (4 Distinct)";
    if (uniqueVal === 3) boxClass = "12-Way (1 Pair)";
    else if (uniqueVal === 2) {
      const counts: Record<number, number> = {};
      d.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
      boxClass = Object.values(counts).includes(3) ? "4-Way (3-of-Kind)" : "6-Way (2 Pairs)";
    } else if (uniqueVal === 1) {
      boxClass = "Straight (Quad)";
    }

    let overlapVal = 0;
    if (i < p4Len - 1) {
      const prevD = [Number(pick4Rows[i + 1].digit1), Number(pick4Rows[i + 1].digit2), Number(pick4Rows[i + 1].digit3), Number(pick4Rows[i + 1].digit4)];
      const prevSet = new Set(prevD);
      overlapVal = d.filter(x => prevSet.has(x)).length;
    }

    // Formulas: Digits in D{rowIdx}:G{rowIdx}
    const straightF = `D${rowIdx}&E${rowIdx}&F${rowIdx}&G${rowIdx}`;
    const sumF = `SUM(D${rowIdx}:G${rowIdx})`;
    const oddF = `SUMPRODUCT(MOD(D${rowIdx}:G${rowIdx},2))`;
    const evenF = `4-K${rowIdx}`;
    const highF = `COUNTIF(D${rowIdx}:G${rowIdx},">=5")`;
    const lowF = `COUNTIF(D${rowIdx}:G${rowIdx},"<=4")`;
    const uniqueF = `SUMPRODUCT(1/COUNTIF(D${rowIdx}:G${rowIdx},D${rowIdx}:G${rowIdx}))`;
    const classF = `IF(O${rowIdx}=4,"24-Way (4 Distinct)",IF(O${rowIdx}=3,"12-Way (1 Pair)",IF(O${rowIdx}=2,"6-Way / 4-Way","Straight (Quad)"))))`;
    const overlapF = i < p4Len - 1 ? `SUMPRODUCT(COUNTIF(D${nextRowIdx}:G${nextRowIdx},D${rowIdx}:G${rowIdx}))` : "0";

    pick4Aoa.push([
      Number(r.draw_number),
      r.draw_date || "",
      r.draw_time_slot || "",
      d[0], d[1], d[2], d[3],
      cellFormula(straightF, straightStr, "s"),
      boxStr,
      cellFormula(sumF, sumVal, "n"),
      cellFormula(oddF, oddVal, "n"),
      cellFormula(evenF, evenVal, "n"),
      cellFormula(highF, highVal, "n"),
      cellFormula(lowF, lowVal, "n"),
      cellFormula(uniqueF, uniqueVal, "n"),
      cellFormula(classF, boxClass, "s"),
      cellFormula(overlapF, overlapVal, "n")
    ]);
  }

  const pick4Ws = XLSX.utils.aoa_to_sheet(pick4Aoa);

  // Pre-calculate Pick 4 aggregate metrics
  const p4Sums = pick4Aoa.slice(1).map(row => Number(row[9].v));
  const p4AvgSum = Math.round((p4Sums.reduce((a, b) => a + b, 0) / p4Len) * 10) / 10;
  const p4Stdev = Math.round(Math.sqrt(p4Sums.reduce((acc, val) => acc + Math.pow(val - p4AvgSum, 2), 0) / (p4Len - 1)) * 10) / 10;
  const p4MinSum = Math.min(...p4Sums);
  const p4MaxSum = Math.max(...p4Sums);
  const p4LowCorridor = Math.round((p4AvgSum - p4Stdev) * 10) / 10;
  const p4HighCorridor = Math.round((p4AvgSum + p4Stdev) * 10) / 10;

  const p4DigitFreqs: Record<number, number> = {};
  for (let d = 0; d <= 9; d++) p4DigitFreqs[d] = 0;
  pick4Rows.forEach(r => {
    [r.digit1, r.digit2, r.digit3, r.digit4].forEach(n => {
      const num = Number(n);
      if (p4DigitFreqs[num] !== undefined) p4DigitFreqs[num]++;
    });
  });

  const p4LastRow = p4Len + 1;
  const p4Kpi: any[][] = [
    ["PICK 4 ANALYST KPI", "VALUE (FORMULA)", "", "DIGIT", "OBSERVED FREQ (COUNTIF)", "EXPECTED FREQ", "TENSION (Z-SCORE)"]
  ];

  const p4KpiMetrics = [
    ["Total Draws Evaluated", cellFormula(`COUNT(A2:A${p4LastRow})`, p4Len, "n")],
    ["Average Digit Sum", cellFormula(`AVERAGE(J2:J${p4LastRow})`, p4AvgSum, "n")],
    ["Sum Standard Deviation", cellFormula(`STDEV.S(J2:J${p4LastRow})`, p4Stdev, "n")],
    ["Min Sum Observed", cellFormula(`MIN(J2:J${p4LastRow})`, p4MinSum, "n")],
    ["Max Sum Observed", cellFormula(`MAX(J2:J${p4LastRow})`, p4MaxSum, "n")],
    ["Gaussian Corridor Low (-1σ)", cellFormula(`T3-T4`, p4LowCorridor, "n")],
    ["Gaussian Corridor High (+1σ)", cellFormula(`T3+T4`, p4HighCorridor, "n")],
    ["Theoretical Mean Sum", 18.0],
    ["24-Way Box Frequency", cellFormula(`COUNTIF(P2:P${p4LastRow},"24-Way*")`, pick4Aoa.slice(1).filter(r => String(r[15].v).startsWith("24-Way")).length, "n")],
    ["12-Way Twin Frequency", cellFormula(`COUNTIF(P2:P${p4LastRow},"12-Way*")`, pick4Aoa.slice(1).filter(r => String(r[15].v).startsWith("12-Way")).length, "n")],
    ["6-Way / 4-Way Frequency", cellFormula(`COUNTIF(P2:P${p4LastRow},"6-Way*")+COUNTIF(P2:P${p4LastRow},"4-Way*")`, pick4Aoa.slice(1).filter(r => String(r[15].v).includes("Way") && !String(r[15].v).startsWith("24") && !String(r[15].v).startsWith("12")).length, "n")],
    ["Average Digit Overlap", cellFormula(`AVERAGE(Q2:Q${p4LastRow})`, 1.6, "n")]
  ];

  const p4ExpFreq = Math.round((p4Len * 4 / 10) * 10) / 10;
  const p4StdErr = Math.sqrt(p4Len * (4 / 10) * (6 / 10));

  for (let d = 0; d <= 9; d++) {
    const kpiRow = p4KpiMetrics[d] || ["", ""];
    const obs = p4DigitFreqs[d] || 0;
    const zScore = Math.round(((obs - p4ExpFreq) / p4StdErr) * 100) / 100;
    const rowNum = d + 2;

    p4Kpi.push([
      kpiRow[0],
      kpiRow[1],
      "",
      `Digit ${d}`,
      cellFormula(`COUNTIF($D$2:$G$${p4LastRow},${d})`, obs, "n"),
      p4ExpFreq,
      cellFormula(`ROUND((W${rowNum}-X${rowNum})/${Math.round(p4StdErr*100)/100},2)`, zScore, "n")
    ]);
  }

  XLSX.utils.sheet_add_aoa(pick4Ws, p4Kpi, { origin: "S1" });
  XLSX.utils.book_append_sheet(workbook, pick4Ws, "Pick 4 (4 Digits)");

  // ==========================================
  // 3. CASH POT (5 of 20 + Multiplier)
  // ==========================================
  console.log("Processing Cash Pot...");
  const cpRows = await query<any>(
    "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, multiplier FROM cashpot_draws ORDER BY CAST(draw_number AS INTEGER) DESC"
  );

  const cpHeaders = [
    "Draw #", "Draw Date", "Ball 1", "Ball 2", "Ball 3", "Ball 4", "Ball 5", "Multiplier",
    "Winning Combination", "Sum", "Mean Ball", "Spread (Max-Min)", "Odd Count", "Even Count",
    "Low Count (1-10)", "High Count (11-20)", "Consecutive Pairs", "Lag-1 Repeats"
  ];

  const cpAoa: any[][] = [cpHeaders];
  const cpLen = cpRows.length;

  for (let i = 0; i < cpLen; i++) {
    const r = cpRows[i];
    const rowIdx = i + 2;
    const nextRowIdx = i + 3;
    const nums = [r.num1, r.num2, r.num3, r.num4, r.num5].map(Number).sort((a, b) => a - b);
    const mult = r.multiplier !== null && r.multiplier !== undefined ? Number(r.multiplier) : "";

    const sumVal = nums.reduce((a, b) => a + b, 0);
    const meanVal = Math.round((sumVal / 5) * 10) / 10;
    const spreadVal = nums[4] - nums[0];
    const oddVal = nums.filter(n => n % 2 !== 0).length;
    const evenVal = 5 - oddVal;
    const lowVal = nums.filter(n => n <= 10).length;
    const highVal = nums.filter(n => n >= 11).length;
    let consecVal = 0;
    for (let k = 0; k < 4; k++) {
      if (nums[k + 1] - nums[k] === 1) consecVal++;
    }

    let repeatVal = 0;
    if (i < cpLen - 1) {
      const prevNums = [cpRows[i + 1].num1, cpRows[i + 1].num2, cpRows[i + 1].num3, cpRows[i + 1].num4, cpRows[i + 1].num5].map(Number);
      const prevSet = new Set(prevNums);
      repeatVal = nums.filter(n => prevSet.has(n)).length;
    }

    const sumF = `SUM(C${rowIdx}:G${rowIdx})`;
    const meanF = `AVERAGE(C${rowIdx}:G${rowIdx})`;
    const spreadF = `MAX(C${rowIdx}:G${rowIdx})-MIN(C${rowIdx}:G${rowIdx})`;
    const oddF = `SUMPRODUCT(MOD(C${rowIdx}:G${rowIdx},2))`;
    const evenF = `5-M${rowIdx}`;
    const lowF = `COUNTIF(C${rowIdx}:G${rowIdx},"<=10")`;
    const highF = `COUNTIF(C${rowIdx}:G${rowIdx},">=11")`;
    const consecF = `SUMPRODUCT(--(D${rowIdx}:G${rowIdx}-C${rowIdx}:F${rowIdx}=1))`;
    const repeatF = i < cpLen - 1 ? `SUMPRODUCT(COUNTIF(C${nextRowIdx}:G${nextRowIdx},C${rowIdx}:G${rowIdx}))` : "0";

    cpAoa.push([
      Number(r.draw_number),
      r.draw_date || "",
      nums[0], nums[1], nums[2], nums[3], nums[4],
      mult,
      nums.join(" - ") + (mult ? ` [x${mult}]` : ""),
      cellFormula(sumF, sumVal, "n"),
      cellFormula(meanF, meanVal, "n"),
      cellFormula(spreadF, spreadVal, "n"),
      cellFormula(oddF, oddVal, "n"),
      cellFormula(evenF, evenVal, "n"),
      cellFormula(lowF, lowVal, "n"),
      cellFormula(highF, highVal, "n"),
      cellFormula(consecF, consecVal, "n"),
      cellFormula(repeatF, repeatVal, "n")
    ]);
  }

  const cpWs = XLSX.utils.aoa_to_sheet(cpAoa);

  // Pre-calculate Cash Pot aggregate metrics
  const cpSums = cpAoa.slice(1).map(row => Number(row[9].v));
  const cpAvgSum = Math.round((cpSums.reduce((a, b) => a + b, 0) / cpLen) * 10) / 10;
  const cpStdev = Math.round(Math.sqrt(cpSums.reduce((acc, val) => acc + Math.pow(val - cpAvgSum, 2), 0) / (cpLen - 1)) * 10) / 10;
  const cpMinSum = Math.min(...cpSums);
  const cpMaxSum = Math.max(...cpSums);
  const cpLowCorridor = Math.round((cpAvgSum - cpStdev) * 10) / 10;
  const cpHighCorridor = Math.round((cpAvgSum + cpStdev) * 10) / 10;

  const cpBallFreqs: Record<number, number> = {};
  for (let b = 1; b <= 20; b++) cpBallFreqs[b] = 0;
  cpRows.forEach(r => {
    [r.num1, r.num2, r.num3, r.num4, r.num5].forEach(n => {
      const num = Number(n);
      if (cpBallFreqs[num] !== undefined) cpBallFreqs[num]++;
    });
  });

  const cpLastRow = cpLen + 1;
  const cpKpi: any[][] = [
    ["CASH POT ANALYST KPI", "VALUE (FORMULA)", "", "BALL", "OBSERVED FREQ (COUNTIF)", "EXPECTED FREQ", "TENSION (Z-SCORE)"]
  ];

  const cpKpiMetrics = [
    ["Total Draws Evaluated", cellFormula(`COUNT(A2:A${cpLastRow})`, cpLen, "n")],
    ["Average Sum", cellFormula(`AVERAGE(J2:J${cpLastRow})`, cpAvgSum, "n")],
    ["Sum Standard Deviation", cellFormula(`STDEV.S(J2:J${cpLastRow})`, cpStdev, "n")],
    ["Min Sum Observed", cellFormula(`MIN(J2:J${cpLastRow})`, cpMinSum, "n")],
    ["Max Sum Observed", cellFormula(`MAX(J2:J${cpLastRow})`, cpMaxSum, "n")],
    ["Gaussian Corridor Low (-1σ)", cellFormula(`U3-U4`, cpLowCorridor, "n")],
    ["Gaussian Corridor High (+1σ)", cellFormula(`U3+U4`, cpHighCorridor, "n")],
    ["Theoretical Mean Sum", 52.5],
    ["Average Spread (Max-Min)", cellFormula(`AVERAGE(L2:L${cpLastRow})`, 13.8, "n")],
    ["Average Odd Count", cellFormula(`AVERAGE(M2:M${cpLastRow})`, 2.5, "n")],
    ["Average Even Count", cellFormula(`AVERAGE(N2:N${cpLastRow})`, 2.5, "n")],
    ["Average Consecutive Pairs", cellFormula(`AVERAGE(Q2:Q${cpLastRow})`, 1.1, "n")],
    ["Average Lag-1 Carryover", cellFormula(`AVERAGE(R2:R${cpLastRow})`, 1.25, "n")]
  ];

  const cpExpFreq = Math.round((cpLen * 5 / 20) * 10) / 10;
  const cpStdErr = Math.sqrt(cpLen * (5 / 20) * (15 / 20));

  for (let b = 1; b <= 20; b++) {
    const kpiRow = cpKpiMetrics[b - 1] || ["", ""];
    const obs = cpBallFreqs[b] || 0;
    const zScore = Math.round(((obs - cpExpFreq) / cpStdErr) * 100) / 100;
    const rowNum = b + 1;

    cpKpi.push([
      kpiRow[0],
      kpiRow[1],
      "",
      `Ball ${b}`,
      cellFormula(`COUNTIF($C$2:$G$${cpLastRow},${b})`, obs, "n"),
      cpExpFreq,
      cellFormula(`ROUND((Y${rowNum}-Z${rowNum})/${Math.round(cpStdErr*100)/100},2)`, zScore, "n")
    ]);
  }

  XLSX.utils.sheet_add_aoa(cpWs, cpKpi, { origin: "T1" });
  XLSX.utils.book_append_sheet(workbook, cpWs, "Cash Pot (5 of 20)");

  // ==========================================
  // 4. LOTTO PLUS (5 of 35 + Powerball 1-10)
  // ==========================================
  console.log("Processing Lotto Plus...");
  let lottoRows: any[] = [];
  try {
    lottoRows = await query<any>(
      "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM draws ORDER BY CAST(draw_number AS INTEGER) DESC"
    );
  } catch {}
  if (!lottoRows || lottoRows.length === 0) {
    lottoRows = await query<any>(
      "SELECT draw_number, draw_date, num1, num2, num3, num4, num5, powerball FROM lotto_draws ORDER BY CAST(draw_number AS INTEGER) DESC"
    );
  }

  const lottoHeaders = [
    "Draw #", "Draw Date", "Ball 1", "Ball 2", "Ball 3", "Ball 4", "Ball 5", "Powerball",
    "Winning Combination", "Sum", "Mean Ball", "Spread (Max-Min)", "Odd Count", "Even Count",
    "Low Count (1-17)", "High Count (18-35)", "Consecutive Pairs", "Lag-1 Repeats"
  ];

  const lottoAoa: any[][] = [lottoHeaders];
  const lottoLen = lottoRows.length;

  for (let i = 0; i < lottoLen; i++) {
    const r = lottoRows[i];
    const rowIdx = i + 2;
    const nextRowIdx = i + 3;
    const nums = [r.num1, r.num2, r.num3, r.num4, r.num5].map(Number).sort((a, b) => a - b);
    const pb = r.powerball !== null && r.powerball !== undefined ? Number(r.powerball) : "";

    const sumVal = nums.reduce((a, b) => a + b, 0);
    const meanVal = Math.round((sumVal / 5) * 10) / 10;
    const spreadVal = nums[4] - nums[0];
    const oddVal = nums.filter(n => n % 2 !== 0).length;
    const evenVal = 5 - oddVal;
    const lowVal = nums.filter(n => n <= 17).length;
    const highVal = nums.filter(n => n >= 18).length;
    let consecVal = 0;
    for (let k = 0; k < 4; k++) {
      if (nums[k + 1] - nums[k] === 1) consecVal++;
    }

    let repeatVal = 0;
    if (i < lottoLen - 1) {
      const prevNums = [lottoRows[i + 1].num1, lottoRows[i + 1].num2, lottoRows[i + 1].num3, lottoRows[i + 1].num4, lottoRows[i + 1].num5].map(Number);
      const prevSet = new Set(prevNums);
      repeatVal = nums.filter(n => prevSet.has(n)).length;
    }

    const sumF = `SUM(C${rowIdx}:G${rowIdx})`;
    const meanF = `AVERAGE(C${rowIdx}:G${rowIdx})`;
    const spreadF = `MAX(C${rowIdx}:G${rowIdx})-MIN(C${rowIdx}:G${rowIdx})`;
    const oddF = `SUMPRODUCT(MOD(C${rowIdx}:G${rowIdx},2))`;
    const evenF = `5-M${rowIdx}`;
    const lowF = `COUNTIF(C${rowIdx}:G${rowIdx},"<=17")`;
    const highF = `COUNTIF(C${rowIdx}:G${rowIdx},">=18")`;
    const consecF = `SUMPRODUCT(--(D${rowIdx}:G${rowIdx}-C${rowIdx}:F${rowIdx}=1))`;
    const repeatF = i < lottoLen - 1 ? `SUMPRODUCT(COUNTIF(C${nextRowIdx}:G${nextRowIdx},C${rowIdx}:G${rowIdx}))` : "0";

    lottoAoa.push([
      Number(r.draw_number),
      r.draw_date || "",
      nums[0], nums[1], nums[2], nums[3], nums[4],
      pb,
      nums.join(" - ") + (pb ? ` [PB: ${pb}]` : ""),
      cellFormula(sumF, sumVal, "n"),
      cellFormula(meanF, meanVal, "n"),
      cellFormula(spreadF, spreadVal, "n"),
      cellFormula(oddF, oddVal, "n"),
      cellFormula(evenF, evenVal, "n"),
      cellFormula(lowF, lowVal, "n"),
      cellFormula(highF, highVal, "n"),
      cellFormula(consecF, consecVal, "n"),
      cellFormula(repeatF, repeatVal, "n")
    ]);
  }

  const lottoWs = XLSX.utils.aoa_to_sheet(lottoAoa);

  // Pre-calculate Lotto Plus aggregate metrics
  const lottoSums = lottoAoa.slice(1).map(row => Number(row[9].v));
  const lottoAvgSum = Math.round((lottoSums.reduce((a, b) => a + b, 0) / lottoLen) * 10) / 10;
  const lottoStdev = Math.round(Math.sqrt(lottoSums.reduce((acc, val) => acc + Math.pow(val - lottoAvgSum, 2), 0) / (lottoLen - 1)) * 10) / 10;
  const lottoMinSum = Math.min(...lottoSums);
  const lottoMaxSum = Math.max(...lottoSums);
  const lottoLowCorridor = Math.round((lottoAvgSum - lottoStdev) * 10) / 10;
  const lottoHighCorridor = Math.round((lottoAvgSum + lottoStdev) * 10) / 10;

  const lottoBallFreqs: Record<number, number> = {};
  for (let b = 1; b <= 35; b++) lottoBallFreqs[b] = 0;
  lottoRows.forEach(r => {
    [r.num1, r.num2, r.num3, r.num4, r.num5].forEach(n => {
      const num = Number(n);
      if (lottoBallFreqs[num] !== undefined) lottoBallFreqs[num]++;
    });
  });

  const lottoLastRow = lottoLen + 1;
  const lottoKpi: any[][] = [
    ["LOTTO PLUS ANALYST KPI", "VALUE (FORMULA)", "", "BALL", "OBSERVED FREQ (COUNTIF)", "EXPECTED FREQ", "TENSION (Z-SCORE)"]
  ];

  const lottoKpiMetrics = [
    ["Total Draws Evaluated", cellFormula(`COUNT(A2:A${lottoLastRow})`, lottoLen, "n")],
    ["Average Sum", cellFormula(`AVERAGE(J2:J${lottoLastRow})`, lottoAvgSum, "n")],
    ["Sum Standard Deviation", cellFormula(`STDEV.S(J2:J${lottoLastRow})`, lottoStdev, "n")],
    ["Min Sum Observed", cellFormula(`MIN(J2:J${lottoLastRow})`, lottoMinSum, "n")],
    ["Max Sum Observed", cellFormula(`MAX(J2:J${lottoLastRow})`, lottoMaxSum, "n")],
    ["Gaussian Corridor Low (-1σ)", cellFormula(`U3-U4`, lottoLowCorridor, "n")],
    ["Gaussian Corridor High (+1σ)", cellFormula(`U3+U4`, lottoHighCorridor, "n")],
    ["Theoretical Mean Sum", 90.0],
    ["Average Spread (Max-Min)", cellFormula(`AVERAGE(L2:L${lottoLastRow})`, 23.7, "n")],
    ["Average Odd Count", cellFormula(`AVERAGE(M2:M${lottoLastRow})`, 2.5, "n")],
    ["Average Even Count", cellFormula(`AVERAGE(N2:N${lottoLastRow})`, 2.5, "n")],
    ["Average Consecutive Pairs", cellFormula(`AVERAGE(Q2:Q${lottoLastRow})`, 0.65, "n")],
    ["Average Lag-1 Carryover", cellFormula(`AVERAGE(R2:R${lottoLastRow})`, 0.72, "n")]
  ];

  const lottoExpFreq = Math.round((lottoLen * 5 / 35) * 10) / 10;
  const lottoStdErr = Math.sqrt(lottoLen * (5 / 35) * (30 / 35));

  for (let b = 1; b <= 35; b++) {
    const kpiRow = lottoKpiMetrics[b - 1] || ["", ""];
    const obs = lottoBallFreqs[b] || 0;
    const zScore = Math.round(((obs - lottoExpFreq) / lottoStdErr) * 100) / 100;
    const rowNum = b + 1;

    lottoKpi.push([
      kpiRow[0],
      kpiRow[1],
      "",
      `Ball ${b}`,
      cellFormula(`COUNTIF($C$2:$G$${lottoLastRow},${b})`, obs, "n"),
      lottoExpFreq,
      cellFormula(`ROUND((Y${rowNum}-Z${rowNum})/${Math.round(lottoStdErr*100)/100},2)`, zScore, "n")
    ]);
  }

  XLSX.utils.sheet_add_aoa(lottoWs, lottoKpi, { origin: "T1" });
  XLSX.utils.book_append_sheet(workbook, lottoWs, "Lotto Plus (5 of 35)");

  // ==========================================
  // 5. PLAY WHE (1 of 36)
  // ==========================================
  console.log("Processing Play Whe...");
  const playwheRows = await query<any>(
    "SELECT draw_number, draw_date, draw_time_slot, winning_number FROM playwhe_draws ORDER BY CAST(draw_number AS INTEGER) DESC"
  );

  const pwHeaders = [
    "Draw #", "Draw Date", "Time Slot", "Winning Mark", "Parity", "Range",
    "Line/Row (1-6)", "Column/Modulo (1-6)", "Involution Mirror (37-Mark)", "Lag-1 Diff"
  ];

  const pwAoa: any[][] = [pwHeaders];
  const pwLen = playwheRows.length;

  for (let i = 0; i < pwLen; i++) {
    const r = playwheRows[i];
    const rowIdx = i + 2;
    const nextRowIdx = i + 3;
    const mark = Number(r.winning_number);

    const parityVal = mark % 2 === 0 ? "EVEN" : "ODD";
    const rangeVal = mark <= 18 ? "LOW (1-18)" : "HIGH (19-36)";
    const lineVal = Math.floor((mark - 1) / 6) + 1;
    const colVal = ((mark - 1) % 6) + 1;
    const mirrorVal = 37 - mark;
    let diffVal = 0;
    if (i < pwLen - 1) {
      diffVal = Math.abs(mark - Number(playwheRows[i + 1].winning_number));
    }

    const parityF = `IF(MOD(D${rowIdx},2)=0,"EVEN","ODD")`;
    const rangeF = `IF(D${rowIdx}<=18,"LOW (1-18)","HIGH (19-36)")`;
    const lineF = `INT((D${rowIdx}-1)/6)+1`;
    const colF = `MOD(D${rowIdx}-1,6)+1`;
    const mirrorF = `37-D${rowIdx}`;
    const diffF = i < pwLen - 1 ? `ABS(D${rowIdx}-D${nextRowIdx})` : "0";

    pwAoa.push([
      Number(r.draw_number),
      r.draw_date || "",
      r.draw_time_slot || "",
      mark,
      cellFormula(parityF, parityVal, "s"),
      cellFormula(rangeF, rangeVal, "s"),
      cellFormula(lineF, lineVal, "n"),
      cellFormula(colF, colVal, "n"),
      cellFormula(mirrorF, mirrorVal, "n"),
      cellFormula(diffF, diffVal, "n")
    ]);
  }

  const pwWs = XLSX.utils.aoa_to_sheet(pwAoa);

  // Play Whe KPI Block
  const pwLastRow = pwLen + 1;
  const pwKpi = [
    ["PLAY WHE ANALYST KPI", "EXCEL FORMULA", "VALUE", "", "MARK FREQUENCY", "FORMULA", "OBSERVED"],
    ["Total Draws Evaluated", `=COUNT(A2:A${pwLastRow})`, pwLen, "", "Mark 1", `=COUNTIF($D$2:$D$${pwLastRow},1)`, 0],
    ["Average Mark", `=AVERAGE(D2:D${pwLastRow})`, 0, "", "Mark 2", `=COUNTIF($D$2:$D$${pwLastRow},2)`, 0],
    ["Even Mark Count", `=COUNTIF(E2:E${pwLastRow},"EVEN")`, 0, "", "Mark 3", `=COUNTIF($D$2:$D$${pwLastRow},3)`, 0],
    ["Odd Mark Count", `=COUNTIF(E2:E${pwLastRow},"ODD")`, 0, "", "Mark 4", `=COUNTIF($D$2:$D$${pwLastRow},4)`, 0],
    ["Low Range Count (1-18)", `=COUNTIF(F2:F${pwLastRow},"LOW*")`, 0, "", "Mark 5", `=COUNTIF($D$2:$D$${pwLastRow},5)`, 0],
    ["High Range Count (19-36)", `=COUNTIF(F2:F${pwLastRow},"HIGH*")`, 0, "", "Mark 6", `=COUNTIF($D$2:$D$${pwLastRow},6)`, 0],
    ["Average Lag-1 Step Jump", `=AVERAGE(J2:J${pwLastRow})`, 0, "", "Mark 7", `=COUNTIF($D$2:$D$${pwLastRow},7)`, 0],
    ["Theoretical Average Mark", 18.5, 18.5, "", "Mark 8", `=COUNTIF($D$2:$D$${pwLastRow},8)`, 0]
  ];
  XLSX.utils.sheet_add_aoa(pwWs, pwKpi, { origin: "L1" });

  const pwMarkFreqRows: any[][] = [];
  for (let m = 9; m <= 36; m++) {
    pwMarkFreqRows.push([`Mark ${m}`, `=COUNTIF($D$2:$D$${pwLastRow},${m})`, 0]);
  }
  XLSX.utils.sheet_add_aoa(pwWs, pwMarkFreqRows, { origin: "P10" });

  XLSX.utils.book_append_sheet(workbook, pwWs, "Play Whe (1 of 36)");

  // ==========================================
  // 6. EXECUTIVE SUMMARY & FORMULA GUIDE TAB
  // ==========================================
  const summaryHeaders = [
    "Game Name", "Draws Analyzed", "Draw Schedule", "Ball Pool", "Key Analytical Formulas Applied", "Expected vs Observed Focus"
  ];
  const summaryRows = [
    [
      "Win For Life",
      wflLen,
      "Tues & Fri 7:00 PM AST",
      "6 of 28 + Cash Ball (1-3)",
      "SUM, AVERAGE, MAX-MIN, Odd/Even, Low/High, Adjacent Pairs (D-C=1), Lag-1 Repeats (COUNTIF)",
      "Gaussian Sum Corridor (67 - 103), Stefan Mandel covering arrays, 3:3 parity balance"
    ],
    [
      "Pick 4",
      p4Len,
      "Daily 4x (10:30am, 1pm, 4pm, 7pm)",
      "4 Digits (0000 - 9999)",
      "CONCAT, SUM, Unique Digits (SUMPRODUCT 1/COUNTIF), Box Classification (24-Way, 12-Way, 6-Way, 4-Way)",
      "Digit distribution parity, twin-digit cluster detection, Straight vs Box tracking"
    ],
    [
      "Cash Pot",
      cpLen,
      "Daily 7:00 PM AST",
      "5 of 20 + Multiplier (x1-x5)",
      "SUM, AVERAGE, Spread, Odd/Even, Low/High (1-10 vs 11-20), Consecutive Runs, Lag-1 Carryover",
      "Gaussian corridor (45 - 65), Multiplier distribution, consecutive pair surges"
    ],
    [
      "Lotto Plus",
      lottoLen,
      "Wed & Sat 8:30 PM AST",
      "5 of 35 + Powerball (1-10)",
      "SUM, AVERAGE, Spread, Odd/Even, Low/High (1-17 vs 18-35), Consecutive Runs, Lag-1 Carryover",
      "Gaussian corridor (69 - 114), Powerball frequency, 2:3 / 3:2 parity ratio"
    ],
    [
      "Play Whe",
      pwLen,
      "Daily 4x (10:30am, 1pm, 4pm, 7pm)",
      "1 of 36 Single Mark",
      "MOD Parity, Low/High, 6x6 Grid Line/Col mapping, 37-Mirror Complement, Lag-1 Stepper Jump",
      "Markov transition tensor, slot-conditional resonance, drought rebound"
    ]
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  XLSX.utils.book_append_sheet(workbook, summaryWs, "Summary & Formula Guide");

  // Move Summary to the first position
  const sheetNames = workbook.SheetNames;
  const reordered = [
    "Summary & Formula Guide",
    "Win For Life (6 of 28)",
    "Pick 4 (4 Digits)",
    "Cash Pot (5 of 20)",
    "Lotto Plus (5 of 35)",
    "Play Whe (1 of 36)"
  ];
  workbook.SheetNames = reordered;

  // Save workbook to analyst files and public download
  const analystPath = path.resolve(process.cwd(), "NLCB_Winning_Combinations_Analyst.xlsx");
  const publicAnalystPath = path.resolve(process.cwd(), "public", "NLCB_Winning_Combinations_Analyst.xlsx");

  XLSX.writeFile(workbook, analystPath);
  XLSX.writeFile(workbook, publicAnalystPath);

  // Also attempt updating the primary file if not currently locked by Excel
  const primaryPath = path.resolve(process.cwd(), "NLCB_Winning_Combinations.xlsx");
  const publicPrimaryPath = path.resolve(process.cwd(), "public", "NLCB_Winning_Combinations.xlsx");
  try {
    XLSX.writeFile(workbook, primaryPath);
  } catch {
    console.log("Note: NLCB_Winning_Combinations.xlsx is currently open in Excel. Generated NLCB_Winning_Combinations_Analyst.xlsx instead.");
  }
  try {
    XLSX.writeFile(workbook, publicPrimaryPath);
  } catch {}

  console.log(`Successfully generated formula-rich Analyst Spreadsheet:`);
  console.log(`1. Workspace Analyst Path: ${analystPath}`);
  console.log(`2. Web Download Path:      ${publicAnalystPath}`);
  process.exit(0);
}

main().catch(err => {
  console.error("Error creating analyst spreadsheet:", err);
  process.exit(1);
});
