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

## Index

All RFCs, open and closed.

| RFC | Title | Status | Issue | ADR |
|-----|-------|--------|-------|-----|
| [RFC-0001](RFC-0001-mentor-visibility-ranking.md) | Mentor visibility & ranking system | Discussion (no activity since 2026-06-25) | [#31](https://github.com/grasshopper-protocol/grsshppr/issues/31) | — |
| [RFC-0002](RFC-0002-brand-color-adoption.md) | Brand color adoption | Accepted (A) | — | [ADR-0005](../../decisions/ADR-0005-brand-color-minimal-mapping.md) |
| [RFC-0003](RFC-0003-status-token-layer.md) | Status token layer | Accepted | — | [ADR-0006](../../decisions/ADR-0006-status-token-layer.md) |
| [RFC-0004](RFC-0004-interaction-states-motion.md) | Interaction states & motion | Accepted | — | [ADR-0007](../../decisions/ADR-0007-interaction-states-motion.md) |
| [RFC-0005](RFC-0005-built-with-marketing.md) | "Built with open tools" strip on the marketing page | Accepted | — | [ADR-0008](../../decisions/ADR-0008-built-with-marketing-strip.md) |
| [RFC-0006](RFC-0006-marketing-footer.md) | Marketing footer expansion | Accepted | — | [ADR-0009](../../decisions/ADR-0009-marketing-footer.md) |
| [RFC-0007](RFC-0007-session-reschedule.md) | Session reschedule | Draft (no activity since 2026-07-13) | — | — |
| [RFC-0008](RFC-0008-mentor-mentee-messaging.md) | Mentor↔Mentee messaging | Draft (no activity since 2026-07-13) | — | — |
| [RFC-0009](RFC-0009-testing-policy.md) | Testing policy & coverage gate | Accepted | — | [ADR-0011](../../decisions/ADR-0011-testing-gate.md) |
| [RFC-0010](RFC-0010-change-safety-guardrails.md) | Change-safety guardrails | Accepted | [#103](https://github.com/grasshopper-protocol/grsshppr/issues/103) | [ADR-0012](../../decisions/ADR-0012-change-safety-guardrails.md) |
| [RFC-0011](RFC-0011-status-text-tokens.md) | Status text tokens (`-text`) | Accepted | [#43](https://github.com/grasshopper-protocol/grsshppr/issues/43) | [ADR-0013](../../decisions/ADR-0013-status-text-tokens.md) |
| [RFC-0012](RFC-0012-calendar-integration.md) | Calendar integration (subscription feed + Google event push) | Accepted | [#142](https://github.com/grasshopper-protocol/grsshppr/issues/142) | [ADR-0014](../../decisions/ADR-0014-calendar-connection-auth-boundary.md) |
| [RFC-0013](RFC-0013-light-track-schema-changes.md) | A light track for small, additive schema changes | Accepted | [#162](https://github.com/grasshopper-protocol/grsshppr/issues/162) | [ADR-0019](../../decisions/ADR-0019-light-track-schema-changes.md) |
| [RFC-0014](RFC-0014-postgres-integration-tests.md) | Postgres-backed integration tests in CI | Accepted | [#163](https://github.com/grasshopper-protocol/grsshppr/issues/163) | [ADR-0021](../../decisions/ADR-0021-postgres-integration-tests.md) |
| [RFC-0015](RFC-0015-branch-protection-for-everyone.md) | Branch protection that applies to everyone | Discussion | [#204](https://github.com/grasshopper-protocol/grsshppr/issues/204) | [ADR-0023](../../decisions/ADR-0023-branch-protection-for-everyone.md) |
