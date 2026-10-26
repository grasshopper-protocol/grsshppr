import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarConnections, sessions } from "@/lib/db/schema";
import { decryptToken, encryptToken, needsReencryption } from "@/lib/calendar/token-crypto";
import type { CalendarConfig } from "@/lib/calendar/config";
import { GoogleError, refreshAccessToken, revokeToken, type GoogleTokens } from "./google-client";
import { enqueueSessionSync, markConnectionError } from "./sync-queries";

type Enabled = Extract<CalendarConfig, { enabled: true }>;

/** What Settings shows. Never includes tokens. */
export async function getConnectionSummary(userId: string) {
  const [row] = await db
    .select({ email: calendarConnections.email, status: calendarConnections.status, createdAt: calendarConnections.createdAt })
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, userId));
  return row ?? null;
}

/**
 * Store (or replace) the user's Google connection with both tokens encrypted,
 * bound to the connection id (ADR-0014). Reconnecting keeps the same row.
 */
export async function saveConnection(p: {
  userId: string;
  tokens: GoogleTokens & { refresh_token: string; scope: string };
  claims: { sub: string; email: string | null };
  config: Enabled;
}) {
  const [existing] = await db
    .select({ id: calendarConnections.id })
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, p.userId));
  const id = existing?.id ?? crypto.randomUUID();
  const values = {
    provider: "google" as const,
    providerAccountId: p.claims.sub,
    email: p.claims.email,
    accessTokenEnc: encryptToken(p.tokens.access_token, p.config.keys.current, id, "access"),
    refreshTokenEnc: encryptToken(p.tokens.refresh_token, p.config.keys.current, id, "refresh"),
    accessTokenExpiresAt: new Date(Date.now() + p.tokens.expires_in * 1000),
    scope: p.tokens.scope,
    status: "active",
    lastError: null,
    updatedAt: new Date(),
  };
  await db
    .insert(calendarConnections)
    .values({ id, userId: p.userId, ...values })
    .onConflictDoUpdate({ target: calendarConnections.userId, set: values });
  return id;
}

/** Queue the user's upcoming confirmed sessions so they appear straight away. */
export async function backfillUpcoming(userId: string) {
  const upcoming = await db
    .select({ id: sessions.id, mentorId: sessions.mentorId, menteeId: sessions.menteeId })
    .from(sessions)
    .where(and(eq(sessions.status, "confirmed"), gt(sessions.startsAt, new Date())));
  const mine = upcoming.filter((s) => s.mentorId === userId || s.menteeId === userId);
  for (const s of mine) await enqueueSessionSync(db, s);
  return mine.length;
}

/**
 * A usable access token for a connection: refreshed (and every token
 * re-encrypted with the current key) when it's within a minute of expiry or
 * was encrypted with a retired key. A revoked grant marks the connection
 * "error" and throws.
 */
export async function getAccessToken(connectionId: string, config: Enabled): Promise<string> {
  const [c] = await db.select().from(calendarConnections).where(eq(calendarConnections.id, connectionId));
  if (!c || c.status !== "active") throw new GoogleError(null, "not_connected", "auth");
  const fresh = c.accessTokenExpiresAt.getTime() - Date.now() > 60_000;
  if (fresh && !needsReencryption(c.accessTokenEnc, config.keys)) {
    return decryptToken(c.accessTokenEnc, config.keys, c.id, "access");
  }
  const refreshToken = decryptToken(c.refreshTokenEnc, config.keys, c.id, "refresh");
  let tokens: GoogleTokens;
  try {
    tokens = await refreshAccessToken({ refreshToken, clientId: config.clientId, clientSecret: config.clientSecret });
  } catch (err) {
    if (err instanceof GoogleError && err.failure === "auth") await markConnectionError(c.id, "auth");
    throw err;
  }
  await db
    .update(calendarConnections)
    .set({
      accessTokenEnc: encryptToken(tokens.access_token, config.keys.current, c.id, "access"),
      // Google may rotate the refresh token; re-encrypt either way (lazy key rotation).
      refreshTokenEnc: encryptToken(tokens.refresh_token ?? refreshToken, config.keys.current, c.id, "refresh"),
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      updatedAt: new Date(),
    })
    .where(eq(calendarConnections.id, c.id));
  return tokens.access_token;
}

/**
 * Disconnect: revoke the grant at Google (best effort — the row goes either
 * way, so we never hold a token the user asked us to drop) and delete the
 * connection, which cascades its links and queued work. Events already in the
 * user's calendar stay there (RFC-0012 §6).
 */
export async function disconnectGoogle(userId: string, config: CalendarConfig) {
  const [c] = await db.select().from(calendarConnections).where(eq(calendarConnections.userId, userId));
  if (!c) return false;
  if (config.enabled) {
    try {
      await revokeToken(decryptToken(c.refreshTokenEnc, config.keys, c.id, "refresh"));
    } catch {
      console.error(`[calendar] revoke failed for connection ${c.id}; deleting it anyway`);
    }
  }
  await db.delete(calendarConnections).where(eq(calendarConnections.id, c.id));
  return true;
}
