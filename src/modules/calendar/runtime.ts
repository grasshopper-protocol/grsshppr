import { calendarConfig, type CalendarConfig } from "@/lib/calendar/config";

/**
 * The calendar push configuration from the environment (RFC-0012 §8). Off
 * unless fully configured; a malformed key throws — fail closed, loudly.
 */
export function getCalendarConfig(): CalendarConfig {
  return calendarConfig(process.env);
}

/**
 * The configuration for cleaning up a user's Google connection (disconnect,
 * account deletion): whenever credentials and a key are present, even if sync
 * is switched off — a grant must still be revoked. Never throws: a broken key
 * means we can't revoke, not that the account can't be deleted.
 */
export function getCleanupConfig(): CalendarConfig {
  try {
    return calendarConfig({ ...process.env, CALENDAR_SYNC_ENABLED: "true" });
  } catch {
    console.error("[calendar] cleanup without revoking: the token key is invalid");
    return { enabled: false };
  }
}

export function appBaseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "https://www.grsshppr.org";
}

export function googleRedirectUri(): string {
  return `${appBaseUrl()}/api/calendar/callback/google`;
}

export const OAUTH_STATE_COOKIE = "grsshppr_calendar_oauth";
export const OAUTH_STATE_COOKIE_PATH = "/api/calendar/callback";
