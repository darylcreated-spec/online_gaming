/**
 * lucky7_engine.ts
 * ================
 * The Lucky 7 Engine v2 — Steiner Pool -> Out-of-the-Box Number Theory & Follower Engine.
 *
 * REDESIGNED EMPIRICAL ARCHITECTURE (NO MATCH-3+ ARTIFICIAL CAP):
 * 1. Step 1 — Explicitly List & Rank the Steiner 1-10 Number Pool:
 *    - Pulls the Top 10 Steiner picks for each game and lists every distinct number in that pool
 *      with its Steiner frequency, High/Low half, Odd/Even parity, Prime/Fibonacci status,
 *      "What Follows What" Lag-1 follower score after the latest draw, and strongest partner link.
 * 2. Step 2 — Generate 7 Distinct Out-of-the-Box Combinations (Chasing Match 4, Match 5 & Jackpot):
 *    - Stops forcing MaxOverlap = 1 Match-3+ pair spreading, which artificially caps 4-ball and
 *      5-ball concentration. Instead builds 7 genuinely different Number-Theory & Sequential-Dynamics
 *      plays from the listed Steiner pool:
 *        Play #1: What Follows What (Lag-1 Draw-to-Draw Markov Follower)
 *        Play #2: What Plays Together (Anchor Co-Occurrence Partner Chain)
 *        Play #3: High / Low Mean-Reversion Balance
 *        Play #4: High / Low Polarity Breakout Surge (Asymmetric Wave)
 *        Play #5: Number Theory (Primes, Fibonacci & Modular Residue Lanes)
 *        Play #6: Mirror Complements (V + 1 - x) & Neighbor Slides (+/- 1)
 *        Play #7: Carryover Repeat + Parity Inversion & Overdue Rebound
 * 3. Step 3 — Completely Decoupled Bonus & Timing Sequences:
 *    - Lotto Plus: Main 5 numbers (1 to 35) NEVER consider Powerball. Powerball (1 to 10) is
 *      analyzed independently as its own 1 to 10 sequence using the Top 3 Most Likely Played
 *      Powerballs (weighted 3-2-2 across the 7 slips).
 *    - Win For Life: Main 6 numbers (1 to 28) NEVER consider Cash Ball. Cash Ball (strictly 1, 2,
 *      or 3) is analyzed independently using live 1 to 3 play frequency and transition rhythm.
 *    - Cash Pot: Main 5 numbers (1 to 20) stay strictly focused on 1-10 Low vs 11-20 High and
 *      number-theory transitions; Multiplier & Sure Call day timing are tracked separately.
 * 4. Step 4 — Higher-Tier Out-of-Sample Walk-Forward Audit:
 *    - Tracks Match 3+, Match 4+, Match 5+ / Jackpot, Top-12 Narrowed Pool Capture, Decoupled
 *      Bonus accuracy, and a live 7-Method Leaderboard across real historical Turso draws.
 */

import {
  buildTop10SteinerPicksForGame,
  formatTrevorBall,
  getTrevorGameMeta,
  TrevorGameKey,
  TrevorHistoricalDraw,
  TrevorSteinerPick
} from "@/lib/trevor_engine";
import { CHINAPOO_CHART } from "@/lib/playwhe";

export type Lucky7GameKey = TrevorGameKey;

export interface Lucky7PoolNumber {
  number: number;
  label: string;
  steinerCount: number;
  steinerRanks: number[];
  zone: "Low" | "High" | "Zero";
  parity: "Odd" | "Even" | "Zero";
  isPrime: boolean;
  isFibonacci: boolean;
  followsLastCount: number;
  topTriggerNote: string;
  topPartnerNumber: number | null;
  topPartnerCount: number;
  overdueDraws: number;
  recentHits: number;
  compositeScore: number;
}

export interface Lucky7FollowerLink {
  fromNumber: number;
  fromLabel: string;
  topFollowers: { number: number; label: string; count: number }[];
}

export interface Lucky7DecoupledBonusRank {
  value: number;
  label: string;
  recentCount: number;
  totalCount: number;
  followsLastCount: number;
  overdueDraws: number;
  score: number;
  isTopPick: boolean;
}

export interface Lucky7DecoupledBonus {
  title: string;
  subtitle: string;
  sequenceRangeLabel: string;
  topPick: number;
  topThreePicks: number[];
  assignmentNote: string;
  rankings: Lucky7DecoupledBonusRank[];
  extraContextNote?: string;
}

export interface Lucky7PlayCard {
  index: number; // 1..7
  methodKey: string;
  methodName: string;
  numbers: number[];
  bonus?: number;
  roleLabel: string;
  rationale: string;
  highLowSplit: string;
  oddEvenSplit: string;
  sumTotal?: number;
  sourceSteinerRanks: number[];
  newCrossSlipPairs?: number;
  totalPairsInSlip?: number;
}

export interface Lucky7StructuralMetrics {
  contextTitle: string;
  contextSubtitle: string;
  whySteinerFragments: string;
  mathAdjustmentSummary: string;
  internalMaxOverlap: number;
  coveredNumbersCount: number;
  totalPoolSize: number;
  newCrossSlipPairsCount: number;
  totalLucky7PairsCount: number;
  steiner10PairsCount: number;
  totalUniversePairsCount: number;
  combinedPairCoveragePct: number;
  standaloneCoverageNote: string;
  combined17CoverageNote: string;
  lowRangeLabel: string;
  highRangeLabel: string;
}

export interface Lucky7MethodPerf {
  index: number;
  methodKey: string;
  methodName: string;
  prizeHits: number;
  match3PlusHits: number;
  match4PlusHits: number;
  match5PlusHits: number;
  bestMatch: number;
  hitRatePct: number;
}

export interface Lucky7AuditLogEntry {
  drawNumber: number;
  drawDate: string;
  actualNumbers: number[];
  actualBonus?: number;
  steiner10BestMatch: number;
  lucky7BestMatch: number;
  bestMethodName: string;
  steiner10WonPrize: boolean;
  lucky7WonPrize: boolean;
  lucky7Hit4Plus: boolean;
  bonusTop3Hit?: boolean;
  rescuedFragmentedDraw: boolean;
  outcomeNote: string;
}

export interface Lucky7HypothesisAudit {
  drawsAudited: number;
  steiner10UnionCapturePct: number;
  top12Pool4PlusPct: number;
  top12PoolAllPct: number;
  fragmentationGapPct: number;
  fragmentationGapCount: number;
  steiner10PrizeRatePct: number;
  steiner10PrizeHits: number;
  lucky7StandalonePrizeRatePct: number;
  lucky7StandalonePrizeHits: number;
  combined17PrizeRatePct: number;
  combined17PrizeHits: number;
  steiner10Match4PlusHits: number;
  steiner10Match4PlusPct: number;
  lucky7Match4PlusHits: number;
  lucky7Match4PlusPct: number;
  combined17Match4PlusHits: number;
  combined17Match4PlusPct: number;
  lucky7Match5PlusHits: number;
  bestSingleTicketMatch: number;
  decoupledBonusTop1Pct?: number;
  decoupledBonusTop3Pct?: number;
  rescuedFragmentedCount: number;
  rescuedFragmentedPct: number;
  verdictHeadline: string;
  verdictExplanation: string;
  methodLeaderboard: Lucky7MethodPerf[];
  recentLog: Lucky7AuditLogEntry[];
}

export interface Lucky7EngineResult {
  game: Lucky7GameKey;
  gameName: string;
  themeColor: "yellow" | "sky" | "emerald" | "amber" | "purple" | "rose";
  unitCostTT: number;
  lucky7TotalCostTT: number;
  bonusName?: string;
  bonusMax?: number;
  totalDrawsAnalyzed: number;
  nextTargetDrawNumber: number;
  latestDraw?: {
    drawNumber: number;
    drawDate: string;
    timeSlot?: string;
    numbers: number[];
    bonus?: number;
  };
  top10SteinerPicks: TrevorSteinerPick[];
  steinerNumberPool: Lucky7PoolNumber[];
  whatFollowsLastDraw: Lucky7FollowerLink[];
  decoupledBonus?: Lucky7DecoupledBonus;
  lucky7Plays: Lucky7PlayCard[];
  metrics: Lucky7StructuralMetrics;
  hypothesisAudit?: Lucky7HypothesisAudit;
}

// ============================================================================
// Pure Number Theory & Statistical Helpers
// ============================================================================
const FIBONACCI_SET = new Set([1, 2, 3, 5, 8, 13, 21, 34]);

