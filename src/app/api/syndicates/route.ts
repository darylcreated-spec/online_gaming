import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Helper to generate a collision-resistant code e.g. "WIN-8842"
function generateSyndicateCode(): string {
  const randomNum = crypto.randomInt(1000, 10000);
  return `WIN-${randomNum}`;
}

// GET: Fetch syndicates list or fetch single syndicate by ?code=WIN-XXXX
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim().toUpperCase();

    if (code) {
      // 1. Fetch syndicate by code
      const syndRes = await db.execute({
        sql: "SELECT * FROM syndicates WHERE UPPER(code) = ? LIMIT 1",
        args: [code]
      });

      if (syndRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Syndicate not found" }, { status: 404 });
      }

      const rawSynd: any = syndRes.rows[0];
      const syndicate = {
        id: Number(rawSynd.id ?? rawSynd[0]),
        code: String(rawSynd.code ?? rawSynd[1]),
        name: String(rawSynd.name ?? rawSynd[2]),
        creator_name: String(rawSynd.creator_name ?? rawSynd[3]),
        game_type: String(rawSynd.game_type ?? rawSynd[4]),
        target_draw_date: String(rawSynd.target_draw_date ?? rawSynd[5]),
        total_stake: Number(rawSynd.total_stake ?? rawSynd[6]) || 0,
        ticket_count: Number(rawSynd.ticket_count ?? rawSynd[7]) || 0,
        notes: String(rawSynd.notes ?? rawSynd[8] ?? ""),
        created_at: String(rawSynd.created_at ?? rawSynd[9])
      };

      // Fetch members
      const membersRes = await db.execute({
        sql: "SELECT * FROM syndicate_members WHERE syndicate_id = ? ORDER BY id ASC",
        args: [syndicate.id]
      });

      const members = membersRes.rows.map((row: any) => ({
        id: Number(row.id ?? row[0]),
        syndicate_id: Number(row.syndicate_id ?? row[1]),
        member_name: String(row.member_name ?? row[2]),
        contribution_amount: Number(row.contribution_amount ?? row[3]),
        share_percentage: Number(row.share_percentage ?? row[4]),
        joined_at: String(row.joined_at ?? row[5])
      }));

      // Fetch tickets
      const ticketsRes = await db.execute({
        sql: "SELECT * FROM syndicate_tickets WHERE syndicate_id = ? ORDER BY id DESC",
        args: [syndicate.id]
      });

      const tickets = ticketsRes.rows.map((row: any) => ({
        id: Number(row.id ?? row[0]),
        syndicate_id: Number(row.syndicate_id ?? row[1]),
        game_type: String(row.game_type ?? row[2]),
        numbers: String(row.numbers ?? row[3]),
        bonus: row.bonus !== null && row.bonus !== undefined ? String(row.bonus ?? row[4]) : null,
        cost: Number(row.cost ?? row[5]) || 0,
        created_at: String(row.created_at ?? row[6])
      }));

      return NextResponse.json({
        success: true,
        syndicate: {
          ...syndicate,
          members,
          tickets
        }
      });
    }

    // Fetch all syndicates (latest 20) in a single aggregated query (no N+1 loop)
    const listRes = await db.execute({
      sql: `
        SELECT s.id, s.code, s.name, s.creator_name, s.game_type, s.target_draw_date,
               s.total_stake, s.ticket_count, s.notes, s.created_at,
               COUNT(m.id) AS member_count
        FROM syndicates s
        LEFT JOIN syndicate_members m ON m.syndicate_id = s.id
        GROUP BY s.id
        ORDER BY s.id DESC
        LIMIT 20
      `
    });

    const syndicates = listRes.rows.map((rawSynd: any) => ({
      id: Number(rawSynd.id ?? rawSynd[0]),
      code: String(rawSynd.code ?? rawSynd[1]),
      name: String(rawSynd.name ?? rawSynd[2]),
      creator_name: String(rawSynd.creator_name ?? rawSynd[3]),
      game_type: String(rawSynd.game_type ?? rawSynd[4]),
      target_draw_date: String(rawSynd.target_draw_date ?? rawSynd[5]),
      total_stake: Number(rawSynd.total_stake ?? rawSynd[6]) || 0,
      ticket_count: Number(rawSynd.ticket_count ?? rawSynd[7]) || 0,
      notes: String(rawSynd.notes ?? rawSynd[8] ?? ""),
      created_at: String(rawSynd.created_at ?? rawSynd[9]),
      member_count: Number(rawSynd.member_count ?? rawSynd[10]) || 0
    }));

    return NextResponse.json(
      { success: true, syndicates },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error: any) {
    console.error("[API /api/syndicates GET Error]:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch syndicates" }, { status: 500 });
  }
}

