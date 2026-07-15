import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const search = searchParams.get("search") || "";
    const numberFilter = searchParams.get("number") || "";
    
    const offset = (page - 1) * limit;
    
    let whereClause = "";
    const args: any[] = [];
    
    // Build search filters
    if (search) {
      whereClause = "WHERE draw_number LIKE ? OR draw_date LIKE ?";
      args.push(`%${search}%`, `%${search}%`);
    }
    
    if (numberFilter) {
      const num = parseInt(numberFilter);
      if (!isNaN(num)) {
        if (whereClause) {
          whereClause += " AND (num1 = ? OR num2 = ? OR num3 = ? OR num4 = ? OR num5 = ?)";
        } else {
          whereClause = "WHERE (num1 = ? OR num2 = ? OR num3 = ? OR num4 = ? OR num5 = ?)";
        }
        args.push(num, num, num, num, num);
      }
    }
    
    // 1. Get total count
    const countSql = `SELECT COUNT(*) as count FROM draws ${whereClause}`;
    const countResult = await query<{ count: number }>(countSql, args);
    const total = countResult[0]?.count || 0;
    
    // 2. Get paginated draws
    const selectSql = `
      SELECT * FROM draws 
      ${whereClause} 
      ORDER BY CAST(draw_number AS INTEGER) DESC 
      LIMIT ? OFFSET ?
    `;
    const draws = await query(selectSql, [...args, limit, offset]);
    const pages = Math.ceil(total / limit);
    
    return NextResponse.json({
      success: true,
      draws,
      pagination: {
        total,
        page,
        limit,
        pages
      }
    });
  } catch (error: any) {
    console.error("[API /api/draws] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
