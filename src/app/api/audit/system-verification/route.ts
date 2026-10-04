import { NextRequest, NextResponse } from "next/server";
import { SystemAuditVerifier } from "@/lib/system_audit_verifier";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const report = await SystemAuditVerifier.runFullAudit();

    return NextResponse.json({
      success: true,
      report
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error: any) {
    console.error("[SystemAuditVerifier API Error]:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to execute System Verification Audit"
    }, { status: 500 });
  }
}
