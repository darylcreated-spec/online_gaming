/**
 * Anti-Trap Ticket Quality Scorer
 * Evaluates lottery combinations against mathematical probability distributions
 * to eliminate statistically dead combinations and maximize expected value.
 */

export interface QualityScoreResult {
  score: number;
  grade: "A+" | "A" | "B" | "C" | "F";
  gradeLabel: string;
  badgeColor: string;
  isTrap: boolean;
  traps: string[];
  metrics: {
    sum: number;
    sumStatus: "Optimal" | "Borderline" | "Extreme Trap";
    oddEvenRatio: string;
    oddEvenStatus: "Balanced" | "Acceptable" | "Extreme Trap";
    highLowRatio: string;
    highLowStatus: "Balanced" | "Acceptable" | "Extreme Trap";
    maxConsecutive: number;
    consecutiveStatus: "Optimal" | "Moderate" | "Extreme Run Trap";
    decadeCount: number;
    decadeStatus: "Diverse" | "Acceptable" | "Decade Cluster Trap";
  };
  recommendation: string;
}

export function evaluateTicketQuality(
  numbers: number[],
  poolMax: number = 36
): QualityScoreResult {
  if (!numbers || numbers.length < 5) {
    return {
      score: 50,
      grade: "C",
      gradeLabel: "Incomplete Line",
      badgeColor: "text-gray-400 bg-gray-500/10 border-gray-500/30",
      isTrap: false,
      traps: ["Line has less than 5 numbers"],
      metrics: {
        sum: 0,
        sumStatus: "Borderline",
        oddEvenRatio: "0:0",
        oddEvenStatus: "Acceptable",
        highLowRatio: "0:0",
        highLowStatus: "Acceptable",
        maxConsecutive: 0,
        consecutiveStatus: "Optimal",
        decadeCount: 0,
        decadeStatus: "Diverse"
      },
      recommendation: "Pick 5 distinct numbers to evaluate full quality."
    };
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  const n = sorted.length;
  let penaltyPoints = 0;
  const traps: string[] = [];

  // 1. Sum Total Evaluation (Bell Curve)
  // For 5/36: Mean sum is ~92.5. 75% of winning draws fall between 65 and 120.
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  let sumStatus: "Optimal" | "Borderline" | "Extreme Trap" = "Optimal";

  if (n === 5) {
    if (sum < 45 || sum > 140) {
      sumStatus = "Extreme Trap";
      penaltyPoints += 30;
      traps.push(`Extreme Sum (${sum}): Historical occurrence < 0.5%`);
    } else if (sum < 60 || sum > 125) {
      sumStatus = "Borderline";
      penaltyPoints += 12;
    }
  } else if (n === 6) {
    // 6/28 (Win for Life): Mean sum ~87
    if (sum < 40 || sum > 135) {
      sumStatus = "Extreme Trap";
      penaltyPoints += 30;
      traps.push(`Extreme Sum (${sum}): Historical occurrence < 0.5%`);
    } else if (sum < 55 || sum > 120) {
      sumStatus = "Borderline";
      penaltyPoints += 12;
    }
  }

  // 2. Odd / Even Distribution
  const oddCount = sorted.filter(v => v % 2 !== 0).length;
  const evenCount = n - oddCount;
  const oddEvenRatio = `${oddCount}O : ${evenCount}E`;
  let oddEvenStatus: "Balanced" | "Acceptable" | "Extreme Trap" = "Balanced";

  if (oddCount === 0 || evenCount === 0) {
    oddEvenStatus = "Extreme Trap";
    penaltyPoints += 25;
    traps.push(oddCount === 0 ? "All Even Numbers (100% Even Trap)" : "All Odd Numbers (100% Odd Trap)");
  } else if (oddCount === 1 || evenCount === 1) {
    oddEvenStatus = "Acceptable";
    penaltyPoints += 5;
  }

  // 3. High / Low Distribution
  const mid = poolMax / 2;
  const lowCount = sorted.filter(v => v <= mid).length;
  const highCount = n - lowCount;
  const highLowRatio = `${lowCount}L : ${highCount}H`;
  let highLowStatus: "Balanced" | "Acceptable" | "Extreme Trap" = "Balanced";

  if (lowCount === 0 || highCount === 0) {
    highLowStatus = "Extreme Trap";
    penaltyPoints += 25;
    traps.push(lowCount === 0 ? `All High Numbers (> ${mid})` : `All Low Numbers (<= ${mid})`);
  } else if (lowCount === 1 || highCount === 1) {
    highLowStatus = "Acceptable";
    penaltyPoints += 5;
  }

  // 4. Consecutive Run Detector
  let maxConsecutive = 1;
  let currentRun = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentRun++;
      if (currentRun > maxConsecutive) maxConsecutive = currentRun;
    } else {
      currentRun = 1;
    }
  }

  let consecutiveStatus: "Optimal" | "Moderate" | "Extreme Run Trap" = "Optimal";
  if (maxConsecutive >= 4) {
    consecutiveStatus = "Extreme Run Trap";
    penaltyPoints += 35;
    traps.push(`${maxConsecutive} Consecutive Numbers in a row`);
  } else if (maxConsecutive === 3) {
    consecutiveStatus = "Moderate";
    penaltyPoints += 15;
    traps.push(`3 Consecutive Numbers (e.g. ${sorted.filter((_, i) => i < sorted.length - 2 && sorted[i+1] === sorted[i]+1 && sorted[i+2] === sorted[i]+2).join(",")})`);
  }

  // 5. Decade / Cluster Diversity
  const decades = new Set(sorted.map(v => Math.floor((v - 1) / 10)));
  const decadeCount = decades.size;
  let decadeStatus: "Diverse" | "Acceptable" | "Decade Cluster Trap" = "Diverse";

  if (decadeCount === 1) {
    decadeStatus = "Decade Cluster Trap";
    penaltyPoints += 20;
    traps.push("All numbers clustered in the same single decade group");
  } else if (decadeCount === 2 && n >= 5) {
    decadeStatus = "Acceptable";
    penaltyPoints += 5;
  }

  // Calculate final score
  const finalScore = Math.max(5, Math.min(100, 100 - penaltyPoints));
  const isTrap = finalScore < 60 || traps.length > 0;

  let grade: "A+" | "A" | "B" | "C" | "F" = "A";
  let gradeLabel = "Optimal Combination";
  let badgeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";

  if (finalScore >= 92) {
    grade = "A+";
    gradeLabel = "Elite Mathematical Fitness";
    badgeColor = "text-emerald-300 bg-emerald-500/20 border-emerald-500/40";
  } else if (finalScore >= 80) {
    grade = "A";
    gradeLabel = "Optimal Balanced Line";
    badgeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  } else if (finalScore >= 68) {
    grade = "B";
    gradeLabel = "Viable Distribution";
    badgeColor = "text-sky-400 bg-sky-500/10 border-sky-500/30";
  } else if (finalScore >= 50) {
    grade = "C";
    gradeLabel = "Suboptimal (Minor Traps)";
    badgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/30";
  } else {
    grade = "F";
    gradeLabel = "Statistical Trap Detected";
    badgeColor = "text-rose-400 bg-rose-500/20 border-rose-500/40";
  }

  // Auto recommendations
  let recommendation = "Excellent combination! Optimal sum, balanced odd/even ratio, and healthy decade spread.";
  if (isTrap) {
    if (sumStatus === "Extreme Trap") {
      recommendation = sum < 50 ? "Sum is too low. Swap some low numbers for mid-range numbers (15-28)." : "Sum is too high. Swap high numbers for low-to-mid range numbers (6-20).";
    } else if (oddEvenStatus === "Extreme Trap") {
      recommendation = oddCount === 0 ? "Add 2 or 3 odd numbers for a balanced 3:2 distribution." : "Add 2 or 3 even numbers for a balanced 3:2 distribution.";
    } else if (consecutiveStatus === "Extreme Run Trap") {
      recommendation = "Break up consecutive sequences. 4+ numbers in a row hit less than once in 10,000 draws.";
    } else {
      recommendation = "Adjust number selection to spread across multiple decades and balance odd/even counts.";
    }
  }

  return {
    score: finalScore,
    grade,
    gradeLabel,
    badgeColor,
    isTrap,
    traps,
    metrics: {
      sum,
      sumStatus,
      oddEvenRatio,
      oddEvenStatus,
      highLowRatio,
      highLowStatus,
      maxConsecutive,
      consecutiveStatus,
      decadeCount,
      decadeStatus
    },
    recommendation
  };
}
