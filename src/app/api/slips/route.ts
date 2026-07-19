import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const slips = await query("SELECT * FROM saved_slips ORDER BY created_at DESC");
    return NextResponse.json({ success: true, slips });
  } catch (error: any) {
    console.error("[API /api/slips] Error GET:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, game_type, numbers, powerball } = body;
    
    if (!name || !game_type || !numbers) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, game_type, numbers" },
        { status: 400 }
      );
    }

    await query(
      "INSERT INTO saved_slips (name, game_type, numbers, powerball) VALUES (?, ?, ?, ?)",
      [name, game_type, numbers, powerball !== undefined ? powerball : null]
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API /api/slips] Error POST:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing slip id" },
        { status: 400 }
      );
    }

    await query("DELETE FROM saved_slips WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API /api/slips] Error DELETE:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
