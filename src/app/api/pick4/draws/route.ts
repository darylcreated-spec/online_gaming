import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const search = searchParams.get("search") || "";
    const slotFilter = searchParams.get("slot") || "";
    const digitFilter = searchParams.get("digit") || "";
    
    const offset = (page - 1) * limit;
    
    let whereConditions: string[] = [];
    const args: any[] = [];
    
    if (search) {
      whereConditions.push("(draw_number LIKE ? OR draw_date LIKE ?)");
      args.push(`%${search}%`, `%${search}%`);
    }

    if (slotFilter) {
      whereConditions.push("draw_time_slot = ?");
      args.push(slotFilter.toUpperCase());
    }
    
    if (digitFilter) {
      const d = parseInt(digitFilter);
      if (!isNaN(d)) {
        whereConditions.push("(digit1 = ? OR digit2 = ? OR digit3 = ? OR digit4 = ?)");
        args.push(d, d, d, d);
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
    
    const countSql = `SELECT COUNT(*) as count FROM pick4_draws ${whereClause}`;
    const countResult = await query<{ count: number }>(countSql, args);
    const total = countResult[0]?.count || 0;
    
    const selectSql = `
      SELECT * FROM pick4_draws 
      ${whereClause} 
      ORDER BY CAST(draw_number AS INTEGER) DESC 
      LIMIT ? OFFSET ?
    `;
    const draws = await query(selectSql, [...args, limit, offset]);
    const pages = Math.ceil(total / limit);
    
    return NextResponse.json(
      {
        success: true,
        draws,
        pagination: {
          total,
          page,
          limit,
          pages
        }
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          "Pragma": "no-cache"
        }
      }
    );
  } catch (error: any) {
    console.error("[API /api/pick4/draws] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
