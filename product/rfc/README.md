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

## Open RFCs

| RFC | Title | Status | Issue |
|-----|-------|--------|-------|
| [RFC-0001](RFC-0001-mentor-visibility-ranking.md) | Mentor visibility & ranking system | Discussion | [#31](https://github.com/grasshopper-protocol/grsshppr/issues/31) |
| [RFC-0002](RFC-0002-brand-color-adoption.md) | Brand color adoption | Accepted (A) | [ADR-0005](../../decisions/ADR-0005-brand-color-minimal-mapping.md) |
| [RFC-0003](RFC-0003-status-token-layer.md) | Status token layer | Accepted | [ADR-0006](../../decisions/ADR-0006-status-token-layer.md) |
| [RFC-0004](RFC-0004-interaction-states-motion.md) | Interaction states & motion | Accepted | [ADR-0007](../../decisions/ADR-0007-interaction-states-motion.md) |
| [RFC-0005](RFC-0005-built-with-marketing.md) | "Built with open tools" strip on the marketing page | Accepted | [ADR-0008](../../decisions/ADR-0008-built-with-marketing-strip.md) |
| [RFC-0006](RFC-0006-marketing-footer.md) | Marketing footer expansion | Accepted | [ADR-0009](../../decisions/ADR-0009-marketing-footer.md) |
| [RFC-0007](RFC-0007-session-reschedule.md) | Session reschedule | Draft | — |
| [RFC-0009](RFC-0009-testing-policy.md) | Testing policy & coverage gate | Accepted | [ADR-0011](../../decisions/ADR-0011-testing-gate.md) |
| [RFC-0010](RFC-0010-change-safety-guardrails.md) | Change-safety guardrails | Accepted | [ADR-0012](../../decisions/ADR-0012-change-safety-guardrails.md) |