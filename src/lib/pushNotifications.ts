import webpush from "web-push";
import { db } from "./db";

const DEFAULT_VAPID_PUBLIC_KEY = "BHnh6uCqnpcUhimHv-LIWRGEgclaL6jPez4GK8hGbhQ7k9vJfR7hiGlp_nSiXwVz-J5Wyt1c_E4ItNHwctNFyQA";
const DEFAULT_VAPID_SUBJECT = "mailto:admin@onlineresults.tt";

const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY).trim();
const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
const subject = (process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT).trim();

const ALLOWED_PUSH_HOST_SUFFIXES = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
  "push.apple.com",
  "notify.windows.com",
  "wns.windows.com"
];

export function isValidPushEndpoint(endpoint: string): boolean {
  if (!endpoint || typeof endpoint !== "string" || endpoint.length > 2048) return false;
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_PUSH_HOST_SUFFIXES.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (e: any) {
    console.warn("[PushNotifications] VAPID initialization warning:", e.message);
  }
} else {
  console.warn("[PushNotifications] VAPID_PRIVATE_KEY env var is not set; outbound push delivery disabled.");
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  games?: string;
}

export async function savePushSubscription(sub: PushSubscriptionData): Promise<boolean> {
  try {
    await db.execute({
      sql: `
        INSERT INTO user_push_subscriptions (endpoint, p256dh, auth, games)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(endpoint) DO UPDATE SET
          p256dh = excluded.p256dh,
          auth = excluded.auth,
          games = excluded.games
      `,
      args: [sub.endpoint, sub.keys.p256dh, sub.keys.auth, sub.games || "all"]
    });
    return true;
  } catch (err: any) {
    console.error("[PushNotifications] Error saving subscription:", err);
    return false;
  }
}

export async function removePushSubscription(endpoint: string): Promise<boolean> {
  try {
    await db.execute({
      sql: "DELETE FROM user_push_subscriptions WHERE endpoint = ?",
      args: [endpoint]
    });
    return true;
  } catch (err: any) {
    console.error("[PushNotifications] Error deleting subscription:", err);
    return false;
  }
}

export async function broadcastDrawNotification(payload: {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  game?: string;
  drawNumber?: number;
}): Promise<{ sent: number; failed: number; cleaned: number }> {
  try {
    const res = await db.execute("SELECT id, endpoint, p256dh, auth, games FROM user_push_subscriptions");
    const subscribers = res.rows as any[];

    if (!subscribers || subscribers.length === 0) {
      return { sent: 0, failed: 0, cleaned: 0 };
    }

    let sent = 0;
    let failed = 0;
    let cleaned = 0;

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      url: payload.url || "/",
      data: {
        game: payload.game,
        drawNumber: payload.drawNumber,
        timestamp: Date.now()
      }
    });

    const deadEndpoints: string[] = [];

    await Promise.allSettled(
      subscribers.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, notificationPayload);
          sent++;
        } catch (err: any) {
          failed++;
          // 404 or 410 means the user unsubscribed or endpoint is expired
          if (err.statusCode === 404 || err.statusCode === 410) {
            deadEndpoints.push(sub.endpoint);
          } else {
            console.warn(`[PushNotifications] Delivery failed for ${sub.endpoint.slice(0, 30)}...:`, err.message);
          }
        }
      })
    );

    // Prune dead subscriptions
    if (deadEndpoints.length > 0) {
      for (const ep of deadEndpoints) {
        await removePushSubscription(ep);
        cleaned++;
      }
    }

    console.log(`[PushNotifications] Broadcast complete: ${sent} sent, ${failed} failed, ${cleaned} pruned.`);
    return { sent, failed, cleaned };
  } catch (error: any) {
    console.error("[PushNotifications] Broadcast error:", error);
    return { sent: 0, failed: 0, cleaned: 0 };
  }
}
