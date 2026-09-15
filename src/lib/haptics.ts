/**
 * haptics.ts — Mobile Haptic Feedback Engine
 * The Win Concept Lottery Analytics Platform
 *
 * Utilizes the Web Vibration API (navigator.vibrate) to provide tactile feedback
 * for interactive drawing, ball agitation, and combinatorial ticket compilation.
 * Gracefully no-ops on desktop and devices without vibration hardware.
 */

export type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "selection" | number | number[];

export function triggerHaptic(style: HapticStyle = "light"): void {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  try {
    if (typeof style === "number" || Array.isArray(style)) {
      navigator.vibrate(style);
      return;
    }

    switch (style) {
      case "light":
        navigator.vibrate(10);
        break;
      case "selection":
        navigator.vibrate(15);
        break;
      case "medium":
        navigator.vibrate(30);
        break;
      case "heavy":
        navigator.vibrate(55);
        break;
      case "success":
        navigator.vibrate([15, 35, 20]);
        break;
      case "warning":
        navigator.vibrate([40, 40, 40]);
        break;
      default:
        navigator.vibrate(12);
    }
  } catch (err) {
    // Vibration API blocked by permissions or device in low-power mode
  }
}
