import { NextResponse } from "next/server";
import { runFastCashEngine } from "@/lib/fastcash_engine";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const depthParam = parseInt(searchParams.get("depth") || "200", 10);
    const limitParam = parseInt(searchParams.get("limit") || "6000", 10);

    const report = await runFastCashEngine({
      depth: Number.isFinite(depthParam) ? depthParam : 200,
      limit: Number.isFinite(limitParam) ? limitParam : 6000
    });

    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("[API /api/fastcash/engine] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to run Fast Cash engine" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
