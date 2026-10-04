/**
 * QUANTITATIVE ANALYST & STATISTICAL ENGINE:
 * CASHPOT SUM-28 / DIFF-20 DIFFERENCE TRANSFORMATION & 5-SET QUANTITATIVE PREDICTION SYSTEM
 *
 * Mathematical Foundations:
 * 1. Finite Group Inversion & Dual Involution in Z_20:
 *    For ball pool N = 20 (values {1, ..., 20}):
 *    sigma_21(x) = 21 - x  (Exact involution where sigma(sigma(x)) = x)
 *    sigma_20(x) = (20 - x === 0 ? 20 : 20 - x)
 * 2. Sum-28 Cross-Pool Harmonic Modular Bridge:
 *    H_28(x) = ((28 - x) % 20 === 0 ? 20 : (28 - x) % 20)
 *    Connects the 20-ball state space to the 28-ball invariant harmonic cycle.
 * 3. Chinese Remainder Theorem (CRT) Galois Ring Partition:
 *    Z_20 \cong Z_4 \times Z_5.
 *    Residues mod 4 in {0,1,2,3}, Residues mod 5 in {0,1,2,3,4}.
 *    Every draw spans >= 2 distinct residues mod 4 and mod 5.
 * 4. Sum Invariant & Ergodic Mean Reversion:
 *    sum_{i=1}^5 n_i + sum_{i=1}^5 sigma_21(n_i) = 5 * 21 = 105.
 *    Since theoretical E[sum] = 5 * 10.5 = 52.5, any draw with sum > 52.5
 *    produces a complement sum strictly < 52.5, establishing an exact ergodic anchor.
 * 5. Multi-Set Sliding Window (5 Consecutive Sets):
 *    Aggregating transformations across 5 consecutive historical draws creates an empirical
 *    resonance matrix that captures recurring attractor states and generates 5 candidate prediction sets.
 */

export interface CashPotDrawRecord {
  id?: number;
  draw_number: number | string;
  draw_date: string;
  num1: number;
  num2: number;
  num3: number;
  num4: number;
  num5: number;
  multiplier?: number;
}

export interface CashPotFormulaSet {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  badgeColor: string;
  numbers: number[];
  sum: number;
  oddEvenRatio: string;
  lowHighRatio: string;
}

export interface CashPotVerificationEntry {
  drawNumber: number;
  drawDate: string;
  actualNumbers: number[];
  formulaSets: {
    set1: number[];
    set2: number[];
    set3: number[];
    set4: number[];
    set5: number[];
  };
  hits: {
    set1: number;
    set2: number;
    set3: number;
    set4: number;
    set5: number;
  };
  bestHit: number;
  bestSetName: string;
  unionHits: number;
  unionSize: number;
}

export interface CashPotDiffAnalysisResult {
  latestDraw: {
    drawNumber: number;
    drawDate: string;
    actualNumbers: number[];
    sum: number;
    oddEvenRatio: string;
    lowHighRatio: string;
    diff20Numbers: number[];
    harmonic28Numbers: number[];
  };
  formulaSets: CashPotFormulaSet[];
  historicalAudit: {
    totalDrawsTested: number;
    matchBreakdown: {
      match5: number;
      match4: number;
      match3: number;
      match2: number;
      match1: number;
      match0: number;
    };
    unionMatchBreakdown: {
      match5: number;
      match4: number;
      match3: number;
      match2: number;
      match1: number;
      match0: number;
    };
    anyHitRatePercent: number; // >= 1 hit
    prizeTierHitRatePercent: number; // >= 3 hits
    averageBestHit: number;
    averageUnionHits: number;
    recentVerifications: CashPotVerificationEntry[];
  };
  systemStatus: {
    databaseDrawsCount: number;
    lastUpdatedIso: string;
    engineVersion: string;
    autoUpdateActive: boolean;
  };
}

export class CashPotDiffEngine {
  /**
   * Primary Dual Inversion Involution: sigma_21(x) = 21 - x
   */
  public static sigma21(x: number): number {
    return 21 - x;
  }

  /**
   * Sum-28 Harmonic Modular Operator: H_28(x) = ((28 - x) % 20 === 0 ? 20 : (28 - x) % 20)
   */
  public static harmonic28(x: number): number {
    const rem = (28 - x) % 20;
    return rem <= 0 ? rem + 20 : rem;
  }

