# ADR-0010: Supply-chain hardening (CI security baseline)

- **Status:** Accepted
- **Date:** 2026-07-13
- **Discipline:** Engineering
- **Source RFC:** none — direct (security hygiene, additive, reversible)

## Context

An OpenSSF Scorecard-style review of the repo surfaced a cluster of
supply-chain gaps that are cheap to close and high-signal for an open product
whose credibility rests on being trustworthy to self-host and contribute to:

- The only workflow, [`db-migrate.yml`](../.github/workflows/db-migrate.yml),
  declared **no `permissions:` block**, so its `GITHUB_TOKEN` inherited the
  repo-default (potentially write-all) scope.
- GitHub Actions were referenced by **mutable tags** (`actions/checkout@v4`),
  which can be re-pointed by an upstream compromise. The Dockerfile base image
  (`node:22-alpine`) was likewise an unpinned tag.
- There was **no automated dependency-update tool** (Dependabot/Renovate).
- There was **no SAST** step — no static analysis running on pushes/PRs.

None of these are incidents; they are latent risk. They map directly to
Scorecard checks (Token-Permissions, Pinned-Dependencies,
Dependency-Update-Tool, SAST) and to the promises already made in
[SECURITY.md](../SECURITY.md).

Per [AGENTS.md](../AGENTS.md), adding CI workflows / dependency tooling normally
warrants an RFC. These changes are additive, reversible, and touch no product
behavior or data model, so they were treated as security hygiene and recorded
here directly rather than via an RFC. This ADR is the trace.

## Options

- **Adopt the full baseline now — least-privilege token, SHA-pinned actions +
  Docker digest, Dependabot, CodeQL (chosen).** Closes every flagged check in
  one pass; each piece is independently reversible.
- **Do only the zero-risk subset (permissions + Dependabot), defer pinning and
  CodeQL.** Smaller diff, but leaves the two highest-weight supply-chain checks
  (pinning, SAST) open for no real saving — the pinning SHAs were already
  resolved.
- **Wait and write a formal RFC first.** Rejected — the RFC ceremony exists for
  blast radius, and these changes have none (no runtime, schema, API, or design
  surface). The bar scales with blast radius (AGENTS.md §1.5).
- **Enable commit signing / signed releases in the same change.** Deferred —
  requires local GPG/Sigstore setup and maintainer key management, out of scope
  for a CI-config change. Tracked as follow-up.

## Decision

Adopt a CI security baseline:

1. **Least privilege.** Add `permissions: contents: read` at the top of
   [`db-migrate.yml`](../.github/workflows/db-migrate.yml). The new
   [`codeql.yml`](../.github/workflows/codeql.yml) is read-only except the
   analyze job, which is scoped to `security-events: write`.
2. **Pin by digest.** All actions are pinned to full commit SHAs with a trailing
   `# v4` comment for readability; the Dockerfile base is pinned to its
   multi-arch manifest digest (`node:22-alpine@sha256:16e22a…`).
3. **Automated updates.** [`dependabot.yml`](../.github/dependabot.yml) watches
   `npm`, `github-actions`, and `docker` weekly. It also keeps the SHA pins
   current, so pinning does not mean going stale.
4. **SAST.** [`codeql.yml`](../.github/workflows/codeql.yml) runs CodeQL
   (`javascript-typescript`, `security-and-quality` queries) on push, PR to
   `main`, and a weekly schedule.

## Consequences

- Scorecard posture improves materially: Token-Permissions, Dependency-Update-
  Tool, and SAST go from failing to passing; Pinned-Dependencies goes from
  partial (lockfile only) to near-complete (lockfile + actions + base image).
- Pinned actions/images now require a Dependabot PR to move — a deliberate
  trade of convenience for provenance. The weekly Dependabot cadence absorbs
  this.
- CodeQL adds a required-ish signal on PRs; contributors will see a new check.
  It can surface false positives, triaged in the code-scanning dashboard.
- **Not closed by this ADR** and needing a repo admin: **branch protection on
  `main`** (require PR review + status checks) and replacing the
  `@TODO-*-handle` placeholders in [`.github/CODEOWNERS`](../.github/CODEOWNERS)
  so review enforcement actually binds. Commit signing / signed releases remain
  a separate follow-up.
- Fully reversible: deleting the two config files and reverting two edits
  restores the prior state.

## Links

- Implementation: `.github/workflows/db-migrate.yml`, `.github/workflows/codeql.yml`,
  `.github/dependabot.yml`, `Dockerfile`
- Related: [SECURITY.md](../SECURITY.md), [AGENTS.md](../AGENTS.md)
- Follow-up: branch protection + CODEOWNERS handles (admin), commit signing
