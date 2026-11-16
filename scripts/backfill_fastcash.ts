/**
 * Resumable CLI Backfill for NLCB Fast Cash
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill_fastcash.ts --pages=250 --start=1
 */

import { backfillFastCashPages } from "../src/lib/fastcash_scraper";
import { queryFastCash } from "../src/lib/fastcash_db";

function parseArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (!hit) return fallback;
  const val = parseInt(hit.slice(prefix.length), 10);
  return Number.isFinite(val) && val > 0 ? val : fallback;
}

async function main() {
  const pages = parseArg("pages", 250);
  const start = parseArg("start", 1);
  const end = start + pages - 1;

  console.log(`=== NLCB Fast Cash Backfill (pages ${start}..${end}) ===`);
  const res = await backfillFastCashPages(start, end, ({ page, totalAdded, latestDraw }) => {
    console.log(`  [Page ${page}/${end}] totalAdded=${totalAdded} | cursorDraw=#${latestDraw}`);
  });

  const countRows = await queryFastCash<{ cnt: number; min_d: number; max_d: number }>(
    "SELECT COUNT(*) as cnt, MIN(draw_number) as min_d, MAX(draw_number) as max_d FROM fastcash_draws"
  );
  const stats = countRows[0] || { cnt: 0, min_d: null, max_d: null };

  console.log("\n=== Backfill Summary ===");
  console.log(`  Pages processed: ${res.pagesProcessed}`);
  console.log(`  Draws parsed:    ${res.totalParsed}`);
  console.log(`  Draws inserted:  ${res.totalAdded}`);
  console.log(`  DB total draws:  ${stats.cnt} (#${stats.min_d} .. #${stats.max_d})`);
}

main().catch((err) => {
  console.error("Fatal backfill error:", err);
  process.exit(1);
});
