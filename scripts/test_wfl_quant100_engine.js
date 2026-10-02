const { createClient } = require('@libsql/client');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/TURSO_DATABASE_URL=(.+)/)[1].trim();
const token = env.match(/TURSO_AUTH_TOKEN=(.+)/)[1].trim();
const db = createClient({ url, authToken: token });

async function testLib() {
  const res = await db.execute(`
    SELECT draw_number, draw_date, num1, num2, num3, num4, num5, num6 
    FROM winforlife_draws 
    ORDER BY CAST(draw_number AS INTEGER) ASC
  `);

  const { computeWinForLifeQuant100Engine } = require('../src/lib/winforlife_quant100_engine');
  const result = computeWinForLifeQuant100Engine(res.rows);

  console.log("Engine:", result.engineName);
  console.log("Target Draw:", result.targetDrawNumber);
  console.log("Last Draw:", result.lastVerifiedDraw);
  console.log("\n5 QUANT SETS (Excluding Cash Ball):");
  result.theFiveQuantSets.forEach((s, idx) => {
    console.log(`Set ${idx+1} [${s.name}]:`, s.numbers, `(Sum: ${s.sum}, Parity: ${s.oddEvenRatio}, CRT: ${s.crtSignature})`);
    // verify 6 distinct numbers
    const uniq = new Set(s.numbers);
    if (uniq.size !== 6) console.error("ERROR: DUPLICATE FOUND IN SET", s.numbers);
    if (s.numbers.some(n => n < 1 || n > 28)) console.error("ERROR: OUT OF BOUNDS NUMBER IN SET", s.numbers);
  });

  console.log("\nMaster Manifold:", result.masterAttractorManifold);
  console.log("Audited Draws:", result.auditVerification.totalDrawsAudited);
  console.log("Hit Rates:", result.auditVerification.bestTicketHitRates);
  console.log("Recent Audit Sample (latest 3):");
  result.auditVerification.recentAuditLog.slice(0, 3).forEach(a => {
    console.log(`Draw #${a.drawNumber} (${a.drawDate}): Actual=${a.actualNumbers} | Best=${a.bestTicketHit} (${a.bestSetName}) | ManifoldHits=${a.attractorManifoldHits} | Invariant=${a.invariantCompliant}`);
  });
}

testLib().catch(console.error);
