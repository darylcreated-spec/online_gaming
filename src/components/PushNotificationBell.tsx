"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellRing, Check, RefreshCw } from "lucide-react";
import {
  isPushNotificationSupported,
  getCurrentPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications
} from "@/lib/pushClient";

export default function PushNotificationBell() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      if (isPushNotificationSupported()) {
        setIsSupported(true);
        const sub = await getCurrentPushSubscription();
        setIsSubscribed(!!sub);
      }
    };
    checkStatus();
  }, []);

  const handleToggle = async () => {
    if (!isSupported) {
      alert("Push notifications are not supported in your current browser.");
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    if (isSubscribed) {
      const res = await unsubscribeFromPushNotifications();
      if (res.success) {
        setIsSubscribed(false);
        setFeedback("Draw alerts turned off.");
      } else {
        setFeedback(res.error || "Could not turn off alerts.");
      }
    } else {
      const res = await subscribeToPushNotifications();
      if (res.success) {
        setIsSubscribed(true);
        setFeedback("Draw alerts turned on.");
        // Show a local device confirmation only (never broadcast to all subscribers)
        try {
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("NLCB Live Alerts Active", {
              body: "You will receive instant notifications whenever official winning numbers are drawn!",
              icon: "/images/pwa-icon-192.png"
            });
          }
        } catch {
          // ignore
        }
      } else {
        setFeedback(res.error || "Browser permission is needed for alerts.");
      }
    }

    setIsLoading(false);
    setTimeout(() => setFeedback(null), 3500);
  };

  if (!isSupported) return null;

  return (
    <div className="relative inline-block font-sans">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        title={isSubscribed ? "Live draw alerts are on. Click to mute." : "Turn on live draw alerts"}
        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
          isSubscribed
            ? "bg-emerald-950/70 border-emerald-400/80 text-emerald-300 hover:bg-emerald-900/50"
            : "bg-slate-900/80 border-slate-700 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-300"
        }`}
      >
        {isLoading ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
        ) : isSubscribed ? (
          <BellRing className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <Bell className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        )}
        <span className="hidden lg:inline">
          {isSubscribed ? "Alerts On" : "Alerts"}
        </span>
      </button>

      {feedback && (
        <div className="absolute right-0 top-full mt-2 w-52 p-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs text-cyan-200 shadow-xl z-50">
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        </div>
      )}
    </div>
  );
}
