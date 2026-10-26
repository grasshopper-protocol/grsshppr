import { and, eq, inArray, lt, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarConnections, calendarEventLinks, calendarOutbox } from "@/lib/db/schema";

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Queue a reconcile for every active calendar connection of the session's
 * participants (RFC-0012 §5). Call inside the same transaction as the status
 * change, so a confirmation can't commit without its sync being recorded.
 * Re-queuing an existing pair resets it to "due now" — one row per pair, ever.
 */
export async function enqueueSessionSync(
  executor: Executor,
  session: { id: string; mentorId: string; menteeId: string }
): Promise<number> {
  const connections = await executor
    .select({ id: calendarConnections.id })
    .from(calendarConnections)
    .where(and(inArray(calendarConnections.userId, [session.mentorId, session.menteeId]), eq(calendarConnections.status, "active")));
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
 * same row. Rows that used up `maxAttempts` are parked and never claimed.
 */
export async function claimDueOutbox(p: { limit: number; maxAttempts: number; leaseMs: number; now?: Date; sessionId?: string }) {
  const now = p.now ?? new Date();
  return db.transaction(async (tx) => {
    const due = await tx
      .select({ id: calendarOutbox.id })
      .from(calendarOutbox)
      .where(
        and(
          lte(calendarOutbox.nextAttemptAt, now),
          lt(calendarOutbox.attempts, p.maxAttempts),
          p.sessionId ? eq(calendarOutbox.sessionId, p.sessionId) : undefined
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

/** Done: the pair is reconciled. */
export async function completeOutbox(id: string) {
  await db.delete(calendarOutbox).where(eq(calendarOutbox.id, id));
}

/** Failed: record the error class and when to try again (null = park it). */
export async function failOutbox(id: string, p: { attempts: number; nextAttemptAt: Date | null; errorClass: string; maxAttempts: number }) {
  await db
    .update(calendarOutbox)
    .set({
      attempts: p.nextAttemptAt ? p.attempts : p.maxAttempts, // parked rows are never claimed again
      nextAttemptAt: p.nextAttemptAt ?? new Date(),
      lastError: p.errorClass,
    })
    .where(eq(calendarOutbox.id, id));
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

/** The grant stopped working (revoked, expired): stop syncing until reconnected. */
export async function markConnectionError(connectionId: string, errorClass: string) {
  await db
    .update(calendarConnections)
    .set({ status: "error", lastError: errorClass, updatedAt: new Date() })
    .where(eq(calendarConnections.id, connectionId));
}
