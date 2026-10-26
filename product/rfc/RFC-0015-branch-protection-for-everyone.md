# RFC-0015: Branch protection that applies to everyone

- **Status:** Accepted
- **Author:** @natos (drafted with Claude Code)
- **Created:** 2026-10-26
- **Discipline:** Engineering (governance)
- **Tracking issue:** #204

## Summary

Make `main`'s branch protection apply to admins too, and enforce what a sole
maintainer can actually meet: required status checks, not a review they can't
give themselves. While there's one maintainer, no approving review is
required. When a second maintainer joins, one becomes required again.

## Motivation

`main` requires one approving review from a code owner, and the only code owner
is the maintainer who writes most PRs. GitHub doesn't let you approve your own
PR, so **every** merge uses the admin bypass. That bypass skips everything,
including the required status checks. On 2026-10-26, two PRs merged with red
checks this way: #192 had a failing `integration` job, and #195 had `quality`
and `integration` red and merged before its light-track window
([post-mortem](../../postmortems/2026-10-26-calendar-drain-red-main.md)).

A rule that has to be bypassed on every merge protects nothing. Worse, it
teaches the habit of bypassing.

**Why now:** the calendar work is heading for Google's review and real users.
Doing nothing leaves "no red merges" ([ADR-0012](../../decisions/ADR-0012-change-safety-guardrails.md))
resting on memory, which has just failed.

## Proposal

Branch protection on `main`:

| Setting | Today | Proposed |
|---|---|---|
| Required status checks | `Analyze (javascript-typescript)`, `quality`, `build`, `integration` | unchanged |
| Branch must be up to date before merging | on | unchanged |
| Apply to administrators | **off** | **on** |
| Required approving reviews | 1, from a code owner | **0** while there's one maintainer; **1** when there are two or more |
| Force pushes and deletion | blocked | unchanged |

- CODEOWNERS stays. It still requests the owner's review automatically; it just
  isn't a merge gate while there's one maintainer.
- **Emergency escape hatch:** if CI itself is broken (a GitHub Actions outage, a
  broken runner image) and a fix must land, an admin can switch "Apply to
  administrators" off, merge, and switch it back on. Every use is recorded in a
  post-mortem. This is the same rule as `--no-verify` in ADR-0012.
- **Trigger to revisit:** a second maintainer added to MAINTAINERS.md. The PR
  that adds them also sets required reviews to 1.

## Alternatives considered

- **Keep today's settings.** Rejected: the bypass is routine, so the checks are
  effectively optional.
- **Apply to admins but keep the required review.** Rejected: a sole maintainer
  could never merge their own PRs.
- **A second "bot" account that approves PRs.** Rejected: review theatre. An
  approval nobody actually gave is worse than no requirement, and a privileged
  token becomes another thing to secure.
- **Repository rulesets instead of classic branch protection.** Equivalent for
  this purpose. We'd move only if we needed rulesets' extras (bypass lists, org
  scope). Not now.

## Risks & trade-offs

- **Slower urgent fixes:** every merge waits for CI (about 5 minutes). Revert
  PRs too. That's acceptable: the revert-first recovery has always assumed a PR.
- **A broken CI blocks every merge.** Covered by the recorded escape hatch.
- **No second pair of eyes** is required while there's one maintainer. That is
  already the reality; this makes it honest. Agent reviews (UX, product,
  engineering) and the CI gates remain the safety net.

## Open questions

None.

## Outcome

Accepted on 2026-10-26 as [ADR-0023](../../decisions/ADR-0023-branch-protection-for-everyone.md).
Applied to `main` the same day: "apply to administrators" on; required checks
`Analyze (javascript-typescript)`, `quality`, `build` and `integration`, with
the branch up to date; 0 required approving reviews; code-owner review not
required; force pushes and deletion blocked.

PR #205 merged before its final commit flipped these statuses, through the
admin bypass this RFC removes. The statuses were corrected in a follow-up PR,
which was the first merge under the new rule.
