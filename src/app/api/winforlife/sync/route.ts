import { syncWinForLife } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function runSync(full: boolean, year?: number, authHeader?: string | null, secretParam?: string | null, fullSecretParam?: string | null) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && secretParam !== cronSecret) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  if (full || year !== undefined) {
    const fullSyncSecret = process.env.FULL_SYNC_SECRET || "daryl.created@gmail.com";
    if (fullSecretParam !== fullSyncSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized: Full sync password required" }, { status: 401 });
    }
  }

  console.log(`[API /api/winforlife/sync] Triggering Win for Life sync (full=${full}, year=${year})...`);
  const result = await syncWinForLife(full, year);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const body = await request.json().catch(() => ({}));
    const full = !!body.full;
    const year = body.year ? parseInt(body.year) : undefined;
    const secretParam = body.secret || new URL(request.url).searchParams.get("secret");
    const fullSecretParam = body.fullSecret || new URL(request.url).searchParams.get("fullSecret");
    return await runSync(full, year, authHeader, secretParam, fullSecretParam);
  } catch (error: any) {
    console.error("[API /api/winforlife/sync] Error:", error);
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
    const fullSecretParam = searchParams.get("fullSecret");
    return await runSync(full, year, authHeader, secretParam, fullSecretParam);
  } catch (error: any) {
    console.error("[API /api/winforlife/sync] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
