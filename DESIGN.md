# Grasshopper — Design System

## Design Philosophy

Quiet confidence. Grasshopper looks like it was made by people who care deeply but don't need to prove it. Every pixel is intentional. Whitespace is a feature, not a gap to fill.

**References:** Linear, Vercel, Raycast, Stripe — products that feel expensive without being loud.  
**Anti-references:** ADPList (too colorful/playful), Dribbble-style maximalism, corporate SaaS dashboards.

## Design Principles

1. **Every element earns its place.** If removing it doesn't break anything, remove it.
2. **Quiet confidence over loud persuasion.** No exclamation marks in the UI. No "amazing!" No confetti.
3. **Content-first hierarchy.** The mentor's expertise and the mentee's goals are the hero — not the chrome around them.
4. **Accessibility is non-negotiable.** WCAG 2.1 AA minimum. Focus states, contrast ratios, screen reader support. Beautiful and accessible are not in tension.
5. **Progressive density.** New users see less. Committed pairs unlock more (notes, goals). Complexity is earned.

## Visual Direction

### Color

- Neutral palette as foundation: near-black text, warm grays, off-white backgrounds
- One accent color (to be defined) — used sparingly for primary actions and active states
- Dark mode as first-class citizen, not an afterthought
- Avoid pure black (#000) and pure white (#FFF) — use off-values for warmth

### Typography

- Primary: **Geist** (via `next/font/local` or `geist` package)
- Monospace: **Geist Mono** for tags, metadata, code snippets
- Type scale (Tailwind): `text-xs` through `text-4xl` — 6 sizes max
- Body: 16px (`text-base`), comfortable reading at 1.6 line-height
- Headings: tight tracking (`tracking-tight`), 1.2 line-height

### Spacing

- Tailwind default spacing scale (4px base unit)
- Generous padding and margins — the platform should breathe
- Use Tailwind spacing tokens consistently (`p-4`, `gap-6`, `space-y-8`)
- No arbitrary values (`p-[13px]`) unless truly unavoidable

### Radius & Elevation

- Subtle border-radius (6-8px for cards, 4px for inputs, full-round for avatars/pills)
- Minimal shadows — prefer subtle borders or background-color shifts for elevation
- No heavy drop shadows or 3D effects

### Icons

- **Phosphor Icons** (`@phosphor-icons/react`) — mono-weight, line-style
- Default weight: `regular` (1.5px stroke). Use `light` for dense UI, `bold` for emphasis
- 20-24px default size
- No filled/colored icons in navigation — keep them quiet
- Import individually for tree-shaking: `import { MagnifyingGlass } from '@phosphor-icons/react'`

### Motion

- Subtle, fast transitions (150-200ms for micro-interactions)
- Easing: ease-out for entrances, ease-in for exits
- No bouncy/spring animations — movement should feel precise, not playful
- Respect `prefers-reduced-motion`

## Information Architecture

### Pages (v1)

```
/                     → Landing page (value prop, CTA to explore)
/explore              → Browse mentors (filter by expertise, search)
/mentor/:slug         → Mentor profile (bio, expertise, availability, reviews)
/book/:mentor/:slot   → Booking confirmation
/dashboard            → Mentee: goals + upcoming sessions
                        Mentor: availability + incoming requests
/session/:id          → Session view (details + shared notes)
/settings             → Profile editing, notification preferences
```

### Navigation

- Minimal top nav: Logo, Explore, Dashboard, Profile/Avatar
- No sidebar in v1
- Mobile: bottom tab bar (Explore, Sessions, Profile)

### Key Flows

1. **Mentee finds mentor:** Landing → Explore → Filter/Search → Profile → Book
2. **Session happens:** Dashboard → Session → Notes (during/after)
3. **Goal tracking:** Dashboard → Goals → Link sessions → Track progress
4. **Mentor manages:** Dashboard → Set availability → Review requests → Accept/Decline

## Component Philosophy

- Restrained library — fewer components, each well-crafted
- Cards are the primary content container (mentor cards, session cards, goal cards)
- Forms are minimal: single-column, clear labels, inline validation
- Buttons: Primary (accent), Secondary (outline), Ghost (text-only). No more than 3 variants.
- Empty states are thoughtful — guide the user, don't just say "nothing here"

## Responsive Strategy

- Mobile-first design and implementation
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Single-column on mobile, two-column on desktop where appropriate
- Touch targets: 44px minimum
- No horizontal scrolling ever

## Imagery & Avatars

- Avatars: circular, 40-64px in cards, 96-128px on profile pages
- Placeholder: initials on neutral gradient (no generic silhouette icons)
- No stock photography — prefer illustrations sparingly, or let content speak

## Tone of UI Copy

- Short, direct, lowercase-feeling (even if capitalized)
- No jargon, no corporate speak
- Labels over instructions where possible
- Error messages are helpful, not apologetic ("Check your email" not "Oops! Something went wrong!")

---

# Token Reference

The token-level color spec, exported from Figma and reconciled against the
codebase. Primitives are the source of truth in
[`src/app/globals.css`](src/app/globals.css) (`@theme inline`); the brand ramp is
also narrated in [`design/tokens/colors.md`](design/tokens/colors.md).

> **Scope note.** This export covers **color only**. Typography, spacing, radius,
> elevation, and component recipes are defined in **Visual Direction** above and
> in the radius scale in `globals.css` — they did not change. Repointing semantic
> tokens (`--primary`, `--accent`, …) to the brand ramp is a design-system change
> and is **RFC-gated** — see [AGENTS.md](AGENTS.md) and `product/rfc/`.

## 1. Color primitives

oklch values computed from HEX via sRGB → Oklab → oklch.

### 1a. Brand ramp — `grass/*`

| Step | Token | HEX | oklch() | Name |
|------|-------|-----|---------|------|
| 50  | `grass/50`  | `#E1EECC` | `oklch(93.33% 0.0438 59.25)`  | Mist      |
| 100 | `grass/100` | `#CDE2A9` | `oklch(88.56% 0.0558 70.34)`  | Dew       |
| 200 | `grass/200` | `#A4C77F` | `oklch(78.90% 0.0601 84.23)`  | Sage      |
| 300 | `grass/300` | `#9BC34B` | `oklch(76.61% 0.0845 86.36)`  | Lime      |
| 400 | `grass/400` | `#83B328` | `oklch(70.92% 0.0875 91.97)`  | Meadow    |
| 500 | `grass/500` | `#5B9518` | `oklch(60.87% 0.0786 101.61)` | Moss      |
| 600 | `grass/600` | `#468613` | `oklch(55.76% 0.0743 107.49)` | Fern      |
| 700 | `grass/700` | `#3C7209` | `oklch(49.69% 0.0669 106.42)` | Deep Fern |
| 800 | `grass/800` | `#17651A` | `oklch(44.64% 0.0620 122.17)` | Canopy    |
| 900 | `grass/900` | `#05481F` | `oklch(35.42% 0.0446 132.12)` | Forest    |
| 950 | `grass/950` | `#012305` | `oklch(22.44% 0.0319 125.80)` | Void      |

### 1b. Neutral ramp — `neutral/*`

Subtly warm grays (very low chroma). Text, borders, surfaces — never brand
expression.

| Step | Token | HEX | oklch() |
|------|-------|-----|---------|
| white | `neutral/white` | `#FFFFFF` | `oklch(100% 0 0)` |
| 50  | `neutral/50`  | `#F5F7F3` | `oklch(97.67% 0.0307 33.98)` |
| 100 | `neutral/100` | `#E8ECE5` | `oklch(94.11% 0.0300 38.37)` |
| 200 | `neutral/200` | `#D0D6CB` | `oklch(87.12% 0.0294 44.39)` |
| 300 | `neutral/300` | `#ABB3A5` | `oklch(75.88% 0.0271 51.51)` |
| 400 | `neutral/400` | `#828B7A` | `oklch(62.63% 0.0256 59.49)` |
| 500 | `neutral/500` | `#62695B` | `oklch(51.20% 0.0216 59.91)` |
| 600 | `neutral/600` | `#4B5145` | `oklch(42.70% 0.0185 61.50)` |
| 700 | `neutral/700` | `#383D34` | `oklch(35.34% 0.0147 62.07)` |
| 800 | `neutral/800` | `#242820` | `oklch(27.08% 0.0126 65.19)` |
| 900 | `neutral/900` | `#151812` | `oklch(20.42% 0.0098 66.70)` |
| 950 | `neutral/950` | `#0C0D0A` | `oklch(15.71% 0.0070 54.27)` |

### 1c. Utility colors — `utility/*`

Status/feedback only — never decorative.

| Token | HEX | oklch() |
|-------|-----|---------|
| `utility/error`             | `#DC2626` | `oklch(57.71% 0.2103 17.08)`  |
| `utility/error-subtle`      | `#FEF2F2` | `oklch(97.35% 0.0406 24.16)`  |
| `utility/error-dark`        | `#F87171` | `oklch(71.13% 0.1693 15.90)`  |
| `utility/error-subtle-dark` | `#450A0A` | `oklch(25.76% 0.0871 16.74)`  |
| `utility/warning`             | `#D97706` | `oklch(66.59% 0.1565 32.17)` |
| `utility/warning-subtle`      | `#FFFBEB` | `oklch(98.99% 0.0444 38.67)` |
| `utility/warning-dark`        | `#FCD34D` | `oklch(88.01% 0.1293 50.88)` |
| `utility/warning-subtle-dark` | `#451A03` | `oklch(27.91% 0.0753 26.12)` |
| `utility/info`             | `#2563EB` | `oklch(54.66% 0.2273 217.53)` |
| `utility/info-subtle`      | `#EFF6FF` | `oklch(97.38% 0.0176 19.14)`  |
| `utility/info-dark`        | `#60A5FA` | `oklch(71.71% 0.1231 221.03)` |
| `utility/info-subtle-dark` | `#172554` | `oklch(28.32% 0.0787 224.36)` |

### 1d. Special dark surfaces (hand-tuned, no ramp counterpart)

| Name | HEX | oklch() | Maps to (dark) |
|------|-----|---------|----------------|
| `surface-page-dk`    | `#0A1A08` | `oklch(19.85% 0.0197 112.44)` | `background`        |
| `surface-subtle-dk`  | `#0D2110` | `oklch(22.60% 0.0199 120.90)` | `muted`            |
| `surface-default-dk` | `#112B14` | `oklch(26.22% 0.0252 120.69)` | `card` / `popover` |

## 2. Semantic tokens

Mapping to shadcn/ui token names. ⚠️ marks a WCAG pairing to verify per theme.
**Two candidate mappings are being A/B tested** — see
`product/rfc/RFC-0002`. The table below is the **full theme** (most brand-forward);
the **minimal** variant keeps `background`/`card`/`foreground`/`primary` neutral and
applies `grass` only to `ring`, `accent`, links, and selected states.

| shadcn token | Light primitive | Light HEX | Dark primitive | Dark HEX | Usage |
|--------------|-----------------|-----------|----------------|----------|-------|
| `background` | `neutral/50` | `#F5F7F3` | `surface-page-dk` | `#0A1A08` | Page canvas |
| `foreground` | `neutral/950` | `#0C0D0A` | `grass/50` | `#E1EECC` | Body/heading text |
| `card` | `neutral/white` | `#FFFFFF` | `surface-default-dk` | `#112B14` | Card, panel bg |
| `card-foreground` | `neutral/950` | `#0C0D0A` | `grass/50` | `#E1EECC` | Text on card |
| `popover` | `neutral/white` | `#FFFFFF` | `surface-default-dk` | `#112B14` | Dropdown, tooltip bg |
| `popover-foreground` | `neutral/950` | `#0C0D0A` | `grass/50` | `#E1EECC` | Text on popover |
| `primary` ⚠️ | `grass/600` | `#468613` | `grass/400` | `#83B328` | CTA bg |
| `primary-foreground` ⚠️ | `neutral/white` | `#FFFFFF` | `grass/950` | `#012305` | Text on primary |
| `secondary` | `grass/200` | `#A4C77F` | `grass/700` | `#3C7209` | Secondary button/chip bg |
| `secondary-foreground` | `grass/900` | `#05481F` | `grass/100` | `#CDE2A9` | Text on secondary |
| `muted` | `grass/50` | `#E1EECC` | `surface-subtle-dk` | `#0D2110` | Subtle tinted bg |
| `muted-foreground` | `neutral/400` | `#828B7A` | `grass/400` | `#83B328` | Placeholders, timestamps |
| `accent` | `grass/400` | `#83B328` | `grass/500` | `#5B9518` | Accent highlight, hover bg |
| `accent-foreground` | `grass/950` | `#012305` | `grass/50` | `#E1EECC` | Text on accent |
| `destructive` | `utility/error` | `#DC2626` | `utility/error-dark` | `#F87171` | Error, destructive action |
| `border` | `neutral/200` | `#D0D6CB` | `grass/800` | `#17651A` | Dividers/outlines |
| `input` | `neutral/200` | `#D0D6CB` | `grass/800` | `#17651A` | Input field border |
| `ring` | `grass/500` | `#5B9518` | `grass/400` | `#83B328` | Focus ring |
| `chart-1` | `grass/500` | `#5B9518` | `grass/400` | `#83B328` | Primary data series |
| `chart-2` | `grass/300` | `#9BC34B` | `grass/300` | `#9BC34B` | Secondary data series |
| `chart-3` | `grass/800` | `#17651A` | `grass/700` | `#3C7209` | Tertiary data series |
| `chart-4` | `utility/warning` | `#D97706` | `utility/warning-dark` | `#FCD34D` | Accent data series |
| `chart-5` | `utility/info` | `#2563EB` | `utility/info-dark` | `#60A5FA` | Contrast data series |
| `sidebar` | `neutral/white` | `#FFFFFF` | `grass/900` | `#05481F` | Sidebar background |
| `sidebar-foreground` | `neutral/950` | `#0C0D0A` | `grass/50` | `#E1EECC` | Sidebar text |
| `sidebar-primary` | `grass/600` | `#468613` | `grass/400` | `#83B328` | Active sidebar item |
| `sidebar-primary-foreground` | `neutral/white` | `#FFFFFF` | `grass/950` | `#012305` | Text on active sidebar |
| `sidebar-accent` | `grass/100` | `#CDE2A9` | `grass/800` | `#17651A` | Hover bg in sidebar |
| `sidebar-accent-foreground` | `neutral/950` | `#0C0D0A` | `grass/50` | `#E1EECC` | Text on sidebar hover |

> Grasshopper ships **no sidebar in v1** (top nav only — see IA above), so the
> `sidebar-*` tokens are wired for completeness but currently unused.
