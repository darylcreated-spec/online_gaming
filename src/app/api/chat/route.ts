import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Fetch latest 50 community chat messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameTag = searchParams.get("tag")?.trim().toUpperCase();

    let sql = "SELECT * FROM community_chat ORDER BY id DESC LIMIT 50";
    let args: any[] = [];

    if (gameTag && gameTag !== "ALL") {
      sql = "SELECT * FROM community_chat WHERE UPPER(game_tag) = ? OR game_tag = 'ALL' ORDER BY id DESC LIMIT 50";
      args = [gameTag];
    }

    const res = await db.execute({ sql, args });

    const messages = res.rows.map((row: any) => ({
      id: Number(row.id ?? row[0]),
      user_name: String(row.user_name ?? row[1]),
      message: String(row.message ?? row[2]),
      game_tag: String(row.game_tag ?? row[3] ?? "ALL"),
      lucky_numbers: row.lucky_numbers ? String(row.lucky_numbers ?? row[4]) : null,
      created_at: String(row.created_at ?? row[5])
    })).reverse(); // Oldest to newest for chat flow

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    console.error("[API /api/chat GET Error]:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to load chat messages" }, { status: 500 });
  }
}

// POST: Post a new message to the community chat
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_name, message, game_tag, lucky_numbers } = body;

    if (!user_name || !message || !message.trim()) {
      return NextResponse.json({ success: false, error: "Username and message are required" }, { status: 400 });
    }

    const cleanUser = user_name.trim().slice(0, 30);
    const cleanMsg = message.trim().slice(0, 500);
    const cleanTag = (game_tag || "ALL").toUpperCase();
    const cleanLucky = lucky_numbers ? String(lucky_numbers).trim().slice(0, 50) : null;

    const insertRes = await db.execute({
      sql: `INSERT INTO community_chat (user_name, message, game_tag, lucky_numbers)
            VALUES (?, ?, ?, ?)`,
      args: [cleanUser, cleanMsg, cleanTag, cleanLucky]
    });

    return NextResponse.json({
      success: true,
      message: "Message posted successfully!",
      id: Number(insertRes.lastInsertRowid)
    });
  } catch (error: any) {
    console.error("[API /api/chat POST Error]:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to post message" }, { status: 500 });
  }
}
