# RFC-0010: Change-safety guardrails (green-before-push, merge hygiene, no red merges, deploy recovery)

- **Status:** Accepted
- **Author:** @natos
- **Created:** 2026-07-19
- **Discipline:** Engineering
- **Tracking issue:** —

## Summary

Add a small set of enforceable guardrails to [AGENTS.md](../../AGENTS.md) that
close the gaps exposed by a broken Vercel deploy: require `pnpm verify`
(typecheck + lint) to pass locally before pushing, mandate a clean re-verify
after resolving merge conflicts, treat gate bypasses (`--no-verify`) as recorded
exceptions, forbid merging a red `main`, and add a revert-first playbook for
recovering from a broken deploy. These build on the local pre-commit gate added
in [ADR-0011](../../decisions/ADR-0011-testing-gate.md)'s neighbourhood and the
`.githooks/pre-commit` hook.

## Motivation

A bad merge left verbatim-duplicated blocks in `dashboard/page.tsx` (`DAYS`,
`AvailabilityWidget`) and `schema.ts` (`availability`), which broke the Vercel
production build with `defined multiple times` / `Cannot redeclare` errors. The
failure reached Vercel because nothing local or in policy required a typecheck
before push, and merge-conflict resolution had no "re-verify" step.

[AGENTS.md](../../AGENTS.md) §2 already requires a **test** for non-trivial logic,
but says nothing about **typecheck** — which is exactly what `next build` (Vercel)
enforces and exactly what broke. CI runs `tsc --noEmit` as a hard gate, but only
*after* push, and there was no stated norm against merging while red, nor a
documented reflex for recovering a broken `main`.

If we do nothing, the same class of break — a merge or refactor that compiles
locally-in-someone's-head but fails typecheck — ships to Vercel again, and
recovery stays ad hoc.

## Proposal

Five guardrails, recorded as [ADR-0012](../../decisions/ADR-0012-change-safety-guardrails.md)
and implemented as edits to [AGENTS.md](../../AGENTS.md).

1. **Green-before-push.** Run `pnpm verify` (`typecheck` + `lint`) before pushing.
   A branch that fails `pnpm typecheck` must not be pushed. The local
   `.githooks/pre-commit` hook enforces typecheck as a hard gate; `pnpm verify`
   is the manual equivalent. This extends the existing "ship a test" duty with
   the check that actually gates the deploy.

2. **Merge-conflict hygiene.** After resolving any conflict, re-run `pnpm verify`
   and scan the diff for accidentally duplicated blocks before committing. Never
   commit both sides of a hunk. (This is the specific failure mode that broke the
   deploy.)

3. **Bypasses are recorded.** `git commit --no-verify` is allowed only in an
   emergency and must be called out in the PR description ("bypassed pre-commit
   because X"). A silent bypass is treated as a silent change (§4).

4. **No red merges.** Do not merge to `main` while required checks are failing.
   The CI `quality` job is the gate. Lint is promoted from advisory to a hard
   gate once the current lint debt is cleared (tracked separately).

5. **Deploy-recovery playbook.** When a deploy breaks `main`: revert first (get
   `main` green), then fix forward on a branch, then write a post-mortem in
   [postmortems/](../../postmortems). Recovery favours a fast, reversible revert
   over a rushed forward-fix.

## Alternatives considered

- **Rely on CI alone (status quo).** CI already runs `tsc --noEmit` as a hard
  gate. Rejected as sufficient: CI runs *after* push, so a red build still
  reaches Vercel on the deploy branch, and CI says nothing about merge hygiene or
  recovery. The guardrails move the cheapest check (typecheck) left, to before
  push.
- **Make lint a hard local gate now.** Rejected: there are 10 pre-existing lint
  errors; a hard lint gate would block every commit. Lint stays advisory locally
  and in CI until the debt is cleared, matching the existing CI stance.
- **Require a full `next build` locally before push.** Rejected: `next build`
  hits the database during static generation and needs production secrets, so it
  is flaky locally — this is why CI deliberately omits it. `tsc --noEmit`
  captures the type-safety gate without the DB dependency.
- **Add husky + lint-staged.** Rejected: new dependencies (each its own RFC per
  §4) for something a native git hook (`core.hooksPath`) already does at zero
  cost.
- **Do nothing / keep recovery ad hoc.** Rejected: the broken deploy showed the
  cost of no stated reflex; a one-line revert-first rule is cheap insurance.

## Risks & trade-offs

- **Friction on push.** Contributors must keep `pnpm typecheck` green locally.
  Mitigation: it is fast, and the hook runs it automatically; `--no-verify`
  exists for genuine emergencies (recorded).
- **Guardrails ≠ guarantees.** A dev can still bypass or skip the hook. The
  "recorded exception" rule turns a silent bypass into a visible, reviewable one
  rather than pretending bypasses never happen.
- **Lint stays advisory.** Real lint issues can still merge until the debt is
  cleared and lint is promoted. Accepted, and explicitly time-boxed to
  "once the debt is cleared."

## Open questions

- When exactly to promote lint from advisory to a hard gate — depends on clearing
  the current 10 errors. Tracked separately, not blocking this RFC.
- Whether to add a lightweight `git merge`/rebase check (e.g. a conflict-marker
  grep) to the pre-commit hook. Deferred; the re-verify rule covers the observed
  failure for now.

## Outcome

Accepted. Recorded as [ADR-0012](../../decisions/ADR-0012-change-safety-guardrails.md).
Implemented by the guardrail edits to [AGENTS.md](../../AGENTS.md) §2–§4 and the
existing `.githooks/pre-commit` hook / `pnpm verify` script.
