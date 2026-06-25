# Color tokens

The Grasshopper brand ramp. One green scale, 11 steps, named so we can talk about
color without reciting hex. Namespaced **`grass`** (not `green`) so it never
collides with Tailwind's built-in `green-*` utilities used for generic success
states.

These are **primitive** tokens — raw values. Semantic roles (`--primary`,
`--accent`, focus rings, links) are mapped from these in
[`globals.css`](../../src/app/globals.css). Changing a semantic mapping ripples
across the product and therefore needs an [RFC](../../product/rfc); adding or
adjusting a primitive here does not.

## The ramp

| Step | Name | Hex | Tailwind utility | Text on this color |
|------|------|-----|------------------|--------------------|
| 50  | Mist      | `#E1EECC` | `bg-grass-50`  | dark — AAA |
| 100 | Dew       | `#CDE2A9` | `bg-grass-100` | dark — AAA |
| 200 | Sage      | `#A4C77F` | `bg-grass-200` | dark — AAA |
| 300 | Lime      | `#9BC34B` | `bg-grass-300` | dark — AAA |
| 400 | Meadow    | `#83B328` | `bg-grass-400` | dark — AA |
| 500 | Moss      | `#5B9518` | `bg-grass-500` | white — AA |
| 600 | Fern      | `#468613` | `bg-grass-600` | white — AA |
| 700 | Deep Fern | `#3C7209` | `bg-grass-700` | white — AAA |
| 800 | Canopy    | `#17651A` | `bg-grass-800` | white — AAA |
| 900 | Forest    | `#05481F` | `bg-grass-900` | white — AAA |
| 950 | Void      | `#012305` | `bg-grass-950` | white — AAA |

"Text on this color" = the safe foreground for text **sitting on** that swatch as
a background. Dark text uses `--foreground`; white text uses `#fff`.

## Usage guidance

- **Primary action / brand accent:** Moss `500` is the anchor — enough contrast
  for white text (AA), still vivid. Deep Fern `700` for hover/pressed.
- **Quiet backgrounds / fills:** Mist `50` and Dew `100` for tinted surfaces,
  selected states, and callouts. Keep text dark.
- **Borders / dividers on tint:** Sage `200`.
- **On dark surfaces:** Lime `300` / Meadow `400` read as the "lit" brand color;
  avoid the deep steps (700–950) as text on dark backgrounds.
- **Don't** use `grass` for success/error semantics — those stay on Tailwind's
  generic `green-*` / `red-*` so brand and status never blur.

## Adopting a semantic mapping

Repointing `--primary` / `--accent` to a grass step is a **design-system change**
and goes through an RFC. Until then the ramp is available as utilities
(`bg-grass-500`, `text-grass-700`, …) and as CSS variables (`--color-grass-500`).
