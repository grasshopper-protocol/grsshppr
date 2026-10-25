import { and, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, sessionFeedback, sessions, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { FeedbackNudgeEmail } from "@/lib/emails/feedback-nudge";
import { isDeletedUser } from "@/lib/account-deletion";
import {
  FEEDBACK_PROMPT_TYPE,
  FEEDBACK_WINDOW_MS,
  PROMPT_EMAIL_SPACING_MS,
  PROMPT_RUN_BUDGET_MS,
  planFeedbackPrompts,
  promptKey,
} from "@/lib/feedback-prompts";

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface FeedbackPromptResult {
  prompted: number; // in-app prompts created and kept
  emailed: number; // emails accepted by the provider
  retrying: number; // transient email failures: claim undone, retried next run
  emailLost: number; // permanent email failures: in-app prompt kept, no email
  deferred: number; // not attempted (run budget reached); picked up next run
  closed: number; // expired prompts resolved
}

/**
 * Issues the post-session feedback prompt — an in-app action notification
 * plus one email — to every participant who is due one (ADR-0017).
 *
 * Each (session, participant) pair is claimed under a transaction-scoped
 * advisory lock: re-check, then record the prompt as a notification. Only the
 * run that records it sends the email, with the pair as the provider's
 * idempotency key, so repeated or concurrent runs send nothing twice.
 * A transient email failure undoes the claim so the next run retries it; a
 * permanent one keeps the in-app prompt and gives up on the email.
 *
 * Pass `sessionIds` to prompt for specific sessions (right after a mentor marks
 * one complete) and `skipEmailFor` for the person who just did — they are
 * looking at the app. Omit `sessionIds` to sweep the whole feedback window;
 * the sweep also closes prompts whose window has passed.
 */
export async function issueFeedbackPrompts(
  sessionIds?: string[],
  { skipEmailFor }: { skipEmailFor?: string } = {}
): Promise<FeedbackPromptResult> {
  const result: FeedbackPromptResult = { prompted: 0, emailed: 0, retrying: 0, emailLost: 0, deferred: 0, closed: 0 };
  const startedAt = Date.now();
  const now = new Date(startedAt);
  if (sessionIds && sessionIds.length === 0) return result;

  if (!sessionIds) {
    result.closed = await closeFeedbackPrompts({
      endedBefore: new Date(now.getTime() - FEEDBACK_WINDOW_MS),
    });
  }

  const completed = await db
    .select({
      id: sessions.id,
      mentorId: sessions.mentorId,
      menteeId: sessions.menteeId,
      endsAt: sessions.endsAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.status, "completed"),
        gte(sessions.endsAt, new Date(now.getTime() - FEEDBACK_WINDOW_MS)),
        lte(sessions.endsAt, now),
        sessionIds ? inArray(sessions.id, sessionIds) : undefined
      )
    );
  if (completed.length === 0) return result;

  const ids = completed.map((s) => s.id);
  const [given, prompted] = await Promise.all([
    db
      .select({ sessionId: sessionFeedback.sessionId, userId: sessionFeedback.userId })
      .from(sessionFeedback)
      .where(inArray(sessionFeedback.sessionId, ids)),
    db
      .select({ sessionId: notifications.resourceId, userId: notifications.userId })
      .from(notifications)
      .where(and(eq(notifications.type, FEEDBACK_PROMPT_TYPE), inArray(notifications.resourceId, ids))),
  ]);
  const handled = new Set(
    [...given, ...prompted].map((r) => promptKey(r.sessionId ?? "", r.userId))
  );

  const plan = planFeedbackPrompts(completed, handled, now);
  if (plan.length === 0) return result;

  const people = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, [...new Set(plan.map((p) => p.userId))]));
  const byId = new Map(people.map((p) => [p.id, p]));
  const baseUrl = process.env.BETTER_AUTH_URL ?? "https://www.grsshppr.org";

  let emailsAttempted = 0;
  for (const [i, { sessionId, userId, partnerId }] of plan.entries()) {
    // Never start a claim we might not have time to finish; the rest carry over.
    if (Date.now() - startedAt > PROMPT_RUN_BUDGET_MS) {
      result.deferred = plan.length - i;
      break;
    }
    const user = byId.get(userId);
    if (!user) continue;
    const key = promptKey(sessionId, userId);

    // The partner's name is read inside the claim, after the lock, so an
    // account deleted mid-run is never named in a prompt or email.
    const claim = await claimPrompt(sessionId, userId, partnerId, key);
    if (!claim) continue;
    const { notificationId, partnerName } = claim;
    result.prompted++;
    if (userId === skipEmailFor) continue;

    if (emailsAttempted++ > 0) await new Promise((r) => setTimeout(r, PROMPT_EMAIL_SPACING_MS));
    const sent = await sendEmail({
      to: user.email,
      subject: `How was your session with ${partnerName}?`,
      react: FeedbackNudgeEmail({ recipientName: user.name, partnerName, feedbackUrl: `${baseUrl}/session/${sessionId}` }),
      idempotencyKey: `feedback-prompt:${key}`,
    });

    if (sent.ok) {
      result.emailed++;
    } else if (sent.failure === "permanent") {
      // Keep the in-app prompt; retrying a bad address or missing config won't help.
      result.emailLost++;
      console.error(`[feedback-prompts] email permanently failed for user ${userId}, session ${sessionId}`);
    } else {
      // Undo the claim so the next run retries notification and email together.
      await db.delete(notifications).where(eq(notifications.id, notificationId));
      result.prompted--;
      result.retrying++;
    }
  }
  return result;
}

