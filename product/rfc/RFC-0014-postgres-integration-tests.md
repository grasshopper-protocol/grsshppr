# RFC-0014: Postgres-backed integration tests in CI

- **Status:** Draft
- **Author:** natos
- **Created:** 2026-10-26
- **Discipline:** Engineering (extends the testing policy of RFC-0009 / ADR-0011)
- **Tracking issue:** [#163](https://github.com/grasshopper-protocol/grsshppr/issues/163)

## Summary

Add a second, small test suite that runs against a real Postgres — every
committed migration applied — as a hard gate in CI. It covers what the unit
suite can't see: transactions, advisory locks, constraints, cascades and
concurrent runs. It ships with tests for the account-deletion, feedback-prompt,
one-rating and calendar-feed code, which were so far verified only by hand.

## Motivation

The coverage gate ([ADR-0011](../../decisions/ADR-0011-testing-gate.md)) guards
pure logic in `src/lib` at 95%+. But recent incidents happened where code meets
the database and the platform, which it can't see:

- account deletion failed on a foreign key (#149);
- the feedback nudge sent duplicates (#154); its fix depends on an advisory
  lock, a re-check inside a transaction and a rollback;
- a double submit stored two ratings (fixed by a constraint, ADR-0020).

Each fix was proven by **a recorded manual run against a throwaway Postgres**
(ADR-0016, ADR-0017, #178). Nothing re-runs those checks, so a later change can
quietly break them. RFC-0012 Phase 1 (encrypted tokens, a sync queue, three
tables) is about to add more of exactly this kind of logic.

**Why now:** before Phase 1. **If we do nothing:** regressions in the riskiest
code are caught by users, not CI.

## Proposal

1. **`integration/`** — a separate suite (`*.test.mjs`, Node's built-in runner
   via tsx, no new dependency), run with `pnpm test:integration`, one file at a
   time (shared database).
2. **Safety first.** Each test empties the database. The suite runs **only**
   against `INTEGRATION_DATABASE_URL`, and refuses unless that database's name
   contains `test` — it never reads `DATABASE_URL`, so a developer's own
   database can't be wiped by accident.
3. **No external services.** Email goes to an in-process fake of the Resend API
   (`RESEND_BASE_URL`), which can answer 200, 503, 422 or drop the connection,
   and records idempotency keys.
4. **CI:** a new `integration` job — ephemeral Postgres 17, `pnpm db:migrate`,
   `pnpm test:integration` — as a **hard gate**, alongside `quality` and
   `build`.
5. **Scope of the suite:** behaviour that depends on the database. Pure logic
   stays in `src/lib` and the unit suite, which keeps its coverage gate; the
   integration suite has none.
6. **Policy:** logic whose correctness depends on the database (transactions,
   locks, constraints, cascades, concurrency) ships with an integration test.

**First tests (20):** account deletion (ADR-0016); feedback prompts — concurrent
runs, re-runs, each email-failure class, the person who completed, expiry
(ADR-0017); one rating per person under a five-way race (ADR-0020); calendar
feed tokens, rotation, cascade and window (RFC-0012); every migration applied.

## Alternatives considered

- **Keep verifying by hand.** Rejected: nothing re-runs the checks.
- **Testcontainers / a test framework.** Rejected: a new dependency (RFC + supply
  chain review) for what a CI service container and `node:test` already do.
- **Mock the database.** Rejected: the bugs are in how Postgres behaves —
  mocks would encode our assumptions, not the database's.
- **Fold into the unit suite.** Rejected: the unit suite runs anywhere with no
  set-up and gates coverage; mixing would make both slower and the gate noisy.

## Risks & trade-offs

- **CI time:** about 10s of tests plus Postgres start-up, in parallel with the
  other jobs.
- **Local set-up:** contributors need a disposable Postgres to run the suite;
  CI runs it for them either way.
- **Wiping the wrong database:** mitigated by the `INTEGRATION_DATABASE_URL`
  + name guard (§2), tested on both failure paths.

## Open questions

None.

## Outcome

_To be filled on acceptance._
