/**
 * Trinidad & Tobago NLCB Non-Draw Religious / Public Holiday Calendar
 *
 * NLCB draws (Play Whe, Pick 4, Cash Pot) run 7 days a week (Monday–Sunday)
 * except on major religious/public holidays when NLCB suspends draws:
 *   - Good Friday (Easter Sunday - 2 days)
 *   - Corpus Christi (Easter Sunday + 60 days)
 *   - Christmas Day (December 25)
 *   - Plus any movable lunar/religious holidays (e.g., Eid-ul-Fitr, Divali)
 *     configured via NLCB_EXTRA_HOLIDAYS="YYYY-MM-DD,YYYY-MM-DD"
 *     (optionally with label: "YYYY-MM-DD:Eid-ul-Fitr").
 */

export interface HolidayStatus {
  isHoliday: boolean;
  name?: string;
}

/**
 * Computes Gregorian Easter Sunday (month 1-indexed, day 1-indexed) using the
 * Meeus/Jones/Butcher algorithm.
 */
function getEasterSundayUTC(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

function formatUTCDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDaysISO(isoDateStr: string, deltaDays: number): string {
  const [y, m, d] = isoDateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return formatUTCDateISO(dt);
}

function parseExtraHolidaysFromEnv(): Map<string, string> {
  const map = new Map<string, string>();
  const raw = process.env.NLCB_EXTRA_HOLIDAYS;
  if (!raw) return map;

  for (const token of raw.split(",")) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const [datePart, ...labelParts] = trimmed.split(":");
    const iso = datePart.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const label = labelParts.join(":").trim() || "Configured Religious/Public Holiday";
      map.set(iso, label);
    }
  }
  return map;
}

/**
 * Checks whether a YYYY-MM-DD AST date is an NLCB non-draw religious/public holiday.
 */
export function getTTNonDrawHoliday(isoDateStr: string): HolidayStatus {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDateStr)) {
    return { isHoliday: false };
  }

  const extra = parseExtraHolidaysFromEnv();
  const extraName = extra.get(isoDateStr);
  if (extraName) {
    return { isHoliday: true, name: extraName };
  }

  if (isoDateStr.endsWith("-12-25")) {
    return { isHoliday: true, name: "Christmas Day" };
  }

  const year = Number(isoDateStr.slice(0, 4));
  const easter = getEasterSundayUTC(year);

  const goodFriday = new Date(easter.getTime() - 2 * 86400000);
  if (isoDateStr === formatUTCDateISO(goodFriday)) {
    return { isHoliday: true, name: "Good Friday" };
  }

  const corpusChristi = new Date(easter.getTime() + 60 * 86400000);
  if (isoDateStr === formatUTCDateISO(corpusChristi)) {
    return { isHoliday: true, name: "Corpus Christi" };
  }

  return { isHoliday: false };
}

/**
 * Steps backward from `isoDateStr` (up to `maxStepBackDays`) to find the most recent
 * date that is NOT an NLCB non-draw holiday.
 */
export function resolveLatestNonHolidayDailyDate(
  isoDateStr: string,
  maxStepBackDays = 7
): { dateStr: string; steppedBackDays: number; skippedHolidays: string[] } {
  let cursor = isoDateStr;
  const skippedHolidays: string[] = [];

  for (let step = 0; step < maxStepBackDays; step++) {
    const status = getTTNonDrawHoliday(cursor);
    if (!status.isHoliday) {
      return {
        dateStr: cursor,
        steppedBackDays: step,
        skippedHolidays
      };
    }
    skippedHolidays.push(`${cursor}${status.name ? ` (${status.name})` : ""}`);
    cursor = addDaysISO(cursor, -1);
  }

  return {
    dateStr: cursor,
    steppedBackDays: maxStepBackDays,
    skippedHolidays
  };
}
