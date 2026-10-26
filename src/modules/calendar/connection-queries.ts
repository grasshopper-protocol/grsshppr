import { and, eq, gt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarConnections, calendarEventLinks, sessions } from "@/lib/db/schema";
import { decryptToken, encryptToken, needsReencryption } from "@/lib/calendar/token-crypto";
import type { CalendarConfig } from "@/lib/calendar/config";
import { deleteEvent, GoogleError, refreshAccessToken, revokeToken, type GoogleTokens } from "./google-client";
import { enqueueSessionSync, markConnectionError } from "./sync-queries";
import { CALENDAR_RECONNECT } from "@/lib/notifications";
import { resolveNotification } from "@/core/notifications/queries";

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
 * bound to the connection id (ADR-0014). Reconnecting the same Google account
 * keeps the row, its event links and its waiting work. Connecting a different
 * Google account first disconnects the old one (its upcoming events are
 * removed and its grant revoked), because the old links point into a calendar
 * we can no longer reach.
 */
export async function saveConnection(p: {
  userId: string;
  tokens: GoogleTokens & { refresh_token: string; scope: string };
  claims: { sub: string; email: string | null };
  config: Enabled;
}) {
  const [existing] = await db
    .select({ providerAccountId: calendarConnections.providerAccountId })
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, p.userId));
  if (existing && existing.providerAccountId !== p.claims.sub) await disconnectGoogle(p.userId, p.config);

  const values = (id: string) => ({
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
  });
  // Settle the row id before encrypting: the tokens are bound to it, so two
  // simultaneous connects must not leave one row holding the other's envelopes.
  const fresh = crypto.randomUUID();
  await db
    .insert(calendarConnections)
    .values({ id: fresh, userId: p.userId, ...values(fresh) })
    .onConflictDoNothing({ target: calendarConnections.userId });
  const [{ id }] = await db
    .select({ id: calendarConnections.id })
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, p.userId));
  if (id !== fresh) await db.update(calendarConnections).set(values(id)).where(eq(calendarConnections.id, id));
  await resolveNotification(id, CALENDAR_RECONNECT, p.userId); // reconnected: the nudge is done
  return id;
}

/** Queue the user's upcoming confirmed sessions so they appear straight away. */
export async function backfillUpcoming(userId: string) {
  const mine = await db
    .select({ id: sessions.id, mentorId: sessions.mentorId, menteeId: sessions.menteeId })
    .from(sessions)
    .where(
      and(
        eq(sessions.status, "confirmed"),
        gt(sessions.startsAt, new Date()),
        or(eq(sessions.mentorId, userId), eq(sessions.menteeId, userId))
      )
    );
  for (const s of mine) await enqueueSessionSync(db, s);
  return mine.length;
}

/**
 * A usable access token for a connection: refreshed (and every token
 * re-encrypted with the current key) when it's within a minute of expiry or
 * was encrypted with a retired key. A revoked grant, or tokens we can no
 * longer decrypt (a lost or retired key), mark the connection "error" — the
 * user is asked to reconnect — and throw.
 */
export async function getAccessToken(connectionId: string, config: Enabled): Promise<string> {
  const [c] = await db.select().from(calendarConnections).where(eq(calendarConnections.id, connectionId));
  if (!c || c.status !== "active") throw new GoogleError(null, "not_connected", "auth");
  const open = (envelope: string, column: string) => {
    try {
      return decryptToken(envelope, config.keys, c.id, column);
    } catch {
      throw new GoogleError(null, "undecryptable", "auth");
    }
  };
  const fresh = c.accessTokenExpiresAt.getTime() - Date.now() > 60_000;
  try {
    if (fresh && !needsReencryption(c.accessTokenEnc, config.keys)) return open(c.accessTokenEnc, "access");
    const refreshToken = open(c.refreshTokenEnc, "refresh");
    const tokens = await refreshAccessToken({ refreshToken, clientId: config.clientId, clientSecret: config.clientSecret });
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
  } catch (err) {
    if (err instanceof GoogleError && err.failure === "auth") await markConnectionError(c.id, err.reason ?? "auth");
    throw err;
  }
}

const CLEANUP_BUDGET_MS = 10_000;

/**
 * Disconnect (RFC-0012 §6): remove the user's *upcoming* session events from
 * their calendar — once we stop syncing they would go stale, and a later
 * cancellation would never reach them — then revoke the grant at Google and
 * delete the connection, which cascades its links and queued work. Past
 * events stay. Every Google step is best effort and time-boxed: the row goes
 * either way, so we never keep a token the user asked us to drop. Also used
 * by account deletion and when switching Google accounts.
 */
export async function disconnectGoogle(userId: string, config: CalendarConfig) {
  const [c] = await db.select().from(calendarConnections).where(eq(calendarConnections.userId, userId));
  if (!c) return false;
  if (config.enabled) {
    const deadline = Date.now() + CLEANUP_BUDGET_MS;
    let removed = 0;
    let upcoming: { externalEventId: string }[] = [];
    try {
      upcoming = await db
        .select({ externalEventId: calendarEventLinks.externalEventId })
        .from(calendarEventLinks)
        .innerJoin(sessions, eq(sessions.id, calendarEventLinks.sessionId))
        .where(and(eq(calendarEventLinks.connectionId, c.id), gt(sessions.startsAt, new Date())));
      if (upcoming.length > 0 && c.status === "active") {
        const accessToken = await getAccessToken(c.id, config);
        for (const link of upcoming) {
          if (Date.now() > deadline) break;
          try {
            await deleteEvent(accessToken, link.externalEventId);
            removed++;
          } catch (err) {
            if (err instanceof GoogleError && err.failure === "gone") removed++;
          }
        }
      }
    } catch {
      // Couldn't reach the calendar; the events stay, which is no worse than before.
    }
    if (removed < upcoming.length) {
      console.error(`[calendar] disconnect left ${upcoming.length - removed} upcoming event(s) for connection ${c.id}`);
    }
    try {
      await revokeToken(decryptToken(c.refreshTokenEnc, config.keys, c.id, "refresh"));
    } catch {
      console.error(`[calendar] revoke failed for connection ${c.id}; deleting it anyway`);
    }
  }
  await db.delete(calendarConnections).where(eq(calendarConnections.id, c.id));
  await resolveNotification(c.id, CALENDAR_RECONNECT, userId); // nothing left to reconnect
  return true;
}
