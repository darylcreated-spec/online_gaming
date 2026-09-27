import { NextRequest, NextResponse } from "next/server";
import { getPredictionAuditLedger, reconcilePredictionAudits } from "@/lib/prediction_audit_engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get("game") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100;

    const data = await getPredictionAuditLedger(game, limit);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...data
    });
  } catch (error: any) {
    console.error("Prediction audit GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await reconcilePredictionAudits();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error: any) {
    console.error("Prediction audit POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
