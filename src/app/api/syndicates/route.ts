import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Helper to generate a random 4-digit code e.g. "WIN-8842"
function generateSyndicateCode(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
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

    // Fetch all syndicates (latest 20)
    const listRes = await db.execute({
      sql: "SELECT * FROM syndicates ORDER BY id DESC LIMIT 20"
    });

    const syndicates = await Promise.all(
      listRes.rows.map(async (rawSynd: any) => {
        const id = Number(rawSynd.id ?? rawSynd[0]);
        const membersCountRes = await db.execute({
          sql: "SELECT COUNT(*) as count FROM syndicate_members WHERE syndicate_id = ?",
          args: [id]
        });
        const memberCount = Number(membersCountRes.rows[0]?.count ?? membersCountRes.rows[0]?.[0]) || 0;

        return {
          id,
          code: String(rawSynd.code ?? rawSynd[1]),
          name: String(rawSynd.name ?? rawSynd[2]),
          creator_name: String(rawSynd.creator_name ?? rawSynd[3]),
          game_type: String(rawSynd.game_type ?? rawSynd[4]),
          target_draw_date: String(rawSynd.target_draw_date ?? rawSynd[5]),
          total_stake: Number(rawSynd.total_stake ?? rawSynd[6]) || 0,
          ticket_count: Number(rawSynd.ticket_count ?? rawSynd[7]) || 0,
          notes: String(rawSynd.notes ?? rawSynd[8] ?? ""),
          created_at: String(rawSynd.created_at ?? rawSynd[9]),
          member_count: memberCount
        };
      })
    );

    return NextResponse.json({ success: true, syndicates });
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
      const initialContrib = Number(initial_contribution) || 50.0;

      const insertRes = await db.execute({
        sql: `INSERT INTO syndicates (code, name, creator_name, game_type, target_draw_date, total_stake, ticket_count, notes)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        args: [
          code,
          name.trim(),
          creator_name.trim(),
          game_type || "lotto-plus",
          target_draw_date || "Next Draw",
          initialContrib,
          notes || ""
        ]
      });

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
      if (contrib <= 0) {
        return NextResponse.json({ success: false, error: "Contribution must be greater than 0" }, { status: 400 });
      }

      // Add member
      await db.execute({
        sql: `INSERT INTO syndicate_members (syndicate_id, member_name, contribution_amount, share_percentage)
              VALUES (?, ?, ?, 0)`,
        args: [syndicate_id, member_name.trim(), contrib]
      });

      // Recalculate total stake and all share percentages for this syndicate
      const allMembersRes = await db.execute({
        sql: "SELECT id, contribution_amount FROM syndicate_members WHERE syndicate_id = ?",
        args: [syndicate_id]
      });

      let newTotalStake = 0;
      allMembersRes.rows.forEach((r: any) => {
        newTotalStake += Number(r.contribution_amount ?? r[1]) || 0;
      });

      for (const r of allMembersRes.rows as any[]) {
        const memId = Number(r.id ?? r[0]);
        const memContrib = Number(r.contribution_amount ?? r[1]) || 0;
        const newPct = Math.round((memContrib / newTotalStake) * 10000) / 100;
        await db.execute({
          sql: "UPDATE syndicate_members SET share_percentage = ? WHERE id = ?",
          args: [newPct, memId]
        });
      }

      // Update syndicate total stake
      await db.execute({
        sql: "UPDATE syndicates SET total_stake = ? WHERE id = ?",
        args: [newTotalStake, syndicate_id]
      });

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
