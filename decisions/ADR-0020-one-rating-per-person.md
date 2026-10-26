# ADR-0020: One rating per person per session, enforced by the database

- **Status:** Accepted
- **Date:** 2026-10-26
- **Discipline:** Engineering
- **Source RFC:** none — **light track** ([RFC-0013](../product/rfc/RFC-0013-light-track-schema-changes.md), [ADR-0019](ADR-0019-light-track-schema-changes.md))

## Context

`POST /api/feedback` checked for an existing rating, then inserted one. Two
concurrent submissions (a double click, two tabs, a retried request) both pass
the check and both insert, so one person's rating counts twice in a mentor's
average (security review of #165; #162). Nothing in the database stops it.

## Options

- **Keep the check-then-insert.** Rejected: it's the race.
- **Serialise in the application** (advisory lock per pair, as ADR-0017 does
  for prompts). Works, but every future write path must remember to take the
  lock; the database can't enforce it.
- **A unique constraint on `(session_id, user_id)` (chosen).** The database
  enforces the rule for every write path, present and future.

## Decision

- Add `session_feedback_session_user_unique` — `UNIQUE (session_id, user_id)`,
  as a named `ADD CONSTRAINT` (ADR-0003).
- The route inserts with `ON CONFLICT DO NOTHING` and returns **409 "Feedback
  already submitted"** when nothing was inserted. The separate pre-check is
  removed.
- **Light-track eligibility** (RFC-0013): additive (a new constraint);
  existing data conforms — the read-only check
  `select session_id, user_id, count(*) from session_feedback group by 1, 2 having count(*) > 1`
  returned no rows in production on 2026-10-26, so no clean-up is needed;
  no new personal data; not an auth table; no data rewrite.
- **Compatible in either deploy order:** the migration and the code deploy
  separately. Old code against the new schema gets a unique-violation error on
  a concurrent duplicate instead of storing it. New code against the old
  schema uses `ON CONFLICT DO NOTHING` *without* a conflict target, which is
  valid with or without the constraint — until the migration lands it behaves
  as before (a double submit in those minutes could still store two rows).

## Consequences

- One rating per person per session, guaranteed. A mentor's average can't be
  skewed by a double submit.
- **If duplicates appear between the check and the migration**, the migration
  fails (it runs in a transaction, so nothing changes) and the DB Migrate
  workflow goes red; the fix is a follow-up migration that removes them, marked
  `-- approved-by: ADR-0020`.
- **Reversal:** a follow-up migration dropping the constraint (destructive, so
  it would carry an approval marker). No data written before the change is
  affected.

## Links

- Issue: [#162](https://github.com/grasshopper-protocol/grsshppr/issues/162) (first use of the light track) · Implementation PR: [#178](https://github.com/grasshopper-protocol/grsshppr/pull/178) (migration `0001`, applied to production 2026-10-26)
- Related: [ADR-0018](ADR-0018-one-feedback-window.md) (the feedback rules), [ADR-0019](ADR-0019-light-track-schema-changes.md)
