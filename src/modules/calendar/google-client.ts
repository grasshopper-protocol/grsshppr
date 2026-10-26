import { z } from "zod";
import { classifyGoogleFailure, type GoogleFailure } from "@/lib/calendar/sync";

// Fixed Google hosts (no user-supplied URLs — RFC-0012 §9). The overrides exist
// only so integration tests can point at a local fake; they're never set in production.
const OAUTH_BASE = () => process.env.GOOGLE_OAUTH_BASE_URL ?? "https://oauth2.googleapis.com";
const CALENDAR_BASE = () => process.env.GOOGLE_CALENDAR_BASE_URL ?? "https://www.googleapis.com";

export class GoogleError extends Error {
  constructor(
    readonly status: number | null,
    readonly reason: string | undefined,
    readonly failure: GoogleFailure
  ) {
    super(`Google request failed: ${reason ?? status ?? "network error"}`);
  }
}

const TokenResponse = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  id_token: z.string().optional(),
});
export type GoogleTokens = z.infer<typeof TokenResponse>;

async function postForm(path: string, form: Record<string, string>) {
  let res: Response;
  try {
    res = await fetch(`${OAUTH_BASE()}${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form),
    });
  } catch {
    throw new GoogleError(null, undefined, classifyGoogleFailure(null));
  }
  return readResponse(res);
}

// OAuth errors are `{ error: "invalid_grant" }`; Calendar API errors are
// `{ error: { errors: [{ reason: "rateLimitExceeded" }] } }`.
async function readResponse(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = typeof body?.error === "string" ? body.error : body?.error?.errors?.[0]?.reason;
    throw new GoogleError(res.status, typeof reason === "string" ? reason : undefined, classifyGoogleFailure(res.status, reason));
  }
  return body;
}

/** Exchange an authorisation code (with its PKCE verifier) for tokens. */
export async function exchangeCode(p: {
  code: string;
  verifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleTokens> {
  const body = await postForm("/token", {
    grant_type: "authorization_code",
    code: p.code,
    code_verifier: p.verifier,
    redirect_uri: p.redirectUri,
    client_id: p.clientId,
    client_secret: p.clientSecret,
  });
  return TokenResponse.parse(body);
}

/** A fresh access token from a refresh token. */
export async function refreshAccessToken(p: { refreshToken: string; clientId: string; clientSecret: string }): Promise<GoogleTokens> {
  const body = await postForm("/token", {
    grant_type: "refresh_token",
    refresh_token: p.refreshToken,
    client_id: p.clientId,
    client_secret: p.clientSecret,
  });
  return TokenResponse.parse(body);
}

/** Revoke a grant at Google (disconnect, account deletion — ADR-0014 §7). */
export async function revokeToken(token: string): Promise<void> {
  await postForm("/revoke", { token });
}

const CalendarEvent = z.object({
  id: z.string(),
  etag: z.string().optional(),
  hangoutLink: z.string().optional(),
  conferenceData: z
    .object({ entryPoints: z.array(z.object({ entryPointType: z.string().optional(), uri: z.string().optional() })).optional() })
    .optional(),
});
export type CalendarEvent = z.infer<typeof CalendarEvent>;

async function calendarRequest(accessToken: string, method: string, path: string, body?: unknown) {
  let res: Response;
  try {
    res = await fetch(`${CALENDAR_BASE()}/calendar/v3/calendars/primary/events${path}`, {
      method,
      headers: { authorization: `Bearer ${accessToken}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new GoogleError(null, undefined, classifyGoogleFailure(null));
  }
  return readResponse(res);
}

/** Create an event with our own id; conferenceDataVersion=1 lets it carry a Meet request. */
export async function insertEvent(accessToken: string, event: { id: string }): Promise<CalendarEvent> {
  return CalendarEvent.parse(await calendarRequest(accessToken, "POST", "?conferenceDataVersion=1", event));
}

export async function patchEvent(accessToken: string, eventId: string, event: object): Promise<CalendarEvent> {
  const path = `/${encodeURIComponent(eventId)}?conferenceDataVersion=1`;
  return CalendarEvent.parse(await calendarRequest(accessToken, "PATCH", path, event));
}

export async function deleteEvent(accessToken: string, eventId: string): Promise<void> {
  await calendarRequest(accessToken, "DELETE", `/${encodeURIComponent(eventId)}`);
}
