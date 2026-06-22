import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { availability } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const windowSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const putSchema = z.object({
  timezone: z.string().min(1),
  sessionDuration: z.number().min(15).max(120),
  windows: z.array(windowSchema),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(availability)
    .where(eq(availability.userId, session.user.id));

  // Derive timezone and duration from first row (all rows share them)
  const timezone = rows[0]?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const sessionDuration = rows[0]?.sessionDuration ?? 30;

  const windows = rows.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
  }));

  return NextResponse.json({ timezone, sessionDuration, windows });
}

export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { timezone, sessionDuration, windows } = parsed.data;

  // Replace all existing availability for this user
  await db.delete(availability).where(eq(availability.userId, session.user.id));

  if (windows.length > 0) {
    await db.insert(availability).values(
      windows.map((w) => ({
        id: crypto.randomUUID(),
        userId: session.user.id,
        dayOfWeek: w.dayOfWeek,
        startTime: w.startTime,
        endTime: w.endTime,
        timezone,
        sessionDuration,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}