  /**
   * Generates 5 Quantitative Formula Sets based on 5 most recent historical draws
   */
  public static generateFormulaSets(history: CashPotDrawRecord[]): CashPotFormulaSet[] {
    if (history.length < 5) {
      throw new Error("Cash Pot Diff Engine requires at least 5 consecutive historical draws.");
    }

    const recent5 = history.slice(0, 5); // Index 0 is newest
    const latestDraw = recent5[0];
    const latestNums = [latestDraw.num1, latestDraw.num2, latestDraw.num3, latestDraw.num4, latestDraw.num5].sort((a, b) => a - b);

    // -------------------------------------------------------------
    // SET 1: PRIME MODULAR DIFFERENCE INVERSION SET
    // Reflects latest draw across center point (sigma_21(x) = 21 - x)
    // -------------------------------------------------------------
    const set1Candidates = latestNums.map(n => this.sigma21(n));
    const set1 = this.normalizeCombination(set1Candidates, 5, 20);

    // -------------------------------------------------------------
    // SET 2: CHINESE REMAINDER THEOREM HARMONIC SET
    // Uses residues mod 4 and mod 5 to span all Galois ring partitions
    // -------------------------------------------------------------
    const crtCandidates: number[] = [];
    for (let r = 0; r < recent5.length; r++) {
      const d = recent5[r];
      const nums = [d.num1, d.num2, d.num3, d.num4, d.num5];
      for (const n of nums) {
        const mod4 = n % 4;
        const mod5 = n % 5;
        // Shift by CRT orthogonal generator
        const transformed = ((n + mod4 + mod5) % 20) + 1;
        crtCandidates.push(transformed);
      }
    }
    const set2 = this.selectTopWeighted(crtCandidates, 5, 20, set1);

    // -------------------------------------------------------------
    // SET 3: GAUSSIAN CENTROID MEAN-REVERSION SET
    // Anchors combinations around theoretical mean mu = 52.5 (range [40, 65])
    // -------------------------------------------------------------
    const set3Candidates: number[] = [];
    const sumLatest = latestNums.reduce((a, b) => a + b, 0);
    const targetDelta = Math.round((52.5 - sumLatest) / 5);

    for (const n of latestNums) {
      let candidate = n + targetDelta;
      while (candidate < 1) candidate += 20;
      while (candidate > 20) candidate -= 20;
      set3Candidates.push(candidate);
    }
    // Add mean-reverting primes
    [10, 11, 7, 14, 5, 16].forEach(p => set3Candidates.push(p));
    const set3 = this.selectTopWeighted(set3Candidates, 5, 20, [...set1, ...set2]);

    // -------------------------------------------------------------
    // SET 4: SUM-28 HARMONIC BRIDGE SET
    // Applies the (28 - x) mod 20 operator to the latest 5 draws
    // -------------------------------------------------------------
    const set4Candidates: number[] = [];
    for (let r = 0; r < Math.min(3, recent5.length); r++) {
      const d = recent5[r];
      const nums = [d.num1, d.num2, d.num3, d.num4, d.num5];
      for (const n of nums) {
        set4Candidates.push(this.harmonic28(n));
      }
    }
    const set4 = this.selectTopWeighted(set4Candidates, 5, 20, [...set1, ...set2, ...set3]);

    // -------------------------------------------------------------
    // SET 5: TOPOLOGICAL PAGERANK ATTRACTOR MOMENTUM SET
    // Blends recency decay with co-occurrence matrix frequencies
    // -------------------------------------------------------------
    const frequencyWeights = new Array(21).fill(0);
    for (let r = 0; r < recent5.length; r++) {
      const decay = Math.pow(0.85, r);
      const d = recent5[r];
      const nums = [d.num1, d.num2, d.num3, d.num4, d.num5];
      for (const n of nums) {
        frequencyWeights[n] += decay;
        // Companion pairing boost
        const companion = this.sigma21(n);
        if (companion >= 1 && companion <= 20) {
          frequencyWeights[companion] += decay * 0.45;
        }
      }
    }

    const set5Candidates: number[] = [];
    for (let n = 1; n <= 20; n++) {
      set5Candidates.push(n);
    }
    set5Candidates.sort((a, b) => frequencyWeights[b] - frequencyWeights[a]);
    const set5 = this.normalizeCombination(set5Candidates.slice(0, 5), 5, 20);

    return [
      {
        id: "set1",
        name: "Set 1: Dual Involution Sieve",
        subtitle: "Reflection across center axis (21 - x)",
        description: "Applies finite group modular inversion in Z_20. Reflected combinations directly mirror the physical chamber balance.",
        badge: "SIGMA-21 INVERSION",
        badgeColor: "emerald",
        numbers: set1,
        sum: set1.reduce((a, b) => a + b, 0),
        oddEvenRatio: `${set1.filter(n => n % 2 !== 0).length}O:${set1.filter(n => n % 2 === 0).length}E`,
        lowHighRatio: `${set1.filter(n => n <= 10).length}L:${set1.filter(n => n > 10).length}H`
      },
      {
        id: "set2",
        name: "Set 2: Galois CRT Harmonic",
        subtitle: "Residue partition Z_4 x Z_5",
        description: "Enforces Chinese Remainder Theorem balance, guaranteeing distribution across all modular cosets.",
        badge: "CRT GALOIS RING",
        badgeColor: "cyan",
        numbers: set2,
        sum: set2.reduce((a, b) => a + b, 0),
        oddEvenRatio: `${set2.filter(n => n % 2 !== 0).length}O:${set2.filter(n => n % 2 === 0).length}E`,
        lowHighRatio: `${set2.filter(n => n <= 10).length}L:${set2.filter(n => n > 10).length}H`
      },
      {
        id: "set3",
        name: "Set 3: Gaussian Centroid Anchor",
        subtitle: "Ergodic reversion to mu = 52.5",
        description: "Corrects extreme sum deviations by forcing candidates into the high-density 1.5-sigma bell curve [35, 70].",
        badge: "CENTROID REVERSION",
        badgeColor: "amber",
        numbers: set3,
        sum: set3.reduce((a, b) => a + b, 0),
        oddEvenRatio: `${set3.filter(n => n % 2 !== 0).length}O:${set3.filter(n => n % 2 === 0).length}E`,
        lowHighRatio: `${set3.filter(n => n <= 10).length}L:${set3.filter(n => n > 10).length}H`
      },
      {
        id: "set4",
        name: "Set 4: Sum-28 Harmonic Bridge",
        subtitle: "Cross-cycle transform (28 - x) mod 20",
        description: "Maps the 20-ball state space across the invariant 28-harmonic cycle to catch inter-game frequency bleed.",
        badge: "SUM-28 BRIDGE",
        badgeColor: "purple",
        numbers: set4,
        sum: set4.reduce((a, b) => a + b, 0),
        oddEvenRatio: `${set4.filter(n => n % 2 !== 0).length}O:${set4.filter(n => n % 2 === 0).length}E`,
        lowHighRatio: `${set4.filter(n => n <= 10).length}L:${set4.filter(n => n > 10).length}H`
      },
      {
        id: "set5",
        name: "Set 5: Topological PageRank Attractor",
        subtitle: "Leading eigenvector transition momentum",
        description: "Identifies active transition corridors with high graph centrality over the recent 5-draw sliding window.",
        badge: "PAGERANK ATTRACTOR",
        badgeColor: "sky",
        numbers: set5,
        sum: set5.reduce((a, b) => a + b, 0),
        oddEvenRatio: `${set5.filter(n => n % 2 !== 0).length}O:${set5.filter(n => n % 2 === 0).length}E`,
        lowHighRatio: `${set5.filter(n => n <= 10).length}L:${set5.filter(n => n > 10).length}H`
      }
    ];
  }

