/**
 * ADR lifecycle check (ADR-0019). On a PR, set ADR_BASE to the base commit so
 * ADRs changed by the PR must not still be Proposed. Run: pnpm adr:check
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { checkAdrs } from "../src/lib/adr-guard";

const base = process.env.ADR_BASE?.trim();
const changed = new Set(
  base
    ? execFileSync("git", ["diff", "--name-only", `${base}...HEAD`, "--", "decisions"], { encoding: "utf8" })
        .split("\n")
        .filter(Boolean)
    : []
);

const files = readdirSync("decisions")
  .filter((f) => /^ADR-\d{4}-.+\.md$/.test(f))
  .map((f) => ({ path: `decisions/${f}`, content: readFileSync(`decisions/${f}`, "utf8") }));
const problems = checkAdrs(files, readFileSync("decisions/README.md", "utf8"), changed);

if (problems.length > 0) {
  for (const p of problems) console.error(p);
  process.exit(1);
}
console.log(`Decisions OK: ${files.length} ADR(s)${base ? `, ${changed.size} changed in this PR` : ""}.`);
