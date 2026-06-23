import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { availability, sessions } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/api-utils";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Converts a wall-clock time (date "YYYY-MM-DD" + "HH:mm") in an IANA timezone
// to a UTC Date, using the offset-correction trick.
// ponytail: at a DST-transition instant the offset can be off by the DST delta
// for the ambiguous/skipped hour. Fine for booking windows; swap in date-fns-tz
// if sub-hour DST-boundary accuracy is ever needed.
function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi);
  const guess = new Date(utcGuess);
  const wall = new Date(guess.toLocaleString("en-US", { timeZone }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(utcGuess + (utc.getTime() - wall.getTime()));
}

// GET /api/availability/[userId]?week=2026-06-23
// GET /api/availability/[userId]?next=10  (returns next N available slots, scanning up to 4 weeks)
// Returns available time slots for a given mentor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(request, { limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const { userId } = await params;
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("week");
  const nextParam = searchParams.get("next");
  const daysParam = searchParams.get("days");

  if (!weekStart && !nextParam && !daysParam) {
    return NextResponse.json({ error: "week, days, or next param required" }, { status: 400 });
  }

  // Get mentor's availability windows
  const windows = await db
    .select()
    .from(availability)
    .where(eq(availability.userId, userId));

  if (windows.length === 0) {
    return NextResponse.json({ slots: [], timezone: "UTC", sessionDuration: 30 });
  }

  const timezone = windows[0].timezone;
  const sessionDuration = windows[0].sessionDuration;

  // Helper: generate all slots for a given Monday
  function slotsForWeek(monday: Date): { startsAt: string; endsAt: string }[] {
    const result: { startsAt: string; endsAt: string }[] = [];
    for (const win of windows) {
      const daysFromMonday = win.dayOfWeek === 0 ? 6 : win.dayOfWeek - 1;
      const dayDate = new Date(monday);
      dayDate.setDate(dayDate.getDate() + daysFromMonday);
      // Use local date parts, not toISOString() which shifts in non-UTC environments
      const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`;

      const [startH, startM] = win.startTime.split(":").map(Number);
      const [endH, endM] = win.endTime.split(":").map(Number);
      const windowStartMin = startH * 60 + startM;
      const windowEndMin = endH * 60 + endM;

      for (let min = windowStartMin; min + sessionDuration <= windowEndMin; min += sessionDuration) {
        const slotStartH = String(Math.floor(min / 60)).padStart(2, "0");
        const slotStartM = String(min % 60).padStart(2, "0");
        const endMin = min + sessionDuration;
        const slotEndH = String(Math.floor(endMin / 60)).padStart(2, "0");
        const slotEndM = String(endMin % 60).padStart(2, "0");

        result.push({
          startsAt: zonedTimeToUtc(dateStr, `${slotStartH}:${slotStartM}`, timezone).toISOString(),
          endsAt: zonedTimeToUtc(dateStr, `${slotEndH}:${slotEndM}`, timezone).toISOString(),
        });
      }
    }
    return result.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  // "days=N" mode: return all available slots within N days from cursor.
  // Supports cursor pagination via ?after=<ISO date> to fetch subsequent days.
  // Hard cap: never returns slots beyond 28 days from now.
  if (daysParam || nextParam) {
    const days = Math.min(Math.max(Number(daysParam) || 7, 1), 28);
    const afterParam = searchParams.get("after");
    const now = new Date();

    // "after" is an ISO date string (YYYY-MM-DD) representing end-of-last-shown-day
    const rangeStart = afterParam ? new Date(afterParam + "T00:00:00") : now;
    const earliest = rangeStart > now ? rangeStart : now;

    // Hard ceiling: 28 days from now
    const maxHorizon = new Date(now);
    maxHorizon.setDate(maxHorizon.getDate() + 28);

    // Range end: earliest + days, capped at maxHorizon
    const rangeEnd = new Date(earliest);
    rangeEnd.setDate(rangeEnd.getDate() + days);
    const effectiveEnd = rangeEnd < maxHorizon ? rangeEnd : maxHorizon;

    // Determine how many weeks we need to scan
    let monday = getMonday(earliest);
    const endMonday = getMonday(effectiveEnd);
    endMonday.setDate(endMonday.getDate() + 7); // include the final partial week

    // Fetch booked times in the window
    const booked = await db
      .select({ startsAt: sessions.startsAt })
      .from(sessions)
      .where(eq(sessions.mentorId, userId));
    const bookedTimes = new Set(
      booked
        .filter((s) => s.startsAt >= monday && s.startsAt < effectiveEnd)
        .map((s) => s.startsAt.toISOString())
    );

    const collected: { startsAt: string; endsAt: string }[] = [];

    while (monday < endMonday) {
      const weekSlots = slotsForWeek(monday);
      for (const slot of weekSlots) {
        const start = new Date(slot.startsAt);
        if (start > earliest && start <= effectiveEnd && !bookedTimes.has(start.toISOString())) {
          collected.push(slot);
        }
      }
      monday = new Date(monday);
      monday.setDate(monday.getDate() + 7);
    }

    // Can we show more? Only if effectiveEnd < maxHorizon
    const canShowMore = effectiveEnd < maxHorizon;

    return NextResponse.json({ slots: collected, timezone, sessionDuration, hasMore: canShowMore });
  }

  // "week" mode (legacy): return all slots for a specific week.
  const monday = new Date(weekStart + "T00:00:00");
  const slots = slotsForWeek(monday);

  const weekEnd = new Date(monday);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const booked = await db
    .select({ startsAt: sessions.startsAt })
    .from(sessions)
    .where(eq(sessions.mentorId, userId));

  const bookedTimes = new Set(
    booked
      .filter((s) => s.startsAt >= monday && s.startsAt < weekEnd)
      .map((s) => s.startsAt.toISOString())
  );

  const now = new Date();
  const available = slots.filter(
    (s) => new Date(s.startsAt) > now && !bookedTimes.has(new Date(s.startsAt).toISOString())
  );

  return NextResponse.json({ slots: available, timezone, sessionDuration });
}
