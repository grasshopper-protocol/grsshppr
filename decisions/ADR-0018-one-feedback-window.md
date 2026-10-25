# ADR-0018: One feedback window; every feedback link lands on a working form

- **Status:** Accepted
- **Date:** 2026-10-25
- **Discipline:** Product
- **Source RFC:** none — direct (UX bug fix, no schema change)

## Context

Feedback could be given only on the dashboard, and only for sessions that
ended in the last **48h**. The feedback email went out later than that, and the
bell prompt linked to the session page, which had no form. So both links
usually landed on nothing to do. The API, meanwhile, accepted feedback at any
time — before a session ended, years later, or about a deleted account — and
one participant's feedback cleared the *other* participant's bell prompt.
[ADR-0017](ADR-0017-feedback-prompt-once.md) fixed how often the prompt goes
out; this decides where it leads.

## Options

**A. Keep the dashboard as the only place, widen its window to match the
email.** Smallest change; the bell still lands on a page with no form, and a
dashboard card isn't tied to the session the link named.

**B. Put the form on the session page and use one window everywhere (chosen).**
Each link lands on the exact session it's about; the dashboard keeps its
cards as a second way in.

## Decision

Adopt **B**:

- **One window:** feedback opens when a session has *ended* and closes 7 days
  later (`FEEDBACK_WINDOW_MS`). The emailed prompt, the dashboard cards, the
  session page and `POST /api/feedback` all use the same rule
  (`feedbackState`).
- The email and the bell open **the session page**, which shows the form while
  feedback is open, "You rated this session N out of 5" once given, or
  "Feedback for this session has closed" after the window. Nothing is shown
  when the partner has deleted their account.
- The API rejects feedback outside the window or about a deleted account.
- Leaving feedback resolves **only your own** prompt.

## Consequences

- No link ever lands on a page with nothing to do inside the window.
- Feedback can no longer be left after 7 days. Ratings are therefore about
  recent sessions, which is what they're for.
- A signed-out user who opens the email is sent to the dashboard after sign-in
  (sign-in doesn't yet honour `callbackUrl`); it shows the same form for that
  session, so it isn't a dead end. Tracked separately.

## Links

- [ADR-0017](ADR-0017-feedback-prompt-once.md) · Issue: _to be linked_
