import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, sessionFeedback, users } from "@/lib/db/schema";
import { eq, and, lt, gt, or } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { FeedbackNudgeEmail } from "@/lib/emails/feedback-nudge";

// ponytail: called by Vercel cron daily — nudges users who haven't left feedback
// within 48h of session completion. Only sends once (won't re-nudge after 72h).
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const h48ago = new Date(now - 48 * 60 * 60 * 1000);
  const h72ago = new Date(now - 72 * 60 * 60 * 1000);

  // Find completed sessions that ended 48-72h ago (the nudge window)
  const completedSessions = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.status, "completed"),
        lt(sessions.endsAt, h48ago),
        gt(sessions.endsAt, h72ago)
      )
    );

  let sent = 0;

  for (const s of completedSessions) {
    // Check both participants
    for (const userId of [s.mentorId, s.menteeId]) {
      // Already left feedback?
      const [existing] = await db
        .select({ id: sessionFeedback.id })
        .from(sessionFeedback)
        .where(
          and(
            eq(sessionFeedback.sessionId, s.id),
            eq(sessionFeedback.userId, userId)
          )
        );
      if (existing) continue;

      // Get user info
      const [user] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, userId));
      if (!user?.email) continue;

      // Get partner name
      const partnerId = userId === s.mentorId ? s.menteeId : s.mentorId;
      const [partner] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, partnerId));

      const sessionDate = new Date(s.endsAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      const baseUrl = process.env.BETTER_AUTH_URL ?? "https://www.grsshppr.org";

      await sendEmail({
        to: user.email,
        subject: `How was your session with ${partner?.name ?? "your mentor"}?`,
        react: FeedbackNudgeEmail({
          recipientName: user.name,
          partnerName: partner?.name ?? "your session partner",
          sessionDate,
          dashboardUrl: `${baseUrl}/dashboard`,
        }),
      });
      sent++;
    }
  }

  return NextResponse.json({ nudgesSent: sent });
}
