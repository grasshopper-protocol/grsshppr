# ADR-0023: Branch protection applies to everyone; checks, not self-approval

- **Status:** Proposed
- **Date:** 2026-10-26
- **Discipline:** Engineering (governance)
- **Source RFC:** [RFC-0015](../product/rfc/RFC-0015-branch-protection-for-everyone.md) · Issue #204 · Amends [ADR-0012](ADR-0012-change-safety-guardrails.md) rule 4

## Context

ADR-0012's "no red merges" relied on GitHub's required checks, but `main` also
required a code-owner approval that the sole maintainer can't give themselves.
Every merge therefore used the admin bypass, which skips the checks too. On
2026-10-26, two PRs merged red this way
([post-mortem](../postmortems/2026-10-26-calendar-drain-red-main.md)).

## Options

- Keep today's settings: the bypass stays routine.
- Apply to admins and keep the review: a sole maintainer can't merge.
- A bot account that approves: review theatre.
- **Apply to admins; require checks, not a review, while there's one
  maintainer (chosen).**

## Decision

- `main` branch protection **applies to administrators**.
- Required status checks: `Analyze (javascript-typescript)`, `quality`,
  `build`, `integration`; the branch must be up to date before merging.
- Required approving reviews: **0** while MAINTAINERS.md lists one maintainer.
  The PR that adds a second maintainer sets it to **1**.
- Escape hatch: if CI itself is broken, an admin may switch "apply to
  administrators" off for one merge and back on. Every use gets a post-mortem.

## Consequences

- A red PR can't merge, for anyone. ADR-0012 rule 4 becomes enforced by GitHub,
  not by memory.
- Every merge, including reverts, waits for CI.
- Review is visible (CODEOWNERS requests it) but not a gate until there's a
  second maintainer to give it.

## Links

- RFC-0015 · Issue #204 · Amends ADR-0012 · Post-mortem 2026-10-26
