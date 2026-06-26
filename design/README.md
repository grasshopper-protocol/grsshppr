# Design

Design is a first-class layer in Grasshopper, not a coat of paint. This folder
is the home for design direction, principles, and (soon) the design system.

## Contents

- **[principles.md](principles.md)** — the design principles (source of truth).
- **[tokens/colors.md](tokens/colors.md)** — the brand color ramp (`grass`),
  wired as utilities in `globals.css`.
- `DESIGN.md` (repo root) — the fuller visual brief: color, type, motion, IA,
  tone. Will be progressively distilled into this folder.

## Coming next (Phase 2)

- `tokens/` — type / space tokens. (The semantic color mapping shipped — `grass`
  on `--ring` / `--accent`, see [ADR-0005](../decisions/ADR-0005-brand-color-minimal-mapping.md);
  status / interaction / motion token layers added in
  [ADR-0006](../decisions/ADR-0006-status-token-layer.md) /
  [ADR-0007](../decisions/ADR-0007-interaction-states-motion.md).)
- `patterns/` — component inventory and usage notes.
- A link to the Figma source file.

## Contributing design

You don't need to write code to contribute design. Open a **Design proposal**
issue (`.github/ISSUE_TEMPLATE/design-proposal.md`) or, for a design-system
change, an [RFC](../product/rfc). Design-system changes require an RFC because
they ripple across the product.
