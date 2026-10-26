/**
 * The calendar drain against a real Postgres and a fake Google (RFC-0012 §5):
 * events created, updated and deleted from the session's current state, one
 * Meet per session shared to both calendars, no duplicates on retry, failures
 * recorded on the row, and a broken grant held until the user reconnects.
 */

import { describe, it, beforeEach, after, mock } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { configureTestDatabase, startFakeGoogle, resetDatabase, seedUsers, sessionRow } from "./helpers.mjs";

configureTestDatabase();
const google = await startFakeGoogle();
Object.assign(process.env, {
  CALENDAR_SYNC_ENABLED: "true",
  GOOGLE_CALENDAR_CLIENT_ID: "cid",
  GOOGLE_CALENDAR_CLIENT_SECRET: "csecret",
  CALENDAR_TOKEN_ENC_KEY: randomBytes(32).toString("base64"),
});
const { db, closeDb } = await import("../src/lib/db/index.ts");
const { users, sessions, calendarConnections, calendarOutbox, calendarEventLinks, notifications } = await import("../src/lib/db/schema.ts");
const { sql, eq } = await import("drizzle-orm");
const { drainCalendar } = await import("../src/modules/calendar/drain.ts");
const { saveConnection, disconnectGoogle } = await import("../src/modules/calendar/connection-queries.ts");
const { updateSessionStatus } = await import("../src/core/booking/queries.ts");
const { getCalendarConfig } = await import("../src/modules/calendar/runtime.ts");
const q = await import("../src/modules/calendar/sync-queries.ts");
const { googleEventId } = await import("../src/lib/calendar/sync.ts");

const connect = (userId, account = userId) =>
  saveConnection({
    userId,
    tokens: { access_token: `access-${account}`, refresh_token: `refresh-${account}`, expires_in: 3600, scope: "calendar" },
    claims: { sub: `sub-${account}`, email: `${account}@example.test` },
    config: getCalendarConfig(),
  });
const setStatus = async (status) => {
  await db.update(sessions).set({ status }).where(eq(sessions.id, "s1"));
  await q.enqueueSessionSync(db, { id: "s1", mentorId: "m", menteeId: "e" });
};
const calendar = (account) => [...(google.calendars.get(`access-${account}`)?.values() ?? [])];
const session = async () => (await db.select().from(sessions).where(eq(sessions.id, "s1")))[0];
const outbox = () => db.select().from(calendarOutbox);
const links = () => db.select().from(calendarEventLinks);

after(async () => {
  await closeDb();
  await google.close();
});

