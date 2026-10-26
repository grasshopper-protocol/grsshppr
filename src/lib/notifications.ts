/**
 * Pure rules for what clicking a bell notification does (#159). No I/O.
 *
 * Info notifications ("this happened") are read once opened. Action
 * notifications ("do this") stay until the action itself resolves them.
 */

export interface BellItem {
  priority: string;
  resourceId: string | null;
}

export function bellClick(n: BellItem): { href: string | null; markRead: boolean } {
  return {
    href: n.resourceId ? `/session/${n.resourceId}` : null,
    markRead: n.priority !== "action",
  };
}
