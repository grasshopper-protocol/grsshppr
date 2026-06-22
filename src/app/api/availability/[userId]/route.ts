import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { availability, sessions } from "@/lib/db/schema";

// GET /api/availability/[userId]?week=2026-06-23
// Returns available time slots for a given mentor in a specific week
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("week"); // ISO date string, Monday of the week

  if (!weekStart) {
    return NextResponse.json({ error: "week param required (ISO date of Monday)" }, { status: 400 });
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
  const monday = new Date(weekStart + "T00:00:00");

  // Generate slots for each window in the week
  const slots: { startsAt: string; endsAt: string }[] = [];

  for (const win of windows) {
    // Calculate the date for this day of week relative to Monday
    // dayOfWeek: 0=Sunday, 1=Monday ... 6=Saturday
    const daysFromMonday = win.dayOfWeek === 0 ? 6 : win.dayOfWeek - 1;
    const dayDate = new Date(monday);
    dayDate.setDate(dayDate.getDate() + daysFromMonday);
    const dateStr = dayDate.toISOString().split("T")[0];

    // Generate slots within the window
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

      slots.push({
        startsAt: `${dateStr}T${slotStartH}:${slotStartM}:00`,
        endsAt: `${dateStr}T${slotEndH}:${slotEndM}:00`,
      });
    }
  }

  // Filter out already-booked slots
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

  // Filter out past slots and booked slots
  const now = new Date();
  const available = slots.filter(
    (s) => new Date(s.startsAt) > now && !bookedTimes.has(new Date(s.startsAt).toISOString())
  );

  return NextResponse.json({ slots: available, timezone, sessionDuration });
}
