/**
 * Pure rules for the post-session feedback prompt (ADR-0017). No DB, no clock.
 *
 * A prompt (in-app action notification + email) is issued at most once per
 * participant per completed session. "Already prompted" is recorded by the
 * notification itself, so issuing is idempotent across repeated cron runs.
 */

import { isDeletedUser } from "./account-deletion";

/** How long after a session ends we still ask for feedback. */
export const FEEDBACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const FEEDBACK_PROMPT_TYPE = "action_required:feedback";

/** Delay between prompt emails, to stay under the email provider's rate limit. */
export const PROMPT_EMAIL_SPACING_MS = 600;

/**
 * Stop claiming new prompts after this long, well inside the route's
 * maxDuration, so a run is never killed between a claim and its email.
 * Unclaimed pairs carry over to the next run.
 */
export const PROMPT_RUN_BUDGET_MS = 40_000;

export interface CompletedSessionRef {
  id: string;
  mentorId: string;
  menteeId: string;
  endsAt: Date;
}

export interface FeedbackPrompt {
  sessionId: string;
  userId: string;
  partnerId: string;
}

/** Stable key for a (session, participant) pair; also the email idempotency key. */
export function promptKey(sessionId: string, userId: string): string {
  return `${sessionId}:${userId}`;
}

/** Feedback opens when the session has ended and closes FEEDBACK_WINDOW_MS later. */
export function isWithinFeedbackWindow(endsAt: Date, now: Date): boolean {
  const age = now.getTime() - endsAt.getTime();
  return age >= 0 && age <= FEEDBACK_WINDOW_MS;
}

/**
 * Who should be prompted now: each participant of a completed session that
 * ended within the feedback window, unless they already left feedback or were
 * already prompted (`handled` holds promptKey()s for both). No one is prompted
 * when either side has deleted their account (ADR-0016).
 */
export function planFeedbackPrompts(
  completed: CompletedSessionRef[],
  handled: Set<string>,
  now: Date
): FeedbackPrompt[] {
  const prompts: FeedbackPrompt[] = [];
  for (const s of completed) {
    if (!isWithinFeedbackWindow(s.endsAt, now)) continue;
    for (const [userId, partnerId] of [
      [s.mentorId, s.menteeId],
      [s.menteeId, s.mentorId],
    ]) {
      if (isDeletedUser(userId) || isDeletedUser(partnerId)) continue;
      if (handled.has(promptKey(s.id, userId))) continue;
      prompts.push({ sessionId: s.id, userId, partnerId });
    }
  }
  return prompts;
}

export type FeedbackState = "open" | "given" | "closed" | "none";

/**
 * What a participant should see about feedback on a session (ADR-0018): the
 * form ("open"), their rating ("given"), a closed note ("closed"), or nothing
 * ("none" — not completed or not ended yet, or the partner has left).
 */
export function feedbackState(p: {
  status: string;
  endsAt: Date;
  partnerId: string;
  hasGiven: boolean;
  now: Date;
}): FeedbackState {
  if (p.status !== "completed" || isDeletedUser(p.partnerId)) return "none";
  if (p.hasGiven) return "given";
  if (p.now < p.endsAt) return "none";
  return isWithinFeedbackWindow(p.endsAt, p.now) ? "open" : "closed";
}
