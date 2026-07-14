/**
 * Pure date/slot helpers for booking.
 *
 * Rules from ADR-0004:
 *   1. Never derive a calendar date from toISOString() — use local parts.
 *   2. Slot wire format is always offset-aware ISO (a real UTC instant).
 *
 * Both helpers live here so they can be imported by the API route, the booking
 * form, and the test suite without pulling in any Next.js or React runtime.
 */

/**
 * Returns "YYYY-MM-DD" from local date parts.
 * Never uses toISOString(), which rolls back a day in positive-UTC zones.
 */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Converts a wall-clock time ("YYYY-MM-DD" + "HH:mm") in an IANA timezone
 * to a UTC Date, using the offset-correction trick.
 *
 * ponytail: at a DST-transition instant the offset can be off by the DST delta
 * for the ambiguous/skipped hour. Fine for booking windows; swap in date-fns-tz
 * if sub-hour DST-boundary accuracy is ever needed.
 */
export function zonedTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string
): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi);
  const guess = new Date(utcGuess);
  const wall = new Date(guess.toLocaleString("en-US", { timeZone }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(utcGuess + (utc.getTime() - wall.getTime()));
}
