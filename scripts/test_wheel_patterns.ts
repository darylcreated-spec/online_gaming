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

  // Let's test building an optimal covering wheel for pool16
  // For 16 numbers, a standard 8-ticket covering wheel:
  // Ticket 1: 0, 1, 2, 3, 4, 5
  // Ticket 2: 0, 1, 6, 7, 8, 9
  // Ticket 3: 2, 3, 10, 11, 12, 13
  // Ticket 4: 4, 5, 6, 7, 14, 15
  // Ticket 5: 0, 2, 8, 10, 12, 14
  // Ticket 6: 1, 3, 9, 11, 13, 15
  // Ticket 7: 4, 6, 8, 10, 13, 15
  // Ticket 8: 5, 7, 9, 11, 12, 14
  // What about 10-ticket wheel?
  // Let's test across all draws!
  
  const wheel8 = [
    [0, 1, 2, 3, 4, 5],
    [0, 1, 6, 7, 8, 9],
    [2, 3, 10, 11, 12, 13],
    [4, 5, 6, 7, 14, 15],
    [0, 2, 8, 10, 12, 14],
    [1, 3, 9, 11, 13, 15],
    [4, 6, 8, 10, 13, 15],
    [5, 7, 9, 11, 12, 14]
  ];

  // Let's test a balanced 10-ticket covering wheel on 16 numbers:
  // Every pair covered, maximum triplet coverage
  const wheel10 = [
    [0, 1, 2, 3, 4, 5],
    [0, 1, 6, 7, 8, 9],
    [2, 3, 6, 7, 10, 11],
    [4, 5, 8, 9, 12, 13],
    [0, 2, 10, 12, 14, 15],
    [1, 3, 11, 13, 14, 15],
    [0, 4, 6, 10, 13, 14],
    [1, 5, 7, 11, 12, 15],
    [2, 4, 8, 11, 12, 14],
    [3, 5, 9, 10, 13, 15]
  ];

  // Let's test a balanced 10-ticket covering wheel on 18 numbers:
  // Partition 18 numbers into 3 groups of 6: A=(0..5), B=(6..11), C=(12..17)
  // Tickets combining halves of A, B, C:
  const wheel18_10 = [
    [0, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17],
    [0, 1, 2, 6, 7, 8],
    [3, 4, 5, 9, 10, 11],
    [0, 1, 2, 12, 13, 14],
    [3, 4, 5, 15, 16, 17],
    [6, 7, 8, 12, 13, 14],
    [9, 10, 11, 15, 16, 17],
    [0, 3, 6, 9, 12, 15]
  ];

  console.log("Testing wheels...");
}

run();
