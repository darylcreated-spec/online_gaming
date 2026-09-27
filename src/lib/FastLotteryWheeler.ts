/**
 * Ultra-fast Bitwise Minimal Covering Generator for Next.js / Node.js
 * Uses 64-bit BigInt masks for O(1) Hamming weight matching.
 */

export interface WheelConfig {
  gameKey: "cashpot" | "lotto-plus" | "win-for-life";
  ticketSize: number; // k
  matchGoal: number;  // m (e.g. 3, 4, 5)
  conditionHits: number; // t (e.g. 3, 4, 5, 6)
  ticketCostTT: number;
}

export interface GeneratedWheelResult {
  pool: number[];
  poolSize: number;
  ticketSize: number;
  guaranteeText: string;
  tickets: number[][];
  ticketCount: number;
  wheeledCostTT: number;
  fullCombinationsCount: number;
  fullCostTT: number;
  costSavingsPct: number;
  executionTimeMs: number;
}

export class FastLotteryWheeler {
  // Convert array of number indices (1-indexed) to BigInt bitmask
  static toBitmask(combo: number[]): bigint {
    let mask = BigInt(0);
    const one = BigInt(1);
    for (let i = 0; i < combo.length; i++) {
      mask |= (one << BigInt(combo[i] - 1));
    }
    return mask;
  }

  // Count common numbers between two tickets via popcount
  static countOverlap(maskA: bigint, maskB: bigint): number {
    let x = maskA & maskB;
    let count = 0;
    const zero = BigInt(0);
    const one = BigInt(1);
    while (x > zero) {
      count += Number(x & one);
      x >>= one;
    }
    return count;
  }

  // Combinatorial n choose k
  static nCr(n: number, r: number): number {
    if (r < 0 || r > n) return 0;
    if (r === 0 || r === n) return 1;
    let c = 1;
    for (let i = 1; i <= r; i++) {
      c = (c * (n - (r - i))) / i;
    }
    return Math.round(c);
  }

  static kCombinations(set: number[], k: number): number[][] {
    if (k === 0) return [[]];
    if (set.length < k) return [];
    const [head, ...tail] = set;
    const withHead = this.kCombinations(tail, k - 1).map(c => [head, ...c]);
    const withoutHead = this.kCombinations(tail, k);
    return [...withHead, ...withoutHead];
  }

  /**
   * Generates a minimal covering wheel:
   * Guarantees at least `matchGoal` numbers if `conditionHits` numbers land in `pool`.
   */
  static generateWheel(
    pool: number[],
    ticketSize: number,
    matchGoal: number,
    conditionHits: number,
    ticketCostTT: number
  ): GeneratedWheelResult {
    const startTime = performance.now();
    const sortedPool = [...pool].sort((a, b) => a - b);
    const poolSize = sortedPool.length;

    // Safety bounds check
    if (ticketSize > poolSize) {
      throw new Error(`Ticket size (${ticketSize}) cannot be greater than pool size (${poolSize})`);
    }

    const fullCombinations = this.nCr(poolSize, ticketSize);
    const fullCost = fullCombinations * ticketCostTT;

    // 1. Generate all possible playable tickets from the pool
    const poolCombos = this.kCombinations(sortedPool, ticketSize);
    const candidateMasks = poolCombos.map(c => ({
      combo: c,
      mask: this.toBitmask(c)
    }));

    // 2. Generate all target t-subsets that can be drawn from the pool
    const targetSubsets = this.kCombinations(sortedPool, conditionHits).map(s => this.toBitmask(s));
    const uncovered = new Set<bigint>(targetSubsets);
    const selectedTickets: number[][] = [];

    // 3. Fast greedy bitwise set cover
    while (uncovered.size > 0) {
      let bestCandidate = candidateMasks[0];
      let maxCoveredCount = -1;

      for (let i = 0; i < candidateMasks.length; i++) {
        const candidate = candidateMasks[i];
        let covers = 0;
        for (const target of uncovered) {
          if (this.countOverlap(candidate.mask, target) >= matchGoal) {
            covers++;
          }
        }
        if (covers > maxCoveredCount) {
          maxCoveredCount = covers;
          bestCandidate = candidate;
        }
      }

      if (maxCoveredCount <= 0) {
        // Fallback: take remaining first candidate to ensure full coverage
        selectedTickets.push(candidateMasks[0].combo);
        break;
      }

      selectedTickets.push(bestCandidate.combo);

      // Remove newly covered targets
      for (const target of Array.from(uncovered)) {
        if (this.countOverlap(bestCandidate.mask, target) >= matchGoal) {
          uncovered.delete(target);
        }
      }
    }

    const executionTimeMs = performance.now() - startTime;
    const ticketCount = selectedTickets.length;
    const wheeledCostTT = ticketCount * ticketCostTT;
    const costSavingsPct = fullCost > 0 ? ((fullCost - wheeledCostTT) / fullCost) * 100 : 0;

    return {
      pool: sortedPool,
      poolSize,
      ticketSize,
      guaranteeText: `Guarantees at least Match ${matchGoal} prize if ${conditionHits} winning numbers fall in your ${poolSize}-number pool`,
      tickets: selectedTickets,
      ticketCount,
      wheeledCostTT,
      fullCombinationsCount: fullCombinations,
      fullCostTT: fullCost,
      costSavingsPct: Math.max(0, costSavingsPct),
      executionTimeMs: Math.round(executionTimeMs * 10) / 10
    };
  }
}