// POST: Create syndicate, add member, or add ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Action 1: Create New Syndicate
    if (action === "create") {
      const { name, creator_name, game_type, target_draw_date, initial_contribution, notes } = body;

      if (!name || !creator_name) {
        return NextResponse.json({ success: false, error: "Name and creator name are required" }, { status: 400 });
      }

      let code = generateSyndicateCode();
      const rawInit = Number(initial_contribution);
      const initialContrib = Number.isFinite(rawInit) && rawInit > 0 ? Math.min(rawInit, 100000) : 50.0;

      // Retry code generation up to 5 times in case of UNIQUE code collision
      let insertRes: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          insertRes = await db.execute({
            sql: `INSERT INTO syndicates (code, name, creator_name, game_type, target_draw_date, total_stake, ticket_count, notes)
                  VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
            args: [
              code,
              String(name).trim().slice(0, 100),
              String(creator_name).trim().slice(0, 80),
              String(game_type || "lotto-plus").slice(0, 32),
              String(target_draw_date || "Next Draw").slice(0, 40),
              initialContrib,
              String(notes || "").slice(0, 500)
            ]
          });
          break;
        } catch (err: any) {
          if (attempt < 4 && String(err?.message || "").toLowerCase().includes("unique")) {
            code = generateSyndicateCode();
            continue;
          }
          throw err;
        }
      }

      const syndicateId = Number(insertRes.lastInsertRowid);

      // Add creator as first member with 100% initial share
      await db.execute({
        sql: `INSERT INTO syndicate_members (syndicate_id, member_name, contribution_amount, share_percentage)
              VALUES (?, ?, ?, 100.0)`,
        args: [syndicateId, `${creator_name.trim()} (Admin)`, initialContrib]
      });

      return NextResponse.json({
        success: true,
        message: "Syndicate created successfully!",
        syndicate: { id: syndicateId, code, name }
      });
    }

    // Action 2: Add Member to Existing Syndicate
    if (action === "add_member") {
      const { syndicate_id, member_name, contribution_amount } = body;

      if (!syndicate_id || !member_name || !contribution_amount) {
        return NextResponse.json({ success: false, error: "Missing required member fields" }, { status: 400 });
      }

      const contrib = Number(contribution_amount);
      if (!Number.isFinite(contrib) || contrib <= 0 || contrib > 100000) {
        return NextResponse.json(
          { success: false, error: "Contribution must be between $1 and $100,000 TTD." },
          { status: 400 }
        );
      }

      // Add member
      await db.execute({
        sql: `INSERT INTO syndicate_members (syndicate_id, member_name, contribution_amount, share_percentage)
              VALUES (?, ?, ?, 0)`,
        args: [syndicate_id, String(member_name).trim().slice(0, 80), contrib]
      });

      // Recalculate total stake and all share percentages for this syndicate in a single batch
      const allMembersRes = await db.execute({
        sql: "SELECT id, contribution_amount FROM syndicate_members WHERE syndicate_id = ?",
        args: [syndicate_id]
      });

      let newTotalStake = 0;
      allMembersRes.rows.forEach((r: any) => {
        const val = Number(r.contribution_amount ?? r[1]);
        if (Number.isFinite(val) && val > 0) newTotalStake += val;
      });

      if (newTotalStake > 0) {
        const batchStmts = (allMembersRes.rows as any[]).map((r) => {
          const memId = Number(r.id ?? r[0]);
          const memContrib = Math.max(0, Number(r.contribution_amount ?? r[1]) || 0);
          const newPct = Math.round((memContrib / newTotalStake) * 10000) / 100;
          return {
            sql: "UPDATE syndicate_members SET share_percentage = ? WHERE id = ?",
            args: [newPct, memId]
          };
        });
        batchStmts.push({
          sql: "UPDATE syndicates SET total_stake = ? WHERE id = ?",
          args: [newTotalStake, syndicate_id]
        });
        await db.batch(batchStmts, "write");
      }

      return NextResponse.json({ success: true, message: "Member joined syndicate successfully!" });
    }

    // Action 3: Add Pooled Ticket to Syndicate
    if (action === "add_ticket") {
      const { syndicate_id, game_type, numbers, bonus, cost } = body;

      if (!syndicate_id || !numbers) {
        return NextResponse.json({ success: false, error: "Missing required ticket fields" }, { status: 400 });
      }

      const ticketCost = Number(cost) || 10.0;

      await db.execute({
        sql: `INSERT INTO syndicate_tickets (syndicate_id, game_type, numbers, bonus, cost)
              VALUES (?, ?, ?, ?, ?)`,
        args: [syndicate_id, game_type || "lotto-plus", numbers.trim(), bonus ? String(bonus).trim() : null, ticketCost]
      });

      // Increment ticket count on syndicate
      await db.execute({
        sql: "UPDATE syndicates SET ticket_count = ticket_count + 1 WHERE id = ?",
        args: [syndicate_id]
      });

      return NextResponse.json({ success: true, message: "Ticket added to syndicate pool!" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[API /api/syndicates POST Error]:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to process request" }, { status: 500 });
  }
}
