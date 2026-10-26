# ADR-0022: A separate lock column for the calendar outbox

- **Status:** Proposed
- **Date:** 2026-10-26
- **Discipline:** Engineering
- **Source RFC:** [RFC-0012](../product/rfc/RFC-0012-calendar-integration.md) §5 · light track ([RFC-0013](../product/rfc/RFC-0013-light-track-schema-changes.md), [ADR-0019](ADR-0019-light-track-schema-changes.md)) · Issue #194

## Context

The calendar outbox uses `next_attempt_at` for two jobs: when a row is due, and
the lease a drain takes when it claims the row. Re-queuing a pair (a status
change) resets `next_attempt_at` to now, so a row that's being synced becomes
claimable again at once. A second drain (the daily cron, or another inline
drain) can then work the same pair concurrently.

The engineering review reproduced the failure: a create is in flight, the
session is cancelled, and a second drain deletes before the create finishes.
The result is a live Google event for a cancelled session, with a stored link
and nothing queued (#194).

## Options

- **Encode the lock in `next_attempt_at`'s timing** (re-queue a locked row to
  "lease end + 1 ms" and have the holder re-claim it). No schema change, but the
  rule is subtle and easy to break.
- **A Postgres advisory lock held during the Google call.** That would hold a
  pooled connection across a slow network call, and serverless functions make
  that fragile.
- **A nullable `locked_until` column (chosen).** "Due" and "being worked" become
  separate facts, each with one meaning.

## Decision

- Add `calendar_outbox.locked_until timestamp NULL` (migration `0004`).
- Claims take rows that are due **and** whose `locked_until` is null or past,
  and set `locked_until` to now + lease. `next_attempt_at` is left alone.
- Re-queuing sets `next_attempt_at` to now and resets attempts. It never touches
  `locked_until`.
- The holder finishes (deletes the row) only if `next_attempt_at` is unchanged
  since its claim. Otherwise the row was re-queued during the sync: the holder
  clears `locked_until`, and the row runs again from the current state.
- Failures and releases also clear `locked_until`.

This is additive, nullable and compatible with the running code. The code that
uses the column ships in a follow-up PR after this migration has reached
production.

## Consequences

- Two drains can never work the same pair at once. A crashed drain's lock simply
  expires.
- One more column to keep in mind when reading the queue. ENGINEERING.md's
  calendar section describes the rule.
- Integration tests cover the race: a claim, a re-queue and a second claim must
  not overlap, and the re-queued work must run.

## Links

- Issue: #194 · Parent: #142
- Related: [ADR-0019](ADR-0019-light-track-schema-changes.md), [ADR-0014](ADR-0014-calendar-connection-auth-boundary.md)
