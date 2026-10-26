import { calendarConfig, type CalendarConfig } from "@/lib/calendar/config";

/**
 * The calendar push configuration from the environment (RFC-0012 §8). Off
 * unless fully configured; a malformed key throws — fail closed, loudly.
 */
export function getCalendarConfig(): CalendarConfig {
  return calendarConfig(process.env);
}

export function appBaseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "https://www.grsshppr.org";
}

export function googleRedirectUri(): string {
  return `${appBaseUrl()}/api/calendar/callback/google`;
}

export const OAUTH_STATE_COOKIE = "grsshppr_calendar_oauth";
export const OAUTH_STATE_COOKIE_PATH = "/api/calendar/callback";
