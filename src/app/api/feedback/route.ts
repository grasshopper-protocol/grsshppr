import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { safeJson, rateLimit } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { sessionFeedback, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { resolveNotification } from "@/core/notifications/queries";
import { FEEDBACK_PROMPT_TYPE, feedbackState } from "@/lib/feedback-prompts";

const feedbackSchema = z.object({
  sessionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error } = await safeJson(request);
  if (error) return error;

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { sessionId, rating, comment } = parsed.data;

  // Verify the session exists, is completed, and user is a participant
  const [existing] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (existing.status !== "completed") {
    return NextResponse.json({ error: "Can only review completed sessions" }, { status: 400 });
  }
  if (existing.mentorId !== session.user.id && existing.menteeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Same rule as every feedback surface (ADR-0018)
  const partnerId = existing.mentorId === session.user.id ? existing.menteeId : existing.mentorId;
  const state = feedbackState({
    status: existing.status,
    endsAt: existing.endsAt,
    partnerId,
    hasGiven: false,
    now: new Date(),
  });
  if (state !== "open") {
    return NextResponse.json({ error: "Feedback for this session is closed" }, { status: 400 });
  }

  // One rating per person per session, enforced by the database (ADR-0020):
  // a second or concurrent submission inserts nothing. No conflict target, so
  // this also works before the constraint's migration has reached production.
  const [feedback] = await db
    .insert(sessionFeedback)
    .values({
      id: crypto.randomUUID(),
      sessionId,
      userId: session.user.id,
      rating,
      comment: comment ?? null,
    })
    .onConflictDoNothing()
    .returning();
  if (!feedback) {
    return NextResponse.json({ error: "Feedback already submitted" }, { status: 409 });
  }

  // Resolve only this user's prompt — the partner's stays open
  await resolveNotification(sessionId, FEEDBACK_PROMPT_TYPE, session.user.id);

  return NextResponse.json({ feedback }, { status: 201 });
}
