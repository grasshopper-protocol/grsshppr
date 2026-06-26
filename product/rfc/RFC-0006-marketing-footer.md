# RFC-0006: Marketing footer expansion

- **Status:** Accepted
- **Author:** natos
- **Created:** 2026-06-26
- **Discipline:** Design (which hat decides)
- **Tracking issue:** [ADR-0009](../../decisions/ADR-0009-marketing-footer.md)

## Summary

Expand the marketing footer in
[`layout.tsx`](../../src/app/(marketing)/layout.tsx) from its current sparse form
(logo + "Open source · MIT" + a lone GitHub link) into a quiet, structured footer
with a short mission line, a **contribute nudge**, and grouped links to the
project's open docs (License, Contributing, Code of Conduct, Security, Roadmap,
Decisions). Treatment stays monochrome and muted per
[ADR-0005](../../decisions/ADR-0005-brand-color-minimal-mapping.md) /
[ADR-0007](../../decisions/ADR-0007-interaction-states-motion.md). No new
dependency. Complements the "Built with open tools" strip
([RFC-0005](RFC-0005-built-with-marketing.md) / ADR-0008), which sits directly
above it on the home page.

## Motivation

The footer is the last thing a visitor sees and the natural home for "where do I
go next" — yet today it offers a logo, four words, and one link. For a product
whose whole pitch is *open and community-owned*, the footer should:

- **Funnel contribution.** The CTA sections invite mentees and mentors; nothing
  invites *contributors*. A "built by volunteers — contribute" nudge closes that
  gap and reinforces the open-source narrative.
- **Surface the open product.** Grsshppr already publishes its License, Code of
  Conduct, Security policy, Roadmap, and Decisions (ADRs). The footer is where
  open products expose these; right now they're invisible to anyone not browsing
  the repo.
- **Not feel empty.** A single centred link reads unfinished next to the richer
  sections above it.

Doing nothing leaves the footer underweight and the contributor funnel missing.

## Proposal

Additive, presentational. Edits one file (`layout.tsx`); no new routes, no new
dependency. All targets already exist in the repo.

### 1. Scope — shared across marketing

The footer lives in the marketing **layout**, so it renders on home, `sign-in`,
and `sign-up`. The expanded footer is intentionally kept there (a footer belongs
on every marketing page), unlike the home-only "Built with" strip. The content is
calm enough to sit under auth screens.

### 2. Structure

A brand block + two link groups, collapsing to stacked columns on mobile, with a
thin bottom bar:

```
┌───────────────────────────────────────────────────────────────┐
│  [logo] Grsshppr                Project          Community      │
│  Free, open-source mentoring,   License (MIT)    GitHub         │
│  owned by everyone.             Roadmap          Contribute     │
│                                 Decisions        Code of Conduct│
│  Built by volunteers — you      Security         can help. →    │
│  ───────────────────────────────────────────────────────────   │
│  © 2026 Grsshppr · Open source under MIT                        │
└───────────────────────────────────────────────────────────────┘
```

- **Brand block:** existing logo + a one-line mission + the contribute nudge
  ("Built by volunteers — [contribute](../../CONTRIBUTING.md).").
- **Project column:** License, [Roadmap](../../product/roadmap/README.md),
  [Decisions](../../decisions/README.md), [Security](../../SECURITY.md).
- **Community column:** GitHub (repo), [Contribute](../../CONTRIBUTING.md),
  [Code of Conduct](../../CODE_OF_CONDUCT.md).
- **Bottom bar:** copyright + license line.

### 3. Link targets

All targets are repo docs that already exist — link to their **GitHub blob URLs**
(open in a new tab, `rel="noopener noreferrer"`). No in-app `/about`, `/license`,
etc. routes are created; that is deliberate laziness — the canonical copies live
in the repo, and building routes to re-render them is unnecessary scope.

| Label | Target |
|-------|--------|
| License (MIT) | `…/blob/main/LICENSE` |
| Roadmap | `…/blob/main/product/roadmap/README.md` |
| Decisions | `…/blob/main/decisions/README.md` |
| Security | `…/blob/main/SECURITY.md` |
| Contribute | `…/blob/main/CONTRIBUTING.md` |
| Code of Conduct | `…/blob/main/CODE_OF_CONDUCT.md` |
| GitHub | repo root |

### 4. Treatment

- Monochrome, `text-muted-foreground`, `hover:text-foreground` — same restraint
  as the current footer and the "Built with" strip. No new colour.
- Grass focus ring on links via the global `:focus-visible` (ADR-0007).
- Layout: `flex` column on mobile → multi-column (`sm:grid-cols-…`) on wider
  viewports, within the existing `max-w-5xl` container.

## Alternatives considered

- **Leave the footer as-is.** Rejected — it's underweight and the contributor
  funnel is missing.
- **Just add two links (Contribute + License) to the current centred layout.**
  Reasonable and leaner; rejected as the primary because it still omits the
  open-product docs (CoC, Security, Roadmap, Decisions) that justify the change.
  Kept as the fallback if the grouped footer feels too heavy under auth screens.
- **Make the expanded footer home-only.** Rejected — a footer is global
  furniture; auth pages with a bare footer would look inconsistent. The content
  is calm enough to live everywhere.
- **Build in-app routes (`/about`, `/license`, `/roadmap`).** Rejected — the
  docs already exist in the repo; new routes are scope and maintenance for no
  gain. Link to the canonical source.
- **Add a newsletter / social row.** Rejected — no newsletter or socials exist;
  inventing them is out of scope and off-ethos.

## Risks & trade-offs

- **Shared-surface weight.** The richer footer appears on sign-in/sign-up. Verify
  it doesn't dominate those short pages; if it does, fall back to the lean
  two-link variant.
- **External links for everything.** All footer docs leave the site to GitHub.
  Acceptable for an open product, but worth a conscious nod — visitors land in the
  repo, which is on-brand.
- **Link rot.** Footer points at repo paths; if files move (e.g. roadmap
  restructure), links break. Low blast radius, easy to fix.
- **Reversibility.** High — one file, presentational. Trivial to revert.

## Open questions

- Branch in blob URLs: pin to `main`, or use a branchless `…/blob/HEAD/…`? Lean
  `main` unless the default branch changes.
- Do we want a "Star on GitHub" count / badge, or keep it text-only? Default
  text-only to avoid a client call and keep it quiet.

## Outcome

**Accepted** (2026-06-26) and recorded as
[ADR-0009](../../decisions/ADR-0009-marketing-footer.md). Shipped: the expanded
footer in [`layout.tsx`](../../src/app/(marketing)/layout.tsx) — brand block with
mission line + contribute nudge, **Project** and **Community** link groups
(data-driven `footerGroups`), and a copyright bottom bar. Links target the
canonical repo docs via GitHub blob URLs on `main`. Decisions on the open
questions: blob URLs pinned to `main`; footer kept text-only (no GitHub star
badge).
