# ADR-0017: The feedback prompt is issued once, recorded by its notification

- **Status:** Proposed (becomes Accepted when its implementation PR merges)
- **Date:** 2026-10-25
- **Discipline:** Engineering (Product co-signs the prompt timing)
- **Source RFC:** none — direct (bug fix for #154, no schema change)

## Context

After a session, each participant is asked for feedback. Before this change:

- The daily `/api/feedback/nudge` cron emailed everyone in a 48–72h slice who
  hadn't left feedback and recorded nothing, so a duplicate cron delivery
  (which Vercel documents can happen) or a manual re-run sent the same emails
  again (#154).
- Only a mentor marking a session complete created the in-app prompt;
  sessions closed by the auto-complete cron never got one.
- Until #155 (2026-10-25) both crons returned 405, so in practice the old nudge
  sent email exactly once: a manual run at 04:07:13 UTC that day. It ran
  before auto-complete (04:07:42), so the only sessions it could email were
  ones a mentor had completed by hand — which already had an in-app prompt.
  It was then paused (#156) until this change.

## Options

**A. A dedicated ledger table** (`feedback_prompts(session_id, user_id,
notified_at, emailed_at)`, unique pair). Separates "prompted" from "emailed",
so the in-app prompt can stay up while the email retries. A schema change
(RFC + generated migration).

**B. A partial unique index on notifications** (`user_id, resource_id` where
`type = 'action_required:feedback'`). Lets the database enforce once-only, but
is still a migration and still conflates the two meanings.

**C. The in-app prompt notification is the record (chosen).** A participant
has been *prompted* iff an `action_required:feedback` notification exists for
them and the session. Each pair is claimed under a transaction-scoped Postgres
advisory lock, re-checked, then recorded. No schema change.

## Decision

Adopt **C**, for one producer and one channel:

- One function, `issueFeedbackPrompts()`, issues the prompt (notification +
  email) for both completion paths: right after a mentor marks a session
  complete, and from the daily cron for everything else. The person who just
  marked it complete gets the in-app prompt only.
- A session can only be marked complete once it has **ended**; the button
  appears then, and the API rejects earlier attempts. Feedback opens at that
  point and prompts go out for 7 days (`FEEDBACK_WINDOW_MS`).
- Inside the lock the claim re-checks that the session is still completed,
  that neither side has deleted their account (ADR-0016), that the person
  hasn't rated it, and that no concurrent run has prompted them.
- The claim reads the partner's name inside the lock, and that name is used
  for both the notification and the email.
- The email is sent with the pair as the provider's idempotency key.
  - **Retryable** failure — only 429 and 5xx, where the provider certainly
    didn't send: the claim is undone (the notification is **deleted**) and the
    next run retries both.
  - **Anything else** — other 4xx, a network error or timeout (the provider may
    already have sent it), or no email key in production (e.g. a Preview
    deployment): the in-app prompt is kept and the email is given up. A lost
    email is preferred to a duplicate one.
- Each run stops claiming after `PROMPT_RUN_BUDGET_MS` (40s, under the route's
  60s `maxDuration`), so it is never killed between a claim and its email;
  the rest carry over.
- The sweep closes prompts whose window has passed.
- Deleting an account takes the same per-pair locks, then **deletes** the
  feedback prompts on that person's sessions, so their name doesn't outlive
  them in the partner's notifications and no in-flight run can name them in an
  email (ADR-0016).
- Every run logs one counts-only line (`[feedback-prompts] {…}`) and returns
  500 if any email was retried or lost, so failures show in Vercel's cron view.

## Consequences

- **What a notification means:** "this person was prompted", not "this person
  was emailed". A notification without an email exists when: the person
  completed the session themselves; their email failed permanently; or the
  notification predates this change (sessions completed by hand before it).
- **Notifications now carry correctness:** deleting or rewriting
  `action_required:feedback` rows inside the window re-triggers prompts. Only
  this code deletes them: the retryable-failure rollback, and account deletion
  (which also makes the session ineligible, so nothing is re-issued). **Move to option A before**
  any of these lands: a second reminder; per-user email preferences or
  digests (RFC-0008); a notification retention job or user-deletable
  notifications; a second prompt type copying this pattern.
- **Trade-off:** during a transient email failure the in-app prompt is
  withdrawn until the next run (at most a day). A recipient whose email fails
  permanently keeps the in-app prompt only.
- **Rollout:** no cut-off is needed. The old nudge's single real run could only
  reach sessions that already have a prompt notification, and it has been
  paused since.
- **Where the prompt leads** — one window on every surface, links landing on
  the session page — is decided in [ADR-0018](ADR-0018-one-feedback-window.md).
- **Tests:** the rules (`src/lib/feedback-prompts.ts`, `src/lib/email-errors.ts`)
  are unit-tested. The lock, re-check and rollback are verified by a recorded
  run against a throwaway Postgres (two runs in a row, two concurrent runs,
  transient and permanent failures) — see the PR. There is no Postgres-backed
  test suite in CI yet.

## Links

- Issue: #154 · Related: #138, #155, #156, [ADR-0016](ADR-0016-account-deletion-keeps-partner-history.md), [RFC-0008](../product/rfc/RFC-0008-mentor-mentee-messaging.md)
- Implementation PR: pending — change A (`fix/feedback-nudge-idempotent`; re-adds the nudge schedule paused in #156)
