/**
 * The "Connect Google Calendar" OAuth handshake (RFC-0012 §2, §9). Pure: the
 * signing secret, client id and clock are passed in.
 *
 * - PKCE (S256): a random verifier; Google gets only its SHA-256 challenge.
 * - The state, PKCE verifier, user id and a 10-minute expiry travel in an
 *   HMAC-signed cookie, signed with a key derived (HKDF) from the app secret
 *   under a calendar-specific label, so it's never the key used elsewhere.
 * - The callback accepts only the same user, the same state, before expiry,
 *   with a constant-time signature check.
 */

import { createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "crypto";

export const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.owned";
export const REQUESTED_SCOPES = ["openid", "email", CALENDAR_SCOPE];
export const STATE_TTL_MS = 10 * 60 * 1000;

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function authorizeUrl(p: { clientId: string; redirectUri: string; state: string; codeChallenge: string }): string {
  const params = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: "code",
    scope: REQUESTED_SCOPES.join(" "),
    access_type: "offline", // a refresh token
    prompt: "consent", // …every time, even on reconnect
    include_granted_scopes: "true",
    state: p.state,
    code_challenge: p.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${GOOGLE_AUTHORIZE_URL}?${params}`;
}

/** Google lets people untick scopes; refuse a connection without calendar access. */
export function hasCalendarScope(grantedScope: string | undefined): boolean {
  return (grantedScope ?? "").split(/\s+/).includes(CALENDAR_SCOPE);
}

export interface OAuthState {
  state: string;
  verifier: string;
  userId: string;
  exp: number;
}

function stateKey(appSecret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", appSecret, "", "grsshppr calendar oauth state v1", 32));
}

/** The cookie value: base64url(JSON) + "." + HMAC. */
export function signState(payload: OAuthState, appSecret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", stateKey(appSecret)).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/**
 * Validate the callback against the cookie. Returns the PKCE verifier on
 * success, or null for any failure (bad signature, expired, other user,
 * state mismatch, malformed) — callers don't learn which.
 */
export function verifyState(
  cookie: string | undefined,
  p: { appSecret: string; state: string | null; userId: string; now: number }
): string | null {
  if (!cookie || !p.state) return null;
  const [body, sig] = cookie.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", stateKey(p.appSecret)).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let payload: OAuthState;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (payload.exp < p.now || payload.userId !== p.userId) return null;
  const s1 = Buffer.from(payload.state);
  const s2 = Buffer.from(p.state);
  if (s1.length !== s2.length || !timingSafeEqual(s1, s2)) return null;
  return payload.verifier;
}

/**
 * The account's stable id and email from an ID token received directly from
 * Google's token endpoint over TLS (OIDC Core §3.1.3.7 lets a client skip the
 * signature check in exactly that case). Returns null if the claims we rely on
 * are missing or the token isn't for our client.
 */
export function idTokenClaims(idToken: string | undefined, clientId: string): { sub: string; email: string | null } | null {
  const payload = idToken?.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (typeof claims.sub !== "string" || !claims.sub || !audience.includes(clientId)) return null;
    return { sub: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
  } catch {
    return null;
  }
}
