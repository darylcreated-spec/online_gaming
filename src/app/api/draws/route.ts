import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const page = Number.isFinite(parsedPage) ? Math.max(1, Math.min(10000, parsedPage)) : 1;
    // Allow up to 5000 for BuilderTab historical archive load
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(5000, parsedLimit)) : 20;
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
      ORDER BY draw_number DESC 
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
    console.error("[API /api/draws] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
