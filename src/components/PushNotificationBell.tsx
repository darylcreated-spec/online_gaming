"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, Check, RefreshCw } from "lucide-react";
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
        setFeedback("Draw alerts disabled.");
      } else {
        setFeedback(res.error || "Failed to unsubscribe.");
      }
    } else {
      const res = await subscribeToPushNotifications();
      if (res.success) {
        setIsSubscribed(true);
        setFeedback("Draw alerts activated!");
        // Trigger test notification
        try {
          await fetch("/api/push/test", { method: "POST" });
        } catch {
          // ignore
        }
      } else {
        setFeedback(res.error || "Permission required to receive alerts.");
      }
    }

    setIsLoading(false);
    setTimeout(() => setFeedback(null), 3500);
  };

  if (!isSupported) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        title={isSubscribed ? "Live Draw Alerts Active (Click to mute)" : "Enable Instant Live Draw Alerts"}
        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
          isSubscribed
            ? "bg-emerald-950/70 border-emerald-400/80 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-900/50"
            : "bg-slate-900/80 border-slate-700 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-300"
        }`}
      >
        {isLoading ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        ) : isSubscribed ? (
          <BellRing className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        ) : (
          <Bell className="w-3.5 h-3.5 text-slate-400" />
        )}
        <span className="hidden sm:inline">
          {isSubscribed ? "Draw Alerts Active" : "Get Draw Alerts"}
        </span>
      </button>

      {feedback && (
        <div className="absolute right-0 top-full mt-2 w-48 p-2 rounded-xl bg-slate-950 border border-cyan-500/40 text-[11px] text-cyan-300 shadow-xl z-50 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{feedback}</span>
          </div>
        </div>
      )}
    </div>
  );
}
