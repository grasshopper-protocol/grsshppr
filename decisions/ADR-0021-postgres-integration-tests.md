# ADR-0021: Postgres-backed integration tests as a CI gate

- **Status:** Accepted
- **Date:** 2026-10-26
- **Discipline:** Engineering
- **Source RFC:** [RFC-0014](../product/rfc/RFC-0014-postgres-integration-tests.md)

## Context

The unit suite and its coverage gate (ADR-0011) can't see transactions, locks,
constraints or cascades — where #149, #154 and the double-rating bug lived.
Their fixes (ADR-0016, ADR-0017, ADR-0020) were verified only by manual runs
against a throwaway Postgres.

## Options

- Keep manual verification — nothing re-runs it.
- Testcontainers or a test framework — a new dependency for what CI's service
  containers and `node:test` already provide.
- Mock the database — encodes our assumptions, not Postgres's behaviour.
- **A small `node:test` suite against an ephemeral Postgres in CI (chosen).**

## Decision

- An `integration/` suite run by `pnpm test:integration` (one file at a time),
  and a new **hard-gate** `integration` CI job: Postgres 17, every migration
  applied, then the suite.
- It runs **only** against `INTEGRATION_DATABASE_URL` and refuses unless that
  database's name contains `test`; it never touches `DATABASE_URL`.
- Email goes to an in-process fake of the Resend API; no external services.
- Policy: logic whose correctness depends on the database ships with an
  integration test. Pure logic stays in `src/lib` under ADR-0011's gate.

## Consequences

- The manual checks behind ADR-0016, ADR-0017 and ADR-0020 now run on every PR
  (20 tests at launch).
- Contributors need a disposable Postgres to run the suite locally
  (CONTRIBUTING.md); CI runs it regardless.
- Adds `closeDb()` to `src/lib/db` so scripts and tests can exit cleanly.

## Links

- RFC: [RFC-0014](../product/rfc/RFC-0014-postgres-integration-tests.md) · Issue: #163 · Implementation PR: [#187](https://github.com/grasshopper-protocol/grsshppr/pull/187)
- Related: [ADR-0011](ADR-0011-testing-gate.md), [ADR-0016](ADR-0016-account-deletion-keeps-partner-history.md), [ADR-0017](ADR-0017-feedback-prompt-once.md), [ADR-0020](ADR-0020-one-rating-per-person.md)
