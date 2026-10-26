/**
 * Pure rules for what clicking a bell notification does (#159). No I/O.
 *
 * Info notifications ("this happened") are read once opened. Action
 * notifications ("do this") stay until the action itself resolves them.
 */

export interface BellItem {
  type?: string;
  priority: string;
  resourceId: string | null;
}

/** A Google Calendar connection that needs reconnecting (RFC-0012 §7). Its resource is the connection. */
export const CALENDAR_RECONNECT = "action_required:calendar_reconnect";

export function bellClick(n: BellItem): { href: string | null; markRead: boolean } {
  return {
    href: n.type === CALENDAR_RECONNECT ? "/settings" : n.resourceId ? `/session/${n.resourceId}` : null,
    markRead: n.priority !== "action",
  };
}
