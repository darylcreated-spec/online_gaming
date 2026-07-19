import { syncPlayWhe } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function runSync(full: boolean, year?: number, authHeader?: string | null, secretParam?: string | null) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  console.log(`[API /api/playwhe/sync] Triggering Play Whe sync (full=${full}, year=${year})...`);
  const result = await syncPlayWhe(full, year);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const body = await request.json().catch(() => ({}));
    const full = !!body.full;
    const year = body.year ? parseInt(body.year) : undefined;
    const secretParam = body.secret || new URL(request.url).searchParams.get("secret");
    return await runSync(full, year, authHeader, secretParam);
  } catch (error: any) {
    console.error("[API /api/playwhe/sync] Error:", error);
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
    const secretParam = searchParams.get("secret");
    return await runSync(full, year, authHeader, secretParam);
  } catch (error: any) {
    console.error("[API /api/playwhe/sync] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
