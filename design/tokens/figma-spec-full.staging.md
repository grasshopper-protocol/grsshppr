<!--
  STAGING / REFERENCE ONLY — do NOT commit, do NOT implement verbatim.
  Source: full Figma design-system export pasted 2026-06-25.
  Why staging: this is the COMPLETE system (status layer, custom tokens, type,
  radius, elevation, recipes), far beyond the color-only export already
  reconciled into DESIGN.md. Adopting any semantic/token layer here is RFC-gated
  (AGENTS.md). Known traps before using: (1) the oklch() values below are the
  desaturated/hue-shifted export set — trust the HEX, not the oklch (grass/600
  hex #468613 vs its oklch → olive #787742). (2) Appendix A redefines
  --color-neutral-* which CLOBBERS Tailwind's built-in neutral-* — do not paste
  as-is. (3) §2a is the FULL theme (green primary); we shipped MINIMAL (ADR-0005).
-->

# Grasshopper Design System — Machine-Readable Spec
> Target: Next.js + Tailwind CSS v4 (`@theme inline`) + shadcn/ui · brand namespace `grass`
> All oklch values computed from HEX via sRGB → Oklab → oklch (Björn Ottosson, 2020).
> Every inconsistency is flagged with `⚠️`.

---

## 1. COLOR PRIMITIVES

### 1a. Brand Ramp — `grass/*`

| Step | Token name  | HEX       | oklch()                         | Internal name |
|------|-------------|-----------|----------------------------------|---------------|
| 50   | `grass/50`  | `#E1EECC` | `oklch(93.33% 0.0438 59.25)`    | Mist          |
| 100  | `grass/100` | `#CDE2A9` | `oklch(88.56% 0.0558 70.34)`    | Dew           |
| 200  | `grass/200` | `#A4C77F` | `oklch(78.90% 0.0601 84.23)`    | Sage          |
| 300  | `grass/300` | `#9BC34B` | `oklch(76.61% 0.0845 86.36)`    | Lime          |
| 400  | `grass/400` | `#83B328` | `oklch(70.92% 0.0875 91.97)`    | Meadow        |
| 500  | `grass/500` | `#5B9518` | `oklch(60.87% 0.0786 101.61)`   | Moss          |
| 600  | `grass/600` | `#468613` | `oklch(55.76% 0.0743 107.49)`   | Fern          |
| 700  | `grass/700` | `#3C7209` | `oklch(49.69% 0.0669 106.42)`   | Deep Fern     |
| 800  | `grass/800` | `#17651A` | `oklch(44.64% 0.0620 122.17)`   | Canopy        |
| 900  | `grass/900` | `#05481F` | `oklch(35.42% 0.0446 132.12)`   | Forest        |
| 950  | `grass/950` | `#012305` | `oklch(22.44% 0.0319 125.80)`   | Void          |

### 1b. Neutral Ramp — `neutral/*`

Slightly green-tinted warm grays. Use for text, borders, surfaces — never brand expression.

| Step  | Token name       | HEX       | oklch()                        |
|-------|------------------|-----------|--------------------------------|
| white | `neutral/white`  | `#FFFFFF` | `oklch(100% 0 0)`              |
| 50    | `neutral/50`     | `#F5F7F3` | `oklch(97.67% 0.0307 33.98)`   |
| 100   | `neutral/100`    | `#E8ECE5` | `oklch(94.11% 0.0300 38.37)`   |
| 200   | `neutral/200`    | `#D0D6CB` | `oklch(87.12% 0.0294 44.39)`   |
| 300   | `neutral/300`    | `#ABB3A5` | `oklch(75.88% 0.0271 51.51)`   |
| 400   | `neutral/400`    | `#828B7A` | `oklch(62.63% 0.0256 59.49)`   |
| 500   | `neutral/500`    | `#62695B` | `oklch(51.20% 0.0216 59.91)`   |
| 600   | `neutral/600`    | `#4B5145` | `oklch(42.70% 0.0185 61.50)`   |
| 700   | `neutral/700`    | `#383D34` | `oklch(35.34% 0.0147 62.07)`   |
| 800   | `neutral/800`    | `#242820` | `oklch(27.08% 0.0126 65.19)`   |
| 900   | `neutral/900`    | `#151812` | `oklch(20.42% 0.0098 66.70)`   |
| 950   | `neutral/950`    | `#0C0D0A` | `oklch(15.71% 0.0070 54.27)`   |

### 1c. Utility Colors — `utility/*`

Non-brand. Status/feedback only — never decorative.

| Token name                    | HEX       | oklch()                          |
|-------------------------------|-----------|----------------------------------|
| `utility/error`               | `#DC2626` | `oklch(57.71% 0.2103 17.08)`     |
| `utility/error-subtle`        | `#FEF2F2` | `oklch(97.35% 0.0406 24.16)`     |
| `utility/error-dark`          | `#F87171` | `oklch(71.13% 0.1693 15.90)`     |
| `utility/error-subtle-dark`   | `#450A0A` | `oklch(25.76% 0.0871 16.74)`     |
| `utility/warning`             | `#D97706` | `oklch(66.59% 0.1565 32.17)`     |
| `utility/warning-subtle`      | `#FFFBEB` | `oklch(98.99% 0.0444 38.67)`     |
| `utility/warning-dark`        | `#FCD34D` | `oklch(88.01% 0.1293 50.88)`     |
| `utility/warning-subtle-dark` | `#451A03` | `oklch(27.91% 0.0753 26.12)`     |
| `utility/info`                | `#2563EB` | `oklch(54.66% 0.2273 217.53)`    |
| `utility/info-subtle`         | `#EFF6FF` | `oklch(97.38% 0.0176 19.14)`     |
| `utility/info-dark`           | `#60A5FA` | `oklch(71.71% 0.1231 221.03)`    |
| `utility/info-subtle-dark`    | `#172554` | `oklch(28.32% 0.0787 224.36)`    |

### 1d. Special Dark Surfaces (hand-tuned, no ramp counterpart)

| Name                | HEX       | oklch()                         | Maps to semantic         |
|---------------------|-----------|---------------------------------|--------------------------|
| `surface-page-dk`   | `#0A1A08` | `oklch(19.85% 0.0197 112.44)`  | `background` (dark)      |
| `surface-subtle-dk` | `#0D2110` | `oklch(22.60% 0.0199 120.90)`  | `muted` (dark)           |
| `surface-default-dk`| `#112B14` | `oklch(26.22% 0.0252 120.69)`  | `card` / `popover` (dark)|

---

## 2. SEMANTIC TOKENS

### 2a. Mapping to shadcn/ui token names

| Our token | shadcn token | Light primitive | Light HEX | Dark primitive | Dark HEX | Usage note |
|-----------|-------------|-----------------|-----------|----------------|----------|------------|
| `background/page` | `background` | `neutral/50` | `#F5F7F3` | `surface-page-dk` | `#0A1A08` | Page canvas |
| `text/primary` | `foreground` | `neutral/950` | `#0C0D0A` | `grass/50` | `#E1EECC` | Body/heading text |
| `surface/default` | `card` | `neutral/white` | `#FFFFFF` | `surface-default-dk` | `#112B14` | Card, panel bg |
| `text/primary` | `card-foreground` | `neutral/950` | `#0C0D0A` | `grass/50` | `#E1EECC` | Text on card |
| `surface/default` | `popover` | `neutral/white` | `#FFFFFF` | `surface-default-dk` | `#112B14` | Dropdown, tooltip bg |
| `text/primary` | `popover-foreground` | `neutral/950` | `#0C0D0A` | `grass/50` | `#E1EECC` | Text on popover |
| `brand/primary` | `primary` ⚠️ | `grass/600` | `#468613` | `grass/400` | `#83B328` | CTA bg — see WCAG note |
| `brand/on-primary` | `primary-foreground` ⚠️ | `neutral/white` | `#FFFFFF` | `grass/950` | `#012305` | Text on primary — see WCAG note |
| `brand/secondary` | `secondary` | `grass/200` | `#A4C77F` | `grass/700` | `#3C7209` | Secondary button/chip bg |
| `brand/on-secondary` | `secondary-foreground` | `grass/900` | `#05481F` | `grass/100` | `#CDE2A9` | Text on secondary |
| `background/subtle` | `muted` | `grass/50` | `#E1EECC` | `surface-subtle-dk` | `#0D2110` | Subtle tinted bg |
| `text/muted` | `muted-foreground` | `neutral/400` | `#828B7A` | `grass/400` | `#83B328` | Placeholders, timestamps |
| `brand/tertiary` | `accent` | `grass/400` | `#83B328` | `grass/500` | `#5B9518` | Accent highlight, hover bg |
| `brand/on-tertiary` | `accent-foreground` | `grass/950` | `#012305` | `grass/50` | `#E1EECC` | Text on accent |
| `status/error` | `destructive` | `utility/error` | `#DC2626` | `utility/error-dark` | `#F87171` | Error, destructive action |
| `border/default` | `border` | `neutral/200` | `#D0D6CB` | `grass/800` | `#17651A` | Default dividers/outlines |
| `border/default` | `input` | `neutral/200` | `#D0D6CB` | `grass/800` | `#17651A` | Input field border |
| `border/brand` | `ring` | `grass/500` | `#5B9518` | `grass/400` | `#83B328` | Focus ring |
| `grass/500` | `chart-1` | `grass/500` | `#5B9518` | `grass/400` | `#83B328` | Primary data series |
| `grass/300` | `chart-2` | `grass/300` | `#9BC34B` | `grass/300` | `#9BC34B` | Secondary data series |
| `grass/800` | `chart-3` | `grass/800` | `#17651A` | `grass/700` | `#3C7209` | Tertiary data series |
| `utility/warning` | `chart-4` | `utility/warning` | `#D97706` | `utility/warning-dark` | `#FCD34D` | Accent data series |
| `utility/info` | `chart-5` | `utility/info` | `#2563EB` | `utility/info-dark` | `#60A5FA` | Contrast data series |
| `surface/raised` | `sidebar` | `neutral/white` | `#FFFFFF` | `grass/900` | `#05481F` | Sidebar background |
| `text/primary` | `sidebar-foreground` | `neutral/950` | `#0C0D0A` | `grass/50` | `#E1EECC` | Sidebar text |
| `brand/primary` | `sidebar-primary` | `grass/600` | `#468613` | `grass/400` | `#83B328` | Active sidebar item |
| `brand/on-primary` | `sidebar-primary-foreground` | `neutral/white` | `#FFFFFF` | `grass/950` | `#012305` | Text on active sidebar |
| `brand/tertiary-subtle` | `sidebar-accent` | `grass/100` | `#CDE2A9` | `grass/800` | `#17651A` | Hover bg in sidebar |
| `text/primary` | `sidebar-accent-foreground` | `neutral/950` | `#0C0D0A` | `grass/50` | `#E1EECC` | Text on sidebar hover |
| `border/default` | `sidebar-border` | `neutral/200` | `#D0D6CB` | `grass/800` | `#17651A` | Sidebar divider |
| `border/brand` | `sidebar-ring` | `grass/500` | `#5B9518` | `grass/400` | `#83B328` | Focus in sidebar |

### 2b. CUSTOM tokens (no shadcn/ui equivalent — must be added to `@theme inline`)

| Our token | CSS var name | Light HEX | Dark HEX | Usage |
|-----------|-------------|-----------|----------|-------|
| `brand/primary-hover` | `--color-primary-hover` | `#3C7209` | `#9BC34B` | Primary button :hover |
| `brand/primary-subtle` | `--color-primary-subtle` | `#E1EECC` | `#17651A` | Tinted bg behind primary |
| `brand/secondary-hover` | `--color-secondary-hover` | `#9BC34B` | `#468613` | Secondary button :hover |
| `brand/secondary-subtle` | `--color-secondary-subtle` | `#E1EECC` | `#05481F` | Tinted bg behind secondary |
| `brand/tertiary-hover` | `--color-accent-hover` | `#5B9518` | `#83B328` | Accent :hover |
| `brand/tertiary-subtle` | `--color-accent-subtle` | `#CDE2A9` | `#17651A` | Tinted bg behind accent |
| `background/inverse` | `--color-background-inverse` | `#0C0D0A` | `#FFFFFF` | Dark band on light, vice versa |
| `surface/overlay` | `--color-overlay` | `#E8ECE5` | `#17651A` | Modal scrim layer |
| `surface/raised` | `--color-surface-raised` | `#FFFFFF` | `#05481F` | Elevated panel, sidebar |
| `text/secondary` | `--color-foreground-secondary` | `#4B5145` | `#A4C77F` | Supporting text |
| `text/disabled` | `--color-foreground-disabled` | `#ABB3A5` | `#3C7209` | Disabled text/icons |
| `text/inverse` | `--color-foreground-inverse` | `#FFFFFF` | `#012305` | Text on dark/inverse bg |
| `text/brand` | `--color-foreground-brand` | `#468613` | `#83B328` | Brand-colored text links |
| `text/on-brand` | `--color-foreground-on-brand` | `#FFFFFF` | `#012305` | Text on brand bg |
| `border/subtle` | `--color-border-subtle` | `#E8ECE5` | `#05481F` | Hairline / de-emphasized |
| `border/strong` | `--color-border-strong` | `#828B7A` | `#468613` | High-contrast border |
| `status/success` | `--color-success` | `#468613` | `#83B328` | Success (reuses brand) |
| `status/success-subtle` | `--color-success-subtle` | `#E1EECC` | `#05481F` | Success bg tint |
| `status/on-success` | `--color-success-foreground` | `#FFFFFF` | `#012305` | Text on success |
| `status/warning` | `--color-warning` | `#D97706` | `#FCD34D` | Warning |
| `status/warning-subtle` | `--color-warning-subtle` | `#FFFBEB` | `#451A03` | Warning bg tint |
| `status/on-warning` | `--color-warning-foreground` | `#012305` | `#012305` | Text on warning (dark both modes) |
| `status/error-subtle` | `--color-destructive-subtle` | `#FEF2F2` | `#450A0A` | Error bg tint |
| `status/on-error` | `--color-destructive-foreground` | `#FFFFFF` | `#012305` | Text on error |
| `status/info` | `--color-info` | `#2563EB` | `#60A5FA` | Info |
| `status/info-subtle` | `--color-info-subtle` | `#EFF6FF` | `#172554` | Info bg tint |
| `status/on-info` | `--color-info-foreground` | `#FFFFFF` | `#012305` | Text on info |

### 2c. ⚠️ Flagged inconsistencies

| ID | Token | Issue | Resolution |
|----|-------|-------|------------|
| F-1 | `primary` / `primary-foreground` | `grass/600` + white = **4.49:1 — FAILS WCAG AA** (need 4.5:1) by 0.01 | **Option A:** shift `primary` to `grass/700` (#3C7209, white = 5.83:1 ✅). **Option B:** keep `grass/600`, switch foreground to black (4.68:1 ✅). |
| F-2 | `sidebar-primary` | Inherits F-1. | Same fix. |
| F-3 | `status/success` (light) | Reuses `grass/600` — same white-text risk. | Use `grass/700` for success chips with white text. |
| F-4 | `neutral/white` oklch | Floating-point gives `oklch(100.32% …)` — not a real color. | Always emit `oklch(100% 0 0)` for `#FFFFFF` explicitly. |
| F-5 | `chart-2` | Same primitive in both modes. | Intentional — flag if dark charts need higher contrast. |

---

## 3. TYPOGRAPHY

### ⚠️ Font mismatch — decision required

| Axis | Design spec | Codebase |
|------|------------|----------|
| Sans | **Inter** | **Geist Sans** |
| Mono | unspecified | **Geist Mono** |

Both are variable fonts with similar metrics. Swap is low-risk. Use `--font-sans` / `--font-mono` as token names regardless of choice — only the value changes.

### Type scale

| Name      | Family        | Size (rem) | px | Line-ht | Weight | Letter-spacing | Use |
|-----------|--------------|------------|-----|---------|--------|----------------|-----|
| Display   | `--font-sans` | 3.000 | 48 | 1.10 | 700 | -0.02em | Hero headlines |
| Heading 1 | `--font-sans` | 2.000 | 32 | 1.20 | 700 | -0.02em | Page titles |
| Heading 2 | `--font-sans` | 1.500 | 24 | 1.25 | 600 | -0.01em | Section titles |
| Heading 3 | `--font-sans` | 1.250 | 20 | 1.30 | 600 | -0.01em | Card headings |
| Heading 4 | `--font-sans` | 1.000 | 16 | 1.40 | 500 | 0em | Sub-section labels |
| Body LG   | `--font-sans` | 1.000 | 16 | 1.60 | 400 | 0em | Lead paragraph |
| Body      | `--font-sans` | 0.875 | 14 | 1.60 | 400 | 0em | Default body |
| Body SM   | `--font-sans` | 0.8125 | 13 | 1.50 | 400 | 0em | Captions |
| Label     | `--font-sans` | 0.750 | 12 | 1.40 | 500 | 0em | Form labels, buttons |
| Caption   | `--font-sans` | 0.6875 | 11 | 1.40 | 400 | 0em | Timestamps, metadata |
| Overline  | `--font-sans` | 0.6875 | 11 | 1.00 | 700 | +0.09em | Section headers (uppercase) |
| Code      | `--font-mono` | 0.8125 | 13 | 1.60 | 400 | 0em | Inline code, blocks |

---

## 4. SPACING — 4pt Grid

| Token   | px  | rem    |
|---------|-----|--------|
| `sp/1`  | 4   | 0.25rem |
| `sp/2`  | 8   | 0.5rem  |
| `sp/3`  | 12  | 0.75rem |
| `sp/4`  | 16  | 1.0rem  |
| `sp/5`  | 20  | 1.25rem |
| `sp/6`  | 24  | 1.5rem  |
| `sp/8`  | 32  | 2.0rem  |
| `sp/10` | 40  | 2.5rem  |
| `sp/12` | 48  | 3.0rem  |
| `sp/14` | 56  | 3.5rem  |
| `sp/16` | 64  | 4.0rem  |

Tailwind v4 ships these natively — no custom tokens needed.

---

## 5. BORDER RADIUS

| Token    | px     | rem     | CSS var       | Use |
|----------|--------|---------|---------------|-----|
| `r/sm`   | 4px    | 0.25rem | `--radius-sm` | Inputs, small badges |
| `r/md`   | 8px    | 0.5rem  | `--radius` / `--radius-md` | Buttons, chips — shadcn base |
| `r/lg`   | 12px   | 0.75rem | `--radius-lg` | Cards, panels |
| `r/xl`   | 16px   | 1.0rem  | `--radius-xl` | Modals, large cards |
| `r/2xl`  | 20px   | 1.25rem | `--radius-2xl` | Feature cards, hero |
| `r/full` | 9999px | —       | `--radius-full` | Pills, avatars, toggles |

Set `--radius: 0.5rem` as the shadcn base.  (NOTE: codebase currently uses `--radius: 0.625rem`.)

---

## 6. ELEVATION / SHADOW

Shadow color: `grass/950` (`oklch(22.44% 0.0319 125.80)`) at opacity — green-tinted, on-brand.

| Token       | Light box-shadow | Dark box-shadow |
|-------------|-----------------|-----------------|
| `shadow/xs` | `0 1px 2px 0 oklch(22.44% 0.0319 125.80 / 0.05)` | `0 1px 2px 0 oklch(22.44% 0.0319 125.80 / 0.40)` |
| `shadow/sm` | `0 1px 3px 0 oklch(22.44% 0.0319 125.80 / 0.10), 0 1px 2px -1px oklch(22.44% 0.0319 125.80 / 0.10)` | `0 1px 3px 0 oklch(22.44% 0.0319 125.80 / 0.50), 0 1px 2px -1px oklch(22.44% 0.0319 125.80 / 0.50)` |
| `shadow/md` | `0 4px 6px -1px oklch(22.44% 0.0319 125.80 / 0.10), 0 2px 4px -2px oklch(22.44% 0.0319 125.80 / 0.10)` | `0 4px 6px -1px oklch(22.44% 0.0319 125.80 / 0.60), 0 2px 4px -2px oklch(22.44% 0.0319 125.80 / 0.60)` |
| `shadow/lg` | `0 10px 15px -3px oklch(22.44% 0.0319 125.80 / 0.10), 0 4px 6px -4px oklch(22.44% 0.0319 125.80 / 0.10)` | `0 10px 15px -3px oklch(22.44% 0.0319 125.80 / 0.60), 0 4px 6px -4px oklch(22.44% 0.0319 125.80 / 0.60)` |
| `shadow/xl` | `0 20px 25px -5px oklch(22.44% 0.0319 125.80 / 0.10), 0 8px 10px -6px oklch(22.44% 0.0319 125.80 / 0.10)` | `0 20px 25px -5px oklch(22.44% 0.0319 125.80 / 0.70), 0 8px 10px -6px oklch(22.44% 0.0319 125.80 / 0.70)` |

---

## 7. COMPONENT RECIPES

### Button — Primary
```
bg:              primary            → grass/600 light / grass/400 dark  ⚠️ F-1
text:            primary-foreground → white / grass/950  ⚠️ F-1
radius:          r/md               (8px)
padding-x:       sp/6               (24px)
padding-y:       sp/3               (12px)
font:            Label 12px / 500

:hover           bg: primary-hover  → grass/700 / grass/300
:focus-visible   outline: 2px solid ring, offset 2px
:active          opacity: 90%
:disabled        opacity: 40%; cursor: not-allowed; pointer-events: none
```

### Button — Secondary (outlined)
```
bg:              transparent
text:            foreground-brand   → grass/600 / grass/400
border:          1.5px solid ring   → grass/500 / grass/400
radius:          r/md
padding-x:       sp/6
padding-y:       sp/3
font:            Label 12px / 500

:hover           bg: primary-subtle; border-color: primary-hover
:focus-visible   outline: 2px solid ring, offset 2px
:active          opacity: 90%
:disabled        opacity: 40%; cursor: not-allowed
```

### Card
```
bg:              card               → white / #112B14
text:            card-foreground    → neutral/950 / grass/50
border:          1px solid border   → neutral/200 / grass/800
radius:          r/lg               (12px)
padding:         sp/6               (24px)
shadow:          shadow/sm
```

### Badge / Tag
```
bg:              accent-subtle      → grass/100 / grass/800
text:            accent-foreground  → grass/950 / grass/50
radius:          r/full
padding-x:       sp/2              (8px)
padding-y:       sp/1              (4px)
font:            Overline 11px / 700 / letter-spacing +0.09em
```

### Input Field
```
bg:              card               → white / #112B14
border:          1px solid input    → neutral/200 / grass/800
radius:          r/sm               (4px)
padding-x:       sp/4              (16px)
padding-y:       sp/3              (12px)
text:            foreground         → neutral/950 / grass/50
font:            Body 14px / 400

::placeholder    text: muted-foreground  → neutral/400 / grass/400
:focus           border: 2px solid ring; box-shadow: 0 0 0 3px ring/20%
:disabled        bg: muted; text: foreground-disabled; cursor: not-allowed
[aria-invalid]   border-color: destructive; ring-color: destructive
label            text: foreground-secondary; font: Label 12px/500
error msg        text: destructive; font: Caption 11px/400
```

---

## 8. USAGE RULES

### 8a. WCAG Contrast — Brand steps

| Step | HEX | Rel. Luminance | vs White | vs Black | Safe fg | Best level |
|------|-----|---------------|----------|----------|---------|------------|
| 50 | `#E1EECC` | 0.8152 | 1.21:1 | 17.30:1 | **black** | AAA |
| 100 | `#CDE2A9` | 0.7024 | 1.40:1 | 15.05:1 | **black** | AAA |
| 200 | `#A4C77F` | 0.5027 | 1.90:1 | 11.05:1 | **black** | AAA |
| 300 | `#9BC34B` | 0.4651 | 2.04:1 | 10.30:1 | **black** | AAA |
| 400 | `#83B328` | 0.3722 | 2.49:1 | 8.44:1  | **black** | AAA |
| 500 | `#5B9518` | 0.2378 | 3.65:1 | 5.76:1  | **black** | AA (5.76) |
| 600 ⚠️ | `#468613` | 0.1840 | **4.49:1** ❌ | 4.68:1 | **black** | AA (4.68, black only) |
| 700 | `#3C7209` | 0.1301 | 5.83:1 | 3.60:1  | **white** | AA (5.83) |
| 800 | `#17651A` | 0.0956 | 7.21:1 | 2.91:1  | **white** | AAA (7.21) |
| 900 | `#05481F` | 0.0477 | 10.75:1 | 1.95:1 | **white** | AAA (10.75) |
| 950 | `#012305` | 0.0122 | 16.88:1 | 1.24:1 | **white** | AAA (16.88) |

⚠️ **grass/600 + white text = 4.49:1 — WCAG AA failure by 0.01.** Black text (4.68:1) passes.

### 8b. Focus Ring
```
color:   ring token  (grass/500 light / grass/400 dark)
width:   2px solid outline
offset:  2px
never:   outline: none without visible alternative
```

### 8c. Dark Mode — Do NOT simply invert

| Token | Rule |
|-------|------|
| `status/on-warning` / `--color-warning-foreground` | Stays `grass/950` in **both** modes — amber is light in dark mode |
| `chart-2` | Same `grass/300` both modes — intentional |
| `background/inverse` | Inverts intentionally: `neutral/950` → `white`. Do not flip direction |
| `surface-page-dk` / `surface-subtle-dk` / `surface-default-dk` | Hand-tuned — do not derive programmatically from the grass ramp |

Dark mode: add `class="dark"` to `<html>`. No `prefers-color-scheme` by default.

### 8d. Logo (grsshppr)

**Approved backgrounds:**

| Mode  | Surface        | Token          | HEX       |
|-------|----------------|----------------|-----------|
| Light | White card     | `card`         | `#FFFFFF` |
| Light | Page           | `background`   | `#F5F7F3` |
| Light | Tinted         | `primary-subtle` | `#E1EECC` |
| Dark  | Dark card      | `card`         | `#112B14` |
| Dark  | Dark page      | `background`   | `#0A1A08` |
| Dark  | Dark tinted    | `primary-subtle` | `#05481F` |

**Rules:**
- Never on `primary` (`grass/600`) — insufficient contrast for the illustration's dark elements
- Never on pure `#000000` / `#FFFFFF` in UI — use the page token
- Minimum clear space: 10% of rendered width on all sides
- Do not recolor, filter, blend-mode, or shadow the illustration
- Do not scale below 24px on the short axis

---

> Appendix A (full CSS custom properties) and Appendix B (W3C DTCG JSON) from the
> original export are intentionally omitted from this staging copy because their
> `@theme { --color-neutral-* }` block clobbers Tailwind's built-in `neutral-*`
> and their `oklch()` values are the desaturated export set. If/when an RFC
> adopts any of this, regenerate those blocks from the HEX columns above.
