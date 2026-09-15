/**
 * wheeling_worker.js — Dedicated Web Worker for Combinatorial Wheeling
 * The Win Concept Lottery Analytics Platform
 *
 * Runs heavy Stefan Mandel C(v, k, t) bitmask set-cover minimization in a background
 * thread, ensuring 0% main-thread lockup and steady 60fps UI responsiveness.
 */

function popcountBigInt(bn) {
  let count = 0;
  let n = bn;
  const zero = BigInt(0);
  const one = BigInt(1);
  while (n > zero) {
    n &= (n - one);
    count++;
  }
  return count;
}

function numbersToBitmask(numbers) {
  let mask = BigInt(0);
  const one = BigInt(1);
  for (let i = 0; i < numbers.length; i++) {
    mask |= (one << BigInt(numbers[i]));
  }
  return mask;
}

function getCombinations(arr, k) {
  const result = [];
  function helper(start, combo) {
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

function generateAbbreviatedWheel(pool, t, m, ticketSize = 5) {
  const sortedPool = [...pool].sort((a, b) => a - b);
  const rawTargets = getCombinations(sortedPool, m);
  const targetMasks = rawTargets.map(numbersToBitmask);
  const targetCount = targetMasks.length;

  const rawCandidates = getCombinations(sortedPool, ticketSize);
  const candidateMasks = rawCandidates.map(numbersToBitmask);
  const candidateCount = candidateMasks.length;

  const candidateCoverage = new Array(candidateCount);
  for (let c = 0; c < candidateCount; c++) {
    const cMask = candidateMasks[c];
    const covered = [];
    for (let tg = 0; tg < targetCount; tg++) {
      const matchBits = popcountBigInt(cMask & targetMasks[tg]);
      if (matchBits >= t) {
        covered.push(tg);
      }
    }
    candidateCoverage[c] = covered;
  }

  const isTargetCovered = new Uint8Array(targetCount);
  let uncoveredRemaining = targetCount;
  const selectedTickets = [];
  const candidateUsed = new Uint8Array(candidateCount);

  while (uncoveredRemaining > 0) {
    let bestCandidateIdx = -1;
    let maxNewCoverage = 0;

    for (let c = 0; c < candidateCount; c++) {
      if (candidateUsed[c] === 1) continue;

      let currentNewCoverage = 0;
      const targets = candidateCoverage[c];
      for (let i = 0; i < targets.length; i++) {
        if (isTargetCovered[targets[i]] === 0) {
          currentNewCoverage++;
        }
      }

      if (currentNewCoverage > maxNewCoverage) {
        maxNewCoverage = currentNewCoverage;
        bestCandidateIdx = c;
      }
    }

    if (bestCandidateIdx === -1 || maxNewCoverage === 0) break;

    candidateUsed[bestCandidateIdx] = 1;
    selectedTickets.push(rawCandidates[bestCandidateIdx]);

    const coveredNow = candidateCoverage[bestCandidateIdx];
    for (let i = 0; i < coveredNow.length; i++) {
      const targetIdx = coveredNow[i];
      if (isTargetCovered[targetIdx] === 0) {
        isTargetCovered[targetIdx] = 1;
        uncoveredRemaining--;
      }
    }
  }

  return selectedTickets;
}

self.onmessage = function (e) {
  const { id, type, pool, t, m, ticketSize } = e.data;
  const startTime = performance.now();

  try {
    if (type === "ABBREVIATED_WHEEL") {
      const tickets = generateAbbreviatedWheel(pool, t, m, ticketSize);
      const executionTimeMs = Math.round(performance.now() - startTime);

      self.postMessage({
        id,
        success: true,
        tickets,
        totalCombinations: tickets.length,
        executionTimeMs
      });
    } else {
      self.postMessage({
        id,
        success: false,
        error: `Unknown worker task type: ${type}`
      });
    }
  } catch (err) {
    self.postMessage({
      id,
      success: false,
      error: err.message || "Combinatorial calculation error"
    });
  }
};
