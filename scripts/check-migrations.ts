/**
 * RFC-0013 tripwire: fail if any migration contains destructive SQL without an
 * `-- approved-by: RFC-NNNN` / `ADR-NNNN` marker. Run: pnpm db:check
 */
import { readFileSync, readdirSync } from "node:fs";
import { unapprovedDestructive } from "../src/lib/migration-guard";

const files = readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort();
let failed = false;
for (const file of files) {
  for (const { kind, statement } of unapprovedDestructive(readFileSync(`drizzle/${file}`, "utf8"))) {
    failed = true;
    console.error(`drizzle/${file}: ${kind} needs an "-- approved-by: RFC-NNNN" (or ADR-NNNN) marker\n  ${statement}`);
  }
}
if (failed) {
  console.error("\nDestructive schema changes need the full RFC track — see RFC-0013.");
  process.exit(1);
}
console.log(`Migrations OK: ${files.length} file(s), no unapproved destructive SQL.`);
