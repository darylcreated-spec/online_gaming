import { NextRequest, NextResponse } from "next/server";
import { broadcastDrawNotification } from "@/lib/pushNotifications";
import { isAuthorizedCronRequest, unauthorizedResponse } from "@/lib/cron_auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!isAuthorizedCronRequest(request, body?.secret)) {
      return unauthorizedResponse("Admin CRON_SECRET required to broadcast a test push notification.");
    }

    const res = await broadcastDrawNotification({
      title: "NLCB Live Alerts Active",
      body: "You will receive instant notifications whenever official winning numbers are drawn!",
      url: "/"
    });

    return NextResponse.json(
      {
        success: true,
        message: `Test broadcast completed: ${res.sent} sent, ${res.failed} failed.`,
        stats: res
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("[API Push Test] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