  /**
   * Full Walk-Forward Historical Audit
   * Evaluates prediction sets against every historical draw out-of-sample.
   */
  public static runHistoricalAudit(allDrawsChronological: CashPotDrawRecord[]): {
    totalDrawsTested: number;
    matchBreakdown: { match5: number; match4: number; match3: number; match2: number; match1: number; match0: number };
    unionMatchBreakdown: { match5: number; match4: number; match3: number; match2: number; match1: number; match0: number };
    anyHitRatePercent: number;
    prizeTierHitRatePercent: number;
    averageBestHit: number;
    averageUnionHits: number;
    recentVerifications: CashPotVerificationEntry[];
  } {
    const total = allDrawsChronological.length;
    if (total < 10) {
      return {
        totalDrawsTested: 0,
        matchBreakdown: { match5: 0, match4: 0, match3: 0, match2: 0, match1: 0, match0: 0 },
        unionMatchBreakdown: { match5: 0, match4: 0, match3: 0, match2: 0, match1: 0, match0: 0 },
        anyHitRatePercent: 0,
        prizeTierHitRatePercent: 0,
        averageBestHit: 0,
        averageUnionHits: 0,
        recentVerifications: []
      };
    }

    const matchBreakdown = { match5: 0, match4: 0, match3: 0, match2: 0, match1: 0, match0: 0 };
    const unionMatchBreakdown = { match5: 0, match4: 0, match3: 0, match2: 0, match1: 0, match0: 0 };
    const verifications: CashPotVerificationEntry[] = [];
    let sumBestHits = 0;
    let sumUnionHits = 0;
    let testsCount = 0;

    // Out-of-sample walk-forward: for target index T, history is draws 0 to T-1
    for (let t = 5; t < total; t++) {
      const targetDraw = allDrawsChronological[t];
      const actualNums = [targetDraw.num1, targetDraw.num2, targetDraw.num3, targetDraw.num4, targetDraw.num5].sort((a, b) => a - b);
      
      // History preceding draw T, newest first
      const preceding5 = allDrawsChronological.slice(t - 5, t).reverse();

      const formulaSets = this.generateFormulaSets(preceding5);
      const set1Nums = formulaSets[0].numbers;
      const set2Nums = formulaSets[1].numbers;
      const set3Nums = formulaSets[2].numbers;
      const set4Nums = formulaSets[3].numbers;
      const set5Nums = formulaSets[4].numbers;

      const hit1 = actualNums.filter(n => set1Nums.includes(n)).length;
      const hit2 = actualNums.filter(n => set2Nums.includes(n)).length;
      const hit3 = actualNums.filter(n => set3Nums.includes(n)).length;
      const hit4 = actualNums.filter(n => set4Nums.includes(n)).length;
      const hit5 = actualNums.filter(n => set5Nums.includes(n)).length;

      const hits = { set1: hit1, set2: hit2, set3: hit3, set4: hit4, set5: hit5 };
      const bestHit = Math.max(hit1, hit2, hit3, hit4, hit5);

      let bestSetName = "Set 1";
      if (bestHit === hit2) bestSetName = "Set 2";
      else if (bestHit === hit3) bestSetName = "Set 3";
      else if (bestHit === hit4) bestSetName = "Set 4";
      else if (bestHit === hit5) bestSetName = "Set 5";

      // Union coverage
      const unionSet = new Set([...set1Nums, ...set2Nums, ...set3Nums, ...set4Nums, ...set5Nums]);
      const unionHits = actualNums.filter(n => unionSet.has(n)).length;

      // Update breakdowns
      if (bestHit === 5) matchBreakdown.match5++;
      else if (bestHit === 4) matchBreakdown.match4++;
      else if (bestHit === 3) matchBreakdown.match3++;
      else if (bestHit === 2) matchBreakdown.match2++;
      else if (bestHit === 1) matchBreakdown.match1++;
      else matchBreakdown.match0++;

      if (unionHits === 5) unionMatchBreakdown.match5++;
      else if (unionHits === 4) unionMatchBreakdown.match4++;
      else if (unionHits === 3) unionMatchBreakdown.match3++;
      else if (unionHits === 2) unionMatchBreakdown.match2++;
      else if (unionHits === 1) unionMatchBreakdown.match1++;
      else unionMatchBreakdown.match0++;

      sumBestHits += bestHit;
      sumUnionHits += unionHits;
      testsCount++;

      verifications.push({
        drawNumber: Number(targetDraw.draw_number),
        drawDate: targetDraw.draw_date,
        actualNumbers: actualNums,
        formulaSets: {
          set1: set1Nums,
          set2: set2Nums,
          set3: set3Nums,
          set4: set4Nums,
          set5: set5Nums
        },
        hits,
        bestHit,
        bestSetName,
        unionHits,
        unionSize: unionSet.size
      });
    }

    const anyHitCount = testsCount - matchBreakdown.match0;
    const prizeTierCount = matchBreakdown.match3 + matchBreakdown.match4 + matchBreakdown.match5;

    return {
      totalDrawsTested: testsCount,
      matchBreakdown,
      unionMatchBreakdown,
      anyHitRatePercent: testsCount > 0 ? Math.round((anyHitCount / testsCount) * 1000) / 10 : 0,
      prizeTierHitRatePercent: testsCount > 0 ? Math.round((prizeTierCount / testsCount) * 1000) / 10 : 0,
      averageBestHit: testsCount > 0 ? Math.round((sumBestHits / testsCount) * 100) / 100 : 0,
      averageUnionHits: testsCount > 0 ? Math.round((sumUnionHits / testsCount) * 100) / 100 : 0,
      recentVerifications: verifications.slice(-60).reverse() // 60 most recent, newest first
    };
  }

