import { query } from "@/lib/db";
import { tokenizeAndMatch } from "@/lib/playwhe";
import { calculateDeltas } from "@/lib/deltas";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: any[] = [];
  
  const runTest = async (name: string, fn: () => void | Promise<void>) => {
    const start = Date.now();
    try {
      await fn();
      results.push({ name, status: "passed", duration: `${Date.now() - start}ms` });
    } catch (err: any) {
      results.push({ name, status: "failed", error: err.message, duration: `${Date.now() - start}ms` });
    }
  };

  // 1. Database Connection and Schema
  await runTest("Database: Verify table counts", async () => {
    const draws = await query<any>("SELECT COUNT(*) as cnt FROM draws");
    const playwhe = await query<any>("SELECT COUNT(*) as cnt FROM playwhe_draws");
    const combos = await query<any>("SELECT COUNT(*) as cnt FROM eligible_combinations");
    
    if (draws[0].cnt === undefined) throw new Error("draws count returned undefined");
    if (playwhe[0].cnt === undefined) throw new Error("playwhe_draws count returned undefined");
    if (combos[0].cnt === undefined) throw new Error("eligible_combinations count returned undefined");
  });

  // 2. Dream Interpreter Lemmatizer
  await runTest("Play Whe: Lemmatizer Exact Word Matching", () => {
    // Exact word boundaries should ignore "shred" for "red", and "caterpillar" for "cat"
    const matches1 = tokenizeAndMatch("I saw a caterpillar on a shred of leaf");
    const matchedMarks1 = matches1.map(m => m.mark);
    
    if (matchedMarks1.includes("Red Fish")) throw new Error("False-positive: matched 'red' in 'shred'");
    if (matchedMarks1.includes("Tiger") || matchedMarks1.includes("House Cat")) {
      throw new Error("False-positive: matched 'cat' in 'caterpillar'");
    }

    // Tenses and plurals should match
    const matches2 = tokenizeAndMatch("I saw dogs and monkeys climbing banana trees while a spider crawled");
    const matchedMarks2 = matches2.map(m => m.mark);
    
    if (!matchedMarks2.includes("Dog")) throw new Error("Failed to match plural 'dogs' to 'Dog'");
    if (!matchedMarks2.includes("Monkey")) throw new Error("Failed to match plural 'monkeys' to 'Monkey'");
    if (!matchedMarks2.includes("Centipede")) throw new Error("Failed to match verb tense 'crawled' to 'crawl'");
  });

  // 3. Deltas calculation
  await runTest("Deltas: Verify delta sequence calculator", () => {
    const sequence = [1, 5, 10, 15, 23];
    const deltas = calculateDeltas(sequence);
    const expected = [4, 5, 5, 8];
    if (JSON.stringify(deltas) !== JSON.stringify(expected)) {
      throw new Error(`Deltas calculation incorrect. Got ${JSON.stringify(deltas)}, expected ${JSON.stringify(expected)}`);
    }
  });

  // 4. Verification of database indices
  await runTest("Database: Verify index list", async () => {
    const indexes = await query<any>("PRAGMA index_list('draws')");
    if (indexes.length === 0) {
      throw new Error("No indices defined on draws table!");
    }
  });

  const total = results.length;
  const passed = results.filter(r => r.status === "passed").length;
  const failed = results.filter(r => r.status === "failed").length;

  return NextResponse.json({
    success: failed === 0,
    totalTests: total,
    passed,
    failed,
    results
  });
}
