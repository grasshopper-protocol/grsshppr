import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createSession, getSessionsForUser } from "@/core/booking/queries";
import { getProfileByUserId } from "@/core/profiles/queries";
import { z } from "zod";
import { safeJson } from "@/lib/api-utils";

const bookSchema = z.object({
  mentorId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await getSessionsForUser(session.user.id);
  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await safeJson(request);
  if (error) return error;

  const parsed = bookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mentorId, startsAt, endsAt } = parsed.data;

  // Can't book yourself
  if (mentorId === session.user.id) {
    return NextResponse.json({ error: "Cannot book a session with yourself" }, { status: 400 });
  }

  // Verify mentor exists and is available
  const mentorProfile = await getProfileByUserId(mentorId);
  if (!mentorProfile || mentorProfile.role !== "mentor" || !mentorProfile.available) {
    return NextResponse.json({ error: "Mentor not available" }, { status: 400 });
  }

  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (start >= end || start < new Date()) {
    return NextResponse.json({ error: "Invalid time range" }, { status: 400 });
  }

  const booked = await createSession({
    mentorId,
    menteeId: session.user.id,
    startsAt: start,
    endsAt: end,
  });

  return NextResponse.json({ session: booked }, { status: 201 });
}
