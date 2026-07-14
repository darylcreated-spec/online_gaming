// Lotto Plus Combinatorial Wheeling Engine

// Helper to generate all combinations of size k from an array
export function getCombinations(arr: number[], k: number): number[][] {
  const result: number[][] = [];
  
  function helper(start: number, combo: number[]) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  
  helper(0, []);
  return result;
}

// Helper to check if a small array is a subset of a larger array
export function isSubset(subset: number[], superset: number[]): boolean {
  return subset.every(val => superset.includes(val));
}

// Greedy Abbreviated Wheeling generator
// Generates a minimal set of tickets of size 5 from a pool,
// guaranteeing that if 'm' numbers from the pool are drawn,
// at least one ticket will match at least 't' numbers.
export function generateAbbreviatedWheel(
  pool: number[],
  t: number, // match requirement (e.g. 4)
  m: number  // drawn numbers in pool (e.g. 4)
): number[][] {
  const sortedPool = [...pool].sort((a, b) => a - b);
  
  // 1. Generate all possible m-subsets of the pool that could be drawn.
  // For 4-if-4, this is all subsets of size 4.
  const targets = getCombinations(sortedPool, m);
  
  // 2. Generate all possible tickets (5-subsets of the pool) we can choose from.
  const candidates = getCombinations(sortedPool, 5);
  
  // 3. For each candidate ticket, precompute which targets it covers.
  // A ticket covers a target if the target matches at least 't' numbers in the ticket.
  // For t=4, m=4, a ticket covers a target if the target is a subset of the ticket.
  const candidateCoverage = candidates.map(ticket => {
    const coveredIndices = new Set<number>();
    targets.forEach((target, idx) => {
      // Count matches between ticket and target
      const matchCount = target.filter(val => ticket.includes(val)).length;
      if (matchCount >= t) {
        coveredIndices.add(idx);
      }
    });
    return { ticket, coveredIndices };
  });
  
  // 4. Greedy Set Cover Selection
  const selectedTickets: number[][] = [];
  const uncoveredTargetIndices = new Set<number>(targets.map((_, idx) => idx));
  
  // Keep picking candidates that cover the most uncovered targets
  while (uncoveredTargetIndices.size > 0 && candidateCoverage.length > 0) {
    let bestCandidateIdx = -1;
    let maxNewCoverage = 0;
    
    // Find the candidate that covers the maximum number of remaining uncovered targets
    for (let i = 0; i < candidateCoverage.length; i++) {
      let currentNewCoverage = 0;
      for (const idx of candidateCoverage[i].coveredIndices) {
        if (uncoveredTargetIndices.has(idx)) {
          currentNewCoverage++;
        }
      }
      if (currentNewCoverage > maxNewCoverage) {
        maxNewCoverage = currentNewCoverage;
        bestCandidateIdx = i;
      }
    }
    
    // If no candidate covers any new targets, we are done
    if (bestCandidateIdx === -1 || maxNewCoverage === 0) {
      break;
    }
    
    const bestCandidate = candidateCoverage[bestCandidateIdx];
    selectedTickets.push(bestCandidate.ticket);
    
    // Remove covered targets from our uncovered set
    for (const idx of bestCandidate.coveredIndices) {
      uncoveredTargetIndices.delete(idx);
    }
    
    // Remove the selected candidate from candidates list
    candidateCoverage.splice(bestCandidateIdx, 1);
  }
  
  return selectedTickets;
}

// Main interface for generating wheels
export function generateWheel(
  pool: number[],
  strategy: "full" | "abbreviated-4-4" | "abbreviated-3-3"
): number[][] {
  if (pool.length < 5) {
    throw new Error("Wheeling pool must have at least 5 numbers");
  }
  if (pool.length > 15) {
    throw new Error("Pool size too large. Wheeling is limited to 15 numbers to prevent client-side lockup.");
  }
  
  const sortedPool = [...pool].sort((a, b) => a - b);
  
  switch (strategy) {
    case "full":
      return getCombinations(sortedPool, 5);
      
    case "abbreviated-4-4":
      // Guarantee: 4-if-4.
      // If 4 of the pool numbers are drawn, we match at least 4.
      // This is achieved by covering all 4-subsets of the pool using 5-number tickets.
      return generateAbbreviatedWheel(sortedPool, 4, 4);
      
    case "abbreviated-3-3":
      // Guarantee: 3-if-3.
      // If 3 of the pool numbers are drawn, we match at least 3.
      // This is achieved by covering all 3-subsets of the pool using 5-number tickets.
      return generateAbbreviatedWheel(sortedPool, 3, 3);
      
    default:
      throw new Error(`Unknown wheeling strategy: ${strategy}`);
  }
}