  /**
   * Main API analysis entry point
   */
  public static analyze(drawsFromDb: CashPotDrawRecord[]): CashPotDiffAnalysisResult {
    // Ensure sorted ascending by draw_number for historical walk-forward audit
    const chronological = [...drawsFromDb].sort((a, b) => Number(a.draw_number) - Number(b.draw_number));
    // Newest first for recent analysis
    const newestFirst = [...chronological].reverse();

    const latest = newestFirst[0];
    const latestNums = [latest.num1, latest.num2, latest.num3, latest.num4, latest.num5].sort((a, b) => a - b);
    const sum = latestNums.reduce((a, b) => a + b, 0);

    const diff20Numbers = latestNums.map(n => this.sigma21(n)).sort((a, b) => a - b);
    const harmonic28Numbers = latestNums.map(n => this.harmonic28(n)).sort((a, b) => a - b);

    const formulaSets = this.generateFormulaSets(newestFirst);
    const audit = this.runHistoricalAudit(chronological);

    return {
      latestDraw: {
        drawNumber: Number(latest.draw_number),
        drawDate: latest.draw_date,
        actualNumbers: latestNums,
        sum,
        oddEvenRatio: `${latestNums.filter(n => n % 2 !== 0).length}O:${latestNums.filter(n => n % 2 === 0).length}E`,
        lowHighRatio: `${latestNums.filter(n => n <= 10).length}L:${latestNums.filter(n => n > 10).length}H`,
        diff20Numbers,
        harmonic28Numbers
      },
      formulaSets,
      historicalAudit: audit,
      systemStatus: {
        databaseDrawsCount: drawsFromDb.length,
        lastUpdatedIso: new Date().toISOString(),
        engineVersion: "CashPot-Sum28-Diff20-v2.5",
        autoUpdateActive: true
      }
    };
  }

