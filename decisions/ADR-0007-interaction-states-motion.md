# ADR-0007: Interaction states & motion

- **Status:** Accepted
- **Date:** 2026-06-25
- **Discipline:** Design
- **Source RFC:** [RFC-0004](../product/rfc/RFC-0004-interaction-states-motion.md)

## Context

With status colour covered by [ADR-0006](ADR-0006-status-token-layer.md), the
remaining gap from the full Figma spec was *behaviour*: hover, focus, active,
disabled, and invalid states, plus motion. These were inconsistent — shadcn
ships some defaults, but components also used ad-hoc `opacity` values, inline
focus styles, and per-component transitions with no `prefers-reduced-motion`
guard. RFC-0004 proposed lifting the **rules** (not the green-primary values)
from the spec into tokens, re-mapped to the minimal theme of
[ADR-0005](ADR-0005-brand-color-minimal-mapping.md).

## Decision

Adopt the interaction-state and motion layer in
[`globals.css`](../src/app/globals.css), minimal-mapped:

- **State tokens** (mode-aware): `--primary-hover` and `--secondary-hover` are
  neutral darken/lighten of their base — **not** grass — and
  `--foreground-disabled` is a dimmed neutral. Exposed via `@theme inline`.
- **State conventions** (documented, no token): `:active` → 90% opacity;
  `:disabled` → 40% opacity + `pointer-events: none`.
- **Focus ring**: a global `:focus-visible { outline: 2px solid var(--ring);
  outline-offset: 2px }`. The grass ring is the **single** standing brand cue;
  never removed without a visible alternative.
- **Invalid**: `[aria-invalid="true"]` adopts `--destructive` for border and
  re-points `--ring` to `--destructive`, reusing `--destructive-subtle` from
  ADR-0006.
- **Motion**: three tokens — `--ease-standard`, `--duration-fast` (150ms),
  `--duration-base` (200ms) — layered on the already-imported `tw-animate-css`
  (no new dependency). A global `@media (prefers-reduced-motion: reduce)` guard
  neutralises animation/transition for users who ask for it.

Brand greens are **not** introduced on `primary`; that is the rejected path from
ADR-0005. Green-tinted elevation (§6) and the radius change (`0.5rem`) from the
full spec are deliberately **not** adopted here.

## Consequences

- Every component inherits consistent, accessible focus, disabled, and invalid
  behaviour through the semantic layer; adoption of hover/transition tokens is
  incremental as components are touched (buttons and inputs first).
- The minimal-mode hover values intentionally diverge from the Figma spec's
  green values; the staging spec remains the green-theme reference, this ADR is
  the source of truth for minimal-mode states.
- Reduced-motion is respected globally — load-bearing for accessibility, must be
  verified with the OS setting on.
- Reversible: additive, single-file. Depends on ADR-0006 for `--destructive-subtle`.

## Links

- RFC: [RFC-0004](../product/rfc/RFC-0004-interaction-states-motion.md)
- Implementation: `globals.css` interaction + motion blocks (`feat/status-interaction-tokens`)
- Builds on: [ADR-0005](ADR-0005-brand-color-minimal-mapping.md),
  [ADR-0006](ADR-0006-status-token-layer.md)
