/**
 * Pure rules for what a session status change sets off (#140). Both ways of
 * changing status — the in-app buttons and the one-click email links — use
 * these, so they behave the same. No I/O.
 */

export type TransitionTo = "confirmed" | "completed" | "cancelled";

export interface TransitionEffects {
  /** Who gets an email, relative to the person who acted. */
  email: { to: "mentee" | "other"; template: "confirmed" | "cancelled" } | null;
  /** Resolve the mentor's "confirm or decline" action notification. */
  resolveConfirmRequest: boolean;
  /** Issue the post-session feedback prompt (ADR-0017). */
  feedbackPrompts: boolean;
}

export function planTransitionEffects(to: TransitionTo): TransitionEffects {
  switch (to) {
    case "confirmed":
      return { email: { to: "mentee", template: "confirmed" }, resolveConfirmRequest: true, feedbackPrompts: false };
    case "cancelled":
      // Declining a request or cancelling a session: tell the other person.
      return { email: { to: "other", template: "cancelled" }, resolveConfirmRequest: true, feedbackPrompts: false };
    case "completed":
      return { email: null, resolveConfirmRequest: false, feedbackPrompts: true };
  }
}
