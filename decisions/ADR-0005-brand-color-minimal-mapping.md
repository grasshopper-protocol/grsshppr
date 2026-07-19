# ADR-0005: Brand color adoption — minimal mapping

- **Status:** Accepted
- **Date:** 2026-06-25
- **Discipline:** Design
- **Source RFC:** [RFC-0002](../product/rfc/RFC-0002-brand-color-adoption.md)

## Context

The `grass` brand ramp existed only as primitives and was referenced by nothing;
the running product was pure grayscale. RFC-0002 proposed wiring the ramp into
the shadcn semantic tokens in [`globals.css`](../src/app/globals.css) and asked
which of two mappings to ship. Because every component renders through semantic
tokens, the whole look is controlled by one file, so both options were built on
spike branches and compared by eye.

During the comparison we also found that the Figma export's `oklch()` values were
desaturated and hue-shifted relative to their own hex (e.g. `grass/600` hex
`#468613` vs its oklch compiling to olive `#787742`). Semantic tokens were
repointed to the source-of-truth hex from [`DESIGN.md`](../DESIGN.md) §1 on both
branches before judging.

## Options

- **Option A — Minimal brand touch** (`feat/design-system-minimal`). Surfaces,
  cards, body text, and the primary button stay neutral; brand shows only on the
  focus `ring` (`grass/500` / `grass/400`) and subtle `accent` hover/selected
  states. _Pro:_ truest to "quiet confidence"; reads as today with a green focus
  cue; no component changes; trivially reversible. _Con:_ restrained brand
  presence.
- **Option B — Full theme** (`feat/design-system-full`). Green `primary` CTAs,
  tinted surfaces, special green dark surfaces, charts + sidebar wired, plus a
  badge recolor to avoid green-on-green. _Pro:_ unmistakable brand presence.
  _Con:_ large shift away from the current restrained look; introduces WCAG
  pairings to police (white on `grass/600`, `grass/950` on `grass/400`) and a
  brand-vs-status green clash.

## Decision

Ship **Option A (minimal mapping)**. The green focus ring and quiet accents give
enough brand presence without abandoning the restrained look; it carries no
WCAG or brand-vs-status-green liabilities and no component changes.

## Consequences

- `globals.css` semantic tokens adopt `grass` only for `ring` and `accent`
  (light + dark), using source-of-truth hex. `primary`, `secondary`, `card`, and
  body surfaces stay neutral.
- The mentor "available" badge keeps its generic success-green dot — with a
  neutral primary there is no green-on-green clash, so the Option B recolor is
  not needed.
- The full theme is abandoned: `feat/design-system-full` and the shared base
  branch `feat/design-system` are deleted (the base's scaffolding — DESIGN.md
  token reference, status utilities, RFC-0002 — merges to `main` via the minimal
  branch).
- Future re-theming stays a one-file change through the semantic layer. If we
  later want a brand-forward primary, it supersedes this ADR.

## Links

- RFC: [RFC-0002](../product/rfc/RFC-0002-brand-color-adoption.md)
- Implementation: merge of `feat/design-system-minimal` to `main`
- Tokens: [DESIGN.md](../DESIGN.md) §1–2
