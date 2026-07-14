import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { availability, sessions } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/api-utils";
import { getMonday, slotsForWeek } from "@/lib/booking-dates";

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
      const weekSlots = slotsForWeek(monday, windows, sessionDuration, timezone);
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
  const slots = slotsForWeek(monday, windows, sessionDuration, timezone);

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
