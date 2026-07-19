# RFC-0005: "Built with open tools" strip on the marketing page

- **Status:** Accepted
- **Author:** natos
- **Created:** 2026-06-26
- **Discipline:** Design (which hat decides)
- **Tracking issue:** [ADR-0008](../../decisions/ADR-0008-built-with-marketing-strip.md)

## Summary

Add a quiet, monochrome **"Built with open tools"** strip to the bottom of the
marketing home page ([`page.tsx`](../../src/app/(marketing)/page.tsx)), directly
above the footer. It credits the open-source stack Grsshppr is built on — Next.js,
React, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL, Better Auth, pnpm — as a
row of small, single-colour logos rendered in `currentColor`. No brand colour, no
animation, no new dependency. The strip reinforces the "open, community-owned"
message by *showing* that the foundations are open too.

## Motivation

The page tells visitors the product is open source and community-owned, but it
never shows what that openness is *made of*. Open products that earn trust tend to
credit their foundations (Supabase's "built with open source tools", Cal.com's
self-host/stack callouts) — it signals that the openness goes all the way down, not
just the top-level repo.

There is a sharper reason to be careful here: a strip that says "open tools" must
only list tools that are *actually* open. The hosting and forge platforms we depend
on — Vercel and GitHub — are proprietary. Crediting them under this banner would be
self-contradictory. They stay credited where they already are (the GitHub links in
the Open Source and CTA sections); they do not belong in *this* strip.

If we do nothing: the openness claim stays abstract, and we miss a low-cost,
on-brand reinforcement of the core message.

## Proposal

Additive and minimal. One new server component, one render call, zero
dependencies.

### 1. Placement & framing

- A new `<section>` rendered as the **last block of the home page**
  ([`page.tsx`](../../src/app/(marketing)/page.tsx)), so it sits visually above the
  layout footer while staying **home-only** (not on `sign-in` / `sign-up`, which
  share the marketing layout).
- Reuses the established section rhythm: `border-t border-border px-6 py-12`
  (shorter than the `py-20` feature sections — this is supporting, not a feature).
- Label uses the existing eyebrow pattern:
  `text-sm font-medium uppercase tracking-wider text-muted-foreground`, reading
  **"Built with open tools"**.

### 2. Tool list (open-source only)

Every entry is permissively licensed and present in
[`package.json`](../../package.json):

| Tool | License | Role |
|------|---------|------|
| Next.js | MIT | framework |
| React | MIT | UI runtime |
| TypeScript | Apache-2.0 | language |
| Tailwind CSS | MIT | styling |
| Drizzle ORM | Apache-2.0 | data access |
| PostgreSQL | PostgreSQL License | database |
| Better Auth | MIT | auth |
| pnpm | MIT | package manager |

Stored as a `tools` array (`{ name, href, icon }`) so the list is data-driven and
trivial to extend or audit.

### 3. Logo treatment (monochrome)

- Logos are **inline JSX SVGs** using `fill="currentColor"`, coloured via
  `text-muted-foreground`. This is required for correct light/dark theming —
  static `public/*.svg` rendered through `<img>` cannot inherit `currentColor`.
  Glyph paths are sourced from Simple Icons (single-colour brand glyphs); the small
  set lives in the component file, so it stays a local, zero-dependency set.
- Monochrome **always** — no colour reveal on hover. The only interaction is a
  subtle opacity lift (`opacity-70` → `hover:opacity-100`, `transition-opacity`),
  consistent with [RFC-0004](RFC-0004-interaction-states-motion.md) (animate
  `opacity` only; the reduced-motion guard is already global).
- Honours [ADR-0005](../../decisions/ADR-0005-brand-color-minimal-mapping.md):
  neutral palette, no decorative brand colour; the grass focus ring remains the
  single brand cue (visible on keyboard nav).

### 4. Links & accessibility

- Each logo links to the tool's site: `target="_blank"`,
  `rel="noopener noreferrer"`, with an `aria-label` (e.g. "Next.js — opens in a new
  tab").
- Logo + wordmark are shown together (some marks — Drizzle, Better Auth, pnpm — are
  not widely recognised; the name keeps the row legible and accessible).
- Layout: `flex flex-wrap items-center justify-center` with gap, so logos wrap
  gracefully on mobile.
- A small caption notes logos belong to their respective projects (nominative use).

## Alternatives considered

- **Keep Vercel + GitHub in the list.** Rejected — they are proprietary platforms;
  listing them under "open tools" is inaccurate. They remain credited via the
  existing GitHub links elsewhere on the page.
- **Full-colour brand logos, small and low-opacity.** Rejected — violates
  ADR-0005's neutral, no-decorative-colour rule and reads louder than intended.
  Monochrome is the on-brand choice.
- **Colour-on-hover reveal.** Rejected — still introduces decorative brand colour
  and adds motion for no functional gain.
- **Static `public/logos/*.svg` via `<img>`.** Rejected — cannot inherit
  `currentColor`, so dark mode and the muted token break; would need duplicate
  light/dark assets. Inline JSX is simpler and themable.
- **Add `simple-icons` as a dependency.** Rejected — eight inline paths don't
  justify a package; the no-new-dependency rule (AGENTS.md §4) applies. Inlining
  keeps it lazy.
- **Animated marquee / scrolling logos.** Rejected — noise, motion cost, and
  against the "quiet confidence" ethos.
- **Place in the shared footer (`layout.tsx`).** Rejected — would render on
  `sign-in` / `sign-up` too; the strip belongs to the marketing narrative, not auth
  screens.

## Risks & trade-offs

- **Trademark / nominative use.** Third-party logos are used nominatively to state
  what the product is built with. Keeping them monochrome and linking to the owners
  is the conservative, widely-accepted approach. The component notes logos belong to
  their respective projects.
- **Logo drift.** Brand glyphs change occasionally; the inline set may go stale.
  Low blast radius — eight static paths in one file, easy to refresh.
- **List honesty over time.** If the stack changes, the list must stay open-only.
  The data-driven array makes audits easy; the "open tools" framing is the guard.
- **Reversibility.** High — one new component + one render line. Trivial to remove.

## Open questions

- Should Zod, shadcn/ui, or Phosphor (also open, also in the stack) be added later?
  Deferred — eight reads clean; the array makes extension cheap if we want it.
- Do we want a trailing "— and you?" link to `CONTRIBUTING.md` to convert the
  openness signal into a contribution nudge? Possible follow-up, out of scope here.

## Outcome

**Accepted** (2026-06-26) and recorded as
[ADR-0008](../../decisions/ADR-0008-built-with-marketing-strip.md). Shipped: the
`BuiltWith` server component
([`src/components/built-with.tsx`](../../src/components/built-with.tsx)) rendered
as the final section of the home page
([`page.tsx`](../../src/app/(marketing)/page.tsx)). Eight open-source tools,
monochrome `currentColor` glyphs, no new dependency. The marketing footer
expansion is tracked separately as RFC-0006.
