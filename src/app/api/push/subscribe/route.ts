import { NextRequest, NextResponse } from "next/server";
import {
  isValidPushEndpoint,
  savePushSubscription,
  removePushSubscription
} from "@/lib/pushNotifications";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, keys, games } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { success: false, error: "Invalid push subscription object" },
        { status: 400 }
      );
    }

    if (!isValidPushEndpoint(endpoint)) {
      return NextResponse.json(
        { success: false, error: "Unsupported or non-HTTPS Web Push endpoint host." },
        { status: 400 }
      );
    }

    const saved = await savePushSubscription({
      endpoint,
      keys: {
        p256dh: String(keys.p256dh).slice(0, 512),
        auth: String(keys.auth).slice(0, 256)
      },
      games: typeof games === "string" ? games.slice(0, 120) : "all"
    });
    if (!saved) {
      return NextResponse.json(
        { success: false, error: "Failed to persist subscription in database" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Push notifications successfully enabled for NLCB live draws!"
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("[API Push Subscribe] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint || !isValidPushEndpoint(endpoint)) {
      return NextResponse.json(
        { success: false, error: "Valid push subscription endpoint is required" },
        { status: 400 }
      );
    }

    await removePushSubscription(endpoint);
    return NextResponse.json(
      {
        success: true,
        message: "Push notifications successfully disabled."
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("[API Push Unsubscribe] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
