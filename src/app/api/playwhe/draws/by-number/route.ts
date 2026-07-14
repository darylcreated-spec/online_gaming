import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const drawNumStr = searchParams.get("number") || "";
    const dateStr = searchParams.get("date") || "";
    const timeSlot = searchParams.get("timeSlot") || "";

    if (drawNumStr) {
      const drawNum = parseInt(drawNumStr);
      if (isNaN(drawNum)) {
        return NextResponse.json({ success: false, error: "Invalid draw number" }, { status: 400 });
      }
      
      const sql = "SELECT * FROM playwhe_draws WHERE draw_number = ? LIMIT 1";
      const result = await query<any>(sql, [drawNum]);
      
      if (result.length > 0) {
        return NextResponse.json({ success: true, draw: result[0] });
      } else {
        return NextResponse.json({ success: false, error: "Draw not found" });
      }
    } else if (dateStr && timeSlot) {
      // Find by date and time slot (case-insensitive)
      const sql = "SELECT * FROM playwhe_draws WHERE draw_date = ? AND LOWER(draw_time_slot) = ? LIMIT 1";
      const result = await query<any>(sql, [dateStr, timeSlot.toLowerCase()]);
      
      if (result.length > 0) {
        return NextResponse.json({ success: true, draw: result[0] });
      } else {
        return NextResponse.json({ success: false, error: "Draw not found for this date and time slot" });
      }
    }

    return NextResponse.json({ success: false, error: "Missing query parameters" }, { status: 400 });
  } catch (error: any) {
    console.error("[API /api/playwhe/draws/by-number] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
