# ADR-0011: Testing as a required gate (coverage on pure logic)

- **Status:** Accepted
- **Date:** 2026-07-14
- **Discipline:** Engineering
- **Source RFC:** [RFC-0009](../product/rfc/RFC-0009-testing-policy.md)

## Context

ENGINEERING.md asked for "one runnable check" on non-trivial logic, but nothing
enforced it: there was no test runner, no CI gate, and the riskiest logic had zero
coverage. Two production incidents — the booking timezone fault
([ADR-0004](ADR-0004-timezone-handling.md),
[postmortem](../postmortems/2026-06-23-booking-timezone.md)) and the profile slug drift
([postmortem](../postmortems/2026-06-23-profiles-slug-drift.md)) — were logic bugs a unit
test would have caught. Testing was a suggestion, not a contract.

## Options

- **Enforced built-in runner + scoped coverage gate.** Node's `node:test` via `tsx`, a
  coverage threshold over `src/lib` pure logic, wired into CI and branch protection.
  Pro: zero new dependency, fits the no-framework ethos, catches the class of bug that hurt us.
  Con: excludes routes/components; coverage can be gamed.
- **Adopt Vitest.** Pro: better DX and component testing. Con: new dependency (own RFC),
  more than we need today.
- **Keep testing advisory.** Pro: no process cost. Con: this is the status quo that let two
  regressions ship.
- **Global coverage across all `src/`.** Pro: broader. Con: needs a DOM/integration harness;
  rewards coverage theater on UI code.

## Decision

Adopt the **enforced built-in runner with a coverage gate scoped to `src/lib`**:

1. Standardize on Node's built-in `node:test` + `node:assert`, run via `tsx` (no new
   framework). Tests live in `tests/`, one file per module.
2. Non-trivial logic ships with a test in the same change. Logic that isn't unit-testable
   in place is extracted into a pure, DB-/framework-free helper under `src/lib` and tested there.
3. `pnpm test:coverage` fails below **95% lines / 90% branches / 95% functions** over
   `src/lib` (test files excluded).
4. The CI `quality` job runs `pnpm test:coverage` as a hard gate, and `quality` is a
   required status check on `main`.

## Consequences

- **Easier:** regressions in timezone math, slug collisions, email-token verification, and
  rate limiting are now caught before merge. Contributors have a clear, low-ceremony bar.
- **Harder:** PRs touching pure logic must include tests and keep the gate green; this is
  intentional friction.
- **Committed to:** maintaining the pure-helper extraction pattern, and keeping the gate
  honest (assert real behavior, don't chase the number).
- **Out of scope / follow-up:** integration tests for the booking flow and module
  enable/disable need a separate harness — tracked as a follow-up RFC. Revisit Vitest only
  if component/DOM testing becomes necessary.

## Links

- RFC: [RFC-0009](../product/rfc/RFC-0009-testing-policy.md)
- Related: [ADR-0004](ADR-0004-timezone-handling.md),
  [ADR-0010](ADR-0010-supply-chain-hardening.md)
- Implementation: `src/lib/booking-dates.ts`, `src/lib/slug.ts`, `tests/*.test.js`,
  `test:coverage` script, `.github/workflows/ci.yml`
