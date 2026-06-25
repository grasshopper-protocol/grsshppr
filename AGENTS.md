# AGENTS.md — How Humans and Agents Operate in Grasshopper

Grasshopper is a **fully open product**: open code, open specs, open design,
open decisions, public roadmap. This file is the contract for everyone who
changes the project — human or AI. It is enforceable. If a change violates it,
the change is wrong, not the rule.

For engineering specifics (tech stack, data model, naming, module rules) see
[ENGINEERING.md](ENGINEERING.md). For visual direction see [DESIGN.md](DESIGN.md)
and [design/principles.md](design/principles.md). This file governs *how change
happens*.

---

## 1. Principles (non-negotiable)

1. **Open by default.** Publish the reasoning, not just the result. If there is
   no concrete reason to keep something private, it is public.
2. **Document before building.** Non-trivial change starts as a written
   proposal ([RFC](product/rfc/README.md)), not as a pull request.
3. **Decisions must be traceable.** Every decision links idea → discussion →
   decision ([ADR](decisions/README.md)) → implementation (PR) → release. No
   orphan changes.
4. **Product, Design, and Engineering are equals.** A design or product
   proposal is a first-class contribution, not a request for engineering.
5. **Lazy stays lazy.** This process governs *change*, not *effort*. A typo or
   a one-line fix needs no ceremony. The bar scales with blast radius.

---

## 2. Responsibilities of Agents

When acting on this repository, an agent MUST:

- **Write an RFC before any major change.** "Major" = new feature/module,
  schema or data-model change, new dependency, public API change, design-system
  change, governance change, or reversing a prior ADR.
- **Link every change to an issue or spec.** A PR with no linked issue/RFC is
  incomplete.
- **Record decisions as ADRs.** When a choice is made between alternatives,
  write the ADR (context, options, decision, consequences) and link it.
- **Update documentation in the same change.** Code that changes behavior
  updates the relevant doc (README, ENGINEERING, DESIGN, roadmap) in the same PR.
- **Never introduce silent changes.** No undocumented features, no quiet
  dependency additions, no schema drift, no behavior changes "while I was in
  there." If it wasn't asked for and isn't documented, don't ship it.
- **Surface operational risk in the repo, not in private notes.** Incidents,
  drift, and security concerns belong in `/decisions` or
  [SECURITY.md](SECURITY.md), where humans can see them.

---

## 3. Workflows

**Proposing a change**
1. Open an Issue describing the problem (not the solution).
2. If the change is *major* (see §2), author an RFC in [`product/rfc/`](product/rfc/README.md)
   using `RFC-template.md`. Otherwise go straight to a PR.
3. Discuss on the RFC/issue thread. Capture alternatives considered.
4. On agreement, record an ADR in [`decisions/`](decisions/README.md) and link
   the RFC.
5. Implement via PRs that reference the issue, RFC, and ADR.
6. Release notes reference the merged ADR/RFC.

**Escalating uncertainty**
- If requirements are ambiguous, STOP and write the open questions into the
  issue/RFC. Do not guess on irreversible or wide-blast-radius work.
- If a change would violate this file or an existing ADR, do not proceed.
  Propose superseding the ADR explicitly.

**Documenting decisions**
- One ADR per decision. Decisions are immutable once recorded; to change one,
  write a new ADR that supersedes it and link both directions.

---

## 4. Non-Negotiable Rules

- **No undocumented features.** If users can see it, a doc describes it.
- **No hidden decisions.** Every decision has an ADR. Rejected options are
  recorded, not erased.
- **No direct commits without traceability.** Every change traces to an issue
  or RFC. No "drive-by" commits to shared branches.
- **No silent dependencies.** Adding a package requires an RFC or, at minimum,
  an issue and a line in the PR explaining why nothing already-present works.
- **No schema drift.** Schema changes ship as generated migrations, never as an
  undocumented `push` — see [ADR-0003](decisions/ADR-0003-schema-migrations.md).
- **No scope smuggling.** Do exactly what the issue/RFC describes. Unrelated
  improvements get their own issue.

---

## 5. Quality Bar

- **Clarity over cleverness.** The reader's understanding outranks the author's
  ingenuity. Boring and obvious wins.
- **Explicit reasoning.** Every proposal states *why now*, *what else was
  considered*, and *what it costs*.
- **Reproducible decisions.** Anyone reading the RFC + ADR can reconstruct why
  the decision was made and what would change it.
- **Reversibility respected.** Cheap, reversible changes move fast. Expensive,
  irreversible ones (schema, public API, dependencies, governance) require the
  full trace.

---

## 6. Quick Reference — Does this need an RFC?

| Change | RFC? |
|--------|------|
| Typo, copy, in-place refactor, bug fix | No → Issue + PR |
| New feature or module | **Yes** |
| Schema / data-model change | **Yes** |
| New dependency | **Yes** |
| Public API change | **Yes** |
| Design-system change (tokens, patterns) | **Yes** |
| Governance change | **Yes** |
| Reversing a prior ADR | **Yes** (supersede it) |

When in doubt, write the RFC. It is cheaper than an unwound decision.

---

## Map of the open product

| You want to… | Go to |
|--------------|-------|
| Understand the code | [ENGINEERING.md](ENGINEERING.md) |
| See visual/UX direction | [DESIGN.md](DESIGN.md) · [design/](design/README.md) |
| Know what's being built | [product/roadmap/](product/roadmap/README.md) |
| Propose a major change | [product/rfc/](product/rfc/README.md) |
| See why something was decided | [decisions/](decisions/README.md) |
| Know who decides | [governance/GOVERNANCE.md](governance/GOVERNANCE.md) |
| Contribute (any layer) | [CONTRIBUTING.md](CONTRIBUTING.md) |
