# ADR-0006: Status token layer

- **Status:** Accepted
- **Date:** 2026-06-25
- **Discipline:** Design
- **Source RFC:** [RFC-0003](../product/rfc/RFC-0003-status-token-layer.md)

## Context

After [ADR-0005](ADR-0005-brand-color-minimal-mapping.md) settled the minimal
brand mapping, [`globals.css`](../src/app/globals.css) still had no way to build
status UI (alerts, toasts, form validation, status badges). It shipped six fixed
status primitives (`--color-error/-warning/-info` + `-dark`) and a single
semantic `--destructive`. Components were reaching for raw utilities — e.g. the
mentor "available" dot is a hardcoded `bg-green-500` — with no dark-mode
adaptation and no subtle-background/foreground pairing.

RFC-0003 proposed a theme-agnostic status layer: the six missing `*-subtle`
primitives plus semantic `success` / `warning` / `error` / `info` tokens, each a
base + subtle-background + foreground triple, sourced from the **hex** columns in
[`DESIGN.md`](../DESIGN.md) §1c (not the desaturated export `oklch`). Status is
orthogonal to the brand-theme decision, so it is safe regardless of which theme
runs.

## Decision

Adopt the status token layer. Implementation refines RFC-0003 in one respect:
the previously fixed `--color-{error,warning,info}(+-dark)` primitives had **zero
consumers** (verified by search), so rather than keep them alongside new semantic
tokens, they are **replaced** by mode-aware semantic tokens. Consumers write
`bg-warning` / `text-warning-foreground` and get the correct value per theme
without manual `dark:` variants. This is strictly simpler, changes no rendered
output (nothing used the old tokens), and keeps the layer additive in practice.

Concretely, in `globals.css`:

- `success` / `warning` / `info` each get base + `-subtle` + `-foreground`,
  defined per-mode in `:root` and `.dark`, exposed via `@theme inline`.
- `error` is `--destructive` (already mode-aware); we add `--destructive-subtle`
  and `--destructive-foreground`.
- `success` uses `grass/700` (`#3c7209`), not `grass/600`, so white text passes
  WCAG AA (fixes the export's F-1/F-3 flags).
- `--warning-foreground` stays `grass/950` in **both** modes — amber is light in
  dark mode.
- The `neutral` ramp is still **not** redefined in `@theme inline` (it would
  clobber Tailwind's built-in `neutral-*`).

## Consequences

- Status UI is buildable from tokens; the hardcoded `bg-green-500` available-dot
  can migrate to `--success` as the first consumer.
- The fixed `error/warning/info(+dark)` utilities are gone. Since nothing used
  them this is invisible, but any future code must use the semantic names.
- Status stays state-only, never decorative; brand presence remains the focus
  ring (ADR-0005).
- Reversible: additive, single-file. Unused tokens cost nothing.

## Links

- RFC: [RFC-0003](../product/rfc/RFC-0003-status-token-layer.md)
- Implementation: `globals.css` status block (`feat/status-interaction-tokens`)
- Tokens: [DESIGN.md](../DESIGN.md) §1c
- Supersedes the fixed status primitives added under RFC-0002 scaffolding.
