/**
 * draw_schedule.ts
 * Centralized NLCB Draw Schedules and AST (UTC-4) Countdown Calculation.
 * Covers: Play Whe, Lotto Plus, Win For Life, Cash Pot, and Pick 4.
 */

export interface DrawCountdown {
  targetLabel: string;
  targetDateStr: string;
  hours: string;
  minutes: string;
  seconds: string;
  totalSec: number;
  isUrgent: boolean;
}

export type SupportedGameKey = "play-whe" | "pick4" | "cashpot" | "lotto-plus" | "win-for-life";

export function calculateNextDrawCountdown(
  game: SupportedGameKey,
  nowUtc: Date = new Date()
): DrawCountdown {
  const astOffsetMs = -4 * 60 * 60 * 1000;
  const astNow = new Date(nowUtc.getTime() + astOffsetMs);

  let candidates: { diffMs: number; label: string; dateStr: string }[] = [];

  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const targetDate = new Date(astNow.getTime() + dayOffset * 86400000);
    const dayOfWeek = targetDate.getUTCDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    const y = targetDate.getUTCFullYear();
    const m = targetDate.getUTCMonth();
    const d = targetDate.getUTCDate();

    let times: [number, number, string][] = [];

    if (game === "play-whe") {
      // Monday to Sunday (Daily 4 draws: Morning, Midday, Afternoon, Evening)
      times = [
        [10, 30, "Morning (10:30 AM)"],
        [13, 0, "Midday (1:00 PM)"],
        [16, 0, "Afternoon (4:00 PM)"],
        [19, 0, "Evening (7:00 PM)"]
      ];
    } else if (game === "pick4") {
      // Monday to Sunday (Daily 4 draws: Morning, Midday, Afternoon, Evening)
      times = [
        [10, 30, "Morning (10:30 AM)"],
        [13, 0, "Midday (1:00 PM)"],
        [16, 0, "Afternoon (4:00 PM)"],
        [19, 0, "Evening (7:00 PM)"]
      ];
    } else if (game === "cashpot") {
      // Monday to Sunday (Daily Evening Draw at 7:00 PM)
      times = [
        [19, 0, "Evening (7:00 PM)"]
      ];
    } else if (game === "lotto-plus") {
      // Wednesday & Saturday
      if (dayOfWeek === 3 || dayOfWeek === 6) {
        times = [
          [20, 30, "Night Draw (8:30 PM)"]
        ];
      }
    } else if (game === "win-for-life") {
      // Tuesday & Friday
      if (dayOfWeek === 2 || dayOfWeek === 5) {
        times = [
          [19, 0, "Evening Draw (7:00 PM)"]
        ];
      }
    }

    for (const [h, min, label] of times) {
      const drawUtcMs = Date.UTC(y, m, d, h + 4, min, 0);
      const diffMs = drawUtcMs - nowUtc.getTime();
      if (diffMs > 0) {
        const dateStr = targetDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC"
        });
        candidates.push({ diffMs, label, dateStr });
      }
    }
    if (candidates.length > 0) break;
  }

  candidates.sort((a, b) => a.diffMs - b.diffMs);
  const next = candidates[0];

  if (!next) {
    return {
      targetLabel: "Scheduled Draw",
      targetDateStr: "Today",
      hours: "00",
      minutes: "00",
      seconds: "00",
      totalSec: 0,
      isUrgent: false
    };
  }

  const totalSec = Math.max(0, Math.floor(next.diffMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return {
    targetLabel: next.label,
    targetDateStr: next.dateStr,
    hours: String(h).padStart(2, "0"),
    minutes: String(m).padStart(2, "0"),
    seconds: String(s).padStart(2, "0"),
    totalSec,
    isUrgent: totalSec <= 3600 // Less than 1 hour away
  };
}
