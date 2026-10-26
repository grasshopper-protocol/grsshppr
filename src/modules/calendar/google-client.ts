import { z } from "zod";
import { classifyGoogleFailure, type GoogleFailure } from "@/lib/calendar/sync";

// Fixed Google hosts (no user-supplied URLs — RFC-0012 §9). The override exists
// only so integration tests can point at a local fake; it's never set in production.
const OAUTH_BASE = () => process.env.GOOGLE_OAUTH_BASE_URL ?? "https://oauth2.googleapis.com";

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
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = typeof body?.error === "string" ? body.error : undefined;
    throw new GoogleError(res.status, reason, classifyGoogleFailure(res.status, reason));
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
