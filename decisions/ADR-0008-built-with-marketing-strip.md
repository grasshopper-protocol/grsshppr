# ADR-0008: "Built with open tools" strip on the marketing page

- **Status:** Accepted
- **Date:** 2026-06-26
- **Discipline:** Design
- **Source RFC:** [RFC-0005](../product/rfc/RFC-0005-built-with-marketing.md)

## Context

The marketing home page states the product is open source and community-owned,
but never shows what that openness is *made of*. Open products that earn trust
tend to credit their open foundations. RFC-0005 proposed a quiet "Built with
open tools" strip above the footer to make the claim concrete.

A constraint shaped the decision: a banner that says "open tools" must only list
tools that are *actually* open. The platforms we depend on but which are
proprietary — Vercel and GitHub — do not belong in this strip; they stay
credited via the existing GitHub links elsewhere on the page.

## Options

- **Strip of monochrome, open-source-only logos (chosen).** Honest, on-brand,
  zero new dependency.
- **Include Vercel + GitHub.** Rejected — proprietary platforms under an "open
  tools" label is inaccurate.
- **Full-colour brand logos.** Rejected — violates the neutral, no-decorative-
  colour rule of [ADR-0005](ADR-0005-brand-color-minimal-mapping.md).
- **`public/*.svg` via `<img>`.** Rejected — cannot inherit `currentColor`, so
  light/dark theming breaks; would need duplicate assets.
- **Add `simple-icons` dependency.** Rejected — eight inline paths don't justify
  a package (AGENTS.md §4, no silent dependencies).
- **Animated marquee.** Rejected — noise, against the "quiet confidence" ethos.
- **Place in shared footer (`layout.tsx`).** Rejected — would render on
  sign-in/sign-up too; the strip belongs to the marketing narrative.

## Decision

Add a `BuiltWith` server component
([`src/components/built-with.tsx`](../src/components/built-with.tsx)) rendered as
the last section of the marketing home page
([`page.tsx`](../src/app/(marketing)/page.tsx)) — home-only, above the layout
footer.

- **Tools (open-source only):** Next.js (MIT), React (MIT), TypeScript
  (Apache-2.0), Tailwind CSS (MIT), Drizzle ORM (Apache-2.0), PostgreSQL
  (PostgreSQL License), Better Auth (MIT), pnpm (MIT). Stored as a data-driven
  array for easy audit/extension.
- **Treatment:** inline Simple Icons glyphs with `fill="currentColor"`, coloured
  via `text-muted-foreground`; monochrome always, subtle `opacity-70 →
  hover/focus opacity-100` only. No new dependency.
- **Honours [ADR-0005](ADR-0005-brand-color-minimal-mapping.md)** (neutral
  palette, grass focus ring as the single brand cue) and
  [ADR-0007](ADR-0007-interaction-states-motion.md) (animate opacity only,
  global reduced-motion guard).
- **Links:** each logo links out (`target="_blank"`,
  `rel="noopener noreferrer"`, `aria-label`); a caption notes logos belong to
  their respective projects (nominative use).

## Consequences

- The openness claim is now shown, not just asserted, reinforcing the open-
  product story at low cost.
- The tool list must stay open-only over time; the data-driven array makes this
  audit cheap, and the "open tools" framing is the guard.
- Brand glyphs may drift; refreshing is eight static paths in one file.
- Reversible: one component + one render line. Trivial to remove.
- Adjacent follow-up: the marketing footer expansion (RFC-0006) sits directly
  below this strip and shares the same monochrome, quiet-confidence treatment.

## Links

- RFC: [RFC-0005](../product/rfc/RFC-0005-built-with-marketing.md)
- Implementation: `src/components/built-with.tsx`, `src/app/(marketing)/page.tsx`
- Builds on: [ADR-0005](ADR-0005-brand-color-minimal-mapping.md),
  [ADR-0007](ADR-0007-interaction-states-motion.md)
