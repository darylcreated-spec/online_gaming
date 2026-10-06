import { createClient } from "@libsql/client";
import * as fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/TURSO_DATABASE_URL=(.+)/)![1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)![1].trim();
const db = createClient({ url, authToken: token });

async function run() {
  const res = await db.execute(`
    SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6, cash_ball 
    FROM winforlife_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const draws = res.rows.map(r => ({
    draw_number: Number(r.draw_number),
    draw_date: String(r.draw_date),
    numbers: [
      Number(r.num1),
      Number(r.num2),
      Number(r.num3),
      Number(r.num4),
      Number(r.num5),
      Number(r.num6)
    ].sort((a, b) => a - b),
    cash_ball: Number(r.cash_ball || 1)
  }));

  const testCount = draws.length - 15;

  // Let's test a greedy covering design generator for any pool of size V
  // A covering design selects tickets of size 6 from pool to maximize coverage of all C(V, 3) triplets or pairs
  function generateCoveringTickets(pool: number[], numTickets: number): number[][] {
    // Generate all pairs or triplets within pool
    // To ensure balanced distribution, each ball should appear roughly (numTickets * 6) / V times
    // Let's build a deterministic covering wheel using Steiner/block design partitions
    // For V=16, 8 tickets give 48 slots. 48 / 16 = 3 appearances per number!
    // A regular graph/block design where each pair appears at least once:
    const V = pool.length;
    const tickets: number[][] = [];
    
    // Cyclic difference set or permutation-based Latin block:
    // With shift offsets:
    const shifts = [0, 2, 4, 6, 8, 10, 12, 14];
    for (const s of shifts) {
      if (tickets.length >= numTickets) break;
      const t: number[] = [];
      // Pick 6 numbers spaced out across the pool
      for (let k = 0; k < 6; k++) {
        // distribute across pool
        const idx = (s + Math.floor(k * (V / 6))) % V;
        if (!t.includes(pool[idx])) t.push(pool[idx]);
      }
      while (t.length < 6) {
        for (let j = 0; j < V; j++) {
          const idx = (s + j) % V;
          if (!t.includes(pool[idx])) { t.push(pool[idx]); break; }
        }
      }
      tickets.push(t.sort((a, b) => a - b));
    }
    return tickets;
  }

  console.log("Testing combinatorial covering strategies...");
}

run();