/**
 * Lock the pair, re-check everything that may have changed since planning
 * (feedback given, partner deleted, prompted by a concurrent run), and record
 * the prompt. Returns the new notification's id, or null if nothing is due.
 */
async function claimPrompt(sessionId: string, userId: string, partnerId: string, key: string) {
  return db.transaction(async (tx) => {
    await lockPrompt(tx, key);

    const [s] = await tx
      .select({ status: sessions.status, mentorId: sessions.mentorId, menteeId: sessions.menteeId })
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    if (!s || s.status !== "completed" || isDeletedUser(s.mentorId) || isDeletedUser(s.menteeId)) {
      return null;
    }

    const [done] = await tx
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.type, FEEDBACK_PROMPT_TYPE),
          eq(notifications.resourceId, sessionId)
        )
      )
      .limit(1);
    if (done) return null;
    const [rated] = await tx
      .select({ id: sessionFeedback.id })
      .from(sessionFeedback)
      .where(and(eq(sessionFeedback.sessionId, sessionId), eq(sessionFeedback.userId, userId)))
      .limit(1);
    if (rated) return null;

    const [partner] = await tx.select({ name: users.name }).from(users).where(eq(users.id, partnerId));
    const partnerName = partner?.name ?? "your session partner";

    const id = crypto.randomUUID();
    await tx.insert(notifications).values({
      id,
      userId,
      type: FEEDBACK_PROMPT_TYPE,
      message: `Leave feedback for session with ${partnerName}`,
      resourceId: sessionId,
      priority: "action",
    });
    return { notificationId: id, partnerName };
  });
}

/**
 * Serialise work on one (session, participant) pair. Account deletion takes
 * the same locks, so a claim can't race a deletion (ADR-0017).
 */
export async function lockPrompt(executor: Executor, key: string) {
  await executor.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
}

/**
 * Resolve open feedback prompts — for the given sessions, or for every session
 * that ended before `endedBefore` — so the bell never offers feedback that can
 * no longer be given. Pass a transaction to run inside it.
 */
export async function closeFeedbackPrompts(
  { sessionIds, endedBefore }: { sessionIds?: string[]; endedBefore?: Date },
  executor: Executor = db
): Promise<number> {
  if (sessionIds && sessionIds.length === 0) return 0;
  const scope = sessionIds
    ? inArray(notifications.resourceId, sessionIds)
    : endedBefore
      ? inArray(
          notifications.resourceId,
          executor.select({ id: sessions.id }).from(sessions).where(lt(sessions.endsAt, endedBefore))
        )
      : undefined;
  if (!scope) return 0;
  const closed = await executor
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.type, FEEDBACK_PROMPT_TYPE), eq(notifications.read, false), scope))
    .returning({ id: notifications.id });
  return closed.length;
}

/**
 * Delete the feedback prompts for these sessions — used when a participant
 * deletes their account, so their name doesn't outlive them in the partner's
 * notifications (ADR-0016). The claim re-checks for deleted users, so nothing
 * is re-issued.
 */
export async function deleteFeedbackPrompts(sessionIds: string[], executor: Executor = db) {
  if (sessionIds.length === 0) return;
  await executor
    .delete(notifications)
    .where(and(eq(notifications.type, FEEDBACK_PROMPT_TYPE), inArray(notifications.resourceId, sessionIds)));
}
