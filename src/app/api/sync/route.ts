import { syncLatest } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function runSync(full: boolean, year?: number, authHeader?: string | null) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  console.log(`[API /api/sync] Triggering sync (full=${full}, year=${year})...`);
  const result = await syncLatest(full, year);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const body = await request.json().catch(() => ({}));
    const full = !!body.full;
    const year = body.year ? parseInt(body.year) : undefined;
    return await runSync(full, year, authHeader);
  } catch (error: any) {
    console.error("[API /api/sync] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const { searchParams } = new URL(request.url);
    const full = searchParams.get("full") === "true";
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
    return await runSync(full, year, authHeader);
  } catch (error: any) {
    console.error("[API /api/sync] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
