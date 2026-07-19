# Component inventory

The components Grasshopper actually ships, what they consume, and where they're
used. This is the `patterns/` layer promised in [../README.md](../README.md):
the bridge between the [token layers](../tokens) and the running product.

Everything here is rendered from semantic tokens defined in
[`src/app/globals.css`](../../src/app/globals.css). No component hard-codes a
brand or status color — change a token, every component follows.

- **Primitives** live in `src/components/ui/` (shadcn/ui over `@base-ui/react`).
- **App components** live in `src/components/` and compose primitives + product
  logic.
- Import alias: `@/components/ui/*` and `@/components/*`.

## Conventions

- **Semantic tokens only.** Use `bg-primary`, `text-muted-foreground`,
  `border-input`, `ring-ring`, `bg-destructive`, … — never raw `bg-green-500` or
  hex. (Audited: zero raw color classes in shipped components.)
- **Variants via `cva`.** `class-variance-authority` is the pattern for
  multi-variant primitives. Today only `button` and `badge` use it; new
  multi-variant primitives should follow suit.
- **Interaction + motion come from tokens.** Hover / focus / disabled / active
  and transitions follow [ADR-0007](../../decisions/ADR-0007-interaction-states-motion.md);
  status colors follow [ADR-0006](../../decisions/ADR-0006-status-token-layer.md).
  Reuse the same `focus-visible:ring-ring/50` + `focus-visible:ring-3` focus
  pattern across inputs and buttons.
- **Accessibility is non-negotiable.** Every interactive primitive carries a
  visible `focus-visible` ring and honors `disabled` / `aria-invalid`.

## Primitives (`src/components/ui/`)

| Component | Purpose | Variants / sizes | Key tokens | `cva` |
|-----------|---------|------------------|------------|:----:|
| [avatar](../../src/components/ui/avatar.tsx) | User image w/ initials fallback, badge, group | size: default · sm · lg | `bg-muted` `text-muted-foreground` `bg-primary` `ring-background` | — |
| [badge](../../src/components/ui/badge.tsx) | Inline label / tag | default · secondary · destructive · outline · ghost · link | `bg-primary` `bg-secondary` `bg-destructive/10` `text-destructive` `focus-visible:ring-ring/50` | ✓ |
| [button](../../src/components/ui/button.tsx) | Primary interactive control | default · outline · secondary · ghost · destructive · link × 7 sizes (incl. icon) | `bg-primary` `text-primary-foreground` `hover:bg-primary/80` `focus-visible:ring-ring/50` `disabled:opacity-50` | ✓ |
| [card](../../src/components/ui/card.tsx) | Grouped-content container | size: default · sm | `bg-card` `text-card-foreground` `ring-foreground/10` `text-muted-foreground` | — |
| [dropdown-menu](../../src/components/ui/dropdown-menu.tsx) | Floating menu, submenus, checkbox/radio | item: default · destructive; `inset` | `bg-popover` `focus:bg-accent` `focus:text-accent-foreground` `text-destructive` | — |
| [input](../../src/components/ui/input.tsx) | Single-line text field | — | `border-input` `focus-visible:ring-ring/50` `placeholder:text-muted-foreground` `aria-invalid:border-destructive` | — |
| [label](../../src/components/ui/label.tsx) | Form label w/ disabled handling | — | `peer-disabled:opacity-50` | — |
| [select](../../src/components/ui/select.tsx) | Dropdown select w/ portal + groups | trigger size: sm · default | `border-input` `bg-popover` `focus:bg-accent` `data-placeholder:text-muted-foreground` | — |
| [separator](../../src/components/ui/separator.tsx) | Divider line | orientation: horizontal · vertical | `bg-border` | — |
| [sheet](../../src/components/ui/sheet.tsx) | Edge drawer / modal w/ overlay | side: top · right · bottom · left | `bg-popover` `text-popover-foreground` `bg-black/10` `backdrop-blur-xs` | — |
| [textarea](../../src/components/ui/textarea.tsx) | Multi-line text field | — | `border-input` `focus-visible:ring-ring/50` `aria-invalid:ring-destructive/20` | — |

## App components (`src/components/`)

| Component | Purpose | Composes | Used by |
|-----------|---------|----------|---------|
| [mobile-nav](../../src/components/mobile-nav.tsx) | Mobile-only nav drawer (`sm:hidden`) | sheet | platform layout |
| [notification-bell](../../src/components/notification-bell.tsx) | Notifications dropdown + unread badge | dropdown-menu | platform layout |
| [profile-nudge](../../src/components/profile-nudge.tsx) | Dismissible "complete your profile" banner | — | dashboard |
| [theme-provider](../../src/components/theme-provider.tsx) | `next-themes` context for dark mode | — | root layout |
| [theme-toggle](../../src/components/theme-toggle.tsx) | Light/dark switch (Sun/Moon) | — | marketing + platform layouts |
| [user-menu](../../src/components/user-menu.tsx) | Profile + settings + sign-out menu | avatar, dropdown-menu | platform layout |

## Notes & gaps

- **Most used:** button (14 imports), avatar (9), badge (8), input (5).
- **`separator` is shipped but unused** in `src/` — adopt it where dividers are
  currently ad-hoc, or leave as an available primitive.
- **Status semantics** (`success` / `warning` / `info`) from
  [ADR-0006](../../decisions/ADR-0006-status-token-layer.md) exist as tokens but
  there is **no status `alert` / `callout` primitive yet** — components express
  status inline. A small `alert` primitive is the obvious next pattern.

> Keep this file in sync when adding or removing a component. New multi-variant
> primitives use `cva`; everything renders from semantic tokens in `globals.css`.
