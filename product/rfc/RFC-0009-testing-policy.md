# RFC-0009: Testing policy & coverage gate

- **Status:** Accepted
- **Author:** @natos
- **Created:** 2026-07-14
- **Discipline:** Engineering
- **Tracking issue:** —

## Summary

Make automated testing a first-class, enforced part of how Grasshopper changes.
Standardize on Node's built-in test runner (via `tsx`, no new framework), require
a test for any non-trivial logic, and gate merges on a coverage threshold measured
over the pure-logic modules in `src/lib`.

## Motivation

Two of the project's worst incidents were logic bugs that a unit test would have
caught before merge: the booking timezone fault ([ADR-0004](../../decisions/ADR-0004-timezone-handling.md),
[postmortem](../../postmortems/2026-06-23-booking-timezone.md)) and the profile
slug drift ([postmortem](../../postmortems/2026-06-23-profiles-slug-drift.md)).
[ENGINEERING.md](../../ENGINEERING.md) already asked for "one runnable check" on
non-trivial logic, but nothing enforced it — there was no runner, no gate, and the
riskiest logic (timezone math, slug collisions, email-token verification, rate
limiting) had zero coverage.

If we do nothing, the same class of regression ships again, and "testing" stays a
suggestion rather than a contract. This RFC turns the existing intent into an
enforced, low-ceremony practice that fits the project's lazy/no-framework ethos.

## Proposal

**Runner.** Node's built-in `node:test` + `node:assert`, executed with `tsx` (already
used by `db:seed`). No new test framework — nothing to adopt via a separate dependency
RFC. Test files live in `tests/` at the repo root, one file per module
(`<module>.test.js`), and import the module under test from `src/`.

**Testability rule.** Logic that lives inside a route handler, a React component, or a
DB-coupled query module cannot be unit-tested in isolation. The pure part is extracted
into a DB-/framework-free helper under `src/lib` (e.g. `booking-dates.ts`, `slug.ts`);
the consumer imports the helper, and the test imports the same helper. No test doubles
unless unavoidable.

**Coverage gate.** `pnpm test:coverage` runs the suite with Node's built-in coverage and
fails below **95% lines / 90% branches / 95% functions**, measured over `src/lib` only
(test files excluded). Components, routes, and DB queries are deliberately out of scope —
gating them would require a DOM/integration harness and tends to produce coverage theater.

**CI + branch protection.** The CI `quality` job runs `pnpm test:coverage` as a hard
gate, and `quality` becomes a required status check on `main`.

**Policy in governance.** [AGENTS.md](../../AGENTS.md) gains a testing responsibility: a PR
that adds or changes non-trivial logic ships with a test in the same change, and must not
lower the coverage gate. This is recorded as [ADR-0011](../../decisions/ADR-0011-testing-gate.md).

## Alternatives considered

- **Vitest.** Richer DX (watch, mocking, v8 coverage). Rejected for now: it is a new
  dependency (its own RFC per §4), and the built-in runner already covers our needs at
  zero adoption cost. Revisit only if we need component/DOM testing.
- **Global coverage threshold across all `src/`.** Rejected: without an integration/DOM
  harness it would force brittle tests on routes and components and reward gaming. Scoping
  the gate to pure logic keeps it honest.
- **Keep testing advisory (no gate).** Rejected: that is the status quo that let two
  regressions ship. Intent without enforcement changed nothing.
- **Per-file coverage thresholds.** Deferred: the aggregate gate over a small, cohesive
  `src/lib` surface is sufficient today; per-file rules add config for little gain.

## Risks & trade-offs

- **Coverage ≠ correctness.** A high number can hide weak assertions. Mitigation: the
  policy is "test the behavior that broke / could break," not "hit the number."
- **Pressure to over-extract.** The testability rule could invite premature abstraction.
  Mitigation: extract only the pure part that needs a test (ponytail), not speculative helpers.
- **Scope excludes routes/components.** Integration-level bugs remain uncaught by this gate.
  Accepted for now; see open questions.
- **`--experimental-test-coverage`** is behind a flag in current Node. Low risk (stable in
  practice on Node 22); if its interface changes we adjust the script.

## Open questions

- Integration tests for the booking flow and module enable/disable (named in ENGINEERING.md)
  are not covered here. They likely need a separate harness — track as a follow-up RFC.
- Whether to promote the advisory `lint` step to a hard gate once existing lint debt is cleared.

## Outcome

Accepted. Recorded as [ADR-0011](../../decisions/ADR-0011-testing-gate.md). Implemented by
the test-coverage work on `src/lib` (`booking-dates`, `slug`, `email-tokens`, `api-utils`),
the `test:coverage` script, the CI `quality` gate, and the AGENTS.md testing rule.
