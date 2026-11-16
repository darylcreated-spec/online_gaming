import { NextResponse } from "next/server";
import { syncLatestFastCash } from "@/lib/fastcash_scraper";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const maxPagesParam = parseInt(searchParams.get("pages") || "10", 10);
    const maxPages = Number.isFinite(maxPagesParam) ? Math.min(25, Math.max(1, maxPagesParam)) : 10;

    const result = await syncLatestFastCash(maxPages);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("[API /api/fastcash/sync] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync Fast Cash draws" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
