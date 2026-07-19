# RFC-0003: Status token layer

- **Status:** Accepted
- **Author:** natos
- **Created:** 2026-06-25
- **Discipline:** Design (which hat decides)
- **Tracking issue:** —

## Summary

Add a small, theme-agnostic **status token layer** to
[`globals.css`](../../src/app/globals.css): the six missing `*-subtle` utility
primitives plus semantic `success` / `warning` / `error` / `info` tokens, each as
a base + subtle-background + foreground triple. All values are sourced from the
**hex** columns in [`DESIGN.md`](../../DESIGN.md) §1c (not the desaturated export
`oklch`). This is status only — never brand expression — so it is orthogonal to
the minimal-vs-full theme question already settled by
[ADR-0005](../../decisions/ADR-0005-brand-color-minimal-mapping.md) and does not
change the restrained look.

## Motivation

Today `globals.css` ships six status primitives (`--color-error/-warning/-info`
and their `-dark`) and a single semantic `--destructive`. There is no tokenised
way to build the status UI the product already needs:

- alert / callout banners (error, warning, info)
- toasts and inline form-validation backgrounds
- status badges (e.g. session state, goal state)

Because no tokens exist, components reach for raw Tailwind utilities — e.g. the
mentor "available" dot is a hardcoded `bg-green-500`
([`mentor/[id]/page.tsx`](../../src/app/(platform)/mentor/[id]/page.tsx)) — which
has no dark-mode adaptation and no subtle-background/foreground pairing. The full
Figma export ([`design/tokens/figma-spec-full.staging.md`](../../design/tokens/figma-spec-full.staging.md))
defines this layer; this RFC pulls **only** that piece forward, leaving the
larger bets (hover/subtle brand variants, type scale, radius, elevation) for
later, separate RFCs.

Status is the right first slice: it is needed regardless of which brand theme we
run, it is fully additive (no existing token changes value), and it is reversible
(one-file diff).

## Proposal

Additive only. No existing semantic token changes value; no component markup is
required to change (component adoption can follow incrementally).

### 1. Add the six missing `*-subtle` primitives (`@theme inline`, hex)

```
--color-error-subtle: #FEF2F2;   --color-error-subtle-dark: #450A0A;
--color-warning-subtle: #FFFBEB; --color-warning-subtle-dark: #451A03;
--color-info-subtle: #EFF6FF;    --color-info-subtle-dark: #172554;
```

### 2. Add semantic status tokens (`:root` + `.dark`, exposed via `@theme inline`)

| Token | Light (hex) | Dark (hex) | Notes |
|-------|-------------|------------|-------|
| `--success` | `#3C7209` grass/700 | `#83B328` grass/400 | grass/700 (not /600) so white text passes AA — fixes export flags F-1/F-3 |
| `--success-subtle` | `#E1EECC` grass/50 | `#05481F` grass/900 | tint behind success |
| `--success-foreground` | `#FFFFFF` | `#012305` grass/950 | text on success |
| `--warning` | `#D97706` | `#FCD34D` | utility/warning(+dark) |
| `--warning-subtle` | `#FFFBEB` | `#451A03` | tint behind warning |
| `--warning-foreground` | `#012305` | `#012305` | stays dark **both** modes (amber is light) |
| `--destructive-subtle` | `#FEF2F2` | `#450A0A` | tint behind error (`--destructive` already exists) |
| `--destructive-foreground` | `#FFFFFF` | `#012305` | text on error |
| `--info` | `#2563EB` | `#60A5FA` | utility/info(+dark) |
| `--info-subtle` | `#EFF6FF` | `#172554` | tint behind info |
| `--info-foreground` | `#FFFFFF` | `#012305` | text on info |

~17 tokens total. The grass-derived ones reuse existing primitives; the
amber/blue ones reuse the utility primitives. Nothing here touches the `neutral`
ramp, so Tailwind's built-in `neutral-*` is **not** clobbered (the trap noted in
the staging file's Appendix A).

### 3. Usage rule

Status tokens signal state only — never decoration, never brand. Success uses
`grass/700`, reserved for explicit success/completed states; the everyday brand
cue stays the focus ring (ADR-0005). After merge, the hardcoded `bg-green-500`
available-dot can migrate to `--success` in a follow-up.

## Alternatives considered

- **Do nothing — keep hardcoding `bg-green-500` / `bg-red-500`.** Rejected: no
  dark-mode adaptation, no subtle/foreground pairing, drift across components.
- **Use Tailwind's built-in `red/amber/blue` utilities directly.** Rejected:
  they give a single hue, not the base+subtle+foreground triple a status surface
  needs, and they carry no semantic meaning or dark-mode rule.
- **Adopt the whole Figma spec at once** (status + hover/subtle brand variants +
  type scale + radius + elevation + recipes). Rejected: large blast radius,
  partly conflicts with the minimal theme (ADR-0005), and mixes orthogonal
  decisions. Bring status forward first; everything else gets its own RFC.
- **Keep `success` off the brand ramp entirely** (use a distinct green).
  Rejected: a second green next to `grass` would muddy the palette; `grass/700`
  is dark enough to pass AA and reads clearly as "success/complete."

## Risks & trade-offs

- **Token sprawl.** Adds ~17 tokens. Mitigated by scope (status only), the table
  above as the canonical list, and no per-component CSS vars.
- **Brand-vs-status green.** `success` reuses `grass`. Mitigated by using
  `grass/700` and reserving it for explicit success states; brand presence stays
  the focus ring, not filled green surfaces.
- **WCAG.** Each base+foreground pair must be verified: success `grass/700`+white
  (5.83:1 ✅ per staging §8a), warning `#D97706`+`grass/950`, error `#DC2626`+white,
  info `#2563EB`+white, plus the dark-mode counterparts. Verify before merge.
- **Reversibility.** High — purely additive in one file. Reverting is a one-file
  diff; unused tokens cost nothing.

## Open questions

- Do we need a distinct `success`, or should "completed/available" simply use the
  brand `grass` and reserve status tokens for warning/error/info? (Affects the
  available-dot and completed-goal UI.)
- Should each `*-subtle` background ship a matching `*-border` token for outlined
  callouts, or is a single subtle fill enough for v1?
- Light-dark(): adopt CSS `light-dark()` for these pairs, or keep the existing
  `:root` / `.dark` duplication for consistency with current tokens? (Lean: match
  current pattern now; revisit globally later.)

## Outcome

**Accepted** → [ADR-0006](../../decisions/ADR-0006-status-token-layer.md).
Implemented in `globals.css`. Implementation note: the previously fixed
`error/warning/info(+dark)` primitives were unused and were replaced by
mode-aware semantic tokens rather than kept alongside — see ADR-0006. Next: the
hardcoded `bg-green-500` available-dot migrates to `--success`.