function isPrimeNumber(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function overlapCount(a: number[], b: number[]): number {
  let c = 0;
  for (let i = 0; i < a.length; i++) {
    if (b.includes(a[i])) c++;
  }
  return c;
}

function getGamePoolBounds(game: Lucky7GameKey): {
  minVal: number;
  maxVal: number;
  pickSize: number;
  midSplit: number;
  lowLabel: string;
  highLabel: string;
} {
  switch (game) {
    case "cashpot":
      return { minVal: 1, maxVal: 20, pickSize: 5, midSplit: 10, lowLabel: "1 to 10", highLabel: "11 to 20" };
    case "lotto-plus":
      return { minVal: 1, maxVal: 35, pickSize: 5, midSplit: 17, lowLabel: "1 to 17", highLabel: "18 to 35" };
    case "win-for-life":
      return { minVal: 1, maxVal: 28, pickSize: 6, midSplit: 14, lowLabel: "1 to 14", highLabel: "15 to 28" };
    case "play-whe":
      return { minVal: 1, maxVal: 36, pickSize: 1, midSplit: 18, lowLabel: "1 to 18", highLabel: "19 to 36" };
    case "pick4":
      return { minVal: 0, maxVal: 9, pickSize: 4, midSplit: 4, lowLabel: "0 to 4", highLabel: "5 to 9" };
    case "fast-cash":
      return { minVal: 0, maxVal: 37, pickSize: 1, midSplit: 18, lowLabel: "1 to 18", highLabel: "19 to 36" };
  }
}

function getZoneForNumber(game: Lucky7GameKey, n: number, midSplit: number): "Low" | "High" | "Zero" {
  if (game === "fast-cash" && (n === 0 || n === 37)) return "Zero";
  return n <= midSplit ? "Low" : "High";
}

function getParityForNumber(game: Lucky7GameKey, n: number): "Odd" | "Even" | "Zero" {
  if (game === "fast-cash" && (n === 0 || n === 37)) return "Zero";
  return n % 2 === 1 ? "Odd" : "Even";
}

function formatHighLowSplit(game: Lucky7GameKey, nums: number[], midSplit: number): string {
  if (nums.length === 1) {
    const z = getZoneForNumber(game, nums[0], midSplit);
    return z === "Zero" ? "Green Zero / 00" : `${z} Half`;
  }
  const lows = nums.filter((n) => getZoneForNumber(game, n, midSplit) === "Low").length;
  const highs = nums.length - lows;
  return `${lows} Low / ${highs} High`;
}

function formatOddEvenSplit(game: Lucky7GameKey, nums: number[]): string {
  if (nums.length === 1) {
    const p = getParityForNumber(game, nums[0]);
    return p === "Zero" ? "Zero Pocket" : p;
  }
  const odds = nums.filter((n) => n % 2 === 1).length;
  const evens = nums.length - odds;
  return `${odds} Odd / ${evens} Even`;
}

function computeSourceSteinerRanks(numbers: number[], steiner10: TrevorSteinerPick[]): number[] {
  const numSet = new Set(numbers);
  const ranks: number[] = [];
  for (const s of steiner10) {
    if (s.numbers.some((n) => numSet.has(n))) {
      ranks.push(s.rank);
    }
  }
  return ranks;
}

// ============================================================================
// Live Transition, Co-Occurrence & Steiner Pool Analysis
// ============================================================================
interface HistoryAnalytics {
  maxVal: number;
  minVal: number;
  midSplit: number;
  freqAll: number[];
  freqRecent: number[];
  lastSeen: number[];
  overdue: number[];
  follow: number[][]; // follow[prev][next]
  followLag2: number[][]; // followLag2[prev2][next]
  followFromLast: number[]; // sum of follow[p][y] over p in lastDraw
  cooccur: number[][]; // cooccur[a][b]
  lastNums: number[];
  prev2Nums: number[];
  steinerCount: number[];
  steinerRanksMap: Map<number, number[]>;
  steinerPoolSet: Set<number>;
  baseScore: number[];
}

function analyzeGameHistoryAndSteinerPool(
  game: Lucky7GameKey,
  histDraws: TrevorHistoricalDraw[],
  steiner10: TrevorSteinerPick[]
): {
  analytics: HistoryAnalytics;
  steinerNumberPool: Lucky7PoolNumber[];
  whatFollowsLastDraw: Lucky7FollowerLink[];
} {
  const bounds = getGamePoolBounds(game);
  const size = bounds.maxVal + 1;
  const N = histDraws.length;
  const recentWin = Math.min(game === "play-whe" || game === "fast-cash" ? 120 : 45, N);

  const freqAll = Array(size).fill(0);
  const freqRecent = Array(size).fill(0);
  const lastSeen = Array(size).fill(-1);
  const follow = Array.from({ length: size }, () => Array(size).fill(0));
  const followLag2 = Array.from({ length: size }, () => Array(size).fill(0));
  const cooccur = Array.from({ length: size }, () => Array(size).fill(0));

  for (let t = 0; t < N; t++) {
    const nums = histDraws[t].numbers;
    const isRec = t >= N - recentWin;
    for (let i = 0; i < nums.length; i++) {
      const a = nums[i];
      if (a < bounds.minVal || a > bounds.maxVal) continue;
      freqAll[a]++;
      if (isRec) freqRecent[a]++;
      lastSeen[a] = t;
      for (let j = i + 1; j < nums.length; j++) {
        const b = nums[j];
        if (b >= bounds.minVal && b <= bounds.maxVal) {
          cooccur[a][b]++;
          cooccur[b][a]++;
        }
      }
    }
    if (t >= 1) {
      const prev = histDraws[t - 1].numbers;
      for (const p of prev) {
        if (p < bounds.minVal || p > bounds.maxVal) continue;
        for (const c of nums) {
          if (c < bounds.minVal || c > bounds.maxVal) continue;
          follow[p][c]++;
        }
      }
    }
    if (t >= 2) {
      const prev2 = histDraws[t - 2].numbers;
      for (const p2 of prev2) {
        if (p2 < bounds.minVal || p2 > bounds.maxVal) continue;
        for (const c of nums) {
          if (c < bounds.minVal || c > bounds.maxVal) continue;
          followLag2[p2][c]++;
        }
      }
    }
  }

  const lastNums = N > 0 ? histDraws[N - 1].numbers : [];
  const prev2Nums = N > 1 ? histDraws[N - 2].numbers : [];
  const followFromLast = Array(size).fill(0);
  for (const p of lastNums) {
    if (p < bounds.minVal || p > bounds.maxVal) continue;
    for (let y = bounds.minVal; y <= bounds.maxVal; y++) {
      followFromLast[y] += follow[p][y];
    }
  }

  const overdue = Array(size).fill(0);
  for (let y = bounds.minVal; y <= bounds.maxVal; y++) {
    overdue[y] = lastSeen[y] === -1 ? N : N - 1 - lastSeen[y];
  }

  // Extract the exact listed number pool from Steiner Picks #1..#10
  const steinerCount = Array(size).fill(0);
  const steinerPriority = Array(size).fill(0);
  const steinerRanksMap = new Map<number, number[]>();
  const steinerPoolSet = new Set<number>();

  for (const pick of steiner10) {
    const uniqInSlip = Array.from(new Set(pick.numbers));
    for (const n of uniqInSlip) {
      if (n < bounds.minVal || n > bounds.maxVal) continue;
      steinerCount[n]++;
      steinerPriority[n] += (11 - pick.rank) * 0.45;
      steinerPoolSet.add(n);
      const list = steinerRanksMap.get(n) || [];
      list.push(pick.rank);
      steinerRanksMap.set(n, list);
    }
  }

  const baseScore = Array(size).fill(0);
  for (let n = bounds.minVal; n <= bounds.maxVal; n++) {
    const inSteinerBoost = steinerPoolSet.has(n) ? 6.0 + steinerCount[n] * 1.4 + steinerPriority[n] * 0.35 : 0;
    baseScore[n] =
      inSteinerBoost +
      freqRecent[n] * 1.85 +
      followFromLast[n] * 1.35 +
      Math.min(overdue[n], 24) * 0.32 +
      freqAll[n] * 0.05;
  }

  // Build Step 1: Explicit Listed Steiner 1-10 Number Pool
  const steinerNumberPool: Lucky7PoolNumber[] = Array.from(steinerPoolSet)
    .map((n) => {
      // Find which latest-draw number triggers `n` most strongly
      let bestTrigNum = -1;
      let bestTrigCnt = 0;
      for (const p of lastNums) {
        if (p >= bounds.minVal && p <= bounds.maxVal && follow[p][n] > bestTrigCnt) {
          bestTrigCnt = follow[p][n];
          bestTrigNum = p;
        }
      }

      // Find strongest co-occurring partner (for multi-ball) or lag-1 successor (for single-ball)
      let bestPartner: number | null = null;
      let bestPartnerCnt = 0;
      for (let m = bounds.minVal; m <= bounds.maxVal; m++) {
        if (m === n) continue;
        const linkCnt = bounds.pickSize > 1 ? cooccur[n][m] : follow[n][m];
        if (linkCnt > bestPartnerCnt) {
          bestPartnerCnt = linkCnt;
          bestPartner = m;
        }
      }

      const label =
        game === "play-whe"
          ? `${formatTrevorBall(game, n)} ${CHINAPOO_CHART[n]?.mark || ""}`.trim()
          : formatTrevorBall(game, n);

      return {
        number: n,
        label,
        steinerCount: steinerCount[n],
        steinerRanks: steinerRanksMap.get(n) || [],
        zone: getZoneForNumber(game, n, bounds.midSplit),
        parity: getParityForNumber(game, n),
        isPrime: isPrimeNumber(n),
        isFibonacci: FIBONACCI_SET.has(n),
        followsLastCount: followFromLast[n],
        topTriggerNote:
          bestTrigNum >= 0 && bestTrigCnt > 0
            ? `Follows ${formatTrevorBall(game, bestTrigNum)} (${bestTrigCnt}x)`
            : "Fresh transition",
        topPartnerNumber: bestPartner,
        topPartnerCount: bestPartnerCnt,
        overdueDraws: overdue[n],
        recentHits: freqRecent[n],
        compositeScore: Math.round(baseScore[n] * 10) / 10
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore || b.steinerCount - a.steinerCount || a.number - b.number);

  // Build "What Follows Last Draw" live lookup strip
  const uniqLast = Array.from(new Set(lastNums)).filter((n) => n >= bounds.minVal && n <= bounds.maxVal);
  const whatFollowsLastDraw: Lucky7FollowerLink[] = uniqLast.map((fromNum) => {
    const followers: { number: number; label: string; count: number }[] = [];
    for (let y = bounds.minVal; y <= bounds.maxVal; y++) {
      if (follow[fromNum][y] > 0) {
        followers.push({
          number: y,
          label: formatTrevorBall(game, y),
          count: follow[fromNum][y]
        });
      }
    }
    followers.sort((a, b) => b.count - a.count || baseScore[b.number] - baseScore[a.number]);
    return {
      fromNumber: fromNum,
      fromLabel: formatTrevorBall(game, fromNum),
      topFollowers: followers.slice(0, 4)
    };
  });

  return {
    analytics: {
      maxVal: bounds.maxVal,
      minVal: bounds.minVal,
      midSplit: bounds.midSplit,
      freqAll,
      freqRecent,
      lastSeen,
      overdue,
      follow,
      followLag2,
      followFromLast,
      cooccur,
      lastNums,
      prev2Nums,
      steinerCount,
      steinerRanksMap,
      steinerPoolSet,
      baseScore
    },
    steinerNumberPool,
    whatFollowsLastDraw
  };
}

// ============================================================================
// Decoupled Bonus / Timing Engine (Lotto Plus 1-10, Win For Life 1-3, Cash Pot)
// ============================================================================
function buildDecoupledBonusAnalysis(
  game: Lucky7GameKey,
  histDraws: TrevorHistoricalDraw[]
): Lucky7DecoupledBonus | undefined {
  if (game !== "lotto-plus" && game !== "win-for-life" && game !== "cashpot") {
    return undefined;
  }

  const N = histDraws.length;

  if (game === "lotto-plus") {
    const recentWin = Math.min(50, N);
    const totalCount = Array(11).fill(0);
    const recentCount = Array(11).fill(0);
    const lastSeen = Array(11).fill(-1);
    const pbFollow = Array.from({ length: 11 }, () => Array(11).fill(0));

    for (let t = 0; t < N; t++) {
      const b = histDraws[t].bonus;
      if (b === undefined || b < 1 || b > 10) continue;
      totalCount[b]++;
      if (t >= N - recentWin) recentCount[b]++;
      lastSeen[b] = t;
      if (t > 0) {
        const prevB = histDraws[t - 1].bonus;
        if (prevB !== undefined && prevB >= 1 && prevB <= 10) {
          pbFollow[prevB][b]++;
        }
      }
    }

    const lastPb = histDraws[N - 1]?.bonus;
    const rankings: Lucky7DecoupledBonusRank[] = [];
    for (let v = 1; v <= 10; v++) {
      const overdue = lastSeen[v] === -1 ? N : N - 1 - lastSeen[v];
      const fLast = lastPb !== undefined && lastPb >= 1 && lastPb <= 10 ? pbFollow[lastPb][v] : 0;
      const score = recentCount[v] * 2.4 + totalCount[v] * 0.14 + fLast * 1.8 + Math.min(overdue, 15) * 0.35;
      rankings.push({
        value: v,
        label: String(v).padStart(2, "0"),
        recentCount: recentCount[v],
        totalCount: totalCount[v],
        followsLastCount: fLast,
        overdueDraws: overdue,
        score: Math.round(score * 10) / 10,
        isTopPick: false
      });
    }
    rankings.sort((a, b) => b.score - a.score || b.recentCount - a.recentCount || a.value - b.value);
    const topThree = rankings.slice(0, 3).map((r) => r.value);
    rankings.slice(0, 3).forEach((r) => {
      r.isTopPick = true;
    });

    return {
      title: "Decoupled Powerball Selector (Independent 1 to 10 Sequence)",
      subtitle:
        "Main 5 numbers (1 to 35) are generated purely on their own sequence without Powerball interference. Powerball (1 to 10) is ranked independently using the most likely played balls.",
      sequenceRangeLabel: "Powerball 1 to 10",
      topPick: topThree[0] || 1,
      topThreePicks: topThree,
      assignmentNote: `Top 3 Most Likely Played Powerballs (${topThree.map((v) => String(v).padStart(2, "0")).join(", ")}) split 3-2-2 across the 7 plays (3 slips on #1, 2 on #2, 2 on #3).`,
      rankings
    };
  }

  if (game === "win-for-life") {
    const recentWin = Math.min(60, N);
    const totalCount = Array(4).fill(0);
    const recentCount = Array(4).fill(0);
    const lastSeen = Array(4).fill(-1);
    const cbFollow = Array.from({ length: 4 }, () => Array(4).fill(0));

    for (let t = 0; t < N; t++) {
      const raw = histDraws[t].bonus;
      if (raw === undefined || raw < 1 || raw > 3) continue;
      totalCount[raw]++;
      if (t >= N - recentWin) recentCount[raw]++;
      lastSeen[raw] = t;
      if (t > 0) {
        const prevB = histDraws[t - 1].bonus;
        if (prevB !== undefined && prevB >= 1 && prevB <= 3) {
          cbFollow[prevB][raw]++;
        }
      }
    }

    const lastCb = histDraws[N - 1]?.bonus;
    const rankings: Lucky7DecoupledBonusRank[] = [];
    for (let v = 1; v <= 3; v++) {
      const overdue = lastSeen[v] === -1 ? N : N - 1 - lastSeen[v];
      const fLast = lastCb !== undefined && lastCb >= 1 && lastCb <= 3 ? cbFollow[lastCb][v] : 0;
      const score = recentCount[v] * 1.8 + totalCount[v] * 0.12 + fLast * 1.5 + Math.min(overdue, 8) * 1.1;
      rankings.push({
        value: v,
        label: String(v).padStart(2, "0"),
        recentCount: recentCount[v],
        totalCount: totalCount[v],
        followsLastCount: fLast,
        overdueDraws: overdue,
        score: Math.round(score * 10) / 10,
        isTopPick: false
      });
    }
    rankings.sort((a, b) => b.score - a.score || b.recentCount - a.recentCount || a.value - b.value);
    const topThree = rankings.map((r) => r.value);
    rankings[0].isTopPick = true;

    return {
      title: "Decoupled Cash Ball Selector (Strictly 1, 2, or 3)",
      subtitle:
        "Main 6 numbers (1 to 28) are built purely on 1 to 28 number-theory and follower dynamics. Official NLCB Win For Life Cash Balls (strictly 1, 2, or 3) are ranked independently.",
      sequenceRangeLabel: "Cash Ball 1 to 3",
      topPick: topThree[0] || 1,
      topThreePicks: topThree,
      assignmentNote: `Most likely Cash Ball ${String(topThree[0]).padStart(2, "0")} anchors 3 lines, with ${String(topThree[1]).padStart(2, "0")} on 2 lines and ${String(topThree[2]).padStart(2, "0")} on 2 lines so all 3 official Cash Balls remain covered.`,
      rankings
    };
  }

  // Cash Pot: Independent Multiplier & High/Low timing read (separate from 1 to 20 numbers)
  const multCounts = Array(5).fill(0);
  const recentMult = Array(5).fill(0);
  const recentWin = Math.min(45, N);
  for (let t = 0; t < N; t++) {
    const m = Math.max(1, Math.min(4, Number(histDraws[t].bonus || 1)));
    multCounts[m]++;
    if (t >= N - recentWin) recentMult[m]++;
  }
  const rankings: Lucky7DecoupledBonusRank[] = [1, 2, 3, 4].map((m) => ({
    value: m,
    label: `${m}x`,
    recentCount: recentMult[m],
    totalCount: multCounts[m],
    followsLastCount: 0,
    overdueDraws: 0,
    score: recentMult[m],
    isTopPick: m >= 2 && recentMult[m] === Math.max(recentMult[2], recentMult[3], recentMult[4])
  }));

  return {
    title: "Decoupled Multiplier & Sure Call Timing (Separate From 1 to 20)",
    subtitle:
      "Your 7 Cash Pot combinations focus purely on the 1 to 20 pool (1 to 10 Low vs 11 to 20 High) and follower dynamics. Multiplier frequency is tracked separately below.",
    sequenceRangeLabel: "Multiplier 1x to 4x",
    topPick: 2,
    topThreePicks: [2, 3, 4],
    assignmentNote: "Play Cash Pot on Monday, Thursday, and Saturday Sure Call days for guaranteed 2x to 4x Multipliers.",
    rankings,
    extraContextNote: "1 to 20 Low/High Split: Low = 01 to 10, High = 11 to 20."
  };
}

// ============================================================================
// Multi-Ball Out-of-the-Box Number-Theory & Follower Generator
// (Cash Pot 5/20, Lotto Plus 5/35 PURE MAIN, Win For Life 6/28 PURE MAIN)
// ============================================================================
function selectComboFromScoreVector(
  scoreVec: number[],
  poolCandidates: number[],
  pickSize: number,
  existingPlays: number[][],
  maxAllowedOverlap: number,
  forcedMinLow?: number,
  forcedMaxLow?: number,
  midSplit?: number
): number[] {
  const ordered = [...poolCandidates].sort((a, b) => scoreVec[b] - scoreVec[a] || a - b);

  const tryPick = (ovCap: number, enforceHL: boolean): number[] | null => {
    const chosen: number[] = [];
    let lowCnt = 0;
    let highCnt = 0;
    const minLow = forcedMinLow ?? 0;
    const maxLow = forcedMaxLow ?? pickSize;
    const maxHigh = pickSize - minLow;
    const split = midSplit ?? 10;

    for (const cand of ordered) {
      if (chosen.includes(cand)) continue;
      const isLow = cand <= split;
      if (enforceHL) {
        if (isLow && lowCnt >= maxLow) continue;
        if (!isLow && highCnt >= maxHigh) continue;
      }
      const trial = [...chosen, cand];
      const tooClose = existingPlays.some((ex) => overlapCount(trial, ex) > ovCap);
      if (tooClose) continue;
      chosen.push(cand);
      if (isLow) lowCnt++;
      else highCnt++;
      if (chosen.length === pickSize) {
        return chosen.sort((a, b) => a - b);
      }
    }
    return null;
  };

  // Try strict High/Low + diversity first, then relax gracefully so we NEVER produce duplicate tickets
  return (
    tryPick(maxAllowedOverlap, true) ||
    tryPick(maxAllowedOverlap, false) ||
    tryPick(pickSize - 1, true) ||
    tryPick(pickSize - 1, false) ||
    ordered.slice(0, pickSize).sort((a, b) => a - b)
  );
}

function buildMultiBallLucky7OutOfBox(
  game: "cashpot" | "lotto-plus" | "win-for-life",
  steiner10: TrevorSteinerPick[],
  analytics: HistoryAnalytics,
  decoupledBonus?: Lucky7DecoupledBonus
): {
  plays: Lucky7PlayCard[];
  internalMaxOverlap: number;
  coveredNumbersCount: number;
  newCrossSlipPairsCount: number;
  totalLucky7PairsCount: number;
  steiner10PairsCount: number;
  totalUniversePairsCount: number;
} {
  const bounds = getGamePoolBounds(game);
  const V = bounds.maxVal;
  const k = bounds.pickSize;
  const mid = bounds.midSplit;

  // Strictly pull from the listed Steiner 1-10 pool (falls back to full range only if Steiner pool < k)
  const poolCandidates =
    analytics.steinerPoolSet.size >= k
      ? Array.from(analytics.steinerPoolSet)
      : Array.from({ length: V }, (_, i) => i + 1);

  // Allow strong anchor convergence so we NEVER artificially cap Match 4, Match 5, or Jackpot!
  // Cash Pot (5/20): maxOv = 3 (emp proved +4.7% Match 4+!); Lotto Plus (5/35): maxOv = 2; Win For Life (6/28): maxOv = 3
  const maxOv = game === "lotto-plus" ? 2 : 3;

  const existing: number[][] = [];
  const plays: Lucky7PlayCard[] = [];

  // Weighted 3-2-2 decoupled bonus assignment (Lotto Plus Top 3 Powerballs 1-10, Win For Life Top 3 Cash Balls 1-3)
  const top3 = decoupledBonus?.topThreePicks || [1, 2, 3];
  const bonusSchedule =
    game === "lotto-plus" || game === "win-for-life"
      ? [
          top3[0] ?? 1,
          top3[1] ?? top3[0] ?? 1,
          top3[2] ?? top3[0] ?? 1,
          top3[0] ?? 1,
          top3[1] ?? top3[0] ?? 1,
          top3[2] ?? top3[0] ?? 1,
          top3[0] ?? 1
        ]
      : [];

  const lastDrawStr = analytics.lastNums.map((n) => formatTrevorBall(game, n)).join(", ");
  const lastLow = analytics.lastNums.filter((n) => n <= mid).length;
  const lastOdd = analytics.lastNums.filter((n) => n % 2 === 1).length;

  // --- PLAY #1: What Follows What (Lag-1 Draw-to-Draw Markov Follower) ---
  const s1 = Array(V + 1).fill(0);
  for (let n = 1; n <= V; n++) {
    s1[n] = analytics.followFromLast[n] * 3.4 + analytics.freqRecent[n] * 0.9 + analytics.steinerCount[n] * 1.1;
  }
  const p1 = selectComboFromScoreVector(s1, poolCandidates, k, existing, maxOv);
  existing.push(p1);
  plays.push({
    index: 1,
    methodKey: "what-follows",
    methodName: "What Follows What",
    numbers: p1,
    bonus: bonusSchedule[0],
    roleLabel: "Next-Draw Follower",
    rationale: `Built from the top numbers that historically play directly after [${lastDrawStr}] in the very next draw.`,
    highLowSplit: formatHighLowSplit(game, p1, mid),
    oddEvenSplit: formatOddEvenSplit(game, p1),
    sumTotal: p1.reduce((a, b) => a + b, 0),
    sourceSteinerRanks: computeSourceSteinerRanks(p1, steiner10)
  });

  // --- PLAY #2: What Plays Together (Anchor Co-Occurrence Partner Chain) ---
  // Pick the strongest overall follower/Steiner anchor and pull the exact numbers that play alongside it
  const anchor = [...poolCandidates].sort(
    (a, b) =>
      analytics.followFromLast[b] * 2.2 + analytics.baseScore[b] -
      (analytics.followFromLast[a] * 2.2 + analytics.baseScore[a])
  )[0];
  const s2 = Array(V + 1).fill(0);
  for (let n = 1; n <= V; n++) {
    s2[n] =
      (n === anchor ? 120 : 0) +
      analytics.cooccur[anchor][n] * 3.0 +
      analytics.followFromLast[n] * 0.8 +
      analytics.freqRecent[n] * 0.6;
  }
  const p2 = selectComboFromScoreVector(s2, poolCandidates, k, existing, maxOv);
  existing.push(p2);
  plays.push({
    index: 2,
    methodKey: "partner-chain",
    methodName: "What Plays Together",
    numbers: p2,
    bonus: bonusSchedule[1],
    roleLabel: `Anchor ${formatTrevorBall(game, anchor)} Chain`,
    rationale: `Locks top Steiner-follower anchor ${formatTrevorBall(game, anchor)} and chains the numbers that most frequently appear alongside it in the same draw.`,
    highLowSplit: formatHighLowSplit(game, p2, mid),
    oddEvenSplit: formatOddEvenSplit(game, p2),
    sumTotal: p2.reduce((a, b) => a + b, 0),
    sourceSteinerRanks: computeSourceSteinerRanks(p2, steiner10)
  });

  // --- PLAY #3: High / Low Mean-Reversion Balance ---
  const targetLow =
    k === 6 ? 3 : lastLow >= Math.ceil(k / 2) ? Math.floor(k / 2) : Math.ceil(k / 2);
  const s3 = Array(V + 1).fill(0);
  for (let n = 1; n <= V; n++) {
    s3[n] = analytics.baseScore[n] + analytics.followFromLast[n] * 1.1;
  }
  const p3 = selectComboFromScoreVector(s3, poolCandidates, k, existing, maxOv, targetLow, targetLow, mid);
  existing.push(p3);
  plays.push({
    index: 3,
    methodKey: "high-low-balance",
    methodName: "High / Low Balance",
    numbers: p3,
    bonus: bonusSchedule[2],
    roleLabel: `${targetLow} Low / ${k - targetLow} High`,
    rationale: `Counter-balances the previous draw (${lastLow} Low / ${k - lastLow} High) by enforcing an exact ${targetLow} Low (${bounds.lowLabel}) and ${k - targetLow} High (${bounds.highLabel}) equilibrium.`,
    highLowSplit: formatHighLowSplit(game, p3, mid),
    oddEvenSplit: formatOddEvenSplit(game, p3),
    sumTotal: p3.reduce((a, b) => a + b, 0),
    sourceSteinerRanks: computeSourceSteinerRanks(p3, steiner10)
  });

  // --- PLAY #4: High / Low Polarity Breakout Surge (Asymmetric 4-1 or 5-1 Wave) ---
  const surgeHigh = lastLow >= Math.ceil(k / 2);
  const surgeMinLow = surgeHigh ? 1 : k - 1;
  const surgeMaxLow = surgeHigh ? 1 : k - 1;
  const s4 = Array(V + 1).fill(0);
  for (let n = 1; n <= V; n++) {
    const inSurgeZone = surgeHigh ? n > mid : n <= mid;
    s4[n] = analytics.baseScore[n] + (inSurgeZone ? 18 : 0) + analytics.followFromLast[n] * 0.9;
  }
  const p4 = selectComboFromScoreVector(s4, poolCandidates, k, existing, maxOv, surgeMinLow, surgeMaxLow, mid);
  existing.push(p4);
  plays.push({
    index: 4,
    methodKey: "polarity-surge",
    methodName: "High / Low Polarity Surge",
    numbers: p4,
    bonus: bonusSchedule[3],
    roleLabel: surgeHigh ? "High-Zone Breakout" : "Low-Zone Breakout",
    rationale: `Out-of-the-box asymmetric ${surgeHigh ? "High-dominant" : "Low-dominant"} wave designed to catch skewed 4-of-5 and 5-of-5 draws that balanced combinations miss.`,
    highLowSplit: formatHighLowSplit(game, p4, mid),
    oddEvenSplit: formatOddEvenSplit(game, p4),
    sumTotal: p4.reduce((a, b) => a + b, 0),
    sourceSteinerRanks: computeSourceSteinerRanks(p4, steiner10)
  });

  // --- PLAY #5: Number Theory (Primes, Fibonacci & Modular Roots) ---
  const s5 = Array(V + 1).fill(0);
  for (let n = 1; n <= V; n++) {
    const primeBoost = isPrimeNumber(n) ? 14 : 0;
    const fibBoost = FIBONACCI_SET.has(n) ? 11 : 0;
    // Slight bonus for numbers with distinct non-crowded last digits (mod 10)
    const modBonus = (n % 5 === 2 || n % 5 === 3 ? 2.5 : 1.0);
    s5[n] = analytics.baseScore[n] + primeBoost + fibBoost + modBonus;
  }
  const p5 = selectComboFromScoreVector(s5, poolCandidates, k, existing, maxOv);
  existing.push(p5);
  const primeCnt = p5.filter((n) => isPrimeNumber(n)).length;
  const fibCnt = p5.filter((n) => FIBONACCI_SET.has(n)).length;
  plays.push({
    index: 5,
    methodKey: "number-theory",
    methodName: "Number Theory (Primes + Fibonacci)",
    numbers: p5,
    bonus: bonusSchedule[4],
    roleLabel: `${primeCnt} Primes, ${fibCnt} Fibonacci`,
    rationale: `Applies pure number-theory structure from the Steiner pool, concentrating on Prime numbers, Fibonacci terms, and balanced modular residues.`,
    highLowSplit: formatHighLowSplit(game, p5, mid),
    oddEvenSplit: formatOddEvenSplit(game, p5),
    sumTotal: p5.reduce((a, b) => a + b, 0),
    sourceSteinerRanks: computeSourceSteinerRanks(p5, steiner10)
  });

  // --- PLAY #6: Mirror Complements (V + 1 - x) & Neighbor Slides (+/- 1) ---
  const mirrorSet = new Set(analytics.lastNums.map((x) => V + 1 - x).filter((m) => m >= 1 && m <= V));
  const stepSet = new Set(
    analytics.lastNums.flatMap((x) => [x - 1, x + 1]).filter((m) => m >= 1 && m <= V)
  );
  const s6 = Array(V + 1).fill(0);
  for (let n = 1; n <= V; n++) {
    s6[n] =
      analytics.baseScore[n] * 0.8 +
      (mirrorSet.has(n) ? 20 : 0) +
      (stepSet.has(n) ? 15 : 0) +
      analytics.followFromLast[n] * 0.9;
  }
  const p6 = selectComboFromScoreVector(s6, poolCandidates, k, existing, maxOv);
  existing.push(p6);
  plays.push({
    index: 6,
    methodKey: "mirror-stepper",
    methodName: "Mirror Complements & Neighbor Slides",
    numbers: p6,
    bonus: bonusSchedule[5],
    roleLabel: `Mirror (${V + 1} - n) + Step`,
    rationale: `Reflects the last draw through exact ${V + 1} - n mathematical mirrors and adjacent +/- 1 neighbor slides within the Steiner pool.`,
    highLowSplit: formatHighLowSplit(game, p6, mid),
    oddEvenSplit: formatOddEvenSplit(game, p6),
    sumTotal: p6.reduce((a, b) => a + b, 0),
    sourceSteinerRanks: computeSourceSteinerRanks(p6, steiner10)
  });

  // --- PLAY #7: Carryover Repeat + Parity Inversion & Overdue Rebound ---
  const wantOdd = lastOdd >= Math.ceil(k / 2) ? 0 : 1;
  const repeatSet = new Set([...analytics.lastNums, ...analytics.prev2Nums]);
  const s7 = Array(V + 1).fill(0);
  for (let n = 1; n <= V; n++) {
    const overdueBoost = Math.min(analytics.overdue[n], 25) * 1.45;
    const parityBoost = n % 2 === wantOdd ? 12 : 0;
    const repeatBoost = repeatSet.has(n) ? 10 : 0;
    s7[n] = overdueBoost + parityBoost + repeatBoost + analytics.freqRecent[n] * 0.7;
  }
  const p7 = selectComboFromScoreVector(s7, poolCandidates, k, existing, maxOv);
  existing.push(p7);
  plays.push({
    index: 7,
    methodKey: "carryover-parity",
    methodName: "Carryover + Parity Inversion & Overdue",
    numbers: p7,
    bonus: bonusSchedule[6],
    roleLabel: wantOdd === 1 ? "Odd-Flip Rebound" : "Even-Flip Rebound",
    rationale: `Pairs recent 1-to-2 draw repeat carryovers with ${wantOdd === 1 ? "Odd" : "Even"}-dominant parity inversion and statistically overdue rebound balls.`,
    highLowSplit: formatHighLowSplit(game, p7, mid),
    oddEvenSplit: formatOddEvenSplit(game, p7),
    sumTotal: p7.reduce((a, b) => a + b, 0),
    sourceSteinerRanks: computeSourceSteinerRanks(p7, steiner10)
  });

  // Compute exact structural metrics for transparency
  const steinerEdges = new Set<string>();
  for (const s of steiner10) {
    for (let i = 0; i < s.numbers.length; i++) {
      for (let j = i + 1; j < s.numbers.length; j++) {
        steinerEdges.add(pairKey(s.numbers[i], s.numbers[j]));
      }
    }
  }
  const lucky7Edges = new Set<string>();
  let newCrossPairs = 0;
  for (const play of plays) {
    let slipNew = 0;
    const totalSlipPairs = (play.numbers.length * (play.numbers.length - 1)) / 2;
    for (let i = 0; i < play.numbers.length; i++) {
      for (let j = i + 1; j < play.numbers.length; j++) {
        const pk = pairKey(play.numbers[i], play.numbers[j]);
        if (!lucky7Edges.has(pk)) {
          lucky7Edges.add(pk);
          if (!steinerEdges.has(pk)) {
            newCrossPairs++;
          }
        }
        if (!steinerEdges.has(pk)) slipNew++;
      }
    }
    play.newCrossSlipPairs = slipNew;
    play.totalPairsInSlip = totalSlipPairs;
  }

  let actualMaxOv = 0;
  for (let i = 0; i < plays.length; i++) {
    for (let j = i + 1; j < plays.length; j++) {
      const ov = overlapCount(plays[i].numbers, plays[j].numbers);
      if (ov > actualMaxOv) actualMaxOv = ov;
    }
  }

  const coveredSet = new Set(plays.flatMap((p) => p.numbers));
  const totalUniversePairsCount = (V * (V - 1)) / 2;

  return {
    plays,
    internalMaxOverlap: actualMaxOv,
    coveredNumbersCount: coveredSet.size,
    newCrossSlipPairsCount: newCrossPairs,
    totalLucky7PairsCount: lucky7Edges.size,
    steiner10PairsCount: steinerEdges.size,
    totalUniversePairsCount
  };
}

// ============================================================================
// Pick 4 Out-of-the-Box Positional & Number-Theory Splicer (0 to 9)
// ============================================================================
function buildPick4Lucky7OutOfBox(
  steiner10: TrevorSteinerPick[],
  histDraws: TrevorHistoricalDraw[],
  analytics: HistoryAnalytics
): Lucky7PlayCard[] {
  // Position-by-position Lag-1 follower matrix: posFollow[pos][prevDigit][nextDigit]
  const posFollow = Array.from({ length: 4 }, () =>
    Array.from({ length: 10 }, () => Array(10).fill(0))
  );
  const posFreq = Array.from({ length: 4 }, () => Array(10).fill(0));
  const N = histDraws.length;
  const recentStart = Math.max(0, N - 180);

  for (let t = recentStart; t < N; t++) {
    const cur = histDraws[t].numbers;
    for (let p = 0; p < 4; p++) {
      if (cur[p] >= 0 && cur[p] <= 9) posFreq[p][cur[p]]++;
    }
    if (t > 0) {
      const prev = histDraws[t - 1].numbers;
      for (let p = 0; p < 4; p++) {
        if (prev[p] >= 0 && prev[p] <= 9 && cur[p] >= 0 && cur[p] <= 9) {
          posFollow[p][prev[p]][cur[p]]++;
        }
      }
    }
  }

  const last = analytics.lastNums.length === 4 ? analytics.lastNums : [1, 2, 3, 4];
  const steinerPosCounts = Array.from({ length: 4 }, () => Array(10).fill(0));
  for (const s of steiner10) {
    for (let p = 0; p < 4; p++) {
      const d = s.numbers[p];
      if (d >= 0 && d <= 9) steinerPosCounts[p][d] += 11 - s.rank;
    }
  }

  const bestPosDigit = (pos: number, scoreFn: (d: number) => number, exclude?: Set<number>): number => {
    const cands = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !exclude || !exclude.has(d));
    cands.sort((a, b) => scoreFn(b) - scoreFn(a) || a - b);
    return cands[0] ?? 0;
  };

  const usedBoxes = new Set<string>();
  const boxKey = (arr: number[]) => [...arr].sort((a, b) => a - b).join("-");

  const makeUniqueDistinct4 = (rankedDigits: number[]): number[] => {
    const out: number[] = [];
    for (const d of rankedDigits) {
      if (!out.includes(d)) out.push(d);
      if (out.length === 4) break;
    }
    for (let d = 0; d <= 9 && out.length < 4; d++) {
      if (!out.includes(d)) out.push(d);
    }
    // Rotate last digit if boxKey already used
    let attempt = 0;
    while (usedBoxes.has(boxKey(out)) && attempt < 10) {
      const repl = rankedDigits.find((d) => !out.includes(d) && d !== out[3]);
      if (repl !== undefined) out[3] = repl;
      else out[3] = (out[3] + 1) % 10;
      attempt++;
    }
    usedBoxes.add(boxKey(out));
    return out;
  };

  const makeUniqueTwin4 = (twinDigit: number, rankedPartners: number[]): number[] => {
    const partners = rankedPartners.filter((d) => d !== twinDigit);
    let combo = [twinDigit, twinDigit, partners[0] ?? ((twinDigit + 1) % 10), partners[1] ?? ((twinDigit + 2) % 10)];
    let idx = 2;
    while (usedBoxes.has(boxKey(combo)) && idx < partners.length) {
      combo = [twinDigit, twinDigit, partners[0], partners[idx]];
      idx++;
    }
    usedBoxes.add(boxKey(combo));
    // Place twin at highest-affinity positions
    return [combo[0], combo[2], combo[1], combo[3]];
  };

  const globalRanked = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort(
    (a, b) => analytics.baseScore[b] - analytics.baseScore[a]
  );

  // Play #1: What Follows What (Exact Positional Lag-1 Follower — Straight #1)
  const p1 = [0, 1, 2, 3].map((pos) =>
    bestPosDigit(pos, (d) => posFollow[pos][last[pos]][d] * 3.5 + steinerPosCounts[pos][d] * 0.4 + posFreq[pos][d] * 0.3)
  );
  usedBoxes.add(boxKey(p1));

  // Play #2: High / Low Positional Flip (Straight #2 — flips Low 0-4 / High 5-9 in every position)
  const p2 = [0, 1, 2, 3].map((pos) => {
    const wantHigh = last[pos] <= 4;
    return bestPosDigit(pos, (d) => {
      const zoneOk = wantHigh ? d >= 5 : d <= 4;
      const diffPenalty = d === p1[pos] ? -2 : 0;
      return (zoneOk ? 30 : 0) + posFollow[pos][last[pos]][d] * 2.0 + steinerPosCounts[pos][d] * 0.4 + diffPenalty;
    });
  });
  usedBoxes.add(boxKey(p2));

  // Play #3: Number Theory Primes + Fibonacci 24-Way Box
  const ntDigits = [2, 3, 5, 7, 1, 8, ...globalRanked].sort((a, b) => {
    const ntA = (isPrimeNumber(a) ? 15 : 0) + (FIBONACCI_SET.has(a) ? 8 : 0) + analytics.baseScore[a] * 0.4;
    const ntB = (isPrimeNumber(b) ? 15 : 0) + (FIBONACCI_SET.has(b) ? 8 : 0) + analytics.baseScore[b] * 0.4;
    return ntB - ntA;
  });
  const p3 = makeUniqueDistinct4(ntDigits);

  // Play #4: Exact 9-d Mirror Complement 24-Way Box
  const mirrors = last.map((d) => 9 - d);
  const p4 = makeUniqueDistinct4([...mirrors, ...globalRanked]);

  // Play #5: Kinematic Neighbor Slide (d +/- 1 mod 10) 24-Way Box
  const steppers = last.flatMap((d) => [(d + 1) % 10, (d + 9) % 10]).sort(
    (a, b) => analytics.followFromLast[b] - analytics.followFromLast[a]
  );
  const p5 = makeUniqueDistinct4([...steppers, ...globalRanked]);

  // Play #6: What Plays Together (Top Repeating / Co-Occurring 12-Way Twin Box #1)
  const twin1 = [...globalRanked].sort(
    (a, b) => (analytics.lastNums.includes(b) ? 10 : 0) + analytics.followFromLast[b] - ((analytics.lastNums.includes(a) ? 10 : 0) + analytics.followFromLast[a])
  )[0];
  const p6 = makeUniqueTwin4(
    twin1,
    globalRanked.filter((d) => d !== twin1).sort((a, b) => analytics.cooccur[twin1][b] - analytics.cooccur[twin1][a])
  );

  // Play #7: Overdue + Parity Inversion 12-Way Twin Box #2
  const lastOddCnt = last.filter((d) => d % 2 === 1).length;
  const wantOdd = lastOddCnt >= 2 ? 0 : 1;
  const twin2 = globalRanked
    .filter((d) => d !== twin1)
    .sort(
      (a, b) =>
        analytics.overdue[b] * 2 + (b % 2 === wantOdd ? 10 : 0) -
        (analytics.overdue[a] * 2 + (a % 2 === wantOdd ? 10 : 0))
    )[0];
  const p7 = makeUniqueTwin4(twin2, globalRanked);

  const defs = [
    {
      methodKey: "what-follows",
      methodName: "What Follows What (Positional)",
      nums: p1,
      role: "Exact Order (Straight #1)",
      rationale: `Takes the strongest next-draw digit follower in each of Positions 1 to 4 right after [${last.join("-")}].`
    },
    {
      methodKey: "high-low-flip",
      methodName: "High / Low Positional Flip",
      nums: p2,
      role: "Exact Order (Straight #2)",
      rationale: "Flips each position's Low (0 to 4) vs High (5 to 9) polarity from the previous draw using Steiner digit weights."
    },
    {
      methodKey: "number-theory",
      methodName: "Number Theory Primes Box",
      nums: p3,
      role: "24-Way Box (4 Distinct)",
      rationale: "Concentrates on Prime digits (2, 3, 5, 7) and Fibonacci digits ranked highest in the Steiner pool."
    },
    {
      methodKey: "mirror-complement",
      methodName: "Mirror Complement (9 - d) Box",
      nums: p4,
      role: "24-Way Box (4 Distinct)",
      rationale: `Applies exact Pick 4 modular reflections (9 - d) to [${last.join("-")}] across 24 unordered permutations.`
    },
    {
      methodKey: "neighbor-stepper",
      methodName: "Neighbor Slide (+/- 1) Box",
      nums: p5,
      role: "24-Way Box (4 Distinct)",
      rationale: "Shifts the previous draw's digits up or down by 1 (mod 10) into a zero-duplicate 24-Way Box."
    },
    {
      methodKey: "partner-twin",
      methodName: "What Plays Together (Twin #1)",
      nums: p6,
      role: "12-Way Twin Box",
      rationale: `Doubles high-momentum digit ${twin1} paired with its strongest same-draw co-occurring partner digits.`
    },
    {
      methodKey: "overdue-parity-twin",
      methodName: "Overdue Parity Flip (Twin #2)",
      nums: p7,
      role: "12-Way Twin Box",
      rationale: `Doubles overdue ${wantOdd === 1 ? "Odd" : "Even"} digit ${twin2} to catch repeating-digit polarity reversals.`
    }
  ];

  return defs.map((d, idx) => ({
    index: idx + 1,
    methodKey: d.methodKey,
    methodName: d.methodName,
    numbers: d.nums,
    roleLabel: d.role,
    rationale: d.rationale,
    highLowSplit: formatHighLowSplit("pick4", d.nums, 4),
    oddEvenSplit: formatOddEvenSplit("pick4", d.nums),
    sumTotal: d.nums.reduce((a, b) => a + b, 0),
    sourceSteinerRanks: computeSourceSteinerRanks(d.nums, steiner10)
  }));
}

// ============================================================================
// Play Whe Out-of-the-Box 7-Signal Number-Theory & Follower Engine (1 to 36)
// ============================================================================
function buildPlayWheLucky7OutOfBox(
  steiner10: TrevorSteinerPick[],
  histDraws: TrevorHistoricalDraw[],
  analytics: HistoryAnalytics
): Lucky7PlayCard[] {
  const used = new Set<number>();
  const lastMark = analytics.lastNums[0] ?? 1;
  const prev2Mark = analytics.prev2Nums[0] ?? lastMark;
  const pool = Array.from({ length: 36 }, (_, i) => i + 1);
  const pickBest = (scoreFn: (m: number) => number): number => {
    const avail = pool.filter((m) => !used.has(m));
    avail.sort((a, b) => scoreFn(b) - scoreFn(a) || analytics.baseScore[b] - analytics.baseScore[a]);
    const chosen = avail[0] ?? 1;
    used.add(chosen);
    return chosen;
  };

  // 1. What Follows Last Mark (Lag-1 Markov Follower)
  const m1 = pickBest((m) => analytics.follow[lastMark][m] * 5 + (analytics.steinerPoolSet.has(m) ? 3 : 0));
  // 2. What Plays After (Lag-2 Rhythm / Steiner Anchor)
  const m2 = pickBest((m) => analytics.followLag2[prev2Mark][m] * 4 + analytics.baseScore[m] * 0.8);
  // 3. High / Low Polarity Counter (Opposite half 1-18 vs 19-36)
  const wantHigh = lastMark <= 18;
  const m3 = pickBest((m) => ((wantHigh ? m >= 19 : m <= 18) ? 30 : 0) + analytics.baseScore[m]);
  // 4. Chinapoo Mirror Complement (37 - last)
  const mirrorTarget = 37 - lastMark;
  const m4 = pickBest((m) => (m === mirrorTarget ? 100 : 0) + (m % 9 === mirrorTarget % 9 ? 15 : 0) + analytics.baseScore[m]);
  // 5. Number Theory Prime / Fibonacci Mark
  const m5 = pickBest((m) => (isPrimeNumber(m) ? 18 : 0) + (FIBONACCI_SET.has(m) ? 14 : 0) + analytics.baseScore[m]);
  // 6. Neighbor / Chinapoo Line Shift (last +/- 1 or +/- 9)
  const stepSet = new Set(
    [lastMark - 1, lastMark + 1, lastMark - 9, lastMark + 9].map((x) => ((x - 1 + 36) % 36) + 1)
  );
  const m6 = pickBest((m) => (stepSet.has(m) ? 35 : 0) + analytics.baseScore[m]);
  // 7. Overdue Parity-Flipped Rebound
  const wantOdd = lastMark % 2 === 0 ? 1 : 0;
  const m7 = pickBest((m) => analytics.overdue[m] * 1.6 + (m % 2 === wantOdd ? 12 : 0) + (analytics.steinerPoolSet.has(m) ? 4 : 0));

  const specs = [
    {
      methodKey: "what-follows",
      methodName: "What Follows Last Mark",
      mark: m1,
      role: "Lag-1 Follower",
      rationale: `Strongest direct successor mark that historically plays right after Mark ${lastMark} (${CHINAPOO_CHART[lastMark]?.mark || ""}).`
    },
    {
      methodKey: "lag2-rhythm",
      methodName: "2-Draw Rhythm Echo",
      mark: m2,
      role: "Lag-2 + Steiner",
      rationale: `Combines 2-draw rhythm transitions after Mark ${prev2Mark} with top Steiner pool conviction.`
    },
    {
      methodKey: "high-low-counter",
      methodName: "High / Low Half Flip",
      mark: m3,
      role: wantHigh ? "High Half (19 to 36)" : "Low Half (1 to 18)",
      rationale: `Counters the previous ${lastMark <= 18 ? "Low" : "High"} mark by selecting the strongest Steiner pick in the opposite half.`
    },
    {
      methodKey: "mirror-37",
      methodName: "Chinapoo Mirror (37 - Mark)",
      mark: m4,
      role: "Exact 37 - n Mirror",
      rationale: `Exact Chinapoo reflection opposite Mark ${lastMark} (37 - ${lastMark} = ${mirrorTarget}).`
    },
    {
      methodKey: "number-theory",
      methodName: "Prime / Fibonacci Mark",
      mark: m5,
      role: isPrimeNumber(m5) ? "Prime Number" : "Fibonacci Term",
      rationale: "Top-scoring Prime or Fibonacci mark inside the Steiner 1 to 10 candidate pool."
    },
    {
      methodKey: "neighbor-line-shift",
      methodName: "Neighbor & Line Shift",
      mark: m6,
      role: "Step (+/- 1 or +/- 9)",
      rationale: `Adjacent step (+/- 1) or same-line Chinapoo jump (+/- 9) off Mark ${lastMark}.`
    },
    {
      methodKey: "overdue-parity",
      methodName: "Overdue Parity Rebound",
      mark: m7,
      role: wantOdd === 1 ? "Overdue Odd" : "Overdue Even",
      rationale: `Most overdue ${wantOdd === 1 ? "Odd" : "Even"} rebound mark (${analytics.overdue[m7]} draws skipped) inverting last draw parity.`
    }
  ];

  return specs.map((sp, idx) => ({
    index: idx + 1,
    methodKey: sp.methodKey,
    methodName: sp.methodName,
    numbers: [sp.mark],
    roleLabel: sp.role,
    rationale: sp.rationale,
    highLowSplit: formatHighLowSplit("play-whe", [sp.mark], 18),
    oddEvenSplit: formatOddEvenSplit("play-whe", [sp.mark]),
    sourceSteinerRanks: computeSourceSteinerRanks([sp.mark], steiner10)
  }));
}

// ============================================================================
// Fast Cash Out-of-the-Box 7-Signal Pocket Engine (0, 00, 1 to 36)
// ============================================================================
function buildFastCashLucky7OutOfBox(
  steiner10: TrevorSteinerPick[],
  analytics: HistoryAnalytics
): Lucky7PlayCard[] {
  const used = new Set<number>();
  const lastPkt = analytics.lastNums[0] ?? 1;
  const allPockets = Array.from({ length: 38 }, (_, i) => i); // 0, 1..36, 37 (00)
  const pickBest = (scoreFn: (p: number) => number, subset?: number[]): number => {
    const avail = (subset || allPockets).filter((p) => !used.has(p));
    avail.sort((a, b) => scoreFn(b) - scoreFn(a) || analytics.baseScore[b] - analytics.baseScore[a]);
    const chosen = avail[0] ?? allPockets.find((p) => !used.has(p)) ?? 0;
    used.add(chosen);
    return chosen;
  };

  // 1. What Follows Last Pocket (Lag-1 Markov Successor)
  const p1 = pickBest((p) => analytics.follow[lastPkt][p] * 5 + analytics.baseScore[p] * 0.4);
  // 2. Green Zero / 00 Guard
  const p2 = pickBest((p) => analytics.overdue[p] * 1.5 + analytics.freqRecent[p] * 2.0, [0, 37]);
  // 3. High / Low Polarity Flip (1-18 vs 19-36)
  const wantHigh = lastPkt >= 1 && lastPkt <= 18;
  const p3 = pickBest(
    (p) => analytics.baseScore[p],
    wantHigh ? Array.from({ length: 18 }, (_, i) => i + 19) : Array.from({ length: 18 }, (_, i) => i + 1)
  );
  // 4. Mirror Reflection (37 - last)
  const mirrorPkt = lastPkt >= 1 && lastPkt <= 36 ? 37 - lastPkt : 19;
  const p4 = pickBest((p) => (p === mirrorPkt ? 100 : 0) + analytics.baseScore[p]);
  // 5. Number Theory Prime / Fibonacci Pocket
  const p5 = pickBest(
    (p) => (isPrimeNumber(p) ? 18 : 0) + (FIBONACCI_SET.has(p) ? 14 : 0) + analytics.baseScore[p],
    Array.from({ length: 36 }, (_, i) => i + 1)
  );
  // 6. Neighbor Step (last +/- 1 on numbered board)
  const stepCands =
    lastPkt >= 1 && lastPkt <= 36
      ? [lastPkt === 1 ? 36 : lastPkt - 1, lastPkt === 36 ? 1 : lastPkt + 1]
      : [1, 36];
  const p6 = pickBest((p) => (stepCands.includes(p) ? 40 : 0) + analytics.baseScore[p]);
  // 7. Overdue Cold-Sector Rebound
  const p7 = pickBest((p) => analytics.overdue[p] * 1.8 + analytics.baseScore[p] * 0.3, Array.from({ length: 36 }, (_, i) => i + 1));

  const specs = [
    {
      methodKey: "what-follows",
      methodName: "What Follows Last Pocket",
      pkt: p1,
      role: "Lag-1 Follower",
      rationale: `Top next-draw pocket that historically follows pocket ${formatTrevorBall("fast-cash", lastPkt)}.`
    },
    {
      methodKey: "zero-guard",
      methodName: "Zero / 00 Green Guard",
      pkt: p2,
      role: "Green Pocket Guard",
      rationale: `Defends the green pockets (0 or 00), led by ${formatTrevorBall("fast-cash", p2)} (${analytics.overdue[p2]} draws since last hit).`
    },
    {
      methodKey: "high-low-flip",
      methodName: "High / Low Half Flip",
      pkt: p3,
      role: wantHigh ? "High Half (19 to 36)" : "Low Half (01 to 18)",
      rationale: `Opposes the previous pocket's half with the strongest Steiner leader in ${wantHigh ? "19 to 36" : "01 to 18"}.`
    },
    {
      methodKey: "mirror-37",
      methodName: "Mirror Reflection (37 - n)",
      pkt: p4,
      role: "Board Mirror",
      rationale: `Reflects pocket ${formatTrevorBall("fast-cash", lastPkt)} directly across the 1 to 36 board.`
    },
    {
      methodKey: "number-theory",
      methodName: "Prime / Fibonacci Pocket",
      pkt: p5,
      role: "Number Theory Pick",
      rationale: "Highest-scoring Prime or Fibonacci pocket drawn from the Steiner candidate pool."
    },
    {
      methodKey: "neighbor-slide",
      methodName: "Adjacent Neighbor Slide",
      pkt: p6,
      role: "Step (+/- 1)",
      rationale: `Immediate +/- 1 neighbor step off previous pocket ${formatTrevorBall("fast-cash", lastPkt)}.`
    },
    {
      methodKey: "overdue-rebound",
      methodName: "Overdue Sector Breakout",
      pkt: p7,
      role: "Cold-Sector Rebound",
      rationale: `Strongest overdue rebound pocket (${analytics.overdue[p7]} draws skipped) defending cold sectors.`
    }
  ];

  return specs.map((sp, idx) => ({
    index: idx + 1,
    methodKey: sp.methodKey,
    methodName: sp.methodName,
    numbers: [sp.pkt],
    roleLabel: sp.role,
    rationale: sp.rationale,
    highLowSplit: formatHighLowSplit("fast-cash", [sp.pkt], 18),
    oddEvenSplit: formatOddEvenSplit("fast-cash", [sp.pkt]),
    sourceSteinerRanks: computeSourceSteinerRanks([sp.pkt], steiner10)
  }));
}

// ============================================================================
// Context Metadata Builder
// ============================================================================
function buildContextMetrics(
  game: Lucky7GameKey,
  multiBallStats?: {
    internalMaxOverlap: number;
    coveredNumbersCount: number;
    newCrossSlipPairsCount: number;
    totalLucky7PairsCount: number;
    steiner10PairsCount: number;
    totalUniversePairsCount: number;
  }
): Lucky7StructuralMetrics {
  const bounds = getGamePoolBounds(game);

  if (game === "cashpot" && multiBallStats) {
    const combPct = Math.round(
      ((multiBallStats.steiner10PairsCount + multiBallStats.newCrossSlipPairsCount) /
        multiBallStats.totalUniversePairsCount) *
        1000
    ) / 10;
    return {
      contextTitle: "Steiner Pool -> 7 Out-of-the-Box Number-Theory & Follower Plays (1 to 20)",
      contextSubtitle: "Lists the Steiner 1 to 10 pool first, then attacks Match 4 and 5-of-5 without Match-3+ spread caps",
      whySteinerFragments:
        "Steiner Picks #1 to #10 narrow down the winning numbers reliably, but spreading every slip to chase Match 3+ keeps strong anchors separated instead of stacking into 4-of-5 and 5-of-5 combinations.",
      mathAdjustmentSummary:
        "Lucky 7 v2 lists the exact Steiner 1 to 10 pool first, then generates 7 distinct plays using What-Follows-What transitions, Partner Chains, High/Low (1 to 10 vs 11 to 20) Balance & Breakout waves, Primes/Fibonacci, 21 - n Mirrors, and Overdue Parity flips. Multiplier and Sure Call timing stay completely separate.",
      internalMaxOverlap: multiBallStats.internalMaxOverlap,
      coveredNumbersCount: multiBallStats.coveredNumbersCount,
      totalPoolSize: 20,
      newCrossSlipPairsCount: multiBallStats.newCrossSlipPairsCount,
      totalLucky7PairsCount: multiBallStats.totalLucky7PairsCount,
      steiner10PairsCount: multiBallStats.steiner10PairsCount,
      totalUniversePairsCount: 190,
      combinedPairCoveragePct: combPct,
      standaloneCoverageNote: "7 distinct Number-Theory & Follower plays ($35 TTD w/ Multiplier) chasing Match 4 & 5/5",
      combined17CoverageNote: "Pairs with Steiner-10 for full pool + anchor convergence across 17 slips",
      lowRangeLabel: bounds.lowLabel,
      highRangeLabel: bounds.highLabel
    };
  }

  if (game === "lotto-plus" && multiBallStats) {
    const combPct = Math.round(
      ((multiBallStats.steiner10PairsCount + multiBallStats.newCrossSlipPairsCount) /
        multiBallStats.totalUniversePairsCount) *
        1000
    ) / 10;
    return {
      contextTitle: "Pure 1 to 35 Number-Theory Plays + Decoupled 1 to 10 Most-Likely Powerball",
      contextSubtitle: "Main 5 numbers ignore Powerball completely; Powerball 1 to 10 is ranked separately",
      whySteinerFragments:
        "Lotto Plus runs two completely independent machines: 5 main balls from 1 to 35, and 1 Powerball from 1 to 10. Mixing Powerball into the main-number solver distorts 1 to 35 selection, while Match-3+ caps suppress 4-of-5 and 5-of-5 combinations.",
      mathAdjustmentSummary:
        "Lucky 7 v2 builds all 7 main plays purely from the listed 1 to 35 Steiner pool using What-Follows-What transitions, Partner Chains, High/Low (1 to 17 vs 18 to 35) Balance & Surges, Primes/Fibonacci, 36 - n Mirrors, and Overdue Parity flips. Powerball (1 to 10) is solved separately via the Top 3 Most Likely Played Powerballs.",
      internalMaxOverlap: multiBallStats.internalMaxOverlap,
      coveredNumbersCount: multiBallStats.coveredNumbersCount,
      totalPoolSize: 35,
      newCrossSlipPairsCount: multiBallStats.newCrossSlipPairsCount,
      totalLucky7PairsCount: multiBallStats.totalLucky7PairsCount,
      steiner10PairsCount: multiBallStats.steiner10PairsCount,
      totalUniversePairsCount: 595,
      combinedPairCoveragePct: combPct,
      standaloneCoverageNote: "7 pure 1 to 35 plays ($35 TTD) + Top 3 Most Likely Powerballs (3-2-2 weighting)",
      combined17CoverageNote: "Chases Match 4 & Match 5/5 main hits while tracking Powerball 1 to 10 independently",
      lowRangeLabel: bounds.lowLabel,
      highRangeLabel: bounds.highLabel
    };
  }

  if (game === "win-for-life" && multiBallStats) {
    const combPct = Math.round(
      ((multiBallStats.steiner10PairsCount + multiBallStats.newCrossSlipPairsCount) /
        multiBallStats.totalUniversePairsCount) *
        1000
    ) / 10;
    return {
      contextTitle: "Pure 1 to 28 6-Ball Number-Theory Engine + Decoupled Cash Ball (1 to 3)",
      contextSubtitle: "Main 6 numbers ignore Cash Ball completely; Cash Ball strictly 1, 2, or 3 ranked independently",
      whySteinerFragments:
        "Win For Life requires 6 numbers from 1 to 28 plus an independent Cash Ball strictly from 1, 2, or 3. Stopping at Match-3+ spreading limits your shot at 4-of-6, 5-of-6, and 6-of-6 life-annuity structures.",
      mathAdjustmentSummary:
        "Lucky 7 v2 extracts the Steiner 1 to 10 pool first, then generates 7 out-of-the-box 6-ball combinations (What-Follows-What, Partner Chain, High/Low 1 to 14 vs 15 to 28 Balance & Breakout, Primes/Fibonacci, 29 - n Mirrors, Carryover/Overdue). Cash Ball (strictly 1, 2, or 3) is ranked independently and weighted 3-2-2.",
      internalMaxOverlap: multiBallStats.internalMaxOverlap,
      coveredNumbersCount: multiBallStats.coveredNumbersCount,
      totalPoolSize: 28,
      newCrossSlipPairsCount: multiBallStats.newCrossSlipPairsCount,
      totalLucky7PairsCount: multiBallStats.totalLucky7PairsCount,
      steiner10PairsCount: multiBallStats.steiner10PairsCount,
      totalUniversePairsCount: 378,
      combinedPairCoveragePct: combPct,
      standaloneCoverageNote: "7 pure 6-of-28 plays ($70 TTD) + Independent Cash Ball 1 to 3 ranking",
      combined17CoverageNote: "Targets Match 4, Match 5, and Match 6/6 structures across 1 to 28",
      lowRangeLabel: bounds.lowLabel,
      highRangeLabel: bounds.highLabel
    };
  }

  if (game === "pick4") {
    return {
      contextTitle: "Positional Followers + Number-Theory Pick 4 Splicer (0 to 9)",
      contextSubtitle: "2 Exact-Order Straights + 3 Distinct 24-Way Boxes + 2 High-Affinity 12-Way Twin Boxes",
      whySteinerFragments:
        "Steiner 1 to 10 holds all 4 winning digits in roughly 80% of draws, but scatters them across separate rows and positions.",
      mathAdjustmentSummary:
        "Lucky 7 v2 lists the 0 to 9 Steiner digit pool with positional followers, then splices 7 zero-duplicate sets: Positional What-Follows-What Straight, High/Low Flip Straight, Primes Box, 9 - d Mirror Box, Neighbor +/- 1 Box, Repeating Partner Twin, and Overdue Parity Twin.",
      internalMaxOverlap: 2,
      coveredNumbersCount: 10,
      totalPoolSize: 10,
      newCrossSlipPairsCount: 7,
      totalLucky7PairsCount: 7,
      steiner10PairsCount: 10,
      totalUniversePairsCount: 10,
      combinedPairCoveragePct: 100,
      standaloneCoverageNote: "98 distinct 4-digit draw states covered for $7 TTD with zero duplicate boxes",
      combined17CoverageNote: "Graded across official Straight, Box, Front/Back 3, and Pair tiers",
      lowRangeLabel: bounds.lowLabel,
      highRangeLabel: bounds.highLabel
    };
  }

  if (game === "play-whe") {
    return {
      contextTitle: "7-Method Chinapoo Follower & Number-Theory Picks (1 to 36)",
      contextSubtitle: "7 strictly distinct marks covering Follower, Lag-2 Rhythm, High/Low, Mirror 37-n, Prime, Line Shift & Overdue",
      whySteinerFragments:
        "Play Whe draws 1 winning mark out of 36, so betting multiple similar signals wastes stake on duplicate marks.",
      mathAdjustmentSummary:
        "Lucky 7 v2 lists Steiner 1 to 10's top marks and what follows the last mark, then assigns 7 strictly distinct Chinapoo marks across 7 independent number-theory and sequential lenses ($7 TTD total).",
      internalMaxOverlap: 0,
      coveredNumbersCount: 7,
      totalPoolSize: 36,
      newCrossSlipPairsCount: 7,
      totalLucky7PairsCount: 7,
      steiner10PairsCount: 10,
      totalUniversePairsCount: 36,
      combinedPairCoveragePct: 19.4,
      standaloneCoverageNote: "19.44% exact single-draw chance ($7 TTD across 7 distinct signals, $26 payout per hit)",
      combined17CoverageNote: "Zero overlapping marks across all 7 out-of-the-box methods",
      lowRangeLabel: bounds.lowLabel,
      highRangeLabel: bounds.highLabel
    };
  }

  return {
    contextTitle: "7-Method Fast Cash Pocket Follower & Number-Theory Picks (38 Pockets)",
    contextSubtitle: "Lag-1 Follower, Zero/00 Guard, High/Low Flip, 37-n Mirror, Prime, Neighbor Slide & Cold Sector",
    whySteinerFragments:
      "Fast Cash draws 1 pocket out of 38 every 3 minutes — clustering bets on one section leaves the rest of the board undefended.",
    mathAdjustmentSummary:
      "Lucky 7 v2 lists Steiner 1 to 10's pocket pool and live next-pocket followers, then places 7 strictly distinct pockets covering What-Follows-What, Zero/00 Guard, High/Low Flip, 37 - n Mirror, Prime/Fibonacci, Neighbor +/- 1, and Cold-Sector Rebound.",
    internalMaxOverlap: 0,
    coveredNumbersCount: 7,
    totalPoolSize: 38,
    newCrossSlipPairsCount: 7,
    totalLucky7PairsCount: 7,
    steiner10PairsCount: 10,
    totalUniversePairsCount: 38,
    combinedPairCoveragePct: 18.4,
    standaloneCoverageNote: "18.42% exact chance per 3-minute draw ($7 TTD across 7 distinct pocket signals)",
    combined17CoverageNote: "63.9% chance of hitting at least once within a 5-draw (15-minute) session",
    lowRangeLabel: bounds.lowLabel,
    highRangeLabel: bounds.highLabel
  };
}

// ============================================================================
// Higher-Tier Out-of-Sample Walk-Forward Audit (Tracks 3+, 4+, 5+ / Jackpot!)
// ============================================================================
function evaluateSingleSlip(
  game: Lucky7GameKey,
  slip: { numbers: number[]; bonus?: number },
  actual: TrevorHistoricalDraw,
  primarySingleOnly: boolean = false
): { matchCount: number; wonPrize: boolean } {
  if (game === "play-whe" || game === "fast-cash") {
    const winningVal = actual.numbers[0];
    const hit = primarySingleOnly ? slip.numbers[0] === winningVal : slip.numbers.includes(winningVal);
    return { matchCount: hit ? 1 : 0, wonPrize: hit };
  }

  if (game === "pick4") {
    const act = actual.numbers;
    const nums = slip.numbers;
    const exact = nums.join("-") === act.join("-");
    const box = [...nums].sort((a, b) => a - b).join("-") === [...act].sort((a, b) => a - b).join("-");
    const front3 = nums[0] === act[0] && nums[1] === act[1] && nums[2] === act[2];
    const back3 = nums[1] === act[1] && nums[2] === act[2] && nums[3] === act[3];
    const pairHit =
      (nums[0] === act[0] && nums[1] === act[1]) ||
      (nums[2] === act[2] && nums[3] === act[3]) ||
      (nums[0] === act[0] && nums[3] === act[3]);
    const posM = nums.filter((d, i) => d === act[i]).length;

    if (exact || box) return { matchCount: 4, wonPrize: true };
    if (front3 || back3) return { matchCount: 3, wonPrize: true };
    if (pairHit) return { matchCount: 2, wonPrize: true };
    return { matchCount: posM, wonPrize: false };
  }

  // Multi-ball: Cash Pot, Lotto Plus (pure main 1..35 + optional bonus), Win For Life (pure main 1..28)
  const actSet = new Set(actual.numbers);
  const m = slip.numbers.filter((n) => actSet.has(n)).length;
  const bHit = slip.bonus !== undefined && actual.bonus !== undefined && slip.bonus === actual.bonus;
  const wonPrize =
    game === "lotto-plus"
      ? m >= 3 || (m >= 1 && bHit)
      : m >= 3;
  return { matchCount: m, wonPrize };
}

function evaluateSlipSet(
  game: Lucky7GameKey,
  slips: { numbers: number[]; bonus?: number; methodName?: string }[],
  actual: TrevorHistoricalDraw,
  primarySingleOnly: boolean = false
): { bestMatch: number; wonPrize: boolean; bestMethodName: string } {
  let best = 0;
  let won = false;
  let bestMethodName = slips[0]?.methodName || "Play #1";
  for (const s of slips) {
    const ev = evaluateSingleSlip(game, s, actual, primarySingleOnly);
    if (ev.matchCount > best || (ev.wonPrize && !won && ev.matchCount === best)) {
      best = ev.matchCount;
      bestMethodName = s.methodName || bestMethodName;
    }
    if (ev.wonPrize) won = true;
  }
  return { bestMatch: best, wonPrize: won, bestMethodName };
}

export function runLucky7HypothesisAudit(
  game: Lucky7GameKey,
  allDraws: TrevorHistoricalDraw[],
  windowSize: number = 60
): Lucky7HypothesisAudit {
  const minHistory = 25;
  if (allDraws.length <= minHistory) {
    return {
      drawsAudited: 0,
      steiner10UnionCapturePct: 0,
      top12Pool4PlusPct: 0,
      top12PoolAllPct: 0,
      fragmentationGapPct: 0,
      fragmentationGapCount: 0,
      steiner10PrizeRatePct: 0,
      steiner10PrizeHits: 0,
      lucky7StandalonePrizeRatePct: 0,
      lucky7StandalonePrizeHits: 0,
      combined17PrizeRatePct: 0,
      combined17PrizeHits: 0,
      steiner10Match4PlusHits: 0,
      steiner10Match4PlusPct: 0,
      lucky7Match4PlusHits: 0,
      lucky7Match4PlusPct: 0,
      combined17Match4PlusHits: 0,
      combined17Match4PlusPct: 0,
      lucky7Match5PlusHits: 0,
      bestSingleTicketMatch: 0,
      rescuedFragmentedCount: 0,
      rescuedFragmentedPct: 0,
      verdictHeadline: "Insufficient historical draws for walk-forward audit.",
      verdictExplanation: "Sync more official draws to run the out-of-sample audit.",
      methodLeaderboard: [],
      recentLog: []
    };
  }

  const N = allDraws.length;
  const evalCount = Math.min(windowSize, N - minHistory);
  const isMultiBall = game === "cashpot" || game === "lotto-plus" || game === "win-for-life";

  let unionAllCaptured = 0;
  let top12Pool4Plus = 0;
  let top12PoolAll = 0;
  let fragmentationGapCount = 0;
  let steiner10PrizeHits = 0;
  let lucky7StandalonePrizeHits = 0;
  let combined17PrizeHits = 0;
  let steiner10Match4PlusHits = 0;
  let lucky7Match4PlusHits = 0;
  let combined17Match4PlusHits = 0;
  let lucky7Match5PlusHits = 0;
  let bestSingleTicketMatch = 0;
  let rescuedFragmentedCount = 0;
  let bonusTop1Hits = 0;
  let bonusTop3Hits = 0;
  let bonusAudited = 0;

  const methodStatsMap = new Map<number, Lucky7MethodPerf>();
  const recentLog: Lucky7AuditLogEntry[] = [];

  for (let t = N - evalCount; t < N; t++) {
    const histSlice = allDraws.slice(0, t);
    const actual = allDraws[t];

    const { picks: steiner10 } = buildTop10SteinerPicksForGame(game, histSlice, actual.drawNumber);
    const { analytics, steinerNumberPool } = analyzeGameHistoryAndSteinerPool(game, histSlice, steiner10);
    const decoupledBonus = buildDecoupledBonusAnalysis(game, histSlice);

    let lucky7Plays: Lucky7PlayCard[];
    if (isMultiBall) {
      lucky7Plays = buildMultiBallLucky7OutOfBox(game, steiner10, analytics, decoupledBonus).plays;
    } else if (game === "pick4") {
      lucky7Plays = buildPick4Lucky7OutOfBox(steiner10, histSlice, analytics);
    } else if (game === "play-whe") {
      lucky7Plays = buildPlayWheLucky7OutOfBox(steiner10, histSlice, analytics);
    } else {
      lucky7Plays = buildFastCashLucky7OutOfBox(steiner10, analytics);
    }

    // Track Steiner-10 union capture AND narrowed Top-12 ranked pool capture
    const stUnion = new Set(steiner10.flatMap((p) => p.numbers));
    const allInUnion = actual.numbers.every((n) => stUnion.has(n));
    if (allInUnion) unionAllCaptured++;

    const top12Set = new Set(steinerNumberPool.slice(0, 12).map((p) => p.number));
    const top12Hits = actual.numbers.filter((n) => top12Set.has(n)).length;
    if (top12Hits >= Math.min(4, actual.numbers.length)) top12Pool4Plus++;
    if (top12Hits === actual.numbers.length) top12PoolAll++;

    // Track decoupled bonus accuracy (Lotto Plus Powerball 1-10, Win For Life Cash Ball 1-3)
    let bonusTop3Hit: boolean | undefined = undefined;
    if ((game === "lotto-plus" || game === "win-for-life") && decoupledBonus && actual.bonus !== undefined) {
      bonusAudited++;
      if (decoupledBonus.topPick === actual.bonus) bonusTop1Hits++;
      bonusTop3Hit = decoupledBonus.topThreePicks.includes(actual.bonus);
      if (bonusTop3Hit) bonusTop3Hits++;
    }

    const stEval = evaluateSlipSet(
      game,
      steiner10,
      actual,
      game === "play-whe" || game === "fast-cash"
    );
    const l7Eval = evaluateSlipSet(game, lucky7Plays, actual, false);
    const combWon = stEval.wonPrize || l7Eval.wonPrize;

    if (stEval.wonPrize) steiner10PrizeHits++;
    if (l7Eval.wonPrize) lucky7StandalonePrizeHits++;
    if (combWon) combined17PrizeHits++;

    if (stEval.bestMatch >= 4) steiner10Match4PlusHits++;
    if (l7Eval.bestMatch >= 4) lucky7Match4PlusHits++;
    if (Math.max(stEval.bestMatch, l7Eval.bestMatch) >= 4) combined17Match4PlusHits++;
    if (l7Eval.bestMatch >= 5) lucky7Match5PlusHits++;
    if (l7Eval.bestMatch > bestSingleTicketMatch) bestSingleTicketMatch = l7Eval.bestMatch;

    // Update per-method leaderboard (all 7 Number-Theory & Follower lenses)
    for (const play of lucky7Plays) {
      const ev = evaluateSingleSlip(game, play, actual, false);
      let entry = methodStatsMap.get(play.index);
      if (!entry) {
        entry = {
          index: play.index,
          methodKey: play.methodKey,
          methodName: play.methodName,
          prizeHits: 0,
          match3PlusHits: 0,
          match4PlusHits: 0,
          match5PlusHits: 0,
          bestMatch: 0,
          hitRatePct: 0
        };
        methodStatsMap.set(play.index, entry);
      }
      if (ev.wonPrize) entry.prizeHits++;
      if (ev.matchCount >= 3) entry.match3PlusHits++;
      if (ev.matchCount >= 4) entry.match4PlusHits++;
      if (ev.matchCount >= 5) entry.match5PlusHits++;
      if (ev.matchCount > entry.bestMatch) entry.bestMatch = ev.matchCount;
    }

    const isFragmented = allInUnion && !stEval.wonPrize;
    if (isFragmented) fragmentationGapCount++;

    const rescued = !stEval.wonPrize && l7Eval.wonPrize;
    if (rescued) rescuedFragmentedCount++;

    const outcomeNote =
      l7Eval.bestMatch >= 4
        ? `Match ${l7Eval.bestMatch} Breakthrough (${l7Eval.bestMethodName})`
        : rescued
        ? `Rescued by ${l7Eval.bestMethodName}`
        : stEval.wonPrize && l7Eval.wonPrize
        ? "Both Hit Prize"
        : stEval.wonPrize
        ? "Steiner-10 Prize"
        : "No Prize Hit";

    recentLog.push({
      drawNumber: actual.drawNumber,
      drawDate: actual.drawDate,
      actualNumbers: actual.numbers,
      actualBonus: actual.bonus,
      steiner10BestMatch: stEval.bestMatch,
      lucky7BestMatch: l7Eval.bestMatch,
      bestMethodName: l7Eval.bestMethodName,
      steiner10WonPrize: stEval.wonPrize,
      lucky7WonPrize: l7Eval.wonPrize,
      lucky7Hit4Plus: l7Eval.bestMatch >= 4,
      bonusTop3Hit,
      rescuedFragmentedDraw: rescued,
      outcomeNote
    });
  }

  const pct = (n: number, d: number = evalCount) =>
    d > 0 ? Math.round((n / d) * 1000) / 10 : 0;

  const methodLeaderboard = Array.from(methodStatsMap.values())
    .map((m) => ({ ...m, hitRatePct: pct(m.prizeHits) }))
    .sort((a, b) => b.match4PlusHits - a.match4PlusHits || b.prizeHits - a.prizeHits || a.index - b.index);

  const unionPct = pct(unionAllCaptured);
  const fragPct = pct(fragmentationGapCount);
  const stPct = pct(steiner10PrizeHits);
  const l7Pct = pct(lucky7StandalonePrizeHits);
  const combPct = pct(combined17PrizeHits);
  const totalSteinerMisses = evalCount - steiner10PrizeHits;
  const rescuedPct = pct(rescuedFragmentedCount, Math.max(1, totalSteinerMisses));
  const l7M4Pct = pct(lucky7Match4PlusHits);
  const combM4Pct = pct(combined17Match4PlusHits);
  const topMethod = methodLeaderboard[0];

  const verdictHeadline = isMultiBall
    ? `Higher-Tier Audit: ${lucky7Match4PlusHits} Match 4+ Hits (${l7M4Pct}%), Best Single Slip ${bestSingleTicketMatch} of ${actualLengthForGame(game)}`
    : game === "pick4"
    ? `Positional Splicer Audit: ${lucky7StandalonePrizeHits} Official Prize Hits (${l7Pct}%) Across ${evalCount} Draws`
    : `7-Method Signal Audit: ${lucky7StandalonePrizeHits} Direct Hits (${l7Pct}%) Across ${evalCount} Draws`;

  const verdictExplanation = isMultiBall
    ? `Across ${evalCount} live out-of-sample draws, removing the Match-3+ spread cap let Lucky 7's 7 Number-Theory & Follower plays land ${lucky7Match4PlusHits} Match 4+ hits (${l7M4Pct}% standalone, ${combined17Match4PlusHits} combined 17-slip) and ${lucky7StandalonePrizeHits} total prize draws (${l7Pct}%), lifting combined capture from ${stPct}% to ${combPct}%. Top-performing lens: ${topMethod?.methodName || "What Follows What"}.`
    : game === "pick4"
    ? `Across ${evalCount} real Pick 4 draws, Steiner-10 held all 4 winning digits in ${unionPct}% of draws. Lucky 7's 7 positional follower and number-theory sets captured ${l7Pct}% standalone and lifted combined official prize capture from ${stPct}% to ${combPct}%.`
    : `Across ${evalCount} real single-number draws, Lucky 7's 7 distinct number-theory and follower picks ($7) hit ${l7Pct}% standalone and lifted combined coverage alongside Steiner-10 primary picks ($10) from ${stPct}% to ${combPct}%.`;

  return {
    drawsAudited: evalCount,
    steiner10UnionCapturePct: unionPct,
    top12Pool4PlusPct: pct(top12Pool4Plus),
    top12PoolAllPct: pct(top12PoolAll),
    fragmentationGapPct: fragPct,
    fragmentationGapCount,
    steiner10PrizeRatePct: stPct,
    steiner10PrizeHits,
    lucky7StandalonePrizeRatePct: l7Pct,
    lucky7StandalonePrizeHits,
    combined17PrizeRatePct: combPct,
    combined17PrizeHits,
    steiner10Match4PlusHits,
    steiner10Match4PlusPct: pct(steiner10Match4PlusHits),
    lucky7Match4PlusHits,
    lucky7Match4PlusPct: l7M4Pct,
    combined17Match4PlusHits,
    combined17Match4PlusPct: combM4Pct,
    lucky7Match5PlusHits,
    bestSingleTicketMatch,
    decoupledBonusTop1Pct: bonusAudited > 0 ? pct(bonusTop1Hits, bonusAudited) : undefined,
    decoupledBonusTop3Pct: bonusAudited > 0 ? pct(bonusTop3Hits, bonusAudited) : undefined,
    rescuedFragmentedCount,
    rescuedFragmentedPct: rescuedPct,
    verdictHeadline,
    verdictExplanation,
    methodLeaderboard,
    recentLog: recentLog.reverse().slice(0, 12)
  };
}

function actualLengthForGame(game: Lucky7GameKey): number {
  if (game === "win-for-life") return 6;
  if (game === "cashpot" || game === "lotto-plus") return 5;
  if (game === "pick4") return 4;
  return 1;
}

// ============================================================================
// Master Entry Point: Execute Lucky 7 Engine v2 for Any Game
// ============================================================================
export function executeLucky7Engine(
  game: Lucky7GameKey,
  histDraws: TrevorHistoricalDraw[],
  options?: {
    customSeed?: number;
    includeAudit?: boolean;
    auditWindow?: number;
  }
): Lucky7EngineResult {
  const meta = getTrevorGameMeta(game);
  const latest = histDraws.length > 0 ? histDraws[histDraws.length - 1] : undefined;
  const nextTargetDrawNumber = latest ? latest.drawNumber + 1 : 1;

  // Step 1: Pull Steiner Picks #1..#10 and explicitly list & analyze the narrowed number pool
  const { picks: top10SteinerPicks } = buildTop10SteinerPicksForGame(
    game,
    histDraws,
    nextTargetDrawNumber
  );
  const { analytics, steinerNumberPool, whatFollowsLastDraw } = analyzeGameHistoryAndSteinerPool(
    game,
    histDraws,
    top10SteinerPicks
  );

  // Step 2: Independent / Decoupled Bonus Sequence (Lotto Plus 1-10, Win For Life 1-3, Cash Pot Multiplier)
  const decoupledBonus = buildDecoupledBonusAnalysis(game, histDraws);

  // Step 3: Build 7 Distinct Out-of-the-Box Number-Theory & Follower Plays
  let lucky7Plays: Lucky7PlayCard[];
  let multiBallStats:
    | {
        internalMaxOverlap: number;
        coveredNumbersCount: number;
        newCrossSlipPairsCount: number;
        totalLucky7PairsCount: number;
        steiner10PairsCount: number;
        totalUniversePairsCount: number;
      }
    | undefined;

  if (game === "cashpot" || game === "lotto-plus" || game === "win-for-life") {
    const solved = buildMultiBallLucky7OutOfBox(game, top10SteinerPicks, analytics, decoupledBonus);
    lucky7Plays = solved.plays;
    multiBallStats = {
      internalMaxOverlap: solved.internalMaxOverlap,
      coveredNumbersCount: solved.coveredNumbersCount,
      newCrossSlipPairsCount: solved.newCrossSlipPairsCount,
      totalLucky7PairsCount: solved.totalLucky7PairsCount,
      steiner10PairsCount: solved.steiner10PairsCount,
      totalUniversePairsCount: solved.totalUniversePairsCount
    };
  } else if (game === "pick4") {
    lucky7Plays = buildPick4Lucky7OutOfBox(top10SteinerPicks, histDraws, analytics);
  } else if (game === "play-whe") {
    lucky7Plays = buildPlayWheLucky7OutOfBox(top10SteinerPicks, histDraws, analytics);
  } else {
    lucky7Plays = buildFastCashLucky7OutOfBox(top10SteinerPicks, analytics);
  }

  const metrics = buildContextMetrics(game, multiBallStats);
  const hypothesisAudit = options?.includeAudit
    ? runLucky7HypothesisAudit(game, histDraws, options.auditWindow ?? 60)
    : undefined;

  return {
    game,
    gameName: meta.gameName,
    themeColor: meta.themeColor,
    unitCostTT: meta.unitCostTT,
    lucky7TotalCostTT: lucky7Plays.length * meta.unitCostTT,
    bonusName: meta.bonusName,
    bonusMax: meta.bonusMax,
    totalDrawsAnalyzed: histDraws.length,
    nextTargetDrawNumber,
    latestDraw: latest
      ? {
          drawNumber: latest.drawNumber,
          drawDate: latest.drawDate,
          timeSlot: latest.timeSlot,
          numbers: latest.numbers,
          bonus: latest.bonus
        }
      : undefined,
    top10SteinerPicks,
    steinerNumberPool,
    whatFollowsLastDraw,
    decoupledBonus,
    lucky7Plays,
    metrics,
    hypothesisAudit
  };
}
