import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { SessionConfirmedEmail, SessionCancelledEmail } from "@/lib/emails/session-emails";
import { planTransitionEffects, type TransitionTo } from "@/lib/session-transitions";
import { resolveNotification } from "@/core/notifications/queries";
import { issueFeedbackPrompts } from "@/core/booking/feedback-prompts";

/**
 * Emails and notifications for a session status change. Called by both the
 * in-app route and the one-click email route (#140), inside `after()` so the
 * work finishes after the response instead of being dropped by serverless.
 */
export async function runTransitionEffects({
  session,
  to,
  actorId,
}: {
  session: { id: string; mentorId: string; menteeId: string; startsAt: Date; endsAt: Date };
  to: TransitionTo;
  actorId: string;
}) {
  const effects = planTransitionEffects(to);

  if (effects.email) {
    const [mentor] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, session.mentorId));
    const [mentee] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, session.menteeId));
    const actorIsMentor = actorId === session.mentorId;

    if (effects.email.template === "confirmed" && mentee?.email) {
      // Read now: the calendar sync that ran just before may have added a Meet link (RFC-0012 §7).
      const [current] = await db.select({ videoUrl: sessions.videoUrl }).from(sessions).where(eq(sessions.id, session.id));
      await sendEmail({
        to: mentee.email,
        subject: `Session confirmed with ${mentor?.name}`,
        react: SessionConfirmedEmail({
          mentorName: mentor?.name ?? "your mentor",
          menteeName: mentee.name,
          startsAt: session.startsAt.toISOString(),
          endsAt: session.endsAt.toISOString(),
          videoUrl: current?.videoUrl,
          sessionUrl: `${process.env.BETTER_AUTH_URL ?? "https://www.grsshppr.org"}/session/${session.id}`,
        }),
      });
    }
    if (effects.email.template === "cancelled") {
      const cancelledBy = actorIsMentor ? mentor : mentee;
      const other = actorIsMentor ? mentee : mentor;
      if (other?.email) {
        await sendEmail({
          to: other.email,
          subject: `Session cancelled by ${cancelledBy?.name}`,
          react: SessionCancelledEmail({
            recipientName: other.name,
            cancelledByName: cancelledBy?.name ?? "the other participant",
            startsAt: session.startsAt.toISOString(),
          }),
        });
      }
    }
  }

  if (effects.resolveConfirmRequest) await resolveNotification(session.id, "action_required:confirm");
  // The person who completed it is in the app: in-app prompt only (ADR-0017).
  if (effects.feedbackPrompts) await issueFeedbackPrompts([session.id], { skipEmailFor: actorId });
}
