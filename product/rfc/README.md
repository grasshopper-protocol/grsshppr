# RFCs — Request for Comments

Major changes start here, as a written proposal, **before** a pull request.

## When you need an RFC

| Change | RFC? |
|--------|------|
| Typo, copy, in-place refactor, bug fix | No → issue + PR |
| New feature or module | **Yes** |
| Schema / data-model change | **Yes** |
| New dependency | **Yes** |
| Public API change | **Yes** |
| Design-system change (tokens, patterns) | **Yes** |
| Governance change | **Yes** |
| Reversing a prior ADR | **Yes** (supersede it) |

When in doubt, write the RFC. It's cheaper than unwinding a shipped decision.

## Process

1. Copy [RFC-template.md](RFC-template.md) to `RFC-NNNN-short-title.md`
   (next free number).
2. Open it as a PR. Discussion happens on the PR thread.
3. On agreement, a maintainer with the relevant hat (product / design / eng,
   see [GOVERNANCE.md](../../governance/GOVERNANCE.md)) records an
   [ADR](../../decisions) and the RFC is merged.
4. Implementation PRs link back to the RFC and ADR.

An RFC captures **alternatives considered**, not just the chosen path. Rejected
options are recorded, not erased.
