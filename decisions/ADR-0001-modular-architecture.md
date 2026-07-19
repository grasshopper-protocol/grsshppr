# ADR-0001: Modular architecture (core + opt-in modules)

- **Status:** Accepted
- **Date:** 2026-06-18
- **Discipline:** Engineering
- **Source RFC:** none — foundational decision, recorded retroactively

## Context

Grasshopper aims to ship lean but reward committed mentoring pairs with depth.
We needed an architecture that keeps v1 simple without painting us into a corner
as features (notes, goals) are added.

## Options

- **Monolith** — everything always on. Simple, but every feature is mandatory
  bloat and can't be disabled per pair or per instance.
- **Plugin system** — fully dynamic loading. Maximum flexibility, but premature
  machinery for a project at this stage (violates YAGNI).
- **Core + opt-in modules** — a fixed core (profiles + booking) plus modules
  (notes, goals) that depend on core but never on each other. Chosen.

## Decision

Two layers: `core/` (always active) and `modules/` (opt-in, per mentoring pair).
Module boundaries are enforced — no cross-module imports; a module can be
disabled without breaking core or other modules.

## Consequences

- Core must remain fully functional with zero modules enabled.
- Modules depend only on core, never each other — enforced in review.
- New module checklist: queries → API routes → UI → wire-in → verify removable.
- Adds a discipline cost (boundary policing) in exchange for long-term legibility.

## Links

- `ENGINEERING.md` → "Modular Design"
- `CONTRIBUTING.md` → "Adding a New Module"
