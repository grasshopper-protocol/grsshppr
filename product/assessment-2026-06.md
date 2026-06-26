# Open Product Assessment — June 2026

> Snapshot of where Grasshopper stands as an *open product* (open code, specs,
> design, decisions, roadmap), and the concrete fixes to close the gaps.
> Status legend: `[ ]` todo · `[~]` in progress · `[x]` done.

## Scores (0–5)

| # | Dimension | Score | Verdict |
|---|-----------|-------|---------|
| 1 | Product Clarity | 4.5 | Excellent problem/vision; users defined implicitly |
| 2 | Roadmap & Direction | 2.0 | Direction lives in heads/memory, not in repo |
| 3 | Spec & Decision System | 2.5 | Strong decision *log*, no spec/RFC pipeline |
| 4 | Design System / UX | 3.5 | Great principles, not yet a system or artifact set |
| 5 | Technical Architecture | 4.5 | Modular, documented, enforced |
| 6 | Contribution Model | 2.5 | Code path clear; non-code path absent |
| 7 | Governance | 1.5 | Implicit BDFL; nothing written |
| 8 | Transparency | 2.0 | Open code ≠ working in the open |

**One-line:** strong on product intent and engineering discipline, thin on the
public governance machinery that lets outsiders participate.

## Per-dimension notes

1. **Product Clarity (4.5)** — Sharp problem + vision in README/AGENTS/DESIGN.
   Users/use-cases are *implicit* in DESIGN.md flows. Missing: explicit
   personas + non-goals doc.
2. **Roadmap (2.0)** — No roadmap in repo. Direction sits in the AGENTS.md
   decision log and in agent memory. Contributors can't align.
3. **Spec & Decisions (2.5)** — Real decision *log* exists, but no RFC step
   (decisions appear fully-formed), no ADR format, no idea→impl trace.
   Operational knowledge (prod incidents, leaked credential) lives in agent
   memory, invisible to humans.
4. **Design/UX (3.5)** — DESIGN.md is an excellent *brief*, not yet a *system*.
   Accent color still "(to be defined)", no tokens, no component inventory, no
   Figma link, no design contribution entry point.
5. **Architecture (4.5)** — Genuinely good. Core/modules split documented and
   enforced. Gaps: **no migrations folder** (schema drift caused 2 prod
   incidents); `@vercel/analytics` + `@vercel/speed-insights` contradict the
   "no analytics/telemetry" policy.
6. **Contribution (2.5)** — Code path clear (CONTRIBUTING.md). No path for
   design/spec/product. `.github/` has only `workflows/`. No issue/PR/RFC
   templates. No CODEOWNERS/maintainer list.
7. **Governance (1.5)** — Who decides is unstated (BDFL-by-default). No model,
   no decision rights, no conflict resolution. Widest values-vs-reality gap.
8. **Transparency (2.0)** — Open: code, architecture rationale, decision log.
   Hidden: discussions, rejected trade-offs, incidents, roadmap. This is "open
   source", not yet "working in the open".

## Fix checklist

### Correctness (cheap, do first)
- [x] Rotate the Neon credential flagged in agent memory (live security item)
- [x] Resolve analytics-vs-policy contradiction: removed `@vercel/analytics` +
      `@vercel/speed-insights`; no-telemetry policy kept
- [x] Adopt generated migrations (`pnpm db:generate` + `db:migrate`) to kill
      schema drift; stopped relying on `db:push` for prod — see ADR-0003

### Phase 1 — Foundations (this scaffold)
- [x] Write this assessment as a tracking doc
- [x] Publish roadmap → `/product/roadmap` (now / next / later)
- [x] Add personas + non-goals → `/product/personas.md`
- [x] Stand up RFC pipeline → `/product/rfc` (template + README)
- [x] Stand up ADR pipeline → `/decisions` (template + README)
- [x] Migrate existing decision log → `/decisions/LOG.md` + seed ADRs
- [x] Governance → `/governance/GOVERNANCE.md` + `MAINTAINERS.md`
- [x] Design docs → `/design` (principles + README)
- [x] Contribution surface → `.github` issue/PR templates + CODEOWNERS
- [x] Split `AGENTS.md` → `ENGINEERING.md` (engineering) + governance `AGENTS.md`

### Phase 2 — Systemisation (next)
- [x] Author first real RFC for the next feature (RFC-0001–0004 authored)
- [~] Choose accent color; extract `/design/tokens`; publish component inventory
  — accent chosen ([ADR-0005](../decisions/ADR-0005-brand-color-minimal-mapping.md))
  and tokens extracted; component inventory still open
- [ ] Link the Figma source from `/design/README.md`
- [x] Enable GitHub Discussions (Ideas, RFCs, Q&A, Show & Tell)

### Phase 3 — Scaling openness (later)
- [ ] Open roadmap to community proposals; define triage cadence
- [ ] "good first issue" / "help wanted" labels + contributor ladder
- [ ] Public changelog tied to ADRs
- [x] Move incident notes from agent memory into `/decisions` or `POSTMORTEMS.md`
  (postmortems live under `/postmortems`)
