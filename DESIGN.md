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
