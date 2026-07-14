import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countParam = searchParams.get("count") || "5";
    const count = Math.min(50, Math.max(1, parseInt(countParam)));

    if (isNaN(count)) {
      return NextResponse.json(
        { success: false, error: "Invalid count parameter." },
        { status: 400 }
      );
    }

    // Retrieve random eligible combinations
    const sql = `
      SELECT num1, num2, num3, num4, num5 
      FROM eligible_combinations 
      ORDER BY RANDOM() 
      LIMIT ?
    `;
    const rows = await query<any>(sql, [count]);

    const combinations = rows.map(row => [
      Number(row.num1),
      Number(row.num2),
      Number(row.num3),
      Number(row.num4),
      Number(row.num5)
    ]);

    return NextResponse.json({
      success: true,
      combinations
    });
  } catch (error: any) {
    console.error("[API /api/combinations/sample] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
