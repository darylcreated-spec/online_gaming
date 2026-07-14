import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const numParam = searchParams.get("number");
    const dateParam = searchParams.get("date");

    if (!numParam && !dateParam) {
      return NextResponse.json(
        { success: false, error: "Please specify a draw number or date parameter." },
        { status: 400 }
      );
    }

    let sql = "";
    const args: any[] = [];

    if (numParam) {
      const num = parseInt(numParam);
      if (isNaN(num)) {
        return NextResponse.json({ success: false, error: "Invalid draw number format." }, { status: 400 });
      }
      sql = "SELECT * FROM draws WHERE draw_number = ?";
      args.push(num);
    } else if (dateParam) {
      sql = "SELECT * FROM draws WHERE draw_date = ?";
      args.push(dateParam);
    }

    console.log(`[API /api/draws/by-number] Searching draw (number=${numParam}, date=${dateParam})...`);
    const draws = await query<any>(sql, args);

    if (draws.length === 0) {
      return NextResponse.json({ success: false, error: "Draw not found in database." }, { status: 404 });
    }

    return NextResponse.json({ success: true, draw: draws[0] });
  } catch (error: any) {
    console.error("[API /api/draws/by-number] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
