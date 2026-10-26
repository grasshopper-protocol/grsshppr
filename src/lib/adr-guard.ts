/**
 * Enforces the ADR lifecycle (ADR-0019) in CI. Pure: takes file contents.
 *
 * - An ADR changed by a PR must not still be "Proposed" — flipping it to
 *   Accepted in the PR's last commit is what lets the PR go green, so an ADR
 *   can't merge as Proposed (#166, #178).
 * - The decisions index must list every ADR, with the same status as its file.
 */

/** The status word from an ADR's "- **Status:** …" line, or null. */
export function adrStatus(markdown: string): string | null {
  const match = /^- \*\*Status:\*\*\s*([A-Za-z]+(?: by ADR-\d{4})?)/m.exec(markdown);
  return match ? match[1] : null;
}

/** Index rows from decisions/README.md: ADR number → status column. */
export function indexStatuses(readme: string): Map<string, string> {
  const rows = new Map<string, string>();
  for (const line of readme.split("\n")) {
    const match = /^\| \[(\d{4})\]\(ADR-\d{4}-[^)]+\.md\) \|.*\| ([^|]+) \|\s*$/.exec(line);
    if (match) rows.set(match[1], match[2].trim());
  }
  return rows;
}

export interface AdrFile {
  path: string; // e.g. "decisions/ADR-0019-light-track-schema-changes.md"
  content: string;
}

/** Problems to report; empty means the decisions record is consistent. */
export function checkAdrs(files: AdrFile[], readme: string, changedInPr: Set<string>): string[] {
  const problems: string[] = [];
  const index = indexStatuses(readme);
  for (const { path, content } of files) {
    const number = /ADR-(\d{4})/.exec(path)?.[1];
    if (!number) continue;
    const status = adrStatus(content);
    if (!status) {
      problems.push(`${path}: no "- **Status:**" line`);
      continue;
    }
    if (changedInPr.has(path) && status === "Proposed") {
      problems.push(`${path}: still Proposed — flip it to Accepted in this PR's last commit (ADR-0019)`);
    }
    const listed = index.get(number);
    if (listed === undefined) problems.push(`${path}: missing from the index in decisions/README.md`);
    else if (!listed.startsWith(status.split(" ")[0])) {
      problems.push(`${path}: index says "${listed}" but the file says "${status}"`);
    }
  }
  return problems;
}
