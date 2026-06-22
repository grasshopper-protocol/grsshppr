import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createSession, getSessionsForUser } from "@/core/booking/queries";
import { getProfileByUserId } from "@/core/profiles/queries";
import { z } from "zod";
import { safeJson } from "@/lib/api-utils";
import { sendEmail } from "@/lib/email";
import { SessionRequestedEmail } from "@/lib/emails/session-emails";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  // Notify mentor of new request (fire-and-forget)
  const [mentor] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, mentorId));

  if (mentor?.email) {
    sendEmail({
      to: mentor.email,
      subject: `New session request from ${session.user.name}`,
      react: SessionRequestedEmail({
        mentorName: mentor.name,
        menteeName: session.user.name,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      }),
    });
  }

  return NextResponse.json({ session: booked }, { status: 201 });
}
