import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarConnections, sessions, users } from "@/lib/db/schema";
import type { CalendarConfig } from "@/lib/calendar/config";
import {
  MAX_SYNC_ATTEMPTS,
  eventVideoUrl,
  failureOutcome,
  googleEventBody,
  googleEventId,
  reconcileAction,
  videoHostConnection,
} from "@/lib/calendar/sync";
import { getAccessToken } from "./connection-queries";
import { deleteEvent, GoogleError, insertEvent, patchEvent, type CalendarEvent } from "./google-client";
import { appBaseUrl, getCalendarConfig } from "./runtime";
import {
  claimDueOutbox,
  completeOutbox,
  deleteEventLink,
  enqueueSessionSync,
  failOutbox,
  getEventLink,
  markConnectionError,
  releaseOutbox,
  saveEventLink,
} from "./sync-queries";

type Enabled = Extract<CalendarConfig, { enabled: true }>;
type OutboxRow = Awaited<ReturnType<typeof claimDueOutbox>>[number];

const LEASE_MS = 5 * 60 * 1000;
const BATCH = 25;

/**
 * Push queued session changes to Google Calendar (RFC-0012 §5). Runs inline
 * after a status change (scoped to that session) and from the daily cron (all
 * due work). Never throws: a Google outage must not fail a booking, and each
 * row's failure is recorded on the row.
 *
 * Loops until nothing is due, so the reconcile that a new Meet link queues for
 * the other participant runs in the same drain. `maxRuns` bounds it.
 */
export async function drainCalendar(scope: { sessionId?: string; connectionId?: string; maxRuns?: number } = {}) {
  const result = { synced: 0, failed: 0 };
  let config: CalendarConfig;
  try {
    config = getCalendarConfig();
  } catch (err) {
    console.error("[calendar] drain skipped: invalid configuration", err instanceof Error ? err.message : "");
    return result;
  }
  if (!config.enabled) return result;

  for (let run = 0; run < (scope.maxRuns ?? 3); run++) {
    let rows: OutboxRow[];
    try {
      rows = await claimDueOutbox({ limit: BATCH, maxAttempts: MAX_SYNC_ATTEMPTS, leaseMs: LEASE_MS, ...scope });
    } catch (err) {
      console.error("[calendar] drain could not claim work", err instanceof Error ? err.message : "");
      return result;
    }
    if (rows.length === 0) break;
    for (const row of rows) {
      if (await syncRow(row, config)) result.synced++;
      else result.failed++;
    }
  }
  return result;
}

/** Reconcile one (session, connection) pair. True when the row is done. */
async function syncRow(row: OutboxRow, config: Enabled): Promise<boolean> {
  try {
    await reconcile(row, config);
    await completeOutbox(row);
    return true;
  } catch (err) {
    const failure = err instanceof GoogleError ? err.failure : "transient";
    // Error class and ids only — never tokens or event content.
    console.error(`[calendar] sync failed for outbox ${row.id}: ${failure}${err instanceof GoogleError ? ` (${err.status ?? "network"})` : ""}`);
    try {
      const outcome = failureOutcome(failure, row.attempts, new Date());
      if (outcome.kind === "hold") {
        await markConnectionError(row.connectionId, "auth");
        await releaseOutbox(row, failure);
      } else {
        await failOutbox(row, {
          attempts: row.attempts + 1,
          nextAttemptAt: outcome.kind === "retry" ? outcome.at : null,
          errorClass: failure,
          maxAttempts: MAX_SYNC_ATTEMPTS,
        });
      }
    } catch {
      // The lease expires on its own; the next drain picks the row up again.
    }
    return false;
  }
}

async function reconcile(row: OutboxRow, config: Enabled) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, row.sessionId));
  const [connection] = await db.select().from(calendarConnections).where(eq(calendarConnections.id, row.connectionId));
  if (!session || !connection) return; // gone since it was queued: nothing to do

  const link = await getEventLink(session.id, connection.id);
  const action = reconcileAction(session.status, link !== null);
  if (action === "none") return;

  const accessToken = await getAccessToken(connection.id, config);

  if (action === "delete") {
    try {
      await deleteEvent(accessToken, link!.externalEventId);
    } catch (err) {
      if (!(err instanceof GoogleError && err.failure === "gone")) throw err; // already gone counts as done
    }
    await deleteEventLink(session.id, connection.id);
    return;
  }

  // create or update
  const isMentor = connection.userId === session.mentorId;
  const [partner] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, isMentor ? session.menteeId : session.mentorId));
  const participants = await db
    .select({ id: calendarConnections.id, userId: calendarConnections.userId })
    .from(calendarConnections)
    .where(and(inArray(calendarConnections.userId, [session.mentorId, session.menteeId]), eq(calendarConnections.status, "active")));
  const hostId = videoHostConnection({
    mentorConnectionId: participants.find((c) => c.userId === session.mentorId)?.id ?? null,
    menteeConnectionId: participants.find((c) => c.userId === session.menteeId)?.id ?? null,
  });
  const isVideoHost = hostId === connection.id;
  const eventId = link?.externalEventId ?? googleEventId(session.id, connection.id);
  const body = googleEventBody(
    {
      id: session.id,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      partnerName: partner?.name ?? "your partner",
      role: isMentor ? "mentor" : "mentee",
      videoUrl: session.videoUrl,
    },
    { baseUrl: appBaseUrl(), isVideoHost, eventId }
  );

  let event: CalendarEvent;
  if (action === "create") {
    try {
      event = await insertEvent(accessToken, body);
    } catch (err) {
      // Our deterministic id already exists: an earlier create reached Google
      // but its link wasn't saved. Update it instead of duplicating.
      if (!(err instanceof GoogleError && err.failure === "conflict")) throw err;
      event = await patchEvent(accessToken, eventId, body);
    }
  } else {
    try {
      event = await patchEvent(accessToken, eventId, body);
    } catch (err) {
      // The person deleted the event in their calendar: respect that, stop tracking it.
      if (err instanceof GoogleError && err.failure === "gone") {
        await deleteEventLink(session.id, connection.id);
        return;
      }
      throw err;
    }
  }
  await saveEventLink({ sessionId: session.id, connectionId: connection.id, externalEventId: event.id, etag: event.etag ?? null });

  // The host's event created the Meet: store it once, and queue the other
  // participant's event so it gains the link too.
  const videoUrl = isVideoHost && !session.videoUrl ? eventVideoUrl(event) : null;
  if (videoUrl) {
    const [stored] = await db
      .update(sessions)
      .set({ videoUrl })
      .where(and(eq(sessions.id, session.id), isNull(sessions.videoUrl)))
      .returning({ id: sessions.id });
    if (stored) await enqueueSessionSync(db, session, connection.id);
  }
}
