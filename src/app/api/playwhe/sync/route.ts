import { syncPlayWhe } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Verify secret if set in environment (production security)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const full = !!body.full;
    const year = body.year ? parseInt(body.year) : undefined;
    
    console.log(`[API /api/playwhe/sync] Triggering Play Whe sync (full=${full}, year=${year})...`);
    const result = await syncPlayWhe(full, year);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[API /api/playwhe/sync] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
