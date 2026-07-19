# RFC-0004: Interaction states & motion

- **Status:** Accepted
- **Author:** natos
- **Created:** 2026-06-25
- **Discipline:** Design (which hat decides)
- **Tracking issue:** —

## Summary

Tokenise **interaction states** (`:hover`, `:focus-visible`, `:active`,
`:disabled`, `[aria-invalid]`) and add a minimal **motion convention** to
[`globals.css`](../../src/app/globals.css). Values are re-mapped to the minimal
theme settled by [ADR-0005](../../decisions/ADR-0005-brand-color-minimal-mapping.md)
— state feedback comes from neutral darken/opacity, and the grass focus ring stays
the single brand cue. Motion builds on the already-imported `tw-animate-css`; no
new dependency. Pulled forward from the full Figma spec
([`figma-spec-full.staging.md`](../../design/tokens/figma-spec-full.staging.md)
§7, §8b), taking only the behavioural layer and leaving green-tinted elevation and
the radius change behind.

## Motivation

After [RFC-0003](RFC-0003-status-token-layer.md) covers status colour, the next
gap is *behaviour*. Today interaction states are inconsistent: shadcn ships some
defaults, but components also reach for ad-hoc `opacity-90`, inline focus styles,
and hardcoded transitions. There is no shared definition of what hover, focus,
disabled, or invalid *mean*, and no motion convention, so:

- focus treatment varies by component (some lose a visible ring entirely);
- disabled states differ (opacity vs muted vs nothing);
- form errors aren't wired to a consistent `[aria-invalid]` treatment;
- transitions are per-component guesses, with no `prefers-reduced-motion` guard.

The full Figma spec §7 already specifies these states per component; this RFC
lifts the *rules* (not the green-primary values) into tokens so every component
inherits the same restrained, accessible behaviour.

## Proposal

Additive and minimal-mapped. No brand greens introduced on `primary` (that is the
rejected path from ADR-0005). Brand presence stays the focus ring only.

### 1. State tokens (`:root` + `.dark`, exposed via `@theme inline`)

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--primary-hover` | neutral/900 → slightly lighter (`oklch(0.27 0.0098 66.70)`) | neutral lighten | hover on the near-black primary |
| `--secondary-hover` | `--muted` one step darker | one step lighter | hover on secondary/ghost surfaces |
| `--foreground-disabled` | `#ABB3A5` neutral/400-ish | `#5C5F58` | disabled text/icons |

State *conventions* (no new token, documented rule):
- `:active` → `opacity: 90%`
- `:disabled` → `opacity: 40%; pointer-events: none; cursor: not-allowed`

### 2. Focus ring (formalised, per spec §8b)

```
:focus-visible {
  outline: 2px solid var(--ring);   /* grass/500 light · grass/400 dark */
  outline-offset: 2px;
}
```
Rule: never `outline: none` without a visible alternative. The ring is the
**one** standing brand accent in the minimal theme — keep it grass.

### 3. Invalid state

`[aria-invalid]` → `border-color: var(--destructive); --ring: var(--destructive)`.
Subtle error background reuses `--destructive-subtle` from RFC-0003 (dependency).

### 4. Motion convention

Tokenise just enough; lean on the existing `@import "tw-animate-css"`:

```
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--duration-fast: 150ms;   /* state changes: hover, focus, color */
--duration-base: 200ms;   /* enter/exit of small surfaces */
```

Rules:
- State transitions animate `color`, `background-color`, `border-color`,
  `opacity`, `box-shadow` only — never `all`, never layout properties.
- Wrap all non-essential motion in `@media (prefers-reduced-motion: reduce)` →
  reduce to `0.01ms` / no transform. Add this guard once, globally.

## Alternatives considered

- **Do nothing — rely on shadcn defaults + per-component styles.** Rejected:
  that is the current state; it drifts and leaves focus/disabled inconsistent.
- **Import the full Figma §7 recipes verbatim** (grass hover values, green
  shadows, `--radius: 0.5rem`). Rejected: reintroduces the green-primary look
  ADR-0005 turned down and changes radius for no reason. Take rules, not values.
- **Add a motion library (Framer Motion / Motion One).** Rejected: `tw-animate-css`
  is already imported and CSS transitions cover state feedback. No new dependency
  (AGENTS.md §4).
- **Skip motion tokens, keep durations inline.** Rejected: three tokens remove
  the per-component guessing and make the reduced-motion guard enforceable.

## Risks & trade-offs

- **State sprawl across components.** Adoption is incremental; the tokens land
  first, components migrate as touched. No big-bang refactor.
- **Minimal mapping vs spec drift.** Hover values intentionally diverge from the
  Figma spec (neutral, not grass). The staging file stays the green-theme
  reference; this RFC is the source of truth for minimal-mode states. Documented
  to avoid "fixing" it back to green later.
- **Focus-ring offset on dense UI.** 2px offset may clip in tight rows; verify on
  list/table rows before merge.
- **Reduced motion.** Must be tested with the OS setting on — the global guard is
  load-bearing for accessibility.
- **Reversibility.** High — additive, one file. Depends on RFC-0003 only for
  `--destructive-subtle`.

## Open questions

- Do we tokenise `--primary-hover` / `--secondary-hover`, or express hover purely
  as a `color-mix()` / opacity rule on the base token (fewer tokens, less control)?
- Motion: keep `--ease-*` / `--duration-*` as tokens, or rely entirely on
  `tw-animate-css` utility classes and document durations as a convention only?
- Should `:active` use `opacity` (spec) or a `color-mix` darken for crisper
  feedback on already-translucent surfaces?

## Outcome

**Accepted** → [ADR-0007](../../decisions/ADR-0007-interaction-states-motion.md).
Implemented in `globals.css` (state tokens, global `:focus-visible`,
`[aria-invalid]`, motion tokens, and the `prefers-reduced-motion` guard).
Components migrate to the hover/transition tokens incrementally, buttons and
inputs first.
