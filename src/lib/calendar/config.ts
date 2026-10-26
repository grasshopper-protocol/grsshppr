/**
 * Whether Google Calendar push (RFC-0012 Phase 1) is switched on, from the
 * environment passed in. Pure. It's on only when CALENDAR_SYNC_ENABLED=true
 * AND the client credentials and a valid 32-byte key are all present;
 * otherwise the feature is off (self-hosters and dev run without it). A key
 * that's set but malformed is an error, not "off" — fail closed, loudly.
 *
 * CALENDAR_SYNC_ALLOWED_USERS (optional, comma-separated emails) limits who
 * can connect while Google's OAuth app is in Testing mode and only listed test
 * users can get through its consent screen (RFC-0012 §11). Unset = everyone.
 */

import { parseKey, type TokenKeys } from "./token-crypto";

export type CalendarConfig =
  | { enabled: false }
  | { enabled: true; clientId: string; clientSecret: string; keys: TokenKeys; allowedEmails: string[] | null };

export function calendarConfig(env: Record<string, string | undefined>): CalendarConfig {
  if (env.CALENDAR_SYNC_ENABLED !== "true") return { enabled: false };
  const clientId = env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret || !env.CALENDAR_TOKEN_ENC_KEY) return { enabled: false };
  const keys: TokenKeys = { current: parseKey(env.CALENDAR_TOKEN_ENC_KEY) };
  if (env.CALENDAR_TOKEN_ENC_KEY_PREVIOUS) keys.previous = parseKey(env.CALENDAR_TOKEN_ENC_KEY_PREVIOUS);
  const allowedEmails = (env.CALENDAR_SYNC_ALLOWED_USERS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return { enabled: true, clientId, clientSecret, keys, allowedEmails: allowedEmails.length ? allowedEmails : null };
}

/** Whether this person may connect Google Calendar on this deployment. */
export function canConnectCalendar(config: CalendarConfig, email: string | null | undefined): boolean {
  if (!config.enabled) return false;
  if (!config.allowedEmails) return true;
  return !!email && config.allowedEmails.includes(email.trim().toLowerCase());
}
