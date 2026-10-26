/**
 * Whether Google Calendar push (RFC-0012 Phase 1) is switched on, from the
 * environment passed in. Pure. It's on only when CALENDAR_SYNC_ENABLED=true
 * AND the client credentials and a valid 32-byte key are all present;
 * otherwise the feature is off (self-hosters and dev run without it). A key
 * that's set but malformed is an error, not "off" — fail closed, loudly.
 */

import { parseKey, type TokenKeys } from "./token-crypto";

export type CalendarConfig =
  | { enabled: false }
  | { enabled: true; clientId: string; clientSecret: string; keys: TokenKeys };

export function calendarConfig(env: Record<string, string | undefined>): CalendarConfig {
  if (env.CALENDAR_SYNC_ENABLED !== "true") return { enabled: false };
  const clientId = env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret || !env.CALENDAR_TOKEN_ENC_KEY) return { enabled: false };
  const keys: TokenKeys = { current: parseKey(env.CALENDAR_TOKEN_ENC_KEY) };
  if (env.CALENDAR_TOKEN_ENC_KEY_PREVIOUS) keys.previous = parseKey(env.CALENDAR_TOKEN_ENC_KEY_PREVIOUS);
  return { enabled: true, clientId, clientSecret, keys };
}
