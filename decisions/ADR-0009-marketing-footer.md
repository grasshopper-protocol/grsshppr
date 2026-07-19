# ADR-0009: Marketing footer expansion

- **Status:** Accepted
- **Date:** 2026-06-26
- **Discipline:** Design
- **Source RFC:** [RFC-0006](../product/rfc/RFC-0006-marketing-footer.md)

## Context

The marketing footer was a logo, "Open source · MIT", and a lone GitHub link.
For a product whose whole pitch is *open and community-owned*, the footer — the
last thing a visitor sees and the natural "where next" — under-served three
jobs: it didn't funnel **contribution**, didn't surface the **open-product docs**
(License, Code of Conduct, Security, Roadmap, Decisions) the project already
publishes, and read as unfinished next to the richer sections above it.

RFC-0006 proposed a quiet, structured footer that does those three jobs while
staying monochrome and muted per
[ADR-0005](ADR-0005-brand-color-minimal-mapping.md) /
[ADR-0007](ADR-0007-interaction-states-motion.md). It complements the "Built
with open tools" strip ([ADR-0008](ADR-0008-built-with-marketing-strip.md)),
which sits directly above it on the home page.

## Options

- **Structured footer: brand block + Project/Community columns + bottom bar
  (chosen).** Surfaces the open-product docs and adds a contribute nudge; calm
  enough to live on every marketing page.
- **Add just two links (Contribute + License) to the current centred layout.**
  Leaner, but still omits the open-product docs that justify the change. Kept as
  the fallback if the grouped footer feels heavy under auth screens.
- **Home-only expanded footer.** Rejected — a footer is global furniture; auth
  pages with a bare footer would look inconsistent.
- **Build in-app routes (`/about`, `/license`, `/roadmap`).** Rejected — the docs
  already exist in the repo; new routes are scope and maintenance for no gain.
  Link to the canonical source.
- **Newsletter / social row.** Rejected — none exist; inventing them is off-ethos.

## Decision

Expand the footer in
[`src/app/(marketing)/layout.tsx`](../src/app/(marketing)/layout.tsx) into a
brand block (logo + mission line + a "Built by volunteers — contribute" nudge),
two link groups (**Project**: License, Roadmap, Decisions, Security;
**Community**: GitHub, Contribute, Code of Conduct), and a copyright bottom bar.
Links point at the canonical repo docs via GitHub blob URLs on `main`, opening in
a new tab. Treatment is monochrome (`text-muted-foreground` →
`hover:text-foreground`), the grass focus ring is the only brand cue, and the
links are data-driven (a `footerGroups` array). It renders across all marketing
pages (home, sign-in, sign-up). No new dependency, no new routes.

## Consequences

- The contributor funnel now exists on every marketing page; the open-product
  docs are visible to visitors, not just repo browsers.
- The richer footer appears on sign-in/sign-up. If it dominates those short
  pages, fall back to the lean two-link variant (recorded option above).
- Footer links point at repo paths; if files move, links break — low blast
  radius, easy to fix. All footer docs leave the site to GitHub, which is
  acceptable (and on-brand) for an open product.
- Reversible: one presentational file.
