/**
 * Where "Connect Google Calendar" brings someone back to after a successful
 * connect (RFC-0012): the page they started from. Only these in-app pages are
 * accepted; anything else falls back to Settings, so the parameter can never
 * become an open redirect. Pure, and safe to import in client components.
 */

const RETURN_PATH = /^\/(?:dashboard|(?:session|mentor)\/[A-Za-z0-9_-]{1,64})$/;

export function safeReturnPath(path: string | null | undefined): string | null {
  return path && RETURN_PATH.test(path) ? path : null;
}

/** The connect link, carrying the page to come back to when it's one we accept. */
export function connectGoogleHref(returnTo?: string): string {
  const path = safeReturnPath(returnTo);
  return path ? `/api/calendar/connect/google?returnTo=${encodeURIComponent(path)}` : "/api/calendar/connect/google";
}
