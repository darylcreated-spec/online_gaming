import { NextRequest, NextResponse } from "next/server";
import { broadcastDrawNotification } from "@/lib/pushNotifications";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const res = await broadcastDrawNotification({
      title: "🎯 NLCB Live Alerts Active",
      body: "You will receive instant notifications whenever official winning numbers are drawn!",
      url: "/"
    });

    return NextResponse.json({
      success: true,
      message: `Test broadcast completed: ${res.sent} sent, ${res.failed} failed.`,
      stats: res
    });
  } catch (error: any) {
    console.error("[API Push Test] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
