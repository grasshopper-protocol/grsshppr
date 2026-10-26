# Architecture Decision Records (ADRs)

Every decision is recorded here. An ADR captures the *context*, the *options*,
the *decision*, and its *consequences* — so anyone can reconstruct why a choice
was made and what would change it.

## Rules

- One ADR per decision. Use [ADR-template.md](ADR-template.md).
- ADRs are **immutable** once accepted. To change a decision, write a new ADR
  that supersedes the old one and link both directions.
- **Lifecycle** ([ADR-0019](ADR-0019-light-track-schema-changes.md)): an ADR is
  **Proposed** while the PR that implements it is open, and flipped to
  **Accepted** in that PR's last commit, so it merges with its change — an
  Accepted ADR on `main` always describes code on `main`. Pure process ADRs are
  Accepted when their docs PR merges. Replaced ADRs become **Superseded by
  ADR-NNNN**; rejected options stay recorded.
- Major decisions come from an [RFC](../product/rfc). The ADR is the record of
  what was decided; the RFC is the proposal and discussion.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](ADR-0001-modular-architecture.md) | Modular architecture (core + opt-in modules) | Accepted |
| [0002](ADR-0002-passwordless-auth.md) | Passwordless auth (OAuth + passkeys) | Accepted |
| [0003](ADR-0003-schema-migrations.md) | Generated migrations over `db:push` | Accepted |
| [0004](ADR-0004-timezone-handling.md) | Timezone handling (calendar dates + slot wire format) | Accepted |
| [0005](ADR-0005-brand-color-minimal-mapping.md) | Brand color adoption — minimal mapping | Accepted |
| [0006](ADR-0006-status-token-layer.md) | Status token layer | Accepted |
| [0007](ADR-0007-interaction-states-motion.md) | Interaction states & motion | Accepted |
| [0008](ADR-0008-built-with-marketing-strip.md) | "Built with open tools" strip on the marketing page | Accepted |
| [0009](ADR-0009-marketing-footer.md) | Marketing footer expansion | Accepted |
| [0010](ADR-0010-supply-chain-hardening.md) | Supply-chain hardening (CI security baseline) | Accepted |
| [0011](ADR-0011-testing-gate.md) | Testing as a required gate (coverage on pure logic) | Accepted |
| [0012](ADR-0012-change-safety-guardrails.md) | Change-safety guardrails (green-before-push, merge hygiene, no red merges, deploy recovery) | Accepted |
| [0013](ADR-0013-status-text-tokens.md) | Status text tokens (`-text`) — extends 0006 | Accepted |
| [0014](ADR-0014-calendar-connection-auth-boundary.md) | Calendar connection auth boundary & token security | Accepted |
| [0015](ADR-0015-private-mentee-goals.md) | Mentee goals are private on public mentor profiles | Accepted |
| [0016](ADR-0016-account-deletion-keeps-partner-history.md) | Account deletion keeps partners' history under a "Deleted user" placeholder | Accepted |
| [0017](ADR-0017-feedback-prompt-once.md) | The feedback prompt is issued once, recorded by its notification | Accepted |
| [0018](ADR-0018-one-feedback-window.md) | One feedback window; every feedback link lands on a working form | Accepted |
| [0019](ADR-0019-light-track-schema-changes.md) | A light track for small, additive schema changes; the ADR lifecycle | Accepted |
| [0020](ADR-0020-one-rating-per-person.md) | One rating per person per session, enforced by the database | Accepted |

## Historical log

Decisions made before this folder existed are preserved in [LOG.md](LOG.md),
migrated from `AGENTS.md`. New decisions get their own ADR file.

## Post-mortems

When something breaks in production, the incident write-up lives in
[../postmortems](../postmortems). Several ADRs exist *because* of an incident —
the post-mortem captures what broke, the ADR captures the durable rule.
