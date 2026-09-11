import { syncPick4 } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function runSync(full: boolean, year?: number, authHeader?: string | null, secretParam?: string | null, fullSecretParam?: string | null) {
  if (full || year !== undefined) {
    const fullSyncSecret = process.env.FULL_SYNC_SECRET || "daryl.created@gmail.com";
    if (fullSecretParam !== fullSyncSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized: Full sync password required" }, { status: 401 });
    }
  }

  console.log(`[API /api/pick4/sync] Triggering Pick 4 sync (full=${full}, year=${year})...`);
  const result = await syncPick4(full, year);
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
    console.error("[API /api/pick4/sync] Error:", error);
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
    console.error("[API /api/pick4/sync] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
