import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { safeJson, rateLimit } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { sessionFeedback, sessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveNotification } from "@/core/notifications/queries";

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

  // Check for duplicate feedback
  const [already] = await db
    .select()
    .from(sessionFeedback)
    .where(
      and(
        eq(sessionFeedback.sessionId, sessionId),
        eq(sessionFeedback.userId, session.user.id)
      )
    );
  if (already) {
    return NextResponse.json({ error: "Feedback already submitted" }, { status: 409 });
  }

  const [feedback] = await db
    .insert(sessionFeedback)
    .values({
      id: crypto.randomUUID(),
      sessionId,
      userId: session.user.id,
      rating,
      comment: comment ?? null,
    })
    .returning();

  // Resolve the "leave feedback" action notification for this user
  resolveNotification(sessionId, "action_required:feedback");

  return NextResponse.json({ feedback }, { status: 201 });
}
