# ADR-0012: Change-safety guardrails (green-before-push, merge hygiene, no red merges, deploy recovery)

- **Status:** Accepted
- **Date:** 2026-07-19
- **Discipline:** Engineering
- **Source RFC:** [RFC-0010](../product/rfc/RFC-0010-change-safety-guardrails.md)

## Context

A bad merge left verbatim-duplicated blocks in `dashboard/page.tsx` and
`schema.ts`, breaking the Vercel production build with `defined multiple times`
errors. It reached Vercel because nothing required a **typecheck** before push and
merge-conflict resolution had no re-verify step. [AGENTS.md](../AGENTS.md) §2
required a **test** for non-trivial logic but was silent on typecheck — the exact
check `next build` enforces — and there was no rule against merging red nor a
reflex for recovering a broken `main`. A local pre-commit gate
(`.githooks/pre-commit`, `pnpm verify`) was added; this ADR records the policy
around it.

## Options

- **Codify five guardrails in AGENTS.md** (green-before-push, merge hygiene,
  recorded bypass, no red merges, deploy-recovery playbook), backed by the
  existing native hook. Pro: closes the exact gaps the incident exposed, zero new
  dependency, moves the cheapest check left. Con: adds process friction on push.
- **Rely on CI alone.** Pro: no new policy. Con: CI runs after push, so red still
  reaches Vercel; says nothing about merge hygiene or recovery — this is the
  status quo that let the break ship.
- **Hard local lint gate now.** Pro: stricter. Con: 10 pre-existing lint errors
  would block every commit; lint must stay advisory until the debt clears.
- **Require full `next build` before push.** Pro: closest to Vercel. Con: needs
  the DB + prod secrets, flaky locally — why CI omits it. `tsc --noEmit` is the
  DB-free equivalent.
- **Adopt husky + lint-staged.** Pro: familiar. Con: new dependencies for what a
  native `core.hooksPath` hook already does.

## Decision

Adopt the **five guardrails in AGENTS.md**, enforced by the native pre-commit hook:

1. **Green-before-push.** `pnpm verify` (typecheck + lint) must pass before push;
   a branch failing `pnpm typecheck` is not pushed. The hook enforces typecheck as
   a hard gate; lint is advisory.
2. **Merge-conflict hygiene.** After resolving a conflict, re-run `pnpm verify` and
   scan the diff for duplicated blocks; never commit both sides of a hunk.
3. **Recorded bypass.** `git commit --no-verify` is emergency-only and must be
   noted in the PR; a silent bypass counts as a silent change.
4. **No red merges.** Don't merge to `main` while required checks fail; promote
   lint to a hard gate once the lint debt is cleared.
5. **Deploy recovery.** On a broken `main`: revert first, then fix forward on a
   branch, then write a post-mortem in `postmortems/`.

## Consequences

- **Easier:** the class of break that hit Vercel (a merge/refactor that fails
  typecheck) is caught locally before push; recovery has a clear, fast default.
- **Harder:** contributors must keep `pnpm typecheck` green before pushing —
  intentional friction, mitigated by the automatic hook and the recorded
  `--no-verify` escape hatch.
- **Committed to:** keeping the hook and `pnpm verify` working, and promoting lint
  to a hard gate once the current debt is cleared.
- **Out of scope / follow-up:** the lint-promotion cutover and an optional
  conflict-marker check in the hook are tracked separately.

## Links

- RFC: [RFC-0010](../product/rfc/RFC-0010-change-safety-guardrails.md)
- Related: [ADR-0011](ADR-0011-testing-gate.md),
  [ADR-0010](ADR-0010-supply-chain-hardening.md)
- Implementation: [AGENTS.md](../AGENTS.md) §2–§4, `.githooks/pre-commit`,
  `pnpm verify` / `pnpm typecheck` scripts, `.github/workflows/ci.yml`
