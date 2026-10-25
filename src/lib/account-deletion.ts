/**
 * Pure rules for what happens to shared sessions when a user deletes their
 * account (ADR-0016). No DB, no clock — the caller passes `now`.
 *
 * Past sessions are kept for the partner and reassigned to a single
 * "Deleted user" placeholder (the same pattern as GitHub's "ghost" user), so
 * every reader that joins sessions → users keeps working unchanged.
 */

/** Placeholder that inherits a departed user's side of shared sessions. */
export const DELETED_USER = {
  id: "deleted-user",
  name: "Deleted user",
  // .invalid is reserved (RFC 2606): no real inbox, so no one can sign in as it.
  email: "deleted-user@grsshppr.invalid",
} as const;

export function isDeletedUser(userId: string): boolean {
  return userId === DELETED_USER.id;
}

export const ACCOUNT_DELETED_REASON = "Account deleted";

export interface SessionRef {
  id: string;
  mentorId: string;
  menteeId: string;
  status: "requested" | "confirmed" | "completed" | "cancelled";
  startsAt: Date;
}

export interface SessionDeletionPlan {
  /** Upcoming sessions to cancel with ACCOUNT_DELETED_REASON. */
  cancel: string[];
  /** Partners to tell that their upcoming session was cancelled. */
  notify: { userId: string; sessionId: string }[];
}

/**
 * Upcoming (requested or confirmed, not yet started) sessions with the
 * departing user are cancelled and the partner is notified. Everything else
 * is left as it is and simply reassigned to DELETED_USER by the caller.
 */
export function planSessionsOnAccountDeletion(
  userSessions: SessionRef[],
  userId: string,
  now: Date
): SessionDeletionPlan {
  const plan: SessionDeletionPlan = { cancel: [], notify: [] };

  for (const s of userSessions) {
    if (s.mentorId !== userId && s.menteeId !== userId) continue;
    const upcoming =
      (s.status === "requested" || s.status === "confirmed") && s.startsAt > now;
    if (!upcoming) continue;

    plan.cancel.push(s.id);
    const partnerId = s.mentorId === userId ? s.menteeId : s.mentorId;
    if (partnerId !== userId && !isDeletedUser(partnerId)) {
      plan.notify.push({ userId: partnerId, sessionId: s.id });
    }
  }

  return plan;
}