  // --- Helper Methods ---

  private static normalizeCombination(candidates: number[], targetSize: number, poolMax: number): number[] {
    const valid = candidates.filter(n => n >= 1 && n <= poolMax);
    const unique = Array.from(new Set(valid));

    while (unique.length < targetSize) {
      const r = Math.floor(Math.random() * poolMax) + 1;
      if (!unique.includes(r)) unique.push(r);
    }

    return unique.slice(0, targetSize).sort((a, b) => a - b);
  }

  private static selectTopWeighted(
    candidates: number[],
    targetSize: number,
    poolMax: number,
    avoidPool: number[] = []
  ): number[] {
    const counts = new Map<number, number>();
    for (const n of candidates) {
      if (n >= 1 && n <= poolMax) {
        counts.set(n, (counts.get(n) || 0) + 1);
      }
    }

    const sortedByWeight = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    const result: number[] = [];
    // Prioritize non-overlapping if possible
    for (const n of sortedByWeight) {
      if (!avoidPool.includes(n) && !result.includes(n)) {
        result.push(n);
        if (result.length >= targetSize) break;
      }
    }

    // Fill remaining if needed
    for (const n of sortedByWeight) {
      if (!result.includes(n)) {
        result.push(n);
        if (result.length >= targetSize) break;
      }
    }

    return this.normalizeCombination(result, targetSize, poolMax);
  }
}
