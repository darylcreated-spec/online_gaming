import { NextResponse } from "next/server";
import { runDrawWatchdog } from "@/lib/draw_watchdog";
import { reconcileRecentDrawGaps } from "@/lib/scraper";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await runDrawWatchdog();
    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"
      }
    });
  } catch (error: any) {
    console.error("[API /api/watchdog] Error:", error);
    return NextResponse.json(
      { status: "CRITICAL", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const report = await runDrawWatchdog();
    let reconciliationResult = null;

    if (report.sequenceGapsCount > 0 || report.laggingGamesCount > 0) {
      console.log("[Watchdog POST] Gaps or lag detected. Running sequence reconciliation...");
      reconciliationResult = await reconcileRecentDrawGaps();
    }

    const updatedReport = await runDrawWatchdog();

    return NextResponse.json({
      success: true,
      initialStatus: report.status,
      finalStatus: updatedReport.status,
      reconciliation: reconciliationResult,
      report: updatedReport
    });
  } catch (error: any) {
    console.error("[API /api/watchdog POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