describe("calendar drain", () => {
  beforeEach(async () => {
    await resetDatabase(db, sql);
    google.calls.length = 0;
    google.calendars.clear();
    google.failNext.length = 0;
    await seedUsers(db, users, [{ id: "m", name: "Morgan", email: "m@example.test" }, { id: "e", name: "Emery", email: "e@example.test" }]);
    await db.insert(sessions).values(sessionRow("s1", "m", "e", "requested", -48));
  });

  it("confirming creates a private event on each calendar, with one Meet on the mentor's, shared to both", async () => {
    await connect("m");
    await connect("e");
    await setStatus("confirmed");
    const result = await drainCalendar({ sessionId: "s1" });

    assert.deepEqual(result, { synced: 3, failed: 0 }, "two creates, then the mentee's update with the link");
    const [mentorEvent] = calendar("m");
    const [menteeEvent] = calendar("e");
    assert.equal(mentorEvent.summary, "Session with Emery");
    assert.equal(menteeEvent.summary, "Session with Morgan");
    for (const ev of [mentorEvent, menteeEvent]) {
      assert.equal(ev.visibility, "private");
      assert.equal(ev.attendees, undefined, "no attendees");
      assert.ok(!JSON.stringify(ev).includes("@example.test"), "no email addresses");
    }
    const { videoUrl } = await session();
    assert.equal(videoUrl, mentorEvent.hangoutLink);
    assert.equal(menteeEvent.hangoutLink, undefined, "only the host's event asks Google for a Meet");
    assert.match(menteeEvent.description, new RegExp(`Video call: ${videoUrl}`));
    assert.equal((await outbox()).length, 0);
    assert.equal((await links()).length, 2);
  });

  it("makes the mentee's event the video host when the mentor isn't connected", async () => {
    await connect("e");
    await setStatus("confirmed");
    await drainCalendar({ sessionId: "s1" });
    assert.equal((await session()).videoUrl, calendar("e")[0].hangoutLink);
  });

  it("cancelling deletes the events, and an event already deleted in Google counts as done", async () => {
    await connect("m");
    await connect("e");
    await setStatus("confirmed");
    await drainCalendar({ sessionId: "s1" });
    google.calendars.get("access-e").clear(); // the mentee deleted it by hand

    await setStatus("cancelled");
    assert.deepEqual(await drainCalendar({ sessionId: "s1" }), { synced: 2, failed: 0 });
    assert.equal(calendar("m").length, 0);
    assert.equal((await links()).length, 0);
    assert.equal((await outbox()).length, 0);
  });

  it("a requested session writes nothing and clears its row", async () => {
    await connect("m");
    await setStatus("requested");
    await drainCalendar({ sessionId: "s1" });
    assert.equal(google.calls.filter((c) => c.path.startsWith("/calendar")).length, 0);
    assert.equal((await outbox()).length, 0);
  });

  it("a create that already reached Google is updated, not duplicated", async () => {
    const connectionId = await connect("m");
    const id = googleEventId("s1", connectionId);
    google.calendars.set("access-m", new Map([[id, { id, summary: "stale", etag: `"1"` }]]));
    await setStatus("confirmed");
    await drainCalendar({ sessionId: "s1" });
    assert.equal(calendar("m").length, 1);
    assert.equal(calendar("m")[0].summary, "Session with Emery");
    assert.equal((await links())[0].externalEventId, id);
  });

  it("an update to an event the person deleted stops tracking it instead of recreating it", async () => {
    await connect("m");
    await setStatus("confirmed");
    await drainCalendar({ sessionId: "s1" });
    google.calendars.get("access-m").clear();
    await setStatus("confirmed");
    await drainCalendar({ sessionId: "s1" });
    assert.equal(calendar("m").length, 0);
    assert.equal((await links()).length, 0);
  });

  it("a transient failure is retried later; a permanent one is parked", async () => {
    await connect("m");
    await setStatus("confirmed");
    google.failNext.push({ status: 503 });
    assert.deepEqual(await drainCalendar({ sessionId: "s1" }), { synced: 0, failed: 1 });
    let [row] = await outbox();
    assert.deepEqual([row.attempts, row.lastError], [1, "transient"]);
    assert.ok(row.nextAttemptAt > new Date(), "not due again until later");

    await db.update(calendarOutbox).set({ nextAttemptAt: new Date(0) });
    google.failNext.push({ status: 400 });
    await drainCalendar({ sessionId: "s1" });
    [row] = await outbox();
    assert.equal(row.lastError, "permanent");
    assert.deepEqual(await drainCalendar({ sessionId: "s1" }), { synced: 0, failed: 0 }, "parked rows aren't claimed");
  });

  it("a revoked grant holds the work, asks once to reconnect, and reconnecting finishes it", async () => {
    await connect("m");
    await setStatus("confirmed");
    google.failNext.push({ status: 401 });
    await drainCalendar({ sessionId: "s1" });
    const [conn] = await db.select().from(calendarConnections);
    await q.markConnectionError(conn.id, "auth"); // breaking again must not nag twice
    assert.equal(conn.status, "error");
    const [row] = await outbox();
    assert.deepEqual([row.attempts, row.lastError], [0, "auth"], "held, not counted as an attempt");
    assert.deepEqual(await drainCalendar({ sessionId: "s1" }), { synced: 0, failed: 0 }, "not claimed while broken");
    const nudges = await db.select().from(notifications);
    assert.equal(nudges.length, 1);
    assert.deepEqual([nudges[0].userId, nudges[0].priority, nudges[0].read], ["m", "action", false]);

    await connect("m");
    assert.equal((await db.select().from(notifications))[0].read, true, "reconnecting resolves the nudge");
    await drainCalendar({ sessionId: "s1" });
    assert.equal(calendar("m").length, 1);
    assert.equal((await outbox()).length, 0);
  });

  it("a change queued while a row is being synced survives that sync's outcome", async () => {
    await connect("m");
    await setStatus("confirmed");
    const [claimed] = await q.claimDueOutbox({ limit: 1, maxAttempts: 5, leaseMs: 60_000 });
    await setStatus("cancelled"); // re-queues the pair mid-sync
    await q.completeOutbox(claimed);
    const [row] = await outbox();
    assert.ok(row, "the cancel's reconcile is still queued");
  });

  it("a cancellation made while the connection was broken reaches the calendar after reconnecting", async () => {
    const connectionId = await connect("m");
    await setStatus("confirmed");
    await drainCalendar({ sessionId: "s1" });
    await q.markConnectionError(connectionId, "invalid_grant");
    await setStatus("cancelled"); // queued for the broken connection, waiting
    assert.deepEqual(await drainCalendar({ sessionId: "s1" }), { synced: 0, failed: 0 });
    assert.equal(calendar("m").length, 1);

    await connect("m");
    await drainCalendar({ sessionId: "s1" });
    assert.equal(calendar("m").length, 0, "the stale event is gone");
  });

  it("reconnecting a different Google account clears the old calendar and fills the new one", async () => {
    await connect("m");
    await setStatus("confirmed");
    await drainCalendar({ sessionId: "s1" });
    assert.equal(calendar("m").length, 1);

    const connectionId = await connect("m", "m-work");
    assert.equal(calendar("m").length, 0, "upcoming event removed from the old calendar");
    await q.enqueueSessionSync(db, { id: "s1", mentorId: "m", menteeId: "e" }); // the callback's backfill
    await drainCalendar({ connectionId });
    assert.equal(calendar("m-work").length, 1);
    assert.equal((await links())[0].connectionId, connectionId);
  });

  it("disconnecting removes upcoming events, keeps past ones, and clears the reconnect nudge", async () => {
    const connectionId = await connect("m");
    await db.insert(sessions).values(sessionRow("s2", "m", "e", "confirmed", 24)); // ended yesterday
    await setStatus("confirmed");
    await q.enqueueSessionSync(db, { id: "s2", mentorId: "m", menteeId: "e" });
    await drainCalendar();
    assert.equal(calendar("m").length, 2);
    await db.insert(notifications).values({ id: "n1", userId: "m", type: "action_required:calendar_reconnect", message: "x", resourceId: connectionId, priority: "action" });

    await disconnectGoogle("m", getCalendarConfig());
    assert.deepEqual(calendar("m").map((e) => e.summary), ["Session with Emery"], "only the past event stays");
    assert.equal(calendar("m")[0].id, googleEventId("s2", connectionId));
    assert.equal((await db.select().from(calendarConnections)).length, 0);
    assert.equal((await db.select().from(notifications))[0].read, true);
  });

  it("cancelling clears the session's video link", async () => {
    await connect("m");
    await setStatus("confirmed");
    await drainCalendar({ sessionId: "s1" });
    assert.ok((await session()).videoUrl);
    await updateSessionStatus("s1", "cancelled");
    assert.equal((await session()).videoUrl, null);
  });

  it("stops starting work once its time budget is spent", async () => {
    await connect("m");
    await setStatus("confirmed");
    assert.deepEqual(await drainCalendar({ budgetMs: 0 }), { synced: 0, failed: 0 });
    assert.equal(calendar("m").length, 0);
  });

  it("finds work queued a moment ago even when the app's clock lags the database's", async () => {
    await connect("m");
    await setStatus("confirmed"); // queued with the database's now()
    mock.timers.enable({ apis: ["Date"], now: Date.now() - 5_000 }); // the app server runs 5s behind
    try {
      assert.deepEqual(await drainCalendar({ sessionId: "s1" }), { synced: 1, failed: 0 });
    } finally {
      mock.timers.reset();
    }
    assert.equal(calendar("m").length, 1);
  });

  it("does nothing when calendar sync is switched off", async () => {
    await connect("m");
    await setStatus("confirmed");
    process.env.CALENDAR_SYNC_ENABLED = "false";
    try {
      assert.deepEqual(await drainCalendar(), { synced: 0, failed: 0 });
      assert.equal((await outbox()).length, 1);
    } finally {
      process.env.CALENDAR_SYNC_ENABLED = "true";
    }
  });
});
