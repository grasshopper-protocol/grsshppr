# Architecture Decision Records (ADRs)

Every decision is recorded here. An ADR captures the *context*, the *options*,
the *decision*, and its *consequences* — so anyone can reconstruct why a choice
was made and what would change it.

## Rules

- One ADR per decision. Use [ADR-template.md](ADR-template.md).
- ADRs are **immutable** once accepted. To change a decision, write a new ADR
  that supersedes the old one and link both directions.
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

## Historical log

Decisions made before this folder existed are preserved in [LOG.md](LOG.md),
migrated from `AGENTS.md`. New decisions get their own ADR file.

## Post-mortems

When something breaks in production, the incident write-up lives in
[../postmortems](../postmortems). Several ADRs exist *because* of an incident —
the post-mortem captures what broke, the ADR captures the durable rule.
