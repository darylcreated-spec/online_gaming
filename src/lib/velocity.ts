import { query } from "./db";
import { CHINAPOO_CHART } from "./playwhe";

export interface VelocityOutput {
  number: number;
  mark: string;
  matchedKeywords: string[];
  currentSkip: number;
  averageSkip: number;
  drawCount: number;
  recentFrequency: number;
  velocityScore: number;
}

/**
 * Pairs incoming Chinapoo dream keywords with active database draw gaps
 * to yield a dynamic momentum 'Velocity Score' (0-100) for matching marks.
 * 
 * @param keywords Array of search words (e.g. ["cat", "coffin", "church"])
 */
export async function getChinapooVelocity(keywords: string[]): Promise<VelocityOutput[]> {
  const cleanKeywords = keywords.map(kw => kw.toLowerCase().trim()).filter(Boolean);
  if (cleanKeywords.length === 0) return [];

  // 1. Resolve keywords to numbers from the CHINAPOO_CHART
  const resolvedNumbers: number[] = [];
  const numToKeywords: Record<number, string[]> = {};

  for (let n = 1; n <= 36; n++) {
    const chartEntry = CHINAPOO_CHART[n];
    const matched = chartEntry.keywords.filter(kw => 
      cleanKeywords.some(inputKw => 
        inputKw === kw.toLowerCase() || 
        kw.toLowerCase().includes(inputKw) ||
        inputKw.includes(kw.toLowerCase())
      )
    );
    if (matched.length > 0) {
      resolvedNumbers.push(n);
      numToKeywords[n] = matched;
    }
  }

  if (resolvedNumbers.length === 0) return [];

  // 2. Fetch all Play Whe draws ordered by latest first
  const draws = await query<any>(`
    SELECT draw_number, winning_number 
    FROM playwhe_draws 
    ORDER BY CAST(draw_number AS INTEGER) DESC
  `);

  const totalDraws = draws.length;
  if (totalDraws === 0) return [];

  const outputs: VelocityOutput[] = [];

  // 3. Calculate skip intervals, average gaps, and short-term velocity
  resolvedNumbers.forEach(n => {
    let currentSkip = 0;
    let totalSkips = 0;
    let skipCount = 0;
    let lastSeenIndex = -1;
    let drawCount = 0;

    // Traverse draws (index 0 is newest)
    for (let i = 0; i < totalDraws; i++) {
      if (draws[i].winning_number === n) {
        drawCount++;
        if (lastSeenIndex === -1) {
          currentSkip = i; // draws elapsed since the last hit
        } else {
          totalSkips += (i - lastSeenIndex - 1);
          skipCount++;
        }
        lastSeenIndex = i;
      }
    }

    // Default skip metrics if number was never drawn (or only once)
    if (lastSeenIndex === -1) {
      currentSkip = totalDraws;
    }
    const averageSkip = skipCount > 0 ? Math.round(totalSkips / skipCount) : totalDraws;

    // Calculate recent frequency in the last 150 draws (momentum window)
    const recentLimit = Math.min(150, totalDraws);
    let recentHits = 0;
    for (let i = 0; i < recentLimit; i++) {
      if (draws[i].winning_number === n) {
        recentHits++;
      }
    }
    const recentFrequency = recentHits / recentLimit;
    const globalFrequency = drawCount / totalDraws;

    // --- VELOCITY FORMULA ---
    // Recent frequency (50% weight) represents immediate hot/cold momentum.
    // Global frequency (20% weight) represents historic baseline strength.
    // Skip-decay factor (30% weight) measures draw gaps. It penalizes extreme cold.
    const skipDecay = 1 / Math.sqrt(currentSkip + 1);
    
    // Scale up the score into a beautiful 0-100 indicator
    const rawScore = (recentFrequency * 0.50 + globalFrequency * 0.20 + skipDecay * 0.30) * 1000;
    const velocityScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    outputs.push({
      number: n,
      mark: CHINAPOO_CHART[n].mark,
      matchedKeywords: numToKeywords[n],
      currentSkip,
      averageSkip,
      drawCount,
      recentFrequency,
      velocityScore
    });
  });

  // Sort by highest velocity score first
  return outputs.sort((a, b) => b.velocityScore - a.velocityScore);
}
