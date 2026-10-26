import { and, eq, inArray, lt, lte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarConnections, calendarEventLinks, calendarOutbox } from "@/lib/db/schema";
import { CALENDAR_RECONNECT } from "@/lib/notifications";
import { createNotification } from "@/core/notifications/queries";

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Queue a reconcile for every calendar connection of the session's
 * participants (RFC-0012 §5) — broken ones too: their rows wait (claims skip
 * them) and run when the user reconnects, so a change made during the outage
 * isn't lost. Call inside the same transaction as the status
 * change, so a confirmation can't commit without its sync being recorded.
 * Re-queuing an existing pair resets it to "due now" — one row per pair, ever.
 * `exceptConnectionId` leaves one connection out (the one already in sync).
 */
export async function enqueueSessionSync(
  executor: Executor,
  session: { id: string; mentorId: string; menteeId: string },
  exceptConnectionId?: string
): Promise<number> {
  const connections = await executor
    .select({ id: calendarConnections.id })
    .from(calendarConnections)
    .where(
      and(
        inArray(calendarConnections.userId, [session.mentorId, session.menteeId]),
        exceptConnectionId ? ne(calendarConnections.id, exceptConnectionId) : undefined
      )
    );
  if (connections.length === 0) return 0;
  await executor
    .insert(calendarOutbox)
    .values(connections.map((c) => ({ id: crypto.randomUUID(), sessionId: session.id, connectionId: c.id })))
    .onConflictDoUpdate({
      target: [calendarOutbox.sessionId, calendarOutbox.connectionId],
      set: { attempts: 0, nextAttemptAt: sql`now()`, lastError: null },
    });
  return connections.length;
}

/**
 * Claim up to `limit` due rows for this worker: rows locked by another worker
 * are skipped (SKIP LOCKED) and claimed rows are leased by pushing
 * `next_attempt_at` forward, so an inline drain and the cron never work the
 * same row. Rows that used up `maxAttempts` are parked and never claimed, and
 * rows of a connection that needs reconnecting wait until it's active again.
 */
export async function claimDueOutbox(p: {
  limit: number;
  maxAttempts: number;
  leaseMs: number;
  now?: Date;
  sessionId?: string;
  connectionId?: string;
}) {
  const now = p.now ?? new Date();
  return db.transaction(async (tx) => {
    const due = await tx
      .select({ id: calendarOutbox.id })
      .from(calendarOutbox)
      .where(
        and(
          lte(calendarOutbox.nextAttemptAt, now),
          lt(calendarOutbox.attempts, p.maxAttempts),
          inArray(
            calendarOutbox.connectionId,
            db.select({ id: calendarConnections.id }).from(calendarConnections).where(eq(calendarConnections.status, "active"))
          ),
          p.sessionId ? eq(calendarOutbox.sessionId, p.sessionId) : undefined,
          p.connectionId ? eq(calendarOutbox.connectionId, p.connectionId) : undefined
        )
      )
      .orderBy(calendarOutbox.nextAttemptAt)
      .limit(p.limit)
      .for("update", { skipLocked: true });
    if (due.length === 0) return [];
    return tx
      .update(calendarOutbox)
      .set({ nextAttemptAt: new Date(now.getTime() + p.leaseMs) })
      .where(inArray(calendarOutbox.id, due.map((d) => d.id)))
      .returning();
  });
}

/**
 * The claimed row, as long as nobody re-queued it while we worked: a status
 * change mid-sync resets `next_attempt_at`, and that newer request must survive
 * this drain's outcome.
 */
type Claimed = { id: string; nextAttemptAt: Date };
const stillOurs = (row: Claimed) => and(eq(calendarOutbox.id, row.id), eq(calendarOutbox.nextAttemptAt, row.nextAttemptAt));

/** Done: the pair is reconciled. */
export async function completeOutbox(row: Claimed) {
  await db.delete(calendarOutbox).where(stillOurs(row));
}

/** Give a claimed row back without counting an attempt (its connection needs reconnecting). */
export async function releaseOutbox(row: Claimed, errorClass: string) {
  await db.update(calendarOutbox).set({ nextAttemptAt: new Date(), lastError: errorClass }).where(stillOurs(row));
}

/** Failed: record the error class and when to try again (null = park it). */
export async function failOutbox(row: Claimed, p: { attempts: number; nextAttemptAt: Date | null; errorClass: string; maxAttempts: number }) {
  await db
    .update(calendarOutbox)
    .set({
      attempts: p.nextAttemptAt ? p.attempts : p.maxAttempts, // parked rows are never claimed again
      nextAttemptAt: p.nextAttemptAt ?? new Date(),
      lastError: p.errorClass,
    })
    .where(stillOurs(row));
}

export async function getEventLink(sessionId: string, connectionId: string) {
  const [link] = await db
    .select()
    .from(calendarEventLinks)
    .where(and(eq(calendarEventLinks.sessionId, sessionId), eq(calendarEventLinks.connectionId, connectionId)));
  return link ?? null;
}

export async function saveEventLink(p: { sessionId: string; connectionId: string; externalEventId: string; etag: string | null }) {
  await db
    .insert(calendarEventLinks)
    .values({ id: crypto.randomUUID(), ...p })
    .onConflictDoUpdate({
      target: [calendarEventLinks.sessionId, calendarEventLinks.connectionId],
      set: { externalEventId: p.externalEventId, etag: p.etag, lastSyncedAt: new Date() },
    });
}

export async function deleteEventLink(sessionId: string, connectionId: string) {
  await db
    .delete(calendarEventLinks)
    .where(and(eq(calendarEventLinks.sessionId, sessionId), eq(calendarEventLinks.connectionId, connectionId)));
}

/**
 * The grant stopped working (revoked, expired): stop syncing until reconnected,
 * and ask the user to reconnect — once, when the connection first breaks.
 */
export async function markConnectionError(connectionId: string, errorClass: string) {
  const [broken] = await db
    .update(calendarConnections)
    .set({ status: "error", lastError: errorClass, updatedAt: new Date() })
    .where(and(eq(calendarConnections.id, connectionId), eq(calendarConnections.status, "active")))
    .returning({ userId: calendarConnections.userId });
  if (!broken) return;
  await createNotification({
    userId: broken.userId,
    type: CALENDAR_RECONNECT,
    message: "Your Google Calendar connection stopped working. Reconnect it in Settings to keep your sessions up to date.",
    resourceId: connectionId,
    priority: "action",
  });
}
