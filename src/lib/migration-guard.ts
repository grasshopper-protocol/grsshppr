/**
 * Tripwire for RFC-0013's light track. Pure: takes migration SQL, returns the
 * destructive statements that aren't covered by an approval marker.
 *
 * A migration may contain destructive SQL only if the file names what approved
 * it: `-- approved-by: RFC-NNNN` (full track) or `-- approved-by: ADR-NNNN`
 * (a light-track clean-up, RFC-0013 rule 6). Statements are matched by how they
 * start, so clauses like `ON DELETE cascade` inside a CREATE don't count.
 */

const APPROVAL = /--\s*approved-by:\s*(RFC|ADR)-\d{4}\b/i;

const DESTRUCTIVE: { name: string; pattern: RegExp }[] = [
  { name: "DROP", pattern: /^DROP\b/i },
  { name: "TRUNCATE", pattern: /^TRUNCATE\b/i },
  { name: "DELETE", pattern: /^DELETE\s+FROM\b/i },
  { name: "UPDATE", pattern: /^UPDATE\b[\s\S]*\bSET\b/i },
  { name: "ALTER TABLE … DROP", pattern: /^ALTER\s+TABLE\b[\s\S]*\bDROP\s+(COLUMN|CONSTRAINT)\b/i },
  { name: "RENAME", pattern: /^ALTER\s+(TABLE|TYPE|INDEX|SEQUENCE)\b[\s\S]*\bRENAME\b/i },
  { name: "ALTER COLUMN … TYPE", pattern: /^ALTER\s+TABLE\b[\s\S]*\bALTER\s+COLUMN\b[\s\S]*\b(SET\s+DATA\s+)?TYPE\b/i },
  { name: "SET NOT NULL", pattern: /^ALTER\s+TABLE\b[\s\S]*\bSET\s+NOT\s+NULL\b/i },
];

/** Split Drizzle migration SQL into statements, dropping comments. */
export function splitStatements(sql: string): string[] {
  return sql
    .split(/-->\s*statement-breakpoint|;/)
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter(Boolean);
}

export function hasApproval(sql: string): boolean {
  return APPROVAL.test(sql);
}

/** Destructive statements in this migration, or [] if none or if approved. */
export function unapprovedDestructive(sql: string): { kind: string; statement: string }[] {
  if (hasApproval(sql)) return [];
  const found: { kind: string; statement: string }[] = [];
  for (const statement of splitStatements(sql)) {
    const hit = DESTRUCTIVE.find((d) => d.pattern.test(statement));
    if (hit) found.push({ kind: hit.name, statement: statement.replace(/\s+/g, " ").slice(0, 120) });
  }
  return found;
}
