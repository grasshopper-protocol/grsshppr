import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createSession, getSessionsForUser } from "@/core/booking/queries";
import { getProfileByUserId } from "@/core/profiles/queries";
import { z } from "zod";
import { safeJson, rateLimit } from "@/lib/api-utils";
import { sendEmail } from "@/lib/email";
import { SessionRequestedEmail } from "@/lib/emails/session-emails";
import { signEmailAction } from "@/lib/email-tokens";
import { db } from "@/lib/db";
import { users, sessionGoals, goals } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { createNotification } from "@/core/notifications/queries";

const bookSchema = z.object({
  mentorId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  goalIds: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await getSessionsForUser(session.user.id);
  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await safeJson(request);
  if (error) return error;

  const parsed = bookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mentorId, startsAt, endsAt, goalIds } = parsed.data;

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

  // Link goals to session (if any selected)
  if (goalIds && goalIds.length > 0) {
    await db.insert(sessionGoals).values(
      goalIds.map((goalId) => ({ sessionId: booked.id, goalId }))
    );
  }

  // Notify mentor of new request (fire-and-forget)
  const [mentor] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, mentorId));

  if (mentor?.email) {
    const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    const confirmToken = signEmailAction(booked.id, "confirm");
    const declineToken = signEmailAction(booked.id, "cancel");
    const confirmUrl = `${baseUrl}/api/sessions/${booked.id}/action?token=${confirmToken}`;
    const declineUrl = `${baseUrl}/api/sessions/${booked.id}/action?token=${declineToken}`;

    // Get goal titles if any were attached
    let goalTitles: string[] | undefined;
    if (goalIds && goalIds.length > 0) {
      const rows = await db
        .select({ title: goals.title })
        .from(goals)
        .where(inArray(goals.id, goalIds));
      goalTitles = rows.map((r) => r.title);
    }

    sendEmail({
      to: mentor.email,
      subject: `New session request from ${session.user.name}`,
      react: SessionRequestedEmail({
        mentorName: mentor.name,
        menteeName: session.user.name,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        confirmUrl,
        declineUrl,
        goalTitles,
      }),
    });
  }

  // In-app notification for mentor (action: needs confirm/decline)
  createNotification({
    userId: parsed.data.mentorId,
    type: "action_required:confirm",
    message: `Confirm or decline session with ${session.user.name}`,
    resourceId: booked.id,
    priority: "action",
  });

  return NextResponse.json({ session: booked }, { status: 201 });
}
