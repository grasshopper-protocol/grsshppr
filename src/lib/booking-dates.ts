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

/**
 * Returns the Monday (local midnight) of the week containing `date`.
 * Sunday belongs to the week that just ended, so it maps back 6 days.
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** A weekly recurring availability window. dayOfWeek: 0 = Sunday … 6 = Saturday. */
export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface Slot {
  startsAt: string; // offset-aware ISO instant
  endsAt: string;
}

/**
 * Generates every bookable slot for the week beginning on `monday`, across all
 * availability windows, as offset-aware UTC instants sorted ascending.
 *
 * Pure: no DB, no clock. Slots are laid out by walking each window in
 * `sessionDuration`-minute steps that fit fully inside the window.
 */
export function slotsForWeek(
  monday: Date,
  windows: AvailabilityWindow[],
  sessionDuration: number,
  timeZone: string
): Slot[] {
  const result: Slot[] = [];
  for (const win of windows) {
    const daysFromMonday = win.dayOfWeek === 0 ? 6 : win.dayOfWeek - 1;
    const dayDate = new Date(monday);
    dayDate.setDate(dayDate.getDate() + daysFromMonday);
    const dateStr = toDateStr(dayDate);

    const [startH, startM] = win.startTime.split(":").map(Number);
    const [endH, endM] = win.endTime.split(":").map(Number);
    const windowStartMin = startH * 60 + startM;
    const windowEndMin = endH * 60 + endM;

    for (
      let min = windowStartMin;
      min + sessionDuration <= windowEndMin;
      min += sessionDuration
    ) {
      const slotStartH = String(Math.floor(min / 60)).padStart(2, "0");
      const slotStartM = String(min % 60).padStart(2, "0");
      const endMin = min + sessionDuration;
      const slotEndH = String(Math.floor(endMin / 60)).padStart(2, "0");
      const slotEndM = String(endMin % 60).padStart(2, "0");

      result.push({
        startsAt: zonedTimeToUtc(dateStr, `${slotStartH}:${slotStartM}`, timeZone).toISOString(),
        endsAt: zonedTimeToUtc(dateStr, `${slotEndH}:${slotEndM}`, timeZone).toISOString(),
      });
    }
  }
  return result.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/**
 * Whether it's time to join a session's video call: from `leadMinutes` before
 * the start until the end. The session page makes "Join video call" the
 * primary action then. Pure: the clock is passed in.
 */
export function isTimeToJoin(startsAt: Date, endsAt: Date, now: Date, leadMinutes = 15): boolean {
  return now.getTime() >= startsAt.getTime() - leadMinutes * 60_000 && now < endsAt;
}

/** A session that occupies the mentor's time. */
export interface BookedInterval {
  startsAt: Date;
  endsAt: Date;
}

/** Statuses that hold a slot. Cancelled and completed sessions free it (#139). */
export const SLOT_HOLDING_STATUSES = ["requested", "confirmed"] as const;

/**
 * Drops every slot that overlaps a booked session. Overlap, not equal start
 * times: a session that doesn't start on a slot boundary still blocks the
 * slots it covers (#139). Touching edges (one ends as the next starts) don't
 * overlap. Pure: no DB, no clock.
 */
export function removeBookedSlots(slots: Slot[], booked: BookedInterval[]): Slot[] {
  if (booked.length === 0) return slots;
  return slots.filter((slot) => {
    const start = new Date(slot.startsAt).getTime();
    const end = new Date(slot.endsAt).getTime();
    return !booked.some((b) => b.startsAt.getTime() < end && b.endsAt.getTime() > start);
  });
}
