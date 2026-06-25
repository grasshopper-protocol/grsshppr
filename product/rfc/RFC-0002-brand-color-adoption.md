# RFC-0002: Brand color adoption

- **Status:** Accepted (Option A) — see [ADR-0005](../../decisions/ADR-0005-brand-color-minimal-mapping.md)
- **Author:** natos
- **Created:** 2026-06-25
- **Discipline:** Design (which hat decides)
- **Tracking issue:** —

## Summary

Wire the `grass` brand ramp into the product's semantic color tokens. Today the
UI is pure grayscale (`--primary` is near-black, focus rings are gray); the brand
ramp exists only as primitives and is referenced by nothing. This RFC proposes
adopting brand color through the existing shadcn semantic tokens in
[`src/app/globals.css`](../../src/app/globals.css), and asks which of two
mappings — **minimal** or **full** — we ship.

## Motivation

Grasshopper has a defined brand color (`grass`, see
[`design/tokens/colors.md`](../../design/tokens/colors.md) and
[`DESIGN.md`](../../DESIGN.md) §1–2) but the running product shows none of it. We
want brand presence without abandoning the "quiet confidence" philosophy
(`DESIGN.md` → Design Philosophy). Because every component renders through
semantic tokens, the entire look is controlled by one file — so this is a
low-risk, fully reversible change, ideal to decide by **seeing both options
running** rather than arguing in the abstract.

## Proposal

Adopt the brand via the semantic token layer only. No component markup changes
(one exception in the full variant, below). Two candidate mappings are
implemented on spike branches for side-by-side testing:

### Option A — Minimal brand touch (`feat/design-system-minimal`)

Surfaces, cards, body text, and the **primary button stay neutral**. Brand shows
only where it signals interaction:

- `ring` → `grass/500` (light) / `grass/400` (dark) — focus is the main brand cue
- `accent` (+ `accent-foreground`) → subtle `grass` for hover / selected states
- links → `grass/600` / `grass/700`
- `background` adopts the subtly warm `neutral/50`; `primary`, `secondary`,
  `card` remain neutral

Truest to "don't change much." The product reads as it does today, with a green
focus ring and quiet green accents.

### Option B — Full theme (`feat/design-system-full`)

The brand-forward mapping exported from Figma (`DESIGN.md` §2), light + dark:

- `primary` → `grass/600` / `grass/400` (green CTAs)
- `secondary` → `grass/200` / `grass/700`; `muted` → `grass/50` / `surface-subtle-dk`
- `accent` → `grass/400` / `grass/500`; `ring` → `grass/500` / `grass/400`
- `background` / `card` / `popover` tinted; dark mode uses the special green dark
  surfaces (`#0A1A08` / `#0D2110` / `#112B14`)
- `chart-1..5` → `grass` + status colors; `sidebar-*` wired (unused in v1)
- **One component change:** the mentor "available" badge uses a generic
  `bg-green-500`; in a green-primary world that reads as green-on-green, so it is
  recolored to a neutral dot + label in this variant.

### Shared (base branch `feat/design-system`)

- Color primitives documented in `DESIGN.md`; status utilities
  (`--color-error/-warning/-info` + `-dark`) added to `globals.css`.
- The `neutral` ramp is **not** redefined as `--color-neutral-*` (would clobber
  Tailwind's built-in `neutral-*`); its values are applied via semantic tokens.

## Alternatives considered

- **Do nothing / keep grayscale.** Rejected: we have a brand and show none of it.
- **Adopt the full Figma theme outright (no A/B).** Rejected: it's a large visual
  shift away from the current restrained look; worth validating by eye first.
- **Redefine `--color-neutral-*` to the warm ramp.** Rejected: silently overrides
  Tailwind's built-in neutral utilities across the codebase.
- **Hardcode brand hex in components.** Rejected: defeats the token system and
  makes dark mode and future re-theming a manual sweep.

## Risks & trade-offs

- **WCAG.** Green `primary` (Option B) puts white text on `grass/600` (AA) and,
  in dark mode, `grass/950` text on `grass/400` — both must be verified per
  theme. Marked ⚠️ in `DESIGN.md` §2.
- **Brand vs. status green (Option B).** A green brand can blur with generic
  "success" green; hence the badge recolor and the standing rule to keep status
  semantics off the `grass` ramp.
- **Reversibility.** High — the change is confined to `globals.css` semantic
  vars (plus one badge in B). Reverting is a one-file diff.

## Open questions

- Does Option A's green focus ring read as enough brand presence, or does it feel
  like an accident?
- In Option B, do the tinted dark surfaces hold up against real content density?

## Outcome

**Decided: Option A (minimal).** The visual A/B test settled it — the minimal
mapping's green focus ring and quiet accents give enough brand presence without
abandoning the restrained look, and carry no WCAG or brand-vs-status-green
liabilities. Recorded in [ADR-0005](../../decisions/ADR-0005-brand-color-minimal-mapping.md).
`feat/design-system-minimal` merges to `main` (it carries the shared base);
`feat/design-system-full` and the base branch `feat/design-system` are deleted.

> During the spike we also found the Figma export's `oklch()` values were
> desaturated/hue-shifted vs their own hex; semantic tokens were repointed to the
> source-of-truth hex from `DESIGN.md` §1 before judging.
