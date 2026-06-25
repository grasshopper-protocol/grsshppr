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

## Historical log

Decisions made before this folder existed are preserved in [LOG.md](LOG.md),
migrated from `AGENTS.md`. New decisions get their own ADR file.
